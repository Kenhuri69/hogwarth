# Planches restantes — génération + intégration (I2, I3, F1, F2)

Branche : `claude/nano-banana-remaining-planches-8eo0l6`
Prompts source : `.claude/plans/nano-banana-prompts-spells-full-rework.md`

## Contexte
La Planche I1 (Feu/Glace/Foudre) est livrée (PR #694). Restent 4 planches :
- **I2** — Lumière/Ténèbres/Mental (4×3, 12 icônes 128²)
- **I3** — Nature/Soin/Temps/Utilitaire (4×3, 12 icônes 128²)
- **F1** — FX splash Feu/Glace/Poison (3×3, 9 FX 256²)
- **F2** — FX splash Lumière/Ténèbres/Support/Temps (3×3, 9 FX 256²)

## Contrainte clé (anti-halo)
Fond GRIS plat `#8C9298`, chaque effet centré ~70 %, marge grise ≥ 12 %,
estompe en transparence avant le bord. JAMAIS de fond blanc.

## Limitation outil
Pas d'accès Nano Banana (Gemini) dans cette session — seulement FLUX/Qwen
(Hugging Face). Fiabilité de grille incertaine. Étape 1 = test sur I2.

## Boucle confirmée (hand-in-hand)
L'utilisateur génère la planche avec Nano Banana et me la dépose ; moi je fais
découpe (`sheet_extract`) → intégration → bump cache → commit/push. (L'`invoke`
Hugging Face est coupé dans cette session — je ne génère pas l'image moi-même.)

## Étapes
1. [x] **Planche I2** (Lumière/Ténèbres/Mental) — fournie par l'utilisateur,
   `sheet_extract` 4×3 → 12 PNG `img/icons/spells/` : 12/12 PASS, QC damier net,
   zéro halo. Bump `CACHE_VERSION` v233→v234. `check_cache_versions` ✅,
   `pwa-smoke` ✅ (cache v234), `smoke.js spell` ✅ (11/11). → commit.
2. [x] **Planche I3** (Nature/Soin/Temps/Utilitaire, 4×3) — 12/12 PASS, QC net,
   bump CACHE_VERSION v234→v235. → commit.
3. [x] **Planche F1** (FX Feu/Glace/Poison, 3×3 256²) — 9/9 PASS. Cellule 9
   (sanguini_vorace) portait un watermark Gemini « ✦ » baké sur le swirl →
   masqué + clone-patch (filaments rouges depuis la gauche, feather) avant
   re-extraction. bump CACHE_VERSION v235→v236. → commit.
4. [ ] **Planche F2** (FX Lumière/Ténèbres/Support/Temps, 3×3 256²) — idem.
5. [ ] À chaque planche : sheet_extract + re-bump CACHE_VERSION + tests + commit.

## Notes
- Les chemins de sortie écrasent les PNG existants (mêmes ids) → pas de
  changement HTML/JS, seul le cache doit être invalidé.
