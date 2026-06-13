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

// Boucle Ténébreuse V1 (Chapitre 11) — loopNumber dérivé, compteur
// accumulatedEclats crédité au franchissement d'un nouvel étage de Boucle
// le plus profond (anti-farm), persistance, et entrée Codex Porteur d'Éclats.
async function scenarioDarkLoopV1() {
  console.log('\n── Scénario : Boucle Ténébreuse V1 — loopNumber / Éclats ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Helpers câblés + état initial neutre (pré-Boucle).
  const wired = await page.evaluate(() => ({
    loopFn:  typeof loopNumber === 'function',
    eclats:  typeof accumulatedEclats !== 'undefined',
    advFn:   typeof _maybeAdvanceDarkLoop === 'function',
    loop0:   typeof loopNumber === 'function' ? loopNumber(1) : -1,
    start:   accumulatedEclats,
  }));
  console.log('  wired :', wired);
  assert(wired.loopFn && wired.eclats && wired.advFn, 'helpers Boucle V1 absents');
  assert(wired.loop0 === 0, 'loopNumber(1) devrait être 0 (pré-Boucle)');
  assert(wired.start === 0, 'accumulatedEclats devrait démarrer à 0');

  // Hors Boucle (pré-victoire) : franchir un étage ne crédite aucun Éclat.
  const preVictory = await page.evaluate(() => {
    victoryAchieved = false; floorReached = 4;
    _maybeAdvanceDarkLoop(4, 5);
    return accumulatedEclats;
  });
  assert(preVictory === 0, 'aucun Éclat ne doit être crédité hors Boucle');

  // En Boucle : chaque NOUVEL étage le plus profond crédite +1 Éclat.
  const inLoop = await page.evaluate(() => {
    victoryAchieved = true; floorReached = 10;
    _maybeAdvanceDarkLoop(10, 11);  // entrée Boucle 1 (+1)
    floorReached = 11;
    _maybeAdvanceDarkLoop(11, 12);  // +1
    floorReached = 12;
    const afterTwo = accumulatedEclats;
    // Anti-farm : re-franchir un étage DÉJÀ atteint ne crédite rien.
    _maybeAdvanceDarkLoop(11, 12);  // 12 <= floorReached(12) → no-op
    const afterRefarm = accumulatedEclats;
    // Remontée → no-op.
    _maybeAdvanceDarkLoop(12, 11);
    return { afterTwo, afterRefarm, afterUp: accumulatedEclats, loop11: loopNumber(11), loop21: loopNumber(21) };
  });
  console.log('  inLoop :', inLoop);
  assert(inLoop.afterTwo === 2, `2 étages franchis = 2 Éclats (obtenu ${inLoop.afterTwo})`);
  assert(inLoop.afterRefarm === 2, 'le re-farming d\'un étage déjà atteint ne doit rien créditer');
  assert(inLoop.afterUp === 2, 'remonter ne doit rien créditer');
  assert(inLoop.loop11 === 1 && inLoop.loop21 === 2, 'loopNumber incorrect aux paliers');

  // Codex : Porteur d'Éclats s'ouvre après victoire, se révèle au seuil d'Éclats.
  const codex = await page.evaluate(() => {
    accumulatedEclats = 5;
    checkCodexUnlocks('eclat-loop');
    const ctx = _codexContext();
    return {
      ctxEclats: ctx.accumulatedEclats,
      open:  unlockedCodexEntries.has('porteur_eclats'),
      state: codexEntryState(getCodexEntry('porteur_eclats'), ctx),
    };
  });
  console.log('  codex :', codex);
  assert(codex.ctxEclats === 5, '_codexContext n\'expose pas accumulatedEclats');
  assert(codex.open, 'porteur_eclats non ouverte après victoire');
  assert(codex.state === 'revealed', `porteur_eclats devrait être révélée à 5 Éclats (${codex.state})`);

  // Persistance : accumulatedEclats survit à un cycle save/load.
  const persisted = await page.evaluate(() => {
    accumulatedEclats = 7;
    const gs = _serializeState();
    accumulatedEclats = 0;
    _applyState(gs);
    return accumulatedEclats;
  });
  assert(persisted === 7, 'accumulatedEclats non sérialisé/restauré');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (dark loop v1)`);
  }
  console.log('  ✅ Boucle V1 : loopNumber dérivé, Éclats anti-farm, Codex & persistance OK');
  await browser.close();
}

// Boucle Ténébreuse V2 (Chapitre 11 §11.8) — Variantes de Maison fortes :
// écho de signature en Boucle (accompli vs dette, étage 14, one-shot, déverrouille
// le Codex) + voix de héros par boucle (événement darkLoop, tension de Maison).
async function scenarioDarkLoopV2() {
  console.log('\n── Scénario : Boucle Ténébreuse V2 — écho signature / barks ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const wired = await page.evaluate(() => ({
    sigFn:  typeof maybeSignatureEchoBeat === 'function',
    getFn:  typeof getSignatureEchoBeat === 'function',
    barkFn: typeof heroBark === 'function',
    floor:  (typeof SIGNATURE_FLOOR !== 'undefined') ? SIGNATURE_FLOOR : null,
  }));
  console.log('  wired :', wired);
  assert(wired.sigFn && wired.getFn && wired.barkFn, 'helpers V2 absents');
  assert(wired.floor === 14, 'SIGNATURE_FLOOR devrait être 14');

  // Écho de signature ACCOMPLI : Gryffondor + signature remise → beat « braise ».
  const done = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    victoryAchieved = true;
    gryffSignatureDone = true;
    currentFloor = 14; floorReached = 14;
    seenScriptedBeat = new Set();   // état neuf
    const played = maybeSignatureEchoBeat(14);
    checkCodexUnlocks('echo-signature');
    return {
      played,
      sentinel: seenScriptedBeat.has('signature_echo'),
      echo:     seenEchoes.has('echo_signature'),
      codexOpen:  unlockedCodexEntries.has('echo_signature'),
      codexState: codexEntryState(getCodexEntry('echo_signature'), _codexContext()),
      replay:   maybeSignatureEchoBeat(14),  // idempotent
    };
  });
  console.log('  done :', done);
  assert(done.played, 'écho de signature non joué à l\'étage 14');
  assert(done.sentinel && done.echo, 'sentinelle / écho non posés');
  assert(done.codexOpen, 'echo_signature non ouverte dans le Codex');
  assert(done.codexState === 'revealed', `echo_signature devrait être révélée (${done.codexState})`);
  assert(done.replay === false, 'écho de signature devrait être one-shot');

  // Variante DETTE (signature non remise) : narrative distincte de l'accompli.
  const variants = await page.evaluate(() => {
    const d = getSignatureEchoBeat(14, 'Gryffondor', true, null);
    const u = getSignatureEchoBeat(14, 'Gryffondor', false, null);
    const sPact = getSignatureEchoBeat(14, 'Serpentard', true, 'pact');
    const sDef  = getSignatureEchoBeat(14, 'Serpentard', true, 'defiance');
    return { differ: d.narrative !== u.narrative, pactDiffer: sPact.narrative !== sDef.narrative };
  });
  assert(variants.differ, 'la variante dette devrait différer de l\'accompli');
  assert(variants.pactDiffer, 'Serpentard pacte/défi devraient différer');

  // Voix de héros par boucle : l'événement darkLoop produit une réplique.
  const bark = await page.evaluate(() => {
    barksEnabled = true;
    const text = heroBark('harry', 'darkLoop', { channel: 'explore', once: 'test-loop' });
    return typeof text === 'string' && text.length > 0;
  });
  assert(bark, 'le bark darkLoop devrait produire une réplique');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (dark loop v2)`);
  }
  console.log('  ✅ Boucle V2 : écho de signature (accompli/dette) + barks par boucle OK');
  await browser.close();
}

