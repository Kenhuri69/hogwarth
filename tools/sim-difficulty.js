#!/usr/bin/env node
// ============================================================
// SIM-DIFFICULTY — Étude de la progression de difficulté
// ------------------------------------------------------------
// Reproduit les formules clés de Hogwarth (battle.js, dungeon.js,
// battle-spells.js) pour estimer la difficulté du mode Normal,
// étage par étage, en solo et en duo.
//
// Sortie : tableaux Markdown sur stdout, exploitables pour le
// rapport DIFFICULTY_REPORT.md.
//
// Usage : node tools/sim-difficulty.js [N_SIMS]
//   N_SIMS = nombre de simulations par étage par mode (def: 400)
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Chargement des données du jeu (MONSTERS, SPELLS) ─────────
// On évalue les fichiers source dans un sandbox vm pour récupérer
// les constantes globales. Les `let`/`const` au top-level d'un
// script vm sont exposées si on les déclare via `var` ou si on
// utilise un contexte qui capture. Le plus simple : on ajoute un
// suffixe `module.exports.X = X` pour chaque constante voulue.
function loadGameData() {
  const root = path.join(__dirname, '..');
  const monstersSrc = fs.readFileSync(path.join(root, 'js/monsters.js'), 'utf8');
  const dataSrc     = fs.readFileSync(path.join(root, 'js/data.js'),     'utf8');
  // QUEST_TEMPLATES a été extrait de quests.js vers quests-templates.js
  // (données inertes). On charge ce module-là — quests.js touche le DOM et
  // n'apporte rien à la sim.
  const questsSrc   = fs.readFileSync(path.join(root, 'js/quests-templates.js'), 'utf8');
  const shopSrc     = fs.readFileSync(path.join(root, 'js/shop.js'),     'utf8');

  // Sandbox commun : on injecte un objet `globalThis` qu'on peut
  // muter, puis on patche les sources pour publier les bindings.
  const sandbox = { console, exports: {},
    // Stubs côté DOM/runtime pour quests.js et shop.js qui touchent
    // window/document/setTimeout au top-level. La sim ne les exécute
    // pas, seules les constantes `QUEST_TEMPLATES` / `SHOP_CATALOG`
    // nous intéressent.
    window: {}, document: { getElementById: () => null },
    setTimeout: () => 0, clearTimeout: () => {},
    addMsg: () => {}, updateUI: () => {}, AudioSystem: { playLevelUp: () => {} },
    party: [], partySize: 1, player: {}, recalculateStats: () => {},
    checkLevelUp: () => {}, openQuestLog: () => {}, updateQuestTracker: () => {},
    chosenHouse: null, housePoints: 0, safeCall: () => {},
    getItemIconHtml: () => '', tryAddItem: () => false,
    activeQuests: [], availableQuests: new Set(), completedQuests: new Set(),
    lastQuestCompletion: {}, renderMinimap: () => {}, drawDungeon: () => {},
  };
  vm.createContext(sandbox);

  const patchedMonsters = monstersSrc + '\n;exports.MONSTERS = MONSTERS;';
  vm.runInContext(patchedMonsters, sandbox, { filename: 'monsters.js' });

  // data.js définit beaucoup de constantes mais on a juste besoin
  // de SPELLS, CHARACTERS, LEVEL_UP_XP_MULTIPLIER, RESIST/WEAK, ITEMS.
  // On évalue le fichier complet dans le même sandbox.
  const patchedData = dataSrc + `\n;exports.SPELLS = SPELLS;\n;exports.CHARACTERS = CHARACTERS;\n` +
    `;exports.LEVEL_UP_XP_MULTIPLIER = LEVEL_UP_XP_MULTIPLIER;\n` +
    `;exports.RESIST_MULTIPLIER = RESIST_MULTIPLIER;\n` +
    `;exports.WEAK_MULTIPLIER = WEAK_MULTIPLIER;\n` +
    `;exports.ITEMS = ITEMS;\n` +
    `;exports.SEARCH_MONSTER_CHANCE = SEARCH_MONSTER_CHANCE;\n` +
    `;exports.SEARCH_TRAP_CHANCE = SEARCH_TRAP_CHANCE;\n` +
    `;exports.REST_ENCOUNTER_CHANCE = REST_ENCOUNTER_CHANCE;\n` +
    `;exports.REST_INTERRUPT_HEAL_FRACTION = REST_INTERRUPT_HEAL_FRACTION;\n`;
  vm.runInContext(patchedData, sandbox, { filename: 'data.js' });

  // quests-templates.js : module inerte qui déclare `QUEST_TEMPLATES`.
  const patchedQuests = questsSrc + '\n;exports.QUEST_TEMPLATES = QUEST_TEMPLATES;';
  vm.runInContext(patchedQuests, sandbox, { filename: 'quests-templates.js' });

  const patchedShop = shopSrc + '\n;exports.SHOP_CATALOG = SHOP_CATALOG;';
  vm.runInContext(patchedShop, sandbox, { filename: 'shop.js' });

  return sandbox.exports;
}

const { MONSTERS, SPELLS, CHARACTERS, LEVEL_UP_XP_MULTIPLIER,
        RESIST_MULTIPLIER, WEAK_MULTIPLIER, ITEMS,
        QUEST_TEMPLATES, SHOP_CATALOG,
        SEARCH_MONSTER_CHANCE, SEARCH_TRAP_CHANCE,
        REST_ENCOUNTER_CHANCE, REST_INTERRUPT_HEAL_FRACTION } = loadGameData();

const spellByName = Object.fromEntries(SPELLS.map(s => [s.name, s]));

// Miroir de state.js — DIFFICULTY_SETTINGS. Le runtime applique
// `scalingMultiplier` à TOUTES les stats de combat scalées
// (dungeon-scaling.js — scaleMonster), `enemyGroupMultiplier` au tirage
// de taille de groupe (battle.js — rollGroupSize) et `xpMultiplier` à
// l'XP. La sim ne modélisait que le Normal (tout à 1.0) ; --difficulty
// branche les trois axes.
const DIFFICULTY_SETTINGS = {
  Facile:    { enemyGroupMultiplier: 0.65, scalingMultiplier: 0.75, goldMultiplier: 1.6,  xpMultiplier: 1.4,  startingHpBonus: 12 },
  Normal:    { enemyGroupMultiplier: 1.0,  scalingMultiplier: 1.0,  goldMultiplier: 1.0,  xpMultiplier: 1.0,  startingHpBonus: 0  },
  Difficile: { enemyGroupMultiplier: 1.35, scalingMultiplier: 1.22, goldMultiplier: 0.75, xpMultiplier: 0.9,  startingHpBonus: -4 },
  Expert:    { enemyGroupMultiplier: 1.65, scalingMultiplier: 1.45, goldMultiplier: 0.55, xpMultiplier: 0.75, startingHpBonus: -8 },
};
function diffOf(cfg) {
  return DIFFICULTY_SETTINGS[cfg && cfg.difficulty] || DIFFICULTY_SETTINGS.Normal;
}

// Miroir de state.js — HOUSE_BONUSES[*].starGenerator (série Apothéose ★ N,
// tier 19+). Cadence : chaque ★ → +1 stat primaire ; tous les 2 ★ → +1 stat
// secondaire ; tous les 5 ★ → +1 LCK ; tous les 10 ★ → +5 réserve (PV/PM).
const STAR_GENERATORS = {
  gryffondor:  { primary: '_baseAtk', secondary: '_baseStr', reserve: 'hpMax' },
  serpentard:  { primary: '_baseMag', secondary: '_baseInt', reserve: 'spMax' },
  serdaigle:   { primary: '_baseMag', secondary: '_baseInt', reserve: 'spMax' },
  poufsouffle: { primary: '_baseDef', secondary: '_baseEnd', reserve: 'hpMax' },
};
// Applique cumulativement les bonus des paliers ★ 1..N sur les _baseX/réserve
// d'un personnage (mute en place). Miroir de _starGeneratorBonus (state.js).
function applyStarGenerator(c, houseSet, stars) {
  const gen = STAR_GENERATORS[houseSet];
  if (!gen || !stars) return;
  for (let n = 1; n <= stars; n++) {
    c[gen.primary] = (c[gen.primary] || 0) + 1;
    if (n % 2  === 0) c[gen.secondary] = (c[gen.secondary] || 0) + 1;
    if (n % 5  === 0) c._baseLck = (c._baseLck || 0) + 1;
    if (n % 10 === 0) c[gen.reserve] = (c[gen.reserve] || 0) + 5;
  }
}

// Miroir de battle.js — mitigatedDamage (DIFFICULTY_STUDY.md §4 levier B).
// Plancher à 25 % de l'ATK brute, soustraction au-delà.
const DAMAGE_MIN_FRACTION = 0.25;
function mitigatedDamage(rawAtk, def) {
  const floorDmg = Math.round(Math.max(0, rawAtk) * DAMAGE_MIN_FRACTION);
  return Math.max(floorDmg, rawAtk - Math.max(0, def || 0));
}

// Option D — fraction de DEF ignorée par une brute, rampe à seuil sur la
// DEF de la cible : 0 sous _armorPenLo, linéaire jusqu'à _armorPenHi, puis
// plateau à _armorPenCap. Renvoie 0 pour un ennemi non-brute (cap absent).
function enemyArmorPenFrac(enemy, targetDef) {
  const cap = enemy._armorPenCap || 0;
  if (cap <= 0) return 0;
  const lo = enemy._armorPenLo, hi = enemy._armorPenHi;
  const t = Math.max(0, Math.min(1, ((targetDef || 0) - lo) / (hi - lo)));
  return cap * t;
}

// ── Récompenses de quêtes : modélisation "joueur normal" ─────
//
// Étage où une quête est considérée comme complétée. Pour les quêtes
// kill : minFloor du monstre cible. Pour les item/floor : étage cible
// du donneur. Ces valeurs servent à appliquer rétroactivement l'XP et
// les bonus de stats permanents aux personnages quand on simule à
// l'étage F (toutes les quêtes dont completion_floor ≤ F sont
// considérées comme rendues).
//
// Hypothèse explicite : le joueur joue les quêtes optionnelles. On peut
// désactiver la modélisation via `--no-quests`.
const QUEST_COMPLETION_FLOOR = {
  intro_tutoriel:        2,
  mandragore_pomfresh:   3,
  livre_interdit:        3,
  troll_toilettes:       3,
  niffleurs_trésor:      3,
  chouette_perdue:       4,
  defense_cabane:        4,
  bottines_ollivander:   4,
  lumiere_desespoir:     5,
  fil_acromantule:       5,
  golem_passage:         5,
  anneau_dumbledore:     6,
  bouclier_phenix:       7,
  dumbledore_eveil:      3,
  dumbledore_courage:    5,
  dumbledore_resistance: 7,
  dumbledore_revelation: 10,
};

// XP totale gagnée par les quêtes complétées avant l'étage `floor`.
function questXpUpToFloor(floor) {
  if (!QUEST_TEMPLATES) return 0;
  let total = 0;
  for (const tpl of QUEST_TEMPLATES) {
    const cf = QUEST_COMPLETION_FLOOR[tpl.id];
    if (cf === undefined) continue;
    if (cf > floor) continue;
    if (tpl.reward && tpl.reward.xp) total += tpl.reward.xp;
  }
  return total;
}

// Applique les bonus stats permanents des quêtes complétées avant
// l'étage `floor` sur un personnage (mute en place). Les bonus
// s'accumulent sur les `_baseX` (effet identique au runtime).
function applyQuestStatRewards(c, floor) {
  if (!QUEST_TEMPLATES) return;
  for (const tpl of QUEST_TEMPLATES) {
    const cf = QUEST_COMPLETION_FLOOR[tpl.id];
    if (cf === undefined) continue;
    if (cf > floor) continue;
    const stats = tpl.reward && tpl.reward.stats;
    if (!stats) continue;
    if (stats.atk) c._baseAtk = (c._baseAtk || 0) + stats.atk;
    if (stats.def) c._baseDef = (c._baseDef || 0) + stats.def;
    if (stats.mag) c._baseMag = (c._baseMag || 0) + stats.mag;
    if (stats.lck) c._baseLck = (c._baseLck || 0) + stats.lck;
    if (stats.str) c._baseStr = (c._baseStr || c.str || 0) + stats.str;
    if (stats.int) c._baseInt = (c._baseInt || c.int || 0) + stats.int;
    if (stats.agi) c._baseAgi = (c._baseAgi || c.agi || 0) + stats.agi;
    if (stats.end) c._baseEnd = (c._baseEnd || c.end || 0) + stats.end;
    if (stats.hp)  { c.hpMax += stats.hp; }
    if (stats.sp)  { c.spMax += stats.sp; }
  }
}

