#!/usr/bin/env node
// ============================================================
// check_content_refs.js — garde-fou d'intégrité du contenu
// ------------------------------------------------------------
// Vérifie que TOUTES les références croisées entre les registres de
// données du jeu pointent sur quelque chose qui existe :
//
//   drops de monstres      → ITEMS
//   quêtes                 → MONSTERS / ITEMS / SPELLS / POTION_RECIPES
//   PNJ (questsGiven /
//        questsTurnedIn)   → QUEST_TEMPLATES
//   items (grantsSpell)    → SPELLS
//   livres de sorts        → SPELLS
//   recettes (resultItemId
//        + ingredients)    → ITEMS
//   monstres (imgSrc)      → fichier PNG sur le disque
//   registres d'icônes     → fichier PNG sur le disque (+ orphelins)
//
// Rien de tout cela n'est couvert par la suite smoke : une référence
// cassée (item supprimé, id renommé) passerait toute la CI et ne se
// verrait qu'en jeu, sur un drop qui ne tombe jamais ou une quête
// incomplétable.
//
// Usage :
//   node tools/check_content_refs.js            # exit 1 si référence cassée
//   node tools/check_content_refs.js --verbose  # + détail des avertissements
//
// Sortie :
//   ERREUR        → référence pendante = exit 1 (bloquant en CI)
//   AVERTISSEMENT → asset manquant pour une entrée par ailleurs saine
//                   (icône à produire) = informatif, exit 0
//
// Parsing : lecture statique des fichiers `js/` par expressions
// régulières — pas d'évaluation, cohérent avec les autres garde-fous
// (check_doc_modules.js) et sans dépendance.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readAll = (rels) => rels.map(read).join('\n');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ── Helpers de parsing ──────────────────────────────────────
// Les registres mélangent guillemets simples et doubles selon les
// fichiers : toutes les regex acceptent les deux.
const Q = '[\'"]';

// PIÈGE N°2 — le motif d'identifiant. `[a-z0-9_]+` paraît décrire la
// convention snake_case du projet… mais un id RÉEL y échappe :
// `niffleurs_trésor` (quête). Un id non capturé n'est pas « invalide » :
// il est INVISIBLE — ni déclaré, ni vérifié. Le garde-fou laissait donc
// passer une référence cassée vers cette quête, en silence. Vérifié en
// cassant volontairement la référence : exit 0.
// D'où `\p{L}` (toute lettre Unicode) et le flag `u`.
const ID = '[\\p{L}\\p{N}_-]+';

// PIÈGE À ÉVITER — une valeur quotée ne se capture PAS avec `["']([^"']+)["']` :
// tout nom contenant l'autre quote (`"Morsure d'Émeraude"`) est tronqué au
// premier caractère quote rencontré, et le nom tronqué ne correspond alors à
// aucune entrée de registre. On croit à un registre incomplet alors que la
// faute est dans la regex. `QSTR` capture une chaîne quotée complète, quel que
// soit le délimiteur, échappements compris.
//   groupe 1 = délimiteur (backréférence interne), groupe 2 = contenu
const QSTR = String.raw`(['"])((?:\\.|(?!\1)[^\\])*)\1`;
/** Valeurs de chaînes quotées capturées par une regex bâtie sur QSTR (groupe 2). */
function qrefs(src, pattern, flags) {
  return [...src.matchAll(new RegExp(pattern, flags || 'g'))].map((m) => m[2].replace(/\\(.)/g, '$1'));
}

