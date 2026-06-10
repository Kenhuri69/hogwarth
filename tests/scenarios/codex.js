// ============================================================
// Scénarios smoke — domaine « codex » (Chapitre 12, Lots 1-3)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

// La modale Codex s'ouvre, affiche des entrées, et la fiche détaillée se rend.
async function scenarioCodexOpen() {
  console.log('\n── Scénario : Codex — ouverture & rendu ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Registre + helpers présents (Lot 1).
  const wired = await page.evaluate(() => ({
    entries:    Array.isArray(CODEX_ENTRIES) && CODEX_ENTRIES.length > 0,
    getFn:      typeof getCodexEntry === 'function',
    stateFn:    typeof codexEntryState === 'function',
    openFn:     typeof openCodex === 'function',
    checkFn:    typeof checkCodexUnlocks === 'function',
    cle:        !!(typeof getCodexEntry === 'function' && getCodexEntry('cle_de_voute')),
  }));
  console.log('  wired :', wired);
  assert(wired.entries && wired.getFn && wired.stateFn, 'registre/helpers Codex absents');
  assert(wired.openFn && wired.checkFn, 'UI Codex non câblée');
  assert(wired.cle, 'entrée cle_de_voute absente du registre');

  // Ouverture de la modale + grille peuplée pour la section Histoire.
  const opened = await page.evaluate(() => {
    openCodex();
    const modal = document.getElementById('codex-modal');
    const grid  = document.getElementById('codex-grid');
    return {
      visible: modal && modal.style.display === 'flex',
      cards:   grid ? grid.querySelectorAll('.codex-card').length : 0,
    };
  });
  console.log('  opened :', opened);
  assert(opened.visible, 'modale Codex non visible après openCodex()');
  assert(opened.cards > 0, 'aucune carte dans la section Histoire');

  // À l'étage 1, la Clé de Voûte est ouverte (veiled) → fiche cliquable.
  const detail = await page.evaluate(() => {
    showCodexEntry('cle_de_voute');
    const panel = document.getElementById('codex-detail-panel');
    const body  = document.getElementById('codex-detail');
    return {
      open:  panel && panel.style.display === 'block',
      hasText: body && body.textContent.includes('Clé de Voûte'),
    };
  });
  console.log('  detail :', detail);
  assert(detail.open,    'fiche détaillée non affichée');
  assert(detail.hasText, 'fiche détaillée vide');

  // Bascule de section sans erreur (section vide = placeholder, pas de crash).
  const switched = await page.evaluate(() => {
    switchCodexSection('personnages'); // vide en Lots 1-3
    const grid = document.getElementById('codex-grid');
    return grid ? grid.innerHTML.length > 0 : false;
  });
  assert(switched, 'section vide ne rend pas de placeholder');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (codex open)`);
  }
  console.log('  ✅ Codex s\'ouvre et se rend correctement');
  await browser.close();
}

// Une entrée se déverrouille / révèle quand son robinet est satisfait
// (étage, éclat, victoire) et la notification est mise en file.
async function scenarioCodexUnlockOnFloor() {
  console.log('\n── Scénario : Codex — déverrouillage live ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Au démarrage (étage 1), la Clé de Voûte doit être ouverte (veiled).
  const atStart = await page.evaluate(() => ({
    cleOpen: unlockedCodexEntries.has('cle_de_voute'),
    froid:   unlockedCodexEntries.has('froid_surnaturel'),
  }));
  console.log('  start :', atStart);
  assert(atStart.cleOpen, 'cle_de_voute non ouverte au démarrage (étage 1)');
  assert(!atStart.froid,  'froid_surnaturel ne devrait s\'ouvrir qu\'à l\'étage 2');

  // Simule l'arrivée à l'étage 2 → froid_surnaturel s'ouvre via le robinet floor.
  const atFloor2 = await page.evaluate(() => {
    currentFloor = 2;
    checkCodexUnlocks('floor-down');
    return {
      froid:   unlockedCodexEntries.has('froid_surnaturel'),
      reached: floorReached,
    };
  });
  console.log('  floor2 :', atFloor2);
  assert(atFloor2.froid, 'froid_surnaturel non ouverte à l\'étage 2');
  assert(atFloor2.reached >= 2, 'floorReached non mis à jour');

  // Robinet Éclat : 3 eclat_voute en inventaire → cle_de_voute passe revealed.
  const revealed = await page.evaluate(() => {
    const eclat = ITEMS.find(i => i.id === 'eclat_voute');
    player.inventory.push({ ...eclat }, { ...eclat }, { ...eclat });
    checkCodexUnlocks('eclat-pickup');
    const ctx = _codexContext();
    return {
      state:    codexEntryState(getCodexEntry('cle_de_voute'), ctx),
      revealMark: unlockedCodexEntries.has('cle_de_voute#revealed'),
    };
  });
  console.log('  revealed :', revealed);
  assert(revealed.state === 'revealed', `cle_de_voute devrait être révélée (état: ${revealed.state})`);
  assert(revealed.revealMark, 'marqueur de révélation non mémorisé');

  // Robinet victoire : Boucle Ténébreuse s'ouvre quand victoryAchieved.
  const boucle = await page.evaluate(() => {
    victoryAchieved = true;
    checkCodexUnlocks('victory');
    return unlockedCodexEntries.has('boucle_tenebreuse');
  });
  assert(boucle, 'boucle_tenebreuse non ouverte après victoire');

  // Persistance : unlockedCodexEntries + floorReached survivent à un cycle save/load.
  const persisted = await page.evaluate(() => {
    const gs = _serializeState();
    // Réinitialise puis ré-applique.
    unlockedCodexEntries = new Set();
    floorReached = 1;
    _applyState(gs);
    return {
      cle:     unlockedCodexEntries.has('cle_de_voute'),
      reached: floorReached,
    };
  });
  console.log('  persisted :', persisted);
  assert(persisted.cle, 'unlockedCodexEntries non sérialisé');
  assert(persisted.reached >= 2, 'floorReached non sérialisé');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (codex unlock)`);
  }
  console.log('  ✅ Déverrouillage live + persistance OK');
  await browser.close();
}

