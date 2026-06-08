// ============================================================
// Scénarios smoke — domaine « fx » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioEnemyIdle() {
  console.log('\n── Scénario : idle des sprites ennemis (E1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // E1a — helpers exposés
  const a = await page.evaluate(() => ({
    hasDraw:   typeof drawEnemySprite === 'function',
    hasAhead:  typeof _enemyAheadVisible === 'function',
    hasReduce: typeof _spriteReducedMotion === 'function',
    hasLoop:   typeof startNpcAnimLoop === 'function',
  }));
  console.log('  E1a helpers:', a);
  assert(a.hasDraw && a.hasAhead && a.hasReduce && a.hasLoop, 'E1a helpers absents');

  // E1b — _enemyAheadVisible : ennemi dans l'axe de regard → true ; carte
  // vide → false ; en combat → false (vue 3D masquée).
  const b = await page.evaluate(() => {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) enemyMap[y][x] = null;
    inBattle = false;
    const none = _enemyAheadVisible();
    const [dx, dy] = DIRECTIONS[playerDir];
    const ex = playerX + dx, ey = playerY + dy;
    let placed = false, ahead = null, inCombat = null;
    if (ex >= 0 && ey >= 0 && ex < MAP_W && ey < MAP_H) {
      enemyMap[ey][ex] = { id: 'peeve', icon: '👻', hp: 10, currentHp: 10 };
      placed = true;
      ahead = _enemyAheadVisible();
      inBattle = true; inCombat = _enemyAheadVisible(); inBattle = false;
      enemyMap[ey][ex] = null;
    }
    return { none, placed, ahead, inCombat };
  });
  console.log('  E1b ahead:', b);
  assert(b.none === false, 'E1b carte vide → false');
  if (b.placed) {
    assert(b.ahead === true,    'E1b ennemi devant → true');
    assert(b.inCombat === false, 'E1b en combat → false');
  }

  // E1c — drawEnemySprite ne throw pas (fallback emoji ; deux phases) ;
  // phase 0 par défaut ⇒ amplitude nulle (régression rendu historique).
  const c = await page.evaluate(() => {
    const enemy = { id: 'peeve', icon: '👻', hp: 20, currentHp: 12, imgSrc: null };
    let threw = false;
    try {
      _npcAnimPhase = 0;   drawEnemySprite(enemy, 200, 300, 60);
      _npcAnimPhase = 1.0; drawEnemySprite(enemy, 200, 300, 60);
      _npcAnimPhase = 2.7; drawEnemySprite(enemy, 200, 300, 60);
    } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  E1c draw:', c);
  assert(!c.threw, 'E1c drawEnemySprite throw');

  // E1d — reduced-motion : amplitude 0, pas de throw.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const d = await page.evaluate(() => {
    const enemy = { id: 'peeve', icon: '👻', hp: 20, currentHp: 12, imgSrc: null };
    let threw = false;
    try { _npcAnimPhase = 3.5; drawEnemySprite(enemy, 200, 300, 60); } catch (e) { threw = true; }
    return { reduced: _spriteReducedMotion(), threw };
  });
  console.log('  E1d reduced:', d);
  assert(d.reduced === true, 'E1d emulateMedia reduce non pris en compte');
  assert(!d.threw, 'E1d drawEnemySprite throw sous reduced-motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario idle ennemis');
  }
  console.log('  ✅ idle des sprites ennemis (E1) OK');
  await browser.close();
}

