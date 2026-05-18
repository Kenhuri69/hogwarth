// ============================================================
// COMBAT — Interface utilisateur (rendu ennemis, cibles, log)
// ============================================================

// ── Sélection de cible ───────────────────────────────────────
// Scaffold partagé : construit les boutons dans #target-buttons et
// affiche #target-selection. `entries` = [{label, idx}] déjà filtré ;
// `onPick(idx)` est appelé au clic (le wrap est masqué avant l'appel).
function _showTargets(entries, onPick) {
  const wrap = document.getElementById('target-selection');
  const btns = document.getElementById('target-buttons');
  btns.innerHTML = '';
  entries.forEach(({ label, idx }) => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.style.fontSize = '10px';
    btn.textContent = label;
    btn.onclick = () => {
      wrap.style.display = 'none';
      onPick(idx);
    };
    btns.appendChild(btn);
  });
  wrap.style.display = 'flex';
}

function showTargetSelection(actionType) {
  pendingAction = actionType;
  const entries = [];
  enemyGroup.forEach((e, i) => {
    if (e.currentHp <= 0) return;
    entries.push({ label: `${e.icon} ${e.name} (${e.currentHp} PV)`, idx: i });
  });
  _showTargets(entries, (i) => {
    if      (pendingAction === 'attack')    executeAttack(i);
    else if (pendingAction === 'spell_dmg') castSpellInBattle(pendingSpell, i);
    pendingAction = null;
    pendingSpell  = null;
  });
}

// Sélection d'un allié vivant pour les sorts de soutien (Ferula, etc.).
// Stocke pendingSpell ; le clic sur un bouton allié relance castSpellInBattle
// avec le 3ᵉ argument `targetAllyIdx`.
function showAllyTargetSelection(spellName) {
  pendingSpell = spellName;
  const entries = [];
  party.slice(0, partySize).forEach((c, i) => {
    if (c.hp <= 0) return;
    entries.push({ label: `${c.icon || ''} ${c.name} (${c.hp}/${c.hpMax} PV)`, idx: i });
  });
  _showTargets(entries, (i) => {
    const spell = pendingSpell;
    pendingSpell  = null;
    pendingAction = null;
    castSpellInBattle(spell, null, i);
  });
}

// ── Pilules de statut (brûlure / poison / saignement / weaken / Protego) ─
function renderStatusBadges(target) {
  const parts = [];

  if (target && target.statusEffects && target.statusEffects.length) {
    target.statusEffects.forEach(s => {
      const def = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[s.id]) || { color: '#aaa' };
      const iconHtml = (typeof getStatusIconHtml === 'function')
        ? (getStatusIconHtml(s.id, 'ui-icon-sm') || s.icon)
        : s.icon;
      // weaken = malus DEF (power = points perdus, pas dmg/tour)
      const tooltip = s.id === 'weaken'
        ? `${def.label || s.id} −${s.power} DEF`
        : `${def.label || s.id} ${s.power}/tour`;
      parts.push(`<span class="status-pill" style="border-color:${def.color}" title="${tooltip}">${iconHtml}${s.turns}</span>`);
    });
  }

  // Badge Protego pour les alliés actifs (basé sur shieldTurns).
  if (typeof party !== 'undefined' && typeof shieldTurns !== 'undefined') {
    const idx = party.indexOf(target);
    if (idx === 0 || idx === 1) {
      const t = shieldTurns[idx] || 0;
      if (t > 0) {
        parts.push(`<span class="status-pill" style="border-color:#3498db" title="Protego — bloque l'attaque suivante (${t} tours)">🛡️${t}</span>`);
      }
    }
  }

  // Badge Garde pour les alliés actifs (basé sur guardTurns).
  if (typeof party !== 'undefined' && typeof guardTurns !== 'undefined') {
    const idx = party.indexOf(target);
    if ((idx === 0 || idx === 1) && (guardTurns[idx] || 0) > 0) {
      parts.push(`<span class="status-pill" style="border-color:#cda52d" title="Garde — atténue le prochain coup ennemi de 50 %">🛡️G</span>`);
    }
  }

  if (!parts.length) return '';
  return '<div class="status-row">' + parts.join('') + '</div>';
}

