// ============================================================
// RENDU — Effets visuels décoratifs et marqueurs
// Fonctions utilisées par drawCorridor() dans renderer.js.
// Utilise les constantes canvas/ctx/EDGE_A définies dans renderer.js.
// ============================================================

// ── Lignes de fuite sur le sol ──────────────────────────────────
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

// ── Texture de pierres sur mur frontal ──────────────────────────
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

// ── Lignes de joints sur murs latéraux ──────────────────────────
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

// ── Torche ──────────────────────────────────────────────────────
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

  // Coeur de flamme (blanc chaud)
  ctx.fillStyle = `rgba(255,240,180,${alpha * 0.8})`;
  ctx.beginPath();
  ctx.ellipse(x, y - sz * 0.3, sz * 0.1, sz * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Halo d'ambiance torche ──────────────────────────────────────
function addTorchGlow(cx, cy, scale) {
  const glow = ctx.createRadialGradient(cx, cy * 0.75, 0, cx, cy * 0.75, scale * 1.6);
  glow.addColorStop(0,   'rgba(255,140,40,0.14)');
  glow.addColorStop(0.4, 'rgba(200,90,20,0.07)');
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── Cadre au premier plan ───────────────────────────────────────
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

// ── Marqueur de cellule spéciale ────────────────────────────────
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
