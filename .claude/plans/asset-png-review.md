# Revue PNG — Monstres / PNJ / Joueurs / Items

Objectif : vérifier que chaque entité dispose de son/ses PNG pour tous ses
cas d'usage. Générer les manquants.

## Méthode
Cross-référence registres JS ↔ fichiers `img/` pour chaque catégorie et
chaque cas d'usage.

## Résultats de l'audit (2026-06-13)

### Items — ✅ COMPLET (148 items)
- Cas d'usage : icône d'inventaire/équipement (`getItemIconHtml`).
- Chaîne : SVG inline (21) > painterly `icons_new` (103) > legacy `icons/items` (133, alias partagés) > emoji.
- 0 item en fallback emoji pur. 0 chemin de registre cassé (new + legacy vérifiés).

### PNJ — ✅ COMPLET (36 PNJ)
- Cas 1 portrait de dialogue : 36/36 `portraitImg` déclarés, tous fichiers présents.
- Cas 2 sprite 3D couloir : 8 types génériques (`_npc_*`), tous présents.

### Joueurs — ✅ COMPLET (13 héros)
- Médaillon `img/<key>.png` : 13/13. Sprite plein corps `img/players/<key>.png` : 13/13, tous dans `PLAYER_SPRITE_SRC`.
- Note : `img/<key>-original.png` absent pour 5 héros canon (harry/hermione/draco/cho/cedric) — NON consommé au runtime (source d'archive), pas un manque fonctionnel.

### Monstres — ⚠️ 1 MANQUE (68 monstres réels)
- 67/68 ont `imgSrc` + PNG (`img/monsters/`), tous présents.
- **`reflet_mythe`** (boss-miroir epic, étage 21+) : pas d'`imgSrc`, pas de PNG.
  - Combat → fallback emoji 🪞. Bestiaire → SVG de catégorie.

## Action
- [x] Décision utilisateur : prompt Nano Banana fourni, l'utilisateur génère l'image.
- [x] Prompt rédigé → `.claude/plans/nano-banana-reflet-mythe.md`.
- [ ] (utilisateur) Générer l'image via Nano Banana et me la fournir.
- [ ] (moi) `process_monster_png.py --id reflet_mythe --model birefnet`.
- [ ] (moi) Ajouter `imgSrc: "img/monsters/reflet_mythe.png"` dans `js/monsters.js`.
- [ ] (moi) `node tests/smoke.js` + bump cache PWA (js/monsters.js modifié).
