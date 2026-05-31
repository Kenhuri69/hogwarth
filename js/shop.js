// ============================================================
// BOUTIQUE — partage entre shop fixe et vendeurs ambulants
// Onglets Acheter / Vendre. Tarifs de rachat configurables par vendeur
// (champ `buyback` sur l'entrée NPCS). Le shop fixe (Madame Malkins)
// utilise STATIC_SHOP_BUYBACK comme fallback.
// ============================================================

// Catalogue progressif : chaque article débloque à un étage minimum
const SHOP_CATALOG = [
  { id: "potion_s",            minFloor: 1 },
  { id: "mandragore",          minFloor: 1 },
  { id: "choco_sorcier",       minFloor: 1 },
  { id: "wand1",               minFloor: 1 },
  { id: "gants_apprenti",      minFloor: 1 },
  { id: "bottes_apprenti",     minFloor: 1 },
  { id: "potion_m",            minFloor: 2 },
  { id: "eclat_vitalite",      minFloor: 3 },
  { id: "elixir_antidote",     minFloor: 2 },
  { id: "elixir_regen",        minFloor: 3 },
  { id: "potion_resistance",   minFloor: 3 },
  { id: "potion_defense",      minFloor: 3 },
  { id: "elixir_celerite",     minFloor: 4 },
  { id: "potion_precision",    minFloor: 4 },
  { id: "elixir_puissance",    minFloor: 4 },
  { id: "flacon_feu",          minFloor: 3 },
  { id: "flacon_givre",        minFloor: 3 },
  { id: "flacon_venin",        minFloor: 4 },
  { id: "lame_sanguinaire",    minFloor: 4 },
  { id: "armure_lourde",       minFloor: 4 },
  { id: "anneau_furie",        minFloor: 5 },
  { id: "robe1",               minFloor: 2 },
  { id: "livre_sortileges",    minFloor: 2 },
  { id: "chapeau_apprenti",    minFloor: 2 },
  { id: "ceinture_cuir",       minFloor: 2 },
  { id: "anneau_argent",       minFloor: 2 },
  { id: "felix",               minFloor: 3 },
  { id: "amulette",            minFloor: 3 },
  { id: "cape_voyageur",       minFloor: 3 },
  { id: "amulette_protection", minFloor: 3 },
  { id: "broom",               minFloor: 4 },
  { id: "livre_soin",          minFloor: 4 },
  { id: "chapeau_pointu",      minFloor: 4 },
  { id: "circlet_serdaigle",   minFloor: 5 },
  { id: "anneau_runique",      minFloor: 5 },
  { id: "ceinture_alchimiste", minFloor: 5 },
  { id: "livre_bombarda",      minFloor: 5 },
  { id: "potion_l",            minFloor: 5 },
  { id: "potion_l_sp",         minFloor: 5 },
  { id: "livre_patronum",      minFloor: 6 },
  { id: "livre_glacius",       minFloor: 3 },
  { id: "livre_fulgari",       minFloor: 5 },
  // Grimoires de zone (AoE) — débloqués quand les groupes s'étoffent
  { id: "livre_glacius_tempete", minFloor: 6 },
  { id: "livre_diffindo_maxima", minFloor: 6 },
  { id: "livre_vulnera",         minFloor: 6 },
  { id: "livre_fulgur_catena",   minFloor: 7 },
  // livre_lux_aeterna : retiré du catalogue — exclusif à la quête
  // dumbledore_lumiere (cf. .claude/plans/dumbledore-lux-aeterna.md).
  { id: "livre_nox_vorax",       minFloor: 9 },
  { id: "cape_invis",          minFloor: 7 },
  { id: "bottes_dragon",       minFloor: 7 },
  { id: "retourneur_temps",    minFloor: 7 },
  // Phase 3c — équipements mid-game (étages 3-7)
  { id: "gants_duelliste",     minFloor: 3 },
  { id: "anneau_courage",      minFloor: 4 },
  { id: "ceinture_force",      minFloor: 4 },
  { id: "casque_aurore",       minFloor: 5 },
  { id: "talisman_tactique",   minFloor: 6 },
  { id: "bottes_silence",      minFloor: 6 },
  // Premium utilitaire (cf. .claude/plans/teleportation-spell.md).
  { id: "livre_portus",        minFloor: 6 },
  // Phase 3 — Tranche étage 8 « Le Seuil » : équipement Auror clandestin
  { id: "casque_auror",        minFloor: 8 },
  { id: "bottes_renforcees",   minFloor: 8 },
  { id: "cape_combat",         minFloor: 8 },
  { id: "anneau_anti_magie",   minFloor: 8 },
  { id: "potion_lune",         minFloor: 8 },
  // Phase 3 — Tranche étage 9 « Les Profondeurs » : équipement endgame mid
  { id: "diademe_antique",     minFloor: 9 },
  { id: "bague_protection",    minFloor: 9 },
  { id: "robe_combat",         minFloor: 9 },
  // Phase 3 — Tranche étage 10 « Le Précipice » : équipement antichambre Voldemort
  { id: "pectoral_auror",       minFloor: 10 },
  { id: "larme_phenix_mineure", minFloor: 10 },
  { id: "grimoire_avance",      minFloor: 10 },
  // Consommables endgame (post-victoire) — voir ENDGAME_PLAN.md §7.10
  { id: "potion_xl",           minFloor: 15 },
  { id: "potion_xl_sp",        minFloor: 15 },
  // Herbes d'herboriste (ingrédients de potion → besace) — déblocage par
  // palier cohérent avec les tiers d'herbe. Source d'appoint fiable :
  // achat répétable (cf. _purchase, herbes non spliced du stock).
  { id: "herbe_armoise",       minFloor: 1 },
  { id: "herbe_ortie",         minFloor: 1 },
  { id: "herbe_asphodele",     minFloor: 4 },
  { id: "herbe_branchiflore",  minFloor: 4 },
  { id: "herbe_aconit",        minFloor: 7 },
  { id: "herbe_dictame",       minFloor: 7 },
];

