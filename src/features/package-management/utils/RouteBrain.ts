// src/features/package-management/utils/RouteBrain.ts

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
    priority: boolean; // e.g. "priority"
  };
}

/**
 * The RouteBrain is responsible for interpreting voice commands to predict a stop.
 */
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
        { name: 'address_line1', weight: 0.6 },
        { name: 'notes', weight: 0.3 },
        { name: 'full_address', weight: 0.1 },
      ],
      includeScore: true,
      threshold: 0.3, // Slightly looser for natural speech
      ignoreLocation: true,
      useExtendedSearch: true,
    });

    const saved = await get(BRAIN_STORAGE_KEY);
    if (saved) this.aliases = saved;
  }

  private textToDigits(text: string): string {
    const map: { [key: string]: string } = { 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10' };
    return text.split(' ').map(word => map[word] || word).join(' ');
  }

  private normalizeQuery(text: string): string {
    let clean = text.toLowerCase().replace(/\b(the|to|at|on|for|package|please|add)\b/g, '');
    clean = this.textToDigits(clean);
    return clean.replace(/[^\w\s]/g, '').trim();
  }

  private extractEntities(text: string) {
    let cleanText = text.toLowerCase();
    const extracted = {
      size: 'medium' as Package['size'],
      notes: [] as string[],
      priority: false,
    };

    if (/\b(large|big|heavy)\b/.test(cleanText)) {
      extracted.size = 'large';
    } else if (/\b(small|tiny|letter|spur|spr)\b/.test(cleanText)) {
      extracted.size = 'small';
    }

    if (/\b(priority|rush)\b/.test(cleanText)) {
      extracted.priority = true;
      extracted.notes.push('Priority');
    }
    if (/\b(fragile)\b/.test(cleanText)) {
      extracted.notes.push('Fragile');
    }

    // Remove entity words from the search query
    cleanText = cleanText.replace(/\b(large|big|heavy|small|tiny|letter|spur|spr|priority|rush|fragile)\b/g, '');

    return { cleanSearchQuery: this.normalizeQuery(cleanText), extracted };
  }

  public predict(transcript: string): Prediction {
    const { cleanSearchQuery, extracted } = this.extractEntities(transcript);

    const result: Prediction = {
      stop: null,
      candidates: [],
      confidence: 0,
      source: 'none',
      originalTranscript: transcript,
      extracted,
    };

    if (!cleanSearchQuery) return result;

    // 1. Stop Number (e.g., "stop 52")
    const stopNumMatch = cleanSearchQuery.match(/stop\s?(\d+)/);
    if (stopNumMatch) {
      const index = parseInt(stopNumMatch[1], 10) - 1;
      if (this.stops[index]) {
        result.stop = this.stops[index];
        result.confidence = 1.0;
        result.source = 'stop_number';
        return result;
      }
    }

    // 2. Alias Match (learned phrases)
    if (this.aliases[cleanSearchQuery]) {
      const found = this.stops.find(s => s.id === this.aliases[cleanSearchQuery]);
      if (found) {
        result.stop = found;
        result.confidence = 1.0;
        result.source = 'alias';
        return result;
      }
    }

    // 3. Fuzzy Search
    if (this.fuse) {
      const fusings = this.fuse.search(cleanSearchQuery);
      if (fusings.length > 0) {
        const top = fusings[0];
        result.confidence = 1 - (top.score ?? 1);
        result.candidates = fusings.slice(0, 3).map(f => f.item);
        if (result.confidence > 0.6) {
          result.stop = top.item;
          result.source = 'fuzzy';
        }
      }
    }

    return result;
  }

  public async learn(transcript: string, correctStopId: string) {
    const { cleanSearchQuery } = this.extractEntities(transcript);
    if (cleanSearchQuery.length > 2) {
      this.aliases[cleanSearchQuery] = correctStopId;
      await set(BRAIN_STORAGE_KEY, this.aliases);
    }
  }
}