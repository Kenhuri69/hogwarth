# Plan d'exécution — 3 sprints suite à l'audit

Branche : `claude/continue-svg-work-v6BEc` (suite logique du travail
en cours, qui a aussi accueilli la fontaine).

## Vue d'ensemble

Trois sprints atomiques, chacun terminé par un commit + push +
smoke test vert.

| # | Sprint | Risque | Effort |
|---|--------|--------|--------|
| 1 | Sécurité / fixes critiques | Bug gameplay + perf bloquants | M |
| 2 | Propreté / dette technique  | Aucun risque runtime         | S |
| 3 | Extraction SVG `scene-icons.js` | Refactor pur, smoke couvre  | M |

---

## Sprint 1 — Sécurité & fixes critiques

### S1.1 — Softlock solo (bug confirmé) — `js/battle.js`
**Symptôme** : en mode solo, si Harry tombe à 0 PV, le combat ne déclenche pas la mort du groupe — Hermione (qui reste à 28/28 en interne mais inactive en solo) reçoit le tour suivant.

**Sites à corriger** :
1. `battle.js:9` — `allPartyKO()` doit ne considérer que les `partySize` premiers.
2. `battle.js:209` — l'ordre `filter().slice()` masque les KO en solo (filter d'abord retire Harry KO, slice(0,1) prend Hermione). Inverser : `slice(0, partySize).filter(...)`.
3. `battle.js:259` — `currentBattleChar` choisit `1` si Harry KO, alors qu'en solo il n'y a personne. Garder `0` en solo.

**Vérif** : nouveau test smoke « solo death » : `partySize=1, Harry hp=0 → triggerDeath`.

### S1.2 — Cache de patterns texture — `js/renderer.js`
**Symptôme** : `_TEX_PATTERNS` + `_getFloorPattern/_getCeilPattern/_getWallPattern` existent mais `drawCorridor` appelle directement `ctx.createPattern(...)` lignes 279, 326, 359, 400, 455. ~25 patterns alloués/frame.

**Action** : remplacer chaque `ctx.createPattern(_tex, 'repeat')` par l'appel au helper correspondant. Vérifier que les helpers gèrent le cas `_tex` non chargé.

**Vérif** : smoke `scenarioFloorTextures` reste vert (déjà existant).

### S1.3 — try/catch sur `loadGame` et `localStorage.setItem`
**Symptôme** : R1 (slot legacy corrompu → exception) et R2 (`QuotaExceededError` → perte silencieuse).

**Action** :
- `save.js loadGame()` (~ ligne 244) : wrap `JSON.parse` + retourne `null` avec message console si erreur.
- `_writeStore()` et `saveGame()` legacy : try/catch autour de `localStorage.setItem` ; si erreur, `addMsg` user-visible.

### S1.4 — Fuites entre slots — `js/save.js _applyState`
**Symptôme** : R4/R5 — `if (gs.floorDungeons)` et `if (gs.searchedCells)` sautent si absent → l'ancien contenu d'une partie précédente reste.

**Action** : remplacer par assignment inconditionnel avec valeur par défaut :
- `floorDungeons = gs.floorDungeons || {}`
- `searchedCells = new Set(gs.searchedCells || [])`

### S1.5 — Auto-save throttle par raison — `js/save.js autoSave`
**Symptôme** : B3 — `_autoSaveLastAt` global → la séquence `battle-end` puis `fountain-used` 1 s plus tard rejette le second silencieusement.

**Action** : transformer `_autoSaveLastAt` en `Map<reason, ts>`. Whitelist de raisons critiques (`fountain-used`, `level-up`) sans throttle ou avec throttle plus court (500 ms).

### S1.6 — Tests + commit
- Ajouter au moins 2 nouveaux tests smoke : softlock solo, `loadGame` corrupted.
- `node tests/smoke.js` doit rester 100 % vert.
- Commit dédié : `fix(critical): softlock solo + cache textures + résilience save`.

---

## Sprint 2 — Propreté / dette technique

### S2.1 — Code mort
- [ ] `data.js:56` — supprimer `const ENEMIES = MONSTERS;`
- [ ] `main.js:91-95` — supprimer `startGameWithDifficulty()`
- [ ] `ui.js:197-204` — supprimer `addLog()` + ses 4 appelants no-op (`battle.js:88, 340, 373`, `quests.js:230`)
- [ ] `save.js:217-248` — décision : conserver `saveGame()/loadGame()` (utilisés par les tests pour fabriquer la legacy save) mais les marquer clairement « test-only ; production utilise writeSlot/readSlot ».

