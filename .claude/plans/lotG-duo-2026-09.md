# Lot G — Le duo comme relation : 2b (Complicité) + 2c (technique de duo)

Plan dérivé de [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md)
(axe 2, Lot G). L'axe 7 (traits de héros) est abandonné (Q4 : l'arbre « Éveil
du Sorcier » est retenu). Invariants : **aucun avantage hérité** (le profil ne
sert qu'au cosmétique et à la narration), équité des Maisons, tout ce qui
touche au combat passe par `tools/sim-difficulty.js`.

## 2b — Complicité (profil hors-save, cosmétique)

- Profil : `pairBonds: { 'a|b': n }` (clé = heroKeys triés), nettoyé à la
  lecture (clés `mot|mot`, entiers ≥ 0).
- `recordPairBattleWon(a, b)` (profile.js) : +1 à chaque combat gagné en Duo
  (hors combat astral et duel, qui sortent avant). Retourne `{ count, tier,
  tierUp }`. Toast narratif quand un palier est franchi.
- Paliers PURS `PAIR_BOND_TIERS` / `pairBondTier(n)` / `pairBondTitle(n)` :
  10 « Compagnons de route », 40 « Complices », 120 « Inséparables ».
- Répliques plus intimes : bloc `bond` dans `HERO_PAIR_BARKS` (10 paires,
  événements `allyDown` et `victory`), prioritaire dès le palier 2
  (« Complices »). `pickPairBark(speaker, partner, event, rng, bondTier)`.
  `heroBark` et l'échange de victoire (endgame.js) lisent le palier du profil.
- Codex du Sorcier : section « Complicités » (paires connues, titre, compteur).
  Le bouton du hub s'affiche aussi dès qu'une complicité existe.
- **Aucun effet de combat** : la technique de duo (2c) ne lit pas le profil.

## 2c — Technique de duo (combat, 1×/combat)

- Registre `DUO_TECHNIQUES` (battle-spells.js) par **couple d'éléments**
  (7 couples + « Résonance » pour deux éléments identiques = 8 entrées).
- Condition : Duo, tour du héros de tête (`currentBattleChar === 0`) en début
  de round, les deux héros debout, chacun a déjà lancé un sort offensif ce
  combat (`_lastCastSpellByChar`) et les deux éléments forment un couple
  connu, technique pas encore utilisée.
- Coût : **les deux tours** (le 2ᵉ héros n'agit pas ce round), aucun PM.
- Puissance : base = somme des (puissance du dernier sort + MAG/2) des deux
  héros, puis effet selon le type (`burst`, `aoe`, `stunAll`, `drain`,
  `execute`, `shield`, `resonance`). Multiplicateurs à calibrer par la sim.
- UI : bouton `#btn-duo-tech` (🤝) affiché par `_refreshBattleActionButtons`.
- Sim : flag `--duo-tech[=kind]` ; cible : gain de win-rate Duo modeste
  (≤ +3 points en moyenne, jamais > +5 à un étage).

## Étapes

1. [x] Plan (ce fichier).
2. [x] 2b : profil, paliers, enregistrement, répliques `bond`, Codex.
3. [x] 2c : sim d'abord (calibration), puis registre + action + bouton.
4. [x] Tests : units §27, smoke `scenarioLotGDuo`.
5. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé. Branche remise à zéro depuis master (PR #754 fusionnée).
- 2026-09-30 — 2b et 2c implémentés. Calibration (`--duo-tech=<kind>`, Duo,
  étages 8-12, N=1500 puis 2500) :
  - 1er jet (burst 1.6, stunAll 0.6, drain 1.2, execute 1.3) : burst +6 pts
    (ét. 12), stunAll +7 (ét. 11), drain +5 ; execute ≈ 0.
  - Réglage retenu : burst 1.4, aoe 0.7, stunAll 0.4, drain 1.0, execute 1.5,
    shield 0.9, resonance 1.4. Écarts vs baseline (95/87/81/74/71 %) :
    burst +1/+2/+5/+3/+2, stunAll +1/+2/+2/+3/+1, drain +1/+2/+3/0/+1,
    execute 0/0/+2/0/0 ; tirage mixte +1/+2/+3/+2/+3. Aucun étage > +5.
  - Limite du modèle : la sim n'active la technique qu'au 2ᵉ round, sans
    contrainte de couple d'éléments (borne haute de l'usage réel).
  Écarts : bandeau de combat réutilise la teinte `tenaille` (pas de CSS
  neuf) ; `execute` sert à deux couples (feu+physique, foudre+ténèbres).
  Tests : units §27 (1482 ✅), smoke `scenarioLotGDuo` (3 étapes ✅). Loader
  405 ; cache 9 JS, `CACHE_VERSION` 281. Suite smoke complète : 292 ✅ ; pwa-smoke ✅.
