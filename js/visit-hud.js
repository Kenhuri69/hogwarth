// ============================================================
// MONDES PARALLÈLES — HUD de visite (V1a Phase C.3)
// ============================================================
// Bandeau fixe affiché pendant qu'on visite le monde d'un autre joueur.
// Pose le contexte (pseudo, blason, étage) et expose le bouton de
// sortie volontaire — sans ce dernier, le visiteur serait coincé tant
// que le host ne ferme pas la cheminée.
//
// Surface publique :
//   showVisitHud(opts)   → afficher (appel à l'ouverture)
//   updateVisitHud(opts) → patch incrémental (étage, position)
//   hideVisitHud()       → masquer (sortie / bye reçu)
//
// Cf. .claude/plans/parallel-worlds.md §3.4 / §4.5.
// ============================================================

(function () {
  'use strict';

  const HUD_ID     = 'visit-hud';
  const NAME_ID    = 'visit-hud-name';
  const META_ID    = 'visit-hud-meta';
  const EXIT_ID    = 'visit-hud-exit';
  const EMOTES_ID  = 'visit-hud-emotes';
  const QUALITY_ID = 'visit-hud-quality';
  const QUALITY_LABEL = {
    good:     { label: 'Stable',     title: 'Connexion stable' },
    degraded: { label: 'Instable',   title: 'Le partenaire ne répond plus — tentative de reconnexion…' },
    lost:     { label: 'Rompue',     title: 'Connexion perdue — sortie en cours' },
  };
  const EXIT_LABEL = {
    visitor: 'Quitter ce monde',
    host:    'Refermer la cheminée',
  };

  const HOUSE_CREST = {
    Gryffondor:  '🦁',
    Serpentard:  '🐍',
    Serdaigle:   '🦅',
    Poufsouffle: '🦡'
  };

  // Échappement HTML unifié (window.htmlEscape, js/html-escape.js chargé tôt).
  const _esc = window.htmlEscape;

  function showVisitHud(opts) {
    const o = opts || {};
    const hud = document.getElementById(HUD_ID);
    if (!hud) return false;
    const nameEl = document.getElementById(NAME_ID);
    const metaEl = document.getElementById(META_ID);
    if (nameEl) {
      const crest = HOUSE_CREST[o.hostHouse] || '🌀';
      nameEl.innerHTML = `${crest} <span class="visit-hud-host">${_esc(o.hostName || 'Sorcier')}</span>`;
    }
    if (metaEl) {
      const parts = [];
      if (o.hostHouse) parts.push(_esc(o.hostHouse));
      if (typeof o.floor === 'number') parts.push(`Étage ${o.floor}`);
      metaEl.textContent = parts.join(' · ');
    }
    _renderEmotes(o.role || 'visitor');
    const exitEl = document.getElementById(EXIT_ID);
    if (exitEl) {
      const label = EXIT_LABEL[o.role] || EXIT_LABEL.visitor;
      exitEl.textContent = label;
      exitEl.setAttribute('title', label);
    }
    hud.classList.add('active');
    hud.setAttribute('aria-hidden', 'false');
    // V1c.1 — applique l'aura cosmétique active sur le HUD (CSS
    // variable --om-aura déjà posée par _applyCosmeticVisuals).
    if (typeof outremondeActiveAura !== 'undefined' && outremondeActiveAura) {
      hud.classList.add('aura-on');
    } else {
      hud.classList.remove('aura-on');
    }
    return true;
  }

  // Phase D §6.7 — rend les boutons d'emote dans le bandeau, banque
  // déterminée par le rôle. Bouton désactivé si la surface globale n'a
  // pas chargé (visit-channel.js absent ou pas encore initialisé).
  function _renderEmotes(role) {
    const host = document.getElementById(EMOTES_ID);
    if (!host) return;
    const banque = (role === 'host')
      ? (typeof window !== 'undefined' ? (window.HOST_EMOTES || {}) : {})
      : (typeof window !== 'undefined' ? (window.VISITOR_EMOTES || {}) : {});
    const keys = Object.keys(banque);
    if (keys.length === 0) { host.innerHTML = ''; return; }
    host.innerHTML = keys.map(k => {
      const def = banque[k];
      const title = _esc(def.text || k);
      return `<button class="visit-hud-emote" type="button"
                onclick="_visitHudEmote('${_esc(k)}')"
                title="${title}" aria-label="${title}">${_esc(def.icon || k)}</button>`;
    }).join('');
  }

  // Handler partagé par tous les boutons d'emote — délègue à visit-channel.
  async function _visitHudEmote(kind) {
    if (typeof window === 'undefined') return;
    if (typeof window._visitSendEmote !== 'function') return;
    try { await window._visitSendEmote(kind); } catch (e) { /* tolérant */ }
  }

  // Phase G §6.8 — handler du bouton "Défier l'écho".
  function _visitHudAstralFight() {
    if (typeof window === 'undefined') return;
    if (typeof window.engageAstralCombat !== 'function') return;
    window.engageAstralCombat();
  }

  // Phase G §6.8 — synchronise le bouton de défi avec l'état runtime.
  // `opts` = { visible:bool, canEngage:bool, remaining:int }.
  function updateAstralFightButton(opts) {
    const btn = document.getElementById('visit-hud-astral');
    if (!btn) return false;
    const o = opts || {};
    if (!o.visible) {
      btn.style.display = 'none';
      return true;
    }
    btn.style.display = '';
    btn.disabled = !o.canEngage;
    const counter = document.getElementById('visit-hud-astral-counter');
    if (counter) counter.textContent = `${o.remaining || 0}/3`;
    if (o.remaining === 0) {
      btn.title = 'Limite atteinte (3 défis par étage)';
    } else if (!o.canEngage) {
      btn.title = 'Cellule déjà dissipée — déplace-toi pour défier ailleurs';
    } else {
      btn.title = `Défier un écho ici (${o.remaining || 0}/3 restants sur cet étage)`;
    }
    return true;
  }

  function updateVisitHud(opts) {
    const hud = document.getElementById(HUD_ID);
    if (!hud || !hud.classList.contains('active')) return false;
    return showVisitHud(opts);
  }

  function hideVisitHud() {
    const hud = document.getElementById(HUD_ID);
    if (!hud) return false;
    hud.classList.remove('active');
    hud.setAttribute('aria-hidden', 'true');
    // Reset du badge à l'état "good" pour qu'une prochaine visite parte
    // d'un visuel propre sans flash résiduel.
    updateVisitQualityBadge('good');
    return true;
  }

  // Phase F (§F.4) — met à jour le badge de qualité réseau. `quality` ∈
  // 'good' | 'degraded' | 'lost'. No-op silencieux si le badge n'est pas
  // dans le DOM (compat tests qui n'incluent pas le bandeau complet).
  function updateVisitQualityBadge(quality) {
    const el = document.getElementById(QUALITY_ID);
    if (!el) return false;
    const def = QUALITY_LABEL[quality] || QUALITY_LABEL.good;
    el.setAttribute('data-quality', quality);
    el.setAttribute('title', def.title);
    const labelEl = el.querySelector('.visit-hud-quality-label');
    if (labelEl) labelEl.textContent = def.label;
    return true;
  }

  // Handler du bouton de sortie. Délègue à mpExitVisit qui s'occupe de
  // poster le 'bye', stopper le poll, et restaurer la save d'origine.
  async function _visitHudExit() {
    if (typeof window === 'undefined') return;
    if (typeof window.mpExitVisit !== 'function') return;
    try { await window.mpExitVisit('voluntary'); } catch (e) { /* tolérant */ }
  }

  if (typeof window !== 'undefined') {
    window.showVisitHud            = showVisitHud;
    window.updateVisitHud          = updateVisitHud;
    window.hideVisitHud            = hideVisitHud;
    window._visitHudExit           = _visitHudExit;
    window._visitHudEmote          = _visitHudEmote;
    window.updateVisitQualityBadge = updateVisitQualityBadge;
    window._visitHudAstralFight    = _visitHudAstralFight;
    window.updateAstralFightButton = updateAstralFightButton;
  }
})();
