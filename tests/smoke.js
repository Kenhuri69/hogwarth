// ============================================================
// Tests fumée — Hogwarth
// Usage : node tests/smoke.js
// Pré-requis : Playwright installé globalement (chromium)
// ============================================================

const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');
const path = require('path');

const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');

// ── Helpers réutilisables ────────────────────────────────────

function isIgnorableError(text) {
  // Bruit décorrélé du code (fonts CDN sur file://)
  return text.includes('ERR_CERT_AUTHORITY_INVALID')
      || text.includes('Failed to load resource')
      // Limite Chromium en file:// : les `mask-image: url(file://...)` du
      // wrapper .tinted-icon sont bloqués CORS. En production (HTTP) ça
      // marche. Cf. img/icons/_tint_demo.html et IMG_STYLE.md.
      || (text.includes('blocked by CORS policy')
          && text.includes('img/icons/items/'));
}

async function launchGame() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();
  const errors  = [];

  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');

  return { browser, page, errors };
}

// Bypass des écrans titre / sélection en appelant directement les fonctions globales
async function startNewGame(page, { partySize = 1, heroes = ['harry'], house = 'Gryffondor', skipIntro = true } = {}) {
  await page.evaluate((opts) => {
    selectedPartySize = opts.partySize;
    selectedHeroes    = opts.heroes;
    confirmHeroSelection();
    chooseHouse(opts.house);
  }, { partySize, heroes, house });

  // Le flow nouvelle partie passe désormais par #intro-screen
  // (Dumbledore guide) avant d'appeler startGame(). Par défaut, le helper
  // saute cette étape pour que les autres scénarios fonctionnent comme
  // avant. Mettre skipIntro=false pour la tester explicitement.
  if (skipIntro) {
    await page.waitForFunction(() =>
      document.getElementById('intro-screen') &&
      document.getElementById('intro-screen').style.display === 'flex',
      { timeout: 3000 });
    await page.evaluate(() => {
      while (typeof _introPage === 'number' &&
             typeof _introPages !== 'undefined' &&
             _introPage < _introPages.length - 1) {
        _advanceIntro();
      }
      _finishIntro();
    });
  }

  // Attendre que startGame() ait fini son init asynchrone (textures + dungeon)
  await page.waitForFunction(() =>
    Array.isArray(party) && party[0] && party[0].hp > 0
    && Array.isArray(enemyMap) && Array.isArray(enemyMap[0])
    && typeof playerX === 'number' && typeof playerY === 'number'
  );
}

