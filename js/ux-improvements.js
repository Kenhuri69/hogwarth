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
  // Icône PNG d'une stat/ressource (remplace les emoji des tooltips).
  const _STAT_ICON = {
    atk: 'atk', def: 'def', mag: 'mag', lck: 'lck', agi: 'agi',
    str: 'str', int: 'int', end: 'hp', hp: 'hp', mp: 'mp', gold: 'gold'
  };
  function statIco(key) {
    const f = _STAT_ICON[key];
    return f ? `<img class="ui-icon ui-icon-md" src="img/icons/${f}.png" alt="">` : '•';
  }
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
      const dur = (c && typeof shieldDuration === 'function') ? shieldDuration(spell, c) : 2;
      body += `<div class="tt-section">${row('Effet', 'Annule la prochaine attaque', 'tt-mag')}${row('Durée', `${dur} tours`)}</div>`;
    } else if (spell.effect === 'disarm') {
      const lost = (c && typeof disarmAtkLoss === 'function') ? disarmAtkLoss(spell, c) : spell.power;
      const dur  = (c && typeof disarmTurns === 'function') ? disarmTurns(spell, c) : 2;
      body += `<div class="tt-section">${row('Effet', `−${lost} ATK ennemie`, 'tt-mag')}${row('Durée', `${dur} tours`)}</div>`;
    } else if (spell.effect === 'steal') {
      const b = (c && typeof stealBaseGold === 'function') ? stealBaseGold(spell, c) : (spell.power || 0);
      body += `<div class="tt-section">${row('Effet', `+${b} à ${b + 5} Gallions`, 'tt-good')}</div>`;
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
      if (item.bonusAtk) stats.push([`${statIco('atk')} Attaque`, `+${item.bonusAtk}`]);
      if (item.bonusDef) stats.push([`${statIco('def')} Défense`, `+${item.bonusDef}`]);
      if (item.bonusMag) stats.push([`${statIco('mag')} Magie`,   `+${item.bonusMag}`]);
      if (item.bonusLck) stats.push([`${statIco('lck')} Chance`,  `+${item.bonusLck}`]);
      if (item.bonusAgi) stats.push([`${statIco('agi')} Agilité`, `+${item.bonusAgi}`]);
      if (stats.length) {
        body += `<div class="tt-section">${stats.map(s => row(s[0], s[1], 'tt-good')).join('')}</div>`;
      }
      if (item.grantsSpell) body += `<div class="tt-section tt-mag" style="font-size:11px">${typeof getSpellIconHtml === 'function' ? getSpellIconHtml(item.grantsSpell, 'ui-icon-md') : ''} Apprend : ${item.grantsSpell}</div>`;
    } else if (item.type === 'spellbook') {
      body += `<div class="tt-section tt-mag">${row('Apprend', item.spell)}</div>`;
    }

    if (item.price) body += `<div class="tt-section">${row('Valeur', `${item.price} ${statIco('gold')}`, 'tt-good')}</div>`;
    return header(item.icon, item.name, tag) + body + `<div class="tt-flavor">${item.desc}</div>`;
  }

  // Vague D — tooltip pour les slots vides de la mini-équipement party-card.
  function emptySlotTooltip(slotName) {
    const labels = { wand: 'Baguette', body: 'Robe / Armure', amulet: 'Amulette' };
    const png    = { wand: 'wand', body: 'armor', amulet: 'accessory' };
    const name   = labels[slotName] || slotName || 'Slot';
    const icon   = png[slotName]
      ? `<img class="ui-icon ui-icon-md" src="img/icons/${png[slotName]}.png" alt="">` : '·';
    return header(icon, name, 'Slot libre') +
      `<div class="tt-flavor">Équiper un objet depuis le sac pour activer ce slot.</div>`;
  }

  function statTooltip(key) {
    const map = {
      str: { i:statIco('str'), n:'Force',         d:"Influence les attaques physiques. +1 par niveau." },
      int: { i:statIco('int'), n:'Intelligence',  d:"Influence l'efficacité des sorts utilitaires." },
      agi: { i:statIco('agi'), n:'Agilité',       d:"Améliore les chances de fuite et l'esquive." },
      lck: { i:statIco('lck'), n:'Chance',        d:"Augmente les drops rares et les coups critiques." },
      mag: { i:statIco('mag'), n:'Magie',         d:"Bonus de dégâts magiques : DMG = base + ⌊MAG/2⌋." },
      end: { i:statIco('end'), n:'Endurance',     d:"Augmente les PV max (+5 par point), la Défense et la résistance aux dégâts continus." },
    };
    const m = map[key];
    if (!m) return '';
    const c = (typeof player !== 'undefined') ? player : null;
    const v = c ? c[key] : '?';
    return header(m.i, m.n, 'Caractéristique') +
      `<div class="tt-section">${row('Valeur', v, 'tt-good')}</div>` +
      `<div class="tt-flavor">${m.d}</div>`;
  }

  // Tooltip riche pour un bouton d'action de combat (#battle-actions .cmd-btn).
  // Descriptions statiques + rappel de la touche clavier. La clé d'action est
  // lue depuis l'attribut onclick (`battleAction('X')`). (H2 — couverture combat.)
  const ACTION_TIPS = {
    attack:   { icon: '⚔️', name: 'Attaquer',  tag: 'Action', key: 'A', desc: 'Frappe physique : ATK + 0–3 contre la Défense ennemie. Peut faire un coup critique selon la Chance.' },
    spell:    { icon: '✨', name: 'Sortilège', tag: 'Action', key: 'S', desc: 'Ouvre ta liste de sorts. Coûte des PM selon le sort choisi.' },
    guard:    { icon: '🛡️', name: 'Garde',     tag: 'Action', key: 'G', desc: 'Réduit de 50 % les coups physiques, restitue des PM et peut riposter. Cumulable (Double-Garde).' },
    item:     { icon: '🧪', name: 'Objet',     tag: 'Action', key: 'O', desc: 'Utiliser un consommable (potion, etc.) sans quitter le combat.' },
    flee:     { icon: '💨', name: 'Fuir',      tag: 'Action', key: 'F', desc: 'Tente de fuir le combat. Réussite selon ton Agilité ; garantie avec un Balai.' },
    artifact: { icon: '🏺', name: 'Artefact',  tag: 'Action', key: '',  desc: "Déclenche l'effet de charge de l'artefact équipé (1×/combat)." },
    posture:  { icon: '🔄', name: 'Posture',   tag: 'Duo',    key: '',  desc: 'Bascule la posture du Duo : Phalange (défensif) ↔ Tenaille (focus-fire). Gratuit 1×/combat.' },
    env:      { icon: '🌿', name: 'Rune',      tag: 'Environnement', key: '', desc: "Active la rune de la zone : étourdit l'ennemi le plus proche (1×/combat)." }
  };
  function actionButtonTooltip(btn) {
    const oc = btn.getAttribute('onclick') || '';
    const m = oc.match(/battleAction\(['"](\w+)['"]\)/);
    const t = m && ACTION_TIPS[m[1]];
    if (!t) return '';
    const tag = t.key ? `${t.tag} · touche ${t.key}` : t.tag;
    return header(t.icon, t.name, tag) + `<div class="tt-flavor">${t.desc}</div>`;
  }

  // Résolution unique d'un tooltip pour un élément (partagée par le survol
  // souris ET l'appui long tactile). Renvoie le HTML ou '' si aucune cible.
  function tooltipHtmlForTarget(target) {
    if (!target || !target.closest) return '';
    let el;

    // SORTS — par .spell-item
    if ((el = target.closest('.spell-item'))) {
      const spellName = el.querySelector('.spell-name')?.textContent;
      if (!spellName || typeof SPELLS === 'undefined') return '';
      const spell = SPELLS.find(s => s.name === spellName);
      if (!spell) return '';
      const charIdx = (typeof currentBattleChar !== 'undefined' && typeof inBattle !== 'undefined' && inBattle) ? currentBattleChar : 0;
      return spellTooltip(spell, charIdx);
    }
    // OBJETS INVENTAIRE (effets de potion inclus) — par .inv-slot
    if ((el = target.closest('.inv-slot.has-item'))) {
      const idx = Array.from(el.parentElement.children).indexOf(el);
      const item = (typeof player !== 'undefined') ? player.inventory[idx] : null;
      return item ? itemTooltip(item) : '';
    }
    // BOUTIQUE — par .shop-item
    if ((el = target.closest('.shop-item')) && el.dataset.itemId) {
      const item = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === el.dataset.itemId) : null;
      return item ? itemTooltip(item) : '';
    }
    // STATS — par .stat-item (avec data-stat)
    if ((el = target.closest('.stat-item[data-stat]'))) {
      return statTooltip(el.dataset.stat);
    }
    // MINI-ÉQUIPEMENT party-card (HUD gauche) — par .party-equip-slot
    if ((el = target.closest('.party-equip-slot'))) {
      const rowEl = el.closest('.party-equip-row');
      const charIdx = rowEl ? parseInt((rowEl.id || 'equip-row-0').replace('equip-row-', ''), 10) || 0 : 0;
      const slotName = el.dataset.slot;
      const c = (typeof party !== 'undefined') ? party[charIdx] : null;
      const item = c && c.equipped && c.equipped[slotName];
      return item ? itemTooltip(item) : emptySlotTooltip(slotName);
    }
    // BOUTONS D'ACTION DE COMBAT (H2) — par .battle-actions .cmd-btn
    if ((el = target.closest('.battle-actions .cmd-btn'))) {
      return actionButtonTooltip(el);
    }
    return '';
  }

  // Sélecteur unifié des cibles de tooltip (survol + appui long).
  const TT_SELECTOR =
    '.spell-item, .inv-slot.has-item, .shop-item, .stat-item[data-stat], ' +
    '.party-equip-slot, .battle-actions .cmd-btn';

  // Délégation globale du hover (souris) + appui long (tactile).
  function attachTooltipDelegation() {
    document.addEventListener('mousemove', (ev) => {
      if (tooltipEl && tooltipEl.classList.contains('visible')) positionTooltip(ev);
    });

    document.addEventListener('mouseover', (ev) => {
      const html = tooltipHtmlForTarget(ev.target);
      if (html) showTooltip(html, ev);
    });

    document.addEventListener('mouseout', (ev) => {
      if (ev.target.closest(TT_SELECTOR)) hideTooltip();
    });

    // ── Appui long tactile (H2) — ~450 ms montre le tooltip riche sans
    // déclencher l'action de l'élément (le clic synthétique qui suit est
    // supprimé). Aligné sur le pattern d'info-monstre (battle-ui.js). ──
    let lpTimer = null, lpFired = false, touchHideTimer = null;
    const clearLp = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };

    document.addEventListener('touchstart', (ev) => {
      if (ev.touches && ev.touches.length > 1) { clearLp(); return; }
      const target = ev.target.closest(TT_SELECTOR);
      if (!target) return;
      const touch = ev.touches[0];
      const pt = { clientX: touch.clientX, clientY: touch.clientY };
      clearLp();
      lpTimer = setTimeout(() => {
        lpTimer = null;
        const html = tooltipHtmlForTarget(target);
        if (!html) return;
        lpFired = true;
        showTooltip(html, pt);
        if (touchHideTimer) clearTimeout(touchHideTimer);
        touchHideTimer = setTimeout(hideTooltip, 4000);
      }, 450);
    }, { passive: true });
    document.addEventListener('touchmove',   clearLp, { passive: true });
    document.addEventListener('touchend',    clearLp, { passive: true });
    document.addEventListener('touchcancel', clearLp, { passive: true });

    // Cache au scroll. Le clic ferme le tooltip — sauf juste après un appui
    // long, où il faut AU CONTRAIRE supprimer le clic synthétique (sinon
    // l'action de l'élément se déclencherait) et garder le tooltip affiché.
    document.addEventListener('scroll', hideTooltip, true);
    document.addEventListener('click', (ev) => {
      if (lpFired) {
        lpFired = false;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        return;
      }
      hideTooltip();
    }, true);
  }

  // ─────────────────────────────────────────────────────────
  // 2. JOURNAL DE COMBAT SCROLLABLE
  // ─────────────────────────────────────────────────────────

  let combatLogTurn = 0;

  // Borne le nombre de lignes du journal (P2-1) : un combat long (Boucle,
  // groupes de 5) appendait sans limite → churn DOM croissant. On retire les
  // entrées les plus anciennes au-delà de ce cap (l'utilisateur scrolle de
  // toute façon vers le bas).
  const COMBAT_LOG_MAX_LINES = 120;
  function _trimCombatLog(list) {
    while (list.childElementCount > COMBAT_LOG_MAX_LINES) {
      list.removeChild(list.firstElementChild);
    }
  }

  function ensureCombatLog() {
    let panel = document.getElementById('combat-log-panel');
    if (panel) return panel;
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    panel = document.createElement('div');
    panel.id = 'combat-log-panel';
    panel.innerHTML = `
      <div class="clp-header">
        <span><img class="ui-icon ui-icon-md" src="img/icons/scroll.png" alt=""> Journal</span>
        <span class="clp-toggle" title="Réduire">−</span>
      </div>
      <div id="combat-log-list"></div>
    `;
    overlay.appendChild(panel);
    // Sur petits écrans, on replie par défaut pour ne pas masquer le portrait
    // du monstre. L'utilisateur déplie via le bouton +/− s'il en a besoin.
    const isSmall = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    if (isSmall) {
      panel.classList.add('collapsed');
      panel.querySelector('.clp-toggle').textContent = '+';
      // Premier combat (mobile) : pulse le header pour signaler le journal au
      // joueur, sans le déplier (ne masque pas le portrait du monstre). Le
      // panneau étant créé une seule fois par session, le hint ne joue qu'au
      // tout premier combat.
      panel.classList.add('clp-hint');
      setTimeout(() => panel.classList.remove('clp-hint'), 4500);
    }
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
    div.innerHTML = (typeof iconizeCombatLog === 'function') ? iconizeCombatLog(text) : text;
    list.appendChild(div);
    _trimCombatLog(list);
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
    _trimCombatLog(list);
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

    // Alliés à partir du courant — un allié KO ne joue pas ce tour, on le
    // masque de la frise pour ne pas induire en erreur (visible sur sa carte).
    for (let i = 0; i < ps; i++) {
      const idx = (startIdx + i) % ps;
      const c = party[idx];
      if (!c || c.hp <= 0) continue;
      order.push({
        kind: 'ally',
        name: c.name.split(' ')[0],
        img:  c.imgSrc,
        emoji: c.icon,
        ko: false,
        active: idx === startIdx
      });
    }
    // Ennemis vivants
    if (typeof enemyGroup !== 'undefined') {
      enemyGroup.forEach(e => {
        if (e.currentHp > 0) {
          order.push({ kind: 'enemy', name: e.name, img: e.imgSrc, emoji: e.icon || '👹', ko: false, active: false });
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
      // flash sur la carte du perso actif (caster) — délégué à cardReact (K1)
      const idx = (typeof currentBattleChar !== 'undefined') ? currentBattleChar : 0;
      cardReact(idx, 'heal');
    }
    setTimeout(() => el.remove(), 1300);
  }

  // Public: cardReact(charIdx, kind) — K1
  // Réaction visuelle de la carte de groupe #char-card-<idx> du membre
  // concerné : flash de fond (rouge dégât / vert soin) + micro-secousse pour
  // dmg/crit. kind ∈ 'dmg'|'crit'|'heal'. La gestion reduced-motion (flash sans
  // secousse) est portée par le CSS (css/ux-improvements.css). Défensif : no-op
  // si la carte n'existe pas (mode solo carte 1 masquée, hors combat…).
  function cardReact(charIdx, kind) {
    const cc = document.getElementById('char-card-' + ((charIdx | 0)));
    if (!cc) return;
    const cls = kind === 'heal' ? 'flash-heal'
              : kind === 'crit' ? 'card-react-crit'
              : 'card-react-dmg';
    // Reset puis reflow pour rejouer l'anim si la même classe revient vite
    // (multi-coups sur la même carte dans un même tour).
    cc.classList.remove('flash-heal', 'card-react-dmg', 'card-react-crit');
    void cc.offsetWidth;
    cc.classList.add(cls);
    setTimeout(() => cc.classList.remove(cls), 550);
  }

  // Public: questFanfare(title) — L1
  // Monte un bandeau doré transitoire centré (« Quête accomplie ! » + titre),
  // retiré après l'animation. Flourish CSS (.quest-fanfare). reduced-motion →
  // fondu d'opacité seul (porté par le CSS). Défensif : no-op si pas de body.
  function _escFanfare(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function questFanfare(title) {
    if (!document.body) return;
    const el = document.createElement('div');
    el.className = 'quest-fanfare';
    el.innerHTML =
      '<span class="qf-flourish">❧</span>' +
      '<span class="qf-title">Quête accomplie !</span>' +
      '<span class="qf-name">' + _escFanfare(title) + '</span>';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // Public: combatBanner(label, kind) — P5 (combat-system-synthesis §2.4/§2.7)
  // Bandeau de callout transitoire centré en haut de l'arène, dans le même
  // esprit que le message « ⚡ Célérité ! » : signale à l'écran le déclenchement
  // d'un système récent (synergie de sort, artefact actif, focus-fire Tenaille,
  // rune d'environnement, contrecoup de corruption). `kind` pilote la teinte et
  // l'animation via la classe CSS .cb-<kind> (synergy|artifact|tenaille|rune|
  // backlash ; défaut info). Empilé dans une couche dédiée (#combat-banner-layer)
  // pour gérer plusieurs déclenchements rapprochés. Défensif : no-op hors arène.
  function ensureBannerLayer() {
    const overlay = document.getElementById('encounter-overlay');
    if (!overlay) return null;
    let layer = document.getElementById('combat-banner-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'combat-banner-layer';
    layer.className = 'combat-banner-layer';
    overlay.appendChild(layer);
    return layer;
  }
  function combatBanner(label, kind) {
    if (!label) return;
    const layer = ensureBannerLayer();
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'combat-banner cb-' + (kind || 'info');
    el.textContent = label;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // Public: tickNumber(el, from, to, ms, render) — K4
  // Interpole l'affichage d'un compteur (or/XP) de `from` à `to` sur `ms`
  // (easeOutCubic). `render(v)` écrit la valeur `v` (défaut : textContent) —
  // permet de préserver une icône autour du nombre. Auto-annulé si rappelé sur
  // le même élément (anti-empilement). reduced-motion → écrit `to` directement.
  function _tickReduced() {
    if (window.UIFeedback && typeof window.UIFeedback.reduced === 'function')
      return window.UIFeedback.reduced();
    return !!(window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function tickNumber(el, from, to, ms, render) {
    if (!el) return;
    const write = (typeof render === 'function') ? render : (v) => { el.textContent = String(v); };
    if (el._tickRAF) { cancelAnimationFrame(el._tickRAF); el._tickRAF = null; }
    if (_tickReduced() || !(ms > 0) || from === to || typeof from !== 'number') {
      write(to); return;
    }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      write(Math.round(from + (to - from) * eased));
      if (t < 1) { el._tickRAF = requestAnimationFrame(step); }
      else { el._tickRAF = null; write(to); }
    }
    el._tickRAF = requestAnimationFrame(step);
  }

  // ─────────────────────────────────────────────────────────
  // EXPORTS GLOBAUX
  // ─────────────────────────────────────────────────────────
  window.UX = {
    showTooltip, hideTooltip,
    logCombat, logCombatTurn, clearCombatLog,
    renderTimeline,
    floatDmg,
    cardReact,
    questFanfare,
    combatBanner,
    tickNumber
  };

  // Initialisation au DOMContentLoaded
  if (document.readyState !== 'loading') attachTooltipDelegation();
  else document.addEventListener('DOMContentLoaded', attachTooltipDelegation);
})();
