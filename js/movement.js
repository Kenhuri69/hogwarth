// ============================================================
// DÉPLACEMENT ET ÉVÉNEMENTS DE CELLULE
// ============================================================

function canMove(dir) {
  if (inBattle) return false;
  const delta = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };
  const [dx, dy] = delta[dir];
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
  const delta = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };
  const [dx, dy] = delta[dir];
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

// ── Overlay exploration (coffre / escalier / boutique) ──────
function _showExploreOverlay(cell) {
  const overlay = document.getElementById('explore-overlay');
  const icon    = document.getElementById('explore-icon');
  const title   = document.getElementById('explore-title');
  const desc    = document.getElementById('explore-desc');
  const actions = document.getElementById('explore-actions');

  let iconHtml, titleText, descText, btns;

  if (cell === CELL.CHEST) {
    iconHtml  = '📦';
    titleText = 'Coffre Magique';
    descText  = 'Un vieux coffre verrouillé trône contre le mur de pierre. Qui sait ce qu\'il contient ?';
    btns = `<button class="explore-btn" onclick="openChest();_hideExploreOverlay()">📦 Ouvrir le coffre</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Ignorer</button>`;
  } else if (cell === CELL.SHOP) {
    iconHtml  = '🏪';
    titleText = 'Échoppe Ambulante';
    descText  = 'Une aile de la bibliothèque transformée en échoppe de fortune. Des articles magiques sont disponibles.';
    btns = `<button class="explore-btn" onclick="openShop();_hideExploreOverlay()">🏪 Entrer dans la boutique</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Passer son chemin</button>`;
  } else if (cell === CELL.STAIRS_D) {
    iconHtml  = `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <defs>
        <linearGradient id="stoneTopD" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#a89870"/><stop offset="1" stop-color="#5a4a32"/>
        </linearGradient>
        <radialGradient id="holeD" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#1a1208"/>
        </radialGradient>
      </defs>
      <!-- encadrement -->
      <polygon points="6,108 94,108 72,12 28,12" fill="#2a2010" stroke="#c9a84c" stroke-width="1.2"/>
      <!-- marches descendantes : la plus large en bas (proche), s'enfonce vers le haut -->
      <g>
        <!-- marche 1 (avant, plus large) -->
        <polygon points="10,104 90,104 80,90 20,90" fill="#8a7a5a"/>
        <rect x="20" y="90" width="60" height="6" fill="#3a2e1c"/>
        <!-- marche 2 -->
        <polygon points="22,86 78,86 71,74 29,74" fill="#7a6a4a"/>
        <rect x="29" y="74" width="42" height="5" fill="#2e2414"/>
        <!-- marche 3 -->
        <polygon points="31,71 69,71 64,61 36,61" fill="#6a5a3a"/>
        <rect x="36" y="61" width="28" height="4" fill="#241a0c"/>
        <!-- marche 4 -->
        <polygon points="38,58 62,58 58,50 42,50" fill="#5a4a30"/>
        <rect x="42" y="50" width="16" height="3" fill="#1a1208"/>
        <!-- trou noir -->
        <ellipse cx="50" cy="38" rx="12" ry="14" fill="url(#holeD)"/>
      </g>
      <!-- highlights bord avant -->
      <line x1="10" y1="104" x2="90" y2="104" stroke="#c9a84c" stroke-width="1" opacity="0.6"/>
      <line x1="22" y1="86" x2="78" y2="86" stroke="#c9a84c" stroke-width="0.8" opacity="0.4"/>
      <!-- flèche dorée subtile -->
      <path d="M50 28 L50 44 M44 38 L50 46 L56 38" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    </svg>`;
    titleText = 'Escalier Descendant';
    descText  = 'Un escalier en colimaçon disparaît dans les profondeurs. Le danger augmente en descendant.';
    btns = `<button class="explore-btn" onclick="_hideExploreOverlay();goDeeper()">Descendre</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`;
  } else if (cell === CELL.STAIRS_U) {
    iconHtml  = `<svg viewBox="0 0 100 110" width="110" height="120" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <!-- arche en haut -->
      <path d="M30 18 L30 36 L70 36 L70 18 Q70 4 50 4 Q30 4 30 18 Z" fill="#2a2010" stroke="#c9a84c" stroke-width="1"/>
      <path d="M36 22 L36 36 L64 36 L64 22 Q64 12 50 12 Q36 12 36 22 Z" fill="#0a0604"/>
      <!-- clé d'arche -->
      <polygon points="46,4 54,4 56,12 44,12" fill="#a89870" stroke="#3a2e1c" stroke-width="0.5"/>
      <!-- marches montantes (la plus basse devant et plus large) -->
      <g>
        <!-- marche 4 (haut, étroite) -->
        <polygon points="38,36 62,36 58,44 42,44" fill="#8a7a5a"/>
        <rect x="38" y="36" width="24" height="2" fill="#c9a84c" opacity="0.5"/>
        <!-- marche 3 -->
        <polygon points="34,44 66,44 62,54 38,54" fill="#7a6a4a"/>
        <rect x="38" y="44" width="24" height="2" fill="#c9a84c" opacity="0.4"/>
        <line x1="46" y1="46" x2="46" y2="54" stroke="#1a1208" stroke-width="0.5"/>
        <line x1="54" y1="46" x2="54" y2="54" stroke="#1a1208" stroke-width="0.5"/>
        <!-- marche 2 -->
        <polygon points="28,54 72,54 68,68 32,68" fill="#8a7a5a"/>
        <rect x="34" y="54" width="32" height="3" fill="#c9a84c" opacity="0.4"/>
        <line x1="44" y1="57" x2="44" y2="68" stroke="#1a1208" stroke-width="0.6"/>
        <line x1="56" y1="57" x2="56" y2="68" stroke="#1a1208" stroke-width="0.6"/>
        <!-- marche 1 (bas, plus large) -->
        <polygon points="18,68 82,68 76,86 24,86" fill="#a89870"/>
        <rect x="28" y="68" width="44" height="4" fill="#c9a84c" opacity="0.45"/>
        <line x1="40" y1="72" x2="40" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <line x1="52" y1="72" x2="52" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <line x1="64" y1="72" x2="64" y2="86" stroke="#1a1208" stroke-width="0.7"/>
        <!-- sol -->
        <polygon points="10,86 90,86 86,108 14,108" fill="#3a2e1c"/>
      </g>
      <!-- flèche dorée subtile -->
      <path d="M50 80 L50 64 M44 70 L50 62 L56 70" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    </svg>`;
    titleText = 'Escalier Montant';
    descText  = 'Un escalier de pierre remonte vers les étages supérieurs, moins dangereux.';
    btns = `<button class="explore-btn" onclick="_hideExploreOverlay();goUp()">Remonter</button>
            <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`;
  } else return;

  icon.innerHTML      = iconHtml;
  title.textContent   = titleText;
  desc.textContent    = descText;
  actions.innerHTML   = btns;
  overlay.style.display = 'flex';
}

function _hideExploreOverlay() {
  document.getElementById('explore-overlay').style.display = 'none';
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
      cell === CELL.SHOP     || cell === CELL.CHEST) {
    _showExploreOverlay(cell);
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
    searchedCells: Array.from(searchedCells)
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
    if (player.inventory.length < 16) {
      player.inventory.push({ ...item });
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.icon} ${item.name}`, 'good');
    }

  } else if (roll < 0.90 || !hasBook) {
    // Équipement (wand / armor / acc)
    const gear = ITEMS.filter(i => ['wand','armor','acc'].includes(i.type));
    const item  = gear[Math.floor(Math.random() * gear.length)];
    if (player.inventory.length < 16) {
      player.inventory.push({ ...item });
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.icon} ${item.name}`, 'good');
    }

  } else {
    // Livre de sorts — drop rare et précieux
    const item = booksAvailable[Math.floor(Math.random() * booksAvailable.length)];
    if (player.inventory.length < 16) {
      player.inventory.push({ ...item });
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
    if (player.inventory.length < 16) {
      player.inventory.push({ ...item });
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else {
    setNarrative(NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
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
