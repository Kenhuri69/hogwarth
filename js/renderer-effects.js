// ============================================================
// RENDU — Effets visuels décoratifs et marqueurs
// Fonctions utilisées par drawCorridor() dans renderer.js.
// Utilise les constantes canvas/ctx/EDGE_A définies dans renderer.js.
// ============================================================

// Phase d'animation pour les marqueurs PNJ (incrémenté par
// startNpcAnimLoop, lu par drawNpcSprite pour pulser le halo et bobber
// le signe ❗/❓).
let _npcAnimPhase = 0;
let _npcAnimTimer = null;

// Boucle d'animation déclenchée uniquement quand l'étage contient des
// PNJ. 5 FPS suffisent pour un pulse de halo et une oscillation du
// signe "!"/"?". Idempotent.
function startNpcAnimLoop() {
  if (_npcAnimTimer) return;
  _npcAnimTimer = setInterval(() => {
    if (typeof npcPlacements === 'undefined' || npcPlacements.size === 0) return;
    _npcAnimPhase = performance.now() / 1000;
    if (typeof drawDungeon === 'function') drawDungeon();
  }, 200);
}

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
// Seul appelant : renderer.js, gardé par fwdCell === CELL.DOOR.
// Les autres types de cellule (escalier, coffre, boutique, fontaine)
// sont rendus en sprites de couloir ailleurs.
function drawCellMarker(cx, cy, bx, by, size, cell) {
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
  // Visuel SVG du coffre (viewBox 110×100) ; emoji en repli au chargement.
  const entry = _getSceneSvgImg('chest', () => SCENE_ICONS.chest);
  if (entry && entry.ready) {
    const h = sz * 1.05, w = h * (110 / 100);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('📦', x, baseY);
  }
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
// Cache d'images SVG de scène pour le rendu 3D. Le SVG (SCENE_ICONS) est
// rasterisé via data-URI ; même pattern lazy que _getMonsterImg. `makeSvg`
// n'est évalué qu'au premier accès (cache miss) — utile pour les variantes
// (ex. fontaine active / tarie).
const _SCENE_SVG_CACHE = Object.create(null);
function _getSceneSvgImg(cacheKey, makeSvg) {
  let entry = _SCENE_SVG_CACHE[cacheKey];
  if (entry) return entry;
  entry = { img: new Image(), ready: false, failed: false };
  _SCENE_SVG_CACHE[cacheKey] = entry;
  let svg = null;
  try { svg = makeSvg(); } catch (e) { svg = null; }
  if (!svg) { entry.failed = true; return entry; }
  entry.img.onload  = () => {
    entry.ready = true;
    if (typeof window.drawDungeon === 'function') {
      try { window.drawDungeon(); } catch (e) { /* dungeon pas prêt */ }
    }
  };
  entry.img.onerror = () => { entry.failed = true; };
  entry.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return entry;
}

// Étal sobre dessiné tant que le SVG d'échoppe n'est pas chargé (sans
// texte ni emoji — cf. bug « boutique en emoji »).
function _drawShopVectorFallback(x, baseY, sz) {
  const tw = sz * 1.3, th = sz * 0.4;
  ctx.fillStyle = '#5a3a10';
  ctx.beginPath();
  ctx.moveTo(x - tw / 2, baseY); ctx.lineTo(x + tw / 2, baseY);
  ctx.lineTo(x + tw * 0.35, baseY - th); ctx.lineTo(x - tw * 0.35, baseY - th);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = sz * 0.04; ctx.stroke();
}

function drawShopSprite(x, baseY, sz) {
  ctx.save();
  // Ombre au sol douce
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.6, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo vert d'échoppe
  const glowS = ctx.createRadialGradient(x, baseY - sz * 0.5, 0, x, baseY - sz * 0.5, sz * 0.95);
  glowS.addColorStop(0, 'rgba(40,120,70,0.30)'); glowS.addColorStop(1, 'rgba(30,100,60,0)');
  ctx.fillStyle = glowS;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.5, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG de l'échoppe (viewBox 130×110) ; fallback vectoriel sinon.
  const entry = _getSceneSvgImg('shop', () => SCENE_ICONS.shop);
  if (entry && entry.ready) {
    const h = sz * 1.1;
    const w = h * (130 / 110);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    _drawShopVectorFallback(x, baseY, sz);
  }
  ctx.restore();
}

// ── Forge des Ténèbres (sprite de couloir, endgame Tranche 2) ──
// Enclume sur charbons éternels + halo rouge-orange + panneau "FORGE".
function drawForgeSprite(x, baseY, sz) {
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.55, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo de braise (rouge-orange chaud)
  const ember = ctx.createRadialGradient(x, baseY - sz * 0.45, 0, x, baseY - sz * 0.45, sz * 0.95);
  ember.addColorStop(0, 'rgba(255,140,60,0.45)');
  ember.addColorStop(1, 'rgba(120,30,10,0)');
  ctx.fillStyle = ember;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.45, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG de la forge (viewBox 120×110) ; emoji en repli au chargement.
  const entry = _getSceneSvgImg('forge', () => SCENE_ICONS.forge);
  if (entry && entry.ready) {
    const h = sz * 1.05, w = h * (120 / 110);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('⚒️', x, baseY);
  }
  ctx.restore();
}

// ── Bibliothèque interdite (sprite de couloir, endgame Tranche 2) ──
// Grimoire ouvert + halo violet + panneau "BIBLIOTHÈQUE".
function drawLibrarySprite(x, baseY, sz) {
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.55, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo violet runique
  const runic = ctx.createRadialGradient(x, baseY - sz * 0.45, 0, x, baseY - sz * 0.45, sz * 0.95);
  runic.addColorStop(0, 'rgba(180,100,220,0.4)');
  runic.addColorStop(1, 'rgba(50,20,80,0)');
  ctx.fillStyle = runic;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.45, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG de la bibliothèque (viewBox 120×110) ; emoji en repli.
  const entry = _getSceneSvgImg('library', () => SCENE_ICONS.library);
  if (entry && entry.ready) {
    const h = sz * 1.05, w = h * (120 / 110);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('📖', x, baseY);
  }
  ctx.restore();
}

// ── Fontaine (sprite de couloir) ─────────────────────────────
// Bassin restaurateur (cf. Salle Fontaine). Halo bleu eau si active,
// grisé si déjà bue (dried).
function drawFountainSprite(x, baseY, sz, dried) {
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.5, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo — bleu eau si active, gris terne si tarie
  const halo = ctx.createRadialGradient(x, baseY - sz * 0.45, 0, x, baseY - sz * 0.45, sz * 0.95);
  if (dried) {
    halo.addColorStop(0, 'rgba(120,120,120,0.22)');
    halo.addColorStop(1, 'rgba(60,60,60,0)');
  } else {
    halo.addColorStop(0, 'rgba(110,180,230,0.42)');
    halo.addColorStop(1, 'rgba(30,80,130,0)');
  }
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.45, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG de la fontaine (viewBox 120×130) — variante active / tarie.
  const entry = _getSceneSvgImg(dried ? 'fountain_dried' : 'fountain',
    () => SCENE_ICONS.fountain({ dried }));
  if (entry && entry.ready) {
    const h = sz * 1.1, w = h * (120 / 130);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    if (dried) ctx.globalAlpha = 0.55;
    ctx.fillText('⛲', x, baseY);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Cache d'images monstres pour le rendu 3D. Lazy : chaque PNG est chargé
// à la première demande. Re-render automatique du donjon dès qu'une image
// est prête (cf. pattern de textures.js).
const _MONSTER_IMG_CACHE = Object.create(null);
function _getMonsterImg(src) {
  if (!src) return null;
  let entry = _MONSTER_IMG_CACHE[src];
  if (!entry) {
    entry = { img: new Image(), ready: false, failed: false };
    entry.img.onload  = () => {
      entry.ready = true;
      if (typeof window.drawDungeon === 'function') {
        try { window.drawDungeon(); } catch (e) { /* dungeon pas prêt */ }
      }
    };
    entry.img.onerror = () => { entry.failed = true; };
    entry.img.src     = src;
    _MONSTER_IMG_CACHE[src] = entry;
  }
  return entry;
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

  // PNG du monstre prioritaire ; emoji en fallback si imgSrc absent
  // (14 monstres récents) ou image pas encore chargée.
  const entry = _getMonsterImg(enemy.imgSrc);
  if (entry && entry.ready) {
    const drawSize = sz * 1.5;
    ctx.drawImage(entry.img, x - drawSize / 2, baseY - drawSize, drawSize, drawSize);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(enemy.icon, x, baseY);
  }
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

// ── Sprite PNJ dans le couloir ───────────────────────────────────
// Un PNG par type de PNJ (cf. getNpcSpriteType dans npcs.js). Le PNJ
// exact est identifié via npcPlacements (Map "x,y" → npcId) côté
// caller, qui nous transmet l'id pour le type + le signe ❗/❓.
const NPC_SPRITE_SRC = {
  mage:    'img/npc/_npc_mage.png',
  prof_h:  'img/npc/_npc_prof_h.png',
  prof_f:  'img/npc/_npc_prof_f.png',
  fantome: 'img/npc/_npc_fantome.png',
  vendeur: 'img/npc/_npc_vendeur.png',
  phenix:  'img/npc/_npc_phenix.png',
};
const _NPC_SPRITE_CACHE = Object.create(null);
function _getNpcSprite(type) {
  const src = NPC_SPRITE_SRC[type] || NPC_SPRITE_SRC.mage;
  let entry = _NPC_SPRITE_CACHE[src];
  if (entry) return entry;
  entry = { img: new Image(), ready: false };
  entry.img.onload = () => { entry.ready = true; };
  entry.img.src = src;
  _NPC_SPRITE_CACHE[src] = entry;
  return entry;
}

// Silhouette vectorielle de secours, utilisée tant que le PNG n'est
// pas chargé (ou s'il échoue). Conserve l'aspect doré + halo + bobbing
// du signe — cohérent avec drawEnemySprite (PNG → emoji fallback).
function _drawNpcVectorFallback(bx, by, size, sign, phase) {
  const haloPulse = 0.85 + 0.20 * Math.sin(phase * 2);

  // Halo chaud pulsé
  const halo = ctx.createRadialGradient(bx, by - size * 0.5, 0,
                                        bx, by - size * 0.5, size * 0.85 * haloPulse);
  halo.addColorStop(0,   `rgba(255,220,140,${0.35 * haloPulse})`);
  halo.addColorStop(0.6, `rgba(220,170,60,${0.15 * haloPulse})`);
  halo.addColorStop(1,   'rgba(160,110,30,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(bx, by - size * 0.4, size * 0.85 * haloPulse, size * 1.0 * haloPulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corps : tête + robe trapézoïdale
  const goldFill   = '#d8b34c';
  const goldStroke = 'rgba(80,55,15,0.85)';
  ctx.fillStyle   = goldFill;
  ctx.strokeStyle = goldStroke;
  ctx.lineWidth   = 1.5;
  // Robe
  ctx.beginPath();
  ctx.moveTo(bx - size * 0.18, by - size * 0.55);
  ctx.lineTo(bx + size * 0.18, by - size * 0.55);
  ctx.lineTo(bx + size * 0.36, by - size * 0.05);
  ctx.lineTo(bx - size * 0.36, by - size * 0.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Tête
  ctx.beginPath();
  ctx.arc(bx, by - size * 0.72, size * 0.16, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

function drawNpcSprite(npcId, x, baseY, sz) {
  const phase = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const sign  = (typeof getNpcMarkerSign === 'function')
    ? getNpcMarkerSign(npcId) : '';

  ctx.save();

  // Ombre au sol — ellipse écrasée centrée sur les pieds (baseY).
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.38, sz * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura chaude douce derrière le PNJ — distincte du halo pulsé du
  // fallback, car ici elle accompagne le PNG (qui contient déjà ses
  // ombres internes).
  const auraPulse = 0.85 + 0.20 * Math.sin(phase * 2);
  const aura = ctx.createRadialGradient(x, baseY - sz * 0.55, 0,
                                        x, baseY - sz * 0.55, sz * 0.95 * auraPulse);
  aura.addColorStop(0,   `rgba(255,220,140,${0.28 * auraPulse})`);
  aura.addColorStop(0.6, `rgba(220,170,60,${0.10 * auraPulse})`);
  aura.addColorStop(1,   'rgba(160,110,30,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, baseY - sz * 0.55, sz * 0.95 * auraPulse, 0, Math.PI * 2);
  ctx.fill();

  // PNG prioritaire ; fallback vectoriel sinon.
  const spriteType = (typeof getNpcSpriteType === 'function')
    ? getNpcSpriteType(npcId) : 'mage';
  const entry = _getNpcSprite(spriteType);
  if (entry && entry.ready) {
    // Le sprite différé est clippé au cadre du couloir (hauteur ≈ sz*1.13).
    // On cale le PNG sur cette hauteur pour que le PNJ tienne entier —
    // sans ce calage la tête était tronquée par le clip (cf. bug iso 3D).
    const drawSize = sz * 1.12;
    ctx.drawImage(entry.img, x - drawSize / 2, baseY - drawSize, drawSize, drawSize);
  } else {
    _drawNpcVectorFallback(x, baseY, sz, sign, phase);
  }

  // Signe ❗/❓ au-dessus, bobbé verticalement.
  if (sign) {
    const signBob = Math.sin(phase * 3) * sz * 0.08;
    ctx.font         = `bold ${Math.floor(sz * 0.45)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = sign === '!' ? '#ffd84a' : '#b8d4ff';
    ctx.shadowColor  = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur   = 4;
    ctx.fillText(sign, x, baseY - sz * 1.65 + signBob);
    ctx.shadowBlur   = 0;
  }

  ctx.restore();
}
