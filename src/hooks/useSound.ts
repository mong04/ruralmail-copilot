import { useCallback, useRef, useEffect, useState } from 'react';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext: typeof AudioContext;
}

export const useSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load Voices (Unchanged)
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

  // 1. Text-to-Speech (Unchanged)
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

  // 2. PREMIUM PROCEDURAL AUDIO (The Upgrade)
  const playTone = useCallback((type: 'success' | 'error' | 'start' | 'lock') => {
    initAudio(); 
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Master volume connection
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // A "Major Third" Chord Arpeggio (C5 -> E5) -> Sounds "Resolved"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.linearRampToValueAtTime(659.25, t + 0.1); // Slide to E5
        
        // Envelope: Soft Attack, Long Decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); // Decay
        
        osc.start(t);
        osc.stop(t + 0.6);
      } 
      else if (type === 'error') {
        // A "Discordant" Low Thud
        osc.type = 'triangle'; // Grittier sound
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3); // Pitch drop
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
        
        osc.start(t);
        osc.stop(t + 0.3);
      } 
      else if (type === 'start') {
        // High Tech "Blip" (Ready)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t); // A5
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.start(t);
        osc.stop(t + 0.15);
      }
      else if (type === 'lock') {
        // NEW: The "I found it" sound (Crisp, short chirp)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t); 
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        
        osc.start(t);
        osc.stop(t + 0.1);
      }

    } catch { 
      // Ignore audio errors
    }
  }, [initAudio]);

  return { speak, playTone };
};