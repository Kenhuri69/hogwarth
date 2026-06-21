// ============================================================
// FORGE DES TÉNÈBRES — Upgrade des items équipés (endgame Tranche 2)
// ============================================================
// Voir ENDGAME_PLAN.md §7.5. Cellule CELL.FORGE générée aux floors
// 11/14/17/20 post-victoire (cf. dungeon.js).
//
// Modèle :
//   - Chaque item équipé acquiert un champ `upgradeLevel` (0-5).
//   - Le bonus principal de l'item (le plus élevé parmi bonusAtk/Def/Mag/Lck)
//     est augmenté de `+upgradeLevel`. recalculateStats() lit ce champ.
//   - Coût : gold + Essence des Ténèbres selon FORGE_COSTS.
//   - Items grant-spell ou regen : `upgradeLevel` ne touche pas ces
//     effets binaires (cf. plan §7.5 « Cas spécial »).

// Palier T5 (forge-t5.md) : le plafond passe de +5 à +8. Les niveaux 6-8
// exigent en plus de l'Essence Primordiale (`primordiale`), matériau premium
// vendu par l'Apothicaire des Ténèbres (Boucle) — gold-sink endgame profond.
const FORGE_MAX_LEVEL = 8;
// C3a — deux voies d'amélioration, verrouillées au 1er upgrade (item.forgePath) :
//   'power' (défaut/legacy) → +upgradeLevel sur la stat principale.
//   'crit'                  → +upgradeLevel × FORGE_CRIT_PER_LEVEL % de crit.
const FORGE_CRIT_PER_LEVEL = 2;
const FORGE_COSTS = {
  // [niveau cible] → { gold, essence }
  1: { gold:   80, essence: 1 },
  2: { gold:  160, essence: 2 },
  3: { gold:  320, essence: 3 },
  4: { gold:  640, essence: 5 },
  5: { gold: 1280, essence: 8 },
  // T5 — au-delà de +5 : coûts en forte hausse + Essence Primordiale.
  6: { gold: 2200, essence: 10, primordiale: 1 },
  7: { gold: 3400, essence: 13, primordiale: 2 },
  8: { gold: 5000, essence: 16, primordiale: 3 },
};

// Compte / consomme l'Essence des Ténèbres via les helpers de matériau
// partagés (inventory.js).
function _countEssence() {
  return _countMaterial('essence_tenebres');
}

function _consumeEssence(n) {
  return _consumeMaterial('essence_tenebres', n);
}

// Essence Primordiale (T5) — requise pour les niveaux 6-8.
function _countPrimordiale() {
  return _countMaterial('essence_primordiale');
}

function _consumePrimordiale(n) {
  return _consumeMaterial('essence_primordiale', n);
}

// ── Enchantement rerollable (gold-sink endgame, Piste D) ─────
// Affixe aléatoire `item.enchant = {key,value,label,disp}` posé/re-tiré contre
// or pur. Confiné ici ; `recalculateStats` consomme `_enchantTotals` via un
// hook gardé. Cf. .claude/plans/endgame-enchant-reroll.md.
const ENCHANT_POOL = [
  { key: 'bonusAtk',             min: 1, max: 3, label: 'ATK' },
  { key: 'bonusDef',             min: 1, max: 3, label: 'DEF' },
  { key: 'bonusMag',             min: 1, max: 3, label: 'MAG' },
  { key: 'bonusLck',             min: 1, max: 3, label: 'Chance' },
  { key: 'bonusCritChance',      min: 3, max: 8, label: '% Crit',      pct: true },
  { key: 'bonusSpellCritChance', min: 3, max: 8, label: '% Crit sort', pct: true },
  { key: 'bonusDodgeChance',     min: 2, max: 6, label: '% Esquive',   pct: true },
  { key: 'bonusCritDamage',      min: 5, max: 15, label: '% Dégâts crit', frac: true },
  { key: 'bonusFortune',         min: 3, max: 8, label: 'Fortune' },
  { key: 'bonusCelerite',        min: 3, max: 8, label: 'Célérité' },
];
// Clés agrégeables (source de vérité partagée avec recalculateStats).
const ENCHANT_KEYS = ENCHANT_POOL.map(p => p.key);
const ENCHANT_RARITY_MULT = { common: 1, uncommon: 1, rare: 1, epic: 1.25, legendary: 1.5 };
const ENCHANT_COSTS = { common: 250, uncommon: 350, rare: 500, epic: 900, legendary: 1500, default: 500 };

function _enchantCost(item) {
  return ENCHANT_COSTS[item && item.rarity] || ENCHANT_COSTS.default;
}

