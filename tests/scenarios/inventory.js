// ============================================================
// Scénarios smoke — domaine « inventory » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioPartyEquipRow() {
  console.log('\n── Scénario 2ter : mini-équipement party-card ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 3 cellules présentes dans le DOM
  const t1 = await page.evaluate(() => {
    const row = document.getElementById('equip-row-0');
    if (!row) return { rowExists: false };
    const cells = row.querySelectorAll('.party-equip-slot');
    const slots = Array.from(cells).map(c => c.getAttribute('data-slot'));
    return { rowExists: true, count: cells.length, slots };
  });
  console.log('  T1 DOM:', t1);
  assert(t1.rowExists, '#equip-row-0 absent du DOM');
  assert(t1.count === 3, `attendu 3 cellules, obtenu ${t1.count}`);
  assert(t1.slots.includes('wand') && t1.slots.includes('body') && t1.slots.includes('amulet'),
    `slots attendus wand/body/amulet, obtenus ${t1.slots}`);

  // T2 : équiper une wand → cell wand a .filled
  const t2 = await page.evaluate(() => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    party[0].equipped.wand = JSON.parse(JSON.stringify(wand));
    if (typeof recalculateStats === 'function') recalculateStats();
    updateUI();
    const cell = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    return {
      filled:    cell ? cell.classList.contains('filled') : false,
      hasImg:    cell ? !!cell.querySelector('img') : false,
      title:     cell ? cell.getAttribute('title') : null
    };
  });
  console.log('  T2 equip:', t2);
  assert(t2.filled, 'cell wand doit avoir la classe .filled après équipement');
  assert(t2.hasImg, 'cell wand doit contenir une image (icon)');

  // T3 : déséquiper → .filled retiré
  const t3 = await page.evaluate(() => {
    party[0].equipped.wand = null;
    if (typeof recalculateStats === 'function') recalculateStats();
    updateUI();
    const cell = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    return { filled: cell ? cell.classList.contains('filled') : false };
  });
  console.log('  T3 unequip:', t3);
  assert(!t3.filled, 'cell wand doit perdre .filled après déséquipement');

  // T4 (Vague D) : tooltip riche au survol de la mini-équipement.
  // — slot rempli → tooltip avec nom item + rareté + bonuses
  // — slot vide   → tooltip "Slot libre" + désc helper
  const t4 = await page.evaluate(async () => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    party[0].equipped.wand = JSON.parse(JSON.stringify(wand));
    if (typeof recalculateStats === 'function') recalculateStats();
    updateUI();
    const cell = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    const rect = cell.getBoundingClientRect();
    const ev = new MouseEvent('mouseover', {
      bubbles: true, cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    });
    cell.dispatchEvent(ev);
    await new Promise(r => setTimeout(r, 60));
    const tt = document.getElementById('ux-tooltip');
    const filledHtml = tt && tt.classList.contains('visible') ? tt.innerHTML : null;
    // Vide
    party[0].equipped.wand = null;
    updateUI();
    const cell2 = document.querySelector('#equip-row-0 .party-equip-slot[data-slot="wand"]');
    const rect2 = cell2.getBoundingClientRect();
    cell2.dispatchEvent(new MouseEvent('mouseover', {
      bubbles: true, cancelable: true,
      clientX: rect2.left + rect2.width / 2,
      clientY: rect2.top + rect2.height / 2
    }));
    await new Promise(r => setTimeout(r, 60));
    const tt2 = document.getElementById('ux-tooltip');
    const emptyHtml = tt2 && tt2.classList.contains('visible') ? tt2.innerHTML : null;
    return { filledHtml, emptyHtml };
  });
  console.log('  T4 tooltip:', { filled: !!t4.filledHtml, empty: !!t4.emptyHtml });
  assert(t4.filledHtml, 'tooltip riche doit apparaître au survol d\'un slot rempli');
  assert(/Baguette de Saule/.test(t4.filledHtml || ''), 'tooltip doit nommer l\'item équipé');
  assert(t4.emptyHtml,  'tooltip "Slot libre" doit apparaître au survol d\'un slot vide');
  assert(/Slot libre/.test(t4.emptyHtml || ''), 'tooltip vide doit mentionner "Slot libre"');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ party-equip-row conforme (DOM + tooltip riche)');
  await browser.close();
}

