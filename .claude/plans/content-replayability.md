# Contenu & Rejouabilité — Ruines Anciennes, Boucle Ténébreuse & Quêtes/PNJ

> Plan vivant (guidelines §5). Branche : `claude/hogwarth-content-replayability-7p1tre`.
> Objectif : augmenter la durée de vie et la sensation de richesse **sans exploser
> la complexité**, en réutilisant les systèmes déjà câblés (FLOOR_EVENTS, ZONE_AMBIANCE,
> RIDDLES, QUEST_TEMPLATES, NPCS, CODEX_ENTRIES, effectiveFloor/Boucle).
>
> **Principe directeur** : tout le contenu ci-dessous est **données-only** ou s'appuie
> sur des points d'extension existants. Aucun nouveau sous-système moteur n'est requis
> pour la tranche prioritaire (P0).

Légende : ✅ existe déjà · 💡 idée bonus (hors-scope strict) · ❓ à valider avant code.

---

## État des lieux (ce qui existe déjà — ne PAS réinventer)

| Système | Fichier(s) | Statut |
|---|---|---|
| ✅ Thème Zone D « Ruines Anciennes » (14+) | `floor-themes.js` `FLOOR_THEMES.ancient` | tileset `rune_*` + ambiant `abyss` |
| ✅ Sous-paliers ambiance D (megalith 14-16 / runic 17-20 / before 21+) | `floor-ambiance.js` `ZONE_AMBIANCE.ancient.tiers` | floorLines/smell/sound/temp |
| ✅ Chambres des Fondateurs (ét. 17) | `floor-ambiance.js` `FOUNDER_CHAMBERS` + 4 gardiens `monsters.js` | placement garanti `_ensureChamberGuardiansPresent` |
| ✅ Échos temporels (codex) | `floor-ambiance.js` `TEMPORAL_ECHOES` / `SIGNATURE_ECHOES` / `VOIX_DES_RUINES` | 13→14 beat |
| ✅ Événements d'étage (6) | `floor-events.js` `FLOOR_EVENTS` (chance 0.35) | hante/calme/marche/tresor/pieges/runique |
| ✅ Puzzles runiques + stèles d'énigme | `dungeon.js` `runePuzzle`/`runeStele`, `riddles.js` (9 devinettes) | barrière→coffre |
| ✅ Boucle Ténébreuse : recyclage `effectiveFloor`, +1 Éclat/étage, `loopNumber`, scaling `ENDGAME_SCALING` | `dungeon-scaling.js`, `movement-floors.js` `_maybeAdvanceDarkLoop` | accumulatedEclats sérialisé |
| ✅ Gardien de la Boucle + 4 purges répétables | `dungeon-spawning.js`, `quests-templates.js` `purge_*` | `everyLevels:2` |
| ✅ Variantes de Boucle escaladées : `LOOP_VARIANT_TIERS` (Ténébreux/Spectral/Abyssal/Cauchemardesque/Funeste) + `applyLoopVariant(monster, n)` (nom préfixé + resist ténèbres / weak lumière, déterministe) | `dungeon-scaling.js` | par palier `n`, zéro RNG |
| ✅ Suffixes dialogue `darkLoopLines` (forme **objet par palier** `{1,2,3,5}`) / `eclatLines` | `npc-dialog.js` `_darkLoopSuffixPages`/`_eclatSuffixPages` | par PNJ |
| ✅ Fins dérivées `computeEndingType` : `victory` / `victory_pact` (Pacte Serpentard, `slythPactChoice`) / `cycle_broken` | `endgame.js`, `break-cycle.js` | + flags `*SignatureDone` |
| ✅ Héritage visible cross-plan : `OUTREMONDE_SOUVENIRS` (bonus stat débloqués par métriques) + profil persistant (`victories`/`cyclesBroken`/titres) | `data-world.js`, `profile.js` | modèle à imiter |
| ✅ « Briser le Cycle » (`reflet_mythe`, 4 jalons, fin alternative) | `break-cycle.js`, codex `cycle_brise` | cosmétique prestige |
| ✅ NG+ empilable (héritage = challenge, zéro loot hérité) | `profile.js`, `dungeon-scaling.js` `ngPlusScaling` | victoires → cran |
| ✅ Quêtes : kill/item/herb/floor/pages/donate/search/riddle, farming, répétables, chaînes (prereq) | `quests.js`, `quests-templates.js` | reward xp/gold/item/spell/recipes/stats/houseSetReward |
| ✅ Dialogues conditionnels : `dialoguesByQuest`, `dialoguesByHouse`, `contextualLore`, `contextualReaction`, `idleRandom` | `npc-dialog.js` `_resolveDialogSource` | cascade priorités |
| ✅ Codex : unlock (OU) / reveal (ET) / corrupted, variants.house, teachesSpell | `codex.js` `CODEX_ENTRIES` | 12 types de conditions |

**Conséquence de cadrage** : l'essentiel de la mission consiste à **remplir des registres
existants** avec du contenu cohérent, pas à bâtir des systèmes. Les 2-3 petites
extensions moteur nécessaires sont identifiées à l'Étape 2 et restées minimales.

---

# ÉTAPE 1 — Spécifications & contenu prêt à intégrer

## AXE 1 — Nouveaux étages & événements (Ruines Anciennes, Zone D)

### 1.1 Sous-paliers d'étages (variantes immersives)

