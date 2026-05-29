// ============================================================
// QUESTS — Mini-jeux : fusion du grimoire & énigmes de Dumbledore
// ============================================================
// Établi de fusion (Manon Acte II) + stèle d'énigme de Dumbledore
// (_spawnLuxAeternaBoss). Dépend de quests.js (completeQuest,
// getQuestTemplate) et de state.js (activeQuests). Chargé APRÈS quests.js.
// ============================================================
// ── Établi de fusion du grimoire (Manon Acte II) ─────────────
// Le joueur reconstitue le grimoire de givre de Sandrine à partir des 5
// pages collectées. Cf. .claude/plans/manon-grimoire-pages.md §6.

// Vrai si la quête manon_grimoire est active et les 5 pages réunies.
function _grimoireFusionReady() {
  if (typeof activeQuests === 'undefined') return false;
  if (!activeQuests.some(q => q.id === 'manon_grimoire')) return false;
  const total = (typeof GRIMOIRE_PAGES !== 'undefined') ? GRIMOIRE_PAGES.length : 5;
  const owned = (typeof player !== 'undefined' && Array.isArray(player.grimoirePages))
    ? player.grimoirePages.length : 0;
  return owned >= total;
}

// Ouvre l'établi : les 5 emplacements de page + bouton de fusion.
function openFusionModal() {
  const body  = document.getElementById('fusion-body');
  const modal = document.getElementById('fusion-modal');
  if (!body || !modal) return;
  const pages = (typeof GRIMOIRE_PAGES !== 'undefined') ? GRIMOIRE_PAGES : [];
  const owned = (player && Array.isArray(player.grimoirePages)) ? player.grimoirePages : [];
  let slots = '';
  for (const p of pages) {
    const has = owned.includes(p.id);
    slots += `<div class="brew-tile${has ? '' : ' brew-tile-disabled'}" title="${p.lore}">`
      + `<div class="brew-tile-icon">${p.icon}</div>`
      + `<div class="brew-tile-name">${p.name}</div></div>`;
  }
  const ready = _grimoireFusionReady();
  body.innerHTML = `
    <p style="font-size:12px;color:var(--parchment-dark);line-height:1.5;text-align:center;margin:4px 0 12px">
      Manon dispose les feuillets sur l'établi, près de la fenêtre givrée.
      Le grimoire de sa mère ne demande qu'à redevenir entier.
    </p>
    <div class="brew-tiles" style="justify-content:center">${slots}</div>
    <button type="button" class="brew-launch-btn" style="margin-top:14px"
      onclick="fuseGrimoire()"${ready ? '' : ' disabled'}>
      ✨ Reconstituer le grimoire
    </button>`;
  modal.style.display = 'flex';
}

// Fusionne les pages : remet manon_grimoire (récompense le grimoire
// Tempête de Givre) et vide la besace de pages.
function fuseGrimoire() {
  if (!_grimoireFusionReady()) {
    addMsg('Il te manque encore des pages du grimoire.', 'bad');
    return;
  }
  if (!turnInQuestById('manon_grimoire')) {
    addMsg('La reconstitution a échoué — réessaie.', 'bad');
    return;
  }
  player.grimoirePages = [];
  closeModal('fusion-modal');
  addMsg('📖 Le grimoire de givre de Sandrine est reconstitué !', 'good');
  setNarrative("Les cinq feuillets se ressoudent dans un souffle de givre. Manon serre le grimoire entier contre elle, sans un mot — c'est sa mère qu'elle retrouve, la sorcière, pas la menteuse.");
  updateUI();
}

// ── Épreuve de la Lumière Éternelle — énigmes de Dumbledore ──
// 2ᵉ temps de `dumbledore_lumiere`. Cf. dumbledore-lux-aeterna.md.

