// ============================================================
// COMBAT — Interface utilisateur (rendu ennemis, cibles, log)
// ============================================================

// ── Livrée de Maison (Lot 2c — biais de génération, levier cosmétique) ──
// Le donjon « se lit » selon la Maison du héros (doc 10 §10.6) : une fine aura
// colorée de Maison sur les cartes d'ennemi. POWER-NEUTRAL PAR CONSTRUCTION —
// rendu seul, aucun nom/stat/résistance/butin/spawn touché (donc 0 sim requis,
// contrairement à la pondération de salles, gardée derrière le gate Item 3).
// `HOUSE_SKIN_ENABLED` = repli V1 (mettre à false → comportement cosmétique V1).
const HOUSE_SKIN_ENABLED = true;
const _HOUSE_SKIN_CLASSES = {
  Gryffondor: 'house-skin-gryffondor', Serpentard: 'house-skin-serpentard',
  Serdaigle: 'house-skin-serdaigle',  Poufsouffle: 'house-skin-poufsouffle',
};
// PUR & testable (units.js) : classe de livrée pour une Maison, ou '' si le
// skin est désactivé / la Maison est absente/inconnue. Ne throw jamais.
function houseSkinClass(house, enabled) {
  if (!enabled || !house) return '';
  return _HOUSE_SKIN_CLASSES[house] || '';
}

// ── Sélection de cible ───────────────────────────────────────
// Scaffold partagé : construit les boutons dans #target-buttons et
// affiche #target-selection. `entries` = [{label, idx}] déjà filtré ;
// `onPick(idx)` est appelé au clic (le wrap est masqué avant l'appel).
function _showTargets(entries, onPick) {
  const wrap = document.getElementById('target-selection');
  const btns = document.getElementById('target-buttons');
  btns.innerHTML = '';
  entries.forEach(({ label, idx }, n) => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.style.fontSize = '10px';
    btn.dataset.targetIndex = n;          // ciblage clavier : touche n+1
    btn.textContent = `${n + 1}. ${label}`;
    btn.onclick = () => {
      wrap.style.display = 'none';
      onPick(idx);
    };
    btns.appendChild(btn);
  });
  // Bouton d'annulation (souris) — équivalent de la touche Échap.
  const cancel = document.createElement('button');
  cancel.className = 'cmd-btn target-cancel-btn';
  cancel.style.fontSize = '10px';
  cancel.textContent = '✖ Annuler (Échap)';
  cancel.onclick = _cancelTargetSelection;
  btns.appendChild(cancel);
  wrap.style.display = 'flex';
}

// Annule la sélection de cible en cours (clic « Annuler » ou touche Échap) :
// masque le panneau et purge l'action en attente.
function _cancelTargetSelection() {
  const wrap = document.getElementById('target-selection');
  if (wrap) wrap.style.display = 'none';
  pendingAction   = null;
  pendingSpell    = null;
  pendingThrowIdx = null;
}

function showTargetSelection(actionType) {
  pendingAction = actionType;
  const entries = [];
  enemyGroup.forEach((e, i) => {
    if (e.currentHp <= 0) return;
    entries.push({ label: `${e.icon} ${e.name} (${e.currentHp} PV)`, idx: i });
  });
  _showTargets(entries, (i) => {
    if      (pendingAction === 'attack')     executeAttack(i);
    else if (pendingAction === 'spell_dmg')  castSpellInBattle(pendingSpell, i);
    else if (pendingAction === 'throw_item') throwItemAtEnemy(pendingThrowIdx, i);
    else if (pendingAction === 'artifact')   useActiveArtifact(currentBattleChar, i); // P2 — artefact actif
    pendingAction   = null;
    pendingSpell    = null;
    pendingThrowIdx = null;
  });
}

