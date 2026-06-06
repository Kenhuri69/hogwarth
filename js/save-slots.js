// ============================================================
// SAUVEGARDE — Modèle multi-slots (store localStorage)
// ============================================================
// Store `hogwarts_rpg_saves` (3 slots manuels + auto) + migration de la
// clé legacy. API : listSaveSlots / readSlot / writeSlot / deleteSlot /
// deleteIronmanSlots / exportSaveStore / importSaveStore / autoSave /
// migrateLegacyKey. Les écritures délèguent la sérialisation d'état à
// _serializeState() (js/save.js, chargé juste après).
// Cf. CLAUDE.md « Sauvegarde (multi-slots) ».
// ============================================================
const SAVE_LEGACY_KEY = 'hogwarts_rpg_save';
const SAVE_STORE_KEY  = 'hogwarts_rpg_saves';
const SAVE_STORE_VERSION = 1;
const MANUAL_SLOT_IDS = ['manual_1', 'manual_2', 'manual_3'];
const AUTO_SLOT_ID    = 'auto';
const ALL_SLOT_IDS    = [...MANUAL_SLOT_IDS, AUTO_SLOT_ID];

// ── Modèle multi-slots ──────────────────────────────────────

function _readStore() {
  try {
    // localStorage.getItem peut throw SecurityError en Safari mode privé.
    const raw = localStorage.getItem(SAVE_STORE_KEY);
    if (!raw) return { version: SAVE_STORE_VERSION, slots: {} };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') throw new Error('shape');
    obj.slots = obj.slots || {};
    return obj;
  } catch (e) {
    return { version: SAVE_STORE_VERSION, slots: {} };
  }
}

