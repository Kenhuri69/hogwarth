// ============================================================
// Scénarios smoke — domaine « audio » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioAdaptiveCombatMusic() {
  console.log('\n── Scénario : musique adaptative de combat (F1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // M1 — API présente
  const m1 = await page.evaluate(() => ({
    hasUpdate: typeof AudioSystem.updateCombatIntensity === 'function',
    hasFade:   typeof AudioSystem._fadeOutCombatLayer === 'function',
    hasKey:    'combat_normal' in AudioSystem._COMBAT_SAMPLES && 'tension' in AudioSystem._COMBAT_SAMPLES,
  }));
  console.log('  M1 api:', m1);
  assert(m1.hasUpdate && m1.hasFade, 'M1 updateCombatIntensity/_fadeOutCombatLayer absent');
  assert(m1.hasKey, 'M1 samples combat_normal/tension absents');

  // M2 — couche procédurale (_activeCombatKey null) : no-op, reste null.
  const m2 = await page.evaluate(() => {
    const A = AudioSystem; A.init();
    A.isMuted = false; A.musicPlaying = true; A.inCombat = true;
    A._activeCombatKey = null; A._combatGains = [];
    party[0].hp = Math.max(1, Math.floor(party[0].hpMax * 0.2)); // danger
    let threw = false; try { A.updateCombatIntensity(); } catch (e) { threw = true; }
    return { threw, key: A._activeCombatKey };
  });
  console.log('  M2 procédural:', m2);
  assert(!m2.threw, 'M2 updateCombatIntensity throw (procédural)');
  assert(m2.key === null, 'M2 ne doit pas swapper sur couche procédurale');

  // M3 — couche sample : injecte des buffers réels puis vérifie les swaps
  // selon les PV (full → combat_normal, danger → tension, soin → retour).
  const m3 = await page.evaluate(() => {
    const A = AudioSystem; A.init();
    const mk = () => A.ctx.createBuffer(1, Math.floor(A.ctx.sampleRate * 4), A.ctx.sampleRate);
    A._sampleBuffers['combat_normal'] = mk();
    A._sampleBuffers['tension']       = mk();
    A.isMuted = false; A.musicPlaying = true; A.inCombat = true;
    A._activeCombatKey = 'combat_normal'; A._combatGains = [];
    if (typeof enemyGroup !== 'undefined') enemyGroup = []; // pas d'epic
    const out = {};
    let threw = false;
    try {
      party.slice(0, partySize).forEach(c => { c.hp = c.hpMax; });
      A.updateCombatIntensity(); out.full = A._activeCombatKey;
      party[0].hp = Math.max(1, Math.floor(party[0].hpMax * 0.2));
      A.updateCombatIntensity(); out.danger = A._activeCombatKey;
      party.slice(0, partySize).forEach(c => { c.hp = c.hpMax; });
      A.updateCombatIntensity(); out.healed = A._activeCombatKey;
    } catch (e) { threw = true; }
    out.threw = threw;
    return out;
  });
  console.log('  M3 swaps:', m3);
  assert(!m3.threw, 'M3 updateCombatIntensity throw (sample)');
  assert(m3.full === 'combat_normal', `M3 full PV = combat_normal, got ${m3.full}`);
  assert(m3.danger === 'tension',      `M3 danger critique = tension, got ${m3.danger}`);
  assert(m3.healed === 'combat_normal', `M3 retour après soin = combat_normal, got ${m3.healed}`);

  // M4 — stopMusic réinitialise l'état adaptatif.
  const m4 = await page.evaluate(() => {
    AudioSystem.stopMusic();
    return { key: AudioSystem._activeCombatKey, gains: AudioSystem._combatGains.length };
  });
  console.log('  M4 stop:', m4);
  assert(m4.key === null && m4.gains === 0, 'M4 stopMusic ne réinitialise pas l\'état adaptatif');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario musique adaptative');
  }
  console.log('  ✅ musique adaptative de combat (F1) OK');
  await browser.close();
}

async function scenarioAmbientBarks() {
  console.log('\n── Scénario : barks ambiants d\'exploration (F2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // B1 — API présente
  const b1 = await page.evaluate(() => ({
    hasMaybe: typeof AudioSystem.maybeAmbientBark === 'function',
    hasPlay:  typeof AudioSystem._playBark === 'function',
    chance:   typeof AudioSystem._AMBIENT_BARK_CHANCE === 'number',
  }));
  console.log('  B1 api:', b1);
  assert(b1.hasMaybe && b1.hasPlay && b1.chance, 'B1 API bark absente');

  // B2 — gating : muet → false ; en combat → false (proba forcée à 1).
  const b2 = await page.evaluate(() => {
    const A = AudioSystem; A.init();
    A._AMBIENT_BARK_CHANCE = 1; A.inMenu = false;
    A.isMuted = true;  A.inCombat = false; const muted    = A.maybeAmbientBark(1);
    A.isMuted = false; A.inCombat = true;  const inCombat = A.maybeAmbientBark(1);
    A.inCombat = false;
    return { muted, inCombat };
  });
  console.log('  B2 gating:', b2);
  assert(b2.muted === false,    'B2 doit être muet quand isMuted');
  assert(b2.inCombat === false, 'B2 doit être silencieux en combat');

  // B3 — déclenchement sur les 4 zones (proba 1) : true + aucun throw.
  const b3 = await page.evaluate(() => {
    const A = AudioSystem; A.init();
    A._AMBIENT_BARK_CHANCE = 1; A.isMuted = false; A.inCombat = false; A.inMenu = false;
    let threw = false; const fired = [];
    try { [1, 5, 8, 14].forEach(f => fired.push(A.maybeAmbientBark(f))); }
    catch (e) { threw = true; }
    return { threw, fired };
  });
  console.log('  B3 zones:', b3);
  assert(!b3.threw, 'B3 maybeAmbientBark/_playBark throw');
  assert(b3.fired.every(x => x === true), 'B3 doit déclencher sur chaque zone (proba 1)');

  // B4 — probabilité 0 : ne déclenche jamais.
  const b4 = await page.evaluate(() => {
    AudioSystem._AMBIENT_BARK_CHANCE = 0;
    return AudioSystem.maybeAmbientBark(1);
  });
  console.log('  B4 chance0:', b4);
  assert(b4 === false, 'B4 proba 0 ne doit jamais déclencher');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario barks ambiants');
  }
  console.log('  ✅ barks ambiants d\'exploration (F2) OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioAdaptiveCombatMusic, scenarioAmbientBarks] };
