// ============================================================
// BESTIAIRE INTERACTIF — Encyclopédie des monstres
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
          <span><img class="ui-icon ui-icon-sm" src="img/icons/hp.png" alt=""> ${monster.hp}</span>
          <span><img class="ui-icon ui-icon-sm" src="img/icons/atk.png" alt=""> ${monster.atk}</span>
          <span><img class="ui-icon ui-icon-sm" src="img/icons/def.png" alt=""> ${monster.def}</span>
          <span><img class="ui-icon ui-icon-sm" src="img/icons/mag.png" alt=""> ${monster.mag}</span>
          <span><img class="ui-icon ui-icon-sm" src="img/icons/xp.png" alt=""> ${monster.xp} XP</span>
        </div>` : ''}
      </div>
    `;
    card.onclick = () => showMonsterDetail(monster);
    grid.appendChild(card);
  });
}

function showMonsterDetail(monster) {
  const seen   = seenMonsters.has(monster.id);
  const detail = document.getElementById('bestiary-detail');
  if (!detail) return;

  const floorRange = monster.maxFloor ? `${monster.minFloor}–${monster.maxFloor}` : `${monster.minFloor}+`;
  const goldRange  = typeof monster.gold === 'object' ? `${monster.gold.min}–${monster.gold.max}` : monster.gold;

  detail.innerHTML = `
    <div class="bestiary-detail-header">
      <div class="bestiary-detail-icon">
        ${getMonsterIconHtml(monster, seen ? 120 : 80)}
        ${seen ? '<span class="bestiary-seen-badge" style="font-size:10px;padding:3px 8px">VU</span>' : ''}
      </div>
      <div class="bestiary-detail-titles">
        <h2 class="bestiary-detail-name">${seen ? monster.name : '???'}</h2>
        <div class="bestiary-floor-tag">${monster.category.toUpperCase()} · Étages ${floorRange}</div>
        ${_renderDangerHtml(monster)}
        <div class="bestiary-detail-desc">${monster.desc}</div>
      </div>
    </div>

    <p class="bestiary-lore-full">
      ${seen ? monster.lore : 'Affrontez cette créature pour découvrir son histoire et ses secrets…'}
    </p>

    ${_renderLoreBox(monster, seen)}

    ${seen ? `
      ${_renderStatGrid(monster, goldRange)}
      ${_renderResistWeakHtml(monster)}
    ` : ''}
    ${_renderAbilitiesHtml(monster, seen)}
    ${_renderDropsHtml(monster, seen)}
    <div style="text-align:center;margin-top:20px">
      <button class="cmd-btn" onclick="showBestiaryList()">← Retour au bestiaire</button>
    </div>
  `;

  document.getElementById('bestiary-list-panel').style.display   = 'none';
  document.getElementById('bestiary-detail-panel').style.display = 'block';
}

// Niveau de danger avec couleur progressive (vert → jaune → rouge).
function _renderDangerHtml(monster) {
  const v = monster.danger || null;
  if (!v) return '';
  const color = v >= 10 ? '#e82020'
              : v >= 8  ? '#e85050'
              : v >= 6  ? '#d07030'
              : v >= 4  ? '#c0a020'
              :           '#608040';
  return `<span class="bestiary-danger" style="color:${color}">
            ${'⚠️'.repeat(Math.min(v, 5))} Danger&nbsp;${v}/11
          </span>`;
}

// Encart Habitat + Anecdote (visible seulement si vu et au moins un champ).
function _renderLoreBox(monster, seen) {
  if (!seen) return '';
  if (!monster.habitat && !monster.anecdote) return '';
  return `<div class="bestiary-lore-box">
    ${monster.habitat  ? `<div><strong>🏰 Habitat :</strong> ${monster.habitat}</div>`  : ''}
    ${monster.anecdote ? `<div><strong>📖 Anecdote :</strong> <em>${monster.anecdote}</em></div>` : ''}
  </div>`;
}

function _renderAbilitiesHtml(monster, seen) {
  if (!seen || !monster.abilities || !monster.abilities.length) return '';
  return `<div class="bestiary-abilities">
    <div class="bestiary-section-title">Capacités spéciales</div>
    ${monster.abilities.map(a =>
      `<div class="bestiary-ability">${a.icon} <strong>${a.name}</strong> — ${a.desc}
       <span class="bestiary-chance">(${Math.round(a.chance * 100)}%)</span></div>`
    ).join('')}
  </div>`;
}

function _renderDropsHtml(monster, seen) {
  if (!seen || !monster.drops || !monster.drops.length) return '';
  return `<div class="bestiary-abilities">
    <div class="bestiary-section-title">Objets droppés</div>
    ${monster.drops.map(d => {
      const it = ITEMS.find(i => i.id === d.itemId);
      return it
        ? `<div class="bestiary-ability">${it.icon} ${it.name}
           <span class="bestiary-chance">(${Math.round(d.chance * 100)}%)</span></div>`
        : '';
    }).join('')}
  </div>`;
}

// Appelé sous garde ${seen ? ...} ; on n'a pas besoin de re-checker seen ici.
function _renderResistWeakHtml(monster) {
  const r = monster.resist?.length ? `<span>🔰 Résistances : <em>${monster.resist.join(', ')}</em></span>` : '';
  const w = monster.weak?.length   ? `<span>💥 Faiblesses : <em>${monster.weak.join(', ')}</em></span>`   : '';
  return (r || w) ? `<div class="bestiary-resist-line">${r}${w}</div>` : '';
}

function _renderStatGrid(monster, goldRange) {
  return `<div class="bestiary-stat-grid">
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/hp.png" alt=""> ${monster.hp}</div><div class="bestiary-stat-lbl">PV</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/atk.png" alt=""> ${monster.atk}</div><div class="bestiary-stat-lbl">ATK</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/def.png" alt=""> ${monster.def}</div><div class="bestiary-stat-lbl">DEF</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/mag.png" alt=""> ${monster.mag}</div><div class="bestiary-stat-lbl">MAG</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/agi.png" alt=""> ${monster.agi}</div><div class="bestiary-stat-lbl">AGI</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/xp.png" alt=""> ${monster.xp}</div><div class="bestiary-stat-lbl">XP</div></div>
    <div class="bestiary-stat"><div class="bestiary-stat-val"><img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${goldRange}</div><div class="bestiary-stat-lbl">Or</div></div>
  </div>`;
}

function showBestiaryList() {
  document.getElementById('bestiary-list-panel').style.display   = '';
  document.getElementById('bestiary-detail-panel').style.display = 'none';
}
