#!/usr/bin/env node
// ============================================================
// SIM-ECONOMY — Étude de l'économie d'or
// ------------------------------------------------------------
// Reproduit les formules d'or ACTUELLES de Hogwarth (dungeon-scaling.js,
// movement-interactions.js, shop.js, state.js, monsters.js, quests) pour
// mesurer, étage par étage :
//   1. les revenus d'or (drops, coffres, fouille, quêtes) ;
//   2. l'accessibilité des items (combats pour s'offrir l'item top) ;
//   3. les puits d'or endgame (don à la Maison → ★ N, élixirs à prix
//      progressif) et la saturation des sinks après l'étage 10.
//
// Pendant la version exécutable de l'audit
// `.claude/plans/game-economy-gold-audit.md` (qui était purement statique).
//
// Usage : node tools/sim-economy.js [options]
//   --difficulty=NAME   Facile|Normal|Difficile|Expert (def Normal) — pilote goldMultiplier
//   --max-floor=N       Étage max analysé (def 20)
//   --combats=N         Combats par étage (def 4)
//   --searches=N        Fouilles par étage (def 3)
//   --chests=F          Coffres par étage (def 1)
//   -h | --help
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Chargement des données du jeu ────────────────────────────
function loadGameData() {
  const root = path.join(__dirname, '..');
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const sandbox = { console, exports: {},
    window: {}, document: { getElementById: () => null },
    setTimeout: () => 0, clearTimeout: () => {} };
  vm.createContext(sandbox);
  vm.runInContext(read('js/monsters.js') + '\n;exports.MONSTERS = MONSTERS;', sandbox, { filename: 'monsters.js' });
  vm.runInContext(read('js/data.js') +
    '\n;exports.ITEMS = ITEMS;\n;exports.LEVEL_UP_XP_MULTIPLIER = LEVEL_UP_XP_MULTIPLIER;', sandbox, { filename: 'data.js' });
  vm.runInContext(read('js/quests-templates.js') + '\n;exports.QUEST_TEMPLATES = QUEST_TEMPLATES;', sandbox, { filename: 'quests-templates.js' });
  vm.runInContext(read('js/shop.js') + '\n;exports.SHOP_CATALOG = SHOP_CATALOG;', sandbox, { filename: 'shop.js' });
  return sandbox.exports;
}
const { MONSTERS, ITEMS, QUEST_TEMPLATES, SHOP_CATALOG } = loadGameData();
const itemById = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// ── Constantes miroir ────────────────────────────────────────
// state.js — DIFFICULTY_SETTINGS (goldMultiplier + enemyGroupMultiplier).
const DIFFICULTY_SETTINGS = {
  Facile:    { enemyGroupMultiplier: 0.65, goldMultiplier: 1.6  },
  Normal:    { enemyGroupMultiplier: 1.0,  goldMultiplier: 1.0  },
  Difficile: { enemyGroupMultiplier: 1.35, goldMultiplier: 0.75 },
  Expert:    { enemyGroupMultiplier: 1.65, goldMultiplier: 0.55 },
};
// dungeon-scaling.js — ENDGAME_SCALING (récursion par palier de 10 étages).
const ENDGAME_SCALING = { baseFix: { gold: 80 }, scalDelta: 0.5 };
// house-donation.js — 5 G = 1 point de Maison.
const DONATION_GOLD_PER_POINT = 5;
// data.js — Fortune (D5 LCK) : fortune = asympt·x²/(x²+half²), x = LCK party.
// En jeu, l'or de combat/coffre/fouille est ×(1+Fortune×0.5) (poids ½ pour
// l'éco). Modélisé ici à partir d'une LCK party représentative.
const FORTUNE_ASYMPTOTE = 0.31;
const FORTUNE_HALF = 30;
function fortuneFromLck(lck) {
  const x = Math.max(0, lck || 0);
  return FORTUNE_ASYMPTOTE * (x * x) / (x * x + FORTUNE_HALF * FORTUNE_HALF);
}
// main.js — seuil de la série Apothéose ★ N : 45000 + 15000·N + 1000·N².
function starThreshold(n) { return 45000 + 15000 * n + 1000 * n * n; }

