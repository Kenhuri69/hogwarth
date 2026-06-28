# Plan — Escape Game via pièges (étages 11+ / Poches du Sceau)

> Nouvelle mécanique : à partir de l'étage 11 (Boucle Ténébreuse, post-victoire),
> certains pièges projettent le groupe dans un **étage caché temporaire** — une
> **Poche du Sceau** — d'où l'on ne ressort qu'en résolvant un mini *escape game*
> (énigmes runiques, objets à combiner, écho temporel sous pression).
> Date : 2026-06-28. Auteur : itération design.
>
> **Statut** : 📐 Design + plan d'implémentation rédigé (ce document). Aucune
> ligne de code de gameplay écrite pour l'instant — implémentation découpée en
> lots ci-dessous (ÉTAPE 3), à valider/dérouler ensuite.

---

## Audit — ce qui existe déjà (vérifié dans le code, 2026-06-28)

| Brique | Emplacement | État pertinent |
|--------|-------------|----------------|
| **Pièges** | `js/movement-interactions.js:436` `_triggerDungeonTrap()` ; placement `js/dungeon.js` (1–2 `CELL.TRAP`/étage, +2 si event `pieges`) | 50 % embuscade (scalé) / 50 % dégâts non létaux (`_triggerSearchTrap`, 3 sous-variantes, plancher 1 PV). `partyFortune()` réduit le risque plein. Secousse `DFX_safe.shakeView('heavy')`. **Point d'injection idéal.** |
| **Gate post-victoire** | `js/dungeon-scaling.js:92` `effectiveFloor(floor)` (= `floor − 10` si `victoryAchieved && floor>=11`) ; escalier ét.10 scellé sans victoire (`movement-floors.js:418`) | Étages 11+ ⇔ **exclusivement** la Boucle Ténébreuse. Gate naturel de la feature. |
| **Cellules** | `js/data.js:9` `CELL` — dernière valeur `CAULDRON:18` | Une nouvelle cellule prendra `19`. |
| **Cache d'étage** | `js/movement-floors.js:33` `_saveFloorToCache` / `:54` `_restoreFloorFromCache` ; `floorDungeons{}` LRU cap 6 ; `_changeFloor` `:348` | Deep-copy `dungeon/visited/enemyMap/itemMap` + reset des trackers 1×/visite. Patron de snapshot réutilisable. |
| **Transition** | `_floorTransition` + `#tier-transition-overlay` + `_maybePlayTierTransition` | Fondu noir 600 ms réutilisable pour une transition « temporelle » dédiée. |
| **Énigmes** | `js/riddles.js` (`RIDDLES[]`, `getRiddleById`, 3 énigmes Ruines ét.21+) ; stèle `answerSteleRiddle` `movement-interactions.js:528` ; `runeStele` | QCM index-réponse, barrière `WALL→FLOOR` à la résolution, `checkCodexUnlocks('riddle-solved')`. Réutilisable tel quel. |
| **Puzzle runique** | `_activateRune` `movement-interactions.js:463` ; `runePuzzle` / `litRunes` ; `CELL.RUNE` | Dalles à allumer (séquence optionnelle) → barrière dissoute. Réutilisable. |
| **Overlay scène** | `_showExploreOverlay` (`js/movement.js`) + `SCENE_ICONS` (`scene-icons.js`) | Modale d'interaction par type de cellule. Extensible. |
| **HUD parallèle** | `#visit-hud` (`js/visit-hud.js`) bandeau paliers good/degraded/lost | Modèle pour un `#escape-hud` (objectif + jauge de corruption). |
| **Récompenses** | `accumulatedEclats` (state) ; Codex `checkCodexUnlocks` (`js/codex.js`, conditions `floor/eclat/quest/monster/riddle/echo/item/house/victory/eclatLoop/cycleBroken`) ; quêtes `_grantQuestReward` (`quests.js`) ; livres `livre_*` élémentaires (`data-items.js`) | Tout le câblage de récompense existe. `accumulatedEclats >= 15` = jalon II de **Briser le Cycle**. |
| **Échos / fin** | `seenEchoes` (jalon I `echo_scene_sceau`) ; `cycleBroken` ; `docs/histoire/14-scenarios-de-fin.md` ; Gardien de la Boucle (`gardien_boucle`, quêtes répétables `everyLevels`) | La Poche se branche directement sur la trame endgame existante. |
| **Loader/MANIFEST** | `js/loader.js` MANIFEST ~55 globals | Tout nouveau global critique à y ajouter. |
| **Cache PWA** | guidelines §8 + skill `cache-bump` | Tout JS/CSS servi → bump `?v` + `CACHE_VERSION`. |