La Zone D est `[14, null]` (ouverte) ; on ne « crée » pas des étages numérotés en dur —
on **enrichit les trois sous-paliers** `ZONE_AMBIANCE.ancient.tiers` et on ajoute des
**variantes de salle thématiques** (cellules + flavor) tirées par sous-palier. Cinq
variantes proposées, chacune reliée à la lore (Fondateurs / Clé de Voûte / Dormeur).

| # | Variante (sous-palier) | Étages | Visuel | Ambiance / Sons / Température | Écho temporel | Lien lore |
|---|---|---|---|---|---|---|
| D1 | **Le Vestibule des Mégalithes** | 14-16 | Monolithes inclinés, dolmens fendus, lichen phosphorescent bleu | Sons : goutte-à-goutte minéral, souffle profond ; Temp : *fraîche minérale* | Silhouettes de bâtisseurs portant des pierres | ✅ Étend `megalith` |
| D2 | **La Galerie des Runes Vives** | 17-20 | Cristaux bruts jaillis des murs, runes qui rougeoient au passage | Sons : bourdonnement runique, crépitements ; Temp : *surnaturelle, sèche et chaude* | La main des Fondateurs gravant le premier sceau | ✅ Étend `runic` |
| D3 | **Le Cœur Fêlé de la Voûte** 💡 | 18-20 (rare, 1 salle/étage) | Une **fêlure** lumineuse au plafond d'où suinte la corruption | Sons : tintement de verre sous tension, pouls lointain ; Temp : *oscillante* (chaud/froid) | La Clé de Voûte au moment de la fêlure | Clé de Voûte (corruption pré-Poudlard) |
| D4 | **Les Strates de l'Avant-Monde** | 21+ | Géométrie « qui dérange », racines géantes pétrifiées, absence d'angles droits | Sons : aucun écho (le son meurt), un *battement* organique très lent ; Temp : *abyssale* | Aucun (avant l'écriture → avant la mémoire) | Le Dormeur des Fondations |
| D5 | **Le Reliquaire des Quatre** 💡 | 17 (jouxte les Chambres) | Antichambre commune aux 4 Chambres, 4 vitraux ternis | Sons : 4 voix qui se chevauchent en murmure ; Temp : *neutre, suspendue* | Les Quatre scellant **ensemble** (avant la division) | Fondateurs unis avant la fracture |

> Implémentation : D1/D2/D4 sont des **enrichissements de `floorLines`** existants (zéro
> moteur). D3/D5 nécessitent une **variante de salle** (nouveau type d'événement, voir 1.2)
> ou une cellule de flavor — proposés en bonus.

### 1.2 Nouveaux événements d'étage (registre `FLOOR_EVENTS`)

Forme exacte (confirmée `floor-events.js`) : `{ id, weight, name, desc }` + effet dans
`generateDungeon` (switch sur `currentFloorEvent`). Les 6 actuels restent. On en ajoute 6,
dont 4 **gatés Zone D** (n'apparaissent qu'à floor ≥ 14 — via filtre dans `rollFloorEvent`,
voir Étape 2).

| # | id | name | Effet mécanique (réutilise l'existant) | Lore / ambiance | Gate |
|---|---|---|---|---|---|
| E1 | `echo_temporel` | Écho temporel | Force un **écho visible** (déjà géré par `TEMPORAL_ECHOES`) + 1 entrée codex tirée ; aucune altération de spawn | « Le passé rejoue ici » | floor ≥ 12 |
| E2 | `givre_ancien` | Givre ancien | Active l'overlay givre à intensité +1 (réutilise `_applyCorruptionAmbiance`) ; ennemis +faiblesse feu cosmétique | Froid surnaturel (signature 1) | floor ≥ 14 |
| E3 | `sceau_fissure` | Sceau fissuré | Garantit **1 puzzle runique** + double sa récompense (comme `runique`), mais y joint un **mini-combat narratif** au déverrouillage (1 gardien faible) | Clé de Voûte | floor ≥ 14 |
| E4 | `chambre_scellee` | Chambre scellée | Garantit la **salle scellée DOOR→CHEST** + la clé droppée par un ennemi (mécanique existante) ; loot d'un cran de rareté supérieur | Vestige des Fondateurs | floor ≥ 11 |
| E5 | `procession` 💡 | Procession d'ombres | Densité ennemis = `hante` (0.85) **mais** chaque kill rend +1 Éclat cosmétique (fil rouge) | Les morts marchent en boucle | floor ≥ 18 (Boucle) |
| E6 | `silence` 💡 | Silence du Dormeur | `calme` (0.30) + désactive la musique (silence total), barks `loopEcho` | Le Dormeur respire ; ne pas l'éveiller | floor ≥ 21 |

> ❓ À valider : faut-il **pondérer plus fort** les events Zone D entre eux (sinon la
> tranche D garde surtout les 6 events de base) ? Proposition : à floor ≥ 14, ajouter les
> events D au pool **et** baisser le poids de `calme`/`marche` (moins thématiques en abysse).

### 1.3 Événements spéciaux / rencontres uniques (puzzles, choix, combats narratifs)

Ces 6 « événements spéciaux » sont des **beats one-shot** (modèle `FLOOR_SCRIPTED_BEATS`,
déjà câblé pour étages 1/4/8/17), déclenchés à un étage précis, persistés via un Set
`seenScriptedBeat`/flag dédié. Aucun nouveau système : ce sont des données + un appel dans
le callback de transition d'étage.

| # | Nom | Type | Étage | Déroulé | Récompense | Lore |
|---|---|---|---|---|---|---|
| S1 | **La Stèle de Rowena** | Puzzle (énigme) | 15 | Stèle dédiée posant une devinette **lore-lourde** (Clé de Voûte) ; bonne réponse → page de Codex `voix_rowena` + sort `Revelio` indice | Codex + indice faiblesse boss | Rowena nomme la corruption |
| S2 | **Le Pacte de Salazar** | Choix narratif | 16 | Voix derrière un passage scellé : *accepter* (raccourci + buff MAG, mais marque de corruption cosmétique) ou *refuser* (Codex « Défiance ») | Buff OU entrée Codex | Écho de Salazar (choix gris) |
| S3 | **Le Brasier de Godric** | Combat narratif | 17 | Brasier éteint ; le rallumer invoque 1 vague d'ombres (combat scénarisé) ; victoire → Chambre du Lion s'illumine même hors-Gryffondor (cosmétique) | XP + écho | Étendard de Godric |
| S4 | **Le Refuge d'Helga** 💡 | Choix / répit | 18 | Niche tiède ; *se reposer* (soin 50 %, comme REFUGE) ou *offrir un objet aux égarés* (sacrifie 1 conso → +Éclat + bark Poufsouffle) | Soin OU Éclat | Premier Refuge creusé |
| S5 | **L'Antichambre des Quatre** | Puzzle multi-runes | 19 | 4 dalles-runes (1 par Maison) à allumer dans l'ordre du Choixpeau ; résolu → coffre légendaire + écho `echo_scellement` complété | Coffre légendaire | Les Quatre unis |
| S6 | **Le Battement** | Rencontre atmosphérique | 21+ | Aucune action : un texte solennel + barks `loopEcho` ; marque le franchissement vers l'Avant-Monde ; pose le flag `heardDormeur` (gate codex) | Codex `dormeur_fondations` | Le Dormeur (jamais affronté) |

> S1, S2, S5 réutilisent **directement** `riddles.js`, `runeStele`, `runePuzzle`. S3 réutilise
> le spawn de combat. S4 réutilise `REFUGE`. S6 réutilise `VOIX_DES_RUINES`/barks. → coût moteur quasi nul.

### Nouvelles devinettes (`RIDDLES`) — prêtes à coller

```js
// js/riddles.js — append au tableau RIDDLES
{ id: 'r_voute_corruption',
  question: "La Clé de Voûte ne scellait pas une chose, mais deux. L'une "
          + "vint après les Fondateurs. Quelle était l'AUTRE ?",
  choices: ['Voldemort', 'Une corruption antérieure à Poudlard',
            'Le Basilic', 'Les Reliques de la Mort'],
  answer: 1,
  rewardHint: "La pierre frémit : tu as nommé ce que l'école fut bâtie pour oublier." },
{ id: 'r_quatre_unis',
  question: "Avant de se diviser en quatre maisons, les Fondateurs firent une "
          + "seule chose ensemble, sous l'école. Laquelle ?",
  choices: ['Ils bâtirent la Grande Salle', 'Ils posèrent un sceau',
            'Ils plantèrent le Saule', 'Ils créèrent le Choixpeau'],
  answer: 1,
  rewardHint: "Les quatre vitraux s'illuminent à l'unisson, le temps d'un battement." },
{ id: 'r_dormeur',
  question: "Sous l'Avant-Monde, une présence repose, antérieure à l'écriture "
          + "donc aux runes. On ne l'affronte jamais. Comment l'appelle-t-on ?",
  choices: ['Le Veilleur du Seuil', 'Le Dormeur des Fondations',
            'Le Seigneur des Ténèbres', 'Le Basilic Ancestral'],
  answer: 1,
  rewardHint: "Un battement lent répond. Mieux vaut ne pas réveiller ce qui rêve." }
```

---

## AXE 2 — Renforcement des variantes de la Boucle Ténébreuse

Rappel mécanique existant : post-victoire, `effectiveFloor(floor)` rebase les pools ;
`_maybeAdvanceDarkLoop` accorde +1 Éclat/étage (`accumulatedEclats`), gère `loopNumber`,
XP passive ; `ENDGAME_SCALING` durcit récursivement (palier `n`). Suffixes de dialogue
`darkLoopLines` (≥ floor 18) + `eclatLines` (par palier d'Éclats) déjà branchés.
**On amplifie la lisibilité et la variété**, par 3 leviers : Maison, Éclats/quêtes, palier de Boucle.

### 2.1 Modifications par niveau de Boucle (≥ 3 par palier)

| Palier de Boucle | Étages | Altérations proposées (réutilise l'existant) |
|---|---|---|
| **Boucle 1** | 11-13 | (a) ✅ override runique textures ; (b) +nouvel event `chambre_scellee` plus fréquent ; (c) suffixes `darkLoopLines` activés un cran plus tôt pour 1-2 PNJ clés ; (d) 💡 Gardien de la Boucle gagne 1 ligne de dialogue par Éclat porté |
| **Boucle 2** | 14-20 | (a) ✅ Ruines + Chambres des Fondateurs ; (b) ✅ boss/ennemis en variant **`Spectral`** via `applyLoopVariant(m, 2)` ; (c) events `givre_ancien`/`sceau_fissure` au pool ; (d) ✅ écho de signature **déchiré** (`floor-ambiance.js` 640-743) ; (e) 💡 1 Chambre supplémentaire s'illumine si la quête signature de Maison est terminée |
| **Boucle 3+** | 21+ | (a) ✅ Avant-Monde + scaling ★ + variants `Abyssal`/`Cauchemardesque`/`Funeste` ; (b) event `procession`/`silence` ; (c) beat `S6 Le Battement` ; (d) ✅ `reflet_mythe` accessible (Briser le Cycle) ; (e) 💡 dialogues PNJ `darkLoopLines[3/5]` registre **oraculaire** |

> 💡 **Mutations d'ennemis par palier** (extension de `applyLoopVariant`, hors-scope P0) : aujourd'hui
> tous les paliers appliquent la même mutation (resist ténèbres / weak lumière). On peut **graduer** :
> Spectral → ignore 1 cran d'armure ; Abyssal → réduit les résistances du groupe ; Cauchemardesque →
> applique `fear` ; Funeste → `curse`. ❓ Impact équilibrage : à re-sim (`--endgame`) si adopté.

### 2.2 Variantes selon Maison / Héros / Éclats / Quêtes (lisibilité de l'héritage)

| Vecteur | Source de vérité existante | Variante de Boucle proposée |
|---|---|---|
| **Maison** (`chosenHouse`) | `FOUNDER_CHAMBERS`, `dialoguesByHouse`, `HOUSE_AMBIANCE_MOD` | La Chambre de ta Maison s'illumine ; écho signature personnalisé ; le Gardien de la Boucle te nomme par ta Maison ; 1 quête de purge supplémentaire orientée Maison (cible = boss de la couleur opposée) |
| **Héros** (`party`) | barks `HERO_BARKS`, ancrage Maison canon | Bark `loopEcho`/`tierTransition` spécifique ; 💡 si héros canon ≠ `chosenHouse`, ligne de tension supplémentaire (déjà supporté par `houseTension`) |
| **Éclats** (`accumulatedEclats`) | `eclatLines`, codex `porteur_eclats`, `_eclatSuffixPages` | Paliers visibles **renforcés** : à 5 / 10 / 15 Éclats, toast dédié + entrée codex + cosmétique cape ; le Gardien commente le palier |
| **Quêtes terminées** (`completedQuests`) | `completedQuests` Set, flags signature | Le Gardien de la Boucle propose des **purges avancées** seulement si les purges de base sont terminées ; quêtes signature terminées → Chambre alliée pacifiée en Boucle |

### 2.3 Système d'héritage plus visible & impactant

Constat : NG+ est « zéro loot hérité » (design verrouillé ch.13, on **n'y touche pas** — l'agent
de scaling confirme que l'héritage d'état NG+ est explicitement déconseillé en V1).
L'héritage *narratif* (Éclats, fins, titres profil) existe mais reste discret. **Modèle à imiter** :
`OUTREMONDE_SOUVENIRS` (`data-world.js`) débloque des bonus par métriques franchies — on peut
décliner des **« Souvenirs de Boucle »** (paliers d'Éclats → titre/cosmétique, pas de stat). Propositions
**non-mécaniques** (cosmétique + lisibilité, zéro impact équilibrage) :

| # | Proposition | Mécanisme (existant) | Visibilité |
|---|---|---|---|
| H1 | **Toasts de palier d'Éclats** (5/10/15) | hook dans `_maybeAdvanceDarkLoop` | ✅ toast + son |
| H2 | **Titres de profil enrichis** (« Porteur de N Éclats », « A brisé le Cycle K fois ») | `profile.js` `computeProfileTitles` | Hub démarrage |
| H3 | **Codex « Mémoire des Boucles »** : 1 entrée par palier de Boucle franchi | `CODEX_ENTRIES` + condition `eclatLoop`/`floor` | Onglet Codex |
| H4 💡 | **Cosmétique cumulative** (aura de cape selon Éclats/cycles brisés) | `OUTREMONDE_COSMETICS` ou nouveau champ profil | Sprite joueur |
| H5 | **HUD : compteur d'Éclats visible** en Boucle | `ui.js` mini-badge | HUD permanent post-victoire |

> ❓ À valider : H4 (aura cosmétique) touche le rendu sprite — confirmer si on veut un asset
> ou un simple filtre CSS de teinte. H5 ajoute un élément HUD permanent (encombrement mobile ?).

---

## AXE 3 — Finalisation des quêtes secondaires & interactions PNJ

### 3.1 Six à huit quêtes secondaires (prêtes à intégrer)

Forme confirmée (`quests-templates.js`) : `{ id, title, giver, desc, location, objectives:[{type,...}],
reward:{...}, prereq?, repeatable?, minFloor?, house?, ... }`. Toutes les quêtes ci-dessous
utilisent des PNJ existants ou un PNJ original minimal (voir 3.2).

| # | id | Giver (PNJ) | Étage | Objectif (type) | Récompense | Arc / lien |
|---|---|---|---|---|---|---|
| Q1 | `echos_celeste` | Céleste (lore, errante 7+) | 7-13 | `riddle`×1 + `floor` 14 atteint | sort `Revelio` + Codex `voix_rowena` | Cartographie des échos |
| Q2 | `givre_pomfresh` | Pomfresh (ét. 2, Boucle) | 14+ | `item` `cristal_givre`×3 (drop Zone D) | potion premium `essence_chaleur` + xp | Soigner le froid surnaturel |
| Q3 | (rappel signature 🐍) | Écho de Salazar (passage scellé, ét. 16) | 16 | scène-rappel du Pacte (lit `slythPactChoice` existant) | écho/Codex contextualisé | ✅ Réutilise la signature Serpentard, **pas** un nouveau choix |
| Q4 | `brasiers_godric` | Chevalier Fantôme (ét. 8/17) | 8-17 | `kill` (gardiens d'ombre) ×3 — 1 par brasier | artefact premium `etendard_godric` | Étendard 🦁 |
| Q5 | `reliquaire_quatre` | Gardien de la Boucle (11+) | 17-19 | `riddle` `r_quatre_unis` + `riddle` `r_voute_corruption` | coffre légendaire + Codex `echo_scellement` | Les Quatre unis |
| Q6 | `purge_givre` (répétable) | Gardien de la Boucle | 18+ | `kill` Spectre de Givre ×2 | `repeatableReward` essence + 270 g | Farm matériaux (modèle `purge_*`) |
| Q7 | `memoire_manon` 💡 | Manon (ét. 3) | 3 → 14 | `pages`×2 + `floor` 14 | sort + clôture arc Manon en Boucle | Deuil / grimoire d'Élara |
| Q8 | `veille_dormeur` 💡 | (beat S6, sans PNJ) | 21+ | `floor` 21 atteint (flag `heardDormeur`) | Codex `dormeur_fondations` + titre profil | Le Dormeur |

> Q3/Q4/Q5 sont des **enrobages** des événements spéciaux S2/S3/S5 (Axe 1) → cohérence
> directe. Q6 clone la mécanique `purge_*` déjà testée. Q2 introduit 1 nouvel item de drop
> (`cristal_givre`) — voir Étape 2.

```js
// Exemple prêt à coller — js/quests-templates.js (modèle purge_*)
{ id: 'purge_givre', title: 'Purge — Spectres de Givre', giver: 'Gardien de la Boucle',
  desc: "Le froid de l'Avant-Monde s'épaissit. Disperse les spectres qui le portent.",
  location: 'Ruines Anciennes (Boucle)', minFloor: 18,
  objectives: [{ type: 'kill', monsterId: 'spectre_givre', amount: 2, progress: 0, completed: false }],
  reward: { gold: 270, item: 'essence_outremonde' },
  repeatable: { everyLevels: 2 }, repeatableReward: { xp: 80, gold: 270, item: 'essence_outremonde' } }
```

### 3.2 Interactions PNJ renforcées (dialogues conditionnels)

On exploite les couches déjà branchées dans `_resolveDialogSource` :
`dialoguesByQuest` > `dialoguesByHouse` > `dialogues`, plus `contextualLore`,
`contextualReaction`, `eclatLines`, `darkLoopLines`, `idleRandom`.

| PNJ | Renforcement proposé | Couche utilisée |
|---|---|---|
| **Gardien de la Boucle** (existant) | 4 paliers de ton selon Éclats (0/5/10/15) ; nomme la Maison ; commente cycle brisé | `eclatLines` + `dialoguesByHouse` + `postVictoryLines` |
| **Pomfresh / Mimi / Scamander** (existants) | `darkLoopLines` enrichis (réaction corruption) ; `contextualReaction` après kill de boss Ténébreux | `darkLoopLines`, `contextualReaction` |
| **Écho de Salazar** (nouveau, minimal) | PNJ « voix » derrière passage scellé ét. 16 ; offre Q3 (pacte/défiance) | `npcs.js` nouveau, `dialoguesByQuest` |
| **Chevalier Fantôme** (nouveau ou existant ✅) | Donne Q4 ; `contextualLore` si Greyback tirable | `dialoguesByQuest`, `contextualLore` |
| **Céleste / héros errant** 💡 | Lore par héros, réagit à `chosenHouse` | `dialoguesByHouse`, `idleRandom` |

**Petits arcs personnels** (légers, résolubles en filigrane — ton ch.05/06) :
- Manon : clôture en Boucle (Q7) — le deuil « revient altéré ».
- Chevalier Fantôme : se repose enfin une fois les 3 brasiers rallumés (Q4) → disparaît, écho.
- Gardien de la Boucle : passe de las → reconnaissant si le joueur porte 15 Éclats.

### 3.3 Intégration Codex & récompenses (artefacts Premium / potions / sorts)

| Contenu | Entrée Codex | Récompense liée |
|---|---|---|
| Voix de Rowena (S1/Q1) | `voix_rowena` (unlock `riddle:r_voute_corruption`) | sort `Revelio` indice |
| Pacte de Salazar (S2/Q3) | `pacte_salazar` (unlock `quest:pacte_ou_defiance`, variants par branche) | buff MAG ou Codex `defiance` |
| Les Quatre unis (S5/Q5) | `echo_scellement` ✅ (compléter via `riddle`) | coffre légendaire |
| Le Dormeur (S6/Q8) | `dormeur_fondations` (unlock flag `heardDormeur`) | titre profil |
| Cristal de givre (Q2) | `givre_ancien` (unlock `item:cristal_givre`) | potion premium `essence_chaleur` |

> Les artefacts/potions cités (`etendard_godric`, `essence_chaleur`) sont **nouveaux items**
> nécessitant icône (skill `add-item-icon`) — fléchés en P1, pas P0.

---

# ÉTAPE 2 — Plan d'implémentation

## 2.A Structure des données (où ça vit)

| Contenu | Fichier | Forme | Moteur ?|
|---|---|---|---|
| Sous-paliers D1/D2/D4 (flavor) | `floor-ambiance.js` `ZONE_AMBIANCE.ancient.tiers` | append `floorLines/smell/sound` | non |
| Events E1-E6 | `floor-events.js` `FLOOR_EVENTS` | `{id,weight,name,desc}` + gate | **oui** (gate + switch) |
| Beats spéciaux S1-S6 | `floor-ambiance.js` (registre type `FLOOR_SCRIPTED_BEATS`) | `{floor, text, action?}` | **oui** (appel transition) |
| Devinettes | `riddles.js` `RIDDLES` | `{id,question,choices,answer,rewardHint}` | non |
| Quêtes Q1-Q8 | `quests-templates.js` `QUEST_TEMPLATES` | template standard | non (sauf type `choice`) |
| PNJ (Salazar, Chevalier) | `npcs.js` `NPCS` | objet NPC + `placement`/`random` | non |
| Dialogues conditionnels | `npcs.js` (par PNJ) | `dialoguesByQuest/ByHouse/eclatLines/darkLoopLines/contextualLore` | non |
| Entrées Codex | `codex.js` `CODEX_ENTRIES` | unlock/reveal/variants | non |
| Variantes Boucle (toasts paliers, codex mémoire) | `movement-floors.js` `_maybeAdvanceDarkLoop` + `codex.js` | hook + données | **oui** (hook léger) |
| Items neufs (`cristal_givre`, artefacts) | `data-items.js` | item standard + drop sur monstre | non (icône à part) |

## 2.B Flags & variables nécessaires (minimisés)

Réutiliser au maximum les existants : `currentFloorEvent`, `accumulatedEclats`, `loopNumber`,
`completedQuests`, `availableQuests`, `seenScriptedBeat`, `victoryAchieved`, `chosenHouse`.

Nouveaux (tous **sérialisés** dans `_serializeState`/`_applyState`, save.js) :

| Flag | Type | Rôle | Défaut |
|---|---|---|---|
| `seenSpecialBeats` | `Set<string>` | one-shot des beats S1-S6 (sérialisé `Array.from`) | `new Set()` |
| `godricBrasiers` | `int` (0-3) | progression Q4 | `0` |
| `heardDormeur` | `bool` | gate codex `dormeur_fondations` | `false` |
| `eclatMilestones` | `Set<int>` | paliers d'Éclats déjà toastés (5/10/15) anti-doublon | `new Set()` |

> ⚠️ **Ne PAS créer `salazarPactChoice`** : le « Pacte de Salazar » (S2/Q3) est **déjà** la quête
> signature Serpentard, branchée sur `slythPactChoice` (`'pact'`/`'defiance'`) + `slythSignatureDone`,
> avec sa fin dérivée `victory_pact` (`computeEndingType`) et son écho déchiré en Boucle. S2/Q3
> doivent **réutiliser** ce flag, pas en introduire un parallèle. Si on veut un point d'entrée
> Zone D supplémentaire, c'est une **scène-rappel** du choix existant, pas un nouveau choix.

## 2.C Intégration à la génération procédurale & à la Boucle

1. **Gate des events Zone D** (`floor-events.js`) : `rollFloorEvent(floor)` prend désormais
   `floor` en argument ; filtre `FLOOR_EVENTS` par champ optionnel `minFloor`/`loopOnly`
   avant le tirage pondéré. Call-site unique dans `dungeon.js` (`generateDungeon`).
2. **Effets des nouveaux events** : `switch(currentFloorEvent)` dans `generateDungeon` —
   E2/E3/E4 réutilisent les branches existantes (`pieges`/`runique`/salle scellée) ; E1/E5/E6
   ne touchent que flavor/densité (déjà disponibles).
3. **Beats spéciaux** : ajouter `maybeSpecialFloorBeat(floor)` dans le callback de transition
   d'étage (`movement-floors.js`, à côté de `maybeScriptedFloorBeat`/`maybeFounderChamberBeat`),
   gardé par `seenSpecialBeats`. S5 (multi-runes) réutilise le générateur `runePuzzle`.
4. **Toasts de palier d'Éclats** (H1) : dans `_maybeAdvanceDarkLoop`, après incrément
   `accumulatedEclats`, si franchit 5/10/15 et `!eclatMilestones.has(p)` → toast + son +
   `checkCodexUnlocks('eclat-milestone')`.
5. **Spawn quêtes/PNJ Boucle** : Q5/Q6 via `questsGiven` du Gardien (déjà recyclé en Boucle
   par `getNpcsForFloor` + `effectiveFloor`). Salazar/Chevalier via `placement.floor` (recyclés
   automatiquement en Boucle, cf. PR #255).

## 2.D Dialogues conditionnels & Codex

- **Dialogues** : 100 % données dans `npcs.js`. Le moteur `_resolveDialogSource` gère déjà
  la cascade ; il suffit de remplir `dialoguesByQuest['pacte_ou_defiance']`, `eclatLines{5,10,15}`
  du Gardien, `contextualReaction` des PNJ de surface après kill de boss Ténébreux. Aucun code.
- **Pacte de Salazar (S2/Q3)** : **aucun ajout moteur**. Le choix `slythPactChoice` existe déjà
  (quête signature Serpentard). En Zone D, S2 n'est qu'une **scène-rappel** : un beat/dialogue qui
  *lit* `slythPactChoice` et adapte son texte (pacte tenu / défiance / jamais offert). Pas de
  nouveau type d'objectif, pas de nouveau flag.
- **Codex** : append `CODEX_ENTRIES` ; les conditions `riddle`/`item`/`quest`/`floor`/`eclatLoop`
  existent déjà. `variants.house` pour les colorations Maison. `corruptedBy` pour la surcouche
  Boucle profonde des nouvelles entrées.

## 2.E Priorisation (tranche P0 = livraison initiale demandée)

> Cible demandée : **2 nouveaux étages + 3 quêtes secondaires + 2 variantes Boucle**.

**P0 — données-only, zéro/quasi-zéro moteur, testable immédiatement :**
1. **Étages** : enrichir D1 (Vestibule des Mégalithes, 14-16) + D2 (Galerie des Runes Vives,
   17-20) → `ZONE_AMBIANCE.ancient.tiers` (flavor/smell/sound). + 3 devinettes `RIDDLES`.
2. **Quêtes** : Q5 `reliquaire_quatre`, Q6 `purge_givre`, Q1 `echos_celeste` →
   `quests-templates.js` + `questsGiven` (Gardien / Céleste). Réutilisent kill/riddle/floor.
3. **Variantes Boucle** : V1 = **toasts de palier d'Éclats** (H1, hook léger) ;
   V2 = **suffixes `darkLoopLines`/`eclatLines`** enrichis sur 3 PNJ existants (données).
4. **Codex** : 3 entrées liées (`voix_rowena`, `echo_scellement` complétée, `dormeur_fondations`).

**P1 — extensions moteur légères :**
- Events E1-E4 (gate `floor` dans `rollFloorEvent` + switch).
- Beats spéciaux S1/S3/S5 (`maybeSpecialFloorBeat`).
- Items neufs `cristal_givre` + Q2 ; artefact `etendard_godric` + Q4 (icônes via `add-item-icon`).

**P2 — bonus / à valider :**
- S2/Q3 (pacte Salazar) + type `choice`. D3/D5 (salles spéciales). H4 cosmétique cumulative.
  Events E5/E6 (Boucle profonde). Q7/Q8.

## 2.F Suggestions d'assets

| Asset | Type | Outil / source |
|---|---|---|
| Flavor D1/D2/D4 | texte (déjà rédigé Étape 1) | — |
| Devinettes / dialogues | texte | — |
| `cristal_givre`, `essence_chaleur` (icônes) | PNG painterly | skill `add-item-icon` (`icon_factory.py`) |
| `etendard_godric` (artefact) | PNG painterly | skill `add-item-icon` (part `banner`/`flag` à créer) |
| Sprite PNJ Écho de Salazar | réutilise `fantome`/`vendeur` | `NPC_SPRITE_SRC` existant (pas d'asset neuf) |
| Sons d'événement (E2 givre, E6 silence) | réutilise samples `abyss`/`tension` | `audio-music.js` (pas de nouveau sample requis) |
| Portrait PNJ Salazar/Chevalier | `img/npc/<id>.png` (optionnel, fallback SVG) | 💡 bonus |

> Politique : **zéro asset neuf en P0** (tout flavor/texte). Les icônes d'items arrivent en P1.

## 2.G Impact équilibrage (ch.13) & performances

**Équilibrage** :
- ✅ **Neutre par construction** pour P0 : flavor, dialogues, devinettes, Codex, toasts → aucun
  effet sur stats/scaling. Les quêtes Q1/Q5/Q6 donnent xp/or/items **dans les fourchettes des
  quêtes existantes** (modèle `purge_*` déjà calibré).
- ⚠️ **Points sensibles** (P1/P2) : (1) artefact `etendard_godric` doit passer la grille
  d'artefacts (cf. `artifact-balance-analysis.md`) ; (2) buff MAG de Salazar (S2) — garder ≤ +1
  ou cosmétique ; (3) drops `cristal_givre` ne doivent pas gonfler l'éco (chance basse).
  → Aucun ne touche `scaleMonster`/`ENDGAME_SCALING`. Re-sim `tools/sim-difficulty.js`
  **uniquement** si on ajoute un bonus stat (Salazar) ou un artefact.

**Performances** :
- Tous les registres sont des tableaux statiques chargés une fois (pattern identique à
  l'existant). Aucun coût runtime notable. Les Sets (`seenSpecialBeats`, `eclatMilestones`)
  sont petits. `rollFloorEvent(floor)` ajoute un filtre O(n) sur ~12 events → négligeable.
- Sérialisation save : +5 petits champs (Sets convertis en Array). Impact taille save trivial.
- **Garde-fou cache PWA** : tout JS modifié (`floor-events.js`, `movement-floors.js`, `npcs.js`,
  `quests-templates.js`, `riddles.js`, `codex.js`, `floor-ambiance.js`, `state.js`, `save.js`)
  → dérouler skill `cache-bump` + `node tools/check_cache_versions.js`.

## 2.H Vérification (guidelines §4/§7)

| Étape | Vérif |
|---|---|
| Chaque registre rempli | `node tests/units.js` (helpers purs) + ouverture jeu |
| Events gatés | scénario smoke : forcer floor 15, vérifier pool D |
| Quêtes | scénario `quests` : accepter/rendre Q5/Q6, vérifier reward |
| Dialogues conditionnels | scénario `npc` : Gardien à 0/5 Éclats |
| Codex | scénario : unlock `voix_rowena` après riddle |
| Régression globale | `node tests/smoke.js` (159 scénarios) — vert avant commit |
| Cache PWA | `node tools/check_cache_versions.js --base origin/master` |

---

## Journal du plan

- **2026-06-21** — Création. Cartographie code+lore faite (4 explorations). Contenu Étape 1
  rédigé (5 variantes d'étage, 6 events, 6 beats spéciaux, 3 devinettes, 8 quêtes, dialogues,
  5 entrées Codex). Plan d'implémentation Étape 2 rédigé avec priorisation P0/P1/P2.
- **2026-06-21 (révision)** — Folded in rapport scaling de Boucle : réutilisation de
  `LOOP_VARIANT_TIERS`/`applyLoopVariant`, `slythPactChoice`/`computeEndingType` (suppression du
  flag `salazarPactChoice` dupliqué), `darkLoopLines` forme objet par palier, `OUTREMONDE_SOUVENIRS`
  comme modèle d'héritage visible. Le contenu reste données-only en P0.
- **2026-06-21 (P0 IMPLÉMENTÉ)** — Décisions utilisateur : P0 + héritage complet (aura + HUD) +
  mutations graduées. Livré :
  - ✅ **Étages** : 2 set-pieces de Ruines (`FLOOR_SCRIPTED_BEATS` 15 « Vestige des Mégalithes »
    + 21 « Le Battement ») — réutilise `seenScriptedBeat` (zéro nouvelle infra). + 3 devinettes
    (`r_voute_corruption`, `r_quatre_unis`, `r_dormeur`).
  - ✅ **Quêtes** : `purge_givre`, `purge_spectres`, `chasse_basilic_ancestral` (gardien_boucle,
    `questsGiven`/`questsTurnedIn` + `dialoguesByQuest`). + `eclatLines` du Gardien.
  - ✅ **Variantes Boucle** : (1) héritage Éclats visible — toasts paliers 5/10/15 (`eclatMilestones`,
    sérialisé), badge HUD `#eclat-hud-badge` + aura CSS escaladée sur le blason (`_updateEclatBadge`),
    Codex « Mémoire des Boucles » ; (2) mutations graduées `_loopVariantAbilities(n)` (Spectral
    weaken → Abyssal fear → Cauchemardesque stun → Funeste weaken+) bornées, effets EXISTANTS.
  - ✅ **Codex** : `dormeur_fondations` (floor 21), `memoire_boucles` (eclatLoop 5→15).
  - ✅ **Tests** : `units.js` 946 ✅ (assertion FLOOR_SCRIPTED_BEATS mise à jour), `smoke.js` 263 ✅,
    `pwa-smoke.js` ✅. Cache PWA bumpé (v210→v211, 12 assets).
  - ⚠️ **Reste à faire (suivi)** : re-sim difficulté Boucle profonde (`tools/sim-difficulty.js
    --endgame`) pour calibrer l'impact des mutations graduées — les chances sont volontairement
    basses (0.15-0.22) mais une boucle 5+ cumule 4 capacités. Items neufs P1 (`cristal_givre`,
    `etendard_godric`) non inclus (icônes requises).
- **Prochaine étape** : valider les ❓ avec l'utilisateur, puis implémenter la tranche **P0**
  (données-only) dans un commit, test smoke, cache-bump.

- **2026-06-21 (SIMS mises à jour + correctif mutations + P1 events)** —
  - **Sim** : `tools/sim-difficulty.js` mire désormais `_loopVariantAbilities`
    (`simLoopVariantAbilities`, flag opt-out `--loop-muts=0`). Le sim a **révélé une erreur
    de conception** : la mutation `weaken` initiale rendait la Boucle *plus facile* (+8pp win)
    car une capacité `weaken` *remplace* l'attaque du tour (gros coup troqué contre −1 DEF).
  - **Correctif mutations** : remplacées par des **DoT dont le `power` dérive de l'`atk` scalé**
    (bleed n≥2, poison n≥5 — ignorent la DEF → anti-tank, scalent) + contrôle (fear n≥3, stun n≥4).
    Re-sim `--n=3000` : ét.21 Solo 21%→13%, Duo 28%→25% ; ét.25 Solo 20%→15%, Duo 28%→22%
    (∆ ~5-8pp, borné, bon sens). `units.js` 946 ✅.
  - **P1 — Événements Zone D** : 4 nouveaux `FLOOR_EVENTS` gatés par étage
    (`echo_temporel` 12+, `givre_ancien` 14+, `sceau_fissure` 14+, `chambre_scellee` 11+) via
    `rollFloorEvent(floor)` + effets dans `generateDungeon`.

### Points ouverts (❓) à trancher avant code
1. Pondération des events en Zone D (rééquilibrer vs garder le pool global) ?
2. Héritage visible : veut-on H4 (aura cosmétique sprite, asset) et H5 (badge HUD Éclats), ou se contente-t-on d'imiter `OUTREMONDE_SOUVENIRS` (souvenirs de Boucle débloqués par paliers d'Éclats) ?
3. Mutations d'ennemis graduées par palier (étendre `applyLoopVariant`) : on l'adopte (impact équilibrage, re-sim) ou on garde la mutation unique actuelle ?
4. Le rappel du Pacte (S2/Q3) en Zone D : simple écho contextuel (zéro moteur) — confirmé ? (on ne crée pas de type `choice`).
5. Portée P0 finale : confirmer « 2 étages + 3 quêtes + 2 variantes Boucle » = la liste P0 ci-dessus.
