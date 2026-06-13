# G7 — Donjon

**Statut :** 🟧 ébauche

> Objectif du chapitre : décrire comment l'espace de jeu est généré à chaque
> étage, quelles cellules spéciales le ponctuent et comment le joueur interagit
> avec elles — de la fouille d'une salle ordinaire jusqu'à la Boucle Ténébreuse
> des étages post-victoire.

---

## Vue d'ensemble

✅ (dans le jeu) Le donjon de Poudlard & Magie est une **grille 16 × 16
(`MAP_W = MAP_H = 16`, `data.js`)** générée procéduralement à chaque entrée
sur un nouvel étage. Le joueur la parcourt en vue pseudo-3D à la première
personne, avec une minimap de navigation en complément. L'exploration n'est
pas libre : les murs bornent les couloirs, et chaque salle renferme au moins
un élément d'intérêt — ennemi, objet interactif ou PNJ.

La conception cherche un équilibre entre **surprise** (la topologie varie à
chaque partie) et **lisibilité** (des garanties structurelles assurent que
l'escalier descendant est toujours atteignable sans énigme supplémentaire).

---

## Fonctionnement

### Génération des salles

✅ (dans le jeu — `dungeon.js — generateDungeon`) À chaque appel, la grille
est entièrement réinitialisée en murs (`CELL.WALL`), puis **7 salles** (`ROOM_COUNT = 7`)
y sont découpées :

- Les salles font principalement **3 × 3 cases**, avec ~35 % de chance
  d'avoir une dimension portée à 4 (soit 3 × 4 ou 4 × 4).
- L'algorithme essaie jusqu'à **40 tentatives** par salle pour éviter les
  chevauchements (marge d'1 case entre chaque salle). En cas d'échec répété,
  un léger chevauchement est accepté plutôt que de bloquer la génération.
- Chaque salle mémorise son **centre** (`cx`, `cy`), qui sert de point d'ancrage
  pour les couloirs et les cellules spéciales.

### Topologie en arbre

✅ (dans le jeu — `dungeon.js`) Les 7 salles sont organisées en deux groupes :

- **Épine dorsale** (4 salles en série) : la salle 0 est le spawn du joueur ;
  la salle 3 reçoit l'escalier descendant. Les 2 salles intermédiaires sont les
  emplacements privilégiés des cellules spéciales (coffre, boutique).
- **Branches** (3 salles restantes) : chacune est reliée par un couloir à la
  salle d'épine la plus proche (distance de Manhattan). Ces culs-de-sac ne
  mènent nulle part mais garantissent une **récompense de détour** (autel ou
  coffre).

Un **arbre est connexe par construction** : l'escalier descendant est toujours
atteignable. Un filet de sécurité BFS (`_assertDungeonConnected`) détecte le
seul cas pathologique — collision de deux salles écrasant un centre — et perce
un couloir de secours si nécessaire.

### Couloirs

✅ (dans le jeu — `dungeon.js — _carveCorridor`) Les couloirs sont tracés en
**L** (d'abord horizontal, puis vertical) entre deux centres de salle. Ils
n'écrasent que les murs : une cellule spéciale déjà posée sur le tracé est
préservée.

---

## Règles & valeurs

### Cellules spéciales

✅ (dans le jeu — `data.js — CELL`, `dungeon.js`)

| Constante | Code | Icône scène | Placement | Interaction |
|-----------|------|-------------|-----------|-------------|
| `CELL.CHEST` | 6 | Coffre SVG | Salles d'épine (~30 % de base¹) ; branches garanties | `openChest()` |
| `CELL.SHOP` | 5 | Boutique SVG | Salles d'épine (~20 % si le coffre n'est pas tiré) | `openShop()` |
| `CELL.STAIRS_D` | 3 | Escaliers SVG | Dernière salle d'épine, toujours | `goDeeper()` |
| `CELL.STAIRS_U` | 4 | Escaliers SVG | Salle de spawn, étage 2+ | `goUp()` |
| `CELL.FOUNTAIN` | 7 | Fontaine SVG | Salle intermédiaire garantie (étages 2, 5, 8, 11…) | `useFountain()` |
| `CELL.REFUGE` | 17 | Foyer SVG (bannière teintée par Maison) | Salle intermédiaire, étages ≥ 2 **sans** fontaine — **toutes Maisons** (Ch.13 P3) | `useRefuge()` |
| `CELL.ALTAR` | 12 | — | Branches (~25 % au lieu du coffre) | `useAltar()` |
| `CELL.DOOR` | 2 | Porte 3D | Salle scellée (alvéole mur, toujours présente) | `_tryOpenDoor()` |
| `CELL.NPC` | 8 | Sprite PNJ | Placement déterministe ou aléatoire | `openNpcDialog()` |
| `CELL.TRAP` | 11 | Invisible | Cases FLOOR hors spawn (1–2 de base, +2 si event « Étage piégé ») | Déclenché au pas |
| `CELL.RUNE` | 13 | Dalle illuminée | Puzzle runique (~20 % des étages) | Marcher dessus |
| `CELL.STELE` | 14 | Stèle | Puzzle stèle (~30 %, si aucune rune posée) | Marcher dessus |
| `CELL.FORGE` | 9 | — | Étages 11, 14, 17, 20 (post-victoire uniquement) | — |
| `CELL.LIBRARY` | 10 | — | Étages 12, 15, 18 (post-victoire uniquement) | — |
| `CELL.GARDEN` | 15 | Invisible | Cases FLOOR éloignées du spawn (étages 3, 6, 9, 12…) | Fouille / Revelio |
| `CELL.REQUIREMENT` | 16 | Porte magique | Mur propice révélé au 3ᵉ passage | Entrée overlay |

> ¹ L'événement d'étage « Veine de trésors » double la probabilité de coffre
> en salle d'épine à **~60 %** ; « Marché ambulant » force une boutique sur
> chaque salle d'épine intermédiaire (`dungeon.js`).

### Salle Fontaine

✅ (dans le jeu — `dungeon.js`, `movement-interactions.js — useFountain`)

La fontaine restaure **100 % des PV et 100 % des PM** du groupe entier (hors
KO). Elle n'est utilisable qu'**une seule fois par visite d'étage** :

| Étape | Comportement |
|-------|-------------|
| Entrée sur l'étage (génération ou retour) | `usedFountains` vidé → fontaine active |
| Premier usage | Soin total ; case mémorisée dans `usedFountains` |
| Tentative de re-boire | Message « tarie », refusé |
| Quitter l'étage (cache) | `usedFountains` n'est **pas** archivé → ré-active au retour |

**Cadence d'apparition** : étages 2, 5, 8, 11, 14… — formule `floor >= 2 && (floor - 2) % 3 === 0` (`dungeon.js`). La fontaine est placée sur une salle intermédiaire choisie au hasard parmi celles qui ne sont pas la salle de spawn ni la salle d'escalier.

La case `CELL.FOUNTAIN` a son propre sprite 3D (`drawFountainSprite` dans
`renderer-effects.js`) : emoji ⛲ avec halo bleu, grisé à l'état tari. Sur la
minimap, elle affiche la classe `.map-fountain` (bleu eau, distincte des
autres cellules spéciales).

### Refuge de Maison (Ch.13 P3)

`CELL.REFUGE` (`useRefuge()`) est un **repos partiel non-interrompu** :
restaure **50 %** des PV et PM du groupe (`REFUGE_HEAL_FRAC`), **1×/visite**
d'étage (set `usedRefuges`, vidé au retour sur l'étage — comme la fontaine).
Apparaît sur une salle intermédiaire des étages **≥ 2 sans fontaine garantie**
(pour ne pas doublonner le soin total), **pour les quatre Maisons**.

Habillage **purement cosmétique** par `chosenHouse` (`refugeTheme()`, state.js,
réutilise `HOUSE_BONUSES[h].color/accent/emoji`) — nom, récit et teinte de
bannière : 🦁 Foyer du Lion · 🐍 Antre du Serpent · 🦅 Alcôve de l'Aigle ·
🦡 Refuge du Blaireau (canon Poufsouffle). **Mécanique identique pour les 4
Maisons** (équité stricte) ; soin **partiel**, jamais total. Sprite 3D
`drawRefugeSprite` (bannière teintée, cache clé par Maison) ; minimap
`.map-refuge`.

### Salle Autel

✅ (dans le jeu — `movement-interactions.js — useAltar`) Les branches de
l'épine peuvent recevoir un **Autel Ancien** (~25 %) à la place d'un coffre.
L'autel propose deux choix, une seule fois par visite d'étage (`usedAltars`) :

- **Offrande** (payante — coût `25 × étage` Gallions) : soin complet du
  groupe + XP (`30 × étage`). Option sûre.
- **Pari** (gratuit, 50/50) : succès → gros gain XP + or ; échec → le groupe
  encaisse un retour de flamme (~22 % PV max, jamais létal).

---

## Interactions

### Fouille de salle

✅ (dans le jeu — `movement-interactions.js — searchRoom`) Le bouton
**🔍 Fouiller** est disponible hors combat. La fouille résout en priorité
les effets environnementaux suivants, sans consommer la recharge :

1. **Collecte d'une page de grimoire** révélée sur la case courante.
2. **Désamorçage de pièges** dans les 8 cases adjacentes + la case courante
   (toutes les cases `CELL.TRAP` du voisinage sont neutralisées d'un coup).
3. **Révélation d'un passage secret** (`secretWalls`) dans les 8 cases
   adjacentes : le mur bascule en `CELL.FLOOR`.
4. **Révélation d'un jardin d'herbes caché** dans les 8 cases adjacentes.

Si aucun effet prioritaire n'est déclenché, la fouille cherche du butin sur la
case courante. Elle est soumise à une **recharge par pas** (défaut 60 pas,
variable selon la difficulté). Une case « recharge en cours » peut être
re-fouillée une fois le délai écoulé, mais le butin est alors **dégressif**
(moins d'or, pas d'objet).

Malus possibles sur chaque fouille ordinaire (~1 % chacun) :
- Rencontre d'un monstre réveillé par la fouille.
- Déclenchement d'un piège de fouille (dégâts non létaux au groupe, variantes
  : lames, dard, brume drainante).

### Pièges de donjon

✅ (dans le jeu — `movement-interactions.js — _triggerDungeonTrap`) Les cases
`CELL.TRAP` sont **invisibles** — elles se déclenchent au premier pas dessus
(la case repasse immédiatement en `CELL.FLOOR`). Deux variantes :

- **Embuscade** (~50 %, modulé par la Fortune du groupe) : un monstre de
  l'étage jaillit et déclenche un combat.
- **Dégâts / drain** : réutilise les sous-variantes non létales de la fouille.

La **Fortune** du groupe (stat dérivée LCK, voir G3) réduit la probabilité
d'embuscade, bornée entre 10 % et 90 %.

### Puzzle runique

✅ (dans le jeu — `dungeon.js — _generateRunePuzzle`, `movement-interactions.js — _activateRune`)
Présent sur ~20 % des étages (forcé par l'événement « Étage runique »).
Le puzzle place **3 dalles `CELL.RUNE`** sur des cases FLOOR ordinaires éloignées
du spawn, et un **coffre-récompense** caché derrière une barrière murale (`_findWallPocket`).

**Mécanique** : marcher sur une dalle l'allume. Quand les 3 dalles sont allumées,
la barrière se dissout et le coffre devient accessible. Environ **50 % des puzzles
sont ordonnés** : l'inscription sur une pierre voisine indique l'ordre des trois
runes (Émeraude → Or → Améthyste, ou toute autre permutation). Activer une rune
hors séquence éteint toutes les dalles.

Le **coffre runique** offre un butin dédié, plus généreux qu'un coffre ordinaire :
or croissant avec l'étage + équipement sélectionné en « best-of-N » (3 tirages,
le meilleur par rareté). L'événement « Étage runique » double l'or et ajoute une
seconde pièce d'équipement.

### Stèle d'énigme

✅ (dans le jeu — `dungeon.js — _generateRuneStele`, `movement-interactions.js — answerSteleRiddle`)
Présente sur ~30 % des étages **si aucun puzzle runique n'a pu être posé**
(dosage : un seul puzzle par étage). La stèle place une dalle `CELL.STELE` +
un coffre-récompense derrière une barrière.

**Mécanique** : marcher sur la stèle ouvre un overlay avec une **devinette**
tirée depuis `RIDDLES[]`. Le joueur choisit parmi plusieurs propositions. La
bonne réponse dissout la barrière ; une mauvaise réponse est signalée et permet
un nouvel essai sans pénalité.

### Salle scellée (porte à clé)

✅ (dans le jeu — `dungeon.js`, `movement-interactions.js — _tryOpenDoor`)
Chaque étage comporte une **salle scellée** : une alcôve creusée dans le mur
(`_findWallPocket`), fermée par une case `CELL.DOOR`, avec un coffre derrière.
La porte s'ouvre avec une **Clé du Donjon** (consommée à l'usage), qui est
déposée en drop garanti sur un monstre aléatoire de l'étage. Sans clé, la porte
est infranchissable.

