# Plan — Quête répétable Hagrid (étoffer le système générique)

## Contexte

Master a livré (itération 5) le squelette générique des quêtes répétables :
`QUEST_TEMPLATES[].repeatable = { everyLevels }` + cooldown par niveau du
joueur via `lastQuestCompletion[id]` + helper `isQuestOfferable(id)` +
chaînes via `npc.questsGiven` + dialogues par quête via
`npc.dialoguesByQuest`. POC sur `chouette_perdue` (répétable tous les 3
niveaux) et `defense_cabane` (chaînée).

## Cible

Étoffer le POC pour rendre la boucle répétable **honnête et incarnée** :

1. **Spawn ciblé à l'acceptation** — quand on (ré)accepte une quête de
   kill répétable, des cibles apparaissent dans les salles libres de
   l'étage courant. Sinon, sur un étage déjà nettoyé, le joueur n'a
   rien à tuer après avoir accepté.
2. **Récompense allégée à partir de la 2e remise** — le balai
   (`broom`) est déjà dans le sac après la 1re remise, le redonner est
   un doublon inutile. On bascule sur `xp/gold` only.

Hors scope :
- Pas de nouveau cooldown : on garde celui par niveau du joueur.
- Pas de dialogue spécifique cooldown : `dialogues.questDone` couvre
  déjà l'état "tout fait pour l'instant" via la mécanique
  `getNpcQuestState() === 'done'` quand la quête n'est pas encore due.
- Pas de migration save : aucun nouveau champ runtime.

## Stratégie technique

- [x] Champ générique `spawnOnAccept: { targetMonsterId, extraRandomCount }`
      sur les templates qui le veulent (juste `chouette_perdue` pour
      l'instant).
- [x] Champ générique `repeatableReward: { xp, gold, item?, spell? }`
      lu par `completeQuest` quand `lastQuestCompletion[id]` est déjà
      renseigné (= la 1re remise est passée).
- [x] Helper `spawnQuestMonsters(targetMonsterId, extraRandomCount)`
      dans `dungeon.js` : place les mobs sur des cellules `FLOOR`
      libres de `enemyMap`, tolère le manque de place.
- [x] Hook dans `acceptQuest` : si `tpl.spawnOnAccept`, appelle le
      helper et redessine donjon + minimap.

## Étapes

| # | Étape | Vérif |
|---|-------|-------|
| 1 | `spawnQuestMonsters` dans `dungeon.js` | Test smoke : spawn sur étage vide |
| 2 | Champs `spawnOnAccept` + `repeatableReward` sur `chouette_perdue` | Lecture template |
| 3 | Hook `acceptQuest` | Test smoke : `enemyMap` peuplé après acceptation |
| 4 | Override reward dans `completeQuest` | Test smoke : 1re donne broom, 2e ne donne pas broom |
| 5 | Cache-bust `dungeon.js?v=3` + `quests.js?v=4` | grep index.html |
| 6 | Test smoke : nouveau scénario `scenarioRepeatableQuestSpawn` | `node tests/smoke.js` vert |

## Décisions verrouillées

- **Cooldown** : on ne touche pas, on hérite de master (par niveau).
- **Dialogue cooldown** : on ne touche pas, `questDone` suffit.
- **`repeatableReward`** : champ optionnel, fallback transparent vers
  `q.reward` si absent.
- **Spawn helper** : générique `(monsterId, count)`, paramètres dans
  le template — pas de hard-code "chouette_perdue" dans le code.
- **Tolérance** : si pas de place dans le donjon, le helper place ce
  qui rentre et retourne 0 sans erreur.
