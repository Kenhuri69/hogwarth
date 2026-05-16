// ============================================================
// help-tour.js — Tour guidé d'aide pour novices
// ------------------------------------------------------------
// Surbrillance (spotlight) des vrais éléments de l'UI + bulle
// explicative étape par étape. Lancé automatiquement à chaque
// nouvelle partie (sauf opt-out) et relançable via le bouton
// « Aide » de la barre de commandes.
//
// Chaque étape est aussi narrée à voix haute par McGonagall : des
// OGG pré-synthétisés via edge-tts (voix neurale Microsoft Azure
// `de-DE-SeraphinaMultilingualNeural`, identique à ses dialogues PNJ),
// joués par `AudioSystem.playVoice` — clés `mcgonagall_help_<n>`.
// Régénération : `tools/gen_voice_edge.py mcgonagall_help`.
// ============================================================

const HELP_TOUR_OPTOUT_KEY = 'hh_help_tour_optout';
const HELP_TOUR_VOICE_KEY  = 'hh_help_tour_voice';

// Chaque étape : { targets:[sélecteurs] (1er visible utilisé), title, text }.
// targets absent/null → bulle centrée sans spotlight.
const HELP_TOUR_STEPS = [
  {
    targets: null,
    title: 'Bienvenue à Poudlard !',
    text: 'Ce petit tour présente les commandes du jeu. Tu peux le passer ' +
          'à tout moment, et le relancer plus tard via le bouton « Aide ».'
  },
  {
    targets: ['#dungeon-canvas'],
    title: 'La vue du donjon',
    text: 'Le château se parcourt en vue 3D : couloirs, portes en bois, ' +
          'coffres, escaliers et fontaines apparaissent devant toi.'
  },
  {
    targets: ['.desktop-dir', '.mobile-dir'],
    title: 'Se déplacer',
    text: 'Avance, recule et pivote la caméra. Au clavier : W/Z A/Q S D ' +
          'ou les flèches. Sur mobile, glisse un doigt sur la vue 3D.'
  },
  {
    targets: ['#minimap', '#compass'],
    title: 'Te repérer',
    text: 'La minimap montre les salles explorées et ta position. ' +
          'La boussole indique la direction de ton regard.'
  },
  {
    targets: ['#char-card-0'],
    title: 'Ton groupe',
    text: 'Chaque héros a des PV (barre rouge), des PM (barre bleue, pour ' +
          'lancer des sorts) et partage la barre d\'XP du groupe.'
  },
  {
    targets: ['button[onclick="openInventory()"]'],
    title: 'Le Sac',
    text: 'Ton inventaire : potions, objets et équipement. Clique un objet ' +
          'pour l\'utiliser ou l\'équiper sur un personnage.'
  },
  {
    targets: ['button[onclick="openSpells()"]'],
    title: 'Les Sortilèges',
    text: 'La liste des sorts appris. On apprend de nouveaux sorts en ' +
          'montant de niveau, via des livres ou certains équipements.'
  },
  {
    targets: ['#btn-character'],
    title: 'La Fiche personnage',
    text: 'Toutes les stats détaillées. À chaque montée de niveau, un badge ▲ ' +
          'signale des points de caractéristique à répartir ici.'
  },
  {
    targets: ['button[onclick="openBestiary()"]'],
    title: 'Le Bestiaire',
    text: 'La fiche de chaque créature déjà rencontrée : lore, niveau de ' +
          'danger, résistances et faiblesses élémentaires.'
  },
  {
    targets: ['button[onclick="openQuestLog()"]'],
    title: 'Les Quêtes',
    text: 'Le journal de tes objectifs en cours et leurs récompenses. ' +
          'Remets une quête terminée pour gagner XP, or et objets.'
  },
  {
    targets: ['#btn-search'],
    title: 'Fouiller',
    text: 'Inspecte la salle courante pour dénicher des objets cachés. ' +
          'Pense à fouiller chaque pièce que tu traverses.'
  },
  {
    targets: ['button[onclick="rest()"]'],
    title: 'Se reposer',
    text: 'Récupère des PV et des PM hors combat. Le repos a un délai de ' +
          'récupération : à utiliser entre deux affrontements.'
  },
  {
    targets: null,
    title: 'Le combat',
    text: 'Les combats sont au tour par tour. À chaque tour : Attaquer, ' +
          'lancer un Sortilège, se mettre en Garde, utiliser un Objet ou ' +
          'Fuir. Exploite les faiblesses élémentaires des ennemis !'
  },
  {
    targets: ['button[onclick="openSaveDialog()"]'],
    title: 'Sauvegarder',
    text: 'Trois emplacements de sauvegarde manuels, plus une sauvegarde ' +
          'automatique. Charge une partie via le bouton voisin.'
  },
  {
    targets: ['button[onclick="startHelpTour()"]'],
    title: 'Besoin d\'aide ?',
    text: 'Ce bouton « Aide » rouvre ce guide quand tu veux. ' +
          'Bonne aventure à Poudlard !'
  }
];

