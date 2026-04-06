// ============================================================
// INITIALISATION DU JEU
// ============================================================

function startGame() {
  document.getElementById('title-screen').style.display='none';
  const gc=document.getElementById('game-container');
  gc.style.display='grid';
  resizeCanvas();
  generateDungeon(1);
  updateUI();
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateLocationDisplay();
  setNarrative("Bienvenue à Poudlard, jeune sorcier. Les couloirs humides et tortueux vous attendent. La Chambre Secrète se cache quelque part dans les profondeurs...");

  // Boucle de rendu
  let frame=0;
  function render() {
    frame++;
    if(frame%30===0 && !inBattle) drawDungeon();
    requestAnimationFrame(render);
  }
  render();
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
