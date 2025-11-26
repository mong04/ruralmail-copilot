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

// Extended Error Interface
interface SpeechRecognitionErrorEvent extends Event {
  error: string; // e.g. 'not-allowed', 'no-speech'
  message?: string;
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
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition; };
    webkitSpeechRecognition: { new (): SpeechRecognition; };
  }
}

// --- 2. THE HOOK ---

export const useVoiceInput = () => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to safely check if an error is a SpeechRecognitionErrorEvent
  const isSpeechError = (err: unknown): err is SpeechRecognitionErrorEvent => {
    return typeof err === 'object' && err !== null && 'error' in err;
  };

  // Helper to format errors for the UI
  const handleError = useCallback((source: string, rawError: unknown) => {
    let message = 'Unknown Error';
    
    if (typeof rawError === 'string') {
      message = rawError;
    } else if (rawError instanceof Error) {
      message = rawError.message;
    } else if (isSpeechError(rawError)) {
      const code = rawError.error;
      switch (code) {
        case 'not-allowed': message = 'Mic Permission Denied'; break;
        case 'no-speech': message = 'No Speech Detected'; break;
        case 'network': message = 'Network Error'; break;
        case 'aborted': return; // Ignore normal aborts
        default: message = `Speech Error: ${code}`;
      }
    }

    setVoiceError(`${source}: ${message}`);
    
    // Auto-clear soft errors after a few seconds
    if (message === 'No Speech Detected') {
        setTimeout(() => setVoiceError(null), 2000);
    }
  }, []);

  // 1. Wake Lock (now controlled by isListening state)
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try { 
          wakeLockRef.current = await navigator.wakeLock.request('screen'); 
        } catch (e) {
           handleError('WakeLock', e);
        }
      }
    };
    if (isListening) {
      requestWakeLock();
    } else {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => { 
      wakeLockRef.current?.release().catch(() => {}); 
    };
  }, [isListening, handleError]);

  // 2. Setup
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setVoiceError("Browser does not support Voice API");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setVoiceError(null); 
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

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      handleError('Recognition', event);
    };

    recognitionRef.current = recognition;

    return () => {
      isPausedRef.current = true;
      const timer = restartTimerRef.current;
      if (timer) clearTimeout(timer);
      try { 
        recognition.abort(); 
      } catch {
        // Ignore
      }
    };
  }, [handleError]);

  // 3. CONTROLS

  const start = useCallback(() => {
    if (isListening) {
      return; // Already listening, do nothing.
    }
    try {
      recognitionRef.current?.start();
      isPausedRef.current = false;
    } catch (e) {
      handleError('ManualStart', e);
    }
  }, [handleError, isListening]);

  const stop = useCallback(() => {
    isPausedRef.current = true;
    try { 
      recognitionRef.current?.abort(); 
    } catch (e) {
      handleError('Stop', e);
    }
  }, [handleError]);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    isPausedRef.current = false;
    setVoiceError(null); 
  }, []);

  return { 
    transcript, 
    isProcessing, 
    isListening, 
    voiceError, 
    reset, 
    stop, 
    start 
  };
};