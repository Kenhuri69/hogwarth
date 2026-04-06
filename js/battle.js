// ============================================================
// SYSTÈME DE COMBAT
// ============================================================

function startBattle(enemyData) {
  inBattle=true;
  shieldTurns=0;
  enemyDisarmed=0;
  battleTurn=0;
  currentEnemy={...enemyData};
  enemyHp=currentEnemy.hp;

  document.getElementById('enemy-art').textContent=currentEnemy.icon;
  document.getElementById('enemy-name').textContent=currentEnemy.name;
  updateEnemyBars();
  document.getElementById('battle-log').textContent=`${currentEnemy.desc} !`;
  document.getElementById('encounter-overlay').style.display='flex';
  addMsg(`Combat : ${currentEnemy.name}`, 'bad');
  addLog(`⚔️ Combat vs ${currentEnemy.name}`);
}

function updateEnemyBars() {
  const pct=(enemyHp/currentEnemy.hp*100)+'%';
  document.getElementById('enemy-hp-bar').style.width=pct;
  document.getElementById('enemy-hp-text').textContent=`${Math.max(0,enemyHp)}/${currentEnemy.hp}`;
}

function battleAction(action) {
  if(!inBattle) return;
  battleTurn++;
  let msg='';

  if(action==='attack') {
    const playerDmg = Math.max(1, player.atk + Math.floor(Math.random()*4) - (currentEnemy.def - (enemyDisarmed>0?2:0)));
    enemyHp -= playerDmg;
    msg=`⚔️ Vous frappez pour ${playerDmg} dégâts !`;
    if(enemyDisarmed>0) enemyDisarmed--;

  } else if(action==='spell') {
    openBattleSpells();
    return;

  } else if(action==='item') {
    openBattleItems();
    return;

  } else if(action==='flee') {
    const fleeChance = player.agi>currentEnemy.atk ? 0.7 : 0.4;
    const hasBroom = player.inventory.some(i=>i.id==='broom');
    if(hasBroom||Math.random()<fleeChance) {
      endBattle(false);
      setNarrative("Vous fuyez le combat à toute vitesse dans les couloirs !");
      addMsg("Fuite réussie !", 'good');
      return;
    } else {
      msg="❌ Vous n'avez pas pu fuir !";
    }
  }

  if(enemyHp<=0) {
    endBattle(true);
    return;
  }

  // Contre-attaque ennemie
  let enemyDmgOut=0;
  if(shieldTurns>0) {
    shieldTurns--;
    msg+=`\n🛡️ Protego absorbe l'attaque !`;
  } else {
    enemyDmgOut = Math.max(0, currentEnemy.atk - player.def + Math.floor(Math.random()*4) - 1);
    player.hp = Math.max(0, player.hp-enemyDmgOut);
    msg+=`\n${currentEnemy.icon} ${currentEnemy.name} vous inflige ${enemyDmgOut} dégâts !`;
  }

  document.getElementById('battle-log').textContent=msg;
  updateEnemyBars();
  updateUI();

  if(player.hp<=0) {
    document.getElementById('encounter-overlay').style.display='none';
    inBattle=false;
    triggerDeath(`${currentEnemy.name} vous a vaincu...`);
  }
}