**Conclusion d'audit** : aucune brique nouvelle n'est nécessaire côté *systèmes* —
la Poche du Sceau **recompose** des mécaniques existantes (snapshot d'étage,
stèle/énigme, puzzle runique, overlay, Éclats, Codex). Le risque technique est
concentré sur **un seul point** : la gestion d'un étage *éphémère hors `floorDungeons`*
et sa sérialisation (traité en ÉTAPE 3, Lot 2).

---

# ÉTAPE 1 — Lore & intégration narrative

## 1.1 Ancrage canon (rappel des concepts mobilisés)

D'après `docs/histoire/` (ch. 03, 04, 08, 10, 11, 12, 14) :

- **Clé de Voûte** = le **verrou** matériel forgé *ensemble* par les Quatre
  Fondateurs, fissuré au déclencheur. *« La Clé de Voûte n'était pas une porte :
  c'était un verrou. »*
- **Le sceau** ≠ le verrou : le sceau, c'est **la peur** qui tenait le verrou
  fermé. On ne le referme pas en fuyant vers le haut, mais en **osant regarder
  jusqu'au fond**.
- **Ruines Anciennes (zone D, ét.14+)** = prison antérieure à Poudlard, *« bâtie
  comme un couvercle »*, couverte de **runes vivantes** qui *se traduisent
  d'elles-mêmes*, et siège des **échos temporels** : *des scènes du moment du
  scellement, rejouées*.
- **Échos temporels** = phénomène **déjà canon** de la zone D (jalon I de Briser
  le Cycle : voir `echo_scene_sceau`). C'est le point d'accroche le plus propre.
- **Fondateurs** : chacun a scellé *« une part de soi-même, sa plus laide »*.
  Quatre vérités d'un seul verrou (Godric : tenir la porte sans peur ; Salazar :
  sceller sa faute *avec* la corruption, un miroir ; Rowena : comprendre fait
  apparaître la faille ; Helga : creuser un abri pour ceux qui restent).
- **Éclats** = fragments de la Clé portés par le héros ; les déposer *re-scelle*
  (Briser le Cycle). Compteur `accumulatedEclats`.
- **Boucle Ténébreuse** = la victoire **ouvre** la faille au lieu de la fermer ;
  étages 11+ recyclés, de plus en plus profonds.

## 1.2 Le concept : la **Poche du Sceau** (« écho scellé »)

> **Pitch narratif** : Les Fondateurs n'ont pas seulement posé un verrou — ils
> ont laissé un **dispositif de scellement** : des **gardes runiques** qui, au
> moindre dérangement, *classaient* l'intrus dans une **poche de temps figé** —
> un fragment du moment-même du scellement, rejoué à l'infini — afin de le
> **mettre à l'épreuve** : *es-tu digne de descendre plus bas… ou es-tu la
> corruption qui tente de remonter ?* On ne sort de la poche qu'en **refaisant,
> à son échelle, le geste des Quatre** : re-sceller.

Pourquoi des pièges, et pourquoi maintenant ?

1. **But d'origine (lore)** : ces « pièges » ne sont **pas malveillants** — ce
   sont les **fail-safes du sceau**. Tant que Poudlard tenait, ils dormaient.
2. **Pourquoi ils se déclenchent post-victoire** : vaincre Voldemort **élargit
   la faille** (canon ch. 03 §3.6). Le dispositif **se dérègle** : les gardes
   runiques, instables, ne distinguent plus l'héritier de la menace et happent
   le héros. Cohérent avec « la légende attire le plus profond ».
3. **C'est un test, pas une exécution** : la Poche **reflète** le groupe
   (thème Salazar/miroir), **interroge** sa compréhension (thème Rowena),
   **éprouve son courage** sous la peur montante (thème Godric) et lui offre un
   **abri** s'il tient (thème Helga). Réussir = prouver qu'on peut *regarder
   jusqu'au fond* → on récupère un **Éclat** (on comprend mieux le verrou).
4. **Cohérence avec les échos temporels canon** : la Poche **est** un écho
   temporel rendu *marchable*. Elle réutilise et enrichit le vocabulaire déjà
   posé (`seenEchoes`, `echo_scene_sceau`).

