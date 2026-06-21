#!/usr/bin/env node
// ============================================================
// UNITS — Tests unitaires des helpers PURS (Node, sans navigateur)
// ------------------------------------------------------------
// Complète tests/smoke.js (Playwright, intégration DOM). Ici on charge
// les modules « purs » du jeu dans un sandbox `vm` et on vérifie les
// invariants des fonctions de calcul (courbes dérivées, scaling, thèmes).
//
// Aucune dépendance : Node pur. Usage : node tests/units.js
//
// Les modules ciblés sont déclarés « purs » dans CLAUDE.md :
//   - js/floor-themes.js      → getFloorTheme
//   - js/dungeon-scaling.js   → effectiveFloor, endgameTierIndex, weightedPick
//   - js/inventory-core.js    → _fortuneCurve, _celeriteCurve (D5)
//
// Ces fichiers n'ont AUCUN code exécutable au top-level (vérifié) : les
// charger dans un vm ne fait que définir les fonctions, sans effet de bord.
// ============================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Micro-harnais d'assertion ────────────────────────────────
let passed = 0;
const failures = [];
function check(label, cond) {
  if (cond) { passed++; }
  else { failures.push(label); }
}
function approx(a, b, eps = 1e-9) { return Math.abs(a - b) <= eps; }

// Charge un fichier source dans un sandbox vm, en publiant les bindings
// demandés via `exports`. `globals` permet d'injecter des variables que
// les fonctions lisent au runtime (ex. victoryAchieved, constantes).
function loadModule(relPath, exportNames, globals = {}) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = Object.assign({ console, exports: {} }, globals);
  vm.createContext(sandbox);
  const suffix = '\n;' + exportNames.map(n => `exports.${n} = ${n};`).join('\n');
  vm.runInContext(src + suffix, sandbox, { filename: path.basename(relPath) });
  return sandbox.exports;
}

// ============================================================
// 1. floor-themes.js — getFloorTheme
// ============================================================
(function testFloorThemes() {
  const { getFloorTheme, FLOOR_THEMES } = loadModule(
    'js/floor-themes.js', ['getFloorTheme', 'FLOOR_THEMES']);

  // Tranches documentées (CLAUDE.md « Thèmes par tranche d'étages »).
  check('floor 1 → hogwarts',  getFloorTheme(1).label.includes('Couloirs'));
  check('floor 3 → hogwarts',  getFloorTheme(3).wall === 'stone1');
  check('floor 4 → dungeons',  getFloorTheme(4).wall === 'stone2');
  check('floor 6 → dungeons',  getFloorTheme(6).floor === 'carpet');
  check('floor 7 → depths',    getFloorTheme(7).wall === 'cavern_wall');
  check('floor 13 → depths',   getFloorTheme(13).ambient === 'depths');
  check('floor 14 → ruines',   getFloorTheme(14).wall === 'rune_wall');
  check('floor 99 → ruines',   getFloorTheme(99).ambient === 'abyss');

  // Entrées invalides → repli sûr sur hogwarts (jamais d'exception).
  check('floor 0 → repli hogwarts',     getFloorTheme(0)        === FLOOR_THEMES.hogwarts);
  check('floor -5 → repli hogwarts',    getFloorTheme(-5)       === FLOOR_THEMES.hogwarts);
  check('floor NaN → repli hogwarts',   getFloorTheme(NaN)      === FLOOR_THEMES.hogwarts);
  check('floor undefined → hogwarts',   getFloorTheme()         === FLOOR_THEMES.hogwarts);
  check('floor "abc" → hogwarts',       getFloorTheme('abc')    === FLOOR_THEMES.hogwarts);

  // Couverture continue : tout étage 1..200 résout un thème (pas de trou).
  let covered = true;
  for (let f = 1; f <= 200; f++) { if (!getFloorTheme(f)) covered = false; }
  check('étages 1..200 tous couverts', covered);
})();

// ============================================================
// 1bis. hero-barks.js — pickHeroBark (résolveur pur, ÉTAPE 2)
// ============================================================
(function testHeroBarks() {
  const { pickHeroBark, HERO_BARKS } = loadModule(
    'js/hero-barks.js', ['pickHeroBark', 'HERO_BARKS']);
  // rng déterministe (toujours le 1ᵉʳ élément du tableau).
  const rng0 = () => 0;

  // Résolution standard d'un événement connu.
  check('bark harry/crit non vide',
    typeof pickHeroBark('harry', 'crit', { rng: rng0 }) === 'string');
  check('bark hermione/bossAppear connu',
    pickHeroBark('hermione', 'bossAppear', { rng: rng0 }).includes('résistances'));

  // Héros inconnu → null.
  check('héros inconnu → null', pickHeroBark('voldemort', 'crit') === null);
  // Événement absent → null (call-site silencieux).
  check('événement absent → null', pickHeroBark('cho', 'inexistant', {}) === null);

  // Variante de tension : Maison canon du héros ≠ chosenHouse ET variante
  // définie → la variante est préférée. Harry (Gryffondor) en partie Serpentard.
  const tens = pickHeroBark('harry', 'crit',
    { rng: rng0, canonHouse: 'Gryffondor', chosenHouse: 'Serpentard' });
  check('tension préférée (harry/Serpentard)', tens.includes('raccourci'));
  // Pas de variante pour cette Maison → réplique standard.
  const noTens = pickHeroBark('harry', 'crit',
    { rng: rng0, canonHouse: 'Gryffondor', chosenHouse: 'Serdaigle' });
  check('pas de tension Serdaigle → standard', noTens.includes('poli'));
  // Maison canon == chosenHouse → jamais de tension.
  const same = pickHeroBark('harry', 'crit',
    { rng: rng0, canonHouse: 'Gryffondor', chosenHouse: 'Gryffondor' });
  check('même Maison → standard', same.includes('poli'));

  // Tous les héros ont les 4 événements de base (cohérence du registre).
  const base = ['bossAppear', 'crit', 'allyDown', 'levelUp'];
  let allHaveBase = true;
  for (const k of Object.keys(HERO_BARKS)) {
    for (const ev of base) {
      if (!Array.isArray(HERO_BARKS[k][ev]) || !HERO_BARKS[k][ev].length) allHaveBase = false;
    }
  }
  check('16 héros : 4 événements de base couverts', allHaveBase);
  check('registre = 16 héros', Object.keys(HERO_BARKS).length === 16);

  // V2 (ch.11 §11.8.2) — événement `darkLoop` (voix au franchissement de Boucle).
  let allHaveDarkLoop = true;
  for (const k of Object.keys(HERO_BARKS)) {
    if (!Array.isArray(HERO_BARKS[k].darkLoop) || !HERO_BARKS[k].darkLoop.length) allHaveDarkLoop = false;
  }
  check('16 héros : événement darkLoop couvert', allHaveDarkLoop);
  check('bark harry/darkLoop non vide', typeof pickHeroBark('harry', 'darkLoop', { rng: rng0 }) === 'string');
  // La tension de Maison s'applique aussi à darkLoop (canon ≠ chosenHouse).
  const dlTens = pickHeroBark('harry', 'darkLoop',
    { rng: rng0, canonHouse: 'Gryffondor', chosenHouse: 'Serpentard' });
  check('darkLoop : tension préférée (harry/Serpentard)', dlTens.includes('raccourci'));

  // Phase 3 — événement `darkBoss` (boss revenu en variante Ténébreuse).
  let allHaveDarkBoss = true;
  for (const k of Object.keys(HERO_BARKS)) {
    if (!Array.isArray(HERO_BARKS[k].darkBoss) || !HERO_BARKS[k].darkBoss.length) allHaveDarkBoss = false;
  }
  check('16 héros : événement darkBoss couvert', allHaveDarkBoss);
  check('bark harry/darkBoss non vide', typeof pickHeroBark('harry', 'darkBoss', { rng: rng0 }) === 'string');
  check('darkBoss ≠ bossAppear (harry)',
    pickHeroBark('harry', 'darkBoss', { rng: rng0 }) !== pickHeroBark('harry', 'bossAppear', { rng: rng0 }));

  // Phase 3 — événement `loopEcho` (voix à l'affleurement d'un écho temporel en Boucle).
  let allHaveLoopEcho = true;
  for (const k of Object.keys(HERO_BARKS)) {
    if (!Array.isArray(HERO_BARKS[k].loopEcho) || !HERO_BARKS[k].loopEcho.length) allHaveLoopEcho = false;
  }
  check('16 héros : événement loopEcho couvert', allHaveLoopEcho);
  check('bark harry/loopEcho non vide', typeof pickHeroBark('harry', 'loopEcho', { rng: rng0 }) === 'string');

  // Phase 3 — couche légère `darkBossDown` (clôture à la défaite d'un boss Ténébreux).
  let allHaveDarkBossDown = true;
  for (const k of Object.keys(HERO_BARKS)) {
    if (!Array.isArray(HERO_BARKS[k].darkBossDown) || !HERO_BARKS[k].darkBossDown.length) allHaveDarkBossDown = false;
  }
  check('16 héros : événement darkBossDown couvert', allHaveDarkBossDown);
  check('darkBossDown ≠ darkBoss (harry)',
    pickHeroBark('harry', 'darkBossDown', { rng: rng0 }) !== pickHeroBark('harry', 'darkBoss', { rng: rng0 }));

  // L8 — beats de trame scénarisés rattachés au bon héros (05 §5.4.2).
  check('celeste.fountainCold présent',
    Array.isArray(HERO_BARKS.celeste.fountainCold) && HERO_BARKS.celeste.fountainCold.length > 0);
  check('draco.firstMangemort présent',
    Array.isArray(HERO_BARKS.draco.firstMangemort) && HERO_BARKS.draco.firstMangemort.length > 0);
  check('anastasia.preVoldemortGryff présent',
    Array.isArray(HERO_BARKS.anastasia.preVoldemortGryff) && HERO_BARKS.anastasia.preVoldemortGryff.length > 0);
  check('maxence.preVoldemortDefiance présent',
    Array.isArray(HERO_BARKS.maxence.preVoldemortDefiance) && HERO_BARKS.maxence.preVoldemortDefiance.length > 0);
  check('cedric.leaveSchool présent',
    Array.isArray(HERO_BARKS.cedric.leaveSchool) && HERO_BARKS.cedric.leaveSchool.length > 0);
  // Enjeu intime (05 §5.4.2) : chaque héros JOUABLE a un beat descentStake (3↔4).
  for (const k of ['harry', 'hermione', 'celeste', 'iris', 'maxence', 'anastasia']) {
    check('descentStake présent : ' + k,
      Array.isArray(HERO_BARKS[k].descentStake) && HERO_BARKS[k].descentStake.length > 0 &&
      typeof pickHeroBark(k, 'descentStake', { rng: rng0 }) === 'string');
  }
  // Un beat scénarisé n'existe que sur son héros (sinon null → silencieux).
  check('fountainCold absent chez harry', pickHeroBark('harry', 'fountainCold', {}) === null);
  check('leaveSchool absent chez harry', pickHeroBark('harry', 'leaveSchool', {}) === null);
})();

// ============================================================
// 2. dungeon-scaling.js — effectiveFloor / endgameTierIndex / weightedPick
// ============================================================
(function testDungeonScaling() {
  // Sandbox avec victoryAchieved mutable (les fonctions le lisent via typeof).
  const sandbox = { console, exports: {}, victoryAchieved: false, Math };
  const src = fs.readFileSync(path.join(ROOT, 'js/dungeon-scaling.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src +
    '\n;exports.effectiveFloor = effectiveFloor;' +
    '\n;exports.endgameTierIndex = endgameTierIndex;' +
    '\n;exports.creatureCorruptionLevel = creatureCorruptionLevel;' +
    '\n;exports.loopNumber = loopNumber;' +
    '\n;exports.LOOP_SPAN = LOOP_SPAN;' +
    '\n;exports.weightedPick = weightedPick;' +
    '\n;exports.loopVariantTierName = loopVariantTierName;' +
    '\n;exports.applyLoopVariant = applyLoopVariant;', sandbox, { filename: 'dungeon-scaling.js' });
  const { effectiveFloor, endgameTierIndex, creatureCorruptionLevel, loopNumber, LOOP_SPAN, weightedPick,
          loopVariantTierName, applyLoopVariant } = sandbox.exports;

  // Pré-victoire : effectiveFloor est l'identité, palier 0 partout.
  sandbox.victoryAchieved = false;
  check('pré-victoire: effF(5)=5',   effectiveFloor(5) === 5);
  check('pré-victoire: effF(15)=15', effectiveFloor(15) === 15);
  check('pré-victoire: tier(15)=0',  endgameTierIndex(15) === 0);

  // Post-victoire : Boucle Ténébreuse — 11→1, 20→10, 21→11.
  sandbox.victoryAchieved = true;
  check('post-victoire: effF(10)=10 (≤10 inchangé)', effectiveFloor(10) === 10);
  check('post-victoire: effF(11)=1',  effectiveFloor(11) === 1);
  check('post-victoire: effF(20)=10', effectiveFloor(20) === 10);
  check('post-victoire: effF(21)=11', effectiveFloor(21) === 11);
  check('post-victoire: tier(10)=0',  endgameTierIndex(10) === 0);
  check('post-victoire: tier(11)=1',  endgameTierIndex(11) === 1);
  check('post-victoire: tier(20)=1',  endgameTierIndex(20) === 1);
  check('post-victoire: tier(21)=2',  endgameTierIndex(21) === 2);

  // ── Boucle Ténébreuse V1 (ch.11 §11.7.1) — loopNumber (pur, dérivé) ──
  // Dérivé de l'étage le plus profond ; indépendant de victoryAchieved.
  check('LOOP_SPAN = 10',           LOOP_SPAN === 10);
  check('loopNumber(1)=0 (pré-Boucle)',   loopNumber(1)  === 0);
  check('loopNumber(10)=0 (gate)',        loopNumber(10) === 0);
  check('loopNumber(11)=1 (Boucle 1)',    loopNumber(11) === 1);
  check('loopNumber(20)=1',               loopNumber(20) === 1);
  check('loopNumber(21)=2 (Boucle 2)',    loopNumber(21) === 2);
  check('loopNumber(30)=2',               loopNumber(30) === 2);
  check('loopNumber(31)=3',               loopNumber(31) === 3);
  // Garde-fous : entrées invalides → 0 (jamais d'exception / NaN).
  check('loopNumber(0)=0',          loopNumber(0)         === 0);
  check('loopNumber(-5)=0',         loopNumber(-5)        === 0);
  check('loopNumber(NaN)=0',        loopNumber(NaN)       === 0);
  check('loopNumber(Infinity)=0',   loopNumber(Infinity)  === 0);
  check('loopNumber(undefined)=0',  loopNumber()          === 0);
  check('loopNumber("abc")=0',      loopNumber('abc')     === 0);
  // Monotonie croissante (large) sur la plage de jeu.
  let monoLoop = true;
  for (let f = 1; f < 120; f++) { if (loopNumber(f + 1) < loopNumber(f)) monoLoop = false; }
  check('loopNumber monotone croissant', monoLoop);

  // ── Variantes de Boucle V4 (ch.11 §11.11) — loopVariant (pur, déterministe) ──
  check('loopVariantTierName(0) = "" (hors Boucle)', loopVariantTierName(0) === '');
  check('loopVariantTierName(1) = Ténébreux (compat V1)', loopVariantTierName(1) === 'Ténébreux');
  check('loopVariantTierName(2) = Spectral', loopVariantTierName(2) === 'Spectral');
  check('loopVariantTierName(3) = Abyssal', loopVariantTierName(3) === 'Abyssal');
  check('loopVariantTierName plafonné (loop 9 → Funeste)', loopVariantTierName(9) === 'Funeste');
  check('loopVariantTierName(NaN) = ""', loopVariantTierName(NaN) === '');
  // Mutation thématique : nom préfixé + résist ténèbres + faille lumière.
  let mv = applyLoopVariant({ name: 'Troll', resist: [], weak: [] }, 2);
  check('applyLoopVariant: nom escaladé', mv.name === 'Spectral Troll');
  check('applyLoopVariant: loopTier posé', mv.loopTier === 2);
  check('applyLoopVariant: résiste ténèbres', mv.resist.includes('ténèbres'));
  check('applyLoopVariant: faible lumière', mv.weak.includes('lumière'));
  // Garde-fou : un monstre DÉJÀ faible aux ténèbres ne devient pas résistant.
  mv = applyLoopVariant({ name: 'X', resist: [], weak: ['ténèbres'] }, 1);
  check('applyLoopVariant: pas de résist+faible ténèbres', !mv.resist.includes('ténèbres'));
  // Garde-fou : un monstre DÉJÀ résistant à la lumière ne devient pas faible.
  mv = applyLoopVariant({ name: 'Y', resist: ['lumière'], weak: [] }, 1);
  check('applyLoopVariant: pas de faible+résist lumière', !mv.weak.includes('lumière'));
  // On n'écrase pas une résistance déclarée (idempotent sur ténèbres existant).
  mv = applyLoopVariant({ name: 'Z', resist: ['ténèbres', 'feu'], weak: [] }, 1);
  check('applyLoopVariant: ténèbres non dupliqué',
    mv.resist.filter(r => r === 'ténèbres').length === 1);
  // Défensif : n<1 ou monstre nul → no-op (pas d'exception).
  check('applyLoopVariant(n=0) no-op', applyLoopVariant({ name: 'A', resist: [], weak: [] }, 0).name === 'A');
  check('applyLoopVariant(null) no-op', applyLoopVariant(null, 2) === null);

  // creatureCorruptionLevel (Chapitre 09 §9.1.2) — gradient 0-3 par profondeur.
  sandbox.victoryAchieved = false;
  check('corruption: étage 1 = 0',  creatureCorruptionLevel({}, 1) === 0);
  check('corruption: étage 3 = 0',  creatureCorruptionLevel({}, 3) === 0);
  check('corruption: étage 4 = 1',  creatureCorruptionLevel({}, 4) === 1);
  check('corruption: étage 6 = 1',  creatureCorruptionLevel({}, 6) === 1);
  check('corruption: étage 7 = 2',  creatureCorruptionLevel({}, 7) === 2);
  check('corruption: étage 10 = 2', creatureCorruptionLevel({}, 10) === 2);
  sandbox.victoryAchieved = true;
  // Boucle Ténébreuse : 11+ = cauchemar (3), priorité sur effectiveFloor.
  check('corruption: étage 11 post-victoire = 3', creatureCorruptionLevel({}, 11) === 3);
  check('corruption: étage 25 post-victoire = 3', creatureCorruptionLevel({}, 25) === 3);
  check('corruption: étage 10 post-victoire = 2', creatureCorruptionLevel({}, 10) === 2);
  sandbox.victoryAchieved = false;

  // weightedPick : déterministe via Math.random injecté + respect des poids.
  const pool = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
  const realRandom = Math.random;
  sandbox.Math = Object.assign(Object.create(Math), { random: () => 0.0 }); // r=0 → 1er
  check('weightedPick r=0 → a', weightedPick(pool).id === 'a');
  sandbox.Math.random = () => 0.99; // r≈3.96/4 → tombe dans le poids de b
  check('weightedPick r≈max → b', weightedPick(pool).id === 'b');
  check('weightedPick pool 1 élément', weightedPick([{ id: 'solo', weight: 1 }]).id === 'solo');
  Math.random = realRandom;
})();

// ============================================================
// 3. inventory-core.js — _fortuneCurve / _celeriteCurve (D5)
// ============================================================
(function testDerivedCurves() {
  // On injecte les constantes de calibration documentées pour que les
  // fonctions les utilisent (sinon elles tombent sur leur fallback interne).
  const consts = {
    FORTUNE_ASYMPTOTE: 0.31, FORTUNE_HALF: 30,
    CELERITE_MAX: 0.30, CELERITE_HALF: 45,
  };
  const { _fortuneCurve, _celeriteCurve } = loadModule(
    'js/inventory-core.js', ['_fortuneCurve', '_celeriteCurve'], consts);

  // Origine et bornes.
  check('fortune(0)=0',  _fortuneCurve(0) === 0);
  check('celerite(0)=0', _celeriteCurve(0) === 0);
  check('fortune(x<0)=0 (clamp)',  _fortuneCurve(-10) === 0);
  check('fortune(NaN)=0 (garde)',  _fortuneCurve(NaN) === 0);

  // Demi-saturation : à x = HALF, la courbe vaut asymptote/2.
  check('fortune(30)=asympt/2',  approx(_fortuneCurve(30),  0.31 / 2, 1e-12));
  check('celerite(45)=max/2',    approx(_celeriteCurve(45), 0.30 / 2, 1e-12));

  // Saturation stricte : jamais ≥ asymptote, mais s'en approche.
  check('fortune < asymptote',        _fortuneCurve(1e6) < 0.31);
  check('fortune ≈ asymptote (grand)', _fortuneCurve(1e6) > 0.309);
  check('celerite < max',             _celeriteCurve(1e6) < 0.30);

  // Monotonie croissante stricte sur une plage de jeu réaliste.
  let monoF = true, monoC = true;
  for (let x = 0; x < 120; x++) {
    if (_fortuneCurve(x + 1)  <= _fortuneCurve(x))  monoF = false;
    if (_celeriteCurve(x + 1) <= _celeriteCurve(x)) monoC = false;
  }
  check('fortune monotone croissante',  monoF);
  check('celerite monotone croissante', monoC);

  // Calibration source : data.js déclare bien les valeurs documentées
  // (verrou anti-dérive entre la doc, les constantes et les tests).
  const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  check('data.js FORTUNE_ASYMPTOTE=0.31', /FORTUNE_ASYMPTOTE\s*=\s*0\.31/.test(dataSrc));
  check('data.js FORTUNE_HALF=30',        /FORTUNE_HALF\s*=\s*30/.test(dataSrc));
  check('data.js CELERITE_MAX=0.30',      /CELERITE_MAX\s*=\s*0\.30/.test(dataSrc));
  check('data.js CELERITE_HALF=45',       /CELERITE_HALF\s*=\s*45/.test(dataSrc));
})();

// ============================================================
// 3bis. potions.js — potionEvolveMult (calibration P13, bornes évolutives)
// ------------------------------------------------------------
// Helper PUR lisant party/partySize/spellCorruption/currentFloor (globals).
// loadModule crée un sandbox neuf par appel ; potions.js n'exécute aucun appel
// top-level. On verrouille les bornes CALIBRÉES en P13 (Potions 2.0) :
//   - Philtre du Mage : perStep 0.18, cap 1.5 (max réaliste 1.36 = 2 focaliseurs).
//   - Corruption Contrôlée : perStep 0.05, cap 1.5 (atteint à corruption 10).
(function testPotionEvolveCalibration() {
  const itemPhiltre = { evolves: { source: 'artifactForm', key: ['baton', 'grimoire'], perStep: 0.18, cap: 1.5 } };
  const itemCorrupt = { evolves: { source: 'corruption', perStep: 0.05, cap: 1.5 } };
  // Party avec N focaliseurs caster équipés (slots factices ; _partyEquipMax
  // itère Object.values(equipped) et ignore les membres morts).
  const partyWith = (formTypes) => [{
    hp: 10,
    equipped: Object.fromEntries(formTypes.map((ft, i) => [`s${i}`, { formType: ft }])),
  }];
  const evolve = (item, globals) =>
    loadModule('js/potions.js', ['potionEvolveMult'], globals).potionEvolveMult(item);

  const baseG = { party: [], partySize: 0, spellCorruption: 0, currentFloor: 1 };
  check('P13 philtre : 0 focaliseur → 1',
    evolve(itemPhiltre, { ...baseG, party: partyWith([]), partySize: 1 }) === 1);
  check('P13 philtre : 2 focaliseurs → 1.36 (max réaliste, < cap)',
    approx(evolve(itemPhiltre, { ...baseG, party: partyWith(['baton', 'grimoire']), partySize: 1 }), 1.36, 1e-9));
  check('P13 philtre : cap 1.5 (5 focaliseurs bornés)',
    approx(evolve(itemPhiltre, { ...baseG, party: partyWith(['baton', 'baton', 'baton', 'baton', 'baton']), partySize: 1 }), 1.5, 1e-9));
  check('P13 corruption : 4 → 1.20',
    approx(evolve(itemCorrupt, { ...baseG, spellCorruption: 4 }), 1.20, 1e-9));
  check('P13 corruption : 10 → 1.5 (cap exact)',
    approx(evolve(itemCorrupt, { ...baseG, spellCorruption: 10 }), 1.5, 1e-9));
  check('P13 corruption : 100 → 1.5 (borné)',
    approx(evolve(itemCorrupt, { ...baseG, spellCorruption: 100 }), 1.5, 1e-9));

  // Verrou anti-dérive doc ↔ data.js : les caps calibrés P13 figurent en source.
  const dSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  check('data.js philtre_mage cap 1.5 (P13)',
    /key:\["baton","grimoire"\],\s*perStep:0\.18,\s*cap:1\.5/.test(dSrc));
  check('data.js corruption_ctrl cap 1.5 (P13)',
    /source:"corruption",\s*perStep:0\.05,\s*cap:1\.5/.test(dSrc));
})();

// ============================================================
// 4. Échappement HTML des données externes (Mondes Parallèles)
// ------------------------------------------------------------
// Les noms de host/visiteur viennent du backend Supabase (non fiables) et
// sont injectés en innerHTML. L'implémentation est désormais UNIQUE
// (window.htmlEscape, js/html-escape.js) ; les 3 modules de visite
// délèguent dessus via `const _esc = window.htmlEscape`. On verrouille ici
// (a) que l'helper unique neutralise les caractères dangereux, et
// (b) qu'aucun module ne réintroduit une implémentation locale divergente.
// ============================================================
(function testEscapers() {
  // (a) — Implémentation unique : charger js/html-escape.js dans un vm avec
  // un stub `window`, en extraire htmlEscape, et le soumettre à l'attaque.
  const win = {};
  const src = fs.readFileSync(path.join(ROOT, 'js/html-escape.js'), 'utf8');
  const sandbox = { console, window: win };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'html-escape.js' });
  const htmlEscape = win.htmlEscape;
  check('window.htmlEscape défini', typeof htmlEscape === 'function');

  // Charge utile typique d'injection via un nom de joueur malveillant.
  const evil = "<img src=x onerror=\"alert(1)\"> & \"Bob\" <b> 'q'";
  const out = htmlEscape(evil);
  check('htmlEscape: échappe <', !out.includes('<'));
  check('htmlEscape: échappe >', !out.includes('>'));
  check('htmlEscape: échappe " (attribut)', !out.includes('"'));
  check("htmlEscape: échappe ' (apostrophe)", !out.includes("'"));
  check('htmlEscape: & encodé', out.includes('&amp;'));
  check('htmlEscape: apostrophe encodée', out.includes('&#39;'));
  check('htmlEscape: pas de balise img résiduelle', !/<img/i.test(out));
  // Garde-fous d'entrée : null/undefined → chaîne vide, pas d'exception.
  check("htmlEscape(null)=''",      htmlEscape(null) === '');
  check("htmlEscape(undefined)=''", htmlEscape(undefined) === '');
  // Types non-string tolérés (jamais d'exception).
  check('htmlEscape(0)="0"', htmlEscape(0) === '0');

  // (b) — Aucun module de visite ne redéfinit son propre _esc : ils délèguent
  // tous à window.htmlEscape (verrou anti-réintroduction d'une divergence XSS).
  const ESC_FILES = [
    'js/portal-matchmaking.js',
    'js/atelier-voyageur.js',
    'js/visit-hud.js',
  ];
  for (const rel of ESC_FILES) {
    const fsrc = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    check(`${rel}: pas d'implémentation _esc locale`, !/function\s+_esc\s*\(/.test(fsrc));
    check(`${rel}: délègue à window.htmlEscape`, /_esc\s*=\s*window\.htmlEscape/.test(fsrc));
  }
})();