### Passage secret (~50 % des étages)

✅ (dans le jeu — `dungeon.js`) Un second alvéole peut exister avec un **mur
secret** (`secretWalls`) laissé en `CELL.WALL` — indiscernable du reste.
La fouille dans les 8 cases adjacentes le révèle et ouvre un accès au coffre.

### Salle sur Demande (easter egg)

✅ (dans le jeu — `movement-interactions.js — _revealRequirementRoom`) Chaque
étage dispose d'un « pan de mur propice » déterministe. Passer **3 fois** devant
ce pan révèle une porte `CELL.REQUIREMENT`. Entrer ouvre un **refuge contextuel**
dont le contenu s'adapte à l'état du groupe (PV/PM bas → soin, or bas → marchand…).
La salle se ré-utilise à chaque visite d'étage.

---

## PNJ dans le donjon

✅ (dans le jeu — `dungeon.js`, `npcs.js`, `npcs-helpers.js`)

### PNJ déterministes (par étage fixe)

Les PNJ dont le champ `placement.floor` correspond à l'étage courant sont placés
en priorité sur une **salle intermédiaire libre** ; en dernier recours sur
l'avant-dernière salle. Les PNJ d'introduction (`anchor: 'first-room'`) sont
placés dans la salle de spawn.

La **case `CELL.NPC` est révélée sur la minimap dès la génération** — les PNJ
sont des repères de navigation, pas des surprises (choix UX 2026-05-11).

