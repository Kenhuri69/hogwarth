# 03 — Trame principale

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : dérouler l'arc central beat par beat. `💡` = proposition
> narrative modifiable ; `✅` = acté dans le jeu. Voir la structure
> étages↔actes en [04](04-structure-actes-et-etages.md).

---

## 3.1 Élément déclencheur

> 💡 (proposition révisée — événement concret et visuel) / ✅ (ancrages)

Tout commence par le plus ordinaire des moments : un **cours d'Histoire de la
Magie**. Le professeur Binns — fantôme qui n'a jamais remarqué sa propre mort —
récite la fondation du château devant une classe qui lutte contre le sommeil.
Sur son socle trône la pièce du jour, une relique qu'on sort une fois l'an : la
**Clé de Voûte des Quatre**, forgée ensemble par les quatre Fondateurs. Personne
n'écoute vraiment. C'est exactement pour ça que la scène marque.

Puis un son. Net, cristallin — *de la glace qui se fend sur un étang*. Une
**fêlure** court le long de la Clé de Voûte. La lumière qu'elle renvoyait
s'éteint. Le givre gagne le socle, puis les pupitres ; l'haleine des élèves
devient blanche. Par la fenêtre, on voit les **grands escaliers s'arrêter net** —
puis **basculer, tous, vers le bas**. Dans le couloir, un portrait se met à
**hurler** et ne s'arrête plus. Et pour la première fois depuis des décennies,
**même Binns se tait.**

Ce n'est pas une explosion, c'est une **fissure** : le premier craquement d'un
sceau que la peur tenait fermé depuis avant Poudlard. Mais la fissure suffit à
**déplier le château vers le bas** — des passages murés s'ouvrent, les
profondeurs remontent, et un froid qui n'est pas de ce monde commence à sourdre
des fondations.

Le **portrait de Dumbledore** s'anime alors et dit l'essentiel : la Clé de Voûte
n'était pas une curiosité, c'était **le verrou**. On ne la rescelle pas d'en
haut. Pendant que les professeurs tiennent les étages habités, il faut quelqu'un
pour **descendre à contre-courant** jusqu'à la source — et la corruption recule
devant qui n'a pas peur de descendre. Le héros, à peine réparti dans sa Maison,
est ce quelqu'un.

✅ Flux de jeu : **écran d'intro Dumbledore** (la scène ci-dessus se raconte
ici) → **choix de Maison** → entrée dans le donjon, où le **portrait de
Dumbledore** (étage 1, première salle) confie la quête `intro_tutoriel`
(« descends d'un étage »).

> 💡 **Pourquoi ce déclencheur est plus immersif.** L'ancienne amorce (« une
> nuit, les escaliers se figent ») était passive et hors-champ. Ici, le
> basculement se produit **sous les yeux du joueur, en plein quotidien
> scolaire** : le contraste entre le cours le plus ennuyeux du château et
> l'horreur qui monte rend le moment viscéral (« ça commence vraiment mal — et
> j'y étais »). La relique brisée **est** le sceau : un objet concret et visuel
> au lieu d'une menace abstraite.

> 💡 **Pourquoi ça « branche » le gameplay.** La Clé de Voûte ne *fermait* pas
> seulement le mal, elle **repliait** le château sur ses profondeurs. Sa fêlure
> explique d'un seul tenant les trois faits de jeu : les **escaliers pointent
> vers le bas** (✅ donjon descendant), les **étages inférieurs s'ouvrent** (✅
> Profondeurs / Ruines atteignables), et **Dumbledore envoie un élève** plutôt
> qu'un professeur (les adultes tiennent le haut ; seul un cœur sans peur
> rescelle le bas — écho au ✅ thème « le choix plutôt que le don »).

> 💡 **Échelle progressive.** Le déclencheur n'est qu'une **fêlure**, pas un
> bris : la corruption suinte lentement, étage par étage. C'est le moteur de
> l'Acte I (le familier qui se fissure) et la promesse de la descente — chaque
> palier non purgé, c'est la fêlure qui s'élargit.

