// ============================================================
// RENDU CANVAS 3D + MINIMAP
// ============================================================

const canvas = document.getElementById('dungeon-canvas');
const ctx = canvas.getContext('2d');

// Facteur de rétrécissement par niveau de profondeur
const SHRINK = 0.58;
// Nombre de niveaux de profondeur affichés
const DEPTH  = 5;

function resizeCanvas() {
  const viewport = canvas.parentElement;
  canvas.width  = viewport.clientWidth;
  canvas.height = viewport.clientHeight;
}

// Calcule le rectangle de vue à une profondeur donnée
function getRect(cx, cy, scale, d) {
  const r  = Math.pow(SHRINK, d);
  const hw = scale * r;
  const hh = scale * r * 0.62;
  return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh, r, hw, hh };
}

// ── Palettes de couleurs (index 0 = plus proche) ─────────────
// Murs frontaux : pierre chaude bien visible
const WALL_C  = ['#8a6840', '#6a5030', '#4a3820', '#2e2212', '#181008'];
// Murs latéraux : légèrement plus sombres
const SIDE_C  = ['#705434', '#543e26', '#382a18', '#201a0c', '#100c06'];
// Sol : brun foncé avec lisibilité
const FLOOR_C = ['#4a3418', '#362510', '#24180a', '#160e06', '#0c0904'];
// Plafond : plus sombre que le sol
const CEIL_C  = ['#1e1810', '#161008', '#100c06', '#0a0804', '#060402'];
// Opacité des arêtes dorées par profondeur
const EDGE_A  = [0.92, 0.60, 0.32, 0.14, 0.06];

// ─────────────────────────────────────────────────────────────

function drawDungeon() {
  if (!dungeon) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx    = W / 2;
  const cy    = H / 2;
  const scale = Math.min(W, H) * 0.42;

  drawCorridor(cx, cy, scale, W, H);
}

function getCellAhead(dx, dy, dist) {
  const dirs = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };
  const [fx, fy] = dirs[playerDir];
  const rx = fy, ry = -fx;
  const nx = playerX + fx * dist + rx * dx;
  const ny = playerY + fy * dist + ry * dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return CELL.WALL;
  return dungeon[ny][nx];
}

function hasWall(dx, dy, dist) {
  return getCellAhead(dx, dy, dist) === CELL.WALL;
}