async function scenarioTryAddItem() {
  console.log('\n── Scénario 13b : tryAddItem ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page);

  const t1 = await page.evaluate(() => {
    player.inventory = [];
    const r1 = tryAddItem('potion_s', { silent: true });        // nouveau stack
    const r2 = tryAddItem('potion_s', { silent: true });        // fusionne → qty 2
    const r3 = tryAddItem('robe1',    { silent: true });        // équipement → case distincte
    const r4 = tryAddItem('idée_inexistante', { silent: true });
    const stack = player.inventory.find(e => e.id === 'potion_s');
    return { r1, r2, r3, r4, len: player.inventory.length, qty: stack ? (stack.qty || 1) : 0 };
  });
  console.log('  T1 ajouts simples :', t1);
  assert(t1.r1 === true,  'tryAddItem doit accepter un id valide');
  assert(t1.r2 === true,  'tryAddItem doit accepter un 2e exemplaire (fusion)');
  assert(t1.r3 === true,  'tryAddItem doit accepter un équipement');
  assert(t1.r4 === false, 'tryAddItem doit refuser un id inconnu');
  assert(t1.len === 2,    'potion_s empilée (1 case) + robe1 (1 case) = 2 cases');
  assert(t1.qty === 2,    'deux potion_s fusionnent en un stack ×2');

  const t2 = await page.evaluate(() => {
    // 16 cases non empilables distinctes → cap réellement atteint.
    player.inventory = Array.from({ length: 16 }, (_, i) => ({ id: 'mat_' + i, name: 'Mat ' + i, type: 'material' }));
    const r = tryAddItem('robe1', { silent: true }); // nouvel item, 0 case libre → refusé
    return { r, len: player.inventory.length };
  });
  console.log('  T2 cap 16 atteint :', t2);
  assert(t2.r === false, 'tryAddItem doit refuser un nouvel item quand 16 cases pleines');
  assert(t2.len === 16,  'inventaire ne doit pas dépasser INVENTORY_MAX');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ tryAddItem : id, objet, cap 16');
  await browser.close();
}

async function scenarioConsumableStacking() {
  console.log('\n── Scénario : stacking consommables ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page);

  // T1 : fusion à l'ajout puis consommation décrémente le stack (qty).
  const t1 = await page.evaluate(() => {
    player.inventory = [];
    tryAddItem('potion_s', { silent: true });
    tryAddItem('potion_s', { silent: true });
    tryAddItem('potion_s', { silent: true });
    const afterAdd = { len: player.inventory.length, qty: _itemQty(player.inventory[0]) };
    party[0].hp = 1;                 // useItem (hors combat) soigne Harry
    useItem(0, false);               // consomme 1 → qty 2
    const afterUse = { len: player.inventory.length, qty: _itemQty(player.inventory[0]) };
    _consumeAt(0, 1); _consumeAt(0, 1); // épuise le stack
    return { afterAdd, afterUse, emptied: player.inventory.length };
  });
  console.log('  T1 fusion/consommation :', t1);
  assert(t1.afterAdd.len === 1 && t1.afterAdd.qty === 3, '3 potions → 1 case ×3');
  assert(t1.afterUse.len === 1 && t1.afterUse.qty === 2, 'useItem décrémente sans vider (×2)');
  assert(t1.emptied === 0, 'stack épuisé → case libérée');

  // T2 : sac plein (16 cases) — on peut empiler un consommable déjà possédé,
  // mais pas introduire un nouvel id.
  const t2 = await page.evaluate(() => {
    player.inventory = Array.from({ length: 15 }, (_, i) => ({ id: 'mat_' + i, name: 'M' + i, type: 'material' }));
    tryAddItem('potion_s', { silent: true }); // 16e case
    const canMatch = _canAddItem(ITEMS.find(i => i.id === 'potion_s'));
    const rMatch   = tryAddItem('potion_s', { silent: true }); // fusion malgré 16 cases
    const rBlocked = tryAddItem('felix',    { silent: true }); // nouvel id, plein → refusé
    const stack = player.inventory.find(e => e.id === 'potion_s');
    return { canMatch, rMatch, rBlocked, len: player.inventory.length, qty: stack ? (stack.qty || 1) : 0 };
  });
  console.log('  T2 fusion sac plein :', t2);
  assert(t2.canMatch === true,  '_canAddItem autorise un consommable déjà possédé même plein');
  assert(t2.rMatch === true,    'fusion possible malgré 16 cases');
  assert(t2.rBlocked === false, 'nouvel id refusé quand 16 cases pleines');
  assert(t2.len === 16 && t2.qty === 2, '16 cases, potion_s ×2');

  // T3 : comptage/consommation par id sensibles à la quantité (quêtes/ingrédients).
  const t3 = await page.evaluate(() => {
    player.inventory = [];
    tryAddItem('mandragore', { silent: true });
    tryAddItem('mandragore', { silent: true });
    const counted = _countItems('mandragore');
    _consumeItems('mandragore', 1);
    return { counted, len: player.inventory.length, after: _countItems('mandragore') };
  });
  console.log('  T3 count/consume par id :', t3);
  assert(t3.counted === 2,            '_countItems somme les qty (2)');
  assert(t3.len === 1 && t3.after === 1, '_consumeItems décrémente le stack (reste 1)');

  // T4 : migration — doublons d'une save legacy fusionnés ; brassage distinct.
  const t4 = await page.evaluate(() => {
    const ps = ITEMS.find(i => i.id === 'potion_s');
    player.inventory = [{ ...ps }, { ...ps }, { ...ITEMS.find(i => i.id === 'robe1') }];
    _consolidateInventoryStacks();
    const merged = { len: player.inventory.length, qty: _itemQty(player.inventory.find(e => e.id === 'potion_s')) };
    // Une potion brassée ne fusionne pas avec une potion de boutique.
    player.inventory = [];
    tryAddItem('potion_s', { silent: true });
    tryAddItem('potion_s', { silent: true, props: { brewed: true, brewPotency: 0.5 } });
    return { merged, brewSeparate: player.inventory.length };
  });
  console.log('  T4 migration/brassage :', t4);
  assert(t4.merged.len === 2 && t4.merged.qty === 2, 'doublons legacy fusionnés (potion ×2 + robe)');
  assert(t4.brewSeparate === 2, 'potion brassée et potion boutique ne fusionnent pas');

  // T5 : matériaux et objets de quête s'empilent aussi (Éclat de Lumière =
  // type:'quest', Éclat de Vitalité = type:'material'). _countMaterial /
  // _consumeMaterial (Forge/Biblio) sont qty-aware.
  const t5 = await page.evaluate(() => {
    player.inventory = [];
    for (let i = 0; i < 3; i++) tryAddItem('eclat_lumiere', { silent: true });  // quest
    for (let i = 0; i < 2; i++) tryAddItem('eclat_vitalite', { silent: true }); // material
    const stacked = {
      len: player.inventory.length,
      questQty: _itemQty(player.inventory.find(e => e.id === 'eclat_lumiere')),
      matQty:   _itemQty(player.inventory.find(e => e.id === 'eclat_vitalite')),
    };
    // _countMaterial/_consumeMaterial qty-aware (chemin Forge/Bibliothèque).
    const counted = _countMaterial('eclat_vitalite');
    const removed = _consumeMaterial('eclat_vitalite', 1);
    const afterMat = _countMaterial('eclat_vitalite');
    // _consolidateInventoryStacks fusionne aussi des doublons material/quest.
    player.inventory = [
      { ...ITEMS.find(i => i.id === 'eclat_lumiere') },
      { ...ITEMS.find(i => i.id === 'eclat_lumiere') },
    ];
    _consolidateInventoryStacks();
    return { stacked, counted, removed, afterMat,
      consolidated: { len: player.inventory.length, qty: _itemQty(player.inventory[0]) } };
  });
  console.log('  T5 material/quest :', t5);
  assert(t5.stacked.len === 2,        'Éclats Lumière (quest) + Vitalité (material) = 2 cases');
  assert(t5.stacked.questQty === 3,   'objet de quête empilé ×3');
  assert(t5.stacked.matQty === 2,     'matériau empilé ×2');
  assert(t5.counted === 2 && t5.removed === 1 && t5.afterMat === 1, '_count/_consumeMaterial qty-aware');
  assert(t5.consolidated.len === 1 && t5.consolidated.qty === 2, 'doublons quest legacy consolidés ×2');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ stacking objets : consommables + matériaux + quête, fusion, décrément, cap, migration');
  await browser.close();
}

async function scenarioEquipmentAndStatusIcons() {
  console.log('\n── Scénario 19 : Phase 2 — équipement slots + status + resolver ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : resolver disponible et registre slot peuplé
  const t1 = await page.evaluate(() => ({
    hasGetItemIconHtml:        typeof getItemIconHtml === 'function',
    hasGetEquipmentSlotIcon:   typeof getEquipmentSlotIconHtml === 'function',
    hasGetStatusIconHtml:      typeof getStatusIconHtml === 'function',
    slotWand:    EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.wand,
    slotArmor:   EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.armor,
    slotAcc:     EQUIPMENT_SLOT_ICONS && EQUIPMENT_SLOT_ICONS.acc,
    statusBurn:  STATUS_ICON_REGISTRY && STATUS_ICON_REGISTRY.burn
  }));
  console.log('  T1 resolver →', t1);
  assert(t1.hasGetItemIconHtml,        'getItemIconHtml doit exister');
  assert(t1.hasGetEquipmentSlotIcon,   'getEquipmentSlotIconHtml doit exister');
  assert(t1.hasGetStatusIconHtml,      'getStatusIconHtml doit exister');
  assert(/wand\.png$/.test(t1.slotWand),       'slot wand doit pointer wand.png');
  assert(/armor\.png$/.test(t1.slotArmor),     'slot armor doit pointer armor.png');
  assert(/accessory\.png$/.test(t1.slotAcc),   'slot acc doit pointer accessory.png');
  assert(/burn\.png$/.test(t1.statusBurn),     'status burn doit pointer burn.png');

  // T2 : registre per-item override (architecture pour Phase 4)
  const t2 = await page.evaluate(() => {
    // Simuler une entrée Phase 4
    ITEM_ICON_REGISTRY['wand_houx'] = 'img/icons/items/wand_houx.png';
    const fakeItem = { id: 'wand_houx', type: 'wand', name: 'Baguette de Houx', icon: '🪄' };
    const html = getItemIconHtml(fakeItem);
    delete ITEM_ICON_REGISTRY['wand_houx'];
    // Sans entrée, doit fallback sur slot
    const html2 = getItemIconHtml(fakeItem);
    return { override: html, fallback: html2 };
  });
  console.log('  T2 override →', t2);
  assert(/wand_houx\.png/.test(t2.override),  'registry per-item doit prendre la priorité');
  assert(/img\/icons\/wand\.png/.test(t2.fallback), 'sans override, fallback sur slot wand.png');

  // T3 : équipement panneau gauche affiche les slot icons
  const t3 = await page.evaluate(() => {
    const root = document.querySelector('.left-panel');
    const imgs = Array.from(root.querySelectorAll('img.ui-icon'))
                      .map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T3 panneau gauche →', t3);
  assert(t3.some(s => s.endsWith('wand.png')),       'panneau gauche doit afficher wand.png');
  assert(t3.some(s => s.endsWith('armor.png')),      'panneau gauche doit afficher armor.png');
  assert(t3.some(s => s.endsWith('accessory.png')),  'panneau gauche doit afficher accessory.png');

  // T4 : fiche perso — slots vides retombent sur slot icons (wand/armor/accessory)
  // (pas d'item équipé sur Harry au démarrage → fallback slot attendu)
  const t4 = await page.evaluate(() => {
    if (!player.equipped) player.equipped = {};
    // Reset équipement pour forcer le fallback slot
    player.equipped = { wand: null, armor: null, acc: null };
    openCharacter(0);
    const detail = document.getElementById('char-detail');
    const html = detail.innerHTML;
    return {
      hasWand:  /img\/icons\/wand\.png/.test(html),
      hasArmor: /img\/icons\/armor\.png/.test(html),
      hasAcc:   /img\/icons\/accessory\.png/.test(html)
    };
  });
  console.log('  T4 fiche slots vides →', t4);
  assert(t4.hasWand && t4.hasArmor && t4.hasAcc,
         'slots vides → fallback wand.png/armor.png/accessory.png');

  // T5 : fiche perso — slot avec item équipé utilise le sprite per-item.
  // wand1 est passé sur l'archi tint 2-calques (saule), donc on accepte
  // soit l'`<img>` du registry legacy, soit le wrapper `tinted-icon`,
  // soit le nouveau pipeline painterly (icons_new/wand1_<size>.png).
  const t5 = await page.evaluate(() => {
    const wand = ITEMS.find(i => i.id === 'wand1');
    player.equipped.wand = wand;
    openCharacter(0);
    const detail = document.getElementById('char-detail');
    const html = detail.innerHTML;
    return {
      hasPerItemImg:    /img\/icons\/items\/wand1\.png/.test(html),
      hasTintedWrapper: /tinted-icon[^"]*tint-willow/.test(html),
      hasPainterly:     /icons_new\/wand1_\d+\.png/.test(html),
    };
  });
  console.log('  T5 fiche per-item →', t5);
  assert(t5.hasPerItemImg || t5.hasTintedWrapper || t5.hasPainterly,
         'wand1 équipé doit utiliser items/wand1.png, tinted-icon ou icons_new/wand1_*.png');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 2 : resolver ITEM_ICON_REGISTRY/EQUIPMENT_SLOT_ICONS/STATUS + 8 icônes intégrées');
  await browser.close();
}

async function scenarioExtendedEquipment() {
  console.log('\n── Scénario 22 : équipement étendu (11 slots) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : equipped a bien 11 slots à l'init
  const t1 = await page.evaluate(() => Object.keys(player.equipped).sort());
  console.log('  T1 slots →', t1);
  const expected = ['amulet','belt','body','cloak','feet','hands','head','ring1','ring2','trinket','wand'];
  assert(JSON.stringify(t1) === JSON.stringify(expected),
         `equipped doit avoir 11 slots, got ${JSON.stringify(t1)}`);

  // T2 : items legacy ont reçu un slot explicite
  const t2 = await page.evaluate(() => ({
    wand1:    ITEMS.find(i => i.id === 'wand1').slot,
    robe1:    ITEMS.find(i => i.id === 'robe1').slot,
    amulette: ITEMS.find(i => i.id === 'amulette').slot,
    broom:    ITEMS.find(i => i.id === 'broom').slot,
    cape:     ITEMS.find(i => i.id === 'cape_invis').slot,
    chapeau:  ITEMS.find(i => i.id === 'chapeau_pointu').slot,
    diademe:  ITEMS.find(i => i.id === 'diademe_serdaigle').slot
  }));
  console.log('  T2 slot mapping →', t2);
  assert(t2.wand1    === 'wand',    'wand1 → wand');
  assert(t2.robe1    === 'body',    'robe1 → body');
  assert(t2.amulette === 'amulet',  'amulette → amulet');
  assert(t2.broom    === 'trinket', 'broom → trinket');
  assert(t2.cape     === 'cloak',   'cape_invis → cloak');
  assert(t2.chapeau  === 'head',    'chapeau_pointu → head');
  assert(t2.diademe  === 'head',    'diademe_serdaigle → head');

  // T3 : équiper la cape applique bonusAgi (auparavant ignoré)
  const t3 = await page.evaluate(() => {
    const baseAgi = player.agi;
    const cape = ITEMS.find(i => i.id === 'cape_invis');
    player.inventory.push({ ...cape });
    equipItem(player.inventory.length - 1, 0);
    return { baseAgi, equippedAgi: player.agi, slot: !!player.equipped.cloak };
  });
  console.log('  T3 cape équipée →', t3);
  assert(t3.slot, 'cape doit aller dans equipped.cloak');
  assert(t3.equippedAgi === t3.baseAgi + 5,
         `bonusAgi doit s'appliquer (got ${t3.equippedAgi - t3.baseAgi}, expected +5)`);

  // T4 : équiper deux anneaux → ring1 puis ring2 (item de test injecté)
  const t4 = await page.evaluate(() => {
    const ringItem = {
      id:'_test_ring', name:'Anneau test', icon:'💍', desc:'+1 ATK',
      type:'acc', slot:'ring', bonusAtk:1, power:1, price:1
    };
    player.inventory.push({ ...ringItem });
    equipItem(player.inventory.length - 1, 0, 'ring1');
    player.inventory.push({ ...ringItem });
    equipItem(player.inventory.length - 1, 0, 'ring2');
    return {
      ring1: player.equipped.ring1 && player.equipped.ring1.id,
      ring2: player.equipped.ring2 && player.equipped.ring2.id
    };
  });
  console.log('  T4 deux anneaux →', t4);
  assert(t4.ring1 === '_test_ring' && t4.ring2 === '_test_ring',
         'ring1 et ring2 doivent contenir l\'anneau de test');

  // T5 : migration soft d'une save legacy (3 slots wand/armor/acc → 11)
  const t5 = await page.evaluate(() => {
    const fakeSave = {
      party: [
        { ...player, equipped: {
            wand:  ITEMS.find(i => i.id === 'wand1'),
            armor: ITEMS.find(i => i.id === 'robe1'),
            acc:   ITEMS.find(i => i.id === 'amulette')
        }},
        player2
      ],
      partySize: 1,
      currentFloor, playerX, playerY, playerDir,
      dungeon, visited, enemyMap, itemMap,
      seenMonsters: [], activeQuests, difficulty,
      chosenHouse, housePoints, houseTier,
      searchedCells: [], floorDungeons: {}, restCooldown: 0,
      usedFountains: []
    };
    _applyState(fakeSave);
    return {
      hasArmor:  player.equipped.armor !== undefined,
      hasAcc:    player.equipped.acc   !== undefined,
      bodyName:  player.equipped.body && player.equipped.body.name,
      amuletName: player.equipped.amulet && player.equipped.amulet.name,
      wandName:  player.equipped.wand && player.equipped.wand.name,
      slotCount: Object.keys(player.equipped).length
    };
  });
  console.log('  T5 migration legacy →', t5);
  assert(t5.hasArmor === false, 'slot armor doit être retiré après migration');
  assert(t5.hasAcc === false,   'slot acc doit être retiré après migration');
  assert(t5.bodyName   === 'Robe Renforcée',     'body doit recevoir robe1');
  assert(t5.amuletName === 'Amulette du Phénix', 'amulet doit recevoir amulette');
  assert(t5.wandName   === 'Baguette de Saule',  'wand doit conserver wand1');
  assert(t5.slotCount  === 11, `equipped doit avoir 11 slots après migration, got ${t5.slotCount}`);

  // T6 : fiche perso rend bien les 11 slots d'équipement (paper doll)
  const t6 = await page.evaluate(() => {
    openCharacter(0);
    const slots = document.querySelectorAll('#char-detail .paper-doll .equip-slot-floating');
    const tooltips = Array.from(slots).map(s => s.getAttribute('title'));
    const slotIds  = Array.from(slots).map(s => Array.from(s.classList).find(c => c.startsWith('equip-slot-') && c !== 'equip-slot-floating'));
    return { count: slots.length, tooltips, slotIds };
  });
  console.log('  T6 fiche 11 slots →', t6);
  assert(t6.count === 11, `fiche perso doit avoir 11 slots paper-doll, got ${t6.count}`);
  assert(t6.tooltips.includes('Anneau ◀') && t6.tooltips.includes('Anneau ▶'),
         'tooltips Anneau ◀ et Anneau ▶ doivent être présents');
  assert(t6.slotIds.includes('equip-slot-ring1') && t6.slotIds.includes('equip-slot-ring2'),
         'classes equip-slot-ring1 / equip-slot-ring2 doivent être présentes');

  // T6b : accordéon mobile — un .section-toggle par section, et
  // _toggleCharSection bascule la classe .collapsed de sa section.
  const t6b = await page.evaluate(() => {
    openCharacter(0);
    const toggles = document.querySelectorAll('#char-detail .section > .section-toggle');
    const before = document.querySelector('#char-detail .section-stats').classList.contains('collapsed');
    const stToggle = document.querySelector('#char-detail .section-stats > .section-toggle');
    _toggleCharSection(stToggle);
    const after = document.querySelector('#char-detail .section-stats').classList.contains('collapsed');
    return { toggleCount: toggles.length, before, after };
  });
  console.log('  T6b accordéon →', t6b);
  assert(t6b.toggleCount >= 3, `au moins 3 boutons .section-toggle attendus, got ${t6b.toggleCount}`);
  assert(t6b.before === false && t6b.after === true,
         'sections dépliées au départ, _toggleCharSection doit poser .collapsed');

  // T7 : bordure de rareté appliquée dans l'inventaire
  const t7 = await page.evaluate(() => {
    // Reset puis injection d'un item rare
    player.inventory.length = 0;
    player.inventory.push({
      id:'_test_rare', name:'Anneau rare', icon:'💍', desc:'+1',
      type:'acc', slot:'ring', rarity:'rare', bonusAtk:1, power:1, price:1
    });
    openInventory();
    const slot = document.querySelector('#inv-grid .inv-slot.has-item');
    return {
      hasRarityClass: slot && slot.classList.contains('rarity-rare'),
      borderColor:    slot && getComputedStyle(slot).borderColor
    };
  });
  console.log('  T7 rareté →', t7);
  assert(t7.hasRarityClass, 'inv-slot avec item rare doit porter classe rarity-rare');

  // T8 : champ tint déclenche un drop-shadow inline
  const t8 = await page.evaluate(() => {
    const tinted = { id:'_test_tint', name:'Test', icon:'🪄', type:'wand', slot:'wand', tint:'#4a8ad0' };
    const html = getItemIconHtml(tinted);
    // Tint hex valide → style inline présent
    const validHas = /drop-shadow\(0 0 1px #4a8ad0\)/.test(html);
    // Tint malformée → ignorée (sécurité injection CSS)
    const evil = { id:'x', name:'x', icon:'x', tint:'red; background:url(x)' };
    const evilHtml = getItemIconHtml(evil);
    const evilHas = /drop-shadow|background/.test(evilHtml);
    return { validHas, evilHas };
  });
  console.log('  T8 tint →', t8);
  assert(t8.validHas, 'tint hex valide doit produire drop-shadow inline');
  assert(!t8.evilHas, 'tint malformée doit être ignorée');

  // T9 : équiper plusieurs slots distincts en série — tous les bonus s'additionnent
  // Couvre Phase 5 §5.3 sub-2 : un item de plusieurs slots, bonus appliqués.
  const t9 = await page.evaluate(() => {
    // Reset complet (les T précédents ont équipé une cape + 2 anneaux _test_ring)
    Object.keys(player.equipped).forEach(k => { player.equipped[k] = null; });
    recalculateStats();
    const base = { atk: player.atk, def: player.def, mag: player.mag,
                   lck: player.lck, agi: player.agi };
    // Inventaire propre puis 4 items de slots distincts (head/hands/feet/cloak)
    player.inventory.length = 0;
    const ids = ['chapeau_apprenti', 'gants_apprenti', 'bottes_apprenti', 'cape_voyageur'];
    for (const id of ids) {
      player.inventory.push({ ...ITEMS.find(i => i.id === id) });
    }
    // Équiper depuis l'index 0 à chaque fois (l'inventaire se compacte)
    while (player.inventory.length) equipItem(0, 0);
    return {
      base,
      after: { atk: player.atk, def: player.def, mag: player.mag,
               lck: player.lck, agi: player.agi },
      filledSlots: ['head','hands','feet','cloak']
        .filter(s => player.equipped[s] !== null),
      // Bonus attendus (cf. data.js) :
      // chapeau_apprenti : MAG+1 DEF+1
      // gants_apprenti   : ATK+1 DEF+1
      // bottes_apprenti  : DEF+1 AGI+1
      // cape_voyageur    : DEF+2 AGI+2
      expected: { atkDelta: 1, defDelta: 5, magDelta: 1, lckDelta: 0, agiDelta: 3 }
    };
  });
  console.log('  T9 multi-slot bonuses →', {
    filledSlots: t9.filledSlots, deltas: {
      atk: t9.after.atk - t9.base.atk,
      def: t9.after.def - t9.base.def,
      mag: t9.after.mag - t9.base.mag,
      agi: t9.after.agi - t9.base.agi
    }
  });
  assert(t9.filledSlots.length === 4, `4 slots remplis attendus, got ${t9.filledSlots.length}`);
  assert(t9.after.atk - t9.base.atk === t9.expected.atkDelta,
    `ATK delta attendu +${t9.expected.atkDelta}, got ${t9.after.atk - t9.base.atk}`);
  assert(t9.after.def - t9.base.def === t9.expected.defDelta,
    `DEF delta attendu +${t9.expected.defDelta}, got ${t9.after.def - t9.base.def}`);
  assert(t9.after.mag - t9.base.mag === t9.expected.magDelta,
    `MAG delta attendu +${t9.expected.magDelta}, got ${t9.after.mag - t9.base.mag}`);
  assert(t9.after.agi - t9.base.agi === t9.expected.agiDelta,
    `AGI delta attendu +${t9.expected.agiDelta}, got ${t9.after.agi - t9.base.agi}`);

  // T10 : save → reload roundtrip — les 11 slots survivent intacts
  // Couvre Phase 5 §5.3 sub-5 : persistance + restauration.
  const t10 = await page.evaluate(() => {
    // Équipement courant : 4 slots remplis (T9). On capture, save, vide, reload.
    const before = {};
    Object.keys(player.equipped).forEach(s => {
      before[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    saveGame();
    // Vider et muter les bases pour s'assurer que reload restaure
    Object.keys(player.equipped).forEach(s => { player.equipped[s] = null; });
    recalculateStats();
    const cleared = {};
    Object.keys(player.equipped).forEach(s => {
      cleared[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    loadGame();
    const after = {};
    Object.keys(player.equipped).forEach(s => {
      after[s] = player.equipped[s] && player.equipped[s].id || null;
    });
    const allCleared = Object.values(cleared).every(v => v === null);
    const allRestored = Object.keys(before).every(s => before[s] === after[s]);
    return { before, cleared, after, allCleared, allRestored,
             slotCount: Object.keys(player.equipped).length };
  });
  console.log('  T10 save→reload roundtrip →', { allCleared: t10.allCleared, allRestored: t10.allRestored });
  assert(t10.allCleared,         'le clear préalable n\'a pas vidé tous les slots');
  assert(t10.allRestored,        `roundtrip a perdu des items : before=${JSON.stringify(t10.before)} after=${JSON.stringify(t10.after)}`);
  assert(t10.slotCount === 11,   `equipped doit toujours avoir 11 slots après reload, got ${t10.slotCount}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ 11 slots + slot mapping + bonusAgi + ring1/ring2 + migration legacy + UI Phase 2 + multi-slot bonuses + save roundtrip');
  await browser.close();
}

async function scenarioPhase3Catalog() {
  console.log('\n── Scénario 23 : Phase 3 — catalogue items + drops + coffres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : nouveaux items définis avec slot/family/rarity
  const t1 = await page.evaluate(() => {
    const ids = ['gants_apprenti','bottes_apprenti','chapeau_apprenti','ceinture_cuir',
                 'anneau_argent','cape_voyageur','amulette_protection',
                 'circlet_serdaigle','anneau_runique','ceinture_alchimiste',
                 'bottes_dragon','retourneur_temps'];
    return ids.map(id => {
      const it = ITEMS.find(i => i.id === id);
      return it ? { id, slot: it.slot, family: it.family, rarity: it.rarity } : { id, missing: true };
    });
  });
  console.log('  T1 nouveaux items →', t1.length, 'items');
  assert(t1.every(x => !x.missing), `tous les nouveaux items doivent exister, manquant: ${t1.filter(x=>x.missing).map(x=>x.id)}`);
  assert(t1.every(x => x.slot && x.family && x.rarity),
         'chaque nouvel item doit avoir slot+family+rarity');

  // T2 : backfill rarity sur items legacy
  const t2 = await page.evaluate(() => ({
    wand1:        ITEMS.find(i => i.id === 'wand1').rarity,
    amulette:     ITEMS.find(i => i.id === 'amulette').rarity,
    cape_invis:   ITEMS.find(i => i.id === 'cape_invis').rarity,
    sword_gryff:  ITEMS.find(i => i.id === 'sword_gryff').rarity,
    diademe:      ITEMS.find(i => i.id === 'diademe_serdaigle').rarity
  }));
  console.log('  T2 rarity backfill →', t2);
  assert(t2.wand1 === 'common',     `wand1 doit être common, got ${t2.wand1}`);
  assert(t2.amulette === 'epic',    `amulette doit être epic, got ${t2.amulette}`);
  assert(t2.sword_gryff === 'legendary', `sword_gryff doit être legendary`);

  // T3 : SHOP_CATALOG a bien les nouveaux items aux bons étages
  const t3 = await page.evaluate(() => {
    const find = id => SHOP_CATALOG.find(e => e.id === id);
    return {
      gants:   find('gants_apprenti'),
      bottes:  find('bottes_apprenti'),
      anneau:  find('anneau_argent'),
      circlet: find('circlet_serdaigle'),
      timer:   find('retourneur_temps')
    };
  });
  console.log('  T3 catalog →', t3);
  assert(t3.gants && t3.gants.minFloor === 1,    'gants_apprenti doit être étage 1');
  assert(t3.anneau && t3.anneau.minFloor === 2,  'anneau_argent doit être étage 2');
  assert(t3.circlet && t3.circlet.minFloor === 5,'circlet_serdaigle doit être étage 5');
  assert(t3.timer && t3.timer.minFloor === 7,    'retourneur_temps doit être étage 7');

  // T4 : pickChestEquipment exclut les légendaires et respecte le seuil étage
  const t4 = await page.evaluate(() => {
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0, total: 0 };
    let saw_circlet = false, saw_timer = false;
    for (let i = 0; i < 600; i++) {
      const it = pickChestEquipment(1);
      if (!it) continue;
      counts[it.rarity || 'common']++;
      counts.total++;
    }
    // À étage 7 : peut tirer epic, jamais legendary
    const counts7 = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 600; i++) {
      const it = pickChestEquipment(7);
      if (!it) continue;
      counts7[it.rarity || 'common']++;
      if (it.id === 'circlet_serdaigle') saw_circlet = true;
      if (it.id === 'retourneur_temps')  saw_timer   = true;
    }
    return { counts, counts7, saw_circlet, saw_timer };
  });
  console.log('  T4 pickChestEquipment →', t4);
  assert(t4.counts.legendary === 0,        'aucun legendary à étage 1');
  assert(t4.counts.rare === 0,             'aucun rare à étage 1 (seuil étage 4)');
  assert(t4.counts.common > 0,             'au moins quelques common à étage 1');
  assert(t4.counts7.legendary === 0,       'aucun legendary à étage 7');
  assert(t4.counts7.epic > 0,              'au moins quelques epic à étage 7');

  // T5 : drops étendus sur les monstres ciblés
  const t5 = await page.evaluate(() => {
    const dropsOf = id => {
      const m = MONSTERS.find(x => x.id === id);
      return m ? m.drops.map(d => d.itemId) : [];
    };
    return {
      gobelin:   dropsOf('gobelin'),
      bundimun:  dropsOf('bundimun'),
      centaure:  dropsOf('centaure'),
      mangemort: dropsOf('mangemort'),
      bellatrix: dropsOf('bellatrix'),
      voldemort: dropsOf('voldemort_revenu')
    };
  });
  console.log('  T5 drops →', t5);
  assert(t5.gobelin.includes('ceinture_cuir'),         'gobelin → ceinture_cuir');
  assert(t5.bundimun.includes('bottes_apprenti'),      'bundimun → bottes_apprenti');
  assert(t5.centaure.includes('anneau_argent'),        'centaure → anneau_argent');
  assert(t5.mangemort.includes('cape_voyageur'),       'mangemort → cape_voyageur');
  assert(t5.bellatrix.includes('anneau_runique'),      'bellatrix → anneau_runique');
  assert(t5.voldemort.includes('retourneur_temps'),    'voldemort → retourneur_temps');

  // T6 : ouverture boutique étage 1 → nouveaux items présents
  const t6 = await page.evaluate(() => {
    currentFloor = 1;
    shopStock = null;  // re-tirage déterministe pour l'étage courant
    openShop();
    const ids = Array.from(document.querySelectorAll('#shop-grid .shop-item'))
      .map(el => el.dataset.itemId);
    return ids;
  });
  console.log('  T6 boutique étage 1 →', t6);
  assert(t6.includes('gants_apprenti'),  'boutique étage 1 doit lister gants_apprenti');
  assert(t6.includes('bottes_apprenti'), 'boutique étage 1 doit lister bottes_apprenti');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ catalogue Phase 3 + drops + coffres + boutique progressive');
  await browser.close();
}

async function scenarioEquipmentPhase3bQuests() {
  console.log('\n── Scénario 25 : Phase 3b — quotes équipement + regenHp ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 4 nouveaux templates dans QUEST_TEMPLATES, chacun avec un reward.item
  const t1 = await page.evaluate(() => {
    const ids = ['bottines_ollivander', 'fil_acromantule', 'anneau_dumbledore', 'bouclier_phenix'];
    return ids.map(id => {
      const t = QUEST_TEMPLATES.find(q => q.id === id);
      return t ? {
        id,
        rewardItem: t.reward && t.reward.item,
        objType: t.objectives && t.objectives[0] && t.objectives[0].type,
        objTarget: t.objectives && t.objectives[0] && (t.objectives[0].monsterId || t.objectives[0].itemId),
        objAmount: t.objectives && t.objectives[0] && t.objectives[0].amount
      } : { id, missing: true };
    });
  });
  console.log('  T1 templates:', t1);
  assert(t1.every(x => !x.missing), `template manquant: ${t1.filter(x=>x.missing).map(x=>x.id)}`);
  assert(t1.find(x => x.id === 'bottines_ollivander').rewardItem === 'bottes_dragon',
    'bottines_ollivander doit donner bottes_dragon');
  assert(t1.find(x => x.id === 'fil_acromantule').rewardItem === 'cape_voyageur',
    'fil_acromantule doit donner cape_voyageur');
  assert(t1.find(x => x.id === 'anneau_dumbledore').rewardItem === 'anneau_resurrection',
    'anneau_dumbledore doit donner anneau_resurrection');
  assert(t1.find(x => x.id === 'bouclier_phenix').rewardItem === 'larmes_phenix',
    'bouclier_phenix doit donner larmes_phenix');
  assert(t1.find(x => x.id === 'fil_acromantule').objAmount === 3,
    'fil_acromantule doit demander 3 cibles');
  assert(t1.find(x => x.id === 'bouclier_phenix').objAmount === 5,
    'bouclier_phenix doit demander 5 cibles');

  // T2 : les 4 PNJ ont questsGiven/questsTurnedIn correctement câblés
  const t2 = await page.evaluate(() => {
    const map = { ollivander: 'bottines_ollivander', guipure: 'fil_acromantule',
                  portrait_dumbledore: 'anneau_dumbledore', fumseck: 'bouclier_phenix' };
    const out = {};
    Object.entries(map).forEach(([npcId, questId]) => {
      const n = getNpcById(npcId);
      out[npcId] = {
        exists: !!n,
        gives:    n && n.questsGiven    && n.questsGiven.includes(questId),
        turnsIn:  n && n.questsTurnedIn && n.questsTurnedIn.includes(questId)
      };
    });
    return out;
  });
  console.log('  T2 PNJ câblage:', t2);
  Object.entries(t2).forEach(([npcId, d]) => {
    assert(d.exists,   `PNJ ${npcId} introuvable`);
    assert(d.gives,    `PNJ ${npcId} doit avoir la quête dans questsGiven`);
    assert(d.turnsIn,  `PNJ ${npcId} doit avoir la quête dans questsTurnedIn`);
  });

  // T3 : les 2 nouveaux items existent avec les bons champs
  const t3 = await page.evaluate(() => {
    const ar = ITEMS.find(i => i.id === 'anneau_resurrection');
    const lp = ITEMS.find(i => i.id === 'larmes_phenix');
    return {
      arExists: !!ar, arSlot: ar && ar.slot, arRarity: ar && ar.rarity,
      arGrantsSpell: ar && ar.grantsSpell, arBonusMag: ar && ar.bonusMag,
      lpExists: !!lp, lpSlot: lp && lp.slot, lpRarity: lp && lp.rarity,
      lpRegenHp: lp && lp.regenHp, lpBonusDef: lp && lp.bonusDef
    };
  });
  console.log('  T3 nouveaux items:', t3);
  assert(t3.arExists && t3.arSlot === 'ring' && t3.arRarity === 'epic',
    'anneau_resurrection doit être slot:ring rarity:epic');
  assert(t3.arGrantsSpell === 'Reparo',
    'anneau_resurrection doit grantsSpell:Reparo');
  assert(t3.lpExists && t3.lpSlot === 'amulet' && t3.lpRarity === 'epic',
    'larmes_phenix doit être slot:amulet rarity:epic');
  assert(t3.lpRegenHp === 3,
    `larmes_phenix doit avoir regenHp:3, got ${t3.lpRegenHp}`);

  // T4 : applyEquipmentRegen() régénère les PV de l'allié équipé
  const t4 = await page.evaluate(() => {
    const lp = ITEMS.find(i => i.id === 'larmes_phenix');
    player.equipped.amulet = JSON.parse(JSON.stringify(lp));
    recalculateStats();
    player.hp = Math.max(1, player.hpMax - 10);
    const before = player.hp;
    if (typeof applyEquipmentRegen !== 'function') return { fail: 'applyEquipmentRegen non exposée' };
    applyEquipmentRegen();
    return { before, after: player.hp, hpMax: player.hpMax, expected: before + 3 };
  });
  console.log('  T4 regenHp tick:', t4);
  assert(!t4.fail, t4.fail || '');
  assert(t4.after === t4.expected,
    `tick doit ajouter +3 PV, got ${t4.after} (attendu ${t4.expected})`);

  // T5 : le regen est plafonné par hpMax (pas de débordement)
  const t5 = await page.evaluate(() => {
    player.hp = player.hpMax - 1;
    applyEquipmentRegen();
    const r1 = { capped: player.hp === player.hpMax };
    // Plein PV → no-op
    player.hp = player.hpMax;
    applyEquipmentRegen();
    r1.noOp = player.hp === player.hpMax;
    // KO → no-op
    player.hp = 0;
    applyEquipmentRegen();
    r1.koSkipped = player.hp === 0;
    return r1;
  });
  console.log('  T5 cap/no-op/ko:', t5);
  assert(t5.capped,    'regen doit s\'arrêter à hpMax');
  assert(t5.noOp,      'pas de regen quand hp === hpMax');
  assert(t5.koSkipped, 'pas de regen sur un perso KO (hp <= 0)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 3b — 4 quêtes + 2 items + regenHp passif OK');
  await browser.close();
}

async function scenarioCritDodgeFromEquip() {
  console.log('\n── Scénario : crit/dodge depuis l\'équipement (V2 Vague A) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const res = await page.evaluate(() => {
    const c = party[0];
    // Mesure la contribution isolée d'un champ : équipe l'item dans `slot`,
    // recalc, lit `stat` ; supprime le champ ; recalc ; lit à nouveau.
    const probe = (id, slot, stat, field) => {
      c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                     cloak:null, amulet:null, ring1:null, ring2:null,
                     belt:null, trinket:null };
      c.equipped[slot] = { ...ITEMS.find(i => i.id === id) };
      recalculateStats();
      const withField = c[stat];
      delete c.equipped[slot][field];
      recalculateStats();
      const without = c[stat];
      return { id, delta: withField - without, raw: c.equipped[slot] };
    };
    return {
      capeInvis:   probe('cape_invis',         'cloak', 'dodgeChance',  'bonusDodgeChance'),
      bottesDragon:probe('bottes_dragon',      'feet',  'dodgeChance',  'bonusDodgeChance'),
      larmesPhenix:probe('larmes_phenix',      'amulet','dodgeChance',  'bonusDodgeChance'),
      anneauRunique:probe('anneau_runique',    'ring1', 'critChance',   'bonusCritChance'),
      ceintureAlch:probe('ceinture_alchimiste','belt',  'critChance',   'bonusCritChance'),
      wand2:       probe('wand2',              'wand',  'critChance',   'bonusCritChance'),
    };
  });
  console.log('  résultats:', JSON.stringify(res));
  assert(res.capeInvis.delta === 5,    `cape_invis : +5 dodge attendu, got ${res.capeInvis.delta}`);
  assert(res.bottesDragon.delta === 3, `bottes_dragon : +3 dodge attendu, got ${res.bottesDragon.delta}`);
  assert(res.larmesPhenix.delta === 3, `larmes_phenix : +3 dodge attendu, got ${res.larmesPhenix.delta}`);
  assert(res.anneauRunique.delta === 3,`anneau_runique : +3 crit attendu, got ${res.anneauRunique.delta}`);
  assert(res.ceintureAlch.delta === 2, `ceinture_alchimiste : +2 crit attendu, got ${res.ceintureAlch.delta}`);
  assert(res.wand2.delta === 2,        `wand2 : +2 crit attendu, got ${res.wand2.delta}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Crit/Dodge depuis l\'équipement OK');
  await browser.close();
}

async function scenarioDeathlyHallows() {
  console.log('\n── Scénario : Les Reliques de la Mort (easter egg) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : indice escalade — possession de 1 puis 2 Reliques (sac partagé)
  const t1 = await page.evaluate(() => {
    const ghost = { id: 'sir_nicolas', sprite: 'fantome' };
    const notGhost = { id: 'rusard', sprite: 'prof_h' };
    const give = id => player.inventory.push({ ...ITEMS.find(i => i.id === id) });
    const ownedAt0 = _hallowsOwnedCount();
    const hintAt0  = _hallowsGhostHint(ghost);
    give('wand2');                       // 1 Relique
    const ownedAt1 = _hallowsOwnedCount();
    const hintAt1  = _hallowsGhostHint(ghost);
    const hintNonGhost = _hallowsGhostHint(notGhost);
    give('cape_invis');                  // 2 Reliques
    const ownedAt2 = _hallowsOwnedCount();
    const hintAt2  = _hallowsGhostHint(ghost);
    return { ownedAt0, hintAt0, ownedAt1, hintAt1, hintNonGhost, ownedAt2, hintAt2,
             flag: maitreDeLaMort };
  });
  console.log('  T1 escalade:', t1);
  assert(t1.ownedAt0 === 0,        'aucune Relique au départ');
  assert(t1.hintAt0 === null,      'pas d\'indice à 0 Relique');
  assert(t1.ownedAt1 === 1,        '1 Relique possédée attendue');
  assert(typeof t1.hintAt1 === 'string' && t1.hintAt1.length > 0,
         'indice fantôme attendu à 1 Relique');
  assert(t1.hintNonGhost === null, 'indice réservé aux fantômes (pas Rusard)');
  assert(t1.ownedAt2 === 2,        '2 Reliques possédées attendues');
  assert(typeof t1.hintAt2 === 'string', 'indice fantôme attendu à 2 Reliques');
  assert(t1.flag === false,        'flag maitreDeLaMort doit être false avant union');

  // T2 : union des 3 Reliques sur un même héros → flag posé une fois
  const t2 = await page.evaluate(() => {
    const c = party[0];
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                   cloak:null, amulet:null, ring1:null, ring2:null,
                   belt:null, trinket:null };
    c.equipped.wand  = { ...ITEMS.find(i => i.id === 'wand2') };
    c.equipped.cloak = { ...ITEMS.find(i => i.id === 'cape_invis') };
    c.equipped.ring2 = { ...ITEMS.find(i => i.id === 'anneau_resurrection') };
    const equippedOn = _hallowsEquippedOn(c);
    const flagBefore = maitreDeLaMort;
    recalculateStats();
    return { equippedOn, flagBefore, flagAfter: maitreDeLaMort,
             hintAfter: _hallowsGhostHint({ id:'sir_nicolas', sprite:'fantome' }) };
  });
  console.log('  T2 union:', t2);
  assert(t2.equippedOn === true,   '_hallowsEquippedOn doit voir les 3 Reliques sur le héros');
  assert(t2.flagBefore === false,  'flag false juste avant le recalc d\'union');
  assert(t2.flagAfter === true,    'recalculateStats doit poser maitreDeLaMort');
  assert(t2.hintAfter === null,    'indice escalade éteint une fois le titre obtenu');

  // T3 : permanence — retirer une Relique ne retire pas le titre, pas de re-fire
  const t3 = await page.evaluate(() => {
    const c = party[0];
    c.equipped.ring2 = null;             // brise l'union
    const stillEquipped = _hallowsEquippedOn(c);
    recalculateStats();                  // checkHallowsUnion doit no-op
    return { stillEquipped, flag: maitreDeLaMort };
  });
  console.log('  T3 permanence:', t3);
  assert(t3.stillEquipped === false, 'union brisée après retrait de la Pierre');
  assert(t3.flag === true,           'le titre Maître de la Mort est permanent');

  // T4 : round-trip de save conserve le flag
  const t4 = await page.evaluate(() => {
    const gs = _serializeState();
    const serialized = gs.maitreDeLaMort;
    maitreDeLaMort = false;             // simule un état neuf
    _applyState(gs);
    return { serialized, restored: maitreDeLaMort };
  });
  console.log('  T4 save:', t4);
  assert(t4.serialized === true, '_serializeState doit inclure maitreDeLaMort=true');
  assert(t4.restored === true,   '_applyState doit restaurer maitreDeLaMort');

  // T5 : Codex « Reliques de la Mort » — méta-objectif (allItems) déverrouillé
  // uniquement quand les 3 Reliques sont possédées (P3.2).
  const t5 = await page.evaluate(() => {
    const entry = CODEX_ENTRIES.find(e => e.id === 'reliques_de_la_mort');
    const st2 = codexEntryState(entry, { itemsOwned: new Set(['wand2', 'cape_invis']) });
    const st3 = codexEntryState(entry, { itemsOwned: new Set(['wand2', 'cape_invis', 'anneau_resurrection']) });
    return { present: !!entry, st2, st3 };
  });
  console.log('  T5 codex:', t5);
  assert(t5.present,          'entrée Codex reliques_de_la_mort doit exister');
  assert(t5.st2 === 'locked', 'Codex verrouillé avec seulement 2 Reliques');
  assert(t5.st3 !== 'locked', 'Codex déverrouillé avec les 3 Reliques (allItems)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Reliques de la Mort OK (+ Codex méta-objectif)');
  await browser.close();
}

// Artefacts P3.3b — reliques vocales : octroi écho-gaté (one-shot) + Codex Chœur.
async function scenarioVoiceRelics() {
  console.log('\n── Scénario : Reliques vocales (octroi écho + Chœur) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const out = await page.evaluate(() => {
    player.inventory = [];
    const r1     = grantVoiceRelicForEcho('echo_godric');
    const after1 = player.inventory.filter(i => i.id === 'voix_godric_relique').length;
    const r2     = grantVoiceRelicForEcho('echo_godric');   // one-shot
    const after2 = player.inventory.filter(i => i.id === 'voix_godric_relique').length;
    const bad    = grantVoiceRelicForEcho('echo_inconnu');  // mapping inconnu
    grantVoiceRelicForEcho('echo_salazar');
    grantVoiceRelicForEcho('echo_rowena');
    grantVoiceRelicForEcho('echo_helga');
    const ids   = ['voix_godric_relique', 'voix_salazar_relique', 'voix_rowena_relique', 'voix_helga_relique'];
    const owned = ids.filter(id => player.inventory.some(i => i.id === id));
    const entry = CODEX_ENTRIES.find(e => e.id === 'choeur_des_fondateurs');
    const st3   = codexEntryState(entry, { itemsOwned: new Set(owned.slice(0, 3)) });
    const st4   = codexEntryState(entry, { itemsOwned: new Set(owned) });
    const icon  = getItemIconHtml(ITEMS.find(i => i.id === 'voix_godric_relique'), 64);
    return { r1, after1, r2, after2, bad, ownedLen: owned.length, present: !!entry, st3, st4,
             iconPng: /icons_new\/voix_godric_relique/.test(icon) };
  });
  console.log('  →', JSON.stringify(out));
  assert(out.r1 === true,      'écho Godric doit octroyer la relique');
  assert(out.after1 === 1,     '1 Murmure de Godric attendu après octroi');
  assert(out.r2 === false,     'octroi one-shot : pas de second exemplaire');
  assert(out.after2 === 1,     'toujours 1 seul Murmure de Godric (pas de doublon)');
  assert(out.bad === false,    'écho inconnu ne doit rien octroyer');
  assert(out.ownedLen === 4,   'les 4 reliques vocales doivent être possédées');
  assert(out.present,          'entrée Codex choeur_des_fondateurs doit exister');
  assert(out.st3 === 'locked', 'Chœur verrouillé avec 3 reliques');
  assert(out.st4 !== 'locked', 'Chœur déverrouillé avec les 4 reliques');
  assert(out.iconPng,          'icône PNG dédiée attendue pour voix_godric_relique');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Reliques vocales + Chœur des Fondateurs OK');
  await browser.close();
}

async function scenarioShopLimits() {
  console.log('\n── Scénario : boutique anti-abus ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : le stock est un tableau borné à SHOP_STOCK_SIZE.
  const t1 = await page.evaluate(() => {
    shopStock = null;
    player.gold = 999999;
    openShop();
    return { isArray: Array.isArray(shopStock), size: shopStock.length, cap: SHOP_STOCK_SIZE };
  });
  console.log('  T1 stock →', t1);
  assert(t1.isArray,                 'shopStock doit être un tableau après openShop');
  assert(t1.size <= t1.cap,          `stock ${t1.size} > cap ${t1.cap}`);

  // T2 : achat unique — l'objet acheté quitte le stock et la grille.
  const t2 = await page.evaluate(() => {
    const before = shopStock.length;
    const first  = document.querySelector('#shop-grid .shop-item');
    const id     = first.dataset.itemId;
    first.click();
    const stillThere = Array.from(document.querySelectorAll('#shop-grid .shop-item'))
      .some(el => el.dataset.itemId === id);
    return { boughtId: id, before, after: shopStock.length, stillThere };
  });
  console.log('  T2 achat unique →', t2);
  assert(t2.after === t2.before - 1, 'le stock doit perdre une entrée après achat');
  assert(!t2.stillThere,             'l\'objet acheté ne doit plus figurer dans la grille');

  // T3 : livre de sorts acheté → retiré globalement (boutique fixe ET vendeur).
  const t3 = await page.evaluate(() => {
    const livre = ITEMS.find(i => i.id === 'livre_sortileges');
    shopStock = [{ item: { ...livre }, price: livre.price, sold: false }];
    openShop();
    document.querySelector('#shop-grid .shop-item').click();
    const recorded = purchasedSpellbooks.has('livre_sortileges');
    // Vendeur Mundungus vend livre_sortileges + livre_soin : le 1er doit disparaître.
    openVendorShop('mundungus');
    const ids = Array.from(document.querySelectorAll('#shop-grid .shop-item'))
      .map(el => el.dataset.itemId);
    return { recorded, vendorIds: ids };
  });
  console.log('  T3 livre global →', t3);
  assert(t3.recorded,                          'purchasedSpellbooks doit mémoriser le livre acheté');
  assert(!t3.vendorIds.includes('livre_sortileges'),
         'un livre déjà acheté ne doit plus être proposé par les vendeurs');
  assert(t3.vendorIds.includes('livre_soin'),  'les autres livres restent proposés');

  // T4 : revente → entrée rachetable ; réassort après 40 pas → stock neuf, reventes perdues.
  const t4 = await page.evaluate(() => {
    openShop();                       // contexte 'static'
    const potion = ITEMS.find(i => i.id === 'potion_s');
    player.inventory.push({ ...potion });
    const idx = player.inventory.length - 1;
    sellItem(idx, 10);
    const soldEntry = shopStock.some(s => s.sold && s.item.id === 'potion_s');
    // Réassort par les pas.
    shopStepsSinceRestock = SHOP_RESTOCK_STEPS - 1;
    _tickShopRestock();
    const invalidated = shopStock === null;
    openShop();                       // re-tirage
    const noSoldLeft = shopStock.every(s => !s.sold);
    return { soldEntry, invalidated, noSoldLeft, counter: shopStepsSinceRestock };
  });
  console.log('  T4 revente + réassort →', t4);
  assert(t4.soldEntry,        'un objet revendu doit rejoindre le stock (rachat)');
  assert(t4.invalidated,      'le stock doit être invalidé au bout de SHOP_RESTOCK_STEPS pas');
  assert(t4.noSoldLeft,       'les objets revendus sont perdus au réassort');
  assert(t4.counter === 0,    'le compteur de pas est remis à zéro au réassort');

  // T5 : persistance — shopStock / purchasedSpellbooks survivent au round-trip save.
  const t5 = await page.evaluate(() => {
    const gs = _serializeState();
    const snapLen = shopStock.length;
    const snapBooks = Array.from(purchasedSpellbooks);
    shopStock = null; shopStepsSinceRestock = 0; purchasedSpellbooks = new Set();
    _applyState(gs);
    return {
      lenOk:   Array.isArray(shopStock) && shopStock.length === snapLen,
      booksOk: snapBooks.every(b => purchasedSpellbooks.has(b)) && snapBooks.length > 0
    };
  });
  console.log('  T5 persistance →', t5);
  assert(t5.lenOk,   'shopStock doit survivre au round-trip de sauvegarde');
  assert(t5.booksOk, 'purchasedSpellbooks doit survivre au round-trip de sauvegarde');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Boutique anti-abus OK (stock fini + achat unique + livres globaux + réassort)');
  await browser.close();
}

// 0.2 — Feedback sur action refusée : achat sans or + soin gaspillé à PV max.
// Avant : refus silencieux (le joueur clique, rien ne se passe → perçu bug).
async function scenarioRefusalFeedback() {
  console.log('\n── Scénario : feedback achat/usage refusé (0.2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : achat avec or insuffisant → message visible, or + stock inchangés.
  const t1 = await page.evaluate(() => {
    shopStock = null;
    player.gold = 0;
    openShop();
    const before = shopStock.length;
    const goldBefore = player.gold;
    const first = document.querySelector('#shop-grid .shop-item');
    document.getElementById('msg-log').innerHTML = '';
    first.click();
    return {
      before, after: shopStock.length, goldBefore, goldAfter: player.gold,
      msg: document.getElementById('msg-log').textContent,
    };
  });
  console.log('  T1 achat sans or →', t1);
  assert(/Pas assez de Gallions/.test(t1.msg), 'un achat sans or doit afficher un message visible');
  assert(t1.after === t1.before,             'le stock ne doit pas bouger sur un achat refusé');
  assert(t1.goldAfter === t1.goldBefore,     'l\'or ne doit pas bouger sur un achat refusé');

  // T2 : potion de soin utilisée à PV max → refus visible, objet conservé.
  const t2 = await page.evaluate(() => {
    const potion = ITEMS.find(i => i.id === 'potion_s');
    player.inventory.push({ ...potion });
    const idx = player.inventory.length - 1;
    player.hp = player.hpMax;
    document.getElementById('msg-log').innerHTML = '';
    const lenBefore = player.inventory.length;
    useItem(idx, false);
    return {
      msg: document.getElementById('msg-log').textContent,
      lenBefore, lenAfter: player.inventory.length,
    };
  });
  console.log('  T2 soin à PV max →', t2);
  assert(/gaspillé/.test(t2.msg),          'un soin à PV max doit afficher un refus visible');
  assert(t2.lenAfter === t2.lenBefore,     'l\'objet ne doit pas être consommé s\'il serait gaspillé');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Feedback achat/usage refusé OK');
  await browser.close();
}

// Dissolution à la Forge : un item invendable (price:0) du sac est recyclé
// en Essence (matériau de forge), libérant l'impasse inventaire.
async function scenarioForgeDissolve() {
  console.log('\n── Scénario : dissolution Forge (anti-impasse items invendables) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : un item premium price:0 (Bâton de Rowena) dans le sac est dissolvable
  //      et son rendement inclut de l'Essence Primordiale (epic).
  const t1 = await page.evaluate(() => {
    const it = ITEMS.find(i => i.id === 'baton_ancestral_premium_serd');
    player.inventory = [{ ...it }];
    return {
      price:        it.price,
      dissolvable:  _isDissolvable(player.inventory[0]),
      yld:          _dissolveYield(player.inventory[0]),
      hasFn:        typeof dissolveItemAtForge === 'function',
    };
  });
  console.log('  T1:', t1);
  assert(t1.price === 0,       'le Bâton de Rowena est bien price:0 (invendable)');
  assert(t1.dissolvable,       'un équipement du sac doit être dissolvable');
  assert(t1.hasFn,             'dissolveItemAtForge doit être exposé');
  assert((t1.yld.essence_primordiale | 0) >= 1, 'un epic doit rendre ≥1 Essence Primordiale');

  // T2 : dissolution effective (confirm stubé) → item retiré, Essence gagnée.
  const t2 = await page.evaluate(() => {
    window.confirm = () => true;                       // stub la confirmation
    const tenBefore  = _countMaterial('essence_tenebres');
    const primBefore = _countMaterial('essence_primordiale');
    const lenBefore  = player.inventory.length;
    const ok = dissolveItemAtForge(0);
    return {
      ok,
      removed:   lenBefore - player.inventory.length,
      stillHas:  player.inventory.some(i => i.id === 'baton_ancestral_premium_serd'),
      tenGain:   _countMaterial('essence_tenebres')   - tenBefore,
      primGain:  _countMaterial('essence_primordiale') - primBefore,
    };
  });
  console.log('  T2:', t2);
  assert(t2.ok,                'la dissolution doit réussir');
  assert(!t2.stillHas,        'l\'item dissous doit quitter le sac');
  assert(t2.primGain >= 1 && t2.tenGain >= 1, 'la dissolution doit créditer l\'Essence');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Dissolution Forge OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioPartyEquipRow, scenarioTryAddItem, scenarioConsumableStacking, scenarioEquipmentAndStatusIcons, scenarioExtendedEquipment, scenarioPhase3Catalog, scenarioEquipmentPhase3bQuests, scenarioCritDodgeFromEquip, scenarioDeathlyHallows, scenarioVoiceRelics, scenarioShopLimits, scenarioRefusalFeedback, scenarioForgeDissolve] };
