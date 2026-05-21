// ============================================================
// RENDU — Minimap (desktop et mobile)
// ============================================================

function renderMinimap() {
  _buildMinimapCells(document.getElementById('minimap'), 14);
  // Mini-carte du coin (mobile) — masquée en CSS sur desktop.
  // 'auto' : cellules dimensionnées par la grille CSS (adaptatif).
  const corner = document.getElementById('minimap-corner');
  if (corner) {
    _buildMinimapCells(corner, 'auto');
    _sizeCornerMinimap(corner);
    _ensureCornerObserver();
  }
  // Si l'overlay mobile est ouvert, le mettre à jour aussi
  const overlay = document.getElementById('map-overlay');
  if (overlay && overlay.style.display === 'flex') {
    _buildMinimapCells(document.getElementById('minimap-mobile'), 20);
  }
}

// Recalcule la taille de la mini-carte dès que la vue 3D change de
// dimensions (rotation, settling du layout mobile, barre d'URL…).
// Le layout mobile se stabilise après le rendu initial : un simple
// appel ponctuel produirait une taille périmée.
let _cornerObserver = null;
function _ensureCornerObserver() {
  if (_cornerObserver || typeof ResizeObserver === 'undefined') return;
  const vp = (typeof canvas !== 'undefined') && canvas && canvas.parentElement;
  if (!vp) return;
  _cornerObserver = new ResizeObserver(() => {
    const c = document.getElementById('minimap-corner');
    if (c) _sizeCornerMinimap(c);
  });
  _cornerObserver.observe(vp);
}

// Dimensionne la mini-carte du coin pour qu'elle tienne dans la marge
// libre autour du cadre 3D — à droite ou au-dessus — sans le recouvrir.
// La géométrie du cadre reproduit drawDungeon()/getRect() (renderer.js).
function _sizeCornerMinimap(corner) {
  const vp = (typeof canvas !== 'undefined') && canvas && canvas.parentElement;
  if (!vp) return;
  const W = vp.clientWidth, H = vp.clientHeight;
  if (!W || !H) return;
  const scale      = Math.min(W, H) * 0.42;   // cf. drawDungeon()
  const frameRight = W / 2 + scale;            // bord droit du cadre 3D
  const frameTop   = H / 2 - scale * 0.62;     // bord haut du cadre 3D
  const inset = 8;                             // cf. top/right:8px en CSS
  // Plus grand carré libre dans le coin haut-droit : soit à droite du
  // cadre, soit au-dessus. On retient la plus grande des deux marges.
  const free = Math.max(W - frameRight, frameTop) - inset;
  const size = Math.max(58, Math.min(free, 168));
  corner.style.width = Math.round(size) + 'px';
}

function _buildMinimapCells(mm, cellSize) {
  if (!mm || !dungeon) return;
  // cellSize === 'auto' → cellules fluides (grille 1fr + aspect-ratio CSS).
  // Sinon → taille fixe en pixels (minimap desktop / overlay mobile).
  const adaptive = (cellSize === 'auto');
  mm.style.gridTemplateColumns = adaptive
    ? `repeat(${MAP_W}, 1fr)`
    : `repeat(${MAP_W}, ${cellSize}px)`;
  mm.innerHTML = '';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const div = document.createElement('div');
      div.className = 'map-cell';
      if (!adaptive) {
        div.style.width  = cellSize + 'px';
        div.style.height = cellSize + 'px';
      }
      if (x === playerX && y === playerY) {
        div.classList.add('map-player');
        // Flèche d'orientation : matérialise la direction de la vue 3D centrale.
        const arrow = document.createElement('div');
        arrow.className = 'map-player-arrow map-player-dir-' + (playerDir || 'n');
        div.appendChild(arrow);
      } else if (!visited[y][x]) {
        div.classList.add('map-wall');
      } else {
        const c = dungeon[y][x];
        if (c === CELL.WALL)                                  div.classList.add('map-wall');
        else if (c === CELL.STAIRS_D || c === CELL.STAIRS_U) div.classList.add('map-stairs');
        else if (c === CELL.SHOP)                             div.classList.add('map-shop');
        else if (c === CELL.FOUNTAIN)                         div.classList.add('map-fountain');
        else if (c === CELL.FORGE)                            div.classList.add('map-forge');
        else if (c === CELL.LIBRARY)                          div.classList.add('map-library');
        else if (c === CELL.ALTAR)                            div.classList.add('map-altar');
        else if (c === CELL.NPC) {
          // PNJ : teinte spéciale + marqueur "!" / "?" si la quête liée
          // est offrable ou prête à rendre. La case est révélée d'office
          // (cf. _placeNpcInRoom dans dungeon.js qui force visited=true).
          div.classList.add('map-special', 'map-npc');
          const npcId = (typeof npcPlacements !== 'undefined')
            ? npcPlacements.get(`${x},${y}`) : null;
          const sign  = (typeof getNpcMarkerSign === 'function')
            ? getNpcMarkerSign(npcId) : '';
          if (sign === '!') {
            // Quête farming offerable → marqueur rouge clignotant distinct.
            const isFarming = (typeof _npcHasFarmingOffer === 'function')
              ? _npcHasFarmingOffer(npcId) : false;
            div.classList.add(isFarming ? 'map-npc-farming' : 'map-npc-offer');
            div.dataset.sign = '!';
          } else if (sign === '?') {
            div.classList.add('map-npc-ready');
            div.dataset.sign = '?';
          }
        }
        else if (enemyMap[y][x])                              div.classList.add('map-enemy');
        else                                                  div.classList.add('map-floor');
      }
      // Page de grimoire révélée non collectée → pastille verte. Ne
      // recouvre pas le marqueur joueur (la page peut être sous lui).
      if (typeof pagePlacements !== 'undefined'
          && pagePlacements.get(currentFloor) === `${x},${y}`
          && revealedPages.has(currentFloor)
          && !(x === playerX && y === playerY)) {
        const page = (typeof getGrimoirePageForFloor === 'function')
          ? getGrimoirePageForFloor(currentFloor) : null;
        const collected = page && Array.isArray(player.grimoirePages)
          && player.grimoirePages.includes(page.id);
        if (!collected) div.classList.add('map-page');
      }
      mm.appendChild(div);
    }
  }
}
