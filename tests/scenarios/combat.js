// ============================================================
// Scénarios smoke — domaine « combat » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

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
    // Vague E : le ghost .status-badge-exit reste 350 ms après l'expiry —
    // on cible les pills actives uniquement (sans la classe exit).
    const pill = slot ? slot.querySelector('.status-pill:not(.status-badge-exit)') : null;
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
  // (depuis Vague A statuts V2 : icône PNG via STATUS_ICON_REGISTRY.protego,
  //  fallback emoji 🛡️ si le PNG n'est pas chargé)
  const t3 = await page.evaluate(() => {
    shieldTurns[0] = 2;
    updateUI();
    const slot  = document.getElementById('status-slot-0');
    // Idem : on ignore les ghosts d'exit éventuels (cohérence Vague E).
    const pills = slot ? slot.querySelectorAll('.status-pill:not(.status-badge-exit)') : [];
    let found = null;
    pills.forEach(p => {
      const hasEmoji = (p.textContent || '').includes('🛡️');
      const hasImg   = !!p.querySelector('img[src*="protego.png"]');
      if (hasEmoji || hasImg) found = p;
    });
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

  // T5 : weaken empilable (Vague B) — 2 stacks accumulent la perte DEF,
  // l'expiry d'un stack restaure 1 stack et conserve le reste.
  const t5 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = [];
    c.def = 12;
    const power = 3;
    // Cast 1 — pose 1 stack
    const r1 = applyStatus(c, 'weaken', power, 4);
    if (r1) c.def -= power;
    const after1 = { def: c.def, stacks: c.statusEffects[0]?.stacks, turns: c.statusEffects[0]?.turns };
    // Cast 2 — pose un 2e stack
    const r2 = applyStatus(c, 'weaken', power, 4);
    if (r2) c.def -= power;
    const after2 = { def: c.def, stacks: c.statusEffects[0]?.stacks, applied: r2 };
    // Cast 3 — pose un 3e stack (cap atteint)
    const r3 = applyStatus(c, 'weaken', power, 4);
    if (r3) c.def -= power;
    const after3 = { def: c.def, stacks: c.statusEffects[0]?.stacks, applied: r3 };
    // Cast 4 — refusé par le cap
    const r4 = applyStatus(c, 'weaken', power, 4);
    if (r4) c.def -= power;
    const after4 = { def: c.def, stacks: c.statusEffects[0]?.stacks, applied: r4 };
    // 4 ticks → expiry du 1er stack (restaure +3, stacks 3→2)
    tickStatuses(c, false); tickStatuses(c, false);
    tickStatuses(c, false); tickStatuses(c, false);
    const afterTick1 = { def: c.def, stacks: c.statusEffects[0]?.stacks, present: c.statusEffects.length };
    // 4 ticks → expiry du 2e stack (restaure +3, stacks 2→1)
    tickStatuses(c, false); tickStatuses(c, false);
    tickStatuses(c, false); tickStatuses(c, false);
    const afterTick2 = { def: c.def, stacks: c.statusEffects[0]?.stacks, present: c.statusEffects.length };
    // 4 ticks → expiry du dernier stack (restaure +3, retrait complet)
    tickStatuses(c, false); tickStatuses(c, false);
    tickStatuses(c, false); tickStatuses(c, false);
    const afterTick3 = { def: c.def, present: c.statusEffects.length };
    return { after1, after2, after3, after4, afterTick1, afterTick2, afterTick3 };
  });
  console.log('  T5 weaken stacks:', t5);
  assert(t5.after1.stacks === 1 && t5.after1.def === 9,  'stack 1 : -3 DEF');
  assert(t5.after2.applied && t5.after2.stacks === 2 && t5.after2.def === 6, 'stack 2 : -6 DEF cumul');
  assert(t5.after3.applied && t5.after3.stacks === 3 && t5.after3.def === 3, 'stack 3 : -9 DEF cumul');
  assert(t5.after4.applied === false && t5.after4.stacks === 3 && t5.after4.def === 3, 'cast au-delà du cap refuse l\'application DEF');
  assert(t5.afterTick1.present === 1 && t5.afterTick1.stacks === 2 && t5.afterTick1.def === 6,  'expiry 1 stack → -3 DEF restauré, reste 2 stacks');
  assert(t5.afterTick2.present === 1 && t5.afterTick2.stacks === 1 && t5.afterTick2.def === 9,  'expiry 2nd stack → reste 1 stack');
  assert(t5.afterTick3.present === 0 && t5.afterTick3.def === 12, 'expiry final → statut retiré, DEF restaurée');

  // T6 (Vague E) : animations enter/tick/exit appliquées par diff
  //   - enter : statut nouveau → classe .status-badge-enter
  //   - tick  : turns décrémenté → classe .status-badge-tick
  //   - exit  : statut disparu → ghost .status-badge-exit (350 ms)
  const t6 = await page.evaluate(async () => {
    const c = party[0];
    c.statusEffects = [];
    shieldTurns[0] = 0;
    updateUI();    // snapshot vide
    // Enter : on pose un nouveau burn
    applyStatus(c, 'burn', 3, 4);
    updateUI();
    const slot = document.getElementById('status-slot-0');
    const enterPill = slot.querySelector('.status-pill[data-key="burn"]');
    const hasEnter  = !!enterPill && enterPill.classList.contains('status-badge-enter');
    // Tick : tickStatuses décrémente turns, on re-render → .status-badge-tick
    tickStatuses(c, false);
    updateUI();
    const tickPill = slot.querySelector('.status-pill[data-key="burn"]');
    const hasTick  = !!tickPill && tickPill.classList.contains('status-badge-tick');
    // Exit : on tick jusqu'à l'expiry du statut
    tickStatuses(c, false);
    tickStatuses(c, false);
    tickStatuses(c, false);
    updateUI();
    const exitGhost = slot.querySelector('.status-pill.status-badge-exit[data-key="burn"]');
    const hasExit   = !!exitGhost;
    // Attendre 400 ms → le ghost doit avoir été nettoyé par setTimeout
    await new Promise(r => setTimeout(r, 400));
    const cleaned = !slot.querySelector('.status-badge-exit');
    return { hasEnter, hasTick, hasExit, cleaned };
  });
  console.log('  T6 anim diff:', t6);
  assert(t6.hasEnter, 'nouveau statut doit recevoir la classe .status-badge-enter');
  assert(t6.hasTick,  'décrément de turns doit recevoir la classe .status-badge-tick');
  assert(t6.hasExit,  'statut expiré doit laisser un ghost .status-badge-exit');
  assert(t6.cleaned,  'ghost .status-badge-exit doit être nettoyé après 350 ms');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ weaken/Protego/ability-status/stacks/anim conformes');
  await browser.close();
}

