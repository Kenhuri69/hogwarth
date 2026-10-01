# Lot 4 (d) — Onglet « Passifs actifs » + achat de points en Marques (4.6 fin, 4.7)

Revue `revue-design-progression-2026-07.md` §6.1 et §6.4, étapes 4.6 (reste) et
4.7. Empilé sur la PR #760 (non fusionnée). Reste ensuite : 4.8 (sim + docs).

## Conception (écarts ⚠️)

- **Onglet « Passifs actifs »** (résout B3) : bascule « 🌳 Arbre / 📜 Passifs »
  dans `#skill-tree-modal`, par héros. Vue en **lecture seule** : aucune logique
  déplacée, on relit l'état existant.
  - Paliers de Maison atteints (`HOUSE_BONUSES[chosenHouse].tiers`, résumé du
    bonus) + série Apothéose ★ N ;
  - Passif d'Apothéose (`houseApotheosePassive()`) ;
  - Sets actifs (Ténèbres, set de Maison, Voyageur — comptes `c._*Count` ≥ 2) ;
  - Souvenirs d'Outremonde débloqués ;
  - Faveur de la Salle (thèmes découverts, bonus de départ) ;
  - Éveil : total des bonus de l'arbre + action de classe.
  Helper `awakenPassivesList(c)` → `[{ title, icon, lines[] }]` (testable).
- **Achat de points (4.7)** : `awakenBuyCost(n)` PUR = `3 + n(n+3)/2`
  (3, 5, 8, 12, 17…) où `n = c.awakenBought` ; Marques partagées
  (`hunterMarks`), points par héros. Plafond `AWAKEN_BUY_MAX = 8` par héros
  (borne le budget Boucle ~25-30 du design). `awakenBuyPoint(charIdx)` +
  bouton dans la modale (visible si licence ou Marques > 0), `confirmModal`.
- ⚠️ **Respec global (❓7)** : non tranché → hors périmètre.

## Étapes

1. [x] Plan (ce fichier).
2. [x] `awakenBuyCost` / `awakenBuyPoint` + bouton.
3. [x] `awakenPassivesList` + onglet.
4. [x] Tests : units §32c (coûts, plafond) ; smoke (achat, onglet passifs).
5. [x] Loader, CLAUDE.md, cache-bump, suite, push.

## Journal

- 2026-10-01 — Plan créé (PR #760 ouverte, non fusionnée : empilé).
- 2026-10-01 — Implémenté tel que conçu. Tests : units §32c (1556 ✅), smoke
  `scenarioSkillTree` T4 (bouton d'achat masqué sans Marques, −3 Marques
  → +1 point, achat suivant bloqué, `awakenBought` restauré par la save,
  onglet Passifs à 6 sections ✅), suite complète 298 ✅, pwa-smoke ✅ ;
  captures desktop + mobile de l'onglet vérifiées. Loader 429 ; cache
  `awaken-tree.js` 3, `awaken-tree.css` 2, `loader` 79, `CACHE_VERSION` 288.
  Suite : 4.8 (sim + docs G3/G4).
