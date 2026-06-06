# 06 — PNJ & factions

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : caractériser les personnages non-jouables (mentors, donneurs de
> quêtes, marchands, figures de lore), structurer les **factions**, et
> hiérarchiser les **antagonistes**. `✅` = acté dans le jeu (`js/npcs.js`,
> `js/monsters.js`) ; `💡` = proposition de fond narratif. Voir les héros en
> [05](05-personnages-jouables.md), la trame en [03](03-trame-principale.md),
> les Maisons en [07](07-les-maisons.md) et le bestiaire en [09](09-bestiaire-et-lore.md).

---

## 6.1 Le fil rouge — le **portrait de Dumbledore**

✅ **Albus Dumbledore** ouvre l'aventure : son **portrait** (sprite `mage`,
étage 1, première salle) accueille le héros après l'intro, donne la quête
tutoriel (`intro_tutoriel`) et l'envoie dans les profondeurs. Il revient sous
forme de **Portrait d'Albus Dumbledore** (`portrait_dumbledore`, sprite
`fantome`, étage 6) pour l'**Épreuve de la Lumière Éternelle** (Lux Aeterna).
Il donne aussi une **chaîne de quêtes** narratives : `dumbledore_eveil`,
`dumbledore_courage`, et des quêtes de chasse aux mangemorts / Bellatrix.

- **Rôle narratif :** mentor-fil rouge, **voix de la trame**. Il ne descend pas
  lui-même ; il *envoie* et *reconnaît*.
- **Voix ✅/💡 :** bienveillante, sentencieuse, douce ironie ; parle d'« épreuves
  douces », de courage et de peur. Réplique-pivot de victoire :
  *« L'escalier le plus profond, scellé par la peur, s'ouvre enfin. »*
