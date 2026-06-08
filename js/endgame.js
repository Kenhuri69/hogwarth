// ============================================================
// ENDGAME — Trigger de victoire & cinématique
// ============================================================
// Cycle :
//   battle.js — endBattle(true)
//     └─ enemyGroup.forEach(e => safeCall('checkVictoryTrigger', e.id))
//        ├─ ignore si monstre ≠ 'voldemort_revenu'
//        ├─ ignore si déjà déclenché (`victoryAchieved === true`)
//        └─ sinon : mute le flag, persiste, invalide les patterns
//                    pour la bascule textures Ténèbres §7.1bis, et
//                    affiche la modale.
//
// La modale est non bloquante (C1 du plan) :
//   Continuer        → close + addMsg narratif
//   Retour au menu   → autoSave puis remontée vers le hub de saves
//
// Voir ENDGAME_PLAN.md §3-§6.

(function () {
  // A1 — sting audio de victoire : garde-fou d'idempotence. La modale peut
  // être ré-affichée (double trigger défensif) ; le son ne doit jouer qu'à
  // la première ouverture.
  let _victoryStingPlayed = false;

  function _humanizeDuration(ms) {
    if (!ms || ms < 0) return '—';
    const sec = Math.floor(ms / 1000);
    const h   = Math.floor(sec / 3600);
    const m   = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
    return `${m} min`;
  }

  function _totalKills() {
    if (typeof floorKillCount === 'undefined' || !floorKillCount) return 0;
    let n = 0;
    for (const v of floorKillCount.values()) n += v || 0;
    return n;
  }

  function _findVictoryStartedAt() {
    // Best-effort : on lit l'auto-save courante pour récupérer son `savedAt`
    // initial. Sinon on retombe sur "—".
    try {
      const slot = (typeof readSlot === 'function') ? readSlot('auto') : null;
      return slot && slot.meta && slot.meta.savedAt ? new Date(slot.meta.savedAt) : null;
    } catch (e) { return null; }
  }

  // Hook appelé depuis battle.js — endBattle pour chaque ennemi tombé.
  // No-op si l'id n'est pas Voldemort Ressuscité ou si déjà déclenché (C4).
  window.checkVictoryTrigger = function checkVictoryTrigger(monsterId) {
    if (monsterId !== 'voldemort_revenu') return false;
    if (typeof victoryAchieved !== 'undefined' && victoryAchieved) return false;

    victoryAchieved = true;
    victoryAt       = new Date().toISOString();

    // Force le re-render du donjon avec les textures Ténèbres (§7.1bis)
    // au prochain pas. Indépendant du floor courant : un trigger à
    // floor 10 ne change rien visuellement, mais à floor 11+ on bascule.
    if (typeof _invalidatePatternCache === 'function') _invalidatePatternCache();
    if (typeof drawDungeon === 'function') drawDungeon();

    // Autosave dédiée : raison `victory` (échappe au throttling
    // par-raison qui groupe les saves indépendantes).
    if (typeof autoSave === 'function') autoSave('victory');

    window.showVictoryScreen();
    return true;
  };

  // Affiche la modale. Peut être appelée plusieurs fois sans crash —
  // idempotente.
  window.showVictoryScreen = function showVictoryScreen() {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    const titleEl = document.getElementById('victory-title');
    const subEl   = document.getElementById('victory-sub');
    const recap   = document.getElementById('victory-recap');
    const speech  = document.getElementById('victory-speech');

    if (titleEl) titleEl.textContent = "L'Ombre s'efface";
    if (subEl)   subEl.textContent   = 'Vous avez vaincu Lord Voldemort.';

    if (recap) {
      const startedAt = _findVictoryStartedAt();
      const duration  = startedAt ? _humanizeDuration(Date.now() - startedAt.getTime()) : '—';
      const lvl       = (typeof player !== 'undefined' && player.level) || 1;
      const floor     = (typeof currentFloor !== 'undefined') ? currentFloor : '—';
      const kills     = _totalKills();
      const house     = (typeof chosenHouse !== 'undefined' && chosenHouse) || '—';
      const pts       = (typeof housePoints !== 'undefined') ? housePoints : 0;
      recap.innerHTML = `
        <div class="victory-recap-line">Étage atteint&nbsp;: <b>${floor}</b></div>
        <div class="victory-recap-line">Niveau du groupe&nbsp;: <b>${lvl}</b></div>
        <div class="victory-recap-line">Créatures vaincues&nbsp;: <b>${kills}</b></div>
        <div class="victory-recap-line">Maison&nbsp;: <b>${house}</b> · <b>${pts}</b> pts</div>
        <div class="victory-recap-line victory-recap-time">Temps de session&nbsp;: <b>${duration}</b></div>
      `;
    }

    if (speech) {
      // Réplique post-victoire conditionnée par le Pacte des Cachots
      // (08 §8.8.1) : si le joueur a scellé le pacte de Salazar, Dumbledore
      // est plus froid — une mise en garde au lieu d'un éloge.
      const pactCold = (typeof slythPactChoice !== 'undefined' && slythPactChoice === 'pact')
        ? `<p class="victory-speech-cold"><em>« Tu as gagné. Veille seulement à
            rester celui qui parle — et non celui à qui l'on parle. »</em></p>`
        : '';
      speech.innerHTML = `
        « Vous avez fait ce que même les plus grands sorciers n'auraient
        osé tenter. La nuit la plus sombre cède, enfin, devant votre
        courage. Le château ne sera plus jamais le même — mais quelques
        ombres rôdent encore, plus profondément, là où la magie est plus
        ancienne. <em>L'escalier le plus profond, scellé par la peur,
        s'ouvre enfin.</em> »
        ${pactCold}
        <div class="victory-speech-sign">— Albus Dumbledore</div>
      `;
    }

    modal.style.display = 'flex';
    // A1 — sting audio de victoire : joué uniquement à la première ouverture.
    // Call-site défensif (reduced-motion ne s'applique pas à l'audio).
    if (!_victoryStingPlayed) {
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playVictory) AudioSystem.playVictory();
      _victoryStingPlayed = true;
    }
    // Cinématique de victoire (Lot 3) : halo doré + pluie de lumière.
    // Défensif + no-op sous reduced-motion (voir js/cinematics.js).
    if (window.CIN_safe) window.CIN_safe.victoryFlourish();
  };

  // Close — bouton "Continuer l'aventure". Idempotent (double-click safe).
  window.closeVictoryScreen = function closeVictoryScreen() {
    if (window.CIN_safe) window.CIN_safe.stop();
    const modal = document.getElementById('victory-modal');
    if (modal) modal.style.display = 'none';
    if (typeof addMsg === 'function') {
      addMsg('Le château recèle encore des mystères…', 'magic');
    }
  };

  // Retour au hub. autoSave d'abord pour ne pas perdre l'état (le hub
  // recharge depuis les slots, donc on doit avoir poussé une sauvegarde
  // à jour). Reset minimal de l'UI pour repasser au hub.
  window.returnToMenuFromVictory = function returnToMenuFromVictory() {
    if (window.CIN_safe) window.CIN_safe.stop();
    if (typeof autoSave === 'function') autoSave('victory-return');
    const modal = document.getElementById('victory-modal');
    if (modal) modal.style.display = 'none';
    // Hub fait son travail (liste les slots, masque le reste)
    if (typeof enterStartHub === 'function') {
      const gc = document.getElementById('game-container');
      if (gc) gc.style.display = 'none';
      enterStartHub();
    }
  };
})();
