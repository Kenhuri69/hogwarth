#!/usr/bin/env node
// ============================================================
// check_doc_modules.js — garde-fou anti-dérive doc ↔ index.html
// ------------------------------------------------------------
// Vérifie que la section « Structure des fichiers » de CLAUDE.md
// (arborescence js/) liste EXACTEMENT les modules <script src> de
// index.html, DANS LE MÊME ORDRE de chargement.
//
// Usage :
//   node tools/check_doc_modules.js          # vérifie, exit 1 si dérive
//   node tools/check_doc_modules.js --print   # imprime l'ordre canonique
//
// Raison d'être : CLAUDE.md est la mémoire projet ; sa dérive provoque de
// mauvaises décisions (humaines et IA). Tourne en CI.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const CLAUDE = path.join(ROOT, 'CLAUDE.md');

// 1) Modules <script src="js/xxx.js?v=N"> dans index.html, ordonnés.
function indexModules() {
  const html = fs.readFileSync(INDEX, 'utf8');
  // `[^>]*` tolère les attributs intermédiaires (ex. `defer`) entre <script et src=.
  const re = /<script\b[^>]*\bsrc="js\/([A-Za-z0-9_-]+)\.js(?:\?[^"]*)?"/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

// 2) Modules listés dans l'arborescence js/ de CLAUDE.md.
//    On lit le PREMIER bloc ``` qui suit le titre « ## Structure des fichiers »
//    et on en extrait les lignes « <indent>nom.js → … ».
function docModules() {
  const md = fs.readFileSync(CLAUDE, 'utf8');
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## Structure des fichiers'));
  if (start === -1) throw new Error('Section « ## Structure des fichiers » introuvable dans CLAUDE.md');
  let i = start;
  while (i < lines.length && lines[i].trim() !== '```') i++; // ouverture du bloc
  i++;
  const out = [];
  for (; i < lines.length && lines[i].trim() !== '```'; i++) {
    const m = /^\s+([A-Za-z0-9_-]+)\.js\s+→/.exec(lines[i]);
    if (m) out.push(m[1]);
  }
  return out;
}

function main() {
  const idx = indexModules();
  if (process.argv.includes('--print')) {
    console.log(idx.join(' → '));
    return;
  }
  const doc = docModules();
  const errors = [];

  const idxSet = new Set(idx);
  const docSet = new Set(doc);
  for (const name of idx) if (!docSet.has(name)) errors.push(`Module « ${name}.js » présent dans index.html mais ABSENT de la section doc.`);
  for (const name of doc) if (!idxSet.has(name)) errors.push(`Module « ${name}.js » documenté mais ABSENT de index.html.`);

  // Ordre : seulement si les ensembles coïncident (sinon le diff d'ordre est bruité).
  if (errors.length === 0) {
    for (let k = 0; k < idx.length; k++) {
      if (idx[k] !== doc[k]) {
        errors.push(`Ordre divergent à la position ${k + 1} : index.html=« ${idx[k]} » vs doc=« ${doc[k]} ».`);
        break;
      }
    }
  }

  if (errors.length) {
    console.error('✗ Dérive CLAUDE.md ↔ index.html :');
    for (const e of errors) console.error('  - ' + e);
    console.error(`\nidx=${idx.length} modules, doc=${doc.length} modules.`);
    console.error('Régénérer l\'ordre canonique : node tools/check_doc_modules.js --print');
    process.exit(1);
  }
  console.log(`✓ CLAUDE.md ↔ index.html alignés (${idx.length} modules, même ordre).`);
}

main();
