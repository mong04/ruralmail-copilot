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

const initial = { mode: 'booting' } as const;

export const VoiceLoadHUD: React.FC = () => {
  const [state, dispatch] = useReducer(voiceLoadReducer, initial);
  const route = useAppSelector((s) => s.route.route as Stop[]);
  // Removed unused 'theme' selector
  const dispatchRedux = useAppDispatch();
  const analyticsRef = useRef(new VoiceSessionAnalytics());
  
  useWakeLock();
  
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  const triggerGlobalFx = useCallback((type: 'package-delivered' | 'error', rect?: DOMRect) => {
    const event = new CustomEvent('ruralmail-fx', {
      detail: { type, rect: rect || { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 } }
    });
    window.dispatchEvent(event);
  }, []);

  const { start, stop, speak, playTone, unlockAudio } = useVoiceEngine({
    onTranscript: (final, interim) => {
      if (final) {
        analyticsRef.current.log('transcript', { transcript: final });
        dispatch({ type: 'TRANSCRIPT', transcript: final, interim: '' });
      }
      else if (interim.length > 0) dispatch({ type: 'TRANSCRIPT', transcript: '', interim });
    },
    onError: (err) => {
      if (err !== 'no-speech') {
        analyticsRef.current.log('error', { error: err });
        dispatch({ type: 'ERROR', error: typeof err === 'string' ? err : 'Signal Lost' });
      }
    },
    onStart: () => {},
    onEnd: () => {
       if (state.mode === 'listening' || state.mode === 'processing') start();
    },
  });

  const handleSystemStart = async () => {
    await unlockAudio();
    playTone('start');
    start();
    dispatch({ type: 'BOOT' });
  };

  // Processing Loop
  useEffect(() => {
    const process = async () => {
      // TS Narrowing Fix: Check mode first, then access transcript
      if (state.mode === 'processing') {
        const t = state.transcript.toLowerCase().trim();
        
        if (/^(undo|delete|revert)/.test(t)) {
          dispatchRedux(removeLastPackage());
          playTone('error');
          speak('Unit removed.');
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
           playTone('error');
           triggerGlobalFx('error');
           speak('No target identified.');
           analyticsRef.current.log('fail_match', { transcript: state.transcript });
           dispatch({ type: 'ERROR', error: 'TARGET_UNKNOWN' });
        }
      }
    };
    process();
  }, [state, brain, dispatchRedux, playTone, speak, triggerGlobalFx]); 

  // Confirm & Execute
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.mode === 'confirming') {
      const { address, extractedDetails } = state.match;
      const text = `${extractedDetails.size !== 'medium' ? extractedDetails.size : ''} ${extractedDetails.priority ? 'priority' : ''} for ${address}`;
      speak(text);
      
      timer = setTimeout(() => {
         dispatch({ type: 'CONFIRM' });
      }, 2000);
    }
    
    if (state.mode === 'success' && 'match' in state) {
      const { match } = state;
      dispatchRedux(addPackage({
        id: crypto.randomUUID(),
        size: match.extractedDetails.size,
        notes: match.combinedNotes.join(', '),
        assignedStopId: match.stopId,
        assignedStopNumber: route.findIndex(s => s.id === match.stopId) + 1,
        assignedAddress: match.address,
        delivered: false,
        // Removed 'isPriority'. Priority status is now handled purely via notes/tags in DB.
      }));
      dispatchRedux(incrementLoadCount());
      playTone('success');
      triggerGlobalFx('package-delivered');
      analyticsRef.current.log('confirm', { address: match.address });
      setTimeout(() => dispatch({ type: 'RESET' }), 1200);
    }

    return () => clearTimeout(timer);
  }, [state, route, dispatchRedux, speak, playTone, triggerGlobalFx]);

  // Auto-Reset Error
  useEffect(() => {
    if (state.mode === 'error') {
        const t = setTimeout(() => dispatch({ type: 'RESET' }), 2000);
        return () => clearTimeout(t);
    }
  }, [state.mode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm touch-none overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full p-4 border-b border-border bg-surface/80 flex justify-between items-center">
        <h2 className="text-xl m-0 p-0 mb-0! border-0!" data-text="VOICE_UPLINK">VOICE_UPLINK // V2.0</h2>
        <div className="flex gap-2">
            <span className="text-xs font-mono text-muted-foreground">ROUTE_ID: 08</span>
            <span className={`text-xs font-mono ${state.mode === 'listening' ? 'text-success animate-pulse' : 'text-danger'}`}>
                {state.mode === 'listening' ? 'LIVE' : 'OFFLINE'}
            </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg p-6 relative">
        
        <div className="cyber-card w-full flex flex-col items-center py-12 mb-8 relative overflow-hidden transition-all duration-300 border-brand/30 hover:border-brand">
            <NeuralCore mode={state.mode} />
            
            <div className="h-16 mt-6 w-full text-center flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {state.mode === 'booting' && (
                        <motion.button
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={handleSystemStart}
                            className="bg-brand text-black px-8 py-4 font-bold tracking-widest uppercase clip-path-polygon hover:scale-105 active:scale-95 transition-transform"
                        >
                            Initialize System
                        </motion.button>
                    )}
                    {state.mode === 'listening' && (
                        <motion.p 
                            key="listen"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="text-2xl font-mono text-muted-foreground"
                        >
                            {('interim' in state && state.interim) ? <span className="text-foreground glitch-text">{state.interim}</span> : "AWAITING INPUT..."}
                        </motion.p>
                    )}
                    {state.mode === 'confirming' && 'match' in state && (
                        <motion.div
                            key="confirm"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                             <div className="text-xs text-brand tracking-[0.2em] mb-1">TARGET LOCK</div>
                             <div className="text-xl font-bold text-foreground bg-surface/50 px-4 py-2 border border-brand/50 inline-block">
                                {state.match.address}
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
             <button 
                onClick={() => dispatchRedux(removeLastPackage())}
                className="py-4 border border-danger/50 text-danger hover:bg-danger hover:text-white transition-colors uppercase font-bold tracking-widest text-sm"
                data-text="UNDO_LAST"
             >
                UNDO_LAST
             </button>
             <button 
                onClick={() => state.mode === 'listening' ? stop() : handleSystemStart()}
                className={`py-4 border transition-colors uppercase font-bold tracking-widest text-sm ${state.mode === 'listening' ? 'border-brand text-brand hover:bg-brand hover:text-black' : 'border-muted text-muted'}`}
                data-text={state.mode === 'listening' ? "STOP_LINK" : "RECONNECT"}
             >
                {state.mode === 'listening' ? "STOP_LINK" : "RECONNECT"}
             </button>
        </div>
      </div>
    </div>
  );
};