// ── Équipement : modélisation "best-in-slot" disponible ──────
//
// On simule un joueur qui équipe progressivement les meilleurs items
// disponibles selon `minFloor` du shop. Pour chaque slot, on prend le
// item avec la somme de bonus la plus élevée parmi les items éligibles.
// Approche conservative : un seul perso équipé, pas de doublon ring1/2.
function equipmentBuffForFloor(floor) {
  if (!ITEMS) return null;
  // --artifacts : best-in-slot sur TOUS les items équipables, y compris les
  // légendaires hors boutique (récompenses de Maison, Forge, quêtes, drops).
  // Sinon : uniquement les items débloqués en boutique à cet étage.
  const useArtifacts = (typeof ARGS !== 'undefined') && ARGS.artifacts;
  const eligibleIds = useArtifacts ? null : new Set(
    (SHOP_CATALOG || []).filter(e => (e.minFloor || 1) <= floor).map(e => e.id)
  );
  const buff = { atk: 0, def: 0, mag: 0, lck: 0, str: 0, int: 0, agi: 0, end: 0,
                 crit: 0, dodge: 0, critDmg: 0, spellCrit: 0, spellCritDmg: 0,
                 hpMax: 0, spMax: 0 };
  const bestBySlot = {};
  for (const it of ITEMS) {
    if (!it.slot) continue;
    if (eligibleIds && !eligibleIds.has(it.id)) continue;
    // Score net : les bonus négatifs (items à compromis — lame_sanguinaire,
    // armure_lourde, anneau_furie) abaissent bien le score (somme algébrique).
    const score = (it.bonusAtk||0)+(it.bonusDef||0)+(it.bonusMag||0)+(it.bonusLck||0)
                + (it.bonusStr||0)+(it.bonusInt||0)+(it.bonusAgi||0)+(it.bonusEnd||0)
                + (it.bonusCritChance||0)+(it.bonusDodgeChance||0)
                + (it.bonusHpMax||0)*0.25+(it.bonusSpMax||0)*0.25;
    const cur = bestBySlot[it.slot];
    if (!cur || score > cur.score) bestBySlot[it.slot] = { item: it, score };
  }
  // Forge des Ténèbres : --forge=N ajoute +N au bonus principal de chaque
  // item (la stat la plus élevée parmi atk/def/mag/lck). Miroir de
  // forge.js — forgeBonus + inventory.js — recalculateStats.
  const forgeLvl = (typeof ARGS !== 'undefined') ? Math.min(5, ARGS.forge || 0) : 0;
  for (const slot of Object.keys(bestBySlot)) {
    const it = bestBySlot[slot].item;
    buff.atk += it.bonusAtk || 0;
    buff.def += it.bonusDef || 0;
    buff.mag += it.bonusMag || 0;
    buff.lck += it.bonusLck || 0;
    buff.str += it.bonusStr || 0;
    buff.int += it.bonusInt || 0;
    buff.agi += it.bonusAgi || 0;
    buff.end += it.bonusEnd || 0;
    buff.crit  += it.bonusCritChance  || 0;
    buff.dodge += it.bonusDodgeChance || 0;
    buff.critDmg      += it.bonusCritDamage      || 0;
    buff.spellCrit    += it.bonusSpellCritChance || 0;
    buff.spellCritDmg += it.bonusSpellCritDamage || 0;
    buff.hpMax += it.bonusHpMax || 0;
    buff.spMax += it.bonusSpMax || 0;
    if (forgeLvl > 0) {
      const prim = [['atk', it.bonusAtk|0], ['def', it.bonusDef|0],
                    ['mag', it.bonusMag|0], ['lck', it.bonusLck|0]]
                   .sort((a, b) => b[1] - a[1]);
      if (prim[0][1] > 0) buff[prim[0][0]] += forgeLvl;
    }
  }
  return buff;
}

// Applique les bonus directement sur les stats effectives. À appeler
// **après** que `c.atk/def/mag/lck/str/int/agi/end` ont été initialisées
// depuis les `_base*` (cf. createHero étape "stats effectives").
function applyEquipmentBuff(c, floor) {
  const b = equipmentBuffForFloor(floor);
  if (!b) return;
  c.atk += b.atk;
  c.def += b.def;
  c.mag += b.mag;
  c.lck += b.lck;
  c.str = (c.str || 0) + b.str;
  c.int = (c.int || 0) + b.int;
  c.agi = (c.agi || 0) + b.agi;
  c.end = (c.end || 0) + b.end;
  // Réserves max (bonusHpMax/bonusSpMax — inventory-core.js). Refill ensuite.
  if (b.hpMax) { c.hpMax += b.hpMax; c.hp = c.hpMax; }
  if (b.spMax) { c.spMax += b.spMax; c.sp = c.spMax; }
  c._critBonus       = b.crit         || 0;
  c._dodgeBonus      = b.dodge        || 0;
  c._critDmgBonus    = b.critDmg      || 0;
  c._spellCritBonus  = b.spellCrit    || 0;
  c._spellCritDmgBon = b.spellCritDmg || 0;
}

// ── Bonus de set (state.js — HOUSE_SETS / inventory.js — recalculateStats) ──
// Bonus cumulés 2+3+4 pièces d'un set de Maison 4/4. Valeurs miroir de
// HOUSE_SETS (state.js). int/end n'influent pas le combat simulé ; on les
// applique quand même pour cohérence.
const HOUSE_SET_BONUS = {
  // 4/4 cumulés. critDamage / spellCrit* : cf. crit-rework.md.
  gryffondor:  { atk: 7, critChance: 22, critDamage: 0.50 },
  serpentard:  { mag: 7, lck: 4, spellCritChance: 20, spellCritDamage: 0.50 },
  serdaigle:   { mag: 7, int: 4, spellCritChance: 20, spellCritDamage: 0.50 },
  poufsouffle: { def: 7, end: 4 },
};
// Applique le set de Maison choisi (4/4) et/ou le set Ténèbres (3/3).
// Un perso ne peut porter qu'UN set entier (les deux se disputent les
// slots cloak + amulet). En DUO on répartit : set de Maison sur Harry,
// set Ténèbres sur Hermione → la party bénéficie des deux. En solo, le
// perso unique porte un seul set (Maison prioritaire si les deux flags).
function applySetBonuses(c, cfg, key, partySize) {
  c._setCrit = 0;        c._setDodge = 0;
  c._setCritDmg = 0;     c._setSpellCrit = 0;     c._setSpellCritDmg = 0;
  const isHermione = (key === 'hermione');
  const solo = (partySize === 1);
  // Set de Maison → Harry (jamais Hermione : elle porte le set Ténèbres en duo).
  const hs = (cfg.houseSet && !isHermione) ? HOUSE_SET_BONUS[cfg.houseSet] : null;
  if (hs) {
    c.atk += hs.atk || 0;
    c.def += hs.def || 0;
    c.mag += hs.mag || 0;
    c.lck += hs.lck || 0;
    c.int  = (c.int || 0) + (hs.int || 0);
    c.end  = (c.end || 0) + (hs.end || 0);
    c._setCrit         += hs.critChance      || 0;
    c._setCritDmg      += hs.critDamage      || 0;
    c._setSpellCrit    += hs.spellCritChance || 0;
    c._setSpellCritDmg += hs.spellCritDamage || 0;
    // Effets spéciaux 4 pièces (state.js — HOUSE_SETS setBonus4) : se cumulent
    // avec le passif d'Apothéose (appliqué après, combine au lieu d'écraser).
    if (cfg.houseSet === 'serpentard') c._serpentLifesteal = (c._serpentLifesteal || 0) + 0.10;
    if (cfg.houseSet === 'serdaigle')  c._spellCostMult    = (c._spellCostMult    || 1) * 0.90;
  }
  // Set Ténèbres 3/3 : sur Hermione en duo ; sur Harry en solo si pas de
  // set de Maison. inventory.js — recalculateStats (≥3 : +15 crit, +10 esquive,
  // +0.30 crit damage physique ET sort).
  const tenebresHere = cfg.tenebresSet &&
    (isHermione || (solo && !cfg.houseSet));
  if (tenebresHere) {
    c._setCrit  += 15;
    c._setDodge += 10;
    c._setCritDmg      += 0.30;
    c._setSpellCritDmg += 0.30;
  }
}

// ── Paliers endgame de Maison — tiers 17 « Mythe » + 18 « Apothéose » ──
//
// state.js — HOUSE_BONUSES[*].tiers[16..17]. La sim ne modélise PAS les
// paliers 1-16 (ladder de base, ~+8 stat +8 LCK cumulés) : `--house-tier`
// isole volontairement le DELTA endgame V3 pour mesurer son seul apport.
//   tier 17 « Mythe »     : +2 stat primaire, +1 LCK
//                           (+ sort exclusif — utilitaire/contrôle, hors
//                            modèle DPS de la sim : non modélisé)
//   tier 18 « Apothéose » : +3 stat primaire, +1 LCK (cumulatif)
//                           + passif de Maison (modélisé dans createHero) :
//                             Gryffondor  → +20 % crit physique
//                             Serpentard  → 15 % spell-lifesteal
//                             Serdaigle   → −20 % coût des sorts
//                             Poufsouffle → régén PV/PM hors combat —
//                               SANS effet sur la sim : chaque combat
//                               repart PV/PM pleins (cf. simulateBattle).
const HOUSE_PRIMARY_STAT = {
  gryffondor: 'Atk', serpentard: 'Mag', serdaigle: 'Mag', poufsouffle: 'Def',
};
// Applique le delta de stats des paliers Mythe/Apothéose sur les _baseX.
// Appelé dans createHero AVANT le calcul des stats effectives.
function applyHouseTierBonuses(c, cfg) {
  const tier = cfg.houseTier || 0;
  const prim = HOUSE_PRIMARY_STAT[cfg.houseSet];
  if (tier < 17 || !prim) return;
  const primKey = '_base' + prim;
  c[primKey]  = (c[primKey]  || 0) + 2;   // tier 17
  c._baseLck  = (c._baseLck  || 0) + 1;
  if (tier >= 18) {
    c[primKey] = (c[primKey] || 0) + 3;   // tier 18 (cumulatif)
    c._baseLck = (c._baseLck || 0) + 1;
  }
}

// ── Constantes simulation ───────────────────────────────────
// 1-12 par défaut ; remplacé par 11..maxFloor en mode --endgame (après ARGS).
let FLOORS = Array.from({ length: 12 }, (_, i) => i + 1);

// Hypothèse : ~4 combats par étage en moyenne (8 rooms - shop/chest - escaliers,
// densité 0.6 → ~4 enemy spawns; cf. dungeon.js:202)
const COMBATS_PER_FLOOR_AVG = 4;

// ── Run d'étage (modèle PR #213 : repos partiel + malus de fouille) ──
// Le joueur fouille ~3 cases par étage (besace, gold, butin). Chaque
// fouille porte les jets de malus de PR #213 (réveil monstre / piège).
const SEARCHES_PER_FLOOR = 3;
// Seuils de décision de repos : le groupe se repose avant une salle si
// les PV moyens tombent sous 65 % ou les PM moyens sous 40 %.
const REST_HP_THRESHOLD = 0.65;
const REST_SP_THRESHOLD = 0.40;

