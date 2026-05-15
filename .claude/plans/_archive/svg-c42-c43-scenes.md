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
- [x] **2** Prompts archétypaux rédigés (titre + mort, 3 itérations pour C43).
- [x] **3** PNG Nano Banana fournis (×2).
- [x] **4** Pipeline JPEG q88 progressive optimize → `img/scenes/title.jpg` (182 KB) + `img/scenes/death.jpg` (205 KB).
- [x] **5** Remplacement dans `index.html` :
    - `<svg width="600" height="280"...>...</svg>` (150 lignes, ~8.7 KB markup) → `<img src="img/scenes/title.jpg" alt="Château de Poudlard nocturne">`
    - `<svg class="death-seal"...>...</svg>` → `<img class="death-art" src="img/scenes/death.jpg" alt="Couloir pétrifié de Poudlard">`
- [x] **6** CSS adapté : `.castle-art svg, .castle-art img { ... border-radius: 10px; }`. Nouvelle règle `.death-art`. Anims orphelines supprimées (`.title-win-warm/.title-win-cold/.title-moon/.title-twinkle` et leurs keyframes).
- [x] **7** Smoke test 34/34 vert. Vérifié `grep -rE` : aucune référence orpheline aux classes supprimées.
- [x] **8** `SVG_PLAN.md` mis à jour : C42 + C43 ✓, statut 45 → 47/86, journal #36.
- [ ] **9** Commit + push.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Choix utilisateur tranché (option « remplace les SVG »). Mini-plan créé. |
| 2026-05-12 | Prompts | C42 château nocturne livré du premier coup. C43 morbidité bloquée par filtres Gemini : v1 « collapsed body » refusée → v2 « petrified statue » (canon HP : pétrification est réversible via mandragore) → v3 plan B « still life sans figure » (baguette tombée, lunettes rondes brisées, écharpe Gryffondor, livre, œil du Basilic dans la flaque) — acceptée. |
| 2026-05-12 | Pipeline | Pas de rembg (illustrations pleines RGB). PIL convert RGB JPEG q88 progressive optimize. 2 fichiers ~1.5 MB chacun → 182 KB + 205 KB. Total 387 KB pour les 2 écrans, acceptable au boot. |
| 2026-05-12 | Intégration | Bloc SVG château 150 lignes (lignes 30-179 d'`index.html`) remplacé par `<img>` via script Python (Edit pas pratique sur 150 lignes). Bloc SVG death-seal 8 lignes remplacé pareillement. CSS : règle `.castle-art svg` étendue à `img` avec border-radius 10px. Supprimé : `.title-win-warm/.title-win-cold/.title-moon/.title-twinkle` et leurs keyframes (orphelines après suppression du SVG inline). Vérifié zéro référence ailleurs. |
| 2026-05-12 | Nouvelle règle | `.death-art { width: min(72vw, 320px); height: auto; display: block; border-radius: 12px; border: 2px solid rgba(224, 64, 64, 0.4); box-shadow: 0 0 36px rgba(120, 20, 20, 0.7); }` — taille raisonnable au-dessus du titre « ✝ Pétrification ✝ », bordure et glow rouge pour cohérence avec le ton de l'écran. |
| 2026-05-12 | QA | `node tests/smoke.js` → 34/34 vert (scénario 1 démarrage charge bien le titre, donc l'`<img>` est valide). Rendu visuel non automatisé pour ces écrans-là — l'utilisateur valide directement via l'URL de prod GitHub Pages après merge. |
