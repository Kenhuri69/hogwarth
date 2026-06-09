// ============================================================
// Scénarios smoke — domaine « potions » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioBrewing() {
  console.log('\n── Scénario : concoction de potions (chaudron Slughorn) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : données — 6 herbes, POTION_RECIPES, besace routée par tryAddItem
  const t1 = await page.evaluate(() => {
    const herbCount = ITEMS.filter(i => i.type === 'herb').length;
    player.herbs = {};
    const before = player.inventory.length;
    const added  = tryAddItem('herbe_armoise', { silent: true });
    return {
      herbCount,
      recipesDefined: typeof POTION_RECIPES !== 'undefined' && POTION_RECIPES.length === 26,
      added,
      herbInBesace: getHerbCount('herbe_armoise'),
      inventoryUnchanged: player.inventory.length === before,
      slughornExists: !!getNpcById('slughorn')
    };
  });
  console.log('  T1 données →', t1);
  assert(t1.herbCount === 7,          '7 items herbe attendus (6 + l\'herbe rare endgame)');
  assert(t1.recipesDefined,           'POTION_RECIPES doit définir 26 recettes');
  assert(t1.added,                    'tryAddItem(herbe) doit réussir');
  assert(t1.herbInBesace === 1,       'la herbe doit aller dans la besace');
  assert(t1.inventoryUnchanged,       'la herbe ne doit pas occuper le sac');
  assert(t1.slughornExists,           'PNJ Slughorn introuvable');

  // T2 : brassage verrouillé tant que la quête n'est pas remise
  const t2 = await page.evaluate(() => {
    const unlockedBefore = _isBrewingUnlocked();
    openBrewingModal();
    const shown = document.getElementById('brewing-modal').style.display === 'flex';
    return { unlockedBefore, shown };
  });
  console.log('  T2 verrou →', t2);
  assert(t2.unlockedBefore === false, 'brassage doit être verrouillé au départ');
  assert(t2.shown === false,          'la modale ne doit pas s\'ouvrir verrouillée');

  // T3 : remise de la quête de déverrouillage → recettes de base apprises
  const t3 = await page.evaluate(() => {
    acceptQuest('quest_potions_slughorn');
    for (let i = 0; i < 3; i++) {
      player.inventory.push({ ...ITEMS.find(x => x.id === 'mandragore') });
    }
    _refreshObjectives();
    const idx = activeQuests.findIndex(q => q.id === 'quest_potions_slughorn');
    completeQuest(idx);
    return {
      unlocked: _isBrewingUnlocked(),
      knows: (player.knownRecipes || []).slice()
    };
  });
  console.log('  T3 déverrouillage →', t3);
  assert(t3.unlocked,                          'la quête remise doit déverrouiller le brassage');
  assert(t3.knows.includes('brew_potion_s'),   'brew_potion_s doit être appris');
  assert(t3.knows.includes('brew_potion_m'),   'brew_potion_m doit être appris');

  // T4 : brassage d'une recette connue (INT forcée → réussite garantie)
  const t4 = await page.evaluate(() => {
    party[0].int = 100;
    player.herbs = { herbe_armoise: 2 };
    player.inventory = [];
    _cauldronMix = { herbe_armoise: 2 };
    attemptBrew();
    return {
      potions: player.inventory.filter(it => it && it.id === 'potion_s').length,
      herbsLeft: getHerbCount('herbe_armoise'),
      cauldronCleared: Object.keys(_cauldronMix).length === 0
    };
  });
  console.log('  T4 brassage connu →', t4);
  assert(t4.potions >= 1,        'le brassage réussi doit ajouter au moins 1 potion_s');
  assert(t4.herbsLeft === 0,     'les herbes doivent être consommées');
  assert(t4.cauldronCleared,     'le chaudron doit être vidé après brassage');

  // T5 : découverte d'une recette inconnue par expérimentation
  const t5 = await page.evaluate(() => {
    party[0].int = 100;
    player.herbs = { herbe_aconit: 1 };
    player.inventory = [
      { ...ITEMS.find(x => x.id === 'mandragore') },
      { ...ITEMS.find(x => x.id === 'mandragore') }
    ];
    const knewBefore = (player.knownRecipes || []).includes('brew_potion_force');
    _cauldronMix = { herbe_aconit: 1, mandragore: 2 };
    attemptBrew();
    return {
      knewBefore,
      knowsNow: (player.knownRecipes || []).includes('brew_potion_force')
    };
  });
  console.log('  T5 découverte →', t5);
  assert(t5.knewBefore === false, 'brew_potion_force ne doit pas être connu d\'avance');
  assert(t5.knowsNow,             'l\'expérimentation valide doit découvrir brew_potion_force');

  // T6 : mélange invalide → échec, herbes consommées, rien appris
  const t6 = await page.evaluate(() => {
    player.herbs = { herbe_armoise: 1, herbe_dictame: 1 };
    const recipesBefore = (player.knownRecipes || []).length;
    _cauldronMix = { herbe_armoise: 1, herbe_dictame: 1 };
    attemptBrew();
    return {
      herbsLeft: getHerbCount('herbe_armoise') + getHerbCount('herbe_dictame'),
      recipesUnchanged: (player.knownRecipes || []).length === recipesBefore
    };
  });
  console.log('  T6 mélange raté →', t6);
  assert(t6.herbsLeft === 0,        'un mélange raté consomme quand même les herbes');
  assert(t6.recipesUnchanged,       'un mélange invalide n\'apprend aucune recette');

  // T7 : besace consultable via l'onglet de l'inventaire — accessible
  //      même sans chaudron débloqué.
  const t7 = await page.evaluate(() => {
    player.herbs = { herbe_armoise: 3, herbe_aconit: 1 };
    openInventory();
    const tabsVisible = getComputedStyle(document.getElementById('inv-tabs')).display !== 'none';
    switchInvTab('besace');
    const pane = document.getElementById('inv-pane-besace');
    const besaceShown = getComputedStyle(pane).display !== 'none';
    const sacHidden   = getComputedStyle(document.getElementById('inv-pane-sac')).display === 'none';
    const tiles = pane.querySelectorAll('.brew-tile').length;
    const hasArmoise = pane.textContent.includes('Armoise');
    switchInvTab('sac');
    const backToSac = getComputedStyle(document.getElementById('inv-pane-sac')).display !== 'none';
    closeModal('inventory-modal');
    return { tabsVisible, besaceShown, sacHidden, tiles, hasArmoise, backToSac };
  });
  console.log('  T7 besace inventaire →', t7);
  assert(t7.tabsVisible,   'la barre d\'onglets de l\'inventaire doit être visible');
  assert(t7.besaceShown,   'le pane besace doit s\'afficher sur l\'onglet Besace');
  assert(t7.sacHidden,     'le pane sac doit être masqué sur l\'onglet Besace');
  assert(t7.tiles === 2,   'la besace doit lister les 2 herbes possédées');
  assert(t7.hasArmoise,    'la besace doit nommer l\'Armoise');
  assert(t7.backToSac,     'le retour sur l\'onglet Sac doit ré-afficher le sac');

  // T8 : P1 — « Brassage à maîtrise » : la potency est bakée selon la qualité
  // du jet (ratée −15 % / réussite +20 % / critique +40 %, + bonus INT). Jet
  // rendu déterministe en stubant Math.random (roll = 1).
  const t8 = await page.evaluate(() => {
    party[0].hpMax = 200;
    // Brasse potion_s (recette difficulty 8, herbe_armoise:2) avec une INT
    // forcée pour cibler chaque palier ; roll = 1 (Math.random → 0).
    function brewWith(intVal) {
      const orig = Math.random;
      Math.random = () => 0;                 // roll = 1 + floor(0*20) = 1
      party[0].int = intVal;
      player.herbs = { herbe_armoise: 2 };
      player.inventory = [];
      _cauldronMix = { herbe_armoise: 2 };
      attemptBrew();
      Math.random = orig;
      const pot = player.inventory.find(it => it && it.id === 'potion_s');
      const c = party[0]; c.hp = 1;
      if (pot) _applyConsumableEffect(pot, c);
      return { brewPotency: pot ? pot.brewPotency : null, brewed: pot ? pot.brewed === true : false, healed: c.hp - 1 };
    }
    // int 2 → margin = 2+1-8 = -5 (ratée) ; int 10 → 3 (réussite) ; int 20 → 13 (crit).
    return { fail: brewWith(2), success: brewWith(10), crit: brewWith(20), base: 15 };
  });
  console.log('  T8 brassage à maîtrise →', t8);
  assert(t8.fail.brewed && t8.success.brewed && t8.crit.brewed, 'les 3 fioles doivent porter le flag brewed');
  assert(t8.fail.brewPotency === -0.15,        'jet raté → fiole diluée −15 %');
  assert(Math.abs(t8.success.brewPotency - 0.20) < 1e-9, 'réussite → +20 %');
  assert(Math.abs(t8.crit.brewPotency - 0.45) < 1e-9,    'critique (INT 20) → +40 % +5 % maîtrise');
  assert(t8.fail.healed === Math.round(15 * 0.85),  'ratée soigne 13 (15×0.85)');
  assert(t8.success.healed === Math.round(15 * 1.20), 'réussite soigne 18 (15×1.20)');
  assert(t8.crit.healed === Math.round(15 * 1.45),    'critique soigne 22 (15×1.45)');
  assert(t8.fail.healed < t8.base && t8.base < t8.crit.healed, 'diluée < achetée < concentrée');

  // T9 : P1 — la potency influe sur la REVENTE + tooltip + fallback legacy.
  const t9 = await page.evaluate(() => {
    const shop = ITEMS.find(i => i.id === 'potion_s');         // price 30, sans flag
    const concentree = { ...shop, brewed: true, brewPotency: 0.40 };
    const diluee     = { ...shop, brewed: true, brewPotency: -0.15 };
    const legacy     = { ...shop, brewed: true };              // C5, sans brewPotency
    return {
      sellShop:    _computeSellPrice(shop),
      sellConc:    _computeSellPrice(concentree),
      sellDil:     _computeSellPrice(diluee),
      healLegacy:  (() => { const c = party[0]; c.hpMax = 200; c.hp = 1; _applyConsumableEffect(legacy, c); return c.hp - 1; })(),
      ttConc: /Brassage maison/.test(_renderItemTooltip(concentree)),
      ttDil:  /diluée/i.test(_renderItemTooltip(diluee)),
    };
  });
  console.log('  T9 revente + tooltip + legacy →', t9);
  assert(t9.sellDil < t9.sellShop && t9.sellShop < t9.sellConc, 'revente : diluée < base < concentrée');
  assert(t9.healLegacy === Math.round(15 * 1.25), 'fallback legacy brewed:true → +25 %');
  assert(t9.ttConc, 'tooltip d\'une fiole concentrée mentionne le brassage maison');
  assert(t9.ttDil,  'tooltip d\'une fiole diluée signale la dilution');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Concoction OK (besace + verrou + déverrouillage + brassage + découverte + onglet + brassage à maîtrise)');
  await browser.close();
}