// ── CLI ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { nSims: 400, hpMult: 1.0, xpMult: 1.0, statPoints: 3,
                build: 'balanced', mode: 'single',
                useQuests: true, useEquipment: true, usePotions: true,
                kills: 0, bonusLevels: 0, artifacts: false,
                endgame: false, maxFloor: 40, forge: 0, library: 0,
                houseSet: null, tenebresSet: false, houseTier: 0, stars: 0,
                difficulty: 'Normal',
                // DÉFAUT ALIGNÉ SUR LE RUNTIME (rework D1–D5 live). Le sim
                // modélise par défaut le jeu ACTUEL ; `--legacy` restaure le
                // modèle historique pré-rework. Cf.
                // .claude/plans/difficulty-simulation-review.md.
                statRework: true, fairBaseline: true,
                // Calibration runtime (D1–D4), miroir des constantes data.js :
                // INT→MAG 4:1, END→DEF 6:1 (réglage adouci), résistance DoT
                // floor(END/12), pénétration STR Hill cap 0.50 / demi-sat 20.
                // Cf. .claude/plans/player-stats-balance.md §4 (réglage adouci).
                penCap: 0.50, penHalf: 20, dotResDiv: 12,
                intMagDiv: 4, endDefDiv: 6, enemyPen: 0,
                enemyPenLo: 20, enemyPenHi: 34,
                maxhpDmg: 0, maxhpChance: 0.5, maxhpCap: 0, maxhpCapRef: 'atk',
                // D5 volet AGI — modèle « Célérité » : gain de tour FLUIDE
                // (accumulateur, non par palier). Taux d'actions supplémentaires
                // par round = courbe de Hill sur l'AGI. Défaut aligné runtime
                // (CELERITE_MAX 0.30 / HALF 45). Cf. .claude/plans/agi-derived.md.
                celeriteMax: 0.30, celeriteHalf: 45,
                // D5 volet LCK — Fortune (dérivée, parité runtime FORTUNE_*).
                // Win-rate-neutre ici (sim sans fuite/butin) ; effet éco dans
                // tools/sim-economy.js. Courbe : asympt·x²/(x²+half²).
                fortuneAsymptote: 0.31, fortuneHalf: 30,
                elanStep: 8, elanCap: 5, elanDecay: 'none' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--compare')              { out.mode = 'compare'; continue; }
    if (a === '-h' || a === '--help')   { out.mode = 'help'; continue; }
    if (a === '--no-quests')            { out.useQuests = false; continue; }
    if (a === '--no-equipment')         { out.useEquipment = false; continue; }
    if (a === '--no-potions')           { out.usePotions = false; continue; }
    if (a === '--pessimistic')          { out.useQuests = false; out.useEquipment = false; out.usePotions = false; continue; }
    if (a === '--artifacts')            { out.artifacts = true; continue; }
    if (a === '--stat-rework')          { out.statRework = true; out.fairBaseline = true; continue; }
    if (a === '--fair-baseline')        { out.fairBaseline = true; out.statRework = false; continue; }
    if (a === '--legacy' || a === '--no-rework') {
      // Restaure le modèle HISTORIQUE pré-rework (reproduit les rapports
      // archivés) : aucune conversion, pas de croissance secondaire, 0 pt
      // libre, Célérité inactive.
      out.statRework = false; out.fairBaseline = false;
      out.celeriteMax = 0; out.statPoints = 0; continue;
    }
    if (a === '--endgame')              { out.endgame = true; continue; }
    if (a === '--tenebres-set')         { out.tenebresSet = true; continue; }
    if (!a.includes('=')) {
      // Compat : `node sim-difficulty.js 800` → nSims positionnel
      const n = parseInt(a, 10);
      if (!isNaN(n)) { out.nSims = n; continue; }
    }
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'n' || k === 'n-sims') out.nSims = parseInt(v, 10);
    else if (k === 'hp-mult')   out.hpMult = parseFloat(v);
    else if (k === 'xp-mult')   out.xpMult = parseFloat(v);
    else if (k === 'stat-points') out.statPoints = parseInt(v, 10);
    else if (k === 'build')     out.build = v;
    else if (k === 'kills')     out.kills = parseInt(v, 10);
    else if (k === 'bonus-levels') out.bonusLevels = parseInt(v, 10) || 0;
    else if (k === 'max-floor')    out.maxFloor = parseInt(v, 10) || 40;
    else if (k === 'pen-cap')      out.penCap  = parseFloat(v);
    else if (k === 'pen-half')     out.penHalf = parseFloat(v) || 20;
    else if (k === 'dot-res-div')  out.dotResDiv = parseFloat(v) || 8;
    else if (k === 'fortune-asymptote') out.fortuneAsymptote = parseFloat(v);
    else if (k === 'fortune-half')      out.fortuneHalf = parseFloat(v) || 30;
    else if (k === 'int-mag-div')  out.intMagDiv = parseFloat(v) || 4;
    else if (k === 'end-def-div')  out.endDefDiv = parseFloat(v) || 4;
    else if (k === 'enemy-pen')    out.enemyPen = parseFloat(v) || 0;
    else if (k === 'enemy-pen-lo') out.enemyPenLo = parseFloat(v);
    else if (k === 'enemy-pen-hi') out.enemyPenHi = parseFloat(v);
    else if (k === 'maxhp-dmg')    out.maxhpDmg = parseFloat(v) || 0;
    else if (k === 'maxhp-chance') out.maxhpChance = parseFloat(v) || 0.5;
    else if (k === 'maxhp-cap')    out.maxhpCap = parseFloat(v) || 0;
    else if (k === 'maxhp-cap-ref') out.maxhpCapRef = (v === 'hit') ? 'hit' : 'atk';
    else if (k === 'forge')        out.forge   = Math.max(0, Math.min(5, parseInt(v, 10) || 0));
    else if (k === 'library')      out.library = Math.max(0, Math.min(3, parseInt(v, 10) || 0));
    else if (k === 'house-set')    out.houseSet = String(v || '').toLowerCase();
    else if (k === 'house-tier')   out.houseTier = parseInt(v, 10) || 0;
    else if (k === 'stars' || k === 'star') out.stars = Math.max(0, parseInt(v, 10) || 0);
    else if (k === 'difficulty' || k === 'diff') {
      const name = String(v || 'Normal');
      const canon = Object.keys(DIFFICULTY_SETTINGS)
        .find(d => d.toLowerCase() === name.toLowerCase());
      out.difficulty = canon || 'Normal';
    }
    else if (k === 'celerite-max')   out.celeriteMax  = parseFloat(v) || 0;
    else if (k === 'celerite-half')  out.celeriteHalf = parseFloat(v) || 45;
    else if (k === 'elan-step')    out.elanStep = parseFloat(v) || 8;
    else if (k === 'elan-cap')     out.elanCap  = parseInt(v, 10) || 5;
    else if (k === 'elan-decay')   out.elanDecay = String(v || 'none').toLowerCase();
  }
  return out;
}

// Builds prédéfinis : combien de points dans chaque stat secondaire / niveau.
// Total doit valoir `statPoints` total (sinon clamp).
const BUILDS = {
  // Joueur défensif : maximise survie
  tank:       { str: 0, int: 0, agi: 0, end: 3, lck: 0 },
  // Joueur équilibré : 1 END (HP) + 1 offensif (STR Harry / INT Hermione) + 1 utilité
  balanced:   { str: 1, int: 0, agi: 1, end: 1, lck: 0 },     // pour Harry (atk-based)
  // Joueur offensif : tout sur le DPS
  offensive:  { str: 2, int: 0, agi: 0, end: 0, lck: 1 },
  // Casteur (utilisé pour Hermione en mode balanced)
  caster:     { str: 0, int: 1, agi: 1, end: 1, lck: 0 },
  // Build de mesure du débouché AGI (D5 volet AGI) : tout en AGI. Les 3 builds
  // ci-dessus n'investissent quasiment pas l'AGI ; celui-ci isole l'apport de
  // la stat dérivée « Réflexes ». Cf. .claude/plans/agi-derived.md §4.
  agi:        { str: 0, int: 0, agi: 3, end: 0, lck: 0 },
};

function buildFor(build, key) {
  // Hermione utilise la version "caster" du build équilibré
  if (build === 'balanced' && key === 'hermione') return BUILDS.caster;
  return BUILDS[build] || BUILDS.balanced;
}

const ARGS = parseArgs(process.argv);
// --stars implique d'avoir franchi l'Apothéose (tier 18) : on active le
// passif de Maison pour cohérence avec le runtime (la série ★ N est gated
// par requiresDarkTier:2, atteignable seulement post-Apothéose).
if (ARGS.stars > 0 && ARGS.houseTier < 18) ARGS.houseTier = 18;
if (ARGS.mode === 'help') {
  console.log(`Usage: node tools/sim-difficulty.js [N_SIMS] [options]

Par DÉFAUT, le sim modélise le JEU ACTUEL (rework des stats D1–D5 live) :
conversions INT→MAG / END→DEF, résistance DoT, pénétration STR, croissance
secondaire +1/niveau, 3 pts libres/niveau, Célérité. Utiliser --legacy pour
restaurer le modèle historique pré-rework (reproduction des rapports archivés).

Options:
  --n=N | --n-sims=N      Nombre de sims par cellule (def 400)
  --legacy | --no-rework  Modèle HISTORIQUE pré-rework : aucune conversion, pas
                          de croissance secondaire, 0 pt libre, Célérité OFF.
  --difficulty=NAME       Facile | Normal | Difficile | Expert (def Normal).
                          Applique scalingMultiplier (toutes stats),
                          enemyGroupMultiplier et xpMultiplier.
  --star=N | --stars=N    Série Apothéose ★ N (tier 19+). Requiert --house-set.
                          Implique l'Apothéose (tier 18) si non précisé.
  --hp-mult=F             Multiplicateur HP additionnel des monstres (def 1.0)
  --xp-mult=F             Multiplicateur XP des monstres (def 1.0)
  --stat-points=N         Points libres alloués au joueur par niveau (def 3)
  --build=BUILD           tank | balanced | offensive (def balanced)
  --bonus-levels=N        Niveaux gagnés au-delà de l'étage (farming) (def 0)
  --artifacts             Best-in-slot inclut les artefacts légendaires (hors boutique)
  --stat-rework           Rework des stats secondaires (INT→MAG, END→DEF,
                          END→résistance DoT, STR→pénétration). ACTIF par défaut
                          depuis l'alignement runtime ; flag conservé pour
                          explicitation (implique --fair-baseline).
  --fair-baseline         Croissance STR/INT/AGI +1/niveau SANS le rework
                          (désactive les conversions) — référence équitable pour
                          mesurer le rework PUR (comparer à la sortie par défaut).
  --pen-cap=F             Rework : plafond de pénétration STR (def 0.50)
  --pen-half=F            Rework : STR de demi-saturation de la courbe (def 20)
  --dot-res-div=F         Rework : diviseur de résistance DoT END (def 12)
  --fortune-asymptote=F   D5 LCK : asymptote de la courbe Fortune (def 0.31)
  --fortune-half=F        D5 LCK : LCK de demi-saturation Fortune (def 30).
                          Fortune est win-rate-neutre ici (pas de fuite/butin
                          simulés) → effet économique dans tools/sim-economy.js.
  --int-mag-div=F         Rework : diviseur conversion INT→MAG (def 4)
  --end-def-div=F         Rework : diviseur conversion END→DEF (def 6)
  --enemy-pen=F           [Option D] Pénétration d'armure des monstres « brutes »
                          (atk>=1.5×mag & atk>=12) : plafond de fraction de DEF
                          ignorée (def 0). Contre-mesure au build tank. La
                          fraction suit une rampe à seuil sur la DEF cible.
  --enemy-pen-lo=F        [Option D] DEF sous laquelle la pénétration = 0 (def 20)
  --enemy-pen-hi=F        [Option D] DEF au-delà de laquelle penFrac = plafond (def 34)
  --maxhp-dmg=F           [Anti-tank] Capacité « Broyer » sur les brutes : dégâts
                          = F × PV max de la cible, contournant la DEF (def 0).
  --maxhp-chance=F        [Anti-tank] Chance par tour de déclencher Broyer (def 0.5)
  --maxhp-cap=K           [Anti-tank] Borne Broyer à K × référence (def 0 = illimité)
  --maxhp-cap-ref=atk|hit [Anti-tank] Référence de borne : 'atk' = ATK brute de la
                          brute (indépendant du joueur) ; 'hit' = coup normal mitigé
                          (rétrécit quand la DEF joueur monte). Def 'atk'.
  --celerite-max=F        [D5 AGI] Modèle « Célérité » : taux MAX d'actions sup. par
                          round (def 0.30, aligné runtime). Gain de tour FLUIDE via un
                          accumulateur (non par palier) ; taux = courbe de Hill sur
                          l'AGI : celerite = max × agi²/(agi²+half²).
  --celerite-half=H       [D5 AGI] AGI de demi-saturation de la courbe Célérité (def 45)
  --endgame               Boucle Ténébreuse : étages 11..maxFloor, récursion ENDGAME_SCALING
  --max-floor=N           Étage max en mode --endgame (def 40)
  --forge=N               Niveau de Forge (0-5) sur le bonus principal de chaque item
  --library=N             Niveau de Bibliothèque (0-3) sur chaque sort (power/cost)
  --house-set=NAME        Set de Maison 4/4 : gryffondor|serpentard|serdaigle|poufsouffle
  --tenebres-set          Set Ténèbres 3/3 (+15 crit, +10 esquive)
  --house-tier=N          Paliers endgame V3 (17 « Mythe » / 18 « Apothéose »).
                          Requiert --house-set. Modélise le delta de stats
                          tier 17/18 + le passif d'Apothéose (tier 18).
  --elan-step=N           Élan (Apothéose Gryffondor) : % de dégâts par
                          palier (def 8) — knob de tuning
  --elan-cap=N            Élan : nombre max de paliers (def 5)
  --elan-decay=MODE       Élan : none = cumul gardé tout le combat (def) |
                          turn = −1 palier par tour offensif sans crit
  --compare               Lance baseline ET proposition (hp×1.5 xp×1.3 stats=3 balanced), tableau comparatif

Exemples:
  node tools/sim-difficulty.js                      # baseline 400 sims
  node tools/sim-difficulty.js 800                  # baseline 800 sims
  node tools/sim-difficulty.js --compare            # baseline vs proposition validée
  node tools/sim-difficulty.js --hp-mult=1.5 --xp-mult=1.3 --stat-points=3 800
  node tools/sim-difficulty.js --endgame --artifacts --stat-points=3   # Boucle Ténébreuse
  node tools/sim-difficulty.js --endgame --house-set=gryffondor --house-tier=18 800   # capstone Apothéose (Élan inclus)`);
  process.exit(0);
}

// Mode endgame : la grille d'étages couvre la Boucle Ténébreuse (11..maxFloor).
if (ARGS.endgame) {
  FLOORS = [];
  for (let f = 11; f <= ARGS.maxFloor; f++) FLOORS.push(f);
}

// ── Reproduction des formules du jeu ─────────────────────────

// ── Endgame : Boucle Ténébreuse (dungeon.js — ENDGAME_SCALING) ────
// Post-victoire, floor 11+ : le pool rebase sur effectiveFloor (floor−10)
// et une récursion `stat × scal + fixEff` est appliquée `n` fois
// (n = palier de 10 étages). Activée par cfg.endgame.
const ENDGAME_SCALING = {
  baseFix: { hp: 80, atk: 10, def: 5, mag: 8, xp: 50, gold: 80 },
  scalDelta: 0.5,
};
function simEffectiveFloor(floor, cfg) {
  return (cfg && cfg.endgame && floor >= 11) ? floor - 10 : floor;
}
function simEndgameTier(floor, cfg) {
  return (cfg && cfg.endgame && floor >= 11) ? Math.floor((floor - 1) / 10) : 0;
}
function _endgameRecurse(stat, n, fixEff, scal) {
  for (let i = 0; i < n; i++) stat = stat * scal + fixEff;
  return stat;
}
// Valeur scalée d'une stat (hp/atk/def/xp/gold), récursion endgame incluse.
// Miroir fidèle de dungeon.js — scaleMonster.
function scaledStatValue(rawBase, scale, key, floor, cfg) {
  const ef        = simEffectiveFloor(floor, cfg);
  const n         = simEndgameTier(floor, cfg);
  const intraMult = 1 + (ef - 1) * (scale || 0.25);
  const stat0     = rawBase * intraMult;
  let result;
  if (n <= 0) {
    result = stat0;
  } else {
    const scal = 1 + ENDGAME_SCALING.scalDelta / intraMult;
    result = _endgameRecurse(stat0, n, ENDGAME_SCALING.baseFix[key] / intraMult, scal);
  }
  // Multiplicateurs de difficulté (state.js — DIFFICULTY_SETTINGS) :
  // scalingMultiplier sur les stats de combat, xpMultiplier sur l'XP.
  const d = diffOf(cfg);
  if (key === 'hp' || key === 'atk' || key === 'def' || key === 'mag') result *= d.scalingMultiplier;
  else if (key === 'xp') result *= d.xpMultiplier;
  return result;
}

