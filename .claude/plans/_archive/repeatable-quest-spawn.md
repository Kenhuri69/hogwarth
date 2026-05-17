# Plan — Découvrabilité des quêtes répétables de farming

## Contexte / diagnostic

Les quêtes répétables de farming (`chasse_magizoologiste`, `course_hagrid`)
sont **mécaniquement fonctionnelles** : présentes dans `availableQuests` au
démarrage (`main.js:114`) et pour les old saves (forward-fill `save.js:378`),
couvertes par `scenarioFarmingQuests`.

Le problème signalé (« je n'arrive pas à voir la quête apparaître ») vient du
**taux de spawn des PNJ donneurs** `scamander_random` / `hagrid_random` :

- `dungeon.js` : 50 % de chance d'un PNJ random par étage, **un seul tirage**.
- Pool `getRandomEncountersForFloor` ≈ 8 PNJ random (vendeurs + lore + 2
  donneurs de quête), tirage uniforme.
- P(tomber sur Scamander à un étage donné) ≈ `0.5 × 1/8 ≈ 6 %`.
- Sur toute la plage 3-8, ≈ 32 % de chance de le croiser dans une partie.

## Décision

Séparer la rencontre aléatoire en **deux tirages indépendants** par étage :

1. **Donneur de quête répétable — 70 %.** Pool dédié = PNJ random porteurs
   d'une `questsGiven`, filtré sur les états `offer` / `ready` (quête à
   prendre ou à rendre) pour que chaque spawn forcé montre vraiment une quête.
2. **PNJ ambiant vendeur/lore — 50 %** (comportement existant conservé).

Les deux PNJ peuvent coexister sur un étage (≠ ancien tirage exclusif).

## Étapes

1. **`js/npcs.js`** — ajouter `getRandomQuestGiversForFloor(floor)` et
   `getRandomAmbientNpcsForFloor(floor)`.
   → vérif : `getRandomQuestGiversForFloor(5)` = `[scamander_random,
   hagrid_random]`, `getRandomAmbientNpcsForFloor(5)` ne contient aucun des
   deux. `getRandomEncountersForFloor` inchangé (toujours combiné).

2. **`js/dungeon.js`** — extraire `_placeRandomNpcInRooms(npc, rooms,
   occupied)` (la boucle de placement, désormais 2 call-sites), remplacer le
   bloc 50 % unique par les deux tirages.
   → vérif : `node tests/smoke.js` reste vert.

3. **`tests/smoke.js`** — étendre `scenarioFarmingQuests` :
   - T11 : helpers présents, partition correcte des pools.
   - T12 : test statistique — générer N donjons à l'étage 5, asserter que
     `scamander_random` apparaît dans `npcPlacements` avec une fréquence
     élevée (seuil prudent, p.ex. ≥ 40 % sur 60 tirages).
   - T13 : flux dialogue — PNJ random placé → `getNpcQuestState` = `offer` →
     bouton « Accepter la quête » présent → `acceptQuest` actif.
   → vérif : `node tests/smoke.js` vert, nouveaux T verts.

4. **Run final** `node tests/smoke.js`.

## Suivi

- [x] Étape 1 — helpers npcs.js (`getRandomQuestGiversForFloor`,
      `getRandomAmbientNpcsForFloor`).
- [x] Étape 2 — dungeon.js double tirage (helper `_placeRandomNpcInRooms`
      extrait, bloc 50 % unique → 70 % donneurs gated + 50 % ambiant).
- [x] Étape 3 — couverture smoke : T11 (pools cloisonnés), T12 (statistique
      — 73 % de spawn observé sur 60 donjons étage 5), T13 (flux dialogue
      offer → Accepter → quête active).
- [x] Étape 4 — `node tests/smoke.js` vert (tous scénarios).

## Note

Le scénario `Garde + Ferula` est ponctuellement flaky (jet de dégâts
aléatoire → 44 vs 45 HP attendus). Pré-existant, sans lien avec ce
changement — passe au re-run. Non corrigé ici (hors scope).
