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

  await page.waitForFunction(() => Array.isArray(party) && party[0] && party[0].hp > 0);
  // Bug pré-existant : addLog() référence #event-log absent du DOM
  await page.evaluate(() => { window.addLog = () => {}; });
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

// ── Runner ───────────────────────────────────────────────────

(async () => {
  const scenarios = [scenarioStartup, scenarioStatusEffects, scenarioChainedQuest];
  for (const s of scenarios) {
    await s();
  }
  console.log('\n✅ Tous les scénarios sont passés.');
})().catch(err => {
  console.error('\n❌ Échec :', err.message);
  process.exit(1);
});
