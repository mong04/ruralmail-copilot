import React, { useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { voiceLoadReducer, type MatchResult } from './VoiceLoadMachine';
import { useVoiceEngine } from './useVoiceEngine';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useAppSelector, useAppDispatch } from '../../store';
import { addPackage, incrementLoadCount, removeLastPackage } from '../package-management/store/packageSlice';
import { RouteBrain } from '../package-management/utils/RouteBrain';
import type { Stop } from '../../db';
import { VoiceSessionAnalytics } from './VoiceSessionAnalytics';
import { NeuralCore } from './components/NeuralCore';
import { toast } from 'sonner';

const initial = { mode: 'booting' } as const;

const UI_TEXT = {
  default: {
    header: "Voice Loading",
    subHeader: "Route 8 • Active",
    live: "LIVE",
    offline: "Ready",
    init: "Start Listening",
    listening: "Listening...",
    awaiting: "Ready...",
    targetLock: "Package Matched",
    undo: "Undo",
    stop: "Stop",
    reconnect: "Resume"
  },
  cyberpunk: {
    header: "VOICE_UPLINK // V2.0",
    subHeader: "ROUTE_ID: 08",
    live: "LIVE",
    offline: "OFFLINE",
    init: "Initialize System",
    listening: "AWAITING INPUT...",
    awaiting: "AWAITING INPUT...",
    targetLock: "TARGET LOCK",
    undo: "UNDO_LAST",
    stop: "STOP_LINK",
    reconnect: "RECONNECT"
  }
};

