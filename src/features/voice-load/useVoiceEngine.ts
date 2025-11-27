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
}

export function useVoiceEngine(config: VoiceEngineConfig) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const callbacksRef = useRef(config);
  
  const isSpeakingRef = useRef(false);

  useEffect(() => { callbacksRef.current = config; }, [config]);

  // --- Voice Input Lifecycle ---
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionCtor) {
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
      callbacksRef.current.onTranscript?.(final, interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (isSpeakingRef.current) return;
        callbacksRef.current.onError?.(e.error || 'Unknown error');
    };
    
    rec.onstart = () => callbacksRef.current.onStart?.();
    rec.onend = () => {
        if (!isSpeakingRef.current) {
            callbacksRef.current.onEnd?.();
        }
    };
    
    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, []);

  // --- Methods ---

  const unlockAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, []);

  const start = useCallback(() => {
     if (isSpeakingRef.current) return;
     try { 
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        recognitionRef.current?.start(); 
    } catch { /* ignore */ }
  }, []);
  
  const stop = useCallback(() => {
      recognitionRef.current?.abort();
      if (audioCtxRef.current?.state === 'running') {
          audioCtxRef.current.suspend();
      }
  }, []);

  // NEW: Hard kill switch
  const cancelAll = useCallback(() => {
      // 1. Kill Mic
      recognitionRef.current?.abort();
      // 2. Kill Speech
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
      }
      isSpeakingRef.current = false; // Reset flag
      // 3. Suspend Audio
      if (audioCtxRef.current?.state === 'running') {
          audioCtxRef.current.suspend();
      }
  }, []);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) {
        onComplete?.();
        return;
    }

    isSpeakingRef.current = true;
    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();
    
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1.1;
    
    utter.onend = () => {
        isSpeakingRef.current = false;
        onComplete?.();
    };

    utter.onerror = () => {
        isSpeakingRef.current = false;
        onComplete?.();
    };

    window.speechSynthesis.speak(utter);
  }, []);

  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'alert') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    
    o.type = type === 'error' ? 'sawtooth' : 'sine';
    
    // ... (Tone logic unchanged)
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