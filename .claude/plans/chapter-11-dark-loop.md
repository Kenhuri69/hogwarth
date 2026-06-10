# Plan — Chapitre 11 : Mondes Parallèles & Boucle Ténébreuse

**Statut :** 🟩 en cours · branche `claude/hogwarth-chapter-11-dark-loop-l45ai8`

> Tâche : créer & finaliser le **Chapitre 11** comme pilier **endgame &
> rejouabilité**. ÉTAPE 1 = contenu narratif (→ `docs/histoire/11-mondes-paralleles.md`).
> ÉTAPE 2 = plan d'implémentation (→ ce fichier, §B).
>
> **Nature du livrable : documentation pure.** Aucun fichier servi au navigateur
> (`js/**`, `css/**`, `sw.js`) n'est touché → **pas de bump de cache** requis
> (guidelines §8), **pas de smoke test** requis (guidelines §7, exception doc).

---

## 0. Contrainte cardinale — respecter le canon existant

Le **jeu** implémente déjà la Boucle Ténébreuse comme une **descente continue
infinie** :
- ✅ `effectiveFloor(floor)` recycle les monstres/PNJ aux étages 11+.
- ✅ `houseTier` monte sans plafond : Mythe (17) → Apothéose (18) → série ★ N
  (génératrice, **sans entrée finale** dans `tiers[]`).
- ✅ Gold-sink `donateGoldToHouse` (5 G = 1 pt).
- ✅ `victoryAchieved` est le gate unique (escaliers 10→11 scellés sans lui).
- ✅ **Il n'y a pas de fin scénarisée** (03 §3.6) : « Une "vérité finale"
  optionnelle resterait un ajout narratif ; elle n'est pas requise par le jeu. »

La tâche demande des concepts **non présents** dans le jeu : `loopNumber`
(boucles discrètes), héritage **entre runs**, `accumulatedEclats`,
`brokenCycleProgress` (vraie fin). **Décision** : on **n'invalide pas** le modèle
continu. On le **garde comme vérité ✅**, et on **superpose** les nouveautés en
**💡 (proposition) / ❓ (à arbitrer)** — exactement la convention des chapitres
01–12. La « Boucle N » devient une **lecture narrative dérivée** de la descente
continue, et la « vraie fin » un **ajout optionnel non-gating**.

---

## A. ÉTAPE 1 — Contenu narratif (chapitre)

Fichier : `docs/histoire/11-mondes-paralleles.md` (filename conservé — ~7
chapitres y pointent ; renommer casserait les liens entrants).

Structure cible (deux piliers de l'endgame, axe **descendre vs traverser** déjà
posé en 11.5) :

- [x] H1 + intro reframés : chapitre = endgame & rejouabilité, 2 piliers.
- [x] **Partie A — Mondes Parallèles** : contenu existant 11.0–11.5 **conservé
      tel quel** (surgical ; ne pas réécrire — guidelines §3). Ancres 11.2/11.3/
      11.4 préservées (liens entrants depuis 12).
