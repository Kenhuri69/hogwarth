#!/usr/bin/env node
// ============================================================
// SÉLECTION DE TESTS PAR CHANGEMENT
// ============================================================
// Détermine les fichiers modifiés (git) et ne lance que les scénarios
// smoke pertinents via le filtre de tests/smoke.js + tests/test-map.js.
//
// Usage :
//   node tests/select.js            # diff de travail + commits vs master
//   node tests/select.js master     # diff explicite contre une base
//   node tests/select.js --dry-run  # affiche la sélection sans lancer
//
// Repli conservateur : un fichier js/ non cartographié ou un fichier
// "noyau" (state/data/loader/main/index.html) → suite COMPLÈTE.
// Cf. .claude/plans/game-review-modularization.md §5.
// ============================================================

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const { TEST_MAP, FULL_SUITE_TRIGGERS, PWA_TRIGGERS, BASELINE } = require('./test-map.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseRef = args.find(a => !a.startsWith('-'));

function git(cmd) {
  try {
    return execSync('git ' + cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) {
    return '';
  }
}

// ── Collecte des fichiers modifiés ───────────────────────────
function changedFiles() {
  const set = new Set();
  const add = out => out.split('\n').map(s => s.trim()).filter(Boolean).forEach(f => set.add(f));
  add(git('diff --name-only'));          // non indexés
  add(git('diff --name-only --cached')); // indexés
  add(git('ls-files --others --exclude-standard')); // nouveaux fichiers non suivis
  // Commits de la branche vs une base (explicite, sinon origin/master ou master).
  let base = baseRef;
  if (!base) {
    if (git('rev-parse --verify origin/master')) base = 'origin/master';
    else if (git('rev-parse --verify master')) base = 'master';
  }
  if (base) {
    const mb = git(`merge-base ${base} HEAD`) || base;
    add(git(`diff --name-only ${mb}...HEAD`));
  }
  return [...set];
}

const files = changedFiles();
if (!files.length) {
  console.log('ℹ️  Aucun fichier modifié détecté → exécution de la suite complète par sécurité.');
  runSmoke([]);
  process.exit(0);
}

// ── Classification ───────────────────────────────────────────
let runFull = false;
let runPwa = false;
const patterns = new Set();
const unmapped = [];
const reasons = [];

for (const f of files) {
  if (FULL_SUITE_TRIGGERS.includes(f)) { runFull = true; reasons.push(`${f} → noyau (suite complète)`); }
  if (PWA_TRIGGERS.includes(f)) { runPwa = true; reasons.push(`${f} → PWA`); }
  if (TEST_MAP[f]) {
    TEST_MAP[f].forEach(p => patterns.add(p));
    reasons.push(`${f} → [${TEST_MAP[f].join(', ')}]`);
  } else if (f.startsWith('js/') && f.endsWith('.js') && !FULL_SUITE_TRIGGERS.includes(f)) {
    unmapped.push(f);
  }
  // Autres (css/, img/, audio/, tools/, tests/, *.md) : non déclencheurs.
}

if (unmapped.length) {
  runFull = true;
  reasons.push(`fichier(s) js/ non cartographié(s) → suite complète : ${unmapped.join(', ')}`);
  reasons.push('   (pense à étendre tests/test-map.js pour cibler à l\'avenir)');
}

// ── Rapport ──────────────────────────────────────────────────
console.log('── Fichiers modifiés ──');
files.forEach(f => console.log('  • ' + f));
console.log('\n── Raisonnement ──');
reasons.forEach(r => console.log('  ' + r));

if (runFull) {
  console.log('\n➡️  Décision : SUITE COMPLÈTE (smoke.js sans filtre).');
} else if (patterns.size) {
  BASELINE.forEach(b => patterns.add(b));
  console.log(`\n➡️  Décision : sous-ensemble filtré → [${[...patterns].join(', ')}]`);
} else {
  console.log('\n➡️  Décision : aucun fichier fonctionnel touché → baseline seule (sanity).');
}

if (dryRun) { console.log('\n(--dry-run : rien n\'est exécuté.)'); process.exit(0); }

// ── Exécution ────────────────────────────────────────────────
const filterArgs = runFull ? [] : (patterns.size ? [...patterns] : BASELINE.slice());
const smokeCode = runSmoke(filterArgs);
let pwaCode = 0;
if (runPwa) {
  console.log('\n── Tests PWA (pwa-smoke.js) ──');
  pwaCode = spawnSync('node', [path.join(__dirname, 'pwa-smoke.js')], { stdio: 'inherit' }).status || 0;
}
process.exit(smokeCode || pwaCode);

function runSmoke(filters) {
  const argv = [path.join(__dirname, 'smoke.js'), ...filters];
  console.log(`\n$ node tests/smoke.js ${filters.join(' ')}`.trim());
  return spawnSync('node', argv, { stdio: 'inherit' }).status || 0;
}
