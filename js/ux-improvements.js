// ============================================================
// UX IMPROVEMENTS — Tooltips, Combat Log, Turn Timeline, Float DMG
// Module autonome, branché par main.js / battle.js / battle-spells.js
// ============================================================

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // 1. TOOLTIPS DÉTAILLÉS
  // ─────────────────────────────────────────────────────────

  let tooltipEl = null;
  let tooltipTimeout = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'ux-tooltip';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function showTooltip(html, ev) {
    const el = ensureTooltip();
    el.innerHTML = html;
    el.classList.add('visible');
    positionTooltip(ev);
  }
  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }
  function positionTooltip(ev) {
    if (!tooltipEl) return;
    const r = tooltipEl.getBoundingClientRect();
    const pad = 14;
    let x = ev.clientX + 16;
    let y = ev.clientY + 16;
    if (x + r.width  > window.innerWidth - pad)  x = ev.clientX - r.width - 16;
    if (y + r.height > window.innerHeight - pad) y = ev.clientY - r.height - 16;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = y + 'px';
  }

  // Helpers
  function row(k, v, cls) { return `<div class="tt-row"><span class="tt-key">${k}</span><span class="tt-val ${cls||''}">${v}</span></div>`; }
  function header(icon, title, tag) {
    return `<div class="tt-header">
      <div class="tt-icon">${icon||'•'}</div>
      <div style="flex:1">
        <div class="tt-title">${title}</div>
        ${tag ? `<div class="tt-tag">${tag}</div>` : ''}
      </div>
    </div>`;
  }

  // Type-tag d'effet de sort en français
  const EFFECT_LABEL = {
    heal:    'Soin',
    disarm:  'Désarme',
    shield:  'Bouclier',
    stun:    'Étourdissement',
    burn:    'Magie offensive',
    instant: 'Sort de mort',
    steal:   'Vol'
  };

  function spellTooltip(spell, charIdx) {
    if (!spell) return '';
    const c = (typeof party !== 'undefined' && party[charIdx]) ? party[charIdx] : null;
    const tag = EFFECT_LABEL[spell.effect] || 'Sort';
    let body = '';

    // Formule de dégâts/soin selon l'effet
    if (['stun','burn','instant'].includes(spell.effect)) {
      if (c) {
        const baseDmg = spell.power + Math.floor(c.mag / 2);
        body += `<div class="tt-section">
          ${row('Dégâts de base', `${spell.power}`)}
          ${row('Bonus magie', `+${Math.floor(c.mag/2)} (MAG ${c.mag} ÷ 2)`, 'tt-mag')}
          ${row('Estimé', `${baseDmg} dégâts`, 'tt-bad')}
        </div>
        <div class="tt-formula">DMG = ${spell.power} + ⌊MAG/2⌋ = ${baseDmg}</div>`;
      } else {
        body += `<div class="tt-formula">DMG = ${spell.power} + ⌊MAG/2⌋</div>`;
      }
      body += `<div class="tt-section" style="font-size:10.5px;color:#a08860">
        💥 ×1.5 si l'ennemi y est faible &nbsp;·&nbsp; 🔰 ×0.5 s'il y résiste
      </div>`;
    } else if (spell.effect === 'heal') {
      body += `<div class="tt-section">${row('Soin', `+${spell.power} PV`, 'tt-good')}</div>`;
    } else if (spell.effect === 'shield') {
      body += `<div class="tt-section">${row('Effet', 'Annule la prochaine attaque', 'tt-mag')}${row('Durée', '2 tours')}</div>`;
    } else if (spell.effect === 'disarm') {
      body += `<div class="tt-section">${row('Effet', `−${spell.power} ATK ennemie`, 'tt-mag')}${row('Durée', '2 tours')}</div>`;
    } else if (spell.effect === 'steal') {
      body += `<div class="tt-section">${row('Effet', '+5 à 15 Gallions', 'tt-good')}</div>`;
    }

    // Coût + état
    let canCast = '';
    if (c) {
      const ok = c.sp >= spell.cost && !spell.locked;
      canCast = `<div class="tt-section">${row('Coût', `${spell.cost} PM`, 'tt-mag')}${row('PM disponibles', `${c.sp}/${c.spMax}`, ok?'tt-good':'tt-bad')}</div>`;
      if (spell.locked) canCast += `<div class="tt-section tt-bad" style="font-size:11px">⛔ Verrouillé — débloqué au niveau 9</div>`;
    } else {
      canCast = `<div class="tt-section">${row('Coût', `${spell.cost} PM`, 'tt-mag')}</div>`;
    }

    return header(spell.icon, spell.name, tag) + body + canCast +
      `<div class="tt-flavor">${spell.desc}</div>`;
  }

  function itemTooltip(item) {
    if (!item) return '';
    const typeLabels = { wand:'Baguette', armor:'Robe', acc:'Accessoire', consumable:'Consommable', spellbook:'Livre de sort' };
    const tag = typeLabels[item.type] || 'Objet';
    let body = '';

    if (item.type === 'consumable') {
      let eff = '';
      if (item.effect === 'heal')        eff = `+${item.power} PV`;
      else if (item.effect === 'restore_sp') eff = `+${item.power} PM`;
      else if (item.effect === 'both')   eff = `+${item.power} PV et +10 PM`;
      body += `<div class="tt-section">${row('Effet', eff, 'tt-good')}</div>`;
    } else if (['wand','armor','acc'].includes(item.type)) {
      const stats = [];
      if (item.bonusAtk) stats.push(['⚔️ Attaque', `+${item.bonusAtk}`]);
      if (item.bonusDef) stats.push(['🛡️ Défense', `+${item.bonusDef}`]);
      if (item.bonusMag) stats.push(['🔮 Magie',   `+${item.bonusMag}`]);
      if (item.bonusLck) stats.push(['🌟 Chance',  `+${item.bonusLck}`]);
      if (item.bonusAgi) stats.push(['🏃 Agilité', `+${item.bonusAgi}`]);
      if (stats.length) {
        body += `<div class="tt-section">${stats.map(s => row(s[0], s[1], 'tt-good')).join('')}</div>`;
      }
      if (item.grantsSpell) body += `<div class="tt-section tt-mag" style="font-size:11px">✨ Apprend : ${item.grantsSpell}</div>`;
    } else if (item.type === 'spellbook') {
      body += `<div class="tt-section tt-mag">${row('Apprend', item.spell)}</div>`;
    }

    if (item.price) body += `<div class="tt-section">${row('Valeur', `${item.price} 🪙`, 'tt-good')}</div>`;
    return header(item.icon, item.name, tag) + body + `<div class="tt-flavor">${item.desc}</div>`;
  }

  function statTooltip(key) {
    const map = {
      str: { i:'💪', n:'Force',         d:"Influence les attaques physiques. +1 par niveau." },
      int: { i:'🧠', n:'Intelligence',  d:"Influence l'efficacité des sorts utilitaires." },
      agi: { i:'🏃', n:'Agilité',       d:"Améliore les chances de fuite et l'esquive." },
      lck: { i:'🌟', n:'Chance',        d:"Augmente les drops rares et les coups critiques." },
      mag: { i:'🔮', n:'Magie',         d:"Bonus de dégâts magiques : DMG = base + ⌊MAG/2⌋." },
      end: { i:'❤️', n:'Endurance',     d:"Influence la régénération au repos et les PV max." },
    };
    const m = map[key];
    if (!m) return '';
    const c = (typeof player !== 'undefined') ? player : null;
    const v = c ? c[key] : '?';
    return header(m.i, m.n, 'Caractéristique') +
      `<div class="tt-section">${row('Valeur', v, 'tt-good')}</div>` +
      `<div class="tt-flavor">${m.d}</div>`;
  }

  // Délégation globale du hover
  function attachTooltipDelegation() {
    document.addEventListener('mousemove', (ev) => {
      if (tooltipEl && tooltipEl.classList.contains('visible')) positionTooltip(ev);
    });

    // SORTS — détection par .spell-item
    document.addEventListener('mouseover', (ev) => {
      const spellEl = ev.target.closest('.spell-item');
      if (spellEl) {
        const spellName = spellEl.querySelector('.spell-name')?.textContent;
        if (!spellName || typeof SPELLS === 'undefined') return;
        const spell = SPELLS.find(s => s.name === spellName);
        if (!spell) return;
        // Devine quel personnage : si openBattleSpells, currentBattleChar ; sinon onglet courant
        let charIdx = (typeof currentBattleChar !== 'undefined' && typeof inBattle !== 'undefined' && inBattle) ? currentBattleChar : 0;
        showTooltip(spellTooltip(spell, charIdx), ev);
        return;
      }

      // OBJETS INVENTAIRE — par .inv-slot
      const invEl = ev.target.closest('.inv-slot.has-item');
      if (invEl) {
        const idx = Array.from(invEl.parentElement.children).indexOf(invEl);
        const item = (typeof player !== 'undefined') ? player.inventory[idx] : null;
        if (item) showTooltip(itemTooltip(item), ev);
        return;
      }

      // BOUTIQUE — par .shop-item
      const shopEl = ev.target.closest('.shop-item');
      if (shopEl && shopEl.dataset.itemId) {
        const item = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === shopEl.dataset.itemId) : null;
        if (item) showTooltip(itemTooltip(item), ev);
        return;
      }

      // STATS — par .stat-item (avec data-stat)
      const statEl = ev.target.closest('.stat-item[data-stat]');
      if (statEl) {
        showTooltip(statTooltip(statEl.dataset.stat), ev);
        return;
      }
    });

    document.addEventListener('mouseout', (ev) => {
      if (ev.target.closest('.spell-item, .inv-slot, .shop-item, .stat-item')) hideTooltip();
    });
    // Cache au scroll/click
    document.addEventListener('scroll', hideTooltip, true);
    document.addEventListener('click', hideTooltip, true);
  }

  // ─────────────────────────────────────────────────────────
  // 2. JOURNAL DE COMBAT SCROLLABLE
  // ─────────────────────────────────────────────────────────

  let combatLogTurn = 0;

  function ensureCombatLog() {
    let panel = document.getElementById('combat-log-panel');
    if (panel) return panel;
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    panel = document.createElement('div');
    panel.id = 'combat-log-panel';
    panel.innerHTML = `
      <div class="clp-header">
        <span>📜 Journal</span>
        <span class="clp-toggle" title="Réduire">−</span>
      </div>
      <div id="combat-log-list"></div>
    `;
    overlay.appendChild(panel);
    panel.querySelector('.clp-toggle').addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      panel.querySelector('.clp-toggle').textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });
    return panel;
  }

  function clearCombatLog() {
    const list = document.getElementById('combat-log-list');
    if (list) list.innerHTML = '';
    combatLogTurn = 0;
  }

  function logCombat(text, type) {
    if (!text) return;
    ensureCombatLog();
    const list = document.getElementById('combat-log-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'clp-entry clp-' + (type || 'info');
    div.innerHTML = text;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  function logCombatTurn(n) {
    ensureCombatLog();
    const list = document.getElementById('combat-log-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'clp-turn-divider';
    div.textContent = `── Tour ${n} ──`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  // ─────────────────────────────────────────────────────────
  // 3. TIMELINE D'ORDRE DES TOURS
  // ─────────────────────────────────────────────────────────

  function ensureTimeline() {
    let tl = document.getElementById('turn-timeline');
    if (tl) return tl;
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    tl = document.createElement('div');
    tl.id = 'turn-timeline';
    overlay.appendChild(tl);
    return tl;
  }

  // Calcule l'ordre prévu : alliés vivants (dans l'ordre 0,1) puis ennemis vivants
  function computeTurnOrder() {
    const order = [];
    if (typeof party === 'undefined') return order;
    const ps = (typeof partySize !== 'undefined') ? partySize : 2;
    const startIdx = (typeof currentBattleChar !== 'undefined') ? currentBattleChar : 0;

    // Alliés à partir du courant
    for (let i = 0; i < ps; i++) {
      const idx = (startIdx + i) % ps;
      const c = party[idx];
      if (!c) continue;
      order.push({
        kind: 'ally',
        name: c.name.split(' ')[0],
        img:  c.imgSrc,
        emoji: c.icon,
        ko: c.hp <= 0,
        active: idx === startIdx && c.hp > 0
      });
    }
    // Ennemis vivants
    if (typeof enemyGroup !== 'undefined') {
      enemyGroup.forEach(e => {
        if (e.currentHp > 0) {
          order.push({ kind: 'enemy', name: e.name, emoji: e.icon || '👹', ko: false, active: false });
        }
      });
    }
    return order;
  }

  function renderTimeline() {
    if (typeof inBattle !== 'undefined' && !inBattle) {
      const tl = document.getElementById('turn-timeline');
      if (tl) tl.style.display = 'none';
      return;
    }
    const tl = ensureTimeline();
    if (!tl) return;
    tl.style.display = '';
    const order = computeTurnOrder();
    let html = `<span class="tt-label">ORDRE</span>`;
    order.forEach((o, i) => {
      const cls = [
        'timeline-slot',
        o.kind === 'ally' ? 'tl-ally' : 'tl-enemy',
        o.active ? 'is-active' : '',
        o.ko ? 'is-ko' : ''
      ].join(' ');
      const inner = o.img ? `<img src="${o.img}" alt="${o.name}">` : `<span class="tl-emoji">${o.emoji}</span>`;
      html += `<div class="${cls}" title="${o.name}">${inner}<span class="tl-pos">${i+1}</span></div>`;
      if (i < order.length - 1) html += `<span class="timeline-arrow">▸</span>`;
    });
    tl.innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────
  // 4. ANIMATIONS DE DÉGÂTS FLOTTANTS
  // ─────────────────────────────────────────────────────────

  function ensureFloatLayer() {
    let layer = document.getElementById('float-dmg-layer');
    if (layer) return layer;
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    layer = document.createElement('div');
    layer.id = 'float-dmg-layer';
    layer.className = 'float-dmg-layer';
    overlay.appendChild(layer);
    return layer;
  }

  // Renvoie la position approximative d'un ennemi (par index) dans le viewport encounter
  function getEnemyAnchor(targetIdx) {
    const card = document.getElementById(`enemy-card-${targetIdx}`);
    const overlay = document.getElementById('encounter-overlay');
    if (!card || !overlay) return null;
    const r = card.getBoundingClientRect();
    const o = overlay.getBoundingClientRect();
    return { x: r.left + r.width/2 - o.left, y: r.top + r.height*0.25 - o.top };
  }

  // Position d'un personnage allié — on visera la zone "battle-char-indicator" centrale
  function getAllyAnchor() {
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    const o = overlay.getBoundingClientRect();
    // En bas centre de l'overlay (zone des actions)
    return { x: o.width/2, y: o.height * 0.55 };
  }

  // Public: floatDmg(target, amount, type)
  // target : "enemy:N" | "ally" | {x,y}
  // type : 'dmg' | 'heal' | 'mana' | 'crit' | 'miss' | 'shield'
  function floatDmg(target, amount, type) {
    const layer = ensureFloatLayer();
    if (!layer) return;
    let pos;
    if (typeof target === 'string') {
      if (target.startsWith('enemy:')) {
        pos = getEnemyAnchor(parseInt(target.slice(6), 10));
      } else if (target === 'ally') {
        pos = getAllyAnchor();
      }
    } else if (target && typeof target.x === 'number') {
      pos = target;
    }
    if (!pos) return;

    const el = document.createElement('div');
    el.className = 'float-dmg fd-' + (type || 'dmg');
    let txt = '';
    if (type === 'heal')      txt = `+${amount} PV`;
    else if (type === 'mana') txt = `+${amount} PM`;
    else if (type === 'miss') txt = 'Manqué !';
    else if (type === 'shield') txt = '🛡️ Bloqué';
    else if (type === 'crit') txt = `CRIT ! −${amount}`;
    else                      txt = `−${amount}`;
    el.textContent = txt;
    el.style.left = pos.x + 'px';
    el.style.top  = pos.y + 'px';
    layer.appendChild(el);

    // Secousse / flash sur la cible
    if (typeof target === 'string' && target.startsWith('enemy:')) {
      const card = document.getElementById(`enemy-card-${target.slice(6)}`);
      if (card && (type === 'dmg' || type === 'crit')) card.classList.add('shake-hit');
      setTimeout(() => card && card.classList.remove('shake-hit'), 350);
    }
    if (type === 'heal') {
      // flash sur la carte du perso actif
      const idx = (typeof currentBattleChar !== 'undefined') ? currentBattleChar : 0;
      const cc = document.getElementById(`char-card-${idx}`);
      if (cc) {
        cc.classList.add('flash-heal');
        setTimeout(() => cc.classList.remove('flash-heal'), 500);
      }
    }
    setTimeout(() => el.remove(), 1300);
  }

  // ─────────────────────────────────────────────────────────
  // EXPORTS GLOBAUX
  // ─────────────────────────────────────────────────────────
  window.UX = {
    showTooltip, hideTooltip,
    logCombat, logCombatTurn, clearCombatLog,
    renderTimeline,
    floatDmg
  };

  // Initialisation au DOMContentLoaded
  if (document.readyState !== 'loading') attachTooltipDelegation();
  else document.addEventListener('DOMContentLoaded', attachTooltipDelegation);
})();
