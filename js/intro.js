// ============================================================
// INTRO SCREEN — étape narrative du flow nouvelle partie
// ============================================================
// S'insère entre la sélection de Maison et le démarrage effectif du
// donjon. Le PNJ guide (Dumbledore) accueille le joueur, propose la
// quête `intro_tutoriel` et indique qu'il faudra le retrouver dans
// l'exploration pour récupérer la récompense.
//
// Une fois le bouton final cliqué :
//   - acceptQuest('intro_tutoriel')      ajoute la quête à activeQuests
//   - seenNpcs.add('dumbledore')         évite de re-jouer le greeting
//                                         lors d'une rencontre en jeu
//   - onContinue()                       lance startGame()

let _introPages    = [];
let _introPage     = 0;
let _introOnDone   = null;

function showIntroScreen(onContinue) {
  const npc = (typeof getNpcById === 'function') ? getNpcById('dumbledore') : null;
  if (!npc) {
    // Fallback de sûreté : pas d'intro si le PNJ guide n'existe pas
    if (typeof onContinue === 'function') onContinue();
    return;
  }

  // Portrait : raster (priorité 1) > emoji
  const portraitEl = document.getElementById('intro-portrait');
  if (portraitEl) {
    portraitEl.innerHTML = npc.portraitImg
      ? `<img src="${npc.portraitImg}" alt="${npc.name || ''}" class="intro-portrait-img">`
      : (npc.icon || '🧙');
  }
  const nameEl = document.getElementById('intro-name');
  if (nameEl) nameEl.textContent = npc.name || '';
  const subEl  = document.getElementById('intro-subtitle');
  if (subEl)   subEl.textContent  = npc.title || '';

  const greeting = (npc.dialogues && npc.dialogues.greeting) || '...';
  _introPages  = Array.isArray(greeting) ? greeting.slice() : [greeting];
  _introPage   = 0;
  _introOnDone = onContinue;
  _renderIntroPage();

  document.getElementById('intro-screen').style.display = 'flex';
  // Cinématique d'arrivée (Lot 3) : bougies flottantes derrière la carte.
  // Défensif + no-op sous reduced-motion (voir js/cinematics.js).
  if (window.CIN_safe) window.CIN_safe.introAmbiance(true);
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playNpcGreet === 'function') {
    // Geste utilisateur déjà donné via chooseHouse → init() est OK ici.
    AudioSystem.init();
    AudioSystem.playNpcGreet();
    // Démarre la musique d'ambiance dès l'intro Dumbledore (zone 1-2).
    // startGame appellera à nouveau playAmbientMusic(1) mais celle-ci est
    // no-op si la même zone tourne déjà (voir audio-music.js).
    if (typeof AudioSystem.playAmbientMusic === 'function') {
      AudioSystem.playAmbientMusic(1);
    }
  }
}

function _renderIntroPage() {
  const total = _introPages.length;
  const textEl = document.getElementById('intro-text');
  if (textEl) {
    const pagerHtml = total > 1
      ? `<div class="intro-pager">${_introPage + 1} / ${total}</div>` : '';
    textEl.innerHTML = `<div class="intro-page-text">${_introPages[_introPage]}</div>${pagerHtml}`;
  }
  const actionsEl = document.getElementById('intro-actions');
  if (!actionsEl) return;

  if (_introPage < total - 1) {
    actionsEl.innerHTML = `<button class="explore-btn" onclick="_advanceIntro()">Suivant ▸</button>`;
  } else {
    actionsEl.innerHTML =
      `<button class="explore-btn" onclick="_finishIntro()">Accepter & Entrer à Poudlard</button>`;
  }

  // Voix narrative Dumbledore : un fichier par page (cf. plan voice-intro-dumbledore.md).
  // Fallback silencieux si la clé n'est pas dans _VOICE_SAMPLES.
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playVoice === 'function') {
    AudioSystem.playVoice('dumbledore_intro_' + (_introPage + 1));
  }

  // Sous-titres karaoké : surligne le texte au rythme de la voix.
  if (typeof Karaoke !== 'undefined') {
    const pageEl = document.querySelector('#intro-text .intro-page-text');
    if (pageEl) { Karaoke.wrap(pageEl); Karaoke.start(pageEl); }
  }
}

function _advanceIntro() {
  if (_introPage < _introPages.length - 1) {
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.stopVoice === 'function') {
      AudioSystem.stopVoice();
    }
    _introPage++;
    _renderIntroPage();
  }
}

function _finishIntro() {
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.stopVoice === 'function') {
    AudioSystem.stopVoice();
  }
  if (typeof Karaoke !== 'undefined') Karaoke.stop();
  if (window.CIN_safe) window.CIN_safe.introAmbiance(false);
  // Acceptation auto de la 1re quête : c'est le contrat narratif de l'intro.
  if (typeof acceptQuest === 'function') acceptQuest('intro_tutoriel');
  // Marquer le PNJ guide comme rencontré : le greeting ne se rejouera pas
  // lorsque le joueur le retrouvera dans le donjon (state.questActive).
  if (typeof seenNpcs !== 'undefined') seenNpcs.add('dumbledore');

  document.getElementById('intro-screen').style.display = 'none';

  const fn = _introOnDone;
  _introOnDone = null;
  if (typeof fn === 'function') fn();
}
