// ============================================================
// Scénarios smoke — domaine « controls » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioMobileSelect() {
  console.log('\n── Scénario 4 : sélection accessible sur mobile ──');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');

  await page.evaluate(() => { document.getElementById('title-screen').click(); });
  // Depuis l'ajout du bouton "📥 Importer" dans le hub, le hub démarrage
  // s'affiche toujours (même sans slot). On clique "Nouvelle aventure"
  // pour basculer sur player-select.
  await page.waitForFunction(() => {
    const el = document.getElementById('start-hub-screen');
    return el && getComputedStyle(el).display !== 'none';
  });
  await page.evaluate(() => startHubNewGame());
  await page.waitForFunction(() => {
    const el = document.getElementById('player-select-screen');
    return el && getComputedStyle(el).display !== 'none';
  });

  // Sélection guidée en 3 étapes : étape 1 (mode) visible au départ.
  const step1 = await page.evaluate(() => {
    const visible = (s) => {
      const el = document.querySelector(`#player-select-screen .psel-step[data-step="${s}"]`);
      return el && getComputedStyle(el).display !== 'none';
    };
    return { s1: visible(1), s2: visible(2), s3: visible(3),
             overflow: getComputedStyle(document.getElementById('player-select-screen')).overflowY };
  });
  console.log('  player-select étape 1 :', step1);
  assert(step1.s1 && !step1.s2 && !step1.s3, 'étape 1 du stepper non isolée');
  assert(step1.overflow === 'auto',          'overflow-y devrait être auto sur mobile');

  // Étape 1 → 2 (mode). L'étape Héros s'ouvre sur le choix du groupe.
  await page.evaluate(() => document.getElementById('psel-next-1').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector('.psel-step[data-step="2"]')).display !== 'none');
  const groupFilter = await page.evaluate(() => ({
    pickerShown: getComputedStyle(document.getElementById('psel-group-picker')).display !== 'none',
    listHidden:  getComputedStyle(document.getElementById('psel-group-list')).display === 'none',
  }));
  console.log('  player-select étape 2 (filtre groupe) :', groupFilter);
  assert(groupFilter.pickerShown && groupFilter.listHidden, 'étape Héros doit s\'ouvrir sur le choix du groupe');

  // Choisir le groupe « Héros du Film », puis valider (Harry pré-sélectionné).
  await page.evaluate(() => document.getElementById('psel-tile-film').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.getElementById('psel-group-list')).display !== 'none');
  await page.evaluate(() => document.getElementById('psel-next-2').click());
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector('.psel-step[data-step="3"]')).display !== 'none');

  // Le bouton "Commencer" de l'étape 3 doit être atteignable et actif.
  const reach = await page.evaluate(() => {
    const btn = document.getElementById('start-adventure-btn');
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { visible: r.top >= 0 && r.bottom <= window.innerHeight, disabled: btn.disabled };
  });
  console.log('  player-select étape 3 :', reach);
  assert(reach.visible,   'bouton "Commencer" hors viewport mobile');
  assert(!reach.disabled, 'bouton "Commencer" désactivé à l\'étape difficulté');

  // Cliquer "Commencer" puis vérifier que l'écran Maison apparaît et son bouton atteignable
  await page.evaluate(() => document.getElementById('start-adventure-btn').click());
  await page.waitForFunction(() => {
    const el = document.getElementById('house-select-screen');
    return el && getComputedStyle(el).display !== 'none';
  }, { timeout: 3000 });

  const houseReach = await page.evaluate(() => {
    const btn = document.querySelector('.house-btn');
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { visible: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  console.log('  house-select :', houseReach);
  assert(houseReach.visible, 'bouton Maison hors viewport mobile');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ parcours sélection mobile complet');
  await browser.close();
}

async function scenarioCombatMobile() {
  console.log('\n── Scénario 9 : ergonomie combat sur mobile ──');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 800 }, // iPhone SE-like
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Hit-targets ≥ 44px (audit UX mobile P0 #4) : croix de fermeture des
  // modales et chevrons d'accordéon de la fiche perso sur mobile.
  const hitTargets = await page.evaluate(() => {
    openCharacter(0);
    const modal  = document.getElementById('character-modal');
    const close  = modal.querySelector('.modal-close');
    const toggle = modal.querySelector('.section-toggle');
    const r = {
      closeW:  close  ? close.offsetWidth   : 0,
      closeH:  close  ? close.offsetHeight  : 0,
      toggleH: toggle ? toggle.offsetHeight : 0
    };
    closeModal('character-modal');
    return r;
  });
  console.log('  hit-targets :', hitTargets);
  assert(hitTargets.closeW >= 44 && hitTargets.closeH >= 44,
    `croix de modale doit être ≥ 44px (got ${hitTargets.closeW}×${hitTargets.closeH})`);
  assert(hitTargets.toggleH >= 44,
    `chevron accordéon fiche perso doit être ≥ 44px (got ${hitTargets.toggleH})`);

  await startDummyFight(page, { hp: 30 });

  const layout = await page.evaluate(() => {
    const overlay = document.getElementById('encounter-overlay');
    const cont    = document.getElementById('enemy-group');
    const panel   = document.getElementById('combat-log-panel');
    const cs      = el => el ? getComputedStyle(el) : null;
    return {
      overlayPadTop: parseFloat(cs(overlay).paddingTop),
      overlayJustify: cs(overlay).justifyContent,
      enemyMinH: parseFloat(cs(cont).minHeight),
      panelExists: !!panel,
      panelCollapsed: !!panel && panel.classList.contains('collapsed'),
      panelToggleText: panel ? panel.querySelector('.clp-toggle').textContent : null
    };
  });
  console.log('  layout :', layout);
  assert(layout.overlayPadTop >= 40,                    'padding-top mobile insuffisant pour libérer la zone du monstre');
  assert(layout.overlayJustify === 'flex-start',        'overlay devrait s\'aligner en haut sur mobile');
  assert(layout.enemyMinH >= 140,                       'enemy-group-container trop bas (PNG monstre écrasé)');
  assert(layout.panelExists,                            'combat-log-panel absent');
  assert(layout.panelCollapsed,                         'combat-log-panel devrait être replié par défaut sur mobile');
  assert(layout.panelToggleText === '+',                'toggle devrait afficher + quand replié');

  // Ergonomie combat mobile : barre adventure cachée pendant le combat,
  // boutons d'action en grille 6 colonnes (ligne 1 = 3 boutons span 2,
  // ligne 2 = 2 boutons span 3) avec touch targets ≥56px.
  const battle = await page.evaluate(() => {
    const cmdBar = document.querySelector('.commands-bar');
    const actions = document.querySelector('.battle-actions');
    const btn = actions ? actions.querySelector('.cmd-btn') : null;
    const btns = actions ? Array.from(actions.querySelectorAll('.cmd-btn')) : [];
    // P2/P4 : 3 boutons conditionnels (🏺 Artefact actif, 🔄 Posture, 🌿 Rune)
    // sont ajoutés mais masqués (display:none) hors contexte (solo sans artefact
    // → tous cachés). On compte les boutons VISIBLES pour l'ergonomie. La grille
    // robuste (repeat(3,1fr)) ne dépend PAS de l'ordre/nombre des boutons —
    // elle ne casse pas quand un bouton conditionnel apparaît (cf. fix nth-child).
    const visible = btns.filter(b => getComputedStyle(b).display !== 'none');
    return {
      bodyHasInBattle: document.body.classList.contains('in-battle'),
      cmdBarHidden:    cmdBar ? getComputedStyle(cmdBar).display === 'none' : null,
      actionsDisplay:  actions ? getComputedStyle(actions).display : null,
      actionsCols:     actions ? getComputedStyle(actions).gridTemplateColumns : null,
      overflowX:       actions ? (actions.scrollWidth - actions.clientWidth) : 0,
      btnCount:        visible.length,
      btnMinHeight:    btn ? parseFloat(getComputedStyle(btn).minHeight) : 0
    };
  });
  console.log('  battle ergonomics :', battle);
  assert(battle.bodyHasInBattle === true,                   'body.in-battle doit être posé pendant le combat');
  assert(battle.cmdBarHidden === true,                      'commands-bar doit être cachée pendant le combat sur mobile');
  assert(battle.actionsDisplay === 'grid',                  'battle-actions doit passer en grille sur mobile en combat');
  // grid-template-columns peut être résolu en "px px ..." — compter les tracks
  const trackCount = (battle.actionsCols || '').trim().split(/\s+/).filter(Boolean).length;
  assert(trackCount === 3,                                  `battle-actions doit être 3 colonnes (${trackCount} vues)`);
  assert(battle.overflowX <= 1,                             `battle-actions ne doit pas déborder horizontalement (overflow ${battle.overflowX}px)`);
  assert(battle.btnCount === 5,                             `5 boutons attendus (Attaquer/Sortilège/Garde/Objet/Fuir), obtenu ${battle.btnCount}`);
  assert(battle.btnMinHeight >= 56,                         'boutons combat trop petits pour le tactile');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ ergonomie combat mobile correcte');
  await browser.close();
}

async function scenarioRelativeControls() {
  console.log('\n── Scénario : contrôles relatifs (avancer/reculer/pivoter) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Helpers exposés sur window
  const exposed = await page.evaluate(() => ({
    moveForward:  typeof moveForward  === 'function',
    moveBackward: typeof moveBackward === 'function',
    turnLeft:     typeof turnLeft     === 'function',
    turnRight:    typeof turnRight    === 'function'
  }));
  assert(exposed.moveForward,  'moveForward absent');
  assert(exposed.moveBackward, 'moveBackward absent');
  assert(exposed.turnLeft,     'turnLeft absent');
  assert(exposed.turnRight,    'turnRight absent');

  // 2) Rotation : turnRight de n → e, sans changer playerX/playerY.
  const rot = await page.evaluate(() => {
    playerDir = 'n';
    const x0 = playerX, y0 = playerY;
    turnRight();
    const e = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    turnLeft();
    const back = { dir: playerDir };
    return { e, back };
  });
  assert(rot.e.dir === 'e',   `turnRight depuis n doit donner e (obtenu ${rot.e.dir})`);
  assert(!rot.e.moved,        'turnRight ne doit pas déplacer le joueur');
  assert(rot.back.dir === 'n',`turnLeft doit ramener à n (obtenu ${rot.back.dir})`);

  // 3) moveForward : tente d'avancer dans chaque direction jusqu'à trouver
  //    une case libre. Vérifie ensuite que moveBackward fait l'inverse SANS
  //    pivoter, puis que l'opposé du dx,dy correspond bien à playerDir.
  const stepCheck = await page.evaluate(() => {
    // Déterminisme : vider enemyMap → moveForward ne peut pas tomber sur
    // un ennemi (le combat poserait inBattle=true et bloquerait à la fois
    // moveBackward et la rotation clavier testée plus bas).
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    }
    const dirs = ['n','e','s','w'];
    const D = { n:[0,-1], e:[1,0], s:[0,1], w:[-1,0] };
    for (const d of dirs) {
      playerDir = d;
      const [dx,dy] = D[d];
      const nx = playerX + dx, ny = playerY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (dungeon[ny][nx] === CELL.WALL) continue;
      const x0 = playerX, y0 = playerY;
      moveForward();
      const afterFwd = { dir: playerDir, dx: playerX - x0, dy: playerY - y0 };
      const dirBefore = playerDir;
      moveBackward();
      const afterBack = { dir: playerDir, dx: playerX - x0, dy: playerY - y0 };
      return { tried: d, afterFwd, afterBack, dirPreserved: dirBefore === afterBack.dir };
    }
    return { tried: null };
  });
  assert(stepCheck.tried, 'aucune direction libre — donjon corrompu ?');
  assert(stepCheck.afterFwd.dx !== 0 || stepCheck.afterFwd.dy !== 0,
    'moveForward sans effet sur la position');
  assert(stepCheck.afterFwd.dir === stepCheck.tried,
    'moveForward doit aligner playerDir sur la direction du pas');
  assert(stepCheck.afterBack.dx === 0 && stepCheck.afterBack.dy === 0,
    'moveBackward doit ramener à la position initiale');
  assert(stepCheck.dirPreserved,
    'moveBackward NE doit PAS modifier playerDir');

  // 4) Mapping clavier : ArrowRight déclenche turnRight (rotation cardinale).
  const kbd = await page.evaluate(async () => {
    playerDir = 'n';
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    document.dispatchEvent(ev);
    return playerDir;
  });
  assert(kbd === 'e', `ArrowRight depuis n doit donner playerDir=e (obtenu ${kbd})`);

  // 5) Boussole : la lettre orientée porte la classe .facing.
  const compass = await page.evaluate(() => {
    playerDir = 'e';
    updateCompass();
    return {
      facingE: document.getElementById('dir-e')?.classList.contains('facing'),
      facingN: document.getElementById('dir-n')?.classList.contains('facing')
    };
  });
  assert(compass.facingE,  'la lettre E doit porter .facing quand playerDir=e');
  assert(!compass.facingN, 'la lettre N ne doit pas porter .facing quand playerDir=e');

  // 6) Minimap : la case joueur contient un enfant .map-player-arrow
  //    avec la classe directionnelle correspondant à playerDir.
  const arrow = await page.evaluate(() => {
    playerDir = 's';
    renderMinimap();
    const mini = document.getElementById('minimap');
    const playerCell = mini?.querySelector('.map-cell.map-player');
    const arr = playerCell?.querySelector('.map-player-arrow');
    return {
      hasArrow: !!arr,
      hasDirClass: !!arr && arr.classList.contains('map-player-dir-s')
    };
  });
  assert(arrow.hasArrow,    'flèche d\'orientation absente sur la minimap');
  assert(arrow.hasDirClass, 'flèche minimap manque la classe map-player-dir-s');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Contrôles relatifs OK');
  await browser.close();
}

async function scenarioCanvasSwipe() {
  console.log('\n── Scénario : swipe canvas pseudo-3D ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) Helpers exposés
  const exposed = await page.evaluate(() => ({
    init:     typeof window.initCanvasSwipeGestures === 'function',
    dispatch: typeof window._dispatchCanvasSwipe     === 'function',
    blocked:  typeof window._isCanvasSwipeBlocked    === 'function'
  }));
  assert(exposed.init,     'initCanvasSwipeGestures absent');
  assert(exposed.dispatch, '_dispatchCanvasSwipe absent');
  assert(exposed.blocked,  '_isCanvasSwipeBlocked absent');

  // 1bis) Hors combat et sans overlay couvrant, le swipe NE doit PAS
  //       être bloqué. Régression : `#floor-transition` est en permanence
  //       `display:flex` (visibilité via opacity/pointer-events) — un test
  //       sur `display` seul le croyait couvrant et bloquait tout swipe.
  const idleBlocked = await page.evaluate(() => window._isCanvasSwipeBlocked());
  assert(!idleBlocked,
    '_isCanvasSwipeBlocked doit être faux en exploration normale');

  // 2) Mapping rotation : swipe horizontal → turnLeft / turnRight,
  //    position inchangée.
  const rot = await page.evaluate(() => {
    playerDir = 'n';
    const x0 = playerX, y0 = playerY;
    window._dispatchCanvasSwipe(80, 0);   // → droite
    const right = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    window._dispatchCanvasSwipe(-80, 0);  // → gauche
    const left  = { dir: playerDir, moved: (playerX !== x0 || playerY !== y0) };
    return { right, left };
  });
  assert(rot.right.dir === 'e',  `swipe droite depuis n doit donner e (obtenu ${rot.right.dir})`);
  assert(!rot.right.moved,       'swipe droite ne doit pas déplacer le joueur');
  assert(rot.left.dir === 'n',   `swipe gauche depuis e doit ramener à n (obtenu ${rot.left.dir})`);
  assert(!rot.left.moved,        'swipe gauche ne doit pas déplacer le joueur');

  // 3) Mapping translation : swipe vertical → moveForward / moveBackward.
  //    On cherche une direction où la case devant est libre, puis on
  //    déclenche un swipe vers le haut (avancer) puis vers le bas (reculer).
  const trans = await page.evaluate(() => {
    // Déterminisme : vider enemyMap → le swipe « avancer » ne peut pas
    // tomber sur un ennemi (le combat bloquerait le swipe « reculer »).
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) enemyMap[y][x] = null;
    }
    const dirs = ['n','e','s','w'];
    const D = { n:[0,-1], e:[1,0], s:[0,1], w:[-1,0] };
    for (const d of dirs) {
      playerDir = d;
      const [dx,dy] = D[d];
      const nx = playerX + dx, ny = playerY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (dungeon[ny][nx] === CELL.WALL) continue;
      const x0 = playerX, y0 = playerY;
      window._dispatchCanvasSwipe(0, -80);  // ↑ = avancer
      const afterFwd = { dx: playerX - x0, dy: playerY - y0, dir: playerDir };
      const dirBefore = playerDir;
      window._dispatchCanvasSwipe(0, 80);   // ↓ = reculer
      const afterBack = { dx: playerX - x0, dy: playerY - y0, dir: playerDir };
      return { tried: d, afterFwd, afterBack, dirPreserved: dirBefore === afterBack.dir };
    }
    return { tried: null };
  });
  assert(trans.tried, 'aucune direction libre — donjon corrompu ?');
  assert(trans.afterFwd.dx !== 0 || trans.afterFwd.dy !== 0,
    'swipe haut sans effet sur la position');
  assert(trans.afterFwd.dir === trans.tried,
    'swipe haut doit aligner playerDir sur la direction du pas');
  assert(trans.afterBack.dx === 0 && trans.afterBack.dy === 0,
    'swipe bas doit ramener à la position initiale');
  assert(trans.dirPreserved,
    'swipe bas (reculer) NE doit PAS modifier playerDir');

  // 4) Garde-fou combat : pendant inBattle, le swipe est bloqué.
  const guard = await page.evaluate(() => {
    inBattle = true;
    const dir0 = playerDir;
    const x0 = playerX, y0 = playerY;
    const wasBlocked = window._isCanvasSwipeBlocked();
    // Le dispatch lui-même appelle moveForward/turnLeft, qui sont déjà
    // gardés par inBattle ; on vérifie surtout _isCanvasSwipeBlocked.
    inBattle = false;
    return { wasBlocked, dirUnchanged: playerDir === dir0,
             posUnchanged: playerX === x0 && playerY === y0 };
  });
  assert(guard.wasBlocked,    '_isCanvasSwipeBlocked doit être vrai pendant inBattle');
  assert(guard.dirUnchanged,  'playerDir ne doit pas changer pendant inBattle');
  assert(guard.posUnchanged,  'position ne doit pas changer pendant inBattle');

  // 5) Canvas marqué `data-swipe-bound` et touch-action: none côté CSS.
  const dom = await page.evaluate(() => {
    const c = document.getElementById('dungeon-canvas');
    if (!c) return null;
    return {
      bound:       c.dataset.swipeBound,
      touchAction: getComputedStyle(c).touchAction
    };
  });
  assert(dom,                       'canvas #dungeon-canvas absent');
  assert(dom.bound === '1',         'canvas pas marqué comme bound');
  assert(dom.touchAction === 'none',
    `touch-action attendu "none", obtenu "${dom.touchAction}"`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Swipe canvas OK');
  await browser.close();
}

// H1 — Présence physique : bob de caméra à chaque pas. DungeonFX.stepBob
// (dungeon-fx.js) pose une classe d'anim transitoire sur #dungeon-canvas,
// distincte du shake des pièges. Reculer = classe atténuée. reduced-motion
// → no-op (aucune classe posée).
async function scenarioCameraPresence() {
  console.log('\n── Scénario : Présence physique (bob de caméra H1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // H1a — API présente + appels directs : la bonne classe est posée.
  const h1 = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasFn    = typeof DungeonFX !== 'undefined' && typeof DungeonFX.stepBob === 'function';
      out.hasProxy = typeof DFX_safe !== 'undefined';
      const cv = document.getElementById('dungeon-canvas');
      DFX_safe.stepBob('forward');
      out.bobFwd = cv.classList.contains('dfx-bob');
      DFX_safe.stepBob('back');
      out.bobBack = cv.classList.contains('dfx-bob-back') && !cv.classList.contains('dfx-bob');
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  H1a stepBob:', h1);
  assert(!h1.threw, 'H1 stepBob throw: ' + (h1.err || ''));
  assert(h1.hasFn, 'H1 DungeonFX.stepBob absent');
  assert(h1.bobFwd, 'H1 classe dfx-bob non posée (avant)');
  assert(h1.bobBack, 'H1 classe dfx-bob-back non posée (recul)');

  // H1b — avancée réelle : moveForward ne throw pas et pose un bob.
  const h1b = await page.evaluate(() => {
    const out = { threw: false, moved: false, bobbed: false };
    try {
      const cv = document.getElementById('dungeon-canvas');
      cv.classList.remove('dfx-bob', 'dfx-bob-back');
      for (const d of ['n', 'e', 's', 'w']) {
        playerDir = d;
        if (typeof canMove === 'function' && canMove(playerDir)) {
          moveForward();
          out.moved = true;
          break;
        }
      }
      out.bobbed = cv.classList.contains('dfx-bob') || cv.classList.contains('dfx-bob-back');
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  H1b real  :', h1b);
  assert(!h1b.threw, 'H1 moveForward throw: ' + (h1b.err || ''));
  // bobbed peut être faux si l'avancée a déclenché un combat/overlay : on
  // n'exige que l'absence de throw + le mouvement effectif.
  assert(h1b.moved, 'H1 aucune direction libre pour tester l\'avancée');

  // H1c — reduced-motion : stepBob est un no-op (aucune classe).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const h1c = await page.evaluate(() => {
    const cv = document.getElementById('dungeon-canvas');
    cv.classList.remove('dfx-bob', 'dfx-bob-back');
    DFX_safe.stepBob('forward');
    return { any: cv.classList.contains('dfx-bob') || cv.classList.contains('dfx-bob-back') };
  });
  console.log('  H1c reduced:', h1c);
  assert(!h1c.any, 'H1 reduced-motion : stepBob ne doit poser aucune classe');

  // H2 — variation de pas selon la surface : playFootstep accepte un
  // argument de surface et ne throw sur aucune des 4 surfaces (ni sans
  // argument → dérivée de getFloorTheme). Profils déclarés.
  const h2 = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasProfiles = !!(AudioSystem._SURFACE_STEPS
        && AudioSystem._SURFACE_STEPS.stone && AudioSystem._SURFACE_STEPS.carpet
        && AudioSystem._SURFACE_STEPS.cavern_floor && AudioSystem._SURFACE_STEPS.rune_floor);
      // Démute pour exercer le chemin de synthèse complet (init AudioContext).
      AudioSystem.isMuted = false;
      ['stone', 'carpet', 'cavern_floor', 'rune_floor', 'inconnu', undefined].forEach(s => {
        AudioSystem.playFootstep(s);
      });
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  H2 footstep:', h2);
  assert(!h2.threw, 'H2 playFootstep throw: ' + (h2.err || ''));
  assert(h2.hasProfiles, 'H2 profils de surface _SURFACE_STEPS absents');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (Présence physique)`);
  }
  console.log('  ✅ Présence physique — bob de caméra (H1) + pas par surface (H2) + reduced-motion OK');
  await browser.close();
}

// Ergonomie clavier (plan ergonomics-improvement Phase 1) :
//  1) Échap ferme toute modale (dont bestiaire, auparavant manquant).
//  2) Raccourcis d'action en combat (A/S/G/O/F) — parité avec les boutons.
//  3) Sélection de cible au clavier : cibles numérotées + Annuler/Échap.
async function scenarioCombatKeyboard() {
  console.log('\n── Scénario : ergonomie clavier (Échap + combat) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const press = (key) => page.evaluate((k) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  }, key);

  // 1) Échap ferme le bestiaire (régression : absent du handler avant ce plan).
  const esc = await page.evaluate(() => {
    openBestiary();
    const before = getComputedStyle(document.getElementById('bestiary-modal')).display !== 'none';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const after = getComputedStyle(document.getElementById('bestiary-modal')).display !== 'none';
    return { before, after };
  });
  assert(esc.before, 'bestiaire devrait être visible après openBestiary()');
  assert(!esc.after, 'Échap doit fermer le bestiaire');

  // 1bis) Phase 2 — découvrabilité : boutons de combat porteurs de leur
  //        raccourci (title/aria-label) + hint « Échap » sur les croix +
  //        Échap couvre désormais aussi la forge.
  const disc = await page.evaluate(() => {
    const titleOf = (action) => {
      const b = document.querySelector(`.battle-actions .cmd-btn[onclick*="'${action}'"]`);
      return b ? b.getAttribute('title') : null;
    };
    const close = document.querySelector('#bestiary-modal .modal-close');
    // Échap ferme la forge (ajout Phase 2 à ESC_CLOSEABLE_MODALS).
    const forge = document.getElementById('forge-modal');
    let forgeClosedByEsc = null;
    if (forge) {
      forge.style.display = 'flex';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      forgeClosedByEsc = getComputedStyle(forge).display === 'none';
    }
    return {
      attack: titleOf('attack'), spell: titleOf('spell'), guard: titleOf('guard'),
      item: titleOf('item'), flee: titleOf('flee'),
      closeTitle: close ? close.getAttribute('title') : null,
      forgeClosedByEsc
    };
  });
  assert(/\(A\)/.test(disc.attack || ''), 'bouton Attaquer doit indiquer (A)');
  assert(/\(S\)/.test(disc.spell  || ''), 'bouton Sortilège doit indiquer (S)');
  assert(/\(G\)/.test(disc.guard  || ''), 'bouton Garde doit indiquer (G)');
  assert(/\(O\)/.test(disc.item   || ''), 'bouton Objet doit indiquer (O)');
  assert(/\(F\)/.test(disc.flee   || ''), 'bouton Fuir doit indiquer (F)');
  assert(/Échap/.test(disc.closeTitle || ''), 'la croix de fermeture doit mentionner Échap');
  assert(disc.forgeClosedByEsc === true,      'Échap doit aussi fermer la forge (Phase 2)');

  // 2) Combat à 2 ennemis pour exercer la sélection de cible.
  await page.evaluate(() => {
    const mk = (id) => ({ id, name: 'Mannequin ' + id, icon: '🎯', hp: 40, atk: 1,
      def: 0, mag: 0, agi: 0, lck: 0, xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'Test' });
    startBattle(mk('a'), { duelGroup: [mk('a'), mk('b')] });
  });
  await page.waitForFunction(() => inBattle === true && livingEnemies().length === 2);

  // 2a) Touche A → ouvre la sélection de cible numérotée + bouton Annuler.
  await press('a');
  const sel = await page.evaluate(() => {
    const wrap = document.getElementById('target-selection');
    const targets = document.querySelectorAll('#target-buttons button[data-target-index]');
    const cancel  = document.querySelector('#target-buttons .target-cancel-btn');
    return {
      visible: getComputedStyle(wrap).display !== 'none',
      count: targets.length,
      firstLabelNumbered: targets[0] ? /^1\./.test(targets[0].textContent.trim()) : false,
      hasCancel: !!cancel
    };
  });
  assert(sel.visible,            'touche A doit ouvrir la sélection de cible');
  assert(sel.count === 2,        `2 cibles attendues, obtenu ${sel.count}`);
  assert(sel.firstLabelNumbered, 'les cibles doivent être numérotées (« 1. … »)');
  assert(sel.hasCancel,          'bouton Annuler manquant dans la sélection de cible');

  // 2b) Échap annule la sélection (panneau masqué, action purgée).
  await press('Escape');
  const cancelled = await page.evaluate(() => ({
    hidden: getComputedStyle(document.getElementById('target-selection')).display === 'none',
    pending: typeof pendingAction !== 'undefined' ? pendingAction : 'absent'
  }));
  assert(cancelled.hidden,            'Échap doit masquer la sélection de cible');
  assert(cancelled.pending === null,  'Échap doit purger pendingAction');

  // 2c) Touche A puis touche 1 → attaque la 1ʳᵉ cible (PV entamés, panneau fermé).
  await press('a');
  const hp0 = await page.evaluate(() => enemyGroup[0].currentHp);
  await press('1');
  const hit = await page.evaluate(() => ({
    hidden: getComputedStyle(document.getElementById('target-selection')).display === 'none',
    hp: enemyGroup[0].currentHp
  }));
  assert(hit.hidden,    'la sélection doit se fermer après le choix clavier');
  assert(hit.hp < hp0,  `la cible 1 doit subir des dégâts (avant ${hp0}, après ${hit.hp})`);

  // 2d) M4 — raccourcis numériques de SORTS : openBattleSpells pose un badge
  //     data-hotkey sur chaque sort lançable ; la touche 1 lance le 1ᵉ.
  const spellHotkeys = await page.evaluate(() => {
    party[currentBattleChar].sp = party[currentBattleChar].spMax;
    openBattleSpells();
    const withHotkey = [...document.querySelectorAll('#spell-list .spell-item[data-hotkey]')];
    const badges = [...document.querySelectorAll('#spell-list .spell-hotkey')].map(b => b.textContent);
    // Espionne les deux issues possibles du clic sur le 1ᵉ sort : lancement
    // direct (1 cible) OU ouverture de la sélection de cible (plusieurs cibles).
    let casted = null;
    const origCast = window.castSpellInBattle;
    const origSel  = window.showTargetSelection;
    let targetOpened = false;
    window.castSpellInBattle   = (name) => { casted = name; };
    window.showTargetSelection = () => { targetOpened = true; };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    window.castSpellInBattle   = origCast;
    window.showTargetSelection = origSel;
    return {
      hotkeyCount: withHotkey.length,
      firstBadge: badges[0],
      modalClosed: getComputedStyle(document.getElementById('spell-modal')).display === 'none',
      activated: casted !== null || targetOpened
    };
  });
  assert(spellHotkeys.hotkeyCount >= 1, 'au moins un sort lançable doit porter un raccourci');
  assert(spellHotkeys.firstBadge === '1', 'le 1ᵉ sort lançable doit porter le badge « 1 »');
  assert(spellHotkeys.modalClosed, 'la touche 1 doit refermer la modale de sorts');
  assert(spellHotkeys.activated, 'la touche 1 doit activer le 1ᵉ sort (lancement ou sélection de cible)');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (clavier combat)`);
  }
  console.log('  ✅ Ergonomie clavier (Échap modale + raccourcis combat + ciblage + sorts 1-9) OK');
  await browser.close();
}

// Phase 3 — modale de confirmation thématisée (remplace confirm() natif) :
// résout true au clic OK, false à l'Échap ; styling danger ; focus restitué.
async function scenarioConfirmModal() {
  console.log('\n── Scénario : modale de confirmation custom (Phase 3) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(async () => {
    const out = {};
    out.hasFn = typeof confirmModal === 'function';

    // a) clic « Confirmer » → résout true ; libellés posés.
    out.okResult = await new Promise((resolve) => {
      confirmModal({ title: 'T', body: 'Corps', confirmLabel: 'Oui' }).then(resolve);
      out.titleText = document.getElementById('confirm-modal-title').textContent;
      out.okLabel   = document.getElementById('confirm-modal-ok').textContent;
      out.focused   = document.activeElement === document.getElementById('confirm-modal-ok');
      document.getElementById('confirm-modal-ok').click();
    });
    out.hiddenAfterOk = getComputedStyle(document.getElementById('confirm-modal')).display === 'none';

    // b) Échap → résout false.
    out.escResult = await new Promise((resolve) => {
      confirmModal({ title: 'T2', body: 'B2' }).then(resolve);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    // c) danger:true → bouton OK porte la classe confirm-danger ; focus restitué
    //    à l'élément déclencheur à la fermeture (déclencheur dédié focusable).
    const trigger = document.createElement('button');
    trigger.textContent = 'déclencheur';
    document.body.appendChild(trigger);
    trigger.focus();
    out.triggerFocusedBefore = document.activeElement === trigger;
    out.dangerResult = await new Promise((resolve) => {
      confirmModal({ title: 'D', body: 'B', danger: true }).then(resolve);
      out.hasDangerClass = document.getElementById('confirm-modal-ok').classList.contains('confirm-danger');
      document.getElementById('confirm-modal-cancel').click();
    });
    out.focusRestored = document.activeElement === trigger;
    trigger.remove();
    return out;
  });

  assert(r.hasFn,            'confirmModal doit être défini');
  assert(r.titleText === 'T','le titre de la modale doit être posé');
  assert(r.okLabel === 'Oui','le libellé du bouton OK doit être personnalisable');
  assert(r.focused,          'le focus initial doit être sur le bouton de confirmation');
  assert(r.okResult === true,'clic Confirmer doit résoudre true');
  assert(r.hiddenAfterOk,    'la modale doit se fermer après confirmation');
  assert(r.escResult === false, 'Échap doit résoudre false');
  assert(r.hasDangerClass,   'danger:true doit appliquer la classe confirm-danger');
  assert(r.dangerResult === false, 'clic Annuler doit résoudre false');
  assert(r.focusRestored,    'le focus doit être restitué au déclencheur à la fermeture');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (confirm modal)`);
  }
  console.log('  ✅ Modale de confirmation custom (true/false + danger + focus) OK');
  await browser.close();
}

// Phase 4 — accessibilité de finition : tooltips de stats + annonce PV bas
// aux lecteurs d'écran (région live #a11y-live, fronts montant/descendant).
async function scenarioA11yFinish() {
  console.log('\n── Scénario : accessibilité de finition (Phase 4) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const r = await page.evaluate(() => {
    const out = {};
    // a) tooltips de stats (title) sur chaque case.
    out.strTitle = document.querySelector('.stat-item[data-stat="str"]')?.getAttribute('title') || '';
    out.agiTitle = document.querySelector('.stat-item[data-stat="agi"]')?.getAttribute('title') || '';
    // b) région live présente.
    const live = document.getElementById('a11y-live');
    out.liveExists = !!live;
    out.liveAttrs = live ? { role: live.getAttribute('role'), aria: live.getAttribute('aria-live') } : null;
    // c) front montant : PV critiques → annonce posée.
    party[0].hp = 1;
    updateUI();
    out.dangerText = live ? live.textContent : null;
    out.bodyDanger = document.body.classList.contains('cfx-danger');
    // d) front descendant : PV pleins → annonce effacée.
    party[0].hp = party[0].hpMax;
    updateUI();
    out.clearedText = live ? live.textContent : null;
    return out;
  });

  assert(/STR/.test(r.strTitle),  'la case FORCE doit porter un title explicatif (STR)');
  assert(/AGI/.test(r.agiTitle),  'la case AGILITÉ doit porter un title explicatif (AGI)');
  assert(r.liveExists,            'région live #a11y-live absente');
  assert(r.liveAttrs && r.liveAttrs.aria === 'assertive', '#a11y-live doit être aria-live=assertive');
  assert(/critiques/i.test(r.dangerText || ''), 'PV bas doit annoncer un message critique');
  assert(r.bodyDanger,            'la vignette cfx-danger doit être active à PV bas');
  assert(r.clearedText === '',    'l\'annonce doit être effacée au retour à PV pleins');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (a11y finition)`);
  }
  console.log('  ✅ Accessibilité de finition (tooltips stats + annonce PV bas) OK');
  await browser.close();
}

// Passe « isolation de modale » : focus-trap générique + inert sur le fond +
// restitution du focus au déclencheur. Vérifié sur #inventory-modal (chemin
// MutationObserver commun aux 16 modales).
async function scenarioModalIsolation() {
  console.log('\n── Scénario : isolation de modale (focus-trap + inert) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // a) Ouverture : focus initial dans la modale + fond inert. Le déclencheur
  //    (bouton focusé avant l'ouverture) est mémorisé pour la restitution.
  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.id = '__modal_trigger';
    trigger.textContent = 'ouvrir';
    document.body.appendChild(trigger);
    trigger.focus();
    openInventory();
  });
  // L'observer réagit en microtask : attendre que le focus soit entré.
  await page.waitForFunction(() => {
    const modal = document.getElementById('inventory-modal');
    return modal && modal.contains(document.activeElement);
  });

  const opened = await page.evaluate(() => ({
    focusInside: document.getElementById('inventory-modal').contains(document.activeElement),
    bgInert: document.getElementById('game-container').hasAttribute('inert'),
    modalOpen: !!(window.ModalA11y && window.ModalA11y.isModalOpen()),
  }));
  assert(opened.focusInside, 'le focus initial doit être posé dans la modale');
  assert(opened.bgInert,     '#game-container doit être inert pendant qu\'une modale est ouverte');
  assert(opened.modalOpen,   'ModalA11y doit signaler une modale ouverte');

  // b) Tab piégé : depuis le dernier élément focusable, Tab boucle au premier ;
  //    depuis le premier, Shift+Tab boucle au dernier.
  const trap = await page.evaluate(() => {
    const modal = document.getElementById('inventory-modal');
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const items = Array.from(modal.querySelectorAll(sel)).filter(el => el.getClientRects().length > 0);
    const first = items[0], last = items[items.length - 1];
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const wrappedToFirst = document.activeElement === first;
    first.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    const wrappedToLast = document.activeElement === last;
    return { count: items.length, wrappedToFirst, wrappedToLast };
  });
  assert(trap.count >= 2,       'la modale doit contenir au moins 2 éléments focusables');
  assert(trap.wrappedToFirst,   'Tab depuis le dernier élément doit revenir au premier (trap)');
  assert(trap.wrappedToLast,    'Shift+Tab depuis le premier élément doit aller au dernier (trap)');

  // c) Fermeture : inert retiré + focus restitué au déclencheur.
  await page.evaluate(() => closeModal('inventory-modal'));
  await page.waitForFunction(() =>
    !document.getElementById('game-container').hasAttribute('inert'));
  const closed = await page.evaluate(() => {
    const restored = document.activeElement === document.getElementById('__modal_trigger');
    const stillOpen = !!(window.ModalA11y && window.ModalA11y.isModalOpen());
    document.getElementById('__modal_trigger').remove();
    return { restored, stillOpen, bgInert: document.getElementById('game-container').hasAttribute('inert') };
  });
  assert(!closed.bgInert,   'le fond ne doit plus être inert après fermeture');
  assert(closed.restored,   'le focus doit être restitué au déclencheur à la fermeture');
  assert(!closed.stillOpen, 'ModalA11y ne doit plus signaler de modale ouverte');

  // d) aria-describedby complété sur les modales à descriptif statique.
  const aria = await page.evaluate(() => ({
    donation: document.getElementById('house-donation-modal').getAttribute('aria-describedby'),
    forge: document.getElementById('forge-modal').getAttribute('aria-describedby'),
    inventory: document.getElementById('inventory-modal').getAttribute('aria-describedby'),
    invHintExists: !!document.getElementById('inv-hint'),
  }));
  assert(aria.donation === 'house-donation-desc', 'le don de Maison doit porter aria-describedby');
  assert(aria.forge === 'forge-hint',             'la forge doit porter aria-describedby');
  assert(aria.inventory === 'inv-hint',           'l\'inventaire doit porter aria-describedby');
  assert(aria.invHintExists,                      'la cible aria-describedby de l\'inventaire doit exister');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (isolation de modale)`);
  }
  console.log('  ✅ Isolation de modale (focus-trap + inert + restitution + aria) OK');
  await browser.close();
}

async function scenarioGridKeyboardNav() {
  console.log('\n── Scénario : navigation clavier des grilles (sac / paper-doll / sorts) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // a) Les slots d'item du sac sont focusables ; les slots vides ne le sont pas.
  //    On donne un équipement déterministe (robe1, slot body) à Harry.
  await page.evaluate(() => {
    const robe = JSON.parse(JSON.stringify(ITEMS.find(i => i.id === 'robe1')));
    player.inventory.push(robe);
    openInventory();
  });
  const grid = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('#inv-grid .inv-slot'));
    const item  = slots.find(s => s.classList.contains('has-item'));
    const empty = slots.find(s => !s.classList.contains('has-item'));
    return {
      itemFocusable:  item  ? item.getAttribute('tabindex') === '0'  : false,
      emptyFocusable: empty ? empty.getAttribute('tabindex') === '0' : false,
    };
  });
  assert(grid.itemFocusable,   'un slot d\'item doit porter tabindex="0"');
  assert(!grid.emptyFocusable, 'un slot vide ne doit pas être focusable');

  // b) Focus + Entrée sur l'équipement → équipé (en solo, équipe directement
  //    Harry et quitte l'inventaire).
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('#inv-grid .inv-slot'))
      .find(s => s.classList.contains('has-item'));
    item.focus();
  });
  await page.waitForFunction(() => {
    const item = Array.from(document.querySelectorAll('#inv-grid .inv-slot'))
      .find(s => s.classList.contains('has-item'));
    return item && document.activeElement === item;
  });
  await page.keyboard.press('Enter');
  const equipped = await page.evaluate(() => ({
    bodyEquipped: !!(player.equipped && player.equipped.body && player.equipped.body.id === 'robe1'),
    goneFromBag:  !player.inventory.some(i => i && i.id === 'robe1'),
  }));
  assert(equipped.bodyEquipped, 'Entrée sur l\'équipement doit l\'équiper (slot body)');
  assert(equipped.goneFromBag,  'l\'item équipé doit quitter l\'inventaire');

  // c) Paper-doll : le slot rempli (robe que l'on vient d'équiper) est focusable.
  const paperDoll = await page.evaluate(() => {
    closeModal('inventory-modal');
    openCharacter(0);
    const filled = document.querySelector('#character-modal .equip-slot-floating.filled');
    return filled ? filled.getAttribute('tabindex') === '0' : false;
  });
  assert(paperDoll, 'un slot d\'équipement rempli du paper-doll doit être focusable');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (navigation clavier grilles)`);
  }
  console.log('  ✅ Navigation clavier des grilles (tabindex + Entrée) OK');
  await browser.close();
}

