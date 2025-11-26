import { useCallback, useRef, useEffect, useState } from 'react';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext: typeof AudioContext;
}

export const useSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const getBestVoice = useCallback(() => {
    if (voices.length === 0) return null;
    const googleUS = voices.find(v => v.name === 'Google US English');
    if (googleUS) return googleUS;
    return voices.find(v => v.lang.startsWith('en-US')) || voices[0];
  }, [voices]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || 
        (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  // Text-to-Speech
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bestVoice = getBestVoice();
    if (bestVoice) utterance.voice = bestVoice;
    utterance.rate = 1.1; 
    utterance.pitch = 1.0;
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utterance);
  }, [getBestVoice]);

  // PROCEDURAL AUDIO
  // ✅ Added 'alert' to the allowed types
  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'lock' | 'alert') => {
    initAudio(); 
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // "Resolved" (C5 -> E5)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); 
        osc.frequency.linearRampToValueAtTime(659.25, t + 0.1); 
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); 
        
        osc.start(t);
        osc.stop(t + 0.6);
      } 
      else if (type === 'error') {
        // "Negative Operation" (Sawtooth drop)
        // Switched to Sawtooth so it's louder/clearer on mobile speakers
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.3); 
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
        
        osc.start(t);
        osc.stop(t + 0.3);
      } 
      else if (type === 'start') {
        // "Ready" Blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t); 
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.start(t);
        osc.stop(t + 0.15);
      }
      else if (type === 'lock') {
        // "Target Acquired" (Chirp)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t); 
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        
        osc.start(t);
        osc.stop(t + 0.1);
      }
      else if (type === 'alert') {
        // "Ambiguity" (Double Beep)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.start(t);
        osc.stop(t + 0.15);

        // Beep 2
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, t + 0.15);
        gain2.gain.setValueAtTime(0, t + 0.15);
        gain2.gain.linearRampToValueAtTime(0.1, t + 0.20);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        osc2.start(t + 0.15);
        osc2.stop(t + 0.3);
      }

    } catch { 
      // Ignore audio errors
    }
  }, [initAudio]);

  return { speak, playTone };
};