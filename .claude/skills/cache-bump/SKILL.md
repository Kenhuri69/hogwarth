---
name: cache-bump
description: Garantit la mise à jour du cache client (PWA) du jeu Poudlard & Magie après TOUTE modification d'un CSS/JS servi (js/*.js, css/*.css) ou du shell PWA (sw.js, manifest.json, index.html). Bumpe les ?v=N dans index.html ET PRECACHE_URLS de sw.js, incrémente CACHE_VERSION, et vérifie via tools/check_cache_versions.js + tests/pwa-smoke.js. À dérouler systématiquement avant de committer/pousser un changement front, ou dès qu'on dit « le cache », « les joueurs ne voient pas la mise à jour », « bump version », « invalider le cache », « pourquoi ça ne se met pas à jour ». Le commit-guard l'invoque. Ne PAS utiliser pour des changements purement Node/tests/tools/docs (non servis au navigateur).
---

# Garde-fou cache PWA (bump de version obligatoire)

## Pourquoi
`sw.js` sert les CSS/JS en **Cache-First indexé par `?v=N`** (cf. CLAUDE.md
« PWA & cache offline »). Si on modifie un fichier **sans changer son `?v`**,
le Service Worker renvoie l'**ancien** cache à la même URL : les joueurs ne
voient JAMAIS la mise à jour. C'est un échec silencieux (le code est bon, le
déploiement réussit, mais rien ne change côté client).

## Quand l'appliquer
Dès qu'un fichier **servi au navigateur** change :
- `js/**.js`, `css/**.css` (assets cache-bustés) ;
- `sw.js` lui-même (logique du SW) ;
- `index.html` / `manifest.json` (shell — network-first, mais le bump des
  assets qu'ils référencent reste requis).

Inutile pour : `tests/**`, `tools/**`, `.claude/**`, `*.md`, scripts Python —
non servis au runtime navigateur.

## Procédure (déterministe)

1. **Lister les assets modifiés** vs la base :
   ```bash
   git diff --name-only origin/master...HEAD | grep -E '^(js|css)/.+\.(js|css)$'
   # ou, pour des changements non encore commités :
   git diff --name-only HEAD | grep -E '^(js|css)/.+\.(js|css)$'
   ```

2. **Pour CHAQUE asset modifié**, incrémenter son `?v=N` à **deux** endroits
   (la valeur doit rester identique des deux côtés) :
   - `index.html` : `<script src="js/foo.js?v=N">` / `<link href="css/foo.css?v=N">` ;
   - `sw.js` : l'entrée correspondante de `PRECACHE_URLS` (si l'asset y figure).

3. **Incrémenter `CACHE_VERSION`** dans `sw.js` (`hogwarth-vN` → `vN+1`).
   Un seul incrément suffit, quel que soit le nombre d'assets touchés.

4. **Si `sw.js` lui-même a changé** : incrémenter aussi le `?v` de l'URL
   d'enregistrement dans `js/pwa.js` (`const SW_URL = 'sw.js?v=N'`) — et, `pwa.js`
   ayant changé, bumper son propre `?v` (étape 2 s'applique à lui aussi).

5. **Vérifier** :
   ```bash
   node tools/check_cache_versions.js --base origin/master   # bump + cohérence
   node tools/pwa-smoke.js 2>/dev/null || node tests/pwa-smoke.js
   ```
   `check_cache_versions.js` échoue (exit 1) si un asset modifié n'est pas
   bumpé, si index.html et sw.js divergent, ou si CACHE_VERSION n'a pas bougé.

## Règle d'or
> Un asset front modifié **sans** `?v` bumpé + `CACHE_VERSION` incrémenté =
> mise à jour invisible côté joueur. Le bump fait partie du **même commit**
> que la modification de l'asset, jamais d'un commit séparé « oublié ».

## Référence
CLAUDE.md → « PWA & cache offline » → « Bumper la version » ;
`tools/check_cache_versions.js` (vérificateur) ; `tests/pwa-smoke.js`.
