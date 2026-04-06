// ============================================================
// INVENTAIRE ET SORTS
// ============================================================

function openInventory() {
  renderInventory(false);
  document.getElementById('inventory-modal').style.display='flex';
}

function renderInventory(battleMode) {
  const grid=document.getElementById('inv-grid');
  grid.innerHTML='';
  const slots=16;
  for(let i=0;i<slots;i++) {
    const div=document.createElement('div');
    div.className='inv-slot';
    const item=player.inventory[i];
    if(item) {
      div.classList.add('has-item');
      div.innerHTML=`<div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div>`;
      div.onclick=()=>useItem(i, battleMode);
    } else {
      div.innerHTML='<div style="font-size:10px;color:#2a1a08">—</div>';
    }
    grid.appendChild(div);
  }
}

function useItem(idx, battleMode) {
  const item=player.inventory[idx];
  if(!item) return;
  let used=false;
  if(item.type==='consumable') {
    if(item.effect==='heal') player.hp=Math.min(player.hpMax,player.hp+item.power);
    else if(item.effect==='restore_sp') player.sp=Math.min(player.spMax,player.sp+item.power);
    else if(item.effect==='both') {
      player.hp=Math.min(player.hpMax,player.hp+item.power);
      player.sp=Math.min(player.spMax,player.sp+10);
    }
    addMsg(`Utilisé : ${item.name}`, 'good');
    player.inventory.splice(idx,1);
    used=true;
  } else if(item.type==='wand') {
    player.atk=player.atk+item.power-(player.atk-5);
    player.wand=item.name;
    player.inventory.splice(idx,1);
    addMsg(`Équipé : ${item.name}`, 'good');
    used=true;
  } else if(item.type==='armor') {
    player.def=player.def+item.power-(player.def-2);
    player.armor=item.name;
    player.inventory.splice(idx,1);
    addMsg(`Équipé : ${item.name}`, 'good');
    used=true;
  } else if(item.type==='acc') {
    player.acc=item.name;
    if(item.id==='amulette') player.mag+=item.power;
    player.inventory.splice(idx,1);
    addMsg(`Équipé : ${item.name}`, 'good');
    used=true;
  }
  updateUI();
  if(used) {
    closeModal('inventory-modal');
    if(battleMode && inBattle) {
      const enemyDmg=Math.max(0,currentEnemy.atk-player.def+Math.floor(Math.random()*3));
      player.hp=Math.max(0,player.hp-enemyDmg);
      document.getElementById('battle-log').textContent=`Objet utilisé.\n${currentEnemy.icon} attaque pour ${enemyDmg} dégâts !`;
      updateEnemyBars();
      updateUI();
      if(player.hp<=0) { inBattle=false; triggerDeath(`${currentEnemy.name} vous a vaincu...`); }
    }
  } else {
    renderInventory(battleMode);
  }
}

// ============================================================
// SORTS (HORS COMBAT)
// ============================================================

function openSpells() {
  const list=document.getElementById('spell-list');
  list.innerHTML='';
  for(const sName of player.spells) {
    const spell=SPELLS.find(s=>s.name===sName);
    if(!spell) continue;
    const div=document.createElement('div');
    div.className='spell-item';
    div.innerHTML=`<div class="spell-icon">${spell.icon}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
      </div>
      <div class="spell-cost">${spell.cost} PM</div>`;
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display='flex';
}

// ============================================================
// SORTS ET OBJETS EN COMBAT
// ============================================================

function openBattleSpells() {
  const list=document.getElementById('spell-list');
  list.innerHTML='';
  for(const sName of player.spells) {
    const spell=SPELLS.find(s=>s.name===sName);
    if(!spell) continue;
    const div=document.createElement('div');
    div.className='spell-item';
    const canCast=player.sp>=spell.cost&&!spell.locked;
    div.style.opacity=canCast?'1':'0.5';
    div.innerHTML=`<div class="spell-icon">${spell.icon}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
      </div>
      <div class="spell-cost">${spell.cost} PM</div>`;
    if(canCast) div.onclick=()=>castSpellInBattle(spell.name);
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display='flex';
}

function openBattleItems() {
  const consumables=player.inventory.filter(i=>i.type==='consumable');
  if(consumables.length===0) { addMsg("Aucun objet utilisable !", ''); return; }
  renderInventory(true);
  document.getElementById('inventory-modal').style.display='flex';
}
