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
    // Mini icône d'escalier dessinée — marches en perspective
    const w = size * 0.75, h = size * 1.1;
    const stepN = 4;
    const sh = h / stepN;
    const taper = 0.55;
    const top = by - h * 0.5;
    const bottom = by + h * 0.5;
    const dirDown = (cell === CELL.STAIRS_D);
    for (let i = 0; i < stepN; i++) {
      const t = i / (stepN - 1);
      const yB = dirDown ? top + i * sh + sh : bottom - i * sh;
      const yT = yB - sh * 0.55;
      const ww = w * (1 - (1 - taper) * t);
      ctx.fillStyle = `rgba(168,152,112,${0.85 - t * 0.35})`;
      ctx.fillRect(bx - ww * 0.5, yT, ww, sh * 0.55);
      ctx.fillStyle = `rgba(58,46,28,${0.9})`;
      ctx.fillRect(bx - ww * 0.5, yT + sh * 0.55, ww, sh * 0.45);
      ctx.strokeStyle = 'rgba(201,168,76,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - ww * 0.5, yT, ww, sh * 0.55);
    }
    // Halo doré
    ctx.shadowColor = 'rgba(201,168,76,0.6)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(201,168,76,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - w * 0.5, top, w, h);
    ctx.shadowBlur = 0;
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

