# G1 — Boucle de jeu

**Statut :** 🟩 à jour — couvre les systèmes récents (relecture design en continu)

> 📊 **Statut réel (code)** : ✅ boucle macro implémentée (explore → combat →
> équipe → descend) — modules : `js/movement.js`, `js/battle.js`, `js/dungeon.js`,
> `js/shop.js`. Référence technique : [`CLAUDE.md`](../../CLAUDE.md).

> Objectif du chapitre : décrire la **boucle macro** du jeu — de l'exploration
> du donjon en vue pseudo-3D à la descente vers l'étage suivant — et le rythme
> qui en découle : explorer → combattre → récupérer → s'équiper → descendre.

---

## Vue d'ensemble

✅ (dans le jeu) Le jeu est un **dungeon crawler** en perspective pseudo-3D.
Le joueur (1 ou 2 héros selon le mode choisi) explore un château souterrain
étage par étage, combat des créatures, collecte et équipe du butin, puis
descend l'escalier vers un étage plus profond — et plus dangereux. La
**profondeur est l'axe dramatique** : la menace croît à mesure qu'on s'enfonce,
jusqu'au boss final (étage 10) puis la Boucle Ténébreuse post-victoire (étages
11+).

La boucle résumée :

```
Explorer le niveau → rencontres de combat → récompenses (XP / or / loot)
    → récupérer (fontaine / repos / boutique) → s'équiper → coffres
    → trouver l'escalier → descendre → recommencer
```

---

## Fonctionnement

### 1. Déplacement en vue pseudo-3D

✅ (dans le jeu — `movement.js`) Le joueur se déplace par **pas unitaires sur
une grille 16 × 16** (`MAP_W = MAP_H = 16`, `data.js`). Les contrôles sont
**relatifs à la direction du regard** (`playerDir`), à la façon d'un dungeon
crawler classique :

| Action | Touches | Résultat |
|--------|---------|----------|
| Avancer | ↑ / W / Z | Un pas dans la direction regardée |
| Reculer | ↓ / S | Un pas en arrière (orientation conservée) |
| Pivoter gauche | ← / A / Q | Rotation 90° sans se déplacer |
| Pivoter droite | → / D | Rotation 90° sans se déplacer |

Swipe sur le canvas (mobile) reproduit ces mêmes actions (seuil 30 px sur l'axe
dominant). Le D-pad tactile reste disponible en parallèle.

Chaque pas décrémente le `restCooldown` et le buff **Félix Felicis** actif (s'il
est en cours), et déclenche un son de pas via `AudioSystem.playFootstep()`.

### 2. Structure d'un étage

✅ (dans le jeu — `dungeon.js`) Chaque étage est **généré procéduralement** à
la première visite. La topologie de base comprend :

- **7 salles** (majoritairement 3 × 3 cases), séparées par des couloirs en L.
- Une **épine dorsale** de 4 salles reliées en série : spawn → salles
  intermédiaires → salle escalier descendant.
- **3 salles en cul-de-sac** greffées sur l'épine — récompensées d'un coffre
  garanti ou d'un autel (~25 %).

La salle de départ contient l'escalier montant (étages 2+). La dernière salle
de l'épine contient l'escalier descendant. Le chemin entre les deux n'est pas
forcément direct : le joueur traverse des couloirs, des salles intermédiaires
et des embranchements.

> ❓ À détailler : génération des événements d'étage (« Veine de trésors »,
> « Marché ambulant », « Étage piégé », « Étage runique ») — voir
> `dungeon.js — rollFloorEvent` et `movement-floors.js — _announceFloorEvent`.

### 3. Cellules spéciales

✅ (dans le jeu — `data.js`, `movement.js`, `movement-interactions.js`)
Marcher sur une cellule spéciale déclenche un **overlay d'exploration** (titre,
description, boutons d'action). Les principales :

| Cellule | Constante | Apparition | Interaction |
|---------|-----------|------------|-------------|
| Coffre | `CELL.CHEST = 6` | Salles épine (~30 % base) et culs-de-sac (garantis) | `openChest()` — or, consommable, équipement ou grimoire |
| Boutique | `CELL.SHOP = 5` | Salles épine (~20 % base) | `openShop()` — catalogue progressif par étage |
| Escalier descendant | `CELL.STAIRS_D = 3` | Dernière salle de l'épine | `goDeeper()` |
| Escalier montant | `CELL.STAIRS_U = 4` | Salle spawn (étages 2+) | `goUp()` |
| Fontaine | `CELL.FOUNTAIN = 7` | Étages 2, 5, 8, 11… (`(floor−2) % 3 === 0`) | `useFountain()` — soin total, 1×/visite |
| PNJ | `CELL.NPC = 8` | Placé déterministement selon l'étage | Dialogue, quête, action spéciale |
| Autel | `CELL.ALTAR = 12` | Culs-de-sac (~25 %) | Tribut risque/récompense, 1×/visite |

