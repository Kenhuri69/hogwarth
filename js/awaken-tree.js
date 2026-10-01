// ============================================================
// ARBRE « ÉVEIL DU SORCIER » (Lot 4.3/4.4, revue-design-progression §6)
// ============================================================
// Points d'Éveil : 1 tous les 2 niveaux (dérivé du niveau, donc rétroactif).
// Chaque héros les dépense dans le tronc commun ou dans la branche de sa
// Maison (chosenHouse). Choix permanents. État : c.awakenNodes (ids), sérialisé
// avec le personnage. Effets additifs lus par recalculateStats() + 4 clés
// spéciales (une par Maison) lues aux points d'accroche de combat/exploration.
// Plan : .claude/plans/lot4b-arbre-eveil-socle-2026-10.md
// ============================================================

// Poids de puissance par unité de bonus — sert au contrôle d'équité entre
// Maisons (units §32). Un nœud de rang 1/2 pèse 2, de rang 3 pèse 4, le
// capital 6.
const AWAKEN_WEIGHTS = {
  bonusAtk: 2, bonusDef: 2, bonusMag: 2, bonusLck: 0.5,
  bonusStr: 1, bonusInt: 1, bonusAgi: 1, bonusEnd: 1,
  bonusCritChance: 1, bonusSpellCritChance: 1, bonusDodgeChance: 1,
  bonusCritDamage: 20, bonusSpellCritDamage: 20,
  bonusHpMax: 0.2, bonusSpMax: 0.25, bonusCounterChance: 0.5,
  bonusFortune: 0.5, bonusCelerite: 0.5,
  lowHpDmg: 20, spellLifesteal: 30, spellCostReduc: 30, stepRegen: 1
};

// Rangs d'une branche de Maison : coût d'un nœud et points déjà investis dans
// la branche pour le débloquer.
const AWAKEN_RANKS = { 1: { cost: 1, req: 0 }, 2: { cost: 1, req: 2 }, 3: { cost: 2, req: 4 }, 4: { cost: 3, req: 8 } };

