# Thème A — Endgame frais · A1 : Faune native des Ruines (étages 13-16)

> Issu de `game-evolution-review-2026-07.md` (Thème A, signal le plus fort :
> 3 revues convergent). La Boucle Ténébreuse recycle les monstres 1-10
> renommés+gonflés ; les Ruines Anciennes (Zone D, 14+) n'ont **aucune faune
> native**. A1 = combler la falaise `minFloor 13-16` (aujourd'hui **0 monstre**)
> avec des créatures de l'**Avant-Monde** (antérieur à l'école/runes/Fondateurs),
> cohérentes avec le lore du Dormeur des Fondations et des « coutures du réel ».

## Constat (audit code)

`minFloor` des monstres : 11 → 1 (basilic, boss), 12 → 1 (reflet, boss),
**13-16 → 0**, 17 → 4 (Gardiens des Fondateurs). Toute la tranche 13-16 de la
Boucle tourne sur le recyclage `effectiveFloor` de la faune 1-10. Zone D a un
tileset/ambiance dédiés mais aucune créature propre.

Lore mobilisé (`codex.js`) : Ruines = « l'école avant l'école » ; Dormeur des
Fondations antérieur à l'écriture, son souffle EST la magie brute ; Éclats =
« coutures du réel » arrachées par la spirale. → créatures = **choses
primordiales / gardiens du Sceau / manifestations du souffle**, PAS des bêtes
HP recyclées.

## Périmètre A1 (1er batch — 4 créatures régulières)

| id | Nom | minFloor | catégorie | rôle | élément (resist/weak) |
|---|---|---|---|---|---|
| `larve_fondations` | Larve des Fondations | 13 | créature | brute (Broyer auto) + bleed | ténèbres/physique → faible lumière |
| `golem_runique_primordial` | Golem de Rune Primordiale | 14 | être magique | tank/brute + stun/weaken | physique/foudre → faible glace |
| `suture_du_reel` | Suture du Réel | 15 | être magique | caster + dispel + fear | ténèbres/lumière → faible physique |
| `souffle_du_dormeur` | Souffle du Dormeur | 16 | fantôme | caster drain + fear | ténèbres → faible lumière |

- **Non-boss** (weight 3-5), stats calées sur la faune existante minFloor 8-9
  (hp 60-120, atk 10-20, scale 0.28-0.32) — `scaleMonster` gère la magnitude
  réelle en Boucle. Rôles/éléments variés (anti-redondance).
- **Art** : `imgSrc` **omis** → fallback SVG catégorie / emoji (fonctionnel
  immédiatement). PNG painterly = **suivi** (prompts nano-banana à rédiger,
  hors-session ; `scenarioMonsterimages` ne teste que les monstres AVEC imgSrc
  → verts). Le `souffle_du_dormeur` (fantôme) valorise Lumos Solem (×1,5
  morts-vivants) — synergie voulue.
- **Enrichit aussi le recyclage** : via `effectiveFloor`, ces créatures
  réapparaissent aux boucles profondes (réel 23-26+…).

## Étapes → vérification

1. Insérer les 4 entrées dans `js/monsters-high.js` (bloc « Faune native des
   Ruines », avant les Gardiens des Fondateurs). → `node --check`.
2. `node tests/smoke.js` (monstres/bestiaire/combat) + `MonsterImages` (doit
   rester vert : nos monstres sans imgSrc sont ignorés par le test).
3. Équilibrage : `node tools/sim-difficulty.js --endgame` si l'outil lit
   `MONSTERS` ; sinon calibration par analogie (stats ≈ faune 8-9 existante) —
   à consigner.
4. Cache PWA : bump `monsters-high.js` + `CACHE_VERSION` (guidelines §8).
5. Bestiaire : aucune action (data-driven).

## Hors-scope A1 (suites du Thème A)
- PNG painterly des 4 créatures (prompts nano-banana).
- Mini-boss de palier de Boucle (A2), payoff des fins (A3), sinks (A4),
  beat du Dormeur (A5).

## Journal
- **2026-07-16** — Plan créé. Audit falaise 13-16 confirmé. Batch de 4
  créatures Avant-Monde conçu (art en fallback, PNG en suivi).
- **2026-07-16 — A1 LIVRÉ** ✅ : 4 créatures dans `monsters-high.js`
  (`larve_fondations` mf13 brute+bleed, `golem_runique_primordial` mf14
  tank+stun/weaken, `suture_du_reel` mf15 caster+dispel+fear,
  `souffle_du_dormeur` mf16 fantôme drain+fear, faible lumière → synergie
  Lumos Solem). Sans imgSrc (fallback SVG catégorie), art PNG en suivi.
  - **Équilibrage (sim avant/après, joueur suréquipé)** : la Boucle devient
    légèrement plus dure (ét.25 74/92→71/88, ét.30 68/86→59/83, ét.40
    35/46→33/43) — sens VOULU (revue : Boucle trop facile), rapproche des
    cibles « R1 marqué ». Aucune régression adverse.
  - Cache : `monsters-high.js` v3→4, `CACHE_VERSION` v258→259.
  - Tests : `units` 1103 ✅ ; `smoke` MonsterImages/bestiary/MonsterCombatInfo/
    combat/dungeon (17) ✅ ; `sim --endgame` avant/après comparé.
  - **Suivi** : PNG painterly des 4 créatures (prompts nano-banana) ; A2-A5.
