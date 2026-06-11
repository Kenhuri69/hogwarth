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

1. [x] **V1 — Boucle 1 « lisible »** ✅ **IMPLÉMENTÉE** (branche
   `claude/dark-loop-v1-ddiw8a`) : documenter (✅) ; exposer `loopNumber`
   dérivé + compteur `accumulatedEclats` (HUD/Codex) ; overlay cosmétique
   d'intensité ; entrées Codex de Boucle. *Coût faible, 100 % réutilisation.*
   - [x] `loopNumber(deepest)` pur (`dungeon-scaling.js`, `LOOP_SPAN=10`,
     `max(0, ceil((d−10)/10))`) — testé `tests/units.js`.
   - [x] `accumulatedEclats` (int persistant, `state.js` + `save.js`).
     Source d'incrément : **+1 par nouvel étage de Boucle le plus profond
     franchi** (`movement-floors.js — _maybeAdvanceDarkLoop`, anti-farm :
     `nextFloor > floorReached` ; le respawn / aller-retour ne crédite rien).
     Déterministe → aucun aléa introduit, donc `darkLoopSeed` non requis en V1.
   - [x] Overlay cosmétique : `_applyCorruptionAmbiance` ajoute un bonus de
     givre ∝ `loopNumber(floorReached)`, **borné** (`_FROST_LOOP_BONUS_CAP`
     0.10, plafond absolu `_FROST_LOOP_CAP` 0.45 — lisibilité).
   - [x] Exposition HUD/Codex : toast « 🌀 Boucle N » au franchissement
     (réutilise `#tier-transition-overlay`) + ligne discrète « 🌀 Boucle N —
     🔹 X Éclats » dans `char-stats-panel` (Boucle uniquement).
   - [x] Codex : condition `eclatLoop` (`codex.js`) + entrée **`porteur_eclats`**
     (rôle, format §12.3, `victory` → `eclatLoop:5` → `corruptedBy floor 21`),
     en complément de `boucle_tenebreuse` (déjà présent).
   - [x] Tests : bloc `loopNumber`/`porteur_eclats` (`units.js`) +
     `scenarioDarkLoopV1` (`tests/scenarios/codex.js`).
   - **Arbitrages tranchés** : (1) modèle **continu + `loopNumber` dérivé**
     (pas de New Game+/reset) ; (2) « ce qui dort » ét. 21+ = **menace muette**
     en V1 (personnification = jalon III de « Briser le Cycle », V3) ; (3)
     « Briser le Cycle » en Ironman = **hors V1** (V3 ; décision enregistrée :
     non-désactivée, cinématique cosmétique post-score). `accumulatedEclats` =
     **compteur de prestige pur** (pas de monnaie dépensable). `brokenCycleProgress`
     **déféré** (pas de squelette persistant inutile en V1).
2. [x] **V2 — Variantes de Maison fortes** ✅ **IMPLÉMENTÉE** (branche
   `claude/dark-loop-v1-ddiw8a`) : illumination Chambres des Fondateurs
   (10.6), écho de signature en Boucle (08 §8.5), barks de héros par boucle.
   - [x] Chambres des Fondateurs (étage 17) : **déjà ✅** (`maybeFounderChamberBeat`,
     `FOUNDER_CHAMBERS`) — rien à ajouter.
   - [x] **Écho de signature en Boucle** (`floor-ambiance.js`) : `SIGNATURE_ECHOES`
     + `getSignatureEchoBeat` (pur) + `maybeSignatureEchoBeat` (one-shot, étage 14).
     Gated sur `chosenHouse` + `<house>SignatureDone` (+ `slythPactChoice` pour
     Serpentard) : variante **accompli** (braise/pacte/codex/refuge) vs **dette**
     (Bannière éteinte/pacte muet/page illisible/abri vide). Déverrouille l'écho
     `echo_signature` → entrée Codex `echo_signature` (victory → echo reveal).
     Câblé dans `movement-floors.js — _changeFloor` après la Chambre.
   - [x] **Barks de héros par boucle** : événement `darkLoop` ajouté aux 13 héros
     (`hero-barks.js`), tiré au franchissement de boucle (`_maybeAdvanceDarkLoop`).
     La tension `houseTension` (Maison canon ≠ `chosenHouse`) le colore
     automatiquement — aucun nouveau mécanisme.
   - [x] Tests : bloc `getSignatureEchoBeat`/`maybeSignatureEchoBeat`/`darkLoop`/
     `echo_signature` (`units.js`, 403 assertions) + `scenarioDarkLoopV2` (smoke).
   - **Scope** : cosmétique-first (§11.11.2). La version « **mini-quête de Boucle
     par Maison** » (spawns/récompenses, §11.9.3 💡) est **différée** — l'écho de
     signature V2 est un beat narratif one-shot, pas un nouveau moteur de quête.