### PNJ aléatoires (seedés par étage)

Deux tirages indépendants par génération :

- **Donneur de quête répétable** (~70 %) : parmi les donneurs dont la quête est
  « offrable » ou « remettable » pour que chaque spawn soit actionnable.
- **PNJ ambiant** (vendeur ou lore, ~50 %) : saveur d'exploration.

Sur les étages 11+, un **Marchand d'Ombre** peut apparaître (~10 %) — sink
d'or endgame.

### Recyclage PNJ en Boucle Ténébreuse

✅ (dans le jeu — `npcs-helpers.js — getNpcsForFloor`) En post-victoire,
`getNpcsForFloor(floor)` applique `effectiveFloor(floor)` pour le filtrage :
un PNJ placé à l'étage 8 réapparaît donc aussi à l'étage 18, l'étage 9 à
l'étage 19, etc. Les boutiques de la Boucle restent ainsi approvisionnées.

---

## Thèmes par tranche d'étages

✅ (dans le jeu — `floor-themes.js — FLOOR_THEMES`, `getFloorTheme`)

`getFloorTheme(floor)` est la **source unique de vérité** : elle retourne le
thème de la tranche contenant l'étage, sans état ni sérialisation. Un étage
invalide (NaN, 0, négatif) retombe sur `hogwarts`.

