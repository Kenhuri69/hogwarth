# 02 — Univers, ton & rapport au canon

**Statut :** 🟩 proposition de référence — à valider

> Objectif du chapitre : définir le cadre fictionnel — quelle époque, quel
> Poudlard, quel degré de fidélité à *Harry Potter*, et quel ton recherché.
> Tout ce qui est `💡` est une proposition argumentée et modifiable ; tout ce
> qui est `✅` est déjà acté dans le jeu. Voir le récit en bref en
> [01](01-synopsis-et-pitch.md) et la trame déroulée en
> [03](03-trame-principale.md).

---

## 2.1 Époque & situation

> 💡 (proposition)

Le jeu se déroule dans une **uchronie tardive assumée** : *après* la chute de
Voldemort telle que la connaît le canon, à une génération de distance. La
guerre est gagnée, l'école rebâtie, et une nouvelle promotion d'élèves la
fréquente — c'est elle qui fournit nos héros. Harry et Hermione, eux, ne sont
plus tout à fait des élèves : ils reviennent à Poudlard en figures tutélaires,
au même titre que les professeurs.

Ce choix résout proprement la tension que pose le bestiaire : le jeu fait
coexister **Voldemort « Affaibli » (ét. 9)** puis **« Ressuscité » (ét. 10)**
avec des élèves jouables inédits. L'explication narrative est que Voldemort
n'est pas *revenu* par un nouveau complot politique, mais **se ré-assemble
passivement** à mesure qu'une corruption ancienne remonte des fondations — un
résidu de mal que la peur tenait scellé, et que la descente du héros réveille.

> ✅ (dans le jeu) La menace centrale est la **corruption qui ranime
> Voldemort** ; le héros descend à contre-courant pour l'éteindre à la source.
> Le portrait de Dumbledore — donc un Dumbledore **mort, parlant depuis son
> cadre** — accueille et guide le héros, ce qui confirme une époque
> **post-canon**.

> ❓ **À travailler en l'état** (non tranché par le jeu) : le code ne fixe
> aucune date ; le seul indice est le portrait de Dumbledore (post-canon).
> À décider : date explicite (« ~20 ans après la Bataille ») ou flou assumé.

## 2.2 Le Poudlard du jeu

> 💡 (proposition) / ✅ (ancrages)

Le grand écart à expliquer est **géographique** : le canon décrit un château
qui s'élève (tours, étages, escaliers mobiles), tandis que le jeu est un
*dungeon crawler* qui **s'enfonce** étage après étage. La justification
proposée tient en une image : **Poudlard a toujours eu des profondeurs**, on
ne les regardait simplement jamais.

- **Étages 1–3 — Couloirs de Poudlard** (✅ tranche A) : le Poudlard connu,
  salles de classe, couloirs, portraits. C'est le familier qui se fissure.
- **Étages 4–6 — Cachots de Poudlard** (✅ tranche B) : la descente sous le
  niveau habité — cachots, réserves, oubliettes. La pierre froide remplace le
  bois et la tapisserie.
- **Étages 7–13 — Profondeurs Oubliées** (✅ tranche C) : sous les cachots
  s'ouvrent des galeries que nul plan de l'école ne mentionne. On y croise
  l'écho de la **Chambre des Secrets** (Basilic, Nagini, Aragog et sa
  descendance) sans qu'elle soit *la* Chambre : un réseau de cavernes plus
  vaste, creusé bien avant les Fondateurs.
- **Étages 14+ — Ruines Anciennes** (✅ tranche D) : des **ruines runiques
  antérieures à Poudlard**, sur lesquelles l'école a été bâtie. C'est de là
  que monte la corruption ; c'est le territoire de la Boucle Ténébreuse.

> 💡 Fil directeur : *« L'école est un couvercle posé sur quelque chose de plus
> vieux qu'elle. »* La verticalité descendante n'est pas un caprice de level
> design — c'est l'argument central de l'histoire. Descendre, c'est remonter le
> temps géologique du château jusqu'à ce que la peur avait enterré.