// ─────────────────────────────────────────────────────────────
// DESSIN DU COULOIR EN PERSPECTIVE
// ─────────────────────────────────────────────────────────────
function drawCorridor(cx, cy, scale, W, H) {
  // 1. Fond uni noir
  ctx.fillStyle = '#060402';
  ctx.fillRect(0, 0, W, H);

  // 2. Sol et plafond de fond (gradient, tout l'écran)
  const floorBg = ctx.createLinearGradient(0, cy, 0, H);
  floorBg.addColorStop(0,   '#4a3418');
  floorBg.addColorStop(1,   '#1a1008');
  ctx.fillStyle = floorBg;
  ctx.fillRect(0, cy, W, H - cy);

  const ceilBg = ctx.createLinearGradient(0, cy, 0, 0);
  ceilBg.addColorStop(0,   '#1e1810');
  ceilBg.addColorStop(1,   '#06040a');
  ctx.fillStyle = ceilBg;
  ctx.fillRect(0, 0, W, cy);

  // Ligne de séparation sol/plafond au centre (horizon)
  ctx.strokeStyle = 'rgba(201,168,76,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

  // 3. Lignes de perspective sur le sol (fuite vers le centre)
  drawFloorLines(cx, cy, scale, W, H);

  // 4. Couches de profondeur du plus loin au plus proche
  for (let d = DEPTH; d >= 1; d--) {
    const di   = Math.min(d - 1, WALL_C.length - 1);
    const near = getRect(cx, cy, scale, d - 1);
    const far  = getRect(cx, cy, scale, d);
    const edgeA = EDGE_A[di];

    const fwdCell = getCellAhead(0, 0, d);
    const isWall  = fwdCell === CELL.WALL;

    // ── Mur du fond ───────────────────────────────────────────
    if (isWall || d === DEPTH) {
      // Face du mur
      ctx.fillStyle = WALL_C[di];
      ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);

      // Texture de pierres (si assez grand)
      if (far.x1 - far.x0 > 20) {
        drawStoneBlocks(far.x0, far.y0, far.x1, far.y1, edgeA);
      }

      // Arête dorée
      ctx.strokeStyle = `rgba(201,168,76,${edgeA})`;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);

      // Torches sur le mur du fond
      if (d <= 4) {
        const tw = far.x1 - far.x0;
        const th = far.y1 - far.y0;
        drawTorch(far.x0 + tw * 0.25, far.y0 + th * 0.30, 8 * far.r, edgeA);
        drawTorch(far.x0 + tw * 0.75, far.y0 + th * 0.30, 8 * far.r, edgeA);
      }

      // Marqueur de cellule spéciale (escalier, boutique, coffre...)
      if (!isWall) {
        drawCellMarker(cx, cy,
          (far.x0 + far.x1) / 2,
          (far.y0 + far.y1) / 2,
          far.hw * 0.45, fwdCell);
      }

      if (isWall) break;
    }

    // ── Sol (trapèze) ─────────────────────────────────────────
    ctx.fillStyle = FLOOR_C[di];
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y1);
    ctx.lineTo(near.x1, near.y1);
    ctx.lineTo(far.x1,  far.y1);
    ctx.lineTo(far.x0,  far.y1);
    ctx.closePath();
    ctx.fill();

    // Arête basse (ligne de profondeur)
    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.35})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(far.x0, far.y1); ctx.lineTo(far.x1, far.y1);
    ctx.stroke();

    // ── Plafond (trapèze) ─────────────────────────────────────
    ctx.fillStyle = CEIL_C[di];
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y0);
    ctx.lineTo(near.x1, near.y0);
    ctx.lineTo(far.x1,  far.y0);
    ctx.lineTo(far.x0,  far.y0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.2})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(far.x0, far.y0); ctx.lineTo(far.x1, far.y0);
    ctx.stroke();

    // ── Mur gauche ────────────────────────────────────────────
    if (hasWall(-1, 0, d)) {
      ctx.fillStyle = SIDE_C[di];
      ctx.beginPath();
      ctx.moveTo(near.x0, near.y0);
      ctx.lineTo(far.x0,  far.y0);
      ctx.lineTo(far.x0,  far.y1);
      ctx.lineTo(near.x0, near.y1);
      ctx.closePath();
      ctx.fill();

      drawSideLines(near.x0, near.y0, near.y1, far.x0, far.y0, far.y1, edgeA);

      ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.75})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(near.x0, near.y0); ctx.lineTo(far.x0, far.y0);
      ctx.moveTo(near.x0, near.y1); ctx.lineTo(far.x0, far.y1);
      ctx.stroke();
    } else {
      // Ouverture à gauche : ombre pour indiquer le couloir
      const grad = ctx.createLinearGradient(near.x0, 0, far.x0, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(near.x0, near.y0);
      ctx.lineTo(far.x0,  far.y0);
      ctx.lineTo(far.x0,  far.y1);
      ctx.lineTo(near.x0, near.y1);
      ctx.closePath();
      ctx.fill();
    }

    // ── Mur droit ─────────────────────────────────────────────
    if (hasWall(1, 0, d)) {
      ctx.fillStyle = SIDE_C[di];
      ctx.beginPath();
      ctx.moveTo(near.x1, near.y0);
      ctx.lineTo(far.x1,  far.y0);
      ctx.lineTo(far.x1,  far.y1);
      ctx.lineTo(near.x1, near.y1);
      ctx.closePath();
      ctx.fill();

      drawSideLines(near.x1, near.y0, near.y1, far.x1, far.y0, far.y1, edgeA);

      ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.75})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(near.x1, near.y0); ctx.lineTo(far.x1, far.y0);
      ctx.moveTo(near.x1, near.y1); ctx.lineTo(far.x1, far.y1);
      ctx.stroke();
    } else {
      const grad = ctx.createLinearGradient(near.x1, 0, far.x1, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(near.x1, near.y0);
      ctx.lineTo(far.x1,  far.y0);
      ctx.lineTo(far.x1,  far.y1);
      ctx.lineTo(near.x1, near.y1);
      ctx.closePath();
      ctx.fill();
    }

    // ── Ennemi visible dans le couloir ────────────────────────
    const dirs2 = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };
    const [fdx, fdy] = dirs2[playerDir];
    const eMapX = playerX + fdx * d;
    const eMapY = playerY + fdy * d;
    if (eMapX >= 0 && eMapY >= 0 && eMapX < MAP_W && eMapY < MAP_H && enemyMap[eMapY][eMapX]) {
      const sz = Math.floor(scale * Math.pow(SHRINK, d) * 1.1);
      ctx.font = `${sz}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Ombre rouge
      ctx.fillStyle = 'rgba(180,20,20,0.4)';
      ctx.fillText(enemyMap[eMapY][eMapX].icon, cx + 3, cy + 3);
      ctx.fillStyle = 'rgba(255,100,80,1)';
      ctx.fillText(enemyMap[eMapY][eMapX].icon, cx, cy);
    }
  }

  // 5. Halo de lumière de torche (ambiance chaude)
  addTorchGlow(cx, cy, scale);

  // 6. Arêtes du couloir au premier plan (cadrage)
  drawForegroundFrame(cx, cy, scale);
}

// ─────────────────────────────────────────────────────────────
// LIGNES DE FUITE SUR LE SOL
// ─────────────────────────────────────────────────────────────
function drawFloorLines(cx, cy, scale, W, H) {
  const lineCount = 8;
  ctx.strokeStyle = 'rgba(180,120,50,0.12)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i <= lineCount; i++) {
    const x = (W / lineCount) * i;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────
// TEXTURE DE PIERRES SUR MUR FRONTAL
// ─────────────────────────────────────────────────────────────
function drawStoneBlocks(x0, y0, x1, y1, alpha) {
  const w = x1 - x0, h = y1 - y0;
  const rows = Math.max(2, Math.floor(h / 22));
  const cols = Math.max(2, Math.floor(w / 40));
  const rowH = h / rows;
  const colW = w / cols;

  // Lignes horizontales (joints)
  ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.55})`;
  ctx.lineWidth = Math.max(0.8, rowH * 0.06);
  for (let r = 1; r < rows; r++) {
    const y = y0 + rowH * r;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    // Reflet clair au-dessus du joint
    ctx.strokeStyle = `rgba(200,150,80,${alpha * 0.18})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x0, y - 1); ctx.lineTo(x1, y - 1); ctx.stroke();
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.55})`;
    ctx.lineWidth = Math.max(0.8, rowH * 0.06);
  }

  // Lignes verticales (joints alternés par rangée)
  for (let r = 0; r < rows; r++) {
    const ry0    = y0 + rowH * r;
    const ry1    = y0 + rowH * (r + 1);
    const offset = (r % 2 === 0) ? 0 : colW * 0.5;
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.45})`;
    ctx.lineWidth = Math.max(0.6, colW * 0.04);
    for (let c = 0; c <= cols + 1; c++) {
      const x = x0 + offset + colW * c;
      if (x > x0 && x < x1) {
        ctx.beginPath(); ctx.moveTo(x, ry0); ctx.lineTo(x, ry1); ctx.stroke();
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// LIGNES DE JOINTS SUR MURS LATÉRAUX
// ─────────────────────────────────────────────────────────────
function drawSideLines(nx, ny0, ny1, fx, fy0, fy1, alpha) {
  const rows = 3;
  ctx.lineWidth = 0.8;
  for (let r = 1; r < rows; r++) {
    const t     = r / rows;
    const nearY = ny0 + (ny1 - ny0) * t;
    const farY  = fy0 + (fy1 - fy0) * t;
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(nx, nearY); ctx.lineTo(fx, farY);
    ctx.stroke();
    ctx.strokeStyle = `rgba(200,150,80,${alpha * 0.15})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(nx, nearY - 0.5); ctx.lineTo(fx, farY - 0.5);
    ctx.stroke();
    ctx.lineWidth = 0.8;
  }
}

