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
    donationIntroPlayed,
    visitsClosed,
    outremondeEssence,
    outremondeFragments,
    outremondePendingSeals,
    astralExileCooldownUntil,
    outremondeMetrics: {
      visitsTotal:   outremondeMetrics.visitsTotal,
      uniqueHosts:   Array.from(outremondeMetrics.uniqueHosts),
      sealsResolved: outremondeMetrics.sealsResolved,
      echosDefeated: outremondeMetrics.echosDefeated,
      pilgrimMark:   outremondeMetrics.pilgrimMark
    },
    outremondeSouvenirs:        Array.from(outremondeSouvenirs),
    outremondeCosmetics:        Array.from(outremondeCosmetics),
    outremondeActiveAura,
    outremondeActivePortalSkin,
    outremondeActiveFissureSkin,
    pendingHouseRewards: Array.from(pendingHouseRewards),
    searchedCells: Array.from(searchedCells),
    stepCount,
    floorDungeons,
    pagePlacements: Array.from(pagePlacements.entries()),
    revealedPages:  Array.from(revealedPages),
    restCooldown,
    usedFountains: Array.from(usedFountains),
    usedAltars: Array.from(usedAltars),
    currentFloorEvent,
    secretWalls: Array.from(secretWalls),
    runePuzzle,
    litRunes: Array.from(litRunes),
    runeStele,
    usedSpecialNpcs: Array.from(usedSpecialNpcs),
    defeatedCellsByFloor: Array.from(defeatedCellsByFloor.entries())
                          .map(([f, set]) => [f, Array.from(set)]),
    floorKillCount: Array.from(floorKillCount.entries()),
    shopStock,
    shopStepsSinceRestock,
    purchasedSpellbooks: Array.from(purchasedSpellbooks),
    endgamePurchases: { ...endgamePurchases },
    visitedFloors:  Array.from(visitedFloors),
    portusOocCooldown,
    portusFightCooldown,
    healSpellCooldown,
    npcPlacements: Array.from(npcPlacements.entries()),
    seenNpcs:      Array.from(seenNpcs),
    availableQuests: Array.from(availableQuests),
    completedQuests: Array.from(completedQuests),
    lastQuestCompletion: { ...lastQuestCompletion },
    victoryAchieved,
    victoryAt,
    ironmanMode,
    totalKills,
    monsterKills:  { ...monsterKills },
    defeatedBosses: Array.from(defeatedBosses),
    defeatedDuelists: Array.from(defeatedDuelists),
    ironmanRunId,
    _version:        3
  };
}

// Schéma 11 slots étendus — voir .claude/plans/equipment-extended.md §2.1
const EXTENDED_EQUIP_SLOTS = [
  'wand', 'head', 'body', 'hands', 'feet', 'cloak',
  'amulet', 'ring1', 'ring2', 'belt', 'trinket'
];

// Migration douce des slots d'équipement vers le schéma étendu :
//   • assure que tous les slots étendus existent (null si absents) ;
//   • déplace `equipped.armor` (objet) → `equipped.body` ;
//   • déplace `equipped.acc` (objet) → slot que pointe `item.slot`,
//     ou `amulet` par défaut si aucune indication.
// Idempotente — ne touche pas un slot cible déjà rempli.
function _migrateEquippedSlots(c) {
  if (!c || typeof c !== 'object') return;
  if (!c.equipped || typeof c.equipped !== 'object') c.equipped = {};
  const eq = c.equipped;

  // 1) Migrer armor → body
  if (eq.armor && !eq.body) {
    eq.body = eq.armor;
  }
  delete eq.armor;

  // 2) Migrer acc → slot dérivé de l'item (ou amulet par défaut)
  if (eq.acc) {
    const target = (eq.acc.slot && EXTENDED_EQUIP_SLOTS.includes(eq.acc.slot))
      ? eq.acc.slot
      : 'amulet';
    if (!eq[target]) eq[target] = eq.acc;
  }
  delete eq.acc;

  // 3) S'assurer que tous les slots étendus existent
  for (const slot of EXTENDED_EQUIP_SLOTS) {
    if (eq[slot] === undefined) eq[slot] = null;
  }
}

