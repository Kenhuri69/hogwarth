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
    html += `<div class="brew-empty">Aucune page récoltée. Lance Revelio dans le donjon pour dévoiler les pages dissimulées par Élara.</div>`;
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
  if (typeof _mountGrimoireTabs === 'function') _mountGrimoireTabs('sac');
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
// ── Filtre + tri du sac (M2, polish UX) ──────────────────────
// Filtre/tri PUREMENT d'affichage : l'ordre de stockage de player.inventory
// ne bouge JAMAIS — chaque cellule conserve son index réel pour les actions.
// État de session (non persisté). Inactif en combat (barre masquée).
let _invFilter = 'tous';        // 'tous' | 'equip' | 'conso'
let _invSortRarity = false;
const _INV_RARITY_RANK = { legendary: 4, epic: 3, rare: 2, common: 1 };

function _invMatchesFilter(item) {
  if (_invFilter === 'equip') return ['wand', 'armor', 'acc'].includes(item.type);
  if (_invFilter === 'conso') return item.type === 'consumable';
  return true;
}

// entries : [{item, idx}] (idx = index réel dans player.inventory).
function _applyInvFilterSort(entries) {
  let out = entries.filter(e => _invMatchesFilter(e.item));
  if (_invSortRarity) {
    out = out.slice().sort((a, b) => {
      const ra = _INV_RARITY_RANK[a.item.rarity] || 0;
      const rb = _INV_RARITY_RANK[b.item.rarity] || 0;
      if (rb !== ra) return rb - ra;
      return a.idx - b.idx;             // stable par index réel
    });
  }
  return out;
}

function setInvFilter(f) {
  _invFilter = ['tous', 'equip', 'conso'].includes(f) ? f : 'tous';
  renderInventory(false);
}
function toggleInvSort() {
  _invSortRarity = !_invSortRarity;
  renderInventory(false);
}
function _updateInvFilterBar() {
  ['tous', 'equip', 'conso'].forEach(f => {
    const b = document.getElementById('inv-filter-' + f);
    if (b) b.classList.toggle('active', _invFilter === f);
  });
  const s = document.getElementById('inv-sort-rarity');
  if (s) {
    s.classList.toggle('active', _invSortRarity);
    s.setAttribute('aria-pressed', _invSortRarity ? 'true' : 'false');
  }
}

// Construit une cellule d'inventaire pour `item` à l'index réel `i`.
function _renderInvSlotEl(item, i, battleMode) {
  const div = document.createElement('div');
  div.className = 'inv-slot has-item';
  const isEquip     = ['wand', 'armor', 'acc'].includes(item.type);
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
  // Compteur de quantité pour les consommables empilés (×N).
  const qty = (typeof _itemQty === 'function') ? _itemQty(item) : (item.qty || 1);
  const qtyBadge = qty > 1 ? `<span class="inv-qty-badge">×${qty}</span>` : '';
  div.innerHTML = `<div class="item-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div><div class="item-name">${item.name}</div>${typeLabel}${qtyBadge}${ttHtml}`;

  if (battleMode && isEquip) {
    // Équipements non utilisables en combat — grisés
    div.style.opacity = '0.45';
    div.style.cursor  = 'default';
    div.title         = 'Non utilisable en combat';
  } else {
    div.tabIndex = 0; // cellule atteignable au clavier (Tab + Entrée/Espace)
    div.onclick = () => _handleInvTap(div, () => useItem(i, battleMode));
  }
  return div;
}