3. [x] **V3 — Briser le Cycle** ✅ **IMPLÉMENTÉE** (branche
   `claude/dark-loop-v3-break-cycle`) : quête secrète multi-passages +
   boss-miroir + cinématique + fin optionnelle non-gating.
   - [x] **Boss-miroir** « Le Reflet du Mythe » (`reflet_mythe`, `monsters.js`,
     epic, danger 11). `minFloor:11` → via `effectiveFloor` n'apparaît qu'à
     l'**étage réel 21+** (effectiveFloor 11), jamais aux étages 11-20. Ajouté à
     `BOSS_FEATS` (`ironman.js`) → crédité dans `defeatedBosses`/`monsterKills`.
   - [x] **4 jalons** (`break-cycle.js`, `briserCycleJalons` pur) — tous DÉRIVÉS,
     aucun compteur persistant en plus : **I Entendre** (`seenEchoes` ⊇
     `echo_scene_sceau`, étage 14+, reachable par tous — la scène des Quatre,
     pas les 4 voix de Maison qui ne sont pas atteignables) ; **II Porter**
     (`accumulatedEclats ≥ BRISER_ECLAT_SEUIL=15`) ; **III Affronter**
     (`monsterKills.reflet_mythe ≥ 1`) ; **IV Choisir** (modale).
   - [x] **Choix + cinématique** (`break-cycle.js` + overlay `#break-cycle-overlay`) :
     `maybeOfferBreakCycle(enemyGroup)` (hook `endBattle`) propose le choix à la
     mort du Reflet quand I & II sont déjà remplis. 🕊️ Briser → `cycleBroken=true`
     + cinématique 3 pages (réutilise le patron pages d'`intro.js`, overlay dédié)
     + Codex `cycle_brise`. 🌑 Perpétuer → ferme, la Boucle continue (★ N intact).
   - [x] **Seul état persistant ajouté** : `cycleBroken` (bool, `state.js`/`save.js`/
     reset `main.js`). `brokenCycleProgress` reste **dérivé** (`briserCycleProgress()`).
   - [x] Codex : condition `cycleBroken` + entrées `briser_cycle` (quête, révélée
     par echo+eclatLoop+monster) et `cycle_brise` (la fin). Badge « 🕊️ Cycle
     Brisé » dans `char-stats-panel`.
   - [x] Tests : bloc `briserCycleJalons`/`briser_cycle`/`cycle_brise`/`cycleBroken`
     (`units.js`) + `scenarioDarkLoopV3` (smoke).
   - **Arbitrages tranchés** (validés utilisateur) : boss-miroir **nommé** ;
     **feature complète** (jalons + boss + cinématique + 2 fins) ; **jouable en
     Ironman** (cinématique cosmétique, n'interrompt pas le run de score).
     Non-gating : refuser = continuer ; la Boucle reste ouverte après avoir brisé.
4. [x] **V4 — Mutations loopVariant** ✅ **IMPLÉMENTÉE** (branche
   `claude/dark-loop-v1-ddiw8a`) : variantes de bestiaire en Boucle,
   déterministes, par-dessus `scaleMonster`. **Décisions validées** :
   loopVariant **seul** (PAS de New Game+ → respecte le modèle continu canon,
   cf. B.7) + « **cosmétique + tweak léger** ».
   - [x] `loopVariantTierName(n)` + `applyLoopVariant(monster, n)` purs
     (`dungeon-scaling.js`, testés `units.js`). Zéro RNG : dérivé du palier
     endgame `n` (= `loopNumber` du floor).
   - [x] **Nom escaladé par palier** : `LOOP_VARIANT_TIERS` = Ténébreux (loop 1,
     **compat V1**) → Spectral (2) → Abyssal (3) → Cauchemardesque (4) → Funeste
     (5+, plafonné). Remplace le « Ténébreux » plat de la branche `isDark`.
   - [x] **Tweak léger thématique borné** : la créature de Boucle **résiste aux
     ténèbres** et **révèle une faille à la lumière** (sidegrade ~neutre ; levier
     sorts de lumière en endgame). Garde-fous : jamais résist+faible sur le même
     élément ; n'écrase pas une résist/faiblesse déclarée par le monstre.
   - [x] Réutilise le halo violet existant (`variant='darkness'`, badge 🌑) — pas
     de nouvelle CSS. Métadonnée `loopTier` posée pour rendu futur éventuel.
   - [x] Tests : bloc `loopVariantTierName`/`applyLoopVariant` (`units.js`) +
     `scenarioDarkLoopV4` (smoke, vérifie nom + résist/faiblesse en jeu réel).
   - **Hors-scope (tranché)** : New Game+ (toute forme, contredit le modèle
     continu) ; teinte/aura par palier (halo + nom escaladé suffisent). Pilier
     Boucle Ténébreuse **clos V1→V4**.

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
