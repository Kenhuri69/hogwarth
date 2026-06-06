# 11 — Mondes Parallèles (lore inter-mondes)

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : poser la **fiction** derrière le système de visites inter-mondes
> (le « pourquoi » magique). `💡` = proposition narrative modifiable ; `✅` =
> acté dans le jeu (système). Le « comment » technique est documenté côté
> code (`CLAUDE.md` § *Mondes Parallèles* + `.claude/plans/parallel-worlds.md`).

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

## Récapitulatif express (pour briefer Gemini)
> Chaque save = un **plan parallèle** (un Poudlard-reflet). La **Cheminette
> Inter-Mondes** (niv. 8, exclue Ironman) projette le héros, en **fantôme de
> cendre verte**, dans le donjon d'un autre joueur : il y explore ce que l'hôte
> a découvert, laisse messages/cadeaux, affronte des **échos** (souvenirs de
> monstres → **Essence d'Outremonde**), et scelle des **Verrous de Sang** (défis
> d'entraide différée). L'Essence forge les reliques du **Voyageur** (set,
> souvenirs) à l'**Atelier**. Système **diégétique mais facultatif** : le récit
> principal (descente, Voldemort ét. 10, Boucle Ténébreuse 11+) tient sans lui.

> 🔗 Voir aussi : [03 Trame principale](03-trame-principale.md) (Boucle
> Ténébreuse), [06 PNJ & factions](06-pnj-et-factions.md), [12 Glossaire &
> codex](12-glossaire-et-codex.md).
