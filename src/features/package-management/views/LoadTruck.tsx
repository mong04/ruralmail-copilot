// src/features/package-management/views/LoadTruck.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Activity, PackagePlus, AlertTriangle } from 'lucide-react';
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
import { type Package } from '../../../db';
import { Button } from '../../../components/ui/Button';

export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const route = useSelector((state: RootState) => state.route.route);
  const loadingSession = useSelector((state: RootState) => state.packages.loadingSession) ?? {
    isActive: false, count: 0
  };

  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  // 1. MIC CONTROLS
  // FIX: We need 'start' to manually restart the engine after we stopped it
  const { transcript, isProcessing, reset, stop, start } = useVoiceInput(false); 
  const { speak, playTone } = useSound();

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<'idle' | 'matched' | 'unknown' | 'saved'>('idle');
  const [history, setHistory] = useState<string[]>([]); 
  
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC ---

  const savePackage = useCallback((pred: Prediction) => {
      if (!pred.stop) return;

      const stopNum = route.findIndex(r => r.id === pred.stop?.id);
      
      const newPkg: Package = {
          id: crypto.randomUUID(),
          tracking: '',
          size: 'medium',
          notes: 'Voice Load',
          assignedStopId: pred.stop.id,
          assignedStopNumber: stopNum,
          assignedAddress: pred.stop.full_address
      };

      dispatch(addPackage(newPkg));
      dispatch(incrementLoadCount());
      
      playTone('success');
      setStatus('saved');
      
      setHistory(prev => [`#${stopNum + 1} - ${pred.stop?.address_line1}`, ...prev.slice(0, 4)]);

      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          
          // FIX: Explicitly restart the mic sequence
          reset(); // Clear old text
          start(); // Start listening again
      }, 800);
  }, [dispatch, playTone, reset, start, route]);

  const handleMatch = useCallback((result: Prediction) => {
    if (!result.stop) return;
    
    // 1. IMMEDIATE BLOCK: Stop processing new audio
    setStatus('matched');
    stop(); // Physically cut the mic so we don't hear the robot

    const stopSeq = route.findIndex(r => r.id === result.stop?.id) + 1;
    const phrase = `Stop ${stopSeq}. ${result.stop?.address_line1}`;
    
    // 2. Speak the confirmation
    speak(phrase, () => {
        // 3. CALLBACK: Only fires when robot SHUTS UP
        savePackage(result);
    });
  }, [route, speak, stop, savePackage]);

  const handleUnknown = useCallback(() => {
      setStatus('unknown');
      playTone('error');
      
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          // Restart mic here too, just in case
          reset();
          start();
      }, 1500);
  }, [playTone, reset, start]);

  const handleFinishLoad = useCallback(() => {
      dispatch(endLoadingSession());
      playTone('success');
      navigate('/packages'); 
  }, [dispatch, navigate, playTone]);

  // --- EFFECTS ---

  // Start Session
  useEffect(() => {
    if (!loadingSession.isActive) {
        dispatch(startLoadingSession());
        playTone('start');
        // Initial Start
        reset(); 
        start();
    }
  }, [dispatch, loadingSession.isActive, playTone, reset, start]);

  // THE BRAIN LOOP
  useEffect(() => {
    // CRITICAL: Guard Clause prevents feedback loops
    if (status !== 'idle') return;

    if (isProcessing && transcript) {
      const cleanText = transcript.toLowerCase().trim();

      // Command Check
      if (['finish', 'done', 'stop load', 'complete'].some(cmd => cleanText.includes(cmd))) {
          handleFinishLoad();
          return;
      }

      const result = brain.predict(transcript);
      setPrediction(result);

      if (!result.stop || result.confidence < 0.4) {
          handleUnknown();
      } else {
          // Lock it in immediately
          handleMatch(result);
      }
    }
  }, [isProcessing, transcript, brain, status, handleFinishLoad, handleUnknown, handleMatch]);

  // Cleanup timers
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

  // Semantic Colors (Works in all themes)
  const stateColor = 
    status === 'matched' || status === 'saved' ? 'text-success border-success' : 
    status === 'unknown' ? 'text-warning border-warning' : 
    'text-border border-border';

  // Shadows only applied if supported by theme vars
  const glowColor = 
    status === 'matched' || status === 'saved' ? 'shadow-success/20' : 
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
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
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
                {(status === 'matched' || status === 'saved') && (
                    <motion.div 
                        key="matched"
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-lg"
                    >
                        <div className={`relative w-full aspect-square border-2 bg-surface/50 backdrop-blur-xl flex flex-col items-center justify-center ${stateColor} shadow-2xl ${glowColor}`}>
                            
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-current" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-current" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-current" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-current" />

                            <span className="text-sm font-bold mb-4 opacity-80">
                                Target Found
                            </span>
                            
                            {/* Stop Number */}
                            <h1 className="text-[12rem] font-black leading-none tracking-tighter drop-shadow-lg">
                                {stopNumber}
                            </h1>
                            
                            {/* Address */}
                            <div className="absolute bottom-8 px-6 w-full text-center">
                                <div className="bg-surface p-4 border border-border/50 shadow-lg rounded-md">
                                    <span className="text-xl md:text-2xl font-bold text-foreground block truncate">
                                        {prediction?.stop?.address_line1}
                                    </span>
                                </div>
                            </div>

                            {/* Saved Stamp */}
                            {status === 'saved' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]"
                                >
                                    <div className="border-4 border-success text-success px-8 py-4 -rotate-12 rounded-xl text-4xl font-black shadow-xl bg-surface">
                                        LOADED
                                    </div>
                                </motion.div>
                            )}
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
                        <h2 className="text-4xl font-bold text-warning">No Match</h2>
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