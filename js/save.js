// ============================================================
// SAUVEGARDE ET CHARGEMENT
// ============================================================

function saveGame() {
  if (inBattle) {
    addMsg("Impossible de sauvegarder en combat !", "bad");
    return;
  }

  const gameState = {
    player: player,
    currentFloor: currentFloor,
    playerX: playerX,
    playerY: playerY,
    playerDir: playerDir,
    dungeon: dungeon,
    visited: visited,
    enemyMap: enemyMap,
    itemMap: itemMap
  };

  localStorage.setItem('hogwarts_rpg_save', JSON.stringify(gameState));
  addMsg("Partie sauvegardée !", "good");
}

function loadGame() {
  const saved = localStorage.getItem('hogwarts_rpg_save');
  if (saved) {
    const gameState = JSON.parse(saved);

    player = gameState.player;
    currentFloor = gameState.currentFloor;
    playerX = gameState.playerX;
    playerY = gameState.playerY;
    playerDir = gameState.playerDir;
    dungeon = gameState.dungeon;
    visited = gameState.visited;
    enemyMap = gameState.enemyMap;
    itemMap = gameState.itemMap;

    inBattle = false;
    document.getElementById('encounter-overlay').style.display = 'none';
    document.getElementById('btn-interact').style.display = 'none';

    updateUI();
    updateCompass();
    renderMinimap();
    drawDungeon();
    updateLocationDisplay();

    setNarrative("Vous reprenez vos esprits. La partie est chargée !");
    addMsg("Partie chargée !", "good");
  } else {
    addMsg("Aucune sauvegarde trouvée.", "bad");
  }
}
