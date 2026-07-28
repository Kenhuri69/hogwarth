// ============================================================
// Scénarios smoke — domaine « quests » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

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
  assert(t1.step0Monster === 'detraqueur',    'étape 0 doit cibler detraqueur');
  assert(t1.step1Type === 'item',             'étape 1 doit être un item');
  assert(t1.step1Item === 'choco_sorcier',    'étape 1 doit cibler choco_sorcier');

  // T2 : simuler kill du Détraqueur → étape 0 complète, pas d'auto-completion
  // L'id doit matcher MONSTERS (detraqueur) — c'est ce que endBattle passe.
  const t2 = await page.evaluate(() => {
    checkKillQuests('detraqueur');
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

async function scenarioHeadlessHunt() {
  console.log('\n── Scénario : Chasse Sans Tête (easter egg) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : données — quête + PNJ cohérents
  const t1 = await page.evaluate(() => {
    const tpl = getQuestTemplate('chasse_sans_tete');
    const npc = getNpcById('sir_patrick');
    const obj = tpl && tpl.objectives && tpl.objectives[0];
    return {
      tplExists:    !!tpl,
      objType:      obj && obj.type,
      objMonster:   obj && obj.monsterId,
      objAmount:    obj && obj.amount,
      rewardNoItem: !!tpl && !tpl.reward.item && !tpl.reward.spell && !tpl.reward.stats,
      npcExists:    !!npc,
      npcSprite:    npc && npc.sprite,
      npcFloor:     npc && npc.placement && npc.placement.floor,
      npcGives:     npc && Array.isArray(npc.questsGiven) && npc.questsGiven.includes('chasse_sans_tete'),
      monsterReal:  !!(typeof MONSTERS !== 'undefined' && MONSTERS.find(m => m.id === 'chevalier_fantome')),
      available:    availableQuests.has('chasse_sans_tete')
    };
  });
  console.log('  T1 data:', t1);
  assert(t1.tplExists,    'template chasse_sans_tete absent du catalogue');
  assert(t1.objType === 'kill',                 'objectif doit être un kill');
  assert(t1.objMonster === 'chevalier_fantome', 'cible doit être chevalier_fantome');
  assert(t1.objAmount === 2,                    'objectif doit être ×2');
  assert(t1.rewardNoItem,  'récompense doit être cosmétique (pas d\'item/sort/stats)');
  assert(t1.npcExists,     'PNJ sir_patrick introuvable');
  assert(t1.npcSprite === 'fantome', 'sir_patrick doit avoir le sprite fantome');
  assert(t1.npcFloor === 6, 'sir_patrick doit être placé à l\'étage 6');
  assert(t1.npcGives,      'sir_patrick doit donner chasse_sans_tete');
  assert(t1.monsterReal,   'chevalier_fantome doit exister dans MONSTERS');
  assert(t1.available,     'chasse_sans_tete doit être dans availableQuests au démarrage');

  // T2 : placement déterministe étage 6 (getNpcsForFloor + generateDungeon)
  const t2 = await page.evaluate(() => {
    const forFloor = getNpcsForFloor(6).map(n => n.id);
    generateDungeon(6);
    const placed = Array.from(npcPlacements.values());
    return {
      inForFloor: forFloor.includes('sir_patrick'),
      placed:     placed.includes('sir_patrick')
    };
  });
  console.log('  T2 placement:', t2);
  assert(t2.inForFloor, 'getNpcsForFloor(6) doit inclure sir_patrick');
  assert(t2.placed,     'generateDungeon(6) doit placer sir_patrick');

  // T3 : flux accept → kill ×2 → ready (état PNJ) → flag avant remise = false
  const t3 = await page.evaluate(() => {
    const npc = getNpcById('sir_patrick');
    const before = getNpcQuestState(npc);
    acceptQuest('chasse_sans_tete');
    const afterAccept = getNpcQuestState(npc);
    checkKillQuests('chevalier_fantome');
    const afterOne = getNpcQuestState(npc);
    checkKillQuests('chevalier_fantome');
    const afterTwo = getNpcQuestState(npc);
    const q = activeQuests.find(x => x.id === 'chasse_sans_tete');
    return {
      before, afterAccept, afterOne, afterTwo,
      prog:        q && q.objectives[0].progress,
      done:        q && q.objectives[0].completed,
      flagBefore:  headlessHuntMember,
      nickCheerBefore: (typeof _nickHuntCelebration === 'function')
        ? _nickHuntCelebration(getNpcById('sir_nicolas')) : 'absent'
    };
  });
  console.log('  T3 flow:', t3);
  assert(t3.before === 'offer',      'état initial Sir Patrick doit être offer');
  assert(t3.afterAccept === 'active','après acceptation l\'état doit être active');
  assert(t3.afterOne === 'active',   'après 1 kill l\'état doit rester active');
  assert(t3.afterTwo === 'ready',    'après 2 kills l\'état doit passer ready');
  assert(t3.prog === 2,              'progression attendue à 2');
  assert(t3.done,                    'objectif doit être complété');
  assert(t3.flagBefore === false,    'headlessHuntMember doit être false avant remise');
  assert(t3.nickCheerBefore === null,'célébration de Nick ne doit PAS être débloquée avant remise');

  // T4 : remise → flag posé + célébration de Nick débloquée
  const t4 = await page.evaluate(() => {
    const ok = turnInQuestById('chasse_sans_tete');
    return {
      turnInOk:   ok,
      questGone:  !activeQuests.find(x => x.id === 'chasse_sans_tete'),
      inCompleted: completedQuests.has('chasse_sans_tete'),
      flagAfter:  headlessHuntMember,
      nickCheerAfter: (typeof _nickHuntCelebration === 'function')
        ? _nickHuntCelebration(getNpcById('sir_nicolas')) : null,
      nickCheerOther: (typeof _nickHuntCelebration === 'function')
        ? _nickHuntCelebration(getNpcById('moine_gras')) : 'absent'
    };
  });
  console.log('  T4 deliver:', t4);
  assert(t4.turnInOk,    'turnInQuestById a échoué malgré objectif rempli');
  assert(t4.questGone,   'quête doit sortir d\'activeQuests après remise');
  assert(t4.inCompleted, 'quête doit être ajoutée à completedQuests');
  assert(t4.flagAfter === true, 'headlessHuntMember doit être true après remise');
  assert(typeof t4.nickCheerAfter === 'string' && t4.nickCheerAfter.length > 0,
         'célébration de Nick doit être débloquée après remise');
  assert(t4.nickCheerOther === null,
         'la célébration ne doit concerner que Sir Nicolas (pas les autres fantômes)');

  // T5 : round-trip de save conserve le flag
  const t5 = await page.evaluate(() => {
    const gs = _serializeState();
    const serialized = gs.headlessHuntMember;
    headlessHuntMember = false;       // simule un état neuf
    _applyState(gs);
    return { serialized, restored: headlessHuntMember };
  });
  console.log('  T5 save:', t5);
  assert(t5.serialized === true, '_serializeState doit inclure headlessHuntMember=true');
  assert(t5.restored === true,   '_applyState doit restaurer headlessHuntMember');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ easter egg Chasse Sans Tête conforme');
  await browser.close();
}

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

  // T5 : _migrateQuestTargetIds — vieille save dont la quête de Lupin
  // porte l'id de monstre obsolète `dementeur`. La migration doit le
  // réaligner sur `detraqueur` (id canonique du template), sans toucher
  // aux objectifs `item` ni aux quêtes farming (cible à id `null`).
  const t5 = await page.evaluate(() => {
    activeQuests = activeQuests.filter(q => q.id !== 'lumiere_desespoir');
    const tpl  = QUEST_TEMPLATES.find(q => q.id === 'lumiere_desespoir');
    const inst = JSON.parse(JSON.stringify(tpl));
    inst.completed = false;
    inst.objectives[0].monsterId = 'dementeur';   // id obsolète (vieille save)
    activeQuests.push(inst);
    _migrateQuestTargetIds();
    const q = activeQuests.find(x => x.id === 'lumiere_desespoir');
    // 2e passe → idempotence
    _migrateQuestTargetIds();
    return {
      killId:   q.objectives[0].monsterId,
      itemId:   q.objectives[1].itemId,
      hasFn:    typeof _migrateQuestTargetIds === 'function'
    };
  });
  console.log('  T5 migration ids cible:', t5);
  assert(t5.hasFn,                       '_migrateQuestTargetIds non exposée');
  assert(t5.killId === 'detraqueur',     `id kill attendu detraqueur, got ${t5.killId}`);
  assert(t5.itemId === 'choco_sorcier',  `objectif item ne doit pas changer, got ${t5.itemId}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ migration des cibles de quête OK');
  await browser.close();
}

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

async function scenarioDelayedSearch() {
  console.log('\n── Scénario : fouille renouvelée (réactivation différée) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Délai de recharge piloté par la difficulté.
  const delays = await page.evaluate(() => {
    const out = {};
    for (const d of ['Facile', 'Normal', 'Difficile', 'Expert']) {
      difficulty = d;
      out[d] = _searchRechargeSteps();
    }
    difficulty = 'Normal';
    return out;
  });
  assert(delays.Facile === 45,    `Facile doit recharger en 45 pas (obtenu ${delays.Facile})`);
  assert(delays.Normal === 60,    `Normal doit recharger en 60 pas (obtenu ${delays.Normal})`);
  assert(delays.Difficile === 80, `Difficile doit recharger en 80 pas (obtenu ${delays.Difficile})`);
  assert(delays.Expert === 100,   `Expert doit recharger en 100 pas (obtenu ${delays.Expert})`);

  // 2) Machine d'état : fresh → recharging → ready → recharging.
  // Math.random est figé à 0.5 le temps des deux searchRoom() : sinon
  // les jets de malus (monstre/piège, 1 % chacun) peuvent déclencher un
  // combat et rendre la 2e fouille no-op (test sinon flaky ~1 %).
  const fsm = await page.evaluate(() => {
    difficulty   = 'Normal';
    searchedCells = new Map();
    stepCount    = 0;
    const key = `${playerX},${playerY}`;
    const fresh = _searchCellStatus(key).state;
    const orig = Math.random;
    Math.random = () => 0.5;
    let afterSearch, justBefore, ready, afterRepeat;
    try {
      searchRoom();
      afterSearch = _searchCellStatus(key);
      stepCount += 59;
      justBefore = _searchCellStatus(key).state;
      stepCount += 1;                       // total 60 pas écoulés
      ready = _searchCellStatus(key);
      searchRoom();                          // re-fouille
      afterRepeat = _searchCellStatus(key);
    } finally { Math.random = orig; }
    return {
      fresh,
      searchState: afterSearch.state, searchCount: afterSearch.count,
      justBefore,
      readyState: ready.state,
      repeatState: afterRepeat.state, repeatCount: afterRepeat.count
    };
  });
  assert(fsm.fresh === 'fresh',            'case neuve doit être fresh');
  assert(fsm.searchState === 'recharging', 'case doit être recharging juste après fouille');
  assert(fsm.searchCount === 1,            'count doit valoir 1 après 1re fouille');
  assert(fsm.justBefore === 'recharging',  'case doit rester recharging à 59 pas (< 60)');
  assert(fsm.readyState === 'ready',       'case doit être ready à 60 pas écoulés');
  assert(fsm.repeatState === 'recharging', 'case doit redevenir recharging après re-fouille');
  assert(fsm.repeatCount === 2,            'count doit valoir 2 après re-fouille');

  // 3) Round-trip save : searchedCells (Map) + stepCount conservés.
  const rt = await page.evaluate(() => {
    searchedCells = new Map();
    searchedCells.set('9,9', { at: 5, count: 3 });
    stepCount = 42;
    const snap = _serializeState();
    searchedCells = new Map();
    stepCount = 0;
    _applyState(snap);
    const rec = searchedCells.get('9,9');
    return {
      isMap: searchedCells instanceof Map,
      stepCount,
      at: rec && rec.at,
      count: rec && rec.count
    };
  });
  assert(rt.isMap,           'searchedCells doit rester une Map après _applyState');
  assert(rt.stepCount === 42,'stepCount doit survivre au round-trip save');
  assert(rt.at === 5,        'champ at doit survivre au round-trip save');
  assert(rt.count === 3,     'champ count doit survivre au round-trip save');

  // 4) Migration legacy : ancien format (tableau de chaînes) → Map vide.
  const legacy = await page.evaluate(() => {
    const m = _searchedCellsFromArray(['1,1', '2,2', '3,3']);
    return { isMap: m instanceof Map, size: m.size };
  });
  assert(legacy.isMap,      '_searchedCellsFromArray doit retourner une Map');
  assert(legacy.size === 0, 'entrées legacy (chaînes) doivent être ignorées');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Fouille renouvelée OK');
  await browser.close();
}

// ── Fil rouge « Clé de Voûte des Quatre » ─────────────────────────
// Couvre : item eclat_voute (Lot 3), drop garanti monstre-jalon (Lot 3),
// quête parallèle hors-chaîne sur Dumbledore sans geler sa chaîne (Lot 4),
// collecte + remise + consommation (Lot 4), énigme des Fondateurs (Lot 5).
async function scenarioCleVoute() {
  console.log('\n── Scénario : fil rouge Clé de Voûte des Quatre ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : l'item eclat_voute existe (matériau) + icône PNG enregistrée.
  const t1 = await page.evaluate(() => {
    const it = ITEMS.find(i => i.id === 'eclat_voute');
    return {
      exists: !!it,
      type:   it && it.type,
      icon:   typeof ITEM_ICON_NEW_REGISTRY !== 'undefined'
        && !!ITEM_ICON_NEW_REGISTRY['eclat_voute']
    };
  });
  console.log('  T1 item:', t1);
  assert(t1.exists,            'eclat_voute doit exister dans ITEMS');
  assert(t1.type === 'material', `eclat_voute doit être type material, got ${t1.type}`);
  assert(t1.icon,              'eclat_voute doit avoir une icône dans ITEM_ICON_NEW_REGISTRY');

  // T2 : Peeves (jalon tranche A) droppe l'éclat de façon garantie (1.0).
  const t2 = await page.evaluate(() => {
    player.inventory = player.inventory.filter(i => i.id !== 'eclat_voute');
    const peeves = JSON.parse(JSON.stringify(MONSTERS.find(m => m.id === 'peeves')));
    startBattle(peeves);
    enemyGroup.forEach(e => { e.currentHp = 0; });
    endBattle(true);
    return { count: _countItems('eclat_voute') };
  });
  console.log('  T2 drop:', t2);
  assert(t2.count >= 1, 'Peeves doit dropper un eclat_voute (chance 1.0)');

  // T3 : la quête eclats_clef_voute est offrable EN PARALLÈLE de la chaîne
  // de Dumbledore — l'accepter (active) ne gèle pas l'offre du maillon
  // suivant de la chaîne (dumbledore_eveil).
  const t3 = await page.evaluate(() => {
    const npc = getNpcById('dumbledore');
    // À l'ouverture (intro_tutoriel actif), eclats est déjà offrable.
    const offerableAtStart = isQuestOfferable('eclats_clef_voute');
    acceptQuest('eclats_clef_voute');
    const eclatsActive = activeQuests.some(q => q.id === 'eclats_clef_voute');
    // Simule la remise d'intro_tutoriel → débloque dumbledore_eveil.
    activeQuests = activeQuests.filter(q => q.id !== 'intro_tutoriel');
    completedQuests.add('intro_tutoriel');
    availableQuests.delete('intro_tutoriel');
    const state  = getNpcQuestState(npc);
    const labels = _npcDialogActions(npc, state).map(a => a.label).join(' | ');
    return {
      offerableAtStart, eclatsActive,
      eveilOfferable: isQuestOfferable('dumbledore_eveil'),
      hasAccept:      /Accepter/.test(labels),
      labels
    };
  });
  console.log('  T3 parallèle:', t3);
  assert(t3.offerableAtStart, 'eclats_clef_voute doit être offrable dès l\'étage 1');
  assert(t3.eclatsActive,     'eclats_clef_voute doit s\'accepter');
  assert(t3.eveilOfferable,   'dumbledore_eveil doit rester offrable malgré eclats actif (chaîne non gelée)');
  assert(t3.hasAccept,        'le dialogue Dumbledore doit proposer une action « Accepter » (chaîne non gelée)');

  // T4 : collecter 3 éclats → objectif rempli → remise consomme les éclats
  // et distribue la récompense (or +150).
  const t4 = await page.evaluate(() => {
    player.inventory = player.inventory.filter(i => i.id !== 'eclat_voute');
    const eclat = ITEMS.find(i => i.id === 'eclat_voute');
    for (let i = 0; i < 3; i++) tryAddItem({ ...eclat }, { silent: true });
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'eclats_clef_voute');
    const ready = q && (q.objectives || []).every(o => o.completed);
    // Baseline d'or connue : T2 a déclenché un combat synthétique dont le
    // calcul d'or laisse player.gold non fiable. On mesure ici le DELTA de
    // récompense, pas l'absolu.
    const goldBefore = (player.gold = 100);
    turnInQuestById('eclats_clef_voute');
    return {
      ready,
      goldGain:  player.gold - goldBefore,
      eclatsAfter: _countItems('eclat_voute'),
      done:      completedQuests.has('eclats_clef_voute')
    };
  });
  console.log('  T4 remise:', t4);
  assert(t4.ready,            'objectif 3 éclats doit être rempli après collecte');
  assert(t4.goldGain === 150, `remise doit donner 150 or, got ${t4.goldGain}`);
  assert(t4.eclatsAfter === 0, 'les 3 éclats doivent être consommés à la remise');
  assert(t4.done,             'eclats_clef_voute doit être marquée complétée');

  // T5 : l'énigme des Fondateurs existe et pointe la bonne réponse.
  const t5 = await page.evaluate(() => {
    const r = getRiddleById('r_clef_voute');
    return { exists: !!r, correct: r && r.choices[r.answer] };
  });
  console.log('  T5 énigme:', t5);
  assert(t5.exists,                    'r_clef_voute doit exister dans RIDDLES');
  assert(t5.correct === 'Les Fondateurs', `bonne réponse attendue « Les Fondateurs », got ${t5.correct}`);

  // T6 : payoff narratif — la remise déclenche une scène de révélation
  // paginée (questReady = 3 pages ≤ 280, voix ready_1..3 enregistrées).
  const t6 = await page.evaluate(() => {
    const dq = getNpcById('dumbledore').dialoguesByQuest.eclats_clef_voute;
    const pages = dq.questReady;
    return {
      isArray:   Array.isArray(pages),
      len:       Array.isArray(pages) ? pages.length : 0,
      allWithin: Array.isArray(pages) && pages.every(p => p.length <= 280),
      voiceKeys: (typeof AudioSystem !== 'undefined' && AudioSystem._VOICE_SAMPLES)
        ? [1, 2, 3].map(n => !!AudioSystem._VOICE_SAMPLES['dumbledore_eclats_ready_' + n])
        : []
    };
  });
  console.log('  T6 révélation:', t6);
  assert(t6.isArray && t6.len === 3, 'questReady eclats doit être une scène de 3 pages');
  assert(t6.allWithin,               'chaque page de révélation doit tenir en 1 sous-page (≤ 280)');
  assert(t6.voiceKeys.length === 3 && t6.voiceKeys.every(Boolean),
    'les 3 clés voix dumbledore_eclats_ready_1..3 doivent être enregistrées');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant le fil rouge Clé de Voûte`);
  }
  console.log('  ✅ fil rouge Clé de Voûte OK');
  await browser.close();
}

// L1 — fanfare de quête accomplie : completeQuest monte un bandeau doré
// (UX.questFanfare) + joue un timbre distinct (AudioSystem.playQuestComplete).
async function scenarioQuestFanfare() {
  console.log('\n── Scénario : Fanfare de quête accomplie (L1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasFanfare = typeof UX !== 'undefined' && typeof UX.questFanfare === 'function';
      out.hasSound   = typeof AudioSystem !== 'undefined' && typeof AudioSystem.playQuestComplete === 'function';
      // Aucun bandeau au repos.
      out.noneBefore = !document.querySelector('.quest-fanfare');
      // Complète une quête réelle → le bandeau doit apparaître.
      acceptQuest('lumiere_desespoir');
      const idx = activeQuests.findIndex(x => x.id === 'lumiere_desespoir');
      out.accepted = idx >= 0;
      completeQuest(idx);
      const el = document.querySelector('.quest-fanfare');
      out.mounted = !!el;
      out.titleShown = !!(el && el.querySelector('.qf-name') &&
                          el.querySelector('.qf-name').textContent.length > 0);
      // API directe : titre échappé (pas d'injection HTML).
      UX.questFanfare('<b>x</b>');
      const els = document.querySelectorAll('.quest-fanfare');
      const last = els[els.length - 1];
      out.escaped = last.querySelector('.qf-name').innerHTML.indexOf('<b>') === -1;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  L1:', r);
  assert(!r.threw, 'L1 throw: ' + (r.err || ''));
  assert(r.hasFanfare, 'L1 UX.questFanfare absent');
  assert(r.hasSound, 'L1 AudioSystem.playQuestComplete absent');
  assert(r.noneBefore, 'L1 bandeau présent à tort au repos');
  assert(r.accepted, 'L1 quête de test non acceptée');
  assert(r.mounted, 'L1 bandeau non monté après completeQuest');
  assert(r.titleShown, 'L1 titre de quête absent du bandeau');
  assert(r.escaped, 'L1 titre non échappé (risque d\'injection HTML)');

  // Le bandeau est retiré après l'animation (~2,6 s).
  await new Promise(res => setTimeout(res, 2900));
  const gone = await page.evaluate(() => !document.querySelector('.quest-fanfare'));
  assert(gone, 'L1 bandeau non retiré après l\'animation');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Fanfare de quête (L1)');
  }
  console.log('  ✅ Fanfare de quête accomplie (L1) OK');
  await browser.close();
}

// Quêtes des PNJ recyclés en Boucle Ténébreuse (étages 11+) : gate par étage
// (isQuestOfferable), nouveau type d'objectif `search`, collecte vendeur.
async function scenarioLoopNpcQuests() {
  console.log('\n── Scénario : quêtes PNJ de la Boucle (étages 11+) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : templates présents + champs attendus.
  const t1 = await page.evaluate(() => {
    const ids = ['chasse_kingsley_boucle', 'chasse_bill_boucle', 'chasse_sirius_boucle',
                 'recup_marchand_boucle', 'collecte_apothicaire_boucle',
                 'collecte_forgeron_boucle', 'prime_boss_gardien'];
    const all = ids.every(id => QUEST_TEMPLATES.some(t => t.id === id));
    const search = QUEST_TEMPLATES.find(t => t.id === 'recup_marchand_boucle');
    const boss   = QUEST_TEMPLATES.find(t => t.id === 'prime_boss_gardien');
    return {
      all,
      searchType: search && search.objectives[0].type === 'search',
      searchMinFloor: search && search.minFloor === 11,
      bossSpawn: !!(boss && boss.spawnOnAccept && boss.spawnOnAccept.targetMonsterId === 'magyar_ancestral'),
      hasCheckSearch: typeof checkSearchQuests === 'function'
    };
  });
  console.log('  T1:', t1);
  assert(t1.all,            'tous les templates de quêtes Boucle doivent exister');
  assert(t1.searchType,     'recup_marchand_boucle doit porter un objectif type:search');
  assert(t1.searchMinFloor, 'recup_marchand_boucle doit être gaté minFloor:11');
  assert(t1.bossSpawn,      'prime_boss_gardien doit spawn magyar_ancestral');
  assert(t1.hasCheckSearch, 'checkSearchQuests doit être exposée');

  // T2 : gate par étage — non offrable hors Boucle, offrable en Boucle.
  const t2 = await page.evaluate(() => {
    completedQuests.delete('chasse_kingsley_boucle');
    availableQuests.add('chasse_kingsley_boucle');
    currentFloor = 8;
    const surfaceOffer = isQuestOfferable('chasse_kingsley_boucle');   // false attendu
    currentFloor = 18;
    const loopOffer = isQuestOfferable('chasse_kingsley_boucle');      // true attendu
    return { surfaceOffer, loopOffer };
  });
  console.log('  T2:', t2);
  assert(t2.surfaceOffer === false, 'quête Boucle ne doit PAS être offrable à l\'étage 8');
  assert(t2.loopOffer === true,     'quête Boucle doit être offrable à l\'étage 18');

  // T3 : type `search` — checkSearchQuests fait progresser puis complète.
  const t3 = await page.evaluate(() => {
    completedQuests.delete('recup_marchand_boucle');
    availableQuests.add('recup_marchand_boucle');
    activeQuests = activeQuests.filter(q => q.id !== 'recup_marchand_boucle');
    currentFloor = 18;
    const accepted = acceptQuest('recup_marchand_boucle');
    const q = activeQuests.find(x => x.id === 'recup_marchand_boucle');
    const amount = q ? q.objectives[0].amount : -1;
    for (let i = 0; i < amount; i++) checkSearchQuests();
    const done = q && q.objectives[0].completed;
    return { accepted, amount, progress: q ? q.objectives[0].progress : -1, done };
  });
  console.log('  T3:', t3);
  assert(t3.accepted,            'recup_marchand_boucle doit être acceptable en Boucle');
  assert(t3.progress === t3.amount, 'la fouille doit atteindre l\'objectif');
  assert(t3.done,                'l\'étape search doit être complétée');

  // T4 : collecte item (Forgeron) — consomme l'Essence à la remise.
  const t4 = await page.evaluate(() => {
    completedQuests.delete('collecte_forgeron_boucle');
    availableQuests.add('collecte_forgeron_boucle');
    activeQuests = activeQuests.filter(q => q.id !== 'collecte_forgeron_boucle');
    currentFloor = 20;
    const ess = ITEMS.find(i => i.id === 'essence_tenebres');
    for (let i = 0; i < 3; i++) tryAddItem(ess, { silent: true });
    const accepted = acceptQuest('collecte_forgeron_boucle');
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'collecte_forgeron_boucle');
    const ready = q && q.objectives.every(o => o.completed);
    const goldBefore = player.gold;
    const turned = turnInQuestById('collecte_forgeron_boucle');
    const essLeft = (typeof _countItems === 'function')
      ? _countItems('essence_tenebres')
      : player.inventory.filter(i => i.id === 'essence_tenebres').length;
    return { accepted, ready, turned, goldGained: player.gold - goldBefore, essLeft };
  });
  console.log('  T4:', t4);
  assert(t4.accepted,       'collecte_forgeron_boucle doit être acceptable en Boucle');
  assert(t4.ready,          'la collecte doit être prête avec 3 Essences en poche');
  assert(t4.turned,         'la collecte doit être remettable');
  assert(t4.goldGained > 0, 'la remise doit créditer de l\'or');
  assert(t4.essLeft === 0,  'la remise doit consommer les 3 Essences');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (quêtes Boucle)`);
  }
  console.log('  ✅ Quêtes PNJ de la Boucle OK');
  await browser.close();
}

// Suivi 2 — quêtes des PNJ lore en Boucle : Pomfresh (fabrication),
// Ollivander (fouille → baguette épique), chaîne Manon → Lockhart (rédemption).
async function scenarioLoopNpcQuests2() {
  console.log('\n── Scénario : quêtes PNJ lore de la Boucle (suivi 2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : templates + nouveaux items présents.
  const t1 = await page.evaluate(() => {
    const ids = ['fabrique_pomfresh', 'bois_ollivander_boucle', 'manon_confier', 'memoire_lockhart'];
    return {
      allQuests: ids.every(id => QUEST_TEMPLATES.some(t => t.id === id)),
      wand: !!ITEMS.find(i => i.id === 'baguette_if_boucle' && i.slot === 'wand' && i.rarity === 'epic'),
      recit: !!ITEMS.find(i => i.id === 'recit_manon'),
      lockhartPrereq: getQuestTemplate('memoire_lockhart').prereq === 'manon_confier'
    };
  });
  console.log('  T1:', t1);
  assert(t1.allQuests,     'tous les templates suivi 2 doivent exister');
  assert(t1.wand,          'baguette_if_boucle doit exister (wand epic)');
  assert(t1.recit,         'recit_manon doit exister');
  assert(t1.lockhartPrereq,'memoire_lockhart doit avoir prereq manon_confier');

  // T2 : Ollivander — fouille ×4 → baguette épique remise.
  const t2 = await page.evaluate(() => {
    completedQuests.delete('bois_ollivander_boucle');
    availableQuests.add('bois_ollivander_boucle');
    activeQuests = activeQuests.filter(q => q.id !== 'bois_ollivander_boucle');
    currentFloor = 13;
    const accepted = acceptQuest('bois_ollivander_boucle');
    const q = activeQuests.find(x => x.id === 'bois_ollivander_boucle');
    const amount = q ? q.objectives[0].amount : -1;
    for (let i = 0; i < amount; i++) checkSearchQuests();
    const turned = turnInQuestById('bois_ollivander_boucle');
    const hasWand = player.inventory.some(i => i.id === 'baguette_if_boucle');
    return { accepted, amount, turned, hasWand };
  });
  console.log('  T2:', t2);
  assert(t2.accepted, 'bois_ollivander_boucle doit être acceptable en Boucle');
  assert(t2.turned,   'la quête de fouille doit être remettable après 4 fouilles');
  assert(t2.hasWand,  'la remise doit donner la baguette d\'If des Profondeurs');

  // T3 : chaîne Manon → Lockhart (rédemption) avec prereq + consommation.
  const t3 = await page.evaluate(() => {
    ['manon_confier', 'memoire_lockhart'].forEach(id => {
      completedQuests.delete(id);
      activeQuests = activeQuests.filter(q => q.id !== id);
    });
    availableQuests.add('manon_confier');
    currentFloor = 13;
    // Lockhart bloqué tant que manon_confier non rendue (prereq).
    const lockhartGatedBefore = isQuestOfferable('memoire_lockhart');   // false attendu
    // Manon : fouille ×3 → reçoit le récit.
    acceptQuest('manon_confier');
    const mq = activeQuests.find(x => x.id === 'manon_confier');
    for (let i = 0; i < mq.objectives[0].amount; i++) checkSearchQuests();
    turnInQuestById('manon_confier');
    const hasRecit = player.inventory.some(i => i.id === 'recit_manon');
    const lockhartOfferAfter = isQuestOfferable('memoire_lockhart');    // true attendu
    // Lockhart : remet le récit → reçoit le livre, récit consommé.
    acceptQuest('memoire_lockhart');
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const lq = activeQuests.find(x => x.id === 'memoire_lockhart');
    const ready = lq && lq.objectives.every(o => o.completed);
    const turned = turnInQuestById('memoire_lockhart');
    const recitLeft = player.inventory.some(i => i.id === 'recit_manon');
    const hasBook = player.inventory.some(i => i.id === 'livre_lumos_solem');
    return { lockhartGatedBefore, hasRecit, lockhartOfferAfter, ready, turned, recitLeft, hasBook };
  });
  console.log('  T3:', t3);
  assert(t3.lockhartGatedBefore === false, 'memoire_lockhart ne doit PAS être offrable avant manon_confier');
  assert(t3.hasRecit,            'manon_confier doit donner le récit de Manon');
  assert(t3.lockhartOfferAfter,  'memoire_lockhart doit être offrable après manon_confier');
  assert(t3.ready,               'memoire_lockhart doit être prête avec le récit en poche');
  assert(t3.turned,              'memoire_lockhart doit être remettable');
  assert(!t3.recitLeft,          'la remise doit consommer le récit de Manon');
  assert(t3.hasBook,             'la remise doit donner le livre (Lumos Solem)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (quêtes Boucle suivi 2)`);
  }
  console.log('  ✅ Quêtes PNJ lore de la Boucle (suivi 2) OK');
  await browser.close();
}

