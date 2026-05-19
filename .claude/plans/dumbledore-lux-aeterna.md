# Plan — Portrait de Dumbledore : l'Épreuve de la Lumière Éternelle

> Statut : **livré** — les 4 phases (§7) sont implémentées et couvertes
> par le scénario smoke `scenarioDumbledoreLux` (5 cas).

## 0. Décisions actées (questions utilisateur)

| Sujet | Décision |
|-------|----------|
| Donneur | **Portrait d'Albus Dumbledore** (figure canon, déjà PNJ étage 6) |
| Récompense | **`livre_lux_aeterna`** — grimoire AoE existant « Lumière Éternelle » (Lux Aeterna, onde de lumière, ×1.5 morts-vivants) |
| Structure | **Épreuve combinée** : collecte + énigme + boss |

## 1. Prémisse narrative (à valider)

Le portrait de Dumbledore garde le savoir de *Lux Aeterna*, un grimoire
de magie de lumière scellé. Dumbledore ne le remet pas : la lumière mal
maniée aveugle autant qu'elle révèle. Il soumet le héros à une
**épreuve en trois temps**, dans la tradition des énigmes qu'il aimait
poser de son vivant.

> *« La lumière n'est pas un don, jeune sorcier. C'est une discipline.
> On ne la tient pas — on la mérite, puis on la porte. »*

Lien canon : un ancien bibliothécaire de Poudlard avait jadis amassé ce
grimoire par avidité de savoir ; incapable d'en supporter l'éclat, il
s'est laissé dévorer par l'ombre. Son spectre — **le Bibliothécaire
d'Ombre** — veille encore sur le grimoire scellé. Lux Aeterna (×1.5
contre les morts-vivants) est précisément le sort qui le défait : la
récompense est l'arme de sa propre épreuve.

**Décision actée :**
- `livre_lux_aeterna` devient **exclusif à la quête** : retiré du
  catalogue boutique (`shop.js`) **et** du pool de butin de coffre
  (`movement.js — booksAvailable`). Lux Aeterna ne s'obtient plus que
  par l'Épreuve — récompense réellement « épique ».

## 2. Chaînage

