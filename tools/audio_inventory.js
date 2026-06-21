#!/usr/bin/env node
// ============================================================
// AUDIO-INVENTORY (P2.6) — audit des samples audio livrés vs attendus.
// ------------------------------------------------------------
// Croise les chemins `audio/….ogg` RÉFÉRENCÉS par le code (registres
// _ZONE_SAMPLES / _COMBAT_SAMPLES / _MENU_SAMPLE / _VOICE_SAMPLES et tout
// autre littéral) avec les fichiers PRÉSENTS sous `audio/`, et produit :
//   - les samples référencés MANQUANTS (repli synthèse/404 au runtime) ;
//   - les fichiers ORPHELINS (présents mais jamais référencés) ;
//   - un récap par catégorie (ambient / combat / menu / voice).
//
// Node pur, zéro dépendance, hors runtime navigateur. Alimente P3.2
// (comblement des gaps audio).
//
// Usage :
//   node tools/audio_inventory.js            # résumé sur stdout
//   node tools/audio_inventory.js --write     # + écrit docs/audio-inventory.md
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const JS_DIR   = path.join(ROOT, 'js');
const AUDIO_DIR = path.join(ROOT, 'audio');
const WRITE    = process.argv.includes('--write');

// ── 1. Chemins audio référencés par le code ──────────────────
const AUDIO_REF_RE = /['"`](audio\/[A-Za-z0-9_\/-]+\.(?:ogg|mp3|wav))['"`]/g;
function collectReferenced() {
  const refs = new Map(); // path → Set(fichiers source)
  for (const f of fs.readdirSync(JS_DIR)) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
    let m;
    while ((m = AUDIO_REF_RE.exec(src)) !== null) {
      const p = m[1];
      if (!refs.has(p)) refs.set(p, new Set());
      refs.get(p).add(f);
    }
  }
  return refs;
}

// ── 2. Fichiers audio présents sur le disque ─────────────────
function collectPresent(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.posix.join(base, e.name);
    if (e.isDirectory()) out.push(...collectPresent(abs, rel));
    else if (/\.(ogg|mp3|wav)$/i.test(e.name)) out.push(rel);
  }
  return out;
}

function category(p) {
  if (p.startsWith('audio/voice/')) return 'voice';
  const base = p.slice('audio/'.length);
  if (base.startsWith('ambient_')) return 'ambient';
  if (base.startsWith('combat_'))  return 'combat';
  if (base.startsWith('menu_'))    return 'menu';
  return 'autre';
}

// ── 3. Analyse ───────────────────────────────────────────────
const referenced = collectReferenced();
const present    = new Set(collectPresent(AUDIO_DIR, 'audio'));
const refPaths   = new Set(referenced.keys());

const missing = [...refPaths].filter(p => !present.has(p)).sort();
const orphan  = [...present].filter(p => !refPaths.has(p)).sort();

const byCat = {};
for (const p of new Set([...refPaths, ...present])) {
  const c = category(p);
  byCat[c] = byCat[c] || { referenced: 0, present: 0, missing: 0 };
  if (refPaths.has(p)) byCat[c].referenced++;
  if (present.has(p))  byCat[c].present++;
  if (refPaths.has(p) && !present.has(p)) byCat[c].missing++;
}

// ── 4. Sortie ────────────────────────────────────────────────
function summaryLines() {
  const L = [];
  L.push('# Inventaire audio (P2.6)');
  L.push('');
  L.push('> Généré par `node tools/audio_inventory.js --write`. Croise les samples');
  L.push('> `audio/….ogg` référencés par `js/` avec les fichiers présents sous `audio/`.');
  L.push('> **SFX** (coups, sorts, UI) sont **100 % procéduraux** (`audio-sfx.js`) — pas');
  L.push('> de samples. Les **barks** héros passent par `speakBark` (synthèse vocale par');
  L.push('> défaut) ; un OGG n\'est lu que s\'il est enregistré dans `_VOICE_SAMPLES`.');
  L.push('');
  L.push('## Récap par catégorie');
  L.push('');
  L.push('| Catégorie | Référencés | Présents | Manquants |');
  L.push('|-----------|-----------:|---------:|----------:|');
  for (const c of Object.keys(byCat).sort()) {
    const x = byCat[c];
    L.push(`| ${c} | ${x.referenced} | ${x.present} | ${x.missing} |`);
  }
  L.push('');
  L.push(`**Total** : ${refPaths.size} référencés · ${present.size} présents · ` +
         `${missing.length} manquants · ${orphan.length} orphelins.`);
  L.push('');
  L.push('## Samples référencés MANQUANTS (repli synthèse / 404 au runtime)');
  L.push('');
  if (!missing.length) {
    L.push('_Aucun — tout sample référencé par le code est présent._');
  } else {
    L.push('| Sample manquant | Référencé dans |');
    L.push('|-----------------|----------------|');
    for (const p of missing) L.push(`| \`${p}\` | ${[...referenced.get(p)].join(', ')} |`);
  }
  L.push('');
  L.push('## Fichiers ORPHELINS (présents, jamais référencés)');
  L.push('');
  if (!orphan.length) {
    L.push('_Aucun — tout fichier présent est référencé._');
  } else {
    for (const p of orphan) L.push(`- \`${p}\``);
  }
  L.push('');
  L.push('## Gaps prioritaires pour P3.2');
  L.push('');
  L.push('- **Musique manquante** (catégories ambient/combat/menu ci-dessus) : repli');
  L.push('  procédural fonctionnel mais moins immersif — cibles d\'enregistrement n°1.');
  L.push('- **SFX** : aucun sample (choix de design procédural) — enregistrement');
  L.push('  optionnel si l\'on veut remplacer la synthèse des impacts/sorts.');
  L.push('- **Barks** : synthèse vocale par défaut ; enregistrer des OGG par héros×event');
  L.push('  serait un chantier lourd (faible priorité).');
  L.push('');
  return L;
}

const lines = summaryLines();
console.log(lines.join('\n'));

if (WRITE) {
  const out = path.join(ROOT, 'docs', 'audio-inventory.md');
  fs.writeFileSync(out, lines.join('\n'));
  console.log('\n→ écrit ' + path.relative(ROOT, out));
}

// Exit non-zéro si un sample de MUSIQUE (pas voice) est manquant — garde-fou
// utile en CI si on veut bloquer un retrait accidentel de sample musical.
const musicMissing = missing.filter(p => category(p) !== 'voice');
if (process.argv.includes('--strict') && musicMissing.length) {
  console.error(`\n❌ ${musicMissing.length} sample(s) de musique manquant(s).`);
  process.exit(1);
}