export const VoiceLoadHUD: React.FC = () => {
  const [state, dispatch] = useReducer(voiceLoadReducer, initial);
  // Get latest route from Redux (Live Source of Truth)
  const route = useAppSelector((s) => s.route.route as Stop[]);
  const theme = useAppSelector((s) => s.settings.theme);
  const richThemingEnabled = useAppSelector((s) => s.settings.richThemingEnabled);
  
  const dispatchRedux = useAppDispatch();
  const analyticsRef = useRef(new VoiceSessionAnalytics());
  const shouldRestart = useRef(false);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  useWakeLock();
  
  // RouteBrain needs to be rebuilt if route changes to ensure IDs are fresh
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  const isCyberpunk = theme === 'cyberpunk' && richThemingEnabled;
  const ui = isCyberpunk ? UI_TEXT.cyberpunk : UI_TEXT.default;
  const variant = isCyberpunk ? 'cyberpunk' : 'professional';
  const isSystemActive = ['listening', 'processing', 'confirming', 'success'].includes(state.mode);

  const triggerGlobalFx = useCallback((type: 'package-delivered' | 'error', rect?: DOMRect) => {
    if (richThemingEnabled) {
      const event = new CustomEvent('ruralmail-fx', {
        detail: { type, rect: rect || { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 } }
      });
      window.dispatchEvent(event);
    }
  }, [richThemingEnabled]);

  const { start, stop, cancelAll, speak, playTone, unlockAudio } = useVoiceEngine({
    onTranscript: (final, interim) => {
      if (final) {
        analyticsRef.current.log('transcript', { transcript: final });
        
        // HIJACK: Check for Stop commands during confirmation
        if (state.mode === 'confirming') {
             const cmd = final.toLowerCase().trim();
             if (/^(stop|no|wrong|wait|cancel)/.test(cmd)) {
                 if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                 playTone('error');
                 speak('Cancelled.');
                 dispatch({ type: 'RESET' });
                 return;
             }
        }
        dispatch({ type: 'TRANSCRIPT', transcript: final, interim: '' });
      }
      else if (interim.length > 0) dispatch({ type: 'TRANSCRIPT', transcript: '', interim });
    },
    onError: (err) => {
      if (!shouldRestart.current) return;
      if (err !== 'no-speech') {
        analyticsRef.current.log('error', { error: err });
        if (typeof err === 'string' && err.includes('aborted')) return; 
        dispatch({ type: 'ERROR', error: typeof err === 'string' ? err : 'Signal Lost' });
      }
    },
    // CRITICAL: This is where we start the timer. 
    // We ONLY count down once the hardware is actually listening.
    onStart: () => {
        if (state.mode === 'confirming') {
            // Check if timer is already running to avoid dupes
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            
            confirmTimerRef.current = setTimeout(() => {
                dispatch({ type: 'CONFIRM' });
            }, 1500);
        }
    },
    onEnd: () => {
       if (shouldRestart.current && (state.mode === 'listening' || state.mode === 'processing')) {
         start();
       }
    },
  });

  const handleSystemStart = () => {
    shouldRestart.current = true;
    start();
    unlockAudio().then(() => {
        playTone('start');
    });
    dispatch({ type: 'BOOT' });
  };

  const handleManualStop = () => {
    shouldRestart.current = false;
    cancelAll(); 
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    dispatch({ type: 'PAUSE' });
  };

  const getShortAddress = (fullAddress: string) => fullAddress.split(',')[0].trim();

  // Processing Loop
  useEffect(() => {
    const process = async () => {
      if (state.mode === 'processing') {
        const t = state.transcript.toLowerCase().trim();
        
        if (/^(undo|delete|revert)/.test(t)) {
          dispatchRedux(removeLastPackage());
          playTone('error');
          speak('Removed.');
          triggerGlobalFx('error');
          analyticsRef.current.log('undo');
          dispatch({ type: 'RESET' });
          return;
        }

        const prediction = brain.predict(state.transcript);
        
        if (prediction.confidence > 0.4 && prediction.stop) {
           playTone('alert');
           const match: MatchResult = {
             stopId: prediction.stop.id,
             address: prediction.stop.full_address || prediction.stop.address_line1,
             confidence: prediction.confidence,
             combinedNotes: [...(prediction.stop.notes ? [prediction.stop.notes] : []), ...prediction.extracted.notes],
             extractedDetails: prediction.extracted
           };
           analyticsRef.current.log('match', { match });
           dispatch({ type: 'MATCH', match });
        } else {
           if (t.length > 4) {
               playTone('error');
               triggerGlobalFx('error');
               speak('No match.');
           }
           analyticsRef.current.log('fail_match', { transcript: state.transcript });
           dispatch({ type: 'ERROR', error: 'UNKNOWN' });
        }
      }
    };
    process();
  }, [state, brain, dispatchRedux, playTone, speak, triggerGlobalFx]); 

  // Confirmation & Success Loop
  useEffect(() => {
    // A. CONFIRMATION
    if (state.mode === 'confirming') {
      const { address, extractedDetails } = state.match;
      const shortAddress = getShortAddress(address);
      const sizeText = extractedDetails.size !== 'medium' ? extractedDetails.size : '';
      const priorityText = extractedDetails.priority ? 'priority' : '';
      const text = `${sizeText} ${priorityText} ${shortAddress}`.trim();
      
      stop(); // Stop listening explicitly

      speak(text, () => {
          // TTS Complete.
          // Restart Mic if we are still live.
          // Note: We do NOT start timer here. Timer starts in onStart() callback.
          if (shouldRestart.current) {
              start();
          }
      });
      
      return () => {
          if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      };
    }
    
    // B. SUCCESS (Add Package)
    if (state.mode === 'success' && 'match' in state) {
      const { match } = state;

      // STRICT DATA LOOKUP
      // 1. Find the exact object in the Live Route that matches the Brain's Stop ID
      const targetStop = route.find(s => s.id === match.stopId);
      
      if (targetStop) {
        // 2. Re-calculate index based on the LIVE route array
        // This ensures if route was shuffled, we get the current valid index
        const currentStopNumber = route.findIndex(s => s.id === targetStop.id) + 1;

        dispatchRedux(addPackage({
          id: crypto.randomUUID(),
          size: match.extractedDetails.size,
          notes: match.combinedNotes.join(', '),
          
          // STRICT ID ASSIGNMENT
          assignedStopId: targetStop.id, 
          
          // Live Index
          assignedStopNumber: currentStopNumber,
          
          // Data Copy
          assignedAddress: targetStop.full_address || targetStop.address_line1,
          delivered: false,
        }));
        
        dispatchRedux(incrementLoadCount());
        playTone('success');
        triggerGlobalFx('package-delivered');
        analyticsRef.current.log('confirm', { address: match.address });
      } else {
         console.error('[CRITICAL] Brain ID mismatch. Stop ID from Brain not found in current Route:', match.stopId);
         toast.error("Error: Matched stop is no longer in the route.");
         playTone('error');
      }

      const resetTimer = setTimeout(() => {
          dispatch({ type: 'RESET' });
      }, 1200);
      
      return () => clearTimeout(resetTimer);
    }
  }, [state, route, dispatchRedux, speak, playTone, triggerGlobalFx, start, stop]);

  // Error Loop
  useEffect(() => {
    if (state.mode === 'error') {
        const t = setTimeout(() => {
            dispatch({ type: 'RESET' });
            if (shouldRestart.current) start();
        }, 1500);
        return () => clearTimeout(t);
    }
  }, [state.mode, start]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm touch-none overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full p-4 border-b border-border bg-surface/80 flex justify-between items-center">
        <h2 className={`text-xl m-0 p-0 mb-0! border-0! ${isCyberpunk ? '' : 'font-sans font-bold normal-case tracking-normal'}`} data-text={ui.header}>
            {ui.header}
        </h2>
        
        <div className="flex gap-2">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">{ui.subHeader}</span>
            <span className={`text-xs font-mono ${state.mode === 'listening' ? 'text-success animate-pulse' : 'text-danger'}`}>
                {state.mode === 'listening' ? ui.live : ui.offline}
            </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg p-6 relative">
        <div className={`w-full flex flex-col items-center py-12 mb-8 relative overflow-hidden transition-all duration-300 ${isCyberpunk ? 'cyber-card border-brand/30 hover:border-brand' : 'bg-surface border border-border rounded-2xl shadow-xl'}`}>
            <NeuralCore mode={state.mode} variant={variant} />
            
            <div className="h-16 mt-6 w-full text-center flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {state.mode === 'booting' && (
                        <motion.button
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={handleSystemStart}
                            className={`px-8 py-4 font-bold tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 ${isCyberpunk ? 'bg-brand text-black clip-path-polygon' : 'bg-brand text-brand-foreground rounded-lg shadow-lg'}`}
                        >
                            {ui.init}
                        </motion.button>
                    )}
                    {state.mode === 'paused' && (
                         <motion.button
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={handleSystemStart}
                            className={`px-8 py-4 font-bold tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 ${isCyberpunk ? 'bg-muted text-brand clip-path-polygon border border-brand' : 'bg-surface text-foreground border border-border rounded-lg shadow-sm'}`}
                        >
                            {ui.reconnect}
                        </motion.button>
                    )}
                    {state.mode === 'listening' && (
                        <motion.p 
                            key="listen"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="text-2xl font-mono text-muted-foreground"
                        >
                            {('interim' in state && state.interim) ? 
                                <span className={`text-foreground ${isCyberpunk ? 'glitch-text' : ''}`}>{state.interim}</span> 
                                : ui.listening
                            }
                        </motion.p>
                    )}
                    {state.mode === 'confirming' && 'match' in state && (
                        <motion.div
                            key="confirm"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                             <div className="text-xs text-brand tracking-[0.2em] mb-1">{ui.targetLock}</div>
                             <div className={`text-xl font-bold text-foreground px-4 py-2 border inline-block ${isCyberpunk ? 'bg-surface/50 border-brand/50' : 'bg-surface border-border rounded'}`}>
                                {getShortAddress(state.match.address)}
                             </div>
                        </motion.div>
                    )}
                    {state.mode === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1.1 }}
                            className="text-center font-bold text-success text-2xl uppercase tracking-widest"
                        >
                            LOADED
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
             <button 
                onClick={() => dispatchRedux(removeLastPackage())}
                className={`py-4 border transition-colors uppercase font-bold tracking-widest text-sm ${isCyberpunk ? 'border-danger/50 text-danger hover:bg-danger hover:text-white' : 'border-border bg-background text-danger hover:bg-danger/10 rounded-lg'}`}
                data-text={ui.undo}
             >
                {ui.undo}
             </button>
             <button 
                onClick={() => isSystemActive ? handleManualStop() : handleSystemStart()}
                className={`py-4 border transition-colors uppercase font-bold tracking-widest text-sm ${isCyberpunk ? (isSystemActive ? 'border-brand text-brand hover:bg-brand hover:text-black' : 'border-muted text-muted') : (isSystemActive ? 'bg-brand text-brand-foreground border-transparent rounded-lg' : 'bg-muted text-muted-foreground border-transparent rounded-lg')}`}
                data-text={isSystemActive ? ui.stop : ui.reconnect}
             >
                {isSystemActive ? ui.stop : ui.reconnect}
             </button>
        </div>
      </div>
    </div>
  );
};