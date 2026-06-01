// ============================================================
// COMBAT — Mort, résurrection & résolution du combat astral
// ============================================================
// _finishAstralCombat (Mondes Parallèles §6.8), triggerDeath (pétrification /
// Ironman / résurrection auto), resurrect. Chargé APRÈS battle.js.
// ============================================================
// ── Mort et résurrection ─────────────────────────────────────
// ── Mondes parallèles Phase G §6.8 — résolution combat astral ───────
// Victoire :
//   • Pas d'XP, pas d'or sur player.gold, pas de drops standards.
//   • Essence d'Outremonde gagnée selon la formule §6.10 :
//     `1 + floor(monsterLevel/3)` par écho vaincu, où monsterLevel est
//     soit `_level` (posé par buildEcho), soit le niveau du player en repli.
//   • Marque la cellule courante comme "dissipée" pour la visite et
//     incrémente le compteur d'étage (limite 3/étage côté §6.8).
// Défaite :
//   • Pas de triggerDeath, pas de pétrification.
//   • Restaure HP/SP du visiteur à 100 % (le combat reste isolé).
//   • Pose le cooldown 5 min sur `Apparition Astrale`
//     (`astralExileCooldownUntil`).
//   • Sort de la visite via `mpExitVisit('astral-defeat')` — la save
//     d'origine est restaurée par `_restoreFromVisit`.
function _finishAstralCombat(won) {
  // Reset du flag global : on quitte le mode astral immédiatement quelle
  // que soit l'issue, pour que les hooks (autoSave / hostNotify / etc.)
  // qui pourraient s'exécuter en aval reviennent au comportement normal.
  inAstralCombat = false;

  if (won) {
    let totalEss = 0;
    if (Array.isArray(enemyGroup)) {
      enemyGroup.forEach(e => {
        const lvl = (typeof e._level === 'number') ? e._level
                  : (typeof e.level  === 'number') ? e.level
                  : (typeof player !== 'undefined' && player.level) || 1;
        totalEss += 1 + Math.floor(lvl / 3);
      });
    }
    if (typeof outremondeEssence === 'number') outremondeEssence += totalEss;
    // V1c.1 — métriques cross-plan : un écho dissipé compte par
    // monstre vaincu (les groupes de 2-3 échos sont rares mais comptés
    // individuellement). Déclenche le check des souvenirs.
    if (typeof outremondeMetrics !== 'undefined' && outremondeMetrics
        && Array.isArray(enemyGroup)) {
      outremondeMetrics.echosDefeated += enemyGroup.length;
    }
    if (typeof _checkSouvenirs === 'function') _checkSouvenirs();

    // Marque la cellule + incrémente compteur d'étage (visite courante).
    if (typeof astralCellsDefeated !== 'undefined' && astralCellsDefeated) {
      astralCellsDefeated.add(`${playerX},${playerY}`);
    }
    if (typeof astralFloorKills === 'number') astralFloorKills++;

    AudioSystem.playVictory();
    setNarrative(`Écho dissipé. +${totalEss} ✨ Essence d'Outremonde.`);
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/essence_outremonde.png" alt=""> +${totalEss} Essence d'Outremonde (total : ${outremondeEssence}).`, 'magic');

    if (typeof updateUI === 'function') updateUI();
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon   === 'function') drawDungeon();
    if (typeof window !== 'undefined' && typeof window._refreshAstralButton === 'function') {
      window._refreshAstralButton();
    }
    return;
  }

  // Défaite astrale — éjection.
  AudioSystem.playDeath();
  // V1c.1 — Sceau du Voyageur : si un membre du groupe connaît le sort,
  // l'ancrage astral neutralise le cooldown 5 min. C'est l'unique effet
  // mécanique du Sceau (sort passif, identifié par sa présence dans
  // player.spells / party[].spells).
  const heroHasSeal = typeof party !== 'undefined' && Array.isArray(party)
    && party.some(c => c && Array.isArray(c.spells) && c.spells.includes('Sceau du Voyageur'));
  if (heroHasSeal) {
    if (typeof addMsg === 'function') {
      addMsg('🪬 Le Sceau du Voyageur absorbe le choc — aucun cooldown.', 'magic');
    }
    // Pas de cooldown posé. astralExileCooldownUntil reste à sa valeur
    // précédente (0 ou expirée).
  } else {
    // Cooldown 5 min sur le sort de portail (anti-flood de retentatives).
    // Persiste dans la save d'origine restaurée par _restoreFromVisit puisque
    // la save du visiteur a été capturée AVANT la visite — le cooldown qu'on
    // pose ici n'y est pas. On le pose donc directement dans mySavedState
    // pour qu'il survive à la restauration.
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    if (typeof visitSession !== 'undefined' && visitSession
        && visitSession.role === 'visitor' && visitSession.mySavedState) {
      visitSession.mySavedState.astralExileCooldownUntil = cooldownUntil;
    }
    astralExileCooldownUntil = cooldownUntil;
  }

  setNarrative('Ton lien astral vacille — tu retournes dans ton monde.');
  addMsg('💫 Ton lien astral vacille — tu retournes dans ton monde.', 'bad');

  // Sortie via mpExitVisit — restaure la save d'origine (HP/SP + or + tout).
  if (typeof mpExitVisit === 'function') {
    // Tolérant : un échec de poste 'bye' ne doit pas empêcher la sortie locale.
    Promise.resolve(mpExitVisit('astral-defeat')).catch(() => {});
  }
}