// ============================================================
// 4bis. save.js — robustesse de _applyState contre une save corrompue
// ------------------------------------------------------------
// _applyState mute ~100 globals + DOM (non testable purement), mais sa garde
// d'entrée s'appuie sur deux helpers PURS extractibles : _validCharForLoad /
// _validateLoadedState. On verrouille ici qu'une save valide passe et qu'une
// save tronquée (champs vitaux NaN/absents) est refusée avec un motif clair —
// la garantie « pas de NaN en cascade » repose sur ce refus pré-mutation.
// ============================================================
(function testApplyStateGuard() {
  const { _validCharForLoad, _validateLoadedState } = loadModule(
    'js/save.js', ['_validCharForLoad', '_validateLoadedState']);

  // Personnage de référence (forme d'une save valide hydratée).
  const goodChar = { hpMax: 35, spMax: 22, hp: 30, sp: 10, level: 3, spells: ['Incendio'] };

  // ── _validCharForLoad : champ par champ ──
  check('char valide accepté', _validCharForLoad(goodChar) === true);
  check('char null refusé',    _validCharForLoad(null) === false);
  check('hpMax NaN refusé',    _validCharForLoad({ ...goodChar, hpMax: NaN }) === false);
  check('hpMax 0 refusé',      _validCharForLoad({ ...goodChar, hpMax: 0 }) === false);
  check('hpMax absent refusé', _validCharForLoad({ ...goodChar, hpMax: undefined }) === false);
  check('hp NaN refusé',       _validCharForLoad({ ...goodChar, hp: NaN }) === false);
  check('level 0 refusé',      _validCharForLoad({ ...goodChar, level: 0 }) === false);
  check('level NaN refusé',    _validCharForLoad({ ...goodChar, level: NaN }) === false);
  check('spells non-array refusé', _validCharForLoad({ ...goodChar, spells: 'Incendio' }) === false);
  check('spMax négatif refusé', _validCharForLoad({ ...goodChar, spMax: -1 }) === false);
  check('spMax 0 accepté',     _validCharForLoad({ ...goodChar, spMax: 0 }) === true);

  // ── _validateLoadedState : forme de l'instantané ──
  check('state solo valide',   _validateLoadedState({ party: [goodChar] }).ok === true);
  check('state duo valide',    _validateLoadedState({ party: [goodChar, { ...goodChar }] }).ok === true);
  check('state null refusé',   _validateLoadedState(null).ok === false);
  check('state sans party',    _validateLoadedState({}).ok === false);
  check('state party vide',    _validateLoadedState({ party: [] }).ok === false);
  check('motif groupe manquant', _validateLoadedState({}).reason === 'groupe manquant');

  // Save tronquée : héros principal corrompu → refus + motif explicite.
  const trunc = _validateLoadedState({ party: [{ ...goodChar, hpMax: NaN }] });
  check('save tronquée refusée', trunc.ok === false);
  check('motif héros principal', trunc.reason === 'stats du héros principal invalides');

  // Duo : 2nd héros corrompu → refus distinct (le 1er reste valide).
  const duoBad = _validateLoadedState({ party: [goodChar, { ...goodChar, level: NaN }] });
  check('2nd héros corrompu refusé', duoBad.ok === false);
  check('motif second héros', duoBad.reason === 'stats du second héros invalides');

  // Round-trip de forme : un instantané réel (clone JSON) reste valide.
  const snapshot = JSON.parse(JSON.stringify({ party: [goodChar, { ...goodChar, level: 5 }], partySize: 2 }));
  check('round-trip JSON valide', _validateLoadedState(snapshot).ok === true);
})();

// ============================================================
// 5. floor-ambiance.js — getFloorAmbiance / corruptionLevel /
//    houseAmbianceLine
// ============================================================
(function testFloorAmbiance() {
  // Injecter FLOOR_THEMES + getFloorTheme pour que getFloorAmbiance
  // puisse résoudre les zones.
  const { FLOOR_THEMES, getFloorTheme } = loadModule(
    'js/floor-themes.js', ['FLOOR_THEMES', 'getFloorTheme']);

  const mod = loadModule(
    'js/floor-ambiance.js',
    ['ZONE_AMBIANCE', 'getFloorAmbiance', 'corruptionLevel', 'HOUSE_AMBIANCE_MOD', 'houseAmbianceLine',
     'temporalEchoActive', 'temporalEchoTier', 'echoLine', 'FOUNDER_VOICES', 'TEMPORAL_ECHOES',
     'FOUNDER_CHAMBERS', 'getFounderChamberBeat', 'HOUSE_PERCEPTION', 'housePerceptionLine',
     'HOUSE_PERCEPTION_RATE', 'HOUSE_ROOM_BIAS', 'houseRoomBias'],
    { FLOOR_THEMES, getFloorTheme });

  const { ZONE_AMBIANCE, getFloorAmbiance, corruptionLevel, HOUSE_AMBIANCE_MOD, houseAmbianceLine,
          temporalEchoActive, temporalEchoTier, echoLine, FOUNDER_VOICES, TEMPORAL_ECHOES,
          FOUNDER_CHAMBERS, getFounderChamberBeat, HOUSE_PERCEPTION, housePerceptionLine,
          HOUSE_PERCEPTION_RATE, HOUSE_ROOM_BIAS, houseRoomBias } = mod;

  // ── getFloorAmbiance : bonne zone aux frontières ──
  // Zones sans paliers : identité d'objet préservée (back-compat).
  check('ambiance étage 1 → hogwarts',   getFloorAmbiance(1)  === ZONE_AMBIANCE.hogwarts);
  check('ambiance étage 3 → hogwarts',   getFloorAmbiance(3)  === ZONE_AMBIANCE.hogwarts);
  check('ambiance étage 4 → dungeons',   getFloorAmbiance(4)  === ZONE_AMBIANCE.dungeons);
  check('ambiance étage 6 → dungeons',   getFloorAmbiance(6)  === ZONE_AMBIANCE.dungeons);
  check('ambiance étage 7 → depths',     getFloorAmbiance(7)  === ZONE_AMBIANCE.depths);
  check('ambiance étage 13 → depths',    getFloorAmbiance(13) === ZONE_AMBIANCE.depths);
  // Zone ancient : objet résolu par palier (P-D1) — plus identique par référence,
  // mais smell/sound/temp partagés avec ZONE_AMBIANCE.ancient.
  check('ambiance étage 14 → ancient (temp partagée)', getFloorAmbiance(14).temp === ZONE_AMBIANCE.ancient.temp);
  check('ambiance étage 99 → ancient (temp partagée)', getFloorAmbiance(99).temp === ZONE_AMBIANCE.ancient.temp);

  // ── P-D1 : paliers ancient distincts aux frontières 14/17/21 ──
  const a14 = getFloorAmbiance(14), a16 = getFloorAmbiance(16);
  const a17 = getFloorAmbiance(17), a20 = getFloorAmbiance(20);
  const a21 = getFloorAmbiance(21), a99 = getFloorAmbiance(99);
  check('palier 14 = megalith', a14.tier === 'megalith');
  check('palier 16 = megalith', a16.tier === 'megalith');
  check('palier 17 = runic',    a17.tier === 'runic');
  check('palier 20 = runic',    a20.tier === 'runic');
  check('palier 21 = before',   a21.tier === 'before');
  check('palier 99 = before',   a99.tier === 'before');
  check('floorLines megalith ≠ runic',  a14.floorLines !== a17.floorLines);
  check('floorLines runic ≠ before',    a17.floorLines !== a21.floorLines);
  check('floorLines megalith ≠ before', a14.floorLines !== a21.floorLines);
  check('chaque palier ancient a ≥ 4 floorLines',
    [a14, a17, a21].every(a => Array.isArray(a.floorLines) && a.floorLines.length >= 4));
  // Le contenu des paliers diffère réellement (pas seulement la référence).
  check('1re ligne megalith ≠ 1re ligne runic', a14.floorLines[0] !== a17.floorLines[0]);
  check('1re ligne runic ≠ 1re ligne before',   a17.floorLines[0] !== a21.floorLines[0]);
  // Item 2b : le palier before (21+) NOMME le Dormeur des Fondations ; les
  // paliers supérieurs (megalith/runic) restent muets sur l'entité.
  check('palier before nomme le Dormeur', a21.floorLines.some(l => /Dormeur/.test(l)));
  check('palier megalith ne nomme pas le Dormeur', !a14.floorLines.some(l => /Dormeur/.test(l)));
  check('palier runic ne nomme pas le Dormeur',    !a17.floorLines.some(l => /Dormeur/.test(l)));

  // Fallback sur hogwarts pour entrée invalide (miroir du comportement de getFloorTheme).
  check('ambiance floor 0 → hogwarts',   getFloorAmbiance(0)         === ZONE_AMBIANCE.hogwarts);
  check('ambiance floor -1 → hogwarts',  getFloorAmbiance(-1)        === ZONE_AMBIANCE.hogwarts);
  check('ambiance floor NaN → hogwarts', getFloorAmbiance(NaN)       === ZONE_AMBIANCE.hogwarts);
  check('ambiance floor undef → hogwarts', getFloorAmbiance()        === ZONE_AMBIANCE.hogwarts);

  // Chaque zone a des floorLines non vides.
  for (const [key, zone] of Object.entries(ZONE_AMBIANCE)) {
    check(`ZONE_AMBIANCE.${key}.floorLines non vide`,
      Array.isArray(zone.floorLines) && zone.floorLines.length >= 4);
    check(`ZONE_AMBIANCE.${key}.smell non vide`,
      Array.isArray(zone.smell) && zone.smell.length > 0);
    check(`ZONE_AMBIANCE.${key}.sound non vide`,
      Array.isArray(zone.sound) && zone.sound.length > 0);
    check(`ZONE_AMBIANCE.${key}.temp défini`,
      typeof zone.temp === 'string' && zone.temp.length > 0);
  }

  // ── corruptionLevel : croissance monotone et cap ──
  check('corruption étage 1 = 0',       corruptionLevel(1, false) === 0);
  check('corruption étage 14 = 1 (cap)', corruptionLevel(14, false) === 1);
  check('corruption étage 99 = 1 (cap)', corruptionLevel(99, false) === 1);
  check('corruption 0/négatif → 0 (floor 1)', corruptionLevel(0, false) === 0);

  // Croissance monotone de 1 à 14 (pré-victoire).
  let mono = true;
  for (let f = 1; f < 14; f++) {
    if (corruptionLevel(f + 1, false) < corruptionLevel(f, false)) mono = false;
  }
  check('corruptionLevel monotone 1..14', mono);

  // Boucle Ténébreuse : +0.3 à étage 11+, cap à 1.3.
  check('corruption boucle étage 11 > étage 11 sans',
    corruptionLevel(11, true) > corruptionLevel(11, false));
  check('corruption boucle cap à 1.3',
    corruptionLevel(99, true) <= 1.3);
  check('corruption boucle min = +0.3 à étage 11',
    Math.abs(corruptionLevel(11, true) - (corruptionLevel(11, false) + 0.3)) < 1e-9);
  // Pas de saut avant étage 11.
  check('corruption boucle étage 10 = sans victoire',
    corruptionLevel(10, true) === corruptionLevel(10, false));

  // ── houseAmbianceLine : null sans Maison, texte sinon ──
  check('houseAmbianceLine(null) = null',       houseAmbianceLine(null) === null);
  check('houseAmbianceLine(undef) = null',      houseAmbianceLine(undefined) === null);
  check('houseAmbianceLine("") = null',         houseAmbianceLine('') === null);
  check('houseAmbianceLine inconnu = null',     houseAmbianceLine('Dumbledore') === null);
  check('houseAmbianceLine Gryffondor string',  typeof houseAmbianceLine('Gryffondor') === 'string');
  check('houseAmbianceLine Serpentard string',  typeof houseAmbianceLine('Serpentard') === 'string');
  check('houseAmbianceLine Serdaigle string',   typeof houseAmbianceLine('Serdaigle') === 'string');
  check('houseAmbianceLine Poufsouffle string', typeof houseAmbianceLine('Poufsouffle') === 'string');

  // Les quatre Maisons ont des lignes non vides et distinctes.
  const lines = ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].map(h => houseAmbianceLine(h));
  check('4 lignes de Maison non vides', lines.every(l => l && l.length > 0));
  const unique = new Set(lines);
  check('4 lignes de Maison distinctes', unique.size === 4);

  // ── housePerceptionLine : biais de Maison V2 (perception déterministe) ──
  check('housePerception : 4 Maisons couvertes',
    ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].every(
      h => Array.isArray(HOUSE_PERCEPTION[h]) && HOUSE_PERCEPTION[h].length > 0));
  check('housePerception(null) = null',     housePerceptionLine(null, 1, 1, 1) === null);
  check('housePerception inconnu = null',   housePerceptionLine('Dumbledore', 1, 1, 1) === null);
  // Déterminisme : même (house,floor,x,y) → même résultat à chaque appel.
  let deterministic = true, hits = 0, total = 0;
  for (let f = 1; f <= 10; f++) for (let x = 0; x < 14; x++) for (let y = 0; y < 14; y++) {
    const a = housePerceptionLine('Serdaigle', f, x, y);
    const b = housePerceptionLine('Serdaigle', f, x, y);
    if (a !== b) deterministic = false;
    total++; if (a !== null) hits++;
  }
  check('housePerception déterministe (≈1960 cases)', deterministic);
  // Taux ≈ HOUSE_PERCEPTION_RATE % (tolérance large : hash, pas une loi exacte).
  const rate = hits / total * 100;
  check(`housePerception taux ~${HOUSE_PERCEPTION_RATE}% (mesuré ${rate.toFixed(0)}%)`,
    rate > HOUSE_PERCEPTION_RATE - 10 && rate < HOUSE_PERCEPTION_RATE + 10);
  // Toute ligne non-nulle appartient bien au pool de la Maison (power-neutral :
  // pur texte, jamais une valeur de stat).
  const inPool = housePerceptionLine('Gryffondor', 3, 5, 7);
  check('housePerception : ligne issue du pool ou null',
    inPool === null || HOUSE_PERCEPTION.Gryffondor.includes(inPool));
  // Pas d'appel à Math.random (déterminisme déjà prouvé) → invisible au sim.

  // ── houseRoomBias : biais de Maison V2 « pondération de salles » ──
  // Helper pur consommé par dungeon.js pour réordonner rune↔stèle. POWER-NEUTRAL
  // par construction : seule la SAVEUR (type de puzzle) change, jamais le budget
  // de coffres — preuve d'iso-ressources ci-dessous.
  check('houseRoomBias : 4 Maisons couvertes',
    ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].every(
      h => HOUSE_ROOM_BIAS[h] && typeof HOUSE_ROOM_BIAS[h].affinity === 'string'));
  check('houseRoomBias(null) = profil neutre',  houseRoomBias(null).puzzlePreference === null);
  check('houseRoomBias inconnu = profil neutre', houseRoomBias('Dumbledore').puzzlePreference === null);
  check('houseRoomBias déterministe', houseRoomBias('Serdaigle').puzzlePreference
    === houseRoomBias('Serdaigle').puzzlePreference);
  // Seul Serdaigle a une préférence STRUCTURELLE (stèle) ; les 3 autres gardent
  // l'ordre V1 (puzzlePreference null) → équité stricte.
  check('houseRoomBias Serdaigle → stele', houseRoomBias('Serdaigle').puzzlePreference === 'stele');
  check('houseRoomBias autres Maisons → null (ordre V1)',
    ['Gryffondor', 'Serpentard', 'Poufsouffle'].every(
      h => houseRoomBias(h).puzzlePreference === null));
  // INVARIANT D'ÉQUITÉ (iso-ressources) : la probabilité combinée qu'UN puzzle
  // (donc 1 coffre) soit présent est SYMÉTRIQUE en (rune, stèle) — inverser
  // l'ordre des tirages la préserve. C'est la garantie mathématique que le
  // reorder Serdaigle ne change PAS le budget de coffres.
  const P_RUNE = 0.20, P_STELE = 0.30;
  const pRuneFirst  = 1 - (1 - P_RUNE)  * (1 - P_STELE);   // V1 (rune d'abord)
  const pSteleFirst = 1 - (1 - P_STELE) * (1 - P_RUNE);    // Serdaigle (stèle d'abord)
  check('iso-ressources : P(puzzle) identique quel que soit l\'ordre',
    Math.abs(pRuneFirst - pSteleFirst) < 1e-12);
  check('iso-ressources : P(puzzle) = 0.44', Math.abs(pRuneFirst - 0.44) < 1e-12);

  // ── P-D2 : escalade par zone (byZone A→D) ──
  // Sans floor → fallback extraLine. Avec floor → ligne de la zone.
  check('houseAmbianceLine sans floor = extraLine',
    houseAmbianceLine('Serpentard') === HOUSE_AMBIANCE_MOD.Serpentard.extraLine);
  for (const h of ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle']) {
    const a = houseAmbianceLine(h, 1);   // hogwarts
    const b = houseAmbianceLine(h, 4);   // dungeons
    const c = houseAmbianceLine(h, 7);   // depths
    const d = houseAmbianceLine(h, 14);  // ancient
    check(`${h} : 4 lignes de zone non vides`, [a, b, c, d].every(x => typeof x === 'string' && x.length > 0));
    check(`${h} : 4 lignes de zone distinctes`, new Set([a, b, c, d]).size === 4);
    check(`${h} : ligne zone ancient = byZone.ancient`, d === HOUSE_AMBIANCE_MOD[h].byZone.ancient);
  }
  check('houseAmbianceLine(null, 14) = null', houseAmbianceLine(null, 14) === null);

  // ── P-D3 : échos temporels (gates, paliers, voix Maison priorisée) ──
  // temporalEchoActive : gate victory + floor >= 12.
  check('echo inactif hors Boucle', temporalEchoActive(14, false) === false);
  check('echo inactif floor 11 en Boucle', temporalEchoActive(11, true) === false);
  check('echo actif floor 12 en Boucle',   temporalEchoActive(12, true) === true);
  check('echo actif floor 99 en Boucle',   temporalEchoActive(99, true) === true);
  check('echo inactif floor invalide',     temporalEchoActive(undefined, true) === false);

  // temporalEchoTier : silhouette (12-13) / scene (14+) / null.
  check('tier floor 11 = null',        temporalEchoTier(11) === null);
  check('tier floor 12 = silhouette',  temporalEchoTier(12) === 'silhouette');
  check('tier floor 13 = silhouette',  temporalEchoTier(13) === 'silhouette');
  check('tier floor 14 = scene',       temporalEchoTier(14) === 'scene');
  check('tier floor 21 = scene',       temporalEchoTier(21) === 'scene');

  // echoLine : null hors zone, voix de la Maison du héros priorisée à 17+.
  check('echoLine null hors Boucle',   echoLine(20, false, 'Gryffondor') === null);
  check('echoLine null floor 11',      echoLine(11, true,  'Gryffondor') === null);
  check('echoLine silhouette (12-13)', echoLine(12, true, 'Gryffondor').id === 'echo_silhouette');
  check('echoLine scène (14-16)',      echoLine(14, true, 'Gryffondor').id === 'echo_scene_sceau');
  // Cœur runique 17+ : la voix de la Maison du héros est priorisée.
  check('echoLine 17 Gryffondor = Godric',  echoLine(17, true, 'Gryffondor').id  === 'echo_godric');
  check('echoLine 17 Serpentard = Salazar', echoLine(17, true, 'Serpentard').id  === 'echo_salazar');
  check('echoLine 17 Serdaigle = Rowena',   echoLine(17, true, 'Serdaigle').id   === 'echo_rowena');
  check('echoLine 17 Poufsouffle = Helga',  echoLine(17, true, 'Poufsouffle').id === 'echo_helga');
  // Cohérence FOUNDER_VOICES ↔ echoId ↔ TEMPORAL_ECHOES.
  for (const h of ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle']) {
    const id = FOUNDER_VOICES[h].echoId;
    check(`FOUNDER_VOICES.${h}.echoId ∈ TEMPORAL_ECHOES`, !!TEMPORAL_ECHOES[id]);
    check(`echo ${id} a un texte de codex`, typeof TEMPORAL_ECHOES[id].codex === 'string' && TEMPORAL_ECHOES[id].codex.length > 0);
  }
  // 17+ sans Maison → retombe sur la scène (pas de voix priorisée).
  check('echoLine 17 sans Maison = scène', echoLine(17, true, null).id === 'echo_scene_sceau');
  // echoLine retourne { id, icon, text }.
  const eSample = echoLine(17, true, 'Gryffondor');
  check('echoLine renvoie id/icon/text',
    eSample && typeof eSample.id === 'string' && typeof eSample.icon === 'string' && typeof eSample.text === 'string');
  // TEMPORAL_ECHOES : 10 entrées (2 visuelles + 4 voix + 4 Chambres), chacune avec label/codex.
  check('TEMPORAL_ECHOES a 10 entrées', Object.keys(TEMPORAL_ECHOES).length === 10);
  check('chaque écho a label + codex + tier',
    Object.values(TEMPORAL_ECHOES).every(e => e.label && e.codex && e.tier));

  // ── P5 : Chambre des Fondateurs (résolveur pur House-aware) ──
  for (const h of ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle']) {
    const beat = getFounderChamberBeat(17, h);
    check(`getFounderChamberBeat(17, ${h}) défini`, !!beat && beat === FOUNDER_CHAMBERS[h]);
    check(`Chambre ${h} → echoId ∈ TEMPORAL_ECHOES`, !!beat && !!TEMPORAL_ECHOES[beat.echoId]);
    check(`Chambre ${h} a narrative + toast`,
      !!beat && typeof beat.narrative === 'string' && beat.narrative.length > 0
            && typeof beat.toast === 'string' && beat.toast.length > 0);
  }
  // Gate d'étage strict (17 seulement) + Maison requise.
  check('getFounderChamberBeat(16) = null', getFounderChamberBeat(16, 'Gryffondor') === null);
  check('getFounderChamberBeat(18) = null', getFounderChamberBeat(18, 'Gryffondor') === null);
  check('getFounderChamberBeat(99) = null', getFounderChamberBeat(99, 'Gryffondor') === null);
  check('getFounderChamberBeat sans Maison = null', getFounderChamberBeat(17, null) === null);
  check('getFounderChamberBeat Maison inconnue = null', getFounderChamberBeat(17, 'Durmstrang') === null);
  // Les 4 échos de Chambre portent bien le tier 'chamber'.
  check('4 échos de tier chamber',
    Object.values(TEMPORAL_ECHOES).filter(e => e.tier === 'chamber').length === 4);
})();

