// ============================================================
// COMBAT FX — Immersion visuelle du combat (Lot 1)
// ============================================================
// Surcouche d'agrément PURE (visuelle) du combat, exposée sur
// window.CombatFX. Aucune mécanique de jeu n'est touchée : ce module ne
// fait que peindre des effets par-dessus #encounter-overlay.
//
//   CombatFX.spellBurst(targetKey, element)  → gerbe colorée par élément
//   CombatFX.shake(intensity)                → secousse globale de l'overlay
//   CombatFX.bossIntro(enemy)                → carte-titre des boss epic
//
// Tous les call-sites sont défensifs (helper window.CFX_safe, calqué sur
// UX_safe) : si ce module n'a pas chargé, le combat fonctionne sans FX.
// Respecte prefers-reduced-motion (les anims lourdes deviennent no-op via
// CSS ; le module évite aussi de spawn des particules dans ce mode).

(function () {
  'use strict';

  const overlay = () => document.getElementById('encounter-overlay');

  // Gate des effets décoratifs (particules, gerbes). Respecte le niveau de
  // feedback (H4) : `particlesOff()` est vrai en Sobre ET Minimal/reduced-motion.
  // Repli matchMedia si UIFeedback pas encore défini.
  function prefersReducedMotion() {
    if (window.UIFeedback && typeof window.UIFeedback.particlesOff === 'function')
      return window.UIFeedback.particlesOff();
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Couche de FX (au-dessus du float-dmg-layer) ───────────────
  function ensureFxLayer() {
    const ov = overlay();
    if (!ov) return null;
    let layer = document.getElementById('combat-fx-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'combat-fx-layer';
    layer.className = 'combat-fx-layer';
    ov.appendChild(layer);
    return layer;
  }

  // ── Ancrage d'une cible (réplique la logique de UX.floatDmg) ──
  // targetKey : "enemy:N" | "ally" | {x,y}
  function anchorFor(targetKey) {
    const ov = overlay();
    if (!ov) return null;
    const o = ov.getBoundingClientRect();
    if (typeof targetKey === 'object' && targetKey && typeof targetKey.x === 'number') {
      return targetKey;
    }
    if (typeof targetKey === 'string') {
      if (targetKey.startsWith('enemy:')) {
        const card = document.getElementById(`enemy-card-${targetKey.slice(6)}`);
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2 - o.left, y: r.top + r.height * 0.35 - o.top };
      }
      if (targetKey === 'ally') {
        return { x: o.width / 2, y: o.height * 0.55 };
      }
    }
    return null;
  }

  // ── Palettes par élément ──────────────────────────────────────
  // Couleur des particules + glyphe central. Calé sur les 6 éléments de
  // SPELLS (feu/glace/foudre/lumière/ténèbres/physique). Défaut neutre.
  const ELEMENTS = {
    feu:      { colors: ['#ff8a2a', '#ffd23f', '#e8431f'], glyph: '🔥', cls: 'cfx-feu' },
    glace:    { colors: ['#9fdcff', '#5fa8d3', '#e8f6ff'], glyph: '❄️', cls: 'cfx-glace' },
    foudre:   { colors: ['#fff27a', '#9ad0ff', '#ffffff'], glyph: '⚡', cls: 'cfx-foudre' },
    'lumière':{ colors: ['#fff6c8', '#ffe27a', '#ffffff'], glyph: '✨', cls: 'cfx-lumiere' },
    'ténèbres':{ colors: ['#7d3fa0', '#3a1452', '#c060d0'], glyph: '🌑', cls: 'cfx-tenebres' },
    physique: { colors: ['#d8c79a', '#9a8050', '#fff'],    glyph: '⚔️', cls: 'cfx-physique' },
  };

  // ── Burst de sort : gerbe de particules + halo coloré + glyphe ─
  function spellBurst(targetKey, element) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(targetKey);
    if (!pos) return;
    const def = ELEMENTS[element] || ELEMENTS.physique;

    // Halo central (toujours, même en reduced-motion : il fade simplement).
    const halo = document.createElement('div');
    halo.className = 'cfx-halo ' + def.cls;
    halo.style.left = pos.x + 'px';
    halo.style.top  = pos.y + 'px';
    layer.appendChild(halo);
    setTimeout(() => halo.remove(), 600);

    // Glyphe élémentaire qui pulse au centre.
    const g = document.createElement('div');
    g.className = 'cfx-glyph ' + def.cls;
    g.textContent = def.glyph;
    g.style.left = pos.x + 'px';
    g.style.top  = pos.y + 'px';
    layer.appendChild(g);
    setTimeout(() => g.remove(), 650);

    // Particules projetées (omises en reduced-motion pour limiter le mouvement).
    if (prefersReducedMotion()) return;
    const N = 10;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'cfx-particle ' + def.cls;
      const angle = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      const dist  = 26 + Math.random() * 34;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 10; // léger biais vers le haut
      p.style.left = pos.x + 'px';
      p.style.top  = pos.y + 'px';
      p.style.background = def.colors[i % def.colors.length];
      p.style.setProperty('--cfx-dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--cfx-dy', dy.toFixed(1) + 'px');
      layer.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  // ── Cast Premium par Maison (P5 — combat-system-synthesis §2.7) ─
  // Surcouche visuelle PURE déclenchée au lancement d'un sort Premium signature
  // (spell.premium + spell.premiumFx). Anneau coloré qui s'évase + glyphe de
  // Maison + gerbe de particules teintées, émanant du lanceur. Palette par clé
  // `premiumFx` (gryff/slyth/serd/pouf) — miroir auto-suffisant de HOUSE_SPELL_FX
  // (aucun couplage data.js). Défensif : no-op si la couche ou la clé manque.
  const PREMIUM_FX = {
    gryff: { colors: ['#ffd23f', '#ff8a2a', '#fff6c8'], glyph: '🦁', tint: '#d3a625' },
    slyth: { colors: ['#3fbf6a', '#1a472a', '#9be8b0'], glyph: '🐍', tint: '#1a472a' },
    serd:  { colors: ['#9fdcff', '#5fa8d3', '#e8f6ff'], glyph: '🦅', tint: '#0e1a40' },
    pouf:  { colors: ['#ffe27a', '#caa23a', '#fff6c8'], glyph: '🦡', tint: '#f0c75e' },
  };
  function premiumCast(casterKey, fxKey) {
    const def = PREMIUM_FX[fxKey];
    if (!def) return;
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(casterKey || 'ally');
    if (!pos) return;

    // Anneau Premium qui s'évase (toujours, même en reduced-motion : il fade).
    const ring = document.createElement('div');
    ring.className = 'cfx-premium-ring cfx-premium-' + fxKey;
    ring.style.left = pos.x + 'px';
    ring.style.top  = pos.y + 'px';
    ring.style.setProperty('--cfx-prem-tint', def.tint);
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 720);

    // Glyphe de Maison qui pulse.
    const g = document.createElement('div');
    g.className = 'cfx-premium-glyph cfx-premium-' + fxKey;
    g.textContent = def.glyph;
    g.style.left = pos.x + 'px';
    g.style.top  = pos.y + 'px';
    layer.appendChild(g);
    setTimeout(() => g.remove(), 760);

    // Gerbe de particules teintées (omises en reduced-motion).
    if (prefersReducedMotion()) return;
    const N = 12;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'cfx-premium-particle';
      const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
      const dist  = 30 + Math.random() * 36;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 14; // biais montant
      p.style.left = pos.x + 'px';
      p.style.top  = pos.y + 'px';
      p.style.background = def.colors[i % def.colors.length];
      p.style.setProperty('--cfx-dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--cfx-dy', dy.toFixed(1) + 'px');
      layer.appendChild(p);
      setTimeout(() => p.remove(), 760);
    }
  }

  // ── Désintégration d'un ennemi vaincu (G1) ───────────────────
  // Joué UNE fois quand un ennemi passe à 0 PV (hook en tête de
  // renderEnemyGroup, AVANT la reconstruction en état mort). Nuage qui se
  // dissipe + cendres montantes, teintés par la catégorie : fantôme =
  // éthéré bleuté, sinon cendre chaude. Ancré sur la carte encore présente.
  // reduced-motion = nuage bref sans particules (le module n'en crée pas).
  function deathDissolve(enemyIdx, monster) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor('enemy:' + enemyIdx);
    if (!pos) return;
    const ghostly = !!(monster && monster.category === 'fantôme');
    const palette = ghostly
      ? ['#bfe4ff', '#7fb7e0', '#eaf6ff']
      : ['#c9b48f', '#8a7355', '#e8dcc2'];

    // Nuage de dissipation (toujours, même en reduced-motion : il fade).
    const puff = document.createElement('div');
    puff.className = 'cfx-dissolve-puff' + (ghostly ? ' cfx-dissolve-ghost' : '');
    puff.style.left = pos.x + 'px';
    puff.style.top  = pos.y + 'px';
    layer.appendChild(puff);
    setTimeout(() => puff.remove(), 720);

    // Cendres montantes (omises en reduced-motion).
    if (prefersReducedMotion()) return;
    const N = 12;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'cfx-dissolve-ash';
      const dx = (Math.random() - 0.5) * 46;
      const dy = -(30 + Math.random() * 60); // cendres qui s'élèvent
      p.style.left = (pos.x + (Math.random() - 0.5) * 30) + 'px';
      p.style.top  = pos.y + 'px';
      p.style.background = palette[i % palette.length];
      p.style.setProperty('--cfx-dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--cfx-dy', dy.toFixed(1) + 'px');
      p.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      layer.appendChild(p);
      setTimeout(() => p.remove(), 840);
    }
  }

  // ── Flash de cast côté lanceur (G2) ──────────────────────────
  // Bref halo teinté élément à l'ancre du lanceur (typiquement 'ally') au
  // moment où un sort part, pour qu'il « émane » du personnage. Quelques
  // étincelles montantes en complément (omises en reduced-motion). Plus
  // léger que spellBurst (qui éclate sur la cible) — réutilise les teintes
  // de halo élémentaires existantes (.cfx-halo.cfx-<element>).
  function castFlash(casterKey, element) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(casterKey || 'ally');
    if (!pos) return;
    const def = ELEMENTS[element] || ELEMENTS.physique;

    const halo = document.createElement('div');
    halo.className = 'cfx-halo cfx-cast-halo ' + def.cls;
    halo.style.left = pos.x + 'px';
    halo.style.top  = pos.y + 'px';
    layer.appendChild(halo);
    setTimeout(() => halo.remove(), 500);

    if (prefersReducedMotion()) return;
    const N = 6;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'cfx-cast-spark';
      const dx = (Math.random() - 0.5) * 30;
      const dy = -(14 + Math.random() * 26); // étincelles montantes
      p.style.left = (pos.x + (Math.random() - 0.5) * 18) + 'px';
      p.style.top  = pos.y + 'px';
      p.style.background = def.colors[i % def.colors.length];
      p.style.setProperty('--cfx-dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--cfx-dy', dy.toFixed(1) + 'px');
      layer.appendChild(p);
      setTimeout(() => p.remove(), 580);
    }
  }

  // ── Burst de soin : gerbe verte MONTANTE + halo + glyphe ✚ ────
  // Visuellement distinct du burst offensif : palette verte, particules
  // qui s'élèvent (dy fortement négatif) plutôt que projetées en étoile.
  function healBurst(targetKey) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(targetKey);
    if (!pos) return;

    const halo = document.createElement('div');
    halo.className = 'cfx-heal-halo';
    halo.style.left = pos.x + 'px';
    halo.style.top  = pos.y + 'px';
    layer.appendChild(halo);
    setTimeout(() => halo.remove(), 650);

    const g = document.createElement('div');
    g.className = 'cfx-heal-glyph';
    g.textContent = '✚';
    g.style.left = pos.x + 'px';
    g.style.top  = pos.y + 'px';
    layer.appendChild(g);
    setTimeout(() => g.remove(), 700);

    if (prefersReducedMotion()) return;
    const greens = ['#7ef0a0', '#3fbf6a', '#d8ffe6'];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'cfx-heal-particle';
      // Étalement horizontal modéré, forte montée verticale.
      const dx = (Math.random() - 0.5) * 44;
      const dy = -(38 + Math.random() * 46);
      p.style.left = (pos.x + (Math.random() - 0.5) * 24) + 'px';
      p.style.top  = pos.y + 'px';
      p.style.background = greens[i % greens.length];
      p.style.setProperty('--cfx-dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--cfx-dy', dy.toFixed(1) + 'px');
      layer.appendChild(p);
      setTimeout(() => p.remove(), 760);
    }
  }

  // ── Aura de buff : anneau doré qui s'évase + glyphe ✦ ─────────
  // Pour les sorts de protection/soutien (Protego, Patronus). Bref halo
  // doré sans particules projetées — lecture « buff » immédiate.
  function buffAura(targetKey) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(targetKey);
    if (!pos) return;

    const ring = document.createElement('div');
    ring.className = 'cfx-buff-ring';
    ring.style.left = pos.x + 'px';
    ring.style.top  = pos.y + 'px';
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 650);

    const g = document.createElement('div');
    g.className = 'cfx-buff-glyph';
    g.textContent = '✦';
    g.style.left = pos.x + 'px';
    g.style.top  = pos.y + 'px';
    layer.appendChild(g);
    setTimeout(() => g.remove(), 700);
  }

  // ── Pop de butin (J1) ────────────────────────────────────────
  // Révélation visuelle brève d'un objet gagné à la victoire. endBattle
  // masque #encounter-overlay AVANT de traiter les drops, donc ce pop ne
  // peut pas vivre dans l'arène : il se monte sur une couche dédiée fixée
  // au body, centrée en haut de la vue. Empilable — chaque pop simultané
  // est décalé verticalement (var --cfx-loot-i). reduced-motion =
  // apparition statique brève sans translation (géré en CSS).
  function lootPop(item) {
    if (!item || !document.body) return;
    let layer = document.getElementById('cfx-loot-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'cfx-loot-layer';
      layer.className = 'cfx-loot-layer';
      document.body.appendChild(layer);
    }
    const iconHtml = (typeof getItemIconHtml === 'function')
      ? getItemIconHtml(item, 'ui-icon-xl') : (item.icon || '');
    const idx = layer.querySelectorAll('.cfx-loot-pop').length; // empilement
    const pop = document.createElement('div');
    pop.className = 'cfx-loot-pop';
    pop.style.setProperty('--cfx-loot-i', String(idx));
    pop.innerHTML =
      `<span class="cfx-loot-icon">${iconHtml}</span>` +
      `<span class="cfx-loot-name">${item.name || ''}</span>`;
    layer.appendChild(pop);
    const dur = prefersReducedMotion() ? 700 : 960;
    setTimeout(() => {
      pop.remove();
      if (layer && !layer.querySelector('.cfx-loot-pop')) layer.remove();
    }, dur);
  }

  // ── Splash de sort : key-art d'effet composité sur la cible ──
  // Overlay image (PNG transparent de img/fx/spells/) au-dessus de la
  // cible, scale-in + fade ~760 ms, puis retrait. Complète les FX
  // procéduraux (spellBurst…) pour les sorts dotés d'un art dédié.
  // `src` fourni par spellSplashSrc() (item-icons.js) ; no-op si absent.
  // reduced-motion : fade sans dilatation (géré en CSS).
  function spellSplash(targetKey, src) {
    if (!src) return;
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(targetKey);
    if (!pos) return;
    const img = document.createElement('img');
    img.className = 'cfx-spell-splash';
    img.alt = '';
    img.src = src;
    img.style.left = pos.x + 'px';
    img.style.top  = pos.y + 'px';
    layer.appendChild(img);
    setTimeout(() => img.remove(), 780);
  }

  // ── Secousse globale de l'overlay ─────────────────────────────
  // intensity : 'light' | 'heavy' (défaut 'light'). No-op en reduced-motion
  // (la règle CSS neutralise l'animation, mais on évite aussi le reflow).
  let _shakeTimer = null;
  function shake(intensity) {
    const ov = overlay();
    if (!ov || prefersReducedMotion()) return;
    const cls = intensity === 'heavy' ? 'cfx-shake-heavy' : 'cfx-shake-light';
    ov.classList.remove('cfx-shake-light', 'cfx-shake-heavy');
    // Force un reflow pour pouvoir rejouer l'animation si déjà appliquée.
    void ov.offsetWidth;
    ov.classList.add(cls);
    clearTimeout(_shakeTimer);
    _shakeTimer = setTimeout(() => ov.classList.remove(cls), 450);
  }

  // ── Cinématique d'apparition de boss (epic) ───────────────────
  // Affiche une carte-titre « souls-like » : assombrissement + nom + sous-
  // titre, puis fade. Purement décoratif — le combat reste interactif en
  // dessous (l'overlay ne bloque pas les clics au-delà de sa durée).
  function bossIntro(enemy) {
    if (!enemy || !enemy.epic) return;
    const ov = overlay();
    if (!ov) return;
    // Évite les doublons (un seul boss-intro à la fois).
    const old = document.getElementById('cfx-boss-intro');
    if (old) old.remove();

    const sub = enemy.title || enemy.category || 'Présence majeure';
    const name = enemy.name || 'Boss';
    const wrap = document.createElement('div');
    wrap.id = 'cfx-boss-intro';
    wrap.className = 'cfx-boss-intro';
    wrap.innerHTML =
      `<div class="cfx-boss-veil"></div>` +
      `<div class="cfx-boss-card">` +
        `<div class="cfx-boss-sub">— ${sub} —</div>` +
        `<div class="cfx-boss-name">${name}</div>` +
        `<div class="cfx-boss-rule"></div>` +
      `</div>`;
    ov.appendChild(wrap);

    const dur = prefersReducedMotion() ? 1100 : 1800;
    setTimeout(() => {
      wrap.classList.add('cfx-fade-out');
      setTimeout(() => wrap.remove(), 450);
    }, dur);
  }

  // ── Transition d'entrée en combat (non-boss) ─────────────────
  // Flash radial chaud + léger zoom à l'ouverture de l'overlay, pour que le
  // combat « surgisse » au lieu d'apparaître sèchement. Élément dédié
  // (#cfx-combat-flash) auto-retiré après l'anim — n'altère pas le transform
  // de l'overlay (donc ne clashe pas avec shake). Appelé par startBattle
  // UNIQUEMENT pour les combats non-epic (les boss ont déjà bossIntro).
  function combatStart() {
    const ov = overlay();
    if (!ov) return;
    const old = document.getElementById('cfx-combat-flash');
    if (old) old.remove();
    const flash = document.createElement('div');
    flash.id = 'cfx-combat-flash';
    flash.className = 'cfx-combat-flash';
    ov.appendChild(flash);
    const dur = prefersReducedMotion() ? 280 : 500;
    setTimeout(() => flash.remove(), dur);
  }

  // ── Flash de dégâts encaissés (D3) ───────────────────────────
  // Voile rouge radial bref quand le groupe encaisse un gros coup. Élément
  // dédié (#cfx-hurt-flash) dans l'overlay de combat, auto-retiré après
  // l'anim. `intensity` (0..1) module l'alpha du voile via la custom prop
  // --hurt-a. Sous float-dmg (z 38) pour laisser lire les chiffres. Aucune
  // mécanique touchée — purement visuel. reduced-motion = fade très court.
  function hurtFlash(intensity) {
    const ov = overlay();
    if (!ov) return;
    const i = Math.max(0, Math.min(1, typeof intensity === 'number' ? intensity : 0.5));
    const old = document.getElementById('cfx-hurt-flash');
    if (old) old.remove();
    const flash = document.createElement('div');
    flash.id = 'cfx-hurt-flash';
    flash.className = 'cfx-hurt-flash';
    flash.style.setProperty('--hurt-a', (0.30 + i * 0.45).toFixed(2)); // 0.30..0.75
    ov.appendChild(flash);
    const dur = prefersReducedMotion() ? 200 : 460;
    setTimeout(() => flash.remove(), dur);
  }

  // ── Flash de statut (E2) : pulse coloré bref sur la carte affligée ─
  // Appelé par battle.js — applyStatus au moment de la POSE (pas au tick).
  // Couleur + emoji dérivés de STATUS_DEFS[statusId] (lu au runtime, défensif :
  // fallback neutre si absent). Anneau qui se dilate + glyphe du statut.
  // reduced-motion : le glyphe/anneau fadent sans dilatation (via CSS).
  function statusFlash(targetKey, statusId) {
    const layer = ensureFxLayer();
    if (!layer) return;
    const pos = anchorFor(targetKey);
    if (!pos) return;
    const def = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS && STATUS_DEFS[statusId])
      ? STATUS_DEFS[statusId] : null;
    const color = (def && def.color) || '#d9a521';
    const glyph = (def && def.icon)  || '✦';

    const ring = document.createElement('div');
    ring.className = 'cfx-status-ring';
    ring.style.left = pos.x + 'px';
    ring.style.top  = pos.y + 'px';
    ring.style.setProperty('--cfx-status-color', color);
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 620);

    const g = document.createElement('div');
    g.className = 'cfx-status-glyph';
    g.textContent = glyph;
    g.style.left = pos.x + 'px';
    g.style.top  = pos.y + 'px';
    g.style.color = color;
    layer.appendChild(g);
    setTimeout(() => g.remove(), 680);
  }

  // ── Télégraphe du tour ennemi (G3) ───────────────────────────
  // Bref wind-up (échelle + lueur ~280 ms) sur la carte de l'ennemi qui
  // s'apprête à agir, pour que ses attaques semblent intentionnelles.
  // Classe CSS transitoire posée sur #enemy-card-N, retirée après l'anim.
  // Purement visuel : ne touche aucune mécanique ni timing du tour ennemi.
  // reduced-motion → no-op (pas de mouvement préparatoire).
  function telegraph(enemyIdx) {
    if (prefersReducedMotion()) return;
    const card = document.getElementById('enemy-card-' + enemyIdx);
    if (!card) return;
    card.classList.remove('cfx-telegraph');
    void card.offsetWidth; // reflow → permet de rejouer l'animation
    card.classList.add('cfx-telegraph');
    setTimeout(() => card.classList.remove('cfx-telegraph'), 320);
  }

  // ── Pétrification de la mort (hors Ironman) — C2 ─────────────
  // Overlay plein écran qui désature + givre la scène avant le death-screen.
  // backdrop-filter (grayscale + brightness) ramping + givre en box-shadow
  // inset. z-index 880 (sous #death-screen 900) ; bouclier de clics. Retourne
  // la durée (ms) à attendre avant d'afficher l'écran de mort — 0 en
  // reduced-motion (ne ralentit pas la mort) ou si rien n'a pu être monté.
  function petrify() {
    if (!document.body) return 0;
    if (prefersReducedMotion()) return 0;
    const old = document.getElementById('cfx-petrify');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'cfx-petrify';
    el.className = 'cfx-petrify';
    document.body.appendChild(el);
    const DUR = 1100;
    setTimeout(() => el.remove(), DUR + 250); // retiré une fois death-screen au-dessus
    return DUR;
  }

  window.CombatFX = { spellBurst, premiumCast, deathDissolve, castFlash, lootPop, healBurst, buffAura, spellSplash, shake, bossIntro, combatStart, hurtFlash, statusFlash, telegraph, petrify };
})();

// Helper défensif (calqué sur UX_safe) : CFX_safe.foo(...) appelle
// window.CombatFX.foo si présent, sinon no-op silencieux.
if (typeof window.CFX_safe === 'undefined') {
  window.CFX_safe = new Proxy({}, {
    get(_t, prop) {
      return (typeof window.CombatFX !== 'undefined' && window.CombatFX
              && typeof window.CombatFX[prop] === 'function')
        ? window.CombatFX[prop].bind(window.CombatFX)
        : () => undefined;
    }
  });
}
