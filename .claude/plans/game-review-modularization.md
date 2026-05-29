# Revue du jeu — modularisation & stratégie de tests

> Statut : revue livrée le 2026-05-28. Outillage de sélection de tests **implémenté**
> (§5). Modularisation = **propositions priorisées**, non appliquées (décision
> utilisateur : « Revue + outillage de tests »).
> Branche : `claude/game-review-modularization-i1Iva`.

---

## 1. Contexte & méthode

Jeu RPG tour-par-tour vanilla JS / Canvas, zéro dépendance, zéro build, servi tel
quel par GitHub Pages. Revue fondée sur l'état réel du dépôt (pas seulement
CLAUDE.md), via : métriques `wc`/`git`, lecture de l'épine dorsale
(`loader.js`, `state.js`, runner de `smoke.js`) et trois explorations ciblées
(tests, cluster réseau, couplage/god-files).

**Métriques clés (2026-05-28)**

| Mesure | Valeur |
|--------|--------|
| Modules JS | **52** (`js/*.js`), ~31 000 lignes |
| Modules documentés dans CLAUDE.md | ~33 (dérive : **19 non documentés**) |
| Plus gros module | `multiplayer.js` (1894 l.) |
| Globals mutables (`state.js`) | ~81 `let` |
| Loader MANIFEST | 249 entrées vérifiées, **0 manquant** au runtime |
| Tests | `smoke.js` = **14 409 l., 121 scénarios, ~1980 assertions** |
| Gate CI sur les tests | **aucune** (CI = déploiement Pages uniquement) |
| Historique | 1er commit 2026-05-22, ~130 commits en mai (développement intense) |

---

## 2. Synthèse exécutive

Le projet est **sain au runtime** (loader vert, 0 global manquant, invariants
`player`/`party` respectés — aucune réassignation interdite) et **très bien
testé fonctionnellement** pour un jeu sans build. Les risques sont surtout de
**maintenabilité** et de **friction d'itération**, pas de bugs latents évidents.

Top constats, par priorité :

1. **🔴 Aucun garde-fou de test en CI.** 121 scénarios existent mais ne tournent
   jamais automatiquement. Une régression peut être mergée + déployée sans alerte.
   → *Adressé* : outillage de sélection livré (§5) + workflow CI proposé.
2. **🟠 `smoke.js` monolithique et tout-ou-rien.** 14 k lignes, 121 lancements
   Chromium séquentiels (~5-10 min), aucun filtre. Itérer sur un seul système
   coûte une suite entière. → *Adressé* : filtre CLI + mapping changement→scénarios.
3. **🟠 Dérive documentaire.** CLAUDE.md décrit 33 modules ; il y en a 52. Tout
   le chantier « Mondes Parallèles / Cheminette » (multiplayer, visit-*, portal-*,
   atelier-voyageur) et l'endgame (forge, library, potions, floor-events) sont absents.
4. **🟠 God-files.** 7 fichiers > 950 lignes concentrent 6-8 responsabilités
   chacun (inventory, quests, movement, battle, ui, dungeon, save). Coutures de
   découpage claires et à faible risque (§4).
5. **🟡 Clé Supabase en clair** (`multiplayer.js:19`). Clé *publishable* (par
   design côté client) — acceptable **si** la sécurité repose entièrement sur les
   Row-Level Security policies. À confirmer/documenter.

---

## 3. Constats détaillés

### 3.1 Dérive documentaire (CLAUDE.md)
19 modules non documentés, dont des sous-systèmes majeurs :
- **Réseau / Mondes Parallèles** : `multiplayer.js` (Supabase REST polling :
  présence fantôme, messages, cadeaux, duels, visites, Verrous de Sang),
  `visit-channel.js`, `visit-hud.js`, `portal-matchmaking.js`, `portal-fx.js`,
  `teleport.js`, `atelier-voyageur.js`.