// ── CLI ──────────────────────────────────────────────────────
function parseArgs(argv) {
  // lck défaut = max LCK de base du groupe (Harry 15 / Hermione 12) → 15.
  const out = { difficulty: 'Normal', maxFloor: 20, combats: 4, searches: 3, chests: 1,
                lck: 15, fortune: true, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { out.help = true; continue; }
    if (a === '--no-fortune')         { out.fortune = false; continue; }
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'difficulty' || k === 'diff') {
      const canon = Object.keys(DIFFICULTY_SETTINGS).find(d => d.toLowerCase() === String(v).toLowerCase());
      out.difficulty = canon || 'Normal';
    } else if (k === 'max-floor') out.maxFloor = parseInt(v, 10) || 20;
    else if (k === 'combats')     out.combats  = parseInt(v, 10) || 4;
    else if (k === 'searches')    out.searches = parseInt(v, 10) || 3;
    else if (k === 'chests')      out.chests   = parseFloat(v)   || 1;
    else if (k === 'lck')         out.lck      = parseInt(v, 10) || 0;
  }
  return out;
}
const ARGS = parseArgs(process.argv);
if (ARGS.help) {
  console.log(`Usage: node tools/sim-economy.js [options]
  --difficulty=NAME   Facile|Normal|Difficile|Expert (def Normal)
  --max-floor=N       Étage max analysé (def 20)
  --combats=N         Combats par étage (def 4)
  --searches=N        Fouilles par étage (def 3)
  --chests=F          Coffres par étage (def 1)
  --lck=N             LCK party pour la Fortune (def 15 = max LCK de base)
  --no-fortune        Désactive le bonus d'or de Fortune (comparaison)`);
  process.exit(0);
}
const DIFF = DIFFICULTY_SETTINGS[ARGS.difficulty];
// Bonus d'or de Fortune (D5 LCK) : or ×(1+F×0.5) sur drops/coffres/fouille.
const FORTUNE = ARGS.fortune ? fortuneFromLck(ARGS.lck) : 0;
const GOLD_FORTUNE_MULT = 1 + FORTUNE * 0.5;

// ── Scaling d'or (miroir de dungeon-scaling.js — scaleMonster, clé 'gold') ──
function effectiveFloor(f) { return f >= 11 ? f - 10 : f; }
function endgameTier(f)    { return f >= 11 ? Math.floor((f - 1) / 10) : 0; }
function scaledGold(rawBase, scale, floor) {
  const ef = effectiveFloor(floor);
  const n  = endgameTier(floor);
  const intraMult = 1 + (ef - 1) * (scale || 0.25);
  let stat = rawBase * intraMult;
  if (n > 0) {
    const scal = 1 + ENDGAME_SCALING.scalDelta / intraMult;
    const fixEff = ENDGAME_SCALING.baseFix.gold / intraMult;
    for (let i = 0; i < n; i++) stat = stat * scal + fixEff;
  }
  return stat;
}

// ── Pool éligible + taille de groupe moyenne ─────────────────
function eligiblePool(floor) {
  const ef = effectiveFloor(floor);
  const p = MONSTERS.filter(m => m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor));
  return p.length ? p : MONSTERS;
}
// Or de drop moyen d'un ennemi à l'étage f (pondéré weight, × goldMultiplier).
function avgEnemyGold(floor) {
  const pool = eligiblePool(floor);
  const totalW = pool.reduce((s, m) => s + (m.weight || 1), 0);
  const avg = pool.reduce((s, m) => {
    const base = (typeof m.gold === 'object') ? (m.gold.min + m.gold.max) / 2 : (m.gold || 0);
    const g = Math.floor(scaledGold(base, m.scale || 0.25, floor) * DIFF.goldMultiplier);
    return s + (m.weight || 1) * g;
  }, 0) / totalW;
  return avg;
}
// Taille de groupe moyenne (miroir simplifié de battle.js — rollGroupSize,
// politique baseline + enemyGroupMultiplier de difficulté).
function avgGroupSize(floor, partySize) {
  const m = DIFF.enemyGroupMultiplier;
  let p1, p2, p3 = 0;
  if (partySize === 1) {
    if (floor <= 2)      { p1 = 1.0; p2 = 0; }
    else if (floor <= 4) { p1 = Math.max(0.10, 0.70 / m); p2 = 1 - p1; }
    else                 { p1 = Math.max(0.10, 0.50 / m); p2 = 1 - p1; }
  } else {
    if (floor <= 2)      { p1 = Math.max(0.15, 0.65 / m); p2 = 1 - p1; }
    else if (floor <= 6) { p1 = Math.max(0.10, 0.35 / m); p2 = 1 - p1; }
    else {
      const t1 = Math.max(0.05, 0.20 / m);
      const t2 = Math.min(0.95, t1 + 0.35 * m);
      p1 = t1; p2 = t2 - t1; p3 = 1 - t2;
    }
  }
  return p1 * 1 + p2 * 2 + p3 * 3;
}

