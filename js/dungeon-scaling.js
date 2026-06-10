// ============================================================
// DONJON — Mise à l'échelle des monstres (scaling + Boucle Ténébreuse)
// ============================================================
// weightedPick, effectiveFloor, endgameTierIndex, scaleMonster (récursion
// endgame ENDGAME_SCALING) et buildEcho (combat astral). Purs : aucune
// mutation de l'état de jeu. Chargé AVANT dungeon.js. Cf. ENDGAME_PLAN.md §7.
// ============================================================
// ── Configuration du scaling endgame (Boucle Ténébreuse) ─────
// Formule récursive appliquée aux monstres post-victoire (floor 11+).
//
//   stat(0) = base × (1 + (relFloor − 1) × scale) × diffMult        (≡ scaling actuel)
//   stat(n) = stat(n−1) × scal(n) + baseFix_eff                     (récursion par palier de 10)
//
// avec
//   n           = ⌊(floor − 1) / 10⌋                                (0 pour 1-10, 1 pour 11-20, …)
//   relFloor    = effectiveFloor(floor)                              (1-10 dans chaque palier)
//   intraMult   = 1 + (relFloor − 1) × scale                         (scaling intra-palier)
//   scal(n)     = 1 + scalDelta / intraMult                          (mult lissé)
//   baseFix_eff = baseFix[stat] / intraMult                          (bonus lissé)
//
// Le lissage par `intraMult` réduit proportionnellement l'apport
// du bonus (+ multiplicateur) sur les monstres déjà fortement scalés
// (Voldemort relF=10, intraMult=4.6 → bonus ÷4.6) et le maximise sur
// les monstres faibles (Chat relF=1, intraMult=1 → bonus complet).
//
// TODO : à l'avenir, `scalDelta` pourrait dépendre de `n` pour rendre
//        la croissance plus agressive aux paliers profonds (palier 5+).
//        Actuellement constant à 0.5.
const ENDGAME_SCALING = {
  baseFix: { hp: 80, atk: 10, def: 5, mag: 8, xp: 50, gold: 80 },
  scalDelta: 0.5,
};

// Récursion endgame : applique `(stat × scal + fixEff)` exactement `n` fois.
// Implémentation récursive pour refléter la spec du joueur. Le coût est nul
// (n ≤ ~10 en pratique).
function _endgameRecurse(stat, n, fixEff, scal) {
  if (n <= 0) return stat;
  return _endgameRecurse(stat * scal + fixEff, n - 1, fixEff, scal);
}

// ── Utilitaires de sélection et mise à l'échelle ─────────────

// Tirage pondéré selon la propriété weight de chaque monstre
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

// Boucle Ténébreuse (endgame) : à floor 11+ post-victoire, on rejoue
// la progression 1-10 à l'identique (pool + scaling). Voir ENDGAME_PLAN.md §7.2.
// Retourne `floor` inchangé si pré-victoire ou floor ≤ 10.
function effectiveFloor(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return floor - 10;     // 11 → 1, 12 → 2, …, 20 → 10, 21 → 11, …
  }
  return floor;
}

// Indice de palier endgame : 0 pour pré-victoire (floors 1-10), 1 pour
// le premier palier Ténèbres (11-20), 2 pour le 2e (21-30), etc.
// Utilisé comme « n » dans la formule récursive du scaling.
function endgameTierIndex(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return Math.floor((floor - 1) / 10);   // 1 pour 11-20, 2 pour 21-30, …
  }
  return 0;
}

// ── Niveau de Boucle narratif (V1 — Chapitre 11 §11.7.1) ─────
// `loopNumber(deepest)` est un palier de profondeur DÉRIVÉ de l'étage le plus
// profond atteint (`floorReached`), PAS un état sauvegardé : un « tour de
// spirale » = LOOP_SPAN étages sous l'étage 10 (gate de Boucle). Convention :
//   loopNumber(≤10)=0 (pré-Boucle) · 11→1 · 20→1 · 21→2 · 30→2 · …
// Pur & sûr : entrée non-numérique/négative → 0. Indépendant de victoryAchieved
// (la descente ≤10 garde floorReached ≤ 10 tant que l'escalier 10→11 est scellé,
// donc loopNumber reste 0 hors Boucle). Cf. .claude/plans/chapter-11-dark-loop.md §B.1.
const LOOP_SPAN = 10;
function loopNumber(deepestFloor) {
  const d = (typeof deepestFloor === 'number' && isFinite(deepestFloor)) ? deepestFloor : 0;
  return Math.max(0, Math.ceil((d - 10) / LOOP_SPAN));
}

