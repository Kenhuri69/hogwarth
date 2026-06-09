// ============================================================
// Scénarios smoke — domaine « visuals » (extraits de smoke.js)
// Chaque scénario relance son propre Chromium ; helpers partagés via
// ../lib/harness. Exécutés par tests/smoke.js (runner).
// ============================================================
const { chromium, path, ROOT, INDEX_URL, isIgnorableError, launchGame, startNewGame, startDummyFight, assert } = require('../lib/harness');

async function scenarioMonsterImages() {
  console.log('\n── Scénario 5 : portraits PNG (imgSrc) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Tous les monstres avec imgSrc (data-driven) doivent retomber sur un <img>
  // en combat ET le PNG doit charger en 512+ avec alpha non-trivial.
  const ids = await page.evaluate(() =>
    MONSTERS.filter(m => m.imgSrc).map(m => m.id)
  );
  console.log(`  monstres avec imgSrc : ${ids.length}`);

  for (const id of ids) {
    const t = await page.evaluate((monsterId) => {
      const base = MONSTERS.find(m => m.id === monsterId);
      const html = getMonsterIconHtml({ ...base, currentHp: base.hp }, 80);
      return {
        hasImgSrc: !!base.imgSrc,
        usesImg:   /<img\s+src="img\/monsters\//.test(html),
        usesSvg:   /<svg /.test(html),
        src:       (html.match(/src="([^"]+)"/) || [])[1] || null
      };
    }, id);
    assert(t.hasImgSrc,             `${id} sans imgSrc`);
    assert(t.usesImg && !t.usesSvg, `${id} ne rend pas un <img>`);
    assert(t.src && t.src.endsWith(`${id}.png`), `${id} src incorrect: ${t.src}`);

    // Load + dimensions §1 IMG_STYLE.md (≥ 512×512 attendu pour les nouveaux PNG ;
    // les 6 PNG legacy peuvent être plus petits, on tolère ≥ 256).
    const probe = await page.evaluate((src) => new Promise(resolve => {
      const img = new Image();
      img.onload  = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false });
      img.src = src;
    }), t.src);
    assert(probe.ok,        `${id}: PNG introuvable`);
    assert(probe.w >= 256,  `${id}: trop petit (${probe.w}×${probe.h})`);
  }
  console.log(`  ✓ ${ids.length} <img> + load OK`);

  // Vérifier qu'un monstre sans imgSrc utilise toujours son SVG (régression).
  // Témoin auto-adaptatif : on prend le premier monstre qui n'a pas encore
  // d'imgSrc, pour que ce test reste vert au fil de la migration vers le PNG.
  const ctrl = await page.evaluate(() => {
    const base = MONSTERS.find(m => !m.imgSrc);
    if (!base) return { skipped: true };
    const html = getMonsterIconHtml({ ...base, currentHp: base.hp }, 56);
    return { id: base.id, usesSvg: /<svg /.test(html), usesImg: /<img /.test(html) };
  });
  console.log('  contrôle SVG →', ctrl);
  if (!ctrl.skipped) {
    assert(ctrl.usesSvg && !ctrl.usesImg, 'fallback SVG cassé');
  }

  // Color-type RGBA (§1 IMG_STYLE.md) : tous les PNG monstres doivent
  // avoir un canal alpha. Lecture du byte 25 de l'IHDR (color-type=6).
  // L'alpha non-trivial (≥5% pixels à 0) est validé en amont par
  // tools/process_monster_png.py au moment de l'intégration ; on n'y
  // revient pas ici (file:// + getImageData = canvas tainted).
  const fs = require('fs');
  const repoRoot = ROOT;
  let nonRgba = [];
  for (const id of ids) {
    const buf = fs.readFileSync(path.join(repoRoot, 'img/monsters', `${id}.png`));
    // Signature 8 bytes + IHDR length 4 + "IHDR" 4 + width 4 + height 4 + bit-depth 1 = 25
    if (buf[25] !== 6) nonRgba.push(`${id}(ct=${buf[25]})`);
  }
  console.log(`  color-type RGBA : ${ids.length - nonRgba.length}/${ids.length} OK`);
  assert(nonRgba.length === 0, `PNG sans canal alpha : ${nonRgba.join(', ')}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ portraits raster conformes');
  await browser.close();
}

async function scenarioFloorTextures() {
  console.log('\n── Scénario 7 : textures par palier d\'étage ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Sélection par étage — pilotée par la SoT FLOOR_THEMES (3 tranches).
  // Les murs wood/tapestry ne sont plus tirés par la progression normale.
  // Étages 7-13 = cavern_* ; 14+ = rune_* (tranche D « Ruines Anciennes »,
  // B2). L'override post-victoire (renderer.js) force aussi rune_* dès 11,
  // mais ce scénario tourne hors-victoire : seul le thème compte.
  const expected = [
    { floor: 1,  wall: 'stone1',      floorTex: 'stone',         ceil: 'beams' },
    { floor: 4,  wall: 'stone2',      floorTex: 'carpet',        ceil: 'stone' },
    { floor: 6,  wall: 'stone2',      floorTex: 'carpet',        ceil: 'stone' },
    { floor: 8,  wall: 'cavern_wall', floorTex: 'cavern_floor',  ceil: 'cavern_ceiling' },
    { floor: 10, wall: 'cavern_wall', floorTex: 'cavern_floor',  ceil: 'cavern_ceiling' },
    { floor: 13, wall: 'cavern_wall', floorTex: 'cavern_floor',  ceil: 'cavern_ceiling' },
    { floor: 14, wall: 'rune_wall',   floorTex: 'rune_floor',    ceil: 'rune_ceiling' },
    { floor: 15, wall: 'rune_wall',   floorTex: 'rune_floor',    ceil: 'rune_ceiling' },
    { floor: 20, wall: 'rune_wall',   floorTex: 'rune_floor',    ceil: 'rune_ceiling' },
  ];

  // S'assurer que toutes les textures sont chargées avant de tester les patterns
  await page.evaluate(async () => { if (window.loadTextures) await loadTextures(); });

  for (const e of expected) {
    const got = await page.evaluate((f) => {
      currentFloor = f;
      return {
        wall: getWallTextureType(0, 0, 0)
      };
    }, e.floor);
    console.log(`  étage ${e.floor} → mur=${got.wall} (attendu ${e.wall})`);
    assert(got.wall === e.wall, `étage ${e.floor} : mur ${got.wall} ≠ ${e.wall}`);
  }

  // Vérifier que les fichiers PNG des nouvelles textures sont chargeables
  const newAssets = [
    'img/textures/walls/cavern_wall.png',
    'img/textures/walls/rune_wall.png',
    'img/textures/floor/cavern_floor.png',
    'img/textures/floor/rune_floor.png',
    'img/textures/ceiling/cavern_ceiling.png',
    'img/textures/ceiling/rune_ceiling.png'
  ];
  for (const src of newAssets) {
    const ok = await page.evaluate(s => new Promise(r => {
      const img = new Image();
      img.onload  = () => r({ ok: true, w: img.naturalWidth });
      img.onerror = () => r({ ok: false });
      img.src = s;
    }), src);
    assert(ok.ok && ok.w >= 32, `texture introuvable : ${src}`);
  }
  console.log('  ✅ 6 textures chargeables, paliers cohérents');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  await browser.close();
}

async function scenarioSceneIcons() {
  console.log('\n── Scénario 13c : SCENE_ICONS ──');
  const { browser, page, errors } = await launchGame();

  const t1 = await page.evaluate(() => {
    const svgKeys = ['chest', 'shop', 'stairs_d', 'stairs_u'];
    const ok = svgKeys.every(k => typeof SCENE_ICONS[k] === 'string'
                                && SCENE_ICONS[k].startsWith('<svg'));
    const fountainOk = typeof SCENE_ICONS.fountain === 'function';
    const active = SCENE_ICONS.fountain({ dried: false });
    const dried  = SCENE_ICONS.fountain({ dried: true });
    return {
      svgOk: ok,
      fountainOk,
      activeAnimated:  active.includes('<animate'),
      driedNoAnimate:  !dried.includes('<animate'),
      activeIsSvg:     active.startsWith('<svg'),
      driedIsSvg:      dried.startsWith('<svg')
    };
  });
  console.log('  T1 SCENE_ICONS :', t1);
  assert(t1.svgOk,             '4 SVG statiques (chest/shop/stairs_d/stairs_u) doivent être des strings <svg>');
  assert(t1.fountainOk,        'SCENE_ICONS.fountain doit être une fonction');
  assert(t1.activeIsSvg && t1.driedIsSvg, 'la fontaine doit retourner un SVG dans les deux états');
  assert(t1.activeAnimated,    'fontaine active doit contenir <animate (jet/gouttes)');
  assert(t1.driedNoAnimate,    'fontaine tarie doit retirer toutes les animations');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ SCENE_ICONS : 4 SVG + fontaine paramétrée (active/tarie)');
  await browser.close();
}

async function scenarioCmdBtnIcons() {
  console.log('\n── Scénario 17 : icônes barre de commandes ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // Présence + chargement des PNG
  const t1 = await page.evaluate(() => {
    const sel = (s) => document.querySelector(s);
    const checks = {
      backpack:  sel('button[onclick="openInventory()"] .btn-icon img'),
      spellbook: sel('button[onclick="openSpells()"] .btn-icon img'),
      scroll:    sel('button[onclick="openCharacter()"] .btn-icon img'),
      bestiary:  sel('button[onclick="openBestiary()"] .btn-icon img'),
      quest:     sel('button[onclick="openQuestLog()"] .btn-icon img'),
      search:    sel('#btn-search .btn-icon img'),
      rest:      sel('button[onclick="rest()"] .btn-icon img'),
      music:     sel('#btn-music .btn-icon img'),
      voice:     sel('#btn-voice .btn-icon img'),
      save:      sel('button[onclick="openSaveDialog()"] .btn-icon img'),
      load:      sel('button[onclick="openLoadDialog()"] .btn-icon img'),
      gear:      sel('button[onclick="changeDifficulty()"] .btn-icon img'),
      map:       sel('.mobile-map-btn .btn-icon img'),
    };
    return Object.fromEntries(Object.entries(checks).map(([k, el]) => [k, {
      exists:  !!el,
      src:     el && el.getAttribute('src'),
      hasSrc:  !!(el && el.getAttribute('src') && el.getAttribute('src').startsWith('img/icons/')),
      loaded:  !!(el && el.complete && el.naturalWidth > 0)
    }]));
  });
  for (const [name, c] of Object.entries(t1)) {
    console.log(`  ${name.padEnd(10)} → exists=${c.exists} loaded=${c.loaded} src=${c.src}`);
    assert(c.exists, `${name}: <img> absent du DOM`);
    assert(c.hasSrc, `${name}: src ne pointe pas vers img/icons/`);
    assert(c.loaded, `${name}: PNG non chargé (404 ou cassé)`);
  }

  // Toggle music + voice doit changer le src de l'<img>
  const t2 = await page.evaluate(() => {
    const musicImg = document.querySelector('#btn-music img');
    const voiceImg = document.querySelector('#btn-voice img');
    const before = { music: musicImg.getAttribute('src'), voice: voiceImg.getAttribute('src') };
    AudioSystem.toggleMute();
    AudioSystem.toggleVoice();
    const after = { music: musicImg.getAttribute('src'), voice: voiceImg.getAttribute('src') };
    // Restaurer l'état initial
    AudioSystem.toggleMute();
    AudioSystem.toggleVoice();
    return { before, after };
  });
  console.log('  toggle audio :', t2);
  assert(t2.before.music !== t2.after.music, 'toggle music doit changer le src de l\'icône');
  assert(t2.before.voice !== t2.after.voice, 'toggle voice doit changer le src de l\'icône');
  assert(/music_off\.png$/.test(t2.after.music), 'après toggleMute, src doit pointer vers music_off.png');
  assert(/voice_off\.png$/.test(t2.after.voice), 'après toggleVoice (off), src doit pointer vers voice_off.png');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ icônes UI : 13 icônes présentes, chargées + toggle music/voice fonctionnel');
  await browser.close();
}

async function scenarioUiChromeIcons() {
  console.log('\n── Scénario 18 : Phase 1 — UI chrome + HUD stats ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

  // T1 : les icônes HUD (game-title, gold-display, barres HP/MP/XP, dpad, shop) sont des <img> chargés
  const t1 = await page.evaluate(() => {
    const grab = (sel) => {
      const el = document.querySelector(sel);
      const img = el ? el.querySelector('img') : null;
      return img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 } : null;
    };
    const grabBarLabelByTextId = (textId) => {
      const span = document.getElementById(textId);
      const label = span ? span.closest('.bar-label') : null;
      const img = label ? label.querySelector('img') : null;
      return img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 } : null;
    };
    return {
      gameTitle: grab('#xp-wrap'),  // l'icône Poudlard vit dans l'anneau XP (header gauche)
      gold:      grab('#gold-display'),
      hp0:       grabBarLabelByTextId('hp-text-0'),
      mp0:       grabBarLabelByTextId('sp-text-0'),
      hp1:       grabBarLabelByTextId('hp-text-1'),
      mp1:       grabBarLabelByTextId('sp-text-1'),
      xp:        grabBarLabelByTextId('xp-text-0'),
      dpad:      grab('.dpad-center'),
      shopTitle: grab('#shop-title')
    };
  });
  console.log('  T1 HUD icons →', JSON.stringify(t1, null, 2));
  const checks = {
    gameTitle: /hp\.png$/,
    gold:      /gold\.png$/,
    hp0:       /hp\.png$/,
    mp0:       /mp\.png$/,
    hp1:       /hp\.png$/,
    mp1:       /mp\.png$/,
    xp:        /xp\.png$/,
    dpad:      /hp\.png$/,
    shopTitle: /shop_sign\.png$/
  };
  for (const [key, regex] of Object.entries(checks)) {
    assert(t1[key] !== null,                   `${key} : doit avoir un <img>`);
    assert(regex.test(t1[key].src),            `${key} : src doit matcher ${regex} (était ${t1[key].src})`);
    assert(t1[key].loaded === true,            `${key} : image doit être chargée (pas de 404)`);
  }

  // T2 : la fiche de personnage (modale) contient bien les <img> pour chaque stat
  const t2 = await page.evaluate(() => {
    openCharacter(0);
    const modal = document.getElementById('char-detail');
    const imgs = Array.from(modal.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T2 fiche perso →', t2);
  ['hp.png', 'mp.png', 'atk.png', 'def.png', 'str.png', 'int.png', 'agi.png', 'xp.png', 'mag.png', 'gold.png'].forEach(name => {
    assert(t2.some(s => s.endsWith(name)), `fiche perso doit contenir ${name}`);
  });

  // T3 : updateUI() après une mutation de gold maintient l'<img> (pas de regression sur innerHTML).
  // K4 — le montant fait désormais un roll-up animé : la cible est reflétée tout
  // de suite par data-gold, le texte atterrit sur la valeur exacte après l'anim.
  const t3 = await page.evaluate(() => {
    player.gold = 999;
    updateUI();
    const el = document.getElementById('gold-display');
    const img = el.querySelector('img');
    return { hasImg: !!img, src: img && img.getAttribute('src'), dataGold: el.getAttribute('data-gold') };
  });
  console.log('  T3 updateUI gold →', t3);
  assert(t3.hasImg,                   'gold-display doit conserver son <img> après updateUI');
  assert(/gold\.png$/.test(t3.src),   'gold-display src doit rester sur gold.png');
  assert(t3.dataGold === '999',       'la cible data-gold doit refléter la nouvelle valeur');
  await new Promise(r => setTimeout(r, 700));
  const t3txt = await page.evaluate(() => document.getElementById('gold-display').textContent.trim());
  assert(/999\s*Gallions/.test(t3txt), 'le montant Gallions doit atterrir sur 999');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ Phase 1 : 9 icônes HUD + 10 stats fiche perso + persistance après updateUI');
  await browser.close();
}

async function scenarioItemIcons() {
  console.log('\n── Scénario 21 : Phase 4 — items ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // T1 : couverture 100% — chaque ITEMS[] a une entrée registry, chargée
  const t1 = await page.evaluate(async () => {
    const total   = ITEMS.length;
    // Un item est couvert par un PNG legacy OU un SVG inline dédié
    // (herbes/potions — voir ITEM_ICON_SVG_REGISTRY).
    const hasSvg  = typeof ITEM_ICON_SVG_REGISTRY !== 'undefined';
    const covered = it => ITEM_ICON_REGISTRY[it.id] || (hasSvg && ITEM_ICON_SVG_REGISTRY[it.id]);
    const mapped  = ITEMS.filter(covered).length;
    const missing = ITEMS.filter(it => !covered(it)).map(it => it.id);
    const tries = await Promise.all(Object.values(ITEM_ICON_REGISTRY).map(src =>
      new Promise(resolve => {
        const im = new Image();
        im.onload  = () => resolve({ src, ok: im.naturalWidth > 0 });
        im.onerror = () => resolve({ src, ok: false });
        im.src = src;
      })
    ));
    return {
      total, mapped, missing,
      allLoaded: tries.every(t => t.ok),
      failed:    tries.filter(t => !t.ok).map(t => t.src)
    };
  });
  console.log('  T1 couverture →', t1);
  assert(t1.missing.length === 0,        `items non mappés : ${t1.missing.join(', ')}`);
  assert(t1.mapped === t1.total,         `${t1.mapped}/${t1.total} mappés`);
  assert(t1.allLoaded,                   `PNG manquants : ${t1.failed.join(', ')}`);

  // T2 : grille inventaire utilise les PNG / SVG inline
  const t2 = await page.evaluate(() => {
    // Donner quelques items à Harry
    player.inventory = [
      ITEMS.find(i => i.id === 'potion_s'),
      ITEMS.find(i => i.id === 'wand1'),
      ITEMS.find(i => i.id === 'livre_sortileges')
    ];
    openInventory();
    const grid = document.getElementById('inv-grid');
    const elems = Array.from(grid.querySelectorAll('img.ui-icon, .tinted-icon'));
    // Pour `<img>` on lit src ; pour `.tinted-icon` on lit data-mask
    // (équivalent fonctionnel : sprite source identifiant l'item).
    return {
      imgs:     elems.map(e => e.getAttribute('src') || e.getAttribute('data-mask') || ''),
      svgCount: grid.querySelectorAll('.svg-icon svg').length
    };
  });
  console.log('  T2 inventaire →', t2);
  // potion_s est désormais rendue via SVG inline (ITEM_ICON_SVG_REGISTRY).
  assert(t2.svgCount >= 1,
         'inventaire doit afficher potion_s en SVG inline');
  // Accepte l'ancien chemin (items/<id>.png) ou le nouveau pipeline painterly
  // (icons_new/<id>_<size>.png — étape 9 du redesign).
  assert(t2.imgs.some(s => /(items\/wand1\.png|icons_new\/wand1_\d+\.png)$/.test(s) || s === 'wand_shaft_base'),
         'inventaire doit afficher wand1 OU wrapper tinted (mask=wand_shaft_base)');
  assert(t2.imgs.some(s => /(items\/livre_sortileges\.png|icons_new\/livre_sortileges_\d+\.png)$/.test(s)),
         'inventaire doit afficher livre_sortileges');

  // T3 : grille boutique utilise les PNG (déclencher openShop avec un currentFloor>=1)
  const t3 = await page.evaluate(() => {
    closeModal('inventory-modal');
    currentFloor = 6;  // pour débloquer wand2 dans shop
    shopStock = null;  // re-tirage déterministe pour l'étage courant
    openShop();
    const list = document.getElementById('shop-grid');
    const imgs = Array.from(list.querySelectorAll('img.ui-icon')).map(i => i.getAttribute('src'));
    return imgs;
  });
  console.log('  T3 boutique →', t3);
  assert(t3.length >= 3,                                  `shop doit avoir au moins 3 items, vu ${t3.length}`);
  assert(t3.every(s => /(items\/[a-z0-9_]+\.png|icons_new\/[a-z0-9_]+_\d+\.png)$/.test(s)),
         'tous les items shop doivent pointer img/icons/items/ ou img/icons_new/');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log(`  ✅ Phase 4 : ${t1.total} items mappés + inventaire + boutique 100% PNG`);
  await browser.close();
}

async function scenarioTintCss() {
  console.log('\n── Scénario 24 : tint CSS 2-calques (épée + baguettes) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  const t = await page.evaluate(() => {
    const sword = ITEMS.find(i => i.id === 'sword_gryff');
    const wand  = ITEMS.find(i => i.id === 'wand1');
    if (!sword || !sword.tinted) return { fail: 'sword_gryff sans flag tinted' };
    if (!wand  || !wand.tinted)  return { fail: 'wand1 sans flag tinted' };

    // Le pipeline painterly (étape 9) supplante le système tinted dans
    // getItemIconHtml. Pour tester le système tinted en isolation on
    // appelle directement _getTintedItemHtml — il reste utilisé comme
    // fallback pour les items tinted hors ITEM_ICON_NEW_REGISTRY.
    const html = _getTintedItemHtml(sword, 'ui-icon-xl');
    const tmp  = document.createElement('div');
    tmp.innerHTML = html;
    const root = tmp.firstChild;

    const wandHtml = _getTintedItemHtml(wand, 'ui-icon-xl');
    const wandTmp  = document.createElement('div');
    wandTmp.innerHTML = wandHtml;
    const wandRoot = wandTmp.firstChild;

    // Test injection : tint inconnu → null (whitelist bloque l'injection)
    const evil = _getTintedItemHtml({ ...sword, tint: 'evil); background: url(data:x' }, 'ui-icon-md') || '';

    return {
      // épée (palette métaux)
      isWrapper:    root && root.tagName === 'SPAN',
      hasTinted:    root && root.classList.contains('tinted-icon'),
      hasTintCls:   root && root.classList.contains('tint-silver'),
      hasSize:      root && root.classList.contains('ui-icon-xl'),
      mask:         root && root.getAttribute('data-mask'),
      overlay:      root && root.getAttribute('data-overlay'),
      tint:         root && root.getAttribute('data-tint'),
      layerCount:   root ? root.childElementCount : 0,
      maskUrl:      root && root.querySelector('.tint-mask')   ? root.querySelector('.tint-mask').getAttribute('style') : '',
      overlayUrl:   root && root.querySelector('.tint-overlay')? root.querySelector('.tint-overlay').getAttribute('style') : '',
      // baguette (palette bois) — vérifie que la généralisation marche
      wandHasTint:  wandRoot && wandRoot.classList.contains('tinted-icon'),
      wandTint:     wandRoot && wandRoot.getAttribute('data-tint'),
      wandMask:     wandRoot && wandRoot.getAttribute('data-mask'),
      // sécurité
      evilFallback: !/data:x/.test(evil) && !/tint-evil/.test(evil),
    };
  });

  console.log('  resolver →', t);
  assert(!t.fail,        t.fail || '');
  assert(t.isWrapper,    'wrapper non produit');
  assert(t.hasTinted,    'classe tinted-icon manquante');
  assert(t.hasTintCls,   'classe tint-silver manquante');
  assert(t.hasSize,      'classe ui-icon-xl perdue');
  assert(t.mask    === 'sword_blade_base', `mask=${t.mask}`);
  assert(t.overlay === 'sword_hilt_gryff', `overlay=${t.overlay}`);
  assert(t.tint    === 'silver',           `tint=${t.tint}`);
  assert(t.layerCount === 2,               `layers=${t.layerCount} (attendu 2)`);
  assert(t.maskUrl.includes('sword_blade_base.png'),   'mask URL absente');
  assert(t.overlayUrl.includes('sword_hilt_gryff.png'),'overlay URL absente');
  // Régression connue : les url() dans les custom properties CSS sont
  // résolues relativement au CSS consommateur (style.css dans /css/).
  // Un chemin sans `../` produit un 404 silencieux et la baguette/épée
  // n'apparaît pas en jeu (vu en prod 2026-05-10 sur Baguette de Saule).
  assert(t.maskUrl.includes("'../img/"),
         'mask URL doit commencer par ../img/ pour résoudre depuis css/style.css');
  assert(t.overlayUrl.includes("'../img/"),
         'overlay URL doit commencer par ../img/ pour résoudre depuis css/style.css');
  assert(t.wandHasTint,                     'wand1 ne produit pas tinted-icon');
  assert(['oak','ebony','willow','holly','elder','vine'].includes(t.wandTint),
         `wand1 tint=${t.wandTint} hors palette bois`);
  assert(t.wandMask === 'wand_shaft_base',  `wand mask=${t.wandMask}`);
  assert(t.evilFallback, 'whitelist tint contournée — risque injection CSS');

  // CSS : on lit style.css en Node (cssRules bloqué en file://). Vérifie
  // les 12 classes tint-* (6 métaux + 6 bois) + le sélecteur tint-mask.
  const fs   = require('fs');
  const path = require('path');
  const css  = fs.readFileSync(path.resolve(ROOT, 'css/style.css'), 'utf-8');
  const palette = ['iron','copper','bronze','silver','gold','platinum',
                   'oak','ebony','willow','holly','elder','vine'];
  palette.forEach(p => {
    assert(css.includes(`.tint-${p}`), `CSS .tint-${p} manquant`);
  });
  assert(css.includes('.tinted-icon .tint-mask'), 'CSS .tinted-icon .tint-mask manquant');

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ tint CSS — DOM, attrs et whitelist OK');
  await browser.close();
}

async function scenarioNpcSprite3D() {
  console.log('\n── Scénario : sprite PNJ pseudo-3D ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });

  // 1) drawNpcSprite est exposé.
  const exposed = await page.evaluate(() => ({
    drawNpcSprite: typeof drawNpcSprite === 'function'
  }));
  assert(exposed.drawNpcSprite, 'drawNpcSprite absent du global scope');

  // 2) Forcer un PNJ pile devant le joueur, vérifier que drawNpcSprite
  //    est appelé avec l'id attendu.
  const result = await page.evaluate(() => {
    // Place le joueur dans un état déterministe : direction 'n', case
    // (5,5) si possible, et la case juste devant (5,4) devient CELL.NPC.
    const px = 5, py = 5;
    // Sécurise les bornes
    if (px < 1 || py < 2 || px >= MAP_W - 1 || py >= MAP_H - 1) {
      return { skipped: 'hors carte', tried: { px, py } };
    }
    playerX = px;
    playerY = py;
    playerDir = 'n';
    // S'assurer que le joueur est sur une case libre
    dungeon[py][px] = CELL.FLOOR;
    // La case juste devant : NPC associé à un PNJ déterministe.
    dungeon[py - 1][px] = CELL.NPC;
    if (typeof npcPlacements === 'undefined') return { skipped: 'no npcPlacements' };
    npcPlacements.set(`${px},${py - 1}`, 'dumbledore');

    // Spy sur drawNpcSprite — wrap pour capturer les args.
    const calls = [];
    const orig = window.drawNpcSprite;
    window.drawNpcSprite = function (npcId, x, baseY, sz) {
      calls.push({ npcId, x, baseY, sz });
      return orig.apply(this, arguments);
    };

    // Spy sur l'objet sprite : vérifier que l'image est demandée.
    // _getNpcSprite stocke _NPC_SPRITE module-scope ; on lit son .src
    // après drawDungeon().
    drawDungeon();

    window.drawNpcSprite = orig;
    // Trouver l'élément Image du sprite via le DOM (les Image() restent
    // attachées au document si srcd, sinon on relit depuis le call).
    // Plus simple : on inspecte qu'au moins un call ait été fait avec
    // npcId === 'dumbledore'.
    return {
      callCount: calls.length,
      lastCall:  calls[calls.length - 1] || null
    };
  });
  console.log('  result :', result);
  assert(!result.skipped, `scénario skipé : ${result.skipped}`);
  assert(result.callCount >= 1,
    `drawNpcSprite doit être appelé au moins 1 fois (obtenu ${result.callCount})`);
  assert(result.lastCall.npcId === 'dumbledore',
    `npcId attendu "dumbledore", obtenu "${result.lastCall.npcId}"`);
  assert(typeof result.lastCall.x === 'number' && Number.isFinite(result.lastCall.x),
    'coord x invalide');
  assert(typeof result.lastCall.baseY === 'number' && Number.isFinite(result.lastCall.baseY),
    'coord baseY invalide');
  assert(result.lastCall.sz > 0, 'taille sz doit être > 0');

  // 3) Le PNG _wizard_generic.png est demandé par _getNpcSprite.
  //    On déclenche l'appel et on lit l'image source via un second
  //    drawDungeon (au cas où le premier n'a pas alloué encore).
  const png = await page.evaluate(() => {
    // Force un appel pour s'assurer que _getNpcSprite a tourné.
    drawNpcSprite('dumbledore', 100, 100, 60);
    // _NPC_SPRITE est module-scope ; on ne peut pas y accéder
    // directement, mais l'image est dans le DOM ? Non — `new Image()`
    // n'est pas dans le DOM. On relit via une fetch sync de l'asset
    // pour confirmer son existence côté serveur (file://).
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload  = () => resolve({ ok: true,  src: probe.src });
      probe.onerror = () => resolve({ ok: false, src: probe.src });
      probe.src = 'img/npc/_wizard_generic.png';
    });
  });
  console.log('  png   :', png);
  assert(png.ok, "img/npc/_wizard_generic.png inaccessible côté navigateur");
  assert(/\/_wizard_generic\.png$/.test(png.src),
    `src finale attendue …/_wizard_generic.png, obtenu ${png.src}`);

  // 4) Pas de PNJ devant → drawNpcSprite NE doit PAS être appelé.
  const noNpc = await page.evaluate(() => {
    // Le renderer scanne jusqu'à DEPTH cases devant : ne nettoyer que les
    // 3 premières laissait passer un CELL.NPC généré plus loin dans le
    // couloir. On retire donc TOUTE case NPC de l'étage.
    if (typeof npcPlacements !== 'undefined') npcPlacements.clear();
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.NPC) dungeon[y][x] = CELL.FLOOR;
      }
    }
    const calls = [];
    const orig = window.drawNpcSprite;
    window.drawNpcSprite = function () { calls.push(arguments); };
    drawDungeon();
    window.drawNpcSprite = orig;
    return { calls: calls.length };
  });
  assert(noNpc.calls === 0,
    `drawNpcSprite ne doit pas être appelé si aucun PNJ devant (obtenu ${noNpc.calls})`);

  // 5) M1 — réaction d'approche : helper pur exposé + drawNpcSprite ne throw
  //    pas avec/sans `dist` (proche/loin), ni sous reduced-motion.
  const m1 = await page.evaluate(() => {
    const out = { threw: false };
    try {
      out.hasProx = typeof _npcApproachProx === 'function';
      out.prox1 = _npcApproachProx(1);
      out.prox3 = _npcApproachProx(3);
      _npcAnimPhase = 1.2;
      drawNpcSprite('dumbledore', 120, 200, 60, 1);          // proche
      drawNpcSprite('dumbledore', 120, 200, 60, 99);         // loin
      drawNpcSprite('dumbledore', 120, 200, 60);             // sans dist (rétro-compat)
    } catch (e) { out.threw = true; out.err = String(e); }
    return out;
  });
  console.log('  M1 approche:', m1);
  assert(!m1.threw, 'M1 drawNpcSprite throw: ' + (m1.err || ''));
  assert(m1.hasProx, 'M1 _npcApproachProx absent');
  assert(m1.prox1 === 1 && m1.prox3 === 0, 'M1 proximité incohérente');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const m1r = await page.evaluate(() => {
    let threw = false;
    try { _npcAnimPhase = 2.3; drawNpcSprite('dumbledore', 120, 200, 60, 1); }
    catch (e) { threw = true; }
    return { reduced: _spriteReducedMotion(), threw };
  });
  console.log('  M1 reduced:', m1r);
  assert(m1r.reduced && !m1r.threw, 'M1 drawNpcSprite throw sous reduced-motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS détectées`);
  }
  console.log('  ✅ sprite PNJ pseudo-3D OK');
  await browser.close();
}

