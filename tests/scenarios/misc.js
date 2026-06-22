// ============================================================
// Scénarios smoke — domaine « misc » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioStartup() {
  console.log('\n── Scénario 1 : régression de démarrage ──');
  const { browser, page, errors } = await launchGame();

  const init = await page.evaluate(() => ({
    titleVisible: document.getElementById('title-screen').style.display !== 'none',
    spellCount:   SPELLS.length,
    monsterCount: MONSTERS.length,
    itemCount:    ITEMS.length
  }));
  console.log('  init :', init);
  assert(init.titleVisible,        'écran titre invisible');
  assert(init.spellCount   > 0,    'SPELLS vide');
  assert(init.monsterCount > 0,    'MONSTERS vide');
  assert(init.itemCount    > 0,    'ITEMS vide');

  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const ready = await page.evaluate(() => ({
    floor: currentFloor, gold: player.gold, hp: party[0].hp, level: player.level
  }));
  console.log('  ready :', ready);
  assert(ready.hp    > 0, 'PV de Harry à 0');
  assert(ready.floor === 1, 'étage initial différent de 1');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS au démarrage`);
  }
  console.log('  ✅ aucune régression');
  await browser.close();
}

async function scenarioLoader() {
  console.log('\n── Scénario 27 : loader (manifeste de globals) ──');
  const { browser, page, errors } = await launchGame();

  // 1) Happy path : rapport publié par loader.js
  const report = await page.evaluate(() => window.__loaderReport);
  console.log('  report :', {
    ok:              report?.ok,
    total:           report?.totalChecked,
    missingCritical: report?.missingCritical?.length,
    missingOptional: report?.missingOptional?.length
  });
  assert(report,                              'window.__loaderReport absent');
  assert(report.ok === true,                  'loader.ok doit être true');
  assert(report.missingCritical.length === 0,
    `modules critiques manquants : ${JSON.stringify(report.missingCritical.map(m => m.name))}`);
  assert(report.totalChecked >= 50,
    `totalChecked trop faible (${report.totalChecked}) — manifeste tronqué ?`);

  // 2) Aucun bandeau d'erreur visible sur démarrage sain
  const noBanner = await page.evaluate(() => !document.getElementById('loader-error-banner'));
  assert(noBanner, "pas de bandeau d'erreur attendu sur démarrage sain");

  // 3) Helpers exposés sur window
  const helpers = await page.evaluate(() => ({
    safeEl:   typeof window.safeEl   === 'function',
    safeCall: typeof window.safeCall === 'function',
    UX_safe:  typeof window.UX_safe  === 'object' && window.UX_safe !== null
  }));
  console.log('  helpers :', helpers);
  assert(helpers.safeEl,   'window.safeEl absent');
  assert(helpers.safeCall, 'window.safeCall absent');
  assert(helpers.UX_safe,  'window.UX_safe absent');

  // 4) Régression B1 : UX_safe survit à delete window.UX (proxy tolérant)
  const uxSafeOk = await page.evaluate(() => {
    const saved = window.UX;
    try {
      delete window.UX;
      const r1 = window.UX_safe.floatDmg('ally', 10, 'dmg');
      const r2 = window.UX_safe.logCombat('test', 'info');
      return r1 === undefined && r2 === undefined;
    } finally {
      window.UX = saved;
    }
  });
  assert(uxSafeOk, 'UX_safe doit retourner undefined quand window.UX absent');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Loader OK');
  await browser.close();
}

async function scenarioIronman() {
  console.log('\n── Scénario : mode Ironman + Hall of Fame ──');
  const { browser, page, errors } = await launchGame();

  // Coche la case Ironman avant de confirmer la sélection de héros.
  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_hof');
    // Neutralise la config Supabase : le scénario teste le repli local
    // de façon déterministe, sans dépendre du réseau. Le chemin en ligne
    // est vérifié manuellement (cf. .claude/plans/ironman-hall-of-fame.md).
    if (typeof HOF_CONFIG !== 'undefined') HOF_CONFIG.supabaseUrl = '';
    const cb = document.getElementById('ironman-toggle');
    if (cb) cb.checked = true;
  });
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Le mode est armé et la difficulté verrouillée.
  const t1 = await page.evaluate(() => {
    const modal = document.getElementById('character-modal');
    modal.style.display = 'none';
    const before = difficulty;
    changeDifficulty();                 // doit être refusé en Ironman
    return { ironmanMode, runId: ironmanRunId, before, after: difficulty,
             modalOpened: modal.style.display === 'flex' };
  });
  console.log('  T1 mode + lock :', t1);
  assert(t1.ironmanMode === true,   'ironmanMode doit être true');
  assert(typeof t1.runId === 'string' && t1.runId.length >= 8,
    'ironmanRunId doit être généré au démarrage Ironman');
  assert(t1.before === t1.after,    'changeDifficulty ne doit pas changer la difficulté');
  assert(!t1.modalOpened,           'changeDifficulty ne doit pas ouvrir la modale en Ironman');

  // 2) Comptage des kills + faits d'armes boss.
  const t2 = await page.evaluate(() => {
    totalKills = 0; defeatedBosses = new Set();
    recordIronmanKills([{ id: 'basilic' }, { id: 'chat_norris' }, { id: 'bellatrix' }]);
    return { totalKills, bosses: Array.from(defeatedBosses).sort() };
  });
  console.log('  T2 kills :', t2);
  assert(t2.totalKills === 3, 'recordIronmanKills doit compter 3 monstres');
  assert(t2.bosses.length === 2 && t2.bosses.includes('basilic') && t2.bosses.includes('bellatrix'),
    'seuls les boss doivent entrer dans defeatedBosses');

  // 3) Calcul du score (formule + multiplicateur de difficulté).
  const t3 = await page.evaluate(() => {
    difficulty      = 'Difficile';        // multiplicateur ×1.4
    totalKills      = 20;
    defeatedBosses  = new Set(['basilic']); // +300
    visitedFloors   = new Set([1, 2, 3, 4, 5]);
    currentFloor    = 3;
    completedQuests = new Set(['q1', 'q2']);
    player.level    = 8;
    player.gold     = 100;
    return computeIronmanScore();
  });
  console.log('  T3 score :', { score: t3.score, raw: t3.raw, mult: t3.mult,
    partyMult: t3.partyMult });
  // raw = 20*10 + 5*150 + 2*150 + 8*50 + floor(100*0.5) + 300 = 2000
  assert(t3.raw === 2000,   `raw attendu 2000, obtenu ${t3.raw}`);
  assert(t3.mult === 1.4,   `multiplicateur Difficile attendu 1.4, obtenu ${t3.mult}`);
  assert(t3.partyMult === 1.3, `multiplicateur solo attendu 1.3, obtenu ${t3.partyMult}`);
  // score = round(2000 × 1.4 × 1.3) = 3640
  assert(t3.score === 3640, `score attendu 3640, obtenu ${t3.score}`);

  // 3b) Plafond anti-farm sur les kills + multiplicateur de groupe.
  const t3b = await page.evaluate(() => {
    totalKills    = 999;                       // farm massif
    currentFloor  = 4;
    visitedFloors = new Set([1, 2, 3, 4]);
    const capped  = computeIronmanScore();     // partySize = 1
    const beforePS = partySize;
    partySize = 2; const duo  = computeIronmanScore().partyMult;
    partySize = 1; const solo = computeIronmanScore().partyMult;
    partySize = beforePS;
    // Restaure l'état de T3 pour la suite du scénario.
    totalKills = 20; currentFloor = 3; visitedFloors = new Set([1, 2, 3, 4, 5]);
    return {
      killsPts:     capped.breakdown.kills,
      killsCounted: capped.killsCounted,
      killsCapped:  capped.killsCapped,
      duo, solo,
    };
  });
  console.log('  T3b plafond + groupe :', t3b);
  // étage 4 → plafond 4×12 = 48 kills crédités (au lieu de 999)
  assert(t3b.killsCounted === 48,  'kills plafonnés à étage×12 attendu 48');
  assert(t3b.killsPts === 480,     'points de kills attendus 480 (48×10)');
  assert(t3b.killsCapped === true, 'killsCapped doit être vrai au-delà du plafond');
  assert(t3b.solo === 1.3 && t3b.duo === 1.0,
    'partyMult attendu : solo ×1.3, duo ×1.0');

  // 4) Mort en Ironman → écran de résultat + permadeath stricte.
  const t4 = await page.evaluate(() => {
    // Prépare un slot Ironman et un slot non-Ironman.
    ironmanMode = true;
    writeSlot('manual_1', 'run ironman');
    ironmanMode = false;
    writeSlot('manual_2', 'partie normale');
    ironmanMode = true;
    triggerDeath('Test de mort Ironman');
    return {
      resultVisible: document.getElementById('ironman-result-screen').style.display === 'flex',
      deathVisible:  document.getElementById('death-screen').style.display === 'flex',
      petrifyShown:  !!document.getElementById('cfx-petrify'),
      score:         _ironmanLastResult && _ironmanLastResult.score,
      ironmanSlotGone: readSlot('manual_1') === null,
      normalSlotKept:  readSlot('manual_2') !== null,
    };
  });
  console.log('  T4 mort :', t4);
  assert(t4.resultVisible,  'écran de résultat Ironman doit être visible');
  assert(!t4.deathVisible,  'écran de mort ne doit PAS être visible en Ironman');
  assert(!t4.petrifyShown,  'pétrification (C2) ne doit PAS se jouer en Ironman');
  assert(t4.score === 3640, 'le résultat doit porter le score calculé');
  assert(t4.ironmanSlotGone, 'le slot Ironman doit être supprimé à la mort (permadeath)');
  assert(t4.normalSlotKept,  'un slot non-Ironman doit être préservé à la mort Ironman');

  // 5) Soumission du score → stockage local + pseudonyme persistant.
  const t5 = await page.evaluate(async () => {
    document.getElementById('hof-name-input').value = 'Testeur';
    await submitIronmanScore();
    const raw = localStorage.getItem('hogwarts_rpg_hof');
    const arr = raw ? JSON.parse(raw) : [];
    return { count: arr.length, top: arr[0], savedName: getPlayerName() };
  });
  console.log('  T5 soumission :', { count: t5.count, name: t5.top && t5.top.player_name,
    savedName: t5.savedName, house: t5.top && t5.top.house });
  assert(t5.count === 1,                   'le score doit être stocké localement');
  assert(t5.top.player_name === 'Testeur', 'le nom soumis doit être conservé');
  assert(t5.top.score === 3640,            'le score stocké doit valoir 3640');
  assert(typeof t5.top.run_id === 'string' && t5.top.run_id.length >= 8,
    "l'entrée doit porter un run_id");
  assert(t5.savedName === 'Testeur',       'le pseudonyme doit être persisté en localStorage');
  assert(t5.top.house === 'Gryffondor',
    `l'entrée doit porter la Maison du joueur, obtenu ${t5.top.house}`);

  // 6) Écran Hall of Fame : rendu de la liste + médaille PNG + blason + chips.
  await page.evaluate(() => openHallOfFame());
  await page.waitForFunction(() =>
    document.querySelectorAll('#hof-list .hof-row').length > 0, { timeout: 3000 });
  const t6 = await page.evaluate(() => ({
    screenVisible: document.getElementById('hall-of-fame-screen').style.display === 'flex',
    rows:          document.querySelectorAll('#hof-list .hof-row').length,
    firstName:     document.querySelector('#hof-list .hof-name')?.textContent,
    hasMedal:      !!document.querySelector('#hof-list .hof-row .hof-medal'),
    heroAvatar:    document.querySelector('#hof-list .hof-hero-av img')?.getAttribute('src'),
    houseBadge:    document.querySelector('#hof-list .hof-house-badge img')?.getAttribute('src'),
    chipFloor:     document.querySelector('#hof-list .hof-chip-floor')?.textContent,
    chipLevel:     document.querySelector('#hof-list .hof-chip-level')?.textContent,
  }));
  console.log('  T6 Hall of Fame :', t6);
  assert(t6.screenVisible,          'écran Hall of Fame doit être visible');
  assert(t6.rows === 1,             'la liste doit afficher 1 entrée');
  assert(t6.firstName === 'Testeur','le top 1 doit être Testeur');
  assert(t6.hasMedal,               'le rang 1 doit afficher une médaille PNG');
  assert(t6.heroAvatar === 'img/harry.png',
    `le portrait du sorcier doit être affiché, obtenu ${t6.heroAvatar}`);
  assert(t6.houseBadge === 'img/houses/gryffondor.png',
    `le blason de Maison doit être affiché, obtenu ${t6.houseBadge}`);
  assert(/Ét\.\s*5/.test(t6.chipFloor || ''),
    `chip Étage doit afficher "Ét.5" (deepestFloor de T3), obtenu "${t6.chipFloor}"`);
  assert(/Niv\.\s*8/.test(t6.chipLevel || ''),
    `chip Niveau doit afficher "Niv.8", obtenu "${t6.chipLevel}"`);

  // 6b) Simulation de rang depuis la fiche perso (bouton « Mon rang »).
  const t6b = await page.evaluate(async () => {
    ironmanMode = true;
    const proj = _hofBuildProjection();
    const rank = await _hofRankForScore(proj.score);
    await _renderHallOfFame(proj);
    openCharacter(0);
    const btnPresent = document.getElementById('char-detail')
      .innerHTML.includes('openHofProjection');
    document.getElementById('character-modal').style.display = 'none';
    return {
      score:    proj.score,
      name:     proj.player_name,
      rank,
      projRow:  !!document.querySelector('#hof-list .hof-row-projection'),
      projNote: !!document.querySelector('#hof-list .hof-proj-note'),
      btnPresent,
    };
  });
  console.log('  T6b simulation de rang :', t6b);
  assert(t6b.score === 3640,  `score projeté attendu 3640, obtenu ${t6b.score}`);
  assert(t6b.name === 'Testeur', `nom projeté attendu Testeur, obtenu ${t6b.name}`);
  assert(t6b.rank === 1,      `rang projeté attendu 1, obtenu ${t6b.rank}`);
  assert(t6b.projRow,         'la ligne de simulation doit être rendue');
  assert(t6b.projNote,        'la note de simulation doit être affichée');
  assert(t6b.btnPresent,      'le bouton « Mon rang » doit figurer sur la fiche Ironman');

  // 7) Anti double-classement : run déjà soumis détecté + re-soumission bloquée.
  const t7 = await page.evaluate(async () => {
    const found = await _hofFindByRunId(ironmanRunId);
    await verifyIronmanRunNotScored();
    const btn = document.getElementById('hof-submit-btn');
    await submitIronmanScore();                     // tentative de doublon
    const raw = localStorage.getItem('hogwarts_rpg_hof');
    const arr = raw ? JSON.parse(raw) : [];
    return {
      foundByRunId:    !!found,
      runScored:       _ironmanRunScored,
      btnDisabled:     btn.disabled,
      countAfterRetry: arr.length,
    };
  });
  console.log('  T7 anti-doublon :', t7);
  assert(t7.foundByRunId,           '_hofFindByRunId doit retrouver le run soumis');
  assert(t7.runScored,              'le run doit être marqué déjà classé');
  assert(t7.btnDisabled,            'le bouton doit être désactivé pour un run déjà classé');
  assert(t7.countAfterRetry === 1,  'une re-soumission ne doit pas créer de doublon');

  // 8) Round-trip save : ironmanMode / totalKills / defeatedBosses / runId.
  const t8 = await page.evaluate(() => {
    ironmanMode    = true;
    totalKills     = 42;
    defeatedBosses = new Set(['nagini']);
    ironmanRunId   = 'fixed-run-12345678';
    const snap = _serializeState();
    ironmanMode = false; totalKills = 0; defeatedBosses = new Set(); ironmanRunId = null;
    _applyState(snap);
    const kept = ironmanRunId;
    // Save Ironman sans UID → régénération à _applyState.
    delete snap.ironmanRunId;
    ironmanRunId = null;
    _applyState(snap);
    return {
      ironmanMode, totalKills, bosses: Array.from(defeatedBosses),
      kept, regenerated: !!ironmanRunId && ironmanRunId !== 'fixed-run-12345678',
    };
  });
  console.log('  T8 round-trip :', t8);
  assert(t8.ironmanMode === true,            'ironmanMode doit survivre au save');
  assert(t8.totalKills === 42,               'totalKills doit survivre au save');
  assert(t8.bosses.length === 1 && t8.bosses[0] === 'nagini',
    'defeatedBosses doit survivre au save');
  assert(t8.kept === 'fixed-run-12345678',   'ironmanRunId doit survivre au round-trip');
  assert(t8.regenerated, 'un save Ironman sans UID doit en générer un au chargement');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Mode Ironman + Hall of Fame OK');
  await browser.close();
}