// ─────────────────────────────────────────────────────────────
// TORCHE
// ─────────────────────────────────────────────────────────────
function drawTorch(x, y, size, alpha) {
  const sz = Math.max(3, size);

  // Support mural (rectangle brun)
  ctx.fillStyle = `rgba(80,50,20,${alpha})`;
  ctx.fillRect(x - sz * 0.15, y - sz * 0.1, sz * 0.3, sz * 0.5);

  // Halo de lumière
  const glow = ctx.createRadialGradient(x, y, 0, x, y, sz * 2);
  glow.addColorStop(0,   `rgba(255,160,40,${alpha * 0.35})`);
  glow.addColorStop(0.5, `rgba(220,100,20,${alpha * 0.12})`);
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, sz * 2, 0, Math.PI * 2);
  ctx.fill();

  // Flamme (jaune-orange)
  ctx.fillStyle = `rgba(255,200,60,${alpha * 0.9})`;
  ctx.beginPath();
  ctx.ellipse(x, y - sz * 0.35, sz * 0.22, sz * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cœur de flamme (blanc chaud)
  ctx.fillStyle = `rgba(255,240,180,${alpha * 0.8})`;
  ctx.beginPath();
  ctx.ellipse(x, y - sz * 0.3, sz * 0.1, sz * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────
// HALO D'AMBIANCE TORCHE
// ─────────────────────────────────────────────────────────────
function addTorchGlow(cx, cy, scale) {
  const glow = ctx.createRadialGradient(cx, cy * 0.75, 0, cx, cy * 0.75, scale * 1.6);
  glow.addColorStop(0,   'rgba(255,140,40,0.14)');
  glow.addColorStop(0.4, 'rgba(200,90,20,0.07)');
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ─────────────────────────────────────────────────────────────
// CADRE AU PREMIER PLAN (arêtes du couloir autour du joueur)
// ─────────────────────────────────────────────────────────────
function drawForegroundFrame(cx, cy, scale) {
  const near = getRect(cx, cy, scale, 0);
  ctx.strokeStyle = 'rgba(201,168,76,0.55)';
  ctx.lineWidth   = 2;
  ctx.strokeRect(near.x0, near.y0, near.x1 - near.x0, near.y1 - near.y0);

  // Coins décorés
  const cs = 12;
  ctx.strokeStyle = 'rgba(201,168,76,0.85)';
  ctx.lineWidth   = 2.5;
  [
    [near.x0, near.y0,  1,  1],
    [near.x1, near.y0, -1,  1],
    [near.x0, near.y1,  1, -1],
    [near.x1, near.y1, -1, -1],
  ].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * cs, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * cs);
    ctx.stroke();
  });
}