// Migration rétroactive : crédite (level - 1) * STAT_POINTS_PER_LEVEL
// au perso s'il n'a pas encore le champ `unallocatedStatPoints`. Le
// joueur peut ensuite les dépenser via la fiche perso (ui.js).
//
// Le mode `force` est utilisé pour les saves antérieures à v3 :
// le champ peut y exister à 0 à cause d'un Object.assign après
// `_hydrateCharacter` (qui met 0 à la création d'un héros) — la
// vérif undefined seule rate alors la migration. Force = recalcule
// la valeur correcte. Les saves v3+ sont supposées fiables.
function _migrateUnallocatedStatPoints(c, force) {
  if (!c || typeof c !== 'object') return;
  if (!force && c.unallocatedStatPoints !== undefined) return;
  if (typeof STAT_POINTS_PER_LEVEL !== 'number') {
    if (c.unallocatedStatPoints === undefined) c.unallocatedStatPoints = 0;
    return;
  }
  const lvl = Math.max(1, c.level || 1);
  c.unallocatedStatPoints = (lvl - 1) * STAT_POINTS_PER_LEVEL;
}

// Applique un instantané au runtime — mute les objets en place pour
// préserver les références partagées (party[0] === player, etc.).
// Pas d'I/O, pas de message UI : pur applicateur.
// Vrai si les tableaux de carte d'une save ne correspondent pas aux
// dimensions MAP_W×MAP_H courantes. Cas typique : une save antérieure à
// l'agrandissement de la carte (12×12 → 16×16). La géométrie d'un étage
// (salles, couloirs, position du joueur) est exprimée dans l'ancien
// repère et n'est pas transposable.
function _mapDimsStale(grid) {
  return !Array.isArray(grid) || grid.length !== MAP_H
      || !Array.isArray(grid[0]) || grid[0].length !== MAP_W;
}

