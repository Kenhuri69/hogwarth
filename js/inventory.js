// ============================================================
// INVENTAIRE (partagé) ET SORTS (par personnage)
// ============================================================

function openInventory() {
  renderInventory(false);
  document.getElementById('inventory-modal').style.display = 'flex';
}

function renderInventory(battleMode) {
  const grid = document.getElementById('inv-grid');
  grid.innerHTML = '';
  const slots = 16;
  for (let i = 0; i < slots; i++) {
    const div  = document.createElement('div');
    div.className = 'inv-slot';
    const item = player.inventory[i]; // inventaire partagé sur Harry
    if (item) {
      div.classList.add('has-item');
      div.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div>`;
      div.onclick = () => useItem(i, battleMode);
    } else {
      div.innerHTML = '<div style="font-size:10px;color:#2a1a08">—</div>';
    }
    grid.appendChild(div);
  }
}

function useItem(idx, battleMode) {
  const item = player.inventory[idx];
  if (!item) return;

  // En combat, l'objet s'applique au personnage actif ; hors combat à Harry
  const target = (battleMode && inBattle) ? party[currentBattleChar] : player;
  let used = false;

  if (item.type === 'consumable') {
    if (item.effect === 'heal')       target.hp = Math.min(target.hpMax, target.hp + item.power);
    else if (item.effect === 'restore_sp') target.sp = Math.min(target.spMax, target.sp + item.power);
    else if (item.effect === 'both') {
      target.hp = Math.min(target.hpMax, target.hp + item.power);
      target.sp = Math.min(target.spMax, target.sp + 10);
    }
    addMsg(`${target.name} utilise : ${item.name}`, 'good');
    player.inventory.splice(idx, 1);
    used = true;

  } else if (item.type === 'wand') {
    // L'équipement va toujours à Harry
    player.atk  = player.atk + item.power - (player.atk - 5);
    player.wand = item.name;
    player.inventory.splice(idx, 1);
    addMsg(`Harry équipe : ${item.name}`, 'good');
    used = true;

  } else if (item.type === 'armor') {
    player.def   = player.def + item.power - (player.def - 2);
    player.armor = item.name;
    player.inventory.splice(idx, 1);
    addMsg(`Harry équipe : ${item.name}`, 'good');
    used = true;

  } else if (item.type === 'acc') {
    player.acc = item.name;
    if (item.id === 'amulette') player.mag += item.power;
    player.inventory.splice(idx, 1);
    addMsg(`Harry équipe : ${item.name}`, 'good');
    used = true;
  }

  updateUI();

  if (used) {
    closeModal('inventory-modal');
    if (battleMode && inBattle) {
      // Les ennemis contre-attaquent après utilisation d'objet
      let log = `${target.name} utilise ${item.name}.`;
      livingEnemies().forEach(e => {
        const dmg = Math.max(0, e.atk - target.def + Math.floor(Math.random() * 3));
        target.hp  = Math.max(0, target.hp - dmg);
        log += ` ${e.icon}-${dmg} PV.`;
      });
      setBattleLog(log);
      renderEnemyGroup();
      updateUI();
      if (allPartyKO()) { inBattle = false; triggerDeath('Le groupe a été vaincu...'); }
      else advanceBattleChar();
    }
  } else {
    renderInventory(battleMode);
  }
}

// ============================================================
// SORTS
// ============================================================

// Hors combat : liste les sorts du personnage sélectionné (onglets)
function openSpells(charIdx = 0) {
  const c    = party[charIdx];
  const list = document.getElementById('spell-list');

  // Onglets Harry / Hermione
  const tabs = party.map((p, i) =>
    `<div onclick="openSpells(${i})" style="cursor:pointer;padding:4px 8px;border-radius:2px;font-family:'Cinzel',serif;font-size:10px;letter-spacing:1px;
     background:${i === charIdx ? '#2a1a08' : '#0a0705'};border:1px solid ${i === charIdx ? 'var(--gold-dark)' : '#2a1a08'};color:${i === charIdx ? 'var(--gold-light)' : '#6a5030'}">
      ${p.icon} ${p.name.split(' ')[0]}
    </div>`
  ).join('');

  list.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:10px">${tabs}</div>`;

  for (const sName of c.spells) {
    const spell = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    const div = document.createElement('div');
    div.className = 'spell-item';
    div.innerHTML = `
      <div class="spell-icon">${spell.icon}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
      </div>
      <div class="spell-cost">${spell.cost} PM</div>`;
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display = 'flex';
}

// En combat : liste les sorts du personnage actif avec possibilité de cibler
function openBattleSpells() {
  const c    = party[currentBattleChar];
  const list = document.getElementById('spell-list');
  list.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);text-align:center;margin-bottom:8px;letter-spacing:2px">
      ${c.icon} SORTS DE ${c.name.toUpperCase().split(' ')[0]}
    </div>`;

  for (const sName of c.spells) {
    const spell    = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    const canCast  = c.sp >= spell.cost && !spell.locked;
    const div      = document.createElement('div');
    div.className  = 'spell-item';
    div.style.opacity = canCast ? '1' : '0.5';
    div.innerHTML  = `
      <div class="spell-icon">${spell.icon}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
      </div>
      <div class="spell-cost">${spell.cost} PM</div>`;

    if (canCast) {
      div.onclick = () => {
        closeModal('spell-modal');
        const needsTarget = ['stun','burn','instant','disarm'].includes(spell.effect);
        if (needsTarget && livingEnemies().length > 1) {
          pendingSpell = spell.name;
          showTargetSelection('spell_dmg');
        } else {
          castSpellInBattle(spell.name, getFirstLivingEnemy());
        }
      };
    }
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display = 'flex';
}

function openBattleItems() {
  const consumables = player.inventory.filter(i => i.type === 'consumable');
  if (consumables.length === 0) { addMsg("Aucun objet utilisable !", ''); return; }
  renderInventory(true);
  document.getElementById('inventory-modal').style.display = 'flex';
}