async function scenarioBruteCrush() {
  console.log('\n── Scénario 2ter : capacité Broyer (% PV max) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 50 });

  // T1 : prédicat isBruteMonster — au moins une brute, et un non-brute.
  const t1 = await page.evaluate(() => {
    const brutes    = MONSTERS.filter(m => isBruteMonster(m));
    const nonBrutes = MONSTERS.filter(m => !isBruteMonster(m));
    const sample    = brutes[0];
    return {
      bruteCount:    brutes.length,
      nonBruteCount: nonBrutes.length,
      sampleId:      sample && sample.id,
      sampleAtk:     sample && sample.atk,
      sampleMag:     sample && (sample.mag || 0),
    };
  });
  console.log('  T1 prédicat:', t1);
  assert(t1.bruteCount >= 10, `attendu ≥10 brutes, obtenu ${t1.bruteCount}`);
  assert(t1.nonBruteCount > 0, 'aucun non-brute — prédicat trop large');
  assert(t1.sampleAtk >= 12 && t1.sampleAtk >= 1.5 * t1.sampleMag, 'échantillon brute incohérent');

  // T2 : scaleMonster octroie Broyer aux brutes, pas aux autres.
  const t2 = await page.evaluate(() => {
    const brute    = MONSTERS.find(m => isBruteMonster(m));
    const nonBrute = MONSTERS.find(m => !isBruteMonster(m));
    const sb = scaleMonster(brute, 8);
    const sn = scaleMonster(nonBrute, 8);
    const crush = (sb.abilities || []).find(a => a.effect === 'maxhpdamage');
    return {
      bruteHasCrush:    !!crush,
      crushPower:       crush && crush.power,
      crushCap:         crush && crush.cap,
      crushCapRef:      crush && crush.capRef,
      crushChance:      crush && crush.chance,
      nonBruteHasCrush: (sn.abilities || []).some(a => a.effect === 'maxhpdamage'),
      // base non muté (octroi sur la copie scalée uniquement)
      baseUntouched:    !(brute.abilities || []).some(a => a.effect === 'maxhpdamage'),
    };
  });
  console.log('  T2 octroi scaling:', t2);
  assert(t2.bruteHasCrush,        'brute scalée doit porter Broyer');
  assert(t2.crushPower === 0.10,  'power Broyer doit être 0.10');
  assert(t2.crushCap === 2,       'cap Broyer doit être 2');
  assert(t2.crushCapRef === 'hit','capRef Broyer doit être "hit"');
  assert(t2.crushChance === 0.5,  'chance Broyer doit être 0.5');
  assert(!t2.nonBruteHasCrush,    'non-brute ne doit pas porter Broyer');
  assert(t2.baseUntouched,        'la base MONSTERS ne doit pas être mutée par scaleMonster');

  // T3 : dégâts non bornés (cap large) = floor(PVmax × power).
  const t3 = await page.evaluate(() => {
    const c = party[0];
    c.hpMax = 300; c.hp = 300; c.def = 5;
    shieldTurns[0] = 0;
    // enemy.atk élevé → coup normal grand → cap (2×45=90) ne borne pas 30.
    const fakeEnemy = { name: 'TestBrute', mag: 0, atk: 50,
      abilities: [{ effect: 'maxhpdamage', name: 'Broyer', icon: '🪨', power: 0.10, chance: 1.0, cap: 2, capRef: 'hit' }] };
    const orig = Math.random; Math.random = () => 0;
    try { tryEnemyAbility(fakeEnemy, c, 0, () => {}); } finally { Math.random = orig; }
    return { hp: c.hp, dealt: 300 - c.hp, normalHit: mitigatedDamage(50, 5) };
  });
  console.log('  T3 non borné:', t3);
  assert(t3.dealt === 30, `attendu 30 (0.10×300), obtenu ${t3.dealt}`);

  // T4 : dégâts bornés — enemy.atk faible → coup normal petit → cap mord.
  const t4 = await page.evaluate(() => {
    const c = party[0];
    c.hpMax = 300; c.hp = 300; c.def = 30;
    shieldTurns[0] = 0;
    const normalHit = mitigatedDamage(10, 30);   // = round(10×0.25)=3 (plancher)
    const fakeEnemy = { name: 'TestBrute', mag: 0, atk: 10,
      abilities: [{ effect: 'maxhpdamage', name: 'Broyer', icon: '🪨', power: 0.10, chance: 1.0, cap: 2, capRef: 'hit' }] };
    const orig = Math.random; Math.random = () => 0;
    try { tryEnemyAbility(fakeEnemy, c, 0, () => {}); } finally { Math.random = orig; }
    return { dealt: 300 - c.hp, normalHit, expectedCap: 2 * normalHit };
  });
  console.log('  T4 borné:', t4);
  assert(t4.dealt === t4.expectedCap, `cap doit borner à ${t4.expectedCap} (2×coup normal), obtenu ${t4.dealt}`);
  assert(t4.dealt < 30, 'le cap doit rabaisser sous la valeur non bornée (30)');

  // T5 : Protego bloque Broyer (aucun dégât, shield consommé).
  const t5 = await page.evaluate(() => {
    const c = party[0];
    c.hpMax = 300; c.hp = 300; c.def = 5;
    shieldTurns[0] = 1;
    const fakeEnemy = { name: 'TestBrute', mag: 0, atk: 50,
      abilities: [{ effect: 'maxhpdamage', name: 'Broyer', icon: '🪨', power: 0.10, chance: 1.0, cap: 2, capRef: 'hit' }] };
    const orig = Math.random; Math.random = () => 0;
    try { tryEnemyAbility(fakeEnemy, c, 0, () => {}); } finally { Math.random = orig; }
    return { dealt: 300 - c.hp, shieldLeft: shieldTurns[0] };
  });
  console.log('  T5 Protego:', t5);
  assert(t5.dealt === 0,      'Protego doit annuler Broyer');
  assert(t5.shieldLeft === 0, 'Protego doit être consommé');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Broyer : prédicat, octroi, borne, Protego conformes');
  await browser.close();
}

async function scenarioStatRework() {
  console.log('\n── Scénario 2quinquies : rework stats D1–D4 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : D1 — INT → MAG, 4:1. Sac/équipement neutralisés pour isoler.
  const t1 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {};
    c._baseInt = 0; recalculateStats(); const magInt0 = c.mag;
    c._baseInt = 20; recalculateStats(); const magInt20 = c.mag;
    return { magInt0, magInt20, intEff: c.int, intDiv: INT_MAG_DIV };
  });
  console.log('  T1 INT→MAG:', t1);
  assert(t1.intDiv === 4, 'INT_MAG_DIV doit être 4');
  assert(t1.magInt20 - t1.magInt0 === 5, `INT 20 → +floor(20/4)=5 MAG, obtenu +${t1.magInt20 - t1.magInt0}`);

  // T2 : D2 — END → DEF, 6:1.
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {};
    c._baseEnd = 0;  recalculateStats(); const defEnd0 = c.def;
    c._baseEnd = 30; recalculateStats(); const defEnd30 = c.def;
    return { defEnd0, defEnd30, endDiv: END_DEF_DIV };
  });
  console.log('  T2 END→DEF:', t2);
  assert(t2.endDiv === 6, 'END_DEF_DIV doit être 6');
  assert(t2.defEnd30 - t2.defEnd0 === 5, `END 30 → +floor(30/6)=5 DEF, obtenu +${t2.defEnd30 - t2.defEnd0}`);

  // T2bis : END → PV max. Chaque point d'END GAGNÉ via l'équipement donne
  // END_HP_PER PV ; l'END de base (via _baseEnd) n'ajoute PAS de PV — pas de
  // double-comptage avec l'allocation END qui crédite déjà _baseHpMax.
  const t2b = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {};
    c._baseEnd = 10; recalculateStats(); const hpBase = c.hpMax;
    c._baseEnd = 15; recalculateStats(); const hpBaseEndUp = c.hpMax;
    c._baseEnd = 10;
    c.equipped = { amulet: { id: 'test_end', name: 'Test END', bonusEnd: 4 } };
    recalculateStats(); const hpGear = c.hpMax;
    return { hpBase, hpBaseEndUp, hpGear, per: END_HP_PER };
  });
  console.log('  T2bis END→PV:', t2b);
  assert(t2b.per === 5, 'END_HP_PER doit être 5');
  assert(t2b.hpBaseEndUp === t2b.hpBase, `END de base ne donne pas de PV (pas de double-comptage), ${t2b.hpBaseEndUp} vs ${t2b.hpBase}`);
  assert(t2b.hpGear === t2b.hpBase + 4 * t2b.per, `équipement +4 END → +${4 * t2b.per} PV, obtenu +${t2b.hpGear - t2b.hpBase}`);

  // T3 : D3 — END atténue chaque tick de DoT subi de floor(END/12).
  const t3 = await page.evaluate(() => {
    const c = party[0];
    c.hpMax = 500; c.hp = 500; c.end = 60;
    c.statusEffects = [{ id: 'burn', icon: '🔥', power: 20, turns: 3 }];
    tickStatuses(c, false);
    const dmgEnd60 = 500 - c.hp;
    // END massif : la résistance dépasse le power → plancher à 1.
    c.hp = 500; c.end = 300;
    c.statusEffects = [{ id: 'burn', icon: '🔥', power: 20, turns: 3 }];
    tickStatuses(c, false);
    const dmgEnd300 = 500 - c.hp;
    return { dmgEnd60, dmgEnd300, div: END_DOT_RES_DIV };
  });
  console.log('  T3 résistance DoT:', t3);
  assert(t3.div === 12, 'END_DOT_RES_DIV doit être 12');
  assert(t3.dmgEnd60 === 15, `burn 20 − floor(60/12)=5 → 15 attendu, obtenu ${t3.dmgEnd60}`);
  assert(t3.dmgEnd300 === 1, `résistance > power → plancher 1, obtenu ${t3.dmgEnd300}`);

  // T4 : D4 — la STR ignore une fraction (courbe de Hill) de la DEF ennemie.
  const t4 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {}; c.atk = 100; c.critChance = 0;
    c.statusEffects = []; c.hp = c.hpMax = 500;
    const mk = () => ([{ id: 't', name: 'T', icon: 'X', def: 40,
      hp: 100000, currentHp: 100000, atk: 1, mag: 0, agi: 0,
      statusEffects: [], resist: [], weak: [] }]);
    const orig = Math.random; Math.random = () => 0; // rawAtk = atk+0, pas de crit
    let dealtStr0, dealtStr20;
    try {
      c.str = 0; inBattle = true; currentBattleChar = 0; enemyGroup = mk();
      const b0 = enemyGroup[0].currentHp; executeAttack(0);
      dealtStr0 = b0 - enemyGroup[0].currentHp;
      c.str = 20; inBattle = true; currentBattleChar = 0; c.hp = c.hpMax = 500;
      enemyGroup = mk();
      const b1 = enemyGroup[0].currentHp; executeAttack(0);
      dealtStr20 = b1 - enemyGroup[0].currentHp;
    } finally { Math.random = orig; }
    return { dealtStr0, dealtStr20, penFrac0: _strPenFrac(0), penFrac20: _strPenFrac(20) };
  });
  console.log('  T4 pénétration STR:', t4);
  assert(t4.penFrac0 === 0, 'penFrac(0) doit être 0');
  assert(Math.abs(t4.penFrac20 - 0.25) < 1e-9, `penFrac(20)=0.5×400/800=0.25, obtenu ${t4.penFrac20}`);
  // atk 100, def 40, STR 0 : effDef 40 → 100−40 = 60.
  assert(t4.dealtStr0 === 60, `STR 0 → 60 attendu, obtenu ${t4.dealtStr0}`);
  // STR 20 : effDef 40×0.75 = 30 → 100−30 = 70.
  assert(t4.dealtStr20 === 70, `STR 20 → 70 attendu (DEF percée), obtenu ${t4.dealtStr20}`);
  assert(t4.dealtStr20 > t4.dealtStr0, 'la STR doit augmenter les dégâts en perçant la DEF');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Rework D1–D4 : INT→MAG, END→DEF, résistance DoT, pénétration STR conformes');
  await browser.close();
}

async function scenarioFortuneStat() {
  console.log('\n── Scénario 2sexies : Fortune (D5 volet LCK) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });

  // T1 : Fortune = courbe de Hill sur x = LCK + Σ bonusFortune.
  const t1 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {}; c._baseLck = 15; felixFortuneSteps = 0;
    recalculateStats();
    return {
      fortuneX: c._fortuneX, fortune: c.fortune,
      expected: _fortuneCurve(15),
      asymptote: FORTUNE_ASYMPTOTE, half: FORTUNE_HALF,
    };
  });
  console.log('  T1 courbe:', t1);
  assert(t1.asymptote === 0.31 && t1.half === 30, 'constantes Fortune attendues 0.31 / 30');
  assert(t1.fortuneX === 15, `_fortuneX doit valoir LCK=15, obtenu ${t1.fortuneX}`);
  assert(Math.abs(t1.fortune - t1.expected) < 1e-9, 'fortune ≠ courbe attendue');
  assert(Math.abs(t1.fortune - 0.062) < 0.001, `LCK 15 → ~6.2 %, obtenu ${(t1.fortune*100).toFixed(1)} %`);

  // T2 : item.bonusFortune entre dans x (point d'entrée → profite de la courbe).
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c._baseLck = 15; c.equipped = { amulet: { id: 'x', bonusFortune: 25 } };
    recalculateStats();
    return { fortuneX: c._fortuneX, fortune: c.fortune, expected: _fortuneCurve(40) };
  });
  console.log('  T2 bonusFortune:', t2);
  assert(t2.fortuneX === 40, `LCK 15 + bonusFortune 25 → x=40, obtenu ${t2.fortuneX}`);
  assert(Math.abs(t2.fortune - t2.expected) < 1e-9, 'fortune ≠ courbe(40)');

  // T3 : partyFortune = max du groupe, membres KO exclus.
  const t3 = await page.evaluate(() => {
    party[0].equipped = {}; party[1].equipped = {};
    party[0]._baseLck = 0; party[1]._baseLck = 50;
    felixFortuneSteps = 0;
    recalculateStats();
    party[0].hp = party[0].hpMax; party[1].hp = party[1].hpMax;
    const max = partyFortune();
    party[1].hp = 0; // le plus chanceux KO → repli sur party[0]
    const koExcluded = partyFortune();
    return { max, expectedMax: _fortuneCurve(50), koExcluded, expectedKo: _fortuneCurve(0) };
  });
  console.log('  T3 partyFortune max:', t3);
  assert(Math.abs(t3.max - t3.expectedMax) < 1e-9, 'partyFortune doit prendre le max (party[1])');
  assert(Math.abs(t3.koExcluded - t3.expectedKo) < 1e-9, 'membre KO doit être exclu du max');

  // T4 : buff Félix — pose felixFortuneSteps, ajoute FELIX_POINTS à x, aucun
  // soin ; expire quand felixFortuneSteps retombe à 0.
  const t4 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {}; c._baseLck = 15; party[1]._baseLck = 0; party[1].equipped = {};
    felixFortuneSteps = 0; recalculateStats();
    c.hp = c.hpMax = 100; party[1].hp = party[1].hpMax; c.hp = 30;
    const before = partyFortune();
    const idx = player.inventory.push({ ...ITEMS.find(i => i.id === 'felix') }) - 1;
    useItem(idx, false);
    const stepsAfter = felixFortuneSteps;
    const hpAfter = c.hp;                       // Félix ne soigne plus
    const during = partyFortune();              // +FELIX_POINTS dans x
    felixFortuneSteps = 0;                       // simulate l'expiry (pas)
    const after = partyFortune();
    return { before, during, after, stepsAfter, hpAfter,
      felixSteps: FELIX_STEPS, felixPts: FELIX_POINTS,
      expectDuring: _fortuneCurve(15 + FELIX_POINTS) };
  });
  console.log('  T4 buff Félix:', t4);
  assert(t4.stepsAfter === t4.felixSteps, `Félix doit poser felixFortuneSteps=${t4.felixSteps}, obtenu ${t4.stepsAfter}`);
  assert(t4.hpAfter === 30, `Félix ne doit plus soigner (hp 30 attendu, obtenu ${t4.hpAfter})`);
  assert(t4.during > t4.before, 'Félix actif doit augmenter la Fortune du groupe');
  assert(Math.abs(t4.during - t4.expectDuring) < 1e-9, 'Fortune sous Félix ≠ courbe(LCK+40)');
  assert(Math.abs(t4.after - t4.before) < 1e-9, 'expiry Félix doit ramener la Fortune de base');

  // T5 : application/bornes par événement — fuite (bornée 0.95) et piège.
  const t5 = await page.evaluate(() => {
    // Fuite : Fortune élevée pousse la chance de fuite au-dessus du seuil.
    party[0].equipped = {}; party[0]._baseLck = 15; party[1]._baseLck = 0;
    recalculateStats();
    const enemy = { id: 'd', name: 'D', icon: 'X', hp: 50, atk: 1, def: 0,
      mag: 0, agi: 0, lck: 0, xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'x' };
    // Sans Félix (F bas) : baseChance 0.7, random 0.92 → échec.
    felixFortuneSteps = 0;
    startBattle(enemy); currentBattleChar = 0;
    player.inventory = player.inventory.filter(i => i.id !== 'broom');
    let orig = Math.random; Math.random = () => 0.92;
    try { doFlee(); } finally { Math.random = orig; }
    const fledNoFelix = !inBattle;
    // Avec Félix (F≈0.24) : chance min(0.95, 0.7+0.24)=0.94, random 0.92 → succès.
    felixFortuneSteps = FELIX_STEPS;
    if (!inBattle) startBattle(enemy);
    currentBattleChar = 0;
    orig = Math.random; Math.random = () => 0.92;
    try { doFlee(); } finally { Math.random = orig; }
    const fledFelix = !inBattle;

    // Piège : Fortune réduit le risque d'embuscade (déclenchement plein).
    inBattle = false;
    party[0]._fortuneX = 200; felixFortuneSteps = FELIX_STEPS; // F ≈ 0.30
    orig = Math.random; Math.random = () => 0.4;
    try { _triggerDungeonTrap(); } finally { Math.random = orig; }
    const ambushHighF = inBattle; // attendu false (pas d'embuscade)
    inBattle = false;
    felixFortuneSteps = 0; party[0]._fortuneX = 0; // F = 0
    orig = Math.random; Math.random = () => 0.4;
    try { _triggerDungeonTrap(); } finally { Math.random = orig; }
    const ambushNoF = inBattle;   // attendu true (embuscade à risk 0.5)
    inBattle = false;
    return { fledNoFelix, fledFelix, ambushHighF, ambushNoF };
  });
  console.log('  T5 application événements:', t5);
  assert(t5.fledNoFelix === false, 'sans Félix, la fuite doit échouer (random 0.92 > 0.7)');
  assert(t5.fledFelix === true, 'avec Félix, la Fortune fait passer la fuite (chance 0.94)');
  assert(t5.ambushNoF === true, 'sans Fortune, risque embuscade 0.5 > random 0.4 → embuscade');
  assert(t5.ambushHighF === false, 'Fortune élevée réduit le risque d\'embuscade sous 0.4');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Fortune : courbe, partyFortune=max, Félix pose/expire, fuite/piège bornés');
  await browser.close();
}

