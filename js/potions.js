// ============================================================
// CONCOCTION DE POTIONS — besace d'herboriste + chaudron
// ============================================================
// Voir .claude/plans/farming-potion-system.md.
//
// - Besace : player.herbs { herbId: count } (non plafonnée).
// - Recettes connues : player.knownRecipes [].
// - Le brassage se fait chez Slughorn (action spéciale `open_brewing`),
//   verrouillé tant que la quête `quest_potions_slughorn` n'est pas remise.
//
// LOT C5 — « Brassage maison » : une potion issue du chaudron porte le flag
// `brewed:true` et restaure plus qu'une potion achetée (appliqué dans
// inventory.js — _applyConsumableEffect). Récompense la boucle de brassage.
//
// LOT P1 — « Brassage à maîtrise » : la potency est désormais BAKÉE dans la
// fiole (`brewPotency`), variable selon la qualité du jet :
//   ratée (jet manqué, recette connue) → -15 % (fiole diluée, au lieu de 0)
//   réussite                           → +20 %
//   critique                           → +40 % (qualitatif, pas que ×2)
//   + maîtrise : +1 %/pt d'INT au-dessus de 15, plafonné [-15 %, +50 %].
// `BREW_POTENCY_BONUS` reste le fallback legacy (fioles brassées avant P1,
// flag `brewed:true` sans `brewPotency`).
const BREW_POTENCY_BONUS  = 0.25;   // fallback legacy (potions d'avant P1)
const BREW_POTENCY_TIERS  = { fail: -0.15, success: 0.20, crit: 0.40 };
const BREW_INT_THRESHOLD  = 15;     // INT au-delà duquel la maîtrise bonifie
const BREW_INT_BONUS_PER  = 0.01;   // +1 % de potency / pt d'INT au-dessus du seuil
const BREW_POTENCY_CAP    = 0.50;   // plafond de potency
const BREW_POTENCY_FLOOR  = -0.15;  // plancher (fiole diluée)

// Potency bakée dans une fiole selon la qualité de brassage + l'INT du brasseur.
function _brewPotencyFor(kind) {
  const base = BREW_POTENCY_TIERS[kind] || 0;
  const intBonus = Math.max(0, _bestBrewerInt() - BREW_INT_THRESHOLD) * BREW_INT_BONUS_PER;
  return Math.max(BREW_POTENCY_FLOOR, Math.min(BREW_POTENCY_CAP, base + intBonus));
}

// ── Besace d'herboriste ──────────────────────────────────────

function addHerb(id, n) {
  n = n || 1;
  if (!player.herbs) player.herbs = {};
  player.herbs[id] = (player.herbs[id] || 0) + n;
}

function getHerbCount(id) {
  return (player.herbs && player.herbs[id]) || 0;
}

// Un « ingrédient » de potion est soit une herbe (besace player.herbs),
// soit un item du sac (player.inventory) — Racine de Mandragore, potions de
// rang inférieur (upgrade-craft P4), Éclat de Vitalité. La distinction se fait
// sur le type : seuls les `type:"herb"` vivent dans la besace ; tout le reste
// est résolu depuis l'inventaire. Cette indirection permet aux recettes de
// mélanger les deux sources.
function _isHerbIngredient(id) {
  const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
  return it ? it.type === 'herb' : true; // défaut prudent : traiter comme herbe
}

function _ingredientCount(id) {
  if (!_isHerbIngredient(id)) {
    return (player.inventory || []).filter(it => it && it.id === id).length;
  }
  return getHerbCount(id);
}

