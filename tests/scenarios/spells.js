// ============================================================
// Scénarios smoke — domaine « spells » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioSpellIcons() {
  console.log('\n── Scénario 20 : Phase 3 — sortilèges ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : registre + helper disponibles, tous les sorts mappés vers un PNG existant
  const t1 = await page.evaluate(async () => {
    const out = {
      hasRegistry: typeof SPELL_ICON_REGISTRY === 'object',
      hasHelper:   typeof getSpellIconHtml === 'function',
      total:       SPELLS.length,
      mapped:      SPELLS.filter(s => SPELL_ICON_REGISTRY[s.name]).length,
      missing:     SPELLS.filter(s => !SPELL_ICON_REGISTRY[s.name]).map(s => s.name)
    };
    // Charger chaque PNG et vérifier le succès
    const tries = await Promise.all(Object.values(SPELL_ICON_REGISTRY).map(src =>
      new Promise(resolve => {
        const im = new Image();
        im.onload = () => resolve({ src, ok: im.naturalWidth > 0 });
        im.onerror = () => resolve({ src, ok: false });
        im.src = src;
      })
    ));
    out.allLoaded = tries.every(t => t.ok);
    out.failedSrcs = tries.filter(t => !t.ok).map(t => t.src);
    return out;
  });
  console.log('  T1 registry →', t1);
  assert(t1.hasRegistry && t1.hasHelper,    'SPELL_ICON_REGISTRY + getSpellIconHtml requis');
  assert(t1.missing.length === 0,           `sorts non mappés : ${t1.missing.join(', ')}`);
  assert(t1.allLoaded === true,             `PNG manquants : ${t1.failedSrcs.join(', ')}`);

  // T2 : modale Sorts utilise les <img> du registre
  const t2 = await page.evaluate(() => {
    openSpells();
    const list = document.getElementById('spell-list');
    const imgs = Array.from(list.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return { count: imgs.length, all: imgs };
  });
  console.log('  T2 modale Sorts →', t2);
  // Harry a 5 sorts au démarrage : Expelliarmus, Stupefix, Episkey, Protego, Incendio
  assert(t2.count >= 5,                     `modale Sorts doit contenir ≥5 <img>, vu ${t2.count}`);
  ['expelliarmus','stupefix','episkey','protego','incendio'].forEach(name => {
    assert(t2.all.some(s => s.endsWith(`spells/${name}.png`)), `manque ${name}.png dans modale`);
  });

  // T2bis : liseré de rang (tier) — socle Sorts 2.0 P1. Chaque rangée
  // .spell-item porte une bordure gauche teintée + une pastille de rang.
  const t2b = await page.evaluate(() => {
    openSpells();
    const rows = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const tint = (typeof spellTierTint === 'function') ? spellTierTint(getSpellByName('Incendio')) : null;
    return {
      rows: rows.length,
      allBordered: rows.length > 0 && rows.every(r => /3px solid/.test(r.style.borderLeft)),
      hasBadge: rows.some(r => /BASIQUE|AVANCÉ|MAÎTRE|CORROMPU/.test(r.textContent)),
      incendioTint: tint,
    };
  });
  console.log('  T2bis liseré →', t2b);
  assert(t2b.rows >= 5,           'modale Sorts doit lister les rangées .spell-item');
  assert(t2b.allBordered,         'chaque .spell-item doit porter un liseré de rang (borderLeft)');
  assert(t2b.hasBadge,            'la modale doit afficher au moins une pastille de rang');
  assert(t2b.incendioTint === '#5fa85f', `tint basique d'Incendio attendu #5fa85f, vu ${t2b.incendioTint}`);

  // T3 : fallback emoji si sort absent du registre
  const t3 = await page.evaluate(() => {
    const fakeSpell = { name: 'SortInconnu', icon: '🦄' };
    return getSpellIconHtml(fakeSpell);
  });
  console.log('  T3 fallback →', t3);
  assert(t3 === '🦄', 'getSpellIconHtml doit fallback sur l\'emoji si sort absent du registre');

  // T4 : setBattleLog accepte du HTML (innerHTML) après refactor
  const t4 = await page.evaluate(() => {
    setBattleLog('<b>test-html</b>');
    const el = document.getElementById('battle-log');
    return { html: el.innerHTML, hasBold: !!el.querySelector('b') };
  });
  console.log('  T4 setBattleLog →', t4);
  assert(t4.hasBold, 'setBattleLog doit rendre le HTML (innerHTML), pas l\'échapper');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log(`  ✅ Phase 3 : ${t1.mapped} sorts mappés + modale + fallback + battle-log innerHTML`);
  await browser.close();
}

async function scenarioElementalSystem() {
  console.log('\n── Scénario : système élémentaire ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : spell.element matche resist/weak — multiplicateurs 0.5 / 1 / 1.5
  const t1 = await page.evaluate(() => {
    const spell = { name: 'TestFire', effect: 'stun', element: 'feu', power: 20 };
    const char  = party[0];
    char.mag = 10;                 // dmg base = 20 + floor(10/2) = 25
    char.spellCritChance = 0;      // isole le crit
    const hit = (resist, weak) => {
      const e = { name: 'E', currentHp: 1000, resist, weak };
      _spellElementalDamage(spell, char, e, 0);
      return 1000 - e.currentHp;
    };
    return { neutre: hit([], []), faible: hit([], ['feu']), resist: hit(['feu'], []) };
  });
  console.log('  T1 multiplicateurs élémentaires:', t1);
  assert(t1.neutre === 25, `neutre attendu 25, got ${t1.neutre}`);
  assert(t1.faible === 37, `faiblesse feu attendu floor(25*1.5)=37, got ${t1.faible}`);
  assert(t1.resist === 12, `résistance feu attendu floor(25*0.5)=12, got ${t1.resist}`);

  // T2 : les sorts de dégâts portent tous un element du roster
  const t2 = await page.evaluate(() => {
    const ELEMS = ['feu', 'glace', 'foudre', 'lumière', 'ténèbres', 'physique'];
    const dmgEffects = ['stun', 'burn', 'instant', 'lifesteal', 'curse'];
    const bad = SPELLS
      .filter(s => dmgEffects.includes(s.effect))
      .filter(s => !ELEMS.includes(s.element))
      .map(s => s.name);
    return { bad };
  });
  console.log('  T2 sorts sans element valide:', t2.bad);
  assert(t2.bad.length === 0, `sorts de dégâts sans element : ${t2.bad.join(', ')}`);

  // T3 : aucun monstre ne porte encore les anciennes clés burn/stun/instant
  const t3 = await page.evaluate(() => {
    const OLD = ['burn', 'stun', 'instant'];
    const bad = MONSTERS
      .filter(m => [...(m.resist || []), ...(m.weak || [])].some(k => OLD.includes(k)))
      .map(m => m.id);
    return { bad };
  });
  console.log('  T3 monstres avec anciennes clés:', t3.bad);
  assert(t3.bad.length === 0, `monstres avec clé legacy resist/weak : ${t3.bad.join(', ')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Système élémentaire OK');
  await browser.close();
}

async function scenarioElementSpells() {
  console.log('\n── Scénario : sorts élémentaires ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : les 3 sorts existent avec le bon element
  const t1 = await page.evaluate(() => {
    const get = (n) => SPELLS.find(s => s.name === n);
    const g = get('Glacius'), f = get('Fulgari'), l = get('Lumos Solem');
    return {
      glacius: g && g.element, fulgari: f && f.element,
      lumos: l && l.element, lumosBonus: l && l.bonusVsUndead,
    };
  });
  console.log('  T1 sorts:', t1);
  assert(t1.glacius === 'glace', 'Glacius element glace');
  assert(t1.fulgari === 'foudre', 'Fulgari element foudre');
  assert(t1.lumos === 'lumière', 'Lumos Solem element lumière');
  assert(t1.lumosBonus === 1.5, 'Lumos Solem bonusVsUndead 1.5');

  // T2 : Lumos Solem — bonus ×1.5 vs morts-vivants uniquement
  const t2 = await page.evaluate(() => {
    const spell = SPELLS.find(s => s.name === 'Lumos Solem');
    const char = party[0];
    char.mag = 10; char.spellCritChance = 0;     // base = 16 + 5 = 21
    const hit = (cat, id) => {
      const e = { name: 'E', category: cat, id, currentHp: 1000, resist: [], weak: [] };
      _spellElementalDamage(spell, char, e, 0);
      return 1000 - e.currentHp;
    };
    return {
      vsFantome: hit('fantôme', 'x'),
      vsInferius: hit('créature', 'inferius'),
      vsBete: hit('bête', 'loup_garou'),
    };
  });
  console.log('  T2 Lumos Solem:', t2);
  assert(t2.vsFantome === 31, `vs fantôme floor(21*1.5)=31, got ${t2.vsFantome}`);
  assert(t2.vsInferius === 31, `vs inferius (id morts-vivants) =31, got ${t2.vsInferius}`);
  assert(t2.vsBete === 21, `vs bête sans bonus =21, got ${t2.vsBete}`);

  // T3 : statut gel — DoT + câblage STATUS_BY_SPELL
  const t3 = await page.evaluate(() => {
    const e = { name: 'Gel', currentHp: 100, resist: [], weak: [], statusEffects: [] };
    applyStatus(e, 'gel', 6, 2);
    tickStatuses(e, true);
    return {
      defExists: !!STATUS_DEFS.gel,
      bySpell: STATUS_BY_SPELL['Glacius'],
      hpAfterTick: e.currentHp,
    };
  });
  console.log('  T3 gel:', t3);
  assert(t3.defExists, 'STATUS_DEFS.gel défini');
  assert(t3.bySpell === 'gel', 'STATUS_BY_SPELL.Glacius = gel');
  assert(t3.hpAfterTick === 94, `gel DoT 6 → hp 94, got ${t3.hpAfterTick}`);

  // T4 : les 3 grimoires enseignent le bon sort
  const t4 = await page.evaluate(() => {
    const bk = (id) => { const it = ITEMS.find(i => i.id === id); return it && { type: it.type, spell: it.spell }; };
    return { g: bk('livre_glacius'), f: bk('livre_fulgari'), l: bk('livre_lumos_solem') };
  });
  console.log('  T4 grimoires:', t4);
  assert(t4.g && t4.g.type === 'spellbook' && t4.g.spell === 'Glacius', 'livre_glacius → Glacius');
  assert(t4.f && t4.f.spell === 'Fulgari', 'livre_fulgari → Fulgari');
  assert(t4.l && t4.l.spell === 'Lumos Solem', 'livre_lumos_solem → Lumos Solem');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Sorts élémentaires OK');
  await browser.close();
}

async function scenarioSpellUx() {
  console.log('\n── Scénario : UX sorts ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });

  // T1 : un livre n'est appris que par le perso choisi
  const t1 = await page.evaluate(() => {
    const livre = ITEMS.find(i => i.id === 'livre_glacius');
    player.inventory.push({ ...livre });
    const idx = player.inventory.findIndex(i => i.id === 'livre_glacius');
    learnSpellbook(idx, 0);   // Harry uniquement
    return {
      harryKnows:    party[0].spells.includes('Glacius'),
      hermioneKnows: party[1].spells.includes('Glacius'),
      bookGone:      !player.inventory.some(i => i.id === 'livre_glacius'),
      teachTwice:    _teachSpellToOne('Glacius', 0),  // déjà connu → false
    };
  });
  console.log('  T1 apprentissage mono-perso:', t1);
  assert(t1.harryKnows,     'Harry doit apprendre Glacius');
  assert(!t1.hermioneKnows, 'Hermione ne doit PAS apprendre Glacius');
  assert(t1.bookGone,       'le livre doit être consommé');
  assert(t1.teachTwice === false, '_teachSpellToOne refuse un sort déjà connu');

  // T2 : spellCategory + filtre de la modale Sorts
  const t2 = await page.evaluate(() => {
    const cat = (n) => spellCategory(SPELLS.find(s => s.name === n));
    const countVisible = () => document.querySelectorAll('#spell-list .spell-item').length;
    openSpells(0);
    const total = countVisible();
    setSpellFilter('feu', 'spell', 0);
    const feu = countVisible();
    setSpellFilter('soutien', 'spell', 0);
    const soutien = countVisible();
    setSpellFilter('tous', 'spell', 0);
    return {
      catIncendio: cat('Incendio'), catGlacius: cat('Glacius'),
      catEpiskey: cat('Episkey'),   catExpelliarmus: cat('Expelliarmus'),
      total, feu, soutien, backToTotal: countVisible(),
    };
  });
  console.log('  T2 filtre:', t2);
  assert(t2.catIncendio === 'feu',        'Incendio → feu');
  assert(t2.catGlacius === 'glace',       'Glacius → glace');
  assert(t2.catEpiskey === 'soutien',     'Episkey → soutien');
  assert(t2.catExpelliarmus === 'utilitaire', 'Expelliarmus → utilitaire');
  assert(t2.feu < t2.total && t2.feu >= 1, `filtre feu réduit la liste (${t2.feu}/${t2.total})`);
  assert(t2.soutien >= 1,                 'filtre soutien montre des sorts');
  assert(t2.backToTotal === t2.total,     'filtre Tous restaure la liste complète');

  // T3 : aperçu d'effet calculé selon les stats du lanceur
  const t3 = await page.evaluate(() => {
    const reparo   = SPELLS.find(s => s.name === 'Reparo');    // heal power 20
    const incendio = SPELLS.find(s => s.name === 'Incendio');  // burn power 14
    const protego  = SPELLS.find(s => s.name === 'Protego');   // shield power 5
    const expelli  = SPELLS.find(s => s.name === 'Expelliarmus'); // disarm power 3
    const accio    = SPELLS.find(s => s.name === 'Accio');     // steal power 0
    const weak   = { int: 0,  end: 0,  mag: 0,  agi: 0,  lck: 0  };
    const strong = { int: 16, end: 8,  mag: 10, agi: 16, lck: 20 };
    const mage   = { int: 16, end: 8,  mag: 50, agi: 16, lck: 20 };
    return {
      healWeak:   spellEffectPreview(reparo, weak),
      healStrong: spellEffectPreview(reparo, strong),
      dmgStrong:  spellEffectPreview(incendio, strong),
      shieldWeak:   spellEffectPreview(protego, weak),
      shieldMage:   spellEffectPreview(protego, mage),
      disarmStrong: spellEffectPreview(expelli, strong),
      stealStrong:  spellEffectPreview(accio, strong),
    };
  });
  console.log('  T3 aperçu:', t3);
  assert(/20 PV/.test(t3.healWeak),   `Reparo sans stats ≈ 20 PV, got "${t3.healWeak}"`);
  assert(/26 PV/.test(t3.healStrong), `Reparo INT16/END8 ≈ 26 PV, got "${t3.healStrong}"`);
  assert(/19 dégâts/.test(t3.dmgStrong), `Incendio MAG10 ≈ 19 dégâts, got "${t3.dmgStrong}"`);
  // Sorts utilitaires désormais scalés : Protego (MAG), Expelliarmus
  // (AGI/INT), Accio (MAG/LCK) — l'aperçu doit refléter le scaling.
  assert(/bouclier 2 tours/.test(t3.shieldWeak), `Protego sans MAG ≈ 2 tours, got "${t3.shieldWeak}"`);
  assert(/bouclier 4 tours/.test(t3.shieldMage), `Protego MAG50 ≈ 4 tours, got "${t3.shieldMage}"`);
  assert(/−6 ATK/.test(t3.disarmStrong) && /3 tours/.test(t3.disarmStrong),
         `Expelliarmus AGI16/INT16 ≈ −6 ATK / 3 tours, got "${t3.disarmStrong}"`);
  assert(/≈ 11–16/.test(t3.stealStrong), `Accio MAG10/LCK20 ≈ 11–16 or, got "${t3.stealStrong}"`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ UX sorts OK');
  await browser.close();
}

async function scenarioSpellVoiceMapping() {
  console.log('\n── Scénario : voix d\'incantation des sorts ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 : SPELL_VOICE_MAP cohérent — noms valides + OGG enregistrés
  const t1 = await page.evaluate(() => {
    const map = AudioSystem.SPELL_VOICE_MAP;
    const sm  = AudioSystem._VOICE_SAMPLES;
    const spellNames = SPELLS.map(s => s.name);
    const entries = Object.entries(map);
    const orphanNames   = entries.filter(([n]) => !spellNames.includes(n)).map(([n]) => n);
    const missingSamples = entries.filter(([, k]) => !sm[k]).map(([, k]) => k);
    return { count: entries.length, orphanNames, missingSamples,
             expelliarmus: map['Expelliarmus'] };
  });
  console.log('  T1 mapping:', t1);
  assert(t1.count >= 12, `attendu ≥12 sorts mappés, got ${t1.count}`);
  assert(t1.orphanNames.length === 0,
    `noms de sorts inconnus dans SPELL_VOICE_MAP : ${t1.orphanNames.join(', ')}`);
  assert(t1.missingSamples.length === 0,
    `clés OGG non enregistrées dans _VOICE_SAMPLES : ${t1.missingSamples.join(', ')}`);
  assert(t1.expelliarmus === 'spell_expelliarmus',
    `Expelliarmus → attendu spell_expelliarmus, got ${t1.expelliarmus}`);

  // T2 : speakSpell route un sort mappé vers playVoice, pas un sort absent
  const t2 = await page.evaluate(() => {
    let calledWith = null;
    const orig = AudioSystem.playVoice;
    AudioSystem.playVoice = (k) => { calledWith = k; return Promise.resolve(); };
    AudioSystem.voiceEnabled = true;
    AudioSystem.isMuted = false;
    AudioSystem.speakSpell('Incendio');
    const mapped = calledWith;
    calledWith = null;
    AudioSystem.speakSpell('Sortilège Inconnu');   // hors map → pas de playVoice
    const unmapped = calledWith;
    AudioSystem.playVoice = orig;
    return { mapped, unmapped };
  });
  console.log('  T2 routing:', t2);
  assert(t2.mapped === 'spell_incendio',
    `Incendio devait router vers spell_incendio, got ${t2.mapped}`);
  assert(t2.unmapped === null,
    'un sort non mappé ne doit pas appeler playVoice (fallback SpeechSynthesis)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS pendant voix d'incantation`);
  }
  console.log('  ✅ Voix d\'incantation OK');
  await browser.close();
}

async function scenarioTeleportation() {
  console.log('\n── Scénario : Portus (téléportation) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : visitedFloors initialisé à {1} et grandit avec goDeeper.
  const t1 = await page.evaluate(() => {
    const initial = Array.from(visitedFloors);
    // Marquer artificiellement 2 étages comme visités (sans descendre vraiment).
    visitedFloors.add(2);
    visitedFloors.add(3);
    return { initial, after: Array.from(visitedFloors).sort((a,b)=>a-b) };
  });
  console.log('  T1 visitedFloors →', t1);
  assert(t1.initial.includes(1),                   'visitedFloors doit contenir l\'étage 1 au démarrage');
  assert(t1.after.includes(2) && t1.after.includes(3), 'add() doit alimenter visitedFloors');

  // T2 : le livre_portus est éligible à floor 6 et s'affiche en boutique.
  // Le stock est tiré au hasard → on le force pour un test déterministe.
  const t2 = await page.evaluate(() => {
    currentFloor = 6;
    player.gold = 5000;
    const eligible = SHOP_CATALOG.some(e => e.id === 'livre_portus' && e.minFloor <= 6);
    const livre = ITEMS.find(i => i.id === 'livre_portus');
    shopStock = [{ item: { ...livre }, price: livre.price, sold: false }];
    openShop();
    const grid  = document.getElementById('shop-grid');
    const found = Array.from(grid.querySelectorAll('.shop-item')).find(el =>
      el.dataset.itemId === 'livre_portus'
    );
    return { eligible, hasEntry: !!found, price: found ? found.querySelector('.shop-price').textContent : null };
  });
  console.log('  T2 shop →', t2);
  assert(t2.eligible,                              'livre_portus doit être éligible en boutique floor 6+');
  assert(t2.hasEntry,                              'livre_portus doit s\'afficher quand il est dans le stock');
  assert(/2800/.test(t2.price || ''),              'livre_portus doit coûter 2800G');

  // T3 : achat + apprentissage automatique → sort dans player.spells.
  const t3 = await page.evaluate(() => {
    closeModal('shop-modal');
    const livre = ITEMS.find(i => i.id === 'livre_portus');
    player.inventory.push({ ...livre });
    const idx = player.inventory.findIndex(i => i.id === 'livre_portus');
    useItem(idx, false);   // hors combat → apprend Portus
    return {
      knowsPortus: player.spells.includes('Portus'),
      bookGone:    !player.inventory.some(i => i.id === 'livre_portus')
    };
  });
  console.log('  T3 apprentissage →', t3);
  assert(t3.knowsPortus,                           'Portus doit être enseigné après usage du livre');
  assert(t3.bookGone,                              'Le livre doit être consommé');

  // T4 : modale Sorts hors combat propose un bouton cliquable pour Portus.
  const t4 = await page.evaluate(() => {
    player.spMax = 100;
    player.sp    = 100;
    openSpells(0);
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const portus = items.find(el => /Portus/.test(el.textContent));
    return {
      hasPortusEntry: !!portus,
      isClickable:    !!(portus && typeof portus.onclick === 'function')
    };
  });
  console.log('  T4 modale sorts →', t4);
  assert(t4.hasPortusEntry,                        'Portus doit apparaître dans la modale Sorts');
  assert(t4.isClickable,                           'Entrée Portus doit être cliquable hors combat');

  // T5 : téléportation hors combat → changement d'étage + PM décomptés.
  const t5 = await page.evaluate(() => {
    closeModal('spell-modal');
    // Préparer un étage cible cache.
    visitedFloors.add(2);
    player.spMax = 100;
    player.sp    = 100;
    const before = { floor: currentFloor, sp: player.sp };
    // Stubber `confirm` pour éviter le prompt.
    window.confirm = () => true;
    teleportOutOfCombat(2, 0);
    return {
      before,
      floor: currentFloor,
      sp:    player.sp,
      cost:  SPELLS.find(s => s.name === 'Portus').outOfCombatCost
    };
  });
  console.log('  T5 hors combat →', t5);
  // Le _floorTransition est async (1400 ms). On vérifie après attente.
  await page.waitForFunction(() => currentFloor === 2, { timeout: 3500 });
  const t5b = await page.evaluate(() => ({ floor: currentFloor, sp: player.sp }));
  console.log('  T5b apres transition →', t5b);
  assert(t5b.floor === 2,                          'Le joueur doit être à l\'étage 2 après Portus');
  assert(t5.sp === t5.before.sp - t5.cost,         `PM doivent être décomptés (avant ${t5.before.sp}, après ${t5.sp}, coût ${t5.cost})`);

  // T6 : lancement en combat ouvre l'overlay A/B et consomme les PM.
  const t6 = await page.evaluate(() => {
    // Démarrer un combat dummy contre 2 ennemis pour activer l'option ennemi.
    const enemy = {
      id: 'test_dummy_1', name: 'Cobaye', icon: '🎯', danger: 3,
      hp: 30, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: 'Test'
    };
    startBattle(enemy);
    // Forcer 2 ennemis (rollGroupSize peut renvoyer 1 selon floor).
    if (enemyGroup.length < 2) {
      enemyGroup.push({ ...enemy, id: 'test_dummy_2', name: 'Cobaye 2',
                        currentHp: enemy.hp, disarmed: 0, statusEffects: [] });
    }
    player.sp = player.spMax;
    const spBefore = player.sp;
    castSpellInBattle('Portus', -1);
    const sel = document.getElementById('target-selection');
    return {
      spBefore, spAfter: player.sp,
      overlayShown: sel && sel.style.display === 'flex',
      hasPartyBtn:  !!Array.from(document.querySelectorAll('#target-buttons button')).find(b => /groupe/i.test(b.textContent)),
      hasEnemyBtn:  !!Array.from(document.querySelectorAll('#target-buttons button')).find(b => /ennemi/i.test(b.textContent))
    };
  });
  console.log('  T6 combat overlay →', t6);
  assert(t6.overlayShown,                          'Overlay A/B doit être affiché');
  assert(t6.hasPartyBtn && t6.hasEnemyBtn,         'Boutons groupe + ennemi doivent être présents');
  assert(t6.spAfter === t6.spBefore - 52,          'PM combat (52) doivent être consommés');

  // T7 : choisir "ennemi" bannit un ennemi du combat sans XP.
  const t7 = await page.evaluate(() => {
    const xpBefore = player.xp;
    const beforeCount = enemyGroup.length;
    _resolveTeleportEnemyChoice();
    // Cas chemin direct (un seul ennemi non-boss restant) → bannit immédiatement.
    // Sinon affiche un sub-sélecteur ; on clique le premier bouton.
    const subBtn = document.querySelector('#target-buttons button[onclick^="teleportEnemyAway"]');
    if (subBtn) subBtn.click();
    return {
      xpDelta: player.xp - xpBefore,
      enemiesAfter: enemyGroup.length,
      beforeCount,
      fightCd: portusFightCooldown
    };
  });
  console.log('  T7 banish →', t7);
  assert(t7.enemiesAfter < t7.beforeCount,         'Un ennemi doit avoir été retiré du combat');
  assert(t7.xpDelta === 0,                         'Aucun XP gagné via Portus');
  assert(t7.fightCd === 3,                         `Cooldown combat doit être armé à 3 (vu ${t7.fightCd})`);

  // T8 : tenter de relancer Portus en combat est bloqué tant que CD > 0.
  const t8 = await page.evaluate(() => {
    // Restaurer SP et tenter de re-caster Portus pendant un autre combat dummy.
    const enemy = {
      id: 'test_dummy_3', name: 'Cobaye 3', icon: '🎯', danger: 3,
      hp: 10, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 1, gold: 0, abilities: [], drops: [], resist: [], weak: [], desc: 'Test'
    };
    // Forcer end-of-fight gracefully d'abord (gagner le combat précédent).
    while (enemyGroup.length > 0) enemyGroup.shift();
    if (typeof checkAllEnemiesDead === 'function') checkAllEnemiesDead();
    const cdAfterWin = portusFightCooldown;
    player.sp = player.spMax = 200;
    startBattle(enemy);
    const spBefore = player.sp;
    castSpellInBattle('Portus', -1);
    return {
      cdAfterWin,
      blocked: player.sp === spBefore,
      cdNow:   portusFightCooldown
    };
  });
  console.log('  T8 combat CD →', t8);
  assert(t8.cdAfterWin === 2,                      `Après 1 win, CD doit valoir 2 (vu ${t8.cdAfterWin})`);
  assert(t8.blocked,                               'Cast Portus en CD doit être no-op (PM non décomptés)');
  assert(t8.cdNow === 2,                           'CD reste à 2 (pas re-armé)');

  // T9 : cooldown hors combat décrémente sur transition d'étage.
  const t9 = await page.evaluate(() => {
    // Sortie de combat propre.
    while (enemyGroup.length > 0) enemyGroup.shift();
    if (typeof checkAllEnemiesDead === 'function') checkAllEnemiesDead();
    inBattle = false;
    document.getElementById('encounter-overlay').style.display = 'none';
    document.body.classList.remove('in-battle');
    // Simuler un cooldown OOC restant et le faire baisser.
    portusOocCooldown = 2;
    visitedFloors.add(currentFloor);
    const before = portusOocCooldown;
    // goUp diminue d'un, goDeeper diminue d'un.
    if (currentFloor > 1) goUp();
    return { before, afterStep: portusOocCooldown };
  });
  // goUp est async (transition).
  await page.waitForFunction(() => portusOocCooldown <= 1, { timeout: 3500 });
  console.log('  T9 OOC CD step →', t9);
  assert(t9.before === 2,                          'CD initial doit être 2');
  // afterStep peut être 2 (avant transition) ou 1 (après) — on a déjà attendu.
  const t9b = await page.evaluate(() => portusOocCooldown);
  assert(t9b === 1,                                `Après 1 goUp, CD OOC doit valoir 1 (vu ${t9b})`);

  // T10 : tenter Portus OOC avec CD > 0 est bloqué.
  const t10 = await page.evaluate(() => {
    portusOocCooldown = 2;
    player.sp = player.spMax = 200;
    player.spells.push('Portus');  // s'assurer connu
    const spBefore = player.sp;
    openOutOfCombatTeleport(0);
    return {
      blocked: player.sp === spBefore,
      modalShown: document.getElementById('spell-modal').style.display === 'flex'
    };
  });
  console.log('  T10 OOC bloqué →', t10);
  assert(t10.blocked,                              'Portus OOC avec CD > 0 ne doit pas consommer de PM');

  // T11 : événement d'arrivée — exécution déterministe pour valider le helper.
  const t11 = await page.evaluate(() => {
    // Forcer le tirage positif (1ère branche < 0.5 puis 1ère branche < 0.5).
    const origRandom = Math.random;
    // séquence : [0.05 (<0.12 trigger), 0.1 (<0.5 positif)]
    let seq = [0.05, 0.1]; let i = 0;
    Math.random = () => (i < seq.length ? seq[i++] : origRandom());
    party.forEach(c => { c.hp = 1; });
    const beforeHp = party.map(c => c.hp);
    _rollPortusArrivalEvent();
    const afterHp = party.map(c => c.hp);
    // Forcer maintenant un piège : [0.05, 0.9 (>0.5 négatif), 0.1 (<0.5 piège)]
    seq = [0.05, 0.9, 0.1]; i = 0; Math.random = () => (i < seq.length ? seq[i++] : origRandom());
    party.forEach(c => { c.hp = 50; c.hpMax = 50; });
    _rollPortusArrivalEvent();
    const afterTrap = party.map(c => c.hp);
    Math.random = origRandom;
    return { beforeHp, afterHp, afterTrap };
  });
  console.log('  T11 event arrivée →', t11);
  assert(t11.afterHp.some((hp, i) => hp > t11.beforeHp[i]),
         'Événement positif doit soigner au moins un perso');
  assert(t11.afterTrap.some(hp => hp < 50),
         'Piège doit réduire les PV d\'au moins un perso');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Portus OK (shop + apprentissage + hors combat + combat)');
  await browser.close();
}

async function scenarioHealOoc() {
  console.log('\n── Scénario : Soin hors combat ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : Episkey est dans la liste de Hermione, cliquable hors combat.
  const t1 = await page.evaluate(() => {
    openSpells(1); // onglet Hermione
    const items = Array.from(document.querySelectorAll('#spell-list .spell-item'));
    const episkey = items.find(el => /Episkey/.test(el.textContent));
    return {
      hasEpiskey:  !!episkey,
      isClickable: !!(episkey && typeof episkey.onclick === 'function')
    };
  });
  console.log('  T1 modale →', t1);
  assert(t1.hasEpiskey,                'Episkey doit être dans la liste');
  assert(t1.isClickable,               'Episkey doit être cliquable hors combat');

  // T2 : cast cible auto le perso le moins en forme et applique le soin.
  const t2 = await page.evaluate(() => {
    // Harry plus blessé que Hermione.
    party[0].hp = 5;  party[0].hpMax = 35;
    party[1].hp = 28; party[1].hpMax = 28;
    party[1].sp = 35;
    const before = { harry: party[0].hp, hermione: party[1].hp, hermioneSp: party[1].sp };
    castSpellOutOfCombat('Episkey', 1);   // Hermione caste
    return {
      before,
      after: { harry: party[0].hp, hermione: party[1].hp, hermioneSp: party[1].sp },
      cd: healSpellCooldown
    };
  });
  console.log('  T2 cast →', t2);
  assert(t2.after.harry > t2.before.harry,                 `Harry doit être soigné (${t2.before.harry} → ${t2.after.harry})`);
  assert(t2.after.hermione === t2.before.hermione,         'Hermione (full HP) ne doit pas être ciblée');
  assert(t2.after.hermioneSp === t2.before.hermioneSp - 5, 'PM Hermione consommés (5 PM Episkey)');
  assert(t2.cd === 3,                                       `Cooldown doit être armé à 3 (vu ${t2.cd})`);

  // T3 : tenter de re-caster pendant le cooldown est no-op.
  const t3 = await page.evaluate(() => {
    const spBefore = party[1].sp;
    castSpellOutOfCombat('Episkey', 1);
    return { blocked: party[1].sp === spBefore };
  });
  console.log('  T3 blocage CD →', t3);
  assert(t3.blocked,                                        'Cast Episkey en CD doit être no-op');

  // T4 : cooldown décrémente à chaque pas.
  const t4 = await page.evaluate(() => {
    // Garantir un couloir devant le joueur (chercher une case libre adjacente).
    healSpellCooldown = 3;
    const beforeCd = healSpellCooldown;
    // Essayer 4 directions jusqu'à trouver un mouvement valide.
    let stepped = false;
    for (const dir of ['n','e','s','w']) {
      const [dx, dy] = DIRECTIONS[dir];
      const nx = playerX + dx, ny = playerY + dy;
      if (dungeon[ny] && dungeon[ny][nx] !== CELL.WALL) {
        playerDir = dir;
        moveForward();
        stepped = true;
        break;
      }
    }
    return { beforeCd, stepped, afterCd: healSpellCooldown };
  });
  console.log('  T4 step CD →', t4);
  assert(t4.stepped,                                        'Un mouvement doit avoir été effectué');
  assert(t4.afterCd === t4.beforeCd - 1,                    `CD doit décrémenter de 1 par pas (${t4.beforeCd} → ${t4.afterCd})`);

  // T5 : tout le monde au max → message no-op, PM préservés.
  const t5 = await page.evaluate(() => {
    healSpellCooldown = 0;
    party.forEach(c => { c.hp = c.hpMax; });
    party[1].sp = 30;
    const spBefore = party[1].sp;
    castSpellOutOfCombat('Episkey', 1);
    return { blocked: party[1].sp === spBefore, cd: healSpellCooldown };
  });
  console.log('  T5 full HP no-op →', t5);
  assert(t5.blocked,                                        'Pas de PM consommés si tout le monde est au max');
  assert(t5.cd === 0,                                       'CD non armé sur no-op');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Soin OOC OK (cible auto + CD + no-op full HP)');
  await browser.close();
}

async function scenarioBombardaSplash() {
  console.log('\n── Scénario : Bombarda — éclaboussure ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 200 });

  const r = await page.evaluate(() => {
    currentBattleChar = 0;
    const mk = (n) => ({
      id: 'splash_dummy_' + n, name: 'Cible' + n, icon: '🎯',
      hp: 200, currentHp: 200, atk: 0, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [],
      statusEffects: [], desc: 'test'
    });
    enemyGroup.length = 0;
    enemyGroup.push(mk(0), mk(1), mk(2));

    const harry = party[0];
    harry.mag = 16; harry.str = 12;
    harry.sp = harry.spMax = 99;
    shieldTurns = [0, 0]; guardTurns = [0, 0];

    const bomb = SPELLS.find(s => s.name === 'Bombarda');
    const expectSplash = Math.max(1, Math.floor(
      bomb.power / 2 + harry.mag / 8 + harry.str / 4));

    const hp = enemyGroup.map(e => e.currentHp);
    castSpellInBattle('Bombarda', 0);

    return {
      hasSplashFlag: bomb.splash === true,
      expectSplash,
      primaryDelta: hp[0] - enemyGroup[0].currentHp,
      splash1:      hp[1] - enemyGroup[1].currentHp,
      splash2:      hp[2] - enemyGroup[2].currentHp
    };
  });
  console.log('  Bombarda :', r);
  assert(r.hasSplashFlag,                 'Bombarda doit porter splash:true');
  assert(r.splash1 === r.expectSplash,    `éclaboussure cible 2 : attendu ${r.expectSplash}, obtenu ${r.splash1}`);
  assert(r.splash2 === r.expectSplash,    `éclaboussure cible 3 : attendu ${r.expectSplash}, obtenu ${r.splash2}`);
  assert(r.primaryDelta > r.expectSplash, `cible principale (${r.primaryDelta}) doit subir plus que l'éclaboussure (${r.expectSplash})`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (Bombarda)`);
  }
  console.log('  ✅ Bombarda éclaboussure conforme');
  await browser.close();
}

async function scenarioAoeSpells() {
  console.log('\n── Scénario : sorts de zone (AoE) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
  await startDummyFight(page, { hp: 300 });

  const r = await page.evaluate(() => {
    const out = {};
    const mk = (n) => ({
      id: 'aoe_d' + n, name: 'C' + n, icon: '🎯',
      hp: 500, currentHp: 500, atk: 0, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [], resist: [], weak: [],
      statusEffects: [], category: 'bête', desc: 't'
    });
    const reset3 = () => { enemyGroup.length = 0; enemyGroup.push(mk(0), mk(1), mk(2)); };
    const harry = party[0];
    // Stats non nulles : la formule AoE lit MAG + une stat thématique
    // (int/agi/end/str selon spell.stat2) — chaque stat doit peser.
    harry.mag = 16; harry.int = 12; harry.end = 9; harry.str = 12; harry.agi = 12;
    harry.hp = harry.hpMax = 200;

    // Vague (Lux Aeterna) : dégâts égaux à tous.
    reset3();
    let hp = enemyGroup.map(e => e.currentHp);
    _spellAoeWave(SPELLS.find(s => s.name === 'Lux Aeterna'), harry);
    out.wave = enemyGroup.map((e, i) => hp[i] - e.currentHp);

    // Nappe (Glacius Tempête) : dégâts à tous + gel partout.
    reset3();
    hp = enemyGroup.map(e => e.currentHp);
    _spellAoeField(SPELLS.find(s => s.name === 'Glacius Tempête'), harry);
    out.field = enemyGroup.map((e, i) => hp[i] - e.currentHp);
    out.fieldGel = enemyGroup.every(e => (e.statusEffects || []).some(s => s.id === 'gel'));

    // Chaîne (Fulgur Catena) : dégâts décroissants.
    reset3();
    hp = enemyGroup.map(e => e.currentHp);
    _spellAoeChain(SPELLS.find(s => s.name === 'Fulgur Catena'), harry);
    out.chain = enemyGroup.map((e, i) => hp[i] - e.currentHp);

    // Drain (Nox Vorax) : dégâts à tous + soin du lanceur.
    reset3();
    harry.hp = 50;
    hp = enemyGroup.map(e => e.currentHp);
    _spellAoeDrain(SPELLS.find(s => s.name === 'Nox Vorax'), harry);
    out.drain = enemyGroup.map((e, i) => hp[i] - e.currentHp);
    out.drainHeal = harry.hp - 50;

    // Fauchage (Diffindo Maxima) : cible (idx 1) pleine + voisins ×0,6.
    reset3();
    hp = enemyGroup.map(e => e.currentHp);
    _spellAoeCleave(SPELLS.find(s => s.name === 'Diffindo Maxima'), harry, enemyGroup[1], 1);
    out.cleave = enemyGroup.map((e, i) => hp[i] - e.currentHp);

    // Soin de groupe (Vulnera Sanentur).
    party[0].hp = 10; party[0].hpMax = 100; party[0].int = 0; party[0].end = 0;
    party[1].hp = 20; party[1].hpMax = 100;
    _spellHealAoe(SPELLS.find(s => s.name === 'Vulnera Sanentur'), party[0]);
    out.heal = [party[0].hp, party[1].hp];

    return out;
  });
  console.log('  AoE :', r);
  // base = power + floor(mag/magDiv) + floor(stat2/stat2Div) — les
  // diviseurs varient par sort. Stats : mag 16, int 12, agi 12, end 9, str 12.
  assert(r.wave.every(d => d === 26),   // Lux : 15 + 16/2 + 12/4 (int)
    `vague : 26 attendu à chaque ennemi, obtenu ${r.wave}`);
  assert(r.field.every(d => d === 21),  // Glacius : 12 + 16/3 + 12/3 (int)
    `nappe : 21 attendu, obtenu ${r.field}`);
  assert(r.fieldGel, 'nappe : gel non appliqué à tous les ennemis');
  assert(r.chain[0] === 29 && r.chain[1] === 18 && r.chain[2] === 12,  // Fulgur : 29 (18+16/2+12/4 agi) ×0,65
    `chaîne : [29,18,12] attendu, obtenu ${r.chain}`);
  assert(r.drain.every(d => d === 22),  // Nox : 14 + 16/3 + 9/3 (end)
    `drain : 22 attendu, obtenu ${r.drain}`);
  assert(r.drainHeal === 33, `drain : +33 PV attendu, obtenu +${r.drainHeal}`);
  assert(r.cleave[1] === 29, `fauchage : cible 29 attendu, obtenu ${r.cleave[1]}`);  // Diffindo : 18+16/3+12/2 str
  assert(r.cleave[0] === 17 && r.cleave[2] === 17,  // 29 ×0,6
    `fauchage : voisins 17 attendus, obtenu [${r.cleave[0]},${r.cleave[2]}]`);
  assert(r.heal[0] === 32 && r.heal[1] === 42,
    `soin de groupe : [32,42] attendu, obtenu ${r.heal}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (AoE)`);
  }
  console.log('  ✅ Sorts de zone conformes');
  await browser.close();
}

async function scenarioSpellCombos() {
  console.log('\n── Scénario : combos de sorts ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 500 });

  // T1 — comboDamageMult (pur) : matrice statut × élément.
  const t1 = await page.evaluate(() => {
    const frozen   = { statusEffects: [{ id: 'gel' }] };
    const bleeding = { statusEffects: [{ id: 'bleed' }] };
    const clean    = { statusEffects: [] };
    return {
      gelAny:       comboDamageMult(frozen,   'feu').mult,        // gel = tous éléments
      bleedPhys:    comboDamageMult(bleeding, 'physique').mult,   // bleed = physique only
      bleedMagic:   comboDamageMult(bleeding, 'feu').mult,        // bleed + feu → pas de combo
      none:         comboDamageMult(clean,    'physique').mult
    };
  });
  console.log('  T1 matrice:', t1);
  assert(t1.gelAny === 1.3,    'cible gelée → ×1.3 tous éléments');
  assert(t1.bleedPhys === 1.2, 'cible qui saigne + physique → ×1.2');
  assert(t1.bleedMagic === 1,  'cible qui saigne + élément non physique → pas de combo');
  assert(t1.none === 1,        'aucun statut → pas de combo');

  // T2 — intégration _computeSpellDamage : geler amplifie le sort suivant.
  const t2 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.statusEffects = []; e.resist = []; e.weak = [];
    const spell = { name: 'Test', power: 20, element: 'feu' };
    const orig = Math.random; Math.random = () => 0.99;   // pas de crit
    const base = _computeSpellDamage(spell, party[0], e).dmg;
    applyStatus(e, 'gel', 3, 3);
    const frozen = _computeSpellDamage(spell, party[0], e).dmg;
    Math.random = orig;
    return { base, frozen };
  });
  console.log('  T2 sort   :', t2);
  assert(t2.frozen > t2.base, `sort sur cible gelée doit faire plus (${t2.base}→${t2.frozen})`);

  // T3 — intégration executeAttack : coup physique amplifié sur cible gelée.
  const t3 = await page.evaluate(() => {
    const e = enemyGroup[0];
    e.currentHp = 500; e.def = 0; e.statusEffects = [];
    party[0].atk = 30; party[0].critChance = 0;
    currentBattleChar = 0;
    const orig = Math.random; Math.random = () => 0;       // rawAtk +0, pas de crit
    const hp0 = e.currentHp; executeAttack(0);
    const noCombo = hp0 - e.currentHp;
    e.currentHp = 500; applyStatus(e, 'gel', 3, 3);
    const hp1 = e.currentHp; executeAttack(0);
    const withCombo = hp1 - e.currentHp;
    Math.random = orig;
    return { noCombo, withCombo };
  });
  console.log('  T3 phys   :', t3);
  assert(t3.withCombo > t3.noCombo, `coup physique sur cible gelée doit faire plus (${t3.noCombo}→${t3.withCombo})`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (combos)`);
  }
  console.log('  ✅ combos de sorts (sort + physique) OK');
  await browser.close();
}

// ── Lot P2 — Sorts par Maison, Éclats, familiers, environnementaux, apprentissage ──
async function scenarioSpellsP2() {
  console.log('\n── Scénario : Sorts & Magie 2.0 — Lot P2 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 — houseSpellBoost greffé dans _spellSpCost : un sort house-affine coûte
  // moins cher pour sa Maison, et davantage aux paliers Mythe/Apothéose.
  const t1 = await page.evaluate(() => {
    const pat = SPELLS.find(s => s.name === 'Patronus Maxima'); // affine Gryffondor
    chosenHouse = 'Serpentard'; houseTier = 18;
    const otherHouse = _spellSpCost(pat, party[0]);             // pas d'affinité → coût plein
    chosenHouse = 'Gryffondor'; houseTier = 0;
    const affineBase = _spellSpCost(pat, party[0]);            // 15 %
    houseTier = 18;
    const affineApo = _spellSpCost(pat, party[0]);            // 25 %
    return { full: otherHouse, base: pat.cost, affineBase, affineApo };
  });
  console.log('  T1 houseSpellBoost:', t1);
  assert(t1.full === t1.base, `Patronus Maxima non-affine = coût plein (${t1.full}/${t1.base})`);
  assert(t1.affineBase < t1.full, `affine Gryffondor moins cher (${t1.affineBase} < ${t1.full})`);
  assert(t1.affineApo < t1.affineBase, `Apothéose réduit davantage (${t1.affineApo} < ${t1.affineBase})`);

  // T2 — Éclat de Voûte : gate requiresEclats AVANT débit PM, puis dégâts ×Éclats.
  await startDummyFight(page, { hp: 500 });
  const t2 = await page.evaluate(() => {
    party[0].spells.push('Éclat de Voûte');
    party[0].sp = 99; player.inventory = [];   // 0 Éclat
    currentBattleChar = 0;
    const sp0 = party[0].sp, hp0 = enemyGroup[0].currentHp;
    castSpellInBattle('Éclat de Voûte', 0);     // refusé (gate)
    const refused = { sp: party[0].sp, hp: enemyGroup[0].currentHp };
    // 2 Éclats → autorisé.
    player.inventory.push({ id: 'eclat_voute', qty: 2 });
    party[0].sp = 99; currentBattleChar = 0;
    const hp1 = enemyGroup[0].currentHp;
    castSpellInBattle('Éclat de Voûte', 0);
    return { sp0, hp0, refused, eclats: eclatProgress(),
             dealt: hp1 - enemyGroup[0].currentHp, spAfter: party[0].sp };
  });
  console.log('  T2 Éclat de Voûte:', t2);
  assert(t2.refused.sp === t2.sp0 && t2.refused.hp === t2.hp0,
    'sort d\'Éclat refusé sans Éclat : ni PM ni dégâts consommés');
  assert(t2.eclats === 2, `eclatProgress() doit refléter 2 Éclats, got ${t2.eclats}`);
  assert(t2.dealt > 0 && t2.spAfter < 99, 'Éclat de Voûte inflige des dégâts et coûte des PM avec 2 Éclats');

  // T3 — Avis Praesidium : familier combat-scoped qui frappe à chaque round.
  const t3 = await page.evaluate(() => {
    enemyGroup[0].currentHp = 500; enemyGroup[0].def = 0;
    party[0].spells.push('Avis Praesidium'); party[0].sp = 99; currentBattleChar = 0;
    const hp0 = enemyGroup[0].currentHp;
    castSpellInBattle('Avis Praesidium', 0);     // coup immédiat + familier
    const afterCast = { hp: enemyGroup[0].currentHp, fam: combatFamiliars.length };
    // Mesure le décrément/dégâts d'un tick explicite (indépendant du round déjà joué).
    const turnsBefore = combatFamiliars[0] ? combatFamiliars[0].turns : 0;
    const hp1 = enemyGroup[0].currentHp;
    const tickLog = tickFamiliars();
    const turnsAfter = combatFamiliars[0] ? combatFamiliars[0].turns : 0;
    return { hp0, afterCast, tickDealt: hp1 - enemyGroup[0].currentHp,
             turnsBefore, turnsAfter, hadLog: !!tickLog };
  });
  console.log('  T3 familier:', t3);
  assert(t3.afterCast.hp < t3.hp0, 'Avis Praesidium frappe immédiatement');
  assert(t3.afterCast.fam === 1, 'un familier est enregistré');
  assert(t3.tickDealt > 0 && t3.turnsAfter === t3.turnsBefore - 1,
    `tickFamiliars frappe et décrémente la durée (${t3.turnsBefore}→${t3.turnsAfter})`);

  // T4 — Sceau des Quatre : gate 3 Éclats (refus sans débit), puis effet
  // bouclier de groupe + anti-peur (handler testé en isolation, sans round auto).
  const t4 = await page.evaluate(() => {
    // (a) gate : 0 Éclat → refus avant débit PM.
    completedQuests.delete('eclats_clef_voute'); player.inventory = [];
    party[0].spells.push('Sceau des Quatre'); party[0].sp = 99; currentBattleChar = 0;
    const sp0 = party[0].sp;
    castSpellInBattle('Sceau des Quatre');        // refusé (3 Éclats requis)
    const gateRefused = party[0].sp === sp0;
    // (b) effet : 3 Éclats + handler direct → bouclier 2 tours, peur dissipée.
    completedQuests.add('eclats_clef_voute');
    party[0].statusEffects = [{ id: 'fear', power: 0, turns: 2 }];
    shieldTurns[0] = 0;
    _spellSealShield(SPELLS.find(s => s.name === 'Sceau des Quatre'), party[0]);
    return { eclats: eclatProgress(), gateRefused, shield: shieldTurns[0],
             hasFear: (party[0].statusEffects || []).some(s => s.id === 'fear') };
  });
  console.log('  T4 Sceau des Quatre:', t4);
  assert(t4.gateRefused, 'Sceau des Quatre refusé sans les 3 Éclats (aucun PM consommé)');
  assert(t4.eclats === 3, 'eclatProgress() = 3 après quête');
  assert(t4.shield === 2 && !t4.hasFear, 'bouclier de groupe (2 tours) posé + peur dissipée');
  await page.evaluate(() => { if (inBattle) endBattle(false); });

  // T5 — environnementaux OOC : Purgo dissipe un étage hostile, Fontis recharge.
  const t5 = await page.evaluate(() => {
    party[0].spells.push('Purgo', 'Fontis'); party[0].sp = 99;
    currentFloorEvent = 'hante';
    castSpellOutOfCombat('Purgo', 0);
    const purged = currentFloorEvent;
    // Fontis : poser une fontaine tarie sous le joueur.
    dungeon[playerY][playerX] = CELL.FOUNTAIN;
    const key = playerX + ',' + playerY;
    usedFountains.add(key);
    party[0].sp = 99;
    castSpellOutOfCombat('Fontis', 0);
    return { purged, fountainStillTaried: usedFountains.has(key) };
  });
  console.log('  T5 environnementaux:', t5);
  assert(t5.purged === null, 'Purgo dissipe l\'événement d\'étage hostile');
  assert(t5.fountainStillTaried === false, 'Fontis recharge la Fontaine tarie');

  // T6 — apprentissage PNJ (teach_spell) + Codex enseignant (teachesSpell).
  const t6 = await page.evaluate(() => {
    // PNJ : Scamander enseigne Avis Praesidium (déjà appris en T3 → on repart neuf).
    party[0].spells = party[0].spells.filter(s => s !== 'Avis Praesidium' && s !== 'Éclat de Voûte');
    if (typeof usedSpecialNpcs !== 'undefined') usedSpecialNpcs.delete('scamander');
    triggerNpcSpecialAction('scamander');
    const npcTaught = party[0].spells.includes('Avis Praesidium');
    const npcSpent  = (typeof usedSpecialNpcs !== 'undefined') && usedSpecialNpcs.has('scamander');
    // Codex : révéler l'entrée des Éclats (3 Éclats) enseigne Éclat de Voûte.
    unlockedCodexEntries.delete('eclat_voute_codex#revealed');
    player.inventory = [{ id: 'eclat_voute', qty: 3 }];
    checkCodexUnlocks('test-p2');
    const codexTaught = party[0].spells.includes('Éclat de Voûte');
    return { npcTaught, npcSpent, codexTaught };
  });
  console.log('  T6 apprentissage:', t6);
  assert(t6.npcTaught, 'Scamander enseigne Avis Praesidium (action teach_spell)');
  assert(t6.npcSpent,  'l\'action teach_spell est consommée (one-shot)');
  assert(t6.codexTaught, 'le Codex enseigne Éclat de Voûte à la révélation (teachesSpell)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (P2)`);
  }
  console.log('  ✅ Sorts & Magie 2.0 Lot P2 OK');
  await browser.close();
}

// ── Lot P3 — formes évoluées (resolveSpellForm) + variantes Premium signature ──
async function scenarioSpellsP3() {
  console.log('\n── Scénario : Sorts & Magie 2.0 — Lot P3 ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 — évolution réversible : Incendio + Bâton ancestral équipé → Incendio
  // Majeur (affichage modale + lancement), déséquiper ré-affiche la base.
  await startDummyFight(page, { hp: 800 });
  const t1 = await page.evaluate(() => {
    if (!party[0].spells.includes('Incendio')) party[0].spells.push('Incendio');
    const staff = ITEMS.find(i => i.id === 'baton_ancestral');
    party[0].equipped.wand = staff ? { ...staff } : { id: 'baton_ancestral' };
    const resolvedName = resolveSpellForm('Incendio', party[0]).name;
    // La modale de combat affiche bien la forme évoluée.
    openBattleSpells();
    const shownEvolved = Array.from(document.querySelectorAll('#spell-list .spell-name'))
      .some(el => el.textContent.includes('Incendio Majeur'));
    closeModal('spell-modal');
    party[0].sp = 99; enemyGroup[0].currentHp = 800; currentBattleChar = 0;
    const hp0 = enemyGroup[0].currentHp;
    castSpellInBattle('Incendio', 0);   // doit lancer la forme évoluée
    const dealt = hp0 - enemyGroup[0].currentHp;
    party[0].equipped.wand = { id: 'wand1' };   // déséquiper
    const baseName = resolveSpellForm('Incendio', party[0]).name;
    return { resolvedName, shownEvolved, dealt, baseName };
  });
  console.log('  T1 évolution:', t1);
  assert(t1.resolvedName === 'Incendio Majeur', 'Incendio + Bâton → Incendio Majeur');
  assert(t1.shownEvolved, 'la modale de combat affiche la forme évoluée');
  assert(t1.dealt > 0, 'la forme évoluée inflige des dégâts');
  assert(t1.baseName === 'Incendio', 'déséquiper le Bâton ré-affiche Incendio (réversible)');
  await page.evaluate(() => { if (inBattle) endBattle(false); });

  // T2 — Premium : appris via _teachSpellToParty (vecteur Apothéose) + le
  // houseSpellBoost réduit son coût pour la Maison affine.
  const t2 = await page.evaluate(() => {
    const learned = _teachSpellToParty('Incendio Royal');
    const royal = SPELLS.find(s => s.name === 'Incendio Royal');
    chosenHouse = 'Gryffondor'; houseTier = 18;
    const costAffine = _spellSpCost(royal, party[0]);
    chosenHouse = 'Serpentard';
    const costOther = _spellSpCost(royal, party[0]);
    chosenHouse = 'Gryffondor';
    return { learned, premium: royal.premium, premiumOf: royal.premiumOf,
             base: royal.cost, costAffine, costOther,
             grantWired: HOUSE_BONUSES.Gryffondor.tiers.some(t => t.bonus && t.bonus.grantsSpell === 'Incendio Royal') };
  });
  console.log('  T2 Premium:', t2);
  assert(t2.learned && t2.premium === true && t2.premiumOf === 'incendio', 'Incendio Royal appris + flags Premium');
  assert(t2.grantWired, 'Incendio Royal câblé sur l\'Apothéose Gryffondor (grantsSpell)');
  assert(t2.costOther === t2.base && t2.costAffine < t2.costOther,
    `houseSpellBoost réduit le coût Premium pour sa Maison (${t2.costAffine} < ${t2.costOther})`);

  // T3 — cast d'un Premium en combat (lifesteal + fioriture FX ne throw pas).
  await startDummyFight(page, { hp: 400 });
  const t3 = await page.evaluate(() => {
    _teachSpellToParty("Morsure d'Émeraude");
    party[0].hp = 1; party[0].sp = 99; currentBattleChar = 0;
    const hp0 = enemyGroup[0].currentHp, pv0 = party[0].hp;
    castSpellInBattle("Morsure d'Émeraude", 0);
    return { dealt: hp0 - enemyGroup[0].currentHp, healed: party[0].hp - pv0 };
  });
  console.log('  T3 cast Premium:', t3);
  assert(t3.dealt > 0, 'Morsure d\'Émeraude inflige des dégâts');
  assert(t3.healed > 0, 'Morsure d\'Émeraude draine des PV (lifesteal Premium)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (P3)`);
  }
  console.log('  ✅ Sorts & Magie 2.0 Lot P3 OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioSpellIcons, scenarioElementalSystem, scenarioElementSpells, scenarioSpellUx, scenarioSpellVoiceMapping, scenarioTeleportation, scenarioHealOoc, scenarioBombardaSplash, scenarioAoeSpells, scenarioSpellCombos, scenarioSpellsP2, scenarioSpellsP3] };
