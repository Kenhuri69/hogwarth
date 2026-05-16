// ============================================================
// CONCOCTION DE POTIONS — besace d'herboriste + chaudron
// ============================================================
// Voir .claude/plans/farming-potion-system.md.
//
// - Besace : player.herbs { herbId: count } (non plafonnée).
// - Recettes connues : player.knownRecipes [].
// - Le brassage se fait chez Slughorn (action spéciale `open_brewing`),
//   verrouillé tant que la quête `quest_potions_slughorn` n'est pas remise.

// ── Besace d'herboriste ──────────────────────────────────────

function addHerb(id, n) {
  n = n || 1;
  if (!player.herbs) player.herbs = {};
  player.herbs[id] = (player.herbs[id] || 0) + n;
}

function getHerbCount(id) {
  return (player.herbs && player.herbs[id]) || 0;
}

// Un « ingrédient » de potion est soit une herbe (besace), soit la
// Racine de Mandragore (item consommable du sac). Cette indirection
// permet aux recettes de mélanger les deux sources.
function _ingredientCount(id) {
  if (id === 'mandragore') {
    return (player.inventory || []).filter(it => it && it.id === 'mandragore').length;
  }
  return getHerbCount(id);
}

function _consumeIngredient(id, n) {
  if (id === 'mandragore') {
    for (let k = 0; k < n; k++) {
      const idx = (player.inventory || []).findIndex(it => it && it.id === 'mandragore');
      if (idx >= 0) player.inventory.splice(idx, 1);
    }
    return;
  }
  if (!player.herbs) player.herbs = {};
  player.herbs[id] = Math.max(0, (player.herbs[id] || 0) - n);
  if (player.herbs[id] === 0) delete player.herbs[id];
}

// ── Recettes ─────────────────────────────────────────────────

function _isBrewingUnlocked() {
  return typeof completedQuests !== 'undefined'
    && completedQuests.has('quest_potions_slughorn');
}

// Apprend une recette au groupe (besace partagée). Idempotent.
function learnRecipe(id) {
  if (!player.knownRecipes) player.knownRecipes = [];
  if (player.knownRecipes.includes(id)) return false;
  const r = (typeof POTION_RECIPES !== 'undefined')
    && POTION_RECIPES.find(x => x.id === id);
  if (!r) return false;
  player.knownRecipes.push(id);
  if (typeof addMsg === 'function') {
    addMsg(`📜 Nouvelle recette apprise : ${r.name} !`, 'magic');
  }
  return true;
}

function _getRecipe(id) {
  return (typeof POTION_RECIPES !== 'undefined')
    ? POTION_RECIPES.find(r => r.id === id) || null
    : null;
}

// Cherche la recette dont le multiset d'ingrédients correspond
// EXACTEMENT au mélange (mêmes ids, mêmes quantités).
function _matchRecipe(mix) {
  const a = {};
  for (const k of Object.keys(mix)) if (mix[k] > 0) a[k] = mix[k];
  const akeys = Object.keys(a);
  if (!akeys.length) return null;
  return (typeof POTION_RECIPES !== 'undefined' ? POTION_RECIPES : []).find(r => {
    const b = r.ingredients || {};
    const bkeys = Object.keys(b);
    if (akeys.length !== bkeys.length) return false;
    return akeys.every(k => a[k] === b[k]);
  }) || null;
}

// ── Jet INT ──────────────────────────────────────────────────

function _bestBrewerInt() {
  let best = 0;
  const size = (typeof partySize === 'number') ? partySize : party.length;
  for (let i = 0; i < size; i++) {
    const c = party[i];
    if (c && c.hp > 0) best = Math.max(best, c.int || 0);
  }
  return best;
}

// Probabilité de réussite (margin >= 0) en pourcentage entier.
// margin = int + rand(1..20) - difficulty.
function _brewChance(recipe) {
  const need = recipe.difficulty - _bestBrewerInt(); // rand requis >= need
  let fav = 21 - need;
  fav = Math.max(0, Math.min(20, fav));
  return Math.round(fav / 20 * 100);
}

// ── État local de la modale ──────────────────────────────────

let _cauldronMix  = {};   // { ingredientId: qty } — tampon non engagé
let _brewResult   = null; // { cls, html } — bandeau du dernier brassage

