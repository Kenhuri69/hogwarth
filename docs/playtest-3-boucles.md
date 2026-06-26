# Protocole de playtest — « 3 Boucles consécutives » (P3.5)

> RC polish 2026-06 · plan [`rc-polish-remaining.md`](../.claude/plans/_archive/rc-polish-remaining.md) §P3.5.
> **Objectif** : mesurer la **lassitude** ressentie sur 3 Boucles Ténébreuses
> enchaînées et décider, **données en main**, s'il faut **ajuster la cadence des
> beats house-aware**. Ce document est un **protocole humain** — il ne contient
> ni n'appelle de code. Sortie attendue : un verdict GO/ajustement + les boutons
> de réglage exacts si ajustement.

---

## 0. Ce qu'on teste (ancrage code)

La rejouabilité de l'endgame repose sur deux couches qui se **répètent** par
construction à chaque Boucle (étages 11+) :

- **Contenu recyclé** : monstres via `effectiveFloor()` (boss 8-10 reviennent en
  variante *Ténébreux* 18-20), PNJ déterministes recyclés
  (`getNpcsForFloor`), 4 quêtes répétables du **Gardien de la Boucle**
  (`everyLevels: 2`). Scaling `ENDGAME_SCALING` (durci R1, 2026-06).
- **Beats house-aware** (voix scénarisée, `js/hero-barks.js`) — c'est **la
  variable d'ajustement de P3.5** :

  | Beat | Quand | Cadence actuelle |
  |------|-------|------------------|
  | `darkLoop` | franchissement d'un niveau de Boucle (`goDeeper` post-victoire) | 1× par descente de palier |
  | `loopEcho` | un écho temporel affleure | événementiel (rare) |
  | `darkBoss` / `darkBossDown` | face à / victoire sur un boss revenu *Ténébreux* | **one-shot** par variante |
  | `houseTier` / `tierTransition` | palier de Maison / frontière de tranche | événementiel |

  Garde-fous de cadence existants (`hero-barks.js`) : anti-spam global
  **`_BARK_COOLDOWN_MS = 2500`**, anti-répétition (ne rejoue pas la dernière
  réplique), flag `once` pour les one-shots, toggle joueur `barksEnabled`.

**Hypothèse à réfuter** : « sur la 2ᵉ–3ᵉ Boucle, les beats house-aware
deviennent répétitifs/prévisibles au point de réduire l'envie de continuer. »

---

## 1. Préparation (avant la session)

1. **Build** : dernière `master` déployée, cache vidé (PWA → *Unregister* +
   `PWA.clearCaches()`), `barksEnabled = true` (défaut), voix au choix du
   testeur (les beats existent en texte même voix coupée).
2. **Point d'entrée** : une **save post-victoire** (`victoryAchieved = true`)
   au pied de l'escalier de l'étage 10, groupe **suréquipé** (cible de calibrage
   de la Boucle). Préparer **2 saves jumelles** : une **Solo**, une **Duo**
   (les beats house-aware diffèrent selon la composition / Maison canon).
3. **Données objectives (opt-in, local, anonyme)** : activer le BalanceLog —
   `localStorage.hogwarts_balance_debug = '1'` puis recharger. Il accumule
   `loopDepths` → `loopDepthMedian` et compteurs de combats/sorts
   (`js/balance-log.js`). Exporter via le bouton debug en fin de session.
4. **Panel** : **3 testeurs minimum**, idéalement de **Maisons différentes**
   (Gryffondor / Serpentard / Serdaigle ou Poufsouffle) — les variantes
   `houseTension` ne se déclenchent que si la Maison canon du héros diffère de
   `chosenHouse`, il faut donc couvrir plusieurs combinaisons.

---

## 2. Déroulé (par testeur)

Jouer **3 Boucles consécutives** = descendre de l'étage 11 jusqu'au boss de
palier **trois fois de suite** (Boucle 1 : ét. 11→20, Boucle 2 : 21→30,
Boucle 3 : 31→40), **sans pause longue**, en une session.

Pour **chaque** Boucle, le testeur tient la **fiche d'observation** (§3) :
- jouer normalement, **lire/écouter chaque beat** house-aware ;
- **après chaque Boucle**, remplir le bloc « ressenti » à chaud ;
- noter tout moment de **décrochage** (« je saute le texte », « je coupe les
  barks », « je veux remonter au hub »).

> ⚠️ Ne **pas** révéler aux testeurs qu'on observe les beats : poser la question
> ouverte « qu'est-ce qui t'a lassé ? » avant la question dirigée pour éviter
> le biais de suggestion.

---

## 3. Fiche d'observation (1 par testeur)

Métadonnées : `pseudo · Maison choisie · héros · Solo/Duo · date · build SHA`.

