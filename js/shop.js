// ============================================================
// BOUTIQUE
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
  { id: "wand2",               minFloor: 6 },
  { id: "livre_patronum",      minFloor: 6 },
  { id: "cape_invis",          minFloor: 7 },
  { id: "bottes_dragon",       minFloor: 7 },
  { id: "retourneur_temps",    minFloor: 7 },
];

function openShop() {
  // === FIX SHOP BLANK === logs et garde-fous
  console.log('[Shop] openShop() — currentFloor =', currentFloor,
              '| gold =', player && player.gold,
              '| ITEMS =', (typeof ITEMS !== 'undefined' ? ITEMS.length : 'undef'),
              '| CATALOG =', SHOP_CATALOG.length);

  const titleEl = document.getElementById('shop-title');
  const goldEl  = document.getElementById('shop-gold');
  const grid    = document.getElementById('shop-grid');
  const modal   = document.getElementById('shop-modal');
  if (!grid || !modal) { console.warn('[Shop] DOM manquant : shop-grid ou shop-modal'); return; }

  if (titleEl) titleEl.textContent = '🏪 Madame Malkins des Cachots';
  if (goldEl)  goldEl.textContent  = (player && player.gold) || 0;
  grid.innerHTML = '';
  // === FIX SHOP === force layout visible même si le CSS parent casse la grille
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto';

  // === FIX SHOP BLANK === currentFloor peut être undefined/NaN — on force >= 1
  const floor = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  let available = SHOP_CATALOG.filter(e => e.minFloor <= floor);

  // Garde-fou : si catalogue filtré vide, afficher au moins les consommables de base
  if (available.length === 0) {
    console.warn('[Shop] Catalogue filtré vide — fallback sur items de base');
    available = SHOP_CATALOG.filter(e => e.minFloor <= 1);
  }

  let added = 0;
  for (const entry of available) {
    const item = ITEMS.find(i => i.id === entry.id);
    if (!item) { console.warn('[Shop] Item introuvable dans ITEMS :', entry.id); continue; }
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.dataset.itemId = item.id;
    const canAfford = (player.gold || 0) >= item.price;
    // === FIX SHOP === ceinture+bretelles : layout inline garanti
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #5a4020;border-radius:6px;background:rgba(30,20,10,0.55);cursor:' + (canAfford ? 'pointer' : 'default') + ';opacity:' + (canAfford ? '1' : '0.5');
    div.innerHTML = `<div class="shop-icon">${getItemIconHtml(item, 'ui-icon-xl')}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">${item.price}G</div>`;
    if (canAfford) div.onclick = () => buyItem(item);
    grid.appendChild(div);
    added++;
  }
  console.log('[Shop] Items affichés :', added);

  // Message visible si vraiment rien
  if (added === 0) {
    grid.innerHTML = `<div style="padding:20px;text-align:center;color:#8a7050;font-style:italic">
      La boutique est vide pour le moment…
    </div>`;
  }

  modal.style.display = 'flex';
}

function buyItem(item) {
  if(player.gold<item.price) return;
  if(player.inventory.length>=16) { addMsg("Sac plein !", 'bad'); return; }
  player.gold-=item.price;
  player.inventory.push({...item});
  document.getElementById('shop-gold').textContent=player.gold;
  addMsg(`Acheté : ${item.name}`, 'good');
  updateUI();
  openShop(); // rafraîchir l'affichage
}

// ── Boutique de vendeur ambulant ──────────────────────────────
// Réutilise #shop-modal mais peuple la grille avec npc.wares au lieu
// de SHOP_CATALOG. Le `price` du wares prend la priorité sur ITEMS[id].price
// si défini (sinon prix de base).
function openVendorShop(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc || !Array.isArray(npc.wares) || !npc.wares.length) return;

  const titleEl = document.getElementById('shop-title');
  const goldEl  = document.getElementById('shop-gold');
  const grid    = document.getElementById('shop-grid');
  const modal   = document.getElementById('shop-modal');
  if (!grid || !modal) return;

  if (titleEl) titleEl.textContent = `${npc.icon || '🛒'} ${npc.name}`;
  if (goldEl)  goldEl.textContent  = (player && player.gold) || 0;
  grid.innerHTML = '';
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto';

  let added = 0;
  for (const entry of npc.wares) {
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
    if (canAfford) div.onclick = () => buyVendorItem(item, price, npcId);
    grid.appendChild(div);
    added++;
  }
  if (added === 0) {
    grid.innerHTML = `<div style="padding:20px;text-align:center;color:#8a7050;font-style:italic">
      Le vendeur n'a plus rien à proposer…
    </div>`;
  }
  modal.style.display = 'flex';
}

function buyVendorItem(item, price, npcId) {
  if (player.gold < price) return;
  if (player.inventory.length >= 16) { addMsg("Sac plein !", 'bad'); return; }
  player.gold -= price;
  player.inventory.push({...item});
  document.getElementById('shop-gold').textContent = player.gold;
  addMsg(`Acheté : ${item.name}`, 'good');
  updateUI();
  openVendorShop(npcId); // rafraîchir
}
