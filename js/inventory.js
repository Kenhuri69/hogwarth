// ============================================================
// INVENTAIRE (partagé) ET SORTS (par personnage)
// ============================================================

// Capacité maximale du sac (constante centralisée).
const INVENTORY_MAX = 16;

// Helper centralisé pour ajouter un item au sac partagé. Accepte un
// item complet ou un id ; gère le cap, copie defensive et message UX.
// Retourne true si l'item a été ajouté, false sinon (sac plein ou id
// inconnu).
function tryAddItem(itemOrId, opts = {}) {
  const item = (typeof itemOrId === 'string')
    ? (typeof ITEMS !== 'undefined' && ITEMS.find(i => i.id === itemOrId))
    : itemOrId;
  if (!item) return false;
  if (player.inventory.length >= INVENTORY_MAX) {
    if (!opts.silent && typeof addMsg === 'function') {
      addMsg(`Sac plein, ${item.name || 'objet'} non récupéré.`, 'bad');
    }
    return false;
  }
  player.inventory.push({ ...item });
  return true;
}

// ── Calcul des stats réelles (base + équipement) ────────────
// Doit être appelé après chaque équipement et après chaque level-up.
// Itère dynamiquement sur tous les slots de c.equipped pour supporter
// les 11 slots étendus (head, hands, feet, cloak, amulet, ring1, ring2,
// belt, trinket) ainsi que d'éventuels slots legacy (armor, acc) issus
// d'anciennes saves non migrées.
//
// hpMax/spMax restent hors-scope V1 : `checkLevelUp()` les mute encore
// directement, on n'y touche pas ici.
function recalculateStats() {
  party.forEach(c => {
    // Lazy init des bases secondaires (str/int/agi/end) pour les saves
    // antérieures à l'extension : capture la valeur courante comme base.
    if (c._baseStr === undefined) c._baseStr = c.str;
    if (c._baseInt === undefined) c._baseInt = c.int;
    if (c._baseAgi === undefined) c._baseAgi = c.agi;
    if (c._baseEnd === undefined) c._baseEnd = c.end;

    // Repartir des stats de base (croissent au level-up via _base*)
    c.atk = c._baseAtk;
    c.def = c._baseDef;
    c.mag = c._baseMag;
    c.lck = c._baseLck;
    c.str = c._baseStr;
    c.int = c._baseInt;
    c.agi = c._baseAgi;
    c.end = c._baseEnd;

    if (!c.equipped) return;
    // Itérer sur tous les slots présents (extensible sans toucher au code)
    for (const slot of Object.keys(c.equipped)) {
      const item = c.equipped[slot];
      if (!item) continue;
      if (item.bonusAtk) c.atk += item.bonusAtk;
      if (item.bonusDef) c.def += item.bonusDef;
      if (item.bonusMag) c.mag += item.bonusMag;
      if (item.bonusLck) c.lck += item.bonusLck;
      if (item.bonusStr) c.str += item.bonusStr;
      if (item.bonusInt) c.int += item.bonusInt;
      if (item.bonusAgi) c.agi += item.bonusAgi;
      if (item.bonusEnd) c.end += item.bonusEnd;
    }
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
      // Bordure de rareté — voir .claude/plans/equipment-extended.md §2.6.
      // common (par défaut, gris-or) / rare (bleu) / epic (violet) / legendary (or).
      if (item.rarity) div.classList.add(`rarity-${item.rarity}`);
      // Étiquette de type — préfère `item.slot` (plus précis : head, ring,
      // trinket…) puis `item.type` en fallback. Le resolver tombe sur
      // accessory.png pour tous les nouveaux slots tant que les sprites
      // dédiés Phase 4 ne sont pas livrés.
      const slotKey = (isEquip && item.slot) ? item.slot : item.type;
      const typeIcon = (isEquip || isSpellbook)
        ? getEquipmentSlotIconHtml(slotKey, 'ui-icon-sm')
        : '';
      const typeLabel = (isEquip || isSpellbook)
        ? `<div style="font-size:9px;color:${isSpellbook ? '#8060c0' : '#b08040'};margin-top:1px">${typeIcon}</div>`
        : '';
      div.innerHTML = `<div class="item-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div><div class="item-name">${item.name}</div>${typeLabel}`;

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

// ── Résolution du slot cible d'un item ───────────────────────
// Priorité : champ explicite `item.slot`, sinon mapping legacy via type.
// Pour les anneaux (`slot === 'ring'`), choisit le premier slot vide
// entre `ring1` et `ring2`. Si les deux sont occupés, retourne `ring1`
// (l'appelant gérera la confirmation de remplacement).
function _resolveSlotForItem(item, c) {
  const explicit = item.slot;
  if (explicit === 'ring') {
    if (c && c.equipped && !c.equipped.ring1) return 'ring1';
    if (c && c.equipped && !c.equipped.ring2) return 'ring2';
    return 'ring1';
  }
  if (explicit) return explicit;
  // Mapping legacy pour items sans champ `slot` explicite
  if (item.type === 'wand')  return 'wand';
  if (item.type === 'armor') return 'body';
  return 'amulet'; // type === 'acc' par défaut → cou
}

// ── Menu de sélection du personnage pour équiper ─────────────
// Remplace temporairement la grille par un prompt de choix.
function showEquipMenu(item, idx) {
  const isRing = item.slot === 'ring';

  // Mode solo + non-anneau : équiper directement Harry
  if (partySize === 1 && !isRing) { equipItem(idx, 0); return; }

  const grid = document.getElementById('inv-grid');

  // Mode solo + anneau : choisir l'anneau cible (Harry uniquement)
  if (partySize === 1 && isRing) {
    const c = party[0];
    const ring1 = c.equipped && c.equipped.ring1;
    const ring2 = c.equipped && c.equipped.ring2;
    const r1Label = ring1 ? ` (rem. ${ring1.name})` : ' (vide)';
    const r2Label = ring2 ? ` (rem. ${ring2.name})` : ' (vide)';
    grid.innerHTML = `
      <div style="grid-column:1/-1;padding:14px;text-align:center">
        <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
          Équiper ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}
        </div>
        <div style="font-size:11px;color:#8a7050;margin-bottom:12px">${item.desc}</div>
        <div style="max-width:200px;margin:0 auto">
          <button class="cmd-btn" style="width:100%;margin-bottom:6px"
            onclick="equipItem(${idx},0,'ring1')">💍 Anneau gauche${r1Label}</button>
          <button class="cmd-btn" style="width:100%;margin-bottom:6px"
            onclick="equipItem(${idx},0,'ring2')">💍 Anneau droit${r2Label}</button>
          <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
            onclick="renderInventory(false)">← Annuler</button>
        </div>
      </div>
    `;
    return;
  }

  // Duo : un bouton par personnage. Pour les anneaux, deux boutons par
  // personnage (anneau gauche / anneau droit).
  const charButtons = party.slice(0, partySize).map((c, ci) => {
    if (isRing) {
      const ring1 = c.equipped && c.equipped.ring1;
      const ring2 = c.equipped && c.equipped.ring2;
      const r1Label = ring1 ? ` (rem. ${ring1.name})` : '';
      const r2Label = ring2 ? ` (rem. ${ring2.name})` : '';
      return `
        <div style="margin-bottom:8px;font-size:10px;color:var(--gold-dark)">${c.icon} ${c.name.split(' ')[0]}</div>
        <button class="cmd-btn" style="width:100%;margin-bottom:4px"
          onclick="equipItem(${idx},${ci},'ring1')">💍 gauche${r1Label}</button>
        <button class="cmd-btn" style="width:100%;margin-bottom:8px"
          onclick="equipItem(${idx},${ci},'ring2')">💍 droit${r2Label}</button>
      `;
    }
    const slot    = _resolveSlotForItem(item, c);
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
        Équiper ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}
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
// `targetSlot` est optionnel : si fourni (ex. 'ring1'/'ring2'), force le
// slot ; sinon résolu via `_resolveSlotForItem`.
function equipItem(inventoryIdx, charIdx, targetSlot) {
  const item = player.inventory[inventoryIdx];
  if (!item) return;
  const c    = party[charIdx];
  const slot = targetSlot || _resolveSlotForItem(item, c);

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

  // Mettre à jour les chaînes d'affichage legacy (utilisées dans le
  // panneau gauche `#eq-wand/#eq-armor/#eq-acc`).
  if (slot === 'wand')                     c.wand  = item.name;
  if (slot === 'body' || slot === 'armor') c.armor = item.name;
  if (slot === 'amulet' || slot === 'cloak' || slot === 'trinket'
      || slot === 'ring1' || slot === 'ring2' || slot === 'belt'
      || slot === 'head' || slot === 'hands' || slot === 'feet'
      || slot === 'acc') {
    c.acc = item.name;
  }

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
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
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
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
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
