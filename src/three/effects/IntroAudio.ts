const SFX_SETTING_KEY = 'apulab.settings.sfx';

export class IntroAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private driveOsc?: OscillatorNode;
  private driveGain?: GainNode;

  unlock(): void {
    if (!this.isEnabled()) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.52;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  startDriveHum(): void {
    if (!this.isEnabled()) return;
    this.unlock();
    if (!this.ctx || !this.master || this.driveOsc) return;
    this.driveOsc = this.ctx.createOscillator();
    this.driveGain = this.ctx.createGain();
    this.driveOsc.type = 'sawtooth';
    this.driveOsc.frequency.value = 82;
    this.driveGain.gain.value = 0.001;
    this.driveOsc.connect(this.driveGain);
    this.driveGain.connect(this.master);
    this.driveOsc.start();
  }

  setDriveHum(level: number, frequency: number): void {
    if (!this.isEnabled()) {
      this.stopDriveHum();
      return;
    }
    if (!this.ctx || !this.driveOsc || !this.driveGain) return;
    this.driveGain.gain.setTargetAtTime(Math.max(0.001, level), this.ctx.currentTime, 0.06);
    this.driveOsc.frequency.setTargetAtTime(Math.max(20, frequency), this.ctx.currentTime, 0.07);
  }

  stopDriveHum(): void {
    if (!this.ctx || !this.driveOsc || !this.driveGain) return;
    const now = this.ctx.currentTime;
    this.driveGain.gain.setTargetAtTime(0.001, now, 0.04);
    try { this.driveOsc.stop(now + 0.18); } catch { /* already stopped */ }
    this.driveOsc = undefined;
    this.driveGain = undefined;
  }

  beep(high = false): void { this.tone(high ? 940 : 720, high ? 1180 : 860, 0.10, 'sine', 0.11); }
  clank(): void { this.tone(330, 170, 0.18, 'triangle', 0.12); this.tone(510, 230, 0.13, 'square', 0.035, 0.012); this.noise(0.075, 0.09); }
  clink(): void { this.tone(860, 560, 0.09, 'triangle', 0.055); this.tone(1210, 890, 0.07, 'sine', 0.03, 0.015); }
  pff(): void { this.noise(0.18, 0.075); }
  whoosh(): void { this.noise(0.48, 0.11, 2800, 240); this.tone(180, 86, 0.42, 'sine', 0.05); }
  boom(): void { this.tone(82, 30, 0.42, 'sine', 0.30); this.tone(150, 55, 0.24, 'triangle', 0.14); this.noise(0.34, 0.18, 1200, 80); this.tone(240, 120, 0.18, 'square', 0.045, 0.02); this.tone(390, 180, 0.12, 'triangle', 0.032, 0.035); this.tone(52, 28, 0.55, 'sine', 0.12, 0.03); }
  telemetry(): void { this.tone(540, 860, 0.12, 'sine', 0.055); this.tone(760, 1060, 0.10, 'sine', 0.045, 0.15); this.tone(940, 1280, 0.09, 'sine', 0.035, 0.30); }
  transition(): void { this.tone(420, 620, 0.46, 'sine', 0.06); this.tone(620, 920, 0.46, 'triangle', 0.045, 0.04); }
  success(): void { this.tone(520, 720, 0.18, 'sine', 0.06); this.tone(660, 920, 0.20, 'sine', 0.05, 0.10); this.tone(820, 1180, 0.28, 'triangle', 0.045, 0.20); }

  private isEnabled(): boolean {
    try {
      return window.localStorage.getItem(SFX_SETTING_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  private tone(startHz: number, endHz: number, duration: number, type: OscillatorType, gainValue: number, delay = 0): void {
    if (!this.isEnabled()) return;
    this.unlock();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, gainValue: number, startCutoff = 1800, endCutoff = 260): void {
    if (!this.isEnabled()) return;
    this.unlock();
    if (!this.ctx || !this.master) return;
    const sampleCount = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    filter.frequency.setValueAtTime(startCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, endCutoff), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }
}
