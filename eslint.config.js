// ============================================================
// eslint.config.js — garde-fou statique du JS de jeu
// ------------------------------------------------------------
// Le jeu n'a NI modules ES NI bundler : les 98 fichiers de `js/`
// sont chargés en séquence par `index.html` et partagent un seul
// scope global. C'est un choix assumé (voir CLAUDE.md), mais il
// prive le projet des garanties qu'un système de modules donne
// gratuitement : un identifiant mal orthographié ou une fonction
// devenue orpheline après refactor ne se voient nulle part —
// ni au chargement, ni dans la suite smoke.
//
// D'où ce lint. Deux contraintes dictent la configuration :
//
//   1. `sourceType: 'script'` — surtout PAS 'module'. En module,
//      chaque fichier a son scope et TOUTES les références
//      inter-fichiers deviennent des `no-undef`.
//   2. Les globals du projet sont DÉRIVÉS des sources, pas listés
//      à la main : `projectGlobals()` scanne les déclarations
//      top-level de `js/*.js`. Une liste manuelle dériverait au
//      premier module ajouté — exactement le défaut que les autres
//      garde-fous du dépôt corrigent.
//
// Usage :
//   npx eslint js/                 # lint du code de jeu
//   npx eslint .                   # + tests et outils
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const globals = require('globals');

// Déclarations top-level de js/*.js = le vrai contrat de globals du
// jeu. On parse l'AST plutôt que de faire du grep : une regex rate
// silencieusement les formes réelles du code — déclarateurs multiples
// (`let playerX, playerY, playerDir;`, `const MAP_W = 16, MAP_H = 16;`)
// et surtout les exports `window.X = …` qui sont LE mécanisme
// d'export documenté du projet (`window.safeEl`, `window.UX_safe`,
// `window.checkFloorQuests`…). Un scan approximatif produit des
// centaines de faux `no-undef` et rend le lint inutilisable.
function projectGlobals() {
  const espree = require('espree');
  const dir = path.join(__dirname, 'js');
  const out = Object.create(null);

  // Noms liés par un motif de déclaration (identifiant, déstructuration…).
  function collectPattern(node) {
    if (!node) return;
    switch (node.type) {
      case 'Identifier':
        out[node.name] = 'writable';
        break;
      case 'ObjectPattern':
        node.properties.forEach((p) => collectPattern(p.value || p.argument));
        break;
      case 'ArrayPattern':
        node.elements.forEach(collectPattern);
        break;
      case 'AssignmentPattern':
        collectPattern(node.left);
        break;
      case 'RestElement':
        collectPattern(node.argument);
        break;
    }
  }

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const ast = espree.parse(src, { ecmaVersion: 2022, sourceType: 'script', loc: false });

    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') node.declarations.forEach((d) => collectPattern(d.id));
      else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') collectPattern(node.id);
      // `window.X = …` — export explicite, à n'importe quelle profondeur.
      else if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression' &&
        node.expression.left.type === 'MemberExpression' &&
        node.expression.left.object.type === 'Identifier' &&
        node.expression.left.object.name === 'window' &&
        node.expression.left.property.type === 'Identifier'
      ) {
        out[node.expression.left.property.name] = 'writable';
      }
    }

    // Les `window.X = …` imbriqués (dans un `if`, une IIFE, un bloc)
    // sont des exports tout aussi réels : on les ramasse au texte, le
    // motif étant sans ambiguïté.
    for (const m of src.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) out[m[1]] = 'writable';
  }
  return out;
}

const GAME_GLOBALS = projectGlobals();

module.exports = [
  {
    // Dépendances, artefacts et sorties de test : hors périmètre.
    ignores: ['node_modules/**', 'tools/_shots/**', 'tests/fixtures/**', '_site/**'],
  },
  {
    // ── Code de jeu : scope global partagé, APIs navigateur ──
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...GAME_GLOBALS },
    },
    rules: {
      // Le cœur du sujet : référence à un identifiant qui n'existe
      // nulle part. Sans modules, c'est la seule façon de l'attraper
      // avant que le joueur ne tombe dessus.
      'no-undef': 'error',

      // Erreurs franches qu'aucun test ne couvre systématiquement.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-cond-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-finally': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-sparse-arrays': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-obj-calls': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'require-yield': 'error',

      // Variables locales orphelines (souvent un reste de refactor).
      // Les globals top-level sont EXCLUS : dans cette architecture,
      // une fonction déclarée ici et appelée trois fichiers plus loin
      // est la norme, pas une anomalie.
      //
      // En `warn` et non `error` : 8 occurrences préexistantes (toutes
      // inoffensives — des `const` de symétrie ou des restes de
      // refactor). Les passer en erreur imposerait de modifier 7
      // fichiers `js/` pour du zéro gain fonctionnel, avec bump de
      // cache PWA à la clé. On les signale, on ne bloque pas dessus ;
      // le jour où le compte tombe à zéro, ce niveau passe `error`.
      'no-unused-vars': [
        'warn',
        { vars: 'local', args: 'none', caughtErrors: 'none', ignoreRestSiblings: true },
      ],

      // `no-redeclare` sur les globals : deux `const` de même nom au
      // top-level de deux fichiers = SyntaxError au chargement. Le
      // builtinGlobals attraperait les shadowings d'APIs navigateur,
      // trop bruyants ici — on garde la détection intra-fichier.
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // ── Node : tests, outils, ce fichier ──
    // Les scénarios Playwright et les scripts de capture embarquent du
    // code navigateur dans des callbacks `page.evaluate(...)` : ces
    // fichiers sont légitimement bi-contexte, d'où node + browser.
    files: ['tests/**/*.js', 'tools/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.browser, ...GAME_GLOBALS },
    },
    rules: {
      // PAS de `no-undef` ici, délibérément. Ces fichiers pilotent le
      // jeu via `page.evaluate(...)` : les callbacks s'exécutent dans
      // le contexte navigateur, où les globals du jeu ET ceux posés
      // par une `evaluate` précédente (`window._equipArt`…) existent —
      // mais rien de tout cela n'est analysable statiquement depuis
      // Node. Le taux de faux positifs y est structurel, alors que
      // dans `js/` la règle est exacte et à zéro. Mieux vaut une règle
      // juste sur le code de jeu qu'une règle bruyante partout.
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    // Les 16 fichiers de scénarios partagent un en-tête d'import unique
    // (`const { chromium, path, ROOT, INDEX_URL, … } = require('../lib/harness')`)
    // que chacun n'utilise que partiellement — c'est voulu, ça garde
    // les en-têtes identiques et copiables. Sans cette exception, ce
    // seul motif produit ~90 des 104 avertissements et noie les 10 qui
    // méritent un regard.
    files: ['tests/scenarios/**/*.js'],
    rules: { 'no-unused-vars': 'off' },
  },
  {
    // Le Service Worker a son propre jeu de globals.
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.serviceworker, ...globals.browser },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { vars: 'local', args: 'none' }] },
  },
];
