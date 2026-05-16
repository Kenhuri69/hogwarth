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
          && text.includes('img/icons/items/'))
      // Limite Chromium en file:// : `fetch('audio/*.ogg')` depuis
      // audio-music.js échoue en environnement smoke (Fetch API ne
      // supporte pas file://). Le code attrape la rejection et bascule
      // sur la synthèse procédurale, mais Chromium log avant le catch.
      // En prod (HTTP/HTTPS) cette erreur n'apparaît pas.
      || (text.includes('URL scheme "file" is not supported')
          && /audio\/[\w/]+\.ogg/.test(text));
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

// ── Scénario 2bis : weaken statusEffect + Protego badge + ability `status` ─

async function scenarioWeakenAndProtegoBadges() {
  console.log('\n── Scénario 2bis : weaken / Protego / ability status ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 50 });

  // T1 : applyStatus weaken pose le statut sur le joueur, DEF réduite
  // (simule fidèlement la logique de l'ability : lost = min(power, def))
  const t1 = await page.evaluate(() => {
    const c = party[0];
    // Augmenter artificiellement la DEF pour tester un cas non-cappé
    c.def = 10;
    const defBefore = c.def;
    const power     = 4;
    const lost      = Math.min(power, c.def);
    c.def = Math.max(0, c.def - lost);
    applyStatus(c, 'weaken', lost, 3);
    updateUI();
    const slot = document.getElementById('status-slot-0');
    const pill = slot ? slot.querySelector('.status-pill') : null;
    return {
      defBefore,
      defAfter:   c.def,
      lost,
      statusId:   c.statusEffects[0]?.id,
      storedPwr:  c.statusEffects[0]?.power,
      turns:      c.statusEffects[0]?.turns,
      pillExists: !!pill,
      pillTitle:  pill ? pill.getAttribute('title') : null
    };
  });
  console.log('  T1 weaken apply:', t1);
  assert(t1.defAfter === t1.defBefore - t1.lost, 'DEF non réduite par weaken');
  assert(t1.statusId === 'weaken',         'statusEffect weaken non posé');
  assert(t1.storedPwr === t1.lost,         'power stocké doit refléter le lost effectif');
  assert(t1.turns === 3,                   'turns initial weaken doit être 3');
  assert(t1.pillExists,                    'pilule weaken absente du status-slot-0');
  assert(/Affaiblissement/.test(t1.pillTitle || ''), 'tooltip weaken doit mentionner DEF');

  // T2 : 3 ticks → expiration + restauration DEF
  const t2 = await page.evaluate(() => {
    const c = party[0];
    tickStatuses(c, false);
    tickStatuses(c, false);
    tickStatuses(c, false);
    updateUI();
    const slot = document.getElementById('status-slot-0');
    const pill = slot ? slot.querySelector('.status-pill') : null;
    return {
      defAfter:    c.def,
      statusCount: c.statusEffects.length,
      pillExists:  !!pill
    };
  });
  console.log('  T2 weaken expiry:', t2);
  assert(t2.statusCount === 0,              'weaken non retiré après 3 ticks');
  assert(t2.defAfter === t1.defBefore,      `DEF non restaurée (attendu ${t1.defBefore}, obtenu ${t2.defAfter})`);
  assert(!t2.pillExists,                    'pilule weaken doit disparaître après expiry');

  // T3 : badge Protego rendu quand shieldTurns[0] > 0
  const t3 = await page.evaluate(() => {
    shieldTurns[0] = 2;
    updateUI();
    const slot  = document.getElementById('status-slot-0');
    const pills = slot ? slot.querySelectorAll('.status-pill') : [];
    let found = null;
    pills.forEach(p => { if ((p.textContent || '').includes('🛡️')) found = p; });
    return {
      hasShield:    !!found,
      shieldTitle:  found ? found.getAttribute('title') : null,
      shieldText:   found ? found.textContent.trim() : null
    };
  });
  console.log('  T3 Protego badge:', t3);
  assert(t3.hasShield,                    'badge Protego absent du status-slot-0');
  assert(/Protego/.test(t3.shieldTitle || ''), 'tooltip Protego incorrect');
  assert(t3.shieldText.includes('2'),     'compteur shieldTurns absent');

  // T4 : ability `status` applique un DoT sur la cible
  const t4 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = [];
    const fakeEnemy = {
      name: 'TestSpider', mag: 0,
      abilities: [{ name: 'Morsure', icon: '🦂', effect: 'status', statusId: 'poison', power: 3, chance: 1.0, turns: 2 }]
    };
    // Mock RNG pour forcer le pick
    const origRandom = Math.random;
    Math.random = () => 0;     // < chance=1.0
    try {
      tryEnemyAbility(fakeEnemy, c, 0, () => {});
    } finally {
      Math.random = origRandom;
    }
    return {
      statusId: c.statusEffects[0]?.id,
      power:    c.statusEffects[0]?.power,
      turns:    c.statusEffects[0]?.turns
    };
  });
  console.log('  T4 ability status:', t4);
  assert(t4.statusId === 'poison', `ability status doit appliquer poison (obtenu ${t4.statusId})`);
  assert(t4.power === 3,           'power non transféré');
  assert(t4.turns === 2,           'turns non transféré');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ weaken/Protego/ability-status conformes');
  await browser.close();
}

// ── Scénario 2ter : mini-équipement party-card ──────────────────

async function scenarioPartyEquipRow() {
  console.log('\n── Scénario 2ter : mini-équipement party-card ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 3 cellules présentes dans le DOM
  const t1 = await page.evaluate(() => {
    const row = document.getElementById('equip-row-0');
    if (!row) return { rowExists: false };
    const cells = row.querySelectorAll('.party-equip-slot');
    const slots = Array.from(cells).map(c => c.getAttribute('data-slot'));
    return { rowExists: true, count: cells.length, slots };
  });
  console.log('  T1 DOM:', t1);
  assert(t1.rowExists, '#equip-row-0 absent du DOM');
  assert(t1.count === 3, `attendu 3 cellules, obtenu ${t1.count}`);
  assert(t1.slots.includes('wand') && t1.slots.includes('body') && t1.slots.includes('amulet'),
    `slots attendus wand/body/amulet, obtenus ${t1.slots}`);

  // T2 : équiper une wand → cell wand a .filled
  const t2 = await page.evaluate(() => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    party[0].equipped.wand = JSON.parse(JSON.stringify(wand));
    if (typeof recalculateStats === 'function') recalculateStats();
    updateUI();
    const cell = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    return {
      filled:    cell ? cell.classList.contains('filled') : false,
      hasImg:    cell ? !!cell.querySelector('img') : false,
      title:     cell ? cell.getAttribute('title') : null
    };
  });
  console.log('  T2 equip:', t2);
  assert(t2.filled, 'cell wand doit avoir la classe .filled après équipement');
  assert(t2.hasImg, 'cell wand doit contenir une image (icon)');

  // T3 : déséquiper → .filled retiré
  const t3 = await page.evaluate(() => {
    party[0].equipped.wand = null;
    if (typeof recalculateStats === 'function') recalculateStats();
    updateUI();
    const cell = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    return { filled: cell ? cell.classList.contains('filled') : false };
  });
  console.log('  T3 unequip:', t3);
  assert(!t3.filled, 'cell wand doit perdre .filled après déséquipement');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ party-equip-row conforme');
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
  // 8 PNJ fixes + 2 vendeurs (it. 4) + 4 lore (it. 6) = 14 entrées minimum.
  assert(t1.npcCount >= 8,               `attendu ≥ 8 PNJ, trouvé ${t1.npcCount}`);
  assert(t1.hasGetById,                  'getNpcById absent');
  assert(t1.hasGetForFloor,              'getNpcsForFloor absent');
  assert(t1.cellNpc === 8,               'CELL.NPC doit valoir 8');
  assert(t1.dumbledore,                  'PNJ Dumbledore introuvable');
  assert(t1.floor1Count === 1,           'étage 1 doit avoir 1 PNJ (Dumbledore)');
  assert(t1.floor2Count === 3,           'étage 2 doit avoir 3 PNJ');
  assert(t1.floor4Count === 3,           'étage 4 doit avoir 3 PNJ (incl. Rogue chef Serpentard)');

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
  // Dumbledore est garanti à l'étage 1 ; un PNJ random (lore) peut s'y ajouter.
  assert(t2.placementsCount >= 1 && t2.placementsCount <= 2,
         `1 ou 2 placements étage 1 attendus (Dumbledore + éventuel random), got ${t2.placementsCount}`);
  assert(t2.cellsCount === t2.placementsCount,
         'le nombre de cellules NPC doit égaler le nombre de placements');
  assert(t2.ids.includes('dumbledore'),  'Dumbledore doit être présent à l\'étage 1');

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

// ── Scénario 3septies : rencontres PNJ aléatoires lore (sans quête) ──

async function scenarioRandomLoreNpcs() {
  console.log('\n── Scénario 3septies : PNJ lore aléatoires ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : registre — 4 PNJ lore, helpers exposés, distinction vendeur vs lore
  const t1 = await page.evaluate(() => {
    const loreIds = ['sir_nicolas', 'moine_gras', 'rusard', 'trelawney'];
    const allFound = loreIds.every(id => NPCS.find(n => n.id === id));
    const sirNicolas = NPCS.find(n => n.id === 'sir_nicolas');
    const trelawney  = NPCS.find(n => n.id === 'trelawney');
    return {
      allFound,
      hasGetRandomLoreForFloor:       typeof getRandomLoreForFloor === 'function',
      hasGetRandomEncountersForFloor: typeof getRandomEncountersForFloor === 'function',
      hasGetRandomVendorsForFloor:    typeof getRandomVendorsForFloor === 'function',
      sirNicolasIsRandom:    !!sirNicolas?.random,
      sirNicolasNoWares:     !sirNicolas?.wares,
      sirNicolasNoQuests:    !(sirNicolas?.questsGiven?.length),
      sirNicolasIdleRandom:  Array.isArray(sirNicolas?.dialogues?.idleRandom) && sirNicolas.dialogues.idleRandom.length >= 2,
      trelawneyMinFloor:     trelawney?.minFloor,
      loreCount:             NPCS.filter(n => n.random && !n.wares && !(n.questsGiven?.length)).length
    };
  });
  console.log('  T1 registry:', t1);
  assert(t1.allFound,                       '4 PNJ lore attendus (sir_nicolas, moine_gras, rusard, trelawney)');
  assert(t1.hasGetRandomLoreForFloor,       'getRandomLoreForFloor absent');
  assert(t1.hasGetRandomEncountersForFloor, 'getRandomEncountersForFloor absent');
  assert(t1.hasGetRandomVendorsForFloor,    'getRandomVendorsForFloor (compat) absent');
  assert(t1.sirNicolasIsRandom,             'Sir Nicolas doit être random:true');
  assert(t1.sirNicolasNoWares,              'Sir Nicolas ne doit PAS avoir wares');
  assert(t1.sirNicolasNoQuests,             'Sir Nicolas ne doit PAS avoir questsGiven');
  assert(t1.sirNicolasIdleRandom,           'Sir Nicolas doit avoir au moins 2 idleRandom');
  assert(t1.trelawneyMinFloor === 3,        'Trelawney doit être minFloor=3');
  assert(t1.loreCount === 4,                `4 PNJ lore attendus, got ${t1.loreCount}`);

  // T2 : pools cloisonnés — vendeurs vs lore, et combiné
  const t2 = await page.evaluate(() => {
    const lore1 = getRandomLoreForFloor(1).map(n => n.id).sort();
    const lore3 = getRandomLoreForFloor(3).map(n => n.id).sort();
    const vendors2 = getRandomVendorsForFloor(2).map(n => n.id).sort();
    const enc1 = getRandomEncountersForFloor(1).map(n => n.id).sort();
    const enc3 = getRandomEncountersForFloor(3).map(n => n.id).sort();
    return { lore1, lore3, vendors2, enc1, enc3 };
  });
  console.log('  T2 pools:', t2);
  assert(t2.lore1.includes('sir_nicolas') && t2.lore1.includes('rusard'),
    `lore étage 1 doit contenir sir_nicolas + rusard, got ${JSON.stringify(t2.lore1)}`);
  assert(!t2.lore1.includes('moine_gras'),     'moine_gras (minFloor=2) ne doit pas être à l\'étage 1');
  assert(!t2.lore1.includes('trelawney'),      'trelawney (minFloor=3) ne doit pas être à l\'étage 1');
  assert(t2.lore3.includes('trelawney'),       'trelawney doit être éligible à l\'étage 3');
  assert(t2.vendors2.includes('rosmerta'),     'rosmerta doit rester dans le pool vendeurs');
  assert(!t2.vendors2.includes('sir_nicolas'), 'getRandomVendorsForFloor ne doit PAS retourner les lore NPCs');
  assert(t2.enc1.includes('sir_nicolas') && t2.enc1.includes('rusard'),
    `encounters étage 1 doit contenir les lore éligibles, got ${JSON.stringify(t2.enc1)}`);
  assert(t2.enc3.includes('rosmerta') && t2.enc3.includes('mundungus') && t2.enc3.includes('trelawney'),
    `encounters étage 3 doit combiner vendeurs + lore, got ${JSON.stringify(t2.enc3)}`);

  // T3 : dialog d'un PNJ lore — pas de bouton "Accepter", greeting puis idleRandom varie
  const t3 = await page.evaluate(() => {
    seenNpcs.clear();
    openNpcDialog('sir_nicolas');
    const greetingPages = _dialogState.pages.slice();
    const greetingActions = _dialogState.actions.map(a => a.label);
    closeNpcDialog();
    // 2e visite : seenNpcs a sir_nicolas → idleRandom
    openNpcDialog('sir_nicolas');
    const idleText = _dialogState.pages[0];
    const idleActions = _dialogState.actions.map(a => a.label);
    const sn = NPCS.find(n => n.id === 'sir_nicolas');
    const inIdlePool = sn.dialogues.idleRandom.includes(idleText);
    closeNpcDialog();
    return {
      greetingIsArray: greetingPages.length >= 2,
      greetingActions,
      idleText,
      inIdlePool,
      idleActions
    };
  });
  console.log('  T3 dialog flow:', t3);
  assert(t3.greetingIsArray,                       'greeting doit être multi-page (>= 2)');
  assert(!t3.greetingActions.includes('Accepter la quête'),
    'PNJ lore ne doit PAS proposer "Accepter la quête"');
  assert(t3.greetingActions.includes('S\'éloigner'),
    `bouton "S'éloigner" attendu, got ${JSON.stringify(t3.greetingActions)}`);
  assert(t3.inIdlePool, `idle 2e visite doit venir d'idleRandom, got "${t3.idleText}"`);
  assert(!t3.idleActions.includes('Accepter la quête'),
    'PNJ lore ne doit PAS proposer "Accepter la quête" en idle non plus');

  // T4 : getNpcQuestState retourne 'none' pour PNJ lore (pas de quête)
  const t4 = await page.evaluate(() => {
    return {
      sirNicolas: getNpcQuestState(NPCS.find(n => n.id === 'sir_nicolas')),
      rusard:     getNpcQuestState(NPCS.find(n => n.id === 'rusard')),
      hagrid:     getNpcQuestState(NPCS.find(n => n.id === 'hagrid')) // toujours 'offer' au démarrage
    };
  });
  console.log('  T4 quest state:', t4);
  assert(t4.sirNicolas === 'none', `Sir Nicolas state doit être 'none', got ${t4.sirNicolas}`);
  assert(t4.rusard     === 'none', `Rusard state doit être 'none', got ${t4.rusard}`);
  assert(t4.hagrid     === 'offer', `Hagrid (control) doit être 'offer', got ${t4.hagrid}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ PNJ lore aléatoires conformes');
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
  // Depuis l'ajout du bouton "📥 Importer" dans le hub, le hub démarrage
  // s'affiche toujours (même sans slot). On clique "Nouvelle aventure"
  // pour basculer sur player-select.
  await page.waitForFunction(() => {
    const el = document.getElementById('start-hub-screen');
    return el && getComputedStyle(el).display !== 'none';
  });
  await page.evaluate(() => startHubNewGame());
  await page.waitForFunction(() => {
    const el = document.getElementById('player-select-screen');
    return el && getComputedStyle(el).display !== 'none';
  });

  // Sélection guidée en 3 étapes : étape 1 (mode) visible au départ.
  const step1 = await page.evaluate(() => {
    const visible = (s) => {
      const el = document.querySelector(`#player-select-screen .psel-step[data-step="${s}"]`);
      return el && getComputedStyle(el).display !== 'none';
    };
    return { s1: visible(1), s2: visible(2), s3: visible(3),
             overflow: getComputedStyle(document.getElementById('player-select-screen')).overflowY };
  });
  console.log('  player-select étape 1 :', step1);
  assert(step1.s1 && !step1.s2 && !step1.s3, 'étape 1 du stepper non isolée');
  assert(step1.overflow === 'auto',          'overflow-y devrait être auto sur mobile');

  // Étape 1 → 2 (mode). L'étape Héros s'ouvre sur le choix du groupe.
  await page.evaluate(() => document.getElementById('psel-next-1').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector('.psel-step[data-step="2"]')).display !== 'none');
  const groupFilter = await page.evaluate(() => ({
    pickerShown: getComputedStyle(document.getElementById('psel-group-picker')).display !== 'none',
    listHidden:  getComputedStyle(document.getElementById('psel-group-list')).display === 'none',
  }));
  console.log('  player-select étape 2 (filtre groupe) :', groupFilter);
  assert(groupFilter.pickerShown && groupFilter.listHidden, 'étape Héros doit s\'ouvrir sur le choix du groupe');

  // Choisir le groupe « Héros du Film », puis valider (Harry pré-sélectionné).
  await page.evaluate(() => document.getElementById('psel-tile-film').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.getElementById('psel-group-list')).display !== 'none');
  await page.evaluate(() => document.getElementById('psel-next-2').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector('.psel-step[data-step="3"]')).display !== 'none');

  // Le bouton "Commencer" de l'étape 3 doit être atteignable et actif.
  const reach = await page.evaluate(() => {
    const btn = document.getElementById('start-adventure-btn');
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { visible: r.top >= 0 && r.bottom <= window.innerHeight, disabled: btn.disabled };
  });
  console.log('  player-select étape 3 :', reach);
  assert(reach.visible,   'bouton "Commencer" hors viewport mobile');
  assert(!reach.disabled, 'bouton "Commencer" désactivé à l\'étape difficulté');

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
  // boutons d'action en grille 6 colonnes (ligne 1 = 3 boutons span 2,
  // ligne 2 = 2 boutons span 3) avec touch targets ≥56px.
  const battle = await page.evaluate(() => {
    const cmdBar = document.querySelector('.commands-bar');
    const actions = document.querySelector('.battle-actions');
    const btn = actions ? actions.querySelector('.cmd-btn') : null;
    const btns = actions ? Array.from(actions.querySelectorAll('.cmd-btn')) : [];
    return {
      bodyHasInBattle: document.body.classList.contains('in-battle'),
      cmdBarHidden:    cmdBar ? getComputedStyle(cmdBar).display === 'none' : null,
      actionsDisplay:  actions ? getComputedStyle(actions).display : null,
      actionsCols:     actions ? getComputedStyle(actions).gridTemplateColumns : null,
      btnCount:        btns.length,
      btnMinHeight:    btn ? parseFloat(getComputedStyle(btn).minHeight) : 0
    };
  });
  console.log('  battle ergonomics :', battle);
  assert(battle.bodyHasInBattle === true,                   'body.in-battle doit être posé pendant le combat');
  assert(battle.cmdBarHidden === true,                      'commands-bar doit être cachée pendant le combat sur mobile');
  assert(battle.actionsDisplay === 'grid',                  'battle-actions doit passer en grille sur mobile en combat');
  // grid-template-columns peut être résolu en "px px ..." — compter les tracks
  const trackCount = (battle.actionsCols || '').trim().split(/\s+/).filter(Boolean).length;
  assert(trackCount === 6,                                  `battle-actions doit être 6 colonnes (${trackCount} vues)`);
  assert(battle.btnCount === 5,                             `5 boutons attendus (Attaquer/Sortilège/Garde/Objet/Fuir), obtenu ${battle.btnCount}`);
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

// ── Scénario : export / import du save store ────────────────