// Politique de rachat par défaut (boutique fixe Madame Malkins). Les
// vendeurs ambulants peuvent override via npc.buyback.
const STATIC_SHOP_BUYBACK = { default: 0.50 };

// ── Stock fini & réassort (boutique fixe — anti-farming) ──────
// Voir .claude/plans/shop-purchase-limits.md
const SHOP_STOCK_SIZE    = 8;   // objets tirés au hasard par réassort
const SHOP_RESTOCK_STEPS = 40;  // pas avant réassort automatique

// État courant du shop ouvert (kind 'static' | 'vendor', mode 'buy' | 'sell')
let _shopContext = { kind: 'static', npcId: null };
let _shopMode    = 'buy';

// Tire `count` éléments distincts au hasard d'un tableau (sans le muter).
function _pickRandom(pool, count) {
  const bag = pool.slice();
  const out = [];
  while (bag.length && out.length < count) {
    out.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  return out;
}

// Tire un nouveau stock pour la boutique fixe : sous-ensemble aléatoire
// du catalogue éligible à l'étage courant, livres déjà achetés exclus,
// avec ≥ 2 consommables garantis si disponibles (anti-softlock soin).
function _rollShopStock() {
  const floor = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  let eligible = SHOP_CATALOG.filter(e => e.minFloor <= floor);
  if (eligible.length === 0) eligible = SHOP_CATALOG.filter(e => e.minFloor <= 1);
  eligible = eligible.filter(e => {
    const it = ITEMS.find(i => i.id === e.id);
    if (!it) return false;
    if (it.type === 'spellbook' && purchasedSpellbooks.has(e.id)) return false;
    return true;
  });
  const consumables = eligible.filter(e => {
    const it = ITEMS.find(i => i.id === e.id);
    return it && it.type === 'consumable';
  });
  const consumablePicks = _pickRandom(consumables, Math.min(2, consumables.length, SHOP_STOCK_SIZE));
  const rest      = eligible.filter(e => !consumablePicks.includes(e));
  const restPicks = _pickRandom(rest, SHOP_STOCK_SIZE - consumablePicks.length);
  return consumablePicks.concat(restPicks).map(e => {
    const it    = ITEMS.find(i => i.id === e.id);
    const price = (typeof e.price === 'number') ? e.price : it.price;
    return { item: { ...it }, price, sold: false };
  });
}

// Tirage paresseux : ne (re)tire que si le stock n'existe pas encore.
function _ensureShopStock() {
  if (!Array.isArray(shopStock)) shopStock = _rollShopStock();
}

// Invalide le stock courant (perd aussi les objets revendus) et remet
// le compteur de pas à zéro. Le prochain affichage retire un stock neuf.
function _invalidateShopStock() {
  shopStock = null;
  shopStepsSinceRestock = 0;
}

// Appelé à chaque pas (movement.js — _step) : déclenche le réassort
// automatique au bout de SHOP_RESTOCK_STEPS pas.
function _tickShopRestock() {
  shopStepsSinceRestock++;
  if (shopStepsSinceRestock >= SHOP_RESTOCK_STEPS) _invalidateShopStock();
}

// ── Sinks endgame — prix progressif & multiplicateur vendeur ──────
// Items marqués `rarityScales: true` (data.js) : chaque achat majore le
// prix du prochain par ×1.5 via `endgamePurchases[id]`. Les vendeurs
// itinérants peuvent porter `priceMultiplier` (ex. marchand_ombre = 1.4)
// — appliqué au-dessus de l'éventuelle progression de rareté.
// Voir .claude/plans/game-economy-gold-audit.md §5.6.
function _endgameItemPrice(item, basePrice, npc) {
  if (!item) return basePrice || 0;
  let p = basePrice;
  if (item.rarityScales) {
    const n = (typeof endgamePurchases !== 'undefined' && endgamePurchases[item.id]) || 0;
    const base = (typeof item.basePrice === 'number') ? item.basePrice : basePrice;
    p = Math.round(base * Math.pow(1.5, n));
  }
  if (npc && typeof npc.priceMultiplier === 'number' && npc.priceMultiplier > 0) {
    p = Math.round(p * npc.priceMultiplier);
  }
  return p;
}

// Calcule le prix de rachat pour un item donné selon une politique buyback.
// Le multiplicateur final = max(default, byType, byRarity, bySlot) — la
// spécialisation la plus avantageuse l'emporte. Plancher à 1G.
function _computeSellPrice(item, buyback) {
  if (!item || typeof item.price !== 'number' || item.price <= 0) return 0;
  buyback = buyback || STATIC_SHOP_BUYBACK;
  let mult = (typeof buyback.default === 'number') ? buyback.default : 0.50;
  if (buyback.byType && item.type && typeof buyback.byType[item.type] === 'number') {
    mult = Math.max(mult, buyback.byType[item.type]);
  }
  if (buyback.byRarity && item.rarity && typeof buyback.byRarity[item.rarity] === 'number') {
    mult = Math.max(mult, buyback.byRarity[item.rarity]);
  }
  if (buyback.bySlot && item.slot && typeof buyback.bySlot[item.slot] === 'number') {
    mult = Math.max(mult, buyback.bySlot[item.slot]);
  }
  let value = item.price * mult;
  // P1 — la qualité de brassage (brewPotency) influe sur la revente : une fiole
  // concentrée vaut plus, une diluée moins. Sans flag, valeur de base.
  if (typeof item.brewPotency === 'number') value *= (1 + item.brewPotency);
  return Math.max(1, Math.floor(value));
}

// Ouvre la boutique fixe (cellule SHOP). Réinitialise toujours sur l'onglet "Acheter".
function openShop() {
  _shopContext = { kind: 'static', npcId: null };
  _shopMode    = 'buy';
  _ensureShopStock();
  _renderShopHeader();
  _renderShopGrid();
  document.getElementById('shop-modal').style.display = 'flex';
}

// Ouvre la boutique d'un vendeur ambulant (PNJ avec champ wares).
function openVendorShop(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc || !Array.isArray(npc.wares) || !npc.wares.length) return;
  _shopContext = { kind: 'vendor', npcId };
  _shopMode    = 'buy';
  _renderShopHeader();
  _renderShopGrid();
  document.getElementById('shop-modal').style.display = 'flex';
}