async function scenarioRecipeCodex() {
  console.log('\n── Scénario : Codex des recettes (chaudron) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Déverrouille le chaudron (remise de la quête Slughorn → recettes de base).
  const t0 = await page.evaluate(() => {
    acceptQuest('quest_potions_slughorn');
    for (let i = 0; i < 3; i++) player.inventory.push({ ...ITEMS.find(x => x.id === 'mandragore') });
    _refreshObjectives();
    completeQuest(activeQuests.findIndex(q => q.id === 'quest_potions_slughorn'));
    openBrewingModal();
    const body = document.getElementById('brewing-body');
    return {
      unlocked: _isBrewingUnlocked(),
      total: POTION_RECIPES.length,
      rows: body.querySelectorAll('.brew-recipe-row').length,
      locked: body.querySelectorAll('.brew-recipe-locked').length,
      countText: (body.querySelector('.brew-codex-count') || {}).textContent || '',
      knownNames: Array.from(body.querySelectorAll('.brew-recipe-row:not(.brew-recipe-locked) .brew-recipe-name')).map(n => n.textContent),
    };
  });
  console.log('  T1 codex complet →', t0);
  assert(t0.unlocked, 'le chaudron doit être déverrouillé');
  assert(t0.rows === t0.total, `le codex doit lister les ${t0.total} recettes (obtenu ${t0.rows})`);
  const discovered0 = t0.rows - t0.locked;
  assert(t0.locked === t0.total - discovered0, 'masquées = total − découvertes');
  assert(t0.countText === `${discovered0}/${t0.total} découvertes`, `compteur attendu "${discovered0}/${t0.total} découvertes" (obtenu "${t0.countText}")`);
  assert(t0.knownNames.some(n => /Potion de Soin/.test(n)), 'la Potion de Soin (de base) doit être lisible');
  assert(t0.knownNames.every(n => !/\?/.test(n)), 'aucune recette lisible ne doit porter de silhouette');

  // T2 : indice non-spoiler — recette herbe (palier) vs upgrade-craft (avancée).
  const t2 = await page.evaluate(() => {
    const rL = POTION_RECIPES.find(r => r.id === 'brew_potion_l');          // herbes T2/T1
    const rUp = POTION_RECIPES.find(r => r.id === 'brew_up_potion_l');      // potion_s + éclat
    return { herb: _recipeHint(rL), upgrade: _recipeHint(rUp) };
  });
  console.log('  T2 indices →', t2);
  assert(t2.herb.advanced === false && t2.herb.palier === 2 && t2.herb.ingCount === 3, 'brew_potion_l : palier 2, 3 ingrédients, non avancée');
  assert(t2.upgrade.advanced === true, 'brew_up_potion_l : avancée (ingrédient de sac)');

  // T3 : une recette masquée affiche bien sa silhouette + son indice.
  const t3 = await page.evaluate(() => {
    const body = document.getElementById('brewing-body');
    const locked = body.querySelector('.brew-recipe-locked');
    return {
      name: locked.querySelector('.brew-recipe-name').textContent,
      hint: locked.querySelector('.brew-recipe-ing').textContent,
      hasButton: !!locked.querySelector('.brew-mini-btn'),
    };
  });
  console.log('  T3 ligne masquée →', t3);
  assert(/\?/.test(t3.name), 'une recette masquée affiche une silhouette « ? »');
  assert(/(Palier \d|Recette avancée)/.test(t3.hint), 'une recette masquée affiche un indice de palier/avancée');
  assert(/ingrédient/.test(t3.hint), 'l\'indice mentionne le nombre d\'ingrédients');
  assert(t3.hasButton === false, 'une recette masquée n\'a pas de bouton Préparer');

  // T4 : brasser une recette inconnue la révèle (masquée→lisible, compteur +1).
  const t4 = await page.evaluate(() => {
    party[0].int = 100;
    const before = POTION_RECIPES.filter(r => (player.knownRecipes || []).includes(r.id)).length;
    const wasKnown = (player.knownRecipes || []).includes('brew_potion_force');
    player.herbs = { herbe_aconit: 1 };
    player.inventory = [
      { ...ITEMS.find(x => x.id === 'mandragore') },
      { ...ITEMS.find(x => x.id === 'mandragore') },
    ];
    _cauldronMix = { herbe_aconit: 1, mandragore: 2 };
    attemptBrew();                       // découvre brew_potion_force
    openBrewingModal();                  // re-render (reset le mix)
    const body = document.getElementById('brewing-body');
    return {
      wasKnown,
      nowKnown: (player.knownRecipes || []).includes('brew_potion_force'),
      before,
      after: POTION_RECIPES.filter(r => (player.knownRecipes || []).includes(r.id)).length,
      countText: (body.querySelector('.brew-codex-count') || {}).textContent || '',
    };
  });
  console.log('  T4 découverte → codex →', t4);
  assert(t4.wasKnown === false, 'brew_potion_force ne doit pas être connu d\'avance');
  assert(t4.nowKnown === true, 'le brassage doit révéler brew_potion_force');
  assert(t4.after === t4.before + 1, 'le compteur de découvertes doit augmenter de 1');
  assert(t4.countText === `${t4.after}/${t0.total} découvertes`, 'le compteur du codex doit refléter la nouvelle découverte');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Codex OK (liste complète + silhouettes/indices + compteur + révélation à la découverte)');
  await browser.close();
}

async function scenarioRareHerb() {
  console.log('\n── Scénario : herbe rare endgame (Asphodèle des Ténèbres) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : item herbe tier 4 + sources (drop Héraut, ware Apothicaire) + icône SVG.
  const t1 = await page.evaluate(() => {
    const h = ITEMS.find(i => i.id === 'herbe_asphodele_noire');
    const heraut = MONSTERS.find(m => m.id === 'heraut_tenebres');
    const apo = NPCS.find(n => n.id === 'apothicaire_tenebreux');
    return {
      isHerb: !!h && h.type === 'herb',
      tier: h && h.tier,
      herbCount: ITEMS.filter(i => i.type === 'herb').length,
      dropOnHeraut: !!heraut && (heraut.drops || []).some(d => d.itemId === 'herbe_asphodele_noire'),
      onApothicaire: !!apo && (apo.wares || []).some(w => w.id === 'herbe_asphodele_noire'),
      iconHasSvg: /<svg/.test(getItemIconHtml(h, 'ui-icon-xl')),
    };
  });
  console.log('  T1 données →', t1);
  assert(t1.isHerb && t1.tier === 4, 'l\'Asphodèle des Ténèbres doit être une herbe tier 4');
  assert(t1.herbCount === 7,         '7 herbes attendues (6 + l\'herbe rare)');
  assert(t1.dropOnHeraut,            'le Héraut des Ténèbres doit dropper l\'herbe rare');
  assert(t1.onApothicaire,           'l\'Apothicaire Ténébreux doit vendre l\'herbe rare');
  assert(t1.iconHasSvg,              'l\'herbe rare doit avoir une icône SVG inline');

  // T2 : recettes de prestige — 23 recettes, multisets inédits → bons matchs.
  const t2 = await page.evaluate(() => {
    const xl   = POTION_RECIPES.find(r => r.id === 'brew_xl_tenebres');
    const xlsp = POTION_RECIPES.find(r => r.id === 'brew_xl_sp_tenebres');
    const m2 = _matchRecipe({ herbe_asphodele_noire: 2 });
    const m3 = _matchRecipe({ herbe_asphodele_noire: 3 });
    return {
      count: POTION_RECIPES.length,
      xlResult: xl && xl.resultItemId,
      xlspResult: xlsp && xlsp.resultItemId,
      match2: m2 && m2.id,
      match3: m3 && m3.id,
    };
  });
  console.log('  T2 recettes prestige →', t2);
  assert(t2.count === 26, `POTION_RECIPES doit compter 26 recettes (obtenu ${t2.count})`);
  assert(t2.xlResult === 'potion_xl',      'brew_xl_tenebres doit produire potion_xl (item existant)');
  assert(t2.xlspResult === 'potion_xl_sp', 'brew_xl_sp_tenebres doit produire potion_xl_sp (item existant)');
  assert(t2.match2 === 'brew_xl_tenebres',     '2 asphodèles noires → brew_xl_tenebres');
  assert(t2.match3 === 'brew_xl_sp_tenebres',  '3 asphodèles noires → brew_xl_sp_tenebres');

  // T3 : brassage effectif de la recette de prestige (INT forcée → réussite).
  const t3 = await page.evaluate(() => {
    party[0].int = 100;
    player.herbs = { herbe_asphodele_noire: 2 };
    player.inventory = [];
    _cauldronMix = { herbe_asphodele_noire: 2 };
    attemptBrew();
    return {
      produced: player.inventory.filter(it => it && it.id === 'potion_xl').length,
      herbsLeft: getHerbCount('herbe_asphodele_noire'),
    };
  });
  console.log('  T3 brassage prestige →', t3);
  assert(t3.produced >= 1, 'le brassage de prestige doit produire au moins 1 potion_xl');
  assert(t3.herbsLeft === 0, 'les herbes rares doivent être consommées');

  // T4 : cueillette gated — tier 4 seulement en Boucle Ténébreuse (11+).
  // Math.random piloté : [monstre, piège, roll(bande herbe), pick, bumper].
  const t4 = await page.evaluate(() => {
    const orig = Math.random;
    const drive = (seq) => { let i = 0; Math.random = () => (i < seq.length ? seq[i++] : 0.5); };
    function pickAt(floor) {
      player.herbs = {}; player.inventory = []; searchedCells = new Map();
      currentFloor = floor;
      // Neutralise la Fortune (D5) : le seuil objet de fouille s'élargit de +F,
      // décalant la bande herbe — ce test ne mesure pas la Fortune.
      felixFortuneSteps = 0; party.forEach(c => { c._fortuneX = 0; });
      drive([0.5, 0.5, 0.40, 0.0, 0.9]);   // bande herbe, pick index 0, simple
      searchRoom();
      return Object.keys(player.herbs)[0] || null;
    }
    const at7  = pickAt(7);
    const at11 = pickAt(11);
    // À l'étage 11, le seul tier 4 est l'asphodèle noire (pick déterministe).
    Math.random = orig;
    return { at7, at11 };
  });
  console.log('  T4 cueillette gated →', t4);
  assert(t4.at7 !== 'herbe_asphodele_noire', 'l\'herbe rare ne se cueille pas à l\'étage 7 (tier 3)');
  assert(t4.at11 === 'herbe_asphodele_noire', 'l\'herbe rare se cueille en Boucle Ténébreuse (étage 11)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Herbe rare OK (tier 4 + recettes prestige + sources + cueillette gated 11+)');
  await browser.close();
}

async function scenarioSlugClub() {
  console.log('\n── Scénario : Slug Club (lien Maison / Slughorn) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Serpentard' });

  // T1 : membership dérivé de seenNpcs — faux avant contact, vrai après.
  const t1 = await page.evaluate(() => {
    seenNpcs.delete('slughorn');
    const before = isSlugClubMember();
    seenNpcs.add('slughorn');
    const after = isSlugClubMember();
    return { before, after };
  });
  console.log('  T1 membership →', t1);
  assert(t1.before === false, 'non-membre avant d\'avoir rencontré Slughorn');
  assert(t1.after === true,   'membre après avoir rencontré Slughorn');

  // T2 : cadence de cueillette — jet bumper 0.30 → double pour un membre,
  // simple pour un non-membre. Math.random piloté :
  // [monstre, piège, roll(bande herbe), pick, bumper=0.30].
  const t2 = await page.evaluate(() => {
    const orig = Math.random;
    const drive = (seq) => { let i = 0; Math.random = () => (i < seq.length ? seq[i++] : 0.5); };
    function harvest(member) {
      if (member) seenNpcs.add('slughorn'); else seenNpcs.delete('slughorn');
      player.herbs = {}; player.inventory = []; searchedCells = new Map();
      currentFloor = 1;
      // Neutralise la Fortune (D5) : elle élargit le seuil objet (décale la
      // bande herbe) et le jet double-herbe — ce test mesure le Slug Club.
      felixFortuneSteps = 0; party.forEach(c => { c._fortuneX = 0; });
      drive([0.5, 0.5, 0.40, 0.0, 0.30]);   // bumper 0.30
      searchRoom();
      return Object.values(player.herbs).reduce((a, b) => a + b, 0);
    }
    const memberYield = harvest(true);
    const nonMember   = harvest(false);
    Math.random = orig;
    return { memberYield, nonMember };
  });
  console.log('  T2 cadence cueillette →', t2);
  assert(t2.memberYield === 2, 'un membre du Slug Club double-récolte au jet 0.30 (seuil 0.35)');
  assert(t2.nonMember === 1,   'un non-membre ne double pas au jet 0.30 (seuil 0.25)');

  // T3 : greeting house-aware — le 1er contact varie selon chosenHouse, via
  // la couche dialoguesByHouse (override de greeting).
  const t3 = await page.evaluate(() => {
    const npc = getNpcById('slughorn');
    function greetFor(house) {
      chosenHouse = house;
      seenNpcs.delete('slughorn');               // force le 1er contact
      const r = _resolveDialogSource(npc, getNpcQuestState(npc));
      const txt = Array.isArray(r.raw) ? r.raw.join(' ') : String(r.raw);
      return { source: r.source, txt };
    }
    const slyth = greetFor('Serpentard');
    const gryff = greetFor('Gryffondor');
    const houseKeys = Object.keys(npc.dialoguesByHouse || {});
    return { slyth, gryff, houseKeys };
  });
  console.log('  T3 greeting house-aware →', t3);
  assert(t3.houseKeys.length === 4, 'Slughorn doit déclarer un greeting pour les 4 Maisons');
  assert(t3.slyth.source === 'greeting' && t3.gryff.source === 'greeting', 'le 1er contact reste un greeting');
  assert(/Serpentard/.test(t3.slyth.txt), 'le greeting Serpentard nomme la Maison');
  assert(/Gryffondor/.test(t3.gryff.txt), 'le greeting Gryffondor nomme la Maison');
  assert(t3.slyth.txt !== t3.gryff.txt,   'le greeting varie selon la Maison');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Slug Club OK (membership seenNpcs + cadence cueillette 25→35 % + greeting house-aware)');
  await browser.close();
}

async function scenarioPotionBuff() {
  console.log('\n── Scénario : Potion de Force (buff ATK temporaire) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : données — potion_force est désormais un temp_buff (plus un heal).
  const t1 = await page.evaluate(() => {
    const it = ITEMS.find(i => i.id === 'potion_force');
    return { effect: it.effect, buffStat: it.buffStat, power: it.power, turns: it.turns,
             hasDef: typeof STATUS_DEFS !== 'undefined' && !!STATUS_DEFS.buff_atk };
  });
  console.log('  T1 données →', t1);
  assert(t1.effect === 'temp_buff', 'potion_force doit avoir effect temp_buff');
  assert(t1.buffStat === 'atk' && t1.power === 8 && t1.turns === 3, 'buff +8 ATK / 3 tours');
  assert(t1.hasDef, 'STATUS_DEFS.buff_atk doit exister');

  // T2 : appliquer la potion → ATK +8, statut posé, survit à un recalc.
  const t2 = await page.evaluate(() => {
    const c = party[0];
    const before = c.atk;
    const pot = { ...ITEMS.find(i => i.id === 'potion_force') };
    _applyConsumableEffect(pot, c);
    const afterApply = c.atk;
    recalculateStats();
    const afterRecalc = c.atk;
    const hasStatus = (c.statusEffects || []).some(s => s.id === 'buff_atk' && s.power === 8);
    return { before, afterApply, afterRecalc, hasStatus };
  });
  console.log('  T2 application + recalc →', t2);
  assert(t2.afterApply === t2.before + 8, 'ATK +8 à l\'application');
  assert(t2.afterRecalc === t2.before + 8, 'le buff doit survivre à recalculateStats');
  assert(t2.hasStatus, 'statut buff_atk (power 8) posé');

  // T3 : l'expiry (tickStatuses) retire le buff et restaure l'ATK.
  const t3 = await page.evaluate(() => {
    const c = party[0];
    const buffed = c.atk;
    const s = c.statusEffects.find(x => x.id === 'buff_atk'); s.turns = 1;
    tickStatuses(c, false);
    const after = c.atk;
    const stillThere = (c.statusEffects || []).some(x => x.id === 'buff_atk');
    recalculateStats();
    return { buffed, after, afterRecalc: c.atk, stillThere };
  });
  console.log('  T3 expiry →', t3);
  assert(t3.after === t3.buffed - 8, 'ATK restaurée (-8) à l\'expiry');
  assert(!t3.stillThere, 'statut buff_atk retiré à l\'expiry');
  assert(t3.afterRecalc === t3.after, 'aucun re-add fantôme après expiry');

  // T4 : pas de stacking (ré-appliquer ne cumule pas au-delà du buff).
  const t4 = await page.evaluate(() => {
    const c = party[0]; recalculateStats(); const base = c.atk;
    const pot = { ...ITEMS.find(i => i.id === 'potion_force') };
    _applyConsumableEffect(pot, c);
    _applyConsumableEffect(pot, c);
    recalculateStats();
    const count = (c.statusEffects || []).filter(s => s.id === 'buff_atk').length;
    return { base, atk: c.atk, count };
  });
  console.log('  T4 pas de stacking →', t4);
  assert(t4.atk === t4.base + 8, 'deux applications ne cumulent pas (+8 seulement)');
  assert(t4.count === 1, 'un seul statut buff_atk actif');

  // T5 : une Potion de Force brassée et concentrée booste davantage.
  const t5 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = (c.statusEffects || []).filter(s => s.id !== 'buff_atk');
    recalculateStats(); const base = c.atk;
    const conc = { ...ITEMS.find(i => i.id === 'potion_force'), brewed: true, brewPotency: 0.40 };
    _applyConsumableEffect(conc, c);
    recalculateStats();
    return { base, atk: c.atk, expected: base + Math.round(8 * 1.40) };
  });
  console.log('  T5 brassée concentrée →', t5);
  assert(t5.atk === t5.expected, 'Potion de Force concentrée (+40 %) → +11 ATK (round(8×1.4))');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Potion de Force OK (buff +ATK, survit au recalc, expiry, no-stack, brassage)');
  await browser.close();
}

