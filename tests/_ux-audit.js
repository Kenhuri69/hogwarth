// Audit UX : capture les écrans clés desktop + mobile.
// Usage : node tests/_ux-audit.js
const { chromium } = require('./_playwright.js');
const path = require('path');
const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = path.resolve(__dirname, '../.claude/mockups');

async function startGame(page, partySize = 2) {
  const heroes = partySize === 2 ? ['harry', 'hermione'] : ['harry'];
  await page.goto(INDEX_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.startGame === 'function');
  await page.evaluate((opts) => {
    selectedPartySize = opts.partySize;
    selectedHeroes    = opts.heroes;
    confirmHeroSelection();
    chooseHouse('Gryffondor');
  }, { partySize, heroes });
  await page.waitForFunction(() =>
    document.getElementById('intro-screen') &&
    document.getElementById('intro-screen').style.display === 'flex',
    { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => {
    while (typeof _introPage === 'number' && typeof _introPages !== 'undefined' &&
           _introPage < _introPages.length - 1) { _advanceIntro(); }
    if (typeof _finishIntro === 'function') _finishIntro();
  });
  await page.waitForFunction(() => Array.isArray(party) && party[0] && party[0].hp > 0,
    { timeout: 6000 });
  await page.evaluate(() => {
    ['title-screen','start-hub-screen','player-select-screen','intro-screen','house-select-screen']
      .forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    const gc = document.getElementById('game-container'); if (gc) gc.style.display = 'flex';
    if (typeof updateUI === 'function') updateUI();
    if (typeof resizeCanvas === 'function') resizeCanvas();
    if (typeof drawDungeon === 'function') drawDungeon();
  });
  await page.waitForTimeout(300);
}

async function shot(browser, viewport, label, name, drive, partySize = 2) {
  const ctx  = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('hh_help_tour_optout', '1');
      localStorage.setItem('hh_combat_tuto_seen', '1');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${label}/${name}] pageerror:`, e.message));
  await startGame(page, partySize);
  if (drive) {
    await page.evaluate(drive); await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('#help-tour-root, #help-menu-root, #combat-tuto-overlay').forEach(e => e.remove());
    });
    await page.waitForTimeout(150);
  }
  const out = path.join(OUT, `audit-${name}-${label}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✅ ${out}`);
  await ctx.close();
}

const screens = {
  hud:      () => { player.gold = 850; updateUI(); },
  combat:   () => {
    try { combatTutorialSeen = true; } catch (e) {}
    startBattle({ id:'test_dummy', name:'Gobelin Rebelle', icon:'👺',
      hp:40, atk:6, def:2, mag:2, agi:4, lck:2, xp:0, gold:0,
      abilities:[], drops:[], resist:[], weak:[], desc:'Test' });
  },
  shop:     () => { currentFloor = 3; player.gold = 850; openShop(); },
  character:() => {
    const ids = ['wand1','robe1','chapeau_apprenti','cape_voyageur','amulette_protection','anneau_argent','ceinture_cuir'];
    ids.forEach(id => { const it = ITEMS.find(i => i.id === id); if (it) player.inventory.push({...it}); });
    ['wand1','robe1','chapeau_apprenti','cape_voyageur','amulette_protection','anneau_argent','ceinture_cuir']
      .forEach(id => { const i = player.inventory.findIndex(x => x.id === id); if (i >= 0) equipItem(i, 0); });
    player.gold = 850; openCharacter(0);
  },
  inventory:() => {
    ['potion_s','potion_m','mandragore','robe1','wand2','livre_sortileges'].forEach(id => {
      const it = ITEMS.find(i => i.id === id); if (it) player.inventory.push({...it});
    });
    openInventory();
  },
  spells:   () => { openSpells(); },
  quests:   () => { openQuestLog(); },
  settings: () => { changeDifficulty(); },
  bestiary: () => { ['chat_norris','peeve','mandragore','troll_toilettes'].forEach(id => seenMonsters.add(id)); openBestiary(); },
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const order = ['hud','combat','shop','character','inventory','spells','quests','settings','bestiary'];
  for (const name of order) {
    await shot(browser, { width: 1280, height: 800 }, 'desktop', name, screens[name], 2);
    await shot(browser, { width: 380,  height: 820 }, 'mobile',  name, screens[name], 1);
  }
  await browser.close();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
