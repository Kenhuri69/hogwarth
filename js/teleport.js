// ============================================================
// SORT DE TÉLÉPORTATION — Portus
// ------------------------------------------------------------
// Exposé via 3 entrées :
//   - openCombatTeleportChoice()       : ouvre l'A/B (groupe vs ennemi) en combat
//   - teleportEnemyAway(enemyIdx)      : bannit l'ennemi sélectionné
//   - openOutOfCombatTeleport(charIdx) : ouvre la modale de choix d'étage
// Le routage `castSpellInBattle` (battle-spells.js) appelle les helpers.
// ============================================================

// IDs hardcodés des boss intouchables par Portus, en plus du seuil danger ≥ 10.
const _PORTUS_BOSS_IDS = new Set([
  'bellatrix', 'voldemort_affaibli', 'voldemort_revenu'
]);

// Cooldowns (cf. .claude/plans/teleportation-spell.md §"Itération 2") :
//   - PORTUS_OOC_CD_TURNS   : transitions d'étage avant réarmement hors combat.
//   - PORTUS_FIGHT_CD_WINS  : combats à gagner avant réarmement en combat.
// Les compteurs courants vivent dans state.js (portusOocCooldown,
// portusFightCooldown) pour être persistés via _serializeState.
const PORTUS_OOC_CD_TURNS  = 2;
const PORTUS_FIGHT_CD_WINS = 3;

// Probabilité d'événement à l'arrivée hors combat (12 %), réparti 50/50
// entre positif (heal HP only) et négatif (piège ou ennemi 50/50).
const PORTUS_EVENT_CHANCE = 0.12;

// Flag combat — 1 utilisation max par combat. Reset par battle.js — startBattle.
let _teleportUsedThisFight = false;
function _resetTeleportFightFlag() { _teleportUsedThisFight = false; }

// Renvoie une coordonnée {x,y} d'une cellule FLOOR libre (pas d'ennemi, pas
// le joueur). Si `targetFloor` correspond à l'étage courant, on s'appuie
// directement sur `dungeon` / `enemyMap`. Sinon on lit le cache
// `floorDungeons[targetFloor]`. Retourne null si rien n'est libre.
function _pickRandomFreeCell(targetFloor, opts = {}) {
  const sameFloor = targetFloor === currentFloor;
  const grid = sameFloor ? dungeon : (floorDungeons[targetFloor] && floorDungeons[targetFloor].dungeon);
  const enemies = sameFloor ? enemyMap : (floorDungeons[targetFloor] && floorDungeons[targetFloor].enemyMap);
  if (!grid) return null;

  const avoidPlayer = !!opts.avoidPlayer;
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] !== CELL.FLOOR) continue;
      if (enemies && enemies[y] && enemies[y][x]) continue;
      if (avoidPlayer && sameFloor && x === playerX && y === playerY) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Identifie un boss : `danger >= 10` ou ID listé. Tolérant aux saves
// anciennes qui n'auraient pas le champ danger.
function _isBossEnemy(enemy) {
  if (!enemy) return false;
  if (enemy.id && _PORTUS_BOSS_IDS.has(enemy.id)) return true;
  if (typeof enemy.danger === 'number' && enemy.danger >= 10) return true;
  return false;
}

