// ============================================================
// Scénarios smoke — domaine « houses » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioHouseCrests() {
  console.log('\n── Scénario 8 : blasons PNG des 4 maisons ──');
  const { browser, page, errors } = await launchGame();

  const expected = [
    { id: 'gryffondor-logo', src: 'img/houses/gryffondor.png',  house: 'Gryffondor'  },
    { id: 'serpentard-logo', src: 'img/houses/serpentard.png',  house: 'Serpentard'  },
    { id: 'serdaigle-logo',  src: 'img/houses/serdaigle.png',   house: 'Serdaigle'   },
    { id: 'poufsouffle-logo',src: 'img/houses/poufsouffle.png', house: 'Poufsouffle' }
  ];

  for (const e of expected) {
    const t = await page.evaluate(({ eid, src }) => {
      const el = document.getElementById(eid);
      return {
        present: !!el,
        isImg:   !!el && el.tagName === 'IMG',
        srcOk:   !!el && el.getAttribute('src') === src,
        loaded:  !!el && el.complete && el.naturalWidth > 0
      };
    }, { eid: e.id, src: e.src });
    console.log(`  ${e.id} →`, t);
    assert(t.present && t.isImg, `${e.id} absent ou pas <img>`);
    assert(t.srcOk,               `${e.id} src incorrect`);
    assert(t.loaded,              `${e.id} PNG non chargé (404 ou alpha vide)`);
  }

  // Vérifier que _updateHouseBadge() clone bien le logo PNG dans
  // #crest-ring-inner (refonte blason vivant — audit P1 A.1) et que
  // l'anneau conic-gradient porte un ratio cohérent.
  const cloneCheck = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    housePoints = 50; houseTier = 1; // Apprenti Bronze atteint (50 pts)
    _updateHouseBadge();
    const wrap  = document.getElementById('crest-wrap');
    const inner = document.getElementById('crest-ring-inner');
    const tier  = document.getElementById('crest-tier');
    return {
      wrapDisplayed: wrap && wrap.style.display !== 'none',
      hasContent:    !!inner && inner.innerHTML.length > 0,
      hasImg:        !!inner && /<img[^>]+gryffondor\.png/.test(inner.innerHTML),
      ratioVar:      wrap && wrap.style.getPropertyValue('--crest-ratio'),
      tierLabel:     tier && tier.textContent
    };
  });
  console.log('  HUD crest →', cloneCheck);
  assert(cloneCheck.wrapDisplayed, '#crest-wrap doit être visible après choix de Maison');
  assert(cloneCheck.hasContent && cloneCheck.hasImg, 'crest-ring-inner ne reflète pas le PNG choisi');
  assert(cloneCheck.ratioVar !== '', '--crest-ratio non posée sur #crest-wrap');
  assert(cloneCheck.tierLabel === 'BRZ', `ruban tier attendu BRZ, got ${cloneCheck.tierLabel}`);

  // P2 — party-cards V3 portrait BG : chaque carte a une .pcard-bg avec
  // background-image non vide, et le contenu droit (.pcard-content) existe.
  const pcardCheck = await page.evaluate(() => {
    const cards = [0, 1].map(i => {
      const card = document.getElementById(`char-card-${i}`);
      const bg = document.getElementById(`pcard-bg-${i}`);
      const content = card ? card.querySelector('.pcard-content') : null;
      return {
        cardExists: !!card,
        bgExists: !!bg,
        bgImage: bg ? bg.style.backgroundImage : '',
        contentExists: !!content,
        hpInContent: content ? !!content.querySelector('#hp-text-' + i) : false
      };
    });
    return cards;
  });
  console.log('  party-cards V3 →', pcardCheck);
  pcardCheck.forEach((c, i) => {
    assert(c.cardExists,    `#char-card-${i} doit exister`);
    assert(c.bgExists,      `#pcard-bg-${i} doit exister`);
    assert(/url\(/.test(c.bgImage), `pcard-bg-${i} doit avoir un background-image url(...) — got: ${c.bgImage}`);
    assert(c.contentExists, `.pcard-content doit exister dans char-card-${i}`);
    assert(c.hpInContent,   `#hp-text-${i} doit être imbriqué dans .pcard-content`);
  });

  // P3 — XP rapatriée : chaque .pcard-content possède une .stat-bar-row.xp-row
  // avec #xp-text-{idx} et #xp-bar-{idx} reflétant player.xp / player.xpNext.
  const xpCheck = await page.evaluate(() => {
    if (player) { player.xp = 30; player.xpNext = 80; }
    if (typeof updateUI === 'function') updateUI();
    return [0, 1].map(i => {
      const row  = document.querySelector(`#char-card-${i} .stat-bar-row.xp-row`);
      const text = document.getElementById(`xp-text-${i}`);
      const bar  = document.getElementById(`xp-bar-${i}`);
      return {
        rowExists:  !!row,
        textValue:  text ? text.textContent : null,
        barWidth:   bar  ? bar.style.width  : null,
        oldXpContainerGone: !document.getElementById('xp-container'),
        oldBadgeGone:       !document.getElementById('house-badge')
      };
    });
  });
  console.log('  XP rapatriée →', xpCheck);
  xpCheck.forEach((x, i) => {
    assert(x.rowExists, `.stat-bar-row.xp-row absente dans #char-card-${i}`);
    assert(x.textValue === '30/80', `#xp-text-${i} attendu "30/80", got "${x.textValue}"`);
    assert(x.barWidth === '37.5%' || /3[67]\.\d*%/.test(x.barWidth || ''),
      `#xp-bar-${i}.style.width incohérent, got ${x.barWidth}`);
    assert(x.oldXpContainerGone, '#xp-container ne doit plus exister');
    assert(x.oldBadgeGone,       '#house-badge ne doit plus exister');
  });

  // P4 — popup détail Maison : openHouseDetail() peuple #house-detail-content
  // avec ≥ 4 lignes de paliers et marque le tier courant.
  const popupCheck = await page.evaluate(() => {
    // 230 pts → tier 1 (50 Bronze) ✓ et tier 2 (150 Argent) ✓ ; tier 3 (300 Or) = prochain
    chosenHouse = 'Gryffondor'; housePoints = 230; houseTier = 2;
    openHouseDetail();
    const modal = document.getElementById('house-detail-modal');
    const content = document.getElementById('house-detail-content');
    const rows = content ? content.querySelectorAll('.hd-tier-row') : [];
    const goalRow = content ? content.querySelector('.hd-tier-row[data-goal="true"]') : null;
    const openDisplay = modal && modal.style.display;
    closeModal('house-detail-modal');
    const closeDisplay = modal && modal.style.display;
    return {
      modalDisplay:    openDisplay,
      hasContent:      !!content && content.innerHTML.length > 0,
      tierRowsCount:   rows.length,
      hasGoalMarker:   !!goalRow,
      goalLabel:       goalRow ? goalRow.querySelector('.hd-tier-label').textContent : null,
      closeWorks:      closeDisplay === 'none'
    };
  });
  console.log('  popup Maison →', popupCheck);
  assert(popupCheck.modalDisplay === 'flex', `#house-detail-modal doit être en display:flex, got ${popupCheck.modalDisplay}`);
  assert(popupCheck.hasContent,    '#house-detail-content doit être peuplé');
  assert(popupCheck.tierRowsCount >= 4, `≥ 4 paliers attendus, got ${popupCheck.tierRowsCount}`);
  assert(popupCheck.hasGoalMarker, 'le tier "►" (current goal) doit être marqué');
  assert(popupCheck.closeWorks,    'closeModal("house-detail-modal") doit fonctionner');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ blasons + party-cards V3 + XP rapatriée + popup Maison conformes');
  await browser.close();
}

