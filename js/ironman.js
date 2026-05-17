// ============================================================
// MODE IRONMAN — score, faits d'armes & écran de résultat
// ============================================================
// Chargé après save-ui.js, avant main.js. Scope global partagé
// (script non-module). Voir .claude/plans/ironman-hall-of-fame.md.

// Faits d'armes : boss nommés. Vaincre l'un d'eux ajoute son bonus de
// points au score final. Les ids correspondent à js/monsters.js.
const BOSS_FEATS = {
  troll_grotte:       { label: 'Troll des Cavernes terrassé',   points: 200 },
  strigoi:            { label: 'Strigoï Ancien purifié',        points: 250 },
  basilic:            { label: 'Basilic Mineur abattu',         points: 300 },
  hecate_sorciere:    { label: 'Hécate la Maudisseuse vaincue', points: 350 },
  chimere:            { label: 'Chimère de Poudlard domptée',   points: 350 },
  ombre_quirrell:     { label: 'Ombre de Quirrell dissipée',    points: 400 },
  nagini:             { label: 'Nagini exterminée',             points: 450 },
  bellatrix:          { label: 'Bellatrix Lestrange vaincue',   points: 600 },
  voldemort_affaibli: { label: 'Voldemort Affaibli repoussé',   points: 800 },
  voldemort_revenu:   { label: 'Voldemort Ressuscité défait',   points: 1500 },
};

// Multiplicateur de score par difficulté — aligné sur la grille des
// points de Maison par kill (8/10/14/18 → ratio 0.8/1.0/1.4/1.8).
const DIFFICULTY_SCORE_MULT = {
  Facile: 0.8, Normal: 1.0, Difficile: 1.4, Expert: 1.8,
};

// Dernier résultat Ironman calculé — partagé avec hall-of-fame.js pour
// la soumission. Scope global (script non-module).
let _ironmanLastResult = null;

// Incrémente les compteurs de score à la fin d'un combat gagné.
// Appelée par battle.js — endBattle(). Inoffensive hors mode Ironman
// (les compteurs sont remis à zéro à chaque nouvelle partie).
function recordIronmanKills(enemies) {
  if (!Array.isArray(enemies)) return;
  for (const e of enemies) {
    totalKills++;
    if (e && BOSS_FEATS[e.id]) defeatedBosses.add(e.id);
  }
}

// Étage le plus profond atteint sur la partie.
function _ironmanDeepestFloor() {
  let deepest = currentFloor || 1;
  if (typeof visitedFloors !== 'undefined' && visitedFloors.size) {
    for (const f of visitedFloors) if (f > deepest) deepest = f;
  }
  return deepest;
}

// Calcule le score Ironman + le détail par catégorie. Fonction pure.
function computeIronmanScore() {
  const deepestFloor = _ironmanDeepestFloor();
  const quests = (typeof completedQuests !== 'undefined') ? completedQuests.size : 0;
  const level  = (player && player.level) || 1;
  const gold   = (player && player.gold)  || 0;

  let featPoints = 0;
  const feats = [];
  if (typeof defeatedBosses !== 'undefined') {
    for (const id of defeatedBosses) {
      const f = BOSS_FEATS[id];
      if (f) { featPoints += f.points; feats.push(f); }
    }
  }

  const breakdown = {
    kills:  (totalKills || 0) * 10,
    floor:  deepestFloor * 100,
    quests: quests * 150,
    level:  level * 50,
    gold:   Math.floor(gold * 0.5),
    feats:  featPoints,
  };
  const raw = breakdown.kills + breakdown.floor + breakdown.quests
            + breakdown.level + breakdown.gold + breakdown.feats;
  const mult = DIFFICULTY_SCORE_MULT[difficulty] || 1.0;

  return {
    score: Math.round(raw * mult),
    raw, mult, breakdown, feats,
    deepestFloor, level, gold,
    monstersKilled:  totalKills || 0,
    questsCompleted: quests,
  };
}