// Surcouche corruption (Chapitre 09 §9.1.2) — gradient narratif 0-3 lu par le
// rendu (teinte froide / givre) et l'audio (souffle glacé). PUR, dérivé de la
// profondeur effective + du tag Ténébreux ; non sérialisé (recalculé au spawn).
//   0 — L'École (canon, intact)        étages eff. 1-3
//   1 — La Descente (touché)           étages eff. 4-6
//   2 — Les Profondeurs (corrompu)     étages eff. 7-10
//   3 — Boucle Ténébreuse (cauchemar)  étages 11+ post-victoire
// Le `base` est accepté pour extension future (tag par famille) mais reste
// inutilisé : le gradient est piloté par la profondeur pour rester prévisible.
function creatureCorruptionLevel(base, floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) return 3;
  const ef = effectiveFloor(floor);
  if (ef >= 7) return 2;
  if (ef >= 4) return 1;
  return 0;
}

// Levier anti-tank — capacité « Broyer » (cf. .claude/plans/player-stats-balance.md
// §4ter). Dégâts proportionnels aux PV MAX de la cible, contournant la DEF :
// contre-mesure exacte au build tank (dont l'avantage est le pool de PV, pas la
// DEF). Bornée à K × coup normal pour découpler la valeur de la progression du
// joueur (anti-grind). Octroyée aux monstres « brutes » (frappeurs physiques).
//
// Prédicat partagé par scaleMonster (octroi en combat) et le bestiaire
// (affichage) — source unique de vérité du « qui est une brute ». Pur.
function isBruteMonster(base) {
  return !!base && (base.atk || 0) >= 1.5 * (base.mag || 0) && (base.atk || 0) >= 12;
}
// Calibration PO (figée) : F=0.10 (part des PV max), chance 50 %, borne
// K=2 × coup normal mitigé (capRef 'hit' → rétrécit quand la DEF joueur monte).
const BRUTE_CRUSH_ABILITY = {
  effect: 'maxhpdamage', name: 'Broyer', icon: '🪨',
  desc: "Frappe écrasante : inflige des dégâts proportionnels aux PV maximum de la cible en ignorant l'armure (valeur bornée).",
  power: 0.10, chance: 0.5, cap: 2, capRef: 'hit',
};

