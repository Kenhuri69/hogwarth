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

  // ── Pas selon la surface (H2) ─────────────────────────────────
  // Profil de timbre par type de sol de la tranche (getFloorTheme().floor) :
  // claquant sur pierre, feutré sur tapis, mat/résonant en caverne, métallique
  // sur runes. Bruit filtré ; chaque profil pilote type de filtre / fréquence
  // / résonance / gain / durée. Audio (≠ mouvement) → gardé `isMuted` seul.
  _SURFACE_STEPS: {
    stone:        { type: 'highpass', freq: 90,  q: 0.7, gain: 0.35, dur: 0.10 },
    carpet:       { type: 'lowpass',  freq: 380, q: 0.7, gain: 0.18, dur: 0.14 },
    cavern_floor: { type: 'bandpass', freq: 260, q: 1.4, gain: 0.30, dur: 0.12 },
    rune_floor:   { type: 'highpass', freq: 120, q: 2.2, gain: 0.32, dur: 0.11 },
  },

  playFootstep(surface) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Surface : argument explicite, sinon dérivée de la tranche d'étage.
    let key = surface;
    if (!key && typeof getFloorTheme === 'function' && typeof currentFloor !== 'undefined') {
      const th = getFloorTheme(currentFloor);
      if (th && th.floor) key = th.floor;
    }
    const prof = this._SURFACE_STEPS[key] || this._SURFACE_STEPS.stone;
    const freq = prof.freq + Math.random() * 40;

    const buf  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * prof.dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const filt = this.ctx.createBiquadFilter();
    filt.type  = prof.type; filt.frequency.value = freq;
    if (prof.q) filt.Q.value = prof.q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(prof.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + prof.dur);

    src.connect(filt).connect(gain).connect(this.sfxGain);
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
    // Vague C — incantations restantes (clés = noms canoniques de SPELLS).
    'Ferula Maxima':         'spell_ferula_maxima',
    'Aguamenti':             'spell_aguamenti',
    'Bombarda':              'spell_bombarda',
    'Riddikulus':            'spell_riddikulus',
    'Alohomora':             'spell_alohomora',
    'Patronum':              'spell_patronum',
    'Fulgari':               'spell_fulgari',
    'Lumos Solem':           'spell_lumos_solem',
    'Vampyrus':              'spell_vampyrus',
    'Maledictus':            'spell_maledictus',
    'Crucio':                'spell_crucio',
    'Morsmordre':            'spell_morsmordre',
    'Sectumsempra Imperius': 'spell_sectumsempra_imperius',
    'Legilimens':            'spell_legilimens',
    'Récolte Magique':       'spell_recolte_magique',
    'Fulgur Catena':         'spell_fulgur_catena',
    'Lux Aeterna':           'spell_lux_aeterna',
    'Nox Vorax':             'spell_nox_vorax',
    'Diffindo Maxima':       'spell_diffindo_maxima',
    'Vulnera Sanentur':      'spell_vulnera_sanentur',
    "Mémoire d'Outremonde":  'spell_memoire_outremonde',
    'Marque du Pèlerin':     'spell_marque_pelerin',
    'Rappel Astral':         'spell_rappel_astral',
    // Vague D — derniers sorts (couverture 100 % de SPELLS).
    'Lumos Maxima':          'spell_lumos_maxima',
    'Glacius':               'spell_glacius',
    'Revelio':               'spell_revelio',
    'Sanguini':              'spell_sanguini',
    'Tarantallegra':         'spell_tarantallegra',
    'Patronus Maxima':       'spell_patronus_maxima',
    'Glacius Tempête':       'spell_glacius_tempete',
    'Fiendfyre':             'spell_fiendfyre',
    'Cheminette Inter-Mondes': 'spell_cheminette_inter_mondes',
    'Verrou de Sang':        'spell_verrou_de_sang',
    'Sceau du Voyageur':     'spell_sceau_du_voyageur',
  },

  // ── Profils de voix par héros (L7 — barks parlés) ─────────────
  // Différencie le timbre des 13 héros en synthèse vocale (repli zéro-asset
  // de speakBark, en attendant d'éventuels OGG enregistrés). `pitch` et `rate`
  // sont calés sur le genre + le tempérament canon du perso (cf. CHARACTERS).
  // Plage SpeechSynthesis : pitch 0–2, rate 0.1–10. `gender` ('f'|'m') sert à
  // préférer une voix fr-FR du bon genre si le navigateur en expose une.
  // Un héros absent retombe sur le profil neutre (pitch 1.0 / rate 1.0).
  HERO_VOICE: {
    harry:     { pitch: 0.95, rate: 1.00, gender: 'm' }, // déterminé, posé
    hermione:  { pitch: 1.10, rate: 1.08, gender: 'f' }, // précise, rapide
    draco:     { pitch: 0.90, rate: 0.95, gender: 'm' }, // hautain, froid
    cho:       { pitch: 1.12, rate: 1.10, gender: 'f' }, // vive, agile
    cedric:    { pitch: 1.00, rate: 0.98, gender: 'm' }, // loyal, chaleureux
    celeste:   { pitch: 1.05, rate: 0.90, gender: 'f' }, // mystique, rêveuse
    iris:      { pitch: 1.20, rate: 1.12, gender: 'f' }, // pétillante, espiègle
    maxence:   { pitch: 0.82, rate: 0.92, gender: 'm' }, // sombre, taciturne
    anastasia: { pitch: 1.00, rate: 1.02, gender: 'f' }, // analytique, calme
    louis:     { pitch: 0.92, rate: 1.05, gender: 'm' }, // ardent, vif
    jeanne:    { pitch: 1.18, rate: 1.00, gender: 'f' }, // chantante, fantasque
    agathe:    { pitch: 1.08, rate: 0.93, gender: 'f' }, // douce, bienveillante
    olivier:   { pitch: 0.88, rate: 1.08, gender: 'm' }, // intense, électrique
  },

  // Voix fr-FR par genre, mise en cache. Best-effort : si le navigateur
  // n'expose pas de voix fr (ou pas du bon genre), retombe sur n'importe
  // quelle fr-FR, puis null (le moteur choisit alors sa voix par défaut).
  _frVoiceCache: { f: undefined, m: undefined, any: undefined },
  _pickFrVoice(gender) {
    if (!window.speechSynthesis) return null;
    const key = (gender === 'f' || gender === 'm') ? gender : 'any';
    if (this._frVoiceCache[key] !== undefined) return this._frVoiceCache[key];
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null; // pas encore chargées — réessai au prochain appel
    const fr = voices.filter(v => /^fr(-|_|$)/i.test(v.lang));
    let found = null;
    if (fr.length) {
      // Heuristique de genre par nom de voix (fragile mais sans coût si absente).
      const fName = /(amelie|amélie|audrey|marie|julie|virginie|c[ée]line|female|femme|aurélie|aurelie)/i;
      const mName = /(thomas|nicolas|paul|henri|mathieu|male|homme|daniel)/i;
      if (gender === 'f') found = fr.find(v => fName.test(v.name));
      else if (gender === 'm') found = fr.find(v => mName.test(v.name));
      found = found || fr[0];
    }
    this._frVoiceCache[key] = found;
    return found;
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
  },

  // ── Voix parlée des barks de héros (L7) ───────────────────────
  // Prononce à voix haute une réplique de héros. OGG enregistré prioritaire
  // (audio/voice/<key>_<event>.ogg, enregistré dans _VOICE_SAMPLES si produit),
  // sinon repli SpeechSynthesis en français. Gardé par le toggle « Voix »
  // (voiceEnabled) + isMuted — purement optionnel et défensif (silence si rien
  // n'est disponible). Appelé par heroBark() (js/hero-barks.js).
  speakBark(text, voiceKey) {
    if (!this.voiceEnabled || this.isMuted) return;
    // OGG dédié si présent (production future — fallback silencieux sinon).
    if (voiceKey && this._VOICE_SAMPLES && this._VOICE_SAMPLES[voiceKey]) {
      this.playVoice(voiceKey);
      return;
    }
    // Repli zéro-asset : synthèse vocale du navigateur, en français, avec un
    // timbre propre au héros (profil HERO_VOICE). heroKey = 1er segment de
    // voiceKey ('<heroKey>_<event>') ; aucun heroKey ne contient de '_'.
    if (!text || !window.speechSynthesis) return;
    const heroKey = voiceKey ? String(voiceKey).split('_')[0] : '';
    const prof    = (this.HERO_VOICE && this.HERO_VOICE[heroKey]) || null;
    try {
      speechSynthesis.cancel();
      const utt   = new SpeechSynthesisUtterance(String(text));
      utt.lang    = 'fr-FR';
      utt.pitch   = prof ? prof.pitch : 1.0;
      utt.rate    = prof ? prof.rate  : 1.0;
      utt.volume  = 0.85;
      const voice = this._pickFrVoice(prof ? prof.gender : null);
      if (voice) utt.voice = voice;
      speechSynthesis.speak(utt);
    } catch (_) { /* synthèse indisponible — silencieux */ }
  },

  // ── Barks ambiants d'exploration (F2) — synthèse procédurale ──
  // One-shots discrets joués à faible probabilité par pas (movement.js
  // _step), teintés par la tranche d'ambiance (getFloorTheme). Zéro asset :
  // tout est synthétisé via WebAudio (comme les autres SFX). Respecte
  // isMuted ; silencieux en combat / menu. Audio (≠ mouvement) → non gardé
  // par reduced-motion, comme la musique et les autres SFX.
  _AMBIENT_BARK_CHANCE: 0.07,

  // Tente un bark : roll de probabilité interne, choix du son selon la zone.
  // Retourne true si un son a été déclenché (utile aux tests). Tout effet de
  // bord est purement audio — n'altère aucun état de jeu / RNG de simulation.
  maybeAmbientBark(floor) {
    if (this.isMuted || this.inCombat || this.inMenu) return false;
    let chance = (typeof this._AMBIENT_BARK_CHANCE === 'number') ? this._AMBIENT_BARK_CHANCE : 0.07;
    // Signature d'événement d'étage (I2) : un étage hanté est plus « vivant »
    // — barks plus fréquents. Purement audio, n'altère aucun état de jeu.
    const haunted = (typeof currentFloorEvent !== 'undefined') && currentFloorEvent === 'hante';
    if (haunted) chance *= 1.6;
    if (Math.random() >= chance) return false;
    this.init();
    let zone = 'intro';
    if (typeof getFloorTheme === 'function') {
      const f  = (typeof floor === 'number') ? floor : this.currentFloor;
      const th = getFloorTheme(f);
      if (th && th.ambient) zone = th.ambient;
    }
    // Pool de barks par zone (du plus clair au plus oppressant).
    let pool = {
      intro:   ['drip', 'creak'],
      dungeon: ['creak', 'clang', 'drip'],
      depths:  ['groan', 'clang', 'creak'],
      abyss:   ['rumble', 'groan'],
    }[zone] || ['drip'];
    // Étage hanté : biais vers les sons les plus oppressants, toutes zones.
    if (haunted) pool = ['groan', 'rumble', 'groan', 'clang'];
    const kind = pool[Math.floor(Math.random() * pool.length)];
    try { this._playBark(kind); } catch (_) { /* contexte indispo → silencieux */ }
    return true;
  },

  // Synthèse d'un bark par type. Gains volontairement bas (sons « lointains »).
  _playBark(kind) {
    const now = this.ctx.currentTime;
    if (kind === 'drip') {
      // Goutte d'eau : sinus glissant aigu→grave, court, doux.
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.setValueAtTime(1300 + Math.random() * 500, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.10, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.connect(g).connect(this.sfxGain);
      osc.start(now); osc.stop(now + 0.26);
      return;
    }
    if (kind === 'creak') {
      // Craquement de bois : bruit filtré en bande étroite, montée lente.
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.5), this.ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < buf.length; i++) d[i] = (Math.random() * 2 - 1);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp  = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 320 + Math.random() * 220; bp.Q.value = 7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.07, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.48);
      src.connect(bp).connect(g).connect(this.sfxGain);
      src.start(now);
      return;
    }
    if (kind === 'clang') {
      // Cliquetis métallique lointain : deux partiels inharmoniques brefs.
      [0, 0.04].forEach((off, i) => {
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'triangle';
        osc.frequency.value = (i ? 1870 : 940) + Math.random() * 120;
        g.gain.setValueAtTime(0.0001, now + off);
        g.gain.exponentialRampToValueAtTime(0.05, now + off + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0006, now + off + 0.34);
        osc.connect(g).connect(this.sfxGain);
        osc.start(now + off); osc.stop(now + off + 0.4);
      });
      return;
    }
    if (kind === 'groan') {
      // Râle/souffle lointain : sinus grave avec léger vibrato.
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lg  = this.ctx.createGain();
      const g   = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(96, now + 1.1);
      lfo.frequency.value = 5.5; lg.gain.value = 8;
      lfo.connect(lg).connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0006, now + 1.2);
      osc.connect(g).connect(this.sfxGain);
      lfo.start(now); osc.start(now);
      lfo.stop(now + 1.25); osc.stop(now + 1.25);
      return;
    }
    // 'rumble' — grondement très grave bruité (abysses).
    const osc = this.ctx.createOscillator();
    const lpf = this.ctx.createBiquadFilter();
    const g   = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 1.4);
    lpf.type = 'lowpass'; lpf.frequency.value = 140;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0006, now + 1.5);
    osc.connect(lpf).connect(g).connect(this.sfxGain);
    osc.start(now); osc.stop(now + 1.55);
  }
});
