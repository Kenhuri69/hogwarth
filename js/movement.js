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
  AudioSystem.playFootstep();

  const cell = dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  if (enemyMap[playerY][playerX]) {
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  handleCellEntry(cell);
}

function handleCellEntry(cell) {
  const btn = document.getElementById('btn-interact');
  btn.style.display = 'none';

  if (cell === CELL.STAIRS_D) {
    setNarrative(NARRATIVES.stairs_down);
    btn.style.display = 'inline-block';
    btn.textContent   = '⬇ Descendre';
    btn.onclick       = () => goDeeper();
  } else if (cell === CELL.STAIRS_U) {
    setNarrative(NARRATIVES.stairs_up);
    btn.style.display = 'inline-block';
    btn.textContent   = '⬆ Remonter';
    btn.onclick       = () => goUp();
  } else if (cell === CELL.SHOP) {
    setNarrative(NARRATIVES.shop);
    btn.style.display = 'inline-block';
    btn.textContent   = '🏪 Entrer dans la boutique';
    btn.onclick       = () => openShop();
  } else if (cell === CELL.CHEST) {
    setNarrative(NARRATIVES.chest);
    btn.style.display = 'inline-block';
    btn.textContent   = '📦 Ouvrir le coffre';
    btn.onclick       = () => openChest();
  } else {
    if (Math.random() < 0.15) {
      if (Math.random() < 0.08) {
        setNarrative(NARRATIVES.trap);
        // Piège : touche un personnage vivant aléatoire
        const alive = party.filter(c => c.hp > 0);
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg = Math.ceil(Math.random() * 5 + 2);
        target.hp = Math.max(0, target.hp - dmg);
        addMsg(`Piège ! ${target.name} perd ${dmg} PV`, 'bad');
        updateUI();
        if (party.every(c => c.hp <= 0)) triggerDeath("Un piège sournois a vaincu le groupe...");
      }
    } else {
      setNarrative(NARRATIVES.floor[Math.floor(Math.random() * NARRATIVES.floor.length)]);
    }
  }
}

function goDeeper() {
  currentFloor++;
  generateDungeon(currentFloor);
  updateLocationDisplay();
  setNarrative(`Le groupe descend au niveau ${currentFloor} des donjons de Poudlard...`);
  document.getElementById('btn-interact').style.display = 'none';
  renderMinimap();
  drawDungeon();
  updateCompass();
  addMsg(`Niveau ${currentFloor} atteint !`, 'good');
  AudioSystem.playAmbientMusic(currentFloor);
}

function goUp() {
  if (currentFloor <= 1) return;
  currentFloor--;
  generateDungeon(currentFloor);
  updateLocationDisplay();
  renderMinimap();
  drawDungeon();
  updateCompass();
  AudioSystem.playAmbientMusic(currentFloor);
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

function searchRoom() {
  if (inBattle) return;
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
  if (Math.random() < 0.3) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    // Ennemis de repos : niveau 1-2 uniquement (créatures faibles)
  const restPool = MONSTERS.filter(m => m.minFloor <= 2);
  const enemy = scaleMonster(restPool[Math.floor(Math.random() * restPool.length)], currentFloor);
    startBattle(enemy);
    return;
  }
  // Soigner les deux personnages
  party.forEach(c => {
    const healAmt = Math.floor(c.hpMax * 0.3);
    const spAmt   = Math.floor(c.spMax * 0.3);
    c.hp = Math.min(c.hpMax, c.hp + healAmt);
    c.sp = Math.min(c.spMax, c.sp + spAmt);
  });
  setNarrative("Le groupe se repose quelques instants. Les forces se restaurent partiellement.");
  addMsg(`Repos : HP et PM restaurés`, 'good');
  updateUI();
}