// dungeon.js — scaleMonster (Normal = diffMult 1.0, on ignore shiny pour la sim)
// `cfg` injecte les multiplicateurs HP/XP testés (cf. Phase 2 du plan).
function scaleMonster(base, floor, cfg) {
  const scale  = base.scale || 0.25;
  const hpRaw  = scaledStatValue(base.hp, scale, 'hp', floor, cfg) * cfg.hpMult;
  const xpRaw  = scaledStatValue(base.xp, scale, 'xp', floor, cfg) * cfg.xpMult;
  const goldBase = (typeof base.gold === 'object')
    ? (base.gold.min + base.gold.max) / 2 : base.gold;
  const out = {
    ...JSON.parse(JSON.stringify(base)),
    hp:  Math.floor(hpRaw),
    atk: Math.floor(scaledStatValue(base.atk, scale, 'atk', floor, cfg)),
    def: Math.floor(scaledStatValue(base.def, scale, 'def', floor, cfg)),
    xp:  Math.floor(xpRaw),
    gold: Math.floor(scaledStatValue(goldBase, scale, 'gold', floor, cfg)),
    currentHp: Math.floor(hpRaw),
    disarmed: 0,
  };
  // mag : non scalée par l'étage pré-victoire, mais participe à la
  // récursion endgame ET reçoit le scalingMultiplier de difficulté.
  const n = simEndgameTier(floor, cfg);
  let magVal = base.mag || 0;
  if (n > 0 && base.mag) {
    const ef = simEffectiveFloor(floor, cfg);
    const intraMult = 1 + (ef - 1) * scale;
    const scal = 1 + ENDGAME_SCALING.scalDelta / intraMult;
    magVal = _endgameRecurse(base.mag, n, ENDGAME_SCALING.baseFix.mag / intraMult, scal);
  }
  out.mag = Math.floor(magVal * diffOf(cfg).scalingMultiplier);
  // Option D (analyse) — pénétration d'armure ennemie. Les monstres « brutes »
  // (frappeurs physiques : atk >= 1.5×mag ET atk de base >= 12) ignorent une
  // fraction de la DEF du joueur. Contre-mesure ciblée au build tank.
  // 15/67 monstres qualifient (ét. 4+). Activée par --enemy-pen=F (def 0).
  //
  // La fraction ignorée suit une RAMPE À SEUIL sur la DEF de la cible
  // (calculée en combat par enemyArmorPenFrac) : plate à 0 sous penLo,
  // linéaire entre penLo et penHi, plateau à enemyPen au-delà. La fenêtre
  // de DEF des builds endgame étant étroite (offensif ~24 → tank ~31),
  // le seuil cible le mur de DEF du tank sans pénaliser l'offensif —
  // une courbe de Hill (n=2) serait trop molle pour discriminer.
  const isBrute = (base.atk || 0) >= 1.5 * (base.mag || 0) && (base.atk || 0) >= 12;
  out._armorPenCap = 0;
  if (cfg.enemyPen > 0 && isBrute) {
    out._armorPenCap = cfg.enemyPen;
    out._armorPenLo  = (typeof cfg.enemyPenLo === 'number') ? cfg.enemyPenLo : 20;
    out._armorPenHi  = (typeof cfg.enemyPenHi === 'number') ? cfg.enemyPenHi : 34;
  }
  // Levier anti-tank (analyse) — capacité « Broyer » : dégâts proportionnels
  // aux PV MAX de la cible, contournant la DEF. Contre-tank exact : scale avec
  // le pool de PV (le vrai avantage du tank) là où un coup normal est réduit
  // au plancher. Injectée comme capacité (effect:"maxhpdamage") sur les brutes
  // via --maxhp-dmg=FRAC (def 0 → inactif). Routée par enemyAct comme un
  // 'damage' pour la sélection d'IA. Alternative thématique : réserver aux boss.
  if (cfg.maxhpDmg > 0 && isBrute) {
    out.abilities = [...(out.abilities || []),
      { effect: 'maxhpdamage', power: cfg.maxhpDmg, chance: cfg.maxhpChance,
        cap: cfg.maxhpCap || 0, capRef: cfg.maxhpCapRef || 'atk' }];
  }
  return out;
}

// battle.js:122 — rollGroupSize (Normal = m = 1.0)
// Reproduit la logique runtime battle.js (politique baseline +
// scaling progressif via `cfg.kills` cumulés sur l'étage + quad/quint
// endgame). Miroir de currentMaxGroupSize() : 5 en endgame+duo, 3 sinon.
function simMaxGroupSize(floor, partySize, cfg) {
  const endgame = partySize === 2 && cfg && cfg.endgame && floor >= 11;
  return endgame ? 5 : 3;   // MAX_ENEMY_GROUP = 5 (data.js)
}
function rollGroupSize(floor, partySize, cfg) {
  // Miroir fidèle de battle.js — rollGroupSize, y compris la division par
  // `m = enemyGroupMultiplier` (difficulté) sur les probabilités baseline.
  const m = diffOf(cfg).enemyGroupMultiplier;
  const r = Math.random();
  let p1, p2, p3;
  if (partySize === 1) {
    if (floor <= 2)        { p1 = 1.0;  p2 = 0;    p3 = 0; }
    else if (floor <= 4)   { p1 = Math.max(0.10, 0.70 / m); p2 = 1 - p1; p3 = 0; }
    else                   { p1 = Math.max(0.10, 0.50 / m); p2 = 1 - p1; p3 = 0; }
  } else {
    if (floor <= 2)        { p1 = Math.max(0.15, 0.65 / m); p2 = 1 - p1; p3 = 0; }
    else if (floor <= 6)   { p1 = Math.max(0.10, 0.35 / m); p2 = 1 - p1; p3 = 0; }
    else {
      const t1 = Math.max(0.05, 0.20 / m);
      const t2 = Math.min(0.95, t1 + 0.35 * m);
      p1 = t1; p2 = t2 - t1; p3 = 1 - t2;
    }
  }
  const n = Math.floor(((cfg && cfg.kills) || 0) / 4);
  const duoBonus  = Math.min(0.40, 0.10 * n);
  const trioBonus = n >= 5 ? Math.min(0.40, 0.10 * (n - 4)) : 0;
  const duoShift = Math.min(p1, duoBonus);
  p1 -= duoShift;  p2 += duoShift;
  // Endgame : +10 % de proba groupe 3 en post-victoire à floor 11+.
  let trioShiftBase = trioBonus;
  if (partySize === 2 && cfg && cfg.endgame && floor >= 11) trioShiftBase += 0.10;
  const trioShift = Math.min(p2, trioShiftBase);
  p2 -= trioShift; p3 += trioShift;
  // Quad/quint (4-5) — gaté endgame + duo via simMaxGroupSize. Quint =
  // FRACTION de la bande quad (garantit quad ≥ quint). Miroir battle.js.
  let p4 = 0, p5 = 0;
  if (simMaxGroupSize(floor, partySize, cfg) >= 4) {
    const quadBonus  = Math.min(0.25, 0.05 * Math.max(0, n - 6));
    const quadShift  = Math.min(p3, quadBonus);
    p3 -= quadShift; p4 += quadShift;
    const quintFrac  = n >= 10 ? Math.min(0.40, 0.05 * (n - 9)) : 0;
    const quintShift = p4 * quintFrac;
    p4 -= quintShift; p5 += quintShift;
  }
  if (r < p1) return 1;
  if (r < p1 + p2) return 2;
  if (r < p1 + p2 + p3) return 3;
  if (r < p1 + p2 + p3 + p4) return 4;
  return 5;
}

// Tirage pondéré sur le pool éligible
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

function eligiblePool(floor, cfg) {
  const ef = simEffectiveFloor(floor, cfg);
  const p = MONSTERS.filter(m => m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor));
  return p.length ? p : MONSTERS;
}

// ── Création des personnages ─────────────────────────────────

// Reproduit _hydrateCharacter() + recalculateStats() pour les
// stats dérivées de base, puis applique les level-ups.
// Effets par point alloué.
//  - Modèle HISTORIQUE du sim (raccourci) : STR→+1 ATK, INT→+1 MAG (1:1),
//    AGI→+1 AGI, END→+5 HP, LCK→+1 LCK. Conservé par défaut pour ne pas
//    invalider les rapports existants.
//  - Modèle REWORK (--stat-rework) : aligné sur STAT_POINT_EFFECTS réel —
//    STR→+1 ATK +1 STR · INT→+1 INT · AGI→+1 AGI · END→+1 END +5 HP · LCK→+1 LCK.
//    Les conversions INT→MAG (4:1) et END→DEF (4:1) sont appliquées plus tard,
//    dans recalcEffectiveStats, à partir des _base secondaires. L'END GAGNÉE
//    via équipement/sets donne aussi +5 PV (D2bis, appliqué après les sets).
function applyStatPoints(c, points, cfg) {
  if (cfg && cfg.statRework) {
    c._baseAtk += points.str || 0;   // STR garde le couplage +1 ATK (D4)
    c._baseStr += points.str || 0;
    c._baseInt += points.int || 0;
    c._baseAgi += points.agi || 0;
    c._baseEnd += points.end || 0;
    c.hpMax    += 5 * (points.end || 0);
    c._baseLck += points.lck || 0;
    return;
  }
  c._baseAtk += points.str || 0;
  c._baseMag += points.int || 0;
  c._baseAgi += points.agi || 0;
  c._baseEnd += points.end || 0;
  c.hpMax    += 5 * (points.end || 0);
  c._baseLck += points.lck || 0;
}

// Pénétration de DEF par la STR (D4) — courbe de Hill (n=2) : douce au
// début, quasi-linéaire au milieu, plateau logarithmique vers penCap.
//   penFrac(STR) = penCap · STR² / (STR² + penHalf²)
function strPenFrac(str, cfg) {
  const cap = (cfg && typeof cfg.penCap === 'number') ? cfg.penCap : 0.50;
  const h   = (cfg && cfg.penHalf) || 20;
  const s   = Math.max(0, str || 0);
  return cap * (s * s) / (s * s + h * h);
}

// D5 volet AGI — modèle « Célérité » (gain de tour FLUIDE, non par palier).
// Taux continu d'actions supplémentaires par round, courbe de Hill sur l'AGI
// (miroir de reflexFrac). Renvoie une fraction [0, celeriteMax). Le gain de
// tour est lissé par un accumulateur (simulateBattle) : le taux — pas un seuil
// — pilote la fréquence d'actions sup. Cf. .claude/plans/agi-derived.md §2.
function celeriteFrac(agi, cfg) {
  const cap = (cfg && cfg.celeriteMax) || 0;
  if (cap <= 0) return 0;
  const h = (cfg && cfg.celeriteHalf) || 45;
  const a = Math.max(0, agi || 0);
  return cap * (a * a) / (a * a + h * h);
}

// D5 volet LCK — Fortune (stat dérivée, miroir de _fortuneCurve runtime).
//   fortune = asymptote · x² / (x² + half²),  x = LCK (+ bonus Fortune éventuel)
// Pilote drops/or/fouille/fuite/pièges en jeu. Dans CE sim (win-rate, sans
// fuite ni butin simulés) elle est neutre — calculée pour parité/visibilité ;
// son vrai effet économique est modélisé dans tools/sim-economy.js.
function fortuneCurve(x, cfg) {
  const a = (cfg && typeof cfg.fortuneAsymptote === 'number') ? cfg.fortuneAsymptote : 0.31;
  const h = (cfg && cfg.fortuneHalf) || 30;
  const v = Math.max(0, x || 0);
  return a * (v * v) / (v * v + h * h);
}

