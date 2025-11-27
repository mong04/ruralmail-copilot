// VoiceLoadHUD.tsx
// Main UI for magical, hands-free package loading
import React, { useReducer, useRef } from 'react';
import { voiceLoadReducer } from './VoiceLoadMachine';
import type { VoiceLoadState } from './VoiceLoadMachine';
import { useVoiceEngine } from './useVoiceEngine';
import { useAppSelector, useAppDispatch } from '../../store';
import { addPackage, incrementLoadCount, removeLastPackage } from '../package-management/store/packageSlice';
import { createFuzzyMatcher } from './fuzzyMatch';
import type { Stop, Package } from '../../db';
import { VoiceSessionAnalytics } from './VoiceSessionAnalytics';

const initial: VoiceLoadState = { mode: 'booting' };

export const VoiceLoadHUD: React.FC = () => {
  const [state, dispatch] = useReducer(voiceLoadReducer, initial);
  const interimRef = useRef('');
  const route = useAppSelector((s) => s.route.route as Stop[]);
  const dispatchRedux = useAppDispatch();
  const fuzzyMatch = React.useMemo(() => createFuzzyMatcher(route), [route]);
  const analyticsRef = React.useRef(new VoiceSessionAnalytics());
  // For debugging: show last matches/confidence
  type MatchCandidate = {
    stopId: string;
    address: string;
    confidence: number;
    notes?: string[];
  };
  const [debugMatches, setDebugMatches] = React.useState<MatchCandidate[]>([]);
  const [debugTranscript, setDebugTranscript] = React.useState<string>('');

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

  // Log every state/action for analytics
  React.useEffect(() => {
    if (state.mode === 'processing' && 'transcript' in state) {
      analyticsRef.current.log('transcript', { transcript: state.transcript });
    }
    if (state.mode === 'confirming' && 'match' in state) {
      analyticsRef.current.log('match', { match: state.match });
    }
    if (state.mode === 'success' && 'match' in state) {
      analyticsRef.current.log('confirm', { match: state.match });
    }
    if (state.mode === 'error' && 'error' in state) {
      analyticsRef.current.log('error', { error: state.error });
    }
  }, [state]);

  // Advanced voice command parsing
  React.useEffect(() => {
    if (state.mode === 'processing' && 'transcript' in state) {
      const t = state.transcript.trim().toLowerCase();
      if (/^(undo|delete last|remove last|oops|revert)$/.test(t)) {
        dispatchRedux(removeLastPackage());
        speak('Last package removed.');
        playTone('error');
        dispatch({ type: 'BOOT' });
        return;
      }
      if (/^(help|what can i say|options|commands)$/.test(t)) {
        speak('You can say an address, say undo to remove the last package, say summary for a session summary, or say repeat to hear the last address.');
        // TODO: Show contextual help overlay
        dispatch({ type: 'BOOT' });
        return;
      }
      if (/^(summary|how many|what's loaded|packages loaded)$/.test(t)) {
        const summary = analyticsRef.current.getSummary();
        speak(`You have loaded ${summary.loaded} packages. ${summary.failed} failed. Average confidence ${Math.round(summary.avgConfidence * 100)} percent.`);
        // Optionally show a magical summary overlay here
        dispatch({ type: 'BOOT' });
        return;
      }
      if (/^(repeat|say again|last address)$/.test(t)) {
        // TODO: Store last confirmed address for repeat
        speak('Repeating last address.');
        dispatch({ type: 'BOOT' });
        return;
      }
      // Replace the fake match effect with real fuzzy matching
      const matches = fuzzyMatch(state.transcript);
      setDebugMatches(matches);
      setDebugTranscript(state.transcript);
      if (matches.length === 0) {
        speak('No address match found. Please try again or say help.');
        playTone('error');
        dispatch({ type: 'ERROR', error: 'No address match found.' });
        return;
      }
      // If top match is strong and next best is much lower, auto-confirm
      if (matches[0].confidence > 0.85 && (matches.length === 1 || (matches[0].confidence - matches[1].confidence > 0.10))) {
        dispatch({ type: 'MATCH', match: matches[0], confidence: matches[0].confidence });
        return;
      }
      // If top two matches are both high/confidence is close, show candidates
      if (matches.length > 1 && matches[1].confidence > 0.7 && (matches[0].confidence - matches[1].confidence <= 0.10)) {
        speak('Multiple matches found. Please say the number or clarify.');
        playTone('alert');
        dispatch({ type: 'CANDIDATES', candidates: matches });
        return;
      }
      // Otherwise, treat as a single match if top is high enough
      if (matches[0].confidence > 0.8) {
        dispatch({ type: 'MATCH', match: matches[0], confidence: matches[0].confidence });
        return;
      }
      // Otherwise, error
      speak('No address match found. Please try again or say help.');
      playTone('error');
      dispatch({ type: 'ERROR', error: 'No address match found.' });
    }
  }, [state, fuzzyMatch, speak, playTone, dispatchRedux, route.length]);

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

  // On confirm, add package to manifest
  React.useEffect(() => {
    if (state.mode === 'success' && 'match' in state) {
      const stop = route.find((s) => s.id === state.match.stopId);
      if (stop) {
        const pkg: Package = {
          id: crypto.randomUUID(),
          size: 'medium',
          notes: state.match.notes?.join(', ') || '',
          assignedStopId: stop.id,
          assignedStopNumber: route.findIndex((s) => s.id === stop.id) + 1,
          assignedAddress: stop.full_address || stop.address_line1,
        };
        dispatchRedux(addPackage(pkg));
        dispatchRedux(incrementLoadCount());
        // TODO: Add magical feedback for success
      }
    }
  }, [state, route, dispatchRedux]);

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
        {state.mode === 'suggesting' && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="rounded-full border-4 border-brand p-10 mb-4 animate-pulse">
              <span className="text-5xl">🤔</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-brand">Multiple Matches</h2>
              <p className="text-lg text-muted-foreground">Please say the number or clarify:</p>
              <ul className="mt-4 space-y-2">
                {state.candidates.map((c, i) => (
                  <li key={c.stopId} className="bg-muted rounded px-4 py-2 flex items-center justify-between">
                    <span className="font-mono">{i + 1}. {c.address}</span>
                    <span className="text-xs text-brand">{Math.round(c.confidence * 100)}%</span>
                  </li>
                ))}
              </ul>
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
      {/* Debug output for devs */}
      <div className="fixed bottom-2 left-2 bg-black bg-opacity-80 text-green-300 text-xs p-2 rounded max-w-xs z-50" style={{pointerEvents:'none'}}>
        <div>Transcript: {debugTranscript}</div>
        <div>Matches: {debugMatches.map((m,i) => `${i+1}: ${m.address} (${Math.round(m.confidence*100)}%)`).join(' | ')}</div>
      </div>
    </div>
  );
};
