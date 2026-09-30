# Lot B — Des antagonistes présents et un rythme d'actes

**Branche :** `ccr-4b80ea69-2nys9o` (repartie de `master` après le merge de la PR #751)
**Source :** [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md),
axes 3a, 3b, 3c et arc H8.
**Statut :** ✅ livré (PR en cours)
**Demande (utilisateur, 2026-09-30) :** « Ok lot B ». Q2 (murmures de
Voldemort) acceptée le 2026-09-29.

## Constat de départ (mesuré)

- `BOSS_PROMO_BEATS` (`battle.js`) : 6 boss, tous originaux. Bellatrix, Dolohov,
  Greyback, Aragog, Quirrell et les deux Voldemort sont **muets**.
- Aucun boss garanti avant l'étage 10 (`_ensureFinalBossPresent`, seul
  garde-fou de spawn de boss pré-victoire).
- Voldemort ne parle jamais avant le combat final.
- La surface (l'école vivante) n'est jamais montrée pendant la descente.

## Invariants

- Aucun blocage de `goDeeper()` : le boss d'acte est **facultatif** (placé
  loin des deux escaliers, jamais sur le chemin imposé).
- Canon : Voldemort reste une **corruption résiduelle** qui parle *à travers* la
  fêlure (02:175) ; aucune résurrection.
- One-shot partout (sentinelles dans `seenScriptedBeat`, déjà sérialisé).
- Texte seulement pour 3a, 3b et H8 : aucun OGG n'existe, aucune voix jouée.
- Ton : 02 (pages courtes, narration au « tu », horreur suggérée).

## Décisions de conception

- **3a — Promotion des boss canon** : +7 entrées dans `BOSS_PROMO_BEATS`
  (`ombre_quirrell`, `bellatrix`, `fenrir_greyback`, `aragog`,
  `antonin_dolohov`, `voldemort_affaibli`, `voldemort_revenu`). Même format
  (`icon`, `line`), plus un champ optionnel **`fall`** : ligne de chute jouée
  à la **première défaite** du boss (`_maybeBossFallBeat`, one-shot
  `boss_fall:<id>`, appelé dans `endBattle` gagné). Pas de `fall` pour
  `voldemort_revenu` : la cinématique de victoire s'en charge.
- **3b — Murmures de la fêlure** : `CRACK_WHISPERS` dans `floor-ambiance.js`,
  à la 1re entrée des étages **5, 6 et 9** (le 8 porte déjà un étage-scène).
  Résolveur pur `pickCrackWhisper(floor, ctx)` :
  - étage 5 : selon la **Maison** (la tentation épouse sa vertu) ;
  - étage 6 : selon le **héros** présent (Harry, Drago), sinon défaut ;
  - étage 9 : selon le **Pacte** de Serpentard (`pact` / `defiance`), sinon défaut.
  Orchestrateur `maybeCrackWhisper(floor)`, pré-victoire uniquement.
- **3c — Boss d'acte garantis** : `ACT_BOSSES = { 6: ombre_quirrell (escorté),
  8: fenrir_greyback (seul) }` dans `dungeon-spawning.js`,
  `_ensureActBossPresent(floor)` (modèle `_ensureFinalBossPresent`) appelé aux
  3 mêmes points. Placé sur la case libre qui maximise la distance aux deux
  escaliers (antre à l'écart). Pré-victoire, tant que le boss n'a pas été
  vaincu (sentinelle `act_boss_down:<id>`, posée dans `endBattle` pour tout
  kill de l'espèce). Le boss seul porte `soloEncounter: true`, lu par
  `startBattle` (taille de groupe forcée à 1).
  - **Simulation** (`sim-difficulty.js`, nouvelles options `--boss=ID` et
    `--boss-alone=1`, Broyer runtime, 3000 combats, PV pleins) :

    | Étage | Combat | Solo | Duo |
    |---|---|---|---|
    | 6 | moyenne de l'étage | 90 % | 100 % |
    | 6 | Quirrell escorté | 95 % | 100 % |
    | 8 | moyenne de l'étage | 73 % | 95 % |
    | 8 | Greyback escorté | 51 % | 92 % |
    | 8 | Bellatrix escortée | 39 % | 93 % |
    | 8 | Bellatrix seule | 79 % | 100 % |
    | 8 | **Greyback seul** | **99 %** (41 % PV restants, 15 tours) | **100 %** |

    Choix : Quirrell escorté (combat de boss accessible, au niveau de l'étage)
    et Greyback **seul** (combat long et tendu, sans mur solo). Bellatrix et
    tout boss escorté à l'étage 8 sont écartés (mur solo < 50 %), conformément
    au refus du nerf des boss 8-11.
- **H8 — Lettres de la surface** : `composeSurfaceLetter(floor, ctx)` (pur) aux
  étages **4, 7, 10** (entrées d'Acte) et **11** (entrée de la Boucle). La
  lettre a un expéditeur et un paragraphe de base, plus une phrase qui
  **reflète l'état** : quêtes remises (`completedQuests.size`), Quête Signature
  remise, palier de Maison. Livrée dans le journal (`addMsg` narratif), comme
  les étages-scènes. Orchestrateur `maybeSurfaceLetter(floor)`, one-shot
  `surface_letter:<floor>`.

## Étapes

- [x] B0 Simulation : options `--boss` / `--boss-alone` dans
      `sim-difficulty.js` ; mesures ci-dessus.
- [x] B1 `battle.js` : 7 promotions + `fall` + `_maybeBossFallBeat` ;
      `soloEncounter` dans `startBattle`. `battle-rewards.js` : appel de la
      chute + sentinelle `act_boss_down`. → vérif : units §9 étendu.
- [x] B2 `dungeon-spawning.js` : `ACT_BOSSES`, `_ensureActBossPresent`,
      branché dans `dungeon.js`, `movement-floors.js`, `save.js`.
      → vérif : smoke (présence, gates, défaite, combat seul).
- [x] B3 `floor-ambiance.js` : murmures + lettres ; branchement dans
      `_changeFloor`. → vérif : units (résolveurs purs), smoke (one-shot).
- [x] B4 MANIFEST du loader, docs (CLAUDE.md, bible 06 / 08 si pertinent).
- [ ] B5 Tests complets (units, smoke, pwa-smoke, check_*), bump du cache,
      commit, état de la PR, push, PR.

## Journal

- **2026-09-30** — Plan créé. Simulation faite (B0).
- **2026-09-30** — B1 à B4 implémentés. Écarts et précisions :
  - 3a : 7 promotions (et non 6) — l'Ombre de Quirrell est ajoutée puisque
    c'est le boss d'acte de l'étage 6 (« précédé de la promotion 3a »).
  - 3c : un exemplaire déjà présent sur l'étage (tirage naturel) est marqué
    au lieu d'être dupliqué ; tout kill de l'espèce clôt la garantie.
    Placement aussi au chargement d'une save (`save.js`), comme le boss final.
  - Texte : accords neutres (le joueur peut être une héroïne) — « de la
    visite » pour Bellatrix, « t'as repris l'escalier » pour Hagrid.
  - Manifeste du loader : +5 entrées (369 → 374), CLAUDE.md et bible 06 mis à jour.
  - Tests : units §9 étendu (13 promotions, chutes) + §22 (boss d'acte,
    murmures, lettres) ; smoke `scenarioActBossesAndWhispers` (placement,
    combat seul, promo + chute + garantie close, Quirrell escorté, murmure
    et lettre via la vraie descente `goDeeper`).
  - Bump : 8 assets + `CACHE_VERSION` 275 → 276.
