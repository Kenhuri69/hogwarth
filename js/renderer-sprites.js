// ============================================================
// RENDU — Sprites de scène (coffre, escalier, boutique, forge,
// bibliothèque, autel, rune, stèle, fontaine)
// ============================================================
// Dépend de canvas/ctx (renderer.js). Chargé APRÈS renderer-effects.js.
// ============================================================
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

// ── Autel Ancien (sprite de couloir, enrichissement §2.B) ────
// Dalle runique sur socle, halo violet-or pulsé.
function drawAltarSprite(x, baseY, sz) {
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.5, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo violet-or
  const glow = ctx.createRadialGradient(x, baseY - sz * 0.5, 0, x, baseY - sz * 0.5, sz * 0.95);
  glow.addColorStop(0, 'rgba(224,184,64,0.42)');
  glow.addColorStop(0.6, 'rgba(144,80,192,0.28)');
  glow.addColorStop(1, 'rgba(42,26,58,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.5, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG de l'autel (viewBox 120×110) ; emoji en repli au chargement.
  const entry = _getSceneSvgImg('altar', () => SCENE_ICONS.altar);
  if (entry && entry.ready) {
    const h = sz * 1.05, w = h * (120 / 110);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🔮', x, baseY);
  }
  ctx.restore();
}

// ── Dalle-rune (sprite de couloir, posée au sol) ──────────────
// Puzzle runique (dungeon-enrichment-v2). Disque de pierre gravé d'un
// glyphe ; teinte par index de rune (RUNE_LABELS) ; halo lumineux si
// allumée, gravure sourde si éteinte. Dessin procédural simple — pas
// d'asset dédié (cf. plan, hors-scope V2).
function drawRuneSprite(x, baseY, sz, lit, idx) {
  ctx.save();
  const label = (typeof RUNE_LABELS !== 'undefined' && RUNE_LABELS[idx])
    ? RUNE_LABELS[idx] : { color: '#e0c24a', rgb: '224,194,74' };
  const cy = baseY - sz * 0.12;          // posée au sol, légèrement relevée
  const rx = sz * 0.42, ry = sz * 0.17;  // disque en perspective écrasée
  // Halo au sol — présent (statique) seulement si la rune est allumée.
  if (lit) {
    const glow = ctx.createRadialGradient(x, cy, 0, x, cy, sz * 0.72);
    glow.addColorStop(0, `rgba(${label.rgb},0.5)`);
    glow.addColorStop(1, `rgba(${label.rgb},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x, cy, sz * 0.72, sz * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Disque de pierre
  ctx.fillStyle   = lit ? '#3a3024' : '#28241e';
  ctx.strokeStyle = lit ? label.color : '#4a4438';
  ctx.lineWidth   = Math.max(1, sz * 0.045);
  ctx.beginPath();
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Glyphe gravé : étoile runique à 4 branches.
  ctx.strokeStyle  = lit ? label.color : '#5a5448';
  ctx.lineWidth    = Math.max(1.5, sz * 0.05);
  ctx.globalAlpha  = lit ? 1 : 0.65;
  ctx.beginPath();
  ctx.moveTo(x, cy - ry * 0.62);  ctx.lineTo(x, cy + ry * 0.62);
  ctx.moveTo(x - rx * 0.58, cy);  ctx.lineTo(x + rx * 0.58, cy);
  ctx.moveTo(x - rx * 0.42, cy - ry * 0.42); ctx.lineTo(x + rx * 0.42, cy + ry * 0.42);
  ctx.moveTo(x - rx * 0.42, cy + ry * 0.42); ctx.lineTo(x + rx * 0.42, cy - ry * 0.42);
  ctx.stroke();
  ctx.restore();
}

// ── Stèle d'énigme (sprite de couloir, monolithe debout) ──────
// Puzzle-devinette (dungeon-enrichment-v2 §3). Monolithe de pierre
// gravé de glyphes : lueur cyan « savoir » tant que l'énigme n'est pas
// résolue, gravure sourde une fois résolue. Dessin procédural simple.
function drawSteleSprite(x, baseY, sz, solved) {
  ctx.save();
  const glow = solved ? '#5a6068' : '#8fe6f4';
  const baseW = sz * 0.30, topW = sz * 0.16;
  const top = baseY - sz * 0.92, bot = baseY - sz * 0.04;
  // Halo cyan au sol — seulement si l'énigme reste à résoudre.
  if (!solved) {
    const g = ctx.createRadialGradient(x, baseY - sz * 0.10, 0,
                                       x, baseY - sz * 0.10, sz * 0.70);
    g.addColorStop(0, 'rgba(143,230,244,0.42)');
    g.addColorStop(1, 'rgba(143,230,244,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, baseY - sz * 0.10, sz * 0.70, sz * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Monolithe légèrement tapéré, sommet en pointe.
  ctx.fillStyle   = solved ? '#2c2e36' : '#3a3d46';
  ctx.strokeStyle = solved ? '#54565e' : '#9098a2';
  ctx.lineWidth   = Math.max(1, sz * 0.04);
  ctx.beginPath();
  ctx.moveTo(x - baseW, bot);
  ctx.lineTo(x + baseW, bot);
  ctx.lineTo(x + topW,  top + sz * 0.10);
  ctx.lineTo(x,         top);
  ctx.lineTo(x - topW,  top + sz * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Glyphes gravés, empilés sur la face.
  ctx.strokeStyle = glow;
  ctx.lineWidth   = Math.max(1.4, sz * 0.045);
  ctx.lineCap     = 'round';
  ctx.globalAlpha = solved ? 0.5 : 1;
  const gw = sz * 0.10;
  for (let i = 0; i < 3; i++) {
    const gy = top + sz * (0.30 + i * 0.20);
    ctx.beginPath();
    ctx.moveTo(x - gw, gy);          ctx.lineTo(x + gw, gy);
    ctx.moveTo(x,      gy - gw * 0.7); ctx.lineTo(x, gy + gw * 0.7);
    ctx.stroke();
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

// Jardin d'herbes (Potions P6.b3) — sprite de couloir d'un jardin révélé.
// `tier` (1-4) adapte la palette aux herbes du palier (cf. SCENE_ICONS.garden).
function drawGardenSprite(x, baseY, sz, tier) {
  tier = tier || 1;
  // Halo coloré par palier — accordé à la palette SVG.
  const HALO = {
    1: ['rgba(120,220,130,0.40)', 'rgba(40,110,60,0)'],
    2: ['rgba(110,225,205,0.40)', 'rgba(40,120,100,0)'],
    3: ['rgba(200,140,240,0.42)', 'rgba(110,60,160,0)'],
    4: ['rgba(240,90,90,0.42)',   'rgba(120,30,30,0)']
  };
  const haloCols = HALO[tier] || HALO[1];
  ctx.save();
  // Ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.5, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Halo luminescent (teinte par palier)
  const halo = ctx.createRadialGradient(x, baseY - sz * 0.45, 0, x, baseY - sz * 0.45, sz * 0.95);
  halo.addColorStop(0, haloCols[0]);
  halo.addColorStop(1, haloCols[1]);
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, baseY - sz * 0.45, sz * 0.95, 0, Math.PI * 2); ctx.fill();
  // Visuel SVG du jardin (viewBox 120×130) — caché par palier.
  const entry = _getSceneSvgImg('garden_t' + tier, () => SCENE_ICONS.garden(tier));
  if (entry && entry.ready) {
    const h = sz * 1.1, w = h * (120 / 130);
    ctx.drawImage(entry.img, x - w / 2, baseY - h, w, h);
  } else {
    ctx.font = `${Math.floor(sz * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🌿', x, baseY);
  }
  ctx.restore();
}

