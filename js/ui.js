// ============================================================
// MISE À JOUR DE L'INTERFACE (HUD)
// ============================================================
// updateUI + helpers HUD (barres PV/PM/XP, blason, boussole, tracker de
// quête, narration, addMsg, closeModal). Fiche personnage :
// ui-character-sheet.js. Réglages (difficulté, visites) : ui-settings.js.

// Seuil de "PV bas" (fraction des PV max) partagé par l'état de carte K2
// (.low-hp) et la vignette de danger plein écran D2 (.cfx-danger).
const LOW_HP_RATIO = 0.25;

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

  // ── XP rapatriée dans chaque party-card (P3) ────────────────
  const xpPct = Math.max(0, Math.min(100, player.xp / player.xpNext * 100));
  for (let i = 0; i < 2; i++) {
    const lbl = document.getElementById(`xp-label-${i}`);
    const txt = document.getElementById(`xp-text-${i}`);
    const bar = document.getElementById(`xp-bar-${i}`);
    if (lbl) lbl.textContent  = `Niv.${player.level} — XP`;
    if (txt) txt.textContent  = `${player.xp}/${player.xpNext}`;
    if (bar) bar.style.width  = xpPct + '%';
  }
  // K4 — comptage animé de l'or : roll-up bref quand le total change (le
  // dernier total affiché est mémorisé sur l'attribut data-gold, pas dans
  // l'état de jeu). Préserve l'icône via le callback de rendu. Défensif :
  // sans UX.tickNumber, écriture directe. Ne clobbe pas une anim en cours.
  const goldEl = document.getElementById('gold-display');
  const goldRender = (v) => { goldEl.innerHTML = `<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${v} Gallions`; };
  const goldCur  = player.gold;
  const goldPrev = parseInt(goldEl.getAttribute('data-gold'), 10);
  if (window.UX && typeof UX.tickNumber === 'function'
      && Number.isFinite(goldPrev) && goldPrev !== goldCur) {
    UX.tickNumber(goldEl, goldPrev, goldCur, 450, goldRender);
  } else if (!goldEl._tickRAF) {
    goldRender(goldCur);
  }
  goldEl.setAttribute('data-gold', String(goldCur));
  const floorEl = document.getElementById('ghd-floor');
  if (floorEl && typeof currentFloor === 'number') floorEl.textContent = `ÉT.${currentFloor}`;

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

  // ── Anneaux header (XP gauche + Maison droite) ───────────────
  _updateXpWrap();
  _updateHouseBadge();
  if (typeof _updateVisitsBtn === 'function') _updateVisitsBtn();
  if (typeof _updateBarksBtn === 'function') _updateBarksBtn();

  // ── Statut KO sur les cartes ─────────────────────────────────
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (!card) return;
    const ko = c.hp <= 0;
    card.classList.toggle('ko-char', ko);
    // ── État "PV bas" par carte (K2) ──────────────────────────
    // Liseré rouge + pulsation sous le seuil de danger. Jamais sur un KO
    // (.ko-char a priorité). Purement dérivé de l'état, aucune variable neuve.
    const wasLow = card.classList.contains('low-hp');
    const isLow  = !ko && c.hpMax > 0 && c.hp / c.hpMax < LOW_HP_RATIO;
    card.classList.toggle('low-hp', isLow);
    // N2 — haptique : un seul buzz à l'ENTRÉE en état PV bas (front montant).
    if (isLow && !wasLow && typeof HAPTICS_safe !== 'undefined') HAPTICS_safe.lowHp();
  });

  // ── Vignette de danger bas-PV (D2) ───────────────────────────
  // Pulsation rouge en bord d'écran si un membre vivant du groupe est
  // sous le seuil de PV. Purement cosmétique (pointer-events:none, pur CSS).
  const inDanger = party.slice(0, partySize)
    .some(c => c.hp > 0 && c.hpMax > 0 && c.hp / c.hpMax < LOW_HP_RATIO);
  document.body.classList.toggle('cfx-danger', inDanger);

  // Musique adaptative de combat (F1) : re-évalue l'intensité (crossfade vers
  // la couche `tension` quand le groupe bascule en danger critique, et retour).
  // Self-gated (no-op hors combat / sur synthèse procédurale).
  if (inBattle && typeof AudioSystem !== 'undefined' && AudioSystem.updateCombatIntensity) {
    AudioSystem.updateCombatIntensity();
  }

  // ── Badge "points à allouer" sur le bouton Fiche ──────────────
  const badge = document.getElementById('char-alloc-badge');
  if (badge) {
    const total = party.slice(0, partySize)
      .reduce((s, c) => s + (c.unallocatedStatPoints || 0), 0);
    if (total > 0) {
      badge.textContent = total < 10 ? total : '▲';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  updateQuestTracker();
  updateRoomStatus();
}

// Étiquette courte (3-4 chars) inscrite dans le ruban du blason vivant.
// Suit le motif des paliers : « Apprenti Or » → OR, « Maître Argent » → ARG,
// « Légende »/« Mythe »/« Apothéose » → 3 premières lettres en capitales.
function _tierShortLabel(fullLabel) {
  if (!fullLabel) return '·';
  if (/ Or$/.test(fullLabel))      return 'OR';
  if (/ Argent$/.test(fullLabel))  return 'ARG';
  if (/ Bronze$/.test(fullLabel))  return 'BRZ';
  if (fullLabel === 'Légende')     return 'LÉG';
  if (fullLabel === 'Mythe')       return 'MYT';
  if (fullLabel === 'Apothéose')   return 'APO';
  // Série Apothéose ★ N : label de la forme "Apothéose ★ 12".
  const star = /★\s*(\d+)/.exec(fullLabel);
  if (star) return `★${star[1]}`;
  return fullLabel.slice(0, 3).toUpperCase();
}

// Pose l'anneau XP radial autour de l'icône Poudlard, à GAUCHE du header.
// Symétrique du blason Maison à droite (un anneau de chaque côté).
// Le ratio est player.xp / player.xpNext, le ruban affiche « Niv.X ».
function _updateXpWrap() {
  const wrap = document.getElementById('xp-wrap');
  if (!wrap || typeof player === 'undefined') return;
  const max = Math.max(1, player.xpNext || 1);
  const ratio = Math.max(0, Math.min(1, (player.xp || 0) / max));
  wrap.style.setProperty('--xp-ratio', String(ratio));
  wrap.title = `Niveau ${player.level} · XP ${player.xp}/${player.xpNext}`;
  const tier = document.getElementById('xp-tier');
  if (tier) tier.textContent = `Niv.${player.level}`;
}

// Pose l'anneau XP radial + le ruban tier sur #crest-wrap.
// Lecture pure de chosenHouse / housePoints / houseTier ; écriture DOM seule.
function _updateCrestWrap() {
  const wrap = document.getElementById('crest-wrap');
  if (!wrap) return;
  if (!chosenHouse) { wrap.style.display = 'none'; return; }

  const h     = HOUSE_BONUSES[chosenHouse];
  const tiers = h.tiers;
  // Au-delà du tier 18 (Apothéose), on entre dans la série génératrice
  // ★ N (cf. house-donation.js). `houseTier - 18` = numéro d'étoile actuel,
  // seuils calculés par la formule polynomiale du plan.
  const inStarSeries   = houseTier >= tiers.length;
  const starThreshold  = (n) => 45000 + 15000 * n + 1000 * n * n;
  const nextTier       = inStarSeries ? null : tiers[houseTier];
  const prevThreshold  = inStarSeries
    ? starThreshold(houseTier - 18)
    : (houseTier > 0 ? tiers[houseTier - 1].threshold : 0);
  const nextThreshold  = inStarSeries
    ? starThreshold(houseTier - 18 + 1)
    : (nextTier ? nextTier.threshold : tiers[tiers.length - 1].threshold);
  const hasNext  = inStarSeries || !!nextTier;
  const ratio    = hasNext
    ? Math.max(0, Math.min(1, (housePoints - prevThreshold) / (nextThreshold - prevThreshold)))
    : 1;
  const tierFull = inStarSeries
    ? `Apothéose ★ ${houseTier - 18}`
    : (houseTier > 0 ? tiers[houseTier - 1].label : null);
  const tierShort = _tierShortLabel(tierFull);

  wrap.style.display = '';
  wrap.style.setProperty('--crest-ratio', String(ratio));
  // Tooltip natif : ouvre la popup → texte explicite
  wrap.title = tierFull
    ? `${h.label} · ${tierFull} — ${housePoints}/${nextThreshold || housePoints} pts`
    : `${h.label} — Recrue`;

  const tierEl = document.getElementById('crest-tier');
  if (tierEl) tierEl.textContent = tierShort;

  // Garniture intérieure : clone du SVG du logo de Maison (existe dans
  // l'écran de sélection sous l'id `<house>-logo`).
  const inner = document.getElementById('crest-ring-inner');
  if (inner && !inner.dataset.house) {
    const svgEl = document.getElementById(chosenHouse.toLowerCase() + '-logo');
    if (svgEl) {
      const clone = svgEl.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      inner.innerHTML = '';
      inner.appendChild(clone);
      inner.dataset.house = chosenHouse;
    } else {
      inner.textContent = h.emoji || '🏰';
    }
  }
}

// Décrit le bonus d'un palier sous une forme courte affichable.
function _houseTierBonusText(tier) {
  if (!tier || !tier.bonus) return '';
  const b = tier.bonus;
  if (b.item) {
    const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(x => x.id === b.item) : null;
    return it ? `🎁 ${it.name}` : `🎁 ${b.item}`;
  }
  if (b.spell) return `📖 ${b.spell}`;
  const parts = [];
  if (b._baseAtk) parts.push(`+${b._baseAtk} ATK`);
  if (b._baseDef) parts.push(`+${b._baseDef} DEF`);
  if (b._baseMag) parts.push(`+${b._baseMag} MAG`);
  if (b._baseLck) parts.push(`+${b._baseLck} LCK`);
  return parts.join(' · ');
}

// Popup détail Maison (P4). Lecture pure de chosenHouse / housePoints /
// houseTier / pendingHouseRewards ; écriture DOM dans #house-detail-content.
function openHouseDetail() {
  const modal = document.getElementById('house-detail-modal');
  if (!modal) return;
  if (!chosenHouse) {
    if (typeof addMsg === 'function') addMsg('Aucune Maison choisie.', 'magic');
    return;
  }

  const h     = HOUSE_BONUSES[chosenHouse];
  const tiers = h.tiers;
  const nextTier = tiers[houseTier];
  const prevThreshold = houseTier > 0 ? tiers[houseTier - 1].threshold : 0;
  const nextThreshold = nextTier ? nextTier.threshold : tiers[tiers.length - 1].threshold;
  const ratio = nextTier
    ? Math.max(0, Math.min(1, (housePoints - prevThreshold) / (nextThreshold - prevThreshold)))
    : 1;
  const currentLabel = houseTier > 0 ? tiers[houseTier - 1].label : 'Recrue';

  // Titre
  const titleEl = document.getElementById('house-detail-modal-title');
  if (titleEl) titleEl.innerHTML = `${h.emoji} ${h.label}`;

  // Crest clone — réutilise le SVG <house>-logo de l'écran de sélection.
  const svgEl = document.getElementById(chosenHouse.toLowerCase() + '-logo');
  const crestHtml = svgEl
    ? svgEl.outerHTML.replace(/id="[^"]+"/, '').replace(/width="\d+"/, 'width="96"').replace(/height="\d+"/, 'height="96"')
    : `<div style="font-size:64px">${h.emoji}</div>`;

  // Liste des paliers
  const rowsHtml = tiers.map((t, i) => {
    const reached = housePoints >= t.threshold;
    const isCurrentGoal = !reached && (i === houseTier);
    const marker = reached ? '✓' : isCurrentGoal ? '►' : '·';
    const markerColor = reached
      ? 'var(--gold-light)'
      : isCurrentGoal ? 'var(--gold)' : '#6a5030';
    const opacity = reached ? '1' : isCurrentGoal ? '1' : '0.55';
    const pendingMark = (t.bonus && t.bonus.item
      && typeof pendingHouseRewards !== 'undefined'
      && pendingHouseRewards.has(t.bonus.item))
      ? ' <span style="color:#f0c060;font-size:10px;letter-spacing:1px">EN ATTENTE</span>'
      : '';
    return `
      <li class="hd-tier-row" data-reached="${reached}" data-goal="${isCurrentGoal}"
          style="opacity:${opacity}">
        <span class="hd-tier-marker" style="color:${markerColor}">${marker}</span>
        <span class="hd-tier-label">${t.label}</span>
        <span class="hd-tier-threshold">${t.threshold} pts</span>
        <span class="hd-tier-bonus">${_houseTierBonusText(t)}${pendingMark}</span>
      </li>`;
  }).join('');

  // Section récompenses en attente (gold-sink à réclamer auprès du chef de Maison)
  let pendingHtml = '';
  if (typeof pendingHouseRewards !== 'undefined' && pendingHouseRewards.size > 0) {
    const items = Array.from(pendingHouseRewards).map(id => {
      if (typeof ITEMS === 'undefined') return id;
      const it = ITEMS.find(x => x.id === id);
      return it ? it.name : id;
    });
    pendingHtml = `
      <div class="hd-pending">
        <div class="hd-section-title">🎁 Récompenses à réclamer</div>
        <div class="hd-pending-list">${items.join(' · ')}</div>
        <div class="hd-pending-hint">Rends-toi auprès du chef de Maison.</div>
      </div>`;
  }

  // Bonus de victoire
  const victoryMark = (typeof victoryAchieved !== 'undefined' && victoryAchieved)
    ? `<div class="hd-victory">🏆 Vainqueur de Voldemort</div>` : '';

  const goal = nextTier
    ? `<div class="hd-goal">Prochain palier : <strong>${nextTier.label}</strong> · ${housePoints}/${nextThreshold} pts</div>`
    : `<div class="hd-goal">Tous les paliers atteints — ${housePoints} pts</div>`;

  document.getElementById('house-detail-content').innerHTML = `
    <div class="hd-header">
      <div class="hd-crest">${crestHtml}</div>
      <div class="hd-meta">
        <div class="hd-tier-current">${currentLabel}</div>
        <div class="hd-desc">${h.desc || ''}</div>
        ${victoryMark}
      </div>
    </div>
    <div class="hd-progress">
      <div class="hd-progress-track">
        <div class="hd-progress-fill" style="width:${Math.round(ratio*100)}%;background:${h.accent}"></div>
      </div>
      ${goal}
    </div>
    ${pendingHtml}
    <div class="hd-section-title">📜 Paliers</div>
    <ul class="hd-tier-list">${rowsHtml}</ul>
  `;
  modal.style.display = 'flex';
}

function _updateHouseBadge() {
  // Depuis P4, le détail Maison vit dans la popup #house-detail-modal
  // (ouverte via le blason du header). Cette fonction ne pilote plus
  // qu'un seul affichage : le blason vivant du header.
  _updateCrestWrap();

  // L'ancien #house-crest de la sidebar est définitivement masqué — il
  // sera retiré du HTML dans une PR ultérieure.
  const crest = document.getElementById('house-crest');
  if (crest) crest.style.display = 'none';
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
    const bg = document.getElementById(`pcard-bg-${idx}`);
    if (bg) {
      const want = `url("${c.imgSrc}")`;
      if (bg.style.backgroundImage !== want) bg.style.backgroundImage = want;
    }
    const med = document.getElementById(`pcard-medaillon-${idx}`);
    if (med && med.getAttribute('src') !== c.imgSrc) med.setAttribute('src', c.imgSrc);
  }
  const slot = document.getElementById(`status-slot-${idx}`);
  if (slot && typeof renderStatusBadgeItems === 'function') _diffApplyStatusBadges(slot, c);

  // Mini-équipement party-card : 3 slots (arme + armure + amulette)
  const er = document.getElementById(`equip-row-${idx}`);
  if (er) {
    ['wand', 'body', 'amulet'].forEach(slotName => {
      const cell = er.querySelector(`.party-equip-slot[data-slot="${slotName}"]`);
      if (!cell) return;
      const item = c.equipped && c.equipped[slotName];
      const iconFn = (typeof getItemIconHtml === 'function')
                   ? getItemIconHtml
                   : null;
      const slotIconFn = (typeof getEquipmentSlotIconHtml === 'function')
                       ? getEquipmentSlotIconHtml
                       : null;
      if (item && iconFn) {
        cell.innerHTML = iconFn(item, 'ui-icon-sm');
        cell.title = `${item.name}`;
        cell.classList.add('filled');
      } else if (slotIconFn) {
        cell.innerHTML = slotIconFn(slotName, 'ui-icon-sm');
        cell.title = `${slotName} : vide`;
        cell.classList.remove('filled');
      } else {
        cell.innerHTML = '';
        cell.classList.remove('filled');
      }
    });
  }
}

