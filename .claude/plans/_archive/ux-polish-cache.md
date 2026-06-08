# Plan — Polish UX (#7, #8) + correctif cache PWA

L'utilisateur ne voyait pas les mises à jour des PRs #389/#390 : le Service
Worker sert les CSS/JS en **Cache-First par `?v=N`**, or ces PRs ont modifié les
fichiers **sans bumper leur `?v`** → même URL → ancien cache servi. Ce lot
corrige ça **et** ajoute le polish #7/#8. #9 (onboarding) = audit only.

## 0 — Correctif cache (PRIMAIRE)
Bumper `?v` (index.html **+** `PRECACHE_URLS` de sw.js) de tous les fichiers
modifiés depuis #389, plus ceux de ce lot, plus `CACHE_VERSION` et l'URL
`register('sw.js?v=N')`.

Fichiers à bumper :
- `css/style.css` 29 → 30 (modifié #389, #390, #391)
- `js/ui.js` 9 → 10 (#389)
- `js/quests.js` 8 → 9 (#389)
- `js/ui-character-sheet.js` 3 → 4 (#389)
- `js/ui-settings.js` 1 → 2 (#389)
- `js/battle-ui.js` 4 → 5 (#390)
- `CACHE_VERSION` hogwarth-v60 → v61 ; `register('sw.js?v=2' → 'v3')`

**Vérif** : `node tests/pwa-smoke.js` (précache rempli, offline OK) ; cohérence
index.html ↔ PRECACHE_URLS (script de diff).

## #7 — Contraste (texte secondaire)
`#8a7050` ≈ 4.0–4.3:1 (sous AA 4.5). `--label-muted #b09464` ≈ 6.5:1 existe
déjà pour ça. Room-status `#6a5030` ≈ 2.5:1 (échoue), texte persistant.

**Action** :
- CSS : `color: #8a7050` → `color: var(--label-muted)` (38 sites, texte uniquement).
- index.html inline : `#quest-tracker` (#8a7050) et `#room-status` (#6a5030)
  → `var(--label-muted)`.

**Vérif** : captures HUD/boutique — texte secondaire plus lisible, thème intact.

## #8 — Boutique aérée
Lignes denses. Aérer `.shop-item` (padding/gap) + prix en pastille bordée.

**Action** (css) : `.shop-item` padding 8→10/12→14, `.shop-grid` gap 6→8 ;
`.shop-price` → pastille (bord doré, fond sombre, radius).

**Vérif** : captures boutique desktop + mobile.

## #9 — Onboarding (audit only)
Tour = 15 étapes (1 tooltip/feature) **déjà** skippable (« Passer ») + opt-out
persistant (« Ne plus afficher »), tuto combat 1 étape. Conclusion : correct,
pas de changement requis. Documenté ici.

## Non-régression
- `node tests/smoke.js` + `node tests/units.js` + `node tests/pwa-smoke.js` verts.
- Captures avant/après.

## Suivi
- [x] #0 cache bump — style.css 30, ui.js 10, quests.js 9, ui-character-sheet.js 4,
      ui-settings.js 2, battle-ui.js 5 (index.html + PRECACHE_URLS) ;
      CACHE_VERSION v61 ; sw.js?v=3. Cohérence index↔precache vérifiée.
      pwa-smoke : cache "hogwarth-v61", 85 entrées, offline OK.
- [x] #7 contraste — 38 `color:#8a7050`→`var(--label-muted)` (CSS) +
      #quest-tracker / #room-status inline (index.html).
- [x] #8 boutique — `.shop-item` aéré + `.shop-price` en pastille bordée.
      Vérifié audit3-shop desktop+mobile.
- [x] #9 audit — onboarding déjà skippable + opt-out persistant, aucun
      changement (documenté ci-dessus).
- [x] tests verts (smoke 159 + units 67 + pwa) + captures audit3.
