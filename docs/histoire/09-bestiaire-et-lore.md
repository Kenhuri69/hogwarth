# 09 — Bestiaire & lore des créatures

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : l'origine et le rôle **narratif** des créatures (le détail
> chiffré — stats, capacités — relève du gameplay). `💡` = proposition de
> lore modifiable ; `✅` = acté dans le jeu (`js/monsters.js`).
>
> Voir la descente acte par acte en [03](03-trame-principale.md), la
> géographie des lieux où on les croise en [10](10-lieux-et-geographie.md),
> et les figures humaines nommées (Bellatrix, Dolohov, Greyback…) côté
> antagonistes en [06](06-pnj-et-factions.md).

---

## 9.0 Cadre (✅ dans le jeu)

- **~67 créatures** réparties par tranche d'étages, du familier (étage 1) à
  l'abyssal (étage 14+). Chacune a un **niveau de danger** affiché (1–11).
- **5 catégories** mécaniques : `bête`, `humain`, `fantôme`, `créature`,
  `être magique`. Elles ne sont **pas** les familles narratives ci-dessous —
  ce chapitre regroupe par **sens dans le récit**, pas par tag moteur.
- **Boss `epic`** : créatures uniques, plus puissantes, qui jalonnent la
  descente. Le bestiaire affiche déjà des champs de lore (`lore`, `habitat`,
  `anecdote`, `danger`).
- **Boucle Ténébreuse** (étages 11+) : le château recycle ses créatures et
  ses boss en variantes **« Ténébreux »** (voir §9.7).

> 💡 **Principe directeur du lore.** La corruption qui remonte des
> profondeurs n'invente pas de monstres : elle **réveille, retourne ou
> aggrave** ce qui dormait déjà à Poudlard. Une chouette espionne, un
> portrait insulte, un gardien de pierre s'anime contre vous. Le familier
> devient hostile — c'est la signature de l'univers.

---

## 9.1 Famille — Les créatures de l'école (étages 1–3)

> 💡 (proposition) / ✅ (créatures actées)

**Rôle narratif : le familier qui se fissure.** Ce sont les habitants connus
du château, ceux qu'un élève croise tous les jours. Leur agressivité soudaine
est le **premier symptôme** que quelque chose, en bas, est en train de
réveiller le château contre les siens. Faible danger, fonction d'**ambiance et
de tutoriel**.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Chat de Mme Norris | 1–2 | La sentinelle de Rusard, devenue hostile : signal d'alarme |
| Bowtruckle Géant | 1–3 | Gardien d'arbre à baguettes ; protecteur paisible rendu farouche |
| Cornichon de Cornouailles | 1–3 | Les nuisibles du cours de Lockhart, lâchés dans les couloirs |
| Lutin de Cornouailles | 1–4 | Tapageur bleu vif ; premier porteur de **l'étourdissement** |
| Luciole des Marais | 1–3 | Inoffensive en apparence, aveuglante de près |
| Peeve le Poltergeist | 1–4 | L'esprit frappeur immémorial ; humour et chaos |
| Mimi Geignarde | 1–3 | Fantôme triste des toilettes ; aussi **donneuse de quête** ([06](06-pnj-et-factions.md)) |
| Portrait Animé Hostile | 1–4 | Cadres ensorcelés par des sympathisants — la corruption est aussi **humaine** |
| Serpent des Cachots | 1–5 | Vestige de Salazar ; répond au Fourchelang — annonce le Basilic |

> 💡 Mimi et Peeves sont des **figures à double face** : ennemis d'ambiance ET
> personnages du château. Le jeu en tire déjà parti (Mimi confie la quête du
> troll). On peut jouer sur l'ambivalence — un fantôme qu'on combat puis à qui
> l'on parle.

---

## 9.2 Famille — Bêtes & créatures magiques (le bestiaire « naturel »)

> 💡 (proposition) / ✅ (créatures actées)

