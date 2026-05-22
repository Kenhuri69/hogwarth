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
  const VALID = ['stone1', 'stone2', 'wood', 'tapestry', 'cavern_wall', 'rune_wall'];
  const f = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  // Progression normale pilotée par la SoT FLOOR_THEMES (floor-themes.js).
  // Endgame : override rune_wall à l'étage 11+ post-victoire — matérialise
  // l'entrée dans les Ténèbres (cf. ENDGAME_PLAN.md §7.1bis).
  const dark = (typeof victoryAchieved !== 'undefined' && victoryAchieved) && f >= 11;
  let key = dark ? 'rune_wall' : getFloorTheme(f).wall;
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

// Lookup direct dans le cache. Retourne null si pas encore construit
// (le baseline couleur reste alors visible, sans allocation par frame).
function _patternForKey(bucket, key) {
  const b = _TEX_PATTERNS[bucket];
  return (b && b[key]) || null;
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
  const [fx, fy] = DIRECTIONS[playerDir];
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
// Mur latéral (gauche ou droit) — bloc miroir paramétré par le côté.
// ─────────────────────────────────────────────────────────────
function _drawSideWall(side, d, near, far, di, edgeA) {
  const isLeft = (side === 'left');
  const nearX  = isLeft ? near.x0 : near.x1;
  const farX   = isLeft ? far.x0  : far.x1;

  const trapezoid = () => {
    ctx.beginPath();
    ctx.moveTo(nearX, near.y0);
    ctx.lineTo(farX,  far.y0);
    ctx.lineTo(farX,  far.y1);
    ctx.lineTo(nearX, near.y1);
    ctx.closePath();
  };

  if (hasWall(isLeft ? -1 : 1, 0, d)) {
    // Baseline couleur + stone-blocks (toujours visible)
    ctx.fillStyle = SIDE_C[di];
    trapezoid();
    ctx.fill();
    // Asymétrie historique préservée : le mur gauche borne les joints à
    // far.y1, le mur droit à near.y1.
    drawStoneBlocks(Math.min(nearX, farX), near.y0,
                    Math.max(nearX, farX), isLeft ? far.y1 : near.y1,
                    edgeA * 0.8);

    // Texture tuilée (pattern 'repeat' + clip trapèze, alpha plein) — via cache
    const sideKey  = (d > 3) ? 'stone2' : 'wood';
    const _pattern = _patternForKey('walls', sideKey);
    if (_pattern) {
      ctx.save();
      trapezoid();
      ctx.clip();
      ctx.fillStyle = _pattern;
      ctx.fillRect(Math.min(nearX, farX), near.y0,
                   Math.abs(farX - nearX), near.y1 - near.y0);
      // Fog de distance
      ctx.fillStyle = `rgba(6,4,2,${0.18 + di * 0.14})`;
      ctx.fillRect(Math.min(nearX, farX), near.y0,
                   Math.abs(farX - nearX), near.y1 - near.y0);
      ctx.restore();
    }

    drawSideLines(nearX, near.y0, near.y1, farX, far.y0, far.y1, edgeA);

    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.75})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(nearX, near.y0); ctx.lineTo(farX, far.y0);
    ctx.moveTo(nearX, near.y1); ctx.lineTo(farX, far.y1);
    ctx.stroke();
  } else {
    // Ouverture latérale : ombre pour indiquer le couloir
    const grad = ctx.createLinearGradient(nearX, 0, farX, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    trapezoid();
    ctx.fill();
  }
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

  // === FIX DEPTH LOOP === Trouver la distance du premier mur devant le joueur.
  // Tout ce qui est au-delà (d > wallDist) est hors de vue ; on ne dessine QUE
  // les depths <= wallDist. Le mur du fond est peint à d === wallDist, les
  // sols/plafonds/murs latéraux sont peints pour chaque depth <= wallDist en
  // ordre far → near (painter's algorithm).

  // Scan : trouver le premier mur ET la première cellule spéciale
  let wallDist = DEPTH;
  let pendingSprite = null;
  for (let d = 1; d <= DEPTH; d++) {
    const cell = getCellAhead(0, 0, d);
    // Mur OU porte fermée : bloque la vue. La porte est peinte sur le
    // mur du fond par drawCellMarker ci-dessous (cas non-sprite). Une
    // porte ouverte est repassée en FLOOR et n'arrête donc plus le scan.
    if (cell === CELL.WALL || cell === CELL.DOOR) { wallDist = d; break; }
    if (!pendingSprite && (cell === CELL.CHEST || cell === CELL.STAIRS_D || cell === CELL.STAIRS_U || cell === CELL.SHOP || cell === CELL.NPC || cell === CELL.FORGE || cell === CELL.LIBRARY || cell === CELL.FOUNTAIN || cell === CELL.ALTAR)) {
      const nearS = getRect(cx, cy, scale, d - 1);
      const [_fdx, _fdy] = DIRECTIONS[playerDir];
      pendingSprite = { cell, x: cx, baseY: nearS.y1, sz: nearS.hw * 1.1,
                        mapX: playerX + _fdx * d, mapY: playerY + _fdy * d,
                        clipX0: nearS.x0, clipY0: nearS.y0, clipX1: nearS.x1, clipY1: nearS.y1 };
    }
  }

  // 4. Boucle de rendu du plus loin au plus proche
  for (let d = wallDist; d >= 1; d--) {
    const di   = Math.min(d - 1, WALL_C.length - 1);
    const near = getRect(cx, cy, scale, d - 1);
    const far  = getRect(cx, cy, scale, d);
    const edgeA = EDGE_A[di];

    const fwdCell = getCellAhead(0, 0, d);
    const isWall  = fwdCell === CELL.WALL;

    // === FIX TEXTURES FINALES === mur du fond : baseline + pattern alpha=1 + fog
    // Dessiné UNIQUEMENT à la distance du premier mur (ou au far clipping si aucun).
    if (d === wallDist) {
      // 1) Baseline couleur + stone-blocks (toujours visible)
      ctx.fillStyle = WALL_C[di];
      ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
      if (far.x1 - far.x0 > 4) drawStoneBlocks(far.x0, far.y0, far.x1, far.y1, edgeA);

      // 2) Texture tuilée (pattern 'repeat' + clip, alpha plein)
      const wallKey  = (d > 3) ? 'stone2' : 'stone1';
      const _wpattern = _patternForKey('walls', wallKey);
      if (_wpattern) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        ctx.clip();
        ctx.fillStyle = _wpattern;
        ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        // Fog de distance (overlay sombre progressif)
        ctx.fillStyle = `rgba(6,4,2,${0.10 + di * 0.16})`;
        ctx.fillRect(far.x0, far.y0, far.x1 - far.x0, far.y1 - far.y0);
        ctx.restore();
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

      // Objets 3D : la capture du sprite est faite plus haut (scan initial).
      // Ici on ne gère que les portes (cas particulier, non sprite).
      if (!isWall && fwdCell === CELL.DOOR) {
        drawCellMarker(cx, cy, (far.x0 + far.x1) / 2, (far.y0 + far.y1) / 2, far.hw * 0.45, fwdCell);
      }
    }

    // ── Sol (trapèze) ─────────────────────────────────────────
    // === FIX TEXTURES FINALES === sol trapèze : pattern + clip + fog
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y1);
    ctx.lineTo(near.x1, near.y1);
    ctx.lineTo(far.x1,  far.y1);
    ctx.lineTo(far.x0,  far.y1);
    ctx.closePath();
    ctx.clip();

    // Baseline couleur garantie
    ctx.fillStyle = FLOOR_C[di];
    ctx.fillRect(near.x0, far.y1, near.x1 - near.x0, near.y1 - far.y1);

    // Texture tuilée (pattern 'repeat', alpha plein) — via cache
    // Endgame : rune_floor en étage 11+ post-victoire (§7.1bis).
    const _floorDark = (typeof victoryAchieved !== 'undefined' && victoryAchieved)
                    && (typeof currentFloor === 'number') && currentFloor >= 11;
    const _floorKey  = _floorDark ? 'rune_floor'
                     : getFloorTheme(currentFloor).floor;
    const _fpattern  = _patternForKey('floor', _floorKey);
    if (_fpattern) {
      ctx.fillStyle = _fpattern;
      ctx.fillRect(near.x0, far.y1, near.x1 - near.x0, near.y1 - far.y1);
    }
    // Fog de profondeur
    ctx.fillStyle = `rgba(6,4,2,${0.06 + di * 0.18})`;
    ctx.fillRect(near.x0, far.y1, near.x1 - near.x0, near.y1 - far.y1);
    ctx.restore();

    // Arête basse (ligne de profondeur)
    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.35})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(far.x0, far.y1); ctx.lineTo(far.x1, far.y1);
    ctx.stroke();

    // ── Plafond (trapèze) ─────────────────────────────────────
    // === FIX TEXTURES FINALES === plafond trapèze : pattern + clip + fog
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(near.x0, near.y0);
    ctx.lineTo(near.x1, near.y0);
    ctx.lineTo(far.x1,  far.y0);
    ctx.lineTo(far.x0,  far.y0);
    ctx.closePath();
    ctx.clip();

    // Baseline couleur garantie
    ctx.fillStyle = CEIL_C[di];
    ctx.fillRect(near.x0, near.y0, near.x1 - near.x0, far.y0 - near.y0);

    const _ceilDark = (typeof victoryAchieved !== 'undefined' && victoryAchieved)
                   && (typeof currentFloor === 'number') && currentFloor >= 11;
    const _ceilKey  = _ceilDark ? 'rune_ceiling'
                    : getFloorTheme(currentFloor).ceiling;
    const _cpattern = _patternForKey('ceiling', _ceilKey);
    if (_cpattern) {
      ctx.fillStyle = _cpattern;
      ctx.fillRect(near.x0, near.y0, near.x1 - near.x0, far.y0 - near.y0);
    }
    // Fog
    ctx.fillStyle = `rgba(6,4,2,${0.10 + di * 0.14})`;
    ctx.fillRect(near.x0, near.y0, near.x1 - near.x0, far.y0 - near.y0);
    ctx.restore();

    ctx.strokeStyle = `rgba(201,168,76,${edgeA * 0.2})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(far.x0, far.y0); ctx.lineTo(far.x1, far.y0);
    ctx.stroke();

    // === FIX TEXTURES FINALES === murs latéraux : pattern clippé sur le trapèze
    _drawSideWall('left',  d, near, far, di, edgeA);
    _drawSideWall('right', d, near, far, di, edgeA);

    // ── Ennemi visible dans le couloir ────────────────────────
    const [fdx, fdy] = DIRECTIONS[playerDir];
    const eMapX = playerX + fdx * d;
    const eMapY = playerY + fdy * d;
    if (eMapX >= 0 && eMapY >= 0 && eMapX < MAP_W && eMapY < MAP_H && enemyMap[eMapY][eMapX]) {
      const enemy    = enemyMap[eMapY][eMapX];
      const spriteBaseY = near.y1;
      const spriteSize  = near.hw * 1.1;
      drawEnemySprite(enemy, cx, spriteBaseY, spriteSize);
    }
  }

  // 4b. Sprite différé (coffre/escalier/boutique) — dessiné après toutes les couches
  if (pendingSprite) {
    const { cell, x, baseY, sz, clipX0, clipY0, clipX1, clipY1 } = pendingSprite;
    ctx.save();
    // Clip au rectangle du couloir visible pour éviter les débordements
    ctx.beginPath();
    ctx.rect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
    ctx.clip();
    if (cell === CELL.CHEST)         drawChestSprite(x, baseY, sz);
    else if (cell === CELL.STAIRS_D) drawStairsSprite(x, baseY, sz, 'down');
    else if (cell === CELL.STAIRS_U) drawStairsSprite(x, baseY, sz, 'up');
    else if (cell === CELL.SHOP)     drawShopSprite(x, baseY, sz);
    else if (cell === CELL.FORGE)    drawForgeSprite(x, baseY, sz);
    else if (cell === CELL.LIBRARY)  drawLibrarySprite(x, baseY, sz);
    else if (cell === CELL.ALTAR)    drawAltarSprite(x, baseY, sz);
    else if (cell === CELL.FOUNTAIN) {
      const dried = (typeof usedFountains !== 'undefined') && usedFountains
        && usedFountains.has(`${pendingSprite.mapX},${pendingSprite.mapY}`);
      drawFountainSprite(x, baseY, sz, dried);
    }
    else if (cell === CELL.NPC) {
      const npcId = (typeof npcPlacements !== 'undefined')
        ? npcPlacements.get(`${pendingSprite.mapX},${pendingSprite.mapY}`)
        : null;
      drawNpcSprite(npcId, x, baseY, sz);
    }
    ctx.restore();
  }

  // 5. Halo de lumière de torche (ambiance chaude)
  addTorchGlow(cx, cy, scale);

  // 6. Arêtes du couloir au premier plan (cadrage)
  drawForegroundFrame(cx, cy, scale);
}

// Les effets visuels (torche, pierres, cadre, marqueurs) sont dans renderer-effects.js
// La minimap (renderMinimap, _buildMinimapCells) est dans renderer-minimap.js
