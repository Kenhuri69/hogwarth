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
  lowHpDmg: 20, spellLifesteal: 30, spellCostReduc: 30, stepRegen: 1,
  activePower: 8
};
// Poids d'un nœud actif (action de combat) — compté comme un nœud de rang 2.
const AWAKEN_ACTIVE_WEIGHT = 2;

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
  },
  // Branches de classe (Lot 4.5) : un nœud `active` par archétype (action de
  // combat 1×/combat), renforcé par `activePower` du capital.
  classes: {
    duelliste: [
      { id: 'd_crit',     rank: 1, icon: '🎯', name: 'Œil du duelliste',   bonus: { bonusCritChance: 2 } },
      { id: 'd_atk',      rank: 1, icon: '🗡️', name: 'Garde haute',        bonus: { bonusAtk: 1 } },
      { id: 'd_agi',      rank: 1, icon: '🪶', name: 'Jeu de jambes',      bonus: { bonusAgi: 2 } },
      { id: 'd_active',   rank: 2, icon: '⚔️', name: 'Riposte assurée',    bonus: {}, active: 'duelliste' },
      { id: 'd_counter',  rank: 2, icon: '🛡️', name: 'Contre-temps',       bonus: { bonusCounterChance: 4 } },
      { id: 'd_celer',    rank: 2, icon: '⚡', name: 'Fente',              bonus: { bonusCelerite: 4 } },
      { id: 'd_critdmg',  rank: 3, icon: '💥', name: 'Coup de grâce',      bonus: { bonusCritDamage: 0.20 } },
      { id: 'd_str',      rank: 3, icon: '💪', name: 'Poigne',             bonus: { bonusStr: 4 } },
      { id: 'd_dodge',    rank: 3, icon: '💨', name: 'Esquive du maître',  bonus: { bonusDodgeChance: 4 } },
      { id: 'd_master',   rank: 4, icon: '👑', name: 'Maître d\'armes',    bonus: { activePower: 0.5, bonusCritChance: 2 } }
    ],
    erudit: [
      { id: 'e_mag',       rank: 1, icon: '🔮', name: 'Concentration',      bonus: { bonusMag: 1 } },
      { id: 'e_int',       rank: 1, icon: '📜', name: 'Lectures nocturnes', bonus: { bonusInt: 2 } },
      { id: 'e_sp',        rank: 1, icon: '💧', name: 'Réservoir',          bonus: { bonusSpMax: 8 } },
      { id: 'e_active',    rank: 2, icon: '📘', name: 'Surcharge',          bonus: {}, active: 'erudit' },
      { id: 'e_spellcrit', rank: 2, icon: '✨', name: 'Incantation nette',  bonus: { bonusSpellCritChance: 2 } },
      { id: 'e_celer',     rank: 2, icon: '⚡', name: 'Formule brève',      bonus: { bonusCelerite: 4 } },
      { id: 'e_scd',       rank: 3, icon: '💥', name: 'Résonance',          bonus: { bonusSpellCritDamage: 0.20 } },
      { id: 'e_mag2',      rank: 3, icon: '🌟', name: 'Flux arcanique',     bonus: { bonusMag: 2 } },
      { id: 'e_spellcrit2',rank: 3, icon: '🎯', name: 'Point focal',        bonus: { bonusSpellCritChance: 4 } },
      { id: 'e_master',    rank: 4, icon: '👑', name: 'Archimage',          bonus: { activePower: 0.5, bonusInt: 2 } }
    ],
    occultiste: [
      { id: 'o_mag',      rank: 1, icon: '🔮', name: 'Rituel',             bonus: { bonusMag: 1 } },
      { id: 'o_int',      rank: 1, icon: '📜', name: 'Savoir interdit',    bonus: { bonusInt: 2 } },
      { id: 'o_hp',       rank: 1, icon: '❤️', name: 'Pacte de chair',     bonus: { bonusHpMax: 10 } },
      { id: 'o_active',   rank: 2, icon: '🌑', name: 'Saignée',            bonus: {}, active: 'occultiste' },
      { id: 'o_leech',    rank: 2, icon: '🩸', name: 'Tribut',             bonus: { spellLifesteal: 0.05, bonusSpMax: 2 } },
      { id: 'o_fortune',  rank: 2, icon: '🍀', name: 'Présage',            bonus: { bonusFortune: 4 } },
      { id: 'o_leech2',   rank: 3, icon: '🦇', name: 'Soif d\'ombre',      bonus: { spellLifesteal: 0.05, bonusMag: 1, bonusSpMax: 2 } },
      { id: 'o_scd',      rank: 3, icon: '💥', name: 'Malédiction aiguë',  bonus: { bonusSpellCritDamage: 0.20 } },
      { id: 'o_mag2',     rank: 3, icon: '🌘', name: 'Ombre profonde',     bonus: { bonusMag: 2 } },
      { id: 'o_master',   rank: 4, icon: '👑', name: 'Grand Occultiste',   bonus: { activePower: 0.5, bonusSpellCritChance: 2 } }
    ],
    gardien: [
      { id: 'gd_def',     rank: 1, icon: '🛡️', name: 'Bouclier levé',      bonus: { bonusDef: 1 } },
      { id: 'gd_end',     rank: 1, icon: '🌾', name: 'Ténacité',           bonus: { bonusEnd: 2 } },
      { id: 'gd_hp',      rank: 1, icon: '❤️', name: 'Carrure',            bonus: { bonusHpMax: 10 } },
      { id: 'gd_active',  rank: 2, icon: '🛡️', name: 'Interposition',      bonus: {}, active: 'gardien' },
      { id: 'gd_counter', rank: 2, icon: '⚔️', name: 'Riposte du rempart', bonus: { bonusCounterChance: 4 } },
      { id: 'gd_dodge',   rank: 2, icon: '💨', name: 'Parade',             bonus: { bonusDodgeChance: 2 } },
      { id: 'gd_hp2',     rank: 3, icon: '🏰', name: 'Forteresse',         bonus: { bonusHpMax: 20 } },
      { id: 'gd_def2',    rank: 3, icon: '🪨', name: 'Mur vivant',         bonus: { bonusDef: 2 } },
      { id: 'gd_end2',    rank: 3, icon: '⛰️', name: 'Inébranlable',       bonus: { bonusEnd: 4 } },
      { id: 'gd_master',  rank: 4, icon: '👑', name: 'Sentinelle',         bonus: { activePower: 0.5, bonusEnd: 2 } }
    ],
    enchanteur: [
      { id: 'en_fortune', rank: 1, icon: '🍀', name: 'Charme heureux',     bonus: { bonusFortune: 4 } },
      { id: 'en_sp',      rank: 1, icon: '💧', name: 'Source vive',        bonus: { bonusSpMax: 8 } },
      { id: 'en_int',     rank: 1, icon: '📜', name: 'Grâce',              bonus: { bonusInt: 2 } },
      { id: 'en_active',  rank: 2, icon: '✨', name: 'Faveur',             bonus: {}, active: 'enchanteur' },
      { id: 'en_lck',     rank: 2, icon: '🌠', name: 'Étoile filante',     bonus: { bonusLck: 4 } },
      { id: 'en_celer',   rank: 2, icon: '⚡', name: 'Allégresse',         bonus: { bonusCelerite: 4 } },
      { id: 'en_hp',      rank: 3, icon: '🌸', name: 'Floraison',          bonus: { bonusHpMax: 20 } },
      { id: 'en_mag',     rank: 3, icon: '🔮', name: 'Enchantement',       bonus: { bonusMag: 2 } },
      { id: 'en_spellcrit',rank: 3,icon: '🎯', name: 'Sortilège juste',    bonus: { bonusSpellCritChance: 4 } },
      { id: 'en_master',  rank: 4, icon: '👑', name: 'Grand Enchanteur',   bonus: { activePower: 0.5, bonusFortune: 4 } }
    ]
  }
};

