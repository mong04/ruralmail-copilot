import { useState, useEffect, useRef, useCallback } from 'react';

// --- TYPE DEFINITIONS (To fix "any" errors) ---
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition; };
    webkitSpeechRecognition: { new (): SpeechRecognition; };
  }
}

export const useVoiceInput = (isListeningProp: boolean) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // NEW: Track physical mic state for UI feedback
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef(false);

  // 1. Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListeningProp) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch { /* Ignore */ }
      }
    };
    if (isListeningProp) requestWakeLock();
    return () => {
      wakeLockRef.current?.release().catch(() => { /* Ignore */ });
    };
  }, [isListeningProp]);

  // 2. Speech Recognition
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTrans = '';
      let interimTrans = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) finalTrans += res[0].transcript;
        else interimTrans += res[0].transcript;
      }
      
      if (finalTrans) {
        setTranscript(finalTrans);
        setIsProcessing(true);
      } else {
        setTranscript(interimTrans);
      }
    };

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if permitted
      if (isListeningProp && !isProcessing && !isPausedRef.current) {
        try { recognition.start(); } catch { /* Ignore */ }
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    
    if (isListeningProp) {
      isPausedRef.current = false;
      try { recognition.start(); } catch { /* Ignore */ }
    }

    return () => {
      isPausedRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* Ignore */ }
      }
    };
  }, [isListeningProp, isProcessing]);

  // 3. Methods

  const start = useCallback(() => {
    isPausedRef.current = false;
    setIsProcessing(false); // Clear processing flag to allow loop
    try { recognitionRef.current?.start(); } catch { /* Ignore */ }
  }, []);

  const stop = useCallback(() => {
    isPausedRef.current = true;
    try { recognitionRef.current?.abort(); } catch { /* Ignore */ }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    isPausedRef.current = false;
    // We added a slight delay in your original to ensure smooth restart
    setTimeout(() => {
        try { recognitionRef.current?.start(); } catch { /* Ignore */ }
    }, 100);
  }, []);

  return { 
    transcript, 
    isProcessing, 
    isListening, // Exported for UI
    reset, 
    stop, 
    start // Exported for Logic
  };
};