async function scenarioContentConsumablesTradeoffs() {
  console.log('\n── Scénario : consommables à effet + items trade-off ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 200 });

  // T1 — Antidote purge les DoT (burn/poison) mais pas weaken.
  const t1 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = [];
    applyStatus(c, 'burn',   5, 3);
    applyStatus(c, 'poison', 3, 3);
    applyStatus(c, 'weaken', 2, 3);
    const item = ITEMS.find(i => i.id === 'elixir_antidote');
    _applyConsumableEffect(item, c);
    return { ids: c.statusEffects.map(s => s.id) };
  });
  console.log('  T1 cure   :', t1);
  assert(!t1.ids.includes('burn') && !t1.ids.includes('poison'), 'antidote doit purger burn/poison');
  assert(t1.ids.includes('weaken'), 'antidote ne doit pas retirer weaken');

  // T2 — Régénération pose le statut regen.
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = [];
    _applyConsumableEffect(ITEMS.find(i => i.id === 'elixir_regen'), c);
    const r = c.statusEffects.find(s => s.id === 'regen');
    return { has: !!r, power: r && r.power, turns: r && r.turns };
  });
  console.log('  T2 regen  :', t2);
  assert(t2.has && t2.power === 6 && t2.turns === 4, 'élixir de régén doit poser regen 6/4');

  // T3 — Résistance pose le statut resist_buff (réduction de dégâts).
  const t3 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = [];
    _applyConsumableEffect(ITEMS.find(i => i.id === 'potion_resistance'), c);
    const r = c.statusEffects.find(s => s.id === 'resist_buff');
    const mult = _resistMult(c);
    return { has: !!r, power: r && r.power, turns: r && r.turns, mult };
  });
  console.log('  T3 resist :', t3);
  assert(t3.has && t3.power === 40 && t3.turns === 3, 'potion de résistance doit poser resist_buff 40/3');
  assert(Math.abs(t3.mult - 0.6) < 1e-9, `_resistMult doit valoir 0.6 (obtenu ${t3.mult})`);

  // T4 — Item trade-off : ATK+7 / DEF−2 appliqué par recalculateStats.
  const t4 = await page.evaluate(() => {
    const c = party[0];
    // Baseline propre : T1 a laissé un weaken (malus DEF direct non réappliqué
    // par recalculateStats) — on le purge pour isoler le trade-off de l'arme.
    c.statusEffects = []; recalculateStats();
    const atk0 = c.atk, def0 = c.def;
    const clone = JSON.parse(JSON.stringify(ITEMS.find(i => i.id === 'lame_sanguinaire')));
    player.inventory.push(clone);
    equipItem(player.inventory.length - 1, 0);
    return { datk: c.atk - atk0, ddef: c.def - def0 };
  });
  console.log('  T4 trade  :', t4);
  assert(t4.datk === 7,  `lame sanguinaire ATK+7 attendu, obtenu ${t4.datk}`);
  assert(t4.ddef === -2, `lame sanguinaire DEF−2 attendu, obtenu ${t4.ddef}`);

  // T5 — Anneau de Furie : crit +12 / esquive −6 sur les stats dérivées.
  const t5 = await page.evaluate(() => {
    const c = party[0];
    const crit0 = c.critChance, dodge0 = c.dodgeChance;
    const clone = JSON.parse(JSON.stringify(ITEMS.find(i => i.id === 'anneau_furie')));
    player.inventory.push(clone);
    equipItem(player.inventory.length - 1, 0);
    return { dcrit: c.critChance - crit0, ddodge: c.dodgeChance - dodge0 };
  });
  console.log('  T5 furie  :', t5);
  assert(t5.dcrit === 12, `anneau de furie crit +12 attendu, obtenu ${t5.dcrit}`);
  assert(t5.ddodge === -6, `anneau de furie esquive −6 attendu, obtenu ${t5.ddodge}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (contenu C)`);
  }
  console.log('  ✅ consommables à effet + items trade-off OK');
  await browser.close();
}

