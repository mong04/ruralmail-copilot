import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, Activity, PackagePlus, AlertTriangle, 
  CheckCircle2, AlertCircle
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

// Utility for AI Badge Colors
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
  
  // VOICE HOOK (Initialized as false, started in Effect)
  const { transcript, isProcessing, reset, stop, start } = useVoiceInput(false); 
  const { speak, playTone } = useSound();

  // STATE MACHINE
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<'idle' | 'suggestion' | 'locked' | 'saved' | 'unknown'>('idle');
  const [history, setHistory] = useState<string[]>([]); 
  
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC ---

  /**
   * COMMIT: Saves to Redux
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
      
      setHistory(prev => [`#${stopNum + 1} - ${stopItem.address_line1}`, ...prev.slice(0, 4)]);

      // Reset Loop
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          // Restart Voice Engine
          reset(); 
      }, 800);
  }, [dispatch, playTone, reset, route]);

  /**
   * LOCK: High Confidence -> Confirm -> Save
   */
  const handleLock = useCallback((pred: Prediction) => {
    if (!pred.stop) return;
    setStatus('locked');
    stop(); // Cut mic

    const stopSeq = route.findIndex(r => r.id === pred.stop?.id) + 1;
    
    // AI Feedback
    let phrase = `Stop ${stopSeq}.`;
    if (pred.extracted.size === 'large') phrase += " Large.";
    else phrase += ` ${pred.stop?.address_line1.split(' ')[0]}`;

    speak(phrase, () => {
        // Only save after speaking finishes
        commitPackage(pred.stop!, pred.extracted);
    });
  }, [route, speak, stop, commitPackage]);

  /**
   * SUGGESTION: Medium Confidence -> Ask -> Listen
   */
  const handleSuggestion = useCallback((pred: Prediction) => {
      setStatus('suggestion');
      stop(); // Cut mic

      const opt1 = pred.candidates[0]?.address_line1.split(',')[0];
      const opt2 = pred.candidates[1]?.address_line1.split(',')[0];

      speak(`Say One for ${opt1}. Or Two for ${opt2}.`, () => {
          // Restart Mic for answer
          playTone('start');
          start();
      });
  }, [speak, stop, start, playTone]);

  /**
   * SELECTION: User chose an option (Voice or Click)
   */
  const handleSelectSuggestion = useCallback((selectedStop: Stop) => {
      if (!prediction) return;
      
      // Learn the alias
      brain.learn(prediction.originalTranscript, selectedStop.id);
      
      // Save directly (Skip robot speech for speed)
      commitPackage(selectedStop, prediction.extracted);
  }, [prediction, brain, commitPackage]);

  const handleFinishLoad = useCallback(() => {
      dispatch(endLoadingSession());
      playTone('success');
      navigate('/packages'); 
  }, [dispatch, navigate, playTone]);

  // --- EFFECTS ---

  useEffect(() => {
    if (!loadingSession.isActive) {
        dispatch(startLoadingSession());
        playTone('start');
        reset(); 
    }
  }, [dispatch, loadingSession.isActive, playTone, reset]);

  // MAIN LISTENER LOOP
  useEffect(() => {
    // Guard: Don't process input if we are in a locked state
    if (status === 'locked' || status === 'saved') return;

    if (isProcessing && transcript) {
      const cleanText = transcript.toLowerCase().trim();

      // 1. Suggestion Responses
      if (status === 'suggestion' && prediction) {
          if (['one', '1', 'first', 'yes'].some(w => cleanText.includes(w))) {
             handleSelectSuggestion(prediction.candidates[0]); return;
          }
          if (['two', '2', 'second'].some(w => cleanText.includes(w))) {
             if (prediction.candidates[1]) handleSelectSuggestion(prediction.candidates[1]); return;
          }
          if (['no', 'cancel', 'wrong'].some(w => cleanText.includes(w))) {
             setStatus('idle'); reset(); return;
          }
      }

      // 2. Global Commands
      if (['finish', 'done', 'complete'].some(cmd => cleanText.includes(cmd))) {
          handleFinishLoad(); return;
      }

      // 3. Idle Prediction
      if (status === 'idle') {
          const result = brain.predict(transcript);
          setPrediction(result);

          if (!result.stop) {
              if (transcript.length > 5) {
                 setStatus('unknown');
                 playTone('error');
                 setTimeout(() => { setStatus('idle'); reset(); }, 1500);
              }
          } 
          else if (result.confidence > 0.8 || result.source === 'alias' || result.source === 'stop_number') {
              handleLock(result);
          } 
          else if (result.confidence > 0.45) {
              handleSuggestion(result);
          }
      }
    }
  }, [isProcessing, transcript, brain, status, prediction, handleFinishLoad, handleLock, handleSuggestion, handleSelectSuggestion, playTone, reset]);

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
                <ArrowLeft className="mr-2 w-4 h-4" /> Exit Mode
            </Button>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground">Session Load</span>
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
                        className="flex flex-col items-center gap-10"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000" />
                            <div className="relative bg-surface border-2 border-brand p-12 rounded-full shadow-xl">
                                <Mic size={64} className="text-brand" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-foreground">Listening...</h2>
                            <p className="text-muted-foreground text-sm mt-2">Say address or "Stop 4"</p>
                        </div>
                    </motion.div>
                )}

                {/* MATCHED / SAVED */}
                {(status === 'locked' || status === 'saved') && (
                    <motion.div 
                        key="matched"
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-lg"
                    >
                        <div className={`relative w-full aspect-square border-2 bg-surface/50 backdrop-blur-xl flex flex-col items-center justify-center ${stateColor} shadow-2xl ${glowColor}`}>
                            
                            {/* Metadata Badges */}
                            {prediction && prediction.extracted && (
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
                            )}

                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-current" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-current" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-current" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-current" />

                            <span className="text-sm font-bold mb-4 opacity-80 flex items-center gap-2">
                                {status === 'saved' && <CheckCircle2 size={16} />}
                                {status === 'saved' ? 'Loaded' : 'Target Found'}
                            </span>
                            
                            <h1 className="text-[12rem] font-black leading-none tracking-tighter drop-shadow-lg">
                                {stopNumber}
                            </h1>
                            
                            <div className="absolute bottom-8 px-6 w-full text-center">
                                <div className="bg-surface p-4 border border-border/50 shadow-lg rounded-md">
                                    <span className="text-xl md:text-2xl font-bold text-foreground block truncate">
                                        {prediction?.stop?.address_line1}
                                    </span>
                                </div>
                            </div>
                        </div>
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
                    </motion.div>
                )}

                {/* SUGGESTION MODE UI */}
                {status === 'suggestion' && prediction && (
                    <motion.div 
                        key="suggestion"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md flex flex-col gap-4 bg-surface/90 backdrop-blur-xl p-6 border border-brand rounded-xl shadow-2xl"
                    >
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold text-brand uppercase tracking-widest">Confirm Target</h2>
                            <p className="text-muted-foreground text-xs mt-1">Say "One" or "Two"</p>
                        </div>

                        {prediction.candidates.map((cand, idx) => (
                            <Button 
                                key={cand.id}
                                variant="surface" 
                                onClick={() => handleSelectSuggestion(cand)}
                                className="h-auto py-4 px-6 flex items-center justify-between border-border hover:border-brand group text-left transition-all"
                            >
                                <div>
                                    <span className="text-xs text-brand font-bold uppercase tracking-widest block mb-1">
                                        Option {idx + 1}
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
                            className="mt-4 text-muted-foreground hover:text-danger w-full"
                        >
                           <AlertCircle size={16} className="mr-2" /> Wrong / Retry
                        </Button>
                    </motion.div>
                )}

            </AnimatePresence>
        </main>

        {/* FOOTER */}
        <footer className="flex-none h-16 w-full border-t border-border bg-surface/90 backdrop-blur flex items-center px-4 z-20">
            <div className="shrink-0 text-[10px] text-muted-foreground font-bold mr-4">
                RECENT LOG
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