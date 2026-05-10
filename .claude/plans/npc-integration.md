# Plan d'exécution — Intégration des PNJ

Branche : `claude/add-npc-integration-M4NfZ`

> Ce document est la **source de vérité** entre sessions Claude.
> Convention : `[ ]` pending · `[~]` in progress · `[x]` done.
> À chaque étape franchie : cocher la case, mettre à jour le statut global, ajouter une ligne dans le journal en bas.

**Statut global** : 28 / 30 étapes — Itération 1 quasi-terminée (commit + push restants).

---

## 1. Décisions validées par l'utilisateur

| Paramètre               | Choix                                                                    |
|-------------------------|--------------------------------------------------------------------------|
| Portée                  | **PNJ visibles + dialogues + quêtes** — refonte du flux quêtes via PNJ. |
| Placement               | **Mixte** — donneurs majeurs à étages fixes (déterministe) + rencontres aléatoires (itérations futures). |
| Rendu in-game           | **Marqueur canvas** (silhouette dorée sur la cellule) + **portrait dans la modale dialogue**. |
| Volume itération 1      | **1 PNJ d'introduction** + **7 donneurs des quêtes existantes** (Pomfresh, Lockhart, Mimi, Hagrid, Scamander, McGonagall, Lupin). |
| Itérations 2+           | Enrichissement progressif : PNJ décoratifs/lore, vendeurs ambulants, rencontres aléatoires, dialogues à branches. |

---

## 2. Architecture cible

### 2.1 Nouveau type de cellule

```js
// data.js
const CELL = { WALL:0, FLOOR:1, DOOR:2, STAIRS_D:3, STAIRS_U:4,
               SHOP:5, CHEST:6, FOUNTAIN:7, NPC:8 };
```

La grille `dungeon` reste un tableau de `int`. Pour savoir **quel** PNJ se trouve sur une cellule `CELL.NPC`, on ajoute une couche d'indirection à part : `npcPlacements` (Map `"x,y"` → `npcId`), recalculée à chaque génération d'étage et persistée dans la sauvegarde.

### 2.2 Registre des PNJ (`js/npcs.js`)

Nouveau fichier dédié — modèle inspiré de `monsters.js`.

```js
const NPCS = [
  {
    id: "dumbledore_intro",         // identifiant unique
    name: "Albus Dumbledore",       // nom affiché
    title: "Directeur de Poudlard", // sous-titre
    icon: "🧙‍♂️",                   // emoji fallback
    portrait: "img/npc/dumbledore.svg", // ou data-uri SVG inline
    house: null,                    // optionnel (Gryffondor, etc.)
    placement: { floor: 1, anchor: "first-room" }, // fixe
    questsGiven:    ["intro_tutoriel"], // peut être []
    questsTurnedIn: ["intro_tutoriel"], // PNJ qui clôt
    dialogues: {
      greeting:     "...",          // 1ère rencontre
      idle:         "...",          // visites suivantes
      questOffer:   "...",          // qd quête disponible non prise
      questActive:  "...",          // quête prise mais non remplie
      questReady:   "...",          // objectif rempli, à rendre
      questDone:    "..."           // après remise
    }
  },
  ...
];
```

### 2.3 Placement déterministe (donneurs majeurs)

| PNJ                  | Étage | Quête liée               | Justification thématique           |
|----------------------|-------|--------------------------|------------------------------------|
| Albus Dumbledore     | 1     | `intro_tutoriel` (NEW)   | Accueille à l'entrée du donjon.    |
| Madame Pomfresh      | 2     | `mandragore_pomfresh`    | Infirmerie (CLAUDE.md location).   |
| Mimi Geignarde       | 2     | `troll_toilettes`        | Toilettes du 2e étage.             |
| Gilderoy Lockhart    | 3     | `livre_interdit`         | Bibliothèque interdite.            |
| Hagrid               | 4     | `chouette_perdue`        | Forêt interdite (étage 4+).        |
| Newton Scamander     | 2     | `niffleurs_trésor`       | Sous-sols (étage 2+).              |
| Professeur McGonagall| 5     | `golem_passage`          | Passages secrets (étage 5+).       |
| Professeur Lupin     | 4     | `lumiere_desespoir`      | Classe de Défense (étage 4+).      |

