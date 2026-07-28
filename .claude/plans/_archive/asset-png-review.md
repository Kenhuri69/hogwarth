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
- [x] Prompt rédigé → `.claude/prompts/nano-banana-reflet-mythe.md`.
- [x] (utilisateur) Image Nano Banana fournie (fond gris plat 1024²).
- [x] (moi) `process_monster_png.py --id reflet_mythe --model birefnet` → `img/monsters/reflet_mythe.png` (512² RGBA, alpha 72.6 % fond / 14.6 % sujet, 194 KB). Détourage propre, brume translucide préservée, pas de halo sur fond sombre.
- [x] (moi) `imgSrc: "img/monsters/reflet_mythe.png"` ajouté dans `js/monsters.js`.
- [x] (moi) Tests : units (442 ok), smoke MonsterImages (68/68 imgSrc RGBA), pwa-smoke OK. Cache bumpé (monsters.js v11→v12, CACHE_VERSION v106→v107).

## ✅ Clos — toutes catégories couvertes (2026-06-13).
