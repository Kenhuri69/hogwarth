# Itération 3 — Portraits PNJ lore + correction Pomfresh

> Branche dédiée : `claude/npc-portraits-iter3`
> Statut : prompts préparés — en attente des PNG générés par l'utilisateur.
>
> Workflow Nano Banana à deux : l'utilisateur génère les images, les colle
> dans la conversation, Claude traite (rembg + crop + resize 256×256) puis
> intègre dans `img/npc/<id>.png` + ajoute `portraitImg` dans `js/npcs.js`.

---

## Cibles (5 PNG)

| PNJ | Fichier | État dans `npcs.js` | Type |
|-----|---------|---------------------|------|
| Pomfresh (re-gen) | `img/npc/pomfresh.png` | déjà présent (broche en croix → à remplacer) | humain |
| Sir Nicolas | `img/npc/sir_nicolas.png` | défini sans `portraitImg` (emoji 👻 fallback) | fantôme |
| Moine Gras | `img/npc/moine_gras.png` | défini sans `portraitImg` (emoji 🍷 fallback) | fantôme |
| Rusard | `img/npc/rusard.png` | défini sans `portraitImg` (emoji 🐈‍⬛ fallback) | humain |
| Trelawney | `img/npc/trelawney.png` | défini sans `portraitImg` (emoji 🔮 fallback) | humain |

---

## Critères communs

- Format final : **256×256 PNG RGBA** (alignement avec les 12 autres portraits PNJ).
- Style : peinture réaliste cohérente avec `IMG_STYLE.md §8.2 / §8.3`,
  head-and-shoulders, sujet occupant ~80 % du cadre 1:1.
- **Prompts archétypaux** (pas de mention canon HP par leur nom) pour
  contourner les filtres Nano Banana sur les « personnalités publiques ».
- Fond sombre ou flou — détourage rembg en post pour transparence finale.

---

## Pipeline d'intégration (côté Claude, à la réception)

Pour chaque PNG livré par l'utilisateur :
1. `rembg` ou `birefnet-general` pour détourage alpha (selon transparence native).
2. Trim bounding box alpha + recentrage 80 %.
3. `Image.thumbnail(256, 256)` puis padding 1:1 → écrit dans `img/npc/<id>.png`.
4. Ajouter `portraitImg: "img/npc/<id>.png"` dans l'entrée NPCS correspondante
   (juste après `icon`).
5. Smoke test : 34/34 attendu (aucun scénario ne dépend des PNJ lore visuels).

---

## Étapes

- [x] **0** Branche `claude/npc-portraits-iter3` créée depuis master.
- [x] **1** Prompts archétypaux rédigés pour les 5 PNJ (cf. message conversation).
- [ ] **2a** Pomfresh — image Nano Banana fournie par l'utilisateur.
- [ ] **2b** Sir Nicolas — image fournie.
- [ ] **2c** Moine Gras — image fournie.
- [ ] **2d** Rusard — image fournie.
- [ ] **2e** Trelawney — image fournie.
- [ ] **3** Pipeline batch : rembg + crop + resize 256×256 → `img/npc/`.
- [ ] **4** Ajouter `portraitImg` sur les 4 entrées lore dans `js/npcs.js`
        (Pomfresh a déjà le champ — pas d'édition npcs.js pour ce cas).
- [ ] **5** Smoke test 34/34.
- [ ] **6** Commit + push.
- [ ] **7** Mise à jour `.claude/plans/npc-integration.md` (cocher (a) et (b)
        dans le statut global) + journal d'itération.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Setup | Branche créée, prompts préparés. En attente PNG côté utilisateur. |
