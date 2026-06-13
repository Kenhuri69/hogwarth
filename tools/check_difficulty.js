#!/usr/bin/env node
// ============================================================
// Garde-fou d'équilibre de difficulté (Chapitre 13 §13.9.C/F).
//
// Problème évité : une modification du scaling / des stats / des formules de
// combat change silencieusement la courbe de difficulté sans que personne ne
// régénère DIFFICULTY_REPORT.md — la doc d'équilibrage devient une dette.
//
// Principe (analogue à tools/check_cache_versions.js) :
//   La BASELINE committée = le tableau « ## 3. Résultats Monte Carlo » de
//   DIFFICULTY_REPORT.md (source de vérité unique, pas de JSON parallèle qui
//   dériverait — cf. §13.9.A.1). Le script régénère un résumé win-rate via
//   tools/sim-difficulty.js et compare étage par étage.
//
// Deux modes (strictness dépendante de --base, comme check_cache_versions) :
//   1. AVEC --base <ref> (PR) :
//      si un couple (étage, mode) dérive de > SEUIL pts ET que
//      DIFFICULTY_REPORT.md n'a PAS été modifié depuis <ref> → exit 1.
//      Si le rapport est modifié → pass (changement d'équilibre assumé et
//      documenté ; un rappel invite à régénérer la baseline via
//      --update-baseline).
//   2. SANS --base (push master / inspection locale) :
//      advisory — affiche la dérive éventuelle mais exit 0 (post-merge : pas
//      de base pour vérifier l'état de la doc).
//
//   --update-baseline : régénère la sim et réécrit la table §3 du rapport.
//
// Bruit Monte-Carlo : à N=800, l'erreur-type de la différence de deux
// win-rates ≈ 2.5 pts → P(|Δ| > 10 pts) négligeable. Le seuil 10 pts absorbe
// le bruit ; seules les vraies dérives d'équilibrage le franchissent.
//
// Usage :
//   node tools/check_difficulty.js                       # advisory (exit 0)
//   node tools/check_difficulty.js --base origin/master  # strict (exit 1 si dérive non documentée)
//   node tools/check_difficulty.js --update-baseline      # régénère la table §3 du rapport
//   node tools/check_difficulty.js --sims 800             # N de simulations (def 800)
//
// Zéro dépendance (Node pur), cohérent avec la philosophie du projet.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'DIFFICULTY_REPORT.md');
const SIM = path.join(__dirname, 'sim-difficulty.js');
const SECTION_HEADING = '## 3. Résultats Monte Carlo';
const DRIFT_THRESHOLD = 10;          // pts de win-rate
// Mêmes flags que l'en-tête de DIFFICULTY_REPORT.md (régénération canonique).
const SIM_FLAGS = ['--difficulty=Normal', '--build=balanced'];

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : null;
const updateBaseline = args.includes('--update-baseline');
const simsIdx = args.indexOf('--sims');
const nSims = simsIdx >= 0 ? parseInt(args[simsIdx + 1], 10) || 800 : 800;

// ── Parsing de la table §3 « Résultats Monte Carlo » ─────────
// Lignes : `| 1 | Solo | 1 | 100% | 2.1 | 100% | 0.0 |`
// Colonnes : Étage | Mode | Niv. | Win % | …
// Retourne Map<"floor-Mode", winRateNumber>.
function parseMonteCarlo(text) {
  const map = new Map();
  const start = text.indexOf(SECTION_HEADING);
  if (start < 0) return map;
  const lines = text.slice(start).split('\n');
  for (const line of lines.slice(1)) {
    const t = line.trim();
    if (t.startsWith('##')) break;            // section suivante
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').map(s => s.trim()).filter(s => s.length);
    if (cells.length < 4) continue;
    const floor = parseInt(cells[0], 10);
    const mode = cells[1];
    const winRaw = cells[3];
    if (isNaN(floor) || (mode !== 'Solo' && mode !== 'Duo')) continue;
    const win = parseFloat(winRaw.replace('%', ''));
    if (isNaN(win)) continue;
    map.set(`${floor}-${mode}`, win);
  }
  return map;
}

function read(rel) { return fs.readFileSync(rel, 'utf8'); }