// ============================================================
// 6. floor-ambiance.js — étages-scènes scénarisés (P5)
//    getScriptedFloorBeat (pur) + maybeScriptedFloorBeat (one-shot)
// ============================================================
(function testScriptedFloorBeats() {
  // ── Résolveur pur : pas de dépendance externe ──
  const pure = loadModule(
    'js/floor-ambiance.js',
    ['FLOOR_SCRIPTED_BEATS', 'getScriptedFloorBeat']);
  const { FLOOR_SCRIPTED_BEATS, getScriptedFloorBeat } = pure;

  // Étages retenus (arbitrage) : 1, 4, 8.
  for (const f of [1, 4, 8]) {
    const beat = getScriptedFloorBeat(f);
    check(`beat étage ${f} défini`, beat && typeof beat === 'object');
    check(`beat étage ${f} a un id`, beat && typeof beat.id === 'string' && beat.id.length > 0);
    check(`beat étage ${f} a une narrative`, beat && typeof beat.narrative === 'string' && beat.narrative.length > 0);
    check(`beat étage ${f} a un toast`, beat && typeof beat.toast === 'string' && beat.toast.length > 0);
  }
  // Étages non scénarisés → null (10/11 exclus volontairement).
  for (const f of [2, 3, 5, 6, 7, 9, 10, 11, 14, 99]) {
    check(`beat étage ${f} = null`, getScriptedFloorBeat(f) === null);
  }
  check('beat étage 0 = null',     getScriptedFloorBeat(0) === null);
  check('beat étage NaN = null',   getScriptedFloorBeat(NaN) === null);
  check('beat étage undef = null', getScriptedFloorBeat() === null);
  // Cohérence dict ↔ résolveur.
  check('FLOOR_SCRIPTED_BEATS a exactement 1/4/8',
    JSON.stringify(Object.keys(FLOOR_SCRIPTED_BEATS).sort()) === JSON.stringify(['1', '4', '8']));

  // ── Orchestrateur one-shot : seenScriptedBeat injecté + stubs d'affichage ──
  const seen = new Set();
  let narrCalls = 0, toastCalls = 0, lastToast = null;
  const orch = loadModule(
    'js/floor-ambiance.js',
    ['maybeScriptedFloorBeat'],
    {
      seenScriptedBeat: seen,
      setNarrative: () => { narrCalls++; },
      addMsg: (msg) => { toastCalls++; lastToast = msg; },
    });
  const { maybeScriptedFloorBeat } = orch;

  // 1re entrée étage 4 → joue, mute le Set, affiche narrative + toast.
  check('maybe(4) 1re fois = true', maybeScriptedFloorBeat(4) === true);
  check('seen contient 4 après 1re entrée', seen.has(4));
  check('setNarrative appelé 1×', narrCalls === 1);
  check('addMsg appelé 1×', toastCalls === 1);
  check('toast préfixé 📜', typeof lastToast === 'string' && lastToast.indexOf('📜') === 0);

  // 2e entrée étage 4 → idempotent (no-op).
  check('maybe(4) 2e fois = false (idempotent)', maybeScriptedFloorBeat(4) === false);
  check('setNarrative non rappelé', narrCalls === 1);
  check('addMsg non rappelé', toastCalls === 1);

  // Étage sans beat → false sans rien afficher.
  check('maybe(2) = false (pas de beat)', maybeScriptedFloorBeat(2) === false);
  check('setNarrative toujours 1×', narrCalls === 1);

  // Étage 1 et 8 jouent aussi, chacun une fois.
  check('maybe(1) = true', maybeScriptedFloorBeat(1) === true);
  check('maybe(8) = true', maybeScriptedFloorBeat(8) === true);
  check('seen = {1,4,8} après les 3 beats', seen.has(1) && seen.has(4) && seen.has(8) && seen.size === 3);

  // Défensif : sans seenScriptedBeat utilisable → no-op (pas d'exception).
  const orch2 = loadModule(
    'js/floor-ambiance.js',
    ['maybeScriptedFloorBeat'],
    { seenScriptedBeat: null, setNarrative: () => {}, addMsg: () => {} });
  check('maybe(4) sans Set = false (défensif)', orch2.maybeScriptedFloorBeat(4) === false);

  // ── P5 : Chambre des Fondateurs (orchestrateur one-shot House-aware) ──
  const cSeen = new Set();
  const cEch  = new Set();
  let cNarr = 0, cToast = 0;
  const cham = loadModule(
    'js/floor-ambiance.js',
    ['maybeFounderChamberBeat'],
    {
      chosenHouse: 'Serdaigle',
      seenScriptedBeat: cSeen,
      seenEchoes: cEch,
      setNarrative: () => { cNarr++; },
      addMsg: () => { cToast++; },
    });
  const { maybeFounderChamberBeat } = cham;
  // 1re entrée étage 17 → joue, déverrouille l'écho, sentinelle posée.
  check('chamber(17) 1re fois = true', maybeFounderChamberBeat(17) === true);
  check('sentinelle founder_chamber posée', cSeen.has('founder_chamber'));
  check('écho de Chambre déverrouillé', cEch.has('echo_chamber_serdaigle'));
  check('chamber narrative + toast 1×', cNarr === 1 && cToast === 1);
  // Idempotent : 2e entrée → no-op.
  check('chamber(17) 2e fois = false', maybeFounderChamberBeat(17) === false);
  check('chamber pas de double affichage', cNarr === 1 && cToast === 1);
  // Hors étage 17 → false sans rien faire (la sentinelle int 1/4/8 reste libre).
  check('chamber(16) = false', maybeFounderChamberBeat(16) === false);
  // Défensif : sans Maison → no-op.
  const cham2 = loadModule(
    'js/floor-ambiance.js',
    ['maybeFounderChamberBeat'],
    { chosenHouse: null, seenScriptedBeat: new Set(), seenEchoes: new Set(),
      setNarrative: () => {}, addMsg: () => {} });
  check('chamber(17) sans Maison = false', cham2.maybeFounderChamberBeat(17) === false);
})();

// ============================================================
// 6bis. floor-ambiance.js — Écho de signature en Boucle (V2, ch.11 §11.8)
//    getSignatureEchoBeat (pur) + maybeSignatureEchoBeat (one-shot)
// ============================================================
(function testSignatureEcho() {
  // ── Résolveur pur (pas de dépendance externe) ──
  const pure = loadModule(
    'js/floor-ambiance.js',
    ['SIGNATURE_ECHOES', 'SIGNATURE_FLOOR', 'getSignatureEchoBeat']);
  const { SIGNATURE_ECHOES, SIGNATURE_FLOOR, getSignatureEchoBeat } = pure;

  check('SIGNATURE_FLOOR = 14', SIGNATURE_FLOOR === 14);
  // Registre : 4 Maisons, chacune avec echoId + variantes done/undone.
  const HOUSES = ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'];
  check('SIGNATURE_ECHOES = 4 Maisons', Object.keys(SIGNATURE_ECHOES).length === 4);
  for (const h of HOUSES) {
    const s = SIGNATURE_ECHOES[h];
    check(`${h} : echoId = echo_signature`, s && s.echoId === 'echo_signature');
    check(`${h} : variante undone (narrative+toast)`,
      s && s.undone && typeof s.undone.narrative === 'string' && typeof s.undone.toast === 'string');
  }
  // Serpentard distingue pacte / défi ; les autres ont `done`.
  check('Serpentard : donePact + doneDefiance',
    !!(SIGNATURE_ECHOES.Serpentard.donePact && SIGNATURE_ECHOES.Serpentard.doneDefiance));
  for (const h of ['Gryffondor', 'Serdaigle', 'Poufsouffle']) {
    check(`${h} : variante done`, !!(SIGNATURE_ECHOES[h].done));
  }

  // Gate d'étage strict (14 seulement) + Maison requise.
  check('getSignatureEchoBeat(13) = null', getSignatureEchoBeat(13, 'Gryffondor', true, null) === null);
  check('getSignatureEchoBeat(17) = null', getSignatureEchoBeat(17, 'Gryffondor', true, null) === null);
  check('getSignatureEchoBeat(99) = null', getSignatureEchoBeat(99, 'Gryffondor', true, null) === null);
  check('getSignatureEchoBeat sans Maison = null', getSignatureEchoBeat(14, null, true, null) === null);
  check('getSignatureEchoBeat Maison inconnue = null', getSignatureEchoBeat(14, 'Durmstrang', true, null) === null);

  // Variantes done / undone distinctes par Maison.
  for (const h of HOUSES) {
    const done   = getSignatureEchoBeat(14, h, true, h === 'Serpentard' ? 'defiance' : null);
    const undone = getSignatureEchoBeat(14, h, false, null);
    check(`${h} : beat done renvoie narrative/toast/echoId`,
      done && done.narrative && done.toast && done.echoId === 'echo_signature');
    check(`${h} : done ≠ undone (narrative)`, done.narrative !== undone.narrative);
    check(`${h} : done ≠ undone (toast)`,     done.toast !== undone.toast);
  }
  // Serpentard : pacte ≠ défi (selon slythPactChoice).
  const sPact = getSignatureEchoBeat(14, 'Serpentard', true, 'pact');
  const sDef  = getSignatureEchoBeat(14, 'Serpentard', true, 'defiance');
  check('Serpentard : pacte ≠ défi', sPact.narrative !== sDef.narrative);
  check('Serpentard : défi par défaut (pactChoice null)',
    getSignatureEchoBeat(14, 'Serpentard', true, null).narrative === sDef.narrative);

  // ── Orchestrateur one-shot : globals injectés + stubs d'affichage ──
  const seen = new Set();
  const ech  = new Set();
  let narr = 0, toast = 0;
  const orch = loadModule(
    'js/floor-ambiance.js',
    ['maybeSignatureEchoBeat'],
    {
      chosenHouse: 'Gryffondor',
      gryffSignatureDone: true,
      slythPactChoice: null,
      seenScriptedBeat: seen,
      seenEchoes: ech,
      setNarrative: () => { narr++; },
      addMsg: () => { toast++; },
    });
  const { maybeSignatureEchoBeat } = orch;
  // 1re entrée étage 14 → joue, déverrouille l'écho, sentinelle posée.
  check('signature(14) 1re fois = true', maybeSignatureEchoBeat(14) === true);
  check('sentinelle signature_echo posée', seen.has('signature_echo'));
  check('écho echo_signature déverrouillé', ech.has('echo_signature'));
  check('signature narrative + toast 1×', narr === 1 && toast === 1);
  // Idempotent : 2e entrée → no-op.
  check('signature(14) 2e fois = false', maybeSignatureEchoBeat(14) === false);
  check('signature pas de double affichage', narr === 1 && toast === 1);
  // Hors étage 14 → false.
  check('signature(13) = false', maybeSignatureEchoBeat(13) === false);
  // Défensif : sans Maison → no-op.
  const orch2 = loadModule(
    'js/floor-ambiance.js',
    ['maybeSignatureEchoBeat'],
    { chosenHouse: null, seenScriptedBeat: new Set(), seenEchoes: new Set(),
      setNarrative: () => {}, addMsg: () => {} });
  check('signature(14) sans Maison = false', orch2.maybeSignatureEchoBeat(14) === false);
})();

// ============================================================
// 6ter. npc-dialog.js — pickPostVictoryLine (ch.14 §14.3.2, Phase P2)
// ------------------------------------------------------------
// Résolveur PUR de la ligne « après » post-victoire des PNJ profonds. Ne lit
// aucun global → seul le chargement du module exige un stub `document`
// (npc-dialog.js attache des listeners Échap/backdrop au top-level).
// ============================================================
(function testPickPostVictoryLine() {
  const { pickPostVictoryLine } = loadModule(
    'js/npc-dialog.js', ['pickPostVictoryLine'],
    { document: { addEventListener: () => {} }, window: {} });

  const lines = ['Tu es redescendu. Pourquoi ?', 'On a gagné, et pourtant tu descends encore.'];

  // Gate victoryAchieved : null tant que la victoire n'est pas acquise.
  check('postVictory: null sans victoire', pickPostVictoryLine(lines, { victoryAchieved: false }) === null);
  check('postVictory: null ctx absent',    pickPostVictoryLine(lines, null) === null);
  check('postVictory: null lignes absentes', pickPostVictoryLine(null, { victoryAchieved: true }) === null);
  check('postVictory: null tableau vide',  pickPostVictoryLine([], { victoryAchieved: true }) === null);

  // rng injectable → tirage déterministe sur le tableau.
  check('postVictory: rng=0 → 1re ligne',
    pickPostVictoryLine(lines, { victoryAchieved: true, rng: () => 0 }) === lines[0]);
  check('postVictory: rng≈max → 2e ligne',
    pickPostVictoryLine(lines, { victoryAchieved: true, rng: () => 0.999 }) === lines[1]);

  // String simple acceptée (normalisée en tableau d'un élément).
  check('postVictory: string simple acceptée',
    pickPostVictoryLine('Solo.', { victoryAchieved: true, rng: () => 0 }) === 'Solo.');

  // Sans rng explicite → Math.random, mais toujours une des lignes du pool.
  const sample = pickPostVictoryLine(lines, { victoryAchieved: true });
  check('postVictory: défaut Math.random → ligne du pool', lines.includes(sample));
})();

// ============================================================
// 6quater. floor-ambiance.js — Voix des Ruines (P3, ch.06 §6.9.4 / ch.04 §4.5)
//    isVoixDesRuinesCrossing (pur) + maybeVoixDesRuinesBeat (one-shot)
// ============================================================
(function testVoixDesRuines() {
  // ── Résolveur pur du franchissement ──
  const pure = loadModule(
    'js/floor-ambiance.js',
    ['VOIX_DES_RUINES_KEY', 'isVoixDesRuinesCrossing']);
  const { VOIX_DES_RUINES_KEY, isVoixDesRuinesCrossing } = pure;

  check('VOIX_DES_RUINES_KEY = voix_des_ruines', VOIX_DES_RUINES_KEY === 'voix_des_ruines');
  check('crossing 13→14 = true', isVoixDesRuinesCrossing(13, 14) === true);
  check('crossing 10→14 = true (saut)', isVoixDesRuinesCrossing(10, 14) === true);
  check('crossing 14→14 = false', isVoixDesRuinesCrossing(14, 14) === false);
  check('crossing 14→13 = false (remontée)', isVoixDesRuinesCrossing(14, 13) === false);
  check('crossing 6→7 = false (autre frontière)', isVoixDesRuinesCrossing(6, 7) === false);
  check('crossing 15→16 = false (interne aux Ruines)', isVoixDesRuinesCrossing(15, 16) === false);
  check('crossing non-num = false', isVoixDesRuinesCrossing(undefined, 14) === false);

  // ── Orchestrateur one-shot : globals injectés + stubs d'affichage ──
  const seen = new Set();
  let toast = 0;
  const orch = loadModule(
    'js/floor-ambiance.js',
    ['maybeVoixDesRuinesBeat'],
    { seenScriptedBeat: seen, addMsg: () => { toast++; } });
  const { maybeVoixDesRuinesBeat } = orch;
  // 1er franchissement 13→14 → joue, sentinelle posée.
  check('voix(13,14) 1re fois = true', maybeVoixDesRuinesBeat(13, 14) === true);
  check('sentinelle voix_des_ruines posée', seen.has('voix_des_ruines'));
  check('voix toast 1×', toast === 1);
  // Idempotent : 2e franchissement → no-op.
  check('voix(13,14) 2e fois = false', maybeVoixDesRuinesBeat(13, 14) === false);
  check('voix pas de double toast', toast === 1);
  // Hors franchissement → false (sentinelle déjà posée n'interfère pas).
  const seen2 = new Set();
  let toast2 = 0;
  const orch2 = loadModule(
    'js/floor-ambiance.js',
    ['maybeVoixDesRuinesBeat'],
    { seenScriptedBeat: seen2, addMsg: () => { toast2++; } });
  check('voix(6,7) = false', orch2.maybeVoixDesRuinesBeat(6, 7) === false);
  check('voix(6,7) pas de toast', toast2 === 0);
})();

