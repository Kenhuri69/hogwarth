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

// Les 6 éléments canoniques des Livres de Maîtrise (data-items.js,
// type:"masterybook") — ordre canonique de la Bibliothèque des Maîtrises.
const PROFILE_MASTERY_ELEMENTS = ['feu', 'glace', 'foudre', 'lumière', 'ténèbres', 'physique'];

function _profileEmpty() {
  return {
    version: 1,
    victories: 0,
    pactVictories: 0,
    cyclesBroken: 0,
    sealedDeaths: 0,   // morts en Poche du Sceau (Ironman) — héritage Boucle (Lot 3)
    endingsSeen: { victory: false, victory_pact: false, cycle_broken: false },
    titles: [],
    // Bibliothèque des Maîtrises (P7) — union CROSS-RUN des éléments dont un
    // Livre de Maîtrise a été lu. PUREMENT cosmétique : le buff (+12 %) reste
    // `elementalMastery`, within-run — cette liste n'est JAMAIS lue par un
    // calcul de gameplay (garde-fou cardinal ci-dessus).
    masteredElements: [],
    // Éclats consacrés au Sceau (A4) — total CROSS-RUN d'Éclats offerts au
    // Gardien de la Boucle. Donne un débouché durable au compteur d'Éclats
    // (within-run) sans toucher `accumulatedEclats` (qui gâte les seuils
    // Briser-le-Cycle / Codex). PUREMENT cosmétique : ne débloque que des titres.
    eclatsConsecrated: 0,
    // Étage le plus profond jamais atteint, toutes parties confondues (Thème D
    // — Hauts Faits). Alimente les succès de descente. Cosmétique.
    deepestFloor: 0,
    // Complicité (Lot G, axe 2b) — combats gagnés ensemble par paire de héros
    // du duo, clé = heroKeys triés joints par « | ». PUREMENT cosmétique :
    // débloque des répliques de paire et un titre de paire, jamais un bonus.
    pairBonds: {}
  };
}

// Lot G (axe 2b) — paliers de complicité (combats gagnés ensemble). PUR.
const PAIR_BOND_TIERS = [
  { at: 10,  title: 'Compagnons de route' },
  { at: 40,  title: 'Complices' },
  { at: 120, title: 'Inséparables' },
];
// Palier 0..3 atteint pour `n` combats gagnés ensemble.
function pairBondTier(n) {
  const v = (typeof n === 'number' && n > 0) ? n : 0;
  let t = 0;
  PAIR_BOND_TIERS.forEach((p, i) => { if (v >= p.at) t = i + 1; });
  return t;
}
// Titre du palier atteint, ou '' sous le premier palier.
function pairBondTitle(n) {
  const t = pairBondTier(n);
  return t ? PAIR_BOND_TIERS[t - 1].title : '';
}
// Clé de paire canonique (heroKeys triés), ou null.
function pairBondKey(a, b) {
  if (!a || !b || a === b) return null;
  return [String(a), String(b)].sort().join('|');
}

// Hauts Faits (Thème D — succès) — registre PUR. Chaque entrée est dérivée du
// profil persistant (aucun état neuf hors deepestFloor). `test(p)` renvoie true
// si débloqué. PUREMENT cosmétique : jamais lu par un calcul de gameplay.
// Ordre = ordre d'affichage.
const PROFILE_ACHIEVEMENTS = [
  { id: 'first_victory', icon: '🏆', title: 'Vainqueur de l\'Ombre',   desc: 'Vaincre Voldemort une première fois.',        test: p => (p.victories | 0) >= 1 },
  { id: 'veteran',       icon: '🎖️', title: 'Vétéran de Poudlard',      desc: 'Remporter 3 victoires.',                       test: p => (p.victories | 0) >= 3 },
  { id: 'diplomat',      icon: '🤝', title: 'Diplomate des Cachots',    desc: 'L\'emporter en scellant le Pacte de Salazar.', test: p => (p.pactVictories | 0) >= 1 },
  { id: 'ruins_delver',  icon: '🗿', title: 'Fouilleur des Ruines',     desc: 'Atteindre l\'étage 14 (les Ruines Anciennes).', test: p => (p.deepestFloor | 0) >= 14 },
  { id: 'abyss_walker',  icon: '🕳️', title: 'Marcheur de l\'Abîme',      desc: 'Atteindre l\'étage 21 (l\'Avant-Monde).',      test: p => (p.deepestFloor | 0) >= 21 },
  { id: 'cycle_breaker', icon: '🕊️', title: 'Briseur de Cycle',         desc: 'Briser la Boucle Ténébreuse.',                 test: p => (p.cyclesBroken | 0) >= 1 },
  { id: 'cycle_master',  icon: '♾️', title: 'Maître du Cycle',          desc: 'Briser la Boucle 3 fois.',                     test: p => (p.cyclesBroken | 0) >= 3 },
  { id: 'elementalist',  icon: '🌈', title: 'Élémentaliste',            desc: 'Éveiller 3 Maîtrises élémentaires.',           test: p => (p.masteredElements ? p.masteredElements.length : 0) >= 3 },
  { id: 'archmage_elem', icon: '✨', title: 'Archimage élémentaire',    desc: 'Éveiller les 6 Maîtrises élémentaires.',       test: p => (p.masteredElements ? p.masteredElements.length : 0) >= 6 },
  { id: 'offrant',       icon: '🔹', title: 'Offrant du Sceau',         desc: 'Consacrer 15 Éclats au Sceau.',                test: p => (p.eclatsConsecrated | 0) >= 15 },
  { id: 'pilier',        icon: '🏛️', title: 'Pilier du Sceau',          desc: 'Consacrer 200 Éclats au Sceau.',               test: p => (p.eclatsConsecrated | 0) >= 200 },
  { id: 'sealed',        icon: '⚰️', title: 'Scellé dans la Boucle',    desc: 'Périr dans une Poche du Sceau (Ironman).',     test: p => (p.sealedDeaths | 0) >= 1 },
];

