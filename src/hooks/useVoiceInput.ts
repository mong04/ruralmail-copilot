import { useState, useEffect, useRef, useCallback } from 'react';

// --- 1. STRICT TYPE DEFINITIONS ---

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

// --- 2. THE HOOK ---

export const useVoiceInput = (isListeningProp: boolean) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef(false);

  // 1. Wake Lock Management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListeningProp) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
           // Ignore wake lock errors (feature might not be available)
        }
      }
    };
    if (isListeningProp) requestWakeLock();
    return () => {
      wakeLockRef.current?.release().catch(() => {
        // Ignore wake lock release errors
      });
    };
  }, [isListeningProp]);

  // 2. Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionConstructor) {
      console.warn("Speech Recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isListeningProp && !isProcessing && !isPausedRef.current) {
        try {
          recognition.start();
        } catch { 
          // Ignore auto-restart errors
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    
    // Initial Start
    if (isListeningProp) {
      isPausedRef.current = false;
      try { 
        recognition.start(); 
      } catch { 
        // Ignore initial start errors
      }
    }

    return () => {
      isPausedRef.current = true;
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.abort(); 
        } catch { 
          // Ignore abort errors during cleanup
        }
      }
    };
  }, [isListeningProp, isProcessing]);

  // 3. Control Methods

  const start = useCallback(() => {
    isPausedRef.current = false;
    setIsProcessing(false); 
    try { 
      recognitionRef.current?.start(); 
    } catch {
      // Ignore start errors (e.g. already started)
    }
  }, []);

  const stop = useCallback(() => {
    isPausedRef.current = true;
    try { 
      recognitionRef.current?.abort(); 
    } catch { 
      // Ignore stop errors
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
    isListening, 
    reset, 
    stop, 
    start 
  };
};