function renderInventory(battleMode) {
  const grid = document.getElementById('inv-grid');
  grid.innerHTML = '';
  const slots = 16;

  // Barre de filtre/tri (M2) — hors combat uniquement.
  const filterBar = document.getElementById('inv-filter-bar');
  if (filterBar) filterBar.style.display = battleMode ? 'none' : 'flex';

  // Liste affichée. En combat : ordre brut (comportement historique). Hors
  // combat : filtre + tri d'affichage, l'index réel `idx` étant conservé.
  let entries = player.inventory.map((item, idx) => ({ item, idx }));
  if (!battleMode) {
    entries = _applyInvFilterSort(entries);
    _updateInvFilterBar();
  }

  entries.forEach(({ item, idx }) => grid.appendChild(_renderInvSlotEl(item, idx, battleMode)));

  // Emplacements vides pour conserver la grille 4×4 (look stable).
  for (let k = entries.length; k < slots; k++) {
    const div = document.createElement('div');
    div.className = 'inv-slot';
    div.innerHTML = '<div class="inv-empty-slot">—</div>';
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

// Coquille du panneau de choix d'équipement (titre + desc + boutons +
// Annuler), partagée par les branches solo-anneau et duo de showEquipMenu.
function _equipMenuPanel(item, setBadge, buttonsHtml) {
  return `
    <div style="grid-column:1/-1;padding:14px;text-align:center">
      <div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:4px">
        Équiper ${getItemIconHtml(item, 'ui-icon-md')} ${item.name}${setBadge}
      </div>
      <div style="font-size:11px;color:#8a7050;margin-bottom:12px">${item.desc}</div>
      <div style="max-width:200px;margin:0 auto">
        ${buttonsHtml}
        <button class="cmd-btn" style="width:100%;margin-top:4px;opacity:.7"
          onclick="renderInventory(false)">← Annuler</button>
      </div>
    </div>
  `;
}

// Boutons « anneau gauche / droit » pour le perso `ci`. `compact=false`
// (solo) : libellés longs « Anneau gauche/droit » + « (vide) » si slot libre.
// `compact=true` (duo) : libellés courts, pas de « (vide) », marges resserrées.
function _equipRingButtons(idx, ci, c, compact) {
  const ring1 = c.equipped && c.equipped.ring1;
  const ring2 = c.equipped && c.equipped.ring2;
  const r1Label = ring1 ? ` (rem. ${ring1.name})` : (compact ? '' : ' (vide)');
  const r2Label = ring2 ? ` (rem. ${ring2.name})` : (compact ? '' : ' (vide)');
  const lead = compact ? '' : 'Anneau ';
  const ico  = '<img class="ui-icon ui-icon-md" src="img/icons/accessory.png" alt="">';
  return `
        <button class="cmd-btn" style="width:100%;margin-bottom:${compact ? '4px' : '6px'}"
          onclick="equipItem(${idx},${ci},'ring1')">${ico} ${lead}gauche${r1Label}</button>
        <button class="cmd-btn" style="width:100%;margin-bottom:${compact ? '8px' : '6px'}"
          onclick="equipItem(${idx},${ci},'ring2')">${ico} ${lead}droit${r2Label}</button>
  `;
}

function showEquipMenu(item, idx) {
  const isRing = item.slot === 'ring';

  // Mode solo + non-anneau : équiper directement Harry
  if (partySize === 1 && !isRing) { equipItem(idx, 0); return; }

  const grid = document.getElementById('inv-grid');
  const setBadge = _equipMenuSetBadge(item);

  // Mode solo + anneau : choisir l'anneau cible (Harry uniquement)
  if (partySize === 1 && isRing) {
    grid.innerHTML = _equipMenuPanel(item, setBadge, _equipRingButtons(idx, 0, party[0], false));
    return;
  }

  // Duo : un bouton par personnage. Pour les anneaux, deux boutons par
  // personnage (anneau gauche / droit) précédés d'un en-tête perso.
  const charButtons = party.slice(0, partySize).map((c, ci) => {
    if (isRing) {
      return `
        <div style="margin-bottom:8px;font-size:10px;color:var(--gold-dark)">${c.icon} ${c.name.split(' ')[0]}</div>
        ${_equipRingButtons(idx, ci, c, true)}`;
    }
    const slot    = _resolveSlotForItem(item, c);
    const current = c.equipped && c.equipped[slot];
    const curLabel = current ? ` (rem. ${current.name})` : '';
    return `<button class="cmd-btn" style="width:100%;margin-bottom:6px"
              onclick="equipItem(${idx},${ci})">
              ${c.icon} ${c.name.split(' ')[0]}${curLabel}
            </button>`;
  }).join('');

  grid.innerHTML = _equipMenuPanel(item, setBadge, charButtons);
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

  // Retirer de l'inventaire (garde de borne centralisée)
  _removeInvItem(inventoryIdx);

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

  // P2 — feedback d'équipement Premium (cosmétique, défensif) : stinger
  // sonore + flash teinté par la Maison (premiumFx). No-op silencieux si les
  // surcouches audio/DOM sont absentes.
  if (item.premium) {
    if (typeof AudioSystem !== 'undefined') {
      if (AudioSystem.playSetComplete)    AudioSystem.playSetComplete();
      else if (AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    }
    _premiumEquipFlash(item.premiumFx);
    addMsg(`✨ <b>Relique de prestige équipée</b> — ${item.name}`, 'magic');
  }

  updateUI();
  addMsg(`${c.name} équipe : ${item.name}`, 'good');
  closeModal('inventory-modal');
}

// Flash plein écran teinté par la Maison à l'équipement d'une Premium (P2).
// PUR cosmétique, entièrement défensif (try/catch + pointer-events none).
function _premiumEquipFlash(fx) {
  try {
    const COL = { gryff: '#d3a625', slyth: '#1a472a', serd: '#0e1a40', pouf: '#f0c75e' };
    const col = COL[fx] || '#d3a625';
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0;'
      + 'transition:opacity .18s ease-out;'
      + `background:radial-gradient(circle at 50% 45%, ${col}88, transparent 68%);`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 340); }, 170);
    });
  } catch (_e) { /* défensif : pas de DOM (smoke file://) → silencieux */ }
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

