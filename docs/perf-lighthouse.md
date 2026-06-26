# Pass Lighthouse — première visite, cache vide (P3.4)

> RC polish 2026-06 · plan [`rc-polish-remaining.md`](../.claude/plans/_archive/rc-polish-remaining.md) §P3.4.
> Mesures **réelles** (Lighthouse 13.4.0 + Chromium Playwright, `--only-categories=performance`,
> throttling mobile par défaut, localhost, **cache vide**). Reproductible — voir « Protocole ».

## Résultat

Levier appliqué : **lazy-load des images hors-viewport initial** (l'écran titre est
seul visible au chargement ; les blasons de Maison ~1,5 Mo, les 16 portraits de
héros ~427 Ko et `death.jpg` 206 Ko n'étaient affichés que sur des écrans cachés
mais téléchargés *eagerly*, volant la bande passante à l'image LCP `title.jpg`).

| Métrique | Avant | Après | Δ |
|----------|-------|-------|---|
| Score performance | 59 | **69** | +10 |
| First Contentful Paint | 3,9 s | 3,9 s | = |
| **Largest Contentful Paint** | **29,7 s** | **6,1 s** | **−23,6 s** |
| Speed Index | 8,2 s | 3,9 s | −4,3 s |
| Time To Interactive | 30,3 s | 21,2 s | −9,1 s |
| Total Blocking Time | 30 ms | 10 ms | −20 ms |
| Cumulative Layout Shift | 0 | 0 | = |

La LCP — métrique critique de la première visite, cible explicite de la RC —
passe de 29,7 s à 6,1 s : `title.jpg` n'est plus en concurrence de bande
passante avec ~2,1 Mo d'images hors-écran. `fetchpriority="high"` sur
`title.jpg` la priorise davantage.

## Changements (1 PR, `index.html` + `sw.js`)

- `title.jpg` (LCP) : `fetchpriority="high" decoding="async"` (priorisée, décodage non bloquant).
- 4 blasons de Maison (écran de sélection) : `loading="lazy" decoding="async"`.
- 16 portraits de héros (écran player-select) : `loading="lazy" decoding="async"`.
- `death.jpg` (écran de mort) : `loading="lazy" decoding="async"`.
- `CACHE_VERSION` v208 → v209 (shell index.html modifié, précaché).

Aucun changement de logique JS/CSS. Le clone du blason dans le HUD
(`_updateHouseBadge`, `ui.js`) reste correct : l'écran de sélection a été
affiché (image chargée) avant que le HUD ne clone le `<img>`.

## Limite résiduelle assumée

Le TTI résiduel (~21 s simulé) est dominé par l'**évaluation des 85 modules JS
non-minifiés** (opportunités Lighthouse « Minify JavaScript » ~5,4 s, « Reduce
unused JavaScript » ~4 s). Les réduire imposerait un **build step de
minification**, ce que le projet **exclut par principe** (« zéro build step »,
cf. `CLAUDE.md`). Le `defer` des scripts a déjà été livré (P1.5). Aucune
micro-optim supplémentaire n'est applicable sans renier cette contrainte
d'architecture — hors-scope.

## Protocole de mesure (reproductible)

```bash
npm install --no-save lighthouse          # 13.x
export CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")
python3 -m http.server 8097 &
node node_modules/.bin/lighthouse http://localhost:8097/ \
  --only-categories=performance \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --output=json --output-path=/tmp/lh.json --quiet
```

> Les valeurs varient de quelques % entre runs (simulateur Lighthouse) ;
> l'ordre de grandeur de la chute LCP (−23 s) est stable et structurel.
</content>
</invoke>
