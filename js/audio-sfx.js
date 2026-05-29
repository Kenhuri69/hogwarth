// ============================================================
// AUDIO — Effets sonores (SFX) et voix des sortilèges
// Ajout de méthodes à AudioSystem (défini dans audio.js)
// ============================================================

Object.assign(AudioSystem, {

  // ── Note unique (oscillateur + enveloppe) ─────────────────────
  // Brique partagée des arpèges/accords SFX. `attack` > 0 → ramp
  // linéaire 0→peak ; sinon le pic est posé directement à `start`.
  // `decayAt` et `stop` sont des temps absolus du contexte audio.
  _playTone({ freq, type, start, peak, attack, decayAt, stop }) {
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (attack) {
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
    } else {
      gain.gain.setValueAtTime(peak, start);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, decayAt);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(start);
    osc.stop(stop);
  },

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
      Portus:               [240,  1400, 0.9],
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

  // ── Accent de coup critique (ping métallique brillant ascendant) ──
  playCrit() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    // Deux tons aigus rapides + montée → éclat « ting ! » par-dessus playHit.
    [[880, 0, 0.28], [1320, 0.05, 0.22], [1760, 0.10, 0.16]].forEach(([freq, delay, peak]) => {
      this._playTone({ freq, type: 'triangle', start: now + delay, peak,
        attack: 0.004, decayAt: now + delay + 0.18, stop: now + delay + 0.30 });
    });
  },

  // ── Accent de coup en faiblesse élémentaire (éclat de verre brisé) ──
  playWeakHit() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    // Bouffée de bruit filtrée aigu (« crack ») + ton descendant : impact amplifié.
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.18), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / buf.length);
    const src  = this.ctx.createBufferSource(); src.buffer = buf;
    const bpf  = this.ctx.createBiquadFilter();
    bpf.type   = 'bandpass'; bpf.frequency.value = 2600; bpf.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(bpf).connect(gain).connect(this.sfxGain);
    src.start(now);
    this._playTone({ freq: 520, type: 'sawtooth', start: now, peak: 0.18,
      attack: 0.004, decayAt: now + 0.12, stop: now + 0.22 });
  },

  // ── Salutation PNJ (cloche douce à l'ouverture du dialogue) ──
  playNpcGreet() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Deux notes douces type cloche : une fondamentale + sa quinte
    [[523, 0, 0.30], [784, 0.08, 0.20]].forEach(([freq, delay, peak]) => {
      this._playTone({
        freq, type: 'sine', start: now + delay, peak, attack: 0.04,
        decayAt: now + delay + 0.9, stop: now + delay + 0.95,
      });
    });
  },

  // ── Ouverture de coffre ───────────────────────────────────────
  playChestOpen() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    [[330, 0], [523, 0.15], [659, 0.3], [880, 0.45]].forEach(([freq, delay]) => {
      this._playTone({
        freq, type: 'sine', start: now + delay, peak: 0.35,
        decayAt: now + delay + 0.6, stop: now + delay + 0.65,
      });
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
      this._playTone({
        freq, type: 'sine', start: now + delay, peak: 0.45, attack: 0.05,
        decayAt: now + delay + 0.55, stop: now + delay + 0.6,
      });
    });
  },

  // ── Brassage de potion (bouillonnement de chaudron) ──────────
  playBrew() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = 1.1;

    // Nappe de bouillonnement : bruit blanc filtré passe-bas.
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(280, now);
    lpf.frequency.linearRampToValueAtTime(420, now + dur);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    noiseGain.gain.setValueAtTime(0.18, now + dur - 0.25);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lpf).connect(noiseGain).connect(this.sfxGain);
    src.start(now); src.stop(now + dur);

    // Bulles : oscillateurs sinus brefs au pitch montant.
    for (let i = 0; i < 7; i++) {
      const delay = 0.1 + Math.random() * (dur - 0.35);
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const f0 = 160 + Math.random() * 120;
      osc.frequency.setValueAtTime(f0, now + delay);
      osc.frequency.exponentialRampToValueAtTime(f0 * 2.2, now + delay + 0.12);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.16, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now + delay); osc.stop(now + delay + 0.2);
    }
  },

  // ── Complétion d'un Set de Maison (4/4) ──────────────────────
  // Chord majestueux brillant — distinct de playLevelUp : on tient un
  // accord majeur ouvert (root + 5te + octave + 10e), puis on superpose
  // un arpège ascendant qui culmine sur la quinte octave. Couleur
  // « palier majeur atteint », plus solennel que le levelUp 5-notes.
  playSetComplete() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1) Accord soutenu (triangle, doux)
    [392, 587, 784, 988].forEach((freq, i) => {
      this._playTone({
        freq, type: 'triangle', start: now + i * 0.03, peak: 0.22, attack: 0.05,
        decayAt: now + 1.6, stop: now + 1.7,
      });
    });

    // 2) Arpège brillant par dessus (sine, plus aigu)
    [784, 988, 1175, 1568, 1976].forEach((freq, i) => {
      const delay = 0.45 + i * 0.08;
      this._playTone({
        freq, type: 'sine', start: now + delay, peak: 0.30, attack: 0.03,
        decayAt: now + delay + 0.45, stop: now + delay + 0.5,
      });
    });
  },

  // ── Victoire de combat ────────────────────────────────────────
  playVictory() {
    if (this.isMuted) return;
    this.init();
    const now   = this.ctx.currentTime;
    const chord = [392, 494, 587, 784];

    chord.forEach((freq, i) => {
      this._playTone({
        freq, type: 'triangle', start: now + i * 0.04, peak: 0.18,
        decayAt: now + 1.2, stop: now + 1.3,
      });
    });
  },

  // ── Mort du personnage ────────────────────────────────────────
  playDeath() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    [440, 392, 330, 294, 220].forEach((freq, i) => {
      this._playTone({
        freq, type: 'sawtooth', start: now + i * 0.18, peak: 0.25,
        decayAt: now + i * 0.18 + 0.4, stop: now + i * 0.18 + 0.45,
      });
    });
  },

  // ── Voix des sortilèges ──────────────────────────────────────
  // Mapping nom de sort (SPELLS[].name) → clé OGG (_VOICE_SAMPLES).
  // Les sorts absents de cette table retombent sur SpeechSynthesis.
  SPELL_VOICE_MAP: {
    'Expelliarmus':       'spell_expelliarmus',
    'Stupefix':           'spell_stupefix',
    'Episkey':            'spell_episkey',
    'Protego':            'spell_protego',
    'Incendio':           'spell_incendio',
    'Reparo':             'spell_reparo',
    'Wingardium Leviosa': 'spell_wingardium_leviosa',
    'Accio':              'spell_accio',
    'Ferula':             'spell_ferula',
    'Diffindo':           'spell_diffindo',
    'Sectumsempra':       'spell_sectumsempra',
    'Avada...':           'spell_avada',
    'Portus':             'spell_portus',
  },

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

    // OGG enregistré prioritaire : voix d'incantation dédiée.
    const voiceKey = this.SPELL_VOICE_MAP[spellName];
    if (voiceKey && this._VOICE_SAMPLES[voiceKey]) {
      this.playVoice(voiceKey);
      return;
    }

    // Repli : synthèse vocale du navigateur.
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
