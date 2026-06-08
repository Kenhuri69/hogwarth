// ============================================================
// BESTIAIRE INTERACTIF — Encyclopédie des monstres
// ============================================================

// Familles narratives (Chapitre 09 §9.2) — le sens d'une créature dans le récit,
// orthogonal aux catégories moteur (bête/humain/…). Le `blurb` exprime l'origine
// de la corruption au niveau famille : il est révélé au palier 2 du codex.
const FAMILY_LORE = {
  F1: { emoji: '🏰', label: "Créatures de l'école",
        blurb: "Habitants familiers du château retournés contre les leurs : le premier symptôme que quelque chose, en bas, réveille Poudlard." },
  F2: { emoji: '🌿', label: 'Bêtes & créatures magiques',
        blurb: "Le monde sauvage qui déborde — territoriales, blessées ou affamées. Toute hostilité n'est pas de la corruption : c'est la nuance morale du bestiaire." },
  F3: { emoji: '💀', label: 'Morts-vivants & malédictions',
        blurb: "Là où la mort cesse d'être un fait pour devenir une présence. La famille du froid, du désespoir et de la peur — on y oppose la lumière et le Patronus." },
  F4: { emoji: '🐍', label: 'Forces de Voldemort',
        blurb: "La preuve que le mal a des fidèles : des gens veulent cela. L'escalier de la menace organisée, du masque anonyme au cercle intérieur nommé." },
  F5: { emoji: '🗝️', label: 'Mythiques & gardiens anciens',
        blurb: "La mémoire profonde du château : l'œuvre des Fondateurs, ou des monstres de légende enfouis plutôt qu'éliminés. La corruption à sa source." },
};
function _familyMeta(monster) {
  return (monster && FAMILY_LORE[monster.loreFamily]) || null;
}

// Codex à paliers (Chapitre 09 §IV, paliers 1-2). DÉRIVÉ de l'état existant —
// aucun global sérialisé neuf : palier 1 = rencontre (seenMonsters), palier 2 =
// CODEX_DEEP_KILLS victoires sur l'espèce (monsterKills, déjà sérialisé).
const CODEX_DEEP_KILLS = 2;
function _codexTier(monster) {
  if (!seenMonsters.has(monster.id)) return 0;
  const k = (typeof monsterKills !== 'undefined' && monsterKills[monster.id]) || 0;
  return k >= CODEX_DEEP_KILLS ? 2 : 1;
}

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
  const family      = document.getElementById('bestiary-family')?.value || '';
  const floorFilter = parseInt(document.getElementById('bestiary-floor')?.value) || 0;
  const grid        = document.getElementById('bestiary-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = MONSTERS.filter(m => {
    const matchSearch = !search      || m.name.toLowerCase().includes(search) || (m.lore || '').toLowerCase().includes(search);
    const matchCat    = !cat         || m.category === cat;
    const matchFamily = !family      || m.loreFamily === family;
    const matchFloor  = !floorFilter || m.minFloor >= floorFilter;
    return matchSearch && matchCat && matchFamily && matchFloor;
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
            return it ? `${getItemIconHtml(it, 'ui-icon-sm')} ${it.name}` : '?';
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
          ${seen && _familyMeta(monster) ? `<span class="bestiary-family-tag" title="${_familyMeta(monster).label}">${_familyMeta(monster).emoji} ${monster.loreFamily}</span>` : ''}
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
        ${seen && _familyMeta(monster) ? `<div><span class="bestiary-family-tag" title="${_familyMeta(monster).label}">${_familyMeta(monster).emoji} ${monster.loreFamily} · ${_familyMeta(monster).label}</span></div>` : ''}
        ${_renderDangerHtml(monster)}
        <div class="bestiary-detail-desc">${monster.desc}</div>
      </div>
    </div>

    <p class="bestiary-lore-full">
      ${seen ? monster.lore : 'Affrontez cette créature pour découvrir son histoire et ses secrets…'}
    </p>

    ${_renderLoreBox(monster, seen)}

    ${_renderCodexDeep(monster)}

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

// Encart « Lore profond » (codex §IV, palier 2) — révèle la famille narrative,
// son origine de corruption et une note de gradient. Verrouillé tant que
// l'espèce n'a pas été vaincue CODEX_DEEP_KILLS fois (mirroir du panneau combat).
function _renderCodexDeep(monster) {
  if (!seenMonsters.has(monster.id)) return '';
  const fam = _familyMeta(monster);
  if (!fam) return '';
  if (_codexTier(monster) < 2) {
    const k = (typeof monsterKills !== 'undefined' && monsterKills[monster.id]) || 0;
    const need = Math.max(1, CODEX_DEEP_KILLS - k);
    return `<div class="codex-deep codex-deep-locked">
      🔒 <strong>Lore profond</strong> — vaincs cette espèce ${need} fois de plus pour percer son origine.
    </div>`;
  }
  const note = _corruptionNote(monster);
  return `<div class="codex-deep">
    <div class="codex-deep-title">🔎 Lore profond</div>
    <div><span class="bestiary-family-tag">${fam.emoji} ${monster.loreFamily} · ${fam.label}</span></div>
    <p class="codex-fam-blurb">${fam.blurb}</p>
    ${note ? `<p class="codex-corruption">${note}</p>` : ''}
  </div>`;
}

// Note de gradient de corruption (Chapitre 09 §9.1.2) indexée sur la profondeur
// typique d'apparition (minFloor) — lecture narrative, pas une instance scalée.
function _corruptionNote(monster) {
  const f = monster.minFloor || 1;
  if (f >= 7) return "🧊 <strong>Profondeurs :</strong> le froid surnaturel l'a profondément gagnée — créature corrompue, à la lisière du cauchemar.";
  if (f >= 4) return "❄️ <strong>La Descente :</strong> la corruption commence à la marquer ; le givre s'invite dans son sillage.";
  return "🌱 <strong>L'École :</strong> encore proche de sa forme canonique — la fêlure ne fait que l'agiter.";
}

function _renderAbilitiesHtml(monster, seen) {
  if (!seen) return '';
  // Les brutes reçoivent Broyer au scaling (dungeon-scaling.js) ; on l'affiche
  // ici via le prédicat partagé pour que le bestiaire reflète le combat réel.
  const abilities = (monster.abilities ? [...monster.abilities] : []);
  if (typeof isBruteMonster === 'function' && isBruteMonster(monster)
      && !abilities.some(a => a.effect === 'maxhpdamage')) {
    abilities.push(BRUTE_CRUSH_ABILITY);
  }
  if (!abilities.length) return '';
  return `<div class="bestiary-abilities">
    <div class="bestiary-section-title">Capacités spéciales</div>
    ${abilities.map(a =>
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

// Emoji par élément (et clé mécanique disarm) pour l'affichage bestiaire.
const ELEMENT_EMOJI = {
  feu: '🔥', glace: '❄️', foudre: '⚡', lumière: '✨',
  ténèbres: '🌑', physique: '⚔️', disarm: '🚫',
};
function _elementLabel(key) {
  const e = ELEMENT_EMOJI[key];
  return e ? `${e} ${key}` : key;
}

// Appelé sous garde ${seen ? ...} ; on n'a pas besoin de re-checker seen ici.
function _renderResistWeakHtml(monster) {
  const fmt = (arr) => arr.map(_elementLabel).join(', ');
  const r = monster.resist?.length ? `<span>🔰 Résistances : <em>${fmt(monster.resist)}</em></span>` : '';
  const w = monster.weak?.length   ? `<span>💥 Faiblesses : <em>${fmt(monster.weak)}</em></span>`   : '';
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
