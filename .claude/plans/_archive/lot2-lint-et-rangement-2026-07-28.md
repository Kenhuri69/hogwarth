# Lot 2 — ESLint (A1) & rangement des plans (P1)

> **Plan vivant** (guidelines §5). Suite du §5 de
> [`revue-sources-contenu-2026-07-28.md`](../revue-sources-contenu-2026-07-28.md),
> rangs 4 et 5, après le lot 1 (mergé — PR #739).
>
> **Statut** : 🏁 livré (2026-07-28).
> **Branche** : `claude/revue-projet-sources-contenu-1fl6nm` (repartie de
> `master` après merge du lot 1, guidelines §6).

---

## A1 — ESLint sur 52 638 lignes de JS à scope global

### Le problème que ça résout

Le jeu n'a ni modules ES ni bundler : les 98 fichiers de `js/` partagent un
seul scope global. C'est un choix assumé, mais il supprime la garantie qu'un
système de modules donne gratuitement — **un identifiant mal orthographié ou
une fonction supprimée ne se voit nulle part** : ni au chargement (le fichier
parse très bien), ni dans la suite smoke (qui ne traverse pas tous les
chemins). `no-undef` est le seul filet possible ici.

### Ce qui a été fait

`eslint.config.js` (flat config, ESLint 9) + `npm run lint` + étape CI
**bloquante** placée après `npm install`.

Deux décisions structurent la config :

1. **`sourceType: 'script'`, surtout pas `'module'`.** En module, chaque
   fichier a son propre scope et **toutes** les références inter-fichiers
   deviennent des `no-undef` — le lint devient inutilisable.
2. **Les globals sont dérivés des sources, pas listés à la main.**
   `projectGlobals()` parse l'AST de `js/*.js` (via `espree`, déjà fourni par
   ESLint) et collecte déclarations top-level **et** exports `window.X = …`.
   Une liste manuelle dériverait au premier module ajouté — le défaut même
   que les autres garde-fous du dépôt corrigent.

> **Le parsing AST n'est pas du zèle.** Une première version regex a produit
> **704 `no-undef`, tous faux** : elle ratait les déclarateurs multiples
> (`let playerX, playerY, playerDir;` → seul `playerX` capté, d'où 129 faux
> positifs sur `playerY`) et les exports `window.X = …`, qui sont pourtant
> **le** mécanisme d'export du projet (`window.UX_safe` : 184 faux positifs à
> lui seul). Après passage à l'AST : **704 → 0**. Même leçon que le lot 1 —
> sur ce dépôt, l'analyse approximative de source ment systématiquement.

### Résultat

| | Avant | Après |
|---|---|---|
| `no-undef` dans `js/` | *non mesuré* | **0** |
| Erreurs bloquantes (toutes règles) | — | **0** |
| Avertissements | — | **13** |

**0 erreur sur l'ensemble du dépôt** — le lint est donc bloquant en CI dès
maintenant, sans avoir eu à toucher une seule ligne de code de jeu.

Les 13 avertissements sont des `no-unused-vars` réels et sans danger :
8 dans `js/` (des `const` de symétrie, des restes de refactor), 2 dans
`tools/`, 2 dans `tests/`, 1 directive `eslint-disable` devenue inutile dans
`sw.js`.

### Arbitrages

- **`no-unused-vars` en `warn`, pas `error`.** Les passer en erreur
  imposerait de modifier 7 fichiers `js/` pour zéro gain fonctionnel — avec
  bump de cache PWA à la clé. On les signale sans bloquer ; le niveau passera
  `error` quand le compte tombera à zéro.
- **`vars: 'local'`** : les globals top-level sont exclus de la règle. Dans
  cette architecture, une fonction déclarée ici et appelée trois fichiers plus
  loin est la norme, pas une anomalie.
- **Pas de `no-undef` sur `tests/` et `tools/`.** Ces fichiers pilotent le jeu
  via `page.evaluate(...)` : les callbacks s'exécutent dans le contexte
  navigateur, avec les globals du jeu et ceux posés par une `evaluate`
  précédente (`window._equipArt`…). Rien de cela n'est analysable
  statiquement depuis Node — 13 faux positifs structurels. Mieux vaut une
  règle exacte sur le code de jeu qu'une règle bruyante partout.