**Rôle narratif : le monde sauvage qui déborde.** Créatures de la Forêt
Interdite, des serres, des douves, des marécages — la lisière magique de
Poudlard, qui s'infiltre à mesure qu'on descend. Beaucoup ne sont pas
*méchantes* : elles sont **territoriales, blessées, ou affamées**. C'est la
nuance morale du bestiaire — toute hostilité n'est pas de la corruption.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Chouette Ensorcelée | 2–4 | Animal paisible **retourné en espion** par les Mangemorts |
| Mandragore Sauvage | 2–5 | Plante de cours devenue agressive faute de soin |
| Kappa des Douves | 2–6 | Démon aquatique japonais installé sous le château |
| Strangulot | 3–7 | Petit démon des douves ; immobilise pour noyer |
| Niffleur | 2–5 | Voleur d'objets brillants — comique et **vole vos Gallions** |
| Bundimun Venimeux | 3–6 | Parasite qui dissout la matière — ronge même l'armure |
| Araignée Géante | 2–7 | Descendance d'Aragog ; annonce les Acromantules profondes |
| Centaure Hostile | 3–7 | Tout centaure n'est pas bienveillant : on viole son territoire |
| Hippogriffe en Furie | 4–8 | Fier, **traumatisé par les Mangemorts** : sa rage est une blessure |
| Manticore Juvénile | 6+ | Mi-lion mi-scorpion ; l'une des plus dangereuses, déjà mortelle jeune |
| Chauve-Souris Vampire | 2–6 | Prédateur nocturne qui saigne sa proie sans la tuer |
| Loup-Garou Adulte | 8+ | Lycanthrope à pleine maturité, sans potion Tue-Loup |

> 💡 **Pitiponk** (4–8) et **Gargouille Éveillée** (5–10) appartiennent autant
> à cette famille qu'aux gardiens du château : la Gargouille est une **sculpture
> de garde** réveillée, le Pitiponk un feu follet trompeur des marécages
> souterrains. Tous deux portent l'**étourdissement**.

---

## 9.3 Famille — Morts-vivants, fantômes & malédictions

> 💡 (proposition) / ✅ (créatures actées)

**Rôle narratif : le froid et le désespoir.** C'est la famille thématique de la
**peur** — fil rouge du récit ([01 §1.7](01-synopsis-et-pitch.md)). Plus on
descend, plus la mort cesse d'être un fait et devient une **présence**. Cette
famille concentre les statuts **peur** et **saignement**, et la faiblesse
narrative au **Patronus** / à la **lumière**.

| Créature | ✅ Étages | Rôle narratif |
|----------|----------|---------------|
| Épouvantard | 2–6 | Prend la forme de votre pire peur ; emblème littéral du thème |
| Détraqueur | 3–8 | Se nourrit du bonheur ; revivre ses pires souvenirs — repoussé par le Patronus |
| Inférius | 4–8 | Cadavre réanimé par un sorcier noir ; ne craint que le feu |
| Chevalier Fantôme | 4–9 | Gardien condamné à veiller pour l'éternité |
| Fantôme du Sang Noir | 3–8 | Esprit d'un puriste mort en combattant Dumbledore |
| Poupée Maudite | 3–7 | Réceptacle d'une malédiction de vengeance — magie de douleur |
| Spectre Maudit | 5+ | Âme punie d'éternité, ni morte ni en repos |
| Spectre Renforcé | 9+ | Vestige assez puissant pour **matérialiser ses coups** |
| Détraqueur d'Élite | 8+ | Détraqueur vétéran qui éteint les souvenirs heureux |
| Vampire Novice | 4–8 | Fraîchement transformé, vorace, vulnérable au feu/à la lumière |
| Strigoï Ancien | 6+ | Vampire antique à magie du sang, draine à distance |

