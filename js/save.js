// ============================================================
// SAUVEGARDE — Sérialisation / application d'état + façades legacy
// ============================================================
// _serializeState / _applyState (purs) + migrations de save +
// saveGame / loadGame (clé legacy). Le modèle multi-slots est dans
// js/save-slots.js (chargé avant) ; les snapshots de visite inter-mondes
// dans js/save-visit-snapshot.js (chargé après).
// ============================================================
// ── Sérialisation / application d'état (pures) ──────────────
function _serializeState() {
  return {
    party:        [player, player2],
    partySize,
    currentFloor, playerX, playerY, playerDir,
    dungeon, visited, enemyMap, itemMap,
    seenMonsters:  Array.from(seenMonsters),
    // NB : les préférences audio (son/voix) ne sont volontairement PAS
    // sérialisées ici — ce sont des réglages d'interface globaux
    // (AudioSystem._PREFS_KEY), pas de l'état de partie.
    activeQuests,
    difficulty,
    chosenHouse, housePoints, houseTier,
    donationIntroPlayed,
    visitsClosed,
    barksEnabled,
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
    felixFortuneSteps,
    usedFountains: Array.from(usedFountains),
    usedAltars: Array.from(usedAltars),
    currentFloorEvent,
    secretWalls: Array.from(secretWalls),
    runePuzzle,
    litRunes: Array.from(litRunes),
    runeStele,
    // Easter egg « Salle sur Demande » (room-of-requirement-easter-egg.md).
    requirementWalls:     Array.from(requirementWalls.entries()),
    requirementTrigger:   Array.from(requirementTrigger.entries()),
    requirementPaces:     Array.from(requirementPaces.entries()),
    requirementRevealed:  Array.from(requirementRevealed),
    usedRequirementRooms: Array.from(usedRequirementRooms),
    requirementGiftTaken,
    requirementBuffSteps,
    requirementTheme:     Array.from(requirementTheme.entries()),
    requirementTrophiesTaken: Array.from(requirementTrophiesTaken), // V3/V3.1
    usedSpecialNpcs: Array.from(usedSpecialNpcs),
    defeatedCellsByFloor: Array.from(defeatedCellsByFloor.entries())
                          .map(([f, set]) => [f, Array.from(set)]),
    floorKillCount: Array.from(floorKillCount.entries()),
    // Jardin d'herbes (Potions P6.b3) — jardins cachés + pool + éveil.
    hiddenGardens: Array.from(hiddenGardens),
    gardenStock,
    gardenDiscovered,
    shopStock,
    shopStepsSinceRestock,
    purchasedSpellbooks: Array.from(purchasedSpellbooks),
    endgamePurchases: { ...endgamePurchases },
    visitedFloors:  Array.from(visitedFloors),
    seenScriptedBeat: Array.from(seenScriptedBeat),
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
    combatTutorialSeen,
    hiverClair,
    headlessHuntMember,
    maitreDeLaMort,
    gryffSignatureDone,
    slythSignatureDone,
    ravenSignatureDone,
    poufSignatureDone,
    slythPactChoice,
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

  // Stacking des consommables : fusionne les doublons d'une save antérieure
  // au stacking en stacks `qty` (idempotent). L'inventaire est partagé via
  // player.inventory → un seul appel suffit.
  if (typeof _consolidateInventoryStacks === 'function') _consolidateInventoryStacks();

  // Endgame Tranche 2 — Bibliothèque : initialise spellUpgrades = {} pour
  // les saves antérieures à l'ajout du champ. Object.assign préserve les
  // entrées existantes ; le défaut est juste un objet vide.
  party.forEach(c => { if (c && !c.spellUpgrades) c.spellUpgrades = {}; });
  // C3b — voie d'amplification par sort. Une save antérieure à C3b a des
  // spellUpgrades sans spellPaths → traité comme voie « legacy combinée »
  // côté _spellForCaster (pas de migration, pas de nerf).
  party.forEach(c => { if (c && !c.spellPaths) c.spellPaths = {}; });

  // Migration rétroactive des points de stats libres : un perso niveau N
  // de l'ancienne version n'avait pas accumulé de points. On lui crédite
  // `(N - 1) * STAT_POINTS_PER_LEVEL` qu'il pourra allouer via la fiche.
  // `force` est vrai pour les saves antérieures à v3 (cf. commentaire de
  // _migrateUnallocatedStatPoints), où le champ peut exister à 0 à tort.
  const forceStatPoints = !gs._version || gs._version < 3;
  party.forEach(c => _migrateUnallocatedStatPoints(c, forceStatPoints));

  if (gs.partySize)     partySize    = gs.partySize;
  if (gs.seenMonsters)  seenMonsters = new Set(gs.seenMonsters);

  // Les préférences audio (son / voix) sont des réglages d'INTERFACE,
  // globaux et persistés à part (AudioSystem._PREFS_KEY). Charger une
  // sauvegarde ne doit donc PAS les écraser — sinon un slot enregistré
  // muet recouperait le son du joueur. On ne fait que resynchroniser les
  // icônes des boutons avec l'état courant (jamais textContent, qui
  // remplacerait le <img> par un emoji brut).
  if (AudioSystem.refreshButtons) AudioSystem.refreshButtons();

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
  // Voix des héros (barks) : préférence joueur. true par défaut (saves
  // antérieurs sans le champ → barks actifs).
  barksEnabled        = (gs.barksEnabled === undefined) ? true : !!gs.barksEnabled;
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
  // Saves antérieures à D2 : champ absent → tuto réaffiché au prochain combat.
  combatTutorialSeen = !!gs.combatTutorialSeen;
  // Passif Hiver Clair (Manon Acte III) : saves antérieures → false.
  if (typeof hiverClair !== 'undefined') hiverClair = !!gs.hiverClair;
  if (typeof headlessHuntMember !== 'undefined') headlessHuntMember = !!gs.headlessHuntMember;
  // Easter egg Reliques de la Mort : saves antérieures → false.
  if (typeof maitreDeLaMort !== 'undefined') maitreDeLaMort = !!gs.maitreDeLaMort;
  // Quêtes Signature de Maison : saves antérieures → false/null.
  if (typeof gryffSignatureDone !== 'undefined') gryffSignatureDone = !!gs.gryffSignatureDone;
  if (typeof slythSignatureDone !== 'undefined') slythSignatureDone = !!gs.slythSignatureDone;
  if (typeof ravenSignatureDone !== 'undefined') ravenSignatureDone = !!gs.ravenSignatureDone;
  if (typeof poufSignatureDone  !== 'undefined') poufSignatureDone  = !!gs.poufSignatureDone;
  if (typeof slythPactChoice    !== 'undefined') slythPactChoice    = gs.slythPactChoice || null;
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
  felixFortuneSteps = (typeof gs.felixFortuneSteps === 'number') ? gs.felixFortuneSteps : 0;
  usedFountains = new Set(gs.usedFountains || []);
  usedAltars = new Set(gs.usedAltars || []);
  currentFloorEvent = gs.currentFloorEvent || null;
  secretWalls = new Set(gs.secretWalls || []);
  runePuzzle = gs.runePuzzle || null;
  litRunes = new Set(gs.litRunes || []);
  runeStele = gs.runeStele || null;
  // Easter egg « Salle sur Demande » (room-of-requirement-easter-egg.md).
  requirementWalls     = new Map(gs.requirementWalls || []);
  requirementTrigger   = new Map(gs.requirementTrigger || []);
  requirementPaces     = new Map(gs.requirementPaces || []);
  requirementRevealed  = new Set(gs.requirementRevealed || []);
  usedRequirementRooms = new Set(gs.usedRequirementRooms || []);
  requirementGiftTaken = !!gs.requirementGiftTaken;
  requirementBuffSteps = (typeof gs.requirementBuffSteps === 'number') ? gs.requirementBuffSteps : 0;
  requirementTheme     = new Map(gs.requirementTheme || []); // V2 (room-of-requirement-v2.md)
  requirementTrophiesTaken = new Set(gs.requirementTrophiesTaken || []); // V3/V3.1
  usedSpecialNpcs = new Set(gs.usedSpecialNpcs || []);
  defeatedCellsByFloor = new Map(
    (gs.defeatedCellsByFloor || []).map(([f, arr]) => [f, new Set(arr || [])])
  );
  floorKillCount = new Map(gs.floorKillCount || []);
  // Jardin d'herbes (Potions P6.b3) — jardins cachés + pool + éveil.
  hiddenGardens = new Set(gs.hiddenGardens || []);
  gardenStock = (typeof gs.gardenStock === 'number') ? gs.gardenStock : 0;
  gardenDiscovered = !!gs.gardenDiscovered;
  // Pages du grimoire d'Élara (quête manon_grimoire).
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
  // Étages-scènes scénarisés (P5) : fallback [] pour les saves antérieures.
  seenScriptedBeat = new Set(gs.seenScriptedBeat || []);
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
  // Garde-fou endgame : garantit le boss final à l'étage 10 pré-victoire.
  // Répare les saves dont l'étage 10 a été nettoyé sans rencontrer
  // Voldemort Ressuscité (escalier descendant alors scellé sans issue).
  if (typeof _ensureFinalBossPresent === 'function') {
    _ensureFinalBossPresent(currentFloor);
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
  if (typeof startDungeonFxLoop === 'function') startDungeonFxLoop();
  if (typeof DFX_safe !== 'undefined') DFX_safe.setFloorAmbience();
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
