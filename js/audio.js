// ============================================================
// AUDIO — Core : initialisation, état, contrôles
// Les méthodes musique et SFX sont ajoutées par
// audio-music.js et audio-sfx.js via Object.assign.
// ============================================================

const AudioSystem = {
  ctx:           null,
  musicGain:     null,
  sfxGain:       null,
  isMuted:       false,
  musicPlaying:  false,
  inCombat:      false,
  inMenu:        false,   // true tant que le thème de menu (intro UX) joue
  currentFloor:  1,
  _noteTimer:    null,
  _combatTimer:  null,
  voiceEnabled:  true,
  _cachedVoice:  null,
  // Sample audio — voir audio-music.js et .claude/plans/audio-intro-sample.md
  _sampleBuffers:     {},   // AudioBuffer décodé par clé de zone (intro|tension|dungeon|depths|abyss)
  _sampleLoadPromises:{},   // Promise en cours par zone (évite multi-fetch)
  _sampleSources:     [],   // sources actives à stopper sur stopMusic()
  _sampleLoopTimer:   null, // setTimeout du prochain enchaînement loop
  _voiceSources:      [],   // sources voix actives (séparé de _sampleSources pour ne pas être stoppé par stopMusic)
  _voicePending:      null, // clé voix en attente de décode (pour annuler si une autre est demandée)
  _duckRampSeconds:   0.20, // durée du ducking music in/out pendant une voix
  // Musique adaptative de combat (F1) : couche de combat active + bucket des
  // gains de ses itérations (pour les fade-out lors d'un crossfade d'intensité).
  _activeCombatKey:   null, // clé du sample de combat en cours ('combat_normal'|'tension'|…) ou null (procédural)
  _combatGains:       [],   // GainNodes des itérations de la couche de combat courante

  // ── Initialisation (une seule fois, après geste utilisateur) ──
  init() {
    if (this.ctx) return;
    this.ctx       = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.sfxGain   = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.voiceGain.connect(this.ctx.destination);
    this.musicGain.gain.value = 0.26;
    this.sfxGain.gain.value   = 0.65;
    this.voiceGain.gain.value = 0.95;
  },

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._noteTimer);
    clearTimeout(this._combatTimer);
    clearTimeout(this._sampleLoopTimer);
    // Stoppe toutes les sources sample actives
    for (const src of this._sampleSources) {
      try { src.stop(); } catch (_) { /* déjà arrêté ou pas démarré */ }
    }
    this._sampleSources = [];
    // Reset de l'état de musique adaptative de combat (F1).
    this._activeCombatKey = null;
    this._combatGains = [];
  },

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    this.refreshButtons();
    return this.voiceEnabled;
  },

  // ── Resynchronise les icônes des boutons audio avec l'état courant ──
  // Appelé après toggle et après chargement d'une sauvegarde. On met à
  // jour l'attribut src du <img> (jamais textContent, qui détruirait
  // la structure <span><img></span> du bouton).
  refreshButtons() {
    const mImg = document.querySelector('#btn-music img');
    if (mImg) mImg.src = this.isMuted ? 'img/icons/music_off.png' : 'img/icons/music_on.png';
    const vImg = document.querySelector('#btn-voice img');
    if (vImg) vImg.src = this.voiceEnabled ? 'img/icons/voice_on.png' : 'img/icons/voice_off.png';
  },

  // ── Bouton muet / son ─────────────────────────────────────────
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      if (this.inCombat) this.startCombatMusic();
      else if (this.inMenu) this.playMenuMusic();
      else this.playAmbientMusic(this.currentFloor);
    }
    this.refreshButtons();
    return this.isMuted;
  }
};

window.AudioSystem = AudioSystem;

// Préchauffer les voix SpeechSynthesis
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { AudioSystem._cachedVoice = null; };
  speechSynthesis.getVoices();
}
