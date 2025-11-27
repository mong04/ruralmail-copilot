// VoiceLoadMachine.ts
// Atomic state machine for futuristic, hands-free package loading
// Designed for extensibility, testability, and magical UX

export type VoiceLoadState =
  | { mode: 'booting' }
  | { mode: 'listening'; transcript: string; interim: string }
  | { mode: 'processing'; transcript: string }
  | { mode: 'confirming'; match: MatchResult; confidence: number }
  | { mode: 'suggesting'; candidates: MatchResult[] }
  | { mode: 'success'; match: MatchResult }
  | { mode: 'error'; error: string }
  | { mode: 'paused' }
  | { mode: 'summary'; stats: SessionStats };

export interface MatchResult {
  stopId: string;
  address: string;
  confidence: number;
  notes?: string[];
}

export interface SessionStats {
  loaded: number;
  failed: number;
  averageConfidence: number;
  undoCount: number;
  startTime: number;
  endTime?: number;
}

export type VoiceLoadEvent =
  | { type: 'BOOT' }
  | { type: 'TRANSCRIPT'; transcript: string; interim: string }
  | { type: 'MATCH'; match: MatchResult; confidence: number }
  | { type: 'CANDIDATES'; candidates: MatchResult[] }
  | { type: 'CONFIRM' }
  | { type: 'UNDO' }
  | { type: 'ERROR'; error: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SUMMARY' }
  | { type: 'RESET' };

export function voiceLoadReducer(state: VoiceLoadState, event: VoiceLoadEvent): VoiceLoadState {
  switch (event.type) {
    case 'BOOT':
      return { mode: 'listening', transcript: '', interim: '' };
    case 'TRANSCRIPT':
      return { mode: 'processing', transcript: event.transcript };
    case 'MATCH':
      if (event.confidence > 0.88) {
        return { mode: 'confirming', match: event.match, confidence: event.confidence };
      }
      return { mode: 'suggesting', candidates: [event.match] };
    case 'CANDIDATES':
      return { mode: 'suggesting', candidates: event.candidates };
    case 'CONFIRM':
      if ('match' in state) {
        return { mode: 'success', match: state.match };
      }
      return state;
    case 'UNDO':
      return { mode: 'listening', transcript: '', interim: '' };
    case 'ERROR':
      return { mode: 'error', error: event.error };
    case 'PAUSE':
      return { mode: 'paused' };
    case 'RESUME':
      return { mode: 'listening', transcript: '', interim: '' };
    case 'SUMMARY':
      // For now, just return previous state (summary logic to be implemented)
      return state;
    case 'RESET':
      return { mode: 'booting' };
    default:
      return state;
  }
}