async function scenarioHouseTier5() {
  console.log('\n── Scénario endgame T2.3 : Maison Tier 16 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : pré-victoire, 16000 points → Virtuose Or (tier 15) accessible sans gate.
  const t1 = await page.evaluate(() => {
    victoryAchieved = false;
    housePoints     = 16000;
    houseTier       = 0; // simule restart
    checkHouseLevelUp();
    return { tier: houseTier, hasLame: player.inventory.some(i => i.id === 'lame_godric') };
  });
  console.log('  T1 pré-victoire 16000 pts →', t1);
  assert(t1.tier === 15,        'tier 15 (Virtuose Or) accessible sans victoire');
  assert(t1.hasLame === false,  'lame_godric pas livrée directement (vient de la quête de Maison)');

  // T2 : pré-victoire, 25000 points → reste à 15 (tier 16 Légende est gated).
  const t2 = await page.evaluate(() => {
    housePoints = 25000;
    checkHouseLevelUp();
    return { tier: houseTier };
  });
  console.log('  T2 pré-victoire 25000 pts →', t2);
  assert(t2.tier === 15, 'tier 16 (Légende) doit rester verrouillé sans victoire');

  // T3 : post-victoire, 25000 points → tier 16 + bonus passif.
  const t3 = await page.evaluate(() => {
    victoryAchieved = true;
    checkHouseLevelUp();
    return {
      tier: houseTier,
      atkBase: party[0]._baseAtk
    };
  });
  console.log('  T3 post-victoire 25000 pts →', t3);
  assert(t3.tier === 16, 'tier 16 (Légende) franchi post-victoire');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Maison Tier 16 OK');
  await browser.close();
}

async function scenarioHouseMytheTier() {
  console.log('\n── Scénario Maison V3 : palier 17 « Mythe » ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : 30000 pts mais hors Boucle Ténébreuse (floor 5) → tier 17 refusé.
  const t1 = await page.evaluate(() => {
    victoryAchieved = true;
    currentFloor    = 5;
    housePoints     = 30000;
    houseTier       = 16;          // simule Légende déjà atteinte
    checkHouseLevelUp();
    return { tier: houseTier, hasSpell: party[0].spells.includes('Patronus Maxima') };
  });
  console.log('  T1 floor 5  →', t1);
  assert(t1.tier === 16,        'tier 17 ne doit pas passer hors Boucle Ténébreuse');
  assert(t1.hasSpell === false, 'sort de Maison ne doit pas être appris hors gate');

  // T2 : floor 12 (Boucle Ténébreuse tier 1) → tier 17 franchi + sort enseigné.
  const t2 = await page.evaluate(() => {
    const atkBefore = party[0]._baseAtk;
    currentFloor = 12;
    checkHouseLevelUp();
    return {
      tier: houseTier,
      hasSpell: party[0].spells.includes('Patronus Maxima'),
      atkGain: party[0]._baseAtk - atkBefore,
    };
  });
  console.log('  T2 floor 12 →', t2);
  assert(t2.tier === 17,       'tier 17 « Mythe » non franchi en Boucle Ténébreuse');
  assert(t2.hasSpell === true, 'Patronus Maxima non enseigné au passage du palier');
  assert(t2.atkGain === 2,     'bonus +2 ATK du palier Mythe non appliqué');

  // T3 : les 4 sorts de Maison existent et ont un handler routable.
  const t3 = await page.evaluate(() => {
    const names = ['Patronus Maxima', 'Sectumsempra Imperius', 'Legilimens', 'Récolte Magique'];
    return names.map(n => {
      const s = SPELLS.find(x => x.name === n);
      return { n, found: !!s, handler: !!s && typeof SPELL_HANDLERS[s.effect] === 'function' };
    });
  });
  t3.forEach(r => {
    assert(r.found,   `sort ${r.n} absent de SPELLS`);
    assert(r.handler, `handler du sort ${r.n} absent de SPELL_HANDLERS`);
  });

  // T4 : chaque Maison a son tier 17 correctement configuré.
  const t4 = await page.evaluate(() => {
    const want = { Gryffondor: 'Patronus Maxima', Serpentard: 'Sectumsempra Imperius',
                   Serdaigle: 'Legilimens', Poufsouffle: 'Récolte Magique' };
    return Object.keys(want).map(h => {
      const t = HOUSE_BONUSES[h].tiers[16];   // index 16 = 17e palier
      return { h, ok: !!t && t.label === 'Mythe' && t.requiresDarkTier === 1
                     && t.bonus.grantsSpell === want[h] };
    });
  });
  t4.forEach(r => assert(r.ok, `tier 17 mal configuré pour ${r.h}`));

  // ── Mécaniques de combat des sorts exclusifs ──
  await startDummyFight(page, { hp: 200 });

  // T5 : Sectumsempra Imperius — l'ennemi asservi frappe son allié.
  const t5 = await page.evaluate(() => {
    const base = enemyGroup[0];
    enemyGroup = [
      { ...base, name: 'Alpha', currentHp: 200, hp: 200, atk: 30, def: 4, abilities: [], statusEffects: [] },
      { ...base, name: 'Beta',  currentHp: 200, hp: 200, atk: 30, def: 4, abilities: [], statusEffects: [] },
    ];
    party[0].statusEffects = [];
    party[0].hp = party[0].hpMax;
    applyStatus(enemyGroup[0], 'imperius', 0, 2);
    const betaBefore = enemyGroup[1].currentHp;
    enemyTurn();
    return {
      betaDropped:  enemyGroup[1].currentHp < betaBefore,
      imperiusLeft: enemyGroup[0].statusEffects.some(s => s.id === 'imperius'),
    };
  });
  console.log('  T5 imperius →', t5);
  assert(t5.betaDropped,  'l\'ennemi asservi n\'a pas frappé son allié');
  assert(t5.imperiusLeft, 'imperius (2 tours) doit rester actif après 1 tour');

  // T6 : Legilimens — la charge annule la prochaine capacité ennemie.
  const t6 = await page.evaluate(() => {
    const base = enemyGroup[0];
    enemyGroup = [{ ...base, name: 'Sorcier', currentHp: 200, hp: 200, atk: 40, def: 4,
      abilities: [{ name: 'Éclair', icon: '⚡', effect: 'damage', power: 60, chance: 1 }],
      statusEffects: [] }];
    party[0].statusEffects = [];
    party[0].hp = party[0].hpMax;
    shieldTurns = [0, 0];
    legilimensCancelCharges = 1;
    const hpBefore = party[0].hp;
    enemyTurn();
    return { chargeAfter: legilimensCancelCharges, allyUnharmed: party[0].hp === hpBefore };
  });
  console.log('  T6 legilimens →', t6);
  assert(t6.chargeAfter === 0, 'charge Legilimens non consommée');
  assert(t6.allyUnharmed,      'capacité ennemie non annulée par Legilimens');

  // T7 : Récolte Magique — restaure le groupe + arme le bonus d'or.
  const t7 = await page.evaluate(() => {
    party[0].hp = 1; party[0].sp = 1;
    recolteGoldBonus = false;
    const spell = SPELLS.find(s => s.name === 'Récolte Magique');
    SPELL_HANDLERS[spell.effect](spell, party[0]);
    return { full: party[0].hp === party[0].hpMax && party[0].sp === party[0].spMax,
             flag: recolteGoldBonus };
  });
  console.log('  T7 recolte →', t7);
  assert(t7.full,          'Récolte Magique ne restaure pas entièrement le groupe');
  assert(t7.flag === true, 'recolteGoldBonus non armé par Récolte Magique');

  // T8 : quête de don (gold-sink) ouverte au tier 17, remise consomme 3000.
  const t8 = await page.evaluate(() => {
    const offered = availableQuests.has('quest_don_gryff');
    acceptQuest('quest_don_gryff');
    const active = activeQuests.find(q => q.id === 'quest_don_gryff');
    player.gold = 500;
    _refreshObjectives();
    const lowDone = active.objectives[0].completed;
    const lowProg = active.objectives[0].progress;
    player.gold = 4200;
    _refreshObjectives();
    const okDone = active.objectives[0].completed;
    const goldBefore = player.gold;
    const turnedIn = turnInQuestById('quest_don_gryff');
    return {
      offered, lowDone, lowProg, okDone, turnedIn,
      goldSpent: goldBefore - player.gold,
      questGone: !activeQuests.some(q => q.id === 'quest_don_gryff'),
    };
  });
  console.log('  T8 quête de don →', t8);
  assert(t8.offered,            'quest_don_gryff non ouverte au franchissement du tier 17');
  assert(t8.lowDone === false,  'objectif donate validé à tort avec or insuffisant');
  assert(t8.lowProg === 500,    'progress donate doit refléter l\'or courant');
  assert(t8.okDone === true,    'objectif donate non validé avec or suffisant');
  assert(t8.turnedIn === true,  'remise de la quête de don échouée');
  assert(t8.goldSpent === 3000, 'le don doit consommer exactement 3000 Gallions');
  assert(t8.questGone,          'quête de don non retirée des quêtes actives');

  // T9 : statut « peur » — saut de tour + dissipation par Patronus Maxima.
  const t9 = await page.evaluate(() => {
    const out = { defDefined: typeof STATUS_DEFS !== 'undefined' && !!STATUS_DEFS.fear };
    const base = enemyGroup[0] || { name: 'X', icon: '👹' };
    enemyGroup = [{ ...base, name: 'Peureux', currentHp: 300, hp: 300, atk: 50, def: 4,
      abilities: [], statusEffects: [] }];
    party[0].statusEffects = [];
    party[0].hp = party[0].hpMax;
    shieldTurns = [0, 0];
    guardTurns  = [0, 0];
    applyStatus(enemyGroup[0], 'fear', 0, 3);
    out.isFeared = isFeared(enemyGroup[0]);
    const origRandom = Math.random;
    Math.random = () => 0.0;            // force le jet de peur (skip garanti)
    const hpBefore = party[0].hp;
    enemyTurn();
    Math.random = origRandom;
    out.allyUnharmed = party[0].hp === hpBefore;
    party[0].statusEffects = [];
    applyStatus(party[0], 'fear', 0, 3);
    const spell = SPELLS.find(s => s.name === 'Patronus Maxima');
    SPELL_HANDLERS[spell.effect](spell, party[0]);
    out.fearCleared = !party[0].statusEffects.some(s => s.id === 'fear');
    return out;
  });
  console.log('  T9 peur →', t9);
  assert(t9.defDefined,   'STATUS_DEFS.fear absent');
  assert(t9.isFeared,     'isFeared ne détecte pas le statut peur');
  assert(t9.allyUnharmed, 'ennemi apeuré (jet forcé) a quand même frappé');
  assert(t9.fearCleared,  'Patronus Maxima ne dissipe pas la peur');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Maison V3 palier 17 OK (gate + 4 sorts + quête de don + peur)');
  await browser.close();
}

async function scenarioHouseApotheoseTier() {
  console.log('\n── Scénario Maison V3 : palier 18 « Apothéose » ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : 45000 pts mais Boucle Ténébreuse tier 1 (floor 12) → tier 18 refusé.
  const t1 = await page.evaluate(() => {
    victoryAchieved = true;
    currentFloor    = 12;
    housePoints     = 45000;
    houseTier       = 17;          // simule Mythe déjà atteint
    checkHouseLevelUp();
    return { tier: houseTier };
  });
  console.log('  T1 floor 12 →', t1);
  assert(t1.tier === 17, 'tier 18 ne doit pas passer en Boucle Ténébreuse tier 1');

  // T2 : floor 22 (Boucle Ténébreuse tier 2) → tier 18 franchi.
  const t2 = await page.evaluate(() => {
    const atkBefore = party[0]._baseAtk;
    currentFloor = 22;
    checkHouseLevelUp();
    return { tier: houseTier, atkGain: party[0]._baseAtk - atkBefore,
             passive: houseApotheosePassive() };
  });
  console.log('  T2 floor 22 →', t2);
  assert(t2.tier === 18,              'tier 18 « Apothéose » non franchi en Boucle Ténébreuse tier 2');
  assert(t2.atkGain === 3,            'bonus +3 ATK du palier Apothéose non appliqué');
  assert(t2.passive === 'Gryffondor', 'houseApotheosePassive doit retourner la Maison au tier 18');

  // T3 : chaque Maison a son tier 18 correctement configuré.
  const t3 = await page.evaluate(() => {
    return ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].map(h => {
      const t = HOUSE_BONUSES[h].tiers[17];   // index 17 = 18e palier
      return { h, ok: !!t && t.label === 'Apothéose' && t.requiresDarkTier === 2 };
    });
  });
  t3.forEach(r => assert(r.ok, `tier 18 mal configuré pour ${r.h}`));

  // T4 : passif Gryffondor — Cœur du Lion : +10 % crit (physique ET
  // sort) + +15 % de dégâts critiques, appliqués au-dessus des plafonds.
  const t4 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    houseTier = 17; recalculateStats();
    const before = { crit: party[0].critChance, spellCrit: party[0].spellCritChance,
                     critMult: party[0].critMultiplier, spellCritMult: party[0].spellCritMultiplier };
    houseTier = 18; recalculateStats();
    const after = { crit: party[0].critChance, spellCrit: party[0].spellCritChance,
                    critMult: party[0].critMultiplier, spellCritMult: party[0].spellCritMultiplier };
    return { before, after };
  });
  console.log('  T4 Gryffondor crit →', t4);
  assert(t4.after.crit === Math.min(100, t4.before.crit + 10),
    'passif Gryffondor doit ajouter +10 % de crit physique');
  assert(t4.after.spellCrit === Math.min(100, t4.before.spellCrit + 10),
    'passif Gryffondor doit ajouter +10 % de crit de sort');
  assert(Math.abs(t4.after.critMult - Math.min(2.5, t4.before.critMult + 0.15)) < 1e-9,
    'passif Gryffondor doit ajouter +15 % de dégâts critiques physiques');
  assert(Math.abs(t4.after.spellCritMult - Math.min(2.5, t4.before.spellCritMult + 0.15)) < 1e-9,
    'passif Gryffondor doit ajouter +15 % de dégâts critiques de sort');

  // T7 : passif Poufsouffle — régénération hors combat à chaque pas.
  const t7 = await page.evaluate(() => {
    chosenHouse = 'Poufsouffle'; houseTier = 18;
    for (let y = 0; y < enemyMap.length; y++)
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    party[0].hp = 5; party[0].sp = 5;
    const hpBefore = party[0].hp, spBefore = party[0].sp;
    const x0 = playerX, y0 = playerY;
    for (let i = 0; i < 4 && playerX === x0 && playerY === y0; i++) {
      moveForward(); turnRight();
    }
    return { moved: playerX !== x0 || playerY !== y0,
             hpGain: party[0].hp - hpBefore, spGain: party[0].sp - spBefore };
  });
  console.log('  T7 Poufsouffle régén →', t7);
  assert(t7.moved,       'aucun pas possible pour tester la régén Poufsouffle');
  assert(t7.hpGain >= 2, 'passif Poufsouffle doit régénérer ≥ 2 PV par pas');
  assert(t7.spGain >= 2, 'passif Poufsouffle doit régénérer ≥ 2 PM par pas');

  // T8 : passif Poufsouffle — Vigueur : ×1.23 dégâts au-dessus de 60 %
  // PV, neutre en dessous, inactif hors Poufsouffle.
  const t8 = await page.evaluate(() => {
    chosenHouse = 'Poufsouffle'; houseTier = 18;
    party[0].hpMax = 100;
    party[0].hp = 80;  const high = _houseVigorMult(party[0]);
    party[0].hp = 40;  const low  = _houseVigorMult(party[0]);
    chosenHouse = 'Gryffondor';
    party[0].hp = 80;  const off  = _houseVigorMult(party[0]);
    return { high, low, off };
  });
  console.log('  T8 Poufsouffle Vigueur →', t8);
  assert(t8.high === 1.23, 'Vigueur doit donner ×1.23 au-dessus de 60 % PV');
  assert(t8.low === 1,    'Vigueur doit être neutre en dessous de 60 % PV');
  assert(t8.off === 1,    'Vigueur ne doit pas s\'appliquer hors Poufsouffle');

  // T9 : passif Gryffondor — Élan : un crit ajoute un palier (+8 %
  // dégâts), un coup non-critique n'ajoute rien, cumul plafonné à 5.
  const t9 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor'; houseTier = 18;
    elanStacks = [0, 0];
    const m0 = _houseElanMult(party[0]);          // 0 palier → ×1
    _updateElan(party[0], false);                  // non-crit → rien
    const afterMiss = elanStacks[0];
    _updateElan(party[0], true);                   // crit → +1 palier
    const m1 = _houseElanMult(party[0]);           // ×1.08
    for (let i = 0; i < 10; i++) _updateElan(party[0], true);
    const capped = elanStacks[0];                  // plafonné à 5
    const mCap = _houseElanMult(party[0]);         // ×1.40
    return { m0, afterMiss, m1, capped, mCap };
  });
  console.log('  T9 Gryffondor Élan →', t9);
  assert(t9.m0 === 1,             'Élan : 0 palier → multiplicateur ×1');
  assert(t9.afterMiss === 0,      'Élan : un coup non-critique n\'ajoute pas de palier');
  assert(Math.abs(t9.m1 - 1.08) < 1e-9,  'Élan : 1 palier → ×1.08');
  assert(t9.capped === 5,         'Élan : cumul plafonné à 5 paliers');
  assert(Math.abs(t9.mCap - 1.40) < 1e-9, 'Élan : 5 paliers → ×1.40');

  // ── Mécaniques en combat ──
  await startDummyFight(page, { hp: 400 });

  // T5 : passif Serpentard — un sort offensif draine des PV au lanceur.
  const t5 = await page.evaluate(() => {
    chosenHouse = 'Serpentard'; houseTier = 18;
    party[0].hp = 10;
    const spell = SPELLS.find(s => s.name === 'Incendio');
    const hpBefore = party[0].hp;
    SPELL_HANDLERS[spell.effect](spell, party[0], enemyGroup[0], 0);
    return { hpGain: party[0].hp - hpBefore };
  });
  console.log('  T5 Serpentard lifesteal →', t5);
  assert(t5.hpGain > 0, 'passif Serpentard doit drainer des PV sur un sort offensif');

  // T6 : passif Serdaigle — coût des sorts réduit de 20 %.
  const t6 = await page.evaluate(() => {
    const spell = SPELLS.find(s => s.name === 'Incendio');
    chosenHouse = 'Serdaigle'; houseTier = 18;
    const reduced = _spellSpCost(spell);
    chosenHouse = 'Gryffondor';
    const full = _spellSpCost(spell);
    return { full, reduced };
  });
  console.log('  T6 Serdaigle coût →', t6);
  assert(t6.reduced === Math.max(1, Math.ceil(t6.full * 0.8)),
    'passif Serdaigle doit réduire le coût des sorts de 20 %');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Maison V3 palier 18 OK (gate + passifs de Maison, Élan inclus)');
  await browser.close();
}

