// ============================================================
// DÉPLACEMENT ET ÉVÉNEMENTS DE CELLULE
// ============================================================

function canMove(dir) {
  if (inBattle) return false;
  const [dx, dy] = DIRECTIONS[dir];
  const nx = playerX + dx, ny = playerY + dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return false;
  return dungeon[ny][nx] !== CELL.WALL;
}

// ─────────────────────────────────────────────────────────────
// Helpers de rotation : indexés cycliquement n→e→s→w→n.
// ─────────────────────────────────────────────────────────────
const _DIR_ORDER = ['n', 'e', 's', 'w'];
function _oppositeDir(dir) {
  return _DIR_ORDER[(_DIR_ORDER.indexOf(dir) + 2) % 4];
}
function _rotateDir(dir, delta) {
  const i = _DIR_ORDER.indexOf(dir);
  return _DIR_ORDER[(i + delta + 4) % 4];
}

// Pas dans une direction absolue. Si `faceDir` est vrai, on aligne
// `playerDir` sur la direction du pas (mouvement classique). Sinon
// on garde `playerDir` intact (cas `moveBackward`).
function _step(dir, faceDir) {
  if (inBattle) return;
  if (faceDir) playerDir = dir;
  if (!canMove(dir)) {
    setNarrative("Un mur de pierre solide bloque le passage.");
    updateCompass();
    drawDungeon();
    return;
  }
  const [dx, dy] = DIRECTIONS[dir];
  // Porte scellée : avancer vers une porte tente de l'ouvrir (clé requise)
  // sans franchir la case. Une fois ouverte (→ FLOOR) elle se traverse au
  // pas suivant. Voir dungeon-enrichment §2.C.
  if (dungeon[playerY + dy] && dungeon[playerY + dy][playerX + dx] === CELL.DOOR) {
    _tryOpenDoor(playerX + dx, playerY + dy);
    updateCompass();
    return;
  }
  playerX += dx; playerY += dy;
  visited[playerY][playerX] = true;
  stepCount++;
  if (restCooldown > 0) restCooldown--;
  if (typeof healSpellCooldown === 'number' && healSpellCooldown > 0) healSpellCooldown--;
  if (typeof _tickShopRestock === 'function') _tickShopRestock();
  AudioSystem.playFootstep();

  // Apothéose Poufsouffle (palier 18 — Souffle du Blaireau) : régénération
  // hors combat, +2 PV / +2 PM par membre vivant du groupe à chaque pas.
  if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Poufsouffle') {
    party.slice(0, partySize).forEach(c => {
      if (c.hp > 0) {
        c.hp = Math.min(c.hpMax, c.hp + 2);
        c.sp = Math.min(c.spMax, c.sp + 2);
      }
    });
  }

  const cell = dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  // Multijoueur — émet la nouvelle position (upsert throttlé).
  if (typeof mpNotifyMove === 'function') mpNotifyMove();

  _updateSearchBtn();

  if (enemyMap[playerY][playerX]) {
    _hideExploreOverlay();
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  // Multijoueur — un fantôme occupe la case : ouvre l'interaction.
  if (typeof getGhostAt === 'function') {
    const _ghost = getGhostAt(playerX, playerY);
    if (_ghost && typeof openGhostInteraction === 'function') {
      openGhostInteraction(_ghost);
      return;
    }
  }

  // Multijoueur — un message gravé sur la case : révélation non bloquante.
  if (typeof getMessageAt === 'function') {
    const _msg = getMessageAt(playerX, playerY);
    if (_msg) {
      addMsg('🪶 « ' + _msg.text + ' » — ' + (_msg.authorName || 'un sorcier'), 'info');
    }
  }

  handleCellEntry(cell);
}

// Contrôles relatifs (avancer/reculer + rotation).
function moveForward()  { _step(playerDir, true); }
function moveBackward() { _step(_oppositeDir(playerDir), false); }
function turnLeft() {
  if (inBattle) return;
  playerDir = _rotateDir(playerDir, -1);
  updateCompass();
  renderMinimap();
  drawDungeon();
  _updateSearchBtn();
}
function turnRight() {
  if (inBattle) return;
  playerDir = _rotateDir(playerDir, 1);
  updateCompass();
  renderMinimap();
  drawDungeon();
  _updateSearchBtn();
}

