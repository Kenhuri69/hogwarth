# Chapitre 13 — Lot P3 : Refuges de Maison (cosmétique)

> Réf : Ch.13 §13.4.3 / §13.9.F (P3). Branche : `claude/ch13-impl-p3-refuges`.
> **Décision utilisateur** : implémenter les Refuges de Maison (variante
> cosmétique, sans soin total — option recommandée du chapitre).

## Constat — un refuge existe déjà (Poufsouffle)
`CELL.REFUGE` (data.js), repos PARTIEL `REFUGE_HEAL_FRAC = 0.5`, 1×/visite,
non-interrompu, `useRefuge()` (movement-interactions.js). **Spawn gaté
`chosenHouse === 'Poufsouffle'`** (dungeon.js) — c'est aujourd'hui la signature
exclusive de Poufsouffle (« Refuge du Blaireau », Helga).

## Design — généraliser à 4 Maisons, habillage par `chosenHouse`
- **Spawn** : élargir le gate de « Poufsouffle uniquement » à **toute
  `chosenHouse`** → chaque Maison a sa « chambre de Maison » (étages ≥ 2 sans
  fontaine, 1 room forcée). **Équité stricte préservée** (§13.6 #5) : mécanique
  IDENTIQUE pour les 4 (repos partiel 50 %, 1×/visite, non-interrompu) — seul
  l'habillage change. Pas de soin total (§13.4.3 respecté).
- **Habillage cosmétique** (`REFUGE_THEMES` + `refugeTheme()` dans state.js,
  réutilise `HOUSE_BONUSES[h].color/accent/emoji/label`) :
  - 🦁 Foyer du Lion · 🐍 Antre du Serpent · 🦅 Alcôve de l'Aigle · 🦡 Refuge du
    Blaireau (canon Poufsouffle conservé).
  - Consommé par : `useRefuge()` (nom/récit/msg), overlay `_exploreDescriptors`
    (titre/desc), `SCENE_ICONS.refuge()` (teinte bannière), `drawRefugeSprite`
    (teinte 3D si trivial).
- **Identité Poufsouffle préservée** : ils gardent en plus le passif Apothéose
  « Souffle du Blaireau », l'item « Cœur du Refuge » et l'ambiance « Chambre du
  Blaireau » — non touchés. Le refuge devient juste *aussi* disponible (themé)
  pour les autres.

## Note d'équilibrage
Élargir le refuge donne un répit partiel aux 3 autres Maisons (adoucit
légèrement l'attrition — va dans le sens de P2). **Symétrique → équité ±0 pt
entre Maisons** (toutes reçoivent le même refuge). Non modélisé par
`sim-difficulty.js` (le refuge n'y est pas simulé) → le §3 du rapport est
inchangé ; impact = répit uniforme modéré, sans soin total. Aucun scaling touché.

## Étapes
1. [x] state.js : `REFUGE_THEMES` + `refugeTheme()` + entrée MANIFEST loader.
2. [x] dungeon.js : spawn gate `=== 'Poufsouffle'` → `chosenHouse` (toutes Maisons).
3. [x] movement-interactions.js : `useRefuge()` themé (nom/récit/msg).
4. [x] movement.js : overlay interactif themé (titre/desc/icône) ; overlay
   visiteur → « Refuge » générique (Maison de l'hôte inconnue).
5. [x] scene-icons.js : `refuge({spent, accent})` — bannière teintée, défaut or.
6. [x] renderer-sprites.js : `drawRefugeSprite` teinte par Maison (cache clé
   par Maison) + comment maj.
7. [x] Tests : `scenarioRefuge` étendu (T2 : les 4 Maisons + équité + no-house ;
   T2bis theming ; T4 message habillé). `units` 532 ✅ ; `smoke` en cours.
8. [x] Cache-bump (7 JS : state30 dungeon17 movement35 movement-interactions16
   scene-icons7 renderer-sprites6 loader41 ; CACHE_VERSION v120→v121). `check_cache_versions`
   + `pwa-smoke` verts. Amendé Ch.13 §13.4.3/§13.9.F (P3 ✅)/point #3 + G7
   (cellule + section). **G4 : aucun changement** (le refuge n'est pas un bonus
   de Maison — équité — y ajouter une ligne induirait en erreur).
9. [ ] Commit + push. PR si demandé.

## Suivi / écarts
- Le refuge **existait déjà** (Poufsouffle-only) : changement = élargir le gate
  + habillage cosmétique par Maison. Aucun nouveau système.
- **Équilibrage** : élargir le répit aux 3 autres Maisons est symétrique (équité
  ±0 pt) et partiel (pas de soin total). Non modélisé par `sim-difficulty.js`
  (refuge absent du modèle) → §3 du rapport inchangé, `check_difficulty` vert.
- Overlay visiteur (Mondes Parallèles) laissé en « Refuge » générique : le
  visiteur ne connaît pas la Maison de l'hôte.
