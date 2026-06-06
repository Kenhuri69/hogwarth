// ============================================================
// Harnais smoke partagé — helpers extraits de smoke.js
// Consommé par tests/scenarios/*.js et tests/smoke.js (runner).
// ============================================================
const { chromium } = require('../_playwright.js');
const path = require('path');

const INDEX_URL = 'file://' + path.resolve(__dirname, '../../index.html');
// ── Helpers réutilisables ────────────────────────────────────

function isIgnorableError(text) {
  // Bruit décorrélé du code (fonts CDN sur file://)
  return text.includes('ERR_CERT_AUTHORITY_INVALID')
      || text.includes('Failed to load resource')
      // Limite Chromium en file:// : les `mask-image: url(file://...)` du
      // wrapper .tinted-icon sont bloqués CORS. En production (HTTP) ça
      // marche. Cf. img/icons/_tint_demo.html et IMG_STYLE.md.
      || (text.includes('blocked by CORS policy')
          && text.includes('img/icons/items/'))
      // Limite Chromium en file:// : `fetch('audio/*.ogg')` depuis
      // audio-music.js échoue en environnement smoke (Fetch API ne
      // supporte pas file://). Le code attrape la rejection et bascule
      // sur la synthèse procédurale, mais Chromium log avant le catch.
      // En prod (HTTP/HTTPS) cette erreur n'apparaît pas.
      || (text.includes('URL scheme "file" is not supported')
          && /audio\/[\w/]+\.ogg/.test(text));
}

async function launchGame() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  // Opt-out par défaut du tour guidé d'aide : les scénarios existants ne
  // doivent pas voir l'overlay s'afficher au démarrage (cf. js/help-tour.js).
  // scenarioHelpTour lève explicitement ce flag pour tester le tour.
  await ctx.addInitScript(() => {
    try { localStorage.setItem('hh_help_tour_optout', '1'); } catch (e) { /* noop */ }
  });
  const page    = await ctx.newPage();
  const errors  = [];

  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  await page.goto(INDEX_URL);
  await page.waitForFunction(() => typeof window.startGame === 'function');

  return { browser, page, errors };
}

// Bypass des écrans titre / sélection en appelant directement les fonctions globales
async function startNewGame(page, { partySize = 1, heroes = ['harry'], house = 'Gryffondor', skipIntro = true } = {}) {
  await page.evaluate((opts) => {
    selectedPartySize = opts.partySize;
    selectedHeroes    = opts.heroes;
    confirmHeroSelection();
    chooseHouse(opts.house);
  }, { partySize, heroes, house });

  // Le flow nouvelle partie passe désormais par #intro-screen
  // (Dumbledore guide) avant d'appeler startGame(). Par défaut, le helper
  // saute cette étape pour que les autres scénarios fonctionnent comme
  // avant. Mettre skipIntro=false pour la tester explicitement.
  if (skipIntro) {
    await page.waitForFunction(() =>
      document.getElementById('intro-screen') &&
      document.getElementById('intro-screen').style.display === 'flex',
      { timeout: 3000 });
    await page.evaluate(() => {
      while (typeof _introPage === 'number' &&
             typeof _introPages !== 'undefined' &&
             _introPage < _introPages.length - 1) {
        _advanceIntro();
      }
      _finishIntro();
    });
  }

  // Attendre que startGame() ait fini son init asynchrone (textures + dungeon)
  await page.waitForFunction(() =>
    Array.isArray(party) && party[0] && party[0].hp > 0
    && Array.isArray(enemyMap) && Array.isArray(enemyMap[0])
    && typeof playerX === 'number' && typeof playerY === 'number'
  );
}

// Lance un combat contre un mannequin neutre (pas de resist/weak)
async function startDummyFight(page, { hp = 50 } = {}) {
  await page.evaluate((hpVal) => {
    const enemy = {
      id: 'test_dummy', name: 'Mannequin', icon: '🎯',
      hp: hpVal, atk: 1, def: 0, mag: 0, agi: 0, lck: 0,
      xp: 0, gold: 0, abilities: [], drops: [],
      resist: [], weak: [], desc: 'Test'
    };
    startBattle(enemy);
  }, hp);
  await page.waitForFunction(() => inBattle === true && enemyGroup.length > 0);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ROOT = path.resolve(__dirname, '../..');

module.exports = {
  chromium, path, ROOT, INDEX_URL,
  isIgnorableError, launchGame, startNewGame, startDummyFight, assert,
};
