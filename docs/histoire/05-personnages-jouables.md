# 05 — Personnages jouables

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : donner à chaque héros sélectionnable une **personnalité, un rôle
> et un arc**. Le casting mêle figures canon et créations originales. `✅` = acté
> dans le jeu (`js/data.js` — `CHARACTERS`, taglines exactes) ; `💡` = proposition
> de fond narratif, librement modifiable. Voir la trame en
> [03](03-trame-principale.md) et les Maisons en [07](07-les-maisons.md).

---

## 5.0 Roster (✅ dans le jeu — `CHARACTERS`)

| Clé | Nom | Maison | Rôle | Sorts de départ (✅) | Origine |
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

> ✅ Le jeu se joue **solo (1)** ou **duo (2)**. Le duo par défaut est
> **Harry + Hermione**. Les 13 héros partagent la même paire de slots à l'écran
> de sélection ; n'importe quel binôme est jouable.

> 💡 **Note de design narratif** : les 5 figures canon servent d'« ancrage »
> familier ; les 8 originaux sont la marge de manœuvre de la spec — c'est par
> eux qu'on installe les enjeux **intimes** évoqués en [03 §3.7](03-trame-principale.md)
> sans réécrire le canon.

---

## 5.1 Figures canon

### Harry Potter

- **Maison / rôle :** Gryffondor / Auror (offensif + Protego).
- **Personnalité (3 traits) 💡 :** instinctif, loyal jusqu'à l'imprudence, allergique
  à l'injustice.
- **Motivation 💡 :** Voldemort se reforme sous le château ; pour Harry, ce n'est
  pas une mission — c'est *encore lui*. Il descend parce que personne d'autre ne
  devrait avoir à le faire.
- **Voix 💡 :** directe, peu de fioritures, ironie sèche dans le danger. Dit « on »
  plus que « je ».
- **Lien à la trame :** héros par défaut du duo ; figure que le portrait de
  Dumbledore reconnaît d'emblée (voir [06](06-pnj-et-factions.md)).
- **Arc personnel 💡 :** apprendre que descendre seul n'est pas du courage mais de
  l'orgueil — la Boucle Ténébreuse le confronte à sa propre légende ([03 §3.6](03-trame-principale.md)).
- **Tagline ✅ :** *« Le Survivant — courage et instinct. »*

### Hermione Granger

- **Maison / rôle :** Gryffondor / Mage (soin, support, magie forte).
- **Personnalité (3 traits) 💡 :** méthodique, indéfectible, exigeante (avec les
  autres comme avec elle-même).
- **Motivation 💡 :** la corruption est un *problème* avant d'être une terreur ; elle
  veut le comprendre pour le résoudre, là où Harry veut le frapper.
- **Voix 💡 :** précise, didactique, cite ses sources même au fond d'un cachot.
- **Lien à la trame :** binôme canonique de Harry ; pivot du support en duo
  (Episkey/Protego). Lectrice naturelle du **grimoire de givre d'Élara**.
- **Arc personnel 💡 :** accepter que tout ne se résout pas par le savoir — certaines
  ténèbres se traversent, pas se déchiffrent.
- **Tagline ✅ :** *« Brillante érudite — la magie par le savoir. »*

### Drago Malefoy

- **Maison / rôle :** Serpentard / Duelliste.
- **Personnalité (3 traits) 💡 :** orgueilleux, ambitieux, secrètement terrifié par
  ce qu'il a vu chez les siens.
- **Motivation 💡 :** descendre pour **se prouver** qu'il vaut mieux que son nom.
  Les mangemorts du donjon portent un visage qu'il connaît trop bien.
- **Voix 💡 :** hautaine en surface, fêlée quand on touche au sujet de sa famille.
- **Lien à la trame :** seul héros pour qui la **faction mangemort** ([06](06-pnj-et-factions.md))
  est un miroir personnel — il combat ce qu'il aurait pu devenir.
- **Arc personnel 💡 :** le rachat par le choix, écho du thème « le choix plutôt que
  le don » ([03 §3.7](03-trame-principale.md)).
- **Tagline ✅ :** *« Sang-pur ambitieux — la fierté avant tout. »*

### Cho Chang

- **Maison / rôle :** Serdaigle / Attrapeuse.
- **Personnalité (3 traits) 💡 :** vive, perspicace, marquée par un deuil qu'elle
  porte sans le dire.
- **Motivation 💡 :** Cedric n'est jamais revenu d'un tournoi ; elle ne laissera pas
  le château engloutir quelqu'un d'autre.
