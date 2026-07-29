// ============================================================
// Scénarios smoke — domaine « npc » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

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

  // T1 : registre + helpers exposés. Les comptes d'étage dépendent de la
  // Maison (donneurs de signature gatés `houseGate` — Chevalier Fantôme à
  // l'ét. 2 pour Gryffondor, Écho de Salazar à l'ét. 4 pour Serpentard).
  const t1 = await page.evaluate(() => {
    const counts = (house) => {
      const prev = chosenHouse; chosenHouse = house;
      const f2 = getNpcsForFloor(2), f4 = getNpcsForFloor(4);
      const r = {
        f1: getNpcsForFloor(1).length, f2: f2.length, f4: f4.length,
        chevAt2: f2.some(n => n.id === 'chevalier_godric'),
        echoAt4: f4.some(n => n.id === 'echo_salazar')
      };
      chosenHouse = prev; return r;
    };
    return {
      npcCount:        typeof NPCS !== 'undefined' ? NPCS.length : -1,
      hasGetById:      typeof getNpcById === 'function',
      hasGetForFloor:  typeof getNpcsForFloor === 'function',
      cellNpc:         CELL.NPC,
      dumbledore:      !!getNpcById('dumbledore'),
      gryff:           counts('Gryffondor'),
      slyth:           counts('Serpentard')
    };
  });
  console.log('  T1 registry:', t1);
  // 8 PNJ fixes + 2 vendeurs (it. 4) + 4 lore (it. 6) = 14 entrées minimum.
  assert(t1.npcCount >= 8,               `attendu ≥ 8 PNJ, trouvé ${t1.npcCount}`);
  assert(t1.hasGetById,                  'getNpcById absent');
  assert(t1.hasGetForFloor,              'getNpcsForFloor absent');
  assert(t1.cellNpc === 8,               'CELL.NPC doit valoir 8');
  assert(t1.dumbledore,                  'PNJ Dumbledore introuvable');
  assert(t1.gryff.f1 === 1,              'étage 1 doit avoir 1 PNJ (Dumbledore)');
  // Base ét. 2 : Pomfresh, Mimi, Scamander, Slughorn = 4 ; +1 Chevalier (🦁).
  assert(t1.gryff.f2 === 5,             'étage 2 (Gryffondor) doit avoir 5 PNJ (4 + Chevalier Fantôme)');
  assert(t1.gryff.chevAt2,              'Chevalier Fantôme doit apparaître à l\'ét. 2 pour Gryffondor');
  assert(t1.slyth.f2 === 4,             'étage 2 (Serpentard) doit avoir 4 PNJ (Chevalier gaté absent)');
  assert(!t1.slyth.chevAt2,             'Chevalier Fantôme ne doit PAS apparaître hors Gryffondor');
  // Base ét. 4 : Lupin, Hagrid, Rogue + Portrait-relais de Dumbledore
  // (dumbledore_relais_4, Lot 1 revue 2026-07) = 4 ; +1 Écho de Salazar (🐍)
  // pour Serpentard.
  assert(t1.gryff.f4 === 4,             'étage 4 (Gryffondor) doit avoir 4 PNJ (Écho gaté absent)');
  assert(!t1.gryff.echoAt4,             'Écho de Salazar ne doit PAS apparaître hors Serpentard');
  assert(t1.slyth.f4 === 5,             'étage 4 (Serpentard) doit avoir 5 PNJ (4 + Écho de Salazar)');
  assert(t1.slyth.echoAt4,              'Écho de Salazar doit apparaître à l\'ét. 4 pour Serpentard');

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
  // On ISOLE Pomfresh sur la seule quête sous test : `getNpcQuestState`
  // rend 'offer' dès qu'un PNJ a AUTRE CHOSE à proposer, si bien que
  // l'état terminal 'done' n'est observable que si son carnet est vide
  // par ailleurs. Sans cette isolation, le test cesserait de couvrir
  // l'état 'done' au premier ajout de quête à ce PNJ — ce qui s'est
  // produit au lot 3 (revue 2026-07-28).
  const t3 = await page.evaluate(() => {
    const npc = getNpcById('pomfresh');
    for (const qid of (npc.questsGiven || [])) {
      if (qid !== 'mandragore_pomfresh') availableQuests.delete(qid);
    }
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
    const overlayPosition = getComputedStyle(overlay).position;
    const portraitSrc = img ? img.getAttribute('src') : null;
    closeNpcDialog();
    const closed = overlay.style.display;
    const seen = seenNpcs.has('dumbledore');
    return { opened, closed, seen, hasImg: !!img, portraitSrc, overlayPosition };
  });
  console.log('  T4 overlay:', t4);
  assert(t4.opened === 'flex',           'overlay non ouvert');
  assert(t4.closed === 'none',           'overlay non fermé');
  assert(t4.overlayPosition === 'fixed', `overlay dialogue doit être fixed plein écran (got ${t4.overlayPosition})`);
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

  // T6 : découpage automatique des pages de dialogue trop longues.
  // Manon a des pages > 280 caractères → scindées en sous-pages aux
  // frontières de phrase, sans perte de texte, srcPages calé sur les
  // pages d'origine (mapping voix).
  const t6 = await page.evaluate(() => {
    const manon    = NPCS.find(n => n.id === 'manon');
    const authored = manon.dialogues.greeting;
    seenNpcs.delete('manon');
    openNpcDialog('manon');
    const { pages, srcPages } = _dialogState;
    const rebuilt = [];
    pages.forEach((p, i) => {
      rebuilt[srcPages[i]] = (rebuilt[srcPages[i]] ? rebuilt[srcPages[i]] + ' ' : '') + p;
    });
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    closeNpcDialog();
    return {
      authoredCount: authored.length,
      pageCount:     pages.length,
      srcLen:        srcPages.length,
      srcMonotone:   srcPages.every((v, i) => i === 0 || v >= srcPages[i - 1]),
      maxLen:        Math.max(...pages.map(p => p.length)),
      lossless:      authored.every((a, i) => norm(rebuilt[i]) === norm(a)),
      hadLongPage:   authored.some(a => a.length > 280)
    };
  });
  console.log('  T6 découpage pages longues:', t6);
  assert(t6.hadLongPage,                    'fixture manon doit contenir une page > 280');
  assert(t6.pageCount > t6.authoredCount,   'une page longue doit être scindée en sous-pages');
  assert(t6.srcLen === t6.pageCount,        'srcPages doit être parallèle à pages');
  assert(t6.srcMonotone,                    'srcPages doit rester croissant (ordre préservé)');
  assert(t6.lossless,                       'le découpage ne doit perdre aucun texte');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ intégration PNJ conforme');
  await browser.close();
}

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
      poolFloor3HasMundungus: getRandomVendorsForFloor(3).some(n => n.id === 'mundungus'),
      // Apothicaire des Reliques (P3.3) — vendeur ambulant de formes mid-game.
      apothExists:           !!getNpcById('apothicaire_reliques'),
      apothIsRandom:         getNpcById('apothicaire_reliques')?.random === true,
      apothPortrait:         !!getNpcById('apothicaire_reliques')?.portraitImg,
      apothWaresLen:         getNpcById('apothicaire_reliques')?.wares?.length || -1,
      poolFloor6HasApoth:    getRandomVendorsForFloor(6).some(n => n.id === 'apothicaire_reliques'),
      poolFloor1NoApoth:     getRandomVendorsForFloor(1).every(n => n.id !== 'apothicaire_reliques')
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
  assert(t1.apothExists,            'PNJ apothicaire_reliques introuvable');
  assert(t1.apothIsRandom,          'apothicaire_reliques doit avoir random=true');
  assert(t1.apothPortrait,          'apothicaire_reliques doit avoir un portraitImg');
  assert(t1.apothWaresLen >= 5,     'apothicaire_reliques doit avoir au moins 5 articles');
  assert(t1.poolFloor6HasApoth,     'apothicaire_reliques doit être éligible étage 6');
  assert(t1.poolFloor1NoApoth,      'apothicaire_reliques ne doit pas apparaître étage 1');

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
    // L'idle vient bien du pool idleRandom : on s'appuie sur idleIndex (>=0)
    // plutôt que sur une comparaison de chaîne — les longues répliques sont
    // paginées (_splitDialogPage), donc pages[0] ne reproduit pas forcément
    // l'entrée complète. On vérifie l'index ET que la 1re page en est le préfixe.
    const idleIdx = _dialogState.idleIndex;
    const inIdlePool = idleIdx >= 0
      && Array.isArray(sn.dialogues.idleRandom)
      && typeof sn.dialogues.idleRandom[idleIdx] === 'string'
      && sn.dialogues.idleRandom[idleIdx].startsWith(idleText);
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