// PUR & testable (units.js) — liste des ids de Hauts Faits débloqués pour un
// profil donné. Aucun effet mécanique.
function computeAchievements(profile) {
  profile = profile || {};
  return PROFILE_ACHIEVEMENTS.filter(a => { try { return !!a.test(profile); } catch (_) { return false; } })
                             .map(a => a.id);
}

// Paliers cosmétiques de consécration (A4) — Éclats offerts cumulés → titre.
const ECLATS_CONSECRATION_TITLES = [
  { at: 200, title: 'Pilier du Sceau' },
  { at: 60,  title: 'Porteur Consacré' },
  { at: 15,  title: 'Offrant du Sceau' },
];

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
    // Assainissement : ne garde que les 6 éléments canoniques, ordre canonique.
    base.masteredElements = Array.isArray(obj.masteredElements)
      ? PROFILE_MASTERY_ELEMENTS.filter(e => obj.masteredElements.includes(e))
      : [];
    base.eclatsConsecrated = (typeof obj.eclatsConsecrated === 'number' && obj.eclatsConsecrated >= 0)
      ? Math.floor(obj.eclatsConsecrated) : 0;
    base.deepestFloor = (typeof obj.deepestFloor === 'number' && obj.deepestFloor >= 0)
      ? Math.floor(obj.deepestFloor) : 0;
    if (obj.pairBonds && typeof obj.pairBonds === 'object') {
      for (const k of Object.keys(obj.pairBonds)) {
        const v = obj.pairBonds[k];
        if (/^[a-z]+\|[a-z]+$/.test(k) && typeof v === 'number' && v > 0) base.pairBonds[k] = Math.floor(v);
      }
    }
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

