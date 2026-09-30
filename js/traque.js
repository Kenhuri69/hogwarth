// ============================================================
// TRAQUES RITUELLES (Lot 3, revue-design-progression-2026-07 Partie IV)
// ============================================================
// Farming volontaire : une fois la licence reçue (chef de Maison ou Gardien
// de la Boucle), chaque étage propose un contrat « abats N créatures de telle
// catégorie ». Honoré, il paie des Marques de Traque 🏹, d'autant plus que
// l'étage a été poncé (floorKillCount). 2 contrats au plus par visite d'étage.
// Les Marques ne viennent QUE des contrats. Débouchés : respec Forge /
// Bibliothèque, échange contre matériaux chez le Gardien.
// État (state.js, sérialisé) : hunterMarks, traqueUnlocked, traqueContract.
// Plan : .claude/plans/lot3-traques-rituelles-2026-09.md
// ============================================================

const TRAQUE_GIVERS = ['mcgonagall', 'rogue', 'flitwick', 'sprout', 'gardien_boucle'];
const TRAQUE_CAP_PER_VISIT = 2;
const TRAQUE_RESPEC_MARKS  = 5;   // respec Forge/Biblio payé en Marques
const TRAQUE_EXCHANGE_COST = 4;   // Marques → 1 matériau (taux défavorable)
const TRAQUE_EXCHANGE_ITEMS = ['essence_tenebres', 'page_grimoire'];
const TRAQUE_CATEGORY_PLURAL = {
  'bête': 'bêtes', 'humain': 'humains', 'fantôme': 'fantômes',
  'créature': 'créatures', 'être magique': 'êtres magiques'
};

// Multiplicateur de densité (PUR) — seuils alignés sur floorVisitLabel :
// « hostile » (n = 4-5) ×2, « redouté » (n ≥ 6) ×3.
function traqueDensityMult(kills) {
  const n = Math.floor((kills | 0) / 4);
  if (n >= 6) return 3;
  if (n >= 4) return 2;
  return 1;
}
function traqueMarksFor(kills) { return traqueDensityMult(kills); }

// Tirage d'un contrat (PUR) : catégorie pondérée par le poids du pool,
// N selon la part de la catégorie (rare → 3, commune → 5).
function traqueDrawContract(pool, rng) {
  const r = (typeof rng === 'function') ? rng : Math.random;
  const w = {};
  let total = 0;
  for (const m of pool || []) {
    if (!m || !m.category) continue;
    const k = m.weight > 0 ? m.weight : 1;
    w[m.category] = (w[m.category] || 0) + k;
    total += k;
  }
  const cats = Object.keys(w);
  if (!cats.length) return null;
  let roll = r() * total, category = cats[cats.length - 1];
  for (const c of cats) { roll -= w[c]; if (roll < 0) { category = c; break; } }
  const share = w[category] / total;
  const amount = share < 0.25 ? 3 : share < 0.45 ? 4 : 5;
  return { category, amount };
}

function _traqueFloorPool(floor) {
  if (typeof MONSTERS === 'undefined') return [];
  const ef = (typeof effectiveFloor === 'function') ? effectiveFloor(floor) : floor;
  return MONSTERS.filter(m =>
    !m.questOnly && m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor));
}

function _traqueSuspended() {
  if (typeof visitSession !== 'undefined' && visitSession) return true;
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) return true;
  return false;
}

function traqueLabel(c) {
  if (!c) return '';
  return `${c.amount} ${TRAQUE_CATEGORY_PLURAL[c.category] || c.category}`;
}

// Nouveau contrat sur l'étage courant. `honored` = contrats déjà honorés
// pendant cette visite.
function _traqueNewContract(honored) {
  const drawn = traqueDrawContract(_traqueFloorPool(currentFloor));
  traqueContract = drawn
    ? { floor: currentFloor, category: drawn.category, amount: drawn.amount, progress: 0, honored: honored | 0 }
    : null;
  return traqueContract;
}

