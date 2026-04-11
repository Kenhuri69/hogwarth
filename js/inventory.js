// ============================================================
// INVENTAIRE (partagé) ET SORTS (par personnage)
// ============================================================

// ── Calcul des stats réelles (base + équipement) ────────────
// Doit être appelé après chaque équipement et après chaque level-up.
function recalculateStats() {
  party.forEach(c => {
    // Repartir des stats de base (croissent au level-up via _base*)
    c.atk = c._baseAtk;
    c.def = c._baseDef;
    c.mag = c._baseMag;
    c.lck = c._baseLck;
    // Ajouter les bonus des objets équipés
    ['wand', 'armor', 'acc'].forEach(slot => {
      const item = c.equipped && c.equipped[slot];
      if (!item) return;
      if (item.bonusAtk) c.atk += item.bonusAtk;
      if (item.bonusDef) c.def += item.bonusDef;
      if (item.bonusMag) c.mag += item.bonusMag;
      if (item.bonusLck) c.lck += item.bonusLck;
    });
  });
}

// ── Ouvre l'inventaire hors combat ──────────────────────────
function openInventory() {
  renderInventory(false);
  document.getElementById('inventory-modal').style.display = 'flex';
}

// ── Rendu de la grille d'inventaire ─────────────────────────
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
      const isEquip    = ['wand','armor','acc'].includes(item.type);
      const isSpellbook = item.type === 'spellbook';
      // Étiquette de type
      const typeIcon = isEquip
        ? (item.type === 'wand' ? '🪄' : item.type === 'armor' ? '🧥' : '💎')
        : isSpellbook ? '📖' : '';
      const typeLabel = (isEquip || isSpellbook)
        ? `<div style="font-size:9px;color:${isSpellbook ? '#8060c0' : '#b08040'};margin-top:1px">${typeIcon}</div>`
        : '';
      div.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div>${typeLabel}`;

      if (battleMode && isEquip) {
        // Équipements non utilisables en combat — grisés
        div.style.opacity = '0.45';
        div.style.cursor  = 'default';
        div.title         = 'Non utilisable en combat';
      } else {
        div.onclick = () => useItem(i, battleMode);
      }
    } else {
      div.innerHTML = '<div style="font-size:10px;color:#2a1a08">—</div>';
    }
    grid.appendChild(div);
  }
}

// ── Menu de sélection du personnage pour équiper ─────────────
// Remplace temporairement la grille par un prompt de choix.
function showEquipMenu(item, idx) {
  // Mode solo : équiper directement Harry
  if (partySize === 1) { equipItem(idx, 0); return; }

  const grid = document.getElementById('inv-grid');

  // Trouver si chaque personnage peut utiliser ce type d'objet
  // (toutes les baguettes/armures/accessoires peuvent être équipés par les deux)
  const charButtons = party.slice(0, partySize).map((c, ci) => {
    const slot    = item.type === 'wand' ? 'wand' : item.type === 'armor' ? 'armor' : 'acc';
    const current = c.equipped && c.equipped[slot];
    const curLabel = current ? ` (rem. ${current.name})` : '';
    return `<button class="cmd-btn" style="width:100%;margin-bottom:6px"
              onclick="equipItem(${idx},${ci})">
              ${c.icon} ${c.name.split(' ')[0]}${curLabel}
            </button>`;
  }).join('');

  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        Équiper ${item.icon} ${item.name}
      </div>
      <div style="font-size:11px;color:#8a7050;margin-bottom:12px">${item.desc}</div>
      <div style="max-width:200px;margin:0 auto">
        ${charButtons}
        <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
          onclick="renderInventory(false)">← Annuler</button>
      </div>
    </div>
  `;
}

