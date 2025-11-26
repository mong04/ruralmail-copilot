import Fuse from 'fuse.js';
import { type Stop, type Package } from '../../../db';
import { get, set } from 'idb-keyval';

const BRAIN_STORAGE_KEY = 'route-brain-aliases';

export interface Prediction {
  stop: Stop | null;
  // NEW: Multiple candidates for the "Did you mean?" feature
  candidates: Stop[]; 
  confidence: number; 
  source: 'exact' | 'alias' | 'fuzzy' | 'stop_number' | 'none';
  originalTranscript: string;
  // NEW: Metadata extracted from voice (e.g. "Large", "Priority")
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
    this.fuse = new Fuse(this.stops, {
      keys: [
        { name: 'full_address', weight: 0.6 },
        { name: 'address_line1', weight: 0.8 }, 
        { name: 'notes', weight: 0.2 },
        { name: 'city', weight: 0.1 }
      ],
      includeScore: true,
      threshold: 0.45, 
      ignoreLocation: true,
    });

    try {
      const saved = await get(BRAIN_STORAGE_KEY);
      if (saved) this.aliases = saved;
    } catch (e) {
      console.error("Failed to load brain aliases", e);
    }
  }

  // --- NEW: Natural Language Processor ---
  private extractEntities(text: string) {
    let cleanText = text.toLowerCase();
    const extracted = {
      size: 'medium' as Package['size'],
      notes: [] as string[],
      priority: false
    };

    // 1. Size Extraction
    if (/\b(large|big|heavy|huge|oversize|box)\b/.test(cleanText)) {
      extracted.size = 'large';
      cleanText = cleanText.replace(/\b(large|big|heavy|huge|oversize|box)\b/g, '');
    } else if (/\b(small|tiny|letter|spur)\b/.test(cleanText)) {
      extracted.size = 'small';
      cleanText = cleanText.replace(/\b(small|tiny|letter|spur)\b/g, '');
    }

    // 2. Priority/Notes Extraction
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

  public predict(transcript: string): Prediction {
    // 1. Pre-process (NLP)
    const { cleanSearchQuery, extracted } = this.extractEntities(transcript);

    const result: Prediction = {
      stop: null,
      candidates: [],
      confidence: 0,
      source: 'none',
      originalTranscript: transcript,
      extracted
    };

    if (!cleanSearchQuery) return result;

    // A. "Stop X" Command
    const stopNumMatch = cleanSearchQuery.match(/stop\s+(\d+)/);
    if (stopNumMatch) {
      const index = parseInt(stopNumMatch[1]) - 1; 
      if (this.stops[index]) {
        result.stop = this.stops[index];
        result.confidence = 1.0;
        result.source = 'stop_number';
        return result;
      }
    }

    // B. Learned Aliases
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

    // C. Fuzzy Search
    if (this.fuse) {
      const fusings = this.fuse.search(cleanSearchQuery);
      
      if (fusings.length > 0) {
        const best = fusings[0];
        result.stop = best.item;
        result.confidence = 1 - (best.score ?? 1); 
        result.source = 'fuzzy';
        // Populate candidates for ambiguity resolution
        result.candidates = fusings.slice(0, 3).map(f => f.item);
      }
    }

    return result;
  }

  public async learn(transcript: string, correctStopId: string) {
    const { cleanSearchQuery } = this.extractEntities(transcript);
    if (cleanSearchQuery.length > 3) {
      this.aliases[cleanSearchQuery] = correctStopId;
      await set(BRAIN_STORAGE_KEY, this.aliases);
    }
  }
}