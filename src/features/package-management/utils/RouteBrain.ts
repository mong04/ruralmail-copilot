import Fuse from 'fuse.js';
import { type Stop, type Package } from '../../../db';
import { get, set } from 'idb-keyval';

const BRAIN_STORAGE_KEY = 'route-brain-aliases';

export interface Prediction {
  stop: Stop | null;
  candidates: Stop[]; 
  confidence: number; 
  source: 'exact' | 'alias' | 'fuzzy' | 'stop_number' | 'none';
  originalTranscript: string;
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
    // 1. Configure Fuse with optimized weights for Delivery
    // We weigh the address number heavily so "123 Main" doesn't match "1234 Main" easily
    this.fuse = new Fuse(this.stops, {
      keys: [
        { name: 'address_line1', weight: 0.9 }, // High weight on address
        { name: 'notes', weight: 0.3 },         // Lower weight on notes (Smith Farm)
        { name: 'full_address', weight: 0.5 },
      ],
      includeScore: true,
      threshold: 0.4, // Stricter threshold to reduce false positives
      ignoreLocation: true,
      useExtendedSearch: true, 
    });

    try {
      const saved = await get(BRAIN_STORAGE_KEY);
      if (saved) this.aliases = saved;
    } catch (e) {
      console.error("Brain load error", e);
    }
  }

  /**
   * Converts "One Hundred Twenty Three" -> "123"
   * Improved to recursively merge split digits ("1 2 3" -> "123").
   */
  private textToDigits(text: string): string {
    const map: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'zero': '0',
      'ten': '10', 'first': '1st', 'second': '2nd', 'third': '3rd'
    };
    
    // 1. Convert words to digits
    let out = text.split(' ').map(word => map[word] || word).join(' ');

    // 2. Recursively collapse spaces between digits
    // "1 2 3" -> "12 3" -> "123"
    while (/(\d)\s+(\d)/.test(out)) {
      out = out.replace(/(\d)\s+(\d)/g, '$1$2');
    }
    
    return out;
  }

  private normalizeQuery(text: string): string {
    let clean = text.toLowerCase();
    
    // 1. Remove polite filler words
    clean = clean.replace(/\b(the|to|at|on|for|package|please|add)\b/g, '');
    
    // 2. Convert text numbers to digits
    clean = this.textToDigits(clean);

    // 3. Remove punctuation
    return clean.replace(/[^\w\s]/g, '').trim();
  }

  private extractEntities(text: string) {
    let cleanText = text.toLowerCase();
    const extracted = {
      size: 'medium' as Package['size'],
      notes: [] as string[],
      priority: false
    };

    // 1. Size Extraction (Expanded Vocabulary)
    if (/\b(large|big|heavy|huge|oversize|box|parcel)\b/.test(cleanText)) {
      extracted.size = 'large';
      cleanText = cleanText.replace(/\b(large|big|heavy|huge|oversize|box|parcel)\b/g, '');
    } else if (/\b(small|tiny|letter|spur|spr|envelop|flat)\b/.test(cleanText)) {
      extracted.size = 'small';
      cleanText = cleanText.replace(/\b(small|tiny|letter|spur|spr|envelop|flat)\b/g, '');
    }

    // 2. Priority Extraction
    if (/\b(priority|rush|express|urgent|next day)\b/.test(cleanText)) {
      extracted.priority = true;
      extracted.notes.push('Priority');
      cleanText = cleanText.replace(/\b(priority|rush|express|urgent|next day)\b/g, '');
    }

    return {
      // Return the cleaned query for searching, but keep extracted metadata separate
      cleanSearchQuery: this.normalizeQuery(cleanText),
      extracted
    };
  }

  public predict(transcript: string): Prediction {
    const { cleanSearchQuery, extracted } = this.extractEntities(transcript);

    const result: Prediction = {
      stop: null,
      candidates: [],
      confidence: 0,
      source: 'none',
      originalTranscript: transcript,
      extracted
    };

    if (!cleanSearchQuery || cleanSearchQuery.length < 2) return result;

    // A. Stop Number (Direct "Stop 5" command)
    const stopNumMatch = cleanSearchQuery.match(/stop\s?(\d+)/);
    if (stopNumMatch) {
      const index = parseInt(stopNumMatch[1]) - 1; 
      if (this.stops[index]) {
        result.stop = this.stops[index];
        result.confidence = 1.0;
        result.source = 'stop_number';
        return result;
      }
    }

    // B. Aliases (Learned Memory)
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
        const topMatch = fusings[0];
        const score = 1 - (topMatch.score ?? 1); // Convert error to confidence (0-1)

        result.candidates = fusings.slice(0, 3).map(f => f.item);

        // Heuristic: If confidence is decent (> 0.4), accept it.
        // We lower the threshold slightly because normalization handles the "heavy lifting"
        if (score > 0.4) {
             result.stop = topMatch.item;
             result.confidence = score;
             result.source = 'fuzzy';
        }
      }
    }

    return result;
  }

  /**
   * The Learning mechanism.
   * Maps the CLEANED query to the Stop ID.
   */
  public async learn(transcript: string, correctStopId: string) {
    const { cleanSearchQuery } = this.extractEntities(transcript);
    
    // Only learn if the query is distinct enough
    if (cleanSearchQuery.length > 2) {
      this.aliases[cleanSearchQuery] = correctStopId;
      await set(BRAIN_STORAGE_KEY, this.aliases);
      console.log(`🧠 Learned: "${cleanSearchQuery}" -> ${correctStopId}`);
    }
  }
}