// Artefacts & Reliquaires 2.0 — P2 : variantes Premium par Maison.
// Vérifie (1) stats pré-cuites conformes à premiumStat(base), (2) remise
// cérémonielle = la Premium de chosenHouse devient réclamable au Chef de
// Maison, (3) l'item s'équipe et applique son bonus.
async function scenarioPremiumReward() {
  console.log('\n── Scénario : Artefacts P2 (variantes Premium par Maison) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const res = await page.evaluate(() => {
    const out = { tags: {}, precooked: {}, claimable: {}, equip: {} };
    // (1) tags + stats pré-cuites conformes à premiumStat(base, rareté)
    for (const [house, pid] of Object.entries(HOUSE_PREMIUM)) {
      const it   = ITEMS.find(i => i.id === pid);
      const base = it && ITEMS.find(i => i.id === it.premiumOf);
      out.tags[house] = !!(it && it.premium === true && base && it.houseAffinity === house);
      if (!it || !base) { out.precooked[house] = false; continue; }
      let ok = true;
      for (const f of ['bonusMag','bonusDef','bonusAtk','bonusSpellCritChance','regenHp','regenSp']) {
        if (typeof base[f] === 'number' && base[f] > 0) ok = ok && (it[f] === premiumStat(base[f], base.rarity));
      }
      // valeurs fractionnaires
      if (typeof base.bonusSpellCritDamage === 'number')
        ok = ok && (it.bonusSpellCritDamage === premiumStat(base.bonusSpellCritDamage, base.rarity, { fractional: true }));
      if (base.bonusElemDmg && typeof base.bonusElemDmg.tous === 'number')
        ok = ok && (it.bonusElemDmg.tous === premiumStat(base.bonusElemDmg.tous, base.rarity, { fractional: true }));
      // malus (≤0) jamais aggravé
      if (typeof base.bonusHpMax === 'number' && base.bonusHpMax < 0)
        ok = ok && (it.bonusHpMax === base.bonusHpMax);
      out.precooked[house] = ok;
    }
    // (2) remise cérémonielle : la Premium de la Maison est réclamable
    for (const [house, pid] of Object.entries(HOUSE_PREMIUM)) {
      out.claimable[house] = _houseClaimableItems(house).includes(pid);
    }
    // (3) équipement : la Premium Gryffondor (orbe, trinket) ajoute son MAG
    const c = party[0];
    c.equipped = { wand:null, head:null, body:null, hands:null, feet:null,
      cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats(); const magBefore = c.mag;
    const orbe = ITEMS.find(i => i.id === HOUSE_PREMIUM.Gryffondor);
    c.equipped.trinket = { ...orbe }; recalculateStats();
    out.equip = { delta: c.mag - magBefore, expected: orbe.bonusMag };
    return out;
  });
  console.log('  →', JSON.stringify(res));

  for (const h of ['Gryffondor','Serpentard','Serdaigle','Poufsouffle']) {
    assert(res.tags[h],      `${h} : Premium mal taguée (premium/premiumOf/houseAffinity)`);
    assert(res.precooked[h], `${h} : stats Premium non conformes à premiumStat(base)`);
    assert(res.claimable[h], `${h} : Premium absente de _houseClaimableItems (remise cérémonielle)`);
  }
  assert(res.equip.delta === res.equip.expected,
    `équipement Premium : MAG +${res.equip.expected} attendu, got +${res.equip.delta}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Artefacts P2 (Premium pré-cuites + remise cérémonielle + équipement) OK');
  await browser.close();
}

// Artefacts 2.0 — P3 : slot « faveur de Maison » dans la boutique fixe.
async function scenarioHouseFavorShop() {
  console.log('\n── Scénario : Artefacts P3 (slot faveur de Maison) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const res = await page.evaluate(() => {
    const out = {};
    for (const h of ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle']) {
      chosenHouse = h; currentFloor = 6; shopStock = null;
      const stock = _rollShopStock();
      const fav = stock.find(s => s.favor);
      const base = fav ? (ITEMS.find(i => i.id === fav.item.id).price) : 0;
      out[h] = {
        hasFav: !!fav,
        affMatch: !!fav && fav.item.houseAffinity === h,
        discounted: !!fav && fav.price === Math.round(base * 0.90),
        single: stock.filter(s => s.favor).length,
      };
    }
    return out;
  });
  console.log('  →', JSON.stringify(res));
  for (const h of ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle']) {
    assert(res[h].hasFav,     `${h} : un slot faveur doit être garanti à l'étage 6`);
    assert(res[h].affMatch,   `${h} : l'item faveur doit pencher vers ${h}`);
    assert(res[h].discounted, `${h} : la faveur doit être remisée de 10 %`);
    assert(res[h].single === 1, `${h} : un seul slot faveur attendu`);
  }

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Slot faveur de Maison OK (garanti + affinité + remise)');
  await browser.close();
}

async function scenarioHouseDonationAndStars() {
  console.log('\n── Scénario : Don Maison + série Apothéose ★ N ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : sans tier 17 atteint, donateGoldToHouse refuse.
  const t1 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    houseTier   = 16;
    housePoints = 25000;
    player.gold = 10000;
    const ok = donateGoldToHouse(1000);
    return { ok, gold: player.gold, points: housePoints };
  });
  console.log('  T1 sans tier 17 →', t1);
  assert(t1.ok === false,        'donation doit être refusée tant que houseTier < 17');
  assert(t1.gold === 10000,      'or ne doit pas bouger sur refus');
  assert(t1.points === 25000,    'points ne doivent pas bouger sur refus');

  // T2 : tier 17 atteint, donation de 1000 G = 200 points, or et points mis à jour.
  const t2 = await page.evaluate(() => {
    houseTier   = 17;
    housePoints = 25000;
    player.gold = 10000;
    const ok = donateGoldToHouse(1000);
    return { ok, gold: player.gold, points: housePoints, tier: houseTier };
  });
  console.log('  T2 don 1000 G →', t2);
  assert(t2.ok === true,         'donation doit réussir avec tier 17');
  assert(t2.gold === 9000,       '1000 G doivent être retirés');
  assert(t2.points === 25200,    '1000 G doivent ajouter +200 points');

  // T3 : plafonnement à player.gold (montant demandé > or disponible).
  const t3 = await page.evaluate(() => {
    houseTier   = 17;
    housePoints = 25000;
    player.gold = 999;
    const ok = donateGoldToHouse(5000);
    return { ok, gold: player.gold, points: housePoints };
  });
  console.log('  T3 plafonnement →', t3);
  assert(t3.ok === true,         'donation doit accepter le plafonnement');
  assert(t3.gold === 4,          'or restant = 999 % 5 = 4 G (reste non convertible)');
  assert(t3.points === 25199,    '999 G plafonnés à 995 G = 199 points');

  // T4 : franchissement tier 18 (Apothéose) — étage 22 (boucle 2) + don massif.
  const t4 = await page.evaluate(() => {
    victoryAchieved = true;
    currentFloor    = 22;
    chosenHouse     = 'Gryffondor';
    houseTier       = 17;
    housePoints     = 44999;   // 1 pt avant Apothéose
    player.gold     = 100;
    const atkBefore = party[0]._baseAtk;
    donateGoldToHouse(50);    // +10 pts → 45009 → franchit Apothéose
    return { tier: houseTier, points: housePoints, atkGain: party[0]._baseAtk - atkBefore };
  });
  console.log('  T4 franchit Apothéose →', t4);
  assert(t4.tier === 18,         'tier 18 (Apothéose) doit se franchir via donation');
  assert(t4.atkGain === 3,       'bonus +3 ATK du palier Apothéose doit s\'appliquer');

  // T5 : franchir ★ 1 (61 000 pts) — étage 22, tier 18 déjà acquis.
  const t5 = await page.evaluate(() => {
    currentFloor = 22;
    chosenHouse  = 'Gryffondor';
    houseTier    = 18;
    housePoints  = 60999;
    player.gold  = 100;
    const atkBefore = party[0]._baseAtk;
    const strBefore = party[0]._baseStr;
    donateGoldToHouse(50);    // +10 pts → 61009 → ★ 1 (seuil 61 000)
    return { tier: houseTier, points: housePoints,
             atkGain: party[0]._baseAtk - atkBefore,
             strGain: party[0]._baseStr - strBefore };
  });
  console.log('  T5 ★ 1 franchi →', t5);
  assert(t5.tier === 19,         '★ 1 → houseTier = 19');
  assert(t5.atkGain === 1,       '★ 1 → +1 ATK (stat principale Gryffondor)');
  assert(t5.strGain === 0,       '★ 1 → pas de STR (cadence tous les 2 ★)');

  // T6 : franchir ★ 2 (79 000 pts) — vérifie +1 STR (secondaire, n%2=0).
  const t6 = await page.evaluate(() => {
    currentFloor = 22;
    houseTier    = 19;
    housePoints  = 78999;
    player.gold  = 100;
    const strBefore = party[0]._baseStr;
    const lckBefore = party[0]._baseLck;
    donateGoldToHouse(50);    // +10 → 79009 → ★ 2
    return { tier: houseTier, strGain: party[0]._baseStr - strBefore,
             lckGain: party[0]._baseLck - lckBefore };
  });
  console.log('  T6 ★ 2 franchi →', t6);
  assert(t6.tier === 20,         '★ 2 → houseTier = 20');
  assert(t6.strGain === 1,       '★ 2 → +1 STR (cadence tous les 2 ★)');
  assert(t6.lckGain === 0,       '★ 2 → pas de LCK (cadence tous les 5 ★)');

  // T7 : franchir ★ 5 d'un coup depuis ★ 2 (don massif), vérifier +1 LCK
  // au passage et cumul correct de stats sur 3 étoiles (★3, ★4, ★5).
  const t7 = await page.evaluate(() => {
    currentFloor = 22;
    houseTier    = 20;        // ★ 2
    housePoints  = 79000;
    // ★ 5 seuil = 45000 + 75000 + 25000 = 145000
    // depuis 79 000 → besoin de 66 000 pts = 330 000 G
    player.gold  = 500000;
    const atkBefore = party[0]._baseAtk;
    const strBefore = party[0]._baseStr;
    const lckBefore = party[0]._baseLck;
    donateGoldToHouse(400000);
    return { tier: houseTier, points: housePoints,
             atkGain: party[0]._baseAtk - atkBefore,
             strGain: party[0]._baseStr - strBefore,
             lckGain: party[0]._baseLck - lckBefore };
  });
  console.log('  T7 ★ 5 franchi en cascade →', t7);
  // ★3 = +1 ATK seul, ★4 = +1 ATK + +1 STR (pair), ★5 = +1 ATK + +1 LCK (multiple de 5).
  assert(t7.tier === 23,         '★ 5 → houseTier = 23 (18 + 5)');
  assert(t7.atkGain === 3,       '3 étoiles franchies → +3 ATK');
  assert(t7.strGain === 1,       'STR : ★ 4 seul (pair) → +1');
  assert(t7.lckGain === 1,       '★ 5 multiple de 5 → +1 LCK');

  // T8 : gate Boucle Ténébreuse 2 — étage 12 (boucle 1) doit bloquer ★ N
  // malgré housePoints suffisants.
  const t8 = await page.evaluate(() => {
    currentFloor = 12;          // boucle 1, gate refusée
    chosenHouse  = 'Gryffondor';
    houseTier    = 18;
    housePoints  = 200000;
    checkHouseLevelUp();
    return { tier: houseTier };
  });
  console.log('  T8 gate boucle 2 →', t8);
  assert(t8.tier === 18,         'étoiles bloquées hors Boucle Ténébreuse 2');

  // T9 : donationIntroPlayed bascule à true à la 1ʳᵉ ouverture de la modale.
  const t9 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    houseTier   = 17;
    donationIntroPlayed = false;
    openHouseDonationModal();
    const after1 = donationIntroPlayed;
    closeHouseDonationModal();
    // 2ème ouverture
    openHouseDonationModal();
    const after2 = donationIntroPlayed;
    closeHouseDonationModal();
    return { after1, after2 };
  });
  console.log('  T9 intro joué une fois →', t9);
  assert(t9.after1 === true,     'intro doit basculer donationIntroPlayed à true');
  assert(t9.after2 === true,     'donationIntroPlayed reste à true ensuite');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Don Maison + série Apothéose ★ N OK');
  await browser.close();
}