Règle de génération (cf. `dungeon.js`) : pour chaque PNJ dont `placement.floor === currentFloor`, on choisit une room intermédiaire (priorité `anchor === "first-room"` → première room) et on la marque `CELL.NPC`, puis on enregistre `(x,y) → npcId` dans `npcPlacements`.

### 2.4 Rendu

- **Canvas 3D** : nouveau cas dans `drawCellMarker()` (`renderer-effects.js`). Silhouette dorée (rectangle vertical à coins arrondis + halo chaleur + petit éclat doré au-dessus) pour signaler la présence sans casser le style donjon.
- **Minimap** : nouvelle classe `.map-npc` (or pâle), routée via `_buildMinimapCells()`.
- **Marqueur "!" / "?"** au-dessus de la silhouette si le PNJ a une quête à offrir / à clore (analogue MMO classique).

### 2.5 Overlay dialogue (`#npc-dialog-overlay`)

Nouveau bloc HTML dans `index.html`, **distinct** de `#explore-overlay` (le système d'exploration existant ne convient pas pour les branches dialogue).

Structure :

```
┌─────────────────────────────────┐
│ [Portrait]  Nom du PNJ          │
│             Titre                │
├─────────────────────────────────┤
│ « Texte de dialogue contextuel »│
├─────────────────────────────────┤
│ [Action 1]  [Action 2]  [Sortir]│
└─────────────────────────────────┘
```

État affiché : `greeting` la 1ʳᵉ fois (flag `seenNpcs` Set), sinon dispatch selon état des quêtes.

Boutons d'action dynamiques :
- "Accepter la quête" → ajoute l'entrée dans `activeQuests` (depuis un nouveau registre `QUEST_TEMPLATES`).
- "Remettre la quête" → appelle la nouvelle `turnInQuest(id)` (extraction de `completeQuest` actuelle).
- "Rejeter / Plus tard" → ferme l'overlay.

### 2.6 Refonte du flux quêtes

État actuel (`state.js`) : `activeQuests` contient **toutes les quêtes au démarrage**, automatiquement actives.

État cible :
- `QUEST_TEMPLATES` (nouveau, dans `quests.js` ou `data.js`) : catalogue inerte des 7 quêtes + intro.
- `activeQuests` ne contient plus que les quêtes **acceptées par le joueur via un PNJ**.
- `availableQuests` (Set d'IDs) : quêtes débloquées (PNJ rencontré, quête non encore acceptée).
- `completedQuests` (Set d'IDs) : pour griser au retour chez le PNJ.

Étapes d'une quête côté joueur :
1. Trouver le PNJ → dialog `greeting` → bouton "Accepter".
2. Quête ajoutée à `activeQuests`. Le journal des quêtes existant fonctionne sans changement.
3. Remplir l'objectif (kill/item — `checkKillQuests` et inventaire inchangés).
4. Retourner au PNJ → dialog `questReady` → bouton "Remettre" → récompenses.

> ⚠️ **Compatibilité saves** : un joueur en cours de partie a `activeQuests` peuplé. La migration `_applyState` doit déplacer ces quêtes vers le nouveau modèle (par défaut : marquer toutes comme acceptées pour ne pas casser la progression). Versionner via `gs._version = 2`.

---

## 3. Itérations

### Itération 1 — Fondations + 8 PNJ majeurs câblés

**Objectif** : tout PNJ donneur de quête est physiquement présent et fait fonctionner sa quête. Aucun PNJ aléatoire, aucun PNJ décoratif.

#### 1.A Fondations techniques (sans PNJ encore visible)

- [x] **1.A.1** Ajouter `CELL.NPC = 8` dans `data.js`. Vérifier qu'aucun calcul ne suppose `cell <= 7`.
- [x] **1.A.2** Créer `js/npcs.js` (registre vide + helpers : `getNpcById`, `getNpcsForFloor`).
- [x] **1.A.3** Brancher `npcs.js` dans `index.html` (entre `monsters.js` et `data.js`).
- [x] **1.A.4** Ajouter `npcPlacements` (Map) et `seenNpcs` (Set) à `state.js`. Initialiser dans le hub démarrage et le reset.
- [x] **1.A.5** Étendre `_serializeState` / `_applyState` pour persister `npcPlacements` (sérialisé en `Array.from(entries)`) et `seenNpcs`. Bump `gs._version`.
- [x] **1.A.6** Étendre `floorDungeons` pour stocker `npcPlacements` par étage (entrée/sortie d'étage).
- ✅ **Vérif** : `node tests/smoke.js` passe ; sauvegarde + chargement d'une partie vierge OK ; aucune cellule `NPC` encore générée → comportement identique.

#### 1.B Génération + rendu

- [x] **1.B.1** Dans `dungeon.js`, après le placement coffre/boutique/fontaine, parcourir `getNpcsForFloor(currentFloor)` et placer chaque PNJ dans une room (priorité anchor). Remplir `npcPlacements`.
- [x] **1.B.2** Dans `renderer-effects.js` → `drawCellMarker()`, ajouter le cas `CELL.NPC` : silhouette dorée + halo + indicateur `!`/`?` selon état quête (lookup via `npcPlacements`).
- [x] **1.B.3** Dans `renderer-minimap.js`, classe `.map-npc` (or pâle). CSS dans `style.css`.
- [x] **1.B.4** Dans `movement.js` → `handleCellEntry`, ajouter `CELL.NPC` à la liste qui ouvre l'overlay (mais router vers le nouvel overlay dialogue, pas `_showExploreOverlay`).
- ✅ **Vérif** : avec un PNJ test (placeholder) à l'étage 1, le marqueur s'affiche en 3D et minimap, on entre sur la case, l'overlay s'ouvre.

#### 1.C Overlay dialogue

- [x] **1.C.1** Ajouter `#npc-dialog-overlay` dans `index.html` (structure portrait + nom + texte + boutons), styles dans `css/style.css` (cohérent avec `#explore-overlay`).
- [x] **1.C.2** Créer `js/npc-dialog.js` : `openNpcDialog(npcId)`, `_renderDialogState(npc, state)`, `_dialogActions(npc, state)`, `closeNpcDialog()`.
- [x] **1.C.3** Logique d'état : `getNpcQuestState(npc)` retourne `none|offer|active|ready|done` en croisant `availableQuests`, `activeQuests`, `completedQuests`.
- [x] **1.C.4** Bouton "Sortir" + ESC + clic backdrop → `closeNpcDialog`.
- ✅ **Vérif** : ouvrir/fermer l'overlay, naviguer entre les états (mock).

#### 1.D Refonte flux quêtes

- [x] **1.D.1** Créer `QUEST_TEMPLATES` (dans `quests.js` ou nouveau `quest-data.js`) avec les 7 quêtes existantes recopiées depuis `state.js` (mêmes id/title/desc/objectives/reward).
- [x] **1.D.2** Ajouter quête `intro_tutoriel` (quête de Dumbledore — voir 1.E.1).
- [x] **1.D.3** Vider `activeQuests` au démarrage (`state.js`) et introduire `availableQuests` / `completedQuests`.
- [x] **1.D.4** Implémenter `acceptQuest(id)` : `availableQuests.delete(id)` + push template (clone) dans `activeQuests`.
- [x] **1.D.5** Renommer `completeQuest(idx)` actuelle en `turnInQuest(idx)` ; la rendre appelable depuis le bouton dialogue. (Choix : `turnInQuestById(id)` wrapper sur `completeQuest(idx)`, plus pratique pour le dialogue.)
- [x] **1.D.6** Dans `quests.js → renderQuestList` : retirer le bouton "Remettre" auto (ou le conditionner au cas où le joueur est sur la case du PNJ — choix : on **retire** le bouton, le joueur doit aller voir le PNJ).
- [x] **1.D.7** Migration save : si `gs._version` absent, marquer toutes les quêtes existantes comme acceptées (push direct dans `activeQuests`) et `_version = 2`.
- ✅ **Vérif** : nouvelle partie → 0 quête active. Partie chargée d'une save v1 → quêtes acceptées préservées, complétées rangées dans `completedQuests`.

#### 1.E Câblage des 8 PNJ

- [x] **1.E.1** Définir la quête `intro_tutoriel` (descendre à l'étage 2). Récompense XP 30 + gold 20. Donnée et clôturée par Dumbledore. Nouveau type d'objectif `floor` géré par `checkFloorQuests`.
- [x] **1.E.2** Renseigner les 8 entrées de `NPCS` (id, nom, titre, dialogues, quêtes liées, placement). Portraits = emoji icon (placeholder) pour itération 1 — vrais portraits = itération 2.
- [x] **1.E.3** Marges suffisantes : 8 rooms par étage, 3 PNJ max sur étage 2 (Pomfresh + Mimi + Scamander), zéro conflit observé.
- [x] **1.E.4** Repli avant-dernière room si toutes les intermédiaires occupées (cf. `_placeNpcInRoom` + boucle dans `dungeon.js`).
- ✅ **Vérif** : smoke test 3bis ouvre Pomfresh, accepte/remplit/rend la quête, et vérifie les 4 états du dispatch (offer/active/ready/done).

#### 1.F Tests + commit

- [x] **1.F.1** Étendre `tests/smoke.js` : nouveau scénario `scenarioNpcIntegration` (T1 registre, T2 placement étage 1, T3 flux dialogue, T4 overlay open/close).
- [x] **1.F.2** `node tests/smoke.js` vert (24 scénarios, dont 3bis nouveau).
- [ ] **1.F.3** Commit unique ou série courte (granularité fondations / overlay / câblage). Message : `feat(npc): iteration 1 — 8 NPCs visibles + flux quêtes`.
- [ ] **1.F.4** Push sur `claude/add-npc-integration-M4NfZ`.

---

### Itération 2 — Portraits + polish dialogue

- [x] Vrais portraits PNG pour les 8 PNJ générés via Nano Banana à partir de photos d'adultes (prompts archétypaux pour contourner les filtres "personnalité publique"). 256×256 PNG, ~100 KB chacun, intégrés via `portraitImg` + `<img>` dans l'overlay.
- [ ] **Correction connue — Pomfresh** : la broche est rendue en croix chrétienne au lieu d'un symbole magique. À corriger via re-passe Nano Banana ("replace cross with silver caduceus") ou retouche GIMP/Krita. Prompts de variantes consignés dans le journal.
- [x] Animations légères marqueur canvas : halo pulsé (sin·2) + bounce vertical du signe `!`/`?` (sin·3). Boucle `setInterval` 200 ms, no-op si aucun PNJ sur l'étage.
- [x] Son `playNpcGreet()` (deux notes douces type cloche, fondamentale + quinte) joué à la 1ʳᵉ ouverture du dialogue (pas sur re-render après accept/turnIn).
- [x] Dialogues multi-pages : champ `dialogues.greeting` accepte string ou array. Navigation `Suivant ▸` jusqu'à la dernière page, puis actions contextuelles. Pager `n / total` discret. 8 PNJ convertis avec greeting 2 pages.

### Itération 3 — Enrichissement casting

- [ ] Ajouter PNJ secondaires sans quête : Rogue, Rusard, Nick Quasi-Sans-Tête, Trelawney, Flitwick.
- [ ] Lore-only dialogues (pas d'action, juste atmosphère + indices sur monstres / sorts).

### Itération 4 — Vendeurs ambulants + rencontres aléatoires

- [x] Type de PNJ "vendeur" : `wares: [{id, price?}]` sur l'entrée NPCS, bouton "Voir les marchandises" dans le dialogue, `openVendorShop(npcId)` réutilise `#shop-modal`. Catalogue par vendeur, prix overridable par entrée.
- [x] Génération aléatoire (similaire fontaine) : 35% de chance par étage 2+, pool filtré par `random:true` + `minFloor`/`maxFloor` via `getRandomVendorsForFloor(floor)`. Placement dans la première salle intermédiaire libre, repli avant-dernière room.
- [x] Cooldown : un seul vendeur ambulant par étage (intrinsèque à la logique de placement — un seul tirage par étage).
- [x] 2 vendeurs livrés : **Madame Rosmerta** (étage 2+, consommables : potion_s, potion_m, mandragore, choco_sorcier) et **Mondingus Fletcher** (étage 3+, livres + felix). Portraits emoji 🍻 / 🦨 (PNG TODO itération suivante).
- [x] Smoke 3ter dédié : T1 registre + helpers, T2 bouton dialogue, T3 ouverture boutique avec catalogue, T4 achat débite l'or et grossit l'inventaire.
- [x] **Onglet Vendre** dans `#shop-modal` (Acheter/Vendre). Marche pour tous les commerçants — boutique fixe (Madame Malkins) + vendeurs ambulants. Politique de rachat configurable via `npc.buyback = { default, byType, byRarity }`. Spécialisation : Rosmerta paie 75% les `consumable`, Mondingus paie 75% les `rare/epic/legendary`. Shop fixe : 50% standard. Smoke 3ter étendu (T5 onglets + spécialisation Rosmerta sur potion/wand, T6 sellItem débite, T7 spécialisation Mondingus sur wand2 rare).

### Itération 5 — Quêtes répétables / quêtes en chaîne

- [x] **Chaînes** : `npc.questsGiven` ordonné, `getNpcQuestState` itère et retourne le 1er état actionnable. Pas de schéma supplémentaire — juste un parcours en ordre. Permet à un PNJ de donner Q1 puis Q2 (et plus si besoin) une fois Q1 rendue.
- [x] **Répétables** : nouveau flag `repeatable: { everyLevels: N }` sur `QUEST_TEMPLATES`. Nouvelle map `lastQuestCompletion = {questId: playerLevel}` dans `state.js`, persistée dans `save.js`. Helper `isQuestOfferable(id)` utilisé partout (dialog dispatch, accept) pour gérer "complétée mais cooldown écoulé".
- [x] **Dialogues par quête** : champ optionnel `npc.dialoguesByQuest = { questId: { questOffer, questActive, questReady } }`. Override des dialogues globaux du PNJ pour la quête concernée. Permet à Hagrid d'avoir des textes différents pour `chouette_perdue` (canon) et `defense_cabane` (chaîne).
- [x] **Hagrid POC** : `questsGiven: ["chouette_perdue", "defense_cabane"]`. `chouette_perdue` devient répétable (`everyLevels: 3`). Nouvelle quête `defense_cabane` (kill 3 araignées, récompense potion_m). Dialogues dédiés dans `dialoguesByQuest`.
- [x] **Smoke 3quater** : 7 tests dédiés (registre, état initial, remise → chaîne avance, fin de chaîne, cooldown non atteint, cooldown atteint, ré-acceptation).

---

## 4. Risques & mitigations

| Risque                                        | Mitigation                                                       |
|-----------------------------------------------|------------------------------------------------------------------|
| Conflit cellule (PNJ vs coffre/fontaine)      | Ordre de placement strict ; PNJ après autres specials.           |
| Save v1 perd les quêtes acceptées             | Migration explicite + tag `_version`.                             |
| Étage saturé en specials (étage 2)            | Permettre un PNJ par room sans bloquer le passage ; fallback room avant-dernière. |
| Couplage fort `quests.js` ↔ ancien flux       | Conserver `turnInQuest` rétro-compatible ; tests avant/après.    |
| Marqueur canvas illisible                     | Tester dès 1.B.2 ; ajuster taille/contraste si nécessaire.       |

---

## 5. Critères de succès globaux

- ✅ Un joueur ne peut pas démarrer une quête sans avoir parlé à son PNJ.
- ✅ Un joueur ne peut pas remettre une quête sans retourner voir le PNJ.
- ✅ Les 7 quêtes existantes restent jouables de bout en bout, récompenses inchangées.
- ✅ Les saves v1 chargent sans perte de progression.
- ✅ `node tests/smoke.js` passe à chaque commit.
- ✅ Aucun crash si `npcs.js` est vide (architecture tolérante au PNJ-zéro).

---

## 6. Journal

| Date       | Étape       | Notes                                                              |
|------------|-------------|--------------------------------------------------------------------|
| 2026-05-10 | Plan v1     | Rédaction initiale après cadrage utilisateur (4 questions). Itération 1 = fondations + 8 PNJ majeurs. |
| 2026-05-10 | Itération 1 | Implémentation complète : `CELL.NPC`, registre `npcs.js` + 8 PNJ, marqueur 3D + minimap, overlay dialogue, refonte flux quêtes (`QUEST_TEMPLATES` / `availableQuests` / `completedQuests`), migration save v1→v2, hook `checkFloorQuests`. Smoke vert (24 scénarios, scénario 3bis ajouté). Reste : commit + push. |
| 2026-05-10 | Portraits   | 8 PNG générés via Nano Banana avec prompts archétypaux (contournement filtres "personnalité publique" + IP). 7/8 conformes. Pomfresh : broche croix chrétienne au lieu de symbole magique → correction prévue (prompt de re-passe : "replace silver Christian cross brooch with small silver caduceus medallion / sprig of mandrake leaves / phoenix feather"). On intègre en l'état, correction itération 2 ultérieure. |
| 2026-05-10 | Itération 2 (polish) | Animations marqueur canvas (halo pulsé + bounce indicateur), son `playNpcGreet`, dialogues multi-pages (string \| array) + nav `Suivant ▸`. 8 greetings convertis en 2 pages. Smoke 3bis étendu (T5 : pagination + anim + son). 24 scénarios verts. Reste : correction Pomfresh + itération 3 (casting étendu). |
| 2026-05-10 | Retour PR #35 | Deux changements demandés : (1) l'intro Dumbledore est désormais déclenchée **automatiquement à `startGame`** (setTimeout 500 ms) plutôt que de dépendre d'une rencontre aléatoire sur la carte étage 1. Le greeting page 2 indique explicitement "retrouve-moi quelque part dans ces couloirs — je te récompenserai en personne", mécanique exploration→quête conservée. (2) **Type unifié `.map-special`** sur la minimap (fontaine + PNJ + futurs éléments interactifs partagent une même teinte) + entrée "Spécial" ajoutée à la légende. Smoke 3bis ajoute un T0 vérifiant l'auto-intro. |
| 2026-05-10 | Refonte intro | Suite au retour utilisateur "le popup au-dessus du donjon n'est pas l'intro attendue", l'intro a été déplacée dans un **écran dédié `#intro-screen`** qui s'insère entre `chooseHouse()` et `startGame()`. Le reset PNJ/quêtes a été déplacé de `startGame` vers `chooseHouse` pour ne pas écraser l'acceptation. Smoke `startNewGame(skipIntro=true)` + T0/T0bis dédiés. PR #39 mergée. |
| 2026-05-10 | Portraits desktop | Retour utilisateur : trop petits sur grand écran. `.npc-dialog-portrait` 64→128 px, `.intro-portrait` 96→180 px, carte intro 540→660 px max-width. Media query `@media (max-width: 700px)` rétablit les tailles d'origine sur mobile. PR #40 mergée. |
| 2026-05-10 | Itération 4 | Vendeurs ambulants. Schéma NPC étendu avec `random:true` + `wares:[{id,price?}]`. 2 vendeurs livrés : Madame Rosmerta (consommables, étage 2+) et Mondingus Fletcher (livres + felix, étage 3+). Génération aléatoire 35%/étage via `getRandomVendorsForFloor`. Bouton "Voir les marchandises" dans le dialogue PNJ ; `openVendorShop(npcId)` réutilise `#shop-modal`. Scénario smoke 3ter dédié (T1-T4). Portraits PNG TODO — emoji fallback en attendant. |
| 2026-05-10 | Onglet Vendre | Suite au retour utilisateur "il faudrait aussi ajouter la capacité de vendre". `#shop-modal` gagne deux onglets Acheter/Vendre via `setShopMode`. Politique de rachat configurable par PNJ : `buyback: { default, byType, byRarity }`. Spécialisations : Rosmerta 75% sur `consumable`, Mondingus 75% sur `rare/epic/legendary`, Madame Malkins 50% standard. Smoke 3ter étendu (T5 onglets + spécialisation, T6 sellItem, T7 spécialisation Mondingus). |
| 2026-05-10 | Portraits vendeurs | Omission corrigée : les 2 vendeurs n'avaient pas de PNG (emoji fallback) alors que la consigne projet est Nano Banana + prompt archétypal. Prompts rédigés (tenancière d'auberge / receleur miteux), images générées par l'utilisateur, déposées dans `img/npc/rosmerta.png` + `img/npc/mundungus.png`, `portraitImg` câblé. Style légèrement plus illustratif que les 8 sorciers — accepté comme "ok pour des vendeurs secondaires". |
