# 09 — Bestiaire & lore des créatures

**Statut :** 🟩 proposition de référence — finalisée, à valider / amender

> 📊 **Statut réel (code)** : ✅ 72 monstres + bestiaire + scaling livrés —
> modules : `js/monsters.js`, `js/ui-bestiary.js`, `js/dungeon-scaling.js`.
> Cf. [index doc ↔ module](../README.md#index-doc--module--statut-réel).

> Objectif : donner aux créatures une **origine narrative** qui les relie à la
> corruption, à la **Clé de Voûte des Quatre** et aux **Ruines Anciennes**, pour
> que chaque monstre soit une menace **à la fois mécanique et narrative**. Le
> détail chiffré (stats, capacités) relève du gameplay (`js/monsters.js`) ; ce
> chapitre raconte le **pourquoi**.
>
> Conventions : `💡` = proposition de lore modifiable · `✅` = acté dans le jeu ·
> `❓` = point à valider.
>
> Renvois : descente acte par acte → [03](03-trame-principale.md) · géographie
> des lieux → [10](10-lieux-et-geographie.md) · figures humaines nommées
> (Bellatrix, Dolohov, Greyback…) → [06](06-pnj-et-factions.md) · thèmes →
> [01 §1.7](01-synopsis-et-pitch.md) · Maisons → [07](07-les-maisons.md) ·
> quêtes & Éclats → [08](08-quetes-et-sous-intrigues.md).

---

# ÉTAPE 1 — Contenu narratif

## 9.0 Cadre (✅ dans le jeu)

- **~67 créatures** réparties par tranche d'étages, du familier (étage 1) à
  l'abyssal (étage 14+). Chacune porte un **niveau de danger** affiché (1–11).
- **5 catégories** *mécaniques* : `bête`, `humain`, `fantôme`, `créature`,
  `être magique`. Elles ne sont **pas** les familles narratives de §9.2 — ce
  chapitre regroupe par **sens dans le récit**, pas par tag moteur.
- **Boss `epic`** : créatures uniques, plus puissantes, qui jalonnent la
  descente. Le bestiaire affiche déjà des champs de lore (`lore`, `habitat`,
  `anecdote`, `danger`).
- **Boucle Ténébreuse** (étages 11+) : le château recycle ses créatures et ses
  boss en variantes **« Ténébreux »** (voir §9.9).

---

## 9.1 Introduction au Bestiaire — le rôle narratif des créatures

### 9.1.1 La corruption ne crée pas : elle réveille

> 💡 **Principe directeur du lore.** La corruption qui remonte des profondeurs
> **n'invente aucun monstre**. Elle **réveille, retourne ou aggrave** ce qui
> dormait déjà à Poudlard. Une chouette espionne, un portrait insulte, un
> gardien de pierre s'anime contre vous, le chat de Rusard cherche à vous
> mordre. Le **familier devient hostile** — c'est la signature de l'univers, et
> la raison pour laquelle le bestiaire fait peur : on reconnaît tout, et tout
> veut votre mort.

Le déclencheur de tout le récit est la **Clé de Voûte des Quatre** — la relique
que les quatre Fondateurs ont forgée *ensemble* pour sceller ce qui dormait
sous l'école — fêlée en plein cours d'Histoire de la Magie
([03 §3.1](03-trame-principale.md)). Cette fêlure n'a pas *ouvert* une porte :
elle a **affaibli un verrou que la peur tenait fermé depuis avant Poudlard**.
Par cette brèche suinte une **corruption ancienne**, plus vieille que les
Fondateurs eux-mêmes, qui imprègne lentement chaque créature qu'elle touche.

Trois symptômes de cette corruption se lisent **sur les créatures**, et
fournissent la grammaire visuelle/sonore du bestiaire :

1. **Le froid surnaturel.** ✅ Le givre qui a gagné le socle de la Clé de Voûte
   est la même substance qui blanchit l'haleine au fond du donjon. Les
   créatures corrompues sont **froides au toucher**, laissent une buée à leur
   passage, et beaucoup portent la faiblesse/résistance `glace`. Le froid n'est
   pas une météo : c'est **la corruption rendue sensible**.
2. **La peur comme sceau.** ✅ Le verrou tenait *par* la peur — descendre, c'est
   regarder en face ce qui retient le mal. Les créatures les plus profondes
   **arment la peur** (statut `fear` 😱 : Détraqueur, Épouvantard, Greyback,
   Héraut des Ténèbres) : elles ne veulent pas seulement vous tuer, elles
   veulent **vous faire reculer**. Reculer, c'est laisser la fêlure s'élargir.
3. **Les voix des Fondateurs.** 💡 Là où la corruption a réveillé un gardien
   ancien, on entend (stèles d'énigme, ✅ `riddles.js` / `r_clef_voute`) les
   **échos des quatre Fondateurs** — non comme des fantômes, mais comme une
   mémoire gravée dans la pierre. Certaines créatures (Veilleur du Seuil,
   Basilic) sont littéralement **leur œuvre devenue folle**.

### 9.1.2 L'évolution selon la profondeur — du canon au cauchemar

> 💡 Règle d'écriture transversale : **plus on descend, plus le canon HP cède la
> place à l'horreur originale.** L'apparence et le comportement d'une même
> *idée* de créature dérivent vers le cauchemardesque à mesure que la corruption
> s'épaissit. C'est le moteur du sentiment de **descente dans l'inconnu**.

| Profondeur | Tranche (✅) | État de la corruption | Registre des créatures |
|------------|-------------|-----------------------|------------------------|
| **Étages 1–3** | A — Couloirs | Suintement. Le givre n'a encore touché que l'école. | **Canon familier** : chat, lutins, portraits, Peeves, Mimi. Faible danger, ambiance & tutoriel. |
| **Étages 4–6** | B — Cachots | Infiltration. La pierre prend froid ; des humains servent la fêlure. | **Bestiaire « naturel » + premiers Mangemorts.** Territoires violés, fidèles masqués. |
| **Étages 7–10** | C — Profondeurs | Imprégnation. On quitte le Poudlard connu ; Voldemort se reconstitue. | **Boss canon, créatures majeures, gardiens.** Le danger devient mortel. |
| **Étages 11–13** | C (post-victoire) | Débordement. La faille s'est *ouverte*, pas refermée. | **Variantes « Ténébreux »** des étages habités. |
| **Étages 14+** | D — Ruines Anciennes | Source. Le territoire pré-Poudlard, runique, antérieur aux Fondateurs. | **Abominations & gardiens runiques.** Le cauchemar à l'état pur. |

> 💡 **Triple gradient** appliqué à toute créature : (a) **apparence** — propre
> et reconnaissable en haut, givrée/fissurée/distordue en bas ; (b)
> **comportement** — territorial ou nuisible en haut, prédateur et cruel en bas ;
> (c) **sonore** — bruits d'animal/d'école en haut, souffles froids et voix
> murmurées en bas. ❓ À valider : jusqu'où pousser la distorsion visuelle des
> variantes Ténébreuses (re-teinte + givre suffisent, ou silhouettes retouchées ?).

---

## 9.2 Catégorisation des créatures

### 9.2.1 Par type narratif (5 familles)

Les **familles narratives** regroupent par *sens dans le récit* — orthogonales
aux 5 catégories moteur.

| # | Famille narrative | Question qu'elle pose | Étages dominants |
|---|-------------------|-----------------------|------------------|
| **F1** | **Les créatures de l'école qui se retournent** | « Et si le familier devenait hostile ? » | 1–4 |
| **F2** | **Bêtes & créatures magiques territoriales ou blessées** | « Toute hostilité est-elle de la corruption ? » (non — nuance morale) | 2–8 |
| **F3** | **Morts-vivants, fantômes & malédictions** | « Et si la mort cessait d'être un fait pour devenir une présence ? » (thème **peur**) | 3–10 |
| **F4** | **Les forces de Voldemort** (corruption *humaine*) | « Et si des **gens** voulaient cela ? » (escalier de menace organisée) | 2–10 |
| **F5** | **Bêtes mythiques, gardiens anciens & abominations** | « Et si l'œuvre des Fondateurs s'était retournée contre eux ? » | 6–14+ |

### 9.2.2 Par étage / Acte (placement recommandé)

> ✅ Le placement réel est piloté par `minFloor`/`maxFloor`/`weight` dans
> `monsters.js` ; cette grille en est la lecture narrative.

| Acte (✅) | Étages | Familles dominantes | Boss-jalons (✅ `epic`) | Tonalité |
|-----------|--------|---------------------|--------------------------|----------|
| **I — L'École** | 1–3 (A) | F1 + amorce F3 | — (tutoriel) | Familier qui se fissure |
| **II — La Descente** | 4–6 (B) | F2 + F4 (Mangemorts masqués) + F3 | (boss de seuil ✅ Gardien du Portail 5+) | Austère, froid qui monte |
| **III — Les Profondeurs** | 7–10 (C) | F3 + F4 + F5 | Nagini (7), Greyback (8), Veilleur (8), Aragog (9), Voldemort Affaibli (9), Maître des Détraqueurs (9), Dolohov (10), Héraut (10), **Voldemort Ressuscité (10)** | Abyssal, mortel |
| **IV — La Boucle Ténébreuse** | 11+ (C→D) | Tout, en variantes **Ténébreux** | Boss 8–10 « Ténébreux » (ét. 18–20) | Le mythe retourné |

---

## 9.3 Famille F1 — Les créatures de l'école (étages 1–3)

**Rôle narratif : le familier qui se fissure.** Habitants connus du château,
ceux qu'un élève croise tous les jours. Leur agressivité soudaine est le
**premier symptôme** que quelque chose, en bas, réveille le château contre les
siens. Faible danger, fonction d'**ambiance et de tutoriel**.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Chat de Mme Norris | 1–2 | La sentinelle de Rusard, devenue hostile : signal d'alarme |
| Bowtruckle Géant | 1–3 | Gardien d'arbre à baguettes ; protecteur paisible rendu farouche |
| Cornichon de Cornouailles | 1–3 | Les nuisibles du cours de Lockhart, lâchés dans les couloirs |
| Lutin de Cornouailles | 1–4 | Tapageur bleu vif ; premier porteur de **l'étourdissement** (`stun`) |
| Luciole des Marais | 1–3 | Inoffensive en apparence, aveuglante de près |
| Peeve le Poltergeist | 1–4 | L'esprit frappeur immémorial ; humour et chaos. **Porte le 1ᵉʳ Éclat** (✅) |
| Mimi Geignarde | 1–3 | Fantôme triste des toilettes ; aussi **donneuse de quête** ([06](06-pnj-et-factions.md)) |
| Portrait Animé Hostile | 1–4 | Cadres ensorcelés par des sympathisants — la corruption est aussi **humaine** |
| Serpent des Cachots | 1–5 | Vestige de Salazar ; répond au Fourchelang — annonce le Basilic |

> 💡 Mimi et Peeves sont des **figures à double face** : ennemis d'ambiance ET
> personnages du château. Le jeu en tire déjà parti (Mimi confie la quête du
> troll ; Peeves laisse tomber le 1ᵉʳ Éclat de la Clé de Voûte). On joue sur
> l'ambivalence — un fantôme qu'on combat puis à qui l'on parle.

---

## 9.4 Famille F2 — Bêtes & créatures magiques (le bestiaire « naturel »)

**Rôle narratif : le monde sauvage qui déborde.** Créatures de la Forêt
Interdite, des serres, des douves, des marécages — la lisière magique de
Poudlard, qui s'infiltre à mesure qu'on descend. Beaucoup ne sont pas
*méchantes* : elles sont **territoriales, blessées ou affamées**. C'est la
**nuance morale** du bestiaire — toute hostilité n'est pas de la corruption.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Chouette Ensorcelée | 2–4 | Animal paisible **retourné en espion** par les Mangemorts |
| Mandragore Sauvage | 2–5 | Plante de cours devenue agressive faute de soin |
| Kappa des Douves | 2–6 | Démon aquatique japonais installé sous le château |
| Strangulot | 3–7 | Petit démon des douves ; immobilise pour noyer (`stun`) |
| Niffleur | 2–5 | Voleur d'objets brillants — comique et **vole vos Gallions** |
| Bundimun Venimeux | 3–6 | Parasite qui dissout la matière — ronge même l'armure |
| Araignée Géante | 2–7 | Descendance d'Aragog ; annonce les Acromantules profondes |
| Centaure Hostile | 3–7 | Tout centaure n'est pas bienveillant : on viole son territoire |
| Hippogriffe en Furie | 4–8 | Fier, **traumatisé par les Mangemorts** : sa rage est une blessure |
| Manticore Juvénile | 6+ | Mi-lion mi-scorpion ; déjà mortelle jeune |
| Chauve-Souris Vampire | 2–6 | Prédateur nocturne qui saigne sa proie sans la tuer |
| Loup-Garou Adulte | 8+ | Lycanthrope à pleine maturité, sans potion Tue-Loup |

> 💡 **Pitiponk** (4–8) et **Gargouille Éveillée** (5–10) appartiennent autant à
> cette famille qu'aux gardiens du château : la Gargouille est une **sculpture
> de garde réveillée** par la corruption, le Pitiponk un feu follet trompeur des
> marécages souterrains. Tous deux portent l'**étourdissement**.

---

## 9.5 Famille F3 — Morts-vivants, fantômes & malédictions

**Rôle narratif : le froid et le désespoir.** La famille thématique de la
**peur** — fil rouge du récit ([01 §1.7](01-synopsis-et-pitch.md)). Plus on
descend, plus la mort cesse d'être un fait et devient une **présence**. Cette
famille concentre les statuts **peur** (`fear`) et **saignement** (`bleed`), et
la faiblesse narrative à la **lumière** / au **Patronus**.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Épouvantard | 2–6 | Prend la forme de votre pire peur ; emblème littéral du thème |
| Détraqueur | 3–8 | Se nourrit du bonheur ; fait revivre les pires souvenirs — repoussé par le Patronus. **Lâche l'Éclat de Lumière** (✅ 35 %) |
| Inférius | 4–8 | Cadavre réanimé par un sorcier noir ; ne craint que le feu |
| Chevalier Fantôme | 4–9 | Gardien condamné à veiller pour l'éternité |
| Fantôme du Sang Noir | 3–8 | Esprit d'un puriste mort en combattant Dumbledore |
| Poupée Maudite | 3–7 | Réceptacle d'une malédiction de vengeance — magie de douleur |
| Spectre Maudit | 5+ | Âme punie d'éternité, ni morte ni en repos |
| Spectre Renforcé | 9+ | Vestige assez puissant pour **matérialiser ses coups** |
| Détraqueur d'Élite | 8+ | Détraqueur vétéran qui éteint les souvenirs heureux |
| Vampire Novice | 4–8 | Fraîchement transformé, vorace, vulnérable au feu/à la lumière |
| Strigoï Ancien | 6+ | Vampire antique à magie du sang, draine à distance |

> 💡 **Articulation gameplay ↔ lore.** Les sorts de **lumière** (Lumos Solem,
> ×1.5 contre les morts-vivants) et le **Patronus** (palier de Maison 17, dissipe
> la peur) sont les réponses *écrites* à cette famille. Le bestiaire et l'arbre
> de sorts racontent la même histoire : **contre le désespoir, on oppose un
> souvenir heureux.** → [08](08-quetes-et-sous-intrigues.md) (Lumière Éternelle).
> C'est aussi pourquoi les morts-vivants **lâchent l'Éclat de Lumière** (✅) :
> chaque victoire sur le froid arrache un fragment de chaleur.

---

## 9.6 Famille F4 — Les forces de Voldemort (la corruption *humaine*)

**Rôle narratif : la preuve que le mal a des fidèles.** Là où les autres familles
disent « le château se réveille », celle-ci dit « **des gens veulent ça** ».
Elle monte en gamme avec la descente — du masque anonyme au cercle intérieur
nommé — et culmine en Voldemort. C'est l'**escalier de la menace organisée**.

| Échelon | ✅ Étages | Sens narratif |
|---------|----------|---------------|
| Gobelin Rebelle | 2–6 | Gringotts a ses traîtres ; premiers ralliés |
| Sorcière des Ténèbres | 4–9 | A vendu son âme contre le pouvoir |
| Mangemort Masqué | 5+ | La piétaille marquée — la corruption servie par des humains |
| Sorcier Renégat | 5+ | Ancien élève brillant de Serpentard, tombé |
| Auror Corrompu | 7+ | Le **gardien retourné** : il manie les sorts qu'il combattait |
| Hécate la Maudisseuse | 7+ | Exclue de Poudlard pour magie interdite ; recrute des apprentis |
| Mangemort Vétéran | 9+ | De la Première Guerre ; cruauté intacte |
| Mangemort d'Élite | 7+ | Cercle intérieur ; maîtrise des Impardonnables. **Porte le 3ᵉ Éclat** (✅) |

Les **figures nommées** (boss `epic` canon) font l'objet de fiches détaillées en
§9.8. Chacune tombée « affaiblit le sceau » et densifie la présence de Voldemort
([03 §3.4](03-trame-principale.md)).

---

## 9.7 Famille F5 — Bêtes mythiques, gardiens anciens & abominations

**Rôle narratif : la mémoire profonde du château.** Créatures rares des strates
anciennes — l'œuvre des **Fondateurs**, ou des monstres de légende que Poudlard
a *enfouis* plutôt qu'éliminés. C'est la famille qui **incarne les Ruines
Anciennes** et la corruption à sa source.

- **Basilic Mineur** (ét. 6+, `epic`) — Serpent créé par **Salazar Serpentard**
  lui-même. Œuvre de Fondateur retournée par la corruption. → fiche §9.8.
- **Chimère de Poudlard** (ét. 6+, `epic`) — Monstre mythologique « vaincu une
  seule fois dans l'histoire » : trophée de légende des Profondeurs.
- **Ombre de Quirrell** (ét. 6+, `epic`) — Le revenant du professeur qui portait
  Voldemort sous son turban ; cherche encore la Pierre. **Écho hanté du canon.**
- **Jeune / Adulte Acromantule** (ét. 5+ / 8+) — Lignée d'Aragog qui prospère
  sous le château : le bestiaire « naturel » devient monstrueux en profondeur.
- **Veilleur du Seuil** / **Héraut des Ténèbres** / **Gardien du Portail** /
  **Maître des Détraqueurs** / **le Bibliothécaire d'Ombre** — **gardiens
  originaux** (boss inventés), fiches §9.8.

> 💡 Le **Veilleur du Seuil** et le **Bibliothécaire d'Ombre** forment un
> **diptyque sur le savoir interdit** : l'un scelle ce qu'on ne doit pas
> franchir (runes pré-Poudlard), l'autre est détruit par ce qu'on ne sut pas
> lire (grimoire de lumière). Tous deux **annoncent la tranche D** (Ruines
> Anciennes).

---

## 9.8 Fiches détaillées des créatures principales

> Gabarit de fiche (champs) : **Nom · Apparence (normale → corrompue) · Origine
> narrative · Comportement & rôle · Rôle en combat · Hooks / quêtes · Variantes
> Maison/héros.** Les valeurs de combat sont relues sur `js/monsters.js` (✅).
> 15 fiches : **10 créatures + 5 boss majeurs** (§9.8.11–9.8.15).

### 9.8.1 — Détraqueur (F3, ✅ fiche exemplaire)

- **Apparence.** Silhouette squelettique encapuchonnée, mains grises et
  putréfiées. **Corrompu (profondeurs)** : la bure se givre, un halo de froid
  bleuté le précède, son souffle gèle l'air (✅ faiblesse `lumière`,
  résistances `ténèbres`/`glace`).
- **Origine narrative.** Gardiens d'Azkaban dans le canon ; ici, ils ont **quitté
  la prison pour le château corrompu** — attirés par la fêlure comme par une
  source de désespoir à ciel ouvert. Ils ne servent personne : ils **se
  nourrissent** de la peur que la corruption diffuse.
- **Comportement & rôle.** Porte-étendard du thème de la **peur**. Sa présence
  seule fait revivre les pires souvenirs. Pivot de l'arc de la **Lumière
  Éternelle** ([08](08-quetes-et-sous-intrigues.md)).
- **Rôle en combat.** `cautious`, danger **9**. *Baiser du Détraqueur* (`drain`
  35 %), *Désespoir Glacial* (`fear` 3 tours, 30 %). **Faiblesse : lumière** ;
  résiste ténèbres/glace/disarm. Réponse écrite : **Lumos Solem** (×1.5) et le
  **Patronus** (dissipe `fear`).
- **Hooks / quêtes.** ✅ Lâche l'**Éclat de Lumière** (35 %) — matériau du fil
  rouge anti-désespoir. Antre possible : un cachot où un **Éclat** brille sous
  la glace, gardé par un Détraqueur d'Élite (💡 mini-event).
- **Variantes Maison/héros.** 🦁 Gryffondor : sa Quête Signature *neutralise la
  phase terreur* du climax (écho thématique). 💡 Un héros au passé lourd
  (Anastasia) pourrait recevoir un **bark** unique au contact (« Il connaît mon
  pire souvenir »).

### 9.8.2 — Épouvantard / Boggart (F3, ✅)

- **Apparence.** Indéfinie au repos (masse mouvante d'ombre) ; **prend la forme
  de la pire peur** de l'observateur. **Corrompu** : la forme adoptée se givre
  et se distord, durant plus longtemps avant de pouvoir être tournée en
  ridicule.
- **Origine narrative.** Créature-caméléon de la peur. La corruption **amplifie**
  son pouvoir : là où un Épouvantard scolaire cédait au *Riddikulus*, celui des
  profondeurs s'accroche, car la peur est ici la matière même du sceau.
- **Comportement & rôle.** **Emblème littéral du thème.** Premier porteur du
  statut `fear` rencontré tôt (dès l'étage 2) — apprentissage de la mécanique de
  peur.
- **Rôle en combat.** Pose `fear` ; vulnérable aux sorts de lumière. Danger
  modéré, fonction **pédagogique** (apprendre à gérer la peur avant les boss).
- **Hooks / quêtes.** 💡 Antre « salle des peurs » : une pièce où plusieurs
  Épouvantards prennent successivement la forme des boss à venir — **préfiguration**
  jouable de la descente.
- **Variantes Maison/héros.** 💡 La forme adoptée pourrait **varier selon le
  héros actif** (clin d'œil cosmétique : la pire peur de chacun), sans incidence
  mécanique.

### 9.8.3 — Hippogriffe en Furie (F2, 💡 enrichissement)

- **Apparence.** Mi-aigle mi-cheval, plumage fier ; **corrompu** : œil injecté,
  plumes hérissées de givre, écume aux naseaux.
- **Origine narrative.** Créature noble qui exige une **révérence** — ici
  **blessée et traumatisée par les Mangemorts**, sa méfiance est devenue rage
  aveugle. **La victime devenue danger** : la corruption fait des dégâts
  collatéraux, pas que des fidèles.
- **Comportement & rôle.** Charge sans avertissement quiconque croise son regard.
  Incarne la **nuance morale** du bestiaire.
- **Rôle en combat.** `aggressive`, danger **7**. *Serres du Griffon*, *Charge
  Ailée* (gros pic). **Faiblesse : foudre.** Pas de magie (`mag 0`) — une brute
  physique pure.
- **Hooks / quêtes.** 💡 Quête **« La Révérence »** : l'**apaiser** (révérence /
  soin / Diffindo sur ses entraves) plutôt que le tuer → il libère l'accès à une
  galerie haute et laisse une plume (matériau). Écho direct de **Buck**.
- **Variantes Maison/héros.** 🦡 Poufsouffle : option d'apaisement renforcée
  (réussite garantie) ; les autres Maisons doivent réussir un jet de Fortune. 💡
  Hagrid (PNJ) peut souffler la marche à suivre.

### 9.8.4 — Inférius (F3, ✅)

- **Apparence.** Cadavre blafard aux yeux laiteux, mouvements saccadés ;
  **corrompu** : peau craquelée de givre, remonte des eaux noires souterraines.
- **Origine narrative.** Cadavre **réanimé par un sorcier noir** pour garder un
  lieu interdit. La corruption en réveille des **bancs entiers** dans les
  réserves inondées sous les cachots.
- **Comportement & rôle.** Garde immobile jusqu'au passage d'un vivant, puis
  submerge en nombre. **Ne craint que le feu** — pur rappel canon (la caverne du
  Horcruxe).
- **Rôle en combat.** Lent, résistant ; **faiblesse : feu** (Incendio). Souvent
  en groupe → menace d'usure.
- **Hooks / quêtes.** 💡 Antre « la réserve noyée » : avancer = réveiller plus
  d'Inferi ; un **brasier** (interactible) à allumer pour les tenir à distance.
- **Variantes Maison/héros.** 🦁 Gryffondor : *brasiers du Lion* (✅ Quête
  Signature Acte II) — les feux qu'on allume font ici double emploi narratif.

### 9.8.5 — Strangulot (F2, ✅)

- **Apparence.** Petit démon aquatique verdâtre, doigts longs et cornes ;
  **corrompu** : eaux gelées autour de lui, prise glaciale.
- **Origine narrative.** Habitant des douves du Lac Noir, descendu avec les eaux
  sous le château. Pas un agent de la corruption — un **opportuniste** qui
  profite du froid pour étendre son territoire.
- **Comportement & rôle.** **Immobilise pour noyer** : premier porteur fréquent
  du statut `stun` côté F2.
- **Rôle en combat.** Pose `stun` (saute le prochain tour) ; faible PV mais
  **gênant en groupe** (verrouille l'initiative).
- **Hooks / quêtes.** 💡 Cible idéale d'une quête « assainir les douves » du
  Garde-chasse ; loot d'algue (matériau potion).
- **Variantes Maison/héros.** — (créature mineure ; pas de variante dédiée).

### 9.8.6 — Gargouille Éveillée (F2/F5, ✅)

- **Apparence.** Sculpture de garde en pierre ; **corrompue** : les yeux
  s'allument d'une **lumière froide**, des runes pulsent sous le lichen givré.
- **Origine narrative.** **Sculpture de garde réveillée** par la corruption qui
  remonte. Charnière entre F2 (créature) et F5 (gardien ancien) : c'est de la
  pierre de Poudlard qui **se souvient d'avoir été faite pour veiller**.
- **Comportement & rôle.** Statique puis brutale ; **porte l'étourdissement**.
  Premier indice, dès l'étage 5, que **la pierre elle-même garde des seuils** —
  préfigure le Veilleur (§9.8.13).
- **Rôle en combat.** `stun`, bonne DEF, lente. Brute défensive.
- **Hooks / quêtes.** 💡 Garde souvent une **niche/coffre** ou un passage scellé ;
  ses runes peuvent **répondre à une stèle** (voix des Fondateurs) si le joueur a
  résolu l'énigme correspondante.
- **Variantes Maison/héros.** 🦅 Serdaigle : les runes révèlent une faiblesse
  (écho du *Codex de Rowena*, Quête Signature).

### 9.8.7 — Strigoï Ancien (F3, ✅)

- **Apparence.** Vampire antique, peau parcheminée, ongles-griffes ; **corrompu** :
  veines noires, aura de froid, draine à distance.
- **Origine narrative.** Vampire **antérieur à l'école** réveillé dans les
  cavernes profondes — un prédateur que Poudlard avait *muré* plutôt que détruit.
  Lien F5 : il appartient aux strates anciennes.
- **Comportement & rôle.** **Magie du sang**, draine la vie à distance. Montre
  que la profondeur abrite des choses **plus vieilles que la guerre des
  sorciers**.
- **Rôle en combat.** `drain` à distance, dangereux en duo avec d'autres
  saigneurs (`bleed`). Vulnérable lumière/feu.
- **Hooks / quêtes.** 💡 Antre scellé d'un caveau ; un **Éclat de Lumière** y
  brille comme un repoussoir laissé par un ancien chasseur.
- **Variantes Maison/héros.** — (rare ; ambiance).

### 9.8.8 — Mangemort Masqué (F4, ✅)

- **Apparence.** Robe noire, masque d'argent, Marque des Ténèbres au bras ;
  **corrompu/profond** : la Marque **pulse au rythme du combat** (cf. Vétéran).
- **Origine narrative.** **La piétaille marquée.** Premiers humains à descendre
  *volontairement* vers la fêlure pour hâter le retour de leur maître — attirés
  « comme des phalènes » ([03 §3.3](03-trame-principale.md)).
- **Comportement & rôle.** Prouve que **la corruption est servie par des
  humains**, pas seulement subie. Échelon de base de l'escalier F4.
- **Rôle en combat.** Sorts impairs, dégâts purs ; cruauté sans finesse.
- **Hooks / quêtes.** ✅ Le **Mangemort d'Élite** (échelon supérieur) **porte le
  3ᵉ Éclat de la Clé de Voûte** (drop garanti, quête `eclats_clef_voute`).
- **Variantes Maison/héros.** 🐍 Serpentard : le *Pacte des Cachots* (Quête
  Signature) ouvre des dialogues/raccourcis « gris » avec certains renégats.

### 9.8.9 — Auror Corrompu (F4, 💡 enrichissement)

- **Apparence.** Uniforme du Bureau des Aurors souillé, insigne terni ;
  **corrompu** : regard vide, sorts défensifs retournés en offensives.
- **Origine narrative.** **Le gardien retourné** : un protecteur de l'ordre
  tombé sous la corruption, qui **manie désormais les sorts qu'il combattait**.
  Variation sombre du thème « la victime devenue danger » côté humain.
- **Comportement & rôle.** Montre que **personne n'est à l'abri** — pas même les
  meilleurs. Charnière morale avant le cercle intérieur.
- **Rôle en combat.** Polyvalent (offensif + dispel possible), danger élevé dès
  l'étage 7.
- **Hooks / quêtes.** 💡 Kingsley (PNJ, ét. 8) pourrait **reconnaître** un ancien
  collègue parmi eux — dialogue de remords ; quête « rendre son insigne ».
- **Variantes Maison/héros.** — (ambiance ; potentiel de bark PNJ).

### 9.8.10 — Acromantule Adulte (F2/F5, ✅)

- **Apparence.** Araignée géante velue, multiples yeux ; **corrompue** :
  carapace givrée, toile qui craque de gel.
- **Origine narrative.** **Lignée d'Aragog** qui prospère sous le château. La
  colonie, privée de la voix d'Aragog, devient **plus agressive** à mesure que
  la corruption monte — le naturel vire au monstrueux.
- **Comportement & rôle.** Prédateur de meute des Profondeurs ; annonce le boss
  Aragog (§9.8.14).
- **Rôle en combat.** Rapide, mord/empoisonne, dangereuse en nombre.
- **Hooks / quêtes.** ✅ Cible des **quêtes de purge** répétables du Gardien de la
  Boucle en endgame (`purge_acromantules`).
- **Variantes Maison/héros.** — (cohorte de boss).

---

### Boss majeurs (5 fiches détaillées)

### 9.8.11 — Voldemort Ressuscité (F4, ✅ `epic`, **climax**)

- **Apparence.** Forme reptilienne blafarde, yeux rouges, fentes nasales ;
  pleinement reconstitué. **Avant** (Voldemort Affaibli, ét. 9) : spectre
  translucide et incomplet — le **premier contact**.
- **Origine narrative.** Ce que la Clé de Voûte retenait *au plus profond* : un
  fragment qui se **reconstitue à mesure que la fêlure remonte**. Chaque boss
  tombé en chemin « affaiblit le sceau » et, paradoxalement, **densifie sa
  présence** jusqu'à la pleine résurrection (ét. 10).
- **Comportement & rôle.** **Le climax de l'arc principal** ([03 §3.5](03-trame-principale.md)).
  Sa chute déclenche la cinématique de victoire et ouvre la Boucle Ténébreuse.
- **Rôle en combat.** Boss **à phases** (✅ `phases`) : enrage à 50 % PV
  (atk/mag ↑), **terreur du groupe** à 25 % ; **Avada Kedavra** ~70 %, invoque
  **Nagini** pour se soigner. Danger **11**.
- **Hooks / quêtes.** ✅ Verrou de progression de l'arc ; ✅ **modificateur
  one-shot** au combat selon le flag `<house>SignatureDone` (voir variantes).
- **Variantes Maison/héros.** ✅ 🦁 neutralise la phase **terreur** · 🦅
  **faiblesses révélées** · 🐍 reconnaissance/lifesteal **ou** debuff (selon
  `slythPactChoice`) · 🦡 buff de départ « Espoir partagé »
  ([03 §3.8](03-trame-principale.md)). 💡 Réplique unique de Dumbledore par
  Maison avant l'assaut.

### 9.8.12 — Fenrir Greyback (F4, ✅ `epic`, **premier boss canon**)

- **Apparence.** Loup-garou massif sous forme semi-humaine, crocs jaunis
  dégoulinants ; **corrompu** : pelage hérissé de givre, œil lunaire même sans
  pleine lune.
- **Origine narrative.** Le **plus tristement célèbre des loups-garous** ; il
  aimait sa condition autant qu'il aimait l'imposer. Allié de Voldemort, il
  garde la route des Profondeurs (ét. 8). C'est lui qui contamina **Remus Lupin**
  enfant — résonance avec le PNJ Lupin (donneur du Patronum, Acte II).
- **Comportement & rôle.** **Apprentissage du boss enragé** : sa *Rage Lunaire*
  (sursaut de fureur à faible PV) enseigne la phase de rage avant les boss
  ultérieurs.
- **Rôle en combat.** `aggressive`, danger **9**. *Morsure Infectieuse*
  (`bleed`), *Frénésie Lycanthrope* (`heal`), *Hurlement Glaçant* (`fear`),
  **Rage Lunaire** (`enrage_self` sous 40 % PV, +12 ATK une fois). **Faiblesse :
  lumière.**
- **Hooks / quêtes.** ✅ Drop **essence_tenebres** (matériau Forge) ; ✅ cible de
  la purge répétable `purge_loups` (Gardien de la Boucle, ét. 18+). 💡 Bill
  Weasley (PNJ ét. 9, mordu par Greyback dans le canon) peut avoir un **dialogue
  de vengeance**.
- **Variantes Maison/héros.** 💡 En Ténébreux (ét. 18), il pourrait **citer sa
  première mort** (« Tu m'as déjà tué une fois. Cela t'a-t-il libéré ? »).

### 9.8.13 — Veilleur du Seuil (F5, ✅ `epic`, **gardien original**)

- **Apparence.** Colosse runique de pierre, **sceaux pulsant d'une lumière
  froide**. Pas un visage : une **interdiction** faite matière.
- **Origine narrative.** **Automate scellé par des runes antérieures à la
  fondation de Poudlard.** Il ne hait pas — il **applique une interdiction
  vieille de mille ans**, gardant l'accès aux Profondeurs. **Premier indice
  concret que *quelque chose précède l'école*** : la graine narrative des
  **Ruines Anciennes** (tranche D) et des **voix des Fondateurs**.
- **Comportement & rôle.** Gardien de seuil par excellence : **n'autorise nul
  franchissement**, y compris à ceux qui le devraient.
- **Rôle en combat.** `cautious`, danger **9**, **DEF/MAG élevées, lent**. *Onde
  Runique* (`stun`), *Sceau de Lumière* (dégâts), *Régénération Runique* (`heal`),
  **Dissipation Sacrée** (`dispel` — brise vos protections). **Faiblesse :
  foudre** ; résiste physique/ténèbres. Un **mur défensif** à percer.
- **Hooks / quêtes.** ✅ Drop **page_grimoire** (matériau Bibliothèque). 💡 Ses
  runes pourraient être **les mêmes** que celles des **dalles-puzzle** et des
  Ruines — un fil visuel à tirer ([10](10-lieux-et-geographie.md)). Résoudre la
  **stèle des Fondateurs** correspondante pourrait l'affaiblir avant le combat.
- **Variantes Maison/héros.** 🦅 Serdaigle : le *Codex de Rowena* déchiffre une
  rune et **abaisse temporairement sa DEF**.

### 9.8.14 — Aragog (F5, ✅ `epic`, boss canon)

- **Apparence.** Acromantule colossale et aveugle, patte arquées ; **corrompue** :
  toile givrée, carapace fissurée d'âge.
- **Origine narrative.** **Le patriarche de la colonie** que Hagrid éleva et que
  la Forêt abrita. Réveillé et durci par la corruption, il garde le cœur de la
  toile, sous les Profondeurs (ét. 9).
- **Comportement & rôle.** Boss-sommet de la lignée arachnéenne (F2→F5).
  Affrontement « territorial » : on viole le centre de son nid.
- **Rôle en combat.** Brute rapide, mord/empoisonne, appelle des Acromantules.
  Danger élevé.
- **Hooks / quêtes.** ✅ Cible de `purge_acromantules` (Gardien de la Boucle) ;
  ✅ revient en **Ténébreux** (ét. 19). 💡 Hagrid (PNJ) : dialogue déchirant
  (« Aragog… c'était mon ami »).
- **Variantes Maison/héros.** — (cohorte de boss canon ; potentiel de bark Hagrid).

### 9.8.15 — Héraut des Ténèbres (F5, ✅ `epic`, **gardien original, dernier seuil**)

- **Apparence.** Silhouette encapuchonnée tenant un **cor d'os** ; **nul n'a
  jamais vu son visage**. Aura de froid et de malédiction lente.
- **Origine narrative.** **Annonciateur de la résurrection.** Il ne combat pas
  pour vaincre mais pour **préparer l'arrivée du Maître** : sa litanie corrompt
  l'air. **Dernier souffle avant Voldemort** (ét. 10).
- **Comportement & rôle.** Charnière dramatique : sa présence signifie que le
  climax est imminent. Incarne la **peur comme arme rituelle** (il *chante* la
  terreur).
- **Rôle en combat.** `cautious`, danger **10**, **forte MAG**. *Hymne du Néant*,
  *Aura Mortifère* (`fear` de groupe), *Régénération Spectrale* (`heal`), *Sceau
  de Dissolution* (`dispel`), **Litanie d'Effroi** (`aura` — affaiblit **tout** le
  groupe). **Faiblesse : lumière** ; résiste ténèbres/physique.
- **Hooks / quêtes.** ✅ Drop **page_grimoire** + matériaux rares. 💡 Son cor
  pourrait être un **objet de lore** (le « Cor du Néant ») relié à une stèle.
- **Variantes Maison/héros.** 🦁 Sa litanie de terreur est la cible idéale du
  passif anti-peur de Gryffondor / du Patronus (palier 17).

> 💡 **Diptyque des gardiens originaux** : **Veilleur** (scelle ce qu'on ne doit
> pas franchir) et **Bibliothécaire d'Ombre** (détruit par ce qu'on ne sut pas
> lire). À compléter d'une fiche si la sous-intrigue du grimoire d'Élara
> ([08](08-quetes-et-sous-intrigues.md)) prend de l'ampleur.

---

## 9.9 Lore global des créatures

### 9.9.1 L'origine commune de la corruption

> 💡 **Une seule source, trois manifestations.** Tout le bestiaire corrompu
> partage **une cause unique** : la **corruption pré-Poudlard** que la **Clé de
> Voûte des Quatre** tenait scellée. Elle ne fabrique pas de monstres — elle est
> un **principe de retournement** qui s'infiltre par la fêlure et imprègne le
> vivant, le mort et la pierre. Ses trois signatures (cf. §9.1.1) — **froid
> surnaturel**, **peur comme sceau**, **voix des Fondateurs** — sont les trois
> visages d'une même chose.

- **Le froid** est la corruption *rendue sensible* : plus une créature en est
  imprégnée, plus elle est froide (et plus le `glace` la concerne).
- **La peur** est à la fois ce qui tenait le verrou *et* l'arme des créatures
  profondes : elles cherchent à vous faire **reculer**, car reculer élargit la
  fêlure. Le courage (descendre) est donc l'**anti-corruption** narrative.
- **Les Éclats** sont des **fragments arrachés à la corruption** : l'**Éclat de
  la Clé de Voûte** (`eclat_voute`, ✅) est un morceau du verrou lui-même ;
  l'**Éclat de Lumière** (`eclat_lumiere`, ✅) est un fragment de chaleur
  reconquis sur les morts-vivants. Les collecter, c'est **désarmer la source**
  pièce par pièce.

### 9.9.2 Relation avec les Fondateurs et les Ruines Anciennes

> 💡 Les quatre **Fondateurs** n'ont pas *créé* la corruption : ils l'ont
> **trouvée** en bâtissant l'école sur des **ruines runiques antérieures**
> ([02 §2.2](02-univers-ton-et-canon.md)). Ne pouvant la détruire, ils l'ont
> **scellée** — par la Clé de Voûte (le verrou matériel) et par la **peur** (le
> verrou immatériel). Certaines créatures sont leur œuvre directe :
>
> - le **Basilic** est l'arme que **Salazar** laissa dans la Chambre ;
> - le **Veilleur du Seuil** est un **gardien runique** dressé sur le seuil des
>   Ruines — œuvre anonyme antérieure même aux Fondateurs, qu'ils auraient
>   *réutilisée* comme première ligne de défense ;
> - les **stèles d'énigme** (voix des Fondateurs, ✅ `riddles.js`) sont leur
>   **message gravé** à qui descendrait un jour resceller le verrou.

Les **Ruines Anciennes** (tranche D, étages 14+) sont **le territoire de la
corruption à sa source** : ni école, ni cachot, mais le **socle pré-Poudlard**.
Leurs créatures (abominations, gardiens runiques) ne « se souviennent » de rien
de l'école — elles **précèdent** tout ce que le joueur connaît.

### 9.9.3 Évolution dans la Boucle Ténébreuse

> 💡 Vaincre Voldemort **n'a pas refermé la faille — elle s'est ouverte.** Voir
> §9.9 → §9.10 (les variantes Ténébreuses).

---

## 9.10 Les variantes Ténébreuses (endgame, étages 11+)

**Rôle narratif : le château se rejoue, retourné.** Les créatures et les boss
ressuscitent en versions **« Ténébreux »** : la même horreur, mais corrompue
jusqu'à l'os, plus profonde, plus sombre.

- ✅ Les boss 8–10 reviennent en Ténébreux aux **étages 18–20** (Greyback,
  Aragog, Dolohov…), cibles des **quêtes de purge répétables** du **Gardien de
  la Boucle** (PNJ exclusif post-victoire — [06](06-pnj-et-factions.md)).
- 💡 **Sens du « Ténébreux »** : ce ne sont plus les créatures *du château*, mais
  leur **ombre projetée par les Ruines Anciennes**. Le héros n'affronte plus des
  ennemis, mais le **mythe de ses propres exploits** retourné contre lui — écho
  du thème « le mythe et son revers » ([01 §1.7](01-synopsis-et-pitch.md)).
- 💡 Piste d'écriture : un Ténébreux *cite* sa première mort (« Tu m'as déjà tué
  une fois. Cela t'a-t-il libéré ? »).

> ❓ **À arbitrer** : le préfixe « Ténébreux » reste-t-il purement cosmétique/de
> stats, ou veut-on quelques **lignes de bark dédiées** par boss recyclé pour
> incarner le retour ?

---

## 9.11 Règles d'ajout de nouvelles créatures

> Pendant de la section « Ajouter un nouveau personnage jouable »
> ([05 §5.5](05-personnages-jouables.md)) : un **garde-fou narratif** pour que
> chaque créature serve à la fois le gameplay et le lore. Le câblage technique
> est dans la skill `add-monster` et `CLAUDE.md` (« Système de monstres ») ;
> cette section couvre la **cohérence narrative**.

### 9.11.1 Checklist narrative (obligatoire)

1. **Ancrage de corruption.** La créature *réveille / retourne / aggrave* quoi ?
   Une créature « inventée de zéro et juste méchante » est un drapeau rouge —
   préférer un familier qui se fissure, une bête blessée, un mort qui ne repose
   pas, un fidèle, ou un gardien ancien (familles F1–F5).
2. **Profondeur cohérente.** `minFloor`/`maxFloor` collent au **gradient §9.1.2** :
   canon-familier en haut, cauchemardesque en bas. Un monstre « école » à
   l'étage 12 doit être justifié (recyclage Ténébreux).
3. **Une des trois signatures** (froid / peur / voix des Fondateurs) si la
   créature est dite « corrompue » : la traduire mécaniquement (`glace`, `fear`,
   ou lien à une stèle/rune).
4. **Réponse écrite.** Toute créature qui *arme* un thème doit avoir une
   **réponse** lisible (faiblesse élémentaire, sort de contre, statut dissipable).
   La peur a le Patronus ; le mort-vivant a la lumière ; la brute a la pénétration.
5. **Champs de bestiaire remplis** : `lore`, et de préférence `habitat`,
   `anecdote`, `danger` (1–11). Pas de fiche vide pour une créature majeure.
6. **Hook narratif** pour les créatures notables : drop d'**Éclat**, quête,
   antre, dialogue PNJ, ou révélation lore. Un boss **doit** en avoir un.
7. **Anti-Mary-Sue / anti-incohérence canon** : une figure canon (Greyback,
   Aragog…) reste fidèle à son caractère ([02 §2.3](02-univers-ton-et-canon.md)).
   Une créature originale ne doit pas *contredire* le canon, seulement
   **prolonger dans ses marges**.

### 9.11.2 Critères gameplay (rappel)

- **Rôle clair** : ambiance (faible danger, nombre), élite (gêne mécanique),
  boss (`epic`, phases, hook). Ne pas multiplier les « stat-sticks » sans rôle.
- **Lisibilité** : `resist`/`weak` doivent *raconter* (un mort-vivant faible à
  la lumière, un golem à la foudre). Le matching se fait sur `spell.element`.
- **Placement** via `weight` (10 commun → 1 boss). Un boss = `weight: 1` (ou `0`
  si spawn scénarisé, ex. Bibliothécaire d'Ombre).

### 9.11.3 Cohérence à maintenir

> ⚠️ La skill `add-monster`, `CLAUDE.md` (« Système de monstres ») et cette
> section doivent rester cohérents. **Amender l'une = vérifier les autres.**

---

## 9.12 Table de synthèse (étage | créature | origine | rôle)

> Lecture transversale : **origine de la corruption** × **rôle narratif**.
> (Sélection représentative — `monsters.js` fait foi pour l'exhaustif.)

| Étage | Créature | Origine narrative | Rôle |
|-------|----------|-------------------|------|
| 1–2 | Chat de Mme Norris | Familier de Rusard **retourné** (F1) | Ambiance · signal d'alarme |
| 1–4 | Lutin de Cornouailles | Nuisible d'école lâché (F1) | Tutoriel `stun` |
| 1–4 | Peeves | Poltergeist immémorial **agité** par la fêlure (F1) | Ambiance · **porte le 1ᵉʳ Éclat** ✅ |
| 1–4 | Portrait Hostile | Cadre ensorcelé par des **sympathisants** (F1/F4) | Corruption *humaine* précoce |
| 2–4 | Chouette Ensorcelée | Animal **retourné en espion** (F2) | Nuance morale |
| 4–8 | Hippogriffe en Furie | Noble **traumatisé par les Mangemorts** (F2) | Victime devenue danger · quête « Révérence » |
| 2–6 | Épouvantard | Caméléon de peur **amplifié** (F3) | Emblème du thème · pédagogie `fear` |
| 3–8 | Détraqueur | Gardien d'Azkaban **attiré par la fêlure** (F3) | Porte-étendard peur · **lâche l'Éclat de Lumière** ✅ |
| 4–8 | Inférius | Cadavre **réanimé** par un sorcier noir (F3) | Usure · faiblesse feu |
| 5+ | Mangemort Masqué | **Fidèle** descendu vers la fêlure (F4) | Escalier de menace organisée |
| 7+ | Auror Corrompu | **Gardien retourné** (F4) | Personne n'est à l'abri |
| 7+ | Mangemort d'Élite | Cercle intérieur (F4) | **Porte le 3ᵉ Éclat** ✅ |
| 6+ | Basilic Mineur | Arme de **Salazar Serpentard** (F5) | Œuvre de Fondateur retournée |
| 5+/8+ | Acromantule | Lignée d'**Aragog** durcie (F2→F5) | Naturel → monstrueux · purge endgame |
| 6+ | Strigoï Ancien | Prédateur **pré-Poudlard** muré (F3/F5) | Strates anciennes |
| 8 | **Fenrir Greyback** ✅`epic` | Loup-garou de Voldemort, gardien de route (F4) | 1ᵉʳ boss canon · boss enragé |
| 8 | **Veilleur du Seuil** ✅`epic` | Gardien **runique pré-Poudlard** (F5) | Seuil interdit · graine des Ruines |
| 9 | **Aragog** ✅`epic` | Patriarche de la colonie (F5) | Boss territorial · purge endgame |
| 9 | Voldemort Affaibli ✅`epic` | Fragment **incomplet** (F4) | Premier contact |
| 9 | Maître des Détraqueurs ✅`epic` | Figure tutélaire d'Azkaban (F3/F5) | Sommet du désespoir |
| 10 | **Antonin Dolohov** ✅`epic` | Lieutenant méthodique (F4) | Dernière marche avant le maître |
| 10 | **Héraut des Ténèbres** ✅`epic` | **Annonciateur** de la résurrection (F5) | Dernier seuil · peur rituelle |
| 10 | **Voldemort Ressuscité** ✅`epic` | Ce que la **Clé de Voûte** retenait (F4) | **Climax** · phases · variantes Maison |
| 18–20 | Boss « Ténébreux » | **Ombre projetée par les Ruines** (F5) | Le mythe du héros retourné |

---

## Récapitulatif express (pour briefer un assistant rédactionnel)

> 67 créatures, **5 familles narratives** : (F1) créatures de l'école qui se
> retournent, (F2) bêtes/créatures magiques territoriales ou blessées, (F3)
> morts-vivants & malédictions = thème **peur**, (F4) forces humaines de
> Voldemort = escalier de menace → boss canon → Voldemort (ét. 10), (F5) bêtes
> mythiques/gardiens anciens/abominations = mémoire pré-Poudlard. **Origine
> commune** : la corruption pré-Poudlard que la **Clé de Voûte des Quatre** tenait
> scellée, qui *réveille/retourne/aggrave* — trois signatures : **froid
> surnaturel**, **peur comme sceau**, **voix des Fondateurs**. Les **Éclats**
> (✅ `eclat_voute`, `eclat_lumiere`) sont des fragments arrachés à la source.
> Les **boss originaux** sont des **gardiens de seuil** (Veilleur, Héraut, Maître
> des Détraqueurs…). En **Boucle Ténébreuse**, tout revient en **« Ténébreux »** :
> le château se rejoue retourné contre la légende du héros.

---

# ÉTAPE 2 — Plan d'implémentation

> Objectif technique : transformer le lore ci-dessus en **systèmes** sans casser
> l'architecture zéro-dépendance / zéro-build. La plupart des briques **existent
> déjà** (✅) ; ce plan distingue ce qui est acté de ce qui est à construire (🔧).

## I. Structure des fichiers de données

> Principe : **ne pas créer de nouveau format.** `monsters.js` reste la **source
> unique** des créatures (cf. `CLAUDE.md` « Système de monstres »). Le lore
> s'ajoute en **champs optionnels** sur l'objet monstre existant.

| Donnée | Fichier | État |
|--------|---------|------|
| Créatures (stats, capacités, `lore`/`habitat`/`anecdote`/`danger`) | `js/monsters.js` | ✅ existe |
| Éclats (`eclat_voute`, `eclat_lumiere`, `eclat_vitalite`…) | `js/data.js` (`ITEMS`) | ✅ existe |
| Stèles / voix des Fondateurs | `js/riddles.js` (`r_clef_voute`) | ✅ existe |
| Quêtes liées (Éclats, purges) | `js/quests-templates.js` + `state.js` | ✅ existe |
| Familles narratives F1–F5 | 🔧 champ optionnel `loreFamily: "F3"` sur le monstre | 🔧 à ajouter (pur tag, filtrable bestiaire) |
| Niveau de corruption | 🔧 champ optionnel `corruption: 0–3` (lecture narrative du gradient §9.1.2) | 🔧 à ajouter (cosmétique : teinte/givre/SFX) |

> 💡 `loreFamily` et `corruption` sont **purement additifs et optionnels** : un
> monstre sans ces champs garde son comportement actuel. Aucune migration de
> save (champs dérivés à l'affichage, non sérialisés).

## II. Variables & flags nécessaires

| Variable / flag | Portée | Rôle | État |
|-----------------|--------|------|------|
| `seenMonsters` (Set) | `state.js`, sérialisé | Bestiaire : créatures rencontrées | ✅ existe |
| `eclat_voute` ×3 (inventaire) | item | Fil rouge Clé de Voûte | ✅ existe |
| `eclat_lumiere` | item (drop mort-vivant) | Matériau anti-désespoir | ✅ existe |
| `creatureCorruptionLevel(monster, floor)` | 🔧 helper pur (`dungeon-scaling.js`) | Dérive `corruption` 0–3 depuis `effectiveFloor` + tag | 🔧 à ajouter |
| `eclatDropRate(monster, floor)` | 🔧 helper pur | Module le drop d'Éclat selon la profondeur (early garanti sur jalon, scaling ensuite) | 🔧 à ajouter (sinon `drops[].chance` fixe actuel ✅) |
| `houseSpecificVariant(monster)` | 🔧 helper pur | Renvoie un modificateur cosmétique/léger selon `chosenHouse` (cf. §9.8 variantes) | 🔧 à ajouter (défensif, no-op si absent) |
| `loreCodexUnlocked` (Set d'ids) | 🔧 `state.js`, sérialisé | Entrées de codex déverrouillées (≥ `seenMonsters`, + révélations lore) | 🔧 à ajouter |
| `victoryAchieved` | `state.js` | Gate Boucle Ténébreuse / variantes Ténébreux | ✅ existe |

> ⚠️ Tout nouveau global critique → l'ajouter au **MANIFEST de `loader.js`**
> (`CLAUDE.md` « Loader & helpers »). Helpers purs → couvrir par `tests/units.js`.

## III. Intégration avec la génération procédurale

- ✅ Placement par `minFloor`/`maxFloor`/`weight` (`dungeon.js` + `weightedPick`).
- ✅ Recyclage endgame via `effectiveFloor(floor)` (Boucle Ténébreuse) — déjà la
  base des variantes « Ténébreux ».
- 🔧 **Surcouche corruption** : dans `scaleMonster` (`dungeon-scaling.js`),
  calculer `corruption = creatureCorruptionLevel(...)` et l'exposer sur l'instance
  scalée (consommé par le **rendu** : teinte/givre, et par l'**audio** : SFX
  froid). Pur, pas de nouvelle passe de génération.
- 🔧 **Antres / mini-events** (§9.8 hooks) : réutiliser le système de **cellules
  spéciales** (coffre/stèle/rune) plutôt que d'inventer une couche — un « antre »
  = une room avec un boss `weight:0` scénarisé + un coffre/Éclat (cf.
  `dungeon-spawning.js — spawnQuestMonsters`).

## IV. Système de lore codex / journal (déverrouillage progressif)

- ✅ **Base existante** : `openBestiary()` / `showMonsterDetail()` (`ui-bestiary.js`)
  affiche `lore`/`habitat`/`anecdote`/`danger`, gated par `seenMonsters`.
- 🔧 **Codex étendu** : ajouter à la fiche bestiaire un encart **« Lore profond »**
  déverrouillé par paliers (`loreCodexUnlocked`) :
  - palier 1 (rencontre) : `lore` actuel ✅ ;
  - palier 2 (N kills **ou** drop d'Éclat lié) : `loreFamily` + **origine de la
    corruption** (§9.8) ;
  - palier 3 (quête/stèle liée résolue) : **révélation** (lien Fondateurs/Ruines).
- 🔧 Filtre **par famille narrative F1–F5** dans `filterBestiary()` (en plus des
  filtres nom/catégorie/étage existants).
- 💡 Entrées de **codex non-créature** : Clé de Voûte, Éclats, Fondateurs,
  Ruines — alimentées par les stèles (`riddles.js`) et la chaîne Dumbledore.
  Réutiliser le conteneur bestiaire (onglet « Lore »).

## V. Gestion des boss & événements narratifs

- ✅ **Boss `epic`** + **phases** (`_checkBossPhases`) : Voldemort, Basilic.
  Étendre le tableau `phases` aux boss qui le méritent (Héraut, Aragog).
- ✅ **Spawn scénarisé** (`weight:0`) : Bibliothécaire d'Ombre (quête grimoire).
  Modèle pour tout boss d'antre.
- 🔧 **Événements de seuil** : le Veilleur (§9.8.13) gagnerait à pouvoir être
  **pré-affaibli** par une stèle résolue → hook `houseSpecificVariant` /
  flag de stèle lu dans `scaleMonster`.
- 🔧 **Barks Ténébreux** (❓ §9.10) : si validé, ajouter des répliques one-shot
  par boss recyclé via `hero-barks.js` côté ennemi (ou un nouveau registre
  `BOSS_BARKS` défensif). **Décision utilisateur requise** avant de coder.

## VI. Intégration quêtes signature / fil rouge Éclats / dialogues conditionnels

- ✅ **Fil rouge Éclats** : `eclats_clef_voute` (3 `eclat_voute`, drops jalons
  Peeves 1-3 / Loup-Garou 4-6 / Mangemort d'Élite 7-10) — déjà câblé.
- ✅ **Stèle des Fondateurs** `r_clef_voute` (voix des Fondateurs) — relais lore.
- ✅ **Purges répétables** (Gardien de la Boucle) ciblant les Ténébreux 18–20.
- 🔧 **Dialogues conditionnels PNJ ↔ créature** (§9.8 hooks) : Hagrid/Aragog,
  Bill/Greyback, Kingsley/Auror Corrompu, Lupin/Greyback. Via `getNpcQuestState`
  + pages de dialogue gated par `defeatedBosses` / `seenMonsters`
  (`npc-dialog.js`). **Données pures**, pas de moteur neuf.
- 🔧 **Variantes Maison légères** (§9.8) : un seul point d'entrée
  `houseSpecificVariant(monster)` lu au scaling, gardé défensif (no-op hors
  `chosenHouse` concerné) — maximise la **rejouabilité** sans brancher l'arc.

## VII. Priorisation (ordre de réalisation)

1. **Quick wins data-only (zéro risque)** : ajouter `loreFamily` aux monstres,
   remplir les `lore`/`habitat`/`anecdote`/`danger` manquants, brancher le filtre
   famille au bestiaire. → *valeur immédiate, aucun système neuf.*
2. **Codex progressif** (`loreCodexUnlocked` + encart « Lore profond »). → sert
   directement l'objectif « descente dans l'inconnu » dévoilée par paliers.
3. **Surcouche corruption cosmétique** (`creatureCorruptionLevel` → teinte/givre/
   SFX). → renforce le gradient §9.1.2 visuellement.
4. **Dialogues conditionnels PNJ ↔ créature** + **hooks d'antre** (réutilisent
   l'existant). → profondeur narrative.
5. **Variantes Maison/héros** (`houseSpecificVariant`) + **barks Ténébreux**
   (❓ après arbitrage utilisateur). → rejouabilité, en dernier (touche le combat).

> Garde-fous transverses : chaque helper pur → `tests/units.js` ; tout changement
> JS/CSS → **bump cache PWA** (skill `cache-bump`) + `node tests/smoke.js`
> (guidelines §7/§8). Les étapes 1–2 sont **data/doc** : faible risque.

## VIII. Suggestions d'assets

| Type | Besoin | Piste |
|------|--------|-------|
| **Sprites** | Variantes « Ténébreux » des boss 8–10 (re-teinte froide + givre + fissures) | Re-gen Nano Banana à partir des PNG existants ; **placeholder** = filtre CSS `hue-rotate` + overlay givre (déjà faisable sans asset neuf) |
| **Icônes** | « Éclat de Lumière » / « Éclat de la Clé de Voûte » | ✅ existent (`img/icons/...`) — vérifier la cohérence visuelle givre/lumière |
| **SFX** | « froid surnaturel » : souffle glacé bref à l'apparition d'une créature corrompue (`corruption ≥ 2`) | `audio-sfx.js` — bruit filtré HPF + reverb, déclenché dans `startBattle` |
| **Voix** | « voix des Fondateurs » sur les stèles (murmure FR) | Optionnel via `AudioSystem.speakBark` / OGG ; défensif (silencieux si absent) |
| **Texte** | Descriptions de codex « Lore profond » (paliers 2–3) par créature majeure | Rédaction à partir des fiches §9.8 (déjà écrites ici) |
| **Animation** | Halo de givre pulsé sur sprite corrompu (réutilise la boucle d'anim PNJ `_npcAnimPhase`) | Aucune lib — canvas, même mécanique que l'aura PNJ |

---

## Objectifs finaux — comment ce chapitre les sert

- **Menace mécanique *et* narrative** : chaque fiche §9.8 lie une **capacité de
  combat** à une **origine de corruption** et à une **réponse écrite** (faiblesse/
  sort/statut). Le joueur *comprend* ce qu'il combat.
- **Descente dans l'inconnu & corruption progressive** : le **gradient §9.1.2**
  (canon → cauchemar) + la surcouche corruption cosmétique + le codex à paliers
  rendent la profondeur **lisible et ressentie**.
- **Rejouabilité** : les **variantes Maison/héros légères** (`houseSpecificVariant`)
  et les barks Ténébreux ajoutent une couche perceptible sans jamais brancher
  l'arc en deux.
- **Cohérence projet** : tout s'ancre sur l'existant (Clé de Voûte [03], Éclats
  [08], Ruines/Fondateurs [02], Boucle [03/06], Maisons [07]) et **aucune
  brique ne contredit** `monsters.js` ni le canon ([02 §2.3]).

---

## Points à trancher (résumé)

1. ❓ Barks dédiés pour les boss recyclés en « Ténébreux » (§9.10) — purement
   cosmétique de stats, ou répliques one-shot ? *(décision avant codage VII.5)*
2. ❓ Distorsion visuelle des Ténébreux : re-teinte+givre (placeholder CSS) ou
   re-génération de sprites dédiés (§9.1.2 / VIII) ?
3. ❓ Profondeur du codex : s'arrêter au palier 2, ou implémenter le palier 3
   (révélations Fondateurs/Ruines liées aux stèles) ?
4. 💡 Enrichir le lore des créatures à champs encore vides, et/ou ajouter
   quelques créatures inédites au service direct du récit (abominations des
   Ruines, tranche D) ?