// ── Combat : choix A/B (groupe vs ennemi) ───────────────────
// Ouvre un overlay personnalisé réutilisant #target-selection pour le
// rendu mobile-friendly (boutons gros et bien séparés). Le sort est déjà
// payé en PM par castSpellInBattle avant cet appel.
function openCombatTeleportChoice() {
  const sel = safeEl('target-selection');
  const buttons = safeEl('target-buttons');
  if (!sel || !buttons) return;
  const enemies = livingEnemies();
  const onlyOneEnemy = enemies.length <= 1;
  const everyoneIsBoss = enemies.every(_isBossEnemy);

  // Label custom au-dessus des boutons (le span enfant est interne à #target-selection)
  const titleEl = sel.querySelector('div');
  if (titleEl) titleEl.textContent = 'PORTUS — CHOISIR LA CIBLE';

  const enemyBtnDisabled = onlyOneEnemy || everyoneIsBoss;
  const enemyHint = onlyOneEnemy
    ? '(impossible : un seul ennemi)'
    : (everyoneIsBoss ? '(impossible : boss intouchable)' : 'Bannit un ennemi du combat');

  buttons.innerHTML = `
    <button class="cmd-btn" style="flex:1 1 45%;min-width:140px;padding:12px;font-size:13px"
            onclick="_resolveTeleportPartyChoice()">
      🌀 Téléporter mon groupe
      <div style="font-size:10px;color:#a08060;margin-top:3px">Fuite tactique</div>
    </button>
    <button class="cmd-btn" style="flex:1 1 45%;min-width:140px;padding:12px;font-size:13px${enemyBtnDisabled ? ';opacity:.45;cursor:not-allowed' : ''}"
            ${enemyBtnDisabled ? 'disabled' : 'onclick="_resolveTeleportEnemyChoice()"'}>
      👹 Téléporter un ennemi
      <div style="font-size:10px;color:#a08060;margin-top:3px">${enemyHint}</div>
    </button>
    <button class="cmd-btn" style="flex:1 1 100%;opacity:.7;padding:10px"
            onclick="_cancelTeleportChoice()">
      ← Annuler
    </button>
  `;
  sel.style.display = 'flex';
}

function _cancelTeleportChoice() {
  // Rembourse les PM et conserve le tour.
  const char = getActiveChar();
  const spell = SPELLS.find(s => s.name === 'Portus');
  if (char && spell) char.sp = Math.min(char.spMax, char.sp + spell.cost);
  _teleportUsedThisFight = false;
  const sel = safeEl('target-selection');
  if (sel) sel.style.display = 'none';
  setBattleLog('Téléportation annulée.');
  updateUI();
}

function _resolveTeleportPartyChoice() {
  const sel = safeEl('target-selection');
  if (sel) sel.style.display = 'none';
  _teleportUsedThisFight = true;
  if (typeof portusFightCooldown === 'number') portusFightCooldown = PORTUS_FIGHT_CD_WINS;
  // On marque la fuite réussie ; pas d'XP/loot — endBattle(false) gère ça.
  endBattle(false);
  // Re-positionner sur une case libre du même étage.
  const cell = _pickRandomFreeCell(currentFloor, { avoidPlayer: true });
  if (cell) {
    playerX = cell.x; playerY = cell.y;
    visited[playerY][playerX] = true;
    updateCompass(); renderMinimap(); drawDungeon(); updateUI();
  }
  setNarrative('Le groupe disparaît dans un éclat bleu-violet et réapparaît plus loin.');
  if (typeof addMsg === 'function') {
    addMsg('🌀 Portus : fuite tactique réussie.', 'magic');
  }
}

function _resolveTeleportEnemyChoice() {
  const sel = safeEl('target-selection');
  if (sel) sel.style.display = 'none';
  // Sélection de cible classique : on filtre les ennemis ciblables.
  const targets = enemyGroup
    .map((e, i) => ({ e, i }))
    .filter(o => o.e.currentHp > 0 && !_isBossEnemy(o.e));
  if (targets.length === 0) {
    // Garde-fou : rien à téléporter, on annule (rembourse PM).
    _cancelTeleportChoice();
    return;
  }
  if (targets.length === 1) {
    teleportEnemyAway(targets[0].i);
    return;
  }
  // Affiche un sélecteur ennemis (boutons larges, mobile-friendly).
  const buttons = safeEl('target-buttons');
  const selOverlay = safeEl('target-selection');
  if (!buttons || !selOverlay) return;
  const titleEl = selOverlay.querySelector('div');
  if (titleEl) titleEl.textContent = 'PORTUS — CIBLE À BANNIR';
  buttons.innerHTML = targets.map(o => `
    <button class="cmd-btn" style="flex:1 1 45%;min-width:120px;padding:12px;font-size:13px"
            onclick="teleportEnemyAway(${o.i})">
      ${o.e.icon || '👹'} ${o.e.name}
    </button>
  `).join('') + `
    <button class="cmd-btn" style="flex:1 1 100%;opacity:.7;padding:10px"
            onclick="_cancelTeleportChoice()">← Annuler</button>
  `;
  selOverlay.style.display = 'flex';
}