> 💡 **Articulation avec le gameplay** : les sorts de **lumière** (Lumos Solem,
> ×1.5 contre les morts-vivants) et le **Patronus** (palier de Maison 17, dissipe
> la peur) sont les réponses *écrites* à cette famille. Le bestiaire et l'arbre
> de sorts racontent la même histoire : contre le désespoir, on oppose un
> souvenir heureux. → [08](08-quetes-et-sous-intrigues.md) (Lumière Éternelle).

---

## 9.4 Famille — Les forces de Voldemort (la corruption *humaine*)

> 💡 (proposition) / ✅ (créatures actées)

**Rôle narratif : la preuve que le mal a des fidèles.** Là où les autres
familles disent « le château se réveille », celle-ci dit « **des gens
veulent ça** ». Elle monte en gamme avec la descente — du masque anonyme au
cercle intérieur nommé — et culmine en Voldemort. C'est l'**escalier de la
menace organisée**.

| Échelon | ✅ Étages | Sens narratif |
|---------|----------|---------------|
| Gobelin Rebelle | 2–6 | Gringotts a ses traîtres ; premiers ralliés |
| Sorcière des Ténèbres | 4–9 | A vendu son âme contre le pouvoir |
| Mangemort Masqué | 5+ | La piétaille marquée — la corruption est servie par des humains |
| Sorcier Renégat | 5+ | Ancien élève brillant de Serpentard tombé |
| Auror Corrompu | 7+ | Le **gardien retourné** : il manie les sorts qu'il combattait |
| Hécate la Maudisseuse | 7+ | Exclue de Poudlard pour magie interdite ; recrute des apprentis |
| Mangemort Vétéran | 9+ | De la Première Guerre ; cruauté intacte |
| Mangemort d'Élite | 7+ | Cercle intérieur ; maîtrise des Impardonnables |

### Les figures nommées (boss `epic` canon)

> 💡 Ces boss sont les **jalons** de l'arc principal : chacun tombé
> « affaiblit le sceau » et densifie la présence de Voldemort
> ([03 §3.4](03-trame-principale.md)).

- **Fenrir Greyback** (ét. 8, `epic`) — Le loup-garou qui aimait mordre les
  enfants. **Premier boss canon** ; sa **Rage Lunaire** (sursaut de fureur à
  faible PV) en fait l'apprentissage du combat de boss enragé.
- **Bellatrix Lestrange** (ét. 8, `epic`) — La fanatique. Porte l'**Avada
  Kedavra** et le **Finite Incantatem** : elle apprend au joueur que ses buffs
  peuvent être balayés. Cruauté pure du cercle intérieur.
- **Antonin Dolohov** (ét. 10, `epic`) — Le lieutenant méthodique au **maléfice
  violet** signature. Gardien de la dernière marche avant le maître.
- **Nagini** (ét. 7, `epic`) — Le serpent-horcruxe, ancienne sorcière maudite.
  Narrativement, **un fragment d'âme de Voldemort** déjà présent dans la
  descente : un avant-goût du maître.
- **Voldemort Affaibli** (ét. 8/9, `epic`) — Le **premier contact**, un spectre
  encore incomplet : le joueur le rencontre *avant* qu'il ne soit reformé.
- **Voldemort Ressuscité** (ét. 10, `epic`, danger 11) — **Le climax.** Pleinement
  reconstitué, Avada à 70 %, invoque Nagini pour se soigner. Sa chute déclenche
  la cinématique de victoire et scelle l'arc principal
  ([03 §3.5](03-trame-principale.md)).

---

## 9.5 Famille — Bêtes mythiques & héritage de Serpentard

> 💡 (proposition) / ✅ (créatures actées)

**Rôle narratif : la mémoire profonde du château.** Ces créatures rares
appartiennent aux strates anciennes — l'œuvre des Fondateurs, ou des monstres
de légende que Poudlard a enfouis plutôt qu'éliminés.

- **Basilic Mineur** (ét. 6+, `epic`) — Serpent créé par **Salazar Serpentard**
  lui-même ; le regard tue, répond au Fourchelang. Pierre angulaire de la
  Chambre des Secrets ([10 §10.2](10-lieux-et-geographie.md)).