async function scenarioAgiCelerite() {
  console.log('\n── Scénario 2septies : Célérité (D5 volet AGI) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });

  // T1 : Célérité = courbe de Hill sur x = AGI + Σ bonusCelerite.
  const t1 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = {}; c._baseAgi = 45;
    recalculateStats();
    return {
      celeriteX: c._celeriteX, celerite: c.celerite,
      expected: _celeriteCurve(45),
      max: CELERITE_MAX, half: CELERITE_HALF,
    };
  });
  console.log('  T1 courbe:', t1);
  assert(t1.max === 0.30 && t1.half === 45, 'constantes Célérité attendues 0.30 / 45');
  assert(t1.celeriteX === 45, `_celeriteX doit valoir AGI=45, obtenu ${t1.celeriteX}`);
  assert(Math.abs(t1.celerite - t1.expected) < 1e-9, 'celerite ≠ courbe attendue');
  assert(Math.abs(t1.celerite - 0.15) < 0.001, `AGI 45 (=half) → 15 %, obtenu ${(t1.celerite*100).toFixed(1)} %`);

  // T2 : item.bonusCelerite entre dans x (point d'entrée → profite de la courbe).
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c._baseAgi = 30; c.equipped = { trinket: { id: 'x', bonusCelerite: 15 } };
    recalculateStats();
    return { celeriteX: c._celeriteX, celerite: c.celerite, expected: _celeriteCurve(45) };
  });
  console.log('  T2 bonusCelerite:', t2);
  assert(t2.celeriteX === 45, `AGI 30 + bonusCelerite 15 → x=45, obtenu ${t2.celeriteX}`);
  assert(Math.abs(t2.celerite - t2.expected) < 1e-9, 'celerite ≠ courbe(45)');

  // T3 : accumulateur de tempo — gain de tour FLUIDE (le taux pilote la
  // fréquence, pas un palier). À celerite 0.5 : round1 jauge 0.5 (0 action sup),
  // round2 jauge 1.0 → 1 action sup. + jauge 0, round3 jauge 0.5 (0). À celerite
  // basse (AGI early), jamais d'action sup.
  const t3 = await page.evaluate(() => {
    const c = party[0];
    celeriteGauge = [0, 0]; celeriteExtra = [0, 0];
    c.celerite = 0.5;
    _beginHeroSegment(0); const r1 = celeriteExtra[0];           // 0
    _beginHeroSegment(0); const r2 = celeriteExtra[0];           // 1
    _beginHeroSegment(0); const r3 = celeriteExtra[0];           // 0
    // AGI basse (early game) : aucune action sup. même sur 5 rounds.
    celeriteGauge = [0, 0]; celeriteExtra = [0, 0];
    c.celerite = _celeriteCurve(12);                              // ~1.7 %
    let lowExtra = 0;
    for (let i = 0; i < 5; i++) { _beginHeroSegment(0); lowExtra += celeriteExtra[0]; }
    return { r1, r2, r3, lowExtra, lowCelerite: c.celerite };
  });
  console.log('  T3 accumulateur:', t3);
  assert(t3.r1 === 0 && t3.r2 === 1 && t3.r3 === 0,
    `gauge 0.5 : actions sup. attendues 0/1/0, obtenu ${t3.r1}/${t3.r2}/${t3.r3}`);
  assert(t3.lowExtra === 0, `AGI 12 (early) ne doit donner aucune action sup. (obtenu ${t3.lowExtra})`);

  // T4 : advanceBattleChar consomme une action sup. → re-prompt du MÊME héros
  // (ne change pas currentBattleChar), tant qu'ennemi vivant.
  const t4 = await page.evaluate(() => {
    const enemy = { id: 'd', name: 'D', icon: 'X', hp: 80, atk: 1, def: 0,
      mag: 0, agi: 0, lck: 0, xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'x' };
    startBattle(enemy);
    // startBattle a reset les jauges (T5 le vérifie). On arme une action sup.
    currentBattleChar = 0; celeriteExtra = [1, 0];
    party[0].hp = party[0].hpMax;
    advanceBattleChar();
    const reprompted = (currentBattleChar === 0);      // n'a pas avancé
    const consumed   = (celeriteExtra[0] === 0);        // 1 action sup. consommée
    // Plus d'action sup. → avance normalement (passe à Hermione en duo).
    advanceBattleChar();
    const advanced = (currentBattleChar === 1);
    inBattle = false;
    return { reprompted, consumed, advanced };
  });
  console.log('  T4 re-prompt:', t4);
  assert(t4.reprompted, 'advanceBattleChar avec action sup. doit re-prompter le même héros');
  assert(t4.consumed, 'l\'action sup. doit être consommée (celeriteExtra → 0)');
  assert(t4.advanced, 'sans action sup. restante, advanceBattleChar doit avancer au héros suivant');

  // T5 : startBattle réinitialise les jauges (combat-scoped, non sérialisées).
  const t5 = await page.evaluate(() => {
    celeriteGauge = [9, 9]; celeriteExtra = [9, 9];
    const enemy = { id: 'd', name: 'D', icon: 'X', hp: 50, atk: 1, def: 0,
      mag: 0, agi: 0, lck: 0, xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'x' };
    startBattle(enemy);
    const gauge = [...celeriteGauge], extra = [...celeriteExtra];
    inBattle = false;
    return { gauge, extra };
  });
  console.log('  T5 reset combat:', t5);
  assert(t5.gauge[1] === 0 && t5.extra[1] === 0,
    'startBattle doit réinitialiser celeriteGauge/celeriteExtra');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Célérité : courbe, accumulateur fluide, re-prompt, reset combat');
  await browser.close();
}

