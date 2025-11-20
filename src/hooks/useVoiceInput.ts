import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceInput = (isListeningProp: boolean) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fix 1: Explicitly allow 'any' for this specific line
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Ref to track if we temporarily want the mic off (e.g., while speaking)
  const isPausedRef = useRef(false);

  // 1. Wake Lock Management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isListeningProp) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        // Fix 2: Removed 'err' variable
        } catch {
           // Ignore wake lock errors
        }
      }
    };
    if (isListeningProp) requestWakeLock();
    return () => {
      wakeLockRef.current?.release().catch(() => {
        // Fix 3: Comment inside empty block
        // Ignore release errors
      });
    };
  }, [isListeningProp]);

  // 2. Speech Recognition Setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new window.webkitSpeechRecognition();
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

    recognition.onend = () => {
      // Only restart if we are NOT paused and NOT processing
      if (isListeningProp && !isProcessing && !isPausedRef.current) {
        try {
          recognition.start();
        } catch { 
          // Ignore restart errors
        }
      }
    };

    recognitionRef.current = recognition;
    
    // Initial Start
    if (isListeningProp) {
      isPausedRef.current = false;
      try {
        recognition.start();
      } catch { 
        // Ignore start errors
      }
    }

    return () => {
      // Cleanup: Hard Kill
      isPausedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort(); 
          recognitionRef.current = null;
        } catch { 
          // Ignore abort errors
        }
      }
    };
  }, [isListeningProp, isProcessing]);

  // 3. Control Methods

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