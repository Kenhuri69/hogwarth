# Plan — P5 : Étage-scène « Chambre des Fondateurs » (Maison, Cœur runique)

**Branche :** `claude/ambiance-chambre-maison` (depuis master à jour)
**Statut :** ✅ Livré (units 272 · smoke 181/181 · pwa-smoke OK · cache v92)
**Arbitrage produit :** ✅ validé par l'utilisateur (2026-06-09) — on accepte un
**étage-scène scénarisé** au Cœur runique, dérogation assumée à la promesse
« donjon 100 % procédural » (limitée à 1 point fixe, le reste reste procédural).

Dernier item du chantier ambiance Zone D (Étape 3 #447, P-D4 #450 livrés).
Sources : `docs/histoire/10-lieux-et-geographie.md` §10.5 (Chambres des
Fondateurs + règle d'illumination), §10.6 (variantes Maison), §10.2 (étages 17-20).

## Concept

Au **seuil du Cœur runique (étage 17)**, le héros découvre les quatre Chambres
des Fondateurs. **Seule la Chambre de sa Maison (`chosenHouse`) s'illumine et
l'accueille** (brasiers / serrures / runes traduites / alcôve tiède) ; les trois
autres restent **hostiles et muettes**. La Chambre rejoue en écho un fragment de
la **quête signature** de la Maison. Cosmétique mais fort.

Réutilise **toute** l'infra P5 existante (étages-scènes 1/4/8) :
`FLOOR_SCRIPTED_BEATS` / `maybeScriptedFloorBeat` / `seenScriptedBeat` (sérialisé).

## Étapes & critères

1. **Registre + résolveur purs** (`floor-ambiance.js`) :
   - `FOUNDER_CHAMBERS` (obj, clé = Maison) : `chamber`/`founder`/`emoji`/
     `narrative`/`toast`/`echoId`. Textes ch.10 §10.5/§10.6.
   - `CHAMBER_FLOOR = 17` ; `getFounderChamberBeat(floor, chosenHouse)` pur →
     beat de la Maison à l'étage 17, sinon null. → vérif units : 17×4 Maisons OK,
     16/18/99 → null, sans Maison → null.
2. **Orchestrateur one-shot** `maybeFounderChamberBeat(floor)` : sentinelle
   `'founder_chamber'` dans `seenScriptedBeat` (distincte des clés d'étage int),
   affiche narrative+toast, **déverrouille l'écho de Chambre** (`seenEchoes`).
   → vérif units : 1ʳᵉ fois true + écho ajouté, 2ᵉ false (idempotent).
3. **Codex** : 4 échos `echo_chamber_<house>` (tier `'chamber'`) dans
   `TEMPORAL_ECHOES` ; `renderEchoCodex` (ui-bestiary.js) gagne le libellé de
   tier `chamber`. → onglet « Mémoire des Ruines » liste 10 échos.
4. **Wiring** : appel `maybeFounderChamberBeat(currentFloor)` en
   `movement-floors.js`, juste après `maybeScriptedFloorBeat`.
5. **Garde-fous** : MANIFEST loader (`getFounderChamberBeat`,
   `maybeFounderChamberBeat`, `FOUNDER_CHAMBERS`) ; `tests/units.js` (résolveur
   pur + one-shot) ; `tests/smoke.js` `scenarioFounderChamber` ; `units && smoke`
   verts ; bump cache PWA (floor-ambiance, movement-floors, ui-bestiary, loader +
   `CACHE_VERSION` + `PRECACHE_URLS`).

## Décisions de cadrage
- **Un seul** étage-scène (17), pas quatre (17-20) : couvre le « seuil des
  Chambres » sans sur-scénariser l'endgame ; les étages 18-20 restent procéduraux
  (boss Ténébreux). Réduit le risque vs la promesse procédurale.
- Pas de nouvelle cellule/`LOCATIONS` ni de branchement `dungeon.js` : c'est un
  **beat textuel** + déverrouillage codex (cohérent avec les beats 1/4/8).
- `seenScriptedBeat` est déjà sérialisé → **aucune migration de save**.

## Hors scope
- Chambres distinctes jouables aux 4 étages 17-20 + combats dédiés (V2 lourde).
- Superposition audio des 4 timbres de Fondateur.

## Journal des écarts
- **§10.5 ne tabule pas littéralement « quatre Chambres, une par Maison »** : la
  notion est dérivée fidèlement de la **règle d'illumination** (§10.5, voix du
  Fondateur de la Maison priorisée) + des **saveurs de Maison** (§10.6 : brasiers
  Gryffondor / serrures Serpentard / glyphes Serdaigle / alcôve Poufsouffle).
  Aucun canon contredit ; cadré comme **beat textuel** (pas de carte modifiée),
  cohérent avec le garde-fou procédural de §10.6.
- **Aucune migration de save** : `seenScriptedBeat` était déjà sérialisé ; la
  sentinelle string `'founder_chamber'` survit au round-trip (vérifié smoke T3).
- **1 seul étage-scène (17)** retenu vs 4 (17-20) — voir « Décisions de cadrage ».
- Réutilisation intégrale de l'infra P5 (beats 1/4/8) : 0 nouvel état persistant.
