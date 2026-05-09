// ============================================================
// SAUVEGARDE ET CHARGEMENT
// ============================================================

const SAVE_LEGACY_KEY = 'hogwarts_rpg_save';
const SAVE_STORE_KEY  = 'hogwarts_rpg_saves';
const SAVE_STORE_VERSION = 1;
const MANUAL_SLOT_IDS = ['manual_1', 'manual_2', 'manual_3'];
const AUTO_SLOT_ID    = 'auto';
const ALL_SLOT_IDS    = [...MANUAL_SLOT_IDS, AUTO_SLOT_ID];

// ── Modèle multi-slots ──────────────────────────────────────

function _readStore() {
  const raw = localStorage.getItem(SAVE_STORE_KEY);
  if (!raw) return { version: SAVE_STORE_VERSION, slots: {} };
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') throw new Error('shape');
    obj.slots = obj.slots || {};
    return obj;
  } catch (e) {
    return { version: SAVE_STORE_VERSION, slots: {} };
  }
}

function _writeStore(store) {
  localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(store));
}

// Construit les méta-données affichables du slot à partir de l'état runtime.
function _buildSlotMeta(label) {
  const heroes = (party || []).filter(c => c && c.name).slice(0, partySize || 1);
  return {
    savedAt:    new Date().toISOString(),
    label:      label || 'Manuel',
    heroNames:  heroes.map(c => c.name),
    heroIcons:  heroes.map(c => c.imgSrc || c.icon || '🧙'),
    house:      chosenHouse || null,
    level:      (player && player.level) || 1,
    floor:      currentFloor || 1,
    difficulty: difficulty || 'Normal'
  };
}

// Récupère la liste triée des slots existants (auto en premier si présent).
function listSaveSlots() {
  const store = _readStore();
  const out = [];
  for (const id of ALL_SLOT_IDS) {
    const s = store.slots[id];
    if (s && s.meta) out.push({ id, meta: s.meta, isAuto: id === AUTO_SLOT_ID });
  }
  return out;
}

function readSlot(id) {
  if (!ALL_SLOT_IDS.includes(id)) return null;
  const store = _readStore();
  return store.slots[id] || null;
}

// Écrit l'état runtime courant dans le slot ; refuse les ids inconnus
// et l'écriture en plein combat. Retourne true si l'écriture a réussi.
function writeSlot(id, label) {
  if (!ALL_SLOT_IDS.includes(id)) return false;
  if (inBattle) return false;
  const store = _readStore();
  store.slots[id] = {
    meta:  _buildSlotMeta(label),
    state: _serializeState()
  };
  _writeStore(store);
  return true;
}

function deleteSlot(id) {
  if (!ALL_SLOT_IDS.includes(id)) return false;
  const store = _readStore();
  if (!store.slots[id]) return false;
  delete store.slots[id];
  _writeStore(store);
  return true;
}

// Migration unique : si la clé legacy existe et qu'aucun slot manuel
// n'est encore rempli, on importe la save legacy dans manual_1 puis on
// retire la clé. Idempotent : appels suivants no-op.
function migrateLegacyKey() {
  const legacy = localStorage.getItem(SAVE_LEGACY_KEY);
  if (!legacy) return false;
  const store = _readStore();
  const hasAnyManual = MANUAL_SLOT_IDS.some(id => store.slots[id]);
  if (hasAnyManual) {
    // Politique : on ne touche pas si un slot manuel existe déjà
    return false;
  }
  let parsed;
  try { parsed = JSON.parse(legacy); } catch (e) { return false; }
  store.slots.manual_1 = {
    meta: {
      savedAt:    new Date().toISOString(),
      label:      'Importée',
      heroNames:  (parsed.party || []).filter(c => c && c.name).map(c => c.name).slice(0, parsed.partySize || 1),
      heroIcons:  (parsed.party || []).filter(c => c && c.name).map(c => c.imgSrc || c.icon || '🧙').slice(0, parsed.partySize || 1),
      house:      parsed.chosenHouse || null,
      level:      (parsed.party && parsed.party[0] && parsed.party[0].level) || 1,
      floor:      parsed.currentFloor || 1,
      difficulty: parsed.difficulty || 'Normal'
    },
    state: parsed
  };
  _writeStore(store);
  localStorage.removeItem(SAVE_LEGACY_KEY);
  return true;
}