function triggerDeath(msg) {
  // Phase G §6.8 — combat astral : pas de pétrification, pas d'Ironman.
  // Bascule vers _finishAstralCombat qui fait l'éjection propre.
  if (typeof inAstralCombat !== 'undefined' && inAstralCombat) {
    // L'overlay combat n'a pas encore été fermé par endBattle (on est dans
    // enemyTurn). On le ferme et reset les flags ici, puis on délègue.
    inBattle = false;
    document.getElementById('encounter-overlay').style.display = 'none';
    document.body.classList.remove('in-battle');
    document.body.classList.remove('in-astral-combat');
    AudioSystem.stopCombatMusic();
    _finishAstralCombat(false);
    return;
  }
  AudioSystem.playDeath();
  // Mode Ironman : la mort est définitive — écran de résultat chiffré
  // + soumission au Hall of Fame, pas de pétrification ni de résurrection.
  if (typeof ironmanMode !== 'undefined' && ironmanMode &&
      typeof showIronmanResult === 'function') {
    showIronmanResult(msg);
    return;
  }
  document.getElementById('death-msg').textContent = msg;
  // Immersion (C2) : pétrification progressive avant l'écran de mort. Purement
  // visuel ; défensif (module absent → dur 0 → écran immédiat) ; reduced-motion
  // → dur 0. Gate strict : on n'arrive ici qu'en mort normale (astral + Ironman
  // sont déjà sortis plus haut).
  const showDeath = () => { document.getElementById('death-screen').style.display = 'flex'; };
  const dur = (typeof CFX_safe !== 'undefined' && CFX_safe.petrify()) || 0;
  if (dur > 0) setTimeout(showDeath, dur);
  else showDeath();
}

function resurrect() {
  // C2 : retire un éventuel voile de pétrification résiduel (sécurité si la
  // résurrection survient avant l'auto-retrait de l'overlay).
  const pet = document.getElementById('cfx-petrify');
  if (pet) pet.remove();
  party.forEach(c => {
    c.hp = Math.floor(c.hpMax / 2);
    c.sp = Math.floor(c.spMax / 2);
  });
  player.gold = Math.floor(player.gold * 0.7);
  document.getElementById('death-screen').style.display = 'none';
  generateDungeon(currentFloor);
  updateLocationDisplay();
  setNarrative("Un Phénix ressuscite le groupe. Vous vous réveillez, meurtris mais vivants.");
  addMsg("Ressuscité !", 'magic');
  renderMinimap();
  drawDungeon();
  updateCompass();
  updateUI();
}

// renderEnemyGroup(), updateBattleCharIndicator(), setBattleLog() → battle-ui.js

