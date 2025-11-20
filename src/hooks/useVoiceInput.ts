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
          console.warn('Wake Lock failed:', err); 
        }
      }
    };

    if (isListening) requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
           // Ignore release errors
        });
      }
    };
  }, [isListening]);

  // 2. Speech Recognition Setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Track if we *intentionally* stopped it
    let isIntentionalStop = false;

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
      // Only restart if we are supposed to be listening AND we didn't force stop it
      if (isListening && !isProcessing && !isIntentionalStop) {
        try {
          recognition.start();
        } catch {
          // Ignore restart errors
        }
      }
    };

    recognitionRef.current = recognition;
    
    // START
    if (isListening) {
        isIntentionalStop = false;
        try {
            recognition.start();
        } catch {
            // Ignore start errors
        }
    }

    // CLEANUP
    return () => {
        isIntentionalStop = true; // Tell onend NOT to restart
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort(); // Hard kill to fix Green Dot issue
                recognitionRef.current = null;
            } catch {
                // Ignore abort errors
            }
        }
    };
  }, [isListening, isProcessing]);

  // 3. Control Methods
  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setIsProcessing(false);
    setTimeout(() => {
        try {
            recognitionRef.current?.start();
        } catch {
            // Ignore restart errors
        }
    }, 100);
  }, []);

  return { transcript, isProcessing, reset, stop };
};