## 1.3 Tonalité & ambiance d'entrée

- Au déclenchement : pas une fosse — une **rune instable** sous le pas. Le temps
  se **fige puis se replie**. Le monde réel se **dé-sature / se givre** (froid =
  signature canon de la corruption), un **brouillard temporel** avale la vue.
- Transition forte (voir ÉTAPE 3 Lot 4) : fondu **violet-givre** + grave
  sonore descendant + voix murmurée d'un Fondateur (*« On ne scelle pas par
  peur. »*).
- Dans la Poche : tileset runique (`rune_*` déjà dispo), runes pulsées plus
  denses, échos figés des Quatre en arrière-plan. Sortie = re-scellement →
  **réchauffement** (le froid recule), retour au monde réel à l'endroit exact.

## 1.4 Branchements sur la trame existante (zéro contradiction)

- **Briser le Cycle** : chaque Poche réussie donne **+1 Éclat** (`accumulatedEclats`)
  → accélère le **jalon II** (15 Éclats) **sans le trivialiser** (cap de
  fréquence, voir ÉTAPE 3). **Décision tranchée** : la Poche **ne contribue
  pas** au **jalon I** (`echo_scene_sceau` reste réservé à l'écho canon de
  zone D, pour ne pas spoiler sa découverte).
- **Codex** : nouvelles entrées (§ÉTAPE 2.5) dans les sections *Éclats & Voix* /
  *Lieux* / *Glossaire* — déverrouillées/révélées par la réussite et par Maison.
- **Gardien de la Boucle** : nouvelle quête répétable optionnelle *« Endurer les
  Poches »* (survivre/résoudre N poches) → matériaux Forge/Biblio. S'inscrit
  dans la boucle de farm endgame existante.
- **Maisons** : variante House-aware (réutilise le patron d'illumination
  `founder-chamber-guardians.md` §10.5) — la Poche du **Fondateur de la Maison
  du héros** est plus généreuse / offre un indice.

---

# ÉTAPE 2 — Mécanique détaillée + escape games types

## 2.1 Structure générique d'une Poche du Sceau

| Aspect | Choix de design (recommandé) |
|--------|------------------------------|
| **Taille** | Petit étage **3 salles** (vs 7 normal), généré dédié — couloirs courts, exploration limitée. |
| **Entrée** | Variante de `_triggerDungeonTrap()` : si `victoryAchieved && currentFloor>=11`, ~25 % du tirage piège → Poche (remplace embuscade/dégâts ce coup-là). Gardes anti-spam : §3. |
| **Sortie** | **Conditionnelle** : pas d'escalier libre. Une cellule de sortie (`CELL.SEAL_RIFT`) reste **scellée** (overlay refusé) jusqu'à `escapePocketState.solved === true`. |
| **Objectif** | 1 énigme/puzzle « escape » selon le **type** tiré (3 types, §2.2–2.4), thématisé par Fondateur. |
| **Pression temporelle** | **Jauge de corruption** = budget de **pas** (`escapeStepBudget`). Chaque pas la fait monter ; certaines actions (mauvaise réponse, allumer la mauvaise rune) la font bondir. À 100 % → **échec** (§2.6). Affichée dans `#escape-hud`. Le froid/brume s'intensifie visuellement avec la jauge. |
| **Combat** | Échos ennemis optionnels (1–2, scalés `effectiveFloor`) — *facultatif selon type*. Pas de respawn dans la Poche. |
| **Difficulté progressive** | Budget de pas ↓ et nb de steles/fragments ↑ avec la profondeur de Boucle (`escapeDepth = endgameTierIndex` ou `effectiveFloor`). §3.4. |
| **Durée cible** | **2–4 min** (un seul puzzle, étage minuscule). |

### Variante par Maison (House-aware)
Chaque Poche est thématisée par **un Fondateur** (tiré, biaisé vers la Maison du
héros 1 fois sur 2). Si `chosenHouse` == Maison du Fondateur de la Poche :
- **indice gratuit** révélé d'emblée (1 stèle pré-allumée / 1 fragment localisé) ;
- **+budget de pas** (+20 %) — *« la salle te reconnaît »* ;
- **récompense Maison bonus** (sort/livre élémentaire affilié, voir §2.5).

## 2.2 Type A — **L'Énigme des Quatre** (Rowena — *comprendre*)

> *Le sceau est une phrase. Pour rouvrir le passage, il faut la prononcer juste.*