// Tire un affixe du pool, mis à l'échelle par la rareté de l'item.
function _rollEnchant(item) {
  const pick = ENCHANT_POOL[Math.floor(Math.random() * ENCHANT_POOL.length)];
  const mult = ENCHANT_RARITY_MULT[item && item.rarity] || 1;
  let raw = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
  raw = Math.max(1, Math.round(raw * mult));
  if (pick.frac) {
    return { key: pick.key, value: +(raw / 100).toFixed(2), label: pick.label, disp: '+' + raw + '%' };
  }
  return { key: pick.key, value: raw, label: pick.label, disp: (pick.pct ? '+' + raw + '%' : '+' + raw) };
}

// Agrège les affixes des items équipés en { bonusAtk, bonusCritChance, … }
// (clés du pool, 0 par défaut). Consommé par recalculateStats (hook gardé).
function _enchantTotals(equipped) {
  const t = {};
  ENCHANT_KEYS.forEach(k => { t[k] = 0; });
  if (!equipped) return t;
  for (const item of Object.values(equipped)) {
    const e = item && item.enchant;
    if (e && e.key && Object.prototype.hasOwnProperty.call(t, e.key)) t[e.key] += e.value || 0;
  }
  return t;
}

// Action UI : enchante (ou ré-enchante) l'item équipé du slot contre or pur.
function enchantItemAtForge(charIdx, slot) {
  const c = party[charIdx];
  if (!c || !c.equipped) return false;
  const item = c.equipped[slot];
  if (!item) return false;
  const cost = _enchantCost(item);
  if ((player.gold | 0) < cost) {
    addMsg(`Enchantement : ${cost} Gallions requis (vous en avez ${player.gold | 0}).`, 'bad');
    return false;
  }
  player.gold -= cost;
  item.enchant = _rollEnchant(item);
  if (typeof recalculateStats === 'function') recalculateStats();
  addMsg(`✨ ${item.name} enchanté : ${item.enchant.label} ${item.enchant.disp}.`, 'good');
  if (typeof updateUI === 'function') updateUI();
  openForge();
  if (typeof autoSave === 'function') autoSave('forge-enchant');
  return true;
}

// Détermine la stat principale d'un item à forger.
// Priorité 1 : la plus élevée parmi bonusAtk/Def/Mag/Lck (compat descendante).
// Priorité 2 : si aucun primaire, la plus élevée parmi les bonus dérivés
//              (crit, esquive, HpMax, SpMax) — permet de forger oeil_basilic,
//              cor_pegasse, etc.
// Retourne { key: 'bonusXxx', value: N } ou null si l'item n'a aucun bonus.
function _primaryBonus(item) {
  if (!item) return null;
  const primaryKeys = ['bonusAtk', 'bonusDef', 'bonusMag', 'bonusLck'];
  const secondaryKeys = [
    'bonusCritChance', 'bonusDodgeChance', 'bonusCritDamage',
    'bonusSpellCritChance', 'bonusSpellCritDamage',
    'bonusHpMax', 'bonusSpMax'
  ];
  const pickHighest = (keys) => {
    let best = null;
    for (const k of keys) {
      const v = item[k] | 0;
      if (v > 0 && (!best || v > best.value)) best = { key: k, value: v };
    }
    return best;
  };
  return pickHighest(primaryKeys) || pickHighest(secondaryKeys);
}

// Renvoie le bonus supplémentaire apporté par upgradeLevel (inclus dans recalculateStats).
// 0 si l'item n'a pas de bonus principal positif.
function forgeBonus(item) {
  if (!item) return 0;
  const lvl = item.upgradeLevel | 0;
  if (lvl <= 0) return 0;
  return _primaryBonus(item) ? lvl : 0;
}

window.forgeBonus = forgeBonus;

// Récap de progression Forge par héros actif. Pure — utilisée par
// `openForge()` (entête) + le smoke test. Pour chaque héros, compte les
// items équipés `upgradable` (porteur de _primaryBonus), distingue ceux
// au niveau MAX vs partiels, somme le gold restant pour tout maxer.
// Cf. .claude/plans/forge-library-audit.md §4.5.
function _forgeProgressSummary() {
  const out = [];
  for (let i = 0; i < (partySize || 1); i++) {
    const c = party[i];
    if (!c || !c.equipped) continue;
    let upgradable = 0, maxed = 0, partial = 0, goldRemaining = 0;
    for (const item of Object.values(c.equipped)) {
      if (!item || !_primaryBonus(item)) continue;
      upgradable++;
      const lvl = item.upgradeLevel | 0;
      if (lvl >= FORGE_MAX_LEVEL) { maxed++; continue; }
      partial++;
      for (let t = lvl + 1; t <= FORGE_MAX_LEVEL; t++) {
        const cost = FORGE_COSTS[t];
        if (cost) goldRemaining += (cost.gold | 0);
      }
    }
    out.push({
      heroName: (c.name || `Héros ${i + 1}`).split(' ')[0],
      upgradable, maxed, partial, goldRemaining,
    });
  }
  return out;
}

