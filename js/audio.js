// ============================================================
// AUDIO.JS — Sons & Musique Ambiants (Harry Potter style)
// Web Audio API procédurale — zéro fichier externe
// ============================================================

const AudioSystem = {
  ctx:          null,
  musicGain:    null,
  sfxGain:      null,
  isMuted:      false,
  musicPlaying: false,
  _noteTimer:   null,

  // ── Initialisation (une seule fois, après geste utilisateur) ──
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.sfxGain   = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.gain.value = 0.22;  // musique douce en fond
    this.sfxGain.gain.value   = 0.65;
  },

  // ── Musique ambiante magique (arpège procédural en boucle) ────
  playAmbientMusic() {
    if (this.musicPlaying || this.isMuted) return;
    this.init();
    this.musicPlaying = true;

    // Gamme pentatonique mineure — tonalité mystérieuse/magique
    const scale = [196, 220, 261, 294, 330, 392, 440, 523];
    let idx = 0;

    const tick = () => {
      if (!this.musicPlaying) return;

      // Note principale (oscillateur sinus filtré = harpe douce)
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lpf  = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(scale[idx % scale.length], this.ctx.currentTime);

      lpf.type            = 'lowpass';
      lpf.frequency.value = 1400;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.5);

      osc.connect(lpf).connect(gain).connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 3.6);

      // Harmonique douce à l'octave (sustain de harpe)
      if (Math.random() < 0.55) {
        const osc2  = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = scale[idx % scale.length] * 2;
        gain2.gain.setValueAtTime(0, this.ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);
        osc2.connect(gain2).connect(this.musicGain);
        osc2.start(this.ctx.currentTime);
        osc2.stop(this.ctx.currentTime + 2.6);
      }

      // Souffle de vent aléatoire
      if (Math.random() < 0.25) this._playWind();

      idx++;
      this._noteTimer = setTimeout(tick, 700 + Math.random() * 700);
    };

    tick();
  },

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._noteTimer);
  },

  // ── Bruit de vent ambiant ─────────────────────────────────────
  _playWind() {
    const buf  = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1);
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 600;

    src.connect(lpf).connect(gain).connect(this.musicGain);
    src.start();
  },

  // ── Pas dans le couloir ───────────────────────────────────────
  playFootstep() {
    if (this.isMuted) return;
    this.init();
    const now  = this.ctx.currentTime;
    const freq = 70 + Math.random() * 45;

    // Bruit bref + fréquence basse = pas sur pierre
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1);
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

    // Fréquence selon le type de sort
    const freqMap = {
      Incendio:     [900, 1800, 0.7],   // feu crépitant montant
      Expelliarmus: [700, 300,  0.5],   // désarmement descendant
      Stupefix:     [800, 500,  0.5],
      Episkey:      [400, 700,  0.6],   // soin montant doux
      Protego:      [500, 500,  0.4],
      Accio:        [300, 600,  0.5],
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

    // Scintillement magique superposé (harmoniques hautes brèves)
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

    // Bruit blanc court + subwoofer = impact charnel
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.25), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1);
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

    // Deux notes ascendantes magiques = récompense
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

  // ── Niveau supérieur ──────────────────────────────────────────
  playLevelUp() {
    if (this.isMuted) return;
    this.init();
    const now   = this.ctx.currentTime;
    const notes = [523, 659, 784, 1046, 1318]; // C5 E5 G5 C6 E6

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
    const chord = [392, 494, 587, 784]; // Sol, Si, Ré, Sol (accord majeur)

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

  // ── Son de mort du personnage ─────────────────────────────────
  playDeath() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Descente chromatique sombre
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

  // ── Bouton muet / son ─────────────────────────────────────────
  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('btn-music');
    if (this.isMuted) {
      this.stopMusic();
      if (btn) btn.textContent = '🔇';
    } else {
      if (btn) btn.textContent = '♪';
      this.playAmbientMusic();
    }
    return this.isMuted;
  }
};

window.AudioSystem = AudioSystem;