// ============================================================
// 6ter. break-cycle.js — « Briser le Cycle » (V3, ch.11 §11.10)
//    briserCycleJalons (résolveur PUR des 4 jalons)
// ============================================================
(function testBreakCycle() {
  const { briserCycleJalons, BRISER_ECLAT_SEUIL } = loadModule(
    'js/break-cycle.js', ['briserCycleJalons', 'BRISER_ECLAT_SEUIL']);

  check('BRISER_ECLAT_SEUIL = 15', BRISER_ECLAT_SEUIL === 15);

  // Aucun jalon rempli.
  let j = briserCycleJalons({});
  check('aucun jalon → count 0 + non prêt', j.count === 0 && j.ready === false);

  // Jalon I — Entendre (scène du Scellement vue).
  check('scène vue → entendre', briserCycleJalons({ sceneSeen: true }).entendre === true);
  check('scène non vue → entendre false', briserCycleJalons({ sceneSeen: false }).entendre === false);

  // Jalon II — Porter (seuil d'Éclats).
  check('eclats 14 < seuil → porter false', briserCycleJalons({ eclats: 14 }).porter === false);
  check('eclats 15 = seuil → porter true',  briserCycleJalons({ eclats: 15 }).porter === true);
  check('eclats 99 > seuil → porter true',  briserCycleJalons({ eclats: 99 }).porter === true);
  check('seuil custom respecté', briserCycleJalons({ eclats: 5, seuil: 5 }).porter === true);

  // Jalon III — Affronter (boss-miroir vaincu).
  check('bossKills 0 → affronter false', briserCycleJalons({ bossKills: 0 }).affronter === false);
  check('bossKills 1 → affronter true',  briserCycleJalons({ bossKills: 1 }).affronter === true);

  // Convergence : les 3 jalons → prêt (jalon IV proposable).
  j = briserCycleJalons({ sceneSeen: true, eclats: 15, bossKills: 1 });
  check('3 jalons → count 3 + ready', j.count === 3 && j.ready === true);
  // 2 jalons sur 3 → pas encore prêt (même avec un surplus d'Éclats).
  check('2 jalons → non prêt', briserCycleJalons({ sceneSeen: true, eclats: 99 }).ready === false);
  check('boss + éclats sans scène → non prêt',
    briserCycleJalons({ eclats: 20, bossKills: 3 }).ready === false);

  // Défensif : ctx invalide → count 0, jamais d'exception.
  check('ctx null → count 0', briserCycleJalons(null).count === 0);
  check('ctx undefined → count 0', briserCycleJalons().count === 0);
})();

// ============================================================
// 7. renderer-entities.js — _npcApproachProx (M1, réaction d'approche PNJ)
// ============================================================
(function testNpcApproachProx() {
  const { _npcApproachProx } = loadModule(
    'js/renderer-entities.js', ['_npcApproachProx']);

  // Distance en cases → intensité 0..1.
  check('prox(1) = 1 (adjacent)',     _npcApproachProx(1) === 1);
  check('prox(2) = 0.5',              _npcApproachProx(2) === 0.5);
  check('prox(3) = 0',                _npcApproachProx(3) === 0);
  check('prox(5) = 0 (loin)',         _npcApproachProx(5) === 0);
  check('prox(0) = 1 (clamp haut)',   _npcApproachProx(0) === 1);
  // Entrées invalides → 0 (aucune réaction ; rétro-compat).
  check('prox(undefined) = 0',        _npcApproachProx(undefined) === 0);
  check('prox(NaN) = 0',              _npcApproachProx(NaN) === 0);
  check('prox(-1) = 0',               _npcApproachProx(-1) === 0);
  check('prox("2") = 0 (non-nombre)', _npcApproachProx('2') === 0);
  check('prox(Infinity) = 0',         _npcApproachProx(Infinity) === 0);
  // Monotone décroissant sur [1, 3].
  check('prox décroît 1→2→3',
    _npcApproachProx(1) > _npcApproachProx(2) && _npcApproachProx(2) > _npcApproachProx(3));
})();

// ============================================================
// 8. codex.js — codexEntryState / getCodexEntry / unlockedCodexFor /
//    codexVariantNote (helpers PURS, Chapitre 12 Lots 1-2)
// ============================================================
(function testCodex() {
  const { CODEX_ENTRIES, getCodexEntry, codexEntryState, unlockedCodexFor, codexVariantNote } =
    loadModule('js/codex.js',
      ['CODEX_ENTRIES', 'getCodexEntry', 'codexEntryState', 'unlockedCodexFor', 'codexVariantNote']);

  // Contexte de base : tout vide / au plus bas (rien de débloqué).
  const empty = {
    floorReached: 0, eclatProgress: 0, accumulatedEclats: 0,
    seenMonsters: new Set(), monsterKills: {},
    questsDone: new Set(), riddlesSolved: new Set(), echoSeen: new Set(),
    victoryAchieved: false, chosenHouse: null, cycleBroken: false,
  };

  // ── getCodexEntry ──
  check('getCodexEntry connu', getCodexEntry('cle_de_voute') &&
    getCodexEntry('cle_de_voute').id === 'cle_de_voute');
  check('getCodexEntry inconnu → null', getCodexEntry('inexistant') === null);
  check('getCodexEntry(null) → null', getCodexEntry(null) === null);

  // ── Registre cohérent : champs obligatoires (§12.3) ──
  let shapeOk = true;
  const CATS = ['glossaire', 'bestiaire', 'lieux', 'personnages', 'histoire', 'eclats', 'objets', 'sorts'];
  for (const e of CODEX_ENTRIES) {
    if (!e.id || !e.category || !e.title) shapeOk = false;
    if (!CATS.includes(e.category)) shapeOk = false;
    if (!Array.isArray(e.unlockConditions) || !e.unlockConditions.length) shapeOk = false;
    if (!e.textVersions || typeof e.textVersions.veiled !== 'string') shapeOk = false;
  }
  check('toutes entrées : champs obligatoires + catégorie valide', shapeOk);
  const ids = CODEX_ENTRIES.map(e => e.id);
  check('ids uniques', new Set(ids).size === ids.length);

  // ── locked : aucune condition remplie ──
  check('cle_de_voute locked (floor 0)', codexEntryState(getCodexEntry('cle_de_voute'), empty) === 'locked');
  check('entry null → locked', codexEntryState(null, empty) === 'locked');

  // ── floor : ouverture + révélation par étage ──
  const cle = getCodexEntry('cle_de_voute');
  check('cle floor1 → veiled', codexEntryState(cle, { ...empty, floorReached: 1 }) === 'veiled');
  check('cle floor13 → veiled (pas encore 3 éclats)', codexEntryState(cle, { ...empty, floorReached: 13 }) === 'veiled');

  // ── eclat : révélation à 3 éclats (revealedBy ET) ──
  check('cle 2 éclats → veiled', codexEntryState(cle, { ...empty, floorReached: 1, eclatProgress: 2 }) === 'veiled');
  check('cle 3 éclats → revealed', codexEntryState(cle, { ...empty, floorReached: 1, eclatProgress: 3 }) === 'revealed');

  // ── corrupted : surcouche d'endgame (revealed + corruptedBy) ──
  check('cle floor14 sans révélation → veiled (corrupted exige revealed)',
    codexEntryState(cle, { ...empty, floorReached: 14 }) === 'veiled');
  check('cle floor14 + 3 éclats → corrupted',
    codexEntryState(cle, { ...empty, floorReached: 14, eclatProgress: 3 }) === 'corrupted');

  // ── eclat robinet 3-temps (eclat_voute_codex) ──
  const ecl = getCodexEntry('eclat_voute_codex');
  check('éclats: 0 → locked', codexEntryState(ecl, empty) === 'locked');
  check('éclats: 1 → veiled',  codexEntryState(ecl, { ...empty, eclatProgress: 1 }) === 'veiled');
  check('éclats: 3 → revealed', codexEntryState(ecl, { ...empty, eclatProgress: 3 }) === 'revealed');

  // ── echo : ouverture + révélation par les 4 voix (ET) ──
  const sce = getCodexEntry('echo_scellement');
  check('echo: rien vu → locked', codexEntryState(sce, empty) === 'locked');
  check('echo: scène vue → veiled',
    codexEntryState(sce, { ...empty, echoSeen: new Set(['echo_scene_sceau']) }) === 'veiled');
  check('echo: 3 voix sur 4 → veiled',
    codexEntryState(sce, { ...empty, echoSeen: new Set(['echo_scene_sceau', 'echo_godric', 'echo_salazar', 'echo_rowena']) }) === 'veiled');
  check('echo: 4 voix → revealed',
    codexEntryState(sce, { ...empty, echoSeen: new Set(['echo_scene_sceau', 'echo_godric', 'echo_salazar', 'echo_rowena', 'echo_helga']) }) === 'revealed');

  // ── victory : Boucle Ténébreuse ──
  const bcl = getCodexEntry('boucle_tenebreuse');
  check('boucle: pré-victoire → locked', codexEntryState(bcl, { ...empty, floorReached: 10 }) === 'locked');
  check('boucle: victoire → veiled', codexEntryState(bcl, { ...empty, victoryAchieved: true }) === 'veiled');
  check('boucle: victoire + floor14 → revealed',
    codexEntryState(bcl, { ...empty, victoryAchieved: true, floorReached: 14 }) === 'revealed');
  check('boucle: victoire + floor21 → corrupted',
    codexEntryState(bcl, { ...empty, victoryAchieved: true, floorReached: 21 }) === 'corrupted');

  // ── Boucle Ténébreuse V1 (ch.11 §11.6.2) — Porteur d'Éclats + robinet eclatLoop ──
  const pe = getCodexEntry('porteur_eclats');
  check('porteur_eclats présent dans le registre', !!pe && pe.category === 'eclats');
  check('porteur: pré-victoire → locked', codexEntryState(pe, { ...empty, floorReached: 10 }) === 'locked');
  check('porteur: victoire → veiled', codexEntryState(pe, { ...empty, victoryAchieved: true }) === 'veiled');
  check('porteur: 4 éclats → veiled (seuil 5 non atteint)',
    codexEntryState(pe, { ...empty, victoryAchieved: true, accumulatedEclats: 4 }) === 'veiled');
  check('porteur: 5 éclats → revealed',
    codexEntryState(pe, { ...empty, victoryAchieved: true, accumulatedEclats: 5 }) === 'revealed');
  check('porteur: 5 éclats + floor21 → corrupted',
    codexEntryState(pe, { ...empty, victoryAchieved: true, accumulatedEclats: 5, floorReached: 21 }) === 'corrupted');
  // Le robinet eclatLoop ne se déclenche jamais sans victoire (unlock victory).
  check('porteur: 99 éclats sans victoire → locked',
    codexEntryState(pe, { ...empty, accumulatedEclats: 99 }) === 'locked');

  // ── V2 (ch.11 §11.8) — Écho de signature (victory → echo reveal) ──
  const es = getCodexEntry('echo_signature');
  check('echo_signature présent (eclats)', !!es && es.category === 'eclats');
  check('echo_signature: pré-victoire → locked', codexEntryState(es, { ...empty }) === 'locked');
  check('echo_signature: victoire → veiled', codexEntryState(es, { ...empty, victoryAchieved: true }) === 'veiled');
  check('echo_signature: écho vu → revealed',
    codexEntryState(es, { ...empty, victoryAchieved: true, echoSeen: new Set(['echo_signature']) }) === 'revealed');

  // ── V3 (ch.11 §11.10) — Briser le Cycle : quête (3 robinets) + fin ──
  const bcq = getCodexEntry('briser_cycle');
  check('briser_cycle présent (eclats)', !!bcq && bcq.category === 'eclats');
  check('briser_cycle: pré-victoire → locked', codexEntryState(bcq, { ...empty }) === 'locked');
  check('briser_cycle: victoire → veiled', codexEntryState(bcq, { ...empty, victoryAchieved: true }) === 'veiled');
  check('briser_cycle: 2 robinets sur 3 → veiled',
    codexEntryState(bcq, { ...empty, victoryAchieved: true, echoSeen: new Set(['echo_scene_sceau']), accumulatedEclats: 15 }) === 'veiled');
  check('briser_cycle: 3 robinets → revealed',
    codexEntryState(bcq, { ...empty, victoryAchieved: true,
      echoSeen: new Set(['echo_scene_sceau']), accumulatedEclats: 15,
      seenMonsters: new Set(['reflet_mythe']), monsterKills: { reflet_mythe: 1 } }) === 'revealed');
  // Le robinet `monster` exige le KILL (seen seul ne suffit pas).
  check('briser_cycle: boss vu mais 0 kill → veiled',
    codexEntryState(bcq, { ...empty, victoryAchieved: true,
      echoSeen: new Set(['echo_scene_sceau']), accumulatedEclats: 15,
      seenMonsters: new Set(['reflet_mythe']), monsterKills: {} }) === 'veiled');

  const cbr = getCodexEntry('cycle_brise');
  check('cycle_brise présent (histoire)', !!cbr && cbr.category === 'histoire');
  check('cycle_brise: non brisé → locked', codexEntryState(cbr, { ...empty, victoryAchieved: true }) === 'locked');
  check('cycle_brise: brisé → revealed', codexEntryState(cbr, { ...empty, cycleBroken: true }) === 'revealed');

  // ── Phase 2 — Échos temporels : corruptedBy zone D (floor 14 + Set echo) ──
  const et = getCodexEntry('echos_temporels');
  check('echos_temporels présent (glossaire)', !!et && et.category === 'glossaire');
  check('echos_temporels: floor11 → locked', codexEntryState(et, { ...empty, floorReached: 11 }) === 'locked');
  check('echos_temporels: floor12 → veiled', codexEntryState(et, { ...empty, floorReached: 12 }) === 'veiled');
  check('echos_temporels: floor14 sans scène → revealed',
    codexEntryState(et, { ...empty, floorReached: 14 }) === 'revealed');
  // Le Set seenEchoes (robinet echo) fait basculer en corrupted en zone D.
  check('echos_temporels: floor14 + scène vue → corrupted',
    codexEntryState(et, { ...empty, floorReached: 14, echoSeen: new Set(['echo_scene_sceau']) }) === 'corrupted');
  // Scène vue mais hors zone D (revealed exige floor 14) → pas de corrupted.
  check('echos_temporels: scène vue floor12 → veiled (pas zone D)',
    codexEntryState(et, { ...empty, floorReached: 12, echoSeen: new Set(['echo_scene_sceau']) }) === 'veiled');

  // ── Item 2b — Le Dormeur des Fondations (victory → floor 21 → floor 28) ──
  const dorm = getCodexEntry('le_dormeur');
  check('le_dormeur présent (glossaire)', !!dorm && dorm.category === 'glossaire');
  check('le_dormeur: pré-victoire → locked', codexEntryState(dorm, { ...empty, floorReached: 21 }) === 'locked');
  check('le_dormeur: victoire → veiled', codexEntryState(dorm, { ...empty, victoryAchieved: true }) === 'veiled');
  check('le_dormeur: victoire + floor20 → veiled (Avant-Monde non atteint)',
    codexEntryState(dorm, { ...empty, victoryAchieved: true, floorReached: 20 }) === 'veiled');
  check('le_dormeur: victoire + floor21 → revealed',
    codexEntryState(dorm, { ...empty, victoryAchieved: true, floorReached: 21 }) === 'revealed');
  check('le_dormeur: victoire + floor28 → corrupted',
    codexEntryState(dorm, { ...empty, victoryAchieved: true, floorReached: 28 }) === 'corrupted');

  // ── monster : type bestiaire (couverture évaluateur, sans/avec kills) ──
  const monsterEntry = {
    id: '_t_monster', category: 'bestiaire', title: 'T',
    unlockConditions: [{ type: 'monster', value: 'troll' }],
    revealedBy: [{ type: 'monster', value: 'troll', kills: 2 }],
    textVersions: { veiled: 'v', revealed: 'r' },
  };
  check('monster: jamais vu → locked', codexEntryState(monsterEntry, empty) === 'locked');
  check('monster: vu 0 kill → veiled',
    codexEntryState(monsterEntry, { ...empty, seenMonsters: new Set(['troll']), monsterKills: {} }) === 'veiled');
  check('monster: vu 1 kill → veiled (kills<2)',
    codexEntryState(monsterEntry, { ...empty, seenMonsters: new Set(['troll']), monsterKills: { troll: 1 } }) === 'veiled');
  check('monster: vu 2 kills → revealed',
    codexEntryState(monsterEntry, { ...empty, seenMonsters: new Set(['troll']), monsterKills: { troll: 2 } }) === 'revealed');

  // ── Boss promus en personnages (P4, §6.6) — robinet `monster` réel ──
  for (const id of ['maitre_detraqueur', 'heraut_tenebres']) {
    const e = getCodexEntry(id);
    check(`${id} : entrée Codex personnages`, e && e.category === 'personnages');
    check(`${id} : veiled + revealed définis`,
      e && e.textVersions.veiled && e.textVersions.revealed);
    check(`${id} : jamais vu → locked`, codexEntryState(e, empty) === 'locked');
    check(`${id} : vu → veiled`,
      codexEntryState(e, { ...empty, seenMonsters: new Set([id]) }) === 'veiled');
    check(`${id} : vaincu → revealed`,
      codexEntryState(e, { ...empty, seenMonsters: new Set([id]), monsterKills: { [id]: 1 } }) === 'revealed');
  }

  // ── quest + riddle : couverture évaluateur ──
  const qrEntry = {
    id: '_t_qr', category: 'personnages', title: 'T',
    unlockConditions: [{ type: 'quest', value: 'q1' }, { type: 'riddle', value: 'r_clef_voute' }],
    textVersions: { veiled: 'v' },
  };
  check('quest/riddle: rien → locked', codexEntryState(qrEntry, empty) === 'locked');
  check('quest remplie (OU) → veiled',
    codexEntryState(qrEntry, { ...empty, questsDone: new Set(['q1']) }) === 'veiled');
  check('riddle remplie (OU) → veiled',
    codexEntryState(qrEntry, { ...empty, riddlesSolved: new Set(['r_clef_voute']) }) === 'veiled');

  // ── unlockedCodexFor : filtre + état ──
  const ctxMid = { ...empty, floorReached: 14, eclatProgress: 3, echoSeen: new Set(['echo_scene_sceau']) };
  const unlocked = unlockedCodexFor(ctxMid);
  check('unlockedCodexFor renvoie un tableau', Array.isArray(unlocked));
  check('unlockedCodexFor: aucune entrée locked', unlocked.every(u => u.state !== 'locked'));
  check('unlockedCodexFor(empty) ⊂ unlockedCodexFor(mid)',
    unlockedCodexFor(empty).length <= unlocked.length);
  const cleRow = unlocked.find(u => u.entry.id === 'cle_de_voute');
  check('cle_de_voute corrupted dans ctxMid', cleRow && cleRow.state === 'corrupted');

  // ── codexVariantNote : note marginale Maison ──
  const sal = getCodexEntry('voix_salazar');
  check('variante Serpentard présente', typeof codexVariantNote(sal, 'Serpentard', []) === 'string');
  check('variante autre Maison → null', codexVariantNote(sal, 'Gryffondor', []) === null);
  check('variante sans Maison → null', codexVariantNote(sal, null, []) === null);
  check('variante entrée sans variants → null', codexVariantNote(cle, 'Gryffondor', []) === null);

  // ── Lot 4 : Lieux & Glossaire — déverrouillage par zone (A/B/C/D) ──
  const zoneAt = (id, floor) => codexEntryState(getCodexEntry(id), { ...empty, floorReached: floor });
  check('zone A (couloirs) ouverte étage 1', zoneAt('couloirs_poudlard', 1) === 'veiled');
  check('zone B (cachots) fermée étage 1',   zoneAt('cachots_poudlard', 1) === 'locked');
  check('zone B (cachots) ouverte étage 4',  zoneAt('cachots_poudlard', 4) === 'veiled');
  check('zone C (profondeurs) ouverte étage 7', zoneAt('profondeurs_oubliees', 7) === 'veiled');
  check('zone D (ruines) ouverte étage 14',  zoneAt('ruines_anciennes', 14) === 'veiled');
  // Glossaire : Ténébreux gardé par la victoire ; échos par l'étage profond.
  check('tenebreux locked sans victoire', codexEntryState(getCodexEntry('tenebreux'), { ...empty, floorReached: 18 }) === 'locked');
  check('tenebreux ouvert après victoire', codexEntryState(getCodexEntry('tenebreux'), { ...empty, victoryAchieved: true }) === 'veiled');
  check('echos_temporels ouvert étage 12', zoneAt('echos_temporels', 12) === 'veiled');
  check('cheminette (MP) dans glossaire', getCodexEntry('cheminette_inter_mondes').category === 'glossaire');
  // Révélation par descente : couloirs révélés une fois en zone B.
  check('couloirs révélés étage 4', zoneAt('couloirs_poudlard', 4) === 'revealed');

  // ── Lot 5 : Personnages & Objets — robinet `item` + variantes Maison ──
  const sword = getCodexEntry('sword_gryff');
  check('sword_gryff dans objets', sword && sword.category === 'objets');
  check('légendaire locked sans l\'item',
    codexEntryState(sword, empty) === 'locked');
  check('légendaire ouvert si possédé',
    codexEntryState(sword, { ...empty, itemsOwned: new Set(['sword_gryff']) }) === 'veiled');
  check('larmes_phenix ouvert si possédé (item)',
    codexEntryState(getCodexEntry('larmes_phenix'), { ...empty, itemsOwned: new Set(['larmes_phenix']) }) === 'veiled');
  // Variante Maison sur le légendaire : visible pour la bonne Maison seulement.
  check('sword_gryff variante Gryffondor', typeof codexVariantNote(sword, 'Gryffondor', []) === 'string');
  check('sword_gryff pas de variante Serpentard', codexVariantNote(sword, 'Serpentard', []) === null);
  check('locket variante Serpentard', typeof codexVariantNote(getCodexEntry('locket_slytherin'), 'Serpentard', []) === 'string');
  // Personnages : Fondateurs ouverts dès l'étage 1, révélés à 3 éclats.
  const fond = getCodexEntry('les_fondateurs');
  check('les_fondateurs ouverts étage 1', codexEntryState(fond, { ...empty, floorReached: 1 }) === 'veiled');
  check('les_fondateurs révélés à 3 éclats', codexEntryState(fond, { ...empty, floorReached: 1, eclatProgress: 3 }) === 'revealed');
  // echo_salazar : ouvert en zone B (étage 4), révélé par sa voix.
  const eS = getCodexEntry('echo_salazar');
  check('echo_salazar ouvert étage 4', codexEntryState(eS, { ...empty, floorReached: 4 }) === 'veiled');
  check('echo_salazar révélé par sa voix',
    codexEntryState(eS, { ...empty, floorReached: 4, echoSeen: new Set(['echo_salazar']) }) === 'revealed');

  // ── Sorts & Magie 2.0 — Lot P5 : catégorie Codex 'sorts' (❓3) ──
  const sortsEntries = CODEX_ENTRIES.filter(e => e.category === 'sorts');
  check('P5 : catégorie sorts peuplée (≥ 5 entrées)', sortsEntries.length >= 5);
  check('P5 : chaque entrée sorts a veiled + unlockConditions',
    sortsEntries.every(e => typeof e.textVersions.veiled === 'string'
      && Array.isArray(e.unlockConditions) && e.unlockConditions.length));
  // L'entrée temporelle enseigne un sort à la révélation (teachesSpell réutilisé).
  const temporel = getCodexEntry('sort_rituel_temporel');
  check('P5 : sort_rituel_temporel enseigne Tempus Echo', temporel && temporel.teachesSpell === 'Tempus Echo');
  check('P5 : sort_rituel_temporel locked pré-conditions',
    codexEntryState(temporel, empty) === 'locked');
  check('P5 : sort_rituel_temporel veiled (étage 14 zone D)',
    codexEntryState(temporel, { ...empty, floorReached: 14 }) === 'veiled');
  check('P5 : sort_rituel_temporel revealed (victoire/Boucle)',
    codexEntryState(temporel, { ...empty, floorReached: 14, victoryAchieved: true }) === 'revealed');
  // L'entrée corruption porte une surcouche corrupted en Ruines profondes.
  const sc = getCodexEntry('sort_corruption');
  check('P5 : sort_corruption locked pré-victoire', codexEntryState(sc, { ...empty, floorReached: 14 }) === 'locked');
  check('P5 : sort_corruption corrupted (victoire + floor21)',
    codexEntryState(sc, { ...empty, victoryAchieved: true, floorReached: 21 }) === 'corrupted');

  // ── Défensif : ctx incomplet ne throw jamais ──
  let noThrow = true;
  try { codexEntryState(cle, {}); codexEntryState(cle, { floorReached: 1 }); unlockedCodexFor({}); }
  catch (e) { noThrow = false; }
  check('codex helpers tolèrent un ctx incomplet', noThrow);

  // ── P5 : entrées « tactique de combat » (systèmes P2/P4) ──
  const art = getCodexEntry('artefacts_actifs');
  check('P5 codex : artefacts_actifs présent', !!art && art.category === 'glossaire');
  check('P5 codex : artefacts_actifs locked sans artefact', codexEntryState(art, empty) === 'locked');
  check('P5 codex : artefacts_actifs veiled si artefact possédé',
    codexEntryState(art, { ...empty, itemsOwned: new Set(['orbe_runique']) }) === 'veiled');
  check('P5 codex : artefacts_actifs revealed (artefact + étage 8)',
    codexEntryState(art, { ...empty, itemsOwned: new Set(['talisman_fondateurs']), floorReached: 8 }) === 'revealed');

  const post = getCodexEntry('postures_duo');
  check('P5 codex : postures_duo présent', !!post && post.category === 'glossaire');
  check('P5 codex : postures_duo veiled (étage 2)', codexEntryState(post, { ...empty, floorReached: 2 }) === 'veiled');
  check('P5 codex : postures_duo revealed (étage 6)', codexEntryState(post, { ...empty, floorReached: 6 }) === 'revealed');

  const envc = getCodexEntry('environnement_runique');
  check('P5 codex : environnement_runique présent', !!envc && envc.category === 'glossaire');
  check('P5 codex : environnement_runique locked étage 5', codexEntryState(envc, { ...empty, floorReached: 5 }) === 'locked');
  check('P5 codex : environnement_runique veiled étage 14', codexEntryState(envc, { ...empty, floorReached: 14 }) === 'veiled');
  check('P5 codex : environnement_runique revealed (victoire)',
    codexEntryState(envc, { ...empty, floorReached: 14, victoryAchieved: true }) === 'revealed');
})();