- [x] **Partie B — La Boucle Ténébreuse** (neuf, 11.6→11.13) :
  - [x] 11.6 Introduction & lore (pourquoi la Boucle ; rôle « Porteur d'Éclats »).
  - [x] 11.7 Mécaniques globales (niveaux de Boucle ; héritage ; modif. réalité).
  - [x] 11.8 Variantes selon les choix (Maison forte + héros + signatures + Éclats).
  - [x] 11.9 Évolution des contenus existants (lieux/bestiaire/quêtes/codex — renvois).
  - [x] 11.10 Fin ultime optionnelle (« Briser le Cycle » — 💡/❓, non-gating).
  - [x] 11.11 Règles d'ajout de variantes/boucles (cohérence & équilibre).
  - [x] 11.12 Tables de synthèse (Niveau | Intensité | Variantes Maison | Événements | Héritage).
  - [x] 11.13 Cadrage & garde-fous (canon, axe descendre/traverser).
- [x] Récap final + renvois croisés mis à jour.

Style : immersif, mystérieux, épique. Émojis convention : 💡 idées,
✅ déjà dans le jeu, ❓ à valider.

---

## B. ÉTAPE 2 — Plan d'implémentation (proposition technique)

> ⚠️ **Tout ce qui suit est 💡 proposition.** Rien n'est codé par cette tâche.
> Priorité conçue pour rester à **complexité raisonnable** et **réutiliser**
> l'existant (`houseTier`, `effectiveFloor`, Codex, save) plutôt que d'ajouter
> un moteur New Game+ lourd.

### B.1 Modèle de données & flags (state.js)

| Flag (proposé) | Type | Réutilise / dérive de | Sérialisé ? | Rôle |
|----------------|------|------------------------|-------------|------|
| `loopNumber` | int (≥0) | **dérivé** : `max(0, ceil((maxFloorReached − 10) / LOOP_SPAN))` | non (dérivé) ou oui si New Game+ | Niveau de Boucle narratif. `LOOP_SPAN` ≈ 10 étages = 1 « tour ». |
| `accumulatedEclats` | int | nouveau compteur | **oui** | « Éclats de réalité » glanés en Boucle (au-delà des 3 `eclat_voute` canon). Monnaie/score de prestige narratif. |
| `houseLoopModifier` | string | **dérivé** de `chosenHouse` (table pure) | non (dérivé) | Sélecteur de la couche de variante de Maison en Boucle (cosmétique + hooks). |
| `brokenCycleProgress` | int (0–N) | nouveau compteur | **oui** | Avancement de la quête secrète « Briser le Cycle » (multi-passages). |
| `darkLoopSeed` | int | **dérivé** : `hash(saveId, loopNumber)` | non (recalculable) | Seed déterministe des variantes par boucle (reproductibilité). |

Existants réutilisés (✅, déjà sérialisés) : `victoryAchieved`, `houseTier`,
`currentFloor`, `floorKillCount`, `eclatProgress` (les 3 `eclat_voute`),
`gryffSignatureDone`/`slythSignatureDone`/`ravenSignatureDone`/`poufSignatureDone`,
`seenMonsters`, `defeatedBosses`.

> **Principe** : maximiser le **dérivé** (recalculable, zéro coût de save) ;
> ne **persister** que `accumulatedEclats` et `brokenCycleProgress` (2 ints).

### B.2 Système d'héritage

Le jeu n'efface rien (descente continue) ⇒ l'« héritage » est **déjà** la
persistance normale (Codex, équipement, sorts, `houseTier`). À documenter comme
tel (✅). Le seul ajout : `accumulatedEclats` (persistant) sert de **fil de
prestige** transverse aux boucles.

**Option New Game+ discret** (💡, à arbitrer §B.7) : si un jour on offre un
« recommencer la descente en gardant X », définir un `inheritedState` minimal :
`{ accumulatedEclats, brokenCycleProgress, codexUnlocked[], houseTier (ou cap),
souvenirs Voyageur }`, appliqué après un nouveau `startGame()`. **Non
recommandé en V1** (coût moteur élevé, contredit le modèle continu).

### B.3 Intégration génération procédurale (modif. par loopNumber)

Surcouches **légères** indexées par `loopNumber`, par-dessus l'existant
`scaleMonster`/`effectiveFloor` :
- **Densité/scaling** : déjà géré par `effectiveFloor` + `floorKillCount`. Ajout
  cosmétique : intensité de l'overlay givre/fog ∝ `min(loopNumber, CAP)`.
- **Variantes Ténébreuses** : déjà ✅ (boss 18-20). Étendre le *flag* « Ténébreux »
  à `loopNumber ≥ 1` via la table de variante (purement visuelle V1).
- **Échos temporels** : `temporalEchoSeen` (Set proposé en 12.5.3) — densité
  d'apparition ∝ `loopNumber` en zone D.
- **Garde-fou** : `darkLoopSeed` rend les variantes **déterministes** par boucle
  (pas d'aléa non reproductible). Aucune modif. de la topologie procédurale
  (on ne génère **pas** 4 donjons — cohérent 10.6).

### B.4 Gestion des fins

- **Fin « normale »** : ✅ aucune — la Boucle est un prestige infini. Inchangé.
- **Fin « vraie » (Briser le Cycle)** : 💡 quête secrète multi-passages pilotée
  par `brokenCycleProgress`. Chaque étape = un jalon optionnel (voir 11.10) :
  remettre N `accumulatedEclats`, *voir* les 4 écho-scellements, vaincre un
  boss-miroir terminal. **Non-gating** : la complétion débloque une
  **cinématique + entrée Codex `cycle_brise`** et un **cosmétique**, **sans**
  fermer l'accès à la Boucle (le joueur peut continuer / « refuser de briser »).
  Respecte 03 §3.6 (« ajout narratif optionnel, non requis »).

### B.5 Intégration Codex / lieux / bestiaire / quêtes

- **Codex** (12) : nouvelles `unlockCondition`/`corruptedBy` exclusives Boucle
  (`{type:"floor",value:≥11}`, `{type:"echo",...}`, `{type:"eclatLoop",value:N}`).
  Entrées neuves : `cycle_brise`, `porteur_eclats`, variantes corrompues. Réutilise
  le format §12.3 — **aucun nouveau moteur**.
- **Lieux** (10) : déjà spécifiés (zone D, échos, Chambres des Fondateurs). Rien
  à ajouter côté data ; la variante par boucle est cosmétique.
- **Bestiaire** (09) : réutilise `effectiveFloor` + variantes Ténébreuses (✅).
  Option mutation V2 : `monsters.js` `loopVariant` (💡, hors V1).
- **Quêtes** (08) : réutilise les répétables du Gardien de la Boucle (✅
  `purge_*`, `everyLevels:2`). Ajout : les jalons « Briser le Cycle » comme
  quête spéciale `briser_cycle` (`repeatable:false`, étapes via flags).

### B.6 Priorisation

1. **V1 — Boucle 1 « lisible »** : documenter (✅ fait ici) ; exposer `loopNumber`
   dérivé + compteur `accumulatedEclats` (HUD/Codex) ; overlay cosmétique
   d'intensité ; entrées Codex de Boucle. *Coût faible, 100 % réutilisation.*
2. **V2 — Variantes de Maison fortes** : illumination Chambres des Fondateurs
   (10.6), écho de signature en Boucle (08 §8.5), barks de héros par boucle.
3. **V3 — Briser le Cycle** : quête secrète multi-passages + cinématique + fin.
4. **V4 (optionnel)** : mutations bestiaire `loopVariant`, New Game+ discret.

### B.7 Décisions à arbitrer (❓)

- **Modèle de boucle** : garder **continu + `loopNumber` dérivé** (recommandé)
  *vs* New Game+ discret avec reset ? → recommandation : **continu** (canon,
  complexité).
- **Personnifier « ce qui dort » (ét. 21+)** : entité nommée (boss-miroir de
  « Briser le Cycle ») *vs* menace muette ? Lié à 10.3 / 03 §3.6.
- **`accumulatedEclats`** : compteur de prestige pur *vs* monnaie dépensable
  (Forge/Biblio/don) ?

### B.8 Suggestions d'assets

- **Visuel** : overlay givre/fog bleu dont l'alpha croît avec `loopNumber` ;
  variante de teinte runique des sprites Ténébreux ; fond de parchemin Codex
  « zone D » (12.1.1). Cinématique « Briser le Cycle » (réutilise le pipeline
  intro `intro.js`).
- **Son** : ambiance `abyss` (✅ réservée) ; couche de murmures runiques
  (4 timbres Fondateurs) montant avec la profondeur ; battement organique ét. 21+.
- **Transition** : fondu dédié au franchissement de boucle (réutilise
  `#tier-transition-overlay`) + toast « Boucle N ».

---

## Vérification (critères §4)

- [x] Le chapitre couvre **toute** la structure ÉTAPE 1 demandée.
- [x] Chaque mécanique tracée : ✅ (acté) / 💡 (proposé) / ❓ (à valider).
- [x] **Zéro contradiction** avec 03/04/07/08/09/10/12 (vérifié via extraction).
- [x] Liens entrants vers `11-mondes-paralleles.md` (ancres 11.2/11.3/11.4)
      préservés.
- [x] Tables de synthèse présentes (dont la table demandée).
- [x] Plan d'implémentation (ÉTAPE 2) rédigé, priorisé, à complexité maîtrisée.
- [ ] Commit + push sur la branche désignée.
