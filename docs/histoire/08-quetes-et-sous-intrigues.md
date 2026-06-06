# 08 — Quêtes & sous-intrigues

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : cartographier les quêtes (principales, secondaires, répétables) et
> les easter eggs narratifs. `💡` = proposition narrative modifiable ; `✅` =
> acté dans le jeu (`QUEST_TEMPLATES` dans `js/quests-templates.js`,
> `availableQuests`/`activeQuests` dans `js/state.js`). Les grosses intrigues
> peuvent éclater en sous-fichiers (`08-quetes/<nom>.md`).
>
> 🔗 Donneurs en [06](06-pnj-et-factions.md) ; trame qui les porte en
> [03](03-trame-principale.md) ; Maisons et quêtes réservées en
> [07](07-les-maisons.md) ; lieux en [10](10-lieux-et-geographie.md).

---

## 8.1 Typologie des quêtes

> 💡 (proposition de classification) / ✅ (les mécaniques d'objectif existent)

✅ Les quêtes vivent dans un **catalogue de templates** (`QUEST_TEMPLATES`) ;
une quête acceptée est un clone en cours (`activeQuests`). Objectifs supportés :
`floor`, `kill`, `item`, `pages`, `riddle`, `discover_garden`, `herb`,
`donate`. Une quête peut chaîner ses prérequis (`prereq`) et être **répétable**
(`repeatable.everyLevels`).

| Catégorie | Rôle narratif `💡` | Marqueurs ✅ |
|-----------|---------------------|--------------|
| **Trame / jalons** | Font avancer l'arc principal ; chaîne de Dumbledore qui escorte la descente. | `intro_tutoriel` + chaîne `dumbledore_*` (`prereq`). |
| **Secondaires** | Saveur, lore, équipement ; ancrent les PNJ et les lieux. | Pomfresh, Lockhart, Mimi, Hagrid, Ollivander, Guipure, Fumseck… |
| **Arcs émotionnels** | Mini-récits autonomes à forte charge (deuil, mémoire). | Manon / grimoire d'Élara ; Lux Aeterna. |
| **De Maison** | Réservées à la Maison choisie ; complètent set + prestige. | `quest_set_*` (palier 12), `quest_don_*` (palier Mythe). |
| **Répétables / farm** | Boucle de récompense ; matière première endgame. | Hagrid (chouette), Scamander, Chourave, **purges** du Gardien. |
| **Easter eggs** | Clins d'œil canon, récompense souvent cosmétique. | Chasse Sans Tête, Reliques de la Mort, Salle sur Demande, elfe. |

> ✅ Aucune quête secondaire n'est **bloquante** : la progression se fait en
> descendant (escaliers), pas en validant des quêtes. La seule chaîne qui
> double la trame est celle de **Dumbledore** (escorte narrative), et elle
> reste optionnelle mécaniquement.

> ✅ **Tranché par le jeu** : aucune quête — y compris la chaîne Dumbledore —
> ne conditionne `goDeeper()` ni l'accès à l'escalier. La colonne vertébrale
> de la trame est la descente elle-même, culminant en la victoire sur Voldemort
> (`victoryAchieved`, étage 10), seul vrai verrou dur. Toutes les quêtes
> (chaîne Dumbledore incluse) sont du **contenu optionnel** : des escortes
> narratives, de la saveur, du loot — jamais des prérequis de progression.

---

## 8.2 Quêtes de départ & jalons (✅ — fiches)

### Bienvenue à Poudlard *(`intro_tutoriel`)*
- **Donneur / lieu :** Albus Dumbledore (portrait) — Hall d'entrée (ét. 1).
- **Accroche narrative :** 💡 le portrait appelle le héros : descendre, c'est
  refermer le sceau. Premier pas dans les Profondeurs.
- **Objectif :** ✅ atteindre l'étage 2 (`floor`).
- **Récompense :** ✅ 30 XP, 20 G, +5 PV / +1 ATK/DEF/MAG. 💡 La confiance de
  Dumbledore.
- **Liens :** amorce de la **chaîne Dumbledore** (`dumbledore_*`).

### Chaîne de Dumbledore *(`dumbledore_eveil` → `_courage` → `_resistance` → `_revelation`)*
- **Donneur / lieu :** ✅ Dumbledore (Hall, ét. 1), cibles en profondeur.
- **Accroche :** 💡 quatre épreuves d'audace qui **escortent la descente** :
  affronter sa peur (Épouvantard), la bravoure (Mangemorts), l'élite, puis
  l'ombre (Bellatrix).
- **Objectif :** ✅ `kill` graduels — `boggart` → 2× `mangemort` →
  `mangemort_elite` → `bellatrix`.
- **Étapes / rebondissements :** ✅ chaque maillon a `prereq` sur le précédent ;
  💡 Dumbledore commente la progression du sceau qui faiblit
  ([03 §3.4](03-trame-principale.md)).
- **Récompense :** ✅ boosts permanents cumulés (jusqu'à +20 PV, +2 ATK/DEF/MAG/LCK
  à `_revelation`), Wingardium, potion, amulette. 💡 L'adoubement du mentor.
- **Liens :** double la trame principale ; culmine juste avant le climax ét. 10.

### Herboristerie urgente *(`mandragore_pomfresh`)*
- **Donneur / lieu :** ✅ Madame Pomfresh — Infirmerie (ét. 2).
- **Accroche :** 💡 des élèves sont pétrifiés ; il faut des mandragores, vite.
- **Objectif :** ✅ rapporter 3× `mandragore` (`item`).
- **Récompense :** ✅ 80 XP, 40 G, potion moyenne, **sort Episkey**. 💡 La
  reconnaissance d'une infirmière débordée.

### Le livre qui mord *(`livre_interdit`)*
- **Donneur / lieu :** ✅ Gilderoy Lockhart — Bibliothèque Interdite (ét. 3).
- **Accroche :** 💡 Lockhart, plus soucieux de sa gloire que du danger, envoie
  le héros chercher le **Livre des Monstres**.
- **Objectif :** ✅ rapporter `book_monsters` (`item`).
- **Récompense :** ✅ 120 XP, 25 G, baguette. 💡 Vantardise comique en prime.

### Nettoyage des toilettes *(`troll_toilettes`)*
- **Donneur / lieu :** ✅ Mimi Geignarde — Toilettes du 2ᵉ étage.
- **Accroche :** 💡 un troll squatte les toilettes hantées de Mimi ; clin d'œil
  au canon (Halloween, première année).
- **Objectif :** ✅ tuer le `troll` (`kill`).
- **Récompense :** ✅ 150 XP, 60 G, robe. 💡 La gratitude geignarde d'un fantôme.

### Chouette ensorcelée *(`chouette_perdue`, répétable)*
- **Donneur / lieu :** ✅ Hagrid — Forêt Interdite (ét. 4+).
- **Objectif :** ✅ tuer/capturer `chouette_envoutee` (`kill`). ✅ répétable tous
  les 3 niveaux ; à l'acceptation, spawn de la cible + 2 mobs.
- **Récompense :** ✅ 1ʳᵉ remise : balai (`broom`) ; ensuite récompense allégée.
  💡 L'amitié bourrue de Hagrid.

### Autres jalons secondaires (✅)
- **L'invasion des Niffleurs** *(`niffleurs_trésor`)* — Scamander, ét. 2+ :
  tuer 3 `niffleur` → amulette.
- **Le Gardien Endormi** *(`golem_passage`)* — McGonagall, ét. 5+ : tuer
  `gardien_portail` → livre Bombarda.
- **La Lumière contre le Désespoir** *(`lumiere_desespoir`)* — Lupin, ét. 4+ :
  tuer `detraqueur` **et** rapporter `choco_sorcier` → **sort Patronum**.
  💡 Première rencontre de la peur incarnée (Détraqueur) et de son antidote.
- **Quêtes de zone profonde** ✅ : **Kingsley** (ét. 8 — Greyback, Veilleur,
  aconit pour Lupin), **Bill Weasley** (ét. 9 — Aragog, Maître des Détraqueurs,
  dictame), **Esprit de Sirius** (ét. 10 — Dolohov, Héraut, spectres). 💡 Ces
  PNJ donnent à la descente finale une **chair émotionnelle** : chaque chasse
  est une dette personnelle (cf. [06](06-pnj-et-factions.md)).
- **Chaîne Slughorn** ✅ (`quest_potions_slughorn` ×3) : déverrouille la
  **concoction de potions** (recettes). 💡 L'apprentissage du métier.
- **Jardins de Chourave** ✅ (`quest_garden_sprout` + répétable) : révéler un
  jardin caché (Revelio/fouille) puis cueillir des herbes. 💡 La patience
  poufsoufflienne récompensée.

---

## 8.3 Grands arcs / sous-intrigues (✅ — fiches détaillées)

### Le grimoire de givre d'Élara — *arc Manon* (3 actes)
- **Donneur / lieu :** ✅ **Manon**, élève cachée à l'étage 3
  ([06](06-pnj-et-factions.md)).
- **Accroche narrative :** 💡 Manon cherche son père. Sa mère, **Élara**,
  morte, lui a laissé un grimoire de givre déchiré. Arc de **deuil et de
  mémoire** qui contraste avec la menace montante ([03 §3.3](03-trame-principale.md)).
- **Étapes / rebondissements :** ✅
  - **Acte I** — *L'inconnue du 3ᵉ étage* (`manon_secret` → `manon_pardon`) :
    confirmer que Lupin existe (atteindre ét. 4), puis lui apporter le
    chocolat « qu'il offre à tous, sauf à elle ». 💡 Révélation : Manon est la
    fille cachée de Lupin.
  - **Acte II** — *le grimoire* (`manon_revelio` → `manon_grimoire`) :
    apprendre **Revelio** (tuer un Strangulot), puis dévoiler et réunir les **5
    pages** dispersées (étages 2, 3, 5, 7, 9). Récompense : `livre_glacius_tempete`.
  - **Acte III** — *les feuillets clairs* (`manon_acte3`, easter egg
    émotionnel) : ✅ `implicitAccept` — l'arc s'ouvre **sans bouton**, à la
    découverte du 1ᵉʳ feuillet. 💡 Élara n'avait pas caché que des secrets :
    aussi de la **joie** (sorts de givre heureux pour sa fille). Récompense
    surtout **narrative** (passif « Hiver Clair »).
- **Liens :** Lupin, Revelio, Strangulot ; incarne le thème « le choix plutôt
  que le don » ([03 §3.7](03-trame-principale.md)).

### L'Épreuve de la Lumière Éternelle — *Lux Aeterna*
- **Donneur / lieu :** ✅ **Portrait d'Albus Dumbledore** — Galerie des
  portraits (ét. 6).
- **Accroche :** 💡 le portrait garde le grimoire scellé de **Lux Aeterna**.
  Pour le mériter : prouver qu'on porte une lumière intérieure.
- **Étapes :** ✅ épreuve en **3 temps** combinés — réunir 3 **Éclats de
  Lumière** (sur les morts-vivants), résoudre les **énigmes** du portrait (QCM,
  type `riddle`), puis vaincre le **Bibliothécaire d'Ombre** (`Lux Aeterna`).
  Prérequis : avoir terminé *L'Anneau de la Résurrection* (`anneau_dumbledore`).
- **Récompense :** ✅ 600 XP, 250 G, **`livre_lux_aeterna`**. 💡 La lumière
  comme arme contre les ténèbres — écho au Patronus.
- **Liens :** thème « le souvenir heureux contre les ténèbres »
  ([03 §3.7](03-trame-principale.md)) ; morts-vivants du bestiaire
  ([09](09-bestiaire-et-lore.md)).

### La Chasse Sans Tête — *easter egg comique*
- **Donneur / lieu :** ✅ **Sir Patrick Delaney-Podmore** (fantôme, ét. 6).
- **Accroche :** 💡 clin d'œil canon : un fantôme à la tête mal tranchée se voit
  refuser la **Chasse Sans Tête**. Il faut prouver qu'un revenant sait encore
  chasser.
- **Objectif :** ✅ terrasser 2 `chevalier_fantome` restés casqués.
- **Récompense :** ✅ 260 XP, 120 G + **flag cosmétique** `headlessHuntMember`
  (membre d'honneur). 💡 Aucun levier de combat — récompense de **prestige
  social**.
- **Liens :** Sir Nicolas / Nick Quasi-Sans-Tête ([06](06-pnj-et-factions.md)).

### Quêtes de purge — *Gardien de la Boucle* (endgame répétable)
- **Donneur / lieu :** ✅ **Gardien de la Boucle** (PNJ exclusif post-victoire,
  ét. 11+, Boucle Ténébreuse).
- **Accroche :** 💡 la Boucle reforme sans cesse ses horreurs ; chaque purge
  « soulage le palier ». Boucle de farm matériaux Forge & Bibliothèque.
- **Objectifs :** ✅ tuer 2× un boss Ténébreux — `purge_loups` (Greyback),
  `purge_acromantules` (Aragog), `purge_mangemorts` (Dolohov). Répétables
  (`everyLevels: 2`), récompense réduite sur re-runs.
- **Récompense :** ✅ XP/or + **Essence des Ténèbres** / **Page de Grimoire**
  (matières premières endgame). 💡 Le prix de l'éternel recommencement.
- **Liens :** [03 §3.6](03-trame-principale.md) ; boss canon ét. 8-10 recyclés
  en variantes Ténébreuses aux étages 18-20.

### Quêtes de Maison (✅ — réservées à la Maison choisie)
- **Quête de set** ✅ (`quest_set_*`, débloquée au palier 12) : donnée par le
  **chef de Maison**, livre la **4ᵉ pièce** du set ([07](07-les-maisons.md)).
  Ex. *L'épreuve du Lion* (McGonagall, 3× Chimère → Cœur du Lion).
- **Quête de don** ✅ (`quest_don_*`, débloquée au palier **Mythe**) : objectif
  `donate` 3000 G → 1200 XP + **Félix Felicis**. 💡 La générosité comme vertu
  finale, gold-sink de prestige.

---

## 8.4 Easter eggs narratifs (✅ évoqués dans le code — `💡` mise en scène)

> 💡 Liste de clins d'œil canon ; certains existent en flags, d'autres restent
> à câbler. À détailler en sous-fichiers si le contenu grossit.

- **Les Reliques de la Mort** 💡 — Baguette de Sureau, Pierre de Résurrection,
  Cape d'Invisibilité disséminées dans le jeu. Pistes ✅ déjà présentes :
  `wand2` (Sureau), `cape_invis`, et l'**Anneau de la Résurrection**
  (`anneau_resurrection`, récompense de `anneau_dumbledore`). 💡 Réunir les
  trois → clin d'œil / titre cosmétique.
  > ❓ À arbitrer : en faire un **méta-objectif traçable** (les rassembler
  > débloque une scène/un titre) ou laisser ces objets comme **simples
  > références** au fil du loot ?
- **La Salle sur Demande** 💡 — salle secrète qui n'apparaît qu'à qui en a
  besoin ; candidate idéale pour un **secret de fouille** (Revelio / mur secret,
  cf. [10](10-lieux-et-geographie.md)).
- **La libération d'un elfe de maison** 💡 — clin d'œil à Dobby : offrir un
  vêtement à un **Elfe de Maison Rebelle** ([09](09-bestiaire-et-lore.md))
  plutôt que le combattre → le libère (récompense cosmétique / lore).
- **Membre de la Chasse Sans Tête** ✅ — flag `headlessHuntMember` (cf. §8.3).
- **Bénédiction de Dumbledore / larmes de Fumseck** ✅ — actions spéciales de
  PNJ (soin, larmes-amulette).

---

## 8.5 Récapitulatif express (pour briefer Gemini)
> La descente EST la quête principale ; les quêtes sont des **escortes**
> (chaîne Dumbledore), de la **saveur/loot** (PNJ d'étage), des **arcs
> émotionnels** autonomes (Manon/Élara, Lux Aeterna), des **réservées à la
> Maison** (set au palier 12, don au palier Mythe), et du **farm endgame**
> (purges du Gardien). Easter eggs canon : Reliques de la Mort, Salle sur
> Demande, libération d'elfe, Chasse Sans Tête.
