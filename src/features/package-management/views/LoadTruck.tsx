import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, Activity, PackagePlus, AlertTriangle, 
  CheckCircle2, AlertCircle, XCircle, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { type AppDispatch, type RootState } from '../../../store';
import { 
  addPackage, 
  startLoadingSession, 
  endLoadingSession, 
  incrementLoadCount,
  removeLastPackage
} from '../store/packageSlice';

import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { type Package, type Stop } from '../../../db';
import { Button } from '../../../components/ui/Button';

type UIMode = 'booting' | 'listening' | 'processing' | 'speaking' | 'confirming' | 'suggestion' | 'saved' | 'paused' | 'error';

const getSizeColor = (size: string) => {
  if (size === 'large') return 'text-warning border-warning bg-warning/10';
  if (size === 'small') return 'text-brand border-brand bg-brand/10';
  return 'text-muted-foreground border-border bg-surface-muted';
};

export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const route = useSelector((state: RootState) => state.route.route);
  const loadingSession = useSelector((state: RootState) => state.packages.loadingSession) ?? { isActive: false, count: 0 };
  
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  const { transcript, isListening, voiceError, reset, stop, start } = useVoiceInput();
  const { speak, playTone } = useSound();

  const [mode, setMode] = useState<UIMode>('booting');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  // --- CORE STATE MACHINE & SEQUENCER ---

  const speakAndThen = useCallback((text: string, onComplete: () => void) => {
    setMode('speaking');
    stop(); // Explicitly stop mic before speaking
    speak(text, onComplete);
  }, [speak, stop]);

  const listen = useCallback(() => {
    setMode('listening');
    reset();
    start();
  }, [reset, start]);
  
  // --- ON-MOUNT ---
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      dispatch(startLoadingSession());
      // Start the whole process
      speakAndThen('Loading mode activated. Speak the address.', listen);
    }
     return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
      dispatch(endLoadingSession());
      stop(); // Final stop on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- HANDLERS ---
  const commitPackage = useCallback((stopItem: Stop, extracted: Prediction['extracted']) => {
    const stopNum = route.findIndex(r => r.id === stopItem.id) + 1;
    const newPkg: Package = {
      id: crypto.randomUUID(),
      tracking: '',
      size: extracted.size, 
      notes: extracted.notes.join(', ') || 'Voice Load',
      assignedStopId: stopItem.id,
      assignedStopNumber: stopNum,
      assignedAddress: stopItem.full_address || ''
    };
    dispatch(addPackage(newPkg));
    dispatch(incrementLoadCount());
    
    setMode('saved');
    playTone('success');
    setHistory(prev => [`#${stopNum} - ${stopItem.address_line1 || ''}`, ...prev.slice(0, 4)]);
    
    // Announce success and then restart listening
    setTimeout(() => {
      speakAndThen(`Package added to stop ${stopNum}.`, listen);
    }, 1200);

  }, [route, dispatch, playTone, speakAndThen, listen]);

  const handleInterrupt = useCallback(() => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setPrediction(null);
    playTone('error');
    speakAndThen('Cancelled. Ready for next address.', listen);
  }, [playTone, speakAndThen, listen]);

  // --- PRIMARY EFFECT: PROCESS TRANSCRIPT ---
  useEffect(() => {
    if (!transcript || isListening) {
      return;
    }
    
    const clean = transcript.toLowerCase().trim();
    if (!clean) return;

    // --- Voice Commands (Global) ---
    if (clean.match(/^(pause|stop listening)$/)) {
      stop();
      setMode('paused');
      speakAndThen('Paused. Say resume to continue.', () => setMode('paused'));
      return;
    }
    if (mode === 'paused' && clean.match(/^(resume|start listening)$/)) {
      speakAndThen('Resumed.', listen);
      return;
    }
    if (clean.match(/^(undo|delete last|oops)$/)) {
      if (history.length > 0) {
        dispatch(removeLastPackage());
        setHistory(prev => prev.slice(1));
        playTone('error');
        speakAndThen('Last package undone.', listen);
      } else {
        speakAndThen('Nothing to undo.', listen);
      }
      return;
    }
    if (clean.match(/^(end session|finish loading|done)$/)) {
      speakAndThen(`Session complete. Loaded ${loadingSession.count} packages.`, () => navigate('/dashboard'));
      return;
    }
    if (clean.match(/^(no|wrong|cancel)$/)) {
      handleInterrupt();
      return;
    }
    
    // --- Context-Specific Commands & Prediction ---
    if (mode === 'listening' || mode === 'suggestion' || mode === 'confirming') {
      // Confirmation commands
      if (prediction && (mode === 'suggestion' || mode === 'confirming')) {
        if (clean.match(/^(yes|confirm|correct|ok|okay)$/)) {
          if (prediction.stop) commitPackage(prediction.stop, prediction.extracted);
          return;
        }
        if (mode === 'suggestion' && clean.match(/^(option (one|two|three)|first|second|third|[123])$/)) {
          const idx = parseInt(clean.match(/one|1/) ? '1' : clean.match(/two|2/) ? '2' : '3') - 1;
          if (prediction.candidates[idx]) {
            const selectedStop = prediction.candidates[idx];
            if (prediction.source === 'fuzzy') brain.learn(prediction.originalTranscript, selectedStop.id);
            commitPackage(selectedStop, prediction.extracted);
          }
          return;
        }
      }

      // --- Prediction ---
      setMode('processing');
      const pred = brain.predict(transcript);
      setPrediction(pred);

      if (pred.stop && pred.confidence > 0.85) {
        setMode('confirming');
        playTone('lock');
        speakAndThen(`Found ${pred.stop.address_line1}. Confirm?`, () => {
          countdownRef.current = setTimeout(() => {
            if(pred.stop) commitPackage(pred.stop, pred.extracted);
          }, 4000); 
          listen(); 
        });

      } else if (pred.candidates.length > 0 && pred.confidence > 0.4) {
        setMode('suggestion');
        let suggestionText = 'Did you mean: ';
        pred.candidates.slice(0, 3).forEach((cand, idx) => {
          suggestionText += `Option ${idx + 1}: ${cand.address_line1}. `;
        });
        playTone('alert');
        speakAndThen(suggestionText, listen);
      
      } else {
        playTone('error');
        speakAndThen('No match found. Please repeat the address.', listen);
      }
    }
  }, [
    transcript, isListening, mode, brain, listen, speakAndThen, commitPackage, playTone, prediction, 
    handleInterrupt, history.length, dispatch, loadingSession.count, navigate, stop
  ]);

  // Effect to handle voice API errors
  useEffect(() => {
    if (voiceError && !voiceError.includes('aborted')) {
      toast.error(voiceError);
      setMode('error');
    }
  }, [voiceError]);
  
  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 w-full border-b border-border bg-surface/90 backdrop-blur flex items-center px-4 gap-4 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold uppercase tracking-widest">Load Truck</h1>
          <p className="text-xs text-muted-foreground">Voice Mode Active</p>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Activity size={16} className={loadingSession.isActive ? 'text-success animate-pulse' : ''} />
          <span className="text-sm font-bold">{loadingSession.count} Pkgs</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {(mode === 'listening' || mode === 'paused' || mode === 'booting') && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="relative mb-8">
                <div className={`absolute inset-0 rounded-full opacity-20 ${mode === 'listening' && isListening ? 'animate-ping bg-brand' : ''}`}></div>
                <div className="relative p-10 rounded-full border-4 border-brand bg-surface shadow-2xl"> <Mic size={80} className="text-brand" /> </div>
                {mode === 'paused' && ( <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full"> <X size={60} className="text-muted-foreground" /> </div> )}
              </div>
              <h2 className="text-4xl font-bold text-brand uppercase">{mode === 'paused' ? 'Paused' : 'Listening...'}</h2>
            </motion.div>
          )}
          
          {mode === 'error' && (
             <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
              <div className="p-10 border-4 border-danger rounded-full bg-danger/10 animate-pulse mb-8"> <AlertTriangle size={80} className="text-danger" /> </div>
              <h2 className="text-4xl font-bold text-danger uppercase">Voice Error</h2>
              <p className="mt-4 text-muted-foreground font-mono max-w-md">{voiceError}</p>
              <Button onClick={() => speakAndThen('Retrying.', listen)} className="mt-6">Retry</Button>
            </motion.div>
          )}

          {(mode === 'confirming' || mode === 'processing') && prediction?.stop && (
            <motion.div key="confirming" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
              <div className="relative bg-surface border-4 border-brand rounded-xl shadow-2xl overflow-hidden p-6 text-center animate-pulse">
                <span className="text-sm font-bold uppercase tracking-widest text-brand mb-2 block">MATCH FOUND</span>
                <h3 className="text-3xl font-black text-foreground mb-4">{prediction.stop.address_line1}</h3>
                <div className="flex justify-center gap-4 mb-6">
                  <span className={`px-4 py-2 rounded-full font-bold text-sm ${getSizeColor(prediction.extracted.size)}`}> {prediction.extracted.size.toUpperCase()} </span>
                </div>
                <Button variant="ghost" onClick={handleInterrupt} className="text-danger mx-auto"> <XCircle size={20} className="mr-2" /> Cancel </Button>
              </div>
            </motion.div>
          )}

          {mode === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="p-10 border-4 border-success rounded-full bg-success/10 mb-8"> <CheckCircle2 size={80} className="text-success" /> </div>
              <h2 className="text-4xl font-bold text-success uppercase">Package Added</h2>
            </motion.div>
          )}

          {mode === 'suggestion' && prediction && (
            <motion.div key="suggestion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col gap-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-warning uppercase">Did you mean...?</h2>
                <p className="text-muted-foreground text-xs">Say "Option [number]" or "Cancel"</p>
              </div>
              {prediction.candidates.slice(0, 3).map((cand, idx) => (
                <Button key={cand.id} variant="surface" onClick={() => { if (prediction) commitPackage(cand, prediction.extracted) }} className="h-auto py-4 px-6 flex items-center justify-between border-border hover:border-brand group text-left transition-all">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest block text-brand"> Option {idx + 1} </span>
                    <span className="text-lg font-bold text-foreground group-hover:text-brand transition-colors"> {cand.address_line1} </span>
                  </div>
                  <div className="text-xl font-black text-muted-foreground/30 group-hover:text-brand"> #{route.findIndex(r => r.id === cand.id) + 1} </div>
                </Button>
              ))}
              <Button variant="ghost" onClick={handleInterrupt} className="mt-4 text-muted-foreground hover:text-danger"> <AlertCircle size={16} className="mr-2" /> Cancel </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">Live Transcript</p>
          <p className="text-2xl font-mono font-bold text-foreground wrap-break-word leading-tight px-4">
            {transcript || <span className="opacity-20">{mode === 'speaking' ? '...' : 'Speak now...'}</span>}
          </p>
        </div>
      </main>

      <footer className="flex-none h-16 w-full border-t border-border bg-surface/90 backdrop-blur flex items-center px-4 z-20">
        <div className="shrink-0 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mr-4"> Log </div>
        <div className="flex-1 flex gap-2 overflow-hidden">
          <AnimatePresence initial={false}>
            {history.map((item) => (
              <motion.div key={item} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="shrink-0 px-3 py-1 bg-surface-muted rounded border border-border flex items-center gap-2">
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