# Plan — Agrandissement de la grille du donjon (12×12 → 16×16)

> Objectif : lever la contrainte qui a forcé le donjon branchu (Phase 1 de
> `dungeon-enrichment.md`) à se replier de 8 → 5 salles. La map 12×12
> (10×10 utile) ne sépare proprement que ~4 salles ; passer à 16×16
> (14×14 utile) redonne l'espace pour une vraie épine + plusieurs branches.

Statut global : **✅ LIVRÉ.** (code confirmé : `MAP_W=MAP_H=16`, `ROOM_COUNT=7`,
`SPINE_LEN=4`, minimap desktop 10px ; `scenarioBranchyDungeon` à jour.)
Branche de travail : `claude/fix-door-view-blocking`.
Décision utilisateur (2026-05-22) : taille **16×16**, **plus de salles**.

---

## État des lieux

- `MAP_W = MAP_H = 12` (`data.js:4`) — 10×10 utile (bordure de murs).
- `generateDungeon` : `ROOM_COUNT = 5`, `SPINE_LEN = 3` codés en dur.
  Placement non-chevauchant (40 essais), repli mémorisé toléré.
- Minimap (`renderer-minimap.js`) : tailles de cases **fixes** —
  desktop `14`px, overlay mobile `20`px, coin mobile `'auto'`.
  - Desktop : grille dans une colonne de **200px** (`style.css:117`).
    12×14 + 11×2 gap = **190px**. À 16 colonnes il faut réduire la case.
  - Overlay mobile : `.map-overlay-box` `max-width:92vw`. 12×20 = 262px ;
    à 16 colonnes × 20px = 350px → déborde sur petit écran.
  - Coin mobile : `'auto'` (1fr + aspect-ratio) — s'adapte seul.
- Tous les autres usages de `MAP_W/MAP_H` (renderer, teleport, ui,
  inventory, dungeon) bouclent sur les constantes → s'adaptent seuls.
- Smoke `scenarioBranchyDungeon` : assertion `rooms === 5` à mettre à jour.

---

## Étapes

- [x] **1** `data.js` : `MAP_W = MAP_H = 12` → `16`. → *verif :* le jeu démarre,
      `node tests/smoke.js` ne régresse pas hors comptes de salles.
- [x] **2** `dungeon.js` : `ROOM_COUNT 5 → 7`, `SPINE_LEN 3 → 4`
      (épine = spawn + 2 salles + escalier ; 3 branches cul-de-sac).
      Mettre à jour le bloc de commentaire « 5 salles ». → *verif :*
      `lastDungeonRooms.length === 7`, ≥ 1 branche, connexité 100 %.
- [x] **3** `renderer-minimap.js` : case desktop `14 → 10`
      (16×10 + 15×2 = 190px, identique à l'actuel), overlay mobile
      `20 → 16` (16×16 + 15×2 = 286px < 92vw). → *verif :* minimap
      ne déborde pas du panneau ni de la modale.
- [x] **4** `tests/smoke.js` : `scenarioBranchyDungeon` assertion
      `rooms === 5` → `rooms === 7`. → *verif :* scénario vert.
- [x] **5** `node tests/smoke.js` complet 100 % vert.

## Critères de succès

- Sur 30 générations : escalier descendant toujours atteignable,
  STAIRS_D unique, ≥ 1 branche, 7 salles.
- Minimap desktop tient dans la colonne 200px ; overlay mobile dans 92vw.
- Aucune régression de la suite smoke.
- Le renderer pseudo-raycasting (`DEPTH=5`) est inchangé — couloirs plus
  longs uniquement, aucun nouveau code de rendu.

## Hors-scope

- Rééquilibrage du rythme (étages plus longs = plus de respawns) : à
  observer en jeu, ajustable ensuite via `enemyChance` si besoin.
- Le plan `dungeon-enrichment.md` (clos) n'est pas réécrit — ses mentions
  « 12×12 » / « 5 salles » restent l'historique de la Phase 1.

## Journal

| Date | Étape | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-22 | Rédaction | ✅ | Audit minimap + génération. Taille 16×16 et « plus de salles » validés par l'utilisateur. |
