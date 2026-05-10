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

  // ── XP et or partagés ───────────────────────────────────────
  document.getElementById('xp-label').innerHTML = `<img class="ui-icon ui-icon-sm" src="img/icons/xp.png" alt=""> Niv.${player.level} — XP`;
  document.getElementById('xp-text').textContent  = `${player.xp}/${player.xpNext}`;
  document.getElementById('xp-bar').style.width   = (player.xp / player.xpNext * 100) + '%';
  document.getElementById('gold-display').innerHTML = `<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${player.gold} Gallions`;

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

  // ── Badge de Maison ─────────────────────────────────────────
  _updateHouseBadge();

  // ── Statut KO sur les cartes ─────────────────────────────────
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (card) card.classList.toggle('ko-char', c.hp <= 0);
  });

  updateQuestTracker();
  updateRoomStatus();
}

function _updateHouseBadge() {
  const badge = document.getElementById('house-badge');
  if (!badge) return;

  // Blason dans le HUD
  const crest = document.getElementById('house-crest');
  if (crest) {
    if (!chosenHouse) {
      crest.style.display = 'none';
    } else {
      const svgEl = document.getElementById(chosenHouse.toLowerCase() + '-logo');
      if (svgEl) {
        crest.style.display = '';
        // Cloner le SVG et le réduire pour le HUD (60×70)
        const clone = svgEl.cloneNode(true);
        clone.removeAttribute('id');
        clone.setAttribute('width',  '60');
        clone.setAttribute('height', '70');
        crest.innerHTML = clone.outerHTML;
      }
    }
  }

  if (!chosenHouse) { badge.style.display = 'none'; return; }

  badge.style.display = '';
  const h     = HOUSE_BONUSES[chosenHouse];
  const tiers = h.tiers;

  // Trouver le seuil du prochain palier
  const nextTier = tiers[houseTier];  // houseTier = nombre de paliers atteints (0-4)
  const prevThreshold = houseTier > 0 ? tiers[houseTier - 1].threshold : 0;
  const nextThreshold = nextTier ? nextTier.threshold : tiers[tiers.length - 1].threshold;

  const pts    = housePoints;
  const pct    = nextTier
    ? Math.min(100, Math.round((pts - prevThreshold) / (nextThreshold - prevThreshold) * 100))
    : 100;
  const tierLabel = houseTier > 0 ? tiers[houseTier - 1].label : 'Recrue';

  document.getElementById('house-badge-label').textContent = `${h.emoji} ${h.label}`;
  document.getElementById('house-badge-tier').textContent  = tierLabel;
  document.getElementById('house-badge-bar').style.width   = pct + '%';
  document.getElementById('house-badge-bar').style.background = h.accent;
  document.getElementById('house-badge-pts').textContent   = nextTier
    ? `${pts} / ${nextThreshold} pts`
    : `${pts} pts — Palier max !`;
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
    const portrait = document.querySelector(`#char-card-${idx} .party-portrait-img`);
    if (portrait && portrait.getAttribute('src') !== c.imgSrc) {
      portrait.src = c.imgSrc;
      portrait.alt = c.name;
    }
  }
  const slot = document.getElementById(`status-slot-${idx}`);
  if (slot && typeof renderStatusBadges === 'function') slot.innerHTML = renderStatusBadges(c);
}