async function scenarioKaraokeIntro() {
  console.log('\n── Scénario : sous-titres karaoké (intro) ──');
  const { browser, page, errors } = await launchGame();

  // Aller jusqu'à l'écran d'intro Dumbledore sans le terminer.
  await page.evaluate(() => {
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
  });
  await page.waitForFunction(() =>
    document.getElementById('intro-screen') &&
    document.getElementById('intro-screen').style.display === 'flex',
    { timeout: 3000 });

  // T1 : le texte de la page d'intro est enveloppé en <span class="kw">
  const t1 = await page.evaluate(() => {
    const pageEl = document.querySelector('#intro-text .intro-page-text');
    const kw = pageEl ? pageEl.querySelectorAll('.kw') : [];
    return { hasPageEl: !!pageEl, kwCount: kw.length };
  });
  console.log('  T1 wrapping:', t1);
  assert(t1.hasPageEl, '.intro-page-text introuvable');
  assert(t1.kwCount >= 5, `attendu ≥5 spans .kw, obtenu ${t1.kwCount}`);

  // T2 : progression déterministe — getVoiceProgress mocké
  const t2 = await page.evaluate(async () => {
    const pageEl = document.querySelector('#intro-text .intro-page-text');
    AudioSystem.getVoiceProgress = () => 0.5;        // mi-parcours
    Karaoke.wrap(pageEl);
    const n = pageEl.querySelectorAll('.kw').length;
    Karaoke.start(pageEl);
    await new Promise(r => setTimeout(r, 160));
    const mid = pageEl.querySelectorAll('.kw.spoken').length;
    AudioSystem.getVoiceProgress = () => -1;         // voix terminée
    await new Promise(r => setTimeout(r, 160));
    const end = pageEl.querySelectorAll('.kw.spoken').length;
    return { n, mid, end };
  });
  console.log('  T2 progression:', t2);
  assert(t2.mid > 0 && t2.mid < t2.n,
    `à 50% attendu un surlignage partiel, obtenu ${t2.mid}/${t2.n}`);
  assert(t2.end === t2.n,
    `à la fin tous les mots surlignés, obtenu ${t2.end}/${t2.n}`);

  // T3 : voix jamais lancée (muet / sample absent) → texte neutre
  const t3 = await page.evaluate(async () => {
    const pageEl = document.querySelector('#intro-text .intro-page-text');
    AudioSystem.getVoiceProgress = () => -1;
    Karaoke.wrap(pageEl);
    Karaoke.start(pageEl);
    await new Promise(r => setTimeout(r, 160));
    return { spoken: pageEl.querySelectorAll('.kw.spoken').length };
  });
  console.log('  T3 voix absente:', t3);
  assert(t3.spoken === 0,
    `voix absente : aucun mot surligné attendu, obtenu ${t3.spoken}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant karaoké intro`);
  }
  console.log('  ✅ Sous-titres karaoké OK');
  await browser.close();
}

