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

## Étapes
1. [ ] Générer Planche I2 (test qualité grille/fond) → vérifier visuellement
   → critère : grille 4×3 lisible, fond gris uniforme, marges respectées.
2. [ ] Envoyer I2 à l'utilisateur (SendUserFile) pour validation.
3. [ ] Si OK → générer I3, F1, F2 idem ; sinon → l'utilisateur fournit les
   planches Nano Banana.
4. [ ] Intégration (sheet_extract → img/icons|fx/spells) — voir commandes
   dans le fichier de prompts. Qui : à confirmer (moi ou utilisateur).
5. [ ] **Bump cache PWA** (skill cache-bump) : CACHE_VERSION + ?v des assets,
   `node tools/check_cache_versions.js` + `tests/pwa-smoke.js`. Chemins PNG
   inchangés → le bump CACHE_VERSION est ce qui rend la maj visible côté joueur.
6. [ ] `node tests/smoke.js spell` + commit/push.

## Notes
- Les chemins de sortie écrasent les PNG existants (mêmes ids) → pas de
  changement HTML/JS, seul le cache doit être invalidé.