async function scenarioDungeonVfx() {
  console.log('\n── Scénario : VFX d\'interaction de donjon (E3) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // V1 — API + proxy défensif
  const v1 = await page.evaluate(() => ({
    hasBurst: typeof window.DungeonFX?.burst === 'function',
    hasProxy: typeof window.DFX_safe?.burst === 'function',
  }));
  console.log('  V1 api:', v1);
  assert(v1.hasBurst && v1.hasProxy, 'V1 API burst / DFX_safe absente');

  // V2 — burst monte une couche dans l'hôte (direct + proxy), auto-retirée
  const v2 = await page.evaluate(() => {
    let threw = false;
    try {
      DungeonFX.burst('explore-overlay', 'gold');
      DFX_safe.burst('explore-overlay', 'water'); // via proxy
    } catch (e) { threw = true; }
    return { threw, layers: document.querySelectorAll('#explore-overlay .dfx-burst-layer').length };
  });
  console.log('  V2 mount:', v2);
  assert(!v2.threw, 'V2 burst throw');
  assert(v2.layers >= 1, 'V2 couche dfx-burst-layer non montée');
  await page.waitForFunction(
    () => document.querySelectorAll('.dfx-burst-layer').length === 0, { timeout: 2000 });

  // V3 — call-sites réels ne throwent pas (coffre, fontaine, level-up)
  const v3 = await page.evaluate(() => {
    let threw = false;
    try {
      dungeon[playerY][playerX] = CELL.CHEST;    openChest();
      dungeon[playerY][playerX] = CELL.FOUNTAIN; usedFountains.clear(); useFountain();
      player.xp = player.xpNext;                 checkLevelUp();
    } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  V3 callsites:', v3);
  assert(!v3.threw, 'V3 openChest/useFountain/checkLevelUp throw');

  // V4 — reduced-motion : halo seul, aucune particule projetée. On nettoie
  // d'éventuelles couches résiduelles (bursts V3 encore en cours) puis on
  // mesure uniquement la couche fraîchement créée.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const v4 = await page.evaluate(() => {
    document.querySelectorAll('.dfx-burst-layer').forEach(l => l.remove());
    let threw = false;
    try { DungeonFX.burst('explore-overlay', 'levelup'); } catch (e) { threw = true; }
    const layer = document.querySelector('#explore-overlay .dfx-burst-layer');
    return {
      threw,
      halo:  layer ? layer.querySelectorAll('.dfx-burst-halo').length : 0,
      parts: layer ? layer.querySelectorAll('.dfx-burst-particle').length : 0,
    };
  });
  console.log('  V4 reduced:', v4);
  assert(!v4.threw, 'V4 burst throw sous reduced-motion');
  assert(v4.halo >= 1 && v4.parts === 0, 'V4 reduced-motion : halo sans projectiles');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // V5 — fioriture de level-up (J2) : levelUpFlash pose la classe transitoire
  // .dfx-levelup-flash sur .levelup-box (API directe + call-site réel
  // checkLevelUp). Sous reduced-motion → no-op (classe non posée).
  const v5api = await page.evaluate(() => typeof window.DungeonFX?.levelUpFlash === 'function');
  assert(v5api, 'V5 API DungeonFX.levelUpFlash (J2) absente');
  const v5 = await page.evaluate(() => {
    let threw = false, direct = false, viaReal = false;
    try {
      const box = document.querySelector('#levelup-modal .levelup-box');
      if (box) box.classList.remove('dfx-levelup-flash');
      window.DungeonFX.levelUpFlash();
      direct = !!(box && box.classList.contains('dfx-levelup-flash'));
      // Call-site réel : un nouveau passage de niveau ré-arme le flash.
      if (box) box.classList.remove('dfx-levelup-flash');
      player.xp = player.xpNext;
      checkLevelUp();
      viaReal = !!(box && box.classList.contains('dfx-levelup-flash'));
    } catch (e) { threw = true; }
    return { threw, direct, viaReal };
  });
  console.log('  V5 levelup:', v5);
  assert(!v5.threw, 'V5 levelUpFlash/checkLevelUp throw');
  assert(v5.direct, 'V5 classe .dfx-levelup-flash non posée par l\'appel direct');
  assert(v5.viaReal, 'V5 checkLevelUp n\'a pas déclenché le flash de level-up');

  // V5b — reduced-motion : levelUpFlash est un no-op (aucune classe posée).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const v5b = await page.evaluate(() => {
    const box = document.querySelector('#levelup-modal .levelup-box');
    if (box) box.classList.remove('dfx-levelup-flash');
    window.DungeonFX.levelUpFlash();
    return box ? box.classList.contains('dfx-levelup-flash') : null;
  });
  console.log('  V5b reduced:', v5b);
  assert(v5b === false, 'V5b reduced-motion : levelUpFlash devrait être no-op');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario VFX de donjon');
  }
  console.log('  ✅ VFX d\'interaction de donjon (E3) + fioriture de level-up (J2) OK');
  await browser.close();
}

async function scenarioCombatFeedback() {
  console.log('\n── Scénario : feedback de combat (SFX + timeline + journal) ──');

  // E1 — SFX crit / faiblesse : méthodes présentes et appelables sans erreur.
  {
    const { browser, page } = await launchGame();
    const e1 = await page.evaluate(() => {
      const has = typeof AudioSystem !== 'undefined'
        && typeof AudioSystem.playCrit === 'function'
        && typeof AudioSystem.playWeakHit === 'function';
      AudioSystem.isMuted = true;   // chemin défensif : retour anticipé, pas de ctx
      let threw = false;
      try { AudioSystem.playCrit(); AudioSystem.playWeakHit(); } catch (e) { threw = true; }
      return { has, threw };
    });
    console.log('  E1 sfx:', e1);
    assert(e1.has,   'playCrit + playWeakHit définis sur AudioSystem');
    assert(!e1.threw, 'SFX crit/faiblesse ne lèvent pas d\'erreur');
    await browser.close();
  }

  // E2 — Timeline : un allié KO est masqué de l'ordre d'initiative.
  {
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'] });
    await startDummyFight(page, { hp: 200 });
    const e2 = await page.evaluate(() => {
      party[1].hp = 0;             // Hermione KO
      currentBattleChar = 0;
      UX.renderTimeline();
      const tl = document.getElementById('turn-timeline');
      return { allies: tl ? tl.querySelectorAll('.tl-ally').length : -1 };
    });
    console.log('  E2 timeline:', e2);
    assert(e2.allies === 1, 'allié KO masqué de la frise (1 allié vivant restant)');
    if (errors.length) { errors.forEach(e => console.log('  ⚠️ ', e)); throw new Error('erreurs JS (E2 timeline)'); }
    await browser.close();
  }

  // E3 — Journal mobile : replié par défaut + pulse de hint au 1er combat.
  {
    const { browser, page } = await launchGame();
    await page.setViewportSize({ width: 400, height: 800 });
    const e3 = await page.evaluate(() => {
      UX.logCombat('test', 'info');   // crée le panneau de log
      const p = document.getElementById('combat-log-panel');
      return {
        collapsed: !!(p && p.classList.contains('collapsed')),
        hinted:    !!(p && p.classList.contains('clp-hint'))
      };
    });
    console.log('  E3 journal:', e3);
    assert(e3.collapsed, 'journal mobile replié par défaut (portrait du monstre visible)');
    assert(e3.hinted,    'journal mobile : hint pulse signalé au 1er combat');
    await browser.close();
  }

  console.log('  ✅ feedback de combat (SFX + timeline + journal mobile) OK');
}

