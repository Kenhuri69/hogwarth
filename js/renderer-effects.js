// ============================================================
// RENDU — Effets visuels structurels (torches, pierre, cadre, marqueurs)
// ============================================================
// Helpers décoratifs de drawCorridor() (renderer.js) : drawFloorLines,
// drawStoneBlocks, drawSideLines, drawTorch, addTorchGlow,
// drawForegroundFrame, drawCellMarker + boucle d'animation PNJ. Sprites de
// scène : renderer-sprites.js. Sprites d'entités : renderer-entities.js.
// Utilise canvas/ctx/EDGE_A (renderer.js).
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
    // Pause en arrière-plan (parité avec la boucle dungeon-fx) : onglet caché
    // → aucun redraw, économie CPU/batterie mobile.
    if (typeof document !== 'undefined' && document.hidden) return;
    const hasNpc   = typeof npcPlacements !== 'undefined' && npcPlacements.size > 0;
    const hasGhost = typeof ghostPlacements !== 'undefined' && ghostPlacements.size > 0;
    const hasMsg   = typeof messagePlacements !== 'undefined' && messagePlacements.size > 0;
    const hasEnemy = _enemyAheadVisible(); // E1 : idle des sprites ennemis en couloir
    if (!hasNpc && !hasGhost && !hasMsg && !hasEnemy) return;
    _npcAnimPhase = performance.now() / 1000;
    if (typeof drawDungeon === 'function') drawDungeon();
  }, 200);
}