let _helpTourStep   = 0;
let _helpTourActive = false;

function _htIsVisible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
}

function _htResolveTarget(targets) {
  if (!targets) return null;
  for (const sel of targets) {
    const el = document.querySelector(sel);
    if (_htIsVisible(el)) return el;
  }
  return null;
}

function _htOptedOut() {
  try { return localStorage.getItem(HELP_TOUR_OPTOUT_KEY) === '1'; }
  catch (e) { return false; }
}

// ── Narration vocale (voix McGonagall — OGG pré-synthétisés) ───
//
// Chaque étape est narrée par McGonagall : OGG générés via edge-tts
// (voix neurale Microsoft Azure de-DE-SeraphinaMultilingualNeural) et
// joués par AudioSystem.playVoice — clés `mcgonagall_help_<n>` dans
// AudioSystem._VOICE_SAMPLES (js/audio-music.js).

// La voix est active par défaut ; '0' en localStorage = coupée.
function _htVoiceEnabled() {
  try { return localStorage.getItem(HELP_TOUR_VOICE_KEY) !== '0'; }
  catch (e) { return true; }
}

function _htStopSpeak() {
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.stopVoice === 'function') {
    AudioSystem.stopVoice();
  }
}

// Narre l'étape courante avec la voix de McGonagall.
function _htSpeakStep() {
  _htStopSpeak();   // coupe toute narration en cours
  if (!_htVoiceEnabled()) return;
  if (typeof AudioSystem === 'undefined' || typeof AudioSystem.playVoice !== 'function') return;
  // playVoice gère lui-même la coupure audio globale (isMuted).
  AudioSystem.playVoice('mcgonagall_help_' + (_helpTourStep + 1));
}

function _htUpdateVoiceBtn() {
  const btn = document.getElementById('help-tour-voice');
  if (!btn) return;
  const on = _htVoiceEnabled();
  btn.textContent = on ? '🔊' : '🔇';
  btn.title = on ? 'Couper la voix' : 'Activer la voix';
}

function _htBuildDom() {
  if (document.getElementById('help-tour-overlay')) return;
  const root = document.createElement('div');
  root.id = 'help-tour-overlay';
  root.innerHTML =
    '<div id="help-tour-backdrop"></div>' +
    '<div id="help-tour-spotlight"></div>' +
    '<div id="help-tour-bubble" role="dialog" aria-modal="true" aria-labelledby="help-tour-title">' +
      '<div id="help-tour-head-btns">' +
        '<button id="help-tour-voice" type="button" aria-label="Activer ou couper la voix">🔊</button>' +
        '<button id="help-tour-x" type="button" aria-label="Fermer l\'aide">✕</button>' +
      '</div>' +
      '<div id="help-tour-step-count"></div>' +
      '<div id="help-tour-title"></div>' +
      '<div id="help-tour-text"></div>' +
      '<label id="help-tour-optout"><input type="checkbox" id="help-tour-optout-cb"> Ne plus afficher au démarrage</label>' +
      '<div id="help-tour-nav">' +
        '<button id="help-tour-skip" type="button">Passer</button>' +
        '<span id="help-tour-nav-right">' +
          '<button id="help-tour-prev" type="button">‹ Précédent</button>' +
          '<button id="help-tour-next" type="button">Suivant ›</button>' +
        '</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  root.querySelector('#help-tour-x').addEventListener('click', helpTourEnd);
  root.querySelector('#help-tour-skip').addEventListener('click', helpTourEnd);
  root.querySelector('#help-tour-prev').addEventListener('click', helpTourPrev);
  root.querySelector('#help-tour-next').addEventListener('click', helpTourNext);
  root.querySelector('#help-tour-voice').addEventListener('click', helpTourToggleVoice);
  root.querySelector('#help-tour-optout-cb').addEventListener('change', function () {
    try {
      if (this.checked) localStorage.setItem(HELP_TOUR_OPTOUT_KEY, '1');
      else localStorage.removeItem(HELP_TOUR_OPTOUT_KEY);
    } catch (e) { /* localStorage indisponible : opt-out non persisté */ }
  });
}

