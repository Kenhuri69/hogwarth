# 6ᵉ boss original élémentaire — Le Héraut de l'Aube (lumière)

## Contexte
La collection de boss originaux élémentaires couvrait givre (Spectre de Givre),
foudre (Héraut de l'Orage) et ténèbres (Héraut des Ténèbres). **La lumière
manquait.** Ce boss la complète et apporte une identité mécanique inédite.

## Design
- **Famille « Héraut »** (cf. Orage / Ténèbres), catégorie `être magique`.
- **Élément lumière**, caster (atk 12 < 1,5×mag 27 → PAS une brute, pas de Broyer).
- **Placement** : `minFloor: 9`, `weight: 1`, epic → réel 9+ ET recycle en Boucle
  au réel 19+ (`effectiveFloor(19)=9`). Comble l'intervalle foudre(7)/ténèbres(10).
- **Identité unique** (vs les autres élémentaires) :
  - **auto-soin** radiant (`heal`, power 22) → fight d'attrition, pas burst pur ;
  - **aveuglement** (`stun` 1 tour) ;
  - **SEUL boss qui `resist:["lumière"]` et `weak:["ténèbres"]`** → premier et
    unique levier qui valorise les sorts sombres (Sanguini/Vampyrus/Morsmordre/
    Nox Vorax/Maledictus). Symétrie inversée des nombreux monstres `weak:lumière`.
- **Stats** alignées sur la famille : hp 148 / atk 12 / def 11 / mag 27 / agi 13 /
  lck 12, scale 0.35. Phase à 40 % PV (`magMult 1.3`).
- **Sprite** : pas d'`imgSrc` (pas de source d'image dispo ; rembg/Nano Banana
  indisponibles dans l'env web). Repli = SVG de catégorie « être magique »
  (combat → emoji ☀️). PNG dédié branchable plus tard via
  `tools/process_monster_png.py` (chemin cible `img/monsters/heraut_aube.png`).

## Étapes
1. [x] Entrée `heraut_aube` dans `js/monsters.js` (après `heraut_foudre`).
   → vérif : `node --check` OK, `id` unique.
2. [x] Pas d'`imgSrc` (test `visuals.js` exige un PNG réel pour tout `imgSrc`).
   → vérif : `node tests/smoke.js visuals` vert.
3. [x] `resist:["lumière"]`/`weak:["ténèbres"]` (clés élémentaires valides).
   → vérif : `node tests/smoke.js spells` (validation clés legacy) vert.
4. [x] Doc CLAUDE.md : compte 72→73 + ligne table boss élémentaires.
5. [x] Bump cache PWA : `monsters.js` v18→v19 (index.html + sw.js) +
   `CACHE_VERSION` v150→v151.
   → vérif : `node tools/check_cache_versions.js --base origin/master` OK.
6. [x] Non-régression : `node tests/smoke.js` complet → **224/224 ✅**.
7. [x] Commit + push branche + PR.

## Hors-scope
- Sprite PNG painterly (à générer ultérieurement quand une source d'image est
  disponible) — le fallback emoji/SVG est fonctionnel entre-temps.
- Drop d'item lumière dédié : réutilise la table de butin endgame de la famille.

## Statut
- **Livré.** smoke 224/224 ✅ · check_cache_versions ✅. Sprite PNG = suivi optionnel.