- **Endgame** : `forge.js`, `library.js`, `potions.js`, `floor-events.js`,
  `endgame.js`, `floor-themes.js` (partiellement documenté).
- **UX / contenu** : `help-tour.js`, `karaoke.js`, `textures.js`, `riddles.js`.

Le MANIFEST de `loader.js`, lui, **est à jour** (couvre les modules réseau en
entrées `optional: true`). La dérive est donc purement documentaire.

### 3.2 God-files & couplage
Tous partagent le scope global (`<script>` séquentiels). Couplage en étoile
autour de quelques globals très chauds : `player` (~254 accès), `party` (~179),
`currentFloor` (~163), `dungeon` (~159). `recalculateStats()` est appelé depuis
13 fichiers. `getElementById` brut est répété ~110× alors que `safeEl()` existe
mais reste sous-utilisé.

Responsabilités mélangées (candidats au découpage — coutures en §4) :
`inventory.js`, `quests.js`, `movement.js`, `battle.js`, `ui.js`, `dungeon.js`,
`save.js`.

### 3.3 Sécurité
- `multiplayer.js:19` : URL + clé anon Supabase en clair. Risque réel **uniquement
  si** les RLS policies ne restreignent pas insert/select par ligne. À auditer côté
  base (hors dépôt).
- Disjoncteur réseau présent (3 échecs → session muette) ; dégradation gracieuse
  en `file://`. Bon.

### 3.4 Tests (état)
- Framework maison : Playwright (`/opt/node22/...` codé en dur) + `assert()` maison.
- 121 scénarios dans **un** fichier, exécutés en boucle ; **chaque scénario relance
  son propre navigateur**. Pas de `process.argv`, pas de tags : **tout-ou-rien**.
- Couverture fonctionnelle large (combat, quêtes, save, dungeon, maisons, réseau,
  puzzles). Trous : perf, multi-navigateur, playout audio réel, viewports multiples.
- `pwa-smoke.js` (serveur HTTP + SW + offline) et 3 scripts screenshot séparés.
- **CI (`deploy.yml`) ne lance aucun test.** Pas de `package.json`, pas de scripts npm.

---

## 4. Proposition de modularisation (priorisée, NON appliquée)

Principe directeur : **découper par responsabilité, sans changer le runtime**.
Comme il n'y a pas de modules ES, un « découpage » = scinder un fichier en
plusieurs `<script>` chargés dans le même ordre, le scope global restant partagé.
Filet de sécurité **déjà en place** : tout nouveau fichier exposant un global
critique s'ajoute au MANIFEST de `loader.js` ; le scénario `Loader` le vérifie.

Ordre recommandé (du plus rentable / moins risqué au plus délicat) :

