// fuzzyMatch.ts
// Fast, robust fuzzy matching for stops/packages
import Fuse from 'fuse.js';
import { type Stop } from '../../db';
import { type MatchResult } from './VoiceLoadMachine';

export function createFuzzyMatcher(stops: Stop[]) {
  const fuse = new Fuse(stops, {
    keys: [
      { name: 'address_line1', weight: 0.6 },
      { name: 'notes', weight: 0.3 },
      { name: 'full_address', weight: 0.1 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  return function match(transcript: string): MatchResult[] {
    if (!transcript.trim()) return [];
    const results = fuse.search(transcript.trim());
    return results.slice(0, 3).map(({ item, score }) => ({
      stopId: item.id,
      address: item.address_line1,
      confidence: 1 - (score ?? 1),
      notes: item.notes ? [item.notes] : [],
      combinedNotes: item.notes ? [item.notes] : [],
      extractedDetails: { size: 'small', notes: [], priority: false },
    }));
  };
}