async function scenarioDuoStatuses() {
  console.log('\n── Scénario 2quater : statuts duo isolés ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
  await startDummyFight(page, { hp: 50 });

  // T1 : Protego par Hermione → shieldTurns[1] uniquement
  const t1 = await page.evaluate(() => {
    shieldTurns[0] = 0; shieldTurns[1] = 0;
    currentBattleChar = 1;
    const spell = SPELLS.find(s => s.name === 'Protego');
    _spellShield(spell, party[1]);
    return { s0: shieldTurns[0], s1: shieldTurns[1] };
  });
  console.log('  T1 Protego Hermione:', t1);
  assert(t1.s0 === 0, 'Protego d\'Hermione ne doit PAS ouvrir le bouclier de Harry');
  assert(t1.s1  >  0, 'Protego d\'Hermione doit ouvrir son propre bouclier');

  // T2 : Protego par Harry → shieldTurns[0] uniquement
  const t2 = await page.evaluate(() => {
    shieldTurns[0] = 0; shieldTurns[1] = 0;
    currentBattleChar = 0;
    const spell = SPELLS.find(s => s.name === 'Protego');
    _spellShield(spell, party[0]);
    return { s0: shieldTurns[0], s1: shieldTurns[1] };
  });
  console.log('  T2 Protego Harry:', t2);
  assert(t2.s0 >  0, 'Protego de Harry doit ouvrir son propre bouclier');
  assert(t2.s1 === 0, 'Protego de Harry ne doit PAS ouvrir le bouclier d\'Hermione');

  // T3 : weaken ciblé sur Harry uniquement (ability ennemi)
  const t3 = await page.evaluate(() => {
    party[0].statusEffects = []; party[1].statusEffects = [];
    party[0].def = 10; party[1].def = 10;
    const fakeEnemy = {
      name: 'Détraqueur',
      abilities: [{ name: 'Souffle Glacé', icon: '❄️', effect: 'weaken', power: 3, chance: 1.0, turns: 3 }]
    };
    const origRandom = Math.random;
    Math.random = () => 0;
    try { tryEnemyAbility(fakeEnemy, party[0], 0, () => {}); }
    finally { Math.random = origRandom; }
    return {
      h0_status: party[0].statusEffects.length,
      h1_status: party[1].statusEffects.length,
      h0_def:    party[0].def,
      h1_def:    party[1].def
    };
  });
  console.log('  T3 weaken cible Harry:', t3);
  assert(t3.h0_status === 1, 'weaken doit poser le statut sur Harry');
  assert(t3.h1_status === 0, 'weaken sur Harry ne doit PAS apparaître sur Hermione');
  assert(t3.h0_def    === 7, 'weaken doit retirer 3 DEF à Harry (10 → 7)');
  assert(t3.h1_def    === 10, 'weaken sur Harry ne doit PAS retirer la DEF d\'Hermione');

  // T4 : DoT (burn) sur Hermione uniquement, le tick ne saigne pas Harry
  const t4 = await page.evaluate(() => {
    party[0].statusEffects = []; party[1].statusEffects = [];
    party[0].hp = 30; party[1].hp = 30;
    applyStatus(party[1], 'burn', 5, 3);
    tickStatuses(party[1], false);
    tickStatuses(party[0], false);   // pas de statut → no-op
    return {
      h0_hp: party[0].hp,
      h1_hp: party[1].hp,
      h0_status: party[0].statusEffects.length,
      h1_status: party[1].statusEffects.length
    };
  });
  console.log('  T4 burn sur Hermione:', t4);
  assert(t4.h0_hp === 30, 'burn sur Hermione ne doit PAS toucher les PV de Harry');
  assert(t4.h1_hp  <  30, 'burn doit retirer des PV à Hermione');
  assert(t4.h0_status === 0, 'burn ne doit pas se propager sur Harry');
  assert(t4.h1_status === 1, 'burn doit rester sur Hermione');

  // T5 : weaken empilé sur Hermione (3 stacks) — vérifier que Harry
  // ne porte aucun stack après une telle salve sur sa coéquipière.
  const t5 = await page.evaluate(() => {
    party[0].statusEffects = []; party[1].statusEffects = [];
    party[0].def = 12; party[1].def = 12;
    for (let i = 0; i < 3; i++) {
      const ok = applyStatus(party[1], 'weaken', 3, 4);
      if (ok) party[1].def -= 3;
    }
    return {
      h0_def: party[0].def, h1_def: party[1].def,
      h0_stacks: party[0].statusEffects.length,
      h1_stacks: party[1].statusEffects[0]?.stacks
    };
  });
  console.log('  T5 stacks isolés:', t5);
  assert(t5.h0_def === 12,    'Harry ne perd pas de DEF quand Hermione est weaken');
  assert(t5.h1_def === 3,     'Hermione DEF 12 → 3 après 3 stacks');
  assert(t5.h0_stacks === 0,  'Harry n\'a aucun statut');
  assert(t5.h1_stacks === 3,  'Hermione porte 3 stacks');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ statuts duo strictement isolés par perso');
  await browser.close();
}

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
      hasSpellCrit:  txt.includes('Crit. sort'),
      hasDodgeLabel: txt.includes('Esquive'),
      hasPercent:    /\d+%/.test(txt)
    };
  });
  console.log('  T3 modale:', t3);
  assert(t3.hasCritLabel,  'modale doit afficher "Critique"');
  assert(t3.hasSpellCrit,  'modale doit afficher "Crit. sort"');
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

  // T6 : refonte crit — crit damage, crit de sort, crit équipement > 40 %.
  // Crit physique piloté par LCK, crit de sort par AGI : on monte les deux
  // pour vérifier le dépassement du plafond via les bonus d'équipement.
  const t6 = await page.evaluate(() => {
    const c = party[0];
    // Item factice avec crit damage + crit chance + spell crit
    c.equipped = c.equipped || {};
    c.equipped.trinket = {
      id: '_crittest', name: 'Test', slot: 'trinket',
      bonusCritChance: 50, bonusCritDamage: 0.50,
      bonusSpellCritChance: 30, bonusSpellCritDamage: 0.40
    };
    c._baseLck = 30;             // LCK seule → 20 % (plafonné 40)
    c._baseAgi = 30;             // AGI seule → 17 % (plafonné 35)
    recalculateStats();
    const out = {
      critChance: c.critChance, critMult: c.critMultiplier,
      spellCritChance: c.spellCritChance, spellCritMult: c.spellCritMultiplier
    };
    c.equipped.trinket = null;
    c._baseLck = 15;
    c._baseAgi = 12;
    recalculateStats();
    return out;
  });
  console.log('  T6 refonte crit:', t6);
  assert(t6.critChance > 40,  `crit équipement doit dépasser 40 %, got ${t6.critChance}`);
  assert(Math.abs(t6.critMult - 2.0) < 0.01, `critMultiplier attendu 2.0, got ${t6.critMult}`);
  assert(t6.spellCritChance > 40, `spellCritChance doit pouvoir dépasser 40 %, got ${t6.spellCritChance}`);
  assert(Math.abs(t6.spellCritMult - 1.9) < 0.01, `spellCritMultiplier attendu 1.9, got ${t6.spellCritMult}`);

  // T7 : spellCritChance dérivé d'AGI (rôle offensif de l'AGI).
  const t7 = await page.evaluate(() => {
    party[0]._baseAgi = 12;
    recalculateStats();
    const mid = party[0].spellCritChance;
    party[0]._baseAgi = 100;
    recalculateStats();
    const high = party[0].spellCritChance;
    party[0]._baseAgi = 0;
    recalculateStats();
    const low = party[0].spellCritChance;
    party[0]._baseAgi = 12;
    recalculateStats();
    return { mid, high, low };
  });
  console.log('  T7 spellCritChance AGI 12/100/0:', t7);
  assert(typeof t7.mid === 'number',  'spellCritChance doit être un nombre');
  assert(t7.low === 5,                `AGI 0 → spellCritChance plancher 5%, got ${t7.low}`);
  assert(t7.high === 35,              `AGI 100 → spellCritChance cap 35%, got ${t7.high}`);
  assert(t7.mid > t7.low,             'spellCritChance doit croître avec AGI');

  // T8 : le crit de sort applique spellCritMultiplier sur les dégâts.
  const t8 = await page.evaluate(() => {
    const spell = { name: 'TestBolt', power: 20, effect: 'stun' };
    const char  = party[0];
    char.mag = 10; // dmg base = 20 + floor(10/2) = 25
    char.spellCritChance = 0;
    const e1 = { name: 'E', currentHp: 1000, resist: [], weak: [] };
    _spellElementalDamage(spell, char, e1, 0);
    const noCrit = 1000 - e1.currentHp;
    char.spellCritChance = 100;
    const e2 = { name: 'E', currentHp: 1000, resist: [], weak: [] };
    _spellElementalDamage(spell, char, e2, 0);
    const crit = 1000 - e2.currentHp;
    return { noCrit, crit, mult: char.spellCritMultiplier };
  });
  console.log('  T8 dmg sort sans/avec crit:', t8);
  assert(t8.noCrit === 25, `dmg sort sans crit attendu 25, got ${t8.noCrit}`);
  assert(t8.crit === Math.floor(25 * t8.mult),
    `dmg sort crit attendu floor(25*${t8.mult})=${Math.floor(25 * t8.mult)}, got ${t8.crit}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Crit + Esquive OK');
  await browser.close();
}

async function scenarioHpSpMaxBonus() {
  console.log('\n── Scénario : PV/PM max depuis l\'équipement (V2 Vague B) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const clean = `(() => { party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null, cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null }; })()`;

  // T1 : coeur_lion (+10 hpMax) — hpMax monte de 10, hp inchangé.
  const t1 = await page.evaluate((cleanFn) => {
    eval(cleanFn);
    const c = party[0];
    recalculateStats();
    const baseHpMax = c.hpMax;
    c.hp = baseHpMax - 5;            // perso légèrement blessé
    c.equipped.amulet = { ...ITEMS.find(i => i.id === 'coeur_lion') };
    recalculateStats();
    return { baseHpMax, withItem: c.hpMax, hp: c.hp };
  }, clean);
  console.log('  T1 coeur_lion:', t1);
  assert(t1.withItem === t1.baseHpMax + 10, `hpMax attendu ${t1.baseHpMax + 10}, got ${t1.withItem}`);
  assert(t1.hp === t1.baseHpMax - 5,        `hp courant ne doit pas bouger, got ${t1.hp}`);

  // T2 : déséquiper alors que hp est au plafond gonflé → clamp à la base.
  const t2 = await page.evaluate((cleanFn) => {
    eval(cleanFn);
    const c = party[0];
    c.equipped.amulet = { ...ITEMS.find(i => i.id === 'coeur_lion') };
    recalculateStats();
    c.hp = c.hpMax;                  // plein au max gonflé (base+10)
    const inflated = c.hp;
    c.equipped.amulet = null;
    recalculateStats();
    return { inflated, hpMax: c.hpMax, hp: c.hp };
  }, clean);
  console.log('  T2 clamp déséquipement:', t2);
  assert(t2.hp === t2.hpMax, `hp doit être clampé à hpMax (${t2.hpMax}), got ${t2.hp}`);
  assert(t2.hp < t2.inflated, `hp doit redescendre sous la valeur gonflée ${t2.inflated}, got ${t2.hp}`);

  // T3 : save legacy sans _baseHpMax/_baseSpMax → lazy-init = valeur courante.
  const t3 = await page.evaluate((cleanFn) => {
    eval(cleanFn);
    const c = party[0];
    delete c._baseHpMax; delete c._baseSpMax;
    c.hpMax = 99; c.spMax = 77;
    recalculateStats();
    return { baseHp: c._baseHpMax, baseSp: c._baseSpMax, hpMax: c.hpMax, spMax: c.spMax };
  }, clean);
  console.log('  T3 migration legacy:', t3);
  assert(t3.baseHp === 99 && t3.hpMax === 99, `_baseHpMax doit s'initialiser à 99, got ${t3.baseHp}/${t3.hpMax}`);
  assert(t3.baseSp === 77 && t3.spMax === 77, `_baseSpMax doit s'initialiser à 77, got ${t3.baseSp}/${t3.spMax}`);

  // T4 : larmes_phenix (+5 spMax) et cor_pegasse (+8 hpMax).
  const t4 = await page.evaluate((cleanFn) => {
    eval(cleanFn);
    const c = party[0];
    recalculateStats();
    const baseSp = c.spMax, baseHp = c.hpMax;
    c.equipped.amulet  = { ...ITEMS.find(i => i.id === 'larmes_phenix') };
    c.equipped.trinket = { ...ITEMS.find(i => i.id === 'cor_pegasse') };
    recalculateStats();
    return { baseSp, baseHp, spMax: c.spMax, hpMax: c.hpMax };
  }, clean);
  console.log('  T4 larmes_phenix + cor_pegasse:', t4);
  assert(t4.spMax === t4.baseSp + 5, `larmes_phenix : spMax +5 attendu, got ${t4.spMax - t4.baseSp}`);
  assert(t4.hpMax === t4.baseHp + 8, `cor_pegasse : hpMax +8 attendu, got ${t4.hpMax - t4.baseHp}`);

  // T5 : le bonus d'équipement survit à un level-up (base bumpée +8/+5).
  const t5 = await page.evaluate((cleanFn) => {
    eval(cleanFn);
    const c = party[0];
    recalculateStats();
    const before = c.hpMax;
    c.equipped.amulet = { ...ITEMS.find(i => i.id === 'coeur_lion') };
    recalculateStats();
    const equipped = c.hpMax;        // base + 10
    _grantLevelHpSp(c);              // base += 8
    recalculateStats();
    const afterLevel = c.hpMax;      // base+8 + 10
    return { before, equipped, afterLevel };
  }, clean);
  console.log('  T5 level-up + équipement:', t5);
  assert(t5.equipped === t5.before + 10,       `équipé : +10 attendu, got ${t5.equipped - t5.before}`);
  assert(t5.afterLevel === t5.before + 8 + 10, `après level-up : base+8 + bonus 10 attendu, got ${t5.afterLevel}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ PV/PM max depuis l\'équipement OK');
  await browser.close();
}

async function scenarioCritBonusMultiplier() {
  console.log('\n── Scénario : multiplicateur de crit capé (V2 Vague C) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : wand2 → critMultiplier 1.5 + 0.2 = 1.7
  const t1 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                   cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    const base = c.critMultiplier;
    c.equipped.wand = { ...ITEMS.find(i => i.id === 'wand2') };
    recalculateStats();
    return { base, withWand: c.critMultiplier };
  });
  console.log('  T1 wand2:', t1);
  assert(Math.abs(t1.base - 1.5) < 1e-9,     `critMultiplier de base attendu 1.5, got ${t1.base}`);
  assert(Math.abs(t1.withWand - 1.7) < 1e-9, `wand2 → critMultiplier attendu 1.7, got ${t1.withWand}`);

  // T2 : cap absolu — un bonus énorme est plafonné à 2.5.
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                   cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    c.equipped.trinket = { id:'_capt', name:'Cap', slot:'trinket',
                           bonusCritDamage: 5, bonusSpellCritDamage: 5 };
    recalculateStats();
    const out = { crit: c.critMultiplier, spell: c.spellCritMultiplier };
    c.equipped.trinket = null;
    recalculateStats();
    return out;
  });
  console.log('  T2 cap:', t2);
  assert(t2.crit === 2.5,  `critMultiplier doit être capé à 2.5, got ${t2.crit}`);
  assert(t2.spell === 2.5, `spellCritMultiplier doit être capé à 2.5, got ${t2.spell}`);

  // T3 : executeAttack applique critMultiplier (1.7×) sur le dégât.
  // Math.random=0 → rawAtk = atk (pas de variance), roll crit déterministe.
  const t3 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                   cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    c.equipped.wand = { ...ITEMS.find(i => i.id === 'wand2') };
    recalculateStats();
    const mult = c.critMultiplier;
    const orig = Math.random;
    Math.random = () => 0;
    const fight = (critPct) => {
      inBattle = true;
      currentBattleChar = 0;
      enemyGroup = [{ id:'_t', name:'Mannequin', icon:'X', def:0,
                      currentHp:100000, hp:100000, atk:0, statusEffects:[],
                      disarmed:0 }];
      c.critChance = critPct;
      const before = enemyGroup[0].currentHp;
      executeAttack(0);
      const dmg = before - enemyGroup[0].currentHp;
      inBattle = false;
      return dmg;
    };
    const normal = fight(0);     // pas de crit
    const crit   = fight(100);   // crit garanti
    Math.random = orig;
    return { mult, normal, crit };
  });
  console.log('  T3 executeAttack:', t3);
  assert(Math.abs(t3.mult - 1.7) < 1e-9, `critMultiplier attendu 1.7, got ${t3.mult}`);
  assert(t3.crit === Math.floor(t3.normal * 1.7),
    `dégât crit attendu floor(${t3.normal}*1.7)=${Math.floor(t3.normal * 1.7)}, got ${t3.crit}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Multiplicateur de crit capé OK');
  await browser.close();
}

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
    enemyGroup.length = 1;       // startBattle a pu créer un groupe : isole le mannequin
    party[0].hp = 50; party[0].hpMax = 50; party[0].def = 0;
    party[1].hp = 0;             // Hermione KO pour forcer la cible Harry
    party[0].dodgeChance = 0;    // pas d'esquive
    shieldTurns = [0, 0];        // pas de Protego
    guardTurns  = [1, 0];        // Garde actif
    // startBattle peut rouler un groupe de 2-3 ennemis (rollGroupSize) :
    // on épingle un mannequin unique pour un calcul de dégâts déterministe.
    enemyGroup.length = 1;
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
      // INT (maîtrise) + END (domaine du soin) pilotent la régen Ferula.
      // regenPower = power(4) + floor(int/8) + floor(end/8) = 4 + 1 + 1 = 6.
      party[0].int = 12; party[0].end = 8;
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
    assert(fer.regenPower === 6,        `regen power attendu 6 (4 + int/8 + end/8), obtenu ${fer.regenPower}`);
    assert(fer.sp === 14,               `PM Harry attendu 20-6=14, obtenu ${fer.sp}`);

    // T3 : tick du statut regen — Hermione récupère 6 PV
    const tick = await ctx.page.evaluate(() => {
      const before = party[1].hp;
      tickStatuses(party[1], false);
      return { before, after: party[1].hp };
    });
    assert(tick.after - tick.before === 6,
      `regen tick attendu +6 PV, obtenu +${tick.after - tick.before}`);

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