// Boucle Ténébreuse V3 (Chapitre 11 §11.10) — « Briser le Cycle » : boss-miroir,
// 4 jalons dérivés, modale de choix + cinématique, fin cosmétique non-gating,
// Codex (briser_cycle + cycle_brise), persistance de cycleBroken.
async function scenarioDarkLoopV3() {
  console.log('\n── Scénario : Boucle Ténébreuse V3 — Briser le Cycle ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const wired = await page.evaluate(() => ({
    jalonsFn: typeof briserCycleJalons === 'function',
    offerFn:  typeof maybeOfferBreakCycle === 'function',
    modalFn:  typeof openBreakCycleModal === 'function',
    confirmFn: typeof confirmBreakCycle === 'function',
    boss:     !!(typeof MONSTERS !== 'undefined' && MONSTERS.find(m => m.id === 'reflet_mythe')),
    bossMinFloor: (MONSTERS.find(m => m.id === 'reflet_mythe') || {}).minFloor,
    bossFeat: !!(typeof BOSS_FEATS !== 'undefined' && BOSS_FEATS.reflet_mythe),
    overlay:  !!document.getElementById('break-cycle-overlay'),
    seuil:    (typeof BRISER_ECLAT_SEUIL !== 'undefined') ? BRISER_ECLAT_SEUIL : null,
  }));
  console.log('  wired :', wired);
  assert(wired.jalonsFn && wired.offerFn && wired.modalFn && wired.confirmFn, 'helpers V3 absents');
  assert(wired.boss, 'boss-miroir reflet_mythe absent de MONSTERS');
  assert(wired.bossMinFloor === 11, 'reflet_mythe minFloor doit être 11 (→ étage réel 21+ via effectiveFloor)');
  assert(wired.bossFeat, 'reflet_mythe absent de BOSS_FEATS');
  assert(wired.overlay, '#break-cycle-overlay absent du DOM');
  assert(wired.seuil === 15, 'BRISER_ECLAT_SEUIL devrait être 15');

  // Jalons incomplets : vaincre le Reflet sans scène/éclats → pas de choix offert.
  const incomplete = await page.evaluate(() => {
    victoryAchieved = true; cycleBroken = false;
    seenEchoes = new Set(); accumulatedEclats = 0;
    monsterKills = { reflet_mythe: 1 };   // boss vaincu, mais I & II manquants
    return maybeOfferBreakCycle([{ id: 'reflet_mythe' }]);
  });
  assert(incomplete === false, 'le choix ne doit pas être offert si I & II manquent');

  // Jalons I & II remplis → le choix est proposé (programmé) ; on ouvre la modale.
  const offered = await page.evaluate(() => {
    seenEchoes.add('echo_scene_sceau');     // jalon I
    accumulatedEclats = 15;                  // jalon II
    // En jeu réel, startBattle peuple seenMonsters ; on le simule ici pour le
    // robinet Codex `monster` (seen + kill).
    if (typeof seenMonsters !== 'undefined') seenMonsters.add('reflet_mythe');
    const progress = briserCycleJalons({ sceneSeen: true, eclats: 15, bossKills: 1 }).count;
    const willOffer = maybeOfferBreakCycle([{ id: 'reflet_mythe' }]);  // jalon III déjà enregistré
    openBreakCycleModal();
    const ov = document.getElementById('break-cycle-overlay');
    return { progress, willOffer, visible: ov && ov.style.display === 'flex' };
  });
  console.log('  offered :', offered);
  assert(offered.progress === 3, '3 jalons devraient être remplis');
  assert(offered.willOffer === true, 'maybeOfferBreakCycle devrait planifier le choix');
  assert(offered.visible, 'la modale de choix ne s\'affiche pas');

  // Choisir « Briser » → cinématique → fin : cycleBroken + Codex + overlay fermé.
  const broke = await page.evaluate(() => {
    confirmBreakCycle();        // → page 1/3
    advanceBreakCycle();        // → page 2/3
    advanceBreakCycle();        // → page 3/3
    finishBreakCycle();         // ferme
    checkCodexUnlocks('cycle-broken');
    const ov = document.getElementById('break-cycle-overlay');
    return {
      broken:  cycleBroken === true,
      hidden:  ov && ov.style.display === 'none',
      codexOpen:  unlockedCodexEntries.has('cycle_brise'),
      codexState: codexEntryState(getCodexEntry('cycle_brise'), _codexContext()),
      questRevealed: codexEntryState(getCodexEntry('briser_cycle'), _codexContext()),
    };
  });
  console.log('  broke :', broke);
  assert(broke.broken, 'cycleBroken devrait être true après Briser');
  assert(broke.hidden, 'la modale devrait se fermer après la cinématique');
  assert(broke.codexOpen, 'cycle_brise non ouverte dans le Codex');
  assert(broke.codexState === 'revealed', `cycle_brise devrait être révélée (${broke.codexState})`);
  assert(broke.questRevealed === 'revealed', `briser_cycle devrait être révélée (${broke.questRevealed})`);

  // Perpétuer : decline ferme sans casser l'état (cycleBroken reste tel quel).
  const declined = await page.evaluate(() => {
    openBreakCycleModal();
    declineBreakCycle();
    const ov = document.getElementById('break-cycle-overlay');
    return ov && ov.style.display === 'none';
  });
  assert(declined, 'declineBreakCycle devrait fermer la modale');

  // Persistance : cycleBroken survit à un cycle save/load.
  const persisted = await page.evaluate(() => {
    cycleBroken = true;
    const gs = _serializeState();
    cycleBroken = false;
    _applyState(gs);
    return cycleBroken;
  });
  assert(persisted === true, 'cycleBroken non sérialisé/restauré');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (dark loop v3)`);
  }
  console.log('  ✅ Boucle V3 : boss-miroir + 4 jalons + cinématique + fin + Codex OK');
  await browser.close();
}

// Boucle Ténébreuse V4 (Chapitre 11 §11.11) — mutations loopVariant : en Boucle,
// le palier endgame escalade le nom de la créature (Ténébreux → Spectral → …) et
// ajoute une mutation thématique bornée (résist ténèbres / faille lumière).
async function scenarioDarkLoopV4() {
  console.log('\n── Scénario : Boucle Ténébreuse V4 — mutations loopVariant ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const out = await page.evaluate(() => {
    victoryAchieved = true;   // ouvre la Boucle (effectiveFloor décale les floors 11+)
    // Base "propre" (ni résist ni faiblesse déclarée) → le tweak s'applique net.
    const base = MONSTERS.find(m => (!m.resist || !m.resist.length) && (!m.weak || !m.weak.length)) || MONSTERS[0];
    let d22 = null, d11 = null;
    // scaleMonster a 4 % de chance shiny → on boucle pour capturer une instance Ténébreuse.
    for (let i = 0; i < 120 && (!d22 || !d11); i++) {
      const a = scaleMonster(base, 22);   // n=2 → Spectral
      if (a.variant === 'darkness' && !d22) d22 = a;
      const b = scaleMonster(base, 11);   // n=1 → Ténébreux (compat V1)
      if (b.variant === 'darkness' && !d11) d11 = b;
    }
    return {
      baseName: base.name,
      name22: d22 && d22.name, tier22: d22 && d22.loopTier,
      resist22: d22 && d22.resist, weak22: d22 && d22.weak,
      name11: d11 && d11.name, tier11: d11 && d11.loopTier,
      helper: typeof loopVariantTierName === 'function' && loopVariantTierName(3),
    };
  });
  console.log('  out :', out);
  assert(out.helper === 'Abyssal', 'loopVariantTierName indisponible en jeu');
  assert(out.name22 && out.name22.startsWith('Spectral '), `loop 2 devrait préfixer "Spectral" (${out.name22})`);
  assert(out.tier22 === 2, 'loopTier 2 attendu à l\'étage 22');
  assert(Array.isArray(out.resist22) && out.resist22.includes('ténèbres'), 'la variante de Boucle devrait résister aux ténèbres');
  assert(Array.isArray(out.weak22) && out.weak22.includes('lumière'), 'la variante de Boucle devrait être faible à la lumière');
  assert(out.name11 && out.name11.startsWith('Ténébreux '), `loop 1 devrait rester "Ténébreux" (compat V1) (${out.name11})`);
  assert(out.tier11 === 1, 'loopTier 1 attendu à l\'étage 11');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (dark loop v4)`);
  }
  console.log('  ✅ Boucle V4 : nom escaladé par palier + mutation ténèbres/lumière OK');
  await browser.close();
}