function _applyState(gs) {
  if (gs.party && gs.party[0]) Object.assign(player,  gs.party[0]);
  if (gs.party && gs.party[1]) Object.assign(player2, gs.party[1]);
  party[0] = player;
  party[1] = player2;

  // Migration des slots d'équipement (ancien schéma → 11 slots étendus)
  // Idempotent : ne touche pas un slot déjà rempli au bon endroit.
  party.forEach(_migrateEquippedSlots);

  // Endgame Tranche 2 — Bibliothèque : initialise spellUpgrades = {} pour
  // les saves antérieures à l'ajout du champ. Object.assign préserve les
  // entrées existantes ; le défaut est juste un objet vide.
  party.forEach(c => { if (c && !c.spellUpgrades) c.spellUpgrades = {}; });

  // Migration rétroactive des points de stats libres : un perso niveau N
  // de l'ancienne version n'avait pas accumulé de points. On lui crédite
  // `(N - 1) * STAT_POINTS_PER_LEVEL` qu'il pourra allouer via la fiche.
  // `force` est vrai pour les saves antérieures à v3 (cf. commentaire de
  // _migrateUnallocatedStatPoints), où le champ peut exister à 0 à tort.
  const forceStatPoints = !gs._version || gs._version < 3;
  party.forEach(c => _migrateUnallocatedStatPoints(c, forceStatPoints));

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
  document.body.classList.remove('in-battle');
  const overlay = document.getElementById('encounter-overlay');
  if (overlay) overlay.style.display = 'none';
  const btnInter = document.getElementById('btn-interact');
  if (btnInter) btnInter.style.display = 'none';
  const expl = document.getElementById('explore-overlay');
  if (expl) expl.style.display = 'none';
  const npcOv = document.getElementById('npc-dialog-overlay');
  if (npcOv) npcOv.style.display = 'none';
  const ftOv = document.getElementById('floor-transition');
  if (ftOv) ftOv.classList.remove('active');

  if (gs.activeQuests)   activeQuests = gs.activeQuests.map(_migrateQuestShape);
  // Migration : réconcilie les ids de cible des quêtes actives avec le
  // catalogue — corrige les saves dont un objectif porte un id obsolète.
  _migrateQuestTargetIds();
  // Migration v1 → v2+ : sépare les quêtes complétées et déduit
  // availableQuests à partir du catalogue. v2+ lit les Sets persistés.
  if (gs._version >= 2) {
    availableQuests = new Set(gs.availableQuests || []);
    completedQuests = new Set(gs.completedQuests || []);
    lastQuestCompletion = (gs.lastQuestCompletion && typeof gs.lastQuestCompletion === 'object')
      ? { ...gs.lastQuestCompletion } : {};
  } else {
    lastQuestCompletion = {};
    completedQuests = new Set();
    activeQuests = activeQuests.filter(q => {
      if (q.completed) { completedQuests.add(q.id); return false; }
      return true;
    });
    const acceptedIds = new Set(activeQuests.map(q => q.id));
    availableQuests = new Set();
    if (typeof QUEST_TEMPLATES !== 'undefined') {
      for (const tpl of QUEST_TEMPLATES) {
        if (acceptedIds.has(tpl.id) || completedQuests.has(tpl.id)) continue;
        if (tpl.houseSetQuest) continue;       // gated par `unlockHouseQuest` (tier 12)
        availableQuests.add(tpl.id);
      }
    }
  }
  // Forward-fill catalogue : toute quête présente dans QUEST_TEMPLATES
  // mais inconnue de la save (ni active, ni complétée, ni dispo) est
  // ajoutée comme dispo. Couvre les saves créées avant l'ajout d'une
  // nouvelle quête (ex. chaîne Dumbledore Phase 3) : sans cette passe,
  // les nouvelles quêtes restaient invisibles côté joueur — Dumbledore
  // ne proposait pas la suite après une remise. Les quêtes de Maison
  // (`houseSetQuest: true`) restent verrouillées tant que le palier 12
  // n'a pas été franchi.
  if (typeof QUEST_TEMPLATES !== 'undefined') {
    const activeIds = new Set((activeQuests || []).map(q => q.id));
    for (const tpl of QUEST_TEMPLATES) {
      if (activeIds.has(tpl.id))       continue;
      if (completedQuests.has(tpl.id)) continue;
      if (availableQuests.has(tpl.id)) continue;
      if (tpl.houseSetQuest)           continue;
      availableQuests.add(tpl.id);
    }
  }
  if (gs.difficulty && DIFFICULTY_SETTINGS[gs.difficulty]) difficulty = gs.difficulty;
  if (gs.chosenHouse && HOUSE_BONUSES[gs.chosenHouse]) chosenHouse = gs.chosenHouse;
  if (gs.housePoints !== undefined) housePoints = gs.housePoints;
  if (gs.houseTier   !== undefined) houseTier   = gs.houseTier;
  donationIntroPlayed = !!gs.donationIntroPlayed;  // false par défaut (saves antérieurs)
  visitsClosed        = !!gs.visitsClosed;         // Phase F : false par défaut (accueil ouvert)
  // Phase G — économie cross-plan + cooldown défaite astrale. 0 par défaut
  // pour les saves antérieures (visiteur n'a encore rien gagné en astral).
  outremondeEssence       = (typeof gs.outremondeEssence === 'number') ? gs.outremondeEssence : 0;
  astralExileCooldownUntil = (typeof gs.astralExileCooldownUntil === 'number')
    ? gs.astralExileCooldownUntil : 0;
  // Phase H — fragments cosmétiques + verrous en attente.
  outremondeFragments    = (typeof gs.outremondeFragments === 'number') ? gs.outremondeFragments : 0;
  outremondePendingSeals = Array.isArray(gs.outremondePendingSeals) ? gs.outremondePendingSeals : [];
  // V1c.1 — métriques + souvenirs + cosmétiques. Defensif vs. saves
  // antérieures qui n'ont aucun de ces champs.
  const m = gs.outremondeMetrics || {};
  outremondeMetrics = {
    visitsTotal:   (typeof m.visitsTotal   === 'number') ? m.visitsTotal   : 0,
    uniqueHosts:   new Set(Array.isArray(m.uniqueHosts) ? m.uniqueHosts : []),
    sealsResolved: (typeof m.sealsResolved === 'number') ? m.sealsResolved : 0,
    echosDefeated: (typeof m.echosDefeated === 'number') ? m.echosDefeated : 0,
    pilgrimMark:   m.pilgrimMark || null
  };
  outremondeSouvenirs       = new Set(Array.isArray(gs.outremondeSouvenirs) ? gs.outremondeSouvenirs : []);
  outremondeCosmetics       = new Set(Array.isArray(gs.outremondeCosmetics) ? gs.outremondeCosmetics : []);
  outremondeActiveAura      = gs.outremondeActiveAura      || null;
  outremondeActivePortalSkin = gs.outremondeActivePortalSkin || null;
  outremondeActiveFissureSkin = gs.outremondeActiveFissureSkin || null;
  // V1c.1 — applique les CSS variables des cosmétiques restaurés et
  // re-vérifie les souvenirs (au cas où la save a été éditée à la main
  // ou la liste a évolué).
  if (typeof _applyCosmeticVisuals === 'function') _applyCosmeticVisuals();
  if (typeof _checkSouvenirs       === 'function') _checkSouvenirs();
  // Saves antérieures au tier 2 intermédiaire → set vide par défaut.
  pendingHouseRewards = new Set(gs.pendingHouseRewards || []);
  // Endgame : saves antérieures à l'introduction du flag → false/null.
  victoryAchieved = !!gs.victoryAchieved;
  victoryAt       = gs.victoryAt || null;
  // Mode Ironman : saves antérieures à l'ajout du mode → false/0/vide.
  ironmanMode     = !!gs.ironmanMode;
  totalKills      = (typeof gs.totalKills === 'number') ? gs.totalKills : 0;
  monsterKills    = (gs.monsterKills && typeof gs.monsterKills === 'object') ? { ...gs.monsterKills } : {};
  defeatedBosses  = new Set(gs.defeatedBosses || []);
  defeatedDuelists = new Set(gs.defeatedDuelists || []);
  ironmanRunId    = gs.ironmanRunId || null;
  // Save Ironman antérieur à l'UID de run → on en génère un (anti double-
  // classement). Vérification asynchrone qu'aucun score n'existe déjà.
  if (ironmanMode && !ironmanRunId && typeof _genRunId === 'function') {
    ironmanRunId = _genRunId();
  }
  if (ironmanMode && typeof _hofPrecheckRunOnLoad === 'function') {
    _hofPrecheckRunOnLoad();
  }
  // Réinitialise systématiquement (assignment inconditionnel) pour
  // éviter une fuite de l'état d'un précédent slot quand le nouveau
  // slot ne porte pas la clé (ex. save legacy ou partie démarrée
  // avant l'ajout du champ).
  searchedCells = _searchedCellsFromArray(gs.searchedCells);
  stepCount = (typeof gs.stepCount === 'number') ? gs.stepCount : 0;
  floorDungeons = gs.floorDungeons || {};
  if (gs.restCooldown  !== undefined) restCooldown = gs.restCooldown;
  usedFountains = new Set(gs.usedFountains || []);
  usedAltars = new Set(gs.usedAltars || []);
  currentFloorEvent = gs.currentFloorEvent || null;
  secretWalls = new Set(gs.secretWalls || []);
  runePuzzle = gs.runePuzzle || null;
  litRunes = new Set(gs.litRunes || []);
  runeStele = gs.runeStele || null;
  usedSpecialNpcs = new Set(gs.usedSpecialNpcs || []);
  defeatedCellsByFloor = new Map(
    (gs.defeatedCellsByFloor || []).map(([f, arr]) => [f, new Set(arr || [])])
  );
  floorKillCount = new Map(gs.floorKillCount || []);
  // Pages du grimoire de Sandrine (quête manon_grimoire).
  pagePlacements = new Map(gs.pagePlacements || []);
  revealedPages  = new Set(gs.revealedPages || []);
  // Boutique fixe : stock & réassort. shopStock null → re-tirage paresseux.
  shopStock = Array.isArray(gs.shopStock) ? gs.shopStock : null;
  shopStepsSinceRestock = (typeof gs.shopStepsSinceRestock === 'number') ? gs.shopStepsSinceRestock : 0;
  purchasedSpellbooks = new Set(gs.purchasedSpellbooks || []);
  // Saves antérieures aux sinks endgame → compteur vide (idempotent).
  endgamePurchases = (gs.endgamePurchases && typeof gs.endgamePurchases === 'object')
    ? { ...gs.endgamePurchases } : {};
  // visitedFloors : fallback sur l'étage courant pour les saves antérieures.
  visitedFloors = new Set(gs.visitedFloors || [currentFloor || 1]);
  if (currentFloor) visitedFloors.add(currentFloor);
  portusOocCooldown   = (typeof gs.portusOocCooldown   === 'number') ? gs.portusOocCooldown   : 0;
  portusFightCooldown = (typeof gs.portusFightCooldown === 'number') ? gs.portusFightCooldown : 0;
  healSpellCooldown   = (typeof gs.healSpellCooldown   === 'number') ? gs.healSpellCooldown   : 0;
  npcPlacements = new Map(gs.npcPlacements || []);
  seenNpcs      = new Set(gs.seenNpcs || []);

  // Migration : re-place les PNJ attendus à l'étage courant qui seraient
  // absents (saves antérieures à un ajout — ex. Dumbledore Phase 3).
  if (typeof _migrateMissingNpcsForFloor === 'function') {
    _migrateMissingNpcsForFloor(currentFloor);
  }
  // Migration : re-spawn des cibles de quête `kill` manquantes
  // (saves antérieures au hook `spawnOnAccept`).
  if (typeof _ensureActiveKillQuestTargets === 'function') {
    _ensureActiveKillQuestTargets(currentFloor);
  }
  // Migration : replace les escaliers manquants (étage softlocké par
  // une vieille collision de génération rooms[0]/rooms[last]).
  if (typeof _ensureStairsExist === 'function') {
    _ensureStairsExist(currentFloor);
  }

  recalculateStats();
  if (!('pendingHouseRewards' in gs)) _migrateHouseRewards();

  // Migration : une save antérieure à l'agrandissement de la carte porte
  // des tableaux 12×12. Leurs coordonnées ne sont pas transposables vers
  // 16×16 → on régénère l'étage courant et on purge le cache d'étages
  // (toutes ses entrées sont elles aussi de l'ancienne taille). Le
  // personnage, l'inventaire, l'or, les quêtes et la progression Maison
  // sont conservés ; seule la disposition de l'étage courant est refaite.
  if (_mapDimsStale(dungeon)) {
    floorDungeons = {};
    generateDungeon(currentFloor || 1);
  }

  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  if (typeof startNpcAnimLoop === 'function') startNpcAnimLoop();
  updateLocationDisplay();
}

