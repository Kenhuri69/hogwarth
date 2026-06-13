// ============================================================
// Scénarios smoke — domaine « multiplayer » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioParallelPortal() {
  console.log('\n── Scénario : Cheminette Inter-Mondes (Phase A) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : sort déclaré avec les bons paramètres.
  const t1 = await page.evaluate(() => {
    const spell = SPELLS.find(s => s.name === 'Cheminette Inter-Mondes');
    return spell
      ? { found: true, cost: spell.cost, effect: spell.effect, icon: spell.icon }
      : { found: false };
  });
  console.log('  T1 SPELLS →', t1);
  assert(t1.found,                 'Cheminette Inter-Mondes doit être déclarée dans SPELLS');
  assert(t1.cost === 25,           `Coût attendu 25 PM (vu ${t1.cost})`);
  assert(t1.effect === 'portal',   `effect attendu "portal" (vu "${t1.effect}")`);

  // T2 : apprentissage au niveau 8 pour les deux héros.
  const t2 = await page.evaluate(() => {
    const before = {
      harry:    player.spells.includes('Cheminette Inter-Mondes'),
      hermione: player2.spells.includes('Cheminette Inter-Mondes')
    };
    _grantLevelSpells(8);
    return {
      before,
      harry:    player.spells.includes('Cheminette Inter-Mondes'),
      hermione: player2.spells.includes('Cheminette Inter-Mondes')
    };
  });
  console.log('  T2 apprentissage niv. 8 →', t2);
  assert(!t2.before.harry && !t2.before.hermione, 'Sort non appris avant niv. 8');
  assert(t2.harry,                                'Harry doit apprendre au niv. 8');
  assert(t2.hermione,                             'Hermione doit apprendre au niv. 8');

  // T3 : entrée cliquable dans la modale Sorts (mode normal, SP suffisants).
  const t3 = await page.evaluate(() => {
    player.sp = player.spMax = 50;
    openSpells(0);
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const ch = items.find(el => /Cheminette Inter-Mondes/.test(el.textContent));
    return {
      hasEntry:    !!ch,
      isClickable: !!(ch && typeof ch.onclick === 'function')
    };
  });
  console.log('  T3 modale Sorts (normal) →', t3);
  assert(t3.hasEntry,    'Cheminette doit apparaître dans la modale Sorts');
  assert(t3.isClickable, 'Entrée doit être cliquable hors combat en mode normal');

  // T4 : mode Ironman → visible mais non cliquable + hint dédié.
  const t4 = await page.evaluate(() => {
    closeModal('spell-modal');
    const wasIronman = ironmanMode;
    ironmanMode = true;
    openSpells(0);
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const ch = items.find(el => /Cheminette Inter-Mondes/.test(el.textContent));
    const out = {
      hasEntry:    !!ch,
      isClickable: !!(ch && typeof ch.onclick === 'function'),
      hint:        ch ? ch.textContent : ''
    };
    ironmanMode = wasIronman;
    closeModal('spell-modal');
    return out;
  });
  console.log('  T4 Ironman →', t4);
  assert(t4.hasEntry,                          'Cheminette doit rester visible en Ironman');
  assert(!t4.isClickable,                      'Cheminette ne doit pas être cliquable en Ironman');
  assert(/Voie solitaire|Ironman/.test(t4.hint), 'Hint Ironman doit mentionner la voie solitaire');

  // T5 : cast → SP décompté + overlay portail actif.
  const t5 = await page.evaluate(() => {
    player.sp = 50;
    const beforeSp = player.sp;
    castSpellOutOfCombat('Cheminette Inter-Mondes', 0);
    const layer = document.getElementById('portal-fx-layer');
    return {
      beforeSp,
      afterSp: player.sp,
      layerActive: !!(layer && layer.classList.contains('active'))
    };
  });
  console.log('  T5 cast →', t5);
  assert(t5.afterSp === t5.beforeSp - 25, `25 PM consommés (avant ${t5.beforeSp}, après ${t5.afterSp})`);
  assert(t5.layerActive,                  'L\'overlay portal-fx-layer doit être actif pendant l\'anim');

  // T6 : attendre la fin de l'anim (ouverture 2,8s + fermeture 1,5s).
  await page.waitForFunction(() => {
    const l = document.getElementById('portal-fx-layer');
    return !l || !l.classList.contains('active');
  }, { timeout: 8000 });
  const t6 = await page.evaluate(() => ({
    floor:    currentFloor,
    inBattle: !!inBattle,
    layerVisible: (() => {
      const l = document.getElementById('portal-fx-layer');
      if (!l) return false;
      const style = getComputedStyle(l);
      return style.display !== 'none';
    })()
  }));
  console.log('  T6 retour Phase A →', t6);
  assert(t6.floor === 1,      'Le joueur reste à son étage (pas de réseau en Phase A)');
  assert(!t6.inBattle,        'Pas de combat enclenché par le cast');
  assert(!t6.layerVisible,    'L\'overlay doit être masqué après l\'anim');

  // T7 : double-gate handler — appel direct avec ironmanMode=true refuse.
  const t7 = await page.evaluate(() => {
    const wasIronman = ironmanMode;
    ironmanMode = true;
    player.sp = 50;
    const beforeSp = player.sp;
    castSpellOutOfCombat('Cheminette Inter-Mondes', 0);
    const out = { beforeSp, afterSp: player.sp };
    ironmanMode = wasIronman;
    return out;
  });
  console.log('  T7 handler Ironman →', t7);
  assert(t7.afterSp === t7.beforeSp, 'PM ne doivent pas être consommés en Ironman (handler refuse)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase A OK');
  await browser.close();
}

