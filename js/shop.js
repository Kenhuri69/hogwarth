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
  document.getElementById('shop-title').textContent='🏪 Madame Malkins des Cachots';
  document.getElementById('shop-gold').textContent=player.gold;
  const grid=document.getElementById('shop-grid');
  grid.innerHTML='';
  const available = SHOP_CATALOG.filter(e => e.minFloor <= currentFloor);
  for(const entry of available) {
    const item=ITEMS.find(i=>i.id===entry.id);
    if(!item) continue;
    const div=document.createElement('div');
    div.className='shop-item';
    const canAfford=player.gold>=item.price;
    div.style.opacity=canAfford?'1':'0.5';
    div.innerHTML=`<div class="shop-icon">${item.icon}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">${item.price}G</div>`;
    if(canAfford) div.onclick=()=>buyItem(item);
    grid.appendChild(div);
  }
  document.getElementById('shop-modal').style.display='flex';
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
