import { useCallback, useRef } from 'react';

// Helper type for older Safari browsers
interface WindowWithWebkitAudio extends Window {
  webkitAudioContext: typeof AudioContext;
}

export const useSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      // Check for standard AudioContext, fallback to webkit if necessary
      const AudioContextClass = window.AudioContext || 
        (window as unknown as WindowWithWebkitAudio).webkitAudioContext;

      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {
        // Ignore resume errors (usually happens if no user interaction yet)
      });
    }
  }, []);

  // 1. Text-to-Speech
  const speak = useCallback((text: string) => {
    // Simple checks to prevent crashing if API is missing
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop previous

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; 
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }, []);

  // 2. Procedural Beeps
  const playTone = useCallback((type: 'success' | 'error' | 'start') => {
    initAudio(); 
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'success') {
        // Happy "Ding"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'error') {
        // Sad "Buzz"
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'start') {
        // Quick "Blip"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // Ignore audio errors
    }
  }, [initAudio]);

  return { speak, playTone };
};