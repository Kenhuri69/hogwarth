#!/usr/bin/env node
// ============================================================
// Garde-fou de versionnement du cache PWA.
//
// Problème évité : modifier un CSS/JS sans bumper son ?v=N → le Service
// Worker (Cache-First par ?v, cf. sw.js) sert l'ancien cache à la même URL,
// et les joueurs ne voient jamais la mise à jour.
//
// Deux contrôles :
//   1. COHÉRENCE (toujours, base-indépendant — sûr en CI) :
//      tout asset js/*.js|css/*.css référencé À LA FOIS dans index.html et
//      dans PRECACHE_URLS de sw.js doit y porter le MÊME ?v.
//   2. BUMP (si une base de diff est fournie) :
//      tout asset js/*.js|css/*.css modifié depuis la base doit avoir son
//      ?v incrémenté dans index.html ET dans sw.js, et CACHE_VERSION doit
//      avoir changé.
//
// Usage :
//   node tools/check_cache_versions.js                 # cohérence seule (CI)
//   node tools/check_cache_versions.js --base <ref>    # + bump vs <ref> (ex. origin/master)
//   node tools/check_cache_versions.js --working       # + bump des changements non commités vs HEAD
//
// Exit 0 = OK, 1 = violation (message explicite).
// Zéro dépendance (Node pur), cohérent avec la philosophie du projet.
// ============================================================
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ASSET_RE = /(?:\.\/)?((?:js|css)\/[\w.-]+\.(?:js|css))\?v=(\d+)/g;
const CACHE_VERSION_RE = /CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/;

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// path → version (number). Dernière occurrence gagne (suffisant ici).
function parseVersions(text) {
  const map = new Map();
  let m;
  ASSET_RE.lastIndex = 0;
  while ((m = ASSET_RE.exec(text)) !== null) map.set(m[1], Number(m[2]));
  return map;
}

function git(args) {
  return cp.execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' });
}
function gitShow(ref, rel) {
  try { return cp.execSync(`git show ${ref}:${rel}`, { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { return null; } // fichier inexistant à la base (nouveau fichier)
}

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : null;
const working = args.includes('--working');

const errors = [];
const notes = [];

const indexNew = read('index.html');
const swNew = read('sw.js');
const idxVers = parseVersions(indexNew);
const swVers = parseVersions(swNew);

// ── 1. Cohérence index.html ↔ sw.js (PRECACHE) ──────────────
for (const [p, v] of idxVers) {
  if (swVers.has(p) && swVers.get(p) !== v) {
    errors.push(`Incohérence ?v : ${p} = v${v} dans index.html mais v${swVers.get(p)} dans sw.js (PRECACHE_URLS).`);
  }
}
// Assets dans index.html absents du précache : info (choix possible : modules
// optionnels non précachés). Non bloquant.
for (const p of idxVers.keys()) {
  if (!swVers.has(p)) notes.push(`(info) ${p} référencé dans index.html mais absent de PRECACHE_URLS (non précaché — OK si voulu).`);
}

// ── 2. Bump des assets modifiés (si base ou --working) ───────
function checkBump(ref) {
  let changed;
  try {
    changed = working
      ? git(`diff --name-only HEAD`).split('\n')
      : git(`diff --name-only ${ref}...HEAD`).split('\n');
  } catch (e) {
    notes.push(`(info) diff git indisponible (${e.message.split('\n')[0]}) — contrôle de bump sauté.`);
    return;
  }
  const assets = changed
    .map(s => s.trim())
    .filter(f => /^(js|css)\/[\w.-]+\.(js|css)$/.test(f));

  if (assets.length === 0) {
    notes.push('(info) aucun asset js/css modifié — pas de bump requis.');
    return;
  }

  const idxOld = working ? gitShow('HEAD', 'index.html') : gitShow(ref, 'index.html');
  const swOld  = working ? gitShow('HEAD', 'sw.js')      : gitShow(ref, 'sw.js');
  const idxOldV = idxOld ? parseVersions(idxOld) : new Map();
  const swOldV  = swOld  ? parseVersions(swOld)  : new Map();

  for (const a of assets) {
    const before = idxOldV.has(a) ? idxOldV.get(a) : null;
    const after  = idxVers.has(a) ? idxVers.get(a) : null;
    if (after === null) {
      errors.push(`${a} modifié mais introuvable dans index.html avec un ?v=N.`);
      continue;
    }
    if (before !== null && after <= before) {
      errors.push(`${a} modifié mais son ?v n'a pas été incrémenté dans index.html (v${before} → v${after}).`);
    }
    // sw.js precache : si l'asset y figure, il doit aussi être bumpé.
    const swBefore = swOldV.has(a) ? swOldV.get(a) : null;
    const swAfter  = swVers.has(a) ? swVers.get(a) : null;
    if (swAfter !== null && swBefore !== null && swAfter <= swBefore) {
      errors.push(`${a} modifié mais son ?v n'a pas été incrémenté dans sw.js/PRECACHE_URLS (v${swBefore} → v${swAfter}).`);
    }
  }

  // CACHE_VERSION doit changer dès qu'un asset change.
  const cvOldText = working ? gitShow('HEAD', 'sw.js') : gitShow(ref, 'sw.js');
  const cvOld = cvOldText && CACHE_VERSION_RE.exec(cvOldText)?.[1];
  const cvNew = CACHE_VERSION_RE.exec(swNew)?.[1];
  if (cvOld && cvNew && cvOld === cvNew) {
    errors.push(`Des assets ont changé mais CACHE_VERSION est resté '${cvNew}' dans sw.js — incrémente-le.`);
  }
}

if (base) checkBump(base);
else if (working) checkBump(null);

// ── Rapport ─────────────────────────────────────────────────
for (const n of notes) console.log(n);
if (errors.length) {
  console.error('\n❌ Versionnement du cache PWA — violations :');
  for (const e of errors) console.error('  • ' + e);
  console.error('\nRappel : tout CSS/JS modifié doit voir son ?v=N bumpé dans index.html ET');
  console.error('PRECACHE_URLS (sw.js), + CACHE_VERSION incrémenté. Voir le skill « cache-bump ».');
  process.exit(1);
}
console.log('✅ Versionnement du cache PWA cohérent' + (base || working ? ' + bump des assets modifiés OK.' : '.'));
