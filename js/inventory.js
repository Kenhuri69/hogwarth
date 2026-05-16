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

    if (c.equipped) {
      // Itérer sur tous les slots présents (extensible sans toucher au code).
      // Bonus Forge : `upgradeLevel` ajoute +N au bonus principal de l'item
      // (la stat avec la valeur la plus haute parmi atk/def/mag/lck).
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
        // Forge des Ténèbres : +upgradeLevel sur la stat principale.
        const lvl = item.upgradeLevel | 0;
        if (lvl > 0) {
          // Détermine la stat principale (plus élevée parmi atk/def/mag/lck).
          const bonuses = [
            ['atk', item.bonusAtk | 0],
            ['def', item.bonusDef | 0],
            ['mag', item.bonusMag | 0],
            ['lck', item.bonusLck | 0],
          ];
          bonuses.sort((a, b) => b[1] - a[1]);
          if (bonuses[0][1] > 0) c[bonuses[0][0]] += lvl;
        }
      }
    }

    // Stats dérivées — deux canaux de crit (physique + sort) :
    //   critChance / spellCritChance  : LCK plafonne à 40 %, les bonus
    //     d'équipement/set s'ajoutent par-dessus (peuvent dépasser 40 %).
    //   critMultiplier / spellCritMultiplier : 1.5 + bonusCritDamage cumulés.
    let critBonus = 0, dodgeBonus = 0;
    let critDmgBonus = 0, spellCritBonus = 0, spellCritDmgBonus = 0;
    if (c.equipped) {
      for (const item of Object.values(c.equipped)) {
        if (!item) continue;
        if (item.bonusCritChance)      critBonus         += item.bonusCritChance;
        if (item.bonusDodgeChance)     dodgeBonus        += item.bonusDodgeChance;
        if (item.bonusCritDamage)      critDmgBonus      += item.bonusCritDamage;
        if (item.bonusSpellCritChance) spellCritBonus    += item.bonusSpellCritChance;
        if (item.bonusSpellCritDamage) spellCritDmgBonus += item.bonusSpellCritDamage;
      }
    }

    // Set bonus Ténèbres (endgame Tranche 2 — cf. ENDGAME_PLAN.md §7.8).
    // 2 items équipés → +10 crit, +5 dodge ; 3 items → +15 crit, +10 dodge.
    // Le bonus regenHp 3/3 est appliqué dans applyEquipmentRegen (battle.js).
    c._tenebresSetCount = 0;
    if (typeof TENEBRES_SET !== 'undefined' && c.equipped) {
      const equippedIds = new Set();
      for (const item of Object.values(c.equipped)) {
        if (item && item.id) equippedIds.add(item.id);
      }
      c._tenebresSetCount = TENEBRES_SET.filter(id => equippedIds.has(id)).length;
      if (c._tenebresSetCount >= 2) {
        critBonus += 10; dodgeBonus += 5;
        critDmgBonus += 0.15; spellCritDmgBonus += 0.15;
      }
      if (c._tenebresSetCount >= 3) {
        critBonus += 5; dodgeBonus += 5;
        critDmgBonus += 0.15; spellCritDmgBonus += 0.15;
      }
    }

    // Sets Maison 2.0 — 4 pièces par Maison (cf. .claude/plans/houses-2.0.md
    // §B). Bonus 2/3/4 pièces additifs : applique setBonus2 puis setBonus3
    // puis setBonus4 selon le compte équipé. Stocke le compte sur
    // c._<setKey>Count pour les tests et l'UI.
    if (typeof HOUSE_SETS !== 'undefined' && c.equipped) {
      const equippedIds = new Set();
      for (const item of Object.values(c.equipped)) {
        if (item && item.id) equippedIds.add(item.id);
      }
      for (const houseName of Object.keys(HOUSE_SETS)) {
        const set = HOUSE_SETS[houseName];
        const count = set.pieceIds.filter(id => equippedIds.has(id)).length;
        c['_' + set.setKey + 'Count'] = count;
        const bonuses = [];
        if (count >= 2 && set.setBonus2) bonuses.push(set.setBonus2);
        if (count >= 3 && set.setBonus3) bonuses.push(set.setBonus3);
        if (count >= 4 && set.setBonus4) bonuses.push(set.setBonus4);
        for (const b of bonuses) {
          if (b.bonusAtk) c.atk += b.bonusAtk;
          if (b.bonusDef) c.def += b.bonusDef;
          if (b.bonusMag) c.mag += b.bonusMag;
          if (b.bonusLck) c.lck += b.bonusLck;
          if (b.bonusStr) c.str += b.bonusStr;
          if (b.bonusInt) c.int += b.bonusInt;
          if (b.bonusAgi) c.agi += b.bonusAgi;
          if (b.bonusEnd) c.end += b.bonusEnd;
          if (b.bonusCritChance)      critBonus         += b.bonusCritChance;
          if (b.bonusDodgeChance)     dodgeBonus        += b.bonusDodgeChance;
          if (b.bonusCritDamage)      critDmgBonus      += b.bonusCritDamage;
          if (b.bonusSpellCritChance) spellCritBonus    += b.bonusSpellCritChance;
          if (b.bonusSpellCritDamage) spellCritDmgBonus += b.bonusSpellCritDamage;
        }
      }
    }

    // LCK plafonne à 40 % ; les bonus équipement/set s'ajoutent au-dessus
    // (plafond absolu 100 %). Deux canaux : physique et sort.
    const lckCrit = Math.min(40, 5 + c.lck * 0.5);
    c.critChance          = Math.max(5, Math.min(100, lckCrit + critBonus));
    c.spellCritChance     = Math.max(5, Math.min(100, lckCrit + spellCritBonus));
    c.dodgeChance         = Math.max(0, Math.min(35, 5 + c.agi * 0.4 + dodgeBonus));
    c.critMultiplier      = 1.5 + critDmgBonus;
    c.spellCritMultiplier = 1.5 + spellCritDmgBonus;
  });
}