// ── Sérialisation / application d'état (pures) ──────────────
function _serializeState() {
  return {
    party:        [player, player2],
    partySize,
    currentFloor, playerX, playerY, playerDir,
    dungeon, visited, enemyMap, itemMap,
    seenMonsters:  Array.from(seenMonsters),
    audioMuted:    AudioSystem.isMuted,
    voiceEnabled:  AudioSystem.voiceEnabled,
    activeQuests,
    difficulty,
    chosenHouse, housePoints, houseTier,
    searchedCells: Array.from(searchedCells),
    floorDungeons,
    restCooldown
  };
}

// Applique un instantané au runtime — mute les objets en place pour
// préserver les références partagées (party[0] === player, etc.).
// Pas d'I/O, pas de message UI : pur applicateur.
function _applyState(gs) {
  if (gs.party && gs.party[0]) Object.assign(player,  gs.party[0]);
  if (gs.party && gs.party[1]) Object.assign(player2, gs.party[1]);
  party[0] = player;
  party[1] = player2;

  if (gs.partySize)     partySize    = gs.partySize;
  if (gs.seenMonsters)  seenMonsters = new Set(gs.seenMonsters);

  if (gs.audioMuted !== undefined) {
    AudioSystem.isMuted = gs.audioMuted;
    const btn = document.getElementById('btn-music');
    if (btn) btn.textContent = gs.audioMuted ? '🔇' : '♪';
  }
  if (gs.voiceEnabled !== undefined) {
    AudioSystem.voiceEnabled = gs.voiceEnabled;
    const btnV = document.getElementById('btn-voice');
    if (btnV) btnV.textContent = gs.voiceEnabled ? '🗣️' : '🔕';
  }

  currentFloor = gs.currentFloor;
  playerX      = gs.playerX;
  playerY      = gs.playerY;
  playerDir    = gs.playerDir;
  dungeon      = gs.dungeon;
  visited      = gs.visited;
  enemyMap     = gs.enemyMap;
  itemMap      = gs.itemMap;

  inBattle = false;
  const overlay = document.getElementById('encounter-overlay');
  if (overlay) overlay.style.display = 'none';
  const btnInter = document.getElementById('btn-interact');
  if (btnInter) btnInter.style.display = 'none';
  const expl = document.getElementById('explore-overlay');
  if (expl) expl.style.display = 'none';

  if (gs.activeQuests)   activeQuests = gs.activeQuests.map(_migrateQuestShape);
  if (gs.difficulty && DIFFICULTY_SETTINGS[gs.difficulty]) difficulty = gs.difficulty;
  if (gs.chosenHouse && HOUSE_BONUSES[gs.chosenHouse]) chosenHouse = gs.chosenHouse;
  if (gs.housePoints !== undefined) housePoints = gs.housePoints;
  if (gs.houseTier   !== undefined) houseTier   = gs.houseTier;
  if (gs.searchedCells) searchedCells = new Set(gs.searchedCells);
  if (gs.floorDungeons) floorDungeons = gs.floorDungeons;
  if (gs.restCooldown  !== undefined) restCooldown = gs.restCooldown;

  recalculateStats();
  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateLocationDisplay();
}

function saveGame() {
  if (inBattle) { addMsg("Impossible de sauvegarder en combat !", "bad"); return; }
  const gameState = _serializeState();
  localStorage.setItem(SAVE_LEGACY_KEY, JSON.stringify(gameState));
  addMsg("Partie sauvegardée !", "good");
}

// Convertit une quête en ancien format { objective:{}, progress:N } vers
// le nouveau format { objectives:[{...}] }. Idempotent.
function _migrateQuestShape(q) {
  if (q.objectives) return q;
  if (!q.objective) return q;
  const step = {
    type:      q.objective.type,
    amount:    q.objective.amount,
    progress:  q.progress || 0,
    completed: q.completed || (q.progress || 0) >= q.objective.amount
  };
  if (q.objective.itemId)    step.itemId    = q.objective.itemId;
  if (q.objective.monsterId) step.monsterId = q.objective.monsterId;
  const { objective, progress, ...rest } = q;
  return { ...rest, objectives: [step] };
}

function loadGame() {
  const saved = localStorage.getItem(SAVE_LEGACY_KEY);
  if (!saved) { addMsg("Aucune sauvegarde trouvée.", "bad"); return; }
  const gs = JSON.parse(saved);
  _applyState(gs);
  setNarrative("Le groupe reprend ses esprits. La partie est chargée !");
  addMsg("Partie chargée !", "good");
}
