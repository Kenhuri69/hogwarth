# 05 — Personnages jouables

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : donner à chaque héros sélectionnable une **personnalité, un rôle
> et un arc**. Le casting mêle figures canon et créations originales. `✅` = acté
> dans le jeu (`js/data.js` — `CHARACTERS`, taglines, stats et sorts exacts) ;
> `💡` = proposition de fond narratif, librement modifiable ; `❓` = à arbitrer.
> Voir la trame en [03](03-trame-principale.md), les Maisons en
> [07](07-les-maisons.md), les Quêtes Signature en
> [08 §8.5](08-quetes-et-sous-intrigues.md).

> 📌 **Convention de lecture des champs (par héros)** :
> - **Maison / rôle, sorts, stats, tagline** = `✅` (verbatim `CHARACTERS`).
> - **Apparence** = `💡` dérivée des attributs `✅` (baguette / robe / accessoire /
>   icône) — saveur, jamais contredite par le code.
> - **Forces / faiblesses** = `✅` (lecture directe du bloc de stats).
> - **Année scolaire, personnalité, voix, motivation, arc, interactions** = `💡`.

---

## 5.0 Roster (✅ dans le jeu — `CHARACTERS`)

| Clé | Nom | Maison (canon) | Rôle ✅ | Sorts de départ ✅ | Origine |
|-----|-----|--------|------|----------------------|---------|
| `harry` | Harry Potter | Gryffondor | Auror | Expelliarmus, Stupefix, Episkey, Protego, Incendio | canon |
| `hermione` | Hermione Granger | Gryffondor | Mage | Episkey, Protego, Incendio, Accio | canon |
| `draco` | Drago Malefoy | Serpentard | Duelliste | Expelliarmus, Stupefix, Protego, Episkey | canon |
| `cho` | Cho Chang | Serdaigle | Attrapeuse | Expelliarmus, Stupefix, Protego, Episkey | canon |
| `cedric` | Cedric Diggory | Poufsouffle | Champion | Expelliarmus, Stupefix, Protego, Episkey | canon |
| `celeste` | Céleste Luneclair | Serdaigle | Astromage | Episkey, Protego, Lumos Maxima, Aguamenti | original |
| `iris` | Iris Prismara | Poufsouffle | Enchanteresse | Expelliarmus, Protego, Incendio, Riddikulus | original |
| `maxence` | Maxence Ravenwood | Serpentard | Mage de Sang | Episkey, Protego, Sanguini, Stupefix | original |
| `anastasia` | Anastasia Moonveil | Gryffondor | Mage de la Lune | Episkey, Protego, Wingardium Leviosa, Lumos Maxima | original |
| `louis` | Louis Dragonflamme | Poufsouffle | Dompteur de Dragons | Expelliarmus, Protego, Incendio, Episkey | original |
| `jeanne` | Jeanne d'Argenciel | Gryffondor | Charmeuse de Sortilèges | Wingardium Leviosa, Protego, Episkey, Lumos Maxima | original |
| `agathe` | Agathe Lumiflore | Gryffondor | Enchanteresse florale | Episkey, Ferula, Wingardium Leviosa, Protego | original |
| `olivier` | Olivier de Clairval | Serdaigle | Mage de combat | Incendio, Stupefix, Protego, Episkey | original |
| `nathalie` | Nathalie Finch | Poufsouffle | Gardienne-Herboriste | Episkey, Protego, Ferula, Incendio | original |
| `chatillon` | Olivier de Châtillon | Serpentard | Ombremancien | Expelliarmus, Stupefix, Protego, Incendio | original |
| `margaux` | Margaux Aiglebrume | Serdaigle | Astromancienne | Protego, Episkey, Lumos Maxima, Wingardium Leviosa | original |

> ✅ Le jeu se joue **solo (1)** ou **duo (2)**. Le duo par défaut est
> **Harry + Hermione**. Les 16 héros partagent la même paire de slots à l'écran
> de sélection ; n'importe quel binôme est jouable.

> 💡 **Note de design narratif** : les 5 figures canon servent d'« ancrage »
> familier ; les 11 originaux sont la marge de manœuvre de la spec — c'est par
> eux qu'on installe les enjeux **intimes** évoqués en [03 §3.7](03-trame-principale.md)
> sans réécrire le canon.

> ⚠️ **Maison canon vs `chosenHouse`** : la colonne *Maison* ci-dessus est de la
> **saveur canon** (Harry → Gryffondor…). Mécaniquement, le jeu a un **unique**
> `chosenHouse` choisi au démarrage, qui pilote bonus, set, prestige **et la Quête
> Signature** ([07 §7.8](07-les-maisons.md) / [08 §8.5](08-quetes-et-sous-intrigues.md)).
> En duo, la signature suit ce `chosenHouse` partagé ; le héros dont la Maison canon
> **diffère** peut lâcher des **barks de saveur** commentant la tension (un
> Gryffondor-canon qui réagit au *Pacte des Cachots* sur une partie Serpentard) —
> récompense de **rejouabilité** pour qui refait le jeu avec une autre Maison.
> Un vrai « deux Maisons simultanées » serait un refactor (`chosenHouse` par perso) —
> **❓ hors-scope** (cf. [08 §8.5.3](08-quetes-et-sous-intrigues.md)).

### 5.0.1 Profil de combat en un coup d'œil (✅ — d'après `CHARACTERS`)

> Lecture rapide des stats de départ pour orienter le choix. *Spé.* = vecteur
> dominant ; *Fragilité* = stat la plus basse à surveiller.

| Héros | PV | PM | Stat-pic | Spé. de combat 💡 | Fragilité ✅ |
|-------|----|----|----------|-------------------|--------------|
| Harry | 35 | 22 | LCK 15 | DPS phys. polyvalent + Protego | PM bas (22) |
| Hermione | 28 | 35 | INT 17 / MAG 16 | Nukeuse-soigneuse | PV/END (28 / 7) |
| Drago | 29 | 30 | AGI 13 / LCK 14 | Duelliste hybride (esquive/crit) | pas de pic dominant |
| Cho | 30 | 30 | AGI 15 | Esquive + crit de sort | END 8 |
| Cedric | 34 | 26 | END 11 / STR 9 | Front-line résiliente | MAG 12 |
| Céleste | 30 | 34 | MAG 15 / SP 34 | Mage de lumière + soin | END 8 / ATK 3 |
| Iris | 32 | 28 | **LCK 18** | Porte-bonheur + anti-peur | MAG 13 |
| Maxence | **26** | 32 | MAG 14 | Glass-cannon vol-de-vie | **PV 26 / DEF 1** |
| Anastasia | 30 | 32 | INT 16 / MAG 15 | Mage équilibrée + utilitaire | END 8 |
| Louis | 33 | 26 | ATK 5 / END 10 | DPS feu robuste | MAG 12 / AGI 11 |
| Jeanne | 31 | 30 | INT 15 | Contrôle / utilitaire | jeune, sans pic |
| Agathe | 31 | 32 | **DEF 3 (base)** / END 11 | Soigneuse-soutien régén | ATK 3 |
| Olivier | 29 | 33 | MAG 15 / SP 33 | Nukeur offensif | END 8 |
| Nathalie | **36** | 24 | **END 13 / DEF 4 (base)** | Tank front-line + soin de champ | AGI 9 / MAG 11 |
| O. de Châtillon | **27** | 34 | MAG 16 / AGI 13 | Contrôle (disarm + stun) glass-cannon | **PV 27 / END 7** |
| Margaux | **28** | 33 | INT 16 / **LCK 16** | Astromancienne crit-sort + Fortune | **PV 28 / END 7** |