async function scenarioPotionResistance() {
  console.log('\n── Scénario : Potion de Résistance + recettes + quête Slughorn 3 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données : bouclier supprimé, résistance présente, icône PNG enregistrée.
  const t1 = await page.evaluate(() => {
    const bouclier = ITEMS.find(i => i.id === 'potion_bouclier');
    const resist   = ITEMS.find(i => i.id === 'potion_resistance');
    return {
      bouclierGone: !bouclier,
      resistEffect: resist && resist.effect,
      resistPower:  resist && resist.power,
      resistTurns:  resist && resist.turns,
      iconNew: typeof ITEM_ICON_NEW_REGISTRY !== 'undefined' && !!ITEM_ICON_NEW_REGISTRY.potion_resistance,
      shopHasResist: typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.some(e => e.id === 'potion_resistance'),
      shopHasBouclier: typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.some(e => e.id === 'potion_bouclier'),
    };
  });
  console.log('  T1 données :', t1);
  assert(t1.bouclierGone, 'potion_bouclier doit être supprimée');
  assert(t1.resistEffect === 'resist_buff' && t1.resistPower === 40 && t1.resistTurns === 3, 'potion_resistance = resist_buff 40/3');
  assert(t1.iconNew, 'potion_resistance doit avoir une icône PNG (ITEM_ICON_NEW_REGISTRY)');
  assert(t1.shopHasResist && !t1.shopHasBouclier, 'le shop référence resistance, plus bouclier');

  // T2 — resist_buff réduit réellement les dégâts physiques (_enemyPhysicalHit).
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c.statusEffects = []; c.def = 0; c.dodgeChance = 0; c.hpMax = 1000; c.hp = 1000;
    shieldTurns = [0, 0]; guardTurns = [0, 0]; currentBattleChar = 0;
    const enemy = { name: 'Mannequin', icon: '🎯', atk: 30, mag: 0 };
    // Sans résistance : capture un dégât de référence (atk fixe, +0..2 alea →
    // on neutralise l'aléa en forçant Math.random à 0 le temps du coup).
    const origRandom = Math.random;
    Math.random = () => 0;
    const hp0 = c.hp; _enemyPhysicalHit(enemy, c, 0); const dmgBase = hp0 - c.hp;
    // Avec résistance 40 %.
    c.hp = 1000;
    _applyConsumableEffect(ITEMS.find(i => i.id === 'potion_resistance'), c);
    const hp1 = c.hp; _enemyPhysicalHit(enemy, c, 0); const dmgResist = hp1 - c.hp;
    Math.random = origRandom;
    return { dmgBase, dmgResist, expected: Math.floor(dmgBase * 0.6) };
  });
  console.log('  T2 mitig.  :', t2);
  assert(t2.dmgBase > 0, 'le coup de référence doit infliger des dégâts');
  assert(t2.dmgResist === t2.expected, `résistance 40 % : ${t2.dmgBase} → attendu ${t2.expected}, obtenu ${t2.dmgResist}`);

  // T3 — nouvelles recettes présentes et matchables par leurs ingrédients.
  const t3 = await page.evaluate(() => {
    const ids = ['brew_elixir_antidote', 'brew_elixir_regen', 'brew_potion_resistance', 'brew_potion_xl_sp'];
    const present = ids.every(id => POTION_RECIPES.some(r => r.id === id));
    // Match par ingrédients (le moteur exige un set exact).
    const rResist = POTION_RECIPES.find(r => r.id === 'brew_potion_resistance');
    const matched = _matchRecipe(rResist.ingredients);
    // Pas de doublon brew_potion_force.
    const forceCount = POTION_RECIPES.filter(r => r.id === 'brew_potion_force').length;
    return { present, matchedId: matched && matched.id, forceCount };
  });
  console.log('  T3 recettes:', t3);
  assert(t3.present, 'les 4 nouvelles recettes doivent exister');
  assert(t3.matchedId === 'brew_potion_resistance', 'le combo doit matcher brew_potion_resistance');
  assert(t3.forceCount === 1, 'pas de doublon brew_potion_force');

  // T4 — quête Slughorn 3 : kill 3 bundimuns → enseigne les recettes avancées.
  const t4 = await page.evaluate(() => {
    // acceptQuest n'impose pas le prereq (gate seulement l'offre PNJ) — on
    // peut accepter directement pour tester le flux récompense → recettes.
    player.knownRecipes = [];
    const accepted = acceptQuest('quest_potions_slughorn_3');
    checkKillQuests('bundimun'); checkKillQuests('bundimun'); checkKillQuests('bundimun');
    const q = activeQuests.find(x => x.id === 'quest_potions_slughorn_3');
    const done = q && q.objectives.every(o => o.completed);
    if (q && done) completeQuest(activeQuests.indexOf(q));
    const known = player.knownRecipes || [];
    return {
      accepted, done,
      learned: ['brew_potion_force', 'brew_potion_resistance', 'brew_potion_xl_sp']
        .every(r => known.includes(r)),
    };
  });
  console.log('  T4 quête   :', t4);
  assert(t4.accepted, 'quest_potions_slughorn_3 doit être acceptable');
  assert(t4.done, 'la quête doit se compléter après 3 bundimuns');
  assert(t4.learned, 'la quête doit enseigner les 3 recettes avancées');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Potion de Résistance OK (item, mitigation, recettes, quête Slughorn 3)');
  await browser.close();
}