const AWAKEN_TREE = {
  trunk: [
    { id: 't_crit',      icon: '🎯', name: 'Œil vif',          bonus: { bonusCritChance: 2 } },
    { id: 't_dodge',     icon: '💨', name: 'Pas de côté',      bonus: { bonusDodgeChance: 2 } },
    { id: 't_hp',        icon: '❤️', name: 'Constitution',     bonus: { bonusHpMax: 10 } },
    { id: 't_sp',        icon: '💧', name: 'Réserve',          bonus: { bonusSpMax: 8 } },
    { id: 't_fortune',   icon: '🍀', name: 'Bonne étoile',     bonus: { bonusFortune: 4 } },
    { id: 't_celerite',  icon: '⚡', name: 'Vivacité',         bonus: { bonusCelerite: 4 } },
    { id: 't_spellcrit', icon: '✨', name: 'Geste sûr',        bonus: { bonusSpellCritChance: 2 } },
    { id: 't_counter',   icon: '🛡️', name: 'Réflexe de garde', bonus: { bonusCounterChance: 4 } }
  ],
  houses: {
    Gryffondor: [
      { id: 'g_crit',      rank: 1, icon: '🎯', name: 'Audace',            bonus: { bonusCritChance: 2 } },
      { id: 'g_atk',       rank: 1, icon: '🗡️', name: 'Bras armé',         bonus: { bonusAtk: 1 } },
      { id: 'g_str',       rank: 1, icon: '💪', name: 'Vigueur',           bonus: { bonusStr: 2 } },
      { id: 'g_critdmg',   rank: 2, icon: '💥', name: 'Coup franc',        bonus: { bonusCritDamage: 0.10 } },
      { id: 'g_hp',        rank: 2, icon: '❤️', name: 'Cœur vaillant',     bonus: { bonusHpMax: 10 } },
      { id: 'g_spellcrit', rank: 2, icon: '✨', name: 'Flamme vive',       bonus: { bonusSpellCritChance: 2 } },
      { id: 'g_fury',      rank: 3, icon: '🔥', name: 'Dos au mur',        bonus: { lowHpDmg: 0.10, bonusCritChance: 2 } },
      { id: 'g_atk2',      rank: 3, icon: '⚔️', name: 'Lame de Godric',    bonus: { bonusAtk: 2 } },
      { id: 'g_crit2',     rank: 3, icon: '🦁', name: 'Rugissement',       bonus: { bonusCritChance: 4 } },
      { id: 'g_lion',      rank: 4, icon: '👑', name: 'Cœur du Lion',      bonus: { lowHpDmg: 0.20, bonusCritDamage: 0.10 } }
    ],
    Serpentard: [
      { id: 's_mag',       rank: 1, icon: '🔮', name: 'Ambition',          bonus: { bonusMag: 1 } },
      { id: 's_int',       rank: 1, icon: '📜', name: 'Ruse',              bonus: { bonusInt: 2 } },
      { id: 's_spellcrit', rank: 1, icon: '✨', name: 'Crochet',           bonus: { bonusSpellCritChance: 2 } },
      { id: 's_leech',     rank: 2, icon: '🩸', name: 'Soif',              bonus: { spellLifesteal: 0.05, bonusSpMax: 2 } },
      { id: 's_dodge',     rank: 2, icon: '💨', name: 'Mue',               bonus: { bonusDodgeChance: 2 } },
      { id: 's_fortune',   rank: 2, icon: '🍀', name: 'Opportunisme',      bonus: { bonusFortune: 4 } },
      { id: 's_leech2',    rank: 3, icon: '🐍', name: 'Morsure',           bonus: { spellLifesteal: 0.05, bonusInt: 2, bonusSpMax: 2 } },
      { id: 's_mag2',      rank: 3, icon: '🌑', name: 'Héritage noir',     bonus: { bonusMag: 2 } },
      { id: 's_scd',       rank: 3, icon: '💥', name: 'Venin',             bonus: { bonusSpellCritDamage: 0.20 } },
      { id: 's_pact',      rank: 4, icon: '👑', name: 'Pacte de Salazar',  bonus: { spellLifesteal: 0.10, bonusMag: 1, bonusSpellCritChance: 1 } }
    ],
    Serdaigle: [
      { id: 'r_mag',       rank: 1, icon: '🔮', name: 'Esprit vif',        bonus: { bonusMag: 1 } },
      { id: 'r_sp',        rank: 1, icon: '💧', name: 'Puits de savoir',   bonus: { bonusSpMax: 8 } },
      { id: 'r_spellcrit', rank: 1, icon: '✨', name: 'Précision',         bonus: { bonusSpellCritChance: 2 } },
      { id: 'r_cost',      rank: 2, icon: '📘', name: 'Économie du geste', bonus: { spellCostReduc: 0.05, bonusSpMax: 2 } },
      { id: 'r_int',       rank: 2, icon: '📜', name: 'Érudition',         bonus: { bonusInt: 2 } },
      { id: 'r_agi',       rank: 2, icon: '🪶', name: 'Plume légère',      bonus: { bonusAgi: 2 } },
      { id: 'r_cost2',     rank: 3, icon: '🦅', name: 'Formule épurée',    bonus: { spellCostReduc: 0.10, bonusInt: 1 } },
      { id: 'r_scd',       rank: 3, icon: '💥', name: 'Éclair de génie',   bonus: { bonusSpellCritDamage: 0.20 } },
      { id: 'r_spellcrit2',rank: 3, icon: '🎯', name: 'Œil d\'aigle',      bonus: { bonusSpellCritChance: 4 } },
      { id: 'r_rowena',    rank: 4, icon: '👑', name: 'Sagesse de Rowena', bonus: { spellCostReduc: 0.05, bonusMag: 1, bonusSpMax: 10 } }
    ],
    Poufsouffle: [
      { id: 'p_def',       rank: 1, icon: '🛡️', name: 'Constance',         bonus: { bonusDef: 1 } },
      { id: 'p_end',       rank: 1, icon: '🌾', name: 'Endurance',         bonus: { bonusEnd: 2 } },
      { id: 'p_hp',        rank: 1, icon: '❤️', name: 'Robustesse',        bonus: { bonusHpMax: 10 } },
      { id: 'p_regen',     rank: 2, icon: '🌿', name: 'Second souffle',    bonus: { stepRegen: 1, bonusHpMax: 5 } },
      { id: 'p_counter',   rank: 2, icon: '⚔️', name: 'Riposte loyale',    bonus: { bonusCounterChance: 4 } },
      { id: 'p_dodge',     rank: 2, icon: '💨', name: 'Terrier',           bonus: { bonusDodgeChance: 2 } },
      { id: 'p_regen2',    rank: 3, icon: '🍯', name: 'Récolte',           bonus: { stepRegen: 2, bonusDef: 1 } },
      { id: 'p_hp2',       rank: 3, icon: '🦡', name: 'Peau de blaireau',  bonus: { bonusHpMax: 20 } },
      { id: 'p_def2',      rank: 3, icon: '🪨', name: 'Rempart',           bonus: { bonusDef: 2 } },
      { id: 'p_badger',    rank: 4, icon: '👑', name: 'Serment d\'Helga',  bonus: { stepRegen: 2, bonusHpMax: 10, bonusEnd: 2 } }
    ]
  }
};