async function scenarioPortalMatchmaking() {
  console.log('\n── Scénario : Cheminette — matchmaking (Phase B) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : liste vide → message « Aucun sorcier ne médite ».
  const t1 = await page.evaluate(async () => {
    window.mpListAvailableHosts = async () => [];
    await openPortalTargetModal();
    await new Promise(r => setTimeout(r, 50));
    const overlay = document.getElementById('portal-target-overlay');
    const panel   = document.getElementById('portal-target-panel');
    return {
      visible:  overlay.style.display === 'flex',
      hasEmpty: /[Aa]ucun sorcier|médite/.test(panel.textContent)
    };
  });
  console.log('  T1 liste vide →', t1);
  assert(t1.visible,  'overlay destinations doit être visible');
  assert(t1.hasEmpty, 'message "aucun sorcier" attendu');

  // T2 : null (erreur réseau) → message « réseau silencieux ».
  const t2 = await page.evaluate(async () => {
    closePortalTargetModal();
    window.mpListAvailableHosts = async () => null;
    await openPortalTargetModal();
    await new Promise(r => setTimeout(r, 50));
    const panel = document.getElementById('portal-target-panel');
    return { hasSilent: /silencieux/.test(panel.textContent) };
  });
  console.log('  T2 réseau KO →', t2);
  assert(t2.hasSilent, 'message "réseau silencieux" attendu');

  // T3 : 2 hosts dans la liste → 2 cartes cliquables.
  const t3 = await page.evaluate(async () => {
    closePortalTargetModal();
    window.mpListAvailableHosts = async () => [
      { player_id: 'p1', name: 'Ginny',  house: 'Gryffondor', level: 7, floor: 3 },
      { player_id: 'p2', name: 'Drago',  house: 'Serpentard', level: 9, floor: 5 }
    ];
    await openPortalTargetModal();
    await new Promise(r => setTimeout(r, 50));
    const rows = document.querySelectorAll('#portal-target-panel .portal-host-row');
    return {
      count: rows.length,
      names: Array.from(rows).map(r => r.querySelector('.portal-host-name').textContent.trim())
    };
  });
  console.log('  T3 deux hosts →', t3);
  assert(t3.count === 2,                  'liste doit afficher 2 hosts');
  assert(/Ginny/.test(t3.names[0] || ''), 'Ginny en tête');
  assert(/Drago/.test(t3.names[1] || ''), 'Drago en 2e');

  // T4 : click sur un host → mpPostVisitRequest appelée + écran d'attente.
  // Le test réduit le poll à 200 ms via window.__portalPollMs pour rendre
  // T5 déterministe sans attendre 2,5 s.
  const t4 = await page.evaluate(async () => {
    window.__portalPollMs = 200;
    window.__postedHost = null;
    window.__portalPollTicks = 0;
    window.mpPostVisitRequest = async (h) => {
      window.__postedHost = h;
      return { id: 'req-test-1', status: 'pending' };
    };
    window.mpPollOutgoingVisitStatus = async () => ({ status: 'pending' });
    _portalTargetClick(0);
    await new Promise(r => setTimeout(r, 80));
    const panel = document.getElementById('portal-target-panel');
    return {
      postedName: (window.__postedHost && window.__postedHost.name) || null,
      hasWaiting: /attente|patiente/i.test(panel.textContent)
    };
  });
  console.log('  T4 click → demande →', t4);
  assert(t4.postedName === 'Ginny', 'Ginny doit être posté');
  assert(t4.hasWaiting,             'écran "en attente" attendu');

  // T5 : poll renvoie 'accepted' → fermeture modale + addMsg "accueilli".
  // Poll réduit à 200 ms par T4 — on attend 500 ms pour 2 ticks.
  const t5 = await page.evaluate(async () => {
    window.__portalAcceptedCalls = 0;
    window.mpPollOutgoingVisitStatus = async () => ({ status: 'accepted' });
    await new Promise(r => setTimeout(r, 500));
    const overlay = document.getElementById('portal-target-overlay');
    return {
      hidden:    overlay.style.display === 'none',
      ticks:     window.__portalPollTicks || 0,
      accepted:  window.__portalAcceptedCalls || 0
    };
  });
  console.log('  T5 acceptation →', t5);
  assert(t5.ticks > 0, 'le poll doit avoir tiré au moins 1 tick');
  assert(t5.hidden,    'modale destinations doit se fermer après acceptation');

  // T6 : showIncomingVisitRequest → modale host s'affiche avec nom + boutons.
  const t6 = await page.evaluate(() => {
    showIncomingVisitRequest({
      id: 'req-host-1',
      visitor_name:  'Luna',
      visitor_house: 'Serdaigle',
      visitor_level: 6
    });
    const overlay = document.getElementById('portal-incoming-overlay');
    const panel   = document.getElementById('portal-incoming-panel');
    return {
      visible:      overlay.style.display === 'flex',
      hasLuna:      /Luna/.test(panel.textContent),
      hasAcceptBtn: !!panel.querySelector('.portal-btn-accept'),
      hasRefuseBtn: !!panel.querySelector('.portal-btn-refuse')
    };
  });
  console.log('  T6 incoming →', t6);
  assert(t6.visible,      'overlay incoming doit être visible');
  assert(t6.hasLuna,      'nom Luna doit être affiché');
  assert(t6.hasAcceptBtn, 'bouton Accepter requis');
  assert(t6.hasRefuseBtn, 'bouton Refuser requis');

  // T7 : click Accepter → mpRespondVisitRequest('accepted') + fermeture.
  const t7 = await page.evaluate(async () => {
    window.__respCalled = null;
    window.mpRespondVisitRequest = async (id, st) => {
      window.__respCalled = { id, st };
      return { id, status: st };
    };
    _portalIncomingAccept();
    await new Promise(r => setTimeout(r, 60));
    const overlay = document.getElementById('portal-incoming-overlay');
    return {
      respCalled: window.__respCalled,
      hidden:     overlay.style.display === 'none'
    };
  });
  console.log('  T7 accepter →', t7);
  assert(t7.respCalled && t7.respCalled.id === 'req-host-1', 'mpRespondVisitRequest doit recevoir l\'id');
  assert(t7.respCalled.st === 'accepted',                    'status accepted attendu');
  assert(t7.hidden,                                          'overlay incoming doit se fermer');

  // T8 : click Refuser → mpRespondVisitRequest('refused').
  const t8 = await page.evaluate(async () => {
    showIncomingVisitRequest({
      id: 'req-host-2',
      visitor_name:  'Cho',
      visitor_house: 'Serdaigle',
      visitor_level: 5
    });
    window.__respCalled = null;
    window.mpRespondVisitRequest = async (id, st) => {
      window.__respCalled = { id, st };
      return { id, status: st };
    };
    _portalIncomingRefuse();
    await new Promise(r => setTimeout(r, 60));
    return { respCalled: window.__respCalled };
  });
  console.log('  T8 refuser →', t8);
  assert(t8.respCalled && t8.respCalled.id === 'req-host-2', 'refus doit cibler la bonne demande');
  assert(t8.respCalled.st === 'refused',                     'status refused attendu');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — matchmaking Phase B OK');
  await browser.close();
}

async function scenarioVisitSnapshot() {
  console.log('\n── Scénario : Cheminette — snapshot visite (Phase C.1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : globaux et helpers exposés.
  const t1 = await page.evaluate(() => ({
    sessionInit:   typeof visitSession !== 'undefined' && visitSession === null,
    takeFn:        typeof _takeVisitSnapshot   === 'function',
    restoreFn:     typeof _restoreFromVisit    === 'function',
    buildFn:       typeof mpBuildVisitSnapshot === 'function',
    applyFn:       typeof mpApplyVisitSnapshot === 'function'
  }));
  console.log('  T1 helpers exposés →', t1);
  assert(t1.sessionInit, 'visitSession doit être null au démarrage');
  assert(t1.takeFn && t1.restoreFn && t1.buildFn && t1.applyFn,
         'Les 4 helpers de visite doivent être déclarés');

  // T2 : take → roundtrip pur (mutation locale n'affecte pas le snap).
  const t2 = await page.evaluate(() => {
    const snap = _takeVisitSnapshot();
    const savedGold = snap.party[0].gold;
    player.gold = (player.gold || 0) + 12345;
    return {
      snapGold:     savedGold,
      playerGold:   player.gold,
      snapPosition: { x: snap.playerX, y: snap.playerY, dir: snap.playerDir }
    };
  });
  console.log('  T2 snapshot pur →', t2);
  assert(typeof t2.snapPosition.x === 'number',
         'Le snapshot doit porter la position joueur');
  assert(t2.playerGold === t2.snapGold + 12345,
         'Mutation post-snapshot ne doit pas affecter le snap (deep clone)');

  // T3 : build host snapshot — structure conforme à parallel-worlds.md §5.1.
  const t3 = await page.evaluate(() => {
    // On joue le rôle de "host" en se sérialisant nous-mêmes.
    const snap = mpBuildVisitSnapshot({
      hostId:    'host-test-123',
      hostName:  'Visiteur Test',
      hostHouse: 'Serdaigle',
      hostLevel: 7
    });
    return {
      version:      snap._version,
      hostMeta:     snap.hostMeta,
      hasFloor:     !!snap.floor,
      hasGrid:      !!(snap.floor && Array.isArray(snap.floor.grid)),
      hasMask:      !!(snap.floor && Array.isArray(snap.floor.visitedMask)),
      hasNpcs:      !!(snap.floor && Array.isArray(snap.floor.npcPlacements)),
      hasPosition:  !!snap.hostPosition,
      hasSpawn:     !!snap.visitorSpawn,
      spawnDir:     snap.visitorSpawn && snap.visitorSpawn.dir
    };
  });
  console.log('  T3 build snapshot →', t3);
  assert(t3.version === 1,                'snapshot porte _version=1');
  assert(t3.hostMeta && t3.hostMeta.name === 'Visiteur Test',
         'hostMeta.name remonté');
  assert(t3.hostMeta.level === 7,         'hostMeta.level remonté');
  assert(t3.hostMeta.house === 'Serdaigle','hostMeta.house remonté');
  assert(t3.hasFloor && t3.hasGrid,       'snap.floor.grid présent');
  assert(t3.hasMask && t3.hasNpcs,        'visitedMask + npcPlacements présents');
  assert(t3.hasPosition && t3.hasSpawn,   'hostPosition + visitorSpawn présents');

  // T4 : apply → visitSession actif, dungeon distant injecté, état visiteur
  //      capturé dans mySavedState. On marque le donjon avant l'apply pour
  //      vérifier que le donjon d'origine est bien remplacé.
  const t4 = await page.evaluate(() => {
    // Marquer une signature dans le donjon courant qui doit ÊTRE remplacée
    // par celui du snap (on duplique notre état mais avec une cellule modifiée).
    const fakeHostSnap = mpBuildVisitSnapshot({
      hostId: 'h1', hostName: 'Alice', hostHouse: 'Poufsouffle', hostLevel: 5
    });
    // Modifie le grid du snap : pose un mur à (0,0) — signature unique.
    fakeHostSnap.floor.grid[0][0] = CELL.WALL;
    fakeHostSnap.floor.visitedMask[0][0] = true;
    fakeHostSnap.visitorSpawn = { x: 1, y: 1, dir: 'n' };

    const goldBefore = player.gold;
    const posBefore = { x: playerX, y: playerY, dir: playerDir };
    const ok = mpApplyVisitSnapshot(fakeHostSnap);
    return {
      applied:        ok,
      sessionRole:    visitSession && visitSession.role,
      sessionHost:    visitSession && visitSession.hostName,
      sessionHasSave: !!(visitSession && visitSession.mySavedState),
      // Après apply : la cellule signature est dans dungeon
      injectedCell:   dungeon[0][0],
      // Position visiteur = visitorSpawn
      posX:           playerX,
      posY:           playerY,
      posDir:         playerDir,
      // Inventaire visiteur intact (apply n'écrase pas party)
      goldStillHere:  player.gold === goldBefore,
      // enemyMap/itemMap neutralisés : grille de bonne forme, toutes cases null
      enemyMapShape:  Array.isArray(enemyMap) && enemyMap.length === dungeon.length
                       && Array.isArray(enemyMap[0]) && enemyMap[0].length === dungeon[0].length,
      enemyMapEmpty:  Array.isArray(enemyMap) && enemyMap.every(row =>
                       Array.isArray(row) && row.every(cell => !cell)),
      itemMapShape:   Array.isArray(itemMap) && itemMap.length === dungeon.length,
      itemMapEmpty:   Array.isArray(itemMap) && itemMap.every(row =>
                       Array.isArray(row) && row.every(cell => !cell)),
      // mySavedState contient l'ancienne position
      savedPosX:      visitSession.mySavedState.playerX
    };
  });
  console.log('  T4 apply visit →', t4);
  assert(t4.applied,                     'mpApplyVisitSnapshot retourne true');
  assert(t4.sessionRole === 'visitor',   'visitSession.role = visitor');
  assert(t4.sessionHost === 'Alice',     'visitSession.hostName remonté');
  assert(t4.sessionHasSave,              'mySavedState capturé');
  assert(t4.injectedCell === 0,          'dungeon[0][0] est le WALL signature du host');
  assert(t4.posX === 1 && t4.posY === 1 && t4.posDir === 'n',
         'Position visiteur = visitorSpawn');
  assert(t4.goldStillHere,               'Or du visiteur intact pendant la visite');
  assert(t4.enemyMapShape && t4.itemMapShape,
         'enemyMap/itemMap : grilles 2D de la même forme que dungeon');
  assert(t4.enemyMapEmpty && t4.itemMapEmpty,
         'enemyMap/itemMap neutralisés (V1a observation seule, toutes cases null)');

  // T5 : double-apply refusé tant qu'une session est ouverte.
  const t5 = await page.evaluate(() => {
    const snap = mpBuildVisitSnapshot({ hostId: 'h2', hostName: 'Bob' });
    const second = mpApplyVisitSnapshot(snap);
    return { second, stillAlice: visitSession && visitSession.hostName === 'Alice' };
  });
  console.log('  T5 double-apply →', t5);
  assert(t5.second === false,    'mpApplyVisitSnapshot refuse si déjà en visite');
  assert(t5.stillAlice,          'Session originale (Alice) préservée');

  // T6 : restore → état visiteur reconstitué, visitSession refermée.
  const t6 = await page.evaluate(() => {
    const okRestored = _restoreFromVisit();
    return {
      okRestored,
      sessionClosed: visitSession === null,
      // Le donjon doit avoir été régénéré ou restauré — on n'a plus le mur
      // signature à (0,0) tel quel (l'état d'origine ne le portait pas).
      noLongerWall:  dungeon[0][0] !== 0 || Array.isArray(enemyMap) && enemyMap !== null,
      // Note : on ne ré-injecte pas exactement la même grid en C.1, mais on
      // restaure via _applyState qui repart de la save.
      hasParty:      Array.isArray(party) && party[0] && typeof party[0].hp === 'number',
      partySize:     partySize
    };
  });
  console.log('  T6 restore →', t6);
  assert(t6.okRestored,         '_restoreFromVisit retourne true');
  assert(t6.sessionClosed,      'visitSession === null après restore');
  assert(t6.hasParty,           'party reconstruit après restore');
  assert(t6.partySize === 2,    'partySize préservé (2)');

  // T7 : restore sans session ouverte = no-op silencieux.
  const t7 = await page.evaluate(() => {
    visitSession = null;
    return { okRestored: _restoreFromVisit(), sessionClosed: visitSession === null };
  });
  console.log('  T7 restore sans session →', t7);
  assert(t7.okRestored === false, '_restoreFromVisit sans session retourne false');
  assert(t7.sessionClosed,        'visitSession reste null');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — snapshot visite Phase C.1 OK');
  await browser.close();
}

async function scenarioVisitChannelTransport() {
  console.log('\n── Scénario : Cheminette — canal de visite (Phase C.2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface publique.
  const t1 = await page.evaluate(() => ({
    asVisitor:    typeof mpStartVisitAsVisitor   === 'function',
    asHost:       typeof mpStartVisitAsHost      === 'function',
    exit:         typeof mpExitVisit             === 'function',
    pollOnce:     typeof window._visitPollOnce   === 'function',
    getState:     typeof window._visitGetState   === 'function',
    genChannel:   typeof window._visitGenChannelId === 'function',
    postMsg:      typeof mpPostVisitMessage      === 'function',
    pollMsg:      typeof mpPollVisitMessages     === 'function',
    initialState: window._visitGetState()
  }));
  console.log('  T1 surface →', t1);
  assert(t1.asVisitor && t1.asHost && t1.exit, 'mpStart/Exit exposés');
  assert(t1.pollOnce && t1.getState && t1.genChannel,
         'Helpers internes exposés');
  assert(t1.postMsg && t1.pollMsg, 'API transport bas-niveau exposée');
  assert(t1.initialState.role === null, 'État initial : pas de visite');

  // T2 : visiteur reçoit le snapshot par poll → applique.
  // Stubs : pollVisitMessages renvoie un snapshot lors du 1er appel.
  const t2 = await page.evaluate(async () => {
    // Construit un faux snapshot host en se sérialisant.
    const fakeSnap = mpBuildVisitSnapshot({
      hostId: 'host-uuid-1', hostName: 'Alice', hostHouse: 'Serdaigle', hostLevel: 5
    });
    // Signature : pose un mur à (3,3) du faux donjon.
    fakeSnap.floor.grid[3][3] = CELL.WALL;
    fakeSnap.visitorSpawn = { x: 2, y: 2, dir: 's' };

    // Stub poll : renvoie le snapshot puis tableau vide.
    const polled = [];
    window.__visitPollCalls = 0;
    window.mpPollVisitMessages = async (channelId, sinceIso, excludeSender) => {
      polled.push({ channelId, sinceIso, excludeSender });
      window.__visitPollCalls++;
      if (window.__visitPollCalls === 1) {
        return [{
          id: 'msg-1', sender: 'host', type: 'snapshot',
          payload: fakeSnap,
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    // Stub post : capture.
    window.__visitPosted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__visitPosted.push({ channelId, sender, type, payload });
      return { id: 'post-' + window.__visitPosted.length, created_at: new Date().toISOString() };
    };

    const goldBefore = player.gold;
    const okStart = await mpStartVisitAsVisitor({
      channelId: 'ch-test-1',
      hostId:    'host-uuid-1',
      hostName:  'Alice',
      hostHouse: 'Serdaigle'
    });

    const st = window._visitGetState();
    return {
      okStart,
      role:           st.role,
      partnerName:    st.partnerName,
      channelId:      st.channelId,
      pollCalled:     polled.length >= 1,
      pollExcludes:   polled[0] && polled[0].excludeSender,
      // visitSession actif après apply
      sessionOpen:    visitSession && visitSession.role === 'visitor',
      // dungeon contient la signature du faux snapshot
      injectedWall:   dungeon[3][3] === CELL.WALL,
      // Position visiteur = visitorSpawn
      posX:           playerX,
      posY:           playerY,
      // Or visiteur intact
      goldStillHere:  player.gold === goldBefore
    };
  });
  console.log('  T2 visiteur poll + snapshot →', t2);
  assert(t2.okStart === true,                'mpStartVisitAsVisitor retourne true');
  assert(t2.role === 'visitor',              'État interne : role=visitor');
  assert(t2.partnerName === 'Alice',         'partnerName remonté');
  assert(t2.channelId === 'ch-test-1',       'channelId remonté');
  assert(t2.pollCalled,                      'mpPollVisitMessages appelé au start');
  assert(t2.pollExcludes === 'visitor',      'Poll exclut ses propres messages (visitor)');
  assert(t2.sessionOpen,                     'visitSession ouverte après snapshot reçu');
  assert(t2.injectedWall,                    'Donjon du host injecté (mur signature visible)');
  assert(t2.posX === 2 && t2.posY === 2,     'Visiteur posé sur visitorSpawn');
  assert(t2.goldStillHere,                   'Or du visiteur intact');

  // T3 : exit visiteur → bye posté + restore.
  const t3 = await page.evaluate(async () => {
    window.__visitPosted = [];
    const okExit = await mpExitVisit('voluntary');
    const st = window._visitGetState();
    return {
      okExit,
      roleNull:    st.role === null,
      channelNull: st.channelId === null,
      // bye posté avant reset
      byePosted:   window.__visitPosted.find(p => p.type === 'bye'),
      // visitSession refermée
      sessionClosed: visitSession === null
    };
  });
  console.log('  T3 exit visiteur →', t3);
  assert(t3.okExit === true,                 'mpExitVisit retourne true');
  assert(t3.roleNull && t3.channelNull,      'État interne réinitialisé');
  assert(!!t3.byePosted,                     'Message bye posté');
  assert(t3.byePosted.sender === 'visitor',  'bye signé visitor');
  assert(t3.byePosted.channelId === 'ch-test-1', 'bye sur le bon canal');
  assert(t3.sessionClosed,                   'visitSession refermée (restore)');

  // T4 : start host → poste snapshot + démarre poll.
  const t4 = await page.evaluate(async () => {
    window.__visitPosted = [];
    window.__visitPollCalls = 0;
    window.mpPollVisitMessages = async () => [];

    const okStart = await mpStartVisitAsHost({
      channelId: 'ch-test-2',
      req: { id: 'req-1', visitor_id: 'vid-1', visitor_name: 'Bob' }
    });
    const st = window._visitGetState();
    const snapPost = window.__visitPosted.find(p => p.type === 'snapshot');
    return {
      okStart,
      role:           st.role,
      channelId:      st.channelId,
      partnerName:    st.partnerName,
      snapshotPosted: st.snapshotPosted,
      hasSnap:        !!snapPost,
      snapPayload:    snapPost && {
        hasHostMeta: !!snapPost.payload.hostMeta,
        hostName:    snapPost.payload.hostMeta && snapPost.payload.hostMeta.name,
        hasFloor:    !!snapPost.payload.floor,
        version:     snapPost.payload._version
      }
    };
  });
  console.log('  T4 host start →', t4);
  assert(t4.okStart === true,                  'mpStartVisitAsHost retourne true');
  assert(t4.role === 'host',                   'État interne : role=host');
  assert(t4.channelId === 'ch-test-2',         'channelId remonté');
  assert(t4.partnerName === 'Bob',             'partnerName = visitor_name');
  assert(t4.snapshotPosted === true,           'flag snapshotPosted = true');
  assert(t4.hasSnap,                           'Message type=snapshot posté');
  assert(t4.snapPayload.hasHostMeta,           'snapshot contient hostMeta');
  assert(t4.snapPayload.hasFloor,              'snapshot contient floor');
  assert(t4.snapPayload.version === 1,         'snapshot _version=1');

  // T5 : host reçoit bye du visiteur → sortie locale silencieuse, pas de
  // restore (le host n'avait pas pris de snapshot de sa propre save).
  const t5 = await page.evaluate(async () => {
    window.__visitPollCalls = 0;
    window.__visitPosted = [];
    window.mpPollVisitMessages = async () => {
      window.__visitPollCalls++;
      if (window.__visitPollCalls === 1) {
        return [{
          id: 'msg-bye', sender: 'visitor', type: 'bye',
          payload: { reason: 'voluntary' },
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    await window._visitPollOnce();
    const st = window._visitGetState();
    return {
      roleNull:   st.role === null,
      // host ne poste pas de bye en réponse (le visiteur a déjà refermé)
      noByeFromHost: !window.__visitPosted.find(p => p.type === 'bye')
    };
  });
  console.log('  T5 host reçoit bye →', t5);
  assert(t5.roleNull,        'Host quitte aussi après bye du visiteur');
  assert(t5.noByeFromHost,   'Host ne poste pas de bye en réponse (évite la boucle)');

  // T6 : start refuse double-start tant qu'une session est ouverte.
  const t6 = await page.evaluate(async () => {
    window.mpPollVisitMessages = async () => [];
    window.mpPostVisitMessage  = async () => ({ id: 'p1', created_at: new Date().toISOString() });
    await mpStartVisitAsHost({
      channelId: 'ch-test-3',
      req: { id: 'r2', visitor_id: 'vid-2', visitor_name: 'Carol' }
    });
    const second = await mpStartVisitAsVisitor({
      channelId: 'ch-test-4', hostId: 'h2', hostName: 'Dave'
    });
    const st = window._visitGetState();
    await mpExitVisit('cleanup');
    return { second, role: st.role, partner: st.partnerName };
  });
  console.log('  T6 double-start →', t6);
  assert(t6.second === false,    'Second start refusé tant que session ouverte');
  assert(t6.role === 'host',     'Session host originale préservée');
  assert(t6.partner === 'Carol', 'Partner originale préservée');

  // T7 : hook window.onVisitAccepted déclenche mpStartVisitAsVisitor avec
  // status.channel_id. Vérifie le branchement matchmaking → canal.
  const t7 = await page.evaluate(async () => {
    window.mpPollVisitMessages = async () => [];
    window.mpPostVisitMessage  = async () => ({ id: 'p2', created_at: new Date().toISOString() });
    // S'assure qu'on n'est plus en visite après T6
    if (window._visitGetState().role) await mpExitVisit('cleanup');
    window.onVisitAccepted(
      { player_id: 'host-z', name: 'Eve', house: 'Poufsouffle' },
      { id: 'req-z', status: 'accepted', channel_id: 'ch-via-hook' }
    );
    // Laisse le micro-task se résoudre
    await new Promise(r => setTimeout(r, 30));
    const st = window._visitGetState();
    await mpExitVisit('cleanup');
    return { role: st.role, channelId: st.channelId, partner: st.partnerName };
  });
  console.log('  T7 hook onVisitAccepted →', t7);
  assert(t7.role === 'visitor',           'Hook démarre une visite visiteur');
  assert(t7.channelId === 'ch-via-hook',  'channelId remonté depuis status');
  assert(t7.partner === 'Eve',            'partnerName remonté depuis host');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — canal de visite Phase C.2 OK');
  await browser.close();
}

async function scenarioVisitHudAndBlock() {
  console.log('\n── Scénario : Cheminette — HUD visite + interactions bloquées (Phase C.3) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface publique du module HUD.
  const t1 = await page.evaluate(() => ({
    showHud:   typeof showVisitHud   === 'function',
    updateHud: typeof updateVisitHud === 'function',
    hideHud:   typeof hideVisitHud   === 'function',
    exitBtn:   typeof window._visitHudExit === 'function',
    hudEl:     !!document.getElementById('visit-hud'),
    exitElInDOM: !!document.getElementById('visit-hud-exit')
  }));
  console.log('  T1 surface HUD →', t1);
  assert(t1.showHud && t1.updateHud && t1.hideHud, 'show/update/hide exposés');
  assert(t1.exitBtn,   'Handler _visitHudExit exposé');
  assert(t1.hudEl,     '#visit-hud présent dans le DOM');
  assert(t1.exitElInDOM, '#visit-hud-exit présent dans le DOM');

  // T2 : showVisitHud affiche le bandeau avec les bonnes infos.
  const t2 = await page.evaluate(() => {
    const ok = showVisitHud({ hostName: 'Alice', hostHouse: 'Serdaigle', floor: 4 });
    const hud  = document.getElementById('visit-hud');
    const name = document.getElementById('visit-hud-name');
    const meta = document.getElementById('visit-hud-meta');
    return {
      ok,
      active:    hud.classList.contains('active'),
      ariaHidden: hud.getAttribute('aria-hidden'),
      nameHasAlice:   /Alice/.test(name.textContent),
      nameHasCrest:   /🦅/.test(name.textContent),       // Serdaigle
      metaHasHouse:   /Serdaigle/.test(meta.textContent),
      metaHasFloor:   /Étage 4/.test(meta.textContent)
    };
  });
  console.log('  T2 showVisitHud →', t2);
  assert(t2.ok,             'showVisitHud retourne true');
  assert(t2.active,         '#visit-hud.active activé');
  assert(t2.ariaHidden === 'false', 'aria-hidden synchronisé');
  assert(t2.nameHasAlice,   'Nom host rendu');
  assert(t2.nameHasCrest,   'Blason de Maison rendu');
  assert(t2.metaHasHouse,   'Méta porte la maison');
  assert(t2.metaHasFloor,   'Méta porte l\'étage');

  // T3 : hideVisitHud retire la classe active.
  const t3 = await page.evaluate(() => {
    const ok  = hideVisitHud();
    const hud = document.getElementById('visit-hud');
    return { ok, active: hud.classList.contains('active'), aria: hud.getAttribute('aria-hidden') };
  });
  console.log('  T3 hideVisitHud →', t3);
  assert(t3.ok && !t3.active, 'HUD masqué après hide');
  assert(t3.aria === 'true',  'aria-hidden remis à true');

  // T4 : pipeline complet — mpStartVisitAsVisitor + snapshot → HUD affiché.
  const t4 = await page.evaluate(async () => {
    const fakeSnap = mpBuildVisitSnapshot({
      hostId: 'host-x', hostName: 'Bob', hostHouse: 'Poufsouffle', hostLevel: 6, currentFloor: 3
    });
    // Force currentFloor dans le payload pour rendre le test déterministe.
    fakeSnap.hostMeta.currentFloor = 3;
    window.__visitPollCalls = 0;
    window.mpPollVisitMessages = async () => {
      window.__visitPollCalls++;
      if (window.__visitPollCalls === 1) {
        return [{
          id: 'm1', sender: 'host', type: 'snapshot', payload: fakeSnap,
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    window.mpPostVisitMessage = async () => ({ id: 'p1', created_at: new Date().toISOString() });
    await mpStartVisitAsVisitor({ channelId: 'ch-hud-1', hostId: 'host-x', hostName: 'Bob', hostHouse: 'Poufsouffle' });
    const hud = document.getElementById('visit-hud');
    const name = document.getElementById('visit-hud-name');
    const meta = document.getElementById('visit-hud-meta');
    return {
      active: hud.classList.contains('active'),
      nameHasBob:   /Bob/.test(name.textContent),
      metaHasFloor: /Étage 3/.test(meta.textContent),
      sessionOpen: !!(visitSession && visitSession.role === 'visitor')
    };
  });
  console.log('  T4 pipeline snapshot → HUD →', t4);
  assert(t4.active,         'HUD activé après réception du snapshot');
  assert(t4.nameHasBob,     'Nom host remonté depuis le snapshot');
  assert(t4.metaHasFloor,   'Étage host remonté depuis le snapshot');
  assert(t4.sessionOpen,    'visitSession ouverte');

  // T5 : interactions bloquées en visite — _exploreDescriptors retourne
  // les variantes observation-only quand visitSession.role === 'visitor'.
  const t5 = await page.evaluate(() => {
    const d = _exploreDescriptors();
    return {
      chestBtns:    d[CELL.CHEST] && d[CELL.CHEST].btns,
      chestDesc:    d[CELL.CHEST] && d[CELL.CHEST].desc,
      stairsBtns:   d[CELL.STAIRS_D] && d[CELL.STAIRS_D].btns,
      stairsDesc:   d[CELL.STAIRS_D] && d[CELL.STAIRS_D].desc,
      fountainBtns: d[CELL.FOUNTAIN] && d[CELL.FOUNTAIN].btns,
      shopBtns:     d[CELL.SHOP] && d[CELL.SHOP].btns,
      hostName:     visitSession && visitSession.hostName
    };
  });
  console.log('  T5 interactions bloquées →', t5);
  assert(/S'éloigner/.test(t5.chestBtns),     'Coffre : un seul bouton "S\'éloigner"');
  assert(!/openChest/.test(t5.chestBtns),     'Coffre : pas de bouton "Ouvrir"');
  assert(/Bob/.test(t5.chestDesc),            'Coffre : message évoque le host');
  assert(/S'éloigner/.test(t5.stairsBtns),    'Escalier : pas de descente');
  assert(!/goDeeper/.test(t5.stairsBtns),     'Escalier : pas d\'appel goDeeper');
  assert(/Bob/.test(t5.stairsDesc),           'Escalier : message évoque le host');
  assert(!/useFountain/.test(t5.fountainBtns),'Fontaine : pas d\'appel useFountain');
  assert(!/openShop/.test(t5.shopBtns),       'Boutique : pas d\'appel openShop');

  // T6 : sortie volontaire via le bouton → bye posté + HUD masqué.
  const t6 = await page.evaluate(async () => {
    window.__visitPosted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__visitPosted.push({ channelId, sender, type, payload });
      return { id: 'p2', created_at: new Date().toISOString() };
    };
    await window._visitHudExit();
    const hud = document.getElementById('visit-hud');
    return {
      hudHidden:   !hud.classList.contains('active'),
      byePosted:   window.__visitPosted.find(p => p.type === 'bye'),
      sessionGone: visitSession === null,
      role:        (typeof window._visitGetState === 'function')
                     ? window._visitGetState().role : 'unknown'
    };
  });
  console.log('  T6 sortie bouton →', t6);
  assert(t6.hudHidden,                       'HUD masqué après exit');
  assert(!!t6.byePosted,                     'Message bye posté');
  assert(t6.byePosted.sender === 'visitor',  'bye signé visitor');
  assert(t6.sessionGone,                     'visitSession refermée');
  assert(t6.role === null,                   'État interne canal réinitialisé');

  // T7 : descripteurs reviennent à la normale hors visite.
  const t7 = await page.evaluate(() => {
    const d = _exploreDescriptors();
    return {
      chestHasOpen:    /openChest/.test(d[CELL.CHEST] && d[CELL.CHEST].btns || ''),
      shopHasOpen:     /openShop/.test(d[CELL.SHOP] && d[CELL.SHOP].btns || ''),
      fountainHasUse:  /useFountain/.test(d[CELL.FOUNTAIN] && d[CELL.FOUNTAIN].btns || '')
    };
  });
  console.log('  T7 retour à la normale →', t7);
  assert(t7.chestHasOpen,    'Coffre : "Ouvrir" restauré hors visite');
  assert(t7.shopHasOpen,     'Boutique : "Entrer" restauré hors visite');
  assert(t7.fountainHasUse,  'Fontaine : "Boire" restauré hors visite');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — HUD visite + blocage Phase C.3 OK');
  await browser.close();
}

async function scenarioVisitFloorUpdate() {
  console.log('\n── Scénario : Cheminette — multi-étages paresseux (Phase C.3b) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — helpers et hook host.
  const t1 = await page.evaluate(() => ({
    applyFloorUpdate:   typeof mpApplyVisitFloorUpdate === 'function',
    hostNotifyChange:   typeof window._visitHostNotifyFloorChange === 'function'
  }));
  console.log('  T1 surface →', t1);
  assert(t1.applyFloorUpdate, 'mpApplyVisitFloorUpdate exposé');
  assert(t1.hostNotifyChange, '_visitHostNotifyFloorChange exposé');

  // T2 : mpApplyVisitFloorUpdate refuse en l'absence de session.
  const t2 = await page.evaluate(() => {
    const fakeSnap = mpBuildVisitSnapshot({
      hostId: 'h', hostName: 'X', hostHouse: 'Gryffondor', hostLevel: 1
    });
    const ok = mpApplyVisitFloorUpdate(fakeSnap);
    return { ok, sessionNull: visitSession === null };
  });
  console.log('  T2 no-op hors session →', t2);
  assert(t2.ok === false,   'Refus si pas de session');
  assert(t2.sessionNull,    'Session reste null');

  // T3 : démarre une visite, puis applique un floorSnapshot — étage
  // mis à jour, mySavedState préservé.
  const t3 = await page.evaluate(async () => {
    // Snapshot initial — étage 3.
    const snap1 = mpBuildVisitSnapshot({
      hostId: 'host-9', hostName: 'Alice', hostHouse: 'Serdaigle', hostLevel: 5
    });
    snap1.hostMeta.currentFloor = 3;
    snap1.floor.number = 3;
    snap1.visitorSpawn = { x: 5, y: 5, dir: 's' };
    snap1.floor.grid[5][5] = CELL.FLOOR;

    // Snapshot étage 4 — pose une signature à (7,7).
    const snap2 = mpBuildVisitSnapshot({
      hostId: 'host-9', hostName: 'Alice', hostHouse: 'Serdaigle', hostLevel: 5
    });
    snap2.hostMeta.currentFloor = 4;
    snap2.floor.number = 4;
    snap2.visitorSpawn = { x: 8, y: 8, dir: 'n' };
    snap2.floor.grid[7][7] = CELL.CHEST;        // signature étage 4
    snap2.floor.grid[8][8] = CELL.FLOOR;

    // Stub poll : 1er appel → snapshot étage 3 ; 2e → floorSnapshot étage 4.
    window.__pollCalls = 0;
    window.mpPollVisitMessages = async () => {
      window.__pollCalls++;
      if (window.__pollCalls === 1) {
        return [{
          id: 'm1', sender: 'host', type: 'snapshot', payload: snap1,
          created_at: new Date().toISOString()
        }];
      }
      if (window.__pollCalls === 2) {
        return [{
          id: 'm2', sender: 'host', type: 'floorSnapshot', payload: snap2,
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    window.mpPostVisitMessage = async () => ({ id: 'p', created_at: new Date().toISOString() });

    await mpStartVisitAsVisitor({ channelId: 'ch-f', hostId: 'host-9', hostName: 'Alice', hostHouse: 'Serdaigle' });
    const after1 = {
      floor: currentFloor,
      posX:  playerX,
      posY:  playerY,
      hasMySaved:    !!(visitSession && visitSession.mySavedState),
      mySavedHouse:  visitSession && visitSession.mySavedState && visitSession.mySavedState.chosenHouse
    };
    // Deuxième tick pour faire passer le floorSnapshot.
    await window._visitPollOnce();
    const after2 = {
      floor: currentFloor,
      posX:  playerX,
      posY:  playerY,
      hasChestSignature: dungeon[7] && dungeon[7][7] === CELL.CHEST,
      mySavedStill: !!(visitSession && visitSession.mySavedState),
      mySavedSameHouse: visitSession && visitSession.mySavedState
                        && visitSession.mySavedState.chosenHouse === after1.mySavedHouse,
      remoteFloorMeta: visitSession && visitSession.remoteHostMeta
                        && visitSession.remoteHostMeta.currentFloor,
      hudFloor: (document.getElementById('visit-hud-meta') || {}).textContent || ''
    };
    return { after1, after2 };
  });
  console.log('  T3 floorSnapshot →', t3);
  assert(t3.after1.floor === 3,         'Après snapshot initial : étage 3');
  assert(t3.after1.posX === 5,          'Position visiteur posée sur visitorSpawn 1');
  assert(t3.after1.hasMySaved,          'mySavedState capturée');
  assert(t3.after2.floor === 4,         'Après floorSnapshot : étage 4');
  assert(t3.after2.posX === 8,          'Position visiteur mise à jour');
  assert(t3.after2.hasChestSignature,   'Donjon étage 4 injecté (signature CHEST visible)');
  assert(t3.after2.mySavedStill,        'mySavedState conservée (pas de reset)');
  assert(t3.after2.mySavedSameHouse,    'mySavedState identique à avant le patch');
  assert(t3.after2.remoteFloorMeta === 4, 'remoteHostMeta mis à jour avec le nouvel étage');
  assert(/Étage 4/.test(t3.after2.hudFloor), 'HUD reflète l\'étage 4');

  // T4 : sortie propre — mySavedState restauré normalement.
  const t4 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    await mpExitVisit('voluntary');
    return { sessionGone: visitSession === null };
  });
  console.log('  T4 sortie après multi-étages →', t4);
  assert(t4.sessionGone, 'visitSession refermée à la sortie');

  // T5 : hook host — _visitHostNotifyFloorChange poste floorSnapshot
  // quand role === 'host'.
  const t5 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    window.mpPollVisitMessages = async () => [];

    await mpStartVisitAsHost({
      channelId: 'ch-host', req: { id: 'r', visitor_id: 'v', visitor_name: 'B' }
    });
    // Le snapshot initial est posté au start — on vide pour ne mesurer
    // que l'effet du hook.
    window.__posted = [];
    const ok = await window._visitHostNotifyFloorChange();
    const floorMsg = window.__posted.find(p => p.type === 'floorSnapshot');
    await mpExitVisit('cleanup');
    return {
      ok,
      hasFloorSnap: !!floorMsg,
      sender:    floorMsg && floorMsg.sender,
      hasPayload: floorMsg && !!floorMsg.payload && !!floorMsg.payload.floor
    };
  });
  console.log('  T5 hook host →', t5);
  assert(t5.ok === true,            '_visitHostNotifyFloorChange retourne true');
  assert(t5.hasFloorSnap,           'floorSnapshot posté');
  assert(t5.sender === 'host',      'Message signé host');
  assert(t5.hasPayload,             'Payload contient floor');

  // T6 : hors visite, _visitHostNotifyFloorChange est un no-op.
  const t6 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    const ok = await window._visitHostNotifyFloorChange();
    return { ok, posted: window.__posted.length };
  });
  console.log('  T6 no-op hors visite →', t6);
  assert(t6.ok === false,   'No-op retourne false hors visite');
  assert(t6.posted === 0,   'Aucun message posté');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — multi-étages paresseux Phase C.3b OK');
  await browser.close();
}

async function scenarioVisitNetworkDrop() {
  console.log('\n── Scénario : Cheminette — drop réseau + keepalive (Phase C.4) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — helpers C.4 exposés.
  const t1 = await page.evaluate(() => ({
    checkTimeout:    typeof window._visitCheckTimeout    === 'function',
    sendPing:        typeof window._visitSendPing        === 'function',
    forceLastSeen:   typeof window._visitForceLastSeen   === 'function',
    initialState:    window._visitGetState()
  }));
  console.log('  T1 surface →', t1);
  assert(t1.checkTimeout,  '_visitCheckTimeout exposé');
  assert(t1.sendPing,      '_visitSendPing exposé');
  assert(t1.forceLastSeen, '_visitForceLastSeen exposé');
  assert(t1.initialState.lastSeen === 0, 'lastSeen=0 hors visite');

  // T2 : hors session, _visitCheckTimeout est un no-op (pas de
  // restauration parasite si rien n'est en cours).
  const t2 = await page.evaluate(() => {
    const ret = window._visitCheckTimeout();
    return { ret, sessionStillNull: visitSession === null };
  });
  console.log('  T2 no-op hors session →', t2);
  assert(t2.ret === false,    '_visitCheckTimeout retourne false hors session');
  assert(t2.sessionStillNull, 'visitSession reste null');

  // T3 : démarre une visite, lastSeen rafraîchi à l'arrivée du snapshot,
  // puis force un lastSeen ancien et vérifie que le drop se déclenche.
  const t3 = await page.evaluate(async () => {
    const snap = mpBuildVisitSnapshot({
      hostId: 'h', hostName: 'Alice', hostHouse: 'Serdaigle', hostLevel: 5
    });
    window.__pollCalls = 0;
    window.mpPollVisitMessages = async () => {
      window.__pollCalls++;
      if (window.__pollCalls === 1) {
        return [{
          id: 'm1', sender: 'host', type: 'snapshot', payload: snap,
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    window.__posted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };

    const goldBefore = player.gold;
    await mpStartVisitAsVisitor({ channelId: 'ch-drop', hostId: 'h', hostName: 'Alice', hostHouse: 'Serdaigle' });
    const afterStart = {
      role:      window._visitGetState().role,
      lastSeenAfterSnapshot: window._visitGetState().lastSeen > 0,
      sessionOpen: visitSession && visitSession.role === 'visitor'
    };

    // Simule 15 s sans aucun message reçu en arrière du curseur.
    window._visitForceLastSeen(Date.now() - 15000);
    await window._visitPollOnce();

    const afterDrop = {
      role:        window._visitGetState().role,
      sessionGone: visitSession === null,
      // pas de bye posté lors d'un drop (le partenaire est injoignable)
      byePosted:   !!window.__posted.find(p => p.type === 'bye'),
      goldRestored: player.gold === goldBefore
    };
    return { afterStart, afterDrop };
  });
  console.log('  T3 drop déclenché →', t3);
  assert(t3.afterStart.role === 'visitor',         'Visite démarrée');
  assert(t3.afterStart.lastSeenAfterSnapshot,      'lastSeen rafraîchi à réception du snapshot');
  assert(t3.afterStart.sessionOpen,                'visitSession ouverte');
  assert(t3.afterDrop.role === null,               'Drop ferme le canal (role=null)');
  assert(t3.afterDrop.sessionGone,                 'visitSession refermée après drop');
  assert(!t3.afterDrop.byePosted,                  'Aucun bye posté en cas de drop');
  assert(t3.afterDrop.goldRestored,                'Save d\'origine restaurée (or visiteur retrouvé)');

  // T4 : un ping reçu rafraîchit lastSeen — pas de drop après une
  // période de silence couverte par le ping.
  const t4 = await page.evaluate(async () => {
    const snap = mpBuildVisitSnapshot({
      hostId: 'h2', hostName: 'Bob', hostHouse: 'Poufsouffle', hostLevel: 3
    });
    window.__pollCalls = 0;
    window.mpPollVisitMessages = async () => {
      window.__pollCalls++;
      if (window.__pollCalls === 1) {
        return [{
          id: 'm1', sender: 'host', type: 'snapshot', payload: snap,
          created_at: new Date().toISOString()
        }];
      }
      if (window.__pollCalls === 2) {
        // Un ping arrive après une longue pause — devrait rafraîchir lastSeen.
        return [{
          id: 'm2', sender: 'host', type: 'ping', payload: {},
          created_at: new Date().toISOString()
        }];
      }
      return [];
    };
    window.mpPostVisitMessage = async () => ({ id: 'p', created_at: new Date().toISOString() });

    await mpStartVisitAsVisitor({ channelId: 'ch-ping', hostId: 'h2', hostName: 'Bob', hostHouse: 'Poufsouffle' });
    // Force lastSeen à un timestamp limite (5s ago) — sous le seuil de 10s.
    window._visitForceLastSeen(Date.now() - 5000);
    const beforePoll = window._visitGetState().lastSeen;
    await window._visitPollOnce();   // reçoit le ping → lastSeen mis à jour
    const afterPoll = window._visitGetState().lastSeen;

    const stillIn = !!(visitSession && visitSession.role === 'visitor');
    await mpExitVisit('cleanup');
    return {
      stillIn,
      lastSeenRefreshed: afterPoll > beforePoll,
      pollCalls: window.__pollCalls
    };
  });
  console.log('  T4 ping garde la session →', t4);
  assert(t4.stillIn,                'Session conservée après ping (pas de drop)');
  assert(t4.lastSeenRefreshed,      'lastSeen rafraîchi par le ping');
  assert(t4.pollCalls === 2,        'Deux tours de poll effectués');

  // T5 : _sendPing poste un message ping signé par le rôle courant.
  const t5 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPollVisitMessages = async () => [];
    window.mpPostVisitMessage  = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    await mpStartVisitAsHost({
      channelId: 'ch-host-ping',
      req: { id: 'r', visitor_id: 'v', visitor_name: 'Carol' }
    });
    window.__posted = [];   // ignore le snapshot initial
    await window._visitSendPing();
    const ping = window.__posted.find(p => p.type === 'ping');
    await mpExitVisit('cleanup');
    return { hasPing: !!ping, sender: ping && ping.sender, channel: ping && ping.channelId };
  });
  console.log('  T5 _sendPing →', t5);
  assert(t5.hasPing,           'Message ping posté');
  assert(t5.sender === 'host', 'Ping signé par le rôle courant');
  assert(t5.channel === 'ch-host-ping', 'Ping sur le bon canal');

  // T6 : _sendPing hors session est un no-op (ne crash pas).
  const t6 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    await window._visitSendPing();
    return { posted: window.__posted.length };
  });
  console.log('  T6 ping hors session →', t6);
  assert(t6.posted === 0,      'Aucun ping posté hors session');

  // T7 : drop côté host — pas de restauration mais session refermée.
  const t7 = await page.evaluate(async () => {
    window.__posted = [];
    window.mpPollVisitMessages = async () => [];
    window.mpPostVisitMessage  = async (channelId, sender, type, payload) => {
      window.__posted.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    await mpStartVisitAsHost({
      channelId: 'ch-host-drop',
      req: { id: 'r2', visitor_id: 'v2', visitor_name: 'Dave' }
    });
    window._visitForceLastSeen(Date.now() - 20000);
    window.__posted = [];
    await window._visitPollOnce();
    return {
      role:      window._visitGetState().role,
      byePosted: !!window.__posted.find(p => p.type === 'bye')
    };
  });
  console.log('  T7 drop host →', t7);
  assert(t7.role === null,    'Host drop ferme sa session');
  assert(!t7.byePosted,       'Host ne poste pas de bye en cas de drop');

  // T8 (S2.8) : cycle de vie des timers — vivants pendant la visite,
  // clearés par mpExitVisit ; _visitTeardownTimers est un no-op idempotent
  // hors visite (filet beforeunload/pagehide).
  const t8 = await page.evaluate(async () => {
    window.mpPollVisitMessages = async () => [];
    window.mpPostVisitMessage  = async () => ({ id: 'p', created_at: new Date().toISOString() });
    await mpStartVisitAsHost({
      channelId: 'ch-timers',
      req: { id: 'r3', visitor_id: 'v3', visitor_name: 'Eve' }
    });
    const live = window._visitTimersLive();           // attendu : poll+ping vivants
    await mpExitVisit('cleanup');
    const afterExit = window._visitTimersLive();        // attendu : tout null
    // Teardown hors session : doit rester un no-op silencieux.
    window._visitTeardownTimers();
    const afterTeardown = window._visitTimersLive();
    return { live, afterExit, afterTeardown };
  });
  console.log('  T8 timers lifecycle →', t8);
  assert(t8.live.poll && t8.live.ping,                 'timers poll+ping vivants pendant la visite');
  assert(!t8.afterExit.poll && !t8.afterExit.ping,     'mpExitVisit clear les deux timers');
  assert(!t8.afterTeardown.poll && !t8.afterTeardown.ping, '_visitTeardownTimers no-op hors session');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — drop réseau + keepalive Phase C.4 OK');
  await browser.close();
}

async function scenarioVisitBackendMissing() {
  console.log('\n── Scénario : Cheminette — backend absent / 404 (S2.7) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : mpPostVisitRequest sur 404 → breaker _mpVisitTableMissing,
  // 2e appel court-circuité (aucun fetch supplémentaire).
  const t1 = await page.evaluate(async () => {
    window._mpConfigured = () => true;          // simule HTTPS configuré
    _mpVisitTableMissing = false;
    window.__fetchCount = 0;
    window.fetch = async () => { window.__fetchCount++; return { ok: false, status: 404 }; };

    const r1 = await mpPostVisitRequest({ player_id: 'host-1' });
    const trippedAfter1 = _mpVisitTableMissing;
    const countAfter1   = window.__fetchCount;
    const r2 = await mpPostVisitRequest({ player_id: 'host-1' });
    const countAfter2   = window.__fetchCount;
    return { r1, r2, trippedAfter1, countAfter1, countAfter2 };
  });
  console.log('  T1 requests 404 →', t1);
  assert(t1.r1 === null,          'mpPostVisitRequest renvoie null sur 404');
  assert(t1.trippedAfter1,        'disjoncteur _mpVisitTableMissing armé après 404');
  assert(t1.countAfter1 === 1,    'un seul fetch tenté avant l\'armement');
  assert(t1.r2 === null,          '2e appel renvoie null (court-circuité)');
  assert(t1.countAfter2 === 1,    'aucun fetch supplémentaire une fois armé');

  // T2 : mpPostVisitMessage sur 404 → breaker _mpVisitMsgTableMissing.
  const t2 = await page.evaluate(async () => {
    window._mpConfigured = () => true;
    _mpVisitMsgTableMissing = false;
    window.__fetchCount = 0;
    window.fetch = async () => { window.__fetchCount++; return { ok: false, status: 404 }; };

    const r1 = await mpPostVisitMessage('ch-1', 'host', 'snapshot', { a: 1 });
    const tripped = _mpVisitMsgTableMissing;
    const c1 = window.__fetchCount;
    const r2 = await mpPostVisitMessage('ch-1', 'host', 'snapshot', { a: 1 });
    const c2 = window.__fetchCount;
    // Le poll de canal doit aussi court-circuiter une fois le breaker armé.
    const poll = await mpPollVisitMessages('ch-1', null, 'visitor');
    const c3 = window.__fetchCount;
    return { r1, r2, tripped, c1, c2, poll, c3 };
  });
  console.log('  T2 messages 404 →', t2);
  assert(t2.r1 === null,        'mpPostVisitMessage renvoie null sur 404');
  assert(t2.tripped,            'disjoncteur _mpVisitMsgTableMissing armé');
  assert(t2.c1 === 1,           'un seul fetch avant armement');
  assert(t2.c2 === 1,           'POST suivant court-circuité');
  assert(t2.poll === null,      'mpPollVisitMessages court-circuité (null)');
  assert(t2.c3 === 1,           'le poll ne refait aucun fetch');

  // T3 : mpPostBloodSeal sur 404 → breaker _mpThreatsTableMissing ; les
  // lectures host/visiteur court-circuitent en tableau vide (pas null).
  const t3 = await page.evaluate(async () => {
    window._mpConfigured = () => true;
    _mpThreatsTableMissing = false;
    window.__fetchCount = 0;
    window.fetch = async () => { window.__fetchCount++; return { ok: false, status: 404 }; };

    const r1 = await mpPostBloodSeal({
      visitor_id: 'v', visitor_name: 'V', host_id: 'h',
      floor: 3, x: 2, y: 2, monster_id: 'troll', status: 'pending'
    });
    const tripped = _mpThreatsTableMissing;
    const c1 = window.__fetchCount;
    const listHost    = await mpListHostSealsForFloor('h', 3);
    const listVisitor = await mpListVisitorResolvedSeals('v');
    const c2 = window.__fetchCount;
    return { r1, tripped, c1, listHost, listVisitor, c2 };
  });
  console.log('  T3 threats 404 →', t3);
  assert(t3.r1 === null,                   'mpPostBloodSeal renvoie null sur 404');
  assert(t3.tripped,                       'disjoncteur _mpThreatsTableMissing armé');
  assert(t3.c1 === 1,                      'un seul fetch avant armement');
  assert(Array.isArray(t3.listHost) && t3.listHost.length === 0,       'liste host vide (court-circuit)');
  assert(Array.isArray(t3.listVisitor) && t3.listVisitor.length === 0, 'liste visiteur vide (court-circuit)');
  assert(t3.c2 === 1,                      'les lectures ne refont aucun fetch');

  // T4 : le poll entrant s'arrête net sur 404 — un tour arme le breaker,
  // le tour suivant retourne immédiatement sans fetch (pas de martèlement).
  const t4 = await page.evaluate(async () => {
    window._mpConfigured = () => true;
    mpActive = true; mpMode = 'normal';
    _mpVisitTableMissing = false;
    if (typeof window._mpVisitPendingReq !== 'undefined') window._mpVisitPendingReq = null;
    window.__fetchCount = 0;
    window.fetch = async () => { window.__fetchCount++; return { ok: false, status: 404 }; };

    await _mpPollIncomingVisitRequests();   // arme le breaker
    const trippedAfter1 = _mpVisitTableMissing;
    const c1 = window.__fetchCount;
    await _mpPollIncomingVisitRequests();   // doit court-circuiter
    const c2 = window.__fetchCount;
    mpActive = false;
    return { trippedAfter1, c1, c2 };
  });
  console.log('  T4 poll entrant 404 →', t4);
  assert(t4.trippedAfter1,   'le poll entrant arme le breaker sur 404');
  assert(t4.c1 === 1,        'un seul fetch au premier tour');
  assert(t4.c2 === 1,        'poll suivant court-circuité (aucun fetch)');

  // T5 : mpListAvailableHosts sur 404 → null (traité comme erreur réseau),
  // ce que la modale matchmaking rend en « réseau silencieux ».
  const t5 = await page.evaluate(async () => {
    window._mpConfigured = () => true;
    window.fetch = async () => { return { ok: false, status: 404 }; };
    const hosts = await mpListAvailableHosts();
    return { hosts };
  });
  console.log('  T5 hosts 404 →', t5);
  assert(t5.hosts === null, 'mpListAvailableHosts renvoie null sur 404 (→ message silencieux)');

  // T6 (S2.9) : retry des Verrous orphelins. Une entrée 'local-…' (POST
  // initial échoué) est ré-envoyée ; au succès son id devient l'id serveur.
  const t6 = await page.evaluate(async () => {
    outremondePendingSeals = [
      { id: 'local-111', hostId: 'h9', hostName: 'Zoe', monsterId: 'troll', floor: 4, x: 3, y: 5, postedAt: Date.now() },
      { id: 'srv-abc',   hostId: 'h9', hostName: 'Zoe', monsterId: 'kappa', floor: 4, x: 1, y: 1, postedAt: Date.now() }
    ];
    window.__sealPosts = [];
    window.mpPostBloodSeal = async (payload) => {
      window.__sealPosts.push(payload);
      return { id: 'server-999', status: 'pending' };
    };
    const repaired = await _retryOrphanSeals();
    return {
      repaired,
      ids:        outremondePendingSeals.map(s => s.id),
      postCount:  window.__sealPosts.length,
      postedMon:  window.__sealPosts.map(p => p.monster_id)
    };
  });
  console.log('  T6 retry orphelins →', t6);
  assert(t6.repaired === 1,                    'un seul orphelin réparé');
  assert(t6.postCount === 1,                   'seul le verrou local-… est ré-posté');
  assert(t6.postedMon[0] === 'troll',          'le bon orphelin (troll) est ré-posté');
  assert(t6.ids.includes('server-999'),        'l\'id local est remplacé par l\'id serveur');
  assert(!t6.ids.includes('local-111'),        'plus aucune trace de l\'id local');
  assert(t6.ids.includes('srv-abc'),           'le verrou déjà serveur reste intact');

  // T7 (S2.9) : si le re-POST échoue encore (null), l'orphelin reste local
  // pour un essai ultérieur — aucune perte, idempotent.
  const t7 = await page.evaluate(async () => {
    outremondePendingSeals = [
      { id: 'local-222', hostId: 'h', hostName: 'A', monsterId: 'kappa', floor: 2, x: 1, y: 1, postedAt: Date.now() }
    ];
    window.mpPostBloodSeal = async () => null;   // encore hors-ligne
    const repaired = await _retryOrphanSeals();
    return { repaired, ids: outremondePendingSeals.map(s => s.id) };
  });
  console.log('  T7 retry échoue →', t7);
  assert(t7.repaired === 0,                'aucun réparé si POST échoue encore');
  assert(t7.ids.includes('local-222'),     'l\'orphelin reste local pour un retry futur');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — backend absent / 404 dégrade proprement OK');
  await browser.close();
}

async function scenarioVisitPhaseD() {
  console.log('\n── Scénario : Cheminette — limites + sprites + emotes (Phase D) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — helpers Phase D exposés.
  const t1 = await page.evaluate(() => ({
    fogBlock:        typeof _isVisitorFogBlock     === 'function',
    notifyVisitor:   typeof _visitNotifyVisitorMove === 'function',
    notifyHost:      typeof _visitNotifyHostMove   === 'function',
    sendEmote:       typeof _visitSendEmote        === 'function',
    getVisitor:      typeof getVisitorAt           === 'function',
    getRemoteHost:   typeof getRemoteHostAt        === 'function',
    drawVisitor:     typeof drawVisitorSprite      === 'function',
    hudEmote:        typeof _visitHudEmote         === 'function',
    visitorEmotes:   typeof VISITOR_EMOTES         === 'object' && Object.keys(VISITOR_EMOTES).length === 4,
    hostEmotes:      typeof HOST_EMOTES            === 'object' && Object.keys(HOST_EMOTES).length === 1,
    emotesContainer: !!document.getElementById('visit-hud-emotes')
  }));
  console.log('  T1 surface →', t1);
  assert(t1.fogBlock,        '_isVisitorFogBlock exposé');
  assert(t1.notifyVisitor,   '_visitNotifyVisitorMove exposé');
  assert(t1.notifyHost,      '_visitNotifyHostMove exposé');
  assert(t1.sendEmote,       '_visitSendEmote exposé');
  assert(t1.getVisitor,      'getVisitorAt exposé');
  assert(t1.getRemoteHost,   'getRemoteHostAt exposé');
  assert(t1.drawVisitor,     'drawVisitorSprite exposé');
  assert(t1.hudEmote,        '_visitHudEmote exposé');
  assert(t1.visitorEmotes,   'VISITOR_EMOTES : 4 entrées (👋 🪄 🏰 🎯)');
  assert(t1.hostEmotes,      'HOST_EMOTES : 1 entrée (👋)');
  assert(t1.emotesContainer, '#visit-hud-emotes présent dans le DOM');

  // T2 : blocage brouillard — pose une case FLOOR atteignable mais non
  // visitée, vérifie que canMove la rejette en visite (et autorise hors visite).
  const t2 = await page.evaluate(() => {
    // Hors visite : on s'attend à pouvoir traverser une case FLOOR visited.
    // On force le contexte : pose le joueur à (5,5) regardant nord.
    playerX = 5; playerY = 5; playerDir = 'n';
    dungeon[5][5] = CELL.FLOOR;
    dungeon[4][5] = CELL.FLOOR;
    visited[5][5] = true;
    visited[4][5] = true;
    const canOutside = canMove('n');

    // Snapshot factice — masque visited = tout faux SAUF (5,5) (pas (4,5)).
    const fake = mpBuildVisitSnapshot({
      hostId: 'h', hostName: 'Alice', hostHouse: 'Gryffondor', hostLevel: 1
    });
    // Maille petite : on remet une grille basique pour le test.
    // (On garde la grille originale pour ne pas casser d'autres invariants.)
    // Injecte la session manuellement (sans passer par le canal réseau).
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:        'visitor',
        hostId:      'h',
        hostName:    'Alice',
        hostHouse:   'Gryffondor',
        mySavedState: null,    // on ne va pas restaurer dans ce test
      };
    }
    // Recopie la grille / visited pour avoir un contrôle direct.
    playerX = 5; playerY = 5; playerDir = 'n';
    dungeon[5][5] = CELL.FLOOR;
    dungeon[4][5] = CELL.FLOOR;
    visited[5][5] = true;
    visited[4][5] = false;          // brouillard sur la case au nord
    const fogBlocked = _isVisitorFogBlock('n');
    const canDuringVisit = canMove('n');

    // Lève maintenant le brouillard et vérifie que canMove passe.
    visited[4][5] = true;
    const fogClear = _isVisitorFogBlock('n');
    const canAfterReveal = canMove('n');

    // Nettoie pour ne pas polluer les T suivants.
    if (typeof visitSession !== 'undefined') visitSession = null;
    return { canOutside, fogBlocked, canDuringVisit, fogClear, canAfterReveal };
  });
  console.log('  T2 blocage brouillard →', t2);
  assert(t2.canOutside === true,       'Hors visite, canMove passe normalement');
  assert(t2.fogBlocked === true,       'En visite, _isVisitorFogBlock détecte la case non foulée');
  assert(t2.canDuringVisit === false,  'En visite, canMove rejette la case brouillard');
  assert(t2.fogClear === false,        'Après révélation, plus de brouillard détecté');
  assert(t2.canAfterReveal === true,   'Après révélation, canMove passe');

  // T3 : visiteur émet sa position via _visitNotifyVisitorMove — message posté.
  const t3 = await page.evaluate(async () => {
    window.__postedD = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__postedD.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    window.mpPollVisitMessages = async () => [];
    const fake = mpBuildVisitSnapshot({
      hostId: 'h-pos', hostName: 'Beatrice', hostHouse: 'Serdaigle', hostLevel: 4
    });
    fake.hostMeta.currentFloor = 2;
    fake.floor.number = 2;
    fake.visitorSpawn = { x: 3, y: 3, dir: 's' };
    fake.floor.grid[3][3] = CELL.FLOOR;
    fake.floor.visitedMask[3][3] = true;
    window.__pollCount = 0;
    window.mpPollVisitMessages = async () => {
      if (window.__pollCount++ === 0) {
        return [{ id: 'm1', sender: 'host', type: 'snapshot', payload: fake,
                  created_at: new Date().toISOString() }];
      }
      return [];
    };
    await mpStartVisitAsVisitor({ channelId: 'ch-D-pos', hostId: 'h-pos', hostName: 'Beatrice', hostHouse: 'Serdaigle' });
    // Throttle reset pour autoriser l'émission immédiate.
    window._visitResetThrottles();
    playerX = 4; playerY = 3; playerDir = 'e';
    const sent = await window._visitNotifyVisitorMove();
    const posMsg = window.__postedD.find(p => p.type === 'position');
    return {
      sent,
      hasPosition: !!posMsg,
      sender:      posMsg && posMsg.sender,
      x:           posMsg && posMsg.payload.x,
      y:           posMsg && posMsg.payload.y,
      dir:         posMsg && posMsg.payload.dir,
      floor:       posMsg && posMsg.payload.floor
    };
  });
  console.log('  T3 position visiteur →', t3);
  assert(t3.sent === true,         'Visiteur a émis position');
  assert(t3.hasPosition,           'Message position trouvé');
  assert(t3.sender === 'visitor',  'Signé visitor');
  assert(t3.x === 4 && t3.y === 3, 'Coords posées correctement');
  assert(t3.dir === 'e',           'Direction posée correctement');
  assert(t3.floor === 2,           'Étage posé correctement');

  // T4 : host reçoit position visiteur → visitSession.visitors + getVisitorAt.
  // On reconfigure une session côté host (la précédente est encore active
  // côté visiteur — on la ferme d'abord).
  const t4 = await page.evaluate(async () => {
    await mpExitVisit('cleanup');
    window.__postedD = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__postedD.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    let pollCount = 0;
    window.mpPollVisitMessages = async () => {
      if (pollCount++ === 0) {
        // Le visiteur arrive sur la case (6, 7), regard est, étage 1.
        return [{ id: 'm-pos', sender: 'visitor', type: 'position',
                  payload: { x: 6, y: 7, dir: 'e', floor: currentFloor },
                  created_at: new Date().toISOString() }];
      }
      return [];
    };
    await mpStartVisitAsHost({
      channelId: 'ch-D-host',
      req: { id: 'r-D', visitor_id: 'v-D', visitor_name: 'Carla', visitor_house: 'Poufsouffle' }
    });
    // Force un poll pour traiter la position.
    await window._visitPollOnce();
    const v = window.getVisitorAt(6, 7);
    return {
      sessionRole: visitSession && visitSession.role,
      hasVisitor:  !!v,
      visitorName: v && v.name,
      visitorDir:  v && v.dir,
      visitorsLen: visitSession && visitSession.visitors && visitSession.visitors.length,
      nonHit:      window.getVisitorAt(0, 0),
      hudActive:   document.getElementById('visit-hud').classList.contains('active'),
      hudExitLbl:  document.getElementById('visit-hud-exit').textContent,
      emotesRendered: document.querySelectorAll('#visit-hud-emotes .visit-hud-emote').length
    };
  });
  console.log('  T4 host reçoit visiteur →', t4);
  assert(t4.sessionRole === 'host', 'visitSession.role = host côté host');
  assert(t4.hasVisitor,             'getVisitorAt retourne le visiteur sur la case');
  assert(t4.visitorName === 'Carla', 'Nom du visiteur transmis');
  assert(t4.visitorDir === 'e',     'Direction du visiteur transmise');
  assert(t4.visitorsLen === 1,      'Un visiteur dans la liste');
  assert(t4.nonHit === null,        'getVisitorAt(0,0) hors présence → null');
  assert(t4.hudActive,              'HUD activé côté host');
  assert(/Refermer/.test(t4.hudExitLbl), 'Bouton sortie : "Refermer la cheminée" côté host');
  assert(t4.emotesRendered === 1,   'Bandeau host : 1 emote (👋)');

  // T5 : envoi d'emote côté host → message 'emote' posté + banque verrouillée.
  const t5 = await page.evaluate(async () => {
    window.__postedD = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__postedD.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    window._visitResetThrottles();
    const sentOk = await window._visitSendEmote('welcome');
    window._visitResetThrottles();
    const sentBad = await window._visitSendEmote('wave');   // hors banque host
    const emoteMsg = window.__postedD.find(p => p.type === 'emote' && p.payload && p.payload.kind === 'welcome');
    return {
      sentOk, sentBad,
      hasEmote: !!emoteMsg,
      sender:   emoteMsg && emoteMsg.sender,
      kind:     emoteMsg && emoteMsg.payload && emoteMsg.payload.kind,
      noWaveMsg: !window.__postedD.find(p => p.type === 'emote' && p.payload && p.payload.kind === 'wave')
    };
  });
  console.log('  T5 emote host →', t5);
  assert(t5.sentOk === true,        'Emote welcome envoyée');
  assert(t5.sentBad === false,      'Emote wave (banque visiteur) rejetée côté host');
  assert(t5.hasEmote,               'Message emote trouvé');
  assert(t5.sender === 'host',      'Signé host');
  assert(t5.kind === 'welcome',     'Kind welcome');
  assert(t5.noWaveMsg,              'Aucun message wave posté (banque close)');

  // T6 : réception d'emote inconnue → ignorée silencieusement.
  const t6 = await page.evaluate(async () => {
    // Simule la réception d'un emote forgé.
    const initialMsgCount = document.querySelectorAll('#message-log .msg, .msg').length;
    let pollCount = 0;
    window.mpPollVisitMessages = async () => {
      if (pollCount++ === 0) {
        return [{ id: 'm-bad', sender: 'visitor', type: 'emote',
                  payload: { kind: 'pwn_attack' },
                  created_at: new Date().toISOString() }];
      }
      return [];
    };
    await window._visitPollOnce();
    // Aucune erreur, le toast d'addMsg n'apparaît pas avec ce kind inconnu.
    // On vérifie juste que la session reste vivante (pas d'erreur de handler).
    return {
      sessionStill: !!visitSession,
      role:         visitSession && visitSession.role
    };
  });
  console.log('  T6 emote inconnue ignorée →', t6);
  assert(t6.sessionStill,         'Session vivante après emote inconnue');
  assert(t6.role === 'host',      'Role inchangé');

  // T7 : sortie host → visitSession nullée + sprite/marqueur disparaît
  // (visitors vide).
  const t7 = await page.evaluate(async () => {
    window.__postedD = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__postedD.push({ channelId, sender, type, payload });
      return { id: 'p', created_at: new Date().toISOString() };
    };
    await mpExitVisit('voluntary');
    const v = (typeof window.getVisitorAt === 'function') ? window.getVisitorAt(6, 7) : null;
    return {
      sessionGone:  visitSession === null,
      noVisitor:    v === null,
      byePosted:    !!window.__postedD.find(p => p.type === 'bye'),
      hudHidden:    !document.getElementById('visit-hud').classList.contains('active')
    };
  });
  console.log('  T7 sortie host →', t7);
  assert(t7.sessionGone,  'visitSession refermée côté host');
  assert(t7.noVisitor,    'getVisitorAt retourne null après sortie');
  assert(t7.byePosted,    'bye posté à la sortie volontaire');
  assert(t7.hudHidden,    'HUD masqué après sortie');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase D OK');
  await browser.close();
}

async function scenarioVisitPhaseE() {
  console.log('\n── Scénario : Cheminette — dialogues PNJ voyageur (Phase E) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — fonctions Phase E exposées.
  const t1 = await page.evaluate(() => ({
    openAstral:        typeof openAstralNpcDialog === 'function',
    astralCategory:    typeof _astralCategory     === 'function',
    astralFallback:    typeof _astralFallbackPages === 'function',
    overlayInDOM:      !!document.getElementById('npc-dialog-overlay')
  }));
  console.log('  T1 surface →', t1);
  assert(t1.openAstral,     'openAstralNpcDialog exposé');
  assert(t1.astralCategory, '_astralCategory exposé');
  assert(t1.astralFallback, '_astralFallbackPages exposé');
  assert(t1.overlayInDOM,   '#npc-dialog-overlay présent');

  // T2 : catégorisation par type de PNJ. Cascade prioritaire :
  // quest > vendor > special > lore > default.
  const t2 = await page.evaluate(() => {
    const pomfresh = getNpcById('pomfresh');           // questsGiven non vide
    const rosmerta = getNpcById('rosmerta');           // wares uniquement (pas de questsGiven)
    const fumseck  = getNpcById('fumseck');            // specialAction + questsGiven (quest gagne)
    const mimi     = getNpcById('mimi');               // questsGiven + fantome (quest gagne)
    return {
      catPomfresh: _astralCategory(pomfresh),
      catRosmerta: _astralCategory(rosmerta),
      catFumseck:  _astralCategory(fumseck),
      catMimi:     _astralCategory(mimi)
    };
  });
  console.log('  T2 catégories →', t2);
  assert(t2.catPomfresh === 'quest',  'Pomfresh = quest (questsGiven)');
  assert(t2.catRosmerta === 'vendor', 'Rosmerta = vendor (wares pur)');
  assert(t2.catFumseck  === 'quest',  'Fumseck = quest (priorité questsGiven > specialAction)');
  assert(t2.catMimi     === 'quest',  'Mimi = quest (questsGiven prioritaire)');

  // T3 : ouverture d'un dialogue astral avec banque authored (Pomfresh).
  // On force `visitSession` côté visiteur pour que les guards passent.
  const t3 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:      'visitor',
        hostId:    'h-E',
        hostName:  'Alice',
        hostHouse: 'Gryffondor',
        mySavedState: null
      };
    }
    const beforeQuests = activeQuests.length;
    openAstralNpcDialog('pomfresh');
    const overlay  = document.getElementById('npc-dialog-overlay');
    const titleEl  = document.getElementById('npc-dialog-title');
    const textEl   = document.getElementById('npc-dialog-text');
    const display  = overlay.style.display;
    const titleTxt = titleEl ? titleEl.textContent : '';
    const text1    = textEl ? textEl.textContent : '';
    // Avance jusqu'à la dernière page pour voir les actions finales.
    while (_dialogState && _dialogState.page < _dialogState.pages.length - 1) {
      nextDialogPage();
    }
    const actionsEl = document.getElementById('npc-dialog-actions');
    const text     = textEl ? textEl.textContent : text1;
    const actions  = actionsEl ? actionsEl.innerHTML : '';
    closeNpcDialog();
    const afterQuests = activeQuests.length;
    if (typeof visitSession !== 'undefined') visitSession = null;
    return {
      display, titleTxt, text1, text, actions,
      questsUnchanged: beforeQuests === afterQuests,
      hasVoyageurTag:  /voyageur d'un autre plan/.test(titleTxt),
      hasAuthored:     /silhouette familière|Mandragores n'ont rien/.test(text1 + text),
      hasAccept:       /Accepter la quête/.test(actions),
      hasShop:         /Voir les marchandises/.test(actions),
      hasSpecial:      /Action spéciale|Recevoir les larmes/.test(actions),
      hasGoAway:       /S'éloigner/.test(actions)
    };
  });
  console.log('  T3 Pomfresh authored →', t3);
  assert(t3.display === 'flex',     'Overlay PNJ ouvert');
  assert(t3.hasVoyageurTag,         'Titre suffixé « voyageur d\'un autre plan »');
  assert(t3.hasAuthored,             'Texte authored de dialoguesAstral affiché');
  assert(!t3.hasAccept,              'Pas de bouton "Accepter la quête"');
  assert(!t3.hasShop,                'Pas de bouton "Voir les marchandises"');
  assert(!t3.hasSpecial,             'Pas de bouton d\'action spéciale');
  assert(t3.hasGoAway,               'Bouton "S\'éloigner" présent');
  assert(t3.questsUnchanged,         'activeQuests intact après dialogue astral');

  // T4 : ouverture d'un dialogue astral sans banque authored — fallback
  // générique. On choisit un PNJ sans dialoguesAstral : 'manon' (quête).
  const t4 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:'visitor', hostId:'h', hostName:'B', hostHouse:'Serdaigle', mySavedState:null
      };
    }
    const manon = getNpcById('manon');
    const hasAuthored = !!(manon && manon.dialoguesAstral);
    openAstralNpcDialog('manon');
    const textEl = document.getElementById('npc-dialog-text');
    const text = textEl ? textEl.textContent : '';
    closeNpcDialog();
    if (typeof visitSession !== 'undefined') visitSession = null;
    return {
      hasAuthored,
      fallbackQuest: /mission|liens entre nos mondes/.test(text)
    };
  });
  console.log('  T4 fallback quête →', t4);
  assert(!t4.hasAuthored,      'Manon n\'a pas de dialoguesAstral (banque générique attendue)');
  assert(t4.fallbackQuest,     'Fallback "quest" affiché (mission / liens entre mondes)');

  // T5 : fallback vendor — Rosmerta (vendeur pur sans dialoguesAstral).
  const t5 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') {
      visitSession = { role:'visitor', hostId:'h', hostName:'C', hostHouse:'Serpentard', mySavedState:null };
    }
    const rosmerta = getNpcById('rosmerta');
    const hasAuthored = !!(rosmerta && rosmerta.dialoguesAstral);
    openAstralNpcDialog('rosmerta');
    const text = (document.getElementById('npc-dialog-text') || {}).textContent || '';
    closeNpcDialog();
    if (typeof visitSession !== 'undefined') visitSession = null;
    return { hasAuthored, fallbackVendor: /marchandises n'ont pas de poids|murmure/.test(text) };
  });
  console.log('  T5 fallback vendeur →', t5);
  assert(!t5.hasAuthored,      'Rosmerta sans dialoguesAstral');
  assert(t5.fallbackVendor,    'Fallback "vendor" affiché');

  // T6 : intégration handleCellEntry — sur une case NPC en visite,
  // ouvre le dialogue astral (pas le dialogue normal).
  const t6 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') {
      visitSession = { role:'visitor', hostId:'h', hostName:'D', hostHouse:'Poufsouffle', mySavedState:null };
    }
    // Pose un PNJ pomfresh sur la case courante.
    playerX = 10; playerY = 10;
    dungeon[10][10] = CELL.NPC;
    npcPlacements.set('10,10', 'pomfresh');
    visited[10][10] = true;
    // Simule l'entrée sur la case.
    handleCellEntry(CELL.NPC);
    const overlay = document.getElementById('npc-dialog-overlay');
    const displayed = overlay.style.display === 'flex';
    const title = (document.getElementById('npc-dialog-title') || {}).textContent || '';
    closeNpcDialog();
    npcPlacements.delete('10,10');
    if (typeof visitSession !== 'undefined') visitSession = null;
    return { displayed, hasVoyageurTag: /voyageur d'un autre plan/.test(title) };
  });
  console.log('  T6 intégration cell entry →', t6);
  assert(t6.displayed,       'Overlay ouvert via handleCellEntry en visite');
  assert(t6.hasVoyageurTag,  'Dialogue ouvert en mode astral (titre tagué)');

  // T7 : hors visite, handleCellEntry route toujours vers openNpcDialog
  // normal. On vérifie qu'aucune régression : titre SANS le tag astral.
  const t7 = await page.evaluate(() => {
    playerX = 11; playerY = 11;
    dungeon[11][11] = CELL.NPC;
    npcPlacements.set('11,11', 'pomfresh');
    visited[11][11] = true;
    // S'assure qu'on est hors visite.
    if (typeof visitSession !== 'undefined') visitSession = null;
    handleCellEntry(CELL.NPC);
    const title = (document.getElementById('npc-dialog-title') || {}).textContent || '';
    closeNpcDialog();
    npcPlacements.delete('11,11');
    return {
      noVoyageurTag: !/voyageur d'un autre plan/.test(title),
      titleContent:  title
    };
  });
  console.log('  T7 hors visite normal →', t7);
  assert(t7.noVoyageurTag,   'Hors visite, dialogue normal (pas de tag voyageur)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase E OK');
  await browser.close();
}

async function scenarioVisitPhaseF() {
  console.log('\n── Scénario : Cheminette — polish Phase F ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — fonctions Phase F exposées + bouton dans le DOM.
  const t1 = await page.evaluate(() => ({
    visitsClosedDefined: typeof visitsClosed       !== 'undefined',
    visitsClosedFalse:   typeof visitsClosed       !== 'undefined' && visitsClosed === false,
    toggleFn:            typeof toggleVisitsClosed === 'function',
    updateBtn:           typeof _updateVisitsBtn   === 'function',
    qualityBadge:        typeof updateVisitQualityBadge === 'function',
    getQuality:          typeof window._visitGetQuality === 'function',
    isReconnect:         typeof window._visitIsReconnecting === 'function',
    btnInDom:            !!document.getElementById('btn-visits'),
    badgeInDom:          !!document.getElementById('visit-hud-quality')
  }));
  console.log('  T1 surface →', t1);
  assert(t1.visitsClosedDefined,  'visitsClosed déclaré');
  assert(t1.visitsClosedFalse,    'visitsClosed par défaut = false');
  assert(t1.toggleFn,             'toggleVisitsClosed exposé');
  assert(t1.updateBtn,            '_updateVisitsBtn exposé');
  assert(t1.qualityBadge,         'updateVisitQualityBadge exposé');
  assert(t1.getQuality,           '_visitGetQuality exposé');
  assert(t1.isReconnect,          '_visitIsReconnecting exposé');
  assert(t1.btnInDom,             '#btn-visits dans le DOM');
  assert(t1.badgeInDom,           '#visit-hud-quality dans le DOM');

  // T2 : toggle visites — icône bouton + status mp_presence + persistance.
  const t2 = await page.evaluate(() => {
    // Initial : ouvert.
    _updateVisitsBtn();
    const iconOpen = document.querySelector('#btn-visits .btn-icon').textContent;
    const titleOpen = document.getElementById('btn-visits').title;
    // Trigger toggle → fermé.
    toggleVisitsClosed();
    const closedAfter = visitsClosed === true;
    const iconClosed = document.querySelector('#btn-visits .btn-icon').textContent;
    const titleClosed = document.getElementById('btn-visits').title;
    // Vérifie qu'au prochain _mpPresenceRow, le status devient 'closed'.
    // Stub minimal : on appelle directement la fonction interne via window
    // si exposée — sinon on lit le placeholder dans _mpPresenceRow ?
    // Plus simple : check via la sérialisation save.
    const snap = _serializeState();
    const inSave = snap.visitsClosed === true;
    // Retour à l'état ouvert pour ne pas polluer la suite.
    toggleVisitsClosed();
    const reopened = visitsClosed === false;
    return {
      iconOpen, titleOpen, iconClosed, titleClosed,
      closedAfter, inSave, reopened
    };
  });
  console.log('  T2 toggle →', t2);
  assert(t2.iconOpen === '🚪',           'Icône bouton = 🚪 quand ouvert');
  assert(/ouvert/.test(t2.titleOpen),    'Tooltip "ouvert" dans le titre');
  assert(t2.closedAfter,                 'visitsClosed = true après toggle');
  assert(t2.iconClosed === '🔒',         'Icône bouton = 🔒 quand fermé');
  assert(/fermé/.test(t2.titleClosed),   'Tooltip "fermé" dans le titre');
  assert(t2.inSave,                      'Persistance dans _serializeState');
  assert(t2.reopened,                    '2e toggle remet visitsClosed à false');

  // T3 : qualité réseau — états 'good' / 'degraded' / 'lost' reflétés
  // sur le badge HUD.
  const t3 = await page.evaluate(() => {
    const states = [];
    updateVisitQualityBadge('good');
    states.push({
      attr:  document.getElementById('visit-hud-quality').getAttribute('data-quality'),
      label: document.querySelector('#visit-hud-quality .visit-hud-quality-label').textContent,
      title: document.getElementById('visit-hud-quality').getAttribute('title')
    });
    updateVisitQualityBadge('degraded');
    states.push({
      attr:  document.getElementById('visit-hud-quality').getAttribute('data-quality'),
      label: document.querySelector('#visit-hud-quality .visit-hud-quality-label').textContent
    });
    updateVisitQualityBadge('lost');
    states.push({
      attr:  document.getElementById('visit-hud-quality').getAttribute('data-quality'),
      label: document.querySelector('#visit-hud-quality .visit-hud-quality-label').textContent
    });
    // Reset
    updateVisitQualityBadge('good');
    return states;
  });
  console.log('  T3 badge qualité →', t3);
  assert(t3[0].attr === 'good'      && /Stable/.test(t3[0].label),    'État good rendu');
  assert(/stable/i.test(t3[0].title),                                  'Tooltip stable');
  assert(t3[1].attr === 'degraded'  && /Instable/.test(t3[1].label),   'État degraded rendu');
  assert(t3[2].attr === 'lost'      && /Rompue/.test(t3[2].label),     'État lost rendu');

  // T4 : période de grâce — entre 5 s et 10 s sans message, on bascule en
  // 'degraded' + reconnect mode actif. Au-delà de 10 s, drop hard.
  const t4 = await page.evaluate(async () => {
    const snap = mpBuildVisitSnapshot({
      hostId: 'h-F', hostName: 'Alice', hostHouse: 'Gryffondor', hostLevel: 1
    });
    let pollCount = 0;
    window.mpPollVisitMessages = async () => {
      if (pollCount++ === 0) {
        return [{ id: 'm1', sender: 'host', type: 'snapshot', payload: snap,
                  created_at: new Date().toISOString() }];
      }
      return [];
    };
    window.mpPostVisitMessage = async () => ({ id: 'p', created_at: new Date().toISOString() });

    await mpStartVisitAsVisitor({ channelId: 'ch-F', hostId: 'h-F', hostName: 'Alice', hostHouse: 'Gryffondor' });
    const qStart = window._visitGetQuality();
    const reconnStart = window._visitIsReconnecting();

    // Force lastSeen à 7 s ago (zone dégradée), check.
    window._visitForceLastSeen(Date.now() - 7000);
    await window._visitPollOnce();
    const qDegraded = window._visitGetQuality();
    const reconnDegraded = window._visitIsReconnecting();
    const badgeAfterDegraded = document.getElementById('visit-hud-quality').getAttribute('data-quality');

    // Force lastSeen à 3 s ago (récupération), check.
    window._visitForceLastSeen(Date.now() - 3000);
    await window._visitPollOnce();
    const qRecovered = window._visitGetQuality();
    const reconnRecovered = window._visitIsReconnecting();
    const badgeAfterRecov = document.getElementById('visit-hud-quality').getAttribute('data-quality');

    // Force lastSeen à 15 s ago (drop), check.
    window._visitForceLastSeen(Date.now() - 15000);
    await window._visitPollOnce();
    const qLost = window._visitGetQuality();
    const sessionGone = visitSession === null;

    return {
      qStart, reconnStart,
      qDegraded, reconnDegraded, badgeAfterDegraded,
      qRecovered, reconnRecovered, badgeAfterRecov,
      qLost, sessionGone
    };
  });
  console.log('  T4 grâce/drop →', t4);
  assert(t4.qStart === 'good',           'Qualité initiale = good');
  assert(t4.reconnStart === false,       'Pas de reconnect mode au démarrage');
  assert(t4.qDegraded === 'degraded',    'Quality bascule en degraded à 7 s');
  assert(t4.reconnDegraded === true,     'Reconnect mode activé en zone dégradée');
  assert(t4.badgeAfterDegraded === 'degraded', 'Badge HUD reflète degraded');
  assert(t4.qRecovered === 'good',       'Quality redevient good après réception récente');
  assert(t4.reconnRecovered === false,   'Reconnect mode désactivé après récupération');
  assert(t4.badgeAfterRecov === 'good',  'Badge HUD reflète recovery');
  assert(t4.qLost === 'good',            'Drop hard reset la qualité (session fermée → reset)');
  assert(t4.sessionGone,                 'Session droppée après 15 s');

  // T5 : presence row — status='closed' quand visitsClosed=true.
  const t5 = await page.evaluate(() => {
    const snapOpen = _serializeState();
    // Récupère la presence row interne via une astuce : on ne peut pas
    // l'appeler directement (variable interne), donc on teste l'effet via
    // l'écosystème : on toggle puis on regarde si la prochaine sortie
    // visiteur ne renvoie pas le status 'closed' depuis _mpPresenceRow.
    // Pas exposé → on ne teste que le bit visitsClosed est persisté +
    // _mpPresenceRow le lirait au prochain heartbeat.
    visitsClosed = true;
    const closed = visitsClosed === true;
    visitsClosed = false;
    return { closed };
  });
  console.log('  T5 visitsClosed flag →', t5);
  assert(t5.closed, 'Flag visitsClosed mutable');

  // T6 : tooltip Ironman pour le sort de portail — déjà couvert par C/D,
  // on vérifie juste la présence du libellé dans le bloc spell-modal
  // pour la non-régression.
  const t6 = await page.evaluate(() => {
    // Active Ironman + débloque le sort.
    ironmanMode = true;
    player.spells = player.spells || [];
    if (!player.spells.includes('Cheminette Inter-Mondes')) {
      player.spells.push('Cheminette Inter-Mondes');
    }
    if (typeof openSpells === 'function') openSpells();
    const modal = document.getElementById('spell-modal');
    const html  = modal ? modal.innerHTML : '';
    if (typeof closeModal === 'function') closeModal('spell-modal');
    ironmanMode = false;
    return {
      hasIronmanHint: /Voie solitaire|Ironman se joue seul/.test(html),
      hasPortalSpell: /Cheminette Inter-Mondes/.test(html)
    };
  });
  console.log('  T6 tooltip Ironman →', t6);
  assert(t6.hasPortalSpell,   'Sort Cheminette Inter-Mondes listé');
  assert(t6.hasIronmanHint,   'Tooltip "Voie solitaire / Ironman" présent');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase F OK');
  await browser.close();
}

async function scenarioVisitPhaseG() {
  console.log('\n── Scénario : Cheminette — combat local Phase G ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — globals + helpers Phase G.
  const t1 = await page.evaluate(() => ({
    inAstralCombat:        typeof inAstralCombat        !== 'undefined',
    outremondeEssence:     typeof outremondeEssence     === 'number',
    astralCellsDefeated:   typeof astralCellsDefeated   !== 'undefined',
    astralFloorKills:      typeof astralFloorKills      === 'number',
    astralExileCooldown:   typeof astralExileCooldownUntil === 'number',
    buildEcho:             typeof buildEcho             === 'function',
    engage:                typeof engageAstralCombat    === 'function',
    canEngage:             typeof _canEngageAstralCombat === 'function',
    remaining:             typeof _astralFightsRemaining === 'function',
    updateBtn:             typeof updateAstralFightButton === 'function',
    btnInDom:              !!document.getElementById('visit-hud-astral')
  }));
  console.log('  T1 surface →', t1);
  assert(t1.inAstralCombat,       'inAstralCombat déclaré');
  assert(t1.outremondeEssence,    'outremondeEssence déclaré');
  assert(t1.astralCellsDefeated,  'astralCellsDefeated déclaré');
  assert(t1.astralFloorKills,     'astralFloorKills déclaré');
  assert(t1.astralExileCooldown,  'astralExileCooldownUntil déclaré');
  assert(t1.buildEcho,            'buildEcho exposé');
  assert(t1.engage,               'engageAstralCombat exposé');
  assert(t1.canEngage,            '_canEngageAstralCombat exposé');
  assert(t1.remaining,            '_astralFightsRemaining exposé');
  assert(t1.updateBtn,            'updateAstralFightButton exposé');
  assert(t1.btnInDom,             '#visit-hud-astral dans le DOM');

  // T2 : buildEcho — retourne un monstre scaled sans gold/drops, marqué _echo.
  const t2 = await page.evaluate(() => {
    const echo = buildEcho('chat_norris', 5);
    const bogus = buildEcho('does_not_exist', 5);
    return {
      hasEcho:      !!echo,
      hasMarker:    !!(echo && echo._echo),
      goldZero:     echo && echo.gold === 0,
      dropsEmpty:   !!(echo && Array.isArray(echo.drops) && echo.drops.length === 0),
      hasPrefix:    !!(echo && /Écho · /.test(echo.name)),
      hasLevel:     !!(echo && typeof echo._level === 'number' && echo._level >= 1),
      bogus:        bogus === null
    };
  });
  console.log('  T2 buildEcho →', t2);
  assert(t2.hasEcho,     'Écho construit');
  assert(t2.hasMarker,   'Marqueur _echo posé');
  assert(t2.goldZero,    'Gold neutralisé');
  assert(t2.dropsEmpty,  'Drops standards neutralisés');
  assert(t2.hasPrefix,   'Nom préfixé "Écho · "');
  assert(t2.hasLevel,    '_level posé');
  assert(t2.bogus,       'Monstre inconnu → null');

  // T3 : engagement — démarre un combat astral avec inAstralCombat=true.
  // Pose une session visiteur factice pour passer le guard.
  const t3 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:'visitor', hostId:'h-G', hostName:'Alice', hostHouse:'Gryffondor',
        mySavedState: { player: { gold: 999 } }
      };
    }
    astralCellsDefeated = new Set();
    astralFloorKills = 0;
    const before = { canEngage: _canEngageAstralCombat(), remaining: _astralFightsRemaining() };
    const id = engageAstralCombat();
    const after = {
      inBattle: inBattle,
      inAstralCombat: inAstralCombat,
      enemyGroupLen: enemyGroup.length,
      firstHasEcho:  !!(enemyGroup[0] && enemyGroup[0]._echo),
      bodyHasClass:  document.body.classList.contains('in-astral-combat')
    };
    return { id, before, after };
  });
  console.log('  T3 engagement →', t3);
  assert(t3.before.canEngage,           'Engagement autorisé au départ');
  assert(t3.before.remaining === 3,     'Compteur = 3 au départ');
  assert(typeof t3.id === 'string',     'engageAstralCombat retourne un id de monstre');
  assert(t3.after.inBattle,             'inBattle = true');
  assert(t3.after.inAstralCombat,       'inAstralCombat = true');
  assert(t3.after.enemyGroupLen >= 1,   'enemyGroup non vide');
  assert(t3.after.firstHasEcho,         'Marqueur _echo sur le 1er ennemi');
  assert(t3.after.bodyHasClass,         'body.in-astral-combat posé');

  // T4 : victoire — gains routés vers outremondeEssence (pas vers gold/XP).
  const t4 = await page.evaluate(() => {
    const goldBefore = player.gold;
    const xpBefore   = player.xp;
    const essBefore  = outremondeEssence;
    const levelBefore = player.level;
    // Pose les HP des ennemis à 0 (kill) puis appelle endBattle(true).
    enemyGroup.forEach(e => { e.currentHp = 0; });
    endBattle(true);
    return {
      goldUnchanged: player.gold === goldBefore,
      xpUnchanged:   player.xp === xpBefore,
      levelUnchanged: player.level === levelBefore,
      essGained:     outremondeEssence > essBefore,
      inAstralReset: inAstralCombat === false,
      inBattleReset: inBattle === false,
      cellDefeated:  astralCellsDefeated.has(`${playerX},${playerY}`),
      floorKillIncr: astralFloorKills === 1,
      noBodyClass:   !document.body.classList.contains('in-astral-combat')
    };
  });
  console.log('  T4 victoire →', t4);
  assert(t4.goldUnchanged,    'Or du visiteur intact (pas de drop standard)');
  assert(t4.xpUnchanged,      'XP intacte');
  assert(t4.levelUnchanged,   'Niveau intact');
  assert(t4.essGained,        'outremondeEssence incrémenté');
  assert(t4.inAstralReset,    'inAstralCombat reset');
  assert(t4.inBattleReset,    'inBattle reset');
  assert(t4.cellDefeated,     'Cellule marquée dissipée');
  assert(t4.floorKillIncr,    'astralFloorKills = 1');
  assert(t4.noBodyClass,      'Classe in-astral-combat retirée');

  // T5 : limite 3/étage — 3e victoire OK, 4e refusée.
  const t5 = await page.evaluate(() => {
    // On a déjà 1 kill (T4). On force 2 + 1 supplémentaires.
    astralFloorKills = 3;        // simule 3 kills déjà faits
    astralCellsDefeated = new Set();   // libère les cellules
    const before = _astralFightsRemaining();
    const canFight = _canEngageAstralCombat();
    const id = engageAstralCombat();
    return {
      remainingBefore: before,
      canFight,
      idIsNull: id === null
    };
  });
  console.log('  T5 limite 3/étage →', t5);
  assert(t5.remainingBefore === 0,  'Compteur = 0 quand limite atteinte');
  assert(t5.canFight === false,     'canEngage = false quand limite atteinte');
  assert(t5.idIsNull,               'engageAstralCombat refuse (retourne null)');

  // T6 : défaite astrale — cooldown 5 min posé, pas de triggerDeath/death-screen.
  const t6 = await page.evaluate(() => {
    // Reset pour engager un nouveau combat.
    astralCellsDefeated = new Set();
    astralFloorKills = 0;
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:'visitor', hostId:'h-G', hostName:'Alice', hostHouse:'Gryffondor',
        mySavedState: { player: { gold: 999 }, astralExileCooldownUntil: 0 }
      };
    }
    astralExileCooldownUntil = 0;
    engageAstralCombat();
    // Stub mpExitVisit pour ne pas tenter le poste 'bye' (pas de réseau).
    let exited = false;
    window.mpExitVisit = async () => { exited = true; visitSession = null; return true; };
    // Force la défaite : tous les persos à 0 PV, puis triggerDeath.
    party.forEach(c => { c.hp = 0; });
    triggerDeath('test-defeat');
    const deathScreen = document.getElementById('death-screen');
    const cooldownSet = astralExileCooldownUntil > Date.now();
    return {
      noDeathScreen: deathScreen ? deathScreen.style.display !== 'flex' : true,
      cooldownSet,
      cooldownMinutes: Math.round((astralExileCooldownUntil - Date.now()) / 60000),
      inAstralReset: inAstralCombat === false,
      inBattleReset: inBattle === false,
      exitCalled:    exited
    };
  });
  console.log('  T6 défaite →', t6);
  assert(t6.noDeathScreen,        'Pas d\'écran de mort en défaite astrale');
  assert(t6.cooldownSet,          'Cooldown 5 min posé');
  assert(t6.cooldownMinutes >= 4, `Cooldown ~5 min (${t6.cooldownMinutes} min mesurés)`);
  assert(t6.inAstralReset,        'inAstralCombat reset après défaite');
  assert(t6.inBattleReset,        'inBattle reset après défaite');
  assert(t6.exitCalled,           'mpExitVisit appelé en défaite');

  // T7 : Avada Kedavra refusée en combat astral.
  const t7 = await page.evaluate(() => {
    // Reset clean.
    astralCellsDefeated = new Set();
    astralFloorKills = 0;
    astralExileCooldownUntil = 0;
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:'visitor', hostId:'h-G', hostName:'Alice', hostHouse:'Gryffondor',
        mySavedState: { player: { gold: 999 } }
      };
    }
    // Restore les persos pour pouvoir caster.
    party.forEach(c => { c.hp = c.hpMax; c.sp = c.spMax; });
    if (!player.spells.includes('Avada...')) player.spells.push('Avada...');
    // Débloque le sort dans SPELLS (sinon castSpellInBattle refuse).
    const av = SPELLS.find(s => s.name === 'Avada...');
    if (av) av.locked = false;
    engageAstralCombat();
    // Compte les messages avant cast.
    const enemyHpBefore = enemyGroup[0].currentHp;
    castSpellInBattle('Avada...', 0);
    const enemyHpAfter = enemyGroup[0].currentHp;
    // Cleanup : sort du combat en triggerant la victoire factice.
    enemyGroup.forEach(e => { e.currentHp = 0; });
    endBattle(true);
    return {
      enemyHpUnchanged: enemyHpAfter === enemyHpBefore,
      stillAlive:       enemyHpAfter > 0
    };
  });
  console.log('  T7 Avada bloqué →', t7);
  assert(t7.enemyHpUnchanged,  'PV ennemi inchangés (Avada refusée)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase G OK');
  await browser.close();
}