- **Voix 💡 :** posée, attentive aux détails ; remarque ce que les autres ratent.
- **Lien à la trame :** sa vélocité (rôle d'Attrapeuse) en fait l'un des meilleurs
  vecteurs d'esquive et de crit de sort (AGI). Lien thématique fort avec Cedric.
- **Arc personnel 💡 :** transformer le deuil en vigilance plutôt qu'en peur — or la
  peur est le **sceau** central de la trame.
- **Tagline ✅ :** *« Attrapeuse de Serdaigle — vive et perspicace. »*

### Cedric Diggory

- **Maison / rôle :** Poufsouffle / Champion.
- **Personnalité (3 traits) 💡 :** loyal, juste, naturellement rassembleur.
- **Motivation 💡 :** le Champion de l'école ne se dérobe pas quand l'école est
  menacée — c'est aussi simple, et aussi lourd, que ça.
- **Voix 💡 :** chaleureuse, encourageante, ferme sans dureté.
- **Lien à la trame :** incarnation vivante des valeurs de Poufsouffle ([07](07-les-maisons.md)) ;
  contrepoint lumineux à la descente.
- **Arc personnel 💡 :** porter le poids d'être l'exemple, sans s'y perdre.
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
- **Personnalité (3 traits) 💡 :** contemplative, lucide, sereine sous pression.
- **Motivation 💡 :** elle a lu dans les astres que « la lumière devait redescendre » ;
  elle obéit à une cartographie céleste plus qu'à la peur.
- **Voix 💡 :** calme, imagée (métaphores de lune et de marée), jamais pressée.
- **Lien à la trame :** sa magie de lune (Lumos Maxima, Aguamenti) en fait une
  réponse directe au thème « la peur comme sceau » — elle *éclaire*.
- **Arc personnel 💡 :** apprendre que toutes les prophéties ne se réalisent pas
  seules ; il faut descendre pour qu'elles deviennent vraies.
- **Tagline ✅ :** *« Astromage de Serdaigle — la lune guide ses sortilèges. »*

### Iris Prismara

- **Maison / rôle :** Poufsouffle / Enchanteresse.
- **Personnalité (3 traits) 💡 :** rieuse, généreuse, désarmante de bonne humeur.
- **Motivation 💡 :** elle descend pour **rendre la couleur** à un château qui vire
  au gris — sa chance (Félix, Riddikulus) est une forme d'espoir militant.
- **Voix 💡 :** pétillante, ponctue ses phrases de petites blagues, refuse le
  désespoir par principe.
- **Lien à la trame :** porteuse de Riddikulus, elle est l'arme naturelle contre les
  Épouvantards — l'humour comme antidote à la peur ([03 §3.7](03-trame-principale.md)).
- **Arc personnel 💡 :** comprendre que rire face aux ténèbres n'est pas les nier,
  mais refuser qu'elles gagnent.
- **Tagline ✅ :** *« Enchanteresse prismatique — la chance et la lumière à ses côtés. »*

### Maxence Ravenwood

- **Maison / rôle :** Serpentard / Mage de Sang.
- **Personnalité (3 traits) 💡 :** intense, solitaire, en lutte constante avec sa
  propre nature.
- **Motivation 💡 :** sorcier-vampire, il descend pour prouver qu'une malédiction de
  sang peut servir la lumière — et pour ne pas finir comme les morts-vivants du fond.
- **Voix 💡 :** grave, économe, métaphores de soif et de sang ; lucide sur ce qu'il est.
- **Lien à la trame :** Sanguini/Vampyrus le rapprochent dangereusement de la faction
  **morts-vivants** ([06 §6.4](06-pnj-et-factions.md)) — il combat ce qui le tente.
- **Arc personnel 💡 :** maîtriser la soif plutôt que la renier ; le sang répond au
  sang, mais c'est lui qui choisit à quoi il répond.
- **Tagline ✅ :** *« Sorcier-vampire — son sang répond au sang. »*

### Anastasia Moonveil

- **Maison / rôle :** Gryffondor / Mage de la Lune.
- **Personnalité (3 traits) 💡 :** studieuse, courageuse à froid, méticuleuse.
- **Motivation 💡 :** Gryffondor de tête plus que de cœur, elle descend par devoir
  raisonné — elle a *calculé* que personne n'était mieux placé.
- **Voix 💡 :** mesurée, soigne sa formulation, courage tranquille plutôt que fougue.
- **Lien à la trame :** pont entre l'audace de Gryffondor et la rigueur de Serdaigle ;
  contrepoint réfléchi à Harry.
- **Arc personnel 💡 :** accepter que le courage se décide parfois dans l'instant, pas
  seulement dans le plan.
- **Tagline ✅ :** *« Magicienne studieuse — la magie au clair de lune. »*

### Louis Dragonflamme

- **Maison / rôle :** Poufsouffle / Dompteur de Dragons.
- **Personnalité (3 traits) 💡 :** ardent, protecteur, débordant d'énergie.
- **Motivation 💡 :** il dompte le feu depuis l'enfance ; quand le château s'embrase
  de l'intérieur, il se sent appelé à descendre éteindre l'incendie — au sens propre.
- **Voix 💡 :** sonore, franche, vocabulaire de feu et d'écailles ; rit fort.
- **Lien à la trame :** sa baguette « pulse au rythme du feu » (Incendio) — pilier
  offensif élémentaire face aux résistances du bestiaire ([09](09-bestiaire-et-lore.md)).
- **Arc personnel 💡 :** apprendre que dompter, ce n'est pas dominer — y compris sa
  propre ardeur.
- **Tagline ✅ :** *« Dompteur de dragons — sa baguette pulse au rythme du feu. »*

### Jeanne d'Argenciel

- **Maison / rôle :** Gryffondor / Charmeuse de Sortilèges.
- **Personnalité (3 traits) 💡 :** espiègle, curieuse, courageuse sans le savoir.
- **Motivation 💡 :** la plus jeune de la Garde de l'Aube ; elle descend par
  curiosité émerveillée autant que par bravoure — le château est un grand secret
  qu'elle veut percer.
- **Voix 💡 :** vive, enthousiaste, ses incantations « chantent comme des étoiles ».
- **Lien à la trame :** porte un **Grimoire de Sortilèges** (Wingardium, Lumos) —
  vecteur d'utilitaire et de contrôle ; sa jeunesse rappelle l'enjeu (sauver les
  élèves, pas seulement l'école).
- **Arc personnel 💡 :** grandir trop vite, et garder malgré tout son émerveillement.
- **Tagline ✅ :** *« Petite Gryffondor espiègle — ses sortilèges chantent comme des étoiles. »*

### Agathe Lumiflore

- **Maison / rôle :** Gryffondor / Enchanteresse florale.
- **Personnalité (3 traits) 💡 :** douce, tenace, profondément vivante.
- **Motivation 💡 :** là où la corruption fait flétrir, elle fait pousser ; descendre,
  c'est pour elle semer la vie dans la pierre morte.
- **Voix 💡 :** chaleureuse, images végétales (racines, floraison, saisons).
- **Lien à la trame :** support et soin (Episkey, Ferula) — incarnation de la
  résilience ; antithèse douce des morts-vivants.
- **Arc personnel 💡 :** comprendre que faire pousser exige aussi d'arracher les
  mauvaises herbes — la douceur n'exclut pas le combat.
- **Tagline ✅ :** *« Enchanteresse florale — la vie s'épanouit sous ses sortilèges. »*

### Olivier de Clairval

- **Maison / rôle :** Serdaigle / Mage de combat.
- **Personnalité (3 traits) 💡 :** discipliné, intense, perfectionniste du sortilège.
- **Motivation 💡 :** pour lui le combat magique est un art ; le château corrompu est
  l'adversaire ultime contre lequel parfaire cet art — et le mettre au service du bien.
- **Voix 💡 :** sobre, technique, économe en mots, percutant comme ses sorts.
- **Lien à la trame :** Serdaigle qui choisit l'offensive (Incendio, Stupefix) plutôt
  que l'érudition pure — un autre visage de l'Aigle ([07](07-les-maisons.md)).
- **Arc personnel 💡 :** la maîtrise n'est rien sans la cause ; descendre lui donne un
  pourquoi à sa virtuosité.
- **Tagline ✅ :** *« Mage de combat — chaque sortilège frappe comme la foudre. »*

---

## 5.3 Dialogues de héros (cadrage)

> ❓ À arbitrer : les héros ont-ils des **barks** propres (répliques courtes en
> exploration et en combat — apparition de monstre, crit, KO, level-up), ou
> restent-ils **muets** façon avatar, la « voix » passant par les PNJ et le
> portrait de Dumbledore ?
>
> 💡 Recommandation : un **jeu de barks léger et optionnel** (quelques lignes par
> héros, déclenchées sur événements rares) suffit à incarner les voix décrites
> ci-dessus sans alourdir le combat ni multiplier les assets audio. À cadrer avec
> le système de voix (`speakSpell`, samples OGG) côté gameplay.

---

## Récapitulatif express (pour briefer Gemini)
> 13 héros jouables (solo ou duo, défaut Harry + Hermione) : **5 figures canon**
> (Harry, Hermione, Drago, Cho, Cedric) ancrent le familier ; **8 originaux**
> forment la **Garde de l'Aube** (Céleste, Iris, Maxence, Anastasia, Louis,
> Jeanne, Agathe, Olivier), volontaires pressentis par le portrait de Dumbledore
> pour « remonter la lumière depuis le fond ». Chaque héros porte un trait dominant
> qui sert un thème de la trame (peur/sceau, choix/don, mythe/revers). **Taglines
> et sorts de départ = ✅** ; le fond psychologique = `💡` à valider.
