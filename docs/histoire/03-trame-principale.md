# 03 — Trame principale

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : dérouler l'arc central beat par beat. `💡` = proposition
> narrative modifiable ; `✅` = acté dans le jeu. Voir la structure
> étages↔actes en [04](04-structure-actes-et-etages.md).

---

## 3.1 Élément déclencheur

> 💡 (proposition, sur base ✅)

Une nuit, les escaliers mobiles de Poudlard se figent **tournés vers le bas**.
Le froid monte des cachots ; un élève disparaît. Le **portrait de Dumbledore**
s'anime et appelle le héros : la peur a fissuré un vieux sceau sous le château,
et seul quelqu'un qui **descend volontairement** peut le refermer.

✅ Intro Dumbledore → quête `intro_tutoriel` → choix de Maison → entrée dans le
donjon.

## 3.2 Acte I — L'École (étages 1–3)

> 💡 (proposition) / ✅ (ancrages)

Le familier qui se fissure. Les premières créatures sont presque domestiques —
le chat de Rusard, Peeves, des lutins, des portraits hostiles — mais leur
agressivité trahit la corruption naissante. Le héros apprend à explorer,
combattre, accepter des quêtes.

- **PNJ-jalons** : Pomfresh (mandragore), Mimi (le troll), Hagrid (la chouette),
  Lockhart (le livre interdit).
- **Beat** : comprendre que le mal **vient d'en bas**, pas de l'extérieur.
- ✅ Tranche A « Couloirs de Poudlard », ton `intro`.

## 3.3 Acte II — La Descente (étages 4–6)

> 💡 (proposition) / ✅ (ancrages)

Les cachots. Le ton s'assombrit, l'école laisse place à la pierre froide. Des
**mangemorts masqués** apparaissent : la corruption n'est pas qu'un phénomène
magique, des **fidèles** œuvrent à hâter le retour de leur maître.

- **Beat** : la révélation que **Voldemort se reconstitue** au fond.
- **Sous-intrigue** possible : amorce du **grimoire d'Élara** (Manon) — une
  histoire de givre et de deuil qui contraste avec la menace montante.
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
1. ❓ Enjeu intime des héros en parallèle de l'enjeu collectif ? (non tranché par le jeu)
2. ✅ Phases du combat final : tranchées (boss multi-phases dans le code). ❓ Dialogue avant/pendant + PNJ allié combattant : non tranché.
3. ✅ Boucle Ténébreuse : prestige infini (tranché par le jeu — série ★ N génératrice sans fin).