// ============================================================
// 9. battle.js — Promotion de boss en personnage (P4, ch.06 §6.6)
//    BOSS_PROMO_BEATS (registre pur) + _maybeBossPromoBeat (one-shot)
// ============================================================
(function testBossPromo() {
  // Registre pur — 2 boss historiques + 4 gardiens de Chambre (Phase 3 Lot 3),
  // chacun avec une ligne de monologue.
  const pure = loadModule('js/battle.js', ['BOSS_PROMO_BEATS']);
  const { BOSS_PROMO_BEATS } = pure;
  check('BOSS_PROMO_BEATS = 6 boss', Object.keys(BOSS_PROMO_BEATS).length === 6);
  for (const id of ['maitre_detraqueur', 'heraut_tenebres',
                    'gardien_lion', 'gardien_serpent', 'gardien_aigle', 'gardien_blaireau']) {
    check(`${id} : ligne de promotion non vide`,
      BOSS_PROMO_BEATS[id] && typeof BOSS_PROMO_BEATS[id].line === 'string' && BOSS_PROMO_BEATS[id].line.length > 20);
  }

  // Orchestrateur one-shot — globals injectés (enemyGroup, seenScriptedBeat, addMsg).
  const seen = new Set();
  let msgs = 0;
  const eg = [{ id: 'maitre_detraqueur', epic: true }];
  const orch = loadModule('js/battle.js', ['_maybeBossPromoBeat'],
    { enemyGroup: eg, seenScriptedBeat: seen, addMsg: () => { msgs++; } });
  const { _maybeBossPromoBeat } = orch;
  check('promo Maître 1re fois = true', _maybeBossPromoBeat() === true);
  check('sentinelle boss_promo:maitre_detraqueur posée', seen.has('boss_promo:maitre_detraqueur'));
  check('promo monologue émis 1×', msgs === 1);
  check('promo Maître 2e fois = false (one-shot)', _maybeBossPromoBeat() === false);
  check('promo pas de double monologue', msgs === 1);

  // Boss non promu (ex. troll en tête) → no-op.
  const seen2 = new Set();
  let msgs2 = 0;
  const orch2 = loadModule('js/battle.js', ['_maybeBossPromoBeat'],
    { enemyGroup: [{ id: 'troll' }], seenScriptedBeat: seen2, addMsg: () => { msgs2++; } });
  check('boss non promu → false', orch2._maybeBossPromoBeat() === false);
  check('boss non promu → aucun message', msgs2 === 0);

  // Groupe vide → no-op défensif.
  const orch3 = loadModule('js/battle.js', ['_maybeBossPromoBeat'],
    { enemyGroup: [], seenScriptedBeat: new Set(), addMsg: () => {} });
  check('groupe vide → false', orch3._maybeBossPromoBeat() === false);
})();

// ============================================================
// 10. quests.js — npcReputation DÉRIVÉE (P4-B, ch.06 §6.9.2)
//    npcReputationFor : réputation bornée [-2,+2] dérivée de slythPactChoice
// ============================================================
(function testNpcReputation() {
  const load = (choice) => loadModule('js/quests.js',
    ['npcReputationFor', 'NPC_REPUTATION_PACT'],
    { slythPactChoice: choice, window: {} });

  const { NPC_REPUTATION_PACT } = load(null);
  check('NPC_REPUTATION_PACT couvre écho + Kingsley',
    NPC_REPUTATION_PACT.echo_salazar && NPC_REPUTATION_PACT.kingsley);

  // Pas de choix → réputation neutre partout.
  const none = load(null).npcReputationFor;
  check('null : écho = 0', none('echo_salazar') === 0);
  check('null : kingsley = 0', none('kingsley') === 0);

  // Pacte : écho chaleureux (+2), Kingsley méfiant (−2) — signes opposés.
  const pact = load('pact').npcReputationFor;
  check('pact : écho = +2', pact('echo_salazar') === 2);
  check('pact : kingsley = −2', pact('kingsley') === -2);

  // Défiance : signes inversés (écho froid −2, Kingsley respect +1).
  const def = load('defiance').npcReputationFor;
  check('defiance : écho = −2', def('echo_salazar') === -2);
  check('defiance : kingsley = +1', def('kingsley') === 1);

  // PNJ non concerné → 0 quel que soit le choix.
  check('pact : PNJ inconnu = 0', pact('hagrid') === 0);
  check('defiance : PNJ inconnu = 0', def('dumbledore') === 0);

  // Bornes [-2,+2] respectées sur toutes les valeurs du registre.
  let bounded = true;
  for (const id of Object.keys(NPC_REPUTATION_PACT)) {
    for (const c of ['pact', 'defiance']) {
      const v = load(c).npcReputationFor(id);
      if (v < -2 || v > 2) bounded = false;
    }
  }
  check('réputation toujours bornée [-2,+2]', bounded);
})();

// ============================================================
// 11. endgame.js — _victorySpeechVariants PUR (Chapitre 14 §14.2.2, P1)
//    Variantes conditionnelles de texte du discours de victoire.
// ============================================================
(function testVictorySpeechVariants() {
  // endgame.js exécute une IIFE qui assigne sur `window` au chargement →
  // on fournit un window stub. _victorySpeechVariants est top-level (pur).
  const { _victorySpeechVariants } = loadModule(
    'js/endgame.js', ['_victorySpeechVariants'], { window: {} });

  // Défensif : ctx vide / absent → aucun bloc (texte de base seul).
  check('ctx absent → chaîne vide', _victorySpeechVariants() === '');
  check('ctx vide → chaîne vide', _victorySpeechVariants({}) === '');

  // (a) Maison → dernier mot coloré, une réplique distincte par Maison.
  check('Gryffondor → réplique Godric',
    _victorySpeechVariants({ chosenHouse: 'Gryffondor' }).includes('Godric'));
  check('Serpentard → réplique Salazar',
    _victorySpeechVariants({ chosenHouse: 'Serpentard' }).includes('Salazar'));
  check('Serdaigle → réplique Rowena',
    _victorySpeechVariants({ chosenHouse: 'Serdaigle' }).includes('Rowena'));
  check('Poufsouffle → réplique Helga',
    _victorySpeechVariants({ chosenHouse: 'Poufsouffle' }).includes('Helga'));
  // Maison inconnue → pas de bloc Maison.
  check('Maison inconnue → pas de bloc house',
    !_victorySpeechVariants({ chosenHouse: 'Inconnue' }).includes('victory-speech-house'));

  // (e) Choix moral : pact = froid, defiance = reconnaissance (miroir).
  check('pact → réplique froide',
    _victorySpeechVariants({ slythPactChoice: 'pact' }).includes("celui à qui l'on parle"));
  check('defiance → réplique chaleureuse',
    _victorySpeechVariants({ slythPactChoice: 'defiance' }).includes('mille ans'));
  check('defiance ≠ froide',
    !_victorySpeechVariants({ slythPactChoice: 'defiance' }).includes("celui à qui l'on parle"));
  check('pact ≠ chaleureuse',
    !_victorySpeechVariants({ slythPactChoice: 'pact' }).includes('mille ans'));

  // (d) Éclats : révélation seulement si fil rouge complet.
  check('eclatsComplete → révélation deux choses',
    _victorySpeechVariants({ eclatsComplete: true }).includes('deux choses'));
  check('sans eclatsComplete → pas de révélation',
    !_victorySpeechVariants({ eclatsComplete: false }).includes('deux choses'));

  // (c) Signatures : chaque flag nomme sa récompense cérémonielle.
  check('gryffSignatureDone → Bannière de Godric',
    _victorySpeechVariants({ gryffSignatureDone: true }).includes('Bannière de Godric'));
  check('slythSignatureDone → Pacte des Cachots',
    _victorySpeechVariants({ slythSignatureDone: true }).includes('Pacte des Cachots'));
  check('ravenSignatureDone → Codex de Rowena',
    _victorySpeechVariants({ ravenSignatureDone: true }).includes('Codex de Rowena'));
  check('poufSignatureDone → Médaillon de Helga',
    _victorySpeechVariants({ poufSignatureDone: true }).includes('Médaillon de Helga'));

  // Cumul : tous les flags actifs → tous les blocs présents, sans crash.
  const full = _victorySpeechVariants({
    chosenHouse: 'Poufsouffle', slythPactChoice: 'defiance', eclatsComplete: true,
    gryffSignatureDone: true, slythSignatureDone: true,
    ravenSignatureDone: true, poufSignatureDone: true
  });
  check('cumul : Maison présente', full.includes('Helga aurait été fière'));
  check('cumul : révélation présente', full.includes('deux choses'));
  check('cumul : 4 héritages présents',
    full.includes('Bannière de Godric') && full.includes('Pacte des Cachots') &&
    full.includes('Codex de Rowena') && full.includes('Médaillon de Helga'));
  check('cumul : reconnaissance présente', full.includes('mille ans'));

  // (b) Héros / solo-duo : beat du palier + clin d'œil Maison canon ≠ jouée.
  const solo = _victorySpeechVariants({ heroes: [{ name: 'Harry Potter', canonHouse: 'Gryffondor' }] });
  check('solo → beat intime (seul·e)', solo.includes('seul·e') && solo.includes('Harry Potter'));
  const duo = _victorySpeechVariants({
    heroes: [{ name: 'Harry Potter', canonHouse: 'Gryffondor' },
             { name: 'Hermione Granger', canonHouse: 'Gryffondor' }] });
  check('duo → échange à deux voix',
    duo.includes('Harry Potter') && duo.includes('Hermione Granger') && duo.includes('Ensemble'));
  check('solo ≠ duo (pas d\'échange en solo)', !solo.includes('Ensemble'));
  // Clin d'œil : héros canon ≠ Maison jouée.
  const wink = _victorySpeechVariants({
    chosenHouse: 'Serpentard',
    heroes: [{ name: 'Harry Potter', canonHouse: 'Gryffondor' }] });
  check('Maison canon ≠ jouée → clin d\'œil', wink.includes('victory-speech-wink') && wink.includes("l'ironie"));
  // Pas de clin d'œil si la Maison canon == Maison jouée.
  const noWink = _victorySpeechVariants({
    chosenHouse: 'Gryffondor',
    heroes: [{ name: 'Harry Potter', canonHouse: 'Gryffondor' }] });
  check('Maison canon == jouée → pas de clin d\'œil', !noWink.includes('victory-speech-wink'));
  // Défensif : heroes absent / vide → pas de beat (b).
  check('heroes vide → pas de beat héros', !_victorySpeechVariants({ heroes: [] }).includes('victory-speech-heroes'));
})();

// ============================================================
// 11bis. endgame.js — computeEndingType PUR (Chapitre 14 §14.6.2, P3)
//    Label de fin dérivé : null / victory / victory_pact / cycle_broken.
// ============================================================
(function testComputeEndingType() {
  const { computeEndingType } = loadModule(
    'js/endgame.js', ['computeEndingType'], { window: {} });

  // Défensif : ctx absent / vide → null (pas encore de fin).
  check('ending: ctx absent → null', computeEndingType() === null);
  check('ending: ctx vide → null',   computeEndingType({}) === null);
  check('ending: pas de victoire → null', computeEndingType({ slythPactChoice: 'pact' }) === null);

  // Victoire simple.
  check('ending: victoire → victory', computeEndingType({ victoryAchieved: true }) === 'victory');
  check('ending: victoire + défiance → victory',
    computeEndingType({ victoryAchieved: true, slythPactChoice: 'defiance' }) === 'victory');

  // Victoire avec Pacte scellé.
  check('ending: victoire + pacte → victory_pact',
    computeEndingType({ victoryAchieved: true, slythPactChoice: 'pact' }) === 'victory_pact');

  // Cycle brisé : priorité maximale (écrase pacte et victoire simple).
  check('ending: cycle brisé → cycle_broken',
    computeEndingType({ victoryAchieved: true, cycleBroken: true }) === 'cycle_broken');
  check('ending: cycle brisé prioritaire sur pacte',
    computeEndingType({ victoryAchieved: true, cycleBroken: true, slythPactChoice: 'pact' }) === 'cycle_broken');
  // cycleBroken sans victoire (cas théorique) → cycle_broken (priorité stricte).
  check('ending: cycleBroken seul → cycle_broken',
    computeEndingType({ cycleBroken: true }) === 'cycle_broken');
})();

// ============================================================
// 11ter. codex.js — robinet `ending` + entrée `epilogue` (P3)
//    Évaluateur pur : la révélation de l'épilogue suit endingType.
// ============================================================
(function testCodexEpilogue() {
  const { getCodexEntry, codexEntryState } = loadModule(
    'js/codex.js', ['getCodexEntry', 'codexEntryState']);

  const epi = getCodexEntry('epilogue');
  check('epilogue: entrée présente', !!epi);
  check('epilogue: catégorie histoire', epi && epi.category === 'histoire');
  check('epilogue: 4 notes de Maison',
    epi && epi.variants && epi.variants.house &&
    ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].every(h => typeof epi.variants.house[h] === 'string'));

  // Verrouillé tant que la victoire n'est pas acquise.
  check('epilogue: locked sans victoire', codexEntryState(epi, {}) === 'locked');
  // Ouvert (veiled) à la victoire, quel que soit le label simple.
  check('epilogue: veiled à la victoire (victory)',
    codexEntryState(epi, { victoryAchieved: true, endingType: 'victory' }) === 'veiled');
  check('epilogue: veiled à la victoire (victory_pact)',
    codexEntryState(epi, { victoryAchieved: true, endingType: 'victory_pact' }) === 'veiled');
  // Révélé quand le label de fin vaut cycle_broken (robinet `ending`).
  check('epilogue: revealed quand ending=cycle_broken',
    codexEntryState(epi, { victoryAchieved: true, endingType: 'cycle_broken' }) === 'revealed');
  // Le robinet `ending` lit bien endingType, pas cycleBroken directement :
  // endingType absent malgré cycleBroken → reste veiled (cohérent : endingType
  // est la source unique, réconciliée par refreshEndingType au runtime).
  check('epilogue: ending non posé → veiled',
    codexEntryState(epi, { victoryAchieved: true, cycleBroken: true }) === 'veiled');
})();

// ============================================================
// 11quater. profile.js — titres NG+ PURS (Chapitre 14, P5)
//    computeProfileTitles / profileTopTitle dérivés du profil persistant.
// ============================================================
(function testProfileTitles() {
  const { computeProfileTitles, profileTopTitle } = loadModule(
    'js/profile.js', ['computeProfileTitles', 'profileTopTitle']);

  // Profil vierge → aucun titre.
  check('titres: profil absent → []', computeProfileTitles().length === 0);
  check('titres: profil vide → []',   computeProfileTitles({}).length === 0);
  check('top: profil vierge → ""',    profileTopTitle({}) === '');

  // Victoire simple → « Vainqueur de l'Ombre ».
  const win = { victories: 1, endingsSeen: { victory: true } };
  check('titres: victoire → Vainqueur',
    computeProfileTitles(win).join('|') === "Vainqueur de l'Ombre");
  check('top: victoire → Vainqueur', profileTopTitle(win) === "Vainqueur de l'Ombre");

  // Victoire avec Pacte → ajoute « Diplomate des Cachots » (prioritaire au top).
  const pact = { victories: 1, pactVictories: 1,
                 endingsSeen: { victory: true, victory_pact: true } };
  check('titres: pacte → Vainqueur + Diplomate',
    computeProfileTitles(pact).includes('Diplomate des Cachots'));
  check('top: pacte → Diplomate', profileTopTitle(pact) === 'Diplomate des Cachots');

  // 1 Cycle brisé → « Briseur de Cycle » (sans ★).
  const c1 = { victories: 1, cyclesBroken: 1,
               endingsSeen: { victory: true, cycle_broken: true } };
  check('titres: 1 cycle → Briseur de Cycle (sans ★)',
    computeProfileTitles(c1).includes('Briseur de Cycle'));
  check('top: 1 cycle → Briseur (prioritaire)', profileTopTitle(c1) === 'Briseur de Cycle');

  // N≥2 Cycles brisés → « Briseur de Cycle ★N ».
  const c3 = { victories: 2, pactVictories: 1, cyclesBroken: 3,
               endingsSeen: { victory: true, victory_pact: true, cycle_broken: true } };
  check('titres: 3 cycles → ★3', computeProfileTitles(c3).includes('Briseur de Cycle ★3'));
  check('top: 3 cycles → Briseur ★3 (prioritaire)', profileTopTitle(c3) === 'Briseur de Cycle ★3');
  check('titres: 3 titres cumulés', computeProfileTitles(c3).length === 3);

  // endingsSeen suffit même sans compteur (saves rétro-compatibles).
  check('titres: endingsSeen seul → Vainqueur',
    computeProfileTitles({ endingsSeen: { victory: true } }).join('|') === "Vainqueur de l'Ombre");
})();

