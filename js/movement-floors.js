// ============================================================
// DÉPLACEMENT — Étages : cache, respawn & transitions
// ============================================================
// _saveFloorToCache/_restoreFloorFromCache, _respawnEnemiesOnEntry,
// _changeFloor, goDeeper, goUp (+ transitions de tranche). Chargé APRÈS
// movement.js. Dépend de generateDungeon (dungeon.js) et des garde-fous de
// dungeon-spawning.js.
// ============================================================
// ── Sauvegarde / restauration d'un étage dans le cache ──────
function _saveFloorToCache(floor) {
  floorDungeons[floor] = {
    dungeon:      JSON.parse(JSON.stringify(dungeon)),
    visited:      JSON.parse(JSON.stringify(visited)),
    enemyMap:     JSON.parse(JSON.stringify(enemyMap)),
    itemMap:      JSON.parse(JSON.stringify(itemMap)),
    px: playerX, py: playerY, dir: playerDir,
    floorEvent: currentFloorEvent,
    secretWalls: Array.from(secretWalls),
    runePuzzle: runePuzzle ? JSON.parse(JSON.stringify(runePuzzle)) : null,
    litRunes: Array.from(litRunes),
    runeStele: runeStele ? JSON.parse(JSON.stringify(runeStele)) : null,
    searchedCells: Array.from(searchedCells),
    npcPlacements: Array.from(npcPlacements.entries())
    // Note : on n'archive PAS usedFountains : la fontaine se ré-active
    // à la prochaine visite (cf. règle d'usage 1×/visite).
  };
}

function _restoreFloorFromCache(floor) {
  const c = floorDungeons[floor];
  if (!c) return false;
  dungeon  = c.dungeon;
  visited  = c.visited;
  enemyMap = c.enemyMap;
  itemMap  = c.itemMap;
  playerX  = c.px; playerY = c.py; playerDir = c.dir;
  searchedCells = _searchedCellsFromArray(c.searchedCells);
  npcPlacements = new Map(c.npcPlacements || []);
  currentFloorEvent = c.floorEvent || null;
  secretWalls = new Set(c.secretWalls || []);
  runePuzzle = c.runePuzzle || null;
  litRunes = new Set(c.litRunes || []);
  runeStele = c.runeStele || null;
  // Nouvelle visite = nouvelle eau dans la fontaine et nouvelles larmes Fumseck
  usedFountains = new Set();
  usedRefuges = new Set();
  usedAltars = new Set();
  usedSpecialNpcs = new Set();
  // Easter egg « Salle sur Demande » : refuge ré-utilisable à chaque visite.
  usedRequirementRooms = new Set();
  if (typeof requirementTheme !== 'undefined') requirementTheme.delete(floor); // V2 : re-choix contextuel du thème
  _respawnEnemiesOnEntry(floor);
  // Migration : re-place les PNJ manquants pour les saves antérieures
  // à un ajout (cf. dungeon.js — _migrateMissingNpcsForFloor).
  if (typeof _migrateMissingNpcsForFloor === 'function') {
    _migrateMissingNpcsForFloor(floor);
  }
  // Migration : re-spawn des cibles de quête `kill` manquantes
  // (cf. dungeon.js — _ensureActiveKillQuestTargets).
  if (typeof _ensureActiveKillQuestTargets === 'function') {
    _ensureActiveKillQuestTargets(floor);
  }
  // Page du grimoire d'Élara (quête manon_grimoire) si applicable.
  if (typeof _ensurePagePlacement === 'function') {
    _ensurePagePlacement(floor);
  }
  // Easter egg « Salle sur Demande » — assure le couple mur/tuile (migration
  // des saves antérieures ; ré-applique la porte si l'étage était révélé).
  if (typeof _ensureRequirementWall === 'function') {
    _ensureRequirementWall(floor);
  }
  // Migration : replace les escaliers manquants (softlock vieilles saves).
  if (typeof _ensureStairsExist === 'function') {
    _ensureStairsExist(floor);
  }
  // Garde-fou endgame : garantit le boss final à l'étage 10 pré-victoire
  // (répare les étages 10 déjà nettoyés sans avoir croisé Voldemort).
  if (typeof _ensureFinalBossPresent === 'function') {
    _ensureFinalBossPresent(floor);
  }
  return true;
}

