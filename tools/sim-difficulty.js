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
  const questsSrc   = fs.readFileSync(path.join(root, 'js/quests.js'),   'utf8');
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
    `;exports.ITEMS = ITEMS;\n`;
  vm.runInContext(patchedData, sandbox, { filename: 'data.js' });

  // quests.js : seule la constante `QUEST_TEMPLATES` nous intéresse.
  // Le reste du fichier touche le DOM (already stubbed) ou ne sera pas
  // appelé par la sim. On capture la déclaration top-level.
  const patchedQuests = questsSrc + '\n;exports.QUEST_TEMPLATES = QUEST_TEMPLATES;';
  vm.runInContext(patchedQuests, sandbox, { filename: 'quests.js' });

  const patchedShop = shopSrc + '\n;exports.SHOP_CATALOG = SHOP_CATALOG;';
  vm.runInContext(patchedShop, sandbox, { filename: 'shop.js' });

  return sandbox.exports;
}

const { MONSTERS, SPELLS, CHARACTERS, LEVEL_UP_XP_MULTIPLIER,
        RESIST_MULTIPLIER, WEAK_MULTIPLIER, ITEMS,
        QUEST_TEMPLATES, SHOP_CATALOG } = loadGameData();

const spellByName = Object.fromEntries(SPELLS.map(s => [s.name, s]));

// Miroir de battle.js — mitigatedDamage (DIFFICULTY_STUDY.md §4 levier B).
// Plancher à 25 % de l'ATK brute, soustraction au-delà.
const DAMAGE_MIN_FRACTION = 0.25;
function mitigatedDamage(rawAtk, def) {
  const floorDmg = Math.round(Math.max(0, rawAtk) * DAMAGE_MIN_FRACTION);
  return Math.max(floorDmg, rawAtk - Math.max(0, def || 0));
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
                 crit: 0, dodge: 0, critDmg: 0, spellCrit: 0, spellCritDmg: 0 };
  const bestBySlot = {};
  for (const it of ITEMS) {
    if (!it.slot) continue;
    if (eligibleIds && !eligibleIds.has(it.id)) continue;
    const score = (it.bonusAtk||0)+(it.bonusDef||0)+(it.bonusMag||0)+(it.bonusLck||0)
                + (it.bonusStr||0)+(it.bonusInt||0)+(it.bonusAgi||0)+(it.bonusEnd||0)
                + (it.bonusCritChance||0)+(it.bonusDodgeChance||0);
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

// ── CLI ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { nSims: 400, hpMult: 1.0, xpMult: 1.0, statPoints: 0,
                build: 'balanced', mode: 'single',
                useQuests: true, useEquipment: true, usePotions: true,
                kills: 0, bonusLevels: 0, artifacts: false,
                endgame: false, maxFloor: 40, forge: 0, library: 0,
                houseSet: null, tenebresSet: false, houseTier: 0,
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
    else if (k === 'forge')        out.forge   = Math.max(0, Math.min(5, parseInt(v, 10) || 0));
    else if (k === 'library')      out.library = Math.max(0, Math.min(3, parseInt(v, 10) || 0));
    else if (k === 'house-set')    out.houseSet = String(v || '').toLowerCase();
    else if (k === 'house-tier')   out.houseTier = parseInt(v, 10) || 0;
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
};

function buildFor(build, key) {
  // Hermione utilise la version "caster" du build équilibré
  if (build === 'balanced' && key === 'hermione') return BUILDS.caster;
  return BUILDS[build] || BUILDS.balanced;
}

