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
- [x] **2a** mangemort_elite — PNG 1024×1024 RGBA déjà détouré (α0=59%).
- [x] **2b** sorcier_renegat — PNG 1024×1024 RGBA déjà détouré (α0=65%).
- [x] **2c** chimere — PNG 1024×1024 RGBA déjà détouré (α0=48%).
- [x] **2d** ombre_quirrell — JPG 784×1168 fond sombre → rembg birefnet.
- [x] **3** Pipeline (rembg birefnet pour Quirrell uniquement + trim+recentrage 8%+resize 512+optimize ad-hoc pour les 3 autres) → `img/monsters/`.
- [x] **4** `imgSrc` ajouté sur les 4 entrées dans `js/monsters.js`.
- [x] **5** Smoke test 34/34 vert.
- [x] **6** `SVG_PLAN.md` mis à jour (C26/C27/C29/C30 ✓ + C.4 rétroactif + statut 36→44/76 + journal #34).
- [ ] **7** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Branche + prompts. En attente PNG. |
| 2026-05-12 | Réception PNG | 4 images livrées par l'utilisateur. 3 sur 4 déjà avec alpha cutout (α_min=0 dans le canal RGBA), 1 en JPG (Quirrell, fond sombre dégradé). Inspection : PIL `Image.split()[-1].getextrema()`. |
| 2026-05-12 | Pipeline | rembg+onnxruntime installés (`pip install rembg[cpu] onnxruntime`). Modèle BiRefNet-general-epoch_244.onnx téléchargé (973 MB) au premier appel. Pipeline ad-hoc inline pour les 3 PNG pré-cut (skip rembg pour éviter d'amplifier les artefacts comme l'avertit le script). Pipeline complet `process_monster_png.py` sur Quirrell uniquement. |
| 2026-05-12 | QA | mangemort_elite 296 KB occ 77×84%. sorcier_renegat 240 KB occ 79×84%. chimere 396 KB occ 82×84%. ombre_quirrell 117 KB occ 60×84% (α255=8.6%, sous le seuil §9 de 10% mais cohérent avec un fantôme à corps translucide — critère non bloquant). Tous 512×512 RGBA. |
| 2026-05-12 | Intégration | `imgSrc` câblé entre `icon` et `category` sur les 4 entrées dans `js/monsters.js`. Smoke 34/34 vert (scénario 5 data-driven vérifie tous les `imgSrc` + color-type RGBA). |
