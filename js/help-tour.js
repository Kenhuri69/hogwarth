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
// `fr-FR-DeniseNeural`, féminine posée et autoritaire),
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
    targets: ['button[onclick="openSettingsModal()"]'],
    title: 'Sauvegarder',
    text: 'Le bouton « Réglages » regroupe Sauver et Charger : trois ' +
          'emplacements manuels plus une sauvegarde automatique. Tu y ' +
          'ajustes aussi le son et la difficulté.'
  },
  {
    targets: ['button[onclick="openSettingsModal()"]'],
    title: 'Besoin d\'aide ?',
    text: 'Le bouton « Aide », dans les Réglages, rouvre ce guide quand tu ' +
          'veux — et te laisse choisir un sujet précis. Bonne aventure à ' +
          'Poudlard !'
  }
];

// Tuto contextuel du premier combat (LOT D2). Une seule étape ciblée sur
// la barre d'actions — réutilise l'infra du tour guidé (bulle + spotlight)
// sans voix ni opt-out global. Affiché une fois par partie via le flag de
// save `combatTutorialSeen` (cf. state.js / save.js).
const COMBAT_TUTORIAL_STEPS = [
  {
    targets: ['.battle-actions', '#encounter-overlay'],
    title: 'Ton premier combat !',
    text: 'Les affrontements sont au tour par tour. À chaque tour, choisis : ' +
          '🗡️ Attaquer (coup physique), ✨ Sortilège (coûte des PM, exploite ' +
          'les faiblesses élémentaires 💥), 🛡️ Garde (réduit les dégâts reçus ' +
          'et régénère des PM), 🧪 Objet (potions) ou 💨 Fuir. Astuce : gèle ou ' +
          'fais saigner un ennemi puis frappe-le pour un bonus de combo !'
  }
];
const COMBAT_TUTO_SEEN_FALLBACK_KEY = 'hh_combat_tuto_seen';

// Sections thématiques pour le menu « Quelle aide ? » (LOT D4). Chaque
// section est un slice de HELP_TOUR_STEPS ; `start`/`end` (exclusif) servent
// au slice ET au décalage de narration (voiceOffset = start). L'étape 0
// (Bienvenue) et l'étape 14 (rappel du bouton Aide) ne sont couvertes que par
// « Tout le guide ».
const HELP_TOUR_SECTIONS = [
  { icon: '🧭', label: 'Explorer le donjon',   start: 1,  end: 4  },
  { icon: '👥', label: 'Groupe & menus',        start: 4,  end: 10 },
  { icon: '⚔️', label: 'Combat & survie',       start: 10, end: 13 },
  { icon: '💾', label: 'Sauvegarder',           start: 13, end: 15 },
];

let _helpTourStep   = 0;
let _helpTourActive = false;
let _htSteps        = HELP_TOUR_STEPS;   // jeu d'étapes courant (override possible)
let _htOpts         = {};                // options du lancement courant
let _htVoiceOffset  = 0;                 // décalage de narration (sections D4)

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
// (voix neurale Microsoft Azure fr-FR-DeniseNeural) et
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
  if (_htOpts.noVoice) return;             // tuto ciblé : pas de narration
  if (typeof AudioSystem === 'undefined' || typeof AudioSystem.playVoice !== 'function') return;
  // playVoice gère lui-même la coupure audio globale (isMuted).
  // _htVoiceOffset (sections D4) réaligne la clé sur la position d'origine
  // de l'étape dans HELP_TOUR_STEPS.
  AudioSystem.playVoice('mcgonagall_help_' + (_htVoiceOffset + _helpTourStep + 1));
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
  const step   = _htSteps[_helpTourStep];
  const target = _htResolveTarget(step.targets);
  const spot   = document.getElementById('help-tour-spotlight');
  const bubble = document.getElementById('help-tour-bubble');
  if (!step || !spot || !bubble) return;

  document.getElementById('help-tour-title').textContent = step.title;
  document.getElementById('help-tour-text').textContent  = step.text;
  // Le compteur d'étapes n'a de sens qu'au-delà d'une seule étape.
  const stepCount = document.getElementById('help-tour-step-count');
  stepCount.style.display = _htSteps.length > 1 ? '' : 'none';
  stepCount.textContent =
    'Étape ' + (_helpTourStep + 1) + ' / ' + _htSteps.length;
  // Voix / opt-out masqués pour un tuto ciblé.
  const voiceBtn = document.getElementById('help-tour-voice');
  if (voiceBtn) voiceBtn.style.display = _htOpts.noVoice ? 'none' : '';
  const optoutRow = document.getElementById('help-tour-optout');
  if (optoutRow) optoutRow.style.display = _htOpts.hideOptout ? 'none' : '';
  _htUpdateVoiceBtn();

  const prevBtn = document.getElementById('help-tour-prev');
  const nextBtn = document.getElementById('help-tour-next');
  // Bouton « Précédent » inutile sur un tuto à étape unique.
  prevBtn.style.display = _htSteps.length > 1 ? '' : 'none';
  prevBtn.disabled = _helpTourStep === 0;
  const isLast = _helpTourStep === _htSteps.length - 1;
  nextBtn.textContent = isLast ? (_htSteps.length > 1 ? 'Terminer ✓' : 'Compris ✓') : 'Suivant ›';

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