async function scenarioKaraokeNpc() {
  console.log('\n── Scénario : karaoké dialogues PNJ ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : ouvrir un dialogue PNJ → texte enveloppé en <span class="kw">
  const t1 = await page.evaluate(() => {
    openNpcDialog('mcgonagall');
    const pageEl = document.querySelector('#npc-dialog-text .npc-dialog-page');
    const kw = pageEl ? pageEl.querySelectorAll('.kw') : [];
    return { hasPageEl: !!pageEl, kwCount: kw.length };
  });
  console.log('  T1 wrapping PNJ:', t1);
  assert(t1.hasPageEl, '.npc-dialog-page introuvable');
  assert(t1.kwCount >= 3, `attendu ≥3 spans .kw, obtenu ${t1.kwCount}`);

  // T2 : progression déterministe — getVoiceProgress mocké à mi-parcours
  const t2 = await page.evaluate(async () => {
    const pageEl = document.querySelector('#npc-dialog-text .npc-dialog-page');
    AudioSystem.getVoiceProgress = () => 0.5;
    Karaoke.wrap(pageEl);
    const n = pageEl.querySelectorAll('.kw').length;
    Karaoke.start(pageEl);
    await new Promise(r => setTimeout(r, 160));
    return { n, mid: pageEl.querySelectorAll('.kw.spoken').length };
  });
  console.log('  T2 progression PNJ:', t2);
  assert(t2.mid > 0 && t2.mid < t2.n,
    `à 50% attendu un surlignage partiel, obtenu ${t2.mid}/${t2.n}`);

  // T3 : fermer le dialogue stoppe la boucle karaoké
  const t3 = await page.evaluate(() => {
    closeNpcDialog();
    return { timerCleared: Karaoke._timer === null };
  });
  console.log('  T3 close → stop:', t3);
  assert(t3.timerCleared, 'closeNpcDialog doit stopper la boucle karaoké');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant karaoké PNJ`);
  }
  console.log('  ✅ Karaoké dialogues PNJ OK');
  await browser.close();
}

async function scenarioHelpTour() {
  console.log('\n── Scénario Help Tour : tour guidé d\'aide ──');
  const { browser, page, errors } = await launchGame();

  // Lève l'opt-out posé par launchGame pour que le tour s'auto-affiche.
  await page.evaluate(() => {
    try { localStorage.removeItem('hh_help_tour_optout'); } catch (e) { /* noop */ }
  });
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : le tour s'affiche automatiquement au démarrage (étape 1).
  const t1 = await page.evaluate(() => {
    const ov = document.getElementById('help-tour-overlay');
    return {
      overlay:   !!ov && ov.style.display === 'block',
      active:    window._helpTourActive === true,
      count:     document.getElementById('help-tour-step-count')?.textContent,
      title:     document.getElementById('help-tour-title')?.textContent,
      total:     typeof HELP_TOUR_STEPS !== 'undefined' && HELP_TOUR_STEPS.length,
      prevDis:   document.getElementById('help-tour-prev')?.disabled
    };
  });
  console.log('  T1 auto-affichage →', t1);
  assert(t1.overlay,  'overlay du tour absent au démarrage');
  assert(t1.active,   '_helpTourActive doit être true');
  assert(t1.total >= 10, 'HELP_TOUR_STEPS trop court');
  assert(t1.count === 'Étape 1 / ' + t1.total, 'compteur d\'étape incorrect');
  assert(t1.prevDis === true, 'bouton Précédent doit être désactivé en étape 1');

  // T2 : helpTourNext avance et affiche le spotlight sur une vraie cible.
  const t2 = await page.evaluate(() => {
    helpTourNext();
    const spot = document.getElementById('help-tour-spotlight');
    return {
      count:     document.getElementById('help-tour-step-count')?.textContent,
      spotShown: spot && spot.style.display === 'block',
      spotW:     spot && parseFloat(spot.style.width)
    };
  });
  console.log('  T2 étape suivante + spotlight →', t2);
  assert(/Étape 2 \//.test(t2.count), 'helpTourNext n\'a pas avancé');
  assert(t2.spotShown, 'spotlight doit être visible sur une étape ciblée');
  assert(t2.spotW > 0, 'spotlight doit avoir une largeur');

  // T3 : navigation jusqu'à la dernière étape → bouton "Terminer".
  const t3 = await page.evaluate(() => {
    while (document.getElementById('help-tour-next').textContent.indexOf('Terminer') === -1) {
      helpTourNext();
    }
    return {
      count: document.getElementById('help-tour-step-count')?.textContent,
      next:  document.getElementById('help-tour-next').textContent
    };
  });
  console.log('  T3 dernière étape →', t3);
  assert(/Terminer/.test(t3.next), 'dernière étape doit afficher "Terminer"');

  // T4 : Terminer ferme le tour (overlay retiré du DOM).
  const t4 = await page.evaluate(() => {
    helpTourNext();   // depuis la dernière étape → helpTourEnd()
    return {
      overlay: !!document.getElementById('help-tour-overlay'),
      active:  window._helpTourActive === true
    };
  });
  console.log('  T4 fermeture →', t4);
  assert(t4.overlay === false, 'overlay doit être retiré du DOM après Terminer');
  assert(t4.active === false,  '_helpTourActive doit repasser à false');

  // T5 : startHelpTour relance le tour à la demande.
  const t5 = await page.evaluate(() => {
    startHelpTour();
    return {
      overlay: !!document.getElementById('help-tour-overlay'),
      count:   document.getElementById('help-tour-step-count')?.textContent
    };
  });
  console.log('  T5 relance manuelle →', t5);
  assert(t5.overlay, 'startHelpTour doit recréer l\'overlay');
  assert(/Étape 1 \//.test(t5.count), 'relance doit repartir de l\'étape 1');

  // T6 : la case opt-out persiste le choix et bloque l'auto-affichage.
  const t6 = await page.evaluate(() => {
    const cb = document.getElementById('help-tour-optout-cb');
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const stored = localStorage.getItem('hh_help_tour_optout');
    helpTourEnd();
    // maybeAutoStartHelpTour ne doit rien faire avec l'opt-out actif.
    maybeAutoStartHelpTour();
    return {
      stored,
      overlayAfter: !!document.getElementById('help-tour-overlay')
    };
  });
  console.log('  T6 opt-out →', t6);
  assert(t6.stored === '1', 'opt-out non persisté en localStorage');
  assert(t6.overlayAfter === false,
         'maybeAutoStartHelpTour ne doit pas afficher le tour avec opt-out actif');

  // T7 : le bouton "Aide" de la barre de commandes ouvre le menu (LOT D4).
  const t7 = await page.evaluate(() => {
    helpTourEnd();
    const btn = document.querySelector('button[onclick="openHelpMenu()"]');
    return { exists: !!btn, hasMenu: typeof openHelpMenu === 'function' };
  });
  console.log('  T7 bouton Aide →', t7);
  assert(t7.exists,  'bouton « Aide » doit appeler openHelpMenu()');
  assert(t7.hasMenu, 'openHelpMenu doit être exposé');

  // T8 : narration McGonagall — bouton voix, bascule persistée,
  //      OGG enregistrés, lecture sans exception.
  const t8 = await page.evaluate(() => {
    try { localStorage.removeItem('hh_help_tour_voice'); } catch (e) { /* noop */ }
    startHelpTour();   // relance propre
    const btn = document.getElementById('help-tour-voice');
    const defaultOn  = _htVoiceEnabled();
    const defaultGlyph = btn && btn.textContent;
    // _htSpeakStep ne doit pas lever d'exception (playVoice gère les
    // échecs de chargement OGG silencieusement).
    let speakThrew = false;
    try { _htSpeakStep(); } catch (e) { speakThrew = true; }
    // Toutes les clés de narration doivent être enregistrées.
    const samples = AudioSystem._VOICE_SAMPLES || {};
    const total = (typeof HELP_TOUR_STEPS !== 'undefined') ? HELP_TOUR_STEPS.length : 0;
    let allKeys = true, sampleUrl = '';
    for (let i = 1; i <= total; i++) {
      const k = 'mcgonagall_help_' + i;
      if (!samples[k]) { allKeys = false; break; }
      if (i === 1) sampleUrl = samples[k];
    }
    // Bascule OFF
    helpTourToggleVoice();
    const offStored = localStorage.getItem('hh_help_tour_voice');
    const offGlyph  = btn && btn.textContent;
    const offState  = _htVoiceEnabled();
    // Bascule ON de nouveau
    helpTourToggleVoice();
    const onStored = localStorage.getItem('hh_help_tour_voice');
    const onState  = _htVoiceEnabled();
    helpTourEnd();
    return {
      hasBtn: !!btn, defaultOn, defaultGlyph, speakThrew,
      offStored, offGlyph, offState, onStored, onState,
      allKeys, sampleUrl, total
    };
  });
  console.log('  T8 narration McGonagall →', t8);
  assert(t8.hasBtn,                 'bouton voix absent de la bulle');
  assert(t8.defaultOn === true,     'la voix doit être active par défaut');
  assert(t8.defaultGlyph === '🔊',  'glyphe voix par défaut incorrect');
  assert(t8.speakThrew === false,   '_htSpeakStep ne doit pas lever d\'exception');
  assert(t8.total >= 10,            'HELP_TOUR_STEPS trop court');
  assert(t8.allKeys,                'clés OGG mcgonagall_help_<n> manquantes dans _VOICE_SAMPLES');
  assert(/audio\/voice\/mcgonagall_help_1\.ogg$/.test(t8.sampleUrl),
         'URL OGG de narration incorrecte');
  assert(t8.offStored === '0' && t8.offState === false,
         'la coupure de voix doit être persistée (=0)');
  assert(t8.offGlyph === '🔇',      'glyphe voix coupée incorrect');
  assert(t8.onStored === '1' && t8.onState === true,
         'la réactivation de voix doit être persistée (=1)');

  // T9 : menu « Quelle aide ? » (LOT D4) — affichage + démarrage par section.
  const t9 = await page.evaluate(() => {
    helpTourEnd();
    openHelpMenu();
    const menu  = document.getElementById('help-menu-overlay');
    const items = document.querySelectorAll('#help-menu-list .help-menu-item');
    const menuShown = !!menu && menu.style.display === 'block';
    // 1 « Tout le guide » + N sections.
    const itemCount = items.length;
    const sectionCount = (typeof HELP_TOUR_SECTIONS !== 'undefined') ? HELP_TOUR_SECTIONS.length : 0;
    // Démarre la 1re section (index 0 = Explorer, start:1 end:4 → 3 étapes).
    const sec = HELP_TOUR_SECTIONS[0];
    helpMenuStart('0');
    const menuClosedAfter = !document.getElementById('help-menu-overlay');
    const expectedTitle = HELP_TOUR_STEPS[sec.start].title;
    const out = {
      menuShown, itemCount, sectionCount, menuClosedAfter,
      active:    window._helpTourActive === true,
      count:     document.getElementById('help-tour-step-count')?.textContent,
      title:     document.getElementById('help-tour-title')?.textContent,
      expectedTitle,
      sliceLen:  sec.end - sec.start,
      sectionStart: sec.start,
      voiceOffset: _htVoiceOffset,
    };
    helpTourEnd();
    // « Tout le guide » relance le tour complet depuis l'étape 1.
    helpMenuStart('all');
    out.allCount = document.getElementById('help-tour-step-count')?.textContent;
    out.allTotal = HELP_TOUR_STEPS.length;
    helpTourEnd();
    return out;
  });
  console.log('  T9 menu sections →', t9);
  assert(t9.menuShown,                       'le menu « Quelle aide ? » doit s\'afficher');
  assert(t9.itemCount === t9.sectionCount + 2, 'menu = Tout le guide + N sections + Glossaire');
  assert(t9.menuClosedAfter,                 'le menu doit se fermer au lancement d\'une section');
  assert(t9.active,                          'la section doit lancer le tour');
  assert(t9.title === t9.expectedTitle,      'la section doit démarrer à sa 1re étape d\'origine');
  assert(t9.count === 'Étape 1 / ' + t9.sliceLen, 'compteur de section incorrect (slice)');
  assert(t9.voiceOffset === t9.sectionStart, 'voiceOffset doit valoir section.start');
  assert(t9.allCount === 'Étape 1 / ' + t9.allTotal, '« Tout le guide » doit couvrir toutes les étapes');

  // T10 (D3) : glossaire des mécaniques — bouton dans le menu + panneau statique.
  const t10 = await page.evaluate(() => {
    helpTourEnd();
    openHelpMenu();
    const glossBtn = document.querySelector('#help-menu-list .help-menu-item[data-section="glossary"]');
    helpMenuStart('glossary');
    const panel = document.getElementById('mech-gloss-overlay');
    const rows = panel ? panel.querySelectorAll('#help-menu-list .help-menu-item').length : 0;
    const menuClosed = !document.getElementById('help-menu-overlay');
    const notATour = window._helpTourActive !== true;
    closeMechanicsGlossary();
    const closed = !document.getElementById('mech-gloss-overlay');
    return { hasBtn: !!glossBtn, hasPanel: !!panel, rows, menuClosed, notATour, closed,
             total: (typeof MECHANICS_GLOSSARY !== 'undefined') ? MECHANICS_GLOSSARY.length : 0 };
  });
  console.log('  T10 glossaire →', t10);
  assert(t10.hasBtn,   'le menu doit proposer le bouton « Mécaniques »');
  assert(t10.hasPanel && t10.rows === t10.total && t10.rows >= 10,
         'le glossaire doit lister toutes ses entrées');
  assert(t10.menuClosed, 'ouvrir le glossaire ferme le menu d\'aide');
  assert(t10.notATour,   'le glossaire n\'est pas un tour spotlight');
  assert(t10.closed,     'le glossaire doit se fermer');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Help Tour OK (auto-affichage, navigation, spotlight, opt-out, relance, voix McGonagall)');
  await browser.close();
}

async function scenarioGrimoirePages() {
  console.log('\n── Scénario : pages du grimoire (Manon Acte II) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — sort Revelio + quêtes + pages bien définis.
  const t1 = await page.evaluate(() => {
    const spell = SPELLS.find(s => s.name === 'Revelio');
    const qRev  = getQuestTemplate('manon_revelio');
    const qGri  = getQuestTemplate('manon_grimoire');
    return {
      spellOk:   !!spell && spell.effect === 'reveal',
      revOk:     !!qRev && qRev.prereq === 'manon_pardon' && qRev.reward.spell === 'Revelio',
      griOk:     !!qGri && qGri.prereq === 'manon_revelio',
      pagesObj:  !!qGri && qGri.objectives[0].type === 'pages' && qGri.objectives[0].amount === 5,
      pageCount: (typeof GRIMOIRE_PAGES !== 'undefined') ? GRIMOIRE_PAGES.length : 0,
      floors:    (typeof PAGE_FLOORS !== 'undefined') ? PAGE_FLOORS.slice() : []
    };
  });
  console.log('  T1 data :', t1);
  assert(t1.spellOk,  'sort Revelio absent ou mauvais effet');
  assert(t1.revOk,    'manon_revelio mal défini (prereq/récompense)');
  assert(t1.griOk,    'manon_grimoire mal défini (prereq)');
  assert(t1.pagesObj, 'manon_grimoire doit avoir un objectif type pages ×5');
  assert(t1.pageCount === 5, `5 pages attendues, obtenu ${t1.pageCount}`);
  assert(JSON.stringify(t1.floors) === '[2,3,5,7,9]', 'étages porteurs attendus 2,3,5,7,9');

  // T2 — Revelio en combat : showMonsterCombatInfo({revealed}) force les 3 paliers.
  await startDummyFight(page, { hp: 50 });
  const t2 = await page.evaluate(() => {
    monsterKills = {};
    showMonsterCombatInfo(0, { revealed: true });
    const c = document.getElementById('monster-info-content');
    return {
      locked:   c.querySelectorAll('.mi-locked').length,
      hasStats: !!c.querySelector('.bestiary-stat-grid'),
      badge:    c.innerHTML.includes('Révélé par Revelio')
    };
  });
  console.log('  T2 combat :', t2);
  assert(t2.locked === 0,  'Revelio doit déverrouiller les 3 paliers (0 kill)');
  assert(t2.hasStats,      'stats doivent être révélées par Revelio');
  assert(t2.badge,         'badge « Révélé par Revelio » attendu');

  // T3 — placement de page : aucune sans quête, posée avec la quête active.
  const t3 = await page.evaluate(() => {
    inBattle = false;
    pagePlacements = new Map();
    generateDungeon(3);
    const withoutQuest = pagePlacements.has(3);
    acceptQuest('manon_grimoire');
    generateDungeon(3);
    const withQuest = pagePlacements.has(3);
    generateDungeon(4);            // étage non porteur
    return { withoutQuest, withQuest, floor4: pagePlacements.has(4) };
  });
  console.log('  T3 place :', t3);
  assert(!t3.withoutQuest, 'pas de page sans quête active');
  assert(t3.withQuest,     'page non posée alors que la quête est active');
  assert(!t3.floor4,       'aucune page sur un étage non porteur');

  // T4 — ramassage : révélation requise, puis collecte → besace + quête.
  const t4 = await page.evaluate(() => {
    generateDungeon(3);            // quête active → page posée
    currentFloor = 3;
    const [px, py] = pagePlacements.get(3).split(',').map(Number);
    playerX = px; playerY = py;
    revealedPages = new Set();
    player.grimoirePages = [];
    const collectedUnrevealed = _tryCollectPage();   // doit échouer
    revealedPages.add(3);
    const collected = _tryCollectPage();             // doit réussir
    const again     = _tryCollectPage();             // pas de doublon
    const q = activeQuests.find(x => x.id === 'manon_grimoire');
    return {
      collectedUnrevealed,
      collected, again,
      pages:   player.grimoirePages.slice(),
      qProg:   q && q.objectives[0].progress
    };
  });
  console.log('  T4 collect:', t4);
  assert(!t4.collectedUnrevealed, 'une page non révélée ne doit pas être ramassée');
  assert(t4.collected,            'la page révélée doit être ramassée');
  assert(!t4.again,               'une page déjà ramassée ne se reprend pas');
  assert(t4.pages.includes('page_grimoire_2'), 'page de l\'étage 3 attendue (page_grimoire_2)');
  assert(t4.qProg === 1,          'progression de quête attendue à 1');

  // T5 — 5 pages réunies → l'objectif pages se complète.
  const t5 = await page.evaluate(() => {
    player.grimoirePages = GRIMOIRE_PAGES.map(p => p.id);
    _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'manon_grimoire');
    return { prog: q.objectives[0].progress, done: q.objectives[0].completed };
  });
  console.log('  T5 quête  :', t5);
  assert(t5.prog === 5, 'progression attendue à 5');
  assert(t5.done,       'objectif pages doit être complété à 5 pages');

  // T6 — round-trip save : placements / révélations / besace conservés.
  const t6 = await page.evaluate(() => {
    pagePlacements = new Map([[3, '5,5'], [7, '8,8']]);
    revealedPages  = new Set([3]);
    player.grimoirePages = ['page_grimoire_2'];
    // JSON round-trip : reproduit le passage réel par localStorage
    // (sinon snap.party[0] reste une référence vive sur `player`).
    const snap = JSON.parse(JSON.stringify(_serializeState()));
    pagePlacements = new Map();
    revealedPages  = new Set();
    player.grimoirePages = [];
    _applyState(snap);
    return {
      placementsOk: pagePlacements.get(3) === '5,5' && pagePlacements.get(7) === '8,8',
      revealedOk:   (revealedPages instanceof Set) && revealedPages.has(3),
      pagesOk:      Array.isArray(player.grimoirePages)
                    && player.grimoirePages.includes('page_grimoire_2')
    };
  });
  console.log('  T6 save   :', t6);
  assert(t6.placementsOk, 'pagePlacements doit survivre au round-trip save');
  assert(t6.revealedOk,   'revealedPages doit rester un Set après _applyState');
  assert(t6.pagesOk,      'player.grimoirePages doit survivre au round-trip save');

  // T7 — indices fantômes : étage signalé tant qu'une page manque.
  const t7 = await page.evaluate(() => {
    completedQuests.add('manon_revelio');   // préambule rendu
    // manon_grimoire est actif (accepté en T3, restauré en T6).
    player.grimoirePages = [];
    const pendingFloor = _pendingPageHintFloor();
    const line         = _pageHintLine(pendingFloor);
    player.grimoirePages = GRIMOIRE_PAGES.map(p => p.id);
    const doneFloor    = _pendingPageHintFloor();
    completedQuests.delete('manon_revelio');
    player.grimoirePages = [];
    const noPreamble   = _pendingPageHintFloor();
    return {
      pendingFloor,
      lineHasFloor: typeof line === 'string' && line.includes(String(pendingFloor)),
      doneFloor, noPreamble
    };
  });
  console.log('  T7 indice :', t7);
  assert(t7.pendingFloor === 2,  'indice attendu sur l\'étage 2 (1re page non collectée)');
  assert(t7.lineHasFloor,        'la réplique d\'indice doit citer le numéro d\'étage');
  assert(t7.doneFloor === null,  'aucun indice une fois les 5 pages collectées');
  assert(t7.noPreamble === null, 'aucun indice sans le préambule manon_revelio rendu');

  // T8 — établi de fusion : 5 pages → grimoire reconstitué, quête remise.
  const t8 = await page.evaluate(() => {
    // Pose des données de pages résiduelles pour vérifier leur nettoyage.
    pagePlacements = new Map([[3, '5,5'], [9, '8,8']]);
    revealedPages  = new Set([3, 9]);
    player.grimoirePages = GRIMOIRE_PAGES.slice(0, 4).map(p => p.id);
    const readyAt4 = _grimoireFusionReady();
    player.grimoirePages = GRIMOIRE_PAGES.map(p => p.id);
    const readyAt5 = _grimoireFusionReady();
    openFusionModal();
    const modalShown = document.getElementById('fusion-modal').style.display === 'flex';
    fuseGrimoire();
    // Régression : sans nettoyage, une page revisitée serait re-ramassée.
    currentFloor = 3; playerX = 5; playerY = 5;
    revealedPages.add(3);                 // re-révèle au cas où
    const recollect = _tryCollectPage();  // doit échouer (données purgées)
    return {
      readyAt4, readyAt5, modalShown,
      questDone:    completedQuests.has('manon_grimoire'),
      questGone:    !activeQuests.some(q => q.id === 'manon_grimoire'),
      pagesEmptied: player.grimoirePages.length === 0,
      gotGrimoire:  player.inventory.some(i => i.id === 'livre_glacius_tempete'),
      modalClosed:  document.getElementById('fusion-modal').style.display === 'none',
      placementsCleared: pagePlacements.size === 0,
      recollect
    };
  });
  console.log('  T8 fusion :', t8);
  assert(!t8.readyAt4,    'la fusion ne doit pas être prête avec 4 pages');
  assert(t8.readyAt5,     'la fusion doit être prête avec 5 pages');
  assert(t8.modalShown,   'l\'établi de fusion ne s\'est pas affiché');
  assert(t8.questDone,    'manon_grimoire doit passer en complétée après fusion');
  assert(t8.questGone,    'manon_grimoire doit sortir des quêtes actives');
  assert(t8.pagesEmptied, 'la besace de pages doit être vidée après fusion');
  assert(t8.gotGrimoire,  'le grimoire livre_glacius_tempete doit être au sac');
  assert(t8.modalClosed,  'l\'établi doit se fermer après la fusion');
  assert(t8.placementsCleared, 'les placements de pages doivent être purgés du donjon après fusion');
  assert(!t8.recollect,   'une page ne doit plus être re-ramassable après la fusion');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (pages du grimoire)`);
  }
  console.log('  ✅ Pages du grimoire conformes');
  await browser.close();
}

