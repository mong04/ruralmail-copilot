import Fuse from 'fuse.js';
import { type Stop } from '../../../db';
import { get, set } from 'idb-keyval'; // Lightweight IDB wrapper, or use your existing db/index.ts methods

const BRAIN_STORAGE_KEY = 'route-brain-aliases';

export interface Prediction {
  stop: Stop | null;
  confidence: number; // 0 to 1
  source: 'exact' | 'alias' | 'fuzzy' | 'none';
  originalTranscript: string;
}

export class RouteBrain {
  private stops: Stop[] = [];
  private aliases: Record<string, string> = {}; // "blue house" -> "stop_id_123"
  private fuse: Fuse<Stop> | null = null;

  constructor(stops: Stop[]) {
    this.stops = stops;
    this.init();
  }

  private async init() {
    // 1. Initialize Fuse for fuzzy matching
    this.fuse = new Fuse(this.stops, {
      keys: [
        { name: 'full_address', weight: 0.7 }, // High priority
        { name: 'notes', weight: 0.3 }         // Lower priority
      ],
      includeScore: true,
      threshold: 0.4, // Allow some messiness
    });

    // 2. Load learned aliases from storage
    try {
      const saved = await get(BRAIN_STORAGE_KEY);
      if (saved) this.aliases = saved;
    } catch (e) {
      console.error("Failed to load brain aliases", e);
    }
  }

  /**
   * The Core Logic: Takes a spoken string, finds the best Stop.
   */
  public predict(transcript: string): Prediction {
    const cleanText = transcript.toLowerCase().trim();

    // 1. Check Learned Aliases first (Fastest/Most Accurate)
    if (this.aliases[cleanText]) {
      const stopId = this.aliases[cleanText];
      const stop = this.stops.find(s => s.id === stopId);
      if (stop) {
        return { stop, confidence: 1.0, source: 'alias', originalTranscript: transcript };
      }
    }

    // 2. Run Fuzzy Match
    if (this.fuse) {
      const results = this.fuse.search(cleanText);
      if (results.length > 0) {
        const best = results[0];
        // Fuse score is 0 (perfect) to 1 (bad). Invert it for confidence.
        const confidence = best.score !== undefined ? 1 - best.score : 0;
        
        return {
          stop: best.item,
          confidence,
          source: 'fuzzy',
          originalTranscript: transcript
        };
      }
    }

    return { stop: null, confidence: 0, source: 'none', originalTranscript: transcript };
  }

  /**
   * The Learning Step: User corrects the AI.
   */
  public async learn(transcript: string, correctStopId: string) {
    const cleanText = transcript.toLowerCase().trim();
    
    // Save to memory
    this.aliases[cleanText] = correctStopId;
    
    // Save to disk (persist)
    await set(BRAIN_STORAGE_KEY, this.aliases);
    console.log(`[Brain] Learned that "${cleanText}" means Stop ID: ${correctStopId}`);
  }
}