function _writeStore(store) {
  try {
    localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    // Quota dépassé (Safari privé / localStorage plein) ou setItem refusé.
    if (typeof addMsg === 'function') {
      addMsg("Sauvegarde impossible : espace local saturé.", 'bad');
    }
    console.warn('[save] _writeStore failed:', e);
    return false;
  }
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
    difficulty: difficulty || 'Normal',
    victory:    !!(typeof victoryAchieved !== 'undefined' && victoryAchieved)
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

// Permadeath Ironman : supprime TOUS les slots appartenant à une partie
// Ironman (repérés via `state.ironmanMode`). Appelé à la mort en mode
// Ironman pour interdire tout rechargement. Retourne le nombre supprimé.
function deleteIronmanSlots() {
  const store = _readStore();
  let removed = 0;
  for (const id of ALL_SLOT_IDS) {
    const s = store.slots[id];
    if (s && s.state && s.state.ironmanMode) {
      delete store.slots[id];
      removed++;
    }
  }
  if (removed) _writeStore(store);
  return removed;
}

// ── Export / import du multi-slot store (debug / partage) ──────────
// Retourne le JSON sérialisé du store complet (4 slots max).
function exportSaveStore() {
  return JSON.stringify(_readStore(), null, 2);
}

// Importe un JSON dans le store. Préserve les slots reconnus uniquement
// (manual_1..3 + auto). Retourne { ok, reason?, imported, skipped }.
function importSaveStore(json) {
  let parsed;
  try { parsed = JSON.parse(json); }
  catch (e) { return { ok: false, reason: 'json', imported: 0, skipped: 0 }; }
  if (!parsed || typeof parsed !== 'object' || !parsed.slots || typeof parsed.slots !== 'object') {
    return { ok: false, reason: 'shape', imported: 0, skipped: 0 };
  }
  const store = { version: SAVE_STORE_VERSION, slots: {} };
  let imported = 0, skipped = 0;
  for (const [id, slot] of Object.entries(parsed.slots)) {
    if (!ALL_SLOT_IDS.includes(id)) { skipped++; continue; }
    if (!slot || typeof slot !== 'object' || !slot.state) { skipped++; continue; }
    store.slots[id] = { meta: slot.meta || {}, state: slot.state };
    imported++;
  }
  if (!imported) return { ok: false, reason: 'empty', imported: 0, skipped };
  const ok = _writeStore(store);
  if (!ok) return { ok: false, reason: 'write', imported, skipped };
  return { ok: true, imported, skipped };
}

// Auto-sauvegarde dans le slot dédié `auto`. Throttled **par raison**
// pour éviter qu'un événement critique (ex. fontaine bue) soit avalé
// par un événement précédent indépendant (ex. fin de combat). Une
// même raison appelée en rafale reste, elle, throttlée.
// Silencieuse : pas de toast. No-op avant la sélection de Maison ou
// en plein combat.
let _autoSaveLastAt = 0;                       // legacy : utilisé par smoke test scénario 12
const _autoSaveLastByReason = {};
const AUTO_SAVE_THROTTLE_MS = 1500;
function autoSave(reason) {
  if (inBattle) return false;
  if (!chosenHouse) return false;            // pas encore en partie
  const now = Date.now();
  const key = reason || '_';
  const last = _autoSaveLastByReason[key] || 0;
  if (now - last < AUTO_SAVE_THROTTLE_MS) return false;
  _autoSaveLastByReason[key] = now;
  _autoSaveLastAt = now;
  const store = _readStore();
  store.slots[AUTO_SLOT_ID] = {
    meta:  { ..._buildSlotMeta('Auto'), reason: reason || null },
    state: _serializeState()
  };
  _writeStore(store);
  return true;
}

// Migration unique : si la clé legacy existe et qu'aucun slot manuel
// n'est encore rempli, on importe la save legacy dans manual_1 puis on
// retire la clé. Idempotent : appels suivants no-op.
function migrateLegacyKey() {
  let legacy;
  try {
    // localStorage.getItem peut throw SecurityError en Safari mode privé.
    legacy = localStorage.getItem(SAVE_LEGACY_KEY);
  } catch (e) {
    return false;
  }
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

// ============================================================
// V3 — Codex « Salle sur Demande » (méta inter-parties, localStorage)
// ============================================================
// Méta-déblocage LÉGER, hors save de partie (room-of-requirement-v3.md §2) :
// thèmes déjà découverts + nombre de Salles trouvées + trophée à vie. Pur
// trophée (zéro impact gameplay) → respecte l'esprit « reset par partie ».
// Surfacé par l'Almanach du hub démarrage (save-ui.js). Défensif : tout accès
// localStorage est try/catch (Safari privé peut throw).
const REQ_CODEX_KEY = 'hogwarts_rpg_requirement_codex';

function _reqCodexRead() {
  try {
    const raw = localStorage.getItem(REQ_CODEX_KEY);
    if (!raw) return { themesSeen: {}, roomsFound: 0, trophy: false };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') throw new Error('shape');
    obj.themesSeen = (obj.themesSeen && typeof obj.themesSeen === 'object') ? obj.themesSeen : {};
    obj.roomsFound = (typeof obj.roomsFound === 'number') ? obj.roomsFound : 0;
    obj.trophy     = !!obj.trophy;
    return obj;
  } catch (e) {
    return { themesSeen: {}, roomsFound: 0, trophy: false };
  }
}

function _reqCodexWrite(obj) {
  try {
    localStorage.setItem(REQ_CODEX_KEY, JSON.stringify(obj));
    return true;
  } catch (e) {
    return false;
  }
}

// Lecture publique consommée par le rendu de l'Almanach (save-ui.js).
function getRequirementCodex() {
  return _reqCodexRead();
}

// Appelé 1×/révélation de porte (_revealRequirementRoom) — total inter-parties.
function recordRequirementRevealed() {
  const c = _reqCodexRead();
  c.roomsFound = (c.roomsFound | 0) + 1;
  _reqCodexWrite(c);
}

// Appelé quand un thème de Salle est réellement engagé (useRequirementRoom).
function recordRequirementTheme(theme) {
  if (!theme) return;
  const c = _reqCodexRead();
  c.themesSeen[theme] = true;
  _reqCodexWrite(c);
}

// Appelé à la 1ʳᵉ collecte du trophée cosmétique (toutes parties confondues).
function recordRequirementTrophy() {
  const c = _reqCodexRead();
  c.trophy = true;
  _reqCodexWrite(c);
}
