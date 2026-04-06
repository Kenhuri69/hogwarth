// ============================================================
// MISE À JOUR DE L'INTERFACE
// ============================================================

function updateUI() {
  // ── Harry (party[0]) ────────────────────────────────────────
  _updateCharBar(0);

  // ── Hermione (party[1]) ─────────────────────────────────────
  _updateCharBar(1);

  // ── XP et or partagés ───────────────────────────────────────
  document.getElementById('xp-text').textContent  = `${player.xp}/${player.xpNext}`;
  document.getElementById('xp-bar').style.width   = (player.xp / player.xpNext * 100) + '%';
  document.getElementById('gold-display').textContent = `🪙 ${player.gold} Gallions`;

  // ── Stats de Harry (panneau gauche) ─────────────────────────
  document.getElementById('s-str').textContent = player.str;
  document.getElementById('s-int').textContent = player.int;
  document.getElementById('s-agi').textContent = player.agi;
  document.getElementById('s-mag').textContent = player.mag;

  // ── Équipement ───────────────────────────────────────────────
  document.getElementById('eq-wand').textContent  = player.wand  || '—';
  document.getElementById('eq-armor').textContent = player.armor || '—';
  document.getElementById('eq-acc').textContent   = player.acc   || '—';

  // ── Affichage selon partySize ────────────────────────────────
  const card1 = document.getElementById('char-card-1');
  if (card1) card1.style.display = partySize === 1 ? 'none' : '';

  // ── Statut KO sur les cartes ─────────────────────────────────
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (card) card.classList.toggle('ko-char', c.hp <= 0);
  });
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

function interact() {}

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
      <div style="font-size:42px">${c.icon}</div>
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
        <div>🪄 ${c.wand || '—'}</div>
        <div>🧥 ${c.armor || '—'}</div>
        <div>💎 ${c.acc || '—'}</div>
      </div>
    </div>
    <div style="margin-top:12px;border-top:1px solid #2a1a08;padding-top:10px">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);margin-bottom:5px">SORTS CONNUS</div>
      <div style="font-size:12px;color:var(--parchment-dark);line-height:1.9">${c.spells.join(' • ')}</div>
    </div>
  `;
  document.getElementById('character-modal').style.display = 'flex';
}

// ============================================================
// BESTIAIRE INTERACTIF
// ============================================================

function openBestiary() {
  document.getElementById('bestiary-modal').style.display = 'flex';
  // Revenir au panneau liste et rafraîchir
  document.getElementById('bestiary-list-panel').style.display  = '';
  document.getElementById('bestiary-detail-panel').style.display = 'none';
  filterBestiary();
}

function closeBestiary() {
  document.getElementById('bestiary-modal').style.display = 'none';
}

function filterBestiary() {
  const search      = (document.getElementById('bestiary-search')?.value  || '').toLowerCase().trim();
  const cat         = document.getElementById('bestiary-category')?.value || '';
  const floorFilter = parseInt(document.getElementById('bestiary-floor')?.value) || 0;
  const grid        = document.getElementById('bestiary-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = MONSTERS.filter(m => {
    const matchSearch = !search      || m.name.toLowerCase().includes(search) || m.lore.toLowerCase().includes(search);
    const matchCat    = !cat         || m.category === cat;
    const matchFloor  = !floorFilter || m.minFloor >= floorFilter;
    return matchSearch && matchCat && matchFloor;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="bestiary-empty">Aucune créature ne correspond à ta recherche…</div>`;
    return;
  }

  // Vus en premier, puis non-vus
  filtered.sort((a, b) => (seenMonsters.has(b.id) ? 1 : 0) - (seenMonsters.has(a.id) ? 1 : 0));

  filtered.forEach(monster => {
    const seen = seenMonsters.has(monster.id);
    const floorRange = monster.maxFloor ? `${monster.minFloor}–${monster.maxFloor}` : `${monster.minFloor}+`;

    const dropsHtml = seen && monster.drops && monster.drops.length
      ? `<div class="bestiary-drops">Drops : ${monster.drops.map(d => {
            const it = ITEMS.find(i => i.id === d.itemId);
            return it ? `${it.icon} ${it.name}` : '❓';
          }).join(' · ')}</div>`
      : '';

    const card = document.createElement('div');
    card.className = 'spell-item bestiary-card' + (seen ? ' bestiary-seen' : '');
    card.innerHTML = `
      <div class="bestiary-icon-wrap">
        ${getMonsterIconHtml(monster, seen ? 72 : 56)}
        ${seen
          ? '<span class="bestiary-seen-badge">VU</span>'
          : '<span class="bestiary-unseen-badge">?</span>'}
      </div>
      <div class="bestiary-info">
        <div class="spell-name">
          ${seen ? monster.name : '???'}
          <span class="bestiary-cat-tag">${monster.category}</span>
        </div>
        <div class="bestiary-floor-tag">Étages ${floorRange}</div>
        <div class="bestiary-lore">
          ${seen ? monster.lore : 'Affrontez cette créature pour découvrir son histoire…'}
        </div>
        ${seen ? dropsHtml : ''}
        ${seen ? `<div class="bestiary-stats">
          <span>❤️ ${monster.hp}</span>
          <span>⚔️ ${monster.atk}</span>
          <span>🛡️ ${monster.def}</span>
          <span>🔮 ${monster.mag}</span>
          <span>⭐ ${monster.xp} XP</span>
        </div>` : ''}
      </div>
    `;
    card.onclick = () => showMonsterDetail(monster);
    grid.appendChild(card);
  });
}

