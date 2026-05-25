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
  // Les herbes ne vont pas dans le sac 16 slots : elles sont routées vers
  // la besace d'herboriste (player.herbs), non plafonnée.
  if (item.type === 'herb' && typeof addHerb === 'function') {
    addHerb(item.id, 1);
    if (!opts.silent && typeof addMsg === 'function') {
      addMsg(`${item.name} ajoutée à ta besace.`, 'good');
    }
    return true;
  }
  if (player.inventory.length >= INVENTORY_MAX) {
    if (!opts.silent && typeof addMsg === 'function') {
      addMsg(`Sac plein, ${item.name || 'objet'} non récupéré.`, 'bad');
    }
    return false;
  }
  player.inventory.push({ ...item });
  return true;
}

// Compte les exemplaires d'un matériau (par id) dans le sac partagé.
function _countMaterial(itemId) {
  if (typeof player === 'undefined' || !player.inventory) return 0;
  return player.inventory.filter(it => it && it.id === itemId).length;
}

// Retire jusqu'à `n` exemplaires d'un matériau du sac partagé.
// Retourne le nombre effectivement retiré.
function _consumeMaterial(itemId, n) {
  let removed = 0;
  for (let i = player.inventory.length - 1; i >= 0 && removed < n; i--) {
    if (player.inventory[i] && player.inventory[i].id === itemId) {
      player.inventory.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

// ── Calcul des stats réelles (base + équipement) ────────────
// Doit être appelé après chaque équipement et après chaque level-up.
// Itère dynamiquement sur tous les slots de c.equipped pour supporter
// les 11 slots étendus (head, hands, feet, cloak, amulet, ring1, ring2,
// belt, trinket) ainsi que d'éventuels slots legacy (armor, acc) issus
// d'anciennes saves non migrées.
//
// hpMax/spMax sont recalculés ici : `_baseHpMax`/`_baseSpMax` (croissent au
// level-up et à l'allocation END) + Σ bonusHpMax/SpMax de l'équipement.
function recalculateStats() {
  party.forEach(c => {
    // Lazy init des bases secondaires (str/int/agi/end) pour les saves
    // antérieures à l'extension : capture la valeur courante comme base.
    if (c._baseStr === undefined) c._baseStr = c.str;
    if (c._baseInt === undefined) c._baseInt = c.int;
    if (c._baseAgi === undefined) c._baseAgi = c.agi;
    if (c._baseEnd === undefined) c._baseEnd = c.end;
    // Lazy init des PV/PM max de base (Vague B — bonusHpMax/SpMax). Capture
    // la valeur courante : aucun item legacy ne porte ces bonus, donc
    // hpMax/spMax == base au moment de la migration d'une save antérieure.
    if (c._baseHpMax === undefined) c._baseHpMax = c.hpMax;
    if (c._baseSpMax === undefined) c._baseSpMax = c.spMax;

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
    let hpMaxBonus = 0, spMaxBonus = 0;
    let counterBonus = 0;
    if (c.equipped) {
      for (const item of Object.values(c.equipped)) {
        if (!item) continue;
        if (item.bonusCritChance)      critBonus         += item.bonusCritChance;
        if (item.bonusDodgeChance)     dodgeBonus        += item.bonusDodgeChance;
        if (item.bonusCritDamage)      critDmgBonus      += item.bonusCritDamage;
        if (item.bonusSpellCritChance) spellCritBonus    += item.bonusSpellCritChance;
        if (item.bonusSpellCritDamage) spellCritDmgBonus += item.bonusSpellCritDamage;
        if (item.bonusHpMax)           hpMaxBonus        += item.bonusHpMax;
        if (item.bonusSpMax)           spMaxBonus        += item.bonusSpMax;
        if (item.bonusCounterChance)   counterBonus      += item.bonusCounterChance;
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
          if (b.bonusCounterChance)   counterBonus      += b.bonusCounterChance;
        }
      }
    }

    // Deux canaux de crit. Crit physique : base LCK (plafonne à 40 %).
    // Crit de sort : base AGI (plafonne à 35 %) — rôle offensif de l'AGI.
    // Les bonus équipement/set s'ajoutent PAR-DESSUS (plafond absolu 100 %).
    const lckCrit = Math.min(40, 5 + c.lck * 0.5);
    const agiCrit = Math.min(35, 5 + c.agi * 0.4);
    c.critChance          = Math.max(5, Math.min(100, lckCrit + critBonus));
    c.spellCritChance     = Math.max(5, Math.min(100, agiCrit + spellCritBonus));
    c.dodgeChance         = Math.max(0, Math.min(35, 5 + c.agi * 0.4 + dodgeBonus));
    // Multiplicateurs de crit : 1.5 + Σ bonusCritDamage, capés à 2.5 pour
    // éviter les one-shots de boss (cf. equipment-bonuses-v2.md Vague C).
    c.critMultiplier      = Math.min(2.5, 1.5 + critDmgBonus);
    c.spellCritMultiplier = Math.min(2.5, 1.5 + spellCritDmgBonus);

    // Apothéose Gryffondor (palier 18 — Cœur du Lion) : +10 % de crit
    // physique ET de sort, +15 % de dégâts critiques (physique + sort).
    // Appliqué PAR-DESSUS les plafonds LCK/AGI (40/35) — le taux peut
    // donc dépasser 40 % (plafond absolu 100 %), le multiplicateur 2.5.
    // Le cumul « Élan » est un effet de combat à part (battle.js).
    if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Gryffondor') {
      c.critChance          = Math.min(100, c.critChance + 10);
      c.spellCritChance     = Math.min(100, c.spellCritChance + 10);
      c.critMultiplier      = Math.min(2.5, c.critMultiplier + 0.15);
      c.spellCritMultiplier = Math.min(2.5, c.spellCritMultiplier + 0.15);
    }

    // PV/PM max = base (croît au level-up / allocation END) + bonus
    // d'équipement. Le bonus n'affecte PAS hp/sp courants ; au
    // déséquipement, on clamp hp/sp si le max a baissé.
    c.hpMax = c._baseHpMax + hpMaxBonus;
    c.spMax = c._baseSpMax + spMaxBonus;
    if (c.hp > c.hpMax) c.hp = c.hpMax;
    if (c.sp > c.spMax) c.sp = c.spMax;
    // Garde counter-attack : contribution d'équipement à la riposte. La
    // base de 30 % et le plafond de 40 % sont appliqués dans _tryGuardCounter.
    c.counterChance       = counterBonus;
  });
}

// ── Ouvre l'inventaire hors combat ──────────────────────────
// Onglet actif de la modale d'inventaire : 'sac' (objets) ou 'besace'
// (herbes d'herboriste — consultation seule).
let _invTab = 'sac';

// Affiche le pane correspondant à l'onglet et synchronise l'état actif
// des boutons. `tabsVisible` masque la barre d'onglets (combat).
function _applyInvTab(tab, tabsVisible) {
  _invTab = tab;
  const tabs   = document.getElementById('inv-tabs');
  const paneS  = document.getElementById('inv-pane-sac');
  const paneB  = document.getElementById('inv-pane-besace');
  const paneG  = document.getElementById('inv-pane-grimoire');
  if (tabs) tabs.style.display = tabsVisible ? 'flex' : 'none';
  if (paneS) paneS.style.display = (tab === 'sac')      ? '' : 'none';
  if (paneB) paneB.style.display = (tab === 'besace')   ? '' : 'none';
  if (paneG) paneG.style.display = (tab === 'grimoire') ? '' : 'none';
  const btnS = document.getElementById('inv-tab-sac');
  const btnB = document.getElementById('inv-tab-besace');
  const btnG = document.getElementById('inv-tab-grimoire');
  if (btnS) btnS.classList.toggle('active', tab === 'sac');
  if (btnB) btnB.classList.toggle('active', tab === 'besace');
  if (btnG) btnG.classList.toggle('active', tab === 'grimoire');
}

function switchInvTab(tab) {
  if (tab === 'besace')   renderBesace();
  if (tab === 'grimoire') renderGrimoirePouch();
  _applyInvTab(tab, true);
}

// La besace de pages n'apparaît que lorsque l'Acte II de Manon est en
// jeu : quête de collecte active ou au moins une page déjà récoltée.
function _grimoirePouchRelevant() {
  if (Array.isArray(player.grimoirePages) && player.grimoirePages.length) return true;
  return typeof activeQuests !== 'undefined'
    && activeQuests.some(q => q.id === 'manon_grimoire');
}

// Rendu de la besace de pages du grimoire (player.grimoirePages) —
// consultation seule, calquée sur renderBesace.
function renderGrimoirePouch() {
  const pane = document.getElementById('inv-pane-grimoire');
  if (!pane) return;
  const owned = Array.isArray(player.grimoirePages) ? player.grimoirePages : [];
  const all   = (typeof GRIMOIRE_PAGES !== 'undefined') ? GRIMOIRE_PAGES : [];
  const pages = all.filter(p => owned.includes(p.id));
  let html = '';
  if (pages.length) {
    html += '<div class="brew-tiles">';
    for (const p of pages) {
      html += `<div class="brew-tile" title="${p.lore}">`
        + `<div class="brew-tile-icon">${p.icon}</div>`
        + `<div class="brew-tile-name">${p.name}</div>`
        + `<span class="brew-tile-qty">étage ${p.floor}</span></div>`;
    }
    html += '</div>';
  } else {
    html += `<div class="brew-empty">Aucune page récoltée. Lance Revelio dans le donjon pour dévoiler les pages dissimulées par Sandrine.</div>`;
  }
  html += `<div style="margin-top:12px; font-size:11px; color:#6a5030; text-align:center;">Pages du grimoire de givre : ${pages.length} / ${all.length}. Rapporte-les à Manon (étage 3).</div>`;
  pane.innerHTML = html;
}

// Rendu de la besace d'herboriste (player.herbs) — purement informatif.
// La concoction se fait au chaudron de Slughorn (cf. potions.js).
function renderBesace() {
  const pane = document.getElementById('inv-pane-besace');
  if (!pane) return;
  const herbs = player.herbs || {};
  const ids = Object.keys(herbs).filter(id => herbs[id] > 0);
  // Ordre stable : suit l'ordre de ITEMS.
  ids.sort((a, b) => {
    const ia = (typeof ITEMS !== 'undefined') ? ITEMS.findIndex(i => i.id === a) : 0;
    const ib = (typeof ITEMS !== 'undefined') ? ITEMS.findIndex(i => i.id === b) : 0;
    return ia - ib;
  });
  let html = '';
  if (ids.length) {
    html += '<div class="brew-tiles">';
    for (const id of ids) {
      const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
      const name = it ? it.name : id;
      const icon = (typeof getItemIconHtml === 'function' && it)
        ? getItemIconHtml(it, 'ui-icon-xl')
        : (it && it.icon ? it.icon : '🌿');
      html += `<div class="brew-tile" title="${name}">`
        + `<div class="brew-tile-icon">${icon}</div>`
        + `<div class="brew-tile-name">${name}</div>`
        + `<span class="brew-tile-qty">×${herbs[id]}</span></div>`;
    }
    html += '</div>';
  } else {
    html += `<div class="brew-empty">Ta besace est vide. Fouille les salles et affronte les créatures botaniques pour récolter des herbes.</div>`;
  }
  html += `<div style="margin-top:12px; font-size:11px; color:#6a5030; text-align:center;">Concocte tes potions au chaudron de Slughorn.</div>`;
  pane.innerHTML = html;
}

function openInventory() {
  renderInventory(false);
  renderBesace();
  const btnG = document.getElementById('inv-tab-grimoire');
  if (btnG) btnG.style.display = _grimoirePouchRelevant() ? '' : 'none';
  renderGrimoirePouch();
  _applyInvTab('sac', true);
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
  if (old && player.inventory.length >= INVENTORY_MAX) {
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

// Applique l'effet d'un consommable sur la cible (hp/sp). No-op si
// l'effet n'est pas un effet de restauration reconnu.
function _applyConsumableEffect(item, target) {
  if (item.effect === 'heal')                  target.hp = Math.min(target.hpMax, target.hp + item.power);
  else if (item.effect === 'restore_sp')       target.sp = Math.min(target.spMax, target.sp + item.power);
  else if (item.effect === 'heal_full')        target.hp = target.hpMax;
  else if (item.effect === 'restore_sp_full')  target.sp = target.spMax;
  else if (item.effect === 'both') {
    target.hp = Math.min(target.hpMax, target.hp + item.power);
    target.sp = Math.min(target.spMax, target.sp + 10);
  }
  // ── Sinks endgame (consommables permanents) ────────────────
  // +PV max permanent + heal complet bonus. Le _baseHpMax (s'il
  // existe pour le tracking équipement) n'a pas à être touché : on
  // bouge directement hpMax, c'est la stat effective.
  else if (item.effect === 'perma_hp') {
    target.hpMax = (target.hpMax || 0) + (item.power || 0);
    target.hp    = target.hpMax;
  }
  else if (item.effect === 'perma_sp') {
    target.spMax = (target.spMax || 0) + (item.power || 0);
    target.sp    = target.spMax;
  }
  else if (item.effect === 'perma_end') {
    // _baseEnd lazy-init si absent (saves antérieures à l'extension).
    if (typeof target._baseEnd !== 'number') target._baseEnd = target.end || 0;
    target._baseEnd += (item.power || 0);
    if (typeof recalculateStats === 'function') recalculateStats();
  }
  // 'stat_boost' (Pierre d'Âme) est intercepté en amont par useItem →
  // _openStatBoostMenu (modale de choix de stat). Ne devrait jamais
  // arriver ici, mais no-op par sécurité.
}

// Enseigne un sort à un seul personnage. Retourne false si verrouillé,
// inconnu, ou déjà connu par ce perso.
function _teachSpellToOne(spellName, charIdx) {
  const spellDef = SPELLS.find(s => s.name === spellName);
  if (!spellDef || spellDef.locked) return false;
  const c = party[charIdx];
  if (!c || c.spells.includes(spellName)) return false;
  c.spells.push(spellName);
  return true;
}

// Prompt « qui apprend ce sort ? ». En solo, apprend directement à
// Harry ; en duo, affiche un bouton par personnage dans #inv-grid
// (même patron visuel que showEquipMenu).
function showLearnMenu(item, idx) {
  if (partySize === 1) { learnSpellbook(idx, 0); return; }

  const grid = document.getElementById('inv-grid');
  const charButtons = party.slice(0, partySize).map((c, ci) => {
    const knows = c.spells.includes(item.spell);
    return `<button class="cmd-btn" style="width:100%;margin-bottom:6px"
              ${knows ? 'disabled' : ''}
              onclick="learnSpellbook(${idx},${ci})">
              ${c.icon} ${c.name.split(' ')[0]}${knows ? ' — déjà connu' : ''}
            </button>`;
  }).join('');

  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        Apprendre ${getItemIconHtml(item, 'ui-icon-md')} ${item.spell}
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

// ── Sinks endgame — consommables permanents (perma_*, stat_boost) ──
// Ces consommables modifient durablement un perso : on demande au
// joueur quel perso reçoit le bonus (en duo) puis on applique, plutôt
// que de défaulter à Harry comme les soins. Cf. game-economy-gold-audit.md §5.6.

function _openPermaTargetMenu(item, idx) {
  if (partySize === 1) { _applyPermaToChar(idx, 0); return; }
  const grid = document.getElementById('inv-grid');
  const charButtons = party.slice(0, partySize).map((c, ci) =>
    `<button class="cmd-btn" style="width:100%;margin-bottom:6px"
       onclick="_applyPermaToChar(${idx},${ci})">
       ${c.icon} ${c.name.split(' ')[0]}
     </button>`).join('');
  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        Boire ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}
      </div>
      <div style="font-size:11px;color:#8a7050;margin-bottom:12px">Effet permanent — choisissez le bénéficiaire</div>
      <div style="max-width:220px;margin:0 auto">
        ${charButtons}
        <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
          onclick="renderInventory(false)">← Annuler</button>
      </div>
    </div>`;
}

function _applyPermaToChar(idx, charIdx) {
  const item = player.inventory[idx];
  const target = party[charIdx];
  if (!item || !target) return;
  _applyConsumableEffect(item, target);
  addMsg(`${target.name} consomme : ${item.name}`, 'good');
  player.inventory.splice(idx, 1);
  updateUI();
  closeModal('inventory-modal');
}

// Pierre d'Âme — 2 étapes : choix du perso (en duo) puis choix de la stat.
const _STAT_BOOST_CHOICES = [
  { key: '_baseStr', label: 'Force (FOR)',     trigger: 'str' },
  { key: '_baseInt', label: 'Intelligence (INT)', trigger: 'int' },
  { key: '_baseAgi', label: 'Agilité (AGI)',   trigger: 'agi' },
  { key: '_baseEnd', label: 'Endurance (END)', trigger: 'end' },
  { key: '_baseLck', label: 'Chance (LCK)',    trigger: 'lck' },
  { key: '_baseMag', label: 'Magie (MAG)',     trigger: 'mag' },
  { key: '_baseAtk', label: 'Attaque (ATK)',   trigger: 'atk' },
  { key: '_baseDef', label: 'Défense (DEF)',   trigger: 'def' },
];

function _openPierreAmeMenu(idx) {
  if (partySize === 1) { _openPierreAmeStatMenu(idx, 0); return; }
  const item = player.inventory[idx];
  if (!item) return;
  const grid = document.getElementById('inv-grid');
  const charButtons = party.slice(0, partySize).map((c, ci) =>
    `<button class="cmd-btn" style="width:100%;margin-bottom:6px"
       onclick="_openPierreAmeStatMenu(${idx},${ci})">
       ${c.icon} ${c.name.split(' ')[0]}
     </button>`).join('');
  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        ${getItemIconHtml(item, 'ui-icon-md')} Pierre d'Âme
      </div>
      <div style="font-size:11px;color:#8a7050;margin-bottom:12px">+1 stat permanente — choisissez le bénéficiaire</div>
      <div style="max-width:220px;margin:0 auto">
        ${charButtons}
        <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
          onclick="renderInventory(false)">← Annuler</button>
      </div>
    </div>`;
}

function _openPierreAmeStatMenu(idx, charIdx) {
  const item = player.inventory[idx];
  const c = party[charIdx];
  if (!item || !c) return;
  const grid = document.getElementById('inv-grid');
  const statButtons = _STAT_BOOST_CHOICES.map(s => {
    const cur  = c[s.trigger] || 0;
    const next = cur + 1;
    return `<button class="cmd-btn" style="width:100%;margin-bottom:6px;text-align:left;padding-left:10px;display:flex;justify-content:space-between;align-items:center"
       onclick="_applyStatBoost(${idx},${charIdx},'${s.trigger}')">
       <span>${s.label}</span>
       <span style="color:#8a7050;font-size:11px">${cur} <span style="color:var(--gold)">→ ${next}</span></span>
     </button>`;
  }).join('');
  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        ${c.icon} ${c.name.split(' ')[0]} — choix de la stat
      </div>
      <div style="font-size:11px;color:#8a7050;margin-bottom:12px">+1 permanent (cumulable avec équipement et level-up)</div>
      <div style="max-width:260px;margin:0 auto">
        ${statButtons}
        <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
          onclick="renderInventory(false)">← Annuler</button>
      </div>
    </div>`;
}

function _applyStatBoost(idx, charIdx, statTrigger) {
  const item = player.inventory[idx];
  const target = party[charIdx];
  if (!item || !target) return;
  const choice = _STAT_BOOST_CHOICES.find(s => s.trigger === statTrigger);
  if (!choice) return;
  // Lazy-init du _base* à partir de la stat effective (saves antérieures).
  if (typeof target[choice.key] !== 'number') {
    target[choice.key] = target[choice.trigger] || 0;
  }
  target[choice.key] += 1;
  if (typeof recalculateStats === 'function') recalculateStats();
  addMsg(`✨ ${target.name} absorbe la Pierre d'Âme : +1 ${choice.label.match(/\(([A-Z]+)\)/)[1]} permanent !`, 'magic');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  player.inventory.splice(idx, 1);
  updateUI();
  closeModal('inventory-modal');
}

// Enseigne le sort du livre `inventoryIdx` au seul personnage `charIdx`,
// puis consomme le livre. Refus si le perso connaît déjà le sort.
function learnSpellbook(inventoryIdx, charIdx) {
  const item = player.inventory[inventoryIdx];
  if (!item || item.type !== 'spellbook') return;
  const c = party[charIdx];
  if (!c) return;
  if (_teachSpellToOne(item.spell, charIdx)) {
    AudioSystem.playLevelUp();
    AudioSystem.speakSpell(item.spell);
    addMsg(`✨ ${c.name} apprend : ${item.spell} !`, 'magic');
    player.inventory.splice(inventoryIdx, 1);
  } else {
    addMsg(`${c.name} connaît déjà ${item.spell}.`, '');
  }
  updateUI();
  closeModal('inventory-modal');
}

// ── Utiliser / équiper un objet ──────────────────────────────
function useItem(idx, battleMode) {
  const item = player.inventory[idx];
  if (!item) return;

  // Objet de quête (matériau narratif) — non utilisable manuellement,
  // conservé jusqu'à la remise au PNJ concerné.
  if (item.type === 'quest') {
    addMsg(`${item.name} : objet de quête — à rapporter au bon moment.`, '');
    return;
  }

  // Clé de salle scellée — s'utilise sur une porte, pas depuis le sac.
  if (item.type === 'key') {
    addMsg(`${item.name} : avancez vers une porte scellée pour l'utiliser.`, '');
    return;
  }

  // Livre de sorts → choix du personnage qui apprend (hors combat seulement)
  if (item.type === 'spellbook') {
    if (battleMode) return; // non utilisable en combat
    const spellDef = SPELLS.find(s => s.name === item.spell);
    if (!spellDef) { addMsg(`Sort inconnu : ${item.spell}`, 'bad'); return; }
    showLearnMenu(item, idx);
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

  // Sinks endgame : consommables permanents — requièrent un choix
  // de bénéficiaire en duo (hors combat uniquement).
  if (item.effect === 'stat_boost') {
    if (battleMode) { addMsg(`${item.name} : à utiliser hors combat.`, ''); return; }
    _openPierreAmeMenu(idx);
    return;
  }
  if ((item.effect === 'perma_hp' || item.effect === 'perma_sp' || item.effect === 'perma_end')
      && partySize === 2 && !battleMode) {
    _openPermaTargetMenu(item, idx);
    return;
  }

  const target = (battleMode && inBattle) ? party[currentBattleChar] : player;

  _applyConsumableEffect(item, target);
  addMsg(`${target.name} utilise : ${item.name}`, 'good');
  player.inventory.splice(idx, 1);

  updateUI();
  closeModal('inventory-modal');

  if (battleMode && inBattle) {
    // Les ennemis contre-attaquent après utilisation d'objet — mêmes règles
    // que le tour ennemi (Protego > Esquive > Garde > coup normal).
    let log = `${target.name} utilise ${item.name}. `;
    livingEnemies().forEach(e => {
      if (e.currentHp <= 0) return;
      log += _enemyPhysicalHit(e, target, currentBattleChar);
    });
    setBattleLog(log);
    renderEnemyGroup();
    updateUI();
    if (livingEnemies().length === 0) { endBattle(true); return; }
    if (allPartyKO()) { inBattle = false; triggerDeath('Le groupe a été vaincu...'); }
    else advanceBattleChar();
  }
}

// ============================================================
// SORTS
// ============================================================

// ── Filtre par catégorie de la modale Sorts ──────────────────
// Axe unique = élément (cf. .claude/plans/spell-ux-improvements.md §2).
const SPELL_FILTERS = [
  { id: 'tous',       label: 'Tous',        icon: '' },
  { id: 'feu',        label: 'Feu',         icon: '🔥' },
  { id: 'glace',      label: 'Glace',       icon: '❄️' },
  { id: 'foudre',     label: 'Foudre',      icon: '⚡' },
  { id: 'lumière',    label: 'Lumière',     icon: '✨' },
  { id: 'ténèbres',   label: 'Ténèbres',    icon: '🌑' },
  { id: 'physique',   label: 'Physique',    icon: '⚔️' },
  { id: 'soutien',    label: 'Soutien',     icon: '💚' },
  { id: 'utilitaire', label: 'Utilitaires', icon: '🔧' },
];
let _spellFilter = 'tous';

// Re-render de la modale Sorts après changement de filtre.
function setSpellFilter(id, mode, charIdx) {
  _spellFilter = id;
  if (mode === 'battle') openBattleSpells();
  else                   openSpells(charIdx);
}

// Barre de chips : n'affiche que les catégories présentes chez le perso
// (+ « Tous »). Si le filtre courant n'a plus de sort → retombe sur Tous.
function _spellFilterBarHtml(spellNames, mode, charIdx) {
  const present = new Set();
  spellNames.forEach(n => {
    const sp = SPELLS.find(s => s.name === n);
    if (sp) present.add(spellCategory(sp));
  });
  if (_spellFilter !== 'tous' && !present.has(_spellFilter)) _spellFilter = 'tous';
  const chips = SPELL_FILTERS.filter(f => f.id === 'tous' || present.has(f.id));
  if (chips.length <= 2) return '';   // 1 seule catégorie → filtre inutile
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">` +
    chips.map(f => {
      const on = _spellFilter === f.id;
      return `<div onclick="setSpellFilter('${f.id}','${mode}',${charIdx})"
        style="cursor:pointer;padding:3px 7px;border-radius:2px;font-family:'Cinzel',serif;font-size:9px;letter-spacing:1px;
        background:${on ? '#2a1a08' : '#0a0705'};border:1px solid ${on ? 'var(--gold-dark)' : '#2a1a08'};color:${on ? 'var(--gold-light)' : '#6a5030'}">
        ${f.icon} ${f.label}</div>`;
    }).join('') + `</div>`;
}

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

  list.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:10px">${tabs}</div>`
                 + _spellFilterBarHtml(c.spells, 'spell', charIdx);

  for (const sName of c.spells) {
    const spell = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    if (_spellFilter !== 'tous' && spellCategory(spell) !== _spellFilter) continue;
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
    // Cheminette Inter-Mondes : verrouillée en mode Ironman
    // (parallel-worlds.md §2.1 — la voie solitaire ne se partage pas).
    const ironmanLock = spell.effect === 'portal'
      && typeof ironmanMode !== 'undefined' && ironmanMode;
    const canCastOoc = isOoc && cdRemaining === 0
      && c.sp >= (oocCost || spell.cost) && !ironmanLock;
    const costLabel = oocCost
      ? `${oocCost} PM <span style="color:#6a5030;font-size:9px">(hors combat)</span>`
      : `${spell.cost} PM`;
    let hint;
    if (!isOoc) {
      hint = '<span style="font-size:9px;color:#6a5030">Combat uniquement</span>';
    } else if (ironmanLock) {
      hint = '<span style="font-size:9px;color:#6a5030">⚜ Voie solitaire — l\'Ironman se joue seul</span>';
    } else if (cdRemaining > 0) {
      hint = `<span style="font-size:9px;color:#a04020">⏳ Se recharge — ${cdRemaining} ${cdUnit}</span>`;
    } else if (!canCastOoc) {
      hint = '<span style="font-size:9px;color:#a04020">PM insuffisants</span>';
    } else {
      hint = '<span style="font-size:9px;color:#6a8030">▶ cliquer pour lancer</span>';
    }
    const preview     = spellEffectPreview(spell, c);
    const previewHtml = preview
      ? `<div style="font-size:9px;color:var(--gold-dark);margin-top:2px">${preview}</div>`
      : '';
    div.innerHTML = `
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
        ${previewHtml}
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
  return spell.effect === 'teleport' || spell.effect === 'heal'
      || spell.effect === 'reveal'   || spell.effect === 'portal';
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
  },
  // Revelio hors combat : dissipe le brouillard sur un carré de rayon 2
  // autour du joueur (cf. manon-grimoire-pages.md §4a). La révélation des
  // pages dissimulées sera greffée ici en phase 3.
  reveal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut canaliser le sort.', 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    // S'assure que la page de l'étage est posée avant de tenter de la révéler.
    if (typeof _ensurePagePlacement === 'function') _ensurePagePlacement(currentFloor);
    let cleared = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = playerX + dx, y = playerY + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (visited[y] && !visited[y][x]) { visited[y][x] = true; cleared++; }
      }
    }
    // Une page non collectée dans la zone éclaircie est dévoilée (minimap).
    let pageRevealed = false;
    const pagePos = (typeof pagePlacements !== 'undefined')
      ? pagePlacements.get(currentFloor) : null;
    if (pagePos && !revealedPages.has(currentFloor)) {
      const [px, py] = pagePos.split(',').map(Number);
      if (Math.abs(px - playerX) <= 2 && Math.abs(py - playerY) <= 2) {
        revealedPages.add(currentFloor);
        pageRevealed = true;
      }
    }
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    if (pageRevealed) {
      addMsg(`🔎 ${caster.name} lance ${spell.name} — une page du grimoire scintille sur la carte !`, 'good');
    } else {
      addMsg(cleared > 0
        ? `🔎 ${caster.name} lance ${spell.name} — le brouillard se dissipe alentour.`
        : `🔎 ${caster.name} lance ${spell.name} — rien de neuf à dévoiler ici.`,
        cleared > 0 ? 'good' : '');
    }
    closeModal('spell-modal');
    if (typeof renderMinimap === 'function') renderMinimap();
    updateUI();
  },
  // Cheminette Inter-Mondes — Phase A : animation locale 2,8 s sans
  // réseau. Les phases suivantes (parallel-worlds.md §10 Phases B+)
  // brancheront snapshot Supabase + rendu du donjon distant après
  // playPortalOpen. Refusé en Ironman (double-gate avec openSpells)
  // et silencieux si portal-fx.js absent.
  portal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut tracer le portail.', 'bad');
      return;
    }
    if (typeof ironmanMode !== 'undefined' && ironmanMode) {
      addMsg("Le mode Ironman se joue seul — la solitude est la promesse de la légende.", 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    addMsg(`🌀 ${caster.name} entonne ${spell.name}…`, 'magic');
    closeModal('spell-modal');
    updateUI();
    const finish = () => updateUI();
    const placeholder = () => {
      addMsg("Le Réseau de Cheminette astral reste silencieux. Aucun sorcier ne répond depuis l'autre côté.", '');
      if (typeof playPortalClose === 'function') playPortalClose({ caster }, finish);
      else finish();
    };
    if (typeof playPortalOpen === 'function') {
      playPortalOpen({ caster }, placeholder);
    } else {
      addMsg("Le portail vacille — animations indisponibles.", 'bad');
      finish();
    }
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
    </div>` + _spellFilterBarHtml(c.spells, 'battle', 0);

  for (const sName of c.spells) {
    const spell    = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    if (_spellFilter !== 'tous' && spellCategory(spell) !== _spellFilter) continue;
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
    const preview     = spellEffectPreview(spell, c);
    const previewHtml = preview
      ? `<div style="font-size:9px;color:var(--gold-dark);margin-top:2px">${preview}</div>`
      : '';
    div.innerHTML  = `
      <div class="spell-icon">${getSpellIconHtml(spell, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${spell.name}</div>
        <div class="spell-desc">${spell.desc}</div>
        ${previewHtml}
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
        const needsTarget = ['stun','burn','instant','disarm','imperius','aoe_cleave','reveal'].includes(spell.effect);
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
  // Pas de besace en combat (herbes non utilisables) : onglets masqués.
  _applyInvTab('sac', false);
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
// - spellbook   : enseigne au seul party[charIdx]
// - équipement  : equipItem(idx, charIdx) (anneau routé ring1→ring2)
function useItemFromChar(inventoryIdx, charIdx) {
  const item = player.inventory[inventoryIdx];
  if (!item) return;
  const target = party[charIdx];
  if (!target) return;

  if (item.type === 'quest') {
    addMsg(`${item.name} : objet de quête — à rapporter au bon moment.`, '');
    return;
  }

  if (item.type === 'consumable') {
    _applyConsumableEffect(item, target);
    addMsg(`${target.name} utilise : ${item.name}`, 'good');
    player.inventory.splice(inventoryIdx, 1);
    updateUI();
    openCharacter(charIdx);
    return;
  }

  if (item.type === 'spellbook') {
    if (_teachSpellToOne(item.spell, charIdx)) {
      AudioSystem.playLevelUp();
      AudioSystem.speakSpell(item.spell);
      addMsg(`✨ ${target.name} apprend : ${item.spell} !`, 'magic');
      player.inventory.splice(inventoryIdx, 1);
    } else {
      addMsg(`${target.name} connaît déjà ${item.spell}.`, '');
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