// Lot E (revue 2026-09, arc H10) — « Ceux qui se souviennent ».
// PUR & testable : lignes de l'Archiviste des boucles, dérivées du profil
// persistant en LECTURE SEULE (aucun effet mécanique, aucun héritage).
// ctx = { floor, ngPlus }. Retourne 1 à 4 lignes, les plus marquantes d'abord.
function archivistMemoryLines(profile, ctx) {
  const p = profile || {};
  const c = ctx || {};
  const v = p.victories | 0;
  const out = [];
  if ((p.cyclesBroken | 0) >= 1) {
    const n = p.cyclesBroken | 0;
    out.push(n > 1
      ? "Tu as déjà brisé le Cycle " + n + " fois. Et pourtant te revoilà, au même escalier. Le Cycle ne t'en veut pas : il ne sait pas compter."
      : "Tu as déjà brisé le Cycle, une fois. Je l'ai écrit en lettres plus grandes que les autres. Et pourtant te revoilà.");
  }
  if (v >= 2) {
    out.push("Tu as vaincu l'Ombre " + v + " fois. Chaque fois, tu es redescendu. Mes registres commencent à ressembler à une spirale.");
  } else {
    out.push("Ta première victoire. Mon registre n'avait pas encore ton nom. Il l'a, maintenant, et je ne l'effacerai pas.");
  }
  if ((p.pactVictories | 0) >= 1) {
    out.push("Une fois au moins, tu as scellé le Pacte des Cachots. J'ai noté la date. Le serpent, lui aussi, s'en souvient.");
  }
  const deep = p.deepestFloor | 0;
  const here = (typeof c.floor === 'number') ? c.floor : 0;
  if (deep > here && deep >= 12) {
    out.push("Tu es déjà descendu plus bas que cela : jusqu'à l'étage " + deep + ". Tu ne t'en souviens pas ? Moi si.");
  }
  if ((p.sealedDeaths | 0) >= 1) {
    out.push("L'un de tes reflets est resté scellé dans une Poche du Sceau. Je garde son nom à part, pour qu'il ne se perde pas.");
  }
  if ((c.ngPlus | 0) >= 1) {
    out.push("Le château te reconnaît, et il s'est durci pour toi. Ce n'est pas de la rancune : c'est du respect.");
  }
  return out.slice(0, 4);
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
  // Consécration d'Éclats (A4) — un seul titre : le palier le plus haut atteint.
  const cons = profile.eclatsConsecrated | 0;
  const consTitle = ECLATS_CONSECRATION_TITLES.find(t => cons >= t.at);
  if (consTitle) titles.push(consTitle.title);
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

// Consécration d'Éclats au Sceau (A4) — ajoute `n` Éclats offerts au total
// CROSS-RUN et rafraîchit les titres. Retourne le nouveau total (ou l'actuel
// si `n` invalide). PUREMENT cosmétique — aucun gate de gameplay ne le lit.
function recordConsecratedEclats(n) {
  const add = (typeof n === 'number' && n > 0) ? Math.floor(n) : 0;
  const p = _profileRead();
  if (add > 0) {
    p.eclatsConsecrated = (p.eclatsConsecrated | 0) + add;
    p.titles = computeProfileTitles(p);
    _profileWrite(p);
  }
  return p.eclatsConsecrated | 0;
}

// Enregistre le plus profond étage atteint (max cross-run). Appelé à la descente
// (goDeeper). Écrit seulement si `floor` bat le record → I/O minimal. Cosmétique
// (succès de descente). Retourne le record courant.
function recordDeepestFloor(floor) {
  const f = (typeof floor === 'number' && floor > 0) ? Math.floor(floor) : 0;
  const p = _profileRead();
  if (f > (p.deepestFloor | 0)) {
    p.deepestFloor = f;
    _profileWrite(p);
  }
  return p.deepestFloor | 0;
}

// Lot G (axe 2b) — un combat gagné en Duo par la paire (a, b). Retourne
// { count, tier, tierUp } (tierUp vrai si un palier vient d'être franchi), ou
// null si la paire est invalide. Cosmétique : aucun calcul de combat ne le lit.
function recordPairBattleWon(a, b) {
  const key = pairBondKey(a, b);
  if (!key) return null;
  const p = _profileRead();
  const before = p.pairBonds[key] | 0;
  const count = before + 1;
  p.pairBonds[key] = count;
  _profileWrite(p);
  const tier = pairBondTier(count);
  return { count, tier, tierUp: tier > pairBondTier(before) };
}

// Palier de complicité de la paire (a, b) lu dans le profil (0..3).
function pairBondTierOf(a, b) {
  const key = pairBondKey(a, b);
  if (!key) return 0;
  return pairBondTier(_profileRead().pairBonds[key] | 0);
}

// PUR & testable (units.js) — union d'un élément dans la collection, en
// conservant l'ordre canonique PROFILE_MASTERY_ELEMENTS. Les valeurs
// inconnues (élément invalide, entrées corrompues de la liste) sont
// rejetées/filtrées. Retourne TOUJOURS une nouvelle liste.
function mergeMasteredElements(list, element) {
  const cur = (Array.isArray(list) ? list : []).filter(e => PROFILE_MASTERY_ELEMENTS.includes(e));
  const set = new Set(cur);
  if (PROFILE_MASTERY_ELEMENTS.includes(element)) set.add(element);
  return PROFILE_MASTERY_ELEMENTS.filter(e => set.has(e));
}

// Bibliothèque des Maîtrises (P7, final-polish §1.5) — enregistre au profil
// persistant qu'un Livre de Maîtrise de cet élément a été lu (union
// cross-run). Appelé par learnMasteryBook (inventory.js). PUREMENT
// cosmétique : aucun calcul de gameplay ne lit cette liste — le buff
// (+12 %) reste `elementalMastery`, within-run, zéro héritage.
function recordMasteredElementToProfile(element) {
  const p = _profileRead();
  const merged = mergeMasteredElements(p.masteredElements, element);
  if (merged.length === p.masteredElements.length) return false; // déjà collecté / invalide
  p.masteredElements = merged;
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

// Bibliothèque des Maîtrises (P7) — les 6 Livres, avec leur nom une fois
// collectés (l'élément seul sinon : pas de spoiler de source de drop).
const _PROFILE_MASTERY_BOOKS = [
  { el: 'feu',      icon: '🔥', name: 'Souffle du Magyar' },
  { el: 'glace',    icon: '❄️', name: 'Givre Éternel' },
  { el: 'foudre',   icon: '⚡', name: "Fureur de l'Orage" },
  { el: 'lumière',  icon: '✨', name: 'Clair de Lune' },
  { el: 'ténèbres', icon: '🌑', name: "Pacte d'Ombre" },
  { el: 'physique', icon: '⚔️', name: 'Cœur de Lion' },
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

  // Bibliothèque des Maîtrises (P7) : 6 puces, colorées si le Livre de cet
  // élément a été lu dans une partie (union cross-run). Même patron visuel
  // que les fins (classes prof-ending seen/locked — zéro CSS nouveau).
  const mastered = new Set(p.masteredElements || []);
  const masteryPills = _PROFILE_MASTERY_BOOKS.map(b => {
    const got = mastered.has(b.el);
    const title = got
      ? `« ${b.name} » — maîtrise de ${b.el} éveillée au cours d'une partie`
      : `Livre de Maîtrise (${b.el}) — à découvrir`;
    return `<span class="prof-ending ${got ? 'seen' : 'locked'}" title="${esc(title)}">`
         + `${got ? b.icon : '·'} ${esc(got ? b.name : b.el)}</span>`;
  }).join('');

  // Hauts Faits (Thème D) : puces débloquées/verrouillées, même patron visuel
  // que les fins/maîtrises (classes prof-ending seen/locked — zéro CSS nouveau).
  const unlocked = new Set(computeAchievements(p));
  const achievePills = PROFILE_ACHIEVEMENTS.map(a => {
    const got = unlocked.has(a.id);
    const title = got ? `${a.title} — ${a.desc}` : `??? — ${a.desc}`;
    return `<span class="prof-ending ${got ? 'seen' : 'locked'}" title="${esc(title)}">`
         + `${got ? a.icon : '🔒'} ${esc(got ? a.title : '???')}</span>`;
  }).join('');

  // Complicités (Lot G, axe 2b) : les paires du duo, les plus liées d'abord.
  const heroName = (k) => {
    const c = (typeof CHARACTERS !== 'undefined') ? CHARACTERS[k] : null;
    return (c && c.name) ? c.name.split(' ')[0] : k;
  };
  const bonds = Object.keys(p.pairBonds || {})
    .map(k => ({ k, n: p.pairBonds[k] | 0 }))
    .filter(b => b.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
  const bondPills = bonds.map(b => {
    const [x, y] = b.k.split('|');
    const title = pairBondTitle(b.n);
    return `<span class="prof-ending ${title ? 'seen' : 'locked'}" title="${esc(b.n + ' combat' + (b.n > 1 ? 's' : '') + ' gagné' + (b.n > 1 ? 's' : '') + ' ensemble')}">`
         + `🤝 ${esc(heroName(x))} & ${esc(heroName(y))}${title ? ' · ' + esc(title) : ''} (${b.n})</span>`;
  }).join('');
  const bondSection = bonds.length
    ? `<div class="wcodex-section-label">Complicités</div><div class="prof-endings">${bondPills}</div>`
    : '';

  el.innerHTML = `
    ${banner}
    <div class="wcodex-sub">Mémoire de tes parties achevées. Purement honorifique — aucun avantage hérité.</div>
    <div class="wcodex-stats">
      <span class="wcodex-stat"><b>${p.victories | 0}</b> victoire${(p.victories | 0) > 1 ? 's' : ''}</span>
      <span class="wcodex-stat"><b>${p.cyclesBroken | 0}</b> cycle${(p.cyclesBroken | 0) > 1 ? 's' : ''} brisé${(p.cyclesBroken | 0) > 1 ? 's' : ''}</span>
      <span class="wcodex-stat">étage max <b>${p.deepestFloor | 0}</b></span>
    </div>
    <div class="wcodex-section-label">Titres</div>
    <div class="prof-titles">${titleChips}</div>
    <div class="wcodex-section-label">Hauts Faits · ${unlocked.size}/${PROFILE_ACHIEVEMENTS.length}</div>
    <div class="prof-endings">${achievePills}</div>
    <div class="wcodex-section-label">Fins découvertes · ${gotEndings}/${_PROFILE_ENDINGS.length}</div>
    <div class="prof-endings">${endingPills}</div>
    <div class="wcodex-section-label">Bibliothèque des Maîtrises · ${mastered.size}/${_PROFILE_MASTERY_BOOKS.length}</div>
    <div class="prof-endings">${masteryPills}</div>
    ${bondSection}`;
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
  // Visible dès qu'il y a quelque chose à montrer : une fin atteinte OU un
  // premier Livre de Maîtrise collecté (P7 — collectible dès l'étage 8).
  const has = (p.victories | 0) > 0 || (p.cyclesBroken | 0) > 0
    || (p.masteredElements || []).length > 0
    || Object.keys(p.pairBonds || {}).length > 0;
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
