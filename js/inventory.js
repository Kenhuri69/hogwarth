// ============================================================
// INVENTAIRE (partagé) — UI sac, équipement, usage d'objets
// ============================================================
// Cœur (ajout d'objets, matériaux, recalculateStats) : inventory-core.js
// (chargé avant). Système de sorts (modales Sorts/combat, lancers hors
// combat) : inventory-spells.js (chargé après).

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
            onclick="equipItem(${idx},0,'ring1')"><img class="ui-icon ui-icon-md" src="img/icons/accessory.png" alt=""> Anneau gauche${r1Label}</button>
          <button class="cmd-btn" style="width:100%;margin-bottom:6px"
            onclick="equipItem(${idx},0,'ring2')"><img class="ui-icon ui-icon-md" src="img/icons/accessory.png" alt=""> Anneau droit${r2Label}</button>
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
          onclick="equipItem(${idx},${ci},'ring1')"><img class="ui-icon ui-icon-md" src="img/icons/accessory.png" alt=""> gauche${r1Label}</button>
        <button class="cmd-btn" style="width:100%;margin-bottom:8px"
          onclick="equipItem(${idx},${ci},'ring2')"><img class="ui-icon ui-icon-md" src="img/icons/accessory.png" alt=""> droit${r2Label}</button>
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
      addMsg(`${getSpellIconHtml(item.grantsSpell, 'ui-icon-md')} Sort débloqué : ${item.grantsSpell} !`, 'magic');
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
  // C5/P1 — « Brassage maison » : une potion brassée porte une potency bakée
  // (`brewPotency`, cf. potions.js) qui module les effets chiffrés (heal /
  // restore_sp / both). Fallback legacy : flag `brewed` seul → BREW_POTENCY_BONUS.
  // Potency négative possible (fiole diluée d'un brassage raté). « full » = 100 %.
  const brewPotency = (typeof item.brewPotency === 'number')
    ? item.brewPotency
    : (item.brewed ? ((typeof BREW_POTENCY_BONUS !== 'undefined') ? BREW_POTENCY_BONUS : 0.25) : 0);
  const brewMult = 1 + brewPotency;
  const pow = Math.round((item.power || 0) * brewMult);
  if (item.effect === 'heal')                  target.hp = Math.min(target.hpMax, target.hp + pow);
  else if (item.effect === 'restore_sp')       target.sp = Math.min(target.spMax, target.sp + pow);
  else if (item.effect === 'heal_full')        target.hp = target.hpMax;
  else if (item.effect === 'restore_sp_full')  target.sp = target.spMax;
  else if (item.effect === 'both') {
    target.hp = Math.min(target.hpMax, target.hp + pow);
    target.sp = Math.min(target.spMax, target.sp + Math.round(10 * brewMult));
  }
  // ── Consommables à effet (réutilisent les statuts/boucliers du combat) ──
  // Antidote : purge les statuts néfastes de DoT (pas weaken, dont la DEF
  // est restaurée à l'expiry par tickStatuses — la retirer la figerait).
  else if (item.effect === 'cure') {
    if (Array.isArray(target.statusEffects)) {
      target.statusEffects = target.statusEffects.filter(
        s => !['burn', 'poison', 'bleed', 'gel'].includes(s.id));
    }
  }
  // Régénération : pose le statut `regen` existant (soin par tour).
  else if (item.effect === 'regen_buff') {
    if (typeof applyStatus === 'function') applyStatus(target, 'regen', item.power || 5, item.turns || 4);
  }
  // Buff temporaire de stat (P0 — Potion de Force). Miroir positif de
  // `disarm` : l'ATK est augmentée ici, restaurée à l'expiry par tickStatuses.
  // `buffStat` choisit la stat ('atk' par défaut). Le buff profite du
  // multiplicateur de brassage (brewMult, P1) → une Potion de Force brassée
  // concentrée booste davantage. Non empilable (applyStatus refresh la durée).
  else if (item.effect === 'temp_buff') {
    const stat   = item.buffStat || 'atk';
    const turns  = item.turns || 3;
    const amount = Math.round((item.power || 0) * brewMult);
    if (typeof applyStatus === 'function' && stat === 'atk') {
      const applied = applyStatus(target, 'buff_atk', amount, turns);
      if (applied && amount > 0) target.atk = (target.atk || 0) + amount;
    }
  }
  // Résistance : pose le statut non-DoT `resist_buff` (réduction générale des
  // dégâts subis de `power` % pendant `turns` tours). Lu par _resistMult()
  // aux sites de dégâts héros. Surtout utile en combat.
  else if (item.effect === 'resist_buff') {
    if (typeof applyStatus === 'function') {
      applyStatus(target, 'resist_buff', item.power || 40, item.turns || 3);
    }
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
    addMsg(`${getSpellIconHtml(item.spell, 'ui-icon-md')} ${c.name} apprend : ${item.spell} !`, 'magic');
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

  // Matériaux (Forge / Bibliothèque / upgrade-craft potions) — non utilisables
  // manuellement. Consommés uniquement à la Forge, Bibliothèque ou au chaudron.
  // NB : doit précéder la branche équipement (`type !== 'consumable'`), sinon un
  // matériau slotless tomberait dans showEquipMenu → equipItem corrompu.
  if (item.type === 'material') {
    addMsg(`${item.name} : matériau d'upgrade — utilisable à la Forge, à la Bibliothèque ou au chaudron.`, '');
    return;
  }

  // Équipement → menu de sélection (hors combat seulement)
  if (item.type !== 'consumable') {
    if (battleMode) return; // ne devrait pas être cliquable en combat
    showEquipMenu(item, idx);
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
      addMsg(`${getSpellIconHtml(item.spell, 'ui-icon-md')} ${target.name} apprend : ${item.spell} !`, 'magic');
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

