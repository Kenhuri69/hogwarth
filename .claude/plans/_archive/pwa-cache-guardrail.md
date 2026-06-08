# Plan — Garde-fou de versionnement du cache PWA

Objectif : **garantir** que toute modif d'un CSS/JS servi entraîne le bump du
cache (sinon mise à jour invisible côté joueur — bug constaté avec #389/#390).

Couches (défense en profondeur) :

1. **Script déterministe** `tools/check_cache_versions.js`
   - Cohérence : `index.html` ↔ `PRECACHE_URLS` (sw.js) — même `?v` partout.
   - Bump (vs base/working) : tout asset `js|css` modifié doit voir son `?v`
     incrémenté (index + sw) + `CACHE_VERSION` changé. Exit 1 sinon.
   - Zéro dépendance. Validé : attrape une violation (exit 1), passe sinon (0).

2. **Skill `cache-bump`** (.claude/skills/cache-bump/SKILL.md)
   - Procédure d'auto-bump + vérification. Auto-trigger sur « le cache »,
     « les joueurs ne voient pas la maj », « bump version », commit front.

3. **Règle guidelines §8** (.claude/guidelines.md)
   - Rend le bump obligatoire dans le MÊME commit que l'asset.

4. **commit-guard** (étape 2bis) — rappelle le bump avant chaque commit front.

5. **CI** (.github/workflows/test.yml) — `fetch-depth:0` + étape qui lance le
   contrôle (bump vs base sur PR, cohérence sur push master). Bloquant.

6. **CLAUDE.md** « Bumper la version » — encadré pointant vers le garde-fou.

Correctif au passage : `js/pwa.js` avait été modifié en #391 (SW_URL) sans
bumper son `?v` → `js/pwa.js?v=2→3` (index + sw) + `CACHE_VERSION v61→v62`.

## Suivi
- [x] tools/check_cache_versions.js (validé : viol → exit 1, OK → 0)
- [x] skill cache-bump
- [x] guidelines §8
- [x] commit-guard étape 2bis
- [x] CI test.yml
- [x] CLAUDE.md encadré
- [x] correctif pwa.js?v + CACHE_VERSION
- [x] smoke 159 + units 67 + pwa-smoke verts