// ── Iconographie chaudron ────────────────────────────────────

function _ingredientTint(id) {
  if (id === 'mandragore') return '#6fbf4a';
  const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
  const t = it && it.tier;
  if (t === 3) return '#7a3a9d';
  if (t === 2) return '#3aa890';
  return '#5fae3f';
}

// Teinte du liquide = ingrédient dominant du mélange (gris-vert si vide).
function _cauldronLiquid() {
  let domId = null, domQty = 0;
  for (const k of Object.keys(_cauldronMix)) {
    if (_cauldronMix[k] > domQty) { domQty = _cauldronMix[k]; domId = k; }
  }
  return domId ? _ingredientTint(domId) : '#3a4a3a';
}

function _cauldronSvg(liquid) {
  return `<svg viewBox="0 0 120 112" xmlns="http://www.w3.org/2000/svg">`
    + `<rect x="32" y="84" width="10" height="20" rx="3.5" fill="#15151a"/>`
    + `<rect x="78" y="84" width="10" height="20" rx="3.5" fill="#15151a"/>`
    + `<path d="M22 50 Q8 56 22 72" fill="none" stroke="#2a2a32" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M98 50 Q112 56 98 72" fill="none" stroke="#2a2a32" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M18 47 Q18 96 60 96 Q102 96 102 47 Z" fill="#26262e" stroke="#000" stroke-width="2"/>`
    + `<ellipse cx="60" cy="47" rx="46" ry="12.5" fill="#16161b"/>`
    + `<ellipse cx="60" cy="46" rx="40" ry="9.5" fill="${liquid}"/>`
    + `<ellipse cx="60" cy="43.5" rx="34" ry="6.5" fill="#ffffff" opacity="0.22"/>`
    + `</svg>`;
}

// ── Manipulation du chaudron ─────────────────────────────────

function _addToCauldron(id) {
  const inCauldron = _cauldronMix[id] || 0;
  if (_ingredientCount(id) - inCauldron <= 0) return;
  _cauldronMix[id] = inCauldron + 1;
  _renderBrewingModal();
}

function _removeFromCauldron(id) {
  if (!_cauldronMix[id]) return;
  _cauldronMix[id]--;
  if (_cauldronMix[id] <= 0) delete _cauldronMix[id];
  _renderBrewingModal();
}

function _clearCauldron() {
  _cauldronMix = {};
  _renderBrewingModal();
}

function _canAffordRecipe(recipe) {
  const ing = recipe.ingredients || {};
  return Object.keys(ing).every(id => _ingredientCount(id) >= ing[id]);
}

function _fillFromRecipe(recipeId) {
  const r = _getRecipe(recipeId);
  if (!r || !_canAffordRecipe(r)) return;
  _cauldronMix = {};
  for (const id of Object.keys(r.ingredients)) {
    _cauldronMix[id] = r.ingredients[id];
  }
  _renderBrewingModal();
}

// ── Brassage ─────────────────────────────────────────────────