Quête `dumbledore_lumiere`, `prereq: "anneau_dumbledore"` — elle suit la
quête existante du portrait (L'Anneau de la Résurrection). Le portrait
est étage 6 ; la quête se joue donc à partir de l'étage 6.

## 3. Structure de l'épreuve (`dumbledore_lumiere`)

Une quête à **3 objectifs séquentiels** — le journal montre
collecte ✓ → énigme ▶ → boss ◌.

### 3a. Temps 1 — Collecte (`type:"item"`)
- Objectif : réunir **3× `eclat_lumiere`** (Éclat de Lumière).
- `eclat_lumiere` : nouvel item (matériau, non équipable, non
  consommable), ajouté aux `drops` de monstres **morts-vivants**
  (catégorie `fantôme` + `UNDEAD_IDS`) — thématique : « la lumière se
  nourrit de ce que l'ombre a englouti ».
- Pas de mécanique neuve : compté par `checkQuestCompletion` (objectif
  `item` standard), consommé à la remise.

### 3b. Temps 2 — Énigme (`type:"riddle"` — nouveau)
- Quand la collecte est faite, le portrait propose une `specialAction`
  `open_riddle` (« Affronter l'énigme ») — gating calqué sur
  `open_fusion` (§6 du plan Manon).
- Ouvre `#riddle-modal` : Dumbledore pose **3 énigmes** successives
  (QCM 4 choix). Bonne réponse → énigme suivante ; mauvaise → message
  bienveillant et on rejoue la même (pas de pénalité dure — une épreuve
  de sagesse, pas de réflexes).
- Les 3 énigmes réussies → l'objectif `riddle` passe `completed` et le
  boss apparaît (§3c).
- `RIDDLES_LUMIERE` (data.js) : 3 entrées `{question, choices[], answer}`.

### 3c. Temps 3 — Boss (`type:"kill"`)
- Cible : **`bibliothecaire_ombre`** — nouveau monstre boss
  (`epic:true`, catégorie `fantôme`, faible à `lumière`, listé dans
  `UNDEAD_IDS`). Spectre puissant gardien du grimoire scellé.
- Apparition **garantie** : à la résolution de l'énigme, on spawn le
  boss sur l'étage courant (hook type `spawnQuestMonsters`).
- L'abattre complète l'objectif `kill`.

### 3d. Remise
- Retour au portrait, quête `ready` → bouton standard « Remettre la
  quête » → récompense.
- Récompense : `item:"livre_lux_aeterna"` + `xp` + `gold` conséquents
  (épreuve de fin de partie — proposition : xp 600, gold 250).

## 4. Objectif `riddle` — intégration moteur de quêtes

`type:"riddle"` est un objectif **piloté par un événement** (comme
`kill`), pas recompté en continu :
- `_refreshObjectives` : ne touche pas les étapes `riddle` (laisse
  `progress`/`completed` tels quels).
- `_renderQuestStep` : libellé « Résoudre les énigmes de Dumbledore »,
  barre `progress/amount` (amount = 3).
- `solveRiddleStep()` (quests.js) : appelé par la modale à chaque bonne
  réponse — incrémente `progress` ; à `progress >= amount`, `completed`
  + spawn boss + message.

## 5. Modale d'énigme (`#riddle-modal`)

- HTML : `#riddle-modal` calqué sur `#fusion-modal` (habillage
  `#brewing-modal` réutilisé), corps `#riddle-body`.
- `openRiddleModal()` : affiche l'énigme courante (index =
  `progress` de l'étape) + 4 boutons de réponse.
- `answerRiddle(choiceIdx)` : bonne → `solveRiddleStep()` + ré-affiche
  l'énigme suivante ou ferme si terminé ; mauvaise → message de
  Dumbledore + on laisse rejouer.
- Voix de Dumbledore dans les intitulés (réutilise le ton du portrait).

## 6. Données neuves

| Fichier | Ajout |
|---------|-------|
| `data.js` | `ITEMS` += `eclat_lumiere` ; `RIDDLES_LUMIERE` (3 énigmes) |
| `monsters.js` | `bibliothecaire_ombre` (boss fantôme, `weak:["lumière"]`, `epic:true`) ; `eclat_lumiere` ajouté aux `drops` de ~4 morts-vivants |
| `quests.js` | template `dumbledore_lumiere` (3 objectifs) ; `solveRiddleStep` ; gestion `riddle` dans `_renderQuestStep` ; `openRiddleModal`/`answerRiddle` ; helper `_riddleStepReady` |
| `npcs.js` | `portrait_dumbledore` : `questsGiven/TurnedIn` += `dumbledore_lumiere` ; `specialAction` `open_riddle` ; `dialoguesByQuest` |
| `npc-dialog.js` | dispatch `open_riddle` dans `triggerNpcSpecialAction` + gating dans `_npcDialogActions` |
| `battle-spells.js` | *(aucun)* — le boss est `category:"fantôme"`, donc déjà `_isUndead` ⇒ Lux Aeterna ×1.5 sans toucher `UNDEAD_IDS` |
| `item-icons.js` | SVG inline `eclat_lumiere` (pas de PNG dédié) |
| `index.html` / `css` | `#riddle-modal` |
| `loader.js` | MANIFEST += `RIDDLES_LUMIERE` (obj) |
| `shop.js` | retrait de `livre_lux_aeterna` du `SHOP_CATALOG` |
| `movement.js` | retrait de `livre_lux_aeterna` du pool `booksAvailable` (coffres) |

> Note : `portrait_dumbledore` n'a pas de `specialAction` aujourd'hui —
> pas de conflit. (Rogue, lui, en a déjà une : c'est une raison de plus
> d'avoir retenu Dumbledore.)

## 7. Découpage en phases (verify)

1. ✅ **Données & narratif** — `eclat_lumiere` (type `quest`, SVG
   inline) ; `RIDDLES_LUMIERE` (3 énigmes) ; boss `bibliothecaire_ombre`
   (`weight:0`, fantôme, faible lumière) + drops sur 4 morts-vivants ;
   quête `dumbledore_lumiere` (3 objectifs) ; dialogues du portrait ;
   `livre_lux_aeterna` retiré boutique + coffres ; garde `type:"quest"`
   dans `useItem`/`useItemFromChar`. verify : `node tests/smoke.js`
   **vert**. note : SVG `eclat_lumiere` tiré en phase 1 (smoke exige
   tout item mappé) ; le `specialAction open_riddle` est différé en
   phase 2 avec son handler (pas de bouton orphelin).
2. ✅ **Objectif `riddle` + modale + boss** — `type:"riddle"` dans
   `_renderQuestStep` (event-driven, ignoré par `_refreshObjectives`) ;
   `#riddle-modal` ; `openRiddleModal`/`_renderRiddle`/`answerRiddle` ;
   `specialAction open_riddle` (gating `_riddleStepReady`) + dispatch
   `npc-dialog.js` ; `_spawnLuxAeternaBoss` (spawn garanti via
   `spawnQuestMonsters` à la 3ᵉ bonne réponse).
3. ✅ **Remise** — flux standard : `kill` complété par `checkKillQuests`
   → état `ready` → bouton « Remettre la quête » → `livre_lux_aeterna`.
   Aucune mécanique neuve (≠ établi de fusion Manon).
4. ✅ **Smoke test** — `scenarioDumbledoreLux` (5 cas : données,
   collecte, énigmes + spawn boss, boss vaincu, remise). Suite verte.

## 8. Hors-scope V1

- Énigmes à génération aléatoire / pool tournant : V1 = 3 énigmes
  fixes.
- Conséquence d'échec à l'énigme (pénalité) : V1 = on rejoue, sans
  coût — épreuve de sagesse.

## Suivi
- [x] Prémisse (§1) validée ; donneur/récompense/structure arrêtés.
- [x] `livre_lux_aeterna` rendu exclusif à la quête (hors boutique/coffres).
- [x] Phase 1 — données & narratif livrés (smoke vert).
- [x] Phases 2-4 — énigmes, modale, boss, remise + couverture smoke.
- [x] **Fonctionnalité complète** — les 4 phases sont livrées.