async function scenarioGrimoireActe3() {
  console.log('\n── Scénario : feuillets clairs d\'Élara (Manon Acte III) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données : ACT3_PAGES (3 feuillets, étages 2/6/9), quête egg.
  const t1 = await page.evaluate(() => {
    const q = getQuestTemplate('manon_acte3');
    return {
      pageCount: (typeof ACT3_PAGES !== 'undefined') ? ACT3_PAGES.length : 0,
      floors:    (typeof ACT3_FLOORS !== 'undefined') ? ACT3_FLOORS.slice() : [],
      questOk:   !!q && q.prereq === 'manon_grimoire' && q.implicitAccept === true,
      objOk:     !!q && q.objectives[0].type === 'pages' && q.objectives[0].amount === 3,
      // Egg : la quête NE doit PAS être amorcée dans availableQuests.
      notSeeded: !availableQuests.has('manon_acte3')
    };
  });
  console.log('  T1 data :', t1);
  assert(t1.pageCount === 3, `3 feuillets attendus, obtenu ${t1.pageCount}`);
  assert(JSON.stringify(t1.floors) === '[2,6,9]', 'étages porteurs attendus 2,6,9');
  assert(t1.questOk, 'manon_acte3 mal défini (prereq/implicitAccept)');
  assert(t1.objOk,   'manon_acte3 doit avoir un objectif type pages ×3');
  assert(t1.notSeeded, 'manon_acte3 ne doit pas être amorcée dans availableQuests (egg)');

  // T2 — sélecteur de set + gate egg : null → ACT2 → ACT3 → null ;
  // manon_acte3 jamais offrable (aucun bouton « Accepter » chez Manon).
  const t2 = await page.evaluate(() => {
    activeQuests = []; completedQuests = new Set(); availableQuests = new Set();
    const none = _activePageSet();
    acceptQuest('manon_grimoire');
    const act2 = _activePageSet();
    activeQuests = []; completedQuests = new Set(['manon_grimoire']);
    const act3 = _activePageSet();
    const offerable = (typeof isQuestOfferable === 'function')
      ? isQuestOfferable('manon_acte3') : null;
    completedQuests.add('manon_acte3');
    const after = _activePageSet();
    return {
      none:  none === null,
      act2:  !!act2 && act2.questId === 'manon_grimoire',
      act3:  !!act3 && act3.questId === 'manon_acte3' && act3.pages.length === 3,
      after: after === null,
      offerable
    };
  });
  console.log('  T2 gate :', t2);
  assert(t2.none,  '_activePageSet doit être null sans quête de pages');
  assert(t2.act2,  '_activePageSet doit renvoyer le set Acte II quand manon_grimoire actif');
  assert(t2.act3,  '_activePageSet doit renvoyer le set Acte III dès manon_grimoire fini');
  assert(t2.after, '_activePageSet doit redevenir null une fois manon_acte3 fini');
  assert(t2.offerable === false, 'manon_acte3 ne doit jamais être offrable (egg implicite)');

  // T3 — découverte → conversion : feuillet posé sous la gate, ramassé →
  // acceptQuest('manon_acte3') déclenché, progression à 1.
  const t3 = await page.evaluate(() => {
    inBattle = false;
    activeQuests = [];
    completedQuests = new Set(['manon_grimoire']);   // gate Acte III ouvert
    player.grimoirePages = [];
    pagePlacements = new Map();
    revealedPages  = new Set();
    generateDungeon(2);                              // étage porteur Acte III
    currentFloor = 2;
    const placed = pagePlacements.has(2);
    const [px, py] = pagePlacements.get(2).split(',').map(Number);
    playerX = px; playerY = py;
    const beforeAccept = activeQuests.some(q => q.id === 'manon_acte3');
    const collectedUnrevealed = _tryCollectPage();   // doit échouer (non révélé)
    revealedPages.add(2);
    const collected = _tryCollectPage();             // doit réussir + convertir
    const q = activeQuests.find(x => x.id === 'manon_acte3');
    return {
      placed, beforeAccept, collectedUnrevealed, collected,
      converted: !!q,
      prog: q && q.objectives[0].progress,
      owns: player.grimoirePages.includes('feuillet_clair_1')
    };
  });
  console.log('  T3 conv :', t3);
  assert(t3.placed,             'feuillet Acte III posé à l\'étage 2 sous la gate');
  assert(!t3.beforeAccept,      'manon_acte3 ne doit pas être active avant la découverte');
  assert(!t3.collectedUnrevealed,'un feuillet non révélé ne se ramasse pas');
  assert(t3.collected,          'le feuillet révélé doit être ramassé');
  assert(t3.converted,          'ramasser le 1er feuillet ouvre manon_acte3 (egg→quête)');
  assert(t3.prog === 1,         'progression de quête attendue à 1 après conversion');
  assert(t3.owns,               'feuillet_clair_1 attendu dans la besace');

  // T4 — collecte complète : 3 feuillets → objectif complété + établi prêt.
  const t4 = await page.evaluate(() => {
    player.grimoirePages = ACT3_PAGES.map(p => p.id);
    _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'manon_acte3');
    return { prog: q.objectives[0].progress, done: q.objectives[0].completed,
             ready: _grimoireFusionReady() };
  });
  console.log('  T4 collect:', t4);
  assert(t4.prog === 3, 'progression attendue à 3');
  assert(t4.done,       'objectif pages doit être complété à 3 feuillets');
  assert(t4.ready,      'l\'établi doit être prêt avec 3 feuillets');

  // T5 — remise : fuseAct3 → quête remise, Hiver Clair éveillé, pages
  // purgées, feuillet non re-ramassable (régression jumelle du bug §0).
  const t5 = await page.evaluate(() => {
    pagePlacements = new Map([[2, '5,5'], [9, '8,8']]);
    revealedPages  = new Set([2, 9]);
    player.grimoirePages = ACT3_PAGES.map(p => p.id);
    const hiverBefore = hiverClair;
    openFusionModal();
    const modalShown = document.getElementById('fusion-modal').style.display === 'flex';
    const btnAct3    = document.getElementById('fusion-body').innerHTML.includes('fuseAct3()');
    fuseAct3();
    currentFloor = 2; playerX = 5; playerY = 5; revealedPages.add(2);
    const recollect = _tryCollectPage();
    return {
      hiverBefore, modalShown, btnAct3,
      hiverAfter:   hiverClair,
      questDone:    completedQuests.has('manon_acte3'),
      questGone:    !activeQuests.some(q => q.id === 'manon_acte3'),
      pagesEmptied: player.grimoirePages.length === 0,
      placementsCleared: pagePlacements.size === 0,
      modalClosed:  document.getElementById('fusion-modal').style.display === 'none',
      recollect
    };
  });
  console.log('  T5 remise :', t5);
  assert(!t5.hiverBefore, 'Hiver Clair ne doit pas être éveillé avant la remise');
  assert(t5.modalShown,   'l\'établi de fusion ne s\'est pas affiché');
  assert(t5.btnAct3,      'le bouton de l\'établi doit appeler fuseAct3');
  assert(t5.hiverAfter,   'Hiver Clair doit être éveillé après la remise');
  assert(t5.questDone,    'manon_acte3 doit passer en complétée');
  assert(t5.questGone,    'manon_acte3 doit sortir des quêtes actives');
  assert(t5.pagesEmptied, 'la besace de feuillets doit être vidée après remise');
  assert(t5.placementsCleared, 'les placements doivent être purgés après remise');
  assert(t5.modalClosed,  'l\'établi doit se fermer après la remise');
  assert(!t5.recollect,   'un feuillet ne doit plus être re-ramassable après la remise');

  // T6 — passif Hiver Clair : +1 PM par pas hors combat (plafonné spMax).
  const t6 = await page.evaluate(() => {
    inBattle = false;
    generateDungeon(1);
    hiverClair = true;
    const c = party[0];
    c.hp = c.hpMax; c.spMax = 30; c.sp = 10;
    // Carve une case franchissable et oriente le héros vers elle.
    let dir = null;
    if (playerX + 1 < MAP_W) { dungeon[playerY][playerX + 1] = CELL.FLOOR; dir = 'e'; }
    else if (playerX - 1 >= 0) { dungeon[playerY][playerX - 1] = CELL.FLOOR; dir = 'w'; }
    playerDir = dir;
    const spBefore = c.sp;
    moveForward();
    const spAfterStep = party[0].sp;
    // Désactivé : pas de régénération.
    hiverClair = false;
    party[0].sp = 12;
    const spBeforeOff = party[0].sp;
    if (playerX + 1 < MAP_W) { dungeon[playerY][playerX + 1] = CELL.FLOOR; playerDir = 'e'; }
    else if (playerX - 1 >= 0) { dungeon[playerY][playerX - 1] = CELL.FLOOR; playerDir = 'w'; }
    moveForward();
    const spAfterOff = party[0].sp;
    hiverClair = true;
    return { spBefore, spAfterStep, spBeforeOff, spAfterOff };
  });
  console.log('  T6 passif :', t6);
  assert(t6.spAfterStep === t6.spBefore + 1, 'Hiver Clair doit régénérer +1 PM par pas');
  assert(t6.spAfterOff === t6.spBeforeOff,   'aucun PM régénéré quand Hiver Clair est éteint');

  // T7 — round-trip save : flag Hiver Clair + structures de pages conservés.
  const t7 = await page.evaluate(() => {
    hiverClair = true;
    pagePlacements = new Map([[2, '4,4']]);
    revealedPages  = new Set([2]);
    player.grimoirePages = ['feuillet_clair_2'];
    const snap = JSON.parse(JSON.stringify(_serializeState()));
    hiverClair = false;
    pagePlacements = new Map();
    revealedPages  = new Set();
    player.grimoirePages = [];
    _applyState(snap);
    return {
      hiverOk:      hiverClair === true,
      placementsOk: pagePlacements.get(2) === '4,4',
      pagesOk:      Array.isArray(player.grimoirePages)
                    && player.grimoirePages.includes('feuillet_clair_2')
    };
  });
  console.log('  T7 save   :', t7);
  assert(t7.hiverOk,      'le flag hiverClair doit survivre au round-trip save');
  assert(t7.placementsOk, 'pagePlacements doit survivre au round-trip save');
  assert(t7.pagesOk,      'player.grimoirePages doit survivre au round-trip save');

  // T8 — rumeurs des AUTRES PNJ lore (fantômes) : rumeur diffuse sous la
  // gate egg, exclusion de Manon, extinction une fois l'Acte III mordu/fini.
  const t8 = await page.evaluate(() => {
    // Gate egg : Acte II fini, Acte III pas encore accepté.
    activeQuests = []; completedQuests = new Set(['manon_grimoire']);
    const ghost = getNpcById('sir_nicolas');
    const eggRumor      = _npcAct3Rumor(ghost);
    const manonExcluded = _npcAct3Rumor(getNpcById('manon')); // Manon a la sienne
    // Une fois l'egg mordu (quête active) → plus de rumeur diffuse.
    acceptQuest('manon_acte3');
    const afterBite = _npcAct3Rumor(ghost);
    // Une fois l'Acte III remis → plus rien.
    activeQuests = []; completedQuests = new Set(['manon_grimoire', 'manon_acte3']);
    const afterDone = _npcAct3Rumor(ghost);
    return {
      eggRumor:      typeof eggRumor === 'string' && eggRumor.length > 0,
      manonExcluded: manonExcluded === null,
      afterBite:     afterBite === null,
      afterDone:     afterDone === null
    };
  });
  console.log('  T8 rumeurs:', t8);
  assert(t8.eggRumor,      'un fantôme lore doit lâcher une rumeur Acte III sous la gate egg');
  assert(t8.manonExcluded, 'Manon ne reçoit pas la rumeur générique (elle a la sienne)');
  assert(t8.afterBite,     'plus de rumeur diffuse une fois l\'Acte III accepté');
  assert(t8.afterDone,     'plus de rumeur diffuse une fois l\'Acte III remis');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (feuillets clairs Acte III)`);
  }
  console.log('  ✅ Feuillets clairs d\'Élara conformes');
  await browser.close();
}

async function scenarioDumbledoreLux() {
  console.log('\n── Scénario : Épreuve de la Lumière Éternelle ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données : quête, item, énigmes, boss, retrait boutique.
  const t1 = await page.evaluate(() => {
    const q    = getQuestTemplate('dumbledore_lumiere');
    const item = ITEMS.find(i => i.id === 'eclat_lumiere');
    const boss = MONSTERS.find(m => m.id === 'bibliothecaire_ombre');
    return {
      questOk:   !!q && q.prereq === 'anneau_dumbledore',
      objTypes:  q ? q.objectives.map(o => o.type).join(',') : '',
      reward:    q && q.reward.item,
      itemOk:    !!item && item.type === 'quest',
      riddleN:   (typeof RIDDLES_LUMIERE !== 'undefined') ? RIDDLES_LUMIERE.length : 0,
      bossOk:    !!boss && boss.weight === 0 && (boss.weak || []).includes('lumière'),
      shopHasLux: SHOP_CATALOG.some(e => e.id === 'livre_lux_aeterna')
    };
  });
  console.log('  T1 data :', t1);
  assert(t1.questOk,                       'dumbledore_lumiere mal défini (prereq)');
  assert(t1.objTypes === 'item,riddle,kill','3 objectifs item/riddle/kill attendus');
  assert(t1.reward === 'livre_lux_aeterna', 'récompense livre_lux_aeterna attendue');
  assert(t1.itemOk,                        'eclat_lumiere doit être type quest');
  assert(t1.riddleN === 3,                 '3 énigmes attendues');
  assert(t1.bossOk,                        'bibliothecaire_ombre : weight 0 + faible lumière');
  assert(!t1.shopHasLux,                   'livre_lux_aeterna doit être retiré de la boutique');

  // T2 — accept + collecte des 3 Éclats → étape item complétée.
  const t2 = await page.evaluate(() => {
    acceptQuest('dumbledore_lumiere');
    for (let i = 0; i < 3; i++) {
      player.inventory.push({ ...ITEMS.find(it => it.id === 'eclat_lumiere') });
    }
    _refreshObjectives();
    const q = activeQuests.find(x => x.id === 'dumbledore_lumiere');
    return {
      itemDone:    q.objectives[0].completed,
      riddleReady: _riddleStepReady()
    };
  });
  console.log('  T2 collecte:', t2);
  assert(t2.itemDone,    'étape de collecte non complétée avec 3 Éclats');
  assert(t2.riddleReady, '_riddleStepReady doit être vrai après la collecte');

  // T3 — énigmes : mauvaise réponse n'avance pas, 3 bonnes complètent + boss.
  const t3 = await page.evaluate(() => {
    openRiddleModal();
    const modalShown = document.getElementById('riddle-modal').style.display === 'flex';
    const step = () => activeQuests.find(x => x.id === 'dumbledore_lumiere')
                       .objectives.find(o => o.type === 'riddle');
    const wrong = (RIDDLES_LUMIERE[0].answer + 1) % 4;
    answerRiddle(wrong);
    const progAfterWrong = step().progress;
    for (let i = 0; i < RIDDLES_LUMIERE.length; i++) {
      answerRiddle(RIDDLES_LUMIERE[step().progress].answer);
    }
    let bossOnMap = 0;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++)
        if (enemyMap[y][x] && enemyMap[y][x].id === 'bibliothecaire_ombre') bossOnMap++;
    return {
      modalShown, progAfterWrong,
      riddleDone:  step().completed,
      bossOnMap,
      modalClosed: document.getElementById('riddle-modal').style.display === 'none'
    };
  });
  console.log('  T3 énigmes:', t3);
  assert(t3.modalShown,         'la modale d\'énigme ne s\'est pas ouverte');
  assert(t3.progAfterWrong === 0,'une mauvaise réponse ne doit pas faire avancer');
  assert(t3.riddleDone,         'l\'étape énigme doit être complétée après 3 bonnes réponses');
  assert(t3.bossOnMap === 1,    'le Bibliothécaire d\'Ombre doit apparaître sur l\'étage');
  assert(t3.modalClosed,        'la modale doit se fermer à la fin des énigmes');

  // T4 — boss vaincu → quête prête.
  const t4 = await page.evaluate(() => {
    checkKillQuests('bibliothecaire_ombre');
    const q = activeQuests.find(x => x.id === 'dumbledore_lumiere');
    return {
      killDone: q.objectives[2].completed,
      allDone:  q.objectives.every(o => o.completed)
    };
  });
  console.log('  T4 boss   :', t4);
  assert(t4.killDone, 'l\'étape kill doit être complétée après le boss');
  assert(t4.allDone,  'les 3 objectifs doivent être complétés');

  // T5 — remise → grimoire au sac, Éclats consommés.
  const t5 = await page.evaluate(() => {
    const ok = turnInQuestById('dumbledore_lumiere');
    return {
      turnInOk:   ok,
      questGone:  !activeQuests.some(x => x.id === 'dumbledore_lumiere'),
      gotGrimoire: player.inventory.some(i => i.id === 'livre_lux_aeterna'),
      eclatsGone:  !player.inventory.some(i => i.id === 'eclat_lumiere')
    };
  });
  console.log('  T5 remise :', t5);
  assert(t5.turnInOk,    'la remise de dumbledore_lumiere a échoué');
  assert(t5.questGone,   'la quête doit sortir des quêtes actives');
  assert(t5.gotGrimoire, 'livre_lux_aeterna doit être au sac après remise');
  assert(t5.eclatsGone,  'les Éclats de Lumière doivent être consommés à la remise');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (Épreuve Lux Aeterna)`);
  }
  console.log('  ✅ Épreuve de la Lumière Éternelle conforme');
  await browser.close();
}

