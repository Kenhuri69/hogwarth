# 06 — PNJ & factions

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : faire de Poudlard un monde **vivant et réactif**. Caractériser les
> personnages non-jouables (mentors, donneurs de quêtes, marchands, figures de
> lore), structurer les **factions** et leur évolution, hiérarchiser les
> **antagonistes**, et spécifier le **système de relations** qui fait que les PNJ
> *répondent* aux choix du joueur (Maison, Éclats, quêtes). `✅` = acté dans le jeu
> (`js/npcs.js`, `js/npc-dialog.js`, `js/monsters.js`) ; `💡` = proposition de fond
> narratif ; `❓` = point à valider.
>
> 🔗 Déclencheur de la **Clé de Voûte** et trame en [03](03-trame-principale.md) ;
> structure actes↔étages en [04](04-structure-actes-et-etages.md) ; héros jouables
> en [05](05-personnages-jouables.md) ; identité des Maisons en
> [07](07-les-maisons.md) ; quêtes (dont **signatures** & **fil rouge des Éclats**)
> en [08](08-quetes-et-sous-intrigues.md) ; bestiaire en
> [09](09-bestiaire-et-lore.md) ; lieux en [10](10-lieux-et-geographie.md) ; Codex
> en [12](12-glossaire-et-codex.md).

---

## 6.0 Rôle narratif des PNJ — pourquoi ils existent

> 💡 (cadre directeur)

Dans *Poudlard & Magie*, la trame est une **descente solitaire** ([03](03-trame-principale.md)) :
un héros s'enfonce à contre-courant pour rescaller la **Clé de Voûte des Quatre**,
fêlée en plein cours d'Histoire de la Magie. Sans PNJ, cette descente serait un
couloir d'ennemis. Les PNJ sont ce qui fait que **le château respire encore** —
et qu'on a quelque chose à **sauver**, pas seulement quelque chose à fuir.

Trois fonctions, jamais séparées :

1. **Rendre le monde vivant** : des voix, des noms, des soucis ordinaires
   (Pomfresh débordée, Lockhart vaniteux, Mimi geignarde) qui rappellent qu'avant
   la fêlure, Poudlard était une **école**. Plus on descend, plus ces voix se
   raréfient — *la disparition des PNJ ordinaires est elle-même une horloge de la
   corruption*.
2. **Réagir au joueur** : un PNJ qui ne change jamais est un distributeur. Nos PNJ
   **répondent** à la Maison choisie (`chosenHouse`), aux Éclats ramassés, aux
   quêtes terminées et à l'étage atteint (§6.9). C'est le cœur de l'attachement et
   de la rejouabilité : *« mon choix change vraiment quelque chose »*.
3. **Relier les chapitres** : chaque PNJ est un **nœud** entre une quête
   ([08](08-quetes-et-sous-intrigues.md)), un lieu ([10](10-lieux-et-geographie.md)),
   une famille du bestiaire ([09](09-bestiaire-et-lore.md)) et une entrée de Codex
   ([12](12-glossaire-et-codex.md)). Donner une quête, c'est **dire un fragment du
   monde**.

> ✅ **Socle technique existant** : modèle `NPCS[]` (`npcs.js`) avec `dialogues`
> par état narratif, **couche `dialoguesByHouse`** (override par Maison, ✅ utilisée
> par Slughorn), **`specialAction`** (Fumseck, portrait de Dumbledore, Manon), et
> placement déterministe par étage + PNJ aléatoires seedés. Tout le système de
> réactions du §6.9 se câble **au-dessus** de cet existant, sans refonte.

### PNJ de **surface** vs PNJ des **profondeurs**

> 💡 distinction structurante, calée sur les tranches d'étages ([04](04-structure-actes-et-etages.md)).

| | **PNJ de surface** (Actes I-II, ét. 1-6) | **PNJ des profondeurs** (Acte III+, ét. 7-10) | **PNJ de la Boucle** (post-victoire, 11+) |
|---|---|---|---|
| **Nature 💡** | Le Poudlard « normal » : profs, fantômes d'école, marchands de Pré-au-Lard. | Sentinelles, alliés de l'Ordre, échos lumineux : ceux qui ont **choisi** de descendre. | Recyclés (Kingsley/Bill/Sirius/marchands) + le **Gardien de la Boucle**, exclusif. |
| **Ton 💡** | Familier, scolaire, parfois comique — qui *prend froid* étage après étage. | Grave, fraternel, à voix basse — chaque mot pèse, la lumière est rare. | Las, oraculaire — *« tu reviens. Tous reviennent. »* |
| **Rôle 💡** | Pédagogie, saveur, jalons de l'Acte I, amorces des arcs (Manon, signatures). | Chair émotionnelle de la descente finale : chaque chasse est une **dette**. | Farm de matériaux, lore du revers (« refermer a ouvert »). |
| **Ancrage ✅** | `pomfresh`, `mimi`, `lockhart`, `hagrid`, profs, `ollivander`, `guipure`. | `fumseck`, `kingsley`, `bill_weasley`, `sirius_esprit`, marchands ténébreux. | `gardien_boucle` + recyclage via `effectiveFloor` (Kingsley 8/18…). |

> 💡 **Règle d'or de ton** : un PNJ de surface qui survit jusqu'aux profondeurs
> doit **changer de registre** (cf. les chefs de Maison qui passent de la salle de
> classe à la défense organisée, §6.8). La descente n'épargne personne — pas même
> la voix qui te guide.

---

## 6.1 Le fil rouge — le **portrait de Dumbledore**

> ✅ (ancrages `npcs.js` / `intro.js`) / 💡 (sens narratif)

✅ **Albus Dumbledore** ouvre l'aventure. À l'intro (`intro.js`, lit
`dumbledore.dialogues.greeting`), son portrait **raconte la fêlure de la Clé de
Voûte** ([03 §3.1](03-trame-principale.md)) — le cours d'Histoire de la Magie, la
glace qui se fend, les escaliers qui basculent. Puis, à l'étage 1 (première
salle, sprite `mage`), il confie la quête tutoriel (`intro_tutoriel`, *« Tu as
entendu la pierre se fendre, toi aussi… descends »*) et **escorte** la descente
via la chaîne `dumbledore_eveil → _courage → _resistance → _revelation`. Il revient
en **Portrait d'Albus Dumbledore** (`portrait_dumbledore`, sprite `fantome`,
étage 6, `specialAction: dumbledore_epreuve`) pour l'**Épreuve de la Lumière
Éternelle** (Lux Aeterna). Il donne aussi la quête optionnelle des **Éclats de la
Clé de Voûte** (`eclats_clef_voute`, hors-chaîne — §6.9.3).

- **Rôle narratif 💡 :** mentor-fil rouge, **voix de la trame**. Il ne descend pas
  lui-même ; il *envoie*, *reconnaît*, et *nomme le sens*. C'est la **quatrième voix
  des Fondateurs** ([08 §8.6.2](08-quetes-et-sous-intrigues.md)) : là où la stèle,
  l'écho de Salazar et le Codex de Rowena livrent des *faits*, Dumbledore livre le
  **sens** (la peur comme sceau ; le souvenir heureux comme arme).
- **Voix ✅/💡 :** bienveillante, sentencieuse, douce ironie ; parle d'« épreuves
  douces », de courage et de peur. Réplique-pivot de victoire :
  *« L'escalier le plus profond, scellé par la peur, s'ouvre enfin. »*
- **Réactivité 💡 (§6.9) :** sa réplique avant Voldemort **change selon la
  signature de Maison terminée** (`<house>SignatureDone`) — il salue la bravoure
  (🦁), traite le héros en pair (🦅), se méfie d'un pacte (🐍 `pact`) ou loue ce que
  nul n'a vu (🦡). Voir [08 §8.8.1](08-quetes-et-sous-intrigues.md).
- **Évolution en Boucle Ténébreuse 💡 :** son rôle de guide est *remplacé* par le
  **Gardien de la Boucle** (§6.7) — Dumbledore a dit son dernier mot avec la
  victoire ; au-delà, c'est la récurrence qui parle.

---

## 6.2 PNJ par tranche (✅ dans le jeu — `npcs.js`)

> Roster déterministe vérifié dans `js/npcs.js`. Rôle narratif 💡, apport ✅.

