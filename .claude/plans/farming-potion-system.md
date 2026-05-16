# Système de Farming d'Herbes & Concoction de Potions

> Branche : `claude/farming-potion-system-SXjie`
> Statut : **plan validé, implémentation à confirmer**

## Objectif

Ajouter une boucle de jeu « herboristerie » :
1. **Récolter** des herbes en explorant (action Fouiller) et en combattant
   (drops de monstres botaniques).
2. **Concocter** des potions chez un PNJ potionniste, avec un jet de
   réussite piloté par la stat **INT** (échec / réussite / réussite critique).

## Décisions de design (validées avec l'utilisateur)

| Question | Choix retenu |
|----------|--------------|
| Source des herbes | Cueillette via `searchRoom()` **+** drops de monstres. Pas de nouvelle cellule, pas de potager qui pousse. |
| Lieu de brassage | Chez un PNJ potionniste (action spéciale de dialogue). |
| Risque | Oui — jet basé sur INT : échec / réussite / critique. |
| Déverrouillage | La concoction est **verrouillée** tant qu'une quête dédiée n'est pas remise. |
| Obtention des recettes | 3 vecteurs : recettes de base offertes par la quête de déverrouillage, certaines en récompense de quête, le reste **découvert par expérimentation au chaudron**. |

### Décisions complémentaires (proposées)

- **Besace d'herboriste séparée** : les herbes ne vont **pas** dans
  l'inventaire 16 slots (qui saturerait). Stockées dans `player.herbs`
  (`{ herbId: count }`), non plafonné. `tryAddItem()` route automatiquement
  tout item `type:"herb"` vers la besace → cueillette ET drops fonctionnent
  sans code dédié à chaque site d'appel.
- **PNJ potionniste** : nouveau PNJ **Horace Slughorn** (maître des Potions,
  canon HP). Chourave est déjà prise (action `claim_house_reward` Poufsouffle)
  et relève de la Botanique, pas des Potions.