> ✅ (dans le jeu) Le découpage en quatre tranches est la **source unique de
> vérité** du tileset et de l'ambiance musicale (`floor-themes.js`,
> `getFloorTheme()`). Les Ruines Anciennes (14+) ne sont atteignables qu'en
> **Boucle Ténébreuse** (escaliers scellés tant que Voldemort n'est pas vaincu).

## 2.3 Rapport au canon HP

> 💡 (proposition) / ✅ (ancrages)

Le principe directeur : **un socle canon reconnaissable, une intrigue
originale par-dessus.** On emprunte au canon ce qui ancre l'univers, on invente
ce qui fait l'aventure.

**Ce qu'on garde du canon :**

| Catégorie | Éléments canon utilisés |
|-----------|--------------------------|
| Lieux | Poudlard, ses couloirs, cachots, infirmerie ; échos de la Chambre des Secrets et de la Forêt interdite (en profondeur). |
| Personnages | ✅ Harry, Hermione, Dumbledore (portrait), McGonagall, Rogue, Flitwick, Chourave, Hagrid, Mimi Geignarde, Lockhart, Sirius, Kingsley, Bill Weasley ; antagonistes : Voldemort, Bellatrix, Fenrir Greyback, Antonin Dolohov, Aragog, Nagini, Quirrell (ombre). |
| Sorts | ✅ Expelliarmus, Stupefix, Protego, Episkey, Incendio, Accio, Reparo, Diffindo, Sectumsempra, Avada Kedavra (verrouillé jusqu'au niv. 9), Wingardium Leviosa, Patronus Maxima… |
| Créatures | ✅ Détraqueurs, Épouvantards (Boggart), Niffleurs, Hippogriffes, Trolls, Acromantules, Basilic, Inferi, Loups-garous, Kappas, Mandragores, Bowtruckles, lutins de Cornouailles, Strangulots, Pitiponks… |
| Concepts | Les 4 Maisons et leurs chefs, les points de Maison, Félix Felicis, le Retourneur de Temps, la cape d'invisibilité, le Patronus. |

**Les libertés assumées :**

- ✅ **Héros jouables originaux** au-delà de Harry et Hermione : Céleste
  Luneclair, Iris Prismara, Maxence Ravenwood, Anastasia Moonveil (cf.
  [05](05-personnages-jouables.md)).
- ✅ **PNJ et factions inédits** : Louis Dragonflamme, Jeanne d'Argenciel,
  Agathe Lumiflore, Olivier de Clairval, **Manon et sa mère Élara** (arc du
  grimoire), le **Gardien de la Boucle**.
- ✅ **Boss et créatures originaux** : Veilleur du Seuil, Maître des
  Détraqueurs, Héraut des Ténèbres, Hécate la Maudisseuse, et tout le
  bestiaire « endgame ».
- 💡 **Structure en donjon** et **profondeurs runiques pré-Poudlard** :
  invention pure, justifiée par §2.2.
- 💡 **Boucle Ténébreuse** : le château se rejoue corrompu en variantes
  « Ténébreuses » — un dispositif de jeu (post-game) auquel on donne un sens
  narratif, pas un événement du canon.

> 💡 **Ligne de conduite** : on ne *réécrit* pas le canon, on **prolonge** dans
> ses marges. Tout ce qui touche aux personnages canon doit rester cohérent
> avec leur caractère (un Dumbledore-portrait bienveillant et énigmatique, un
> Rogue âpre mais loyal à l'école, un Hagrid chaleureux). L'intrigue, elle, est
> entièrement nôtre.

## 2.4 Ton & registre

> 💡 (proposition) / ✅ (ancrages)

Le ton suit la **descente** : il s'assombrit avec la profondeur, sans jamais
basculer dans l'horreur frontale. Le dosage proposé :

| Tranche | Dominante | Couleur émotionnelle |
|---------|-----------|----------------------|
| A (1–3) | Aventure scolaire | Familier, espiègle ; humour des fantômes et portraits bavards (Peeves, Mimi). |
| B (4–6) | Infiltration sombre | Austère, tendu ; premiers mangemorts, la menace se nomme. |
| C (7–13) | Horreur douce / épique | Inconnu, abyssal ; les boss canon, l'effroi maîtrisé du Détraqueur. |
| D (14+) | Mythe & solennité | Runique, légendaire ; le héros affronte ce que le mythe n'osait regarder. |

- 💡 **Horreur douce, jamais gratuite** : on suggère plus qu'on ne montre. Le
  Détraqueur glace (statut `peur`), le Boggart trouble — l'effroi passe par la
  mécanique et l'ambiance, pas par le gore.
- 💡 **L'humour comme respiration** : ✅ les fantômes comiques, les easter eggs
  et les anecdotes du bestiaire allègent la tension des étages bas. On garde
  cette soupape même profond — un trait d'esprit avant un boss humanise
  l'enjeu.
- 💡 **L'émotion en contrepoint** : les sous-intrigues écrites (le **grimoire
  d'Élara** — deuil et joie cachée ; l'**Épreuve de la Lumière Éternelle** de
  Dumbledore — le souvenir heureux contre les ténèbres) donnent du cœur à une
  aventure qui pourrait n'être que martiale.

## 2.5 Règles de l'écriture (style)

> 💡 (proposition)

Conventions de plume à tenir dans tous les textes de jeu (dialogues, lore,
messages, quêtes) :

- **Adresse au joueur : le « tu » narratif.** ✅ Le jeu tutoie le héros
  (« L'escalier le plus profond, scellé par la peur, s'ouvre enfin »). On garde
  ce tutoiement complice pour la voix narrative et l'interface.
- **Entre personnages : vouvoiement selon le rang.** Les professeurs vouvoient
  les élèves avec une distance bienveillante (McGonagall) ou sèche (Rogue) ;
  les élèves se tutoient. Les figures anciennes (Gardien de la Boucle, entités
  des Ruines) emploient un registre **soutenu et solennel**.
- **Niveau de langue : soigné, imagé, jamais pédant.** On vise la qualité
  éditoriale d'un roman jeunesse haut de gamme — phrases nettes, métaphores
  parcimonieuses, vocabulaire riche mais accessible.
- **Longueur des dialogues : brève par page.** ✅ Le système de dialogue PNJ est
  paginé ; viser 2 à 4 phrases par page, une idée par page. Les introductions
  (intro Dumbledore) peuvent s'étaler sur plusieurs pages.
- **Cohérence des noms** : conserver l'orthographe française du canon (Poudlard,
  Gryffondor, Serpentard, Serdaigle, Poufsouffle, Détraqueur, baguette de
  Sureau…) et les noms originaux exactement tels qu'enregistrés dans le code.

## 2.6 Lignes rouges (ce qu'on ne fera pas)

> 💡 (proposition)

- **On ne contredit pas le destin canon des personnages** : on ne « ressuscite »
  pas un mort du canon autrement que sous une forme assumée (portrait,
  souvenir, écho, corruption). Voldemort qui se ré-assemble est une *corruption
  résiduelle*, pas un retour glorieux qui invaliderait sa chute.
- **Pas d'horreur graphique ni de cruauté gratuite** : la cible reste tout
  public ; l'effroi est atmosphérique et mécanique.
- **Pas de prise de position réelle** (politique, religieuse) plaquée sur
  l'univers.
- **On ne casse pas le « pacte » du canon** : la magie obéit à ses règles
  connues (un sort connu fait ce qu'il fait dans le canon), les Maisons gardent
  leurs valeurs, et le château reste, au fond, **un lieu qu'on aime**.

---

## Questions de cadrage (résumé)

> ❓ **À travailler en l'état** :
> 1. **Époque** (non tranché par le jeu) — date explicite (« ~20 ans après la
>    Bataille ») ou flou assumé (« une génération plus tard ») ?
> 2. **Statut de Voldemort** — corruption résiduelle qui se ré-assemble
>    (proposition retenue ici) ou une autre explication à valider ?
> 3. **Profondeurs vs Chambre des Secrets** — assume-t-on que les Profondeurs
>    *englobent* l'écho de la Chambre, ou veut-on un étage scénarisé qui *soit*
>    la Chambre des Secrets ?

## Récapitulatif express (pour briefer Gemini)
> Uchronie **post-canon** : Poudlard rebâti, nouvelle promotion d'élèves
> (nos héros), Dumbledore guide depuis son portrait. La menace = une
> **corruption ancienne** remontant de **ruines pré-Poudlard** (14+), qui
> **ré-assemble** passivement Voldemort. Socle canon reconnaissable
> (personnages, sorts, créatures, Maisons) + intrigue et héros **originaux**
> par-dessus. Ton qui **s'assombrit avec la profondeur** (familier → mythe),
> horreur douce, humour en respiration, émotion en contrepoint. Voix narrative
> au **« tu »**, plume soignée, dialogues brefs et paginés. Lignes rouges :
> pas de contradiction du destin canon, pas d'horreur gratuite, le château
> reste un lieu qu'on aime.
