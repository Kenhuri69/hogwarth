// js/balance-log.js — Logger d'équilibrage in-game `BALANCE_DEBUG` (Ch.13 P4,
// docs/histoire/13-equilibre-difficulte-progression.md §13.9.H).
//
// OPT-IN, LOCAL et ANONYME : aucune collecte automatique, aucun réseau.
// Activé par `localStorage.hogwarts_balance_debug = '1'`. Tant que le flag est
// absent, `BalanceLog.record(...)` est un NO-OP total — le jeu se comporte à
// l'identique. 100 % additif, instrumentation pure (aucune valeur d'équilibrage
// touchée). Chargé tardivement et défensif : tout est gardé en try/catch.
//
// Schéma persisté (`hogwarts_rpg_balance_log`) = colonnes de `sim-difficulty.js`
// §3 : étage, mode, niveau, tours, PV restants, issue. L'export reconstruit les
// métriques canoniques de §13.9.G (synergyUsageRate, loopDepthMedian,
// deathRatePerFloor, averageClearTime) pour superposer sim et terrain.

(function () {
  'use strict';

  const FLAG_KEY  = 'hogwarts_balance_debug';
  const STORE_KEY = 'hogwarts_rpg_balance_log';
  const SCHEMA_V  = 1;

  function enabled() {
    try { return localStorage.getItem(FLAG_KEY) === '1'; }
    catch (e) { return false; }
  }

  // Niveau attendu par étage — table figée `DIFFICULTY_REPORT.md §1` (miroir de
  // la sortie sim §1). Index 0 inutilisé ; étages 1..12. Au-delà (Boucle), une
  // extrapolation douce ~+1 niveau/étage suffit pour `underLevelGap`.
  const EXPECTED_LEVEL = {
    Solo: [0, 1, 2, 5, 6, 8, 8, 9, 9, 10, 10, 11, 11],
    Duo:  [0, 1, 2, 5, 7, 8, 8, 9, 10, 10, 11, 11, 12],
  };
  function expectedLevel(floor, mode) {
    const t = EXPECTED_LEVEL[mode] || EXPECTED_LEVEL.Solo;
    const f = Math.max(1, floor | 0);
    if (f <= 12) return t[f] || 1;
    return t[12] + (f - 12); // extrapolation Boucle
  }

  function emptyStore() {
    return {
      v: SCHEMA_V,
      startedAt: new Date().toISOString(),
      battles: [],          // {floor, mode, level, turns, hpPct, outcome, underLevelGap?, cause?}
      spellCasts: 0,        // nb de sorts offensifs lancés sur un ennemi
      weaknessExploits: 0,  // dont ceux qui exploitent une faiblesse élémentaire
      loopDepths: [],       // étage atteint à chaque descente (goDeeper)
      floorClearTimes: [],  // {floor, ms} — temps réel passé sur l'étage quitté
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyStore();
      const obj = JSON.parse(raw);
      if (!obj || obj.v !== SCHEMA_V || !Array.isArray(obj.battles)) return emptyStore();
      return obj;
    } catch (e) { return emptyStore(); }
  }
  function persist(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { /* quota / mode privé : silencieux */ }
  }

  // ── helpers de lecture du runtime (tous défensifs) ──────────
  function modeLabel() {
    return (typeof partySize !== 'undefined' && partySize === 2) ? 'Duo' : 'Solo';
  }
  function curFloor(fallback) {
    return (typeof currentFloor === 'number') ? currentFloor : (fallback || 0);
  }
  function curLevel() {
    return (typeof player !== 'undefined' && player && player.level) ? player.level : 1;
  }
  function curTurns() {
    return (typeof battleTurn === 'number') ? battleTurn : 0;
  }
  function partyHpPct() {
    try {
      if (typeof party === 'undefined') return null;
      const n = (typeof partySize !== 'undefined') ? partySize : 1;
      let hp = 0, max = 0;
      for (const c of party.slice(0, n)) { hp += Math.max(0, c.hp || 0); max += (c.hpMax || 0); }
      return max > 0 ? Math.round(100 * hp / max) : null;
    } catch (e) { return null; }
  }

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }
  let _floorEnterAt = now(); // marqueur de temps de run d'étage

  // ── API principale ──────────────────────────────────────────
  // record(event, payload) — NO-OP si le flag est absent.
  //   'battle'  {turns?, hpPct?, outcome}  — endBattle (win/flee)
  //   'death'   {cause?, turns?}           — triggerDeath (issue=death)
  //   'spell'   {exploitedWeakness}        — castSpellInBattle (synergyUsageRate)
  //   'descend' {prevFloor}                — goDeeper (loopDepthMedian / averageClearTime)
  function record(event, payload) {
    if (!enabled()) return;
    payload = payload || {};
    let store;
    try { store = load(); } catch (e) { return; }

    const floor = curFloor(payload.floor);
    const mode  = modeLabel();
    const level = curLevel();

    switch (event) {
      case 'battle':
        store.battles.push({
          floor, mode, level,
          turns:   (typeof payload.turns === 'number') ? payload.turns : curTurns(),
          hpPct:   (payload.hpPct != null) ? payload.hpPct : partyHpPct(),
          outcome: payload.outcome || 'win',
        });
        break;
      case 'death':
        store.battles.push({
          floor, mode, level,
          turns:   (typeof payload.turns === 'number') ? payload.turns : curTurns(),
          hpPct:   0,
          outcome: 'death',
          underLevelGap: level - expectedLevel(floor, mode),
          cause:   payload.cause || '',
        });
        break;
      case 'spell':
        store.spellCasts += 1;
        if (payload.exploitedWeakness) store.weaknessExploits += 1;
        break;
      case 'descend': {
        store.loopDepths.push(floor);
        const elapsed = now() - _floorEnterAt;
        if (elapsed > 0 && payload.prevFloor) {
          store.floorClearTimes.push({ floor: payload.prevFloor, ms: Math.round(elapsed) });
        }
        _floorEnterAt = now();
        break;
      }
      default:
        return;
    }
    try { persist(store); } catch (e) { /* silencieux */ }
  }

  // ── Métriques dérivées (noms canoniques §13.9.G) ────────────
  function median(arr) {
    if (!arr || !arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function mean(arr) {
    if (!arr || !arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function summary(store) {
    store = store || load();
    const battles = store.battles || [];
    // deathRatePerFloor : part des combats terminés par une mort, par étage.
    const perFloor = {};
    for (const b of battles) {
      const f = b.floor;
      (perFloor[f] = perFloor[f] || { n: 0, d: 0 }).n++;
      if (b.outcome === 'death') perFloor[f].d++;
    }
    const deathRatePerFloor = {};
    for (const f in perFloor) deathRatePerFloor[f] = perFloor[f].d / perFloor[f].n;

    const clearTurns = battles.map(b => b.turns).filter(t => t > 0);
    return {
      synergyUsageRate: store.spellCasts ? store.weaknessExploits / store.spellCasts : 0,
      loopDepthMedian:  median(store.loopDepths || []),
      deathRatePerFloor,
      averageClearTime: mean(clearTurns),                                   // en tours (col. sim §3)
      averageFloorTimeMs: mean((store.floorClearTimes || []).map(o => o.ms)), // temps réel (bonus)
      battleCount: battles.length,
      deathCount:  battles.filter(b => b.outcome === 'death').length,
      spellCasts:  store.spellCasts || 0,
    };
  }

  // ── Export manuel : JSON → presse-papiers (jamais automatique) ──
  function exportLogs() {
    const store = load();
    const out = {
      schema: SCHEMA_V,
      exportedAt: new Date().toISOString(),
      metrics: summary(store),
      store,
    };
    const json = JSON.stringify(out, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(
          () => { if (typeof addMsg === 'function') addMsg('Logs d\'équilibrage copiés dans le presse-papiers.', 'good'); },
          () => { /* presse-papiers refusé : on a quand même le retour ci-dessous */ }
        );
      }
    } catch (e) { /* environnement sans clipboard (file://, headless) */ }
    try { console.log('[BalanceLog] export:\n' + json); } catch (e) { /* ignore */ }
    return json;
  }

  function clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    _floorEnterAt = now();
  }

  // ── Bouton debug flottant — injecté UNIQUEMENT si le flag est on ──
  function _injectDebugButton() {
    if (!enabled()) return;
    try {
      if (document.getElementById('balance-log-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'balance-log-btn';
      btn.type = 'button';
      btn.textContent = '⚖️ Export logs';
      btn.title = 'Exporter mes logs d\'équilibrage (BALANCE_DEBUG) — JSON copié dans le presse-papiers';
      btn.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;' +
        'font:12px system-ui,sans-serif;padding:5px 9px;border-radius:6px;' +
        'background:#2a1d0e;color:#e8c873;border:1px solid #6b5220;opacity:0.82;cursor:pointer';
      btn.addEventListener('click', exportLogs);
      document.body.appendChild(btn);
    } catch (e) { /* DOM indisponible : silencieux */ }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _injectDebugButton);
    } else {
      _injectDebugButton();
    }
  }

  window.BalanceLog = {
    record,
    export: exportLogs,
    summary,
    enabled,
    clear,
    _expectedLevel: expectedLevel, // exposé pour les tests purs
  };
})();