// Bannit l'ennemi en `enemyIdx` : retire du combat (aucun XP/loot) et
// le replace sur une case libre du même étage via enemyMap.
function teleportEnemyAway(enemyIdx) {
  const enemy = enemyGroup[enemyIdx];
  if (!enemy || enemy.currentHp <= 0) return;
  if (_isBossEnemy(enemy)) {
    addMsg(`${enemy.name} résiste à la téléportation !`, 'bad');
    return;
  }
  _teleportUsedThisFight = true;
  if (typeof portusFightCooldown === 'number') portusFightCooldown = PORTUS_FIGHT_CD_WINS;
  const cell = _pickRandomFreeCell(currentFloor, { avoidPlayer: true });
  if (cell && enemyMap) {
    // Restaure les HP à 100 % au moment du replace (l'ennemi original est consommé).
    enemyMap[cell.y][cell.x] = { ...enemy, currentHp: enemy.hp, statusEffects: [] };
  }
  // Retire l'ennemi de l'enemyGroup sans donner d'XP/loot.
  enemyGroup.splice(enemyIdx, 1);
  setBattleLog(`🌀 ${enemy.name} disparaît dans un vortex !`);
  if (typeof addMsg === 'function') addMsg(`🌀 Portus : ${enemy.name} banni du combat.`, 'magic');
  UX_safe.logCombat(`🌀 ${enemy.name} est <b>banni</b> du combat (aucun XP).`, 'magic');
  // Cache la sélection.
  const sel = safeEl('target-selection');
  if (sel) sel.style.display = 'none';
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

// ── Hors combat : modale de choix d'étage ───────────────────
// charIdx : qui paie le PM (Harry par défaut). Affichage gros boutons.
function openOutOfCombatTeleport(charIdx) {
  if (inBattle) return;
  if (!Array.isArray(party) || !party.length) return;
  const ci = (typeof charIdx === 'number') ? charIdx : 0;
  const caster = party[ci] || party[0];
  if (!caster || caster.hp <= 0) {
    addMsg(`${caster ? caster.name : 'Le sorcier'} ne peut pas lancer Portus.`, 'bad');
    return;
  }
  if (typeof portusOocCooldown === 'number' && portusOocCooldown > 0) {
    addMsg(`Portus se recharge — encore ${portusOocCooldown} transition${portusOocCooldown > 1 ? 's' : ''} d'étage.`, 'bad');
    return;
  }
  const spell = SPELLS.find(s => s.name === 'Portus');
  if (!spell) return;
  const cost = spell.outOfCombatCost || spell.cost;
  if (caster.sp < cost) {
    addMsg(`Pas assez de magie pour Portus (${cost} PM requis).`, 'bad');
    return;
  }
  // Liste des étages visités, hors étage courant.
  const floors = Array.from(visitedFloors || [])
    .map(n => parseInt(n, 10))
    .filter(n => Number.isFinite(n) && n !== currentFloor)
    .sort((a, b) => a - b);
  // Construit l'overlay réutilisant #spell-modal (déjà responsive).
  const list = safeEl('spell-list');
  if (!list) return;
  let inner = `
    <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);letter-spacing:1px;text-align:center;margin-bottom:8px">
      🌀 PORTUS — DESTINATION
    </div>
    <div style="font-size:11px;color:#8a7050;text-align:center;margin-bottom:10px">
      ${caster.icon} ${caster.name.split(' ')[0]} canalise — ${cost} PM
    </div>
  `;
  if (floors.length === 0) {
    inner += `
      <div style="padding:12px;text-align:center;color:#a08060;font-style:italic">
        Aucun autre étage visité pour le moment.<br>
        Explorez puis revenez utiliser Portus.
      </div>
      <button class="cmd-btn" style="width:100%;margin-top:10px;opacity:.85"
        onclick="closeModal('spell-modal')">← Fermer</button>
    `;
  } else {
    const locName = (i) => (typeof LOCATIONS !== 'undefined' && LOCATIONS[Math.min(i - 1, LOCATIONS.length - 1)]) || `Niveau ${i}`;
    const grid = floors.map(f => `
      <button class="cmd-btn" style="padding:12px 10px;font-size:13px;text-align:left"
              onclick="confirmTeleport(${f},${ci})">
        <div style="font-family:'Cinzel',serif;color:var(--gold)">Niveau ${f}</div>
        <div style="font-size:10px;color:#8a7050;margin-top:2px">${locName(f)}</div>
      </button>
    `).join('');
    inner += `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${grid}
      </div>
      <button class="cmd-btn" style="width:100%;margin-top:12px;opacity:.7"
        onclick="closeModal('spell-modal')">← Annuler</button>
    `;
  }
  list.innerHTML = inner;
  safeEl('spell-modal').style.display = 'flex';
}

// Confirmation native (mobile-friendly) puis exécution.
function confirmTeleport(targetFloor, charIdx) {
  const caster = party[charIdx] || party[0];
  if (!caster) return;
  const spell = SPELLS.find(s => s.name === 'Portus');
  const cost  = (spell && spell.outOfCombatCost) || (spell && spell.cost) || 38;
  if (typeof confirm === 'function') {
    const locName = (typeof LOCATIONS !== 'undefined' && LOCATIONS[Math.min(targetFloor - 1, LOCATIONS.length - 1)]) || `Niveau ${targetFloor}`;
    if (!confirm(`Téléporter le groupe vers le Niveau ${targetFloor} (${locName}) pour ${cost} PM ?`)) {
      return;
    }
  }
  closeModal('spell-modal');
  teleportOutOfCombat(targetFloor, charIdx);
}

// Exécute la téléportation hors combat. Reproduit la mécanique de
// `goDeeper`/`goUp` (cache + transition d'étage) en allant directement
// à `targetFloor`. Le PM est consommé ici, pas avant.
function teleportOutOfCombat(targetFloor, charIdx) {
  if (inBattle) return;
  if (!visitedFloors || !visitedFloors.has(targetFloor)) {
    addMsg('Étage inconnu — vous ne pouvez pas vous y téléporter.', 'bad');
    return;
  }
  if (targetFloor === currentFloor) {
    addMsg('Vous êtes déjà sur cet étage.', 'bad');
    return;
  }
  const caster = party[charIdx] || party[0];
  if (!caster || caster.hp <= 0) { addMsg('Personne ne peut canaliser le sort.', 'bad'); return; }
  const spell = SPELLS.find(s => s.name === 'Portus');
  if (!spell) return;
  const cost = spell.outOfCombatCost || spell.cost;
  if (caster.sp < cost) { addMsg(`Pas assez de magie pour Portus (${cost} PM).`, 'bad'); return; }
  caster.sp -= cost;
  if (typeof portusOocCooldown === 'number') portusOocCooldown = PORTUS_OOC_CD_TURNS;

  AudioSystem.playSpellCast('Portus');
  AudioSystem.speakSpell('Portus');

  // Bascule d'étage : cache l'étage courant, restaure ou génère la cible.
  _saveFloorToCache(currentFloor);
  if (typeof _clearFarmingPreviews === 'function') _clearFarmingPreviews();
  currentFloor = targetFloor;
  visitedFloors.add(currentFloor);

  const locName = (typeof LOCATIONS !== 'undefined' && LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)]) || `Niveau ${currentFloor}`;

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Map();
      generateDungeon(currentFloor);
    }
    // Re-positionner sur une case libre random (Portus = arrivée imprécise).
    const cell = _pickRandomFreeCell(currentFloor, { avoidPlayer: false });
    if (cell) {
      playerX = cell.x; playerY = cell.y;
      visited[playerY][playerX] = true;
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    addMsg(`🌀 Portus : transporté au Niveau ${currentFloor} !`, 'magic');
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof checkFloorQuests === 'function') checkFloorQuests(currentFloor);

    // Événement aléatoire à l'arrivée (12 %), réparti 50/50 entre positif
    // (soin HP) et négatif (50/50 piège / monstre).
    _rollPortusArrivalEvent();
    updateUI();
    safeCall('autoSave', 'portus-teleport');
  });
  setNarrative(`Le groupe traverse un vortex bleu-violet vers ${locName}...`);
}