async function scenarioOnboarding() {
  console.log('\n── Scénario : onboarding (Quick Start + tuto combat) ──');

  // D1 — Quick Start : depuis la sélection, saute droit au choix de Maison
  // avec les presets Solo · Harry · Normal.
  {
    const { browser, page } = await launchGame();
    const d1 = await page.evaluate(() => {
      showPlayerSelect();
      quickStart();
      return {
        pselHidden: document.getElementById('player-select-screen').style.display === 'none',
        houseShown: document.getElementById('house-select-screen').style.display === 'flex',
        solo:       selectedPartySize === 1 && selectedHeroes[0] === 'harry',
        diff:       difficulty
      };
    });
    console.log('  D1 quickstart:', d1);
    assert(d1.pselHidden && d1.houseShown, 'Quick Start saute au choix de Maison');
    assert(d1.solo, 'Quick Start présélectionne Solo · Harry');
    assert(d1.diff === 'Normal', 'Quick Start force la difficulté Normal');
    await browser.close();
  }

  // D2 — tuto contextuel du premier combat (une fois par partie).
  {
    const { browser, page, errors } = await launchGame();
    // Seul scénario à VOULOIR le tuto de combat : le harnais le désarme par
    // défaut (son overlay avale les touches des autres scénarios).
    await startNewGame(page, { partySize: 1, heroes: ['harry'], combatTutorial: true });
    // Fermer le tour guidé auto : le tuto combat ne s'y superpose jamais.
    await page.evaluate(() => { if (window.helpTourEnd) helpTourEnd(); });
    const seenBefore = await page.evaluate(() => combatTutorialSeen);
    assert(seenBefore === false, 'flag tuto combat à false avant le 1er combat');

    await startDummyFight(page, { hp: 200 });
    // Tuto différé (setTimeout 350 ms) — attendre la bulle ciblée.
    await page.waitForFunction(() => {
      const o = document.getElementById('help-tour-overlay');
      const t = document.getElementById('help-tour-title');
      return o && o.style.display === 'block' && /premier combat/i.test(t?.textContent || '');
    }, { timeout: 3000 });
    const d2 = await page.evaluate(() => ({
      seen:            combatTutorialSeen,
      stepCountHidden: document.getElementById('help-tour-step-count').style.display === 'none',
      voiceHidden:     document.getElementById('help-tour-voice').style.display === 'none',
      optoutHidden:    document.getElementById('help-tour-optout').style.display === 'none'
    }));
    console.log('  D2 tuto:', d2);
    assert(d2.seen === true,         'flag tuto combat passé à true');
    assert(d2.stepCountHidden,       'bulle à étape unique : compteur masqué');
    assert(d2.voiceHidden,           'tuto combat : bouton voix masqué');
    assert(d2.optoutHidden,          'tuto combat : opt-out global masqué');

    // Combat suivant : ne réapparaît pas.
    await page.evaluate(() => { helpTourEnd(); inBattle = false; });
    await startDummyFight(page, { hp: 50 });
    await new Promise(r => setTimeout(r, 600));
    const reappeared = await page.evaluate(() => {
      const o = document.getElementById('help-tour-overlay');
      return !!(o && o.style.display === 'block');
    });
    assert(reappeared === false, 'tuto combat ne réapparaît pas au 2e combat');

    if (errors.length) {
      errors.forEach(e => console.log('  ⚠️ ', e));
      throw new Error(`${errors.length} erreurs JS détectées (onboarding)`);
    }
    await browser.close();
  }

  // D3 — Bonus de Maison chiffrés à l'écran de choix (depuis HOUSE_BONUSES).
  {
    const { browser, page } = await launchGame();
    const d3 = await page.evaluate(() => {
      showPlayerSelect();
      quickStart();   // révèle l'écran Maison + peuple les bonus
      const gryff = document.getElementById('house-bonus-gryffondor').innerHTML;
      const serp  = document.getElementById('house-bonus-serpentard').innerHTML;
      const pouf  = document.getElementById('house-bonus-poufsouffle').innerHTML;
      // Cohérence avec HOUSE_BONUSES : 2e palier Gryff = +1 ATK à 150 pts.
      const t2 = HOUSE_BONUSES.Gryffondor.tiers[1];
      return { gryff, serp, pouf, t2thr: t2.threshold, t2atk: t2.bonus._baseAtk };
    });
    console.log('  D3 bonus:', { gryff: d3.gryff });
    assert(/\+ATK par palier/.test(d3.gryff),  'Gryffondor affiche +ATK par palier');
    assert(d3.gryff.includes(String(d3.t2thr)) && /\+1 ATK/.test(d3.gryff),
      'Gryffondor affiche le palier chiffré 150 : +1 ATK (cohérent HOUSE_BONUSES)');
    assert(/\+MAG par palier/.test(d3.serp),   'Serpentard affiche +MAG par palier');
    assert(/\+DEF par palier/.test(d3.pouf),   'Poufsouffle affiche +DEF par palier');
    await browser.close();
  }

  console.log('  ✅ onboarding (Quick Start + tuto combat + bonus Maison chiffrés) OK');
}