// Promotion de boss en personnage (P4, ch.06 §6.6) : monologue one-shot au 1ᵉʳ
// combat contre le Maître des Détraqueurs + entrée Codex 👤 Personnages.
async function scenarioBossPromo() {
  console.log('\n── Scénario : promotion de boss en personnage (P4 §6.6) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const r = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasReg  = typeof BOSS_PROMO_BEATS !== 'undefined' && !!BOSS_PROMO_BEATS.maitre_detraqueur;
      out.hasOrch = typeof _maybeBossPromoBeat === 'function';
      // État neuf + combat contre le Maître des Détraqueurs.
      seenScriptedBeat = new Set();
      currentFloor = 9;
      const base = MONSTERS.find(m => m.id === 'maitre_detraqueur');
      out.foundMonster = !!base;
      startBattle(base);
      // startBattle a appelé _maybeBossPromoBeat → sentinelle posée.
      out.sentinel = seenScriptedBeat.has('boss_promo:maitre_detraqueur');
      out.seen     = seenMonsters.has('maitre_detraqueur');
      // Codex : vu en combat → veiled.
      checkCodexUnlocks('battle-start');
      out.codexOpen   = unlockedCodexEntries.has('maitre_detraqueur');
      out.codexVeiled = codexEntryState(getCodexEntry('maitre_detraqueur'), _codexContext());
      // Idempotent : un 2ᵉ appel direct ne rejoue pas.
      out.replay = _maybeBossPromoBeat();
      // Révélation par le kill (simulé via monsterKills).
      monsterKills = monsterKills || {};
      monsterKills['maitre_detraqueur'] = 1;
      out.codexRevealed = codexEntryState(getCodexEntry('maitre_detraqueur'), _codexContext());
      // Le Héraut est promu lui aussi (registre).
      out.herautReg = !!BOSS_PROMO_BEATS.heraut_tenebres;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  →', r);
  assert(!r.threw, 'boss promo throw: ' + (r.err || ''));
  assert(r.hasReg && r.hasOrch, 'BOSS_PROMO_BEATS / _maybeBossPromoBeat absents');
  assert(r.foundMonster, 'monstre maitre_detraqueur introuvable dans MONSTERS');
  assert(r.sentinel, 'monologue de promotion non joué (sentinelle absente)');
  assert(r.seen, 'le Maître devrait être marqué vu (seenMonsters)');
  assert(r.codexOpen, 'entrée Codex maitre_detraqueur non ouverte');
  assert(r.codexVeiled === 'veiled', `Codex devrait être veiled après combat (${r.codexVeiled})`);
  assert(r.replay === false, 'le monologue de promotion devrait être one-shot');
  assert(r.codexRevealed === 'revealed', `Codex devrait être révélé après le kill (${r.codexRevealed})`);
  assert(r.herautReg, 'le Héraut des Ténèbres devrait être promu lui aussi');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (promotion de boss)`);
  }
  console.log('  ✅ Promotion de boss — monologue one-shot + entrée Codex OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioCodexOpen, scenarioCodexUnlockOnFloor, scenarioCodexCorrupted, scenarioDarkLoopV1, scenarioDarkLoopV2, scenarioDarkLoopV3, scenarioDarkLoopV4, scenarioBossPromo] };