// P6a — livraison inter-PNJ : « La lettre jamais envoyée » (Manon → Lupin)
// + « L'aconit de la meute » (Lupin, herbe en besace). Couvre la nouvelle
// mécanique grantOnAccept + remise gated par questsTurnedIn (≠ questsGiven).
async function scenarioDeliveryQuestLetter() {
  console.log('\n── Scénario : livraison inter-PNJ (lettre) + aconit (P6a) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Poufsouffle' });

  // T1 : gating par prereq — pas offrable avant le capstone Manon.
  const t1 = await page.evaluate(() => {
    availableQuests.add('lettre_jamais_envoyee');
    availableQuests.add('aconit_de_la_meute');
    currentFloor = 4;
    return {
      lettreGated: isQuestOfferable('lettre_jamais_envoyee'),   // false attendu
      aconitGated: isQuestOfferable('aconit_de_la_meute'),      // false attendu
      items: ['lettre_elara', 'potion_tue_loup'].every(id => ITEMS.some(i => i.id === id))
    };
  });
  console.log('  T1:', t1);
  assert(t1.lettreGated === false, 'lettre non offrable avant manon_clair_de_lune');
  assert(t1.aconitGated === false, 'aconit non offrable avant manon_pardon');
  assert(t1.items, 'les items P6a doivent exister');

  // T2 : sac PLEIN → l'acceptation de la livraison est refusée (grantOnAccept).
  const t2 = await page.evaluate(() => {
    completedQuests.add('manon_clair_de_lune');
    const savedInv = player.inventory;
    player.inventory = Array.from({ length: 16 }, () => ({ ...ITEMS.find(i => i.id === 'wand1') }));
    const refused = acceptQuest('lettre_jamais_envoyee');
    const notActive = !activeQuests.some(q => q.id === 'lettre_jamais_envoyee');
    player.inventory = savedInv;
    return { refused, notActive };
  });
  console.log('  T2:', t2);
  assert(t2.refused === false, 'sac plein → accept refusé');
  assert(t2.notActive,         'sac plein → quête non activée');

  // T3 : livraison — accept chez Manon (lettre au sac, objectif rempli
  // d'emblée), remise possible chez LUPIN seulement.
  const t3 = await page.evaluate(() => {
    const manon = getNpcById('manon');
    const lupin = getNpcById('lupin');
    const accepted = acceptQuest('lettre_jamais_envoyee');
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const hasLettre = player.inventory.some(i => i.id === 'lettre_elara');
    const q = activeQuests.find(x => x.id === 'lettre_jamais_envoyee');
    const objDone = !!q && q.objectives.every(o => o.completed);
    // Manon ne propose PAS la remise ; Lupin la propose.
    const turnKey = "turnInQuestById('lettre_jamais_envoyee')";
    const manonActs = _npcDialogActions(manon, getNpcQuestState(manon)).map(a => a.onClick).join('|');
    const lupinState = getNpcQuestState(lupin);
    const lupinActs = _npcDialogActions(lupin, lupinState).map(a => a.onClick).join('|');
    // dialoguesByQuest de Lupin résolu pour l'état ready.
    const readyQid = _currentQuestForState(lupin, 'ready');
    const turned = turnInQuestById('lettre_jamais_envoyee');
    const lettreLeft = player.inventory.some(i => i.id === 'lettre_elara');
    return {
      accepted, hasLettre, objDone,
      manonCanClose: manonActs.includes(turnKey),
      lupinState, lupinCanClose: lupinActs.includes(turnKey),
      readyQid, turned, lettreLeft
    };
  });
  console.log('  T3:', t3);
  assert(t3.accepted,   'lettre acceptable après le capstone');
  assert(t3.hasLettre,  'grantOnAccept doit mettre la lettre au sac');
  assert(t3.objDone,    'objectif rempli dès l\'accept (l\'épreuve est le trajet)');
  assert(!t3.manonCanClose, 'Manon ne doit PAS proposer la remise (livraison)');
  assert(t3.lupinState === 'ready', 'Lupin doit être en état ready');
  assert(t3.lupinCanClose,  'Lupin doit proposer la remise');
  assert(t3.readyQid === 'lettre_jamais_envoyee', 'dialogue ready de Lupin → la lettre');
  assert(t3.turned,         'la remise chez Lupin doit réussir');
  assert(!t3.lettreLeft,    'la lettre doit être consommée à la remise');

  // T4 : aconit — herbe comptée en besace, potion Tue-Loup à la remise.
  const t4 = await page.evaluate(() => {
    completedQuests.add('manon_pardon');
    const accepted = acceptQuest('aconit_de_la_meute');
    addHerb('herbe_aconit', 3);
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'aconit_de_la_meute');
    const ready = !!q && q.objectives.every(o => o.completed);
    const turned = turnInQuestById('aconit_de_la_meute');
    return {
      accepted, ready, turned,
      herbsLeft: (player.herbs && player.herbs.herbe_aconit) || 0,
      hasPotion: player.inventory.some(i => i.id === 'potion_tue_loup')
    };
  });
  console.log('  T4:', t4);
  assert(t4.accepted,        'aconit acceptable après manon_pardon');
  assert(t4.ready,           '3 aconits en besace → objectif rempli');
  assert(t4.turned,          'remise aconit OK');
  assert(t4.herbsLeft === 0, 'les 3 aconits doivent être consommés (besace)');
  assert(t4.hasPotion,       'la remise doit donner la potion Tue-Loup');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (livraison P6a)`);
  }
  console.log('  ✅ Livraison inter-PNJ + aconit OK');
  await browser.close();
}

// Suivi 3 — derniers PNJ lore + drop matériau sur les chasses + items récompense.
async function scenarioLoopNpcQuests3() {
  console.log('\n── Scénario : quêtes PNJ de la Boucle (suivi 3) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : templates + items récompense + keepRewardItem sur les chasses.
  const t1 = await page.evaluate(() => {
    const qids = ['chasse_magizoologiste_boucle', 'mimi_esprits', 'chasse_sans_tete_boucle',
                  'confection_guipure', 'chroniques_lockhart', 'manon_compagnie'];
    const iids = ['perle_mimi', 'cor_chasse', 'cape_soie_acromantule', 'plume_lockhart'];
    const king = QUEST_TEMPLATES.find(t => t.id === 'chasse_kingsley_boucle');
    return {
      allQuests: qids.every(id => QUEST_TEMPLATES.some(t => t.id === id)),
      allItems:  iids.every(id => ITEMS.some(i => i.id === id)),
      iconsNew:  iids.every(id => ITEM_ICON_NEW_REGISTRY[id]),
      kingKeep:  !!(king && king.keepRewardItem && king.reward.item === 'essence_tenebres')
    };
  });
  console.log('  T1:', t1);
  assert(t1.allQuests, 'tous les templates suivi 3 doivent exister');
  assert(t1.allItems,  'les 4 items récompense doivent exister');
  assert(t1.iconsNew,  'les 4 items doivent être dans ITEM_ICON_NEW_REGISTRY');
  assert(t1.kingKeep,  'chasse_kingsley_boucle doit porter keepRewardItem + item matériau');

  // T2 : keepRewardItem — la chasse rend bien le matériau après le tirage farming.
  const t2 = await page.evaluate(() => {
    completedQuests.delete('chasse_kingsley_boucle');
    availableQuests.add('chasse_kingsley_boucle');
    activeQuests = activeQuests.filter(q => q.id !== 'chasse_kingsley_boucle');
    currentFloor = 18;
    const accepted = acceptQuest('chasse_kingsley_boucle');
    const q = activeQuests.find(x => x.id === 'chasse_kingsley_boucle');
    return { accepted, rewardItem: q ? q.reward.item : null };
  });
  console.log('  T2:', t2);
  assert(t2.accepted, 'chasse_kingsley_boucle doit être acceptable en Boucle');
  assert(t2.rewardItem === 'essence_tenebres', 'la chasse doit conserver le drop matériau (keepRewardItem)');

  // T3 : Mimi — kill spectre_maudit ×2 → remise → perle_mimi en inventaire.
  const t3 = await page.evaluate(() => {
    completedQuests.delete('mimi_esprits');
    availableQuests.add('mimi_esprits');
    activeQuests = activeQuests.filter(q => q.id !== 'mimi_esprits');
    currentFloor = 12;
    const accepted = acceptQuest('mimi_esprits');
    const q = activeQuests.find(x => x.id === 'mimi_esprits');
    const need = q ? q.objectives[0].amount : -1;
    for (let i = 0; i < need; i++) checkKillQuests('spectre_maudit');
    const turned = turnInQuestById('mimi_esprits');
    const hasPearl = player.inventory.some(i => i.id === 'perle_mimi');
    return { accepted, need, turned, hasPearl };
  });
  console.log('  T3:', t3);
  assert(t3.accepted, 'mimi_esprits doit être acceptable en Boucle');
  assert(t3.turned,   'mimi_esprits doit être remettable après 2 kills');
  assert(t3.hasPearl, 'la remise Mimi doit donner la Perle de Larmes');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (quêtes Boucle suivi 3)`);
  }
  console.log('  ✅ Quêtes PNJ de la Boucle (suivi 3) OK');
  await browser.close();
}