// Diff l'état précédent de #status-slot-${idx} (stocké en slot.dataset.snap)
// avec le rendu courant des badges. Marque chaque pill :
//   • nouvelle (clé absente de snap)        → classe .status-badge-enter
//   • turns/stacks décrémenté (re-rendu)    → classe .status-badge-tick
//   • disparue (snap mais plus dans target) → ghost .status-badge-exit
//     ré-injecté juste après le slot, supprimé après 350 ms.
// Sans diff, le `slot.innerHTML = ...` rejouerait l'animation d'apparition
// à chaque updateUI() (très fréquent en combat).
function _diffApplyStatusBadges(slot, target) {
  const items = renderStatusBadgeItems(target);
  let prev = [];
  try { prev = JSON.parse(slot.dataset.snap || '[]'); } catch (e) {}
  const prevMap = new Map(prev.map(p => [p.key, p]));
  const newKeys = new Set(items.map(i => i.key));

  const pills = items.map(i => {
    const p = prevMap.get(i.key);
    let cls = '';
    if (!p) cls = 'status-badge-enter';
    else if (p.turns !== i.turns || (p.stacks || 1) !== (i.stacks || 1)) cls = 'status-badge-tick';
    return cls ? i.html.replace('class="status-pill"', `class="status-pill ${cls}"`) : i.html;
  });

  const exits = prev
    .filter(p => !newKeys.has(p.key))
    .map(p => p.html.replace('class="status-pill"', 'class="status-pill status-badge-exit"'));

  const allHtml = pills.concat(exits).join('');
  slot.innerHTML = allHtml ? `<div class="status-row">${allHtml}</div>` : '';

  slot.dataset.snap = JSON.stringify(items.map(i => ({
    key: i.key, turns: i.turns, stacks: i.stacks || 1, html: i.html
  })));

  if (exits.length) {
    setTimeout(() => {
      slot.querySelectorAll('.status-badge-exit').forEach(e => e.remove());
    }, 350);
  }
}