// ── Dissolution — recycler une relique du sac en Essence (anti-impasse) ──
// Les récompenses de Maison / premiums ont `price:0` (invendables, cf.
// shop.js) et le sac n'offre aucune action « jeter ». La Forge propose donc
// une sortie cohérente : dissoudre un équipement du sac en Essence (matériau
// de forge), rendement selon la rareté. Voir
// .claude/plans/unsellable-items-dissolution.md.
const DISSOLVE_YIELD = {
  common:    { essence_tenebres: 1 },
  uncommon:  { essence_tenebres: 1 },
  rare:      { essence_tenebres: 2 },
  epic:      { essence_tenebres: 3, essence_primordiale: 1 },
  legendary: { essence_tenebres: 4, essence_primordiale: 2 },
};

// True si l'item du sac peut être dissous : équipement non empilable (exclut
// consommables/matériaux/herbes/quête via _isStackable). Les livres de sort
// restent vendables → hors scope.
function _isDissolvable(item) {
  if (!item) return false;
  if (typeof _isStackable === 'function' && _isStackable(item)) return false;
  const equipTypes = ['wand', 'armor', 'acc', 'trinket'];
  return equipTypes.includes(item.type) || !!item.slot;
}

// Rendement (matériaux) de la dissolution d'un item, selon sa rareté.
function _dissolveYield(item) {
  return DISSOLVE_YIELD[(item && item.rarity)] || DISSOLVE_YIELD.common;
}

// Libellé lisible du rendement pour l'aperçu UI (ex. « 4 🌑 · 2 🔮 »).
function _dissolveYieldLabel(yld) {
  const parts = [];
  if (yld.essence_tenebres)    parts.push(`${yld.essence_tenebres} 🌑`);
  if (yld.essence_primordiale) parts.push(`${yld.essence_primordiale} 🔮`);
  return parts.join(' · ') || '—';
}

// Dissout l'item du sac à `idx` : confirmation, retrait, octroi des matériaux.
// Retourne true si la dissolution a eu lieu.
function dissolveItemAtForge(idx) {
  const item = player.inventory && player.inventory[idx];
  if (!item || !_isDissolvable(item)) return false;
  const yld   = _dissolveYield(item);
  const label = _dissolveYieldLabel(yld);
  if (typeof confirm === 'function'
      && !confirm(`Dissoudre ${item.name} en Essence (${label}) ? Cette relique sera détruite définitivement.`)) {
    return false;
  }
  _removeInvItem(idx);
  // Octroi des matériaux (primordiale d'abord — la plus précieuse — pour
  // profiter de la case libérée si le sac était plein). Empilables : fusion.
  for (const matId of ['essence_primordiale', 'essence_tenebres']) {
    const n = yld[matId] | 0;
    for (let k = 0; k < n; k++) tryAddItem(matId, { silent: true });
  }
  addMsg(`♻️ ${item.name} dissoute → ${label} d'Essence.`, 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  if (typeof updateUI === 'function') updateUI();
  openForge();
  return true;
}

window.dissolveItemAtForge = dissolveItemAtForge;

// Construit la liste des items du sac dissolvables. Retourne [{ item, idx }].
function _dissolvableBagItems() {
  if (!player || !Array.isArray(player.inventory)) return [];
  return player.inventory
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => _isDissolvable(item));
}

// Construit la liste des items équipés sur tous les persos actifs.
// Retourne [{ charIdx, slot, item }] — items non-null uniquement.
function _equippedItems() {
  const out = [];
  for (let i = 0; i < (partySize || 1); i++) {
    const c = party[i];
    if (!c || !c.equipped) continue;
    for (const [slot, item] of Object.entries(c.equipped)) {
      if (item) out.push({ charIdx: i, slot, item });
    }
  }
  return out;
}