// Bascule entre les onglets Acheter / Vendre. Appelé depuis les boutons
// d'onglets rendus par _renderShopHeader.
function setShopMode(mode) {
  if (mode !== 'buy' && mode !== 'sell') return;
  _shopMode = mode;
  _renderShopHeader();
  _renderShopGrid();
}

// ── Rendu ─────────────────────────────────────────────────────

function _renderShopHeader() {
  const titleEl = document.getElementById('shop-title');
  const goldEl  = document.getElementById('shop-gold');
  const tabsEl  = document.getElementById('shop-tabs');

  let titleText;
  const shopIcon = '<img class="ui-icon ui-icon-xl" src="img/icons/shop_sign.png" alt="">';
  if (_shopContext.kind === 'static') {
    titleText = `${shopIcon} Madame Malkins des Cachots`;
  } else {
    const npc = getNpcById(_shopContext.npcId);
    titleText = npc ? `${shopIcon} ${npc.name}` : `${shopIcon} Vendeur`;
  }
  if (titleEl) titleEl.innerHTML = titleText;
  if (goldEl)  goldEl.textContent  = (player && player.gold) || 0;

  if (tabsEl) {
    const bAct = _shopMode === 'buy'  ? ' active' : '';
    const sAct = _shopMode === 'sell' ? ' active' : '';
    tabsEl.innerHTML =
      `<button class="shop-tab${bAct}" onclick="setShopMode('buy')">Acheter</button>` +
      `<button class="shop-tab${sAct}" onclick="setShopMode('sell')">Vendre</button>`;
  }
}