// ============================================================
// 12. monsters.js — Basilic Ancestral (boss Boucle profonde)
//    Vérifie l'enregistrement + le gating d'étage effectif + le statut
//    de « brute » (→ Broyer auto). Données pures.
// ============================================================
(function testBasilicAncestral() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster, effectiveFloor } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster', 'effectiveFloor'], { victoryAchieved: true });

  const b = MONSTERS.find(m => m.id === 'basilic_ancestral');
  check('basilic: entrée présente', !!b);
  check('basilic: epic + weight 1', !!b && b.epic === true && b.weight === 1);
  check('basilic: imgSrc câblé', !!b && b.imgSrc === 'img/monsters/basilic_ancestral.png');
  check('basilic: faible à la lumière', !!b && Array.isArray(b.weak) && b.weak.includes('lumière'));
  check('basilic: drops non vides', !!b && Array.isArray(b.drops) && b.drops.length >= 3);

  // Brute (atk ≥ 1,5×mag & atk ≥ 12) → reçoit Broyer auto via scaleMonster.
  check('basilic: est une brute (Broyer auto)', isBruteMonster(b) === true);

  // Boucle-exclusif : minFloor 12 filtré via effectiveFloor → exclu du 1er tour
  // (réel 11-20, eff. 1-10) et du réel 21 (eff. 11), apparaît au réel 22 (eff. 12).
  check('basilic: minFloor 12', !!b && b.minFloor === 12);
  check('basilic: exclu réel 21 (eff. 11 < 12)', effectiveFloor(21) < b.minFloor);
  check('basilic: éligible réel 22 (eff. 12)', effectiveFloor(22) >= b.minFloor);
})();

// ============================================================
// 13. monsters.js + quêtes — Moremplis (Lethifold) + purge du Gardien
//    Caster/drain (PAS une brute), faible lumière, recycle en Boucle, et
//    cible de la quête de purge répétable purge_moremplis du Gardien.
// ============================================================
(function testMoremplis() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster, effectiveFloor } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster', 'effectiveFloor'], { victoryAchieved: true });

  const m = MONSTERS.find(x => x.id === 'moremplis');
  check('moremplis: entrée présente', !!m);
  check('moremplis: epic + weight 1', !!m && m.epic === true && m.weight === 1);
  check('moremplis: imgSrc câblé', !!m && m.imgSrc === 'img/monsters/moremplis.png');
  check('moremplis: faible à la lumière', !!m && Array.isArray(m.weak) && m.weak.includes('lumière'));
  // Caster/drain : atk < 1,5×mag → PAS une brute (pas de Broyer).
  check('moremplis: n\'est PAS une brute', isBruteMonster(m) === false);
  // minFloor 9 → recycle dans la Boucle au réel 19 (effectiveFloor(19)=9).
  check('moremplis: éligible Boucle réel 19 (eff. 9)', !!m && effectiveFloor(19) >= m.minFloor);

  // Quête de purge répétable.
  const { QUEST_TEMPLATES } = loadModule('js/quests-templates.js', ['QUEST_TEMPLATES']);
  const q = QUEST_TEMPLATES.find(t => t.id === 'purge_moremplis');
  check('purge_moremplis: template présent', !!q);
  check('purge_moremplis: cible moremplis ×2',
    !!q && q.objectives[0].monsterId === 'moremplis' && q.objectives[0].amount === 2);
  check('purge_moremplis: répétable everyLevels 2',
    !!q && q.repeatable && q.repeatable.everyLevels === 2);

  // Le Gardien de la Boucle donne ET reçoit la nouvelle purge.
  const { NPCS } = loadModule('js/npcs.js', ['NPCS']);
  const g = NPCS.find(n => n.id === 'gardien_boucle');
  check('gardien: donne purge_moremplis', !!g && g.questsGiven.includes('purge_moremplis'));
  check('gardien: reçoit purge_moremplis', !!g && g.questsTurnedIn.includes('purge_moremplis'));
})();

// ============================================================
// 12. data.js — Artefacts & Reliquaires 2.0, socle data (Lot P0)
//    ARTIFACT_FORMS (registre inerte) + premiumStat (helper PUR)
// ------------------------------------------------------------
// data.js n'a aucun code exécutable au top-level lisant un global externe
// (les .map/.reduce de tête n'opèrent que sur des tableaux locaux) → il se
// charge tel quel dans le sandbox vm. On verrouille le registre de formes et
// la règle de boost Premium (+20/35/50 %) AVANT que tout artefact ne s'en serve.
// ============================================================
(function testArtifactSocle() {
  const { ARTIFACT_FORMS, PREMIUM_MULT, premiumStat } = loadModule(
    'js/data.js', ['ARTIFACT_FORMS', 'PREMIUM_MULT', 'premiumStat']);

  // ── ARTIFACT_FORMS : chaque forme mappe un slot d'équipement VALIDE ──
  // (orthogonalité forme↔slot : aucune forme n'invente de slot — plan §0/§1.3).
  const VALID_SLOTS = ['wand','head','body','hands','feet','cloak','amulet','ring','belt','trinket'];
  const FORM_KEYS = Object.keys(ARTIFACT_FORMS);
  check('ARTIFACT_FORMS : 12 formes', FORM_KEYS.length === 12);
  check('ARTIFACT_FORMS contient les nouvelles formes du plan',
    ['baton','orbe','cristal','grimoire','talisman','masque','gantelets','relique_vocale']
      .every(k => !!ARTIFACT_FORMS[k]));
  let formsOk = true;
  for (const k of FORM_KEYS) {
    const f = ARTIFACT_FORMS[k];
    if (!f || typeof f.label !== 'string' || !f.label.length) formsOk = false;
    // slot null autorisé UNIQUEMENT pour la forme consommable (elixir_perma).
    if (f.slot === null) { if (k !== 'elixir_perma') formsOk = false; }
    else if (!VALID_SLOTS.includes(f.slot)) formsOk = false;
    if (typeof f.icon !== 'string' || !f.icon.length) formsOk = false;
  }
  check('ARTIFACT_FORMS : label/slot valide/icon pour chaque forme', formsOk);
  check('elixir_perma : forme sans slot (consommable)', ARTIFACT_FORMS.elixir_perma.slot === null);

  // ── PREMIUM_MULT : +20 % rare / +35 % epic / +50 % legendary ──
  check('PREMIUM_MULT rare = 1.20',      approx(PREMIUM_MULT.rare, 1.20));
  check('PREMIUM_MULT epic = 1.35',      approx(PREMIUM_MULT.epic, 1.35));
  check('PREMIUM_MULT legendary = 1.50', approx(PREMIUM_MULT.legendary, 1.50));

  // ── premiumStat : boost entier arrondi ──
  check('premiumStat(8, epic) = 11 (8×1.35=10.8)', premiumStat(8, 'epic') === 11);
  check('premiumStat(4, epic) = 5 (4×1.35=5.4)',   premiumStat(4, 'epic') === 5);
  check('premiumStat(6, legendary) = 9 (6×1.5)',   premiumStat(6, 'legendary') === 9);
  check('premiumStat(10, rare) = 12 (10×1.2)',     premiumStat(10, 'rare') === 12);
  // Valeur fractionnaire (regen %, multiplicateur crit) → 2 décimales.
  check('premiumStat(0.20, epic) ≈ 0.27 (0.20×1.35)', approx(premiumStat(0.20, 'epic'), 0.27));
  check('premiumStat(0.15, rare) = 0.18 (0.15×1.2)',  approx(premiumStat(0.15, 'rare'), 0.18));
  check('premiumStat(3, rare, {fractional}) = 3.6',   approx(premiumStat(3, 'rare', { fractional: true }), 3.6));
  // Malus de trade-off (≤0) JAMAIS aggravé ; 0 inchangé.
  check('premiumStat(-2, epic) = -2 (malus intact)', premiumStat(-2, 'epic') === -2);
  check('premiumStat(0, epic) = 0',                  premiumStat(0, 'epic') === 0);
  // Rareté inconnue → no-op (multiplicateur 1) ; valeur non finie renvoyée telle quelle.
  check('premiumStat(5, "common") = 5 (no-op)', premiumStat(5, 'common') === 5);
  check('premiumStat(5, undefined) = 5 (no-op)', premiumStat(5) === 5);
  check('premiumStat(NaN, epic) = NaN (passthrough)', Number.isNaN(premiumStat(NaN, 'epic')));

  // ── Cohérence doc ↔ code (verrou anti-dérive avec le plan §1.6) ──
  const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  check('data.js déclare PREMIUM_MULT rare 1.20/epic 1.35/legendary 1.50',
    /PREMIUM_MULT\s*=\s*\{\s*rare:\s*1\.20,\s*epic:\s*1\.35,\s*legendary:\s*1\.50\s*\}/.test(dataSrc));
})();

// ============================================================
// 14. monsters.js — Magyar Ancestral (dragon de feu, brute → Broyer)
//    Brute (atk ≥ 1,5×mag & atk ≥ 12) → Broyer auto, élément feu (résiste
//    feu, faible glace), sprite PNG câblé, recycle en Boucle.
// ============================================================
(function testMagyar() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster, effectiveFloor } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster', 'effectiveFloor'], { victoryAchieved: true });

  const d = MONSTERS.find(x => x.id === 'magyar_ancestral');
  check('magyar: entrée présente', !!d);
  check('magyar: epic + weight 1', !!d && d.epic === true && d.weight === 1);
  check('magyar: imgSrc câblé', !!d && d.imgSrc === 'img/monsters/magyar_ancestral.png');
  check('magyar: est une brute (Broyer auto)', isBruteMonster(d) === true);
  check('magyar: résiste feu, faible glace',
    !!d && d.resist.includes('feu') && d.weak.includes('glace'));
  // minFloor 10 → dernier étage pré-victoire ET recycle au réel 20 (eff. 10).
  check('magyar: éligible Boucle réel 20 (eff. 10)', !!d && effectiveFloor(20) >= d.minFloor);
})();

// ============================================================
// 15. monsters.js — Spectre de Givre (caster glace, mort-vivant)
//    Caster (PAS une brute), élément glace (résiste glace, faible feu),
//    catégorie fantôme (→ Lumos Solem ×1,5), sprite PNG câblé.
// ============================================================
(function testSpectreGivre() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster, effectiveFloor } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster', 'effectiveFloor'], { victoryAchieved: true });

  const s = MONSTERS.find(x => x.id === 'spectre_givre');
  check('spectre_givre: entrée présente', !!s);
  check('spectre_givre: epic + weight 1', !!s && s.epic === true && s.weight === 1);
  check('spectre_givre: imgSrc câblé', !!s && s.imgSrc === 'img/monsters/spectre_givre.png');
  check('spectre_givre: catégorie fantôme (mort-vivant)', !!s && s.category === 'fantôme');
  check('spectre_givre: n\'est PAS une brute', isBruteMonster(s) === false);
  check('spectre_givre: résiste glace, faible feu',
    !!s && s.resist.includes('glace') && s.weak.includes('feu'));
  // Applique le statut gel ❄️ (4ᵉ DoT).
  check('spectre_givre: inflige le statut gel',
    !!s && s.abilities.some(a => a.statusId === 'gel'));
  // minFloor 8 → recycle en Boucle au réel 18 (effectiveFloor(18)=8).
  check('spectre_givre: éligible Boucle réel 18 (eff. 8)', !!s && effectiveFloor(18) >= s.minFloor);
})();

// ============================================================
// 16. monsters.js — Héraut de l'Orage (caster foudre, faible physique)
//    Caster (PAS une brute), élément foudre (résiste foudre, faible physique
//    — unique parmi les boss), recycle en Boucle.
// ============================================================
(function testHerautFoudre() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster, effectiveFloor } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster', 'effectiveFloor'], { victoryAchieved: true });

  const h = MONSTERS.find(x => x.id === 'heraut_foudre');
  check('heraut_foudre: entrée présente', !!h);
  check('heraut_foudre: epic + weight 1', !!h && h.epic === true && h.weight === 1);
  check('heraut_foudre: imgSrc câblé', !!h && h.imgSrc === 'img/monsters/heraut_foudre.png');
  check('heraut_foudre: n\'est PAS une brute', isBruteMonster(h) === false);
  check('heraut_foudre: résiste foudre, faible physique',
    !!h && h.resist.includes('foudre') && h.weak.includes('physique'));
  // minFloor 7 → recycle en Boucle au réel 17 (effectiveFloor(17)=7).
  check('heraut_foudre: éligible Boucle réel 17 (eff. 7)', !!h && effectiveFloor(17) >= h.minFloor);
})();

// ============================================================
// 17. dungeon-scaling.js — New Game+ « vrai » (challenge empilable)
//    Helper PUR ngPlusScaling (identité à 0, valeur à N, plafond) + intégration
//    dans scaleMonster (multiplie stats/butin/drops via opts.ngPlusLevel).
// ============================================================
(function testNgPlus() {
  // Math déterministe (random=0.5 → jamais shiny ; pas d'aléa d'or sur gold scalaire).
  const detMath = Object.assign(Object.create(Math), { random: () => 0.5 });
  const { ngPlusScaling, scaleMonster, NGPLUS_CAP } = loadModule(
    'js/dungeon-scaling.js', ['ngPlusScaling', 'scaleMonster', 'NGPLUS_CAP'],
    { victoryAchieved: false, difficulty: 'Normal',
      DIFFICULTY_SETTINGS: { Normal: { scalingMultiplier: 1 } },
      MONSTERS: [], ngPlusRun: false, ngPlusLevel: 0, Math: detMath });

  // Helper pur.
  const s0 = ngPlusScaling(0);
  check('ngPlusScaling(0) = identité', s0.stat === 1 && s0.reward === 1 && s0.drop === 1);
  check('ngPlusScaling(-3) = identité (garde-fou)', ngPlusScaling(-3).stat === 1);
  const s5 = ngPlusScaling(5);
  check('ngPlusScaling(5).stat = 1.75', approx(s5.stat, 1 + 0.15 * 5));
  check('ngPlusScaling(5).reward = 2.25', approx(s5.reward, 1 + 0.25 * 5));
  check('ngPlusScaling(5).drop = 1.5',   approx(s5.drop, 1 + 0.10 * 5));
  const sCap = ngPlusScaling(999), sMax = ngPlusScaling(NGPLUS_CAP);
  check('ngPlusScaling plafonné à NGPLUS_CAP', sCap.stat === sMax.stat && sCap.reward === sMax.reward);

  // Intégration scaleMonster : opts.ngPlusLevel multiplie stats + butin + drops.
  const base = { id: 't', name: 'T', hp: 100, atk: 10, def: 10, mag: 10, agi: 5, lck: 5,
    scale: 0, xp: 20, gold: 10, drops: [{ itemId: 'x', chance: 0.4 }],
    abilities: [], resist: [], weak: [] };
  const a = scaleMonster(base, 1, { ngPlusLevel: 0 });
  const b = scaleMonster(base, 1, { ngPlusLevel: 5 });
  check('scaleMonster NG+0 : hp de base', a.hp === 100 && a.gold === 10);
  check('scaleMonster NG+0 : pas de tag ngPlusLevel', a.ngPlusLevel === undefined);
  check('scaleMonster NG+5 : hp ×1.75', b.hp === 175);
  check('scaleMonster NG+5 : or ×2.25', b.gold === 22);     // floor(10×2.25)
  check('scaleMonster NG+5 : drop ×1.5', approx(b.drops[0].chance, 0.6));
  check('scaleMonster NG+5 : tag ngPlusLevel=5', b.ngPlusLevel === 5);
})();

// ============================================================
// N. data.js — unicité des `id` dans ITEMS (garde-fou anti-régression)
// ============================================================
// Contexte : le bug `codex_rowena` (legendary Tier-5 + epic signature au même
// id) faisait que `ITEMS.find(i=>i.id===…)` shadowait l'epic. Tout id dupliqué
// rend une entrée inatteignable par lookup → assertion d'unicité globale.
(function testItemsUniqueIds() {
  const { ITEMS } = loadModule('js/data.js', ['ITEMS']);
  const seen = new Set();
  const dupes = [];
  for (const it of ITEMS) {
    if (seen.has(it.id)) dupes.push(it.id);
    seen.add(it.id);
  }
  check('ITEMS : aucun id dupliqué' + (dupes.length ? ' (doublons: ' + dupes.join(', ') + ')' : ''),
    dupes.length === 0);
  // L'epic signature Serdaigle a bien un id distinct du legendary Tier-5.
  check('codex_rowena (legendary) présent', ITEMS.some(i => i.id === 'codex_rowena' && i.rarity === 'legendary'));
  check('codex_rowena_eclat (epic signature) présent', ITEMS.some(i => i.id === 'codex_rowena_eclat' && i.rarity === 'epic'));
})();

// ============================================================
// 18. monsters.js — Gardiens des Chambres des Fondateurs (Phase 3, Lot 1)
//    4 boss-gardiens epic (un par Maison), thématisés par élément, ét. 17+,
//    drop signature = légende de la Maison. Brute Gryff/Pouf, caster Slyth/Serd.
// ============================================================
(function testFounderChamberGuardians() {
  const { MONSTERS } = loadModule('js/monsters.js', ['MONSTERS']);
  const { isBruteMonster } = loadModule(
    'js/dungeon-scaling.js', ['isBruteMonster'], { victoryAchieved: true });

  const G = {
    gardien_lion:     { resist: 'feu',      weak: 'glace',    legend: 'sword_gryff',       brute: true  },
    gardien_serpent:  { resist: 'ténèbres', weak: 'lumière',  legend: 'locket_slytherin',  brute: false },
    gardien_aigle:    { resist: 'foudre',   weak: 'physique', legend: 'diademe_serdaigle', brute: false },
    gardien_blaireau: { resist: 'physique', weak: 'feu',      legend: 'coupe_poufsouffle', brute: true  },
  };
  for (const id of Object.keys(G)) {
    const m = MONSTERS.find(x => x.id === id);
    const exp = G[id];
    check(`${id}: entrée présente`, !!m);
    check(`${id}: epic + minFloor 17`, !!m && m.epic === true && m.minFloor === 17);
    check(`${id}: résiste ${exp.resist}, faible ${exp.weak}`,
      !!m && m.resist.includes(exp.resist) && m.weak.includes(exp.weak));
    check(`${id}: drop légende ${exp.legend}`,
      !!m && Array.isArray(m.drops) && m.drops.some(d => d.itemId === exp.legend));
    check(`${id}: profil ${exp.brute ? 'brute' : 'caster'}`, !!m && isBruteMonster(m) === exp.brute);
  }
})();

// ============================================================
// Lot 2c — battle-ui.js : houseSkinClass (livrée de Maison, PUR)
// ============================================================
(function testHouseSkin() {
  const { houseSkinClass } = loadModule('js/battle-ui.js', ['houseSkinClass']);
  // 4 Maisons → classe dédiée quand activé.
  check('skin Gryffondor', houseSkinClass('Gryffondor', true) === 'house-skin-gryffondor');
  check('skin Serpentard', houseSkinClass('Serpentard', true) === 'house-skin-serpentard');
  check('skin Serdaigle',  houseSkinClass('Serdaigle', true)  === 'house-skin-serdaigle');
  check('skin Poufsouffle', houseSkinClass('Poufsouffle', true) === 'house-skin-poufsouffle');
  // Flag de repli V1 (désactivé) → aucune classe, quelle que soit la Maison.
  check('skin désactivé → vide', houseSkinClass('Gryffondor', false) === '');
  // Maison absente / inconnue → vide, jamais d'exception (défensif).
  check('skin sans Maison → vide', houseSkinClass(null, true) === '');
  check('skin Maison inconnue → vide', houseSkinClass('Durmstrang', true) === '');
  check('skin undefined → vide', houseSkinClass(undefined, true) === '');
})();