// Entrée d'étage (movement-floors.js _changeFloor) : contrat neuf, compteur
// de visite remis à zéro.
function traqueOnFloorEnter() {
  if (!traqueUnlocked || _traqueSuspended()) return null;
  const c = _traqueNewContract(0);
  if (c && typeof addMsg === 'function') {
    addMsg(`🏹 Traque de l'étage : abats ${traqueLabel(c)}.`, 'magic');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return c;
}

// Fin de combat gagné (battle-rewards.js endBattle) : progression.
function traqueOnBattleWon(enemies) {
  const c = traqueContract;
  if (!traqueUnlocked || !c || _traqueSuspended()) return 0;
  if (c.floor !== currentFloor || c.progress >= c.amount) return 0;
  const hits = (enemies || []).filter(e => e && !e.isDuelist && e.category === c.category).length;
  if (!hits) return 0;
  c.progress = Math.min(c.amount, c.progress + hits);
  if (c.progress >= c.amount) return _traqueHonor();
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return 0;
}

function _traqueHonor() {
  const c = traqueContract;
  const kills = (typeof floorKillCount !== 'undefined') ? (floorKillCount.get(currentFloor) || 0) : 0;
  const mult = traqueDensityMult(kills);
  const marks = traqueMarksFor(kills);
  hunterMarks += marks;
  const honored = (c.honored | 0) + 1;
  if (typeof addMsg === 'function') {
    addMsg(`🏹 Traque honorée : +${marks} Marque${marks > 1 ? 's' : ''} de Traque${mult > 1 ? ` (×${mult}, étage poncé)` : ''}.`, 'good');
  }
  if (window.BalanceLog) BalanceLog.record('traque', { marks, mult });
  if (honored < TRAQUE_CAP_PER_VISIT) {
    const next = _traqueNewContract(honored);
    if (next && typeof addMsg === 'function') addMsg(`🏹 Nouvelle traque : abats ${traqueLabel(next)}.`, 'magic');
  } else {
    traqueContract = { ...c, progress: c.amount, honored };
    if (typeof addMsg === 'function') addMsg("🏹 L'étage n'a plus de traque à offrir cette fois. Reviens-y plus tard.", 'info');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return marks;
}

// Contrat affichable dans le suivi : actif sur l'étage courant et non épuisé.
function traqueActiveContract() {
  const c = traqueContract;
  if (!traqueUnlocked || !c || _traqueSuspended()) return null;
  if (c.floor !== currentFloor || c.progress >= c.amount) return null;
  return c;
}

// ── Licence (dialogue des donneurs) ─────────────────────────
function traqueGiverActions(npc) {
  if (!npc || !TRAQUE_GIVERS.includes(npc.id)) return [];
  const out = [];
  if (!traqueUnlocked) {
    out.push({ label: '🏹 Recevoir le Sceau de Traque', onClick: `unlockTraque(); openNpcDialog('${npc.id}');` });
  } else if (npc.id === 'gardien_boucle') {
    for (const id of TRAQUE_EXCHANGE_ITEMS) {
      const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
      if (!it) continue;
      out.push({
        label: `🏹 ${TRAQUE_EXCHANGE_COST} Marques → ${it.name} (${hunterMarks})`,
        onClick: `exchangeHunterMarks('${id}'); openNpcDialog('${npc.id}');`
      });
    }
  }
  return out;
}

function unlockTraque() {
  if (traqueUnlocked) return false;
  traqueUnlocked = true;
  if (typeof addMsg === 'function') {
    addMsg("🏹 Sceau de Traque reçu : chaque étage te proposera désormais une traque. Plus tu ponces un étage, plus elle paie.", 'magic');
  }
  traqueOnFloorEnter();
  if (typeof autoSave === 'function') autoSave('traque-unlock');
  return true;
}

function exchangeHunterMarks(itemId) {
  if (!TRAQUE_EXCHANGE_ITEMS.includes(itemId)) return false;
  if (hunterMarks < TRAQUE_EXCHANGE_COST) {
    if (typeof addMsg === 'function') addMsg(`🏹 ${TRAQUE_EXCHANGE_COST} Marques requises (tu en as ${hunterMarks}).`, 'bad');
    return false;
  }
  const it = ITEMS.find(i => i.id === itemId);
  if (!it || typeof tryAddItem !== 'function' || !tryAddItem(it, { silent: true })) {
    if (typeof addMsg === 'function') addMsg('Sac plein : impossible de recevoir le matériau.', 'bad');
    return false;
  }
  hunterMarks -= TRAQUE_EXCHANGE_COST;
  if (typeof addMsg === 'function') addMsg(`🏹 Échange : −${TRAQUE_EXCHANGE_COST} Marques → ${it.name}.`, 'good');
  if (typeof autoSave === 'function') autoSave('traque-exchange');
  return true;
}

// ── Respec payé en Marques (Forge / Bibliothèque) ───────────
// Bascule UI (non sérialisée) : le panneau de respec paie en or ou en Marques.
let traqueRespecPayMarks = false;
function traqueToggleRespecPay() { traqueRespecPayMarks = !traqueRespecPayMarks; }

function traqueRespecAffordable(goldCost) {
  if (traqueRespecPayMarks) return hunterMarks >= TRAQUE_RESPEC_MARKS;
  return (player.gold | 0) >= goldCost;
}

// Prélève le coût du respec (or ou Marques). false + message si insuffisant.
function traqueRespecCharge(goldCost) {
  if (traqueRespecPayMarks) {
    if (hunterMarks < TRAQUE_RESPEC_MARKS) {
      addMsg(`Reforger la voie : ${TRAQUE_RESPEC_MARKS} Marques de Traque requises (vous en avez ${hunterMarks}).`, 'bad');
      return false;
    }
    hunterMarks -= TRAQUE_RESPEC_MARKS;
    return true;
  }
  if ((player.gold | 0) < goldCost) {
    addMsg(`Reforger la voie : ${goldCost} Gallions requis (vous en avez ${player.gold | 0}).`, 'bad');
    return false;
  }
  player.gold -= goldCost;
  return true;
}

// Libellé du coût + bouton de bascule, pour les panneaux de respec.
function traqueRespecCostLabel(goldCost) {
  return traqueRespecPayMarks ? `🏹${TRAQUE_RESPEC_MARKS}` : `${goldCost}g`;
}
function traqueRespecToggleHtml(btnClass, reopenCall) {
  if (!traqueUnlocked && hunterMarks <= 0) return '';
  const lbl = traqueRespecPayMarks ? 'Payer en or' : `Payer en Marques (🏹${TRAQUE_RESPEC_MARKS})`;
  return `<button class="${btnClass}" onclick="traqueToggleRespecPay(); ${reopenCall}">${lbl}</button>`;
}

window.traqueDensityMult = traqueDensityMult;
window.traqueMarksFor = traqueMarksFor;
window.traqueDrawContract = traqueDrawContract;
window.traqueOnFloorEnter = traqueOnFloorEnter;
window.traqueOnBattleWon = traqueOnBattleWon;
window.traqueActiveContract = traqueActiveContract;
window.traqueGiverActions = traqueGiverActions;
window.unlockTraque = unlockTraque;
window.exchangeHunterMarks = exchangeHunterMarks;
window.traqueToggleRespecPay = traqueToggleRespecPay;
window.traqueRespecAffordable = traqueRespecAffordable;
window.traqueRespecCharge = traqueRespecCharge;
window.traqueRespecCostLabel = traqueRespecCostLabel;
window.traqueRespecToggleHtml = traqueRespecToggleHtml;
window.traqueLabel = traqueLabel;
