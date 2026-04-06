// ============================================================
// BOUTIQUE
// ============================================================

function openShop() {
  document.getElementById('shop-title').textContent='🏪 Madame Malkins des Cachots';
  document.getElementById('shop-gold').textContent=player.gold;
  const grid=document.getElementById('shop-grid');
  grid.innerHTML='';
  for(const id of SHOP_ITEMS) {
    const item=ITEMS.find(i=>i.id===id);
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