Des cellules supplémentaires sont disponibles en endgame ou comme contenu
optionnel : `FORGE = 9`, `LIBRARY = 10`, `RUNE = 13` (dalle de puzzle),
`STELE = 14` (stèle d'énigme), `TRAP = 11` (piège caché), `GARDEN = 15`
(jardin d'herbes), `REQUIREMENT = 16` (Salle sur Demande).

### 4. Rencontres ennemies

✅ (dans le jeu — `movement.js`, `battle.js`) Les ennemis sont placés sur la
carte (`enemyMap`). Marcher sur une case occupée **déclenche un combat au tour
par tour** (voir [G2 — Combat](G2-combat.md)). Après victoire, l'ennemi est
retiré de la case et des récompenses sont distribuées (XP, or, drops).

### 5. Fouille

✅ (dans le jeu — `movement-interactions.js — searchRoom`) Le bouton
« Fouiller » (`btn-search`) permet d'inspecter la case courante. Les
probabilités de base (jets cumulatifs sur `Math.random()`) :

| Résultat | Seuil |
|----------|-------|
| Or | roll < **0.20** (`SEARCH_GOLD_THRESHOLD`, `data.js`) |
| Objet (1ʳᵉ fouille) | roll < **0.35** (`SEARCH_ITEM_THRESHOLD`, `data.js`) |
| Herbe (1ʳᵉ fouille) | roll < 0.35 + 0.20 = **0.55** |
| Rien | sinon |

En parallèle, deux jets **indépendants** et prioritaires se tirent avant le
butin :
- **1 % de monstre** (`SEARCH_MONSTER_CHANCE = 0.01`, `data.js`) → combat immédiat.
- **1 % de piège** (`SEARCH_TRAP_CHANCE = 0.01`, `data.js`) → dégâts ou drain.

La fouille possède un **cooldown de recharge** : après chaque utilisation, la
case est bloquée pendant un nombre de pas défini par la difficulté
(`DIFFICULTY_SETTINGS[difficulty].searchRechargeSteps`, défaut 60 pas —
`movement-interactions.js`). Une seconde fouille avant recharge donne un butin
dégressif (or à moitié, pas d'objets). La Fortune du groupe (`partyFortune()`)
améliore le seuil objet et la quantité d'or.

La fouille peut aussi, en priorité et **sans consommer la recharge** :
- Désamorcer des pièges (`CELL.TRAP`) dans les 8 cases adjacentes.
- Révéler un passage secret (mur caché) adjacent.
- Révéler un jardin d'herbes caché.

### 6. Repos

✅ (dans le jeu — `movement-interactions.js — rest`) Le bouton « Repos »
permet de récupérer partiellement hors combat :

- **Soin** : +30 % PV max + +30 % PM max pour chaque membre du groupe.
- **Cooldown** : 5 pas avant de pouvoir se reposer à nouveau (`restCooldown = 5`,
  `movement-interactions.js`). Ce cooldown est remis à zéro à chaque transition
  d'étage (`_changeFloor`, `movement-floors.js`).
- **Risque d'interruption** : 30 % de chance d'être interrompu par une rencontre
  (`REST_ENCOUNTER_CHANCE = 0.3`, `data.js`) — dans ce cas, le groupe conserve
  tout de même **50 %** du soin de repos (`REST_INTERRUPT_HEAL_FRACTION = 0.5`,
  `data.js`) avant le combat.

Le repos est une ressource de **petite récupération** : c'est la fontaine qui
assure la restauration complète.

### 7. Coffre — répartition du butin

✅ (dans le jeu — `movement-interactions.js — openChest`) À chaque ouverture
de coffre ordinaire, le jeu tire un résultat parmi quatre catégories (probabilités
de base, Fortune ajuste l'or et l'Éclat de Vitalité) :

| Catégorie | Probabilité |
|-----------|-------------|
| Or | **38 %** |
| Consommable (ou Éclat de Vitalité à partir de l'ét.3) | **30 %** |
| Équipement | **22 %** (repli sur or si aucun équipement éligible) |
| Grimoire de sorts (si disponible à cet étage) | **10 %** |

Les **coffres de puzzle** (dalle-rune ou stèle d'énigme) ont un butin dédié
plus généreux : or × étage (doublé si événement « Étage runique ») +
équipement « best-of-3 » biaisé vers la qualité.

### 8. Fontaine — soin total

✅ (dans le jeu — `movement-interactions.js — useFountain`) Boire à la fontaine
restaure **100 % PV et PM** de tous les membres du groupe (sauf les KO). Elle
est utilisable **1 seule fois par visite d'étage** (`usedFountains` Set —
remis à zéro à chaque entrée sur l'étage, y compris après retour au cache).
Elle apparaît garantie aux étages 2, 5, 8, 11, … (`floor >= 2 && (floor − 2) % 3 === 0`).

### 9. Transition d'étage — goDeeper / goUp

✅ (dans le jeu — `movement-floors.js`) Emprunter l'escalier descendant appelle
`goDeeper()`, l'escalier montant appelle `goUp()`. La mécanique est identique :

1. **Sauvegarde de l'étage courant** dans le cache (`_saveFloorToCache`) :
   état du donjon, positions des ennemis, cases fouillées, PNJ, puzzles, etc.
   Les `usedFountains` **ne sont pas** archivées — elles se réinitialisent à
   chaque visite.
2. **Transition visuelle** : animation de fondu + nom de la zone cible.
3. **Restauration ou génération** du nouvel étage depuis `floorDungeons` (cache)
   ou `generateDungeon()` si c'est la première visite.
4. **Auto-sauvegarde** (`autoSave('floor-down'|'floor-up')`) déclenchée
   automatiquement à chaque transition.

**Garde-fou endgame** : l'escalier de l'étage 10 reste **scellé** tant que
Voldemort Ressuscité n'a pas été vaincu (`victoryAchieved === false`) —
message narratif si le joueur tente de passer.

**Transition de tranche** (`_maybePlayTierTransition`) : franchir une frontière
de thème (étages 3↔4, 6↔7, 13↔14) déclenche un fondu noir de 600 ms et un
toast. À l'intérieur d'une même tranche, aucune animation.

### 10. Respawn et farming

✅ (dans le jeu — `movement-floors.js — _respawnEnemiesOnEntry`) À chaque
**retour sur un étage déjà visité**, 20 % des cases où un ennemi a été vaincu
voient un ennemi réapparaître (`ENEMY_RESPAWN_CHANCE = 0.20`). Un toast narratif
signale le respawn ; son intensité escalade selon le nombre de visites :

| Niveau de visite (`n = kills / 4`) | Message |
|-------------------------------------|---------|
| n ≤ 1 | « Quelques ombres se reforment dans les couloirs. » |
| n ≤ 3 | « Les ombres se reforment plus nombreuses cette fois. » |
| n ≤ 5 | « Tu sens des présences hostiles se rassembler — ta présence dérange. » |
| n ≥ 6 | « Le château pulse de menaces. L'étage te défie ouvertement. » |

Ce mécanisme de **farming** est volontaire : rester sur un étage augmente
progressivement la densité des groupes ennemis (voir [G8 — Difficulté &
scaling](#)) et permet d'accumuler XP, or et drops avant de descendre.

---

## Règles & valeurs

### Profondeur et thèmes

✅ (dans le jeu — `floor-themes.js`) Le rendu visuel et la musique ambiante
changent selon la **tranche d'étages** :

| Tranche | Étages | Ton | Ambiance musicale |
|---------|--------|-----|--------------------|
| A — Couloirs de Poudlard | 1–3 | Familier, école | `intro` |
| B — Cachots de Poudlard | 4–6 | Descente, austère | `dungeon` |
| C — Profondeurs Oubliées | 7–13 | Inconnu, abyssal | `depths` |
| D — Ruines Anciennes | 14+ | Endgame, runique | `abyss` |

La musique de combat s'adapte aussi : sample `epic` pour les boss, `combat_late`
à partir de l'étage 10, sinon selon la difficulté choisie.

### Auto-sauvegarde

✅ (dans le jeu — `save-slots.js`, `movement-floors.js`, `battle.js`) Le jeu
sauvegarde automatiquement dans le slot `auto` :

| Déclencheur | Raison enregistrée |
|-------------|--------------------|
| Transition d'étage vers le bas | `'floor-down'` |
| Transition d'étage vers le haut | `'floor-up'` |
| Fin de combat (victoire ou fuite) | `'battle-end'` / `'battle-flee'` |
| Level-up | `'level-up'` |
| Utilisation de fontaine | `'fountain-used'` |

Un throttle de 1 500 ms évite les sauvegardes en rafale. La sauvegarde est
refusée pendant un combat (`inBattle`) ou avant le choix de Maison.

### Inventaire et équipement

✅ (dans le jeu) L'inventaire est **partagé entre les deux héros** et limité à
**16 emplacements** (`player.inventory.length < 16` dans `tryAddItem`). L'or
est aussi partagé (`player.gold`). L'équipement est en revanche **personnel** :
chaque héros a ses propres slots (`c.equipped`). Voir [G5 — Équipement](#).

---

## Interactions

- **[G2 — Combat](G2-combat.md)** : toute rencontre ennemie interrompt
  l'exploration et bascule en mode combat — le retour à la carte n'a lieu
  qu'après victoire ou fuite.
- **G3 — Progression** : l'XP (partagée) est accumulée dans les combats ;
  les level-ups distribuent points de stats et sorts nouveaux.
- **G4 — Maisons** : chaque kill rapporte des points de Maison (8 / 10 / 14 / 18
  selon la difficulté — `HOUSE_POINTS_PER_KILL`, `data.js`), qui débloquent
  des paliers de bonus.
- **G5 — Équipement** : coffres et boutiques sont les sources principales
  de loot ; l'équipement amélioré est la préparation clé avant de descendre.
- **G7 — Donjon** : détail de la génération procédurale, des puzzles runiques,
  des stèles d'énigme, des pièges, des portes scellées et des passages secrets.
- **G8 — Difficulté & scaling** : le scaling progressif des groupes ennemis
  (farming) et la difficulté choisie influencent directement le danger de
  chaque étage.

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **Donjon toujours connexe** : `_assertDungeonConnected` (appelé en fin de
  `generateDungeon`) vérifie par BFS que l'escalier descendant est atteignable
  depuis le spawn ; si ce n'est pas le cas, un couloir de secours est percé.
- **Escalier montant bloqué au niveau 1** : `goUp()` ne fait rien si
  `currentFloor <= 1`.
- **Escalier descendant scellé (étage 10)** : message narratif et retour sans
  transition si `!victoryAchieved`.
- **Repos impossible en combat** : `rest()` commence par `if (inBattle) return`.
- **Coffre vide** : si aucun équipement n'est éligible pour l'étage courant,
  le coffre donne de l'or en repli (pas de coffre silencieux vide).
- **Inventaire plein** : `tryAddItem` refuse silencieusement les items en surplus
  (coffre, drop de combat) — le joueur doit gérer l'espace avant de descendre.
- **Fontaine déjà utilisée** : message « tarie » — pas de soin supplémentaire
  sur la même visite d'étage, mais la fontaine **se réactive** à chaque retour
  sur l'étage (les `usedFountains` ne sont pas archivées dans le cache).

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : événements d'étage aléatoires (« Veine de trésors »,
> « Marché ambulant », « Étage piégé », « Étage runique », etc.) — leur
> probabilité de tirage, leurs effets précis et leur interaction avec les
> puzzles. Source : `dungeon.js — rollFloorEvent` + `movement-floors.js`.

> ❓ À détailler : puzzles runiques (dalles RUNE, ordre de séquence) et stèles
> d'énigme (STELE, devinettes) — mécaniques d'activation, coffre-récompense
> et variantes doublement doublées. Source : `movement-interactions.js`.

> ❓ À détailler : Salle sur Demande (easter egg `CELL.REQUIREMENT = 16`) —
> conditions de révélation (3 passages devant le mur propice) et effets de
> thème (refuge / loot / entraînement). Source : `movement-interactions.js`.

> ❓ À détailler : jardin d'herbes (`CELL.GARDEN = 15`) — apparition aux
> étages 3, 6, 9…, révélation par Revelio ou fouille, pousse passive +
> récolte. Source : `movement-interactions.js` + `dungeon.js`.

> 💡 (proposition) Un encart « premier étage, pas à pas » pour le joueur
> débutant : ouvrir le premier coffre, identifier la boutique, trouver
> l'escalier — rituel d'initiation non tutorialisé dans le jeu.

> 💡 (proposition) Un schéma visuel du donjon type (spawn → épine → culs-de-sac
> → escalier) aiderait à visualiser la topologie pour les lecteurs designers.

---

## Récapitulatif express (pour briefer Gemini)

> Dungeon crawler en grille 16 × 16, déplacement relatif au regard. Boucle
> macro : explorer → combattre → coffres / boutique / fontaine (soin total
> 1×/visite) / repos (+30 % PV·PM, cooldown 5 pas) / fouille → s'équiper →
> descendre l'escalier (auto-save). Etages générés procéduralement (7 salles,
> topologie arbre). Respawn 20 % au retour sur un étage. Profondeur = axe
> dramatique : 4 tranches visuelles/musicales, boss final (ét. 10) scelle
> l'arc principal, Boucle Ténébreuse (11+) post-victoire.
