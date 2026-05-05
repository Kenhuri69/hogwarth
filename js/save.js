// ============================================================
// SAUVEGARDE ET CHARGEMENT
// ============================================================

function saveGame() {
  if (inBattle) { addMsg("Impossible de sauvegarder en combat !", "bad"); return; }

  const gameState = {
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
    searchedCells: Array.from(searchedCells),
    floorDungeons,
    restCooldown
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

  if (gs.partySize)     partySize    = gs.partySize;
  if (gs.seenMonsters) seenMonsters = new Set(gs.seenMonsters);
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
  document.getElementById('encounter-overlay').style.display = 'none';
  document.getElementById('btn-interact').style.display      = 'none';
  const expl = document.getElementById('explore-overlay');
  if (expl) expl.style.display = 'none';

  if (gs.activeQuests) activeQuests = gs.activeQuests;
  if (gs.difficulty && DIFFICULTY_SETTINGS[gs.difficulty]) difficulty = gs.difficulty;
  if (gs.chosenHouse && HOUSE_BONUSES[gs.chosenHouse]) chosenHouse = gs.chosenHouse;
  if (gs.housePoints !== undefined) housePoints = gs.housePoints;
  if (gs.houseTier   !== undefined) houseTier   = gs.houseTier;
  if (gs.searchedCells) searchedCells = new Set(gs.searchedCells);
  if (gs.floorDungeons) floorDungeons = gs.floorDungeons;
  if (gs.restCooldown  !== undefined) restCooldown = gs.restCooldown;

  // Recalculer les stats effectives (base + équipement chargé)
  recalculateStats();
  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateLocationDisplay();
  setNarrative("Le groupe reprend ses esprits. La partie est chargée !");
  addMsg("Partie chargée !", "good");
}