// Lot 6 : échos zone D live + états corrompus (CODEX phares + bestiaire).
async function scenarioCodexCorrupted() {
  console.log('\n── Scénario : Codex — échos live & états corrompus (Lot 6) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Robinet `echo` live : percevoir un écho de voix ouvre l'entrée associée.
  const echoLive = await page.evaluate(() => {
    seenEchoes.add('echo_godric');
    checkCodexUnlocks('echo-seen');
    return {
      open: unlockedCodexEntries.has('voix_godric'),
      state: codexEntryState(getCodexEntry('voix_godric'), _codexContext()),
    };
  });
  console.log('  echoLive :', echoLive);
  assert(echoLive.open, 'voix_godric non ouverte après écho perçu');
  assert(echoLive.state === 'veiled', `voix_godric devrait être veiled (${echoLive.state})`);

  // État corrompu d'une entrée-phare : Clé de Voûte révélée (3 éclats) +
  // zone D (étage 14) → bascule corrupted, et la fiche rend le corps corrompu.
  const corrupted = await page.evaluate(() => {
    const eclat = ITEMS.find(i => i.id === 'eclat_voute');
    player.inventory.push({ ...eclat }, { ...eclat }, { ...eclat });
    currentFloor = 14; floorReached = 14;
    const st = codexEntryState(getCodexEntry('cle_de_voute'), _codexContext());
    openCodex();
    switchCodexSection('histoire');
    showCodexEntry('cle_de_voute');
    const body = document.querySelector('#codex-detail .codex-detail-body');
    return {
      state: st,
      bodyCorrupted: body && body.className.includes('codex-body-corrupted'),
      text: body ? body.textContent.slice(0, 40) : '',
    };
  });
  console.log('  corrupted :', corrupted);
  assert(corrupted.state === 'corrupted', `cle_de_voute devrait être corrupted (${corrupted.state})`);
  assert(corrupted.bodyCorrupted, 'le corps de la fiche n\'a pas la classe corrupted');

  // Variante corrompue d'une créature-phare (Détraqueur) en Boucle profonde.
  const beastCorrupt = await page.evaluate(() => {
    victoryAchieved = true; currentFloor = 16;
    seenMonsters.add('detraqueur');
    monsterKills.detraqueur = 2;
    const m = MONSTERS.find(x => x.id === 'detraqueur');
    openBestiary();
    showMonsterDetail(m);
    const html = document.getElementById('bestiary-detail').innerHTML;
    return {
      hasCorruptedField: !!m.corruptedLore,
      shown: html.includes('Page retournée'),
    };
  });
  console.log('  beastCorrupt :', beastCorrupt);
  assert(beastCorrupt.hasCorruptedField, 'detraqueur.corruptedLore absent');
  assert(beastCorrupt.shown, 'variante corrompue du Détraqueur non affichée en Boucle profonde');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (codex corrupted)`);
  }
  console.log('  ✅ Échos live + états corrompus OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioCodexOpen, scenarioCodexUnlockOnFloor, scenarioCodexCorrupted] };
