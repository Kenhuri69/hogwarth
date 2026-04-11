// ============================================================
// AUDIO — Musique ambiante et musique de combat
// Ajout de méthodes à AudioSystem (défini dans audio.js)
// ============================================================

Object.assign(AudioSystem, {

  // ── Musique ambiante selon l'étage (5 zones progressives) ────
  playAmbientMusic(floor) {
    if (this.inCombat) return;
    this.stopMusic();
    if (floor !== undefined) this.currentFloor = floor;
    if (this.isMuted) { this.musicPlaying = true; return; }
    this.init();

    // ── Paramètres par zone ───────────────────────────────────
    const f = this.currentFloor;
    let scale, tempo, oscType, filterHz, windChance, harmChance, bassDrone;

    if (f <= 2) {
      // Hauts couloirs de Poudlard — clair et mystérieux
      scale      = [261, 294, 330, 392, 440, 523, 659];
      tempo      = 750;
      oscType    = 'sine';
      filterHz   = 1800;
      windChance = 0.20;
      harmChance = 0.55;
      bassDrone  = null;
    } else if (f <= 4) {
      // Salles intermédiaires — tension naissante
      scale      = [220, 261, 294, 330, 392, 440];
      tempo      = 700;
      oscType    = 'sine';
      filterHz   = 1500;
      windChance = 0.28;
      harmChance = 0.45;
      bassDrone  = 55;   // La 1 (très grave, pulsé)
    } else if (f <= 6) {
      // Cachots — angoissant
      scale      = [196, 220, 261, 294, 330];
      tempo      = 640;
      oscType    = 'triangle';
      filterHz   = 1100;
      windChance = 0.35;
      harmChance = 0.35;
      bassDrone  = 49;   // Ré 1
    } else if (f <= 8) {
      // Profondeurs — oppressant
      scale      = [165, 196, 220, 261, 294];
      tempo      = 580;
      oscType    = 'triangle';
      filterHz   = 900;
      windChance = 0.45;
      harmChance = 0.25;
      bassDrone  = 41;   // Mi 1 — bourdon grave
    } else {
      // Abysses — pur cauchemar
      scale      = [130, 146, 165, 196, 220];
      tempo      = 520;
      oscType    = 'sawtooth';
      filterHz   = 700;
      windChance = 0.55;
      harmChance = 0.15;
      bassDrone  = 36;   // La 0 — grondement profond
    }

    let idx = 0;
    this.musicPlaying = true;

    // Bourdon grave continu (étages 3+)
    if (bassDrone) this._playBassDrone(bassDrone);

    const tick = () => {
      if (!this.musicPlaying || this.inCombat) return;

      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lpf  = this.ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(scale[idx % scale.length], this.ctx.currentTime);

      lpf.type            = 'lowpass';
      lpf.frequency.value = filterHz;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.13, this.ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.6);

      osc.connect(lpf).connect(gain).connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 3.8);

      // Harmonique douce à l'octave
      if (Math.random() < harmChance) {
        const osc2  = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = scale[idx % scale.length] * 2;
        gain2.gain.setValueAtTime(0, this.ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.6);
        osc2.connect(gain2).connect(this.musicGain);
        osc2.start(this.ctx.currentTime);
        osc2.stop(this.ctx.currentTime + 2.8);
      }

      // Souffle de vent aléatoire
      if (Math.random() < windChance) this._playWind(f);

      idx++;
      this._noteTimer = setTimeout(tick, tempo + Math.random() * 200);
    };

    tick();
  },

  // ── Bourdon grave pour les étages profonds ────────────────────
  _playBassDrone(freq) {
    if (!this.ctx || !this.musicPlaying || this.inCombat) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lpf  = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lpf.type = 'lowpass'; lpf.frequency.value = 200;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 14);

    osc.connect(lpf).connect(gain).connect(this.musicGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 15);
  },

  // ── Musique de combat ─────────────────────────────────────────
  startCombatMusic() {
    if (this.inCombat) return;
    this.inCombat = true;
    this.stopMusic();
    if (this.isMuted) return;
    this.init();

    // Paramètres selon la difficulté
    const isExpert     = (typeof difficulty !== 'undefined') && difficulty === 'Expert';
    const isDifficile  = (typeof difficulty !== 'undefined') && difficulty === 'Difficile';
    const isHard       = isExpert || isDifficile;

    const melScale  = isExpert ? [130, 146, 165, 196] : isHard ? [165, 196, 220, 261] : [196, 220, 261, 294, 330];
    const beatFreq  = isExpert ? 60 : isHard ? 80 : 90;
    const melTempo  = isExpert ? 230 : isHard ? 280 : 340;
    const oscType   = isExpert ? 'sawtooth' : 'triangle';
    const melVol    = isExpert ? 0.32 : 0.26;

    let melIdx = 0;
    let beatIdx = 0;
    this.musicPlaying = true;

    // ── Mélodie tendue ────────────────────────────────────────
    const melTick = () => {
      if (!this.inCombat || !this.musicPlaying) return;

      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lpf  = this.ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(melScale[melIdx % melScale.length], this.ctx.currentTime);

      lpf.type = 'lowpass';
      lpf.frequency.value = isExpert ? 800 : 1400;

      gain.gain.setValueAtTime(melVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc.connect(lpf).connect(gain).connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 1.4);

      melIdx++;
      this._noteTimer = setTimeout(melTick, melTempo + Math.random() * 60);
    };

    // ── Battement rythmique (caisse claire procédurale) ───────
    const beatTick = () => {
      if (!this.inCombat || !this.musicPlaying) return;

      // Kick (toutes les 2 pulsations)
      if (beatIdx % 2 === 0) {
        const kickOsc  = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(beatFreq * 1.4, this.ctx.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(beatFreq * 0.4, this.ctx.currentTime + 0.12);
        kickGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        kickOsc.connect(kickGain).connect(this.musicGain);
        kickOsc.start(this.ctx.currentTime);
        kickOsc.stop(this.ctx.currentTime + 0.2);
      }

      // Snare bruit blanc bref (temps 2 et 4)
      if (beatIdx % 4 === 2) {
        const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
        const src  = this.ctx.createBufferSource();
        src.buffer = buf;
        const hpf  = this.ctx.createBiquadFilter();
        hpf.type   = 'highpass'; hpf.frequency.value = 1500;
        const sg   = this.ctx.createGain();
        sg.gain.setValueAtTime(isExpert ? 0.35 : 0.22, this.ctx.currentTime);
        sg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        src.connect(hpf).connect(sg).connect(this.musicGain);
        src.start(this.ctx.currentTime);
      }

      beatIdx++;
      this._combatTimer = setTimeout(beatTick, isExpert ? 150 : isHard ? 180 : 210);
    };

    melTick();
    beatTick();
  },

  stopCombatMusic() {
    if (!this.inCombat) return;
    this.inCombat = false;
    this.stopMusic();
    if (!this.isMuted) {
      // Courte pause avant de reprendre l'ambiance (transition naturelle)
      setTimeout(() => this.playAmbientMusic(this.currentFloor), 400);
    }
  },

  // ── Bruit de vent (intensité selon l'étage) ───────────────────
  _playWind(floor = 1) {
    const dur  = 1.5 + Math.random() * 1.5;
    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const vol = Math.min(0.12, 0.04 + floor * 0.008);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = Math.max(300, 700 - floor * 40);

    src.connect(lpf).connect(gain).connect(this.musicGain);
    src.start();
  }
});
