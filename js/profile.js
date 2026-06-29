// ============================================================
// PROFILE — Profil joueur persistant hors-save + New Game+ (Chapitre 14, P5)
// ------------------------------------------------------------
// Mémoire LÉGÈRE inter-parties, totalement DISTINCTE des sauvegardes de partie
// (`hogwarts_rpg_saves`). Stocke uniquement : nombre de victoires, fins
// débloquées et titres honorifiques dérivés. Sert deux surfaces purement
// cosmétiques :
//   1. New Game+ opt-in (cadre « Vétéran » + titre affiché en partie) ;
//   2. Codex du Sorcier (panneau repliable du hub de démarrage).
//
// GARDE-FOU ÉQUILIBRAGE (cardinal, équilibrage 13) : ZÉRO stat / objet / or
// hérité. Le profil n'est JAMAIS lu par un calcul de gameplay — seulement par
// le rendu UI et la cosmétique opt-in. Modèle : l'Almanach de la Salle sur
// Demande (`hogwarts_rpg_requirement_codex`, save-slots.js) — même patron
// localStorage défensif (try/catch ; Safari privé peut throw).
// ============================================================

const PROFILE_KEY = 'hogwarts_rpg_profile';

function _profileEmpty() {
  return {
    version: 1,
    victories: 0,
    pactVictories: 0,
    cyclesBroken: 0,
    sealedDeaths: 0,   // morts en Poche du Sceau (Ironman) — héritage Boucle (Lot 3)
    endingsSeen: { victory: false, victory_pact: false, cycle_broken: false },
    titles: []
  };
}

function _profileRead() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return _profileEmpty();
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') throw new Error('shape');
    const base = _profileEmpty();
    base.victories     = (typeof obj.victories === 'number')     ? obj.victories     : 0;
    base.pactVictories = (typeof obj.pactVictories === 'number') ? obj.pactVictories : 0;
    base.cyclesBroken  = (typeof obj.cyclesBroken === 'number')  ? obj.cyclesBroken  : 0;
    base.sealedDeaths  = (typeof obj.sealedDeaths === 'number')  ? obj.sealedDeaths  : 0;
    if (obj.endingsSeen && typeof obj.endingsSeen === 'object') {
      base.endingsSeen.victory      = !!obj.endingsSeen.victory;
      base.endingsSeen.victory_pact = !!obj.endingsSeen.victory_pact;
      base.endingsSeen.cycle_broken = !!obj.endingsSeen.cycle_broken;
    }
    base.titles = Array.isArray(obj.titles) ? obj.titles.filter(t => typeof t === 'string') : [];
    return base;
  } catch (e) {
    return _profileEmpty();
  }
}

function _profileWrite(obj) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
    return true;
  } catch (e) {
    return false;
  }
}

// Lecture publique (rendu du Codex de profil + opt-in).
function getPlayerProfile() {
  return _profileRead();
}

// PUR & testable (units.js) — titres honorifiques dérivés du profil. Aucun
// effet mécanique. « Briseur de Cycle » porte un compteur ★N à partir de 2.
function computeProfileTitles(profile) {
  profile = profile || {};
  const seen = profile.endingsSeen || {};
  const titles = [];
  if (profile.victories >= 1 || seen.victory) titles.push("Vainqueur de l'Ombre");
  if (profile.pactVictories >= 1 || seen.victory_pact) titles.push('Diplomate des Cachots');
  const cycles = profile.cyclesBroken | 0;
  if (cycles >= 1 || seen.cycle_broken) {
    titles.push(cycles >= 2 ? `Briseur de Cycle ★${cycles}` : 'Briseur de Cycle');
  }
  // Escape Game (Lot 3) — héritage d'une mort en Poche du Sceau (Ironman).
  if ((profile.sealedDeaths | 0) >= 1) titles.push('Scellé dans la Boucle');
  return titles;
}

// PUR & testable — titre le plus prestigieux à afficher (Briseur > Diplomate >
// Vainqueur). Chaîne vide si le profil est vierge.
function profileTopTitle(profile) {
  const titles = computeProfileTitles(profile);
  if (!titles.length) return '';
  const cyclic = titles.find(t => t.startsWith('Briseur de Cycle'));
  if (cyclic) return cyclic;
  if (titles.includes('Diplomate des Cachots')) return 'Diplomate des Cachots';
  return titles[titles.length - 1];
}

