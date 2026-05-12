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
- [ ] **2** PNG Nano Banana fourni.
- [ ] **3** Pipeline (ad-hoc si alpha déjà cut, sinon `process_monster_png.py`) → `img/monsters/bellatrix.png`.
- [ ] **4** `imgSrc` ajouté dans `js/monsters.js`.
- [ ] **5** Smoke test 34/34.
- [ ] **6** `SVG_PLAN.md` : C31 ✓ + statut global + journal.
- [ ] **7** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Mini-plan créé. Prompt prêt. En attente PNG. |