// ── Ouvre l'inventaire hors combat ──────────────────────────
function openInventory() {
  renderInventory(false);
  document.getElementById('inventory-modal').style.display = 'flex';
}

// Tap-preview sur les cellules d'inventaire : sur un device pointer:fine
// (souris desktop) l'action s'exécute directement — la tooltip riche
// s'affiche au :hover via CSS. Sur un device hover:none (mobile/tactile),
// le premier tap affiche la tooltip pendant 1.5 s, le second tap exécute
// l'action. Évite les confirmations accidentelles sans bloquer le flow.
let _invTapPreview = null;
let _invTapTimer = null;
function _handleInvTap(slotEl, action) {
  const isPointerFine = typeof matchMedia === 'function'
    && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isPointerFine) { action(); return; }
  if (_invTapPreview === slotEl) {
    slotEl.classList.remove('tap-preview');
    clearTimeout(_invTapTimer);
    _invTapPreview = null;
    action();
    return;
  }
  document.querySelectorAll('.inv-slot.tap-preview').forEach(s => s.classList.remove('tap-preview'));
  slotEl.classList.add('tap-preview');
  _invTapPreview = slotEl;
  clearTimeout(_invTapTimer);
  _invTapTimer = setTimeout(() => {
    if (_invTapPreview === slotEl) {
      slotEl.classList.remove('tap-preview');
      _invTapPreview = null;
    }
  }, 1500);
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
        ? `<div class="inv-type-badge" style="font-size:9px;color:${isSpellbook ? '#8060c0' : '#b08040'};margin-top:1px">${typeIcon}</div>`
        : '';
      // Bordure de rareté inv-slot ↔ classe rarity-*
      if (item.rarity) div.classList.add(`rarity-${item.rarity}`);
      const ttHtml = (typeof _renderItemTooltip === 'function')
        ? _renderItemTooltip(item, null, battleMode && !isEquip ? 'cliquer pour utiliser' : (isEquip ? 'cliquer pour équiper' : (isSpellbook ? 'cliquer pour apprendre' : 'cliquer pour utiliser')))
        : '';
      div.title = item.name; // fallback natif si tooltip riche indispo
      div.innerHTML = `<div class="item-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div><div class="item-name">${item.name}</div>${typeLabel}${ttHtml}`;

      if (battleMode && isEquip) {
        // Équipements non utilisables en combat — grisés
        div.style.opacity = '0.45';
        div.style.cursor  = 'default';
        div.title         = 'Non utilisable en combat';
      } else {
        div.onclick = () => _handleInvTap(div, () => useItem(i, battleMode));
      }
    } else {
      div.innerHTML = '<div class="inv-empty-slot">—</div>';
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
  if (explicit) {
    // Warn dev si le slot demandé n'existe pas dans la structure
    // `equipped` (typo dans data.js, slot custom non câblé).
    if (c && c.equipped && !(explicit in c.equipped)) {
      console.warn('[equip] Slot inconnu "' + explicit + '" pour item ' + (item.id || item.name));
    }
    return explicit;
  }
  // Mapping legacy pour items sans champ `slot` explicite
  if (item.type === 'wand')  return 'wand';
  if (item.type === 'armor') return 'body';
  return 'amulet'; // type === 'acc' par défaut → cou
}

