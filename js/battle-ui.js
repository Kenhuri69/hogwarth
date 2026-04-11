// ============================================================
// COMBAT — Interface utilisateur (rendu ennemis, cibles, log)
// ============================================================

// ── Sélection de cible ───────────────────────────────────────
function showTargetSelection(actionType) {
  pendingAction = actionType;
  const wrap = document.getElementById('target-selection');
  const btns = document.getElementById('target-buttons');
  btns.innerHTML = '';
  enemyGroup.forEach((e, i) => {
    if (e.currentHp <= 0) return;
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.style.fontSize = '10px';
    btn.textContent = `${e.icon} ${e.name} (${e.currentHp} PV)`;
    btn.onclick = () => {
      wrap.style.display = 'none';
      if      (pendingAction === 'attack')    executeAttack(i);
      else if (pendingAction === 'spell_dmg') castSpellInBattle(pendingSpell, i);
      pendingAction = null;
      pendingSpell  = null;
    };
    btns.appendChild(btn);
  });
  wrap.style.display = 'flex';
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
      ? `<div class="monster-icon variant-dead" style="width:${sizePx}px;height:${sizePx}px;font-size:${Math.floor(sizePx*0.7)}px">💀</div>`
      : getMonsterIconHtml(enemy, sizePx);

    // Badge de variante (shiny / féroce / ancien)
    const badge = !dead && variant !== 'normal'
      ? `<div class="variant-badge variant-badge-${variant}">${
          variant === 'shiny'   ? '✨' :
          variant === 'ancient' ? '💜' : '🔴'
        }</div>`
      : '';

    const card = document.createElement('div');
    card.className = `enemy-card${dead ? ' enemy-dead' : ''}`;
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
      </div>
    `;
    container.appendChild(card);
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
  if (el) el.textContent = text;
}