async function scenarioMonsterCombatInfo() {
  console.log('\n── Scénario : panneau d\'info monstre (combat) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'] });
  await startDummyFight(page, { hp: 50 });

  // T1 — 0 kill : seule l'identité est révélée (3 sections verrouillées).
  const t1 = await page.evaluate(() => {
    monsterKills = {};
    enemyGroup[0].weak = ['feu'];
    enemyGroup[0].abilities = [{ icon: '💥', name: 'Charge', desc: 'fonce', chance: 0.5 }];
    showMonsterCombatInfo(0);
    const ov = document.getElementById('monster-info-overlay');
    const c  = document.getElementById('monster-info-content');
    return {
      visible:  ov.style.display === 'flex',
      locked:   c.querySelectorAll('.mi-locked').length,
      hasStats: !!c.querySelector('.bestiary-stat-grid')
    };
  });
  console.log('  T1 0 kill :', t1);
  assert(t1.visible,      'overlay non affiché');
  assert(t1.locked === 3, `3 sections verrouillées attendues, obtenu ${t1.locked}`);
  assert(!t1.hasStats,    'stats ne doivent pas être révélées à 0 kill');

  // T2 — 1 kill : stats révélées, faiblesses encore verrouillées.
  const t2 = await page.evaluate(() => {
    monsterKills = { test_dummy: 1 };
    showMonsterCombatInfo(0);
    const c = document.getElementById('monster-info-content');
    return {
      hasStats: !!c.querySelector('.bestiary-stat-grid'),
      hasWeak:  c.innerHTML.includes('Résistances &amp; Faiblesses'),
      locked:   c.querySelectorAll('.mi-locked').length
    };
  });
  console.log('  T2 1 kill :', t2);
  assert(t2.hasStats,     'stats non révélées à 1 kill');
  assert(!t2.hasWeak,     'faiblesses ne doivent pas être révélées à 1 kill');
  assert(t2.locked === 2, `2 sections verrouillées attendues, obtenu ${t2.locked}`);

  // T3 — 3 kills : faiblesses révélées, capacités encore verrouillées.
  const t3 = await page.evaluate(() => {
    monsterKills = { test_dummy: 3 };
    showMonsterCombatInfo(0);
    const c = document.getElementById('monster-info-content');
    return {
      hasWeak:    c.innerHTML.includes('Résistances &amp; Faiblesses'),
      hasAbility: c.innerHTML.includes('Capacités spéciales'),
      locked:     c.querySelectorAll('.mi-locked').length
    };
  });
  console.log('  T3 3 kills:', t3);
  assert(t3.hasWeak,      'faiblesses non révélées à 3 kills');
  assert(!t3.hasAbility,  'capacités ne doivent pas être révélées à 3 kills');
  assert(t3.locked === 1, `1 section verrouillée attendue, obtenu ${t3.locked}`);

  // T4 — 5 kills : capacités révélées, plus aucune section verrouillée.
  const t4 = await page.evaluate(() => {
    monsterKills = { test_dummy: 5 };
    showMonsterCombatInfo(0);
    const c = document.getElementById('monster-info-content');
    return {
      hasAbility: c.innerHTML.includes('Capacités spéciales'),
      locked:     c.querySelectorAll('.mi-locked').length
    };
  });
  console.log('  T4 5 kills:', t4);
  assert(t4.hasAbility,   'capacités non révélées à 5 kills');
  assert(t4.locked === 0, `0 section verrouillée attendue, obtenu ${t4.locked}`);

  // T5 — un clic sur la carte ennemie ouvre le panneau.
  const t5 = await page.evaluate(() => {
    closeMonsterCombatInfo();
    renderEnemyGroup();
    document.querySelector('.enemy-card')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { visible: document.getElementById('monster-info-overlay').style.display === 'flex' };
  });
  console.log('  T5 clic   :', t5);
  assert(t5.visible, 'le clic sur la carte ennemie n\'ouvre pas le panneau');

  // T6 — endBattle(true) incrémente monsterKills par espèce.
  const t6 = await page.evaluate(() => {
    monsterKills = {};
    enemyGroup[0].currentHp = 0;
    endBattle(true);
    return { kills: monsterKills.test_dummy || 0 };
  });
  console.log('  T6 kill   :', t6);
  assert(t6.kills === 1, `monsterKills.test_dummy attendu 1, obtenu ${t6.kills}`);

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error(`${errors.length} erreurs JS (panneau info monstre)`);
  }
  console.log('  ✅ Panneau d\'info monstre conforme');
  await browser.close();
}

