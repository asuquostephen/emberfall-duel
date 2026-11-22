// audio.js — every sound is synthesized with Web Audio: no audio files,
// no network. A tiny synth: tones, noise bursts and little arpeggios.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        return true;
      } catch (e) {
        return false;
      }
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
    },
    // One oscillator note: freq (Hz), dur (s), type, volume, slide-to freq.
    tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
      if (this.muted || !this.ensure()) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    // A short filtered-noise burst: card flips, thuds, shuffles.
    noise(dur, vol = 0.2, freq = 1200, delay = 0) {
      if (this.muted || !this.ensure()) return;
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    },
    // Named game sounds.
    click() { this.tone(660, 0.06, 'triangle', 0.12); },
    flip() { this.noise(0.09, 0.18, 2400); this.tone(520, 0.05, 'triangle', 0.08, 760); },
    deal() { this.noise(0.07, 0.14, 1800); this.tone(440, 0.05, 'triangle', 0.07, 580, 0.05); },
    playCard() { this.noise(0.1, 0.22, 900); this.tone(220, 0.09, 'triangle', 0.16, 160); },
    winTrick() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.14, null, i * 0.07));
    },
    loseTrick() {
      this.tone(330, 0.16, 'sine', 0.14, 262);
      this.tone(220, 0.2, 'sine', 0.1, 196, 0.08);
    },
    damage() { this.tone(140, 0.22, 'sawtooth', 0.16, 70); this.noise(0.15, 0.2, 300); },
    heal() {
      [880, 1108, 1318].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.08, null, i * 0.06));
    },
    blaze() {
      [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'square', 0.07, null, i * 0.05));
      this.noise(0.4, 0.1, 3200);
    },
    nightWin() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.12, null, i * 0.09));
    },
    victory() {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) =>
        this.tone(f, 0.28, 'triangle', 0.15, null, i * 0.13));
      this.noise(0.6, 0.06, 4000, 0.2);
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, null, i * 0.16));
    },
  };
  return audio;
}