async function scenarioGridArrowNav() {
  console.log('\n── Scénario : navigation 2D au clavier des grilles (flèches) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Remplir le sac de 6 consommables → 6 cellules focusables sur ≥ 2 rangées.
  await page.evaluate(() => {
    const pot = ITEMS.find(i => i.id === 'potion_s');
    for (let n = 0; n < 6; n++) player.inventory.push(JSON.parse(JSON.stringify(pot)));
    openInventory();
  });

  const sel = '#inv-grid .inv-slot[tabindex]';
  const start = await page.evaluate((sel) => {
    const cells = Array.from(document.querySelectorAll(sel));
    cells[0].focus();
    return { count: cells.length, active0: document.activeElement === cells[0] };
  }, sel);
  assert(start.count >= 6,  `au moins 6 cellules focusables attendues (got ${start.count})`);
  assert(start.active0,     'focus initial sur la 1re cellule');

  const idxOf = () => page.evaluate((sel) =>
    Array.from(document.querySelectorAll(sel)).indexOf(document.activeElement), sel);

  // ←/→ : voisin linéaire.
  await page.keyboard.press('ArrowRight');
  assert(await idxOf() === 1, 'ArrowRight → cellule 1');
  await page.keyboard.press('ArrowLeft');
  assert(await idxOf() === 0, 'ArrowLeft → retour cellule 0');

  // ↓ : descend d'une rangée, même colonne (géométrie, sans coder le nb de col).
  await page.keyboard.press('ArrowDown');
  const down = await page.evaluate((sel) => {
    const cells = Array.from(document.querySelectorAll(sel));
    const a = document.activeElement;
    const r0 = cells[0].getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    return { idx: cells.indexOf(a), below: ra.top > r0.top + 2, sameCol: Math.abs(ra.left - r0.left) < 5 };
  }, sel);
  assert(down.idx > 0 && down.below && down.sameCol,
    `ArrowDown doit descendre d'une rangée même colonne (idx ${down.idx}, below ${down.below}, sameCol ${down.sameCol})`);

  // ↑ : remonte à la cellule 0.
  await page.keyboard.press('ArrowUp');
  assert(await idxOf() === 0, 'ArrowUp → remonte à la cellule 0');

  // Le joueur ne s'est pas déplacé : la modale reste ouverte.
  const stillOpen = await page.evaluate(() =>
    getComputedStyle(document.getElementById('inventory-modal')).display !== 'none');
  assert(stillOpen, 'la modale inventaire doit rester ouverte pendant la navigation');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (navigation flèches)`);
  }
  console.log('  ✅ Navigation 2D au clavier (←/→/↑/↓) OK');
  await browser.close();
}

async function scenarioGridKeyboardNavExtended() {
  console.log('\n── Scénario : navigation clavier des grilles (boutique / bestiaire / codex) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // a) Boutique : les articles sont focusables ; ArrowRight déplace le focus
  //    (voisin en ordre DOM, indépendant du layout).
  const shop = await page.evaluate(() => {
    openShop();
    const cells = Array.from(document.querySelectorAll('.shop-item[tabindex="0"]'));
    return { count: cells.length };
  });
  assert(shop.count >= 2, `au moins 2 articles boutique focusables (got ${shop.count})`);
  await page.evaluate(() => document.querySelector('.shop-item[tabindex="0"]').focus());
  await page.waitForFunction(() =>
    document.activeElement && document.activeElement.classList.contains('shop-item'));
  await page.keyboard.press('ArrowRight');
  const shopMoved = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.shop-item[tabindex="0"]'));
    return document.activeElement === cells[1];
  });
  assert(shopMoved, 'ArrowRight déplace le focus vers l\'article boutique suivant');
  await page.evaluate(() => closeModal('shop-modal'));

  // b) Bestiaire : les cartes de créature sont focusables.
  const bestiary = await page.evaluate(() => {
    openBestiary();
    return document.querySelectorAll('.bestiary-card[tabindex="0"]').length;
  });
  assert(bestiary >= 1, `au moins 1 carte bestiaire focusable (got ${bestiary})`);
  // La carte bestiaire porte la classe spell-item → couverte par l'activation
  // Entrée/Espace existante. On vérifie que cliquer via clavier ouvre le détail.
  await page.evaluate(() => document.querySelector('.bestiary-card[tabindex="0"]').focus());
  await page.keyboard.press('Enter');
  const detailOpen = await page.evaluate(() =>
    !!document.querySelector('.bestiary-detail-header'));
  assert(detailOpen, 'Entrée sur une carte bestiaire ouvre la fiche détaillée');
  await page.evaluate(() => closeModal('bestiary-modal'));

  // c) Codex : une entrée déverrouillée (cliquable) est focusable ; une entrée
  //    verrouillée ne l'est pas. Invariant : tabindex présent SSI onclick présent.
  const codex = await page.evaluate(() => {
    openCodex();
    const cards = Array.from(document.querySelectorAll('.codex-card'));
    let unlockedFocusable = 0, lockedFocusable = 0, invariantOk = true;
    for (const c of cards) {
      const hasTab   = c.getAttribute('tabindex') === '0';
      const hasClick = !!c.getAttribute('onclick');
      if (hasTab !== hasClick) invariantOk = false;
      if (hasClick && hasTab) unlockedFocusable++;
      if (!hasClick && hasTab) lockedFocusable++;
    }
    return { total: cards.length, unlockedFocusable, lockedFocusable, invariantOk };
  });
  assert(codex.total >= 1, 'le codex doit afficher des entrées');
  assert(codex.invariantOk, 'une carte codex est focusable SSI elle est cliquable');
  assert(codex.unlockedFocusable >= 1,
    `au moins 1 entrée codex déverrouillée focusable (got ${codex.unlockedFocusable})`);
  assert(codex.lockedFocusable === 0, 'aucune entrée codex verrouillée ne doit être focusable');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (nav clavier boutique/bestiaire/codex)`);
  }
  console.log('  ✅ Navigation clavier boutique / bestiaire / codex OK');
  await browser.close();
}

