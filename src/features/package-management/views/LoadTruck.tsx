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
  
  // Redux State
  const route = useSelector((state: RootState) => state.route.route);
  const loadingSession = useSelector((state: RootState) => state.packages.loadingSession) ?? { 
    isActive: false, count: 0 
  };

  // --- BRAIN ---
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  // --- HOOKS ---
  const { transcript, isListening, voiceError, reset, stop, start } = useVoiceInput(true); 
  const debouncedTranscript = useDebounce(transcript, 350); // Slightly faster debounce
  const { speak, playTone } = useSound();

  // --- LOCAL STATE ---
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  const [status, setStatus] = useState<'listening' | 'suggestion' | 'locked' | 'saved' | 'unknown' | 'paused'>('listening');
  const [history, setHistory] = useState<string[]>([]); 
  const [lastProcessed, setLastProcessed] = useState<string>('');

  // --- REFS ---
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ignoreAudioUntil = useRef<number>(Date.now()); // Echo cancellation

  // --- EFFECTS ---

  const robustSpeakAndRestart = useCallback((text: string) => {
    setIsSpeaking(true);
    stop();
    reset();

    let hasRecovered = false;
    const recover = (source: 'finish' | 'timeout' | 'interrupt') => {
      if (hasRecovered) return;
      hasRecovered = true;
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      setIsSpeaking(false);
      ignoreAudioUntil.current = Date.now() + 500; // Shorter echo cooldown
      
      // Only restart if not intentionally paused or interrupted
      if (source !== 'interrupt' && status !== 'paused') {
        playTone('start');
        setTimeout(() => start(), 150); // Stability buffer
      }
    };

    speakTimerRef.current = setTimeout(() => recover('timeout'), 4000);
    speak(text, () => recover('finish'));

  }, [stop, reset, playTone, start, speak, status]);

  // --- HELPERS ---

  const commitPackage = useCallback((stopItem: Stop, extracted: Prediction['extracted']) => {
    if (isSpeaking) return; // Prevent double commit

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
    
    playTone('success');
    robustSpeakAndRestart(`Package added to stop ${stopNum}. Next package?`);
    setStatus('saved');
    setHistory(prev => [`#${stopNum} - ${stopItem.address_line1 || ''}`, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setStatus('listening');
      setPrediction(null);
      setLastProcessed(''); 
      reset(); 
    }, 1500);
  }, [route, dispatch, playTone, robustSpeakAndRestart, isSpeaking, reset]);

  const handleSelectSuggestion = useCallback((selectedStop: Stop) => {
    if (!prediction) { return; }
    // Learn alias if fuzzy
    if (prediction.source === 'fuzzy') {
      brain.learn(prediction.originalTranscript, selectedStop.id);
    }
    commitPackage(selectedStop, prediction.extracted);
  }, [prediction, brain, commitPackage]);

  const handleInterrupt = useCallback(() => {
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setLastProcessed('');
    setPrediction(null);
    setStatus('listening');
    reset();
    playTone('error');
    robustSpeakAndRestart('Cancelled. Ready for next address.');
  }, [reset, playTone, robustSpeakAndRestart]);

  const handleVoiceCommands = useCallback((clean: string): boolean => {
    if (clean.match(/^(pause|stop listening)$/)) {
      stop();
      setStatus('paused');
      robustSpeakAndRestart('Paused. Say resume to continue.');
      return true;
    }
    if (clean.match(/^(resume|start listening)$/)) {
      start();
      setStatus('listening');
      robustSpeakAndRestart('Resumed. Speak the address.');
      return true;
    }
    if (clean.match(/^(undo|delete last|oops)$/)) {
      if (history.length > 0) {
        dispatch(removeLastPackage());
        setHistory(prev => prev.slice(1));
        robustSpeakAndRestart('Last package undone.');
        playTone('error');
      } else {
        robustSpeakAndRestart('Nothing to undo.');
      }
      return true;
    }
    if (clean.match(/^(end session|finish loading|done)$/)) {
      dispatch(endLoadingSession());
      robustSpeakAndRestart(`Session complete. Loaded ${loadingSession.count} packages.`);
      setTimeout(() => navigate('/dashboard'), 2000);
      return true;
    }
    if (status === 'suggestion' && clean.match(/^(option (one|two|three)|first|second|third|[123])$/)) {
      const idx = parseInt(clean.match(/one|1/) ? '1' : clean.match(/two|2/) ? '2' : '3') - 1;
      if (prediction?.candidates[idx]) {
        handleSelectSuggestion(prediction.candidates[idx]);
        return true;
      }
    }
    if (clean.match(/^(no|wrong|cancel)$/)) {
      handleInterrupt();
      return true;
    }
    return false;
  }, [stop, start, robustSpeakAndRestart, status, prediction, history.length, dispatch, playTone, loadingSession.count, navigate, handleSelectSuggestion, handleInterrupt]);

  const suggestOptions = useCallback((candidates: Stop[]) => {
    let suggestionText = 'Did you mean: ';
    candidates.slice(0, 3).forEach((cand, idx) => {
      const stopNum = route.findIndex(r => r.id === cand.id) + 1;
      suggestionText += `Option ${idx + 1}: Stop ${stopNum}, ${cand.address_line1}. `;
    });
    suggestionText += 'Say option one, two, or three.';
    playTone('alert');
    robustSpeakAndRestart(suggestionText);
  }, [route, playTone, robustSpeakAndRestart]);

  // Start session on mount
  useEffect(() => {
    dispatch(startLoadingSession());
    // Wait a moment for the view to transition in before speaking
    setTimeout(() => robustSpeakAndRestart('Loading mode activated. Speak the address.'), 500);
    return () => {
      dispatch(endLoadingSession());
      stop();
    };
  }, [dispatch, stop, robustSpeakAndRestart]);

  // Prediction Loop (on debounced transcript)
  useEffect(() => {
    // Guards
    if (!debouncedTranscript || isSpeaking || Date.now() < ignoreAudioUntil.current || status === 'paused') {
      return;
    }
    if (debouncedTranscript === lastProcessed) return;

    const clean = debouncedTranscript.toLowerCase().trim();

    // Command Handling (highest priority)
    if (handleVoiceCommands(clean)) {
      return;
    }

    setLastProcessed(clean);
    const pred = brain.predict(debouncedTranscript);
    setPrediction(pred);

    if (pred.stop && pred.confidence > 0.85) {
      // High confidence: Auto-commit
      setStatus('locked');
      playTone('lock');
      commitPackage(pred.stop, pred.extracted);
    } else if (pred.candidates.length > 0 && pred.confidence > 0.4) {
      // Medium: Suggest options via TTS
      setStatus('suggestion');
      suggestOptions(pred.candidates);
    } else {
      // Low: No match found
      setStatus('unknown');
      robustSpeakAndRestart('No match found. Please repeat the address.');
      playTone('error');
    }
  }, [debouncedTranscript, isSpeaking, lastProcessed, brain, status, playTone, robustSpeakAndRestart, handleVoiceCommands, commitPackage, suggestOptions]);

  // Safety Timer: Reset if stuck >10s
  useEffect(() => {
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      if (status !== 'listening' && status !== 'paused' && !isSpeaking) {
        handleInterrupt();
        toast.warning('Safety timer reset the interface.');
      }
    }, 10000);
    return () => { if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current); };
  }, [status, isSpeaking, handleInterrupt, robustSpeakAndRestart]);

  // Error Handling
  useEffect(() => {
    if (voiceError) {
      // Don't speak on abort, it's a normal part of the flow
      if (!voiceError.includes('aborted')) {
        robustSpeakAndRestart(`Voice Error: ${voiceError}. Please check mic permissions.`);
      }
      toast.error(voiceError);
    }
  }, [voiceError, robustSpeakAndRestart]);

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

          {/* Listening / Paused Indicator */}
          {(status === 'listening' || status === 'paused') && (
            <motion.div 
              key="listening"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className={`absolute inset-0 rounded-full opacity-20 ${isListening ? 'animate-ping bg-brand' : ''}`}></div>
                <div className="relative p-10 rounded-full border-4 border-brand bg-surface shadow-2xl">
                  <Mic size={80} className="text-brand" />
                </div>
                {status === 'paused' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                    <X size={60} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <h2 className="text-4xl font-bold text-brand uppercase">{status === 'paused' ? 'Paused' : 'Listening...'}</h2>
              <p className="mt-4 text-muted-foreground text-center max-w-md">
                {status === 'paused' ? 'Say "resume" or "start listening" to continue.' : 'Speak the package address. E.g., "123 Main Street, large priority".'}
              </p>
            </motion.div>
          )}

          {/* Locked / High-Confidence Match */}
          {status === 'locked' && prediction?.stop && (
            <motion.div 
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="relative bg-surface border-4 border-brand rounded-xl shadow-2xl overflow-hidden p-6 text-center animate-pulse">
                <span className="text-sm font-bold uppercase tracking-widest text-brand mb-2 block">MATCH FOUND</span>
                <h3 className="text-3xl font-black text-foreground mb-4">{prediction.stop.address_line1}</h3>
                <div className="flex justify-center gap-4 mb-6">
                  <span className={`px-4 py-2 rounded-full font-bold text-sm ${getSizeColor(prediction.extracted.size)}`}>
                    {prediction.extracted.size.toUpperCase()}
                  </span>
                  {prediction.extracted.priority && (
                    <span className="px-4 py-2 rounded-full font-bold text-sm text-danger border-danger bg-danger/10">
                      PRIORITY
                    </span>
                  )}
                </div>
                <Button variant="ghost" onClick={handleInterrupt} className="text-danger mx-auto">
                  <XCircle size={20} className="mr-2" /> Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Saved Confirmation */}
          {status === 'saved' && (
            <motion.div 
              key="saved"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="p-10 border-4 border-success rounded-full bg-success/10 mb-8">
                <CheckCircle2 size={80} className="text-success" />
              </div>
              <h2 className="text-4xl font-bold text-success uppercase">Package Added</h2>
            </motion.div>
          )}

          {/* Suggestions */}
          {status === 'suggestion' && prediction && (
            <motion.div 
              key="suggestion"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md flex flex-col gap-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-warning uppercase">Did you mean...?</h2>
                <p className="text-muted-foreground text-xs">Say "Option one", "two", or "three"</p>
              </div>
              {prediction.candidates.slice(0, 3).map((cand, idx) => (
                <Button 
                  key={cand.id}
                  variant="surface" 
                  onClick={() => handleSelectSuggestion(cand)}
                  className="h-auto py-4 px-6 flex items-center justify-between border-border hover:border-brand group text-left transition-all"
                >
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest block text-brand">
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
                onClick={handleInterrupt}
                className="mt-4 text-muted-foreground hover:text-danger"
              >
                <AlertCircle size={16} className="mr-2" /> Wrong / Retry
              </Button>
            </motion.div>
          )}

          {/* Unknown / No Match */}
          {status === 'unknown' && (
            <motion.div 
              key="unknown"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="p-10 border-4 border-warning rounded-full bg-warning/10 animate-pulse mb-8">
                <AlertTriangle size={80} className="text-warning" />
              </div>
              <h2 className="text-4xl font-bold text-warning uppercase">No Match Found</h2>
              <p className="mt-4 text-muted-foreground font-mono">"{transcript}"</p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Live Transcript Overlay */}
        <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">Live Transcript</p>
          <p className="text-2xl font-mono font-bold text-foreground wrap-break-word leading-tight px-4">
            {transcript || <span className="opacity-20">Speak now...</span>}
          </p>
        </div>
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