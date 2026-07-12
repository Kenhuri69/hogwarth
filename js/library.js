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

// Palier T5 (library-t5.md) : le plafond passe de +5 à +8, pendant exact de
// la Forge T5. Les niveaux 6-8 exigent en plus de l'Essence Primordiale
// (`essence_primordiale`) — matériau premium partagé avec la Forge, vendu par
// l'Apothicaire Ténébreux (Boucle). Sink endgame profond et arbitré (Forge vs
// Bibliothèque puisent le même stock).
const LIBRARY_MAX_LEVEL = 8;
// Lot 2 revue 2026-07 — QUATRE voies d'amplification (char.spellPaths[name]),
// choisies au 1er upgrade et RE-forgeables contre or (respec — fin du lock C1) :
//   'power' (défaut/legacy) → power +2 × level.
//   'focus'                 → cost −1 × level + chance +0.05 × level.
//   'amplitude'             → power +1 × level + éclaboussure +8 % / 2 crans
//                             sur les ennemis adjacents (_spellForCaster).
//   'meta'  (Métamorphose)  → power +1 × level + l'élément du sort devient
//                             celui choisi au 1er cran (char.spellElements) —
//                             contourne les résistances.
// Migration héritage (C2) : un sort upgradé avant C3b (sans voie) garde son
// cumul au runtime, mais la Bibliothèque lui propose de choisir une voie
// avec +1 niveau OFFERT en compensation (migrateLegacySpellPath).
const LIBRARY_FOCUS_CHANCE_PER_LEVEL = 0.05;
const LIBRARY_AMPLITUDE_SPLASH_PER_2 = 0.08;
const LIBRARY_RESPEC_FRACTION = 0.4;
const LIBRARY_ELEMENTS = ['feu', 'glace', 'foudre', 'lumière', 'ténèbres'];
const LIBRARY_PATH_LABELS = { power: 'Puissance', focus: 'Maîtrise', amplitude: 'Amplitude', meta: 'Métamorphose' };
// Règle de coût : gold Bibliothèque = 1,5 × gold Forge ; pages = essence Forge ;
// même nombre de Primordiale (cf. library-t5.md).
const LIBRARY_COSTS = {
  1: { gold: 120,  pages: 1 },
  2: { gold: 240,  pages: 2 },
  3: { gold: 480,  pages: 3 },
  4: { gold: 960,  pages: 5 },
  5: { gold: 1920, pages: 8 },
  // T5 — au-delà de +5 : coûts en forte hausse + Essence Primordiale.
  6: { gold: 3300, pages: 10, primordiale: 1 },
  7: { gold: 5100, pages: 13, primordiale: 2 },
  8: { gold: 7500, pages: 16, primordiale: 3 },
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

// Essence Primordiale (T5) — requise pour les niveaux 6-8 (partagée avec la
// Forge). Helpers locaux pour rester indépendant de l'ordre de chargement.
function _countLibPrimordiale() {
  return _countMaterial('essence_primordiale');
}

function _consumeLibPrimordiale(n) {
  return _consumeMaterial('essence_primordiale', n);
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
    if (c && !c.spellUpgrades)  c.spellUpgrades = {};
    if (c && !c.spellPaths)     c.spellPaths = {};    // C3b — voie par sort
    if (c && !c.spellElements)  c.spellElements = {}; // Lot 2 — élément Métamorphose
  }
}
window._ensureSpellUpgradesInit = _ensureSpellUpgradesInit;

// ── Respec & migration héritage (Lot 2 revue 2026-07) ─────────
// Gold cumulé investi dans un sort amplifié au niveau `lvl` (PUR).
function _libraryInvestedGold(lvl) {
  let total = 0;
  for (let t = 1; t <= (lvl | 0); t++) {
    const cost = LIBRARY_COSTS[t];
    if (cost) total += cost.gold | 0;
  }
  return total;
}
window._libraryInvestedGold = _libraryInvestedGold;

// Coût du respec d'un sort (PUR) : fraction du gold cumulé investi.
function _libraryRespecCost(lvl) {
  return Math.ceil(_libraryInvestedGold(lvl) * LIBRARY_RESPEC_FRACTION);
}
window._libraryRespecCost = _libraryRespecCost;

