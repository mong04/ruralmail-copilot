import { useState, useEffect, useRef, useCallback } from 'react';

// --- STRICT TYPES ---
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
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListeningProp) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
      }
    };
    if (isListeningProp) requestWakeLock();
    return () => { wakeLockRef.current?.release().catch(() => {}); };
  }, [isListeningProp]);

  // 2. Setup
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
        if (event.results[i].isFinal) finalTrans += event.results[i][0].transcript;
        else interimTrans += event.results[i][0].transcript;
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
      // Auto-restart if we are active, not processing, and not paused
      if (isListeningProp && !isProcessing && !isPausedRef.current) {
        restartTimerRef.current = setTimeout(() => {
            try { recognition.start(); } catch {}
        }, 150); // Small buffer
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    
    if (isListeningProp) {
      isPausedRef.current = false;
      try { recognition.start(); } catch {}
    }

    return () => {
      isPausedRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, [isListeningProp, isProcessing]);

  // 3. ROBUST CONTROLS

  const start = useCallback(() => {
    isPausedRef.current = false;
    setIsProcessing(false);
    
    // Hard Reset: Abort first to clear "Stopping" state, then wait, then start
    try { recognitionRef.current?.abort(); } catch {}
    
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    
    restartTimerRef.current = setTimeout(() => {
        try { recognitionRef.current?.start(); } catch {}
    }, 200); // 200ms safety buffer
  }, []);

  const stop = useCallback(() => {
    isPausedRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch {}
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    isPausedRef.current = false;
  }, []);

  return { 
    transcript, 
    isProcessing, 
    isListening, 
    reset, 
    stop, 
    start 
  };
};
