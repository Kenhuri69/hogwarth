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

  // Niveau de danger avec couleur progressive
  const dangerVal = monster.danger || null;
  const dangerColor = dangerVal >= 10 ? '#e82020'
                    : dangerVal >= 8  ? '#e85050'
                    : dangerVal >= 6  ? '#d07030'
                    : dangerVal >= 4  ? '#c0a020'
                    :                   '#608040';
  const dangerHtml = dangerVal
    ? `<span class="bestiary-danger" style="color:${dangerColor}">
         ${'⚠️'.repeat(Math.min(dangerVal, 5))} Danger&nbsp;${dangerVal}/10
       </span>`
    : '';

  // Encart Habitat + Anecdote (visible seulement si vu et champs définis)
  const loreBoxHtml = seen && (monster.habitat || monster.anecdote)
    ? `<div class="bestiary-lore-box">
        ${monster.habitat  ? `<div><strong>🏰 Habitat :</strong> ${monster.habitat}</div>`  : ''}
        ${monster.anecdote ? `<div><strong>📖 Anecdote :</strong> <em>${monster.anecdote}</em></div>` : ''}
       </div>`
    : '';

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
        ${getMonsterIconHtml(monster, seen ? 120 : 80)}
        ${seen ? '<span class="bestiary-seen-badge" style="font-size:10px;padding:3px 8px">VU</span>' : ''}
      </div>
      <div class="bestiary-detail-titles">
        <h2 class="bestiary-detail-name">${seen ? monster.name : '???'}</h2>
        <div class="bestiary-floor-tag">${monster.category.toUpperCase()} · Étages ${floorRange}</div>
        ${dangerHtml}
        <div class="bestiary-detail-desc">${monster.desc}</div>
      </div>
    </div>

    <p class="bestiary-lore-full">
      ${seen ? monster.lore : 'Affrontez cette créature pour découvrir son histoire et ses secrets…'}
    </p>

    ${loreBoxHtml}

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
