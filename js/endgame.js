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
//
// Variantes conditionnelles du discours (Chapitre 14 §14.2.2, P1) :
// _victorySpeechVariants(ctx) est un helper PUR (testé dans tests/units.js)
// qui retourne les blocs HTML à concaténer au discours de base de
// #victory-speech selon le contexte de fin (héros choisis & solo/duo, Maison,
// choix moral du Pacte, Éclats remis, quêtes Signature). Aucune branche, aucun gate : ce
// sont des couches de TEXTE posées sur la même cinématique. Tout est
// défensif — champ absent → bloc omis (jamais de crash, texte de base seul).

// Pur & testable. `ctx` regroupe les flags de fin déjà présents dans l'état.
// Ordre d'affichage (concaténé après le discours de base) : beat des héros sur
// le palier (solo intime / duo à deux voix + clin d'œil Maison canon ≠ jouée) →
// révélation des Éclats → héritage des Signatures → choix moral (Pacte) →
// dernier mot de Dumbledore coloré par la Maison.
function _victorySpeechVariants(ctx) {
  ctx = ctx || {};
  const blocks = [];
  const esc = (s) => (typeof htmlEscape === 'function' ? htmlEscape(String(s)) : String(s));

  // (b) §14.2.2(b) — Beat des héros sur le palier, selon solo/duo et l'identité
  // des héros choisis. Camera sur les héros avant le dernier mot de Dumbledore.
  const heroes = Array.isArray(ctx.heroes) ? ctx.heroes.filter(h => h && h.name) : [];
  if (heroes.length === 1) {
    blocks.push(
      `<p class="victory-speech-heroes"><em>Sur le palier, ${esc(heroes[0].name)}
       s'arrête un instant, seul·e. « Je suis descendu·e seul·e jusqu'au fond. Le
       château s'en souviendra. »</em></p>`);
  } else if (heroes.length >= 2) {
    blocks.push(
      `<p class="victory-speech-heroes"><em>Sur le palier, ${esc(heroes[0].name)}
       se tourne vers ${esc(heroes[1].name)} : « On a touché le fond — et on est
       remontés. » — « Ensemble, répond ${esc(heroes[1].name)}. Comme
       toujours. »</em></p>`);
  }
  // Clin d'œil : un héros dont la Maison canon diffère de la Maison jouée note
  // l'ironie d'avoir vaincu sous une autre bannière (1er concerné seulement).
  if (ctx.chosenHouse) {
    const odd = heroes.find(h => h.canonHouse && h.canonHouse !== ctx.chosenHouse);
    if (odd) {
      blocks.push(
        `<p class="victory-speech-wink"><em>${esc(odd.name)} sourit : avoir gagné
         sous les couleurs de ${esc(ctx.chosenHouse)}, quand ${esc(odd.canonHouse)}
         l'a vu naître… l'ironie ne lui échappe pas.</em></p>`);
    }
  }

  // (d) §14.2.2(d) — Révélation des Éclats : si le fil rouge des 3 Éclats de
  // la Clé de Voûte a été remis (quête `eclats_clef_voute` terminée), un
  // préavis lucide qui prépare émotionnellement la Boucle.
  if (ctx.eclatsComplete) {
    blocks.push(
      `<p class="victory-speech-eclats"><em>« Tu as remis les trois Éclats —
       alors tu sais déjà ce que je vais dire. Le verrou retenait deux choses,
       pas une : le résidu de Voldemort, et ce qui dormait là bien avant lui.
       Voilà pourquoi ta victoire <strong>ouvre</strong> au lieu de fermer. »</em></p>`);
  }

  // (c) §14.2.2(c) — Héritage des quêtes Signature : nomme la récompense
  // cérémonielle obtenue. Chaque flag est indépendant (un seul actif par
  // partie en pratique, mais on ne le présuppose pas).
  if (ctx.gryffSignatureDone) {
    blocks.push(
      `<p class="victory-speech-legacy">La <b>Bannière de Godric</b> a tenu
       jusqu'au fond — ton étendard n'a pas plié.</p>`);
  }
  if (ctx.slythSignatureDone) {
    blocks.push(
      `<p class="victory-speech-legacy">Le <b>Pacte des Cachots</b> a été
       scellé en ton nom — souviens-toi qu'il a toujours un revers.</p>`);
  }
  if (ctx.ravenSignatureDone) {
    blocks.push(
      `<p class="victory-speech-legacy">Le <b>Codex de Rowena</b> t'a livré
       ses failles — tu le connaissais avant de le frapper.</p>`);
  }
  if (ctx.poufSignatureDone) {
    blocks.push(
      `<p class="victory-speech-legacy">Le <b>Médaillon de Helga</b> a veillé
       sur le Refuge — il a tenu pendant toute ta descente.</p>`);
  }

  // (e) §14.2.2(e) — Choix moral du Pacte des Cachots (08 §8.8.1). `pact` =
  // ton froid (mise en garde) ; `defiance` = ton de reconnaissance, en miroir.
  if (ctx.slythPactChoice === 'pact') {
    blocks.push(
      `<p class="victory-speech-cold"><em>« Tu as gagné. Veille seulement à
       rester celui qui parle — et non celui à qui l'on parle. »</em></p>`);
  } else if (ctx.slythPactChoice === 'defiance') {
    blocks.push(
      `<p class="victory-speech-warm"><em>« Tu as tenu tête à une voix vieille
       de mille ans, et tu n'as rien cédé. Peu y parviennent. Cela, je ne
       l'oublierai pas. »</em></p>`);
  }

  // (a) §14.2.2(a) — Dernier mot de Dumbledore, coloré par la Maison du héros.
  const HOUSE_LAST_WORD = {
    Gryffondor:  "Tu n'as pas vaincu parce que tu n'avais pas peur — mais parce que tu es descendu <em>avec</em> ta peur. C'est tout Godric, cela.",
    Serpentard:  "Tu as su quand frapper, et quand attendre. Salazar lui-même n'aurait pu mieux choisir son heure — veille à ce que ce soit toujours <em>toi</em> qui choisisses.",
    Serdaigle:   "Tu as compris avant de combattre. Rowena disait : « la connaissance est l'arme qu'on ne perd jamais. » Tu viens de le prouver au plus profond.",
    Poufsouffle: "Tu n'as laissé personne derrière, pas même quand descendre seul eût été plus simple. Helga aurait été fière — et l'école, qu'elle a fondée pour tous, te doit la nuit."
  };
  if (ctx.chosenHouse && HOUSE_LAST_WORD[ctx.chosenHouse]) {
    blocks.push(
      `<p class="victory-speech-house"><em>« ${HOUSE_LAST_WORD[ctx.chosenHouse]} »</em></p>`);
  }

  return blocks.join('\n');
}

