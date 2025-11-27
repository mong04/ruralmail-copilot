// VoiceLoadMachine.ts
// Atomic state machine for futuristic, hands-free package loading

export type PackageDetails = {
  size: 'small' | 'medium' | 'large';
  notes: string[];
  priority: boolean;
};

export interface MatchResult {
  stopId: string;
  address: string;
  confidence: number;
  // Merged existing notes from DB + new notes from voice command
  combinedNotes: string[]; 
  extractedDetails: PackageDetails;
}

export type VoiceLoadState =
  | { mode: 'booting' }
  | { mode: 'listening'; transcript: string; interim: string }
  | { mode: 'processing'; transcript: string }
  | { mode: 'confirming'; match: MatchResult } // Removed redundant confidence (it's in match)
  | { mode: 'suggesting'; candidates: MatchResult[] }
  | { mode: 'success'; match: MatchResult }
  | { mode: 'error'; error: string }
  | { mode: 'paused' }
  | { mode: 'summary' }; // Stats handled by Analytics ref, not needed in state machine for rendering

export type VoiceLoadEvent =
  | { type: 'BOOT' }
  | { type: 'TRANSCRIPT'; transcript: string; interim: string }
  | { type: 'MATCH'; match: MatchResult }
  | { type: 'CANDIDATES'; candidates: MatchResult[] }
  | { type: 'CONFIRM' }
  | { type: 'UNDO' }
  | { type: 'ERROR'; error: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' };

export function voiceLoadReducer(state: VoiceLoadState, event: VoiceLoadEvent): VoiceLoadState {
  switch (event.type) {
    case 'BOOT':
      return { mode: 'listening', transcript: '', interim: '' };
    case 'TRANSCRIPT':
      return { mode: 'processing', transcript: event.transcript };
    case 'MATCH':
      // Confidence thresholding happens in the UI logic before dispatching MATCH vs CANDIDATES
      return { mode: 'confirming', match: event.match };
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
    case 'RESET':
      return { mode: 'listening', transcript: '', interim: '' }; // Skip boot, go straight to listen
    default:
      return state;
  }
}