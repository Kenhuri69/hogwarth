// ============================================================
// AUDIO — Effets sonores (SFX) et voix des sortilèges
// Ajout de méthodes à AudioSystem (défini dans audio.js)
// ============================================================

Object.assign(AudioSystem, {

  // ── Pas dans le couloir ───────────────────────────────────────
  playFootstep() {
    if (this.isMuted) return;
    this.init();
    const now  = this.ctx.currentTime;
    const freq = 70 + Math.random() * 45;

    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const hpf  = this.ctx.createBiquadFilter();
    hpf.type   = 'highpass'; hpf.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    src.connect(hpf).connect(gain).connect(this.sfxGain);
    src.start(now);
  },

  // ── Lancement de sort ─────────────────────────────────────────
  playSpellCast(spellName) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const freqMap = {
      Incendio:             [900,  1800, 0.7],
      Expelliarmus:         [700,  300,  0.5],
      Stupefix:             [800,  500,  0.5],
      Episkey:              [400,  700,  0.6],
      Protego:              [500,  500,  0.4],
      Accio:                [300,  600,  0.5],
      'Wingardium Leviosa': [350,  900,  0.9],
      Diffindo:             [1200, 300,  0.25],
      Reparo:               [380,  680,  0.75],
      Sectumsempra:         [1100, 180,  1.0],
      'Avada...':           [220,  80,   1.2],
    };
    const [startF, endF, dur] = freqMap[spellName] || [600, 400, 0.5];

    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lpf  = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(endF, now + dur);

    lpf.type = 'lowpass'; lpf.frequency.value = 2000;

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.1);

    osc.connect(lpf).connect(gain).connect(this.sfxGain);
    osc.start(now); osc.stop(now + dur + 0.2);

    // Scintillement magique superposé
    setTimeout(() => {
      if (!this.ctx) return;
      const spark = this.ctx.createOscillator();
      const sg    = this.ctx.createGain();
      spark.frequency.value = startF * 3;
      sg.gain.setValueAtTime(0.2, this.ctx.currentTime);
      sg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      spark.connect(sg).connect(this.sfxGain);
      spark.start(); spark.stop(this.ctx.currentTime + 0.18);
    }, 50);
  },

  // ── Impact physique ───────────────────────────────────────────
  playHit() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.25), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const hpf  = this.ctx.createBiquadFilter();
    hpf.type   = 'highpass'; hpf.frequency.value = 200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    src.connect(hpf).connect(gain).connect(this.sfxGain);
    src.start(now);

    // Subwoofer percussif
    const sub  = this.ctx.createOscillator();
    const sg   = this.ctx.createGain();
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    sg.gain.setValueAtTime(0.6, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    sub.connect(sg).connect(this.sfxGain);
    sub.start(now); sub.stop(now + 0.22);
  },

  // ── Ouverture de coffre ───────────────────────────────────────
  playChestOpen() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    [[330, 0], [523, 0.15], [659, 0.3], [880, 0.45]].forEach(([freq, delay]) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + delay); osc.stop(now + delay + 0.65);
    });
  },

  // ── Level up ─────────────────────────────────────────────────
  playLevelUp() {
    if (this.isMuted) return;
    this.init();
    const now   = this.ctx.currentTime;
    const notes = [523, 659, 784, 1046, 1318];

    notes.forEach((freq, i) => {
      const delay = i * 0.10;
      const osc   = this.ctx.createOscillator();
      const gain  = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.45, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.55);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + delay); osc.stop(now + delay + 0.6);
    });
  },

  // ── Victoire de combat ────────────────────────────────────────
  playVictory() {
    if (this.isMuted) return;
    this.init();
    const now   = this.ctx.currentTime;
    const chord = [392, 494, 587, 784];

    chord.forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + i * 0.04); osc.stop(now + 1.3);
    });
  },

  // ── Mort du personnage ────────────────────────────────────────
  playDeath() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    [440, 392, 330, 294, 220].forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.4);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.45);
    });
  },

  // ── Voix des sortilèges (SpeechSynthesis) ────────────────────
  _pickVoice() {
    if (this._cachedVoice) return this._cachedVoice;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    const pref = [
      v => v.lang === 'en-GB',
      v => v.name.toLowerCase().includes('daniel'),
      v => v.name.toLowerCase().includes('british'),
      v => v.lang.startsWith('en'),
      v => true,
    ];
    for (const test of pref) {
      const found = voices.find(test);
      if (found) { this._cachedVoice = found; return found; }
    }
    return voices[0];
  },

  speakSpell(spellName) {
    if (!this.voiceEnabled || this.isMuted) return;
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    setTimeout(() => {
      const utt   = new SpeechSynthesisUtterance(spellName);
      const voice = this._pickVoice();
      if (voice) utt.voice = voice;
      utt.pitch  = 1.15;
      utt.rate   = 0.88;
      utt.volume = 0.9;
      speechSynthesis.speak(utt);
    }, 120);
  }
});