// Enregistre une fin atteinte dans le profil persistant. `endingType` provient
// de computeEndingType (endgame.js) : 'victory' | 'victory_pact' | 'cycle_broken'.
// Idempotence par RUN garantie en amont (gates victoryAchieved / cycleBroken
// qui ne re-déclenchent pas). No-op défensif sur valeur inconnue.
function recordEndingToProfile(endingType) {
  if (!endingType) return false;
  const p = _profileRead();
  if (endingType === 'victory' || endingType === 'victory_pact') {
    p.victories = (p.victories | 0) + 1;
    p.endingsSeen.victory = true;
    if (endingType === 'victory_pact') {
      p.pactVictories = (p.pactVictories | 0) + 1;
      p.endingsSeen.victory_pact = true;
    }
  } else if (endingType === 'cycle_broken') {
    // La victoire est déjà comptée plus tôt dans le même run — on n'incrémente
    // que le compteur de Cycles brisés.
    p.cyclesBroken = (p.cyclesBroken | 0) + 1;
    p.endingsSeen.cycle_broken = true;
  } else {
    return false;
  }
  p.titles = computeProfileTitles(p);
  return _profileWrite(p);
}

// Escape Game (Lot 3) — enregistre une mort en Poche du Sceau (Ironman). Trace
// persistante hors-save : débloque le titre « Scellé dans la Boucle ». Appelé
// par triggerDeath via _escapeOnWardenDefeat (escape-pocket.js).
function recordSealedDeathToProfile() {
  const p = _profileRead();
  p.sealedDeaths = (p.sealedDeaths | 0) + 1;
  p.titles = computeProfileTitles(p);
  return _profileWrite(p);
}

// New Game+ disponible dès la 1ʳᵉ victoire enregistrée au profil.
function ngPlusAvailable() {
  return _profileRead().victories >= 1;
}

// Cran NG+ empilable = nombre de victoires enregistrées, plafonné à NGPLUS_CAP
// (dungeon-scaling.js). Chaque run terminé (victoire) débloque le cran suivant.
// 0 si aucune victoire. Lu par confirmHeroSelection pour armer `ngPlusLevel`.
function ngPlusMaxLevel() {
  const v = _profileRead().victories | 0;
  const cap = (typeof NGPLUS_CAP === 'number') ? NGPLUS_CAP : 10;
  return Math.max(0, Math.min(v, cap));
}

// ── Codex du Sorcier (modale dédiée du hub de démarrage, P6) ──────
// Bouton #hub-codex-btn (masqué si profil vierge) → openWizardCodex() ouvre
// #wizard-codex-modal ; renderProfileCodex peuple le corps #wizard-codex-body.
// Lecture seule, purement honorifique (aucun avantage hérité).

// Les 3 fins canoniques (révélées / à découvrir), sans spoiler de mécanique.
const _PROFILE_ENDINGS = [
  { key: 'victory',      icon: '🏆', name: "L'Ombre s'efface",  hint: 'Vaincre Lord Voldemort' },
  { key: 'victory_pact', icon: '🐍', name: 'Le Pacte scellé',   hint: 'Vaincre après avoir scellé le Pacte des Cachots' },
  { key: 'cycle_broken', icon: '🕊️', name: 'Le Cycle brisé',    hint: 'Briser la Boucle Ténébreuse' }
];