const ARGS = parseArgs(process.argv);
if (ARGS.mode === 'help') {
  console.log(`Usage: node tools/sim-difficulty.js [N_SIMS] [options]

Options:
  --n=N | --n-sims=N      Nombre de sims par cellule (def 400)
  --hp-mult=F             Multiplicateur HP des monstres (def 1.0)
  --xp-mult=F             Multiplicateur XP des monstres (def 1.0)
  --stat-points=N         Points libres alloués au joueur par niveau (def 0)
  --build=BUILD           tank | balanced | offensive (def balanced)
  --bonus-levels=N        Niveaux gagnés au-delà de l'étage (farming) (def 0)
  --artifacts             Best-in-slot inclut les artefacts légendaires (hors boutique)
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
  if (n <= 0) return stat0;
  const scal = 1 + ENDGAME_SCALING.scalDelta / intraMult;
  return _endgameRecurse(stat0, n, ENDGAME_SCALING.baseFix[key] / intraMult, scal);
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
  // mag : non scalée pré-victoire, mais participe à la récursion endgame.
  const n = simEndgameTier(floor, cfg);
  if (n > 0 && base.mag) {
    const ef = simEffectiveFloor(floor, cfg);
    const intraMult = 1 + (ef - 1) * scale;
    const scal = 1 + ENDGAME_SCALING.scalDelta / intraMult;
    out.mag = Math.floor(_endgameRecurse(base.mag, n,
      ENDGAME_SCALING.baseFix.mag / intraMult, scal));
  }
  return out;
}

// battle.js:122 — rollGroupSize (Normal = m = 1.0)
// Reproduit la logique runtime battle.js (politique baseline +
// scaling progressif via `cfg.kills` cumulés sur l'étage).
function rollGroupSize(floor, partySize, cfg) {
  const r = Math.random();
  let p1, p2, p3;
  if (partySize === 1) {
    if (floor <= 2)        { p1 = 1.0;  p2 = 0;    p3 = 0; }
    else if (floor <= 4)   { p1 = 0.70; p2 = 0.30; p3 = 0; }
    else                   { p1 = 0.50; p2 = 0.50; p3 = 0; }
  } else {
    if (floor <= 2)        { p1 = 0.65; p2 = 0.35; p3 = 0; }
    else if (floor <= 6)   { p1 = 0.35; p2 = 0.65; p3 = 0; }
    else                   { p1 = 0.20; p2 = 0.35; p3 = 0.45; }
  }
  const n = Math.floor(((cfg && cfg.kills) || 0) / 4);
  const duoBonus  = Math.min(0.40, 0.10 * n);
  const trioBonus = n >= 5 ? Math.min(0.40, 0.10 * (n - 4)) : 0;
  const duoShift = Math.min(p1, duoBonus);
  p1 -= duoShift;  p2 += duoShift;
  const trioShift = Math.min(p2, trioBonus);
  p2 -= trioShift; p3 += trioShift;
  if (r < p1) return 1;
  if (r < p1 + p2) return 2;
  return 3;
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
// Effets par point alloué (Phase 2 du plan)
//   STR → +1 ATK, INT → +1 MAG, AGI → +0.4 % esquive, END → +5 HP, LCK → +0.5 % crit
function applyStatPoints(c, points) {
  c._baseAtk += points.str || 0;
  c._baseMag += points.int || 0;
  c._baseAgi += points.agi || 0;
  c._baseEnd += points.end || 0;
  c.hpMax    += 5 * (points.end || 0);
  c._baseLck += points.lck || 0;
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
      });
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
  // LCK plafonne à 40 % ; les bonus équipement/set s'ajoutent au-dessus
  // (plafond absolu 100 %). Deux canaux de crit : physique et sort.
  const lckCrit = Math.min(40, 5 + c.lck * 0.5);
  c.critChance          = Math.max(5, Math.min(100, lckCrit + (c._critBonus || 0) + (c._setCrit || 0)));
  c.spellCritChance     = Math.max(5, Math.min(100, lckCrit + (c._spellCritBonus || 0) + (c._setSpellCrit || 0)));
  c.dodgeChance         = Math.max(5, Math.min(35, 5 + c.agi * 0.4 + (c._dodgeBonus || 0) + (c._setDodge || 0)));
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
      c._serpentLifesteal = 0.15;
    } else if (cfg.houseSet === 'serdaigle') {
      c._spellCostMult = 0.8;
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

function simulateBattle(party, enemyGroup) {
  // Reset state pour la sim. Élan est un cumul de combat — il repart à
  // zéro à chaque combat (jamais sérialisé, comme l'état de combat réel).
  party.forEach(c => { c.hp = c.hpMax; c.sp = c.spMax; c.shieldTurns = 0; c.statusEffects = []; c._elanStacks = 0; });
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
      const enemies = enemyGroup.filter(e => e.currentHp > 0);
      if (!enemies.length) {
        const survivors = party.filter(c => c.hp > 0).length;
        return { won: true, turns: turn, survivors, hpPct: avgHpPct(party), enemyDmg: totalEnemyDmg };
      }
      heroAct(char, enemies);
    }

    // Tour ennemi
    const aliveTargets = party.filter(c => c.hp > 0);
    if (!aliveTargets.length) {
      return { won: false, turns: turn, survivors: 0, hpPct: 0, enemyDmg: totalEnemyDmg };
    }
    for (const enemy of enemyGroup) {
      if (enemy.currentHp <= 0) continue;
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      if (!target || target.hp <= 0) continue;
      totalEnemyDmg += enemyAct(enemy, target, partySize);
    }

    // Tick des DoT sur les héros, en fin de tour ennemi
    // (miroir de tickStatuses appelé dans battle.js — enemyTurn).
    for (const char of party) {
      if (char.hp <= 0 || !char.statusEffects.length) continue;
      const remaining = [];
      for (const s of char.statusEffects) {
        const dmg = Math.max(1, s.power);
        char.hp = Math.max(0, char.hp - dmg);
        totalEnemyDmg += dmg;
        s.turns--;
        if (s.turns > 0) remaining.push(s);
      }
      char.statusEffects = remaining;
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

  // 2. Best damage spell
  const dmgSpell = pickDamageSpell(char);
  if (dmgSpell && char.sp >= dmgSpell.cost) {
    char.sp -= dmgSpell.cost;
    let dmg = Math.floor((dmgSpell.power + Math.floor(char.mag / 2)) * vigor * elan);
    if (target.resist?.includes(dmgSpell.effect)) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
    if (target.weak?.includes(dmgSpell.effect))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
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
  let dmg = Math.max(1, Math.floor(mitigatedDamage(char.atk + Math.floor(Math.random() * 4), target.def - bonus) * vigor * elan));
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

// Meilleur sort de dégât accessible (cost <= SP), priorité puissance brute
function pickDamageSpell(char) {
  const damaging = ['Avada...', 'Sectumsempra', 'Diffindo', 'Incendio', 'Wingardium Leviosa', 'Stupefix']
    .filter(n => char.spells.includes(n))
    .map(n => spellByName[n])
    .filter(s => s && !s.locked)
    .map(s => simSpellForCaster(s, char));
  // Filtre par SP dispo
  const affordable = damaging.filter(s => char.sp >= s.cost);
  // Trie par puissance + mag/2 décroissant (puissance effective)
  affordable.sort((a, b) => (b.power + char.mag / 2) - (a.power + char.mag / 2));
  return affordable[0];
}

function enemyAct(enemy, target, partySize) {
  // Tentative de capacité spéciale (cf. battle-spells.js:7)
  if (enemy.abilities?.length) {
    const ability = enemy.abilities.find(a => Math.random() < a.chance);
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
        case 'heal': {
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + ability.power);
          return 0;
        }
        case 'weaken': {
          target.def = Math.max(0, target.def - ability.power);
          return 0;
        }
        case 'drain': {
          const drained = Math.min(target.hp, ability.power);
          target.hp = Math.max(0, target.hp - drained);
          enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
          return drained;
        }
        case 'status': {
          // Statut persistant (cf. battle-spells.js — case 'status').
          // Les DoT (burn/poison/bleed/gel) sont modélisés : le tick de
          // dégâts est appliqué dans simulateBattle. Le stun (saut de
          // tour) n'est pas modélisé — on l'ignore. Dans les deux cas
          // le tour ennemi est consommé (pas d'attaque physique en plus).
          if (SIM_DOT_IDS.includes(ability.statusId)) {
            if (!target.statusEffects) target.statusEffects = [];
            const turns = ability.turns || 3;
            const existing = target.statusEffects.find(s => s.id === ability.statusId);
            if (existing) {
              existing.power = Math.max(existing.power, ability.power);
              existing.turns = Math.max(existing.turns, turns);
            } else {
              target.statusEffects.push({ id: ability.statusId, power: ability.power, turns });
            }
          }
          return 0;
        }
      }
    }
  }
  // Attaque physique simple : pas de RNG côté ennemi dans le code réel
  if (Math.random() * 100 < (target.dodgeChance || 0)) return 0;
  const dmg = mitigatedDamage(enemy.atk, target.def);
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
      const groupSizes = { 1: 0, 2: 0, 3: 0 };

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
    ? ` | set=${cfg.houseSet}${cfg.houseTier ? ` | palier Maison ${cfg.houseTier}` : ''}${elanInfo}`
    : '';
  console.log(`Paramètres : HP×${cfg.hpMult} | XP×${cfg.xpMult} | ` +
              `${cfg.statPoints} pts libres/niveau | build=${cfg.build}${houseInfo}\n`);

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
}