// ── Menu de sélection du personnage pour équiper ─────────────
// Remplace temporairement la grille par un prompt de choix.
// Tag « SET du Lion (1/4) » affiché dans le titre de showEquipMenu si
// l'item appartient à un set Maison. Cf. plan houses-2.0.md §B (Étape 5).
function _equipMenuSetBadge(item) {
  if (!item || !item.setKey || typeof HOUSE_SETS === 'undefined') return '';
  const set = Object.values(HOUSE_SETS).find(s => s.setKey === item.setKey);
  if (!set) return '';
  const piece = item.setPiece ? `${item.setPiece}/4` : '?';
  return `<span class="equip-menu-set-badge">${set.setLabel} (${piece})</span>`;
}

function showEquipMenu(item, idx) {
  const isRing = item.slot === 'ring';

  // Mode solo + non-anneau : équiper directement Harry
  if (partySize === 1 && !isRing) { equipItem(idx, 0); return; }

  const grid = document.getElementById('inv-grid');
  const setBadge = _equipMenuSetBadge(item);

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
          Équiper ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}${setBadge}
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
        Équiper ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}${setBadge}
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
  if (!c) return;
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

  // Capture du compteur de set AVANT recalc (pour détecter la transition
  // <4 → 4 et déclencher le feedback de complétion).
  const prevSetCount = (item.setKey && typeof c['_' + item.setKey + 'Count'] === 'number')
    ? c['_' + item.setKey + 'Count']
    : 0;

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

  // Feedback Set 4/4 — uniquement si l'item équipé porte `setKey` et
  // qu'on vient de basculer de <4 à 4 sur ce perso. Garde-fou
  // `chosenHouse` : on n'annonce que le set de la Maison du joueur,
  // pour éviter le spam si jamais un personnage équipe les 4 pièces
  // d'une Maison qui n'est pas la sienne (cas dev/triche).
  if (item.setKey && typeof HOUSE_SETS !== 'undefined' && typeof chosenHouse !== 'undefined' && chosenHouse) {
    const houseSet = HOUSE_SETS[chosenHouse];
    if (houseSet && houseSet.setKey === item.setKey) {
      const newCount = c['_' + item.setKey + 'Count'] | 0;
      if (prevSetCount < 4 && newCount >= 4) {
        if (typeof AudioSystem !== 'undefined' && AudioSystem.playSetComplete) {
          AudioSystem.playSetComplete();
        }
        addMsg(`✨ <b>${houseSet.setLabel} complet (4/4)</b> — bonus majeur activé !`, 'magic');
      }
    }
  }

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

  // Matériaux endgame (Forge / Bibliothèque) — non utilisables manuellement.
  // Consommés lors d'un upgrade Forge/Bibliothèque uniquement.
  if (item.type === 'material') {
    addMsg(`${item.name} : matériau d'upgrade — utilisable uniquement à la Forge ou à la Bibliothèque.`, '');
    return;
  }

  // Consommable : s'applique au personnage actif en combat, à Harry sinon.
  // La larme du Phénix Pure est passive (auto-revive au KO) — non
  // consommable manuellement.
  if (item.effect === 'auto_revive') {
    addMsg(`${item.name} : effet passif — déclenchera à la prochaine perte d'un membre du groupe.`, '');
    return;
  }

  const target = (battleMode && inBattle) ? party[currentBattleChar] : player;

  if (item.effect === 'heal')                  target.hp = Math.min(target.hpMax, target.hp + item.power);
  else if (item.effect === 'restore_sp')       target.sp = Math.min(target.spMax, target.sp + item.power);
  else if (item.effect === 'heal_full')        target.hp = target.hpMax;
  else if (item.effect === 'restore_sp_full')  target.sp = target.spMax;
  else if (item.effect === 'both') {
    target.hp = Math.min(target.hpMax, target.hp + item.power);
    target.sp = Math.min(target.spMax, target.sp + 10);
  }
  addMsg(`${target.name} utilise : ${item.name}`, 'good');
  player.inventory.splice(idx, 1);

  updateUI();
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
}