// Migration rétroactive : pour les saves antérieures à l'introduction des
// récompenses Maison remises par PNJ. On reconstitue `pendingHouseRewards`
// en regardant chaque tier déjà franchi : si l'item correspondant n'est
// nulle part chez le joueur, on l'ajoute en attente.
//
// Architecture 16 paliers (.claude/plans/houses-2.0.md §A) : aucun tier
// n'utilise plus la distribution directe d'item ; le tier 16 (Légende
// endgame) ne porte qu'un bonus passif. Tous les `bonus.item` passent
// désormais par pendingHouseRewards via le head-of-house.
//
// Limitation : on ne distingue pas « possédé puis vendu » de « jamais reçu ».
// Si un joueur a vendu un légendaire avant cette PR, il sera remis
// en attente. Cas extrême et avantageux pour le joueur. Cf. plan §8.
function _migrateHouseRewards() {
  if (typeof pendingHouseRewards === 'undefined') return;
  if (!chosenHouse) return;
  const house = HOUSE_BONUSES[chosenHouse];
  if (!house) return;
  let unlockSet = false;
  house.tiers.forEach((tier, i) => {
    const tierNum = i + 1;
    if (houseTier < tierNum) return;
    if (tier.bonus.unlockSetQuest) unlockSet = true;
    if (!tier.bonus.item) return;
    const itemId = tier.bonus.item;
    const inInventory = (player.inventory || []).some(it => it && it.id === itemId);
    const equipped    = party.some(c => c.equipped &&
      Object.values(c.equipped).some(it => it && it.id === itemId));
    if (inInventory || equipped) return;
    pendingHouseRewards.add(itemId);
  });
  // Rétroactif : si le palier qui déclenche la quête de Maison a déjà
  // été franchi sur une save antérieure (avant l'ajout de
  // `unlockHouseQuest`), on l'ouvre maintenant — sinon elle resterait
  // invisible à jamais (filtrée par houseSetQuest dans la forward-fill).
  if (unlockSet && typeof unlockHouseQuest === 'function') {
    const qid = (typeof HOUSE_SET_QUESTS !== 'undefined') ? HOUSE_SET_QUESTS[chosenHouse] : null;
    const alreadyActive    = qid && (activeQuests || []).some(q => q.id === qid);
    const alreadyCompleted = qid && (completedQuests && completedQuests.has(qid));
    if (qid && !alreadyActive && !alreadyCompleted) {
      availableQuests.add(qid);
    }
  }
}