// Effectue l'upgrade : vérifie ressources, débite, incrémente le niveau,
// recalcule les stats. Retourne true si l'upgrade a réussi.
function upgradeItemAtForge(charIdx, slot, path) {
  const c = party[charIdx];
  if (!c || !c.equipped) return false;
  const item = c.equipped[slot];
  if (!item) return false;
  const currentLvl = item.upgradeLevel | 0;
  // La voie est verrouillée au 1er upgrade ; ensuite on suit item.forgePath.
  if (currentLvl === 0) item.forgePath = (path === 'crit') ? 'crit' : 'power';
  if (currentLvl >= FORGE_MAX_LEVEL) {
    addMsg(`${item.name} : niveau maximum atteint.`, '');
    return false;
  }
  const targetLvl = currentLvl + 1;
  const cost = FORGE_COSTS[targetLvl];
  if (!cost) return false;
  if ((player.gold | 0) < cost.gold) {
    addMsg(`Forge : ${cost.gold} Gallions requis (vous en avez ${player.gold}).`, 'bad');
    return false;
  }
  if (_countEssence() < cost.essence) {
    addMsg(`Forge : ${cost.essence} Essence(s) des Ténèbres requise(s).`, 'bad');
    return false;
  }
  const needPrim = cost.primordiale | 0;
  if (needPrim > 0 && _countPrimordiale() < needPrim) {
    addMsg(`Forge : ${needPrim} Essence(s) Primordiale(s) requise(s) (au-delà de +5).`, 'bad');
    return false;
  }
  if (!_primaryBonus(item)) {
    addMsg(`${item.name} n'a pas de stat principale à renforcer.`, '');
    return false;
  }

  player.gold -= cost.gold;
  _consumeEssence(cost.essence);
  if (needPrim > 0) _consumePrimordiale(needPrim);
  item.upgradeLevel = targetLvl;
  if (typeof recalculateStats === 'function') recalculateStats();
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  const voie = item.forgePath === 'crit' ? 'Critique' : 'Puissance';
  addMsg(`🔨 ${item.name} forgée au niveau ${targetLvl} (voie ${voie}) !`, 'magic');
  if (typeof updateUI === 'function') updateUI();
  // Re-render
  openForge();
  return true;
}

window.upgradeItemAtForge = upgradeItemAtForge;

