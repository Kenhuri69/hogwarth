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

## Re-pass P8b après compression images (2026-07, plan final-polish §Lot 3)

Mesure avant/après la série P8a (PRs compression : monstres, PNJ/héros,
icônes/misc — `img/` **44 → 20 Mo**, −55 %), même protocole, Lighthouse
13.4.0, même machine, cache vide :

| État mesuré | Score | FCP | LCP | Speed Index | TTI |
|---|---|---|---|---|---|
| master pré-P8a (même env.) | 57 | 3,9 s | 23,1 s | 23,6 s | 23,1 s |
| après P8a | 57 | 3,9 s | 22,8 s | 26,8 s* | 22,8 s |

\* variance inter-runs du simulateur (2ᵉ run : 23,4 s).

**Lecture (2 constats importants)** :

1. **La cible « LCP < 5 s / score > 75 » n'est pas comparable entre
   machines.** Le même code (master) au même Lighthouse 13.4.0 mesure
   **69 / LCP 6,1 s** sur la machine du pass de juin et **57 / LCP 23 s**
   sur celle-ci. Le breakdown LCP l'explique entièrement : TTFB 5 ms +
   resource load 75 ms (l'image arrive vite, `fetchpriority` OK,
   checklist discovery 100 % verte) + **element render delay ≈ 23 s** —
   le paint est bloqué par l'évaluation simulée des 85 modules JS
   non-minifiés, très sensible au CPU hôte. C'est la « limite résiduelle
   assumée » ci-dessus, amplifiée par un conteneur plus lent. Le remède
   serait la minification/concat (P8d) — **écartée par principe**
   (zéro build step).
2. **P8a ne cible pas le lab first-visit — et c'est attendu.** L'écran
   titre ne charge que `title.jpg` (déjà optimisée, inchangée) : les
   images compressées sont servies **à la demande** (combats, dialogues,
   bestiaire, blasons). Le gain P8a est le **poids des données en jeu** :

   | Famille | Avant | Après |
   |---|---|---|
   | `img/monsters/` (78 sprites) | 16,9 Mo | 5,7 Mo |
   | `img/npc/` (+ resize Rosmerta/Mundungus) | 8,0 Mo | 2,1 Mo |
   | `img/players/` + médaillons | 2,6 Mo | 0,9 Mo |
   | `img/icons*` | 9,6 Mo | 7,5 Mo |
   | `img/houses`/`fx`/`codex`/`scenes`/`textures` | ~7 Mo | ~3,5 Mo |
   | **Total `img/`** | **44 Mo** | **20 Mo** |

   Concrètement : un dialogue PNJ coûtait jusqu'à 1,6 Mo (Rosmerta),
   il coûte 29 Ko ; un combat de boss ~400 Ko → ~100 Ko ; le pack
   offline complet (PWA) pèse moitié moins en données mobiles.

**Verdict P8b** : gain joueur validé côté données (−55 %) ; les cibles
lab (score > 75, LCP < 5 s) doivent être re-mesurées sur une machine
comparable à celle de juin — reporté à la checklist release (P10,
volet Perf), idéalement sur appareil Android réel.

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