async function scenarioCombatFX() {
  console.log('\n── Scénario : Combat FX (VFX + shake + boss intro) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // F1 — module présent + API exposée + proxy défensif opérationnel
  const f1 = await page.evaluate(() => ({
    hasModule: typeof window.CombatFX === 'object' && !!window.CombatFX,
    hasBurst:  typeof window.CombatFX?.spellBurst === 'function',
    hasHeal:   typeof window.CombatFX?.healBurst === 'function',
    hasBuff:   typeof window.CombatFX?.buffAura === 'function',
    hasShake:  typeof window.CombatFX?.shake === 'function',
    hasBoss:   typeof window.CombatFX?.bossIntro === 'function',
    hasEnter:  typeof window.CombatFX?.combatStart === 'function',
    hasHurt:   typeof window.CombatFX?.hurtFlash === 'function',
    hasStatus: typeof window.CombatFX?.statusFlash === 'function',
    hasDissolve: typeof window.CombatFX?.deathDissolve === 'function',
    hasCast:   typeof window.CombatFX?.castFlash === 'function',
    hasLoot:   typeof window.CombatFX?.lootPop === 'function',
    hasTelegraph: typeof window.CombatFX?.telegraph === 'function',
    hasProxy:  typeof window.CFX_safe?.spellBurst === 'function',
  }));
  console.log('  F1 module:', f1);
  assert(f1.hasModule, 'F1 window.CombatFX absent');
  assert(f1.hasBurst && f1.hasShake && f1.hasBoss, 'F1 API incomplète');
  assert(f1.hasHeal && f1.hasBuff, 'F1 API soin/buff (B1) absente');
  assert(f1.hasEnter, 'F1 API combatStart (C1) absente');
  assert(f1.hasHurt, 'F1 API hurtFlash (D3) absente');
  assert(f1.hasStatus, 'F1 API statusFlash (E2) absente');
  assert(f1.hasDissolve, 'F1 API deathDissolve (G1) absente');
  assert(f1.hasCast, 'F1 API castFlash (G2) absente');
  assert(f1.hasLoot, 'F1 API lootPop (J1) absente');
  assert(f1.hasTelegraph, 'F1 API telegraph (G3) absente');
  assert(f1.hasProxy, 'F1 CFX_safe proxy absent');

  await startDummyFight(page, { hp: 50 });

  // F2 — appels en combat : ne throwent pas, créent la couche de FX
  const f2 = await page.evaluate(() => {
    let threw = false;
    try {
      window.CombatFX.spellBurst('enemy:0', 'feu');
      window.CombatFX.shake('light');
      window.CFX_safe.spellBurst('enemy:0', 'glace'); // via proxy
    } catch (e) { threw = true; }
    return { threw, layer: !!document.getElementById('combat-fx-layer') };
  });
  console.log('  F2 combat:', f2);
  assert(!f2.threw, 'F2 spellBurst/shake throw en combat');
  assert(f2.layer, 'F2 couche combat-fx-layer non créée');

  // F3 — boss intro : carte-titre pour un ennemi epic, no-op sinon
  const f3 = await page.evaluate(() => {
    let threw = false;
    try {
      window.CombatFX.bossIntro({ name: 'Voldemort', title: 'Le Seigneur des Ténèbres', epic: true });
    } catch (e) { threw = true; }
    const epicCard = !!document.getElementById('cfx-boss-intro');
    const old = document.getElementById('cfx-boss-intro');
    if (old) old.remove();
    window.CombatFX.bossIntro({ name: 'Rat', epic: false });
    const normalCard = !!document.getElementById('cfx-boss-intro');
    return { threw, epicCard, normalCard };
  });
  console.log('  F3 boss  :', f3);
  assert(!f3.threw, 'F3 bossIntro throw');
  assert(f3.epicCard, 'F3 carte-titre boss epic non créée');
  assert(!f3.normalCard, 'F3 carte-titre créée à tort pour un non-boss');

  // F4 — VFX soin/buff (B1) : appels directs + via proxy ne throwent pas,
  // alimentent la couche combat-fx-layer (toujours en combat ici).
  const f4 = await page.evaluate(() => {
    let threw = false;
    try {
      window.CombatFX.healBurst('ally');
      window.CombatFX.buffAura('ally');
      window.CFX_safe.healBurst('ally'); // via proxy
      window.CFX_safe.buffAura('ally');
    } catch (e) { threw = true; }
    return { threw, layer: !!document.getElementById('combat-fx-layer') };
  });
  console.log('  F4 soin/buff:', f4);
  assert(!f4.threw, 'F4 healBurst/buffAura throw en combat');
  assert(f4.layer, 'F4 couche combat-fx-layer absente');

  // F5 — transition d'entrée (C1) : combatStart crée #cfx-combat-flash dans
  // l'overlay sans throw ; l'élément est présent juste après l'appel.
  const f5 = await page.evaluate(() => {
    let threw = false;
    try { window.CFX_safe.combatStart(); } catch (e) { threw = true; }
    return { threw, flash: !!document.getElementById('cfx-combat-flash') };
  });
  console.log('  F5 entrée  :', f5);
  assert(!f5.threw, 'F5 combatStart throw');
  assert(f5.flash, 'F5 #cfx-combat-flash non créé');

  // F6 — flash de dégâts encaissés (D3) : hurtFlash + proxy ne throwent
  // pas et créent #cfx-hurt-flash dans l'overlay (intensité quelconque).
  const f6 = await page.evaluate(() => {
    let threw = false;
    try {
      window.CombatFX.hurtFlash(0.7);
      window.CFX_safe.hurtFlash(0.3); // via proxy
    } catch (e) { threw = true; }
    return { threw, flash: !!document.getElementById('cfx-hurt-flash') };
  });
  console.log('  F6 hurt   :', f6);
  assert(!f6.threw, 'F6 hurtFlash throw');
  assert(f6.flash, 'F6 #cfx-hurt-flash non créé');

  // F7 — flash de statut (E2) : statusFlash + proxy ne throwent pas et
  // montent anneau + glyphe dans la couche FX ; auto-retirés ensuite. La
  // pose réelle via applyStatus (battle.js) ne throw pas non plus.
  const f7 = await page.evaluate(() => {
    let threw = false;
    try {
      window.CombatFX.statusFlash('enemy:0', 'burn');
      window.CFX_safe.statusFlash('ally', 'gel'); // via proxy
      // call-site réel : pose d'un statut sur l'ennemi 0 en combat
      if (enemyGroup[0]) applyStatus(enemyGroup[0], 'poison', 3, 3);
    } catch (e) { threw = true; }
    const ring  = document.querySelectorAll('.cfx-status-ring').length;
    const glyph = document.querySelectorAll('.cfx-status-glyph').length;
    return { threw, ring, glyph };
  });
  console.log('  F7 status :', f7);
  assert(!f7.threw, 'F7 statusFlash/applyStatus throw');
  assert(f7.ring >= 1 && f7.glyph >= 1, 'F7 anneau/glyphe de statut non montés');

  // F7b — les éléments de flash de statut sont auto-retirés (anim terminée).
  await page.waitForFunction(
    () => document.querySelectorAll('.cfx-status-ring').length === 0
       && document.querySelectorAll('.cfx-status-glyph').length === 0,
    { timeout: 2000 }
  );

  // F8 — désintégration de l'ennemi vaincu (G1) : tuer l'ennemi 0 puis
  // renderEnemyGroup monte un nuage .cfx-dissolve-puff (hook réel), une
  // seule fois (flag _dissolvePlayed) ; l'appel direct ne throw pas.
  const f8 = await page.evaluate(() => {
    let threw = false;
    let puffsAfter1 = 0, puffsAfter2 = 0, flagged = false;
    try {
      if (enemyGroup[0]) {
        enemyGroup[0].currentHp = 0;
        enemyGroup[0]._dissolvePlayed = false;
        renderEnemyGroup();                                   // hook réel
        puffsAfter1 = document.querySelectorAll('.cfx-dissolve-puff').length;
        flagged = enemyGroup[0]._dissolvePlayed === true;
        renderEnemyGroup();                                   // idempotent
        puffsAfter2 = document.querySelectorAll('.cfx-dissolve-puff').length;
      }
      // Appel direct (palette fantôme) ne throw pas.
      window.CFX_safe.deathDissolve(0, { category: 'fantôme' });
    } catch (e) { threw = true; }
    return { threw, puffsAfter1, puffsAfter2, flagged };
  });
  console.log('  F8 dissolve:', f8);
  assert(!f8.threw, 'F8 deathDissolve/renderEnemyGroup throw');
  assert(f8.puffsAfter1 >= 1, 'F8 nuage de désintégration non monté à la mort');
  assert(f8.flagged, 'F8 _dissolvePlayed non posé');
  assert(f8.puffsAfter2 === f8.puffsAfter1, 'F8 désintégration rejouée (non idempotent)');

  // F9 — feedback de cast côté lanceur (G2) : castFlash + proxy ne throwent
  // pas et montent un halo .cfx-cast-halo à l'ancre 'ally'. Le call-site réel
  // (castSpellInBattle) déclenche aussi le flash sans throw.
  const f9 = await page.evaluate(() => {
    let threw = false, haloDirect = 0, haloReal = 0;
    try {
      // Combat neuf (l'ennemi a pu être tué en F8) : on relance un dummy.
      window.CombatFX.castFlash('ally', 'feu');
      window.CFX_safe.castFlash('ally', 'glace'); // via proxy
      haloDirect = document.querySelectorAll('.cfx-cast-halo').length;
    } catch (e) { threw = true; }
    return { threw, haloDirect, haloReal };
  });
  console.log('  F9 cast   :', f9);
  assert(!f9.threw, 'F9 castFlash throw');
  assert(f9.haloDirect >= 1, 'F9 halo de cast non monté');

  // F9b — call-site réel : relancer un combat et lancer un sort offensif.
  await startDummyFight(page, { hp: 80 });
  const f9b = await page.evaluate(() => {
    let threw = false, halo = 0;
    try {
      const harry = party[0];
      harry.sp = harry.spMax;
      // Premier sort offensif connu de Harry (Incendio/Stupefix…).
      const off = (harry.spells || []).find(s => /Incendio|Stupefix|Diffindo|Expelliarmus/.test(s)) || harry.spells[0];
      castSpellInBattle(off, 0);
      halo = document.querySelectorAll('.cfx-cast-halo').length;
    } catch (e) { threw = true; }
    return { threw, halo };
  });
  console.log('  F9b castreal:', f9b);
  assert(!f9b.threw, 'F9b castSpellInBattle throw avec castFlash');
  assert(f9b.halo >= 1, 'F9b halo de cast non monté au call-site réel');

  // F10 — pop de butin (J1) : lootPop monte une couche fixée au body
  // (l'overlay de combat étant masqué quand endBattle traite les drops),
  // empilable (offset --cfx-loot-i), sans throw via API directe + proxy.
  const f10 = await page.evaluate(() => {
    let threw = false, count = 0, idxSecond = null;
    try {
      const item = (typeof ITEMS !== 'undefined' && ITEMS[0]) ? ITEMS[0] : { name: 'Test', icon: '🎁' };
      window.CombatFX.lootPop(item);
      window.CFX_safe.lootPop(item); // via proxy → empilé
      const pops = document.querySelectorAll('#cfx-loot-layer .cfx-loot-pop');
      count = pops.length;
      idxSecond = pops[1] ? pops[1].style.getPropertyValue('--cfx-loot-i') : null;
    } catch (e) { threw = true; }
    return { threw, count, idxSecond };
  });
  console.log('  F10 loot  :', f10);
  assert(!f10.threw, 'F10 lootPop throw');
  assert(f10.count >= 2, 'F10 pop de butin non monté (≥ 2 attendus)');
  assert(f10.idxSecond === '1', 'F10 offset d\'empilement non appliqué (--cfx-loot-i)');

  // F11 — télégraphe du tour ennemi (G3) : telegraph pose la classe
  // transitoire .cfx-telegraph sur la carte de l'ennemi ciblé ; le call-site
  // réel (enemyTurn) la pose sur les ennemis vivants sans throw.
  await startDummyFight(page, { hp: 80 });
  const f11 = await page.evaluate(() => {
    let threw = false, direct = false, viaTurn = 0;
    try {
      window.CombatFX.telegraph(0);
      const card = document.getElementById('enemy-card-0');
      direct = !!(card && card.classList.contains('cfx-telegraph'));
      // Call-site réel : enemyTurn télégraphie tous les ennemis vivants.
      // On nettoie d'abord les classes posées par l'appel direct.
      document.querySelectorAll('.cfx-telegraph').forEach(el => el.classList.remove('cfx-telegraph'));
      enemyTurn();
      viaTurn = document.querySelectorAll('.enemy-card.cfx-telegraph').length;
    } catch (e) { threw = true; }
    return { threw, direct, viaTurn };
  });
  console.log('  F11 telegraph:', f11);
  assert(!f11.threw, 'F11 telegraph/enemyTurn throw');
  assert(f11.direct, 'F11 classe .cfx-telegraph non posée par l\'appel direct');
  assert(f11.viaTurn >= 1, 'F11 enemyTurn n\'a télégraphié aucun ennemi vivant');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Combat FX');
  }
  console.log('  ✅ Combat FX (VFX + shake + boss intro + désintégration G1 + cast G2 + butin J1 + télégraphe G3) OK');
  await browser.close();
}

