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
  check('13 héros : 4 événements de base couverts', allHaveBase);
  check('registre = 13 héros', Object.keys(HERO_BARKS).length === 13);

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
    '\n;exports.weightedPick = weightedPick;', sandbox, { filename: 'dungeon-scaling.js' });
  const { effectiveFloor, endgameTierIndex, weightedPick } = sandbox.exports;

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
// sont injectés en innerHTML. Chaque module de visite possède son `_esc`
// privé ; on l'extrait de la source et on vérifie qu'il neutralise les
// caractères dangereux (verrou anti-régression XSS / défense en profondeur).
// ============================================================
(function testEscapers() {
  const ESC_FILES = [
    'js/portal-matchmaking.js',
    'js/atelier-voyageur.js',
    'js/visit-hud.js',
  ];
  // Charge utile typique d'injection via un nom de joueur malveillant.
  const evil = '<img src=x onerror="alert(1)"> & "Bob" <b>';

  for (const rel of ESC_FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const m = src.match(/function _esc\(s\)\s*\{[\s\S]*?\n {2}\}/);
    check(`${rel}: _esc présent`, !!m);
    if (!m) continue;
    // eslint-disable-next-line no-eval — code maison extrait de la source du jeu.
    const _esc = eval('(' + m[0] + ')');
    const out = _esc(evil);
    check(`${rel}: échappe <`, !out.includes('<'));
    check(`${rel}: échappe >`, !out.includes('>'));
    check(`${rel}: échappe " (attribut)`, !out.includes('"'));
    check(`${rel}: & encodé`, out.includes('&amp;'));
    check(`${rel}: pas de balise img résiduelle`, !/<img/i.test(out));
    // Garde-fous d'entrée : null/undefined → chaîne vide, pas d'exception.
    check(`${rel}: _esc(null)=''`,      _esc(null) === '');
    check(`${rel}: _esc(undefined)=''`, _esc(undefined) === '');
  }
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
    ['ZONE_AMBIANCE', 'getFloorAmbiance', 'corruptionLevel', 'HOUSE_AMBIANCE_MOD', 'houseAmbianceLine'],
    { FLOOR_THEMES, getFloorTheme });

  const { ZONE_AMBIANCE, getFloorAmbiance, corruptionLevel, HOUSE_AMBIANCE_MOD, houseAmbianceLine } = mod;

  // ── getFloorAmbiance : bonne zone aux frontières ──
  check('ambiance étage 1 → hogwarts',   getFloorAmbiance(1)  === ZONE_AMBIANCE.hogwarts);
  check('ambiance étage 3 → hogwarts',   getFloorAmbiance(3)  === ZONE_AMBIANCE.hogwarts);
  check('ambiance étage 4 → dungeons',   getFloorAmbiance(4)  === ZONE_AMBIANCE.dungeons);
  check('ambiance étage 6 → dungeons',   getFloorAmbiance(6)  === ZONE_AMBIANCE.dungeons);
  check('ambiance étage 7 → depths',     getFloorAmbiance(7)  === ZONE_AMBIANCE.depths);
  check('ambiance étage 13 → depths',    getFloorAmbiance(13) === ZONE_AMBIANCE.depths);
  check('ambiance étage 14 → ancient',   getFloorAmbiance(14) === ZONE_AMBIANCE.ancient);
  check('ambiance étage 99 → ancient',   getFloorAmbiance(99) === ZONE_AMBIANCE.ancient);

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
  const lines = ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].map(houseAmbianceLine);
  check('4 lignes de Maison non vides', lines.every(l => l && l.length > 0));
  const unique = new Set(lines);
  check('4 lignes de Maison distinctes', unique.size === 4);
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