function updateCompass() {
  // L'Ouest s'affiche avec l'ID `dir-o` côté HTML (la lettre O).
  const idByDir = { n:'dir-n', s:'dir-s', e:'dir-e', w:'dir-o' };
  ['n','s','e','w'].forEach(d => {
    const el = document.getElementById(idByDir[d]);
    if (!el) return;
    const [dx, dy] = DIRECTIONS[d];
    const nx = playerX + dx, ny = playerY + dy;
    const free = nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && dungeon[ny][nx] !== CELL.WALL;
    el.classList.toggle('active', free);
    el.classList.toggle('facing', d === playerDir);
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
    el.innerHTML = '<div class="quest-tracker-empty">Aucune quête active</div>';
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
  const searched = (typeof _searchCellStatus === 'function')
    && _searchCellStatus(`${playerX},${playerY}`).state === 'recharging';
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

function closeModal(id) { const el = safeEl(id); if (el) el.style.display = 'none'; }

// La modale #character-modal est partagée par la Fiche, le Journal des Quêtes
// et les Réglages (tous peuplent #char-detail). Ce helper synchronise l'en-tête
// #character-modal-title pour qu'il corresponde au contenu affiché.
function setCharacterModalTitle(iconSrc, label) {
  const t = safeEl('character-modal-title');
  if (!t) return;
  t.innerHTML = `<img class="ui-icon ui-icon-xl" src="${iconSrc}" alt=""> ${label}`;
}