| # | Cible | Découpage proposé | Risque | Pré-requis test |
|---|-------|-------------------|--------|-----------------|
| 1 | ~~`save.js` (951 l.)~~ ✅ | `save-slots.js` (store) · `save.js` (serialize/apply + façades) · `save-visit-snapshot.js` | Faible (peu d'UI) | fait — 121/121 verts |
| 2 | ~~`dungeon.js` (1010 l.)~~ ✅ | `dungeon-scaling.js` (scaling + astral) · `dungeon.js` (génération) · `dungeon-spawning.js` | Faible (0 accès DOM) | fait — 121/121 verts |
| 3 | `quests.js` (1483 l.) | `quests-templates` (data ~600 l.) · `quests-logic` · `quests-ui` · `riddles-dumbledore` | Moyen | quest/riddle/grimoire |
| 4 | `inventory.js` (1554 l.) | `inventory-core` · `inventory-ui` · `equipment` · `spellbook` | Moyen | equip/item/spell |
| 5 | `battle.js` (1227 l.) | `battle-core` · `battle-status` · `battle-rewards` (+level-up) · `battle-death` | Élevé (état combat) | combat/status/crit/victory |
| 6 | `movement.js` (1334 l.) | `movement-core` · `floor-transitions` · `exploration-ui` · `dungeon-search` | Élevé (overlay couplé) | fountain/search/floorevent |
| 7 | `ui.js` (1047 l.) | `ui-core` · `ui-character-sheet` · `ui-settings` | Élevé (50 `getElementById`) | startup/houseset/uichrome |

Règles de découpage (à respecter à chaque PR) :
- **Une cible par PR**, validée par `node tests/select.js` avant push.
- Mettre à jour `index.html` (ordre des `<script>` + `?v=N`), le MANIFEST du
  loader, `PRECACHE_URLS` de `sw.js`, et `tests/test-map.js`.
- Ne pas « améliorer » le code adjacent (guideline §3) : déplacement à
  l'identique, pas de refactor de logique dans la même PR.
- Quick-win transverse possible en parallèle : généraliser `safeEl()` dans les
  fonctions touchant ≥ 5 IDs (overlays/modales), sans migration de masse.

---

## 5. Stratégie de tests + outillage livré

### 5.1 Ce qui est livré dans cette PR
Mécanisme **rétro-compatible** pour « déclencher un jeu de test pertinent en
fonction du changement appliqué » :

1. **Filtre CLI dans `tests/smoke.js`** (`parseScenarioFilters` + runner).
   Sans argument → comportement inchangé (121 scénarios). Avec argument →
   sous-ensemble par sous-chaîne du nom de scénario, insensible à la casse :
   ```bash
   node tests/smoke.js crit visit          # OU des deux
   node tests/smoke.js --only=save,slot
   SMOKE_ONLY=combat node tests/smoke.js
   ```
   Le runner liste les scénarios retenus et sort en code 2 si le filtre ne
   matche rien.

2. **`tests/test-map.js`** — carte `fichier source → motifs de scénarios`, plus :
   - `FULL_SUITE_TRIGGERS` : `state.js`, `data.js`, `loader.js`, `main.js`,
     `index.html` → modifiés ⇒ **suite complète** (état/données/amorçage partagés).
   - `PWA_TRIGGERS` : `pwa.js`, `sw.js`, `manifest.json` → lance aussi `pwa-smoke.js`.
   - `BASELINE` (`startup`, `loader`) : toujours ajouté en mode filtré (sanity
     peu coûteux ; `loader` revalide le MANIFEST / l'ordre de chargement).

3. **`tests/select.js`** — runner par changement :
   ```bash
   node tests/select.js            # diff de travail + non suivis + commits vs master
   node tests/select.js master     # base explicite
   node tests/select.js --dry-run  # affiche la sélection sans rien lancer
   ```
   Détecte les fichiers modifiés (non indexés, indexés, **non suivis**, et
   `merge-base origin/master...HEAD`), les classe, puis lance `smoke.js` filtré.
   **Repli conservateur** : un fichier `js/` non cartographié ⇒ suite complète
   (la dérive de la carte est donc sûre par défaut, avec avertissement pour
   l'étendre).

**Validations effectuées** :
- `node tests/smoke.js loader startup` → 2/121 sélectionnés, **verts**
  (`loader` report `ok:true`, 249 globals, 0 manquant).
- Cohérence de la carte : **0 motif mort**, **0 scénario non atteignable** (les
  121 scénarios sont couverts par au moins un motif).

### 5.2 Gate CI — **implémenté**
- **Portabilité Playwright** : `tests/_playwright.js` résout `chromium` via
  `require('playwright')` (CI / `npm install`) avec repli sur le chemin global du
  conteneur de dev. Les 5 fichiers de test (`smoke`, `pwa-smoke`, 3 `screenshot-*`)
  l'utilisent.
- **`package.json`** minimal (racine) : `playwright@1.56.1` en devDependency +
  scripts `test` / `test:select` / `test:pwa`. N'affecte pas le jeu (le workflow
  Pages ne copie pas `package.json`/`node_modules` ; `node_modules/` déjà gitignoré).
- **`.github/workflows/test.yml`** : sur `pull_request` et `push: master` →
  `npm install` → `npx playwright install --with-deps chromium` →
  `node tests/smoke.js` (121 scénarios) → `node tests/pwa-smoke.js`.
  `concurrency` annule les runs obsolètes ; `timeout-minutes: 25`.
- **Stratégie retenue** : suite **complète** sur PR et master (exhaustif, ne
  dépend pas de `test-map.js`) ; `select.js` reste l'outil d'itération **locale**.
- **Pour rendre le gate bloquant** : Settings → Branches → Branch protection →
  *Require status checks* → cocher `Smoke + PWA` (non configurable depuis le dépôt).

> ⚠️ Suivi connu : `pwa-smoke.js` montre un flake d'enregistrement Service Worker
> intermittent (`Execution context was destroyed … navigation`, ~1 run sur 3 dans
> le sandbox de dev, **préexistant**). Peut être durci par un retry ciblé autour
> des `page.evaluate` post-navigation — non fait (hors périmètre « gate »).

### 5.3 Recommandé (NON fait — propositions)
- **Découper `smoke.js`** par domaine en suivant le même registre de scénarios
  (cosmétique, à faire après la modularisation source pour aligner les frontières).
- Durcir `pwa-smoke.js` contre le flake SW (cf. suivi ci-dessus).

---

## 6. Backlog priorisé (suggestion)

1. 🔴 ~~**CI test gate**~~ ✅ fait (§5.2) + `package.json` minimal + Playwright portable.
2. 🟠 **Resynchroniser CLAUDE.md** : sections Mondes Parallèles, Endgame
   (forge/library/potions), UX (help-tour/karaoke), textures.
3. 🟠 **Modularisation** par étapes §4 (1 cible / PR, validée par `select.js`).
4. 🟡 **Audit RLS Supabase** + documenter le modèle de sécurité réseau.
5. 🟡 Généralisation ciblée de `safeEl()` ; factoriser les helpers de rendu de
   grille (inventory/battle-ui/ui).

---

## 7. Journal

- 2026-05-28 — Revue rédigée. Outillage de sélection de tests implémenté et
  validé (`tests/smoke.js` filtre, `tests/test-map.js`, `tests/select.js`).
  Modularisation laissée en propositions (§4). Reste ouvert : gate CI,
  resync doc, découpages source.
- 2026-05-28 — Gate CI implémenté (§5.2) : `tests/_playwright.js` (résolveur
  portable), `package.json` minimal, `.github/workflows/test.yml` (smoke + pwa
  sur PR/master). Stratégie : suite complète en CI, `select.js` en local. Suivi :
  flake SW de `pwa-smoke.js` (préexistant).
- 2026-05-28 — Modularisation #1 (§4) : `save.js` (951 l.) découpé en
  `save-slots.js` (store multi-slots, 12 fns) + `save.js` (serialize/apply +
  façades, 10 fns) + `save-visit-snapshot.js` (visite inter-mondes, 7 fns).
  Déplacement verbatim, aucune logique modifiée. Câblage : index.html (ordre
  save-slots → save → save-visit-snapshot + `?v`), sw.js (PRECACHE + CACHE_VERSION
  v9→v10), MANIFEST loader (sources), test-map.js, CLAUDE.md. Validé : suite
  complète verte.
- 2026-05-28 — Modularisation #2 (§4) : `dungeon.js` (1010 l.) découpé en
  `dungeon-scaling.js` (weightedPick/effectiveFloor/scaleMonster/buildEcho, 6
  fns) + `dungeon.js` (génération procédurale, 11 fns) + `dungeon-spawning.js`
  (spawn de quête + garde-fous de maintenance, 6 fns). Déplacement verbatim.
  Câblage : index.html (ordre scaling → dungeon → spawning + `?v`), sw.js
  (PRECACHE + CACHE_VERSION v10→v11), MANIFEST loader, test-map.js, CLAUDE.md.
  Validé : suite complète verte.
