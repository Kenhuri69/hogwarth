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

  function prefersReducedMotion() {
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

  window.CombatFX = { spellBurst, healBurst, buffAura, shake, bossIntro, combatStart, hurtFlash, petrify };
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