async function scenarioCombatBuffs() {
  console.log('\n── Scénario : potions de buff de combat (DEF/AGI/LCK/MAG) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données : 4 items + recettes + icônes + map BUFF_STAT_BY_ID.
  const t1 = await page.evaluate(() => {
    const specs = [
      ['potion_defense', 'def', 'buff_def'],
      ['elixir_celerite', 'agi', 'buff_agi'],
      ['potion_precision', 'lck', 'buff_lck'],
      ['elixir_puissance', 'mag', 'buff_mag'],
    ];
    return {
      itemsOk: specs.every(([id, stat]) => {
        const it = ITEMS.find(i => i.id === id);
        return it && it.effect === 'temp_buff' && it.buffStat === stat && it.power === 8;
      }),
      mapOk: typeof BUFF_STAT_BY_ID !== 'undefined'
        && BUFF_STAT_BY_ID.buff_def === 'def' && BUFF_STAT_BY_ID.buff_mag === 'mag',
      recipesOk: ['brew_potion_defense', 'brew_elixir_celerite', 'brew_potion_precision', 'brew_elixir_puissance']
        .every(rid => POTION_RECIPES.some(r => r.id === rid)),
      iconsOk: specs.every(([id]) => !!ITEM_ICON_NEW_REGISTRY[id]),
    };
  });
  console.log('  T1 données :', t1);
  assert(t1.itemsOk, 'les 4 potions de buff doivent être des temp_buff +8');
  assert(t1.mapOk, 'BUFF_STAT_BY_ID doit mapper les 5 stats');
  assert(t1.recipesOk, 'les 4 recettes de buff doivent exister');
  assert(t1.iconsOk, 'les 4 potions de buff doivent avoir une icône PNG');

  // T2 — DEF : pose +8, survit au recalc, expiry restaure.
  const t2 = await page.evaluate(() => {
    const c = party[0]; c.statusEffects = []; recalculateStats();
    const before = c.def;
    _applyConsumableEffect({ ...ITEMS.find(i => i.id === 'potion_defense') }, c);
    const afterApply = c.def;
    recalculateStats();
    const afterRecalc = c.def;
    const s = c.statusEffects.find(x => x.id === 'buff_def'); s.turns = 1;
    tickStatuses(c, false);
    const afterExpiry = c.def;
    recalculateStats();
    return { before, afterApply, afterRecalc, afterExpiry, afterExpiryRecalc: c.def };
  });
  console.log('  T2 DEF     :', t2);
  assert(t2.afterApply === t2.before + 8, 'DEF +8 à l\'application');
  assert(t2.afterRecalc === t2.before + 8, 'le buff DEF survit au recalc');
  assert(t2.afterExpiry === t2.before, 'DEF restaurée à l\'expiry');
  assert(t2.afterExpiryRecalc === t2.before, 'pas de re-add fantôme après expiry');

  // T3 — AGI : le buff doit augmenter la stat dérivée dodgeChance.
  const t3 = await page.evaluate(() => {
    const c = party[0]; c.statusEffects = []; recalculateStats();
    const agi0 = c.agi, dodge0 = c.dodgeChance;
    _applyConsumableEffect({ ...ITEMS.find(i => i.id === 'elixir_celerite') }, c);
    return { agi0, agi1: c.agi, dodge0, dodge1: c.dodgeChance };
  });
  console.log('  T3 AGI     :', t3);
  assert(t3.agi1 === t3.agi0 + 8, 'AGI +8 appliqué');
  assert(t3.dodge1 > t3.dodge0, 'le buff AGI doit augmenter dodgeChance (stat dérivée)');

  // T4 — LCK : le buff doit augmenter la stat dérivée critChance.
  const t4 = await page.evaluate(() => {
    const c = party[0]; c.statusEffects = []; recalculateStats();
    const crit0 = c.critChance;
    _applyConsumableEffect({ ...ITEMS.find(i => i.id === 'potion_precision') }, c);
    return { crit0, crit1: c.critChance };
  });
  console.log('  T4 LCK     :', t4);
  assert(t4.crit1 > t4.crit0, 'le buff LCK doit augmenter critChance (stat dérivée)');

  // T5 — MAG : +8 appliqué et survit au recalc ; pas de stacking (refresh).
  const t5 = await page.evaluate(() => {
    const c = party[0]; c.statusEffects = []; recalculateStats();
    const mag0 = c.mag;
    const pot = { ...ITEMS.find(i => i.id === 'elixir_puissance') };
    _applyConsumableEffect(pot, c);
    _applyConsumableEffect(pot, c); // 2e fois → refresh, pas de cumul
    recalculateStats();
    const count = c.statusEffects.filter(s => s.id === 'buff_mag').length;
    return { mag0, mag1: c.mag, count };
  });
  console.log('  T5 MAG     :', t5);
  assert(t5.mag1 === t5.mag0 + 8, 'MAG +8 (pas de cumul sur 2 applications)');
  assert(t5.count === 1, 'un seul statut buff_mag actif');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Potions de buff OK (DEF/AGI/LCK/MAG : pose, recalc, dérivées, expiry, no-stack)');
  await browser.close();
}

async function scenarioLegilimensEscalation() {
  console.log('\n── Scénario Legilimens : coût PM croissant (anti-spam B4) ──');
  const { browser, page, errors } = await launchGame();
  // Gryffondor (défaut) : pas de réduction Apothéose Serdaigle → coût brut.
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 400 });

  // T1 : deux lancers consécutifs dans le même combat — le 2e enchérit.
  // Tout dans un seul evaluate : enemyTurn est différé (setTimeout), donc
  // aucune interférence sur les PM entre les deux mesures.
  const t1 = await page.evaluate(() => {
    const c = party[0];
    if (!c.spells.includes('Legilimens')) c.spells.push('Legilimens');
    c.spMax = 200; c.sp = 200;
    legilimensCastsThisFight = 0;
    const base = SPELLS.find(s => s.name === 'Legilimens').cost;

    const before1 = c.sp;
    castSpellInBattle('Legilimens', 0);
    const delta1 = before1 - c.sp;
    const charges1 = legilimensCancelCharges;

    const before2 = c.sp;
    castSpellInBattle('Legilimens', 0);
    const delta2 = before2 - c.sp;

    const before3 = c.sp;
    castSpellInBattle('Legilimens', 0);
    const delta3 = before3 - c.sp;

    return { base, delta1, delta2, delta3, charges1, casts: legilimensCastsThisFight };
  });
  console.log('  T1 escalade:', t1);
  assert(t1.base === 18,    `coût de base attendu 18, obtenu ${t1.base}`);
  assert(t1.delta1 === 18,  `1er lancer doit coûter 18 PM, obtenu ${t1.delta1}`);
  assert(t1.delta2 === 24,  `2e lancer doit coûter 24 PM (18+6), obtenu ${t1.delta2}`);
  assert(t1.delta3 === 30,  `3e lancer doit coûter 30 PM (18+12), obtenu ${t1.delta3}`);
  assert(t1.charges1 === 1, 'le 1er lancer doit armer 1 charge d\'annulation');
  assert(t1.casts === 3,    `legilimensCastsThisFight attendu 3, obtenu ${t1.casts}`);

  // T2 : refus si PM insuffisant pour le coût escaladé (≠ coût de base).
  const t2 = await page.evaluate(() => {
    const c = party[0];
    legilimensCastsThisFight = 3;     // prochain coût = 18 + 18 = 36
    c.spMax = 200; c.sp = 30;         // 30 ≥ base(18) mais < escaladé(36)
    const effCost = _spellSpCost(SPELLS.find(s => s.name === 'Legilimens'));
    const before = c.sp;
    castSpellInBattle('Legilimens', 0);
    return { effCost, spent: before - c.sp, casts: legilimensCastsThisFight };
  });
  console.log('  T2 refus  :', t2);
  assert(t2.effCost === 36, `coût escaladé attendu 36, obtenu ${t2.effCost}`);
  assert(t2.spent === 0,    'lancer doit être refusé faute de PM pour le coût escaladé');
  assert(t2.casts === 3,    'un lancer refusé ne doit pas incrémenter le compteur');

  // T3 : le compteur est remis à 0 au combat suivant (startBattle).
  const t3 = await page.evaluate(() => {
    const dummy = { id: 'leg_dummy2', name: 'Cible', icon: '🎯',
      hp: 200, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: '' };
    startBattle(dummy);
    const casts = legilimensCastsThisFight;
    const cost  = _spellSpCost(SPELLS.find(s => s.name === 'Legilimens'));
    return { casts, cost };
  });
  console.log('  T3 reset  :', t3);
  assert(t3.casts === 0, 'legilimensCastsThisFight doit être remis à 0 au combat suivant');
  assert(t3.cost === 18, `coût doit revenir à 18 au combat suivant, obtenu ${t3.cost}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Legilimens : coût PM croissant + reset par combat');
  await browser.close();
}

async function scenarioStun() {
  console.log('\n── Scénario Stun : étourdissement + nouveaux monstres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 80 });

  // T1 : STATUS_DEFS.stun défini
  const t1 = await page.evaluate(() => ({
    defined: typeof STATUS_DEFS !== 'undefined' && !!STATUS_DEFS.stun,
    icon:    STATUS_DEFS?.stun?.icon,
    label:   STATUS_DEFS?.stun?.label
  }));
  console.log('  T1 def   :', t1);
  assert(t1.defined,            'STATUS_DEFS.stun absent');
  assert(t1.label === 'Étourdi', 'label stun incorrect');

  // T2 : stun n'est pas un DoT — tickStatuses ne décrémente ni ne blesse
  const t2 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.statusEffects = [];
    applyStatus(e, 'stun', 0, 2);
    const hpBefore = e.currentHp;
    tickStatuses(e, true);
    return {
      hpBefore, hpAfter: e.currentHp,
      turns: e.statusEffects.find(s => s.id === 'stun')?.turns
    };
  });
  console.log('  T2 tick  :', t2);
  assert(t2.hpAfter === t2.hpBefore, 'stun ne doit pas infliger de dégâts');
  assert(t2.turns === 2,             'tickStatuses ne doit pas décrémenter stun');

  // T3 : consumeStun consomme 1 tour, retire le statut à 0
  const t3 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.statusEffects = [];
    applyStatus(e, 'stun', 0, 2);
    const r1 = consumeStun(e);
    const turnsAfter1 = e.statusEffects.find(s => s.id === 'stun')?.turns;
    const r2 = consumeStun(e);
    const stillThere = e.statusEffects.some(s => s.id === 'stun');
    const r3 = consumeStun(e);
    return { r1, turnsAfter1, r2, stillThere, r3 };
  });
  console.log('  T3 consume:', t3);
  assert(t3.r1 === true && t3.turnsAfter1 === 1, 'consumeStun #1 invalide');
  assert(t3.r2 === true && t3.stillThere === false, 'stun non retiré à turns=0');
  assert(t3.r3 === false, 'consumeStun doit retourner false sans stun');

  // T4 : un ennemi étourdi saute son tour (aucun dégât au groupe)
  const t4 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.statusEffects = [];
    e.atk = 60;                       // dégât évident s'il agissait
    applyStatus(e, 'stun', 0, 1);
    party[0].statusEffects = [];
    const hpBefore = party[0].hp;
    enemyTurn();
    return {
      hpBefore, hpAfter: party[0].hp,
      stunGone: !e.statusEffects.some(s => s.id === 'stun')
    };
  });
  console.log('  T4 enemy :', t4);
  assert(t4.hpAfter === t4.hpBefore, 'ennemi étourdi a quand même frappé');
  assert(t4.stunGone,                'stun ennemi non consommé');

  // T5 : les 4 nouveaux monstres existent et portent une capacité stun
  const t5 = await page.evaluate(() => {
    const ids = ['lutin_cornouailles', 'strangulot', 'pitiponk', 'gargouille'];
    return ids.map(id => {
      const m = MONSTERS.find(x => x.id === id);
      if (!m) return { id, found: false };
      const stunAb = (m.abilities || []).find(a => a.effect === 'status' && a.statusId === 'stun');
      const pool = MONSTERS.filter(x =>
        x.minFloor <= m.minFloor && (x.maxFloor == null || x.maxFloor >= m.minFloor));
      return {
        id, found: true,
        hasStun: !!stunAb,
        turns: stunAb?.turns,
        inPool: pool.some(x => x.id === id)
      };
    });
  });
  console.log('  T5 monstres:', t5);
  t5.forEach(m => {
    assert(m.found,   `monstre ${m.id} absent de MONSTERS`);
    assert(m.hasStun, `monstre ${m.id} sans capacité stun`);
    assert(m.turns >= 1, `monstre ${m.id} : turns de stun invalide`);
    assert(m.inPool,  `monstre ${m.id} absent du pool de son étage`);
  });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Stun OK (statut + saut de tour + 4 monstres porteurs)');
  await browser.close();
}

async function scenarioCombatExtV2() {
  console.log('\n── Scénario : Extensions combat V2 (counter / double-garde / Ferula Maxima / dispel) ──');

  // ─── Bloc solo : counter, double-garde, dispel, monstres ──────
  {
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 1, heroes: ['harry'] });
    await startDummyFight(page, { hp: 300 });

    // A1 — Garde counter-attack : la riposte touche l'ennemi.
    const counterHit = await page.evaluate(() => {
      currentBattleChar = 0;
      enemyGroup.length = 1;
      const e = enemyGroup[0];
      e.abilities = []; e.atk = 10; e.def = 0; e.currentHp = 300;
      party[0].hp = 200; party[0].hpMax = 200; party[0].def = 0;
      party[0].atk = 20; party[0].dodgeChance = 0; party[0].counterChance = 0;
      shieldTurns = [0, 0]; guardTurns = [1, 0];
      const before = e.currentHp;
      const orig = Math.random;
      Math.random = () => 0.05;        // roll counter = 5 % < 30 % → riposte
      enemyTurn();
      Math.random = orig;
      return { before, after: e.currentHp };
    });
    assert(counterHit.after < counterHit.before,
      `counter : ennemi non touché par la riposte (${counterHit.before}→${counterHit.after})`);

    // A2 — Pas de riposte quand le tirage échoue.
    const counterMiss = await page.evaluate(() => {
      currentBattleChar = 0;
      const e = enemyGroup[0];
      e.abilities = []; e.atk = 10; e.def = 0; e.currentHp = 300;
      party[0].hp = 200; party[0].def = 0; party[0].dodgeChance = 0;
      party[0].counterChance = 0;
      shieldTurns = [0, 0]; guardTurns = [1, 0];
      const before = e.currentHp;
      const orig = Math.random;
      Math.random = () => 0.95;        // roll counter = 95 % ≥ 30 % → pas de riposte
      enemyTurn();
      Math.random = orig;
      return { before, after: e.currentHp };
    });
    assert(counterMiss.after === counterMiss.before,
      `counter : riposte déclenchée alors que le tirage échoue (${counterMiss.before}→${counterMiss.after})`);

    // B1 — Double-Garde : battleAction('guard') empile, plafond 3.
    const stack = await page.evaluate(() => {
      const origET = enemyTurn;
      enemyTurn = () => {};            // neutralise le segment ennemi
      currentBattleChar = 0;
      guardTurns = [0, 0];
      party[0].sp = 0; party[0].mag = 10; party[0].spMax = 50;
      battleAction('guard'); const g1 = guardTurns[0]; const sp1 = party[0].sp;
      currentBattleChar = 0; battleAction('guard'); const g2 = guardTurns[0];
      currentBattleChar = 0; battleAction('guard'); const g3 = guardTurns[0];
      currentBattleChar = 0; battleAction('guard'); const g4 = guardTurns[0];
      enemyTurn = origET;
      return { g1, g2, g3, g4, sp1 };
    });
    assert(stack.g1 === 1, `1re garde attendue 1, obtenu ${stack.g1}`);
    assert(stack.g2 === 2, `2e garde attendue 2, obtenu ${stack.g2}`);
    assert(stack.g3 === 3, `3e garde attendue 3, obtenu ${stack.g3}`);
    assert(stack.g4 === 3, `garde plafonnée à 3, obtenu ${stack.g4}`);
    assert(stack.sp1 >= 3, `regen PM attendue ≥ 3 à la pose, obtenu ${stack.sp1}`);

    // B2 — Un coup mitigé consomme un seul palier (stack 2 → 1).
    const consume = await page.evaluate(() => {
      currentBattleChar = 0;
      const e = enemyGroup[0];
      e.abilities = []; e.atk = 10; e.def = 99; e.currentHp = 300;
      party[0].hp = 200; party[0].hpMax = 200; party[0].def = 0;
      party[0].dodgeChance = 0; party[0].counterChance = 0;
      shieldTurns = [0, 0]; guardTurns = [2, 0];
      const hpBefore = party[0].hp;
      const orig = Math.random;
      Math.random = () => 0;           // coup déterministe : dmg 10 → mitigé 5
      enemyTurn();
      Math.random = orig;
      return { guard: guardTurns[0], dmg: hpBefore - party[0].hp };
    });
    assert(consume.guard === 1, `palier de garde attendu 1 après 1 coup, obtenu ${consume.guard}`);
    assert(consume.dmg === 5,   `mitigation 50 % attendue (10→5), obtenu ${consume.dmg}`);

    // D1 — Ennemi dispel : priorité shield > guard > regen.
    const dispel = await page.evaluate(() => {
      const e = enemyGroup[0];
      e.abilities = [{ name: 'Dissipe', icon: '❌', effect: 'dispel', chance: 1,
                       targets: ['shield', 'guard', 'regen'] }];
      shieldTurns = [2, 0]; guardTurns = [1, 0];
      party[0].statusEffects = [{ id: 'regen', power: 5, turns: 3, icon: '🩹' }];
      const snap = () => ({ shield: shieldTurns[0], guard: guardTurns[0],
                            regen: party[0].statusEffects.length });
      const r1 = tryEnemyAbility(e, party[0], 0, () => {}); const a1 = snap();
      const r2 = tryEnemyAbility(e, party[0], 0, () => {}); const a2 = snap();
      const r3 = tryEnemyAbility(e, party[0], 0, () => {}); const a3 = snap();
      const r4 = tryEnemyAbility(e, party[0], 0, () => {});  // plus rien
      return { r1, a1, r2, a2, r3, a3, r4 };
    });
    assert(dispel.r1 && dispel.a1.shield === 0 && dispel.a1.guard === 1 && dispel.a1.regen === 1,
      `dispel #1 doit retirer le bouclier en priorité (${JSON.stringify(dispel.a1)})`);
    assert(dispel.r2 && dispel.a2.guard === 0,
      `dispel #2 doit retirer la garde (${JSON.stringify(dispel.a2)})`);
    assert(dispel.r3 && dispel.a3.regen === 0,
      `dispel #3 doit retirer la régénération (${JSON.stringify(dispel.a3)})`);
    assert(dispel.r4 === false,
      'dispel sans buff doit renvoyer false (attaque normale)');

    // D2 — Heuristique anti-stalling : weaken biaisé sous Double-Garde.
    const bias = await page.evaluate(() => {
      const e = enemyGroup[0];
      e.abilities = [{ name: 'Sape', icon: '🛡️↓', effect: 'weaken',
                       power: 3, chance: 0.5, turns: 2 }];
      const orig = Math.random;
      // roll 0.6 : échoue 0.5 sans bonus, passe 0.75 (= 0.5×1.5) sous garde ≥ 2.
      guardTurns = [2, 0]; party[0].def = 10; party[0].statusEffects = [];
      Math.random = () => 0.6;
      const guarded = tryEnemyAbility(e, party[0], 0, () => {});
      guardTurns = [0, 0]; party[0].def = 10; party[0].statusEffects = [];
      Math.random = () => 0.6;
      const plain = tryEnemyAbility(e, party[0], 0, () => {});
      Math.random = orig;
      return { guarded, plain };
    });
    assert(bias.guarded === true,  'weaken doit être biaisé (déclenché) sous Double-Garde');
    assert(bias.plain === false,   'weaken ne doit pas se déclencher hors Double-Garde');

    // E1 — Les 3 ennemis ciblés portent une capacité dispel.
    const enemies = await page.evaluate(() => {
      return ['mangemort_elite', 'bellatrix', 'voldemort_revenu'].map(id => {
        const m = MONSTERS.find(x => x.id === id);
        return { id, has: !!(m && (m.abilities || []).some(a => a.effect === 'dispel')) };
      });
    });
    enemies.forEach(m => assert(m.has, `${m.id} sans capacité dispel`));

    // E2 — livre_ferula existe et enseigne Ferula.
    const book = await page.evaluate(() => {
      const it = ITEMS.find(i => i.id === 'livre_ferula');
      return { found: !!it, type: it && it.type, spell: it && it.spell };
    });
    assert(book.found && book.type === 'spellbook' && book.spell === 'Ferula',
      'livre_ferula absent ou mal configuré');

    if (errors.length) {
      errors.forEach(e => console.log('  ⚠️ ', e));
      throw new Error(`${errors.length} erreurs JS détectées (combat V2 solo)`);
    }
    await browser.close();
  }

  // ─── Bloc duo : Ferula Maxima (régén AOE) ─────────────────────
  {
    const ctx = await launchGame();
    await startNewGame(ctx.page, { partySize: 2, heroes: ['harry', 'hermione'] });
    await startDummyFight(ctx.page, { hp: 80 });

    // C1 — Ferula Maxima dans SPELLS + apprentissage Hermione niveau 7.
    const spellDef = await ctx.page.evaluate(() => {
      const s = SPELLS.find(x => x.name === 'Ferula Maxima');
      return { found: !!s, effect: s && s.effect };
    });
    assert(spellDef.found && spellDef.effect === 'support_regen_aoe',
      'Ferula Maxima absent de SPELLS ou mal routé');

    // C2 — Cast : le statut regen_ferula_max touche les DEUX alliés.
    const cast = await ctx.page.evaluate(() => {
      currentBattleChar = 0;
      party[0].spells.push('Ferula Maxima');
      party[0].sp = 30; party[0].mag = 10; party[0].spMax = 40;
      party[0].int = 24; party[0].end = 16;   // scaling atténué : +2 +1
      party[0].hp = 10; party[0].hpMax = 50;
      party[1].hp = 10; party[1].hpMax = 50; party[1].sp = 5; party[1].spMax = 40;
      party[0].statusEffects = []; party[1].statusEffects = [];
      castSpellInBattle('Ferula Maxima', 0);
      const s0 = (party[0].statusEffects || []).find(s => s.id === 'regen_ferula_max');
      const s1 = (party[1].statusEffects || []).find(s => s.id === 'regen_ferula_max');
      return { s0: s0 ? s0.turns : 0, s1: s1 ? s1.turns : 0, sp: party[0].sp };
    });
    assert(cast.s0 === 3, `Ferula Maxima : Harry sans régén 3 tours (${cast.s0})`);
    assert(cast.s1 === 3, `Ferula Maxima : Hermione sans régén 3 tours (${cast.s1})`);
    assert(cast.sp === 18, `PM attendus 30−12=18 après cast, obtenu ${cast.sp}`);

    // C3 — Tick : chaque allié récupère PV (power 1 + INT/12 + END/16
    //      du lanceur = 1+2+1 = 4) + 2 PM.
    const tick = await ctx.page.evaluate(() => {
      party[1].hp = 10; party[1].sp = 5;
      const hpB = party[1].hp, spB = party[1].sp;
      tickStatuses(party[1], false);
      return { dHp: party[1].hp - hpB, dSp: party[1].sp - spB };
    });
    assert(tick.dHp === 4, `tick Ferula Maxima : +4 PV attendu (scaling), obtenu +${tick.dHp}`);
    assert(tick.dSp === 2, `tick Ferula Maxima : +2 PM attendu, obtenu +${tick.dSp}`);

    if (ctx.errors.length) {
      ctx.errors.forEach(e => console.log('  ⚠️ ', e));
      throw new Error(`${ctx.errors.length} erreurs JS détectées (Ferula Maxima)`);
    }
    await ctx.browser.close();
  }

  console.log('  ✅ Extensions combat V2 conformes');
}

