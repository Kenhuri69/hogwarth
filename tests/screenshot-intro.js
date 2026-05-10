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

  // L'intro Dumbledore est désormais une étape narrative dédiée
  // (#intro-screen) entre la sélection de Maison et l'entrée en donjon.
  // On attend qu'elle apparaisse pour la capture.
  await page.waitForFunction(() =>
    document.getElementById('intro-screen') &&
    document.getElementById('intro-screen').style.display === 'flex',
    { timeout: 3000 });

  // Petite pause pour laisser les fonts/portrait charger
  await page.waitForTimeout(400);

  await page.screenshot({ path: OUT_PATH, fullPage: false });
  console.log(`✅ Capture sauvée : ${OUT_PATH}`);

  await browser.close();
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
