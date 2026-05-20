// ============================================================
// MISE À JOUR DE L'INTERFACE
// ============================================================

// Synchronise les éléments UI dépendants de `partySize` (carte
// d'Hermione + indicateur de tour combat). Centralisé pour éviter les
// 3 copies historiques dans main.js, ui.js et save-ui.js.
function applyPartyMode() {
  const hidden = (partySize === 1) ? 'none' : '';
  const card1     = document.getElementById('char-card-1');
  const indicator = document.getElementById('battle-char-indicator');
  if (card1)     card1.style.display     = hidden;
  if (indicator) indicator.style.display = hidden;
}

function updateUI() {
  // ── Harry (party[0]) ────────────────────────────────────────
  _updateCharBar(0);

  // ── Hermione (party[1]) ─────────────────────────────────────
  _updateCharBar(1);

  // ── XP rapatriée dans chaque party-card (P3) ────────────────
  const xpPct = Math.max(0, Math.min(100, player.xp / player.xpNext * 100));
  for (let i = 0; i < 2; i++) {
    const lbl = document.getElementById(`xp-label-${i}`);
    const txt = document.getElementById(`xp-text-${i}`);
    const bar = document.getElementById(`xp-bar-${i}`);
    if (lbl) lbl.textContent  = `Niv.${player.level} — XP`;
    if (txt) txt.textContent  = `${player.xp}/${player.xpNext}`;
    if (bar) bar.style.width  = xpPct + '%';
  }
  document.getElementById('gold-display').innerHTML = `<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${player.gold} Gallions`;
  const floorEl = document.getElementById('ghd-floor');
  if (floorEl && typeof currentFloor === 'number') floorEl.textContent = `ÉT.${currentFloor}`;

  // ── Stats de Harry (panneau gauche) ─────────────────────────
  document.getElementById('s-str').textContent = player.str;
  document.getElementById('s-int').textContent = player.int;
  document.getElementById('s-agi').textContent = player.agi;
  document.getElementById('s-lck').textContent = player.lck;
  document.getElementById('s-mag').textContent = player.mag;
  const sEnd = document.getElementById('s-end');
  if (sEnd) sEnd.textContent = player.end;

  // ── Équipement ───────────────────────────────────────────────
  document.getElementById('eq-wand').textContent  = player.wand  || '—';
  document.getElementById('eq-armor').textContent = player.armor || '—';
  document.getElementById('eq-acc').textContent   = player.acc   || '—';

  // ── Affichage selon partySize ────────────────────────────────
  applyPartyMode();

  // ── Anneaux header (XP gauche + Maison droite) ───────────────
  _updateXpWrap();
  _updateHouseBadge();

  // ── Statut KO sur les cartes ─────────────────────────────────
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (card) card.classList.toggle('ko-char', c.hp <= 0);
  });

  // ── Badge "points à allouer" sur le bouton Fiche ──────────────
  const badge = document.getElementById('char-alloc-badge');
  if (badge) {
    const total = party.slice(0, partySize)
      .reduce((s, c) => s + (c.unallocatedStatPoints || 0), 0);
    if (total > 0) {
      badge.textContent = total < 10 ? total : '▲';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  updateQuestTracker();
  updateRoomStatus();
}

// Étiquette courte (3-4 chars) inscrite dans le ruban du blason vivant.
// Suit le motif des paliers : « Apprenti Or » → OR, « Maître Argent » → ARG,
// « Légende »/« Mythe »/« Apothéose » → 3 premières lettres en capitales.
function _tierShortLabel(fullLabel) {
  if (!fullLabel) return '·';
  if (/ Or$/.test(fullLabel))      return 'OR';
  if (/ Argent$/.test(fullLabel))  return 'ARG';
  if (/ Bronze$/.test(fullLabel))  return 'BRZ';
  if (fullLabel === 'Légende')     return 'LÉG';
  if (fullLabel === 'Mythe')       return 'MYT';
  if (fullLabel === 'Apothéose')   return 'APO';
  return fullLabel.slice(0, 3).toUpperCase();
}

// Pose l'anneau XP radial autour de l'icône Poudlard, à GAUCHE du header.
// Symétrique du blason Maison à droite (un anneau de chaque côté).
// Le ratio est player.xp / player.xpNext, le ruban affiche « Niv.X ».
function _updateXpWrap() {
  const wrap = document.getElementById('xp-wrap');
  if (!wrap || typeof player === 'undefined') return;
  const max = Math.max(1, player.xpNext || 1);
  const ratio = Math.max(0, Math.min(1, (player.xp || 0) / max));
  wrap.style.setProperty('--xp-ratio', String(ratio));
  wrap.title = `Niveau ${player.level} · XP ${player.xp}/${player.xpNext}`;
  const tier = document.getElementById('xp-tier');
  if (tier) tier.textContent = `Niv.${player.level}`;
}

// Pose l'anneau XP radial + le ruban tier sur #crest-wrap.
// Lecture pure de chosenHouse / housePoints / houseTier ; écriture DOM seule.
function _updateCrestWrap() {
  const wrap = document.getElementById('crest-wrap');
  if (!wrap) return;
  if (!chosenHouse) { wrap.style.display = 'none'; return; }

  const h     = HOUSE_BONUSES[chosenHouse];
  const tiers = h.tiers;
  const nextTier      = tiers[houseTier]; // null si au max
  const prevThreshold = houseTier > 0 ? tiers[houseTier - 1].threshold : 0;
  const nextThreshold = nextTier ? nextTier.threshold : tiers[tiers.length - 1].threshold;
  const ratio = nextTier
    ? Math.max(0, Math.min(1, (housePoints - prevThreshold) / (nextThreshold - prevThreshold)))
    : 1;
  const tierFull  = houseTier > 0 ? tiers[houseTier - 1].label : null;
  const tierShort = _tierShortLabel(tierFull);

  wrap.style.display = '';
  wrap.style.setProperty('--crest-ratio', String(ratio));
  // Tooltip natif : ouvre la popup → texte explicite
  wrap.title = tierFull
    ? `${h.label} · ${tierFull} — ${housePoints}/${nextThreshold || housePoints} pts`
    : `${h.label} — Recrue`;

  const tierEl = document.getElementById('crest-tier');
  if (tierEl) tierEl.textContent = tierShort;

  // Garniture intérieure : clone du SVG du logo de Maison (existe dans
  // l'écran de sélection sous l'id `<house>-logo`).
  const inner = document.getElementById('crest-ring-inner');
  if (inner && !inner.dataset.house) {
    const svgEl = document.getElementById(chosenHouse.toLowerCase() + '-logo');
    if (svgEl) {
      const clone = svgEl.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      inner.innerHTML = '';
      inner.appendChild(clone);
      inner.dataset.house = chosenHouse;
    } else {
      inner.textContent = h.emoji || '🏰';
    }
  }
}

// Décrit le bonus d'un palier sous une forme courte affichable.
function _houseTierBonusText(tier) {
  if (!tier || !tier.bonus) return '';
  const b = tier.bonus;
  if (b.item) {
    const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(x => x.id === b.item) : null;
    return it ? `🎁 ${it.name}` : `🎁 ${b.item}`;
  }
  if (b.spell) return `📖 ${b.spell}`;
  const parts = [];
  if (b._baseAtk) parts.push(`+${b._baseAtk} ATK`);
  if (b._baseDef) parts.push(`+${b._baseDef} DEF`);
  if (b._baseMag) parts.push(`+${b._baseMag} MAG`);
  if (b._baseLck) parts.push(`+${b._baseLck} LCK`);
  return parts.join(' · ');
}

// Popup détail Maison (P4). Lecture pure de chosenHouse / housePoints /
// houseTier / pendingHouseRewards ; écriture DOM dans #house-detail-content.
function openHouseDetail() {
  const modal = document.getElementById('house-detail-modal');
  if (!modal) return;
  if (!chosenHouse) {
    if (typeof addMsg === 'function') addMsg('Aucune Maison choisie.', 'magic');
    return;
  }

  const h     = HOUSE_BONUSES[chosenHouse];
  const tiers = h.tiers;
  const nextTier = tiers[houseTier];
  const prevThreshold = houseTier > 0 ? tiers[houseTier - 1].threshold : 0;
  const nextThreshold = nextTier ? nextTier.threshold : tiers[tiers.length - 1].threshold;
  const ratio = nextTier
    ? Math.max(0, Math.min(1, (housePoints - prevThreshold) / (nextThreshold - prevThreshold)))
    : 1;
  const currentLabel = houseTier > 0 ? tiers[houseTier - 1].label : 'Recrue';

  // Titre
  const titleEl = document.getElementById('house-detail-modal-title');
  if (titleEl) titleEl.innerHTML = `${h.emoji} ${h.label}`;

  // Crest clone — réutilise le SVG <house>-logo de l'écran de sélection.
  const svgEl = document.getElementById(chosenHouse.toLowerCase() + '-logo');
  const crestHtml = svgEl
    ? svgEl.outerHTML.replace(/id="[^"]+"/, '').replace(/width="\d+"/, 'width="96"').replace(/height="\d+"/, 'height="96"')
    : `<div style="font-size:64px">${h.emoji}</div>`;

  // Liste des paliers
  const rowsHtml = tiers.map((t, i) => {
    const reached = housePoints >= t.threshold;
    const isCurrentGoal = !reached && (i === houseTier);
    const marker = reached ? '✓' : isCurrentGoal ? '►' : '·';
    const markerColor = reached
      ? 'var(--gold-light)'
      : isCurrentGoal ? 'var(--gold)' : '#6a5030';
    const opacity = reached ? '1' : isCurrentGoal ? '1' : '0.55';
    const pendingMark = (t.bonus && t.bonus.item
      && typeof pendingHouseRewards !== 'undefined'
      && pendingHouseRewards.has(t.bonus.item))
      ? ' <span style="color:#f0c060;font-size:10px;letter-spacing:1px">EN ATTENTE</span>'
      : '';
    return `
      <li class="hd-tier-row" data-reached="${reached}" data-goal="${isCurrentGoal}"
          style="opacity:${opacity}">
        <span class="hd-tier-marker" style="color:${markerColor}">${marker}</span>
        <span class="hd-tier-label">${t.label}</span>
        <span class="hd-tier-threshold">${t.threshold} pts</span>
        <span class="hd-tier-bonus">${_houseTierBonusText(t)}${pendingMark}</span>
      </li>`;
  }).join('');

  // Section récompenses en attente (gold-sink à réclamer auprès du chef de Maison)
  let pendingHtml = '';
  if (typeof pendingHouseRewards !== 'undefined' && pendingHouseRewards.size > 0) {
    const items = Array.from(pendingHouseRewards).map(id => {
      if (typeof ITEMS === 'undefined') return id;
      const it = ITEMS.find(x => x.id === id);
      return it ? it.name : id;
    });
    pendingHtml = `
      <div class="hd-pending">
        <div class="hd-section-title">🎁 Récompenses à réclamer</div>
        <div class="hd-pending-list">${items.join(' · ')}</div>
        <div class="hd-pending-hint">Rends-toi auprès du chef de Maison.</div>
      </div>`;
  }

  // Bonus de victoire
  const victoryMark = (typeof victoryAchieved !== 'undefined' && victoryAchieved)
    ? `<div class="hd-victory">🏆 Vainqueur de Voldemort</div>` : '';

  const goal = nextTier
    ? `<div class="hd-goal">Prochain palier : <strong>${nextTier.label}</strong> · ${housePoints}/${nextThreshold} pts</div>`
    : `<div class="hd-goal">Tous les paliers atteints — ${housePoints} pts</div>`;

  document.getElementById('house-detail-content').innerHTML = `
    <div class="hd-header">
      <div class="hd-crest">${crestHtml}</div>
      <div class="hd-meta">
        <div class="hd-tier-current">${currentLabel}</div>
        <div class="hd-desc">${h.desc || ''}</div>
        ${victoryMark}
      </div>
    </div>
    <div class="hd-progress">
      <div class="hd-progress-track">
        <div class="hd-progress-fill" style="width:${Math.round(ratio*100)}%;background:${h.accent}"></div>
      </div>
      ${goal}
    </div>
    ${pendingHtml}
    <div class="hd-section-title">📜 Paliers</div>
    <ul class="hd-tier-list">${rowsHtml}</ul>
  `;
  modal.style.display = 'flex';
}

function _updateHouseBadge() {
  // Depuis P4, le détail Maison vit dans la popup #house-detail-modal
  // (ouverte via le blason du header). Cette fonction ne pilote plus
  // qu'un seul affichage : le blason vivant du header.
  _updateCrestWrap();

  // L'ancien #house-crest de la sidebar est définitivement masqué — il
  // sera retiré du HTML dans une PR ultérieure.
  const crest = document.getElementById('house-crest');
  if (crest) crest.style.display = 'none';
}

function _updateCharBar(idx) {
  const c = party[idx];
  const hp = document.getElementById(`hp-text-${idx}`);
  const hb = document.getElementById(`hp-bar-${idx}`);
  const sp = document.getElementById(`sp-text-${idx}`);
  const sb = document.getElementById(`sp-bar-${idx}`);
  const nm = document.getElementById(`char-name-${idx}`);
  const cl = document.getElementById(`char-class-${idx}`);
  if (hp) hp.textContent   = `${Math.max(0, c.hp)}/${c.hpMax}`;
  if (hb) hb.style.width   = (Math.max(0, c.hp) / c.hpMax * 100) + '%';
  if (sp) sp.textContent   = `${c.sp}/${c.spMax}`;
  if (sb) sb.style.width   = (c.sp / c.spMax * 100) + '%';
  if (nm) nm.textContent   = c.name;
  if (cl) cl.textContent   = `${c.class} · Niv.${c.level}`;
  if (c.imgSrc) {
    const bg = document.getElementById(`pcard-bg-${idx}`);
    if (bg) {
      const want = `url("${c.imgSrc}")`;
      if (bg.style.backgroundImage !== want) bg.style.backgroundImage = want;
    }
    const med = document.getElementById(`pcard-medaillon-${idx}`);
    if (med && med.getAttribute('src') !== c.imgSrc) med.setAttribute('src', c.imgSrc);
  }
  const slot = document.getElementById(`status-slot-${idx}`);
  if (slot && typeof renderStatusBadges === 'function') slot.innerHTML = renderStatusBadges(c);

  // Mini-équipement party-card : 3 slots (arme + armure + amulette)
  const er = document.getElementById(`equip-row-${idx}`);
  if (er) {
    ['wand', 'body', 'amulet'].forEach(slotName => {
      const cell = er.querySelector(`.party-equip-slot[data-slot="${slotName}"]`);
      if (!cell) return;
      const item = c.equipped && c.equipped[slotName];
      const iconFn = (typeof getItemIconHtml === 'function')
                   ? getItemIconHtml
                   : null;
      const slotIconFn = (typeof getEquipmentSlotIconHtml === 'function')
                       ? getEquipmentSlotIconHtml
                       : null;
      if (item && iconFn) {
        cell.innerHTML = iconFn(item, 'ui-icon-sm');
        cell.title = `${item.name}`;
        cell.classList.add('filled');
      } else if (slotIconFn) {
        cell.innerHTML = slotIconFn(slotName, 'ui-icon-sm');
        cell.title = `${slotName} : vide`;
        cell.classList.remove('filled');
      } else {
        cell.innerHTML = '';
        cell.classList.remove('filled');
      }
    });
  }
}

function updateCompass() {
  // L'Ouest s'affiche avec l'ID `dir-o` côté HTML (la lettre O).
  const idByDir = { n:'dir-n', s:'dir-s', e:'dir-e', w:'dir-o' };
  ['n','s','e','w'].forEach(d => {
    const el = document.getElementById(idByDir[d]);
    if (!el) return;
    const [dx, dy] = DIRECTIONS[d];
    const nx = playerX + dx, ny = playerY + dy;
    const free = nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && dungeon[ny][nx] !== CELL.WALL;
    el.classList.toggle('active', free);
    el.classList.toggle('facing', d === playerDir);
  });
}

function setNarrative(text) {
  document.getElementById('narrative-panel').textContent = text;
}

// ── Mini suivi de quêtes (panneau droit) ─────────────────────
function updateQuestTracker() {
  const el = document.getElementById('quest-tracker');
  if (!el) return;
  const pending = activeQuests.filter(q => !q.completed);
  if (!pending.length) {
    el.innerHTML = '<div class="quest-tracker-empty">Aucune quête active</div>';
    return;
  }
  el.innerHTML = pending.map(q => {
    const step = (typeof getActiveStep === 'function') ? getActiveStep(q) : (q.objectives || []).find(o => !o.completed);
    if (!step) return '';
    let prog = '', pct = 0;
    if (step.type === 'kill') {
      pct = Math.min(1, step.progress / step.amount);
      prog = `${step.progress}/${step.amount}`;
    } else {
      const count = (player.inventory || []).filter(i => i.id === step.itemId).length;
      pct = Math.min(1, count / step.amount);
      prog = `${count}/${step.amount}`;
    }
    const barW = Math.round(pct * 100);
    return `<div style="background:#0a0705;border:1px solid #2a1a08;border-radius:3px;padding:5px 6px;">
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold-light);letter-spacing:0.5px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${q.title}">${q.title}</div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#6a5030;margin-bottom:3px;">
        <span>${q.giver}</span><span style="color:#8a7050">${prog}</span>
      </div>
      <div style="background:#1a0f05;border-radius:1px;height:3px;overflow:hidden;">
        <div style="width:${barW}%;height:100%;background:var(--gold-dark);transition:width .4s ease;"></div>
      </div>
    </div>`;
  }).join('');
}

// ── Indicateur de salle (panneau droit) ──────────────────────
function updateRoomStatus() {
  const el = document.getElementById('room-status');
  if (!el || !dungeon) return;
  if (typeof searchedCells === 'undefined') return;
  const cell = dungeon[playerY] && dungeon[playerY][playerX];
  const searched = (typeof _searchCellStatus === 'function')
    && _searchCellStatus(`${playerX},${playerY}`).state === 'recharging';
  let label = '— COULOIR —';
  if (cell === CELL.CHEST)    label = '📦 COFFRE';
  else if (cell === CELL.SHOP)    label = '🏪 BOUTIQUE';
  else if (cell === CELL.STAIRS_D) label = '⬇ DESCENTE';
  else if (cell === CELL.STAIRS_U) label = '⬆ MONTÉE';
  const searchTag = searched ? ' <span style="color:#4a3010">✓ Fouillé</span>' : '';
  el.innerHTML = label + searchTag;
}

function updateLocationDisplay() {
  const locIdx = Math.min(currentFloor - 1, LOCATIONS.length - 1);
  document.getElementById('loc-display').textContent = `${LOCATIONS[locIdx]} — Niveau ${currentFloor}`;
}

function addMsg(text, type = '') {
  const log = document.getElementById('msg-log');
  const div = document.createElement('div');
  div.className = `msg-item ${type}`;
  // innerHTML pour permettre <img> des items/sorts. Tous les appelants
  // construisent des templates contrôlés (pas d'input user).
  div.innerHTML = text;
  log.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// ============================================================
// MODALES
// ============================================================

function closeModal(id) { const el = safeEl(id); if (el) el.style.display = 'none'; }

// ── Rendu de la grille d'équipement (fiche perso) ────────────
// 11 slots étendus, ordre stable. Chaque ligne = icône slot ou icône
// item équipé + nom. Les slots vides retombent sur l'icône slot
// générique via getEquipmentSlotIconHtml().
const EQUIP_SLOT_LABELS = [
  ['wand',    'Baguette'],
  ['head',    'Tête'],
  ['body',    'Armure'],
  ['hands',   'Gants'],
  ['feet',    'Bottes'],
  ['cloak',   'Cape'],
  ['amulet',  'Amulette'],
  ['ring1',   'Anneau ◀'],
  ['ring2',   'Anneau ▶'],
  ['belt',    'Ceinture'],
  ['trinket', 'Bibelot']
];

const EQUIP_SLOT_LABELS_MAP = Object.fromEntries(EQUIP_SLOT_LABELS);

// Slots du paper doll. Classes conservées (.equip-slot-floating +
// equip-slot-${slot}) pour la compatibilité du smoke test. En v2 le
// positionnement est en flex/grid via .paper-doll-col / .paper-doll-bottom
// dans style.css — plus de position:absolute.
function _renderPaperDollSlot(slot, c, charIdx) {
  const item = c.equipped && c.equipped[slot];
  const icon = item
    ? getItemIconHtml(item, 'ui-icon')
    : getEquipmentSlotIconHtml(slot, 'ui-icon');
  const filled    = !!item;
  const rarityCls = item && item.rarity ? `rarity-${item.rarity}` : '';
  const baseLabel = EQUIP_SLOT_LABELS_MAP[slot] || slot;
  const titleAttr = item ? `${item.name} — cliquer pour déséquiper` : baseLabel;
  const onclick   = (item && Number.isInteger(charIdx))
    ? `onclick="unequipFromSlot(${charIdx}, '${slot}')"`
    : '';
  const tooltipHtml = item
    ? _renderItemTooltip(item, baseLabel, 'cliquer pour déséquiper')
    : '';
  return `<div class="equip-slot-floating equip-slot-${slot} ${filled ? 'filled' : 'empty'} ${rarityCls}"
               title="${titleAttr.replace(/"/g, '&quot;')}" ${onclick}>${icon}${tooltipHtml}</div>`;
}

// Badge pour un sort connu. Cherche l'icône PNG sous img/icons/spells/
// (slug normalisé du nom). Fallback emoji si l'image n'existe pas.
function _renderSpellBadge(spellName) {
  const slug = String(spellName)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const path = `img/icons/spells/${slug}.png`;
  return `<span class="spell-badge">
    <span class="icon"><img src="${path}" alt="" onerror="this.style.display='none'"></span>
    ${spellName}
  </span>`;
}

// Slot d'inventaire pour la grille du sac. Cliquer un item :
// - consommable → applique sur charIdx
// - équipement  → equipItem(idx, charIdx) (anneau routé ring1/ring2)
// - livre sort  → enseigne au groupe
function _renderInvSlot(item, idx, charIdx) {
  if (!item) return `<div class="inv-slot"></div>`;
  const rarityCls = item.rarity ? `rarity-${item.rarity}` : '';
  const icon = getItemIconHtml(item, 'ui-icon');
  let actionHint = 'utiliser';
  if (item.type === 'consumable')      actionHint = 'consommer';
  else if (item.type === 'spellbook')  actionHint = 'apprendre';
  else if (item.slot)                  actionHint = 'équiper';
  const titleAttr = `${item.name} — cliquer pour ${actionHint}`.replace(/"/g, '&quot;');
  const onclick = Number.isInteger(charIdx)
    ? `onclick="useItemFromChar(${idx}, ${charIdx})"`
    : '';
  const tooltipHtml = _renderItemTooltip(item, null, `cliquer pour ${actionHint}`);
  return `<div class="inv-slot has-item ${rarityCls}" title="${titleAttr}" ${onclick}>${icon}${tooltipHtml}</div>`;
}

// Tooltip riche affiché au hover sur un slot rempli (paper-doll OU sac).
// Affiche : nom (coloré selon rareté), type/slot, bonus, regen, grantsSpell,
// description, prix. Tout est calculé depuis les champs de l'item.
function _renderItemTooltip(item, slotLabel, action) {
  if (!item) return '';
  const rarity = item.rarity || 'common';
  const rarityLabel = { common:'Commun', rare:'Rare', epic:'Épique', legendary:'Légendaire' }[rarity] || rarity;
  const slotName = slotLabel || EQUIP_SLOT_LABELS_MAP[item.slot] || (
    item.type === 'consumable' ? 'Consommable' :
    item.type === 'spellbook'  ? 'Livre de sort' : ''
  );
  const bonuses = [];
  if (item.bonusAtk) bonuses.push(`+${item.bonusAtk} Attaque`);
  if (item.bonusDef) bonuses.push(`+${item.bonusDef} Défense`);
  if (item.bonusMag) bonuses.push(`+${item.bonusMag} Magie`);
  if (item.bonusLck) bonuses.push(`+${item.bonusLck} Chance`);
  if (item.bonusStr) bonuses.push(`+${item.bonusStr} Force`);
  if (item.bonusInt) bonuses.push(`+${item.bonusInt} Intelligence`);
  if (item.bonusAgi) bonuses.push(`+${item.bonusAgi} Agilité`);
  if (item.bonusEnd) bonuses.push(`+${item.bonusEnd} Endurance`);
  if (item.regenHp)  bonuses.push(`+${item.regenHp} PV / tour`);
  if (item.regenSp)  bonuses.push(`+${item.regenSp} PM / tour`);
  if (item.grantsSpell) bonuses.push(`Apprend : ${item.grantsSpell}`);
  if (item.spell)        bonuses.push(`Enseigne : ${item.spell}`);

  const bonusLines = bonuses.map(b => `<span class="tt-bonus">${b}</span>`).join('');
  const desc = item.desc ? `<span class="tt-desc">${item.desc}</span>` : '';
  const actionLine = action ? `<span class="tt-action">→ ${action}</span>` : '';

  return `<div class="item-tooltip" role="tooltip">
    <span class="tt-name">${item.name}</span>
    <span class="tt-rarity rarity-${rarity}">${rarityLabel}${slotName ? ' · ' + slotName : ''}</span>
    ${bonusLines}
    ${desc}
    ${actionLine}
  </div>`;
}

// Une ligne de stat dans le panneau gauche.
function _renderStatLine(iconPath, label, value, derived = false) {
  return `<div class="stat-line${derived ? ' derived' : ''}">
            <img class="ui-icon ui-icon-md" src="${iconPath}" alt="">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
          </div>`;
}

// Construit la valeur affichée d'une stat avec son bonus.
// Ex: base 8, total 12 → "8 <span class='stat-bonus'>+4</span>"
//     base 9, total 9  → "9"
// Si _base${Key} n'existe pas (cas legacy), on tombe sur le total tel quel.
function _renderStatValueWithBonus(c, key, baseKey) {
  const total = c[key];
  if (total == null) return '—';
  const base  = c[baseKey];
  if (base == null || base === total) return String(total);
  const bonus = total - base;
  if (bonus <= 0) return String(total);
  return `${base} <span class="stat-bonus">+${bonus}</span>`;
}

// ── Encart Set Maison sur la fiche perso (Étape 5 Maisons 2.0) ──
// Affiche les 4 médaillons du set de la Maison choisie + l'état de
// chaque pièce (équipée / au sac / en attente chez le Chef / à
// découvrir) + la grille de bonus 2/3/4 pièces avec les paliers
// futurs grisés. Cf. .claude/plans/houses-2.0.md §B.
const _SET_PIECE_STATE_LABELS = {
  equipped: 'équipée',
  in_inv:   'au sac',
  pending:  'en attente chez le Chef de Maison',
  missing:  'à découvrir'
};

function _setPieceState(itemId, c) {
  const equipped = c && c.equipped &&
    Object.values(c.equipped).some(it => it && it.id === itemId);
  if (equipped) return 'equipped';
  const inInv = (player.inventory || []).some(it => it && it.id === itemId);
  if (inInv) return 'in_inv';
  const pending = (typeof pendingHouseRewards !== 'undefined') &&
    pendingHouseRewards.has(itemId);
  if (pending) return 'pending';
  return 'missing';
}

function _formatSetBonus(b) {
  if (!b) return '';
  const parts = [];
  if (b.bonusAtk)            parts.push(`+${b.bonusAtk} ATK`);
  if (b.bonusDef)            parts.push(`+${b.bonusDef} DEF`);
  if (b.bonusMag)            parts.push(`+${b.bonusMag} MAG`);
  if (b.bonusLck)            parts.push(`+${b.bonusLck} LCK`);
  if (b.bonusStr)            parts.push(`+${b.bonusStr} FOR`);
  if (b.bonusInt)            parts.push(`+${b.bonusInt} INT`);
  if (b.bonusAgi)            parts.push(`+${b.bonusAgi} AGI`);
  if (b.bonusEnd)            parts.push(`+${b.bonusEnd} END`);
  if (b.bonusCritChance)     parts.push(`+${b.bonusCritChance}% crit`);
  if (b.bonusCritDamage)     parts.push(`+${Math.round(b.bonusCritDamage*100)}% dég. crit`);
  if (b.bonusSpellCritChance)parts.push(`+${b.bonusSpellCritChance}% crit sort`);
  if (b.bonusSpellCritDamage)parts.push(`+${Math.round(b.bonusSpellCritDamage*100)}% dég. crit sort`);
  if (b.bonusDodgeChance)    parts.push(`+${b.bonusDodgeChance}% esquive`);
  if (b.regenHp)             parts.push(`+${b.regenHp} PV/tour`);
  if (b.regenSp)             parts.push(`+${b.regenSp} PM/tour`);
  if (b.spellLifesteal)      parts.push(`drain ${Math.round(b.spellLifesteal*100)}% sur sort`);
  if (b.spellCostReduction)  parts.push(`-${Math.round(b.spellCostReduction*100)}% coût sort`);
  if (b.immuneDisarm)        parts.push('immunité désarmement');
  return parts.join(' · ') || '—';
}

function _renderHouseSetPanel(c) {
  if (typeof chosenHouse === 'undefined' || !chosenHouse) return '';
  if (typeof HOUSE_SETS === 'undefined') return '';
  const set = HOUSE_SETS[chosenHouse];
  if (!set) return '';

  const cells = set.pieceIds.map((id, i) => {
    const item  = ITEMS.find(it => it.id === id);
    const state = _setPieceState(id, c);
    const label = _SET_PIECE_STATE_LABELS[state] || '';
    const icon  = item ? getItemIconHtml(item, 'ui-icon-md') : '';
    const name  = item ? item.name : id;
    const tip   = item ? `${name} — ${label}<br>${item.desc || ''}` : '';
    return `
      <div class="set-cell set-cell-${state}" data-tooltip="${tip}">
        <div class="set-cell-icon">${icon}</div>
        <div class="set-cell-num">${i + 1}/4</div>
      </div>
    `;
  }).join('');

  const count = c['_' + set.setKey + 'Count'] | 0;
  const tiers = [
    { n: 2, b: set.setBonus2 },
    { n: 3, b: set.setBonus3 },
    { n: 4, b: set.setBonus4 }
  ];
  const bonusRows = tiers.map(({n, b}) => {
    const active = count >= n;
    return `<div class="set-bonus-row ${active ? 'active' : 'inactive'}">
      <span class="set-bonus-tier">${n}/4</span>
      <span class="set-bonus-text">${_formatSetBonus(b)}</span>
    </div>`;
  }).join('');

  return `
    <div class="section section-houseset">
      <button class="section-toggle" onclick="_toggleCharSection(this)">Set Maison</button>
      <div class="panel-title">⸻ ${set.setLabel.toUpperCase()} (${count}/4) ⸻</div>
      <div class="set-cells">${cells}</div>
      <div class="set-bonuses">${bonusRows}</div>
    </div>
  `;
}

// Fiche de personnage v2 — grid-template-areas :
//   "stats equip"
//   "stats spells"
//   "stats inv"
// Stats prend les 3 rows à gauche. Équipement / Sortilèges / Sac
// s'empilent à droite — plus de gap structurel parasite.
// Paper-doll : flex column avec une paper-doll-main (3 cols [50px][auto][50px])
// et une paper-doll-bottom (rangée wand/belt/trinket). Stage carré contraint
// par les 4 slots latéraux via align-items:stretch.
function openCharacter(charIdx = 0) {
  // En mode solo, partySize=1 → on borne charIdx à 0 même si l'appel
  // demande Hermione (peut arriver via état legacy ou bouton resté affiché).
  if (charIdx >= partySize) charIdx = 0;
  const c      = party[charIdx];
  const detail = document.getElementById('char-detail');

  // Onglets : un seul perso visible en solo, deux en duo.
  const tabs = party.slice(0, partySize).map((p, i) =>
    `<button class="cmd-btn" style="font-size:10px;${i === charIdx ? 'border-color:var(--gold)' : ''}" onclick="openCharacter(${i})">${p.icon} ${p.name.split(' ')[0]}</button>`
  ).join('');

  // Bouton « Mon rang » : ouvre le Hall of Fame avec une simulation du
  // run en cours. Réservé au mode Ironman (seul mode classé).
  const hofProjBtn = (typeof ironmanMode !== 'undefined' && ironmanMode)
    ? `<button class="cmd-btn" style="font-size:10px;margin-left:auto"`
      + ` onclick="openHofProjection()">🏆 Mon rang</button>`
    : '';

  const xpPct = Math.max(0, Math.min(100, Math.floor((player.xp / Math.max(1, player.xpNext)) * 100)));

  // Slots regroupés par zone visuelle du paper-doll.
  const slotsLeft   = ['head','body','hands','feet']  .map(s => _renderPaperDollSlot(s, c, charIdx)).join('');
  const slotsRight  = ['cloak','amulet','ring1','ring2'].map(s => _renderPaperDollSlot(s, c, charIdx)).join('');
  const slotsBottom = ['wand','belt','trinket']        .map(s => _renderPaperDollSlot(s, c, charIdx)).join('');

  const critMult  = (c.critMultiplier != null) ? c.critMultiplier : 1.5;
  const sCritMult = (c.spellCritMultiplier != null) ? c.spellCritMultiplier : 1.5;
  const critPct      = (c.critChance != null)
    ? `${Math.round(c.critChance)}% ×${critMult.toFixed(2)}` : '—';
  const spellCritPct = (c.spellCritChance != null)
    ? `${Math.round(c.spellCritChance)}% ×${sCritMult.toFixed(2)}` : '—';
  const dodgePct = (c.dodgeChance != null) ? `${Math.round(c.dodgeChance)}%` : '—';

  // Panneau d'allocation : visible uniquement si des points sont en attente.
  const statPts = c.unallocatedStatPoints || 0;
  const allocPanel = statPts > 0 ? _renderStatAllocPanel(charIdx, statPts) : '';

  // Panneau Set Maison : visible uniquement si une Maison est choisie.
  // Cf. .claude/plans/houses-2.0.md §B (Étape 5) — encart 4 médaillons +
  // bonus paliers 2/3/4 pièces.
  const houseSetPanel = _renderHouseSetPanel(c);

  // Sortilèges sous forme de badges PNG. c.spells = liste de noms.
  const spellsHtml = (c.spells || []).map(_renderSpellBadge).join('');

  // Sac : grille fixe 16 slots (INVENTORY_MAX). Items + slots vides.
  const inv = player.inventory || [];
  let invHtml = '';
  for (let i = 0; i < 16; i++) invHtml += _renderInvSlot(inv[i], i, charIdx);

  detail.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center">${tabs}${hofProjBtn}</div>
    <div class="char-grid">

      <!-- Stats (grid-area:stats) -->
      <div class="section section-stats char-stats-panel">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Statistiques</button>
        <div class="level-banner">
          <div class="lvl">${c.name.split(' ')[0]} — Niveau ${c.level}</div>
          <div style="font-size:10px;color:#8a7050;margin-top:2px">${c.class}</div>
          <div class="xp-bar"><span style="width:${xpPct}%"></span></div>
          <div style="font-size:9px;color:#6a5030;margin-top:2px">XP ${player.xp}/${player.xpNext}</div>
        </div>
        ${allocPanel}
        ${_renderStatLine('img/icons/hp.png',  'Vie',         `${c.hp}/${c.hpMax}`)}
        ${_renderStatLine('img/icons/mp.png',  'Mana',        `${c.sp}/${c.spMax}`)}
        ${_renderStatLine('img/icons/atk.png', 'Attaque',     _renderStatValueWithBonus(c, 'atk', '_baseAtk'))}
        ${_renderStatLine('img/icons/def.png', 'Défense',     _renderStatValueWithBonus(c, 'def', '_baseDef'))}
        ${_renderStatLine('img/icons/mag.png', 'Magie',       _renderStatValueWithBonus(c, 'mag', '_baseMag'))}
        ${_renderStatLine('img/icons/str.png', 'Force',       _renderStatValueWithBonus(c, 'str', '_baseStr'))}
        ${_renderStatLine('img/icons/int.png', 'Intelligence',_renderStatValueWithBonus(c, 'int', '_baseInt'))}
        ${_renderStatLine('img/icons/agi.png', 'Agilité',     _renderStatValueWithBonus(c, 'agi', '_baseAgi'))}
        ${_renderStatLine('img/icons/xp.png',  'Chance',      _renderStatValueWithBonus(c, 'lck', '_baseLck'))}
        ${_renderStatLine('img/icons/atk.png', 'Critique',    critPct,      true)}
        ${_renderStatLine('img/icons/mag.png', 'Crit. sort',  spellCritPct, true)}
        ${_renderStatLine('img/icons/agi.png', 'Esquive',     dodgePct,     true)}
      </div>

      <!-- Équipement (grid-area:equip) -->
      <div class="section section-equip">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Équipement</button>
        <div class="paper-doll">
          <div class="paper-doll-main">
            <div class="paper-doll-col left">${slotsLeft}</div>
            <div class="paper-doll-stage">
              <img class="pd-portrait" src="${c.imgSrc || ''}" alt="${c.name}">
            </div>
            <div class="paper-doll-col right">${slotsRight}</div>
          </div>
          <div class="paper-doll-bottom">${slotsBottom}</div>
          <div class="gold-banner">
            <img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${player.gold}
          </div>
        </div>
      </div>

      ${houseSetPanel}

      <!-- Sortilèges (grid-area:spells) -->
      <div class="section section-spells char-spells-panel">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Sortilèges</button>
        <div class="panel-title">⸻ SORTILÈGES CONNUS ⸻</div>
        <div class="spells-row">${spellsHtml}</div>
      </div>

      <!-- Sac (grid-area:inv) -->
      <div class="section section-inv">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Sac</button>
        <div class="panel-title">⸻ SAC — ${inv.length} / 16 ⸻</div>
        <div class="inv-grid">${invHtml}</div>
      </div>

    </div>
  `;
  document.getElementById('character-modal').style.display = 'flex';
}

// Accordéon mobile de la fiche perso : plie / déplie une section.
// Le bouton .section-toggle n'est cliquable qu'en ≤700px (masqué en
// desktop via CSS) ; en desktop les 3 zones restent toujours visibles.
function _toggleCharSection(btn) {
  if (btn && btn.parentElement) btn.parentElement.classList.toggle('collapsed');
}

// ── Allocation de points de stats libres (Phase 3 — UX) ─────
// Bandeau inséré dans openCharacter quand `c.unallocatedStatPoints > 0`.
// Chaque bouton consomme 1 point et applique l'effet via allocateStatPoint().
function _renderStatAllocPanel(charIdx, points) {
  const keys = ['STR', 'INT', 'AGI', 'END', 'LCK'];
  const labels = { STR: '+1 ATK', INT: '+1 INT', AGI: '+1 AGI',
                   END: '+5 PV',  LCK: '+1 LCK' };
  const buttons = keys.map(k =>
    `<button class="cmd-btn alloc-btn"
       onclick="allocateStatPoint(${charIdx}, '${k}')">${k}<br>
       <span class="alloc-btn-effect">${labels[k]}</span></button>`
  ).join('');
  return `
    <div class="alloc-panel">
      <div class="alloc-panel-title">
        ▲ ${points} POINT${points > 1 ? 'S' : ''} À ALLOUER
      </div>
      <div class="alloc-buttons-row">${buttons}</div>
    </div>`;
}

// Applique 1 point sur la stat choisie, via le mapping STAT_POINT_EFFECTS.
// Mute `_baseX` (ou `_baseHpMax`/`_baseSpMax`) — recalculateStats régénère
// les stats effectives en intégrant l'équipement. Re-render la fiche pour
// montrer le total restant.
function allocateStatPoint(charIdx, statKey) {
  if (charIdx >= partySize) charIdx = 0;
  const c = party[charIdx];
  if (!c) return;
  if ((c.unallocatedStatPoints || 0) <= 0) return;
  const eff = (typeof STAT_POINT_EFFECTS !== 'undefined') ? STAT_POINT_EFFECTS[statKey] : null;
  if (!eff) return;
  if (eff.baseAtk) c._baseAtk = (c._baseAtk || 0) + eff.baseAtk;
  if (eff.baseDef) c._baseDef = (c._baseDef || 0) + eff.baseDef;
  if (eff.baseMag) c._baseMag = (c._baseMag || 0) + eff.baseMag;
  if (eff.baseLck) c._baseLck = (c._baseLck || 0) + eff.baseLck;
  if (eff.baseStr) c._baseStr = (c._baseStr || c.str || 0) + eff.baseStr;
  if (eff.baseInt) c._baseInt = (c._baseInt || c.int || 0) + eff.baseInt;
  if (eff.baseAgi) c._baseAgi = (c._baseAgi || c.agi || 0) + eff.baseAgi;
  if (eff.baseEnd) c._baseEnd = (c._baseEnd || c.end || 0) + eff.baseEnd;
  if (eff.hpMax)   { c._baseHpMax = (c._baseHpMax ?? c.hpMax) + eff.hpMax; c.hp += eff.hpMax; }
  if (eff.spMax)   { c._baseSpMax = (c._baseSpMax ?? c.spMax) + eff.spMax; c.sp += eff.spMax; }
  c.unallocatedStatPoints--;
  if (typeof recalculateStats === 'function') recalculateStats();
  if (typeof updateUI === 'function') updateUI();
  openCharacter(charIdx);
}

// Bestiaire (openBestiary, filterBestiary, showMonsterDetail, etc.) → ui-bestiary.js

// ── Changement de difficulté en cours de partie ──────────────
function changeDifficulty() {
  // Mode Ironman : la difficulté est verrouillée pour toute la partie.
  if (typeof ironmanMode !== 'undefined' && ironmanMode) {
    if (typeof addMsg === 'function') {
      addMsg("Difficulté verrouillée — mode Ironman.", 'bad');
    }
    return;
  }
  const detail = document.getElementById('char-detail');
  if (!detail) return;

  const levels = ['Facile', 'Normal', 'Difficile', 'Expert'];
  const icons  = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' };
  const descs  = {
    Facile:    'Moins d\'ennemis, plus de ressources',
    Normal:    'Difficulté de référence',
    Difficile: 'Plus d\'ennemis, scaling accru',
    Expert:    'Mode survie — très dur'
  };

  const buttons = levels.map(lvl => `
    <button class="cmd-btn" onclick="applyDifficulty('${lvl}')"
      style="width:100%;margin-bottom:6px;
             ${lvl === difficulty ? 'border-color:var(--gold);color:var(--gold-light)' : ''}">
      ${icons[lvl]} ${lvl}
      <span style="font-size:10px;color:#8a7050;display:block;margin-top:2px">${descs[lvl]}</span>
    </button>`).join('');

  detail.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold);text-align:center;margin-bottom:12px;letter-spacing:2px">
      ⚙️ DIFFICULTÉ
    </div>
    <div style="font-size:11px;color:#8a7050;text-align:center;margin-bottom:14px">
      Actuelle : <strong style="color:var(--gold)">${icons[difficulty]} ${difficulty}</strong>
    </div>
    <div>${buttons}</div>
    <div style="font-size:10px;color:#4a3a20;text-align:center;margin-top:10px;font-style:italic">
      Le changement s'applique immédiatement (sauf HP de départ)
    </div>`;
  document.getElementById('character-modal').style.display = 'flex';
}

window.applyDifficulty = function(lvl) {
  if (!DIFFICULTY_SETTINGS[lvl]) return;
  difficulty = lvl;
  const icons = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' };
  addMsg(`${icons[lvl]} Difficulté : ${lvl}`, lvl === 'Expert' ? 'bad' : 'magic');
  closeModal('character-modal');
};
