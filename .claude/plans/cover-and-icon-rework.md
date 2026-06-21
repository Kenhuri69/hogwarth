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
3. [x] Prompt livré (key art portrait + variante carré icône). Utilisateur a
   généré 2 images : portrait story art + carré château.
4. [x] Intégré :
   - `title.jpg` ← Image 1 (portrait 1024×1536, JPEG q82, 353 Ko).
   - Source icône dédiée `title_icon.jpg` ← Image 2 (carré 1024²) ; généré
     les 5 PNG via `tools/gen_pwa_icons.py` (SRC pointé vers title_icon.jpg,
     crop central remontant le château). Cadre doré + studs conservés.
5. [x] Bump cache PWA : icônes `?v=2`→`?v=3` (manifest×4, sw PRECACHE×2,
   apple-touch index.html) ; `CACHE_VERSION` v197→v198 (refresh title.jpg
   précachée) ; cascade sw.js → `SW_URL` v4→v5 (pwa.js) → pwa.js `?v` v4→v5
   (index.html + sw PRECACHE). `check_cache_versions.js` → exit 0.
6. [x] Tests : `node tests/pwa-smoke.js` (cache v198, 98 entrées, offline OK) +
   `node tests/smoke.js title hub start visual` (loader + hub verts).
7. [x] Commit + push, PR #635 rebasée + mergée (squash, `9af38a8`).

## Suivi — retrait du cadre doré de l'icône (2026-06-21)
La nouvelle source carrée se suffisant à elle-même, le cadre doré + studs
n'apportaient rien : retirés de `gen_pwa_icons.py` (helpers `draw_gold_frame`
/ `add_corner_studs` et constantes `GOLD_*` supprimés). Icône `any` désormais
bord-à-bord ; maskable conserve la safe-zone 80 % + fond étendu. 5 PNG
regénérés. Bump : icônes `?v=3`→`?v=4`, `CACHE_VERSION` v200→v201, cascade
`sw.js?v=6` + `pwa.js?v=6`. Branche `claude/icon-remove-frame`.

## Notes
- Image de garde affichée jusqu'à 600px de large, height auto, border-radius 10px.
  Un format PORTRAIT raconte mieux la « descente » (château en haut → abysses en bas).
- L'icône doit rester lisible à ~48px : silhouette de château forte, peu de détail.