// Ouvre la modale Forge — liste les items équipés avec bouton Améliorer.
function openForge() {
  const modal = document.getElementById('forge-modal');
  if (!modal) return;
  const list = document.getElementById('forge-list');
  const gold = document.getElementById('forge-gold');
  const essCount = document.getElementById('forge-essence');
  if (gold)     gold.textContent     = `${player.gold | 0} Gallions`;
  if (essCount) {
    const prim = _countPrimordiale();
    essCount.textContent = `${_countEssence()} Essence(s)` + (prim > 0 ? ` · ${prim} 🔮 Primordiale(s)` : '');
  }

  if (!list) return;
  // Entête : récap progression Forge du groupe (§4.5).
  const summary = _forgeProgressSummary();
  const summaryHtml = summary.length
    ? `<div class="forge-progress-summary">
         <div class="forge-progress-title">🔨 Forge — Progression du groupe</div>
         ${summary.map(s => `
           <div class="forge-progress-line">
             <b>${s.heroName}</b> :
             ${s.maxed}/${s.upgradable} items au max (+${FORGE_MAX_LEVEL})${s.partial ? ` · ${s.partial} partiels — ${s.goldRemaining} G pour tout maxer` : ' · tout est maxé'}
           </div>`).join('')}
       </div>`
    : '';
  const items = _equippedItems();
  let equipHtml;
  if (items.length === 0) {
    equipHtml = `<div class="forge-empty">Aucun équipement à renforcer.</div>`;
  } else {
    equipHtml = items.map(({ charIdx, slot, item }) => {
      const lvl    = item.upgradeLevel | 0;
      const maxed  = lvl >= FORGE_MAX_LEVEL;
      const cost   = maxed ? null : FORGE_COSTS[lvl + 1];
      const primBonus = _primaryBonus(item);
      const upgradable = !!primBonus;
      const heroName = (party[charIdx] && party[charIdx].name) ? party[charIdx].name.split(' ')[0] : `Perso ${charIdx + 1}`;
      const iconHtml = (typeof getItemIconHtml === 'function')
        ? getItemIconHtml(item, 'ui-icon-md') : (item.icon || '⚔️');
      const path     = item.forgePath || 'power';
      const voieLbl  = path === 'crit' ? 'Critique' : 'Puissance';
      const lvlBadge  = lvl > 0 ? `<span class="forge-lvl-badge">+${lvl}</span>` : '';
      const costLine = cost
        ? `<div class="forge-cost">${cost.gold} g · ${cost.essence} 🌑${cost.primordiale ? ` · ${cost.primordiale} 🔮` : ''}</div>`
        : '';
      const affordable = cost && player.gold >= cost.gold && _countEssence() >= cost.essence
        && _countPrimordiale() >= (cost.primordiale | 0);
      const dis = affordable ? '' : 'disabled';
      let previewLine = '', btn = '';
      if (!upgradable) {
        previewLine = `<div class="forge-preview forge-noupgrade">Effet spécial — non forgeable</div>`;
      } else if (maxed) {
        previewLine = `<div class="forge-preview forge-maxed">Niveau MAX (${voieLbl})</div>`;
      } else if (lvl === 0) {
        // 1er upgrade : choix entre les deux voies.
        const statName = primBonus.key.replace('bonus', '');
        previewLine = `<div class="forge-preview forge-choose">Choisir une voie :</div>`;
        btn = `<div class="forge-path-choice">
                 <button class="forge-upgrade-btn ${dis}" ${dis}
                   onclick="upgradeItemAtForge(${charIdx}, '${slot}', 'power')">⚔️ +${statName}</button>
                 <button class="forge-upgrade-btn ${dis}" ${dis}
                   onclick="upgradeItemAtForge(${charIdx}, '${slot}', 'crit')">✯ +${FORGE_CRIT_PER_LEVEL}% Crit</button>
               </div>`;
      } else {
        // Voie verrouillée : aperçu + bouton unique.
        previewLine = (path === 'crit')
          ? `<div class="forge-preview">✯ Crit +${lvl * FORGE_CRIT_PER_LEVEL}% → <b>+${(lvl + 1) * FORGE_CRIT_PER_LEVEL}%</b></div>`
          : `<div class="forge-preview">${primBonus.key.replace('bonus', '')} ${primBonus.value + lvl} → <b>${primBonus.value + lvl + 1}</b></div>`;
        btn = `<button class="forge-upgrade-btn ${dis}" ${dis}
                 onclick="upgradeItemAtForge(${charIdx}, '${slot}')">Améliorer (${voieLbl})</button>`;
      }
      // Enchantement rerollable (Piste D) — disponible sur tout item équipé.
      const enchCost   = _enchantCost(item);
      const enchAfford = (player.gold | 0) >= enchCost;
      const enchDis    = enchAfford ? '' : 'disabled';
      const enchLine   = item.enchant
        ? `<div class="forge-enchant-cur">✨ ${item.enchant.label} ${item.enchant.disp}</div>` : '';
      const enchBtn = `<button class="forge-enchant-btn ${enchDis}" ${enchDis}
                 onclick="enchantItemAtForge(${charIdx}, '${slot}')">✨ ${item.enchant ? 'Re-enchanter' : 'Enchanter'} (${enchCost}g)</button>`;
      return `
        <div class="forge-item">
          <div class="forge-item-icon">${iconHtml}${lvlBadge}</div>
          <div class="forge-item-text">
            <div class="forge-item-name">${item.name} <span class="forge-item-slot">(${heroName} · ${slot})</span></div>
            ${previewLine}
            ${enchLine}
            ${costLine}
          </div>
          <div class="forge-item-actions">${btn}${enchBtn}</div>
        </div>`;
    }).join('');
  }

  // Section Dissolution : items du sac recyclables en Essence (anti-impasse —
  // sortie pour les reliques invendables/non jetables, cf. plan).
  const dissolvables = _dissolvableBagItems();
  let dissolveHtml = '';
  if (dissolvables.length) {
    dissolveHtml = `
      <div class="forge-dissolve-section">
        <div class="forge-progress-title">♻️ Dissoudre une relique du sac → Essence</div>
        ${dissolvables.map(({ item, idx }) => {
          const yld      = _dissolveYield(item);
          const iconHtml = (typeof getItemIconHtml === 'function')
            ? getItemIconHtml(item, 'ui-icon-md') : (item.icon || '🔮');
          return `
            <div class="forge-item">
              <div class="forge-item-icon">${iconHtml}</div>
              <div class="forge-item-text">
                <div class="forge-item-name">${item.name}</div>
                <div class="forge-preview">Rendement : ${_dissolveYieldLabel(yld)}</div>
              </div>
              <button class="forge-upgrade-btn" onclick="dissolveItemAtForge(${idx})">♻️ Dissoudre</button>
            </div>`;
        }).join('')}
      </div>`;
  }

  list.innerHTML = summaryHtml + equipHtml + dissolveHtml;

  modal.style.display = 'flex';
  if (typeof maybeForgeTour === 'function') maybeForgeTour();   // P2.4 — mini-tour 1ʳᵉ ouverture
}

window.openForge = openForge;