### Acte I — L'École (étages 1–3) · **surface**

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ | Lien |
|----------|--------|-------|------------------------------|------|
| **Albus Dumbledore** (`dumbledore`) | mage | 1 | Mentor-fil rouge. Quête tutoriel, chaîne narrative, Éclats (§6.1). | [08 §8.2](08-quetes-et-sous-intrigues.md) |
| **Madame Pomfresh** (`pomfresh`) | prof_f | 2 | L'infirmière débordée : quête de la **mandragore** (`mandragore_pomfresh`). Voix maternelle, pressée. | [10](10-lieux-et-geographie.md) Infirmerie |
| **Mimi Geignarde** (`mimi`) | fantome | 2 | Fantôme plaintif des toilettes : quête du **troll** (`troll_toilettes`). Voix geignarde, théâtrale. | [09](09-bestiaire-et-lore.md) |
| **Newton Scamander** (`scamander`) | mage | 2 | Magizoologiste : quête des **Niffleurs** (`niffleurs_trésor`). Voix douce, passionnée. | [09](09-bestiaire-et-lore.md) |
| **Horace Slughorn** (`slughorn`) | prof_h | 2 | **Maître des potions** : chaîne d'ingrédients (`quest_potions_slughorn` ×3) → recettes. **✅ porte `dialoguesByHouse`** (admission au Slug Club, accueil par Maison — §6.9.1). | [08 §8.2](08-quetes-et-sous-intrigues.md) |
| **Gilderoy Lockhart** (`lockhart`) | prof_h | 3 | Le vaniteux : quête du **livre interdit** (`livre_interdit`). Voix prétentieuse, comique. | [09](09-bestiaire-et-lore.md) Livre des Monstres |
| **Manon Aubin** (`manon`) | prof_f | 3 | Fil du **grimoire de givre d'Élara** (sa mère) : `specialAction manon_fusion_grimoire`. Voix endeuillée qui s'éclaire. | [08 §8.3](08-quetes-et-sous-intrigues.md) |
| **Professeur Chourave** (`sprout`) | prof_f | 3 | Cheffe de Poufsouffle (§6.8). Donne la signature 🦡 *Ceux qu'on ne laisse pas derrière*. Voix terrienne, bienveillante. | [07 §7.7](07-les-maisons.md) |
| **Mr Ollivander** (`ollivander`) | vendeur | 3 | Fabricant de baguettes : vend `wand1`, `wand2`. Voix énigmatique, « la baguette choisit le sorcier ». | [05](05-personnages-jouables.md) |

### Acte II — La Descente (étages 4–6) · **surface qui s'assombrit**

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ | Lien |
|----------|--------|-------|------------------------------|------|
| **Professeur Lupin** (`lupin`) | prof_h | 4 | Mentor doux-amer face aux Épouvantards : quête `lumiere_desespoir` → **Patronum**. Voix fatiguée, sage, humaine. Père caché de Manon. | [08 §8.2-8.3](08-quetes-et-sous-intrigues.md) |
| **Hagrid** (`hagrid`) | prof_h | 4 | Gardien des créatures : quête de la **chouette perdue** (`chouette_perdue`, répétable). Voix bourrue et tendre. | [09](09-bestiaire-et-lore.md) |
| **Professeur Rogue** (`rogue`) | prof_h | 4 | Chef de Serpentard (§6.8). Met en garde *tout en montrant le chemin* du **Pacte des Cachots** (🐍). Voix glaciale, ironie cinglante. | [07 §7.5](07-les-maisons.md) |
| **Professeur McGonagall** (`mcgonagall`) | prof_f | 5 | Cheffe de Gryffondor (§6.8). Donne `golem_passage` et relaie 🦁 *L'Étendard de Godric*. Voix sévère, droite, loyale. | [07 §7.4](07-les-maisons.md) |
| **Madame Guipure** (`guipure`) | vendeur | 5 | Couturière : robes, chapeaux, capes. Voix pratique, soucieuse de l'allure. | [10](10-lieux-et-geographie.md) |
| **Professeur Flitwick** (`flitwick`) | prof_h | 6 | Chef de Serdaigle (§6.8). Relaie 🦅 *Le Codex de Rowena* (stèles). Voix enjouée, vive, érudite. | [07 §7.6](07-les-maisons.md) |
| **Sir Patrick Delaney-Podmore** (`sir_patrick`) | fantome | 6 | Fantôme de la **Chasse Sans Tête** (easter egg `headlessHuntMember`). Voix grandiloquente, chevaleresque. | [08 §8.3](08-quetes-et-sous-intrigues.md) |
| **Portrait d'Albus Dumbledore** (`portrait_dumbledore`) | fantome | 6 | Épreuve de la **Lumière Éternelle** (Lux Aeterna, `dumbledore_epreuve`). Voir §6.1. | [08 §8.3](08-quetes-et-sous-intrigues.md) |

### Acte III — Les Profondeurs (étages 7–10) · **profondeurs**

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ | Lien |
|----------|--------|-------|------------------------------|------|
| **Fumseck** (`fumseck`) | phenix | 7 | Phénix de Dumbledore : `specialAction` (**larmes** → soin / amulette). Présence muette et lumineuse — *un signe que la lumière descend aussi*. | [12](12-glossaire-et-codex.md) |
| **Kingsley Shacklebolt** (`kingsley`) | mage | 8 | Auror de l'Ordre, sentinelle : quêtes Greyback / Veilleur / aconit pour Lupin. Voix posée, autorité tranquille. **Recyclé en Boucle (ét. 18).** | [08 §8.2](08-quetes-et-sous-intrigues.md) |
| **Marchand Clandestin** (`marchand_clandestin`) | vendeur | 8 | Équipement d'Auror (casque, bottes, cape, anneau anti-magie). Voix prudente, en marge. | [10](10-lieux-et-geographie.md) |
| **Bill Weasley** (`bill_weasley`) | prof_h | 9 | Briseur de sortilèges : quêtes Aragog / Maître des Détraqueurs / dictame. Voix franche, courageuse. **Recyclé en Boucle (ét. 19).** | [08 §8.2](08-quetes-et-sous-intrigues.md) |
| **Apothicaire Ténébreux** (`apothicaire_tenebreux`) | vendeur | 9 | Herbes, potions, **Essence des Ténèbres**, **Page de Grimoire**. Voix inquiétante, mercantile. | Forge/Biblio endgame |
| **Esprit de Sirius Black** (`sirius_esprit`) | fantome | 10 | Présence-écho au seuil du climax : quêtes Dolohov / Héraut / spectres. Voix chaleureuse, protectrice, douloureuse. **Recyclé en Boucle (ét. 20).** | [08 §8.2](08-quetes-et-sous-intrigues.md) |
| **Forgeron Ténébreux** (`forgeron_tenebreux`) | vendeur | 10 | Forge endgame : pectoral d'Auror, larme du phénix, grimoire avancé, matériaux. Voix rude, taiseuse. | Forge endgame |

> ✅ **Recyclage en Boucle Ténébreuse :** Kingsley (8/18), Bill (9/19), Sirius
> (10/20) + Apothicaire, Marchand, Forgeron réapparaissent aux étages 18-20 via
> `effectiveFloor` (vente d'Essence / Page accessible en Boucle —
> [03 §3.6](03-trame-principale.md)).

### PNJ aléatoires (rencontres seedées par étage) ✅