- **Recettes** : connaissance stockée dans `player.knownRecipes` (tableau
  d'ids, sérialisé). 3 vecteurs d'obtention — voir section dédiée.
- **Brasseur** : le jet utilise la **meilleure INT** du groupe actif vivant
  (« le meilleur potionniste du groupe »).
- **Icônes** : V1 = fallback emoji 🌿. PNG painterly (`icon_factory.py`) =
  suivi optionnel.
- **Déverrouillage par quête** : voir section dédiée ci-dessous.

## Quête de déverrouillage

Le brassage n'est pas disponible d'emblée. Slughorn donne une quête
d'initiation ; tant qu'elle n'est pas remise, l'action « Concocter » ne
s'affiche pas — seul le flux de quête est proposé.

### Définition (`activeQuests` dans `js/state.js`)

```js
{
  id:        "quest_potions_slughorn",
  title:     "L'Apprenti Potionniste",
  giver:     "Horace Slughorn",
  desc:      "Slughorn ne confie son chaudron qu'aux élèves sérieux. " +
             "Rapporte-lui 3 Racines de Mandragore pour prouver ta valeur.",
  objective: { type:"item", itemId:"mandragore", amount:3 },
  progress:  0,
  reward:    { xp:60, gold:40, recipes:["brew_potion_s","brew_potion_m"] },
  completed: false,
  location:  "Salle des Potions (étage 2)"
}
```

- Objectif de type `item` → réutilise tel quel `checkQuestCompletion()`
  (compte les `mandragore` dans l'inventaire, les consomme à la remise).
- `mandragore` est déjà obtenable (boutique étage 1, `searchRoom`).
- `reward.recipes` → les 2 recettes de base sont apprises à la remise
  (voir section « Obtention des recettes »).
- **Récompense de déverrouillage** : il n'existe pas de type de reward
  « unlock ». Le déverrouillage est **dérivé** de `quest.completed` —
  pas de nouveau flag d'état. `activeQuests` est déjà sérialisé dans le
  save, donc l'état persiste gratuitement.

### Helper de gating (`js/potions.js`)

```js
function _isBrewingUnlocked() {
  const q = activeQuests.find(q => q.id === 'quest_potions_slughorn');
  return !!(q && q.completed);
}
```

### Comportement chez Slughorn

| État de la quête | Dialogue / action |
|------------------|-------------------|
| Non acceptée | `questOffer` + bouton « Accepter la quête » |
| En cours | `questActive`, pas d'action de brassage |
| Remettable | bouton « Remettre » (consomme 3 mandragores) |
| Remise (`completed`) | action spéciale `open_brewing` disponible |

## Modèle de données

### Herbes — nouveaux items `type:"herb"` (`js/data.js`)

~6 herbes en 3 paliers (alignées sur les tranches d'étage) :

| Palier | Étages | Herbes |
|--------|--------|--------|
| 1 | 1–3 | `herbe_armoise` (Armoise), `herbe_ortie` (Ortie séchée) |
| 2 | 4–6 | `herbe_asphodele` (Asphodèle), `herbe_branchiflore` (Branchiflore) |
| 3 | 7+  | `herbe_aconit` (Aconit), `herbe_dictame` (Dictame) |

```js
{ id:"herbe_armoise", name:"Armoise", icon:"🌿", type:"herb", tier:1,
  desc:"Ingrédient de potion.", price:6 }
```

L'item `mandragore` existant reste utilisable comme ingrédient.

### Recettes — `POTION_RECIPES` (`js/data.js`)

```js
{ id, name, resultItemId, ingredients:{herbId:qty,...}, difficulty, lore }
```

| Recette | Produit | Ingrédients | difficulty | Obtention |
|---------|---------|-------------|-----------|-----------|
| `brew_potion_s` | `potion_s` | armoise×2 | 8 | Quête de déverrouillage |
| `brew_potion_m` | `potion_m` | ortie×2 | 8 | Quête de déverrouillage |
| `brew_potion_l` | `potion_l` | asphodèle×2 + armoise×1 | 12 | Récompense de quête |
| `brew_potion_l_sp` | `potion_l_sp` | branchiflore×2 + ortie×1 | 12 | Récompense de quête |
| `brew_potion_force` | `potion_force` | aconit×1 + mandragore×2 | 14 | Expérimentation seule |
| `brew_potion_xl` | `potion_xl` | dictame×2 + aconit×1 + asphodèle×1 | 18 | Expérimentation seule |

> Plus de `minFloor` : les recettes sont désormais gatées par la
> **connaissance** (`knownRecipes`), pas par l'étage. Le gating par étage
> est de toute façon émergent — les herbes de palier 2/3 n'apparaissent
> qu'aux étages profonds. Toute recette reste découvrable par
> expérimentation, même celles déjà distribuées par quête.

## Obtention des recettes

`player.knownRecipes` (tableau d'ids, init `[]`, sérialisé dans le save).
Trois vecteurs :

1. **Recettes de base** — la quête de déverrouillage `quest_potions_slughorn`
   donne `brew_potion_s` + `brew_potion_m` via `reward.recipes`.
2. **Récompense de quête** — `brew_potion_l` et `brew_potion_l_sp` sont
   attachées en `reward.recipes` à 2 quêtes (1 quête de suivi Slughorn +
   1 quête existante — attribution finalisée à l'implémentation).
3. **Expérimentation au chaudron** — seul moyen d'obtenir `brew_potion_force`
   et `brew_potion_xl`, et alternative pour toutes les autres.

### Résolution du brassage

Quel que soit le mode (recette pré-remplie ou herbes posées à la main),
« Lancer le brassage » résout **le contenu du chaudron** : le moteur
construit le multiset d'herbes et cherche une correspondance **exacte**
(mêmes herbes, mêmes quantités) dans `POTION_RECIPES` :

| Cas | Effet |
|-----|-------|
| Correspond à une recette **connue** | Brassage normal (jet INT). |
| Correspond à une recette **inconnue** | **Découverte** : ajout à `knownRecipes`, message « Tu découvres la recette… », puis jet INT pour la potion. |
| Ne correspond à **aucune** recette | Échec : herbes consommées, 0 potion, « Le mélange tourne mal… ». |

> Correspondance exacte (V1) : un mélange approximatif rate. Tunable — on
> pourra assouplir plus tard (indices, correspondance partielle).

### `reward.recipes` (quêtes)

Nouveau champ optionnel sur `reward` d'une quête. `completeQuest()`
(`quests.js`) itère `reward.recipes` et pousse chaque id absent dans
`player.knownRecipes` (avec message + son).

## UX de la concoction — `#brewing-modal`

Le chaudron est le **centre** de l'interface : on remplit visuellement le
chaudron, puis on lance. Pas d'onglets — un seul écran, deux façons de
remplir le chaudron qui convergent vers le même bouton « Lancer ».

### Maquette (desktop)

```
┌──────────────────────────────────────────────┐
│  🧪 Le Chaudron de Slughorn               [×] │
├──────────────────────────────────────────────┤
│              ╔════════════╗                   │
│              ║  CHAUDRON  ║   ← SVG dessiné,   │
│              ║  (SVG) ~~~ ║     liquide animé  │
│              ╚════╤══╤════╝                    │
│   Dans le chaudron :              [ Vider ]    │
│   🌿 Armoise ×2   🍀 Ortie ×1                  │  ← clic = retirer 1
│                                                │
│         [ Lancer le brassage ]                 │  ← désactivé si vide
│         Réussite estimée : 78 %                │
├──────────────────────────────────────────────┤
│  Recettes connues                              │
│  🧪 Potion de Soin   armoise×2      [Préparer] │  ← remplit le chaudron
│  🧪 Potion Magique   ortie×2        [Préparer] │
├──────────────────────────────────────────────┤
│  Ta besace d'herboriste (clic = ajouter)       │
│  🌿 Armoise ×5   🍀 Ortie ×3   🌼 Asphodèle ×1 │  ← clic = +1 au chaudron
└──────────────────────────────────────────────┘
```

### Le chaudron dessiné

SVG inline dans `js/potions.js` (const `_CAULDRON_SVG`, même approche que
`SCENE_ICONS`) : marmite noire ventrue, trois pieds, anse, surface de
liquide. Le liquide est un `<ellipse>` dont la **couleur reflète le mélange
courant** (teinte dominante des herbes posées ; gris-vert quand vide).
Bulles animées en CSS (`@keyframes`), comme le glow de torche existant.
Fallback : si le SVG ne rend pas, un emoji 🥣 de secours.

### Deux façons de remplir le chaudron

1. **À la main (expérimentation)** — clic sur une tuile d'herbe de la
   besace → `+1` de cette herbe dans le chaudron. Clic sur une herbe
   *dans* le chaudron → la retire (`-1`). C'est le seul moyen de
   **découvrir** une recette inconnue.
2. **Recette pré-définie** — bouton « Préparer » sur une ligne de recette
   connue → remplit le chaudron avec exactement ses ingrédients. Désactivé
   (grisé + raison au survol) si la besace n'a pas les herbes. Le joueur
   voit le chaudron se remplir, puis confirme avec « Lancer le brassage ».

> Décision UX : « Préparer » remplit mais **ne brasse pas** — un seul
> chemin de brassage (le bouton principal), le chaudron est toujours le
> reflet de ce qui va être brassé. Évite les brassages accidentels.
> Un raccourci « préparer + lancer » en un clic est notable hors V1.

### État local de la modale

`_cauldronMix = { herbId: qty, … }` — tampon **local** à la modale. Les
herbes ne sont **pas** retirées de `player.herbs` tant que « Lancer » n'est
pas pressé : la besace affiche `player.herbs[id] − _cauldronMix[id]`
(disponible réel), le chaudron affiche `_cauldronMix`. Fermer la modale
sans brasser → `_cauldronMix` jeté, aucune herbe perdue.

### Interactions & retours visuels

| Action | Effet UI |
|--------|----------|
| Clic herbe besace | `_cauldronMix[id]++`, re-render ; bloqué si dispo réelle = 0 |
| Clic herbe chaudron | `_cauldronMix[id]--`, re-render |
| « Vider » | `_cauldronMix = {}`, re-render |
| « Préparer » (recette) | `_cauldronMix` = ingrédients de la recette |
| « Lancer le brassage » | `attemptBrew(_cauldronMix)` → résolution |
| Brassage **réussite** | Glow vert sur le chaudron, potion qui « sort », son `playChestOpen` |
| Brassage **critique** | Étincelles dorées, mention « ×2 » |
| Brassage **échec** | Chaudron qui s'assombrit, volute de fumée, message rouge |
| **Découverte** de recette | Bandeau « Nouvelle recette : … », son `playLevelUp`, la recette rejoint la liste |

Après résolution : `_cauldronMix` vidé, modale re-rendue (besace + recettes
à jour). La modale **reste ouverte** pour enchaîner les brassages.

### Réussite estimée

Sous le bouton, `_brewChance(recipe)` affiche le % pré-calculé à partir de
la meilleure INT du groupe et de `recipe.difficulty`. En mode
expérimentation pur (mélange ne correspondant à aucune recette connue *ni*
inconnue détectable côté UI), on n'affiche pas de % — juste « Résultat
incertain… » pour ne pas divulguer si le mélange est valide.

### Mobile (≤ 700 px)

Tout en colonne unique, modale `96vw` scrollable : chaudron → mélange
courant → bouton → recettes → besace. Tuiles d'herbes en grille `flex-wrap`,
cibles tactiles ≥ 44 px. Pas de drag-and-drop (clic uniquement) — robuste
tactile, hors V1 le drag.

### Visibilité des herbes hors brassage

V1 : la besace n'est consultable que dans `#brewing-modal`. Une section
« Besace d'herboriste » en lecture seule dans `#inventory-modal` est
notée hors périmètre (faible coût, à ajouter si le besoin se confirme).

### Icônes d'herbes

Pas de PNG painterly en V1 (cf. hors périmètre). Pour rester lisible, chaque
herbe reçoit un **emoji distinct** dans son champ `icon` : Armoise 🌿,
Ortie 🍀, Asphodèle 🌼, Branchiflore 🪴, Aconit ☘️, Dictame 🍃.
`getItemIconHtml()` retombe sur cet emoji (aucun PNG enregistré).

## Besace — `player.herbs` (`js/state.js`)

`player.herbs = {}` ajouté à l'init du joueur. Map `herbId → count`.

## Logique du jet INT (`js/potions.js`)

```
brewerInt = max(INT) parmi party.slice(0, partySize) vivants
margin    = brewerInt + rand(1..20) - recipe.difficulty

margin < 0        → ÉCHEC    : herbes consommées, 0 potion
0 ≤ margin < 12   → RÉUSSITE : herbes consommées, 1 potion
margin ≥ 12       → CRITIQUE : herbes consommées, 2 potions
```

- Le jet INT s'applique **après** la résolution recette (connue / découverte).
  Une découverte ratée au jet INT garde quand même la recette apprise — on
  l'a trouvée, on l'a juste mal brassée cette fois.
- Les ingrédients sont **toujours** consommés (c'est le risque).
- Le résultat de la potion passe par `tryAddItem()` (inventaire normal).
  Si l'inventaire est plein → potion perdue, message d'avertissement.
- Pourcentage de réussite pré-calculé et affiché dans la modale.

## Fichiers touchés

| Fichier | Changement |
|---------|-----------|
| `js/data.js` | 6 items herbes + `POTION_RECIPES` |
| `js/state.js` | `player.herbs = {}` + `player.knownRecipes = []` à l'init + quête `quest_potions_slughorn` dans `activeQuests` |
| `js/potions.js` | **NOUVEAU** : besace (`addHerb`/`getHerbCount`/`consumeHerbs`), `_isBrewingUnlocked()`, `learnRecipe()`, `_CAULDRON_SVG`, `_cauldronMix` (tampon local), `openBrewingModal()` (vue chaudron unique), `_renderBrewingModal()` (chaudron + mélange + recettes + besace), `_addToCauldron`/`_removeFromCauldron`/`_fillFromRecipe`/`_clearCauldron`, `attemptBrew(_cauldronMix)` (résolution multiset : match connu / découverte / échec, puis jet INT), `_matchRecipe(mix)`, `_brewChance()` |
| `js/quests.js` | `completeQuest()` : traiter `reward.recipes` → `learnRecipe()` pour chaque id |
| `js/inventory.js` (ou site de `tryAddItem`) | `tryAddItem` : si `item.type==='herb'` → `addHerb()`, retourne `true` |
| `js/movement.js` | `searchRoom()` : nouvelle branche « herbe trouvée » (herbe du palier de l'étage courant) |
| `js/monsters.js` | drops d'herbes sur ~6 monstres botaniques/bêtes (Mandragore Sauvage, Bowtruckle Géant, Bundimun, Niffleur, Kappa, Loup-Garou) |
| `js/npcs.js` | nouveau PNJ `slughorn` : `questsGiven`/`questsTurnedIn` = `["quest_potions_slughorn"]`, `dialoguesByQuest`, `specialAction { type:"open_brewing", label:"🧪 Concocter une potion" }` |
| `js/npc-dialog.js` | `triggerNpcSpecialAction` : branche `open_brewing` → garde `_isBrewingUnlocked()` puis `openBrewingModal()`, **hors** garde `_isSpecialActionSpent` (répétable). `_npcDialogActions` : bouton brassage masqué tant que `_isBrewingUnlocked()` est faux |
| `js/save.js` | sérialiser/restaurer `player.herbs` **et** `player.knownRecipes` dans `_serializeState`/`_applyState` |
| `index.html` | `<script src="js/potions.js">` dans l'ordre de chargement + markup `#brewing-modal` |
| `js/loader.js` | entrée MANIFEST pour `openBrewingModal` |
| `css/style.css` | style de `#brewing-modal` (réutilise les classes modale) : chaudron, tuiles d'herbes, bulles animées (`@keyframes`), états réussite/échec ; bloc responsive ≤ 700 px |
| `tests/smoke.js` | scénario brassage |

## Étapes & vérifications

1. **Données** : herbes + `POTION_RECIPES` + besace + `knownRecipes` +
   routage `tryAddItem`.
   → vérif : `ITEMS.filter(i=>i.type==='herb').length===6`, `POTION_RECIPES`
   défini, `tryAddItem` d'une herbe incrémente `player.herbs`.
2. **Récolte** : `searchRoom()` herbe + drops monstres.
   → vérif : fouiller plusieurs cases finit par donner une herbe ; un kill de
   Mandragore Sauvage peut remplir la besace.
3. **Quête de déverrouillage + `reward.recipes`** : `quest_potions_slughorn`
   dans `activeQuests`, Slughorn donneur + `dialoguesByQuest`, `completeQuest`
   traite `reward.recipes`.
   → vérif : Slughorn propose la quête ; aucune action de brassage tant que
   `completed` est faux ; la remise apprend `brew_potion_s`/`brew_potion_m`.
4. **PNJ + dialogue** : Slughorn + branche `open_brewing` gardée par
   `_isBrewingUnlocked()`.
   → vérif : après remise de la quête, le bouton « Concocter » apparaît ;
   clic ouvre `#brewing-modal`.
5. **UI chaudron + jet INT** : modale vue chaudron, SVG dessiné, besace
   cliquable → `_cauldronMix`, « Préparer » (recette) / clic herbe (manuel),
   `attemptBrew`.
   → vérif : clic herbe besace remplit le chaudron, clic herbe chaudron la
   retire ; « Préparer » sur recette connue pré-remplit ; « Lancer »
   d'une recette connue → potion ajoutée ; herbes insuffisantes → boutons
   désactivés ; échec/critique observables en forçant l'INT ; mélange manuel
   = recette inconnue valide → recette découverte et ajoutée à
   `knownRecipes` ; mélange invalide → échec ; fermer la modale sans brasser
   ne consomme aucune herbe.
6. **Persistance** : besace + recettes connues dans le save.
   → vérif : sauver/charger conserve `player.herbs` et `player.knownRecipes` ;
   l'état `completed` de la quête (donc le déverrouillage) survit au save/load.
7. **Loader + index.html + CSS**.
   → vérif : pas de bandeau rouge loader ; modale stylée.
8. **Test smoke** : `node tests/smoke.js` vert + cas brassage ajouté
   (déverrouillage, brassage d'une recette connue, découverte par expérimentation).

## Hors périmètre V1

- Potager persistant qui pousse (écarté par l'utilisateur).
- Parchemins de recette à trouver dans les coffres (vecteur écarté au profit
  de l'expérimentation au chaudron).
- Indices / correspondance partielle en mode expérimentation (V1 = match
  exact strict).
- Drag-and-drop des herbes vers le chaudron (V1 = clic pour ajouter/retirer).
- Raccourci « préparer + lancer » en un clic sur une ligne de recette.
- Section « Besace d'herboriste » en lecture seule dans `#inventory-modal`.
- Icônes PNG painterly des herbes (emoji distinct par herbe en V1).
- Bonus de qualité de potion (tier supérieur sur critique) — le critique
  donne ×2 quantité, pas un upgrade de tier.

## Journal d'avancement

- 2026-05-16 — Plan rédigé, design validé avec l'utilisateur.
- 2026-05-16 — Ajout d'une quête de déverrouillage (`quest_potions_slughorn`) :
  le brassage n'est accessible qu'après l'avoir remise à Slughorn.
- 2026-05-16 — Obtention des recettes arrêtée : 3 vecteurs (base offerte par
  quête, récompense de quête, expérimentation au chaudron). Ajout de
  `player.knownRecipes`, du mode expérimentation et du champ `reward.recipes`.
- 2026-05-16 — Section UX ajoutée : `#brewing-modal` est une **vue chaudron
  unique** (SVG dessiné), pas d'onglets. Le joueur remplit le chaudron par
  clic (besace → chaudron, manuel/expérimentation) ou via « Préparer » sur
  une recette connue, puis « Lancer le brassage ». Tampon local
  `_cauldronMix` (herbes consommées seulement au lancement). En attente du
  feu vert pour implémenter.