function createHero(key, level, cfg, floor, partySize) {
  const def = CHARACTERS[key];
  const c = {
    name: def.name,
    role: def.role,
    hpMax: def.hp,  hp: def.hp,
    spMax: def.sp,  sp: def.sp,
    _baseAtk: def.atk, _baseDef: def.def, _baseMag: def.mag, _baseLck: def.lck,
    _baseStr: def.str, _baseInt: def.int, _baseAgi: def.agi, _baseEnd: def.end,
    str: def.str, int: def.int, agi: def.agi, end: def.end,
    spells: [...def.spells],
    shieldTurns: 0,
    statusEffects: [],
    potionStock: 0,         // rempli plus bas si cfg.usePotions
  };
  const learnByLevel = {
    2:  { hermione: ['Expelliarmus'] },
    3:  { harry: ['Accio'], hermione: ['Stupefix'] },
    4:  { harry: ['Wingardium Leviosa'] },
    5:  { harry: ['Reparo'], hermione: ['Diffindo'] },
    7:  { harry: ['Diffindo'], hermione: ['Wingardium Leviosa', 'Reparo'] },
    9:  { both: ['Avada...'] },
  };
  const allocation = buildFor(cfg.build, key);
  const ptsPerLevel = cfg.statPoints || 0;
  for (let lv = 2; lv <= level; lv++) {
    // baseline level-up (inchangée)
    c.hpMax += 8;  c.hp = c.hpMax;
    c.spMax += 5;  c.sp = c.spMax;
    c._baseAtk += 1;  c._baseDef += 1;  c._baseMag += 1;
    // Croissance des stats secondaires +1/niveau (jeu réel —
    // battle-rewards.js _grantLevelStats). Omise par le sim historique car
    // STR/INT/AGI n'avaient aucun effet combat ; indispensable dès que le
    // rework les consomme. Gated par --fair-baseline (impliqué par
    // --stat-rework) pour que la comparaison mesure le rework PUR.
    if (cfg.fairBaseline) { c._baseStr += 1;  c._baseInt += 1;  c._baseAgi += 1; }
    // points libres alloués selon le build
    if (ptsPerLevel > 0) {
      const total = (allocation.str || 0) + (allocation.int || 0) + (allocation.agi || 0)
                  + (allocation.end || 0) + (allocation.lck || 0);
      // Normalise au statPoints demandé si total ≠ statPoints
      const scale = total > 0 ? ptsPerLevel / total : 0;
      applyStatPoints(c, {
        str: Math.round((allocation.str || 0) * scale),
        int: Math.round((allocation.int || 0) * scale),
        agi: Math.round((allocation.agi || 0) * scale),
        end: Math.round((allocation.end || 0) * scale),
        lck: Math.round((allocation.lck || 0) * scale),
      }, cfg);
    }
    // apprentissage de sorts
    const learn = learnByLevel[lv];
    if (learn) {
      const adds = (learn[key] || []).concat(learn.both || []);
      for (const sp of adds) if (!c.spells.includes(sp)) c.spells.push(sp);
    }
  }
  // Récompenses de quêtes (stats permanentes) si modélisées.
  if (cfg.useQuests && typeof floor === 'number') {
    applyQuestStatRewards(c, floor);
  }
  // Paliers endgame de Maison (Mythe/Apothéose) — delta de stats sur _baseX.
  applyHouseTierBonuses(c, cfg);
  // Série Apothéose ★ N (tier 19+) — gold-sink endgame, cadence cumulative.
  applyStarGenerator(c, cfg.houseSet, cfg.stars || 0);
  // Soin complet après les level-ups (l'allocation END a augmenté hpMax)
  c.hp = c.hpMax; c.sp = c.spMax;
  // Stats effectives = _base* (avant équipement). Inclut les gains
  // des level-ups, points libres et récompenses de quêtes.
  c.atk = c._baseAtk; c.def = c._baseDef; c.mag = c._baseMag; c.lck = c._baseLck;
  c.str = c._baseStr; c.int = c._baseInt; c.agi = c._baseAgi; c.end = c._baseEnd;
  // Bonus équipement (best-in-slot dispo en boutique à cet étage)
  if (cfg.useEquipment && typeof floor === 'number') {
    applyEquipmentBuff(c, floor);
  }
  // Stock de potions : la sim suppose que le joueur entre en combat
  // avec quelques consommables. Quantité croît avec l'étage (plus de
  // gold cumulé → plus de potions achetées).
  if (cfg.usePotions && typeof floor === 'number') {
    c.potionStock = Math.min(8, 2 + Math.floor(floor / 2));
  }
  // Bonus de set (Maison 4/4 + Ténèbres 3/3) — après l'équipement.
  applySetBonuses(c, cfg, key, partySize);
  // END → PV max : +5 PV par point d'END GAGNÉ via équipement/sets (miroir
  // runtime — inventory-core.js recalculateStats, D2bis). L'END de base et
  // l'END allouée sont dans _baseEnd (l'allocation a déjà crédité hpMax de
  // +5/pt, cf. applyStatPoints) → (c.end − c._baseEnd) isole l'END gagnée,
  // aucun double-comptage. Toujours actif (comme au runtime), indépendant de
  // statRework.
  c.hpMax += 5 * Math.max(0, (c.end || 0) - (c._baseEnd || 0));
  c.hp = c.hpMax;
  // Rework D1/D2 — conversions stat secondaire → primaire. INT→MAG et
  // END→DEF, diviseurs réglables (--int-mag-div / --end-def-div). Appliquées
  // APRÈS base + équipement + sets (miroir de la place dans recalculateStats),
  // sur les stats effectives finales c.int / c.end. Le crit physique calculé
  // ci-dessous reste piloté par LCK ; la DEF gagnée n'affecte que la mitigation.
  if (cfg.statRework) {
    c.mag += Math.floor((c.int || 0) / (cfg.intMagDiv || 4));
    c.def += Math.floor((c.end || 0) / (cfg.endDefDiv || 4));
    c._dotResDiv = cfg.dotResDiv || 8;   // D3 — résistance aux DoT (lu en combat)
    c._strPen    = strPenFrac(c.str, cfg); // D4 — pénétration de DEF (lue en combat)
  }
  // LCK plafonne à 40 % ; les bonus équipement/set s'ajoutent au-dessus
  // (plafond absolu 100 %). Deux canaux de crit : physique et sort.
  const lckCrit = Math.min(40, 5 + c.lck * 0.5);
  c.critChance          = Math.max(5, Math.min(100, lckCrit + (c._critBonus || 0) + (c._setCrit || 0)));
  c.spellCritChance     = Math.max(5, Math.min(100, lckCrit + (c._spellCritBonus || 0) + (c._setSpellCrit || 0)));
  c.dodgeChance         = Math.max(5, Math.min(35, 5 + c.agi * 0.4 + (c._dodgeBonus || 0) + (c._setDodge || 0)));
  // D5 volet AGI — Célérité : taux continu d'actions supplémentaires par round
  // (gain de tour FLUIDE, accumulé par simulateBattle). Stat dérivée sur l'AGI
  // effective. 0 si levier inactif (cfg.celeriteMax == 0) → historique inchangé.
  c._celerite           = celeriteFrac(c.agi, cfg);
  // D5 volet LCK — Fortune (parité runtime ; win-rate-neutre ici, cf. helper).
  c._fortuneX           = c.lck + (c._fortuneBonus || 0);
  c.fortune             = fortuneCurve(c._fortuneX, cfg);
  c.critMultiplier      = 1.5 + (c._critDmgBonus || 0) + (c._setCritDmg || 0);
  c.spellCritMultiplier = 1.5 + (c._spellCritDmgBon || 0) + (c._setSpellCritDmg || 0);
  // Passif d'Apothéose (palier 18 — houseApotheosePassive). Tous posés
  // ici puis consommés selon le canal : Gryffondor sur les stats de crit,
  // Serpentard / Serdaigle / Poufsouffle via un flag lu en combat
  // (heroAct / simSpellForCaster). La régén PV/PM hors combat de
  // Poufsouffle reste hors modèle — la sim repart PV/PM pleins à chaque
  // combat ; seule sa composante DPS « Vigueur » est mesurée.
  if ((cfg.houseTier || 0) >= 18) {
    if (cfg.houseSet === 'gryffondor') {
      // Apothéose Cœur du Lion : +10 % crit (déclencheur d'Élan),
      // +15 % dégâts crit. flat, et le cumul « Élan » (heroAct/_updateElan).
      c.critChance          = Math.min(100, c.critChance + 10);
      c.spellCritChance     = Math.min(100, c.spellCritChance + 10);
      c.critMultiplier      = Math.min(2.5, c.critMultiplier + 0.15);
      c.spellCritMultiplier = Math.min(2.5, c.spellCritMultiplier + 0.15);
      c._gryffElan  = true;
      c._elanStep   = (cfg.elanStep || 8) / 100;
      c._elanCap    = cfg.elanCap || 5;
      c._elanDecay  = cfg.elanDecay || 'none';
      c._elanStacks = 0;
    } else if (cfg.houseSet === 'serpentard') {
      c._serpentLifesteal = (c._serpentLifesteal || 0) + 0.15;  // + 0.10 du set 4pc
    } else if (cfg.houseSet === 'serdaigle') {
      c._spellCostMult = (c._spellCostMult || 1) * 0.8;          // × 0.90 du set 4pc
    } else if (cfg.houseSet === 'poufsouffle') {
      c._houseVigor = true;   // Vigueur : +20 % dégâts au-dessus de 60 % PV
    }
  }
  c.level = level;
  // Bibliothèque interdite : niveau d'upgrade appliqué à tous les sorts.
  c.libraryLevel = cfg.library || 0;
  return c;
}

// ── Progression d'XP attendue par étage ──────────────────────

// xpNext progression : 50, 80, 128, 204, 326, 521, 833, 1332, 2131, 3409, 5455, 8728, 13965...
function xpNeededForLevel(level) {
  // XP cumulé requis pour atteindre `level` depuis le niveau 1
  let total = 0; let xpNext = 50;
  for (let lv = 1; lv < level; lv++) {
    total += xpNext;
    xpNext = Math.floor(xpNext * LEVEL_UP_XP_MULTIPLIER);
  }
  return total;
}

function levelFromXp(totalXp) {
  let level = 1; let xpNext = 50; let acc = 0;
  while (acc + xpNext <= totalXp) { acc += xpNext; level++; xpNext = Math.floor(xpNext * LEVEL_UP_XP_MULTIPLIER); }
  return level;
}

// XP moyenne d'un combat à l'étage f (cfg.xpMult appliqué)
function avgCombatXp(floor, partySize, cfg) {
  const pool = eligiblePool(floor, cfg);
  if (!pool.length) return 0;
  const totalW = pool.reduce((s, m) => s + (m.weight || 1), 0);
  const avgXpScaled = pool.reduce((s, m) => {
    const xp = scaledStatValue(m.xp, m.scale || 0.25, 'xp', floor, cfg) * cfg.xpMult;
    return s + (m.weight || 1) * xp;
  }, 0) / totalW;
  const samples = 200;
  let totalSize = 0;
  for (let i = 0; i < samples; i++) totalSize += rollGroupSize(floor, partySize, cfg);
  const avgSize = totalSize / samples;
  return avgXpScaled * avgSize;
}

// Niveau attendu à l'entrée de l'étage f, en assumant `COMBATS_PER_FLOOR_AVG` combats / étage
// + XP des quêtes complétées avant cet étage (si cfg.useQuests).
function expectedLevelAtFloor(floor, partySize, cfg) {
  let totalXp = 0;
  for (let f = 1; f < floor; f++) {
    totalXp += avgCombatXp(f, partySize, cfg) * COMBATS_PER_FLOOR_AVG;
  }
  if (cfg.useQuests) totalXp += questXpUpToFloor(floor);
  return levelFromXp(totalXp);
}

// ── Stats moyennes du pool ennemi à l'étage f ────────────────

function poolStats(floor, cfg) {
  const pool = eligiblePool(floor, cfg);
  if (!pool.length) return null;
  const totalW = pool.reduce((s, m) => s + (m.weight || 1), 0);
  const wAvg = (key, postMult = 1) => pool.reduce((s, m) => {
    const v = scaledStatValue(m[key] || 0, m.scale || 0.25, key, floor, cfg);
    return s + (m.weight || 1) * Math.floor(v * postMult);
  }, 0) / totalW;
  return {
    poolSize: pool.length,
    hp:  wAvg('hp', cfg.hpMult),
    atk: wAvg('atk'),
    def: wAvg('def'),
    mag: wAvg('mag'),
  };
}

// ── Simulation d'un combat ───────────────────────────────────

// IA joueur très simple :
//   1. Si char.hp < 40 % et un sort de soin dispo (Episkey/Reparo) et SP ok → heal soi
//   2. Si shield disponible (Protego) et turn==1 et HP < 100% → Protego
//   3. Si meilleur sort de dégât dispo et SP ok → cast sur 1er ennemi vivant
//   4. Sinon attaque physique
//
// IA ennemi : tryEnemyAbility() puis attaque physique. Les capacités
// `effect:"status"` à DoT (burn/poison/bleed/gel) posent un statut
// persistant qui tick chaque tour ennemi (cf. tickStatuses du runtime).
// Le stun n'est pas modélisé (saut de tour).

// Statuts DoT infligés par les ennemis et modélisés par la sim.
const SIM_DOT_IDS = ['burn', 'poison', 'bleed', 'gel'];
// Statuts de contrôle non-DoT désormais modélisés (battle.js — consumeStun /
// rollFearSkip). `stun` saute le prochain tour ; `fear` 50 % de saut/tour.
const SIM_CTRL_IDS = ['stun', 'fear'];

// Miroir de battle.js — consumeStun : consomme 1 tour de stun au point de
// saut. Retourne true si l'acteur était étourdi (et saute son tour).
function consumeStunSim(actor) {
  if (!actor.statusEffects) return false;
  const s = actor.statusEffects.find(st => st.id === 'stun' && st.turns > 0);
  if (!s) return false;
  s.turns--;
  if (s.turns <= 0) actor.statusEffects = actor.statusEffects.filter(st => st !== s);
  return true;
}
function isFearedSim(actor) {
  return !!(actor.statusEffects &&
    actor.statusEffects.some(st => st.id === 'fear' && st.turns > 0));
}

// Effets de sort considérés comme offensifs mono-cible (dérivé de SPELLS —
// remplace l'ancienne liste de noms figée). Couvre élémentaire, instant,
// vol de vie, malédiction et asservissement.
const DAMAGING_EFFECTS = new Set(['stun', 'burn', 'instant', 'lifesteal', 'curse', 'imperius']);

// Sélection de cible ennemie par tempérament (battle.js — _chooseEnemyTarget).
function chooseEnemyTargetSim(enemy, alive) {
  if (alive.length <= 1) return alive[0];
  const ai = enemy.ai;
  if (ai === 'aggressive') return alive.reduce((a, b) => (b.hp < a.hp ? b : a));
  if (ai === 'cautious')   return alive.reduce((a, b) => ((b.atk || 0) > (a.atk || 0) ? b : a));
  return alive[Math.floor(Math.random() * alive.length)];
}