// ── Cinématique d'intro « Clé de Voûte des Quatre » (Lot 1) ───────
// L'intro raconte la scène du cours en 4 pages paginées, puis bascule
// sur le choix de Maison. Vérifie pagination, contenu, bouton final et
// auto-accept de la quête tutoriel.
async function scenarioCleVouteIntro() {
  console.log('\n── Scénario : cinématique d\'intro Clé de Voûte ──');
  const { browser, page, errors } = await launchGame();

  // Aller jusqu'à l'écran d'intro Dumbledore sans le terminer.
  await page.evaluate(() => {
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
  });
  await page.waitForFunction(() =>
    document.getElementById('intro-screen') &&
    document.getElementById('intro-screen').style.display === 'flex',
    { timeout: 3000 });

  // T1 : 4 pages, la 1re est paginée « 1 / 4 » et mentionne la Clé de Voûte.
  const t1 = await page.evaluate(() => {
    return {
      pages:    _introPages.length,
      pager:    (document.querySelector('#intro-text .intro-pager') || {}).textContent || '',
      mentionsRelic: _introPages.join(' ').includes('Clé de Voûte')
    };
  });
  console.log('  T1 pages:', t1);
  assert(t1.pages === 4,  `intro doit compter 4 pages, got ${t1.pages}`);
  assert(/1\s*\/\s*4/.test(t1.pager), `pager attendu « 1 / 4 », got « ${t1.pager} »`);
  assert(t1.mentionsRelic, 'l\'intro doit mentionner la Clé de Voûte');

  // T2 : avancer jusqu'à la dernière page → bouton final présent.
  const t2 = await page.evaluate(() => {
    while (_introPage < _introPages.length - 1) _advanceIntro();
    return {
      page:   _introPage,
      btnTxt: (document.querySelector('#intro-actions button') || {}).textContent || ''
    };
  });
  console.log('  T2 final:', t2);
  assert(t2.page === 3,                      'doit être sur la dernière page (index 3)');
  assert(/Entrer à Poudlard/.test(t2.btnTxt), `bouton final attendu, got « ${t2.btnTxt} »`);

  // T3 : finir l'intro → quête tutoriel acceptée + Dumbledore marqué vu.
  const t3 = await page.evaluate(() => {
    _finishIntro();
    return {
      introHidden: document.getElementById('intro-screen').style.display === 'none',
      introQuest:  activeQuests.some(q => q.id === 'intro_tutoriel'),
      seen:        seenNpcs.has('dumbledore')
    };
  });
  console.log('  T3 finish:', t3);
  assert(t3.introHidden, 'l\'écran d\'intro doit se cacher après _finishIntro');
  assert(t3.introQuest,  'intro_tutoriel doit être auto-acceptée');
  assert(t3.seen,        'dumbledore doit être marqué dans seenNpcs');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant l'intro Clé de Voûte`);
  }
  console.log('  ✅ cinématique d\'intro Clé de Voûte OK');
  await browser.close();
}

