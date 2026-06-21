// ============================================================
// FICHE PERSONNAGE (modale #character-modal / #char-detail)
// ============================================================
// openCharacter + paper-doll, panneau Set Maison, badges de sorts, sac,
// allocation de points, carnet de voyage. Chargé APRÈS ui.js.
// ============================================================
// ── Rendu de la grille d'équipement (fiche perso) ────────────
// 11 slots étendus, ordre stable. Chaque ligne = icône slot ou icône
// item équipé + nom. Les slots vides retombent sur l'icône slot
// générique via getEquipmentSlotIconHtml().
const EQUIP_SLOT_LABELS = [
  ['wand',    'Baguette'],
  ['head',    'Tête'],
  ['body',    'Armure'],
  ['hands',   'Gants'],
  ['feet',    'Bottes'],
  ['cloak',   'Cape'],
  ['amulet',  'Amulette'],
  ['ring1',   'Anneau ◀'],
  ['ring2',   'Anneau ▶'],
  ['belt',    'Ceinture'],
  ['trinket', 'Bibelot']
];

const EQUIP_SLOT_LABELS_MAP = Object.fromEntries(EQUIP_SLOT_LABELS);

// Slots du paper doll. Classes conservées (.equip-slot-floating +
// equip-slot-${slot}) pour la compatibilité du smoke test. En v2 le
// positionnement est en flex/grid via .paper-doll-col / .paper-doll-bottom
// dans style.css — plus de position:absolute.
function _renderPaperDollSlot(slot, c, charIdx) {
  const item = c.equipped && c.equipped[slot];
  const icon = item
    ? getItemIconHtml(item, 'ui-icon')
    : getEquipmentSlotIconHtml(slot, 'ui-icon');
  const filled    = !!item;
  const rarityCls = item && item.rarity ? `rarity-${item.rarity}` : '';
  const baseLabel = EQUIP_SLOT_LABELS_MAP[slot] || slot;
  const titleAttr = item ? `${item.name} — cliquer pour déséquiper` : baseLabel;
  const onclick   = (item && Number.isInteger(charIdx))
    ? `onclick="unequipFromSlot(${charIdx}, '${slot}')"`
    : '';
  const focusAttr = onclick ? 'tabindex="0"' : ''; // atteignable au clavier si cliquable
  const tooltipHtml = item
    ? _renderItemTooltip(item, baseLabel, 'cliquer pour déséquiper')
    : '';
  return `<div class="equip-slot-floating equip-slot-${slot} ${filled ? 'filled' : 'empty'} ${rarityCls}"
               title="${titleAttr.replace(/"/g, '&quot;')}" ${focusAttr} ${onclick}>${icon}${tooltipHtml}</div>`;
}

// Badge pour un sort connu. Cherche l'icône PNG sous img/icons/spells/
// (slug normalisé du nom). Fallback emoji si l'image n'existe pas.
function _renderSpellBadge(spellName) {
  // SPELL_ICON_REGISTRY (item-icons.js) connaît les sorts dont le PNG
  // n'a pas le même nom que le slug (ex: Portus → teleportation.png).
  // Slug-only échoue silencieusement (onerror) pour ces sorts → carré
  // noir vide dans le badge. On consulte le registry en priorité ;
  // fallback sur le slug pour les sorts non listés.
  let path = (typeof SPELL_ICON_REGISTRY === 'object' && SPELL_ICON_REGISTRY)
    ? SPELL_ICON_REGISTRY[spellName] : null;
  if (!path) {
    const slug = String(spellName)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    path = `img/icons/spells/${slug}.png`;
  }
  return `<span class="spell-badge">
    <span class="icon"><img src="${path}" alt="" onerror="this.style.display='none'"></span>
    ${spellName}
  </span>`;
}