function _consumeIngredient(id, n) {
  if (!_isHerbIngredient(id)) {
    for (let k = 0; k < n; k++) {
      const idx = (player.inventory || []).findIndex(it => it && it.id === id);
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
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/scroll.png" alt=""> Nouvelle recette apprise : ${r.name} !`, 'magic');
  }
  return true;
}

function _getRecipe(id) {
  return (typeof POTION_RECIPES !== 'undefined')
    ? POTION_RECIPES.find(r => r.id === id) || null
    : null;
}

// Indice NON-SPOILER d'une recette non encore découverte (codex P6.a).
// Révèle le palier d'herbes et le nombre d'ingrédients, jamais le combo
// exact ni le produit. `advanced` = la recette consomme un ingrédient de
// sac (potion de rang inférieur, Éclat, mandragore) et non que des herbes.
function _recipeHint(recipe) {
  const ing = (recipe && recipe.ingredients) || {};
  let ingCount = 0, palier = 0, advanced = false;
  for (const id of Object.keys(ing)) {
    ingCount += ing[id];
    if (_isHerbIngredient(id)) {
      const it = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null;
      palier = Math.max(palier, (it && it.tier) || 1);
    } else {
      advanced = true;
    }
  }
  return { palier, ingCount, advanced };
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

  // Jet INT : ratée / réussite / critique. P1 — une recette CONNUE dont le jet
  // échoue produit désormais 1 fiole diluée (au lieu de 0) ; seul un mélange
  // sans recette (capté plus haut) ne donne rien.
  const roll   = 1 + Math.floor(Math.random() * 20);
  const margin = _bestBrewerInt() + roll - recipe.difficulty;
  let potions, kind;
  if (margin < 0)       { potions = 1; kind = 'fail'; }
  else if (margin < 12) { potions = 1; kind = 'success'; }
  else                  { potions = 2; kind = 'crit'; }

  // P1 — potency bakée dans la fiole selon la qualité du jet + l'INT.
  const potency = _brewPotencyFor(kind);

  let added = 0;
  for (let i = 0; i < potions; i++) {
    if (tryAddItem(recipe.resultItemId, { silent: true, props: { brewed: true, brewPotency: potency } })) added++;
  }
  const lost = potions - added;

  const resultItem = (typeof ITEMS !== 'undefined')
    ? ITEMS.find(i => i.id === recipe.resultItemId) : null;
  const potName = resultItem ? resultItem.name : recipe.name;
  const pctTxt  = (potency >= 0 ? '+' : '') + Math.round(potency * 100) + '%';

  let html = '';
  if (kind === 'fail') {
    // Jet manqué : la fiole est diluée (potency négative), pas perdue.
    _brewResult = { cls: 'is-fail',
      html: `Brassage médiocre : ${added}× ${potName} `
        + `<span class="brew-potency-note">🧪 fiole diluée (${pctTxt} d'effet)</span>.`
        + (lost > 0 ? ` (${lost} perdue${lost > 1 ? 's' : ''} — sac plein.)` : '') };
    if (typeof addMsg === 'function') addMsg(`Brassage médiocre : ${added}× ${potName} diluée (${pctTxt}).`, 'bad');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playDeath) AudioSystem.playDeath();
  } else {
    const cls = (kind === 'crit') ? 'is-crit' : 'is-success';
    const tag = (kind === 'crit') ? ' <b>Brassage critique ×2 !</b>' : '';
    const qual = (kind === 'crit') ? 'Concentrée' : 'Brassage maison';
    html = `Succès : ${added}× ${potName}.${tag}`
      + ` <span class="brew-potency-note">✨ ${qual} : ${pctTxt} d'effet.</span>`;
    if (lost > 0) html += ` (${lost} perdue${lost > 1 ? 's' : ''} — sac plein.)`;
    _brewResult = { cls, html };
    if (typeof addMsg === 'function') {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/items/potion_m.png" alt=""> Brassage réussi : ${added}× ${potName}${kind === 'crit' ? ' (critique !)' : ''} — ${pctTxt} d'effet.`, 'good');
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

  // 5) Codex des recettes — connues (lisibles + « Préparer ») vs à découvrir
  //    (silhouette masquée + indice non-spoiler de palier/ingrédients). P6.a.
  const allRecipes = (typeof POTION_RECIPES !== 'undefined') ? POTION_RECIPES : [];
  const knownSet   = new Set(player.knownRecipes || []);
  const discovered = allRecipes.filter(r => knownSet.has(r.id)).length;
  html += `<div class="brewing-section"><div class="brewing-section-label">Codex des recettes `
    + `<span class="brew-codex-count">${discovered}/${allRecipes.length} découvertes</span>`
    + `<span class="brew-potency-note">✨ Brassage maison : +${Math.round(BREW_POTENCY_TIERS.success * 100)}% · critique +${Math.round(BREW_POTENCY_TIERS.crit * 100)}%</span></div>`;
  if (allRecipes.length) {
    html += `<div class="brew-recipes">`;
    for (const r of allRecipes) {
      if (knownSet.has(r.id)) {
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
      } else {
        const h = _recipeHint(r);
        const noun = `${h.ingCount} ingrédient${h.ingCount > 1 ? 's' : ''}`;
        const hintTxt = h.advanced ? `Recette avancée · ${noun}` : `Palier ${h.palier} · ${noun}`;
        html += `<div class="brew-recipe-row brew-recipe-locked">`
          + `<div class="brew-recipe-info"><div class="brew-recipe-name">🔒 ? ? ?</div>`
          + `<div class="brew-recipe-ing">${hintTxt}</div></div></div>`;
      }
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
