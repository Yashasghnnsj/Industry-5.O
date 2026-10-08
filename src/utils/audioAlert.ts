/**
 * Industrial Web Audio API Sound Synthesizer for Ergonomic Alerts & Hazard Boundary Alarms
 */
class ErgonomicAudioAlerts {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastAlertTime: number = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * High-priority Hazard Breach Alarm (Dual-tone rapid warble)
   */
  public triggerHazardBreachAlarm() {
    if (this.isMuted) return;
    const now = Date.now();
    // Throttle alert so it doesn't overlap painfully
    if (now - this.lastAlertTime < 800) return;
    this.lastAlertTime = now;

    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.15);
      osc.frequency.setValueAtTime(880, t + 0.16);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.3);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {
      // Audio failed gracefully
    }
  }

  /**
   * Posture Strain Warning (Gentle 2-pulse warning chime)
   */
  public triggerPostureWarning() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastAlertTime < 2500) return;
    this.lastAlertTime = now;

    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(783.99, t + 0.12); // G5

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {
      // Audio failed gracefully
    }
  }
}

export const soundEngine = new ErgonomicAudioAlerts();