function attemptBrew() {
  const ids = Object.keys(_cauldronMix).filter(k => _cauldronMix[k] > 0);
  if (!ids.length) return;
  // Garde-fou : disponibilité réelle.
  for (const id of ids) {
    if (_ingredientCount(id) < _cauldronMix[id]) {
      if (typeof addMsg === 'function') addMsg('Ingrédients insuffisants.', 'bad');
      return;
    }
  }

  if (typeof AudioSystem !== 'undefined' && AudioSystem.playBrew) AudioSystem.playBrew();

  const recipe = _matchRecipe(_cauldronMix);

  // Les ingrédients sont TOUJOURS consommés (c'est le risque).
  for (const id of ids) _consumeIngredient(id, _cauldronMix[id]);
  _cauldronMix = {};

  if (!recipe) {
    _brewResult = {
      cls: 'is-fail',
      html: 'Le mélange tourne mal — une fumée âcre s\'élève. Rien d\'utilisable.'
    };
    if (typeof addMsg === 'function') addMsg('Brassage raté : le mélange ne donne rien.', 'bad');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playDeath) AudioSystem.playDeath();
    _renderBrewingModal();
    return;
  }

  // Découverte d'une recette inconnue.
  let discovered = false;
  if (!player.knownRecipes || !player.knownRecipes.includes(recipe.id)) {
    learnRecipe(recipe.id);
    discovered = true;
  }

  // Jet INT : échec / réussite / critique.
  const roll   = 1 + Math.floor(Math.random() * 20);
  const margin = _bestBrewerInt() + roll - recipe.difficulty;
  let potions, kind;
  if (margin < 0)       { potions = 0; kind = 'fail'; }
  else if (margin < 12) { potions = 1; kind = 'success'; }
  else                  { potions = 2; kind = 'crit'; }

  let added = 0;
  for (let i = 0; i < potions; i++) {
    if (tryAddItem(recipe.resultItemId, { silent: true })) added++;
  }
  const lost = potions - added;

  const resultItem = (typeof ITEMS !== 'undefined')
    ? ITEMS.find(i => i.id === recipe.resultItemId) : null;
  const potName = resultItem ? resultItem.name : recipe.name;

  let html = '';
  if (kind === 'fail') {
    _brewResult = { cls: 'is-fail',
      html: `Le brassage échoue : ${recipe.name} n'a pas pris.` };
    if (typeof addMsg === 'function') addMsg(`Brassage raté : ${recipe.name}.`, 'bad');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playDeath) AudioSystem.playDeath();
  } else {
    const cls = (kind === 'crit') ? 'is-crit' : 'is-success';
    const tag = (kind === 'crit') ? ' <b>Brassage critique ×2 !</b>' : '';
    html = `Succès : ${added}× ${potName}.${tag}`;
    if (lost > 0) html += ` (${lost} perdue${lost > 1 ? 's' : ''} — sac plein.)`;
    _brewResult = { cls, html };
    if (typeof addMsg === 'function') {
      addMsg(`🧪 Brassage réussi : ${added}× ${potName}${kind === 'crit' ? ' (critique !)' : ''}.`, 'good');
      if (lost > 0) addMsg(`Sac plein — ${lost} potion(s) perdue(s).`, 'bad');
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  }

  if (discovered) {
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
    _brewResult.discover = `Tu découvres la recette : ${recipe.name} !`;
  }

  if (typeof updateUI === 'function') updateUI();
  if (typeof autoSave === 'function') autoSave('brew');
  _renderBrewingModal();
}

// ── UI ───────────────────────────────────────────────────────

function openBrewingModal() {
  if (!_isBrewingUnlocked()) {
    if (typeof addMsg === 'function') {
      addMsg("Slughorn ne t'a pas encore confié son chaudron.", 'bad');
    }
    return;
  }
  _cauldronMix = {};
  _brewResult  = null;
  const modal = document.getElementById('brewing-modal');
  if (!modal) return;
  _renderBrewingModal();
  modal.style.display = 'flex';
}

function _ingredientChip(id, qty, onClick, opts) {
  opts = opts || {};
  const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
  const name = it ? it.name : id;
  const icon = (typeof getItemIconHtml === 'function' && it)
    ? getItemIconHtml(it, 'ui-icon-xl')
    : (it && it.icon ? it.icon : '🌿');
  const dis = opts.disabled ? ' brew-tile-disabled' : '';
  const click = opts.disabled ? '' : ` onclick="${onClick}"`;
  const qtyHtml = (qty !== null && qty !== undefined)
    ? `<span class="brew-tile-qty">×${qty}</span>` : '';
  return `<div class="brew-tile${dis}"${click} role="button" tabindex="0">`
    + `<div class="brew-tile-icon">${icon}</div>`
    + `<div class="brew-tile-name">${name}</div>${qtyHtml}</div>`;
}