// Lance un combat contre un mannequin neutre (pas de resist/weak)
async function startDummyFight(page, { hp = 50 } = {}) {
  await page.evaluate((hpVal) => {
    const enemy = {
      id: 'test_dummy', name: 'Mannequin', icon: '🎯',
      hp: hpVal, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'Test'
    };
    startBattle(enemy);
  }, hp);
  await page.waitForFunction(() => inBattle === true && enemyGroup.length > 0);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Scénario 1 : régression de démarrage ─────────────────────

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

// ── Scénario 2 : système de statuts persistants ──────────────

async function scenarioStatusEffects() {
  console.log('\n── Scénario 2 : statuts persistants ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 50 });

  // T1 : applyStatus pose le statut + pilule rendue (icône PNG via resolver)
  const t1 = await page.evaluate(() => {
    const e = enemyGroup[0];
    const before = e.currentHp;
    applyStatus(e, 'burn', 5, 2);
    renderEnemyGroup();
    const pill = document.querySelector('.enemy-card .status-pill');
    const img  = pill ? pill.querySelector('img') : null;
    return {
      before,
      statusId:    e.statusEffects[0]?.id,
      statusTurns: e.statusEffects[0]?.turns,
      pillText:    pill ? pill.textContent.trim() : null,
      iconSrc:     img ? img.getAttribute('src') : null
    };
  });
  console.log('  T1 apply :', t1);
  assert(t1.statusId === 'burn',                    'applyStatus n\'a pas posé burn');
  assert(/burn\.png$/.test(t1.iconSrc || ''),        'pilule burn doit utiliser burn.png');
  assert(t1.pillText.includes('2'),                 'compteur turns absent');

  // T2 : tick → -5 PV, turns décrémenté
  const t2 = await page.evaluate(() => {
    const e = enemyGroup[0];
    tickStatuses(e, true);
    renderEnemyGroup();
    const pill = document.querySelector('.enemy-card .status-pill');
    return {
      currentHp: e.currentHp,
      turns:     e.statusEffects[0]?.turns,
      pillText:  pill ? pill.textContent.trim() : null
    };
  });
  console.log('  T2 tick  :', t2);
  assert(t2.currentHp === t1.before - 5, `HP attendu ${t1.before - 5}, obtenu ${t2.currentHp}`);
  assert(t2.turns     === 1,             `turns attendu 1, obtenu ${t2.turns}`);
  assert(t2.pillText.includes('1'),      'compteur n\'a pas décrémenté');

  // T3 : 2e tick → expiration, pilule disparaît
  const t3 = await page.evaluate(() => {
    tickStatuses(enemyGroup[0], true);
    renderEnemyGroup();
    return {
      statusCount: enemyGroup[0].statusEffects.length,
      pillExists:  !!document.querySelector('.enemy-card .status-pill')
    };
  });
  console.log('  T3 expire:', t3);
  assert(t3.statusCount === 0,  'statut non retiré après expiration');
  assert(!t3.pillExists,        'pilule reste affichée après expiration');

  // T4 : endBattle nettoie tout
  const t4 = await page.evaluate(() => {
    applyStatus(enemyGroup[0], 'poison', 3, 5);
    applyStatus(party[0],      'bleed',  2, 5);
    enemyGroup[0].currentHp = 0;
    endBattle(true);
    return {
      afterAlly:  party[0].statusEffects.length,
      afterEnemy: enemyGroup[0]?.statusEffects?.length ?? 0
    };
  });
  console.log('  T4 clear :', t4);
  assert(t4.afterAlly  === 0, 'statuts allié non nettoyés');
  assert(t4.afterEnemy === 0, 'statuts ennemi non nettoyés');

  // T5 : rendu allié dans #status-slot-0
  const t5 = await page.evaluate(() => {
    const enemy = { id: 'd2', name: 'D2', icon: '🎯',
      hp: 30, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: '' };
    startBattle(enemy);
    applyStatus(party[0], 'bleed', 4, 3);
    updateUI();
    const slot = document.getElementById('status-slot-0');
    return { hasPill: !!(slot && slot.querySelector('.status-pill')) };
  });
  console.log('  T5 ally  :', t5);
  assert(t5.hasPill, 'statut allié non affiché dans status-slot-0');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ système de statuts conforme');
  await browser.close();
}

// ── Scénario 3 : quête chaînée Lupin (kill → item → Patronum) ─

async function scenarioChainedQuest() {
  console.log('\n── Scénario 3 : quête chaînée Lupin ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : la quête lumiere_desespoir est dispo (catalogue) + acceptable via PNJ
  const t1 = await page.evaluate(() => {
    const tpl = getQuestTemplate('lumiere_desespoir');
    const wasAvailable = availableQuests.has('lumiere_desespoir');
    acceptQuest('lumiere_desespoir');
    const q = activeQuests.find(x => x.id === 'lumiere_desespoir');
    return {
      exists:       !!tpl,
      wasAvailable,
      removedFromAvailable: !availableQuests.has('lumiere_desespoir'),
      activeNow:    !!q,
      stepCount:    q?.objectives.length,
      step0Type:    q?.objectives[0]?.type,
      step0Monster: q?.objectives[0]?.monsterId,
      step1Type:    q?.objectives[1]?.type,
      step1Item:    q?.objectives[1]?.itemId
    };
  });
  console.log('  T1 quest:', t1);
  assert(t1.exists,                           'template lumiere_desespoir absent du catalogue');
  assert(t1.wasAvailable,                     'quête doit être dans availableQuests au démarrage');
  assert(t1.activeNow,                        'acceptQuest n\'a pas activé la quête');
  assert(t1.removedFromAvailable,             'quête doit sortir d\'availableQuests après acceptation');
  assert(t1.stepCount === 2,                  'doit avoir 2 étapes');
  assert(t1.step0Type === 'kill',             'étape 0 doit être un kill');
  assert(t1.step0Monster === 'dementeur',     'étape 0 doit cibler dementeur');
  assert(t1.step1Type === 'item',             'étape 1 doit être un item');
  assert(t1.step1Item === 'choco_sorcier',    'étape 1 doit cibler choco_sorcier');

  // T2 : simuler kill du Détraqueur → étape 0 complète, pas d'auto-completion
  const t2 = await page.evaluate(() => {
    checkKillQuests('dementeur');
    const q = activeQuests.find(x => x.id === 'lumiere_desespoir');
    return {
      step0Done: q.objectives[0].completed,
      step0Prog: q.objectives[0].progress,
      step1Done: q.objectives[1].completed,
      stillActive: !!q,                     // pas auto-complétée
      notCompleted: !completedQuests.has('lumiere_desespoir')
    };
  });
  console.log('  T2 kill :', t2);
  assert(t2.step0Done,        'étape 0 non marquée comme complétée');
  assert(t2.step0Prog === 1,  'progression étape 0 attendue à 1');
  assert(!t2.step1Done,       'étape 1 ne doit pas être complétée');
  assert(t2.stillActive,      'quête doit rester active (étape item à faire)');
  assert(t2.notCompleted,     'quête ne doit pas être marquée rendue automatiquement');

  // T3 : ajouter un choco au sac, remettre via PNJ (turnInQuestById) → Patronum appris
  const t3 = await page.evaluate(() => {
    const choco = ITEMS.find(i => i.id === 'choco_sorcier');
    player.inventory.push({ ...choco });
    const ok = turnInQuestById('lumiere_desespoir');
    return {
      turnInOk:    ok,
      questGone:   !activeQuests.find(x => x.id === 'lumiere_desespoir'),
      inCompleted: completedQuests.has('lumiere_desespoir'),
      patronumLearned: party[0].spells.includes('Patronum'),
      chocoConsumed:   !player.inventory.some(i => i.id === 'choco_sorcier')
    };
  });
  console.log('  T3 deliver:', t3);
  assert(t3.turnInOk,          'turnInQuestById a échoué malgré objectifs remplis');
  assert(t3.questGone,         'quête doit être retirée d\'activeQuests après remise');
  assert(t3.inCompleted,       'quête doit être ajoutée à completedQuests');
  assert(t3.patronumLearned,   'Patronum non appris');
  assert(t3.chocoConsumed,     'chocolat non consommé');

  // T4 : shim de migration sur ancienne sauvegarde
  const t4 = await page.evaluate(() => {
    const old = {
      id: 'old_quest', title: 'Test', giver: '', desc: '', location: '', completed: false,
      reward: { xp: 10 },
      objective: { type: 'kill', monsterId: 'troll', amount: 2 },
      progress: 1
    };
    const migrated = _migrateQuestShape(old);
    return {
      hasObjectives: Array.isArray(migrated.objectives),
      stepCount:     migrated.objectives.length,
      stepType:      migrated.objectives[0].type,
      stepProgress:  migrated.objectives[0].progress,
      stepCompleted: migrated.objectives[0].completed,
      noOldObjective: migrated.objective === undefined,
      idempotent:    _migrateQuestShape(migrated) === migrated
    };
  });
  console.log('  T4 shim :', t4);
  assert(t4.hasObjectives,    'shim n\'a pas créé objectives[]');
  assert(t4.stepCount === 1,  'shim doit produire 1 étape');
  assert(t4.stepType === 'kill', 'type non préservé');
  assert(t4.stepProgress === 1,  'progression non transférée');
  assert(!t4.stepCompleted,      'doit rester incomplet (1<2)');
  assert(t4.noOldObjective,   'ancien champ objective non retiré');
  assert(t4.idempotent,       'shim non idempotent');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ flux quête chaînée conforme');
  await browser.close();
}

// ── Scénario 3bis : intégration PNJ (génération + dialogue + flux quête) ─

async function scenarioNpcIntegration() {
  console.log('\n── Scénario 3bis : intégration PNJ ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T0 : intro Dumbledore intégrée au flow nouvelle partie. Le helper
  // startNewGame est passé par #intro-screen et a cliqué "Accepter".
  // Vérif post-conditions : quête active + PNJ marqué rencontré.
  const t0 = await page.evaluate(() => ({
    introScreenHidden: document.getElementById('intro-screen').style.display === 'none',
    seenDumbledore:    seenNpcs.has('dumbledore'),
    introQuestActive:  activeQuests.some(q => q.id === 'intro_tutoriel'),
    introNotPending:   !availableQuests.has('intro_tutoriel')
  }));
  console.log('  T0 intro flow:', t0);
  assert(t0.introScreenHidden, 'intro-screen non caché après le flow');
  assert(t0.seenDumbledore,    'PNJ guide non marqué comme rencontré');
  assert(t0.introQuestActive,  'quête intro_tutoriel non acceptée');
  assert(t0.introNotPending,   'quête intro_tutoriel reste dans availableQuests');

  // T0bis : page séparée pour valider le contenu de l'écran d'intro
  // AVANT le clic final (portrait, nom, pagination, état pré-acceptation).
  const fresh = await launchGame();
  await fresh.page.evaluate(() => {
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
  });
  await fresh.page.waitForFunction(() =>
    document.getElementById('intro-screen').style.display === 'flex',
    { timeout: 3000 });
  const t0b = await fresh.page.evaluate(() => ({
    visible:           document.getElementById('intro-screen').style.display === 'flex',
    portraitImg:       !!document.querySelector('#intro-portrait img.intro-portrait-img'),
    name:              document.getElementById('intro-name').textContent,
    totalPages:        (typeof _introPages !== 'undefined') ? _introPages.length : -1,
    pageInitial:       (typeof _introPage !== 'undefined') ? _introPage : -1,
    btnLabel0:         document.querySelector('#intro-actions button')?.textContent || '',
    questBeforeFinish: activeQuests.some(q => q.id === 'intro_tutoriel'),
    seenBeforeFinish:  seenNpcs.has('dumbledore')
  }));
  console.log('  T0bis intro screen:', t0b);
  assert(t0b.visible,                       'intro-screen non visible après chooseHouse');
  assert(t0b.portraitImg,                   'portrait raster Dumbledore absent');
  assert(t0b.name === 'Albus Dumbledore',   `nom attendu Albus Dumbledore, got ${t0b.name}`);
  assert(t0b.totalPages >= 2,               'greeting Dumbledore doit être multi-page');
  assert(t0b.pageInitial === 0,             'pagination doit démarrer à 0');
  assert(t0b.btnLabel0.includes('Suivant'), 'bouton Suivant attendu sur la 1re page');
  assert(!t0b.questBeforeFinish,            'quête ne doit PAS être acceptée avant clic final');
  assert(!t0b.seenBeforeFinish,             'PNJ ne doit PAS être marqué rencontré avant clic final');
  await fresh.page.evaluate(() => {
    while (_introPage < _introPages.length - 1) _advanceIntro();
    _finishIntro();
  });
  const t0c = await fresh.page.evaluate(() => ({
    introScreenHidden: document.getElementById('intro-screen').style.display === 'none',
    questNowActive:    activeQuests.some(q => q.id === 'intro_tutoriel'),
    seenNow:           seenNpcs.has('dumbledore')
  }));
  assert(t0c.introScreenHidden, 'intro-screen non caché après _finishIntro');
  assert(t0c.questNowActive,    'quête non activée par _finishIntro');
  assert(t0c.seenNow,           'PNJ non marqué rencontré par _finishIntro');
  await fresh.browser.close();

  // T1 : registre + helpers exposés
  const t1 = await page.evaluate(() => ({
    npcCount:        typeof NPCS !== 'undefined' ? NPCS.length : -1,
    hasGetById:      typeof getNpcById === 'function',
    hasGetForFloor:  typeof getNpcsForFloor === 'function',
    cellNpc:         CELL.NPC,
    dumbledore:      !!getNpcById('dumbledore'),
    floor1Count:     getNpcsForFloor(1).length,
    floor2Count:     getNpcsForFloor(2).length,
    floor4Count:     getNpcsForFloor(4).length
  }));
  console.log('  T1 registry:', t1);
  // 8 PNJ fixes + 2 vendeurs ambulants ajoutés en itération 4 = 10 entrées.
  assert(t1.npcCount >= 8,               `attendu ≥ 8 PNJ, trouvé ${t1.npcCount}`);
  assert(t1.hasGetById,                  'getNpcById absent');
  assert(t1.hasGetForFloor,              'getNpcsForFloor absent');
  assert(t1.cellNpc === 8,               'CELL.NPC doit valoir 8');
  assert(t1.dumbledore,                  'PNJ Dumbledore introuvable');
  assert(t1.floor1Count === 1,           'étage 1 doit avoir 1 PNJ (Dumbledore)');
  assert(t1.floor2Count === 3,           'étage 2 doit avoir 3 PNJ');
  assert(t1.floor4Count === 2,           'étage 4 doit avoir 2 PNJ');

  // T2 : génération étage 1 — Dumbledore présent + npcPlacements peuplé
  const t2 = await page.evaluate(() => {
    const placements = Array.from(npcPlacements.entries());
    let foundCells = 0;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (dungeon[y][x] === CELL.NPC) foundCells++;
      }
    }
    return {
      placementsCount: placements.length,
      cellsCount:      foundCells,
      ids:             placements.map(([, id]) => id)
    };
  });
  console.log('  T2 floor1:', t2);
  assert(t2.placementsCount === 1,       'doit avoir 1 placement étage 1');
  assert(t2.cellsCount === 1,            'doit avoir 1 cellule NPC dans dungeon');
  assert(t2.ids[0] === 'dumbledore',     'le PNJ étage 1 doit être Dumbledore');

  // T3 : flux dialogue — état "offer" → accept → "active" → ready → done
  const t3 = await page.evaluate(() => {
    const npc = getNpcById('pomfresh');
    const before = getNpcQuestState(npc);
    acceptQuest('mandragore_pomfresh');
    const afterAccept = getNpcQuestState(npc);
    // Ajoute 3 mandragores au sac → étape "item" remplie après refresh
    const m = ITEMS.find(i => i.id === 'mandragore');
    for (let i = 0; i < 3; i++) player.inventory.push({ ...m });
    const ready = getNpcQuestState(npc);
    turnInQuestById('mandragore_pomfresh');
    const done = getNpcQuestState(npc);
    return { before, afterAccept, ready, done };
  });
  console.log('  T3 dialog flow:', t3);
  assert(t3.before === 'offer',          `état initial doit être "offer" (got ${t3.before})`);
  assert(t3.afterAccept === 'active',    `après accept doit être "active" (got ${t3.afterAccept})`);
  assert(t3.ready === 'ready',           `objectifs remplis doit être "ready" (got ${t3.ready})`);
  assert(t3.done === 'done',             `après remise doit être "done" (got ${t3.done})`);

  // T4 : ouverture overlay → fermeture + portrait raster câblé
  const t4 = await page.evaluate(() => {
    openNpcDialog('dumbledore');
    const overlay = document.getElementById('npc-dialog-overlay');
    const portraitEl = document.getElementById('npc-dialog-portrait');
    const img = portraitEl.querySelector('img.npc-portrait-img');
    const opened = overlay.style.display;
    const portraitSrc = img ? img.getAttribute('src') : null;
    closeNpcDialog();
    const closed = overlay.style.display;
    const seen = seenNpcs.has('dumbledore');
    return { opened, closed, seen, hasImg: !!img, portraitSrc };
  });
  console.log('  T4 overlay:', t4);
  assert(t4.opened === 'flex',           'overlay non ouvert');
  assert(t4.closed === 'none',           'overlay non fermé');
  assert(t4.seen,                        'PNJ non marqué comme rencontré');
  assert(t4.hasImg,                      'portrait <img> absent');
  assert(t4.portraitSrc === 'img/npc/dumbledore.png',
    `portrait src attendu img/npc/dumbledore.png, got ${t4.portraitSrc}`);

  // T5 : pagination des dialogues + son + animation loop
  const t5 = await page.evaluate(() => {
    // McGonagall n'a pas encore été rencontrée → greeting multi-page
    seenNpcs.delete('mcgonagall');
    openNpcDialog('mcgonagall');
    const total       = _dialogState.pages.length;
    const pageInitial = _dialogState.page;
    const actionsHtml1 = document.getElementById('npc-dialog-actions').innerHTML;
    const hasNext     = actionsHtml1.includes('Suivant');
    nextDialogPage();
    const pageAfter   = _dialogState.page;
    const actionsHtml2 = document.getElementById('npc-dialog-actions').innerHTML;
    const hasAccept   = actionsHtml2.includes('Accepter');
    closeNpcDialog();
    return {
      total, pageInitial, pageAfter, hasNext, hasAccept,
      hasGreetSound: typeof AudioSystem.playNpcGreet === 'function',
      hasAnimLoop:   typeof startNpcAnimLoop === 'function'
    };
  });
  console.log('  T5 multi-page:', t5);
  assert(t5.total === 2,         `greeting McGonagall doit avoir 2 pages (got ${t5.total})`);
  assert(t5.pageInitial === 0,   'pagination doit démarrer à la page 0');
  assert(t5.hasNext,             'bouton Suivant ▸ absent en page 0');
  assert(t5.pageAfter === 1,     'nextDialogPage n\'a pas avancé la pagination');
  assert(t5.hasAccept,           'bouton Accepter absent en dernière page');
  assert(t5.hasGreetSound,       'AudioSystem.playNpcGreet absent');
  assert(t5.hasAnimLoop,         'startNpcAnimLoop absent');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ intégration PNJ conforme');
  await browser.close();
}

// ── Scénario 3ter : vendeurs ambulants (random PNJ + boutique réduite) ─

async function scenarioVendors() {
  console.log('\n── Scénario 3ter : vendeurs ambulants ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : helpers + entrées vendeur exposés
  const t1 = await page.evaluate(() => {
    const rosmerta  = getNpcById('rosmerta');
    const mundungus = getNpcById('mundungus');
    return {
      hasGetVendorsForFloor: typeof getRandomVendorsForFloor === 'function',
      hasOpenVendorShop:     typeof openVendorShop === 'function',
      rosmertaExists:        !!rosmerta,
      rosmertaIsRandom:      rosmerta && rosmerta.random === true,
      rosmertaWaresLen:      rosmerta && Array.isArray(rosmerta.wares) ? rosmerta.wares.length : -1,
      rosmertaNoQuests:      rosmerta && (!rosmerta.questsGiven || rosmerta.questsGiven.length === 0),
      mundungusMinFloor:     mundungus && mundungus.minFloor,
      poolFloor1Empty:       getRandomVendorsForFloor(1).length,
      poolFloor2HasRosmerta: getRandomVendorsForFloor(2).some(n => n.id === 'rosmerta'),
      poolFloor3HasMundungus: getRandomVendorsForFloor(3).some(n => n.id === 'mundungus')
    };
  });
  console.log('  T1 registry:', t1);
  assert(t1.hasGetVendorsForFloor,  'getRandomVendorsForFloor absent');
  assert(t1.hasOpenVendorShop,      'openVendorShop absent');
  assert(t1.rosmertaExists,         'PNJ rosmerta introuvable');
  assert(t1.rosmertaIsRandom,       'rosmerta doit avoir random=true');
  assert(t1.rosmertaWaresLen >= 4,  'rosmerta doit avoir au moins 4 articles');
  assert(t1.rosmertaNoQuests,       'rosmerta ne doit pas donner de quête');
  assert(t1.mundungusMinFloor === 3,'mundungus minFloor doit valoir 3');
  assert(t1.poolFloor1Empty === 0,  'aucun vendeur ne doit être éligible étage 1');
  assert(t1.poolFloor2HasRosmerta,  'rosmerta doit être éligible étage 2');
  assert(t1.poolFloor3HasMundungus, 'mundungus doit être éligible étage 3');

  // T2 : ouverture boutique + bouton dialogue
  const t2 = await page.evaluate(() => {
    // Force la présence d'un vendeur dans le donjon courant pour tester
    // le pipeline dialogue → openVendorShop. seenNpcs pré-rempli pour
    // sauter le greeting multi-page (idle = single page → actions visibles
    // d'entrée).
    npcPlacements.set('1,1', 'rosmerta');
    seenNpcs.add('rosmerta');
    openNpcDialog('rosmerta');
    const actionsHtml = document.getElementById('npc-dialog-actions').innerHTML;
    const hasShopBtn  = actionsHtml.includes('marchandises') ||
                        actionsHtml.includes('boutique') ||
                        actionsHtml.includes('Voir');
    return { hasShopBtn, actionsHtml };
  });
  console.log('  T2 dialog:', { hasShopBtn: t2.hasShopBtn });
  assert(t2.hasShopBtn, 'bouton boutique absent dans le dialogue vendeur');

  // T3 : ouverture de la boutique vendeur affiche les wares
  const t3 = await page.evaluate(() => {
    closeNpcDialog();
    openVendorShop('rosmerta');
    const modal = document.getElementById('shop-modal');
    const grid  = document.getElementById('shop-grid');
    const title = document.getElementById('shop-title').textContent;
    const itemIds = Array.from(grid.querySelectorAll('[data-item-id]'))
      .map(el => el.getAttribute('data-item-id'));
    return {
      modalOpen: modal.style.display === 'flex',
      title,
      itemIds,
      hasPotionS: itemIds.includes('potion_s'),
      hasMandragore: itemIds.includes('mandragore')
    };
  });
  console.log('  T3 shop open:', t3);
  assert(t3.modalOpen,             'shop-modal non ouvert');
  assert(t3.title.includes('Rosmerta'), 'titre boutique ne contient pas le nom du vendeur');
  assert(t3.hasPotionS,            'potion_s absent du catalogue rosmerta');
  assert(t3.hasMandragore,         'mandragore absent du catalogue rosmerta');

  // T4 : achat depuis la boutique vendeur consomme l'or et ajoute l'item
  const t4 = await page.evaluate(() => {
    player.gold = 1000;
    const goldBefore = player.gold;
    const invBefore  = player.inventory.length;
    const item = ITEMS.find(i => i.id === 'potion_s');
    buyVendorItem(item, item.price, 'rosmerta');
    return {
      goldDelta: goldBefore - player.gold,
      itemPrice: item.price,
      invGrew:   player.inventory.length === invBefore + 1,
      lastItem:  player.inventory[player.inventory.length - 1]?.id
    };
  });
  console.log('  T4 buy:', t4);
  assert(t4.goldDelta === t4.itemPrice, `or débité doit valoir ${t4.itemPrice}, got ${t4.goldDelta}`);
  assert(t4.invGrew,                 'inventaire n\'a pas grandi après achat');
  assert(t4.lastItem === 'potion_s', 'dernier item ajouté n\'est pas potion_s');

  // T5 : onglets Acheter/Vendre — bascule + rendu sell + spécialisation
  // buyback (Rosmerta paie 75% pour les consumables, 50% sinon).
  const t5 = await page.evaluate(() => {
    // Inventaire propre pour le test : 1 potion (consumable) + 1 wand (autre)
    player.inventory = [
      { ...ITEMS.find(i => i.id === 'potion_s') },
      { ...ITEMS.find(i => i.id === 'wand1') }
    ];
    player.gold = 100;
    openVendorShop('rosmerta');
    const tabsBefore = document.getElementById('shop-tabs').innerHTML;
    setShopMode('sell');
    const tabsAfter = document.getElementById('shop-tabs').innerHTML;
    const grid      = document.getElementById('shop-grid');
    const items     = Array.from(grid.querySelectorAll('[data-inv-idx]'));
    const labels    = items.map(el => el.querySelector('.shop-price').textContent);
    const potionItem = ITEMS.find(i => i.id === 'potion_s');
    const wandItem   = ITEMS.find(i => i.id === 'wand1');
    return {
      hasBuyTab:  tabsBefore.includes('Acheter'),
      hasSellTab: tabsBefore.includes('Vendre'),
      buyActiveBefore:  tabsBefore.includes('shop-tab active') && tabsBefore.indexOf('active') < tabsBefore.indexOf('Vendre'),
      sellActiveAfter:  tabsAfter.includes('Vendre</button>'),
      sellGridCount:    items.length,
      sellLabels:       labels,
      potionType:       potionItem.type,
      potionPrice:      potionItem.price,
      wandPrice:        wandItem.price,
      potionExpected:   '+' + Math.max(1, Math.floor(potionItem.price * 0.75)) + 'G',
      wandExpected:     '+' + Math.max(1, Math.floor(wandItem.price * 0.50)) + 'G'
    };
  });
  console.log('  T5 sell tab:', t5);
  assert(t5.hasBuyTab,            'onglet Acheter absent');
  assert(t5.hasSellTab,           'onglet Vendre absent');
  assert(t5.sellGridCount === 2,  `2 items vendables attendus, got ${t5.sellGridCount}`);
  assert(t5.potionType === 'consumable', 'potion_s.type doit être consumable');
  assert(t5.sellLabels.includes(t5.potionExpected),
    `prix vente potion_s attendu ${t5.potionExpected} (75%), got ${t5.sellLabels.join(',')}`);
  assert(t5.sellLabels.includes(t5.wandExpected),
    `prix vente wand1 attendu ${t5.wandExpected} (50%), got ${t5.sellLabels.join(',')}`);

  // T6 : sellItem débite l'inventaire et crédite l'or
  const t6 = await page.evaluate(() => {
    const goldBefore = player.gold;
    const invBefore  = player.inventory.length;
    // Vend l'item à l'index 0 (potion_s, prix attendu 75% du price)
    const potion = player.inventory[0];
    const sellPrice = Math.max(1, Math.floor(potion.price * 0.75));
    sellItem(0, sellPrice);
    return {
      goldDelta:  player.gold - goldBefore,
      sellPrice,
      invShrunk:  player.inventory.length === invBefore - 1,
      potionGone: !player.inventory.some(i => i.id === 'potion_s')
    };
  });
  console.log('  T6 sell action:', t6);
  assert(t6.goldDelta === t6.sellPrice, `or crédité ${t6.sellPrice}, got ${t6.goldDelta}`);
  assert(t6.invShrunk,    'inventaire n\'a pas rétréci');
  assert(t6.potionGone,   'potion_s toujours présente');

  // T7 : politique vendor-spécifique — Mondingus paie 75% sur rare/epic/legendary
  const t7 = await page.evaluate(() => {
    // wand2 est legendary dans ITEMS ? Cherchons un item rare/epic/legendary.
    const rareItem = ITEMS.find(i => i.rarity === 'epic' || i.rarity === 'legendary' || i.rarity === 'rare');
    if (!rareItem) return { skipped: true };
    player.inventory = [{ ...rareItem }];
    openVendorShop('mundungus');
    setShopMode('sell');
    const grid = document.getElementById('shop-grid');
    const label = grid.querySelector('.shop-price')?.textContent;
    return {
      itemId:    rareItem.id,
      rarity:    rareItem.rarity,
      label,
      expected:  '+' + Math.max(1, Math.floor(rareItem.price * 0.75)) + 'G'
    };
  });
  console.log('  T7 vendor specialization:', t7);
  if (!t7.skipped) {
    assert(t7.label === t7.expected,
      `Mondingus doit payer ${t7.expected} pour ${t7.itemId} (${t7.rarity}), got ${t7.label}`);
  }

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ vendeurs ambulants + onglet Vendre conformes');
  await browser.close();
}

// ── Scénario 3quater : chaînes de quêtes + quête répétable (Hagrid) ───

async function scenarioChainAndRepeatable() {
  console.log('\n── Scénario 3quater : Hagrid — chaîne + répétable ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : registre QUEST_TEMPLATES contient defense_cabane et chouette_perdue.repeatable
  const t1 = await page.evaluate(() => {
    const chouette = QUEST_TEMPLATES.find(t => t.id === 'chouette_perdue');
    const cabane   = QUEST_TEMPLATES.find(t => t.id === 'defense_cabane');
    const hagrid   = NPCS.find(n => n.id === 'hagrid');
    return {
      chouetteRepeatable: !!(chouette && chouette.repeatable && chouette.repeatable.everyLevels),
      everyLevels:        chouette?.repeatable?.everyLevels,
      cabaneExists:       !!cabane,
      hagridGivesBoth:    JSON.stringify(hagrid?.questsGiven),
      hagridDialoguesByQuest: !!hagrid?.dialoguesByQuest?.defense_cabane,
      hasIsQuestOfferable: typeof isQuestOfferable === 'function',
      lastQuestCompletionInit: JSON.stringify(lastQuestCompletion)
    };
  });
  console.log('  T1 registry:', t1);
  assert(t1.chouetteRepeatable,                 'chouette_perdue n\'est pas marquée repeatable');
  assert(t1.everyLevels === 3,                  'cooldown attendu 3 niveaux');
  assert(t1.cabaneExists,                       'defense_cabane absent du catalogue');
  assert(t1.hagridGivesBoth.includes('chouette_perdue') && t1.hagridGivesBoth.includes('defense_cabane'),
                                                'Hagrid n\'a pas la chaîne questsGiven');
  assert(t1.hagridDialoguesByQuest,             'Hagrid n\'a pas dialoguesByQuest pour defense_cabane');
  assert(t1.hasIsQuestOfferable,                'isQuestOfferable non exposée');
  assert(t1.lastQuestCompletionInit === '{}',   'lastQuestCompletion doit démarrer vide');

  // T2 : avant tout, état Hagrid = offer (chouette en 1ère)
  const t2 = await page.evaluate(() => {
    const hagrid = NPCS.find(n => n.id === 'hagrid');
    return {
      state:    getNpcQuestState(hagrid),
      currentQ: _currentQuestForState(hagrid, 'offer')
    };
  });
  console.log('  T2 initial state:', t2);
  assert(t2.state    === 'offer',           `Hagrid initial doit être 'offer', got ${t2.state}`);
  assert(t2.currentQ === 'chouette_perdue', `Quête courante doit être chouette_perdue, got ${t2.currentQ}`);

  // T3 : accepter + remettre la 1ère quête → chaîne avance vers defense_cabane
  const t3 = await page.evaluate(() => {
    const hagrid = NPCS.find(n => n.id === 'hagrid');
    acceptQuest('chouette_perdue');
    // Bypass de l'objectif : on coche directement
    const q = activeQuests.find(x => x.id === 'chouette_perdue');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    turnInQuestById('chouette_perdue');
    const stateAfter   = getNpcQuestState(hagrid);
    const currentAfter = _currentQuestForState(hagrid, stateAfter);
    return {
      chouetteCompleted: completedQuests.has('chouette_perdue'),
      chouetteLastLevel: lastQuestCompletion['chouette_perdue'],
      stateAfter,
      currentAfter,
      cabaneOfferable:   isQuestOfferable('defense_cabane'),
      chouetteOfferableNow: isQuestOfferable('chouette_perdue')
    };
  });
  console.log('  T3 after first quest:', t3);
  assert(t3.chouetteCompleted,           'chouette_perdue doit être marquée completed');
  assert(typeof t3.chouetteLastLevel === 'number', 'lastQuestCompletion doit enregistrer le niveau');
  assert(t3.stateAfter === 'offer',      `chaîne doit avancer à 'offer' (defense_cabane), got ${t3.stateAfter}`);
  assert(t3.currentAfter === 'defense_cabane', `next quest doit être defense_cabane, got ${t3.currentAfter}`);
  assert(t3.cabaneOfferable,             'defense_cabane doit être offrable');
  assert(!t3.chouetteOfferableNow,       'chouette_perdue ne doit pas être ré-offrable immédiatement');

  // T4 : remettre defense_cabane → état done
  const t4 = await page.evaluate(() => {
    const hagrid = NPCS.find(n => n.id === 'hagrid');
    acceptQuest('defense_cabane');
    const q = activeQuests.find(x => x.id === 'defense_cabane');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    turnInQuestById('defense_cabane');
    return {
      bothCompleted: completedQuests.has('chouette_perdue') && completedQuests.has('defense_cabane'),
      state:         getNpcQuestState(hagrid),
      cabaneLastLevel: lastQuestCompletion['defense_cabane']  // pas répétable → undefined attendu
    };
  });
  console.log('  T4 chain finished:', t4);
  assert(t4.bothCompleted,                  'les 2 quêtes doivent être completed');
  assert(t4.state === 'done',               `Hagrid doit être 'done', got ${t4.state}`);
  assert(t4.cabaneLastLevel === undefined,  'defense_cabane (non répétable) ne doit pas écrire lastQuestCompletion');

  // T5 : pas de cooldown encore atteint → chouette pas ré-offrable
  const t5 = await page.evaluate(() => {
    return {
      level: player.level,
      lastChouette: lastQuestCompletion['chouette_perdue'],
      offerable: isQuestOfferable('chouette_perdue')
    };
  });
  console.log('  T5 cooldown not reached:', t5);
  assert(!t5.offerable, 'chouette_perdue ne doit pas être ré-offrable avant cooldown');

  // T6 : amener le joueur exactement au cooldown → chouette redevient offrable
  const t6 = await page.evaluate(() => {
    const tpl  = QUEST_TEMPLATES.find(t => t.id === 'chouette_perdue');
    const last = lastQuestCompletion['chouette_perdue'] || 0;
    player.level = last + tpl.repeatable.everyLevels; // exactement au seuil
    const hagrid = NPCS.find(n => n.id === 'hagrid');
    return {
      level:      player.level,
      lastSeen:   last,
      everyLvls:  tpl.repeatable.everyLevels,
      offerable:  isQuestOfferable('chouette_perdue'),
      state:      getNpcQuestState(hagrid),
      currentQ:   _currentQuestForState(hagrid, 'offer')
    };
  });
  console.log('  T6 cooldown reached:', t6);
  assert(t6.offerable,                       'chouette_perdue doit redevenir offrable après +3 niveaux');
  assert(t6.state === 'offer',               `Hagrid doit revenir à 'offer', got ${t6.state}`);
  assert(t6.currentQ === 'chouette_perdue',  `quête courante doit être chouette_perdue, got ${t6.currentQ}`);

  // T7 : ré-acceptation, completedQuests doit la sortir
  const t7 = await page.evaluate(() => {
    const accepted = acceptQuest('chouette_perdue');
    return {
      accepted,
      stillCompleted: completedQuests.has('chouette_perdue'),
      activeNow:      !!activeQuests.find(q => q.id === 'chouette_perdue')
    };
  });
  console.log('  T7 re-accept:', t7);
  assert(t7.accepted,         'acceptQuest doit retourner true en répétition');
  assert(!t7.stillCompleted,  'chouette_perdue doit être retirée de completedQuests à la ré-acceptation');
  assert(t7.activeNow,        'chouette_perdue doit être dans activeQuests');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ chaîne Hagrid + quête répétable conformes');
  await browser.close();
}

// ── Scénario 4 : écrans de sélection accessibles sur viewport mobile ─

async function scenarioMobileSelect() {
  console.log('\n── Scénario 4 : sélection accessible sur mobile ──');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');

  await page.evaluate(() => { document.getElementById('title-screen').click(); });
  await page.waitForFunction(() => {
    const el = document.getElementById('player-select-screen');
    return el && getComputedStyle(el).display !== 'none';
  });

  // Le bouton "Commencer" doit pouvoir être amené dans la viewport
  const reach = await page.evaluate(() => {
    const btn = document.getElementById('start-adventure-btn');
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return {
      visible:  r.top >= 0 && r.bottom <= window.innerHeight,
      disabled: btn.disabled,
      overflow: getComputedStyle(document.getElementById('player-select-screen')).overflowY
    };
  });
  console.log('  player-select :', reach);
  assert(reach.visible,             'bouton "Commencer" hors viewport mobile');
  assert(!reach.disabled,           'bouton désactivé alors que Harry est sélectionné par défaut');
  assert(reach.overflow === 'auto', 'overflow-y devrait être auto sur mobile');

  // Cliquer "Commencer" puis vérifier que l'écran Maison apparaît et son bouton atteignable
  await page.evaluate(() => document.getElementById('start-adventure-btn').click());
  await page.waitForFunction(() => {
    const el = document.getElementById('house-select-screen');
    return el && getComputedStyle(el).display !== 'none';
  }, { timeout: 3000 });

  const houseReach = await page.evaluate(() => {
    const btn = document.querySelector('.house-btn');
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { visible: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  console.log('  house-select :', houseReach);
  assert(houseReach.visible, 'bouton Maison hors viewport mobile');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ parcours sélection mobile complet');
  await browser.close();
}

// ── Scénario 5 : portraits raster pour les bosses ─────────────

async function scenarioMonsterImages() {
  console.log('\n── Scénario 5 : portraits PNG (imgSrc) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Tous les monstres avec imgSrc (data-driven) doivent retomber sur un <img>
  // en combat ET le PNG doit charger en 512+ avec alpha non-trivial.
  const ids = await page.evaluate(() =>
    MONSTERS.filter(m => m.imgSrc).map(m => m.id)
  );
  console.log(`  monstres avec imgSrc : ${ids.length}`);

  for (const id of ids) {
    const t = await page.evaluate((monsterId) => {
      const base = MONSTERS.find(m => m.id === monsterId);
      const html = getMonsterIconHtml({ ...base, currentHp: base.hp }, 80);
      return {
        hasImgSrc: !!base.imgSrc,
        usesImg:   /<img\s+src="img\/monsters\//.test(html),
        usesSvg:   /<svg /.test(html),
        src:       (html.match(/src="([^"]+)"/) || [])[1] || null
      };
    }, id);
    assert(t.hasImgSrc,             `${id} sans imgSrc`);
    assert(t.usesImg && !t.usesSvg, `${id} ne rend pas un <img>`);
    assert(t.src && t.src.endsWith(`${id}.png`), `${id} src incorrect: ${t.src}`);

    // Load + dimensions §1 IMG_STYLE.md (≥ 512×512 attendu pour les nouveaux PNG ;
    // les 6 PNG legacy peuvent être plus petits, on tolère ≥ 256).
    const probe = await page.evaluate((src) => new Promise(resolve => {
      const img = new Image();
      img.onload  = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false });
      img.src = src;
    }), t.src);
    assert(probe.ok,        `${id}: PNG introuvable`);
    assert(probe.w >= 256,  `${id}: trop petit (${probe.w}×${probe.h})`);
  }
  console.log(`  ✓ ${ids.length} <img> + load OK`);

  // Vérifier qu'un monstre sans imgSrc utilise toujours son SVG (régression).
  // Témoin auto-adaptatif : on prend le premier monstre qui n'a pas encore
  // d'imgSrc, pour que ce test reste vert au fil de la migration vers le PNG.
  const ctrl = await page.evaluate(() => {
    const base = MONSTERS.find(m => !m.imgSrc);
    if (!base) return { skipped: true };
    const html = getMonsterIconHtml({ ...base, currentHp: base.hp }, 56);
    return { id: base.id, usesSvg: /<svg /.test(html), usesImg: /<img /.test(html) };
  });
  console.log('  contrôle SVG →', ctrl);
  if (!ctrl.skipped) {
    assert(ctrl.usesSvg && !ctrl.usesImg, 'fallback SVG cassé');
  }

  // Color-type RGBA (§1 IMG_STYLE.md) : tous les PNG monstres doivent
  // avoir un canal alpha. Lecture du byte 25 de l'IHDR (color-type=6).
  // L'alpha non-trivial (≥5% pixels à 0) est validé en amont par
  // tools/process_monster_png.py au moment de l'intégration ; on n'y
  // revient pas ici (file:// + getImageData = canvas tainted).
  const fs = require('fs');
  const repoRoot = path.resolve(__dirname, '..');
  let nonRgba = [];
  for (const id of ids) {
    const buf = fs.readFileSync(path.join(repoRoot, 'img/monsters', `${id}.png`));
    // Signature 8 bytes + IHDR length 4 + "IHDR" 4 + width 4 + height 4 + bit-depth 1 = 25
    if (buf[25] !== 6) nonRgba.push(`${id}(ct=${buf[25]})`);
  }
  console.log(`  color-type RGBA : ${ids.length - nonRgba.length}/${ids.length} OK`);
  assert(nonRgba.length === 0, `PNG sans canal alpha : ${nonRgba.join(', ')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ portraits raster conformes');
  await browser.close();
}

// ── Scénario 7 : sélection de texture par étage (paliers 9+/15+) ─

async function scenarioFloorTextures() {
  console.log('\n── Scénario 7 : textures par palier d\'étage ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Charger les textures puis vérifier la sélection par étage
  const expected = [
    { floor: 1,  wall: 'stone1',      floorTex: 'stone',         ceil: 'beams' },
    { floor: 4,  wall: 'stone2',      floorTex: 'carpet',        ceil: 'beams' },
    { floor: 6,  wall: 'wood',        floorTex: 'carpet',        ceil: 'stone' },
    { floor: 8,  wall: 'tapestry',    floorTex: 'carpet',        ceil: 'stone' },
    { floor: 10, wall: 'cavern_wall', floorTex: 'cavern_floor',  ceil: 'cavern_ceiling' },
    { floor: 14, wall: 'cavern_wall', floorTex: 'cavern_floor',  ceil: 'cavern_ceiling' },
    { floor: 15, wall: 'rune_wall',   floorTex: 'rune_floor',    ceil: 'rune_ceiling' },
    { floor: 20, wall: 'rune_wall',   floorTex: 'rune_floor',    ceil: 'rune_ceiling' },
  ];

  // S'assurer que toutes les textures sont chargées avant de tester les patterns
  await page.evaluate(async () => { if (window.loadTextures) await loadTextures(); });

  for (const e of expected) {
    const got = await page.evaluate((f) => {
      currentFloor = f;
      return {
        wall: getWallTextureType(0, 0, 0)
      };
    }, e.floor);
    console.log(`  étage ${e.floor} → mur=${got.wall} (attendu ${e.wall})`);
    assert(got.wall === e.wall, `étage ${e.floor} : mur ${got.wall} ≠ ${e.wall}`);
  }

  // Vérifier que les fichiers PNG des nouvelles textures sont chargeables
  const newAssets = [
    'img/textures/walls/cavern_wall.png',
    'img/textures/walls/rune_wall.png',
    'img/textures/floor/cavern_floor.png',
    'img/textures/floor/rune_floor.png',
    'img/textures/ceiling/cavern_ceiling.png',
    'img/textures/ceiling/rune_ceiling.png'
  ];
  for (const src of newAssets) {
    const ok = await page.evaluate(s => new Promise(r => {
      const img = new Image();
      img.onload  = () => r({ ok: true, w: img.naturalWidth });
      img.onerror = () => r({ ok: false });
      img.src = s;
    }), src);
    assert(ok.ok && ok.w >= 32, `texture introuvable : ${src}`);
  }
  console.log('  ✅ 6 textures chargeables, paliers cohérents');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  await browser.close();
}

// ── Scénario 8 : blasons des 4 maisons (PNG) ──────────────────

async function scenarioHouseCrests() {
  console.log('\n── Scénario 8 : blasons PNG des 4 maisons ──');
  const { browser, page, errors } = await launchGame();

  const expected = [
    { id: 'gryffondor-logo', src: 'img/houses/gryffondor.png',  house: 'Gryffondor'  },
    { id: 'serpentard-logo', src: 'img/houses/serpentard.png',  house: 'Serpentard'  },
    { id: 'serdaigle-logo',  src: 'img/houses/serdaigle.png',   house: 'Serdaigle'   },
    { id: 'poufsouffle-logo',src: 'img/houses/poufsouffle.png', house: 'Poufsouffle' }
  ];

  for (const e of expected) {
    const t = await page.evaluate(({ eid, src }) => {
      const el = document.getElementById(eid);
      return {
        present: !!el,
        isImg:   !!el && el.tagName === 'IMG',
        srcOk:   !!el && el.getAttribute('src') === src,
        loaded:  !!el && el.complete && el.naturalWidth > 0
      };
    }, { eid: e.id, src: e.src });
    console.log(`  ${e.id} →`, t);
    assert(t.present && t.isImg, `${e.id} absent ou pas <img>`);
    assert(t.srcOk,               `${e.id} src incorrect`);
    assert(t.loaded,              `${e.id} PNG non chargé (404 ou alpha vide)`);
  }

  // Vérifier que _updateHouseBadge() clone bien l'<img> dans #house-crest.
  // On appelle directement _updateHouseBadge (pas chooseHouse) pour ne pas
  // déclencher le démarrage de partie ; on simule juste l'état post-choix.
  const cloneCheck = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    _updateHouseBadge();
    const c = document.getElementById('house-crest');
    return {
      hasContent: !!c && c.innerHTML.length > 0,
      hasImg:    !!c && /<img[^>]+gryffondor\.png/.test(c.innerHTML)
    };
  });
  console.log('  HUD clone →', cloneCheck);
  assert(cloneCheck.hasContent && cloneCheck.hasImg, 'house-crest HUD ne reflète pas le PNG choisi');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ blasons PNG conformes');
  await browser.close();
}

// ── Scénario 9 : ergonomie combat sur mobile ──────────────────

async function scenarioCombatMobile() {
  console.log('\n── Scénario 9 : ergonomie combat sur mobile ──');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 800 }, // iPhone SE-like
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 30 });

  const layout = await page.evaluate(() => {
    const overlay = document.getElementById('encounter-overlay');
    const cont    = document.getElementById('enemy-group');
    const panel   = document.getElementById('combat-log-panel');
    const cs      = el => el ? getComputedStyle(el) : null;
    return {
      overlayPadTop: parseFloat(cs(overlay).paddingTop),
      overlayJustify: cs(overlay).justifyContent,
      enemyMinH: parseFloat(cs(cont).minHeight),
      panelExists: !!panel,
      panelCollapsed: !!panel && panel.classList.contains('collapsed'),
      panelToggleText: panel ? panel.querySelector('.clp-toggle').textContent : null
    };
  });
  console.log('  layout :', layout);
  assert(layout.overlayPadTop >= 40,                    'padding-top mobile insuffisant pour libérer la zone du monstre');
  assert(layout.overlayJustify === 'flex-start',        'overlay devrait s\'aligner en haut sur mobile');
  assert(layout.enemyMinH >= 140,                       'enemy-group-container trop bas (PNG monstre écrasé)');
  assert(layout.panelExists,                            'combat-log-panel absent');
  assert(layout.panelCollapsed,                         'combat-log-panel devrait être replié par défaut sur mobile');
  assert(layout.panelToggleText === '+',                'toggle devrait afficher + quand replié');

  // Ergonomie combat mobile : barre adventure cachée pendant le combat,
  // boutons d'action en grille 2×2 avec touch targets ≥56px.
  const battle = await page.evaluate(() => {
    const cmdBar = document.querySelector('.commands-bar');
    const actions = document.querySelector('.battle-actions');
    const btn = actions ? actions.querySelector('.cmd-btn') : null;
    return {
      bodyHasInBattle: document.body.classList.contains('in-battle'),
      cmdBarHidden:    cmdBar ? getComputedStyle(cmdBar).display === 'none' : null,
      actionsDisplay:  actions ? getComputedStyle(actions).display : null,
      actionsCols:     actions ? getComputedStyle(actions).gridTemplateColumns : null,
      btnMinHeight:    btn ? parseFloat(getComputedStyle(btn).minHeight) : 0
    };
  });
  console.log('  battle ergonomics :', battle);
  assert(battle.bodyHasInBattle === true,                   'body.in-battle doit être posé pendant le combat');
  assert(battle.cmdBarHidden === true,                      'commands-bar doit être cachée pendant le combat sur mobile');
  assert(battle.actionsDisplay === 'grid',                  'battle-actions doit passer en grille sur mobile en combat');
  // grid-template-columns peut être résolu en "px px" — compter le nombre de tracks
  const trackCount = (battle.actionsCols || '').trim().split(/\s+/).filter(Boolean).length;
  assert(trackCount === 2,                                  `battle-actions doit être 2 colonnes (${trackCount} vues)`);
  assert(battle.btnMinHeight >= 56,                         'boutons combat trop petits pour le tactile');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ ergonomie combat mobile correcte');
  await browser.close();
}

// ── Scénario 10 : multi-slots de sauvegarde ───────────────────

async function scenarioSaveSlots() {
  console.log('\n── Scénario 10 : sauvegarde multi-slots ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const t1 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    const wroteOk = writeSlot('manual_2', 'Manuel');
    const list    = listSaveSlots();
    const slot    = readSlot('manual_2');
    return {
      wroteOk,
      listLen:    list.length,
      listFirst:  list[0] ? list[0].id : null,
      hasMeta:    !!slot && !!slot.meta,
      hasState:   !!slot && !!slot.state,
      heroName:   slot && slot.meta && slot.meta.heroNames[0],
      house:      slot && slot.meta && slot.meta.house,
      level:      slot && slot.meta && slot.meta.level
    };
  });
  console.log('  T1 write/read:', t1);
  assert(t1.wroteOk,                      'writeSlot(manual_2) devrait réussir');
  assert(t1.listLen === 1,                'listSaveSlots devrait renvoyer 1 entrée');
  assert(t1.listFirst === 'manual_2',     'le slot listé doit être manual_2');
  assert(t1.hasMeta && t1.hasState,       'slot doit contenir meta + state');
  assert(/Harry/.test(t1.heroName || ''), 'meta.heroNames[0] doit refléter Harry');
  assert(t1.house === 'Gryffondor',       'meta.house doit refléter Gryffondor');
  assert(t1.level === 1,                  'meta.level doit refléter le niveau courant');

  const t2 = await page.evaluate(() => {
    const ok = deleteSlot('manual_2');
    return { ok, listLen: listSaveSlots().length };
  });
  console.log('  T2 delete   :', t2);
  assert(t2.ok && t2.listLen === 0, 'deleteSlot doit retirer le slot');

  // Migration de la clé legacy
  const t3 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_saves');
    saveGame();
    const legacyExisted = !!localStorage.getItem('hogwarts_rpg_save');
    const ok    = migrateLegacyKey();
    const ok2   = migrateLegacyKey();
    const list  = listSaveSlots();
    const slot1 = readSlot('manual_1');
    const legacyAfter = !!localStorage.getItem('hogwarts_rpg_save');
    return {
      legacyExisted,
      migratedOnce: ok,
      idempotent:   ok2,
      legacyAfter,
      listLen:      list.length,
      slot1HasMeta: !!slot1 && !!slot1.meta,
      slot1Label:   slot1 && slot1.meta && slot1.meta.label
    };
  });
  console.log('  T3 migrate  :', t3);
  assert(t3.legacyExisted,        'saveGame() doit produire la clé legacy');
  assert(t3.migratedOnce === true,'migrateLegacyKey doit réussir la 1re fois');
  assert(t3.idempotent === false, 'migrateLegacyKey doit être idempotent (no-op après)');
  assert(t3.legacyAfter === false,'la clé legacy doit être supprimée après migration');
  assert(t3.listLen === 1 && t3.slot1HasMeta, 'manual_1 doit contenir le slot migré');
  assert(t3.slot1Label === 'Importée', 'le slot migré doit porter le label "Importée"');

  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ multi-slots conformes (write/read/delete + migration legacy)');
  await browser.close();
}

// ── Scénario 11 : modale de choix de slot (UI) ────────────────

async function scenarioSlotModal() {
  console.log('\n── Scénario 11 : modale de choix de slot ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Reset clean state
  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  // Ouvrir le dialogue de sauvegarde
  const t1 = await page.evaluate(() => {
    openSaveDialog();
    const modal = document.getElementById('slot-modal');
    const cards = modal.querySelectorAll('[data-slot-id]');
    return {
      visible:    modal && getComputedStyle(modal).display !== 'none',
      title:      document.getElementById('slot-modal-title').textContent,
      cardCount:  cards.length,
      hasManual1: !!modal.querySelector('[data-slot-id="manual_1"]'),
      hasAuto:    !!modal.querySelector('[data-slot-id="auto"]')
    };
  });
  console.log('  T1 open save :', t1);
  assert(t1.visible,                   'la modale doit être visible');
  assert(/Sauvegarder/.test(t1.title), 'le titre doit refléter le mode save');
  assert(t1.cardCount >= 3,            'au moins les 3 slots manuels doivent être listés');
  assert(t1.hasManual1,                'manual_1 doit être présent');

  // Cliquer le slot manual_2 (vide → on écrit)
  const t2 = await page.evaluate(() => {
    const card = document.querySelector('[data-slot-id="manual_2"]');
    card.click();
    const slot = readSlot('manual_2');
    return {
      slotWritten: !!slot && !!slot.state,
      heroName:    slot && slot.meta && slot.meta.heroNames[0],
      modalClosed: getComputedStyle(document.getElementById('slot-modal')).display === 'none'
    };
  });
  console.log('  T2 click save:', t2);
  assert(t2.slotWritten,             'cliquer une carte vide en mode save doit écrire le slot');
  assert(/Harry/.test(t2.heroName),  'meta.heroNames[0] doit refléter Harry');
  assert(t2.modalClosed,             'la modale doit se fermer après écriture');

  // Réouvrir en mode load → le slot doit y figurer
  const t3 = await page.evaluate(() => {
    openLoadDialog();
    const modal = document.getElementById('slot-modal');
    const cards = modal.querySelectorAll('[data-slot-id]');
    return {
      title:       document.getElementById('slot-modal-title').textContent,
      cardCount:   cards.length,
      hasManual2:  !!modal.querySelector('[data-slot-id="manual_2"]'),
      manual2Mode: modal.querySelector('[data-slot-id="manual_2"]').getAttribute('data-mode')
    };
  });
  console.log('  T3 open load :', t3);
  assert(/Charger/.test(t3.title),       'le titre doit refléter le mode load');
  assert(t3.hasManual2,                  'manual_2 doit être listé en load');
  assert(t3.manual2Mode === 'load',      'data-mode=load attendu en mode load');
  assert(t3.cardCount === 1,             'seul manual_2 (rempli) doit être listé en load');

  // Cleanup
  await page.evaluate(() => {
    closeModal('slot-modal');
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ modale slot conforme (save → load round-trip)');
  await browser.close();
}

// ── Scénario 12 : auto-sauvegarde sur événements-clés ────────

async function scenarioAutoSave() {
  console.log('\n── Scénario 12 : auto-sauvegarde ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    // forcer le throttle à zéro
    if (typeof _autoSaveLastAt !== 'undefined') _autoSaveLastAt = 0;
  });

  // T1 : appel direct
  const t1 = await page.evaluate(() => {
    const ok = autoSave('test-direct');
    const slot = readSlot('auto');
    return {
      ok,
      hasSlot:    !!slot,
      label:      slot && slot.meta && slot.meta.label,
      reason:     slot && slot.meta && slot.meta.reason,
      hasState:   !!slot && !!slot.state
    };
  });
  console.log('  T1 direct  :', t1);
  assert(t1.ok,                       'autoSave doit réussir hors combat');
  assert(t1.hasSlot,                  'le slot auto doit être créé');
  assert(t1.label === 'Auto',         'meta.label doit valoir "Auto"');
  assert(t1.reason === 'test-direct', 'meta.reason doit refléter la raison');
  assert(t1.hasState,                 'le slot doit contenir state');

  // T2 : refusé en plein combat
  const t2 = await page.evaluate(() => {
    inBattle = true;
    if (typeof _autoSaveLastAt !== 'undefined') _autoSaveLastAt = 0;
    const ok = autoSave('test-in-battle');
    inBattle = false;
    return { ok };
  });
  console.log('  T2 inBattle:', t2);
  assert(t2.ok === false, 'autoSave doit refuser en combat');

  // T3 : refusé sans chosenHouse
  const t3 = await page.evaluate(() => {
    const saved = chosenHouse;
    chosenHouse = null;
    if (typeof _autoSaveLastAt !== 'undefined') _autoSaveLastAt = 0;
    const ok = autoSave('test-no-house');
    chosenHouse = saved;
    return { ok };
  });
  console.log('  T3 no-house:', t3);
  assert(t3.ok === false, 'autoSave doit refuser avant la sélection de maison');

  // T4 : throttle même raison répétée
  const t4 = await page.evaluate(() => {
    if (typeof _autoSaveLastByReason !== 'undefined') {
      Object.keys(_autoSaveLastByReason).forEach(k => delete _autoSaveLastByReason[k]);
    }
    if (typeof _autoSaveLastAt !== 'undefined') _autoSaveLastAt = 0;
    const a = autoSave('repeated');
    const b = autoSave('repeated');
    return { first: a, second: b };
  });
  console.log('  T4 throttle même raison:', t4);
  assert(t4.first === true && t4.second === false,
         'même raison appelée 2× rapidement doit throttler la 2e');

  // T5 : raisons différentes ne se throttlent pas mutuellement
  const t5 = await page.evaluate(() => {
    if (typeof _autoSaveLastByReason !== 'undefined') {
      Object.keys(_autoSaveLastByReason).forEach(k => delete _autoSaveLastByReason[k]);
    }
    const a = autoSave('first');
    const b = autoSave('second');
    return { first: a, second: b };
  });
  console.log('  T5 raisons distinctes:', t5);
  assert(t5.first === true && t5.second === true,
         'deux raisons distinctes doivent passer le throttle');

  // Cleanup
  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ auto-save : direct, garde-fou combat/maison, throttle');
  await browser.close();
}

// ── Scénario 13 : hub démarrage (Nouvelle / Reprendre) ───────

async function scenarioStartHub() {
  console.log('\n── Scénario 13 : hub démarrage ──');
  const { browser, page, errors } = await launchGame();

  // T1 : aucun slot → click title → bypass direct vers player-select
  const t1 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    enterStartHub();
    return {
      titleHidden: getComputedStyle(document.getElementById('title-screen')).display === 'none',
      hubHidden:   getComputedStyle(document.getElementById('start-hub-screen')).display === 'none',
      psVisible:   getComputedStyle(document.getElementById('player-select-screen')).display !== 'none'
    };
  });
  console.log('  T1 no-slot →', t1);
  assert(t1.titleHidden && t1.hubHidden && t1.psVisible,
         'sans slot : on doit aller direct sur player-select sans afficher le hub');

  // T2 : avec un slot → click title → hub affiché avec le slot
  const t2 = await page.evaluate(() => {
    // Créer un slot via le flux normal
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
    return new Promise(resolve => {
      const tick = () => {
        // Le flow nouvelle partie passe désormais par #intro-screen.
        // Si l'écran d'intro est ouvert, on le dismisse avant de poller startGame.
        const introEl = document.getElementById('intro-screen');
        if (introEl && introEl.style.display === 'flex' && typeof _finishIntro === 'function') {
          while (typeof _introPage === 'number' && _introPage < _introPages.length - 1) _advanceIntro();
          _finishIntro();
        }
        if (Array.isArray(party) && party[0] && party[0].hp > 0 && Array.isArray(enemyMap)) {
          // Écrire dans manual_1 puis revenir au title
          writeSlot('manual_1', 'Manuel');
          // Replier les écrans de jeu pour simuler un retour au démarrage
          document.getElementById('game-container').style.display = 'none';
          document.getElementById('player-select-screen').style.display = 'none';
          document.getElementById('title-screen').style.display = 'flex';
          enterStartHub();
          const hub = document.getElementById('start-hub-screen');
          const list = document.getElementById('start-hub-slot-list');
          resolve({
            hubVisible:    getComputedStyle(hub).display !== 'none',
            cardCount:     list.querySelectorAll('[data-slot-id]').length,
            hasManual1:    !!list.querySelector('[data-slot-id="manual_1"]')
          });
        } else {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });
  });
  console.log('  T2 with slot →', t2);
  assert(t2.hubVisible,         'le hub doit être visible quand un slot existe');
  assert(t2.cardCount === 1,    'la liste hub doit contenir le slot manual_1');
  assert(t2.hasManual1,         'manual_1 doit y figurer');

  // T3 : click sur le slot → chargement direct (game-container visible, hub caché)
  const t3 = await page.evaluate(async () => {
    document.querySelector('#start-hub-slot-list [data-slot-id="manual_1"]').click();
    // loadSlotAndStart est async (loadTextures), on poll le résultat
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const gc = document.getElementById('game-container');
      if (gc && getComputedStyle(gc).display === 'grid') break;
      await new Promise(r => setTimeout(r, 50));
    }
    return {
      gameVisible: getComputedStyle(document.getElementById('game-container')).display === 'grid',
      hubHidden:   getComputedStyle(document.getElementById('start-hub-screen')).display === 'none',
      house:       chosenHouse,
      heroLoaded:  player && player.name
    };
  });
  console.log('  T3 load-slot →', t3);
  assert(t3.gameVisible,                      'game-container doit s\'afficher après load');
  assert(t3.hubHidden,                        'hub doit être caché après load');
  assert(t3.house === 'Gryffondor',           'chosenHouse doit refléter la sauvegarde chargée');
  assert(/Harry/.test(t3.heroLoaded || ''),   'player doit refléter Harry chargé');

  // T4 : bouton "Nouvelle aventure" → bascule sur player-select
  const t4 = await page.evaluate(() => {
    document.getElementById('start-hub-screen').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    startHubNewGame();
    return {
      hubHidden:  getComputedStyle(document.getElementById('start-hub-screen')).display === 'none',
      psVisible:  getComputedStyle(document.getElementById('player-select-screen')).display !== 'none'
    };
  });
  console.log('  T4 new btn →', t4);
  assert(t4.hubHidden && t4.psVisible, 'bouton Nouvelle aventure doit fermer le hub et ouvrir player-select');

  // T5 : régression — charger un slot d'un héros non-Harry doit afficher
  // le bon portrait (bug 2026-05-09 : portrait restait sur Harry).
  const t5 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    selectedPartySize = 1;
    selectedHeroes    = ['celeste'];
    confirmHeroSelection();
    chooseHouse('Serdaigle');
    return new Promise(resolve => {
      const tick = () => {
        const introEl = document.getElementById('intro-screen');
        if (introEl && introEl.style.display === 'flex' && typeof _finishIntro === 'function') {
          while (typeof _introPage === 'number' && _introPage < _introPages.length - 1) _advanceIntro();
          _finishIntro();
        }
        if (Array.isArray(party) && party[0] && party[0].hp > 0 && Array.isArray(enemyMap)) {
          writeSlot('manual_1', 'Céleste');
          document.getElementById('game-container').style.display = 'none';
          document.getElementById('player-select-screen').style.display = 'none';
          document.getElementById('title-screen').style.display = 'flex';
          // Sabote volontairement le DOM pour reproduire l'état "fraîche
          // ouverture de page" : le src par défaut harry.png + nom Harry.
          const p = document.querySelector('#char-card-0 .party-portrait-img');
          if (p) { p.src = 'img/harry.png'; p.alt = 'Harry'; }
          const nm = document.getElementById('char-name-0');
          if (nm) nm.textContent = 'Harry Potter';
          enterStartHub();
          resolve(true);
        } else {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });
  });
  assert(t5 === true, 'setup T5 doit terminer');

  await page.evaluate(() => {
    document.querySelector('#start-hub-slot-list [data-slot-id="manual_1"]').click();
  });
  // Attendre la fin du load asynchrone
  await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const gc = document.getElementById('game-container');
      if (gc && getComputedStyle(gc).display === 'grid') break;
      await new Promise(r => setTimeout(r, 50));
    }
  });
  const t5b = await page.evaluate(() => {
    const portrait = document.querySelector('#char-card-0 .party-portrait-img');
    return {
      portraitSrc: portrait ? portrait.getAttribute('src') : null,
      portraitAlt: portrait ? portrait.getAttribute('alt') : null,
      playerName:  player && player.name,
      playerImg:   player && player.imgSrc,
      domName:     document.getElementById('char-name-0').textContent
    };
  });
  console.log('  T5 load celeste →', t5b);
  assert(/celeste\.png$/.test(t5b.portraitSrc || ''),
         `portrait DOM doit pointer sur celeste.png (était : ${t5b.portraitSrc})`);
  assert(/Céleste/.test(t5b.playerName || ''),  'player.name doit refléter Céleste chargée');
  assert(/celeste\.png$/.test(t5b.playerImg || ''), 'player.imgSrc doit pointer sur celeste.png');
  assert(/Céleste/.test(t5b.domName || ''),     'le nom affiché doit être Céleste');

  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ hub démarrage : bypass sans slot, affichage avec slot, load direct, nouvelle aventure, portrait correct');
  await browser.close();
}

// ── Scénario 13c : SCENE_ICONS (extraction SVG) ───────────────

async function scenarioSceneIcons() {
  console.log('\n── Scénario 13c : SCENE_ICONS ──');
  const { browser, page, errors } = await launchGame();

  const t1 = await page.evaluate(() => {
    const svgKeys = ['chest', 'shop', 'stairs_d', 'stairs_u'];
    const ok = svgKeys.every(k => typeof SCENE_ICONS[k] === 'string'
                                && SCENE_ICONS[k].startsWith('<svg'));
    const fountainOk = typeof SCENE_ICONS.fountain === 'function';
    const active = SCENE_ICONS.fountain({ dried: false });
    const dried  = SCENE_ICONS.fountain({ dried: true });
    return {
      svgOk: ok,
      fountainOk,
      activeAnimated:  active.includes('<animate'),
      driedNoAnimate:  !dried.includes('<animate'),
      activeIsSvg:     active.startsWith('<svg'),
      driedIsSvg:      dried.startsWith('<svg')
    };
  });
  console.log('  T1 SCENE_ICONS :', t1);
  assert(t1.svgOk,             '4 SVG statiques (chest/shop/stairs_d/stairs_u) doivent être des strings <svg>');
  assert(t1.fountainOk,        'SCENE_ICONS.fountain doit être une fonction');
  assert(t1.activeIsSvg && t1.driedIsSvg, 'la fontaine doit retourner un SVG dans les deux états');
  assert(t1.activeAnimated,    'fontaine active doit contenir <animate (jet/gouttes)');
  assert(t1.driedNoAnimate,    'fontaine tarie doit retirer toutes les animations');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ SCENE_ICONS : 4 SVG + fontaine paramétrée (active/tarie)');
  await browser.close();
}

// ── Scénario 13b : helper tryAddItem (cap inventaire 16) ─────

async function scenarioTryAddItem() {
  console.log('\n── Scénario 13b : tryAddItem ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page);

  const t1 = await page.evaluate(() => {
    player.inventory = [];
    const r1 = tryAddItem('potion_s', { silent: true });
    const r2 = tryAddItem(ITEMS[0],   { silent: true });
    const r3 = tryAddItem('idée_inexistante', { silent: true });
    return { r1, r2, r3, len: player.inventory.length };
  });
  console.log('  T1 ajouts simples :', t1);
  assert(t1.r1 === true,  'tryAddItem doit accepter un id valide');
  assert(t1.r2 === true,  'tryAddItem doit accepter un objet item');
  assert(t1.r3 === false, 'tryAddItem doit refuser un id inconnu');
  assert(t1.len === 2,    'inventaire doit contenir 2 items après les 2 succès');

  const t2 = await page.evaluate(() => {
    player.inventory = Array.from({ length: 16 }, () => ({ ...ITEMS[0] }));
    const r = tryAddItem('potion_s', { silent: true });
    return { r, len: player.inventory.length };
  });
  console.log('  T2 cap 16 atteint :', t2);
  assert(t2.r === false, 'tryAddItem doit refuser quand inventaire plein');
  assert(t2.len === 16,  'inventaire ne doit pas dépasser INVENTORY_MAX');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ tryAddItem : id, objet, cap 16');
  await browser.close();
}

// ── Scénario 14 : salle fontaine ─────────────────────────────

async function scenarioFountain() {
  console.log('\n── Scénario 14 : salle fontaine ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page);

  // T1 : génération forcée à floor=2 doit poser au moins une CELL.FOUNTAIN
  const t1 = await page.evaluate(() => {
    currentFloor = 2;
    floorDungeons = {};
    generateDungeon(2);
    let count = 0;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.FOUNTAIN) count++;
      }
    }
    return { count, fountainEnum: CELL.FOUNTAIN };
  });
  console.log('  T1 génération floor=2 →', t1);
  assert(t1.fountainEnum === 7, 'CELL.FOUNTAIN doit valoir 7');
  assert(t1.count >= 1, 'au moins une fontaine sur l\'étage 2');

  // T2 : pas de fontaine à un étage non éligible (ex. floor=3)
  const t2 = await page.evaluate(() => {
    currentFloor = 3;
    floorDungeons = {};
    generateDungeon(3);
    let count = 0;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.FOUNTAIN) count++;
      }
    }
    return { count };
  });
  console.log('  T2 pas de fontaine étage 3 →', t2);
  assert(t2.count === 0, 'aucune fontaine sur l\'étage 3 (cycle 2/5/8…)');

  // T3 : useFountain() guérit complètement, blocage au second usage
  const t3 = await page.evaluate(() => {
    currentFloor = 2;
    floorDungeons = {};
    generateDungeon(2);
    // Trouve la fontaine et téléporte le joueur dessus
    let fx = -1, fy = -1;
    for (let y = 0; y < dungeon.length && fx === -1; y++) {
      for (let x = 0; x < dungeon[y].length && fx === -1; x++) {
        if (dungeon[y][x] === CELL.FOUNTAIN) { fx = x; fy = y; }
      }
    }
    playerX = fx; playerY = fy;
    // Blesse le groupe
    party.forEach(c => { c.hp = 1; c.sp = 0; });
    const before = party.map(c => ({ hp: c.hp, sp: c.sp }));
    useFountain();
    const after  = party.map(c => ({ hp: c.hp, sp: c.sp, hpMax: c.hpMax, spMax: c.spMax }));
    // 2e usage doit rester tarie
    party.forEach(c => { c.hp = 1; c.sp = 0; });
    useFountain();
    const after2 = party.map(c => ({ hp: c.hp, sp: c.sp }));
    return { before, after, after2, dried: usedFountains.has(`${fx},${fy}`) };
  });
  console.log('  T3 soin fontaine →', t3);
  t3.after.forEach((c, i) => {
    assert(c.hp === c.hpMax, `personnage ${i} HP plein après fontaine`);
    assert(c.sp === c.spMax, `personnage ${i} SP plein après fontaine`);
  });
  assert(t3.dried, 'usedFountains doit contenir la clé après usage');
  t3.after2.forEach((c, i) => {
    assert(c.hp === 1, `personnage ${i} : 2e usage doit rester sans effet`);
  });

  // T4 : sortir et revenir → fontaine ré-active
  const t4 = await page.evaluate(() => {
    // étage 2 garde une fontaine déjà utilisée
    const beforeKeys = Array.from(usedFountains);
    goDeeper();           // floor=3
    return new Promise(resolve => {
      const wait = () => {
        if (currentFloor === 3) {
          goUp();         // retour floor=2 depuis le cache
          setTimeout(() => {
            resolve({
              beforeKeys,
              afterKeys: Array.from(usedFountains),
              currentFloor
            });
          }, 700);
        } else setTimeout(wait, 50);
      };
      setTimeout(wait, 700);
    });
  });
  console.log('  T4 cycle quitter/revenir →', t4);
  assert(t4.afterKeys.length === 0, 'usedFountains doit être réinitialisé au retour sur l\'étage');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ fontaine : génération conditionnelle, soin total, blocage 2e usage, ré-active après cycle');
  await browser.close();
}

// ── Scénario 15 : softlock solo (Harry KO en mode 1 joueur) ──

async function scenarioSoloSoftlock() {
  console.log('\n── Scénario 15 : softlock solo ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : allPartyKO ne doit dépendre QUE de partySize premiers
  const t1 = await page.evaluate(() => {
    party[0].hp = 0;       // Harry KO
    party[1].hp = 28;      // Hermione vivante mais inactive en solo
    return { koSolo: allPartyKO(), partySize };
  });
  console.log('  T1 allPartyKO solo Harry KO →', t1);
  assert(t1.partySize === 1, 'mode solo bien actif');
  assert(t1.koSolo === true, 'allPartyKO doit retourner true en solo si Harry KO, indépendamment d\'Hermione');

  // T2 : combat solo, après mort de Harry → triggerDeath déclenché
  const t2 = await page.evaluate(async () => {
    party[0].hp = 35; party[1].hp = 28;
    const enemy = {
      id: 'big_dummy', name: 'Big Mannequin', icon: '🎯',
      hp: 9999, atk: 9999, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'Test'
    };
    startBattle(enemy);
    // Force la mort de Harry pour simuler le coup fatal
    party[0].hp = 0;
    // Déclenche le check qui doit se transformer en triggerDeath
    return new Promise((resolve) => {
      setTimeout(() => {
        const before = inBattle;
        // appel direct du flux : si allPartyKO renvoie true, endBattle(false)/triggerDeath
        const ko = allPartyKO();
        resolve({ harryHp: party[0].hp, hermioneHp: party[1].hp, ko, inBattleBefore: before });
      }, 50);
    });
  });
  console.log('  T2 combat solo Harry mort →', t2);
  assert(t2.ko === true,
         'allPartyKO doit signaler le KO solo même si Hermione (slot inactif) reste à 28');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ softlock solo : allPartyKO ne tient plus compte d\'Hermione en solo');
  await browser.close();
}

// ── Scénario 16 : résilience save (legacy corrompue) ─────────

async function scenarioCorruptSave() {
  console.log('\n── Scénario 16 : résilience save corrompue ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page);

  // T1 : legacy save corrompue → loadGame() ne plante pas, message d'erreur
  const t1 = await page.evaluate(() => {
    localStorage.setItem('hogwarts_rpg_save', '{ this is not json');
    let threw = false;
    try { loadGame(); } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  T1 legacy corrompue →', t1);
  assert(t1.threw === false, 'loadGame ne doit pas propager d\'exception sur JSON cassé');

  // Cleanup
  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ save corrompue : loadGame robuste, aucune exception propagée');
  await browser.close();
}

// ── Scénario 17 : icônes pixel art de la barre de commandes ──

async function scenarioCmdBtnIcons() {
  console.log('\n── Scénario 17 : icônes barre de commandes ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Présence + chargement des PNG
  const t1 = await page.evaluate(() => {
    const sel = (s) => document.querySelector(s);
    const checks = {
      backpack:  sel('button[onclick="openInventory()"] .btn-icon img'),
      spellbook: sel('button[onclick="openSpells()"] .btn-icon img'),
      scroll:    sel('button[onclick="openCharacter()"] .btn-icon img'),
      bestiary:  sel('button[onclick="openBestiary()"] .btn-icon img'),
      quest:     sel('button[onclick="openQuestLog()"] .btn-icon img'),
      search:    sel('#btn-search .btn-icon img'),
      rest:      sel('button[onclick="rest()"] .btn-icon img'),
      music:     sel('#btn-music .btn-icon img'),
      voice:     sel('#btn-voice .btn-icon img'),
      save:      sel('button[onclick="openSaveDialog()"] .btn-icon img'),
      load:      sel('button[onclick="openLoadDialog()"] .btn-icon img'),
      gear:      sel('button[onclick="changeDifficulty()"] .btn-icon img'),
      map:       sel('.mobile-map-btn .btn-icon img'),
    };
    return Object.fromEntries(Object.entries(checks).map(([k, el]) => [k, {
      exists:  !!el,
      src:     el && el.getAttribute('src'),
      hasSrc:  !!(el && el.getAttribute('src') && el.getAttribute('src').startsWith('img/icons/')),
      loaded:  !!(el && el.complete && el.naturalWidth > 0)
    }]));
  });
  for (const [name, c] of Object.entries(t1)) {
    console.log(`  ${name.padEnd(10)} → exists=${c.exists} loaded=${c.loaded} src=${c.src}`);
    assert(c.exists, `${name}: <img> absent du DOM`);
    assert(c.hasSrc, `${name}: src ne pointe pas vers img/icons/`);
    assert(c.loaded, `${name}: PNG non chargé (404 ou cassé)`);
  }

  // Toggle music + voice doit changer le src de l'<img>
  const t2 = await page.evaluate(() => {
    const musicImg = document.querySelector('#btn-music img');
    const voiceImg = document.querySelector('#btn-voice img');
    const before = { music: musicImg.getAttribute('src'), voice: voiceImg.getAttribute('src') };
    AudioSystem.toggleMute();
    AudioSystem.toggleVoice();
    const after = { music: musicImg.getAttribute('src'), voice: voiceImg.getAttribute('src') };
    // Restaurer l'état initial
    AudioSystem.toggleMute();
    AudioSystem.toggleVoice();
    return { before, after };
  });
  console.log('  toggle audio :', t2);
  assert(t2.before.music !== t2.after.music, 'toggle music doit changer le src de l\'icône');
  assert(t2.before.voice !== t2.after.voice, 'toggle voice doit changer le src de l\'icône');
  assert(/music_off\.png$/.test(t2.after.music), 'après toggleMute, src doit pointer vers music_off.png');
  assert(/voice_off\.png$/.test(t2.after.voice), 'après toggleVoice (off), src doit pointer vers voice_off.png');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ icônes UI : 13 icônes présentes, chargées + toggle music/voice fonctionnel');
  await browser.close();
}

// ── Scénario 18 : Phase 1 — UI chrome + HUD stats ────────────

async function scenarioUiChromeIcons() {
  console.log('\n── Scénario 18 : Phase 1 — UI chrome + HUD stats ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : les icônes HUD (game-title, gold-display, barres HP/MP/XP, dpad, shop) sont des <img> chargés
  const t1 = await page.evaluate(() => {
    const grab = (sel) => {
      const el = document.querySelector(sel);
      const img = el ? el.querySelector('img') : null;
      return img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 } : null;
    };
    return {
      gameTitle: grab('.game-title'),
      gold:      grab('#gold-display'),
      hp0:       grab('#char-card-0 .stat-bar-row:nth-child(2) .bar-label'),
      mp0:       grab('#char-card-0 .stat-bar-row:nth-child(3) .bar-label'),
      hp1:       grab('#char-card-1 .stat-bar-row:nth-child(2) .bar-label'),
      mp1:       grab('#char-card-1 .stat-bar-row:nth-child(3) .bar-label'),
      xp:        grab('#xp-label'),
      dpad:      grab('.dpad-center'),
      shopTitle: grab('#shop-title')
    };
  });
  console.log('  T1 HUD icons →', JSON.stringify(t1, null, 2));
  const checks = {
    gameTitle: /hp\.png$/,
    gold:      /gold\.png$/,
    hp0:       /hp\.png$/,
    mp0:       /mp\.png$/,
    hp1:       /hp\.png$/,
    mp1:       /mp\.png$/,
    xp:        /xp\.png$/,
    dpad:      /hp\.png$/,
    shopTitle: /shop_sign\.png$/
  };
  for (const [key, regex] of Object.entries(checks)) {
    assert(t1[key] !== null,                   `${key} : doit avoir un <img>`);
    assert(regex.test(t1[key].src),            `${key} : src doit matcher ${regex} (était ${t1[key].src})`);
    assert(t1[key].loaded === true,            `${key} : image doit être chargée (pas de 404)`);
  }

  // T2 : la fiche de personnage (modale) contient bien les <img> pour chaque stat
  const t2 = await page.evaluate(() => {
    openCharacter(0);
    const modal = document.getElementById('char-detail');
    const imgs = Array.from(modal.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T2 fiche perso →', t2);
  ['hp.png', 'mp.png', 'atk.png', 'def.png', 'str.png', 'int.png', 'agi.png', 'xp.png', 'mag.png', 'gold.png'].forEach(name => {
    assert(t2.some(s => s.endsWith(name)), `fiche perso doit contenir ${name}`);
  });

  // T3 : updateUI() après une mutation de gold maintient l'<img> (pas de regression sur innerHTML)
  const t3 = await page.evaluate(() => {
    player.gold = 999;
    updateUI();
    const el = document.getElementById('gold-display');
    const img = el.querySelector('img');
    return { hasImg: !!img, src: img && img.getAttribute('src'), txt: el.textContent.trim() };
  });
  console.log('  T3 updateUI gold →', t3);
  assert(t3.hasImg,                   'gold-display doit conserver son <img> après updateUI');
  assert(/gold\.png$/.test(t3.src),   'gold-display src doit rester sur gold.png');
  assert(t3.txt.includes('999'),      'le montant Gallions doit être mis à jour');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 1 : 9 icônes HUD + 10 stats fiche perso + persistance après updateUI');
  await browser.close();
}

// ── Scénario 19 : Phase 2 — équipement slots + status + resolver ──

async function scenarioEquipmentAndStatusIcons() {
  console.log('\n── Scénario 19 : Phase 2 — équipement slots + status + resolver ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : resolver disponible et registre slot peuplé
  const t1 = await page.evaluate(() => ({
    hasGetItemIconHtml:        typeof getItemIconHtml === 'function',
    hasGetEquipmentSlotIcon:   typeof getEquipmentSlotIconHtml === 'function',
    hasGetStatusIconHtml:      typeof getStatusIconHtml === 'function',
    slotWand:    EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.wand,
    slotArmor:   EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.armor,
    slotAcc:     EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.acc,
    statusBurn:  STATUS_ICON_REGISTRY && STATUS_ICON_REGISTRY.burn
  }));
  console.log('  T1 resolver →', t1);
  assert(t1.hasGetItemIconHtml,        'getItemIconHtml doit exister');
  assert(t1.hasGetEquipmentSlotIcon,   'getEquipmentSlotIconHtml doit exister');
  assert(t1.hasGetStatusIconHtml,      'getStatusIconHtml doit exister');
  assert(/wand\.png$/.test(t1.slotWand),       'slot wand doit pointer wand.png');
  assert(/armor\.png$/.test(t1.slotArmor),     'slot armor doit pointer armor.png');
  assert(/accessory\.png$/.test(t1.slotAcc),   'slot acc doit pointer accessory.png');
  assert(/burn\.png$/.test(t1.statusBurn),     'status burn doit pointer burn.png');

  // T2 : registre per-item override (architecture pour Phase 4)
  const t2 = await page.evaluate(() => {
    // Simuler une entrée Phase 4
    ITEM_ICON_REGISTRY['wand_houx'] = 'img/icons/items/wand_houx.png';
    const fakeItem = { id: 'wand_houx', type: 'wand', name: 'Baguette de Houx', icon: '🪄' };
    const html = getItemIconHtml(fakeItem);
    delete ITEM_ICON_REGISTRY['wand_houx'];
    // Sans entrée, doit fallback sur slot
    const html2 = getItemIconHtml(fakeItem);
    return { override: html, fallback: html2 };
  });
  console.log('  T2 override →', t2);
  assert(/wand_houx\.png/.test(t2.override),  'registry per-item doit prendre la priorité');
  assert(/img\/icons\/wand\.png/.test(t2.fallback), 'sans override, fallback sur slot wand.png');

  // T3 : équipement panneau gauche affiche les slot icons
  const t3 = await page.evaluate(() => {
    const root = document.querySelector('.left-panel');
    const imgs = Array.from(root.querySelectorAll('img.ui-icon'))
                      .map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T3 panneau gauche →', t3);
  assert(t3.some(s => s.endsWith('wand.png')),       'panneau gauche doit afficher wand.png');
  assert(t3.some(s => s.endsWith('armor.png')),      'panneau gauche doit afficher armor.png');
  assert(t3.some(s => s.endsWith('accessory.png')),  'panneau gauche doit afficher accessory.png');

  // T4 : fiche perso — slots vides retombent sur slot icons (wand/armor/accessory)
  // (pas d'item équipé sur Harry au démarrage → fallback slot attendu)
  const t4 = await page.evaluate(() => {
    if (!player.equipped) player.equipped = {};
    // Reset équipement pour forcer le fallback slot
    player.equipped = { wand: null, armor: null, acc: null };
    openCharacter(0);
    const detail = document.getElementById('char-detail');
    const html = detail.innerHTML;
    return {
      hasWand:  /img\/icons\/wand\.png/.test(html),
      hasArmor: /img\/icons\/armor\.png/.test(html),
      hasAcc:   /img\/icons\/accessory\.png/.test(html)
    };
  });
  console.log('  T4 fiche slots vides →', t4);
  assert(t4.hasWand && t4.hasArmor && t4.hasAcc,
         'slots vides → fallback wand.png/armor.png/accessory.png');

  // T5 : fiche perso — slot avec item équipé utilise le sprite per-item.
  // wand1 est passé sur l'archi tint 2-calques (saule), donc on accepte
  // soit l'`<img>` du registry legacy, soit le wrapper `tinted-icon`.
  const t5 = await page.evaluate(() => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    player.equipped.wand = wand;
    openCharacter(0);
    const detail = document.getElementById('char-detail');
    const html = detail.innerHTML;
    return {
      hasPerItemImg:    /img\/icons\/items\/wand1\.png/.test(html),
      hasTintedWrapper: /tinted-icon[^"]*tint-willow/.test(html),
    };
  });
  console.log('  T5 fiche per-item →', t5);
  assert(t5.hasPerItemImg || t5.hasTintedWrapper,
         'wand1 équipé doit utiliser items/wand1.png OU wrapper tinted-icon');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 2 : resolver ITEM_ICON_REGISTRY/EQUIPMENT_SLOT_ICONS/STATUS + 8 icônes intégrées');
  await browser.close();
}

// ── Scénario 20 : Phase 3 — sortilèges (23 PNG + resolver) ──

async function scenarioSpellIcons() {
  console.log('\n── Scénario 20 : Phase 3 — sortilèges ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : registre + helper disponibles, tous les sorts mappés vers un PNG existant
  const t1 = await page.evaluate(async () => {
    const out = {
      hasRegistry: typeof SPELL_ICON_REGISTRY === 'object',
      hasHelper:   typeof getSpellIconHtml === 'function',
      total:       SPELLS.length,
      mapped:      SPELLS.filter(s => SPELL_ICON_REGISTRY[s.name]).length,
      missing:     SPELLS.filter(s => !SPELL_ICON_REGISTRY[s.name]).map(s => s.name)
    };
    // Charger chaque PNG et vérifier le succès
    const tries = await Promise.all(Object.values(SPELL_ICON_REGISTRY).map(src =>
      new Promise(resolve => {
        const im = new Image();
        im.onload = () => resolve({ src, ok: im.naturalWidth > 0 });
        im.onerror = () => resolve({ src, ok: false });
        im.src = src;
      })
    ));
    out.allLoaded = tries.every(t => t.ok);
    out.failedSrcs = tries.filter(t => !t.ok).map(t => t.src);
    return out;
  });
  console.log('  T1 registry →', t1);
  assert(t1.hasRegistry && t1.hasHelper,    'SPELL_ICON_REGISTRY + getSpellIconHtml requis');
  assert(t1.missing.length === 0,           `sorts non mappés : ${t1.missing.join(', ')}`);
  assert(t1.allLoaded === true,             `PNG manquants : ${t1.failedSrcs.join(', ')}`);

  // T2 : modale Sorts utilise les <img> du registre
  const t2 = await page.evaluate(() => {
    openSpells();
    const list = document.getElementById('spell-list');
    const imgs = Array.from(list.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return { count: imgs.length, all: imgs };
  });
  console.log('  T2 modale Sorts →', t2);
  // Harry a 5 sorts au démarrage : Expelliarmus, Stupefix, Episkey, Protego, Incendio
  assert(t2.count >= 5,                     `modale Sorts doit contenir ≥5 <img>, vu ${t2.count}`);
  ['expelliarmus','stupefix','episkey','protego','incendio'].forEach(name => {
    assert(t2.all.some(s => s.endsWith(`spells/${name}.png`)), `manque ${name}.png dans modale`);
  });

  // T3 : fallback emoji si sort absent du registre
  const t3 = await page.evaluate(() => {
    const fakeSpell = { name: 'SortInconnu', icon: '🦄' };
    return getSpellIconHtml(fakeSpell);
  });
  console.log('  T3 fallback →', t3);
  assert(t3 === '🦄', 'getSpellIconHtml doit fallback sur l\'emoji si sort absent du registre');

  // T4 : setBattleLog accepte du HTML (innerHTML) après refactor
  const t4 = await page.evaluate(() => {
    setBattleLog('<b>test-html</b>');
    const el = document.getElementById('battle-log');
    return { html: el.innerHTML, hasBold: !!el.querySelector('b') };
  });
  console.log('  T4 setBattleLog →', t4);
  assert(t4.hasBold, 'setBattleLog doit rendre le HTML (innerHTML), pas l\'échapper');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log(`  ✅ Phase 3 : 23 sorts mappés + modale + fallback + battle-log innerHTML`);
  await browser.close();
}

// ── Scénario 21 : Phase 4 — items (couverture 100% ITEMS[]) ──

async function scenarioItemIcons() {
  console.log('\n── Scénario 21 : Phase 4 — items ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : couverture 100% — chaque ITEMS[] a une entrée registry, chargée
  const t1 = await page.evaluate(async () => {
    const total   = ITEMS.length;
    const mapped  = ITEMS.filter(it => ITEM_ICON_REGISTRY[it.id]).length;
    const missing = ITEMS.filter(it => !ITEM_ICON_REGISTRY[it.id]).map(it => it.id);
    const tries = await Promise.all(Object.values(ITEM_ICON_REGISTRY).map(src =>
      new Promise(resolve => {
        const im = new Image();
        im.onload  = () => resolve({ src, ok: im.naturalWidth > 0 });
        im.onerror = () => resolve({ src, ok: false });
        im.src = src;
      })
    ));
    return {
      total, mapped, missing,
      allLoaded: tries.every(t => t.ok),
      failed:    tries.filter(t => !t.ok).map(t => t.src)
    };
  });
  console.log('  T1 couverture →', t1);
  assert(t1.missing.length === 0,        `items non mappés : ${t1.missing.join(', ')}`);
  assert(t1.mapped === t1.total,         `${t1.mapped}/${t1.total} mappés`);
  assert(t1.allLoaded,                   `PNG manquants : ${t1.failed.join(', ')}`);

  // T2 : grille inventaire utilise les PNG
  const t2 = await page.evaluate(() => {
    // Donner quelques items à Harry
    player.inventory = [
      ITEMS.find(i => i.id === 'potion_s'),
      ITEMS.find(i => i.id === 'wand1'),
      ITEMS.find(i => i.id === 'livre_sortileges')
    ];
    openInventory();
    const grid = document.getElementById('inv-grid');
    const elems = Array.from(grid.querySelectorAll('img.ui-icon, .tinted-icon'));
    // Pour `<img>` on lit src ; pour `.tinted-icon` on lit data-mask
    // (équivalent fonctionnel : sprite source identifiant l'item).
    return elems.map(e => e.getAttribute('src') || e.getAttribute('data-mask') || '');
  });
  console.log('  T2 inventaire →', t2);
  assert(t2.some(s => /items\/potion_s\.png$/.test(s)),         'inventaire doit afficher potion_s.png');
  assert(t2.some(s => /items\/wand1\.png$/.test(s) || s === 'wand_shaft_base'),
         'inventaire doit afficher wand1.png OU wrapper tinted (mask=wand_shaft_base)');
  assert(t2.some(s => /items\/livre_sortileges\.png$/.test(s)), 'inventaire doit afficher livre_sortileges.png');

  // T3 : grille boutique utilise les PNG (déclencher openShop avec un currentFloor>=1)
  const t3 = await page.evaluate(() => {
    closeModal('inventory-modal');
    currentFloor = 6;  // pour débloquer wand2 dans shop
    openShop();
    const list = document.getElementById('shop-grid');
    const imgs = Array.from(list.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T3 boutique →', t3);
  assert(t3.length >= 3,                                  `shop doit avoir au moins 3 items, vu ${t3.length}`);
  assert(t3.every(s => /items\/[a-z0-9_]+\.png$/.test(s)),   'tous les items shop doivent pointer img/icons/items/');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log(`  ✅ Phase 4 : ${t1.total} items mappés + inventaire + boutique 100% PNG`);
  await browser.close();
}

// ── Scénario 22 : équipement étendu — 11 slots + ring1/ring2 + migration ──

async function scenarioExtendedEquipment() {
  console.log('\n── Scénario 22 : équipement étendu (11 slots) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : equipped a bien 11 slots à l'init
  const t1 = await page.evaluate(() => Object.keys(player.equipped).sort());
  console.log('  T1 slots →', t1);
  const expected = ['amulet','belt','body','cloak','feet','hands','head','ring1','ring2','trinket','wand'];
  assert(JSON.stringify(t1) === JSON.stringify(expected),
         `equipped doit avoir 11 slots, got ${JSON.stringify(t1)}`);

  // T2 : items legacy ont reçu un slot explicite
  const t2 = await page.evaluate(() => ({
    wand1:    ITEMS.find(i => i.id === 'wand1').slot,
    robe1:    ITEMS.find(i => i.id === 'robe1').slot,
    amulette: ITEMS.find(i => i.id === 'amulette').slot,
    broom:    ITEMS.find(i => i.id === 'broom').slot,
    cape:     ITEMS.find(i => i.id === 'cape_invis').slot,
    chapeau:  ITEMS.find(i => i.id === 'chapeau_pointu').slot,
    diademe:  ITEMS.find(i => i.id === 'diademe_serdaigle').slot
  }));
  console.log('  T2 slot mapping →', t2);
  assert(t2.wand1    === 'wand',    'wand1 → wand');
  assert(t2.robe1    === 'body',    'robe1 → body');
  assert(t2.amulette === 'amulet',  'amulette → amulet');
  assert(t2.broom    === 'trinket', 'broom → trinket');
  assert(t2.cape     === 'cloak',   'cape_invis → cloak');
  assert(t2.chapeau  === 'head',    'chapeau_pointu → head');
  assert(t2.diademe  === 'head',    'diademe_serdaigle → head');

  // T3 : équiper la cape applique bonusAgi (auparavant ignoré)
  const t3 = await page.evaluate(() => {
    const baseAgi = player.agi;
    const cape = ITEMS.find(i => i.id === 'cape_invis');
    player.inventory.push({ ...cape });
    equipItem(player.inventory.length - 1, 0);
    return { baseAgi, equippedAgi: player.agi, slot: !!player.equipped.cloak };
  });
  console.log('  T3 cape équipée →', t3);
  assert(t3.slot, 'cape doit aller dans equipped.cloak');
  assert(t3.equippedAgi === t3.baseAgi + 5,
         `bonusAgi doit s'appliquer (got ${t3.equippedAgi - t3.baseAgi}, expected +5)`);

  // T4 : équiper deux anneaux → ring1 puis ring2 (item de test injecté)
  const t4 = await page.evaluate(() => {
    const ringItem = {
      id:'_test_ring', name:'Anneau test', icon:'💍', desc:'+1 ATK',
      type:'acc', slot:'ring', bonusAtk:1, power:1, price:1
    };
    player.inventory.push({ ...ringItem });
    equipItem(player.inventory.length - 1, 0, 'ring1');
    player.inventory.push({ ...ringItem });
    equipItem(player.inventory.length - 1, 0, 'ring2');
    return {
      ring1: player.equipped.ring1 && player.equipped.ring1.id,
      ring2: player.equipped.ring2 && player.equipped.ring2.id
    };
  });
  console.log('  T4 deux anneaux →', t4);
  assert(t4.ring1 === '_test_ring' && t4.ring2 === '_test_ring',
         'ring1 et ring2 doivent contenir l\'anneau de test');

  // T5 : migration soft d'une save legacy (3 slots wand/armor/acc → 11)
  const t5 = await page.evaluate(() => {
    const fakeSave = {
      party: [
        { ...player, equipped: {
            wand:  ITEMS.find(i => i.id === 'wand1'),
            armor: ITEMS.find(i => i.id === 'robe1'),
            acc:   ITEMS.find(i => i.id === 'amulette')
        }},
        player2
      ],
      partySize: 1,
      currentFloor, playerX, playerY, playerDir,
      dungeon, visited, enemyMap, itemMap,
      seenMonsters: [], activeQuests, difficulty,
      chosenHouse, housePoints, houseTier,
      searchedCells: [], floorDungeons: {}, restCooldown: 0,
      usedFountains: []
    };
    _applyState(fakeSave);
    return {
      hasArmor:  player.equipped.armor !== undefined,
      hasAcc:    player.equipped.acc   !== undefined,
      bodyName:  player.equipped.body && player.equipped.body.name,
      amuletName: player.equipped.amulet && player.equipped.amulet.name,
      wandName:  player.equipped.wand && player.equipped.wand.name,
      slotCount: Object.keys(player.equipped).length
    };
  });
  console.log('  T5 migration legacy →', t5);
  assert(t5.hasArmor === false, 'slot armor doit être retiré après migration');
  assert(t5.hasAcc === false,   'slot acc doit être retiré après migration');
  assert(t5.bodyName   === 'Robe Renforcée',     'body doit recevoir robe1');
  assert(t5.amuletName === 'Amulette du Phénix', 'amulet doit recevoir amulette');
  assert(t5.wandName   === 'Baguette de Saule',  'wand doit conserver wand1');
  assert(t5.slotCount  === 11, `equipped doit avoir 11 slots après migration, got ${t5.slotCount}`);

  // T6 : fiche perso rend bien les 11 lignes d'équipement
  const t6 = await page.evaluate(() => {
    openCharacter(0);
    const rows = document.querySelectorAll('#char-detail .equip-grid .equip-row');
    const labels = Array.from(rows).map(r =>
      r.querySelector('.equip-label').textContent.trim());
    return { count: rows.length, labels };
  });
  console.log('  T6 fiche 11 slots →', t6);
  assert(t6.count === 11, `fiche perso doit avoir 11 lignes equip-row, got ${t6.count}`);
  assert(t6.labels.includes('Anneau ◀') && t6.labels.includes('Anneau ▶'),
         'libellés Anneau ◀ et Anneau ▶ doivent être présents');

  // T7 : bordure de rareté appliquée dans l'inventaire
  const t7 = await page.evaluate(() => {
    // Reset puis injection d'un item rare
    player.inventory.length = 0;
    player.inventory.push({
      id:'_test_rare', name:'Anneau rare', icon:'💍', desc:'+1',
      type:'acc', slot:'ring', rarity:'rare', bonusAtk:1, power:1, price:1
    });
    openInventory();
    const slot = document.querySelector('#inv-grid .inv-slot.has-item');
    return {
      hasRarityClass: slot && slot.classList.contains('rarity-rare'),
      borderColor:    slot && getComputedStyle(slot).borderColor
    };
  });
  console.log('  T7 rareté →', t7);
  assert(t7.hasRarityClass, 'inv-slot avec item rare doit porter classe rarity-rare');

  // T8 : champ tint déclenche un drop-shadow inline
  const t8 = await page.evaluate(() => {
    const tinted = { id:'_test_tint', name:'Test', icon:'🪄', type:'wand', slot:'wand', tint:'#4a8ad0' };
    const html = getItemIconHtml(tinted);
    // Tint hex valide → style inline présent
    const validHas = /drop-shadow\(0 0 1px #4a8ad0\)/.test(html);
    // Tint malformée → ignorée (sécurité injection CSS)
    const evil = { id:'x', name:'x', icon:'x', tint:'red; background:url(x)' };
    const evilHtml = getItemIconHtml(evil);
    const evilHas = /drop-shadow|background/.test(evilHtml);
    return { validHas, evilHas };
  });
  console.log('  T8 tint →', t8);
  assert(t8.validHas, 'tint hex valide doit produire drop-shadow inline');
  assert(!t8.evilHas, 'tint malformée doit être ignorée');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ 11 slots + slot mapping + bonusAgi + ring1/ring2 + migration legacy + UI Phase 2');
  await browser.close();
}

// ── Scénario 23 : Phase 3 — catalogue items + boutique + drops + coffres ──

async function scenarioPhase3Catalog() {
  console.log('\n── Scénario 23 : Phase 3 — catalogue items + drops + coffres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : nouveaux items définis avec slot/family/rarity
  const t1 = await page.evaluate(() => {
    const ids = ['gants_apprenti','bottes_apprenti','chapeau_apprenti','ceinture_cuir',
                 'anneau_argent','cape_voyageur','amulette_protection',
                 'circlet_serdaigle','anneau_runique','ceinture_alchimiste',
                 'bottes_dragon','retourneur_temps'];
    return ids.map(id => {
      const it = ITEMS.find(i => i.id === id);
      return it ? { id, slot: it.slot, family: it.family, rarity: it.rarity } : { id, missing: true };
    });
  });
  console.log('  T1 nouveaux items →', t1.length, 'items');
  assert(t1.every(x => !x.missing), `tous les nouveaux items doivent exister, manquant: ${t1.filter(x=>x.missing).map(x=>x.id)}`);
  assert(t1.every(x => x.slot && x.family && x.rarity),
         'chaque nouvel item doit avoir slot+family+rarity');

  // T2 : backfill rarity sur items legacy
  const t2 = await page.evaluate(() => ({
    wand1:        ITEMS.find(i => i.id === 'wand1').rarity,
    amulette:     ITEMS.find(i => i.id === 'amulette').rarity,
    cape_invis:   ITEMS.find(i => i.id === 'cape_invis').rarity,
    sword_gryff:  ITEMS.find(i => i.id === 'sword_gryff').rarity,
    diademe:      ITEMS.find(i => i.id === 'diademe_serdaigle').rarity
  }));
  console.log('  T2 rarity backfill →', t2);
  assert(t2.wand1 === 'common',     `wand1 doit être common, got ${t2.wand1}`);
  assert(t2.amulette === 'epic',    `amulette doit être epic, got ${t2.amulette}`);
  assert(t2.sword_gryff === 'legendary', `sword_gryff doit être legendary`);

  // T3 : SHOP_CATALOG a bien les nouveaux items aux bons étages
  const t3 = await page.evaluate(() => {
    const find = id => SHOP_CATALOG.find(e => e.id === id);
    return {
      gants:   find('gants_apprenti'),
      bottes:  find('bottes_apprenti'),
      anneau:  find('anneau_argent'),
      circlet: find('circlet_serdaigle'),
      timer:   find('retourneur_temps')
    };
  });
  console.log('  T3 catalog →', t3);
  assert(t3.gants && t3.gants.minFloor === 1,    'gants_apprenti doit être étage 1');
  assert(t3.anneau && t3.anneau.minFloor === 2,  'anneau_argent doit être étage 2');
  assert(t3.circlet && t3.circlet.minFloor === 5,'circlet_serdaigle doit être étage 5');
  assert(t3.timer && t3.timer.minFloor === 7,    'retourneur_temps doit être étage 7');

  // T4 : pickChestEquipment exclut les légendaires et respecte le seuil étage
  const t4 = await page.evaluate(() => {
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0, total: 0 };
    let saw_circlet = false, saw_timer = false;
    for (let i = 0; i < 600; i++) {
      const it = pickChestEquipment(1);
      if (!it) continue;
      counts[it.rarity || 'common']++;
      counts.total++;
    }
    // À étage 7 : peut tirer epic, jamais legendary
    const counts7 = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 600; i++) {
      const it = pickChestEquipment(7);
      if (!it) continue;
      counts7[it.rarity || 'common']++;
      if (it.id === 'circlet_serdaigle') saw_circlet = true;
      if (it.id === 'retourneur_temps')  saw_timer   = true;
    }
    return { counts, counts7, saw_circlet, saw_timer };
  });
  console.log('  T4 pickChestEquipment →', t4);
  assert(t4.counts.legendary === 0,        'aucun legendary à étage 1');
  assert(t4.counts.rare === 0,             'aucun rare à étage 1 (seuil étage 4)');
  assert(t4.counts.common > 0,             'au moins quelques common à étage 1');
  assert(t4.counts7.legendary === 0,       'aucun legendary à étage 7');
  assert(t4.counts7.epic > 0,              'au moins quelques epic à étage 7');

  // T5 : drops étendus sur les monstres ciblés
  const t5 = await page.evaluate(() => {
    const dropsOf = id => {
      const m = MONSTERS.find(x => x.id === id);
      return m ? m.drops.map(d => d.itemId) : [];
    };
    return {
      gobelin:   dropsOf('gobelin'),
      bundimun:  dropsOf('bundimun'),
      centaure:  dropsOf('centaure'),
      mangemort: dropsOf('mangemort'),
      bellatrix: dropsOf('bellatrix'),
      voldemort: dropsOf('voldemort_revenu')
    };
  });
  console.log('  T5 drops →', t5);
  assert(t5.gobelin.includes('ceinture_cuir'),         'gobelin → ceinture_cuir');
  assert(t5.bundimun.includes('bottes_apprenti'),      'bundimun → bottes_apprenti');
  assert(t5.centaure.includes('anneau_argent'),        'centaure → anneau_argent');
  assert(t5.mangemort.includes('cape_voyageur'),       'mangemort → cape_voyageur');
  assert(t5.bellatrix.includes('anneau_runique'),      'bellatrix → anneau_runique');
  assert(t5.voldemort.includes('retourneur_temps'),    'voldemort → retourneur_temps');

  // T6 : ouverture boutique étage 1 → nouveaux items présents
  const t6 = await page.evaluate(() => {
    currentFloor = 1;
    openShop();
    const ids = Array.from(document.querySelectorAll('#shop-grid .shop-item'))
      .map(el => el.dataset.itemId);
    return ids;
  });
  console.log('  T6 boutique étage 1 →', t6);
  assert(t6.includes('gants_apprenti'),  'boutique étage 1 doit lister gants_apprenti');
  assert(t6.includes('bottes_apprenti'), 'boutique étage 1 doit lister bottes_apprenti');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ catalogue Phase 3 + drops + coffres + boutique progressive');
  await browser.close();
}

// ── Scénario 24 : tint CSS 2-calques (resolver + structure DOM) ──
//
// Le rendu visuel (mask-image) ne peut pas être validé en file://
// (limitation Chromium : masks vides). On vérifie ici uniquement :
//   - structure DOM produite par le resolver (wrapper + 2 layers)
//   - data attributes cohérents avec data.js
//   - whitelist anti-injection (refus des metals inconnus / blade malformé)
//   - présence des classes metal-* dans le CSS chargé

async function scenarioTintCss() {
  console.log('\n── Scénario 24 : tint CSS 2-calques (épée + baguettes) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const t = await page.evaluate(() => {
    const sword = ITEMS.find(i => i.id === 'sword_gryff');
    const wand  = ITEMS.find(i => i.id === 'wand1');
    if (!sword || !sword.tinted) return { fail: 'sword_gryff sans flag tinted' };
    if (!wand  || !wand.tinted)  return { fail: 'wand1 sans flag tinted' };

    const html = getItemIconHtml(sword, 'ui-icon-xl');
    const tmp  = document.createElement('div');
    tmp.innerHTML = html;
    const root = tmp.firstChild;

    const wandHtml = getItemIconHtml(wand, 'ui-icon-xl');
    const wandTmp  = document.createElement('div');
    wandTmp.innerHTML = wandHtml;
    const wandRoot = wandTmp.firstChild;

    // Test injection : tint inconnu → fallback path normal (pas d'injection)
    const evil = getItemIconHtml({ ...sword, tint: 'evil); background: url(data:x' }, 'ui-icon-md');

    return {
      // épée (palette métaux)
      isWrapper:    root && root.tagName === 'SPAN',
      hasTinted:    root && root.classList.contains('tinted-icon'),
      hasTintCls:   root && root.classList.contains('tint-silver'),
      hasSize:      root && root.classList.contains('ui-icon-xl'),
      mask:         root && root.getAttribute('data-mask'),
      overlay:      root && root.getAttribute('data-overlay'),
      tint:         root && root.getAttribute('data-tint'),
      layerCount:   root ? root.childElementCount : 0,
      maskUrl:      root && root.querySelector('.tint-mask')   ? root.querySelector('.tint-mask').getAttribute('style') : '',
      overlayUrl:   root && root.querySelector('.tint-overlay')? root.querySelector('.tint-overlay').getAttribute('style') : '',
      // baguette (palette bois) — vérifie que la généralisation marche
      wandHasTint:  wandRoot && wandRoot.classList.contains('tinted-icon'),
      wandTint:     wandRoot && wandRoot.getAttribute('data-tint'),
      wandMask:     wandRoot && wandRoot.getAttribute('data-mask'),
      // sécurité
      evilFallback: !/data:x/.test(evil) && !/tint-evil/.test(evil),
    };
  });

  console.log('  resolver →', t);
  assert(!t.fail,        t.fail || '');
  assert(t.isWrapper,    'wrapper non produit');
  assert(t.hasTinted,    'classe tinted-icon manquante');
  assert(t.hasTintCls,   'classe tint-silver manquante');
  assert(t.hasSize,      'classe ui-icon-xl perdue');
  assert(t.mask    === 'sword_blade_base', `mask=${t.mask}`);
  assert(t.overlay === 'sword_hilt_gryff', `overlay=${t.overlay}`);
  assert(t.tint    === 'silver',           `tint=${t.tint}`);
  assert(t.layerCount === 2,               `layers=${t.layerCount} (attendu 2)`);
  assert(t.maskUrl.includes('sword_blade_base.png'),   'mask URL absente');
  assert(t.overlayUrl.includes('sword_hilt_gryff.png'),'overlay URL absente');
  assert(t.wandHasTint,                     'wand1 ne produit pas tinted-icon');
  assert(['oak','ebony','willow','holly','elder','vine'].includes(t.wandTint),
         `wand1 tint=${t.wandTint} hors palette bois`);
  assert(t.wandMask === 'wand_shaft_base',  `wand mask=${t.wandMask}`);
  assert(t.evilFallback, 'whitelist tint contournée — risque injection CSS');

  // CSS : on lit style.css en Node (cssRules bloqué en file://). Vérifie
  // les 12 classes tint-* (6 métaux + 6 bois) + le sélecteur tint-mask.
  const fs   = require('fs');
  const path = require('path');
  const css  = fs.readFileSync(path.resolve(__dirname, '../css/style.css'), 'utf-8');
  const palette = ['iron','copper','bronze','silver','gold','platinum',
                   'oak','ebony','willow','holly','elder','vine'];
  palette.forEach(p => {
    assert(css.includes(`.tint-${p}`), `CSS .tint-${p} manquant`);
  });
  assert(css.includes('.tinted-icon .tint-mask'), 'CSS .tinted-icon .tint-mask manquant');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ tint CSS — DOM, attrs et whitelist OK');
  await browser.close();
}

(async () => {
  const scenarios = [scenarioStartup, scenarioStatusEffects, scenarioChainedQuest, scenarioNpcIntegration, scenarioVendors, scenarioChainAndRepeatable, scenarioMobileSelect, scenarioMonsterImages, scenarioFloorTextures, scenarioHouseCrests, scenarioCombatMobile, scenarioSaveSlots, scenarioSlotModal, scenarioAutoSave, scenarioStartHub, scenarioSceneIcons, scenarioTryAddItem, scenarioFountain, scenarioSoloSoftlock, scenarioCorruptSave, scenarioCmdBtnIcons, scenarioUiChromeIcons, scenarioEquipmentAndStatusIcons, scenarioSpellIcons, scenarioItemIcons, scenarioExtendedEquipment, scenarioPhase3Catalog, scenarioTintCss];
  for (const s of scenarios) {
    await s();
  }
  console.log('\n✅ Tous les scénarios sont passés.');
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