| Tranche | Étages | Libellé | Murs | Sol | Plafond | Ambiance |
|---------|--------|---------|------|-----|---------|---------|
| **A** | 1–3 | Couloirs de Poudlard | `stone1` | `stone` | `beams` | `intro` |
| **B** | 4–6 | Cachots de Poudlard | `stone2` | `carpet` | `stone` | `dungeon` |
| **C** | 7–13 | Profondeurs Oubliées | `cavern_wall` | `cavern_floor` | `cavern_ceiling` | `depths` |
| **D** | 14+ | Ruines Anciennes | `rune_wall` | `rune_floor` | `rune_ceiling` | `abyss` |

La tranche D n'est atteignable qu'en **Boucle Ténébreuse** (les escaliers de
l'étage 10 restent scellés sans victoire). Le sample audio `tension` reste en
réserve (aucune tranche assignée actuellement).

> ❓ À détailler : en Boucle Ténébreuse, `renderer.js` applique un override
> `rune_*` dès l'étage 11 (`victoryAchieved`), ce qui couvre les étages 11–13
> (thème C) avec les textures de la tranche D. L'interaction entre cet override
> et `getFloorTheme` mériterait une clarification dans un document de référence
> dédié.

### Transition de tranche

✅ (dans le jeu — `movement-floors.js — _maybePlayTierTransition`) Lors de
chaque changement d'étage, le moteur compare la référence d'objet renvoyée par
`getFloorTheme` avant et après. Si elle change (franchissement de frontière :
3↔4, 6↔7, 13↔14), il déclenche :

- Un **fondu noir de 600 ms** (`#tier-transition-overlay`) affichant le libellé
  de la nouvelle tranche.
- Un toast dans le log de messages.

Aucun effet à l'intérieur d'une même tranche (la référence est identique).

---

## Événements d'étage

✅ (dans le jeu — `dungeon.js — currentFloorEvent`, `movement-floors.js — _announceFloorEvent`)
Un événement est tiré une fois par génération d'étage via `rollFloorEvent()` et
infléchit plusieurs paramètres de génération :

| Événement | Effet principal |
|-----------|----------------|
| `tresor` — Veine de trésors | Probabilité de coffre en salle d'épine doublée (~60 %) |
| `marche` — Marché ambulant | Boutique forcée sur chaque salle d'épine intermédiaire |
| `runique` — Étage runique | Puzzle runique forcé (+ butin doublé si présent) |
| `pieges` — Étage piégé | +2 pièges supplémentaires au-delà de la base de 1–2 |
| `hante` — Étage hanté | Densité d'ennemis à 85 % (contre ~60 % ordinaire) |
| `calme` — Quiétude | Densité d'ennemis réduite à 30 % |

L'événement est annoncé par un toast narratif à l'arrivée sur l'étage
(`_announceFloorEvent`).

---

## Rendu pseudo-3D et minimap

### Rendu pseudo-3D

✅ (dans le jeu — `renderer.js`) Le rendu est calculé sur un canvas 2D. Le
moteur suit une approche de **raycasting directionnel** (painter's algorithm,
sans DDA) sur **5 niveaux de profondeur** (`DEPTH = 5`) :

- Pour chaque profondeur `d` de `wallDist` à 1 (loin vers proche), le moteur
  peint : fond de mur (si `d === wallDist`), sol en trapèze, plafond en
  trapèze, murs latéraux.
- Un **fog de distance** (`rgba(6,4,2, alpha)`) s'épaissit avec la profondeur.
- Le facteur de rétrécissement par niveau est `SHRINK = 0.58`.
- Les textures sont chargées une fois et mises en cache (`_ensurePatterns`) ;
  le cache est invalidé après redimensionnement du canvas.

Les textures (murs, sol, plafond) sont déterminées par `getFloorTheme(currentFloor).wall/.floor/.ceiling` — voir « Thèmes par tranche » ci-dessus.

Les **sprites en vue 3D** (coffres, escaliers, PNJ, ennemis, fontaine, autel…)
sont rendus par des modules dédiés (`renderer-sprites.js`, `renderer-entities.js`,
`renderer-effects.js`) en surcouche du fond géométrique.

### Minimap

✅ (dans le jeu — `renderer-minimap.js`) La minimap affiche la grille vue du
dessus, avec des classes CSS distinctes par type de cellule. La case du joueur
porte un triangle d'orientation `.map-player-dir-<n|s|e|w>` (calculé depuis
`playerDir`). Les PNJ sont révélés immédiatement ; les ennemis, les pièges et
les passages secrets ne le sont pas avant découverte.

