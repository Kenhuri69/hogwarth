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
     'FOUNDER_CHAMBERS', 'getFounderChamberBeat'],
    { FLOOR_THEMES, getFloorTheme });

  const { ZONE_AMBIANCE, getFloorAmbiance, corruptionLevel, HOUSE_AMBIANCE_MOD, houseAmbianceLine,
          temporalEchoActive, temporalEchoTier, echoLine, FOUNDER_VOICES, TEMPORAL_ECHOES,
          FOUNDER_CHAMBERS, getFounderChamberBeat } = mod;

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
  const CATS = ['glossaire', 'bestiaire', 'lieux', 'personnages', 'histoire', 'eclats', 'objets'];
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

  // ── Défensif : ctx incomplet ne throw jamais ──
  let noThrow = true;
  try { codexEntryState(cle, {}); codexEntryState(cle, { floorReached: 1 }); unlockedCodexFor({}); }
  catch (e) { noThrow = false; }
  check('codex helpers tolèrent un ctx incomplet', noThrow);
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
// Rapport
// ============================================================
if (failures.length) {
  console.error(`\n❌ UNITS — ${failures.length} échec(s) sur ${passed + failures.length} :`);
  failures.forEach(f => console.error('   • ' + f));
  process.exit(1);
}
console.log(`✅ UNITS — ${passed} assertions passées.`);
