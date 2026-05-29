// ============================================================
// Résolveur Playwright portable
// ============================================================
// En CI / après `npm install`, Playwright est dans node_modules et
// `require('playwright')` le trouve. Dans le conteneur de dev, il n'y a
// pas de node_modules local : on retombe sur l'installation globale
// (/opt/node22). Les tests fonctionnent ainsi dans les deux environnements
// sans configuration. Cf. .claude/plans/game-review-modularization.md §5.2.
let chromium;
try {
  chromium = require('playwright').chromium;
} catch (_) {
  chromium = require('/opt/node22/lib/node_modules/playwright/index.js').chromium;
}
module.exports = { chromium };