> 💡 **Lecture transverse** : les rôles couvrent les quatre voies de Maison
> ([07](07-les-maisons.md)) — **ATK** (Harry, Cedric, Louis), **MAG offensive**
> (Olivier, Maxence, Céleste), **MAG-maîtrise/soutien** (Hermione, Anastasia,
> Jeanne, Agathe), **AGI/esquive** (Cho, Drago) et **LCK/Fortune** (Iris). Aucun
> binôme n'est « interdit », mais les paires **front + back** (ex. Cedric + Olivier,
> Harry + Hermione) lissent la difficulté ; deux fragiles (Maxence + Hermione)
> jouent en *glass-cannon* à haut risque/haute récompense.

---

## 5.1 Figures canon

### Harry Potter

- **Maison / rôle :** Gryffondor / Auror (offensif + Protego).
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** cheveux noirs en bataille, lunettes rondes, la cicatrice en
  éclair ; robe de Gryffondor, **Baguette de Houx** au poing. Silhouette nerveuse,
  prête à bondir.
- **Personnalité (3 traits) 💡 :** instinctif, loyal jusqu'à l'imprudence, allergique
  à l'injustice.
- **Motivation 💡 :** Voldemort se reforme sous le château ; pour Harry, ce n'est
  pas une mission — c'est *encore lui*. Il descend parce que personne d'autre ne
  devrait avoir à le faire.
- **Voix 💡 :** directe, peu de fioritures, ironie sèche dans le danger. Dit « on »
  plus que « je ».
- **Forces ✅ / faiblesses ✅ :** PV solides (35) et **LCK 15** (le meilleur crit
  physique du roster) ; cinq sorts au départ dont **Protego**. En retour, **PM
  limités (22)** et DEF 2 — il encaisse mais ne tient pas la magie longtemps.
- **Rôle en combat / spécialités 💡 :** DPS physique polyvalent ; pose Protego pour
  protéger un allié fragile, frappe au corps quand les PM manquent. Pivot naturel
  d'un duo.
- **Lien à la trame :** héros par défaut du duo ; figure que le portrait de
  Dumbledore reconnaît d'emblée (voir [06](06-pnj-et-factions.md)).
- **Arc personnel 💡 :** apprendre que descendre seul n'est pas du courage mais de
  l'orgueil — la Boucle Ténébreuse le confronte à sa propre légende ([03 §3.6](03-trame-principale.md)).