function startHelpTour(stepsOverride, opts) {
  if (_helpTourActive) return;
  _helpTourActive = true;
  window._helpTourActive = true;
  _htSteps = (Array.isArray(stepsOverride) && stepsOverride.length) ? stepsOverride : HELP_TOUR_STEPS;
  _htOpts  = opts || {};
  _htVoiceOffset = _htOpts.voiceOffset | 0;
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
  if (_helpTourStep >= _htSteps.length - 1) { helpTourEnd(); return; }
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
  // Retour au jeu d'étapes par défaut pour le prochain lancement (bouton Aide).
  _htSteps = HELP_TOUR_STEPS;
  _htOpts  = {};
  _htVoiceOffset = 0;
}

// Lancement auto à chaque nouvelle partie, sauf opt-out.
function maybeAutoStartHelpTour() {
  if (_htOptedOut()) return;
  startHelpTour();
}

// Tuto contextuel du premier combat (LOT D2). Affiché une seule fois par
// partie : la source de vérité est le flag de save `combatTutorialSeen`,
// avec repli localStorage si l'état de jeu n'est pas disponible. Ne se
// superpose jamais au tour guidé ni à lui-même.
function maybeShowCombatTutorial() {
  if (_helpTourActive) return;
  // Flag de partie prioritaire (réinitialisé par startGame, sérialisé).
  if (typeof combatTutorialSeen !== 'undefined') {
    if (combatTutorialSeen) return;
    combatTutorialSeen = true;
  } else {
    let seen = false;
    try { seen = localStorage.getItem(COMBAT_TUTO_SEEN_FALLBACK_KEY) === '1'; } catch (e) {}
    if (seen) return;
    try { localStorage.setItem(COMBAT_TUTO_SEEN_FALLBACK_KEY, '1'); } catch (e) {}
  }
  startHelpTour(COMBAT_TUTORIAL_STEPS, { noVoice: true, hideOptout: true });
}

// ── Menu « Quelle aide ? » (LOT D4) ────────────────────────────
// Le bouton « Aide » de la barre de commandes ouvre ce sélecteur plutôt
// que de relancer systématiquement le tour complet depuis l'étape 1.
// « Tout le guide » → tour complet ; chaque section → slice + voiceOffset.

function _hmBuildDom() {
  if (document.getElementById('help-menu-overlay')) return;
  const root = document.createElement('div');
  root.id = 'help-menu-overlay';
  const sectionBtns = HELP_TOUR_SECTIONS.map((s, i) =>
    '<button type="button" class="help-menu-item" data-section="' + i + '">' +
      '<span class="help-menu-ico">' + s.icon + '</span>' + s.label +
    '</button>'
  ).join('');
  root.innerHTML =
    '<div id="help-menu-backdrop"></div>' +
    '<div id="help-menu-card" role="dialog" aria-modal="true" aria-labelledby="help-menu-title">' +
      '<button id="help-menu-x" type="button" aria-label="Fermer">✕</button>' +
      '<div id="help-menu-title">Quelle aide ?</div>' +
      '<div id="help-menu-list">' +
        '<button type="button" class="help-menu-item help-menu-all" data-section="all">' +
          '<span class="help-menu-ico">📖</span>Tout le guide' +
        '</button>' +
        sectionBtns +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  root.querySelector('#help-menu-x').addEventListener('click', closeHelpMenu);
  root.querySelector('#help-menu-backdrop').addEventListener('click', closeHelpMenu);
  root.querySelectorAll('.help-menu-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      helpMenuStart(this.getAttribute('data-section'));
    });
  });
}

