// ============================================================
// RENDU — Sprites d'entités (monstres, PNJ, joueur, fantômes,
// visiteurs, marqueurs de message)
// ============================================================
// Dépend de canvas/ctx (renderer.js). Chargé APRÈS renderer-effects.js.
// ============================================================
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

// Vrai si l'utilisateur a demandé la réduction de mouvement — l'idle des
// sprites (E1) tombe alors à amplitude 0. Pur, sûr en file://.
function _spriteReducedMotion() {
  return !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// ── Ennemi (sprite de couloir) ───────────────────────────────
function drawEnemySprite(enemy, x, baseY, sz) {
  ctx.save();
  // Idle (E1) : léger bobbing vertical + respiration (scale), via la phase
  // partagée _npcAnimPhase (tickée par startNpcAnimLoop quand un ennemi est
  // en vue). reduced-motion → amplitude 0 (sprite statique). Le corps et
  // l'aura bobbent ; l'ombre au sol et la barre de PV restent fixes pour la
  // lisibilité. Phase 0 (défaut) ⇒ comportement historique inchangé.
  const phase  = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const amp    = _spriteReducedMotion() ? 0 : 1;
  const bob    = Math.sin(phase * 1.8) * sz * 0.03 * amp;
  const breath = 1 + Math.sin(phase * 1.2) * 0.02 * amp;
  const by     = baseY - bob;

  const shadowG = ctx.createRadialGradient(x, baseY, 0, x, baseY, sz * 0.65);
  shadowG.addColorStop(0, 'rgba(180,20,10,0.5)'); shadowG.addColorStop(1, 'rgba(180,20,10,0)');
  ctx.fillStyle = shadowG; ctx.fillRect(x - sz, baseY - sz * 0.3, sz * 2, sz * 0.65);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(x, baseY, sz * 0.38, sz * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  const aura = ctx.createRadialGradient(x, by - sz * 0.55, 0, x, by - sz * 0.55, sz * 0.85);
  aura.addColorStop(0, 'rgba(220,40,20,0.22)'); aura.addColorStop(1, 'rgba(100,10,5,0)');
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, by - sz * 0.55, sz * 0.85, 0, Math.PI * 2); ctx.fill();

  // PNG du monstre prioritaire ; emoji en fallback si imgSrc absent
  // (14 monstres récents) ou image pas encore chargée.
  const entry = _getMonsterImg(enemy.imgSrc);
  if (entry && entry.ready) {
    const drawSize = sz * 1.5 * breath;
    ctx.drawImage(entry.img, x - drawSize / 2, by - drawSize, drawSize, drawSize);
  } else {
    ctx.font = `${Math.floor(sz * 1.1 * breath)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(enemy.icon, x, by);
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
  // Donneurs de Quête Signature (ch.06 §6.12) — sprites dédiés.
  chevalier: 'img/npc/_npc_chevalier.png',  // 🦁 Chevalier Fantôme (non-hostile)
  echo:      'img/npc/_npc_echo.png',        // 🐍 Écho de Salazar
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

// ── Sprite plein corps des héros (Phase 6+) ──────────────────────
// Un PNG par clé `CHARACTERS` (cf. data.js). Consommé par
// `drawGhostSprite` pour rendre l'identité du joueur distant ; en
// solo le PNG est centré, en duo les deux héros sont décalés. Tant
// que le PNG n'a pas chargé (ou s'il manque), repli sur la silhouette
// vectorielle cyan d'origine.
const PLAYER_SPRITE_SRC = {
  harry:     'img/players/harry.png',
  hermione:  'img/players/hermione.png',
  draco:     'img/players/draco.png',
  cho:       'img/players/cho.png',
  cedric:    'img/players/cedric.png',
  celeste:   'img/players/celeste.png',
  iris:      'img/players/iris.png',
  maxence:   'img/players/maxence.png',
  anastasia: 'img/players/anastasia.png',
  louis:     'img/players/louis.png',
  jeanne:    'img/players/jeanne.png',
  agathe:    'img/players/agathe.png',
  olivier:   'img/players/olivier.png',
  aubin:     'img/players/aubin.png',
  seraphine: 'img/players/seraphine.png',
};
const _PLAYER_SPRITE_CACHE = Object.create(null);
function _getPlayerSprite(key) {
  const src = PLAYER_SPRITE_SRC[key];
  if (!src) return null;
  let entry = _PLAYER_SPRITE_CACHE[src];
  if (entry) return entry;
  entry = { img: new Image(), ready: false };
  entry.img.onload  = () => { entry.ready = true; };
  entry.img.onerror = () => { entry.failed = true; };
  entry.img.src = src;
  _PLAYER_SPRITE_CACHE[src] = entry;
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

// M1 — facteur de proximité d'un PNJ (réaction d'approche). Pur : convertit
// une distance en cases en intensité 0..1 (1 case → 1, 2 → 0.5, ≥ 3 → 0).
// Distance absente / invalide → 0 (aucune réaction). Testable en units.js.
function _npcApproachProx(dist) {
  if (typeof dist !== 'number' || !isFinite(dist) || dist < 0) return 0;
  return Math.max(0, Math.min(1, 1 - (dist - 1) / 2));
}

function drawNpcSprite(npcId, x, baseY, sz, dist) {
  const phase = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const sign  = (typeof getNpcMarkerSign === 'function')
    ? getNpcMarkerSign(npcId) : '';

  // M1 — réaction d'approche : à courte distance, le PNJ "remarque" le joueur
  // (aura plus attentive + signe plus agité). Neutralisé en reduced-motion et
  // si `dist` est absente (rétro-compat des call-sites).
  const reduce = (typeof _spriteReducedMotion === 'function') && _spriteReducedMotion();
  const prox   = reduce ? 0 : _npcApproachProx(dist);
  // Shimmer attentif (1.0 → ~1.30) quand proche ; 1.0 sinon.
  const attentive = prox > 0
    ? (1 + prox * 0.30 * (0.6 + 0.4 * Math.sin(phase * 5.5)))
    : 1;

  ctx.save();

  // Ombre au sol — ellipse écrasée centrée sur les pieds (baseY).
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.38, sz * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura chaude douce derrière le PNJ — distincte du halo pulsé du
  // fallback, car ici elle accompagne le PNG (qui contient déjà ses
  // ombres internes). M1 : accentuée à l'approche via `attentive`.
  const auraPulse = (0.85 + 0.20 * Math.sin(phase * 2)) * attentive;
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

  // Signe ❗/❓ au-dessus, bobbé verticalement. M1 : bob amplifié à l'approche
  // (le PNJ s'agite davantage quand le joueur est proche).
  if (sign) {
    const signBob = Math.sin(phase * 3) * sz * 0.08 * (1 + prox * 0.6);
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

// ── Sprite de fantôme multijoueur dans le couloir ────────────────
// Un autre joueur projeté sur le donjon local (cf. js/multiplayer.js).
// Rendu volontairement DISTINCT d'un PNJ : silhouette translucide à
// teinte froide, halo spectral, nom + niveau du joueur flottant. Les
// PNG plein-pied par héros (§4.8 du plan) sont différés — la silhouette
// vectorielle est l'unique rendu en Phase 1.
// Rendu PNG plein corps (solo = centré ; duo = deux héros décalés).
// Translucide (spectral) — ne tinte pas, l'identité reste lisible ;
// l'effet "fantôme" vient de l'aura cyan + alpha 0.65 globale.
function _drawGhostPngBody(sprites, x, by, sz) {
  const count = sprites.length;
  const h     = sz * 1.10;                 // hauteur cible du sprite
  const w     = h;                         // canvas source carré
  const span  = (count === 1) ? 0 : sz * 0.22;
  ctx.save();
  ctx.globalAlpha = 0.65;
  sprites.forEach((s, i) => {
    const cx = (count === 1) ? x : (x - span + (2 * span * i / (count - 1)));
    const px = cx - w / 2;
    const py = by - h * 0.95;              // pieds à la hauteur `by`
    ctx.drawImage(s.img, px, py, w, h);
  });
  ctx.restore();
}

// Silhouette vectorielle de secours (trapèze + cercle) — utilisée tant
// que les PNG ne sont pas chargés ou pour les `heroKeys` inconnus.
function _drawGhostVectorFallback(x, by, sz) {
  ctx.save();
  ctx.globalAlpha = 0.60;
  ctx.fillStyle   = '#bfe6ff';
  ctx.strokeStyle = 'rgba(60,110,160,0.7)';
  ctx.lineWidth   = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - sz * 0.18, by - sz * 0.55);
  ctx.lineTo(x + sz * 0.18, by - sz * 0.55);
  ctx.lineTo(x + sz * 0.34, by - sz * 0.04);
  ctx.lineTo(x - sz * 0.34, by - sz * 0.04);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, by - sz * 0.72, sz * 0.15, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawGhostSprite(ghost, x, baseY, sz) {
  const phase = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const bob   = Math.sin(phase * 1.5) * sz * 0.05;
  const by    = baseY - bob;          // le fantôme flotte au-dessus du sol

  ctx.save();

  // Ombre au sol — faible : le fantôme ne touche pas vraiment le sol.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.30, sz * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halo spectral froid pulsé.
  const pulse = 0.80 + 0.25 * Math.sin(phase * 2);
  const aura = ctx.createRadialGradient(x, by - sz * 0.5, 0,
                                        x, by - sz * 0.5, sz * 0.95 * pulse);
  aura.addColorStop(0,   `rgba(150,220,255,${0.34 * pulse})`);
  aura.addColorStop(0.6, `rgba(90,170,230,${0.14 * pulse})`);
  aura.addColorStop(1,   'rgba(40,90,150,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(x, by - sz * 0.45, sz * 0.85 * pulse, sz * 1.0 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Corps du fantôme ────────────────────────────────────────
  // PNG plein corps par héros si tous les sprites ont chargé, sinon
  // repli sur la silhouette vectorielle d'origine (zéro régression).
  const heroKeys = Array.isArray(ghost && ghost.heroKeys) ? ghost.heroKeys : [];
  const sprites  = heroKeys.map(k => _getPlayerSprite(k));
  const allReady = sprites.length > 0 && sprites.every(s => s && s.ready);

  if (allReady) {
    _drawGhostPngBody(sprites, x, by, sz);
  } else {
    _drawGhostVectorFallback(x, by, sz);
  }

  // Étiquette « nom · Niv.N » flottante.
  const name  = (ghost && ghost.name) ? String(ghost.name) : 'Sorcier';
  const lvl   = (ghost && ghost.level) ? ghost.level : 0;
  const label = lvl ? `${name} · Niv.${lvl}` : name;
  ctx.font         = `600 ${Math.floor(sz * 0.20)}px Cinzel, serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  const lw = ctx.measureText(label).width;
  const ly = by - sz * 1.05;
  ctx.fillStyle = 'rgba(8,14,22,0.78)';
  ctx.fillRect(x - lw / 2 - 6, ly - sz * 0.20, lw + 12, sz * 0.28);
  ctx.fillStyle   = '#cfeaff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur  = 3;
  ctx.fillText(label, x, ly);
  ctx.shadowBlur  = 0;

  // Badge « +N autres » si plusieurs fantômes occupent la même case.
  const extras = (ghost && ghost.extras) | 0;
  if (extras > 0) {
    const bx = x + sz * 0.30, by2 = by - sz * 0.70;
    const r  = sz * 0.13;
    ctx.beginPath();
    ctx.arc(bx, by2, r, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(40,90,150,0.92)';
    ctx.strokeStyle = '#cfeaff';
    ctx.lineWidth   = 1.2;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle   = '#e8f4ff';
    ctx.font        = `700 ${Math.floor(sz * 0.16)}px Cinzel, serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('+' + extras, bx, by2 + sz * 0.01);
  }

  ctx.restore();
}

// ── Sprite du visiteur incarné (Mondes parallèles — Phase D §6.5) ────
// Distingue visuellement le visiteur (aura DORÉE, chaude) du fantôme
// asynchrone (aura cyan, froide). On réutilise la silhouette vectorielle
// du fallback NPC — pas de PNG plein-pied requis en V1a (les sprites
// `img/players/*.png` du multijoueur asynchrone restent réservés au
// rendu de présence ; un visiteur incarné est un autre cas).
function drawVisitorSprite(visitor, x, baseY, sz) {
  const phase = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const bob   = Math.sin(phase * 1.4) * sz * 0.04;
  const by    = baseY - bob;

  ctx.save();

  // Ombre au sol (visiteur incarné, donc plus marquée qu'un fantôme).
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, baseY, sz * 0.34, sz * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halo doré pulsé — palette warm distincte du cyan spectral des
  // fantômes (cf. drawGhostSprite). Marque l'identité "voyageur d'un
  // autre plan" à la première seconde de regard.
  const pulse = 0.85 + 0.25 * Math.sin(phase * 1.8);
  const aura = ctx.createRadialGradient(x, by - sz * 0.5, 0,
                                        x, by - sz * 0.5, sz * 0.95 * pulse);
  aura.addColorStop(0,   `rgba(255,220,140,${0.40 * pulse})`);
  aura.addColorStop(0.55, `rgba(220,170,60,${0.18 * pulse})`);
  aura.addColorStop(1,   'rgba(160,110,30,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(x, by - sz * 0.45, sz * 0.85 * pulse, sz * 1.0 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corps : robe trapézoïdale + tête (couleurs warm pour cohérence
  // avec l'aura). Pas de translucidité : le visiteur EST là, pas en écho.
  ctx.fillStyle   = '#e6c977';
  ctx.strokeStyle = 'rgba(70,40,12,0.85)';
  ctx.lineWidth   = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - sz * 0.20, by - sz * 0.55);
  ctx.lineTo(x + sz * 0.20, by - sz * 0.55);
  ctx.lineTo(x + sz * 0.38, by - sz * 0.04);
  ctx.lineTo(x - sz * 0.38, by - sz * 0.04);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, by - sz * 0.72, sz * 0.17, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Étiquette « <Pseudo> » flottante au-dessus.
  const name  = (visitor && visitor.name) ? String(visitor.name) : 'Voyageur';
  ctx.font         = `600 ${Math.floor(sz * 0.20)}px Cinzel, serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  const lw = ctx.measureText(name).width;
  const ly = by - sz * 1.05;
  ctx.fillStyle = 'rgba(34,22,8,0.85)';
  ctx.fillRect(x - lw / 2 - 6, ly - sz * 0.20, lw + 12, sz * 0.28);
  ctx.fillStyle   = '#f6e2a8';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur  = 3;
  ctx.fillText(name, x, ly);
  ctx.shadowBlur  = 0;

  ctx.restore();
}

// ── Marqueur de message gravé multijoueur (§6, Phase 4) ──────────
// Sigil lumineux posé au sol sur une case FLOOR : halo doré pulsé +
// glyphe de plume. Cliché « note laissée par un joueur ».
function drawMessageMarker(msg, x, baseY, sz) {
  const phase = (typeof _npcAnimPhase !== 'undefined') ? _npcAnimPhase : 0;
  const pulse = 0.75 + 0.25 * Math.sin(phase * 2.4);
  const cy    = baseY - sz * 0.10;          // posé légèrement au-dessus du sol

  ctx.save();

  // Halo doré au sol.
  const glow = ctx.createRadialGradient(x, cy, 0, x, cy, sz * 0.6 * pulse);
  glow.addColorStop(0,   `rgba(232,206,140,${0.5 * pulse})`);
  glow.addColorStop(0.6, `rgba(190,150,60,${0.2 * pulse})`);
  glow.addColorStop(1,   'rgba(120,90,30,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x, cy, sz * 0.55 * pulse, sz * 0.22 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cercle runique.
  ctx.strokeStyle = `rgba(232,206,140,${0.85 * pulse})`;
  ctx.lineWidth   = Math.max(1, sz * 0.018);
  ctx.beginPath();
  ctx.ellipse(x, cy, sz * 0.30, sz * 0.12, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Glyphe de plume flottant au centre.
  const bob = Math.sin(phase * 1.8) * sz * 0.04;
  ctx.font         = `${Math.floor(sz * 0.34)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(232,206,140,0.9)';
  ctx.shadowBlur   = 8;
  ctx.fillStyle    = '#f3e3b2';
  ctx.fillText('🪶', x, cy - sz * 0.16 + bob);
  ctx.shadowBlur   = 0;

  ctx.restore();
}

