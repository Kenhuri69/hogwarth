# Refonte image de garde + icône du jeu

But : remettre l'image de garde (`img/scenes/title.jpg`) et l'icône PWA à jour
avec le contenu histoire actuel (Clé de Voûte fendue, descente, Profondeurs /
Ruines runiques, Voldemort qui se ré-assemble, Boucle Ténébreuse, le Dormeur).

Workflow décidé : je fournis le PROMPT → l'utilisateur génère l'image → me la
renvoie → je l'intègre.

## Étapes

1. [x] Lire la trame (docs/histoire 01, 03) + direction artistique (IMG_STYLE.md)
   → vérif : éléments visuels clés identifiés.
2. [x] Vérifier l'usage de `title.jpg` (index.html `.castle-art`, height:auto →
   tout ratio OK ; reused dans psel-tile-aube + #title-screen bg) et le set
   d'icônes PWA (`img/icons/pwa/` : 192/512 + maskable + apple-touch-icon).
   → vérif : pas de contrainte de ratio dure ; carré établi pour l'icône.
3. [ ] Rédiger + livrer le prompt (key art portrait + variante carré icône).
   → vérif : prompt couvre les beats histoire, style maison.
4. [ ] (après réception image) Intégrer :
   - `title.jpg` : redimensionner/optimiser, remplacer.
   - Icône : crop carré + cadre doré façon icône actuelle, regénérer les 5 PNG
     (`tools/gen_pwa_icons.py` si possible) + `apple-touch-icon`.
   → vérif : visuels nets, lisibles en petit.
5. [ ] Bump cache PWA (skill `cache-bump`) : `title.jpg` n'a pas de `?v` (image,
     stale-while-revalidate) mais `index.html` la référence ; les icônes PWA et
     `manifest.json` peuvent nécessiter bump + `CACHE_VERSION`.
     → vérif : `node tools/check_cache_versions.js --base origin/master`.
6. [ ] Tests : `node tests/smoke.js` + `node tests/pwa-smoke.js`.
7. [ ] Commit + push sur `claude/game-splash-icon-d7lqz3`.

## Notes
- Image de garde affichée jusqu'à 600px de large, height auto, border-radius 10px.
  Un format PORTRAIT raconte mieux la « descente » (château en haut → abysses en bas).
- L'icône doit rester lisible à ~48px : silhouette de château forte, peu de détail.
