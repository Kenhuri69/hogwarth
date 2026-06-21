#!/usr/bin/env node
// ============================================================
// SIM-AOE — Rendement dégâts/mana : sorts mono-cible vs AoE
// ------------------------------------------------------------
// Reproduit les formules de dégâts de battle-spells.js pour
// comparer, à 1/2/3 cibles, le rendement (dégâts par PM) des
// sorts mono-cible et des 5 sorts de zone, sur plusieurs
// profils de joueur.
//
// Métrique : dégâts totaux délivrés au groupe ennemi en UN
// lancer, divisés par le coût en PM. Un sort mono ne touche
// qu'une cible — son rendement est donc plat (identique à
// 1/2/3 cibles) ; un sort AoE monte avec le nombre de cibles.
//
// Hypothèses : pas d'overkill (les ennemis encaissent tout),
// pas de resist/weak (ennemi neutre). Le crit de sort
// (spellCritChance, ×1,5) est intégré en espérance pour les
// sorts mono ; les AoE ne crittent pas (choix du jeu).
//
// Usage : node tools/sim-aoe.js
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Chargement de SPELLS depuis js/data-spells.js (Lot A P3.3) ──
function loadSpells() {
  const root = path.join(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'js/data-spells.js'), 'utf8');
  const sandbox = { exports: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src + '\n;exports.SPELLS = SPELLS;', sandbox, { filename: 'data-spells.js' });
  return sandbox.exports.SPELLS;
}

const SPELLS = loadSpells();
const byName = (n) => SPELLS.find(s => s.name === n);

// ── Profils de joueur ────────────────────────────────────────
// mag = stat commune ; int/agi/end/str = stats thématiques AoE.
const PROFILES = [
  { label: 'Apprenti (niv ~3)',   mag: 14, int: 12, agi: 13, end: 11, str: 11 },
  { label: 'Initié (niv ~7)',     mag: 22, int: 19, agi: 18, end: 16, str: 15 },
  { label: 'Archimage (niv ~14)', mag: 38, int: 30, agi: 28, end: 25, str: 24 },
  { label: 'Brute MAG (sec. négligées)', mag: 38, int: 14, agi: 14, end: 13, str: 13 },
];

// ── Formules (miroir de battle-spells.js) ────────────────────
const fl = Math.floor;

// Mono : power + mag/2, puis crit en espérance.
function monoDamage(spell, p) {
  const raw = spell.power + fl(p.mag / 2);
  const critChance = Math.min(35, 5 + p.agi * 0.4);   // spellCritChance
  const critMult = 1.5;                                // spellCritMultiplier
  return raw * (1 + (critChance / 100) * (critMult - 1));
}

// AoE : power + mag/magDiv + stat2/stat2Div (défaut 3/3).
function aoeBase(spell, p) {
  const magDiv = spell.magDiv || 3;
  const stat2Div = spell.stat2Div || 3;
  const s2 = spell.stat2 ? fl((p[spell.stat2] || 0) / stat2Div) : 0;
  return spell.power + fl(p.mag / magDiv) + s2;
}

// Dégâts totaux délivrés au groupe en un lancer, selon le mode.
function aoeTotal(spell, p, n) {
  const base = aoeBase(spell, p);
  switch (spell.effect) {
    case 'aoe_wave':  // Lux Aeterna — égal à tous
      return base * n;
    case 'aoe_field': {  // Glacius Tempête — égal à tous + DoT gel
      const dotPower = Math.max(1, fl(spell.power * 0.25));
      const dotTurns = Math.min(5, 2 + fl((p.int || 0) / 24));
      return (base + dotPower * dotTurns) * n;
    }
    case 'aoe_chain': {  // Fulgur Catena — ×0,65 par saut
      let mult = 1, total = 0;
      for (let i = 0; i < n; i++) { total += Math.max(1, fl(base * mult)); mult *= 0.65; }
      return total;
    }
    case 'aoe_drain':  // Nox Vorax — égal à tous (le soin est à part)
      return base * n;
    case 'aoe_cleave': {  // Diffindo Maxima — cible + jusqu'à 2 voisins ×0,6
      let total = base;
      const neigh = Math.min(2, n - 1);
      for (let i = 0; i < neigh; i++) total += Math.max(1, fl(base * 0.6));
      return total;
    }
    default: return base * n;
  }
}

// Mono total délivré au groupe en un lancer : 1 cible, sauf
// Bombarda (splash sur les voisins).
function monoTotal(spell, p, n) {
  const d = monoDamage(spell, p);
  if (spell.splash) {
    const splash = Math.max(1, fl(spell.power / 2 + p.mag / 8 + p.str / 4));
    return d + splash * (n - 1);
  }
  return d;
}

// ── Sélection des sorts comparés ─────────────────────────────
const MONO = ['Incendio', 'Diffindo', 'Crucio', 'Sectumsempra', 'Morsmordre',
              'Bombarda', 'Avada...'].map(byName);
const AOE = ['Glacius Tempête', 'Fulgur Catena', 'Lux Aeterna',
             'Nox Vorax', 'Diffindo Maxima'].map(byName);

// ── Rendu ────────────────────────────────────────────────────
const pad = (s, w) => String(s).padEnd(w);
const padL = (s, w) => String(s).padStart(w);
const r1 = (x) => x.toFixed(1);

function renderProfile(p) {
  console.log(`\n### ${p.label}`);
  console.log(`MAG ${p.mag} · INT ${p.int} · AGI ${p.agi} · END ${p.end} · STR ${p.str}\n`);
  console.log('| Sort | Type | PM | dmg/PM ×1 | dmg/PM ×2 | dmg/PM ×3 | total ×3 |');
  console.log('|------|------|----|-----------|-----------|-----------|----------|');

  const row = (spell, type, totalFn) => {
    const t = [1, 2, 3].map(n => totalFn(spell, p, n));
    const ratio = t.map(x => x / spell.cost);
    console.log(`| ${pad(spell.name, 16)} | ${type} | ${padL(spell.cost, 2)} `
      + `| ${padL(r1(ratio[0]), 9)} | ${padL(r1(ratio[1]), 9)} `
      + `| ${padL(r1(ratio[2]), 9)} | ${padL(r1(t[2]), 8)} |`);
  };

  MONO.forEach(s => row(s, 'mono', monoTotal));
  AOE.forEach(s => row(s, 'AoE ', aoeTotal));
}

console.log('# Simulation — rendement dégâts/PM : mono-cible vs AoE');
console.log('\n*dmg/PM ×N = dégâts totaux délivrés au groupe en un lancer, '
  + 'face à N ennemis, divisés par le coût PM.*');
console.log('*Les sorts mono ne touchent qu\'une cible → rendement plat '
  + '(Bombarda excepté : éclaboussure). Crit de sort intégré en espérance '
  + 'pour les monos ; les AoE ne crittent pas.*');

PROFILES.forEach(renderProfile);

// ── Synthèse : seuil de bascule mono → AoE ───────────────────
console.log('\n## Notes');
console.log('- **Riders non chiffrés ci-dessus** : Glacius Tempête inclut le');
console.log('  DoT gel dans ses totaux ; Nox Vorax soigne le lanceur de la');
console.log('  moitié des dégâts (non compté comme dégâts) ; Lux Aeterna fait');
console.log('  ×1,5 contre les morts-vivants (non compté).');
console.log('- Un sort mono reste imbattable en burst sur **1 cible** ; les');
console.log('  AoE le dépassent dès **2-3 cibles**. Le point de bascule par');
console.log('  profil est lisible sur les colonnes ×1 → ×3.');
