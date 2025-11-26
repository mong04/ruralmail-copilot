// src/features/package-management/utils/RouteBrain.ts
import Fuse from 'fuse.js';
import { type Stop, type Package } from '../../../db';
import { get, set } from 'idb-keyval';

const BRAIN_STORAGE_KEY = 'route-brain-aliases';

export interface Prediction {
  stop: Stop | null;
  candidates: Stop[]; // For "Did you mean?" suggestions
  confidence: number; // 0 to 1
  source: 'exact' | 'alias' | 'fuzzy' | 'stop_number' | 'none';
  originalTranscript: string;
  // NEW: Extracted Metadata
  extracted: {
    size: Package['size'];
    notes: string[];
    priority: boolean;
  };
}

export class RouteBrain {
  private stops: Stop[] = [];
  private aliases: Record<string, string> = {}; 
  private fuse: Fuse<Stop> | null = null;

  constructor(stops: Stop[]) {
    this.stops = stops;
    this.init();
  }

  private async init() {
    // 1. Initialize Fuse with Weights
    this.fuse = new Fuse(this.stops, {
      keys: [
        { name: 'full_address', weight: 0.6 },
        { name: 'address_line1', weight: 0.8 }, // Higher weight on street address
        { name: 'notes', weight: 0.2 },
        { name: 'city', weight: 0.1 }
      ],
      includeScore: true,
      threshold: 0.45, // Stricter threshold to reduce garbage matches
      ignoreLocation: true,
    });

    // 2. Load Memory
    try {
      const saved = await get(BRAIN_STORAGE_KEY);
      if (saved) this.aliases = saved;
    } catch (e) {
      console.error("Failed to load brain aliases", e);
    }
  }

  /**
   * PARSER: Breaks down "123 Main St Large Fragile" into parts
   */
  private extractEntities(text: string) {
    let cleanText = text.toLowerCase();
    const extracted = {
      size: 'medium' as Package['size'],
      notes: [] as string[],
      priority: false
    };

    // 1. Size Keywords
    if (/\b(large|big|heavy|huge|oversize)\b/.test(cleanText)) {
      extracted.size = 'large';
      cleanText = cleanText.replace(/\b(large|big|heavy|huge|oversize)\b/g, '');
    } else if (/\b(small|tiny|letter|spur)\b/.test(cleanText)) {
      extracted.size = 'small';
      cleanText = cleanText.replace(/\b(small|tiny|letter|spur)\b/g, '');
    }

    // 2. Priority/Notes Keywords
    if (/\b(fragile|glass|careful)\b/.test(cleanText)) {
      extracted.notes.push('Fragile');
      cleanText = cleanText.replace(/\b(fragile|glass|careful)\b/g, '');
    }
    if (/\b(priority|rush|express)\b/.test(cleanText)) {
      extracted.priority = true;
      extracted.notes.push('Priority');
      cleanText = cleanText.replace(/\b(priority|rush|express)\b/g, '');
    }

    return {
      cleanSearchQuery: cleanText.trim(),
      extracted
    };
  }

  /**
   * PREDICTOR: The main AI logic
   */
  public predict(transcript: string): Prediction {
    const { cleanSearchQuery, extracted } = this.extractEntities(transcript);

    // Default Result
    const result: Prediction = {
      stop: null,
      candidates: [],
      confidence: 0,
      source: 'none',
      originalTranscript: transcript,
      extracted
    };

    if (!cleanSearchQuery) return result;

    // A. Check for "Stop Number" command (e.g., "Stop 45")
    const stopNumMatch = cleanSearchQuery.match(/stop\s+(\d+)/);
    if (stopNumMatch) {
      const index = parseInt(stopNumMatch[1]) - 1; // Convert to 0-index
      if (this.stops[index]) {
        result.stop = this.stops[index];
        result.confidence = 1.0;
        result.source = 'stop_number';
        return result;
      }
    }

    // B. Check Learned Aliases (The "Brain")
    if (this.aliases[cleanSearchQuery]) {
      const stopId = this.aliases[cleanSearchQuery];
      const found = this.stops.find(s => s.id === stopId);
      if (found) {
        result.stop = found;
        result.confidence = 1.0;
        result.source = 'alias';
        return result;
      }
    }

    // C. Fuse.js Fuzzy Search
    if (this.fuse) {
      const fusings = this.fuse.search(cleanSearchQuery);
      
      if (fusings.length > 0) {
        // Top match
        const best = fusings[0];
        const score = best.score ?? 1;
        
        result.stop = best.item;
        result.confidence = 1 - score; // Invert score (0 is perfect in Fuse)
        result.source = 'fuzzy';

        // Add Candidates (for the "Did you mean?" UI)
        result.candidates = fusings
          .slice(0, 3) // Top 3
          .map(f => f.item);
      }
    }

    return result;
  }

  /**
   * TRAINER: Maps a phrase to a Stop ID permanently
   */
  public async learn(transcript: string, correctStopId: string) {
    const { cleanSearchQuery } = this.extractEntities(transcript);
    
    // Only learn if it's a specific address phrase, not a generic "stop 5"
    if (cleanSearchQuery.length > 3) {
      this.aliases[cleanSearchQuery] = correctStopId;
      await set(BRAIN_STORAGE_KEY, this.aliases);
      console.log(`[Brain] Learned: "${cleanSearchQuery}" -> ${correctStopId}`);
    }
  }
}