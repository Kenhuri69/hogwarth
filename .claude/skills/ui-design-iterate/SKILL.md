---
name: ui-design-iterate
description: Itérer sur le design UX/UI du jeu Poudlard & Magie (HUD, modales, fiche perso, combat, boutique, responsive mobile) en pilotant l'app en Chrome headless et en capturant des captures desktop + mobile pour comparer avant/après. Utiliser pour toute retouche visuelle/layout, audit responsive, refonte d'écran, ou quand on dit « le rendu », « le layout », « ça déborde sur mobile », « refais le HUD ». S'appuie sur Playwright (tests/_playwright.js), IMG_STYLE.md, et les contraintes responsive du projet.
---

# Itérer sur le design UX/UI

Le projet a une discipline de design **pilotée par captures** : on conduit
l'app en headless jusqu'à l'état visé, on capture en **desktop ET mobile**, on
compare avant/après. Pas de build step — tout est servi depuis `index.html`
(`file://`).

## Méthode (boucle)

1. **Capturer l'état AVANT** (audit) → `.claude/mockups/<sujet>-before-{desktop,mobile}.png`
2. **Modifier** `css/style.css` (layout/thème) et/ou le JS de rendu concerné.
3. **Capturer l'état APRÈS** → `.claude/mockups/<sujet>-after-{desktop,mobile}.png`
4. **Comparer** les deux jeux (utiliser `SendUserFile` pour montrer à l'utilisateur).
5. **Vérifier** la non-régression : `node tests/smoke.js`.

Convention de nommage observée dans `.claude/mockups/` : `audit-*` (constat),
`*-before`/`*-after`, versions itératives `hud-v31`/`hud-v32`,
`status-v2a..v2d`, et tailles explicites (`perso-3col-1440x900.png`).

## Driver headless (boilerplate)

S'inspirer des scripts existants : `tests/screenshot-character.js`,
`tests/screenshot-hof.js`, `tests/screenshot-intro.js`,
`tools/screenshot-mockup.js`. Squelette d'un script de capture :

```js
const { chromium } = require('./_playwright.js');   // depuis tests/
const path = require('path');
const INDEX_URL = 'file://' + path.resolve(__dirname, '../index.html');

async function capture(browser, viewport, label, outName, driveState) {
  const ctx  = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${label}] pageerror:`, e.message));
  await page.goto(INDEX_URL, { waitUntil: 'networkidle' });

  // Démarrer une partie jusqu'au jeu
  await page.evaluate(() => document.getElementById('title-screen').click());
  await page.evaluate(() => {
    selectedPartySize = 1;            // ou 2 pour tester le duo
    selectedHeroes    = ['harry'];
    confirmHeroSelection();
    chooseHouse('Gryffondor');
    if (typeof skipIntro === 'function') skipIntro();
    else { const i = document.getElementById('intro-screen'); if (i) i.style.display = 'none'; }
    if (typeof startGame === 'function') startGame(1);
  });
  await page.waitForTimeout(400);

  // Conduire jusqu'à l'écran/modale visé (ex : openCharacter(0), openShop(),
  // startBattle(...), openQuestLog(), openBestiary()...)
  await page.evaluate(driveState);
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.resolve(__dirname, outName), fullPage: false });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const drive = () => { player.gold = 1234; openCharacter(0); };  // état à capturer
  await capture(browser, { width: 1280, height: 800 }, 'desktop', '../.claude/mockups/sujet-after-desktop.png', drive);
  await capture(browser, { width: 380,  height: 800 }, 'mobile',  '../.claude/mockups/sujet-after-mobile.png',  drive);
  await browser.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
```

### Viewports de référence
- **Desktop** : `1280×800` (ou `1200×800`, `1440×900`, `1024×768` pour vérifier
  le multi-colonnes — cf. `perso-3col-*`).
- **Mobile** : `380×800` (ou `375×…`) — déclenche le layout colonne unique.

## Checklist responsive (breakpoint ≤ 700px)

À vérifier sur la capture mobile à chaque retouche (voir CLAUDE.md
« Responsive mobile ») :
- Layout en **colonne unique** : header → left (bandeau HP) → main → footer ;
  panneau droit masqué.
- **D-pad tactile** (`.mobile-dir`) affiché, boutons texte desktop (`.desktop-dir`) masqués.
- Boutons d'action en grille **emoji seul** (`.btn-label` masqué).
- **Touch targets ≥ 44px** (cf. plan `hit-targets-44px.md`).
- Modales **96vw scrollables** ; hauteur en **`100dvh`** (pas `100vh` — barre URL mobile).
- Accordéon fiche perso : `.section-toggle` visible, sections pliables
  (`_toggleCharSection`).
- Pas de débordement horizontal (piège classique : quêtes, voir
  `fix-quest-mobile-overflow.md`).

## Layout fiche perso (`.char-grid`) — rappel zones
Desktop (>700px) : `stats` (220px) à gauche ; `equip`/`houseset`/`spells`/`inv`
empilées à droite. Mobile : une seule colonne. Ne jamais écraser
`#character-modal.innerHTML` (détruirait `#char-detail`, partagé avec le
journal de quêtes).

## Prototypage hors-app (optionnel)
Pour une refonte lourde, prototyper d'abord en HTML statique dans `tools/`
(modèle : `tools/mockup_character_v2.html`) avant de porter dans `css/style.css`.

## Génération d'assets visuels
Pour les **images** (sprites monstres/PNJ, scènes, icônes), ce n'est PAS cette
skill : suivre `IMG_STYLE.md` (Règle A sprites 512² painterly transparents /
Règle B portraits PNJ 256² photoréalistes) et les skills `add-monster` /
`add-item-icon`.

## Toujours finir par
```bash
node tests/smoke.js
```
Et montrer les captures avant/après à l'utilisateur (`SendUserFile`).