async function scenarioEnemyAiAndBossPhases() {
  console.log('\n── Scénario : IA ennemie + phases de boss ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
  await startDummyFight(page, { hp: 100 });

  // T1 — _chooseEnemyTarget : 'aggressive' vise les PV les plus bas.
  const t1 = await page.evaluate(() => {
    const alive = [
      { name: 'A', hp: 30, atk: 5 },
      { name: 'B', hp: 8,  atk: 12 }
    ];
    const aggr = _chooseEnemyTarget({ ai: 'aggressive' }, alive);
    const caut = _chooseEnemyTarget({ ai: 'cautious' },   alive);
    return { aggr: aggr.name, caut: caut.name };
  });
  console.log('  T1 ciblage:', t1);
  assert(t1.aggr === 'B', 'aggressive doit viser la cible la plus basse en PV');
  assert(t1.caut === 'B', 'cautious doit viser la plus haute ATK (B)');

  // T2 — choix de capacité : un ennemi 'cautious' à bas PV se soigne plutôt
  // que d'attaquer, quand heal et damage réussissent tous deux leur jet.
  const t2 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.ai = 'cautious';
    e.hp = 100; e.currentHp = 20; e.mag = 0;
    e.abilities = [
      { name: 'Frappe', icon: '⚔️', effect: 'damage', power: 10, chance: 1 },
      { name: 'Soin',   icon: '💚', effect: 'heal',   power: 15, chance: 1 }
    ];
    party[0].hp = 100; party[0].hpMax = 100;
    const beforeEnemy = e.currentHp, beforeAlly = party[0].hp;
    const orig = Math.random; Math.random = () => 0.01;  // tous les jets réussissent
    tryEnemyAbility(e, party[0], 0, () => {});
    Math.random = orig;
    return { healed: e.currentHp > beforeEnemy, allyHurt: party[0].hp < beforeAlly };
  });
  console.log('  T2 choix  :', t2);
  assert(t2.healed,    'cautious à bas PV doit se soigner');
  assert(!t2.allyHurt, 'cautious à bas PV ne doit pas frapper l\'allié quand il peut se soigner');

  // T3 — _checkBossPhases : enrage + gain de capacité au seuil, une seule fois.
  const t3 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.atk = 20; e.hp = 100; e.currentHp = 100;
    e.abilities = [];
    e._phaseIdx = 0;
    e.phases = [
      { atPct: 0.5, atkMult: 2,
        gainAbility: { name: 'Rage', icon: '😱', effect: 'status', statusId: 'fear', power: 0, chance: 0.5, turns: 2 } }
    ];
    // Au-dessus du seuil : rien.
    const above = _checkBossPhases(e);
    // Sous le seuil : déclenche.
    e.currentHp = 40;
    const fire1 = _checkBossPhases(e);
    const atkAfter = e.atk, abilCount = e.abilities.length, idx = e._phaseIdx;
    // Re-appel : ne re-déclenche pas.
    const fire2 = _checkBossPhases(e);
    return {
      aboveEmpty: above === '',
      fired: fire1.length > 0,
      atkAfter, abilCount, idx,
      noRetrigger: fire2 === '' && e.atk === atkAfter
    };
  });
  console.log('  T3 phases :', t3);
  assert(t3.aboveEmpty,    'aucune phase ne doit se déclencher au-dessus du seuil');
  assert(t3.fired,         'la phase doit se déclencher sous le seuil');
  assert(t3.atkAfter === 40, `enrage atkMult×2 attendu 40, obtenu ${t3.atkAfter}`);
  assert(t3.abilCount === 1, 'la phase doit ajouter une capacité');
  assert(t3.idx === 1,       '_phaseIdx doit avancer à 1');
  assert(t3.noRetrigger,     'la phase ne doit pas se re-déclencher');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (IA / phases)`);
  }
  console.log('  ✅ IA ennemie (ciblage + choix) + phases de boss OK');
  await browser.close();
}

async function scenarioEnemyAbilityArchetypes() {
  console.log('\n── Scénario : archétypes de capacités (summon / enrage / aura) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
  await startDummyFight(page, { hp: 100 });

  // T1 — summon : slot libre → l'add rejoint enemyGroup ; slot plein
  // (MAX_ENEMY_GROUP) → tryEnemyAbility retourne false, taille inchangée.
  const t1 = await page.evaluate(() => {
    currentFloor = 9;
    const summoner = enemyGroup[0];
    summoner.abilities = [
      { name: 'Couvée', icon: '🥚', effect: 'summon', summonId: 'acromantula_jeune', chance: 1 }
    ];
    summoner.ai = 'random';
    const before = enemyGroup.length;
    const orig = Math.random; Math.random = () => 0.5;  // jet OK, pas de shiny
    let ret1, ret2;
    try {
      ret1 = tryEnemyAbility(summoner, party[0], 0, () => {});
      const afterSummon = enemyGroup.length;
      const lastSummoned = !!enemyGroup[afterSummon - 1]._summoned;
      // Remplir jusqu'au plafond contextuel (3 ici : étage 9 duo non
      // post-victoire) puis retenter — slot plein.
      const cap = currentMaxGroupSize();
      while (enemyGroup.length < cap) enemyGroup.push({ name: 'X', hp: 1, currentHp: 1, atk: 1, statusEffects: [] });
      const full = enemyGroup.length;
      ret2 = tryEnemyAbility(summoner, party[0], 0, () => {});
      const afterFull = enemyGroup.length;
      return { before, afterSummon, ret1, full, ret2, afterFull, lastSummoned };
    } finally { Math.random = orig; }
  });
  console.log('  T1 summon :', t1);
  assert(t1.ret1 === true,                  'summon doit réussir (slot libre)');
  assert(t1.afterSummon === t1.before + 1,  'summon doit ajouter un ennemi');
  assert(t1.lastSummoned,                   'l\'add doit porter le marqueur _summoned');
  assert(t1.ret2 === false,                 'summon slot plein (cap) → return false');
  assert(t1.afterFull === t1.full,          'slot plein → enemyGroup inchangé');

  // T2 — enrage_self : au-dessus du seuil = pas d'enrage ; sous le seuil =
  // +ATK une seule fois (flag _enraged), pas de re-déclenchement.
  const t2 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.hp = 100; e.atk = 20; e._enraged = false;
    e.abilities = [
      { name: 'Rage', icon: '🌑', effect: 'enrage_self', hpPct: 0.4, atkBonus: 12, chance: 1 }
    ];
    e.ai = 'aggressive';
    const orig = Math.random; Math.random = () => 0.01;
    try {
      // Au-dessus du seuil (80 %) → return false, ATK inchangée.
      e.currentHp = 80;
      const retHigh = tryEnemyAbility(e, party[0], 0, () => {});
      const atkHigh = e.atk;
      // Sous le seuil (30 %) → enrage, +12 ATK.
      e.currentHp = 30;
      const retLow = tryEnemyAbility(e, party[0], 0, () => {});
      const atkLow = e.atk, enraged = e._enraged;
      // Re-appel sous le seuil → déjà enragé, return false, ATK stable.
      const retAgain = tryEnemyAbility(e, party[0], 0, () => {});
      const atkAgain = e.atk;
      return { retHigh, atkHigh, retLow, atkLow, enraged, retAgain, atkAgain };
    } finally { Math.random = orig; }
  });
  console.log('  T2 enrage :', t2);
  assert(t2.retHigh === false && t2.atkHigh === 20, 'au-dessus du seuil : pas d\'enrage');
  assert(t2.retLow === true && t2.atkLow === 32,    'sous le seuil : +12 ATK');
  assert(t2.enraged === true,                       '_enraged doit être posé');
  assert(t2.retAgain === false && t2.atkAgain === 32,'enrage ne se re-déclenche pas');

  // T3 — aura : debuff de groupe weaken appliqué à TOUS les héros vivants.
  const t3 = await page.evaluate(() => {
    party.forEach(c => { c.statusEffects = []; });
    party[0].hp = 50; party[0].def = 10;
    party[1].hp = 50; party[1].def = 8;
    const e = enemyGroup[0];
    e.abilities = [
      { name: 'Litanie', icon: '📯', effect: 'aura', statusId: 'weaken', power: 3, turns: 3, chance: 1 }
    ];
    e.ai = 'random';
    const orig = Math.random; Math.random = () => 0.01;
    try {
      const ret = tryEnemyAbility(e, party[0], 0, () => {});
      return {
        ret,
        h0Weak: party[0].statusEffects.some(s => s.id === 'weaken'),
        h1Weak: party[1].statusEffects.some(s => s.id === 'weaken'),
        h0Def: party[0].def, h1Def: party[1].def
      };
    } finally { Math.random = orig; }
  });
  console.log('  T3 aura   :', t3);
  assert(t3.ret === true,            'aura doit s\'appliquer');
  assert(t3.h0Weak && t3.h1Weak,     'aura weaken doit toucher les 2 héros');
  assert(t3.h0Def === 7 && t3.h1Def === 5, 'aura weaken doit retirer 3 DEF à chaque héros');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (archétypes B3)`);
  }
  console.log('  ✅ archétypes summon / enrage_self / aura OK');
  await browser.close();
}