async function scenarioHouseRewardFlow() {
  console.log('\n── Scénario : Récompense Maison remise par PNJ ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : franchir seuil Apprenti Or (tier 3, 300 pts) → item en attente, pas dans inventaire.
  // Architecture 16 paliers : brassard_lion est désormais distribué au
  // tier 3 (Apprenti Or). On démarre à tier 2 (Apprenti Argent, 150 pts)
  // pour vérifier le franchissement vers Or.
  const t1 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    housePoints = 300;
    houseTier   = 2;
    pendingHouseRewards = new Set();
    checkHouseLevelUp();
    return {
      tier:       houseTier,
      pending:    pendingHouseRewards.has('brassard_lion'),
      inInv:      (player.inventory || []).some(i => i && i.id === 'brassard_lion')
    };
  });
  console.log('  T1 seuil 300 →', t1);
  assert(t1.tier === 3,    'tier non passé à 3 (Apprenti Or)');
  assert(t1.pending,       'brassard_lion non mis en attente');
  assert(!t1.inInv,        'brassard_lion distribué automatiquement (bug)');

  // T2 : visite McGonagall → réception
  const t2 = await page.evaluate(() => {
    triggerNpcSpecialAction('mcgonagall');
    return {
      pending: pendingHouseRewards.has('brassard_lion'),
      inInv:   (player.inventory || []).some(i => i && i.id === 'brassard_lion')
    };
  });
  console.log('  T2 visite McGonagall →', t2);
  assert(!t2.pending, 'brassard toujours en attente après réclamation');
  assert(t2.inInv,    'brassard absent de l\'inventaire après réclamation');

  // T3 : mauvaise Maison → refus (McGonagall n'est pas Serpentard)
  const t3 = await page.evaluate(() => {
    chosenHouse = 'Serpentard';
    pendingHouseRewards.add('anneau_serpent');
    triggerNpcSpecialAction('mcgonagall');
    return pendingHouseRewards.has('anneau_serpent');
  });
  console.log('  T3 mauvaise Maison →', { stillPending: t3 });
  assert(t3, 'McGonagall a distribué une récompense Serpentard (bug)');

  // T4 : inventaire plein → l'item reste en attente (pas de perte silencieuse)
  const t4 = await page.evaluate(() => {
    chosenHouse = 'Serpentard';
    pendingHouseRewards.add('anneau_serpent');
    player.inventory = Array.from({ length: 16 }, () => ({
      id: 'potion_s', name: 'Potion', icon: '🧪', type: 'consumable'
    }));
    triggerNpcSpecialAction('rogue');
    return pendingHouseRewards.has('anneau_serpent');
  });
  console.log('  T4 inventaire plein →', { stillPending: t4 });
  assert(t4, 'anneau_serpent perdu silencieusement (inventaire plein)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Flow récompense Maison conforme');
  await browser.close();
}

async function scenarioHouseSetQuest() {
  console.log('\n── Scénario Maisons 2.0 : Quête de Maison (tier 12) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T0 : avant le palier 12, la quête de Maison ne doit pas être proposée.
  const t0 = await page.evaluate(() => ({
    inAvailable: availableQuests.has('quest_set_gryff'),
    tierUnlock:  HOUSE_BONUSES.Gryffondor.tiers[11].bonus.unlockSetQuest === true
  }));
  console.log('  T0 état initial →', t0);
  assert(!t0.inAvailable, 'quest_set_gryff ne devrait pas être disponible avant tier 12');
  assert(t0.tierUnlock,   'tier 12 (Maître Or) devrait porter unlockSetQuest:true');

  // T1 : franchir le palier 12 (8000 pts) → quête débloquée + cape_godric en attente.
  const t1 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    houseTier   = 11;
    housePoints = 8000;
    pendingHouseRewards = new Set();
    checkHouseLevelUp();
    return {
      tier:        houseTier,
      questOpen:   availableQuests.has('quest_set_gryff'),
      capePending: pendingHouseRewards.has('cape_godric')
    };
  });
  console.log('  T1 tier 12 franchi →', t1);
  assert(t1.tier === 12,    'tier non passé à 12 (Maître Or)');
  assert(t1.questOpen,      'quest_set_gryff non ajoutée à availableQuests');
  assert(t1.capePending,    'cape_godric (pièce #3) non mise en attente chez McGonagall');

  // T2 : accepter la quête → activée, retirée de availableQuests.
  const t2 = await page.evaluate(() => {
    acceptQuest('quest_set_gryff');
    return {
      isActive:    activeQuests.some(q => q.id === 'quest_set_gryff'),
      stillAvail:  availableQuests.has('quest_set_gryff')
    };
  });
  console.log('  T2 acceptation →', t2);
  assert(t2.isActive,    'quest_set_gryff n\'est pas dans activeQuests après acceptation');
  assert(!t2.stillAvail, 'quest_set_gryff toujours dans availableQuests après acceptation');

  // T3 : simuler 3 kills de Chimère → étape complétée mais quête reste active
  // tant qu'elle n'est pas remise au PNJ.
  const t3 = await page.evaluate(() => {
    checkKillQuests('chimere');
    checkKillQuests('chimere');
    checkKillQuests('chimere');
    const q = activeQuests.find(x => x.id === 'quest_set_gryff');
    return {
      progress:    q ? q.objectives[0].progress  : -1,
      stepDone:    q ? q.objectives[0].completed : false,
      stillActive: !!q
    };
  });
  console.log('  T3 après 3 kills →', t3);
  assert(t3.progress === 3,  'progression kill incorrecte');
  assert(t3.stepDone,        'étape kill non marquée complétée');
  assert(t3.stillActive,     'la quête doit rester active jusqu\'à la remise');

  // T4 : remise via dialogue PNJ → pièce #4 (coeur_lion) en attente,
  // PAS dans l'inventaire (route cérémonie head-of-house).
  const t4 = await page.evaluate(() => {
    turnInQuestById('quest_set_gryff');
    return {
      completed:     completedQuests.has('quest_set_gryff'),
      stillActive:   activeQuests.some(q => q.id === 'quest_set_gryff'),
      heartPending:  pendingHouseRewards.has('coeur_lion'),
      heartInInv:    (player.inventory || []).some(i => i && i.id === 'coeur_lion')
    };
  });
  console.log('  T4 remise →', t4);
  assert(t4.completed,     'quest_set_gryff non marquée complétée');
  assert(!t4.stillActive,  'la quête doit avoir quitté activeQuests');
  assert(t4.heartPending,  'coeur_lion (pièce #4) non poussé dans pendingHouseRewards');
  assert(!t4.heartInInv,   'coeur_lion distribué directement dans l\'inventaire (bug)');

  // T5 : cérémonie head-of-house → coeur_lion + cape_godric reçus.
  const t5 = await page.evaluate(() => {
    triggerNpcSpecialAction('mcgonagall');
    return {
      heartInInv:   (player.inventory || []).some(i => i && i.id === 'coeur_lion'),
      capeInInv:    (player.inventory || []).some(i => i && i.id === 'cape_godric'),
      pendingLeft:  Array.from(pendingHouseRewards || [])
    };
  });
  console.log('  T5 réclamation →', t5);
  assert(t5.heartInInv,    'coeur_lion absent de l\'inventaire après réclamation');
  assert(t5.capeInInv,     'cape_godric absente de l\'inventaire après réclamation');
  assert(t5.pendingLeft.length === 0, `pendingHouseRewards résiduel : ${t5.pendingLeft.join(',')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Quête de Maison + remise cérémonielle conformes');
  await browser.close();
}

async function scenarioHouseSetUI() {
  console.log('\n── Scénario Maisons 2.0 : UI Set Maison sur fiche perso ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : aucun équipement → encart visible avec 4 cellules manquantes,
  // 0 bonus actif.
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    pendingHouseRewards = new Set();
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    const cells = panel ? panel.querySelectorAll('.set-cell') : [];
    const bonuses = panel ? panel.querySelectorAll('.set-bonus-row') : [];
    return {
      panelOpen:    !!panel,
      title:        panel ? panel.querySelector('.panel-title').textContent.trim() : null,
      cellCount:    cells.length,
      missingCount: panel ? panel.querySelectorAll('.set-cell-missing').length : 0,
      bonusRows:    bonuses.length,
      activeBonus:  panel ? panel.querySelectorAll('.set-bonus-row.active').length : 0
    };
  });
  console.log('  T1 vide →', t1);
  assert(t1.panelOpen,           'encart Set Maison non rendu');
  assert(/Set du Lion/i.test(t1.title || ''), `titre inattendu : ${t1.title}`);
  assert(t1.cellCount === 4,     `4 médaillons attendus, obtenu ${t1.cellCount}`);
  assert(t1.missingCount === 4,  '4 cellules doivent être en état missing');
  // À 0/4, on remplace les 3 paliers inactifs par 1 ligne de teasing
  // (gain ~80 px sur la fiche desktop, contenu compact). Voir
  // _renderHouseSetPanel (ui.js).
  assert(t1.bonusRows === 1,     '1 seule ligne teaser attendue à 0/4 (vs 3 paliers détaillés)');
  assert(t1.activeBonus === 0,   'aucun palier ne doit être actif à 0/4');

  // T2 : 2 pièces équipées → 2 cellules « equipped », 1 palier actif.
  const t2 = await page.evaluate(() => {
    party[0].equipped.hands = { ...ITEMS.find(i => i.id === 'brassard_lion') };
    party[0].equipped.head  = { ...ITEMS.find(i => i.id === 'heaume_vaillant') };
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    return {
      title:         panel.querySelector('.panel-title').textContent.trim(),
      equippedCount: panel.querySelectorAll('.set-cell-equipped').length,
      missingCount:  panel.querySelectorAll('.set-cell-missing').length,
      activeBonus:   panel.querySelectorAll('.set-bonus-row.active').length
    };
  });
  console.log('  T2 2/4 équipées →', t2);
  assert(/2\/4/.test(t2.title),     `titre doit refléter 2/4 : ${t2.title}`);
  assert(t2.equippedCount === 2,   `2 cellules equipped attendues, obtenu ${t2.equippedCount}`);
  assert(t2.missingCount === 2,    `2 cellules missing attendues, obtenu ${t2.missingCount}`);
  assert(t2.activeBonus === 1,     `1 palier actif (2/4) attendu, obtenu ${t2.activeBonus}`);

  // T3 : 1 pièce au sac + 1 pièce en attente chez le Chef.
  const t3 = await page.evaluate(() => {
    player.inventory = [{ ...ITEMS.find(i => i.id === 'cape_godric') }];
    pendingHouseRewards = new Set(['coeur_lion']);
    recalculateStats();
    openCharacter(0);
    const panel = document.querySelector('.section-houseset');
    return {
      inInvCount:    panel.querySelectorAll('.set-cell-in_inv').length,
      pendingCount:  panel.querySelectorAll('.set-cell-pending').length,
      missingCount:  panel.querySelectorAll('.set-cell-missing').length
    };
  });
  console.log('  T3 mix états →', t3);
  assert(t3.inInvCount === 1,    `1 cellule in_inv attendue, obtenu ${t3.inInvCount}`);
  assert(t3.pendingCount === 1,  `1 cellule pending attendue, obtenu ${t3.pendingCount}`);
  assert(t3.missingCount === 0,  `0 cellule missing attendue, obtenu ${t3.missingCount}`);

  // T4 : aucune Maison choisie → encart absent.
  const t4 = await page.evaluate(() => {
    chosenHouse = null;
    openCharacter(0);
    return { panelOpen: !!document.querySelector('.section-houseset') };
  });
  console.log('  T4 sans Maison →', t4);
  assert(!t4.panelOpen, 'encart Set Maison ne doit pas apparaître sans chosenHouse');

  // T5 : tag SET dans showEquipMenu pour une pièce de set.
  const t5 = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    partySize = 2;                                 // duo pour forcer le menu (vs équipement direct)
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    player.inventory = [{ ...ITEMS.find(i => i.id === 'heaume_vaillant') }];
    openInventory();
    showEquipMenu(player.inventory[0], 0);
    const badge = document.querySelector('#inv-grid .equip-menu-set-badge');
    return { hasBadge: !!badge, badgeText: badge ? badge.textContent.trim() : '' };
  });
  console.log('  T5 badge SET dans showEquipMenu →', t5);
  assert(t5.hasBadge,                       'tag SET absent du menu d\'équipement');
  assert(/Set du Lion/i.test(t5.badgeText), `texte du badge inattendu : ${t5.badgeText}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Encart Set Maison + tag SET conformes');
  await browser.close();
}

