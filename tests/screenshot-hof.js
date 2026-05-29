// Capture du Hall of Fame (badges niveau / étage / blason de Maison).
// Usage : node tests/screenshot-hof.js
// Output : tests/hof-desktop.png + tests/hof-mobile.png

const { chromium } = require('./_playwright.js');
const path = require('path');

const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');

async function captureViewport(browser, viewport, label, outName) {
  const ctx  = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${label}] pageerror:`, e.message));

  await ctx.addInitScript(() => {
    try { localStorage.setItem('hh_help_tour_optout', '1'); } catch (e) { /* noop */ }
  });

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

  // Désactive Supabase pour rester déterministe + injecte 5 entrées locales
  // variées (4 Maisons + 1 legacy sans Maison) pour montrer tous les cas.
  await page.evaluate(() => {
    if (typeof HOF_CONFIG !== 'undefined') HOF_CONFIG.supabaseUrl = '';
    const sample = [
      { player_name: 'Olivia',  score: 18420, difficulty: 'Expert',    heroes: 'Harry Potter & Hermione Granger',
        deepest_floor: 14, party_levels: 'Niv. 18', monsters_killed: 220, quests_completed: 12, gold: 4200,
        house: 'Gryffondor',  run_id: 'demo-1' },
      { player_name: 'Severus', score: 14210, difficulty: 'Difficile', heroes: 'Maxence Lestrange',
        deepest_floor: 11, party_levels: 'Niv. 15', monsters_killed: 178, quests_completed: 9, gold: 3100,
        house: 'Serpentard',  run_id: 'demo-2' },
      { player_name: 'Luna',    score:  9650, difficulty: 'Normal',    heroes: 'Iris & Anastasia',
        deepest_floor:  9, party_levels: 'Niv. 12', monsters_killed: 140, quests_completed: 7, gold: 1800,
        house: 'Serdaigle',   run_id: 'demo-3' },
      { player_name: 'Cedric',  score:  6420, difficulty: 'Facile',    heroes: 'Céleste Beaumont',
        deepest_floor:  7, party_levels: 'Niv. 9',  monsters_killed: 92,  quests_completed: 5, gold: 1200,
        house: 'Poufsouffle', run_id: 'demo-4' },
      { player_name: 'Anonyme', score:  3210, difficulty: 'Normal',    heroes: 'Harry Potter',
        deepest_floor:  4, party_levels: 'Niv. 6',  monsters_killed: 48,  quests_completed: 2, gold: 540,
        run_id: 'demo-legacy' },  // legacy : pas de Maison
    ];
    localStorage.setItem('hogwarts_rpg_hof', JSON.stringify(sample));
    openHallOfFame();
  });
  await page.waitForFunction(() =>
    document.querySelectorAll('#hof-list .hof-row').length >= 5, { timeout: 3000 });
  await page.waitForTimeout(300);

  const outPath = path.resolve(__dirname, outName);
  await page.locator('#hall-of-fame-screen').screenshot({ path: outPath });
  console.log(`[${label}] → ${outPath}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await captureViewport(browser, { width: 1280, height: 900 }, 'desktop', 'hof-desktop.png');
  await captureViewport(browser, { width: 380, height: 720 }, 'mobile',  'hof-mobile.png');
  await browser.close();
})();
