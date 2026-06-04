# 3ᵉ groupe de héros — « La Garde de l'Aube » + Agathe Lumiflore

## Contexte
Le jeu organise les héros sélectionnables en **groupes** (« classes »)
présentés comme tuiles à l'étape 2 de la sélection : *Les Héros du Film*
(`data-group="film"`) et *Le Cercle des Astres* (`data-group="astres"`).
L'utilisateur veut un **3ᵉ groupe** (« La Garde de l'Aube ») dont
**Agathe Lumiflore** est la première héroïne.

## Décisions (validées avec l'utilisateur)
- Nom du groupe : **La Garde de l'Aube** (clé `aube`).
- Agathe : rôle **Enchanteresse florale** (support/nature, END/MAG, régén.),
  Maison **Gryffondor** (tenue visible sur la photo source).

## Architecture concernée
`pselOpenGroup(group)` (`js/main.js`) est **générique** : il bascule
l'affichage par `data-group`. Aucun changement JS requis — il suffit
d'ajouter la tuile (Vue A) + la section héros (Vue B, `data-group="aube"`).

## Étapes
1. [x] Portrait — `img/agathe-original.png` + `img/agathe.png` (médaillon
   doré, gemmes ambrées pour le thème « aube »), via transplant de
   l'anneau de `celeste.png` (réf. fille). → vérifié : cadrage tête/épaules OK.
2. [x] Blason groupe — `img/icons/crest_aube.png` (soleil levant) ajouté à
   `tools/gen_intro_icons.py` + régénéré. → vérifié visuellement.
3. [x] `js/data.js` — entrée `CHARACTERS.agathe` (Gryffondor, Enchanteresse
   florale, sorts Episkey/Ferula/Wingardium Leviosa/Protego).
4. [x] `index.html` — tuile `#psel-tile-aube` (Vue A) + section
   `data-group="aube"` avec la carte héros d'Agathe (Vue B).
5. [x] `css/style.css` — fond photo de la tuile `#psel-tile-aube`.
6. [x] Test — vérif headless ciblée (réutilise le harness Playwright) :
   loader OK, 0 erreur JS, ouverture du groupe `aube`, sélection d'Agathe,
   démarrage solo → `party[0]` = Agathe Lumiflore (PV 31, MAG 14, sorts OK,
   portrait `img/agathe.png`).

## Vérifications
- Vérif headless dédiée : ✅ (loader OK, sélection + démarrage Agathe OK).
- `node tests/smoke.js` : la suite complète comporte des **échecs flaky
  préexistants** sur des scénarios randomisés (compte de pièges par étage,
  passif Poufsouffle) — observés AUSSI sur l'état propre `master` (stash),
  donc indépendants de cet ajout (qui ne touche ni la génération de donjon
  ni les passifs de Maison).