// Réactivité fil rouge des Éclats (ch.06 §6.9.3) : le suffixe `eclatLines` des
// PNJ-pivots suit `eclatProgress()` (dérivé, monotone après remise).
async function scenarioNpcEclatReaction() {
  console.log('\n── Scénario : réactivité fil rouge des Éclats (PNJ-pivots) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const joined = (id) => { openNpcDialog(id); return _dialogState.pages.join(' || '); };

    // Reset propre du fil rouge.
    player.inventory = (player.inventory || []).filter(i => !i || i.id !== 'eclat_voute');
    completedQuests.delete('eclats_clef_voute');

    const p0   = eclatProgress();
    const dlg0 = joined('dumbledore');

    // 2 Éclats ramassés → palier 2.
    player.inventory.push({ id: 'eclat_voute' }, { id: 'eclat_voute' });
    const p2   = eclatProgress();
    const dlg2 = joined('dumbledore');

    // Quête `eclats_clef_voute` remise (inventaire consommé) → reste à 3 (monotone).
    player.inventory = player.inventory.filter(i => i.id !== 'eclat_voute');
    completedQuests.add('eclats_clef_voute');
    const p3   = eclatProgress();
    const dlg3 = joined('dumbledore');

    // Écho de Salazar (Serpentard) — voix de Fondateur, palier 1.
    completedQuests.delete('eclats_clef_voute');
    chosenHouse = 'Serpentard';
    player.inventory.push({ id: 'eclat_voute' });
    const echoP1 = eclatProgress();
    const echo1  = joined('echo_salazar');

    return { p0, dlg0, p2, dlg2, p3, dlg3, echoP1, echo1 };
  });
  console.log('  →', { p0: r.p0, p2: r.p2, p3: r.p3, echoP1: r.echoP1 });

  assert(r.p0 === 0,                          'eclatProgress doit valoir 0 sans Éclat ni quête remise');
  assert(!r.dlg0.includes('attise'),          'pas de suffixe Éclat au palier 0');
  assert(r.p2 === 2,                          'eclatProgress doit valoir 2 avec 2 eclat_voute');
  assert(r.dlg2.includes('attise'),           'suffixe Dumbledore palier 2 absent');
  assert(r.p3 === 3,                          'eclatProgress doit rester 3 après remise (monotone, inventaire vidé)');
  assert(r.dlg3.includes('deux choses, pas une'), 'suffixe Dumbledore palier 3 absent');
  assert(r.echoP1 === 1,                      'eclatProgress 1 attendu pour l\'écho');
  assert(r.echo1.includes('tient la porte'),  'suffixe écho de Salazar palier 1 absent');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Réactivité fil rouge des Éclats conforme');
  await browser.close();
}

// Suffixe « Ténébreux » en Boucle (ch.06 §6.12.E) : un PNJ recyclé (Kingsley
// 8/18) porte une variante de dialogue lue uniquement sur currentFloor >= 18.
async function scenarioLoopDarkSuffix() {
  console.log('\n── Scénario : suffixe Ténébreux en Boucle (PNJ recyclés) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const k = (typeof getNpcById === 'function') ? getNpcById('kingsley') : null;
    const ap = (typeof getNpcById === 'function') ? getNpcById('apothicaire_tenebreux') : null;
    const hasField = !!(k && k.darkLoopLines);
    const hasHelper = typeof _darkLoopSuffixPages === 'function';

    // Résolveur de suffixe — gate sur currentFloor >= 18 (déterministe).
    currentFloor = 8;
    const surfacePages = hasHelper ? _darkLoopSuffixPages(k).length : -1;   // 0 attendu
    currentFloor = 17;
    const justBelow = hasHelper ? _darkLoopSuffixPages(k).length : -1;      // 0 attendu
    currentFloor = 18;
    const loopPages = hasHelper ? _darkLoopSuffixPages(k).length : -1;      // > 0 attendu

    // Intégration : à l'étage 18, openNpcDialog appende bien une des darkLoopLines.
    currentFloor = 18;
    openNpcDialog('kingsley');
    const joinedLoop = _dialogState.pages.join(' || ');
    const lines = Array.isArray(k.darkLoopLines) ? k.darkLoopLines : [k.darkLoopLines];
    const suffixPresent = lines.some(l => joinedLoop.includes(l.slice(0, 40)));

    // Marchand recyclé (apothicaire) : champ présent + gate identique.
    const apHasField = !!(ap && ap.darkLoopLines);
    currentFloor = 9;
    const apSurface = hasHelper ? _darkLoopSuffixPages(ap).length : -1;     // 0 attendu
    currentFloor = 19;
    const apLoop = hasHelper ? _darkLoopSuffixPages(ap).length : -1;        // > 0 attendu

    return { hasField, hasHelper, surfacePages, justBelow, loopPages, suffixPresent, apHasField, apSurface, apLoop };
  });
  console.log('  →', r);

  assert(r.hasField, 'Kingsley doit porter le champ darkLoopLines');
  assert(r.hasHelper, '_darkLoopSuffixPages doit exister');
  assert(r.surfacePages === 0, 'pas de suffixe Ténébreux à l\'étage 8 (surface)');
  assert(r.justBelow === 0, 'pas de suffixe Ténébreux à l\'étage 17 (sous le seuil 18)');
  assert(r.loopPages > 0, 'suffixe Ténébreux attendu à l\'étage 18 (Boucle)');
  assert(r.suffixPresent, 'openNpcDialog(18) doit appender une darkLoopLine de Kingsley');
  assert(r.apHasField, 'l\'apothicaire doit porter le champ darkLoopLines');
  assert(r.apSurface === 0, 'apothicaire : pas de suffixe en surface (étage 9)');
  assert(r.apLoop > 0, 'apothicaire : suffixe Ténébreux attendu en Boucle (étage 19)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (suffixe Ténébreux)`);
  }
  console.log('  ✅ Suffixe Ténébreux en Boucle conforme');
  await browser.close();
}