- **Interaction Signature & trame 💡 :** natif de **🦁 L'Étendard de Godric** ; le
  Chevalier Fantôme le tutoie comme un pair (« Toi, je n'ai pas besoin de te
  l'expliquer »). Sur une partie non-Gryffondor, il commente avec un brin de regret
  (« On aurait dit que c'était mon escalier, celui-là »).
- **Tagline ✅ :** *« Le Survivant — courage et instinct. »*

### Hermione Granger

- **Maison / rôle :** Gryffondor / Mage (soin, support, magie forte).
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** cheveux bruns broussailleux, regard concentré, une pile
  invisible de livres derrière elle ; robe de Gryffondor, **Baguette de Vigne**.
- **Personnalité (3 traits) 💡 :** méthodique, indéfectible, exigeante (avec les
  autres comme avec elle-même).
- **Motivation 💡 :** la corruption est un *problème* avant d'être une terreur ; elle
  veut le comprendre pour le résoudre, là où Harry veut le frapper.
- **Voix 💡 :** précise, didactique, cite ses sources même au fond d'un cachot.
- **Forces ✅ / faiblesses ✅ :** **INT 17 / MAG 16** et **PM 35** — le meilleur moteur
  magique du roster (soin + dégâts de sort, dopés par la conversion INT→MAG). Revers :
  **PV 28 / END 7 / ATK 3** — la plus fragile au corps à corps, à garder en retrait.
- **Rôle en combat / spécialités 💡 :** support/contrôle — Episkey et Protego sur le
  groupe, Incendio en relais offensif. Brille en back-line derrière un front-liner.
- **Lien à la trame :** binôme canonique de Harry ; pivot du support en duo
  (Episkey/Protego). Lectrice naturelle du **grimoire de givre d'Élara**
  ([08 §8.3](08-quetes-et-sous-intrigues.md)).
- **Arc personnel 💡 :** accepter que tout ne se résout pas par le savoir — certaines
  ténèbres se traversent, pas se déchiffrent.
- **Interaction Signature & trame 💡 :** affinité forte avec **🦅 Le Codex de Rowena**
  (même si Gryffondor-canon) — elle *adore* déchiffrer les stèles et glose chaque
  feuillet ; bark récurrent sur une partie Serdaigle (« Enfin une quête qui se lit
  avant de se gagner ! »).
- **Tagline ✅ :** *« Brillante érudite — la magie par le savoir. »*

### Drago Malefoy

- **Maison / rôle :** Serpentard / Duelliste.
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** blond platine plaqué, traits fins et hautains, **Insigne de
  Préfet** au revers ; robe de Serpentard, **Baguette d'Aubépine**.
- **Personnalité (3 traits) 💡 :** orgueilleux, ambitieux, secrètement terrifié par
  ce qu'il a vu chez les siens.
- **Motivation 💡 :** descendre pour **se prouver** qu'il vaut mieux que son nom.
  Les mangemorts du donjon portent un visage qu'il connaît trop bien.
- **Voix 💡 :** hautaine en surface, fêlée quand on touche au sujet de sa famille.
- **Forces ✅ / faiblesses ✅ :** profil **équilibré** (AGI 13, LCK 14, MAG 14) — bon
  partout, donc souple : esquive correcte, crit honnête, magie utilisable. Revers :
  **aucun pic** — il ne domine aucune niche et son END 8 le rend moyen sur la durée.
- **Rôle en combat / spécialités 💡 :** duelliste hybride — alterne sort et lame
  selon l'ouverture ; bon « second couteau » qui s'adapte au style du binôme.
- **Lien à la trame :** seul héros pour qui la **faction mangemort** ([06](06-pnj-et-factions.md))
  est un miroir personnel — il combat ce qu'il aurait pu devenir.
- **Arc personnel 💡 :** le rachat par le choix, écho du thème « le choix plutôt que
  le don » ([03 §3.7](03-trame-principale.md)).
- **Interaction Signature & trame 💡 :** natif de **🐍 Le Pacte des Cachots** ; le
  thème du miroir le frappe de plein fouet (« Je connais cette voix. C'est celle qui
  parle quand on a peur d'être ordinaire »). Son `slythPactChoice` est le plus
  chargé émotionnellement — refuser le pacte *est* son arc.
- **Tagline ✅ :** *« Sang-pur ambitieux — la fierté avant tout. »*

### Cho Chang

- **Maison / rôle :** Serdaigle / Attrapeuse.
- **Année scolaire 💡 :** 7ᵉ année.
- **Apparence 💡 :** silhouette d'attrapeuse, posture vive et déliée, le **Vif d'Or**
  parfois entre les doigts ; robe de Serdaigle, **Baguette de Frêne**.
- **Personnalité (3 traits) 💡 :** vive, perspicace, marquée par un deuil qu'elle
  porte sans le dire.
- **Motivation 💡 :** Cedric n'est jamais revenu d'un tournoi ; elle ne laissera pas
  le château engloutir quelqu'un d'autre.
- **Voix 💡 :** posée, attentive aux détails ; remarque ce que les autres ratent.
- **Forces ✅ / faiblesses ✅ :** **AGI 15** (la plus haute du roster) → meilleure
  **esquive** et fort **crit de sort** (volet AGI). Revers : stats moyennes ailleurs
  et **END 8** — elle évite les coups mais ne les encaisse pas.
- **Rôle en combat / spécialités 💡 :** esquiveuse + crit de sort ; build AGI idéal
  pour la **Célérité** (actions supplémentaires) en milieu/fin de partie.
- **Lien à la trame :** sa vélocité (rôle d'Attrapeuse) en fait l'un des meilleurs
  vecteurs d'esquive et de crit de sort. Lien thématique fort avec Cedric.
- **Arc personnel 💡 :** transformer le deuil en vigilance plutôt qu'en peur — or la
  peur est le **sceau** central de la trame.
- **Interaction Signature & trame 💡 :** native de **🦅 Le Codex de Rowena** ; mais
  c'est surtout sur la **chute de Voldemort** ([03 §3.5](03-trame-principale.md))
  qu'elle a une réplique unique liée à Cedric (« Pour ceux qui ne sont pas revenus »).
- **Tagline ✅ :** *« Attrapeuse de Serdaigle — vive et perspicace. »*

### Cedric Diggory

- **Maison / rôle :** Poufsouffle / Champion.
- **Année scolaire 💡 :** 7ᵉ année.
- **Apparence 💡 :** carrure droite et franche, sourire facile, l'**Insigne de
  Capitaine** sur la poitrine ; robe de Poufsouffle, **Baguette de Frêne et Licorne**.
- **Personnalité (3 traits) 💡 :** loyal, juste, naturellement rassembleur.
- **Motivation 💡 :** le Champion de l'école ne se dérobe pas quand l'école est
  menacée — c'est aussi simple, et aussi lourd, que ça.
- **Voix 💡 :** chaleureuse, encourageante, ferme sans dureté.
- **Forces ✅ / faiblesses ✅ :** **PV 34 / END 11 / STR 9 / ATK 5** — la meilleure
  endurance de front-line avec un bon coup physique. Revers : **MAG 12 / PM 26** — il
  n'est pas un nukeur, son apport magique reste secondaire.
- **Rôle en combat / spécialités 💡 :** front-line résiliente — encaisse, fait Garde
  pour mitiger, protège la back-line. Le « mur » naturel d'un duo offensif.
- **Lien à la trame :** incarnation vivante des valeurs de Poufsouffle ([07](07-les-maisons.md)) ;
  contrepoint lumineux à la descente.
- **Arc personnel 💡 :** porter le poids d'être l'exemple, sans s'y perdre.
- **Interaction Signature & trame 💡 :** natif de **🦡 Ceux qu'on ne laisse pas
  derrière** ; il *insiste* pour secourir chaque égaré (« On ne compte pas les
  monstres, on compte les vivants »). En duo avec Cho, leurs barks se répondent.
- **Tagline ✅ :** *« Champion de Poufsouffle — loyal et valeureux. »*

---

## 5.2 Héros originaux — la **Garde de l'Aube**

> 💡 **Cadre commun proposé** : les 8 héros originaux forment la **Garde de
> l'Aube**, une promo discrète d'élèves que le portrait de Dumbledore a
> pressentis pour la descente — pas une élite décrétée, mais des volontaires
> que le château a « choisis » en se réveillant. Ils ne se connaissent pas tous,
> mais partagent un même serment muet : *remonter la lumière depuis le fond*.
> Ce liant donne aux originaux une raison d'exister ensemble sans contredire le
> canon (voir la faction « Garde de l'Aube » en [06 §6.3](06-pnj-et-factions.md)).
>
> ❓ À arbitrer : la Garde de l'Aube est-elle **nommée à l'écran** (intro, dialogues
> de PNJ) ou reste-t-elle un **liant de coulisse** pour la cohérence de la spec ?

### Céleste Luneclair

- **Maison / rôle :** Serdaigle / Astromage.
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** cheveux argentés sous un capuchon constellé, **Pendentif
  Lunaire** au cou ; robe de Serdaigle, **Baguette de Bouleau d'Argent**. Toujours
  un peu ailleurs, le regard sur quelque chose qu'on ne voit pas.
- **Personnalité (3 traits) 💡 :** contemplative, lucide, sereine sous pression.
- **Motivation 💡 :** elle a lu dans les astres que « la lumière devait redescendre » ;
  elle obéit à une cartographie céleste plus qu'à la peur.
- **Voix 💡 :** calme, imagée (métaphores de lune et de marée), jamais pressée.
- **Forces ✅ / faiblesses ✅ :** **MAG 15 / PM 34** et surtout **Lumos Maxima** dès
  le départ — réponse directe aux **morts-vivants** (élément lumière). Revers :
  **END 8 / ATK 3** — fragile au corps, à tenir en retrait.
- **Rôle en combat / spécialités 💡 :** mage de lumière anti morts-vivants + soin de
  secours (Episkey) ; précieuse dans les tranches C/D où abondent fantômes et inférius.
- **Lien à la trame :** sa magie de lune (Lumos Maxima, Aguamenti) en fait une
  réponse directe au thème « la peur comme sceau » — elle *éclaire*.
- **Arc personnel 💡 :** apprendre que toutes les prophéties ne se réalisent pas
  seules ; il faut descendre pour qu'elles deviennent vraies.
- **Interaction Signature & trame 💡 :** native de **🦅 Le Codex de Rowena** ; elle
  *complète* les vers manquants des stèles avant de les résoudre (« Rowena rimait
  avec les astres, pas avec les hommes »). Forte résonance avec la révélation de la
  corruption pré-Fondateurs.
- **Tagline ✅ :** *« Astromage de Serdaigle — la lune guide ses sortilèges. »*

### Iris Prismara

- **Maison / rôle :** Poufsouffle / Enchanteresse.
- **Année scolaire 💡 :** 5ᵉ année.
- **Apparence 💡 :** sourire éclatant, mèches qui virent au prisme à la lumière, un
  **Prisme d'Arc-en-ciel** qui pend à sa ceinture ; robe de Poufsouffle, **Baguette
  de Cristal d'Iris**.
- **Personnalité (3 traits) 💡 :** rieuse, généreuse, désarmante de bonne humeur.
- **Motivation 💡 :** elle descend pour **rendre la couleur** à un château qui vire
  au gris — sa chance (Félix, Riddikulus) est une forme d'espoir militant.
- **Voix 💡 :** pétillante, ponctue ses phrases de petites blagues, refuse le
  désespoir par principe.
- **Forces ✅ / faiblesses ✅ :** **LCK 18** — la plus haute du jeu, donc la meilleure
  **Fortune** (drops, or, fouille, fuite) ; **Riddikulus** d'entrée contre la peur.
  Revers : stats de combat moyennes (**MAG 13**) — elle facilite, elle ne foudroie pas.
- **Rôle en combat / spécialités 💡 :** « porte-bonheur » de groupe (Fortune partagée
  via `partyFortune()`) + anti-peur (Riddikulus) — arme naturelle contre les
  Épouvantards et le statut `fear`.
- **Lien à la trame :** porteuse de Riddikulus, elle est l'arme naturelle contre les
  Épouvantards — l'humour comme antidote à la peur ([03 §3.7](03-trame-principale.md)).
- **Arc personnel 💡 :** comprendre que rire face aux ténèbres n'est pas les nier,
  mais refuser qu'elles gagnent.
- **Interaction Signature & trame 💡 :** native de **🦡 Ceux qu'on ne laisse pas
  derrière** ; chaque égaré secouru lui arrache une vanne tendre. Excellente porteuse
  thématique du levier final « Espoir partagé » (la couleur revient avec les rescapés).
- **Tagline ✅ :** *« Enchanteresse prismatique — la chance et la lumière à ses côtés. »*

### Maxence Ravenwood

- **Maison / rôle :** Serpentard / Mage de Sang.
- **Année scolaire 💡 :** 7ᵉ année.
- **Apparence 💡 :** teint pâle, cernes profondes, **Médaillon de Sang** sombre à la
  gorge ; robe de Serpentard, **Baguette d'If Noueux**. Quelque chose de retenu, de
  contrôlé en permanence.
- **Personnalité (3 traits) 💡 :** intense, solitaire, en lutte constante avec sa
  propre nature.
- **Motivation 💡 :** sorcier-vampire, il descend pour prouver qu'une malédiction de
  sang peut servir la lumière — et pour ne pas finir comme les morts-vivants du fond.
- **Voix 💡 :** grave, économe, métaphores de soif et de sang ; lucide sur ce qu'il est.
- **Forces ✅ / faiblesses ✅ :** **Sanguini** (vol de vie) + **MAG 14 / PM 32** — il se
  soigne en frappant. Revers : **le plus fragile du roster** (PV 26, **DEF 1**,
  END 7) — un *glass-cannon* qui meurt vite s'il rate son lifesteal.
- **Rôle en combat / spécialités 💡 :** glass-cannon vampirique — son lifesteal couvre
  sa fragilité **tant qu'il touche** ; mortel en duo avec un protecteur (Cedric)
  ou une soigneuse (Agathe/Hermione).
- **Lien à la trame :** Sanguini/Vampyrus le rapprochent dangereusement de la faction
  **morts-vivants** ([06 §6.4](06-pnj-et-factions.md)) — il combat ce qui le tente.
- **Arc personnel 💡 :** maîtriser la soif plutôt que la renier ; le sang répond au
  sang, mais c'est lui qui choisit à quoi il répond.
- **Interaction Signature & trame 💡 :** natif de **🐍 Le Pacte des Cachots** ; l'écho
  de Salazar le tente *par sa soif* (« Bois donc, petit. Ce qu'on scelle, on finit
  par le devoir rendre »). Forte tension avec le passif **Soif du Serpent** (Apothéose).
- **Tagline ✅ :** *« Sorcier-vampire — son sang répond au sang. »*

### Anastasia Moonveil

- **Maison / rôle :** Gryffondor / Mage de la Lune.
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** allure soignée et studieuse, **Lunettes de Lune** aux verres
  pâles ; robe de Gryffondor, **Baguette de Bois de Lune**. Le calme d'une élève qui
  a déjà tout révisé.
- **Personnalité (3 traits) 💡 :** studieuse, courageuse à froid, méticuleuse.
- **Motivation 💡 :** Gryffondor de tête plus que de cœur, elle descend par devoir
  raisonné — elle a *calculé* que personne n'était mieux placé.
- **Voix 💡 :** mesurée, soigne sa formulation, courage tranquille plutôt que fougue.
- **Forces ✅ / faiblesses ✅ :** **INT 16 / MAG 15** + utilitaire (Wingardium, Lumos
  Maxima) — mage équilibrée et polyvalente. Revers : **END 8 / ATK 4** — solide sans
  être tank, à protéger en mêlée.
- **Rôle en combat / spécialités 💡 :** mage équilibrée + contrôle/utilitaire ;
  excellente « deuxième caster » qui complète un nukeur pur (Olivier) sans redondance.
- **Lien à la trame :** pont entre l'audace de Gryffondor et la rigueur de Serdaigle ;
  contrepoint réfléchi à Harry.
- **Arc personnel 💡 :** accepter que le courage se décide parfois dans l'instant, pas
  seulement dans le plan.
- **Interaction Signature & trame 💡 :** native de **🦁 L'Étendard de Godric** ; elle
  *analyse* le courage là où Harry le vit (« Le courage est une décision répétée, pas
  une humeur »). Son rationalisme tranche élégamment avec le Chevalier Fantôme.
- **Tagline ✅ :** *« Magicienne studieuse — la magie au clair de lune. »*

### Louis Dragonflamme

- **Maison / rôle :** Poufsouffle / Dompteur de Dragons.
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** carrure chaleureuse, cheveux roux flamme, **Brassard d'Écailles**
  au bras ; robe de Poufsouffle, **Baguette d'Acacia**. Sent toujours un peu la
  fumée.
- **Personnalité (3 traits) 💡 :** ardent, protecteur, débordant d'énergie.
- **Motivation 💡 :** il dompte le feu depuis l'enfance ; quand le château s'embrase
  de l'intérieur, il se sent appelé à descendre éteindre l'incendie — au sens propre.
- **Voix 💡 :** sonore, franche, vocabulaire de feu et d'écailles ; rit fort.
- **Forces ✅ / faiblesses ✅ :** **PV 33 / END 10 / ATK 5** + **Incendio** d'entrée —
  un DPS feu robuste qui tient la ligne. Revers : **MAG 12 / AGI 11** et un kit de
  sorts étroit — peu de souplesse hors offensive feu.
- **Rôle en combat / spécialités 💡 :** DPS feu de première ligne ; excelle contre le
  bestiaire **faible au feu**, à doser face aux ennemis qui y résistent ([09](09-bestiaire-et-lore.md)).
- **Lien à la trame :** sa baguette « pulse au rythme du feu » (Incendio) — pilier
  offensif élémentaire face aux résistances du bestiaire.
- **Arc personnel 💡 :** apprendre que dompter, ce n'est pas dominer — y compris sa
  propre ardeur.
- **Interaction Signature & trame 💡 :** natif de **🦡 Ceux qu'on ne laisse pas
  derrière** ; il sert de **rempart** au refuge (« Tant que je brûle, personne ne
  passe »). En contraste comique avec la douceur d'Iris.
- **Tagline ✅ :** *« Dompteur de dragons — sa baguette pulse au rythme du feu. »*

### Jeanne d'Argenciel

- **Maison / rôle :** Gryffondor / Charmeuse de Sortilèges.
- **Année scolaire 💡 :** 3ᵉ année (la plus jeune de la Garde de l'Aube).
- **Apparence 💡 :** petite taille, yeux écarquillés de curiosité, un **Grimoire de
  Sortilèges** trop grand pour elle serré contre la poitrine ; robe de Gryffondor,
  **Baguette d'Étoile**.
- **Personnalité (3 traits) 💡 :** espiègle, curieuse, courageuse sans le savoir.
- **Motivation 💡 :** la plus jeune de la Garde de l'Aube ; elle descend par
  curiosité émerveillée autant que par bravoure — le château est un grand secret
  qu'elle veut percer.
- **Voix 💡 :** vive, enthousiaste, ses incantations « chantent comme des étoiles ».
- **Forces ✅ / faiblesses ✅ :** **INT 15 / AGI 13** + utilitaire (Wingardium, Lumos)
  — contrôle et soutien souples. Revers : profil **sans pic** (jeune), fragile sur la
  durée — elle facilite la vie du groupe plus qu'elle ne porte les combats.
- **Rôle en combat / spécialités 💡 :** contrôle / utilitaire — lévitation, lumière,
  bouclier ; le « couteau suisse » d'un duo, idéale derrière un front-liner.
- **Lien à la trame :** porte un **Grimoire de Sortilèges** (Wingardium, Lumos) —
  vecteur d'utilitaire et de contrôle ; sa jeunesse rappelle l'enjeu (sauver les
  élèves, pas seulement l'école).
- **Arc personnel 💡 :** grandir trop vite, et garder malgré tout son émerveillement.
- **Interaction Signature & trame 💡 :** native de **🦁 L'Étendard de Godric** ; sa
  bravoure naïve touche le Chevalier Fantôme (« Petite, tu n'as pas peur parce que tu
  n'as pas encore appris à avoir peur. Garde ça »). Incarne l'enjeu « sauver les
  élèves » de **🦡 Poufsouffle** vue de l'extérieur.
- **Tagline ✅ :** *« Petite Gryffondor espiègle — ses sortilèges chantent comme des étoiles. »*

### Agathe Lumiflore

- **Maison / rôle :** Gryffondor / Enchanteresse florale.
- **Année scolaire 💡 :** 5ᵉ année.
- **Apparence 💡 :** **Couronne de Fleurs** vivantes dans les cheveux, mains tachées
  de terre et de pollen ; robe de Gryffondor, **Baguette de Cerisier en Fleur**.
  Tout pousse un peu plus vite autour d'elle.
- **Personnalité (3 traits) 💡 :** douce, tenace, profondément vivante.
- **Motivation 💡 :** là où la corruption fait flétrir, elle fait pousser ; descendre,
  c'est pour elle semer la vie dans la pierre morte.
- **Voix 💡 :** chaleureuse, images végétales (racines, floraison, saisons).
- **Forces ✅ / faiblesses ✅ :** **DEF 3 de base** (la plus haute du roster) + **END
  11** et un kit de soutien (Episkey, **Ferula**) — la soigneuse la plus résiliente.
  Revers : **ATK 3** — offensive quasi nulle, elle tient et soigne, elle ne tue pas.
- **Rôle en combat / spécialités 💡 :** soigneuse-soutien de régénération (Ferula DoT
  inversé) ; le « cœur » d'un duo d'usure, parfaite avec un glass-cannon (Maxence,
  Olivier).
- **Lien à la trame :** support et soin (Episkey, Ferula) — incarnation de la
  résilience ; antithèse douce des morts-vivants.
- **Arc personnel 💡 :** comprendre que faire pousser exige aussi d'arracher les
  mauvaises herbes — la douceur n'exclut pas le combat.
- **Interaction Signature & trame 💡 :** affinité avec **🦡 Ceux qu'on ne laisse pas
  derrière** (soigne les rescapés) **et** les **jardins de Chourave**
  ([08 §8.2](08-quetes-et-sous-intrigues.md)). Sur une partie Poufsouffle, elle est
  la porteuse thématique idéale du Refuge.
- **Tagline ✅ :** *« Enchanteresse florale — la vie s'épanouit sous ses sortilèges. »*

### Olivier de Clairval

- **Maison / rôle :** Serdaigle / Mage de combat.
- **Année scolaire 💡 :** 7ᵉ année.
- **Apparence 💡 :** posture droite et disciplinée, regard d'escrimeur, une **Plume
  d'Aigle** glissée dans la reliure d'un carnet ; robe de Serdaigle, **Baguette de
  Chêne Ardent**.
- **Personnalité (3 traits) 💡 :** discipliné, intense, perfectionniste du sortilège.
- **Motivation 💡 :** pour lui le combat magique est un art ; le château corrompu est
  l'adversaire ultime contre lequel parfaire cet art — et le mettre au service du bien.
- **Voix 💡 :** sobre, technique, économe en mots, percutant comme ses sorts.
- **Forces ✅ / faiblesses ✅ :** **MAG 15 / PM 33** + **Incendio & Stupefix** d'entrée
  — le nukeur offensif le plus pur des Serdaigle. Revers : **END 8** et un profil
  défensif léger — il ferme les combats vite ou pas du tout.
- **Rôle en combat / spécialités 💡 :** nukeur de dégâts élémentaires (feu/foudre) ;
  redoutable avec un protecteur qui lui achète des tours (Cedric, Agathe).
- **Lien à la trame :** Serdaigle qui choisit l'offensive (Incendio, Stupefix) plutôt
  que l'érudition pure — un autre visage de l'Aigle ([07](07-les-maisons.md)).
- **Arc personnel 💡 :** la maîtrise n'est rien sans la cause ; descendre lui donne un
  pourquoi à sa virtuosité.
- **Interaction Signature & trame 💡 :** natif de **🦅 Le Codex de Rowena**, mais d'un
  angle inattendu : il veut le Codex comme **arme** (la faille de Voldemort), pas
  comme savoir. Tension fertile avec Hermione/Céleste, plus contemplatives.
- **Tagline ✅ :** *« Mage de combat — chaque sortilège frappe comme la foudre. »*

### Nathalie Finch

- **Maison / rôle :** Poufsouffle / Gardienne-Herboriste.
- **Année scolaire 💡 :** 6ᵉ année.
- **Apparence 💡 :** sourire franc et chaleureux, longs cheveux blonds, mains tachées de
  terre et de baumes, une **Besace d'Herboriste** débordant de boutures ; robe de
  Poufsouffle, **Baguette de Chêne Noueux**. Un tournesol séché glissé au revers — il se
  tourne, dit-on, vers l'aube.
- **Personnalité (3 traits) 💡 :** placide, opiniâtre, protectrice jusqu'à l'os.
- **Motivation 💡 :** on ne descend pas pour vaincre mais pour **abriter** ; tant qu'elle
  tient le mur, les autres avancent. Le don de soi, pas l'exploit.
- **Voix 💡 :** posée, lente, métaphores de terre et de saisons (« on tient racine »).
- **Forces ✅ / faiblesses ✅ :** **PV 36 / END 13 / DEF 4 de base** (la plus résistante
  du roster) + un kit de tenue (Protego, **Ferula**) et un soin de champ (Episkey) —
  le rempart qui achète des tours aux fragiles. Revers : **AGI 9** (la plus lente, agit
  tard, esquive peu) et **MAG 11** — elle encaisse et soigne, elle ne *nuke* pas.
- **Rôle en combat / spécialités 💡 :** tank front-line + soutien de survie ; le mur d'un
  duo d'usure, parfait devant un glass-cannon (Olivier de Châtillon, Maxence, Olivier).
- **Lien à la trame :** la résilience faite chair (Protego/Ferula) — une Poufsouffle qui
  fait du **refus d'abandonner** une arme défensive ; antithèse de la corruption qui
  fait flétrir.
- **Arc personnel 💡 :** apprendre que protéger n'est pas seulement encaisser — parfois,
  tenir le mur exige de frapper la première.
- **Interaction Signature & trame 💡 :** porteuse naturelle de **🦡 Ceux qu'on ne laisse pas
  derrière** ([08 §8.2](08-quetes-et-sous-intrigues.md)) ; en duo avec Agathe, elle forme
  le « bouclier + soin » canonique du Refuge de Poufsouffle.
- **Tagline ✅ :** *« Gardienne-herboriste — un rempart patient pour les siens. »*

### Olivier de Châtillon

> 💡 Deux héros portent le prénom **Olivier** (de Clairval, Serdaigle ; de Châtillon,
> Serpentard) — saveur assumée, clés internes distinctes (`olivier` / `chatillon`).

- **Maison / rôle :** Serpentard / Ombremancien.
- **Année scolaire 💡 :** 7ᵉ année.
- **Apparence 💡 :** cheveux blonds soignés, sourire posé qui jauge avant de parler, un
  **Camée d'Ombre** au creux du col ; robe de Serpentard, **Baguette d'Ébène**. Il se
  tient toujours un pas en retrait — d'où l'on voit tout.
- **Personnalité (3 traits) 💡 :** lucide, calculateur, loyal à qui le mérite.
- **Motivation 💡 :** la lumière frontale a ses martyrs ; il préfère **désamorcer**
  l'ennemi avant qu'il ne frappe. Remonter la lumière, oui — mais par l'ombre, là où le
  mal se croit chez lui.
- **Voix 💡 :** basse, ironique, économe ; le compliment et la menace ont chez lui le
  même timbre.
- **Forces ✅ / faiblesses ✅ :** **MAG 16 / INT 16 / AGI 13** (crit de sort) + un kit de
  **contrôle** (Expelliarmus désarme, Stupefix étourdit) — il neutralise un adversaire
  avant qu'il n'agisse. Revers : **PV 27 / END 7 / DEF 2** — le plus fragile du roster
  avec Maxence ; un coup encaissé de trop et c'est fini.
- **Rôle en combat / spécialités 💡 :** caster de contrôle glass-cannon ; verrouille la
  menace (disarm/stun) puis punit — exige un protecteur qui lui achète des tours (Nathalie,
  Cedric).
- **Lien à la trame :** un Serpentard du **bon côté par calcul autant que par cœur** —
  la ruse au service de la lumière, écho assumé de Salazar tel que la trame le réhabilite
  ([07](07-les-maisons.md)).
- **Arc personnel 💡 :** accepter qu'on puisse le voir agir — sortir de l'ombre sans y
  laisser ce qui fait sa force.
- **Interaction Signature & trame 💡 :** natif de **🐍 Le Pacte des Cachots**
  ([08 §8.5](08-quetes-et-sous-intrigues.md)), qu'il lit non comme une tentation mais
  comme une **énigme à déjouer** ; tension fertile avec Maxence (le sang) sur la *bonne*
  façon d'être Serpentard.
- **Tagline ✅ :** *« Ombremancien de Serpentard — la ruse frappe avant la lumière. »*

### Margaux Aiglebrume

- **Maison / rôle :** Serdaigle / Astromancienne.
- **Année scolaire 💡 :** 1ʳᵉ année — la benjamine du **Cercle des Astres**.
- **Apparence 💡 :** petite fille aux boucles blond-roux, l'œil malicieux et **une
  trace de chocolat au coin des lèvres** ; cravate et robe de Serdaigle, **Baguette
  d'Aulne Étoilé** qui crache une étincelle bleue, le **Grimoire des Enchantements**
  serré contre elle.
- **Personnalité (3 traits) 💡 :** curieuse, espiègle, têtue-studieuse — elle dévore
  les sortilèges comme des friandises.
- **Motivation 💡 :** tout comprendre, tout déchiffrer ; le château est un livre
  géant et chaque étage une page à tourner.
- **Voix 💡 :** vive et claire, ponctuée de « oh ! » émerveillés ; cite un sort
  juste avant de le lancer, comme on récite une leçon.
- **Forces ✅ / faiblesses ✅ :** **INT 16 / LCK 16 / AGI 13** — crit de sort
  (AGI) doublé d'une **Fortune** élevée (LCK) sur les drops/or/fouilles ; kit de
  charmes (Lumos Maxima, Wingardium Leviosa) qui contrôle et illumine. Revers :
  **PV 28 / END 7 / DEF 2** — fragile, à protéger derrière un front-line.
- **Rôle en combat / spécialités 💡 :** caster d'appoint chanceuse ; brille en duo
  derrière une gardienne (Nathalie, Agathe) qui lui achète des tours.
- **Lien à la trame :** la **relève** de Serdaigle — trop jeune pour les batailles,
  mais le portrait de Dumbledore voit en sa soif de savoir l'étincelle qui
  « remonte la lumière depuis le fond ». Petite sœur d'études de Céleste l'astromage.
- **Arc personnel 💡 :** apprendre que comprendre ne suffit pas — qu'il faut parfois
  fermer le livre et tendre la main.
- **Tagline ✅ :** *« Petite astromancienne de Serdaigle — son grimoire scintille
  d'étincelles d'étoiles. »*

---

## 5.3 Choix des personnages — solo / duo & customisation légère

> ✅ (mécaniques actées) / 💡 (mise en scène & propositions) / ❓ (à arbitrer)

### Flux de sélection (✅)
```
Intro Dumbledore (Clé de Voûte)  →  Choix de Maison (chosenHouse)
   →  showPlayerSelect()  : Solo (1) ou Duo (2)
      →  #hero-grid  : choisir 1 héros (solo) ou 2 héros (duo)
         →  startGame(count)  →  _hydrateCharacter() depuis CHARACTERS[key]
```
- ✅ **Solo (1)** : un seul héros (`partySize = 1`) ; la 2ᵉ carte et l'indicateur de
  tour sont masqués.
- ✅ **Duo (2)** : deux héros simultanés ; tour de jeu alterné, **or et inventaire
  partagés** (`player.gold` / `player.inventory`), **XP partagée**.
- ✅ Le binôme par défaut proposé est **Harry + Hermione** ; n'importe quel couple de
  héros est jouable (front+back recommandé, cf. [§5.0.1](#501-profil-de-combat-en-un-coup-dœil--dapres-characters)).
- ✅ `partySize` est persisté (LocalStorage) et restauré au chargement.

### Conséquences narratives du mode 💡
- **Solo** : la descente est *littéralement* solitaire — appuie le thème « descendre
  seul n'est pas du courage mais de l'orgueil » (arc de Harry, [§5.1](#harry-potter)).
  Bonus d'équité de score en Ironman (×1.3) qui *signifie* aussi la solitude assumée.
- **Duo** : deux voix se répondent — le **dialogue de barks** (cf. [§5.4](#54-dialogues-de-héros--exemples-marquants))
  prend tout son sens (Cedric ↔ Cho sur le deuil, Iris ↔ Louis sur l'humour/feu).
  La Maison canon du 2ᵉ héros, si elle diffère du `chosenHouse`, nourrit les
  **barks de tension** (rejouabilité, [§5.0](#50-roster--dans-le-jeu--characters)).

### Customisation légère 💡 / ❓
> Le projet n'a **pas** d'éditeur de personnage : les héros sont **prédéfinis**
> (stats, sorts, portrait). La « customisation » se joue **en cours de partie**,
> pas à la création — c'est cohérent avec l'ADN *dungeon-crawler* du jeu.

- ✅ **Build par l'allocation** : les points de stats au level-up (`hp/sp/str/int/
  agi/end/lck/mag`) différencient deux runs d'un même héros (orienter Cho vers la
  Célérité AGI, Iris vers la Fortune LCK…).
- ✅ **Build par l'équipement** : 11 slots, sets de Maison, reliques — deux Harry
  n'ont pas le même rôle selon qu'on l'oriente crit physique ou regen.
- ✅ **Build par les sorts appris** : level-up + livres de sorts + `grantsSpell`
  d'équipement étendent le kit de départ.
- ✅ **Pseudonyme de joueur** : `getPlayerName()/setPlayerName()` (Hall of Fame) —
  seule personnalisation textuelle existante.
- ❓ **À arbitrer** : faut-il une customisation *cosmétique* explicite à la sélection
  (teinte de robe, accessoire) ? Coût UI/asset non négligeable pour un bénéfice de
  saveur. **Proposition** : s'en tenir au triptyque allocation/équipement/sorts, qui
  offre déjà une rejouabilité riche sans nouvel écran.

---

## 5.4 Dialogues de héros — exemples marquants

> 💡 (propositions de répliques) / ❓ (ampleur à arbitrer). Aucun de ces barks
> n'a de **levier mécanique** — c'est de la pure incarnation de voix.
>
> 💡 **Recommandation de portée** : un **jeu de barks léger et optionnel** (quelques
> lignes par héros, déclenchées sur événements **rares** : apparition de boss, crit
> décisif, KO d'un allié, level-up, palier de Maison). Suffit à incarner les voix
> de [§5.1](#51-figures-canon)/[§5.2](#52-héros-originaux--la-garde-de-laube) sans
> alourdir le combat ni multiplier les samples audio. À brancher sur la couche voix
> existante (`speakSpell`, samples OGG) **si** on veut la version parlée.

### 5.4.1 Barks par archétype (exemples)

| Événement | Harry (instinct) | Hermione (savoir) | Iris (humour) | Maxence (gravité) |
|-----------|------------------|--------------------|----------------|---------------------|
| **Apparition de boss** | « Bon. On fait comme d'habitude — on tient, on frappe. » | « Trois capacités, deux résistances. J'ai vu pire. Concentre-toi. » | « Oh, le grand méchant ! Quelqu'un a un appareil photo ? » | « Il a la même odeur que moi. C'est mauvais signe. » |
| **Crit décisif** | « Ça, c'était pour rester poli. » | « Mécaniquement imparable. » | « La chance ? Non non. Le *talent*. (Bon, un peu la chance.) » | « Le sang ne ment pas. » |
| **Allié à terre** | « Debout ! On n'a pas fini, toi et moi ! » | « Tiens bon — Episkey, *tout de suite* ! » | « Eh, pas le droit de partir, on n'a pas fini de rire ! » | « …Reste. Je n'ai pas envie d'être seul ici. » |
| **Level-up** | « Encore un cran. On descend plus loin. » | « Note méthodique : progresser, c'est survivre deux fois. » | « Plus forte ET plus mignonne, c'est injuste pour les autres. » | « Plus fort. Donc plus dangereux. Pour eux. » |

### 5.4.2 Répliques liées à la trame (déclencheurs scénarisés) ✅

> ✅ **Canon (implémenté).** Ces beats sont la **couche officielle de l'enjeu
> intime par héros** (tranche le gap historique — cf. [01 §1.3](01-synopsis-et-pitch.md),
> [03 §3 point #2](03-trame-principale.md)) : purement **cosmétiques**, one-shot,
> défensifs (`heroBarkScripted()` ; no-op si le héros n'est pas dans le groupe).
> Zéro mécanique, zéro quête, zéro stat — la « raison de descendre » de chaque
> héros est *dite*, pas *jouée* (guidelines §2). Câblage : `js/hero-barks.js`
> (registre) + call-sites `battle.js` / `movement-floors.js` /
> `movement-interactions.js`.

- **À la transition 3↔4 (on quitte l'école) — enjeu intime du meneur présent** ✅ :
  chacun des **6 héros jouables** porte sa raison *personnelle* de descendre
  (`descentStake`, jouée par le 1ᵉʳ membre vivant du groupe ; `movement-floors.js`).
  - *Harry* : « Encore lui, encore en bas. Personne d'autre ne devrait avoir à
    descendre ici — alors ce sera moi. Comme toujours. »
  - *Hermione* : « On me dit « une terreur ». Moi, je vois un problème. Et un
    problème, ça se résout — même en descendant le chercher. »
  - *Céleste* : « Les astres m'ont montré ce fond avant que j'y pose le pied.
    Descendre, ce n'est pas du courage — c'est leur donner raison. »
  - *Iris* : « Le château vire au gris, tu as remarqué ? Quelqu'un doit descendre
    lui rendre ses couleurs. Autant que ce soit moi — je suis la mieux assortie. »
  - *Maxence* : « Mon sang m'appelle vers le bas. Je préfère y descendre en le
    tenant en laisse plutôt qu'il m'y traîne. »
  - *Anastasia* : « J'ai fait le calcul : si personne ne descend, tout finit par
    remonter. Donc on descend. C'est arithmétique. »
- **Devant la première fontaine glacée (ét. 2)** — *Céleste* : « Même l'eau a peur,
  ici. Elle se souvient d'avant les Fondateurs. »
- **À la transition 3↔4 (on quitte l'école)** — *Cedric* : « Plus de salles de
  classe en dessous. À partir d'ici, on ne révise plus : on passe l'examen. »
- **Première rencontre d'un Mangemort (ét. 4+)** — *Drago* (natif) : « Ce masque…
  je l'ai déjà vu à ma table de Noël. » / *Drago* (autre Maison, bark de tension) :
  « Vous croyez les connaître. Moi je les *reconnais*. »
- **Avant Voldemort (ét. 10), signature Gryffondor faite** — *Anastasia* : « La
  Bannière est plantée. Maintenant, il ne peut plus nous faire reculer — c'est
  mathématique. »
- **Avant Voldemort, `slythPactChoice = defiance`** — *Maxence* : « Je connaissais
  ta voix, Salazar. Je ne lui ai juste pas obéi. »

### 5.4.3 Barks de tension en duo (Maison canon ≠ `chosenHouse`) 💡

> Récompense de rejouabilité : le 2ᵉ héros commente la Signature « de l'autre Maison ».

- **Partie Serpentard, Harry dans le duo** (au *Pacte des Cachots*) : « Un
  raccourci, vraiment ? La dernière fois que j'ai pris un raccourci, j'ai fini
  face à lui. »
- **Partie Gryffondor, Maxence dans le duo** (à *L'Étendard de Godric*) : « Le
  courage… c'est plus simple quand on n'a rien à cacher dans le sang. »
- **Partie Poufsouffle, Olivier dans le duo** (à *Ceux qu'on ne laisse pas
  derrière*) : « On perd du temps à les ramener. (…) Non. Tu as raison. On les
  ramène. »

---

## 5.5 Règle d'ajout d'un nouveau personnage jouable (📌 **section normative**)

> **But** : tout nouvel héros doit renforcer l'attachement émotionnel et l'impact
> du choix de Maison/héros **sans** diluer l'équilibre ni le ton. Cette règle
> formalise les critères côté **narratif** ; le câblage **technique** détaillé vit
> dans la skill **`add-playable-character`** et la section « Ajouter un nouveau
> personnage jouable » de [`CLAUDE.md`](../../CLAUDE.md). Les deux doivent rester
> cohérentes : amender ici = vérifier là-bas.

### 5.5.1 Conditions minimales (narratif) — **obligatoires**
Un candidat n'est validé que s'il coche **tout** :
1. ✅ **Lien à l'événement déclencheur** : une raison *personnelle* de descendre
   face à la Clé de Voûte fêlée (peur à dépasser, dette, savoir, protection…). Pas
   de héros « qui passait par là ».
2. ✅ **Ancrage de Maison fort** : une Maison canon claire (`class:"Élève de <Maison>"`)
   et un trait qui **incarne sa voie** ([07](07-les-maisons.md)) — ATK / MAG-prédation /
   MAG-maîtrise / DEF-résilience. Le héros doit « sonner » Gryffondor/Serpentard/
   Serdaigle/Poufsouffle au premier coup d'œil.
3. ✅ **Arc personnel clair mais LÉGER** : une phrase de tension intime résoluble en
   filigrane sur la descente (cf. les arcs 💡 ci-dessus). Jamais un sous-arc qui
   réclamerait sa propre chaîne de quêtes obligatoire.
4. ✅ **Service d'un thème de la trame** : le héros doit porter l'un des trois fils
   rouges ([03 §3.7](03-trame-principale.md)) — *peur/sceau*, *choix/don*,
   *mythe/revers*. Sinon il est redondant.

### 5.5.2 Contraintes de gameplay — **obligatoires**
1. ✅ **Rôle distinct** : un vecteur dominant **non déjà saturé** (voir la table
   [§5.0.1](#501-profil-de-combat-en-un-coup-dœil--dapres-characters)). Éviter un
   13ᵉ « mage MAG 15 / END 8 » de plus ; viser un *trou* du roster (ex. un vrai
   tank STR, un support de contrôle, un build LCK alternatif).
2. ✅ **Équilibre solo ET duo** : le héros doit être **viable en solo** (pas
   strictement dépendant d'un soigneur) **et** apporter une synergie en duo. Tester
   les deux modes.
3. ✅ **Budget de stats maîtrisé** : rester dans l'enveloppe du roster (PV ~26-35,
   PM ~22-35, total de stats secondaires comparable). **Pas de stat hors-courbe**
   sans contrepartie nette — la fragilité de Maxence (DEF 1) *paie* son lifesteal.
4. ✅ **Sorts de départ (4-5)** cohérents avec le rôle, pris dans `SPELLS` existants
   (ou justifier un nouveau sort dans le même PR).

### 5.5.3 Contraintes narratives — **obligatoires**
1. ✅ **Respect du ton** : aventure scolaire → sombre ([02](02-univers-ton-et-canon.md)).
   Pas de registre qui détonne (ni grimdark gratuit, ni parodie permanente).
2. ✅ **Pas de Mary Sue** : forces **et** faiblesses explicites ; une fêlure réelle
   (deuil, soif, orgueil, naïveté…). Un héros sans faiblesse est refusé.
3. ✅ **Cohérence canon** : un personnage canon HP garde sa caractérisation ; un
   original s'inscrit dans la **Garde de l'Aube** ([§5.2](#52-héros-originaux--la-garde-de-laube))
   et ne marche pas sur les plates-bandes d'un héros existant.
4. ✅ **Rejouabilité** : le héros doit **donner envie d'un run dédié** (une voix, un
   build, une interaction Signature propre) — c'est le critère de valeur ajoutée.
5. ❓ **Mary-Sue-check croisé** : si le nouvel héros est « le meilleur partout »
   narrativement **ou** mécaniquement, le retravailler avant intégration.

### 5.5.4 Processus d'intégration (renvoi technique)
> Détail exhaustif : skill **`add-playable-character`** + [`CLAUDE.md`](../../CLAUDE.md).
> Rappel des points de contact, dans l'ordre :

1. **DEUX images distinctes** (sources différentes — ne pas confondre) :
   - **Portrait-médaillon** (crop VISAGE) : `img/<key>-original.png` (128×128)
     **+** `img/<key>.png` (médaillon doré transplanté du genre adéquat —
     procédure CLAUDE.md). Référencé par `CHARACTERS.imgSrc`.
   - **Sprite plein corps** (visuel FIGURE ENTIÈRE) : `img/players/<key>.png`
     (512×512 RGBA transparent, Règle A `IMG_STYLE.md`) → enregistrer la clé
     dans `PLAYER_SPRITE_SRC` (`js/renderer-entities.js`) + bump cache PWA +
     compte de héros à jour dans `tests/scenarios/multiplayer.js`.
2. **Données** : entrée dans `CHARACTERS` (`js/data.js`) — `name`, `icon`, `class`,
   `imgSrc`, `role`, stats, `wand/armor/acc`, `spells`, `tagline`.
3. **Carte de sélection** : `<button class="hero-card" data-key="<key>" …>` dans
   `#hero-grid` (`index.html`), badge numéroté à la suite. **Bump cache PWA** si
   `index.html`/JS/CSS touchés (guideline §8, skill `cache-bump`).
4. **Doc narrative** : ajouter le héros à [§5.0](#50-roster--dans-le-jeu--characters)
   (+ profil complet §5.1/§5.2 avec **tous** les champs de la convention de tête) et
   à [§5.0.1](#501-profil-de-combat-en-un-coup-dœil--dapres-characters).
5. **Flags / interactions Signature** : si le héros introduit des barks scénarisés,
   les rattacher à `dialoguesByHouse` (cf. [08 §8.5.2](08-quetes-et-sous-intrigues.md))
   — **sans** créer de flag redondant avec `chosenHouse`.
6. **Test** : `node tests/smoke.js` doit rester vert sans modification (aucun
   scénario ne référence une clé précise) ; ajouter un cas dédié si on touche au
   flow de sélection.

### 5.5.5 Checklist de validation (à cocher avant merge)
- [ ] Lien déclencheur + Maison forte + arc léger + thème de trame (5.5.1).
- [ ] Rôle distinct, viable solo & duo, budget de stats dans l'enveloppe (5.5.2).
- [ ] Ton respecté, faiblesse réelle (anti-Mary-Sue), canon cohérent, run dédié
      désirable (5.5.3).
- [ ] **Les 2 images** : portrait-médaillon (`img/<key>.png` + `-original`)
      **ET** sprite plein corps (`img/players/<key>.png` + `PLAYER_SPRITE_SRC`)
      + `CHARACTERS` + carte + doc §5 + smoke vert (5.5.4).
- [ ] **Barks** : entrée `HERO_BARKS[<key>]` renseignée (4-6 événements +
      `houseTension` si pertinent) **ou** omission explicitement assumée
      (`js/hero-barks.js` — héros silencieux par défaut).
- [ ] **Profil doc complet** : tous les champs de la convention de tête
      (§5.0/§5.0.1 + profil §5.1/§5.2) remplis, sans trou.
- [ ] Cache PWA bumpé si front modifié (guideline §8).

---

## Récapitulatif express (pour briefer Gemini)
> 16 héros jouables (solo ou duo, défaut Harry + Hermione) : **5 figures canon**
> (Harry, Hermione, Drago, Cho, Cedric) ancrent le familier ; **11 originaux**
> forment la **Garde de l'Aube** (Céleste, Iris, Maxence, Anastasia, Louis,
> Jeanne, Agathe, Olivier, Nathalie, Olivier de Châtillon, Margaux), volontaires pressentis par le portrait de Dumbledore
> pour « remonter la lumière depuis le fond ». Chaque héros porte un trait dominant
> qui sert un thème de la trame (peur/sceau, choix/don, mythe/revers), une **apparence**,
> des **forces/faiblesses** lisibles dans ses stats, un **rôle de combat** et une
> **interaction Signature** propres. **Taglines, stats et sorts de départ = ✅** ;
> le fond psychologique = `💡`. Le **choix** se fait après l'intro et la Maison
> (solo/duo) ; la **customisation** passe par allocation + équipement + sorts (pas
> d'éditeur). La **§5.5** fixe la **règle normative d'ajout** d'un nouveau héros
> (conditions narratives, gameplay, intégration, checklist).