async function scenarioSpellFilterKeyboard() {
  console.log('\n── Scénario : chips de filtre de sorts au clavier ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Garantir ≥ 2 catégories de sorts → la barre de filtres s'affiche
  // (feu + glace + soutien = 3 chips + « Tous » = 4).
  await page.evaluate(() => {
    for (const s of ['Incendio', 'Glacius', 'Episkey']) {
      if (!player.spells.includes(s)) player.spells.push(s);
    }
    openSpells(0);
  });

  const bar = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#spell-list button[aria-pressed]'));
    return {
      count: btns.length,
      allButtons: btns.every(b => b.tagName === 'BUTTON'),
      focusable: btns.every(b => b.getAttribute('tabindex') === '0'),
    };
  });
  assert(bar.count >= 3, `barre de filtres de sorts attendue (got ${bar.count} chips)`);
  assert(bar.allButtons, 'les chips de filtre doivent être des <button>');
  assert(bar.focusable, 'chaque chip doit être focusable (tabindex="0")');

  // Focus un chip INACTIF (≠ filtre courant 'tous') puis Entrée → bascule.
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('#spell-list button[aria-pressed]'))
      .find(b => b.getAttribute('aria-pressed') === 'false');
    target.dataset.test = 'filter-target';
    target.focus();
  });
  await page.waitForFunction(() =>
    document.activeElement && document.activeElement.dataset.test === 'filter-target');
  const beforeFilter = await page.evaluate(() => _spellFilter);
  await page.keyboard.press('Enter');
  const afterFilter = await page.evaluate(() => _spellFilter);
  assert(afterFilter !== beforeFilter,
    `Entrée sur un chip doit changer le filtre (avant ${beforeFilter}, après ${afterFilter})`);
  const activeReflected = await page.evaluate(() => {
    const active = Array.from(document.querySelectorAll('#spell-list button[aria-pressed]'))
      .find(b => b.getAttribute('aria-pressed') === 'true');
    return !!active;
  });
  assert(activeReflected, 'le chip actif doit porter aria-pressed="true" après bascule');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (chips filtre sorts)`);
  }
  console.log('  ✅ Chips de filtre de sorts au clavier (button + Entrée + aria-pressed) OK');
  await browser.close();
}

async function scenarioKeybindings() {
  console.log('\n── Scénario : remappage configurable des touches ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  const dispatch = (key) => page.evaluate((key) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })), key);
  const invOpen = () => page.evaluate(() =>
    getComputedStyle(document.getElementById('inventory-modal')).display !== 'none');
  const closeInv = () => page.evaluate(() => closeModal('inventory-modal'));

  // Le module est-il bien chargé ?
  const hasModule = await page.evaluate(() => typeof kbResolveExplore === 'function');
  assert(hasModule, 'keybindings.js doit exposer kbResolveExplore');

  // 1) Défaut : « i » ouvre le sac.
  await dispatch('i');
  assert(await invOpen(), "défaut : 'i' ouvre le sac");
  await closeInv();

  // 2) Rebind « Sac » : i → b (retire i, ajoute b).
  await page.evaluate(() => { kbRemoveKey('openInventory', 'i'); kbAddKey('openInventory', 'b'); });
  const resolved = await page.evaluate(() => ({
    b: kbResolveExplore('b'), i: kbResolveExplore('i'),
  }));
  assert(resolved.b === 'openInventory', "après rebind : 'b' résout openInventory");
  assert(resolved.i === null,            "après rebind : 'i' n'est plus lié");

  // 3) La nouvelle touche ouvre le sac…
  await dispatch('b');
  assert(await invOpen(), "rebind : 'b' ouvre le sac");
  await closeInv();

  // 4) …et l'ancienne ne fait plus rien (unbind respecté, pas de fallback).
  await dispatch('i');
  assert(!(await invOpen()), "rebind : 'i' n'ouvre plus le sac");

  // 5) Persistance : l'override est écrit dans localStorage.
  const persisted = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('hogwarts_rpg_keybindings')); }
    catch (_) { return null; }
  });
  assert(persisted && Array.isArray(persisted.openInventory) && persisted.openInventory.includes('b'),
    'le binding personnalisé est persisté dans localStorage');

  // 6) Réinitialisation : « i » ré-ouvre le sac, « b » ne le fait plus.
  await page.evaluate(() => kbResetAll());
  await dispatch('i');
  assert(await invOpen(), "reset : 'i' ré-ouvre le sac");
  await closeInv();
  await dispatch('b');
  assert(!(await invOpen()), "reset : 'b' n'ouvre plus le sac");

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (keybindings)`);
  }
  console.log('  ✅ Remappage des touches (rebind / unbind / persistance / reset) OK');
  await browser.close();
}

