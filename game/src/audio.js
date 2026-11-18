// SOLMARA — Streets of the Sun. audio.js
// All sound is synthesized with WebAudio — no audio files, no network. The
// engine hum follows the car's speed, police sirens wail while wanted, and a
// tiny step sequencer plays a laid-back bassline + lead over the game.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
    // A minor-key bassline that loops every 16 steps (8th notes at 112 BPM).
    this.bassNotes = [55, 0, 55, 65.41, 55, 0, 49, 55, 55, 0, 55, 65.41, 82.41, 0, 73.42, 65.41];
    this.leadNotes = [220, 0, 261.63, 0, 329.63, 0, 261.63, 0, 220, 0, 196, 0, 246.94, 0, 293.66, 0];
  }

  // Must be called from a user gesture at least once (browser autoplay rule).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      // Headless or blocked audio: the game plays on silently.
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    // Engine hum: a low sawtooth whose pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();

    // Siren: two alternating tones driven by an LFO.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.type = 'square';
    this.sirenLfo.frequency.value = 0.8;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 220;
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  _tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shoot() {
    this._noise(0.14, 0.5, 1800);
    this._tone(180, 0.1, 'square', 0.18);
  }

  punch() {
    this._noise(0.09, 0.45, 500);
    this._tone(90, 0.09, 'sine', 0.4);
  }

  pickup() {
    this._tone(660, 0.09, 'sine', 0.3);
    this._tone(880, 0.09, 'sine', 0.3, 0.09);
    this._tone(1320, 0.16, 'sine', 0.3, 0.18);
  }

  crash() {
    this._noise(0.3, 0.5, 700);
  }

  horn() {
    this._tone(370, 0.18, 'square', 0.12);
    this._tone(466, 0.18, 'square', 0.1);
  }

  jingle(win) {
    const notes = win
      ? [523.25, 659.25, 783.99, 1046.5]
      : [392, 329.63, 261.63, 196];
    notes.forEach((n, i) => this._tone(n, 0.22, 'triangle', 0.3, i * 0.14));
  }

  // Called every frame: engine pitch, siren level and the music sequencer.
  update(dt, speedNorm, wanted) {
    if (!this.ctx) return;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(
        speedNorm > 0.02 ? 0.05 + speedNorm * 0.06 : 0,
        this.ctx.currentTime, 0.08,
      );
      this.engineOsc.frequency.setTargetAtTime(
        50 + speedNorm * 110, this.ctx.currentTime, 0.08,
      );
    }
    if (this.sirenGain) {
      this.sirenGain.gain.setTargetAtTime(
        wanted > 0 ? 0.045 : 0, this.ctx.currentTime, 0.2,
      );
    }
    // Music: one 8th-note step every ~0.27s.
    this.musicTimer += dt;
    if (this.musicTimer >= 0.268) {
      this.musicTimer -= 0.268;
      const step = this.musicStep % 16;
      const bass = this.bassNotes[step];
      if (bass) this._tone(bass, 0.24, 'triangle', 0.16);
      const lead = this.leadNotes[step];
      if (lead && step % 2 === 0) this._tone(lead, 0.2, 'sine', 0.07);
      this.musicStep++;
    }
  }
}
