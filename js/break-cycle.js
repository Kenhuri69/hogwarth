// ============================================================
// BRISER LE CYCLE — fin optionnelle de la Boucle Ténébreuse
// (V3 — docs/histoire/11-mondes-paralleles.md §11.10)
// ------------------------------------------------------------
// Quête secrète NON-GATING à 4 jalons, débloquée en Boucle (post-victoire) :
//   I   Entendre  — voir la scène du Scellement (echo `echo_scene_sceau`, ét. 14+).
//   II  Porter    — atteindre BRISER_ECLAT_SEUIL Éclats portés (accumulatedEclats).
//   III Affronter — vaincre le boss-miroir « Le Reflet du Mythe » (`reflet_mythe`,
//                   étage RÉEL 21+).
//   IV  Choisir   — 🕊️ Briser (rescelle par le bas, fin cosmétique) ou
//                   🌑 Perpétuer (la Boucle continue ; série ★ N intacte).
//
// Les 3 premiers jalons sont DÉRIVÉS (seenEchoes / accumulatedEclats /
// monsterKills) — `briserCycleJalons` est PUR (testé dans tests/units.js).
// Le SEUL état persistant ajouté est `cycleBroken` (state.js). Refuser ne
// ferme rien ; briser laisse la Boucle accessible (le héros « sait », désormais).
//
// Chargé après endgame.js, avant forge.js (cf. index.html). Au MANIFEST loader.
// ============================================================

// Seuil du jalon II (Éclats portés). accumulatedEclats gagne +1 par nouvel
// étage de Boucle le plus profond franchi → ~11 à l'étage 21, 15 à l'étage 25 :
// le seuil impose de descendre un peu au-delà du premier Reflet.
const BRISER_ECLAT_SEUIL = 15;
const MIRROR_BOSS_ID = 'reflet_mythe';

// Pages de la cinématique « Briser » (réutilise le patron pages d'intro.js).
const BREAK_CYCLE_PAGES = [
  "Tu poses les Éclats que tu portais sur la faille — non pour la fuir, mais pour la regarder jusqu'au fond. Comme les Quatre avant toi, tu y laisses une part de toi-même.",
  "Le battement organique de l'Avant-Monde ralentit, ralentit… puis se tait. Le froid recule d'un pas. La spirale ne se referme pas sur toi : elle s'apaise, le temps d'un souffle.",
  "« On ne ferme pas la peur en la fuyant vers le haut. On la ferme en osant la regarder jusqu'au fond. » Le Cycle est brisé — mais la Boucle reste ouverte à qui voudra redescendre, sachant, désormais.",
];

// ── Résolveur PUR des jalons ─────────────────────────────────
// ctx plat : { sceneSeen:bool, eclats:int, bossKills:int, seuil?:int }.
function briserCycleJalons(ctx) {
  ctx = ctx || {};
  const seuil     = (typeof ctx.seuil === 'number') ? ctx.seuil : BRISER_ECLAT_SEUIL;
  const entendre  = !!ctx.sceneSeen;
  const porter    = (typeof ctx.eclats === 'number') && ctx.eclats >= seuil;
  const affronter = (typeof ctx.bossKills === 'number') && ctx.bossKills >= 1;
  const count = (entendre ? 1 : 0) + (porter ? 1 : 0) + (affronter ? 1 : 0);
  return { entendre, porter, affronter, count, ready: count >= 3 };
}

// Contexte runtime (défensif : globals absents → valeurs neutres).
function _briserCtx() {
  const seen = (typeof seenEchoes !== 'undefined' && seenEchoes && seenEchoes.has);
  return {
    sceneSeen: seen ? seenEchoes.has('echo_scene_sceau') : false,
    eclats:    (typeof accumulatedEclats !== 'undefined') ? accumulatedEclats : 0,
    bossKills: (typeof monsterKills !== 'undefined' && monsterKills) ? (monsterKills[MIRROR_BOSS_ID] || 0) : 0,
    seuil:     BRISER_ECLAT_SEUIL,
  };
}

// Progression dérivée 0-3 (consommée par l'affichage / le Codex via `monster`).
function briserCycleProgress() { return briserCycleJalons(_briserCtx()).count; }

// ── Hook de fin de combat : propose le choix à la mort du Reflet ─────
// Appelé par endBattle(won) (battle-rewards.js) après l'enregistrement des
// kills (monsterKills à jour → jalon III déjà vrai). Le choix n'est offert que
// si les jalons I (scène) et II (Éclats) sont DÉJÀ remplis ; sinon, indice
// narratif et le Reflet reviendra (il respawn en Boucle). Défensif/no-op hors
// Boucle, sans victoire, ou si déjà brisé.
function maybeOfferBreakCycle(enemyGroup) {
  if (typeof cycleBroken !== 'undefined' && cycleBroken) return false;
  if (!(typeof victoryAchieved !== 'undefined' && victoryAchieved)) return false;
  if (!Array.isArray(enemyGroup)) return false;
  if (!enemyGroup.some(e => e && e.id === MIRROR_BOSS_ID)) return false;
  const j = briserCycleJalons(_briserCtx());
  if (!(j.entendre && j.porter)) {
    if (typeof addMsg === 'function') {
      addMsg("Le Reflet se dissipe — mais tu n'es pas encore prêt à choisir. Quelque chose manque, plus profond.", 'magic');
    }
    return false;
  }
  // Diffère l'ouverture pour laisser l'écran de victoire / le butin se poser.
  setTimeout(() => {
    if (typeof inBattle !== 'undefined' && inBattle) return;
    openBreakCycleModal();
  }, 1000);
  return true;
}

