// ============================================================
// INITIALISATION DU JEU
// ============================================================

// Affiche l'écran de sélection du nombre de joueurs
function showPlayerSelect() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('player-select-screen').style.display = 'flex';
}

// Stocke temporairement la taille du groupe pendant l'écran de choix de Maison
let _pendingPartySize = 2;

// Appelé depuis les boutons de l'écran de sélection (lit la difficulté, ouvre l'écran Maison)
function startGameWithDifficulty(count = 2) {
  difficulty        = document.getElementById('difficulty-select')?.value || 'Normal';
  _pendingPartySize = count;
  document.getElementById('player-select-screen').style.display = 'none';
  document.getElementById('house-select-screen').style.display  = 'flex';
}

// Appelé depuis les boutons de l'écran des Maisons
function chooseHouse(house) {
  chosenHouse = house;
  housePoints = 0;
  houseTier   = 0;
  document.getElementById('house-select-screen').style.display = 'none';
  startGame(_pendingPartySize);
}

// ── Vérifie si un nouveau palier de Maison est atteint ──────
window.checkHouseLevelUp = function checkHouseLevelUp() {
  if (!chosenHouse) return;
  const bonuses = HOUSE_BONUSES[chosenHouse];
  if (!bonuses) return;

  bonuses.tiers.forEach((tier, i) => {
    const tierNum = i + 1;
    if (houseTier >= tierNum) return;            // déjà atteint
    if (housePoints < tier.threshold) return;   // pas encore

    houseTier = tierNum;
    addMsg(tier.msg, 'magic');
    AudioSystem.playLevelUp();

    // Appliquer les bonus de stat
    party.forEach(c => {
      if (tier.bonus._baseAtk) c._baseAtk += tier.bonus._baseAtk;
      if (tier.bonus._baseDef) c._baseDef += tier.bonus._baseDef;
      if (tier.bonus._baseMag) c._baseMag += tier.bonus._baseMag;
      if (tier.bonus._baseLck) c._baseLck += tier.bonus._baseLck;
    });

    // Donner l'objet légendaire (palier 4)
    if (tier.bonus.item) {
      const item = ITEMS.find(it => it.id === tier.bonus.item);
      if (item && player.inventory.length < 16) {
        player.inventory.push({ ...item });
        addMsg(`🎁 ${item.icon} ${item.name} ajouté à l'inventaire !`, 'good');
      }
    }

    recalculateStats();
    updateUI();
  });
}

function startGame(count = 2) {
  partySize = count;

  // Appliquer les bonus/malus de départ selon la difficulté
  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal'];
  player.gold    = settings.startingGold;
  party.forEach(c => {
    c.hpMax = Math.max(8, c.hpMax + settings.startingHpBonus);
    c.hp    = c.hpMax;
  });

  // En mode solo : masquer la carte d'Hermione et l'indicateur de tour
  const card1 = document.getElementById('char-card-1');
  if (card1) card1.style.display = partySize === 1 ? 'none' : '';
  const indicator = document.getElementById('battle-char-indicator');
  if (indicator) indicator.style.display = partySize === 1 ? 'none' : '';

  const gc = document.getElementById('game-container');
  gc.style.display = 'grid';
  resizeCanvas();
  generateDungeon(1);
  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateLocationDisplay();

  const diffIcon = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' }[difficulty] || '';
  const modeLabel = `${diffIcon} Mode ${difficulty}`;
  const intro = partySize === 1
    ? `Bienvenue à Poudlard, Harry. ${modeLabel} activé. Les couloirs humides vous attendent...`
    : `Bienvenue à Poudlard. Harry et Hermione s'élancent. ${modeLabel} activé.`;
  setNarrative(intro);
  addMsg(modeLabel, difficulty === 'Expert' ? 'bad' : 'good');

  // Lancer la musique ambiante (le geste utilisateur vient du clic sur startGame)
  AudioSystem.init();
  AudioSystem.playAmbientMusic(1);

  // Boucle de rendu
  let frame = 0;
  function render() {
    frame++;
    if (frame % 30 === 0 && !inBattle) drawDungeon();
    requestAnimationFrame(render);
  }
  render();
}

// ============================================================
// OVERLAY CARTE MOBILE
// ============================================================

function toggleMobileMap() {
  const overlay = document.getElementById('map-overlay');
  const opening = overlay.style.display !== 'flex';
  overlay.style.display = opening ? 'flex' : 'none';
  if (opening) {
    // Construire la carte agrandie au moment de l'ouverture
    _buildMinimapCells(document.getElementById('minimap-mobile'), 20);
    // Mettre à jour le niveau affiché
    const lvlEl = document.getElementById('map-overlay-floor');
    if (lvlEl) lvlEl.textContent = `Niveau ${currentFloor}`;
  }
}

// ============================================================
// CLAVIER
// ============================================================

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  const map={w:'n',s:'s',a:'w',d:'e',ArrowUp:'n',ArrowDown:'s',ArrowLeft:'w',ArrowRight:'e'};
  if(map[e.key]) { move(map[e.key]); e.preventDefault(); }
  if(e.key==='i') openInventory();
  if(e.key==='p') openSpells();
  if(e.key==='c') openCharacter();
  if(e.key==='f') searchRoom();
  if(e.key==='r') rest();
  if(e.key==='Escape') {
    ['inventory-modal','spell-modal','shop-modal','character-modal'].forEach(closeModal);
  }
});

// ============================================================
// ÉTOILES DE L'ÉCRAN TITRE
// ============================================================

function generateStars() {
  const container=document.getElementById('stars-container');
  for(let i=0;i<150;i++) {
    const star=document.createElement('div');
    star.className='star';
    star.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${2+Math.random()*4}s;--delay:${Math.random()*4}s;--op:${0.3+Math.random()*0.7}`;
    container.appendChild(star);
  }
}

// ============================================================
// RESPONSIVE
// ============================================================

window.addEventListener('resize',()=>{
  resizeCanvas();
  if(document.getElementById('game-container').style.display!=='none') drawDungeon();
});

// Démarrage
generateStars();
