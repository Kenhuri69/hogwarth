// ============================================================
// Scénarios smoke — domaine « save » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

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
          // ouverture de page" : le portrait BG par défaut harry.png + nom Harry.
          const p = document.getElementById('pcard-bg-0');
          if (p) p.style.backgroundImage = 'url("img/harry.png")';
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
    const bg = document.getElementById('pcard-bg-0');
    return {
      portraitBg: bg ? bg.style.backgroundImage : null,
      playerName: player && player.name,
      playerImg:  player && player.imgSrc,
      domName:    document.getElementById('char-name-0').textContent
    };
  });
  console.log('  T5 load celeste →', t5b);
  assert(/celeste\.png/.test(t5b.portraitBg || ''),
         `portrait BG doit pointer sur celeste.png (était : ${t5b.portraitBg})`);
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

async function scenarioOldSaveMapMigration() {
  console.log('\n── Scénario : migration save carte 12×12 → 16×16 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const t1 = await page.evaluate(() => {
    // Sérialise l'état courant puis rétrécit tous les tableaux carte vers
    // 12×12 (format pré-agrandissement). _applyState doit s'en sortir.
    const gs = _serializeState();
    const crop = (arr) => arr.slice(0, 12)
      .map(row => Array.isArray(row) ? row.slice(0, 12) : row);
    if (Array.isArray(gs.dungeon))  gs.dungeon  = crop(gs.dungeon);
    if (Array.isArray(gs.visited))  gs.visited  = crop(gs.visited);
    if (Array.isArray(gs.enemyMap)) gs.enemyMap = crop(gs.enemyMap);
    if (Array.isArray(gs.itemMap))  gs.itemMap  = crop(gs.itemMap);

    let applyErr = null;
    try { _applyState(gs); } catch (e) { applyErr = e.message; }

    let drawErr = null, miniErr = null;
    try { drawDungeon(); }   catch (e) { drawErr = e.message; }
    try { renderMinimap(); } catch (e) { miniErr = e.message; }

    return {
      applyErr, drawErr, miniErr,
      mapW: MAP_W, mapH: MAP_H,
      dungeonRows: dungeon.length,
      dungeonCols: Array.isArray(dungeon[0]) ? dungeon[0].length : -1,
      visitedRows: visited.length,
    };
  });
  console.log('  T1 chargement save 12×12 :', t1);
  assert(t1.applyErr === null, `_applyState a planté : ${t1.applyErr}`);
  assert(t1.drawErr  === null, `drawDungeon a planté : ${t1.drawErr}`);
  assert(t1.miniErr  === null, `renderMinimap a planté : ${t1.miniErr}`);
  assert(t1.dungeonRows === t1.mapH && t1.dungeonCols === t1.mapW,
    `dungeon non régénéré aux dimensions courantes (${t1.dungeonRows}×${t1.dungeonCols})`);
  assert(t1.visitedRows === t1.mapH, 'visited non régénéré aux dimensions courantes');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (migration carte)`);
  }
  console.log('  ✅ migration carte : étage régénéré, minimap et rendu 3D sains');
  await browser.close();
}

module.exports = { scenarios: [scenarioSaveSlots, scenarioSlotModal, scenarioExportImport, scenarioAutoSave, scenarioStartHub, scenarioCorruptSave, scenarioOldSaveMapMigration] };