// Phases de boss (battle.js — _checkBossPhases). Appliquées en tête du tour
// ennemi. `phases` triées par atPct décroissant ; chaque palier ne se
// déclenche qu'une fois (suivi via `_phaseIdx`).
function checkBossPhasesSim(enemy) {
  if (!enemy.phases || !enemy.phases.length) return;
  const maxHp = enemy.hp || enemy.currentHp;
  const pct = enemy.currentHp / maxHp;
  if (enemy._phaseIdx === undefined) enemy._phaseIdx = 0;
  while (enemy._phaseIdx < enemy.phases.length) {
    const ph = enemy.phases[enemy._phaseIdx];
    if (pct > ph.atPct) break;
    if (ph.atkMult) enemy.atk = Math.round(enemy.atk * ph.atkMult);
    if (ph.magMult && enemy.mag) enemy.mag = Math.round(enemy.mag * ph.magMult);
    if (ph.healPct) enemy.currentHp = Math.min(maxHp, enemy.currentHp + Math.round(maxHp * ph.healPct));
    if (ph.gainAbility) {
      if (!enemy.abilities) enemy.abilities = [];
      enemy.abilities.push(ph.gainAbility);
    }
    enemy._phaseIdx++;
  }
}

function simulateBattle(party, enemyGroup, opts = {}) {
  // Reset state pour la sim. Élan est un cumul de combat — il repart à
  // zéro à chaque combat (jamais sérialisé, comme l'état de combat réel).
  // `keepVitals` (run d'étage) : on conserve les PV/PM reportés du combat
  // précédent ; sinon on repart à neuf. L'état de combat (bouclier, statuts,
  // Élan, Garde) est toujours réinitialisé — il est combat-scoped, comme
  // `startBattle` (battle.js) qui reset shieldTurns/guardTurns/guardRegenCooldown.
  party.forEach(c => {
    if (!opts.keepVitals) { c.hp = c.hpMax; c.sp = c.spMax; }
    c.shieldTurns = 0; c.statusEffects = []; c._elanStacks = 0;
    c.guardStacks = 0; c.guardRegenCD = 0;
    c._celGauge = 0;   // D5 AGI — accumulateur de Célérité (combat-scoped)
  });
  enemyGroup.forEach(e => { e.currentHp = e.hp; e.disarmed = 0; });

  const partySize = party.length;
  let turn = 0;
  const MAX_TURNS = 80;
  let totalEnemyDmg = 0;

  while (turn < MAX_TURNS) {
    turn++;

    // Tour de chaque héros vivant
    for (const char of party) {
      if (char.hp <= 0) continue;
      // Contrôle : stun saute le tour (et consomme 1 tour de stun) ;
      // fear saute 50 % du temps (battle.js — consumeStun / rollFearSkip).
      if (consumeStunSim(char)) continue;
      if (isFearedSim(char) && Math.random() < 0.5) continue;
      // D5 AGI — Célérité : gain de tour FLUIDE. L'accumulateur monte de
      // `_celerite` par round ; chaque franchissement de 1.0 donne UNE action
      // supplémentaire (le taux, pas un seuil, pilote la fréquence). 1 action
      // si levier inactif (_celerite == 0).
      let actions = 1;
      if (char._celerite > 0) {
        char._celGauge = (char._celGauge || 0) + char._celerite;
        while (char._celGauge >= 1) { char._celGauge -= 1; actions++; }
      }
      for (let a = 0; a < actions; a++) {
        const enemies = enemyGroup.filter(e => e.currentHp > 0);
        if (!enemies.length) {
          const survivors = party.filter(c => c.hp > 0).length;
          return { won: true, turns: turn, survivors, hpPct: avgHpPct(party), enemyDmg: totalEnemyDmg };
        }
        heroAct(char, enemies);
      }
    }

    // Tour ennemi
    const aliveTargets = party.filter(c => c.hp > 0);
    if (!aliveTargets.length) {
      return { won: false, turns: turn, survivors: 0, hpPct: 0, enemyDmg: totalEnemyDmg };
    }
    for (const enemy of enemyGroup) {
      if (enemy.currentHp <= 0) continue;
      // Phases de boss évaluées en tête de tour (peut enrager / soigner /
      // gagner une capacité). Puis ciblage par tempérament.
      checkBossPhasesSim(enemy);
      const stillAlive = party.filter(c => c.hp > 0);
      if (!stillAlive.length) break;
      const target = chooseEnemyTargetSim(enemy, stillAlive);
      if (!target || target.hp <= 0) continue;
      totalEnemyDmg += enemyAct(enemy, target, partySize);
    }

    // Tick des DoT sur les héros, en fin de tour ennemi
    // (miroir de tickStatuses appelé dans battle.js — enemyTurn).
    for (const char of party) {
      if (char.hp <= 0 || !char.statusEffects.length) continue;
      const remaining = [];
      for (const s of char.statusEffects) {
        if (SIM_DOT_IDS.includes(s.id)) {
          // DoT : dégâts puis décompte (miroir de tickStatuses).
          // Rework D3 — résistance aux DoT : l'END atténue chaque tick de
          // floor(END/dotResDiv). Sans rework, _dotResDiv est undefined →
          // pas d'atténuation (comportement historique inchangé).
          const dotRes = char._dotResDiv ? Math.floor((char.end || 0) / char._dotResDiv) : 0;
          const dmg = Math.max(1, s.power - dotRes);
          char.hp = Math.max(0, char.hp - dmg);
          totalEnemyDmg += dmg;
          s.turns--;
          if (s.turns > 0) remaining.push(s);
        } else if (s.id === 'fear') {
          // fear : décompté par round, aucun dégât (le saut est géré au tour).
          s.turns--;
          if (s.turns > 0) remaining.push(s);
        } else {
          // stun : décompté par consumeStunSim au point de saut, pas ici.
          remaining.push(s);
        }
      }
      char.statusEffects = remaining;
    }
    // Cooldown de regen PM de la Garde — un décompte par round écoulé
    // (miroir de battle.js — enemyTurn, fix PR #213).
    for (const char of party) {
      if (char.guardRegenCD > 0) char.guardRegenCD--;
    }
    if (!party.some(c => c.hp > 0)) {
      return { won: false, turns: turn, survivors: 0, hpPct: 0, enemyDmg: totalEnemyDmg };
    }
  }

  // Stalemate (très long) — on considère comme une défaite mole
  return { won: false, turns: MAX_TURNS, survivors: party.filter(c => c.hp > 0).length, hpPct: avgHpPct(party), enemyDmg: totalEnemyDmg, stalemate: true };
}

function avgHpPct(party) {
  return party.reduce((s, c) => s + Math.max(0, c.hp) / c.hpMax, 0) / party.length;
}

// Candidat « Élan » (Gryffondor) : met à jour le cumul après une action
// offensive. Crit → +1 palier (cap) ; sinon, décroît selon le mode.
function _updateElan(char, didCrit) {
  if (!char._gryffElan) return;
  if (didCrit) char._elanStacks = Math.min(char._elanCap, (char._elanStacks || 0) + 1);
  else if (char._elanDecay === 'turn') char._elanStacks = Math.max(0, (char._elanStacks || 0) - 1);
}

function heroAct(char, enemies) {
  const target = enemies[0];
  // Apothéose Poufsouffle — Vigueur : +20 % de dégâts (physique + sort)
  // au-dessus de 60 % PV. Évalué à l'ouverture du tour du héros.
  const vigor = (char._houseVigor && char.hp > char.hpMax * 0.6) ? 1.23 : 1;
  // Candidat Élan : multiplicateur des paliers accumulés (lu en début de
  // tour, mis à jour après l'action offensive).
  const elan = char._gryffElan ? (1 + char._elanStep * (char._elanStacks || 0)) : 1;

  // 1. Potion si hp critique (< 40 %) et stock dispo.
  //    Consomme le tour : pas d'attaque, mais restaure 25 PV (moyenne
  //    pondérée potion_s/potion_m/potion_l aux étages 5+). C'est
  //    exactement ce que l'utilisateur signalait : "un tour d'attaques
  //    en moins pour le joueur" en échange de la survie.
  if (char.hp < char.hpMax * 0.40 && (char.potionStock || 0) > 0) {
    char.potionStock--;
    char.hp = Math.min(char.hpMax, char.hp + 25);
    return;
  }

  // 1b. Auto-heal sort si hp < 40 % (fallback si potions épuisées)
  if (char.hp < char.hpMax * 0.40) {
    const heal = pickHealSpell(char);
    if (heal && char.sp >= heal.cost) {
      char.sp -= heal.cost;
      char.hp = Math.min(char.hpMax, char.hp + heal.power);
      return;
    }
  }

  // 1c. Garde — un héros blessé (40 % ≤ PV < 60 %) sans palier de garde
  //     échange son tour d'attaque contre 50 % de mitigation sur les coups
  //     physiques entrants (miroir de l'action Garde, battle.js). La regen
  //     PM suit le cooldown 1t/2 introduit par PR #213 (guardRegenCD).
  if (char.hp < char.hpMax * 0.60 && (char.guardStacks || 0) < 1) {
    char.guardStacks = Math.min(3, (char.guardStacks || 0) + 1);
    if ((char.guardRegenCD || 0) <= 0) {
      const pmTheo = 3 + Math.floor((char.mag || 0) / 5);
      char.sp = Math.min(char.spMax, char.sp + Math.max(0, pmTheo));
      char.guardRegenCD = 2;
    }
    return;
  }

  // 2. Best damage spell
  const dmgSpell = pickDamageSpell(char);
  if (dmgSpell && char.sp >= dmgSpell.cost) {
    char.sp -= dmgSpell.cost;
    let dmg = Math.floor((dmgSpell.power + Math.floor(char.mag / 2)) * vigor * elan);
    // Résistances / faiblesses : matching sur l'ÉLÉMENT du sort (battle-spells.js),
    // pas sur `effect` (qui ne sert qu'au routage du handler).
    if (dmgSpell.element && target.resist?.includes(dmgSpell.element)) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
    if (dmgSpell.element && target.weak?.includes(dmgSpell.element))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
    // Crit de sort (battle-spells.js — rollSpellCrit)
    const crit = Math.random() * 100 < (char.spellCritChance || 0);
    if (crit) dmg = Math.floor(dmg * (char.spellCritMultiplier || 1.5));
    target.currentHp -= dmg;
    _updateElan(char, crit);
    // Apothéose Serpentard — Soif du Serpent : 15 % des dégâts drainés
    // en PV pour le lanceur (battle-spells.js — _applySerpentLifesteal).
    if (char._serpentLifesteal && dmg > 0) {
      char.hp = Math.min(char.hpMax, char.hp + Math.floor(dmg * char._serpentLifesteal));
    }
    return;
  }

  // 3. Attaque physique
  const bonus = target.disarmed > 0 ? 2 : 0;
  // Rework D4 — perce-garde : la STR ignore une fraction (courbe de Hill) de
  // la DEF ennemie. effDef = def · (1 − penFrac(STR)). Sans rework, _strPen
  // est undefined → pénétration nulle (comportement historique inchangé).
  const effDef = Math.max(0, (target.def - bonus) * (1 - (char._strPen || 0)));
  let dmg = Math.max(1, Math.floor(mitigatedDamage(char.atk + Math.floor(Math.random() * 4), effDef) * vigor * elan));
  if (target.disarmed > 0) target.disarmed--;
  const critP = Math.random() * 100 < char.critChance;
  if (critP) dmg = Math.floor(dmg * char.critMultiplier);
  target.currentHp -= dmg;
  _updateElan(char, critP);
}

// Bibliothèque interdite — battle-spells.js — _spellForCaster :
// power +2×niveau, cost −1×niveau (plancher 1). La sim n'utilise pas
// `chance` des sorts héros (leur DoT n'est pas modélisé) ; seuls les
// DoT infligés par les ennemis le sont (cf. SIM_DOT_IDS).
function simSpellForCaster(spell, char) {
  const lvl = char && char.libraryLevel || 0;
  // Apothéose Serdaigle : −20 % de coût (ceil), appliqué APRÈS la
  // Bibliothèque — miroir de battle-spells.js — _spellSpCost.
  const costMult = (char && char._spellCostMult) || 1;
  if (!spell || (lvl <= 0 && costMult === 1)) return spell;
  const out = { ...spell };
  if (typeof spell.power === 'number') out.power = spell.power + 2 * lvl;
  if (typeof spell.cost  === 'number') {
    out.cost = Math.max(1, Math.ceil(Math.max(1, spell.cost - lvl) * costMult));
  }
  return out;
}

// Sorts de soin dispo, le plus puissant prioritaire
function pickHealSpell(char) {
  const candidates = ['Reparo', 'Episkey']
    .filter(n => char.spells.includes(n))
    .map(n => spellByName[n])
    .filter(Boolean);
  return candidates[0] ? simSpellForCaster(candidates[0], char) : undefined;
}

// Meilleur sort de dégât accessible (cost <= SP), priorité puissance brute.
// Dérivé dynamiquement des sorts connus du perso (effet offensif mono-cible) —
// inclut donc tout sort appris par livre/équipement si modélisé un jour.
function pickDamageSpell(char) {
  const affordable = char.spells
    .map(n => spellByName[n])
    .filter(s => s && !s.locked && DAMAGING_EFFECTS.has(s.effect) && (s.power || 0) > 0)
    .map(s => simSpellForCaster(s, char))
    .filter(s => char.sp >= s.cost);
  // Trie par puissance + mag/2 décroissant (puissance effective)
  affordable.sort((a, b) => (b.power + char.mag / 2) - (a.power + char.mag / 2));
  return affordable[0];
}

