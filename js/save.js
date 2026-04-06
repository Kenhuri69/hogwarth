// ============================================================
// SAUVEGARDE ET CHARGEMENT
// ============================================================

function saveGame() {
  if (inBattle) { addMsg("Impossible de sauvegarder en combat !", "bad"); return; }

  const gameState = {
    party:        [player, player2],
    partySize,
    currentFloor, playerX, playerY, playerDir,
    dungeon, visited, enemyMap, itemMap
  };
  localStorage.setItem('hogwarts_rpg_save', JSON.stringify(gameState));
  addMsg("Partie sauvegardée !", "good");
}

function loadGame() {
  const saved = localStorage.getItem('hogwarts_rpg_save');
  if (!saved) { addMsg("Aucune sauvegarde trouvée.", "bad"); return; }

  const gs = JSON.parse(saved);

  // Mutation des objets existants pour conserver les références (party[0] = player, etc.)
  if (gs.party && gs.party[0]) Object.assign(player,  gs.party[0]);
  if (gs.party && gs.party[1]) Object.assign(player2, gs.party[1]);

  // Ré-aligner party avec les objets mutés
  party[0] = player;
  party[1] = player2;

  if (gs.partySize) partySize = gs.partySize;
  currentFloor = gs.currentFloor;
  playerX      = gs.playerX;
  playerY      = gs.playerY;
  playerDir    = gs.playerDir;
  dungeon      = gs.dungeon;
  visited      = gs.visited;
  enemyMap     = gs.enemyMap;
  itemMap      = gs.itemMap;

  inBattle = false;
  document.getElementById('encounter-overlay').style.display = 'none';
  document.getElementById('btn-interact').style.display      = 'none';

  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateLocationDisplay();
  setNarrative("Le groupe reprend ses esprits. La partie est chargée !");
  addMsg("Partie chargée !", "good");
}
