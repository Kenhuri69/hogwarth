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

const LIBRARY_MAX_LEVEL = 5;
// C3b — deux voies d'amplification, verrouillées au 1er upgrade (char.spellPaths[name]) :
//   'power' (défaut/legacy) → power +2 × level.
//   'focus'                 → cost −1 × level + chance +0.05 × level.
const LIBRARY_FOCUS_CHANCE_PER_LEVEL = 0.05;
const LIBRARY_COSTS = {
  1: { gold: 120,  pages: 1 },
  2: { gold: 240,  pages: 2 },
  3: { gold: 480,  pages: 3 },
  4: { gold: 960,  pages: 5 },
  5: { gold: 1920, pages: 8 },
};

// État UI : index du perso sélectionné dans les onglets.
let _libraryCharIdx = 0;

// Compte / consomme les Pages de Grimoire via les helpers de matériau
// partagés (inventory.js).
function _countPages() {
  return _countMaterial('page_grimoire');
}

function _consumePages(n) {
  return _consumeMaterial('page_grimoire', n);
}

// Récap de progression Bibliothèque par héros actif. Pure — utilisée
// par `openLibrary()` (entête) + le smoke test. Pour chaque héros,
// compte les sorts non-utilitaires (power > 0) connus, distingue ceux
// au niveau MAX vs partiels, somme le gold restant pour tout maxer.
// Cf. .claude/plans/forge-library-audit.md §4.5.
function _libraryProgressSummary() {
  const out = [];
  for (let i = 0; i < (partySize || 1); i++) {
    const c = party[i];
    if (!c || !Array.isArray(c.spells)) continue;
    let upgradable = 0, maxed = 0, partial = 0, goldRemaining = 0;
    for (const name of c.spells) {
      const spell = SPELLS.find(s => s.name === name);
      if (!spell || !(spell.power | 0)) continue;  // utilitaires exclus
      upgradable++;
      const lvl = (c.spellUpgrades && c.spellUpgrades[name]) | 0;
      if (lvl >= LIBRARY_MAX_LEVEL) { maxed++; continue; }
      partial++;
      for (let t = lvl + 1; t <= LIBRARY_MAX_LEVEL; t++) {
        const cost = LIBRARY_COSTS[t];
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

// Initialise spellUpgrades = {} sur tous les persos qui en sont dépourvus.
// Appelé à l'open library + dans _applyState (cf. save.js).
function _ensureSpellUpgradesInit() {
  if (typeof party === 'undefined') return;
  for (const c of party) {
    if (c && !c.spellUpgrades) c.spellUpgrades = {};
    if (c && !c.spellPaths)    c.spellPaths = {};   // C3b — voie par sort
  }
}
window._ensureSpellUpgradesInit = _ensureSpellUpgradesInit;

function getSpellUpgradeLevel(char, spellName) {
  if (!char || !char.spellUpgrades) return 0;
  return (char.spellUpgrades[spellName] | 0);
}
window.getSpellUpgradeLevel = getSpellUpgradeLevel;

// C3b — voie verrouillée d'un sort ('power' | 'focus'). undefined si jamais
// upgradé, ou si upgradé avant C3b (= legacy combiné, traité côté _spellForCaster).
function getSpellPath(char, spellName) {
  if (!char || !char.spellPaths) return undefined;
  return char.spellPaths[spellName];
}
window.getSpellPath = getSpellPath;

function upgradeSpellAtLibrary(charIdx, spellName, path) {
  const c = party[charIdx];
  if (!c) return false;
  _ensureSpellUpgradesInit();
  if (!c.spells.includes(spellName)) {
    addMsg(`${c.name} ne connaît pas encore ce sort.`, '');
    return false;
  }
  const spell = (typeof SPELLS !== 'undefined') ? SPELLS.find(s => s.name === spellName) : null;
  if (spell && !(spell.power | 0)) {
    addMsg(`${spellName} : effet utilitaire, non amplifiable.`, '');
    return false;
  }
  const current = getSpellUpgradeLevel(c, spellName);
  if (current >= LIBRARY_MAX_LEVEL) {
    addMsg(`${spellName} : niveau maximum atteint.`, '');
    return false;
  }
  // La voie est verrouillée au 1er upgrade ; ensuite on suit c.spellPaths[spellName].
  if (current === 0) c.spellPaths[spellName] = (path === 'focus') ? 'focus' : 'power';
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
  const voie = c.spellPaths[spellName] === 'focus' ? 'Maîtrise' : 'Puissance';
  addMsg(`${getSpellIconHtml(spellName, 'ui-icon-md')} ${c.name} amplifie ${spellName} (niv ${target}, voie ${voie}) !`, 'magic');
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

  // Entête : récap progression Bibliothèque du groupe (§4.5).
  const summary = _libraryProgressSummary();
  const summaryHtml = summary.length
    ? `<div class="forge-progress-summary">
         <div class="forge-progress-title">📚 Bibliothèque — Progression du groupe</div>
         ${summary.map(s => `
           <div class="forge-progress-line">
             <b>${s.heroName}</b> :
             ${s.maxed}/${s.upgradable} sorts au max (+${LIBRARY_MAX_LEVEL})${s.partial ? ` · ${s.partial} partiels — ${s.goldRemaining} G pour tout maxer` : ' · tout est maxé'}
           </div>`).join('')}
       </div>`
    : '';

  if (!c.spells || c.spells.length === 0) {
    list.innerHTML = `${summaryHtml}<div class="library-empty">${c.name} ne connaît aucun sort à étudier.</div>`;
    modal.style.display = 'flex';
    return;
  }

  list.innerHTML = summaryHtml + c.spells.map(name => {
    const spell = SPELLS.find(s => s.name === name);
    if (!spell) return '';
    const lvl    = getSpellUpgradeLevel(c, name);
    const maxed  = lvl >= LIBRARY_MAX_LEVEL;
    const cost   = maxed ? null : LIBRARY_COSTS[lvl + 1];
    // Sorts utilitaires sans `power` (Accio, Portus, Revelio, Patronus Maxima,
    // Legilimens, Récolte Magique…) : non amplifiables — la formule
    // power +2 / cost −1 n'a aucun sens pour un effet binaire ou narratif.
    const utility = !(spell.power | 0);
    const pwrNow  = (spell.power | 0) + 2 * lvl;
    const pwrNext = pwrNow + 2;
    const cstNow  = Math.max(1, (spell.cost | 0) - lvl);
    const cstNext = Math.max(1, cstNow - 1);
    const hasChance = typeof spell.chance === 'number';
    const iconHtml = (typeof getSpellIconHtml === 'function')
      ? getSpellIconHtml(spell, 'ui-icon-md') : (spell.icon || '✨');
    const lvlBadge  = lvl > 0 ? `<span class="forge-lvl-badge">+${lvl}</span>` : '';
    const nameEsc   = name.replace(/'/g, "\\'");
    const path      = getSpellPath(c, name);   // 'power' | 'focus' | undefined (legacy)
    const voieLbl   = path === 'focus' ? 'Maîtrise' : 'Puissance';
    const costLine = (cost && !utility)
      ? `<div class="library-cost">${cost.gold} g · ${cost.pages} 📜</div>`
      : '';
    const affordable = cost && player.gold >= cost.gold && _countPages() >= cost.pages;
    const dis = affordable ? '' : 'disabled';
    // Aperçu de la voie Maîtrise : cost réduit (+ fiabilité de statut si applicable).
    const focusPreview = `cost ${cstNow} → <b>${cstNext}</b> SP${hasChance ? ` · statut +${Math.round(LIBRARY_FOCUS_CHANCE_PER_LEVEL * 100)}%` : ''}`;
    let previewLine = '', btn = '';
    if (utility) {
      previewLine = `<div class="library-preview forge-noupgrade">Effet utilitaire — non amplifiable</div>`;
    } else if (maxed) {
      previewLine = `<div class="library-preview forge-maxed">Niveau MAX (${voieLbl})</div>`;
    } else if (lvl === 0) {
      // 1er upgrade : choix entre les deux voies.
      previewLine = `<div class="library-preview forge-choose">Choisir une voie :</div>`;
      btn = `<div class="library-path-choice">
               <button class="library-upgrade-btn ${dis}" ${dis}
                 onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'power')">⚡ +Puissance</button>
               <button class="library-upgrade-btn ${dis}" ${dis}
                 onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'focus')">🎯 Maîtrise</button>
             </div>`;
    } else {
      // Voie verrouillée : aperçu + bouton unique. path indéfini = legacy combiné.
      previewLine = (path === 'focus')
        ? `<div class="library-preview">${focusPreview}</div>`
        : (path === 'power')
        ? `<div class="library-preview">power ${pwrNow} → <b>${pwrNext}</b></div>`
        : `<div class="library-preview">power ${pwrNow} → <b>${pwrNext}</b> · cost ${cstNow} → <b>${cstNext}</b> SP</div>`;
      btn = `<button class="library-upgrade-btn ${dis}" ${dis}
               onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}')">Amplifier (${voieLbl})</button>`;
    }
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