// Évent d'arrivée Portus — 12 % de déclencher, puis 50/50 positif/négatif.
// - Positif : soin HP only (3 + floor × 5 PV par perso vivant), pas de PM.
// - Négatif : 50/50 piège (perte HP) ou pop d'un ennemi scalé à l'étage
//   (déclenche immédiatement startBattle si possible).
function _rollPortusArrivalEvent() {
  if (Math.random() >= PORTUS_EVENT_CHANCE) return;
  if (Math.random() < 0.5) {
    // Positif — soin HP only.
    const heal = 3 + (currentFloor || 1) * 5;
    let healed = 0;
    party.slice(0, partySize).forEach(c => {
      if (c.hp <= 0) return;
      const before = c.hp;
      c.hp = Math.min(c.hpMax, c.hp + heal);
      healed += (c.hp - before);
    });
    if (healed > 0) {
      addMsg(`✨ Le vortex restaure ${healed} PV au groupe.`, 'good');
    } else {
      addMsg(`✨ Le vortex semblait bénéfique, mais le groupe est déjà au mieux.`, '');
    }
    return;
  }
  // Négatif — 50/50 piège ou ennemi.
  if (Math.random() < 0.5) {
    _portusTriggerTrap();
  } else {
    _portusTriggerAmbush();
  }
}