function _htRender() {
  const step   = HELP_TOUR_STEPS[_helpTourStep];
  const target = _htResolveTarget(step.targets);
  const spot   = document.getElementById('help-tour-spotlight');
  const bubble = document.getElementById('help-tour-bubble');
  if (!step || !spot || !bubble) return;

  document.getElementById('help-tour-title').textContent = step.title;
  document.getElementById('help-tour-text').textContent  = step.text;
  document.getElementById('help-tour-step-count').textContent =
    'Étape ' + (_helpTourStep + 1) + ' / ' + HELP_TOUR_STEPS.length;
  _htUpdateVoiceBtn();

  const prevBtn = document.getElementById('help-tour-prev');
  const nextBtn = document.getElementById('help-tour-next');
  prevBtn.disabled = _helpTourStep === 0;
  const isLast = _helpTourStep === HELP_TOUR_STEPS.length - 1;
  nextBtn.textContent = isLast ? 'Terminer ✓' : 'Suivant ›';

  const backdrop = document.getElementById('help-tour-backdrop');
  const PAD = 8;
  if (target) {
    // Le spotlight assombrit déjà tout l'écran : pas de voile additionnel.
    if (backdrop) backdrop.style.display = 'none';
    const r = target.getBoundingClientRect();
    spot.style.display = 'block';
    spot.style.top    = (r.top - PAD) + 'px';
    spot.style.left   = (r.left - PAD) + 'px';
    spot.style.width  = (r.width + PAD * 2) + 'px';
    spot.style.height = (r.height + PAD * 2) + 'px';
  } else {
    spot.style.display = 'none';
    if (backdrop) backdrop.style.display = 'block';
  }

  // Positionnement de la bulle : sous la cible si la place le permet,
  // sinon au-dessus, sinon centrée.
  bubble.style.visibility = 'hidden';
  bubble.classList.remove('help-tour-centered');
  bubble.style.top = bubble.style.left = '';
  // Forcer un layout pour mesurer la bulle.
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!target) {
    bubble.classList.add('help-tour-centered');
  } else {
    const r = target.getBoundingClientRect();
    let top, left;
    if (r.bottom + bh + 16 <= vh) {
      top = r.bottom + 14;
    } else if (r.top - bh - 16 >= 0) {
      top = r.top - bh - 14;
    } else {
      top = Math.max(8, (vh - bh) / 2);
    }
    left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(left, vw - bw - 8));
    bubble.style.top  = top + 'px';
    bubble.style.left = left + 'px';
  }
  bubble.style.visibility = 'visible';
}

function _htKeyHandler(e) {
  if (!_helpTourActive) return;
  // Isolation totale : aucun raccourci de jeu ne doit se déclencher.
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    helpTourEnd();
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.preventDefault();
    helpTourNext();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    helpTourPrev();
  }
}

function startHelpTour() {
  if (_helpTourActive) return;
  _helpTourActive = true;
  window._helpTourActive = true;
  _helpTourStep = 0;
  _htBuildDom();
  document.getElementById('help-tour-overlay').style.display = 'block';
  const cb = document.getElementById('help-tour-optout-cb');
  if (cb) cb.checked = _htOptedOut();
  document.addEventListener('keydown', _htKeyHandler, true);
  window.addEventListener('resize', _htRender);
  _htRender();
  _htSpeakStep();
}

function helpTourNext() {
  if (_helpTourStep >= HELP_TOUR_STEPS.length - 1) { helpTourEnd(); return; }
  _helpTourStep++;
  _htRender();
  _htSpeakStep();
}

function helpTourPrev() {
  if (_helpTourStep <= 0) return;
  _helpTourStep--;
  _htRender();
  _htSpeakStep();
}

// Bascule la voix synthétisée ; relit l'étape courante si réactivée.
function helpTourToggleVoice() {
  const on = !_htVoiceEnabled();
  try { localStorage.setItem(HELP_TOUR_VOICE_KEY, on ? '1' : '0'); }
  catch (e) { /* localStorage indisponible : préférence non persistée */ }
  _htUpdateVoiceBtn();
  if (on) _htSpeakStep();
  else _htStopSpeak();
}

function helpTourEnd() {
  _helpTourActive = false;
  window._helpTourActive = false;
  _htStopSpeak();
  document.removeEventListener('keydown', _htKeyHandler, true);
  window.removeEventListener('resize', _htRender);
  const root = document.getElementById('help-tour-overlay');
  if (root) root.remove();
}

// Lancement auto à chaque nouvelle partie, sauf opt-out.
function maybeAutoStartHelpTour() {
  if (_htOptedOut()) return;
  startHelpTour();
}

window.startHelpTour        = startHelpTour;
window.helpTourNext         = helpTourNext;
window.helpTourPrev         = helpTourPrev;
window.helpTourEnd          = helpTourEnd;
window.helpTourToggleVoice  = helpTourToggleVoice;
window.maybeAutoStartHelpTour = maybeAutoStartHelpTour;