// Change la voie d'un sort déjà amplifié (niveau conservé) contre or.
// `element` requis pour la voie 'meta'.
function reforgeSpellPathAtLibrary(charIdx, spellName, newPath, element) {
  const c = party[charIdx];
  if (!c) return false;
  _ensureSpellUpgradesInit();
  const lvl = getSpellUpgradeLevel(c, spellName);
  if (lvl <= 0) return false;
  if (!LIBRARY_PATH_LABELS[newPath]) return false;
  if (newPath === c.spellPaths[spellName]) return false;
  if (newPath === 'meta' && !LIBRARY_ELEMENTS.includes(element)) return false;
  const cost = _libraryRespecCost(lvl);
  if ((player.gold | 0) < cost) {
    addMsg(`Reforger la voie : ${cost} Gallions requis (vous en avez ${player.gold | 0}).`, 'bad');
    return false;
  }
  player.gold -= cost;
  c.spellPaths[spellName] = newPath;
  if (newPath === 'meta') c.spellElements[spellName] = element;
  else delete c.spellElements[spellName];
  addMsg(`♻️ ${spellName} : voie reforgée → ${LIBRARY_PATH_LABELS[newPath]}${element ? ` (${element})` : ''} (niv +${lvl} conservé).`, 'magic');
  if (typeof updateUI === 'function') updateUI();
  _libraryUiExpand = null;
  openLibrary();
  if (typeof autoSave === 'function') autoSave('library-respec');
  return true;
}
window.reforgeSpellPathAtLibrary = reforgeSpellPathAtLibrary;

// Migration héritage (C2) : un sort amplifié AVANT C3b (aucune voie posée)
// cumule power+focus au runtime — strictement supérieur aux voies pures.
// La Bibliothèque propose de trancher : le joueur choisit une voie et reçoit
// +1 niveau OFFERT en compensation (borné au plafond). Gratuit, one-shot.
// Sans interaction, le comportement combiné persiste (zéro nerf silencieux).
function migrateLegacySpellPath(charIdx, spellName, path, element) {
  const c = party[charIdx];
  if (!c) return false;
  _ensureSpellUpgradesInit();
  const lvl = getSpellUpgradeLevel(c, spellName);
  if (lvl <= 0) return false;
  if (c.spellPaths[spellName]) return false;      // pas un legacy
  if (!LIBRARY_PATH_LABELS[path]) return false;
  if (path === 'meta' && !LIBRARY_ELEMENTS.includes(element)) return false;
  c.spellPaths[spellName] = path;
  if (path === 'meta') c.spellElements[spellName] = element;
  c.spellUpgrades[spellName] = Math.min(LIBRARY_MAX_LEVEL, lvl + 1);
  addMsg(`📚 ${spellName} : héritage tranché → voie ${LIBRARY_PATH_LABELS[path]}${element ? ` (${element})` : ''}, +1 niveau offert (niv ${c.spellUpgrades[spellName]}).`, 'magic');
  if (typeof updateUI === 'function') updateUI();
  _libraryUiExpand = null;
  openLibrary();
  if (typeof autoSave === 'function') autoSave('library-legacy');
  return true;
}
window.migrateLegacySpellPath = migrateLegacySpellPath;

// État UI : panneau déplié (sous-choix d'élément / respec) — clé
// `${charIdx}:${nom du sort}:<mode>`.
let _libraryUiExpand = null;
function libraryToggleExpand(key) {
  _libraryUiExpand = (_libraryUiExpand === key) ? null : key;
  openLibrary();
}
window.libraryToggleExpand = libraryToggleExpand;

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

