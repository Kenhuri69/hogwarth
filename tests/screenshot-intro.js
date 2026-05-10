// Capture d'écran du jeu : introduction Dumbledore (étage 1).
// Usage : node tests/screenshot-intro.js
// Output : tests/intro.png

const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');
const path = require('path');

const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT_PATH  = path.resolve(__dirname, 'intro.png');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page    = await ctx.newPage();

  page.on('pageerror', e => console.log('pageerror:', e.message));

  await page.goto(INDEX_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('title-screen').click());

  // Sélection mode + maison
  await page.evaluate(() => {
    selectedPartySize = 1;
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
  });

  await page.waitForFunction(() =>
    Array.isArray(party) && party[0] && party[0].hp > 0
    && typeof playerX === 'number');

  // Ouvrir le dialogue Dumbledore (étage 1, anchor first-room)
  await page.evaluate(() => openNpcDialog('dumbledore'));
  await page.waitForFunction(() =>
    document.getElementById('npc-dialog-overlay').style.display === 'flex');

  // Petite pause pour laisser le rendu canvas se stabiliser
  await page.waitForTimeout(400);

  await page.screenshot({ path: OUT_PATH, fullPage: false });
  console.log(`✅ Capture sauvée : ${OUT_PATH}`);

  await browser.close();
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