// ── Modale de choix (jalon IV) ───────────────────────────────
function openBreakCycleModal() {
  const ov = (typeof safeEl === 'function') ? safeEl('break-cycle-overlay') : document.getElementById('break-cycle-overlay');
  if (!ov) return;
  const set = (id, html) => { const el = (typeof safeEl === 'function') ? safeEl(id) : document.getElementById(id); if (el) el.innerHTML = html; };
  set('break-cycle-icon', '🪞');
  set('break-cycle-title', 'Le Reflet s\'efface — Briser le Cycle&nbsp;?');
  set('break-cycle-text',
    "Tu as <b>entendu</b> comment le sceau fut posé, <b>porté</b> assez d'Éclats pour peser sur la faille, " +
    "et <b>affronté</b> ta propre ombre de légende. Au sommet de l'Avant-Monde, un choix t'appartient, " +
    "que nul manuel n'osa écrire :<br><br>" +
    "🕊️ <b>Briser le Cycle</b> — resceller par le bas, en y laissant une part de toi.<br>" +
    "🌑 <b>Perpétuer</b> — choisir le mythe, descendre sans fin.");
  set('break-cycle-actions',
    '<button class="cmd-btn" onclick="confirmBreakCycle()">🕊️ Briser le Cycle</button>' +
    '<button class="cmd-btn" onclick="declineBreakCycle()">🌑 Perpétuer</button>');
  _setBreakCycleArt(null);   // l'écran de choix reste sobre (texte + 🪞)
  ov.style.display = 'flex';
}

function closeBreakCycleModal() {
  const ov = (typeof safeEl === 'function') ? safeEl('break-cycle-overlay') : document.getElementById('break-cycle-overlay');
  if (ov) ov.style.display = 'none';
  _setBreakCycleArt(null);
}

// Illustration de fin (ch.14 §14.6.1, P4) : posée seulement pendant la
// cinématique « Briser le Cycle ». Défensif — `src` falsy masque l'image, et
// un asset absent (404) la masque via onerror (le jeu reste identique sans).
function _setBreakCycleArt(src) {
  const el = (typeof safeEl === 'function') ? safeEl('break-cycle-art') : document.getElementById('break-cycle-art');
  if (!el) return;
  if (!src) { el.style.display = 'none'; el.removeAttribute('src'); return; }
  el.onload  = function () { el.style.display = 'block'; };
  el.onerror = function () { el.style.display = 'none'; };
  el.src = src;
}

// 🌑 Perpétuer — refuse de briser. Aucune punition ; la Boucle continue.
function declineBreakCycle() {
  closeBreakCycleModal();
  if (typeof addMsg === 'function') {
    addMsg("🌑 Tu choisis le mythe. La spirale t'appelle plus bas — le Reflet reviendra.", 'magic');
  }
}

// 🕊️ Briser — pose le flag cosmétique, déverrouille le Codex, joue la cinématique.
function confirmBreakCycle() {
  if (typeof cycleBroken !== 'undefined') cycleBroken = true;
  // Label de fin (P3) : bascule sur 'cycle_broken' (priorité max).
  if (typeof refreshEndingType === 'function') refreshEndingType();
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('cycle-broken');
  // Musique de fin (P4) : nappe douce `ending_break` si présente, repli sur le
  // sting procédural playVictory() sinon (playEndingTheme gère lui-même le 404).
  try {
    if (typeof AudioSystem !== 'undefined') {
      if (AudioSystem.playEndingTheme) AudioSystem.playEndingTheme();
      else if (AudioSystem.playVictory) AudioSystem.playVictory();
    }
  } catch (_) { /* no-op */ }
  // Illustration de la cinématique (P4) : affichée si l'asset existe.
  _setBreakCycleArt('img/scenes/ending_break_cycle.jpg');
  _breakCyclePage = 0;
  _renderBreakCyclePage();
}

let _breakCyclePage = 0;
function _renderBreakCyclePage() {
  const set = (id, html) => { const el = (typeof safeEl === 'function') ? safeEl(id) : document.getElementById(id); if (el) el.innerHTML = html; };
  const last = _breakCyclePage >= BREAK_CYCLE_PAGES.length - 1;
  set('break-cycle-icon', '🕊️');
  set('break-cycle-title', 'Briser le Cycle — ' + (_breakCyclePage + 1) + '/' + BREAK_CYCLE_PAGES.length);
  set('break-cycle-text', BREAK_CYCLE_PAGES[_breakCyclePage]);
  set('break-cycle-actions', last
    ? '<button class="cmd-btn" onclick="finishBreakCycle()">🌑 Redescendre (la Boucle reste ouverte)</button>'
    : '<button class="cmd-btn" onclick="advanceBreakCycle()">Continuer</button>');
}

function advanceBreakCycle() { _breakCyclePage++; _renderBreakCyclePage(); }

function finishBreakCycle() {
  closeBreakCycleModal();
  if (typeof addMsg === 'function') {
    addMsg("🕊️ Tu as brisé le Cycle. La Boucle reste ouverte — tu peux redescendre, mais tu sais, désormais.", 'magic');
  }
  if (typeof safeCall === 'function') safeCall('autoSave', 'cycle-broken');
  else if (typeof autoSave === 'function') autoSave('cycle-broken');
  if (typeof updateUI === 'function') updateUI();
}
