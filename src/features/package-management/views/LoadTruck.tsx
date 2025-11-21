import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Store & Slice
import { type AppDispatch, type RootState } from '../../../store';
import { 
  addPackage, 
  startLoadingSession, 
  endLoadingSession, 
  incrementLoadCount 
} from '../store/packageSlice';

// Hooks & Utils
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { type Package } from '../../../db';
import { Button } from '../../../components/ui/Button';
// import { cn } from '../../../lib/utils';

export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const route = useSelector((state: RootState) => state.route.route);
  const { loadingSession } = useSelector((state: RootState) => state.packages);

  // --- Engines ---
  const brain = useMemo(() => new RouteBrain(route), [route]);
  const { transcript, isProcessing, reset, stop } = useVoiceInput(true);
  const { speak, playTone } = useSound();

  // --- Local State ---
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<'idle' | 'matched' | 'unknown' | 'saved'>('idle');
  const [history, setHistory] = useState<string[]>([]); 
  
  // --- Refs ---
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioDelayRef = useRef<NodeJS.Timeout | null>(null);

  // --- Handlers ---

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
          reset();
      }, 500);
  }, [dispatch, playTone, reset, route]);

  const handleMatch = useCallback((result: Prediction) => {
    if (!result.stop) return;
    
    setStatus('matched');
    stop(); 

    audioDelayRef.current = setTimeout(() => {
        const stopSeq = route.findIndex(r => r.id === result.stop?.id) + 1;
        const phrase = `${result.stop?.address_line1}... Stop ${stopSeq}`;
        
        speak(phrase, () => {
            safetyTimerRef.current = setTimeout(() => {
                savePackage(result);
            }, 1500); 
        });

    }, 400); 
  }, [route, speak, stop, savePackage]);

  const handleUnknown = useCallback(() => {
      setStatus('unknown');
      playTone('error');
      
      setTimeout(() => {
          setStatus('idle');
          setPrediction(null);
          reset();
      }, 2500);
  }, [playTone, reset]);

  const handleCancel = useCallback(() => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (audioDelayRef.current) clearTimeout(audioDelayRef.current);
      window.speechSynthesis.cancel();
      
      setStatus('idle');
      setPrediction(null);
      playTone('error');
      reset();
  }, [playTone, reset]);

  const handleFinishLoad = useCallback(() => {
      dispatch(endLoadingSession());
      playTone('success');
      speak(`Loading complete. ${loadingSession.count} packages loaded.`);
      navigate('/packages'); 
  }, [dispatch, loadingSession.count, navigate, playTone, speak]);

  // --- Effects ---

  useEffect(() => {
    if (!loadingSession.isActive) {
        dispatch(startLoadingSession());
        playTone('start');
        speak("Ready to load.");
    }
  }, [dispatch, loadingSession.isActive, playTone, speak]);

  useEffect(() => {
    if (isProcessing && transcript) {
      const cleanText = transcript.toLowerCase().trim();

      if (['finish load', 'done', 'stop load', 'complete'].includes(cleanText)) {
          handleFinishLoad();
          return;
      }
      if (['cancel', 'wrong', 'no', 'stop'].includes(cleanText)) {
          handleCancel();
          return;
      }

      const result = brain.predict(transcript);
      setPrediction(result);

      if (!result.stop || result.confidence < 0.4) {
          handleUnknown();
      } else {
          handleMatch(result);
      }
    }
  }, [isProcessing, transcript, brain, handleFinishLoad, handleCancel, handleUnknown, handleMatch]);

  // --- Render Helpers ---
  const stopNumber = prediction?.stop 
    ? route.findIndex(r => r.id === prediction?.stop?.id) + 1 
    : '?';

  // Theme Colors (Cyberpunk Palette)
  const neonColor = 
    status === 'matched' || status === 'saved' ? 'text-cyan-400' :
    status === 'unknown' ? 'text-amber-500' :
    'text-zinc-500';
  
  const borderColor = 
    status === 'matched' || status === 'saved' ? 'border-cyan-500/50' :
    status === 'unknown' ? 'border-amber-500/50' :
    'border-zinc-800';

  return (
    // 1. LOCK VIEWPORT: fixed inset-0 prevents ALL scrolling. h-[100dvh] handles mobile bars.
    <div className="fixed inset-0 h-dvh bg-zinc-950 text-white flex flex-col font-mono overflow-hidden selection:bg-cyan-500/30">
        
        {/* Background Grid (Subtle Industrial Texture) */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />

        {/* TOP BAR: Technical Header */}
        <header className="flex-none flex justify-between items-center p-4 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-sm">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-cyan-400 hover:bg-cyan-950/30">
                <ArrowLeft className="mr-2 w-4 h-4" /> EXIT_MODE
            </Button>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Session_Load</span>
                    <span className="text-xl font-bold text-cyan-400 tabular-nums leading-none">
                        {loadingSession.count.toString().padStart(3, '0')}
                    </span>
                </div>
                <Activity className="w-5 h-5 text-zinc-600 animate-pulse" />
            </div>
        </header>

        {/* MAIN HUD AREA: Flex-1 takes all available space. No Scroll. */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-5xl mx-auto p-4">
            
            <AnimatePresence mode='wait'>
                
                {/* --- IDLE STATE --- */}
                {status === 'idle' && (
                    <motion.div 
                        key="idle"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-8 w-full"
                    >
                        {/* Breathing Mic Ring */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping duration-3000" />
                            <div className="relative bg-zinc-900 border-2 border-cyan-500/30 text-cyan-400 p-12 rounded-full shadow-[0_0_40px_rgba(34,211,238,0.15)]">
                                <Mic size={64} strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl md:text-4xl font-bold text-zinc-100 tracking-tight">SYSTEM READY</h2>
                            <p className="text-zinc-500 text-sm md:text-base uppercase tracking-widest">Awaiting Input...</p>
                        </div>
                    </motion.div>
                )}

                {/* --- MATCHED / SAVED STATE --- */}
                {(status === 'matched' || status === 'saved') && (
                    <motion.div 
                        key="matched"
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="flex flex-col items-center justify-center w-full h-full"
                    >
                        <div className="relative w-full max-w-2xl aspect-square md:aspect-video flex flex-col items-center justify-center border-x border-white/5 bg-white/2">
                            
                            {/* Corner Brackets (The Cyberpunk Feel) */}
                            <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${borderColor}`} />
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${borderColor}`} />
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${borderColor}`} />
                            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${borderColor}`} />

                            <span className={`mb-4 text-sm font-bold uppercase tracking-[0.3em] ${neonColor}`}>
                                Stop_Sequence
                            </span>
                            
                            {/* THE BIG NUMBER: Responsive Clamping */}
                            <h1 
                                className={`font-black leading-none tracking-tighter ${neonColor} drop-shadow-[0_0_20px_rgba(34,211,238,0.25)]`}
                                style={{ fontSize: 'clamp(8rem, 30vw, 16rem)' }} 
                            >
                                {stopNumber}
                            </h1>
                            
                            {/* Address Subtext */}
                            <div className="mt-8 px-6 py-3 bg-black/40 border border-white/10 rounded flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${status === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                <span className="text-lg md:text-2xl text-zinc-200 truncate max-w-[80vw]">
                                    {prediction?.stop?.address_line1}
                                </span>
                            </div>

                            {/* Saved Confirmation */}
                            {status === 'saved' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className="absolute bottom-8 flex items-center gap-2 text-emerald-400 font-bold text-lg uppercase tracking-widest"
                                >
                                    <CheckCircle2 size={24} /> Confirmed
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- UNKNOWN STATE --- */}
                {status === 'unknown' && (
                    <motion.div 
                        key="unknown"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center w-full"
                    >
                        <div className="relative p-10 border-2 border-amber-500/50 rounded-full bg-amber-500/5 animate-pulse">
                            <AlertTriangle size={80} className="text-amber-500" />
                        </div>
                        <h2 className="mt-8 text-4xl font-bold text-amber-500 uppercase tracking-widest">No Match</h2>
                        <p className="mt-2 text-zinc-400 font-mono">"{transcript}"</p>
                    </motion.div>
                )}

            </AnimatePresence>
        </main>

        {/* BOTTOM BAR: History Stream */}
        <footer className="flex-none h-20 w-full border-t border-white/10 bg-zinc-950/80 backdrop-blur flex items-center px-4 z-20">
            <div className="shrink-0 text-[10px] text-zinc-600 font-bold uppercase tracking-widest rotate-180 py-2 px-1 border-r border-white/5 mr-4" style={{ writingMode: 'vertical-rl' }}>
                Log_Stream
            </div>
            <div className="flex-1 flex gap-3 overflow-x-auto no-scrollbar mask-linear-fade">
                {history.map((item, i) => (
                    <div key={i} className="shrink-0 px-3 py-2 bg-white/5 rounded border border-white/5 flex items-center gap-3 min-w-[140px]">
                        <span className="text-xs font-bold text-cyan-600">0{i+1}</span>
                        <span className="text-sm font-medium text-zinc-300 truncate">{item}</span>
                    </div>
                ))}
            </div>
        </footer>
    </div>
  );
};