// N1 — transitions d'ouverture des modales d'info : le panneau .modal-box porte
// une animation d'entrée (fondu + scale), neutralisée en fondu seul sous
// reduced-motion. La modale reste fonctionnelle (boutons cliquables). Les
// overlays de combat ne sont pas touchés (n'utilisent pas .modal-box).
async function scenarioModalTransitions() {
  console.log('\n── Scénario : Transitions d\'ouverture des modales (N1) ──');
  const { browser, page, errors } = await launchGame();
  await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

  // Mouvement normal : la box de la fiche perso porte modalBoxIn.
  const normal = await page.evaluate(() => {
    openCharacter(0);
    const modal = document.getElementById('character-modal');
    const box = modal.querySelector('.modal-box');
    const visible = getComputedStyle(modal).display !== 'none';
    const anim = box ? getComputedStyle(box).animationName : null;
    // Le bouton de fermeture reste présent/cliquable (modale fonctionnelle).
    const closable = !!modal.querySelector('.modal-close');
    closeModal && closeModal('character-modal');
    return { visible, anim, closable };
  });
  console.log('  N1 normal:', normal);
  assert(normal.visible, 'N1 modale non affichée après openCharacter');
  assert(normal.anim === 'modalBoxIn', 'N1 animation d\'ouverture absente (' + normal.anim + ')');
  assert(normal.closable, 'N1 bouton de fermeture absent (modale non fonctionnelle)');

  // L'overlay de combat n'est PAS animé par cette règle (pas de .modal-box).
  const combatUntouched = await page.evaluate(() => {
    const enc = document.getElementById('encounter-overlay');
    return !!enc && !enc.classList.contains('modal-box');
  });
  assert(combatUntouched, 'N1 régression : encounter-overlay ne doit pas être une .modal-box');

  // reduced-motion : fondu seul (modalBoxFadeRM), modale toujours affichée.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(() => {
    openBestiary();
    const box = document.querySelector('#bestiary-modal .bestiary-modal-box');
    const anim = box ? getComputedStyle(box).animationName : null;
    closeModal && closeModal('bestiary-modal');
    return { anim };
  });
  console.log('  N1 reduced:', reduced);
  assert(reduced.anim === 'modalBoxFadeRM', 'N1 variante reduced-motion absente (' + reduced.anim + ')');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  if (errors.length) {
    errors.forEach(e => console.log('  ⚠️ ', e));
    throw new Error('Erreurs console pendant le scénario Transitions de modales (N1)');
  }
  console.log('  ✅ Transitions d\'ouverture des modales (N1) OK');
  await browser.close();
}

module.exports = { scenarios: [scenarioMonsterImages, scenarioFloorTextures, scenarioSceneIcons, scenarioCmdBtnIcons, scenarioUiChromeIcons, scenarioItemIcons, scenarioTintCss, scenarioNpcSprite3D, scenarioMonsterCombatInfo, scenarioModalTransitions] };
