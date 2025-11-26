import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, Activity, PackagePlus, AlertTriangle, 
  CheckCircle2, AlertCircle, XCircle, Volume2, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { type AppDispatch, type RootState } from '../../../store';
import { 
  addPackage, 
  startLoadingSession, 
  endLoadingSession, 
  incrementLoadCount 
} from '../store/packageSlice';

import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSound } from '../../../hooks/useSound';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { type Package, type Stop } from '../../../db';
import { Button } from '../../../components/ui/Button';

// --- VISUAL HELPERS ---
const getSizeColor = (size: string) => {
  if (size === 'large') return 'text-warning border-warning bg-warning/10';
  if (size === 'small') return 'text-brand border-brand bg-brand/10';
  return 'text-muted-foreground border-border bg-surface-muted';
};

export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  // --- REDUX STATE ---
  const route = useSelector((state: RootState) => state.route.route);
  const loadingSession = useSelector((state: RootState) => state.packages.loadingSession) ?? {
    isActive: false, count: 0
  };

  // --- BRAIN ---
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  // --- HOOKS ---
  // We ignore 'isProcessing' from hook because we use our own debounce logic
  const { transcript, isListening, voiceError, reset, stop, start } = useVoiceInput(true); 
  const debouncedTranscript = useDebounce(transcript, 400); // 400ms pause required
  const { speak, playTone } = useSound();

  // --- LOCAL STATE ---
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // Visual state for TTS
  const [status, setStatus] = useState<'idle' | 'suggestion' | 'locked' | 'saved' | 'unknown'>('idle');
  const [history, setHistory] = useState<string[]>([]); 
  const [lastProcessed, setLastProcessed] = useState<string>('');

  // --- REFS (Timers) ---
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 🎤 ROBUST TTS SYSTEM
   * Handles browser audio failures gracefully.
   * 1. Stops Mic
   * 2. Starts Timeout (Watchdog)
   * 3. Speaks
   * 4. Recovers (Restarts Mic)
   */
  const robustSpeakAndRestart = useCallback((text: string) => {
    setIsSpeaking(true);
    stop(); // Cut input to prevent feedback loop

    let hasRecovered = false;

    // The recovery function that resets the world
    const recover = (source: 'finish' | 'timeout' | 'interrupt') => {
        if (hasRecovered) return; // Prevent double-fire
        hasRecovered = true;

        setIsSpeaking(false);
        
        if (source === 'timeout') {
            toast.warning("Audio driver reset");
        }
        if (source === 'interrupt') {
            toast.info("Interrupted");
        }

        // Restart Input
        playTone('start');
        start();
    };

    // 1. WATCHDOG: If TTS takes > 5s, assume crash and force reset
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
        console.warn("TTS Watchdog triggered - Forcing recovery");
        recover('timeout');
    }, 5000);

    // 2. SPEAK: Attempt to use browser API
    speak(text, () => {
        // Success callback
        if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
        recover('finish');
    });
    
  }, [speak, start, stop, playTone]);

  /**
   * 🛑 MANUAL INTERRUPT
   * Allows user to tap "X" to kill audio and listening immediately.
   */
  const handleInterrupt = useCallback(() => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      // Force reset of logic
      setLastProcessed('');
      setPrediction(null);
      setStatus('idle');
      
      playTone('start');
      start();
  }, [playTone, start]);


  // --- CORE ACTIONS ---

  const commitPackage = useCallback((stopItem: Stop, extracted: Prediction['extracted']) => {
      const stopNum = route.findIndex(r => r.id === stopItem.id);
      
      const newPkg: Package = {
          id: crypto.randomUUID(),
          tracking: '',
          size: extracted.size, 
          notes: extracted.notes.join(', ') || 'Voice Load',
          assignedStopId: stopItem.id,
          assignedStopNumber: stopNum,
          assignedAddress: stopItem.full_address
      };

      dispatch(addPackage(newPkg));
      dispatch(incrementLoadCount());
      
      playTone('success');
      setStatus('saved');
      setHistory(prev => [`#${stopNum + 1} - ${stopItem.address_line1}`, ...prev.slice(0, 4)]);

      // Quick visual confirmation before resetting
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          setLastProcessed(''); 
          reset(); 
          start(); 
      }, 800);
  }, [dispatch, playTone, reset, start, route]);

  const handleLock = useCallback((pred: Prediction) => {
    if (!pred.stop) return;
    
    setStatus('locked');
    stop(); 

    const stopSeq = route.findIndex(r => r.id === pred.stop?.id) + 1;
    let phrase = `Stop ${stopSeq}.`;
    if (pred.extracted.size === 'large') phrase += " Large.";
    else phrase += ` ${pred.stop?.address_line1.split(' ')[0]}`;

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    
    // Auto-commit watchdog
    safetyTimerRef.current = setTimeout(() => {
        commitPackage(pred.stop!, pred.extracted);
    }, 2500);

    // Speak confirmation (Fire and forget, we don't wait for callback here as timer handles commit)
    setTimeout(() => {
        speak(phrase); 
    }, 50);

  }, [route, speak, stop, commitPackage]);

  const handleSuggestion = useCallback((pred: Prediction) => {
      setStatus('suggestion');
      stop(); 
      
      const opt1 = pred.candidates[0]?.address_line1.split(',')[0] ?? "Option 1";
      const opt2 = pred.candidates[1]?.address_line1.split(',')[0] ?? "Option 2";

      playTone('alert');

      setTimeout(() => {
          robustSpeakAndRestart(`Say One for ${opt1}. Or Two for ${opt2}.`);
      }, 100);
  }, [stop, playTone, robustSpeakAndRestart]);

  const handleSelectSuggestion = useCallback((selectedStop: Stop) => {
      if (!prediction) return;
      // INTELLIGENCE: Teach the brain this alias mapping
      brain.learn(prediction.originalTranscript, selectedStop.id);
      commitPackage(selectedStop, prediction.extracted);
  }, [prediction, brain, commitPackage]);

  const handleUnknown = useCallback(() => {
      setStatus('unknown');
      playTone('error');
      stop(); 

      // Error pause
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          setLastProcessed(''); 
          reset();
          start(); 
      }, 1500);
  }, [playTone, stop, reset, start]);

  const handleFinishLoad = useCallback(() => {
      dispatch(endLoadingSession());
      playTone('success');
      navigate('/packages'); 
  }, [dispatch, navigate, playTone]);


  // --- INITIALIZATION ---

  useEffect(() => {
    if (!loadingSession.isActive) {
        dispatch(startLoadingSession());
        playTone('start');
        reset(); 
        start();
    }
  }, [dispatch, loadingSession.isActive, playTone, reset, start]);

  // --- MAIN INTELLIGENCE LOOP ---
  useEffect(() => {
    // 1. Block processing if we are Speaking or already Locked
    if (isSpeaking || status === 'locked' || status === 'saved') return;

    // 2. Debounce Check
    if (debouncedTranscript && debouncedTranscript !== lastProcessed) {
      const cleanText = debouncedTranscript.toLowerCase().trim();
      setLastProcessed(debouncedTranscript); // prevent re-entry

      // 3. Suggestion Mode Specific Commands
      if (status === 'suggestion' && prediction) {
          if (['one', '1', 'first', 'yes'].some(w => cleanText.includes(w))) {
             handleSelectSuggestion(prediction.candidates[0]); return;
          }
          if (['two', '2', 'second'].some(w => cleanText.includes(w))) {
             if (prediction.candidates[1]) handleSelectSuggestion(prediction.candidates[1]); return;
          }
          if (['no', 'cancel', 'wrong', 'zero'].some(w => cleanText.includes(w))) {
             setStatus('idle'); reset(); start(); return;
          }
      }

      // 4. Global Commands
      if (['finish', 'done', 'complete'].some(cmd => cleanText.includes(cmd))) {
          handleFinishLoad(); return;
      }
      if (['cancel', 'wrong', 'no', 'reset'].some(cmd => cleanText.includes(cmd))) {
          setStatus('idle'); reset(); start(); return;
      }

      // 5. Brain Prediction
      const result = brain.predict(debouncedTranscript);
      setPrediction(result);

      if (!result.stop) {
          // Only error if significant text was spoken
          if (debouncedTranscript.length > 4) {
             handleUnknown();
          } else {
             // Short noise? Just reset silently
             reset(); start(); 
          }
      } 
      else if (result.confidence > 0.75 || result.source === 'alias' || result.source === 'stop_number') {
          handleLock(result);
      } 
      else if (result.confidence > 0.4) {
          handleSuggestion(result);
      }
      else {
          handleUnknown();
      }
    }
  }, [debouncedTranscript, lastProcessed, brain, status, prediction, isSpeaking, handleFinishLoad, handleLock, handleSuggestion, handleSelectSuggestion, handleUnknown, reset, start]);

  // --- CLEANUP ---
  useEffect(() => {
      return () => {
          if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
          if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
          window.speechSynthesis.cancel();
      };
  }, []);


  // --- RENDER ---
  const stopNumber = prediction?.stop 
    ? route.findIndex(r => r.id === prediction?.stop?.id) + 1 
    : '?';

  const stateColor = 
    status === 'locked' || status === 'saved' ? 'text-success border-success' : 
    status === 'unknown' ? 'text-warning border-warning' : 
    'text-border border-border';

  const glowColor = 
    status === 'locked' || status === 'saved' ? 'shadow-success/20' : 
    status === 'unknown' ? 'shadow-warning/20' : 
    'shadow-brand/20';

    return (
        <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-hidden"
             style={{ bottom: 'var(--bottom-nav-height)' }}>
        
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
             style={{ 
                backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
             }} 
        />

        {/* Header */}
        <header className="flex-none flex justify-between items-center p-4 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest">
                <ArrowLeft className="mr-2 w-4 h-4" /> Exit
            </Button>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Session</span>
                    <span className="text-xl font-bold text-brand tabular-nums leading-none">
                        {loadingSession.count.toString().padStart(3, '0')}
                    </span>
                </div>
                <Activity className="w-5 h-5 text-brand animate-pulse" />
            </div>
        </header>

        {/* Error HUD */}
        <AnimatePresence>
            {voiceError && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                    className="absolute top-20 left-4 right-4 z-50 bg-danger/90 text-white p-4 rounded-md shadow-lg backdrop-blur-md flex items-center gap-3 border border-white/20"
                >
                    <XCircle className="shrink-0" />
                    <div className="flex-1 text-sm font-bold font-mono">{voiceError}</div>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 p-0" onClick={() => { reset(); start(); }}>
                        Run
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full p-6">
            <AnimatePresence mode='wait'>
                
                {status === 'idle' && (
                    <motion.div 
                        key="idle"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-10"
                    >
                        {/* Dynamic Icon Ring */}
                        <div className="relative">
                            
                            {/* Listening Pulse */}
                            {isListening && !isSpeaking && (
                                <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000" />
                            )}

                            {/* Speaking Pulse */}
                            {isSpeaking && (
                                <div className="absolute inset-0 bg-warning/20 rounded-full animate-ping duration-1000" />
                            )}
                            
                            <div className={`
                                relative bg-surface border-2 p-12 rounded-full shadow-xl transition-all duration-300
                                ${isSpeaking ? 'border-warning scale-110' : isListening ? 'border-brand' : 'border-muted'}
                            `}>
                                {isSpeaking ? (
                                    <Volume2 size={64} className="text-warning animate-pulse" />
                                ) : (
                                    <Mic size={64} className={isListening ? 'text-brand' : 'text-muted'} />
                                )}
                            </div>
                        </div>

                        {/* Status Text / Override Controls */}
                        <div className="text-center relative">
                            {isSpeaking ? (
                                <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2">
                                    <h2 className="text-2xl font-bold text-warning">AI SPEAKING...</h2>
                                    
                                    <Button 
                                        variant="glass" 
                                        size="sm"
                                        onClick={handleInterrupt}
                                        className="gap-2 border-warning text-warning hover:bg-warning/10"
                                    >
                                        <X size={14} /> Interrupt
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-foreground">
                                        {isListening ? "LISTENING..." : "PROCESSING"}
                                    </h2>
                                    <p className="text-muted-foreground text-sm uppercase tracking-widest mt-2">
                                        "123 Main" &bull; "Stop 5" &bull; "Large"
                                    </p>
                                    {transcript && (
                                        <p className="mt-4 text-brand font-mono text-lg animate-pulse">
                                            {transcript}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {(status === 'locked' || status === 'saved') && prediction && (
                    <motion.div 
                        key="locked"
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-lg"
                    >
                        <div className={`relative w-full aspect-square border-2 bg-surface/80 backdrop-blur-xl flex flex-col items-center justify-center ${stateColor} shadow-2xl ${glowColor}`}>
                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                {prediction.extracted.size !== 'medium' && (
                                    <span className={`px-2 py-1 text-xs font-black uppercase border ${getSizeColor(prediction.extracted.size)}`}>
                                        {prediction.extracted.size}
                                    </span>
                                )}
                                {prediction.extracted.priority && (
                                    <span className="px-2 py-1 text-xs font-black uppercase border text-danger border-danger bg-danger/10">
                                        PRIORITY
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-[0.3em] mb-4 opacity-80 flex items-center gap-2">
                                {status === 'saved' ? <CheckCircle2 size={16} /> : null}
                                {status === 'saved' ? 'Confirmed' : 'Target Lock'}
                            </span>
                            <h1 className="text-[10rem] font-black leading-none tracking-tighter drop-shadow-lg">
                                {stopNumber}
                            </h1>
                            <div className="absolute bottom-8 px-6 w-full text-center">
                                <div className="bg-surface p-4 border border-border/50 shadow-lg rounded-md">
                                    <span className="text-xl font-bold text-foreground block truncate">
                                        {prediction.stop?.address_line1}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {status === 'suggestion' && prediction && (
                    <motion.div 
                        key="suggestion"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md flex flex-col gap-4"
                    >
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-warning uppercase">Confirm Target</h2>
                            <p className="text-muted-foreground text-xs">Say "One", "Two", or "No"</p>
                        </div>
                        {prediction.candidates.map((cand, idx) => (
                            <Button 
                                key={cand.id}
                                variant="surface" 
                                onClick={() => handleSelectSuggestion(cand)}
                                className="h-auto py-4 px-6 flex items-center justify-between border-border hover:border-brand group text-left transition-all"
                            >
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest block text-brand">
                                        Say "Option {idx + 1}"
                                    </span>
                                    <span className="text-lg font-bold text-foreground group-hover:text-brand transition-colors">
                                        {cand.address_line1}
                                    </span>
                                </div>
                                <div className="text-xl font-black text-muted-foreground/30 group-hover:text-brand">
                                    #{route.findIndex(r => r.id === cand.id) + 1}
                                </div>
                            </Button>
                        ))}
                        <Button 
                            variant="ghost" 
                            onClick={() => { setStatus('idle'); reset(); start(); }}
                            className="mt-4 text-muted-foreground hover:text-danger"
                        >
                           <AlertCircle size={16} className="mr-2" /> Wrong / Retry
                        </Button>
                    </motion.div>
                )}

                {status === 'unknown' && (
                    <motion.div 
                        key="unknown"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className="p-10 border-4 border-warning rounded-full bg-warning/10 animate-pulse mb-8">
                            <AlertTriangle size={80} className="text-warning" />
                        </div>
                        <h2 className="text-4xl font-bold text-warning">NO MATCH</h2>
                        <p className="mt-4 text-muted-foreground font-mono">"{transcript}"</p>
                    </motion.div>
                )}

            </AnimatePresence>
        </main>

        {/* Footer Log */}
        <footer className="flex-none h-16 w-full border-t border-border bg-surface/90 backdrop-blur flex items-center px-4 z-20">
            <div className="shrink-0 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mr-4">
                Log
            </div>
            <div className="flex-1 flex gap-2 overflow-hidden">
                <AnimatePresence initial={false}>
                {history.map((item, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="shrink-0 px-3 py-1 bg-surface-muted rounded border border-border flex items-center gap-2"
                    >
                        <PackagePlus size={12} className="text-success" />
                        <span className="text-xs font-bold text-foreground">{item}</span>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </footer>
    </div>
  );
};