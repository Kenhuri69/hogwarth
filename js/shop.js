// ============================================================
// BOUTIQUE
// ============================================================

// Catalogue progressif : chaque article débloque à un étage minimum
const SHOP_CATALOG = [
  { id: "potion_s",         minFloor: 1 },
  { id: "mandragore",       minFloor: 1 },
  { id: "wand1",            minFloor: 1 },
  { id: "potion_m",         minFloor: 2 },
  { id: "robe1",            minFloor: 2 },
  { id: "livre_sortileges", minFloor: 2 },
  { id: "felix",            minFloor: 3 },
  { id: "amulette",         minFloor: 3 },
  { id: "broom",            minFloor: 4 },
  { id: "livre_soin",       minFloor: 4 },
  { id: "wand2",            minFloor: 6 },
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
    const canAfford = (player.gold || 0) >= item.price;
    div.style.opacity = canAfford ? '1' : '0.5';
    div.innerHTML = `<div class="shop-icon">${item.icon}</div>
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