async function scenarioHouseSet() {
  console.log('\n── Scénario Maisons 2.0 : Set du Lion (4 pièces) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 0 pièce équipée → pas de bonus de set
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T1 0/4 →', t1);
  assert(t1.count === 0, '_gryff_setCount === 0 à vide');

  // T2 : 2 pièces équipées (brassard hands + heaume head) → setBonus2 +1 ATK +3 crit
  const t2 = await page.evaluate(() => {
    party[0].equipped.hands = { ...ITEMS.find(i => i.id === 'brassard_lion') };
    party[0].equipped.head  = { ...ITEMS.find(i => i.id === 'heaume_vaillant') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T2 2/4 →', t2);
  assert(t2.count === 2,                'compte 2/4');
  assert(t2.atk   >= t1.atk + 4,        'ATK +4 minimum (2+2 stats items + 1 setBonus2 dépend de calibration)');
  assert(t2.crit  >= t1.crit + 3 - 0.5, '+3 crit du setBonus2');

  // T3 : 3 pièces (+ cape_godric cloak) → setBonus2 + setBonus3 cumulés
  const t3 = await page.evaluate(() => {
    party[0].equipped.cloak = { ...ITEMS.find(i => i.id === 'cape_godric') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T3 3/4 →', t3);
  assert(t3.count === 3,                'compte 3/4');
  assert(t3.crit  >= t2.crit + 7 - 0.5, '+7 crit cumulé du setBonus3');

  // T4 : 4 pièces (+ coeur_lion amulet) → tous les bonus actifs
  const t4 = await page.evaluate(() => {
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'coeur_lion') };
    recalculateStats();
    return { count: party[0]._gryff_setCount | 0, atk: party[0].atk, crit: party[0].critChance };
  });
  console.log('  T4 4/4 →', t4);
  assert(t4.count === 4,                 'compte 4/4');
  assert(t4.crit  >= t3.crit + 12 - 0.5, '+12 crit du setBonus4 (immuneDisarm hors-stats)');

  // T5 : set Poufsouffle 4/4 → regenHp +2/tour dans applyEquipmentRegen
  const t5 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    party[0].equipped.belt   = { ...ITEMS.find(i => i.id === 'ceinture_blaireau') };
    party[0].equipped.cloak  = { ...ITEMS.find(i => i.id === 'cape_loyaute') };
    party[0].equipped.head   = { ...ITEMS.find(i => i.id === 'coiffe_blaireau') };
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'medaillon_helga') };
    recalculateStats();
    party[0].hp = Math.max(1, party[0].hpMax - 10);
    const hpBefore = party[0].hp;
    if (typeof applyEquipmentRegen === 'function') applyEquipmentRegen();
    return { count: party[0]._pouf_setCount | 0, hpDelta: party[0].hp - hpBefore };
  });
  console.log('  T5 Pouf 4/4 regen →', t5);
  assert(t5.count === 4,    'Pouf 4/4 détecté');
  assert(t5.hpDelta >= 3,   'regenHp ≥ 3 (1 du medaillon_helga + 2 du setBonus4)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Set Maison Lion + Blaireau OK');
  await browser.close();
}

async function scenarioHouseSetCompleteFeedback() {
  console.log('\n── Scénario Maisons 2.0 — Étape 6 : feedback Set 4/4 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Setup : spy sur AudioSystem.playSetComplete (compteur d'appels)
  await page.evaluate(() => {
    window.__setCompleteCalls = 0;
    const orig = AudioSystem.playSetComplete.bind(AudioSystem);
    AudioSystem.playSetComplete = function () {
      window.__setCompleteCalls++;
      // Ne joue pas le son en headless (le contexte audio peut être bloqué).
    };
    // Reset équipement à vide
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    // Préempte les 4 pièces du Set du Lion dans l'inventaire
    player.inventory = [];
    ['brassard_lion', 'heaume_vaillant', 'cape_godric', 'coeur_lion'].forEach(id => {
      const it = ITEMS.find(i => i.id === id);
      if (it) player.inventory.push({ ...it });
    });
  });

  // T1 : équipe la 1re pièce (brassard, hands) → pas de complétion
  const t1 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'brassard_lion');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T1 1/4 →', t1);
  assert(t1.calls === 0, 'aucun appel à playSetComplete à 1/4');
  assert(t1.count === 1, 'compteur Gryff = 1');

  // T2 : 2ᵉ pièce (heaume, head) → pas de complétion
  const t2 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'heaume_vaillant');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T2 2/4 →', t2);
  assert(t2.calls === 0, 'aucun appel à 2/4');
  assert(t2.count === 2, 'compteur Gryff = 2');

  // T3 : 3ᵉ pièce (cape, cloak) → pas de complétion
  const t3 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'cape_godric');
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0 };
  });
  console.log('  T3 3/4 →', t3);
  assert(t3.calls === 0, 'aucun appel à 3/4');
  assert(t3.count === 3, 'compteur Gryff = 3');

  // T4 : 4ᵉ pièce (coeur_lion, amulet) → 1 appel + message
  const t4 = await page.evaluate(() => {
    const idx = player.inventory.findIndex(i => i.id === 'coeur_lion');
    equipItem(idx, 0);
    const log = document.getElementById('msg-log');
    const txt = log ? log.textContent : '';
    return {
      calls: window.__setCompleteCalls,
      count: party[0]._gryff_setCount | 0,
      hasMsg: txt.includes('Set du Lion complet') || txt.includes('complet (4/4)')
    };
  });
  console.log('  T4 4/4 →', t4);
  assert(t4.calls === 1,  '1 appel à playSetComplete à 4/4');
  assert(t4.count === 4,  'compteur Gryff = 4');
  assert(t4.hasMsg,       'message « Set du Lion complet » présent dans msg-log');

  // T5 : remplacer une pièce non-set par une rare hors-set (ex : bottes)
  //      → le compteur reste à 4, pas de re-trigger.
  const t5 = await page.evaluate(() => {
    // ajoute des bottes basiques en inventaire et équipe-les
    const bottes = ITEMS.find(i => i.id === 'bottes_apprenti');
    if (!bottes) return { skipped: true };
    player.inventory.push({ ...bottes });
    const idx = player.inventory.length - 1;
    equipItem(idx, 0);
    return { calls: window.__setCompleteCalls, count: party[0]._gryff_setCount | 0, skipped: false };
  });
  console.log('  T5 équipe hors-set →', t5);
  if (!t5.skipped) {
    assert(t5.calls === 1,  'pas de re-trigger en équipant hors-set');
    assert(t5.count === 4,  'compteur Gryff reste à 4');
  }

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Feedback Set 4/4 OK');
  await browser.close();
}