// Slot d'inventaire pour la grille du sac. Cliquer un item :
// - consommable → applique sur charIdx
// - équipement  → equipItem(idx, charIdx) (anneau routé ring1/ring2)
// - livre sort  → enseigne au groupe
function _renderInvSlot(item, idx, charIdx) {
  if (!item) return `<div class="inv-slot"></div>`;
  const rarityCls = item.rarity ? `rarity-${item.rarity}` : '';
  const icon = getItemIconHtml(item, 'ui-icon');
  let actionHint = 'utiliser';
  if (item.type === 'consumable')      actionHint = 'consommer';
  else if (item.type === 'spellbook')  actionHint = 'apprendre';
  else if (item.slot)                  actionHint = 'équiper';
  const titleAttr = `${item.name} — cliquer pour ${actionHint}`.replace(/"/g, '&quot;');
  const onclick = Number.isInteger(charIdx)
    ? `onclick="useItemFromChar(${idx}, ${charIdx})"`
    : '';
  const focusAttr = onclick ? 'tabindex="0"' : ''; // atteignable au clavier si cliquable
  const tooltipHtml = _renderItemTooltip(item, null, `cliquer pour ${actionHint}`);
  const qty = (typeof _itemQty === 'function') ? _itemQty(item) : (item.qty || 1);
  const qtyBadge = qty > 1 ? `<span class="inv-qty-badge">×${qty}</span>` : '';
  return `<div class="inv-slot has-item ${rarityCls}" title="${titleAttr}" ${focusAttr} ${onclick}>${icon}${qtyBadge}${tooltipHtml}</div>`;
}

// Tooltip riche affiché au hover sur un slot rempli (paper-doll OU sac).
// Affiche : nom (coloré selon rareté), type/slot, bonus, regen, grantsSpell,
// description, prix. Tout est calculé depuis les champs de l'item.
function _renderItemTooltip(item, slotLabel, action) {
  if (!item) return '';
  const rarity = item.rarity || 'common';
  const rarityLabel = { common:'Commun', rare:'Rare', epic:'Épique', legendary:'Légendaire' }[rarity] || rarity;
  const slotName = slotLabel || EQUIP_SLOT_LABELS_MAP[item.slot] || (
    item.type === 'consumable' ? 'Consommable' :
    item.type === 'spellbook'  ? 'Livre de sort' : ''
  );
  const bonuses = [];
  if (item.bonusAtk) bonuses.push(`+${item.bonusAtk} Attaque`);
  if (item.bonusDef) bonuses.push(`+${item.bonusDef} Défense`);
  if (item.bonusMag) bonuses.push(`+${item.bonusMag} Magie`);
  if (item.bonusLck) bonuses.push(`+${item.bonusLck} Chance`);
  if (item.bonusStr) bonuses.push(`+${item.bonusStr} Force`);
  if (item.bonusInt) bonuses.push(`+${item.bonusInt} Intelligence`);
  if (item.bonusAgi) bonuses.push(`+${item.bonusAgi} Agilité`);
  if (item.bonusEnd) bonuses.push(`+${item.bonusEnd} Endurance`);
  if (item.regenHp)  bonuses.push(`+${item.regenHp} PV / tour`);
  if (item.regenSp)  bonuses.push(`+${item.regenSp} PM / tour`);
  if (item.grantsSpell) bonuses.push(`Apprend : ${item.grantsSpell}`);
  if (item.spell)        bonuses.push(`Enseigne : ${item.spell}`);
  // C5/P1 — potion brassée : signale la potency bakée (cf. potions.js).
  if (item.brewed || typeof item.brewPotency === 'number') {
    const p = (typeof item.brewPotency === 'number')
      ? item.brewPotency
      : ((typeof BREW_POTENCY_BONUS !== 'undefined') ? BREW_POTENCY_BONUS : 0.25);
    const pct = (p >= 0 ? '+' : '') + Math.round(p * 100) + '%';
    bonuses.push(`<img class="ui-icon ui-icon-md" src="img/icons/items/potion_m.png" alt=""> ${p < 0 ? 'Fiole diluée' : 'Brassage maison'} : ${pct} d'effet`);
  }

  // Enchantement rerollable (Piste D) — affixe posé à la Forge.
  const enchLine = (item.enchant && item.enchant.label)
    ? `<span class="tt-bonus" style="color:var(--gold-light)">✨ Enchantement : ${item.enchant.disp || ''} ${item.enchant.label}</span>`
    : '';

  const bonusLines = bonuses.map(b => `<span class="tt-bonus">${b}</span>`).join('') + enchLine;
  const desc = item.desc ? `<span class="tt-desc">${item.desc}</span>` : '';
  const actionLine = action ? `<span class="tt-action">→ ${action}</span>` : '';

  return `<div class="item-tooltip" role="tooltip">
    <span class="tt-name">${item.name}</span>
    <span class="tt-rarity rarity-${rarity}">${rarityLabel}${slotName ? ' · ' + slotName : ''}</span>
    ${bonusLines}
    ${desc}
    ${actionLine}
  </div>`;
}

// Une ligne de stat dans le panneau gauche.
function _renderStatLine(iconPath, label, value, derived = false) {
  return `<div class="stat-line${derived ? ' derived' : ''}">
            <img class="ui-icon ui-icon-md" src="${iconPath}" alt="">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
          </div>`;
}

// Construit la valeur affichée d'une stat avec son bonus.
// Ex: base 8, total 12 → "8 <span class='stat-bonus'>+4</span>"
//     base 9, total 9  → "9"
// Si _base${Key} n'existe pas (cas legacy), on tombe sur le total tel quel.
function _renderStatValueWithBonus(c, key, baseKey) {
  const total = c[key];
  if (total == null) return '—';
  const base  = c[baseKey];
  if (base == null || base === total) return String(total);
  const bonus = total - base;
  if (bonus <= 0) return String(total);
  return `${base} <span class="stat-bonus">+${bonus}</span>`;
}

// ── Encart Set Maison sur la fiche perso (Étape 5 Maisons 2.0) ──
// Affiche les 4 médaillons du set de la Maison choisie + l'état de
// chaque pièce (équipée / au sac / en attente chez le Chef / à
// découvrir) + la grille de bonus 2/3/4 pièces avec les paliers
// futurs grisés. Cf. .claude/plans/houses-2.0.md §B.
const _SET_PIECE_STATE_LABELS = {
  equipped: 'équipée',
  in_inv:   'au sac',
  pending:  'en attente chez le Chef de Maison',
  missing:  'à découvrir'
};

function _setPieceState(itemId, c) {
  const equipped = c && c.equipped &&
    Object.values(c.equipped).some(it => it && it.id === itemId);
  if (equipped) return 'equipped';
  const inInv = (player.inventory || []).some(it => it && it.id === itemId);
  if (inInv) return 'in_inv';
  const pending = (typeof pendingHouseRewards !== 'undefined') &&
    pendingHouseRewards.has(itemId);
  if (pending) return 'pending';
  return 'missing';
}

function _formatSetBonus(b) {
  if (!b) return '';
  const parts = [];
  if (b.bonusAtk)            parts.push(`+${b.bonusAtk} ATK`);
  if (b.bonusDef)            parts.push(`+${b.bonusDef} DEF`);
  if (b.bonusMag)            parts.push(`+${b.bonusMag} MAG`);
  if (b.bonusLck)            parts.push(`+${b.bonusLck} LCK`);
  if (b.bonusStr)            parts.push(`+${b.bonusStr} FOR`);
  if (b.bonusInt)            parts.push(`+${b.bonusInt} INT`);
  if (b.bonusAgi)            parts.push(`+${b.bonusAgi} AGI`);
  if (b.bonusEnd)            parts.push(`+${b.bonusEnd} END`);
  if (b.bonusCritChance)     parts.push(`+${b.bonusCritChance}% crit`);
  if (b.bonusCritDamage)     parts.push(`+${Math.round(b.bonusCritDamage*100)}% dég. crit`);
  if (b.bonusSpellCritChance)parts.push(`+${b.bonusSpellCritChance}% crit sort`);
  if (b.bonusSpellCritDamage)parts.push(`+${Math.round(b.bonusSpellCritDamage*100)}% dég. crit sort`);
  if (b.bonusDodgeChance)    parts.push(`+${b.bonusDodgeChance}% esquive`);
  if (b.regenHp)             parts.push(`+${b.regenHp} PV/tour`);
  if (b.regenSp)             parts.push(`+${b.regenSp} PM/tour`);
  if (b.spellLifesteal)      parts.push(`drain ${Math.round(b.spellLifesteal*100)}% sur sort`);
  if (b.spellCostReduction)  parts.push(`-${Math.round(b.spellCostReduction*100)}% coût sort`);
  if (b.immuneDisarm)        parts.push('immunité désarmement');
  return parts.join(' · ') || '—';
}

function _renderHouseSetPanel(c) {
  if (typeof chosenHouse === 'undefined' || !chosenHouse) return '';
  if (typeof HOUSE_SETS === 'undefined') return '';
  const set = HOUSE_SETS[chosenHouse];
  if (!set) return '';

  const cells = set.pieceIds.map((id, i) => {
    const item  = ITEMS.find(it => it.id === id);
    const state = _setPieceState(id, c);
    const label = _SET_PIECE_STATE_LABELS[state] || '';
    const icon  = item ? getItemIconHtml(item, 'ui-icon-md') : '';
    const name  = item ? item.name : id;
    const tip   = item ? `${name} — ${label}<br>${item.desc || ''}` : '';
    return `
      <div class="set-cell set-cell-${state}" data-tooltip="${tip}">
        <div class="set-cell-icon">${icon}</div>
        <div class="set-cell-num">${i + 1}/4</div>
      </div>
    `;
  }).join('');

  const count = c['_' + set.setKey + 'Count'] | 0;
  const tiers = [
    { n: 2, b: set.setBonus2 },
    { n: 3, b: set.setBonus3 },
    { n: 4, b: set.setBonus4 }
  ];
  // À 0/4 pièces, on remplace la liste détaillée des 3 bonus inactifs
  // par une seule ligne de teasing (~80 px économisés sur la fiche
  // desktop, qui débordait). À 1/4+, on affiche tous les bonus pour
  // pousser à compléter le set.
  let bonusRows;
  if (count === 0) {
    bonusRows = `<div class="set-bonus-row inactive set-bonus-teaser">
      <span class="set-bonus-text">Équipe une pièce pour activer les bonus de set.</span>
    </div>`;
  } else {
    bonusRows = tiers.map(({n, b}) => {
      const active = count >= n;
      return `<div class="set-bonus-row ${active ? 'active' : 'inactive'}">
        <span class="set-bonus-tier">${n}/4</span>
        <span class="set-bonus-text">${_formatSetBonus(b)}</span>
      </div>`;
    }).join('');
  }

  return `
    <div class="section section-houseset">
      <button class="section-toggle" onclick="_toggleCharSection(this)">Set Maison</button>
      <div class="panel-title">⸻ ${set.setLabel.toUpperCase()} (${count}/4) ⸻</div>
      <div class="set-cells">${cells}</div>
      <div class="set-bonuses">${bonusRows}</div>
    </div>
  `;
}

// Encart « Synergies actives » (combat-synthesis §1.3 / P1) : lecture du build,
// liste les couples Artefact↔Sort↔Maison effectivement débloqués (artefact Premium
// de Maison ou pivot d'évolution équipé). Masqué si aucune synergie active.
function _renderSynergyPanel(c) {
  if (typeof spellSynergiesFor !== 'function') return '';
  const syns = spellSynergiesFor(c) || [];
  if (!syns.length) return '';
  const rows = syns.map(syn => {
    // Nom réel de l'artefact équipé (id ou premiumOf correspondant).
    const eqItem = c.equipped
      ? Object.values(c.equipped).find(it => it && (it.id === syn.artifact || it.premiumOf === syn.artifact))
      : null;
    const artName = eqItem ? eqItem.name : syn.artifact;
    const arrow   = syn.kind === 'evolution'
      ? `${syn.spell} → <strong>${syn.form}</strong>`
      : `<strong>${syn.spell}</strong> surchargé`;
    const houseTag = syn.house ? ` · ${syn.house}` : '';
    return `<div class="synergy-row" style="display:flex;flex-direction:column;gap:1px;padding:4px 0;border-bottom:1px dashed rgba(216,182,71,0.18)">
        <span style="font-size:11px;color:#f7e4a8">🔗 ${arrow}</span>
        <span style="font-size:9px;color:#8a7050">via ${artName}${houseTag}</span>
      </div>`;
  }).join('');
  return `
    <div class="section section-synergies">
      <button class="section-toggle" onclick="_toggleCharSection(this)">Synergies</button>
      <div class="panel-title">⸻ SYNERGIES ACTIVES (${syns.length}) ⸻</div>
      ${rows}
    </div>`;
}

// Fiche de personnage v2 — grid-template-areas :
//   "stats equip"
//   "stats spells"
//   "stats inv"
// Stats prend les 3 rows à gauche. Équipement / Sortilèges / Sac
// s'empilent à droite — plus de gap structurel parasite.
// Paper-doll : flex column avec une paper-doll-main (3 cols [50px][auto][50px])
// et une paper-doll-bottom (rangée wand/belt/trinket). Stage carré contraint
// par les 4 slots latéraux via align-items:stretch.
// P2 — Encart « Posture du Duo » (combat-system-synthesis §1.1). Visible
// uniquement en Duo. Choix persistant (sérialisé), set-and-forget hors combat ;
// en combat, une bascule gratuite 1×/combat reste disponible (bouton 🔄).
function _renderDuoPosturePanel() {
  if (typeof partySize === 'undefined' || partySize !== 2) return '';
  const cur = (typeof duoPosture !== 'undefined') ? duoPosture : 'phalange';
  const card = (key, title, desc) => {
    const on = cur === key;
    return `<button class="cmd-btn" onclick="setDuoPosture('${key}')" style="flex:1;text-align:left;padding:6px;font-size:10px;${on ? 'border-color:var(--gold);background:rgba(216,182,71,0.12)' : ''}">
        <div style="color:${on ? '#f7e4a8' : '#c9b27a'};font-weight:bold">${on ? '✓ ' : ''}${title}</div>
        <div style="color:#8a7050;font-size:9px;margin-top:2px">${desc}</div>
      </button>`;
  };
  return `
    <div class="section section-posture">
      <button class="section-toggle" onclick="_toggleCharSection(this)">Posture du Duo</button>
      <div class="panel-title">⸻ POSTURE DU DUO ⸻</div>
      <div style="display:flex;gap:6px">
        ${card('phalange', '🛡️ Phalange', 'Défensif : l\'avant attire les coups (+20 %) ; l\'arrière, plus fragile, est protégé.')}
        ${card('tenaille', '⚔️ Tenaille', 'Offensif : focus-fire (+15 % sur une cible déjà frappée par l\'autre héros).')}
      </div>
    </div>`;
}
// Change la posture persistante hors combat (refuse en combat : passer par 🔄).
function setDuoPosture(key) {
  if (typeof inBattle !== 'undefined' && inBattle) return;
  if (key !== 'phalange' && key !== 'tenaille') return;
  duoPosture = key;
  if (typeof openCharacter === 'function') openCharacter(_lastCharIdx || 0);
}
let _lastCharIdx = 0;

function openCharacter(charIdx = 0) {
  _lastCharIdx = (charIdx >= 0 && charIdx < (typeof partySize !== 'undefined' ? partySize : 2)) ? charIdx : 0;
  // En mode solo, partySize=1 → on borne charIdx à 0 même si l'appel
  // demande Hermione (peut arriver via état legacy ou bouton resté affiché).
  if (charIdx >= partySize) charIdx = 0;
  const c      = party[charIdx];
  const detail = document.getElementById('char-detail');

  // Onglets : un seul perso visible en solo, deux en duo.
  const tabs = party.slice(0, partySize).map((p, i) =>
    `<button class="cmd-btn" style="font-size:10px;${i === charIdx ? 'border-color:var(--gold)' : ''}" onclick="openCharacter(${i})">${p.icon} ${p.name.split(' ')[0]}</button>`
  ).join('');

  // Bouton « Mon rang » : ouvre le Hall of Fame avec une simulation du
  // run en cours. Réservé au mode Ironman (seul mode classé).
  const hofProjBtn = (typeof ironmanMode !== 'undefined' && ironmanMode)
    ? `<button class="cmd-btn" style="font-size:10px;margin-left:auto"`
      + ` onclick="openHofProjection()"><img class="ui-icon ui-icon-md" src="img/icons/trophy.png" alt=""> Mon rang</button>`
    : '';

  const xpPct = Math.max(0, Math.min(100, Math.floor((player.xp / Math.max(1, player.xpNext)) * 100)));

  // Slots regroupés par zone visuelle du paper-doll.
  const slotsLeft   = ['head','body','hands','feet']  .map(s => _renderPaperDollSlot(s, c, charIdx)).join('');
  const slotsRight  = ['cloak','amulet','ring1','ring2'].map(s => _renderPaperDollSlot(s, c, charIdx)).join('');
  const slotsBottom = ['wand','belt','trinket']        .map(s => _renderPaperDollSlot(s, c, charIdx)).join('');

  const critMult  = (c.critMultiplier != null) ? c.critMultiplier : 1.5;
  const sCritMult = (c.spellCritMultiplier != null) ? c.spellCritMultiplier : 1.5;
  const critPct      = (c.critChance != null)
    ? `${Math.round(c.critChance)}% ×${critMult.toFixed(2)}` : '—';
  const spellCritPct = (c.spellCritChance != null)
    ? `${Math.round(c.spellCritChance)}% ×${sCritMult.toFixed(2)}` : '—';
  const dodgePct = (c.dodgeChance != null) ? `${Math.round(c.dodgeChance)}%` : '—';
  // Fortune (D5 — volet LCK) : pilote drops, or, trouvailles et fuite. Inclut
  // le buff Félix actif. Cf. .claude/plans/luck-fortune.md §2.5.
  const felixOn  = (typeof felixFortuneSteps !== 'undefined' && felixFortuneSteps > 0);
  const fortX    = ((c._fortuneX != null) ? c._fortuneX : (c.lck || 0))
                 + (felixOn ? ((typeof FELIX_POINTS === 'number') ? FELIX_POINTS : 40) : 0);
  const fortunePct = (typeof _fortuneCurve === 'function')
    ? `${Math.round(_fortuneCurve(fortX) * 100)}%${felixOn ? ' ✨' : ''}` : '—';
  // Célérité (D5 — volet AGI) : taux d'actions supplémentaires par round (gain
  // de tour fluide). Cf. .claude/plans/agi-derived.md §2.2.
  const celeritePct = (c.celerite != null)
    ? `${Math.round(c.celerite * 100)}%` : '—';

  // Panneau d'allocation : visible uniquement si des points sont en attente.
  const statPts = c.unallocatedStatPoints || 0;
  const allocPanel = statPts > 0 ? _renderStatAllocPanel(charIdx, statPts) : '';

  // Panneau Set Maison : visible uniquement si une Maison est choisie.
  // Cf. .claude/plans/houses-2.0.md §B (Étape 5) — encart 4 médaillons +
  // bonus paliers 2/3/4 pièces.
  const houseSetPanel = _renderHouseSetPanel(c);

  // Sortilèges sous forme de badges PNG. c.spells = liste de noms.
  const spellsHtml = (c.spells || []).map(_renderSpellBadge).join('');

  // Sac : grille fixe 16 slots (INVENTORY_MAX). Items + slots vides.
  const inv = player.inventory || [];
  let invHtml = '';
  for (let i = 0; i < 16; i++) invHtml += _renderInvSlot(inv[i], i, charIdx);

  detail.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center">${tabs}${hofProjBtn}</div>
    <div class="char-grid">

      <!-- Stats (grid-area:stats) -->
      <div class="section section-stats char-stats-panel">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Statistiques</button>
        <div class="level-banner">
          <div class="lvl">${c.name.split(' ')[0]} — Niveau ${c.level}</div>
          <div style="font-size:10px;color:#8a7050;margin-top:2px">${c.class}</div>
          <div class="xp-bar"><span style="width:${xpPct}%"></span></div>
          <div style="font-size:9px;color:#6a5030;margin-top:2px">XP ${player.xp}/${player.xpNext}</div>
        </div>
        ${allocPanel}
        ${_renderStatLine('img/icons/hp.png',  'Vie',         `${c.hp}/${c.hpMax}`)}
        ${_renderStatLine('img/icons/mp.png',  'Mana',        `${c.sp}/${c.spMax}`)}
        ${_renderStatLine('img/icons/atk.png', 'Attaque',     _renderStatValueWithBonus(c, 'atk', '_baseAtk'))}
        ${_renderStatLine('img/icons/def.png', 'Défense',     _renderStatValueWithBonus(c, 'def', '_baseDef'))}
        ${_renderStatLine('img/icons/mag.png', 'Magie',       _renderStatValueWithBonus(c, 'mag', '_baseMag'))}
        ${_renderStatLine('img/icons/str.png', 'Force',       _renderStatValueWithBonus(c, 'str', '_baseStr'))}
        ${_renderStatLine('img/icons/int.png', 'Intelligence',_renderStatValueWithBonus(c, 'int', '_baseInt'))}
        ${_renderStatLine('img/icons/agi.png', 'Agilité',     _renderStatValueWithBonus(c, 'agi', '_baseAgi'))}
        ${_renderStatLine('img/icons/hp.png',  'Endurance',   _renderStatValueWithBonus(c, 'end', '_baseEnd'))}
        ${_renderStatLine('img/icons/xp.png',  'Chance',      _renderStatValueWithBonus(c, 'lck', '_baseLck'))}
        ${_renderStatLine('img/icons/atk.png', 'Critique',    critPct,      true)}
        ${_renderStatLine('img/icons/mag.png', 'Crit. sort',  spellCritPct, true)}
        ${_renderStatLine('img/icons/agi.png', 'Esquive',     dodgePct,     true)}
        ${_renderStatLine('img/icons/xp.png',  '🍀 Fortune',  fortunePct,   true)}
        ${_renderStatLine('img/icons/agi.png', '⚡ Célérité',  celeritePct,  true)}
        ${(typeof hiverClair !== 'undefined' && hiverClair)
          ? _renderStatLine('img/icons/mp.png', '❄️ Hiver Clair', '+1 PM/pas', true) : ''}
        ${(typeof headlessHuntMember !== 'undefined' && headlessHuntMember)
          ? _renderStatLine('img/icons/xp.png', '💀 Chasse Sans Tête', 'Membre d\'honneur', true) : ''}
        ${(typeof maitreDeLaMort !== 'undefined' && maitreDeLaMort)
          ? _renderStatLine('img/icons/xp.png', '☠️ Maître de la Mort', 'Reliques unies', true) : ''}
        ${(typeof victoryAchieved !== 'undefined' && victoryAchieved
           && typeof floorReached === 'number' && floorReached >= 11
           && typeof loopNumber === 'function')
          ? _renderStatLine('img/icons/xp.png', '🌀 Boucle ' + loopNumber(floorReached),
              '🔹 ' + ((typeof accumulatedEclats !== 'undefined') ? accumulatedEclats : 0) + ' Éclats', true)
          : ''}
        ${(typeof cycleBroken !== 'undefined' && cycleBroken)
          ? _renderStatLine('img/icons/xp.png', '🕊️ Cycle Brisé', 'La faille rescellée', true) : ''}
      </div>

      <!-- Équipement (grid-area:equip) -->
      <div class="section section-equip">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Équipement</button>
        <div class="paper-doll">
          <div class="paper-doll-main">
            <div class="paper-doll-col left">${slotsLeft}</div>
            <div class="paper-doll-stage">
              <img class="pd-portrait" src="${c.imgSrc || ''}" alt="${c.name}">
            </div>
            <div class="paper-doll-col right">${slotsRight}</div>
          </div>
          <div class="paper-doll-bottom">${slotsBottom}</div>
          <div class="gold-banner">
            <img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> ${player.gold}
          </div>
        </div>
      </div>

      ${houseSetPanel}

      <!-- Sortilèges (grid-area:spells) -->
      <div class="section section-spells char-spells-panel">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Sortilèges</button>
        <div class="panel-title">⸻ SORTILÈGES CONNUS ⸻</div>
        <div class="spells-row">${spellsHtml}</div>
      </div>

      ${_renderSynergyPanel(c)}

      ${_renderDuoPosturePanel()}

      ${_renderCarnetVoyagePanel(c)}

      <!-- Sac (grid-area:inv) -->
      <div class="section section-inv">
        <button class="section-toggle" onclick="_toggleCharSection(this)">Sac</button>
        <div class="panel-title">⸻ SAC — ${inv.length} / 16 ⸻</div>
        <div class="inv-grid">${invHtml}</div>
      </div>

    </div>
  `;
  if (typeof setCharacterModalTitle === 'function')
    setCharacterModalTitle('img/icons/scroll.png', 'Fiche de Personnage');
  document.getElementById('character-modal').style.display = 'flex';
}

// Mondes parallèles Phase H §6.10 — sous-section Carnet de Voyage de
// la fiche perso. Affiche la réserve d'Essences/fragments, les Verrous
// en attente, et le compteur de Set Voyageur du perso courant. Section
// masquée si le joueur n'a aucune activité cross-plan (essence = 0,
// pas de verrou pending, pas de pièce du Set).
function _renderCarnetVoyagePanel(c) {
  const essence  = (typeof outremondeEssence === 'number') ? outremondeEssence : 0;
  const fragments = (typeof outremondeFragments === 'number') ? outremondeFragments : 0;
  const pending  = Array.isArray(outremondePendingSeals) ? outremondePendingSeals : [];
  const setCount = (c && c._voyageurSetCount) || 0;
  // Si le joueur n'a rien touché du système, on plie complètement la
  // section pour éviter la pollution UI en début de partie.
  if (essence === 0 && fragments === 0 && pending.length === 0 && setCount === 0) {
    return '';
  }
  const pendingHtml = pending.length === 0
    ? '<div style="font-size:10px;color:#8a7050">Aucun Verrou en attente.</div>'
    : '<ul style="list-style:none;padding:0;margin:4px 0 0;font-size:10px;color:rgba(247,228,168,0.85)">'
      + pending.map(s => {
          const m = (typeof MONSTERS !== 'undefined' && MONSTERS.find(x => x.id === s.monsterId)) || {};
          return `<li style="padding:3px 0;border-bottom:1px dashed rgba(216,182,71,0.18)">`
               + `<img class="ui-icon ui-icon-md" src="img/icons/spells/verrou_de_sang.png" alt=""> ${m.name || s.monsterId} · chez ${s.hostName || '?'} (étage ${s.floor || '?'})`
               + `</li>`;
        }).join('')
      + '</ul>';
  return `
    <div class="section section-carnet">
      <button class="section-toggle" onclick="_toggleCharSection(this)">Carnet de Voyage</button>
      <div class="panel-title">⸻ CARNET DE VOYAGE ⸻</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#f7e4a8;margin-bottom:6px">
        <div><img class="ui-icon ui-icon-md" src="img/icons/essence_outremonde.png" alt=""> Essences : <strong>${essence}</strong></div>
        <div><img class="ui-icon ui-icon-md" src="img/icons/fragment_outremonde.png" alt=""> Fragments : <strong>${fragments}</strong></div>
        <div><img class="ui-icon ui-icon-md" src="img/icons/items/cape_voyageur.png" alt=""> Set Voyageur : <strong>${setCount}/5</strong></div>
      </div>
      <div style="font-size:10px;color:rgba(247,228,168,0.65);letter-spacing:0.5px">Verrous en attente</div>
      ${pendingHtml}
      <button class="cmd-btn" style="font-size:10px;margin-top:8px" onclick="openAtelierVoyageur()"><img class="ui-icon ui-icon-md" src="img/icons/atelier.png" alt=""> Ouvrir l'Atelier du Voyageur</button>
    </div>`;
}

// Accordéon mobile de la fiche perso : plie / déplie une section.
// Le bouton .section-toggle n'est cliquable qu'en ≤700px (masqué en
// desktop via CSS) ; en desktop les 3 zones restent toujours visibles.
function _toggleCharSection(btn) {
  if (btn && btn.parentElement) btn.parentElement.classList.toggle('collapsed');
}

// ── Allocation de points de stats libres (Phase 3 — UX) ─────
// Bandeau inséré dans openCharacter quand `c.unallocatedStatPoints > 0`.
// Chaque bouton consomme 1 point et applique l'effet via allocateStatPoint().
function _renderStatAllocPanel(charIdx, points) {
  const keys = ['STR', 'INT', 'AGI', 'END', 'LCK'];
  const labels = { STR: '+1 ATK', INT: '+1 INT', AGI: '+1 AGI',
                   END: '+5 PV',  LCK: '+1 LCK' };
  const buttons = keys.map(k =>
    `<button class="cmd-btn alloc-btn"
       onclick="allocateStatPoint(${charIdx}, '${k}')">${k}<br>
       <span class="alloc-btn-effect">${labels[k]}</span></button>`
  ).join('');
  return `
    <div class="alloc-panel">
      <div class="alloc-panel-title">
        ▲ ${points} POINT${points > 1 ? 'S' : ''} À ALLOUER
      </div>
      <div class="alloc-buttons-row">${buttons}</div>
    </div>`;
}

// Applique 1 point sur la stat choisie, via le mapping STAT_POINT_EFFECTS.
// Mute `_baseX` (ou `_baseHpMax`/`_baseSpMax`) — recalculateStats régénère
// les stats effectives en intégrant l'équipement. Re-render la fiche pour
// montrer le total restant.
function allocateStatPoint(charIdx, statKey) {
  if (charIdx >= partySize) charIdx = 0;
  const c = party[charIdx];
  if (!c) return;
  if ((c.unallocatedStatPoints || 0) <= 0) return;
  const eff = (typeof STAT_POINT_EFFECTS !== 'undefined') ? STAT_POINT_EFFECTS[statKey] : null;
  if (!eff) return;
  if (eff.baseAtk) c._baseAtk = (c._baseAtk || 0) + eff.baseAtk;
  if (eff.baseDef) c._baseDef = (c._baseDef || 0) + eff.baseDef;
  if (eff.baseMag) c._baseMag = (c._baseMag || 0) + eff.baseMag;
  if (eff.baseLck) c._baseLck = (c._baseLck || 0) + eff.baseLck;
  if (eff.baseStr) c._baseStr = (c._baseStr || c.str || 0) + eff.baseStr;
  if (eff.baseInt) c._baseInt = (c._baseInt || c.int || 0) + eff.baseInt;
  if (eff.baseAgi) c._baseAgi = (c._baseAgi || c.agi || 0) + eff.baseAgi;
  if (eff.baseEnd) c._baseEnd = (c._baseEnd || c.end || 0) + eff.baseEnd;
  if (eff.hpMax)   { c._baseHpMax = (c._baseHpMax ?? c.hpMax) + eff.hpMax; c.hp += eff.hpMax; }
  if (eff.spMax)   { c._baseSpMax = (c._baseSpMax ?? c.spMax) + eff.spMax; c.sp += eff.spMax; }
  c.unallocatedStatPoints--;
  if (typeof recalculateStats === 'function') recalculateStats();
  if (typeof updateUI === 'function') updateUI();
  openCharacter(charIdx);
}

// Bestiaire (openBestiary, filterBestiary, showMonsterDetail, etc.) → ui-bestiary.js

// ── Changement de difficulté en cours de partie ──────────────