- **Salle centrale** : 3–4 **stèles** (`CELL.STELE`) portant chacune une énigme
  (réutilise `RIDDLES`, priorité aux 3 énigmes Ruines `r_*` ét.21+).
- **But** : répondre **juste** à toutes les stèles. Chaque bonne réponse
  *« grave un mot »* (allume un glyphe central) ; à la dernière, la cellule
  `SEAL_RIFT` se dé-scelle.
- **Pression** : mauvaise réponse → +15 % corruption + son `playHit` (réutilise
  le `_steleFeedback` existant). Pas de game-over instantané : on retente.
- **Ordre** (difficulté+) : profondeur élevée → les mots doivent être gravés
  **dans l'ordre** (comme `runePuzzle.order`) ; répondre hors-séquence éteint tout.
- **Réutilise** : `answerSteleRiddle` (adapté pour viser `escapePocketState`
  plutôt que `runeStele`), `RIDDLES`, overlay stèle.

## 2.3 Type B — **Le Miroir de Salazar** (Salazar — *sa propre faute*)

> *La poche te reflète. Pour sortir, remets-toi en ordre.*

- **3 fragments** (`eclat_voute`-like, posés dans `itemMap`) dispersés dans les
  salles, à **ramasser** puis **déposer sur un autel central** (`CELL.ALTAR`)
  **dans le bon ordre** (indiqué par 3 indices runiques disséminés).
- **Miroir** : un **écho du groupe** (sprite « echo », réutilise `drawGhostSprite`)
  occupe la salle symétrique. Marcher *réveille* le reflet : s'il atteint l'autel
  avant le héros, il **brouille** un fragment déjà posé (+corruption).
  → puzzle de **combinaison d'objets + timing**, pas de combat obligatoire.
- **But** : 3 fragments déposés dans l'ordre → re-scellement → sortie.
- **Réutilise** : `itemMap`, overlay coffre/autel, `useAltar` (adapté),
  sprites echo.

## 2.4 Type C — **L'Écho du Scellement** (Godric + Helga — *tenir & abriter*)

> *Tu revis l'instant du sceau. La peur monte. Tiens la porte, atteins l'abri.*

- **Pur escape sous pression** : la **brume de corruption avance** (budget de pas
  serré, jauge rapide). Le héros doit **atteindre la cellule de sortie** à
  l'autre bout en **allumant 3 brasiers** (`CELL.RUNE`) en chemin — chaque
  brasier allumé **repousse la brume** (rend ~15 % de budget : *« la lumière
  tient la peur »*, thème Godric anti-peur + Lux Aeterna canon).
- **Abri** (Helga) : 1 cellule `REFUGE`-like au milieu = **pause** (stoppe la
  jauge 3 pas, 1×) — récompense de l'exploration prudente.
- **Échos hostiles** : 1–2 **échos figés** sur le chemin ; les frôler déclenche
  un mini-combat scalé (évitable). Patronus/Lumos Solem valorisés (peur/undead).
- **But** : 3 brasiers + atteindre la sortie avant 100 % corruption.
- **Réutilise** : `CELL.RUNE`/`_activateRune`, `CELL.REFUGE`, brume = surcouche
  visuelle (`DungeonFX`), combats échos = `startBattle`.

## 2.5 Récompenses à la sortie (réussite)

**Garanti** (toute Poche réussie) :
1. **+1 Éclat** (`accumulatedEclats`) + toast canon (*« Tu comprends un peu mieux
   le verrou. »*).
2. **Déverrouillage Codex** : `poche_du_sceau` (révélé à la 1ʳᵉ réussite) +
   `echo_<founder>` de la Poche jouée.
3. **Soin partiel** (le réchauffement) : +30 % PV/PM groupe (cohérent fontaine/refuge).

**Table de butin** (1 tirage, curaté — réutilise les pools loop existants) :
- **Livre élémentaire** affilié au Fondateur (Godric→`livre_fulgari`/feu,
  Rowena→`livre_glacius`, Salazar→`livre_prince`, Helga→`livre_lumos_solem`) —
  *buff élémentaire* demandé par le cahier des charges.
- ou **matériau Forge/Biblio** (Essence/Page) — alimente l'endgame.
- ou **artefact mineur** (pool loop reward items existant).