// ÉTAPE 2 (ch05 §5.4) — Voix des héros (barks). Vérifie : registre chargé,
// bark loggé en combat, silence quand barksEnabled=false, round-trip save.
async function scenarioHeroBarks() {
  console.log('\n── Scénario : voix des héros (barks) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // Module chargé + orchestrateur exposé.
  const loaded = await page.evaluate(() => ({
    hasRegistry: typeof HERO_BARKS !== 'undefined' && Object.keys(HERO_BARKS).length === 16,
    hasFn:       typeof heroBark === 'function' && typeof pickHeroBark === 'function',
    defaultOn:   barksEnabled === true
  }));
  console.log('  chargement :', loaded);
  assert(loaded.hasRegistry, 'HERO_BARKS absent ou ≠ 16 héros');
  assert(loaded.hasFn,       'heroBark/pickHeroBark non exposés');
  assert(loaded.defaultOn,   'barksEnabled doit valoir true par défaut');

  // Bark loggé quand actif (canal combat → #combat-log-list).
  const on = await page.evaluate(() => {
    barksEnabled = true;
    if (window.UX && UX.clearCombatLog) UX.clearCombatLog();
    const before = (document.getElementById('combat-log-list') || {}).childElementCount || 0;
    const txt = heroBark('harry', 'crit');
    const after = (document.getElementById('combat-log-list') || {}).childElementCount || 0;
    return { txt, added: after - before };
  });
  console.log('  bark ON :', on);
  assert(typeof on.txt === 'string', 'aucun bark renvoyé alors que barksEnabled=true');
  assert(on.added >= 1, 'le bark de crit doit ajouter une ligne au journal de combat');

  // Silence quand désactivé.
  const off = await page.evaluate(() => {
    barksEnabled = false;
    const before = (document.getElementById('combat-log-list') || {}).childElementCount || 0;
    const txt = heroBark('hermione', 'bossAppear');
    const after = (document.getElementById('combat-log-list') || {}).childElementCount || 0;
    return { txt, added: after - before };
  });
  console.log('  bark OFF :', off);
  assert(off.txt === null, 'heroBark doit renvoyer null quand barksEnabled=false');
  assert(off.added === 0,  'aucune ligne ne doit être ajoutée quand barksEnabled=false');

  // Round-trip save : la préférence barksEnabled survit à serialize→apply.
  const rt = await page.evaluate(() => {
    barksEnabled = false;
    const snap = _serializeState();
    barksEnabled = true;            // simule un autre runtime
    _applyState(snap);
    return barksEnabled;
  });
  console.log('  round-trip barksEnabled :', rt);
  assert(rt === false, 'barksEnabled doit être préservé par le round-trip de save');

  // L6 — bouton de bascule « voix des héros » (#btn-barks) : flip + icône + pref.
  const toggle = await page.evaluate(() => {
    barksEnabled = true; _updateBarksBtn();
    const btn = document.getElementById('btn-barks');
    const iconOf = () => btn.querySelector('.btn-icon').textContent;
    const onIcon = iconOf();
    toggleBarks();                                  // → off
    const offState = { enabled: barksEnabled, icon: iconOf(), pressed: btn.getAttribute('aria-pressed'), pref: localStorage.getItem('hogwarts_rpg_barks_enabled') };
    toggleBarks();                                  // → on
    const onState = { enabled: barksEnabled, icon: iconOf(), pref: localStorage.getItem('hogwarts_rpg_barks_enabled') };
    return { exists: !!btn, onIcon, offState, onState };
  });
  console.log('  L6 toggle bouton :', toggle);
  assert(toggle.exists,                  '#btn-barks absent de la barre de commandes');
  assert(toggle.offState.enabled === false, 'toggleBarks doit désactiver barksEnabled');
  assert(toggle.offState.icon === '🤐',     'icône OFF du bouton barks incorrecte');
  assert(toggle.offState.pressed === 'true','aria-pressed doit valoir true quand coupé');
  assert(toggle.offState.pref === '0',      'préférence localStorage non écrite (off)');
  assert(toggle.onState.enabled === true,   'toggleBarks doit réactiver barksEnabled');
  assert(toggle.onState.pref === '1',       'préférence localStorage non écrite (on)');

  // L7 — voix parlée des barks (speakBark) gardée par voiceEnabled.
  const voice = await page.evaluate(() => {
    // Spy sur playVoice + OGG simulé : teste le gate voiceEnabled et le
    // routage OGG-first sans dépendre du moteur TTS (read-only en headless).
    let played = 0;
    const origPV = AudioSystem.playVoice;
    AudioSystem.playVoice = () => { played++; return Promise.resolve(); };
    AudioSystem._VOICE_SAMPLES = AudioSystem._VOICE_SAMPLES || {};
    AudioSystem._VOICE_SAMPLES['harry_crit'] = 'audio/voice/harry_crit.ogg';
    AudioSystem.isMuted = false;
    AudioSystem.voiceEnabled = false;
    AudioSystem.speakBark('x', 'harry_crit');   // voix off → aucun son
    const offPlayed = played;
    AudioSystem.voiceEnabled = true;
    AudioSystem.speakBark('x', 'harry_crit');   // voix on + OGG présent → playVoice
    const onPlayed = played;
    delete AudioSystem._VOICE_SAMPLES['harry_crit'];
    AudioSystem.playVoice = origPV;
    return { offPlayed, onPlayed };
  });
  console.log('  L7 speakBark :', voice);
  assert(voice.offPlayed === 0, 'speakBark ne doit pas jouer quand voiceEnabled=false');
  assert(voice.onPlayed === 1,  'speakBark doit router vers playVoice (OGG) quand voiceEnabled=true');

  // L8 — beat scénarisé : ne parle que si le héros visé est dans le groupe.
  const scripted = await page.evaluate(() => {
    barksEnabled = true; _barkSeen.clear();
    // Céleste absente (groupe Harry/Hermione) → silencieux.
    const absent = heroBarkScripted('celeste', 'fountainCold', { once: 'celeste-test' });
    // Simule la présence de Céleste sur le 2ᵉ slot.
    const saved = party[1].heroKey;
    party[1].heroKey = 'celeste'; party[1].hp = party[1].hpMax;
    const present = heroBarkScripted('celeste', 'fountainCold', { once: 'celeste-test2' });
    const repeat  = heroBarkScripted('celeste', 'fountainCold', { once: 'celeste-test2' }); // one-shot
    // Beat Cedric « on quitte l'école » (transition 3↔4) — même mécanique.
    party[1].heroKey = 'cedric'; party[1].hp = party[1].hpMax;
    const cedric = heroBarkScripted('cedric', 'leaveSchool', { once: 'cedric-test' });
    party[1].heroKey = saved;
    return { absent, present, repeat, cedric };
  });
  console.log('  L8 beat scénarisé :', scripted);
  assert(scripted.absent === null,            'beat scénarisé ne doit pas parler si le héros est absent');
  assert(typeof scripted.present === 'string','beat scénarisé doit parler si le héros est présent');
  assert(scripted.repeat === null,            'beat scénarisé one-shot ne doit pas se répéter');
  assert(typeof scripted.cedric === 'string', 'beat Cedric leaveSchool doit parler si Cedric est présent');

  // L7 — profils de voix par héros : chaque héros du registre de barks a un
  // timbre distinct (pitch/rate valides) ; speakBark ne lève pas même sans OGG.
  const voiceProf = await page.evaluate(() => {
    const HV = AudioSystem.HERO_VOICE || {};
    const heroes = Object.keys(HERO_BARKS);
    const allCovered = heroes.every(k => HV[k] && typeof HV[k].pitch === 'number' && typeof HV[k].rate === 'number');
    const inRange = Object.values(HV).every(p => p.pitch >= 0 && p.pitch <= 2 && p.rate >= 0.1 && p.rate <= 10);
    // Au moins 2 timbres distincts → la différenciation est réelle.
    const distinct = new Set(Object.values(HV).map(p => p.pitch + '/' + p.rate)).size;
    // speakBark défensif : ne doit pas throw même voix coupée.
    let threw = false;
    try { AudioSystem.voiceEnabled = false; AudioSystem.speakBark('test', 'harry_crit'); }
    catch (e) { threw = true; }
    return { count: Object.keys(HV).length, allCovered, inRange, distinct, threw };
  });
  console.log('  L7 profils voix :', voiceProf);
  assert(voiceProf.allCovered,        'chaque héros de HERO_BARKS doit avoir un profil HERO_VOICE');
  assert(voiceProf.inRange,           'pitch/rate des profils de voix hors plage SpeechSynthesis');
  assert(voiceProf.distinct >= 5,     'les profils de voix doivent offrir des timbres variés');
  assert(!voiceProf.threw,            'speakBark ne doit jamais lever (défensif)');

  // L7c — modulation par émotion : pour un même héros, l'événement change
  // l'intonation (crit triomphant ≠ allyDown grave), tout en restant borné.
  const emo = await page.evaluate(() => {
    const P = vk => AudioSystem._barkVoiceParams(vk);
    const crit  = P('harry_crit');
    const down  = P('harry_allyDown');
    const base  = AudioSystem.HERO_VOICE.harry;
    const neutral = P('harry_inconnu'); // événement absent → ×1.0 (profil de base)
    const noHero  = P('zzz_crit');      // héros absent → base neutre × émotion
    // Bornage : profil extrême × émotion montante reste ≤ 2 / ≤ 10.
    const allBounded = ['harry','iris','maxence','olivier'].every(h => {
      const r = P(h + '_crit');
      return r.pitch <= 2 && r.pitch >= 0 && r.rate <= 10 && r.rate >= 0.1;
    });
    return {
      critUp:   crit.pitch > down.pitch && crit.rate > down.rate,
      neutralIsBase: Math.abs(neutral.pitch - base.pitch) < 1e-9 && Math.abs(neutral.rate - base.rate) < 1e-9,
      noHeroOk: typeof noHero.pitch === 'number' && noHero.gender === null,
      allBounded,
    };
  });
  console.log('  L7c émotion :', emo);
  assert(emo.critUp,        'crit doit sonner plus haut/vif que allyDown pour un même héros');
  assert(emo.neutralIsBase, 'événement inconnu doit retomber sur le profil de base (×1.0)');
  assert(emo.noHeroOk,      'héros inconnu doit donner un profil neutre sans lever');
  assert(emo.allBounded,    'pitch/rate modulés doivent rester dans la plage SpeechSynthesis');

  // L7d — jitter humanisant : ± borné, centré (rng=0.5 → inchangé), variable.
  const jit = await page.evaluate(() => {
    const base = AudioSystem._barkVoiceParams('harry_crit');
    const centered = AudioSystem._voiceJitter(base, () => 0.5);     // 0.5*2-1=0 → aucun delta
    const low      = AudioSystem._voiceJitter(base, () => 0);       // delta minimal (−amplitude)
    const high     = AudioSystem._voiceJitter(base, () => 1);       // delta maximal (+amplitude)
    const PJ = AudioSystem._PITCH_JITTER, RJ = AudioSystem._RATE_JITTER;
    // Deux tirages aléatoires successifs diffèrent (quasi-sûr).
    const a = AudioSystem._voiceJitter(base), b = AudioSystem._voiceJitter(base);
    return {
      centeredEqual: Math.abs(centered.pitch - base.pitch) < 1e-9 && Math.abs(centered.rate - base.rate) < 1e-9,
      lowDown:  low.pitch  < base.pitch && low.rate  < base.rate,
      highUp:   high.pitch > base.pitch && high.rate > base.rate,
      bounded:  Math.abs(low.pitch - base.pitch) <= PJ + 1e-9 && Math.abs(high.rate - base.rate) <= RJ + 1e-9,
      varies:   a.pitch !== b.pitch || a.rate !== b.rate,
      inRange:  high.pitch <= 2 && low.pitch >= 0 && high.rate <= 10 && low.rate >= 0.1,
    };
  });
  console.log('  L7d jitter :', jit);
  assert(jit.centeredEqual, 'jitter centré (rng=0.5) ne doit rien changer');
  assert(jit.lowDown,       'jitter rng=0 doit abaisser pitch et rate');
  assert(jit.highUp,        'jitter rng=1 doit relever pitch et rate');
  assert(jit.bounded,       'le jitter ne doit pas dépasser son amplitude');
  assert(jit.varies,        'deux énoncés successifs doivent varier (anti-robotique)');
  assert(jit.inRange,       'pitch/rate jittés doivent rester dans la plage SpeechSynthesis');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (barks)`);
  }
  console.log('  ✅ Voix des héros conforme (registre + log + toggle + save)');
  await browser.close();
}

// 0.3 — Confirmation explicite de la permadeath à l'activation d'Ironman.
// Cocher la case ouvre une modale ; Annuler décoche, Confirmer retient.
async function scenarioIronmanConfirm() {
  console.log('\n── Scénario : confirmation d\'activation Ironman (0.3) ──');
  const { browser, page, errors } = await launchGame();

  const t = await page.evaluate(() => {
    const cb    = document.getElementById('ironman-toggle');
    const modal = document.getElementById('ironman-confirm-modal');
    cb.checked = false;
    // 1) cocher (event utilisateur) → la modale de confirmation s'ouvre.
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const opened = modal.style.display === 'flex';
    // 2) Annuler → case décochée + modale fermée.
    cancelIronman();
    const afterCancel = { checked: cb.checked, modal: modal.style.display };
    // 3) re-cocher → modale rouverte → Confirmer → case retenue + modale fermée.
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const reopened = modal.style.display === 'flex';
    confirmIronman();
    const afterConfirm = { checked: cb.checked, modal: modal.style.display };
    return { opened, afterCancel, reopened, afterConfirm };
  });
  console.log('  flux →', t);
  assert(t.opened,                        'cocher Ironman doit ouvrir la modale de confirmation');
  assert(t.afterCancel.checked === false, 'Annuler doit décocher Ironman');
  assert(t.afterCancel.modal === 'none',  'Annuler doit fermer la modale');
  assert(t.reopened,                      're-cocher doit rouvrir la modale');
  assert(t.afterConfirm.checked === true, 'Confirmer doit conserver Ironman coché');
  assert(t.afterConfirm.modal === 'none', 'Confirmer doit fermer la modale');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Confirmation d\'activation Ironman OK');
  await browser.close();
}

// ── QA parcours complet — bout-en-bout DUO (Roadmap Phase 4) ──
// Les scénarios endgame existants (scenarioVictoryTrigger, scenarioDarkLoopV1-4,
// scenarioVictorySpeechVariants, scenarioCh13EndgamePivot…) couvrent chaque beat
// du parcours, mais TOUS en solo (partySize 1) et de façon morcelée (état forcé,
// instances séparées). Ce scénario comble la lacune : il enchaîne, dans UNE seule
// instance DUO, la chaîne contiguë intro → groupe duo → entrée en Boucle →
// discours de victoire (4 Maisons) → Briser le Cycle → persistance. Garde-fou
// d'intégrité de séquence (fuite d'état entre phases) que les tests morcelés ne
// captent pas. Complète le solo scenarioDarkLoopV3 (codex.js).
async function scenarioFullJourneyDuo() {
  console.log('\n── Scénario : QA parcours complet — bout-en-bout DUO ──');
  const { browser, page, errors } = await launchGame();
  // skipIntro:true (défaut) déroule TOUTES les pages d'intro Dumbledore
  // (_advanceIntro × N puis _finishIntro) avant startGame() — c.-à-d. exerce
  // bien le flux d'intro/tutoriel, en duo, plutôt que de le court-circuiter.
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Serpentard' });

  // (1) Groupe duo bien constitué après l'intro.
  const duo = await page.evaluate(() => ({
    size: partySize,
    bothAlive: Array.isArray(party) && party[0] && party[1] && party[0].hp > 0 && party[1].hp > 0,
    house: chosenHouse,
  }));
  console.log('  duo :', duo);
  assert(duo.size === 2, 'partySize devrait être 2');
  assert(duo.bothAlive, 'les deux héros devraient être vivants après l\'intro');
  assert(duo.house === 'Serpentard', 'chosenHouse devrait être Serpentard');

  // (2) Entrée en Boucle Ténébreuse (post-victoire) : crédit d'Éclats en duo.
  const loop = await page.evaluate(() => {
    victoryAchieved = true; accumulatedEclats = 0;
    floorReached = 10;
    _maybeAdvanceDarkLoop(10, 11);   // entrée Boucle 1 (+1)
    floorReached = 11;
    _maybeAdvanceDarkLoop(11, 12);   // +1
    return { eclats: accumulatedEclats, loop11: loopNumber(11), loop21: loopNumber(21) };
  });
  console.log('  loop :', loop);
  assert(loop.eclats === 2, `2 étages franchis en Boucle = 2 Éclats (obtenu ${loop.eclats})`);
  assert(loop.loop11 === 1 && loop.loop21 === 2, 'loopNumber incorrect aux paliers de Boucle');

  // (3) Discours de victoire — un dernier mot distinct par Maison (les 4).
  const speech = await page.evaluate(() => {
    const el = document.getElementById('victory-speech');
    const founders = { Gryffondor: 'Godric', Serpentard: 'Salazar', Serdaigle: 'Rowena', Poufsouffle: 'Helga' };
    const res = {};
    for (const h of Object.keys(founders)) {
      chosenHouse = h;
      showVictoryScreen();
      res[h] = el.innerHTML.includes(founders[h]);
      closeVictoryScreen();
    }
    chosenHouse = 'Serpentard';
    return res;
  });
  console.log('  speech (4 Maisons) :', speech);
  assert(speech.Gryffondor && speech.Serpentard && speech.Serdaigle && speech.Poufsouffle,
    'le discours de victoire devrait être coloré par chacune des 4 Maisons');

  // (4) Briser le Cycle — flux complet en duo (3 jalons → choix → cinématique).
  const broke = await page.evaluate(() => {
    seenEchoes = new Set(); seenEchoes.add('echo_scene_sceau');   // jalon I
    accumulatedEclats = 15;                                        // jalon II
    if (typeof seenMonsters !== 'undefined') seenMonsters.add('reflet_mythe');
    monsterKills = { reflet_mythe: 1 };                            // jalon III
    const offered = maybeOfferBreakCycle([{ id: 'reflet_mythe' }]);
    openBreakCycleModal();
    confirmBreakCycle();   // 1/3
    advanceBreakCycle();   // 2/3
    advanceBreakCycle();   // 3/3
    finishBreakCycle();
    checkCodexUnlocks('cycle-broken');
    const ov = document.getElementById('break-cycle-overlay');
    return { offered, broken: cycleBroken === true, hidden: ov && ov.style.display === 'none',
             codex: unlockedCodexEntries.has('cycle_brise') };
  });
  console.log('  broke :', broke);
  assert(broke.offered === true, 'le choix « Briser » devrait être proposé (3 jalons remplis)');
  assert(broke.broken, 'cycleBroken devrait être true après Briser (duo)');
  assert(broke.hidden, 'la modale de Briser devrait se fermer après la cinématique');
  assert(broke.codex, 'cycle_brise devrait être déverrouillée dans le Codex');

  // (5) Persistance : l'état de fin survit à un cycle save/load (toujours en duo).
  const persisted = await page.evaluate(() => {
    const gs = _serializeState();
    cycleBroken = false; partySize = 1;
    _applyState(gs);
    return { broken: cycleBroken === true, duo: partySize === 2 };
  });
  assert(persisted.broken, 'cycleBroken non sérialisé/restauré');
  assert(persisted.duo, 'partySize duo non sérialisé/restauré');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (parcours complet duo)`);
  }
  console.log('  ✅ QA parcours complet DUO : intro → Boucle → victoire (4 Maisons) → Briser le Cycle → save/load OK');
  await browser.close();
}

