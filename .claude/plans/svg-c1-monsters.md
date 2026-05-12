# SVG_PLAN bloc C.1 — 4 PNG monstres restants

> Branche dédiée : `claude/svg-c1-monsters-png`
> Cibles : C26 mangemort_elite, C27 sorcier_renegat, C29 chimere, C30 ombre_quirrell.
> Workflow Nano Banana à deux (PNG fournis par l'utilisateur, pipeline + intégration côté Claude).

---

## Cibles (4 PNG monstres)

| Code | Monstre | `monsters.js` ligne | Catégorie | IMG_STYLE.md |
|------|---------|---------------------|-----------|--------------|
| C26 | `mangemort_elite` | 862 | humain | §8.2 |
| C27 | `sorcier_renegat` | 720 | humain | §8.2 |
| C29 | `chimere` | 780 | créature | §8.1 (bête) |
| C30 | `ombre_quirrell` | 805 | être magique | §8.3 |

État dans `monsters.js` : les 4 entrées **existent** mais n'ont pas de
`imgSrc`. Pour chacune, le rendu actuel tombe sur le SVG inline de
catégorie via `getMonsterIconHtml()`.

---

## Critères communs

- Format final : **512×512 PNG RGBA** avec fond transparent (cf. les 19 PNG
  monstres existants dans `img/monsters/`).
- Style : peinture concept-art Harry Potter cohérente avec `IMG_STYLE.md §1-§9`.
- Sujet occupe ~80 % du cadre 1:1.
- Détourage alpha propre (rembg / birefnet-general en post).

## Pipeline d'intégration (côté Claude)

Pour chaque PNG livré :
1. `pip3 install --quiet rembg onnxruntime` si absent (premier run télécharge
   le modèle birefnet, ~400 MB).
2. `python3 tools/process_monster_png.py --src <upload.png> --id <monster_id>`
   → trim alpha bbox + recentrage 8 % + resize 512×512 + optimize.
3. Sortie : `img/monsters/<id>.png`.
4. Ajouter `imgSrc: "img/monsters/<id>.png"` dans l'entrée `monsters.js`
   (juste après `icon`).
5. Smoke test 34/34 attendu (scénario 5 data-driven sur tous les `imgSrc`).

Court-circuit possible : si Nano Banana livre une image avec fond déjà
transparent (rare), `process_monster_png.py --skip-rembg` accepté.

---

## Étapes

- [x] **0** Branche `claude/svg-c1-monsters-png` créée depuis master.
- [x] **1** Prompts archétypaux rédigés pour les 4 monstres (cf. message conv).
- [ ] **2a** mangemort_elite — image Nano Banana fournie.
- [ ] **2b** sorcier_renegat — image fournie.
- [ ] **2c** chimere — image fournie.
- [ ] **2d** ombre_quirrell — image fournie.
- [ ] **3** Pipeline batch (rembg birefnet + trim + recentrage + resize 512) → `img/monsters/`.
- [ ] **4** Ajouter `imgSrc` sur les 4 entrées dans `js/monsters.js`.
- [ ] **5** Smoke test 34/34 (scénario 5 valide la liste imgSrc).
- [ ] **6** Mise à jour `SVG_PLAN.md` : C26/C27/C29/C30 cochés + statut global
        (+ rétroactif C.4 portraits PNJ qui sont déjà livrés via plan NPC).
- [ ] **7** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Branche + prompts. En attente PNG. |
