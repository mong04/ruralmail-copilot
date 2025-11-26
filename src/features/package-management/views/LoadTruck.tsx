import React, { useEffect, useMemo, useRef, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Activity, AlertTriangle, CheckCircle2, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { type AppDispatch, type RootState } from '../../../store';
import { addPackage, startLoadingSession, endLoadingSession, incrementLoadCount, removeLastPackage } from '../store/packageSlice';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { type Package, type Stop } from '../../../db';
import { Button } from '../../../components/ui/Button';

// --- SESSION TELEMETRY ---
interface SessionTelemetry {
  startTime: number;
  totalTranscripts: number;
  matchedPredictions: number;
  failedMatches: number;
  averageConfidence: number;
  voiceErrors: number;
  undoCount: number;
}

// --- STATE & REDUCER ---
type Mode = 'booting' | 'listening' | 'processing' | 'speaking' | 'confirming' | 'suggestion' | 'saved' | 'paused' | 'error' | 'summary';

interface State {
  mode: Mode;
  prediction: Prediction | null;
  candidates: Stop[];
  history: string[];
  speechRequest: { text: string; onCompleteAction: Action } | null;
  error: string | null;
  confidenceLevel: number; // 0-1 for visual feedback
  telemetry: SessionTelemetry;
}

type Action = 
  | { type: 'BOOT_COMPLETE' }
  | { type: 'START_LISTENING' }
  | { type: 'START_SPEAKING'; text: string; onCompleteAction: Action }
  | { type: 'TRANSCRIPT_FINALIZED' }
  | { type: 'PREDICTION_COMPLETE'; prediction: Prediction }
  | { type: 'SHOW_CANDIDATES'; candidates: Stop[] }
  | { type: 'CONFIRM_PACKAGE' }
  | { type: 'SELECT_CANDIDATE'; index: number }
  | { type: 'ADD_TO_HISTORY'; item: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'INTERRUPT' }
  | { type: 'UNDO' }
  | { type: 'END_SESSION' };

const initialState: State = {
  mode: 'booting',
  prediction: null,
  candidates: [],
  history: [],
  speechRequest: null,
  error: null,
  confidenceLevel: 0,
  telemetry: {
    startTime: Date.now(),
    totalTranscripts: 0,
    matchedPredictions: 0,
    failedMatches: 0,
    averageConfidence: 0,
    voiceErrors: 0,
    undoCount: 0,
  },
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'BOOT_COMPLETE':
      return { ...state, mode: 'speaking', speechRequest: { text: 'Loading mode activated.', onCompleteAction: { type: 'START_LISTENING' } } };
    case 'START_LISTENING':
      return { ...state, mode: 'listening', prediction: null, candidates: [], speechRequest: null };
    case 'START_SPEAKING':
      return { ...state, mode: 'speaking', speechRequest: { text: action.text, onCompleteAction: action.onCompleteAction } };
    case 'TRANSCRIPT_FINALIZED':
      return { ...state, mode: 'processing', telemetry: { ...state.telemetry, totalTranscripts: state.telemetry.totalTranscripts + 1 } };
    case 'PREDICTION_COMPLETE': {
      const conf = action.prediction.confidence;
      const avgConf = (state.telemetry.averageConfidence * state.telemetry.matchedPredictions + conf) / (state.telemetry.matchedPredictions + 1);
      return {
        ...state,
        prediction: action.prediction,
        confidenceLevel: conf,
        telemetry: { ...state.telemetry, averageConfidence: avgConf, matchedPredictions: state.telemetry.matchedPredictions + 1 },
      };
    }
    case 'SHOW_CANDIDATES':
      return { ...state, candidates: action.candidates, mode: 'suggestion' };
    case 'CONFIRM_PACKAGE':
      return { ...state, mode: 'saved' };
    case 'SELECT_CANDIDATE':
      return { ...state, mode: 'confirming' };
    case 'ADD_TO_HISTORY':
      return { ...state, history: [action.item, ...state.history.slice(0, 9)] };
    case 'SET_ERROR':
      return { ...state, mode: 'error', error: action.error, telemetry: { ...state.telemetry, voiceErrors: state.telemetry.voiceErrors + 1 } };
    case 'PAUSE':
      return { ...state, mode: 'paused' };
    case 'RESUME':
      return { ...state, mode: 'listening' };
    case 'INTERRUPT':
      return { ...state, prediction: null, candidates: [] };
    case 'UNDO':
      return { ...state, history: state.history.slice(1), telemetry: { ...state.telemetry, undoCount: state.telemetry.undoCount + 1 } };
    case 'END_SESSION':
      return { ...state, mode: 'summary' };
    default:
      return state;
  }
};

