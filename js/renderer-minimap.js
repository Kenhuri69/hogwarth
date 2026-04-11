// ============================================================
// RENDU — Minimap (desktop et mobile)
// ============================================================

function renderMinimap() {
  _buildMinimapCells(document.getElementById('minimap'), 14);
  // Si l'overlay mobile est ouvert, le mettre à jour aussi
  const overlay = document.getElementById('map-overlay');
  if (overlay && overlay.style.display === 'flex') {
    _buildMinimapCells(document.getElementById('minimap-mobile'), 20);
  }
}

function _buildMinimapCells(mm, cellSize) {
  if (!mm || !dungeon) return;
  mm.style.gridTemplateColumns = `repeat(${MAP_W}, ${cellSize}px)`;
  mm.innerHTML = '';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const div = document.createElement('div');
      div.className = 'map-cell';
      div.style.width  = cellSize + 'px';
      div.style.height = cellSize + 'px';
      if (x === playerX && y === playerY) {
        div.classList.add('map-player');
      } else if (!visited[y][x]) {
        div.classList.add('map-wall');
      } else {
        const c = dungeon[y][x];
        if (c === CELL.WALL)                                  div.classList.add('map-wall');
        else if (c === CELL.STAIRS_D || c === CELL.STAIRS_U) div.classList.add('map-stairs');
        else if (c === CELL.SHOP)                             div.classList.add('map-shop');
        else if (enemyMap[y][x])                              div.classList.add('map-enemy');
        else                                                  div.classList.add('map-floor');
      }
      mm.appendChild(div);
    }
  }
}