// Label de fin (Chapitre 14 §14.6.2, P3) — PUR & testable. Déduit COMMENT la
// partie s'est conclue à partir des flags existants, par priorité décroissante :
// Cycle brisé > victoire avec Pacte scellé > victoire simple > pas encore de fin.
// C'est un LABEL (Codex/épilogue), jamais un gate : la Boucle reste ouverte
// quelle que soit sa valeur. Tout défensif (ctx absent → null).
function computeEndingType(ctx) {
  ctx = ctx || {};
  if (ctx.cycleBroken) return 'cycle_broken';
  if (!ctx.victoryAchieved) return null;
  if (ctx.slythPactChoice === 'pact') return 'victory_pact';
  return 'victory';
}

// Recalcule et persiste `endingType` (global state.js) depuis les flags
// courants. Appelé à la victoire et au Briser-le-Cycle. Lit des globals → non
// pur (computeEndingType reste la part pure/testée). No-op si le global n'existe
// pas (chargement partiel / sandbox de test).
function refreshEndingType() {
  if (typeof endingType === 'undefined') return null;
  endingType = computeEndingType({
    victoryAchieved: (typeof victoryAchieved !== 'undefined') && victoryAchieved,
    cycleBroken:     (typeof cycleBroken !== 'undefined') && cycleBroken,
    slythPactChoice: (typeof slythPactChoice !== 'undefined') ? slythPactChoice : null,
  });
  return endingType;
}

// ============================================================
// Boussole d'endgame (P2.2) — panneau post-victoire qui liste les
// destinations débloquées et leur déclencheur. Convertit la profondeur
// latente en objectifs lisibles. Tout est DÉRIVÉ (aucun flag nouveau).
// ============================================================

