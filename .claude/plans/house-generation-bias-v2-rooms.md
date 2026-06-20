# Biais de génération par Maison V2 — levier « pondération de salles »

> Item 1 de la passe polish (REVUE-TRANSVERSALE-ET-ROADMAP Phase 3).
> Branche : `claude/house-generation-bias-v2-3bt0g4`.

## Contexte / audit doc↔code (fait 2026-06-20)

- Leviers V2 **déjà livrés** : (a) skin visuel des cartes d'ennemi
  (`houseSkinClass`/`HOUSE_SKIN_ENABLED`, battle-ui.js) ; (b) perception
  déterministe (`housePerceptionLine`/`HOUSE_PERCEPTION`, floor-ambiance.js +
  surfaçage movement.js). Tous deux **power-neutral par construction** (aucun
  `Math.random`).
- **Seul restant** : la « pondération de salles » (distribution des types de
  salle), différée derrière le **gate sim** d'équité.
- Flag de repli existant : `houseGenBiasEnabled` (state.js, défaut true).
- Spec : `docs/histoire/10-lieux-et-geographie.md §10.6`, tableau leviers
  autorisés/interdits.

## Contrainte d'équité (BLOQUANTE — power-neutral strict)

Iso-ressources : même budget de coffres / fontaines / boutiques / refuges /
autels / combats pour les 4 Maisons. On RÉALLOUE la saveur, on n'AJOUTE rien.

### Analyse de neutralité (clé du design)

Les seules features **reward-équivalentes** du donjon sont les deux puzzles
bonus, qui scellent **chacun exactement 1 coffre** :
- `_generateRunePuzzle` (rune, 20 %) — Serdaigle (glyphes/runes)
- `_generateRuneStele` (stèle d'énigme, 30 % si pas de rune) — Serdaigle (stèles)

`P(puzzle présent) = 1 − (1−0.20)(1−0.30) = 0.44`. Cette probabilité combinée
est **symétrique** en (rune, stèle) : inverser l'ordre des deux tirages
(stèle d'abord 30 %, puis rune 20 %) donne `1 − (1−0.30)(1−0.20) = 0.44`
**à l'identique**. Donc :

> **Réordonner rune↔stèle selon la Maison change la SAVEUR (type de puzzle)
> SANS toucher le budget de coffres** (P(puzzle)=0.44 invariant, 1 coffre).

C'est le seul levier structurel **prouvablement** iso-ressources. Il est
**on-spec pour 🦅 Serdaigle** (« +stèles d'énigme »). Les thèmes des 3 autres
Maisons (🐍 passages, 🦡 refuges, 🦁 marques de bataille) ne sont **pas**
reward-équivalents à un coffre :
- 🦡 refuge = repos (déjà placé **identiquement pour les 4 Maisons**, ligne
  dungeon.js ~417 — toute Maison non nulle en reçoit 1 sur étage éligible) ;
- 🐍 passage secret = +1 coffre caché (déjà 50 %, identique 4 Maisons) ;
- 🦁 marques de bataille = pure décoration sans butin.
Les ajouter pour UNE Maison violerait l'iso-ressources. Leur saveur de salle
reste donc portée par la **couche perception** (déjà livrée) + le refuge commun.

**Décision** : le levier « pondération de salles » se concrétise par le
**reorder rune↔stèle pour Serdaigle** (prouvablement neutre), avec un helper
pur `houseRoomBias(house)` house-général (encode l'intention spec des 4
Maisons, extensible). Pas de reskin reward-bearing pour les 3 autres (équité).

## Étapes

1. **Helper pur** `houseRoomBias(house)` dans `js/floor-ambiance.js` →
   `{ puzzlePreference: 'stele'|'rune'|null }` (Serdaigle→'stele', autres→null
   = ordre V1). PUR, déterministe, défensif (house inconnue → null).
   → verify : `node tests/units.js` (nouveau bloc).
2. **Câblage dungeon.js** : remplacer le call-site puzzle (l.472-477) par un
   dispatch gaté `houseGenBiasEnabled` :
   - Serdaigle (et `houseGenBiasEnabled`) → stèle d'abord, rune en repli ;
     réinitialise `runePuzzle`/`litRunes` si stèle posée.
   - sinon → V1 inchangé (byte-identique).
   → verify : flag false ou house≠Serdaigle = comportement V1 exact.
3. **state.js** : aucun nouveau flag (réutilise `houseGenBiasEnabled`).
4. **Test units** : déterminisme du helper + **invariant de neutralité**
   (`P(puzzle)` identique quel que soit l'ordre = 0.44, vérifié sur la formule).
5. **Test smoke** (`tests/scenarios/houses.js` ou `dungeon.js`) : stub
   `Math.random` (LCG seedé), générer le MÊME seed pour les 4 Maisons,
   asserter que l'histogramme des cellules fonctionnelles **hors coffre-puzzle**
   (CHEST/SHOP/FOUNTAIN/REFUGE/ALTAR) est **identique** entre Maisons (ces
   cellules sont placées AVANT tout code house-divergent), et que la
   **répartition rune/stèle diffère** (Serdaigle + de stèles) en agrégat.
6. **Gate sim** : `node tools/sim-difficulty.js --house-set=<h>` pour les 4
   Maisons → win-rate identique (le levier n'entre pas dans la sim combat →
   0 écart trivial). `node tools/sim-economy.js` → or invariant (coffres/étage
   inchangés). Documenter dans `DIFFICULTY_REPORT.md` (section dédiée).
7. **cache-bump** (dungeon.js + floor-ambiance.js touchés) + smoke + units +
   pwa-smoke. `check_doc_modules.js` vert.
8. **Doc** : 10 §10.6 (promotion du levier salles → livré, honnête sur le
   périmètre Serdaigle-structurel) + roadmap (table Phase 3 + statut), date du
   jour.

## Critère de neutralité / décision merge

Le levier est **iso-ressources par construction** (P(puzzle)=0.44 invariant →
budget coffres identique ; refuge/fontaine/boutique/autel placés par du code
house-agnostique). Prouvé par le test smoke (histogramme hors-puzzle identique)
+ la formule (units). Sim per-Maison confirme 0 écart de win-rate. → **MERGE**
avec flag true. Si un écart apparaissait (impossible par construction), repli
flag false + rapport, ligne roadmap laissée ouverte.

## Suivi

- [x] Étape 1 — helper `houseRoomBias` (floor-ambiance.js) + MANIFEST loader
- [x] Étape 2 — câblage dungeon.js (reorder Serdaigle, gaté flag)
- [x] Étape 4 — units (helper + invariant P=0.44) → 780+ assertions vertes
- [x] Étape 5 — smoke `scenarioHouseRoomBias` : iso-ressources prouvé (histogramme
      identique 4 Maisons, spread coffres-puzzle 3/60 ; Serdaigle 23 stèles/5 runes)
- [x] Étape 6 — gate : check_difficulty 0 dérive · sim-economy invariant ·
      DIFFICULTY_REPORT.md §8
- [ ] Étape 7 — cache-bump + tests verts
- [x] Étape 8 — doc 10 §10.6 + roadmap (Phase 3 + §1.5)

## Résultat

Levier **iso-ressources prouvé par construction** (P(puzzle)=0.44 symétrique).
Décision : **MERGE** avec flag true. Périmètre Serdaigle-structurel assumé
(équité) ; 🐍/🦡/🦁 sur la couche perception + refuge commun.