function _renderShopGrid() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto';

  if (_shopMode === 'buy') _renderBuyGrid(grid);
  else                      _renderSellGrid(grid);
}

function _renderBuyGrid(grid) {
  // Lignes à afficher : { item, price, stockEntry } — stockEntry non null
  // uniquement pour la boutique fixe (pilote l'achat unique).
  let rows = [];
  const ctxNpc = (_shopContext.kind === 'vendor')
    ? getNpcById(_shopContext.npcId) : null;
  if (_shopContext.kind === 'static') {
    _ensureShopStock();
    rows = shopStock.map(s => ({
      item:  s.item,
      price: _endgameItemPrice(s.item, s.price, null),
      stockEntry: s
    }));
  } else {
    const wares = (ctxNpc && ctxNpc.wares) || [];
    for (const entry of wares) {
      const item = ITEMS.find(i => i.id === entry.id);
      if (!item) continue;
      // Livre de sort déjà acheté → retiré globalement (vendeurs inclus).
      if (item.type === 'spellbook' && purchasedSpellbooks.has(item.id)) continue;
      const basePrice = (typeof entry.price === 'number') ? entry.price : item.price;
      const price = _endgameItemPrice(item, basePrice, ctxNpc);
      rows.push({ item, price, stockEntry: null });
    }
  }

  let added = 0;
  for (const { item, price, stockEntry } of rows) {
    const canAfford = (player.gold || 0) >= price;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.dataset.itemId = item.id;
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #5a4020;border-radius:6px;background:rgba(30,20,10,0.55);cursor:' + (canAfford ? 'pointer' : 'default') + ';opacity:' + (canAfford ? '1' : '0.5');
    const soldTag = (stockEntry && stockEntry.sold)
      ? ' <span style="color:#a8d878;font-size:0.85em">♻️ revendu</span>' : '';
    // Indicateur rareté pour les items à prix progressif (sinks endgame).
    const rareTag = (item.rarityScales)
      ? ` <span style="color:#c9a84c;font-size:0.78em" title="Stock rare — chaque achat épuise davantage le marché.">⚜ rare</span>` : '';
    div.innerHTML = `<div class="shop-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}${soldTag}${rareTag}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">${price}G</div>`;
    if (canAfford) div.onclick = () => _purchase(item, price, stockEntry);
    grid.appendChild(div);
    added++;
  }
  if (added === 0) {
    grid.innerHTML = `<div style="padding:20px;text-align:center;color:#8a7050;font-style:italic">
      Plus rien à acheter pour le moment…
    </div>`;
  }
}

function _renderSellGrid(grid) {
  // Politique de rachat selon le contexte (vendeur ou shop fixe)
  let buyback;
  if (_shopContext.kind === 'vendor') {
    const npc = getNpcById(_shopContext.npcId);
    buyback = (npc && npc.buyback) || STATIC_SHOP_BUYBACK;
  } else {
    buyback = STATIC_SHOP_BUYBACK;
  }

  if (!player.inventory || player.inventory.length === 0) {
    grid.innerHTML = `<div style="padding:20px;text-align:center;color:#8a7050;font-style:italic">
      Votre sac est vide.
    </div>`;
    return;
  }

  let shown = 0;
  player.inventory.forEach((item, idx) => {
    if (typeof item.price !== 'number' || item.price <= 0) return;
    const sellPrice = _computeSellPrice(item, buyback);
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.dataset.itemId = item.id;
    div.dataset.invIdx = idx;
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #5a4020;border-radius:6px;background:rgba(30,20,10,0.55);cursor:pointer';
    const qty = (typeof _itemQty === 'function') ? _itemQty(item) : (item.qty || 1);
    const qtySuffix = qty > 1 ? ` <span style="color:var(--gold)">×${qty}</span>` : '';
    div.innerHTML = `<div class="shop-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}${qtySuffix}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price" style="color:#a8d878">+${sellPrice}G</div>`;
    div.onclick = () => sellItem(idx, sellPrice);
    grid.appendChild(div);
    shown++;
  });
  if (shown === 0) {
    grid.innerHTML = `<div style="padding:20px;text-align:center;color:#8a7050;font-style:italic">
      Aucun objet vendable dans votre sac.
    </div>`;
  }
}