### Déplacement (renvoi)

Les contrôles de déplacement sont détaillés dans **G1 — Déplacements** :
mouvement relatif (↑ avance, ← / → pivotent), swipe sur canvas mobile, D-pad
tactile. Chaque pas dans `movement.js` appelle `handleCellEntry` qui déclenche
l'overlay d'exploration pour les cellules interactives.

---

## Boucle Ténébreuse (étages 11+ post-victoire)

### Condition de déverrouillage

✅ (dans le jeu — `movement-floors.js — goDeeper`) L'escalier descendant de
l'**étage 10 est scellé** tant que le boss final (Voldemort Ressuscité) n'a pas
été vaincu. Le flag `victoryAchieved` déverrouille l'accès dès la victoire.

### Recyclage des monstres et des PNJ

✅ (dans le jeu — `dungeon-scaling.js — effectiveFloor`) À partir de l'étage 11,
`effectiveFloor(floor)` retourne un **étage relatif** qui reboucle sur la plage
1–10. Cela permet de recycler les monstres et les PNJ des étages de base sans
ajouter de nouvelles entrées : les ennemis de l'étage 11 sont ceux de l'étage 1
(rebasé), mais **fortement scalés** par le coefficient `scaleMonster`.

Les **PNJ déterministes recyclent aussi** : Kingsley (étage 8) apparaît aux
étages 8 et 18 ; Bill (étage 9) aux étages 9 et 19 ; Sirius (étage 10) aux
étages 10 et 20.

