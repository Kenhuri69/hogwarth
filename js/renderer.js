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
// === TEXTURES INTEGRATION ===
// Cache des patterns sol/plafond (créés une fois, réutilisés chaque frame)
// ─────────────────────────────────────────────────────────────

const _TEX_PATTERNS = { floor: {}, ceiling: {} };
let _patternsReady  = false;

// Crée les CanvasPattern depuis les images déjà chargées (appelé une seule fois).
function _ensurePatterns() {
  if (_patternsReady || !window.texturesLoaded || !window.TEXTURES) return;
  const T = window.TEXTURES;
  for (const [name, img] of Object.entries(T.floor)) {
    if (img && img.complete && img.naturalWidth > 0)
      _TEX_PATTERNS.floor[name] = ctx.createPattern(img, 'repeat');
  }
  for (const [name, img] of Object.entries(T.ceiling)) {
    if (img && img.complete && img.naturalWidth > 0)
      _TEX_PATTERNS.ceiling[name] = ctx.createPattern(img, 'repeat');
  }
  _patternsReady = true;
  console.log('[Renderer] Patterns prêts — sols:', Object.keys(_TEX_PATTERNS.floor),
              'plafonds:', Object.keys(_TEX_PATTERNS.ceiling));
}

// Retourne le nom de la texture mur selon l'étage (et optionnellement la profondeur).
function getWallTextureType(x, y, depth) {
  if (typeof currentFloor === 'undefined') return 'stone1';
  if (currentFloor <= 2) return 'stone1';
  if (currentFloor <= 4) return 'stone2';
  if (currentFloor <= 6) return 'wood';
  if (currentFloor <= 8) return 'tapestry';
  return 'stone2';
}

// Retourne l'Image mur chargée, ou null si indisponible.
function _getWallTex(depth) {
  if (!window.TEXTURES) return null;
  const type = getWallTextureType(playerX, playerY, depth || 0);
  const t    = window.TEXTURES.walls[type];
  return (t && t.complete && t.naturalWidth > 0) ? t : null;
}

// Retourne le pattern de sol selon l'étage (stone ou carpet).
function _getFloorPattern() {
  if (!_patternsReady) return null;
  const name = (typeof currentFloor !== 'undefined' && currentFloor >= 3) ? 'carpet' : 'stone';
  return _TEX_PATTERNS.floor[name] || null;
}

// Retourne le pattern de plafond selon l'étage (beams ou stone).
function _getCeilPattern() {
  if (!_patternsReady) return null;
  const name = (typeof currentFloor !== 'undefined' && currentFloor <= 4) ? 'beams' : 'stone';
  return _TEX_PATTERNS.ceiling[name] || null;
}

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
  // === TEXTURES INTEGRATION === Créer les patterns dès que les images sont prêtes
  _ensurePatterns();

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
      // Fallback couleur (toujours sous la texture)
      ctx.fillStyle = WALL_C[di];
      ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);

      // === TEXTURE FIX === Tuilage correct via createPattern('repeat') + clip
      const _ftex = _getWallTex(d);
      if (_ftex) {
        if (!_ftex._pattern) _ftex._pattern = ctx.createPattern(_ftex, 'repeat');
        ctx.save();
        ctx.beginPath();
        ctx.rect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        ctx.clip();
        ctx.fillStyle = _ftex._pattern;
        ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        // Assombrissement progressif avec la profondeur
        ctx.fillStyle = `rgba(0,0,0,${0.08 + di * 0.16})`;
        ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        ctx.restore();
      } else if (far.x1 - far.x0 > 20) {
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
    // === TEXTURE FIX === clip du trapèze puis remplissage par pattern tuilé
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y1);
    ctx.lineTo(near.x1, near.y1);
    ctx.lineTo(far.x1,  far.y1);
    ctx.lineTo(far.x0,  far.y1);
    ctx.closePath();
    ctx.clip();

    const _floorImg = window.TEXTURES && window.TEXTURES.floor && window.TEXTURES.floor['stone'];
    if (_floorImg && _floorImg.complete && _floorImg.naturalWidth > 0) {
      if (!_floorImg._pattern) _floorImg._pattern = ctx.createPattern(_floorImg, 'repeat');
      ctx.fillStyle = _floorImg._pattern;
    } else {
      ctx.fillStyle = FLOOR_C[di];
    }
    ctx.fillRect(near.x0, far.y1, near.x1 - near.x0, near.y1 - far.y1);
    // Fog de profondeur
    ctx.fillStyle = `rgba(0,0,0,${0.05 + di * 0.18})`;
    ctx.fillRect(near.x0, far.y1, near.x1 - near.x0, near.y1 - far.y1);
    ctx.restore();

    // Arête basse (ligne de profondeur)
    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.35})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(far.x0, far.y1); ctx.lineTo(far.x1, far.y1);
    ctx.stroke();

    // ── Plafond (trapèze) ─────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y0);
    ctx.lineTo(near.x1, near.y0);
    ctx.lineTo(far.x1,  far.y0);
    ctx.lineTo(far.x0,  far.y0);
    ctx.closePath();
    const ceilPat = _getCeilPattern();
    ctx.fillStyle = ceilPat || CEIL_C[di];
    ctx.fill();
    // Assombrissement progressif avec la profondeur (si texture)
    if (ceilPat) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + di * 0.14})`;
      ctx.fill();
    }

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

      // Texture sur le mur gauche (trapèze)
      const _ltex = _getWallTex(d);
      if (_ltex) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(near.x0, near.y0);
        ctx.lineTo(far.x0,  far.y0);
        ctx.lineTo(far.x0,  far.y1);
        ctx.lineTo(near.x0, near.y1);
        ctx.clip();
        ctx.drawImage(_ltex, near.x0, near.y0, far.x0 - near.x0, near.y1 - near.y0);
        ctx.fillStyle = `rgba(0,0,0,${0.28 + di * 0.12})`;
        ctx.fillRect(near.x0, near.y0, far.x0 - near.x0, near.y1 - near.y0);
        ctx.restore();
      }

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

      // Texture sur le mur droit (trapèze)
      const _rtex = _getWallTex(d);
      if (_rtex) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(near.x1, near.y0);
        ctx.lineTo(far.x1,  far.y0);
        ctx.lineTo(far.x1,  far.y1);
        ctx.lineTo(near.x1, near.y1);
        ctx.clip();
        ctx.drawImage(_rtex, far.x1, near.y0, near.x1 - far.x1, near.y1 - near.y0);
        ctx.fillStyle = `rgba(0,0,0,${0.28 + di * 0.12})`;
        ctx.fillRect(far.x1, near.y0, near.x1 - far.x1, near.y1 - near.y0);
        ctx.restore();
      }

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

// Les effets visuels (torche, pierres, cadre, marqueurs) sont dans renderer-effects.js
// La minimap (renderMinimap, _buildMinimapCells) est dans renderer-minimap.js