// --- THE COMPONENT ---
export const LoadTruck: React.FC = () => {
  const navigate = useNavigate();
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(reducer, initialState);

  const route = useSelector((s: RootState) => s.route.route);
  const loadingSession = useSelector((s: RootState) => s.packages.loadingSession) ?? { isActive: false, count: 0 };
  
  const brain = useMemo(() => new RouteBrain(route), [route]);
  const { transcript, isListening, voiceError, reset, stop, start } = useVoiceInput();
  const { speak, playTone } = useSound();
  
  const lastTranscript = useRef('');
  const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- EFFECT HOOKS ---

  // 1. Listen for voice errors and escalate gracefully
  useEffect(() => {
    if (voiceError && !voiceError.includes('aborted')) {
      dispatch({ type: 'SET_ERROR', error: voiceError });
      playTone('error');
    }
  }, [voiceError, playTone]);

  // 2. Drive state machine audio/voice actions
  useEffect(() => {
    if (state.mode === 'speaking' && state.speechRequest) {
      stop();
      speak(state.speechRequest.text, () => dispatch(state.speechRequest!.onCompleteAction));
    } else if (state.mode === 'listening') {
      reset();
      start();
    }
  }, [state.mode, state.speechRequest, speak, stop, reset, start]);
  
  // 3. Process transcripts with confidence-aware routing
  useEffect(() => {
    if (!transcript || isListening || transcript === lastTranscript.current) return;
    
    lastTranscript.current = transcript;
    dispatch({ type: 'TRANSCRIPT_FINALIZED' });

    const clean = transcript.toLowerCase().trim();

    // --- Global Voice Commands (always available) ---
    if (clean.match(/^(pause|stop listening|quiet)$/)) {
      dispatch({ type: 'START_SPEAKING', text: 'Paused.', onCompleteAction: { type: 'PAUSE' } });
      playTone('lock');
      return;
    }
    if (state.mode === 'paused' && clean.match(/^(resume|start listening|go|ready)$/)) {
      dispatch({ type: 'START_SPEAKING', text: 'Resumed.', onCompleteAction: { type: 'START_LISTENING' } });
      playTone('start');
      return;
    }
    if (clean.match(/^(no|wrong|cancel|nope)$/)) {
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
      dispatch({ type: 'INTERRUPT' });
      playTone('error');
      dispatch({ type: 'START_SPEAKING', text: 'Cancelled.', onCompleteAction: { type: 'START_LISTENING' } });
      return;
    }
    if (clean.match(/^(undo|delete last|oops|revert)$/)) {
      if (state.history.length > 0) {
        reduxDispatch(removeLastPackage());
        dispatch({ type: 'UNDO' });
        playTone('error');
        dispatch({ type: 'START_SPEAKING', text: 'Last package removed.', onCompleteAction: { type: 'START_LISTENING' } });
      } else {
        dispatch({ type: 'START_SPEAKING', text: 'Nothing to undo.', onCompleteAction: { type: 'START_LISTENING' } });
      }
      return;
    }

    // --- Candidate Selection (when in suggestion mode) ---
    if (state.mode === 'suggestion' && clean.match(/^(option)?\s*([1-3])$/)) {
      const match = clean.match(/([1-3])/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        if (idx < state.candidates.length) {
          const selected = state.candidates[idx];
          dispatch({ type: 'PREDICTION_COMPLETE', prediction: { ...state.prediction!, stop: selected, candidates: [], confidence: 0.75, source: 'fuzzy', originalTranscript: transcript, extracted: { size: 'medium', notes: [], priority: false } } });
          dispatch({ type: 'START_SPEAKING', text: `Confirmed. ${selected.address_line1}`, onCompleteAction: { type: 'CONFIRM_PACKAGE' } });
          playTone('lock');
          return;
        }
      }
    }

    // --- Direct Confirmation ---
    if (clean.match(/^(yes|confirm|correct|ok|okay|accept)$/) && state.prediction?.stop) {
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
      dispatch({ type: 'CONFIRM_PACKAGE' });
      playTone('lock');
      return;
    }

    // --- Primary Prediction Flow ---
    const pred = brain.predict(transcript);
    dispatch({ type: 'PREDICTION_COMPLETE', prediction: pred });

    // High confidence: auto-confirm with voice response
    if (pred.stop && pred.confidence > 0.88) {
      playTone('lock');
      dispatch({ type: 'START_SPEAKING', text: `Locked: ${pred.stop.address_line1}. Say yes to confirm.`, onCompleteAction: { type: 'START_LISTENING' } });
      confirmationTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'CONFIRM_PACKAGE' });
      }, 4000);
    }
    // Medium confidence: show candidates and ask for selection
    else if (pred.candidates.length > 0 && pred.confidence > 0.5) {
      playTone('alert');
      let text = 'Multiple matches. ';
      pred.candidates.slice(0, 3).forEach((c, i) => {
        text += `Option ${i + 1}: ${c.address_line1}. `;
      });
      text += 'Say option and number.';
      dispatch({ type: 'SHOW_CANDIDATES', candidates: pred.candidates });
      dispatch({ type: 'START_SPEAKING', text, onCompleteAction: { type: 'START_LISTENING' } });
    }
    // Low confidence: retry
    else {
      playTone('error');
      dispatch({ type: 'START_SPEAKING', text: 'No match. Try again.', onCompleteAction: { type: 'START_LISTENING' } });
    }

  }, [transcript, isListening, state.mode, state.prediction, state.candidates, state.history.length, brain, playTone, reduxDispatch]);
  
  // 4. Commit package to Redux when saved state is set
  useEffect(() => {
    if (state.mode === 'saved' && state.prediction?.stop) {
      const { stop: stopItem, extracted } = state.prediction;
      const stopNum = route.findIndex(r => r.id === stopItem.id) + 1;
      
      const newPkg: Package = {
        id: crypto.randomUUID(),
        tracking: '',
        size: extracted.size,
        notes: extracted.notes.join(', ') || 'Voice Load',
        assignedStopId: stopItem.id,
        assignedStopNumber: stopNum,
        assignedAddress: stopItem.full_address || '',
      };

      reduxDispatch(addPackage(newPkg));
      reduxDispatch(incrementLoadCount());
      
      const historyItem = `#${stopNum} - ${stopItem.address_line1 || ''}`;
      dispatch({ type: 'ADD_TO_HISTORY', item: historyItem });
      playTone('success');
      
      setTimeout(() => {
        dispatch({ type: 'START_SPEAKING', text: `Stop ${stopNum} locked. Next address.`, onCompleteAction: { type: 'START_LISTENING' } });
      }, 300);
    }
  }, [state.mode, state.prediction, reduxDispatch, route, playTone]);

  // --- ON-MOUNT/UNMOUNT ---
  useEffect(() => {
    reduxDispatch(startLoadingSession());
    dispatch({ type: 'BOOT_COMPLETE' });
    playTone('start');
    return () => {
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
      reduxDispatch(endLoadingSession());
      stop();
    };
  }, [reduxDispatch, stop, playTone]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      {/* HEADER: Session Info & Controls */}
      <header className="flex-none h-16 w-full border-b border-border/40 bg-surface/80 backdrop-blur-sm flex items-center px-4 gap-4 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-surface">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-black uppercase tracking-widest text-brand">Loading Mode</h1>
        </div>
        <div className="flex items-center gap-6 text-foreground">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">LOADED</span>
            <span className="text-2xl font-black tabular-nums">{loadingSession.count}</span>
          </div>
          <Activity size={20} className={loadingSession.isActive ? 'text-brand animate-pulse' : 'text-muted'} />
        </div>
      </header>

      {/* MAIN HUD: Full-screen state machine */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* STATE: Booting / Listening / Paused */}
          {(state.mode === 'listening' || state.mode === 'paused' || state.mode === 'booting') && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
              <div className="relative mb-8">
                {/* Confidence Ring (grows with confidence) */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-brand"
                  animate={{ scale: 1 + state.confidenceLevel * 0.3, opacity: state.confidenceLevel * 0.4 }}
                  transition={{ duration: 0.3 }}
                />
                {/* Listening indicator (pulsing when active) */}
                {state.mode === 'listening' && isListening && (
                  <motion.div className="absolute inset-0 rounded-full bg-brand/10 animate-ping" />
                )}
                {/* Mic Icon Container */}
                <div className="relative p-12 rounded-full border-4 border-brand bg-surface shadow-2xl backdrop-blur-sm">
                  <Mic size={80} className="text-brand" />
                </div>
                {/* Paused Overlay */}
                {state.mode === 'paused' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <X size={60} className="text-muted-foreground" />
                  </motion.div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-4xl font-black text-brand uppercase tracking-widest">
                  {state.mode === 'paused' ? 'PAUSED' : 'LISTENING'}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 font-mono">
                  {state.mode === 'paused' ? 'Say "resume" to continue' : isListening ? 'Mic active...' : 'Awaiting input...'}
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE: Processing / Confirming */}
          {(state.mode === 'processing' || state.mode === 'confirming') && state.prediction?.stop && (
            <motion.div key="confirming" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 w-full max-w-md">
              <div className="relative w-full">
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-brand/0 via-brand/20 to-brand/0 rounded-2xl blur-xl"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="relative bg-surface border-4 border-brand rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-brand to-brand/0"
                    animate={{ scaleX: [0, state.confidenceLevel] }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-brand block mb-3">MATCH FOUND</span>
                  <h3 className="text-2xl font-black text-foreground mb-4">{state.prediction.stop.address_line1}</h3>
                  <div className="flex gap-2 items-center justify-center">
                    <Zap size={16} className="text-brand" />
                    <span className="text-sm font-bold text-brand">{Math.round(state.confidenceLevel * 100)}% confidence</span>
                  </div>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground font-mono">
                Say "yes" or "no" • Or select from alternatives
              </div>
            </motion.div>
          )}

          {/* STATE: Showing Candidates */}
          {state.mode === 'suggestion' && state.candidates.length > 0 && (
            <motion.div key="suggestions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 w-full max-w-2xl px-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted text-center mb-2">MULTIPLE MATCHES</p>
              {state.candidates.slice(0, 3).map((candidate, idx) => (
                <motion.button
                  key={candidate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    const pred: Prediction = {
                      stop: candidate,
                      candidates: [],
                      confidence: 0.75,
                      source: 'fuzzy',
                      originalTranscript: transcript,
                      extracted: { size: 'medium', notes: [], priority: false },
                    };
                    dispatch({ type: 'PREDICTION_COMPLETE', prediction: pred });
                    dispatch({ type: 'CONFIRM_PACKAGE' });
                  }}
                  className="p-4 rounded-lg border-2 border-border hover:border-brand hover:bg-brand/5 transition-all text-left font-semibold"
                >
                  <span className="text-brand font-black">#{idx + 1}</span> {candidate.address_line1}
                </motion.button>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-4 font-mono">Say "option" and number or tap a choice</p>
            </motion.div>
          )}

          {/* STATE: Saved/Success */}
          {state.mode === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <motion.div
                className="p-12 rounded-full border-4 border-success bg-success/10"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
              >
                <CheckCircle2 size={80} className="text-success" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-3xl font-black text-success uppercase">CONFIRMED</h2>
                <p className="text-sm text-muted-foreground mt-2">Loading next address...</p>
              </div>
            </motion.div>
          )}

          {/* STATE: Error */}
          {state.mode === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center">
              <motion.div
                className="p-10 rounded-full border-4 border-danger bg-danger/10"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <AlertTriangle size={80} className="text-danger" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-black text-danger uppercase">ERROR</h2>
                <p className="text-sm text-muted-foreground font-mono mt-3 max-w-sm">{state.error}</p>
              </div>
              <Button
                onClick={() => {
                  dispatch({ type: 'START_SPEAKING', text: 'Retrying', onCompleteAction: { type: 'START_LISTENING' } });
                }}
                size="lg"
                className="mt-4"
              >
                Retry
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Transcript Display (bottom-center) */}
        <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none px-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">TRANSCRIPT</p>
          <motion.p
            className="text-lg font-mono font-bold text-foreground/80 leading-tight wrap-break-word"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={transcript}
          >
            {transcript || <span className="text-muted-foreground/40">Say an address...</span>}
          </motion.p>
        </div>
      </main>

      {/* FOOTER: History Log with Confidence Indicators */}
      <footer className="flex-none h-20 w-full border-t border-border/40 bg-surface/80 backdrop-blur-sm flex items-center px-4 z-20 overflow-hidden">
        <div className="flex items-center gap-3 h-full w-full">
          <div className="shrink-0 text-[9px] font-black text-muted-foreground uppercase tracking-widest">LOG</div>
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
            <AnimatePresence initial={false}>
              {state.history.map((item, idx) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="shrink-0 px-3 py-2 bg-surface-muted/50 rounded-full border border-border/60 flex items-center gap-2"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-success"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                  />
                  <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">{item}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </footer>
    </div>
  );
};