- **`no-unused-vars` désactivé sur `tests/scenarios/`** : les 16 fichiers
  partagent un en-tête d'import unique que chacun n'utilise que
  partiellement (c'est voulu — en-têtes identiques et copiables). Sans cette
  exception, ce seul motif produit ~90 des 104 avertissements et noie les 13
  qui méritent un regard.

### Observation relevée, non corrigée

`rollGroupSize()` (`battle.js:849`) calcule `p5` sans jamais le lire : le
`return 5` final sert de branche par défaut. C'est **correct** — les
probabilités somment à 1 par construction, donc `r < p1+p2+p3+p4` est
toujours vrai quand le plafond est à 3. Le seul cas où `return 5` sortirait
hors endgame serait un résidu de virgule flottante (~1e-16). Signalé pour
mémoire, pas touché (guidelines §3).

---

## P1 — Rangement du répertoire des plans

### Ce qui a été fait

| Action | Détail |
|---|---|
| **13 catalogues de prompts sortis** | `nano-banana-*.md` → `.claude/prompts/` — ce ne sont pas des plans : ni cases à cocher, ni cycle de vie, ni statut |
| **3 plans clos archivés** | `potions-consumables-craft-2.0.md` (« 🏁 P7→P13 LIVRÉS … CLOS »), `spells-magic-system.md` (« LIVRÉ. Chantier clos. »), `ux-polish-review.md` (« 🏁 Chantier CLOS le 2026-06-27 ») → `_archive/` |
| **Liens réparés** | toutes les références entrantes mises à jour, y compris les mentions textuelles en backticks |

**Plans actifs : 59 → 47.**

### Conservatisme assumé

Seuls les plans dont **l'en-tête déclare explicitement la clôture du chantier
entier** ont été archivés. Écartés volontairement :

- `chapters-04-10-lieux-ambiance.md` — « Étape 1 livrée · Étape 2 spécifiée » :
  toujours en cours.
- `immersion-suite-4.md` — la mention « clos » désigne un plan *précédent*.
- `reliquats-backlog.md`, `final-polish-2026-07.md` — ce sont des backlogs
  vivants, pas des chantiers.
- `lot1-quick-wins-2026-07-28.md` — livré, mais laissé auprès de la revue dont
  il est le pendant.

L'audit complet « ce plan est-il réellement livré ? » suppose de croiser 47
documents avec ~740 PRs. Ce n'est pas une passe mécanique et ce lot ne l'a pas
faite : **le stock reste à 47, pas au ~15 visé par la revue.**

### Vérification des liens — et ce qu'elle a révélé

Un déplacement de fichier casse les liens relatifs silencieusement. Le
contrôle a donc été fait par **diff contre `master`**, pas à l'œil :

| | Liens `.md` relatifs cassés |
|---|---|
| `master` (avant) | **76** |
| après ce lot | **71** |
| **introduits par ce lot** | **0** |
| réparés au passage | **5** |

Une première tentative avait cassé **11 liens** (les fichiers déplacés d'un
niveau gardaient leurs `../../docs/…`) — détecté par ce diff, corrigé, et
c'est la raison pour laquelle la mesure est faite contre une baseline plutôt
qu'en absolu.

> **Constat pour plus tard** : **71 liens markdown restent cassés sur
> `master`**, essentiellement des plans archivés dont les `../../` ne
> correspondent plus à leur profondeur depuis leur passage en `_archive/`.
> Purement documentaire, aucun impact runtime. Candidat naturel à un
> `tools/check_md_links.js` sur le modèle de `check_content_refs.js` — non
> fait ici pour ne pas élargir le lot.

---

## Correction d'une affirmation du lot 1

Le log CI de ce lot contient, dans le « Scénario 21 : Phase 4 — items » :

```
T1 couverture → { total: 218, mapped: 218, missing: [], allLoaded: true, failed: [] }
```

**La suite smoke vérifiait donc déjà la couverture d'icônes des items** — et
même le chargement effectif des PNG, ce que `check_content_refs.js` ne fait
pas. L'affirmation du lot 1 (« aucune de ces références n'était couverte par
la suite smoke ») était trop large sur ce point précis.

Ce qui reste exact, et qui fonde A2 : **les références croisées entre
registres** — drops→items, quêtes→monstres/items/sorts/recettes, PNJ→quêtes,
items→sorts, recettes→ingrédients — ne sont couvertes nulle part ailleurs.
C'est là qu'un id renommé passerait toute la CI sans bruit.

Conséquence pratique : l'avertissement « items sans icône » de
`check_content_refs.js` fait doublon avec le scénario 21. Il est conservé (il
coûte zéro et couvre aussi les **sorts**, que le scénario 21 ne teste pas),
mais ce n'est pas lui qui justifie l'outil.

---

## Vérification

- [x] `npm run lint` — **0 erreur**, 13 avertissements
- [x] Étape CI ajoutée dans `test.yml`, après `npm install`
- [x] `node tools/check_content_refs.js` ✅
- [x] `node tools/check_doc_modules.js` ✅
- [x] `node tools/check_cache_versions.js --base origin/master` ✅
- [x] `node tests/units.js` — 1 117 assertions ✅
- [x] Liens `.md` : 0 introduit (diff contre `master`)
- [x] **Aucun `js/`, `css/`, `index.html` ni `sw.js` modifié** → bump de cache
      PWA (§8) non applicable
