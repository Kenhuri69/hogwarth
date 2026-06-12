# 11 — Mondes Parallèles & Boucle Ténébreuse (endgame & rejouabilité)

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : faire du Chapitre 11 le **pilier endgame & rejouabilité** du jeu.
> Il pose la fiction des **deux façons de prolonger l'aventure** une fois
> Voldemort vaincu — deux directions opposées, déjà esquissées en [§11.5](#115-cadrage--canon-dans-la-fiction-ou-méta-mode-) :
>
> | Pilier | Direction | Geste | Tonalité | Partie |
> |--------|-----------|-------|----------|--------|
> | 🌑 **La Boucle Ténébreuse** | *descendre* (vertical) | s'enfoncer vers **sa propre ombre** | introspective, tragique, mythique | **Partie B** (§11.6+) |
> | 🟢 **Les Mondes Parallèles** | *traverser* (latéral) | marcher vers **l'autre** (autres joueurs) | sociale, curieuse, bienveillante | **Partie A** (§11.0–11.5) |
>
> Conventions : `💡` = proposition narrative modifiable ; `✅` = acté dans le jeu
> (système) ; `❓` = point à valider. Le « comment » technique de la Boucle est
> esquissé dans `.claude/plans/_archive/chapter-11-dark-loop.md` (ÉTAPE 2) ; celui des
> Mondes Parallèles dans `CLAUDE.md` § *Mondes Parallèles* +
> `.claude/plans/parallel-worlds.md`.
>
> 🔗 La Boucle est **aussi** traitée, sous d'autres angles, en
> [03 §3.6 (Acte IV)](03-trame-principale.md), [04](04-structure-actes-et-etages.md)
> (structure), [07](07-les-maisons.md) (paliers Mythe/Apothéose/★ N),
> [09 §9.10](09-bestiaire-et-lore.md) (Ténébreux), [10 zone D](10-lieux-et-geographie.md)
> (Ruines Anciennes) et [12](12-glossaire-et-codex.md) (Codex). **Ce chapitre ne
> les redouble pas** : il les **noue** en un seul système de rejouabilité et
> renvoie aux fiches détaillées.

---

# PARTIE A — Les Mondes Parallèles (rejouabilité *latérale*)

> 🟢 *Traverser.* La fiction derrière le système de **visites inter-mondes** :
> le « pourquoi » magique d'aller voir le donjon d'un autre joueur. Système
> **diégétique mais facultatif** (cadrage en [§11.5](#115-cadrage--canon-dans-la-fiction-ou-méta-mode-)).

---

## 11.0 Ce qui est acté côté système (✅ dans le jeu)

| Brique | Fait de jeu |
|--------|-------------|
| **Cheminette Inter-Mondes** | Sort de niv. 8 (25 PM) — ouvre un portail vers le donjon d'un autre sorcier en ligne (visite **asynchrone**). **Exclu en mode Ironman.** |
| **Visite** | Le visiteur se déplace chez l'hôte, mais ne touche **pas** son économie (pas de coffres pillés, pas d'XP volée). Il n'explore que ce que l'hôte a **déjà découvert** ; le reste est un brouillard infranchissable. |
| **Social** | **Messages au sol**, **cadeaux**, **emotes** déposés chez l'hôte. |
| **Échos & combat astral** | Le visiteur affronte des **échos** des monstres de l'hôte (instance isolée, scalée à son niveau). Limité à **3 par étage**. Sa mort l'éjecte — pas de permadeath, pas d'impact sur sa save. |
| **Verrous de Sang** | Le visiteur **scelle une menace** chez l'hôte ; l'hôte la résout plus tard ; le visiteur **réclame** sa part. |
| **Économie cross-plan** | Monnaie **Essence d'Outremonde** ; **Atelier du Voyageur** (4 onglets) qui débloque **souvenirs** (passifs), **cosmétiques**, **sorts cross-plan** et le **set Voyageur**. Aucune retombée sur le donjon de l'hôte. |
| **Hôte** | Peut fermer ses portes (`#btn-visits`, « visites closes »). |

> 💡 Tout le reste de ce chapitre **habille** ces briques d'une fiction. La
> fiction est conçue pour être **retirable** sans casser le récit principal
> (voir l'arbitrage en 11.5).

---

## 11.1 La fiction du voyage entre mondes

> 💡 (proposition)

Poudlard n'est pas un lieu unique : c'est un **motif**. Le même château se
répète à travers d'innombrables **plans** — des Poudlard parallèles, chacun
hanté par sa propre corruption, descendu par son propre élève. Ce sont des
**reflets** : familiers sans être identiques. La géographie diffère d'un plan
à l'autre, les créatures n'occupent pas les mêmes couloirs, les PNJ ont fait
d'autres choix. Là où ton château t'envoie un coffre, le sien t'offre une
fontaine ; là où tu as fui, un autre a tenu.

Ce qui relie ces reflets, c'est la **Cheminette** — non pas le réseau ordinaire
des âtres, mais une **veine secrète** qui court sous les fondations, plus
ancienne que l'école. Là où la **Boucle Ténébreuse** plonge *vers le bas*
(plus profond, plus sombre, dans un seul monde), la Cheminette ouvre *de côté* :
un pas dans la cendre verte, et l'on se tient dans le château d'un autre, à
l'étage exact qu'il a atteint.

> 💡 **Pourquoi visiter ?** Trois moteurs narratifs, distincts du récit
> principal :
> - **Curiosité** — voir comment un autre a vécu la même descente : ses
>   messages au sol, ses cadeaux, la forme de son donjon.
> - **Entraide** — laisser une trace utile (cadeau, message), sceller une
>   menace que l'hôte combattra plus tard (Verrou de Sang).
> - **Quête personnelle du Voyageur** — récolter l'**Essence d'Outremonde**,
>   matière qui ne tient pas dans un seul monde, pour forger des reliques
>   impossibles à obtenir chez soi (set Voyageur).

> 💡 **Le visiteur est un fantôme bienveillant.** Quand on visite, on n'est pas
> *pleinement* présent : on est une **projection astrale**, un voyageur de cendre
> verte. On ne peut rien casser de réel, rien voler de réel. C'est ce qui rend
> la visite **intime et sans danger pour l'hôte** — la justification fictionnelle
> de la règle « zéro impact économique ».

## 11.2 Échos & combat astral

> 💡 (proposition, sur base ✅)

Un monde parallèle n'est pas figé : il **rêve** des combats que son hôte a
menés. Ces rêves prennent forme quand un voyageur passe — ce sont les
**échos**. Un écho n'est pas le monstre réel (celui-ci appartient à l'hôte,
intouchable) : c'est sa **silhouette de mémoire**, une créature de souvenir
qui se durcit assez pour mordre, mais qui s'évanouit en fumée verte une fois
abattue. La présence du voyageur, étrangère au plan, **réveille** ces échos —
voilà pourquoi le château de l'autre se peuple quand on y entre.

Le **combat astral** se joue donc dans une bulle : un duel entre la projection
du visiteur et la mémoire d'une créature. Personne n'en sort blessé pour de
vrai. La mort du visiteur ne fait que **rompre le fil de cendre** : la
projection se dissipe, on rouvre les yeux chez soi, intact (✅ pas de
permadeath, pas d'écho sur la save). Mais terrasser un écho **condense** une
goutte d'**Essence d'Outremonde** — la peur d'un autre monde, cristallisée,
qui devient matière pour le Voyageur.

> 💡 **Limite des 3 échos par étage** (✅ système) : un plan ne supporte qu'un
> nombre limité d'intrusions de souvenir avant que sa trame ne se referme.
> Au-delà, les échos « se sont tus » — le château de l'hôte t'a assez montré.

## 11.3 Verrous de Sang

> 💡 (proposition, sur base ✅)

Le **Verrou de Sang** est un **pacte d'entraide différée** — pas une malédiction.
Avant de quitter un monde, le voyageur peut **sceller une menace** dans un
couloir de l'hôte : il y enferme l'écho d'une créature dangereuse derrière un
sceau de sa propre signature magique (une goutte de volonté, d'où le nom).
Quand l'hôte, plus tard, arrivera devant ce sceau et **brisera le Verrou**, il
affrontera la menace **dans son vrai monde** — un défi corsé, mais récompensé.

C'est un **cadeau à double tranchant et à double profit** :
- L'**hôte** reçoit un combat d'élite (et son butin) qu'il n'aurait pas eu —
  un test laissé par un inconnu d'un autre plan.
- Le **voyageur**, lui, peut **réclamer sa part** une fois que l'hôte a relevé
  le défi : preuve que sa marque a tenu, que son passage a *compté* dans un
  monde qui n'est pas le sien.

> 💡 Tonalité : c'est l'équivalent magique d'un mot laissé à un voyageur qui
> viendra après soi — *« je suis passé, j'ai laissé un défi digne de toi, qu'il
> te rende plus fort. »* On scelle **avec son sang** parce qu'un pacte entre
> plans exige un gage de soi : on ne peut tricher sur ce qu'on laisse à un
> autre monde.

## 11.4 Le Voyageur & ses reliques

> 💡 (proposition, sur base ✅)

Le **Voyageur** n'est pas un personnage : c'est un **rôle**, une voie que
n'importe quel héros endosse dès qu'il maîtrise la Cheminette Inter-Mondes
(niv. 8). Marcher entre les plans laisse une empreinte — et cette empreinte se
matérialise en reliques que seul un Voyageur peut porter, forgées à
l'**Atelier du Voyageur** (✅ `#btn-atelier`) à partir d'**Essence d'Outremonde**.

> 💡 **Le set Voyageur** : un équipement de cendre verte et de cuir patiné par
> les passages. Chaque pièce porte la trace d'un seuil franchi. Là où les sets
> de Maison ancrent le héros dans une identité (lion, serpent, aigle, blaireau),
> le set Voyageur l'ancre dans le **mouvement** : ses bonus récompensent celui
> qui ne tient pas en place, qui va voir ailleurs.

> 💡 **Les souvenirs** sont des **passifs** gravés dans la mémoire du Voyageur,
> chacun marquant une étape de sa pratique inter-mondes. Propositions de lore
> pour les trois jalons évoqués :
> - **Premier Pas** — la mémoire du tout premier seuil franchi. *« On n'oublie
>   jamais la première fois que le monde, derrière soi, n'était plus le même. »*
> - **Astralien** — l'habitude du voyage de cendre ; la projection se tient plus
>   ferme, les échos mordent moins. Celui qui a beaucoup voyagé n'est plus tout
>   à fait d'un seul plan.
> - **Cartographe** — l'œil qui retient la forme de chaque château visité ;
>   un voyageur qui a vu cent donjons lit le sien d'un autre regard.

> ❓ À détailler : la liste exacte des souvenirs et leurs effets chiffrés
> relève du gameplay. Ici on ne pose que le **sens** ; les valeurs sont à
> caler avec l'Atelier (code) et reportées au [glossaire](12-glossaire-et-codex.md).

## 11.5 Cadrage : canon-dans-la-fiction ou méta-mode ?

> 💡 (arbitrage proposé)

**Décision proposée : système diégétique léger, narrativement optionnel.**
La fiction des Mondes Parallèles est **canon-dans-la-fiction** — les plans
parallèles, la Cheminette comme veine ancienne, les échos comme souvenirs du
château : tout cela *existe* dans l'univers du jeu et se raconte sans rompre
le ton (un sortilège de niveau élevé, une magie de seuil). **Mais** le récit
principal (la descente, Voldemort, la Boucle Ténébreuse) **se tient
intégralement sans y toucher** : aucune quête principale, aucun boss, aucune
révélation de la trame ne dépend d'une visite.

Concrètement :
- La Cheminette est une **branche tardive et facultative** (niv. 8), comme un
  domaine de maîtrise que l'on explore *en plus*.
- Elle est **exclue en Ironman** (✅) — ce qui se justifie en fiction : un
  Voyageur dilue sa présence entre les plans, incompatible avec la **permadeath**
  d'un héros qui ne mise que sur un seul monde, le sien.
- Si on coupe entièrement la fonctionnalité (feature flag à `false`, ✅), le
  joueur ne perd **aucun fil narratif obligatoire**.

> ❓ À arbitrer : la **séparation Boucle Ténébreuse / Mondes Parallèles** est-elle
> à thématiser explicitement ? Proposition : *descendre* (Boucle, vertical, vers
> sa propre ombre) vs *traverser* (Voyageur, latéral, vers l'autre). Deux façons
> opposées de prolonger l'aventure — l'une introspective, l'autre sociale. À
> confirmer comme axe de design narratif.

> ❓ À arbitrer : un PNJ **mentor du voyage** (un « Maître de la Cheminette »,
> ou une figure rencontrée au premier passage) pourrait introniser le Voyageur
> et donner chair à l'Atelier — ou bien le système reste-t-il volontairement
> **sans tuteur**, découvert par le seul sort ? → à relier à
> [06](06-pnj-et-factions.md).

---

## 11.A — Récapitulatif Partie A (Mondes Parallèles)
> Chaque save = un **plan parallèle** (un Poudlard-reflet). La **Cheminette
> Inter-Mondes** (niv. 8, exclue Ironman) projette le héros, en **fantôme de
> cendre verte**, dans le donjon d'un autre joueur : il y explore ce que l'hôte
> a découvert, laisse messages/cadeaux, affronte des **échos** (souvenirs de
> monstres → **Essence d'Outremonde**), et scelle des **Verrous de Sang** (défis
> d'entraide différée). L'Essence forge les reliques du **Voyageur** (set,
> souvenirs) à l'**Atelier**. Système **diégétique mais facultatif** : le récit
> principal (descente, Voldemort ét. 10, Boucle Ténébreuse 11+) tient sans lui.

---

# PARTIE B — La Boucle Ténébreuse (rejouabilité *verticale*)

> 🌑 *Descendre.* Le pilier endgame **central** : ce qui se passe **après** la
> victoire sur Voldemort (étage 10). Là où la Partie A invite à *traverser* vers
> les autres, la Boucle invite à *s'enfoncer* vers soi — vers ce que le mythe du
> héros attire de plus profond ([01 §1.7](01-synopsis-et-pitch.md)).
>
> ⚠️ **Cadre canon (à ne jamais contredire).** Le jeu implémente déjà la Boucle
> comme une **descente continue, sans fin scénarisée** : recyclage `effectiveFloor`
> (étages 11+), paliers de Maison **Mythe (17) → Apothéose (18) → série ★ N**
> (prestige « infini », génératrice), gold-sink `donateGoldToHouse`, gate unique
> `victoryAchieved` ([03 §3.6](03-trame-principale.md), [07](07-les-maisons.md)).
> Tout ce qui suit **habille** ce socle ✅ d'une fiction de rejouabilité et y
> **superpose** des propositions 💡 / des arbitrages ❓ — **sans** remplacer le
> modèle continu ni introduire de fin obligatoire.

---

## 11.6 Introduction & lore de la Boucle Ténébreuse

> 💡 (proposition de sens) / ✅ (ancrages)

### 11.6.1 Pourquoi la Boucle existe

La victoire est un **mensonge tendre**. Vaincre Voldemort referme la serrure du
**haut** — mais la Clé de Voûte des Quatre n'était pas une porte unique : c'était
le **dernier verrou** posé sur quelque chose de bien plus ancien
([12 §12.4.1](12-glossaire-et-codex.md)). En arrachant la dernière dent du
verrou, le héros **n'a pas scellé la faille : il l'a ouverte**. *« L'escalier le
plus profond, scellé par la peur, s'ouvre enfin »* — et le château, au lieu de
guérir, **se rejoue, corrompu** (✅ bascule en Boucle Ténébreuse,
[03 §3.6](03-trame-principale.md)).

La Boucle n'est donc pas un *recommencement* mécanique : c'est la **conséquence
narrative** de la fêlure menée à son terme. Trois vérités, héritées des autres
chapitres, la fondent :

- **Géographique** : descendre = remonter le temps ([10 §10.3](10-lieux-et-geographie.md)).
  Sous le fond du château (zone C) s'ouvrent les **Ruines Anciennes** (zone D,
  étages 14+) — la **roche-mère magique antérieure aux Fondateurs**, que la peur
  tenait close. Les Fondateurs n'ont **pas creusé** ces Ruines : ils ont **bâti
  Poudlard par-dessus** pour les oublier ([10 §10.1](10-lieux-et-geographie.md)).
- **Mythologique** : le héros est devenu **légende** — et *« la légende attire le
  plus profond »* ([01 §1.7](01-synopsis-et-pitch.md), [03 §3.7](03-trame-principale.md)).
  La Boucle est le **revers du mythe** : le prix de la gloire est d'être appelé
  toujours plus bas.
- **Magique** : les **voix des Fondateurs** ([09 §9.1](09-bestiaire-et-lore.md))
  cessent d'être de simples murmures dans la pierre et deviennent des **échos
  temporels** ([10 §10.8](10-lieux-et-geographie.md)) — le lieu est si vieux qu'il
  *rejoue* le moment où le sceau fut posé. La Boucle est l'endroit où l'on **voit**
  enfin ce que les manuels taisaient.

> 💡 **L'image-clé.** La Boucle n'est pas un cercle qui ramène au même point —
> c'est une **spirale qui s'enfonce**. À chaque tour, on revient sur des décors
> familiers (les étages se recyclent, ✅ `effectiveFloor`), mais **plus bas, plus
> froids, plus gravés**. Le familier qui revient *altéré* est le moteur d'horreur
> du endgame, comme le familier qui se fissurait l'était de l'Acte I
> ([03 §3.2](03-trame-principale.md)).

### 11.6.2 Le rôle du joueur — le « Porteur d'Éclats »

> 💡 (proposition de rôle endgame, sur base ✅ du fil rouge `eclat_voute`)

Dans la trame principale, le héros collecte **trois** Éclats de la Clé de Voûte
(`eclat_voute` ×3, drop garanti par tranche : Peeves → Loup-Garou Adulte →
Mangemort d'Élite, [08 §8.6.1](08-quetes-et-sous-intrigues.md)). Réunis, ils
**nomment la double trame** : le verrou cachait deux choses, pas une
([12 §12.4.7](12-glossaire-et-codex.md)).

En Boucle, ce fil devient un **rôle** : le héros endosse celui de **Porteur
d'Éclats**. Chaque pas dans la spirale corrompue **détache de nouveaux fragments**
— non plus du verrou (il est brisé), mais des **réalités que la faille déchire**.
À mesure que la Boucle déplie des décors *presque* identiques mais subtilement
faux, le Porteur d'Éclats **ramasse les coutures du réel** : des éclats de
mémoire, de futurs avortés, de mondes-reflets effleurés (résonance avec la
Partie A — les plans parallèles).

> 💡 **Pourquoi « Porteur » et non « Collectionneur ».** On ne *possède* pas les
> Éclats : on les **porte**, comme un poids. Chaque fragment est un morceau de
> réel arraché ; les accumuler rapproche le héros de la **vérité finale** (la
> quête « Briser le Cycle », §11.10) — mais aussi de ce que les Ruines
> contiennent. *Porter* dit le coût : la légende qui descend s'alourdit de tout
> ce qu'elle ramasse.

> 💡 **Traduction de jeu** (proposée, détail en ÉTAPE 2 / plan) : un compteur
> `accumulatedEclats` (persistant) distinct des 3 `eclat_voute` canon. Il
> alimente un **fil de prestige narratif** transverse aux boucles et **jalonne**
> la quête optionnelle « Briser le Cycle ». Il **ne gate jamais** la descente
> (garde-fou de trame, [04 §4.7](04-structure-actes-et-etages.md)).

---

## 11.7 Mécaniques globales de la Boucle

> ✅ (socle de jeu) / 💡 (lecture narrative & propositions)

### 11.7.1 Les niveaux de Boucle (Boucle 1, 2, 3… et au-delà)

**Réconciliation canon ⇄ rejouabilité.** Le jeu **ne redémarre pas** : la
descente est **continue et infinie** (étages 11, 12, 13… ∞). Plutôt que d'imposer
un découpage artificiel, on **lit** la descente continue comme une succession de
**tours de spirale** :

> 💡 **Définition proposée.** Un **Niveau de Boucle** (`loopNumber`, *dérivé*) est
> un **palier de profondeur narratif**, recalculé depuis l'étage le plus profond
> atteint — pas un état sauvegardé lourd. Convention :
>
> | Niveau | Étages | Zone (✅) | Nom narratif | Intensité |
> |--------|--------|-----------|--------------|-----------|
> | **Boucle 0** | 1–10 | A→C | *La Descente* (trame principale) | — (pré-Boucle) |
> | **Boucle 1** | 11–13 | C (override runique) | *Le Premier Tour* | ❄❄❄❄ |
> | **Boucle 2** | 14–20 | D (Ruines : Seuil → Cœur) | *La Spirale runique* | ❄❄❄❄+ |
> | **Boucle 3+** | 21+ | D (Avant-Monde) | *L'Abîme* (prestige ★ N) | ❄❄❄❄+ |
>
> Au-delà, chaque ★ N de Maison ([07](07-les-maisons.md)) **est** un cran de
> Boucle supplémentaire : la spirale n'a pas de dernier tour.

> ❓ **À arbitrer** (cf. plan ÉTAPE 2 §B.7) : garde-t-on ce **modèle continu +
> `loopNumber` dérivé** (recommandé — canon, complexité maîtrisée), ou introduit-on
> un **vrai New Game+ discret** avec reset partiel et héritage explicite (coût
> moteur lourd, contredit la descente continue) ? Recommandation : **continu**.

### 11.7.2 Le système d'héritage entre boucles

Parce que le jeu **n'efface rien**, l'« héritage » n'est pas une mécanique à
inventer : c'est la **persistance normale** de la progression, qui devient
*signifiante* en endgame.

| Ce qui se transmet | Statut | Support de jeu |
|--------------------|--------|----------------|
| **Connaissances (Codex)** | ✅ persistant | Entrées déverrouillées/révélées ne se reverrouillent jamais ([12 §12.1](12-glossaire-et-codex.md)). Le Codex devient *Archive des Ruines Anciennes* en Boucle. |
| **Objets & équipement** | ✅ partagés/persistants | Inventaire, sets de Maison, légendaires, Forge/Bibliothèque endgame. |
| **Compétences & sorts** | ✅ persistants | Sorts appris, sort de Mythe (palier 17), passif d'Apothéose (18). |
| **Souvenirs (mémoire)** | 💡 narratif | Les barks de héros, les variantes de Maison, les écho-scellements *vus* : le héros « se souvient » des tours précédents. |
| **Éclats portés** | 💡 `accumulatedEclats` | Le fil de prestige du Porteur d'Éclats (§11.6.2). |

> 💡 **Le sens de l'héritage.** Là où la corruption **efface** (le château oublie
> qu'il fut une école), le héros, lui, **garde** — c'est sa résistance. Chaque
> boucle hérite de la mémoire de la précédente : on **reconnaît** un couloir
> qu'on a déjà purgé, une voix qu'on a déjà entendue, un Éclat qu'on a déjà porté.
> Cette reconnaissance qui s'accumule **est** la rejouabilité : on ne rejoue pas
> le même donjon, on rejoue un donjon qui *se souvient de nous*.

### 11.7.3 Modifications progressives de la réalité (subtiles → marquées)

La réalité se déforme **crescendo** avec la profondeur — jamais d'un coup. C'est
le **thermomètre ❄** de [10 §10.2](10-lieux-et-geographie.md), prolongé en Boucle :

| Stade | Étages | Modification (subtile → marquée) | Support ✅ / 💡 |
|-------|--------|----------------------------------|------------------|
| **Subtil** | 11–13 | Mêmes décors (zone C) mais **recouverts de runes** ; cris de créatures « familiers et faux » ; brume basse naissante. | ✅ override `rune_*` ; ✅ recyclage ; 💡 premiers échos temporels. |
| **Net** | 14–16 | L'architecture **cesse d'être humaine** : monolithes, racines géantes, runes qui palpitent. | ✅ tranche D `rune_*`, ton `abyss` ; ✅ transition 13↔14. |
| **Marqué** | 17–20 | La ruine **se rallume** : cristaux de magie brute, runes qui *brûlent*, **scènes du passé rejouées** traversables ; **4 timbres de Fondateurs** distincts. | ✅ boss Ténébreux (18-20) ; ✅ Chambres des Fondateurs ; 💡 échos « scène rejouée ». |
| **Total** | 21+ | **Avant l'écriture** : plus de runes, magie brute, lumière froide compactée, un **battement organique** — *« ce qui dort »*. | ✅ plafond de scaling ; ❓ personnifier « ce qui dort » ? |

> 💡 **Règle d'or de la déformation** : la modification doit toujours **partir du
> familier** pour le **trahir** — jamais du nouveau pur. C'est la trahison du
> connu qui inquiète. Un couloir d'école *presque* normal mais aux portraits qui
> ne te reconnaissent plus fait plus peur qu'un décor alien inédit.

> 💡 **Traduction de jeu** : l'intensité des overlays (givre, fog bleu, densité
> d'échos, teinte runique des sprites) croît avec `loopNumber`, **bornée** par un
> cap (lisibilité). Cosmétique en V1 ; aucune refonte de la topologie procédurale
> (on **ne génère pas** plusieurs donjons, cohérent [10 §10.6](10-lieux-et-geographie.md)).

---

## 11.8 Variantes selon les choix — l'empreinte durable des décisions

> 💡 (proposition de rejouabilité) / ✅ (ancrages cosmétiques & mécaniques)

L'objectif endgame : faire **sentir que les choix de toute la partie ont un
impact durable** en Boucle. Quatre leviers, du plus mécanique au plus narratif.

### 11.8.1 Impact fort de la Maison (`chosenHouse`)

La Maison **colore la Boucle entière** — c'est la récompense de l'identité menée
à son terme. Trois couches, toutes ancrées sur de l'existant :

1. ✅ **Paliers endgame de Maison** : le **sort de Mythe** (palier 17) et le
   **passif d'Apothéose** (palier 18) changent radicalement le *style* de jeu en
   Boucle ([07](07-les-maisons.md)). C'est l'impact **le plus concret**.
2. ✅ **Chambres des Fondateurs** (étages 17–20, [10 §10.5](10-lieux-et-geographie.md)) :
   quatre caveaux de mémoire, un par Fondateur. **Seule la Chambre de la Maison du
   héros s'illumine et l'accueille** ; les trois autres restent **hostiles et
   muettes**. Récompense atmosphérique forte et **différente à chaque partie**.
3. 💡 **Écho de la quête signature** ([03 §3.8](03-trame-principale.md),
   [08 §8.5](08-quetes-et-sous-intrigues.md)) : la signature accomplie dans les
   Actes I–III **revient en Boucle**, déchirée/altérée.

> 💡 **Exemples concrets par Maison** (la « couleur » que prend la Boucle) :
>
> | Maison | Couleur de la Boucle | Écho de signature (Boucle) | Variante perçue ([10 §10.6](10-lieux-et-geographie.md)) |
> |--------|----------------------|----------------------------|-----------------------------|
> | 🦁 **Gryffondor** | **Héroïsme & sacrifices** : la Boucle teste si le courage tient quand la victoire ne ferme plus rien. La flamme survit-elle au froid absolu ? | *L'Étendard de Godric* : la **Bannière déchirée** ; rallumer un **dernier brasier** sur l'autel de la Chambre du Lion. | Marques de bataille, **flammes qui tiennent** au froid. |
> | 🐍 **Serpentard** | **Trahisons & opportunités grises** : la Boucle offre des **raccourcis** et des pactes — chaque gain a une ombre. L'écho de Salazar revient pour une **dernière passation**. | *Le Pacte des Cachots* : un **dernier pacte** (selon `slythPactChoice`) ; serrures qui s'ouvrent seules. | Monolithes qui **s'écartent** pour lui ; passages descellés. |
> | 🦅 **Serdaigle** | **Vérité & vertige** : la Boucle est un **livre qui s'écrit seul**. Les runes d'override **ne sont pas du décor — ce sont des phrases**. Comprendre, c'est révéler la faille (et son propre rôle). | *Le Codex de Rowena* gagne ses **pages ténébreuses** ; énigme finale des Ruines. | Runes qui **se traduisent d'elles-mêmes** ; langue-mère lisible. |
> | 🦡 **Poufsouffle** | **Résilience & refuge** : la Boucle veut isoler ; le Blaireau **rétablit l'abri**. Protéger les **échos des rescapés** quand tout veut effacer. | *Ceux qu'on ne laisse pas derrière* : le **Refuge à rétablir** ; veiller les présences neutres. | **Alcôves tièdes** entre les racines ; créatures neutres qui veillent. |

### 11.8.2 Impact du héros choisi

> 💡 (cosmétique, sur base ✅ du système de barks)

Le **héros** (parmi les 13 jouables, [05](05-personnages-jouables.md)) colore la
Boucle par sa **voix** : le système `HERO_BARKS` (✅, cosmétique et défensif)
porte déjà des variantes `houseTension[<Maison>]` et des beats scénarisés. En
Boucle, un héros dont la **Maison canon diffère de `chosenHouse`** vit une
tension propre (ex. un héros Serpentard de cœur engagé chez Gryffondor entend
l'écho de Salazar autrement). Purement narratif ; un héros sans entrée reste
silencieux.

### 11.8.3 Impact des quêtes signature terminées (flags d'héritage)

Les **flags de signature** (✅ `gryffSignatureDone`, `slythSignatureDone` +
`slythPactChoice`, `ravenSignatureDone`, `poufSignatureDone`) — qui modulent
déjà le **combat final** contre Voldemort ([03 §3.8](03-trame-principale.md)) —
**persistent en Boucle** et y conditionnent l'**écho de signature** (§11.8.1).
Avoir bouclé sa signature, c'est **emporter** son aboutissement dans la spirale ;
l'avoir laissée en plan, c'est descendre avec une **dette narrative** (la
Bannière reste déchirée, le pacte inachevé, le Codex amputé, le Refuge vide).

### 11.8.4 Impact des Éclats collectés

Le **rang d'Éclats** (✅ `eclatProgress` 1→3 pour la trame ; 💡 `accumulatedEclats`
pour la Boucle, §11.6.2) débloque les **révélations** du Codex (entrées
*révélées* → *corrompues*, [12 §12.4](12-glossaire-et-codex.md)) et **jalonne** la
quête « Briser le Cycle » (§11.10). Plus on a porté d'Éclats, plus la **vérité
finale** est proche — et plus la Boucle se *dévoile* au lieu de seulement
s'assombrir.

---

## 11.9 Évolution des contenus existants dans la Boucle

> ✅ (systèmes existants) / 💡 (propositions d'extension) — **renvois, pas
> duplication** : les fiches détaillées vivent dans leurs chapitres.

### 11.9.1 Lieux ([10](10-lieux-et-geographie.md))

- ✅ **Versions corrompues** : override `rune_*` dès l'étage 11 ; tranche D
  « Ruines Anciennes » (14+) au tileset/ton `abyss`.
- ✅ **Architecture altérée crescendo** : monolithes, racines géantes, cristaux
  de magie brute, **Grand Escalier qui dégénère** (figé → suspendu → organique →
  flottant, [10 §10.5](10-lieux-et-geographie.md)).
- 💡 **Nouveaux échos temporels** : murmure → silhouette → **scène rejouée**
  traversable ([10 §10.8](10-lieux-et-geographie.md)). En Boucle, leur **densité
  croît avec `loopNumber`**.
- ✅ **Lieux-signatures de Boucle** : Chambres des Fondateurs (17–20), Forge &
  Bibliothèque (Salle sur Demande dégradée — *Refuge errant*).

### 11.9.2 Bestiaire ([09](09-bestiaire-et-lore.md))

- ✅ **Créatures plus puissantes** : `effectiveFloor` + `floorKillCount` scalent
  et densifient (gros groupes 4-5 en duo post-victoire).
- ✅ **Variantes Ténébreuses** : boss 8–10 reviennent en **Ténébreux** aux étages
  18–20 (Greyback → Aragog → Dolohov), gardiens des Chambres des Fondateurs.
- 💡 **Sens narratif** : un Ténébreux n'est pas un nouvel ennemi — c'est
  **l'ombre projetée par les Ruines**, le **mythe du héros retourné** contre lui
  ([09 §9.10](09-bestiaire-et-lore.md)). Piste de bark : *« Tu m'as déjà tué une
  fois. Cela t'a-t-il libéré ? »* (❓ cosmétique ou dialogues dédiés ?).
- 💡 **Mutation par boucle (V2, hors V1)** : champ `loopVariant` dans
  `monsters.js` pour des créatures qui **mutent** au-delà du recyclage. À évaluer
  seulement après V1.

### 11.9.3 Quêtes ([08](08-quetes-et-sous-intrigues.md))

- ✅ **Quêtes de purge répétables** du **Gardien de la Boucle** (PNJ exclusif
  post-victoire) : `purge_loups` / `purge_acromantules` / `purge_mangemorts`
  (`everyLevels:2`) → matériaux Forge/Bibliothèque. **Boucle de farm endgame.**
- 💡 **Suites des quêtes signature** : l'écho de signature (§11.8.1) prend la
  forme d'une **mini-quête de Boucle** par Maison (Bannière à rallumer, dernier
  pacte, pages ténébreuses, Refuge à rétablir).
- 💡 **Quête secrète multi-passages** : « Briser le Cycle » (§11.10).

### 11.9.4 Codex ([12](12-glossaire-et-codex.md))

- ✅ **Entrées exclusives Boucle** : `boucle_tenebreuse` (débloquée à
  `victoryAchieved`), variantes **corrompues** d'entrées existantes (le Détraqueur
  qui « s'écoule comme de l'encre dans de l'eau gelée », [12 §12.4.8](12-glossaire-et-codex.md)).
- 💡 **Débloquées par écho temporel** : `echo_scellement` (*voir* les 4 Fondateurs
  poser le sceau, [12 §12.4.6](12-glossaire-et-codex.md)) ; *Codex de lieu* de la
  zone D ([10 §10.9](10-lieux-et-geographie.md)).
- 💡 **Nouvelles entrées de Boucle proposées** : `porteur_eclats` (le rôle,
  §11.6.2) et `cycle_brise` (révélation finale, §11.10) — au format §12.3, **sans
  nouveau moteur**, via `corruptedBy:[{floor:≥11}]` et `unlockCondition` `echo`/
  `eclatLoop`.

---

## 11.10 La fin ultime optionnelle — « Briser le Cycle »

> 💡 **Proposition d'ajout narratif** / ❓ **à valider** — strictement **optionnelle
> et non-gating**, en parfait accord avec [03 §3.6](03-trame-principale.md) :
> *« Il n'y a pas de fin scénarisée. Une "vérité finale" optionnelle resterait un
> ajout narratif ; elle n'est pas requise par le jeu. »* La voici proposée.

### 11.10.1 L'idée

La Boucle est conçue pour être **infinie** (prestige ★ N). Mais le **Porteur
d'Éclats** qui descend assez longtemps, écoute assez de voix et porte assez de
fragments peut découvrir qu'il existe une **autre issue que descendre toujours** :
**briser le cycle lui-même** — refermer la faille **par le bas**, là où nul
manuel n'a osé l'écrire ([12 §12.4.1 *corrompue*](12-glossaire-et-codex.md) :
*« la refermer par en haut ne suffira jamais »*).

C'est une **vraie fin narrative**, mais qui ne **clôt pas** le jeu : la briser
**déverrouille** une cinématique, une entrée Codex et un cosmétique ; le joueur
reste libre de **continuer la Boucle** (le mythe ne meurt pas, il *choisit*).

### 11.10.2 La structure multi-passages (`brokenCycleProgress`)

> 💡 Quête secrète **`briser_cycle`** jalonnée sur **plusieurs tours de spirale** —
> jamais en un seul passage, pour que la fin se **mérite** sans devenir une corvée.

| Jalon | Condition (💡) | Source ✅ réutilisée | Révélation |
|-------|----------------|----------------------|------------|
| **I — Entendre** | *Voir* les **4 écho-scellements** (un par Fondateur, Chambres 17–20) | `temporalEchoSeen` (Set, [12 §12.5.3](12-glossaire-et-codex.md)) | Comprendre **comment** le sceau fut posé (à quatre, chacun « avec sa faute »). |
| **II — Porter** | Atteindre un seuil d'**Éclats portés** (`accumulatedEclats ≥ N`) | compteur §11.6.2 | Le héros porte assez du réel déchiré pour **peser** sur la faille. |
| **III — Affronter** | Vaincre un **boss-miroir terminal** (ét. 21+) | ❓ « ce qui dort » personnifié | Se mesurer à sa **propre ombre de légende** — le mythe retourné, ultime. |
| **IV — Choisir** | Au sommet de l'Avant-Monde : **briser** ou **perpétuer** | choix narratif | La fin. |

### 11.10.3 Le choix final (deux issues, aucune « game over »)

- 🕊️ **Briser le Cycle** : le héros **rescelle par le bas**, en y mettant — comme
  les Fondateurs — **une part de lui-même**. Cinématique de paix amère ; entrée
  Codex `cycle_brise` (révélée) ; **cosmétique de prestige** (titre/blason).
  *« On ne ferme pas la peur en la fuyant vers le haut. On la ferme en osant la
  regarder jusqu'au fond. »* La Boucle **reste accessible** (le joueur peut
  redescendre — il sait, désormais).
- 🌑 **Perpétuer (refuser de briser)** : le héros **choisit le mythe** — continuer
  à descendre, devenir légende sans fin. C'est le **chemin par défaut** de qui ne
  fait pas la quête : la série ★ N ✅, intacte. Aucune punition ; c'est une
  **lecture thématique** du prestige infini (le coût de la gloire).

> 💡 **Pourquoi c'est canon-compatible.** La fin ne **gate rien**, ne **ferme
> rien**, n'introduit **aucune obligation** : un joueur peut poncer la Boucle mille
> heures sans jamais croiser « Briser le Cycle ». Elle **récompense** l'écoute du
> lore (échos, Éclats, Codex) d'une **conclusion**, sans retirer le prestige
> infini à ceux qui le préfèrent. Elle **réalise** la promesse de
> [03 §3.7](03-trame-principale.md) (« le mythe et son revers ») sans contredire
> [03 §3.6](03-trame-principale.md) (« pas de fin scénarisée [obligatoire] »).

> ❓ **À arbitrer** : (a) personnifie-t-on le **boss-miroir terminal** / « ce qui
> dort » (ét. 21+, lié à [10 §10.3](10-lieux-et-geographie.md)) ? (b) la cinématique
> « briser » réutilise-t-elle le pipeline `intro.js` ? (c) seuil exact de
> `accumulatedEclats` (calibrage).

---

## 11.11 Règles d'ajout de nouvelles variantes / boucles

> 💡 (norme d'écriture) — pour que la Boucle reste **cohérente, équilibrée et
> extensible**. Miroir des règles du Codex ([12 §12.5](12-glossaire-et-codex.md)).

### 11.11.1 Critères de cohérence (le filtre canon)

Une variante de Boucle n'est admise que si elle **passe ces cinq tests** :

1. **Trahison du familier, pas invention pure** (§11.7.3) : elle **part d'un
   décor/créature/PNJ existant** et le **corrompt**. Pas de contenu alien orphelin.
2. **Non-contradiction du canon** : la Boucle = conséquence de la fêlure menée à
   terme ([03 §3.6](03-trame-principale.md)) ; Voldemort = dernière serrure, pas
   le fond ; la corruption **réveille**, ne crée pas ([09 §9.1](09-bestiaire-et-lore.md)).
3. **Ne gate jamais la descente / le prestige** ([04 §4.7](04-structure-actes-et-etages.md)) :
   au plus une **note de Maison/héros** ou un **jalon optionnel** de « Briser le
   Cycle ». La série ★ N reste atteignable sans aucune variante.
4. **Réutilise l'existant** : `effectiveFloor`, `houseTier`, Codex (§12.3),
   barks, échos, Gardien de la Boucle. **Pas de nouveau moteur** sans nécessité.
5. **Style immersif** : mystérieux, tragique, mythique ; registre d'archive pour
   le Codex ; aucune valeur chiffrée dans le corps *lore*.

### 11.11.2 Critères d'équilibre

- **Cosmétique d'abord** : une variante V1 est **visuelle/narrative** ; tout
  effet mécanique passe par les leviers calibrés existants (paliers de Maison,
  scaling `scaleMonster`, drops). Cf. plan ÉTAPE 2.
- **Déterminisme** : toute variante aléatoire est **seedée** (`darkLoopSeed`
  dérivé de `saveId` + `loopNumber`) → reproductible dans une partie.
- **Borne de lisibilité** : l'intensité des overlays (givre, fog, densité)
  **plafonne** ; on n'aveugle jamais le joueur au nom de l'ambiance.
- **Pas d'inflation de save** : privilégier les flags **dérivés** ; ne persister
  que l'indispensable (`accumulatedEclats`, `brokenCycleProgress`).

---

## 11.12 Tables de synthèse

### 11.12.1 Niveaux de Boucle — vue d'ensemble

| Niveau de Boucle | Intensité | Variantes Maison (couleur) | Nouveaux événements | Récompenses héritées |
|------------------|-----------|----------------------------|----------------------|----------------------|
| **Boucle 1** (ét. 11–13) | ❄❄❄❄ | Gryff brasiers / Slyth raccourcis / Serd runes-phrases / Pouf alcôves | Gardien de la Boucle ; purges répétables ; **1ᵉʳ écho temporel** ; runes d'override | Codex, équipement, sorts ; **Mythe (17)** s'ouvre ; don à la Maison |
| **Boucle 2** (ét. 14–20) | ❄❄❄❄+ | **Chambre des Fondateurs** de sa Maison s'illumine ; écho de signature déchiré | Ruines Anciennes ; **scènes rejouées** ; **boss Ténébreux** (18-20) ; 4 timbres de Fondateurs | + **Apothéose (18)** : passif légendaire ; pages corrompues du Codex |
| **Boucle 3+** (ét. 21+) | ❄❄❄❄+ | Variante de Maison à son **paroxysme** (cosmétique fort) | Avant-Monde ; **battement organique** ; jalon **« Briser le Cycle »** (boss-miroir) | série **★ N** (prestige infini) ; `accumulatedEclats` ; fin optionnelle `cycle_brise` |

### 11.12.2 Flags & compteurs (récap pour ÉTAPE 2)

| Nom | ✅/💡 | Dérivé / persistant | Rôle |
|-----|-------|---------------------|------|
| `victoryAchieved` | ✅ | persistant | Gate d'entrée en Boucle |
| `houseTier` (17/18/★ N) | ✅ | persistant | Mythe / Apothéose / prestige infini |
| `eclatProgress` (1–3) | ✅ | persistant | 3 Éclats canon de la trame |
| `effectiveFloor` | ✅ | dérivé | Recyclage monstres/PNJ 11+ |
| `loopNumber` | 💡 | **dérivé** | Niveau de Boucle narratif |
| `accumulatedEclats` | 💡 | **persistant** | Fil de prestige « Porteur d'Éclats » |
| `houseLoopModifier` | 💡 | **dérivé** (de `chosenHouse`) | Sélecteur de couche de variante de Maison |
| `temporalEchoSeen` | 💡 | persistant (Set) | Échos *vus* (Codex + « Briser le Cycle ») |
| `brokenCycleProgress` | 💡 | **persistant** | Avancement de la fin optionnelle |
| `darkLoopSeed` | 💡 | dérivé | Seed déterministe des variantes |

---

## 11.13 Cadrage & garde-fous (Boucle)

> 💡 (arbitrage) — symétrique du cadrage des Mondes Parallèles ([§11.5](#115-cadrage--canon-dans-la-fiction-ou-méta-mode-)).

- **La Boucle est le pilier endgame *obligatoire-compatible*** : contrairement
  aux Mondes Parallèles (latéraux, désactivables par feature flag), la Boucle est
  l'**Acte IV** ✅ du jeu — elle existe dès qu'on a vaincu Voldemort. Mais tout
  son **contenu narratif** (échos, variantes de Maison, « Briser le Cycle ») reste
  **optionnel** : le joueur peut ne faire que poncer la profondeur pour le prestige.
- **Axe thématique des deux piliers** (à confirmer comme design narratif) :
  **descendre** (Boucle, vertical, vers sa propre ombre, *introspectif & tragique*)
  vs **traverser** (Voyageur, latéral, vers l'autre, *social & curieux*). Deux
  façons opposées de répondre à *« et après la victoire ? »*.
- **Compatibilité Ironman** : la Boucle est **jouable en Ironman** (la permadeath
  rend la descente infinie d'autant plus tendue) — à l'inverse de la Cheminette,
  **exclue** ✅. Le score Ironman ([CLAUDE.md] / `ironman.js`) récompense déjà la
  profondeur atteinte : la Boucle **est** le terrain de jeu du classement.

> ❓ **À arbitrer** : « Briser le Cycle » est-elle **désactivée en Ironman**
> (la fin narrative casserait-elle le run de score ?), ou la cinématique se joue-t-elle
> **après** la soumission au Hall of Fame ? Proposition : la jouer **sans
> interrompre** le run (cosmétique pur, post-score).

---

## Récapitulatif Partie B (Boucle Ténébreuse)
> Vaincre Voldemort **ouvre** la faille au lieu de la fermer : le château se
> rejoue en **spirale corrompue** (✅ descente continue infinie, recyclage
> `effectiveFloor`, prestige **Mythe 17 → Apothéose 18 → ★ N**). Le héros y
> devient **Porteur d'Éclats**, glanant des fragments de réalités brisées
> (`accumulatedEclats`). La réalité se déforme **crescendo** (runes → Ruines
> Anciennes → Avant-Monde), les **voix des Fondateurs** deviennent **échos
> temporels** traversables, et les **choix** (Maison forte via Chambres des
> Fondateurs & paliers, héros, signatures, Éclats) impriment une **empreinte
> durable**. Une fin **optionnelle non-gating** — *« Briser le Cycle »* — récompense
> qui écoute le lore, sans retirer le prestige infini à qui le préfère.

> 🔗 Voir aussi : [03 §3.6 Acte IV](03-trame-principale.md) · [04 Structure](04-structure-actes-et-etages.md)
> · [07 Maisons (Mythe/Apothéose/★ N)](07-les-maisons.md) · [08 Quêtes signature & Gardien](08-quetes-et-sous-intrigues.md)
> · [09 §9.10 Ténébreux](09-bestiaire-et-lore.md) · [10 zone D Ruines Anciennes](10-lieux-et-geographie.md)
> · [12 Codex (entrées de Boucle)](12-glossaire-et-codex.md). Plan technique
> (ÉTAPE 2) : `.claude/plans/_archive/chapter-11-dark-loop.md`.