// Potions 2.0 — Lot P9 : Résilience Maison (`house_buff`). Un seul item, 4
// comportements selon `chosenHouse`. Le `primary` est la stat de la Maison
// (ATK/MAG/MAG/DEF, miroir de HOUSE_BONUSES[h].starGenerator.primaryLabel) ;
// le rider reprend une mécanique EXISTANTE (buff de stat secondaire, statut
// `regen`, ou restitution de PM) — zéro nouveau sous-système de combat. Les
// flavors « spell-lifesteal / −coût PM » du design sont approximés par des
// buffs de stat (calibration P13). Cf. .claude/plans/...craft-2.0.md §1.5/§2.5.
const HOUSE_BUFF_PLANS = {
  Gryffondor:  { primary: 'atk', secondary: 'lck' },  // +ATK / crit (LCK)
  Serpentard:  { primary: 'mag', secondary: 'agi' },  // +MAG / crit de sort (AGI)
  Serdaigle:   { primary: 'mag', restoreSp: true   }, // +MAG / +PM
  Poufsouffle: { primary: 'def', regen: true       }, // +DEF / régén
};

// Pose un buff temporaire de stat (réutilise le statut `buff_<stat>` du moteur
// existant — cf. branche `temp_buff`). NE recalcule PAS : l'appelant groupe les
// poses puis appelle recalculateStats() une seule fois.
function _applyTempStatBuff(target, stat, amount, turns) {
  const statusId = 'buff_' + stat;
  const known = (typeof BUFF_STAT_BY_ID !== 'undefined') && BUFF_STAT_BY_ID[statusId];
  if (typeof applyStatus !== 'function' || !known || amount <= 0) return;
  const applied = applyStatus(target, statusId, amount, turns);
  if (applied) target[stat] = (target[stat] || 0) + amount;
}