// ── Équiper un objet sur un personnage ───────────────────────
function equipItem(inventoryIdx, charIdx) {
  const item = player.inventory[inventoryIdx];
  if (!item) return;
  const c    = party[charIdx];
  const slot = item.type === 'wand' ? 'wand' : item.type === 'armor' ? 'armor' : 'acc';

  // Déséquiper l'ancien objet → retour en inventaire si place dispo
  const old = c.equipped && c.equipped[slot];
  if (old && player.inventory.length >= 16) {
    addMsg(`Inventaire plein — libérez une place avant d'équiper ${item.name}.`, 'bad');
    return;
  }
  if (old) {
    player.inventory.push({ ...old });
    addMsg(`${c.name} déséquipe : ${old.name}`, '');
  }

  // Équiper le nouvel objet
  c.equipped[slot] = { ...item };

  // Mettre à jour les chaînes d'affichage legacy (utilisées dans le panneau gauche)
  if (slot === 'wand')  c.wand  = item.name;
  if (slot === 'armor') c.armor = item.name;
  if (slot === 'acc')   c.acc   = item.name;

  // Retirer de l'inventaire
  player.inventory.splice(inventoryIdx, 1);

  // Recalculer les stats effectives
  recalculateStats();

  // Si l'équipement enseigne un sort, l'apprendre à tout le groupe
  if (item.grantsSpell) {
    const newSpell = _teachSpellToParty(item.grantsSpell);
    if (newSpell) {
      AudioSystem.playLevelUp();
      addMsg(`✨ Sort débloqué : ${item.grantsSpell} !`, 'magic');
    }
  }

  updateUI();
  addMsg(`${c.name} équipe : ${item.name}`, 'good');
  closeModal('inventory-modal');
}

// ── Apprendre un sort depuis un livre ou un équipement ───────
function _teachSpellToParty(spellName) {
  const spellDef = SPELLS.find(s => s.name === spellName);
  // Ne pas enseigner un sort encore verrouillé (ex : Avada... avant niv. 9)
  if (!spellDef || spellDef.locked) return false;
  let learned = false;
  party.slice(0, partySize).forEach(c => {
    if (!c.spells.includes(spellName)) {
      c.spells.push(spellName);
      learned = true;
    }
  });
  return learned;
}

// ── Utiliser / équiper un objet ──────────────────────────────
function useItem(idx, battleMode) {
  const item = player.inventory[idx];
  if (!item) return;

  // Livre de sorts → apprentissage immédiat (hors combat seulement)
  if (item.type === 'spellbook') {
    if (battleMode) return; // non utilisable en combat
    const spellDef = SPELLS.find(s => s.name === item.spell);
    if (!spellDef) { addMsg(`Sort inconnu : ${item.spell}`, 'bad'); return; }

    const learned = _teachSpellToParty(item.spell);
    if (learned) {
      AudioSystem.playLevelUp();
      AudioSystem.speakSpell(item.spell);
      addMsg(`✨ Sort appris : ${item.spell} !`, 'magic');
      player.inventory.splice(idx, 1);
    } else {
      addMsg(`Le sort ${item.spell} est déjà connu par tout le groupe.`, '');
    }
    updateUI();
    closeModal('inventory-modal');
    return;
  }

  // Équipement → menu de sélection (hors combat seulement)
  if (item.type !== 'consumable') {
    if (battleMode) return; // ne devrait pas être cliquable en combat
    showEquipMenu(item, idx);
    return;
  }

  // Consommable : s'applique au personnage actif en combat, à Harry sinon
  const target = (battleMode && inBattle) ? party[currentBattleChar] : player;
  let used = false;

  if (item.effect === 'heal')            target.hp = Math.min(target.hpMax, target.hp + item.power);
  else if (item.effect === 'restore_sp') target.sp = Math.min(target.spMax, target.sp + item.power);
  else if (item.effect === 'both') {
    target.hp = Math.min(target.hpMax, target.hp + item.power);
    target.sp = Math.min(target.spMax, target.sp + 10);
  }
  addMsg(`${target.name} utilise : ${item.name}`, 'good');
  player.inventory.splice(idx, 1);
  used = true;

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