// Helper PUR : retourne la liste des destinations endgame à partir d'un ctx
// plat. Testable hors navigateur (units.js).
function endgameDestinations(ctx) {
  ctx = ctx || {};
  const va     = !!ctx.victoryAchieved;
  const floor  = (typeof ctx.currentFloor === 'number') ? ctx.currentFloor : 1;
  const eclats = (typeof ctx.accumulatedEclats === 'number') ? ctx.accumulatedEclats : 0;
  const seuil  = (typeof ctx.eclatsSeuil === 'number') ? ctx.eclatsSeuil : 15;
  const tier   = (typeof ctx.houseTier === 'number') ? ctx.houseTier : 0;
  const house  = ctx.chosenHouse || null;
  const broken = !!ctx.cycleBroken;
  return [
    {
      id: 'gardien_boucle', icon: '🌑', label: 'Gardien de la Boucle',
      trigger: 'Étage 11 (post-victoire)', unlocked: va,
      hint: va
        ? 'Quêtes répétables de purge → matériaux Forge / Bibliothèque.'
        : 'Vaincs Voldemort (étage 10) pour ouvrir la Boucle Ténébreuse.'
    },
    {
      id: 'chambres', icon: '🏛️',
      label: house ? ('Chambre des Fondateurs — ' + house) : 'Chambres des Fondateurs',
      trigger: 'Étage 17+ en Boucle', unlocked: va && floor >= 17,
      hint: 'Affronte le Gardien-Fondateur de ta Maison (butin signature).'
    },
    {
      id: 'apotheose', icon: '⭐', label: 'Apothéose & série ★',
      trigger: 'Palier de Maison 17+ · Don à la Maison', unlocked: tier >= 17,
      hint: tier >= 18
        ? 'Passif légendaire éveillé — empile les ★ via le Don à la Maison.'
        : 'Atteins le palier Mythe (17) pour ouvrir le Don à la Maison.'
    },
    {
      id: 'briser_cycle', icon: '🕊️', label: 'Briser le Cycle',
      trigger: eclats + ' / ' + seuil + ' Éclats portés',
      unlocked: va && !broken && eclats >= seuil,
      hint: broken
        ? 'Le Cycle est déjà brisé.'
        : 'Porte ' + seuil + ' Éclats, puis affronte le Reflet du Mythe.'
    }
  ];
}