// ─────────────────────────────────────────────────────────────
// MARQUEUR DE CELLULE SPÉCIALE
// ─────────────────────────────────────────────────────────────
function drawCellMarker(cx, cy, bx, by, size, cell) {
  if (cell === CELL.DOOR) {
    // Porte en bois
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(bx - size * 0.4, by - size * 0.85, size * 0.8, size * 1.7);
    // Planches
    for (let i = 1; i < 3; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      const hy = by - size * 0.85 + (size * 1.7 / 3) * i;
      ctx.beginPath(); ctx.moveTo(bx - size * 0.4, hy); ctx.lineTo(bx + size * 0.4, hy); ctx.stroke();
    }
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(bx - size * 0.4, by - size * 0.85, size * 0.8, size * 1.7);
    ctx.fillStyle = '#c9a84c';
    ctx.beginPath();
    ctx.arc(bx + size * 0.25, by, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (cell === CELL.STAIRS_D || cell === CELL.STAIRS_U) {
    ctx.font = `${Math.floor(size * 1.4)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,120,220,0.95)';
    ctx.fillText(cell === CELL.STAIRS_D ? '⬇' : '⬆', bx, by);
  } else if (cell === CELL.SHOP) {
    ctx.font = `${Math.floor(size * 1.3)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏪', bx, by);
  } else if (cell === CELL.CHEST) {
    ctx.font = `${Math.floor(size * 1.3)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', bx, by);
  }
}

// ============================================================
// MINIMAP
// ============================================================
function renderMinimap() {
  const mm = document.getElementById('minimap');
  mm.style.gridTemplateColumns = `repeat(${MAP_W},14px)`;
  mm.innerHTML = '';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const div = document.createElement('div');
      div.className = 'map-cell';
      if (x === playerX && y === playerY) {
        div.classList.add('map-player');
      } else if (!visited[y][x]) {
        div.classList.add('map-wall');
      } else {
        const c = dungeon[y][x];
        if (c === CELL.WALL)                               div.classList.add('map-wall');
        else if (c === CELL.STAIRS_D || c === CELL.STAIRS_U) div.classList.add('map-stairs');
        else if (c === CELL.SHOP)                          div.classList.add('map-shop');
        else if (enemyMap[y][x])                           div.classList.add('map-enemy');
        else                                               div.classList.add('map-floor');
      }
      mm.appendChild(div);
    }
  }
}
