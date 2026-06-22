# Chapitre 14 — Beat « Grande Salle » post-victoire

> Réf : Ch.14 §14.3.2 (proposition 💡) + Points à trancher #2. Branche :
> `claude/ch14-impl-grande-salle-vhoroc`. **Décision utilisateur** : implémenter
> le beat (lot narratif/UX léger, cosmétique).

## Arbitrage (#2) — comment déclencher « le retour en haut » ?
Le jeu ne « remonte » pas tout seul après victoire (l'escalier 10→11 s'ouvre vers
le bas / la Boucle). **Décision** : le beat se joue au **premier retour réel sur
l'étage 1** (le héros choisit de remonter) post-victoire. Fidèle à
« premier retour en haut » : ceux qui descendent dans la Boucle gardent le Gardien
de la Boucle comme première voix ; ceux qui remontent voient l'école respirer.
**One-shot**, cosmétique, non-bloquant.

## Réutilisation du système existant (surgical)
`maybeScriptedFloorBeat(floor)` (floor-ambiance.js) joue déjà des « scènes écrites
épinglées » par étage (1 = `seuil_familier` pré-victoire, 4, 8). On ajoute une
**variante post-victoire de l'étage 1** : `GRANDE_SALLE_BEAT` (mot de Dumbledore
depuis son cadre, l'école qui respire). Flag one-shot **distinct** (`seenScriptedBeat`
contient déjà l'étage 1).

## Étapes
1. [x] state.js : `let grandeSalleBeatSeen = false;` (près de `seenScriptedBeat`).
2. [x] floor-ambiance.js : const `GRANDE_SALLE_BEAT` + branche post-victoire en
   tête de `maybeScriptedFloorBeat` (floor===1 && victoryAchieved && !flag).
3. [x] save.js : sérialiser/appliquer `grandeSalleBeatSeen` (fallback false legacy).
4. [x] loader.js : MANIFEST `GRANDE_SALLE_BEAT` (obj).
5. [x] Test smoke : bloc Grande Salle ajouté à `scenarioScriptedFloorBeats`
   (gate victoire, one-shot, sérialisation) — vert.
6. [x] Cache-bump (state32 floor-ambiance10 save37 loader43 ; CACHE_VERSION v124).
7. [x] Docs : Ch.14 §14.3.2 (💡→✅) + Points à trancher #2 (tranché).
8. [x] Commit + push + PR + merge.

## Suivi / écarts
- Réutilisation totale du système de beats existant (aucun nouvel overlay/modal) :
  pur texte (setNarrative + toast), comme seuil_familier/4/8.
- Déclencheur = retour réel étage 1 post-victoire (le jeu ne remonte pas seul).
  Si le joueur ne remonte jamais, le beat reste non vu — acceptable (cosmétique).