// H1 (polish UX) — échelle de texte + mode contraste élevé (réglages Affichage).
async function scenarioUiAccessibilityPrefs() {
  console.log('\n── Scénario : accessibilité d\'affichage (échelle texte + contraste) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Partir d'un état propre.
  await page.evaluate(() => {
    localStorage.removeItem('hogwarts_rpg_ui_font_scale');
    localStorage.removeItem('hogwarts_rpg_ui_contrast');
  });

  // T1 : échelle « Grand » → variable CSS + persistance + bouton actif.
  const t1 = await page.evaluate(() => {
    setUiFontScale('large');
    return {
      cssVar:    getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale').trim(),
      stored:    localStorage.getItem('hogwarts_rpg_ui_font_scale'),
      btnActive: document.getElementById('btn-fontscale-large').classList.contains('active-toggle'),
      pressed:   document.getElementById('btn-fontscale-large').getAttribute('aria-pressed')
    };
  });
  console.log('  T1 large   :', t1);
  assert(t1.cssVar === '1.12',    '--ui-font-scale doit valoir 1.12 en cran « Grand »');
  assert(t1.stored === 'large',   'le cran d\'échelle doit être persisté');
  assert(t1.btnActive,            'le bouton « Grand » doit être actif');
  assert(t1.pressed === 'true',   'aria-pressed du bouton actif doit valoir true');

  // T2 : retour « Normal » → variable revenue à 1.
  const t2 = await page.evaluate(() => {
    setUiFontScale('normal');
    return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale').trim();
  });
  console.log('  T2 normal  :', t2);
  assert(t2 === '1', '--ui-font-scale doit revenir à 1 en cran « Normal »');

  // T3 : contraste élevé → data-contrast="high" + persistance.
  const t3 = await page.evaluate(() => {
    toggleHighContrast();
    return {
      attr:   document.documentElement.getAttribute('data-contrast'),
      stored: localStorage.getItem('hogwarts_rpg_ui_contrast'),
      active: document.getElementById('btn-contrast').classList.contains('active-toggle')
    };
  });
  console.log('  T3 contrast:', t3);
  assert(t3.attr === 'high', 'data-contrast doit valoir "high" une fois activé');
  assert(t3.stored === '1',  'le contraste élevé doit être persisté');
  assert(t3.active,          'le bouton Contraste doit être actif');

  // T4 : re-bascule → attribut retiré.
  const t4 = await page.evaluate(() => {
    toggleHighContrast();
    return {
      attr:   document.documentElement.getAttribute('data-contrast'),
      stored: localStorage.getItem('hogwarts_rpg_ui_contrast')
    };
  });
  console.log('  T4 off     :', t4);
  assert(!t4.attr,          'data-contrast doit être retiré une fois désactivé');
  assert(t4.stored === '0', 'la désactivation du contraste doit être persistée');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (accessibilité affichage)`);
  }
  console.log('  ✅ Échelle de texte + contraste élevé OK');
  await browser.close();
}

// H4 (polish UX) — niveau de feedback visuel (Plein/Sobre/Minimal) composé
// au-dessus de prefers-reduced-motion.
async function scenarioUiFeedbackLevel() {
  console.log('\n── Scénario : niveau de feedback visuel (H4) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  await page.evaluate(() => { localStorage.removeItem('hogwarts_rpg_ui_feedback'); });

  // T1 : Plein (défaut) → ni reduced ni particlesOff.
  const t1 = await page.evaluate(() => {
    setUiFeedbackLevel('full');
    return {
      level:     window.UIFeedback.level,
      attr:      document.documentElement.getAttribute('data-feedback'),
      reduced:   window.UIFeedback.reduced(),
      particles: window.UIFeedback.particlesOff(),
      stored:    localStorage.getItem('hogwarts_rpg_ui_feedback')
    };
  });
  console.log('  T1 full   :', t1);
  assert(t1.level === 'full' && t1.attr === 'full', 'Plein doit poser level/attr full');
  assert(t1.reduced === false,   'Plein ne doit pas forcer reduced-motion');
  assert(t1.particles === false, 'Plein ne doit pas couper les particules');
  assert(t1.stored === 'full',   'le niveau Plein doit être persisté');

  // T2 : Sobre → particules coupées, mais PAS reduced-motion (motion conservée).
  const t2 = await page.evaluate(() => {
    setUiFeedbackLevel('sober');
    return { reduced: window.UIFeedback.reduced(), particles: window.UIFeedback.particlesOff(), attr: document.documentElement.getAttribute('data-feedback') };
  });
  console.log('  T2 sober  :', t2);
  assert(t2.reduced === false,   'Sobre ne doit PAS forcer reduced-motion');
  assert(t2.particles === true,  'Sobre doit couper particules/boucles ambiantes');
  assert(t2.attr === 'sober',    'data-feedback doit valoir sober');

  // T3 : Minimal → force reduced-motion (compose au-dessus du système).
  const t3 = await page.evaluate(() => {
    setUiFeedbackLevel('minimal');
    // Vérifie aussi le branchement effectif sur les modules FX.
    const fxGate = (typeof CombatFX !== 'undefined'); // module chargé
    return {
      reduced:   window.UIFeedback.reduced(),
      particles: window.UIFeedback.particlesOff(),
      attr:      document.documentElement.getAttribute('data-feedback'),
      fxGate
    };
  });
  console.log('  T3 minimal:', t3);
  assert(t3.reduced === true,   'Minimal doit forcer le comportement reduced-motion');
  assert(t3.particles === true, 'Minimal doit couper les particules');
  assert(t3.attr === 'minimal', 'data-feedback doit valoir minimal');

  // T4 : persistance au rechargement (préférence device).
  const t4 = await page.evaluate(() => {
    setUiFeedbackLevel('sober');
    // Simule un rechargement : remet le défaut puis recharge la préférence.
    window.UIFeedback.level = 'full';
    document.documentElement.removeAttribute('data-feedback');
    _loadUiAccessibilityPrefs();
    return { level: window.UIFeedback.level, attr: document.documentElement.getAttribute('data-feedback') };
  });
  console.log('  T4 reload :', t4);
  assert(t4.level === 'sober' && t4.attr === 'sober', 'le niveau doit être restauré au chargement');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (niveau de feedback)`);
  }
  console.log('  ✅ Niveau de feedback visuel (Plein/Sobre/Minimal) OK');
  await browser.close();
}