### Gardien de la Boucle

✅ (dans le jeu — `npcs.js`) Le **Gardien de la Boucle** est un PNJ déterministe
placé à l'étage 11 (sprite `fantome`), exclusivement visible en post-victoire.
Il donne 3 quêtes répétables (`everyLevels: 2`) ciblant les boss des étages 8–10
(Greyback, Aragog, Dolohov), dont les variantes « Ténébreux » réapparaissent
aux étages 18–20. Ces quêtes sont la principale source de **matériaux Forge et
Bibliothèque** en Boucle.

### Forge des Ténèbres et Bibliothèque Interdite

✅ (dans le jeu — `dungeon.js`) Ces deux cellules spéciales (`CELL.FORGE` et
`CELL.LIBRARY`) n'apparaissent que **sur les étages post-victoire (`victoryAchieved`)** :

- Forge des Ténèbres : étages 11, 14, 17, 20.
- Bibliothèque Interdite : étages 12, 15, 18.

### Respawn des ennemis et scaling au grind

✅ (dans le jeu — `movement-floors.js — _respawnEnemiesOnEntry`) À chaque retour
sur un étage déjà visité, chaque case où un ennemi a été vaincu (`defeatedCellsByFloor`)
a **20 % de chance de respawner** un ennemi. Un toast narratif dont le ton
escalade selon le **niveau de visite** `n = floor(kills / 4)` :