// P2.5 — le journal marque les quêtes signature de Maison d'un chip dédié.
async function scenarioSignatureQuestBadge() {
  console.log('\n── Scénario : marquage des quêtes signature (P2.5) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : une quête signature injectée porte le chip « SIGNATURE ».
  const t1 = await page.evaluate(() => {
    const tpl  = QUEST_TEMPLATES.find(q => q.id === 'quest_signature_gryff');
    const inst = JSON.parse(JSON.stringify(tpl));
    inst.completed = false;
    activeQuests.push(inst);
    openQuestLog();
    const list = document.getElementById('quest-list');
    return {
      isSigFn:  typeof _isSignatureQuest === 'function',
      tplFlag:  !!(tpl && tpl.houseSignatureQuest),
      hasBadge: !!(list && list.innerHTML.includes('SIGNATURE')),
    };
  });
  console.log('  T1:', t1);
  assert(t1.isSigFn, '_isSignatureQuest non exposée');
  assert(t1.tplFlag, 'template signature sans flag houseSignatureQuest');
  assert(t1.hasBadge, 'chip SIGNATURE absent du journal pour une quête signature');

  // T2 (contrôle négatif) : sans quête signature, aucun chip.
  const t2 = await page.evaluate(() => {
    activeQuests = activeQuests.filter(q => q.id !== 'quest_signature_gryff');
    openQuestLog();
    const list = document.getElementById('quest-list');
    return { hasBadge: !!(list && list.innerHTML.includes('SIGNATURE')) };
  });
  console.log('  T2 (négatif):', t2);
  assert(!t2.hasBadge, 'le chip SIGNATURE ne doit pas apparaître sans quête signature');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (badge signature)`);
  }
  console.log('  ✅ Marquage des quêtes signature OK');
  await browser.close();
}

// ── Quête principale « La Descente » (fil d'Ariane — Lot 1 revue 2026-07) ──
// Chaîne descente_1→finale : auto-acceptée, épinglée 🧭 en tête du tracker,
// étapes floor auto-remises (autoTurnIn — jamais de retour PNJ), maillon
// suivant enchaîné automatiquement, finale close par le kill de Voldemort.
// Garde-fous : goDeeper jamais gaté par la chaîne ; no-op post-victoire.
async function scenarioMainQuestDescente() {
  console.log('\n── Scénario : quête principale « La Descente » (fil d\'Ariane) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const out = { threw: false };
    const chainActive = () => activeQuests.find(q => q.id && q.id.startsWith('descente_'));
    try {
      // T1 : amorçage — via checkFloorQuests(1) (couvre aussi la migration de save).
      activeQuests = activeQuests.filter(q => !q.id.startsWith('descente_'));
      ['descente_1', 'descente_2', 'descente_3', 'descente_finale']
        .forEach(id => completedQuests.delete(id));
      checkFloorQuests(1);
      const q1 = chainActive();
      out.step1Active  = !!q1 && q1.id === 'descente_1';
      out.step1IsMain  = !!(q1 && q1.main);
      out.step1Floor   = q1 && q1.objectives[0].type === 'floor' && q1.objectives[0].floor === 4;
      // T2 : tracker — quête principale épinglée avec le pictogramme 🧭.
      updateQuestTracker();
      const trackerHtml = document.getElementById('quest-tracker').innerHTML;
      out.trackerPinned = trackerHtml.indexOf('🧭') !== -1
        && trackerHtml.indexOf('La Descente I') !== -1;
      // T3 : franchir l'étage 4 → auto-remise de I + enchaînement sur II.
      currentFloor = 4; checkFloorQuests(4);
      out.step1Done   = completedQuests.has('descente_1');
      out.step2Active = !!activeQuests.find(q => q.id === 'descente_2');
      // T4 : rattrapage multi-étages (save avancé) — sauter à l'étage 10.
      currentFloor = 10; checkFloorQuests(10);
      out.step23Done   = completedQuests.has('descente_2') && completedQuests.has('descente_3');
      out.finaleActive = !!activeQuests.find(q => q.id === 'descente_finale');
      // T5 : kill Voldemort → la finale se remet toute seule.
      checkKillQuests('voldemort_revenu');
      out.finaleDone     = completedQuests.has('descente_finale');
      out.chainAllClear  = !chainActive();
      // T6 : post-victoire → la chaîne ne se ré-amorce jamais.
      victoryAchieved = true;
      checkFloorQuests(11);
      out.noRespawnPostVictory = !chainActive();
      victoryAchieved = false;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  Quête principale:', r);
  assert(!r.threw, 'Descente throw: ' + (r.err || ''));
  assert(r.step1Active && r.step1IsMain && r.step1Floor, 'descente_1 non amorcée/flaggée main');
  assert(r.trackerPinned, 'quête principale non épinglée 🧭 dans le tracker');
  assert(r.step1Done && r.step2Active, 'auto-remise étage 4 / enchaînement II en échec');
  assert(r.step23Done && r.finaleActive, 'rattrapage multi-étages (II+III) en échec');
  assert(r.finaleDone && r.chainAllClear, 'finale non close par le kill de Voldemort');
  assert(r.noRespawnPostVictory, 'la chaîne se ré-amorce post-victoire');
  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS pendant Descente'); }
  console.log('  ✅ Quête principale « La Descente » OK');
  await browser.close();
}

// ── Portraits-relais de Dumbledore (Lot 1 revue 2026-07, trou A1) ──
// 3 relais (ét. 4/7/10) partagent l'état de quête de Dumbledore : la chaîne
// d'épreuves et les Éclats se remettent au relais SANS remonter à l'étage 1.
async function scenarioDumbledoreRelais() {
  console.log('\n── Scénario : portraits-relais de Dumbledore (ét. 4/7/10) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const out = { threw: false };
    try {
      // T1 : les 3 relais existent au bon étage.
      out.relais = [4, 7, 10].map(f => {
        const npc = getNpcById(`dumbledore_relais_${f}`);
        return !!npc && npc.placement.floor === f
          && npc.questsTurnedIn.includes('dumbledore_eveil')
          && npc.questsTurnedIn.includes('eclats_clef_voute')
          && getNpcsForFloor(f).some(n => n.id === `dumbledore_relais_${f}`);
      });
      // T2 : remise au relais sans remonter — accepter dumbledore_eveil
      // (chaîne : intro_tutoriel remise d'abord), tuer la cible, vérifier
      // que le relais de l'étage 4 est « completable ».
      completedQuests.add('intro_tutoriel');
      acceptQuest('dumbledore_eveil');
      checkKillQuests('boggart');
      const relay = getNpcById('dumbledore_relais_4');
      out.relayState = getNpcQuestState(relay); // 'ready' = remettable ici
      // Remise effective via le flux PNJ standard.
      const before = completedQuests.has('dumbledore_eveil');
      turnInQuestById('dumbledore_eveil');
      out.turnedAtRelay = !before && completedQuests.has('dumbledore_eveil');
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  Relais:', r);
  assert(!r.threw, 'Relais throw: ' + (r.err || ''));
  assert(r.relais.every(Boolean), 'un relais manque ou est mal placé (4/7/10)');
  assert(r.relayState === 'ready', `relais ét.4 devrait être ready (got ${r.relayState})`);
  assert(r.turnedAtRelay, 'remise de dumbledore_eveil au relais en échec');
  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS pendant Relais'); }
  console.log('  ✅ Portraits-relais OK');
  await browser.close();
}

// ── Lot 3 (revue 2026-07-28 · E1) — verbes non combattants ─────
// Le catalogue penchait à 58 % d'objectifs `kill`. Ces scénarios
// couvrent les deux verbes AJOUTÉS au moteur (`discover`, `talk`) et
// la LIVRAISON inter-PNJ (mécanique préexistante, désormais utilisée).
async function scenarioDiscoverObjective() {
  console.log('\n── Scénario : objectif « discover » (atteindre un lieu) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — forme de l'étape + le hook ne compte QUE la bonne cellule.
  const t1 = await page.evaluate(() => {
    acceptQuest('sources_pomfresh');
    const q = activeQuests.find(x => x.id === 'sources_pomfresh');
    const st = q.objectives[0];
    checkDiscoverQuests(CELL.ALTAR, 1, 1);        // mauvais type → ignoré
    const afterWrong = st.progress;
    checkDiscoverQuests(CELL.FOUNTAIN, 2, 2);     // bon type → +1
    return { type: st.type, cell: st.cell, amount: st.amount, afterWrong, afterRight: st.progress };
  });
  console.log('  T1 étape :', t1);
  assert(t1.type === 'discover',   'étape 0 doit être de type discover');
  assert(t1.cell === 'FOUNTAIN',   'étape doit viser une FOUNTAIN');
  assert(t1.amount === 3,          'objectif attendu à 3 fontaines');
  assert(t1.afterWrong === 0,      'un ALTAR ne doit pas faire progresser une étape FOUNTAIN');
  assert(t1.afterRight === 1,      'une FOUNTAIN doit faire progresser l\'étape');

  // T2 — anti-farm : repasser sur LA MÊME case ne recompte pas.
  const t2 = await page.evaluate(() => {
    const st = activeQuests.find(x => x.id === 'sources_pomfresh').objectives[0];
    checkDiscoverQuests(CELL.FOUNTAIN, 2, 2);     // même case
    checkDiscoverQuests(CELL.FOUNTAIN, 2, 2);
    const afterSame = st.progress;
    checkDiscoverQuests(CELL.FOUNTAIN, 5, 5);     // case neuve
    checkDiscoverQuests(CELL.FOUNTAIN, 9, 3);     // 3e case → complet
    return { afterSame, progress: st.progress, completed: st.completed,
             auto: completedQuests.has('sources_pomfresh') };
  });
  console.log('  T2 anti-farm :', t2);
  assert(t2.afterSame === 1,  'repasser sur la même fontaine ne doit pas recompter');
  assert(t2.progress === 3,   'trois fontaines distinctes attendues');
  assert(t2.completed,        'étape doit être complétée au seuil');
  assert(!t2.auto,            'la quête ne doit PAS se remettre toute seule (retour au donneur)');

  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS pendant discover'); }
  console.log('  ✅ objectif « discover » OK (typage, anti-farm, pas d\'auto-remise)');
  await browser.close();
}

async function scenarioTalkObjective() {
  console.log('\n── Scénario : objectif « talk » (consulter des PNJ) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const t1 = await page.evaluate(() => {
    acceptQuest('conseil_mcgonagall');
    const st = activeQuests.find(x => x.id === 'conseil_mcgonagall').objectives[0];
    checkTalkQuests('hagrid');        // hors liste → ignoré
    const offList = st.progress;
    checkTalkQuests('rogue');
    checkTalkQuests('rogue');         // doublon → ignoré
    const afterDup = st.progress;
    checkTalkQuests('sprout');
    checkTalkQuests('flitwick');      // 3e → complet
    return { type: st.type, ids: st.npcIds, offList, afterDup,
             progress: st.progress, completed: st.completed,
             auto: completedQuests.has('conseil_mcgonagall') };
  });
  console.log('  T1 talk :', t1);
  assert(t1.type === 'talk',        'étape 0 doit être de type talk');
  assert(t1.ids.length === 3,       'trois PNJ attendus dans npcIds');
  assert(t1.offList === 0,          'un PNJ hors liste ne doit pas compter');
  assert(t1.afterDup === 1,         'reparler au même PNJ ne doit pas recompter');
  assert(t1.progress === 3,         'trois PNJ distincts attendus');
  assert(t1.completed,              'étape doit être complétée au seuil');
  assert(!t1.auto,                  'la quête ne doit PAS se remettre toute seule');

  // T2 — le hook est bien branché sur l'ouverture de dialogue réelle.
  const t2 = await page.evaluate(() => {
    acceptQuest('enquete_mimi');
    const st = activeQuests.find(x => x.id === 'enquete_mimi').objectives[0];
    openNpcDialog('chevalier_godric');
    if (typeof closeNpcDialog === 'function') closeNpcDialog();
    return { progress: st.progress, seen: (st._seen || []).slice() };
  });
  console.log('  T2 via dialogue :', t2);
  assert(t2.progress === 1,                          'openNpcDialog doit faire progresser l\'étape talk');
  assert(t2.seen.indexOf('chevalier_godric') !== -1, 'le PNJ consulté doit être mémorisé');

  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS pendant talk'); }
  console.log('  ✅ objectif « talk » OK (liste, doublons, hook dialogue)');
  await browser.close();
}

async function scenarioDeliveryQuestsWired() {
  console.log('\n── Scénario : livraisons inter-PNJ (donneur ≠ destinataire) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const r = await page.evaluate(() => {
    const CASES = [
      { id: 'tue_loup_lupin', giver: 'pomfresh',   to: 'lupin',   item: 'potion_tue_loup' },
      { id: 'braise_hagrid',  giver: 'slughorn',   to: 'hagrid',  item: 'essence_chaleur' },
      { id: 'givre_guipure',  giver: 'ollivander', to: 'guipure', item: 'cristal_givre' },
    ];
    return CASES.map((c) => {
      const g = getNpcById(c.giver), t = getNpcById(c.to);
      const tpl = getQuestTemplate(c.id);
      return {
        id: c.id,
        tpl:          !!tpl,
        grants:       tpl && tpl.grantOnAccept === c.item,
        givenByGiver: !!g && (g.questsGiven || []).indexOf(c.id) !== -1,
        // le cœur de la livraison : le donneur ne clôt PAS, le destinataire oui
        notClosedByGiver: !!g && (g.questsTurnedIn || []).indexOf(c.id) === -1,
        closedByTarget:   !!t && (t.questsTurnedIn || []).indexOf(c.id) !== -1,
      };
    });
  });
  r.forEach((c) => console.log('  ', c));
  for (const c of r) {
    assert(c.tpl,              `template ${c.id} absent`);
    assert(c.grants,           `${c.id} doit remettre son objet à l'acceptation`);
    assert(c.givenByGiver,     `${c.id} doit figurer dans questsGiven du donneur`);
    assert(c.notClosedByGiver, `${c.id} ne doit PAS être clos par son donneur (sinon ce n'est pas une livraison)`);
    assert(c.closedByTarget,   `${c.id} doit être clos par le destinataire`);
  }

  // Le donneur reste en 'active' tant que la remise se fait ailleurs.
  const st = await page.evaluate(() => {
    acceptQuest('tue_loup_lupin');
    return { giver: getNpcQuestState(getNpcById('pomfresh')),
             target: getNpcQuestState(getNpcById('lupin')) };
  });
  console.log('  états PNJ :', st);
  assert(st.giver !== 'ready', 'le donneur ne doit jamais être « ready » pour une livraison');

  if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS pendant livraisons'); }
  console.log('  ✅ livraisons inter-PNJ câblées (3 quêtes)');
  await browser.close();
}

module.exports = { scenarios: [scenarioDiscoverObjective, scenarioTalkObjective, scenarioDeliveryQuestsWired, scenarioChainedQuest, scenarioHeadlessHunt, scenarioChainAndRepeatable, scenarioRepeatableQuestSpawn, scenarioEnsureKillTargets, scenarioEnsureStairs, scenarioIteration74, scenarioFarmingQuests, scenarioDelayedSearch, scenarioCleVoute, scenarioQuestFanfare, scenarioLoopNpcQuests, scenarioLoopNpcQuests2, scenarioLoopNpcQuests3, scenarioSignatureQuestBadge, scenarioDeliveryQuestLetter, scenarioMainQuestDescente, scenarioDumbledoreRelais] };