// Réputation par PNJ DÉRIVÉE du choix gris du Pacte (ch.06 §6.9.2) : l'écho de
// Salazar et Kingsley réagissent de signe OPPOSÉ selon slythPactChoice.
async function scenarioNpcReputation() {
  console.log('\n── Scénario : réputation par PNJ (Pacte des Cachots, §6.9.2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Serpentard' });

  const r = await page.evaluate(() => {
    const joined = (id) => { openNpcDialog(id); return _dialogState.pages.join(' || '); };
    const set = (c) => { slythPactChoice = c; };

    // Aucun choix → aucun suffixe réputation.
    set(null);
    const echoNone = joined('echo_salazar');
    const kingNone = joined('kingsley');

    // Pacte scellé : écho chaleureux, Kingsley méfiant.
    set('pact');
    const echoPact = joined('echo_salazar');
    const kingPact = joined('kingsley');

    // Défiance : signes inversés.
    set('defiance');
    const echoDef = joined('echo_salazar');
    const kingDef = joined('kingsley');

    return { echoNone, kingNone, echoPact, kingPact, echoDef, kingDef,
      repFn: typeof npcReputationFor === 'function' };
  });

  assert(r.repFn, 'npcReputationFor doit être défini');
  // Neutre : ni warm ni hostile.
  assert(!r.echoNone.includes('marche avec toi') && !r.echoNone.includes('mains libres'),
    'écho : aucun suffixe réputation sans choix');
  assert(!r.kingNone.includes('raccourcis') && !r.kingNone.includes('vieux serpents'),
    'Kingsley : aucun suffixe réputation sans choix');
  // Pacte : écho warm, Kingsley hostile.
  assert(r.echoPact.includes('marche avec toi'), 'écho : suffixe warm attendu après le Pacte');
  assert(r.kingPact.includes('vieux serpents'), 'Kingsley : suffixe hostile attendu après le Pacte');
  // Défiance : écho hostile, Kingsley warm (signes opposés).
  assert(r.echoDef.includes('mains libres'), 'écho : suffixe hostile attendu après la Défiance');
  assert(r.kingDef.includes('raccourcis'), 'Kingsley : suffixe warm attendu après la Défiance');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (réputation PNJ)`);
  }
  console.log('  ✅ Réputation par PNJ dérivée conforme (signes opposés écho/Kingsley)');
  await browser.close();
}

// Ligne « après » post-victoire (ch.14 §14.3.2, Phase P2) : les PNJ profonds
// recyclés (Kingsley 8/18, Bill 9/19, Sirius 10/20) gagnent une variante plus
// grave une fois `victoryAchieved`, lue aux étages de surface (< 18). En Boucle
// profonde (>= 18), darkLoopLines reprend la main (les deux restent exclusifs).
async function scenarioNpcPostVictory() {
  console.log('\n── Scénario : ligne « après » post-victoire (PNJ profonds, §14.3.2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const ids = ['kingsley', 'bill_weasley', 'sirius_esprit'];
    const npcs = ids.map(id => (typeof getNpcById === 'function') ? getNpcById(id) : null);
    const hasFields = npcs.every(n => n && Array.isArray(n.postVictoryLines) && n.postVictoryLines.length);
    const hasHelper = typeof _postVictorySuffixPages === 'function';
    const hasPure   = typeof pickPostVictoryLine === 'function';

    // Helper PUR : gate sur ctx.victoryAchieved + rng injectable (déterminisme).
    const lines = ['A', 'B'];
    const pureNoVictory = hasPure ? pickPostVictoryLine(lines, { victoryAchieved: false }) : 'X';   // null
    const pureVictory0  = hasPure ? pickPostVictoryLine(lines, { victoryAchieved: true, rng: () => 0 }) : null;     // 'A'
    const pureVictory1  = hasPure ? pickPostVictoryLine(lines, { victoryAchieved: true, rng: () => 0.99 }) : null;  // 'B'
    const pureNoLines   = hasPure ? pickPostVictoryLine(null, { victoryAchieved: true }) : 'X';      // null

    const kingsley = getNpcById('kingsley');

    // Pré-victoire, étage de surface : aucun suffixe « après ».
    victoryAchieved = false;
    currentFloor = 8;
    const surfaceNoVictory = hasHelper ? _postVictorySuffixPages(kingsley).length : -1;  // 0 attendu

    // Post-victoire, étage de surface : suffixe « après » présent.
    victoryAchieved = true;
    currentFloor = 8;
    const surfaceVictory = hasHelper ? _postVictorySuffixPages(kingsley).length : -1;    // > 0 attendu

    // Post-victoire, Boucle profonde (>= 18) : complémentarité — darkLoop reprend
    // la main, le suffixe « après » s'efface (pas de double beat).
    currentFloor = 18;
    const deepLoop = hasHelper ? _postVictorySuffixPages(kingsley).length : -1;          // 0 attendu

    // Intégration : openNpcDialog post-victoire à l'étage 8 appende bien la ligne.
    victoryAchieved = true;
    currentFloor = 8;
    seenNpcs.delete('kingsley');
    openNpcDialog('kingsley');
    const joinedVictory = _dialogState.pages.join(' || ');
    const pv = kingsley.postVictoryLines;
    const suffixPresent = pv.some(l => joinedVictory.includes(l.slice(0, 40)));

    // À victoryAchieved=false, la ligne « après » est absente (ligne normale).
    victoryAchieved = false;
    seenNpcs.delete('kingsley');
    openNpcDialog('kingsley');
    const joinedNormal = _dialogState.pages.join(' || ');
    const suffixAbsent = pv.every(l => !joinedNormal.includes(l.slice(0, 40)));

    return {
      hasFields, hasHelper, hasPure,
      pureNoVictory, pureVictory0, pureVictory1, pureNoLines,
      surfaceNoVictory, surfaceVictory, deepLoop, suffixPresent, suffixAbsent
    };
  });
  console.log('  →', r);

  assert(r.hasFields, 'Kingsley/Bill/Sirius doivent porter postVictoryLines');
  assert(r.hasHelper, '_postVictorySuffixPages doit exister');
  assert(r.hasPure,   'pickPostVictoryLine (pur) doit exister');
  assert(r.pureNoVictory === null, 'pickPostVictoryLine : null sans victoire');
  assert(r.pureVictory0 === 'A',   'pickPostVictoryLine : rng=0 → 1re ligne');
  assert(r.pureVictory1 === 'B',   'pickPostVictoryLine : rng≈max → 2e ligne');
  assert(r.pureNoLines === null,   'pickPostVictoryLine : null si lignes absentes');
  assert(r.surfaceNoVictory === 0, 'pas de ligne « après » sans victoire (étage 8)');
  assert(r.surfaceVictory > 0,     'ligne « après » attendue post-victoire (étage 8)');
  assert(r.deepLoop === 0,         'pas de ligne « après » en Boucle profonde (étage 18, darkLoop prend le relais)');
  assert(r.suffixPresent, 'openNpcDialog post-victoire (ét. 8) doit appender une postVictoryLine de Kingsley');
  assert(r.suffixAbsent,  'openNpcDialog sans victoire ne doit PAS appender de postVictoryLine');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (ligne post-victoire)`);
  }
  console.log('  ✅ Ligne « après » post-victoire conforme (gate victoryAchieved, complémentaire de darkLoop)');
  await browser.close();
}

// Lots 4-5 ch.09 — réaction contextuelle PNJ↔créature (dialogues conditionnels).
// Un PNJ tuteur reconnaît une créature liée VAINCUE (monsterKills > 0) via une
// réplique greffée dans son pool idle. Test déterministe : Kingsley (sprite
// "mage") n'a aucune greffe fantôme, donc Math.random≈1 sélectionne toujours la
// DERNIÈRE entrée du pool — la réaction est concaténée en dernier quand active.
async function scenarioNpcCreatureReaction() {
  console.log('\n── Scénario : réaction contextuelle PNJ↔créature (ch.09 §VI) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const r = await page.evaluate(() => {
    const npc = getNpcById('kingsley');
    const d   = npc.dialogues;
    seenNpcs.add('kingsley');             // saute le greeting → branche idle
    const origRandom = Math.random;
    Math.random = () => 0.9999;           // pioche toujours la dernière entrée
    try {
      monsterKills = {};                                   // aucune victoire
      const none     = _resolveDialogSource(npc, 'idle').raw;
      monsterKills = { fenrir_greyback: 1 };               // Greyback vaincu
      const greyback = _resolveDialogSource(npc, 'idle').raw;
      monsterKills = { fenrir_greyback: 1, auror_corrompu: 1 }; // + Auror
      const auror    = _resolveDialogSource(npc, 'idle').raw;
      return {
        none, greyback, auror,
        lastIdle:     d.idleRandom[d.idleRandom.length - 1],
        greybackText: d.contextualReaction[0].text,
        aurorText:    d.contextualReaction[1].text,
      };
    } finally { Math.random = origRandom; }
  });
  console.log('  reactions:', {
    noneIsLastIdle: r.none === r.lastIdle,
    greybackMatch:  r.greyback === r.greybackText,
    aurorMatch:     r.auror === r.aurorText,
  });
  assert(r.none === r.lastIdle,
    `sans victoire, l'idle doit rester idleRandom (got "${r.none}")`);
  assert(r.none !== r.greybackText,
    'la réaction ne doit pas apparaître tant que la créature est vivante');
  assert(r.greyback === r.greybackText,
    `Greyback vaincu → réaction greffée (got "${r.greyback}")`);
  assert(r.auror === r.aurorText,
    `Auror vaincu → réaction greffée (got "${r.auror}")`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ réaction contextuelle PNJ↔créature conforme');
  await browser.close();
}

// P2.4 — mini-tour contextuel one-shot à la 1ʳᵉ ouverture de la Forge.
async function scenarioEndgameMiniTours() {
  console.log('\n── Scénario : mini-tours endgame (P2.4) ──');
  const { browser, page, errors } = await launchGame();
  await page.evaluate(() => {
    try {
      localStorage.removeItem('hh_help_tour_optout');
      localStorage.removeItem('hh_tour_forge_seen');
    } catch (e) { /* noop */ }
  });
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  // Ferme le tour intro auto pour isoler le mini-tour.
  await page.evaluate(() => { if (window._helpTourActive && typeof helpTourEnd === 'function') helpTourEnd(); });

  // T1 : 1ʳᵉ ouverture Forge → mini-tour planifié (350 ms).
  const t1 = await page.evaluate(() => {
    try { localStorage.removeItem('hh_tour_forge_seen'); } catch (e) {}
    const hasFn = typeof maybeForgeTour === 'function' && typeof openForge === 'function';
    if (hasFn) openForge();
    return { hasFn };
  });
  await page.waitForTimeout(550);
  const t1b = await page.evaluate(() => ({
    active:  window._helpTourActive === true,
    overlay: document.getElementById('help-tour-overlay')?.style.display === 'block',
    flag:    localStorage.getItem('hh_tour_forge_seen'),
    title:   document.getElementById('help-tour-title')?.textContent || ''
  }));
  console.log('  T1:', t1, t1b);
  assert(t1.hasFn, 'maybeForgeTour/openForge non exposés');
  assert(t1b.active && t1b.overlay, 'mini-tour Forge non déclenché à la 1ʳᵉ ouverture');
  assert(t1b.flag === '1', 'flag hh_tour_forge_seen non posé');
  assert(/Forge/.test(t1b.title), 'titre du mini-tour Forge inattendu : ' + t1b.title);

  // T2 : 2ᵉ ouverture → one-shot, pas de relance.
  await page.evaluate(() => { if (typeof helpTourEnd === 'function') helpTourEnd(); if (typeof openForge === 'function') openForge(); });
  await page.waitForTimeout(550);
  const t2 = await page.evaluate(() => ({ active: window._helpTourActive === true }));
  console.log('  T2 (one-shot):', t2);
  assert(!t2.active, 'le mini-tour Forge ne doit pas se rejouer (one-shot)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (mini-tours endgame)`);
  }
  console.log('  ✅ Mini-tours endgame conformes');
  await browser.close();
}

module.exports = { scenarios: [scenarioNpcIntegration, scenarioVendors, scenarioRandomLoreNpcs, scenarioKaraokeIntro, scenarioKaraokeNpc, scenarioHelpTour, scenarioGrimoirePages, scenarioGrimoireActe3, scenarioDumbledoreLux, scenarioOnboarding, scenarioCleVouteIntro, scenarioNpcEclatReaction, scenarioLoopDarkSuffix, scenarioNpcReputation, scenarioNpcPostVictory, scenarioNpcCreatureReaction, scenarioEndgameMiniTours] };