function _renderBrewingModal() {
  const body = document.getElementById('brewing-body');
  if (!body) return;

  const mixIds = Object.keys(_cauldronMix).filter(k => _cauldronMix[k] > 0);

  // 1) Chaudron
  let resultCls = '';
  if (_brewResult) resultCls = ' ' + _brewResult.cls;
  let html = `<div class="brewing-cauldron-wrap${resultCls}">`
    + `<div class="brewing-cauldron">${_cauldronSvg(_cauldronLiquid())}</div>`
    + `<span class="brew-bubble brew-bubble-1"></span>`
    + `<span class="brew-bubble brew-bubble-2"></span>`
    + `<span class="brew-bubble brew-bubble-3"></span>`
    + `</div>`;

  // 2) Mélange courant
  html += `<div class="brewing-section">`
    + `<div class="brewing-section-label">Dans le chaudron`
    + (mixIds.length ? ` <button type="button" class="brew-mini-btn" onclick="_clearCauldron()">Vider</button>` : '')
    + `</div>`;
  if (mixIds.length) {
    html += `<div class="brew-tiles">`;
    for (const id of mixIds) {
      html += _ingredientChip(id, _cauldronMix[id], `_removeFromCauldron('${id}')`);
    }
    html += `</div>`;
  } else {
    html += `<div class="brew-empty">Le chaudron est vide. Ajoute des herbes depuis ta besace, ou prépare une recette connue.</div>`;
  }
  html += `</div>`;

  // 3) Bouton de brassage + estimation
  const matched = _matchRecipe(_cauldronMix);
  let chanceTxt = '';
  if (mixIds.length) {
    if (matched && player.knownRecipes && player.knownRecipes.includes(matched.id)) {
      chanceTxt = `Réussite estimée : <b>${_brewChance(matched)} %</b>`;
    } else {
      chanceTxt = `Résultat incertain… (mélange non identifié)`;
    }
  }
  html += `<button type="button" class="brew-launch-btn" `
    + (mixIds.length ? '' : 'disabled ')
    + `onclick="attemptBrew()">Lancer le brassage</button>`;
  if (chanceTxt) html += `<div class="brew-chance">${chanceTxt}</div>`;

  // 4) Bandeau de résultat
  if (_brewResult) {
    html += `<div class="brew-result ${_brewResult.cls}">`;
    if (_brewResult.discover) {
      html += `<div class="brew-result-discover">📜 ${_brewResult.discover}</div>`;
    }
    if (_brewResult.html) html += `<div>${_brewResult.html}</div>`;
    html += `</div>`;
  }

  // 5) Recettes connues
  const known = (player.knownRecipes || [])
    .map(_getRecipe).filter(Boolean);
  html += `<div class="brewing-section"><div class="brewing-section-label">Recettes connues</div>`;
  if (known.length) {
    html += `<div class="brew-recipes">`;
    for (const r of known) {
      const ingTxt = Object.keys(r.ingredients).map(id => {
        const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
        return `${(it && it.name) || id}×${r.ingredients[id]}`;
      }).join(', ');
      const afford = _canAffordRecipe(r);
      html += `<div class="brew-recipe-row">`
        + `<div class="brew-recipe-info"><div class="brew-recipe-name">${r.name}</div>`
        + `<div class="brew-recipe-ing">${ingTxt}</div></div>`
        + `<button type="button" class="brew-mini-btn" `
        + (afford ? '' : 'disabled title="Herbes manquantes" ')
        + `onclick="_fillFromRecipe('${r.id}')">Préparer</button>`
        + `</div>`;
    }
    html += `</div>`;
  } else {
    html += `<div class="brew-empty">Aucune recette connue. Expérimente librement au chaudron pour en découvrir !</div>`;
  }
  html += `</div>`;

  // 6) Besace d'herboriste
  const owned = [];
  if (player.herbs) {
    for (const id of Object.keys(player.herbs)) {
      if (player.herbs[id] > 0) owned.push(id);
    }
  }
  if (_ingredientCount('mandragore') > 0) owned.push('mandragore');
  // Ordre stable : suit l'ordre de ITEMS.
  owned.sort((a, b) => {
    const ia = (typeof ITEMS !== 'undefined') ? ITEMS.findIndex(i => i.id === a) : 0;
    const ib = (typeof ITEMS !== 'undefined') ? ITEMS.findIndex(i => i.id === b) : 0;
    return ia - ib;
  });
  html += `<div class="brewing-section"><div class="brewing-section-label">Ta besace d'herboriste</div>`;
  if (owned.length) {
    html += `<div class="brew-tiles">`;
    for (const id of owned) {
      const avail = _ingredientCount(id) - (_cauldronMix[id] || 0);
      html += _ingredientChip(id, avail, `_addToCauldron('${id}')`, { disabled: avail <= 0 });
    }
    html += `</div>`;
  } else {
    html += `<div class="brew-empty">Ta besace est vide. Fouille les salles et affronte les créatures botaniques pour récolter des herbes.</div>`;
  }
  html += `</div>`;

  body.innerHTML = html;
}
