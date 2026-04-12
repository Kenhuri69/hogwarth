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
  // === FIX TEXTURE MISSING === un resize réinitialise le contexte — reconstruire les patterns
  _invalidatePatternCache();
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

// === TEXTURE FIX - FONCTION QUI MARCHE SUR TOUT ===
function drawTexturedRect(x, y, w, h, textureKey, alpha = 1) {
  const tex = (TEXTURES.walls && TEXTURES.walls[textureKey])
           || (TEXTURES.floor && TEXTURES.floor[textureKey])
           || (TEXTURES.ceiling && TEXTURES.ceiling[textureKey]);
  if (!tex || !tex.complete || !tex.naturalWidth) {
    console.warn(`Texture manquante: ${textureKey}`);
    return false;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const pattern = ctx.createPattern(tex, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  return true;
}

// ─────────────────────────────────────────────────────────────
// === TEXTURES INTEGRATION ===
// Cache des patterns sol/plafond (créés une fois, réutilisés chaque frame)
// ─────────────────────────────────────────────────────────────

// === FIX TEXTURE MISSING === Cache central walls/floor/ceiling + construction résiliente
const _TEX_PATTERNS = { walls: {}, floor: {}, ceiling: {} };
let _patternsLogged = false;

// Tente de créer les patterns manquants à chaque frame (no-op si déjà créés).
// Résout les cas de race : image pas encore `complete` au premier appel, nouveau
// contexte canvas après resize, textures chargées tardivement, etc.
function _ensurePatterns() {
  if (!window.TEXTURES) return;
  const T = window.TEXTURES;
  const tryBuild = (bucket, dict) => {
    for (const [name, img] of Object.entries(dict || {})) {
      if (_TEX_PATTERNS[bucket][name]) continue;           // déjà prêt
      if (img && img.complete && img.naturalWidth > 0) {
        try { _TEX_PATTERNS[bucket][name] = ctx.createPattern(img, 'repeat'); }
        catch (e) { /* ignore, retry next frame */ }
      }
    }
  };
  tryBuild('walls',   T.walls);
  tryBuild('floor',   T.floor);
  tryBuild('ceiling', T.ceiling);

  if (!_patternsLogged
      && Object.keys(_TEX_PATTERNS.walls).length
      && Object.keys(_TEX_PATTERNS.floor).length
      && Object.keys(_TEX_PATTERNS.ceiling).length) {
    _patternsLogged = true;
    console.log('[Renderer] Patterns prêts — murs:', Object.keys(_TEX_PATTERNS.walls),
                '| sols:', Object.keys(_TEX_PATTERNS.floor),
                '| plafonds:', Object.keys(_TEX_PATTERNS.ceiling));
  }
}

// === FIX TEXTURE MISSING === Invalide le cache (appelé après resize canvas)
function _invalidatePatternCache() {
  _TEX_PATTERNS.walls   = {};
  _TEX_PATTERNS.floor   = {};
  _TEX_PATTERNS.ceiling = {};
  _patternsLogged = false;
}
window._invalidatePatternCache = _invalidatePatternCache;

// === FIX TEXTURE MISSING === Retourne toujours une clé texture existante.
// Signature compatible : (x, y, depth) OU (d, side) — tous les paramètres sont optionnels.
function getWallTextureType(x, y, depth) {
  const VALID = ['stone1', 'stone2', 'wood', 'tapestry'];
  const f = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  let key;
  if      (f <= 2) key = 'stone1';
  else if (f <= 4) key = 'stone2';
  else if (f <= 6) key = 'wood';
  else if (f <= 8) key = 'tapestry';
  else             key = 'stone2';
  // Garantie finale : si la texture n'est pas chargée, on retombe sur une clé chargée
  if (window.TEXTURES && window.TEXTURES.walls) {
    const img = window.TEXTURES.walls[key];
    if (!img || !img.complete || !img.naturalWidth) {
      key = VALID.find(k => {
        const i = window.TEXTURES.walls[k];
        return i && i.complete && i.naturalWidth > 0;
      }) || key;
    }
  }
  return key;
}

// === FIX TEXTURE MISSING === Retourne le pattern mur via le cache central
function _getWallPattern(depth) {
  if (!window.TEXTURES) return null;
  const type = getWallTextureType(playerX, playerY, depth || 0);
  return _TEX_PATTERNS.walls[type] || null;
}

// Legacy : retourne l'Image (utilisé comme fallback si pas de pattern).
function _getWallTex(depth) {
  if (!window.TEXTURES) return null;
  const type = getWallTextureType(playerX, playerY, depth || 0);
  const t    = window.TEXTURES.walls[type];
  return (t && t.complete && t.naturalWidth > 0) ? t : null;
}

// === FIX TEXTURE MISSING === Patterns sol/plafond via cache central (plus de gate _patternsReady)
function _getFloorPattern() {
  const name = (typeof currentFloor === 'number' && currentFloor >= 3) ? 'carpet' : 'stone';
  return _TEX_PATTERNS.floor[name] || _TEX_PATTERNS.floor['stone'] || _TEX_PATTERNS.floor['carpet'] || null;
}

function _getCeilPattern() {
  const name = (typeof currentFloor === 'number' && currentFloor <= 4) ? 'beams' : 'stone';
  return _TEX_PATTERNS.ceiling[name] || _TEX_PATTERNS.ceiling['stone'] || _TEX_PATTERNS.ceiling['beams'] || null;
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

    // === MUR DU FOND - TEXTURE FORCÉE ===
    if (isWall || d === DEPTH) {
      const wallKey = (d > 3) ? 'stone2' : 'stone1';   // varie un peu selon profondeur

      const textured = drawTexturedRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0, wallKey, edgeA);

      if (!textured) {
        ctx.fillStyle = WALL_C[di];
        ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        drawStoneBlocks(far.x0, far.y0, far.x1, far.y1, edgeA); // fallback
      }

      // bordure dorée
      ctx.strokeStyle = `rgba(201,168,76,${edgeA})`;
      ctx.lineWidth   = 3;
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
    // === FIX TEXTURE MISSING === pattern via cache central, fallback couleur garanti
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y1);
    ctx.lineTo(near.x1, near.y1);
    ctx.lineTo(far.x1,  far.y1);
    ctx.lineTo(far.x0,  far.y1);
    ctx.closePath();
    ctx.clip();

    const floorPat = _getFloorPattern();
    ctx.fillStyle  = floorPat || FLOOR_C[di];
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

    // === MURS LATÉRAUX - TEXTURE AJOUTÉE ===
    const sideAlpha = edgeA * 0.85;

    // Mur gauche
    if (hasWall(-1, 0, d)) {
      // Fallback couleur + stone-blocks baseline
      ctx.fillStyle = SIDE_C[di];
      ctx.beginPath();
      ctx.moveTo(near.x0, near.y0);
      ctx.lineTo(far.x0,  far.y0);
      ctx.lineTo(far.x0,  far.y1);
      ctx.lineTo(near.x0, near.y1);
      ctx.closePath();
      ctx.fill();
      drawStoneBlocks(near.x0, near.y0, far.x0, far.y1, edgeA * 0.8);

      // Trapèze gauche : bounding box + clip pour contenir la texture
      const leftNear = {
        x0: near.x0,
        y0: near.y0,
        w:  far.x0 - near.x0,
        h:  near.y1 - near.y0
      };
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(near.x0, near.y0);
      ctx.lineTo(far.x0,  far.y0);
      ctx.lineTo(far.x0,  far.y1);
      ctx.lineTo(near.x0, near.y1);
      ctx.closePath();
      ctx.clip();
      const sideKeyL = (d > 3) ? 'stone2' : 'wood';
      const texturedLeft = drawTexturedRect(leftNear.x0, leftNear.y0, leftNear.w, leftNear.h, sideKeyL, sideAlpha);
      if (!texturedLeft) {
        ctx.fillStyle = SIDE_C[di];
        ctx.fillRect(leftNear.x0, leftNear.y0, leftNear.w, leftNear.h);
      }
      ctx.restore();

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

    // Mur droit (même logique)
    if (hasWall(1, 0, d)) {
      ctx.fillStyle = SIDE_C[di];
      ctx.beginPath();
      ctx.moveTo(near.x1, near.y0);
      ctx.lineTo(far.x1,  far.y0);
      ctx.lineTo(far.x1,  far.y1);
      ctx.lineTo(near.x1, near.y1);
      ctx.closePath();
      ctx.fill();
      drawStoneBlocks(far.x1, near.y0, near.x1, near.y1, edgeA * 0.8);

      const rightNear = {
        x0: far.x1,
        y0: near.y0,
        w:  near.x1 - far.x1,
        h:  near.y1 - near.y0
      };
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(near.x1, near.y0);
      ctx.lineTo(far.x1,  far.y0);
      ctx.lineTo(far.x1,  far.y1);
      ctx.lineTo(near.x1, near.y1);
      ctx.closePath();
      ctx.clip();
      const sideKeyR = (d > 3) ? 'stone2' : 'wood';
      const texturedRight = drawTexturedRect(rightNear.x0, rightNear.y0, rightNear.w, rightNear.h, sideKeyR, sideAlpha);
      if (!texturedRight) {
        ctx.fillStyle = SIDE_C[di];
        ctx.fillRect(rightNear.x0, rightNear.y0, rightNear.w, rightNear.h);
      }
      ctx.restore();

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