// ── Rendu du groupe d'ennemis ────────────────────────────────
function renderEnemyGroup() {
  const container = document.getElementById('enemy-group');
  if (!container) return;
  container.innerHTML = '';
  const count = enemyGroup.length;

  enemyGroup.forEach((enemy, i) => {
    const dead    = enemy.currentHp <= 0;
    const pct     = Math.max(0, (enemy.currentHp / enemy.hp) * 100);
    const sizePx  = count === 1 ? 80 : 56;
    const variant = enemy.variant || 'normal';

    // Icône : SVG ou emoji via icons.js
    const iconHtml = dead
      ? `<div class="monster-icon variant-dead" style="width:${sizePx}px;height:${sizePx}px;display:flex;align-items:center;justify-content:center"><img src="img/icons/dead.png" alt="" style="width:${Math.floor(sizePx*0.7)}px;height:${Math.floor(sizePx*0.7)}px;image-rendering:pixelated"></div>`
      : getMonsterIconHtml(enemy, sizePx);

    // Badge de variante (shiny / féroce / ancien / ténébreux)
    const badge = !dead && variant !== 'normal'
      ? `<div class="variant-badge variant-badge-${variant}">${
          variant === 'shiny'    ? '✨' :
          variant === 'ancient'  ? '💜' :
          variant === 'darkness' ? '🌑' :
          '🔴'  /* fierce */
        }</div>`
      : '';

    const card = document.createElement('div');
    card.className = `enemy-card variant-${variant}${dead ? ' enemy-dead' : ''}`;
    card.id = `enemy-card-${i}`;
    card.innerHTML = `
      <div style="position:relative;display:inline-block;animation:float 2s ease-in-out infinite alternate">
        ${iconHtml}
        ${badge}
      </div>
      <div class="enemy-name" style="font-size:${count === 1 ? '15px' : '11px'}">${enemy.name}</div>
      <div class="enemy-bars" style="width:${count === 1 ? '180px' : '120px'}">
        <div class="bar-label" style="font-size:9px"><span>PV</span><span>${Math.max(0, enemy.currentHp)}/${enemy.hp}</span></div>
        <div class="bar-track"><div class="bar-fill hp-fill" style="width:${pct}%"></div></div>
        ${dead ? '' : renderStatusBadges(enemy)}
      </div>
    `;
    container.appendChild(card);
    _attachMonsterInfoHandlers(card, i);
  });
}

// ── Indicateur de tour ───────────────────────────────────────
function updateBattleCharIndicator() {
  const char = party[currentBattleChar];
  const el   = document.getElementById('battle-char-indicator');
  if (el) {
    el.style.display = partySize === 1 ? 'none' : '';
    el.innerHTML     = `<img src="${char.imgSrc || ''}" alt="${char.name}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;border-radius:2px"> Tour de ${char.name}`;
  }
  // Surligner uniquement les personnages actifs du groupe
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (card) card.classList.toggle('active-char', i === currentBattleChar && inBattle);
  });
}

function setBattleLog(text) {
  const el = document.getElementById('battle-log');
  if (!el) return;
  // innerHTML pour permettre <img> des sortilèges/status. Tous les
  // appelants construisent des templates contrôlés (pas d'input user).
  el.innerHTML = text;
}

// ── Panneau d'info monstre (clic / appui long sur une carte) ─────
// Paliers de révélation progressive selon le nombre de victoires
// cumulées sur l'espèce (monsterKills[id]).
const MONSTER_INFO_TIERS = { stats: 1, weakness: 3, deep: 5 };

function _monsterKillCount(id) {
  return (typeof monsterKills !== 'undefined' && monsterKills[id]) || 0;
}

// Ligne « section verrouillée » avec le nombre de victoires restantes.
function _miLocked(threshold, kills, label) {
  const need = Math.max(1, threshold - kills);
  return `<div class="mi-locked">🔒 Encore ${need} victoire${need > 1 ? 's' : ''}
    pour révéler : <em>${label}</em></div>`;
}

