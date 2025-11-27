import { useEffect, useRef, useCallback } from 'react';

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
  const callbacksRef = useRef(config);

  useEffect(() => { callbacksRef.current = config; }, [config]);

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

    // @ts-expect-error: standard event
    rec.onresult = (e) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      callbacksRef.current.onTranscript?.(final, interim);
    };

    // @ts-expect-error: standard event
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      log(`Mic Error: ${e.error}`);
      callbacksRef.current.onError?.(e.error);
    };
    
    rec.onstart = () => {
        log('Hardware: Mic Active');
        callbacksRef.current.onStart?.();
    };
    
    rec.onend = () => {
        callbacksRef.current.onEnd?.();
    };
    
    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, [log]);

  // --- Controls ---

  const unlockAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, []); 

  const start = useCallback(() => {
     try { 
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        recognitionRef.current?.start(); 
    } catch {
        // LINT FIX: Removed unused 'e' variable
    }
  }, []);
  
  const stop = useCallback(() => {
      log('Mic: Stop Command');
      recognitionRef.current?.abort();
  }, [log]);

  const cancelAll = useCallback(() => {
      log('System: CANCEL ALL');
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
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
    window.speechSynthesis.cancel();

    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1.1; 
    
    activeUtteranceRef.current = utter;

    utter.onend = () => {
        activeUtteranceRef.current = null;
        onComplete?.();
    };

    utter.onerror = (e) => {
        log(`TTS Error: ${e.error}`);
        activeUtteranceRef.current = null;
        onComplete?.();
    };

    window.speechSynthesis.speak(utter);
  }, [log]);

  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'alert' | 'lock') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    
    o.type = type === 'error' ? 'sawtooth' : 'sine';
    if (type === 'lock') o.type = 'square';
    
    switch (type) {
      case 'success': 
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); break;
      case 'error': 
        o.frequency.setValueAtTime(110, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.3); break;
      case 'start': 
        o.frequency.setValueAtTime(440, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); break;
      case 'alert': 
        o.frequency.setValueAtTime(660, ctx.currentTime); break;
      case 'lock':
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05); break;
    }
    
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  }, []);

  return { start, stop, cancelAll, speak, playTone, unlockAudio };
}