- **Chimère de Poudlard** (ét. 6+, `epic`) — Monstre mythologique « vaincu une
  seule fois dans l'histoire » : un trophée de légende dans les Profondeurs.
- **Ombre de Quirrell** (ét. 6+, `epic`) — Le revenant du professeur qui portait
  Voldemort sous son turban ; cherche encore la Pierre Philosophale. **Écho
  hanté du canon** dans les couloirs.
- **Jeune / Adulte Acromantule** (ét. 5+ / 8+) — La lignée d'Aragog qui prospère
  sous le château : le bestiaire « naturel » devient monstrueux en profondeur.

---

## 9.6 Boss originaux — les gardiens inventés

> 💡 (proposition de rôle) / ✅ (créatures actées, `epic`)

Ces boss n'existent pas dans le canon : ce sont des **gardiens de seuil**,
inventés pour donner une identité aux paliers profonds et à la Boucle. Leur
fonction commune : **interdire un franchissement**.

- **Veilleur du Seuil** (ét. 8, `epic`) — Gardien antique scellé dans la pierre
  par des **runes antérieures à Poudlard**. Il garde l'accès aux Profondeurs et
  **n'autorise nul passage**. C'est lui qui établit, dès l'étage 8, que *quelque
  chose précède l'école* — préfiguration des Ruines Anciennes.
- **Maître des Détraqueurs** (ét. 9, `epic`) — Figure tutélaire des Détraqueurs
  d'Azkaban ; le boss-sommet de la famille du désespoir.
- **Gardien du Portail** (ét. 5+) — Golem créé par un ancien directeur pour
  sceller les zones interdites ; gardien d'ambiance des passages secrets.
- **Héraut des Ténèbres** (ét. 10, `epic`) — Annonciateur : il ne combat pas
  pour vaincre mais pour **préparer l'arrivée du Maître**. Sa litanie corrompt
  l'air. Dernier souffle avant Voldemort.
- **le Bibliothécaire d'Ombre** (`epic`, `weight: 0` — spawn scénarisé) — Ancien
  bibliothécaire consumé par un **grimoire de lumière** qu'il ne sut jamais
  lire. Boss de la sous-intrigue du **grimoire d'Élara** (Manon) — invoqué par
  la quête, pas par le hasard. → [08](08-quetes-et-sous-intrigues.md).

> 💡 Le Veilleur et le Bibliothécaire forment un **diptyque sur le savoir
> interdit** : l'un scelle ce qu'on ne doit pas franchir, l'autre est détruit
> par ce qu'on ne sait pas lire. Tous deux annoncent la tranche D.

---

## 9.7 Les variantes Ténébreuses (endgame, étages 11+)

> 💡 (proposition de sens) / ✅ (mécanique actée)

**Rôle narratif : le château se rejoue, retourné.** Vaincre Voldemort n'a pas
refermé la faille — elle s'est **ouverte**. Les créatures et les boss
ressuscitent en versions **« Ténébreux »** : la même horreur, mais corrompue
jusqu'à l'os, plus profonde, plus sombre.

- ✅ Les boss 8–10 reviennent en Ténébreux aux **étages 18–20** (Greyback,
  Aragog, Dolohov…), cibles des **quêtes de purge répétables** du **Gardien de
  la Boucle** (PNJ exclusif post-victoire — [06](06-pnj-et-factions.md)).
- 💡 **Sens du « Ténébreux »** : ce ne sont plus les créatures *du château*,
  mais leur **ombre projetée par les Ruines Anciennes**. Le héros n'affronte
  plus des ennemis, mais le **mythe de ses propres exploits** retourné contre
  lui — écho du thème « le mythe et son revers » ([01 §1.7](01-synopsis-et-pitch.md)).