function showMonsterDetail(monster) {
  const seen       = seenMonsters.has(monster.id);
  const detail     = document.getElementById('bestiary-detail');
  if (!detail) return;

  const floorRange = monster.maxFloor ? `${monster.minFloor}–${monster.maxFloor}` : `${monster.minFloor}+`;
  const goldRange  = typeof monster.gold === 'object' ? `${monster.gold.min}–${monster.gold.max}` : monster.gold;

  const abilitiesHtml = seen && monster.abilities && monster.abilities.length
    ? `<div class="bestiary-abilities">
        <div class="bestiary-section-title">Capacités spéciales</div>
        ${monster.abilities.map(a =>
          `<div class="bestiary-ability">${a.icon} <strong>${a.name}</strong> — ${a.desc}
           <span class="bestiary-chance">(${Math.round(a.chance * 100)}%)</span></div>`
        ).join('')}
       </div>`
    : '';

  const dropsHtml = seen && monster.drops && monster.drops.length
    ? `<div class="bestiary-abilities">
        <div class="bestiary-section-title">Objets droppés</div>
        ${monster.drops.map(d => {
          const it = ITEMS.find(i => i.id === d.itemId);
          return it
            ? `<div class="bestiary-ability">${it.icon} ${it.name}
               <span class="bestiary-chance">(${Math.round(d.chance * 100)}%)</span></div>`
            : '';
        }).join('')}
       </div>`
    : '';

  const resistHtml = seen && monster.resist && monster.resist.length
    ? `<span>🔰 Résistances : <em>${monster.resist.join(', ')}</em></span>` : '';
  const weakHtml   = seen && monster.weak   && monster.weak.length
    ? `<span>💥 Faiblesses : <em>${monster.weak.join(', ')}</em></span>` : '';

  detail.innerHTML = `
    <div class="bestiary-detail-header">
      <div class="bestiary-detail-icon">
        ${getMonsterIconHtml(monster, seen ? 100 : 80)}
        ${seen ? '<span class="bestiary-seen-badge" style="font-size:10px;padding:3px 8px">VU EN COMBAT</span>' : ''}
      </div>
      <div>
        <h2 class="bestiary-detail-name">${seen ? monster.name : '???'}</h2>
        <div class="bestiary-floor-tag">${monster.category.toUpperCase()} · Étages ${floorRange}</div>
        <div class="bestiary-detail-desc">${monster.desc}</div>
      </div>
    </div>

    <p class="bestiary-lore-full">
      ${seen ? monster.lore : 'Affrontez cette créature pour découvrir son histoire et ses secrets…'}
    </p>

    ${seen ? `
      <div class="bestiary-stat-grid">
        <div class="bestiary-stat"><div class="bestiary-stat-val">❤️ ${monster.hp}</div><div class="bestiary-stat-lbl">PV</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">⚔️ ${monster.atk}</div><div class="bestiary-stat-lbl">ATK</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">🛡️ ${monster.def}</div><div class="bestiary-stat-lbl">DEF</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">🔮 ${monster.mag}</div><div class="bestiary-stat-lbl">MAG</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">⚡ ${monster.agi}</div><div class="bestiary-stat-lbl">AGI</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">⭐ ${monster.xp}</div><div class="bestiary-stat-lbl">XP</div></div>
        <div class="bestiary-stat"><div class="bestiary-stat-val">🪙 ${goldRange}</div><div class="bestiary-stat-lbl">Or</div></div>
      </div>
      ${resistHtml || weakHtml
        ? `<div class="bestiary-resist-line">${resistHtml}${weakHtml}</div>` : ''}
    ` : ''}
    ${abilitiesHtml}
    ${dropsHtml}
    <div style="text-align:center;margin-top:20px">
      <button class="cmd-btn" onclick="showBestiaryList()">← Retour au bestiaire</button>
    </div>
  `;

  document.getElementById('bestiary-list-panel').style.display   = 'none';
  document.getElementById('bestiary-detail-panel').style.display = 'block';
}

function showBestiaryList() {
  document.getElementById('bestiary-list-panel').style.display   = '';
  document.getElementById('bestiary-detail-panel').style.display = 'none';
}
