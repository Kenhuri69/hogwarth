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
  currentFloor:  1,
  _noteTimer:    null,
  _combatTimer:  null,
  voiceEnabled:  true,
  _cachedVoice:  null,

  // ── Initialisation (une seule fois, après geste utilisateur) ──
  init() {
    if (this.ctx) return;
    this.ctx       = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.sfxGain   = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.gain.value = 0.26;
    this.sfxGain.gain.value   = 0.65;
  },

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._noteTimer);
    clearTimeout(this._combatTimer);
  },

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    const img = document.querySelector('#btn-voice img');
    if (img) img.src = this.voiceEnabled ? 'img/icons/voice_on.png' : 'img/icons/voice_off.png';
    return this.voiceEnabled;
  },

  // ── Bouton muet / son ─────────────────────────────────────────
  toggleMute() {
    this.isMuted = !this.isMuted;
    const img = document.querySelector('#btn-music img');
    if (this.isMuted) {
      this.stopMusic();
      if (img) img.src = 'img/icons/music_off.png';
    } else {
      if (img) img.src = 'img/icons/music_on.png';
      if (this.inCombat) this.startCombatMusic();
      else this.playAmbientMusic(this.currentFloor);
    }
    return this.isMuted;
  }
};

window.AudioSystem = AudioSystem;

// Préchauffer les voix SpeechSynthesis
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { AudioSystem._cachedVoice = null; };
  speechSynthesis.getVoices();
}