function upgradeSpellAtLibrary(charIdx, spellName, path, element) {
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
  // La voie est choisie au 1er upgrade (modifiable ensuite via
  // reforgeSpellPathAtLibrary) ; les upgrades suivants la suivent.
  if (current === 0) {
    c.spellPaths[spellName] = LIBRARY_PATH_LABELS[path] ? path : 'power';
    if (c.spellPaths[spellName] === 'meta') {
      if (!LIBRARY_ELEMENTS.includes(element)) { delete c.spellPaths[spellName]; return false; }
      c.spellElements[spellName] = element;
    }
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
  const needPrim = cost.primordiale | 0;
  if (needPrim > 0 && _countLibPrimordiale() < needPrim) {
    addMsg(`Bibliothèque : ${needPrim} Essence(s) Primordiale(s) requise(s) (au-delà de +5).`, 'bad');
    return false;
  }

  player.gold -= cost.gold;
  _consumePages(cost.pages);
  if (needPrim > 0) _consumeLibPrimordiale(needPrim);
  c.spellUpgrades[spellName] = target;
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  const voie = LIBRARY_PATH_LABELS[c.spellPaths[spellName]] || 'Puissance';
  addMsg(`${getSpellIconHtml(spellName, 'ui-icon-md')} ${c.name} amplifie ${spellName} (niv ${target}, voie ${voie}) !`, 'magic');
  _libraryUiExpand = null;
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
  if (pages) {
    const prim = _countLibPrimordiale();
    pages.textContent = `${_countPages()} Page(s)` + (prim > 0 ? ` · ${prim} 🔮 Primordiale(s)` : '');
  }

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
    const path      = getSpellPath(c, name);   // voie | undefined (legacy)
    const voieLbl   = LIBRARY_PATH_LABELS[path] || 'Puissance';
    const costLine = (cost && !utility)
      ? `<div class="library-cost">${cost.gold} g · ${cost.pages} 📜${cost.primordiale ? ` · ${cost.primordiale} 🔮` : ''}</div>`
      : '';
    const affordable = cost && player.gold >= cost.gold && _countPages() >= cost.pages
      && _countLibPrimordiale() >= (cost.primordiale | 0);
    const dis = affordable ? '' : 'disabled';
    // Aperçu de la voie Maîtrise : cost réduit (+ fiabilité de statut si applicable).
    const focusPreview = `cost ${cstNow} → <b>${cstNext}</b> SP${hasChance ? ` · statut +${Math.round(LIBRARY_FOCUS_CHANCE_PER_LEVEL * 100)}%` : ''}`;
    // Métamorphose : réservée aux sorts élémentaires non-physiques.
    const canMeta   = !!(spell.element && spell.element !== 'physique');
    const expandKey = `${_libraryCharIdx}:${name}`;
    // Boutons d'élément pour Métamorphose (exclut l'élément actuel du sort).
    const metaEls   = LIBRARY_ELEMENTS.filter(el => el !== spell.element);
    const metaBtns  = (fnTpl, disA) => metaEls.map(el =>
      `<button class="library-upgrade-btn ${disA}" ${disA}
         onclick="${fnTpl.replace('__EL__', el)}">${el}</button>`).join('');
    let previewLine = '', btn = '';
    if (utility) {
      previewLine = `<div class="library-preview forge-noupgrade">Effet utilitaire — non amplifiable</div>`;
    } else if (maxed) {
      previewLine = `<div class="library-preview forge-maxed">Niveau MAX (${voieLbl})</div>`;
    } else if (lvl === 0) {
      // 1er upgrade : choix entre les QUATRE voies (Lot 2). Métamorphose
      // ouvre un sous-choix d'élément.
      previewLine = `<div class="library-preview forge-choose">Choisir une voie :</div>`;
      if (_libraryUiExpand === `${expandKey}:meta`) {
        btn = `<div class="library-path-choice">
                 <div class="library-preview">🜍 Métamorphose — nouvel élément :</div>
                 ${metaBtns(`upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'meta', '__EL__')`, dis)}
                 <button class="library-upgrade-btn" onclick="libraryToggleExpand('${expandKey}:meta')">↩</button>
               </div>`;
      } else {
        btn = `<div class="library-path-choice">
                 <button class="library-upgrade-btn ${dis}" ${dis}
                   onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'power')">⚡ +Puissance</button>
                 <button class="library-upgrade-btn ${dis}" ${dis}
                   onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'focus')">🎯 Maîtrise</button>
                 <button class="library-upgrade-btn ${dis}" ${dis}
                   onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'amplitude')">💫 Amplitude</button>
                 ${canMeta ? `<button class="library-upgrade-btn ${dis}" ${dis}
                   onclick="libraryToggleExpand('${expandKey}:meta')">🜍 Métamorphose</button>` : ''}
               </div>`;
      }
    } else if (!path) {
      // Héritage combiné (pré-C3b) : proposer de trancher, +1 niveau offert.
      previewLine = `<div class="library-preview forge-choose">Héritage combiné — choisir une voie (+1 niveau offert) :</div>`;
      if (_libraryUiExpand === `${expandKey}:legacy-meta`) {
        btn = `<div class="library-path-choice">
                 <div class="library-preview">🜍 Métamorphose — nouvel élément :</div>
                 ${metaBtns(`migrateLegacySpellPath(${_libraryCharIdx}, '${nameEsc}', 'meta', '__EL__')`, '')}
                 <button class="library-upgrade-btn" onclick="libraryToggleExpand('${expandKey}:legacy-meta')">↩</button>
               </div>`;
      } else {
        btn = `<div class="library-path-choice">
                 <button class="library-upgrade-btn"
                   onclick="migrateLegacySpellPath(${_libraryCharIdx}, '${nameEsc}', 'power')">⚡ Puissance</button>
                 <button class="library-upgrade-btn"
                   onclick="migrateLegacySpellPath(${_libraryCharIdx}, '${nameEsc}', 'focus')">🎯 Maîtrise</button>
                 <button class="library-upgrade-btn"
                   onclick="migrateLegacySpellPath(${_libraryCharIdx}, '${nameEsc}', 'amplitude')">💫 Amplitude</button>
                 ${canMeta ? `<button class="library-upgrade-btn"
                   onclick="libraryToggleExpand('${expandKey}:legacy-meta')">🜍 Métamorphose</button>` : ''}
               </div>`;
      }
    } else {
      // Voie choisie : aperçu + bouton unique + respec (Reforger la voie).
      const ampNow  = Math.round(LIBRARY_AMPLITUDE_SPLASH_PER_2 * Math.floor(lvl / 2) * 100);
      const ampNext = Math.round(LIBRARY_AMPLITUDE_SPLASH_PER_2 * Math.floor((lvl + 1) / 2) * 100);
      previewLine = (path === 'focus')
        ? `<div class="library-preview">${focusPreview}</div>`
        : (path === 'amplitude')
        ? `<div class="library-preview">💫 power ${(spell.power | 0) + lvl} → <b>${(spell.power | 0) + lvl + 1}</b> · splash ${ampNow}% → <b>${ampNext}%</b></div>`
        : (path === 'meta')
        ? `<div class="library-preview">🜍 ${c.spellElements[name] || spell.element} · power ${(spell.power | 0) + lvl} → <b>${(spell.power | 0) + lvl + 1}</b></div>`
        : `<div class="library-preview">power ${pwrNow} → <b>${pwrNext}</b></div>`;
      const respecCost   = _libraryRespecCost(lvl);
      const respecAfford = (player.gold | 0) >= respecCost;
      const respecDis    = respecAfford ? '' : 'disabled';
      let respecUi;
      if (_libraryUiExpand === `${expandKey}:respec-meta`) {
        respecUi = `<div class="library-path-choice">
            <div class="library-preview">🜍 Métamorphose — nouvel élément :</div>
            ${metaBtns(`reforgeSpellPathAtLibrary(${_libraryCharIdx}, '${nameEsc}', 'meta', '__EL__')`, respecDis)}
            <button class="library-upgrade-btn" onclick="libraryToggleExpand('${expandKey}:respec-meta')">↩</button>
          </div>`;
      } else if (_libraryUiExpand === `${expandKey}:respec`) {
        const others = Object.keys(LIBRARY_PATH_LABELS)
          .filter(p => p !== path && (p !== 'meta' || canMeta));
        respecUi = `<div class="library-path-choice">
            ${others.map(p => p === 'meta'
              ? `<button class="library-upgrade-btn ${respecDis}" ${respecDis}
                   onclick="libraryToggleExpand('${expandKey}:respec-meta')">🜍 ${LIBRARY_PATH_LABELS[p]}</button>`
              : `<button class="library-upgrade-btn ${respecDis}" ${respecDis}
                   onclick="reforgeSpellPathAtLibrary(${_libraryCharIdx}, '${nameEsc}', '${p}')">${LIBRARY_PATH_LABELS[p]}</button>`).join('')}
            <button class="library-upgrade-btn" onclick="libraryToggleExpand('${expandKey}:respec')">↩</button>
          </div>`;
      } else {
        respecUi = `<button class="library-upgrade-btn ${respecDis}" ${respecDis}
            onclick="libraryToggleExpand('${expandKey}:respec')">♻️ Reforger (${respecCost}g)</button>`;
      }
      btn = `<button class="library-upgrade-btn ${dis}" ${dis}
               onclick="upgradeSpellAtLibrary(${_libraryCharIdx}, '${nameEsc}')">Amplifier (${voieLbl})</button>${respecUi}`;
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
  if (typeof maybeLibraryTour === 'function') maybeLibraryTour();   // P2.4 — mini-tour 1ʳᵉ ouverture
}
window.openLibrary = openLibrary;