- 💡 Piste d'écriture : un Ténébreux pourrait *citer* sa première mort (« Tu
  m'as déjà tué une fois. Cela t'a-t-il libéré ? »).

> ❓ À arbitrer : le préfixe « Ténébreux » reste-t-il purement cosmétique/de
> stats, ou veut-on quelques **lignes de bark dédiées** par boss recyclé pour
> incarner le retour ?

---

## 9.8 Modèle de fiche lore (exemples)

> Gabarit pour enrichir une créature dont le bestiaire a des champs vides.

```
### <Créature>
- Catégorie (moteur) / famille narrative / danger :
- Où on la rencontre (étages, habitat) :
- Lore (qui/quoi est-ce dans cet univers) :
- Rôle narratif (ambiance / jalon de trame / boss) :
- Anecdote (clin d'œil canon) :
```

### Détraqueur (✅ fiche exemplaire, déjà riche)
- **Catégorie / famille / danger** : être magique / Morts-vivants & désespoir / **9**.
- **Où** : étages 3–8, couloirs froids et profondeurs.
- **Lore** : se nourrit littéralement du bonheur ; sa présence force à revivre
  ses pires souvenirs. Seul le **Patronus** le repousse.
- **Rôle narratif** : porte-étendard du thème de la **peur**. Pivot de l'arc de
  la **Lumière Éternelle** ([08](08-quetes-et-sous-intrigues.md)).
- **Anecdote** : gardiens d'Azkaban dans le canon ; ici, ils ont quitté la
  prison pour le château corrompu.

### Hippogriffe en Furie (💡 enrichissement proposé)
- **Catégorie / famille / danger** : créature / Bêtes & créatures magiques / **7**.
- **Où** : étages 4–8, galeries hautes des Profondeurs.
- **Lore** : créature noble qui exige une révérence — **blessée et traumatisée
  par les Mangemorts**, sa méfiance est devenue rage aveugle.
- **Rôle narratif** : la **victime devenue danger** — incarne que la corruption
  fait des dégâts collatéraux, pas que des fidèles. 💡 Une quête pourrait
  permettre de l'**apaiser** plutôt que le tuer (révérence / soin).
- **Anecdote** : écho direct de Buck (Buveur-de-Mort) sauvé par Harry et Hermione.

### Veilleur du Seuil (💡 enrichissement proposé)
- **Catégorie / famille / danger** : être magique / Boss originaux / **9** (`epic`).
- **Où** : étage 8, seuil des Profondeurs Oubliées.
- **Lore** : automate de pierre scellé par des **runes antérieures à la
  fondation de Poudlard**. Il ne hait pas — il **applique une interdiction**
  vieille de mille ans.
- **Rôle narratif** : premier indice que *quelque chose précède l'école* ;
  graine narrative des **Ruines Anciennes** (tranche D).
- **Anecdote** : 💡 ses runes pourraient être les mêmes que celles des
  dalles-puzzle et des Ruines — un fil visuel à tirer ([10](10-lieux-et-geographie.md)).

---

## Récapitulatif express (pour briefer Gemini)
> 67 créatures, regroupées en **5 familles narratives** : (1) créatures de
> l'école qui se retournent, (2) bêtes/créatures magiques territoriales ou
> blessées, (3) morts-vivants & malédictions = thème de la **peur**, (4) forces
> humaines de Voldemort = escalier de menace organisée → boss canon → Voldemort
> (ét. 10), (5) bêtes mythiques/héritage de Serpentard. Les **boss originaux**
> sont des **gardiens de seuil** inventés (Veilleur, Héraut, Maître des
> Détraqueurs…). En **Boucle Ténébreuse**, tout revient en variantes
> **« Ténébreux »** : le château se rejoue retourné contre la légende du héros.

## Points à trancher (résumé)
1. Barks dédiés pour les boss recyclés en « Ténébreux » (§9.7) ?
2. Enrichir le lore des créatures à champs vides, et/ou ajouter des créatures
   inédites au service du récit ?