function runSim() {
  const out = cp.execFileSync('node', [SIM, ...SIM_FLAGS, String(nSims)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  return out;
}

// Remplace la table §3 du rapport par celle d'une sortie de sim fraîche.
function rewriteBaseline(simOut) {
  const reportText = read(REPORT);
  const start = reportText.indexOf(SECTION_HEADING);
  if (start < 0) {
    console.error(`❌ Section « ${SECTION_HEADING} » introuvable dans DIFFICULTY_REPORT.md.`);
    process.exit(1);
  }
  // Borne de fin : prochaine ligne commençant par "## " après le heading.
  const after = reportText.slice(start + SECTION_HEADING.length);
  const nextIdx = after.search(/\n## /);
  const end = nextIdx < 0 ? reportText.length : start + SECTION_HEADING.length + nextIdx;

  // Extrait la section §3 de la sortie de sim (heading → prochain "## ").
  const sStart = simOut.indexOf(SECTION_HEADING);
  if (sStart < 0) {
    console.error('❌ La sortie de sim ne contient pas la section §3 attendue.');
    process.exit(1);
  }
  const sAfter = simOut.slice(sStart + SECTION_HEADING.length);
  const sNext = sAfter.search(/\n## /);
  const simSection = SECTION_HEADING + (sNext < 0 ? sAfter : sAfter.slice(0, sNext));

  const newReport = reportText.slice(0, start) + simSection.trimEnd() + '\n\n' + reportText.slice(end).replace(/^\n+/, '');
  fs.writeFileSync(REPORT, newReport);
  console.log(`✅ Baseline régénérée : table « ${SECTION_HEADING} » de DIFFICULTY_REPORT.md mise à jour (N=${nSims}).`);
}

function git(cmd) {
  return cp.execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
}
function reportChangedSince(ref) {
  try {
    const changed = git(`diff --name-only ${ref}...HEAD`).split('\n').map(s => s.trim());
    return changed.includes('DIFFICULTY_REPORT.md');
  } catch (e) {
    console.log(`(info) diff git indisponible (${e.message.split('\n')[0]}) — escape doc non vérifiable.`);
    return false;
  }
}

// ── Exécution ────────────────────────────────────────────────
if (updateBaseline) {
  rewriteBaseline(runSim());
  process.exit(0);
}

const baseline = parseMonteCarlo(read(REPORT));
if (baseline.size === 0) {
  console.error(`❌ Impossible de parser la baseline (§3) dans DIFFICULTY_REPORT.md.`);
  process.exit(1);
}

console.log(`Régénération du résumé win-rate via sim-difficulty.js (N=${nSims})…`);
const current = parseMonteCarlo(runSim());
if (current.size === 0) {
  console.error('❌ Impossible de parser la sortie de sim-difficulty.js (§3).');
  process.exit(1);
}

const drifts = [];
for (const [key, baseWin] of baseline) {
  if (!current.has(key)) continue;            // étage absent (flags différents) → ignoré
  const curWin = current.get(key);
  const delta = curWin - baseWin;
  if (Math.abs(delta) > DRIFT_THRESHOLD) {
    drifts.push({ key, baseWin, curWin, delta });
  }
}

if (drifts.length === 0) {
  console.log(`✅ Équilibre stable : aucun étage ne dérive de plus de ${DRIFT_THRESHOLD} pts vs la baseline (DIFFICULTY_REPORT.md §3).`);
  process.exit(0);
}

// Dérive détectée.
console.log(`\n⚠️ Dérive de win-rate détectée (> ${DRIFT_THRESHOLD} pts vs DIFFICULTY_REPORT.md §3) :`);
for (const d of drifts) {
  const sign = d.delta > 0 ? '+' : '';
  console.log(`  • Étage ${d.key} : ${d.baseWin}% (baseline) → ${d.curWin}% (sim) [${sign}${d.delta.toFixed(0)} pts]`);
}

if (!base) {
  // Mode advisory (push master / local) : on ne bloque pas.
  console.log('\n(info) Mode advisory (pas de --base) — non bloquant.');
  console.log('Si ce changement d\'équilibre est intentionnel : régénère la baseline');
  console.log('(`node tools/check_difficulty.js --update-baseline`) et amende le Chapitre 13.');
  process.exit(0);
}

// Mode strict (PR) : pass uniquement si le rapport a été mis à jour.
if (reportChangedSince(base)) {
  console.log('\n✅ Dérive tolérée : DIFFICULTY_REPORT.md a été modifié depuis la base (changement d\'équilibre documenté).');
  console.log('Rappel : régénère la baseline §3 (`--update-baseline`) pour que master reste vert.');
  process.exit(0);
}

console.error('\n❌ Dérive d\'équilibre NON documentée : un ou plusieurs étages bougent de');
console.error(`   plus de ${DRIFT_THRESHOLD} pts sans mise à jour de DIFFICULTY_REPORT.md.`);
console.error('\nSi le changement est intentionnel :');
console.error('  1. régénère la baseline : node tools/check_difficulty.js --update-baseline');
console.error('  2. amende le Chapitre 13 (docs/histoire/13-...) et G8 si un comportement observable change.');
console.error('Si la dérive est involontaire, corrige la régression d\'équilibrage.');
process.exit(1);
