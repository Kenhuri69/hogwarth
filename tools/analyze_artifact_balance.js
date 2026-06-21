#!/usr/bin/env node
/*
 * analyze_artifact_balance.js — Étude d'équilibrage coût↔puissance des artefacts.
 *
 * Outil Node PUR (non servi au navigateur, aucun cache-bump). Parse js/data.js
 * (ITEMS) et js/shop.js (SHOP_CATALOG minFloor), calcule un `powerBudget` par
 * item équipable selon les poids de la table §1.6 (artifacts-reliquary-system.md),
 * un prix théorique, et l'écart % vs prix réel. Lecture seule.
 *
 *   node tools/analyze_artifact_balance.js            # table triée par écart
 *   node tools/analyze_artifact_balance.js --csv      # sortie CSV
 *   node tools/analyze_artifact_balance.js --by-slot  # regroupé par slot
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// ── 1. Charger ITEMS depuis data.js dans un bac à sable permissif ──────────
function loadItems() {
  // Lot A P3.3 : ITEMS + TENEBRES_SET vivent dans data-items.js.
  let src = fs.readFileSync(path.join(ROOT, 'js', 'data-items.js'), 'utf8');
  // const/let au scope script n'attachent pas au global du vm : on exfiltre via
  // un callback injecté, lisible depuis le scope déclaratif du même script.
  src += '\n;__exfil(typeof ITEMS!=="undefined"?ITEMS:null, typeof TENEBRES_SET!=="undefined"?TENEBRES_SET:[]);';
  const out = {};
  const sandbox = { __exfil: (items, tenebres) => { out.ITEMS = items; out.TENEBRES_SET = tenebres; } };
  // Proxy : tout identifiant global manquant renvoie undefined (inerte).
  const proxy = new Proxy(sandbox, {
    has: () => true,
    get: (t, k) => (k in t ? t[k] : undefined),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  vm.runInNewContext(src, proxy, { filename: 'data-items.js' });
  if (!Array.isArray(out.ITEMS)) throw new Error('ITEMS introuvable');
  return { ITEMS: out.ITEMS, TENEBRES_SET: out.TENEBRES_SET || [] };
}

// ── 2. minFloor depuis SHOP_CATALOG (regex léger) ──────────────────────────
function loadShopFloors() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'shop.js'), 'utf8');
  const map = {};
  const re = /\{\s*id:\s*"([^"]+)"\s*,\s*minFloor:\s*(\d+)\s*\}/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = Number(m[2]);
  return map;
}

// ── 3. Modèle de powerBudget (poids §1.6, affinés — cf. rapport) ───────────
const W = {
  primary: 35,        // ATK/DEF/MAG/LCK  — 1 pt
  secondary: 20,      // STR/INT/AGI/END  — 1 pt
  critPct: 12,        // critChance/spellCritChance/dodgeChance — 1 %
  critDmg: 60,        // critDamage/spellCritDamage — par +1.0 (donc +0.2 = 12)
  regen: 40,          // regenHp/regenSp — par point/tour
  resourceMax: 5,     // hpMax/spMax — par point (cohérent END→+5PV @ 20G/pt)
  grantsSpell: 150,   // enseigne un sort
  spCostRed: 60,      // spCostReduction — par point (−1 PM/sort)
  elemSingle: 300,    // bonusElemDmg{un élément} — par +1.0 (donc +0.15 = 45)
  elemAll: 800,       // bonusElemDmg{tous} — par +1.0 (donc +0.10 = 80)
  celerite: 12,       // bonusCelerite — assimilé à 1 pt ~ 1% tempo
  fortune: 12,        // bonusFortune — idem
  goldMult: 1500,     // bonusGoldMult — par +1.0 (0.20 = 300) ; utilité éco
  fearImmune: 200,    // utilité forte (anti-peur de groupe)
};

const PRIMARY = ['bonusAtk', 'bonusDef', 'bonusMag', 'bonusLck'];
const SECONDARY = ['bonusStr', 'bonusInt', 'bonusAgi', 'bonusEnd'];
const CRITPCT = ['bonusCritChance', 'bonusSpellCritChance', 'bonusDodgeChance'];
const CRITDMG = ['bonusCritDamage', 'bonusSpellCritDamage'];
const REGEN = ['regenHp', 'regenSp'];
const RESMAX = ['bonusHpMax', 'bonusSpMax'];

function powerBudget(it) {
  let b = 0;
  const parts = [];
  const add = (label, v) => { if (v) { b += v; parts.push(`${label}:${Math.round(v)}`); } };
  for (const k of PRIMARY) if (it[k]) add(k.slice(5), it[k] * W.primary);
  for (const k of SECONDARY) if (it[k]) add(k.slice(5), it[k] * W.secondary);
  for (const k of CRITPCT) if (it[k]) add(k.slice(5), it[k] * W.critPct);
  for (const k of CRITDMG) if (it[k]) add(k.slice(5), it[k] * W.critDmg);
  for (const k of REGEN) if (it[k]) add(k, it[k] * W.regen);
  for (const k of RESMAX) if (it[k]) add(k.slice(5), it[k] * W.resourceMax);
  if (it.grantsSpell) add('spell', W.grantsSpell);
  if (it.spCostReduction) add('spCost', it.spCostReduction * W.spCostRed);
  if (it.bonusCelerite) add('celer', it.bonusCelerite * W.celerite);
  if (it.bonusFortune) add('fort', it.bonusFortune * W.fortune);
  if (it.bonusGoldMult) add('gold', it.bonusGoldMult * W.goldMult);
  if (it.fearImmune) add('fearImm', W.fearImmune);
  if (it.bonusElemDmg) {
    for (const [el, v] of Object.entries(it.bonusElemDmg)) {
      add('elem_' + el, v * (el === 'tous' ? W.elemAll : W.elemSingle));
    }
  }
  return { budget: Math.round(b), parts };
}

// ── 4. Multiplicateurs §1.6 ────────────────────────────────────────────────
const RARITY_MULT = { common: 1.0, uncommon: 1.3, rare: 1.8, epic: 3.0, legendary: 5.0 };
const ACT_MULT = { 'I': 1.0, 'II': 1.4, 'III': 2.6, 'Boucle': 4.0 };
function actFromFloor(floor) {
  if (floor <= 3) return 'I';
  if (floor <= 6) return 'II';
  if (floor <= 10) return 'III';
  return 'Boucle';
}
// Si l'item est en shop → acte par minFloor. Sinon (drop/quête/Boucle) → acte
// inféré par rareté (epic→III, legendary→Boucle) faute de minFloor fiable.
function actOf(it, floor) {
  let act;
  if (floor) act = actFromFloor(floor);
  else if (it.rarity === 'legendary') act = 'Boucle';
  else if (it.rarity === 'epic') act = 'III';
  else if (it.rarity === 'rare') act = 'II';
  else act = 'I';
  return { act, mult: ACT_MULT[act] };
}

// ── 5. Sélection des items équipables ──────────────────────────────────────
const EQUIP_SLOTS = new Set(['wand', 'head', 'body', 'hands', 'feet', 'cloak',
  'amulet', 'ring', 'belt', 'trinket']);
function isEquippable(it) {
  return it.slot && EQUIP_SLOTS.has(it.slot);
}

function main() {
  const { ITEMS } = loadItems();
  const floors = loadShopFloors();
  const equip = ITEMS.filter(isEquippable);

  const rows = equip.map(it => {
    const { budget, parts } = powerBudget(it);
    const minFloor = floors[it.id] || null;
    const { act, mult: aMult } = actOf(it, minFloor);
    const rMult = RARITY_MULT[it.rarity] != null ? RARITY_MULT[it.rarity] : 1.0;
    // Prix théorique §1.6 (budget × rarity × act).
    const theoLiteral = Math.round(budget * rMult * aMult);
    const price = it.price || 0;
    const sellable = price > 0;
    const ratio = sellable && budget > 0 ? price / budget : null; // prix / valeur brute
    const ecart = sellable && theoLiteral > 0 ? (price - theoLiteral) / theoLiteral : null;
    return {
      id: it.id, name: it.name, slot: it.slot, rarity: it.rarity || '—',
      formType: it.formType || '', houseAffinity: it.houseAffinity || '',
      minFloor, act, budget, parts: parts.join(' '),
      price, sellable, theoLiteral, ratio, ecart,
      rarityScales: !!it.rarityScales, premium: !!it.premium,
      setKey: it.setKey || '',
    };
  });

  if (process.argv.includes('--csv')) {
    console.log('id,slot,rarity,formType,houseAffinity,minFloor,act,budget,price,sellable,theoLiteral,ratio');
    for (const r of rows) {
      console.log([r.id, r.slot, r.rarity, r.formType, r.houseAffinity, r.minFloor || '',
        r.act, r.budget, r.price, r.sellable, r.theoLiteral,
        r.ratio != null ? r.ratio.toFixed(2) : ''].join(','));
    }
    return;
  }

  const fmt = r => {
    const ratioS = r.ratio != null ? r.ratio.toFixed(2) + '×' : (r.price === 0 ? 'NV' : '—');
    const ecS = r.ecart != null ? (r.ecart >= 0 ? '+' : '') + Math.round(r.ecart * 100) + '%' : '';
    return [
      r.id.padEnd(30),
      (r.rarity || '—').padEnd(10),
      (r.slot || '').padEnd(8),
      ('ét.' + (r.minFloor || '?')).padEnd(7),
      r.act.padEnd(7),
      ('bud=' + r.budget).padEnd(9),
      ('prix=' + r.price).padEnd(11),
      ('théo=' + r.theoLiteral).padEnd(11),
      ('éc=' + ecS).padEnd(9),
      ('r=' + ratioS).padEnd(9),
    ].join(' ');
  };

  if (process.argv.includes('--by-slot')) {
    const bySlot = {};
    for (const r of rows) (bySlot[r.slot] = bySlot[r.slot] || []).push(r);
    for (const slot of Object.keys(bySlot).sort()) {
      console.log('\n=== SLOT ' + slot + ' ===');
      bySlot[slot].sort((a, b) => (b.ratio || 0) - (a.ratio || 0)).forEach(r => console.log(fmt(r)));
    }
    return;
  }

  // Par défaut : vendables triés par écart vs prix théorique §1.6 décroissant.
  const sellable = rows.filter(r => r.sellable && r.budget > 0)
    .sort((a, b) => b.ecart - a.ecart);
  const nonSellable = rows.filter(r => !r.sellable);

  console.log('# ÉTUDE ÉQUILIBRAGE ARTEFACTS — ' + equip.length + ' items équipables\n');
  console.log('## Vendables, triés par écart vs prix théorique §1.6 (théo = bud×rarity×act)\n');
  sellable.forEach(r => console.log(fmt(r)));
  const ratios = sellable.map(r => r.ratio).sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  const ecarts = sellable.map(r => r.ecart).sort((a, b) => a - b);
  const ecMed = ecarts[Math.floor(ecarts.length / 2)];
  console.log('\nratio prix/valeur — médiane=' + median.toFixed(2) +
    ' moyenne=' + mean.toFixed(2) + ' min=' + ratios[0].toFixed(2) +
    ' max=' + ratios[ratios.length - 1].toFixed(2));
  console.log('écart vs théo §1.6 — médian=' + Math.round(ecMed * 100) + '%' +
    ' (théo surévalue si écart<0)');

  console.log('\n## Non vendables (prix 0 ou rarityScales/sink)\n');
  nonSellable.sort((a, b) => b.budget - a.budget).forEach(r => console.log(fmt(r) + '  ' + r.parts));

  // Détail budget des vendables pour audit.
  console.log('\n## Détail powerBudget (vendables)\n');
  sellable.forEach(r => console.log(r.id.padEnd(30) + ' bud=' + String(r.budget).padEnd(5) + ' | ' + r.parts));
}

main();
