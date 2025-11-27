// VoiceSessionAnalytics.ts
// Analytics and session summary for voice load sessions
export interface VoiceSessionEvent {
  type: string;
  timestamp: number;
  details?: any;
}

export class VoiceSessionAnalytics {
  private events: VoiceSessionEvent[] = [];
  private startTime: number = Date.now();
  private endTime?: number;

  log(type: string, details?: any) {
    this.events.push({ type, timestamp: Date.now(), details });
  }

  end() {
    this.endTime = Date.now();
  }

  getSummary() {
    const loaded = this.events.filter(e => e.type === 'confirm').length;
    const failed = this.events.filter(e => e.type === 'error').length;
    const undo = this.events.filter(e => e.type === 'undo').length;
    const avgConfidence = (
      this.events.filter(e => e.type === 'match').reduce((sum, e) => sum + (e.details?.confidence ?? 0), 0) /
      (this.events.filter(e => e.type === 'match').length || 1)
    );
    return {
      loaded,
      failed,
      undo,
      avgConfidence,
      duration: (this.endTime || Date.now()) - this.startTime,
    };
  }

  export() {
    return JSON.stringify({
      events: this.events,
      summary: this.getSummary(),
      started: this.startTime,
      ended: this.endTime || Date.now(),
    }, null, 2);
  }
}