// Construit l'objet résultat complet (consommé par l'écran + le HoF).
function buildIronmanResult(cause) {
  const s = computeIronmanScore();
  const heroes = (party || []).slice(0, partySize || 1)
    .filter(c => c && c.name).map(c => c.name).join(' & ');
  return {
    cause:           cause || 'Le groupe est tombé au combat.',
    heroes:          heroes || 'Sorcier inconnu',
    difficulty:      difficulty || 'Normal',
    deepestFloor:    s.deepestFloor,
    level:           s.level,
    monstersKilled:  s.monstersKilled,
    questsCompleted: s.questsCompleted,
    gold:            s.gold,
    feats:           s.feats,
    breakdown:       s.breakdown,
    mult:            s.mult,
    score:           s.score,
  };
}

// Convertit un résultat en entrée Hall of Fame (forme = schéma de la
// table Supabase `leaderboard`).
function ironmanResultToEntry(result, name) {
  return {
    player_name:      name,
    score:            result.score,
    difficulty:       result.difficulty,
    heroes:           result.heroes,
    deepest_floor:    result.deepestFloor,
    party_levels:     'Niv. ' + result.level,
    monsters_killed:  result.monstersKilled,
    quests_completed: result.questsCompleted,
    gold:             result.gold,
    created_at:       new Date().toISOString(),
  };
}

// ── Écran de résultat (remplace la pétrification en mode Ironman) ──
function showIronmanResult(cause) {
  const result = buildIronmanResult(cause);
  _ironmanLastResult = result;

  // Mort définitive : on retire la sauvegarde auto de cette partie pour
  // empêcher de recharger l'état post-mortem.
  if (typeof deleteSlot === 'function') deleteSlot('auto');

  const screen = document.getElementById('ironman-result-screen');
  if (!screen) return;

  const msgEl = document.getElementById('ironman-result-msg');
  if (msgEl) msgEl.textContent = result.cause;

  const scoreEl = document.getElementById('ironman-result-score');
  if (scoreEl) {
    scoreEl.innerHTML =
      `<span class="ir-score-num">${result.score.toLocaleString('fr-FR')}</span>`
      + `<span class="ir-score-label">points</span>`;
  }

  const b = result.breakdown;
  const rows = [
    ['Monstres vaincus',       result.monstersKilled,  b.kills],
    ['Étage le plus profond',  result.deepestFloor,    b.floor],
    ['Quêtes terminées',       result.questsCompleted, b.quests],
    ['Niveau atteint',         result.level,           b.level],
    ['Or amassé',              result.gold,            b.gold],
  ];
  let html = '<table class="ir-breakdown-table"><tbody>';
  for (const [label, val, pts] of rows) {
    html += `<tr><td class="ir-bk-label">${label}</td>`
          + `<td class="ir-bk-val">${val}</td>`
          + `<td class="ir-bk-pts">+${pts.toLocaleString('fr-FR')}</td></tr>`;
  }
  html += '</tbody></table>';

  if (result.feats.length) {
    html += '<div class="ir-feats-title">⚔ Faits d\'armes</div><ul class="ir-feats">';
    for (const f of result.feats) {
      html += `<li><span>${f.label}</span><span class="ir-bk-pts">+${f.points}</span></li>`;
    }
    html += '</ul>';
  }
  html += `<div class="ir-mult">Difficulté <strong>${result.difficulty}</strong>`
        + ` — multiplicateur ×${result.mult}</div>`;

  const bkEl = document.getElementById('ironman-result-breakdown');
  if (bkEl) bkEl.innerHTML = html;

  // Réinitialise la zone de soumission au Hall of Fame.
  const nameInput = document.getElementById('hof-name-input');
  if (nameInput) {
    nameInput.disabled = false;
    if (!nameInput.value) {
      const first = (party[0] && party[0].name) ? party[0].name.split(' ')[0] : '';
      nameInput.value = first;
    }
  }
  const submitBtn = document.getElementById('hof-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Soumettre au Hall of Fame';
  }
  const statusEl = document.getElementById('hof-submit-status');
  if (statusEl) statusEl.textContent = '';

  screen.style.display = 'flex';
}