async function scenarioDeathPetrify() {
  console.log('\n── Scénario : pétrification de la mort (C2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // P1 — déclenche une mort normale : pas d'Ironman, pas d'astral.
  const p1 = await page.evaluate(() => {
    ironmanMode = false;
    if (typeof inAstralCombat !== 'undefined') inAstralCombat = false;
    document.getElementById('death-screen').style.display = 'none';
    party.forEach(c => { c.hp = 0; });
    triggerDeath('Le groupe a été pétrifié...');
    return {
      petrify:     !!document.getElementById('cfx-petrify'),
      deathImmediate: document.getElementById('death-screen').style.display === 'flex',
    };
  });
  console.log('  P1 mort  :', p1);
  assert(p1.petrify, 'P1 #cfx-petrify non monté en mort normale');
  // Le module FX étant présent (non reduced-motion en headless), l'écran est
  // différé — il ne doit donc PAS être déjà visible juste après l'appel.
  assert(!p1.deathImmediate, 'P1 death-screen ne doit pas s\'afficher avant la pétrification');

  // P2 — l'écran de mort apparaît après le délai de pétrification.
  await page.waitForFunction(
    () => document.getElementById('death-screen').style.display === 'flex',
    { timeout: 3000 }
  );
  const p2 = await page.evaluate(() => ({
    deathVisible: document.getElementById('death-screen').style.display === 'flex',
    msg: document.getElementById('death-msg').textContent,
  }));
  console.log('  P2 écran :', p2);
  assert(p2.deathVisible, 'P2 death-screen doit s\'afficher après la pétrification');
  assert(p2.msg.includes('pétrifié'), 'P2 death-msg doit porter le message');

  // P3 — résurrection : death-screen caché + voile résiduel nettoyé.
  const p3 = await page.evaluate(() => {
    resurrect();
    return {
      deathHidden: document.getElementById('death-screen').style.display === 'none',
      petrifyGone: !document.getElementById('cfx-petrify'),
    };
  });
  console.log('  P3 resurr:', p3);
  assert(p3.deathHidden, 'P3 resurrect doit cacher le death-screen');
  assert(p3.petrifyGone, 'P3 resurrect doit retirer un #cfx-petrify résiduel');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario pétrification mort');
  }
  console.log('  ✅ pétrification de la mort (C2) OK');
  await browser.close();
}