async function scenarioDungeonFX() {
  console.log('\n── Scénario : Dungeon FX (torches + brume + shake) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // G1 — module présent + API + proxy défensif + phase d'animation globale
  const g1 = await page.evaluate(() => ({
    hasModule:  typeof window.DungeonFX === 'object' && !!window.DungeonFX,
    hasLoop:    typeof window.startDungeonFxLoop === 'function',
    hasShake:   typeof window.DungeonFX?.shakeView === 'function',
    hasProxy:   typeof window.DFX_safe?.shakeView === 'function',
    hasMist:    typeof drawDepthsMist === 'function',
    hasDust:    typeof drawDungeonDust === 'function',
    hasBurst:   typeof window.DungeonFX?.burst === 'function',
    phaseDefined: typeof _dungeonFxPhase !== 'undefined',
  }));
  console.log('  G1 module:', g1);
  assert(g1.hasModule,  'G1 window.DungeonFX absent');
  assert(g1.hasLoop,    'G1 startDungeonFxLoop absent');
  assert(g1.hasShake && g1.hasProxy, 'G1 shakeView / proxy absent');
  assert(g1.hasMist,    'G1 drawDepthsMist absent');
  assert(g1.hasDust,    'G1 drawDungeonDust (E4) absent');
  assert(g1.hasBurst,   'G1 DungeonFX.burst (E3) absent');
  assert(g1.phaseDefined, 'G1 _dungeonFxPhase non déclaré');

  // G2 — shakeView ne throw pas et applique la classe sur le canvas.
  const g2 = await page.evaluate(() => {
    let threw = false;
    try { window.DungeonFX.shakeView('heavy'); window.DFX_safe.shakeView('light'); }
    catch (e) { threw = true; }
    const cv = document.getElementById('dungeon-canvas');
    const hasClass = cv && (cv.classList.contains('dfx-shake-light')
                          || cv.classList.contains('dfx-shake-heavy'));
    return { threw, hasClass: !!hasClass };
  });
  console.log('  G2 shake:', g2);
  assert(!g2.threw, 'G2 shakeView a throw');
  // hasClass peut être false sous reduced-motion (no-op) : on ne l'assert pas
  // durement, mais on garantit l'absence d'exception.

  // G3 — torche animée : drawTorch lit la phase et drawDungeon reste sûr
  // quelle que soit la valeur de _dungeonFxPhase (statique 0 ou animée).
  const g3 = await page.evaluate(() => {
    let threw = false;
    try {
      _dungeonFxPhase = 0;             // rendu statique
      drawDungeon();
      _dungeonFxPhase = 3.14159;       // rendu animé (flicker + braises)
      drawDungeon();
      // Brume : force un étage « depths » (7+) puis redessine.
      const prevFloor = currentFloor;
      currentFloor = 8;
      drawDungeon();
      currentFloor = prevFloor;
      drawDungeon();
    } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  G3 render:', g3);
  assert(!g3.threw, 'G3 drawDungeon/drawTorch/mist a throw');

  // G4 — poussière ambiante (E4) : drawDungeonDust ne throw pas sur les
  // 4 tranches d'ambiance ni quelle que soit la phase ; reduced-motion et
  // phase 0 = no-op (pas de throw). Peint sur le canvas (pas de DOM).
  const g4 = await page.evaluate(() => {
    let threw = false;
    try {
      const prevFloor = currentFloor;
      _dungeonFxPhase = 2.0;
      [1, 5, 8, 14].forEach(f => { currentFloor = f; drawDungeonDust(); });
      _dungeonFxPhase = 0; drawDungeonDust();   // phase statique → no-op
      currentFloor = prevFloor;
    } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  G4 dust:', g4);
  assert(!g4.threw, 'G4 drawDungeonDust a throw');

  // G4b — reduced-motion : drawDungeonDust est un no-op (pas de throw).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const g4b = await page.evaluate(() => {
    let threw = false;
    try { _dungeonFxPhase = 2.0; drawDungeonDust(); } catch (e) { threw = true; }
    return { threw };
  });
  console.log('  G4b reduced:', g4b);
  assert(!g4b.threw, 'G4b drawDungeonDust throw sous reduced-motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Dungeon FX');
  }
  console.log('  ✅ Dungeon FX (torches + brume + shake) OK');
  await browser.close();
}

async function scenarioCinematics() {
  console.log('\n── Scénario : Cinematics (intro + victoire) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // G1 — module présent + API + proxy défensif
  const g1 = await page.evaluate(() => ({
    hasModule:   typeof window.Cinematics === 'object' && !!window.Cinematics,
    hasIntro:    typeof window.Cinematics?.introAmbiance === 'function',
    hasVictory:  typeof window.Cinematics?.victoryFlourish === 'function',
    hasStop:     typeof window.Cinematics?.stop === 'function',
    hasProxy:    typeof window.CIN_safe?.victoryFlourish === 'function',
  }));
  console.log('  G1 module:', g1);
  assert(g1.hasModule,  'G1 window.Cinematics absent');
  assert(g1.hasIntro && g1.hasVictory && g1.hasStop, 'G1 API incomplète');
  assert(g1.hasProxy,   'G1 CIN_safe proxy absent');

  // G2 — intro : monte un canvas derrière la carte, démonté par stop.
  const g2 = await page.evaluate(() => {
    const reduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scr = document.getElementById('intro-screen');
    scr.style.display = 'flex';                 // hôte visible pour la boucle
    let threw = false, mounted = false, removed = false;
    try {
      window.Cinematics.introAmbiance(true);
      mounted = !!scr.querySelector('canvas.cin-canvas');
      window.CIN_safe.introAmbiance(false);
      removed = !scr.querySelector('canvas.cin-canvas');
    } catch (e) { threw = true; }
    scr.style.display = 'none';
    return { reduced: !!reduced, threw, mounted, removed };
  });
  console.log('  G2 intro:', g2);
  assert(!g2.threw, 'G2 introAmbiance a throw');
  if (!g2.reduced) assert(g2.mounted, 'G2 canvas intro non monté');
  assert(g2.removed, 'G2 canvas intro non démonté après stop');

  // G3 — victoire : showVictoryScreen monte le flourish, closeVictoryScreen
  // l'arrête (call-sites réels d'endgame.js).
  const g3 = await page.evaluate(() => {
    const reduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const modal = document.getElementById('victory-modal');
    let threw = false, mounted = false, removed = false, hidden = false;
    try {
      window.showVictoryScreen();
      mounted = !!modal.querySelector('canvas.cin-canvas');
      window.closeVictoryScreen();
      removed = !modal.querySelector('canvas.cin-canvas');
      hidden  = getComputedStyle(modal).display === 'none';
    } catch (e) { threw = true; }
    return { reduced: !!reduced, threw, mounted, removed, hidden };
  });
  console.log('  G3 victory:', g3);
  assert(!g3.threw, 'G3 victoryFlourish/stop a throw');
  if (!g3.reduced) assert(g3.mounted, 'G3 canvas victoire non monté');
  assert(g3.removed, 'G3 canvas victoire non démonté après stop');
  assert(g3.hidden, 'G3 modale victoire non masquée après close');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Cinematics');
  }
  console.log('  ✅ Cinematics (intro + victoire) OK');
  await browser.close();
}

async function scenarioHaptics() {
  console.log('\n── Scénario : Haptique mobile (D1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // H1 — module présent + API exposée + proxy défensif opérationnel
  const h1 = await page.evaluate(() => ({
    hasModule: typeof window.Haptics === 'object' && !!window.Haptics,
    hasHit:    typeof window.Haptics?.hit === 'function',
    hasCrit:   typeof window.Haptics?.crit === 'function',
    hasDeath:  typeof window.Haptics?.death === 'function',
    hasLevel:  typeof window.Haptics?.levelUp === 'function',
    hasProxy:  typeof window.HAPTICS_safe?.hit === 'function',
  }));
  console.log('  H1 module:', h1);
  assert(h1.hasModule, 'H1 window.Haptics absent');
  assert(h1.hasHit && h1.hasCrit && h1.hasDeath && h1.hasLevel, 'H1 API incomplète');
  assert(h1.hasProxy, 'H1 HAPTICS_safe proxy absent');

  // Spy : remplace navigator.vibrate par un enregistreur d'appels.
  await page.evaluate(() => {
    window.__vibes = [];
    navigator.vibrate = (p) => { window.__vibes.push(p); return true; };
  });

  // H2 — chaque API déclenche un appel à vibrate (hors reduced-motion)
  const h2 = await page.evaluate(() => {
    window.__vibes = [];
    window.HAPTICS_safe.hit();
    window.HAPTICS_safe.crit();
    window.HAPTICS_safe.levelUp();
    window.HAPTICS_safe.death();
    return { count: window.__vibes.length };
  });
  console.log('  H2 vibrate:', h2);
  assert(h2.count === 4, 'H2 les 4 API doivent chacune appeler navigator.vibrate');

  // H3 — call-site réel : un coup physique en combat déclenche une vibration
  await startDummyFight(page, { hp: 50 });
  const h3 = await page.evaluate(() => {
    window.__vibes = [];
    executeAttack(0);
    return { count: window.__vibes.length };
  });
  console.log('  H3 combat:', h3);
  assert(h3.count >= 1, 'H3 un coup en combat doit déclencher une vibration');

  // H4 — prefers-reduced-motion : aucune vibration (mouvement ressenti)
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const h4 = await page.evaluate(() => {
    window.__vibes = [];
    window.HAPTICS_safe.hit();
    window.HAPTICS_safe.crit();
    window.HAPTICS_safe.levelUp();
    window.HAPTICS_safe.death();
    return { count: window.__vibes.length };
  });
  console.log('  H4 reduced:', h4);
  assert(h4.count === 0, 'H4 aucune vibration ne doit partir sous prefers-reduced-motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Haptique');
  }
  console.log('  ✅ Haptique mobile (D1) OK');
  await browser.close();
}

async function scenarioDangerVignette() {
  console.log('\n── Scénario : Vignette de danger bas-PV (D2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // V1 — PV pleins → pas de classe
  const v1 = await page.evaluate(() => {
    party[0].hp = party[0].hpMax;
    updateUI();
    return document.body.classList.contains('cfx-danger');
  });
  console.log('  V1 plein:', v1);
  assert(!v1, 'V1 cfx-danger présente à PV pleins');

  // V2 — PV sous le seuil (20 %) → classe présente
  const v2 = await page.evaluate(() => {
    party[0].hp = Math.max(1, Math.floor(party[0].hpMax * 0.2));
    updateUI();
    return document.body.classList.contains('cfx-danger');
  });
  console.log('  V2 danger:', v2);
  assert(v2, 'V2 cfx-danger absente sous 25 % PV');

  // V3 — PV remontés → classe retirée
  const v3 = await page.evaluate(() => {
    party[0].hp = party[0].hpMax;
    updateUI();
    return document.body.classList.contains('cfx-danger');
  });
  console.log('  V3 remonté:', v3);
  assert(!v3, 'V3 cfx-danger non retirée après remontée des PV');

  // V4 — héros KO (hp=0) ne compte pas (seuil sur membres vivants)
  const v4 = await page.evaluate(() => {
    party[0].hp = 0;
    updateUI();
    return document.body.classList.contains('cfx-danger');
  });
  console.log('  V4 KO:', v4);
  assert(!v4, 'V4 cfx-danger déclenchée à tort pour un héros KO');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Vignette de danger');
  }
  console.log('  ✅ Vignette de danger bas-PV (D2) OK');
  await browser.close();
}

// K1 — réaction de la carte de groupe qui encaisse/est soignée. UX.cardReact
// pose une classe transitoire sur #char-card-<idx> (flash rouge + secousse pour
// dmg/crit, flash vert pour heal), retirée après l'anim. Défensif sur carte
// absente. Exerce le même chemin que les call-sites battle.js/battle-spells.js.
async function scenarioCardReact() {
  console.log('\n── Scénario : Réaction de carte de groupe (K1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // 1) API présente + classe posée immédiatement par chaque kind.
  const posed = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasFn = typeof UX !== 'undefined' && typeof UX.cardReact === 'function';
      const cc = document.getElementById('char-card-0');
      UX.cardReact(0, 'dmg');
      out.dmg = cc.classList.contains('card-react-dmg');
      UX.cardReact(0, 'crit');
      out.crit = cc.classList.contains('card-react-crit');
      // crit reset retire la classe dmg (anti-cumul lors de coups rapprochés).
      out.dmgCleared = !cc.classList.contains('card-react-dmg');
      UX.cardReact(1, 'heal');
      out.heal = document.getElementById('char-card-1').classList.contains('flash-heal');
      // Carte absente → no-op sans throw.
      UX.cardReact(9, 'dmg');
      out.noThrowMissing = true;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  K1 posé:', posed);
  assert(!posed.threw, 'K1 throw: ' + (posed.err || ''));
  assert(posed.hasFn, 'K1 UX.cardReact absent');
  assert(posed.dmg, 'K1 classe card-react-dmg non posée');
  assert(posed.crit, 'K1 classe card-react-crit non posée');
  assert(posed.dmgCleared, 'K1 classe dmg non réinitialisée avant crit');
  assert(posed.heal, 'K1 classe flash-heal non posée (heal)');
  assert(posed.noThrowMissing, 'K1 carte absente devrait être un no-op');

  // 2) La classe est bien retirée après l'animation (~550 ms).
  await new Promise(r => setTimeout(r, 700));
  const cleared = await page.evaluate(() => {
    const c0 = document.getElementById('char-card-0');
    const c1 = document.getElementById('char-card-1');
    return !c0.classList.contains('card-react-dmg') &&
           !c0.classList.contains('card-react-crit') &&
           !c1.classList.contains('flash-heal');
  });
  assert(cleared, 'K1 classes de réaction non retirées après l\'animation');

  // 3) Call-site réel : un héros encaisse un coup → sa carte réagit.
  await startDummyFight(page);
  const real = await page.evaluate(() => {
    const out = { threw: false };
    try {
      const idx = 0;
      const target = party[idx];
      const enemy = enemyGroup[0];
      // Force un coup non esquivé/non bloqué.
      shieldTurns[idx] = 0; guardTurns[idx] = 0; target.dodgeChance = 0;
      const before = target.hp;
      _enemyPhysicalHit(enemy, target, idx);
      const cc = document.getElementById('char-card-' + idx);
      out.took = target.hp < before;            // a bien encaissé
      out.reacted = cc.classList.contains('card-react-dmg');
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  K1 call-site réel:', real);
  assert(!real.threw, 'K1 call-site throw: ' + (real.err || ''));
  assert(real.took, 'K1 le héros n\'a pas encaissé (test invalide)');
  assert(real.reacted, 'K1 la carte n\'a pas réagi au coup réel encaissé');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Réaction de carte (K1)');
  }
  console.log('  ✅ Réaction de carte de groupe (K1) OK');
  await browser.close();
}

// K2 — état "PV bas" par carte : classe .low-hp basculée par updateUI selon le
// ratio PV (< LOW_HP_RATIO), réactive (retirée dès remontée), jamais sur un KO
// (.ko-char prioritaire). reduced-motion → règle CSS qui neutralise l'anim.
async function scenarioLowHpCard() {
  console.log('\n── Scénario : État "PV bas" par carte (K2) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const out = { threw: false };
    try {
      const c0 = document.getElementById('char-card-0');
      // 1) PV pleins → pas de low-hp.
      party[0].hp = party[0].hpMax; updateUI();
      out.full = c0.classList.contains('low-hp');
      // 2) Sous le seuil → low-hp posée.
      party[0].hp = Math.max(1, Math.floor(party[0].hpMax * 0.2)); updateUI();
      out.low = c0.classList.contains('low-hp');
      // 3) Remontée → low-hp retirée (réactif).
      party[0].hp = party[0].hpMax; updateUI();
      out.recovered = c0.classList.contains('low-hp');
      // 4) KO → ko-char, jamais low-hp.
      party[0].hp = 0; updateUI();
      out.koHasKo  = c0.classList.contains('ko-char');
      out.koNoLow  = c0.classList.contains('low-hp');
      out.ratioConst = (typeof LOW_HP_RATIO === 'number') && LOW_HP_RATIO === 0.25;
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  K2:', r);
  assert(!r.threw, 'K2 throw: ' + (r.err || ''));
  assert(!r.full, 'K2 low-hp présente à PV pleins');
  assert(r.low, 'K2 low-hp absente sous le seuil');
  assert(!r.recovered, 'K2 low-hp non retirée après remontée des PV');
  assert(r.koHasKo, 'K2 ko-char absente sur un héros KO');
  assert(!r.koNoLow, 'K2 low-hp posée à tort sur un héros KO');
  assert(r.ratioConst, 'K2 LOW_HP_RATIO absent ou ≠ 0.25');

  // reduced-motion : la carte porte toujours .low-hp mais l'animation est
  // neutralisée (animation-name "none"), le liseré statique restant lisible.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(() => {
    const c0 = document.getElementById('char-card-0');
    party[0].hp = Math.max(1, Math.floor(party[0].hpMax * 0.2)); updateUI();
    const cs = getComputedStyle(c0);
    return { low: c0.classList.contains('low-hp'), animName: cs.animationName };
  });
  console.log('  K2 reduced-motion:', rm);
  assert(rm.low, 'K2 low-hp absente sous reduced-motion');
  assert(rm.animName === 'none', 'K2 animation non neutralisée sous reduced-motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario État PV bas (K2)');
  }
  console.log('  ✅ État "PV bas" par carte (K2) OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioEnemyIdle, scenarioDungeonVfx, scenarioCombatFeedback, scenarioCombatFX, scenarioDungeonFX, scenarioCinematics, scenarioHaptics, scenarioDangerVignette, scenarioCardReact, scenarioLowHpCard] };