// Ch.13 P4 (§13.9.H) — logger d'équilibrage BALANCE_DEBUG opt-in/local/anonyme.
// Vérifie : NO-OP sans flag, accumulation après activation (combat + sort
// exploitant une faiblesse), métriques dérivées, export JSON non vide.
async function scenarioBalanceLog() {
  console.log('\n── Scénario : logger d\'équilibrage BALANCE_DEBUG (Ch.13 P4) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1. Flag absent → record() est un NO-OP total (zéro persistance).
  const off = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_balance_debug');
    localStorage.removeItem('hogwarts_rpg_balance_log');
    BalanceLog.record('battle', { outcome: 'win' });
    return { enabled: BalanceLog.enabled(), stored: localStorage.getItem('hogwarts_rpg_balance_log') };
  });
  assert(off.enabled === false, 'flag off → enabled() doit être false');
  assert(off.stored === null, 'flag off → record() ne doit RIEN persister');

  // 2. Table de niveau attendu (report §1) → underLevelGap.
  const exp = await page.evaluate(() => ({
    solo8: BalanceLog._expectedLevel(8, 'Solo'),
    duo10: BalanceLog._expectedLevel(10, 'Duo'),
  }));
  assert(exp.solo8 === 9, `_expectedLevel(8,Solo) doit valoir 9 (obtenu ${exp.solo8})`);
  assert(exp.duo10 === 11, `_expectedLevel(10,Duo) doit valoir 11 (obtenu ${exp.duo10})`);

  // 3. Active le flag, combat réel : sort exploitant une faiblesse + victoire.
  await page.evaluate(() => { localStorage.setItem('hogwarts_balance_debug', '1'); BalanceLog.clear(); });
  await startDummyFight(page, { hp: 300 });
  await page.evaluate(() => {
    enemyGroup[0].weak = ['feu'];
    const c = getActiveChar(); c.sp = 99;
    castSpellInBattle('Incendio', 0);       // élément feu → exploite la faiblesse
  });
  await page.evaluate(() => { enemyGroup.forEach(e => { e.currentHp = 0; }); endBattle(true); });

  const res = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('hogwarts_rpg_balance_log'));
    const sum = BalanceLog.summary();
    const json = BalanceLog.export();
    return {
      battles: store.battles.length,
      spellCasts: store.spellCasts,
      weak: store.weaknessExploits,
      synergy: sum.synergyUsageRate,
      jsonLen: json.length,
    };
  });
  console.log('  log    :', res);
  assert(res.battles >= 1, 'au moins 1 combat doit être loggé');
  assert(res.spellCasts >= 1, 'au moins 1 sort doit être loggé');
  assert(res.weak >= 1, 'l\'exploitation de faiblesse doit être comptée');
  assert(res.synergy > 0, 'synergyUsageRate dérivé doit être > 0');
  assert(res.jsonLen > 0, 'export() doit produire un JSON non vide');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (BALANCE_DEBUG)`);
  }
  console.log('  ✅ logger BALANCE_DEBUG : no-op sans flag, accumulation + export OK');
  await browser.close();
}

// P2.2 — boussole d'endgame : bouton masqué avant victoire, modale post-victoire
// listant les destinations avec leurs états dérivés.
async function scenarioEndgameCompass() {
  console.log('\n── Scénario : boussole d\'endgame (P2.2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : avant victoire, le bouton est masqué.
  const t1 = await page.evaluate(() => {
    victoryAchieved = false; updateUI();
    const btn = document.getElementById('btn-endgame-compass');
    return { hasBtn: !!btn, hidden: btn && btn.style.display === 'none',
             hasFn: typeof openEndgameCompass === 'function' && typeof endgameDestinations === 'function' };
  });
  console.log('  T1:', t1);
  assert(t1.hasBtn, '#btn-endgame-compass absent');
  assert(t1.hasFn, 'API boussole non exposée');
  assert(t1.hidden, 'le bouton doit être masqué avant victoire');

  // T2 : post-victoire, bouton visible + modale rendue avec 4 destinations.
  const t2 = await page.evaluate(() => {
    victoryAchieved = true; currentFloor = 17; accumulatedEclats = 15; houseTier = 18;
    updateUI();
    const btnVisible = document.getElementById('btn-endgame-compass').style.display !== 'none';
    openEndgameCompass();
    const modal = document.getElementById('endgame-compass-modal');
    const cards = document.querySelectorAll('#endgame-compass-list > div').length;
    const html  = document.getElementById('endgame-compass-list').innerHTML;
    return { btnVisible, open: modal.style.display === 'flex', cards,
             hasGardien: html.includes('Gardien'), hasChambre: html.includes('Gryffondor') };
  });
  console.log('  T2:', t2);
  assert(t2.btnVisible, 'le bouton doit être visible post-victoire');
  assert(t2.open, 'la modale boussole doit s\'ouvrir');
  assert(t2.cards === 4, `4 destinations attendues, got ${t2.cards}`);
  assert(t2.hasGardien && t2.hasChambre, 'destinations clés absentes du rendu');

  // T3 : fermeture.
  const t3 = await page.evaluate(() => {
    closeEndgameCompass();
    return { closed: document.getElementById('endgame-compass-modal').style.display === 'none' };
  });
  assert(t3.closed, 'la modale doit se fermer');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (boussole endgame)`);
  }
  console.log('  ✅ Boussole d\'endgame conforme');
  await browser.close();
}

