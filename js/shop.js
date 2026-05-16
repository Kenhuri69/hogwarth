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
  // Consommables endgame (post-victoire) — voir ENDGAME_PLAN.md §7.10
  { id: "potion_xl",           minFloor: 15 },
  { id: "potion_xl_sp",        minFloor: 15 },
];

// Politique de rachat par défaut (boutique fixe Madame Malkins). Les
// vendeurs ambulants peuvent override via npc.buyback.
const STATIC_SHOP_BUYBACK = { default: 0.50 };

// État courant du shop ouvert (kind 'static' | 'vendor', mode 'buy' | 'sell')
let _shopContext = { kind: 'static', npcId: null };
let _shopMode    = 'buy';

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
  return Math.max(1, Math.floor(item.price * mult));
}

// Ouvre la boutique fixe (cellule SHOP). Réinitialise toujours sur l'onglet "Acheter".
function openShop() {
  _shopContext = { kind: 'static', npcId: null };
  _shopMode    = 'buy';
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
  if (_shopContext.kind === 'static') {
    titleText = '🏪 Madame Malkins des Cachots';
  } else {
    const npc = getNpcById(_shopContext.npcId);
    titleText = npc ? `${npc.icon || '🛒'} ${npc.name}` : '🛒 Vendeur';
  }
  if (titleEl) titleEl.textContent = titleText;
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
  let entries;
  if (_shopContext.kind === 'static') {
    const floor = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
    entries = SHOP_CATALOG.filter(e => e.minFloor <= floor);
    if (entries.length === 0) entries = SHOP_CATALOG.filter(e => e.minFloor <= 1);
  } else {
    const npc = getNpcById(_shopContext.npcId);
    entries = (npc && npc.wares) || [];
  }

  let added = 0;
  for (const entry of entries) {
    const item = ITEMS.find(i => i.id === entry.id);
    if (!item) continue;
    const price = (typeof entry.price === 'number') ? entry.price : item.price;
    const canAfford = (player.gold || 0) >= price;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.dataset.itemId = item.id;
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #5a4020;border-radius:6px;background:rgba(30,20,10,0.55);cursor:' + (canAfford ? 'pointer' : 'default') + ';opacity:' + (canAfford ? '1' : '0.5');
    div.innerHTML = `<div class="shop-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">${price}G</div>`;
    if (canAfford) div.onclick = () => _purchase(item, price);
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
    div.innerHTML = `<div class="shop-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
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

function _purchase(item, price) {
  if (!Number.isFinite(player.gold) || player.gold < price) return;
  if (player.inventory.length >= 16) { addMsg("Sac plein !", 'bad'); return; }
  player.gold -= price;
  player.inventory.push({ ...item });
  document.getElementById('shop-gold').textContent = player.gold;
  addMsg(`Acheté : ${item.name}`, 'good');
  updateUI();
  _renderShopGrid();
}

function sellItem(idx, sellPrice) {
  const item = player.inventory[idx];
  if (!item) return;
  player.inventory.splice(idx, 1);
  player.gold += sellPrice;
  document.getElementById('shop-gold').textContent = player.gold;
  addMsg(`Vendu : ${item.name} (+${sellPrice}G)`, 'good');
  updateUI();
  _renderShopGrid();
}

// ── Façades legacy (compatibilité smoke + appels existants) ───

function buyItem(item) { _purchase(item, item.price); }

function buyVendorItem(item, price /*, npcId */) { _purchase(item, price); }