// Vrai si l'étape `riddle` est jouable : quête active, collecte (étape
// `item`) faite, énigmes (étape `riddle`) non terminées.
function _riddleStepReady() {
  if (typeof activeQuests === 'undefined') return false;
  const q = activeQuests.find(x => x.id === 'dumbledore_lumiere');
  if (!q) return false;
  const collecte = q.objectives.find(o => o.type === 'item');
  const riddle   = q.objectives.find(o => o.type === 'riddle');
  if (!collecte || !riddle) return false;
  return !!collecte.completed && !riddle.completed;
}

// Ouvre la modale d'énigme sur l'énigme courante (index = progress).
function openRiddleModal() {
  if (typeof _refreshObjectives === 'function') _refreshObjectives();
  if (!_riddleStepReady()) {
    addMsg("Le portrait n'a pas d'énigme pour toi en cet instant.", '');
    return;
  }
  _renderRiddle(null);
  const modal = document.getElementById('riddle-modal');
  if (modal) modal.style.display = 'flex';
}

// Rendu interne de l'énigme courante ; `feedback` = message optionnel.
function _renderRiddle(feedback) {
  const body = document.getElementById('riddle-body');
  if (!body) return;
  const q    = activeQuests.find(x => x.id === 'dumbledore_lumiere');
  const step = q && q.objectives.find(o => o.type === 'riddle');
  if (!step) return;
  const idx    = Math.min(step.progress | 0, RIDDLES_LUMIERE.length - 1);
  const riddle = RIDDLES_LUMIERE[idx];
  let choices = '';
  riddle.choices.forEach((c, i) => {
    choices += `<button type="button" class="brew-launch-btn" style="margin:6px 0"
      onclick="answerRiddle(${i})">${c}</button>`;
  });
  body.innerHTML = `
    <p style="font-size:11px;color:var(--gold);text-align:center;letter-spacing:1px;margin:2px 0 8px">
      Énigme ${idx + 1} / ${RIDDLES_LUMIERE.length}
    </p>
    <p style="font-size:13px;color:var(--parchment);line-height:1.55;text-align:center;margin:0 0 14px;font-style:italic">
      « ${riddle.question} »
    </p>
    ${choices}
    ${feedback ? `<p style="font-size:11px;color:#c08040;text-align:center;margin-top:10px">${feedback}</p>` : ''}`;
}

// Traite une réponse. Bonne → énigme suivante / fin de l'étape ;
// mauvaise → on rejoue la même, sans pénalité (épreuve de sagesse).
function answerRiddle(choiceIdx) {
  const q    = activeQuests.find(x => x.id === 'dumbledore_lumiere');
  const step = q && q.objectives.find(o => o.type === 'riddle');
  if (!step || step.completed) return;
  const idx    = Math.min(step.progress | 0, RIDDLES_LUMIERE.length - 1);
  const riddle = RIDDLES_LUMIERE[idx];
  if (choiceIdx !== riddle.answer) {
    _renderRiddle('« Réfléchis encore. La hâte est mauvaise conseillère. »');
    return;
  }
  step.progress = (step.progress | 0) + 1;
  if (step.progress >= step.amount) {
    step.completed = true;
    closeModal('riddle-modal');
    _spawnLuxAeternaBoss();
  } else {
    _renderRiddle('« Bien vu. Passons à la suivante. »');
  }
}

// Fait apparaître le Bibliothécaire d'Ombre sur l'étage courant.
function _spawnLuxAeternaBoss() {
  let placed = 0;
  if (typeof spawnQuestMonsters === 'function') {
    placed = spawnQuestMonsters('bibliothecaire_ombre', 0);
  }
  if (placed > 0) {
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon === 'function') drawDungeon();
  }
  addMsg("🕯️ Les énigmes sont résolues — le Bibliothécaire d'Ombre se manifeste sur cet étage !", 'magic');
  setNarrative("Le portrait hoche la tête. « Tu as l'esprit clair. Mais la lumière se garde aussi par les armes : son gardien t'attend, quelque part sur cet étage. »");
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
}
