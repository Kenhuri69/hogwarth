# SVG_PLAN bloc C.2 — Bellatrix Lestrange

> Branche : poursuite sur `claude/svg-c1-monsters-png` (PR groupée en fin de bloc C).
> Cible : C31 `bellatrix`, dernière lieutenante de Voldemort sans PNG dédié.
> Workflow Nano Banana à deux, pipeline identique au bloc C.1.

---

## Cible

| Code | Monstre | `monsters.js` ligne | Catégorie | IMG_STYLE.md |
|------|---------|---------------------|-----------|--------------|
| C31 | `bellatrix` (Bellatrix Lestrange) | 899 | humain | §8.2 |

État dans `monsters.js` : entrée existante, sans `imgSrc`. Tombe sur le
SVG inline « humain » via `getMonsterIconHtml()`. Danger 10, étage 8+,
boss avec Avada Kedavra + Cruciatus.

---

## Étapes

- [x] **0** Continuation sur la branche actuelle (pas de nouveau cut depuis master tant que C.1 n'est pas mergée).
- [x] **1** Prompt archétypal rédigé pour Bellatrix.
- [x] **2** PNG 1024×1024 RGB fourni (décor gothique).
- [x] **3** Pipeline `process_monster_png.py --id bellatrix` (rembg birefnet). Dry-run validé avant run final.
- [x] **4** `imgSrc` ajouté dans `js/monsters.js`.
- [x] **5** Smoke test 34/34 vert.
- [x] **6** `SVG_PLAN.md` mis à jour (C31 ✓ + statut 45/86 + journal #35).
- [ ] **7** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Mini-plan créé. Prompt prêt. En attente PNG. |
| 2026-05-12 | Réception PNG | Source 1024×1024 RGB avec décor gothique complet (donjon, arches, lueurs vert/violet) — pas d'alpha cutout préalable, fond difficile mais sujet bien découpé visuellement. |
| 2026-05-12 | Détourage | rembg birefnet-general (modèle déjà en cache local depuis C.1). Dry-run d'abord (`--dry-run` → `/tmp/bellatrix_check.png`) pour valider visuellement avant écraser. Bellatrix bien isolée : cheveux volants, robe en lambeaux et bottes nets, rim light cyan préservé subtilement, aucune bavure du décor. Run final écrasant. |
| 2026-05-12 | QA | 139 KB, 512×512 RGBA, α0=78%, α255=17%, occupation 53×84%. Tous critères §9 verts (5/5). Occupation horizontale 53% liée à la pose serrée (bras tendus mais corps central) ; rentre dans la plage 50-95%. |
| 2026-05-12 | Intégration | `imgSrc` câblé entre `icon` et `category` ligne 902. Smoke 34/34 vert. |