### S2.2 — Helpers DRY
- [ ] `data.js` — ajouter `const DIRECTIONS = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };` ; remplacer les 3 copies dans `movement.js:7,23` et `ui.js:118`.
- [ ] `inventory.js` — ajouter `tryAddItem(itemOrId, { silent } = {})` qui factorise la garde `length < 16`, le `{ ...item }` defensif, et le message stand. Refactorer les 9 sites.
- [ ] `ui.js` — ajouter `applyPartyMode()` qui synchronise `char-card-1` + `battle-char-indicator`. Remplacer les 3 copies dans `main.js:209-212`, `ui.js:33-34`, `save-ui.js:279-282`.

### S2.3 — Alignement `CLAUDE.md`
- [ ] Section « Système d'objets 3D » : remplacer toute la prose `OBJECT_TYPES`/`objectMap`/`renderObjects` par la vraie architecture `CELL.CHEST/SHOP/CHEST/FOUNTAIN` + `_showExploreOverlay`.
- [ ] Arbre des fichiers : retirer les références à `OBJECT_TYPES`, `objectMap`.
- [ ] Ordre de chargement : ajouter `ux-improvements.js` et `textures.js`.
- [ ] Section quêtes : compter à nouveau (7 quêtes au lieu de 4).
- [ ] Mention « Espace/Entrée → checkObjectInFront » : retirer ou corriger.

### S2.4 — Tests + commit
- Ajouter scénario `scenarioInventoryHelper` (round-trip `tryAddItem` + cap 16).
- Aucune régression attendue.
- Commit dédié : `chore: cleanup dead code + DRY helpers + align CLAUDE.md`.

---

## Sprint 3 — Extraction `scene-icons.js`

### S3.1 — Création du fichier
- [ ] `js/scene-icons.js` — exposer `const SCENE_ICONS = { chest: '<svg…>', shop: '<svg…>', stairs_d: '<svg…>', stairs_u: '<svg…>', fountain: function(opts){…} };`.
- La fontaine reçoit `{ dried: bool }` et retourne le SVG dynamiquement (état tarie/active).

### S3.2 — Branchement dans `index.html`
- [ ] Insérer `<script src="js/scene-icons.js"></script>` juste après `js/icons.js`.
- [ ] Mettre à jour `CLAUDE.md` ordre de chargement.

### S3.3 — Refonte de `_showExploreOverlay`
- [ ] Remplacer chaque grand bloc `iconHtml = '<svg…>'` par `iconHtml = SCENE_ICONS[type]` (ou `SCENE_ICONS.fountain({ dried })` pour la fontaine).
- [ ] Cible : `_showExploreOverlay` passe d'environ 387 lignes à ~80 lignes (logique pure : titres, descriptions, callbacks).

### S3.4 — Tests + commit
- Smoke test reste vert (les SVG sont identiques, seulement déplacés).
- Si possible, ajouter un test léger qui vérifie `typeof SCENE_ICONS.chest === 'string' && SCENE_ICONS.chest.startsWith('<svg')`.
- Commit dédié : `refactor: extract scene SVG to scene-icons.js`.

---

## Critères globaux de fin

- [ ] 3 commits poussés sur `claude/continue-svg-work-v6BEc`.
- [ ] Smoke test `node tests/smoke.js` 100 % vert sur HEAD.
- [ ] `CLAUDE.md` aligné (au plus tard fin Sprint 2).
- [ ] PR mise à jour ou nouvelle PR créée (à la demande utilisateur).

## Journal d'exécution

| Sprint | Date       | Statut | Notes |
|--------|-----------|--------|-------|
| S1     | 2026-05-09 | ✅ | Softlock solo (3 sites battle.js), cache patterns branché (5 sites renderer.js), try/catch save (loadGame, _writeStore, saveGame), reset inconditionnel floorDungeons/searchedCells, throttle autoSave par raison, 3 nouveaux scénarios smoke (15 softlock, 16 corrupt save) + T5 raisons distinctes |
| S2     | —          | ⏳ | — |
| S3     | —          | ⏳ | — |