function openHelpMenu() {
  if (_helpTourActive) return;          // ne pas empiler sur un tour en cours
  _hmBuildDom();
  document.getElementById('help-menu-overlay').style.display = 'block';
}

function closeHelpMenu() {
  const root = document.getElementById('help-menu-overlay');
  if (root) root.remove();
}

// Lance la section choisie (index) ou le tour complet ('all').
function helpMenuStart(which) {
  closeHelpMenu();
  if (which === 'all') { startHelpTour(); return; }
  const sec = HELP_TOUR_SECTIONS[which | 0];
  if (!sec) { startHelpTour(); return; }
  const slice = HELP_TOUR_STEPS.slice(sec.start, sec.end);
  startHelpTour(slice, { voiceOffset: sec.start, hideOptout: true });
}

// ============================================================
// Mini-tours contextuels endgame (P2.4) — one-shot à la 1ʳᵉ ouverture de
// Forge / Bibliothèque / Atelier. Réutilise l'infra help-tour ; respecte
// l'opt-out global et ne double jamais un tour déjà actif.
// ============================================================
const FORGE_TOUR_STEPS = [
  { targets: ['#forge-list'],
    title: 'La Forge des Ténèbres',
    text: 'Ici tu améliores tes objets ÉQUIPÉS : chaque palier renforce leurs ' +
          'bonus. Clique un objet pour le forger.' },
  { targets: ['#forge-essence'],
    title: 'Le carburant',
    text: 'Forger coûte de l\'or ET de l\'Essence des Ténèbres (drop de Boucle). ' +
          'L\'Essence Primordiale 🔮 débloque les paliers les plus hauts.' },
];
const LIBRARY_TOUR_STEPS = [
  { targets: ['#library-list'],
    title: 'La Bibliothèque Interdite',
    text: 'Le pendant de la Forge pour tes SORTS : augmente leur puissance ' +
          'palier par palier.' },
  { targets: ['#library-pages'],
    title: 'Les pages de grimoire',
    text: 'Étudier consomme de l\'or et des Pages de Grimoire, récoltées en ' +
          'Boucle Ténébreuse.' },
];
const ATELIER_TOUR_STEPS = [
  { targets: ['#atelier-voyageur-overlay .atelier-tabs', '#atelier-voyageur-overlay'],
    title: 'L\'Atelier du Voyageur',
    text: 'Ton hub inter-mondes : souvenirs, cosmétiques et sorts cross-plan ' +
          'rapportés de tes visites. Explore les onglets.' },
];

// Déclenche un mini-tour une seule fois (flag localStorage), sauf opt-out
// global ou tour déjà actif. Petit délai pour laisser la modale se peindre.
function _maybeContextTour(flagKey, steps) {
  if (_helpTourActive) return;
  try { if (localStorage.getItem(flagKey) === '1') return; } catch (e) { /* localStorage indispo */ }
  if (_htOptedOut()) return;
  setTimeout(function () {
    if (_helpTourActive) return;
    try { localStorage.setItem(flagKey, '1'); } catch (e) { /* non persisté */ }
    startHelpTour(steps, { hideOptout: true });
  }, 350);
}
function maybeForgeTour()   { _maybeContextTour('hh_tour_forge_seen',   FORGE_TOUR_STEPS); }
function maybeLibraryTour() { _maybeContextTour('hh_tour_library_seen', LIBRARY_TOUR_STEPS); }
function maybeAtelierTour() { _maybeContextTour('hh_tour_atelier_seen', ATELIER_TOUR_STEPS); }

window.maybeForgeTour       = maybeForgeTour;
window.maybeLibraryTour     = maybeLibraryTour;
window.maybeAtelierTour     = maybeAtelierTour;
window.openHelpMenu         = openHelpMenu;
window.closeHelpMenu        = closeHelpMenu;
window.helpMenuStart        = helpMenuStart;
window.startHelpTour        = startHelpTour;
window.maybeShowCombatTutorial = maybeShowCombatTutorial;
window.helpTourNext         = helpTourNext;
window.helpTourPrev         = helpTourPrev;
window.helpTourEnd          = helpTourEnd;
window.helpTourToggleVoice  = helpTourToggleVoice;
window.maybeAutoStartHelpTour = maybeAutoStartHelpTour;