// ── Coffre / fouille (miroir de movement-interactions.js) ────
// Coffre standard : floor(rand*30+10) × floor, PUIS _applyGoldMult.
// (Anomalie §4.A de l'audit CORRIGÉE : le goldMultiplier s'applique désormais.)
function avgChestGold(floor) { return 24.5 * floor * DIFF.goldMultiplier; }
// Fouille : floor((rand*15+5) × (1+(floor-1)*0.20)). Scalée par étage
// (proposition §5.2 de l'audit IMPLÉMENTÉE). Pas de goldMultiplier.
function avgSearchGold(floor) { return 12 * (1 + (floor - 1) * 0.20); }

// ── Quêtes : or cumulé rendu avant l'étage F ─────────────────
// Étage de complétion déduit de l'objectif (floor cible, ou minFloor du
// monstre kill, sinon défaut médian).
function deriveQuestFloor(tpl) {
  const objs = tpl.objectives || [];
  let f = 0;
  for (const o of objs) {
    if (o.type === 'floor' && o.floor) f = Math.max(f, o.floor);
    else if (o.type === 'kill' && o.monsterId) {
      const mon = MONSTERS.find(mm => mm.id === o.monsterId);
      if (mon) f = Math.max(f, mon.minFloor);
    }
  }
  return f || 3; // défaut : quête item/divers rendue tôt-mid
}
function questGoldUpToFloor(floor) {
  let total = 0;
  for (const tpl of QUEST_TEMPLATES) {
    if (deriveQuestFloor(tpl) > floor) continue;
    if (tpl.reward && tpl.reward.gold) total += tpl.reward.gold;
  }
  return total;
}

// ── Revenu d'or par étage ────────────────────────────────────
function floorIncome(floor, partySize) {
  // Or de combat/coffre/fouille ×(1+Fortune×0.5) — miroir runtime (drops/or
  // gagnés via la Fortune dérivée de la LCK). Les quêtes (récompenses fixes)
  // ne sont pas Fortune-scalées.
  const perCombat = avgEnemyGold(floor) * avgGroupSize(floor, partySize) * GOLD_FORTUNE_MULT;
  const drops   = perCombat * ARGS.combats;
  const chests  = avgChestGold(floor) * ARGS.chests * GOLD_FORTUNE_MULT;
  const search  = avgSearchGold(floor) * ARGS.searches * GOLD_FORTUNE_MULT;
  return { perCombat, drops, chests, search, total: drops + chests + search };
}

// ── Accessibilité des items (boutique) ───────────────────────
function topShopItem(floor) {
  let best = null;
  for (const e of SHOP_CATALOG) {
    if ((e.minFloor || 1) > floor) continue;
    const it = itemById[e.id];
    if (!it) continue;
    const price = (typeof it.price === 'number') ? it.price : (it.basePrice || 0);
    if (!best || price > best.price) best = { id: it.id, name: it.name, price };
  }
  return best;
}

// ── Rapport ──────────────────────────────────────────────────
function g(x) { return Math.round(x).toLocaleString('fr-FR'); }

console.log(`# Étude de l'économie d'or — difficulté ${ARGS.difficulty}\n`);
console.log(`Hypothèses : ${ARGS.combats} combats, ${ARGS.chests} coffre(s), ` +
  `${ARGS.searches} fouilles / étage. goldMultiplier = ${DIFF.goldMultiplier}. ` +
  (ARGS.fortune
    ? `Fortune (LCK ${ARGS.lck}) = ${(FORTUNE * 100).toFixed(1)} % → or ×${GOLD_FORTUNE_MULT.toFixed(3)} (drops/coffres/fouille). `
    : `Fortune désactivée (--no-fortune). `) +
  `Sans variantes shiny (×2) ni bonus Poufsouffle « Récolte Magique » (+50 %).\n`);