// Sélection d'un allié vivant pour les sorts de soutien (Ferula, etc.).
// Stocke pendingSpell ; le clic sur un bouton allié relance castSpellInBattle
// avec le 3ᵉ argument `targetAllyIdx`.
function showAllyTargetSelection(spellName) {
  pendingSpell = spellName;
  const entries = [];
  activeParty().forEach((c, i) => {
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
// Variante "items" : retourne un tableau `[{key, turns, stacks, html}]`
// avec une clé stable par pill (statusId, 'protego', 'guard'). Sert au
// diff côté `_diffApplyStatusBadges` (Vague E) pour ne marquer enter/tick
// que sur les badges réellement nouveaux ou décrémentés.
function renderStatusBadgeItems(target) {
  const items = [];

  if (target && target.statusEffects && target.statusEffects.length) {
    target.statusEffects.forEach(s => {
      const def = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[s.id]) || { color: '#aaa' };
      const iconHtml = (typeof getStatusIconHtml === 'function')
        ? (getStatusIconHtml(s.id, 'ui-icon-sm') || s.icon)
        : s.icon;
      const stacks = s.stacks || 1;
      const tooltip = s.id === 'weaken'
        ? (stacks > 1
            ? `${def.label || s.id} −${s.power * stacks} DEF (${stacks} stacks)`
            : `${def.label || s.id} −${s.power} DEF`)
        : `${def.label || s.id} ${s.power}/tour`;
      const stackTag = stacks > 1 ? `<span class="status-pill-stack">×${stacks}</span>` : '';
      items.push({
        key: s.id,
        turns: s.turns,
        stacks,
        html: `<span class="status-pill" data-key="${s.id}" style="border-color:${def.color}" title="${tooltip}">${iconHtml}${s.turns}${stackTag}</span>`
      });
    });
  }

  if (typeof party !== 'undefined' && typeof shieldTurns !== 'undefined') {
    const idx = party.indexOf(target);
    if (idx === 0 || idx === 1) {
      const t = shieldTurns[idx] || 0;
      if (t > 0) {
        const iconHtml = (typeof getStatusIconHtml === 'function')
          ? (getStatusIconHtml('protego', 'ui-icon-sm') || '🛡️')
          : '🛡️';
        items.push({
          key: 'protego',
          turns: t,
          html: `<span class="status-pill" data-key="protego" style="border-color:#c9a84c" title="Protego — bloque l'attaque suivante (${t} tours)">${iconHtml}${t}</span>`
        });
      }
    }
  }

  if (typeof party !== 'undefined' && typeof guardTurns !== 'undefined') {
    const idx = party.indexOf(target);
    if ((idx === 0 || idx === 1) && (guardTurns[idx] || 0) > 0) {
      items.push({
        key: 'guard',
        turns: guardTurns[idx],
        html: `<span class="status-pill" data-key="guard" style="border-color:#cda52d" title="Garde — atténue le prochain coup ennemi de 50 %">🛡️G</span>`
      });
    }
  }
  return items;
}

// Version legacy (string HTML). Toujours utilisée par renderEnemyGroup
// (battle-ui.js:141) — les ennemis n'ont pas de diff anim.
function renderStatusBadges(target) {
  const items = renderStatusBadgeItems(target);
  if (!items.length) return '';
  return '<div class="status-row">' + items.map(i => i.html).join('') + '</div>';
}

// ── Rendu du groupe d'ennemis ────────────────────────────────
// Icône d'un ennemi (vivant) ou tuile « mort » partagée par la reconstruction
// complète et la mise à jour en place (P2-2).
function _enemyIconHtml(enemy, sizePx) {
  const dead = enemy.currentHp <= 0;
  return dead
    ? `<div class="monster-icon variant-dead" style="width:${sizePx}px;height:${sizePx}px;display:flex;align-items:center;justify-content:center"><img src="img/icons/dead.png" alt="" style="width:${Math.floor(sizePx*0.7)}px;height:${Math.floor(sizePx*0.7)}px;image-rendering:pixelated"></div>`
    : getMonsterIconHtml(enemy, sizePx);
}

const _VARIANT_TITLES = {
  shiny: 'Chatoyant', ancient: 'Ancien', darkness: 'Ténébreux', fierce: 'Féroce'
};
function _enemyBadgeHtml(enemy) {
  const variant = enemy.variant || 'normal';
  return enemy.currentHp > 0 && variant !== 'normal'
    ? `<span class="variant-badge variant-badge-${variant}" title="${_VARIANT_TITLES[variant] || ''}" aria-label="${_VARIANT_TITLES[variant] || ''}"></span>`
    : '';
}

// Signature de composition : tant qu'elle est stable (mêmes ennemis/variantes,
// même effectif), on mute les cartes en place au lieu de tout reconstruire à
// chaque tick de PV/statut. Change à l'apparition d'une invocation ou au début
// d'un combat.
let _enemyGroupSig = null;
function _enemyGroupSignature() {
  if (!Array.isArray(enemyGroup)) return '';
  return enemyGroup.length + '|' +
    enemyGroup.map(e => (e.id || '') + '/' + (e.variant || 'normal') + '/' + (e.corruption || 0)).join(',');
}

// Met à jour une carte existante (PV, barre, statuts, transition vers « mort »).
// Retourne false si une reconstruction complète est nécessaire (cas rare :
// résurrection mort → vivant).
function _updateEnemyCard(card, enemy, sizePx) {
  const dead = enemy.currentHp <= 0;
  if (!dead && card.classList.contains('enemy-dead')) return false; // rare : revive
  // PV (barre animée par la transition CSS en mutant la largeur en place).
  const pct = Math.max(0, (enemy.currentHp / enemy.hp) * 100);
  const fill = card.querySelector('.hp-fill');
  if (fill) fill.style.width = pct + '%';
  const lbl = card.querySelector('.bar-label span:last-child');
  if (lbl) lbl.textContent = `${Math.max(0, enemy.currentHp)}/${enemy.hp}`;
  // Transition vivant → mort : échange l'icône (le badge de variante disparaît).
  if (dead && !card.classList.contains('enemy-dead')) {
    const iconWrap = card.querySelector('.enemy-icon-wrap');
    if (iconWrap) iconWrap.innerHTML = _enemyIconHtml(enemy, sizePx);
  }
  card.classList.toggle('enemy-dead', dead);
  // Statuts : remplace la rangée de badges dans .enemy-bars.
  const bars = card.querySelector('.enemy-bars');
  if (bars) {
    const oldRow = bars.querySelector('.status-row');
    if (oldRow) oldRow.remove();
    if (!dead) {
      const html = renderStatusBadges(enemy);
      if (html) bars.insertAdjacentHTML('beforeend', html);
    }
  }
  return true;
}

function renderEnemyGroup() {
  const container = document.getElementById('enemy-group');
  if (!container) return;
  // Désintégration (G1) : un ennemi qui vient de tomber joue sa dissolution
  // UNE fois. L'effet est rendu sur une couche FX indépendante (ancre de
  // position), il ne dépend pas de la persistance de la carte. `_dissolvePlayed`
  // est un flag transient (jamais sérialisé). Purement visuel, via CFX_safe.
  if (typeof CFX_safe !== 'undefined' && Array.isArray(enemyGroup)) {
    enemyGroup.forEach((enemy, i) => {
      if (enemy && enemy.currentHp <= 0 && !enemy._dissolvePlayed) {
        enemy._dissolvePlayed = true;
        CFX_safe.deathDissolve(i, enemy);
      }
    });
  }
  const count = enemyGroup.length;

  // Layout adaptatif : icônes/barres plus compactes au-delà de 3 ennemis
  // (groupes endgame de 4-5) pour tenir à l'écran + flex-wrap CSS en mobile.
  const big     = count >= 4;
  const sizePx  = count === 1 ? 104 : (big ? 44 : 56);
  const nameFs  = count === 1 ? '15px' : (big ? '10px' : '11px');
  const barsW   = count === 1 ? '180px' : (big ? '96px' : '120px');

  // P2-2 : si la composition n'a pas changé, on mute les cartes existantes en
  // place (pas de reconstruction innerHTML de tout le groupe à chaque tick).
  const sig = _enemyGroupSignature();
  if (sig === _enemyGroupSig && container.childElementCount === count) {
    let ok = true;
    for (let i = 0; i < count && ok; i++) {
      const card = container.children[i];
      if (!card || !_updateEnemyCard(card, enemyGroup[i], sizePx)) ok = false;
    }
    if (ok) return;
  }

  // Reconstruction complète (1ᵉʳ rendu / changement de composition / revive).
  container.innerHTML = '';
  enemyGroup.forEach((enemy, i) => {
    const dead    = enemy.currentHp <= 0;
    const pct     = Math.max(0, (enemy.currentHp / enemy.hp) * 100);
    const variant = enemy.variant || 'normal';

    const iconHtml = _enemyIconHtml(enemy, sizePx);
    const badge    = _enemyBadgeHtml(enemy);

    const card = document.createElement('div');
    // Surcouche corruption (Chapitre 09 §9.1.2) : teinte froide + givre via CSS
    // pour les créatures des profondeurs (corruption >= 2). `||0` → no-op sur
    // les groupes pré-construits (duels) dépourvus du champ.
    const corr = enemy.corruption || 0;
    // Livrée de Maison (Lot 2c) : cosmétique, pilotée par la Maison du héros.
    const skin = houseSkinClass(
      (typeof chosenHouse !== 'undefined') ? chosenHouse : null, HOUSE_SKIN_ENABLED);
    card.className = `enemy-card variant-${variant} corruption-${corr}${skin ? ' ' + skin : ''}${dead ? ' enemy-dead' : ''}`;
    card.id = `enemy-card-${i}`;
    card.innerHTML = `
      <div class="enemy-icon-wrap" style="position:relative;display:inline-block;animation:float 2s ease-in-out infinite alternate">
        ${iconHtml}
        ${badge}
      </div>
      <div class="enemy-name" style="font-size:${nameFs}">${enemy.name}</div>
      <div class="enemy-bars" style="width:${barsW}">
        <div class="bar-label" style="font-size:9px"><span>PV</span><span>${Math.max(0, enemy.currentHp)}/${enemy.hp}</span></div>
        <div class="bar-track"><div class="bar-fill hp-fill" style="width:${pct}%"></div></div>
        ${dead ? '' : renderStatusBadges(enemy)}
      </div>
    `;
    container.appendChild(card);
    _attachMonsterInfoHandlers(card, i);
  });
  _enemyGroupSig = sig;
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
  _refreshBattleActionButtons();
}

// P2 — Affiche/masque les boutons d'action conditionnels (🏺 Artefact actif,
// 🔄 Posture du Duo) selon le perso actif et l'état du combat. Défensif :
// no-op si les boutons ne sont pas dans le DOM (anciens index.html).
function _refreshBattleActionButtons() {
  const artBtn = document.getElementById('btn-artifact');
  if (artBtn) {
    const char = party[currentBattleChar];
    const item = (typeof _activeArtifactFor === 'function') ? _activeArtifactFor(char) : null;
    const left = (item && typeof _artifactChargesLeft === 'function')
      ? _artifactChargesLeft(currentBattleChar, item.activeEffect) : 0;
    const show = !!(inBattle && item && left > 0);
    artBtn.style.display = show ? '' : 'none';
    if (show) artBtn.title = `${item.activeEffect.label} (1×/combat)`;
  }
  const postBtn = document.getElementById('btn-posture');
  if (postBtn) {
    const show = !!(inBattle && partySize === 2
      && typeof duoPostureSwitched !== 'undefined' && !duoPostureSwitched);
    postBtn.style.display = show ? '' : 'none';
    if (show && typeof duoPosture !== 'undefined') {
      postBtn.title = `Posture : ${duoPosture === 'phalange' ? 'Phalange → Tenaille' : 'Tenaille → Phalange'} (gratuit, 1×/combat)`;
    }
  }
  // P4 — bouton 🌿 Rune : visible en zone runique tant que la charge subsiste.
  const envBtn = document.getElementById('btn-env');
  if (envBtn) {
    const show = !!(inBattle && typeof envRuneCharge !== 'undefined' && envRuneCharge > 0);
    envBtn.style.display = show ? '' : 'none';
    if (show) envBtn.title = 'Activer la rune : étourdit l\'ennemi le plus proche (1×/combat)';
  }
}

function setBattleLog(text) {
  const el = document.getElementById('battle-log');
  if (!el) return;
  // innerHTML pour permettre <img> des sortilèges/status. Tous les
  // appelants construisent des templates contrôlés (pas d'input user).
  el.innerHTML = (typeof iconizeCombatLog === 'function') ? iconizeCombatLog(text) : text;
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

// `opts.revealed` (sort Revelio) force les trois paliers à s'afficher
// quel que soit `monsterKills` — la ligne « vaincue X fois » reste exacte.
function showMonsterCombatInfo(idx, opts) {
  const enemy   = enemyGroup && enemyGroup[idx];
  const content = document.getElementById('monster-info-content');
  const overlay = document.getElementById('monster-info-overlay');
  if (!enemy || !content || !overlay) return;

  const realKills = _monsterKillCount(enemy.id);
  const revealed  = !!(opts && opts.revealed);
  const kills     = revealed ? MONSTER_INFO_TIERS.deep : realKills;
  const goldRange = (typeof enemy.gold === 'object')
    ? `${enemy.gold.min}–${enemy.gold.max}` : enemy.gold;

  let html = `
    <div class="mi-header">
      <div class="mi-icon">${getMonsterIconHtml(enemy, 88)}</div>
      <div class="mi-titles">
        <h2 class="mi-name">${enemy.name}</h2>
        <div class="bestiary-floor-tag">${(enemy.category || '').toUpperCase()}</div>
        ${_renderDangerHtml(enemy)}
        <div class="mi-kills">⚔️ Espèce vaincue ${realKills} fois</div>
        ${revealed ? '<div class="mi-kills">🔎 Révélé par Revelio</div>' : ''}
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