// Actions de combat des branches de classe (1×/combat par héros).
const AWAKEN_ACTIVES = {
  duelliste:  { icon: '⚔️', label: 'Riposte assurée', desc: 'coup critique garanti + 1 palier de Garde' },
  erudit:     { icon: '📘', label: 'Surcharge',       desc: 'décharge arcanique sur tous les ennemis (MAG × 1,2)' },
  occultiste: { icon: '🌑', label: 'Saignée',         desc: 'saignement sur tous les ennemis, soigne 10 % des PV' },
  gardien:    { icon: '🛡️', label: 'Interposition',   desc: '+2 paliers de Garde et Protego sur l\'allié' },
  enchanteur: { icon: '✨', label: 'Faveur',          desc: 'soigne 20 % des PV du groupe et dissipe ses altérations' }
};

// ── Helpers PURS ─────────────────────────────────────────────
function awakenPointsEarned(level) { return Math.max(0, Math.floor((level | 0) / 2)); }

function awakenNodeCost(node) {
  return node && node.rank ? AWAKEN_RANKS[node.rank].cost : 1;
}

function awakenNodeWeight(node) {
  let w = node && node.active ? AWAKEN_ACTIVE_WEIGHT : 0;
  for (const [k, v] of Object.entries((node && node.bonus) || {})) w += (AWAKEN_WEIGHTS[k] || 0) * v;
  return Math.round(w * 100) / 100;
}