// Section 1 — Revenus par étage
console.log('## 1. Revenus d\'or par étage\n');
console.log('| Étage | Mode | Or/combat | Or drops | Or coffres | Or fouille | **Or/étage** | Or quêtes (cumul) |');
console.log('|------:|:----:|----------:|---------:|-----------:|-----------:|-------------:|------------------:|');
for (let f = 1; f <= ARGS.maxFloor; f++) {
  for (const ps of [1, 2]) {
    const inc = floorIncome(f, ps);
    const q = questGoldUpToFloor(f);
    console.log(`| ${f} | ${ps === 1 ? 'Solo' : 'Duo '} | ${g(inc.perCombat)} | ${g(inc.drops)} | ${g(inc.chests)} | ${g(inc.search)} | **${g(inc.total)}** | ${g(q)} |`);
  }
}

// Section 2 — Or net cumulé (duo, sans dépense) + accessibilité
console.log('\n## 2. Or cumulé & accessibilité des items (duo)\n');
console.log('| Étage | Or/étage | Or cumulé | Item top boutique | Prix | Combats pour l\'acheter |');
console.log('|------:|---------:|----------:|:------------------|-----:|-----------------------:|');
let cumul = 0;
for (let f = 1; f <= ARGS.maxFloor; f++) {
  const inc = floorIncome(f, 2);
  cumul += inc.total + (questGoldUpToFloor(f) - questGoldUpToFloor(f - 1));
  const top = topShopItem(f);
  const perCombatTotal = inc.total / ARGS.combats; // or « par combat-équivalent »
  const nCombats = top ? Math.ceil(top.price / Math.max(1, perCombatTotal)) : 0;
  const flag = nCombats > 30 ? ' ⚠️' : '';
  console.log(`| ${f} | ${g(inc.total)} | ${g(cumul)} | ${top ? top.name : '—'} | ${top ? g(top.price) : '—'} | ${top ? nCombats + flag : '—'} |`);
}

// Section 3 — Puits d'or endgame (boucle ténébreuse, floors 11+)
console.log('\n## 3. Puits d\'or endgame — don à la Maison & ★ N (duo)\n');
console.log(`Taux de don : ${DONATION_GOLD_PER_POINT} G = 1 point. ` +
  `Seuil ★ N = 45 000 + 15 000·N + 1 000·N². ` +
  `Élixir permanent : ${g(1500)} G × 1.5^n (prix progressif).\n`);
if (ARGS.maxFloor < 11) {
  console.log('_(--max-floor < 11 : aucun étage de boucle ténébreuse analysé.)_\n');
} else {
  console.log('| Étage | Or/étage | Points si tout donné | ★ N atteignable (don cumulé depuis ét.11) | Élixirs +PV cumulés possibles |');
  console.log('|------:|---------:|---------------------:|:------------------------------------------|------------------------------:|');
  let goldLoop = 0;
  for (let f = 11; f <= ARGS.maxFloor; f++) {
    const inc = floorIncome(f, 2);
    goldLoop += inc.total;
    const pts = goldLoop / DONATION_GOLD_PER_POINT;
    // ★ N atteignable avec `pts` points cumulés
    let star = 0; while (starThreshold(star + 1) <= pts) star++;
    // Élixirs +PV : combien d'achats à 1500×1.5^n tiennent dans goldLoop
    let spent = 0, nElix = 0;
    while (spent + Math.round(1500 * Math.pow(1.5, nElix)) <= goldLoop) { spent += Math.round(1500 * Math.pow(1.5, nElix)); nElix++; }
    console.log(`| ${f} | ${g(inc.total)} | ${g(pts)} | ★${star} (${g(pts)} pts) | ${nElix} (${g(spent)} G) |`);
  }
  // Verdict saturation
  const loopGold = (() => { let s = 0; for (let f = 11; f <= ARGS.maxFloor; f++) s += floorIncome(f, 2).total; return s; })();
  console.log(`\n**Lecture** : sur la boucle ténébreuse complète (ét. 11→${ARGS.maxFloor}), ` +
    `un duo amasse ~${g(loopGold)} G. À ${DONATION_GOLD_PER_POINT} G/point, cela représente ` +
    `~${g(loopGold / DONATION_GOLD_PER_POINT)} points de Maison. Le 1er palier ★1 coûte ` +
    `${g(starThreshold(1))} pts (${g(starThreshold(1) * DONATION_GOLD_PER_POINT)} G) → la série ★ N ` +
    `est un gold-sink à absorption quasi illimitée (seuils en N²), tandis que les élixirs à ` +
    `prix progressif (×1.5/achat) saturent vite. Le « trou de sinks » §4.I de l'audit est comblé ` +
    `par ces deux canaux + le marchand_ombre (étages 11+, ~10 % de spawn).`);
}
