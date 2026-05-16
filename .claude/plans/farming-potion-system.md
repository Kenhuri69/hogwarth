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

### Décisions complémentaires (proposées)

- **Besace d'herboriste séparée** : les herbes ne vont **pas** dans
  l'inventaire 16 slots (qui saturerait). Stockées dans `player.herbs`
  (`{ herbId: count }`), non plafonné. `tryAddItem()` route automatiquement
  tout item `type:"herb"` vers la besace → cueillette ET drops fonctionnent
  sans code dédié à chaque site d'appel.
- **PNJ potionniste** : nouveau PNJ **Horace Slughorn** (maître des Potions,
  canon HP). Chourave est déjà prise (action `claim_house_reward` Poufsouffle)
  et relève de la Botanique, pas des Potions.
- **Recettes** : pas de vecteur d'apprentissage séparé. Les recettes
  affichées chez le PNJ sont filtrées par `currentFloor >= recipe.minFloor`
  (même logique que le catalogue de boutique).
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
  reward:    { xp:60, gold:40 },
  completed: false,
  location:  "Salle des Potions (étage 2)"
}
```

- Objectif de type `item` → réutilise tel quel `checkQuestCompletion()`
  (compte les `mandragore` dans l'inventaire, les consomme à la remise).
- `mandragore` est déjà obtenable (boutique étage 1, `searchRoom`).
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
{ id, name, resultItemId, ingredients:{herbId:qty,...}, difficulty, minFloor, lore }
```

| Recette | Produit | Ingrédients | difficulty | minFloor |
|---------|---------|-------------|-----------|----------|
| `brew_potion_s` | `potion_s` | armoise×2 | 8 | 1 |
| `brew_potion_m` | `potion_m` | ortie×2 | 8 | 1 |
| `brew_potion_l` | `potion_l` | asphodèle×2 + armoise×1 | 12 | 4 |
| `brew_potion_l_sp` | `potion_l_sp` | branchiflore×2 + ortie×1 | 12 | 4 |
| `brew_potion_force` | `potion_force` | aconit×1 + mandragore×2 | 14 | 5 |
| `brew_potion_xl` | `potion_xl` | dictame×2 + aconit×1 + asphodèle×1 | 18 | 7 |

### Besace — `player.herbs` (`js/state.js`)

`player.herbs = {}` ajouté à l'init du joueur. Map `herbId → count`.

## Logique du jet INT (`js/potions.js`)

```
brewerInt = max(INT) parmi party.slice(0, partySize) vivants
margin    = brewerInt + rand(1..20) - recipe.difficulty

margin < 0        → ÉCHEC    : herbes consommées, 0 potion
0 ≤ margin < 12   → RÉUSSITE : herbes consommées, 1 potion
margin ≥ 12       → CRITIQUE : herbes consommées, 2 potions
```

- Les ingrédients sont **toujours** consommés (c'est le risque).
- Le résultat de la potion passe par `tryAddItem()` (inventaire normal).
  Si l'inventaire est plein → potion perdue, message d'avertissement.
- Pourcentage de réussite pré-calculé et affiché dans la modale.

## Fichiers touchés

| Fichier | Changement |
|---------|-----------|
| `js/data.js` | 6 items herbes + `POTION_RECIPES` |
| `js/state.js` | `player.herbs = {}` à l'init + quête `quest_potions_slughorn` dans `activeQuests` |
| `js/potions.js` | **NOUVEAU** : besace (`addHerb`/`getHerbCount`/`consumeHerbs`), `_isBrewingUnlocked()`, `openBrewingModal()`, `_renderBrewingList()`, `attemptBrew()`, `_brewChance()` |
| `js/inventory.js` (ou site de `tryAddItem`) | `tryAddItem` : si `item.type==='herb'` → `addHerb()`, retourne `true` |
| `js/movement.js` | `searchRoom()` : nouvelle branche « herbe trouvée » (herbe du palier de l'étage courant) |
| `js/monsters.js` | drops d'herbes sur ~6 monstres botaniques/bêtes (Mandragore Sauvage, Bowtruckle Géant, Bundimun, Niffleur, Kappa, Loup-Garou) |
| `js/npcs.js` | nouveau PNJ `slughorn` : `questsGiven`/`questsTurnedIn` = `["quest_potions_slughorn"]`, `dialoguesByQuest`, `specialAction { type:"open_brewing", label:"🧪 Concocter une potion" }` |
| `js/npc-dialog.js` | `triggerNpcSpecialAction` : branche `open_brewing` → garde `_isBrewingUnlocked()` puis `openBrewingModal()`, **hors** garde `_isSpecialActionSpent` (répétable). `_npcDialogActions` : bouton brassage masqué tant que `_isBrewingUnlocked()` est faux |
| `js/save.js` | sérialiser/restaurer `player.herbs` dans `_serializeState`/`_applyState` |
| `index.html` | `<script src="js/potions.js">` dans l'ordre de chargement + markup `#brewing-modal` |
| `js/loader.js` | entrée MANIFEST pour `openBrewingModal` |
| `css/style.css` | style de `#brewing-modal` (réutilise les classes modale existantes) |
| `tests/smoke.js` | scénario brassage |

## Étapes & vérifications

1. **Données** : herbes + recettes + besace + routage `tryAddItem`.
   → vérif : `ITEMS.filter(i=>i.type==='herb').length===6`, `POTION_RECIPES`
   défini, `tryAddItem` d'une herbe incrémente `player.herbs`.
2. **Récolte** : `searchRoom()` herbe + drops monstres.
   → vérif : fouiller plusieurs cases finit par donner une herbe ; un kill de
   Mandragore Sauvage peut remplir la besace.
3. **Quête de déverrouillage** : `quest_potions_slughorn` dans `activeQuests`,
   Slughorn donneur + `dialoguesByQuest`.
   → vérif : Slughorn propose la quête ; aucune action de brassage tant que
   `completed` est faux.
4. **PNJ + dialogue** : Slughorn + branche `open_brewing` gardée par
   `_isBrewingUnlocked()`.
   → vérif : après remise de la quête, le bouton « Concocter » apparaît ;
   clic ouvre `#brewing-modal`.
5. **UI brassage + jet INT** : modale, liste filtrée par étage, `attemptBrew`.
   → vérif : recette réalisable → potion ajoutée ; recette sans herbes →
   bouton désactivé ; échec/critique observables en forçant l'INT.
6. **Persistance** : besace dans le save.
   → vérif : sauver/charger conserve `player.herbs` ; l'état `completed` de
   la quête (donc le déverrouillage) survit au save/load.
7. **Loader + index.html + CSS**.
   → vérif : pas de bandeau rouge loader ; modale stylée.
8. **Test smoke** : `node tests/smoke.js` vert + cas brassage ajouté.

## Hors périmètre V1

- Potager persistant qui pousse (écarté par l'utilisateur).
- Icônes PNG painterly des herbes (fallback emoji en V1).
- Apprentissage de recettes via livres/PNJ (filtrage par étage suffit).
- Bonus de qualité de potion (tier supérieur sur critique) — le critique
  donne ×2 quantité, pas un upgrade de tier.

## Journal d'avancement

- 2026-05-16 — Plan rédigé, design validé avec l'utilisateur.
- 2026-05-16 — Ajout d'une quête de déverrouillage (`quest_potions_slughorn`) :
  le brassage n'est accessible qu'après l'avoir remise à Slughorn. En attente
  du feu vert pour implémenter.
