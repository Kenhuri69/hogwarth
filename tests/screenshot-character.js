// Capture de la modale Personnage (refonte paper doll).
// Usage : node tests/screenshot-character.js
// Output : tests/character-desktop.png + tests/character-mobile.png

const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');
const path = require('path');

const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');

async function captureViewport(browser, viewport, label, outName) {
  const ctx  = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${label}] pageerror:`, e.message));

  await page.goto(INDEX_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('title-screen').click());
  await page.evaluate(() => {
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
    if (typeof skipIntro === 'function') skipIntro();
    else if (document.getElementById('intro-screen'))
      document.getElementById('intro-screen').style.display = 'none';
    if (typeof startGame === 'function' && !document.getElementById('game-container').style.display.includes('flex'))
      startGame(1);
  });
  await page.waitForTimeout(400);
  // Équiper quelques items pour rendre le paper doll vivant.
  await page.evaluate(() => {
    const ids = ['wand1', 'robe1', 'chapeau_apprenti', 'gants_apprenti',
                 'bottes_apprenti', 'cape_voyageur', 'amulette_protection',
                 'anneau_argent', 'ceinture_cuir', 'broom'];
    ids.forEach(id => {
      const it = ITEMS.find(i => i.id === id);
      if (it) player.inventory.push({ ...it });
    });
    // Équiper 1 item par slot via equipItem
    const wandIdx = player.inventory.findIndex(x => x.id === 'wand1');
    equipItem(wandIdx, 0);
    const robeIdx = player.inventory.findIndex(x => x.id === 'robe1');
    if (robeIdx >= 0) equipItem(robeIdx, 0);
    const hatIdx = player.inventory.findIndex(x => x.id === 'chapeau_apprenti');
    if (hatIdx >= 0) equipItem(hatIdx, 0);
    const gloIdx = player.inventory.findIndex(x => x.id === 'gants_apprenti');
    if (gloIdx >= 0) equipItem(gloIdx, 0);
    const bootIdx = player.inventory.findIndex(x => x.id === 'bottes_apprenti');
    if (bootIdx >= 0) equipItem(bootIdx, 0);
    const capeIdx = player.inventory.findIndex(x => x.id === 'cape_voyageur');
    if (capeIdx >= 0) equipItem(capeIdx, 0);
    const amIdx = player.inventory.findIndex(x => x.id === 'amulette_protection');
    if (amIdx >= 0) equipItem(amIdx, 0);
    const ringIdx = player.inventory.findIndex(x => x.id === 'anneau_argent');
    if (ringIdx >= 0) equipItem(ringIdx, 0);
    const beltIdx = player.inventory.findIndex(x => x.id === 'ceinture_cuir');
    if (beltIdx >= 0) equipItem(beltIdx, 0);
    const brIdx = player.inventory.findIndex(x => x.id === 'broom');
    if (brIdx >= 0) equipItem(brIdx, 0);
    player.gold = 1234;
    openCharacter(0);
  });
  await page.waitForTimeout(300);

  const out = path.resolve(__dirname, outName);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✅ [${label}] ${out}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await captureViewport(browser, { width: 1200, height: 800 }, 'desktop', 'character-desktop.png');
  await captureViewport(browser, { width: 380,  height: 800 }, 'mobile',  'character-mobile.png');
  await browser.close();
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
