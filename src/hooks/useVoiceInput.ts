import { useState, useEffect, useRef, useCallback } from 'react';

// --- 1. TYPE DEFINITIONS ---
// We manually define these here so you don't need to install @types/dom-speech-recognition

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
}

// Extend the global Window interface
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

// --- 2. THE HOOK ---

export const useVoiceInput = (isListeningProp: boolean) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // FIX 1: Strongly typed ref instead of 'any'
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef(false);

  // 1. Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListeningProp) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
           // Ignore errors
        }
      }
    };
    if (isListeningProp) requestWakeLock();
    return () => {
      wakeLockRef.current?.release().catch(() => {});
    };
  }, [isListeningProp]);

  // 2. Speech Recognition Setup
  useEffect(() => {
    // FIX 2: Safely access the constructor without 'any'
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionConstructor) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false; // We restart manually for better control
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // FIX 3: Event is now strongly typed
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTrans = '';
      let interimTrans = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTrans += result[0].transcript;
        } else {
          interimTrans += result[0].transcript;
        }
      }

      if (finalTrans) {
        setTranscript(finalTrans);
        setIsProcessing(true);
      } else {
        setTranscript(interimTrans);
      }
    };

    recognition.onend = () => {
      if (isListeningProp && !isProcessing && !isPausedRef.current) {
        try {
          recognition.start();
        } catch { 
          // Ignore
        }
      }
    };

    recognition.onstart = () => {
      setIsProcessing(true);
    };

    // FIX 4: Assignment is now type-safe
    recognitionRef.current = recognition;
    
    // Initial Start
    if (isListeningProp) {
      isPausedRef.current = false;
      try {
        recognition.start();
      } catch { 
        // Ignore
      }
    }

    return () => {
      isPausedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort(); 
          recognitionRef.current = null;
        } catch { 
          // Ignore
        }
      }
    };
  }, [isListeningProp, isProcessing]);

  // 3. Control Methods
  const start = useCallback(() => {
    isPausedRef.current = false;
    try {
      recognitionRef.current?.start();
    } catch {
      // Ignore
    }
  }, []);

  const stop = useCallback(() => {
    isPausedRef.current = true;
    try {
      recognitionRef.current?.abort(); 
    } catch { 
      // Ignore
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    isPausedRef.current = false;
  }, []);

  return { 
    transcript, 
    isProcessing, 
    reset, 
    stop, 
    start 
  };
};