function _portusTriggerTrap() {
  const alive = party.slice(0, partySize).filter(c => c.hp > 0);
  if (alive.length === 0) return;
  const target = alive[Math.floor(Math.random() * alive.length)];
  const dmg = 4 + Math.ceil((currentFloor || 1) * 1.5);
  target.hp = Math.max(0, target.hp - dmg);
  addMsg(`💥 Piège runique à l'arrivée — ${target.name} perd ${dmg} PV.`, 'bad');
  if (typeof setNarrative === 'function') {
    setNarrative(`Un piège jaillit à l'arrivée — ${target.name} encaisse le choc.`);
  }
  if (party.slice(0, partySize).every(c => c.hp <= 0) && typeof triggerDeath === 'function') {
    triggerDeath('Le vortex de Portus a précipité le groupe dans un piège mortel...');
  }
}

function _portusTriggerAmbush() {
  if (typeof MONSTERS === 'undefined' || typeof scaleMonster !== 'function') return;
  const ef   = (typeof effectiveFloor === 'function') ? effectiveFloor(currentFloor) : currentFloor;
  const pool = MONSTERS.filter(m =>
    m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor) && !_PORTUS_BOSS_IDS.has(m.id)
  );
  if (!pool.length) return;
  const base  = (typeof weightedPick === 'function') ? weightedPick(pool) : pool[0];
  const enemy = scaleMonster(base, currentFloor);
  addMsg(`👁️ Le vortex attire l'attention — un ${enemy.name} surgit !`, 'bad');
  if (typeof setNarrative === 'function') {
    setNarrative(`Vous arrivez en plein milieu d'une présence hostile...`);
  }
  // Déclenche le combat — le startBattle gère renderEnemyGroup + audio.
  if (typeof startBattle === 'function') startBattle(enemy);
}

// Exposition globale (pour appels HTML inline et battle-spells.js)
window._resetTeleportFightFlag    = _resetTeleportFightFlag;
window.openCombatTeleportChoice   = openCombatTeleportChoice;
window._cancelTeleportChoice      = _cancelTeleportChoice;
window._resolveTeleportPartyChoice = _resolveTeleportPartyChoice;
window._resolveTeleportEnemyChoice = _resolveTeleportEnemyChoice;
window.teleportEnemyAway          = teleportEnemyAway;
window.openOutOfCombatTeleport    = openOutOfCombatTeleport;
window.confirmTeleport            = confirmTeleport;
window.teleportOutOfCombat        = teleportOutOfCombat;