/** Valeurs capturées par une regex globale, dans l'ordre. */
function refs(src, re) {
  return [...src.matchAll(re)].map((m) => m[1]);
}
/** Ensemble d'ids déclarés. */
function ids(src, re) {
  return new Set(refs(src, re));
}
/** Corps d'un littéral objet `const NAME = { … };` au top-level. */
function objectBody(src, name) {
  const m = src.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`));
  return m ? m[1] : null;
}

// ── 1) Registres déclarés ───────────────────────────────────
const monsterSrc = readAll(['js/monsters-low.js', 'js/monsters-mid.js', 'js/monsters-high.js']);
const itemSrc = read('js/data-items.js');
const spellSrc = read('js/data-spells.js');
const questSrc = read('js/quests-templates.js');
const npcSrc = readAll(['js/npcs-a.js', 'js/npcs-b.js']);
const iconSrc = read('js/item-icons.js');

const monsterIds = ids(monsterSrc, new RegExp(`^\\s*id: *${Q}(${ID})${Q}`, 'gmu'));
const itemIds = ids(itemSrc, new RegExp(`^\\s*\\{ *id: *${Q}(${ID})${Q}`, 'gmu'));
const spellNames = new Set(qrefs(spellSrc, String.raw`^\s*\{ *name: *` + QSTR, 'gm'));
const questIds = ids(questSrc, new RegExp(`^\\s*id: *${Q}(${ID})${Q}`, 'gmu'));
const recipeIds = ids(itemSrc, new RegExp(`^\\s*\\{ *id: *${Q}(brew_${ID})${Q}`, 'gmu'));

// Les recettes vivent dans POTION_RECIPES, pas dans ITEMS : on les
// retire du référentiel d'items pour ne pas masquer une vraie erreur.
for (const r of recipeIds) itemIds.delete(r);

const counts = {
  monstres: monsterIds.size,
  items: itemIds.size,
  sorts: spellNames.size,
  quêtes: questIds.size,
  recettes: recipeIds.size,
};

// ── 2) Références croisées ──────────────────────────────────
function checkRefs(label, list, known, hint) {
  const bad = [...new Set(list)].filter((r) => !known.has(r));
  if (bad.length) err(`${label} → ${hint} inconnu(s) : ${bad.join(', ')}`);
  return list.length;
}

let checked = 0;

// drops de monstres → ITEMS
checked += checkRefs('Drops de monstres', refs(monsterSrc, new RegExp(`itemId: *${Q}(${ID})${Q}`, 'gu')), itemIds, 'itemId');

// quêtes → MONSTERS / ITEMS / SPELLS / RECIPES
checked += checkRefs('Quêtes (objectif)', refs(questSrc, new RegExp(`monsterId: *${Q}(${ID})${Q}`, 'gu')), monsterIds, 'monsterId');
checked += checkRefs('Quêtes (objectif/récompense)', refs(questSrc, new RegExp(`itemId: *${Q}(${ID})${Q}`, 'gu')), itemIds, 'itemId');
checked += checkRefs('Quêtes (récompense item)', refs(questSrc, new RegExp(`\\bitem: *${Q}(${ID})${Q}`, 'gu')), itemIds, 'item');
checked += checkRefs('Quêtes (set de Maison)', refs(questSrc, new RegExp(`houseSetReward: *${Q}(${ID})${Q}`, 'gu')), itemIds, 'item');
checked += checkRefs('Quêtes (récompense sort)', qrefs(questSrc, String.raw`\bspell: *` + QSTR), spellNames, 'sort');
checked += checkRefs('Quêtes (récompense recette)', refs(questSrc, new RegExp(`recipes: *\\[([^\\]]*)\\]`, 'g')).flatMap((b) => refs(b, new RegExp(`${Q}(brew_${ID})${Q}`, 'gu'))), recipeIds, 'recette');

// PNJ → quêtes
for (const field of ['questsGiven', 'questsTurnedIn']) {
  const list = refs(npcSrc, new RegExp(`${field}: *\\[([^\\]]*)\\]`, 'g'))
    .flatMap((b) => refs(b, new RegExp(`${Q}(${ID})${Q}`, 'gu')));
  checked += checkRefs(`PNJ (${field})`, list, questIds, 'questId');
}

// items → sorts
checked += checkRefs('Items (grantsSpell)', qrefs(itemSrc, String.raw`grantsSpell: *` + QSTR), spellNames, 'sort');
checked += checkRefs('Livres de sorts', qrefs(itemSrc, String.raw`^\s*\{ *id:[^\n]*\bspell: *` + QSTR, 'gm'), spellNames, 'sort');

// recettes → items (résultat + ingrédients)
const recipeBlock = itemSrc.slice(itemSrc.indexOf('const POTION_RECIPES'));
checked += checkRefs('Recettes (resultItemId)', refs(recipeBlock, new RegExp(`resultItemId: *${Q}(${ID})${Q}`, 'gu')), itemIds, 'itemId');
checked += checkRefs(
  'Recettes (ingrédients)',
  refs(recipeBlock, /ingredients: *\{([^}]*)\}/g).flatMap((b) => refs(b, new RegExp(`(${ID}) *:`, 'gu'))),
  itemIds,
  'itemId'
);

// ── 3) Assets : sprites de monstres ─────────────────────────
const monsterImgs = qrefs(monsterSrc, String.raw`imgSrc: *` + QSTR);
const missingSprites = monsterImgs.filter((p) => !exists(p));
if (missingSprites.length) err(`Sprites de monstres introuvables : ${missingSprites.join(', ')}`);
checked += monsterImgs.length;

// ── 4) Assets : registres d'icônes ──────────────────────────
// Les clés de registre sont soit des identifiants nus (`potion_s:`), soit
// des chaînes quotées pouvant contenir espaces et apostrophes échappées
// (`'Morsure d\'Émeraude':`). Le piège est là : une regex qui interdit
// l'espace tronque silencieusement tout nom composé et fait croire à un
// registre incomplet.
function registryEntries(name) {
  const body = objectBody(iconSrc, name);
  if (body === null) {
    err(`Registre ${name} introuvable dans js/item-icons.js`);
    return [];
  }
  const re = /^[ \t]*(?:(['"])((?:\\.|(?!\1)[^\\])*)\1|([A-Za-z0-9_$]+))\s*:\s*(['"])((?:\\.|(?!\4)[^\\])*)\4/gm;
  const out = [];
  for (const m of body.matchAll(re)) {
    const key = (m[2] !== undefined ? m[2] : m[3]).replace(/\\(.)/g, '$1');
    out.push([key, m[5].replace(/\\(.)/g, '$1')]);
  }
  return out;
}

const SPELL_REG = registryEntries('SPELL_ICON_REGISTRY');
const ITEM_NEW = registryEntries('ITEM_ICON_NEW_REGISTRY');
const ITEM_OLD = registryEntries('ITEM_ICON_REGISTRY');

// 4a) Toute entrée de registre doit pointer un fichier existant — bloquant :
//     c'est une image cassée en jeu, pas un contenu à produire.
for (const [regName, entries] of [
  ['SPELL_ICON_REGISTRY', SPELL_REG],
  ['ITEM_ICON_NEW_REGISTRY', ITEM_NEW],
  ['ITEM_ICON_REGISTRY', ITEM_OLD],
]) {
  const bad = entries.filter(([, p]) => !exists(p));
  if (bad.length) err(`${regName} → fichier(s) absent(s) : ${bad.map(([k, p]) => `${k} (${p})`).join(', ')}`);
  checked += entries.length;
}

// 4b) PNG de sorts jamais référencé = asset produit et perdu — bloquant,
//     car c'est un oubli de câblage (le cas « Morsure d'Émeraude »).
const SPELL_DIR = 'img/icons/spells';
if (exists(SPELL_DIR)) {
  const used = new Set(SPELL_REG.map(([, p]) => path.basename(p)));
  const orphans = fs.readdirSync(path.join(ROOT, SPELL_DIR)).filter((f) => f.endsWith('.png') && !used.has(f));
  if (orphans.length) {
    err(`PNG de sorts sur le disque mais absents de SPELL_ICON_REGISTRY : ${orphans.join(', ')}`);
  }
}

// 4c) Couverture d'icônes = avertissement (asset à produire, pas une
//     référence cassée) — mais jamais silencieux.
const spellKeys = new Set(SPELL_REG.map(([k]) => k));
const spellsNoIcon = [...spellNames].filter((n) => !spellKeys.has(n));
if (spellsNoIcon.length) warn(`${spellsNoIcon.length} sort(s) sans icône (emoji de repli) : ${spellsNoIcon.join(', ')}`);

// `getItemIconHtml` résout dans l'ordre : SVG inline → PNG painterly →
// PNG legacy → emoji. Les trois premiers comptent comme « a une icône » —
// oublier le registre SVG (herbes, potions) ferait passer pour dépourvus
// une trentaine d'items parfaitement illustrés.
const svgBody = objectBody(iconSrc, 'ITEM_ICON_SVG_REGISTRY') || '';
const svgKeys = refs(svgBody, /^\s*([A-Za-z0-9_$]+)\s*:/gm);
const itemKeys = new Set([...ITEM_NEW.map(([k]) => k), ...ITEM_OLD.map(([k]) => k), ...svgKeys]);
const itemsNoIcon = [...itemIds].filter((i) => !itemKeys.has(i));
if (itemsNoIcon.length) warn(`${itemsNoIcon.length} item(s) sans icône (emoji de repli) : ${itemsNoIcon.join(', ')}`);

// ── 5) Rapport ──────────────────────────────────────────────
const verbose = process.argv.includes('--verbose');

console.log(
  'Registres : ' +
    Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ')
);
console.log(`Références vérifiées : ${checked}`);

if (warnings.length) {
  console.log('');
  for (const w of warnings) {
    console.log('⚠️  ' + (verbose ? w : w.replace(/ : .*$/, ' — détail avec --verbose')));
  }
}

if (errors.length) {
  console.error('');
  for (const e of errors) console.error('❌ ' + e);
  console.error(`\n❌ ${errors.length} référence(s) de contenu cassée(s).`);
  process.exit(1);
}

console.log('\n✅ Intégrité du contenu vérifiée — aucune référence pendante.');