// Applique l'effet d'un consommable sur la cible (hp/sp). No-op si
// l'effet n'est pas un effet de restauration reconnu.
function _applyConsumableEffect(item, target) {
  // Retour audio/haptique (C3, polish UX) — gorgée de potion, jusqu'ici
  // silencieuse. Défensif : no-op si les modules audio/haptique n'ont pas
  // chargé. (Les variantes premium gardent leur stinger propre par-dessus.)
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playPotionDrink) AudioSystem.playPotionDrink();
  if (window.HAPTICS_safe) HAPTICS_safe.cast();

  // C5/P1 — « Brassage maison » : une potion brassée porte une potency bakée
  // (`brewPotency`, cf. potions.js) qui module les effets chiffrés (heal /
  // restore_sp / both). Fallback legacy : flag `brewed` seul → BREW_POTENCY_BONUS.
  // Potency négative possible (fiole diluée d'un brassage raté). « full » = 100 %.
  const brewPotency = (typeof item.brewPotency === 'number')
    ? item.brewPotency
    : (item.brewed ? ((typeof BREW_POTENCY_BONUS !== 'undefined') ? BREW_POTENCY_BONUS : 0.25) : 0);
  const brewMult = 1 + brewPotency;
  // P8 — potion évolutive : multiplicateur contextuel ∈ [1, cap] lu à la
  // consommation (formType/setKey/corruption/floor). 1 si pas d'`evolves`.
  const evolveMult = (typeof potionEvolveMult === 'function') ? potionEvolveMult(item) : 1;
  const pow = Math.round((item.power || 0) * brewMult * evolveMult);
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
  // Buff temporaire de stat (P0/P2). Miroir positif de `disarm` : la stat de
  // base est augmentée ici, réappliquée par recalculateStats (source unique),
  // restaurée à l'expiry par tickStatuses. `buffStat` ∈ atk/def/agi/lck/mag
  // ('atk' par défaut). Le buff profite du brassage (brewMult, P1). Non
  // empilable (applyStatus refresh la durée).
  else if (item.effect === 'temp_buff') {
    const stat   = item.buffStat || 'atk';
    const turns  = item.turns || 3;
    const amount = Math.round((item.power || 0) * brewMult * evolveMult);
    const statusId = 'buff_' + stat;
    const known = (typeof BUFF_STAT_BY_ID !== 'undefined') && BUFF_STAT_BY_ID[statusId];
    if (typeof applyStatus === 'function' && known) {
      const applied = applyStatus(target, statusId, amount, turns);
      if (applied && amount > 0) {
        target[stat] = (target[stat] || 0) + amount;
        // AGI/LCK/MAG pilotent des stats dérivées (dodge/crit) → recalc pour
        // les rafraîchir. ATK/DEF n'en dépendent pas mais le recalc reste sûr.
        if (typeof recalculateStats === 'function') recalculateStats();
      }
    }
    // Rider PM (P9 — Sagesse de l'Aigle Premium) : restitution de PM en plus
    // du buff. `restoreSpBonus` optionnel ; back-compat (absent = no-op).
    if (item.restoreSpBonus) {
      target.sp = Math.min(target.spMax, target.sp + item.restoreSpBonus);
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
  // Résilience Maison (P9) : buff aligné sur `chosenHouse`. Primaire = stat de
  // la Maison ; rider = mécanique existante (buff secondaire / regen / +PM).
  else if (item.effect === 'house_buff') {
    const plan  = (typeof HOUSE_BUFF_PLANS !== 'undefined' && chosenHouse) ? HOUSE_BUFF_PLANS[chosenHouse] : null;
    const turns = item.turns || 3;
    const amount = Math.round((item.power || 8) * brewMult * evolveMult);
    if (plan) {
      _applyTempStatBuff(target, plan.primary, amount, turns);
      if (plan.secondary) _applyTempStatBuff(target, plan.secondary, Math.max(1, Math.round(amount / 2)), turns);
      if (plan.regen && typeof applyStatus === 'function') {
        applyStatus(target, 'regen', Math.max(3, Math.round(amount / 2)), turns);
      }
      if (plan.restoreSp) target.sp = Math.min(target.spMax, target.sp + Math.round(amount * 1.5));
      if (typeof recalculateStats === 'function') recalculateStats();
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
  // ── Anti-corruption (Potions 2.0 — Lot P7, §1.5/§2.5) ──────────
  // `purge_corruption` : seule soupape qui fait REDESCENDRE le compteur de
  // groupe `spellCorruption` (combat). Décision figée P7 : agit sur
  // spellCorruption uniquement (gameplay), VFX d'ambiance léger côté useItem.
  // Le Baume du Patronus porte en plus `cureGroup` (purge fear/gel sur tout
  // le groupe) — un seul effet, deux gestes.
  else if (item.effect === 'purge_corruption') {
    const amt = item.corruptionPurge || 0;
    if (typeof spellCorruption === 'number') {
      spellCorruption = Math.max(0, spellCorruption - amt);
    }
    if (Array.isArray(item.cureGroup)) {
      for (const c of party.slice(0, partySize)) {
        if (c && Array.isArray(c.statusEffects)) {
          c.statusEffects = c.statusEffects.filter(s => !item.cureGroup.includes(s.id));
        }
      }
    }
  }
  // `ward_charge` : arme une charge de protection (Élixir d'Immunité). Chaque
  // charge absorbera le prochain sideEffect/gain de corruption d'une potion
  // risquée (consommée par les lots P10). Persistante, sérialisée (state.js).
  else if (item.effect === 'ward_charge') {
    if (typeof wardCharges === 'number') wardCharges += (item.power || 1);
  }
  // ── Huile d'arme (Potions 2.0 — Lot P12, §1.5/§2.5) ────────────
  // Enduit l'arme du buveur : ses attaques PHYSIQUES infligent un bonus
  // élémentaire `power` pendant `turns` attaques (lu par executeAttack). En
  // combat seulement (combat-scoped `weaponOil[idx]`, gaté par useItem).
  else if (item.effect === 'weapon_oil') {
    const idx = party.indexOf(target);
    if (idx >= 0 && typeof weaponOil !== 'undefined') {
      weaponOil[idx] = { element: item.element || 'feu', power: item.power || 6, turns: item.turns || 4 };
    }
  }
  // 'stat_boost' (Pierre d'Âme) est intercepté en amont par useItem →
  // _openStatBoostMenu (modale de choix de stat). Ne devrait jamais
  // arriver ici, mais no-op par sécurité.
}

// ── Risques & effets secondaires (Potions 2.0 — Lot P10, §1.8) ───────────
// La puissance profonde se paie : `corruptionRisk` (montée de spellCorruption)
// + `sideEffect` (contrecoup borné) en Tranche D / Boucle. Une charge d'Immunité
// (`wardCharges`, posée en P7) absorbe le paquet entier d'un usage — contre-jeu
// explicite. Garde-fou §3.3 : sideEffect ≤ 15 % d'une stat, ≤ 2 tours, JAMAIS
// sur PV, toujours télégraphié ⚠️.

// Le contrecoup `sideEffect` n'est armé qu'en Tranche D (étage 14+) ou en
// Boucle Ténébreuse (post-victoire, étage 11+). A/B/C restent « sûrs ».
function _sideEffectActiveHere() {
  const f  = (typeof currentFloor === 'number') ? currentFloor : 1;
  const va = (typeof victoryAchieved !== 'undefined' && victoryAchieved);
  return f >= 14 || (va && f >= 11);
}

// Applique un contrecoup borné : malus de DEF temporaire (réutilise le statut
// `weaken`, auto-restauré par tickStatuses). Jamais sur PV. Plafonné 15 % / 2 t.
function _applyPotionSideEffect(target, se) {
  if (!target || !se) return;
  const turns = Math.min(2, se.turns || 1);
  const mag   = Math.min(0.15, se.magnitude || 0.10);
  const lost  = Math.max(1, Math.round((target.def || 0) * mag));
  if (typeof applyStatus !== 'function') return;
  const applied = applyStatus(target, 'weaken', lost, turns);
  if (applied && lost > 0) {
    target.def = Math.max(0, (target.def || 0) - lost);
    addMsg(`⚠️ Contrecoup de ${target.name} : −${lost} DEF pendant ${turns} tour${turns > 1 ? 's' : ''}.`, 'bad');
  }
}

// Résout le risque d'une consommation : corruption + contrecoup. Renvoie true si
// une charge d'Immunité a tout absorbé. Appelé APRÈS l'effet (et son recalc).
function _applyConsumptionRisk(item, target) {
  if (!item) return false;
  const riskCorr = item.corruptionRisk > 0;
  const riskSide = item.sideEffect && _sideEffectActiveHere()
                   && Math.random() < (typeof item.sideEffect.chance === 'number' ? item.sideEffect.chance : 0.5);
  if (!riskCorr && !riskSide) return false;
  // Immunité : une charge absorbe le paquet de risque entier de cet usage.
  if (typeof wardCharges === 'number' && wardCharges > 0) {
    wardCharges = Math.max(0, wardCharges - 1);
    addMsg(`🔰 La garde mystique absorbe le contrecoup de ${item.name}. (${wardCharges} charge${wardCharges > 1 ? 's' : ''} restante${wardCharges > 1 ? 's' : ''})`, 'magic');
    return true;
  }
  if (riskCorr && typeof spellCorruption === 'number') {
    spellCorruption += item.corruptionRisk;
    addMsg(`🌑 ${item.name} épaissit la corruption (+${item.corruptionRisk} → niveau ${spellCorruption}).`, 'bad');
  }
  if (riskSide) _applyPotionSideEffect(target, item.sideEffect);
  return false;
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
  _consumeAt(idx, 1);
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
  _consumeAt(idx, 1);
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
    _removeInvItem(inventoryIdx);
  } else {
    addMsg(`${c.name} connaît déjà ${item.spell}.`, '');
  }
  updateUI();
  closeModal('inventory-modal');
}

// ── Utiliser / équiper un objet ──────────────────────────────
// Un soin / une recharge n'aurait aucun effet si la stat visée est déjà au
// max → on refuse l'usage (visible) au lieu de gaspiller l'objet en silence.
// 'both' n'est gaspillé que si PV ET PM sont pleins (sinon il reste utile).
function _isWastedRestore(item, c) {
  if (!item || !c) return false;
  const hpFull = c.hp >= c.hpMax;
  const spFull = c.sp >= c.spMax;
  switch (item.effect) {
    case 'heal':
    case 'heal_full':       return hpFull;
    case 'restore_sp':
    case 'restore_sp_full': return spFull;
    case 'both':            return hpFull && spFull;
    // Anti-corruption (P7) : gaspillé seulement si AUCUNE corruption à dissiper
    // ET pas de purge de groupe à appliquer (le Baume reste utile à corruption 0
    // pour chasser fear/gel).
    case 'purge_corruption':
      return (typeof spellCorruption !== 'number' || spellCorruption <= 0)
             && !Array.isArray(item.cureGroup);
    default:                return false;
  }
}

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

  // Flacon offensif (P6.c) — se lance sur UN ennemi, en combat uniquement.
  // Ferme la modale puis cible : auto si 1 seul ennemi vivant, sinon le
  // sélecteur de cible (pendingAction 'throw_item' → throwItemAtEnemy).
  if (item.effect === 'throw') {
    if (!battleMode || !inBattle) {
      addMsg(`${item.name} : à lancer sur un ennemi — utilisable en combat seulement.`, '');
      return;
    }
    closeModal('inventory-modal');
    // Flacon à dispersion (aoe) : touche tout le groupe ennemi, pas de ciblage.
    if (item.aoe) {
      throwItemAoe(idx);
    } else if (livingEnemies().length > 1) {
      pendingThrowIdx = idx;
      showTargetSelection('throw_item');
    } else {
      throwItemAtEnemy(idx, getFirstLivingEnemy());
    }
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

  // Félix Felicis (D5 — Fortune) : pur buff de chance, plus aucun soin. Arme
  // felixFortuneSteps (FELIX_POINTS ajoutés à la Fortune du groupe pendant
  // FELIX_STEPS pas d'exploration). Couvre fouilles, coffres et combats d'une
  // exploration d'étage. Cf. .claude/plans/luck-fortune.md §2.2.
  if (item.effect === 'fortune') {
    felixFortuneSteps = (typeof FELIX_STEPS === 'number') ? FELIX_STEPS : 40;
    addMsg(`${item.name} : une chance insolente t'enveloppe (${felixFortuneSteps} pas).`, 'magic');
    _consumeAt(idx, 1);
    updateUI();
    closeModal('inventory-modal');
    return;
  }

  // Huile d'arme (P12) — enduit de combat : à appliquer en combat (l'état
  // weaponOil est combat-scoped). Hors combat = refus explicite.
  if (item.effect === 'weapon_oil' && !(battleMode && inBattle)) {
    addMsg(`${item.name} : à appliquer sur l'arme en plein combat.`, '');
    return;
  }

  // Vision des Éclats (P12) — révèle l'étage + aiguise la fouille N pas. Hors combat.
  if (item.effect === 'reveal_treasures') {
    if (battleMode || inBattle) { addMsg(`${item.name} : à boire hors combat.`, ''); return; }
    const revealed = (typeof _revealFloorTreasures === 'function') ? _revealFloorTreasures() : 0;
    if (typeof visionSearchSteps === 'number') visionSearchSteps = (item.power || 20);
    addMsg(`🔮 ${item.name} — l'étage se dévoile (${revealed} secret${revealed > 1 ? 's' : ''}) ; ta fouille s'aiguise (${visionSearchSteps} pas).`, 'magic');
    if (typeof DFX_safe !== 'undefined') DFX_safe.burst('game-container', 'gold');
    _consumeAt(idx, 1);
    updateUI();
    closeModal('inventory-modal');
    return;
  }

  // Écho Temporel (P12) — dual-mode. En combat : action immédiate 1×/combat
  // (ne consomme PAS le tour, pas de contre-attaque). Hors combat : annule le
  // dernier pas (position + PV/PM).
  if (item.effect === 'temporal_echo') {
    if (battleMode && inBattle) {
      if (temporalEchoUsed) { addMsg(`${item.name} : le flux temporel s'est déjà replié ce combat.`, ''); return; }
      temporalEchoUsed = true;
      _consumeAt(idx, 1);
      addMsg(`⏳ ${item.name} — tu reprends un instant au destin : agis de nouveau !`, 'magic');
      UX_safe.combatBanner('⏳ Écho Temporel', 'tenaille');
      updateUI();
      closeModal('inventory-modal');
      return; // tour conservé : le héros actif rejoue
    }
    if (typeof _undoLastStep !== 'function' || !_undoLastStep()) {
      addMsg(`${item.name} : aucun pas récent à annuler ici.`, '');
      return;
    }
    _consumeAt(idx, 1);
    addMsg(`⏳ ${item.name} — le dernier pas se défait, le temps reflue.`, 'magic');
    updateUI();
    closeModal('inventory-modal');
    return;
  }

  const target = (battleMode && inBattle) ? party[currentBattleChar] : player;

  if (_isWastedRestore(item, target)) {
    addMsg(`${target.name} est déjà au maximum — ${item.name} serait gaspillé.`, '');
    return;
  }

  _applyConsumableEffect(item, target);
  // Messages dédiés anti-corruption (P7) + VFX d'ambiance léger (décision figée).
  if (item.effect === 'purge_corruption') {
    addMsg(`✨ ${item.name} — la corruption reflue (niveau ${spellCorruption}).`, 'magic');
    // VFX d'ambiance léger (décision P7) : volute cristalline d'éclaircissement.
    if (typeof DFX_safe !== 'undefined') DFX_safe.burst('game-container', 'water');
  } else if (item.effect === 'ward_charge') {
    addMsg(`🔰 ${item.name} — une garde mystique t'enveloppe (${wardCharges} charge${wardCharges > 1 ? 's' : ''}).`, 'magic');
  } else {
    addMsg(`${target.name} utilise : ${item.name}`, 'good');
  }
  // P9 — FX de consommation Premium : flash teinté par la Maison (premiumFx) +
  // stinger sonore, défensif. Réutilise _premiumEquipFlash (P2). No-op silencieux
  // hors-DOM (smoke file://).
  if (item.premium) {
    addMsg(`✨ <b>Élixir de prestige</b> — ${item.name}`, 'magic');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    if (typeof _premiumEquipFlash === 'function') _premiumEquipFlash(item.premiumFx);
  }
  // P10 — risque consenti : corruption + contrecoup borné, absorbés par une
  // charge d'Immunité si disponible. Après l'effet (et son recalc).
  _applyConsumptionRisk(item, target);
  _consumeAt(idx, 1);

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
    if (_isWastedRestore(item, target)) {
      addMsg(`${target.name} est déjà au maximum — ${item.name} serait gaspillé.`, '');
      return;
    }
    _applyConsumableEffect(item, target);
    addMsg(`${target.name} utilise : ${item.name}`, 'good');
    _consumeAt(inventoryIdx, 1);
    updateUI();
    openCharacter(charIdx);
    return;
  }

  if (item.type === 'spellbook') {
    if (_teachSpellToOne(item.spell, charIdx)) {
      AudioSystem.playLevelUp();
      AudioSystem.speakSpell(item.spell);
      addMsg(`${getSpellIconHtml(item.spell, 'ui-icon-md')} ${target.name} apprend : ${item.spell} !`, 'magic');
      _removeInvItem(inventoryIdx);
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