async function scenarioHouseSaveRoundTrip() {
  console.log('\n── Scénario Maisons 2.0 — Étape 6 : save round-trip ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Setup : injecte un état Maison riche (paliers franchis + pièces
  // pending) puis serialize → reset → applyState → compare.
  const result = await page.evaluate(() => {
    // 1) État avant save
    housePoints = 8200;          // au-delà du palier 12 (8000 = Maître Or)
    houseTier   = 12;            // tier 12 atteint
    pendingHouseRewards = new Set(['heaume_vaillant', 'cape_godric']);
    chosenHouse = 'Gryffondor';

    const before = {
      house:    chosenHouse,
      points:   housePoints,
      tier:     houseTier,
      pending:  Array.from(pendingHouseRewards).sort(),
    };

    // 2) Serialize
    const snapshot = _serializeState();

    // 3) Reset runtime (simule un nouveau slot)
    housePoints         = 0;
    houseTier           = 0;
    pendingHouseRewards = new Set();
    chosenHouse         = null;

    // 4) ApplyState
    _applyState(snapshot);

    const after = {
      house:    chosenHouse,
      points:   housePoints,
      tier:     houseTier,
      pending:  Array.from(pendingHouseRewards).sort(),
    };

    return { before, after, serializedPending: snapshot.pendingHouseRewards };
  });

  console.log('  before →', result.before);
  console.log('  after  →', result.after);
  console.log('  snapshot.pendingHouseRewards →', result.serializedPending);

  assert(result.after.house  === result.before.house,  'chosenHouse restauré');
  assert(result.after.points === result.before.points, 'housePoints restauré');
  assert(result.after.tier   === result.before.tier,   'houseTier restauré');
  // Les IDs sauvegardés (heaume_vaillant, cape_godric) doivent survivre.
  // `_migrateHouseRewards` peut en ajouter d'autres (paliers franchis dont
  // l'item n'est ni en inv ni équipé : brassard_lion tier 3, sword_gryff
  // tier 9). On vérifie donc le subset, pas l'égalité.
  for (const id of result.before.pending) {
    assert(result.after.pending.includes(id),
           `pendingHouseRewards préserve ${id} après round-trip`);
  }
  assert(Array.isArray(result.serializedPending),
         'pendingHouseRewards sérialisé comme Array (et non Set)');
  // Sanity : les IDs sérialisés sont bien les inputs (snapshot pré-migrate).
  assert(
    JSON.stringify([...result.serializedPending].sort()) ===
      JSON.stringify(['cape_godric', 'heaume_vaillant']),
    'snapshot.pendingHouseRewards reflète strictement l\'input'
  );

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Save round-trip Maison OK');
  await browser.close();
}

async function scenarioTenebresSet() {
  console.log('\n── Scénario endgame T2.4 : Set bonus Ténèbres ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : 0 item du set → pas de bonus
  const t1 = await page.evaluate(() => {
    party[0].equipped = { wand:null, head:null, body:null, hands:null, feet:null,
                          cloak:null, amulet:null, ring1:null, ring2:null, belt:null, trinket:null };
    recalculateStats();
    return { crit: party[0].critChance, dodge: party[0].dodgeChance, count: party[0]._tenebresSetCount };
  });
  console.log('  T1 0/3 →', t1);
  assert(t1.count === 0, '_tenebresSetCount === 0');

  // T2 : 2 items du set → +10 crit, +5 dodge
  const t2 = await page.evaluate(() => {
    party[0].equipped.cloak  = { ...ITEMS.find(i => i.id === 'cape_voldemort') };
    party[0].equipped.amulet = { ...ITEMS.find(i => i.id === 'cendres_phenix') };
    recalculateStats();
    return { crit: party[0].critChance, dodge: party[0].dodgeChance, count: party[0]._tenebresSetCount };
  });
  console.log('  T2 2/3 →', t2);
  assert(t2.count === 2,                    '_tenebresSetCount === 2');
  assert(t2.crit  >= t1.crit + 10 - 0.5,    'crit +10 au moins');
  assert(t2.dodge >= t1.dodge + 5 - 0.5,    'dodge +5 au moins');

  // T3 : 3 items du set → +15 crit, +10 dodge, +2 regenHp
  const t3 = await page.evaluate(() => {
    party[0].equipped.trinket = { ...ITEMS.find(i => i.id === 'oeil_basilic') };
    recalculateStats();
    // simule un tick regen
    party[0].hp = Math.max(1, party[0].hpMax - 10);
    const hpBefore = party[0].hp;
    if (typeof applyEquipmentRegen === 'function') applyEquipmentRegen();
    return {
      crit: party[0].critChance,
      dodge: party[0].dodgeChance,
      count: party[0]._tenebresSetCount,
      hpDelta: party[0].hp - hpBefore
    };
  });
  console.log('  T3 3/3 →', t3);
  assert(t3.count === 3,                    '_tenebresSetCount === 3');
  // oeil_basilic apporte aussi +10 crit et +5 dodge intrinsèques.
  assert(t3.crit  >= t2.crit + 15 - 0.5,    'crit +15 total (10 du set 2/3 → 15 du set 3/3 + bonus item)');
  assert(t3.hpDelta >= 2,                   'set 3/3 : regen HP +2/tour');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Set bonus Ténèbres OK');
  await browser.close();
}

async function scenarioHeadOfHouseVoice() {
  console.log('\n── Scénario : voix Chefs de Maison ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : les 20 clés audio sont mappées (fallback silencieux côté OGG OK)
  const t1 = await page.evaluate(() => {
    const sm  = AudioSystem._VOICE_SAMPLES;
    const ids = ['mcgonagall', 'rogue', 'flitwick', 'sprout'];
    const expected = [];
    for (const id of ids) {
      expected.push(`${id}_greeting_1`, `${id}_greeting_2`,
                    `${id}_offer_1`, `${id}_active_1`, `${id}_ready_1`);
    }
    const missing = expected.filter(k => !sm[k]);
    return { total: expected.length, missing };
  });
  console.log('  T1 voice keys:', t1);
  assert(t1.total === 20, `attendu 20 clés voice, expected.length=${t1.total}`);
  assert(t1.missing.length === 0,
    `clés voice manquantes : ${t1.missing.join(', ')}`);

  // T2 : 1er contact McGonagall → source 'greeting' → key greeting_1
  // (la quête `golem_passage` est offerable étage 5 mais le greeting prime
  // tant que seenNpcs ne contient pas le PNJ).
  const t2 = await page.evaluate(() => {
    seenNpcs.delete('mcgonagall');
    const npc = getNpcById('mcgonagall');
    const state = getNpcQuestState(npc);
    const source = _npcDialogSource(npc, state);
    const key0 = _voiceKeyForPage('mcgonagall', state, null, 0, source);
    const key1 = _voiceKeyForPage('mcgonagall', state, null, 1, source);
    return { state, source, key0, key1, hasGreeting: Array.isArray(npc.dialogues.greeting) };
  });
  console.log('  T2 first contact:', t2);
  assert(t2.hasGreeting,         'McGonagall doit avoir greeting array');
  assert(t2.source === 'greeting', `source attendu 'greeting', got '${t2.source}'`);
  assert(t2.key0 === 'mcgonagall_greeting_1',
    `key page 0 attendu mcgonagall_greeting_1, got ${t2.key0}`);
  assert(t2.key1 === 'mcgonagall_greeting_2',
    `key page 1 attendu mcgonagall_greeting_2, got ${t2.key1}`);

  // T3 : visites suivantes sur Rogue (1 seule quête = quest_set_slyth)
  // — source 'offer' → key rogue_offer_1. Choisi à la place de McGonagall
  // car cette dernière donne aussi golem_passage qui pourrait passer en
  // premier sur l'itération de `questsGiven` et brouiller l'assert.
  const t3 = await page.evaluate(() => {
    seenNpcs.add('rogue');
    activeQuests = activeQuests.filter(q => q.id !== 'quest_set_slyth');
    availableQuests.add('quest_set_slyth');
    completedQuests.delete('quest_set_slyth');
    const npc = getNpcById('rogue');
    const state = getNpcQuestState(npc);
    const qid   = _currentQuestForState(npc, state);
    const source = _npcDialogSource(npc, state);
    const key   = _voiceKeyForPage('rogue', state, qid, 0, source);
    return { state, qid, source, key };
  });
  console.log('  T3 quest_set_slyth offer:', t3);
  assert(t3.state === 'offer', `state attendu 'offer', got '${t3.state}'`);
  assert(t3.qid === 'quest_set_slyth',
    `qid attendu 'quest_set_slyth', got '${t3.qid}'`);
  assert(t3.source === 'offer', `source attendu 'offer', got '${t3.source}'`);
  assert(t3.key === 'rogue_offer_1',
    `key attendu 'rogue_offer_1', got '${t3.key}'`);

  // T4 : régression Dumbledore — un état 'offer' sur la chaîne d'épreuves
  // doit toujours produire `dumbledore_<suffix>_offer_1` malgré le refactor
  // (param `source` ajouté).
  const t4 = await page.evaluate(() => {
    const key = _voiceKeyForPage('dumbledore', 'offer', 'dumbledore_eveil', 0, 'offer');
    const keyActive = _voiceKeyForPage('dumbledore', 'active', 'dumbledore_courage', 0, 'active');
    const keyReady  = _voiceKeyForPage('dumbledore', 'ready', 'dumbledore_revelation', 0, 'ready');
    return { key, keyActive, keyReady };
  });
  console.log('  T4 Dumbledore regression:', t4);
  assert(t4.key === 'dumbledore_eveil_offer_1',
    `Dumbledore offer cassé : ${t4.key}`);
  assert(t4.keyActive === 'dumbledore_courage_active_1',
    `Dumbledore active cassé : ${t4.keyActive}`);
  assert(t4.keyReady === 'dumbledore_revelation_ready_1',
    `Dumbledore ready cassé : ${t4.keyReady}`);

  // T5 : extension — autres dialogues des chefs (golem_passage, idle, done)
  const t5 = await page.evaluate(() => {
    const sm = AudioSystem._VOICE_SAMPLES;
    const extraKeys = [
      'mcgonagall_golem_offer_1', 'mcgonagall_golem_active_1',
      'mcgonagall_golem_ready_1', 'mcgonagall_idle_1', 'mcgonagall_done_1',
      'rogue_idle_1', 'flitwick_idle_1', 'sprout_idle_1',
    ];
    return {
      missing:    extraKeys.filter(k => !sm[k]),
      golemOffer: _voiceKeyForPage('mcgonagall', 'offer', 'golem_passage', 0, 'offer'),
      setOffer:   _voiceKeyForPage('mcgonagall', 'offer', 'quest_set_gryff', 0, 'offer'),
      rogueIdle:  _voiceKeyForPage('rogue', 'none', null, 0, 'idle'),
      mcgoDone:   _voiceKeyForPage('mcgonagall', 'done', null, 0, 'done'),
    };
  });
  console.log('  T5 autres dialogues:', t5);
  assert(t5.missing.length === 0,
    `clés voice étendues manquantes : ${t5.missing.join(', ')}`);
  assert(t5.golemOffer === 'mcgonagall_golem_offer_1',
    `golem_passage offer → attendu mcgonagall_golem_offer_1, got ${t5.golemOffer}`);
  assert(t5.setOffer === 'mcgonagall_offer_1',
    `quest_set offer → attendu mcgonagall_offer_1, got ${t5.setOffer}`);
  assert(t5.rogueIdle === 'rogue_idle_1',
    `idle Rogue → attendu rogue_idle_1, got ${t5.rogueIdle}`);
  assert(t5.mcgoDone === 'mcgonagall_done_1',
    `done McGonagall → attendu mcgonagall_done_1, got ${t5.mcgoDone}`);

  // T6 : synchro voix/texte idle — chaque réplique idleRandom des 4 chefs
  // doit avoir son OGG `<npc>_idle_<n>`, et _voiceKeyForPage doit suivre
  // l'index tiré (idleIndex) plutôt que de jouer toujours _idle_1.
  const t6 = await page.evaluate(() => {
    const sm  = AudioSystem._VOICE_SAMPLES;
    const ids = ['mcgonagall', 'rogue', 'flitwick', 'sprout'];
    const missing = [];
    const keyMismatch = [];
    for (const id of ids) {
      const npc = getNpcById(id);
      const idle = (npc && npc.dialogues && npc.dialogues.idleRandom) || [];
      idle.forEach((_, i) => {
        const key = `${id}_idle_${i + 1}`;
        if (!sm[key]) missing.push(key);
        const got = _voiceKeyForPage(id, 'none', null, 0, 'idle', i);
        if (got !== key) keyMismatch.push(`${got}≠${key}`);
      });
    }
    return { missing, keyMismatch };
  });
  console.log('  T6 synchro idle voix/texte:', t6);
  assert(t6.missing.length === 0,
    `OGG idle manquants : ${t6.missing.join(', ')}`);
  assert(t6.keyMismatch.length === 0,
    `_voiceKeyForPage idle décalé : ${t6.keyMismatch.join(', ')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant voix Chefs de Maison`);
  }
  console.log('  ✅ Voix Chefs de Maison OK');
  await browser.close();
}

async function scenarioHouseSignatureQuests() {
  console.log('\n── Scénario : Quêtes Signature de Maison (4 Maisons) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const HOUSES = [
    { house:'Gryffondor', qid:'quest_signature_gryff', floor:2, mob:'chevalier_fantome', amount:1, head:'mcgonagall', reward:'banniere_godric', flag:'gryffSignatureDone' },
    { house:'Serpentard', qid:'quest_signature_slyth', floor:4, mob:'basilic',           amount:1, head:'rogue',      reward:'langue_de_plomb', flag:'slythSignatureDone' },
    { house:'Serdaigle',  qid:'quest_signature_raven', floor:2, mob:'gardien_portail',    amount:1, head:'flitwick',   reward:'codex_rowena',    flag:'ravenSignatureDone' },
    { house:'Poufsouffle',qid:'quest_signature_pouf',  floor:2, mob:'inferius',           amount:3, head:'sprout',     reward:'coeur_refuge',    flag:'poufSignatureDone' },
  ];

  // T1 : cycle complet par Maison — gate étage, accept, kill, remise (flag),
  // remise cérémonielle de la relique par le Chef de Maison.
  for (const H of HOUSES) {
    const r = await page.evaluate((H) => {
      chosenHouse = H.house;
      availableQuests.delete(H.qid);
      activeQuests = activeQuests.filter(q => q.id !== H.qid);
      completedQuests.delete(H.qid);
      pendingHouseRewards = new Set();
      // En dessous de l'étage déclencheur → pas d'ouverture.
      currentFloor = H.floor - 1; checkFloorQuests(currentFloor);
      const beforeUnlock = availableQuests.has(H.qid);
      // Étage déclencheur atteint → ouverture.
      currentFloor = H.floor; checkFloorQuests(currentFloor);
      const unlocked = availableQuests.has(H.qid);
      acceptQuest(H.qid);
      const active = activeQuests.some(q => q.id === H.qid);
      // Complète TOUTE la chaîne d'objectifs (multi-beats) de façon générique.
      // Les `kill` sont SÉQUENTIELS (checkKillQuests ne progresse que sur l'étape
      // active = 1ʳᵉ incomplète) : on satisfait d'abord les beats passifs
      // (herb/item/pages/donate via _refreshObjectives, floor via checkFloorQuests),
      // puis les kills une fois devenus actifs.
      const q = activeQuests.find(x => x.id === H.qid);
      if (q) {
        for (const o of q.objectives) {
          if (o.type === 'herb')       { player.herbs = player.herbs || {}; player.herbs.__test = (player.herbs.__test || 0) + o.amount; }
          else if (o.type === 'item')  { player.inventory = player.inventory || []; for (let i = 0; i < o.amount; i++) player.inventory.push({ id: o.itemId }); }
          else if (o.type === 'pages') { player.grimoirePages = player.grimoirePages || []; while (player.grimoirePages.length < o.amount) player.grimoirePages.push({}); }
          else if (o.type === 'donate'){ player.gold = (player.gold || 0) + o.amount; }
        }
        if (typeof _refreshObjectives === 'function') _refreshObjectives();
        for (const o of q.objectives) if (o.type === 'floor') checkFloorQuests(o.floor);
        for (const o of q.objectives) {
          if (o.type !== 'kill') continue;
          for (let i = 0; i < o.amount; i++) checkKillQuests(o.monsterId);
        }
      }
      if (typeof _refreshObjectives === 'function') _refreshObjectives();
      const stepDone = q ? q.objectives.every(o => o.completed) : false;
      const turned = (H.qid === 'quest_signature_slyth')
        ? turnInSlythSignature('defiance')
        : turnInQuestById(H.qid);
      const flags = { gryffSignatureDone, slythSignatureDone, ravenSignatureDone, poufSignatureDone };
      const pending = pendingHouseRewards.has(H.reward);
      triggerNpcSpecialAction(H.head);
      const inInv = (player.inventory || []).some(i => i && i.id === H.reward);
      return { beforeUnlock, unlocked, active, stepDone, turned, flagSet: flags[H.flag], pending, inInv };
    }, H);
    console.log(`  ${H.house} →`, r);
    assert(!r.beforeUnlock, `${H.house}: signature ouverte trop tôt (avant étage ${H.floor})`);
    assert(r.unlocked,      `${H.house}: signature non ouverte à l'étage déclencheur`);
    assert(r.active,        `${H.house}: acceptQuest a échoué`);
    assert(r.stepDone,      `${H.house}: chaîne d'objectifs non complétée`);
    assert(r.turned,        `${H.house}: remise échouée`);
    assert(r.flagSet,       `${H.house}: flag ${H.flag} non posé à la remise`);
    assert(r.pending,       `${H.house}: relique non routée vers pendingHouseRewards (cérémonie)`);
    assert(r.inInv,         `${H.house}: relique non reçue après cérémonie chez ${H.head}`);
  }

  // T2 : le choix gris Serpentard fige slythPactChoice.
  const pactChoice = await page.evaluate(() => {
    slythSignatureDone = false; slythPactChoice = null;
    activeQuests = activeQuests.filter(q => q.id !== 'quest_signature_slyth');
    completedQuests.delete('quest_signature_slyth');
    availableQuests.add('quest_signature_slyth');
    chosenHouse = 'Serpentard';
    acceptQuest('quest_signature_slyth');
    // Complète la chaîne 3 beats (floor → serpents → basilic) avant le choix.
    const q = activeQuests.find(x => x.id === 'quest_signature_slyth');
    if (q) {
      for (const o of q.objectives) if (o.type === 'floor') checkFloorQuests(o.floor);
      for (const o of q.objectives) {
        if (o.type !== 'kill') continue;
        for (let i = 0; i < o.amount; i++) checkKillQuests(o.monsterId);
      }
    }
    turnInSlythSignature('pact');
    return { choice: slythPactChoice, done: slythSignatureDone };
  });
  console.log('  T2 choix Pacte →', pactChoice);
  assert(pactChoice.choice === 'pact', 'turnInSlythSignature(pact) doit poser slythPactChoice="pact"');
  assert(pactChoice.done, 'slythSignatureDone non posé via turnInSlythSignature');

  // T3 : leviers one-shot sur le combat final (voldemort_revenu), gardés par flag.
  const lever = await page.evaluate(() => {
    currentFloor = 1;   // solo étage 1 → groupe d'1 ennemi (boss seul, déterministe)
    const pool = (typeof MONSTERS !== 'undefined') ? MONSTERS : ENEMIES;
    const vBase = pool.find(m => m.id === 'voldemort_revenu');
    const mk = () => JSON.parse(JSON.stringify(vBase));
    const hasFear = (g) => (g[0].phases || []).some(ph => ph.gainAbility && ph.gainAbility.statusId === 'fear');
    const out = { srcHadFear: (vBase.phases || []).some(ph => ph.gainAbility && ph.gainAbility.statusId === 'fear') };

    gryffSignatureDone = slythSignatureDone = ravenSignatureDone = poufSignatureDone = false;

    // Gryffondor — neutralise la phase terreur.
    chosenHouse = 'Gryffondor'; gryffSignatureDone = true;
    startBattle(mk()); out.gryffFearGone = !hasFear(enemyGroup); inBattle = false;
    gryffSignatureDone = false;

    // Contrôle : flag off → la phase terreur subsiste.
    startBattle(mk()); out.controlFearKept = hasFear(enemyGroup); inBattle = false;

    // Serdaigle — révèle une faiblesse lumière.
    chosenHouse = 'Serdaigle'; ravenSignatureDone = true;
    startBattle(mk()); out.ravenWeakLight = (enemyGroup[0].weak || []).includes('lumière'); inBattle = false;
    ravenSignatureDone = false;

    // Serpentard Pacte — arme le lifesteal de sort.
    chosenHouse = 'Serpentard'; slythSignatureDone = true; slythPactChoice = 'pact';
    startBattle(mk()); out.pactBuff = (slythPactBuff === true); inBattle = false;

    // Serpentard Défiance — affaiblit la frappe du boss.
    slythPactChoice = 'defiance'; const atk0 = mk().atk;
    startBattle(mk()); out.defianceWeaker = enemyGroup[0].atk < atk0; inBattle = false;
    slythSignatureDone = false;

    // Poufsouffle — buff de départ « Espoir partagé ».
    chosenHouse = 'Poufsouffle'; poufSignatureDone = true;
    party[0].hpMax = 40; party[0].hp = 40; const hp0 = party[0].hp;
    startBattle(mk()); out.poufBoost = party[0].hp > hp0; inBattle = false;
    poufSignatureDone = false;

    return out;
  });
  console.log('  T3 leviers Voldemort →', lever);
  assert(lever.srcHadFear,      'pré-condition : voldemort_revenu doit avoir une phase terreur');
  assert(lever.gryffFearGone,   'Gryffondor : phase terreur non neutralisée');
  assert(lever.controlFearKept, 'Contrôle : phase terreur supprimée sans le flag (fuite)');
  assert(lever.ravenWeakLight,  'Serdaigle : faiblesse lumière non révélée');
  assert(lever.pactBuff,        'Serpentard Pacte : slythPactBuff non armé');
  assert(lever.defianceWeaker,  'Serpentard Défiance : frappe du boss non affaiblie');
  assert(lever.poufBoost,       'Poufsouffle : buff de départ « Espoir partagé » absent');

  // T4 : la Bannière de Godric immunise le groupe contre la peur.
  const ward = await page.evaluate(() => {
    chosenHouse = 'Gryffondor';
    party[0].equipped = party[0].equipped || {};
    party[0].equipped.trinket = { ...ITEMS.find(i => i.id === 'banniere_godric') };
    party[0].hp = party[0].hpMax; party[0].statusEffects = [];
    applyStatus(party[0], 'fear', 0, 3);
    const orig = Math.random; Math.random = () => 0.0;   // forcerait le skip sans la garde
    const skip = rollFearSkip(party[0]);
    Math.random = orig;
    return { feared: isFeared(party[0]), skip };
  });
  console.log('  T4 garde anti-peur →', ward);
  assert(ward.feared,         'statut peur non appliqué');
  assert(ward.skip === false, 'Bannière de Godric doit immuniser le groupe contre la peur');

  // T5 : dialogue de Dumbledore pré-Voldemort (L4) — le texte suit le flag.
  const dlg = await page.evaluate(() => {
    const pool = (typeof MONSTERS !== 'undefined') ? MONSTERS : ENEMIES;
    const vBase = pool.find(m => m.id === 'voldemort_revenu');
    const mk = () => JSON.parse(JSON.stringify(vBase));
    const out = {};
    // Spy sur addMsg (fonction globale → backée par window) pour capturer le texte.
    const orig = window.addMsg;
    let msgs = [];
    window.addMsg = (t) => { msgs.push(t); };
    const run = (fn) => { msgs = []; fn(); return msgs.join(' || '); };

    gryffSignatureDone = slythSignatureDone = ravenSignatureDone = poufSignatureDone = false;
    slythPactChoice = null;
    currentFloor = 1;

    // Aucune Signature remise → cadre générique.
    chosenHouse = 'Gryffondor';
    const generic = run(() => { startBattle(mk()); inBattle = false; });
    out.genericShown = generic.includes('Plus bas que la peur');

    // Signature remise → réplique spécifique, et PAS la générique.
    gryffSignatureDone = true;
    const sig = run(() => { startBattle(mk()); inBattle = false; });
    out.sigShown      = sig.includes('pas ne pas reculer');
    out.genericHidden = !sig.includes('Plus bas que la peur');
    gryffSignatureDone = false;

    window.addMsg = orig;
    return out;
  });
  console.log('  T5 dialogue pré-Voldemort →', dlg);
  assert(dlg.genericShown,  'L4 : cadre générique de Dumbledore absent sans Signature');
  assert(dlg.sigShown,      'L4 : réplique Signature Gryffondor absente avec le flag');
  assert(dlg.genericHidden, 'L4 : la générique ne doit pas doubler la réplique Signature');

  // T6 : réplique post-victoire plus froide si Pacte des Cachots scellé (L4).
  const vic = await page.evaluate(() => {
    const speech = document.getElementById('victory-speech');
    const out = {};
    slythPactChoice = 'pact';
    showVictoryScreen();
    out.coldWithPact = speech.innerHTML.includes("celui à qui l'on parle");
    closeVictoryScreen();
    slythPactChoice = 'defiance';
    showVictoryScreen();
    out.warmWithoutPact = !speech.innerHTML.includes("celui à qui l'on parle");
    closeVictoryScreen();
    return out;
  });
  console.log('  T6 victoire post-Pacte →', vic);
  assert(vic.coldWithPact,    'L4 : réplique froide de Dumbledore absente après un Pacte');
  assert(vic.warmWithoutPact, 'L4 : réplique froide ne doit apparaître que sur slythPactChoice=pact');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Quêtes Signature de Maison conformes (cycle + leviers Voldemort + garde anti-peur)');
  await browser.close();
}

// ── Quête Signature par Maison : le DONNEUR THÉMATIQUE dédié (ch.06 §6.12 P1) ──
// Vérifie, pour une Maison, que sa signature est confiée/remise par son donneur
// (Chevalier Fantôme 🦁 / Écho de Salazar 🐍 / Flitwick 🦅 / Chourave 🦡), gatée
// par `chosenHouse` + étage, avec pose du flag à la remise. Pour les donneurs
// originaux gatés (gryff/slyth), vérifie aussi le `houseGate` (présence pour la
// bonne Maison, absence pour une autre).
async function _runHouseSignatureDonor(cfg) {
  console.log(`\n── Scénario : Signature ${cfg.house} — donneur ${cfg.donor} ──`);
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: cfg.house });

  const r = await page.evaluate((cfg) => {
    chosenHouse = cfg.house;
    availableQuests.delete(cfg.qid);
    activeQuests = activeQuests.filter(q => q.id !== cfg.qid);
    completedQuests.delete(cfg.qid);
    pendingHouseRewards = new Set();
    gryffSignatureDone = slythSignatureDone = ravenSignatureDone = poufSignatureDone = false;
    slythPactChoice = null;

    const donor = getNpcById(cfg.donor);

    // houseGate : donneur original présent pour sa Maison, absent pour une autre.
    let gatePresent = null, gateAbsent = null;
    if (cfg.gated) {
      gatePresent = getNpcsForFloor(cfg.donorFloor).some(n => n.id === cfg.donor);
      const other = cfg.house === 'Serpentard' ? 'Gryffondor' : 'Serpentard';
      chosenHouse = other;
      gateAbsent = getNpcsForFloor(cfg.donorFloor).some(n => n.id === cfg.donor);
      chosenHouse = cfg.house;
    }

    // Gate étage : pas d'ouverture avant le déclencheur, ouverture au seuil.
    currentFloor = cfg.trigger - 1; checkFloorQuests(currentFloor);
    const beforeUnlock = availableQuests.has(cfg.qid);
    currentFloor = cfg.trigger; checkFloorQuests(currentFloor);
    const unlocked = availableQuests.has(cfg.qid);

    const donorGivesQuest = (donor && (donor.questsGiven || []).includes(cfg.qid));
    const donorOfferState = getNpcQuestState(donor);

    acceptQuest(cfg.qid);
    const active = activeQuests.some(q => q.id === cfg.qid);

    // Complète la chaîne (beats passifs d'abord, kills séquentiels ensuite).
    const q = activeQuests.find(x => x.id === cfg.qid);
    if (q) {
      for (const o of q.objectives) {
        if (o.type === 'herb')       { player.herbs = player.herbs || {}; player.herbs.__t = (player.herbs.__t || 0) + o.amount; }
        else if (o.type === 'item')  { player.inventory = player.inventory || []; for (let i = 0; i < o.amount; i++) player.inventory.push({ id: o.itemId }); }
        else if (o.type === 'pages') { player.grimoirePages = player.grimoirePages || []; while (player.grimoirePages.length < o.amount) player.grimoirePages.push({}); }
        else if (o.type === 'donate'){ player.gold = (player.gold || 0) + o.amount; }
      }
      if (typeof _refreshObjectives === 'function') _refreshObjectives();
      for (const o of q.objectives) if (o.type === 'floor') checkFloorQuests(o.floor);
      for (const o of q.objectives) { if (o.type !== 'kill') continue; for (let i = 0; i < o.amount; i++) checkKillQuests(o.monsterId); }
    }
    if (typeof _refreshObjectives === 'function') _refreshObjectives();
    const chainDone = q ? q.objectives.every(o => o.completed) : false;
    const donorReadyState = getNpcQuestState(donor);

    // Remise via le donneur (choix gris à la remise pour Serpentard).
    const turned = (cfg.qid === 'quest_signature_slyth')
      ? turnInSlythSignature('defiance')
      : turnInQuestById(cfg.qid);
    const flags = { gryffSignatureDone, slythSignatureDone, ravenSignatureDone, poufSignatureDone };
    return { gatePresent, gateAbsent, beforeUnlock, unlocked, donorGivesQuest,
             donorOfferState, active, chainDone, donorReadyState, turned,
             flagSet: flags[cfg.flag], pact: slythPactChoice };
  }, cfg);

  console.log('  →', r);
  if (cfg.gated) {
    assert(r.gatePresent,  `${cfg.house}: donneur ${cfg.donor} absent à l'ét. ${cfg.donorFloor} pour sa Maison`);
    assert(!r.gateAbsent,  `${cfg.house}: donneur ${cfg.donor} ne doit PAS apparaître pour une autre Maison (houseGate)`);
  }
  assert(r.donorGivesQuest, `${cfg.house}: ${cfg.donor} ne confie pas ${cfg.qid}`);
  assert(!r.beforeUnlock,   `${cfg.house}: signature ouverte trop tôt (avant l'ét. ${cfg.trigger})`);
  assert(r.unlocked,        `${cfg.house}: signature non ouverte à l'ét. déclencheur`);
  assert(r.donorOfferState === 'offer', `${cfg.house}: ${cfg.donor} ne propose pas la signature (état ${r.donorOfferState})`);
  assert(r.active,          `${cfg.house}: acceptQuest a échoué`);
  assert(r.chainDone,       `${cfg.house}: chaîne d'objectifs non complétée`);
  assert(r.donorReadyState === 'ready', `${cfg.house}: ${cfg.donor} pas en état 'ready' (état ${r.donorReadyState})`);
  assert(r.turned,          `${cfg.house}: remise échouée`);
  assert(r.flagSet,         `${cfg.house}: flag ${cfg.flag} non posé à la remise`);
  if (cfg.qid === 'quest_signature_slyth') {
    assert(r.pact === 'defiance', `${cfg.house}: slythPactChoice non figé à la remise`);
  }

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log(`  ✅ Signature ${cfg.house} confiée et remise par ${cfg.donor}`);
  await browser.close();
}