// ── Coffre (sprite de couloir) ───────────────────────────────
function drawChestSprite(x, baseY, sz) {
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.38, sz * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Aura dorée
  const aura = ctx.createRadialGradient(x, baseY - sz * 0.55, 0, x, baseY - sz * 0.55, sz * 0.85);
  aura.addColorStop(0, 'rgba(220,170,40,0.28)');
  aura.addColorStop(1, 'rgba(180,120,10,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.55, sz * 0.85, 0, Math.PI * 2); ctx.fill();
  // Emoji coffre — même taille que les monstres
  ctx.font = `${Math.floor(sz * 1.1)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('📦', x, baseY);
  // Label
  ctx.font = `bold ${Math.floor(sz * 0.22)}px sans-serif`;
  ctx.fillStyle = 'rgba(240,200,80,0.9)';
  ctx.textBaseline = 'top';
  ctx.fillText('COFFRE', x, baseY - sz * 1.25);
  ctx.restore();
}

// ── Escalier (sprite de couloir) ─────────────────────────────
function drawStairsSprite(x, baseY, sz, dir) {
  ctx.save();

  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.55, sz * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura douce dorée
  const aura = ctx.createRadialGradient(x, baseY - sz * 0.55, 0, x, baseY - sz * 0.55, sz * 0.95);
  aura.addColorStop(0, 'rgba(201,168,76,0.22)');
  aura.addColorStop(1, 'rgba(201,168,76,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.55, sz * 0.95, 0, Math.PI * 2); ctx.fill();

  // Géométrie de l'escalier — vue de face en perspective
  const W = sz * 0.95;       // largeur de base
  const H = sz * 1.05;       // hauteur totale visible
  const STEPS = 6;           // nombre de marches
  const TOP = baseY - H;     // y du sommet
  const stepH = H / STEPS;   // hauteur d'une marche
  const taper = 0.55;        // largeur du sommet (perspective fuyante)

  // Couleurs pierre médiévale
  const stoneTop   = '#8a7a5a';
  const stoneFace  = '#5a4a32';
  const stoneEdge  = '#3a2e1c';
  const stoneHi    = '#a89870';
  const stoneShade = '#2a2010';

  if (dir === 'down') {
    // ESCALIER DESCENDANT — on regarde dans le trou : marches qui s'enfoncent + s'éloignent
    // Cadre du trou (encadrement de pierre)
    ctx.fillStyle = stoneEdge;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.55, baseY);
    ctx.lineTo(x + W * 0.55, baseY);
    ctx.lineTo(x + W * taper * 0.55, TOP);
    ctx.lineTo(x - W * taper * 0.55, TOP);
    ctx.closePath();
    ctx.fill();

    // Marches descendantes — la plus proche est la plus large et la plus basse
    for (let i = 0; i < STEPS; i++) {
      const t0 = i / STEPS;          // 0 = avant (en bas/large), 1 = fond (en haut/étroit)
      const t1 = (i + 1) / STEPS;
      const y0 = baseY - t0 * H;
      const y1 = baseY - t1 * H;
      const w0 = W * (1 - (1 - taper) * t0);
      const w1 = W * (1 - (1 - taper) * t1);
      const dark = 0.35 + t0 * 0.55; // s'assombrit en s'éloignant

      // Plat de la marche (visible en perspective)
      ctx.fillStyle = `rgba(90,74,50,${1 - t0 * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(x - w0 * 0.5, y0);
      ctx.lineTo(x + w0 * 0.5, y0);
      ctx.lineTo(x + w1 * 0.5, y1 + stepH * 0.35);
      ctx.lineTo(x - w1 * 0.5, y1 + stepH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Contremarche (la verticale de la marche)
      const grad = ctx.createLinearGradient(0, y1 + stepH * 0.35, 0, y1);
      grad.addColorStop(0, stoneFace);
      grad.addColorStop(1, `rgba(20,15,8,${0.7 + t0 * 0.3})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - w1 * 0.5, y1 + stepH * 0.35);
      ctx.lineTo(x + w1 * 0.5, y1 + stepH * 0.35);
      ctx.lineTo(x + w1 * 0.5, y1);
      ctx.lineTo(x - w1 * 0.5, y1);
      ctx.closePath();
      ctx.fill();

      // Bord avant souligné en clair (highlight)
      ctx.strokeStyle = `rgba(168,152,112,${0.5 - t0 * 0.4})`;
      ctx.lineWidth = Math.max(1, sz * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - w0 * 0.5, y0);
      ctx.lineTo(x + w0 * 0.5, y0);
      ctx.stroke();
    }

    // Trou noir au fond
    const hole = ctx.createRadialGradient(x, TOP + stepH * 0.4, 0, x, TOP + stepH * 0.4, W * taper * 0.4);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.ellipse(x, TOP + stepH * 0.5, W * taper * 0.42, stepH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Murs latéraux de l'escalier (suggestion de couloir descendant)
    ctx.fillStyle = 'rgba(30,22,12,0.7)';
    ctx.beginPath();
    ctx.moveTo(x - W * 0.5, baseY);
    ctx.lineTo(x - W * taper * 0.5, TOP);
    ctx.lineTo(x - W * taper * 0.5 - sz * 0.04, TOP);
    ctx.lineTo(x - W * 0.5 - sz * 0.05, baseY);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + W * 0.5, baseY);
    ctx.lineTo(x + W * taper * 0.5, TOP);
    ctx.lineTo(x + W * taper * 0.5 + sz * 0.04, TOP);
    ctx.lineTo(x + W * 0.5 + sz * 0.05, baseY);
    ctx.closePath(); ctx.fill();

  } else {
    // ESCALIER MONTANT — marches empilées qui montent vers une arche
    // Marches : la plus basse (large) devant, on monte en s'élargissant un peu vers l'avant
    for (let i = STEPS - 1; i >= 0; i--) {
      const t = i / (STEPS - 1);     // 0 = bas/avant, 1 = haut/arrière
      const yBottom = baseY - i * stepH;
      const yTop    = yBottom - stepH;
      const w = W * (1 - (1 - taper) * t);

      // Plat de la marche (vu du dessus)
      ctx.fillStyle = i === 0 ? stoneTop : `rgba(138,122,90,${1 - t * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, yTop);
      ctx.lineTo(x + w * 0.5, yTop);
      const wNext = W * (1 - (1 - taper) * Math.min(1, (i + 1) / (STEPS - 1)));
      ctx.lineTo(x + wNext * 0.5, yTop + stepH * 0.35);
      ctx.lineTo(x - wNext * 0.5, yTop + stepH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Contremarche
      ctx.fillStyle = `rgba(58,46,28,${0.85 + t * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(x - wNext * 0.5, yTop + stepH * 0.35);
      ctx.lineTo(x + wNext * 0.5, yTop + stepH * 0.35);
      ctx.lineTo(x + wNext * 0.5, yBottom);
      ctx.lineTo(x - wNext * 0.5, yBottom);
      ctx.closePath();
      ctx.fill();

      // Highlight bord supérieur
      ctx.strokeStyle = `rgba(168,152,112,${0.6 - t * 0.4})`;
      ctx.lineWidth = Math.max(1, sz * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, yTop);
      ctx.lineTo(x + w * 0.5, yTop);
      ctx.stroke();

      // Joints de pierre verticaux sur la contremarche
      ctx.strokeStyle = `rgba(30,22,12,${0.5})`;
      ctx.lineWidth = Math.max(0.5, sz * 0.005);
      const seg = wNext / 3;
      for (let s = 1; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(x - wNext * 0.5 + seg * s, yTop + stepH * 0.35);
        ctx.lineTo(x - wNext * 0.5 + seg * s, yBottom);
        ctx.stroke();
      }
    }

    // Arche en haut
    const archW = W * taper * 0.95;
    const archY = baseY - H;
    ctx.fillStyle = stoneEdge;
    ctx.beginPath();
    ctx.moveTo(x - archW * 0.5, archY);
    ctx.lineTo(x - archW * 0.5, archY - sz * 0.25);
    ctx.quadraticCurveTo(x, archY - sz * 0.55, x + archW * 0.5, archY - sz * 0.25);
    ctx.lineTo(x + archW * 0.5, archY);
    ctx.closePath();
    ctx.fill();

    // Intérieur sombre de l'arche
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - archW * 0.4, archY);
    ctx.lineTo(x - archW * 0.4, archY - sz * 0.22);
    ctx.quadraticCurveTo(x, archY - sz * 0.46, x + archW * 0.4, archY - sz * 0.22);
    ctx.lineTo(x + archW * 0.4, archY);
    ctx.closePath();
    ctx.fill();

    // Pierre de clé d'arche
    ctx.fillStyle = stoneHi;
    ctx.beginPath();
    ctx.moveTo(x - sz * 0.05, archY - sz * 0.46);
    ctx.lineTo(x + sz * 0.05, archY - sz * 0.46);
    ctx.lineTo(x + sz * 0.07, archY - sz * 0.55);
    ctx.lineTo(x - sz * 0.07, archY - sz * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  // Label discret au-dessus
  ctx.font = `600 ${Math.floor(sz * 0.18)}px Cinzel, serif`;
  ctx.fillStyle = 'rgba(201,168,76,0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(dir === 'down' ? 'DESCENDRE' : 'MONTER', x, baseY - H - sz * 0.32);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── Boutique (sprite de couloir) ─────────────────────────────
function drawShopSprite(x, baseY, sz) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.65, sz * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  const tw = sz * 1.3, th = sz * 0.38;
  ctx.fillStyle = '#5a3a10';
  ctx.beginPath();
  ctx.moveTo(x - tw / 2, baseY); ctx.lineTo(x + tw / 2, baseY);
  ctx.lineTo(x + tw * 0.35, baseY - th); ctx.lineTo(x - tw * 0.35, baseY - th);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = sz * 0.04; ctx.stroke();
  ['⚗️','📜','🪄'].forEach((ico, i) => {
    const ox = x + (i - 1) * sz * 0.38;
    ctx.font = `${Math.floor(sz * 0.28)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(ico, ox, baseY - th + 2);
  });
  const signY = baseY - th - sz * 0.52;
  ctx.fillStyle = '#6a3a0a';
  ctx.fillRect(x - sz * 0.5, signY, sz, sz * 0.33);
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = sz * 0.04;
  ctx.strokeRect(x - sz * 0.5, signY, sz, sz * 0.33);
  ctx.fillStyle = '#f0d080';
  ctx.font = `bold ${Math.floor(sz * 0.18)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('BOUTIQUE', x, signY + sz * 0.165);
  const glowS = ctx.createRadialGradient(x, signY, 0, x, signY, sz * 0.85);
  glowS.addColorStop(0, 'rgba(30,100,60,0.3)'); glowS.addColorStop(1, 'rgba(30,100,60,0)');
  ctx.fillStyle = glowS; ctx.fillRect(x - sz, signY - sz * 0.4, sz * 2, sz * 1.4);
  ctx.restore();
}

// ── Ennemi (sprite de couloir) ───────────────────────────────
function drawEnemySprite(enemy, x, baseY, sz) {
  ctx.save();
  const shadowG = ctx.createRadialGradient(x, baseY, 0, x, baseY, sz * 0.65);
  shadowG.addColorStop(0, 'rgba(180,20,10,0.5)'); shadowG.addColorStop(1, 'rgba(180,20,10,0)');
  ctx.fillStyle = shadowG; ctx.fillRect(x - sz, baseY - sz * 0.3, sz * 2, sz * 0.65);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.38, sz * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  const aura = ctx.createRadialGradient(x, baseY - sz * 0.55, 0, x, baseY - sz * 0.55, sz * 0.85);
  aura.addColorStop(0, 'rgba(220,40,20,0.22)'); aura.addColorStop(1, 'rgba(100,10,5,0)');
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, baseY - sz * 0.55, sz * 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.font = `${Math.floor(sz * 1.1)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(enemy.icon, x, baseY);
  const hp  = enemy.currentHp !== undefined ? enemy.currentHp : enemy.hp;
  const pct = Math.max(0, Math.min(1, hp / enemy.hp));
  const barW = sz * 0.85, barH = Math.max(3, sz * 0.07);
  const barX = x - barW / 2, barY = baseY - sz * 1.25;
  if (barY > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#e67e22' : '#c0392b';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = 'rgba(201,168,76,0.45)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }
  ctx.restore();
}
