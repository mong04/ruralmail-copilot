
// useVoiceEngine.ts
// Unified voice input/output/tones for magical hands-free UX
import { useEffect, useRef, useCallback } from 'react';

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

  // --- Voice Input (SpeechRecognition) ---
  useEffect(() => {
    // SpeechRecognition cross-browser, type-safe encapsulation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      config.onError?.('Voice recognition not supported');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.lang = config.lang || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    // @ts-expect-error: SpeechRecognition event types are not reliably available across browsers
    rec.onresult = (e) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      config.onTranscript?.(final, interim);
    };
    // @ts-expect-error: SpeechRecognition event types are not reliably available across browsers
    rec.onerror = (e) => config.onError?.(e.error || 'Unknown error');
    if (typeof config.onStart === 'function') rec.onstart = config.onStart;
    if (typeof config.onEnd === 'function') rec.onend = config.onEnd;
    recognitionRef.current = rec;
    return () => rec.abort();
  }, [config]);

  const start = useCallback(() => recognitionRef.current?.start(), []);
  const stop = useCallback(() => recognitionRef.current?.abort(), []);

  // --- Voice Output (SpeechSynthesis) ---
  const speak = useCallback((text: string, cb?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.onend = cb || null;
    window.speechSynthesis.speak(utter);
  }, []);

  // --- Procedural Audio (tones) ---
  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'alert') => {
    if (!audioCtxRef.current) audioCtxRef.current = new window.AudioContext();
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    switch (type) {
      case 'success': o.frequency.value = 880; break;
      case 'error': o.frequency.value = 220; break;
      case 'start': o.frequency.value = 440; break;
      case 'alert': o.frequency.value = 660; break;
    }
    g.gain.value = 0.1;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  }, []);

  return { start, stop, speak, playTone };
}