- **Apport :** quête tutoriel, bénédiction (action spéciale), Épreuve de la
  Lumière Éternelle (mini-jeu d'énigme, boss `_spawnLuxAeternaBoss`).
- **Évolution en Boucle Ténébreuse 💡 :** son rôle de guide est *remplacé* par le
  **Gardien de la Boucle** (voir §6.5) — Dumbledore a dit son dernier mot avec la
  victoire ; au-delà, c'est la récurrence qui parle.

---

## 6.2 PNJ par tranche (✅ dans le jeu — `npcs.js`)

### Acte I — L'École (étages 1–3)

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ |
|----------|--------|-------|------------------------------|
| **Albus Dumbledore** (`dumbledore`) | mage | 1 | Mentor-fil rouge. Quête tutoriel, chaîne narrative (voir §6.1). |
| **Madame Pomfresh** (`pomfresh`) | prof_f | 2 | L'infirmière débordée : quête de la **mandragore** (`mandragore_pomfresh`). Voix maternelle, pressée. |
| **Mimi Geignarde** (`mimi`) | fantome | 2 | Fantôme plaintif des toilettes : quête du **troll** (`troll_toilettes`). Voix geignarde, théâtrale dans son malheur. |
| **Newton Scamander** (`scamander`) | mage | 2 | Magizoologiste : quête des **Niffleurs** (`niffleurs_trésor`). Voix douce, passionnée par les créatures même nuisibles. |
| **Horace Slughorn** (`slughorn`) | prof_h | 2 | Le **maître des potions** : chaîne de quêtes d'ingrédients (`quest_potions_slughorn` ×3) → recettes. Voix mielleuse, friande de talents. |
| **Gilderoy Lockhart** (`lockhart`) | prof_h | 3 | Le vaniteux : quête du **livre interdit** (`livre_interdit`). Voix prétentieuse, comique. |
| **Manon Aubin** (`manon`) | prof_f | 3 | Fil du **grimoire de givre d'Élara** (sa mère) : fusion des pages (`manon_fusion_grimoire`). Voix retenue, endeuillée, qui s'éclaire. → [08](08-quetes-et-sous-intrigues.md). |
| **Professeur Chourave** (`sprout`) | prof_f | 3 | Cheffe de Poufsouffle (voir §6.6). Voix terrienne, bienveillante. |
| **Mr Ollivander** (`ollivander`) | vendeur | 3 | Le fabricant de baguettes : vend `wand1`, `wand2`. Voix énigmatique, « la baguette choisit le sorcier ». |

### Acte II — La Descente (étages 4–6)

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ |
|----------|--------|-------|------------------------------|
| **Professeur Lupin** (`lupin`) | prof_h | 4 | Mentor doux-amer : enseigne face aux Épouvantards. Voix fatiguée, sage, profondément humaine. |
| **Hagrid** (`hagrid`) | prof_h | 4 | Le gardien des créatures : quête de la **chouette perdue** (`chouette_perdue`). Voix bourrue et tendre. |
| **Professeur Rogue** (`rogue`) | prof_h | 4 | Chef de Serpentard (voir §6.6). Voix glaciale, ironie cinglante. |
| **Professeur McGonagall** (`mcgonagall`) | prof_f | 5 | Cheffe de Gryffondor (voir §6.6). Voix sévère, droite, loyale. |
| **Madame Guipure** (`guipure`) | vendeur | 5 | Couturière : vend robes, chapeaux, capes. Voix pratique, soucieuse de l'allure. |
| **Professeur Flitwick** (`flitwick`) | prof_h | 6 | Chef de Serdaigle (voir §6.6). Voix enjouée, vive, érudite. |
| **Sir Patrick Delaney-Podmore** (`sir_patrick`) | fantome | 6 | Fantôme de la **Chasse Sans Tête** (easter egg). Voix grandiloquente, chevaleresque. |
| **Portrait d'Albus Dumbledore** (`portrait_dumbledore`) | fantome | 6 | Épreuve de la **Lumière Éternelle** (Lux Aeterna). Voir §6.1. |

### Acte III — Les Profondeurs (étages 7–10)

| PNJ (id) | Sprite | Étage | Rôle narratif 💡 + apport ✅ |
|----------|--------|-------|------------------------------|
| **Fumseck** (`fumseck`) | phenix | 7 | Le phénix de Dumbledore : action spéciale (**larmes**) → soin / amulette. Présence muette et lumineuse — un signe que la lumière descend aussi. |
| **Kingsley Shacklebolt** (`kingsley`) | mage | 8 | Auror de l'Ordre, sentinelle des profondeurs. Voix posée, autorité tranquille. Recyclé en Boucle (ét. 18). |
| **Marchand Clandestin** (`marchand_clandestin`) | vendeur | 8 | Vendeur d'équipement d'Auror (casque, bottes, cape, anneau anti-magie). Voix prudente, en marge. |
| **Bill Weasley** (`bill_weasley`) | prof_h | 9 | Briseur de sortilèges : aide à percer les défenses anciennes. Voix franche, courageuse. Recyclé en Boucle (ét. 19). |
| **Apothicaire Ténébreux** (`apothicaire_tenebreux`) | vendeur | 9 | Vendeur d'herbes, potions, **Essence des Ténèbres**, **Page de Grimoire**. Voix inquiétante, mercantile. |
| **Esprit de Sirius Black** (`sirius_esprit`) | fantome | 10 | Présence-écho au seuil du climax. Voix chaleureuse, protectrice, douloureuse. Recyclé en Boucle (ét. 20). |
| **Forgeron Ténébreux** (`forgeron_tenebreux`) | vendeur | 10 | Forge endgame : pectoral d'Auror, larme du phénix, grimoire avancé, matériaux. Voix rude, taiseuse. |

> ✅ **Recyclage en Boucle Ténébreuse :** Kingsley (8/18), Bill (9/19), Sirius
> (10/20) ainsi que l'Apothicaire, le Marchand et le Forgeron réapparaissent aux
> étages 18-20 — vente d'Essence / Page accessible en Boucle ([03 §3.6](03-trame-principale.md)).

### PNJ aléatoires (rencontres seedées par étage) ✅

| PNJ (id) | Sprite | Rôle |
|----------|--------|------|
| **Madame Rosmerta** (`rosmerta`) | vendeur | Aubergiste itinérante : potions, chocolat. |
| **Mondingus Fletcher** (`mundungus`) | vendeur | Receleur : livres de sorts, Félix. Voix fuyante. |
| **Sir Nicolas de Mimsy** (`sir_nicolas`) | fantome | Quasi-Sans-Tête, lore + easter egg. |
| **Le Moine Gras** (`moine_gras`) | fantome | Fantôme de Poufsouffle, lore bienveillant. |
| **Argus Rusard** (`rusard`) | prof_h | Concierge acariâtre, lore + couleur. |
| **Newton Scamander** (`scamander_random`) | mage | Variante itinérante du magizoologiste. |
| **Hagrid** (`hagrid_random`) | prof_h | Variante itinérante de Hagrid. |
| **Sibylle Trelawney** (`trelawney`) | prof_f | Voyante : présages cryptiques (thème prophétie, écho Céleste — [05](05-personnages-jouables.md)). |
| **Marchand d'Ombre** (`marchand_ombre`) | vendeur | Vendeur d'endgame (élixirs permanents, pierre d'âme, matériaux). |

---

## 6.3 Faction — la **Garde de l'Aube** (alliés)

> 💡 (proposition, sur base `data.js` + intuition de design)

La **Garde de l'Aube** regroupe les **8 héros originaux** ([05 §5.2](05-personnages-jouables.md)) :
des volontaires que le portrait de Dumbledore a pressentis pour la descente. Elle
n'a ni hiérarchie ni QG — c'est une **fraternité de circonstance** unie par un
serment muet : *remonter la lumière depuis le fond*.

- **Alliés naturels :** les professeurs (chefs de Maison, Lupin, Hagrid, Slughorn),
  l'Ordre du Phénix (Kingsley, Bill, Sirius), Fumseck.
- **Rôle narratif :** justifie l'existence collective des originaux sans réécrire le
  canon ; donne un « nous » aux héros que Dumbledore envoie.
- **Opposition :** la faction mangemort (§6.4) et tout ce que la Boucle ramène.

---

## 6.4 Factions ennemies

> ✅ ancrages via `monsters.js` / [09](09-bestiaire-et-lore.md) ; 💡 hiérarchie narrative.

### A. Les Mangemorts (humains corrompus)

La faction structurée du mal — des **fidèles** qui œuvrent à hâter le retour de
leur maître. Hiérarchie ascendante (du plus faible au plus fort) :

```
Mangemort Masqué  →  Mangemort d'Élite  →  Mangemort Vétéran
        →  Bellatrix Lestrange / Antonin Dolohov (cercle intérieur)
                →  Voldemort (Affaibli → Ressuscité)
```

- **Voix collective 💡 :** dévotion fanatique, mépris du « sang impur », langage rituel.
- **Lien à la trame :** apparaissent dès l'Acte II (ét. 4-6) ; leur présence
  **prouve** que la corruption n'est pas qu'un phénomène magique mais une volonté
  organisée. Cible des quêtes de Dumbledore et du Gardien de la Boucle.

### B. Les fantômes & morts-vivants (les sans-repos)

Tout ce que le château retient au seuil de la mort : fantômes, Inferius,
Détraqueurs, Spectres, vampires/Strigoï, poupées maudites.

- **Voix collective 💡 :** murmure, faim, oubli ; ils ne *veulent* pas, ils *manquent*.
- **Lien à la trame :** densité croissante avec la profondeur ; vulnérables à la
  **lumière** (Lumos Solem, Patronus, Lux Aeterna — `bonusVsUndead`). Miroir de tentation
  pour Maxence le Mage de Sang ([05](05-personnages-jouables.md)).

### C. Les créatures du château (la sauvagerie domestiquée)

Bêtes et êtres magiques de Poudlard rendus hostiles par la corruption : chat de
Rusard, Peeves, lutins, Acromantules, Trolls, Hippogriffes, Gargouilles…

- **Voix collective 💡 :** instinct dénaturé ; agressivité anormale = symptôme de la
  corruption (le familier qui se fissure — [03 §3.2](03-trame-principale.md)).
- **Lien à la trame :** baromètre de l'avancée du mal ; cibles des quêtes-jalons de
  l'Acte I (mandragore, troll, niffleurs, chouette).

---

## 6.5 Antagonistes — hiérarchie

> ✅ boss dans `monsters.js` ; 💡 statut scénarisé.

### Antagoniste suprême

- **Voldemort** — `voldemort_affaibli` (ét. 8, premier contact incomplet) puis
  `voldemort_revenu` (ét. 10, **climax**). C'est la **source** de la corruption ;
  sa chute scelle l'arc principal ([03 §3.5](03-trame-principale.md)).

### Boss canon (jalons scénarisés de la descente)

| Boss | Étage | Rôle scénarisé 💡 |
|------|-------|-------------------|
| **Fenrir Greyback** | 8 | Le loup-garou, première vraie gueule des Profondeurs. |
| **Aragog** | 9 | L'Acromantule légendaire, gardien des racines du château. |
| **Antonin Dolohov** | 10 | Le mangemort vétéran, dernier verrou humain avant Voldemort. |
| **Bellatrix Lestrange** | 8+ | La fidèle absolue ; cible d'une quête de Dumbledore. |

> ✅ Chaque boss tombé **affaiblit le sceau** ; la présence de Voldemort se densifie
> d'étage en étage.

### Boss originaux (gardiens de seuil, epic)

Antagonistes inédits, **moins scénarisés** que les canon — des gardiens
thématiques plutôt que des personnages :

| Boss | Apparition | Rôle 💡 |
|------|------------|---------|
| **Veilleur du Seuil** | ét. 8+ | Gardien-sentinelle, épreuve de passage. |
| **Maître des Détraqueurs** | ét. 9+ | Chef de la faction morts-vivants (§6.4 B) — incarne la peur-sceau. |
| **Héraut des Ténèbres** | ét. 10+ | Annonciateur ; pont vers la Boucle Ténébreuse. |
| **Hécate la Maudisseuse** | (voir `monsters.js`) | Figure de malédiction, lore de sortilèges noirs. |

> ❓ À arbitrer : lesquels de ces boss originaux méritent un **dialogue/cinématique**
> dédié (les promouvant en personnages), et lesquels restent de purs **gardiens
> mécaniques** ? Recommandation 💡 : scénariser le **Maître des Détraqueurs** (il
> sert le thème de la peur) et le **Héraut des Ténèbres** (charnière de la Boucle) ;
> garder le Veilleur du Seuil et Hécate en gardiens de lore.

---

## 6.6 Les chefs de Maison

✅ Les quatre chefs sont des PNJ déterministes ET les hôtes des **paliers endgame**
et du **don à la Maison** (gold-sink, dès le tier 17). Détail d'identité narrative
en [07](07-les-maisons.md).

| Chef (id) | Maison | Étage | Voix 💡 | Apport ✅ |
|-----------|--------|-------|---------|-----------|
| **McGonagall** (`mcgonagall`) | Gryffondor | 5 | Sévère, droite, loyale | Leçon spéciale, paliers Maison, don. |
| **Rogue** (`rogue`) | Serpentard | 4 | Glaciale, ironie cinglante | Idem (voix `rogue`). |
| **Flitwick** (`flitwick`) | Serdaigle | 6 | Enjouée, vive, érudite | Idem (voix `flitwick`). |
| **Chourave** (`sprout`) | Poufsouffle | 3 | Terrienne, bienveillante | Idem (voix `sprout`). |

> **Présence narrative au-delà des paliers 💡 :** au-delà de leur rôle de palier,
> chaque chef incarne sa Maison face à la descente — McGonagall qui *organise* la
> défense, Rogue qui *connaît* l'ennemi de l'intérieur, Flitwick qui *décode* les
> anciennes magies, Chourave qui *fait tenir* le moral. C'est par eux que la trame
> reste reliée à la vie de l'école pendant qu'on s'enfonce.

---

## 6.7 Le **Gardien de la Boucle** (post-victoire)

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
  qui se reforme, Aragog qui dort « sous la racine du temps », Dolohov « jamais
  vraiment mort »). Il laisse même entrevoir une **sortie possible** :
  *« Plus tu purges, plus la Boucle s'allège. C'est ainsi qu'on en sort — peut-être. »*

> ❓ À arbitrer (en lien avec [03 §3.6](03-trame-principale.md)) : ce « peut-être »
> annonce-t-il une **fin écrite** de la Boucle, ou n'est-ce qu'une **boucle de
> prestige** assumée ? Le Gardien est le PNJ par lequel cette réponse passerait.

---

## Récapitulatif express (pour briefer Gemini)
> **Fil rouge** = portrait de Dumbledore (mentor) → remplacé par le **Gardien de la
> Boucle** en post-game. **PNJ** structurés par tranche : profs/donneurs de quêtes
> et marchands de l'École aux Profondeurs ; recyclage des PNJ profonds (Kingsley,
> Bill, Sirius, marchands) en Boucle Ténébreuse. **Factions ennemies** : Mangemorts
> (hiérarchie masqué → élite → vétéran → Bellatrix/Dolohov → Voldemort),
> fantômes/morts-vivants (faim, peur, faibles à la lumière), créatures du château
> (familier corrompu). **Alliés** = professeurs + Ordre + **Garde de l'Aube** (les
> 8 héros originaux). **Antagonistes** : Voldemort au sommet ; boss canon = jalons
> scénarisés ; boss originaux = gardiens de seuil, dont 2 à promouvoir en
> personnages (Maître des Détraqueurs, Héraut des Ténèbres).