function showMonsterCombatInfo(idx) {
  const enemy   = enemyGroup && enemyGroup[idx];
  const content = document.getElementById('monster-info-content');
  const overlay = document.getElementById('monster-info-overlay');
  if (!enemy || !content || !overlay) return;

  const kills     = _monsterKillCount(enemy.id);
  const goldRange = (typeof enemy.gold === 'object')
    ? `${enemy.gold.min}–${enemy.gold.max}` : enemy.gold;

  let html = `
    <div class="mi-header">
      <div class="mi-icon">${getMonsterIconHtml(enemy, 88)}</div>
      <div class="mi-titles">
        <h2 class="mi-name">${enemy.name}</h2>
        <div class="bestiary-floor-tag">${(enemy.category || '').toUpperCase()}</div>
        ${_renderDangerHtml(enemy)}
        <div class="mi-kills">⚔️ Espèce vaincue ${kills} fois</div>
      </div>
    </div>
    <div class="mi-desc">${enemy.desc || ''}</div>
    <div class="mi-hp">PV : ${Math.max(0, enemy.currentHp)} / ${enemy.hp}</div>
  `;

  // Palier 1 — caractéristiques chiffrées + lore.
  if (kills >= MONSTER_INFO_TIERS.stats) {
    html += `<div class="mi-section">
      ${_renderStatGrid(enemy, goldRange)}
      ${enemy.lore ? `<p class="bestiary-lore-full">${enemy.lore}</p>` : ''}
    </div>`;
  } else {
    html += _miLocked(MONSTER_INFO_TIERS.stats, kills, 'caractéristiques & historique');
  }

  // Palier 2 — résistances & faiblesses élémentaires.
  if (kills >= MONSTER_INFO_TIERS.weakness) {
    const rw = _renderResistWeakHtml(enemy);
    html += `<div class="mi-section">
      <div class="bestiary-section-title">Résistances & Faiblesses</div>
      ${rw || '<div class="mi-none">Aucune affinité élémentaire connue.</div>'}
    </div>`;
  } else {
    html += _miLocked(MONSTER_INFO_TIERS.weakness, kills, 'résistances & faiblesses élémentaires');
  }

  // Palier 3 — capacités spéciales + butin + habitat/anecdote.
  if (kills >= MONSTER_INFO_TIERS.deep) {
    const deep = (_renderAbilitiesHtml(enemy, true) || '')
               + (_renderDropsHtml(enemy, true) || '')
               + (_renderLoreBox(enemy, true) || '');
    html += deep || `<div class="mi-section"><div class="mi-none">Aucune capacité ni butin notable.</div></div>`;
  } else {
    html += _miLocked(MONSTER_INFO_TIERS.deep, kills, 'capacités spéciales, butin & secrets');
  }

  content.innerHTML = html;
  content.scrollTop = 0;
  overlay.style.display = 'flex';
}

function closeMonsterCombatInfo() {
  const overlay = document.getElementById('monster-info-overlay');
  if (overlay) overlay.style.display = 'none';
}

// Câble clic (desktop) et appui long 500 ms (tactile) sur une carte ennemie.
function _attachMonsterInfoHandlers(card, idx) {
  card.style.cursor = 'pointer';
  card.title = 'Cliquez (ou appui long) pour les informations';
  let lpTimer = null, touchUsed = false;
  const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
  card.addEventListener('touchstart', () => {
    touchUsed = true;
    clearLp();
    lpTimer = setTimeout(() => { lpTimer = null; showMonsterCombatInfo(idx); }, 500);
  }, { passive: true });
  card.addEventListener('touchmove',   clearLp, { passive: true });
  card.addEventListener('touchend',    clearLp);
  card.addEventListener('touchcancel', clearLp);
  card.addEventListener('click', () => {
    // Sur tactile, seul l'appui long ouvre le panneau — on ignore le clic synthétique.
    if (touchUsed) { touchUsed = false; return; }
    showMonsterCombatInfo(idx);
  });
}