async function scenarioVisitPhaseH() {
  console.log('\n── Scénario : Cheminette — Verrou + Atelier Phase H ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — globaux + helpers Phase H + sort + items.
  const t1 = await page.evaluate(() => {
    const spell = SPELLS.find(s => s.name === 'Verrou de Sang');
    const items = ITEMS.filter(it => it.family === 'voyageur');
    return {
      inSealedCombat:      typeof inSealedCombat        !== 'undefined',
      outremondeFragments: typeof outremondeFragments   === 'number',
      outremondePendingSeals: Array.isArray(outremondePendingSeals),
      hostSealsByFloor:    typeof hostSealsByFloor       !== 'undefined',
      currentBloodSeal:    typeof currentBloodSeal       !== 'undefined',
      hasSpell:            !!spell,
      spellEffect:         spell && spell.effect,
      voyageurItemsCount:  items.length,
      hasMpPost:           typeof mpPostBloodSeal        === 'function',
      hasMpListHost:       typeof mpListHostSealsForFloor === 'function',
      hasMpUpdate:         typeof mpUpdateSealStatus     === 'function',
      hasMpListVisitor:    typeof mpListVisitorResolvedSeals === 'function',
      hasMpClaim:          typeof mpClaimSeal            === 'function',
      hasOpenAtelier:      typeof openAtelierVoyageur    === 'function',
      hasOpenSealTarget:   typeof openBloodSealTargetModal === 'function',
      hasClaim:            typeof _claimResolvedSeals    === 'function',
      hasTrigger:          typeof _triggerHostBloodSeal  === 'function',
      hasGetSeal:          typeof getBloodSealAt         === 'function',
      hasBtnAtelier:       !!document.getElementById('btn-atelier'),
    };
  });
  console.log('  T1 surface →', t1);
  assert(t1.inSealedCombat,       'inSealedCombat déclaré');
  assert(t1.outremondeFragments,  'outremondeFragments déclaré');
  assert(t1.outremondePendingSeals, 'outremondePendingSeals déclaré');
  assert(t1.hostSealsByFloor,     'hostSealsByFloor déclaré');
  assert(t1.hasSpell,             'Sort "Verrou de Sang" présent');
  assert(t1.spellEffect === 'blood_seal', 'Effet blood_seal');
  assert(t1.voyageurItemsCount === 5, '5 items Set Voyageur définis');
  assert(t1.hasMpPost && t1.hasMpListHost && t1.hasMpUpdate
      && t1.hasMpListVisitor && t1.hasMpClaim, '5 helpers REST exposés');
  assert(t1.hasOpenAtelier && t1.hasOpenSealTarget, 'Modales exposées');
  assert(t1.hasClaim && t1.hasTrigger && t1.hasGetSeal, 'Helpers exposés');
  assert(t1.hasBtnAtelier,        '#btn-atelier dans le HUD');

  // T2 : pose de Verrou — modale ouverte, sélection d'un monstre, post
  // REST stubbé, ajout à outremondePendingSeals + coût débité.
  const t2 = await page.evaluate(async () => {
    // Pose une session visiteur factice.
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:'visitor', hostId:'h-H', hostName:'Alice', hostHouse:'Gryffondor',
        mySavedState: { player: { gold: 999 } }
      };
    }
    outremondeEssence = 5;
    outremondePendingSeals = [];
    player.sp = 30;
    party.forEach(c => { c.sp = c.spMax || 30; });
    // S'assure d'être sur une case FLOOR.
    playerX = 4; playerY = 4;
    dungeon[4][4] = CELL.FLOOR;
    // Stub mp post.
    let posted = null;
    window.mpPostBloodSeal = async (row) => {
      posted = { ...row };
      return { ...row, id: 'seal-T2' };
    };
    // Ouvre la modale (le sort blood_seal handler la lance).
    openBloodSealTargetModal(party[0]);
    const modal = document.getElementById('atelier-voyageur-overlay');
    const modalOpen = modal && modal.style.display === 'flex';
    // Choisit un monstre via _chooseBloodSealMonster.
    const essBefore = outremondeEssence;
    const spBefore  = party[0].sp;
    await _chooseBloodSealMonster('chat_norris', party[0].name);
    return {
      modalOpen,
      essDebit: essBefore - outremondeEssence,
      spDebit:  spBefore - party[0].sp,
      pendingCount: outremondePendingSeals.length,
      firstId: outremondePendingSeals[0] && outremondePendingSeals[0].id,
      hostId:  outremondePendingSeals[0] && outremondePendingSeals[0].hostId,
      posted
    };
  });
  console.log('  T2 pose Verrou →', t2);
  assert(t2.modalOpen,           'Modale de pose ouverte');
  assert(t2.essDebit === 1,      '1 essence débitée');
  assert(t2.spDebit === 5,       '5 PM débités');
  assert(t2.pendingCount === 1,  '1 Verrou en attente');
  assert(t2.firstId === 'seal-T2', 'ID serveur remonté');
  assert(t2.hostId === 'h-H',    'hostId mémorisé');
  assert(t2.posted && t2.posted.monster_id === 'chat_norris', 'Post REST avec bon monsterId');

  // T3 : claim asynchrone des Verrous résolus — modale + essence ajoutée
  // + claim côté REST.
  const t3 = await page.evaluate(async () => {
    outremondeEssence = 0;
    outremondeFragments = 0;
    outremondePendingSeals = [{ id: 'sealA', hostId:'h-H', hostName:'Bob', monsterId:'chat_norris', floor:2, x:5, y:5 }];
    let claimed = [];
    window.mpListVisitorResolvedSeals = async () => [
      { id: 'sealA', host_id:'h-H', floor:2, x:5, y:5, monster_id:'chat_norris', status:'resolved', visitor_name:'Bob' },
      { id: 'sealB', host_id:'h-I', floor:3, x:6, y:6, monster_id:'peeves',      status:'fled',     visitor_name:'Carol' }
    ];
    window.mpClaimSeal = async (id) => { claimed.push(id); return true; };
    const claims = await _claimResolvedSeals();
    const modal = document.getElementById('atelier-voyageur-overlay');
    return {
      claimsLen: claims && claims.length,
      ess: outremondeEssence,
      pendingCount: outremondePendingSeals.length,
      claimed,
      modalOpen: modal && modal.style.display === 'flex',
      modalHasResolved: /Verrous résolus/.test(modal ? modal.innerHTML : ''),
    };
  });
  console.log('  T3 claim asynchrone →', t3);
  assert(t3.claimsLen === 2,         '2 verrous claimés');
  assert(t3.ess === 4,               '+3 (resolved) +1 (fled) = 4 essences');
  assert(t3.pendingCount === 0,      'Pending purgé');
  assert(t3.claimed.length === 2,    'Claim REST appelé pour chacun');
  assert(t3.modalOpen,               'Modale claim affichée');
  assert(t3.modalHasResolved,        'Modale titre "Verrous résolus"');

  // T4 : craft Set Voyageur — débit d'essence + item dans inventaire.
  const t4 = await page.evaluate(() => {
    closeAtelierVoyageur();
    outremondeEssence = 30;
    player.inventory = [];
    // Forge le Diadème du Plan (8 essences).
    _craftVoyageurPiece('voyageur_diademe');
    const inInv = player.inventory.find(it => it.id === 'voyageur_diademe');
    return {
      essAfter: outremondeEssence,
      hasItem: !!inInv,
      itemFamily: inInv && inInv.family
    };
  });
  console.log('  T4 craft Voyageur →', t4);
  assert(t4.essAfter === 22,         '30 - 8 = 22 essences');
  assert(t4.hasItem,                 'Item ajouté à l\'inventaire');
  assert(t4.itemFamily === 'voyageur', 'Family voyageur préservée');

  // T5 : bonus de Set Voyageur 2/3 pièces dans recalculateStats.
  const t5 = await page.evaluate(() => {
    if (typeof visitSession !== 'undefined') visitSession = null;
    const c = party[0];
    // Reset des slots et équipe 2 puis 3 pièces.
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                   cloak:null, amulet:null, ring1:null, ring2:null,
                   belt:null, trinket:null };
    const lckBase = c._baseLck;
    // 0 pièce
    recalculateStats();
    const lck0 = c.lck;
    const spellCrit0 = c.spellCritChance;
    // 2 pièces
    c.equipped.head  = ITEMS.find(it => it.id === 'voyageur_diademe');
    c.equipped.cloak = ITEMS.find(it => it.id === 'voyageur_cape');
    recalculateStats();
    const lck2 = c.lck;
    const set2Count = c._voyageurSetCount;
    // 3 pièces
    c.equipped.feet  = ITEMS.find(it => it.id === 'voyageur_bottes');
    recalculateStats();
    const spellCrit3 = c.spellCritChance;
    const set3Count = c._voyageurSetCount;
    // 4 pièces
    c.equipped.ring1 = ITEMS.find(it => it.id === 'voyageur_anneau');
    recalculateStats();
    const set4Count = c._voyageurSetCount;
    const regenBonus = c._voyageurRegenSpBonus;
    return { lckBase, lck0, lck2, set2Count, spellCrit0, spellCrit3, set3Count, set4Count, regenBonus };
  });
  console.log('  T5 bonus Set Voyageur →', t5);
  // 2 pièces ajoute +1 INT/LCK PAR PIÈCE individuelles + bonus set +1 LCK.
  // Donc lck2 = lckBase + 1 (diadème) + 0 (cape pas de LCK) + 1 (set 2/2) = +2.
  assert(t5.set2Count === 2,         'Set 2/2 détecté');
  assert(t5.lck2 - t5.lck0 >= 2,     '+1 LCK item + +1 LCK bonus set 2 = +2 minimum');
  assert(t5.set3Count === 3,         'Set 3/3 détecté');
  assert(t5.spellCrit3 > t5.spellCrit0, 'bonusSpellCritChance +5 appliqué au palier 3');
  assert(t5.set4Count === 4,         'Set 4/4 détecté');
  assert(t5.regenBonus === 2,        '_voyageurRegenSpBonus posé à 2 (palier 4)');

  // T6 : host — chargement des Verrous + matérialisation minimap.
  const t6 = await page.evaluate(async () => {
    if (typeof visitSession !== 'undefined') visitSession = null;
    hostSealsByFloor = new Map();
    window.mpListHostSealsForFloor = async () => [
      { id:'sealH1', visitor_id:'v', visitor_name:'Carol', floor:1, x:7, y:7, monster_id:'chat_norris' }
    ];
    await loadHostSealsForCurrentFloor();
    const seal = getBloodSealAt(7, 7);
    const noSeal = getBloodSealAt(0, 0);
    // Vérifie la classe minimap
    dungeon[7][7] = CELL.FLOOR;
    visited[7][7] = true;
    renderMinimap();
    // Cherche dans la minimap une cellule avec map-blood-seal
    const cells = document.querySelectorAll('#minimap .map-cell.map-blood-seal');
    return {
      hasSeal: !!seal,
      noSealForOther: noSeal === null,
      minimapHasClass: cells.length >= 1
    };
  });
  console.log('  T6 host load Verrous →', t6);
  assert(t6.hasSeal,         'getBloodSealAt(7,7) retourne le Verrou');
  assert(t6.noSealForOther,  'getBloodSealAt(0,0) = null');
  assert(t6.minimapHasClass, '.map-blood-seal posé sur la minimap');

  // T7 : déclenchement du combat de résolution + update status à endBattle.
  const t7 = await page.evaluate(() => {
    let updatedSeal = null;
    window.mpUpdateSealStatus = async (id, status) => { updatedSeal = { id, status }; return true; };
    // Pose le joueur sur la case du Verrou (déjà 7,7 depuis T6).
    playerX = 7; playerY = 7;
    const ok = _triggerHostBloodSeal(7, 7);
    const inBattleNow = inBattle;
    const inSealed = inSealedCombat;
    const enemyNameSealed = enemyGroup[0] && enemyGroup[0].name;
    // Force victoire.
    const goldBefore = player.gold;
    const fragBefore = outremondeFragments;
    enemyGroup.forEach(e => { e.currentHp = 0; });
    endBattle(true);
    return {
      triggered: ok,
      inBattleNow,
      inSealed,
      enemyHasMarker: /🩸/.test(enemyNameSealed || ''),
      sealRemovedFromMap: getBloodSealAt(7,7) === null,
      sealUpdate: updatedSeal,
      sealedReset: inSealedCombat === false,
      bonusGoldAdded: player.gold - goldBefore >= 50,
      fragmentAdded: outremondeFragments - fragBefore === 1
    };
  });
  console.log('  T7 combat de résolution →', t7);
  assert(t7.triggered,             '_triggerHostBloodSeal retourne true');
  assert(t7.inBattleNow,           'Combat lancé');
  assert(t7.inSealed,              'inSealedCombat actif pendant le combat');
  assert(t7.enemyHasMarker,        'Nom ennemi préfixé 🩸');
  assert(t7.sealRemovedFromMap,    'Verrou retiré de la liste locale');
  assert(t7.sealUpdate && t7.sealUpdate.status === 'resolved', 'mpUpdateSealStatus(resolved) appelé');
  assert(t7.sealedReset,           'inSealedCombat reset après combat');
  assert(t7.bonusGoldAdded,        '+50 G bonus distribués');
  assert(t7.fragmentAdded,         '+1 fragment côté host');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Cheminette Inter-Mondes — Phase H OK');
  await browser.close();
}