function saveGame() {
  if (inBattle) { addMsg("Impossible de sauvegarder en combat !", "bad"); return; }
  const gameState = _serializeState();
  try {
    localStorage.setItem(SAVE_LEGACY_KEY, JSON.stringify(gameState));
    addMsg("Partie sauvegardée !", "good");
  } catch (e) {
    addMsg("Sauvegarde impossible : espace local saturé.", "bad");
    console.warn('[save] saveGame failed:', e);
  }
}

// Convertit une quête en ancien format { objective:{}, progress:N } vers
// le nouveau format { objectives:[{...}] }. Idempotent.
function _migrateQuestShape(q) {
  if (q.objectives) {
    // Répare l'id de monstre erroné « dementeur » (le monstre s'appelle
    // « detraqueur ») dans les saves créées avant le fix : sans cela,
    // l'étape kill de `lumiere_desespoir` reste bloquée à 0/1.
    for (const step of q.objectives) {
      if (step && step.type === 'kill' && step.monsterId === 'dementeur') {
        step.monsterId = 'detraqueur';
      }
    }
    return q;
  }
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

// Migration : aligne les ids de cible (`monsterId`/`itemId`) des quêtes
// actives sur leur définition canonique dans QUEST_TEMPLATES. Corrige les
// saves dont un objectif `kill`/`item` porte un id obsolète qui ne matche
// plus aucune entité — ex. la quête de Lupin créée avant le fix
// `dementeur` → `detraqueur`, dont l'objectif restait bloqué.
// Idempotent. Les quêtes farming (cible tirée à l'acceptation, `null`
// dans le template) sont ignorées : on ne corrige que les ids concrets.
function _migrateQuestTargetIds() {
  if (typeof getQuestTemplate !== 'function') return;
  for (const q of (activeQuests || [])) {
    const tpl = q && getQuestTemplate(q.id);
    if (!tpl || !Array.isArray(tpl.objectives) || !Array.isArray(q.objectives)) continue;
    q.objectives.forEach((o, i) => {
      const t = tpl.objectives[i];
      if (!t) return;
      if (o.type === 'kill' && t.monsterId && o.monsterId !== t.monsterId) {
        o.monsterId = t.monsterId;
      }
      if (o.type === 'item' && t.itemId && o.itemId !== t.itemId) {
        o.itemId = t.itemId;
      }
    });
  }
}

function loadGame() {
  let saved;
  try {
    // localStorage.getItem peut throw SecurityError en Safari mode privé.
    saved = localStorage.getItem(SAVE_LEGACY_KEY);
  } catch (e) {
    addMsg("Stockage local indisponible (mode privé ?).", "bad");
    console.warn('[save] loadGame getItem failed:', e);
    return;
  }
  if (!saved) { addMsg("Aucune sauvegarde trouvée.", "bad"); return; }
  let gs;
  try {
    gs = JSON.parse(saved);
  } catch (e) {
    addMsg("Sauvegarde corrompue, chargement annulé.", "bad");
    console.warn('[save] loadGame parse failed:', e);
    return;
  }
  if (!gs || typeof gs !== 'object') {
    addMsg("Sauvegarde invalide, chargement annulé.", "bad");
    return;
  }
  _applyState(gs);
  setNarrative("Le groupe reprend ses esprits. La partie est chargée !");
  addMsg("Partie chargée !", "good");
}

// ============================================================
// MONDES PARALLÈLES — snapshot et suspend/restore (V1a Phase C.1)
// ============================================================
// Helpers purs pour la mécanique de visite inter-mondes. Aucune I/O
// réseau : transport déféré à C.2. Voir parallel-worlds.md §3.1 / §3.4 / §5.1.
//
//   _takeVisitSnapshot()     → côté visiteur : capture l'état pré-visite
//   _restoreFromVisit()      → côté visiteur : restaure l'état à la sortie
//   mpBuildVisitSnapshot()   → côté host : construit le payload à envoyer
//   mpApplyVisitSnapshot()   → côté visiteur : injecte le donjon distant
//
// Convention : aucun de ces helpers n'ouvre ni ferme `visitSession` —
// la session est posée par mpApplyVisitSnapshot et démontée par
// _restoreFromVisit. Le code appelant peut donc tester `visitSession`
// pour brancher l'UI/les permissions.
// ============================================================

// Sérialisation profonde via JSON — protège contre les fuites de
// références (un Object.assign ultérieur ne mute pas le snapshot).
// Restriction connue : ne porte pas les Set/Map natifs (encodés
// préalablement par _serializeState en tableaux). Suffisant pour la
// surface couverte ici.
function _visitDeepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Capture l'état runtime du visiteur en vue d'une visite. Retourne le
// snapshot (deep clone de _serializeState). À appeler AVANT
// mpApplyVisitSnapshot.
function _takeVisitSnapshot() {
  return _visitDeepClone(_serializeState());
}

// Restaure l'état du visiteur depuis `visitSession.mySavedState` et
// referme la session. Idempotent : ne fait rien si pas de session.
// Retourne true si une restauration a eu lieu.
function _restoreFromVisit() {
  if (!visitSession || !visitSession.mySavedState) {
    visitSession = null;
    return false;
  }
  const snap = visitSession.mySavedState;
  visitSession = null;
  _applyState(snap);
  return true;
}

// Cherche une case adjacente walkable autour de (x,y). Retourne
// {x,y,dir} avec `dir` orienté vers la case d'origine, ou {x,y,dir}
// de la case elle-même si aucun voisin n'est libre. Utilisé pour
// poser le visiteur à côté du host sans le téléporter dans un mur.
function _visitFindAdjacentSpawn(grid, x, y) {
  if (!Array.isArray(grid) || !Array.isArray(grid[0])) {
    return { x, y, dir: 's' };
  }
  const h = grid.length, w = grid[0].length;
  const WALKABLE = (cell) =>
    cell === CELL.FLOOR || cell === CELL.DOOR
    || cell === CELL.STAIRS_D || cell === CELL.STAIRS_U
    || cell === CELL.SHOP || cell === CELL.CHEST
    || cell === CELL.FOUNTAIN || cell === CELL.FORGE
    || cell === CELL.LIBRARY || cell === CELL.ALTAR;
  // Préférences : sud, nord, est, ouest (cohérent avec la convention DIRECTIONS)
  const offsets = [
    { dx: 0, dy: 1,  dir: 'n' },
    { dx: 0, dy: -1, dir: 's' },
    { dx: 1, dy: 0,  dir: 'w' },
    { dx: -1, dy: 0, dir: 'e' }
  ];
  for (const o of offsets) {
    const nx = x + o.dx, ny = y + o.dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (!WALKABLE(grid[ny][nx])) continue;
    return { x: nx, y: ny, dir: o.dir };
  }
  // Fallback : pose sur la cellule du host elle-même, regard vers le sud.
  return { x, y, dir: 's' };
}

// Construit le snapshot du host à envoyer au visiteur. Pure : ne lit
// que les arguments (avec fallback sur les globaux pour le confort
// du code appelant). En C.1 on ne sérialise que l'étage courant —
// les étages multiples seront ajoutés en C.3 (rendu).
//
// `partyOverride` : tableau de personnages (utilisé par les tests pour
// éviter de dépendre de `party` global). Si absent, lit `party`.
function mpBuildVisitSnapshot(opts) {
  const o = opts || {};
  const heroes = Array.isArray(o.party) ? o.party
               : (typeof party !== 'undefined' ? party : []);
  const heroNames = heroes
    .slice(0, (typeof partySize !== 'undefined' ? partySize : 1))
    .map(c => c && c.name).filter(Boolean);

  const floorNum = (typeof o.currentFloor === 'number') ? o.currentFloor
                 : (typeof currentFloor === 'number' ? currentFloor : 1);
  const grid     = o.dungeon || (typeof dungeon !== 'undefined' ? dungeon : null);
  const vmask    = o.visited || (typeof visited !== 'undefined' ? visited : null);
  const hx = (typeof o.playerX === 'number') ? o.playerX
           : (typeof playerX === 'number' ? playerX : 0);
  const hy = (typeof o.playerY === 'number') ? o.playerY
           : (typeof playerY === 'number' ? playerY : 0);
  const hdir = o.playerDir || (typeof playerDir !== 'undefined' ? playerDir : 's');

  const npcMap = o.npcPlacements
              || (typeof npcPlacements !== 'undefined' ? npcPlacements : new Map());
  const npcArr = npcMap instanceof Map
    ? Array.from(npcMap.entries())
    : (Array.isArray(npcMap) ? npcMap : []);

  const spawn = _visitFindAdjacentSpawn(grid, hx, hy);

  return _visitDeepClone({
    hostMeta: {
      id:           o.hostId      || null,
      name:         o.hostName    || 'Sorcier',
      house:        o.hostHouse   || null,
      level:        o.hostLevel   || 1,
      partyNames:   heroNames,
      currentFloor: floorNum
    },
    floor: {
      number:      floorNum,
      grid:        grid,
      visitedMask: vmask,
      npcPlacements: npcArr
    },
    hostPosition: { x: hx, y: hy, dir: hdir },
    visitorSpawn: spawn,
    _version: 1
  });
}

// Côté visiteur : injecte le snapshot du host dans les globaux et
// pose `visitSession`. Capture d'abord l'état du visiteur via
// _takeVisitSnapshot. Idempotent : si une visite est déjà active,
// refuse (retour false) — il faut sortir d'abord via _restoreFromVisit.
//
// Le donjon distant remplace `dungeon`, `visited` et `npcPlacements`.
// Les autres globaux du visiteur (party, inventaire, quêtes, maison)
// restent intouchés — ils sont restaurés par _restoreFromVisit.
function mpApplyVisitSnapshot(snapshot) {
  if (!snapshot || !snapshot.floor || !snapshot.hostMeta) return false;
  if (visitSession) return false;

  // 1) Capture défensive de l'état du visiteur (snapshot complet via JSON
  //    clone — pas de fuite de référence vers les globaux ré-affectés).
  const mine = _takeVisitSnapshot();

  // 2) Pose la session (avant injection — utile aux écouteurs qui
  //    écoutent les mutations de globaux).
  visitSession = {
    role:           'visitor',
    hostId:         snapshot.hostMeta.id   || null,
    hostName:       snapshot.hostMeta.name || 'Sorcier',
    hostHouse:      snapshot.hostMeta.house || null,
    mySavedState:   mine,
    remoteHostMeta: { ...snapshot.hostMeta }
  };

  // 3) Injection du donjon distant. Deep clone pour éviter que des
  //    mutations locales (ex. la prochaine visite reçue) corrompent
  //    le snapshot original conservé côté caller pour replay.
  const floor = _visitDeepClone(snapshot.floor);
  dungeon  = floor.grid;
  visited  = floor.visitedMask;
  // Neutralise enemyMap/itemMap : le visiteur ne combat pas, ne loote
  // pas en V1a (cf. §6.3 / §6.4). On garde des grilles 2D de la BONNE
  // forme pour ne pas casser les accès `enemyMap[y][x]` du renderer.
  const _gh = (dungeon && dungeon.length) || (typeof MAP_H !== 'undefined' ? MAP_H : 0);
  const _gw = (dungeon && dungeon[0] && dungeon[0].length)
            || (typeof MAP_W !== 'undefined' ? MAP_W : 0);
  enemyMap = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  itemMap  = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  npcPlacements = new Map(floor.npcPlacements || []);
  currentFloor  = floor.number || snapshot.hostMeta.currentFloor || 1;

  const spawn = snapshot.visitorSpawn || { x: 0, y: 0, dir: 's' };
  playerX   = spawn.x;
  playerY   = spawn.y;
  playerDir = spawn.dir;

  return true;
}

// Côté visiteur — patch d'étage envoyé par le host quand il descend
// ou remonte. Réutilise la même forme que mpBuildVisitSnapshot (champs
// floor, hostPosition, visitorSpawn, hostMeta) mais ne remet PAS
// `visitSession.mySavedState` à plat : la save d'origine du visiteur
// reste capturée, prête à être restaurée à la sortie.
//
// Idempotent côté no-op : si aucune session n'est active, retourne
// false sans rien muter. Si la session est active mais l'étage est
// identique à `currentFloor`, applique quand même (le host peut avoir
// regénéré l'étage — c'est le cas après une remontée).
function mpApplyVisitFloorUpdate(snapshot) {
  if (!snapshot || !snapshot.floor) return false;
  if (!visitSession) return false;

  const floor = _visitDeepClone(snapshot.floor);
  dungeon  = floor.grid;
  visited  = floor.visitedMask;
  const _gh = (dungeon && dungeon.length) || (typeof MAP_H !== 'undefined' ? MAP_H : 0);
  const _gw = (dungeon && dungeon[0] && dungeon[0].length)
            || (typeof MAP_W !== 'undefined' ? MAP_W : 0);
  enemyMap = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  itemMap  = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  npcPlacements = new Map(floor.npcPlacements || []);
  currentFloor  = floor.number
                || (snapshot.hostMeta && snapshot.hostMeta.currentFloor)
                || currentFloor;

  // Met à jour la méta affichée par le HUD (étage notamment).
  if (snapshot.hostMeta) {
    visitSession.remoteHostMeta = { ...snapshot.hostMeta };
  }

  const spawn = snapshot.visitorSpawn || { x: 0, y: 0, dir: 's' };
  playerX   = spawn.x;
  playerY   = spawn.y;
  playerDir = spawn.dir;

  return true;
}

