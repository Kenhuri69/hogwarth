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

const FORGE_MAX_LEVEL = 5;
const FORGE_COSTS = {
  // [niveau cible] → { gold, essence }
  1: { gold:   80, essence: 1 },
  2: { gold:  160, essence: 2 },
  3: { gold:  320, essence: 3 },
  4: { gold:  640, essence: 5 },
  5: { gold: 1280, essence: 8 },
};

// Compte / consomme l'Essence des Ténèbres via les helpers de matériau
// partagés (inventory.js).
function _countEssence() {
  return _countMaterial('essence_tenebres');
}

function _consumeEssence(n) {
  return _consumeMaterial('essence_tenebres', n);
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
function upgradeItemAtForge(charIdx, slot) {
  const c = party[charIdx];
  if (!c || !c.equipped) return false;
  const item = c.equipped[slot];
  if (!item) return false;
  const currentLvl = item.upgradeLevel | 0;
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
  if (!_primaryBonus(item)) {
    addMsg(`${item.name} n'a pas de stat principale à renforcer.`, '');
    return false;
  }

  player.gold -= cost.gold;
  _consumeEssence(cost.essence);
  item.upgradeLevel = targetLvl;
  if (typeof recalculateStats === 'function') recalculateStats();
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  addMsg(`🔨 ${item.name} forgée au niveau ${targetLvl} !`, 'magic');
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
  if (essCount) essCount.textContent = `${_countEssence()} Essence(s)`;

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
  if (items.length === 0) {
    list.innerHTML = `${summaryHtml}<div class="forge-empty">Aucun équipement à renforcer.</div>`;
  } else {
    list.innerHTML = summaryHtml + items.map(({ charIdx, slot, item }) => {
      const lvl    = item.upgradeLevel | 0;
      const maxed  = lvl >= FORGE_MAX_LEVEL;
      const cost   = maxed ? null : FORGE_COSTS[lvl + 1];
      const primBonus = _primaryBonus(item);
      const upgradable = !!primBonus;
      const heroName = (party[charIdx] && party[charIdx].name) ? party[charIdx].name.split(' ')[0] : `Perso ${charIdx + 1}`;
      const iconHtml = (typeof getItemIconHtml === 'function')
        ? getItemIconHtml(item, 'ui-icon-md') : (item.icon || '⚔️');
      const lvlBadge  = lvl > 0 ? `<span class="forge-lvl-badge">+${lvl}</span>` : '';
      const previewLine = upgradable && !maxed
        ? `<div class="forge-preview">${primBonus.key.replace('bonus','')} ${primBonus.value + lvl} → <b>${primBonus.value + lvl + 1}</b></div>`
        : maxed ? `<div class="forge-preview forge-maxed">Niveau MAX</div>`
        : `<div class="forge-preview forge-noupgrade">Effet spécial — non forgeable</div>`;
      const costLine = cost
        ? `<div class="forge-cost">${cost.gold} g · ${cost.essence} 🌑</div>`
        : '';
      const affordable = cost && player.gold >= cost.gold && _countEssence() >= cost.essence;
      const btn = (upgradable && !maxed)
        ? `<button class="forge-upgrade-btn ${affordable ? '' : 'disabled'}"
                   ${affordable ? '' : 'disabled'}
                   onclick="upgradeItemAtForge(${charIdx}, '${slot}')">Améliorer</button>`
        : '';
      return `
        <div class="forge-item">
          <div class="forge-item-icon">${iconHtml}${lvlBadge}</div>
          <div class="forge-item-text">
            <div class="forge-item-name">${item.name} <span class="forge-item-slot">(${heroName} · ${slot})</span></div>
            ${previewLine}
            ${costLine}
          </div>
          ${btn}
        </div>`;
    }).join('');
  }

  modal.style.display = 'flex';
}

window.openForge = openForge;