// ============================================================
// Sorts & Magie 2.0 — socle data P0 (data.js, helpers PURS + normalisation)
// ------------------------------------------------------------
// Miroir du socle Artefacts. On charge data.js dans le sandbox (inerte au
// top-level hormis _normalizeSpells(SPELLS), pure data-prep) et on verrouille
// les registres, les helpers purs et l'idempotence du passe de normalisation.
// ============================================================
(function testSpellSocleP0() {
  const m = loadModule('js/data.js', [
    'SPELLS', 'SPELL_TIERS', 'SPELL_PREMIUM_MULT', 'SPELL_RARITY_COST_MULT',
    'HOUSE_SPELL_FX', 'HERO_PATRONUS', 'SPELL_META',
    'getSpellById', 'getSpellByName', 'spellTierTint', 'resolveSpellForm',
    'spellPmCostEstimate', '_slugifySpell', '_defaultSpellCategory', '_normalizeSpells',
    'houseSpellBoost', '_charHasArtifactForm', 'spellSynergiesFor',
  ]);
  const { SPELLS, SPELL_TIERS, SPELL_PREMIUM_MULT, SPELL_RARITY_COST_MULT,
          HOUSE_SPELL_FX, HERO_PATRONUS, SPELL_META, getSpellById, getSpellByName, spellTierTint,
          resolveSpellForm, spellPmCostEstimate, _slugifySpell, _defaultSpellCategory,
          _normalizeSpells, houseSpellBoost, _charHasArtifactForm, spellSynergiesFor } = m;

  // ── Registres ──
  check('SPELL_PREMIUM_MULT = rare/epic/legendary',
    SPELL_PREMIUM_MULT.rare === 1.20 && SPELL_PREMIUM_MULT.epic === 1.30 && SPELL_PREMIUM_MULT.legendary === 1.40);
  check('SPELL_TIERS = 4 rangs', Object.keys(SPELL_TIERS).length === 4);
  check('SPELL_TIERS rangs ordonnés 0..3',
    ['basique', 'avancé', 'maître', 'corrompu'].every((t, i) => SPELL_TIERS[t] && SPELL_TIERS[t].rank === i));
  check('SPELL_TIERS mult croissant',
    SPELL_TIERS['basique'].mult < SPELL_TIERS['avancé'].mult &&
    SPELL_TIERS['avancé'].mult < SPELL_TIERS['maître'].mult &&
    SPELL_TIERS['maître'].mult < SPELL_TIERS['corrompu'].mult);
  check('SPELL_TIERS chaque rang a un tint hex',
    Object.values(SPELL_TIERS).every(t => /^#[0-9a-f]{6}$/i.test(t.tint)));
  check('HOUSE_SPELL_FX = 4 Maisons',
    ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].every(h => HOUSE_SPELL_FX[h] && HOUSE_SPELL_FX[h].fx && /^#[0-9a-f]{6}$/i.test(HOUSE_SPELL_FX[h].tint)));
  check('HERO_PATRONUS couvre les 16 héros', Object.keys(HERO_PATRONUS).length === 16);
  check('HERO_PATRONUS harry=Cerf / hermione=Loutre',
    HERO_PATRONUS.harry === 'Cerf' && HERO_PATRONUS.hermione === 'Loutre');

  // ── _slugifySpell : déterministe, sans accent, snake_case ──
  check('slug Incendio', _slugifySpell('Incendio') === 'incendio');
  check('slug accent', _slugifySpell('Glacius Tempête') === 'glacius_tempete');
  check('slug ponctuation', _slugifySpell('Avada...') === 'avada');
  check('slug tiret', _slugifySpell('Cheminette Inter-Mondes') === 'cheminette_inter_mondes');
  check('slug null/undefined → ""', _slugifySpell(null) === '' && _slugifySpell(undefined) === '');

  // ── _defaultSpellCategory : taxonomie 2.0 mécanique ──
  check('cat heal → defense', _defaultSpellCategory({ effect: 'heal' }) === 'defense');
  check('cat shield → defense', _defaultSpellCategory({ effect: 'shield' }) === 'defense');
  check('cat steal → exploration', _defaultSpellCategory({ effect: 'steal' }) === 'exploration');
  check('cat reveal → exploration', _defaultSpellCategory({ effect: 'reveal' }) === 'exploration');
  check('cat burn → combat', _defaultSpellCategory({ effect: 'burn' }) === 'combat');
  check('cat inconnu → combat (défaut sûr)', _defaultSpellCategory({ effect: 'xyz' }) === 'combat');
  check('cat sans effect → combat', _defaultSpellCategory({}) === 'combat');

  // ── _normalizeSpells : champs présents partout, idempotent, sans écrasement ──
  check('tous les sorts ont id/category/tier/rarity',
    SPELLS.every(s => s.id && s.category && s.tier && s.rarity && ('houseAffinity' in s)));
  check('ids tous uniques', new Set(SPELLS.map(s => s.id)).size === SPELLS.length);
  check('tous les tiers ∈ SPELL_TIERS', SPELLS.every(s => !!SPELL_TIERS[s.tier]));
  check('toutes les catégories ∈ taxonomie 2.0',
    SPELLS.every(s => ['combat', 'exploration', 'defense', 'rituel', 'signature'].includes(s.category)));
  check('toutes les raretés valides',
    SPELLS.every(s => ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(s.rarity)));
  check('houseAffinity ∈ {null, 4 Maisons}',
    SPELLS.every(s => s.houseAffinity === null || ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].includes(s.houseAffinity)));

  // ── Étiquetage curaté P1 (SPELL_META) ──
  check('SPELL_META couvre tous les sorts', SPELLS.every(s => !!SPELL_META[s.name]));
  // Précédence : la valeur curée s'applique quand le littéral n'en déclare pas.
  check('Incendio = combat/basique/common', (() => { const s = getSpellByName('Incendio'); return s.category === 'combat' && s.tier === 'basique' && s.rarity === 'common'; })());
  check('Sectumsempra = combat/maître/epic', (() => { const s = getSpellByName('Sectumsempra'); return s.tier === 'maître' && s.rarity === 'epic'; })());
  check('Fiendfyre = corrompu/legendary', (() => { const s = getSpellByName('Fiendfyre'); return s.tier === 'corrompu' && s.rarity === 'legendary'; })());
  check('Avada... = signature/corrompu/legendary', (() => { const s = getSpellByName('Avada...'); return s.category === 'signature' && s.tier === 'corrompu' && s.rarity === 'legendary'; })());
  // Les 4 sorts « Mythe » portent l'affinité de Maison canon (et eux seuls).
  const myth = { 'Patronus Maxima': 'Gryffondor', 'Sectumsempra Imperius': 'Serpentard', 'Legilimens': 'Serdaigle', 'Récolte Magique': 'Poufsouffle' };
  for (const [n, h] of Object.entries(myth)) {
    const s = getSpellByName(n);
    check(`${n} affine ${h} + signature`, s && s.houseAffinity === h && s.category === 'signature');
  }
  // 4 Mythe + 4 Premium (P3) + 4 corruption + 4 légendaires de Maison (P4) = 16.
  check('16 sorts house-affine (4 Mythe + 4 Premium + 4 corruption + 4 légendaires)', SPELLS.filter(s => s.houseAffinity).length === 16);
  check('au moins 1 sort par rang',
    ['basique', 'avancé', 'maître', 'corrompu'].every(t => SPELLS.some(s => s.tier === t)));
  // Idempotence : un 2e passe ne change rien (clone JSON identique).
  const before = JSON.stringify(SPELLS);
  _normalizeSpells(SPELLS);
  check('_normalizeSpells idempotent', JSON.stringify(SPELLS) === before);
  // Non-écrasement : une valeur déclarée est préservée.
  const custom = [{ name: 'Test', effect: 'burn', tier: 'maître', rarity: 'epic', id: 'mon_id', houseAffinity: 'Gryffondor' }];
  _normalizeSpells(custom);
  check('_normalizeSpells préserve id déclaré', custom[0].id === 'mon_id');
  check('_normalizeSpells préserve tier déclaré', custom[0].tier === 'maître');
  check('_normalizeSpells préserve houseAffinity déclaré', custom[0].houseAffinity === 'Gryffondor');
  // Sans argument → défaut sur SPELLS (usage de production).
  check('_normalizeSpells() défaut sur SPELLS', _normalizeSpells() === SPELLS);
  // Défensif : entrée non-array truthy → renvoyée telle quelle, sans exception.
  check('_normalizeSpells(42) défensif', _normalizeSpells(42) === 42);
  const mixed = [null, { name: 'X', effect: 'heal' }];
  _normalizeSpells(mixed);
  check('_normalizeSpells ignore les éléments nuls', mixed[0] === null && mixed[1].category === 'defense');

  // ── getSpellById / getSpellByName : résolution + garde-fous ──
  check('getSpellByName Incendio', getSpellByName('Incendio') && getSpellByName('Incendio').id === 'incendio');
  check('getSpellById incendio', getSpellById('incendio') && getSpellById('incendio').name === 'Incendio');
  check('getSpellByName inconnu → null', getSpellByName('Inexistant') === null);
  check('getSpellById inconnu → null', getSpellById('inexistant') === null);
  check('getSpellByName(null) → null', getSpellByName(null) === null);
  check('getSpellById(null) → null', getSpellById(null) === null);

  // ── spellTierTint : tint du rang, repli sûr ──
  check('tint basique', spellTierTint({ tier: 'basique' }) === SPELL_TIERS['basique'].tint);
  check('tint corrompu', spellTierTint({ tier: 'corrompu' }) === SPELL_TIERS['corrompu'].tint);
  check('tint sans tier → repli basique', spellTierTint({}) === SPELL_TIERS['basique'].tint);
  check('tint null → repli basique', spellTierTint(null) === SPELL_TIERS['basique'].tint);

  // ── resolveSpellForm : P0 renvoie la forme de base, non destructif ──
  check('resolveSpellForm Incendio = base', resolveSpellForm('Incendio') === getSpellByName('Incendio'));
  check('resolveSpellForm inconnu → null', resolveSpellForm('Inexistant') === null);
  const charStub = { spells: ['Incendio'], equipped: {} };
  const snapBefore = JSON.stringify(charStub);
  resolveSpellForm('Incendio', charStub);
  check('resolveSpellForm ne mute pas le perso', JSON.stringify(charStub) === snapBefore);

  // ── Synergie P1 — évolution & surcharge signature (non destructif) ──
  // _charHasArtifactForm : match sur id OU premiumOf, défensif.
  check('_charHasArtifactForm équip vide → false', _charHasArtifactForm({ equipped: {} }, 'baton_ancestral') === false);
  check('_charHasArtifactForm null → false', _charHasArtifactForm(null, 'x') === false);
  check('_charHasArtifactForm match premiumOf',
    _charHasArtifactForm({ equipped: { wand: { id: 'baton_ancestral_premium_serd', premiumOf: 'baton_ancestral' } } }, 'baton_ancestral') === true);
  check('_charHasArtifactForm match id direct',
    _charHasArtifactForm({ equipped: { head: { id: 'orbe_runique_premium_gryff' } } }, 'orbe_runique_premium_gryff') === true);

  // Évolution : Bâton Ancestral équipé → Incendio devient Incendio Majeur.
  const serdChar = { spells: ['Incendio', 'Legilimens'],
    equipped: { wand: { id: 'baton_ancestral_premium_serd', premiumOf: 'baton_ancestral' } } };
  const evoSpell = resolveSpellForm('Incendio', serdChar);
  check('évolution Incendio → Incendio Majeur', evoSpell && evoSpell.name === 'Incendio Majeur' && evoSpell.power === 24);
  check('Incendio Majeur dans SPELL_META', !!SPELL_META['Incendio Majeur']);
  // Le même artefact surcharge aussi Legilimens (signature Serdaigle).
  const legi = resolveSpellForm('Legilimens', serdChar);
  check('surcharge Legilimens (cancelChargesBonus)', legi && legi._synergy === true && legi.cancelChargesBonus === 1 && legi.noCostEscalation === true);
  // Non destructif : déséquiper (equipped vide) → forme de base par identité.
  const noArt = { spells: ['Incendio'], equipped: {} };
  check('déséquiper = base Incendio (identité)', resolveSpellForm('Incendio', noArt) === getSpellByName('Incendio'));
  check('déséquiper = base Legilimens (identité)', resolveSpellForm('Legilimens', noArt) === getSpellByName('Legilimens'));

  // Surcharge signature par Maison (les 4 couples du tableau §1.3).
  const SIG = {
    'Patronus Maxima':       'orbe_runique_premium_gryff',
    'Sectumsempra Imperius': 'masque_rituel_premium_slyth',
    'Legilimens':            'baton_ancestral_premium_serd',
    'Récolte Magique':       'talisman_fondateurs_premium_pouf',
  };
  for (const [spell, art] of Object.entries(SIG)) {
    const ch = { spells: [spell], equipped: { slotA: { id: art } } };
    const f = resolveSpellForm(spell, ch);
    check(`surcharge ${spell} active`, f && f._synergy === true && f.name === spell);
  }

  // spellSynergiesFor : ne liste que les sorts connus dont l'artefact est équipé.
  const synList = spellSynergiesFor(serdChar);
  check('spellSynergiesFor liste 2 couples (Incendio évol + Legilimens)', synList.length === 2);
  check('spellSynergiesFor évolution forme = Incendio Majeur',
    synList.some(s => s.spell === 'Incendio' && s.kind === 'evolution' && s.form === 'Incendio Majeur'));
  check('spellSynergiesFor override Legilimens',
    synList.some(s => s.spell === 'Legilimens' && s.kind === 'override' && s.house === 'Serdaigle'));
  check('spellSynergiesFor vide si rien équipé', spellSynergiesFor(noArt).length === 0);
  check('spellSynergiesFor ignore sort non connu',
    spellSynergiesFor({ spells: [], equipped: { w: { id: 'baton_ancestral_premium_serd', premiumOf: 'baton_ancestral' } } }).length === 0);

  // ── spellPmCostEstimate : croît avec tier ET rareté, pur ──
  check('pmEst(null) = 0', spellPmCostEstimate(null) === 0);
  check('pmEst power 0 défensif', spellPmCostEstimate({ effect: 'reveal', power: 0, tier: 'basique', rarity: 'common' }) === 0);
  const basc = { effect: 'burn', power: 14, tier: 'basique', rarity: 'common' };
  const mait = { effect: 'burn', power: 14, tier: 'maître', rarity: 'common' };
  check('pmEst croît avec le tier', spellPmCostEstimate(mait) > spellPmCostEstimate(basc));
  const rare = { effect: 'burn', power: 14, tier: 'basique', rarity: 'legendary' };
  check('pmEst croît avec la rareté', spellPmCostEstimate(rare) > spellPmCostEstimate(basc));
  // L'AoE renchérit vs single-target à power égal.
  check('pmEst AoE > single', spellPmCostEstimate({ effect: 'aoe_field', power: 12, tier: 'basique', rarity: 'common' }) >
    spellPmCostEstimate({ effect: 'burn', power: 12, tier: 'basique', rarity: 'common' }));
  check('SPELL_RARITY_COST_MULT legendary = 1.6', SPELL_RARITY_COST_MULT.legendary === 1.6);

  // ── Lot P2 — nouveaux sorts (Éclats / familiers / environnementaux) ──
  const P2_SPELLS = ['Resonare', 'Éclat de Voûte', 'Sceau des Quatre', 'Avis Praesidium',
                     'Patronus Corporel', 'Fontis', 'Purgo', 'Aedificium'];
  check('P2 : 8 sorts neufs présents + étiquetés',
    P2_SPELLS.every(n => getSpellByName(n) && SPELL_META[n]));
  check('P2 : sorts d\'Éclats gatés par requiresEclats',
    getSpellByName('Éclat de Voûte').requiresEclats === 2
    && getSpellByName('Sceau des Quatre').requiresEclats === 3);
  check('P2 : effects neufs câblés',
    getSpellByName('Éclat de Voûte').effect === 'eclat_bolt'
    && getSpellByName('Avis Praesidium').effect === 'summon_ally'
    && getSpellByName('Fontis').effect === 'recharge_fountain'
    && getSpellByName('Aedificium').effect === 'stabilize_rune');
  check('P2 : catégorie rituel posée (Resonare/Purgo/Aedificium)',
    ['Resonare', 'Purgo', 'Aedificium'].every(n => getSpellByName(n).category === 'rituel'));
  check('P2 : les 8 sorts P2 ne sont pas house-affine',
    P2_SPELLS.every(n => getSpellByName(n).houseAffinity === null));

  // ── houseSpellBoost (P2) — réduction de coût d'affinité, PURE & power-neutre ──
  const patMax = getSpellByName('Patronus Maxima');   // houseAffinity Gryffondor
  const incend = getSpellByName('Incendio');          // houseAffinity null
  check('houseSpellBoost : 0 si pas d\'affinité', houseSpellBoost(incend, 'Gryffondor', 18) === 0);
  check('houseSpellBoost : 0 si Maison ne correspond pas', houseSpellBoost(patMax, 'Serpentard', 18) === 0);
  check('houseSpellBoost : 15% base (affine, tier < 17)', approx(houseSpellBoost(patMax, 'Gryffondor', 5), 0.15));
  check('houseSpellBoost : 20% au palier Mythe (17)', approx(houseSpellBoost(patMax, 'Gryffondor', 17), 0.20));
  check('houseSpellBoost : 25% au palier Apothéose (18+)', approx(houseSpellBoost(patMax, 'Gryffondor', 25), 0.25));
  check('houseSpellBoost : monotone croissant avec le tier',
    houseSpellBoost(patMax, 'Gryffondor', 0) <= houseSpellBoost(patMax, 'Gryffondor', 17)
    && houseSpellBoost(patMax, 'Gryffondor', 17) <= houseSpellBoost(patMax, 'Gryffondor', 18));
  check('houseSpellBoost : gardes défensives (null spell / null house → 0)',
    houseSpellBoost(null, 'Gryffondor', 18) === 0
    && houseSpellBoost(patMax, null, 18) === 0);
  check('houseSpellBoost : tier non numérique → base 0.15 (affine)',
    approx(houseSpellBoost(patMax, 'Gryffondor'), 0.15));
})();

// ============================================================
// Sorts & Magie 2.0 — Lot P3 (data.js) : Premium signature + resolveSpellForm
//   évolutif (artefact / étage / quête). On charge data.js dans un sandbox vm
//   AVEC des globals mutables (currentFloor / completedQuests / houseTier /
//   chosenHouse) pour piloter les conditions d'évolution sans navigateur.
// ============================================================
(function testSpellP3() {
  const sandbox = {
    console, exports: {}, Math,
    currentFloor: 1, completedQuests: new Set(), houseTier: 0, chosenHouse: null,
  };
  const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src +
    '\n;exports.resolveSpellForm = resolveSpellForm;' +
    '\n;exports._spellEvolveConditionMet = _spellEvolveConditionMet;' +
    '\n;exports.getSpellByName = getSpellByName;' +
    '\n;exports.SPELLS = SPELLS;\n;exports.SPELL_META = SPELL_META;',
    sandbox, { filename: 'data.js' });
  const { resolveSpellForm, _spellEvolveConditionMet, getSpellByName, SPELLS, SPELL_META } = sandbox.exports;

  // ── 4 variantes Premium signature (§1.5) ──
  const PREM = ['Incendio Royal', "Morsure d'Émeraude", 'Givre de Rowena', 'Soin du Blaireau'];
  check('P3 : 4 Premium signature présents + étiquetés',
    PREM.every(n => getSpellByName(n) && SPELL_META[n]));
  check('P3 : Premium portent premium/premiumOf/premiumFx/houseAffinity',
    PREM.every(n => { const s = getSpellByName(n); return s.premium === true && !!s.premiumOf && !!s.premiumFx && !!s.houseAffinity; }));
  check('P3 : Incendio Royal = base ×1.20 (14→17)', getSpellByName('Incendio Royal').power === 17);
  check('P3 : une affinité Premium par Maison',
    new Set(PREM.map(n => getSpellByName(n).houseAffinity)).size === 4);
  check('P3 : house-affine total = 16 (4 Mythe + 4 Premium + 4 corruption + 4 légendaires)',
    SPELLS.filter(s => s.houseAffinity).length === 16);

  // ── resolveSpellForm — évolution artefact (PUR, char-based) ──
  const withStaff = { equipped: { wand: { id: 'baton_ancestral' } } };
  const noStaff   = { equipped: { wand: { id: 'wand1' } } };
  check('évol artefact : Incendio + Bâton ancestral → Incendio Majeur',
    resolveSpellForm('Incendio', withStaff).name === 'Incendio Majeur');
  check('évol artefact : sans Bâton → Incendio base',
    resolveSpellForm('Incendio', noStaff).name === 'Incendio');
  check('évol : sort sans evolveCondition → lui-même', resolveSpellForm('Protego', withStaff).name === 'Protego');
  check('évol : inconnu → null', resolveSpellForm('Inexistant', withStaff) === null);
  // Non destructif : aucune mutation du perso.
  const c = { spells: ['Incendio'], equipped: { wand: { id: 'baton_ancestral' } } };
  const snap = JSON.stringify(c);
  resolveSpellForm('Incendio', c);
  check('évol réversible : resolveSpellForm ne mute pas le perso', JSON.stringify(c) === snap);

  // ── évolution par étage (global mutable injecté) ──
  sandbox.currentFloor = 5;
  check('évol étage : Lumos Solem étage 5 → base', resolveSpellForm('Lumos Solem', {}).name === 'Lumos Solem');
  sandbox.currentFloor = 9;
  // La forme évoluée d'un sort MONO-CIBLE reste mono-cible (plus fort), JAMAIS
  // de bascule vers du multi-cible (régression : était Lux Aeterna / aoe_wave).
  const lumosEvo = resolveSpellForm('Lumos Solem', {});
  check('évol étage : Lumos Solem étage 9 → Lumos Solem Ardent', lumosEvo.name === 'Lumos Solem Ardent');
  check('évol Lumos Solem reste mono-cible (effect burn)', lumosEvo.effect === 'burn');
  // Symétrie : un sort de zone évolue vers une forme PLUS FORTE mais TOUJOURS de zone.
  // Déblocage PROGRESSIF, un sort par étage à partir de 14 (Glacius 14 … Lux 16).
  sandbox.currentFloor = 14;
  check('évol progressive : Glacius Tempête étage 14 → Glacius Cataclysme',
    resolveSpellForm('Glacius Tempête', {}).name === 'Glacius Cataclysme');
  check('évol progressive : Lux Aeterna étage 14 → base (pas encore débloqué)',
    resolveSpellForm('Lux Aeterna', {}).name === 'Lux Aeterna');
  sandbox.currentFloor = 16;
  const luxEvo = resolveSpellForm('Lux Aeterna', {});
  check('évol étage : Lux Aeterna étage 16 → Lux Suprema', luxEvo.name === 'Lux Suprema');
  check('évol Lux Aeterna reste de zone (effect aoe_wave)', luxEvo.effect === 'aoe_wave');
  check('évol AoE plus forte (power ↑)', luxEvo.power > getSpellByName('Lux Aeterna').power);

  // ── évolution par quête (Set mutable injecté) ──
  check('évol quête : Glacius sans quête → base', resolveSpellForm('Glacius', {}).name === 'Glacius');
  sandbox.completedQuests.add('manon_grimoire');
  check('évol quête : Glacius + manon_grimoire → Glacius Profond', resolveSpellForm('Glacius', {}).name === 'Glacius Profond');

  // ── évolution par Apothéose (houseTier global) ──
  check('cond apothéose : tier 0 → non remplie',
    _spellEvolveConditionMet({ type: 'apotheose', value: 'Gryffondor' }, {}) === false);
  sandbox.houseTier = 18; sandbox.chosenHouse = 'Gryffondor';
  check('cond apothéose : tier 18 + bonne Maison → remplie',
    _spellEvolveConditionMet({ type: 'apotheose', value: 'Gryffondor' }, {}) === true);
  check('cond apothéose : mauvaise Maison → non remplie',
    _spellEvolveConditionMet({ type: 'apotheose', value: 'Serpentard' }, {}) === false);
  // Corruption (P4) inerte tant que corruptionLevel n'existe pas.
  check('cond corruption (P4) inerte sans corruptionLevel',
    _spellEvolveConditionMet({ type: 'corruption', value: 2 }, {}) === false);
})();

// ============================================================
// Sorts & Magie 2.0 — Lot P4 (data.js) : corruption (helpers PURS), gate
//   Boucle, contrecoup configurable, évolution corruption (Sanguini Vorace),
//   nouveaux sorts (corrompus / temporels / légendaires). Sandbox vm avec
//   globals mutables (corruptionLevel) pour piloter l'évolution corruption.
// ============================================================
(function testSpellP4() {
  const sandbox = {
    console, exports: {}, Math,
    currentFloor: 1, completedQuests: new Set(), houseTier: 0, chosenHouse: null,
    spellCorruption: 0,
  };
  const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src +
    '\n;exports.corruptionSpellModifier = corruptionSpellModifier;' +
    '\n;exports.resolveCorruptionBacklash = resolveCorruptionBacklash;' +
    '\n;exports.corruptSpellGateOpen = corruptSpellGateOpen;' +
    '\n;exports.resolveSpellForm = resolveSpellForm;' +
    '\n;exports._spellEvolveConditionMet = _spellEvolveConditionMet;' +
    '\n;exports.getSpellByName = getSpellByName;' +
    '\n;exports.SPELLS = SPELLS;\n;exports.SPELL_META = SPELL_META;',
    sandbox, { filename: 'data.js' });
  const { corruptionSpellModifier, resolveCorruptionBacklash, corruptSpellGateOpen,
          resolveSpellForm, _spellEvolveConditionMet, getSpellByName, SPELLS, SPELL_META } = sandbox.exports;

  // ── corruptionSpellModifier : saturant, monotone, cap 0.40, défensif ──
  check('corruptionSpellModifier(0) = 0', corruptionSpellModifier(0) === 0);
  check('corruptionSpellModifier négatif/NaN → 0',
    corruptionSpellModifier(-3) === 0 && corruptionSpellModifier(NaN) === 0 && corruptionSpellModifier() === 0);
  check('corruptionSpellModifier(1) = 0.12', approx(corruptionSpellModifier(1), 0.12));
  check('corruptionSpellModifier monotone', corruptionSpellModifier(1) < corruptionSpellModifier(2));
  check('corruptionSpellModifier cap 0.40', corruptionSpellModifier(99) === 0.40);

  // ── resolveCorruptionBacklash : PUR, 3 types (❓5) ──
  const charStub = { hp: 50, hpMax: 100 };
  const bSelf = resolveCorruptionBacklash({ type: 'selfdmg', frac: 0.10 }, charStub);
  check('backlash selfdmg → hpLoss = 10 % PV max', bSelf.kind === 'selfdmg' && bSelf.hpLoss === 10);
  check('backlash selfdmg plancher 1', resolveCorruptionBacklash({ type: 'selfdmg', frac: 0 }, { hpMax: 100 }).hpLoss === 1);
  const bStat = resolveCorruptionBacklash({ type: 'status', statusId: 'bleed', power: 6, turns: 4 }, charStub);
  check('backlash status → statusId/power/turns', bStat.kind === 'status' && bStat.statusId === 'bleed' && bStat.statusPower === 6 && bStat.statusTurns === 4);
  const bCount = resolveCorruptionBacklash({ type: 'counter', amount: 2 }, charStub);
  check('backlash counter → corruptionInc', bCount.kind === 'counter' && bCount.corruptionInc === 2);
  check('backlash défaut (absent) → counter', resolveCorruptionBacklash(null, charStub).kind === 'counter');
  // Non destructif : ne mute pas le perso.
  const snap = JSON.stringify(charStub);
  resolveCorruptionBacklash({ type: 'selfdmg', frac: 0.5 }, charStub);
  check('resolveCorruptionBacklash ne mute pas le perso', JSON.stringify(charStub) === snap);

  // ── corruptSpellGateOpen : Boucle (victoire OU effFloor>=11) ──
  check('gate : victoire → ouvert', corruptSpellGateOpen(3, true, 3) === true);
  check('gate : pré-victoire étage 3 → fermé', corruptSpellGateOpen(3, false, 3) === false);
  check('gate : effFloor 11 → ouvert', corruptSpellGateOpen(21, false, 11) === true);
  check('gate : effFloor absent retombe sur floor', corruptSpellGateOpen(11, false) === true);

  // ── évolution corruption désormais ACTIVE (Sanguini → Sanguini Vorace) ──
  check('cond corruption : niveau 0 → non remplie',
    _spellEvolveConditionMet({ type: 'corruption', value: 2 }, {}) === false);
  sandbox.spellCorruption = 2;
  check('cond corruption : niveau 2 → remplie',
    _spellEvolveConditionMet({ type: 'corruption', value: 2 }, {}) === true);
  check('évol corruption : Sanguini niveau 2 → Sanguini Vorace',
    resolveSpellForm('Sanguini', {}).name === 'Sanguini Vorace');
  sandbox.spellCorruption = 0;
  check('évol corruption : Sanguini niveau 0 → base',
    resolveSpellForm('Sanguini', {}).name === 'Sanguini');

  // ── Nouveaux sorts P4 présents + étiquetés ──
  const P4_SPELLS = ['Flamme Dévorante', 'Venin du Cachot', 'Savoir Interdit', 'Fardeau Partagé',
    'Tempus Echo', 'Reliquae Temporis', 'Écho Fantôme', 'Cœur de Lion', 'Pacte du Serpent',
    'Verbe de Rowena', 'Serment du Blaireau', 'Le Mot du Dormeur', 'Sanguini Vorace', 'Protego Diabolica'];
  check('P4 : 14 sorts neufs présents + étiquetés',
    P4_SPELLS.every(n => getSpellByName(n) && SPELL_META[n]));
  check('P4 : corruption contrôlée porte corruptionRisk 0.10–0.20',
    ['Flamme Dévorante', 'Venin du Cachot', 'Savoir Interdit', 'Fardeau Partagé']
      .every(n => { const r = getSpellByName(n).corruptionRisk; return r >= 0.10 && r <= 0.20; }));
  check('P4 : Le Mot du Dormeur corruptionRisk 0.5', getSpellByName('Le Mot du Dormeur').corruptionRisk === 0.5);
  check('P4 : staminaCost réservé (Reliquae 12, Le Mot 15)',
    getSpellByName('Reliquae Temporis').staminaCost === 12 && getSpellByName('Le Mot du Dormeur').staminaCost === 15);
  check('P4 : effets neufs câblés',
    getSpellByName('Venin du Cachot').effect === 'venom_drain'
    && getSpellByName('Tempus Echo').effect === 'tempus_echo'
    && getSpellByName('Écho Fantôme').effect === 'echo_self'
    && getSpellByName('Cœur de Lion').effect === 'lion_heart');
  check('P4 : 4 corrompus contrôlés affines 1/Maison',
    getSpellByName('Flamme Dévorante').houseAffinity === 'Gryffondor'
    && getSpellByName('Venin du Cachot').houseAffinity === 'Serpentard'
    && getSpellByName('Savoir Interdit').houseAffinity === 'Serdaigle'
    && getSpellByName('Fardeau Partagé').houseAffinity === 'Poufsouffle');
  check('P4 : reports P3 réintégrés (Sanguini→Vorace, Protego→Diabolica)',
    getSpellByName('Sanguini').evolvesTo === 'Sanguini Vorace'
    && getSpellByName('Sanguini').evolveCondition.type === 'corruption'
    && getSpellByName('Protego').evolvesTo === 'Protego Diabolica'
    && getSpellByName('Protego').evolveCondition.type === 'apotheose');
  check('P4 : Protego Diabolica reflectFrac 0.2', getSpellByName('Protego Diabolica').reflectFrac === 0.20);
  // Le Mot du Dormeur réutilise le moteur AoE existant (pas de handler neuf).
  check('P4 : Le Mot du Dormeur réutilise aoe_wave', getSpellByName('Le Mot du Dormeur').effect === 'aoe_wave');
  // Couverture SPELL_META : chaque sort a une entrée curée.
  check('P4 : SPELL_META couvre toujours tous les sorts', SPELLS.every(s => !!SPELL_META[s.name]));
})();