// E1 — vrai si un ennemi se trouve dans l'axe de regard du joueur (hors
// combat ; en combat la vue 3D est masquée par l'overlay). Sert à animer
// l'idle du sprite de couloir via la phase partagée _npcAnimPhase. Lecture
// pure des globals, gardée par typeof ; ne tient pas compte des murs (un
// faux positif ne fait que redessiner, le sprite reste caché par le mur).
function _enemyAheadVisible() {
  if (typeof inBattle !== 'undefined' && inBattle) return false;
  if (typeof enemyMap === 'undefined' || !Array.isArray(enemyMap)) return false;
  if (typeof playerX !== 'number' || typeof playerY !== 'number') return false;
  if (typeof DIRECTIONS === 'undefined' || typeof playerDir === 'undefined') return false;
  const dir = DIRECTIONS[playerDir];
  if (!dir) return false;
  const [fdx, fdy] = dir;
  const maxW = (typeof MAP_W === 'number') ? MAP_W : 0;
  const maxH = (typeof MAP_H === 'number') ? MAP_H : 0;
  for (let d = 1; d <= 5; d++) {
    const ex = playerX + fdx * d, ey = playerY + fdy * d;
    if (ex < 0 || ey < 0 || ex >= maxW || ey >= maxH) break;
    if (enemyMap[ey] && enemyMap[ey][ex]) return true;
  }
  return false;
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
// Immersion Lot 2 : vacillement + braises pilotés par `_dungeonFxPhase`
// (dungeon-fx.js, ~11 FPS). Phase absente/0 → rendu statique identique à
// l'historique (aucune dépendance dure au module FX). `x` sert de graine
// de déphasage pour que les deux torches d'un mur ne vacillent pas à
// l'unisson.
function drawTorch(x, y, size, alpha) {
  const sz = Math.max(3, size);
  const phase = (typeof _dungeonFxPhase !== 'undefined') ? _dungeonFxPhase : 0;
  // Vacillement : combinaison de deux sinus déphasés par la position x.
  const seed   = x * 0.013;
  const flick  = phase
    ? 0.85 + 0.15 * (Math.sin(phase * 7.3 + seed) * 0.6 + Math.sin(phase * 11.7 + seed * 2) * 0.4)
    : 1;
  const sway   = phase ? Math.sin(phase * 4.1 + seed) * sz * 0.06 : 0;

  // Support mural (rectangle brun) — fixe.
  ctx.fillStyle = `rgba(80,50,20,${alpha})`;
  ctx.fillRect(x - sz * 0.15, y - sz * 0.1, sz * 0.3, sz * 0.5);

  // Halo de lumière (rayon et intensité modulés par le vacillement).
  const glowR = sz * 2 * (0.92 + flick * 0.12);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  glow.addColorStop(0,   `rgba(255,160,40,${alpha * 0.35 * flick})`);
  glow.addColorStop(0.5, `rgba(220,100,20,${alpha * 0.12 * flick})`);
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Flamme (jaune-orange) — hauteur et inclinaison animées.
  ctx.fillStyle = `rgba(255,200,60,${alpha * 0.9 * (0.9 + flick * 0.1)})`;
  ctx.beginPath();
  ctx.ellipse(x + sway, y - sz * 0.35, sz * 0.22, sz * 0.4 * flick, 0, 0, Math.PI * 2);
  ctx.fill();

  // Coeur de flamme (blanc chaud).
  ctx.fillStyle = `rgba(255,240,180,${alpha * 0.8})`;
  ctx.beginPath();
  ctx.ellipse(x + sway * 0.6, y - sz * 0.3, sz * 0.1, sz * 0.18 * flick, 0, 0, Math.PI * 2);
  ctx.fill();

  // Braises montantes — 2 particules qui s'élèvent et s'éteignent, sur un
  // cycle d'1 s déphasé par la torche. Uniquement quand la phase tourne et
  // que la torche est assez grande (proche du joueur) pour être lisible.
  if (phase && sz >= 6) {
    for (let i = 0; i < 2; i++) {
      const t  = (phase * 0.9 + i * 0.5 + seed) % 1;   // 0→1
      const ex = x + Math.sin(phase * 5 + i * 3 + seed) * sz * 0.18;
      const ey = y - sz * 0.4 - t * sz * 1.3;
      const ea = alpha * 0.6 * (1 - t);                // fade en montant
      const er = sz * 0.06 * (1 - t * 0.5);
      ctx.fillStyle = `rgba(255,${160 + Math.floor(60 * (1 - t))},60,${ea})`;
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(0.4, er), 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
  ctx.save();
  const dw = size * 0.84, dh = size * 1.7;
  const dx = bx - dw / 2, dy = by - dh / 2;

  // Battant : panneau de bois, dégradé vertical pour le volume.
  const wood = ctx.createLinearGradient(dx, dy, dx, dy + dh);
  wood.addColorStop(0, '#6a3c16');
  wood.addColorStop(1, '#3a2208');
  ctx.fillStyle = wood;
  ctx.fillRect(dx, dy, dw, dh);

  // Planches verticales (3 planches → 2 joints sombres).
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, size * 0.035);
  for (let i = 1; i < 3; i++) {
    const px = dx + (dw / 3) * i;
    ctx.beginPath();
    ctx.moveTo(px, dy + size * 0.05);
    ctx.lineTo(px, dy + dh - size * 0.05);
    ctx.stroke();
  }

  // 2 ferrures horizontales cloutées (porte renforcée).
  const bandH = size * 0.17;
  for (const byy of [dy + dh * 0.18, dy + dh * 0.80]) {
    ctx.fillStyle = '#2c2824';
    ctx.fillRect(dx, byy, dw, bandH);
    ctx.fillStyle = 'rgba(150,148,140,0.4)';        // liseré clair
    ctx.fillRect(dx, byy, dw, Math.max(1, size * 0.035));
    ctx.fillStyle = '#7a756c';                       // clous
    for (let s = 0; s < 4; s++) {
      const sx = dx + dw * (0.13 + s * 0.247);
      ctx.beginPath();
      ctx.arc(sx, byy + bandH / 2, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cadre doré (cohérent avec le thème or du jeu).
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = Math.max(1.5, size * 0.055);
  ctx.strokeRect(dx, dy, dw, dh);

  // Écusson de serrure (plaque métallique sombre, centrée).
  const lpW = size * 0.38, lpH = size * 0.50;
  const lpx = bx - lpW / 2, lpy = by - lpH / 2;
  ctx.fillStyle = '#181613';
  ctx.fillRect(lpx, lpy, lpW, lpH);
  ctx.fillStyle = 'rgba(170,158,120,0.3)';           // reflet haut
  ctx.fillRect(lpx, lpy, lpW, size * 0.055);
  ctx.strokeStyle = '#8a7a3a';
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.strokeRect(lpx, lpy, lpW, lpH);

  // Trou de serrure : disque + fente trapézoïdale en dessous.
  const khx = bx, khy = by - size * 0.07, khr = size * 0.075;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(khx, khy, khr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(khx - khr * 0.5, khy);
  ctx.lineTo(khx + khr * 0.5, khy);
  ctx.lineTo(khx + khr * 1.2, khy + size * 0.17);
  ctx.lineTo(khx - khr * 1.2, khy + size * 0.17);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(201,168,76,0.7)';          // liseré or autour du trou
  ctx.lineWidth = Math.max(1, size * 0.022);
  ctx.beginPath(); ctx.arc(khx, khy, khr, 0, Math.PI * 2); ctx.stroke();

  // Anneau de poignée, sous l'écusson.
  const ringY = lpy + lpH + size * 0.14, ringR = size * 0.10;
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.beginPath(); ctx.arc(bx, ringY, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';              // ombre interne
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.beginPath(); ctx.arc(bx, ringY, ringR - size * 0.035, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