async function scenarioVisitV1c1() {
  console.log('\n── Scénario : Cheminette — V1c.1 (souvenirs/cosm/sorts) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : surface — globaux + registres + helpers.
  const t1 = await page.evaluate(() => ({
    metrics:        typeof outremondeMetrics    === 'object' && outremondeMetrics !== null,
    souvenirs:      typeof outremondeSouvenirs  === 'object',
    cosmetics:      typeof outremondeCosmetics  === 'object',
    activeAura:     typeof outremondeActiveAura !== 'undefined',
    souvList:       Array.isArray(OUTREMONDE_SOUVENIRS) && OUTREMONDE_SOUVENIRS.length === 6,
    cosmList:       Array.isArray(OUTREMONDE_COSMETICS) && OUTREMONDE_COSMETICS.length === 12,
    crossSpells:    SPELLS.filter(s => s._cross).length === 4,
    hasCheck:       typeof _checkSouvenirs    === 'function',
    hasBuyCos:      typeof _buyCosmetic       === 'function',
    hasToggleCos:   typeof _toggleCosmetic    === 'function',
    hasBuySpell:    typeof _buyCrossSpell     === 'function',
    hasAnim:        typeof _playBloodSealAnim === 'function',
    hasApplyVis:    typeof _applyCosmeticVisuals === 'function'
  }));
  console.log('  T1 surface →', t1);
  assert(t1.metrics && t1.souvenirs && t1.cosmetics && t1.activeAura, 'globaux présents');
  assert(t1.souvList,  '6 souvenirs définis');
  assert(t1.cosmList,  '12 cosmétiques définis');
  assert(t1.crossSpells, '4 sorts _cross définis');
  assert(t1.hasCheck && t1.hasBuyCos && t1.hasToggleCos && t1.hasBuySpell, '4 helpers exposés');
  assert(t1.hasAnim && t1.hasApplyVis, 'anim + visuals exposés');

  // T2 : souvenir débloqué par métrique (Premier Pas via visitsTotal).
  const t2 = await page.evaluate(() => {
    outremondeSouvenirs = new Set();
    outremondeMetrics.visitsTotal = 0;
    _checkSouvenirs();
    const beforeLck = party[0].lck;
    outremondeMetrics.visitsTotal = 1;
    _checkSouvenirs();
    const unlocked = outremondeSouvenirs.has('premier_pas');
    recalculateStats();
    const afterLck = party[0].lck;
    return { unlocked, lckGain: afterLck - beforeLck };
  });
  console.log('  T2 souvenir Premier Pas →', t2);
  assert(t2.unlocked,        'Souvenir débloqué');
  assert(t2.lckGain === 1,   '+1 LCK appliqué via recalculateStats');

  // T3 : achat + activation d'un cosmétique aura.
  const t3 = await page.evaluate(() => {
    outremondeEssence  = 20;
    outremondeFragments = 5;
    outremondeCosmetics = new Set();
    outremondeActiveAura = null;
    _buyCosmetic('aura_or');
    const owned = outremondeCosmetics.has('aura_or');
    const essAfterBuy = outremondeEssence;
    _toggleCosmetic('aura_or');
    const activeAfter = outremondeActiveAura;
    const cssAura = document.documentElement.style.getPropertyValue('--om-aura');
    return { owned, essAfterBuy, activeAfter, cssAura };
  });
  console.log('  T3 cosmétique →', t3);
  assert(t3.owned,                     'Aura possédée après achat');
  assert(t3.essAfterBuy === 15,        '20 - 5 = 15 essences');
  assert(t3.activeAfter === 'aura_or', 'Aura activée');
  assert(t3.cssAura.indexOf('d8b647') !== -1, 'CSS variable posée');

  // T4 : achat d'un sort cross-plan (Marque du Pèlerin).
  const t4 = await page.evaluate(() => {
    outremondeEssence = 30;
    party.forEach(c => { c.spells = c.spells.filter(n => !/Pèlerin|Astral/.test(n)); });
    _buyCrossSpell('Marque du Pèlerin');
    const harryHas    = party[0].spells.includes('Marque du Pèlerin');
    const hermioneHas = party[1].spells.includes('Marque du Pèlerin');
    return { essAfter: outremondeEssence, harryHas, hermioneHas };
  });
  console.log('  T4 sort cross →', t4);
  assert(t4.essAfter === 26,    '30 - 4 = 26 essences');
  assert(t4.harryHas,           'Harry a appris');
  assert(t4.hermioneHas,        'Hermione a appris');

  // T5 : Marque du Pèlerin + Rappel Astral effectif en visite.
  const t5 = await page.evaluate(() => {
    visitSession = { role:'visitor', hostId:'h-X', hostName:'Bob' };
    currentFloor = 2;
    playerX = 3; playerY = 4;
    party[0].sp = 30; party[0].spells = ['Marque du Pèlerin', 'Rappel Astral'];
    outremondeMetrics.pilgrimMark = null;
    // Pose la marque.
    SPELL_OOC_HANDLERS.pilgrim_mark(SPELLS.find(s => s.name === 'Marque du Pèlerin'), 0);
    const mark = outremondeMetrics.pilgrimMark;
    // Déplace le joueur puis rappel.
    playerX = 7; playerY = 8;
    party[0].sp = 30;
    SPELL_OOC_HANDLERS.astral_recall(SPELLS.find(s => s.name === 'Rappel Astral'), 0);
    return { mark, recallX: playerX, recallY: playerY };
  });
  console.log('  T5 marque + rappel →', t5);
  assert(t5.mark && t5.mark.x === 3 && t5.mark.y === 4, 'Marque posée à 3,4');
  assert(t5.recallX === 3 && t5.recallY === 4, 'Rappel restaure 3,4');

  // T6 : Sceau du Voyageur — pas de cooldown sur défaite astrale.
  const t6 = await page.evaluate(() => {
    party.forEach(c => { if (!c.spells.includes('Sceau du Voyageur')) c.spells.push('Sceau du Voyageur'); });
    visitSession = { role:'visitor', hostId:'h-Y', hostName:'C', mySavedState:{} };
    inAstralCombat = true;
    enemyGroup = [{ id:'chat_norris', name:'Écho · Chat', currentHp:1, hp:1, _level:1 }];
    party.forEach(c => { if (c) c.hp = 0; });
    astralExileCooldownUntil = 0;
    // Stub mpExitVisit pour ne pas crasher.
    window.mpExitVisit = () => {};
    _finishAstralCombat(false);
    return { cooldown: astralExileCooldownUntil };
  });
  console.log('  T6 Sceau du Voyageur →', t6);
  assert(t6.cooldown === 0, 'Pas de cooldown posé avec Sceau');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ V1c.1 OK');
  await browser.close();
}

async function scenarioMultiplayerPresence() {
  console.log('\n── Scénario : multijoueur présence fantôme ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Globals exposés par js/multiplayer.js + renderer-effects.js.
  const exposed = await page.evaluate(() => ({
    mpStartSession:   typeof mpStartSession === 'function',
    mpStopSession:    typeof mpStopSession === 'function',
    getGhostAt:       typeof getGhostAt === 'function',
    getMpPlayerId:    typeof getMpPlayerId === 'function',
    projectGhosts:    typeof _mpProjectGhosts === 'function',
    drawGhostSprite:  typeof drawGhostSprite === 'function',
    ghostPlacements:  typeof ghostPlacements !== 'undefined',
  }));
  Object.entries(exposed).forEach(([k, v]) => assert(v, `global manquant : ${k}`));

  // 2) UUID joueur stable + persisté dans le localStorage.
  const id = await page.evaluate(() => {
    if (typeof mpStopSession === 'function') mpStopSession(); // coupe le réseau
    mpActive = false;
    const a = getMpPlayerId();
    const b = getMpPlayerId();
    return { a, b, stored: localStorage.getItem('hogwarts_rpg_player_id') };
  });
  assert(id.a && id.a.length > 0, 'getMpPlayerId doit retourner un id non vide');
  assert(id.a === id.b,           "l'id joueur doit être stable entre deux appels");
  assert(id.stored === id.a,      "l'id joueur doit être persisté dans le localStorage");

  // 3) Projection : seules les cases FLOOR libres retiennent un fantôme.
  const proj = await page.evaluate(() => {
    playerX = 5; playerY = 5;
    dungeon[3][5] = CELL.FLOOR;   // cible valide
    dungeon[3][6] = CELL.WALL;    // mur → rejet
    if (typeof npcPlacements !== 'undefined') npcPlacements.delete('5,3');
    if (enemyMap[3]) enemyMap[3][5] = null;
    _mpProjectGhosts([
      { player_id: 'a', name: 'Alice', mode: 'normal', floor: 1, x: 5, y: 3,
        level: 4, hero_keys: ['harry'], house: 'Gryffondor', status: 'exploring' },
      { player_id: 'b', name: 'Bob',   mode: 'normal', floor: 1, x: 6, y: 3, level: 9 },
      { player_id: 'c', name: 'Carol', mode: 'normal', floor: 1, x: 5, y: 5, level: 2 },
    ]);
    return {
      size:      ghostPlacements.size,
      hasFloor:  ghostPlacements.has('5,3'),
      hasWall:   ghostPlacements.has('6,3'),
      hasPlayer: ghostPlacements.has('5,5'),
      atFloor:   getGhostAt(5, 3),
    };
  });
  assert(proj.size === 1,     `un seul fantôme projeté attendu (obtenu ${proj.size})`);
  assert(proj.hasFloor,       'le fantôme sur case FLOOR doit être projeté');
  assert(!proj.hasWall,       'un fantôme sur une case WALL ne doit pas être projeté');
  assert(!proj.hasPlayer,     'un fantôme sur la case du joueur ne doit pas être projeté');
  assert(proj.atFloor && proj.atFloor.name === 'Alice', 'getGhostAt doit retrouver le fantôme');
  assert(proj.atFloor.level === 4, 'le niveau du fantôme doit être conservé');

  // 4) Rendu 3D : un fantôme pile devant → drawGhostSprite appelé.
  const render = await page.evaluate(() => {
    playerX = 5; playerY = 5; playerDir = 'n';
    dungeon[5][5] = CELL.FLOOR;
    dungeon[4][5] = CELL.FLOOR;     // case devant
    if (enemyMap[4]) enemyMap[4][5] = null;
    if (typeof npcPlacements !== 'undefined') npcPlacements.clear();
    ghostPlacements = new Map();
    ghostPlacements.set('5,4', { playerId: 'g', name: 'Spectre', level: 11,
                                 heroKeys: ['harry'], house: 'Serdaigle' });
    const calls = [];
    const orig = window.drawGhostSprite;
    window.drawGhostSprite = function (ghost, x, baseY, sz) {
      calls.push({ name: ghost && ghost.name, x, baseY, sz });
      return orig.apply(this, arguments);
    };
    drawDungeon();
    window.drawGhostSprite = orig;
    return { callCount: calls.length, last: calls[calls.length - 1] || null };
  });
  assert(render.callCount >= 1,
    `drawGhostSprite doit être appelé avec un fantôme devant (obtenu ${render.callCount})`);
  assert(render.last && render.last.name === 'Spectre',
    'drawGhostSprite doit recevoir le bon fantôme');
  assert(render.last.sz > 0, 'la taille du sprite fantôme doit être > 0');

  // 5) Aucun fantôme → drawGhostSprite NE doit PAS être appelé.
  const noGhost = await page.evaluate(() => {
    ghostPlacements = new Map();
    const calls = [];
    const orig = window.drawGhostSprite;
    window.drawGhostSprite = function () { calls.push(arguments); };
    drawDungeon();
    window.drawGhostSprite = orig;
    return calls.length;
  });
  assert(noGhost === 0,
    `drawGhostSprite ne doit pas être appelé sans fantôme (obtenu ${noGhost})`);

  // 6) Minimap : un fantôme sur une case visitée → marqueur .map-ghost.
  const minimap = await page.evaluate(() => {
    playerX = 5; playerY = 5;
    dungeon[4][5] = CELL.FLOOR;
    visited[4][5] = true;
    ghostPlacements = new Map();
    ghostPlacements.set('5,4', { playerId: 'g', name: 'Spectre', level: 3 });
    renderMinimap();
    return document.querySelectorAll('#minimap .map-ghost').length;
  });
  assert(minimap >= 1, `un marqueur .map-ghost attendu sur la minimap (obtenu ${minimap})`);

  // 7) Sprite PNG plein corps — registre exposé, 15 héros, fichiers
  //    présents (file:// charge tout sauf erreur explicite).
  const sprites = await page.evaluate(async () => {
    if (typeof PLAYER_SPRITE_SRC === 'undefined') return { registered: false };
    const keys = Object.keys(PLAYER_SPRITE_SRC);
    // Attente passive : on laisse 800 ms au navigateur pour charger les
    // images via _getPlayerSprite (l'appel paresseux n'a peut-être pas
    // encore été déclenché).
    keys.forEach(k => _getPlayerSprite(k));
    await new Promise(r => setTimeout(r, 800));
    return {
      registered: true,
      keys:       keys.length,
      loaded:     keys.filter(k => {
        const s = _getPlayerSprite(k);
        return s && s.ready && !s.failed;
      }).length,
    };
  });
  assert(sprites.registered,    'PLAYER_SPRITE_SRC doit être exposé');
  assert(sprites.keys === 15,   `15 héros attendus dans PLAYER_SPRITE_SRC (obtenu ${sprites.keys})`);
  assert(sprites.loaded === 15, `15 PNG doivent charger (obtenu ${sprites.loaded})`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (multijoueur)`);
  }
  console.log('  ✅ multijoueur — identité, projection, rendu fantôme OK');
  await browser.close();
}

async function scenarioMultiplayerInteraction() {
  console.log('\n── Scénario : multijoueur interaction fantôme ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Globals Phase 2 exposés.
  const exposed = await page.evaluate(() => ({
    ghostTagline:        typeof ghostTagline === 'function',
    openGhostInteraction:typeof openGhostInteraction === 'function',
    mpInspectGhost:      typeof mpInspectGhost === 'function',
    mpEmoteGhost:        typeof mpEmoteGhost === 'function',
    closeGhostOverlay:   typeof closeGhostOverlay === 'function',
    overlayEl:           !!document.getElementById('ghost-overlay'),
  }));
  Object.entries(exposed).forEach(([k, v]) => assert(v, `global/élément manquant : ${k}`));

  // 2) ghostTagline — pure, déterministe, banque par Maison.
  const tag = await page.evaluate(() => ({
    a:        ghostTagline(['harry'], 'Gryffondor'),
    aBis:     ghostTagline(['harry'], 'Gryffondor'),
    serp:     ghostTagline(['harry'], 'Serpentard'),
    duo:      ghostTagline(['harry', 'hermione'], 'Gryffondor'),
    fallback: ghostTagline([], null),
  }));
  assert(tag.a && tag.a.length > 0,  'ghostTagline doit retourner une phrase non vide');
  assert(tag.a === tag.aBis,         'ghostTagline doit être déterministe');
  assert(tag.serp !== tag.a,         'la Maison doit changer la banque de phrases');
  assert(tag.fallback && tag.fallback.length > 0, 'ghostTagline doit gérer une Maison absente');

  // 3) Overlay : en-tête (portrait, pseudo · niveau, phrase d'accroche).
  const header = await page.evaluate(() => {
    openGhostInteraction({
      playerId: 'g1', name: 'Mage<b>Test', mode: 'ironman', level: 12,
      heroKeys: ['harry', 'hermione'], house: 'Serdaigle', status: 'exploring',
    });
    const overlay = document.getElementById('ghost-overlay');
    const panel   = document.getElementById('ghost-panel');
    return {
      shown:      overlay && overlay.style.display === 'flex',
      hasName:    /Mage/.test(panel.innerHTML),
      escaped:    !panel.querySelector('b'),           // nom non interprété en HTML
      hasLevel:   /Niveau 12/.test(panel.textContent),
      portraits:  panel.querySelectorAll('.ghost-portrait').length,
      crest:      !!panel.querySelector('.ghost-crest'),
      tagline:    !!panel.querySelector('.ghost-tagline'),
      inspectBtn: /mpInspectGhost/.test(panel.innerHTML),
    };
  });
  assert(header.shown,      "l'overlay fantôme doit s'afficher");
  assert(header.hasName,    'le pseudo du fantôme doit apparaître');
  assert(header.escaped,    'le pseudo distant doit être échappé (pas de HTML injecté)');
  assert(header.hasLevel,   'le niveau du fantôme doit apparaître');
  assert(header.portraits === 2, `2 portraits attendus (obtenu ${header.portraits})`);
  assert(header.crest,      'le blason de Maison doit apparaître');
  assert(header.tagline,    "la phrase d'accroche doit apparaître");
  assert(header.inspectBtn, "l'action Inspecter doit être présente");

  // 4) Inspecter — fiche lecture seule.
  const inspect = await page.evaluate(() => {
    mpInspectGhost();
    const panel = document.getElementById('ghost-panel');
    return {
      rows:      panel.querySelectorAll('.ghost-inspect-row').length,
      heroes:    panel.querySelectorAll('.ghost-inspect-hero').length,
      hasMode:   /Ironman/.test(panel.textContent),
      hasReturn: /_mpRenderGhostMain/.test(panel.innerHTML),
    };
  });
  assert(inspect.rows >= 4,   `≥4 lignes d'inspection attendues (obtenu ${inspect.rows})`);
  assert(inspect.heroes === 2, `2 héros listés attendus (obtenu ${inspect.heroes})`);
  assert(inspect.hasMode,     'le mode Ironman doit apparaître dans la fiche');
  assert(inspect.hasReturn,   'un bouton retour doit être présent');

  // 5) Emote + fermeture.
  const close = await page.evaluate(() => {
    _mpRenderGhostMain();
    mpEmoteGhost();
    const emoted = _mpEmoted === true;
    closeGhostOverlay();
    const overlay = document.getElementById('ghost-overlay');
    return { emoted, hidden: overlay.style.display === 'none' };
  });
  assert(close.emoted, 'mpEmoteGhost doit marquer le salut comme envoyé');
  assert(close.hidden, 'closeGhostOverlay doit masquer l\'overlay');

  // 6) Marcher sur la case d'un fantôme ouvre l'interaction.
  const stepOn = await page.evaluate(() => {
    playerX = 5; playerY = 5; playerDir = 'n';
    dungeon[5][5] = CELL.FLOOR;
    dungeon[4][5] = CELL.FLOOR;
    if (enemyMap[4]) enemyMap[4][5] = null;
    if (typeof npcPlacements !== 'undefined') npcPlacements.clear();
    ghostPlacements = new Map();
    ghostPlacements.set('5,4', { playerId: 'g2', name: 'Voisin', level: 5,
                                 heroKeys: ['harry'], house: 'Poufsouffle' });
    moveForward();
    const overlay = document.getElementById('ghost-overlay');
    const opened  = overlay && overlay.style.display === 'flex';
    if (typeof closeGhostOverlay === 'function') closeGhostOverlay();
    return { px: playerX, py: playerY, opened };
  });
  assert(stepOn.px === 5 && stepOn.py === 4, 'le joueur doit avoir avancé sur la case du fantôme');
  assert(stepOn.opened, "marcher sur un fantôme doit ouvrir l'overlay d'interaction");

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (interaction fantôme)`);
  }
  console.log('  ✅ multijoueur — overlay, en-tête, inspection, déclenchement OK');
  await browser.close();
}

async function scenarioMultiplayerDuel() {
  console.log('\n── Scénario : multijoueur duel PvP ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Globals Phase 3 exposés.
  const exposed = await page.evaluate(() => ({
    mpBuildSnapshot:       typeof mpBuildSnapshot === 'function',
    mpStartDuel:           typeof mpStartDuel === 'function',
    heroToEnemy:           typeof _mpHeroToEnemy === 'function',
    resolveVictory:        typeof _mpResolveDuelVictory === 'function',
    duelActiveVar:         typeof mpDuelActive !== 'undefined',
    defeatedDuelistsVar:   typeof defeatedDuelists !== 'undefined',
  }));
  Object.entries(exposed).forEach(([k, v]) => assert(v, `global manquant : ${k}`));

  // 2) mpBuildSnapshot — forme sérialisable.
  const snap = await page.evaluate(() => {
    const s = mpBuildSnapshot();
    return {
      heroes:   Array.isArray(s.heroes) ? s.heroes.length : -1,
      hasStats: !!(s.heroes[0] && typeof s.heroes[0].atk === 'number'
                   && Array.isArray(s.heroes[0].spells)
                   && Array.isArray(s.heroes[0].equipment)),
      level:    s.level,
    };
  });
  assert(snap.heroes === 1,  `snapshot solo = 1 héros (obtenu ${snap.heroes})`);
  assert(snap.hasStats,      'chaque héros du snapshot doit porter stats/sorts/équipement');
  assert(snap.level >= 1,    'le snapshot doit porter le niveau du joueur');

  // 3) _mpHeroToEnemy — mappe sorts → capacités ennemies.
  const enemy = await page.evaluate(() => {
    const e = _mpHeroToEnemy({
      heroKey: 'harry', name: 'Rival', hpMax: 30, atk: 6, def: 3,
      mag: 10, agi: 5, lck: 5, spells: ['Incendio', 'Episkey'], equipment: [],
    }, 0);
    return {
      isDuelist: e.isDuelist === true,
      hp:        e.hp,
      hasDamage: e.abilities.some(a => a.effect === 'damage'),
      hasHeal:   e.abilities.some(a => a.effect === 'heal'),
    };
  });
  assert(enemy.isDuelist,  "l'ennemi de duel doit être marqué isDuelist");
  assert(enemy.hp === 30,  'les PV du duelliste viennent du snapshot');
  assert(enemy.hasDamage,  'un sort offensif doit produire une capacité damage');
  assert(enemy.hasHeal,    'un sort de soin doit produire une capacité heal');

  // 4) Duel — démarrage puis victoire (mode normal).
  const win = await page.evaluate(() => {
    ironmanMode = false;
    const goldBefore = player.gold;
    const fakeSnap = { name: 'Rival', level: 6, house: 'Serpentard', mode: 'normal',
      heroes: [{ heroKey: 'harry', name: 'Rival', icon: '🧙', hpMax: 20,
                 atk: 5, def: 2, mag: 8, agi: 5, lck: 5,
                 spells: ['Glacius'], equipment: [] }] };
    const started = mpStartDuel(fakeSnap, { playerId: 'duel-1', name: 'Rival', level: 6 });
    const inDuel  = mpDuelActive === true && inBattle === true;
    const grp     = enemyGroup.length;
    const duelist = enemyGroup[0] && enemyGroup[0].isDuelist === true;
    // Achève les duellistes puis déclenche la fin de combat.
    enemyGroup.forEach(e => { e.currentHp = 0; });
    checkAllEnemiesDead();
    return {
      started, inDuel, grp, duelist,
      duelCleared: mpDuelActive === false,
      battleOver:  inBattle === false,
      beaten:      defeatedDuelists.has('duel-1'),
      goldGain:    player.gold - goldBefore,
    };
  });
  assert(win.started,     'mpStartDuel doit réussir');
  assert(win.inDuel,      'le duel doit activer mpDuelActive + inBattle');
  assert(win.grp === 1,   `1 duelliste attendu dans enemyGroup (obtenu ${win.grp})`);
  assert(win.duelist,     "l'enemyGroup doit contenir un duelliste");
  assert(win.duelCleared, 'la victoire doit éteindre mpDuelActive');
  assert(win.battleOver,  'la victoire doit terminer le combat');
  assert(win.beaten,      "l'adversaire vaincu doit entrer dans defeatedDuelists");
  assert(win.goldGain > 0, `une victoire normale doit rapporter de l'or (obtenu ${win.goldGain})`);

  // 5) Victoire Ironman — copie d'un sort inconnu du vaincu.
  const ironWin = await page.evaluate(() => {
    ironmanMode = true;
    const knewBefore = party[0].spells.includes('Sectumsempra');
    const fakeSnap = { name: 'IronRival', level: 8, mode: 'ironman',
      heroes: [{ heroKey: 'harry', name: 'IronRival', icon: '🧙', hpMax: 18,
                 atk: 5, def: 2, mag: 8, agi: 5, lck: 5,
                 spells: ['Sectumsempra'], equipment: [] }] };
    mpStartDuel(fakeSnap, { playerId: 'duel-2', name: 'IronRival', level: 8 });
    enemyGroup.forEach(e => { e.currentHp = 0; });
    checkAllEnemiesDead();
    ironmanMode = false;
    return {
      knewBefore,
      learned: party[0].spells.includes('Sectumsempra'),
      beaten:  defeatedDuelists.has('duel-2'),
    };
  });
  assert(!ironWin.knewBefore, 'pré-condition : le sort copié doit être inconnu');
  assert(ironWin.learned,     'une victoire Ironman doit copier un sort inconnu du vaincu');
  assert(ironWin.beaten,      "l'adversaire Ironman vaincu doit entrer dans defeatedDuelists");

  // 6) Défaite en duel normal — aucune conséquence, groupe relevé.
  const loss = await page.evaluate(() => {
    ironmanMode = false;
    const fakeSnap = { name: 'Rival3', level: 5, mode: 'normal',
      heroes: [{ heroKey: 'harry', name: 'Rival3', icon: '🧙', hpMax: 40,
                 atk: 9, def: 4, mag: 9, agi: 5, lck: 5,
                 spells: ['Incendio'], equipment: [] }] };
    mpStartDuel(fakeSnap, { playerId: 'duel-3', name: 'Rival3', level: 5 });
    party.slice(0, partySize).forEach(c => { c.hp = 0; });
    enemyTurn();
    const deathShown = document.getElementById('death-screen').style.display === 'flex';
    return {
      duelCleared: mpDuelActive === false,
      revived:     party[0].hp > 0,
      battleOver:  inBattle === false,
      deathShown,
    };
  });
  assert(loss.duelCleared, 'une défaite de duel doit éteindre mpDuelActive');
  assert(loss.revived,     'mode normal : le groupe doit être relevé après une défaite de duel');
  assert(loss.battleOver,  'la défaite doit terminer le combat');
  assert(!loss.deathShown, 'mode normal : aucune mort sur défaite de duel');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (duel PvP)`);
  }
  console.log('  ✅ multijoueur — snapshot, duel, victoire/défaite PvP OK');
  await browser.close();
}

async function scenarioMultiplayerMessages() {
  console.log('\n── Scénario : multijoueur messages ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Globals Phase 4 exposés.
  const exposed = await page.evaluate(() => ({
    mpComposeText:        typeof mpComposeText === 'function',
    getMessageAt:         typeof getMessageAt === 'function',
    mpPostMessage:        typeof mpPostMessage === 'function',
    openMessageComposer:  typeof openMessageComposer === 'function',
    drawMessageMarker:    typeof drawMessageMarker === 'function',
    placementsVar:        typeof messagePlacements !== 'undefined',
    banks:                Array.isArray(MP_MSG_TEMPLATES) && Array.isArray(MP_MSG_WORDS),
    overlayEl:            !!document.getElementById('mp-message-overlay'),
  }));
  Object.entries(exposed).forEach(([k, v]) => assert(v, `global/élément manquant : ${k}`));

  // 2) mpComposeText — recomposition par gabarit + mot, banque fermée.
  const compose = await page.evaluate(() => ({
    slot:    mpComposeText('beware', 'trap'),
    noSlot:  mpComposeText('congrats', null),
    badTpl:  mpComposeText('inexistant', 'trap'),
    badWord: mpComposeText('beware', 'inexistant'),
  }));
  assert(/piège/.test(compose.slot),   'mpComposeText doit insérer le mot dans le gabarit');
  assert(compose.noSlot && compose.noSlot.length > 0, 'un gabarit sans slot doit se composer seul');
  assert(compose.badTpl === null,      'un gabarit hors banque doit donner null');
  assert(compose.badWord === null,     'un mot hors banque doit donner null');

  // 3) Projection — seuls gabarit/mot connus + case FLOOR sont retenus.
  const proj = await page.evaluate(() => {
    dungeon[3][5] = CELL.FLOOR;
    dungeon[3][6] = CELL.FLOOR;
    dungeon[3][7] = CELL.FLOOR;
    _mpProjectMessages([
      { author_id: 'a', author_name: 'Alice', x: 5, y: 3, template: 'beware',   word: 'trap' },
      { author_id: 'b', author_name: 'Bob',   x: 5, y: 3, template: 'beware',   word: 'trap' },
      { author_id: 'c', author_name: 'Carol', x: 6, y: 3, template: 'INCONNU',  word: 'trap' },
      { author_id: 'd', author_name: 'Dave',  x: 7, y: 3, template: 'congrats' },
    ]);
    const at53 = getMessageAt(5, 3);
    return {
      size:    messagePlacements.size,
      has53:   !!at53,
      author:  at53 && at53.authorName,
      hasBad:  !!getMessageAt(6, 3),
      has73:   !!getMessageAt(7, 3),
    };
  });
  assert(proj.size === 2,    `2 messages projetés attendus (obtenu ${proj.size})`);
  assert(proj.has53,         'le message valide doit être projeté');
  assert(proj.author === 'Alice', 'collision : le 1er (plus récent) doit gagner');
  assert(!proj.hasBad,       'un message au gabarit inconnu doit être ignoré');
  assert(proj.has73,         'un gabarit sans slot doit être projeté');

  // 4) Compositeur — overlay + chips de gabarits/mots.
  const composer = await page.evaluate(() => {
    playerX = 5; playerY = 5;
    dungeon[5][5] = CELL.FLOOR;
    messagePlacements = new Map();
    openMessageComposer();
    const ov    = document.getElementById('mp-message-overlay');
    const panel = document.getElementById('mp-message-panel');
    return {
      shown:   ov && ov.style.display === 'flex',
      chips:   panel.querySelectorAll('.mp-chip').length,
      preview: !!panel.querySelector('.mp-msg-preview'),
    };
  });
  assert(composer.shown,       "le compositeur doit s'afficher sur une case libre");
  assert(composer.chips > 0,   'le compositeur doit lister des chips gabarit/mot');
  assert(composer.preview,     'le compositeur doit afficher un aperçu');

  // 5) Gravure d'un message via le compositeur.
  const post = await page.evaluate(() => {
    _mpLastMsgPost = 0;                       // neutralise le cooldown
    _mpSelectTemplate('beware');
    _mpSelectWord('monster');
    _mpConfirmMessage();
    const ov  = document.getElementById('mp-message-overlay');
    const msg = getMessageAt(playerX, playerY);
    return {
      closed: ov.style.display === 'none',
      text:   msg && msg.text,
      mine:   msg && msg.authorId === getMpPlayerId(),
    };
  });
  assert(post.closed,            'graver un message doit fermer le compositeur');
  assert(/monstre/.test(post.text || ''), 'le message gravé doit porter le texte composé');
  assert(post.mine,              'le message gravé doit être attribué au joueur local');

  // 6) Lecture — le marqueur 3D est rendu pour un message devant le joueur.
  const render = await page.evaluate(() => {
    playerX = 5; playerY = 5; playerDir = 'n';
    dungeon[5][5] = CELL.FLOOR;
    dungeon[4][5] = CELL.FLOOR;
    ghostPlacements   = new Map();
    messagePlacements = new Map();
    messagePlacements.set('5,4', { x: 5, y: 4, text: 'Méfie-toi de un piège',
                                   authorName: 'Alice', authorId: 'a' });
    let calls = 0;
    const orig = window.drawMessageMarker;
    window.drawMessageMarker = function () { calls++; return orig.apply(this, arguments); };
    drawDungeon();
    window.drawMessageMarker = orig;
    renderMinimap();
    return {
      markerCalls: calls,
      mapMarks:    document.querySelectorAll('#minimap .map-message').length,
    };
  });
  assert(render.markerCalls >= 1,
    `drawMessageMarker doit être appelé pour un message devant (obtenu ${render.markerCalls})`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (messages)`);
  }
  console.log('  ✅ multijoueur — gabarits, projection, gravure, marqueur OK');
  await browser.close();
}

async function scenarioMultiplayerGifts() {
  console.log('\n── Scénario : multijoueur cadeaux ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Globals Phase 5 exposés.
  const exposed = await page.evaluate(() => ({
    mpOpenGiftView:    typeof mpOpenGiftView === 'function',
    claimPendingGifts: typeof claimPendingGifts === 'function',
    giftableHelper:    typeof _mpGiftableItems === 'function',
    cap:               typeof MP_GIFT_GOLD_MAX === 'number' && MP_GIFT_GOLD_MAX === 500,
    cooldownConst:     typeof MP_GIFT_RECIPIENT_COOLDOWN_MS === 'number',
    cooldownMap:       typeof _mpGiftCooldowns !== 'undefined',
  }));
  Object.entries(exposed).forEach(([k, v]) => assert(v, `global manquant : ${k}`));

  // 2) Bouton 🎁 actif dans l'overlay fantôme (plus de « phase ultérieure »).
  const overlay = await page.evaluate(() => {
    const ghost = { playerId: 'ally-1', name: 'Alice', level: 4, house: 'Gryffondor',
      heroKeys: ['harry'], floor: 1, x: 0, y: 0, mode: 'normal', status: 'exploring' };
    openGhostInteraction(ghost);
    const panel = document.getElementById('ghost-panel');
    const giftBtn = Array.from(panel.querySelectorAll('button'))
      .find(b => /Offrir/.test(b.textContent));
    return {
      overlayShown: document.getElementById('ghost-overlay').style.display === 'flex',
      hasGiftBtn:   !!giftBtn,
      enabled:      !!(giftBtn && !giftBtn.disabled),
    };
  });
  assert(overlay.overlayShown, "l'overlay fantôme doit s'afficher");
  assert(overlay.hasGiftBtn,   'le bouton 🎁 Offrir doit exister');
  assert(overlay.enabled,      'le bouton 🎁 Offrir doit être actif (phase 5 livrée)');

  // 3) _mpGiftableItems — exclut les items requis par une quête active.
  const filter = await page.evaluate(() => {
    activeQuests = [{ id: 'q', completed: false,
      objectives: [{ type: 'item', itemId: 'mandragore', amount: 1,
                     progress: 0, completed: false }] }];
    player.inventory = [
      { id: 'potion_s',   name: 'Potion S' },
      { id: 'mandragore', name: 'Mandragore' },        // quête → exclu
      { id: 'wand1',      name: 'Baguette de Saule' },
    ];
    const list = _mpGiftableItems();
    return { count: list.length, ids: list.map(({ item }) => item.id) };
  });
  assert(filter.count === 2,                'la mandragore quête doit être filtrée');
  assert(filter.ids.includes('potion_s'),   'la potion doit rester offrable');
  assert(filter.ids.includes('wand1'),      'la baguette doit rester offrable');
  assert(!filter.ids.includes('mandragore'),'item de quête doit être exclu');

  // 4) Vue cadeau — onglets + champ or présent, plafond respecté.
  const view = await page.evaluate(() => {
    player.gold = 320;
    mpOpenGiftView();
    const panel = document.getElementById('ghost-panel');
    const tabs  = panel.querySelectorAll('.mp-gift-tabs .mp-chip');
    const goldInput = panel.querySelector('input[type="number"]');
    return {
      tabs:    tabs.length,
      hasGold: !!goldInput,
      max:     goldInput && parseInt(goldInput.max, 10),
    };
  });
  assert(view.tabs === 2,        'la vue cadeau doit afficher 2 onglets (or / objet)');
  assert(view.hasGold,           "le champ or doit s'afficher");
  assert(view.max === 320,       `le max doit être borné par l'or (obtenu ${view.max})`);

  // 5) Stub réseau — force _mpConfigured et intercepte fetch.
  await page.evaluate(() => {
    window._mpFetchCalls = [];
    window._mpConfigured = function () { return true; };
    MP_CONFIG.supabaseUrl     = 'https://stub.supabase.test';
    MP_CONFIG.supabaseAnonKey = 'stub-key';
    window._mpStubInbox = [];
    const realFetch = window.fetch;
    window.fetch = async function (url, opts) {
      const u = String(url || '');
      const method = (opts && opts.method) || 'GET';
      window._mpFetchCalls.push({ url: u, method,
        body: opts && opts.body ? JSON.parse(opts.body) : null });
      // SELECT sur mp_gifts → renvoyer la boîte simulée
      if (u.includes('/mp_gifts') && method === 'GET') {
        return new Response(JSON.stringify(window._mpStubInbox),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      // INSERT / UPDATE / autre → 200 vide
      if (u.includes('/mp_gifts')) {
        return new Response('', { status: 204 });
      }
      // Tout autre appel : repasse au fetch d'origine (ressources locales)
      return realFetch.apply(this, arguments);
    };
  });

  // 6) Envoi d'un cadeau or — payload conforme, gold débité, cooldown armé.
  const send = await page.evaluate(async () => {
    _mpGiftCooldowns.clear();
    window._mpFetchCalls = [];
    const before = player.gold;
    _mpGiftSelectKind('gold');
    _mpGiftSetGold(150);
    _mpConfirmGift();
    await new Promise(r => setTimeout(r, 40));         // attend le POST
    const post = window._mpFetchCalls.find(c =>
      c.method === 'POST' && /\/mp_gifts/.test(c.url));
    return {
      goldDelta: before - player.gold,
      postBody:  post && post.body,
      overlayClosed: document.getElementById('ghost-overlay').style.display === 'none',
      cooldown:  _mpGiftCooldowns.has('ally-1'),
    };
  });
  assert(send.goldDelta === 150,        `gold doit être débité de 150 (obtenu ${send.goldDelta})`);
  assert(send.overlayClosed,            "envoyer un cadeau doit fermer l'overlay");
  assert(send.postBody && send.postBody.kind === 'gold',
    'le payload POST doit porter kind=gold');
  assert(send.postBody.recipient_id === 'ally-1',
    'le payload doit cibler le destinataire de l\'overlay');
  assert(send.postBody.amount === 150,
    `le payload doit porter amount=150 (obtenu ${send.postBody && send.postBody.amount})`);
  assert(send.cooldown,                 'le cooldown destinataire doit être armé');

  // 7) Cooldown — un 2e envoi immédiat au même destinataire est bloqué.
  const cooldown = await page.evaluate(() => {
    const before = player.gold;
    const ghost = { playerId: 'ally-1', name: 'Alice', level: 4, house: 'Gryffondor',
      heroKeys: ['harry'], floor: 1, x: 0, y: 0, mode: 'normal', status: 'exploring' };
    openGhostInteraction(ghost);
    mpOpenGiftView();
    const panel = document.getElementById('ghost-panel');
    const sendBtn = Array.from(panel.querySelectorAll('button'))
      .find(b => /Offrir|Attends/.test(b.textContent));
    const blocked = sendBtn && (sendBtn.disabled || /Attends/.test(sendBtn.textContent));
    // Tente quand même un confirm — il doit être no-op.
    _mpConfirmGift();
    return { blocked, goldUnchanged: player.gold === before };
  });
  assert(cooldown.blocked,        'le bouton doit afficher « Attends … » sur cooldown');
  assert(cooldown.goldUnchanged,  "le 2e envoi vers le même joueur ne doit rien débiter");

  // 8) claimPendingGifts — applique or + item, PATCH claimed_at.
  await page.evaluate(() => {
    window._mpStubInbox = [
      { id: 'g1', sender_name: 'Bob',   kind: 'gold', amount: 120 },
      { id: 'g2', sender_name: 'Carol', kind: 'item',
        item_id: 'potion_s', item_name: 'Potion S',
        item_data: { id: 'potion_s', name: 'Potion S', type: 'consumable', icon: '🧪' } },
      { id: 'g3', sender_name: 'Dave',  kind: 'gold', amount: 99999 },   // doit être clampé
    ];
    player.gold = 0;
    player.inventory = [];                                                // sac vide
  });
  const claim = await page.evaluate(async () => {
    window._mpFetchCalls = [];
    const out = await claimPendingGifts();
    return {
      ok:       !!out && out.ok,
      gold:     player.gold,
      hasItem:  player.inventory.some(it => it && it.id === 'potion_s'),
      patches:  window._mpFetchCalls.filter(c => c.method === 'PATCH'
                 && /\/mp_gifts\?id=eq\./.test(c.url)).length,
    };
  });
  assert(claim.ok,                'claimPendingGifts doit aboutir');
  // 120 + 500 (clamp de 99999) = 620
  assert(claim.gold === 620,
    `or réclamé = 120 + clamp(99999→500) = 620 (obtenu ${claim.gold})`);
  assert(claim.hasItem,           "l'item du cadeau doit arriver dans le sac");
  assert(claim.patches === 3,
    `3 PATCH claimed_at attendus (1/cadeau appliqué), obtenu ${claim.patches}`);

  // 9) Sac plein — un item non claimé reste dans la boîte (pas de PATCH).
  await page.evaluate(() => {
    window._mpStubInbox = [
      { id: 'g4', sender_name: 'Eve', kind: 'item',
        item_id: 'potion_m', item_name: 'Potion M',
        item_data: { id: 'potion_m', name: 'Potion M', type: 'consumable', icon: '🧪' } },
    ];
    // Remplit le sac à ras bord (16 slots).
    player.inventory = [];
    for (let i = 0; i < 16; i++) player.inventory.push({ id: 'filler', name: 'f', type: 'misc' });
  });
  const overflow = await page.evaluate(async () => {
    window._mpFetchCalls = [];
    await claimPendingGifts();
    return {
      patches: window._mpFetchCalls.filter(c => c.method === 'PATCH'
                 && /\/mp_gifts\?id=eq\./.test(c.url)).length,
      potion:  player.inventory.some(it => it && it.id === 'potion_m'),
    };
  });
  assert(overflow.patches === 0,
    `sac plein → 0 PATCH (cadeau préservé), obtenu ${overflow.patches}`);
  assert(!overflow.potion, 'sac plein → la potion ne doit PAS être ajoutée');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (cadeaux)`);
  }
  console.log('  ✅ multijoueur — envoi, cooldown, boîte aux lettres OK');
  await browser.close();
}

async function scenarioMultiplayerPolish() {
  console.log('\n── Scénario : multijoueur polish ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) _mpLevelGapTier — classification des écarts.
  const tiers = await page.evaluate(() => ({
    even:   _mpLevelGapTier(0),
    safe:   _mpLevelGapTier(-4),
    warn:   _mpLevelGapTier(4),
    danger: _mpLevelGapTier(8),
  }));
  assert(tiers.even.cls   === 'even',   'gap=0 doit être "even"');
  assert(tiers.safe.cls   === 'safe',   'gap=-4 doit être "safe"');
  assert(tiers.warn.cls   === 'warn',   'gap=+4 doit être "warn"');
  assert(tiers.danger.cls === 'danger', 'gap=+8 doit être "danger"');
  assert(tiers.warn.warn   && tiers.warn.warn.length > 0,
    'le tier warn doit porter un message d\'avertissement');
  assert(tiers.danger.warn && tiers.danger.warn.length > 0,
    'le tier danger doit porter un message d\'avertissement');
  assert(tiers.even.warn === null, 'le tier even ne doit pas avertir');

  // 2) Confirmation Ironman avant duel — sous-vue, pas d'engagement direct.
  const confirm = await page.evaluate(() => {
    ironmanMode = true;
    player.level = 4;
    const ghost = { playerId: 'iron-1', name: 'Voldemort Jr.', level: 12,
      house: 'Serpentard', heroKeys: ['harry'], floor: 1, x: 0, y: 0,
      mode: 'ironman', status: 'exploring' };
    openGhostInteraction(ghost);
    // Le clic sur ⚔️ Défier doit ouvrir la confirmation, PAS engager.
    mpChallengeGhost();
    const panel = document.getElementById('ghost-panel');
    const hasWarn = !!panel.querySelector('.ghost-iron-warn');
    const hasGap  = !!panel.querySelector('.ghost-gap-danger');
    const recule  = Array.from(panel.querySelectorAll('button'))
      .find(b => /Reculer/.test(b.textContent));
    const engager = Array.from(panel.querySelectorAll('button'))
      .find(b => /Engager le duel/.test(b.textContent));
    // Le bouton Reculer doit ramener à la vue principale, pas engager.
    recule.click();
    const backHasGiftBtn = !!Array.from(
      document.querySelectorAll('#ghost-panel button')
    ).find(b => /Offrir/.test(b.textContent));
    ironmanMode = false;
    return {
      hasWarn, hasGap, hasEngager: !!engager,
      noBattle: !inBattle,
      back: backHasGiftBtn,
    };
  });
  assert(confirm.hasWarn,   'la sous-vue Ironman doit afficher le bandeau ☠');
  assert(confirm.hasGap,    'la sous-vue doit colorer en danger un écart +8');
  assert(confirm.hasEngager, 'la sous-vue doit exposer le bouton « Engager »');
  assert(confirm.noBattle,  'la confirmation seule ne doit pas démarrer un combat');
  assert(confirm.back,      'le bouton Reculer doit ramener à la vue principale');

  // 3) Collision de fantômes — 3 fantômes sur la même case = 1 + extras=2.
  const collide = await page.evaluate(() => {
    // Force le joueur loin du point de test pour éviter la collision
    // playerX/playerY=5,3 (flakiness selon le seed du donjon).
    playerX = 0; playerY = 0;
    dungeon[3][5] = CELL.FLOOR;
    if (typeof npcPlacements !== 'undefined') npcPlacements.delete('5,3');
    if (enemyMap[3]) enemyMap[3][5] = null;
    _mpProjectGhosts([
      { player_id: 'a', name: 'A', x: 5, y: 3, hero_keys: ['harry'], level: 2 },
      { player_id: 'b', name: 'B', x: 5, y: 3, hero_keys: ['harry'], level: 3 },
      { player_id: 'c', name: 'C', x: 5, y: 3, hero_keys: ['harry'], level: 4 },
    ]);
    const g = getGhostAt(5, 3);
    return { size: ghostPlacements.size, extras: g && g.extras, first: g && g.name };
  });
  assert(collide.size === 1,       '3 fantômes sur même case = 1 placement (obtenu ' + collide.size + ')');
  assert(collide.extras === 2,     'extras doit valoir 2 pour 3 fantômes (obtenu ' + collide.extras + ')');
  assert(collide.first === 'A',    'le premier fantôme du poll doit gagner la case');

  // 4) Badge minimap +N affiché.
  const minimapBadge = await page.evaluate(() => {
    if (typeof visited !== 'undefined' && visited[3]) visited[3][5] = true;
    renderMinimap();
    const badges = document.querySelectorAll('#minimap .map-ghost-badge');
    return { count: badges.length, txt: badges[0] && badges[0].textContent };
  });
  assert(minimapBadge.count >= 1,    'la minimap doit porter un badge +N (obtenu ' + minimapBadge.count + ')');
  assert(minimapBadge.txt === '+2',  'le badge doit afficher +2 (obtenu ' + minimapBadge.txt + ')');

  // 5) Choix de butin Ironman — modale ouverte quand >1 option, pick applique.
  const lootChoice = await page.evaluate(() => {
    ironmanMode = true;
    // Snapshot avec 2 sorts inconnus + 1 item non possédé → 3 options
    const fakeSnap = { name: 'Multi', level: 6, mode: 'ironman',
      heroes: [{ heroKey: 'harry', name: 'Multi', icon: '🧙',
        hpMax: 12, atk: 4, def: 2, mag: 8, agi: 5, lck: 5,
        spells: ['Sectumsempra', 'Glacius'],
        equipment: [{ id: 'bottes_dragon', name: 'Bottes du Dragon',
                      slot: 'feet', bonusDef: 2 }] }] };
    party[0].spells = party[0].spells.filter(s =>
      s !== 'Sectumsempra' && s !== 'Glacius');
    mpStartDuel(fakeSnap, { playerId: 'iron-2', name: 'Multi', level: 6 });
    enemyGroup.forEach(e => { e.currentHp = 0; });
    checkAllEnemiesDead();
    const ov = document.getElementById('mp-loot-overlay');
    const cards = ov.querySelectorAll('.mp-loot-card');
    const opened = ov.style.display === 'flex';
    // Icônes : doivent être des <img> PNG (pas des emoji), pour les sorts
    // ET pour les items — alignement avec le reste du jeu (modales sorts,
    // inventaire, log combat).
    const spellIconImgs = ov.querySelectorAll('.mp-loot-spell .mp-loot-icon img.ui-icon');
    const itemIconImgs  = ov.querySelectorAll('.mp-loot-item  .mp-loot-icon img.ui-icon');
    // Choisit l'item (Bottes du Dragon) — bouton avec mp-loot-item.
    const itemCard = ov.querySelector('.mp-loot-item');
    itemCard && itemCard.click();
    const overlayClosed = ov.style.display === 'none';
    const hasBoots = player.inventory.some(it => it && it.id === 'bottes_dragon');
    ironmanMode = false;
    return {
      opened,
      cards: cards.length,
      spellImgs: spellIconImgs.length,
      itemImgs:  itemIconImgs.length,
      overlayClosed,
      hasBoots,
      didNotLearn: !party[0].spells.includes('Sectumsempra'),
      battleOver: inBattle === false,
    };
  });
  assert(lootChoice.opened,        'la modale loot doit s\'ouvrir quand >1 option');
  assert(lootChoice.cards === 3,   '3 cartes (2 sorts + 1 item) attendues, obtenu ' + lootChoice.cards);
  assert(lootChoice.spellImgs === 2,
    '2 icônes PNG attendues pour les sorts (pas d\'emoji), obtenu ' + lootChoice.spellImgs);
  assert(lootChoice.itemImgs === 1,
    '1 icône PNG attendue pour l\'item (pas d\'emoji), obtenu ' + lootChoice.itemImgs);
  assert(lootChoice.overlayClosed, 'le pick doit fermer la modale');
  assert(lootChoice.hasBoots,      'le pick item doit ajouter les Bottes du Dragon');
  assert(lootChoice.didNotLearn,   'le pick item ne doit PAS apprendre les sorts non choisis');
  assert(lootChoice.battleOver,    'le combat doit être terminé après le pick');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (polish)`);
  }
  console.log('  ✅ multijoueur — écart, confirm Ironman, collision, choix butin OK');
  await browser.close();
}

// ============================================================
// Duel PvP EN DIRECT (tours relayés, reliquat 4.1) — pvp-duel.js
// ============================================================
// Stubs REST (offline, déterministe) : on simule une visite active via
// _visitGetState, et l'adversaire via une boîte de réception de messages
// (window.__pvpInbox). Vérifie invite → accept → tour relayé → fin (KO).
async function scenarioPvpDuel() {
  console.log('\n── Scénario : duel PvP live (tours relayés) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Stubs : visite active + transport contrôlé.
  await page.evaluate(() => {
    window._visitGetState = () => ({ role: 'visitor', channelId: 'duel-ch', lastIso: null });
    window.__pvpPosted = [];
    window.mpPostVisitMessage = async (channelId, sender, type, payload) => {
      window.__pvpPosted.push({ channelId, sender, type, payload });
      return { id: 'p' + window.__pvpPosted.length, created_at: new Date().toISOString() };
    };
    window.__pvpInbox = [];
    window.mpPollVisitMessages = async () => {
      const out = window.__pvpInbox.slice();
      window.__pvpInbox.length = 0;
      return out.map((m, i) => ({
        id: 'in' + i, sender: 'host', type: m.type, payload: m.payload,
        created_at: new Date().toISOString()
      }));
    };
  });

  // T1 : surface publique + duel possible (visite stubbée).
  const t1 = await page.evaluate(() => ({
    send:  typeof pvpSendDuelInvite === 'function',
    can:   typeof pvpCanDuel === 'function',
    state: typeof _pvpGetState === 'function',
    canDuel: pvpCanDuel(),
    phase: _pvpGetState().phase
  }));
  console.log('  T1 surface →', t1);
  assert(t1.send && t1.can && t1.state, 'API duel exposée');
  assert(t1.canDuel === true,           'duel possible en visite active');
  assert(t1.phase === 'idle',           'phase initiale idle');

  // T2 : j'envoie une invitation → message duelInvite posté, phase inviting.
  const t2 = await page.evaluate(() => {
    const ok = pvpSendDuelInvite();
    const posted = window.__pvpPosted.map(p => p.type);
    return { ok, posted, phase: _pvpGetState().phase };
  });
  console.log('  T2 invite →', t2);
  assert(t2.ok === true,                    'invitation envoyée');
  assert(t2.posted.includes('duelInvite'),  'message duelInvite posté');
  assert(t2.phase === 'inviting',           'phase inviting');

  // T3 : l'adversaire accepte → combat, c'est mon tour (invitant), opp nommé.
  const t3 = await page.evaluate(async () => {
    window.__pvpInbox.push({ type: 'duelAccept',
      payload: { name: 'Bellatrix', combatant: { name: 'Bellatrix', icon: '🧙‍♀️', hpMax: 40 } } });
    await window._pvpPollOnce();
    const s = _pvpGetState();
    return { phase: s.phase, turn: s.turn, oppName: s.oppName, oppHp: s.oppHp, myHp: s.myHp };
  });
  console.log('  T3 accept →', t3);
  assert(t3.phase === 'fighting',  'combat engagé après accept');
  assert(t3.turn === 'me',         'invitant joue en premier');
  assert(t3.oppName === 'Bellatrix', 'adversaire hydraté');
  assert(t3.oppHp === 40,          'PV adverse = hpMax du snapshot');

  // T4 : j'attaque → duelAction posté (dmgToFoe>0), PV adverse baisse, tour opp.
  const t4 = await page.evaluate(() => {
    const before = _pvpGetState().oppHp;
    pvpActAttack();
    const last = window.__pvpPosted[window.__pvpPosted.length - 1];
    const s = _pvpGetState();
    return { type: last.type, dmg: last.payload.dmgToFoe, before, after: s.oppHp, turn: s.turn };
  });
  console.log('  T4 attaque →', t4);
  assert(t4.type === 'duelAction',     'action relayée');
  assert(t4.dmg > 0,                   'dégâts infligés');
  assert(t4.after === t4.before - t4.dmg, 'PV adverse synchronisés (miroir)');
  assert(t4.turn === 'opp',            'la main passe à l\'adversaire');

  // T5 : l'adversaire me porte un coup létal → défaite, duelEnd posté (loser=moi).
  const t5 = await page.evaluate(async () => {
    window.__pvpInbox.push({ type: 'duelAction', payload: { dmgToFoe: 9999, crit: true } });
    await window._pvpPollOnce();
    const s = _pvpGetState();
    const ends = window.__pvpPosted.filter(p => p.type === 'duelEnd');
    return { phase: s.phase, winner: s.winner, myHp: s.myHp,
             endLoser: ends.length ? ends[ends.length - 1].payload.loser : null };
  });
  console.log('  T5 KO →', t5);
  assert(t5.phase === 'ended',     'duel terminé après KO');
  assert(t5.winner === 'opp',      'adversaire vainqueur (j\'ai 0 PV)');
  assert(t5.myHp <= 0,             'mes PV à 0');
  assert(t5.endLoser === 'visitor','duelEnd déclare le perdant (mon rôle)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (pvp duel)`);
  }
  console.log('  ✅ duel PvP live — invite, accept, tour relayé, fin OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioParallelPortal, scenarioPortalMatchmaking, scenarioVisitSnapshot, scenarioVisitChannelTransport, scenarioVisitHudAndBlock, scenarioVisitFloorUpdate, scenarioVisitNetworkDrop, scenarioVisitBackendMissing, scenarioVisitPhaseD, scenarioVisitPhaseE, scenarioVisitPhaseF, scenarioVisitPhaseG, scenarioVisitPhaseH, scenarioVisitV1c1, scenarioMultiplayerPresence, scenarioMultiplayerInteraction, scenarioMultiplayerDuel, scenarioMultiplayerMessages, scenarioMultiplayerGifts, scenarioMultiplayerPolish, scenarioPvpDuel] };
