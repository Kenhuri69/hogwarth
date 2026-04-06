// ============================================================
// INITIALISATION DU JEU
// ============================================================

// Affiche l'écran de sélection du nombre de joueurs
function showPlayerSelect() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('player-select-screen').style.display = 'flex';
}

function startGame(count = 2) {
  partySize = count;
  document.getElementById('player-select-screen').style.display = 'none';

  // En mode solo : masquer la carte d'Hermione
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

  const intro = partySize === 1
    ? "Bienvenue à Poudlard, Harry. Les couloirs humides vous attendent. Serez-vous à la hauteur ?"
    : "Bienvenue à Poudlard, jeune sorcier. Harry et Hermione s'avancent dans les couloirs. La Chambre Secrète se cache dans les profondeurs...";
  setNarrative(intro);

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
