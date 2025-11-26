import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, Activity, AlertTriangle, 
  AlertCircle, CheckCircle2, PackagePlus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { type AppDispatch, type RootState } from '../../../store';
import { 
  addPackage, 
  startLoadingSession, 
  endLoadingSession, 
  incrementLoadCount 
} from '../store/packageSlice';

import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { type Package, type Stop } from '../../../db';
import { Button } from '../../../components/ui/Button';

// THEME-AWARE UTILS
const getSizeColor = (size: string) => {
  if (size === 'large') return 'text-warning border-warning bg-warning/10';
  if (size === 'small') return 'text-brand border-brand bg-brand/10';
  return 'text-muted-foreground border-border bg-surface-muted';
};

export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const route = useSelector((state: RootState) => state.route.route);
  const loadingSession = useSelector((state: RootState) => state.packages.loadingSession) ?? {
    isActive: false, count: 0
  };

  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  // VOICE HOOK
  // Start with 'false' (off) - we manually start it in the useEffect once session is ready
  const { transcript, isProcessing, isListening, reset, stop, start } = useVoiceInput(false); 
  const { speak, playTone } = useSound();

  // STATE MACHINE
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<'idle' | 'suggestion' | 'locked' | 'saved' | 'unknown'>('idle');
  const [history, setHistory] = useState<string[]>([]); 
  
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- ACTIONS ---

  /**
   * COMMIT: Saves the package to Redux
   */
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
      setHistory(prev => [`#${stopNum + 1}`, ...prev.slice(0, 4)]);

      // Reset Loop
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          // Restart Cycle
          reset(); 
          start(); 
      }, 800);
  }, [dispatch, playTone, reset, start, route]);

  /**
   * LOCK: High confidence match found
   */
  const handleLock = useCallback((pred: Prediction) => {
    if (!pred.stop) return;
    
    setStatus('locked');
    stop(); // Cut mic

    const stopSeq = route.findIndex(r => r.id === pred.stop?.id) + 1;
    
    // Short Confirmation Phrase
    let phrase = `Stop ${stopSeq}.`;
    if (pred.extracted.size === 'large') phrase += " Large.";
    else phrase += ` ${pred.stop?.address_line1.split(' ')[0]}`; // Just house number

    speak(phrase, () => {
        // Only commit after robot finishes speaking
        commitPackage(pred.stop!, pred.extracted);
    });
  }, [route, speak, stop, commitPackage]);

  /**
   * SUGGESTION: Medium confidence - VOICE INTERACTION
   */
  const handleSuggestion = useCallback((pred: Prediction) => {
      setStatus('suggestion');
      stop(); // Cut mic so robot can speak
      
      const option1 = pred.candidates[0].address_line1.split(',')[0]; 
      const option2 = pred.candidates[1]?.address_line1.split(',')[0];
      
      let phrase = `Clarify. Say One for ${option1}.`;
      if (option2) phrase += ` Or Two for ${option2}.`;

      speak(phrase, () => {
          playTone('start'); // Audio Cue that user can speak
          reset(); 
          start(); 
      });
  }, [speak, stop, playTone, reset, start]);

  /**
   * SELECTION: User confirmed a suggestion (Voice or Touch)
   */
  const handleSelectSuggestion = useCallback((selectedStop: Stop) => {
      if (!prediction) return;

      // 1. TEACH THE BRAIN
      brain.learn(prediction.originalTranscript, selectedStop.id);

      // 2. Lock it in (Directly commit since user manually selected)
      commitPackage(selectedStop, prediction.extracted);
  }, [prediction, brain, commitPackage]);

  /**
   * FINISH: Exit mode
   */
  const handleFinishLoad = useCallback(() => {
      dispatch(endLoadingSession());
      playTone('success');
      navigate('/packages'); 
  }, [dispatch, navigate, playTone]);

  // --- BRAIN LOOP ---

  useEffect(() => {
    if (!loadingSession.isActive) {
        dispatch(startLoadingSession());
        playTone('start');
        reset(); 
        start();
    }
  }, [dispatch, loadingSession.isActive, playTone, reset, start]);

  // MAIN LISTENER LOOP
  useEffect(() => {
    // If we are locked/saved, ignore mic. 
    if (status === 'locked' || status === 'saved') return;

    if (isProcessing && transcript) {
      const cleanText = transcript.toLowerCase().trim();

      // --- 1. HANDLE SUGGESTION STATE RESPONSES ---
      if (status === 'suggestion' && prediction) {
          
          if (['one', '1', 'first', 'option one', 'yes', 'yeah', 'correct'].some(w => cleanText.includes(w))) {
             handleSelectSuggestion(prediction.candidates[0]);
             return;
          }
          if (['two', '2', 'second', 'option two'].some(w => cleanText.includes(w))) {
             if (prediction.candidates[1]) {
                handleSelectSuggestion(prediction.candidates[1]);
                return;
             }
          }
          if (['three', '3', 'third'].some(w => cleanText.includes(w))) {
             if (prediction.candidates[2]) {
                handleSelectSuggestion(prediction.candidates[2]);
                return;
             }
          }
          if (['no', 'wrong', 'cancel', 'none'].some(w => cleanText.includes(w))) {
             setStatus('idle');
             playTone('error');
             reset();
             return; // Don't fall through
          }
      }

      // --- 2. GLOBAL COMMANDS ---
      if (['finish', 'done', 'complete'].some(cmd => cleanText.includes(cmd))) {
          handleFinishLoad(); return;
      }
      if (['cancel', 'wrong', 'no'].some(cmd => cleanText.includes(cmd))) {
          setStatus('idle'); reset(); return;
      }

      // --- 3. STANDARD PREDICTION (Only if IDLE) ---
      if (status === 'idle') {
          const result = brain.predict(transcript);
          setPrediction(result);

          if (!result.stop) {
              if (transcript.length > 5) setStatus('unknown');
          } 
          else if (result.confidence > 0.8 || result.source === 'alias' || result.source === 'stop_number') {
              handleLock(result);
          } 
          else if (result.confidence > 0.45) {
              handleSuggestion(result);
          }
          else {
               setStatus('unknown');
          }
      }
    }
  }, [isProcessing, transcript, brain, status, prediction, handleFinishLoad, handleLock, handleSuggestion, handleSelectSuggestion, playTone, reset]);

  // Cleanup
  useEffect(() => {
      return () => {
          if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
          window.speechSynthesis.cancel();
      };
  }, []);

  // --- RENDER ---

  const stopNumber = prediction?.stop 
    ? route.findIndex(r => r.id === prediction?.stop?.id) + 1 
    : '?';

  return (
        <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-hidden"
             style={{ bottom: 'var(--bottom-nav-height)' }}>
        
        {/* GRID BACKGROUND */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
             style={{ 
                backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
             }} 
        />

        {/* HEADER */}
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

        {/* MAIN HUD */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full p-6">
            <AnimatePresence mode='wait'>
                
                {/* IDLE */}
                {status === 'idle' && (
                    <motion.div 
                        key="idle"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-8"
                    >
                        <div className="relative">
                            {/* Visual Feedback: Only pulse when physically listening */}
                            {isListening && (
                                <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000" />
                            )}
                            <div className={`relative bg-surface border-2 ${isListening ? 'border-brand' : 'border-muted'} p-12 rounded-full shadow-lg transition-colors duration-300`}>
                                <Mic size={64} className={isListening ? 'text-brand' : 'text-muted'} />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                {isListening ? "AWAITING INPUT" : "PROCESSING..."}
                            </h2>
                            <p className="text-muted-foreground text-xs uppercase tracking-widest mt-2">
                                "123 Main" &bull; "Stop 5" &bull; "Large"
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* LOCKED / SAVED */}
                {(status === 'locked' || status === 'saved') && prediction && (
                    <motion.div 
                        key="locked"
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-lg"
                    >
                        <div className={`relative w-full aspect-square border-2 bg-surface/80 backdrop-blur-xl flex flex-col items-center justify-center ${status === 'saved' ? 'border-success text-success' : 'border-brand text-brand'} shadow-2xl`}>
                            
                            {/* Metadata Badges */}
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

                {/* SUGGESTION MODE */}
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

                {/* UNKNOWN */}
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

        {/* LOG */}
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