// ── Helpers PURS ─────────────────────────────────────────────
function awakenPointsEarned(level) { return Math.max(0, Math.floor((level | 0) / 2)); }

function awakenNodeCost(node) {
  return node && node.rank ? AWAKEN_RANKS[node.rank].cost : 1;
}

function awakenNodeWeight(node) {
  let w = 0;
  for (const [k, v] of Object.entries((node && node.bonus) || {})) w += (AWAKEN_WEIGHTS[k] || 0) * v;
  return Math.round(w * 100) / 100;
}

// Nœud par id, avec sa branche ('trunk' ou nom de Maison).
function awakenFindNode(id) {
  const t = AWAKEN_TREE.trunk.find(n => n.id === id);
  if (t) return { node: t, branch: 'trunk' };
  for (const [house, nodes] of Object.entries(AWAKEN_TREE.houses)) {
    const n = nodes.find(x => x.id === id);
    if (n) return { node: n, branch: house };
  }
  return null;
}

function awakenSpentIn(nodeIds, branch) {
  let s = 0;
  for (const id of nodeIds || []) {
    const f = awakenFindNode(id);
    if (f && f.branch === branch) s += awakenNodeCost(f.node);
  }
  return s;
}

function awakenPointsSpent(nodeIds) {
  let s = 0;
  for (const id of nodeIds || []) { const f = awakenFindNode(id); if (f) s += awakenNodeCost(f.node); }
  return s;
}

// Points disponibles d'un héros (niveau partagé du groupe).
function awakenPointsAvailable(c, level) {
  return awakenPointsEarned(level) + ((c && c.awakenBought) | 0) - awakenPointsSpent(c && c.awakenNodes);
}

// Raison du refus, ou null si le nœud peut être pris. `house` = chosenHouse.
function awakenCanTake(c, id, level, house) {
  const f = awakenFindNode(id);
  if (!f) return 'inconnu';
  const taken = (c && c.awakenNodes) || [];
  if (taken.includes(id)) return 'déjà pris';
  if (f.branch !== 'trunk' && f.branch !== house) return 'autre Maison';
  if (f.node.rank && awakenSpentIn(taken, f.branch) < AWAKEN_RANKS[f.node.rank].req) {
    return `${AWAKEN_RANKS[f.node.rank].req} pts requis dans la branche`;
  }
  if (awakenPointsAvailable(c, level) < awakenNodeCost(f.node)) return 'points insuffisants';
  return null;
}