| n | Toast |
|---|-------|
| ≤ 1 | « Quelques ombres se reforment dans les couloirs… » |
| ≤ 3 | « Les ombres se reforment plus nombreuses cette fois… » |
| ≤ 5 | « Tu sens des présences hostiles se rassembler — ta présence dérange. » |
| ≥ 6 | « Le château pulse de menaces. L'étage te défie ouvertement. » |

Le pool de respawn utilise lui aussi `effectiveFloor` pour coller aux ennemis
de la tranche active en Boucle.

---

## Cas limites & garde-fous

✅ (dans le jeu) Plusieurs garde-fous protègent contre les cas dégénérés de
génération ou de sauvegarde :

| Garde-fou | Déclencheur | Effet |
|-----------|-------------|-------|
| `_assertDungeonConnected` | Fin de `generateDungeon` | BFS depuis le spawn ; si `STAIRS_D` injoignable, perce un couloir de secours (distance de Manhattan) |
| `_ensureStairsExist` | Fin de génération + restauration cache | Replace l'escalier si la génération l'a écrasé par collision de centres |
| `_ensureActiveKillQuestTargets` | Fin de génération + restauration cache | Garantit la présence de la cible d'une quête `kill` active |
| `_migrateMissingNpcsForFloor` | Restauration cache | Replace les PNJ ajoutés après une sauvegarde antérieure |
| `_ensureFinalBossPresent` | Fin génération + cache, étage 10 uniquement | Garantit Voldemort Ressuscité avant la victoire |
| `_ensureStairsExist (goDeeper guard)` | `goDeeper()` sur l'étage 10 | Bloque la descente si `victoryAchieved` est faux |

---

## ❓ À détailler / 💡 pistes

> ❓ **Override post-victoire vs `getFloorTheme`** : les étages 11–13 appliquent
> les textures `rune_*` par override dans `renderer.js` (`victoryAchieved`), alors
> que `getFloorTheme` leur attribue le thème C (Profondeurs). La cohérence visuelle
> et la justification design de ce doublon méritent un paragraphe dédié.

> ❓ **Jardin d'herbes (`CELL.GARDEN`)** : introduit dans les potions (P6.b3),
> cadence décalée par rapport à la fontaine (étages 3, 6, 9…). Son intégration
> dans la boucle de jeu (récolte passive vs active, croissance à la descente) n'est
> pas encore documentée ici.

> ❓ **Salle sur Demande — thèmes V2** : le système « ce dont le groupe a besoin »
> choisit le contenu de la salle en fonction de l'état du joueur. Les thèmes
> disponibles et leurs conditions de déclenchement restent à lister ici.

> 💡 **Cartographie des probabilités** : un tableau synthétisant la probabilité
> de trouver coffre / boutique / fontaine / autel par étage (incluant les
> événements d'étage) aiderait les joueurs à planifier leur exploration.

---

## Récapitulatif express (pour briefer Gemini)

> Le donjon est une grille **16 × 16** générée à chaque étage : **7 salles** (3 × 3
> environ) reliées en arbre (épine de 4 + 3 branches) par des couloirs en L.
> L'escalier descendant est toujours au bout de l'épine ; les branches donnent
> des **récompenses de détour** (autel ~25 %, coffre sinon). Les étages 2/5/8/11…
> ont une **fontaine** (soin total, 1 usage/visite). Les **4 tranches thématiques**
> (A 1–3 Poudlard / B 4–6 Cachots / C 7–13 Profondeurs / D 14+ Ruines) changent
> textures et musique ambiante avec un fondu noir à la transition. L'étage 11+
> (post-victoire uniquement, escaliers scellés sans victoire) recycle les ennemis
> via `effectiveFloor` et débloque la **Boucle Ténébreuse** — farm de matériaux,
> Forge, Bibliothèque, quêtes répétables du Gardien.