// 🦁 Gryffondor — Chevalier Fantôme (donneur original gaté).
async function scenarioHouseSignatureGryffondor() {
  await _runHouseSignatureDonor({
    house: 'Gryffondor', donor: 'chevalier_godric', gated: true, donorFloor: 2,
    qid: 'quest_signature_gryff', trigger: 2, flag: 'gryffSignatureDone'
  });
}

// 🐍 Serpentard — Écho de Salazar (donneur original gaté + choix gris).
async function scenarioHouseSignatureSerpentard() {
  await _runHouseSignatureDonor({
    house: 'Serpentard', donor: 'echo_salazar', gated: true, donorFloor: 4,
    qid: 'quest_signature_slyth', trigger: 4, flag: 'slythSignatureDone'
  });
}

// 🦅 Serdaigle — Flitwick (chef de Maison, donneur thématique des stèles/Codex).
async function scenarioHouseSignatureSerdaigle() {
  await _runHouseSignatureDonor({
    house: 'Serdaigle', donor: 'flitwick', gated: false, donorFloor: 6,
    qid: 'quest_signature_raven', trigger: 2, flag: 'ravenSignatureDone'
  });
}

// 🦡 Poufsouffle — Chourave (cheffe de Maison, donneuse du Refuge).
async function scenarioHouseSignaturePoufsouffle() {
  await _runHouseSignatureDonor({
    house: 'Poufsouffle', donor: 'sprout', gated: false, donorFloor: 3,
    qid: 'quest_signature_pouf', trigger: 2, flag: 'poufSignatureDone'
  });
}

