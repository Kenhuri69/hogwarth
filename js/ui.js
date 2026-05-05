// ============================================================
// MISE À JOUR DE L'INTERFACE
// ============================================================

function updateUI() {
  // ── Harry (party[0]) ────────────────────────────────────────
  _updateCharBar(0);

  // ── Hermione (party[1]) ─────────────────────────────────────
  _updateCharBar(1);

  // ── XP et or partagés ───────────────────────────────────────
  document.getElementById('xp-label').textContent = `⭐ Niv.${player.level} — XP`;
  document.getElementById('xp-text').textContent  = `${player.xp}/${player.xpNext}`;
  document.getElementById('xp-bar').style.width   = (player.xp / player.xpNext * 100) + '%';
  document.getElementById('gold-display').textContent = `🪙 ${player.gold} Gallions`;

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
  const card1 = document.getElementById('char-card-1');
  if (card1) card1.style.display = partySize === 1 ? 'none' : '';

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
}

function updateCompass() {
  const delta = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };
  ['n','s','e','w'].forEach(d => {
    const el = document.getElementById(`dir-${d}`);
    if (!el) return;
    const [dx, dy] = delta[d];
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
    const obj = q.objective;
    let prog = '', pct = 0;
    if (obj.type === 'kill') {
      pct = Math.min(1, q.progress / obj.amount);
      prog = `${q.progress}/${obj.amount}`;
    } else {
      const count = (player.inventory || []).filter(i => i.id === obj.itemId).length;
      pct = Math.min(1, count / obj.amount);
      prog = `${count}/${obj.amount}`;
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
  div.textContent = text;
  log.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function addLog(text) {
  const el  = document.getElementById('event-log');
  const div = document.createElement('div');
  div.textContent = text;
  el.insertBefore(div, el.firstChild);
  if (el.children.length > 20) el.removeChild(el.lastChild);
}

// ============================================================
// MODALES
// ============================================================

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Fiche de personnage (avec onglets Harry / Hermione)
function openCharacter(charIdx = 0) {
  const c      = party[charIdx];
  const detail = document.getElementById('char-detail');

  const tabs = party.map((p, i) =>
    `<button class="cmd-btn${i === charIdx ? '' : ''}" style="font-size:10px;${i === charIdx ? 'border-color:var(--gold)' : ''}" onclick="openCharacter(${i})">${p.icon} ${p.name.split(' ')[0]}</button>`
  ).join('');

  detail.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:12px">${tabs}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <img src="${c.imgSrc || ''}" alt="${c.name}" style="width:80px;height:80px;object-fit:contain;border-radius:6px">
      <div>
        <div style="font-family:'Cinzel',serif;font-size:15px;color:var(--gold-light)">${c.name}</div>
        <div style="font-size:12px;color:#8a7050">${c.class} — Niveau ${c.level}</div>
        <div style="font-size:11px;color:#6a5030;margin-top:2px">XP : ${player.xp}/${player.xpNext}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      <div style="color:#8a7050">⚡ Points de Vie</div>   <div style="color:var(--parchment)">${c.hp}/${c.hpMax}</div>
      <div style="color:#8a7050">✨ Points de Magie</div>  <div style="color:var(--parchment)">${c.sp}/${c.spMax}</div>
      <div style="color:#8a7050">⚔️ Attaque</div>         <div style="color:var(--parchment)">${c.atk}</div>
      <div style="color:#8a7050">🛡️ Défense</div>         <div style="color:var(--parchment)">${c.def}</div>
      <div style="color:#8a7050">💪 Force</div>            <div style="color:var(--parchment)">${c.str}</div>
      <div style="color:#8a7050">🧠 Intelligence</div>     <div style="color:var(--parchment)">${c.int}</div>
      <div style="color:#8a7050">🏃 Agilité</div>          <div style="color:var(--parchment)">${c.agi}</div>
      <div style="color:#8a7050">🌟 Chance</div>           <div style="color:var(--parchment)">${c.lck}</div>
      <div style="color:#8a7050">🔮 Magie</div>            <div style="color:var(--parchment)">${c.mag}</div>
      ${charIdx === 0 ? `<div style="color:#8a7050">💰 Gallions</div><div style="color:var(--gold)">${player.gold}</div>` : ''}
    </div>
    <div style="margin-top:12px;border-top:1px solid #2a1a08;padding-top:10px">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);margin-bottom:5px">ÉQUIPEMENT</div>
      <div style="font-size:12px;display:flex;flex-direction:column;gap:3px;color:var(--parchment-dark)">
        <div>🪄 ${(c.equipped && c.equipped.wand  && c.equipped.wand.name)  || c.wand  || '—'}</div>
        <div>🧥 ${(c.equipped && c.equipped.armor && c.equipped.armor.name) || c.armor || '—'}</div>
        <div>💎 ${(c.equipped && c.equipped.acc   && c.equipped.acc.name)   || c.acc   || '—'}</div>
      </div>
    </div>
    <div style="margin-top:12px;border-top:1px solid #2a1a08;padding-top:10px">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);margin-bottom:5px">SORTS CONNUS</div>
      <div style="font-size:12px;color:var(--parchment-dark);line-height:1.9">${c.spells.join(' • ')}</div>
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
