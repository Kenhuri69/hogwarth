// ============================================================
// DÉPLACEMENT ET ÉVÉNEMENTS DE CELLULE
// ============================================================

function canMove(dir) {
  if(inBattle) return false;
  const delta = {n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]};
  const [dx,dy]=delta[dir];
  const nx=playerX+dx, ny=playerY+dy;
  if(nx<0||ny<0||nx>=MAP_W||ny>=MAP_H) return false;
  return dungeon[ny][nx]!==CELL.WALL;
}

function move(dir) {
  if(inBattle) return;
  playerDir=dir;
  if(!canMove(dir)) {
    setNarrative("Un mur de pierre solide bloque le passage.");
    updateCompass();
    drawDungeon();
    return;
  }
  const delta = {n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]};
  const [dx,dy]=delta[dir];
  playerX+=dx; playerY+=dy;
  visited[playerY][playerX]=true;

  const cell=dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  if(enemyMap[playerY][playerX]) {
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  handleCellEntry(cell);
}

function handleCellEntry(cell) {
  const btn=document.getElementById('btn-interact');
  btn.style.display='none';
  if(cell===CELL.STAIRS_D) {
    setNarrative(NARRATIVES.stairs_down);
    btn.style.display='inline-block';
    btn.textContent='⬇ Descendre';
    btn.onclick=()=>goDeeper();
  } else if(cell===CELL.STAIRS_U) {
    setNarrative(NARRATIVES.stairs_up);
    btn.style.display='inline-block';
    btn.textContent='⬆ Remonter';
    btn.onclick=()=>goUp();
  } else if(cell===CELL.SHOP) {
    setNarrative(NARRATIVES.shop);
    btn.style.display='inline-block';
    btn.textContent='🏪 Entrer dans la boutique';
    btn.onclick=()=>openShop();
  } else if(cell===CELL.CHEST) {
    setNarrative(NARRATIVES.chest);
    btn.style.display='inline-block';
    btn.textContent='📦 Ouvrir le coffre';
    btn.onclick=()=>openChest();
  } else {
    if(Math.random()<0.15) {
      const trap_chance=0.08;
      if(Math.random()<trap_chance) {
        setNarrative(NARRATIVES.trap);
        const dmg=Math.ceil(Math.random()*5+2);
        player.hp=Math.max(0,player.hp-dmg);
        addMsg(`Piège ! Vous perdez ${dmg} PV`, 'bad');
        updateUI();
        if(player.hp<=0) triggerDeath("Un piège sournois vous a eu...");
      }
    } else {
      setNarrative(NARRATIVES.floor[Math.floor(Math.random()*NARRATIVES.floor.length)]);
    }
  }
}

function goDeeper() {
  currentFloor++;
  generateDungeon(currentFloor);
  updateLocationDisplay();
  setNarrative(`Vous descendez au niveau ${currentFloor} des donjons de Poudlard...`);
  document.getElementById('btn-interact').style.display='none';
  renderMinimap();
  drawDungeon();
  updateCompass();
  addMsg(`Niveau ${currentFloor} atteint !`, 'good');
}

function goUp() {
  if(currentFloor<=1) return;
  currentFloor--;
  generateDungeon(currentFloor);
  updateLocationDisplay();
  renderMinimap();
  drawDungeon();
  updateCompass();
}

function openChest() {
  dungeon[playerY][playerX]=CELL.FLOOR;
  document.getElementById('btn-interact').style.display='none';
  const roll=Math.random();
  if(roll<0.4) {
    const gold=Math.floor(Math.random()*30+10)*currentFloor;
    player.gold+=gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if(roll<0.75) {
    const possItems=ITEMS.filter(i=>i.type==='consumable');
    const item=possItems[Math.floor(Math.random()*possItems.length)];
    if(player.inventory.length<16) {
      player.inventory.push({...item});
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.name}`, 'good');
    }
  } else {
    const wep=ITEMS.filter(i=>i.type==='wand'||i.type==='armor');
    const item=wep[Math.floor(Math.random()*wep.length)];
    if(player.inventory.length<16) {
      player.inventory.push({...item});
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${item.name}`, 'good');
    }
  }
  renderMinimap();
}

function searchRoom() {
  if(inBattle) return;
  const roll=Math.random();
  if(roll<0.2) {
    const gold=Math.floor(Math.random()*15+5);
    player.gold+=gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if(roll<0.35) {
    const item=ITEMS.find(i=>i.id==='mandragore')||ITEMS[0];
    if(player.inventory.length<16) {
      player.inventory.push({...item});
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else {
    setNarrative(NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
}

function rest() {
  if(inBattle) return;
  if(Math.random()<0.3) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    const enemy=ENEMIES[Math.floor(Math.random()*Math.min(3,ENEMIES.length))];
    startBattle(enemy);
    return;
  }
  const healAmt=Math.floor(player.hpMax*0.3);
  const spAmt=Math.floor(player.spMax*0.3);
  player.hp=Math.min(player.hpMax,player.hp+healAmt);
  player.sp=Math.min(player.spMax,player.sp+spAmt);
  setNarrative("Vous vous reposez quelques instants. Vos forces se restaurent partiellement.");
  addMsg(`Repos : +${healAmt} PV, +${spAmt} PM`, 'good');
  updateUI();
}