// ============================================================
// N. P2 — Boss à phases (_abilityPhaseReady) + Tenaille (_duoComboMult)
// ============================================================
(function testCombatP2() {
  // _abilityPhaseReady : helper PUR de battle-spells.js (lit seulement ses args).
  const sp = loadModule('js/battle-spells.js', ['_abilityPhaseReady'], { window: {} });
  const { _abilityPhaseReady } = sp;
  const boss = { hp: 100, currentHp: 100 };
  check('phase : capacité sans flag → toujours prête',
    _abilityPhaseReady({ effect: 'damage' }, boss) === true);
  check('phase : gardée au-dessus du seuil (100 % PV)',
    _abilityPhaseReady({ phase: true, phaseHpFrac: 0.4 }, { hp: 100, currentHp: 100 }) === false);
  check('phase : débloquée sous le seuil (30 % PV)',
    _abilityPhaseReady({ phase: true, phaseHpFrac: 0.4 }, { hp: 100, currentHp: 30 }) === true);
  check('phase : seuil par défaut 0.5',
    _abilityPhaseReady({ phase: true }, { hp: 100, currentHp: 49 }) === true &&
    _abilityPhaseReady({ phase: true }, { hp: 100, currentHp: 51 }) === false);

  // _duoComboMult : helper de battle.js lisant partySize/duoPosture/duoComboMarks.
  // battle.js n'a aucun code top-level exécutable → chargeable avec globals injectés.
  function loadDuo(globals) {
    return loadModule('js/battle.js', ['_duoComboMult'], globals).
      _duoComboMult;
  }
  // Solo → jamais de bonus.
  check('tenaille : solo ignoré',
    loadDuo({ partySize: 1, duoPosture: 'tenaille', duoComboMarks: { 0: 1 } })(0, 0) === 1);
  // Duo Phalange → pas de combo.
  check('tenaille : posture phalange → 1',
    loadDuo({ partySize: 2, duoPosture: 'phalange', duoComboMarks: { 0: 1 } })(0, 0) === 1);
  // Duo Tenaille, cible non marquée → 1.
  check('tenaille : cible vierge → 1',
    loadDuo({ partySize: 2, duoPosture: 'tenaille', duoComboMarks: {} })(0, 0) === 1);
  // Duo Tenaille, cible marquée par l'AUTRE héros → 1.15.
  check('tenaille : cible marquée par l\'autre héros → 1.15',
    loadDuo({ partySize: 2, duoPosture: 'tenaille', duoComboMarks: { 0: 1 } })(0, 0) === 1.15);
  // Duo Tenaille, cible marquée par LE MÊME héros → 1 (pas d'auto-combo).
  check('tenaille : même héros → pas de combo',
    loadDuo({ partySize: 2, duoPosture: 'tenaille', duoComboMarks: { 0: 0 } })(0, 0) === 1);
})();

// ============================================================
// O. P4 — Environnement en combat (computeEnvModifiers, PUR)
// ============================================================
(function testCombatEnvP4() {
  const { getFloorTheme } = loadModule('js/floor-themes.js', ['getFloorTheme']);
  const { computeEnvModifiers } = loadModule(
    'js/floor-ambiance.js', ['computeEnvModifiers'], { getFloorTheme });

  // Zone D (étage 14+) → runique : +10 % feu/foudre.
  const z14 = computeEnvModifiers(14, false);
  check('env : zone D (14) → runique', z14.runic === true);
  check('env : zone D → +10 % feu', z14.spellElemBonus.feu === 0.10);
  check('env : zone D → +10 % foudre', z14.spellElemBonus.foudre === 0.10);
  check('env : zone D → pas de bonus glace', (z14.spellElemBonus.glace || 0) === 0);

  // Étages non runiques (pré-victoire) → neutre.
  check('env : étage 5 → non runique', computeEnvModifiers(5, false).runic === false);
  check('env : étage 13 (depths) → non runique', computeEnvModifiers(13, false).runic === false);
  check('env : non runique → spellElemBonus vide',
    Object.keys(computeEnvModifiers(5, false).spellElemBonus).length === 0);

  // Override post-victoire : étage 11+ avec victoryAchieved → runique.
  check('env : étage 11 post-victoire → runique', computeEnvModifiers(11, true).runic === true);
  check('env : étage 11 pré-victoire → non runique', computeEnvModifiers(11, false).runic === false);

  // Défensif : entrée invalide → repli sûr (étage 1, non runique).
  check('env : floor NaN → non runique', computeEnvModifiers(NaN, false).runic === false);
  check('env : floor undefined → non runique', computeEnvModifiers(undefined, false).runic === false);
})();

// ============================================================
// P. forge.js — Enchantement rerollable (Piste D, gold-sink)
// ============================================================
(function testEnchantReroll() {
  const { _enchantTotals, _rollEnchant, _enchantCost, ENCHANT_POOL, ENCHANT_KEYS } =
    loadModule('js/forge.js',
      ['_enchantTotals', '_rollEnchant', '_enchantCost', 'ENCHANT_POOL', 'ENCHANT_KEYS'],
      { window: {} });

  // Coût par rareté (or pur).
  check('enchant coût rare 500',      _enchantCost({ rarity: 'rare' }) === 500);
  check('enchant coût legendary 1500', _enchantCost({ rarity: 'legendary' }) === 1500);
  check('enchant coût défaut 500',    _enchantCost({}) === 500);

  // _rollEnchant : toujours une clé du pool + valeur > 0.
  let allValid = true, sawFrac = false;
  for (let i = 0; i < 400; i++) {
    const e = _rollEnchant({ rarity: 'common' });
    if (!ENCHANT_KEYS.includes(e.key) || !(e.value > 0) || !e.disp) allValid = false;
    if (e.key === 'bonusCritDamage') { sawFrac = true; if (!(e.value <= 0.3)) allValid = false; }
  }
  check('rollEnchant : clé du pool + valeur > 0 + disp', allValid);
  check('rollEnchant : bonusCritDamage en fraction', sawFrac);

  // Rareté : legendary (×1.5) ne descend jamais sous le min commun.
  let legOk = true;
  for (let i = 0; i < 200; i++) {
    const e = _rollEnchant({ rarity: 'legendary' });
    if (e.value <= 0) legOk = false;
  }
  check('rollEnchant legendary borné > 0', legOk);

  // _enchantTotals : agrège les affixes équipés sur les bonnes clés.
  const equipped = {
    wand:  { enchant: { key: 'bonusCritChance', value: 6 } },
    body:  { enchant: { key: 'bonusCritChance', value: 4 } },
    head:  { enchant: { key: 'bonusAtk', value: 2 } },
    ring1: { /* pas d'enchant */ },
    ring2: null,
  };
  const t = _enchantTotals(equipped);
  check('enchantTotals : cumul même clé', t.bonusCritChance === 10);
  check('enchantTotals : clé distincte', t.bonusAtk === 2);
  check('enchantTotals : clé absente = 0', t.bonusFortune === 0);
  check('enchantTotals : equipped null → tout 0',
    ENCHANT_KEYS.every(k => _enchantTotals(null)[k] === 0));
  // Clé hors-pool ignorée (garde anti-injection).
  check('enchantTotals : clé hors-pool ignorée',
    _enchantTotals({ x: { enchant: { key: 'bonusEvil', value: 99 } } }).bonusAtk === 0);
})();

// ============================================================
// N. floor-ambiance.js — thermomètre de corruption (P2.1)
// ============================================================
(function testCorruptionThermometer() {
  const { corruptionLevel, corruptionTier, corruptionThermometerHtml } = loadModule(
    'js/floor-ambiance.js',
    ['corruptionLevel', 'corruptionTier', 'corruptionThermometerHtml']);

  // Paliers : 0 (caché) en surface → 5 (saturé) au fond / Boucle.
  check('tier : étage 1 → 0',            corruptionTier(corruptionLevel(1, false)) === 0);
  check('tier : étage 2 → 0',            corruptionTier(corruptionLevel(2, false)) === 0);
  check('tier : étage 4 → ≥ 1',          corruptionTier(corruptionLevel(4, false)) >= 1);
  check('tier : étage 14 → 5',           corruptionTier(corruptionLevel(14, false)) === 5);
  check('tier : Boucle (1.3) → 5',       corruptionTier(1.3) === 5);
  // Bornes / entrées invalides.
  check('tier : négatif → 0',            corruptionTier(-1) === 0);
  check('tier : NaN → 0',                corruptionTier(NaN) === 0);
  check('tier : monotone non décroissant',
    [1,2,4,7,10,14].every((f, i, a) => i === 0 ||
      corruptionTier(corruptionLevel(f, false)) >= corruptionTier(corruptionLevel(a[i-1], false))));

  // HTML : vide au palier 0, sinon n flocons pleins + (5−n) ternes + libellé.
  check('html : palier 0 → vide',        corruptionThermometerHtml(0) === '');
  const h = corruptionThermometerHtml(0.6); // tier 3
  check('html : 3 flocons pleins',       (h.match(/❄/g) || []).length === 3);
  check('html : 2 flocons ternes',       (h.match(/·/g) || []).length === 2);
  check('html : libellé présent',        h.includes('Corruption tenace'));
})();

// ============================================================
// N. endgame.js — boussole d'endgame (P2.2)
// ============================================================
(function testEndgameCompass() {
  const { endgameDestinations } = loadModule(
    'js/endgame.js', ['endgameDestinations'],
    { window: {}, document: { getElementById: () => null }, addEventListener: () => {} });

  // Pré-victoire : tout verrouillé.
  const pre = endgameDestinations({ victoryAchieved: false });
  check('compass : 4 destinations', pre.length === 4);
  check('compass : pré-victoire tout verrouillé', pre.every(d => !d.unlocked));
  check('compass : chaque dest a id/label/trigger/hint',
    pre.every(d => d.id && d.label && d.trigger && typeof d.hint === 'string'));

  // Post-victoire frais (étage 11, 0 Éclat, tier 0) : Gardien ouvert, reste non.
  const fresh = endgameDestinations({ victoryAchieved: true, currentFloor: 11, accumulatedEclats: 0, houseTier: 0 });
  const byId = id => fresh.find(d => d.id === id);
  check('compass : Gardien ouvert post-victoire', byId('gardien_boucle').unlocked === true);
  check('compass : Chambres fermées avant ét.17', byId('chambres').unlocked === false);
  check('compass : Apothéose fermée tier<17',     byId('apotheose').unlocked === false);
  check('compass : Briser fermé < seuil',         byId('briser_cycle').unlocked === false);

  // Conditions remplies : Chambres ét.17, Apothéose tier 18, Briser 15 Éclats.
  const full = endgameDestinations({ victoryAchieved: true, currentFloor: 17, accumulatedEclats: 15, houseTier: 18, chosenHouse: 'Serpentard' });
  const f = id => full.find(d => d.id === id);
  check('compass : Chambres ouvertes ét.17',  f('chambres').unlocked === true);
  check('compass : libellé Chambre = Maison',  f('chambres').label.includes('Serpentard'));
  check('compass : Apothéose ouverte tier 18', f('apotheose').unlocked === true);
  check('compass : Briser ouvert à 15 Éclats', f('briser_cycle').unlocked === true);
  // Cycle déjà brisé → Briser re-verrouillé.
  check('compass : Briser fermé si cycleBroken',
    endgameDestinations({ victoryAchieved: true, accumulatedEclats: 20, cycleBroken: true })
      .find(d => d.id === 'briser_cycle').unlocked === false);
})();

// ============================================================
// Rapport
// ============================================================
if (failures.length) {
  console.error(`\n❌ UNITS — ${failures.length} échec(s) sur ${passed + failures.length} :`);
  failures.forEach(f => console.error('   • ' + f));
  process.exit(1);
}
console.log(`✅ UNITS — ${passed} assertions passées.`);