| PNJ (id) | Sprite | Rôle |
|----------|--------|------|
| **Madame Rosmerta** (`rosmerta`) | vendeur | Aubergiste itinérante : potions, chocolat. |
| **Mondingus Fletcher** (`mundungus`) | vendeur | Receleur : livres de sorts, Félix. Voix fuyante. |
| **Sir Nicolas de Mimsy** (`sir_nicolas`) | fantome | Quasi-Sans-Tête, lore + easter egg (Chasse Sans Tête). |
| **Le Moine Gras** (`moine_gras`) | fantome | Fantôme de Poufsouffle, lore bienveillant. |
| **Argus Rusard** (`rusard`) | prof_h | Concierge acariâtre, lore + couleur. |
| **Newton Scamander** (`scamander_random`) | mage | Variante itinérante du magizoologiste. |
| **Hagrid** (`hagrid_random`) | prof_h | Variante itinérante de Hagrid. |
| **Sibylle Trelawney** (`trelawney`) | prof_f | Voyante : présages cryptiques (thème prophétie, écho Céleste — [05](05-personnages-jouables.md)). |
| **Marchand d'Ombre** (`marchand_ombre`) | vendeur | Vendeur d'endgame (élixirs permanents, pierre d'âme, matériaux). |

---

## 6.3 Cartographie des factions

> 💡 (proposition structurante) / ✅ (ancrages `data.js`, `monsters.js`, `npcs.js`)

Cinq grands ensembles, dont l'influence relative **évolue avec la descente**.
La ligne de force narrative : *la surface recule, les profondeurs montent*.

```
            ALLIÉS                                       ENNEMIS
  ┌──────────────────────────┐              ┌────────────────────────────┐
  │  Les 4 Maisons (chefs)    │   miroir     │  Forces de la Corruption    │
  │  Les Professeurs          │◄────────────►│   ├─ Mangemorts (fidèles)   │
  │  L'Ordre du Phénix         │   le mal      │   ├─ Sans-repos (morts-viv.) │
  │  La Garde de l'Aube (héros)│   scellé est  │   └─ Familier corrompu       │
  │  Les Esprits des Fondateurs│   une PART    │  Voldemort (pointe émergée) │
  └──────────────────────────┘   de nous     └────────────────────────────┘
            ▲                                              ▲
            │   neutres / ambivalents : créatures du château, marchands
            │   clandestins, écho de Salazar (Fondateur-miroir)
            └──────────────────────────────────────────────────────────────
```

### Évolution de l'influence au fil des actes 💡

| Faction | Acte I (1-3) | Acte II (4-6) | Acte III (7-10) | Boucle (11+) |
|---------|--------------|----------------|------------------|---------------|
| **Les 4 Maisons** | Présence pédagogique (école qui tourne). | Les chefs **organisent la défense** ; les voix se font graves. | Influence réduite à des **reliques** et au prestige du héros (sets, paliers). | Influence **mythique** : Mythe/Apothéose, don à la Maison. |
| **Professeurs / Ordre** | Donneurs de quêtes familiers. | Mentors (Lupin, chefs). | **Sentinelles** isolées (Kingsley, Bill, Sirius) — les derniers feux. | Recyclés en gardiens de farm. |
| **Esprits des Fondateurs** | Latents (1ʳᵉ stèle, intro). | L'**écho de Salazar** s'éveille (cachots). | **Convergence** : stèle + Codex + écho + portrait disent la même vérité. | Échos ténébreux dans les Ruines (14+). |
| **Forces de la Corruption** | Symptôme : familier qui se fissure. | **Fidèles** organisés (mangemorts masqués). | **Élite + boss canon** gardent la route de la source. | Tout revient **Ténébreux** (18-20). |
| **Voldemort** | Absent (rumeur). | Se **reconstitue** au fond (révélation). | Affaibli (9) → **Ressuscité** (10, climax). | Vaincu — mais la faille reste **ouverte**. |

> 💡 **Lecture** : c'est un **chiasme**. Les Maisons (école) culminent en haut puis
> se diluent ; les Fondateurs (mémoire) montent à mesure qu'on descend. Au point
> de croisement — l'Acte III — les quatre voix des Fondateurs convergent
> ([08 §8.6.2](08-quetes-et-sous-intrigues.md)) : *descendre, c'est remonter le
> temps* ([04](04-structure-actes-et-etages.md)).

---

## 6.4 Faction alliée — la **Garde de l'Aube**

> 💡 (proposition, sur base `data.js` + design)

La **Garde de l'Aube** regroupe les **héros jouables originaux**
([05 §5.2](05-personnages-jouables.md)) : des volontaires que le portrait de
Dumbledore a pressentis pour la descente. Elle n'a ni hiérarchie ni QG — c'est
une **fraternité de circonstance** unie par un serment muet : *remonter la lumière
depuis le fond*.

- **Alliés naturels :** les professeurs (chefs de Maison, Lupin, Hagrid, Slughorn),
  l'Ordre du Phénix (Kingsley, Bill, Sirius), Fumseck.
- **Rôle narratif :** justifie l'existence collective des originaux **sans réécrire
  le canon** ; donne un « nous » aux héros que Dumbledore envoie. Les barks des
  héros ([05](05-personnages-jouables.md)) sont la *voix* de cette Garde.
- **Réactivité par héros 💡 :** la Maison **canon** d'un héros peut différer du
  `chosenHouse` de la partie ([05](05-personnages-jouables.md)) — d'où des barks
  de tension (`houseTension[<Maison>]`) qui colorent les rencontres de PNJ et de
  signature (ex. un Maxence Serpentard-canon qui commente *L'Étendard de Godric*
  d'une partie Gryffondor). Pur flavor, zéro mécanique (§6.9.5).
- **Opposition :** les Forces de la Corruption (§6.5) et tout ce que la Boucle
  ramène.

---

## 6.5 Factions ennemies — les **Forces de la Corruption**

> ✅ ancrages via `monsters.js` / [09](09-bestiaire-et-lore.md) ; 💡 hiérarchie narrative.

> **Recadrage canon ⚠️ :** la corruption n'est **pas** « émanée de Voldemort ». La
> Clé de Voûte scellait **deux** maux ([03 §3.3](03-trame-principale.md),
> [12](12-glossaire-et-codex.md)) : (a) une **corruption pré-Poudlard**, plus
> vieille que les Fondateurs, et (b) tout au fond, **Voldemort** qui se *nourrit*
> de la fêlure pour se reformer. Voldemort est la **pointe émergée**, pas la
> source. Les trois sous-factions ci-dessous sont des **vecteurs** de la corruption
> qui suinte du sceau brisé.

### A. Les Mangemorts (humains corrompus) — bestiaire **F4**

La faction *structurée* du mal — des **fidèles** attirés par la fêlure, qui œuvrent
à hâter le retour de leur maître. Hiérarchie ascendante :

```
Mangemort Masqué  →  Mangemort d'Élite  →  Mangemort Vétéran
        →  Bellatrix Lestrange / Antonin Dolohov (cercle intérieur)
                →  Voldemort (Affaibli → Ressuscité)
```

- **Voix collective 💡 :** dévotion fanatique, mépris du « sang impur », langage
  rituel.
- **Lien à la trame :** apparaissent dès l'Acte II (ét. 4-6) ; leur présence
  **prouve** que la corruption n'est pas qu'un phénomène magique mais une volonté
  organisée. Cibles de la chaîne Dumbledore et du Gardien de la Boucle. Le
  **Mangemort d'Élite** porte le **3ᵉ Éclat** ([08 §8.6.1](08-quetes-et-sous-intrigues.md)).

### B. Les sans-repos (fantômes & morts-vivants) — bestiaire **F3** (+ **F5** pour les abominations anciennes)

Tout ce que le château retient au seuil de la mort : fantômes hostiles, Inferius,
Détraqueurs, Spectres, vampires/Strigoï, poupées maudites.

- **Voix collective 💡 :** murmure, faim, oubli ; ils ne *veulent* pas, ils
  *manquent*.
- **Lien à la trame :** densité croissante avec la profondeur ; vulnérables à la
  **lumière** (Lumos Solem, Patronus, Lux Aeterna — `bonusVsUndead`). Miroir de
  tentation pour Maxence le Mage de Sang ([05](05-personnages-jouables.md)). Les
  **Éclats de Lumière** de Lux Aeterna tombent sur eux ([08 §8.3](08-quetes-et-sous-intrigues.md)).

### C. Les créatures du château (la sauvagerie dénaturée) — bestiaire **F1**

Bêtes et êtres magiques de Poudlard rendus hostiles par la corruption : chat de
Mme Norris, Peeves, lutins, Acromantules, Trolls, Hippogriffes, Gargouilles…

- **Voix collective 💡 :** instinct dénaturé ; agressivité anormale = **symptôme**
  de la corruption (le familier qui se fissure — [03 §3.2](03-trame-principale.md)).
- **Lien à la trame :** baromètre de l'avancée du mal ; cibles des quêtes-jalons de
  l'Acte I (mandragore, troll, niffleurs, chouette). **Peeves** porte le **1ᵉʳ
  Éclat**.

---

## 6.6 Antagonistes — hiérarchie

> ✅ boss dans `monsters.js` ; 💡 statut scénarisé.

### Antagoniste suprême

- **Voldemort** — `voldemort_affaibli` (ét. 9, premier contact incomplet) puis
  `voldemort_revenu` (ét. 10, **climax**, boss à phases `_checkBossPhases`). C'est
  la **pointe émergée** du mal scellé ; sa chute scelle l'arc principal
  ([03 §3.5](03-trame-principale.md)). 💡 Ce qu'il *cherche au fond* est ce que les
  Fondateurs ont scellé **avec lui** — d'où la **double trame** des Éclats.

### Boss canon (jalons scénarisés de la descente)

| Boss | Étage | Rôle scénarisé 💡 | Cible de quête ✅ |
|------|-------|-------------------|--------------------|
| **Fenrir Greyback** | 8 | Le loup-garou, première vraie gueule des Profondeurs. | Kingsley ; `purge_loups` (Boucle) |
| **Aragog** | 9 | L'Acromantule légendaire, gardien des racines du château. | Bill ; `purge_acromantules` |
| **Antonin Dolohov** | 10 | Le mangemort vétéran, dernier verrou humain avant Voldemort. | Sirius ; `purge_mangemorts` |
| **Bellatrix Lestrange** | 8+ | La fidèle absolue ; cible de `dumbledore_revelation`. | chaîne Dumbledore |

> ✅ Chaque boss tombé **affaiblit le sceau** ; la présence de Voldemort se
> densifie d'étage en étage.

### Boss originaux (gardiens de seuil, epic)

Antagonistes inédits, **moins scénarisés** que les canon — des gardiens thématiques
plutôt que des personnages :

| Boss | Apparition | Rôle 💡 | Promotion en personnage ? |
|------|------------|---------|----------------------------|
| **Veilleur du Seuil** | ét. 8+ | **Sentinelle des Fondateurs** ([12 §12.4](12-glossaire-et-codex.md)), graine runique des Ruines. | 💡 gardien de lore (relié à la 4ᵉ voix). |
| **Maître des Détraqueurs** | ét. 9+ | Chef de la faction sans-repos (§6.5 B) — incarne la **peur-sceau**. | 💡 **à promouvoir** (sert le thème de la peur). |
| **Héraut des Ténèbres** | ét. 10+ | Annonciateur ; **pont vers la Boucle Ténébreuse**. | 💡 **à promouvoir** (charnière de la Boucle). |
| **Hécate la Maudisseuse** | (voir `monsters.js`) | Figure de malédiction, lore de sortilèges noirs. | 💡 gardien de lore. |

> ❓ **À arbitrer :** lesquels méritent un **dialogue/cinématique** dédié (les
> promouvant en personnages) et lesquels restent de purs **gardiens mécaniques** ?
> Recommandation 💡 : scénariser le **Maître des Détraqueurs** (peur) et le **Héraut
> des Ténèbres** (charnière Boucle) ; garder le Veilleur du Seuil (relié à la voix
> des Fondateurs via le Codex) et Hécate en gardiens de lore.

---

## 6.7 Les chefs de Maison & le **Gardien de la Boucle**

### 6.7.1 Les quatre chefs (✅ PNJ déterministes + hôtes des paliers)

✅ Les quatre chefs sont des PNJ ET les hôtes des **paliers endgame** (Mythe,
Apothéose, série ★ N) et du **don à la Maison** (gold-sink, dès le tier 17). Ils
**relaient** aussi la **quête signature** du `chosenHouse`
([07 §7.8](07-les-maisons.md), [08 §8.5](08-quetes-et-sous-intrigues.md)). Détail
d'identité narrative en [07](07-les-maisons.md).

| Chef (id) | Maison | Étage | Voix 💡 | Apport ✅ | Signature relayée 💡 |
|-----------|--------|-------|---------|-----------|----------------------|
| **McGonagall** (`mcgonagall`) | 🦁 Gryffondor | 5 | Sévère, droite, loyale | Leçon (`golem_passage`), paliers, don, set (`quest_set_gryff`). | *L'Étendard de Godric* |
| **Rogue** (`rogue`) | 🐍 Serpentard | 4 | Glaciale, ironie cinglante | Paliers, don, set ; met en garde *en montrant le chemin*. | *Le Pacte des Cachots* |
| **Flitwick** (`flitwick`) | 🦅 Serdaigle | 6 | Enjouée, vive, érudite | Paliers, don, set ; relaie les **stèles**. | *Le Codex de Rowena* |
| **Chourave** (`sprout`) | 🦡 Poufsouffle | 3 | Terrienne, bienveillante | Paliers, don, set, jardins (`herb`). | *Ceux qu'on ne laisse pas derrière* |

> **Présence narrative au-delà des paliers 💡 :** chaque chef incarne sa Maison
> *face à la descente* — McGonagall qui **organise** la défense, Rogue qui
> **connaît** l'ennemi de l'intérieur, Flitwick qui **décode** les anciennes
> magies, Chourave qui **fait tenir** le moral. C'est par eux que la trame reste
> reliée à la vie de l'école pendant qu'on s'enfonce. Voix dédiée du chef
> (`headOfHouseVoiceKey`) sur le **don à la Maison** (intro / offer / paliers ★).

### 6.7.2 Le **Gardien de la Boucle** (post-victoire)

✅ **Gardien de la Boucle** (`gardien_boucle`, *« Esprit-veilleur des récurrences »*,
sprite `fantome`, étage 11, exclusif post-victoire). Il donne 3 quêtes de purge
répétables (`purge_loups`, `purge_acromantules`, `purge_mangemorts`) → matériaux
Forge & Bibliothèque.

- **Rôle narratif :** **héritier du fil rouge** une fois Voldemort tombé. Là où
  Dumbledore guidait *vers* la victoire, le Gardien accompagne la **récurrence** —
  un mentor désabusé de l'éternel retour.
- **Voix ✅ :** lasse, lucide, presque oraculaire : *« Tu reviens. Tous reviennent —
  c'est le sens de la Boucle. »* ; *« Je n'ai plus de nom propre. Trop de
  récurrences. Mais j'ai encore des récompenses. »*
- **Lien à la trame :** ses répliques *idle* posent l'identité de la Boucle (Greyback
  qui se reforme, Aragog « sous la racine du temps », Dolohov « jamais vraiment
  mort »). Il laisse entrevoir une **sortie possible** : *« Plus tu purges, plus la
  Boucle s'allège. C'est ainsi qu'on en sort — peut-être. »*

> ❓ **À arbitrer** (en lien avec [03 §3.6](03-trame-principale.md)) : ce « peut-être »
> annonce-t-il une **fin écrite** de la Boucle, ou n'est-ce qu'une **boucle de
> prestige** assumée ? Le Gardien est le PNJ par lequel cette réponse passerait.

---

## 6.8 Fiches détaillées des PNJ majeurs

> 💡 (fiches narratives) / ✅ (ancrages). Format unifié pour les donneurs-pivots —
> canon **et** originaux liés aux quêtes signature. Les fiches mineures restent
> dans les tables §6.2.

### 6.8.1 Albus Dumbledore (portrait) — *la voix du sens* 🔴 canon

- **Rôle / Maison :** mentor-fil rouge, ancien directeur (Gryffondor canon).
  **Apparence :** portrait animé doré (sprite `mage` à l'ét. 1, `fantome` à l'ét. 6).
- **Lien au déclencheur :** c'est lui qui **nomme** la fêlure de la Clé de Voûte
  comme un *verrou* et envoie le héros descendre ([03 §3.1](03-trame-principale.md)).
- **Évolution par acte :** I escorte (tutoriel, peur) → II bravoure (mangemorts) →
  III révélation (Bellatrix, Lux Aeterna) → **disparaît** au profit du Gardien en
  Boucle.
- **Variantes Maison/héros :** réplique avant Voldemort selon `<house>SignatureDone`
  (§6.1) ; plus **froid** après victoire si `slythPactChoice = pact`.
- **Hooks / quêtes :** `intro_tutoriel`, chaîne `dumbledore_*`, `eclats_clef_voute`,
  Lux Aeterna (`dumbledore_epreuve`), *L'Anneau de la Résurrection*.

### 6.8.2 Minerva McGonagall — *l'autorité qui organise* 🔴 canon

- **Rôle / Maison :** cheffe de Gryffondor, prof de Métamorphose. **Apparence :**
  `prof_f`, étage 5, sévère et droite.
- **Lien au déclencheur :** tandis que Dumbledore *envoie*, McGonagall **tient le
  haut** — elle est la figure de la défense organisée de l'école.
- **Évolution :** donneuse (`golem_passage`) → cheffe de paliers/set/don → relais de
  la signature 🦁 (*« N'allez pas confondre courage et imprudence. »*).
- **Variantes :** voix `mcgonagall` sur le don ; approbation rare = précieuse pour un
  héros Gryffondor-canon (barks).
- **Hooks :** `golem_passage`, `quest_set_gryff` (*L'épreuve du Lion*), don, signature
  Étendard.

### 6.8.3 Severus Rogue — *l'ennemi connu de l'intérieur* 🔴 canon

- **Rôle / Maison :** chef de Serpentard, maître des Potions. **Apparence :**
  `prof_h`, étage 4, glacial.
- **Lien au déclencheur :** connaît les ténèbres *de l'intérieur* ; sait ce que la
  Clé scellait sans le dire franchement.
- **Évolution :** met en garde contre le **Pacte des Cachots** *tout en montrant le
  chemin* — ambivalence assumée → paliers/set/don.
- **Variantes :** respecte la maîtrise, méprise la **dépendance** au raccourci
  (`slythPactChoice`). Voix `rogue` sur le don.
- **Hooks :** signature 🐍, `quest_set_slyth` (*Le souffle du Serpent*), don.

### 6.8.4 Rubeus Hagrid — *la tendresse bourrue* 🔴 canon

- **Rôle / Maison :** garde-chasse (Gryffondor canon). **Apparence :** `prof_h`,
  étage 4, immense et chaleureux.
- **Lien au déclencheur :** se soucie des **créatures** dénaturées par la corruption
  (familier qui se fissure, §6.5 C).
- **Évolution :** quête répétable `chouette_perdue` (1ʳᵉ remise = `broom`) ; variante
  itinérante `hagrid_random`.
- **Hooks :** `chouette_perdue`, bestiaire F1.

### 6.8.5 Le **Chevalier Fantôme** — *la garde qui n'a pas su s'arrêter* 🟢 original (🦁)

- **Rôle / Maison :** Gryffondor tombé en défendant le château lors d'un siège
  oublié, « de garde depuis parce que personne ne lui a dit qu'il pouvait partir ».
  **Apparence 💡 :** chevalier spectral casqué (variante **non-hostile** du
  `chevalier_fantome` du bestiaire, sprite `fantome`).
- **Lien au déclencheur :** la fêlure éteint le **courage** autant que les escaliers ;
  il reconnaît dans le héros le porteur de l'**Étendard de Godric**.
- **Évolution par acte :** ouvre la signature 🦁 (Acte I, ét. 2-3) → commente chaque
  brasier rallumé (Actes I-II) → remet cérémonielle de la **Bannière de Godric**
  (Acte III) → revient en Boucle (Bannière déchirée à raviver).
- **Variantes Maison/héros :** **n'apparaît que si `chosenHouse = Gryffondor`** ;
  barks de tension pour un héros non-Gryffondor dans le duo.
- **Hooks / quêtes :** *L'Étendard de Godric* ([08 §8.5](08-quetes-et-sous-intrigues.md)),
  flag `gryffSignatureDone` → neutralise la phase terreur de Voldemort. Révélation
  lore : frère d'armes d'un Fondateur.
- **❓ Statut dev :** **non encore implémenté** comme PNJ. Aucun allié ne combat
  ([03 §3.5](03-trame-principale.md)) → reste **donneur/mémoire**.

### 6.8.6 L'**Écho de Salazar** — *le Fondateur-miroir* 🟢 original (🐍)

- **Rôle / Maison :** voix de **Salazar Serpentard**, scellée *avec* la corruption
  qu'il a aidé à enfermer ([12 §12.4.5](12-glossaire-et-codex.md)). **Apparence
  💡 :** pas un fantôme — une **présence** murmurée derrière un passage scellé /
  une stèle des cachots.
- **Lien au déclencheur :** porte la **2ᵉ voix des Fondateurs**
  ([08 §8.6.2](08-quetes-et-sous-intrigues.md)) : *« pour fermer le verrou, chacun a
  dû y mettre une part de soi. »* La tentation est un **miroir**, pas un démon.
- **Évolution par acte :** s'éveille en Acte II (cachots) → propose un **pacte**
  (raccourcis dangereux, puissance interdite contre petites trahisons) → vérité
  révélée en Acte III → **dernier pacte** en Boucle.
- **Choix gris ✅-flag :** `slythPactChoice ∈ {pact, defiance}` — le pacte rend plus
  fort *et* refroidit Dumbledore ; la défiance préserve l'estime et debuff léger le
  boss. Voir [08 §8.8.2](08-quetes-et-sous-intrigues.md).
- **Variantes Maison/héros :** **`chosenHouse = Serpentard`** ; un Maxence
  (Mage de Sang) dans le duo résonne fort avec la tentation.
- **❓ Statut dev :** **non implémenté** ; raccourcis = transitions alternatives à
  concevoir (movement/dungeon) ; `slythPactChoice` = flag sérialisé neuf.

### 6.8.7 Filius Flitwick & les **stèles de Rowena** — *le savoir comme legs* 🔴/🟢 (🦅)

- **Rôle / Maison :** Flitwick, chef de Serdaigle, prof de Sortilèges
  (`prof_h`, ét. 6) ; relais des **stèles d'énigme** des Fondateurs (✅
  `r_clef_voute`).
- **Lien au déclencheur :** le Serdaigle voit *une question mal posée*. Recouper les
  stèles reconstitue le **Codex de Rowena** — le traité décrivant *ce que la Clé
  scellait vraiment* (**3ᵉ voix des Fondateurs**).
- **Évolution par acte :** 1ʳᵉ stèle en Acte I → feuillets/énigmes en Acte II → Codex
  *nomme* la corruption pré-Fondateurs en Acte III → pages ténébreuses en Boucle.
- **Variantes Maison/héros :** **`chosenHouse = Serdaigle`** révèle le Codex ;
  Dumbledore traite le héros en **pair**. Céleste/Cho (Serdaigle canon) gloseraient
  les stèles (barks).
- **Hooks / quêtes :** *Le Codex de Rowena* ([08 §8.5](08-quetes-et-sous-intrigues.md)),
  flag `ravenSignatureDone` → faiblesses de Voldemort révélées. Objectifs `riddle`
  (✅) + `pages` (✅, modèle Manon).

### 6.8.8 Pomona Chourave & le **Refuge du Blaireau** — *ceux qu'on ne laisse pas
derrière* 🔴/🟢 (🦡)

- **Rôle / Maison :** cheffe de Poufsouffle, prof de Botanique (`prof_f`, ét. 3).
- **Lien au déclencheur :** quand tous regardent **vers le bas** (la menace), elle
  regarde **autour** (les égarés). Le premier Refuge de Poudlard fut creusé par
  **Helga** (**4ᵉ voix des Fondateurs**, l'acte plutôt que la connaissance).
- **Évolution par acte :** ouvre la signature 🦡 (Acte I, ét. 2) → secourir les égarés
  & défendre le Refuge (Actes I-III) → **Médaillon de Helga** → Refuge à rétablir en
  Boucle.
- **Variantes Maison/héros :** **`chosenHouse = Poufsouffle`** ; clin d'œil **Dobby**
  (elfe libéré qui reste). Iris/Cedric (Poufsouffle canon) résonnent.
- **Hooks / quêtes :** *Ceux qu'on ne laisse pas derrière*, flag `poufSignatureDone`
  → buff de départ « Espoir partagé ». Objectifs `herb` (✅), jardins de Chourave,
  libération d'elfe.
- **❓ Statut dev :** escorte / vague défensive / refuge-repos = objectifs neufs.

### 6.8.9 Manon Aubin — *l'arc transverse du deuil* 🟢 original (toutes Maisons)

- **Rôle / Maison :** élève cachée à l'étage 3 (`prof_f`, `specialAction
  manon_fusion_grimoire`). **Indépendante du `chosenHouse`** — arc émotionnel ouvert
  à tous.
- **Lien au déclencheur :** son **givre** (le grimoire d'Élara, sa mère morte) fait
  écho au **froid du sceau brisé** ([03 §3.3](03-trame-principale.md)). Révélation :
  Manon est la **fille cachée de Lupin**.
- **Évolution :** arc en 3 actes (`manon_secret/_pardon` → `manon_revelio/_grimoire`
  → `manon_acte3` `implicitAccept`) → passif « Hiver Clair ».
- **Hooks :** Lupin, Revelio, Strangulot, objectif `pages` (5 pages, étages 2/3/5/7/9),
  `livre_glacius_tempete`.

> **Légende :** 🔴 PNJ **canon** (univers HP) · 🟢 PNJ **original** (créé pour le jeu).

---

## 6.9 Système de relations & réactions

> 💡 (spécification narrative) / ✅ (ancrages : `dialoguesByHouse`, `getNpcQuestState`,
> flags sérialisés). C'est le cœur qui rend les PNJ **réactifs**. Tout se câble
> **au-dessus** de l'existant — voir le plan d'implémentation §6.12.

### 6.9.1 Les quatre leviers de réaction

Un PNJ adapte ses dialogues et ses actions selon **quatre entrées**, par ordre de
priorité de lecture :

| Levier | Source de vérité ✅ | Effet sur le PNJ 💡 | Exemple ✅/💡 |
|--------|---------------------|----------------------|----------------|
| **1. Maison du joueur** | `chosenHouse` (`state.js`) | Couche `dialoguesByHouse` : accueil, ton, contenu réservé. | ✅ Slughorn admet au Slug Club selon la Maison. 💡 Chefs qui adoptent « les leurs ». |
| **2. Avancement de quête** | `getNpcQuestState(npc)` (`npc-dialog.js`) → `none/available/inProgress/completable/done` | Pages de dialogue + marqueur minimap (❗/❓/✓). | ✅ Pomfresh change de réplique quand on rapporte la mandragore. |
| **3. Fil rouge / Éclats** | `eclatProgress` (💡 nouveau flag) | Le PNJ *commente* la double trame à mesure des Éclats. | 💡 Dumbledore : « le verrou cachait deux choses, pas une. » |
| **4. Étage / Acte atteint** | `currentFloor`, `victoryAchieved` | Recadrage de ton (surface → profondeurs → Boucle) ; recyclage. | ✅ Kingsley/Bill/Sirius recyclés (8/18…) ; 💡 ton plus grave en profondeur. |

> 💡 **Principe de composition** : ces leviers se **superposent**, ils ne
> s'excluent pas. La réplique finale d'un PNJ = `base` → override `dialoguesByHouse`
> → override d'**état de quête** → suffixe **fil rouge** si pertinent. C'est exactement
> l'ordre déjà appliqué par `npc-dialog.js` (la couche byHouse override `greeting`).

### 6.9.2 Réputation de Maison (`npcReputation` / `houseInfluence`) 💡

> ❓ Proposition d'extension — **pas encore en jeu**. Sobriété recommandée.

Plutôt qu'un système de points de réputation par PNJ (lourd, peu lisible dans un
dungeon-crawler), on propose une **réputation dérivée** — *aucune variable neuve si
possible* :

- **`houseInfluence` (dérivé) 💡 :** lecture directe de `houseTier` +
  `<house>SignatureDone`. Un héros qui a fait sa signature et atteint le Mythe
  *rayonne* sa Maison → les PNJ de cette Maison sont plus chaleureux, les autres
  plus déférents (ou jaloux, pour Serpentard). **Zéro flag neuf.**
- **`npcReputation` (optionnel, ❓) :** si l'on veut une mémoire **par PNJ** (« ce
  marchand se souvient que tu l'as trahi »), un petit `Map<npcId, int>` sérialisé,
  borné `[-2, +2]`, suffit. À réserver aux **PNJ à choix gris** (écho de Salazar,
  marchand trahi par le Pacte). **Ne pas généraliser** — risque > bénéfice.

> 💡 **Recommandation** : commencer par `houseInfluence` **dérivé** (gratuit), et
> n'introduire `npcReputation` que pour les **2-3 PNJ** où une trahison est
> réellement traçable (Pacte des Cachots). Conforme à « pas de feature neuve si un
> dérivé suffit » (guidelines §2).

### 6.9.3 Réactions au **fil rouge des Éclats** (`eclatProgress`) 💡

✅ La quête `eclats_clef_voute` fait ramasser **3 `eclat_voute`** (Peeves 1-3,
Loup-Garou 4-6, Mangemort d'Élite 7-10 — [08 §8.6.1](08-quetes-et-sous-intrigues.md)).
💡 On expose un compteur `eclatProgress ∈ {0,1,2,3}` que les PNJ-pivots *lisent*
pour offrir une **ligne de réaction** distribuée :

| `eclatProgress` | Dumbledore 💡 | Stèle / écho 💡 |
|-----------------|----------------|------------------|
| 1 (Acte I) | « Quelque chose s'est brisé. Tu le sens, n'est-ce pas ? » | Stèle : *« On ne scelle pas par peur. On tient la porte. »* (Godric) |
| 2 (Acte II) | « Ce n'est pas qu'un accident : on l'**attise**, d'en bas. » | Écho de Salazar : *« J'ai scellé ma part **avec** ma faute. »* |
| 3 (Acte III) | « Le verrou cachait **deux** choses, pas une. » | Codex (Rowena) : *« Comprends, et la faille apparaît. »* |

> 💡 Ces lignes sont des **suffixes** de dialogue (pas des pages neuves) : elles
> s'ajoutent à la réplique d'état de quête quand `eclatProgress` franchit un palier.
> Le **garde-fou** reste celui de [08 §8.6.3](08-quetes-et-sous-intrigues.md) :
> aucune étape ne **bloque** la descente.

### 6.9.4 Dialogues conditionnels & événements par étage 💡

Au-delà des leviers, certains **beats scriptés** se déclenchent à des étages-clés
(modèle : la réplique pré-Voldemort). Candidats :

| Étage / seuil | Événement 💡 | PNJ | Ancrage ✅ |
|---------------|--------------|-----|-------------|
| ét. 1 (1ᵉʳ pas) | Dumbledore confie la mission. | `dumbledore` | ✅ `intro_tutoriel` |
| ét. 6 | Le portrait ouvre Lux Aeterna. | `portrait_dumbledore` | ✅ `dumbledore_epreuve` |
| transition 6↔7 | Bascule de registre surface→profondeurs (toast). | — | ✅ `_maybePlayTierTransition` |
| ét. 10, avant boss | **Réplique + modificateur** one-shot selon `<house>SignatureDone`. | `dumbledore` | 💡 hook `_checkBossPhases` |
| ét. 11 (post-victoire) | Le Gardien remplace le mentor. | `gardien_boucle` | ✅ exclusif `victoryAchieved` |
| transition 13↔14 | Voix des Ruines (registre solennel). | — | 💡 [04 §4.5](04-structure-actes-et-etages.md) |

### 6.9.5 Réactions par **héros choisi** (barks) ✅/💡

✅ La couche `HERO_BARKS` ([05](05-personnages-jouables.md), `js/hero-barks.js`)
donne à chaque héros des répliques par événement (`bossAppear`, `tierTransition`,
`houseTension[<Maison>]`, beats scénarisés `heroBarkScripted`). 💡 Appliqué aux PNJ,
cela colore les **rencontres** : un héros dont la Maison canon **diffère** du
`chosenHouse` réagit à la signature d'une autre Maison (ex. [05] : *Anastasia* sur
*L'Étendard de Godric*, *Maxence* sur le *Pacte*). **Pur flavor, cosmétique et
défensif** — un héros sans entrée reste silencieux.

> 💡 **Synthèse de la réactivité** : `chosenHouse` colore *quels PNJ et quelles
> options* ; l'**état de quête** colore *ce qu'ils disent maintenant* ;
> `eclatProgress` colore *ce qu'ils savent du mystère* ; l'**étage** colore *leur
> gravité* ; le **héros** colore *la voix d'à-côté*. Cinq couches, une seule
> descente — l'illusion vivante que « le château me répond ».

---

## 6.10 Relations inter-factions × Maison du joueur

> 💡 (proposition) — comment la Maison choisie **incline** les rapports de factions.

La trame reste **~80-90 % commune** ([03 §3.8](03-trame-principale.md)) : la Maison
ne crée pas de factions neuves, elle **incline** la lecture des existantes.

| Maison du joueur | Rapport privilégié 💡 | Tension propre 💡 | Voix des Fondateurs adressée |
|------------------|------------------------|--------------------|-------------------------------|
| 🦁 **Gryffondor** | Professeurs & Ordre (l'acte, le front). | Impatience face à la prudence (McGonagall tempère). | **Godric** — « On tient la porte. » |
| 🐍 **Serpentard** | L'**écho de Salazar** (le Fondateur-miroir). | Méfiance de Dumbledore ; jalousie des autres Maisons. | **Salazar** — « J'ai scellé ma part. » |
| 🦅 **Serdaigle** | Les **stèles / le Codex** (la mémoire). | Solitude de qui *sait* trop tôt. | **Rowena** — « Comprends, et la faille apparaît. » |
| 🦡 **Poufsouffle** | Les **égarés**, l'elfe, Chourave (le lien). | Mission jugée « non prioritaire » par les autres. | **Helga** — « J'ai creusé un abri. » |

> 💡 **Lecture transversale** : Gryffondor et Poufsouffle répondent au mal par
> l'**acte** (rallier, protéger) ; Serpentard et Serdaigle par la **connaissance**
> (pacte-miroir, Codex). Les quatre disent la même vérité sous quatre angles —
> fidèle au thème *« quatre façons de vivre la même descente »*
> ([07 §7.9](07-les-maisons.md)). Aucune de ces inclinaisons ne **branche** l'arc :
> ce sont des **couleurs**, gardées par `chosenHouse` + flags de signature.

---

## 6.11 Règles d'ajout d'un nouveau PNJ

> 💡 (normatif) — pour que tout ajout reste cohérent, équilibré et intégré.

Avant d'ajouter un PNJ, vérifier les **5 critères de cohérence** :

1. **Nécessité narrative** — le PNJ répond-il à un *besoin* (donner une quête,
   incarner une faction, porter une voix des Fondateurs) ? Pas de PNJ « décoratif »
   sans rôle : la densité des voix est elle-même une horloge de corruption (§6.0).
2. **Ancrage de tranche** — surface (1-6), profondeurs (7-10) ou Boucle (11+) ?
   Le **ton** doit suivre (§6.0). Un PNJ de surface qui descend doit **changer de
   registre**.
3. **Nœud de chapitres** — relie-t-il au moins **deux** chapitres ? (une quête
   [08] **et** un lieu [10], ou une famille du bestiaire [09] **et** une entrée de
   Codex [12]). Un PNJ qui ne relie rien est un cul-de-sac.
4. **Canon vs original** — si **canon** (🔴), respecter la caractérisation HP (voix,
   Maison, rôle). Si **original** (🟢), respecter [02 §2.2](02-univers-ton-et-canon.md)
   (Poudlard comme couvercle) et ne **pas** réécrire le canon (modèle Garde de
   l'Aube : une *circonstance*, pas une réécriture).
5. **Réactivité** — quel(s) levier(s) du §6.9 le PNJ lit-il ? Au minimum l'**état
   de quête** ; idéalement une couche `dialoguesByHouse` s'il a une affinité de
   Maison. Un PNJ qui ne réagit jamais est un distributeur (§6.0).

**Procédure technique** (✅ socle existant) — voir aussi le plan §6.12 :

1. Ajouter l'entrée dans `NPCS[]` (`npcs.js`) : `id`, `name`, `role`, `sprite`,
   `floor`, `marker`, `dialogues` (par état), éventuels `dialoguesByHouse`,
   `questId`, `specialAction`.
2. `getNpcsForFloor(floor)` le placera automatiquement (déterministe ou aléatoire
   seedé). Recyclage en Boucle : `placement.floor === effectiveFloor(floor)`.
3. Le sprite passe par `getNpcSpriteType(npcId)` → `NPC_SPRITE_SRC` (renderer).
4. Si donneur de quête : ajouter le template dans `QUEST_TEMPLATES`
   (`quests-templates.js`) et relier via `questId`.
5. **Tester** : `node tests/smoke.js` (scénarios `npc`) ; ajouter un cas dédié si le
   PNJ porte un nouvel état ou une variante de Maison.

> ✅ **Garde-fou de cohérence** : un PNJ ne doit **jamais** gater l'escalier
> ([03 §3.6](03-trame-principale.md)). Tout PNJ est du **contenu optionnel** greffé
> sur la colonne « descendre → vaincre Voldemort ».

---

## 6.12 Plan d'implémentation (ÉTAPE 2)

> 💡 Cadrage dev pour rendre les PNJ **réactifs** en réutilisant l'existant
> (`npcs.js`, `npc-dialog.js`, flags sérialisés). Conforme aux guidelines (pas de
> feature neuve si un dérivé suffit) et aux conseils de [08 §8.5.2](08-quetes-et-sous-intrigues.md).

### A. Structure des données

✅ **Existant à réutiliser tel quel** — modèle `NPCS[]` (extrait, `npcs.js`) :

```js
{
  id, name, role, sprite,                       // identité + rendu
  floor, location, marker,                       // placement déterministe
  dialogues: { greeting, questIntro, questDone, farewell },  // par état
  dialoguesByHouse: { Gryffondor:{greeting:[…]}, … },        // ✅ override Maison
  questId: 'mandragore_pomfresh',                // si donneur
  specialAction: { id, label, oneShot? }         // Fumseck, portrait, Manon
}
```

💡 **Extensions minimales proposées** (champs **optionnels**, rétro-compatibles) :

```js
{
  faction:    'maisons'|'ordre'|'fondateurs'|'corruption'|'neutre',  // 💡 tag de §6.3
  tier:       'surface'|'depths'|'loop',                              // 💡 ton §6.0
  houseGate:  'Serpentard',          // 💡 n'apparaît que si chosenHouse === ce(s) valeur(s)
  reactsTo:   ['quest','house','eclat','floor'],  // 💡 leviers §6.9 (doc/lint, défensif)
  eclatLines: { 1:[…], 2:[…], 3:[…] }             // 💡 suffixes fil rouge §6.9.3
}
```

> 💡 Aucun de ces champs n'est requis ; un PNJ sans eux se comporte comme aujourd'hui.
> Le `houseGate` réutilise la logique de filtrage déjà présente dans
> `getNpcsForFloor`.

### B. Variables & flags nécessaires

| Flag / var | Statut | Portée | Rôle |
|------------|--------|--------|------|
| `chosenHouse` | ✅ existe | sérialisé | Levier 1 (Maison) — déjà lu par `dialoguesByHouse`. |
| `houseTier` | ✅ existe | sérialisé | `houseInfluence` **dérivé** (§6.9.2) — pas de flag neuf. |
| `<house>SignatureDone` | 💡 [08 §8.5.2] | sérialisé | Réplique pré-Voldemort + modificateur (§6.9.4). |
| `slythPactChoice` | 💡 [08 §8.5.2] | sérialisé | Choix gris écho de Salazar (`pact`/`defiance`). |
| `eclatProgress` | 💡 nouveau | sérialisé (0-3) | Suffixes fil rouge (§6.9.3). Dérivable de la quête `eclats_clef_voute` si possible — **préférer le dérivé**. |
| `npcReputation` | ❓ optionnel | `Map<id,int>` borné | Mémoire **par PNJ** — réservée aux 2-3 PNJ à trahison (§6.9.2). |
| `victoryAchieved`, `currentFloor` | ✅ existe | runtime/sérialisé | Levier 4 (étage/Acte), recyclage Boucle. |

> ⚠️ **Anti-redondance** (guidelines §2 + CLAUDE.md) : **ne pas** créer de flag
> dupliquant `chosenHouse`/`houseTier`. `houseInfluence` reste **dérivé**.
> `eclatProgress` doit, si possible, se **lire** depuis l'état de
> `eclats_clef_voute` plutôt qu'être un compteur parallèle.

### C. Système de dialogues dynamiques

✅ **Pipeline existant** (`npc-dialog.js`) : `openNpcDialog(npcId)` →
`getNpcQuestState(npc)` → `_npcDialogPages(npc, state)` → couche
`dialoguesByHouse[chosenHouse]` override. 💡 **À étendre** sans refonte :

1. **Ordre de résolution** (déjà amorcé) : `base` → `dialoguesByHouse` → **état de
   quête** → **suffixe `eclatLines[eclatProgress]`** si présent.
2. **Beats scriptés par étage** (§6.9.4) : un petit résolveur
   `npcFloorBeat(npcId, floor, flags)` (modèle `heroBarkScripted`) renvoie une page
   spéciale one-shot (réplique pré-Voldemort, voix des Ruines).
3. **Garde défensif** : si un override manque, **retomber** sur `base` (jamais de
   page vide) — aligné sur le style défensif du projet (`safeCall`).

### D. Intégration transverse

- **Quêtes signature** ([08 §8.5](08-quetes-et-sous-intrigues.md)) : les PNJ
  donneurs (Chevalier Fantôme, écho de Salazar, stèles/Flitwick, Chourave)
  posent/lisent `<house>SignatureDone` ; remise via `pendingHouseRewards`.
- **Codex** ([12](12-glossaire-et-codex.md)) : chaque PNJ-pivot **déclenche** une
  entrée de Codex (catégorie 👤 Personnages, 🔥 Histoire, 🔹 Éclats). Hook : à la
  fin d'un dialogue-clé, `unlockCodexEntry(id)`.
- **Lieux** ([10](10-lieux-et-geographie.md)) : `npc.location` ancre le PNJ à une
  salle nommée (Infirmerie, Bibliothèque Interdite, Refuge du Blaireau…).
- **Événements par étage** ([04](04-structure-actes-et-etages.md)) : beats scriptés
  branchés sur `_changeFloor` / `_maybePlayTierTransition` (transitions) et
  `_checkBossPhases` (climax).
- **Fil rouge** : `eclatProgress` lu par Dumbledore + stèles/écho (§6.9.3).

### E. Surface vs profondeurs vs Boucle

- **Surface (1-6)** : PNJ déterministes + aléatoires seedés ; ton scolaire.
- **Profondeurs (7-10)** : PNJ d'Ordre isolés ; ton grave ; chaque quête = dette.
- **Boucle (11+)** : recyclage via `effectiveFloor` (✅ Kingsley 8/18…) +
  `gardien_boucle` exclusif (`victoryAchieved`). Les PNJ recyclés gardent leur id
  mais 💡 peuvent porter un **suffixe Ténébreux** de dialogue (lu sur `currentFloor
  >= 18`).

### F. Priorisation (ordre de chantier recommandé)

1. **P0 — déjà en jeu** : roster §6.2 + `dialoguesByHouse` (Slughorn) +
   `specialAction` (Fumseck, portrait, Manon). *Rien à faire, à documenter.*
2. **P1 — PNJ des quêtes signature** (cœur de l'attachement, [08 §8.5]) :
   Chevalier Fantôme (🦁), écho de Salazar (🐍 + `slythPactChoice`), stèles/Codex
   (🦅), Refuge/Chourave (🦡). Le plus de valeur narrative.
3. **P2 — réactivité fil rouge** : `eclatProgress` + suffixes `eclatLines` sur
   Dumbledore, stèle, écho (§6.9.3).
4. **P3 — beats scriptés par étage** : réplique pré-Voldemort, voix des Ruines
   13↔14, suffixes Ténébreux en Boucle.
5. **P4 — secondaires / polish** : `npcReputation` (❓, 2-3 PNJ max), promotions de
   boss originaux en personnages (Maître des Détraqueurs, Héraut — §6.6).

### G. Suggestions d'assets

| Asset | Statut ✅ | Besoin 💡 |
|-------|-----------|------------|
| **Sprites PNJ** | ✅ types génériques (`mage`/`prof_h`/`prof_f`/`fantome`/`vendeur`/`phenix`) → `_wizard_generic.png` | 💡 PNG dédiés par PNJ-pivot (Dumbledore, chefs, Gardien) — `NPC_SPRITE_SRC`, **bump cache PWA** (skill `cache-bump`). |
| **Portraits-médaillons** | ✅ pour héros | 💡 médaillon par PNJ majeur (modèle [05] §1, anneau transplanté). |
| **Voix** | ✅ `headOfHouseVoiceKey` (don), `dumbledore_intro_*` (intro) | 💡 samples OGG par beat scripté (réplique pré-Voldemort, écho de Salazar). |
| **Barks** | ✅ `HERO_BARKS` (héros) | 💡 entrées `houseTension` croisées PNJ×héros (§6.9.5). |
| **Animations d'expression** | ❓ absent | 💡 légère pulsation/aura déjà présente (`_npcAnimPhase`) ; expressions = hors-scope V1. |

> ✅ **Note non-régression** : tout asset JS/CSS modifié impose le **bump du cache
> PWA** (guidelines §8, skill `cache-bump`). Le présent chapitre étant **purement
> documentaire**, il n'en déclenche aucun.

---

## 6.13 Tables de synthèse

### 6.13.1 PNJ majeurs — vue d'ensemble

| PNJ | Faction | Rôle principal | Variantes Maison 💡 | Liens quêtes / lieux |
|-----|---------|----------------|----------------------|----------------------|
| 🔴 Dumbledore (portrait) | Fondateurs (4ᵉ voix) | Mentor-fil rouge, sens | Réplique pré-Voldemort par `<house>SignatureDone` | `intro_tutoriel`, chaîne `dumbledore_*`, Lux Aeterna, Éclats |
| 🔴 McGonagall | Maisons (🦁) | Cheffe, défense organisée | Adopte les Gryffondor ; relais Étendard | `golem_passage`, `quest_set_gryff`, don |
| 🔴 Rogue | Maisons (🐍) | Chef, ennemi connu | Montre le Pacte ; méprise la dépendance | signature 🐍, `quest_set_slyth`, don |
| 🔴 Flitwick | Maisons (🦅) | Chef, décodeur | Révèle le Codex ; pair intellectuel | stèles, `quest_set_raven`, don |
| 🔴 Chourave | Maisons (🦡) | Cheffe, lien & moral | Ouvre le Refuge ; jardins | signature 🦡, `quest_set_pouf`, `herb`, don |
| 🔴 Lupin | Ordre / profs | Mentor Patronus | Père caché de Manon | `lumiere_desespoir`, arc Manon |
| 🔴 Hagrid | Ordre / profs | Créatures | — | `chouette_perdue` |
| 🔴 Slughorn | Maisons (transverse) | Potions, Slug Club | ✅ `dialoguesByHouse` (accueil par Maison) | `quest_potions_slughorn` |
| 🔴 Kingsley / Bill / Sirius | Ordre (profondeurs) | Sentinelles, dettes | — (recyclés en Boucle) | quêtes de zone profonde |
| 🔴 Fumseck | Ordre / lumière | Larmes (soin/amulette) | — | `specialAction` |
| 🟢 Chevalier Fantôme | Maisons (🦁) | Donneur signature, mémoire | **Gate Gryffondor** | *L'Étendard de Godric* |
| 🟢 Écho de Salazar | Fondateurs (2ᵉ voix) | Tentateur-miroir, choix gris | **Gate Serpentard** + `slythPactChoice` | *Le Pacte des Cachots* |
| 🟢 Manon | Neutre (arc transverse) | Deuil & givre | indépendant du `chosenHouse` | arc Élara, `pages` |
| 🟢 Gardien de la Boucle | (post-victoire) | Héritier du fil rouge | — | purges répétables |

### 6.13.2 Factions — vue d'ensemble

| Faction | Membres-clés ✅ | Rôle narratif 💡 | Voix des Fondateurs | Opposition |
|---------|------------------|-------------------|---------------------|------------|
| Les 4 Maisons | chefs (McGonagall/Rogue/Flitwick/Chourave) | 4 façons de vivre la descente | les quatre voix | la Corruption |
| Professeurs / Ordre | Lupin, Hagrid, Kingsley, Bill, Sirius, Fumseck | mentors → sentinelles | (relais) | la Corruption |
| Garde de l'Aube | héros originaux ([05]) | fraternité de circonstance | (porteurs) | la Corruption |
| Esprits des Fondateurs | stèle, écho de Salazar, Codex, portrait | la mémoire qui remonte | **les quatre** | l'oubli, le déni |
| Forces de la Corruption | Mangemorts (F4), sans-repos (F3/F5), créatures (F1) | vecteurs du mal scellé | — | la lumière |
| Voldemort | `voldemort_affaibli/_revenu` | pointe émergée | — | le héros |

---

## Points à trancher (résumé)
1. ❓ Quels **boss originaux** promouvoir en personnages (dialogue/cinématique) :
   recommandation 💡 Maître des Détraqueurs + Héraut des Ténèbres ; garder Veilleur
   du Seuil & Hécate en gardiens de lore (§6.6).
2. ❓ Introduire `npcReputation` **par PNJ** (mémoire de trahison) ou se contenter
   de `houseInfluence` **dérivé** ? Recommandation 💡 : dérivé d'abord, réputation
   réservée aux 2-3 PNJ à choix gris (§6.9.2).
3. ❓ `eclatProgress` = **compteur sérialisé** neuf ou **dérivé** de l'état de
   `eclats_clef_voute` ? Recommandation 💡 : dérivé si faisable (§6.12.B).
4. ❓ Le « peut-être » du **Gardien de la Boucle** annonce-t-il une **fin écrite**
   de la Boucle ou une boucle de prestige assumée ? (§6.7.2, lien
   [03 §3.6](03-trame-principale.md)).
5. ❓ **Formaliser des beats scriptés par étage** (§6.9.4) au-delà du climax
   (réplique pré-Voldemort déjà actée comme hook) — en lien avec les
   « étages-scènes » de [04 §4.4](04-structure-actes-et-etages.md).

---

## Récapitulatif express (pour briefer Gemini)
> **Fil rouge** = portrait de Dumbledore (mentor, **4ᵉ voix des Fondateurs**) →
> remplacé par le **Gardien de la Boucle** en post-game. Le déclencheur est la
> **Clé de Voûte des Quatre** fêlée en cours ; la corruption scellée est **double**
> (pré-Poudlard **+** Voldemort, pointe émergée). **PNJ** structurés en **surface**
> (école, 1-6), **profondeurs** (Ordre isolé, 7-10) et **Boucle** (recyclés +
> Gardien). **Cinq factions** : 4 Maisons, Professeurs/Ordre, **Garde de l'Aube**
> (héros originaux), **Esprits des Fondateurs** (stèle/écho/Codex/portrait), et les
> **Forces de la Corruption** (Mangemorts F4 → sans-repos F3/F5 → créatures F1 →
> Voldemort). L'influence évolue en **chiasme** : l'école recule, la mémoire des
> Fondateurs monte, convergence en Acte III. **PNJ des signatures** : Chevalier
> Fantôme (🦁), écho de Salazar (🐍, choix gris), stèles/Codex (🦅), Refuge/Chourave
> (🦡). **Système de réactions** à **cinq couches** : Maison (`dialoguesByHouse` ✅) →
> état de quête (`getNpcQuestState` ✅) → fil rouge (`eclatProgress` 💡) → étage/Acte
> (✅ recyclage) → héros (barks ✅). **Implémentation** : tout se câble au-dessus de
> `npcs.js`/`npc-dialog.js`, flags sérialisés (`<house>SignatureDone`,
> `slythPactChoice`), `houseInfluence` **dérivé** — priorité aux **PNJ des
> signatures** (P1), puis réactivité fil rouge (P2). Aucun PNJ ne gate jamais
> l'escalier.