async function scenarioThrowablePotions() {
  console.log('\n── Scénario : potions offensives jetables (LOT P6.c) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données + icônes SVG des 3 flacons.
  const t1 = await page.evaluate(() => {
    const feu   = ITEMS.find(i => i.id === 'flacon_feu');
    const givre = ITEMS.find(i => i.id === 'flacon_givre');
    const venin = ITEMS.find(i => i.id === 'flacon_venin');
    const svgOk = ['flacon_feu', 'flacon_givre', 'flacon_venin']
      .every(id => typeof ITEM_ICON_SVG_REGISTRY !== 'undefined' && !!ITEM_ICON_SVG_REGISTRY[id]);
    // Rendu réel via getItemIconHtml : doit retourner un <svg> inline (et pas
    // l'emoji fallback) pour chaque flacon — preuve que l'icône s'affiche.
    const rendersSvg = ['flacon_feu', 'flacon_givre', 'flacon_venin'].every(id => {
      const html = getItemIconHtml(ITEMS.find(i => i.id === id), 'ui-icon-md');
      return /<svg/.test(html) && /svg-icon/.test(html);
    });
    return {
      feu:   feu   && { effect: feu.effect, element: feu.element, power: feu.power, hasStatus: !!feu.statusId },
      givre: givre && { effect: givre.effect, element: givre.element, power: givre.power, statusId: givre.statusId, sp: givre.statusPower, st: givre.statusTurns },
      venin: venin && { effect: venin.effect, element: venin.element || null, power: venin.power, statusId: venin.statusId, sp: venin.statusPower, st: venin.statusTurns },
      svgOk, rendersSvg,
    };
  });
  console.log('  T1 données :', t1);
  assert(t1.feu.effect === 'throw' && t1.feu.element === 'feu' && t1.feu.power === 24 && !t1.feu.hasStatus, 'flacon_feu = throw feu 24, sans statut');
  assert(t1.givre.effect === 'throw' && t1.givre.element === 'glace' && t1.givre.statusId === 'gel' && t1.givre.sp === 3 && t1.givre.st === 3, 'flacon_givre = throw glace 15 + gel 3/3');
  assert(t1.venin.effect === 'throw' && t1.venin.element === null && t1.venin.statusId === 'poison' && t1.venin.sp === 5 && t1.venin.st === 4, 'flacon_venin = throw sans élément + poison 5/4');
  assert(t1.svgOk, 'les 3 flacons doivent avoir une icône SVG inline');
  assert(t1.rendersSvg, 'getItemIconHtml doit rendre un <svg> inline (pas l\'emoji fallback) pour chaque flacon');

  // T2 — _thrownPotionDamage pur : brassage (+40 %), resist (×0.5), weak (×1.5).
  const t2 = await page.evaluate(() => {
    const feu = ITEMS.find(i => i.id === 'flacon_feu');
    const plain   = _thrownPotionDamage(feu, { resist: [], weak: [] });
    const brewed  = _thrownPotionDamage({ ...feu, brewPotency: 0.40 }, { resist: [], weak: [] });
    const resist  = _thrownPotionDamage(feu, { resist: ['feu'], weak: [] });
    const weak    = _thrownPotionDamage(feu, { resist: [], weak: ['feu'] });
    return { plain: plain.dmg, brewed: brewed.dmg, resist: resist.dmg, weak: weak.dmg };
  });
  console.log('  T2 dégâts  :', t2);
  assert(t2.plain === 24, 'flacon_feu de base = 24 dégâts (pas de scaling MAG)');
  assert(t2.brewed === Math.round(24 * 1.40), 'brassage +40 % → round(24×1.4) = 34');
  assert(t2.resist === Math.floor(24 * 0.5), 'cible résistante au feu → ×0.5');
  assert(t2.weak === Math.floor(24 * 1.5), 'cible faible au feu → ×1.5');

  // T3 — throwItemAtEnemy en combat : dégâts appliqués, flacon consommé,
  // statut posé, tour avancé (Math.random=0 pour neutraliser l'aléa ennemi).
  const t3 = await page.evaluate(() => {
    inBattle = true; partySize = 1; currentBattleChar = 0;
    shieldTurns = [0, 0]; guardTurns = [0, 0]; guardRegenCooldown = [0, 0];
    const c = party[0]; c.hp = c.hpMax = 200; c.statusEffects = [];
    enemyGroup = [{ id: 'dummy', name: 'Mannequin', icon: '🎯', hp: 300, currentHp: 300,
                    atk: 5, def: 0, mag: 0, agi: 0, resist: [], weak: [], statusEffects: [] }];
    // Flacon de Givre dans l'inventaire (dégâts + gel).
    player.inventory.push({ ...ITEMS.find(i => i.id === 'flacon_givre') });
    const invIdx = player.inventory.length - 1;
    const beforeHp  = enemyGroup[0].currentHp;
    const beforeQty = _countItems('flacon_givre');
    const origRandom = Math.random; Math.random = () => 0;
    throwItemAtEnemy(invIdx, 0);
    Math.random = origRandom;
    const e = enemyGroup[0];
    return {
      dealt:    beforeHp - e.currentHp,   // 15 dégâts + au moins un tick de gel
      consumed: beforeQty - _countItems('flacon_givre'),
      hasGel:   (e.statusEffects || []).some(s => s.id === 'gel'),
    };
  });
  console.log('  T3 combat  :', t3);
  assert(t3.dealt >= 15, 'le flacon doit infliger au moins ses 15 dégâts directs');
  assert(t3.consumed === 1, 'le flacon doit être consommé (1)');
  assert(t3.hasGel, 'le flacon de givre doit poser le statut gel sur l\'ennemi');

  // T4 — recettes : 26 au total, 3 nouveaux multisets matchables.
  const t4 = await page.evaluate(() => {
    const ids = ['brew_flacon_feu', 'brew_flacon_givre', 'brew_flacon_venin'];
    const present = ids.every(id => POTION_RECIPES.some(r => r.id === id));
    const mFeu   = _matchRecipe({ herbe_aconit: 2 });
    const mGivre = _matchRecipe({ herbe_branchiflore: 2 });
    const mVenin = _matchRecipe({ herbe_ortie: 1, herbe_dictame: 1 });
    return {
      count: POTION_RECIPES.length, present,
      feu: mFeu && mFeu.id, givre: mGivre && mGivre.id, venin: mVenin && mVenin.id,
    };
  });
  console.log('  T4 recettes:', t4);
  assert(t4.count === 26, `POTION_RECIPES doit compter 26 recettes (obtenu ${t4.count})`);
  assert(t4.present, 'les 3 recettes de flacons doivent exister');
  assert(t4.feu === 'brew_flacon_feu' && t4.givre === 'brew_flacon_givre' && t4.venin === 'brew_flacon_venin', 'chaque combo matche sa recette (multisets inédits)');

  // T5 — catalogue boutique.
  const t5 = await page.evaluate(() => ({
    feu:   SHOP_CATALOG.find(e => e.id === 'flacon_feu'),
    givre: SHOP_CATALOG.find(e => e.id === 'flacon_givre'),
    venin: SHOP_CATALOG.find(e => e.id === 'flacon_venin'),
  }));
  console.log('  T5 boutique:', t5);
  assert(t5.feu && t5.feu.minFloor === 3, 'flacon_feu au catalogue (étage 3)');
  assert(t5.givre && t5.givre.minFloor === 3, 'flacon_givre au catalogue (étage 3)');
  assert(t5.venin && t5.venin.minFloor === 4, 'flacon_venin au catalogue (étage 4)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Potions offensives jetables OK (données, dégâts, combat, recettes, boutique)');
  await browser.close();
}

async function scenarioPotionUpgradeCraft() {
  console.log('\n── Scénario : upgrade-craft des potions (chaîne de soin + Éclat) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 — données : items, ressource, recettes, icônes.
  const t1 = await page.evaluate(() => {
    const ids = ['potion_soin_mineure', 'potion_soin_mineure_plus', 'potion_soin_mineure_pp', 'eclat_vitalite'];
    const items = ids.map(id => ITEMS.find(i => i.id === id));
    const recipes = ['brew_potion_soin_mineure', 'brew_potion_soin_mineure_plus', 'brew_potion_soin_mineure_pp',
                     'brew_up_potion_l', 'brew_up_potion_l_sp', 'brew_up_potion_xl', 'brew_up_potion_xl_sp'];
    return {
      itemsOk: items.every(Boolean),
      eclatMaterial: items[3] && items[3].type === 'material',
      heals: [items[0].power, items[1].power, items[2].power],
      recipesOk: recipes.every(rid => POTION_RECIPES.some(r => r.id === rid)),
      iconsOk: ids.every(id => !!ITEM_ICON_NEW_REGISTRY[id]),
      count: POTION_RECIPES.length,
    };
  });
  console.log('  T1 données :', t1);
  assert(t1.itemsOk && t1.eclatMaterial, 'chaîne Mineure + Éclat (material) présents');
  assert(t1.heals[0] === 15 && t1.heals[1] === 30 && t1.heals[2] === 55, 'paliers de soin 15/30/55');
  assert(t1.recipesOk, 'les 7 recettes P4 doivent exister');
  assert(t1.iconsOk, 'les 4 nouveaux items doivent avoir une icône PNG');
  assert(t1.count === 26, `POTION_RECIPES doit compter 26 recettes (obtenu ${t1.count})`);

  // T2 — pas de collision d'ingrédients (chaque set est unique).
  const t2 = await page.evaluate(() => {
    const seen = {}; let dup = null;
    for (const r of POTION_RECIPES) {
      const key = Object.keys(r.ingredients).sort().map(k => k + ':' + r.ingredients[k]).join('|');
      if (seen[key]) dup = [seen[key], r.id]; seen[key] = r.id;
    }
    return { dup };
  });
  console.log('  T2 collision:', t2);
  assert(!t2.dup, `aucune collision d'ingrédients (${JSON.stringify(t2.dup)})`);

  // T3 — upgrade-craft : potion_s (sac) + eclat (sac) → potion_l.
  const t3 = await page.evaluate(() => {
    // INT élevée pour garantir la réussite du jet.
    party[0].int = 99;
    player.herbs = {};
    player.inventory = player.inventory.filter(i => i.id !== 'potion_l');
    player.inventory.push({ ...ITEMS.find(i => i.id === 'potion_s') });
    player.inventory.push({ ...ITEMS.find(i => i.id === 'eclat_vitalite') });
    const sBefore = player.inventory.filter(i => i.id === 'potion_s').length;
    const eBefore = player.inventory.filter(i => i.id === 'eclat_vitalite').length;
    const matched = _matchRecipe({ potion_s: 1, eclat_vitalite: 1 });
    _cauldronMix = { potion_s: 1, eclat_vitalite: 1 };
    attemptBrew();
    return {
      matchedId: matched && matched.id,
      sBefore, eBefore,
      sAfter: player.inventory.filter(i => i.id === 'potion_s').length,
      eAfter: player.inventory.filter(i => i.id === 'eclat_vitalite').length,
      gotL: player.inventory.some(i => i.id === 'potion_l'),
    };
  });
  console.log('  T3 upgrade :', t3);
  assert(t3.matchedId === 'brew_up_potion_l', 'potion_s + eclat doit matcher brew_up_potion_l');
  assert(t3.sAfter === t3.sBefore - 1 && t3.eAfter === t3.eBefore - 1, 'ingrédients (potion + éclat) consommés depuis le sac');
  assert(t3.gotL, 'le brassage doit produire potion_l');

  // T4 — _ingredientCount lit une potion depuis le sac (pas la besace).
  const t4 = await page.evaluate(() => {
    player.inventory = player.inventory.filter(i => i.id !== 'potion_soin_mineure');
    player.inventory.push({ ...ITEMS.find(i => i.id === 'potion_soin_mineure') });
    return { count: _ingredientCount('potion_soin_mineure'), herbCount: _ingredientCount('herbe_armoise') };
  });
  console.log('  T4 lecture :', t4);
  assert(t4.count === 1, '_ingredientCount doit lire une potion depuis le sac');

  // T5 — chaîne Mineure : Mineure + eclat → Mineure+.
  const t5 = await page.evaluate(() => {
    party[0].int = 99; player.herbs = {};
    player.inventory = player.inventory.filter(i => i.id !== 'potion_soin_mineure_plus');
    player.inventory.push({ ...ITEMS.find(i => i.id === 'potion_soin_mineure') });
    player.inventory.push({ ...ITEMS.find(i => i.id === 'eclat_vitalite') });
    _cauldronMix = { potion_soin_mineure: 1, eclat_vitalite: 1 };
    attemptBrew();
    return { gotPlus: player.inventory.some(i => i.id === 'potion_soin_mineure_plus') };
  });
  console.log('  T5 chaîne  :', t5);
  assert(t5.gotPlus, 'Mineure + Éclat doit produire Mineure +');

  // T6 — Éclat non buvable (material refusé par useItem).
  const t6 = await page.evaluate(() => {
    const c = party[0]; c.hpMax = 100; c.hp = 50;
    player.inventory = [{ ...ITEMS.find(i => i.id === 'eclat_vitalite') }];
    useItem(0, false);
    return { hp: c.hp, stillThere: player.inventory.some(i => i.id === 'eclat_vitalite') };
  });
  console.log('  T6 material:', t6);
  assert(t6.hp === 50 && t6.stillThere, 'Éclat de Vitalité ne doit pas être consommable directement');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Upgrade-craft OK (chaîne soin, potion-ingrédient, Éclat, no-collision)');
  await browser.close();
}

async function scenarioHerbGarden() {
  console.log('\n── Scénario : jardin d\'herbes à récolte passive (Potions P6.b3) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Événement d'étage neutre pour une génération déterministe : un 'marche'
  // transformerait toutes les salles d'épine en boutiques (aucune salle FLOOR
  // libre → jardin non posé). On fige donc l'événement à null.
  await page.evaluate(() => { rollFloorEvent = () => null; });

  // T1 : génération — l'étage 3 pose au moins un CELL.GARDEN, caché ;
  //      l'étage 2 (cycle fontaine) n'en pose aucun.
  const t1 = await page.evaluate(() => {
    hiddenGardens = new Set();
    currentFloor = 3; floorDungeons = {};
    generateDungeon(3);
    let gx = -1, gy = -1, count = 0;
    for (let y = 0; y < dungeon.length; y++)
      for (let x = 0; x < dungeon[y].length; x++)
        if (dungeon[y][x] === CELL.GARDEN) { count++; if (gx === -1) { gx = x; gy = y; } }
    const hidden = gx !== -1 && hiddenGardens.has(`3,${gx},${gy}`);
    hiddenGardens = new Set();
    currentFloor = 2; floorDungeons = {};
    generateDungeon(2);
    let f2 = 0;
    for (let y = 0; y < dungeon.length; y++)
      for (let x = 0; x < dungeon[y].length; x++)
        if (dungeon[y][x] === CELL.GARDEN) f2++;
    return { gardenEnum: CELL.GARDEN, count, hidden, f2 };
  });
  console.log('  T1 génération →', t1);
  assert(t1.gardenEnum === 15, 'CELL.GARDEN doit valoir 15');
  assert(t1.count >= 1,        'au moins un jardin sur l\'étage 3');
  assert(t1.hidden,            'le jardin posé doit être caché (clé dans hiddenGardens)');
  assert(t1.f2 === 0,          'aucun jardin sur l\'étage 2 (cycle 3/6/9…)');

  // T2 : caché = comportement sol — gardenHiddenAt true, l'entrée n'ouvre PAS l'overlay.
  const t2 = await page.evaluate(() => {
    currentFloor = 3; floorDungeons = {}; hiddenGardens = new Set();
    generateDungeon(3);
    let gx = -1, gy = -1;
    for (let y = 0; y < dungeon.length && gx === -1; y++)
      for (let x = 0; x < dungeon[y].length && gx === -1; x++)
        if (dungeon[y][x] === CELL.GARDEN) { gx = x; gy = y; }
    playerX = gx; playerY = gy; inBattle = false;
    const hiddenBefore = gardenHiddenAt(gx, gy);
    _hideExploreOverlay();
    handleCellEntry(CELL.GARDEN);
    const ov = document.getElementById('explore-overlay');
    const overlayShown = !!ov && getComputedStyle(ov).display !== 'none';
    return { hiddenBefore, overlayShown };
  });
  console.log('  T2 caché=sol →', t2);
  assert(t2.hiddenBefore === true,  'gardenHiddenAt doit être true tant que caché');
  assert(t2.overlayShown === false, 'un jardin caché ne doit PAS ouvrir l\'overlay');

  // T3 : Revelio dévoile un jardin dans le rayon 5×5 et arme l'éveil.
  const t3 = await page.evaluate(() => {
    currentFloor = 3; floorDungeons = {}; hiddenGardens = new Set();
    gardenDiscovered = false; gardenStock = 0;
    generateDungeon(3);
    let gx = -1, gy = -1;
    for (let y = 0; y < dungeon.length && gx === -1; y++)
      for (let x = 0; x < dungeon[y].length && gx === -1; x++)
        if (dungeon[y][x] === CELL.GARDEN) { gx = x; gy = y; }
    playerX = gx; playerY = gy; party[0].sp = 20;
    const keyBefore = hiddenGardens.has(`3,${gx},${gy}`);
    castSpellOutOfCombat('Revelio', 0);
    return { keyBefore, keyAfter: hiddenGardens.has(`3,${gx},${gy}`), discovered: gardenDiscovered };
  });
  console.log('  T3 Revelio →', t3);
  assert(t3.keyBefore === true,  'le jardin doit être caché avant Revelio');
  assert(t3.keyAfter === false,  'Revelio doit révéler le jardin du rayon');
  assert(t3.discovered === true, 'la 1re révélation doit armer gardenDiscovered');

  // T4 : la fouille (searchRoom) révèle aussi un jardin (rayon adjacent).
  const t4 = await page.evaluate(() => {
    currentFloor = 3; floorDungeons = {}; hiddenGardens = new Set();
    gardenDiscovered = false;
    generateDungeon(3);
    let gx = -1, gy = -1;
    for (let y = 0; y < dungeon.length && gx === -1; y++)
      for (let x = 0; x < dungeon[y].length && gx === -1; x++)
        if (dungeon[y][x] === CELL.GARDEN) { gx = x; gy = y; }
    playerX = gx; playerY = gy; inBattle = false;
    // Génération non seedée : un piège (priorité « désamorçage ») ou un mur
    // secret (priorité « passage ») peut atterrir dans les 8 cases adjacentes
    // au jardin et court-circuiter searchRoom avant la révélation du jardin.
    // On neutralise ces interactables prioritaires autour du jardin pour
    // isoler le comportement testé (révélation par fouille), sans toucher au
    // runtime — l'ordre de priorité réel reste correct.
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const tx = gx + dx, ty = gy + dy;
        if (ty < 0 || tx < 0 || ty >= dungeon.length || tx >= dungeon[ty].length) continue;
        if (dungeon[ty][tx] === CELL.TRAP) dungeon[ty][tx] = CELL.FLOOR;
        if (typeof secretWalls !== 'undefined' && secretWalls) secretWalls.delete(`${tx},${ty}`);
      }
    const keyBefore = hiddenGardens.has(`3,${gx},${gy}`);
    searchRoom();
    return { keyBefore, keyAfter: hiddenGardens.has(`3,${gx},${gy}`), discovered: gardenDiscovered };
  });
  console.log('  T4 fouille →', t4);
  assert(t4.keyBefore === true, 'le jardin doit être caché avant la fouille');
  assert(t4.keyAfter === false, 'searchRoom doit révéler un jardin adjacent');

  // T5 : accumulation par pas — +1 tous les GARDEN_STEP_INTERVAL pas, plafonnée.
  const t5 = await page.evaluate(() => {
    // Corridor dégagé sur une rangée + enemyMap vidé pour des pas déterministes.
    const row = 8;
    for (let x = 0; x < dungeon[row].length; x++) {
      dungeon[row][x] = CELL.FLOOR;
      if (enemyMap[row]) enemyMap[row][x] = null;
    }
    inBattle = false; gardenDiscovered = true; playerDir = 'e'; playerY = row;
    const walk = (steps) => { for (let i = 0; i < steps; i++) moveForward(); };
    // +1 après un intervalle complet
    playerX = 1; stepCount = 0; gardenStock = 0;
    walk(GARDEN_STEP_INTERVAL);
    const afterInterval = gardenStock;
    // pas d'incrément avant l'intervalle
    playerX = 1; stepCount = 0; gardenStock = 0;
    walk(GARDEN_STEP_INTERVAL - 1);
    const beforeInterval = gardenStock;
    // plafond : déjà au max, un intervalle de plus ne dépasse pas
    playerX = 1; stepCount = 0; gardenStock = GARDEN_CAP;
    walk(GARDEN_STEP_INTERVAL);
    return { afterInterval, beforeInterval, capped: gardenStock, cap: GARDEN_CAP, interval: GARDEN_STEP_INTERVAL };
  });
  console.log('  T5 accumulation par pas →', t5);
  assert(t5.afterInterval === 1,        'un intervalle complet doit ajouter 1 herbe');
  assert(t5.beforeInterval === 0,       'avant l\'intervalle complet, rien n\'est ajouté');
  assert(t5.capped === t5.cap,          'le pas ne doit pas dépasser GARDEN_CAP');

  // T6 : accumulation par descente — +GARDEN_DESCENT_BONUS, plafonnée.
  // onArrive() (qui ajoute le bonus) s'exécute dans le callback différé de
  // _floorTransition, donc on attend que gardenStock se stabilise.
  const t6 = await page.evaluate(() => {
    return new Promise(resolve => {
      currentFloor = 4; gardenDiscovered = true; gardenStock = 0; inBattle = false;
      goDeeper();
      let tries = 0;
      const wait = () => {
        if (gardenStock > 0 || tries++ > 40) {
          resolve({ gained: gardenStock, bonus: GARDEN_DESCENT_BONUS, floor: currentFloor });
        } else setTimeout(wait, 50);
      };
      setTimeout(wait, 50);
    });
  });
  console.log('  T6 accumulation par descente →', t6);
  assert(t6.gained === t6.bonus, 'une descente doit ajouter GARDEN_DESCENT_BONUS herbes');

  // T7 : récolte — verse le pool en herbes du palier de l'étage, remet le stock à 0.
  const t7 = await page.evaluate(() => {
    currentFloor = 5; // palier T2
    hiddenGardens = new Set();
    playerX = 6; playerY = 6; dungeon[6][6] = CELL.GARDEN; inBattle = false;
    player.herbs = {}; gardenStock = 5;
    const tier = (currentFloor >= 11) ? 4 : (currentFloor >= 7) ? 3 : (currentFloor >= 4) ? 2 : 1;
    useGarden();
    const total = Object.values(player.herbs || {}).reduce((a, b) => a + b, 0);
    const allTier = Object.keys(player.herbs).every(id => {
      const it = ITEMS.find(i => i.id === id);
      return it && it.type === 'herb' && it.tier === tier;
    });
    // jardin trop jeune : un 2nd appel à stock 0 n'ajoute rien
    const beforeEmpty = total;
    useGarden();
    const afterEmpty = Object.values(player.herbs || {}).reduce((a, b) => a + b, 0);
    return { total, stock: gardenStock, allTier, tier, noOp: afterEmpty === beforeEmpty };
  });
  console.log('  T7 récolte →', t7);
  assert(t7.total === 5,   'la récolte doit verser tout le pool (5 herbes)');
  assert(t7.stock === 0,   'le pool doit retomber à 0 après récolte');
  assert(t7.allTier,       'les herbes récoltées doivent être du palier de l\'étage (T2 à l\'étage 5)');
  assert(t7.noOp,          'récolter un jardin vide ne doit rien ajouter');

  // T8 : round-trip de save — hiddenGardens / gardenStock / gardenDiscovered persistés.
  const t8 = await page.evaluate(() => {
    hiddenGardens = new Set(['3,4,4', '6,7,7']);
    gardenStock = 7; gardenDiscovered = true;
    const gs = _serializeState();
    hiddenGardens = new Set(); gardenStock = 0; gardenDiscovered = false;
    _applyState(gs);
    return {
      keys: Array.from(hiddenGardens).sort(),
      stock: gardenStock,
      discovered: gardenDiscovered
    };
  });
  console.log('  T8 round-trip save →', t8);
  assert(JSON.stringify(t8.keys) === JSON.stringify(['3,4,4', '6,7,7']),
    'hiddenGardens doit survivre au round-trip de save');
  assert(t8.stock === 7,         'gardenStock doit survivre au round-trip de save');
  assert(t8.discovered === true, 'gardenDiscovered doit survivre au round-trip de save');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ jardin d\'herbes : génération cachée, révélation Revelio/fouille, accumulation pas+descente plafonnée, récolte au palier, round-trip save');
  await browser.close();
}

async function scenarioGardenQuest() {
  console.log('\n── Scénario : chaîne de quêtes du jardin (Chourave) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : Quête A — accept ; objectif discover_garden complété à la découverte.
  const t1 = await page.evaluate(() => {
    activeQuests = []; completedQuests = new Set(); lastQuestCompletion = {};
    availableQuests = new Set(QUEST_TEMPLATES.filter(t => !t.houseSetQuest).map(t => t.id));
    gardenDiscovered = false;
    const accepted = acceptQuest('quest_garden_sprout');
    const q = activeQuests.find(x => x.id === 'quest_garden_sprout');
    const type = q && q.objectives[0].type;
    const readyBefore = !!q && q.objectives.every(o => o.completed);
    gardenDiscovered = true;
    checkGardenQuests();
    const readyAfter = !!q && q.objectives.every(o => o.completed);
    return { accepted, type, readyBefore, readyAfter };
  });
  console.log('  T1 quête A (découverte) →', t1);
  assert(t1.accepted,                 'acceptQuest(quest_garden_sprout) doit réussir');
  assert(t1.type === 'discover_garden','objectif A doit être de type discover_garden');
  assert(t1.readyBefore === false,    'objectif A non rempli avant découverte');
  assert(t1.readyAfter === true,      'découverte du jardin doit compléter l\'objectif A');

  // T2 : remise de A apprend la recette ; B (prereq A) verrouillée avant, offerable après.
  const t2 = await page.evaluate(() => {
    player.knownRecipes = [];
    const bOfferableBefore = isQuestOfferable('quest_garden_sprout_2');
    const idx = activeQuests.findIndex(x => x.id === 'quest_garden_sprout');
    completeQuest(idx);
    return {
      bOfferableBefore,
      learned:        (player.knownRecipes || []).includes('brew_elixir_regen'),
      aDone:          completedQuests.has('quest_garden_sprout'),
      bOfferableAfter: isQuestOfferable('quest_garden_sprout_2')
    };
  });
  console.log('  T2 remise A + déblocage B →', t2);
  assert(t2.bOfferableBefore === false, 'B doit rester verrouillée tant que A n\'est pas rendue (prereq)');
  assert(t2.learned,                    'la remise de A doit apprendre brew_elixir_regen');
  assert(t2.aDone,                       'A doit passer dans completedQuests');
  assert(t2.bOfferableAfter === true,   'B doit devenir offerable une fois A rendue');

  // T3 : Quête B — besace insuffisante → puis suffisante ; remise consomme 4 herbes.
  const t3 = await page.evaluate(() => {
    acceptQuest('quest_garden_sprout_2');
    const q = activeQuests.find(x => x.id === 'quest_garden_sprout_2');
    const type = q.objectives[0].type;
    player.herbs = { herbe_armoise: 2 };
    _refreshObjectives();
    const readyLow = q.objectives.every(o => o.completed);
    player.herbs = { herbe_armoise: 3, herbe_ortie: 2 }; // total 5 ≥ 4
    _refreshObjectives();
    const readyHigh = q.objectives.every(o => o.completed);
    const before = Object.values(player.herbs).reduce((a, b) => a + b, 0);
    const goldBefore = player.gold;
    const idx = activeQuests.findIndex(x => x.id === 'quest_garden_sprout_2');
    completeQuest(idx);
    const after = Object.values(player.herbs || {}).reduce((a, b) => a + b, 0);
    return {
      type, readyLow, readyHigh,
      consumed: before - after,
      goldGain: player.gold - goldBefore,
      repeatRecorded: lastQuestCompletion['quest_garden_sprout_2'] !== undefined
    };
  });
  console.log('  T3 quête B (cueillette répétable) →', t3);
  assert(t3.type === 'herb',     'objectif B doit être de type herb');
  assert(t3.readyLow === false,  'besace < 4 herbes → objectif B non rempli');
  assert(t3.readyHigh === true,  'besace ≥ 4 herbes → objectif B rempli');
  assert(t3.consumed === 4,      'la remise de B doit consommer exactement 4 herbes de la besace');
  assert(t3.goldGain === 120,    'la 1re remise de B doit verser 120 Gallions');
  assert(t3.repeatRecorded,      'B répétable : lastQuestCompletion enregistré à la remise');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ chaîne jardin : A découverte → recette, B prereq + répétable, conso besace 4 herbes');
  await browser.close();
}

async function scenarioHerbEconomy() {
  console.log('\n── Scénario : économie des herbes (besace / boutique / cueillette) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : acheter une herbe la route vers la besace (player.herbs), PAS le sac.
  const t1 = await page.evaluate(() => {
    player.herbs = {};
    player.inventory = [];
    player.gold = 1000;
    const herb = ITEMS.find(i => i.id === 'herbe_armoise');
    const goldBefore = player.gold;
    _purchase(herb, herb.price, null);
    return {
      herbCount: getHerbCount('herbe_armoise'),
      invLen:    player.inventory.length,
      goldDelta: goldBefore - player.gold,
      price:     herb.price
    };
  });
  console.log('  T1 achat herbe →', t1);
  assert(t1.herbCount === 1,        'herbe achetée doit aller dans la besace (+1)');
  assert(t1.invLen === 0,           'herbe achetée ne doit PAS occuper de slot du sac');
  assert(t1.goldDelta === t1.price, 'or débité doit valoir le prix de l\'herbe');

  // T2 : sac plein (16) — l'achat d'herbe reste possible (besace illimitée).
  const t2 = await page.evaluate(() => {
    player.inventory = [];
    const filler = ITEMS.find(i => i.id === 'potion_s');
    for (let k = 0; k < 16; k++) player.inventory.push({ ...filler });
    player.gold = 1000;
    const herb = ITEMS.find(i => i.id === 'herbe_ortie');
    const before = getHerbCount('herbe_ortie');
    _purchase(herb, herb.price, null);
    return { invLen: player.inventory.length, gained: getHerbCount('herbe_ortie') - before };
  });
  console.log('  T2 sac plein →', t2);
  assert(t2.invLen === 16, 'le sac plein ne doit pas changer de taille à l\'achat d\'herbe');
  assert(t2.gained === 1,  'l\'herbe doit s\'ajouter à la besace malgré le sac plein');

  // T3 : herbe ré-achetable — elle ne quitte PAS le stock de la boutique fixe.
  const t3 = await page.evaluate(() => {
    const herb  = ITEMS.find(i => i.id === 'herbe_armoise');
    const entry = { item: { ...herb }, price: herb.price, sold: false };
    shopStock = [entry];
    player.gold = 1000;
    const lenBefore = shopStock.length;
    _purchase(herb, herb.price, entry);
    return { lenBefore, lenAfter: shopStock.length, stillIn: shopStock.includes(entry) };
  });
  console.log('  T3 ré-achat →', t3);
  assert(t3.lenAfter === t3.lenBefore, 'une herbe achetée ne doit pas quitter le stock');
  assert(t3.stillIn,                   'l\'entrée herbe doit rester dans shopStock (ré-achat)');

  // T4 : catalogue — les 6 herbes y figurent avec déblocage par palier.
  const t4 = await page.evaluate(() => {
    const find = id => SHOP_CATALOG.find(e => e.id === id);
    return {
      armoise:      find('herbe_armoise')      && find('herbe_armoise').minFloor,
      ortie:        find('herbe_ortie')        && find('herbe_ortie').minFloor,
      asphodele:    find('herbe_asphodele')    && find('herbe_asphodele').minFloor,
      branchiflore: find('herbe_branchiflore') && find('herbe_branchiflore').minFloor,
      aconit:       find('herbe_aconit')       && find('herbe_aconit').minFloor,
      dictame:      find('herbe_dictame')      && find('herbe_dictame').minFloor
    };
  });
  console.log('  T4 catalogue →', t4);
  assert(t4.armoise === 1 && t4.ortie === 1,             'herbes T1 débloquées étage 1');
  assert(t4.asphodele === 4 && t4.branchiflore === 4,    'herbes T2 débloquées étage 4');
  assert(t4.aconit === 7 && t4.dictame === 7,            'herbes T3 débloquées étage 7');

  // T5 : cueillette (searchRoom) — peut rendre 2 herbes sur jet chanceux.
  // Math.random piloté : [monstre, piège, roll(bande herbe), pick, bumper<0.25].
  const t5 = await page.evaluate(() => {
    player.herbs = {};
    player.inventory = [];
    currentFloor = 1;
    searchedCells = new Map();   // case vierge → !repeat
    // Neutralise la Fortune (D5) : elle décale la bande herbe et le jet double.
    felixFortuneSteps = 0; party.forEach(c => { c._fortuneX = 0; });
    const orig = Math.random;
    const drive = (seq) => { let i = 0; Math.random = () => (i < seq.length ? seq[i++] : 0.5); };
    // Jet chanceux : bumper 0.1 < 0.25 → double récolte.
    drive([0.5, 0.5, 0.40, 0.0, 0.1]);
    const before2 = Object.values(player.herbs).reduce((a, b) => a + b, 0);
    searchRoom();
    const lucky = Object.values(player.herbs).reduce((a, b) => a + b, 0) - before2;
    // Jet normal : bumper 0.9 ≥ 0.25 → simple récolte (nouvelle case vierge).
    player.herbs = {}; searchedCells = new Map();
    drive([0.5, 0.5, 0.40, 0.0, 0.9]);
    searchRoom();
    const single = Object.values(player.herbs).reduce((a, b) => a + b, 0);
    Math.random = orig;
    return { lucky, single, invLen: player.inventory.length };
  });
  console.log('  T5 cueillette →', t5);
  assert(t5.lucky === 2,  'un jet chanceux de cueillette doit rendre 2 herbes');
  assert(t5.single === 1, 'un jet normal de cueillette doit rendre 1 herbe');
  assert(t5.invLen === 0, 'les herbes cueillies vont dans la besace, pas le sac');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Économie des herbes OK (besace + sac plein + ré-achat + catalogue + cueillette double)');
  await browser.close();
}

// P6 §1.1 — Potion AOE (joueur) + potion de soin (IA ennemie).
async function scenarioPotionAoe() {
  console.log('\n── Scénario : Potions AOE + potion ennemie (P6 §1.1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // A) Flacon de Feu Grégeois (aoe:true) → frappe TOUT le groupe ennemi.
  await startDummyFight(page);
  const aoe = await page.evaluate(() => {
    const out = { threw: false };
    try {
      const item = ITEMS.find(i => i.id === 'flacon_grec');
      out.itemAoe = !!(item && item.aoe && item.effect === 'throw');
      const mk = (n) => ({ id: 'test_dummy', name: n, icon: '🎯', hp: 50, currentHp: 50, atk: 1, def: 0, resist: [], weak: [], statusEffects: [] });
      enemyGroup = [mk('A'), mk('B'), mk('C')];
      currentBattleChar = 0;
      player.inventory.push({ ...item });
      const idx = player.inventory.findIndex(i => i.id === 'flacon_grec');
      const before = enemyGroup.map(e => e.currentHp);
      throwItemAtEnemy(idx, -1);   // chemin AOE
      out.before = before;
      out.after  = enemyGroup.map(e => e.currentHp);
      out.consumed = player.inventory.findIndex(i => i.id === 'flacon_grec') === -1;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  A AOE:', aoe);
  assert(!aoe.threw, 'A throw: ' + (aoe.err || ''));
  assert(aoe.itemAoe, 'A flacon_grec doit être un throw aoe');
  assert(aoe.after.length === 3 && aoe.after.every((hp, i) => hp < aoe.before[i]),
    'A le flacon AOE doit toucher les 3 ennemis');
  assert(aoe.consumed, 'A le flacon AOE doit être consommé');

  // B) Mangemort entamé boit une potion ; la réserve s'épuise ; PV hauts → ne boit pas.
  const enemy = await page.evaluate(() => {
    const out = { threw: false, log: [] };
    try {
      const e = {
        id: 'mangemort', name: 'TestMangemort', icon: '💀', hp: 100, currentHp: 30, atk: 5, def: 0,
        resist: [], weak: [], statusEffects: [],
        abilities: [{ name: 'Potion de Soin', icon: '🧪', effect: 'consumable', potion: 'heal', power: 20, chance: 1, uses: 2 }],
      };
      enemyGroup = [e];
      const append = (s) => out.log.push(s);
      const tgt = party[0];
      out.r1 = tryEnemyAbility(e, tgt, 0, append); out.hp1 = e.currentHp; out.pot1 = e._potionsLeft;
      out.r2 = tryEnemyAbility(e, tgt, 0, append); out.hp2 = e.currentHp; out.pot2 = e._potionsLeft;
      out.r3 = tryEnemyAbility(e, tgt, 0, append); out.hp3 = e.currentHp; out.pot3 = e._potionsLeft;
      // PV hauts → ne gaspille pas la potion (même avec réserve réarmée).
      e.currentHp = 95; e._potionsLeft = 2;
      out.r4 = tryEnemyAbility(e, tgt, 0, append); out.hp4 = e.currentHp;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  B potion ennemie:', { r1: enemy.r1, hp1: enemy.hp1, pot1: enemy.pot1, hp2: enemy.hp2, pot2: enemy.pot2, r3: enemy.r3, hp3: enemy.hp3, r4: enemy.r4, hp4: enemy.hp4 });
  assert(!enemy.threw, 'B throw: ' + (enemy.err || ''));
  assert(enemy.r1 === true && enemy.hp1 === 50 && enemy.pot1 === 1, 'B 1re potion : +20 PV, réserve 1');
  assert(enemy.hp2 === 70 && enemy.pot2 === 0, 'B 2e potion : +20 PV, réserve 0');
  assert(enemy.r3 === false && enemy.hp3 === 70, 'B réserve vide → pas de soin (attaque normale)');
  assert(enemy.r4 === false && enemy.hp4 === 95, 'B PV hauts → ne boit pas (attaque normale)');
  assert(enemy.log.some(l => l.includes('boit')), 'B log « boit une potion » attendu');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('erreurs JS (potions AOE / IA)');
  }
  console.log('  ✅ Potions AOE + potion ennemie (P6 §1.1) OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioBrewing, scenarioRecipeCodex, scenarioRareHerb, scenarioSlugClub, scenarioPotionBuff, scenarioPotionResistance, scenarioThrowablePotions, scenarioPotionUpgradeCraft, scenarioHerbGarden, scenarioGardenQuest, scenarioHerbEconomy, scenarioPotionAoe] };