// Nœud par id, avec sa branche : 'trunk', nom de Maison, ou 'class:<archétype>'.
function awakenFindNode(id) {
  const t = AWAKEN_TREE.trunk.find(n => n.id === id);
  if (t) return { node: t, branch: 'trunk' };
  for (const [house, nodes] of Object.entries(AWAKEN_TREE.houses)) {
    const n = nodes.find(x => x.id === id);
    if (n) return { node: n, branch: house };
  }
  for (const [arch, nodes] of Object.entries(AWAKEN_TREE.classes)) {
    const n = nodes.find(x => x.id === id);
    if (n) return { node: n, branch: 'class:' + arch };
  }
  return null;
}

// Une branche est-elle ouverte à ce héros ? (tronc, sa Maison, sa classe)
function _awakenBranchOpen(branch, house, arch) {
  return branch === 'trunk' || branch === house || branch === 'class:' + arch;
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

// Raison du refus, ou null si le nœud peut être pris. `house` = chosenHouse,
// `arch` = archétype du héros (heroArchetype).
function awakenCanTake(c, id, level, house, arch) {
  const f = awakenFindNode(id);
  if (!f) return 'inconnu';
  const taken = (c && c.awakenNodes) || [];
  if (taken.includes(id)) return 'déjà pris';
  if (!_awakenBranchOpen(f.branch, house, arch)) {
    return f.branch.startsWith('class:') ? 'autre classe' : 'autre Maison';
  }
  if (f.node.rank && awakenSpentIn(taken, f.branch) < AWAKEN_RANKS[f.node.rank].req) {
    return `${AWAKEN_RANKS[f.node.rank].req} pts requis dans la branche`;
  }
  if (awakenPointsAvailable(c, level) < awakenNodeCost(f.node)) return 'points insuffisants';
  return null;
}

// Somme des bonus des nœuds pris (PUR). Un nœud d'une autre Maison ou d'une
// autre classe est ignoré. L'actif possédé est noté dans `out.active`.
function awakenBonuses(c, house, arch) {
  const out = {};
  for (const id of (c && c.awakenNodes) || []) {
    const f = awakenFindNode(id);
    if (!f || !_awakenBranchOpen(f.branch, house, arch)) continue;
    for (const [k, v] of Object.entries(f.node.bonus)) out[k] = Math.round(((out[k] || 0) + v) * 1000) / 1000;
    if (f.node.active) out.active = f.node.active;
  }
  return out;
}

// Bonus courant d'un héros, mémorisé par recalculateStats (c._awaken).
function awakenStat(c, key) { return (c && c._awaken && c._awaken[key]) || 0; }

// ── Action ───────────────────────────────────────────────────
function _awakenLevel() { return (typeof player !== 'undefined' && player) ? (player.level | 0) : 1; }
function _awakenHouse() { return (typeof chosenHouse !== 'undefined') ? chosenHouse : null; }
function _awakenArch(c) {
  if (typeof heroArchetype !== 'function') return null;
  const i = party.indexOf(c);
  return heroArchetype(c, i < 0 ? 0 : i);
}

function awakenTakeNode(charIdx, id) {
  const c = party[charIdx];
  if (!c) return false;
  const why = awakenCanTake(c, id, _awakenLevel(), _awakenHouse(), _awakenArch(c));
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

// ── Action de classe en combat (Lot 4.5) ─────────────────────
// awakenActiveUsed[idx] : combat-scoped (remis à zéro par startBattle).
let awakenActiveUsed = [false, false];

// Actif disponible pour le héros actif, ou null.
function awakenActiveFor(idx) {
  const c = party[idx];
  if (!c || c.hp <= 0) return null;
  const id = c._awaken && c._awaken.active;
  if (!id || awakenActiveUsed[idx]) return null;
  return AWAKEN_ACTIVES[id] ? { id, def: AWAKEN_ACTIVES[id] } : null;
}

function triggerAwakenActive() {
  if (!inBattle) return false;
  const idx = currentBattleChar;
  const av = awakenActiveFor(idx);
  if (!av) return false;
  const char = party[idx];
  const p = 1 + awakenStat(char, 'activePower');
  awakenActiveUsed[idx] = true;
  const enemies = livingEnemies();
  let log = '';
  if (av.id === 'duelliste') {
    const enemy = enemies[0];
    if (enemy) {
      const effDef = Math.max(0, (enemy.def || 0) * (1 - _strPenFrac(char.str)));
      const dmg = Math.max(1, Math.floor(mitigatedDamage(char.atk + 3, effDef) * (char.critMultiplier || 1.5) * p));
      enemy.currentHp -= dmg;
      UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(enemy)}`, dmg, 'crit');
      log = `frappe ${enemy.name} : ${dmg} dégâts critiques`;
    }
    guardTurns[idx] = Math.min(3, (guardTurns[idx] || 0) + 1);
  } else if (av.id === 'erudit') {
    const dmg = Math.max(1, Math.floor((char.mag || 0) * 1.2 * p));
    for (const e of enemies) { e.currentHp -= dmg; UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg'); }
    log = `décharge ${dmg} dégâts sur ${enemies.length} ennemi${enemies.length > 1 ? 's' : ''}`;
  } else if (av.id === 'occultiste') {
    const pow = Math.max(1, Math.floor((char.mag || 0) * 0.4 * p));
    for (const e of enemies) applyStatus(e, 'bleed', pow, 3);
    const heal = Math.min(char.hpMax - char.hp, Math.ceil(char.hpMax * 0.10 * p));
    char.hp += Math.max(0, heal);
    log = `fait saigner ${enemies.length} ennemi${enemies.length > 1 ? 's' : ''} (${pow}/tour) et reprend ${Math.max(0, heal)} PV`;
  } else if (av.id === 'gardien') {
    guardTurns[idx] = Math.min(3, (guardTurns[idx] || 0) + 2);
    const ally = activeParty().findIndex((c, i) => i !== idx && c.hp > 0);
    const target = ally >= 0 ? ally : idx;
    shieldTurns[target] = Math.max(shieldTurns[target] || 0, p > 1 ? 2 : 1);
    log = `se dresse en rempart (Garde ×${guardTurns[idx]}) et protège ${party[target].name}`;
  } else if (av.id === 'enchanteur') {
    let healed = 0;
    activeParty().forEach(c => {
      if (c.hp <= 0) return;
      const h = Math.min(c.hpMax - c.hp, Math.ceil(c.hpMax * 0.20 * p));
      c.hp += Math.max(0, h); healed += Math.max(0, h);
      if (Array.isArray(c.statusEffects)) c.statusEffects = c.statusEffects.filter(s => s.id === 'regen');
    });
    log = `répand sa faveur : +${healed} PV au groupe, altérations dissipées`;
  }
  const msg = `${av.def.icon} ${char.name} — ${av.def.label} : ${log}.`;
  setBattleLog(msg);
  addMsg(msg, 'good');
  UX_safe.logCombat(`🌟 <b>${char.name}</b> — ${av.def.label} : ${log}`, 'magic');
  UX_safe.combatBanner(`${av.def.icon} ${av.def.label}`, 'rune');
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return true;
  advanceBattleChar();
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
    activePower: v => `action de classe +${Math.round(v * 100)} %`,
    spellLifesteal: v => `vol de vie de sort ${Math.round(v * 100)} %`,
    spellCostReduc: v => `−${Math.round(v * 100)} % coût des sorts`,
    stepRegen: v => `+${v} PV par pas hors combat`
  };
  return Object.entries(bonus).map(([k, v]) => (L[k] ? L[k](v) : k)).join(', ');
}
function _awakenNodeText(node) {
  if (node.active && AWAKEN_ACTIVES[node.active]) return `🌟 Action de combat : ${AWAKEN_ACTIVES[node.active].desc} (1×/combat)`;
  return _awakenBonusText(node.bonus);
}

function _awakenNodeHtml(c, node, level, house, arch) {
  const taken = (c.awakenNodes || []).includes(node.id);
  const why = taken ? null : awakenCanTake(c, node.id, level, house, arch);
  const state = taken ? 'taken' : (why ? 'locked' : 'open');
  const cost = awakenNodeCost(node);
  const esc = (typeof htmlEscape === 'function') ? htmlEscape : (s => s);
  const title = `${node.name} — ${_awakenNodeText(node)} (${cost} pt${cost > 1 ? 's' : ''})${why && !taken ? ' · ' + why : ''}`;
  const click = state === 'open' ? ` onclick="_awakenConfirm(${_awakenCharIdx}, '${node.id}')"` : '';
  return `<button class="awaken-node awaken-${state}" data-node="${node.id}" title="${esc(title)}"${state !== 'open' ? ' disabled' : ''}${click}>
    <span class="awaken-node-icon">${node.icon}</span>
    <span class="awaken-node-name">${esc(node.name)}</span>
    <span class="awaken-node-desc">${esc(_awakenNodeText(node))}</span>
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
  const arch = _awakenArch(c);
  const ranksOf = nodesAll => [1, 2, 3, 4].map(r => {
    const nodes = nodesAll.filter(n => n.rank === r);
    if (!nodes.length) return '';
    const label = r === 4 ? 'Capital' : `Rang ${r}`;
    return `<div class="awaken-rank"><div class="awaken-rank-label">${label} · ${AWAKEN_RANKS[r].req} pts investis</div>
      <div class="awaken-grid">${nodes.map(n => _awakenNodeHtml(c, n, level, house, arch)).join('')}</div></div>`;
  }).join('');
  const ranks = ranksOf((house && AWAKEN_TREE.houses[house]) || []);
  const classNodes = (arch && AWAKEN_TREE.classes[arch]) || [];
  const archDef = (typeof CLASS_ARCHETYPES !== 'undefined' && arch) ? CLASS_ARCHETYPES[arch] : null;
  const classHtml = classNodes.length && archDef
    ? `<h4 class="awaken-branch-title">Branche ${archDef.icon} ${archDef.label} <span class="awaken-points-note">(${awakenSpentIn(c.awakenNodes, 'class:' + arch)} pts investis)</span></h4>${ranksOf(classNodes)}`
    : '';
  body.innerHTML = `
    ${tabs ? `<div class="codex-tabs">${tabs}</div>` : ''}
    <div class="awaken-points" aria-live="polite">🌟 Points d'Éveil : <b>${avail}</b>
      <span class="awaken-points-note">(1 tous les 2 niveaux — choix permanents)</span></div>
    <h4 class="awaken-branch-title">Tronc commun</h4>
    <div class="awaken-grid">${AWAKEN_TREE.trunk.map(n => _awakenNodeHtml(c, n, level, house, arch)).join('')}</div>
    ${house ? `<h4 class="awaken-branch-title">Branche ${house} <span class="awaken-points-note">(${awakenSpentIn(c.awakenNodes, house)} pts investis)</span></h4>${ranks}` : ''}
    ${classHtml}`;
}

function _awakenConfirm(charIdx, id) {
  const f = awakenFindNode(id);
  if (!f) return;
  const ask = (typeof confirmModal === 'function')
    ? confirmModal({ title: `${f.node.icon} ${f.node.name}`, body: `${_awakenNodeText(f.node)}. Ce choix est permanent.`, confirmLabel: 'Éveiller' })
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
window.triggerAwakenActive = triggerAwakenActive;
window.awakenActiveFor = awakenActiveFor;
window.openSkillTree = openSkillTree;
window.closeSkillTree = closeSkillTree;
window.renderSkillTree = renderSkillTree;
window._awakenConfirm = _awakenConfirm;
