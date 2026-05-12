# SVG_PLAN bloc C.5 — Scènes grand format (titre + mort)

> Branche : poursuite sur `claude/svg-c1-monsters-png` (PR groupée en fin de bloc C).
> Cibles : C42 illustration écran-titre, C43 illustration écran de mort.
> Choix utilisateur : **illustration centrale qui remplace les SVG actuels**
> (le château SVG dans `.castle-art` et le sceau pentagrammatique dans `.death-seal`).
> Le reste du contenu (titre, sous-titre, "cliquer pour commencer", boutons) reste tel quel.

---

## Cibles

| Code | Élément à remplacer | Markup | Format actuel |
|------|---------------------|--------|---------------|
| C42 | Château SVG dans `#title-screen .castle-art` | `<svg width="600" height="280">` inline (`index.html:31-178`) | ~2.14:1 paysage |
| C43 | Sceau pentagrammatique dans `#death-screen` | `<svg class="death-seal" viewBox="0 0 130 130">` inline (`index.html:735-742`) | 1:1 carré |

---

## Critères communs

- Format de sortie : **PNG 1024×1024** (sortie native Nano Banana), placé dans
  `img/scenes/`. Pas de transparence requise (illustrations pleines avec
  composition lumière/ombre intégrée).
- Style : peinture concept-art Harry Potter cohérente avec `IMG_STYLE.md`.
- Pas de texte intégré dans l'image (les titres restent en HTML/CSS par-dessus
  ou autour).
- Cadrage : composition centrée pour s'intégrer dans la mise en page.

---

## Étapes

- [x] **0** Poursuite sur la branche actuelle.
- [x] **1** Audit du markup actuel (`castle-art` SVG + `death-seal` SVG).
- [ ] **2** Prompts archétypaux rédigés (titre + mort).
- [ ] **3** PNG Nano Banana fournis (×2).
- [ ] **4** Pipeline simple (resize si nécessaire + optimize) → `img/scenes/title.png` + `img/scenes/death.png`.
- [ ] **5** Remplacement dans `index.html` :
    - `<svg width="600" height="280"...>...</svg>` → `<img src="img/scenes/title.png" alt="Château de Poudlard">`
    - `<svg class="death-seal"...>...</svg>` → `<img class="death-art" src="img/scenes/death.png" alt="Pétrification">`
- [ ] **6** CSS d'ajustement (taille, max-width, ombrage, animation glow conservée).
- [ ] **7** Smoke test 34/34.
- [ ] **8** `SVG_PLAN.md` : C42 + C43 ✓ + statut global + journal.
- [ ] **9** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Choix utilisateur tranché (option « remplace les SVG »). Mini-plan créé. |
