# 08 — Quêtes & sous-intrigues

**Statut :** 🟩 proposition de référence — à valider / amender

> 📊 **Statut réel (code)** : ✅ quêtes (principales/répétables), signatures &
> concoction livrées — modules : `js/quests-templates.js`, `js/quests.js`,
> `js/quests-riddles.js`, `js/potions.js`.
> Cf. [index doc ↔ module](../README.md#index-doc--module--statut-réel).

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

## 8.0 La quête principale — refermer la Clé de Voûte

> 🎯 **La descente EST la quête principale.** ✅ (tranché par le jeu) /
> 💡 (mise en scène). Détail du déclencheur en [03 §3.1](03-trame-principale.md),
> structure étages↔actes en [04](04-structure-actes-et-etages.md).

Tout part de la **Clé de Voûte des Quatre** fêlée en plein cours d'Histoire de la
Magie : le verrou que les Fondateurs avaient posé sur les Profondeurs se craquèle,
le **froid surnaturel** monte, les **grands escaliers basculent vers le bas**, un
portrait hurle sans fin. Le **portrait de Dumbledore** dit l'essentiel : *on ne
rescelle pas d'en haut*. Il faut **descendre à contre-courant** jusqu'à la source —
et la corruption recule devant qui n'a pas peur de descendre.

### La colonne vertébrale (✅ verrou dur unique)
```
Intro (Clé de Voûte) → Maison → DESCENDRE étage par étage
   → Acte I  (1-3)  le familier se fissure
   → Acte II (4-6)  les cachots ; Voldemort se reconstitue au fond
   → Acte III(7-10) les Profondeurs ; boss canon gardent la route
   → CLIMAX  (10)   Voldemort Ressuscité → victoryAchieved
   → Acte IV (11+)  la Boucle Ténébreuse (post-game)
```
> ✅ **Seul vrai verrou de progression** : la victoire sur `voldemort_revenu`
> (étage 10) ouvre l'escalier scellé (`victoryAchieved`). **Aucune quête** — pas
> même la chaîne Dumbledore — ne conditionne `goDeeper()`. Toute la suite (§8.2+)
> est du **contenu optionnel** greffé sur cette colonne.

### L'escorte narrative de la trame (✅ — chaîne Dumbledore)
La quête principale n'a pas de « journal » unique : elle se **vit** en descendant,
et le portrait de Dumbledore l'**escorte** via une chaîne optionnelle qui en
verbalise chaque palier (fiche complète en [§8.2](#82-quêtes-de-départ--jalons---fiches)) :

| Maillon ✅ | Beat de trame 💡 | Cible |
|-----------|-------------------|-------|
| `intro_tutoriel` | « Descends d'un étage. Le sceau t'attend plus bas. » | atteindre ét. 2 |
| `dumbledore_eveil` | affronter sa **peur** (le sceau est tenu par la peur) | `boggart` |
| `dumbledore_courage` | la bravoure face aux **fidèles** du retour | 2× `mangemort` |
| `dumbledore_resistance` | l'**élite** garde la route de la source | `mangemort_elite` |
| `dumbledore_revelation` | l'**ombre** avant le maître | `bellatrix` |
| **Climax** ✅ | la chute de Voldemort scelle l'arc | `voldemort_revenu` |

> 💡 **Lecture** : la chaîne Dumbledore est le *commentaire audio* de la quête
> principale — elle dit tout haut ce que la descente fait tout bas. La **Quête
> Signature** de la Maison (§8.5) s'y superpose comme une *voix de plus*, propre
> au `chosenHouse`. Le **fil rouge** (Éclats & voix des Fondateurs, §8.6) en est
> la **basse continue** : le *pourquoi* derrière le *comment*.

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

### Quête principale « La Descente » *(`descente_1` → `_2` → `_3` → `_finale`)* ✅
- **Nature :** fil d'Ariane de la colonne vertébrale (Lot 1 revue 2026-07) —
  4 étapes trackées (`floor` 4 → 7 → 10 → `kill voldemort_revenu`), flag
  `main` (épinglée 🧭 en tête du tracker), **auto-acceptée** à la fin de
  l'intro et **auto-remise** (`autoTurnIn`) : la remise EST la descente,
  aucun retour PNJ. Chaîne pilotée par `_ensureMainQuestProgress`
  (`quests.js`) — un save avancé rattrape automatiquement son étape.
- **Garde-fou :** **non-gating** — le seul verrou de la descente reste
  `victoryAchieved` ([04 §4.7](04-structure-actes-et-etages.md)) ; récompenses
  légères (xp/or). Post-victoire, la chaîne s'efface au profit de la
  **boussole d'endgame**.

### Chaîne de Dumbledore *(`dumbledore_eveil` → `_courage` → `_resistance` → `_revelation`)*
- **Donneur / lieu :** ✅ Dumbledore (Hall, ét. 1), cibles en profondeur.
  ✅ **Portraits-relais** (Lot 1) : trois cadres-relais aux étages **4/7/10**
  (`dumbledore_relais_{4,7,10}`, `npcs-a.js`) acceptent ET remettent toute la
  chaîne + les Éclats — le fil suit la descente, plus de backtracking forcé.
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
  - **Capstone** — *Clair de Lune* (`manon_clair_de_lune`, prereq
    `manon_acte3`) : ✅ après la mère (le givre), l'arc culmine sur le
    **père** — disperser 2 Détraqueurs « en son nom », et recevoir le livre
    que Lupin achève : **« Clair de Lune »**, le Livre de Maîtrise de la
    **Lumière** (`livre_lumiere_patronus`). 💡 C'est l'un des **6 Livres de
    Maîtrise élémentaire** (`type:"masterybook"`, +12 % permanent de dégâts
    de l'élément, groupe entier) — les 5 autres se prennent sur les grands
    boss (Magyar/feu, Spectre de Givre/glace, Héraut de l'Orage/foudre,
    Héraut des Ténèbres/ténèbres, Greyback/physique). Collection cosmétique
    cross-run « Bibliothèque des Maîtrises » au Codex du Sorcier (profil,
    zéro héritage de puissance).
  - **Épilogues** (side-quests de liens, P6a) : ✅ *La lettre jamais
    envoyée* (`lettre_jamais_envoyee`, prereq capstone) — première
    **livraison inter-PNJ** : Manon confie la dernière lettre d'Élara, la
    remise se fait chez **Lupin**, qui la lit (clôture épistolaire du
    triangle) ; *L'aconit de la meute* (`aconit_de_la_meute`, Lupin,
    prereq `manon_pardon`) — le père brasse la Tue-Loup au grand jour,
    devant sa fille. En Boucle : `manon_confier` → `memoire_lockhart`
    (l'histoire d'Élara enfin écrite) et `manon_compagnie` (répétable).
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

## 8.5 Quêtes Signature par Maison (proposition d'extension)

> 💡 (proposition de référence) — identité narrative en
> [07 §7.8](07-les-maisons.md) ; variations de trame en
> [03 §3.8](03-trame-principale.md).
>
> **Différence avec les quêtes de Maison existantes (§8.3).** Le **set@12** et le
> **don@Mythe** habillent la *fin* de la voie (prestige). La **Signature** se joue
> **pendant la descente** (Actes I→III), gatée par `chosenHouse` **+ l'étage**
> (pas par le prestige). Elle est **optionnelle** (ne gate jamais l'escalier — §8.1)
> mais infuse la trame : dialogue de Dumbledore, événement d'étage, récompense
> exclusive, **réplique + modificateur one-shot avant Voldemort**, écho mineur en
> Boucle. Objectif : *80-90 % de trame commune*, variation **perceptible mais
> légère**.

### 🦁 Gryffondor — *L'Étendard de Godric*
- **Thème central :** leadership, combats frontaux, sacrifice fidèle.
- **Résumé 💡 :** la fêlure de la Clé de Voûte éteint le **courage** autant que les
  escaliers. Un **Chevalier Fantôme** — Gryffondor tombé en défendant le château,
  « de garde depuis parce que personne ne lui a dit qu'il pouvait partir » —
  confie au héros l'**Étendard de Godric**, la bannière qui ne s'incline jamais.
  Rallumer le courage des égarés, reprendre l'Étendard, apprendre qu'être un
  meneur, c'est **passer devant pour que les autres passent**.
- **Déclencheur :** ✅ Acte I, étage 2-3 — le `chevalier_fantome` (déjà au
  bestiaire) en variante **PNJ non-hostile**, ou **McGonagall**. Condition :
  `chosenHouse === 'Gryffondor'`.
- **Objectif principal 💡 :** reprendre l'Étendard au **Porte-Étendard Déchu**
  (mini-boss, Acte III) — `kill`.
- **Objectifs secondaires 💡 :**
  1. Rallumer **3 brasiers du courage** éteints par le givre (Actes I-II) —
     fouille / `item`-proxy.
  2. **Tenir bon** : remporter un combat en infériorité **sans fuir** (`kill` à
     contrainte — drapeau « pas de fuite » sur la rencontre).
- **Influence sur la trame :**
  - *Dialogues* 💡 : le portrait de Dumbledore salue la bravoure (« Le château a
    entendu ton pas ne pas reculer ») ; le Chevalier commente chaque étage.
  - *Événements clés* 💡 : chaque brasier rallumé fait reprendre courage à des
    élèves terrés → toast + **buff de groupe « Élan du Lion »** (cosmétique +
    petit +ATK transient au combat suivant).
  - *Récompense unique* 💡 : la **Bannière de Godric** (relique `trinket` :
    atténue/immunise partiellement le statut `fear` pour le groupe tant que
    PV > seuil) **+ révélation lore** (le Chevalier était le frère d'armes d'un
    Fondateur). Remise **cérémonielle** via `pendingHouseRewards`.
  - *Conséquence Acte III / Voldemort* 💡 : flag `gryffSignatureDone` → réplique
    unique de Dumbledore avant le combat **et** l'Étendard « planté » **neutralise
    la phase terreur** de `voldemort_revenu` (la peur à 25 % PV — cf.
    [03 §3.5](03-trame-principale.md)). Levier léger, perceptible.
  - *Boucle Ténébreuse* 💡 : la Bannière revient **déchirée** ; rallumer un dernier
    brasier dans les Ruines réveille l'écho du Chevalier (cosmétique + lore).
- **💡 Hooks émotionnels :** le sacrifice comme **fidélité**, pas comme drame ; le
  Chevalier qui n'attendait qu'« la permission de se reposer ».
- **✅ À conserver :** `chevalier_fantome` (bestiaire) ; set du Lion + Cœur du Lion
  (`quest_set_gryff`) ; Patronus Maxima (dissipe `fear`, Mythe) ; passif Élan.
- **❓ À valider avec le dev :** aucun **allié combattant** n'existe (cf.
  [03 §3.5](03-trame-principale.md)) → le Chevalier reste **donneur/mémoire**.
  Neutraliser une phase de Voldemort = hook dans `_checkBossPhases` gardé par flag.

### 🐍 Serpentard — *Le Pacte des Cachots*
- **Thème central :** secrets des Fondateurs, choix moraux gris, trahison,
  raccourcis dangereux.
- **Résumé 💡 :** sous les cachots, l'**écho de Salazar** murmure — scellé *avec* la
  corruption qu'il a aidé à enfermer (révélation : les Fondateurs ont aussi scellé
  une **part d'eux-mêmes**). Il propose un **pacte** : ouvrir ses passages secrets
  (raccourcis), offrir une puissance interdite, contre de petites trahisons.
  L'écho n'est pas un démon : c'est un Fondateur qui, mille ans plus tôt, a fait le
  **même choix** que le héros affronte. Un miroir.
- **Déclencheur :** 💡 Acte II, étage 4 — voix de l'écho (stèle/passage scellé), ou
  **Rogue** qui « met en garde » tout en montrant le chemin. Condition :
  `chosenHouse === 'Serpentard'`.
- **Objectif principal 💡 :** percer la **vérité de l'écho** (révélation lore sur la
  Clé de Voûte, vue côté Fondateurs).
- **Objectifs secondaires 💡 (choix gris) :**
  1. Ouvrir un **passage secret de Salazar** (fouille / énigme) : raccourci qui
     fait gagner un demi-étage **mais** déclenche une embuscade renforcée.
  2. **Choix moral** : trahir un secret d'un PNJ naïf (ex. un marchand, ou un
     feuillet de Manon) pour un objet, **OU** refuser et garder l'estime.
  3. Récupérer un **secret des Fondateurs** (item lore) gardé par un `basilic`.
- **Influence sur la trame :**
  - *Dialogues* 💡 : Dumbledore plus **méfiant** envers un Serpentard qui a pactisé
    (« Le pouvoir t'écoute. Veille à rester celui qui parle ») ; Rogue respecte la
    maîtrise, méprise la **dépendance** au raccourci.
  - *Événements clés* 💡 : les raccourcis = **transitions d'étage alternatives**
    (risque/récompense) ; le choix de trahison ouvre/ferme des micro-contenus.
  - *Récompense unique* 💡 : **Sectumsempra Imperius** anticipé **ou** objet
    « Langue-de-plomb » (MAG + lifesteal) **+ révélation** : ce que Voldemort
    cherche au fond est ce que **Salazar a scellé**.
  - *Conséquence Acte III / Voldemort* 💡 : flag `slythSignatureDone` +
    `slythPactChoice ∈ {pact, defiance}`. **Pacte** → Voldemort *reconnaît* le héros
    (« Nous nous ressemblons ») : réplique unique + bonus de lifesteal au combat,
    mais Dumbledore **plus froid** à la victoire. **Défiance** → le héros a retourné
    le secret de Salazar : léger **debuff** sur le boss (il « connaît » la trahison).
  - *Boucle Ténébreuse* 💡 : l'écho revient, sachant le héros devenu mythe, et
    propose un **dernier pacte** (variante cosmétique/lore) ; les raccourcis
    deviennent permanents.
- **💡 Hooks émotionnels :** l'ambivalence ; le Fondateur-miroir ; « tu n'es pas
  tenté par le mal — tu es tenté par la **facilité** ».
- **✅ À conserver :** set du Serpent + Couronne du Basilic (`quest_set_slyth`) ;
  Soif du Serpent (Apothéose) ; Sectumsempra (Mythe) ; arcs Drago/Maxence (miroir
  mangemort, [05](05-personnages-jouables.md)).
- **❓ À valider :** raccourcis = transitions alternatives → **dev** movement/dungeon ;
  choix moral persistant → nouveau flag sérialisé ; modif combat Voldemort par
  sous-flag.

### 🦅 Serdaigle — *Le Codex de Rowena*
- **Thème central :** savoir ancien, énigmes, exploration, faille révélée.
- **Résumé 💡 :** le Serdaigle voit une **question mal posée**, pas une catastrophe.
  En recoupant les **stèles d'énigme** des Fondateurs, il reconstitue le **Codex de
  Rowena** — le traité perdu décrivant *ce que la Clé scellait vraiment*. Comprendre
  révèle une **faille** dans la corruption, donc dans Voldemort. Rowena l'a écrit
  *en sachant qu'elle mourrait avant de le finir* : le savoir comme **legs**.
- **Déclencheur :** ✅ Acte I/II — **Flitwick**, ou la **stèle** des Fondateurs
  (`r_clef_voute` existe déjà — [03 §3.1](03-trame-principale.md)). Condition :
  `chosenHouse === 'Serdaigle'`.
- **Objectif principal 💡 :** reconstituer le Codex en résolvant les **stèles**
  (objectif `riddle` — ✅ déjà supporté).
- **Objectifs secondaires 💡 :**
  1. Résoudre **3-4 énigmes de stèle** réparties par tranche (`riddle`).
  2. Récupérer des **feuillets du Codex** (objectif `pages` — ✅ déjà supporté,
     modèle grimoire d'Élara).
  3. Cartographier un **secret de fouille** (Salle sur Demande / mur secret via
     Revelio — §8.4) — exploration.
- **Influence sur la trame :**
  - *Dialogues* 💡 : Dumbledore traite le Serdaigle en **pair intellectuel** (« Tu
    as compris ce que même les professeurs n'osent nommer ») ; Flitwick s'enthousiasme.
  - *Événements clés* 💡 : chaque feuillet décodé révèle une **anecdote lore** (renvoi
    [02 §2.2](02-univers-ton-et-canon.md)) ; l'avant-dernier *nomme* la corruption
    pré-Fondateurs (déjà actée en [03 §3.3](03-trame-principale.md)).
  - *Récompense unique* 💡 : **Legilimens** anticipé **ou** **Codex de Rowena**
    (objet : révèle automatiquement resist/weak ennemis, ou réduit le coût) **+
    révélation de la faille de Voldemort**.
  - *Conséquence Acte III / Voldemort* 💡 : flag `ravenSignatureDone` → au combat
    final, les **résistances/faiblesses de Voldemort sont révélées** (bestiaire
    pré-rempli) et/ou un sort exploite une **weak cachée** (dégât bonus one-shot).
    Dumbledore confie une dernière clé de lecture avant le combat.
  - *Boucle Ténébreuse* 💡 : le Codex gagne des **pages ténébreuses** ; une énigme
    finale dans les **Ruines Anciennes** (tranche D runique — [03 §3.6](03-trame-principale.md))
    livre un lore endgame (variante mineure).
- **💡 Hooks émotionnels :** le savoir comme **legs posthume** ; lire ce qu'une morte
  a laissé pour qu'on ne refasse pas son erreur (écho Cho/Olivier/Céleste).
- **✅ À conserver :** stèles `riddle` + `r_clef_voute` ; objectif `pages` (Manon) ;
  Lux Aeterna (énigmes QCM, §8.3) ; set de l'Aigle + Anneau du Savoir ; Legilimens (Mythe).
- **❓ À valider :** « révéler resist/weak au combat final » = hook léger côté
  battle/bestiary ; énigmes supplémentaires = nouvelles entrées `RIDDLES`.

### 🦡 Poufsouffle — *Ceux qu'on ne laisse pas derrière*
- **Thème central :** loyauté, protection des plus faibles, travail d'équipe,
  résilience.
- **Résumé 💡 :** quand le château bascule, tous regardent vers le bas — vers la
  menace. Le Poufsouffle regarde **autour** : combien sont restés coincés ?
  **Chourave** confie une mission que nul ne juge prioritaire : ramener les
  **égarés**, bâtir le **Refuge du Blaireau**, tenir bon pour que personne ne soit
  oublié au fond. La résilience comme héroïsme **discret** : avancer sûrement, et
  ensemble.
- **Déclencheur :** 💡 Acte I, étage 2 — **Chourave** (chef de Poufsouffle).
  Condition : `chosenHouse === 'Poufsouffle'`.
- **Objectif principal 💡 :** établir et **protéger** le Refuge du Blaireau (salle
  sûre) en y ramenant les égarés.
- **Objectifs secondaires 💡 :**
  1. **Secourir 3 égarés** dispersés (élève, **elfe** — clin d'œil à la libération
     d'elfe, §8.4) — `item`/`floor`-proxy (les ramener au refuge).
  2. **Défendre** le refuge : repousser une vague qui menace les rescapés (`kill`).
  3. Apporter **vivres/herbes** pour soigner les blessés (objectif `herb` — ✅
     supporté, lien jardins de Chourave §8.2).
- **Influence sur la trame :**
  - *Dialogues* 💡 : Dumbledore salue ce que **personne d'autre ne voit** (« On
    comptera les vies que tu as sauvées, pas les monstres ») ; les rescapés
    remercient nommément.
  - *Événements clés* 💡 : le Refuge devient un **point de repos/soin récurrent**
    (parent de la fontaine) tant qu'on le protège ; les égarés sauvés réapparaissent
    plus bas en **petits donneurs de bonus** (potion offerte).
  - *Récompense unique* 💡 : **allié-soutien** (l'elfe libéré → buff passif de
    groupe) **ou** **Médaillon de Helga** anticipé / objet de résilience (regen)
    **+ révélation** : le premier Refuge de Poudlard fut creusé par Helga pour les
    réfugiés.
  - *Conséquence Acte III / Voldemort* 💡 : flag `poufSignatureDone` → les rescapés
    **envoient de l'aide** avant le combat final (buff de départ « Espoir partagé » :
    +PV max transient / regen). Dumbledore : « Tu n'es pas descendu seul, même si tu
    étais seul à descendre. » Un **filet de sécurité**, pas un avantage offensif.
  - *Boucle Ténébreuse* 💡 : le Refuge doit être **rétabli** dans le château
    corrompu ; protéger les échos des rescapés = variante de purge « bienveillante »
    (cosmétique + petit buff durable).
- **💡 Hooks émotionnels :** l'elfe sauvé qui refuse de partir (« là où on l'a traité
  comme quelqu'un, il reste » — écho Dobby) ; sauver un nom, pas un PV.
- **✅ À conserver :** jardins de Chourave (`herb`, `discover_garden`) ; libération
  d'elfe (§8.4) ; set du Blaireau + Médaillon de Helga ; Souffle du Blaireau
  (Apothéose) ; Récolte Magique (Mythe).
- **❓ À valider :** **escorte / vague défensive / refuge-repos** = objectifs neufs à
  concevoir (dev) ; allié-buff passif = flag sérialisé ; refuge comme point de repos
  = lien avec la fontaine.

### 8.5.1 Table de synthèse des 4 Quêtes Signature

| Maison | Quête | Déclencheur | Objectif cœur | Récompense unique 💡 | Levier finale Voldemort 💡 | Flag |
|--------|-------|-------------|---------------|----------------------|----------------------------|------|
| 🦁 Gryffondor | L'Étendard de Godric | Acte I, ét. 2-3 (Chevalier Fantôme / McGonagall) | reprendre l'Étendard (kill mini-boss) | Bannière de Godric (anti-`fear`) | neutralise la phase terreur | `gryffSignatureDone` |
| 🐍 Serpentard | Le Pacte des Cachots | Acte II, ét. 4 (écho de Salazar / Rogue) | percer la vérité de l'écho (choix gris) | Langue-de-plomb / Sectumsempra anticipé | reconnaissance + lifesteal **ou** debuff (selon choix) | `slythSignatureDone` + `slythPactChoice` |
| 🦅 Serdaigle | Le Codex de Rowena | Acte I/II (stèles / Flitwick) | reconstituer le Codex (riddle + pages) | Codex de Rowena (révèle resist/weak) | faiblesses révélées + weak one-shot | `ravenSignatureDone` |
| 🦡 Poufsouffle | Ceux qu'on ne laisse pas derrière | Acte I, ét. 2 (Chourave) | bâtir/protéger le Refuge (escorte + herb) | allié-soutien / Médaillon anticipé | buff de départ « Espoir partagé » | `poufSignatureDone` |

### 8.5.2 Conseils d'intégration technique (cadrage dev)

> 💡 Recommandations pour câbler les signatures **en réutilisant l'existant**,
> conformément au principe « pas de feature neuve si un type d'objectif suffit ».

- **Templates** : 4 entrées `quest_signature_<gryff|slyth|raven|pouf>` dans
  `QUEST_TEMPLATES` (`js/quests-templates.js`), avec `houseSignatureQuest: true`,
  `house: <nom>`, et `prereq` pour chaîner les étapes (modèle chaîne `dumbledore_*`).
  Les beats de **découverte** utilisent `implicitAccept` (modèle `manon_acte3`).
- **Déverrouillage** : à la différence du set (`unlockHouseQuest`, palier 12) et du
  don (`unlockHouseMytheQuest`, Mythe), gater par **`chosenHouse` + étage** —
  ajouter `unlockHouseSignatureQuest(house)`, appelé au franchissement de l'étage
  déclencheur (modèle des `availableQuests` keyés sur le donneur/étage).
- **Objectifs = types existants** : `kill`, `item`, `floor`, `riddle`, `pages`,
  `herb`, `discover_garden` couvrent **80 %** des besoins. Seuls restent à concevoir
  (❓) : la rencontre « sans fuite » (Gryffondor), les **raccourcis** (Serpentard,
  dev movement/dungeon), l'**escorte/vague** et le **refuge-repos** (Poufsouffle).
- **Flags & source de vérité** : ajouter `<house>SignatureDone` (booléen) +
  `slythPactChoice` au `_serializeState`/`_applyState` (`js/save.js`). **Ne pas**
  créer de flag redondant avec `chosenHouse`/`houseTier` (cf. CLAUDE.md). Modèle des
  passifs flaggés : « Hiver Clair » (Manon) et `headlessHuntMember` (cosmétique).
- **Dialogues conditionnels** : réutiliser la couche **`dialoguesByHouse`** (✅
  `npcs.js` + `npc-dialog.js`) pour Dumbledore et les chefs ; la réplique pré-Voldemort
  est un override lu sur `<house>SignatureDone`.
- **Récompenses** : item exclusif via **`pendingHouseRewards`** (remise cérémonielle,
  comme la 4ᵉ pièce de set) ; sort via le pipeline d'apprentissage ; allié/buff via
  flag passif sérialisé.
- **Levier finale Voldemort (LÉGER)** : hook one-shot dans `startBattle` /
  `_checkBossPhases` pour `voldemort_revenu`, gardé par le flag — quelques lignes,
  pas une branche. Réplique = pur dialogue (peu coûteux).
- **Tests** : 1 scénario smoke par Maison (`scenarioHouseSignature<House>`) —
  démarrer avec `chosenHouse`, atteindre le déclencheur, asserter la quête
  disponible→acceptable→remettable, le flag posé, la réplique pré-Voldemort présente
  (réutiliser `tests/lib/harness.js`).

### 8.5.3 Cohérence en duo (deux Maisons ?)

> ⚠️ **Fait moteur** : `chosenHouse` est **unique par partie** (`js/state.js`), pas
> par héros. Les héros portent une Maison **canon** (Harry → Gryffondor, etc.) à
> titre de saveur ([05 §5.0](05-personnages-jouables.md)), mais tout le système de
> Maison (bonus, set, prestige, signatures) suit l'**unique** `chosenHouse`.

- **Recommandation 💡 :** garder **une seule** Quête Signature active par partie
  (celle du `chosenHouse`). C'est déjà le modèle de tout le contenu de Maison —
  cohérent, zéro fragmentation.
- **Récompense de rejouabilité 💡 :** le 2ᵉ héros, dont la Maison **canon** diffère
  du `chosenHouse`, peut lâcher des **barks de saveur** qui commentent la tension
  (un héros Gryffondor-canon réagit au Pacte sur une partie Serpentard). Pur flavor,
  zéro mécanique — récompense les joueurs qui **refont** le jeu avec une autre Maison.
- **Vrai « deux Maisons simultanées » 💡 :** nécessiterait un **refactor** (
  `chosenHouse`/`housePoints`/`houseTier` **par personnage**, deux pistes de prestige,
  doublement des remises). **❓ Hors-scope** proposé — coût élevé pour un bénéfice de
  niche ; à arbitrer si un mode « rivalité de Maisons » est désiré un jour.

---

## 8.6 Fil rouge narratif — Éclats, voix des Fondateurs & révélation progressive

> 💡 (mise en scène) / ✅ (ancrages code). Le fil rouge est la **basse continue**
> de la trame ([§8.0](#80-la-quête-principale--refermer-la-clé-de-voûte)) : il ne
> gate rien, mais récompense qui *écoute* le château en répondant à la question
> « **qu'est-ce que la Clé scellait, au juste ?** ».

### 8.6.1 Les Éclats de la Clé de Voûte (✅ `eclats_clef_voute`)
- **Donneur :** ✅ Dumbledore (hors-chaîne, optionnel). **Objectif :** collecter
  **3 `eclat_voute`** en descendant — ✅ **drop garanti** sur un **monstre-jalon
  par tranche** : Peeves (1-3), Loup-Garou (4-6), Mangemort d'Élite (7-10).
- **Sens 💡 :** chaque éclat est un fragment du *verrou* — le ramasser, c'est tenir
  un morceau de ce que les Fondateurs ont craint. Les **3 tranches** d'éclats
  épousent les **3 actes** : le fil rouge se reconstitue au rythme de la descente.
- **Remise 💡 :** révèle la **double trame** ([03 §3.3](03-trame-principale.md)) — la
  Clé scellait (a) une **corruption pré-Poudlard**, plus vieille que les Fondateurs,
  **et** (b) tout au fond, **Voldemort** qui se nourrit de la fêlure pour se reformer.

### 8.6.2 Les voix des Fondateurs (révélation distribuée)
> 💡 Le lore des Fondateurs n'est jamais asséné : il **fuite** par quatre canaux,
> chacun adressé à une sensibilité différente. C'est le cœur du fil rouge.

| Canal | Porte d'entrée ✅ | Ce qu'il révèle 💡 |
|-------|-------------------|---------------------|
| **La stèle de la Clé** | `r_clef_voute` (devinette de stèle) | Ce que les Quatre ont scellé *ensemble* — le pacte fondateur. |
| **L'écho de Salazar** | 🐍 *Pacte des Cachots* (§8.5) | Les Fondateurs ont scellé **une part d'eux-mêmes** avec le mal ; la tentation est un **miroir**, pas un démon. |
| **Le Codex de Rowena** | 🦅 *Codex de Rowena* (§8.5) | Le traité perdu décrivant la **faille** de la corruption — le savoir comme **legs posthume**. |
| **Le portrait de Dumbledore** | chaîne `dumbledore_*` + Lux Aeterna (§8.3) | Le **sens** (la peur comme sceau ; le souvenir heureux comme arme). |

> 💡 **Convergence** : Gryffondor (l'Étendard) et Poufsouffle (le Refuge) répondent
> au fil rouge par l'**acte** (rallier, protéger), Serpentard et Serdaigle par la
> **connaissance** (pacte-miroir, Codex). Les quatre disent la même vérité sous
> quatre angles — fidèle au thème *« quatre façons de vivre la même descente »*
> ([07 §7.9](07-les-maisons.md)).

### 8.6.3 Courbe de révélation progressive 💡
```
Acte I  (1-3)  Symptôme   : le froid, les escaliers, le portrait qui hurle.
                            → « quelque chose s'est brisé. »  (1ᵉʳ éclat)
Acte II (4-6)  Origine    : mangemorts + écho de Salazar.
                            → « ce n'est pas qu'un accident : on l'attise. »  (2ᵉ éclat)
Acte III(7-10) Vérité     : Codex / stèle nomment la corruption pré-Fondateurs.
                            → « le verrou cachait deux choses, pas une. »  (3ᵉ éclat)
Climax  (10)   Confrontation : Voldemort, pointe émergée du mal scellé.
Boucle  (11+)  Revers     : refermer a OUVERT — le mythe attire le plus profond.
```
> ✅ **Garde-fou** : aucune étape du fil rouge ne **bloque** la descente. Un joueur
> peut foncer au climax sans un seul éclat ; le fil rouge **enrichit** le *pourquoi*,
> il ne le **conditionne** jamais (cohérent §8.0 / [03 §3.6](03-trame-principale.md)).

---

## 8.7 Structure par acte — synthèse quêtes ↔ étages

> Vue d'ensemble pour caler le contenu sur le rythme de [04](04-structure-actes-et-etages.md).
> ✅ acté / 💡 proposition. Greffe Signature selon `chosenHouse` ([§8.5](#85-quêtes-signature-par-maison-proposition-dextension)).

| Acte / tranche | Trame principale ✅ | Secondaires & arcs ✅ | Greffe Signature 💡 | Fil rouge |
|----------------|---------------------|------------------------|----------------------|-----------|
| **I — L'École** (1-3, A) | `intro_tutoriel` ; `dumbledore_eveil` (peur) | Pomfresh (mandragore), Mimi (troll), Lockhart (livre), Hagrid (chouette) ; amorce Manon (ét. 3) | 🦁 Étendard s'ouvre · 🦡 Refuge s'ouvre · 🦅 1ʳᵉ stèle | **1ᵉʳ éclat** (Peeves) |
| **II — La Descente** (4-6, B) | `dumbledore_courage`/`_resistance` (mangemorts) | Manon Acte II (Revelio, 5 pages) ; Lupin (Patronum) ; Slughorn (potions) | 🐍 Pacte des Cachots s'ouvre · brasiers du Lion · feuillets du Codex | **2ᵉ éclat** (Loup-Garou) ; écho de Salazar |
| **III — Les Profondeurs** (7-10, C) | `dumbledore_revelation` (Bellatrix) ; boss canon | Kingsley (8), Bill (9), Sirius (10) ; Lux Aeterna (ét. 6→), Chasse Sans Tête | mini-boss / révélations ; **remise cérémonielle** de la récompense Signature | **3ᵉ éclat** (Mangemort d'Élite) ; Codex se nomme |
| **Climax** (10, C) | ✅ `voldemort_revenu` → `victoryAchieved` | — | **réplique + modificateur one-shot** selon `<house>SignatureDone` | révélation : la double trame |
| **IV — Boucle Ténébreuse** (11+, C→D) | descente infinie corrompue | Gardien de la Boucle (purges répétables) ; set@12 ; don@Mythe | écho mineur (Bannière déchirée / dernier pacte / pages ténébreuses / refuge à rétablir) | revers : refermer a ouvert |

---

## 8.8 Exemples de dialogues & choix impactants

> 💡 Échantillons de ton (registre aventure → sombre, [02](02-univers-ton-et-canon.md)).
> Pas de levier mécanique sauf mention `✅`/`flag`. Voix des PNJ en [06](06-pnj-et-factions.md).

### 8.8.1 Dumbledore (portrait) — escorte de la trame
- **À l'intro / `intro_tutoriel`** : « Tu as entendu la pierre se fendre, toi aussi.
  Ce n'était pas un accident — c'était un *réveil*. Descends. Le château a besoin
  d'un cœur qui n'a pas appris à reculer. »
- **Avant Voldemort (générique)** : « Plus bas que la peur, il y a toujours autre
  chose. Souviens-toi : ce n'est pas ta puissance qui scelle. C'est ton choix d'être
  là. »
- **Avant Voldemort, `gryffSignatureDone`** : « Le château a entendu ton pas ne pas
  reculer. La terreur n'aura pas de prise sur toi cette fois. » *(✅ flag → neutralise
  la phase terreur.)*
- **Après la victoire, `slythPactChoice = pact`** *(Dumbledore plus froid)* : « Tu as
  gagné. Veille seulement à rester celui qui parle — et non celui à qui l'on parle. »

### 8.8.2 Le choix gris du Pacte des Cachots (🐍 — `slythPactChoice`)
> ✅ **Choix impactant implémenté** : 2 boutons de remise → `turnInSlythSignature(pact|defiance)`.

- **L'écho de Salazar (offre)** : « Je ne te demande pas ton âme, petit. Juste un
  raccourci, et un secret qui ne t'appartient pas tout à fait. Le pouvoir t'écoute
  déjà — il suffit de ne pas détourner le regard. »
- **▶ Choix A — Sceller le pacte (`pact`)** : *bonus lifesteal de sort* ; Voldemort
  *reconnaît* le héros au climax (« Nous nous ressemblons »), Dumbledore se refroidit.
  → *« On gagne plus vite. On se demandera plus tard ce qu'on a laissé en chemin. »*
- **▶ Choix B — Défier l'écho (`defiance`)** : *léger debuff sur le boss* (« il
  connaît la trahison ») ; estime de Dumbledore préservée.
  → *« Je connaissais ta voix, Salazar. Je ne lui ai juste pas obéi. »*

### 8.8.3 Le serment du Refuge (🦡 — *Ceux qu'on ne laisse pas derrière*)
- **Chourave (intro)** : « Tout le monde regarde vers le bas, vers le danger. Moi je
  te demande de regarder *autour*. Combien sont restés coincés pendant que les murs
  basculaient ? Ramène-les. Personne ne reste au fond. »
- **Un égaré secouru (élève)** : « Tu… tu es redescendu *pour moi* ? » → flag de
  rescapé ; réapparaît plus bas en petit donneur de bonus.
- **L'elfe libéré (clin d'œil Dobby)** : « Là où on m'a traité comme quelqu'un, je
  reste. » → ❓ allié-buff passif (flag sérialisé).

### 8.8.4 Le Chevalier Fantôme (🦁 — *L'Étendard de Godric*)
- **Confier l'Étendard** : « Je monte la garde depuis si longtemps que j'ai oublié
  pourquoi. Toi, tu sais encore. Prends la bannière qui ne s'incline jamais — et
  apprends qu'être devant, c'est faire passer les autres. »
- **Dernier brasier rallumé (Boucle Ténébreuse)** : « Tu n'avais pas besoin de me
  délivrer. Mais tu l'as fait quand même. *Ça*, c'est Gryffondor. »

### 8.8.5 Le Codex de Rowena (🦅) & Manon (arc transverse)
- **Feuillet du Codex décodé** : « Rowena l'a écrit en sachant qu'elle mourrait avant
  de finir. Le savoir n'est pas un pouvoir, ici. C'est un *legs*. »
- **Manon, au grimoire reconstitué** ([§8.3](#83-grands-arcs--sous-intrigues---fiches-détaillées))
  : « Ma mère m'a menti seize ans. Mais ça… *(la dernière page : « pour toi »)* …ça,
  elle ne l'a pas menti. » → ✅ `livre_glacius_tempete` + passif « Hiver Clair ».

> 💡 **Règle de ton des choix** : les choix impactants du jeu sont **gris**, jamais
> bien-contre-mal binaire (cf. thème *« le choix plutôt que le don »*,
> [03 §3.7](03-trame-principale.md)). Chaque option a un **prix** lisible — le pacte
> qui rend plus fort *et* refroidit Dumbledore en est le modèle.

---

## 8.9 Récapitulatif express (pour briefer Gemini)
> La descente EST la quête principale ; les quêtes sont des **escortes**
> (chaîne Dumbledore), de la **saveur/loot** (PNJ d'étage), des **arcs
> émotionnels** autonomes (Manon/Élara, Lux Aeterna), des **réservées à la
> Maison** (set au palier 12, don au palier Mythe, **+ Signature en Actes I-III**),
> et du **farm endgame** (purges du Gardien). Les **Quêtes Signature** (§8.5)
> rendent le choix de Maison *narratif* dès le début, avec un levier **léger** sur
> la finale Voldemort et un écho en Boucle. Easter eggs canon : Reliques de la
> Mort, Salle sur Demande, libération d'elfe, Chasse Sans Tête.