// Respawn 20 % par cellule où un ennemi a été vaincu, déclenché à chaque
// retour sur un étage déjà visité. Les entrées re-spawnées sont retirées
// du Set (sinon elles continueraient à roller au prochain retour).
// Affiche un toast narratif si des ennemis ont effectivement respawné,
// avec un texte qui escalade selon le « niveau de visite » n du compteur
// floorKillCount (cf. battle.js — rollGroupSize).
const ENEMY_RESPAWN_CHANCE = 0.20;
function _respawnEnemiesOnEntry(floor) {
  if (typeof defeatedCellsByFloor === 'undefined') return 0;
  const set = defeatedCellsByFloor.get(floor);
  if (!set || set.size === 0) return 0;
  if (typeof MONSTERS === 'undefined' || typeof scaleMonster !== 'function') return 0;
  // Boucle Ténébreuse : pool rebasé sur relFloor en post-victoire (§7.2).
  const efFloor = (typeof effectiveFloor === 'function') ? effectiveFloor(floor) : floor;
  const pool = MONSTERS.filter(m =>
    m.minFloor <= efFloor && (m.maxFloor === null || efFloor <= m.maxFloor)
  );
  if (!pool.length) return 0;
  const respawned = [];
  for (const key of set) {
    if (Math.random() >= ENEMY_RESPAWN_CHANCE) continue;
    const [x, y] = key.split(',').map(Number);
    if (!dungeon[y] || dungeon[y][x] !== CELL.FLOOR) continue;
    if (enemyMap[y][x]) continue;
    if (x === playerX && y === playerY) continue;
    enemyMap[y][x] = scaleMonster(weightedPick(pool), floor);
    respawned.push(key);
  }
  for (const key of respawned) set.delete(key);
  if (respawned.length > 0) _announceRespawn(floor, respawned.length);
  return respawned.length;
}

// Toast narratif au respawn — message varie selon le « niveau de visite »
// n = floor(kills / 4). Plus le joueur ponce l'étage, plus le message
// est inquiétant — cohérent avec le scaling progressif des groupes.
function _announceRespawn(floor, respawnCount) {
  if (typeof addMsg !== 'function') return;
  const kills = (typeof floorKillCount !== 'undefined')
    ? (floorKillCount.get(floor) || 0) : 0;
  const n = Math.floor(kills / 4);
  let msg;
  if (n <= 1)       msg = `Quelques ombres se reforment dans les couloirs (${respawnCount}).`;
  else if (n <= 3)  msg = `Les ombres se reforment plus nombreuses cette fois (${respawnCount}).`;
  else if (n <= 5)  msg = `Tu sens des présences hostiles se rassembler — ta présence dérange (${respawnCount}).`;
  else              msg = `Le château pulse de menaces. L'étage te défie ouvertement (${respawnCount}).`;
  addMsg(`👁️ ${msg}`, 'bad');
}

// Flag mémoire session : toast "entrée Ténèbres" affiché 1× par session.
// Non persisté (volontaire — un reload ré-affiche le toast).
let _darknessToastShown = false;

// Transition d'étage partagée par goDeeper/goUp. `delta` = +1 / -1.
//  opts.guard()            → true pour annuler (escalier scellé / sol atteint)
//  opts.beforeTransition() → exécuté après l'incrément, avant l'animation
//  opts.onArrive()         → exécuté dans le callback, après le rendu
//  opts.saveReason         → raison passée à autoSave
//  opts.narrative(floor)   → texte de setNarrative
// Fondu noir + toast quand on franchit une frontière de tranche (cf.
// floor-tier-theming.md §2.3). Ne se déclenche pas à l'intérieur d'une
// même tranche : getFloorTheme renvoie la même référence d'objet.
function _maybePlayTierTransition(prevFloor, nextFloor) {
  if (typeof getFloorTheme !== 'function') return;
  const next = getFloorTheme(nextFloor);
  if (getFloorTheme(prevFloor) === next) return;
  const overlay = safeEl('tier-transition-overlay');
  if (overlay) {
    overlay.textContent = next.label;
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 600);
  }
  if (typeof addMsg === 'function') addMsg(`✨ ${next.label}`, 'narrative');
  // P4 — Toast solennel dédié à la frontière 13↔14 (Ruines Anciennes).
  // Texte plus long et plus grave, distinct des autres transitions.
  const enteringAncient = (prevFloor <= 13 && nextFloor >= 14 && nextFloor > prevFloor);
  if (enteringAncient && typeof addMsg === 'function') {
    addMsg('🪨 Sous Poudlard, la pierre n\'a plus de nom. Tu entres dans ce que l\'école fut bâtie pour oublier.', 'narrative');
  }
  // Beat scénarisé (L8 — 05 §5.4.2) : Cedric à la sortie de l'école (3→4).
  // Délivré par Cedric précisément s'il est présent ; prioritaire sur le bark
  // générique de tranche pour éviter la double-parole.
  let scriptedSpoke = false;
  if (prevFloor <= 3 && nextFloor >= 4 && nextFloor > prevFloor &&
      typeof heroBarkScripted === 'function') {
    scriptedSpoke = !!heroBarkScripted('cedric', 'leaveSchool', { channel: 'explore', once: 'leave-school' });
  }
  // Voix des héros — franchissement d'une frontière de tranche (cosmétique,
  // défensif, exploration). Cf. js/hero-barks.js.
  if (!scriptedSpoke && typeof heroBark === 'function') {
    const speaker = party.slice(0, partySize).find(c => c.hp > 0) || party[0];
    if (speaker && speaker.heroKey) heroBark(speaker.heroKey, 'tierTransition', { channel: 'explore', once: 'tier-trans:' + next.label });
  }
}