// Somme des bonus des nœuds pris (PUR). Un nœud d'une autre Maison est ignoré.
function awakenBonuses(c, house) {
  const out = {};
  for (const id of (c && c.awakenNodes) || []) {
    const f = awakenFindNode(id);
    if (!f || (f.branch !== 'trunk' && house !== undefined && f.branch !== house)) continue;
    for (const [k, v] of Object.entries(f.node.bonus)) out[k] = Math.round(((out[k] || 0) + v) * 1000) / 1000;
  }
  return out;
}

// Bonus courant d'un héros, mémorisé par recalculateStats (c._awaken).
function awakenStat(c, key) { return (c && c._awaken && c._awaken[key]) || 0; }

// ── Action ───────────────────────────────────────────────────
function _awakenLevel() { return (typeof player !== 'undefined' && player) ? (player.level | 0) : 1; }
function _awakenHouse() { return (typeof chosenHouse !== 'undefined') ? chosenHouse : null; }

function awakenTakeNode(charIdx, id) {
  const c = party[charIdx];
  if (!c) return false;
  const why = awakenCanTake(c, id, _awakenLevel(), _awakenHouse());
  if (why) {
    if (typeof addMsg === 'function') addMsg(`🌟 Éveil impossible : ${why}.`, 'bad');
    return false;
  }
  if (!Array.isArray(c.awakenNodes)) c.awakenNodes = [];
  c.awakenNodes.push(id);
  const n = awakenFindNode(id).node;
  if (typeof recalculateStats === 'function') recalculateStats();
  if (typeof addMsg === 'function') addMsg(`🌟 ${c.name} s'éveille : ${n.icon} ${n.name}.`, 'magic');
  if (typeof updateUI === 'function') updateUI();
  if (typeof autoSave === 'function') autoSave('awaken');
  return true;
}

// ── UI : modale #skill-tree-modal ────────────────────────────
let _awakenCharIdx = 0;

function _awakenBonusText(bonus) {
  const L = {
    bonusAtk: v => `+${v} ATK`, bonusDef: v => `+${v} DEF`, bonusMag: v => `+${v} MAG`, bonusLck: v => `+${v} LCK`,
    bonusStr: v => `+${v} FOR`, bonusInt: v => `+${v} INT`, bonusAgi: v => `+${v} AGI`, bonusEnd: v => `+${v} END`,
    bonusCritChance: v => `+${v} % crit`, bonusSpellCritChance: v => `+${v} % crit de sort`,
    bonusDodgeChance: v => `+${v} % esquive`, bonusCritDamage: v => `+${Math.round(v * 100)} % dégâts crit`,
    bonusSpellCritDamage: v => `+${Math.round(v * 100)} % dégâts crit de sort`,
    bonusHpMax: v => `+${v} PV max`, bonusSpMax: v => `+${v} PM max`, bonusCounterChance: v => `+${v} % riposte`,
    bonusFortune: v => `Fortune +${v}`, bonusCelerite: v => `Célérité +${v}`,
    lowHpDmg: v => `+${Math.round(v * 100)} % dégâts sous 50 % PV`,
    spellLifesteal: v => `vol de vie de sort ${Math.round(v * 100)} %`,
    spellCostReduc: v => `−${Math.round(v * 100)} % coût des sorts`,
    stepRegen: v => `+${v} PV par pas hors combat`
  };
  return Object.entries(bonus).map(([k, v]) => (L[k] ? L[k](v) : k)).join(', ');
}

