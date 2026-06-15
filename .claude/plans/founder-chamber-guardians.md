# Plan — Boss-gardiens des Chambres des Fondateurs (Phase 3, DÉCOUPÉ)

> Roadmap Phase 3 « Boss-gardiens des Chambres des Fondateurs (ét.17-20) +
> illumination selon `chosenHouse` ». Chantier **Élevé** → découpé en lots.
> Date : 2026-06-15.

## Audit (AVANT écriture) — ce qui existe déjà

- **Chambres des Fondateurs** : `FOUNDER_CHAMBERS` (4) à `CHAMBER_FLOOR = 17`
  (`floor-ambiance.js`), étage-scène **House-aware** : seule la Chambre de la
  Maison du héros s'illumine (**règle d'illumination §10.5** — DÉJÀ codée),
  narratif + toast + déverrouillage Codex `echo_chamber_<house>`.
- **Ténébreux** : boss 8-10 recyclés en variante `darkness` aux ét. 18-20.
- **Manque** : aucun **boss-gardien fightable** propre à chaque chambre + aucun
  **art dédié**. C'est le cœur du chantier.

## Découpage (lots)

- **Lot 1 (CE PR) — Fondation données** : 4 boss-gardiens epic dans
  `monsters.js` (un par Fondateur/Maison), thématisés par élément, lore
  bestiaire, `minFloor:17` (→ contenu réel jouable en Boucle, pas du dead
  content). Pas de nouvel art (fallback SVG catégorie — art = Lot 3). Tests +
  doc (Ch.09/Ch.11 §11.9.2 + compteur CLAUDE.md).
- **Lot 2 — Placement en chambre** : lier le spawn du gardien à l'étage-scène
  de sa Chambre (illumination → la Maison du héros à 17, les 3 autres 18-20),
  via `dungeon-spawning.js`. Déclencheur de combat à l'entrée de la chambre.
- **Lot 3 — Polish** : art PNG dédié (skill `add-monster`/`add-item-icon`),
  beat de promotion (prise de parole), révélation Codex à la défaite,
  illumination-on-victory.

## Lot 1 — design des 4 gardiens (élément par Maison)

| Maison | Nom | Icône | Élément (resist / weak) | Profil |
|--------|-----|-------|--------------------------|--------|
| Gryffondor | Gardien de la Chambre du Lion | 🦁 | feu / glace | brute (Broyer auto), burn |
| Serpentard | Gardien de la Chambre du Serpent | 🐍 | ténèbres / lumière | caster, poison/drain |
| Serdaigle | Gardien de la Chambre de l'Aigle | 🦅 | foudre / physique | caster rapide, stun/dispel |
| Poufsouffle | Gardien de la Chambre du Blaireau | 🦡 | physique·glace / feu | tank, soin/weaken |

- `epic:true`, `minFloor:17`, `weight:2`, `scale ~0.33`.
- Drop signature : la **légende de Maison** correspondante (sword_gryff /
  locket_slytherin / diademe_serdaigle / coupe_poufsouffle) à faible chance.

## Étapes Lot 1

1. [x] `monsters.js` : 4 entrées gardiens (avant `];`).
2. [x] `tests/units.js` : section gardiens (ids, epic, theming par Maison).
3. [x] `node tests/units.js` vert.
4. [x] CLAUDE.md « Monstres définis (73→77) » + ligne récap gardiens.
5. [x] Doc : 09 (mention bestiaire) + 11 §11.9.2 (gardiens fightables = Lot 1).
6. [x] Roadmap Phase 3 : ligne boss-gardiens → 🟧 « Lot 1/3 fait » + découpage.
7. [x] cache-bump `monsters.js` + CACHE_VERSION.
8. [x] check_cache_versions + pwa-smoke + smoke (bestiary/combat) + check_doc_modules.
9. [ ] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Code servi (`monsters.js`) → cache-bump (§8).
- Pas de nouvel art en Lot 1 (assumé, fallback SVG) — honnête, art = Lot 3.
- `minFloor:17` → jouable en Boucle dès Lot 1 (pas de dead content) ; le
  placement en chambre (Lot 2) raffine sans casser Lot 1.
- Pas de changement de génération en Lot 1 → risque minimal.
