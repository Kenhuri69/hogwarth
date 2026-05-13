// ============================================================
// BIBLIOTHÈQUE INTERDITE — Upgrade des sorts (endgame Tranche 2)
// ============================================================
// Voir ENDGAME_PLAN.md §7.6. Cellule CELL.LIBRARY générée aux floors
// 12/15/18 post-victoire (cf. dungeon.js).
//
// Modèle :
//   - Chaque perso porte `spellUpgrades = { 'Incendio': 2, … }`.
//   - Niveau 0-3 par sort. La table LIBRARY_COSTS détaille les coûts.
//   - Effets appliqués à l'execute via `_spellForCaster` (battle-spells.js) :
//       power  +2 × level
//       cost   −1 × level (plancher 1)
//       chance +0.05 × level (cap 0.50)
//   - Pas d'effet sur les sorts à coût/effet binaire (Avada Kedavra).
//   - Persistance : ajouter à _serializeState (save.js) + lazy init.

const LIBRARY_MAX_LEVEL = 3;
const LIBRARY_COSTS = {
  1: { gold: 120, pages: 1 },
  2: { gold: 240, pages: 2 },
  3: { gold: 480, pages: 3 },
};

// État UI : index du perso sélectionné dans les onglets.
let _libraryCharIdx = 0;

function _countPages() {
  if (typeof player === 'undefined' || !player.inventory) return 0;
  return player.inventory.filter(it => it && it.id === 'page_grimoire').length;
}

function _consumePages(n) {
  let removed = 0;
  for (let i = player.inventory.length - 1; i >= 0 && removed < n; i--) {
    if (player.inventory[i] && player.inventory[i].id === 'page_grimoire') {
      player.inventory.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

// Initialise spellUpgrades = {} sur tous les persos qui en sont dépourvus.
// Appelé à l'open library + dans _applyState (cf. save.js).
function _ensureSpellUpgradesInit() {
  if (typeof party === 'undefined') return;
  for (const c of party) {
    if (c && !c.spellUpgrades) c.spellUpgrades = {};
  }
}
window._ensureSpellUpgradesInit = _ensureSpellUpgradesInit;

function getSpellUpgradeLevel(char, spellName) {
  if (!char || !char.spellUpgrades) return 0;
  return (char.spellUpgrades[spellName] | 0);
}
window.getSpellUpgradeLevel = getSpellUpgradeLevel;

function upgradeSpellAtLibrary(charIdx, spellName) {
  const c = party[charIdx];
  if (!c) return false;
  _ensureSpellUpgradesInit();
  if (!c.spells.includes(spellName)) {
    addMsg(`${c.name} ne connaît pas encore ce sort.`, '');
    return false;
  }
  const current = getSpellUpgradeLevel(c, spellName);
  if (current >= LIBRARY_MAX_LEVEL) {
    addMsg(`${spellName} : niveau maximum atteint.`, '');
    return false;
  }
  const target = current + 1;
  const cost   = LIBRARY_COSTS[target];
  if (!cost) return false;
  if ((player.gold | 0) < cost.gold) {
    addMsg(`Bibliothèque : ${cost.gold} Gallions requis.`, 'bad');
    return false;
  }
  if (_countPages() < cost.pages) {
    addMsg(`Bibliothèque : ${cost.pages} Page(s) de Grimoire requise(s).`, 'bad');
    return false;
  }

  player.gold -= cost.gold;
  _consumePages(cost.pages);
  c.spellUpgrades[spellName] = target;
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  addMsg(`📜 ${c.name} amplifie ${spellName} (niv ${target}) !`, 'magic');
  if (typeof updateUI === 'function') updateUI();
  openLibrary();
  return true;
}
window.upgradeSpellAtLibrary = upgradeSpellAtLibrary;

function selectLibraryChar(idx) {
  _libraryCharIdx = idx;
  openLibrary();
}
window.selectLibraryChar = selectLibraryChar;

function openLibrary() {
  const modal = document.getElementById('library-modal');
  if (!modal) return;
  _ensureSpellUpgradesInit();

  const gold  = document.getElementById('library-gold');
  const pages = document.getElementById('library-pages');
  if (gold)  gold.textContent  = `${player.gold | 0} Gallions`;
  if (pages) pages.textContent = `${_countPages()} Page(s)`;

  // Onglets perso (visible en mode duo)
  const tabsEl = document.getElementById('library-tabs');
  if (tabsEl) {
    if ((partySize || 1) > 1) {
      tabsEl.style.display = 'flex';
      tabsEl.innerHTML = party.slice(0, partySize).map((c, i) => `
        <button class="library-tab${i === _libraryCharIdx ? ' active' : ''}"
                onclick="selectLibraryChar(${i})">
          ${c.icon || ''} ${c.name.split(' ')[0]}
        </button>
      `).join('');
    } else {
      tabsEl.style.display = 'none';
    }
  }

  // Restrict à partySize
  if (_libraryCharIdx >= (partySize || 1)) _libraryCharIdx = 0;

  const c    = party[_libraryCharIdx];
  const list = document.getElementById('library-list');
  if (!list || !c) return;

  if (!c.spells || c.spells.length === 0) {
    list.innerHTML = `<div class="library-empty">${c.name} ne connaît aucun sort à étudier.</div>`;
    modal.style.display = 'flex';
    return;
  }

  list.innerHTML = c.spells.map(name => {
    const spell = SPELLS.find(s => s.name === name);
    if (!spell) return '';
    const lvl    = getSpellUpgradeLevel(c, name);
    const maxed  = lvl >= LIBRARY_MAX_LEVEL;
    const cost   = maxed ? null : LIBRARY_COSTS[lvl + 1];
    const pwrNow  = (spell.power | 0) + 2 * lvl;
    const pwrNext = pwrNow + 2;
    const cstNow  = Math.max(1, (spell.cost | 0) - lvl);
    const cstNext = Math.max(1, cstNow - 1);
    const iconHtml = (typeof getSpellIconHtml === 'function')
      ? getSpellIconHtml(spell, 'ui-icon-md') : (spell.icon || '✨');
    const lvlBadge  = lvl > 0 ? `<span class="forge-lvl-badge">+${lvl}</span>` : '';
    const previewLine = maxed
      ? `<div class="library-preview forge-maxed">Niveau MAX</div>`
      : `<div class="library-preview">power ${pwrNow} → <b>${pwrNext}</b> · cost ${cstNow} → <b>${cstNext}</b> SP</div>`;
    const costLine = cost
      ? `<div class="library-cost">${cost.gold} g · ${cost.pages} 📜</div>`
      : '';
    const affordable = cost && player.gold >= cost.gold && _countPages() >= cost.pages;
    const btn = !maxed
      ? `<button class="library-upgrade-btn ${affordable ? '' : 'disabled'}"
                 ${affordable ? '' : 'disabled'}
                 onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${name.replace(/'/g, "\\'")}')">Amplifier</button>`
      : '';
    return `
      <div class="library-spell">
        <div class="forge-item-icon">${iconHtml}${lvlBadge}</div>
        <div class="forge-item-text">
          <div class="library-spell-name">${name} <span class="library-spell-meta">(${spell.effect || ''})</span></div>
          ${previewLine}
          ${costLine}
        </div>
        ${btn}
      </div>`;
  }).join('');

  modal.style.display = 'flex';
}
window.openLibrary = openLibrary;