// API legacy : déplacement absolu dans une direction cardinale.
// Conservée pour cinématiques / debug. L'UI utilise désormais les
// helpers relatifs ci-dessus.
function move(dir) { _step(dir, true); }

// ── Overlay exploration (coffre / escalier / boutique / fontaine) ───
// Pour chaque cellule interactive : un descripteur (icon, title, desc,
// btns). Les SVG eux-mêmes sont centralisés dans `js/scene-icons.js`.
function _exploreDescriptors() {
  const fountainDried = usedFountains && usedFountains.has(`${playerX},${playerY}`);
  const altarSpent    = usedAltars && usedAltars.has(`${playerX},${playerY}`);
  const altarCost     = 40 * (currentFloor || 1);
  // L'escalier descendant de l'étage 10 est scellé tant que Voldemort
  // Ressuscité n'a pas été vaincu. Voir ENDGAME_PLAN.md §7.1ter.
  const stairsSealed = currentFloor === 10
    && !(typeof victoryAchieved !== 'undefined' && victoryAchieved);
  return {
    [CELL.CHEST]: {
      icon:  SCENE_ICONS.chest,
      title: 'Coffre Magique',
      desc:  "Un vieux coffre verrouillé trône contre le mur de pierre. Qui sait ce qu'il contient ?",
      btns:  `<button class="explore-btn" onclick="openChest();_hideExploreOverlay()">Ouvrir le coffre</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Ignorer</button>`
    },
    [CELL.SHOP]: {
      icon:  SCENE_ICONS.shop,
      title: 'Échoppe Ambulante',
      desc:  'Une aile de la bibliothèque transformée en échoppe de fortune. Des articles magiques sont disponibles.',
      btns:  `<button class="explore-btn" onclick="openShop();_hideExploreOverlay()">Entrer dans la boutique</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Passer son chemin</button>`
    },
    [CELL.STAIRS_D]: stairsSealed ? {
      icon:  SCENE_ICONS.stairs_d,
      title: 'Passage scellé',
      desc:  "Une magie ancienne et noire scelle cet escalier. Une présence maléfique veille — tant qu'elle n'aura pas été abattue, le passage restera fermé.",
      btns:  `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    } : {
      icon:  SCENE_ICONS.stairs_d,
      title: 'Escalier Descendant',
      desc:  'Un escalier en colimaçon disparaît dans les profondeurs. Le danger augmente en descendant.',
      btns:  `<button class="explore-btn" onclick="_hideExploreOverlay();goDeeper()">Descendre</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`
    },
    [CELL.STAIRS_U]: {
      icon:  SCENE_ICONS.stairs_u,
      title: 'Escalier Montant',
      desc:  'Un escalier de pierre remonte vers les étages supérieurs, moins dangereux.',
      btns:  `<button class="explore-btn" onclick="_hideExploreOverlay();goUp()">Remonter</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`
    },
    [CELL.FOUNTAIN]: {
      icon:  SCENE_ICONS.fountain({ dried: fountainDried }),
      title: 'Fontaine de Pierre',
      desc:  fountainDried
        ? "L'eau de la fontaine s'est tarie. Vous devrez quitter cet étage et revenir plus tard pour qu'elle se remplisse à nouveau."
        : "Une vasque sculptée laisse s'écouler une eau bleutée luminescente. Boire ici restaurera entièrement la santé et la magie du groupe.",
      btns:  fountainDried
        ? `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
        : `<button class="explore-btn" onclick="useFountain();_hideExploreOverlay()">Boire à la fontaine</button>
           <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Enrichissement du donjon §2.B — Autel Ancien : tribut risque/récompense.
    [CELL.ALTAR]: altarSpent ? {
      icon:  SCENE_ICONS.altar,
      title: 'Autel Ancien',
      desc:  "L'autel est retombé dans le silence. Son pouvoir ne se ranimera qu'à votre prochaine visite de cet étage.",
      btns:  `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    } : {
      icon:  SCENE_ICONS.altar,
      title: 'Autel Ancien',
      desc:  "Une dalle de pierre runique pulse d'une lueur sourde. On raconte qu'un tribut bien choisi attire la faveur des anciens — ou leur courroux.",
      btns:  `<button class="explore-btn" onclick="useAltar('gold')">Offrande d'or (${altarCost} G) — soin complet + XP</button>
              <button class="explore-btn" onclick="useAltar('gamble')">Pari du sang — gratuit, 50/50</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Endgame Tranche 2 — Forge des Ténèbres : upgrade des items équipés.
    // Voir ENDGAME_PLAN.md §7.5 + js/forge.js — openForge.
    [CELL.FORGE]: {
      icon:  SCENE_ICONS.forge,
      title: 'Forge des Ténèbres',
      desc:  "Une enclume noire repose sur des charbons éternels. Le métal des Ténèbres peut renforcer vos équipements — au prix d'or et d'essence.",
      btns:  `<button class="explore-btn" onclick="openForge();_hideExploreOverlay()">Forger</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Endgame Tranche 2 — Bibliothèque interdite : upgrade des sorts.
    // Voir ENDGAME_PLAN.md §7.6 + js/library.js — openLibrary.
    [CELL.LIBRARY]: {
      icon:  SCENE_ICONS.library,
      title: 'Bibliothèque interdite',
      desc:  "Un pupitre sculpté porte un grimoire dont les pages flottent légèrement. Y déchiffrer un sort en amplifie la puissance — moyennant or et Pages de Grimoire.",
      btns:  `<button class="explore-btn" onclick="openLibrary();_hideExploreOverlay()">Étudier</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    }
  };
}

function _showExploreOverlay(cell) {
  const desc = _exploreDescriptors()[cell];
  if (!desc) return;
  const icon    = safeEl('explore-icon');
  const title   = safeEl('explore-title');
  const descEl  = safeEl('explore-desc');
  const actions = safeEl('explore-actions');
  const overlay = safeEl('explore-overlay');
  if (!icon || !title || !descEl || !actions || !overlay) return;
  icon.innerHTML       = desc.icon;
  title.textContent    = desc.title;
  descEl.textContent   = desc.desc;
  actions.innerHTML    = desc.btns;
  overlay.style.display = 'flex';
}

function _hideExploreOverlay() {
  const overlay = safeEl('explore-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Transition d'étage ───────────────────────────────────────
function _floorTransition(level, locationName, callback) {
  const overlay = document.getElementById('floor-transition');
  document.getElementById('ft-level').textContent = `Niveau ${level}`;
  document.getElementById('ft-name').textContent  = locationName;
  overlay.classList.add('active');
  setTimeout(() => {
    if (callback) callback();
    setTimeout(() => overlay.classList.remove('active'), 600);
  }, 1400);
}

function handleCellEntry(cell) {
  const btn = document.getElementById('btn-interact');
  btn.style.display = 'none';
  _hideExploreOverlay();
  updateRoomStatus();

  if (cell === CELL.STAIRS_D || cell === CELL.STAIRS_U ||
      cell === CELL.SHOP     || cell === CELL.CHEST    ||
      cell === CELL.FOUNTAIN || cell === CELL.ALTAR    ||
      cell === CELL.FORGE    || cell === CELL.LIBRARY) {
    _showExploreOverlay(cell);
  } else if (cell === CELL.TRAP) {
    // Piège déclenché en marchant dessus : la case est consommée puis
    // l'effet est appliqué (cf. _triggerDungeonTrap — Phase 2 §2.A).
    dungeon[playerY][playerX] = CELL.FLOOR;
    renderMinimap();
    _triggerDungeonTrap();
  } else if (cell === CELL.NPC) {
    const npcId = npcPlacements.get(`${playerX},${playerY}`);
    if (npcId && typeof openNpcDialog === 'function') {
      openNpcDialog(npcId);
    }
  } else {
    if (Math.random() < 0.15) {
      if (Math.random() < 0.08) {
        setNarrative(NARRATIVES.trap);
        const alive  = party.filter(c => c.hp > 0);
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg    = Math.ceil(Math.random() * 5 + 2);
        target.hp    = Math.max(0, target.hp - dmg);
        addMsg(`Piège ! ${target.name} perd ${dmg} PV`, 'bad');
        updateUI();
        if (party.every(c => c.hp <= 0)) triggerDeath("Un piège sournois a vaincu le groupe...");
      }
    } else {
      setNarrative(NARRATIVES.floor[Math.floor(Math.random() * NARRATIVES.floor.length)]);
    }
  }
}

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
  // Nouvelle visite = nouvelle eau dans la fontaine et nouvelles larmes Fumseck
  usedFountains = new Set();
  usedAltars = new Set();
  usedSpecialNpcs = new Set();
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
  // Page du grimoire de Sandrine (quête manon_grimoire) si applicable.
  if (typeof _ensurePagePlacement === 'function') {
    _ensurePagePlacement(floor);
  }
  // Migration : replace les escaliers manquants (softlock vieilles saves).
  if (typeof _ensureStairsExist === 'function') {
    _ensureStairsExist(floor);
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
    if (opts.onArrive) opts.onArrive();
    _announceFloorEvent();
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof checkFloorQuests === 'function') checkFloorQuests(currentFloor);
    safeCall('autoSave', opts.saveReason);
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
    onArrive() { addMsg(`Niveau ${currentFloor} atteint !`, 'good'); },
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

function openChest() {
  dungeon[playerY][playerX] = CELL.FLOOR;
  document.getElementById('btn-interact').style.display = 'none';
  AudioSystem.playChestOpen();

  // Livres de sorts disponibles selon l'étage courant
  const booksAvailable = ITEMS.filter(i => {
    if (i.type !== 'spellbook') return false;
    if (i.id === 'livre_sortileges')  return currentFloor >= 2;
    if (i.id === 'livre_soin')        return currentFloor >= 3;
    if (i.id === 'livre_ferula')      return currentFloor >= 4 && currentFloor <= 6;
    if (i.id === 'book_monsters')     return currentFloor >= 3;
    if (i.id === 'livre_lumos_solem') return currentFloor >= 5;
    if (i.id === 'livre_prince')      return currentFloor >= 6; // rare et puissant
    // Grimoires de zone (AoE) — aussi achetables en boutique ; gating
    // coffre aligné sur leur minFloor de SHOP_CATALOG.
    if (i.id === 'livre_glacius_tempete') return currentFloor >= 6;
    if (i.id === 'livre_diffindo_maxima') return currentFloor >= 6;
    if (i.id === 'livre_vulnera')         return currentFloor >= 6;
    if (i.id === 'livre_fulgur_catena')   return currentFloor >= 7;
    // livre_lux_aeterna : exclu du butin de coffre — exclusif à la quête
    // dumbledore_lumiere (cf. .claude/plans/dumbledore-lux-aeterna.md).
    if (i.id === 'livre_nox_vorax')       return currentFloor >= 9;
    return false;
  });

  const roll = Math.random();
  // 38% or | 30% consommable | 22% équipement | 10% livre (si dispo)
  const hasBook = booksAvailable.length > 0;

  if (roll < 0.38) {
    // Or
    const gold = Math.floor(Math.random() * 30 + 10) * currentFloor;
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();

  } else if (roll < 0.68) {
    // Consommable
    const possItems = ITEMS.filter(i => i.type === 'consumable');
    const item = possItems[Math.floor(Math.random() * possItems.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
    }

  } else if (roll < 0.90 || !hasBook) {
    // Équipement — pondéré par rareté et filtré par étage. Voir
    // pickChestEquipment() dans data.js et plan §3.5.
    const item = (typeof pickChestEquipment === 'function')
      ? pickChestEquipment(currentFloor || 1)
      : null;
    if (item && tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
    } else if (!item) {
      // Aucun équipement éligible pour cet étage — repli sur or
      const gold = Math.floor(Math.random() * 30 + 10) * (currentFloor || 1);
      player.gold += gold;
      addMsg(`Coffre vide… mais +${gold} Gallions cachés au fond`, 'good');
      updateUI();
    }

  } else {
    // Livre de sorts — drop rare et précieux
    const item = booksAvailable[Math.floor(Math.random() * booksAvailable.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(`Un vieux grimoire poussiéreux est là, dans le coffre : ${item.name} !`);
      addMsg(`📚 Grimoire trouvé : ${item.name} !`, 'magic');
    }
  }

  renderMinimap();
}

// ── Fouille renouvelée — réactivation différée ───────────────
// Délai de recharge (en pas) selon la difficulté courante.
function _searchRechargeSteps() {
  const ds = (typeof DIFFICULTY_SETTINGS !== 'undefined') && DIFFICULTY_SETTINGS[difficulty];
  return (ds && ds.searchRechargeSteps) || 60;
}

// Reconstruit la Map des cases fouillées depuis un tableau sérialisé.
// Format courant : [["x,y", {at, count}], …]. Les entrées legacy
// (simples chaînes "x,y") sont ignorées — le mode redémarre proprement.
function _searchedCellsFromArray(arr) {
  const m = new Map();
  if (Array.isArray(arr)) {
    for (const e of arr) {
      if (Array.isArray(e) && e.length === 2 && e[1] && typeof e[1] === 'object') {
        m.set(e[0], { at: e[1].at || 0, count: e[1].count || 1 });
      }
    }
  }
  return m;
}

// État de fouille d'une case : 'fresh' (jamais fouillée),
// 'recharging' (fouillée récemment) ou 'ready' (recharge écoulée).
function _searchCellStatus(key) {
  const rec = (searchedCells instanceof Map) ? searchedCells.get(key) : null;
  if (!rec) return { state: 'fresh', count: 0, left: 0 };
  const elapsed  = stepCount - rec.at;
  const recharge = _searchRechargeSteps();
  if (elapsed >= recharge) return { state: 'ready', count: rec.count, left: 0 };
  return { state: 'recharging', count: rec.count, left: recharge - elapsed };
}

// ── Mise à jour visuelle du bouton Fouiller ──────────────────
function _updateSearchBtn() {
  const btn = document.getElementById('btn-search');
  if (!btn) return;
  const st = _searchCellStatus(`${playerX},${playerY}`);
  btn.classList.toggle('searched', st.state === 'recharging');
  btn.title = st.state === 'recharging'
    ? `Fouillé récemment — de nouveau fouillable dans ~${st.left} pas`
    : 'Fouiller la pièce';
  if (typeof updateRoomStatus === 'function') updateRoomStatus();
}

// Ramasse la page du grimoire si la case courante en porte une, révélée
// par Revelio et non encore collectée. Retourne true si une page a été
// ramassée. Cf. .claude/plans/manon-grimoire-pages.md §5.
function _tryCollectPage() {
  if (typeof pagePlacements === 'undefined') return false;
  if (pagePlacements.get(currentFloor) !== `${playerX},${playerY}`) return false;
  if (!revealedPages.has(currentFloor)) return false;
  const page = (typeof getGrimoirePageForFloor === 'function')
    ? getGrimoirePageForFloor(currentFloor) : null;
  if (!page) return false;
  if (!Array.isArray(player.grimoirePages)) player.grimoirePages = [];
  if (player.grimoirePages.includes(page.id)) return false;
  player.grimoirePages.push(page.id);
  AudioSystem.playChestOpen();
  setNarrative(`Entre deux pierres, un feuillet givré : « ${page.name} ». Vous le glissez dans le grimoire.`);
  addMsg(`📄 Page récoltée : ${page.name}`, 'good');
  if (typeof checkPageQuest === 'function') checkPageQuest();
  if (typeof renderMinimap === 'function') renderMinimap();
  return true;
}

function searchRoom() {
  if (inBattle) return;

  // Une page de grimoire révélée sur la case courante est ramassée en
  // priorité — sans interagir avec la recharge de fouille.
  if (_tryCollectPage()) return;

  // Désamorçage de pièges : la fouille repère et neutralise tout piège
  // dans les 8 cases adjacentes (+ la case courante). Effet prioritaire,
  // sans consommer la recharge de fouille (Phase 2 §2.A).
  let disarmed = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = playerX + dx, ty = playerY + dy;
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      if (dungeon[ty][tx] === CELL.TRAP) { dungeon[ty][tx] = CELL.FLOOR; disarmed++; }
    }
  }
  if (disarmed > 0) {
    setNarrative(disarmed > 1
      ? `Votre prudence paie : vous repérez et désamorcez ${disarmed} pièges dissimulés.`
      : "Votre prudence paie : vous repérez et désamorcez un piège dissimulé.");
    addMsg(`Piège${disarmed > 1 ? 's' : ''} désamorcé${disarmed > 1 ? 's' : ''} (${disarmed}).`, 'good');
    renderMinimap();
    return;
  }

  // Révélation de passage secret : un mur secret dans les 8 cases
  // adjacentes est mis au jour par la fouille (Phase 3 §3.2). Effet
  // prioritaire, sans consommer la recharge de fouille.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const k = `${playerX + dx},${playerY + dy}`;
      if (secretWalls && secretWalls.has(k)) {
        secretWalls.delete(k);
        dungeon[playerY + dy][playerX + dx] = CELL.FLOOR;
        setNarrative("En tâtant la paroi, une pierre bascule — un passage dérobé s'ouvre dans le mur !");
        addMsg("Passage secret découvert !", 'good');
        if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
        renderMinimap();
        drawDungeon();
        return;
      }
    }
  }

  const key = `${playerX},${playerY}`;
  const st  = _searchCellStatus(key);
  if (st.state === 'recharging') {
    setNarrative(`Vous avez fouillé cet endroit récemment. Les recoins ne se regarniront pas avant ~${st.left} pas.`);
    addMsg("Fouillé récemment.", '');
    return;
  }

  // 'ready' = case déjà fouillée au moins une fois → butin dégressif.
  const repeat = st.count > 0;
  searchedCells.set(key, { at: stepCount, count: st.count + 1 });
  _updateSearchBtn();

  // Malus de fouille : jets indépendants (1 % chacun). Le monstre prime sur
  // le piège — déranger une créature interrompt aussitôt la fouille.
  if (Math.random() < SEARCH_MONSTER_CHANCE) {
    setNarrative("En soulevant une dalle, vous dérangez une créature tapie dans l'ombre !");
    addMsg("Votre fouille a réveillé un monstre !", 'bad');
    startBattle(pickSimilarEnemy());
    return;
  }
  if (Math.random() < SEARCH_TRAP_CHANCE) {
    _triggerSearchTrap();
    return;
  }

  const roll = Math.random();
  if (roll < SEARCH_GOLD_THRESHOLD) {
    let gold = Math.floor(Math.random() * 15 + 5);
    if (repeat) gold = Math.max(1, Math.floor(gold * 0.5));
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if (!repeat && roll < SEARCH_ITEM_THRESHOLD) {
    const item = ITEMS.find(i => i.id === 'mandragore') || ITEMS[0];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else if (!repeat && roll < SEARCH_ITEM_THRESHOLD + 0.20) {
    // Cueillette d'une herbe du palier de l'étage courant → besace.
    const tier = (currentFloor >= 7) ? 3 : (currentFloor >= 4) ? 2 : 1;
    const herbs = ITEMS.filter(i => i.type === 'herb' && i.tier === tier);
    const herb = herbs.length ? herbs[Math.floor(Math.random() * herbs.length)] : null;
    if (herb && tryAddItem(herb, { silent: true })) {
      setNarrative(`Entre deux pierres, une herbe a poussé : ${herb.name}. Vous la cueillez.`);
      addMsg(`Herbe cueillie : ${herb.name}`, 'good');
    } else {
      setNarrative(NARRATIVES.nothing);
      addMsg("Rien trouvé.", '');
    }
  } else {
    setNarrative(repeat
      ? "Vous fouillez à nouveau, mais l'endroit a déjà livré ses meilleurs secrets."
      : NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
}

// ── Piège de fouille — effet aléatoire, jamais létal ───────
// Trois variantes équiprobables : dégâts au groupe, dégâts à un seul
// personnage, ou dégâts au groupe + drain de PM. Chaque cible conserve
// toujours au moins 1 PV.
function _triggerSearchTrap() {
  const variant = Math.floor(Math.random() * 3);
  if (variant === 0) {
    party.slice(0, partySize).forEach(c => {
      if (c.hp <= 0) return;
      const dmg = Math.max(1, Math.floor(c.hpMax * 0.12));
      c.hp = Math.max(1, c.hp - dmg);
    });
    setNarrative("Un déclic sec — des lames jaillissent des murs ! Le groupe est lacéré.");
    addMsg("Piège ! Le groupe subit des dégâts.", 'bad');
  } else if (variant === 1) {
    const alive = party.slice(0, partySize).filter(c => c.hp > 0);
    if (alive.length) {
      const victim = alive[Math.floor(Math.random() * alive.length)];
      const dmg = Math.max(1, Math.floor(victim.hpMax * 0.20));
      victim.hp = Math.max(1, victim.hp - dmg);
      setNarrative(`Une dalle bascule sous ${victim.name} — un dard empoisonné le frappe !`);
      addMsg(`Piège ! ${victim.name} subit ${dmg} dégâts.`, 'bad');
    }
  } else {
    party.slice(0, partySize).forEach(c => {
      if (c.hp <= 0) return;
      const dmg = Math.max(1, Math.floor(c.hpMax * 0.08));
      c.hp = Math.max(1, c.hp - dmg);
      c.sp = Math.max(0, c.sp - Math.floor(c.spMax * 0.10));
    });
    setNarrative("Le sol cède : une brume sourde enveloppe le groupe, sapant corps et magie.");
    addMsg("Piège ! Le groupe est blessé et vidé d'une partie de sa magie.", 'bad');
  }
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
  updateUI();
}

// ── Piège de donjon — déclenché en marchant sur une case CELL.TRAP ──
// 50 % embuscade, 50 % dégâts/drain non létaux. La case a déjà été
// repassée en FLOOR par handleCellEntry. Le statut de combat n'est pas
// utilisé (risque hors-combat) : on s'en tient à dégâts / drain / ambush.
function _triggerDungeonTrap() {
  if (Math.random() < 0.5) {
    setNarrative("Le sol se dérobe en un déclic sec — une créature jaillit de la fosse !");
    addMsg("Piège ! Une embuscade vous tombe dessus.", 'bad');
    const f = currentFloor || 1;
    const pool = MONSTERS.filter(m => m.minFloor <= f
      && (m.maxFloor === null || f <= m.maxFloor));
    startBattle(scaleMonster(weightedPick(pool.length ? pool : MONSTERS), f));
    return;
  }
  // Variante dégâts/drain : réutilise les 3 sous-variantes non létales
  // de la fouille (lames, dard, brume) — narration compatible.
  _triggerSearchTrap();
}

// ── Autel Ancien — tribut risque/récompense, 1×/visite d'étage ──
// 'gold'   : offrande payante — soin complet du groupe + XP. Sûr.
// 'gamble' : pari gratuit 50/50 — gros gain XP+or, ou retour de flamme.
function useAltar(choice) {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.ALTAR) return;
  _hideExploreOverlay();
  const key = `${playerX},${playerY}`;
  if (usedAltars.has(key)) {
    addMsg("L'autel est inerte : son pouvoir s'est éteint pour cette visite.", 'bad');
    return;
  }
  const f = currentFloor || 1;
  if (choice === 'gold') {
    const cost = 40 * f;
    if (player.gold < cost) {
      addMsg(`Offrande refusée : il faut ${cost} Gallions.`, 'bad');
      return;
    }
    player.gold -= cost;
    party.forEach(c => { if (c.hp > 0) { c.hp = c.hpMax; c.sp = c.spMax; } });
    const xpGain = 30 * f;
    player.xp += xpGain;
    usedAltars.add(key);
    setNarrative("Vous déposez l'or sur la dalle runique. Une lumière tiède enveloppe le groupe — les blessures se referment, l'esprit s'éclaircit.");
    addMsg(`Bénédiction de l'autel : groupe restauré, +${xpGain} XP (−${cost} Gallions).`, 'good');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
    updateUI();
    if (typeof checkLevelUp === 'function') checkLevelUp();
  } else if (choice === 'gamble') {
    usedAltars.add(key);
    if (Math.random() < 0.5) {
      const xpGain = 60 * f, goldGain = 20 * f;
      player.xp += xpGain;
      player.gold += goldGain;
      setNarrative("Vous posez la main nue sur la pierre. Elle s'illumine d'or — le destin vous sourit !");
      addMsg(`Pari gagné : +${xpGain} XP, +${goldGain} Gallions.`, 'good');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
      updateUI();
      if (typeof checkLevelUp === 'function') checkLevelUp();
    } else {
      party.slice(0, partySize).forEach(c => {
        if (c.hp <= 0) return;
        const dmg = Math.max(1, Math.floor(c.hpMax * 0.22));
        c.hp = Math.max(1, c.hp - dmg);
      });
      setNarrative("La pierre vire au noir sous vos doigts — une douleur fulgurante traverse le groupe.");
      addMsg("Pari perdu : le groupe encaisse le retour de flamme de l'autel.", 'bad');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
      updateUI();
    }
  }
  safeCall('autoSave', 'altar-used');
}

// ── Porte scellée — ouverture à la Clé du Donjon (§2.C) ──────
// Appelée par _step quand le joueur avance vers une case CELL.DOOR.
// Avec une clé : la consomme et ouvre la porte (→ FLOOR). Sinon : refus.
function _tryOpenDoor(x, y) {
  const inv = player.inventory || [];
  const keyIdx = inv.findIndex(it => it && it.id === 'cle_donjon');
  if (keyIdx < 0) {
    setNarrative("Une lourde porte cloutée vous barre le chemin. Sa serrure ancienne réclame une clé.");
    addMsg("Porte scellée — il vous faut une Clé du Donjon.", 'bad');
    drawDungeon();
    return false;
  }
  inv.splice(keyIdx, 1);
  dungeon[y][x] = CELL.FLOOR;
  setNarrative("La clé tourne dans la serrure rouillée — la porte s'ouvre en grinçant sur une salle oubliée.");
  addMsg("🗝️ Porte déverrouillée.", 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  renderMinimap();
  drawDungeon();
  return true;
}

// ── Fontaine de pierre — soin total 1×/visite d'étage ──────
function useFountain() {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.FOUNTAIN) return;
  const key = `${playerX},${playerY}`;
  if (usedFountains.has(key)) {
    addMsg("La fontaine est tarie : revenez sur cet étage plus tard.", 'bad');
    return;
  }
  party.forEach(c => {
    if (c.hp <= 0) return;
    c.hp = c.hpMax;
    c.sp = c.spMax;
  });
  usedFountains.add(key);
  setNarrative("L'eau bleutée scintille. Le groupe boit longuement — la fatigue s'évanouit, la magie se ravive entièrement.");
  addMsg("Fontaine bue : PV et PM entièrement restaurés.", 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  updateUI();
  safeCall('autoSave', 'fountain-used');
}

function rest() {
  if (inBattle) return;
  if (restCooldown > 0) {
    setNarrative(`Le groupe est encore agité. Encore ${restCooldown} déplacement${restCooldown > 1 ? 's' : ''} avant de pouvoir se reposer.`);
    addMsg(`Repos impossible (${restCooldown} pas restants)`, 'bad');
    return;
  }
  if (Math.random() < REST_ENCOUNTER_CHANCE) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    // Repos interrompu : le groupe conserve une fraction du soin de repos
    // avant d'entrer en combat (cf. REST_INTERRUPT_HEAL_FRACTION).
    party.forEach(c => {
      const healAmt = Math.floor(c.hpMax * 0.3 * REST_INTERRUPT_HEAL_FRACTION);
      const spAmt   = Math.floor(c.spMax * 0.3 * REST_INTERRUPT_HEAL_FRACTION);
      c.hp = Math.min(c.hpMax, c.hp + healAmt);
      c.sp = Math.min(c.spMax, c.sp + spAmt);
    });
    addMsg("Le groupe n'a eu qu'un répit partiel.", '');
    const restFloor = Math.max(1, currentFloor - 1);
    const restPool  = MONSTERS.filter(m => m.minFloor <= restFloor);
    const pool      = restPool.length ? restPool : MONSTERS;
    const enemy     = scaleMonster(weightedPick(pool), restFloor);
    restCooldown = 5;
    startBattle(enemy);
    return;
  }
  party.forEach(c => {
    const healAmt = Math.floor(c.hpMax * 0.3);
    const spAmt   = Math.floor(c.spMax * 0.3);
    c.hp = Math.min(c.hpMax, c.hp + healAmt);
    c.sp = Math.min(c.spMax, c.sp + spAmt);
  });
  restCooldown = 5;
  setNarrative("Le groupe se repose quelques instants. Les forces se restaurent partiellement.");
  addMsg(`Repos : HP et PM restaurés (repos disponible dans 5 pas)`, 'good');
  updateUI();
}