// ── Variantes conditionnelles du discours de victoire (Chapitre 14 §14.2.2, P1) ──
// Force victoryAchieved + un chosenHouse et vérifie que #victory-speech contient
// le dernier mot de Dumbledore coloré par la Maison, plus les variantes Éclats /
// choix moral / Signature. Intégration DOM du helper pur _victorySpeechVariants
// (testé à part dans tests/units.js).
async function scenarioVictorySpeechVariants() {
  console.log('\n── Scénario : variantes conditionnelles du discours de victoire (ch.14 P1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const out = await page.evaluate(() => {
    const speech = document.getElementById('victory-speech');
    const res = {};
    // État de base propre.
    victoryAchieved = true;
    slythPactChoice = null;
    gryffSignatureDone = slythSignatureDone = ravenSignatureDone = poufSignatureDone = false;
    if (typeof completedQuests !== 'undefined' && completedQuests.delete) completedQuests.delete('eclats_clef_voute');

    // (a) Dernier mot par Maison — une réplique distincte pour chacune.
    const houseKey = { Gryffondor: 'Godric', Serpentard: 'Salazar', Serdaigle: 'Rowena', Poufsouffle: 'Helga' };
    res.byHouse = {};
    for (const h of Object.keys(houseKey)) {
      chosenHouse = h;
      showVictoryScreen();
      res.byHouse[h] = speech.innerHTML.includes(houseKey[h]);
      closeVictoryScreen();
    }
    chosenHouse = 'Gryffondor';

    // (e) Choix moral defiance → ton de reconnaissance (miroir du pact existant).
    slythPactChoice = 'defiance';
    showVictoryScreen();
    res.defianceWarm = speech.innerHTML.includes('mille ans');
    res.defianceNotCold = !speech.innerHTML.includes("celui à qui l'on parle");
    closeVictoryScreen();
    slythPactChoice = null;

    // (d) Éclats remis → paragraphe de révélation.
    if (typeof completedQuests !== 'undefined' && completedQuests.add) completedQuests.add('eclats_clef_voute');
    showVictoryScreen();
    res.eclatsReveal = speech.innerHTML.includes('deux choses');
    closeVictoryScreen();
    if (typeof completedQuests !== 'undefined' && completedQuests.delete) completedQuests.delete('eclats_clef_voute');

    // (c) Signature → héritage nommé.
    gryffSignatureDone = true;
    showVictoryScreen();
    res.legacyNamed = speech.innerHTML.includes('Bannière de Godric');
    closeVictoryScreen();
    gryffSignatureDone = false;

    return res;
  });
  console.log('  →', JSON.stringify(out));
  for (const [h, ok] of Object.entries(out.byHouse)) {
    assert(ok, `#victory-speech doit contenir le dernier mot ${h}`);
  }
  assert(out.defianceWarm,    'defiance → ton de reconnaissance attendu dans #victory-speech');
  assert(out.defianceNotCold, 'defiance ne doit pas afficher la mise en garde froide du Pacte');
  assert(out.eclatsReveal,    '3 Éclats remis → paragraphe de révélation « deux choses »');
  assert(out.legacyNamed,     'gryffSignatureDone → la Bannière de Godric doit être nommée');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Variantes conditionnelles du discours de victoire conformes');
  await browser.close();
}

module.exports = { scenarios: [scenarioHouseCrests, scenarioHouseTier5, scenarioHouseMytheTier, scenarioHouseApotheoseTier, scenarioHouseDonationAndStars, scenarioHouseRewardFlow, scenarioHouseSetQuest, scenarioHouseSetUI, scenarioHouseSet, scenarioHouseSetCompleteFeedback, scenarioHouseSaveRoundTrip, scenarioTenebresSet, scenarioHeadOfHouseVoice, scenarioHouseSignatureQuests, scenarioHouseSignatureGryffondor, scenarioHouseSignatureSerpentard, scenarioHouseSignatureSerdaigle, scenarioHouseSignaturePoufsouffle, scenarioVictorySpeechVariants, scenarioPremiumReward, scenarioHouseFavorShop] };