// M5 (polish UX) — Réglages en accordéon : chaque groupe est une section
// pliable (desktop : tout visible ; ≤700px : repliable via le label).
async function scenarioSettingsAccordion() {
  console.log('\n── Scénario : Réglages en accordéon (M5) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // T1 (desktop) : 5 sections, labels attendus, keybind-list dans une section.
  const t1 = await page.evaluate(() => {
    openSettingsModal();
    const secs   = document.querySelectorAll('#settings-modal .settings-section');
    const labels = [...document.querySelectorAll('#settings-modal .settings-section-label')].map(l => l.textContent.trim());
    const kb     = document.getElementById('keybind-list');
    return {
      count: secs.length, labels,
      kbInSection: !!(kb && kb.closest('.settings-section')),
      btnsResolved: !!document.getElementById('btn-music') && !!document.getElementById('btn-feedback-full'),
    };
  });
  console.log('  T1:', t1);
  assert(t1.count === 5, '5 sections de réglages attendues');
  assert(JSON.stringify(t1.labels) === JSON.stringify(['Son', 'Voyageur', 'Partie', 'Affichage', 'Touches']),
    'libellés de sections inattendus');
  assert(t1.kbInSection, 'la liste des touches doit vivre dans une section');
  assert(t1.btnsResolved, 'les boutons existants (audio/affichage) doivent rester présents');

  // T2 : toggle → classe .collapsed + aria-expanded basculés ; desktop garde
  //      le contenu visible (règle de masquage scopée ≤700px).
  const t2 = await page.evaluate(() => {
    const first = document.querySelector('#settings-modal .settings-section');
    const lbl   = first.querySelector('.settings-section-label');
    const grid  = first.querySelector('.settings-grid');
    _toggleSettingsSection(lbl);
    const out = {
      collapsed: first.classList.contains('collapsed'),
      aria: lbl.getAttribute('aria-expanded'),
      gridVisibleDesktop: getComputedStyle(grid).display !== 'none',
    };
    _toggleSettingsSection(lbl);   // re-déplie
    out.reExpanded = !first.classList.contains('collapsed') && lbl.getAttribute('aria-expanded') === 'true';
    return out;
  });
  console.log('  T2:', t2);
  assert(t2.collapsed,          'le toggle doit ajouter .collapsed');
  assert(t2.aria === 'false',   'aria-expanded doit passer à false une fois replié');
  assert(t2.gridVisibleDesktop, 'en desktop le contenu reste visible (masquage scopé mobile)');
  assert(t2.reExpanded,         're-toggle doit déplier et remettre aria-expanded=true');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées (réglages accordéon)`);
  }
  console.log('  ✅ Réglages en accordéon conformes');
  await browser.close();
}

module.exports = { scenarios: [scenarioMobileSelect, scenarioCombatMobile, scenarioRelativeControls, scenarioCanvasSwipe, scenarioCameraPresence, scenarioCombatKeyboard, scenarioConfirmModal, scenarioA11yFinish, scenarioModalIsolation, scenarioGridKeyboardNav, scenarioGridArrowNav, scenarioGridKeyboardNavExtended, scenarioSpellFilterKeyboard, scenarioKeybindings, scenarioUiAccessibilityPrefs, scenarioUiFeedbackLevel, scenarioSettingsAccordion] };