function _awakenNodeHtml(c, node, level, house) {
  const taken = (c.awakenNodes || []).includes(node.id);
  const why = taken ? null : awakenCanTake(c, node.id, level, house);
  const state = taken ? 'taken' : (why ? 'locked' : 'open');
  const cost = awakenNodeCost(node);
  const esc = (typeof htmlEscape === 'function') ? htmlEscape : (s => s);
  const title = `${node.name} — ${_awakenBonusText(node.bonus)} (${cost} pt${cost > 1 ? 's' : ''})${why && !taken ? ' · ' + why : ''}`;
  const click = state === 'open' ? ` onclick="_awakenConfirm(${_awakenCharIdx}, '${node.id}')"` : '';
  return `<button class="awaken-node awaken-${state}" data-node="${node.id}" title="${esc(title)}"${state !== 'open' ? ' disabled' : ''}${click}>
    <span class="awaken-node-icon">${node.icon}</span>
    <span class="awaken-node-name">${esc(node.name)}</span>
    <span class="awaken-node-desc">${esc(_awakenBonusText(node.bonus))}</span>
    <span class="awaken-node-cost">${taken ? '✓' : cost + ' pt' + (cost > 1 ? 's' : '')}</span>
  </button>`;
}

function renderSkillTree() {
  const body = (typeof safeEl === 'function') ? safeEl('skill-tree-body') : document.getElementById('skill-tree-body');
  if (!body) return;
  const size = (typeof partySize === 'number') ? partySize : 1;
  if (_awakenCharIdx >= size) _awakenCharIdx = 0;
  const c = party[_awakenCharIdx];
  const level = _awakenLevel(), house = _awakenHouse();
  const tabs = size > 1 ? party.slice(0, size).map((p, i) =>
    `<button class="codex-tab${i === _awakenCharIdx ? ' active' : ''}" onclick="_awakenCharIdx=${i}; renderSkillTree()">${p.name.split(' ')[0]}</button>`).join('') : '';
  const avail = awakenPointsAvailable(c, level);
  const houseNodes = (house && AWAKEN_TREE.houses[house]) || [];
  const ranks = [1, 2, 3, 4].map(r => {
    const nodes = houseNodes.filter(n => n.rank === r);
    if (!nodes.length) return '';
    const label = r === 4 ? 'Capital' : `Rang ${r}`;
    return `<div class="awaken-rank"><div class="awaken-rank-label">${label} · ${AWAKEN_RANKS[r].req} pts investis</div>
      <div class="awaken-grid">${nodes.map(n => _awakenNodeHtml(c, n, level, house)).join('')}</div></div>`;
  }).join('');
  body.innerHTML = `
    ${tabs ? `<div class="codex-tabs">${tabs}</div>` : ''}
    <div class="awaken-points" aria-live="polite">🌟 Points d'Éveil : <b>${avail}</b>
      <span class="awaken-points-note">(1 tous les 2 niveaux — choix permanents)</span></div>
    <h4 class="awaken-branch-title">Tronc commun</h4>
    <div class="awaken-grid">${AWAKEN_TREE.trunk.map(n => _awakenNodeHtml(c, n, level, house)).join('')}</div>
    ${house ? `<h4 class="awaken-branch-title">Branche ${house} <span class="awaken-points-note">(${awakenSpentIn(c.awakenNodes, house)} pts investis)</span></h4>${ranks}` : ''}`;
}

function _awakenConfirm(charIdx, id) {
  const f = awakenFindNode(id);
  if (!f) return;
  const ask = (typeof confirmModal === 'function')
    ? confirmModal({ title: `${f.node.icon} ${f.node.name}`, body: `${_awakenBonusText(f.node.bonus)}. Ce choix est permanent.`, confirmLabel: 'Éveiller' })
    : Promise.resolve(true);
  ask.then(ok => { if (ok && awakenTakeNode(charIdx, id)) renderSkillTree(); });
}

function openSkillTree(charIdx) {
  const modal = document.getElementById('skill-tree-modal');
  if (!modal) return;
  if (typeof charIdx === 'number') _awakenCharIdx = charIdx;
  renderSkillTree();
  modal.style.display = 'flex';
}

function closeSkillTree() {
  const modal = document.getElementById('skill-tree-modal');
  if (modal) modal.style.display = 'none';
}

window.awakenTakeNode = awakenTakeNode;
window.openSkillTree = openSkillTree;
window.closeSkillTree = closeSkillTree;
window.renderSkillTree = renderSkillTree;
window._awakenConfirm = _awakenConfirm;
