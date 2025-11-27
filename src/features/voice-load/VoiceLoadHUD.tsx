// VoiceLoadHUD.tsx
// Main UI for magical, hands-free package loading
import React, { useReducer, useRef } from 'react';
import { voiceLoadReducer } from './VoiceLoadMachine';
import type { VoiceLoadState, MatchResult } from './VoiceLoadMachine';
import { useVoiceEngine } from './useVoiceEngine';

const initial: VoiceLoadState = { mode: 'booting' };

export const VoiceLoadHUD: React.FC = () => {
  const [state, dispatch] = useReducer(voiceLoadReducer, initial);
  const interimRef = useRef('');

  // Voice engine integration
  const { start, stop, speak, playTone } = useVoiceEngine({
    onTranscript: (final, interim) => {
      if (final) {
        dispatch({ type: 'TRANSCRIPT', transcript: final, interim });
        interimRef.current = '';
      } else {
        interimRef.current = interim;
      }
    },
    onError: (err) => dispatch({ type: 'ERROR', error: err }),
    onStart: () => playTone('start'),
    onEnd: () => {},
  });

  // Boot/start listening on mount
  React.useEffect(() => {
    if (state.mode === 'booting') {
      dispatch({ type: 'BOOT' });
      start();
    }
    if (state.mode === 'paused') stop();
    if (state.mode === 'listening') start();
    // eslint-disable-next-line
  }, [state.mode]);

  // Demo: fake match for every transcript
  React.useEffect(() => {
    if (state.mode === 'processing') {
      // TODO: Replace with real fuzzy match logic
      // Type guard for processing state
      if ('transcript' in state) {
        const fake: MatchResult = {
          stopId: '123',
          address: state.transcript,
          confidence: 0.95,
        };
        dispatch({ type: 'MATCH', match: fake, confidence: fake.confidence });
      }
    }
  }, [state]);

  // Confirm on high confidence
  React.useEffect(() => {
    if (state.mode === 'confirming' && state.confidence > 0.88) {
      speak(`Locked: ${state.match.address}. Say yes to confirm.`);
      setTimeout(() => dispatch({ type: 'CONFIRM' }), 3000);
    }
    if (state.mode === 'success') {
      playTone('success');
      setTimeout(() => dispatch({ type: 'RESET' }), 1500);
    }
  }, [state, speak, playTone]);

  // Render HUD
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md mx-auto p-6 flex flex-col gap-8 items-center">
        {state.mode === 'listening' && (
          <>
            <div className="rounded-full border-4 border-brand p-10 mb-4 animate-pulse">
              <span className="text-5xl">🎤</span>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black uppercase tracking-widest text-brand">Listening</h2>
              <p className="text-lg text-muted-foreground mt-2 font-mono">{interimRef.current || 'Say an address...'}</p>
            </div>
          </>
        )}
        {state.mode === 'processing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin text-brand text-4xl">⏳</div>
            <div className="text-lg font-mono">Processing...</div>
          </div>
        )}
        {state.mode === 'confirming' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full border-4 border-success p-10 mb-4">
              <span className="text-5xl">✅</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-success">Match Found</h2>
              <p className="text-lg font-mono">{state.match.address}</p>
              <p className="text-sm text-brand">{Math.round(state.confidence * 100)}% confidence</p>
            </div>
          </div>
        )}
        {state.mode === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full border-4 border-success p-10 mb-4 animate-bounce">
              <span className="text-5xl">📦</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-success">Loaded!</h2>
            </div>
          </div>
        )}
        {state.mode === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full border-4 border-danger p-10 mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-danger">Error</h2>
              <p className="text-lg font-mono">{state.error}</p>
            </div>
          </div>
        )}
      </div>
      {/* ARIA live regions for accessibility */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.mode === 'listening' && (interimRef.current || 'Say an address...')}
        {state.mode === 'error' && state.error}
      </div>
    </div>
  );
};