// ctx live depuis l'état runtime. Défensif (typeof).
function _endgameCompassCtx() {
  return {
    victoryAchieved:   (typeof victoryAchieved !== 'undefined') && victoryAchieved,
    currentFloor:      (typeof currentFloor !== 'undefined') ? currentFloor : 1,
    accumulatedEclats: (typeof accumulatedEclats !== 'undefined') ? accumulatedEclats : 0,
    eclatsSeuil:       (typeof BRISER_ECLAT_SEUIL !== 'undefined') ? BRISER_ECLAT_SEUIL : 15,
    houseTier:         (typeof houseTier !== 'undefined') ? houseTier : 0,
    chosenHouse:       (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    cycleBroken:       (typeof cycleBroken !== 'undefined') && cycleBroken
  };
}

function _renderEndgameCompass() {
  const box = (typeof safeEl === 'function') ? safeEl('endgame-compass-list')
                                             : document.getElementById('endgame-compass-list');
  if (!box) return;
  const esc = (typeof htmlEscape === 'function') ? htmlEscape : (s => String(s));
  const dests = endgameDestinations(_endgameCompassCtx());
  box.innerHTML = dests.map(d => {
    const on = d.unlocked;
    return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;' +
      'border:1px solid ' + (on ? '#7a5a1a' : '#2a1a08') + ';border-radius:4px;' +
      'background:rgba(0,0,0,.2);opacity:' + (on ? '1' : '.6') + '">' +
      '<div style="font-size:22px;line-height:1">' + (on ? d.icon : '🔒') + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:\'Cinzel\',serif;font-size:13px;color:var(--gold-light)">' +
          esc(d.label) + ' <span style="font-size:11px">' + (on ? '✅' : '🔒') + '</span></div>' +
        '<div style="font-size:11px;color:#c9a84c;margin:2px 0">📍 ' + esc(d.trigger) + '</div>' +
        '<div style="font-size:11px;color:var(--parchment-dark);line-height:1.4">' + esc(d.hint) + '</div>' +
      '</div></div>';
  }).join('');
}

function openEndgameCompass() {
  const modal = (typeof safeEl === 'function') ? safeEl('endgame-compass-modal')
                                               : document.getElementById('endgame-compass-modal');
  if (!modal) return;
  _renderEndgameCompass();
  modal.style.display = 'flex';
}

function closeEndgameCompass() {
  const modal = (typeof safeEl === 'function') ? safeEl('endgame-compass-modal')
                                               : document.getElementById('endgame-compass-modal');
  if (modal) modal.style.display = 'none';
}

// Bouton #btn-endgame-compass : visible uniquement post-victoire. Appelé par
// updateUI() (défensif).
function _refreshEndgameCompassBtn() {
  const btn = (typeof safeEl === 'function') ? safeEl('btn-endgame-compass')
                                             : document.getElementById('btn-endgame-compass');
  if (!btn) return;
  const va = (typeof victoryAchieved !== 'undefined') && victoryAchieved;
  btn.style.display = va ? '' : 'none';
}

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
    // Label de fin (P3) : posé dès la victoire ('victory' ou 'victory_pact').
    refreshEndingType();
    // Profil persistant hors-save (P5) : enregistre la victoire (compteur +
    // titres). Cosmétique — aucun héritage de stat. Gardé par victoryAchieved
    // ci-dessus → un seul enregistrement par run.
    if (typeof recordEndingToProfile === 'function') {
      recordEndingToProfile((typeof endingType !== 'undefined' && endingType) || 'victory');
    }

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
      // Variantes conditionnelles (Chapitre 14 §14.2.2, P1) : on lit les flags
      // de fin déjà présents dans l'état (tous défensifs) et on délègue au
      // helper pur _victorySpeechVariants pour produire les blocs à concaténer.
      const ctx = {
        chosenHouse:        (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
        // (b) §14.2.2(b) — héros actifs (nom + Maison canon) pour le beat du palier.
        heroes:             (typeof party !== 'undefined' && Array.isArray(party))
          ? party.slice(0, (typeof partySize !== 'undefined' ? partySize : 1))
              .filter(c => c && c.heroKey)
              .map(c => ({
                name:       c.name,
                canonHouse: (typeof _heroCanonHouse === 'function') ? _heroCanonHouse(c.heroKey) : null,
              }))
          : [],
        slythPactChoice:    (typeof slythPactChoice !== 'undefined') ? slythPactChoice : null,
        gryffSignatureDone: (typeof gryffSignatureDone !== 'undefined') && gryffSignatureDone,
        slythSignatureDone: (typeof slythSignatureDone !== 'undefined') && slythSignatureDone,
        ravenSignatureDone: (typeof ravenSignatureDone !== 'undefined') && ravenSignatureDone,
        poufSignatureDone:  (typeof poufSignatureDone !== 'undefined') && poufSignatureDone,
        eclatsComplete:     (typeof completedQuests !== 'undefined' && completedQuests &&
                             typeof completedQuests.has === 'function' &&
                             completedQuests.has('eclats_clef_voute'))
      };
      const variants = _victorySpeechVariants(ctx);
      speech.innerHTML = `
        « Vous avez fait ce que même les plus grands sorciers n'auraient
        osé tenter. La nuit la plus sombre cède, enfin, devant votre
        courage. Le château ne sera plus jamais le même — mais quelques
        ombres rôdent encore, plus profondément, là où la magie est plus
        ancienne. <em>L'escalier le plus profond, scellé par la peur,
        s'ouvre enfin.</em> »
        ${variants}
        <div class="victory-speech-sign">— Albus Dumbledore</div>
      `;
    }

    modal.style.display = 'flex';
    // Illustration de fin (Chapitre 14 §14.6.1, P4) : affichée seulement si
    // l'asset existe. onerror → masquée (le jeu reste identique sans elle).
    const art = document.getElementById('victory-art');
    if (art && !art.getAttribute('src')) {
      art.onload  = function () { art.style.display = 'block'; };
      art.onerror = function () { art.style.display = 'none'; };
      art.src = 'img/scenes/ending_victory.jpg';
    }
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