// Rend le corps de la modale Codex du Sorcier (#wizard-codex-body).
function renderProfileCodex() {
  const el = document.getElementById('wizard-codex-body');
  if (!el) return;
  const p = _profileRead();
  const esc = (typeof htmlEscape === 'function') ? htmlEscape : (s => String(s));

  // Bandeau du titre dominant (médaillon Vétéran si au moins un titre).
  const top = profileTopTitle(p);
  const banner = top
    ? `<div class="wcodex-banner"><img class="wcodex-medal" src="img/icons/ngplus_veteran.png" alt="">`
      + `<span class="wcodex-top-title">${esc(top)}</span></div>`
    : `<div class="wcodex-banner wcodex-banner-empty">Aucune fin atteinte pour l'instant.</div>`;

  const titles = computeProfileTitles(p);
  const titleChips = titles.length
    ? titles.map(t => `<span class="prof-title">${esc(t)}</span>`).join('')
    : '<span class="prof-title prof-title-empty">—</span>';

  const endingPills = _PROFILE_ENDINGS.map(e => {
    const got = !!(p.endingsSeen && p.endingsSeen[e.key]);
    const label = got ? e.name : '???';
    const title = got ? e.name : `${e.name} — ${e.hint}`;
    return `<span class="prof-ending ${got ? 'seen' : 'locked'}" title="${esc(title)}">`
         + `${got ? e.icon : '·'} ${esc(label)}</span>`;
  }).join('');
  const gotEndings = _PROFILE_ENDINGS.filter(e => p.endingsSeen && p.endingsSeen[e.key]).length;

  el.innerHTML = `
    ${banner}
    <div class="wcodex-sub">Mémoire de tes parties achevées. Purement honorifique — aucun avantage hérité.</div>
    <div class="wcodex-stats">
      <span class="wcodex-stat"><b>${p.victories | 0}</b> victoire${(p.victories | 0) > 1 ? 's' : ''}</span>
      <span class="wcodex-stat"><b>${p.cyclesBroken | 0}</b> cycle${(p.cyclesBroken | 0) > 1 ? 's' : ''} brisé${(p.cyclesBroken | 0) > 1 ? 's' : ''}</span>
    </div>
    <div class="wcodex-section-label">Titres</div>
    <div class="prof-titles">${titleChips}</div>
    <div class="wcodex-section-label">Fins découvertes · ${gotEndings}/${_PROFILE_ENDINGS.length}</div>
    <div class="prof-endings">${endingPills}</div>`;
}

function openWizardCodex() {
  renderProfileCodex();
  const m = document.getElementById('wizard-codex-modal');
  if (m) m.style.display = 'flex';
}

function closeWizardCodex() {
  const m = document.getElementById('wizard-codex-modal');
  if (m) m.style.display = 'none';
}

// Visibilité du bouton « Codex du Sorcier » du hub. Masqué tant que le profil
// est vierge (aucun spoiler de fin). Appelé par enterStartHub (save-ui.js).
function _refreshHubCodexBtn() {
  const btn = document.getElementById('hub-codex-btn');
  if (!btn) return;
  const p = _profileRead();
  const has = (p.victories | 0) > 0 || (p.cyclesBroken | 0) > 0;
  btn.style.display = has ? '' : 'none';
}

// Visibilité de la case New Game+ à l'étape 1 du player-select. Affichée
// uniquement si le profil a au moins une victoire. Décoche par défaut.
function _refreshNgPlusOptIn() {
  const row = document.getElementById('ngplus-optin-row');
  if (!row) return;
  const avail = ngPlusAvailable();
  row.style.display = avail ? 'flex' : 'none';
  if (!avail) {
    const cb = document.getElementById('ngplus-toggle');
    if (cb) cb.checked = false;
    return;
  }
  // Affiche le cran disponible + l'ampleur du défi dans le libellé opt-in.
  const lvl = (typeof ngPlusMaxLevel === 'function') ? ngPlusMaxLevel() : 1;
  const titleEl = row.querySelector('.psel-ngplus-title');
  const hintEl  = row.querySelector('.psel-ngplus-hint');
  if (titleEl) titleEl.textContent = `✦ Nouvelle Partie+ ${lvl}`;
  if (hintEl) {
    const statPct   = Math.round((typeof NGPLUS_STAT_PER_LEVEL   === 'number' ? NGPLUS_STAT_PER_LEVEL   : 0.20) * lvl * 100);
    const rewardPct = Math.round((typeof NGPLUS_REWARD_PER_LEVEL === 'number' ? NGPLUS_REWARD_PER_LEVEL : 0.25) * lvl * 100);
    hintEl.textContent = `Ennemis +${statPct} % · butin +${rewardPct} %. Aucun héritage. (Cran = victoires.)`;
  }
}
