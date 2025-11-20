import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceInput = (isListening: boolean) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 1. Wake Lock Management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListening) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          // actually use the error to satisfy linter
          console.warn('Wake Lock failed:', err); 
        }
      }
    };

    if (isListening) requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
           // Ignore release errors silently
        });
      }
    };
  }, [isListening]);

  // 2. Speech Recognition Setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Browser does not support speech recognition');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTrans = '';
      let interimTrans = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTrans += event.results[i][0].transcript;
        } else {
          interimTrans += event.results[i][0].transcript;
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
      if (isListening && !isProcessing) {
        try {
          recognition.start();
        } catch {
          // Ignore "already started" errors
        }
      }
    };

    recognitionRef.current = recognition;
    
    // Start immediately on mount if listening
    if (isListening) {
        try {
            recognition.start();
        } catch {
            // Ignore
        }
    }

    return () => {
        try {
            recognition.stop();
        } catch {
            // Ignore
        }
    };
  }, [isListening, isProcessing]);

  // 3. Control Methods
  const start = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    try {
      recognitionRef.current?.start();
    } catch {
      console.log('Already started');
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    setTimeout(() => {
        try {
            recognitionRef.current?.start();
        } catch {
            // Ignore
        }
    }, 100);
  }, []);

  return { transcript, isProcessing, start, stop, reset };
};