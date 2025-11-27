import { useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface VoiceEngineConfig {
  lang?: string;
  onTranscript?: (final: string, interim: string) => void;
  onError?: (err: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onDebug?: (msg: string) => void; // NEW: Debug channel
}

export function useVoiceEngine(config: VoiceEngineConfig) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // GC PREVENTION: Keep reference to active utterance so it isn't collected
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  const callbacksRef = useRef(config);
  const isSpeakingRef = useRef(false);

  useEffect(() => { callbacksRef.current = config; }, [config]);

  const log = useCallback((msg: string) => {
      console.log(`[VoiceEngine] ${msg}`);
      callbacksRef.current.onDebug?.(msg);
  }, []);

  // --- Voice Input Lifecycle ---
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionCtor) {
      callbacksRef.current.onError?.('Voice support missing');
      log('Error: No SpeechRecognition found');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) {
          log('Ignored result while speaking');
          return;
      }

      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      callbacksRef.current.onTranscript?.(final, interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (isSpeakingRef.current) return;
        // Don't log "no-speech" or "aborted" as errors, just info
        if (e.error === 'no-speech' || e.error === 'aborted') {
            // log(`Mic status: ${e.error}`); 
        } else {
            log(`Mic Error: ${e.error}`);
            callbacksRef.current.onError?.(e.error || 'Unknown error');
        }
    };
    
    rec.onstart = () => {
        log('Mic Started (Hardware Active)');
        callbacksRef.current.onStart?.();
    };
    
    rec.onend = () => {
        if (!isSpeakingRef.current) {
            log('Mic Ended (Hardware Idle)');
            callbacksRef.current.onEnd?.();
        }
    };
    
    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, [log]);

  // --- Methods ---

  const unlockAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      log('Unlocking AudioContext...');
      await audioCtxRef.current.resume();
      log('AudioContext Resumed');
    }
  }, [log]);

  const start = useCallback(() => {
     if (isSpeakingRef.current) {
         log('Start ignored: Currently Speaking');
         return;
     }
     try { 
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        log('Requesting Mic Start...');
        recognitionRef.current?.start(); 
    } catch (e: unknown) { 
        // ignore already started errors, but log others
        const err = e instanceof Error ? e.message : String(e);
        if (!err.includes('already started')) {
            log(`Start Failed: ${err}`);
        }
    }
  }, [log]);
  
  const stop = useCallback(() => {
      log('Stopping Mic...');
      recognitionRef.current?.abort();
      if (audioCtxRef.current?.state === 'running') {
          audioCtxRef.current.suspend();
      }
  }, [log]);

  const cancelAll = useCallback(() => {
      log('CANCEL ALL triggered');
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
      }
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      activeUtteranceRef.current = null;
      isSpeakingRef.current = false;
      if (audioCtxRef.current?.state === 'running') {
          audioCtxRef.current.suspend();
      }
  }, [log]);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) {
        log('TTS missing, skipping');
        onComplete?.();
        return;
    }

    log(`Speaking: "${text}"`);
    isSpeakingRef.current = true;
    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();
    
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1.1;
    
    // ANCHOR: Prevent GC
    activeUtteranceRef.current = utter;

    const cleanup = () => {
        activeUtteranceRef.current = null;
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        isSpeakingRef.current = false;
    };

    utter.onend = () => {
        log('TTS Ended (Event)');
        cleanup();
        onComplete?.();
    };

    utter.onerror = (e) => {
        log(`TTS Error: ${e.error}`);
        cleanup();
        onComplete?.();
    };

    // WATCHDOG: If TTS hangs (common on Android/iOS), force completion
    // Estimate: 100ms per character + 1s buffer
    const timeout = (text.length * 100) + 2000;
    watchdogTimerRef.current = setTimeout(() => {
        if (isSpeakingRef.current) {
            log('TTS Watchdog Timeout - Forcing continue');
            window.speechSynthesis.cancel();
            cleanup();
            onComplete?.();
        }
    }, timeout);

    window.speechSynthesis.speak(utter);
  }, [log]);

  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'alert') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    
    o.type = type === 'error' ? 'sawtooth' : 'sine';
    
    switch (type) {
      case 'success': 
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        break;
      case 'error': 
        o.frequency.setValueAtTime(110, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.3);
        break;
      case 'start': 
        o.frequency.setValueAtTime(440, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        break;
      case 'alert': 
        o.frequency.setValueAtTime(660, ctx.currentTime);
        break;
    }
    
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'error' ? 0.4 : 0.2));
    
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  }, []);

  return { start, stop, cancelAll, speak, playTone, unlockAudio };
}