function castSpellInBattle(spellName) {
  const spell=SPELLS.find(s=>s.name===spellName);
  if(!spell||player.sp<spell.cost) {
    addMsg("Pas assez de magie !", 'bad');
    return;
  }
  player.sp-=spell.cost;
  let msg='';

  if(spell.effect==='heal') {
    player.hp=Math.min(player.hpMax,player.hp+spell.power);
    msg=`💚 ${spell.name} : +${spell.power} PV !`;
    addMsg(msg,'good');
  } else if(spell.effect==='disarm') {
    enemyDisarmed=2;
    msg=`✨ ${spell.name} : ennemi désarmé !`;
    addMsg(msg,'magic');
  } else if(spell.effect==='shield') {
    shieldTurns=2;
    msg=`🛡️ ${spell.name} : bouclier actif !`;
    addMsg(msg,'magic');
  } else if(spell.effect==='stun'||spell.effect==='burn'||spell.effect==='instant') {
    const dmg=spell.power+Math.floor(player.mag/2);
    enemyHp-=dmg;
    msg=`${spell.icon} ${spell.name} : ${dmg} dégâts magiques !`;
    addMsg(msg,'magic');
  } else if(spell.effect==='steal') {
    const gold=Math.floor(Math.random()*10+5);
    player.gold+=gold;
    msg=`🌀 ${spell.name} : +${gold} Gallions volés !`;
    addMsg(msg,'good');
  }

  updateUI();
  closeModal('spell-modal');

  if(enemyHp<=0) { endBattle(true); return; }

  // Contre-attaque après sort
  let enemyDmg=0;
  if(shieldTurns>0 && spell.effect==='shield') {
    // Pas de dégâts le tour du bouclier
  } else {
    enemyDmg=Math.max(0,currentEnemy.atk-player.def+Math.floor(Math.random()*3));
    player.hp=Math.max(0,player.hp-enemyDmg);
    msg+=`\n${currentEnemy.icon} contre-attaque pour ${enemyDmg} dégâts !`;
  }

  document.getElementById('battle-log').textContent=msg;
  updateEnemyBars();
  updateUI();

  if(player.hp<=0) {
    document.getElementById('encounter-overlay').style.display='none';
    inBattle=false;
    triggerDeath(`${currentEnemy.name} vous a vaincu...`);
  }
}

function endBattle(won) {
  document.getElementById('encounter-overlay').style.display='none';
  inBattle=false;
  if(won) {
    enemyMap[playerY][playerX]=null;
    const xp=currentEnemy.xp;
    const gold=currentEnemy.gold+Math.floor(Math.random()*5);
    player.xp+=xp;
    player.gold+=gold;
    setNarrative(`Vous avez vaincu ${currentEnemy.name} ! +${xp} XP, +${gold} Gallions.`);
    addMsg(`+${xp} XP`, 'good');
    addMsg(`+${gold} Gallions`, 'good');
    addLog(`✅ ${currentEnemy.name} vaincu`);
    checkLevelUp();
    renderMinimap();
  }
  updateUI();
}

function checkLevelUp() {
  if(player.xp>=player.xpNext) {
    player.level++;
    player.xp-=player.xpNext;
    player.xpNext=Math.floor(player.xpNext*1.6);
    player.hpMax+=10; player.hp=player.hpMax;
    player.spMax+=6; player.sp=player.spMax;
    player.atk+=2; player.def+=1; player.mag+=1;
    player.str+=1; player.int+=1; player.agi+=1;
    document.getElementById('levelup-text').textContent=`Vous passez au niveau ${player.level} !`;
    document.getElementById('levelup-modal').style.display='flex';
    addMsg(`Niveau ${player.level} !`, 'good');
    addLog(`⭐ Niveau ${player.level} atteint`);
    if(player.level===3&&!player.spells.includes('Incendio')) player.spells.push('Incendio');
    if(player.level===5&&!player.spells.includes('Accio')) player.spells.push('Accio');
    updateUI();
  }
}

function closeLevelup() {
  document.getElementById('levelup-modal').style.display='none';
}

// ============================================================
// MORT ET RÉSURRECTION
// ============================================================

function triggerDeath(msg) {
  document.getElementById('death-msg').textContent=msg;
  document.getElementById('death-screen').style.display='flex';
}

function resurrect() {
  player.hp=Math.floor(player.hpMax/2);
  player.sp=Math.floor(player.spMax/2);
  player.gold=Math.floor(player.gold*0.7);
  document.getElementById('death-screen').style.display='none';
  generateDungeon(currentFloor);
  updateLocationDisplay();
  setNarrative("Un Phénix vous ressuscite in extremis. Vous vous réveillez, meurtri mais vivant.");
  addMsg("Ressuscité !", 'magic');
  renderMinimap();
  drawDungeon();
  updateCompass();
  updateUI();
}