### 3.A — Par Boucle (×3)

| Métrique | B1 | B2 | B3 |
|----------|----|----|----|
| Beats house-aware **entendus** (compte) | | | |
| Beats perçus comme **redondants** (compte) | | | |
| Variété ressentie du contenu (monstres/quêtes) **1–5** | | | |
| Variété ressentie des **voix/beats** **1–5** | | | |
| Envie de **continuer** à la fin de la Boucle **1–5** | | | |
| As-tu **coupé les barks** ? (O/N + à quel moment) | | | |
| Verbatims / moments de décrochage | | | |

### 3.B — Fin de session (synthèse testeur)

- Courbe d'envie B1→B2→B3 : **croissante / plate / décroissante** ?
- Les beats t'ont-ils paru **trop fréquents**, **trop rares**, ou **justes** ?
- Lesquels reviennent « mot pour mot » de mémoire ? (signal de saturation)
- Le `darkLoop` (1×/palier) : repère utile ou bruit ?

---

## 4. Données objectives (BalanceLog)

À recouper avec le ressenti (un ressenti de lassitude **sans** chute de
progression réelle = problème de **présentation**, pas de **contenu**) :

- `loopDepthMedian` et profondeur max atteinte (les testeurs sont-ils allés au
  bout des 3 Boucles, ou ont-ils abandonné avant ?).
- Durée par Boucle (B3 nettement plus longue/laborieuse = fatigue de **combat**
  scaling, pas de **beats**).

---

## 5. Grille de décision

Agréger les fiches. Seuils indicatifs (panel ≥ 3) :

| Constat agrégé | Verdict | Action |
|----------------|---------|--------|
| Envie **plate ou croissante** B1→B3, variété beats ≥ 3,5/5, peu de coupures | ✅ **GO RC, ne rien changer** | Clore P3.5. La cadence actuelle tient sur 3 Boucles. |
| Variété beats < 3/5 **et** « entendus » élevé **et** redondants élevés | ⚠️ **Trop fréquents** | Augmenter l'espacement : `_BARK_COOLDOWN_MS` 2500 → 4000–5000 ; envisager un cooldown **par-événement** pour `darkLoop`/`loopEcho` (ne pas rejouer le même beat avant N descentes). |
| Beats jugés **trop rares** / Boucle « muette » | ⚠️ **Trop espacés** | Ajouter des **variantes** par beat (plusieurs répliques tirées sans répétition) plutôt que d'augmenter la fréquence ; prioriser `darkLoop`/`darkBoss` qui structurent la Boucle. |
| Lassitude portée par le **contenu** (monstres/quêtes), pas les beats (variété beats OK mais variété contenu < 3) | 🔀 **Hors P3.5** | Remonter en backlog contenu (nouveaux variants *Ténébreux*, quêtes du Gardien) — **ne pas** toucher la cadence des beats. |
| Lassitude portée par le **combat** (B3 long/punitif, données scaling) | 🔀 **Renvoi scaling** | Voir `dark-loop-scaling-review.md` + `sim-difficulty --endgame` ; hors beats. |

> **Principe** : préférer **enrichir les variantes** (plus de répliques par
> beat, tirage anti-répétition déjà en place) plutôt que **changer la
> fréquence** — l'ajout de variété est moins risqué qu'un reréglage de cadence
> qui peut rendre la Boucle silencieuse. Tout ajustement code retenu = **sa
> propre PR** (avec cache-bump `hero-barks.js` + scénario `units.js` si on
> touche un helper pur, cf. règles RC).

---

## 6. Statut

⏳ **En attente d'exécution humaine** (hors-code par nature). Ce protocole est
le livrable P3.5 ; il n'engage **aucune** modif de gameplay tant que le
playtest n'a pas produit de constat de lassitude mesuré. Reporter ici les
résultats agrégés + le verdict de la §5 une fois la session menée.

> **Amorce variété livrée (2026-06-21)** — indépendante du verdict de
> lassitude. Le beat `darkLoop` (déclenché 1×/palier, soit 3× sur 3 Boucles,
> via `pickHeroBark` qui tire **au hasard** dans le pool du héros) ne comptait
> qu'**une seule réplique par héros** : le tirage renvoyait donc toujours la
> même phrase (l'infra de variété était neutralisée par un pool de taille 1).
> Chaque pool `darkLoop` est porté à **3 variantes** (×16 héros, en voix). Cela
> ne touche **ni la cadence** (`_BARK_COOLDOWN_MS` inchangé) **ni l'équilibrage**
> — c'est le levier « enrichir les variantes » préféré du §5. Le playtest reste
> nécessaire pour trancher §5 (fréquence trop haute/basse) et décider d'étendre
> l'enrichissement à `loopEcho`/`darkBoss` si besoin.
</content>