function enemyAct(enemy, target, partySize) {
  // Tentative de capacité spéciale (cf. battle-spells.js — tryEnemyAbility).
  // Le runtime tire d'abord TOUTES les capacités selon leur `chance`, puis
  // le tempérament choisit laquelle des réussites jouer.
  if (enemy.abilities?.length) {
    const fired = enemy.abilities.filter(a => Math.random() < a.chance);
    let ability = null;
    if (fired.length) {
      const ai = enemy.ai;
      if (ai === 'aggressive') {
        ability = fired.find(a => a.effect === 'damage' || a.effect === 'drain' || a.effect === 'maxhpdamage') || fired[0];
      } else if (ai === 'cautious') {
        const lowHp = enemy.currentHp < (enemy.hp || enemy.currentHp) * 0.35;
        ability = lowHp
          ? (fired.find(a => a.effect === 'heal') || fired.find(a => a.effect === 'drain') || fired[0])
          : (fired.find(a => a.effect === 'weaken' || a.effect === 'dispel') || fired[0]);
      } else {
        ability = fired[0];
      }
    }
    if (ability) {
      switch (ability.effect) {
        case 'damage': {
          // DEF cible atténue désormais la capacité (cf. fix design
          // battle-spells.js). Division par 3 : effet modéré.
          const raw = ability.power + Math.floor((enemy.mag || 0) / 2);
          const dmg = Math.max(1, raw - Math.floor((target.def || 0) / 3));
          if (target.shieldTurns > 0) { target.shieldTurns--; return 0; }
          target.hp = Math.max(0, target.hp - dmg);
          return dmg;
        }
        case 'maxhpdamage': {
          // Broyer — dégâts = power × PV MAX de la cible, contournant la DEF.
          // Contre-tank : scale avec le pool de PV. Le bouclier l'annule (comme
          // 'damage') ; plancher à 1. Guard non modélisé ici (miroir de 'damage').
          //
          // Borne anti-grind (ability.cap > 0) : plafonne la part PV max par un
          // multiple d'une « référence de dégât de base », pour découpler Broyer
          // de la progression du joueur. Deux références mesurées :
          //   capRef 'atk' → cap = cap × enemy.atk (brut, indexé sur l'étage,
          //                  indépendant du joueur ; ceiling anti-grind).
          //   capRef 'hit' → cap = cap × coup normal (atk − def mitigé) ; rétrécit
          //                  quand la DEF du joueur monte → contre activement le
          //                  level-scaling (sur-level ⇒ DEF↑ ⇒ cap↓).
          let dmg = Math.floor((target.hpMax || target.hp) * ability.power);
          if (ability.cap > 0) {
            const ref = (ability.capRef === 'hit')
              ? mitigatedDamage(enemy.atk, target.def)
              : enemy.atk;
            dmg = Math.min(dmg, Math.floor(ability.cap * ref));
          }
          dmg = Math.max(1, dmg);
          if (target.shieldTurns > 0) { target.shieldTurns--; return 0; }
          target.hp = Math.max(0, target.hp - dmg);
          return dmg;
        }
        case 'heal': {
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + ability.power);
          return 0;
        }
        case 'weaken': {
          // Débuff DEF temporaire, cap 3 paliers (battle-spells.js). La sim
          // ne restitue pas la DEF en fin de combat (combat-scoped) mais
          // plafonne le cumul pour ne pas surestimer son impact.
          target._weakenCount = target._weakenCount || 0;
          if (target._weakenCount < 3) {
            target.def = Math.max(0, target.def - ability.power);
            target._weakenCount++;
          }
          return 0;
        }
        case 'dispel': {
          // Dissipe bouclier > garde > (regen non modélisé). Si rien à
          // dissiper, l'ennemi attaque normalement (battle-spells.js).
          if (target.shieldTurns > 0) { target.shieldTurns--; return 0; }
          if ((target.guardStacks || 0) > 0) { target.guardStacks--; return 0; }
          break;  // rien à dissiper → tombe sur l'attaque physique
        }
        case 'drain': {
          const drained = Math.min(target.hp, ability.power);
          target.hp = Math.max(0, target.hp - drained);
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
          return drained;
        }
        case 'status': {
          // Statut persistant (cf. battle-spells.js — case 'status').
          // DoT (burn/poison/bleed/gel) → tick de dégâts dans simulateBattle.
          // stun → saut du prochain tour (consumeStunSim). fear → 50 %/tour.
          const sid = ability.statusId;
          if (SIM_DOT_IDS.includes(sid) || SIM_CTRL_IDS.includes(sid)) {
            if (!target.statusEffects) target.statusEffects = [];
            const turns = ability.turns || (sid === 'stun' ? 1 : 3);
            const existing = target.statusEffects.find(s => s.id === sid);
            if (existing) {
              existing.power = Math.max(existing.power, ability.power);
              existing.turns = Math.max(existing.turns, turns);
            } else {
              target.statusEffects.push({ id: sid, power: ability.power, turns });
            }
          }
          return 0;
        }
      }
    }
  }
  // Attaque physique simple : pas de RNG côté ennemi dans le code réel.
  // Priorité miroir de battle.js — enemyTurn : Esquive > Garde > coup normal.
  if (Math.random() * 100 < (target.dodgeChance || 0)) return 0;
  // Option D — pénétration d'armure des brutes : la DEF effective du joueur
  // est réduite de (1 − penFrac), où penFrac suit la rampe à seuil sur la DEF
  // de la cible (enemyArmorPenFrac). Vaut 0 hors --enemy-pen ou ennemi non-brute.
  const penFrac = enemyArmorPenFrac(enemy, target.def);
  const tgtDef = Math.max(0, (target.def || 0) * (1 - penFrac));
  const dmg = mitigatedDamage(enemy.atk, tgtDef);
  if ((target.guardStacks || 0) > 0) {
    // Garde : mitigation 50 %, consomme un palier, riposte probabiliste
    // (30 %, atk/2 mitigée par la DEF ennemie — cf. _tryGuardCounter).
    const mitigated = Math.max(0, Math.floor(dmg / 2));
    target.hp = Math.max(0, target.hp - mitigated);
    target.guardStacks--;
    if (Math.random() * 100 < 30 && enemy.currentHp > 0) {
      enemy.currentHp -= Math.max(1, mitigatedDamage(Math.floor(target.atk / 2), enemy.def || 0));
    }
    return mitigated;
  }
  target.hp = Math.max(0, target.hp - dmg);
  return dmg;
}

// ── Boucle principale : sims solo + duo ──────────────────────

function runSimulations(cfg) {
  const rows = [];

  for (const floor of FLOORS) {
    const pool = eligiblePool(floor, cfg);
    const stats = poolStats(floor, cfg);
    if (!stats) { rows.push({ floor, skip: true }); continue; }

    for (const partySize of [1, 2]) {
      const level = expectedLevelAtFloor(floor, partySize, cfg) + (cfg.bonusLevels || 0);
      const wins = { count: 0, turns: 0, hpPct: 0, dmgTaken: 0 };
      const groupSizes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (let i = 0; i < cfg.nSims; i++) {
        const party = partySize === 1
          ? [createHero('harry', level, cfg, floor, 1)]
          : [createHero('harry', level, cfg, floor, 2), createHero('hermione', level, cfg, floor, 2)];
        const size = rollGroupSize(floor, partySize, cfg);
        groupSizes[size]++;
        const enemyGroup = Array.from({ length: size },
          () => scaleMonster(weightedPick(pool), floor, cfg));
        const res = simulateBattle(party, enemyGroup);
        if (res.won) {
          wins.count++;
          wins.turns += res.turns;
          wins.hpPct += res.hpPct;
        }
        wins.dmgTaken += res.enemyDmg;
      }

      rows.push({
        floor, partySize, level,
        winRate: wins.count / cfg.nSims,
        avgTurns: wins.count ? wins.turns / wins.count : null,
        avgHpPctOnWin: wins.count ? wins.hpPct / wins.count : null,
        avgDmgTaken: wins.dmgTaken / cfg.nSims,
        groupSizes,
        poolStats: stats,
      });
    }
  }

  return rows;
}

// ── Run d'étage complet (PR #213 : repos partiel + fouille) ──────────
//
// `simulateBattle` mesure un combat isolé (PV/PM pleins). Un run d'étage
// enchaîne ~4 salles SANS reset des PV/PM (`keepVitals`), intercale les
// décisions de repos et les jets de fouille. C'est le seul niveau de
// modélisation où le repos partiel et le malus de fouille de PR #213
// ont un sens — ils opèrent entre les combats, pas pendant.

function avgSpPct(party) {
  return party.reduce((s, c) => s + Math.max(0, c.sp) / Math.max(1, c.spMax), 0) / party.length;
}

// Le groupe se repose si les PV ou PM moyens passent sous les seuils.
function partyNeedsRest(party) {
  const alive = party.filter(c => c.hp > 0);
  if (!alive.length) return false;
  return avgHpPct(alive) < REST_HP_THRESHOLD || avgSpPct(alive) < REST_SP_THRESHOLD;
}

// Repos (movement.js — rest). `frac` = fraction du soin appliquée :
// 1.0 hors interruption, REST_INTERRUPT_HEAL_FRACTION si une rencontre
// interrompt. Soin de base = 30 % PV/PM max.
function applyRest(party, frac) {
  party.forEach(c => {
    const healAmt = Math.floor(c.hpMax * 0.3 * frac);
    const spAmt   = Math.floor(c.spMax * 0.3 * frac);
    c.hp = Math.min(c.hpMax, c.hp + healAmt);
    c.sp = Math.min(c.spMax, c.sp + spAmt);
  });
}

// Piège de fouille (movement.js — _triggerSearchTrap). 3 variantes
// équiprobables, jamais létal (chaque cible garde ≥ 1 PV).
function applySearchTrap(party, partySize) {
  const members = party.slice(0, partySize);
  const variant = Math.floor(Math.random() * 3);
  if (variant === 0) {
    members.forEach(c => {
      if (c.hp <= 0) return;
      c.hp = Math.max(1, c.hp - Math.max(1, Math.floor(c.hpMax * 0.12)));
    });
  } else if (variant === 1) {
    const alive = members.filter(c => c.hp > 0);
    if (alive.length) {
      const v = alive[Math.floor(Math.random() * alive.length)];
      v.hp = Math.max(1, v.hp - Math.max(1, Math.floor(v.hpMax * 0.20)));
    }
  } else {
    members.forEach(c => {
      if (c.hp <= 0) return;
      c.hp = Math.max(1, c.hp - Math.max(1, Math.floor(c.hpMax * 0.08)));
      c.sp = Math.max(0, c.sp - Math.floor(c.spMax * 0.10));
    });
  }
}

// Simule un étage complet. Retourne { cleared, ...compteurs }.
function simulateFloorRun(cfg, floor, partySize, level) {
  const party = partySize === 1
    ? [createHero('harry', level, cfg, floor, 1)]
    : [createHero('harry', level, cfg, floor, 2), createHero('hermione', level, cfg, floor, 2)];
  const pool = eligiblePool(floor, cfg);
  const stats = { combats: 0, rests: 0, restInterrupts: 0, traps: 0, searchMonsters: 0 };

  const fight = (group) => {
    stats.combats++;
    return simulateBattle(party, group, { keepVitals: true }).won;
  };

  for (let room = 0; room < COMBATS_PER_FLOOR_AVG; room++) {
    // Décision de repos avant la salle.
    if (partyNeedsRest(party)) {
      stats.rests++;
      if (Math.random() < REST_ENCOUNTER_CHANCE) {
        // Repos interrompu : soin partiel (PR #213) puis combat contre un
        // monstre de l'étage inférieur (movement.js — rest).
        stats.restInterrupts++;
        applyRest(party, REST_INTERRUPT_HEAL_FRACTION);
        const restFloor = Math.max(1, floor - 1);
        const restPool  = eligiblePool(restFloor, cfg);
        if (!fight([scaleMonster(weightedPick(restPool), restFloor, cfg)])) {
          return { cleared: false, ...stats };
        }
      } else {
        applyRest(party, 1.0);
      }
    }
    // Fouille (1 par salle, dans la limite de SEARCHES_PER_FLOOR).
    if (room < SEARCHES_PER_FLOOR) {
      if (Math.random() < SEARCH_MONSTER_CHANCE) {
        stats.searchMonsters++;
        if (!fight([scaleMonster(weightedPick(pool), floor, cfg)])) {
          return { cleared: false, ...stats };
        }
      } else if (Math.random() < SEARCH_TRAP_CHANCE) {
        stats.traps++;
        applySearchTrap(party, partySize);
      }
    }
    // Combat de salle.
    const size  = rollGroupSize(floor, partySize, cfg);
    const group = Array.from({ length: size },
      () => scaleMonster(weightedPick(pool), floor, cfg));
    if (!fight(group)) return { cleared: false, ...stats };
  }
  return { cleared: true, endHpPct: avgHpPct(party), ...stats };
}

function runFloorSimulations(cfg) {
  const rows = [];
  for (const floor of FLOORS) {
    if (!eligiblePool(floor, cfg).length) continue;
    for (const partySize of [1, 2]) {
      const level = expectedLevelAtFloor(floor, partySize, cfg) + (cfg.bonusLevels || 0);
      const agg = { cleared: 0, combats: 0, rests: 0, restInterrupts: 0,
                    traps: 0, searchMonsters: 0, endHpPct: 0 };
      for (let i = 0; i < cfg.nSims; i++) {
        const r = simulateFloorRun(cfg, floor, partySize, level);
        if (r.cleared) { agg.cleared++; agg.endHpPct += r.endHpPct; }
        agg.combats += r.combats;
        agg.rests += r.rests;
        agg.restInterrupts += r.restInterrupts;
        agg.traps += r.traps;
        agg.searchMonsters += r.searchMonsters;
      }
      rows.push({
        floor, partySize, level,
        clearRate: agg.cleared / cfg.nSims,
        avgCombats: agg.combats / cfg.nSims,
        avgRests: agg.rests / cfg.nSims,
        restInterruptRate: agg.restInterrupts / cfg.nSims,
        badSearchRate: (agg.traps + agg.searchMonsters) / cfg.nSims,
        endHpPct: agg.cleared ? agg.endHpPct / agg.cleared : null,
      });
    }
  }
  return rows;
}

