import { useEffect, useRef, useCallback } from 'react';

export interface VoiceEngineConfig {
  lang?: string;
  onTranscript?: (final: string, interim: string) => void;
  onError?: (err: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

// --- Local Type Definitions for Strict Safety ---
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

export function useVoiceEngine(config: VoiceEngineConfig) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Voice Input ---
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      config.onError?.('Voice support missing');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.lang = config.lang || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Properly typed event handler
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      config.onTranscript?.(final, interim);
    };

    // Properly typed error handler
    rec.onerror = (e: SpeechRecognitionErrorEvent) => config.onError?.(e.error || 'Unknown error');
    
    rec.onstart = config.onStart;
    rec.onend = config.onEnd;
    
    recognitionRef.current = rec;
    return () => rec.abort();
  }, [config]);

  const start = useCallback(() => {
     // Removed unused 'e' variable
     try { recognitionRef.current?.start(); } catch { /* ignore already started */ }
  }, []);
  
  const stop = useCallback(() => recognitionRef.current?.abort(), []);

  // --- Audio Output & Tones ---
  const unlockAudio = useCallback(async () => {
    if (!audioCtxRef.current) audioCtxRef.current = new window.AudioContext();
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Interrupt previous
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1.1; // Slightly faster for efficiency
    window.speechSynthesis.speak(utter);
  }, []);

  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'alert') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    
    // Cyberpunk Sound Profile
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

  return { start, stop, speak, playTone, unlockAudio };
}