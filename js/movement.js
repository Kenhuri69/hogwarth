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

function move(dir) {
  if (inBattle) return;
  playerDir = dir;
  if (!canMove(dir)) {
    setNarrative("Un mur de pierre solide bloque le passage.");
    updateCompass();
    drawDungeon();
    return;
  }
  const [dx, dy] = DIRECTIONS[dir];
  playerX += dx; playerY += dy;
  visited[playerY][playerX] = true;
  if (restCooldown > 0) restCooldown--;
  AudioSystem.playFootstep();

  const cell = dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  _updateSearchBtn();

  if (enemyMap[playerY][playerX]) {
    _hideExploreOverlay();
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  handleCellEntry(cell);
}

// ── Overlay exploration (coffre / escalier / boutique / fontaine) ───
// Pour chaque cellule interactive : un descripteur (icon, title, desc,
// btns). Les SVG eux-mêmes sont centralisés dans `js/scene-icons.js`.
function _exploreDescriptors() {
  const fountainDried = usedFountains && usedFountains.has(`${playerX},${playerY}`);
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
    [CELL.STAIRS_D]: {
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
      cell === CELL.FOUNTAIN) {
    _showExploreOverlay(cell);
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
  searchedCells = new Set(c.searchedCells || []);
  npcPlacements = new Map(c.npcPlacements || []);
  // Nouvelle visite = nouvelle eau dans la fontaine et nouvelles larmes Fumseck
  usedFountains = new Set();
  usedSpecialNpcs = new Set();
  return true;
}

function goDeeper() {
  _saveFloorToCache(currentFloor);
  currentFloor++;

  const locName = LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)];

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Set();
      generateDungeon(currentFloor);
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    addMsg(`Niveau ${currentFloor} atteint !`, 'good');
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof checkFloorQuests === 'function') checkFloorQuests(currentFloor);
    safeCall('autoSave', 'floor-down');
  });
  setNarrative(`Le groupe descend au niveau ${currentFloor} des donjons de Poudlard...`);
}

function goUp() {
  if (currentFloor <= 1) return;
  _saveFloorToCache(currentFloor);
  currentFloor--;

  const locName = LOCATIONS[Math.min(currentFloor - 1, LOCATIONS.length - 1)];

  _floorTransition(currentFloor, locName, () => {
    if (!_restoreFloorFromCache(currentFloor)) {
      searchedCells = new Set();
      generateDungeon(currentFloor);
    }
    restCooldown = 0;
    updateLocationDisplay();
    document.getElementById('btn-interact').style.display = 'none';
    _updateSearchBtn();
    renderMinimap();
    drawDungeon();
    updateCompass();
    AudioSystem.playAmbientMusic(currentFloor);
    if (typeof checkFloorQuests === 'function') checkFloorQuests(currentFloor);
    safeCall('autoSave', 'floor-up');
  });
  setNarrative(`Le groupe remonte au niveau ${currentFloor}...`);
}

function openChest() {
  dungeon[playerY][playerX] = CELL.FLOOR;
  document.getElementById('btn-interact').style.display = 'none';
  AudioSystem.playChestOpen();

  // Livres de sorts disponibles selon l'étage courant
  const booksAvailable = ITEMS.filter(i => {
    if (i.type !== 'spellbook') return false;
    if (i.id === 'livre_sortileges') return currentFloor >= 2;
    if (i.id === 'livre_soin')       return currentFloor >= 3;
    if (i.id === 'book_monsters')    return currentFloor >= 3;
    if (i.id === 'livre_prince')     return currentFloor >= 6; // rare et puissant
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

// ── Mise à jour visuelle du bouton Fouiller ──────────────────
function _updateSearchBtn() {
  const btn = document.getElementById('btn-search');
  if (!btn) return;
  const key = `${playerX},${playerY}`;
  const already = searchedCells.has(key);
  btn.classList.toggle('searched', already);
  btn.title = already ? 'Case déjà fouillée' : 'Fouiller la pièce';
  if (typeof updateRoomStatus === 'function') updateRoomStatus();
}

function searchRoom() {
  if (inBattle) return;

  const key = `${playerX},${playerY}`;
  if (searchedCells.has(key)) {
    setNarrative("Vous avez déjà fouillé cet endroit. Il ne reste rien ici.");
    addMsg("Déjà fouillé.", '');
    return;
  }
  searchedCells.add(key);
  _updateSearchBtn();

  const roll = Math.random();
  if (roll < 0.2) {
    const gold = Math.floor(Math.random() * 15 + 5);
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if (roll < 0.35) {
    const item = ITEMS.find(i => i.id === 'mandragore') || ITEMS[0];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else {
    setNarrative(NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
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
  if (Math.random() < 0.3) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    const restFloor = Math.max(1, currentFloor - 1);
    const restPool  = MONSTERS.filter(m => m.minFloor <= restFloor);
    const pool      = restPool.length ? restPool : MONSTERS;
    const enemy     = scaleMonster(weightedPick(pool), restFloor);
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