> **Pistes d'intégration en jeu.** (✅ livrées — plan
> [`clef-de-voute-implementation.md`](../../.claude/plans/clef-de-voute-implementation.md))
> - ✅ **Cinématique d'intro** (`intro.js`, lit `dumbledore.dialogues.greeting`) :
>   la scène du cours est racontée en **4 pages paginées** (cours d'Histoire de
>   la Magie → fêlure → escaliers qui basculent → appel de Dumbledore), puis
>   bascule vers le choix de Maison.
> - ✅ **Dialogue Dumbledore (portrait, étage 1)** : le `questOffer` d'intro
>   référence la Clé de Voûte (« Tu as entendu la pierre se fendre, toi
>   aussi… »).
> - ✅ **Quêtes secondaires liées** : la quête optionnelle **« Les Éclats de la
>   Clé de Voûte »** (`eclats_clef_voute`, donnée par Dumbledore, hors-chaîne)
>   fait collecter trois **éclats** (`eclat_voute`) en descendant — drop garanti
>   sur un monstre-jalon par tranche (Peeves 1-3, Loup-Garou 4-6, Mangemort
>   d'Élite 7-10). Une **stèle d'énigme** des Fondateurs (`r_clef_voute`) relaie
>   le lore vers le [02 §2.2](02-univers-ton-et-canon.md). La descente reste la
>   seule colonne obligatoire — aucune de ces quêtes ne gate l'escalier.

> ✅ **Tranché à l'implémentation** : (1) cours d'**Histoire de la Magie** ;
> (2) héros **témoin** (saveur, sans branchement par Maison) ; (3) nom retenu :
> **« Clé de Voûte des Quatre »**.

## 3.2 Acte I — L'École (étages 1–3)

> 💡 (proposition) / ✅ (ancrages)

Le familier qui se fissure — **au sens propre**. La fêlure de la Clé de Voûte
vient de s'ouvrir au-dessus du héros ; ici, il en descend la première onde. Les
premières créatures sont presque domestiques — le chat de Rusard, Peeves, des
lutins, des portraits hostiles — mais leur agressivité soudaine trahit la
corruption qui suinte du sceau brisé. Le héros apprend à explorer, combattre,
accepter des quêtes, dans un Poudlard reconnaissable mais qui **prend froid**.

- **PNJ-jalons** : Pomfresh (mandragore), Mimi (le troll), Hagrid (la chouette),
  Lockhart (le livre interdit).
- **Beat** : comprendre que le mal **vient d'en bas** — la fêlure était en haut,
  mais ce qu'elle a réveillé remonte des fondations. La descente est la seule
  direction.
- 💡 **Écho du déclencheur** : un portrait qui hurle encore, un courant d'air
  glacé à chaque escalier — l'Acte I garde la mémoire fraîche du cours
  interrompu.
- ✅ Tranche A « Couloirs de Poudlard », ton `intro`.

## 3.3 Acte II — La Descente (étages 4–6)

> 💡 (proposition) / ✅ (ancrages)

Les cachots. Le ton s'assombrit, l'école laisse place à la pierre froide — on
descend sous le niveau que la Clé de Voûte tenait fermé. Des **mangemorts
masqués** apparaissent : la corruption n'est pas qu'un phénomène magique, des
**fidèles** œuvrent à hâter le retour de leur maître, attirés comme des phalènes
par la fêlure du sceau.

- **Beat** : double révélation — **ce que la Clé de Voûte retenait** (une
  corruption pré-Poudlard, plus vieille que les Fondateurs) **et** que, tout au
  fond, **Voldemort se reconstitue** à mesure qu'elle remonte.
- **Sous-intrigue** possible : amorce du **grimoire d'Élara** (Manon) — une
  histoire de givre et de deuil qui contraste avec la menace montante (et fait
  écho au froid du sceau brisé).
- ✅ Tranche B « Cachots », ton `dungeon` ; transition marquée 3↔4.

## 3.4 Acte III — Les Profondeurs (étages 7–10)

> 💡 (proposition) / ✅ (ancrages)

L'inconnu, l'abyssal. On quitte le Poudlard connu pour des **Profondeurs
Oubliées**. Les forces ennemies montent en gamme : élite mangemort, créatures
majeures, puis les **boss canon** qui gardent la route vers la source.

- ✅ Boss : **Fenrir Greyback** (ét. 8), **Aragog** (ét. 9), **Antonin
  Dolohov** (ét. 10), **Bellatrix**, et **Voldemort Affaibli** (ét. 8) —
  un premier contact, encore incomplet.
- **Beat** : chaque boss tombé **affaiblit le sceau** ; la présence de
  Voldemort se densifie d'étage en étage.
- ✅ Tranche C « Profondeurs Oubliées », ton `depths` ; transition 6↔7.

## 3.5 Climax — La chute de Voldemort (étage 10)

> 💡 (proposition) / ✅ (ancrages)

Au fond des Profondeurs, **Voldemort Ressuscité** attend, pleinement reformé.
C'est l'affrontement-pivot de tout l'arc.

✅ Vaincre `voldemort_revenu` déclenche la **cinématique de victoire** (discours
de Dumbledore) et **scelle l'arc principal**. *« L'escalier le plus profond,
scellé par la peur, s'ouvre enfin. »*

> ✅ **Tranché par le jeu** : Voldemort est un boss à phases — `voldemort_revenu`
> déclare un tableau `phases:` (enrage à 50 % PV → atkMult/magMult ; terreur du
> groupe à 25 %), traité par `_checkBossPhases`, identique au Basilic.
>
> ❓ **À travailler en l'état** (non tranché par le jeu) : l'intervention d'un
> PNJ allié en combat (ex. Sirius, présent à l'étage 10 en donneur de quête)
> n'existe pas dans le jeu — aucun allié PNJ ne combat. À concevoir si désiré.

## 3.6 Acte IV — La Boucle Ténébreuse (étages 11+)

> ✅ **Tranché par le jeu** : la descente et la victoire sur Voldemort sont la
> **seule colonne vertébrale obligatoire** — aucune quête (y compris la chaîne
> Dumbledore) ne conditionne l'accès à l'escalier. Tout le contenu annexe
> (quêtes, PNJ, sous-intrigues) est optionnel.
>
> 💡 (proposition de sens) / ✅ (ancrages)

La victoire **ouvre** la faille au lieu de la fermer. Le château se rejoue,
**corrompu** : ses créatures et ses boss reviennent en **Ténébreux**, et sous
le fond s'ouvrent les **Ruines Anciennes** (étage 14+), antérieures à l'école.

- ✅ Boss 8-10 de retour en variantes Ténébreuses aux étages 18-20.
- ✅ **Gardien de la Boucle** (PNJ exclusif post-victoire) : quêtes de purge
  répétables (Greyback / Aragog / Dolohov) → matériaux Forge & Bibliothèque.
- ✅ PNJ profonds recyclés : Kingsley (8/18), Bill (9/19), Sirius (10/20).
- ✅ Paliers de Maison endgame : **Mythe (17)**, **Apothéose (18)**, série
  **Apothéose ★ N** (prestige « infini »), + **don à la Maison** (gold-sink).
- ✅ Tranche D « Ruines Anciennes », ton `abyss` ; transition 13↔14.

> ✅ **Tranché par le jeu** : la Boucle est une boucle de prestige infinie —
> série Apothéose ★ N génératrice (sans entrée finale dans `tiers[]`), gold-sink
> illimité (`donateGoldToHouse`), recyclage `effectiveFloor` sans plancher.
> Il n'y a pas de fin scénarisée. (Une « vérité finale » optionnelle resterait
> un ajout narratif ; elle n'est pas requise par le jeu.)

## 3.7 Fils rouges & thèmes

> 💡 (proposition — cohérent avec [01 §1.7](01-synopsis-et-pitch.md))

- **La peur comme sceau** : descendre = regarder en face ce qui retient le mal.
- **Le choix plutôt que le don** : la Maison colore, mais ce sont les actes qui
  sauvent (écho au canon HP).
- **Le mythe et son revers** : l'Apothéose fait du héros une légende — et les
  légendes attirent ce qui dort le plus profond.

> Sous-intrigues qui incarnent ces thèmes : le **grimoire d'Élara** (le deuil
> et la joie cachée), l'**Épreuve de la Lumière Éternelle** de Dumbledore (le
> souvenir heureux contre les ténèbres). → [08](08-quetes-et-sous-intrigues.md).

---

## Points à trancher (résumé)
1. ❓ Élément déclencheur : cours d'**Histoire de la Magie** vs **Étude des
   Runes** ; degré d'implication du héros (témoin / responsable involontaire /
   résonance de Maison) ; nom définitif de la **Clé de Voûte** (cf. §3.1).
2. ❓ Enjeu intime des héros en parallèle de l'enjeu collectif ? (non tranché par le jeu)
3. ✅ Phases du combat final : tranchées (boss multi-phases dans le code). ❓ Dialogue avant/pendant + PNJ allié combattant : non tranché.
4. ✅ Boucle Ténébreuse : prestige infini (tranché par le jeu — série ★ N génératrice sans fin).