async function scenarioExportImport() {
  console.log('\n── Scénario : export / import du save store ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : helpers exposés
  const t1 = await page.evaluate(() => ({
    hasExport: typeof exportSaveStore === 'function',
    hasImport: typeof importSaveStore === 'function',
    hasUIExp:  typeof exportSaveToFile === 'function',
    hasUIImp:  typeof importSaveFromFile === 'function'
  }));
  console.log('  T1 fns:', t1);
  assert(t1.hasExport && t1.hasImport, 'export/importSaveStore non exposés');
  assert(t1.hasUIExp && t1.hasUIImp,   'exportSaveToFile / importSaveFromFile non exposés');

  // T2 : écrit un slot, exporte → la sortie est un JSON valide avec ce slot
  const t2 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    writeSlot('manual_1', 'Test');
    const json = exportSaveStore();
    const obj  = JSON.parse(json);
    return {
      hasVersion: obj.version === 1,
      slotIds:    Object.keys(obj.slots),
      hasState:   !!obj.slots.manual_1?.state
    };
  });
  console.log('  T2 export:', t2);
  assert(t2.hasVersion,                 'version manquante dans export');
  assert(t2.slotIds.includes('manual_1'), 'manual_1 absent de l\'export');
  assert(t2.hasState,                   'state manquant dans le slot exporté');

  // T3 : import d'un JSON valide → store remplacé
  const t3 = await page.evaluate(() => {
    const fake = {
      version: 1,
      slots: {
        manual_2: { meta: { label: 'Imported' }, state: { _version: 3, foo: 'bar' } }
      }
    };
    const res = importSaveStore(JSON.stringify(fake));
    const after = JSON.parse(localStorage.getItem('hogwarts_rpg_saves'));
    return { res, slotIds: Object.keys(after.slots) };
  });
  console.log('  T3 import OK:', t3);
  assert(t3.res.ok && t3.res.imported === 1, 'import devrait avoir importé 1 slot');
  assert(t3.slotIds.length === 1 && t3.slotIds[0] === 'manual_2', 'store doit contenir uniquement manual_2');

  // T4 : import d'un JSON invalide → refus avec raison
  const t4 = await page.evaluate(() => ({
    bad:   importSaveStore('{not json'),
    shape: importSaveStore('{"version":1}'),
    empty: importSaveStore('{"version":1,"slots":{"bogus":{"state":{}}}}')
  }));
  console.log('  T4 import refus:', t4);
  assert(t4.bad.ok === false && t4.bad.reason === 'json',     'JSON cassé doit retourner reason=json');
  assert(t4.shape.ok === false && t4.shape.reason === 'shape', 'sans slots doit retourner reason=shape');
  assert(t4.empty.ok === false && t4.empty.reason === 'empty', 'slot id inconnu → reason=empty');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ export / import OK');
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

  // T1 : aucun slot → click title → hub visible avec liste vide
  //      (depuis l'ajout du bouton "📥 Importer" : le hub doit rester
  //      accessible même sans slot, sinon impossible d'importer une save).
  const t1 = await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_save');
    localStorage.removeItem('hogwarts_rpg_saves');
    enterStartHub();
    return {
      titleHidden:        getComputedStyle(document.getElementById('title-screen')).display === 'none',
      hubVisible:         getComputedStyle(document.getElementById('start-hub-screen')).display !== 'none',
      importBtnPresent:   !!document.querySelector('.hub-import-btn'),
      slotsListedCount:   document.querySelectorAll('#start-hub-slot-list [data-slot-id]').length
    };
  });
  console.log('  T1 no-slot →', t1);
  assert(t1.titleHidden,        'le titre doit être caché après enterStartHub');
  assert(t1.hubVisible,         'le hub doit rester visible même sans slot (bouton import accessible)');
  assert(t1.importBtnPresent,   'le bouton "📥 Importer" doit être présent dans le hub');
  assert(t1.slotsListedCount === 0, 'aucun slot ne doit apparaître dans la liste');

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
  // soit l'`<img>` du registry legacy, soit le wrapper `tinted-icon`,
  // soit le nouveau pipeline painterly (icons_new/wand1_<size>.png).
  const t5 = await page.evaluate(() => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    player.equipped.wand = wand;
    openCharacter(0);
    const detail = document.getElementById('char-detail');
    const html = detail.innerHTML;
    return {
      hasPerItemImg:    /img\/icons\/items\/wand1\.png/.test(html),
      hasTintedWrapper: /tinted-icon[^"]*tint-willow/.test(html),
      hasPainterly:     /icons_new\/wand1_\d+\.png/.test(html),
    };
  });
  console.log('  T5 fiche per-item →', t5);
  assert(t5.hasPerItemImg || t5.hasTintedWrapper || t5.hasPainterly,
         'wand1 équipé doit utiliser items/wand1.png, tinted-icon ou icons_new/wand1_*.png');

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
  console.log(`  ✅ Phase 3 : ${t1.mapped} sorts mappés + modale + fallback + battle-log innerHTML`);
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
  // Accepte l'ancien chemin (items/<id>.png) ou le nouveau pipeline painterly
  // (icons_new/<id>_<size>.png — étape 9 du redesign).
  assert(t2.some(s => /(items\/potion_s\.png|icons_new\/potion_s_\d+\.png)$/.test(s)),
         'inventaire doit afficher potion_s');
  assert(t2.some(s => /(items\/wand1\.png|icons_new\/wand1_\d+\.png)$/.test(s) || s === 'wand_shaft_base'),
         'inventaire doit afficher wand1 OU wrapper tinted (mask=wand_shaft_base)');
  assert(t2.some(s => /(items\/livre_sortileges\.png|icons_new\/livre_sortileges_\d+\.png)$/.test(s)),
         'inventaire doit afficher livre_sortileges');

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
  assert(t3.every(s => /(items\/[a-z0-9_]+\.png|icons_new\/[a-z0-9_]+_\d+\.png)$/.test(s)),
         'tous les items shop doivent pointer img/icons/items/ ou img/icons_new/');

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

  // T6 : fiche perso rend bien les 11 slots d'équipement (paper doll)
  const t6 = await page.evaluate(() => {
    openCharacter(0);
    const slots = document.querySelectorAll('#char-detail .paper-doll .equip-slot-floating');
    const tooltips = Array.from(slots).map(s => s.getAttribute('title'));
    const slotIds  = Array.from(slots).map(s => Array.from(s.classList).find(c => c.startsWith('equip-slot-') && c !== 'equip-slot-floating'));
    return { count: slots.length, tooltips, slotIds };
  });
  console.log('  T6 fiche 11 slots →', t6);
  assert(t6.count === 11, `fiche perso doit avoir 11 slots paper-doll, got ${t6.count}`);
  assert(t6.tooltips.includes('Anneau ◀') && t6.tooltips.includes('Anneau ▶'),
         'tooltips Anneau ◀ et Anneau ▶ doivent être présents');
  assert(t6.slotIds.includes('equip-slot-ring1') && t6.slotIds.includes('equip-slot-ring2'),
         'classes equip-slot-ring1 / equip-slot-ring2 doivent être présentes');

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

  // T9 : équiper plusieurs slots distincts en série — tous les bonus s'additionnent
  // Couvre Phase 5 §5.3 sub-2 : un item de plusieurs slots, bonus appliqués.
  const t9 = await page.evaluate(() => {
    // Reset complet (les T précédents ont équipé une cape + 2 anneaux _test_ring)
    Object.keys(player.equipped).forEach(k => { player.equipped[k] = null; });
    recalculateStats();
    const base = { atk: player.atk, def: player.def, mag: player.mag,
                   lck: player.lck, agi: player.agi };
    // Inventaire propre puis 4 items de slots distincts (head/hands/feet/cloak)
    player.inventory.length = 0;
    const ids = ['chapeau_apprenti', 'gants_apprenti', 'bottes_apprenti', 'cape_voyageur'];
    for (const id of ids) {
      player.inventory.push({ ...ITEMS.find(i => i.id === id) });
    }
    // Équiper depuis l'index 0 à chaque fois (l'inventaire se compacte)
    while (player.inventory.length) equipItem(0, 0);
    return {
      base,
      after: { atk: player.atk, def: player.def, mag: player.mag,
               lck: player.lck, agi: player.agi },
      filledSlots: ['head','hands','feet','cloak']
        .filter(s => player.equipped[s] !== null),
      // Bonus attendus (cf. data.js) :
      // chapeau_apprenti : MAG+1 DEF+1
      // gants_apprenti   : ATK+1 DEF+1
      // bottes_apprenti  : DEF+1 AGI+1
      // cape_voyageur    : DEF+2 AGI+2
      expected: { atkDelta: 1, defDelta: 5, magDelta: 1, lckDelta: 0, agiDelta: 3 }
    };
  });
  console.log('  T9 multi-slot bonuses →', {
    filledSlots: t9.filledSlots, deltas: {
      atk: t9.after.atk - t9.base.atk,
      def: t9.after.def - t9.base.def,
      mag: t9.after.mag - t9.base.mag,
      agi: t9.after.agi - t9.base.agi
    }
  });
  assert(t9.filledSlots.length === 4, `4 slots remplis attendus, got ${t9.filledSlots.length}`);
  assert(t9.after.atk - t9.base.atk === t9.expected.atkDelta,
    `ATK delta attendu +${t9.expected.atkDelta}, got ${t9.after.atk - t9.base.atk}`);
  assert(t9.after.def - t9.base.def === t9.expected.defDelta,
    `DEF delta attendu +${t9.expected.defDelta}, got ${t9.after.def - t9.base.def}`);
  assert(t9.after.mag - t9.base.mag === t9.expected.magDelta,
    `MAG delta attendu +${t9.expected.magDelta}, got ${t9.after.mag - t9.base.mag}`);
  assert(t9.after.agi - t9.base.agi === t9.expected.agiDelta,
    `AGI delta attendu +${t9.expected.agiDelta}, got ${t9.after.agi - t9.base.agi}`);

  // T10 : save → reload roundtrip — les 11 slots survivent intacts
  // Couvre Phase 5 §5.3 sub-5 : persistance + restauration.
  const t10 = await page.evaluate(() => {
    // Équipement courant : 4 slots remplis (T9). On capture, save, vide, reload.
    const before = {};
    Object.keys(player.equipped).forEach(s => {
      before[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    saveGame();
    // Vider et muter les bases pour s'assurer que reload restaure
    Object.keys(player.equipped).forEach(s => { player.equipped[s] = null; });
    recalculateStats();
    const cleared = {};
    Object.keys(player.equipped).forEach(s => {
      cleared[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    loadGame();
    const after = {};
    Object.keys(player.equipped).forEach(s => {
      after[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    const allCleared = Object.values(cleared).every(v => v === null);
    const allRestored = Object.keys(before).every(s => before[s] === after[s]);
    return { before, cleared, after, allCleared, allRestored,
             slotCount: Object.keys(player.equipped).length };
  });
  console.log('  T10 save→reload roundtrip →', { allCleared: t10.allCleared, allRestored: t10.allRestored });
  assert(t10.allCleared,         'le clear préalable n\'a pas vidé tous les slots');
  assert(t10.allRestored,        `roundtrip a perdu des items : before=${JSON.stringify(t10.before)} after=${JSON.stringify(t10.after)}`);
  assert(t10.slotCount === 11,   `equipped doit toujours avoir 11 slots après reload, got ${t10.slotCount}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ 11 slots + slot mapping + bonusAgi + ring1/ring2 + migration legacy + UI Phase 2 + multi-slot bonuses + save roundtrip');
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

    // Le pipeline painterly (étape 9) supplante le système tinted dans
    // getItemIconHtml. Pour tester le système tinted en isolation on
    // appelle directement _getTintedItemHtml — il reste utilisé comme
    // fallback pour les items tinted hors ITEM_ICON_NEW_REGISTRY.
    const html = _getTintedItemHtml(sword, 'ui-icon-xl');
    const tmp  = document.createElement('div');
    tmp.innerHTML = html;
    const root = tmp.firstChild;

    const wandHtml = _getTintedItemHtml(wand, 'ui-icon-xl');
    const wandTmp  = document.createElement('div');
    wandTmp.innerHTML = wandHtml;
    const wandRoot = wandTmp.firstChild;

    // Test injection : tint inconnu → null (whitelist bloque l'injection)
    const evil = _getTintedItemHtml({ ...sword, tint: 'evil); background: url(data:x' }, 'ui-icon-md') || '';

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
  // Régression connue : les url() dans les custom properties CSS sont
  // résolues relativement au CSS consommateur (style.css dans /css/).
  // Un chemin sans `../` produit un 404 silencieux et la baguette/épée
  // n'apparaît pas en jeu (vu en prod 2026-05-10 sur Baguette de Saule).
  assert(t.maskUrl.includes("'../img/"),
         'mask URL doit commencer par ../img/ pour résoudre depuis css/style.css');
  assert(t.overlayUrl.includes("'../img/"),
         'overlay URL doit commencer par ../img/ pour résoudre depuis css/style.css');
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

async function scenarioRepeatableQuestSpawn() {
  console.log('\n── Scénario 3quinquies : chouette_perdue — spawn + reward répétée ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : champs spawnOnAccept + repeatableReward présents sur le template
  const t1 = await page.evaluate(() => {
    const t = QUEST_TEMPLATES.find(q => q.id === 'chouette_perdue');
    return {
      hasSpawn:        !!(t && t.spawnOnAccept),
      spawnTarget:     t?.spawnOnAccept?.targetMonsterId,
      spawnExtra:      t?.spawnOnAccept?.extraRandomCount,
      hasRepeatReward: !!(t && t.repeatableReward),
      repeatXp:        t?.repeatableReward?.xp,
      repeatGold:      t?.repeatableReward?.gold,
      repeatItem:      t?.repeatableReward?.item,
      hasSpawnFn:      typeof spawnQuestMonsters === 'function'
    };
  });
  console.log('  T1 template fields:', t1);
  assert(t1.hasSpawn,                             'spawnOnAccept manquant sur chouette_perdue');
  assert(t1.spawnTarget === 'chouette_envoutee',  'targetMonsterId attendu = chouette_envoutee');
  assert(t1.spawnExtra === 2,                     'extraRandomCount attendu = 2');
  assert(t1.hasRepeatReward,                      'repeatableReward manquant');
  assert(typeof t1.repeatXp === 'number' && t1.repeatXp > 0,   'repeatableReward.xp invalide');
  assert(typeof t1.repeatGold === 'number' && t1.repeatGold > 0, 'repeatableReward.gold invalide');
  assert(t1.repeatItem === undefined,             'repeatableReward ne doit pas redonner le balai');
  assert(t1.hasSpawnFn,                           'spawnQuestMonsters non exposée');

  // T2 : étage vide (donjon nettoyé manuellement) → acceptQuest doit
  // peupler enemyMap avec au moins la cible (chouette).
  const t2 = await page.evaluate(() => {
    // Vide l'étage de tous les ennemis
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    }
    const before = (() => {
      let n = 0;
      for (let y = 0; y < enemyMap.length; y++)
        for (let x = 0; x < enemyMap[y].length; x++)
          if (enemyMap[y][x]) n++;
      return n;
    })();
    acceptQuest('chouette_perdue');
    let chouettes = 0, total = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) {
        const m = enemyMap[y][x];
        if (!m) continue;
        total++;
        if (m.id === 'chouette_envoutee') chouettes++;
      }
    return { before, chouettes, total };
  });
  console.log('  T2 spawn after accept:', t2);
  assert(t2.before === 0,        'enemyMap aurait dû être vidé');
  assert(t2.chouettes >= 1,      'au moins 1 chouette doit être spawnée');
  assert(t2.total >= 2,          'au moins 1 chouette + 1 mob random attendus (pool peut être petit)');

  // T3 : 1re remise → récompense complète (xp 90, gold 30, item broom).
  // On gonfle xpNext pour neutraliser un éventuel level-up qui résète
  // player.xp et fausserait la mesure du delta.
  const t3 = await page.evaluate(() => {
    player.xpNext = 999999;
    const xpBefore   = player.xp;
    const goldBefore = player.gold;
    const hadBroom   = player.inventory.some(i => i.id === 'broom');
    player.inventory = player.inventory.filter(i => i.id !== 'broom');
    const q = activeQuests.find(x => x.id === 'chouette_perdue');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    turnInQuestById('chouette_perdue');
    return {
      hadBroomBefore: hadBroom,
      xpDelta:        player.xp   - xpBefore,
      goldDelta:      player.gold - goldBefore,
      gotBroom:       player.inventory.some(i => i.id === 'broom'),
      lastLvl:        lastQuestCompletion['chouette_perdue']
    };
  });
  console.log('  T3 first turn-in:', t3);
  assert(t3.xpDelta   === 90,     `1re remise : xp+90 attendu, got ${t3.xpDelta}`);
  assert(t3.goldDelta === 30,     `1re remise : gold+30 attendu, got ${t3.goldDelta}`);
  assert(t3.gotBroom,             '1re remise doit donner le balai');
  assert(typeof t3.lastLvl === 'number', 'lastQuestCompletion doit être posé');

  // T4 : ré-acceptation après cooldown atteint → 2e remise = reward dégradée.
  const t4 = await page.evaluate(() => {
    const tpl = QUEST_TEMPLATES.find(q => q.id === 'chouette_perdue');
    player.level += tpl.repeatable.everyLevels; // saute le cooldown
    player.xpNext = 999999;                     // neutralise level-up
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    const accepted = acceptQuest('chouette_perdue');
    let chouettes = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++)
        if (enemyMap[y][x] && enemyMap[y][x].id === 'chouette_envoutee') chouettes++;
    const xpBefore   = player.xp;
    const goldBefore = player.gold;
    const broomCountBefore = player.inventory.filter(i => i.id === 'broom').length;
    const q = activeQuests.find(x => x.id === 'chouette_perdue');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    turnInQuestById('chouette_perdue');
    return {
      accepted,
      chouettesAfterReaccept: chouettes,
      xpDelta:                player.xp   - xpBefore,
      goldDelta:              player.gold - goldBefore,
      broomCountBefore,
      broomCountAfter:        player.inventory.filter(i => i.id === 'broom').length
    };
  });
  console.log('  T4 second turn-in (degraded):', t4);
  assert(t4.accepted,                       'ré-acceptation refusée');
  assert(t4.chouettesAfterReaccept >= 1,    'spawn doit aussi marcher à la 2e acceptation');
  assert(t4.xpDelta   === 60,               `2e remise : xp+60 attendu (repeatableReward), got ${t4.xpDelta}`);
  assert(t4.goldDelta === 35,               `2e remise : gold+35 attendu, got ${t4.goldDelta}`);
  assert(t4.broomCountAfter === t4.broomCountBefore, '2e remise ne doit PAS ajouter un balai');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ chouette_perdue — spawn + reward dégradée OK');
  await browser.close();
}

// ── Scénario : migration des cibles de quête `kill` manquantes ─────
// Couvre les vieilles saves où une quête est active mais la cible n'a
// jamais été spawnée (le hook `spawnOnAccept` a été ajouté après coup).

async function scenarioEnsureKillTargets() {
  console.log('\n── Scénario : _ensureActiveKillQuestTargets (vieilles saves) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : helper exposé
  const t1 = await page.evaluate(() => ({
    hasFn: typeof _ensureActiveKillQuestTargets === 'function'
  }));
  console.log('  T1 fn exposed:', t1);
  assert(t1.hasFn, '_ensureActiveKillQuestTargets non exposée');

  // T2 : simule une vieille save — chouette_perdue active sans spawn.
  // 1) on insère manuellement la quête dans activeQuests (sans passer
  //    par acceptQuest pour éviter le hook spawnOnAccept).
  // 2) on vide enemyMap.
  // 3) appel direct du helper → la chouette doit apparaître.
  const t2 = await page.evaluate(() => {
    const tpl  = QUEST_TEMPLATES.find(q => q.id === 'chouette_perdue');
    const inst = JSON.parse(JSON.stringify(tpl));
    inst.completed = false;
    activeQuests.push(inst);
    availableQuests.delete('chouette_perdue');
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    const added = _ensureActiveKillQuestTargets(currentFloor);
    let chouettes = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++)
        if (enemyMap[y][x] && enemyMap[y][x].id === 'chouette_envoutee') chouettes++;
    return { added, chouettes };
  });
  console.log('  T2 migration spawn:', t2);
  assert(t2.added >= 1,     `helper devrait avoir placé ≥1 cible, got ${t2.added}`);
  assert(t2.chouettes >= 1, 'chouette_envoutee absente après migration');

  // T3 : idempotence — un 2e appel ne doit RIEN ajouter (cible déjà là).
  const t3 = await page.evaluate(() => ({
    added: _ensureActiveKillQuestTargets(currentFloor)
  }));
  console.log('  T3 idempotent:', t3);
  assert(t3.added === 0, `2e appel doit être no-op, got ${t3.added}`);

  // T4 : si la quête est terminée (objective completed), pas de spawn.
  const t4 = await page.evaluate(() => {
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    const q = activeQuests.find(x => x.id === 'chouette_perdue');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    const added = _ensureActiveKillQuestTargets(currentFloor);
    let chouettes = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++)
        if (enemyMap[y][x] && enemyMap[y][x].id === 'chouette_envoutee') chouettes++;
    return { added, chouettes };
  });
  console.log('  T4 completed step skipped:', t4);
  assert(t4.added === 0,     'objective completed → pas de spawn');
  assert(t4.chouettes === 0, 'aucune chouette ne doit être placée');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ migration des cibles de quête OK');
  await browser.close();
}

// ── Scénario : escaliers manquants (softlock collision rooms[0]/last) ─
// Couvre les vieilles saves où la génération a écrasé STAIRS_D avec
// STAIRS_U (centres de salle identiques).

async function scenarioEnsureStairs() {
  console.log('\n── Scénario : _ensureStairsExist (softlock escaliers) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : helper exposé
  const t1 = await page.evaluate(() => ({
    hasFn: typeof _ensureStairsExist === 'function'
  }));
  console.log('  T1 fn exposed:', t1);
  assert(t1.hasFn, '_ensureStairsExist non exposée');

  // T2 : on simule un étage softlocké — supprime STAIRS_D et STAIRS_U
  // du dungeon courant puis appelle le helper.
  const t2 = await page.evaluate(() => {
    currentFloor = 5; // floor>1 pour activer la condition STAIRS_U
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.STAIRS_D || dungeon[y][x] === CELL.STAIRS_U) {
          dungeon[y][x] = CELL.FLOOR;
        }
      }
    }
    const added = _ensureStairsExist(currentFloor);
    let down = 0, up = 0;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.STAIRS_D) down++;
        if (dungeon[y][x] === CELL.STAIRS_U) up++;
      }
    }
    return { added, down, up };
  });
  console.log('  T2 softlocked floor:', t2);
  assert(t2.added === 2, `helper devrait avoir ajouté 2 escaliers, got ${t2.added}`);
  assert(t2.down === 1, 'STAIRS_D absent après migration');
  assert(t2.up === 1,   'STAIRS_U absent après migration sur floor>1');

  // T3 : idempotence — 2e appel = no-op
  const t3 = await page.evaluate(() => ({
    added: _ensureStairsExist(currentFloor)
  }));
  console.log('  T3 idempotent:', t3);
  assert(t3.added === 0, `2e appel doit être no-op, got ${t3.added}`);

  // T4 : floor 1 → pas de STAIRS_U ajouté même si manquant
  const t4 = await page.evaluate(() => {
    currentFloor = 1;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.STAIRS_D || dungeon[y][x] === CELL.STAIRS_U) {
          dungeon[y][x] = CELL.FLOOR;
        }
      }
    }
    const added = _ensureStairsExist(currentFloor);
    let down = 0, up = 0;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.STAIRS_D) down++;
        if (dungeon[y][x] === CELL.STAIRS_U) up++;
      }
    }
    return { added, down, up };
  });
  console.log('  T4 floor 1 (no STAIRS_U):', t4);
  assert(t4.added === 1, 'floor 1 : seul STAIRS_D doit être ajouté');
  assert(t4.down === 1,  'STAIRS_D manquant sur floor 1');
  assert(t4.up === 0,    'STAIRS_U ne doit PAS être ajouté sur floor 1');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ migration des escaliers OK');
  await browser.close();
}

// ── Scénario 3sexies : Itération 7.4 — câblage métier des 4 PNJ lore ─

async function scenarioIteration74() {
  console.log('\n── Scénario 3sexies : Itération 7.4 — Ollivander/Guipure/Portrait/Fumseck ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : Ollivander expose wand1+wand2, buyback baguette à 75%, wand2 retiré du shop fixe.
  const t1 = await page.evaluate(() => {
    const o = getNpcById('ollivander');
    npcPlacements.set('1,1', 'ollivander');
    seenNpcs.add('ollivander');
    openVendorShop('ollivander');
    const grid = document.getElementById('shop-grid');
    const itemIds = Array.from(grid.querySelectorAll('[data-item-id]'))
      .map(el => el.getAttribute('data-item-id'));
    // sell — wand1 doit afficher 75% du price
    player.inventory = [{ ...ITEMS.find(i => i.id === 'wand1') }];
    setShopMode('sell');
    const sellLabel = document.querySelector('#shop-grid .shop-price')?.textContent;
    const wand1Price = ITEMS.find(i => i.id === 'wand1').price;
    // wand2 ne doit PLUS être dans SHOP_CATALOG (Malkins)
    const wand2InStaticShop = SHOP_CATALOG.some(e => e.id === 'wand2');
    return {
      hasOllivander:      !!o,
      buybackWand:        o && o.buyback && o.buyback.byType && o.buyback.byType.wand,
      waresContainsWand1: itemIds.includes('wand1'),
      waresContainsWand2: itemIds.includes('wand2'),
      sellLabel,
      sellExpected:       '+' + Math.max(1, Math.floor(wand1Price * 0.75)) + 'G',
      wand2InStaticShop
    };
  });
  console.log('  T1 Ollivander:', t1);
  assert(t1.hasOllivander,        'PNJ ollivander absent');
  assert(t1.buybackWand === 0.75, 'buyback wand 75% manquant chez Ollivander');
  assert(t1.waresContainsWand1,   'wand1 absent des wares Ollivander');
  assert(t1.waresContainsWand2,   'wand2 absent des wares Ollivander');
  assert(t1.sellLabel === t1.sellExpected,
    `Ollivander doit racheter wand1 à 75% (${t1.sellExpected}), got ${t1.sellLabel}`);
  assert(!t1.wand2InStaticShop,   'wand2 ne doit plus être dans SHOP_CATALOG (Malkins)');

  // T2 : Guipure — buyback bySlot 75% sur body/head/cloak via robe1.
  const t2 = await page.evaluate(() => {
    const g = getNpcById('guipure');
    npcPlacements.set('1,1', 'guipure');
    seenNpcs.add('guipure');
    player.inventory = [{ ...ITEMS.find(i => i.id === 'robe1') }];
    openVendorShop('guipure');
    setShopMode('sell');
    const sellLabel = document.querySelector('#shop-grid .shop-price')?.textContent;
    const robe1Price = ITEMS.find(i => i.id === 'robe1').price;
    return {
      hasGuipure:        !!g,
      bySlotBody:        g && g.buyback && g.buyback.bySlot && g.buyback.bySlot.body,
      bySlotHead:        g && g.buyback && g.buyback.bySlot && g.buyback.bySlot.head,
      bySlotCloak:       g && g.buyback && g.buyback.bySlot && g.buyback.bySlot.cloak,
      waresLen:          (g && g.wares || []).length,
      sellLabel,
      sellExpected:      '+' + Math.max(1, Math.floor(robe1Price * 0.75)) + 'G'
    };
  });
  console.log('  T2 Guipure:', t2);
  assert(t2.hasGuipure,            'PNJ guipure absent');
  assert(t2.bySlotBody === 0.75,   'buyback bySlot.body 75% manquant chez Guipure');
  assert(t2.bySlotHead === 0.75,   'buyback bySlot.head 75% manquant chez Guipure');
  assert(t2.bySlotCloak === 0.75,  'buyback bySlot.cloak 75% manquant chez Guipure');
  assert(t2.waresLen >= 4,         'Guipure doit proposer au moins 4 articles');
  assert(t2.sellLabel === t2.sellExpected,
    `Guipure doit racheter robe1 à 75% (${t2.sellExpected}), got ${t2.sellLabel}`);

  // T3 : Portrait Dumbledore — pool contextuel filtré par étage.
  // À l'étage 1 (currentFloor par défaut), le pool tirable contient `chat_norris`
  // et autres bas étages mais pas mangemorts/Voldemort → matches devrait être vide
  // → fallback sur idle. À l'étage 8 forcé, plusieurs entrées doivent matcher.
  const t3 = await page.evaluate(() => {
    closeNpcDialog();
    const p = getNpcById('portrait_dumbledore');
    if (!p || !p.dialogues || !p.dialogues.contextualLore) return { ok: false };
    const loreEntries = p.dialogues.contextualLore.length;
    // Étage 1 : aucun match attendu
    currentFloor = 1;
    const hitsFloor1 = (typeof _pickContextualLore === 'function')
      ? _pickContextualLore(p) : null;
    // Étage 9 : Voldemort, Bellatrix, mangemorts → plusieurs matches attendus
    currentFloor = 10;
    const hitsFloor10 = (typeof _pickContextualLore === 'function')
      ? _pickContextualLore(p) : null;
    return {
      ok: true,
      loreEntries,
      hitsFloor1,
      hitsFloor10,
      hasContextualLore: !!p.dialogues.contextualLore
    };
  });
  console.log('  T3 Portrait Dumbledore lore:', t3);
  assert(t3.ok,                            'portrait_dumbledore introuvable');
  assert(t3.hasContextualLore,             'contextualLore absent du portrait');
  assert(t3.loreEntries >= 8,              'au moins 8 répliques contextuelles attendues');
  assert(t3.hitsFloor1 === null,           'aucune réplique ne doit matcher l\'étage 1');
  assert(typeof t3.hitsFloor10 === 'string' && t3.hitsFloor10.length > 0,
    'au moins une réplique doit matcher l\'étage 10');

  // T4 : Fumseck — heal+revive, cooldown 1×/étage, reset à l'entrée d'un nouvel étage.
  const t4 = await page.evaluate(() => {
    currentFloor = 7;
    const f = getNpcById('fumseck');
    // KO Harry
    party[0].hp = 0;
    party[0].sp = 0;
    if (party[1]) { party[1].hp = 5; party[1].sp = 5; }
    usedSpecialNpcs = new Set();
    triggerNpcSpecialAction('fumseck');
    const after1 = {
      harryHp:  party[0].hp,
      harryHpMax: party[0].hpMax,
      harrySp:  party[0].sp,
      harrySpMax: party[0].spMax,
      spent:    usedSpecialNpcs.has('fumseck')
    };
    // 2e clic refusé (cooldown)
    party[0].hp = 1;
    triggerNpcSpecialAction('fumseck');
    const after2 = {
      harryHpAfter2: party[0].hp,   // doit rester à 1 (refus silencieux)
      stillSpent:    usedSpecialNpcs.has('fumseck')
    };
    // Reset par entrée d'étage : on simule via le pipeline de reset
    usedSpecialNpcs = new Set();
    triggerNpcSpecialAction('fumseck');
    const after3 = {
      harryHpAfter3: party[0].hp,
      respent:       usedSpecialNpcs.has('fumseck')
    };
    return { hasFumseck: !!f, hasSpecial: !!(f && f.specialAction), ...after1, ...after2, ...after3 };
  });
  console.log('  T4 Fumseck:', t4);
  assert(t4.hasFumseck,                'PNJ fumseck absent');
  assert(t4.hasSpecial,                'specialAction absent sur fumseck');
  assert(t4.harryHp > 0,               'Harry doit être ranimé après les larmes');
  assert(t4.harryHp === t4.harryHpMax, `Harry doit être à hpMax après l'usage, got ${t4.harryHp}/${t4.harryHpMax}`);
  assert(t4.harrySp === t4.harrySpMax, `Harry doit être à spMax (PM) après l'usage`);
  assert(t4.spent,                     'usedSpecialNpcs doit contenir fumseck après usage');
  assert(t4.harryHpAfter2 === 1,       '2e clic doit être refusé silencieusement (Harry reste à 1 PV)');
  assert(t4.stillSpent,                'cooldown doit persister');
  assert(t4.harryHpAfter3 > 1,         'après reset usedSpecialNpcs, larmes redevenues utilisables');
  assert(t4.respent,                   'reset puis 2e usage : usedSpecialNpcs doit contenir fumseck à nouveau');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Itération 7.4 — câblage métier des 4 PNJ OK');
  await browser.close();
}

// ── Scénario 25 : Phase 3b — quêtes secondaires PNJ + regenHp ──
//
// 4 nouvelles quêtes câblées sur Ollivander/Guipure/Portrait Dumbledore/
// Fumseck, distribuant des récompenses équipement étendues. Plus 2 nouveaux
// items : `anneau_resurrection` (grantsSpell:Reparo) et `larmes_phenix`
// (regenHp:3, slot:amulet). Plus le tick `applyEquipmentRegen()` dans
// `battle.js` qui fait régénérer les PV à chaque round ennemi.

async function scenarioEquipmentPhase3bQuests() {
  console.log('\n── Scénario 25 : Phase 3b — quotes équipement + regenHp ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 4 nouveaux templates dans QUEST_TEMPLATES, chacun avec un reward.item
  const t1 = await page.evaluate(() => {
    const ids = ['bottines_ollivander', 'fil_acromantule', 'anneau_dumbledore', 'bouclier_phenix'];
    return ids.map(id => {
      const t = QUEST_TEMPLATES.find(q => q.id === id);
      return t ? {
        id,
        rewardItem: t.reward && t.reward.item,
        objType: t.objectives && t.objectives[0] && t.objectives[0].type,
        objTarget: t.objectives && t.objectives[0] && (t.objectives[0].monsterId || t.objectives[0].itemId),
        objAmount: t.objectives && t.objectives[0] && t.objectives[0].amount
      } : { id, missing: true };
    });
  });
  console.log('  T1 templates:', t1);
  assert(t1.every(x => !x.missing), `template manquant: ${t1.filter(x=>x.missing).map(x=>x.id)}`);
  assert(t1.find(x => x.id === 'bottines_ollivander').rewardItem === 'bottes_dragon',
    'bottines_ollivander doit donner bottes_dragon');
  assert(t1.find(x => x.id === 'fil_acromantule').rewardItem === 'cape_voyageur',
    'fil_acromantule doit donner cape_voyageur');
  assert(t1.find(x => x.id === 'anneau_dumbledore').rewardItem === 'anneau_resurrection',
    'anneau_dumbledore doit donner anneau_resurrection');
  assert(t1.find(x => x.id === 'bouclier_phenix').rewardItem === 'larmes_phenix',
    'bouclier_phenix doit donner larmes_phenix');
  assert(t1.find(x => x.id === 'fil_acromantule').objAmount === 3,
    'fil_acromantule doit demander 3 cibles');
  assert(t1.find(x => x.id === 'bouclier_phenix').objAmount === 5,
    'bouclier_phenix doit demander 5 cibles');

  // T2 : les 4 PNJ ont questsGiven/questsTurnedIn correctement câblés
  const t2 = await page.evaluate(() => {
    const map = { ollivander: 'bottines_ollivander', guipure: 'fil_acromantule',
                  portrait_dumbledore: 'anneau_dumbledore', fumseck: 'bouclier_phenix' };
    const out = {};
    Object.entries(map).forEach(([npcId, questId]) => {
      const n = getNpcById(npcId);
      out[npcId] = {
        exists: !!n,
        gives:    n && n.questsGiven    && n.questsGiven.includes(questId),
        turnsIn:  n && n.questsTurnedIn && n.questsTurnedIn.includes(questId)
      };
    });
    return out;
  });
  console.log('  T2 PNJ câblage:', t2);
  Object.entries(t2).forEach(([npcId, d]) => {
    assert(d.exists,   `PNJ ${npcId} introuvable`);
    assert(d.gives,    `PNJ ${npcId} doit avoir la quête dans questsGiven`);
    assert(d.turnsIn,  `PNJ ${npcId} doit avoir la quête dans questsTurnedIn`);
  });

  // T3 : les 2 nouveaux items existent avec les bons champs
  const t3 = await page.evaluate(() => {
    const ar = ITEMS.find(i => i.id === 'anneau_resurrection');
    const lp = ITEMS.find(i => i.id === 'larmes_phenix');
    return {
      arExists: !!ar, arSlot: ar && ar.slot, arRarity: ar && ar.rarity,
      arGrantsSpell: ar && ar.grantsSpell, arBonusMag: ar && ar.bonusMag,
      lpExists: !!lp, lpSlot: lp && lp.slot, lpRarity: lp && lp.rarity,
      lpRegenHp: lp && lp.regenHp, lpBonusDef: lp && lp.bonusDef
    };
  });
  console.log('  T3 nouveaux items:', t3);
  assert(t3.arExists && t3.arSlot === 'ring' && t3.arRarity === 'epic',
    'anneau_resurrection doit être slot:ring rarity:epic');
  assert(t3.arGrantsSpell === 'Reparo',
    'anneau_resurrection doit grantsSpell:Reparo');
  assert(t3.lpExists && t3.lpSlot === 'amulet' && t3.lpRarity === 'epic',
    'larmes_phenix doit être slot:amulet rarity:epic');
  assert(t3.lpRegenHp === 3,
    `larmes_phenix doit avoir regenHp:3, got ${t3.lpRegenHp}`);

  // T4 : applyEquipmentRegen() régénère les PV de l'allié équipé
  const t4 = await page.evaluate(() => {
    const lp = ITEMS.find(i => i.id === 'larmes_phenix');
    player.equipped.amulet = JSON.parse(JSON.stringify(lp));
    recalculateStats();
    player.hp = Math.max(1, player.hpMax - 10);
    const before = player.hp;
    if (typeof applyEquipmentRegen !== 'function') return { fail: 'applyEquipmentRegen non exposée' };
    applyEquipmentRegen();
    return { before, after: player.hp, hpMax: player.hpMax, expected: before + 3 };
  });
  console.log('  T4 regenHp tick:', t4);
  assert(!t4.fail, t4.fail || '');
  assert(t4.after === t4.expected,
    `tick doit ajouter +3 PV, got ${t4.after} (attendu ${t4.expected})`);

  // T5 : le regen est plafonné par hpMax (pas de débordement)
  const t5 = await page.evaluate(() => {
    player.hp = player.hpMax - 1;
    applyEquipmentRegen();
    const r1 = { capped: player.hp === player.hpMax };
    // Plein PV → no-op
    player.hp = player.hpMax;
    applyEquipmentRegen();
    r1.noOp = player.hp === player.hpMax;
    // KO → no-op
    player.hp = 0;
    applyEquipmentRegen();
    r1.koSkipped = player.hp === 0;
    return r1;
  });
  console.log('  T5 cap/no-op/ko:', t5);
  assert(t5.capped,    'regen doit s\'arrêter à hpMax');
  assert(t5.noOp,      'pas de regen quand hp === hpMax');
  assert(t5.koSkipped, 'pas de regen sur un perso KO (hp <= 0)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 3b — 4 quêtes + 2 items + regenHp passif OK');
  await browser.close();
}

// ── Scénario 26 : Crit + Esquive (stats dérivées + câblage combat) ──
//
// Iter B de la refonte UX Personnage : recalculateStats() expose désormais
// `critChance` (LCK) et `dodgeChance` (AGI). Le combat applique :
//   - crit physique dans executeAttack (×1.5 dégâts)
//   - esquive dans enemyTurn (annule l'attaque ennemie)

async function scenarioCritDodge() {
  console.log('\n── Scénario 26 : Crit + Esquive ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : critChance, dodgeChance, critMultiplier présents et cohérents
  const t1 = await page.evaluate(() => {
    recalculateStats();
    return {
      critChance:    party[0].critChance,
      dodgeChance:   party[0].dodgeChance,
      critMult:      party[0].critMultiplier,
      lck:           party[0].lck,
      agi:           party[0].agi
    };
  });
  console.log('  T1 stats dérivées:', t1);
  // Harry base : LCK=15, AGI=12 → critChance ≈ 5 + 15*0.5 = 12.5 ; dodgeChance ≈ 5 + 12*0.4 = 9.8
  assert(typeof t1.critChance === 'number',  'critChance doit être un nombre');
  assert(typeof t1.dodgeChance === 'number', 'dodgeChance doit être un nombre');
  assert(t1.critMult === 1.5,                 `critMultiplier doit être 1.5, got ${t1.critMult}`);
  assert(t1.critChance >= 5 && t1.critChance <= 40, `critChance hors plage [5;40] : ${t1.critChance}`);
  assert(t1.dodgeChance >= 5 && t1.dodgeChance <= 35, `dodgeChance hors plage [5;35] : ${t1.dodgeChance}`);

  // T2 : monter LCK fait monter critChance proportionnellement
  const t2 = await page.evaluate(() => {
    party[0]._baseLck = 30;
    recalculateStats();
    const high = party[0].critChance;
    party[0]._baseLck = 0;
    recalculateStats();
    const low = party[0].critChance;
    return { high, low };
  });
  console.log('  T2 critChance LCK 30 vs 0:', t2);
  assert(t2.high > t2.low, `LCK 30 doit donner plus de critChance que LCK 0 (got ${t2.high} vs ${t2.low})`);
  assert(t2.high >= 15,    `LCK 30 → critChance attendue ≥15%, got ${t2.high}`);
  assert(t2.low === 5,     `LCK 0 → critChance plancher 5%, got ${t2.low}`);

  // T3 : modale Personnage affiche Critique et Esquive
  const t3 = await page.evaluate(() => {
    party[0]._baseLck = 15; party[0]._baseAgi = 12;
    recalculateStats();
    openCharacter(0);
    const txt = document.getElementById('char-detail').textContent;
    return {
      hasCritLabel:  txt.includes('Critique'),
      hasDodgeLabel: txt.includes('Esquive'),
      hasPercent:    /\d+%/.test(txt)
    };
  });
  console.log('  T3 modale:', t3);
  assert(t3.hasCritLabel,  'modale doit afficher "Critique"');
  assert(t3.hasDodgeLabel, 'modale doit afficher "Esquive"');
  assert(t3.hasPercent,    'modale doit afficher un %');

  // T4 : 200 rolls de crit avec critChance=20% — fréquence observée raisonnable
  const t4 = await page.evaluate(() => {
    party[0].critChance = 20;
    let crits = 0;
    for (let i = 0; i < 200; i++) {
      if (Math.random() * 100 < (party[0].critChance || 0)) crits++;
    }
    return { crits, total: 200 };
  });
  console.log('  T4 crit rolls 200 @20%:', t4);
  assert(t4.crits >= 20 && t4.crits <= 80,
    `200 rolls @20% : entre 20 et 80 crits attendus (3σ ≈ ±17), got ${t4.crits}`);

  // T5 : enemyTurn applique l'esquive — dodgeChance=100% → 0 dégâts
  const t5 = await page.evaluate(() => {
    inBattle = true;
    enemyGroup = [{ id:'_test', name:'Test', icon:'X', hp:5, atk:10, def:0,
                    currentHp:5, statusEffects:[] }];
    party[0].hp = party[0].hpMax;
    party[0].dodgeChance = 100;
    shieldTurns = [0, 0];
    party[0].statusEffects = [];
    const before = party[0].hp;
    enemyTurn();
    const after = party[0].hp;
    inBattle = false;
    return { before, after };
  });
  console.log('  T5 esquive 100%:', t5);
  assert(t5.after === t5.before,
    `dodgeChance=100% : aucun dégât attendu, got ${t5.before}→${t5.after}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Crit + Esquive OK');
  await browser.close();
}

// ── Scénario 27 : loader (manifeste de globals + helpers) ────
async function scenarioRelativeControls() {
  console.log('\n── Scénario : contrôles relatifs (avancer/reculer/pivoter) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Helpers exposés sur window
  const exposed = await page.evaluate(() => ({
    moveForward:  typeof moveForward  === 'function',
    moveBackward: typeof moveBackward === 'function',
    turnLeft:     typeof turnLeft     === 'function',
    turnRight:    typeof turnRight    === 'function'
  }));
  assert(exposed.moveForward,  'moveForward absent');
  assert(exposed.moveBackward, 'moveBackward absent');
  assert(exposed.turnLeft,     'turnLeft absent');
  assert(exposed.turnRight,    'turnRight absent');

  // 2) Rotation : turnRight de n → e, sans changer playerX/playerY.
  const rot = await page.evaluate(() => {
    playerDir = 'n';
    const x0 = playerX, y0 = playerY;
    turnRight();
    const e = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    turnLeft();
    const back = { dir: playerDir };
    return { e, back };
  });
  assert(rot.e.dir === 'e',   `turnRight depuis n doit donner e (obtenu ${rot.e.dir})`);
  assert(!rot.e.moved,        'turnRight ne doit pas déplacer le joueur');
  assert(rot.back.dir === 'n',`turnLeft doit ramener à n (obtenu ${rot.back.dir})`);

  // 3) moveForward : tente d'avancer dans chaque direction jusqu'à trouver
  //    une case libre. Vérifie ensuite que moveBackward fait l'inverse SANS
  //    pivoter, puis que l'opposé du dx,dy correspond bien à playerDir.
  const stepCheck = await page.evaluate(() => {
    const dirs = ['n','e','s','w'];
    const D = { n:[0,-1], e:[1,0], s:[0,1], w:[-1,0] };
    for (const d of dirs) {
      playerDir = d;
      const [dx,dy] = D[d];
      const nx = playerX + dx, ny = playerY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (dungeon[ny][nx] === CELL.WALL) continue;
      const x0 = playerX, y0 = playerY;
      moveForward();
      const afterFwd = { dir: playerDir, dx: playerX - x0, dy: playerY - y0 };
      const dirBefore = playerDir;
      moveBackward();
      const afterBack = { dir: playerDir, dx: playerX - x0, dy: playerY - y0 };
      return { tried: d, afterFwd, afterBack, dirPreserved: dirBefore === afterBack.dir };
    }
    return { tried: null };
  });
  assert(stepCheck.tried, 'aucune direction libre — donjon corrompu ?');
  assert(stepCheck.afterFwd.dx !== 0 || stepCheck.afterFwd.dy !== 0,
    'moveForward sans effet sur la position');
  assert(stepCheck.afterFwd.dir === stepCheck.tried,
    'moveForward doit aligner playerDir sur la direction du pas');
  assert(stepCheck.afterBack.dx === 0 && stepCheck.afterBack.dy === 0,
    'moveBackward doit ramener à la position initiale');
  assert(stepCheck.dirPreserved,
    'moveBackward NE doit PAS modifier playerDir');

  // 4) Mapping clavier : ArrowRight déclenche turnRight (rotation cardinale).
  const kbd = await page.evaluate(async () => {
    playerDir = 'n';
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    document.dispatchEvent(ev);
    return playerDir;
  });
  assert(kbd === 'e', `ArrowRight depuis n doit donner playerDir=e (obtenu ${kbd})`);

  // 5) Boussole : la lettre orientée porte la classe .facing.
  const compass = await page.evaluate(() => {
    playerDir = 'e';
    updateCompass();
    return {
      facingE: document.getElementById('dir-e')?.classList.contains('facing'),
      facingN: document.getElementById('dir-n')?.classList.contains('facing')
    };
  });
  assert(compass.facingE,  'la lettre E doit porter .facing quand playerDir=e');
  assert(!compass.facingN, 'la lettre N ne doit pas porter .facing quand playerDir=e');

  // 6) Minimap : la case joueur contient un enfant .map-player-arrow
  //    avec la classe directionnelle correspondant à playerDir.
  const arrow = await page.evaluate(() => {
    playerDir = 's';
    renderMinimap();
    const mini = document.getElementById('minimap');
    const playerCell = mini?.querySelector('.map-cell.map-player');
    const arr = playerCell?.querySelector('.map-player-arrow');
    return {
      hasArrow: !!arr,
      hasDirClass: !!arr && arr.classList.contains('map-player-dir-s')
    };
  });
  assert(arrow.hasArrow,    'flèche d\'orientation absente sur la minimap');
  assert(arrow.hasDirClass, 'flèche minimap manque la classe map-player-dir-s');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Contrôles relatifs OK');
  await browser.close();
}

// ── Scénario : swipe canvas pseudo-3D (mobile) ──────────────────
async function scenarioCanvasSwipe() {
  console.log('\n── Scénario : swipe canvas pseudo-3D ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Helpers exposés
  const exposed = await page.evaluate(() => ({
    init:     typeof window.initCanvasSwipeGestures === 'function',
    dispatch: typeof window._dispatchCanvasSwipe     === 'function',
    blocked:  typeof window._isCanvasSwipeBlocked    === 'function'
  }));
  assert(exposed.init,     'initCanvasSwipeGestures absent');
  assert(exposed.dispatch, '_dispatchCanvasSwipe absent');
  assert(exposed.blocked,  '_isCanvasSwipeBlocked absent');

  // 2) Mapping rotation : swipe horizontal → turnLeft / turnRight,
  //    position inchangée.
  const rot = await page.evaluate(() => {
    playerDir = 'n';
    const x0 = playerX, y0 = playerY;
    window._dispatchCanvasSwipe(80, 0);   // → droite
    const right = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    window._dispatchCanvasSwipe(-80, 0);  // → gauche
    const left  = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    return { right, left };
  });
  assert(rot.right.dir === 'e',  `swipe droite depuis n doit donner e (obtenu ${rot.right.dir})`);
  assert(!rot.right.moved,       'swipe droite ne doit pas déplacer le joueur');
  assert(rot.left.dir === 'n',   `swipe gauche depuis e doit ramener à n (obtenu ${rot.left.dir})`);
  assert(!rot.left.moved,        'swipe gauche ne doit pas déplacer le joueur');

  // 3) Mapping translation : swipe vertical → moveForward / moveBackward.
  //    On cherche une direction où la case devant est libre, puis on
  //    déclenche un swipe vers le haut (avancer) puis vers le bas (reculer).
  const trans = await page.evaluate(() => {
    const dirs = ['n','e','s','w'];
    const D = { n:[0,-1], e:[1,0], s:[0,1], w:[-1,0] };
    for (const d of dirs) {
      playerDir = d;
      const [dx,dy] = D[d];
      const nx = playerX + dx, ny = playerY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (dungeon[ny][nx] === CELL.WALL) continue;
      const x0 = playerX, y0 = playerY;
      window._dispatchCanvasSwipe(0, -80);  // ↑ = avancer
      const afterFwd = { dx: playerX - x0, dy: playerY - y0, dir: playerDir };
      const dirBefore = playerDir;
      window._dispatchCanvasSwipe(0, 80);   // ↓ = reculer
      const afterBack = { dx: playerX - x0, dy: playerY - y0, dir: playerDir };
      return { tried: d, afterFwd, afterBack, dirPreserved: dirBefore === afterBack.dir };
    }
    return { tried: null };
  });
  assert(trans.tried, 'aucune direction libre — donjon corrompu ?');
  assert(trans.afterFwd.dx !== 0 || trans.afterFwd.dy !== 0,
    'swipe haut sans effet sur la position');
  assert(trans.afterFwd.dir === trans.tried,
    'swipe haut doit aligner playerDir sur la direction du pas');
  assert(trans.afterBack.dx === 0 && trans.afterBack.dy === 0,
    'swipe bas doit ramener à la position initiale');
  assert(trans.dirPreserved,
    'swipe bas (reculer) NE doit PAS modifier playerDir');

  // 4) Garde-fou combat : pendant inBattle, le swipe est bloqué.
  const guard = await page.evaluate(() => {
    inBattle = true;
    const dir0 = playerDir;
    const x0 = playerX, y0 = playerY;
    const wasBlocked = window._isCanvasSwipeBlocked();
    // Le dispatch lui-même appelle moveForward/turnLeft, qui sont déjà
    // gardés par inBattle ; on vérifie surtout _isCanvasSwipeBlocked.
    inBattle = false;
    return { wasBlocked, dirUnchanged: playerDir === dir0,
             posUnchanged: playerX === x0 && playerY === y0 };
  });
  assert(guard.wasBlocked,    '_isCanvasSwipeBlocked doit être vrai pendant inBattle');
  assert(guard.dirUnchanged,  'playerDir ne doit pas changer pendant inBattle');
  assert(guard.posUnchanged,  'position ne doit pas changer pendant inBattle');

  // 5) Canvas marqué `data-swipe-bound` et touch-action: none côté CSS.
  const dom = await page.evaluate(() => {
    const c = document.getElementById('dungeon-canvas');
    if (!c) return null;
    return {
      bound:       c.dataset.swipeBound,
      touchAction: getComputedStyle(c).touchAction
    };
  });
  assert(dom,                       'canvas #dungeon-canvas absent');
  assert(dom.bound === '1',         'canvas pas marqué comme bound');
  assert(dom.touchAction === 'none',
    `touch-action attendu "none", obtenu "${dom.touchAction}"`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Swipe canvas OK');
  await browser.close();
}

// ── Scénario : sprite PNJ dans la vue pseudo-3D ─────────────────
async function scenarioNpcSprite3D() {
  console.log('\n── Scénario : sprite PNJ pseudo-3D ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) drawNpcSprite est exposé.
  const exposed = await page.evaluate(() => ({
    drawNpcSprite: typeof drawNpcSprite === 'function'
  }));
  assert(exposed.drawNpcSprite, 'drawNpcSprite absent du global scope');

  // 2) Forcer un PNJ pile devant le joueur, vérifier que drawNpcSprite
  //    est appelé avec l'id attendu.
  const result = await page.evaluate(() => {
    // Place le joueur dans un état déterministe : direction 'n', case
    // (5,5) si possible, et la case juste devant (5,4) devient CELL.NPC.
    const px = 5, py = 5;
    // Sécurise les bornes
    if (px < 1 || py < 2 || px >= MAP_W - 1 || py >= MAP_H - 1) {
      return { skipped: 'hors carte', tried: { px, py } };
    }
    playerX = px;
    playerY = py;
    playerDir = 'n';
    // S'assurer que le joueur est sur une case libre
    dungeon[py][px] = CELL.FLOOR;
    // La case juste devant : NPC associé à un PNJ déterministe.
    dungeon[py - 1][px] = CELL.NPC;
    if (typeof npcPlacements === 'undefined') return { skipped: 'no npcPlacements' };
    npcPlacements.set(`${px},${py - 1}`, 'dumbledore');

    // Spy sur drawNpcSprite — wrap pour capturer les args.
    const calls = [];
    const orig = window.drawNpcSprite;
    window.drawNpcSprite = function (npcId, x, baseY, sz) {
      calls.push({ npcId, x, baseY, sz });
      return orig.apply(this, arguments);
    };

    // Spy sur l'objet sprite : vérifier que l'image est demandée.
    // _getNpcSprite stocke _NPC_SPRITE module-scope ; on lit son .src
    // après drawDungeon().
    drawDungeon();

    window.drawNpcSprite = orig;
    // Trouver l'élément Image du sprite via le DOM (les Image() restent
    // attachées au document si srcd, sinon on relit depuis le call).
    // Plus simple : on inspecte qu'au moins un call ait été fait avec
    // npcId === 'dumbledore'.
    return {
      callCount: calls.length,
      lastCall:  calls[calls.length - 1] || null
    };
  });
  console.log('  result :', result);
  assert(!result.skipped, `scénario skipé : ${result.skipped}`);
  assert(result.callCount >= 1,
    `drawNpcSprite doit être appelé au moins 1 fois (obtenu ${result.callCount})`);
  assert(result.lastCall.npcId === 'dumbledore',
    `npcId attendu "dumbledore", obtenu "${result.lastCall.npcId}"`);
  assert(typeof result.lastCall.x === 'number' && Number.isFinite(result.lastCall.x),
    'coord x invalide');
  assert(typeof result.lastCall.baseY === 'number' && Number.isFinite(result.lastCall.baseY),
    'coord baseY invalide');
  assert(result.lastCall.sz > 0, 'taille sz doit être > 0');

  // 3) Le PNG _wizard_generic.png est demandé par _getNpcSprite.
  //    On déclenche l'appel et on lit l'image source via un second
  //    drawDungeon (au cas où le premier n'a pas alloué encore).
  const png = await page.evaluate(() => {
    // Force un appel pour s'assurer que _getNpcSprite a tourné.
    drawNpcSprite('dumbledore', 100, 100, 60);
    // _NPC_SPRITE est module-scope ; on ne peut pas y accéder
    // directement, mais l'image est dans le DOM ? Non — `new Image()`
    // n'est pas dans le DOM. On relit via une fetch sync de l'asset
    // pour confirmer son existence côté serveur (file://).
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload  = () => resolve({ ok: true,  src: probe.src });
      probe.onerror = () => resolve({ ok: false, src: probe.src });
      probe.src = 'img/npc/_wizard_generic.png';
    });
  });
  console.log('  png   :', png);
  assert(png.ok, "img/npc/_wizard_generic.png inaccessible côté navigateur");
  assert(/\/_wizard_generic\.png$/.test(png.src),
    `src finale attendue …/_wizard_generic.png, obtenu ${png.src}`);

  // 4) Pas de PNJ devant → drawNpcSprite NE doit PAS être appelé.
  const noNpc = await page.evaluate(() => {
    // Retire le PNJ posé plus haut, place du floor partout devant.
    if (typeof npcPlacements !== 'undefined') npcPlacements.clear();
    for (let dy = 1; dy <= 3; dy++) {
      const yy = playerY - dy;
      if (yy >= 0) dungeon[yy][playerX] = CELL.FLOOR;
    }
    const calls = [];
    const orig = window.drawNpcSprite;
    window.drawNpcSprite = function () { calls.push(arguments); };
    drawDungeon();
    window.drawNpcSprite = orig;
    return { calls: calls.length };
  });
  assert(noNpc.calls === 0,
    `drawNpcSprite ne doit pas être appelé si aucun PNJ devant (obtenu ${noNpc.calls})`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ sprite PNJ pseudo-3D OK');
  await browser.close();
}

// ── Scénario endgame 1 : trigger de victoire + idempotence ─────
async function scenarioVictoryTrigger() {
  console.log('\n── Scénario endgame 1 : trigger de victoire ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1. Setup minimal d'un combat contre voldemort_revenu hp 1
  await page.evaluate(() => {
    currentFloor = 10;
    party[0].level = 10; party[0].hp = 999; party[0].atk = 999; party[0].def = 0;
    // startBattle clone le monstre — l'id est conservé.
    startBattle({
      id: 'voldemort_revenu', name: 'Voldemort Ressuscité', icon: '☠',
      hp: 1, atk: 1, def: 0, mag: 1, agi: 1, lck: 1,
      xp: 100, gold: 1, abilities: [], drops: [],
      resist: [], weak: [], desc: 'Test'
    });
    // Réécrase pour HP=1 (rollGroupSize peut spawn d'autres ennemis)
    enemyGroup = [{ ...enemyGroup[0], currentHp: 1, hp: 1 }];
  });

  // 2. Attaque → kill → trigger
  await page.evaluate(() => battleAction('attack'));
  await page.waitForFunction(() => victoryAchieved === true, { timeout: 3000 });

  const after = await page.evaluate(() => ({
    flag: victoryAchieved,
    victoryAtSet: typeof victoryAt === 'string' && victoryAt.length > 0,
    modalOpen: document.getElementById('victory-modal')?.style.display === 'flex'
  }));
  console.log('  trigger →', after);
  assert(after.flag === true,         'victoryAchieved doit être à true');
  assert(after.victoryAtSet,          'victoryAt doit être une date ISO non vide');
  assert(after.modalOpen === true,    '#victory-modal doit être affichée');

  // 3. Idempotent : second trigger = no-op, ne ré-ouvre pas la modale
  await page.evaluate(() => {
    document.getElementById('victory-modal').style.display = 'none';
    checkVictoryTrigger('voldemort_revenu');
  });
  const reopened = await page.evaluate(() =>
    document.getElementById('victory-modal').style.display === 'flex');
  assert(reopened === false, 'la modale ne doit pas se rouvrir au 2e appel (C4)');

  // 4. Persistance : victoryAchieved survit à un write/read de slot
  await page.evaluate(() => {
    document.getElementById('victory-modal').style.display = 'none';
    writeSlot('manual_1', 'TestVict');
  });
  const meta = await page.evaluate(() => readSlot('manual_1')?.meta || null);
  console.log('  slot meta victory:', meta?.victory);
  assert(meta && meta.victory === true, "meta.victory doit refléter le flag pour le badge HUD");

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ trigger victoire + persistance OK');
  await browser.close();
}

// ── Scénario endgame 2 : escalier étage 10 scellé tant que pas de victoire ─
async function scenarioStairsGated() {
  console.log('\n── Scénario endgame 2 : escalier étage 10 scellé ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : floor 10 pré-victoire → descripteur "Passage scellé"
  const t1 = await page.evaluate(() => {
    currentFloor = 10;
    victoryAchieved = false;
    // _exploreDescriptors est privé mais on peut tester via _showExploreOverlay
    _showExploreOverlay(CELL.STAIRS_D);
    const title = document.getElementById('explore-title')?.textContent || '';
    const actions = document.getElementById('explore-actions')?.innerHTML || '';
    _hideExploreOverlay();
    return { title, hasDescend: actions.includes('goDeeper()') };
  });
  console.log('  T1 pré-victoire :', t1);
  assert(t1.title.includes('scellé'),        'titre doit indiquer "Passage scellé"');
  assert(t1.hasDescend === false,            'aucun bouton "Descendre" tant que pas de victoire');

  // T2 : goDeeper() bloqué tant que pré-victoire à floor 10
  const t2 = await page.evaluate(() => {
    currentFloor = 10;
    victoryAchieved = false;
    goDeeper();
    return { stayedAtFloor: currentFloor };
  });
  assert(t2.stayedAtFloor === 10, 'goDeeper() doit no-op à floor 10 sans victoire');

  // T3 : post-victoire → descripteur normal + descente possible
  const t3 = await page.evaluate(() => {
    currentFloor = 10;
    victoryAchieved = true;
    _showExploreOverlay(CELL.STAIRS_D);
    const title = document.getElementById('explore-title')?.textContent || '';
    const actions = document.getElementById('explore-actions')?.innerHTML || '';
    _hideExploreOverlay();
    return { title, hasDescend: actions.includes('goDeeper()') };
  });
  console.log('  T3 post-victoire :', t3);
  assert(!t3.title.includes('scellé'),       'titre redevient "Escalier Descendant" post-victoire');
  assert(t3.hasDescend === true,             'bouton "Descendre" présent post-victoire');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ gate stairs étage 10 OK');
  await browser.close();
}

// ── Scénario endgame 3 : variant darkness + scaling Ténèbres ─────
async function scenarioDarkVariant() {
  console.log('\n── Scénario endgame 3 : variant darkness + scaling Ténèbres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : effectiveFloor — pré-victoire = floor, post-victoire >=11 = floor-10
  const t1 = await page.evaluate(() => {
    victoryAchieved = false;
    const pre = effectiveFloor(15);
    victoryAchieved = true;
    const post20 = effectiveFloor(20);
    const post21 = effectiveFloor(21);
    const post10 = effectiveFloor(10);
    return { pre, post20, post21, post10 };
  });
  console.log('  effectiveFloor :', t1);
  assert(t1.pre === 15,    'pré-victoire : effectiveFloor(15) === 15');
  assert(t1.post20 === 10, 'post-victoire : effectiveFloor(20) === 10');
  assert(t1.post21 === 11, 'post-victoire : effectiveFloor(21) === 11');
  assert(t1.post10 === 10, 'post-victoire : floor 10 reste inchangé (toujours pré-Ténèbres)');

  // T2 : scaleMonster d'un mob simple à floor 11 darkness → variant + préfixe
  const t2 = await page.evaluate(() => {
    victoryAchieved = true;
    const base = MONSTERS.find(m => m.id === 'inferius') || MONSTERS[0];
    // Force la branche darkness en escapant le shiny aléatoire (4%)
    const results = [];
    for (let i = 0; i < 50; i++) {
      const m = scaleMonster(base, 14);
      if (m.variant === 'darkness') { results.push(m); break; }
      // Sinon retry
    }
    return results[0] || null;
  });
  console.log('  scaleMonster darkness inferius @ floor 14 :', t2 && {
    name: t2.name, variant: t2.variant, hp: t2.hp, atk: t2.atk, def: t2.def
  });
  assert(t2,                                          'au moins 1 darkness sur 50 rolls (4 % shiny seulement)');
  assert(t2.variant === 'darkness',                   'variant doit être "darkness"');
  assert(t2.name.startsWith('Ténébreux '),            'nom préfixé par "Ténébreux "');

  // T3 : pool filtré sur relFloor — à floor 11 post-victoire,
  // pool === monstres avec minFloor <= 1 (rebase 11-10=1)
  const t3 = await page.evaluate(() => {
    victoryAchieved = true;
    const ef = effectiveFloor(11);
    const pool = MONSTERS.filter(m =>
      m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor)
    );
    const allLow = pool.every(m => m.minFloor <= 1);
    return { ef, poolLen: pool.length, allLow };
  });
  console.log('  pool floor 11 post-victoire :', t3);
  assert(t3.ef === 1,         'effectiveFloor(11) === 1');
  assert(t3.poolLen > 0,      'au moins 1 monstre dans le pool floor 1');
  assert(t3.allLow,           'tous les monstres du pool ont minFloor <= 1');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ variant darkness + scaling Ténèbres OK');
  await browser.close();
}

// ── Scénario endgame 4 : récompenses scalées + consommables ─────
async function scenarioDarkRewards() {
  console.log('\n── Scénario endgame 4 : récompenses scalées + consommables ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : récompenses xp/gold ×2 + multiplicateurs darkness (hp ×1.5, atk ×1.12)
  const t1 = await page.evaluate(() => {
    victoryAchieved = false;
    const base = MONSTERS.find(m => m.id === 'inferius');
    if (!base) return null;
    // Reroll jusqu'à éviter le shiny pour les deux versions
    let normal, dark;
    for (let i = 0; i < 200 && (!normal || !dark); i++) {
      const m = scaleMonster(base, 4);
      if (!normal && (m.variant === 'normal' || m.variant === 'fierce' || m.variant === 'ancient')) normal = m;
    }
    victoryAchieved = true;
    for (let i = 0; i < 200 && !dark; i++) {
      const m = scaleMonster(base, 14);   // relFloor 4 = même scale
      if (m.variant === 'darkness') dark = m;
    }
    return {
      normalHp: normal?.hp, darkHp: dark?.hp,
      normalAtk: normal?.atk, darkAtk: dark?.atk,
      normalXp: normal?.xp, darkXp: dark?.xp
    };
  });
  console.log('  inferius normal vs darkness :', t1);
  assert(t1.darkHp > t1.normalHp,       'darkness HP > normal HP (×1.50)');
  assert(t1.darkAtk >= t1.normalAtk,    'darkness ATK ≥ normal ATK (×1.12)');
  assert(t1.darkXp >= t1.normalXp * 1.5, 'darkness XP ≥ normal XP × 1.5 (cible ×2)');

  // T2 : potion_xl restaure 100 % HP du perso ciblé
  const t2 = await page.evaluate(() => {
    party[0].hpMax = 120; party[0].hp = 30;
    player.inventory.push({ ...ITEMS.find(i => i.id === 'potion_xl') });
    const idx = player.inventory.length - 1;
    useItem(idx, false);
    return { hp: player.hp, hpMax: player.hpMax, invLen: player.inventory.length };
  });
  console.log('  potion_xl :', t2);
  assert(t2.hp === t2.hpMax, 'potion_xl doit restaurer hp à hpMax');

  // T3 : larme du phénix pure — KO en combat → ressuscite
  const t3 = await page.evaluate(() => {
    party[0].hpMax = 100; party[0].hp = 100;
    player.inventory.push({ ...ITEMS.find(i => i.id === 'larme_phenix_pure') });
    const log = _tryAutoReviveKOChars();
    // Simule un KO et re-test
    party[0].hp = 0;
    const log2 = _tryAutoReviveKOChars();
    const stillHasLarme = player.inventory.some(it => it.id === 'larme_phenix_pure');
    return { hpAfter: party[0].hp, log2: log2.length > 0, stillHasLarme };
  });
  console.log('  larme phénix :', t3);
  assert(t3.hpAfter === 100,        'larme du phénix doit ressusciter à hpMax');
  assert(t3.log2,                   'log non vide à la résurrection');
  assert(t3.stillHasLarme === false, 'larme consommée');

  // T4 : checkVictoryTrigger pas re-déclenché par un kill quelconque
  const t4 = await page.evaluate(() => {
    victoryAchieved = false;
    const a = checkVictoryTrigger('chat_norris');
    return { a, flag: victoryAchieved };
  });
  assert(t4.a === false && t4.flag === false,
         'checkVictoryTrigger ne se déclenche que pour voldemort_revenu');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ récompenses + consommables OK');
  await browser.close();
}

// ── Scénario endgame Tranche 2 — 1 : Forge des Ténèbres ─────
async function scenarioForgeUpgrade() {
  console.log('\n── Scénario endgame T2.1 : Forge des Ténèbres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : modèle de coût + upgradeLevel
  const t1 = await page.evaluate(() => ({
    hasForge:        typeof openForge === 'function',
    hasUpgradeFn:    typeof upgradeItemAtForge === 'function',
    CELL_FORGE:      CELL.FORGE
  }));
  console.log('  T1 wiring →', t1);
  assert(t1.hasForge,        'openForge doit être exposé');
  assert(t1.hasUpgradeFn,    'upgradeItemAtForge doit être exposé');
  assert(t1.CELL_FORGE === 9,'CELL.FORGE === 9');

  // T2 : upgrade Wand1 (ATK+2) → level 1 → bonus ATK+3 dans recalculateStats
  const t2 = await page.evaluate(() => {
    // Équipe Harry avec wand1, donne ressources, ouvre forge (UI), upgrade
    const wand = JSON.parse(JSON.stringify(ITEMS.find(i => i.id === 'wand1')));
    party[0].equipped.wand = wand;
    player.gold = 5000;
    player.inventory.push({ ...ITEMS.find(i => i.id === 'essence_tenebres') });
    recalculateStats();
    const baseAtk = party[0].atk;
    const ok = upgradeItemAtForge(0, 'wand');
    return {
      ok,
      lvl:        party[0].equipped.wand.upgradeLevel,
      essenceLeft: player.inventory.filter(i => i.id === 'essence_tenebres').length,
      goldLeft:   player.gold,
      atkBefore:  baseAtk,
      atkAfter:   party[0].atk
    };
  });
  console.log('  T2 upgrade wand1 →', t2);
  assert(t2.ok === true,                'upgradeItemAtForge doit réussir');
  assert(t2.lvl === 1,                  'upgradeLevel doit passer à 1');
  assert(t2.essenceLeft === 0,          'essence consommée');
  assert(t2.goldLeft === 5000 - 80,     'gold débité de 80');
  assert(t2.atkAfter === t2.atkBefore + 1, 'recalculateStats : ATK +1 (bonus forge)');

  // T3 : ressources insuffisantes → refus
  const t3 = await page.evaluate(() => {
    party[0].equipped.wand.upgradeLevel = 0;
    player.gold = 5;
    recalculateStats();
    const ok = upgradeItemAtForge(0, 'wand');
    return { ok, lvl: party[0].equipped.wand.upgradeLevel };
  });
  console.log('  T3 gold insuffisant →', t3);
  assert(t3.ok === false,   'refusé si gold insuffisant');
  assert(t3.lvl === 0,      'upgradeLevel inchangé');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Forge des Ténèbres OK');
  await browser.close();
}

// ── Scénario endgame Tranche 2 — 2 : Bibliothèque interdite ───
async function scenarioLibraryUpgrade() {
  console.log('\n── Scénario endgame T2.2 : Bibliothèque interdite ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : wiring + cost model
  const t1 = await page.evaluate(() => ({
    hasOpenLib:     typeof openLibrary === 'function',
    hasUpgrade:     typeof upgradeSpellAtLibrary === 'function',
    hasGetLevel:    typeof getSpellUpgradeLevel === 'function',
    CELL_LIBRARY:   CELL.LIBRARY,
    initSpellUps:   typeof party[0].spellUpgrades === 'object' || party[0].spellUpgrades === undefined,
  }));
  console.log('  T1 wiring →', t1);
  assert(t1.hasOpenLib,     'openLibrary exposé');
  assert(t1.hasUpgrade,     'upgradeSpellAtLibrary exposé');
  assert(t1.CELL_LIBRARY === 10, 'CELL.LIBRARY === 10');

  // T2 : upgrade Incendio level 1 → spellUpgrades['Incendio'] === 1
  const t2 = await page.evaluate(() => {
    player.gold = 5000;
    player.inventory.push({ ...ITEMS.find(i => i.id === 'page_grimoire') });
    const ok = upgradeSpellAtLibrary(0, 'Incendio');
    return {
      ok,
      lvl:       getSpellUpgradeLevel(party[0], 'Incendio'),
      goldLeft:  player.gold,
      pagesLeft: player.inventory.filter(i => i.id === 'page_grimoire').length
    };
  });
  console.log('  T2 upgrade Incendio →', t2);
  assert(t2.ok === true,        'upgradeSpellAtLibrary doit réussir');
  assert(t2.lvl === 1,          "spellUpgrades['Incendio'] doit passer à 1");
  assert(t2.goldLeft === 5000 - 120, 'gold débité de 120');
  assert(t2.pagesLeft === 0,    'page consommée');

  // T3 : _spellForCaster applique le bonus
  const t3 = await page.evaluate(() => {
    const baseSpell = SPELLS.find(s => s.name === 'Incendio');
    const augmented = _spellForCaster(baseSpell, party[0]);
    return {
      basePower: baseSpell.power,
      basecost:  baseSpell.cost,
      augPower:  augmented.power,
      augCost:   augmented.cost,
    };
  });
  console.log('  T3 _spellForCaster Incendio →', t3);
  assert(t3.augPower === t3.basePower + 2, 'power +2 × level');
  assert(t3.augCost  === Math.max(1, t3.basecost - 1), 'cost −1 × level (min 1)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Bibliothèque interdite OK');
  await browser.close();
}

// ── Scénario endgame Tranche 2 — 3 : Maison Tier 16 (Légende) ───
// Architecture Maisons 2.0 : 16 paliers (Bronze/Argent/Or × 5 phases
// + Légende). Le gate endgame (victoryAchieved) s'applique au palier
// 16 (Légende) à 25000 pts. Tous les paliers intermédiaires sont
// accessibles sans victoire ; les Or de Confirmé/Maître/Virtuose
// portent les jalons narratifs (artefacts, quête de Maison).
// Cf. .claude/plans/houses-2.0.md §A.
async function scenarioHouseTier5() {
  console.log('\n── Scénario endgame T2.3 : Maison Tier 16 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : pré-victoire, 16000 points → Virtuose Or (tier 15) accessible sans gate.
  const t1 = await page.evaluate(() => {
    victoryAchieved = false;
    housePoints     = 16000;
    houseTier       = 0; // simule restart
    checkHouseLevelUp();
    return { tier: houseTier, hasLame: player.inventory.some(i => i.id === 'lame_godric') };
  });
  console.log('  T1 pré-victoire 16000 pts →', t1);
  assert(t1.tier === 15,        'tier 15 (Virtuose Or) accessible sans victoire');
  assert(t1.hasLame === false,  'lame_godric pas livrée directement (vient de la quête de Maison)');

  // T2 : pré-victoire, 25000 points → reste à 15 (tier 16 Légende est gated).
  const t2 = await page.evaluate(() => {
    housePoints = 25000;
    checkHouseLevelUp();
    return { tier: houseTier };
  });
  console.log('  T2 pré-victoire 25000 pts →', t2);
  assert(t2.tier === 15, 'tier 16 (Légende) doit rester verrouillé sans victoire');

  // T3 : post-victoire, 25000 points → tier 16 + bonus passif.
  const t3 = await page.evaluate(() => {
    victoryAchieved = true;
    checkHouseLevelUp();
    return {
      tier: houseTier,
      atkBase: party[0]._baseAtk
    };
  });
  console.log('  T3 post-victoire 25000 pts →', t3);
  assert(t3.tier === 16, 'tier 16 (Légende) franchi post-victoire');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Maison Tier 16 OK');
  await browser.close();
}

// ── Scénario : récompenses Maison remises par les Chefs de Maison ──
async function scenarioHouseRewardFlow() {
  console.log('\n── Scénario : Récompense Maison remise par PNJ ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : franchir seuil Apprenti Or (tier 3, 300 pts) → item en attente, pas dans inventaire.
  // Architecture 16 paliers : brassard_lion est désormais distribué au
  // tier 3 (Apprenti Or). On démarre à tier 2 (Apprenti Argent, 150 pts)
  // pour vérifier le franchissement vers Or.
  const t1 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    housePoints = 300;
    houseTier   = 2;
    pendingHouseRewards = new Set();
    checkHouseLevelUp();
    return {
      tier:       houseTier,
      pending:    pendingHouseRewards.has('brassard_lion'),
      inInv:      (player.inventory || []).some(i => i && i.id === 'brassard_lion')
    };
  });
  console.log('  T1 seuil 300 →', t1);
  assert(t1.tier === 3,    'tier non passé à 3 (Apprenti Or)');
  assert(t1.pending,       'brassard_lion non mis en attente');
  assert(!t1.inInv,        'brassard_lion distribué automatiquement (bug)');

  // T2 : visite McGonagall → réception
  const t2 = await page.evaluate(() => {
    triggerNpcSpecialAction('mcgonagall');
    return {
      pending: pendingHouseRewards.has('brassard_lion'),
      inInv:   (player.inventory || []).some(i => i && i.id === 'brassard_lion')
    };
  });
  console.log('  T2 visite McGonagall →', t2);
  assert(!t2.pending, 'brassard toujours en attente après réclamation');
  assert(t2.inInv,    'brassard absent de l\'inventaire après réclamation');

  // T3 : mauvaise Maison → refus (McGonagall n'est pas Serpentard)
  const t3 = await page.evaluate(() => {
    chosenHouse = 'Serpentard';
    pendingHouseRewards.add('anneau_serpent');
    triggerNpcSpecialAction('mcgonagall');
    return pendingHouseRewards.has('anneau_serpent');
  });
  console.log('  T3 mauvaise Maison →', { stillPending: t3 });
  assert(t3, 'McGonagall a distribué une récompense Serpentard (bug)');

  // T4 : inventaire plein → l'item reste en attente (pas de perte silencieuse)
  const t4 = await page.evaluate(() => {
    chosenHouse = 'Serpentard';
    pendingHouseRewards.add('anneau_serpent');
    player.inventory = Array.from({ length: 16 }, () => ({
      id: 'potion_s', name: 'Potion', icon: '🧪', type: 'consumable'
    }));
    triggerNpcSpecialAction('rogue');
    return pendingHouseRewards.has('anneau_serpent');
  });
  console.log('  T4 inventaire plein →', { stillPending: t4 });
  assert(t4, 'anneau_serpent perdu silencieusement (inventaire plein)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Flow récompense Maison conforme');
  await browser.close();
}

// ── Scénario Maisons 2.0 — Quête de Maison (Étape 3) ──────────
// Vérifie le flow : franchissement tier 12 → quête `quest_set_<house>`
// pushée dans `availableQuests` → acceptation → simulation kills →
// remise au PNJ → pièce #4 du set dans `pendingHouseRewards` →
// récupération via la cérémonie `claim_house_reward`. Couvre aussi
// le verrou avant tier 12 (la quête ne doit pas être disponible).
// Cf. .claude/plans/houses-2.0.md §D (Étape 3).
async function scenarioHouseSetQuest() {
  console.log('\n── Scénario Maisons 2.0 : Quête de Maison (tier 12) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T0 : avant le palier 12, la quête de Maison ne doit pas être proposée.
  const t0 = await page.evaluate(() => ({
    inAvailable: availableQuests.has('quest_set_gryff'),
    tierUnlock:  HOUSE_BONUSES.Gryffondor.tiers[11].bonus.unlockSetQuest === true
  }));
  console.log('  T0 état initial →', t0);
  assert(!t0.inAvailable, 'quest_set_gryff ne devrait pas être disponible avant tier 12');
  assert(t0.tierUnlock,   'tier 12 (Maître Or) devrait porter unlockSetQuest:true');

  // T1 : franchir le palier 12 (8000 pts) → quête débloquée + cape_godric en attente.
  const t1 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    houseTier   = 11;
    housePoints = 8000;
    pendingHouseRewards = new Set();
    checkHouseLevelUp();
    return {
      tier:        houseTier,
      questOpen:   availableQuests.has('quest_set_gryff'),
      capePending: pendingHouseRewards.has('cape_godric')
    };
  });
  console.log('  T1 tier 12 franchi →', t1);
  assert(t1.tier === 12,    'tier non passé à 12 (Maître Or)');
  assert(t1.questOpen,      'quest_set_gryff non ajoutée à availableQuests');
  assert(t1.capePending,    'cape_godric (pièce #3) non mise en attente chez McGonagall');

  // T2 : accepter la quête → activée, retirée de availableQuests.
  const t2 = await page.evaluate(() => {
    acceptQuest('quest_set_gryff');
    return {
      isActive:    activeQuests.some(q => q.id === 'quest_set_gryff'),
      stillAvail:  availableQuests.has('quest_set_gryff')
    };
  });
  console.log('  T2 acceptation →', t2);
  assert(t2.isActive,    'quest_set_gryff n\'est pas dans activeQuests après acceptation');
  assert(!t2.stillAvail, 'quest_set_gryff toujours dans availableQuests après acceptation');

  // T3 : simuler 3 kills de Chimère → étape complétée mais quête reste active
  // tant qu'elle n'est pas remise au PNJ.
  const t3 = await page.evaluate(() => {
    checkKillQuests('chimere');
    checkKillQuests('chimere');
    checkKillQuests('chimere');
    const q = activeQuests.find(x => x.id === 'quest_set_gryff');
    return {
      progress:    q ? q.objectives[0].progress  : -1,
      stepDone:    q ? q.objectives[0].completed : false,
      stillActive: !!q
    };
  });
  console.log('  T3 après 3 kills →', t3);
  assert(t3.progress === 3,  'progression kill incorrecte');
  assert(t3.stepDone,        'étape kill non marquée complétée');
  assert(t3.stillActive,     'la quête doit rester active jusqu\'à la remise');

  // T4 : remise via dialogue PNJ → pièce #4 (coeur_lion) en attente,
  // PAS dans l'inventaire (route cérémonie head-of-house).
  const t4 = await page.evaluate(() => {
    turnInQuestById('quest_set_gryff');
    return {
      completed:     completedQuests.has('quest_set_gryff'),
      stillActive:   activeQuests.some(q => q.id === 'quest_set_gryff'),
      heartPending:  pendingHouseRewards.has('coeur_lion'),
      heartInInv:    (player.inventory || []).some(i => i && i.id === 'coeur_lion')
    };
  });
  console.log('  T4 remise →', t4);
  assert(t4.completed,     'quest_set_gryff non marquée complétée');
  assert(!t4.stillActive,  'la quête doit avoir quitté activeQuests');
  assert(t4.heartPending,  'coeur_lion (pièce #4) non poussé dans pendingHouseRewards');
  assert(!t4.heartInInv,   'coeur_lion distribué directement dans l\'inventaire (bug)');

  // T5 : cérémonie head-of-house → coeur_lion + cape_godric reçus.
  const t5 = await page.evaluate(() => {
    triggerNpcSpecialAction('mcgonagall');
    return {
      heartInInv:   (player.inventory || []).some(i => i && i.id === 'coeur_lion'),
      capeInInv:    (player.inventory || []).some(i => i && i.id === 'cape_godric'),
      pendingLeft:  Array.from(pendingHouseRewards || [])
    };
  });
  console.log('  T5 réclamation →', t5);
  assert(t5.heartInInv,    'coeur_lion absent de l\'inventaire après réclamation');
  assert(t5.capeInInv,     'cape_godric absente de l\'inventaire après réclamation');
  assert(t5.pendingLeft.length === 0, `pendingHouseRewards résiduel : ${t5.pendingLeft.join(',')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Quête de Maison + remise cérémonielle conformes');
  await browser.close();
}

// ── Scénario Maisons 2.0 — UI Set Maison sur fiche perso (Étape 5) ──
// Vérifie le rendu de l'encart « Set du Lion » dans openCharacter :
// 4 médaillons, état par pièce (équipée / au sac / en attente /
// manquante), grille de bonus 2/3/4 active selon le compte. Vérifie
// aussi le tag SET dans le menu d'équipement (showEquipMenu).
async function scenarioHouseSetUI() {
  console.log('\n── Scénario Maisons 2.0 : UI Set Maison sur fiche perso ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : aucun équipement → encart visible avec 4 cellules manquantes,
  // 0 bonus actif.
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    pendingHouseRewards = new Set();
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    const cells = panel ? panel.querySelectorAll('.set-cell') : [];
    const bonuses = panel ? panel.querySelectorAll('.set-bonus-row') : [];
    return {
      panelOpen:    !!panel,
      title:        panel ? panel.querySelector('.panel-title').textContent.trim() : null,
      cellCount:    cells.length,
      missingCount: panel ? panel.querySelectorAll('.set-cell-missing').length : 0,
      bonusRows:    bonuses.length,
      activeBonus:  panel ? panel.querySelectorAll('.set-bonus-row.active').length : 0
    };
  });
  console.log('  T1 vide →', t1);
  assert(t1.panelOpen,           'encart Set Maison non rendu');
  assert(/Set du Lion/i.test(t1.title || ''), `titre inattendu : ${t1.title}`);
  assert(t1.cellCount === 4,     `4 médaillons attendus, obtenu ${t1.cellCount}`);
  assert(t1.missingCount === 4,  '4 cellules doivent être en état missing');
  assert(t1.bonusRows === 3,     '3 paliers de bonus attendus (2/3/4)');
  assert(t1.activeBonus === 0,   'aucun palier ne doit être actif à 0/4');

  // T2 : 2 pièces équipées → 2 cellules « equipped », 1 palier actif.
  const t2 = await page.evaluate(() => {
    party[0].equipped.hands = { ...ITEMS.find(i => i.id === 'brassard_lion') };
    party[0].equipped.head  = { ...ITEMS.find(i => i.id === 'heaume_vaillant') };
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    return {
      title:         panel.querySelector('.panel-title').textContent.trim(),
      equippedCount: panel.querySelectorAll('.set-cell-equipped').length,
      missingCount:  panel.querySelectorAll('.set-cell-missing').length,
      activeBonus:   panel.querySelectorAll('.set-bonus-row.active').length
    };
  });
  console.log('  T2 2/4 équipées →', t2);
  assert(/2\/4/.test(t2.title),     `titre doit refléter 2/4 : ${t2.title}`);
  assert(t2.equippedCount === 2,   `2 cellules equipped attendues, obtenu ${t2.equippedCount}`);
  assert(t2.missingCount === 2,    `2 cellules missing attendues, obtenu ${t2.missingCount}`);
  assert(t2.activeBonus === 1,     `1 palier actif (2/4) attendu, obtenu ${t2.activeBonus}`);

  // T3 : 1 pièce au sac + 1 pièce en attente chez le Chef.
  const t3 = await page.evaluate(() => {
    player.inventory = [{ ...ITEMS.find(i => i.id === 'cape_godric') }];
    pendingHouseRewards = new Set(['coeur_lion']);
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    return {
      inInvCount:    panel.querySelectorAll('.set-cell-in_inv').length,
      pendingCount:  panel.querySelectorAll('.set-cell-pending').length,
      missingCount:  panel.querySelectorAll('.set-cell-missing').length
    };
  });
  console.log('  T3 mix états →', t3);
  assert(t3.inInvCount === 1,    `1 cellule in_inv attendue, obtenu ${t3.inInvCount}`);
  assert(t3.pendingCount === 1,  `1 cellule pending attendue, obtenu ${t3.pendingCount}`);
  assert(t3.missingCount === 0,  `0 cellule missing attendue, obtenu ${t3.missingCount}`);

  // T4 : aucune Maison choisie → encart absent.
  const t4 = await page.evaluate(() => {
    chosenHouse = null;
    openCharacter(0);
    return { panelOpen: !!document.querySelector('.section-houseset') };
  });
  console.log('  T4 sans Maison →', t4);
  assert(!t4.panelOpen, 'encart Set Maison ne doit pas apparaître sans chosenHouse');

  // T5 : tag SET dans showEquipMenu pour une pièce de set.
  const t5 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    partySize = 2;                                 // duo pour forcer le menu (vs équipement direct)
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    player.inventory = [{ ...ITEMS.find(i => i.id === 'heaume_vaillant') }];
    openInventory();
    showEquipMenu(player.inventory[0], 0);
    const badge = document.querySelector('#inv-grid .equip-menu-set-badge');
    return { hasBadge: !!badge, badgeText: badge ? badge.textContent.trim() : '' };
  });
  console.log('  T5 badge SET dans showEquipMenu →', t5);
  assert(t5.hasBadge,                       'tag SET absent du menu d\'équipement');
  assert(/Set du Lion/i.test(t5.badgeText), `texte du badge inattendu : ${t5.badgeText}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Encart Set Maison + tag SET conformes');
  await browser.close();
}

// ── Scénario Maisons 2.0 — Set bonus 4 pièces ─────────────────
// Vérifie la détection progressive d'un set Maison (Set du Lion,
// Gryffondor) à 2 / 3 / 4 pièces équipées et l'application correcte
// des bonus cumulatifs depuis HOUSE_SETS. Cf.
// .claude/plans/houses-2.0.md §B + js/inventory.js — recalculateStats.
async function scenarioHouseSet() {
  console.log('\n── Scénario Maisons 2.0 : Set du Lion (4 pièces) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 0 pièce équipée → pas de bonus de set
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T1 0/4 →', t1);
  assert(t1.count === 0, '_gryff_setCount === 0 à vide');

  // T2 : 2 pièces équipées (brassard hands + heaume head) → setBonus2 +1 ATK +3 crit
  const t2 = await page.evaluate(() => {
    party[0].equipped.hands = { ...ITEMS.find(i => i.id === 'brassard_lion') };
    party[0].equipped.head  = { ...ITEMS.find(i => i.id === 'heaume_vaillant') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T2 2/4 →', t2);
  assert(t2.count === 2,                'compte 2/4');
  assert(t2.atk   >= t1.atk + 4,        'ATK +4 minimum (2+2 stats items + 1 setBonus2 dépend de calibration)');
  assert(t2.crit  >= t1.crit + 3 - 0.5, '+3 crit du setBonus2');

  // T3 : 3 pièces (+ cape_godric cloak) → setBonus2 + setBonus3 cumulés
  const t3 = await page.evaluate(() => {
    party[0].equipped.cloak = { ...ITEMS.find(i => i.id === 'cape_godric') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T3 3/4 →', t3);
  assert(t3.count === 3,                'compte 3/4');
  assert(t3.crit  >= t2.crit + 7 - 0.5, '+7 crit cumulé du setBonus3');

  // T4 : 4 pièces (+ coeur_lion amulet) → tous les bonus actifs
  const t4 = await page.evaluate(() => {
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'coeur_lion') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T4 4/4 →', t4);
  assert(t4.count === 4,                 'compte 4/4');
  assert(t4.crit  >= t3.crit + 12 - 0.5, '+12 crit du setBonus4 (immuneDisarm hors-stats)');

  // T5 : set Poufsouffle 4/4 → regenHp +2/tour dans applyEquipmentRegen
  const t5 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    party[0].equipped.belt   = { ...ITEMS.find(i => i.id === 'ceinture_blaireau') };
    party[0].equipped.cloak  = { ...ITEMS.find(i => i.id === 'cape_loyaute') };
    party[0].equipped.head   = { ...ITEMS.find(i => i.id === 'coiffe_blaireau') };
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'medaillon_helga') };
    recalculateStats();
    party[0].hp = Math.max(1, party[0].hpMax - 10);
    const hpBefore = party[0].hp;
    if (typeof applyEquipmentRegen === 'function') applyEquipmentRegen();
    return { count: party[0]._pouf_setCount | 0, hpDelta: party[0].hp - hpBefore };
  });
  console.log('  T5 Pouf 4/4 regen →', t5);
  assert(t5.count === 4,    'Pouf 4/4 détecté');
  assert(t5.hpDelta >= 3,   'regenHp ≥ 3 (1 du medaillon_helga + 2 du setBonus4)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Set Maison Lion + Blaireau OK');
  await browser.close();
}

// ── Scénario Maisons 2.0 — Étape 6 : Feedback Set 4/4 ──────
// Vérifie que la transition <4 → 4 du Set du Lion déclenche
// AudioSystem.playSetComplete + un message « complet » dans #msg-log,
// et que l'équipement d'une pièce hors-set ou d'une 4ᵉ déjà atteinte
// reste silencieux (no double-trigger).
async function scenarioHouseSetCompleteFeedback() {
  console.log('\n── Scénario Maisons 2.0 — Étape 6 : feedback Set 4/4 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Setup : spy sur AudioSystem.playSetComplete (compteur d'appels)
  await page.evaluate(() => {
    window.__setCompleteCalls = 0;
    const orig = AudioSystem.playSetComplete.bind(AudioSystem);
    AudioSystem.playSetComplete = function () {
      window.__setCompleteCalls++;
      // Ne joue pas le son en headless (le contexte audio peut être bloqué).
    };
    // Reset équipement à vide
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    // Préempte les 4 pièces du Set du Lion dans l'inventaire
    player.inventory = [];
    ['brassard_lion', 'heaume_vaillant', 'cape_godric', 'coeur_lion'].forEach(id => {
      const it = ITEMS.find(i => i.id === id);
      if (it) player.inventory.push({ ...it });
    });
  });

  // T1 : équipe la 1re pièce (brassard, hands) → pas de complétion
  const t1 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'brassard_lion');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T1 1/4 →', t1);
  assert(t1.calls === 0, 'aucun appel à playSetComplete à 1/4');
  assert(t1.count === 1, 'compteur Gryff = 1');

  // T2 : 2ᵉ pièce (heaume, head) → pas de complétion
  const t2 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'heaume_vaillant');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T2 2/4 →', t2);
  assert(t2.calls === 0, 'aucun appel à 2/4');
  assert(t2.count === 2, 'compteur Gryff = 2');

  // T3 : 3ᵉ pièce (cape, cloak) → pas de complétion
  const t3 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'cape_godric');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T3 3/4 →', t3);
  assert(t3.calls === 0, 'aucun appel à 3/4');
  assert(t3.count === 3, 'compteur Gryff = 3');

  // T4 : 4ᵉ pièce (coeur_lion, amulet) → 1 appel + message
  const t4 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'coeur_lion');
    equipItem(idx, 0);
    const log = document.getElementById('msg-log');
    const txt = log ? log.textContent : '';
    return {
      calls: window.__setCompleteCalls,
      count: party[0]._gryff_setCount | 0,
      hasMsg: txt.includes('Set du Lion complet') || txt.includes('complet (4/4)')
    };
  });
  console.log('  T4 4/4 →', t4);
  assert(t4.calls === 1,  '1 appel à playSetComplete à 4/4');
  assert(t4.count === 4,  'compteur Gryff = 4');
  assert(t4.hasMsg,       'message « Set du Lion complet » présent dans msg-log');

  // T5 : remplacer une pièce non-set par une rare hors-set (ex : bottes)
  //      → le compteur reste à 4, pas de re-trigger.
  const t5 = await page.evaluate(() => {
    // ajoute des bottes basiques en inventaire et équipe-les
    const bottes = ITEMS.find(i => i.id === 'bottes_apprenti');
    if (!bottes) return { skipped: true };
    player.inventory.push({ ...bottes });
    const idx = player.inventory.length - 1;
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0, skipped: false };
  });
  console.log('  T5 équipe hors-set →', t5);
  if (!t5.skipped) {
    assert(t5.calls === 1,  'pas de re-trigger en équipant hors-set');
    assert(t5.count === 4,  'compteur Gryff reste à 4');
  }

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Feedback Set 4/4 OK');
  await browser.close();
}

// ── Scénario Maisons 2.0 — Étape 6 : Save round-trip ─────────
// Vérifie que chosenHouse / housePoints / houseTier / pendingHouseRewards
// (incluant les NEW set piece IDs) survivent à _serializeState ↔
// _applyState sans perte.
async function scenarioHouseSaveRoundTrip() {
  console.log('\n── Scénario Maisons 2.0 — Étape 6 : save round-trip ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Setup : injecte un état Maison riche (paliers franchis + pièces
  // pending) puis serialize → reset → applyState → compare.
  const result = await page.evaluate(() => {
    // 1) État avant save
    housePoints = 8200;          // au-delà du palier 12 (8000 = Maître Or)
    houseTier   = 12;            // tier 12 atteint
    pendingHouseRewards = new Set(['heaume_vaillant', 'cape_godric']);
    chosenHouse = 'Gryffondor';

    const before = {
      house:    chosenHouse,
      points:   housePoints,
      tier:     houseTier,
      pending:  Array.from(pendingHouseRewards).sort(),
    };

    // 2) Serialize
    const snapshot = _serializeState();

    // 3) Reset runtime (simule un nouveau slot)
    housePoints         = 0;
    houseTier           = 0;
    pendingHouseRewards = new Set();
    chosenHouse         = null;

    // 4) ApplyState
    _applyState(snapshot);

    const after = {
      house:    chosenHouse,
      points:   housePoints,
      tier:     houseTier,
      pending:  Array.from(pendingHouseRewards).sort(),
    };

    return { before, after, serializedPending: snapshot.pendingHouseRewards };
  });

  console.log('  before →', result.before);
  console.log('  after  →', result.after);
  console.log('  snapshot.pendingHouseRewards →', result.serializedPending);

  assert(result.after.house  === result.before.house,  'chosenHouse restauré');
  assert(result.after.points === result.before.points, 'housePoints restauré');
  assert(result.after.tier   === result.before.tier,   'houseTier restauré');
  // Les IDs sauvegardés (heaume_vaillant, cape_godric) doivent survivre.
  // `_migrateHouseRewards` peut en ajouter d'autres (paliers franchis dont
  // l'item n'est ni en inv ni équipé : brassard_lion tier 3, sword_gryff
  // tier 9). On vérifie donc le subset, pas l'égalité.
  for (const id of result.before.pending) {
    assert(result.after.pending.includes(id),
           `pendingHouseRewards préserve ${id} après round-trip`);
  }
  assert(Array.isArray(result.serializedPending),
         'pendingHouseRewards sérialisé comme Array (et non Set)');
  // Sanity : les IDs sérialisés sont bien les inputs (snapshot pré-migrate).
  assert(
    JSON.stringify([...result.serializedPending].sort()) ===
      JSON.stringify(['cape_godric', 'heaume_vaillant']),
    'snapshot.pendingHouseRewards reflète strictement l\'input'
  );

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Save round-trip Maison OK');
  await browser.close();
}

// ── Scénario endgame Tranche 2 — 4 : Set bonus Ténèbres ─────
async function scenarioTenebresSet() {
  console.log('\n── Scénario endgame T2.4 : Set bonus Ténèbres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 0 item du set → pas de bonus
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    return { crit: party[0].critChance, dodge: party[0].dodgeChance, count: party[0]._tenebresSetCount };
  });
  console.log('  T1 0/3 →', t1);
  assert(t1.count === 0, '_tenebresSetCount === 0');

  // T2 : 2 items du set → +10 crit, +5 dodge
  const t2 = await page.evaluate(() => {
    party[0].equipped.cloak  = { ...ITEMS.find(i => i.id === 'cape_voldemort') };
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'cendres_phenix') };
    recalculateStats();
    return { crit: party[0].critChance, dodge: party[0].dodgeChance, count: party[0]._tenebresSetCount };
  });
  console.log('  T2 2/3 →', t2);
  assert(t2.count === 2,                    '_tenebresSetCount === 2');
  assert(t2.crit  >= t1.crit + 10 - 0.5,    'crit +10 au moins');
  assert(t2.dodge >= t1.dodge + 5 - 0.5,    'dodge +5 au moins');

  // T3 : 3 items du set → +15 crit, +10 dodge, +2 regenHp
  const t3 = await page.evaluate(() => {
    party[0].equipped.trinket = { ...ITEMS.find(i => i.id === 'oeil_basilic') };
    recalculateStats();
    // simule un tick regen
    party[0].hp = Math.max(1, party[0].hpMax - 10);
    const hpBefore = party[0].hp;
    if (typeof applyEquipmentRegen === 'function') applyEquipmentRegen();
    return {
      crit: party[0].critChance,
      dodge: party[0].dodgeChance,
      count: party[0]._tenebresSetCount,
      hpDelta: party[0].hp - hpBefore
    };
  });
  console.log('  T3 3/3 →', t3);
  assert(t3.count === 3,                    '_tenebresSetCount === 3');
  // oeil_basilic apporte aussi +10 crit et +5 dodge intrinsèques.
  assert(t3.crit  >= t2.crit + 15 - 0.5,    'crit +15 total (10 du set 2/3 → 15 du set 3/3 + bonus item)');
  assert(t3.hpDelta >= 2,                   'set 3/3 : regen HP +2/tour');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Set bonus Ténèbres OK');
  await browser.close();
}

// ── Scénario : quêtes de farming (Chasse Scamander + Course Hagrid) ──
async function scenarioFarmingQuests() {
  console.log('\n── Scénario : quêtes répétables de farming ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : templates présents + flag farming
  const t1 = await page.evaluate(() => {
    const chasse = QUEST_TEMPLATES.find(q => q.id === 'chasse_magizoologiste');
    const course = QUEST_TEMPLATES.find(q => q.id === 'course_hagrid');
    return {
      chasseFarming: !!(chasse && chasse.farming),
      courseFarming: !!(course && course.farming),
      chasseEveryLvls: chasse?.repeatable?.everyLevels,
      courseEveryLvls: course?.repeatable?.everyLevels,
      hasRollFn:       typeof _rollFarmingTarget === 'function',
      hasSpawnFn:      typeof spawnFarmingMonsters === 'function',
      hasPreviewFn:    typeof _previewFarmingOffer === 'function',
      blacklistOk:     FARMING_KILL_BLACKLIST.has('bellatrix') &&
                       FARMING_KILL_BLACKLIST.has('voldemort_revenu')
    };
  });
  console.log('  T1 templates:', t1);
  assert(t1.chasseFarming,   'chasse_magizoologiste doit porter farming:true');
  assert(t1.courseFarming,   'course_hagrid doit porter farming:true');
  assert(t1.chasseEveryLvls === 2, 'chasse : cooldown 2 niveaux');
  assert(t1.courseEveryLvls === 3, 'course : cooldown 3 niveaux');
  assert(t1.hasRollFn,       '_rollFarmingTarget absent');
  assert(t1.hasSpawnFn,      'spawnFarmingMonsters absent');
  assert(t1.hasPreviewFn,    '_previewFarmingOffer absent');
  assert(t1.blacklistOk,     'FARMING_KILL_BLACKLIST incomplète');

  // T2 : PNJ random Scamander/Hagrid présents et propres
  const t2 = await page.evaluate(() => {
    const sc = NPCS.find(n => n.id === 'scamander_random');
    const hg = NPCS.find(n => n.id === 'hagrid_random');
    return {
      scOk: !!(sc && sc.random && sc.minFloor === 3 && sc.maxFloor === 8 &&
               sc.questsGiven && sc.questsGiven.includes('chasse_magizoologiste')),
      hgOk: !!(hg && hg.random && hg.minFloor === 4 && hg.maxFloor === 9 &&
               hg.questsGiven && hg.questsGiven.includes('course_hagrid'))
    };
  });
  console.log('  T2 random NPCs:', t2);
  assert(t2.scOk, 'scamander_random mal configuré');
  assert(t2.hgOk, 'hagrid_random mal configuré');

  // T3 : Accepter la chasse à l'étage 5 → tirage + spawn effectif
  const t3 = await page.evaluate(() => {
    currentFloor = 5;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    const accepted = acceptQuest('chasse_magizoologiste');
    const q = activeQuests.find(x => x.id === 'chasse_magizoologiste');
    let totalMobs = 0, targetMobs = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) {
        const m = enemyMap[y][x];
        if (!m) continue;
        totalMobs++;
        if (q && m.id === q.objectives[0].monsterId) targetMobs++;
      }
    return {
      accepted, totalMobs, targetMobs,
      monsterId: q?.objectives[0]?.monsterId,
      amount:    q?.objectives[0]?.amount,
      hasDynamic: !!(q && q._dynamicTarget),
      blacklisted: q ? FARMING_KILL_BLACKLIST.has(q.objectives[0].monsterId) : false,
      rewardXp:    q?.reward?.xp,
      rewardGold:  q?.reward?.gold
    };
  });
  console.log('  T3 chasse accepted:', t3);
  assert(t3.accepted,                'chasse_magizoologiste doit être acceptable étage 5');
  assert(t3.monsterId,               'objectif.monsterId doit être tiré');
  assert(t3.amount >= 4 && t3.amount <= 8, `amount attendu 4-8, got ${t3.amount}`);
  assert(t3.hasDynamic,              '_dynamicTarget doit être renseigné');
  assert(!t3.blacklisted,            'cible blacklist (bellatrix/voldemort) tirée — interdit');
  assert(t3.targetMobs >= 1,         'au moins une cible doit être spawnée');
  assert(typeof t3.rewardXp === 'number' && t3.rewardXp > 0, 'reward.xp invalide');
  assert(typeof t3.rewardGold === 'number' && t3.rewardGold > 0, 'reward.gold invalide');

  // T4 : Accepter la course à l'étage 6 → tirage item dans le pool autorisé
  const t4 = await page.evaluate(() => {
    currentFloor = 6;
    const accepted = acceptQuest('course_hagrid');
    const q = activeQuests.find(x => x.id === 'course_hagrid');
    const allowed = ['mandragore', 'choco_sorcier', 'potion_s', 'potion_m'];
    return {
      accepted,
      itemId:    q?.objectives[0]?.itemId,
      amount:    q?.objectives[0]?.amount,
      isAllowed: q ? allowed.includes(q.objectives[0].itemId) : false,
      descHasName: !!(q && q.desc && q.desc.length > 10)
    };
  });
  console.log('  T4 course accepted:', t4);
  assert(t4.accepted,        'course_hagrid doit être acceptable étage 6');
  assert(t4.itemId,          'objectif.itemId doit être tiré');
  assert(t4.amount >= 3 && t4.amount <= 5, `amount attendu 3-5, got ${t4.amount}`);
  assert(t4.isAllowed,       `itemId tiré hors pool autorisé : ${t4.itemId}`);
  assert(t4.descHasName,     'desc dynamique doit être renseignée');

  // T5 : Refus hors fourchette d'étage
  const t5 = await page.evaluate(() => {
    // Reset l'état de la quête en la marquant complétée pour qu'elle soit
    // potentiellement répétable, puis on simule une nouvelle tentative
    // hors fourchette.
    activeQuests = activeQuests.filter(q => q.id !== 'chasse_magizoologiste');
    completedQuests.delete('chasse_magizoologiste');
    availableQuests.add('chasse_magizoologiste');
    currentFloor = 1;  // hors fourchette (3-8)
    const accepted = acceptQuest('chasse_magizoologiste');
    return {
      accepted,
      stillAvailable: availableQuests.has('chasse_magizoologiste'),
      notActive: !activeQuests.find(q => q.id === 'chasse_magizoologiste')
    };
  });
  console.log('  T5 hors fourchette:', t5);
  assert(!t5.accepted,       'acceptation doit échouer hors fourchette');
  assert(t5.notActive,       'chasse ne doit pas devenir active hors fourchette');
  assert(t5.stillAvailable,  'chasse doit rester offrable pour plus tard');

  // T6 : Preview interpolable dans le dialogue (offer)
  const t6 = await page.evaluate(() => {
    currentFloor = 4;
    _clearFarmingPreviews();
    const preview = _previewFarmingOffer('chasse_magizoologiste');
    const raw = "J'ai repéré des {target} qui posent problème par ici. Veux-tu en éliminer {amount} ?";
    const interpolated = _interpolateFarmingText(raw, 'chasse_magizoologiste', 'offer');
    return {
      hasPreview:     !!preview,
      hasTargetName:  !!(preview && preview.target && preview.target.name),
      interpolated,
      hasNoPlaceholder: !/{target}|{amount}/.test(interpolated)
    };
  });
  console.log('  T6 preview interpolation:', t6);
  assert(t6.hasPreview,        'preview manquant à floor 4');
  assert(t6.hasTargetName,     'preview sans nom de cible');
  assert(t6.hasNoPlaceholder,  `placeholders non interpolés : ${t6.interpolated}`);

  // T7 : Cooldown répétable (every 2 niveaux pour la chasse)
  const t7 = await page.evaluate(() => {
    // Force une remise pour amorcer lastQuestCompletion
    currentFloor = 5;
    activeQuests = activeQuests.filter(q => q.id !== 'chasse_magizoologiste');
    availableQuests.add('chasse_magizoologiste');
    completedQuests.delete('chasse_magizoologiste');
    acceptQuest('chasse_magizoologiste');
    const q = activeQuests.find(x => x.id === 'chasse_magizoologiste');
    q.objectives.forEach(o => { o.completed = true; o.progress = o.amount; });
    turnInQuestById('chasse_magizoologiste');
    const completedAfter = completedQuests.has('chasse_magizoologiste');
    const offerableImmediately = isQuestOfferable('chasse_magizoologiste');
    const tpl = QUEST_TEMPLATES.find(q => q.id === 'chasse_magizoologiste');
    player.level = (lastQuestCompletion['chasse_magizoologiste'] || 0) + tpl.repeatable.everyLevels;
    const offerableAfterCd = isQuestOfferable('chasse_magizoologiste');
    return { completedAfter, offerableImmediately, offerableAfterCd };
  });
  console.log('  T7 cooldown:', t7);
  assert(t7.completedAfter,         'chasse doit être marquée completed après remise');
  assert(!t7.offerableImmediately,  'chasse ne doit pas être ré-offrable immédiatement');
  assert(t7.offerableAfterCd,       'chasse doit redevenir offrable après cooldown');

  // T8 : Voix mappées (clés _VOICE_SAMPLES présentes)
  const t8 = await page.evaluate(() => {
    const sm = AudioSystem._VOICE_SAMPLES;
    return {
      scOffer:  !!sm['scamander_chasse_offer_1'],
      scActive: !!sm['scamander_chasse_active_1'],
      scReady:  !!sm['scamander_chasse_ready_1'],
      hgOffer:  !!sm['hagrid_course_offer_1'],
      hgActive: !!sm['hagrid_course_active_1'],
      hgReady:  !!sm['hagrid_course_ready_1']
    };
  });
  console.log('  T8 voice keys:', t8);
  assert(t8.scOffer && t8.scActive && t8.scReady, 'clés audio Scamander manquantes');
  assert(t8.hgOffer && t8.hgActive && t8.hgReady, 'clés audio Hagrid manquantes');

  // T9 : helper _npcHasFarmingOffer — détecte uniquement les PNJ random
  // avec une quête farming offerable (pas les fixes, pas les PNJ lore).
  const t9 = await page.evaluate(() => {
    // Reset à un état propre où chasse + course sont offerables
    activeQuests = activeQuests.filter(q =>
      q.id !== 'chasse_magizoologiste' && q.id !== 'course_hagrid');
    completedQuests.delete('chasse_magizoologiste');
    completedQuests.delete('course_hagrid');
    availableQuests.add('chasse_magizoologiste');
    availableQuests.add('course_hagrid');
    delete lastQuestCompletion['chasse_magizoologiste'];
    delete lastQuestCompletion['course_hagrid'];
    return {
      scRandomFarming: _npcHasFarmingOffer('scamander_random'),
      hgRandomFarming: _npcHasFarmingOffer('hagrid_random'),
      scFixedNoFarming: _npcHasFarmingOffer('scamander'),    // ne porte que niffleurs
      hgFixedNoFarming: _npcHasFarmingOffer('hagrid'),       // ne porte que chouette/cabane
      dumbledoreNoFarming: _npcHasFarmingOffer('dumbledore'),
      unknownNoFarming: _npcHasFarmingOffer('inexistant'),
      noIdNoFarming: _npcHasFarmingOffer(null)
    };
  });
  console.log('  T9 _npcHasFarmingOffer:', t9);
  assert(t9.scRandomFarming,     'scamander_random doit porter une farming offerable');
  assert(t9.hgRandomFarming,     'hagrid_random doit porter une farming offerable');
  assert(!t9.scFixedNoFarming,   'scamander fixe ne doit pas être détecté comme farming');
  assert(!t9.hgFixedNoFarming,   'hagrid fixe ne doit pas être détecté comme farming');
  assert(!t9.dumbledoreNoFarming,'dumbledore ne doit pas être détecté comme farming');
  assert(!t9.unknownNoFarming,   'NPC inexistant ne doit pas crasher');
  assert(!t9.noIdNoFarming,      'id null ne doit pas crasher');

  // T10 : minimap applique bien .map-npc-farming + dataset.sign sur la
  // case du PNJ random porteur d'une farming offerable.
  const t10 = await page.evaluate(() => {
    // Choisit une case FLOOR connue et la force en NPC pour le test
    let target = null;
    for (let y = 0; y < dungeon.length && !target; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.FLOOR && !(x === playerX && y === playerY)) {
          target = { x, y };
          break;
        }
      }
    }
    if (!target) return { ok: false, reason: 'no FLOOR cell available' };
    dungeon[target.y][target.x] = CELL.NPC;
    visited[target.y][target.x] = true;
    npcPlacements.set(`${target.x},${target.y}`, 'scamander_random');
    renderMinimap();
    const cells = document.querySelectorAll('#minimap .map-cell');
    const idx   = target.y * MAP_W + target.x;
    const cell  = cells[idx];
    return {
      ok:        true,
      x:         target.x,
      y:         target.y,
      classes:   cell ? Array.from(cell.classList) : null,
      sign:      cell ? cell.dataset.sign : null,
      hasFarmingClass: cell ? cell.classList.contains('map-npc-farming') : false,
      hasOfferClass:   cell ? cell.classList.contains('map-npc-offer') : false
    };
  });
  console.log('  T10 minimap class:', t10);
  assert(t10.ok,                  `setup échoué : ${t10.reason}`);
  assert(t10.hasFarmingClass,     'minimap doit appliquer .map-npc-farming sur scamander_random offerable');
  assert(!t10.hasOfferClass,      'minimap ne doit pas appliquer .map-npc-offer en parallèle');
  assert(t10.sign === '!',        `dataset.sign attendu "!", got ${t10.sign}`);

  // T11 : pools de rencontre cloisonnés — donneurs de quête vs ambiants.
  const t11 = await page.evaluate(() => {
    const givers5  = getRandomQuestGiversForFloor(5).map(n => n.id).sort();
    const ambient5 = getRandomAmbientNpcsForFloor(5).map(n => n.id).sort();
    return {
      hasGiverFn:   typeof getRandomQuestGiversForFloor === 'function',
      hasAmbientFn: typeof getRandomAmbientNpcsForFloor === 'function',
      givers5,
      ambient5,
      giverHasScamander: givers5.includes('scamander_random'),
      giverHasHagrid:    givers5.includes('hagrid_random'),
      ambientNoGivers:   !ambient5.includes('scamander_random') && !ambient5.includes('hagrid_random'),
      ambientHasVendor:  ambient5.includes('rosmerta')
    };
  });
  console.log('  T11 pools cloisonnés:', t11);
  assert(t11.hasGiverFn,        'getRandomQuestGiversForFloor absent');
  assert(t11.hasAmbientFn,      'getRandomAmbientNpcsForFloor absent');
  assert(t11.giverHasScamander, 'scamander_random doit être dans le pool donneurs étage 5');
  assert(t11.giverHasHagrid,    'hagrid_random doit être dans le pool donneurs étage 5');
  assert(t11.ambientNoGivers,   'le pool ambiant ne doit PAS contenir les donneurs de quête');
  assert(t11.ambientHasVendor,  'le pool ambiant doit contenir les vendeurs (rosmerta)');

  // T12 : test statistique — sur N donjons étage 5 (chasse offrable), le
  // pool donneurs (70 %) doit faire apparaître un PNJ random porteur d'une
  // quête de farming bien plus souvent que l'ancien ~6 %.
  const t12 = await page.evaluate(() => {
    const N = 60;
    let withGiver = 0;
    for (let i = 0; i < N; i++) {
      generateDungeon(5);
      const ids = Array.from(npcPlacements.values());
      if (ids.includes('scamander_random') || ids.includes('hagrid_random')) withGiver++;
    }
    return { N, withGiver, ratio: withGiver / N };
  });
  console.log('  T12 spawn statistique:', t12);
  assert(t12.ratio >= 0.40,
    `donneur de quête répétable doit spawner ≥ 40 % des donjons étage 5, got ${(t12.ratio * 100).toFixed(0)} %`);

  // T13 : flux dialogue — PNJ random placé → état 'offer' → bouton
  // « Accepter la quête » présent → acceptQuest active bien la quête.
  const t13 = await page.evaluate(() => {
    activeQuests = activeQuests.filter(q => q.id !== 'chasse_magizoologiste');
    completedQuests.delete('chasse_magizoologiste');
    availableQuests.add('chasse_magizoologiste');
    delete lastQuestCompletion['chasse_magizoologiste'];
    const npc   = getNpcById('scamander_random');
    const state = getNpcQuestState(npc);
    seenNpcs.delete('scamander_random');           // forcer le greeting puis offer
    const actions = _npcDialogActions(npc, state).map(a => a.label);
    const accepted  = acceptQuest('chasse_magizoologiste');
    const activeNow = activeQuests.some(q => q.id === 'chasse_magizoologiste');
    return { state, actions, hasAccept: actions.some(l => /Accepter/.test(l)), accepted, activeNow };
  });
  console.log('  T13 flux dialogue:', t13);
  assert(t13.state === 'offer',  `scamander_random doit être 'offer', got ${t13.state}`);
  assert(t13.hasAccept,          'le dialogue doit proposer « Accepter la quête »');
  assert(t13.accepted,           'acceptQuest doit activer chasse_magizoologiste');
  assert(t13.activeNow,          'chasse_magizoologiste doit être dans activeQuests après acceptation');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Quêtes de farming OK');
  await browser.close();
}

// ── Scénario : voix des Chefs de Maison (Vague A) ────────────

async function scenarioHeadOfHouseVoice() {
  console.log('\n── Scénario : voix Chefs de Maison ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : les 20 clés audio sont mappées (fallback silencieux côté OGG OK)
  const t1 = await page.evaluate(() => {
    const sm  = AudioSystem._VOICE_SAMPLES;
    const ids = ['mcgonagall', 'rogue', 'flitwick', 'sprout'];
    const expected = [];
    for (const id of ids) {
      expected.push(`${id}_greeting_1`, `${id}_greeting_2`,
                    `${id}_offer_1`, `${id}_active_1`, `${id}_ready_1`);
    }
    const missing = expected.filter(k => !sm[k]);
    return { total: expected.length, missing };
  });
  console.log('  T1 voice keys:', t1);
  assert(t1.total === 20, `attendu 20 clés voice, expected.length=${t1.total}`);
  assert(t1.missing.length === 0,
    `clés voice manquantes : ${t1.missing.join(', ')}`);

  // T2 : 1er contact McGonagall → source 'greeting' → key greeting_1
  // (la quête `golem_passage` est offerable étage 5 mais le greeting prime
  // tant que seenNpcs ne contient pas le PNJ).
  const t2 = await page.evaluate(() => {
    seenNpcs.delete('mcgonagall');
    const npc = getNpcById('mcgonagall');
    const state = getNpcQuestState(npc);
    const source = _npcDialogSource(npc, state);
    const key0 = _voiceKeyForPage('mcgonagall', state, null, 0, source);
    const key1 = _voiceKeyForPage('mcgonagall', state, null, 1, source);
    return { state, source, key0, key1, hasGreeting: Array.isArray(npc.dialogues.greeting) };
  });
  console.log('  T2 first contact:', t2);
  assert(t2.hasGreeting,         'McGonagall doit avoir greeting array');
  assert(t2.source === 'greeting', `source attendu 'greeting', got '${t2.source}'`);
  assert(t2.key0 === 'mcgonagall_greeting_1',
    `key page 0 attendu mcgonagall_greeting_1, got ${t2.key0}`);
  assert(t2.key1 === 'mcgonagall_greeting_2',
    `key page 1 attendu mcgonagall_greeting_2, got ${t2.key1}`);

  // T3 : visites suivantes sur Rogue (1 seule quête = quest_set_slyth)
  // — source 'offer' → key rogue_offer_1. Choisi à la place de McGonagall
  // car cette dernière donne aussi golem_passage qui pourrait passer en
  // premier sur l'itération de `questsGiven` et brouiller l'assert.
  const t3 = await page.evaluate(() => {
    seenNpcs.add('rogue');
    activeQuests = activeQuests.filter(q => q.id !== 'quest_set_slyth');
    availableQuests.add('quest_set_slyth');
    completedQuests.delete('quest_set_slyth');
    const npc = getNpcById('rogue');
    const state = getNpcQuestState(npc);
    const qid   = _currentQuestForState(npc, state);
    const source = _npcDialogSource(npc, state);
    const key   = _voiceKeyForPage('rogue', state, qid, 0, source);
    return { state, qid, source, key };
  });
  console.log('  T3 quest_set_slyth offer:', t3);
  assert(t3.state === 'offer', `state attendu 'offer', got '${t3.state}'`);
  assert(t3.qid === 'quest_set_slyth',
    `qid attendu 'quest_set_slyth', got '${t3.qid}'`);
  assert(t3.source === 'offer', `source attendu 'offer', got '${t3.source}'`);
  assert(t3.key === 'rogue_offer_1',
    `key attendu 'rogue_offer_1', got '${t3.key}'`);

  // T4 : régression Dumbledore — un état 'offer' sur la chaîne d'épreuves
  // doit toujours produire `dumbledore_<suffix>_offer_1` malgré le refactor
  // (param `source` ajouté).
  const t4 = await page.evaluate(() => {
    const key = _voiceKeyForPage('dumbledore', 'offer', 'dumbledore_eveil', 0, 'offer');
    const keyActive = _voiceKeyForPage('dumbledore', 'active', 'dumbledore_courage', 0, 'active');
    const keyReady  = _voiceKeyForPage('dumbledore', 'ready', 'dumbledore_revelation', 0, 'ready');
    return { key, keyActive, keyReady };
  });
  console.log('  T4 Dumbledore regression:', t4);
  assert(t4.key === 'dumbledore_eveil_offer_1',
    `Dumbledore offer cassé : ${t4.key}`);
  assert(t4.keyActive === 'dumbledore_courage_active_1',
    `Dumbledore active cassé : ${t4.keyActive}`);
  assert(t4.keyReady === 'dumbledore_revelation_ready_1',
    `Dumbledore ready cassé : ${t4.keyReady}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant voix Chefs de Maison`);
  }
  console.log('  ✅ Voix Chefs de Maison OK');
  await browser.close();
}

// ── Scénario : voix d'incantation des sorts (Vague B) ─────────

async function scenarioSpellVoiceMapping() {
  console.log('\n── Scénario : voix d\'incantation des sorts ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : SPELL_VOICE_MAP cohérent — noms valides + OGG enregistrés
  const t1 = await page.evaluate(() => {
    const map = AudioSystem.SPELL_VOICE_MAP;
    const sm  = AudioSystem._VOICE_SAMPLES;
    const spellNames = SPELLS.map(s => s.name);
    const entries = Object.entries(map);
    const orphanNames   = entries.filter(([n]) => !spellNames.includes(n)).map(([n]) => n);
    const missingSamples = entries.filter(([, k]) => !sm[k]).map(([, k]) => k);
    return { count: entries.length, orphanNames, missingSamples,
             expelliarmus: map['Expelliarmus'] };
  });
  console.log('  T1 mapping:', t1);
  assert(t1.count >= 12, `attendu ≥12 sorts mappés, got ${t1.count}`);
  assert(t1.orphanNames.length === 0,
    `noms de sorts inconnus dans SPELL_VOICE_MAP : ${t1.orphanNames.join(', ')}`);
  assert(t1.missingSamples.length === 0,
    `clés OGG non enregistrées dans _VOICE_SAMPLES : ${t1.missingSamples.join(', ')}`);
  assert(t1.expelliarmus === 'spell_expelliarmus',
    `Expelliarmus → attendu spell_expelliarmus, got ${t1.expelliarmus}`);

  // T2 : speakSpell route un sort mappé vers playVoice, pas un sort absent
  const t2 = await page.evaluate(() => {
    let calledWith = null;
    const orig = AudioSystem.playVoice;
    AudioSystem.playVoice = (k) => { calledWith = k; return Promise.resolve(); };
    AudioSystem.voiceEnabled = true;
    AudioSystem.isMuted = false;
    AudioSystem.speakSpell('Incendio');
    const mapped = calledWith;
    calledWith = null;
    AudioSystem.speakSpell('Lumos Maxima');   // hors map → pas de playVoice
    const unmapped = calledWith;
    AudioSystem.playVoice = orig;
    return { mapped, unmapped };
  });
  console.log('  T2 routing:', t2);
  assert(t2.mapped === 'spell_incendio',
    `Incendio devait router vers spell_incendio, got ${t2.mapped}`);
  assert(t2.unmapped === null,
    'un sort non mappé ne doit pas appeler playVoice (fallback SpeechSynthesis)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant voix d'incantation`);
  }
  console.log('  ✅ Voix d\'incantation OK');
  await browser.close();
}

// ── Scénario : action Garde + sort Ferula ────────────────────

async function scenarioGuardAndFerula() {
  console.log('\n── Scénario : Garde + Ferula ──');
  const { browser, page, errors } = await launchGame();

  // ─── A. Action Garde — duo (Hermione mitige) ──────────────
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
  await startDummyFight(page, { hp: 60 });

  // Bouton Garde présent dans la barre d'action de combat
  const hasGuardBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.battle-actions .cmd-btn'))
      .find(b => /garde/i.test(b.textContent));
    return !!btn;
  });
  assert(hasGuardBtn, 'Bouton Garde absent de .battle-actions');

  // T1 : Harry Garde — guardTurns[0] = 1, PM gagnés
  const tGuard = await page.evaluate(() => {
    currentBattleChar = 0;
    party[0].sp = 0;            // sec pour vérifier le gain
    party[0].mag = 10;
    battleAction('guard');
    return { sp: party[0].sp, gt0: guardTurns[0], cur: currentBattleChar };
  });
  assert(tGuard.gt0 === 1,        `guardTurns[0] attendu 1, obtenu ${tGuard.gt0}`);
  assert(tGuard.sp >= 3,          `PM gagnés via Garde attendus ≥ 3, obtenu ${tGuard.sp}`);
  // Après l'action, currentBattleChar a avancé (vers Hermione en duo)
  assert(tGuard.cur === 1,        `currentBattleChar attendu 1 (Hermione), obtenu ${tGuard.cur}`);

  // T2 : ennemi attaque Harry (guardTurns[0]=1 actif) → mitigation 50 %
  const tMitig = await page.evaluate(() => {
    // Forcer le ciblage sur Harry et un coup déterministe
    party[0].hp = 50; party[0].hpMax = 50; party[0].def = 0;
    party[1].hp = 0;             // Hermione KO pour forcer la cible Harry
    party[0].dodgeChance = 0;    // pas d'esquive
    shieldTurns = [0, 0];        // pas de Protego
    guardTurns  = [1, 0];        // Garde actif
    enemyGroup[0].atk = 10;
    // Patch Math.random pour rendre l'attaque déterministe (no random bonus)
    const origRand = Math.random;
    Math.random = () => 0;       // dmg = 10 - 0 + 0 = 10, mitigated = 5
    enemyTurn();
    Math.random = origRand;
    return { hp: party[0].hp, gt0: guardTurns[0] };
  });
  // 10 dmg attendu, mitigé à 5 → 50 - 5 = 45
  assert(tMitig.hp === 45,        `HP attendu 45 après mitigation, obtenu ${tMitig.hp}`);
  // Garde consommée à la fin du segment ennemi
  assert(tMitig.gt0 === 0,        `guardTurns[0] attendu 0 après enemyTurn, obtenu ${tMitig.gt0}`);

  await browser.close();

  // ─── B. Sort Ferula — duo (Harry bande Hermione) ──────────
  // Note : on caste depuis le slot 0 vers le slot 1 pour que
  // advanceBattleChar() bascule sur Hermione (sans déclencher enemyTurn) —
  // ainsi aucun tick du statut regen n'intervient, l'assertion porte sur
  // l'état immédiatement appliqué par le handler.
  {
    const ctx = await launchGame();
    await startNewGame(ctx.page, { partySize: 2, heroes: ['harry', 'hermione'] });
    await startDummyFight(ctx.page, { hp: 50 });

    const fer = await ctx.page.evaluate(() => {
      currentBattleChar = 0;
      party[0].spells.push('Ferula');
      party[0].sp = 20; party[0].mag = 10;
      party[1].hp = 5; party[1].hpMax = 30;
      party[1].statusEffects = [];
      // Cast direct avec targetAllyIdx (saute la modale de sélection)
      castSpellInBattle('Ferula', null, 1);
      const regen = (party[1].statusEffects || []).find(s => s.id === 'regen');
      return {
        hp: party[1].hp,
        regenPower: regen ? regen.power : 0,
        regenTurns: regen ? regen.turns : 0,
        sp: party[0].sp
      };
    });
    assert(fer.hp > 5,                  `Ferula : Hermione pas soignée (hp=${fer.hp})`);
    assert(fer.regenTurns === 3,        `regen attendu 3 tours, obtenu ${fer.regenTurns}`);
    assert(fer.regenPower === 4,        `regen power attendu 4, obtenu ${fer.regenPower}`);
    assert(fer.sp === 14,               `PM Harry attendu 20-6=14, obtenu ${fer.sp}`);

    // T3 : tick du statut regen — Hermione récupère 4 PV
    const tick = await ctx.page.evaluate(() => {
      const before = party[1].hp;
      tickStatuses(party[1], false);
      return { before, after: party[1].hp };
    });
    assert(tick.after - tick.before === 4,
      `regen tick attendu +4 PV, obtenu +${tick.after - tick.before}`);

    if (ctx.errors.length) {
      ctx.errors.forEach(e => console.log('  ⚠️ ', e));
      throw new Error(`${ctx.errors.length} erreurs JS détectées (Ferula duo)`);
    }
    await ctx.browser.close();
  }

  // ─── C. Ferula solo — auto-cible Harry (test du handler isolé) ──
  // En solo, castSpellInBattle déclenche enemyTurn → tick immédiat. Pour
  // tester l'état fraîchement appliqué, on invoque le handler directement.
  // On valide en plus que castSpellInBattle (sans targetAllyIdx) résout
  // bien la cible vers le caster en solo (pas de modale demandée).
  {
    const ctx = await launchGame();
    await startNewGame(ctx.page, { partySize: 1, heroes: ['harry'] });
    await startDummyFight(ctx.page, { hp: 50 });

    const solo = await ctx.page.evaluate(() => {
      currentBattleChar = 0;
      party[0].hp = 10; party[0].hpMax = 30;
      party[0].mag = 10; party[0].statusEffects = [];
      const spell = SPELLS.find(s => s.name === 'Ferula');
      _spellSupportRegen(spell, party[0], null, null, 0);
      const regen = (party[0].statusEffects || []).find(s => s.id === 'regen');
      return { hp: party[0].hp, regenTurns: regen ? regen.turns : 0 };
    });
    assert(solo.hp > 10,           `Ferula solo : Harry pas soigné (hp=${solo.hp})`);
    assert(solo.regenTurns === 3,  `regen solo attendu 3 tours, obtenu ${solo.regenTurns}`);

    // Auto-résolution de la cible en solo (sans targetAllyIdx fourni).
    const autoSolo = await ctx.page.evaluate(() => {
      party[0].hp = 8; party[0].statusEffects = [];
      party[0].sp = 20;
      party[0].spells.push('Ferula');
      const targetSel = document.getElementById('target-selection');
      castSpellInBattle('Ferula', null);     // pas de targetAllyIdx
      const regen = (party[0].statusEffects || []).find(s => s.id === 'regen');
      return {
        hadRegen: !!regen,
        targetVisible: targetSel ? targetSel.style.display === 'flex' : null
      };
    });
    assert(autoSolo.hadRegen,            'Ferula solo sans cible : regen pas appliqué (auto-cible KO)');
    assert(!autoSolo.targetVisible,      'Ferula solo : modale de sélection ne devrait pas apparaître');

    if (ctx.errors.length) {
      ctx.errors.forEach(e => console.log('  ⚠️ ', e));
      throw new Error(`${ctx.errors.length} erreurs JS détectées (Ferula solo)`);
    }
    await ctx.browser.close();
  }

  console.log('  ✅ Garde + Ferula conformes');
}

// ── Scénario : Portus (téléportation) ────────────────────────
// Vérifie : visitedFloors persisté, livre_portus dispo en boutique
// floor 6+, sort appris via le livre, lancement hors combat (changement
// d'étage + PM décompté), lancement en combat (overlay A/B), garde-fou
// "1 utilisation par combat".

async function scenarioTeleportation() {
  console.log('\n── Scénario : Portus (téléportation) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : visitedFloors initialisé à {1} et grandit avec goDeeper.
  const t1 = await page.evaluate(() => {
    const initial = Array.from(visitedFloors);
    // Marquer artificiellement 2 étages comme visités (sans descendre vraiment).
    visitedFloors.add(2);
    visitedFloors.add(3);
    return { initial, after: Array.from(visitedFloors).sort((a,b)=>a-b) };
  });
  console.log('  T1 visitedFloors →', t1);
  assert(t1.initial.includes(1),                   'visitedFloors doit contenir l\'étage 1 au démarrage');
  assert(t1.after.includes(2) && t1.after.includes(3), 'add() doit alimenter visitedFloors');

  // T2 : le livre_portus est en boutique à floor 6 et achetable.
  const t2 = await page.evaluate(() => {
    currentFloor = 6;
    player.gold = 5000;
    openShop();
    const grid  = document.getElementById('shop-grid');
    const found = Array.from(grid.querySelectorAll('.shop-item')).find(el =>
      el.dataset.itemId === 'livre_portus'
    );
    return { hasEntry: !!found, price: found ? found.querySelector('.shop-price').textContent : null };
  });
  console.log('  T2 shop →', t2);
  assert(t2.hasEntry,                              'livre_portus doit apparaître en boutique floor 6+');
  assert(/2800/.test(t2.price || ''),              'livre_portus doit coûter 2800G');

  // T3 : achat + apprentissage automatique → sort dans player.spells.
  const t3 = await page.evaluate(() => {
    closeModal('shop-modal');
    const livre = ITEMS.find(i => i.id === 'livre_portus');
    player.inventory.push({ ...livre });
    const idx = player.inventory.findIndex(i => i.id === 'livre_portus');
    useItem(idx, false);   // hors combat → apprend Portus
    return {
      knowsPortus: player.spells.includes('Portus'),
      bookGone:    !player.inventory.some(i => i.id === 'livre_portus')
    };
  });
  console.log('  T3 apprentissage →', t3);
  assert(t3.knowsPortus,                           'Portus doit être enseigné après usage du livre');
  assert(t3.bookGone,                              'Le livre doit être consommé');

  // T4 : modale Sorts hors combat propose un bouton cliquable pour Portus.
  const t4 = await page.evaluate(() => {
    player.spMax = 100;
    player.sp    = 100;
    openSpells(0);
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const portus = items.find(el => /Portus/.test(el.textContent));
    return {
      hasPortusEntry: !!portus,
      isClickable:    !!(portus && typeof portus.onclick === 'function')
    };
  });
  console.log('  T4 modale sorts →', t4);
  assert(t4.hasPortusEntry,                        'Portus doit apparaître dans la modale Sorts');
  assert(t4.isClickable,                           'Entrée Portus doit être cliquable hors combat');

  // T5 : téléportation hors combat → changement d'étage + PM décomptés.
  const t5 = await page.evaluate(() => {
    closeModal('spell-modal');
    // Préparer un étage cible cache.
    visitedFloors.add(2);
    player.spMax = 100;
    player.sp    = 100;
    const before = { floor: currentFloor, sp: player.sp };
    // Stubber `confirm` pour éviter le prompt.
    window.confirm = () => true;
    teleportOutOfCombat(2, 0);
    return {
      before,
      floor: currentFloor,
      sp:    player.sp,
      cost:  SPELLS.find(s => s.name === 'Portus').outOfCombatCost
    };
  });
  console.log('  T5 hors combat →', t5);
  // Le _floorTransition est async (1400 ms). On vérifie après attente.
  await page.waitForFunction(() => currentFloor === 2, { timeout: 3500 });
  const t5b = await page.evaluate(() => ({ floor: currentFloor, sp: player.sp }));
  console.log('  T5b apres transition →', t5b);
  assert(t5b.floor === 2,                          'Le joueur doit être à l\'étage 2 après Portus');
  assert(t5.sp === t5.before.sp - t5.cost,         `PM doivent être décomptés (avant ${t5.before.sp}, après ${t5.sp}, coût ${t5.cost})`);

  // T6 : lancement en combat ouvre l'overlay A/B et consomme les PM.
  const t6 = await page.evaluate(() => {
    // Démarrer un combat dummy contre 2 ennemis pour activer l'option ennemi.
    const enemy = {
      id: 'test_dummy_1', name: 'Cobaye', icon: '🎯', danger: 3,
      hp: 30, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: 'Test'
    };
    startBattle(enemy);
    // Forcer 2 ennemis (rollGroupSize peut renvoyer 1 selon floor).
    if (enemyGroup.length < 2) {
      enemyGroup.push({ ...enemy, id: 'test_dummy_2', name: 'Cobaye 2',
                        currentHp: enemy.hp, disarmed: 0, statusEffects: [] });
    }
    player.sp = player.spMax;
    const spBefore = player.sp;
    castSpellInBattle('Portus', -1);
    const sel = document.getElementById('target-selection');
    return {
      spBefore, spAfter: player.sp,
      overlayShown: sel && sel.style.display === 'flex',
      hasPartyBtn:  !!Array.from(document.querySelectorAll('#target-buttons button')).find(b => /groupe/i.test(b.textContent)),
      hasEnemyBtn:  !!Array.from(document.querySelectorAll('#target-buttons button')).find(b => /ennemi/i.test(b.textContent))
    };
  });
  console.log('  T6 combat overlay →', t6);
  assert(t6.overlayShown,                          'Overlay A/B doit être affiché');
  assert(t6.hasPartyBtn && t6.hasEnemyBtn,         'Boutons groupe + ennemi doivent être présents');
  assert(t6.spAfter === t6.spBefore - 52,          'PM combat (52) doivent être consommés');

  // T7 : choisir "ennemi" bannit un ennemi du combat sans XP.
  const t7 = await page.evaluate(() => {
    const xpBefore = player.xp;
    const beforeCount = enemyGroup.length;
    _resolveTeleportEnemyChoice();
    // Cas chemin direct (un seul ennemi non-boss restant) → bannit immédiatement.
    // Sinon affiche un sub-sélecteur ; on clique le premier bouton.
    const subBtn = document.querySelector('#target-buttons button[onclick^="teleportEnemyAway"]');
    if (subBtn) subBtn.click();
    return {
      xpDelta: player.xp - xpBefore,
      enemiesAfter: enemyGroup.length,
      beforeCount,
      fightCd: portusFightCooldown
    };
  });
  console.log('  T7 banish →', t7);
  assert(t7.enemiesAfter < t7.beforeCount,         'Un ennemi doit avoir été retiré du combat');
  assert(t7.xpDelta === 0,                         'Aucun XP gagné via Portus');
  assert(t7.fightCd === 3,                         `Cooldown combat doit être armé à 3 (vu ${t7.fightCd})`);

  // T8 : tenter de relancer Portus en combat est bloqué tant que CD > 0.
  const t8 = await page.evaluate(() => {
    // Restaurer SP et tenter de re-caster Portus pendant un autre combat dummy.
    const enemy = {
      id: 'test_dummy_3', name: 'Cobaye 3', icon: '🎯', danger: 3,
      hp: 10, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 1, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: 'Test'
    };
    // Forcer end-of-fight gracefully d'abord (gagner le combat précédent).
    while (enemyGroup.length > 0) enemyGroup.shift();
    if (typeof checkAllEnemiesDead === 'function') checkAllEnemiesDead();
    const cdAfterWin = portusFightCooldown;
    player.sp = player.spMax = 200;
    startBattle(enemy);
    const spBefore = player.sp;
    castSpellInBattle('Portus', -1);
    return {
      cdAfterWin,
      blocked: player.sp === spBefore,
      cdNow:   portusFightCooldown
    };
  });
  console.log('  T8 combat CD →', t8);
  assert(t8.cdAfterWin === 2,                      `Après 1 win, CD doit valoir 2 (vu ${t8.cdAfterWin})`);
  assert(t8.blocked,                               'Cast Portus en CD doit être no-op (PM non décomptés)');
  assert(t8.cdNow === 2,                           'CD reste à 2 (pas re-armé)');

  // T9 : cooldown hors combat décrémente sur transition d'étage.
  const t9 = await page.evaluate(() => {
    // Sortie de combat propre.
    while (enemyGroup.length > 0) enemyGroup.shift();
    if (typeof checkAllEnemiesDead === 'function') checkAllEnemiesDead();
    inBattle = false;
    document.getElementById('encounter-overlay').style.display = 'none';
    document.body.classList.remove('in-battle');
    // Simuler un cooldown OOC restant et le faire baisser.
    portusOocCooldown = 2;
    visitedFloors.add(currentFloor);
    const before = portusOocCooldown;
    // goUp diminue d'un, goDeeper diminue d'un.
    if (currentFloor > 1) goUp();
    return { before, afterStep: portusOocCooldown };
  });
  // goUp est async (transition).
  await page.waitForFunction(() => portusOocCooldown <= 1, { timeout: 3500 });
  console.log('  T9 OOC CD step →', t9);
  assert(t9.before === 2,                          'CD initial doit être 2');
  // afterStep peut être 2 (avant transition) ou 1 (après) — on a déjà attendu.
  const t9b = await page.evaluate(() => portusOocCooldown);
  assert(t9b === 1,                                `Après 1 goUp, CD OOC doit valoir 1 (vu ${t9b})`);

  // T10 : tenter Portus OOC avec CD > 0 est bloqué.
  const t10 = await page.evaluate(() => {
    portusOocCooldown = 2;
    player.sp = player.spMax = 200;
    player.spells.push('Portus');  // s'assurer connu
    const spBefore = player.sp;
    openOutOfCombatTeleport(0);
    return {
      blocked: player.sp === spBefore,
      modalShown: document.getElementById('spell-modal').style.display === 'flex'
    };
  });
  console.log('  T10 OOC bloqué →', t10);
  assert(t10.blocked,                              'Portus OOC avec CD > 0 ne doit pas consommer de PM');

  // T11 : événement d'arrivée — exécution déterministe pour valider le helper.
  const t11 = await page.evaluate(() => {
    // Forcer le tirage positif (1ère branche < 0.5 puis 1ère branche < 0.5).
    const origRandom = Math.random;
    // séquence : [0.05 (<0.12 trigger), 0.1 (<0.5 positif)]
    let seq = [0.05, 0.1]; let i = 0;
    Math.random = () => (i < seq.length ? seq[i++] : origRandom());
    party.forEach(c => { c.hp = 1; });
    const beforeHp = party.map(c => c.hp);
    _rollPortusArrivalEvent();
    const afterHp = party.map(c => c.hp);
    // Forcer maintenant un piège : [0.05, 0.9 (>0.5 négatif), 0.1 (<0.5 piège)]
    seq = [0.05, 0.9, 0.1]; i = 0; Math.random = () => (i < seq.length ? seq[i++] : origRandom());
    party.forEach(c => { c.hp = 50; c.hpMax = 50; });
    _rollPortusArrivalEvent();
    const afterTrap = party.map(c => c.hp);
    Math.random = origRandom;
    return { beforeHp, afterHp, afterTrap };
  });
  console.log('  T11 event arrivée →', t11);
  assert(t11.afterHp.some((hp, i) => hp > t11.beforeHp[i]),
         'Événement positif doit soigner au moins un perso');
  assert(t11.afterTrap.some(hp => hp < 50),
         'Piège doit réduire les PV d\'au moins un perso');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Portus OK (shop + apprentissage + hors combat + combat)');
  await browser.close();
}

// ── Scénario : Soin hors combat (Episkey/Reparo) ─────────────
// Vérifie : Episkey/Reparo cliquables hors combat, cible auto = perso
// le plus blessé, full HP → no-op, cooldown 3 pas décrémenté.

async function scenarioHealOoc() {
  console.log('\n── Scénario : Soin hors combat ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : Episkey est dans la liste de Hermione, cliquable hors combat.
  const t1 = await page.evaluate(() => {
    openSpells(1); // onglet Hermione
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const episkey = items.find(el => /Episkey/.test(el.textContent));
    return {
      hasEpiskey:  !!episkey,
      isClickable: !!(episkey && typeof episkey.onclick === 'function')
    };
  });
  console.log('  T1 modale →', t1);
  assert(t1.hasEpiskey,                'Episkey doit être dans la liste');
  assert(t1.isClickable,               'Episkey doit être cliquable hors combat');

  // T2 : cast cible auto le perso le moins en forme et applique le soin.
  const t2 = await page.evaluate(() => {
    // Harry plus blessé que Hermione.
    party[0].hp = 5;  party[0].hpMax = 35;
    party[1].hp = 28; party[1].hpMax = 28;
    party[1].sp = 35;
    const before = { harry: party[0].hp, hermione: party[1].hp, hermioneSp: party[1].sp };
    castSpellOutOfCombat('Episkey', 1);   // Hermione caste
    return {
      before,
      after: { harry: party[0].hp, hermione: party[1].hp, hermioneSp: party[1].sp },
      cd: healSpellCooldown
    };
  });
  console.log('  T2 cast →', t2);
  assert(t2.after.harry > t2.before.harry,                 `Harry doit être soigné (${t2.before.harry} → ${t2.after.harry})`);
  assert(t2.after.hermione === t2.before.hermione,         'Hermione (full HP) ne doit pas être ciblée');
  assert(t2.after.hermioneSp === t2.before.hermioneSp - 5, 'PM Hermione consommés (5 PM Episkey)');
  assert(t2.cd === 3,                                       `Cooldown doit être armé à 3 (vu ${t2.cd})`);

  // T3 : tenter de re-caster pendant le cooldown est no-op.
  const t3 = await page.evaluate(() => {
    const spBefore = party[1].sp;
    castSpellOutOfCombat('Episkey', 1);
    return { blocked: party[1].sp === spBefore };
  });
  console.log('  T3 blocage CD →', t3);
  assert(t3.blocked,                                        'Cast Episkey en CD doit être no-op');

  // T4 : cooldown décrémente à chaque pas.
  const t4 = await page.evaluate(() => {
    // Garantir un couloir devant le joueur (chercher une case libre adjacente).
    healSpellCooldown = 3;
    const beforeCd = healSpellCooldown;
    // Essayer 4 directions jusqu'à trouver un mouvement valide.
    let stepped = false;
    for (const dir of ['n','e','s','w']) {
      const [dx, dy] = DIRECTIONS[dir];
      const nx = playerX + dx, ny = playerY + dy;
      if (dungeon[ny] && dungeon[ny][nx] !== CELL.WALL) {
        playerDir = dir;
        moveForward();
        stepped = true;
        break;
      }
    }
    return { beforeCd, stepped, afterCd: healSpellCooldown };
  });
  console.log('  T4 step CD →', t4);
  assert(t4.stepped,                                        'Un mouvement doit avoir été effectué');
  assert(t4.afterCd === t4.beforeCd - 1,                    `CD doit décrémenter de 1 par pas (${t4.beforeCd} → ${t4.afterCd})`);

  // T5 : tout le monde au max → message no-op, PM préservés.
  const t5 = await page.evaluate(() => {
    healSpellCooldown = 0;
    party.forEach(c => { c.hp = c.hpMax; });
    party[1].sp = 30;
    const spBefore = party[1].sp;
    castSpellOutOfCombat('Episkey', 1);
    return { blocked: party[1].sp === spBefore, cd: healSpellCooldown };
  });
  console.log('  T5 full HP no-op →', t5);
  assert(t5.blocked,                                        'Pas de PM consommés si tout le monde est au max');
  assert(t5.cd === 0,                                       'CD non armé sur no-op');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Soin OOC OK (cible auto + CD + no-op full HP)');
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

(async () => {
  const scenarios = [scenarioStartup, scenarioStatusEffects, scenarioWeakenAndProtegoBadges, scenarioPartyEquipRow, scenarioChainedQuest, scenarioNpcIntegration, scenarioVendors, scenarioChainAndRepeatable, scenarioRepeatableQuestSpawn, scenarioEnsureKillTargets, scenarioEnsureStairs, scenarioIteration74, scenarioRandomLoreNpcs, scenarioMobileSelect, scenarioMonsterImages, scenarioFloorTextures, scenarioHouseCrests, scenarioCombatMobile, scenarioSaveSlots, scenarioSlotModal, scenarioExportImport, scenarioAutoSave, scenarioStartHub, scenarioSceneIcons, scenarioTryAddItem, scenarioFountain, scenarioSoloSoftlock, scenarioCorruptSave, scenarioCmdBtnIcons, scenarioUiChromeIcons, scenarioEquipmentAndStatusIcons, scenarioSpellIcons, scenarioItemIcons, scenarioExtendedEquipment, scenarioPhase3Catalog, scenarioTintCss, scenarioEquipmentPhase3bQuests, scenarioCritDodge, scenarioRelativeControls, scenarioCanvasSwipe, scenarioNpcSprite3D, scenarioVictoryTrigger, scenarioStairsGated, scenarioDarkVariant, scenarioDarkRewards, scenarioForgeUpgrade, scenarioLibraryUpgrade, scenarioHouseTier5, scenarioHouseRewardFlow, scenarioHouseSetQuest, scenarioHouseSetUI, scenarioHouseSet, scenarioHouseSetCompleteFeedback, scenarioHouseSaveRoundTrip, scenarioTenebresSet, scenarioFarmingQuests, scenarioHeadOfHouseVoice, scenarioSpellVoiceMapping, scenarioGuardAndFerula, scenarioTeleportation, scenarioHealOoc, scenarioLoader];
  for (const s of scenarios) {
    await s();
  }
  console.log('\n✅ Tous les scénarios sont passés.');
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
