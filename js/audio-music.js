// ============================================================
// AUDIO — Musique ambiante et musique de combat
// Ajout de méthodes à AudioSystem (défini dans audio.js)
// ============================================================

Object.assign(AudioSystem, {

  // ── Musique ambiante selon l'étage (5 zones progressives) ────
  // Chaque zone peut avoir un sample OGG. Si le sample existe, on le
  // joue avec crossfade ; sinon on retombe sur la synthèse procédurale.
  // Voir .claude/plans/audio-intro-sample.md.
  //
  // Registre zone → fichier (la map vit en bas via _ZONE_SAMPLES).
  playAmbientMusic(floor) {
    if (this.inCombat) return;
    // No-op si la même zone joue déjà — évite de couper/relancer le sample
    // entre showIntroScreen() et startGame() (cf. js/intro.js), ou entre
    // deux étages d'une même zone (1→2, 3→4, 5→6, 7→8).
    const targetFloor = (floor !== undefined) ? floor : this.currentFloor;
    if (this.musicPlaying && !this.isMuted &&
        this._sameAmbientZone(targetFloor, this.currentFloor)) {
      this.currentFloor = targetFloor;
      return;
    }
    this.stopMusic();
    if (floor !== undefined) this.currentFloor = floor;
    if (this.isMuted) { this.musicPlaying = true; return; }
    this.init();
    this.musicPlaying = true;

    const f       = this.currentFloor;
    const zoneKey = this._zoneKeyForFloor(f);
    const sampleUrl = this._ZONE_SAMPLES[zoneKey];

    // Pas de sample déclaré pour cette zone → procédural direct
    if (!sampleUrl) {
      this._playProceduralAmbient(f);
      return;
    }

    // Sample déclaré : tenter le chargement, fallback procédural sur erreur
    this._loadZoneSample(zoneKey)
      .then(() => {
        if (this.musicPlaying && !this.inCombat &&
            this._zoneKeyForFloor(this.currentFloor) === zoneKey) {
          this._playZoneSampleLoop(zoneKey);
        }
      })
      .catch(err => {
        console.warn(`[audio] sample "${zoneKey}" unavailable, fallback to procedural:`, err && err.message);
        if (this.musicPlaying && !this.inCombat &&
            this._zoneKeyForFloor(this.currentFloor) === zoneKey) {
          this._playProceduralAmbient(this.currentFloor);
        }
      });
  },

  // ── Mapping étage → clé de zone (5 paliers) ───────────────────
  _zoneKeyForFloor(f) {
    if (f <= 2) return 'intro';
    if (f <= 4) return 'tension';
    if (f <= 6) return 'dungeon';
    if (f <= 8) return 'depths';
    return 'abyss';
  },

  // ── Deux étages tombent dans la même zone musicale ? ──────────
  _sameAmbientZone(a, b) {
    return this._zoneKeyForFloor(a) === this._zoneKeyForFloor(b);
  },

  // ── Registre zone → fichier OGG ───────────────────────────────
  // Une entrée absente (ou undefined) signifie : pas de sample, utilise
  // la synthèse procédurale pour cette zone.
  _ZONE_SAMPLES: {
    intro:   'audio/ambient_intro.ogg',
    tension: 'audio/ambient_tension.ogg',
    dungeon: 'audio/ambient_dungeon.ogg',
    depths:  'audio/ambient_depths.ogg',
    abyss:   'audio/ambient_abyss.ogg',
  },

  // ── Registre difficulté → fichier OGG de combat ───────────────
  // Mêmes règles que _ZONE_SAMPLES : entrée absente → procédural.
  // Les clés sont préfixées 'combat_' pour cohabiter dans le même
  // cache `_sampleBuffers` que les samples ambient.
  _COMBAT_SAMPLES: {
    combat_normal: 'audio/combat_normal.ogg',
    // combat_hard, combat_expert : pas encore livrés → procédural
  },

  // ── Registre voix narratives (un fichier par phrase) ──────────
  // Voir .claude/plans/voice-intro-dumbledore.md. Fallback silencieux
  // si l'entrée n'existe pas ou si le fetch échoue.
  _VOICE_SAMPLES: {
    dumbledore_intro_1: 'audio/voice/dumbledore_intro_1.ogg',
    dumbledore_intro_2: 'audio/voice/dumbledore_intro_2.ogg',
  },

  // ── Lecture d'une voix narrative (one-shot, avec ducking music) ──
  // Charge le sample paresseusement, lance la lecture une seule fois,
  // applique un ducking 30 % sur la musique pendant la durée + 200 ms
  // de retombée. `stopVoice()` est appelée systématiquement avant de
  // démarrer une nouvelle voix pour éviter tout chevauchement.
  playVoice(voiceKey) {
    if (this.isMuted) return Promise.resolve();
    const url = this._VOICE_SAMPLES[voiceKey];
    if (!url) return Promise.resolve();  // fallback silencieux
    this.init();
    this.stopVoice();
    this._voicePending = voiceKey;
    return this._loadSample(voiceKey, url)
      .then(buf => {
        // Si une autre voix a été démarrée entre temps, on abandonne
        if (this._voicePending !== voiceKey) return;
        this._voicePending = null;
        if (!this.voiceGain) return;  // init pas encore prête
        const now  = this.ctx.currentTime;
        const src  = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.voiceGain);
        src.start(now);
        this._voiceSources.push(src);
        this._duckMusic(true);
        src.onended = () => {
          const i = this._voiceSources.indexOf(src);
          if (i >= 0) this._voiceSources.splice(i, 1);
          if (this._voiceSources.length === 0) this._duckMusic(false);
        };
      })
      .catch(err => {
        console.warn(`[audio] voice "${voiceKey}" unavailable:`, err && err.message);
        this._voicePending = null;
      });
  },

  // ── Stoppe toutes les voix actives et restaure la musique ─────
  stopVoice() {
    this._voicePending = null;
    for (const src of this._voiceSources) {
      try { src.stop(); } catch (_) { /* déjà arrêté */ }
    }
    this._voiceSources = [];
    this._duckMusic(false);
  },

  // ── Ducking : musique × 0.30 pendant la voix, restaurée après ─
  _duckMusic(active) {
    if (!this.ctx || !this.musicGain) return;
    const now    = this.ctx.currentTime;
    const ramp   = this._duckRampSeconds || 0.20;
    const target = active ? 0.078 : 0.26;   // 0.26 × 0.30 ≈ 0.078
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + ramp);
  },

  // ── Chargement paresseux d'un sample (zone ou combat) ─────────
  _loadSample(key, url) {
    if (this._sampleBuffers[key]) return Promise.resolve(this._sampleBuffers[key]);
    if (this._sampleLoadPromises[key]) return this._sampleLoadPromises[key];
    if (!url) return Promise.reject(new Error('no sample url for ' + key));
    if (!this.ctx) this.init();
    const p = fetch(url, { cache: 'force-cache' })
      .then(r => {
        if (!r.ok) throw new Error('fetch ' + r.status);
        return r.arrayBuffer();
      })
      .then(buf => new Promise((resolve, reject) =>
        this.ctx.decodeAudioData(buf, resolve, reject)
      ))
      .then(audioBuf => {
        this._sampleBuffers[key] = audioBuf;
        return audioBuf;
      })
      .catch(err => {
        delete this._sampleLoadPromises[key];  // permet un retry
        throw err;
      });
    this._sampleLoadPromises[key] = p;
    return p;
  },

  // ── Wrapper rétrocompatible — appelle _loadSample avec l'URL du registre ──
  _loadZoneSample(zoneKey) {
    return this._loadSample(zoneKey, this._ZONE_SAMPLES[zoneKey]);
  },

  // ── Lecture loopée avec crossfade 1 s ─────────────────────────
  // `isRelevant` est une fonction qui retourne `true` tant que le sample
  // doit continuer à jouer ; quand elle retourne `false`, le loop arrête
  // de se reprogrammer (sans toucher aux sources déjà schedulées qui
  // finiront naturellement). Utilisée pour distinguer ambient vs combat
  // et pour stopper proprement à un changement de zone/contexte.
  _playSampleLoop(bufKey, isRelevant) {
    const buf = this._sampleBuffers[bufKey];
    if (!buf || !this.musicPlaying) return;
    const CROSSFADE = 1.0;
    const duration  = buf.duration;
    if (duration <= 2 * CROSSFADE) return;  // sample trop court pour crossfader

    const schedule = (startAt) => {
      if (!this.musicPlaying || !isRelevant()) return;
      const src  = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      src.connect(gain).connect(this.musicGain);
      // Fade in sur CROSSFADE
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(1, startAt + CROSSFADE);
      // Fade out sur les CROSSFADE dernières secondes
      gain.gain.setValueAtTime(1, startAt + duration - CROSSFADE);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      src.start(startAt);
      src.stop(startAt + duration + 0.05);
      this._sampleSources.push(src);
      src.onended = () => {
        const i = this._sampleSources.indexOf(src);
        if (i >= 0) this._sampleSources.splice(i, 1);
      };
      const nextStart = startAt + duration - CROSSFADE;
      const delayMs   = Math.max(0, (nextStart - this.ctx.currentTime) * 1000 - 200);
      this._sampleLoopTimer = setTimeout(() => schedule(nextStart), delayMs);
    };

    schedule(this.ctx.currentTime);
  },

  // ── Wrapper rétrocompatible — ambient ─────────────────────────
  _playZoneSampleLoop(zoneKey) {
    this._playSampleLoop(zoneKey, () =>
      !this.inCombat && this._zoneKeyForFloor(this.currentFloor) === zoneKey
    );
  },

  // ── Synthèse procédurale (zones 3+ ou fallback zones 1-2) ─────
  _playProceduralAmbient(f) {
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
  // Difficulté Normale : sample OGG (audio/combat_normal.ogg) si dispo,
  // sinon procédural. Difficile / Expert : procédural (variantes
  // plus dures, samples à livrer plus tard si besoin).
  startCombatMusic() {
    if (this.inCombat) return;
    this.inCombat = true;
    this.stopMusic();
    if (this.isMuted) return;
    this.init();
    this.musicPlaying = true;

    const combatKey = this._combatSampleKey();
    const url = this._COMBAT_SAMPLES[combatKey];

    if (!url) {
      this._playProceduralCombat();
      return;
    }

    this._loadSample(combatKey, url)
      .then(() => {
        if (this.inCombat && this.musicPlaying) {
          this._playSampleLoop(combatKey, () => this.inCombat);
        }
      })
      .catch(err => {
        console.warn(`[audio] sample "${combatKey}" unavailable, fallback to procedural:`, err && err.message);
        if (this.inCombat && this.musicPlaying) {
          this._playProceduralCombat();
        }
      });
  },

  // ── Mapping difficulté courante → clé de sample combat ────────
  _combatSampleKey() {
    const d = (typeof difficulty !== 'undefined') ? difficulty : 'Normal';
    if (d === 'Expert')    return 'combat_expert';
    if (d === 'Difficile') return 'combat_hard';
    return 'combat_normal';
  },

  // ── Synthèse procédurale de combat (fallback ou difficulté sans sample) ──
  _playProceduralCombat() {
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
