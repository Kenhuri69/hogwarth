# Plan — Moteur de génération d'icônes (gen_icons.py)

> Objectif : générer en pixel art les icônes UI du jeu (sac, carte, sorts, fiche, etc.)
> sur le même principe que `gen_textures.py`, pour remplacer les emoji des boutons d'action.

## Stack
- **Pillow** (PIL) uniquement — déjà utilisé par `gen_textures.py`, zéro nouvelle dépendance.
- Sortie : PNG 48×48 RGBA (transparence pour intégration UI).
- Style : pixel art net (pas d'AA), contours 1px sombres, ombres internes.

## Conventions visuelles
- Taille : **48×48** RGBA, fond transparent.
- Palette de base reprise de `gen_textures.py` (or, cuir, parchemin) + extensions.
- Marge minimum 2px sur chaque côté pour éviter de coller aux bords du bouton.
- Contour 1px sombre côté ombre (bas/droite typiquement).
- Highlight 1px clair côté lumière (haut/gauche typiquement).

## Étapes

### Étape 1 — Bootstrap + 3 icônes test ⏳
- [x] Créer `gen_icons.py` avec helpers (palette, blend, vary, putpx, draw_outline)
- [x] Générer 3 icônes (sac à dos, carte, livre de sorts) → `img/icons/`
- [ ] **Validation utilisateur** sur le style avant d'aller plus loin
- Vérification : ouvrir les PNG, confirmer le style pixel art, lisibilité à 48px.

### Étape 2 — Set complet (en attente validation étape 1)
Icônes à générer pour remplacer les emoji actuels :
| Bouton | Emoji | Icône cible |
|--------|-------|-------------|
| Sac | 🎒 | `backpack.png` |
| Sorts | 📖 | `spellbook.png` |
| Fiche | 📜 | `scroll.png` |
| Bestiaire | 📕 | `bestiary.png` |
| Quêtes | ✦ | `quest.png` |
| Fouiller | 🔍 | `search.png` |
| Repos | 💤 | `rest.png` |
| Sauver | 💾 | `save.png` |
| Charger | 📂 | `load.png` |
| Diff. | ⚙️ | `gear.png` |
| Musique | ♪ / 🔇 | `music_on.png` / `music_off.png` |
| Voix | 🗣️ / 🔕 | `voice_on.png` / `voice_off.png` |
| Map (bonus) | — | `map.png` |

### Étape 3 — Intégration dans le jeu
- Modifier `index.html` : remplacer les `<span class="btn-icon">🎒</span>` par
  `<img class="btn-icon" src="img/icons/backpack.png" alt="Sac">`.
- Ajuster `css/style.css` pour `.btn-icon img` (taille fixe, pas d'AA :
  `image-rendering: pixelated`).
- Vérifier le rendu mobile (touch targets 44px restent OK).

### Étape 4 — Validation
- Test navigateur headless : `node tests/smoke.js`.
- Vérifier qu'aucune régression UI n'apparaît.
- Si nouveau scénario (vérifier présence des `<img>`), l'ajouter au smoke test
  dans le même commit.

## Notes
- `gen_icons.py` reste idempotent et déterministe (seeds fixes).
- Lancer : `python3 gen_icons.py`.
- Les fichiers existants dans `img/icons/` sont overwritten.