// Applique la mise à l'échelle d'un monstre de base pour un étage donné.
//
// Pré-victoire (n=0) : stat = base × intraMult × diffMult — comportement inchangé.
// Post-victoire (n≥1) : récursion endgame `_endgameRecurse(stat0, n, fixEff, scal)`
// avec `scal` et `fixEff` lissés par `intraMult` (cf. ENDGAME_SCALING en haut).
function scaleMonster(base, floor) {
  const ef        = effectiveFloor(floor);
  const isDark    = (ef !== floor);
  const n         = endgameTierIndex(floor);
  const diffMult  = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).scalingMultiplier;
  const scale     = base.scale || 0.25;
  const intraMult = 1 + (ef - 1) * scale;
  const mult      = intraMult * diffMult;

  // Précalculs récursion (no-op si n=0 — recurse retourne stat tel quel).
  const scal      = 1 + ENDGAME_SCALING.scalDelta / intraMult;
  function recurse(stat0, fixKey) {
    if (n <= 0) return stat0;
    const fixEff = ENDGAME_SCALING.baseFix[fixKey] / intraMult;
    return _endgameRecurse(stat0, n, fixEff, scal);
  }

  const monster = JSON.parse(JSON.stringify(base));
  monster.hp  = Math.floor(recurse(base.hp  * mult, 'hp'));
  monster.atk = Math.floor(recurse(base.atk * mult, 'atk'));
  monster.def = Math.floor(recurse(base.def * mult, 'def'));
  monster.xp  = Math.floor(recurse(base.xp  * mult, 'xp'));
  if (typeof base.gold === 'object') {
    const { min, max } = base.gold;
    monster.gold = Math.floor(recurse((min + Math.random() * (max - min)) * mult, 'gold'));
  } else {
    monster.gold = Math.floor(recurse(base.gold * mult, 'gold'));
  }
  // mag : non scalée par intraMult dans la formule actuelle (constante),
  // mais participe à la récursion endgame pour évoluer avec les paliers.
  if (n > 0 && base.mag) {
    monster.mag = Math.floor(_endgameRecurse(base.mag, n,
      ENDGAME_SCALING.baseFix.mag / intraMult, scal));
  }

  // ── Variante visuelle ────────────────────────────────────────
  // 4 % de chance d'obtenir un monstre "shiny" (rare doré)
  const shinyRoll = Math.random();
  if (shinyRoll < 0.04) {
    monster.variant = 'shiny';
    monster.name    = '✨ ' + base.name;
    monster.xp      = Math.floor(monster.xp  * 1.5);
    monster.gold    = Math.floor(monster.gold * 2.0);
    if (monster.drops) {
      monster.drops = monster.drops.map(d => ({ ...d, chance: Math.min(1, d.chance * 2) }));
    }
  } else if (isDark) {
    // Ténébreux : la récursion endgame ci-dessus a déjà appliqué le
    // boost de stats. On garde uniquement le préfixe et la metadata
    // pour le rendu (CSS halo violet, badge 🌑). Plus de multiplicateurs
    // séparés (×1.5 HP / ×1.12 ATK / etc.) — tout passe par scal+fix.
    monster.variant = 'darkness';
    monster.name    = 'Ténébreux ' + base.name;
  } else if (floor >= 5) {
    monster.variant = 'ancient';
    monster.name    = 'Ancien ' + base.name;
  } else if (floor >= 3) {
    monster.variant = 'fierce';
    monster.name    = 'Féroce ' + base.name;
  } else {
    monster.variant = 'normal';
  }

  // Octroi de Broyer aux brutes (prédicat sur les stats de BASE, comme la
  // sim). Idempotent : aucune brute ne déclare déjà cette capacité dans
  // monsters.js. Les variantes (shiny / Ténébreux / Ancien) restent des brutes.
  if (isBruteMonster(base)) {
    monster.abilities = [...(monster.abilities || []), { ...BRUTE_CRUSH_ABILITY }];
  }

  // Surcouche corruption cosmétique (Chapitre 09 §9.1.2) — consommée par le
  // rendu (teinte/givre) et l'audio (souffle froid). Dérivée, non sérialisée.
  monster.corruption = creatureCorruptionLevel(base, floor);

  return monster;
}

// ── Mondes parallèles Phase G §6.8 — écho de monstre (combat astral) ───
// Construit une instance dédiée d'un monstre pour le combat astral du
// visiteur. Scalée au NIVEAU DU VISITEUR (pas au floor du host) pour
// garantir un combat équilibré quel que soit l'étage où il atterrit.
// Drops/or standards neutralisés — les gains passent par l'économie
// cross-plan (`outremondeEssence` côté endBattle).
//
// Pur : ne mute aucune variable globale (le caller posera `_echo:true`
// sur l'objet retourné, et endBattle routera les gains via le flag
// `inAstralCombat`).
function buildEcho(monsterId, visitorLevel) {
  const template = (typeof MONSTERS !== 'undefined' && Array.isArray(MONSTERS))
    ? MONSTERS.find(m => m.id === monsterId) : null;
  if (!template) return null;
  // Plancher 1 : un visiteur niveau 0 (théorique) tomberait sinon en NaN
  // dans scaleMonster. Plafond : pas de cap explicite — un visiteur très
  // haut niveau peut affronter un écho coriace, c'est le risque assumé.
  const effFloor = Math.max(1, visitorLevel | 0);
  const scaled = scaleMonster(template, effFloor);
  scaled._echo  = true;     // marqueur astral — lu par endBattle
  scaled._level = effFloor; // niveau effectif (pour la formule essence)
  scaled.gold   = 0;        // pas d'or de loot standard (§6.8)
  scaled.drops  = [];       // pas de drops standard
  // Préfixe « Écho » pour distinguer du monstre normal côté UI combat.
  // On garde la variante (shiny/dark/etc.) calculée par scaleMonster.
  if (!/^Écho/.test(scaled.name)) scaled.name = 'Écho · ' + scaled.name;
  return scaled;
}
