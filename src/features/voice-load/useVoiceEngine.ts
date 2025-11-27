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
  onDebug?: (msg: string) => void; 
}

export function useVoiceEngine(config: VoiceEngineConfig) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  const callbacksRef = useRef(config);
  const isSpeakingRef = useRef(false);

  useEffect(() => { callbacksRef.current = config; }, [config]);

  // Helper to log immediately
  const log = useCallback((msg: string) => {
      callbacksRef.current.onDebug?.(msg);
  }, []);

  // --- Voice Input Lifecycle ---
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionCtor) {
      log('Error: No SpeechRecognition found');
      callbacksRef.current.onError?.('Voice support missing');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) return;

      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      
      // LOGGING UPDATE: Only log FINAL transcripts to reduce spam
      if (final) {
          // Log handled in parent or here if preferred, keeping it quiet here
      }
      
      callbacksRef.current.onTranscript?.(final, interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (isSpeakingRef.current) return;
        
        // Filter out noise logs completely
        if (e.error === 'no-speech' || e.error === 'aborted') {
             // Silently ignore
        } else {
            log(`Mic Error: ${e.error}`);
            callbacksRef.current.onError?.(e.error || 'Unknown error');
        }
    };
    
    rec.onstart = () => {
        log('Mic Hardware: Active');
        callbacksRef.current.onStart?.();
    };
    
    rec.onend = () => {
        if (!isSpeakingRef.current) {
            // log('Mic Hardware: Idle'); // Optional: Comment out to reduce noise further
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
      // log('AudioCtx: Resuming...'); // Too verbose
      await audioCtxRef.current.resume();
    }
  }, []); // Removed log dep to prevent spam

  const start = useCallback(() => {
     if (isSpeakingRef.current) return;
     try { 
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        // log('Mic: Requesting Start...'); // Too verbose
        recognitionRef.current?.start(); 
    } catch (e: unknown) { 
        const err = e instanceof Error ? e.message : String(e);
        if (!err.includes('already started')) {
            log(`Mic Start Failed: ${err}`);
        }
    }
  }, [log]);
  
  const stop = useCallback(() => {
      log('Mic: Stop Command');
      recognitionRef.current?.abort();
      if (audioCtxRef.current?.state === 'running') {
          audioCtxRef.current.suspend();
      }
  }, [log]);

  const cancelAll = useCallback(() => {
      log('System: CANCEL ALL');
      
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
        onComplete?.();
        return;
    }

    log(`TTS: "${text}"`);
    isSpeakingRef.current = true;
    
    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();
    
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1.1; 
    
    activeUtteranceRef.current = utter;

    const cleanup = () => {
        activeUtteranceRef.current = null;
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        isSpeakingRef.current = false;
    };

    utter.onend = () => {
        // log('TTS: Finished'); // Too verbose
        cleanup();
        onComplete?.();
    };

    utter.onerror = (e) => {
        log(`TTS Error: ${e.error}`);
        cleanup();
        onComplete?.();
    };

    const timeout = (text.length * 100) + 1000;
    watchdogTimerRef.current = setTimeout(() => {
        if (isSpeakingRef.current) {
            log('TTS: Watchdog Timeout');
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