// ============================================================
// SORTS
// ============================================================

// Hors combat : liste les sorts du personnage sélectionné (onglets)
function openSpells(charIdx = 0) {
  // En mode solo, on ne montre que Harry (partySize=1).
  if (charIdx >= partySize) charIdx = 0;
  const c    = party[charIdx];
  const list = document.getElementById('spell-list');

  // Onglets Harry / Hermione (Hermione masquée en solo).
  const tabs = party.slice(0, partySize).map((p, i) =>
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
    // Sorts utilisables hors combat (teleport + heal pour V1). Les autres
    // affichent un tag "Combat uniquement" pour ne pas tromper le joueur.
    const oocCost   = spell.outOfCombatCost || null;
    const isOoc     = isOutOfCombatSpell(spell);
    // Cooldown OOC selon le type de sort.
    let cdRemaining = 0, cdUnit = '';
    if (spell.effect === 'teleport' && typeof portusOocCooldown === 'number') {
      cdRemaining = portusOocCooldown;
      cdUnit = `transition${cdRemaining > 1 ? 's' : ''} d'étage`;
    } else if (spell.effect === 'heal' && typeof healSpellCooldown === 'number') {
      cdRemaining = healSpellCooldown;
      cdUnit = `pas`;
    }
    const canCastOoc = isOoc && cdRemaining === 0 && c.sp >= (oocCost || spell.cost);
    const costLabel = oocCost
      ? `${oocCost} PM <span style="color:#6a5030;font-size:9px">(hors combat)</span>`
      : `${spell.cost} PM`;
    let hint;
    if (!isOoc) {
      hint = '<span style="font-size:9px;color:#6a5030">Combat uniquement</span>';
    } else if (cdRemaining > 0) {
      hint = `<span style="font-size:9px;color:#a04020">⏳ Se recharge — ${cdRemaining} ${cdUnit}</span>`;
    } else if (!canCastOoc) {
      hint = '<span style="font-size:9px;color:#a04020">PM insuffisants</span>';
    } else {
      hint = '<span style="font-size:9px;color:#6a8030">▶ cliquer pour lancer</span>';
    }
    div.innerHTML = `
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
        <div style="margin-top:3px">${hint}</div>
      </div>
      <div class="spell-cost">${costLabel}</div>`;
    if (canCastOoc) {
      div.style.cursor = 'pointer';
      div.onclick = () => castSpellOutOfCombat(spell.name, charIdx);
    } else if (isOoc) {
      div.style.opacity = '0.6';
    } else {
      div.style.opacity = '0.85';
    }
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display = 'flex';
}

// Sorts utilisables hors combat. Inscrits via SPELL_OOC_HANDLERS pour
// rester extensible. V1 : Portus (teleport) + sorts de soin (heal).
function isOutOfCombatSpell(spell) {
  if (!spell) return false;
  return spell.effect === 'teleport' || spell.effect === 'heal';
}

// Cooldown partagé entre tous les sorts de soin OOC (cf. .claude/plans/
// teleportation-spell.md §Itération 3).
const HEAL_OOC_CD_STEPS = 3;

// Retourne l'allié vivant avec le ratio hp/hpMax le plus bas, ou null si
// personne n'est blessé (tous au max ou tous KO). Le caster est inclus.
function _pickMostWoundedAlly() {
  let best = null, bestRatio = 1.0;
  for (const c of party.slice(0, partySize)) {
    if (!c || c.hp <= 0) continue;
    if (c.hp >= c.hpMax) continue;
    const ratio = c.hp / c.hpMax;
    if (best === null || ratio < bestRatio) {
      best = c; bestRatio = ratio;
    }
  }
  return best;
}

const SPELL_OOC_HANDLERS = {
  teleport: function (spell, charIdx) {
    if (typeof openOutOfCombatTeleport === 'function') {
      closeModal('spell-modal');
      openOutOfCombatTeleport(charIdx);
    }
  },
  // Soin OOC : cible auto = perso vivant le plus en bas de PV.
  // Coût identique au combat. Cooldown HEAL_OOC_CD_STEPS pas, partagé.
  heal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut canaliser le sort.', 'bad');
      return;
    }
    if (typeof healSpellCooldown === 'number' && healSpellCooldown > 0) {
      addMsg(`Sort de soin en récupération — encore ${healSpellCooldown} pas.`, 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    const target = _pickMostWoundedAlly();
    if (!target) {
      addMsg('Le groupe est déjà au mieux — pas besoin de soin.', '');
      return;
    }
    caster.sp -= spell.cost;
    const before = target.hp;
    target.hp = Math.min(target.hpMax, target.hp + spell.power);
    const healed = target.hp - before;
    if (typeof healSpellCooldown === 'number') healSpellCooldown = HEAL_OOC_CD_STEPS;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    addMsg(`💚 ${caster.name} → ${target.name} : ${spell.name} +${healed} PV.`, 'good');
    UX_safe.floatDmg('ally', healed, 'heal');
    closeModal('spell-modal');
    updateUI();
  }
};

function castSpellOutOfCombat(spellName, charIdx) {
  const spell = SPELLS.find(s => s.name === spellName);
  if (!spell) return;
  const handler = SPELL_OOC_HANDLERS[spell.effect];
  if (!handler) {
    addMsg(`${spellName} ne peut être lancé qu'en combat.`, 'bad');
    return;
  }
  handler(spell, charIdx);
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
    // Portus en combat : bloqué si déjà utilisé ce combat OU si cooldown actif.
    const fightCd = (spell.effect === 'teleport' && typeof portusFightCooldown === 'number')
                    ? portusFightCooldown : 0;
    const alreadyUsed = spell.effect === 'teleport'
                       && typeof _teleportUsedThisFight !== 'undefined'
                       && _teleportUsedThisFight;
    const cdBlocked = fightCd > 0 || alreadyUsed;
    const canCast  = c.sp >= spell.cost && !spell.locked && !cdBlocked;
    const div      = document.createElement('div');
    div.className  = 'spell-item';
    div.style.opacity = canCast ? '1' : '0.5';
    const cdHint = (spell.effect === 'teleport' && cdBlocked)
      ? `<div style="font-size:9px;color:#a04020;margin-top:2px">⏳ ${alreadyUsed ? 'déjà utilisé ce combat' : `recharge ${fightCd} combat${fightCd > 1 ? 's' : ''}`}</div>`
      : '';
    div.innerHTML  = `
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
        ${cdHint}
      </div>
      <div class="spell-cost">${spell.cost} PM</div>`;

    if (canCast) {
      div.onclick = () => {
        closeModal('spell-modal');
        // Portus gère son propre flow (overlay A/B) — court-circuite la
        // sélection de cible standard.
        if (spell.effect === 'teleport') {
          castSpellInBattle(spell.name, -1);
          return;
        }
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

// ============================================================
// INTERACTIONS DEPUIS LA FICHE PERSONNAGE (v2)
// ============================================================

// Déséquiper un slot directement depuis la fiche. L'item retombe
// dans le sac (refusé si plein). Re-render la fiche après.
function unequipFromSlot(charIdx, slot) {
  const c = party[charIdx];
  if (!c || !c.equipped) return;
  const item = c.equipped[slot];
  if (!item) return;
  if (player.inventory.length >= INVENTORY_MAX) {
    addMsg(`Sac plein — libérez une place avant de déséquiper.`, 'bad');
    return;
  }
  player.inventory.push({ ...item });
  c.equipped[slot] = null;
  // Reset chaînes legacy (HUD #eq-wand/#eq-armor/#eq-acc)
  if (slot === 'wand')                                                  c.wand  = '';
  if (slot === 'body')                                                  c.armor = '';
  if (['amulet','cloak','trinket','ring1','ring2','belt','head','hands','feet'].includes(slot)) c.acc = '';
  recalculateStats();
  updateUI();
  addMsg(`${c.name} déséquipe : ${item.name}`, '');
  if (typeof openCharacter === 'function') openCharacter(charIdx);
}

// Utiliser/équiper un item du sac directement depuis la fiche, sur le
// perso affiché — sans passer par le prompt party de showEquipMenu.
// - consommable : applique l'effet sur party[charIdx]
// - spellbook   : enseigne à tout le groupe
// - équipement  : equipItem(idx, charIdx) (anneau routé ring1→ring2)
function useItemFromChar(inventoryIdx, charIdx) {
  const item = player.inventory[inventoryIdx];
  if (!item) return;
  const target = party[charIdx];
  if (!target) return;

  if (item.type === 'consumable') {
    if (item.effect === 'heal')            target.hp = Math.min(target.hpMax, target.hp + item.power);
    else if (item.effect === 'restore_sp') target.sp = Math.min(target.spMax, target.sp + item.power);
    else if (item.effect === 'both') {
      target.hp = Math.min(target.hpMax, target.hp + item.power);
      target.sp = Math.min(target.spMax, target.sp + 10);
    }
    addMsg(`${target.name} utilise : ${item.name}`, 'good');
    player.inventory.splice(inventoryIdx, 1);
    updateUI();
    openCharacter(charIdx);
    return;
  }

  if (item.type === 'spellbook') {
    const learned = _teachSpellToParty(item.spell);
    if (learned) {
      AudioSystem.playLevelUp();
      AudioSystem.speakSpell(item.spell);
      addMsg(`✨ Sort appris : ${item.spell} !`, 'magic');
      player.inventory.splice(inventoryIdx, 1);
    } else {
      addMsg(`Le sort ${item.spell} est déjà connu par tout le groupe.`, '');
    }
    updateUI();
    openCharacter(charIdx);
    return;
  }

  // Équipement : équipe sur le charIdx en cours. Pour les anneaux, route
  // automatiquement vers ring1 puis ring2 si l'un des deux est libre.
  let targetSlot;
  if (item.slot === 'ring') {
    if (!target.equipped.ring1)       targetSlot = 'ring1';
    else if (!target.equipped.ring2)  targetSlot = 'ring2';
    else                              targetSlot = 'ring1'; // sinon, remplace ring1
  }
  equipItem(inventoryIdx, charIdx, targetSlot);
  // equipItem ferme inventory-modal (sans effet ici) et déjà appelle updateUI.
  openCharacter(charIdx);
}
