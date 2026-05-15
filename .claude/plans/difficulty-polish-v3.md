# Plan — Compléments difficulté V3 (sprites + dialogues + smoke)

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items §3.6 « compléments à
> faire ultérieurement » de `difficulty-progression.md` (encore ouvert).
> Pré-requis : Phase 3 de `difficulty-progression` (équipements mid-game
> + respawn) livrée sur master.

## 1. Contexte

`difficulty-progression.md` Phase 3 a livré sur master :
- Respawn ennemis 20 % au revisit d'étage (`floorKillCount`).
- Chaîne de 5 quêtes Dumbledore.
- 6 équipements mid-game (étages 3-7).

Trois polish ont été reportés explicitement à §3.6 :

| Item | Description |
|------|-------------|
| Sprites dédiés des 6 équipements mid-game | Aujourd'hui icônes réutilisées (alias) |
| Dialogues Dumbledore `dialoguesByQuest` | Aujourd'hui messages génériques |
| Smoke test respawn 20 % | Aujourd'hui pas de vérif statistique |

Ce plan les regroupe car ils touchent la même boucle (mid-game endgame).

## 2. Vagues

### Vague A — Sprites dédiés des 6 équipements mid-game

**Items concernés** (commit `a953376 feat(equipment): 6 équipements mid-game`) :
identifier les 6 IDs précis dans `js/data.js` (étages 3-7, ajoutés
par la PR mid-game), capturer leurs icônes actuelles (alias).

**Pipeline** :
- Recette dans `tools/icon_factory.py — RECIPES` pour chaque ID.
- Génération 5 PNG par item via `python3 tools/icon_factory.py <id>`.
- Référencement dans `ITEM_ICON_NEW_REGISTRY` de `js/item-icons.js`.

**Vérification** : ouvrir le jeu, ouvrir l'inventaire avec les 6 items
récupérés, capture comparée avant/après.

**Effort estimé** : ~30 min × 6 = 3 h.

### Vague B — Dialogues Dumbledore `dialoguesByQuest`

**Spec** :
- Étendre l'entrée Dumbledore dans `js/npcs.js` avec un champ
  `dialoguesByQuest: { 'quest_dumb_1': {...}, ..., 'quest_dumb_5': {...} }`.
- `openNpcDialog(dumbledore)` consulte `getActiveDumbledoreQuestId()`
  (helper à créer) et renvoie le bon dialogue selon l'avancée du
  joueur dans la chaîne.
- Si aucune quête Dumbledore active → fallback `dialogues` générique.

**Textes** :
- 5 quêtes × 4 états (`questIntro`, `questInProgress`, `questDone`, `farewell`)
  = 20 dialogues à rédiger.
- Pages courtes (2-3 lignes) pour rester rythmé.

**Implémentation** :
- Modifier `getNpcQuestState(npc)` pour gérer la chaîne Dumbledore
  (déjà partiellement géré ?).
- Brancher dans `_npcDialogPages` pour router selon `quest_dumb_<N>`.

**Smoke** : `scenarioDumbledoreChainDialogues` :
- T1 : aucune quête Dumbledore active → dialogues génériques.
- T2 : `quest_dumb_2` en cours → dialogue spécifique.
- T3 : `quest_dumb_2` completable → message remise spécifique.

### Vague C — Smoke test respawn 20 %

**Spec** :
- Scénario `scenarioRespawn20Percent` dans `tests/smoke.js` :
  - Générer étage 4, compter cellules ennemies initiales (N_initial).
  - Vider 5 cellules (simuler combat + victoire).
  - Goto étage 3, retour étage 4.
  - Compter cellules ennemies (N_after).
  - Asserter : `N_after >= N_initial - 5 + 0.15 * 5` (au moins 1
    cellule respawned avec 20 % moyenne, marge 15 % pour variance).
- Mock `Math.random` pour rendre déterministe sur 3 runs.

**Vérification** : `node tests/smoke.js` vert avec nouveau scénario.

## 3. Étapes

### Vague A — Sprites

- [ ] Identifier les 6 IDs dans `js/data.js` (commit `a953376`).
- [ ] Capturer screenshots actuels (alias).
- [ ] Recette 1/6 dans `tools/icon_factory.py`.
- [ ] Recette 2/6.
- [ ] Recette 3/6.
- [ ] Recette 4/6.
- [ ] Recette 5/6.
- [ ] Recette 6/6.
- [ ] `python3 tools/icon_factory.py <6 ids>`.
- [ ] Référencer dans `ITEM_ICON_NEW_REGISTRY`.
- [ ] Capture comparée + commit + push.

### Vague B — Dialogues Dumbledore

- [ ] Lister les 5 quêtes Dumbledore (`quest_dumb_<1-5>`).
- [ ] Rédiger les 20 dialogues dans un .md de travail.
- [ ] Étendre `npcs.js — dumbledore.dialoguesByQuest`.
- [ ] Helper `getActiveDumbledoreQuestId()` dans `quests.js` ou `npc-dialog.js`.
- [ ] Routing dans `_npcDialogPages`.
- [ ] Smoke `scenarioDumbledoreChainDialogues` (3 sous-cas).
- [ ] Commit + push.

### Vague C — Smoke respawn

- [ ] Ajouter `scenarioRespawn20Percent` dans `tests/smoke.js`.
- [ ] Mock `Math.random` déterministe (graine `respawn_smoke_v1`).
- [ ] Asserter borne statistique.
- [ ] `node tests/smoke.js` vert.
- [ ] Commit + push.

## 4. Risques

- Vague A : 6 recettes lourdes → factoriser en réutilisant les
  silhouettes existantes (`hat-pointy.svg`, `flask.svg`).
- Vague B : la chaîne Dumbledore est déjà câblée côté quêtes, vérifier
  qu'aucune régression de routing.
- Vague C : variance statistique fait flake le test → mock random
  obligatoire.
