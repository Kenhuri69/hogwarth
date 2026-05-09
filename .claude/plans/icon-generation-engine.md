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

### Étape 1 — Bootstrap + 3 icônes test ✅
- [x] Créer `gen_icons.py` avec helpers (palette, blend, vary, putpx, draw_outline)
- [x] Générer 3 icônes (sac à dos, carte, livre de sorts) → `img/icons/`
- [x] **Validation utilisateur** sur le style — OK 2026-05-09
- Vérification : ouvrir les PNG, confirmer le style pixel art, lisibilité à 48px.

### Étape 2 — Set complet ⏳ (généré, en attente validation)
Icônes à générer pour remplacer les emoji actuels :
| Bouton | Emoji | Icône cible | Statut |
|--------|-------|-------------|--------|
| Sac | 🎒 | `backpack.png` | ✅ |
| Sorts | 📖 | `spellbook.png` | ✅ |
| Fiche | 📜 | `scroll.png` | ✅ |
| Bestiaire | 📕 | `bestiary.png` | ✅ |
| Quêtes | ✦ | `quest.png` | ✅ |
| Fouiller | 🔍 | `search.png` | ✅ |
| Repos | 💤 | `rest.png` | ✅ |
| Sauver | 💾 | `save.png` | ✅ (tas de sable perfectible) |
| Charger | 📂 | `load.png` | ✅ (un peu chargé) |
| Diff. | ⚙️ | `gear.png` | ✅ (dents approximatives) |
| Musique | ♪ / 🔇 | `music_on.png` / `music_off.png` | ✅ |
| Voix | 🗣️ / 🔕 | `voice_on.png` / `voice_off.png` | ✅ |
| Map (bonus) | — | `map.png` | ✅ |

### Étape 3 — Intégration dans le jeu ✅
- [x] `index.html` : `<span class="btn-icon">EMOJI</span>` → `<span class="btn-icon"><img src="img/icons/X.png" alt="…"></span>`
  (13 boutons : sac, sorts, fiche, bestiaire, quêtes, fouiller, repos, music, voice, sauver, charger, diff, map mobile)
- [x] `js/audio.js` : `toggleMute`/`toggleVoice` swappent désormais l'`<img>` au lieu du `textContent`
- [x] `css/style.css` : `.cmd-btn .btn-icon img { 24px × 24px; image-rendering: pixelated }`
  (downscale 2× propre depuis source 48×48)
- [x] Captures de validation : `img/icons/_ingame_bar.png` (desktop), `img/icons/_ingame_mobile.png`

### Étape 4 — Validation ✅
- [x] Scénario 17 ajouté à `tests/smoke.js` : présence DOM + chargement PNG + toggle music/voice
- [x] `node tests/smoke.js` : tous les 17 scénarios passent, pas de régression
- [x] Vérification visuelle desktop + mobile

## Notes
- `gen_icons.py` reste idempotent et déterministe (seeds fixes).
- Lancer : `python3 gen_icons.py`.
- Les fichiers existants dans `img/icons/` sont overwritten.

---

# Plan — Fix portrait après chargement de slot

> Bug constaté 2026-05-09 par l'utilisateur : charger un slot depuis le hub démarrage
> affiche toujours le portrait de Harry, même quand la save porte un autre héros
> (Céleste, Iris, Maxence…).

## Cause
- `<img class="party-portrait-img" src="img/harry.png">` est codé en dur dans `index.html:348`.
- `_updateCharBar()` (`js/ui.js:109`) met à jour name / class / hp / sp mais **pas** le portrait.
- Le portrait n'est mis à jour que dans `_hydrateCharacter()` (`js/main.js:140`), appelé uniquement par le flux nouvelle partie.
- `_applyState()` mute bien `player.imgSrc` mais aucun code ne propage la valeur sur le DOM lors d'un load.

## Étapes
- [x] Étape 1 — Patcher `_updateCharBar(idx)` pour synchroniser `.party-portrait-img` (`src` + `alt`) à partir de `c.imgSrc` / `c.name`. → vérifier : tous les flux qui rafraîchissent l'UI (`updateUI`) propagent désormais l'icône. Pas d'effet de bord sur la nouvelle partie (idempotent : valeur déjà bonne).
- [x] Étape 2 — Étendre le scénario 16 (hub démarrage) pour sauvegarder en jouant Céleste, recharger le slot, et asserter que `#char-card-0 .party-portrait-img` finit par `celeste.png`. → vérifier : `node tests/smoke.js` 17 scénarios passent.
- [x] Étape 3 — Commit + push sur `claude/icon-generation-engine-LjO0J`.