// ── Mise en forme du rapport ─────────────────────────────────

function pct(x) { return (x * 100).toFixed(0) + '%'; }
function num(x, d=1) { return x == null ? '—' : x.toFixed(d); }

function emitReport(rows, cfg) {
  // Section 1 : progression joueur attendue
  console.log('# Étude de la difficulté — mode Normal\n');
  console.log(`Simulation : ${cfg.nSims} combats par couple (étage, mode). ` +
              `Hypothèse : ${COMBATS_PER_FLOOR_AVG} combats / étage en moyenne.\n`);
  const elanInfo = cfg.gryffElan
    ? ` | Élan ${cfg.elanStep}%/palier ×${cfg.elanCap} (decay=${cfg.elanDecay})`
    : '';
  const houseInfo = cfg.houseSet
    ? ` | set=${cfg.houseSet}${cfg.houseTier ? ` | palier Maison ${cfg.houseTier}` : ''}${cfg.stars ? ` | ★${cfg.stars}` : ''}${elanInfo}`
    : '';
  const modelInfo = cfg.statRework
    ? `modèle=rework (D1–D5, jeu actuel)${cfg.celeriteMax ? ` | Célérité max ${cfg.celeriteMax}` : ''}`
    : (cfg.fairBaseline ? 'modèle=fair-baseline (croissance sans rework)' : 'modèle=legacy (historique pré-rework)');
  console.log(`Paramètres : difficulté=${cfg.difficulty || 'Normal'} | ` +
              `HP×${cfg.hpMult} | XP×${cfg.xpMult} | ` +
              `${cfg.statPoints} pts libres/niveau | build=${cfg.build} | ${modelInfo}${houseInfo}\n`);

  console.log('## 1. Progression joueur attendue\n');
  console.log('| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |');
  console.log('|------:|------------:|--------------:|-----------:|-------------:|');
  for (const f of FLOORS) {
    const lvSolo = expectedLevelAtFloor(f, 1, cfg);
    const lvDuo  = expectedLevelAtFloor(f, 2, cfg);
    let xpSolo = 0; for (let i = 1; i < f; i++) xpSolo += avgCombatXp(i, 1, cfg) * COMBATS_PER_FLOOR_AVG;
    let xpDuo  = 0; for (let i = 1; i < f; i++) xpDuo  += avgCombatXp(i, 2, cfg) * COMBATS_PER_FLOOR_AVG;
    console.log(`| ${f} | ${lvSolo} | ${xpSolo.toFixed(0)} | ${lvDuo} | ${xpDuo.toFixed(0)} |`);
  }

  // Section 2 : pool ennemi
  console.log('\n## 2. Profil ennemi moyen par étage (pondéré par weight)\n');
  console.log('| Étage | Monstres éligibles | HP moy | ATK moy | DEF moy | MAG moy |');
  console.log('|------:|-------------------:|-------:|--------:|--------:|--------:|');
  for (const f of FLOORS) {
    const s = poolStats(f, cfg);
    if (!s) continue;
    console.log(`| ${f} | ${s.poolSize} | ${num(s.hp,0)} | ${num(s.atk,1)} | ${num(s.def,1)} | ${num(s.mag,1)} |`);
  }

  // Section 3 : Monte Carlo
  console.log('\n## 3. Résultats Monte Carlo\n');
  console.log('| Étage | Mode | Niv. | Win % | Tours moy. | PV restants (win) | Dégâts moy. subis |');
  console.log('|------:|:----:|-----:|------:|-----------:|------------------:|------------------:|');
  for (const r of rows) {
    if (r.skip) continue;
    const mode = r.partySize === 1 ? 'Solo' : 'Duo ';
    console.log(`| ${r.floor} | ${mode} | ${r.level} | ${pct(r.winRate)} | ${num(r.avgTurns,1)} | ${r.avgHpPctOnWin == null ? '—' : pct(r.avgHpPctOnWin)} | ${num(r.avgDmgTaken,1)} |`);
  }

  // Section 3bis : distribution des tailles de groupe (endgame quad/quint).
  // N'apparaît qu'en mode --endgame, où les groupes de 4-5 sont débloqués.
  if (cfg.endgame) {
    console.log('\n## 3bis. Distribution des tailles de groupe (endgame)\n');
    console.log('| Étage | Mode | 1 | 2 | 3 | 4 | 5 | moy. |');
    console.log('|------:|:----:|--:|--:|--:|--:|--:|-----:|');
    for (const r of rows) {
      if (r.skip || !r.groupSizes) continue;
      const g = r.groupSizes;
      const tot = (g[1]+g[2]+g[3]+g[4]+g[5]) || 1;
      const avg = (g[1]+2*g[2]+3*g[3]+4*g[4]+5*g[5]) / tot;
      const mode = r.partySize === 1 ? 'Solo' : 'Duo ';
      console.log(`| ${r.floor} | ${mode} | ${pct(g[1]/tot)} | ${pct(g[2]/tot)} | ${pct(g[3]/tot)} | ${pct(g[4]/tot)} | ${pct(g[5]/tot)} | ${num(avg,2)} |`);
    }
  }

  // Section 4 : verdicts
  console.log('\n## 4. Diagnostic : étages charnières\n');
  const verdict = (wr) => wr >= 0.85 ? '🟢 confortable' :
                          wr >= 0.65 ? '🟡 tendu' :
                          wr >= 0.40 ? '🟠 difficile' :
                                       '🔴 punitif';

  for (const partySize of [1, 2]) {
    const label = partySize === 1 ? 'Solo' : 'Duo';
    console.log(`\n### ${label}\n`);
    console.log('| Étage | Niv. | Win % | Verdict |');
    console.log('|------:|-----:|------:|:--------|');
    for (const r of rows.filter(r => r.partySize === partySize)) {
      console.log(`| ${r.floor} | ${r.level} | ${pct(r.winRate)} | ${verdict(r.winRate)} |`);
    }
  }

  // Section 5 : spikes (variations brutales)
  console.log('\n## 5. Détection des spikes (chute > 15 pts entre 2 étages)\n');
  for (const partySize of [1, 2]) {
    const subset = rows.filter(r => r.partySize === partySize);
    const label = partySize === 1 ? 'Solo' : 'Duo';
    let found = false;
    for (let i = 1; i < subset.length; i++) {
      const delta = subset[i-1].winRate - subset[i].winRate;
      if (delta > 0.15) {
        if (!found) { console.log(`### ${label}`); found = true; }
        console.log(`- Étage ${subset[i-1].floor} → ${subset[i].floor} : win rate ${pct(subset[i-1].winRate)} → ${pct(subset[i].winRate)} (−${(delta*100).toFixed(0)} pts)`);
      }
    }
    if (!found) console.log(`### ${label}\n- Aucun spike détecté.`);
  }

  // Section 6 : monstres "scale heavy" (>= 0.30) par étage
  console.log('\n## 6. Monstres à scaling élevé (scale ≥ 0.30)\n');
  console.log('| Monstre | scale | floors | weight | HP base | ATK base |');
  console.log('|:--------|------:|:-------|-------:|--------:|---------:|');
  for (const m of MONSTERS.filter(m => (m.scale || 0.25) >= 0.30).sort((a,b)=>b.scale-a.scale)) {
    const floors = `${m.minFloor}–${m.maxFloor || '∞'}`;
    console.log(`| ${m.name} | ${m.scale} | ${floors} | ${m.weight} | ${m.hp} | ${m.atk} |`);
  }
}

// Section 7 : run d'étage complet (mécaniques PR #213).
function emitFloorReport(rows, cfg) {
  console.log('\n## 7. Run d\'étage complet — PR #213 (repos partiel + malus de fouille)\n');
  console.log(`Enchaîne ${COMBATS_PER_FLOOR_AVG} salles sans reset des PV/PM, avec ` +
    `décision de repos (seuils PV < ${REST_HP_THRESHOLD * 100} % / PM < ${REST_SP_THRESHOLD * 100} %) ` +
    `et ${SEARCHES_PER_FLOOR} fouilles par étage (jets de malus PR #213). ` +
    `« Étage réussi » = groupe vivant au bout des salles.\n`);
  console.log('| Étage | Mode | Niv. | Étage réussi % | Combats moy. | Repos moy. | Repos interrompu % | Fouille néfaste % | PV fin (réussi) |');
  console.log('|------:|:----:|-----:|---------------:|-------------:|-----------:|-------------------:|------------------:|----------------:|');
  for (const r of rows) {
    const mode = r.partySize === 1 ? 'Solo' : 'Duo ';
    console.log(`| ${r.floor} | ${mode} | ${r.level} | ${pct(r.clearRate)} | ` +
      `${num(r.avgCombats, 1)} | ${num(r.avgRests, 2)} | ${pct(r.restInterruptRate)} | ` +
      `${pct(r.badSearchRate)} | ${r.endHpPct == null ? '—' : pct(r.endHpPct)} |`);
  }
}

// ── Comparaison baseline vs proposition (mode --compare) ────
function emitComparison(baseline, proposed, cfgProposed) {
  console.log('# Comparaison baseline vs proposition\n');
  console.log(`Sims : ${cfgProposed.nSims} / cellule. Hypothèse : ${COMBATS_PER_FLOOR_AVG} combats / étage.\n`);
  console.log('**Baseline** : HP×1.0, XP×1.0, 0 pt libre.');
  console.log(`**Proposition** : HP×${cfgProposed.hpMult}, XP×${cfgProposed.xpMult}, ` +
              `${cfgProposed.statPoints} pts libres/niveau, build=${cfgProposed.build}.\n`);

  for (const partySize of [1, 2]) {
    const label = partySize === 1 ? 'Solo' : 'Duo';
    console.log(`\n## ${label}\n`);
    console.log('| Étage | Niv. base | Niv. prop | Win % base | Win % prop | Δ win | Tours base | Tours prop |');
    console.log('|------:|----------:|----------:|-----------:|-----------:|------:|-----------:|-----------:|');
    const baseRows = baseline.filter(r => r.partySize === partySize);
    const propRows = proposed.filter(r => r.partySize === partySize);
    for (let i = 0; i < baseRows.length; i++) {
      const b = baseRows[i], p = propRows[i];
      const delta = (p.winRate - b.winRate) * 100;
      const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(0) + ' pts';
      const tBase = b.avgTurns == null ? '—' : b.avgTurns.toFixed(1);
      const tProp = p.avgTurns == null ? '—' : p.avgTurns.toFixed(1);
      console.log(`| ${b.floor} | ${b.level} | ${p.level} | ${pct(b.winRate)} | ${pct(p.winRate)} | ${deltaStr} | ${tBase} | ${tProp} |`);
    }
  }

  // Verdicts qualitatifs
  console.log('\n## Verdict\n');
  for (const partySize of [1, 2]) {
    const label = partySize === 1 ? 'Solo' : 'Duo';
    const baseRows = baseline.filter(r => r.partySize === partySize);
    const propRows = proposed.filter(r => r.partySize === partySize);
    const wallBase = baseRows.findIndex(r => r.winRate < 0.40);
    const wallProp = propRows.findIndex(r => r.winRate < 0.40);
    const wallBaseF = wallBase === -1 ? '—' : baseRows[wallBase].floor;
    const wallPropF = wallProp === -1 ? '—' : propRows[wallProp].floor;
    console.log(`- **${label}** : mur (<40 %) baseline → étage ${wallBaseF} | proposition → étage ${wallPropF}`);
    // Tours moyens floors 1-3
    const earlyBaseT = baseRows.slice(0,3).reduce((s,r)=>s+(r.avgTurns||0),0)/3;
    const earlyPropT = propRows.slice(0,3).reduce((s,r)=>s+(r.avgTurns||0),0)/3;
    console.log(`  - Tours moyens étages 1-3 : baseline ${earlyBaseT.toFixed(1)} → proposition ${earlyPropT.toFixed(1)} (combats ${earlyPropT > earlyBaseT * 1.3 ? 'plus longs ✓' : earlyPropT > earlyBaseT ? 'légèrement plus longs' : 'inchangés'})`);
  }
}

if (ARGS.mode === 'compare') {
  // Force build=balanced statPoints=3 hp=1.5 xp=1.3 si non spécifié
  const cfgBase = { nSims: ARGS.nSims, hpMult: 1.0, xpMult: 1.0, statPoints: 0, build: 'balanced' };
  const cfgProp = {
    nSims: ARGS.nSims,
    hpMult: ARGS.hpMult !== 1.0 ? ARGS.hpMult : 1.5,
    xpMult: ARGS.xpMult !== 1.0 ? ARGS.xpMult : 1.3,
    statPoints: ARGS.statPoints || 3,
    build: ARGS.build,
  };
  console.error(`Run baseline (${cfgBase.nSims} sims)...`);
  const baseRows = runSimulations(cfgBase);
  console.error(`Run proposition (${cfgProp.nSims} sims)...`);
  const propRows = runSimulations(cfgProp);
  emitComparison(baseRows, propRows, cfgProp);
} else {
  // cfg = ARGS complet : conserve useQuests/useEquipment/usePotions/
  // bonusLevels/artifacts (sinon le modèle joueur serait amputé).
  const rows = runSimulations(ARGS);
  emitReport(rows, ARGS);
  emitFloorReport(runFloorSimulations(ARGS), ARGS);
}
