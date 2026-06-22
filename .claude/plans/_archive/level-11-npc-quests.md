# Quêtes des PNJ en Boucle Ténébreuse (étages 11+)

## Problème

En Boucle (étages 11+), `getNpcsForFloor()` recycle tous les PNJ via
`effectiveFloor`, mais **seul le Gardien de la Boucle** (étage 11) propose des
quêtes répétables. Les autres PNJ recyclés se figent sur l'état `done` (quêtes
one-shot déjà rendues) ou n'ont jamais eu de quête (vendeurs) :

- Kingsley (18), Bill (19), Sirius (20) → quêtes one-shot `done`.
- Apothicaire (19), Forgeron (20), Marchand Clandestin (18) → boutique seule.

→ « tous les PNJ dans la boucle sans proposition d'interaction ».

## Décision (validée AskUserQuestion)

4 mécaniques, **itération ciblée** (proprement + tests), réutilisant au maximum
la machinerie existante (`repeatable.everyLevels`, `rollOnAccept`/farming,
`spawnOnAccept`). Une seule extension moteur : le type d'objectif `search`.

| PNJ | Étage Boucle | Mécanique | Quête |
|-----|------|-----------|-------|
| Kingsley | 18 | **Chasse** | farming kill (loop) répétable |
| Bill | 19 | **Chasse** | farming kill (loop) répétable |
| Sirius | 20 | **Chasse** | farming kill (loop) répétable |
| Marchand Clandestin | 18 | **Fouille** | `search` N recoins (NOUVEAU type) |
| Apothicaire | 19 | **Collecte** | `herb` ×6 → or + potion |
| Forgeron | 20 | **Collecte** | `item` essence_tenebres ×3 → or + page |
| Gardien de la Boucle | 11 | **Boss** | prime de boss (spawnOnAccept) premium |

## Étapes

1. **Gate par étage dans `isQuestOfferable`** (quests.js) → vérifier :
   `tpl.minFloor` et `rollOnAccept.minFloor/maxFloor`. Empêche l'offre d'un
   bouton « Accepter » hors zone jouable. *Bonus* : corrige les farming
   existantes (Scamander/chasse) qui montraient un bouton cassé hors fourchette.
   - verify: unit/smoke — chasse_magizoologiste reste offerable étage 5, plus
     offerable étage 1/12 ; nouvelles loop quests offerables seulement étage ≥ 11.

2. **Type d'objectif `search`** :
   - `quests.js` : `window.checkSearchQuests()` (incrémente l'étape `search`
     active) + label dans `_renderQuestStep`.
   - `movement-interactions.js` : hook dans `searchRoom()` — une fouille fraîche
     non interrompue compte (`!repeat`).
   - verify: smoke — accepter la quête marchand, fouiller → progress monte,
     remise possible.

3. **`_rollFarmingTarget` (kind item)** : remplacer le `à Hagrid` codé en dur par
   `quest.giver` (généralise aux vendeurs). Comportement Hagrid inchangé.

4. **Templates** (quests-templates.js) : 3 chasses, 1 fouille, 2 collectes,
   1 prime de boss. Gates `minFloor:11` (+ rollOnAccept range pour les chasses).

5. **PNJ** (npcs.js) : `questsGiven`/`questsTurnedIn` + `dialoguesByQuest`
   (offer/active/ready) pour les 7 PNJ.

6. **Tests** : scénario dédié `scenarioLoopNpcQuests` (tests/scenarios/quests.js)
   — templates présents, gate étage, type search, collecte. `node tests/smoke.js`.

7. **Cache PWA** : bump `?v` de quests.js, quests-templates.js,
   movement-interactions.js, npcs.js (skill cache-bump) + CACHE_VERSION.

## Suivi

- [x] Recherche & design
- [x] Étape 1 — gate isQuestOfferable (minFloor + rollOnAccept range)
- [x] Étape 2 — type search (checkSearchQuests + hook searchRoom + label)
- [x] Étape 3 — _rollFarmingTarget giver (généralisé hors Hagrid)
- [x] Étape 4 — templates (3 chasses, 1 fouille, 2 collectes, 1 boss)
- [x] Étape 5 — PNJ (questsGiven + dialoguesByQuest sur 7 PNJ)
- [x] Étape 6 — tests (scenarioLoopNpcQuests + suite : 228 ✅, units 695 ✅)
- [x] Étape 7 — cache bump (v166 ; quests/quests-templates/npcs/movement-interactions)

## Écarts / notes

- Le gate `isQuestOfferable` corrige aussi un bug latent : les farming
  existantes (Scamander/chasse_magizoologiste) n'affichent plus de bouton
  « Accepter » hors de leur fourchette d'étages (où l'accept échouait).
- Les chasses (farming) ne donnent que XP/or (la passe farming écrase l'item de
  reward) — conforme au design farming. Les matériaux viennent de la collecte,
  de la fouille et de la prime de boss.
- Échec smoke `DungeonTraps` observé une fois : flakiness statistique
  pré-existante (1/20 générations hors plage), 3/3 verts en isolation, sans
  rapport avec ce changement.