function updateCompass() {
  ['n','s','e','w'].forEach(d => {
    const el = document.getElementById(`dir-${d}`);
    if (!el) return;
    const [dx, dy] = DIRECTIONS[d];
    const nx = playerX + dx, ny = playerY + dy;
    const free = nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && dungeon[ny][nx] !== CELL.WALL;
    el.classList.toggle('active', free);
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
    el.innerHTML = '<div style="color:#3a2a10;font-style:italic;font-size:9px;text-align:center;padding-top:4px;">Aucune quête active</div>';
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
  const searched = searchedCells && searchedCells.has(`${playerX},${playerY}`);
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

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

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
function _renderPaperDollSlot(slot, c) {
  const item = c.equipped && c.equipped[slot];
  const icon = item
    ? getItemIconHtml(item, 'ui-icon')
    : getEquipmentSlotIconHtml(slot, 'ui-icon');
  const filled    = !!item;
  const rarityCls = item && item.rarity ? `rarity-${item.rarity}` : '';
  const tooltip   = item ? item.name : EQUIP_SLOT_LABELS_MAP[slot] || slot;
  return `<div class="equip-slot-floating equip-slot-${slot} ${filled ? 'filled' : 'empty'} ${rarityCls}"
               title="${tooltip.replace(/"/g, '&quot;')}">${icon}</div>`;
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

// Slot d'inventaire pour la grille du sac.
function _renderInvSlot(item) {
  if (!item) return `<div class="inv-slot"></div>`;
  const rarityCls = item.rarity ? `rarity-${item.rarity}` : '';
  const icon = getItemIconHtml(item, 'ui-icon');
  const tooltip = item.name.replace(/"/g, '&quot;');
  return `<div class="inv-slot has-item ${rarityCls}" title="${tooltip}">${icon}</div>`;
}

// Une ligne de stat dans le panneau gauche.
function _renderStatLine(iconPath, label, value, derived = false) {
  return `<div class="stat-line${derived ? ' derived' : ''}">
            <img class="ui-icon ui-icon-md" src="${iconPath}" alt="">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
          </div>`;
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
  const c      = party[charIdx];
  const detail = document.getElementById('char-detail');

  const tabs = party.map((p, i) =>
    `<button class="cmd-btn" style="font-size:10px;${i === charIdx ? 'border-color:var(--gold)' : ''}" onclick="openCharacter(${i})">${p.icon} ${p.name.split(' ')[0]}</button>`
  ).join('');

  const xpPct = Math.max(0, Math.min(100, Math.floor((player.xp / Math.max(1, player.xpNext)) * 100)));

  // Slots regroupés par zone visuelle du paper-doll.
  const slotsLeft   = ['head','body','hands','feet']  .map(s => _renderPaperDollSlot(s, c)).join('');
  const slotsRight  = ['cloak','amulet','ring1','ring2'].map(s => _renderPaperDollSlot(s, c)).join('');
  const slotsBottom = ['wand','belt','trinket']        .map(s => _renderPaperDollSlot(s, c)).join('');

  const critPct  = (c.critChance  != null) ? `${Math.round(c.critChance)}%`  : '—';
  const dodgePct = (c.dodgeChance != null) ? `${Math.round(c.dodgeChance)}%` : '—';

  // Sortilèges sous forme de badges PNG. c.spells = liste de noms.
  const spellsHtml = (c.spells || []).map(_renderSpellBadge).join('');

  // Sac : grille fixe 16 slots (INVENTORY_MAX). Items + slots vides.
  const inv = player.inventory || [];
  let invHtml = '';
  for (let i = 0; i < 16; i++) invHtml += _renderInvSlot(inv[i]);

  detail.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:10px">${tabs}</div>
    <div class="char-grid">

      <!-- Stats (grid-area:stats) -->
      <div class="section section-stats char-stats-panel">
        <div class="level-banner">
          <div class="lvl">${c.name.split(' ')[0]} — Niveau ${c.level}</div>
          <div style="font-size:10px;color:#8a7050;margin-top:2px">${c.class}</div>
          <div class="xp-bar"><span style="width:${xpPct}%"></span></div>
          <div style="font-size:9px;color:#6a5030;margin-top:2px">XP ${player.xp}/${player.xpNext}</div>
        </div>
        ${_renderStatLine('img/icons/hp.png',  'Vie',         `${c.hp}/${c.hpMax}`)}
        ${_renderStatLine('img/icons/mp.png',  'Mana',        `${c.sp}/${c.spMax}`)}
        ${_renderStatLine('img/icons/atk.png', 'Attaque',     c.atk)}
        ${_renderStatLine('img/icons/def.png', 'Défense',     c.def)}
        ${_renderStatLine('img/icons/mag.png', 'Magie',       c.mag)}
        ${_renderStatLine('img/icons/str.png', 'Force',       c.str)}
        ${_renderStatLine('img/icons/int.png', 'Intelligence',c.int)}
        ${_renderStatLine('img/icons/agi.png', 'Agilité',     c.agi)}
        ${_renderStatLine('img/icons/xp.png',  'Chance',      c.lck)}
        ${_renderStatLine('img/icons/atk.png', 'Critique',    critPct,  true)}
        ${_renderStatLine('img/icons/agi.png', 'Esquive',     dodgePct, true)}
      </div>

      <!-- Équipement (grid-area:equip) -->
      <div class="section section-equip">
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

      <!-- Sortilèges (grid-area:spells) -->
      <div class="section section-spells char-spells-panel">
        <div class="panel-title">⸻ SORTILÈGES CONNUS ⸻</div>
        <div class="spells-row">${spellsHtml}</div>
      </div>

      <!-- Sac (grid-area:inv) -->
      <div class="section section-inv">
        <div class="panel-title">⸻ SAC — ${inv.length} / 16 ⸻</div>
        <div class="inv-grid">${invHtml}</div>
      </div>

    </div>
  `;
  document.getElementById('character-modal').style.display = 'flex';
}

// Bestiaire (openBestiary, filterBestiary, showMonsterDetail, etc.) → ui-bestiary.js

// ── Changement de difficulté en cours de partie ──────────────
function changeDifficulty() {
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