**Bonus House-match** : si la Poche est celle de la Maison du héros → **un sort
exclusif Ruines** (`Le Mot du Dormeur` / `Tempus Echo` / `Reliquae Temporis` /
`Écho Fantôme`, déjà enseignés par stèle ét.21+) enseigné en avance, **ou** un
2ᵉ tirage de butin.

## 2.6 Conséquences en cas d'échec

Échec = jauge de corruption à 100 % (ou abandon). **Deux régimes** :

- **Standard (toutes difficultés hors Ironman)** — *éjection avec malus
  temporaire* : le groupe est **recraché** à l'endroit d'entrée, **pas de mort**,
  avec un **debuff « Corruption »** : −15 % stats (ATK/DEF/MAG) pendant **N pas
  d'exploration** (réutilise le patron `felixFortuneSteps` à l'envers ; champ
  `corruptionMalusSteps`). Pas d'Éclat, pas de butin. La Poche se referme ; on
  peut réessayer la *suivante* (cooldown standard).
- **Ironman (permadeath)** — *« mort avec héritage Boucle »* (**confirmé : oui**) :
  à 100 %, un **Écho Corrompu** (boss-écho scalé) surgit ; **le combattre est
  obligatoire**. Le perdre = **mort définitive** (flux Ironman existant
  `triggerDeath` → `showIronmanResult`). Le vaincre = sortie en échec *standard*
  (éjection + malus, vie sauve). → tension réelle sans punir le mode normal.

  **Héritage de la mort en Poche** (ce qui la rend « intéressante », non
  punitive-sèche) — lore : *le héros happé devient lui-même une part du sceau,
  un écho de plus*. Concrètement, **sans mécanique cross-run lourde** :
  1. **Profil persistant** (`js/profile.js`, hors-save) : enregistre une mort
     spéciale → débloque un **titre** dédié (*« Scellé dans la Boucle »*) et une
     entrée **Codex du Sorcier** (`recordEndingToProfile`-like / champ
     `sealedDeaths`). Trace visible d'une partie en partie.
  2. **Hall of Fame** : le score Ironman porte un **badge de cause de mort**
     distinct (« Poche du Sceau » vs mort au combat) — réutilise le payload HoF
     existant (champ optionnel, rétro-compatible, repli localStorage).
  3. **Bonus de score symbolique** : un **fait d'arme** « a affronté l'Écho
     Corrompu » crédité au score même en cas de défaite (récompense le courage
     d'être descendu), via `BOSS_FEATS`/`buildIronmanResult`.
  4. **Saveur (flavor only)** : narrativement, le reflet du héros *« rejoint les
     échos du Miroir de Salazar »* — texte de mort dédié, **pas** de réel
     spawn cross-partie (hors-scope, évite la dépendance Mondes Parallèles).
  → l'héritage est **persistant (profil/HoF) et signifiant**, sans introduire de
  système de sauvegarde inter-runs nouveau.

---

# ÉTAPE 3 — Plan d'implémentation (flags, rythme, récompenses, équilibre)

Découpage en **5 lots** livrables indépendamment, chacun testable. Convention
maison : critères de vérification par étape (guidelines §4), plan vivant (§5),
test headless (§7), cache-bump (§8), check PR avant push (§6).

## Lot 0 — Doc & squelette (CE document)
- [x] Audit code + lore vérifié.
- [x] Design ÉTAPE 1/2 rédigé.
- [x] Plan d'implémentation (ci-dessous).
- [x] **Décisions produit confirmées** (2026-06-28) :
  - **Fréquence** : ~1 Poche / **2–3 étages** (pas trop punitif) → 25 %/piège,
    cap 1/étage, cooldown 1 étage. ✅
  - **Échec Ironman** : **oui, mort possible** (garder la tension) **+ héritage
    intéressant** (profil persistant + badge HoF + fait d'arme — voir §2.6). ✅
  - **Jalon I « Briser le Cycle »** : la Poche **ne crédite PAS**
    `echo_scene_sceau` (ne pas spoiler la découverte canon en zone D). ✅

## Lot 1 — Cœur technique : entrée/sortie d'un étage éphémère ✅ FAIT (2026-06-28)
**Objectif** : pouvoir entrer dans une Poche vide et en ressortir proprement,
sans casser save/load ni le cache d'étage. *Le plus risqué — fait en premier.*

> **Livré** : `js/escape-pocket.js` (gate pur `canTriggerEscapePocket` + `maybe
> TriggerEscapePocket`/`enterEscapePocket`/`exitEscapePocket`/`generateEscape
> Pocket`), `CELL.SEAL_RIFT=19`, flags state sérialisés, hook dans
> `_triggerDungeonTrap`, overlay `SEAL_RIFT` + `handleCellEntry`, sérialisation
> save (round-trip mid-poche), MANIFEST loader, doc CLAUDE.md, cache-bump.
> Tests : `units.js` (gate, 10 assertions) + smoke `scenarioEscapePocket`
> (entrée/sortie/save/cap). Stratégie retenue : **swap d'arrays hors
> `floorDungeons`** + `_escapeSnapshot` (références conservées, Set/Map en
> tableaux sérialisables) ; `currentFloor` **inchangé** (la poche appartient à
> l'étage source). Poche minimale (couloir « atteins la faille », `solved:true`)
> — l'épreuve réelle arrive au Lot 2. Malus d'échec : flag posé, effet stat
> reporté au Lot 3. Incompatibilité visite inter-mondes gardée dès le gate.

- **Nouveau module** `js/escape-pocket.js` (chargé après `dungeon-spawning.js`,
  avant `movement.js`). Expose :
  - `maybeTriggerEscapePocket()` — décide & déclenche (appelé depuis
    `_triggerDungeonTrap`).
  - `enterEscapePocket(type)` / `exitEscapePocket(success)`.
  - `generateEscapePocket(type, sourceFloor)` — bâtit l'étage (Lot 2).
- **Stratégie « swap d'arrays », hors `floorDungeons`** (la moins invasive) :
  - `enterEscapePocket` **stashe** l'état live de l'étage source dans un objet
    dédié `_escapeSnapshot` (même payload que `_saveFloorToCache` :
    `dungeon/visited/enemyMap/itemMap/px/py/dir` + trackers), **sans** toucher
    `currentFloor` (le scaling/thème continuent de lire l'étage source — voulu :
    la Poche *appartient* à cet étage).
  - On remplace les arrays live par ceux de la Poche générée.
  - `exitEscapePocket` restaure depuis `_escapeSnapshot`, vide la Poche, replace
    `playerX/Y/dir` à l'entrée, applique récompense (succès) ou malus (échec).
- **Nouvelle cellule** `CELL.SEAL_RIFT = 19` (`data.js`) — sortie scellée.
  `handleCellEntry` → overlay dédié (refusé tant que `!escapePocketState.solved`).
- **Flags state** (`state.js`, **tous sérialisés**) :
  ```
  inEscapePocket=false, escapePocketType=null, escapeReturnPos=null,
  escapePocketState=null /*{solved, progress, ...}*/, _escapeSnapshot=null,
  escapeStepBudget=0, escapeStepSpent=0, corruptionMalusSteps=0,
  escapePocketsCleared=0 /*stat*/, escapePocketUsedFloors=new Set() /*cooldown*/
  ```
- **Save/load** (`save.js`) : sérialiser ces flags + `_escapeSnapshot`. Un save
  pris **dans** la Poche restaure la Poche **et** le snapshot → reprise correcte
  (cohérent avec le deep-copy existant). *Pas de blocage du save.*
- **Garde-fous** : pas de Poche **dans** une Poche (`if (inEscapePocket) return`) ;
  HP groupe ≥ 1 avant téléport ; `_assertDungeonConnected` sur la Poche générée.
- **Loader MANIFEST** : ajouter les globals critiques du module.

*Vérif* : scénario smoke `scenarioEscapePocketEnterExit` (forcer l'entrée via
hook debug, marcher, forcer `solved`, sortir, asserter retour à l'étage/position
source + arrays restaurés). `node tests/units.js` pour le helper de chance.

## Lot 2 — Génération de la Poche + 1 type jouable (Type A)
- `generateEscapePocket('riddle', floor)` : 3 salles, stèles `CELL.STELE` +
  `CELL.SEAL_RIFT`, `escapePocketState` initialisé (liste d'énigmes, ordre).
- Adapter `answerSteleRiddle` (ou variante `answerEscapeStele`) pour pointer sur
  `escapePocketState` ; à la dernière bonne réponse → `solved=true`, dé-sceller.
- `#escape-hud` (HTML + `css/escape-pocket.css` + JS) : objectif + jauge de
  corruption + budget de pas. Décrément/incrément dans `_step` (movement.js,
  call-site défensif).

*Vérif* : smoke `scenarioEscapeRiddleSolve` (résoudre → sortie ouverte → Éclat +
Codex). Régression : `node tests/smoke.js` (dungeon, save, combat).

## Lot 3 — Types B & C + variante Maison
- Type B (miroir/combine) et Type C (écho sous pression) ; tirage de type
  (biais Maison 50 %).
- House-aware : indice/budget/récompense bonus selon `chosenHouse`.

*Vérif* : smoke par type ; units pour la courbe de budget et le biais de tirage.

## Lot 4 — Immersion (transition, audio, FX) + Codex/quête
- Transition d'entrée/sortie dédiée (fondu violet-givre via
  `#tier-transition-overlay` réutilisé ou overlay propre) + voix Fondateur +
  grave sonore (`AudioSystem`). Brume = `DungeonFX`.
- Entrées **Codex** (`codex.js`) : `poche_du_sceau`, `echo_godric/rowena/
  salazar/helga` (conditions : `escapePocketsCleared`, `house`, `eclatLoop`).
  Jalon I : la 1ʳᵉ réussite `seenEchoes.add('echo_scene_sceau')` (optionnel,
  à valider vs design de Briser le Cycle).
- Quête répétable Gardien de la Boucle *« Endurer les Poches »*
  (`quests-templates.js`, `everyLevels`).

*Vérif* : smoke (codex unlock, fx no-op si modules absents), check_doc_modules.

## Lot 5 — Équilibrage & polish
- Sim/calibration (réutiliser l'esprit `tools/sim-difficulty.js` si applicable,
  sinon réglage manuel + telemetry `BalanceLog`).
- Doc finale : section CLAUDE.md « Poches du Sceau » + ch. `docs/histoire/10`/`11`.

### Rythme & équilibrage (valeurs de départ proposées)
| Levier | Valeur initiale | Note |
|--------|-----------------|------|
| Gate | `victoryAchieved && currentFloor>=11` | Boucle uniquement. |
| Chance par piège déclenché | **25 %** → Poche (sinon embuscade/dégâts comme avant) | Tunable. |
| Cap par étage | **1** Poche max / visite d'étage (`escapePocketUsedFloors`) | Anti-spam. |
| Cooldown | pas 2 étages consécutifs | Anti-fatigue. |
| Fréquence nette | ≈ **1 Poche / 2–3 étages** (1–2 pièges/étage) | Cible cahier des charges. |
| Budget de pas (Type C / pression) | `base 40 − 2×escapeDepth` (plancher 18) | Difficulté progressive. |
| Nb stèles/fragments | `3 + floor(escapeDepth/3)` | Idem. |
| Éclats / réussite | **+1** (cap implicite par fréquence) | N'auto-trivialise pas le jalon 15. |
| Malus échec (standard) | −15 % stats / **20 pas** | Non létal. |

## Garde-fous transverses
- **cache-bump obligatoire** : `escape-pocket.js`, `escape-pocket.css`,
  `data.js`, `movement*.js`, `save.js`, `codex.js`, `state.js`, `index.html`,
  `loader.js` → bump `?v` + `CACHE_VERSION` (skill `cache-bump` +
  `node tools/check_cache_versions.js --base origin/master`).
- **Non-régression** : `node tests/units.js` puis `node tests/smoke.js` verts à
  chaque lot ; nouveaux scénarios ajoutés **dans le même commit** (§7).
- **`check_doc_modules.js`** : tout module ajouté à `index.html` ⇒ MAJ section
  « Structure des fichiers » de CLAUDE.md.
- **Surcouches défensives** : FX/audio/HUD gardés (`if (window.X)`), zéro
  régression si un module manque.
- **PR** : ne pas créer de PR sans demande explicite ; vérifier l'état PR avant
  tout push (§6).

## Risques & points ouverts
- **Sérialisation de l'étage éphémère** : risque principal. Mitigé par la
  stratégie « snapshot dédié + arrays live = Poche » (Lot 1) testée en priorité.
- **Interaction avec les Mondes Parallèles** (visites) : interdire l'entrée en
  Poche pendant une visite inter-mondes (`inEscapePocket` incompatible avec le
  snapshot de visite) — garde-fou à ajouter Lot 1.
- **Briser le Cycle / jalon I** : ✅ **tranché** — la Poche **ne crédite pas**
  `echo_scene_sceau` (découverte canon en zone D préservée). Conséquence : Lot 4
  ne touche **pas** `seenEchoes`; le jalon I reste acquis uniquement par l'écho
  canon de zone D.
```