async function scenarioLargeEnemyGroup() {
  console.log('\n── Scénario : gros groupes ennemis (4-5) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });

  // T1 — gating : solo OU non-endgame ne dépasse jamais 3.
  const gate = await page.evaluate(() => {
    const sample = (cfg) => {
      partySize      = cfg.partySize;
      currentFloor   = cfg.floor;
      victoryAchieved = cfg.victory;
      floorKillCount = new Map([[cfg.floor, cfg.kills]]);
      let max = 0;
      for (let i = 0; i < 4000; i++) max = Math.max(max, rollGroupSize());
      return max;
    };
    const soloEndgame = sample({ partySize: 1, floor: 12, victory: true,  kills: 80 });
    const capSolo     = currentMaxGroupSize();   // contexte solo endgame
    const duoEarly    = sample({ partySize: 2, floor: 8,  victory: false, kills: 80 });
    const capDuoEarly = currentMaxGroupSize();   // contexte duo non post-victoire
    const duoEndgame  = sample({ partySize: 2, floor: 12, victory: true,  kills: 80 });
    const capDuoEnd   = currentMaxGroupSize();   // contexte duo endgame
    return { soloEndgame, duoEarly, duoEndgame, cap: MAX_ENEMY_GROUP, capSolo, capDuoEarly, capDuoEnd };
  });
  console.log('  gating :', gate);
  assert(gate.cap === 5, 'MAX_ENEMY_GROUP attendu = 5');
  assert(gate.soloEndgame <= 3, 'solo ne doit jamais dépasser 3 ennemis');
  assert(gate.duoEarly    <= 3, 'duo hors post-victoire ne doit pas dépasser 3');
  assert(gate.duoEndgame  >= 4, 'duo endgame doit parfois produire 4-5 ennemis');
  // Plafond contextuel partagé (spawn + invocations) : 3 hors endgame+duo.
  assert(gate.capSolo     === 3, 'plafond solo endgame doit rester 3 (invocations incluses)');
  assert(gate.capDuoEarly === 3, 'plafond duo non post-victoire doit rester 3');
  assert(gate.capDuoEnd   === 5, 'plafond duo endgame doit être 5');

  // T2 — rendu + sélection de cible + dégâts flottants pour 5 ennemis.
  const render = await page.evaluate(() => {
    const mk = (i) => ({
      id: 'big_' + i, name: 'Ombre ' + i, icon: '👤',
      hp: 30, currentHp: 30, atk: 3, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [],
      statusEffects: [], desc: 'Test'
    });
    inBattle = true;
    enemyGroup = [0,1,2,3,4].map(mk);
    renderEnemyGroup();
    showTargetSelection('attack');
    const cards = document.querySelectorAll('#enemy-group .enemy-card').length;
    const last  = !!document.getElementById('enemy-card-4');
    const btns  = document.querySelectorAll('#target-buttons button').length;
    let floatOk = true;
    try { if (window.UX) UX.floatDmg('enemy:4', 7, 'dmg'); } catch (e) { floatOk = false; }
    return { cards, last, btns, floatOk };
  });
  console.log('  rendu :', render);
  assert(render.cards === 5, '5 cartes ennemies attendues');
  assert(render.last,        'carte enemy-card-4 absente');
  assert(render.btns  === 5, '5 boutons de cible attendus');
  assert(render.floatOk,     'floatDmg enemy:4 a levé une erreur');

  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS (gros groupes)'); }
  console.log('  ✅ gros groupes ennemis (gating + rendu 5 + cibles) OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioStatusEffects, scenarioWeakenAndProtegoBadges, scenarioBruteCrush, scenarioStatRework, scenarioFortuneStat, scenarioAgiCelerite, scenarioDuoStatuses, scenarioCritDodge, scenarioHpSpMaxBonus, scenarioCritBonusMultiplier, scenarioGuardAndFerula, scenarioCombatBuffs, scenarioLegilimensEscalation, scenarioStun, scenarioCombatExtV2, scenarioEnemyAiAndBossPhases, scenarioEnemyAbilityArchetypes, scenarioDeathPetrify, scenarioLargeEnemyGroup] };
