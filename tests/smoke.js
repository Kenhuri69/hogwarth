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
      || text.includes('Failed to load resource');
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
async function startNewGame(page, { partySize = 1, heroes = ['harry'], house = 'Gryffondor' } = {}) {
  await page.evaluate((opts) => {
    selectedPartySize = opts.partySize;
    selectedHeroes    = opts.heroes;
    confirmHeroSelection();
    chooseHouse(opts.house);
  }, { partySize, heroes, house });

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

  // T1 : applyStatus pose le statut + pilule rendue
  const t1 = await page.evaluate(() => {
    const e = enemyGroup[0];
    const before = e.currentHp;
    applyStatus(e, 'burn', 5, 2);
    renderEnemyGroup();
    const pill = document.querySelector('.enemy-card .status-pill');
    return {
      before,
      statusId:    e.statusEffects[0]?.id,
      statusTurns: e.statusEffects[0]?.turns,
      pillText:    pill ? pill.textContent.trim() : null
    };
  });
  console.log('  T1 apply :', t1);
  assert(t1.statusId === 'burn',           'applyStatus n\'a pas posé burn');
  assert(t1.pillText && t1.pillText.includes('🔥'), 'pilule 🔥 absente');
  assert(t1.pillText.includes('2'),        'compteur turns absent');

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

  // T1 : la quête lumiere_desespoir existe avec 2 étapes pendantes
  const t1 = await page.evaluate(() => {
    const q = activeQuests.find(x => x.id === 'lumiere_desespoir');
    return {
      exists:       !!q,
      stepCount:    q?.objectives.length,
      step0Type:    q?.objectives[0]?.type,
      step0Monster: q?.objectives[0]?.monsterId,
      step1Type:    q?.objectives[1]?.type,
      step1Item:    q?.objectives[1]?.itemId
    };
  });
  console.log('  T1 quest:', t1);
  assert(t1.exists,                           'quête lumiere_desespoir absente');
  assert(t1.stepCount === 2,                  'doit avoir 2 étapes');
  assert(t1.step0Type === 'kill',             'étape 0 doit être un kill');
  assert(t1.step0Monster === 'dementeur',     'étape 0 doit cibler dementeur');
  assert(t1.step1Type === 'item',             'étape 1 doit être un item');
  assert(t1.step1Item === 'choco_sorcier',    'étape 1 doit cibler choco_sorcier');

  // T2 : simuler kill du Détraqueur → étape 1 progresse + complète
  const t2 = await page.evaluate(() => {
    checkKillQuests('dementeur');
    const q = activeQuests.find(x => x.id === 'lumiere_desespoir');
    return {
      step0Done: q.objectives[0].completed,
      step0Prog: q.objectives[0].progress,
      step1Done: q.objectives[1].completed,
      questDone: q.completed
    };
  });
  console.log('  T2 kill :', t2);
  assert(t2.step0Done,        'étape 0 non marquée comme complétée');
  assert(t2.step0Prog === 1,  'progression étape 0 attendue à 1');
  assert(!t2.step1Done,       'étape 1 ne doit pas être complétée');
  assert(!t2.questDone,       'quête ne doit pas être complétée (étape item à faire)');

  // T3 : ajouter un choco au sac, remettre la quête → étape 1 OK + Patronum appris
  const t3 = await page.evaluate(() => {
    const choco = ITEMS.find(i => i.id === 'choco_sorcier');
    player.inventory.push({ ...choco });
    const idx = activeQuests.findIndex(x => x.id === 'lumiere_desespoir');
    checkQuestCompletion(idx);
    const q = activeQuests[idx];
    return {
      step1Done:   q.objectives[1].completed,
      questDone:   q.completed,
      patronumLearned: party[0].spells.includes('Patronum'),
      chocoConsumed:   !player.inventory.some(i => i.id === 'choco_sorcier')
    };
  });
  console.log('  T3 deliver:', t3);
  assert(t3.step1Done,         'étape 1 non complétée après remise');
  assert(t3.questDone,         'quête non finalisée');
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

  // Tous les monstres avec imgSrc doivent retomber sur un <img> en combat
  const ids = ['sorciere_tenebres', 'dementor_garde', 'voldemort_affaibli',
               'voldemort_revenu', 'basilic', 'nagini'];

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
    console.log(`  ${id} →`, t);
    assert(t.hasImgSrc,             `${id} sans imgSrc`);
    assert(t.usesImg && !t.usesSvg, `${id} ne rend pas un <img>`);
    assert(t.src && t.src.endsWith(`${id}.png`), `${id} src incorrect: ${t.src}`);
  }

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

  // Vérifier que le fichier PNG est bien chargeable (pas 404 silencieux)
  const loaded = await page.evaluate(() => new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ ok: true,  w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ ok: false });
    img.src = 'img/monsters/sorciere_tenebres.png';
  }));
  console.log('  PNG chargeable :', loaded);
  assert(loaded.ok && loaded.w >= 256, 'PNG sorciere_tenebres introuvable ou trop petit');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ portraits raster conformes');
  await browser.close();
}

// ── Scénario 6 : addLog robuste sans #event-log dans le DOM ──

async function scenarioAddLogGuard() {
  console.log('\n── Scénario 6 : addLog tolère #event-log absent ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : appel direct ne lève rien et ne mute pas le DOM
  const t1 = await page.evaluate(() => {
    const before = document.getElementById('event-log');
    let threw = false;
    try { addLog('test direct sans crash'); } catch (e) { threw = true; }
    return { threw, eventLogExists: !!before };
  });
  console.log('  T1 direct  :', t1);
  assert(!t1.threw,            'addLog a levé une exception malgré le garde-fou');
  assert(!t1.eventLogExists,   'le DOM contient désormais #event-log : test obsolète');

  // T2 : déclenche un combat complet → addLog est appelé plusieurs fois
  await page.evaluate(() => {
    const enemy = {
      id: 'log_dummy', name: 'Log Dummy', icon: '🎯',
      hp: 1, atk: 0, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 5, gold: 3, abilities: [], drops: [], resist: [], weak: [], desc: ''
    };
    startBattle(enemy);
    enemyGroup[0].currentHp = 0;
    endBattle(true);
  });
  // Si addLog plantait, errors aurait capté un pageerror ci-dessous
  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (addLog refait peut-être surface)`);
  }
  console.log('  ✅ addLog silencieux et sans erreur');
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

(async () => {
  const scenarios = [scenarioStartup, scenarioStatusEffects, scenarioChainedQuest, scenarioMobileSelect, scenarioMonsterImages, scenarioAddLogGuard, scenarioFloorTextures, scenarioHouseCrests, scenarioCombatMobile, scenarioSaveSlots, scenarioSlotModal];
  for (const s of scenarios) {
    await s();
  }
  console.log('\n✅ Tous les scénarios sont passés.');
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