// ── Achat / vente ─────────────────────────────────────────────

function _purchase(item, price, stockEntry) {
  if (!Number.isFinite(player.gold) || player.gold < price) return;
  // Les herbes vivent dans la besace d'herboriste (player.herbs, non
  // plafonnée), pas dans le sac 16 slots : le garde « sac plein » ne les
  // concerne pas, et l'achat les route vers addHerb (sinon le brassage,
  // qui lit player.herbs, ne les verrait jamais).
  const isHerb = item.type === 'herb';
  // _canAddItem autorise l'achat d'un consommable déjà possédé même sac
  // « plein » (fusion dans le stack existant, aucune case neuve requise).
  if (!isHerb && !_canAddItem(item)) { addMsg("Sac plein !", 'bad'); return; }
  player.gold -= price;
  if (isHerb && typeof addHerb === 'function') {
    addHerb(item.id, 1);
  } else {
    _addItemToBag({ ...item });
  }
  // Livre de sort : achetable une seule fois pour toute la partie.
  if (item.type === 'spellbook') purchasedSpellbooks.add(item.id);
  // Sinks endgame — items à prix progressif : on incrémente le compteur
  // d'achats (qui pilote la formule basePrice × 1.5^n) AVANT le splice,
  // pour que la prochaine ouverture de la boutique reflète le nouveau
  // prix. Les items rarityScales **ne quittent pas** le stock — leur
  // disponibilité est régulée par le prix qui grimpe.
  if (item.rarityScales && typeof endgamePurchases !== 'undefined') {
    endgamePurchases[item.id] = (endgamePurchases[item.id] || 0) + 1;
    const n = endgamePurchases[item.id];
    if (n === 3) {
      addMsg(`Le marchand hausse un sourcil. « Encore un… ces flacons se font rares. »`, '');
    }
  }
  // Boutique fixe : l'objet quitte le stock (achat unique jusqu'au réassort)
  // — sauf pour les items rarityScales (ré-achetables au prix progressif)
  // et les herbes (besace illimitée → ré-achat libre, source fiable).
  if (stockEntry && Array.isArray(shopStock) && !item.rarityScales && !isHerb) {
    const i = shopStock.indexOf(stockEntry);
    if (i !== -1) shopStock.splice(i, 1);
  }
  document.getElementById('shop-gold').textContent = player.gold;
  addMsg(`Acheté : ${item.name}`, 'good');
  updateUI();
  _renderShopGrid();
}

function sellItem(idx, sellPrice) {
  const item = player.inventory[idx];
  if (!item) return;
  // Vente à l'unité : un consommable empilé ne cède qu'un exemplaire par clic
  // (décrément du stack), pour ne payer que ce qui est effectivement vendu.
  const snapshot = { ...item };
  delete snapshot.qty;
  if (typeof _consumeAt === 'function') _consumeAt(idx, 1);
  else player.inventory.splice(idx, 1);
  player.gold += sellPrice;
  // Boutique fixe : l'objet revendu rejoint le stock, rachetable au prix
  // plein — mais sera perdu au prochain réassort.
  if (_shopContext.kind === 'static' && typeof item.price === 'number' && item.price > 0) {
    _ensureShopStock();
    shopStock.push({ item: snapshot, price: item.price, sold: true });
  }
  document.getElementById('shop-gold').textContent = player.gold;
  addMsg(`Vendu : ${item.name} (+${sellPrice}G)`, 'good');
  updateUI();
  _renderShopGrid();
}

// ── Façades legacy (compatibilité smoke + appels existants) ───

function buyItem(item) { _purchase(item, item.price); }

function buyVendorItem(item, price /*, npcId */) { _purchase(item, price); }