// Toast d'événement d'étage (Phase 4) — affiché à l'entrée d'un étage
// qui porte un `currentFloorEvent`. No-op si l'étage est ordinaire.
function _announceFloorEvent() {
  if (!currentFloorEvent) return;
  const ev = (typeof getFloorEvent === 'function') ? getFloorEvent(currentFloorEvent) : null;
  if (!ev) return;
  setNarrative(ev.desc);
  if (typeof addMsg === 'function') addMsg(`✦ ${ev.name} — ${ev.desc}`, 'magic');
}

function _changeFloor(delta, opts) {
  if (opts.guard && opts.guard()) return;
  const prevFloor = currentFloor;
  _saveFloorToCache(currentFloor);
  if (typeof _clearFarmingPreviews === 'function') _clearFarmingPreviews();
  currentFloor += delta;
  if (typeof visitedFloors !== 'undefined') visitedFloors.add(currentFloor);
  if (typeof portusOocCooldown === 'number' && portusOocCooldown > 0) portusOocCooldown--;
  // Réassort de la boutique fixe à chaque changement d'étage.
  if (typeof _invalidateShopStock === 'function') _invalidateShopStock();
  if (opts.beforeTransition) opts.beforeTransition();

  const locName = LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)];

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Map();
      generateDungeon(currentFloor);
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    _maybePlayTierTransition(prevFloor, currentFloor);
    // Givre/corruption — overlay CSS proportionnel à la profondeur.
    if (typeof _applyCorruptionAmbiance === 'function') _applyCorruptionAmbiance(currentFloor);
    if (opts.onArrive) opts.onArrive();
    if (typeof DFX_safe !== 'undefined') DFX_safe.setFloorAmbience();
    _announceFloorEvent();
    // Étage-scène scénarisé (P5) : beat écrit garanti à la 1re entrée d'un
    // étage-clé (1/4/8). One-shot via seenScriptedBeat ; après _announceFloorEvent
    // pour que le beat (rare, important) gagne la narration sur ces étages.
    if (typeof maybeScriptedFloorBeat === 'function') maybeScriptedFloorBeat(currentFloor);
    // Étage-scène « Chambre des Fondateurs » (P5) : au seuil du Cœur runique
    // (étage 17), la Chambre de la Maison du héros s'illumine. One-shot.
    if (typeof maybeFounderChamberBeat === 'function') maybeFounderChamberBeat(currentFloor);
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof checkFloorQuests === 'function') checkFloorQuests(currentFloor);
    // Mondes parallèles — si une visite est active côté host, reposter
    // un snapshot avec le nouvel étage pour que le visiteur le suive.
    // No-op silencieux hors visite (cf. visit-channel.js C.3b).
    if (typeof _visitHostNotifyFloorChange === 'function') {
      _visitHostNotifyFloorChange();
    }
    // Phase H §6.9 — host : recharge les Verrous actifs pour le nouvel
    // étage. No-op silencieux en visite (les Verrous ne s'appliquent
    // qu'aux étages propres du host).
    if (typeof loadHostSealsForCurrentFloor === 'function') {
      loadHostSealsForCurrentFloor();
    }
    safeCall('autoSave', opts.saveReason);
    safeCall('checkCodexUnlocks', opts.saveReason);
  });
  setNarrative(opts.narrative(currentFloor));
}

function goDeeper() {
  _changeFloor(1, {
    // Endgame : l'escalier descendant de l'étage 10 est scellé tant que
    // Voldemort Ressuscité n'a pas été vaincu. Voir ENDGAME_PLAN.md §7.1ter.
    guard() {
      if (currentFloor === 10 && !(typeof victoryAchieved !== 'undefined' && victoryAchieved)) {
        if (typeof addMsg === 'function') {
          addMsg("L'escalier reste scellé — une ombre veille encore.", 'bad');
        }
        return true;
      }
      return false;
    },
    // Endgame §7.1 : toast narratif à la 1re entrée en étage 11+ post-victoire.
    beforeTransition() {
      if (!_darknessToastShown
          && typeof victoryAchieved !== 'undefined' && victoryAchieved
          && currentFloor >= 11
          && typeof addMsg === 'function') {
        _darknessToastShown = true;
        addMsg("L'air devient glacial. Les murs eux-mêmes semblent te haïr.", 'bad');
      }
    },
    onArrive() {
      addMsg(`Niveau ${currentFloor} atteint !`, 'good');
      // Jardin d'herbes (Potions P6.b3) : la descente fait mûrir le jardin
      // éveillé de GARDEN_DESCENT_BONUS herbes (plafond GARDEN_CAP).
      if (typeof gardenDiscovered !== 'undefined' && gardenDiscovered
          && gardenStock < GARDEN_CAP) {
        gardenStock = Math.min(GARDEN_CAP, gardenStock + GARDEN_DESCENT_BONUS);
      }
    },
    saveReason: 'floor-down',
    narrative: (floor) => `Le groupe descend au niveau ${floor} des donjons de Poudlard...`
  });
}

function goUp() {
  _changeFloor(-1, {
    guard() { return currentFloor <= 1; },
    saveReason: 'floor-up',
    narrative: (floor) => `Le groupe remonte au niveau ${floor}...`
  });
}