// M1 (polish UX) — barre d'onglets Grimoire : navigation inter-modales sans
// cul-de-sac (Fiche / Sac / Sorts / Bestiaire / Codex / Quêtes).
async function scenarioGrimoireTabs() {
  console.log('\n── Scénario : barre d\'onglets Grimoire (M1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : la fiche monte le ruban (6 onglets, actif = Fiche).
  const t1 = await page.evaluate(() => {
    openCharacter();
    const mount = document.querySelector('#character-modal [data-grimoire-tabs]');
    const tabs  = mount ? mount.querySelectorAll('.grimoire-tab').length : 0;
    const active = mount ? mount.querySelector('.grimoire-tab.active') : null;
    return {
      visible: getComputedStyle(document.getElementById('character-modal')).display !== 'none',
      tabs,
      activeIsFiche: !!active && /Fiche/.test(active.textContent),
      activeAria: !!(active && active.getAttribute('aria-current'))
    };
  });
  console.log('  T1 fiche:', t1);
  assert(t1.visible,        'la fiche doit être ouverte');
  assert(t1.tabs === 6,     'le ruban doit compter 6 onglets');
  assert(t1.activeIsFiche,  'l\'onglet actif doit être Fiche');
  assert(t1.activeAria,     'l\'onglet actif doit porter aria-current');

  // T2 : grimoireGoto('sac') ferme la fiche et ouvre le sac (1 clic, pas de
  //      cul-de-sac), avec son propre ruban.
  const t2 = await page.evaluate(() => {
    grimoireGoto('sac');
    return {
      charHidden: getComputedStyle(document.getElementById('character-modal')).display === 'none',
      invVisible: getComputedStyle(document.getElementById('inventory-modal')).display !== 'none',
      invTabs:    document.querySelectorAll('#inventory-modal [data-grimoire-tabs] .grimoire-tab').length,
      activeIsSac: !!document.querySelector('#inventory-modal [data-grimoire-tabs] .grimoire-tab.active')
                   && /Sac/.test(document.querySelector('#inventory-modal [data-grimoire-tabs] .grimoire-tab.active').textContent)
    };
  });
  console.log('  T2 → sac:', t2);
  assert(t2.charHidden,  'la fiche doit se fermer en basculant vers le Sac');
  assert(t2.invVisible,  'le Sac doit s\'ouvrir');
  assert(t2.invTabs === 6, 'le Sac doit aussi porter le ruban (6 onglets)');
  assert(t2.activeIsSac, 'l\'onglet actif du Sac doit être Sac');

  // T3 : enchaîne Sorts → Bestiaire → Codex → Quêtes, une seule modale visible.
  const t3 = await page.evaluate(() => {
    const ids = ['character-modal', 'inventory-modal', 'spell-modal', 'bestiary-modal', 'codex-modal'];
    const out = {};
    const visibleCount = () => ids.filter(id => getComputedStyle(document.getElementById(id)).display !== 'none').length;
    grimoireGoto('sorts');     out.spell   = getComputedStyle(document.getElementById('spell-modal')).display !== 'none';
    grimoireGoto('bestiaire'); out.best    = getComputedStyle(document.getElementById('bestiary-modal')).display !== 'none';
    grimoireGoto('codex');     out.codex   = getComputedStyle(document.getElementById('codex-modal')).display !== 'none';
    out.singleVisible = visibleCount();      // codex seul (quêtes réutilise character-modal)
    grimoireGoto('quetes');    out.quetes  = getComputedStyle(document.getElementById('character-modal')).display !== 'none';
    out.questActive = !!document.querySelector('#character-modal [data-grimoire-tabs] .grimoire-tab.active')
                      && /Quêtes/.test(document.querySelector('#character-modal [data-grimoire-tabs] .grimoire-tab.active').textContent);
    out.afterQuetesVisible = visibleCount();
    return out;
  });
  console.log('  T3 chaîne:', t3);
  assert(t3.spell && t3.best && t3.codex, 'chaque onglet doit ouvrir sa modale');
  assert(t3.singleVisible === 1, 'une seule modale Grimoire visible à la fois');
  assert(t3.quetes && t3.questActive, 'Quêtes doit ouvrir la fiche avec l\'onglet Quêtes actif');
  assert(t3.afterQuetesVisible === 1, 'Quêtes ne doit pas laisser deux modales ouvertes');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (Grimoire tabs)`);
  }
  console.log('  ✅ Barre d\'onglets Grimoire conforme');
  await browser.close();
}

module.exports = { scenarios: [scenarioStartup, scenarioLoader, scenarioIronman, scenarioIronmanConfirm, scenarioContentConsumablesTradeoffs, scenarioHeroBarks, scenarioFullJourneyDuo, scenarioBalanceLog, scenarioEndgameCompass, scenarioGrimoireTabs] };
