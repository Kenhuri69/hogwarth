# Revue de la simulation de difficulté post-rework des stats

> **Branche** : `claude/difficulty-simulation-review-uEbsq`
> **Date** : 2026-06-01
> **Statut** : 🟢 CLOS — implémenté, vérifié (smoke 153 verts, sims exit 0).

## 0. Constat de la revue

Le rework des stats **D1–D5 est live en runtime** (commits `91dbb44` socle
D1–D4 + Fortune, `24cedfc` Célérité). Le simulateur `tools/sim-difficulty.js`
ne le modélise que **sous des flags opt-in** dont les interrupteurs maîtres sont
OFF par défaut → `node tools/sim-difficulty.js` (et `DIFFICULTY_REPORT.md`)
renvoient les chiffres d'un joueur **pré-rework et sous-alloué**.

| Mécanique runtime | Constante `data.js` | Sim par défaut |
|---|---|---|
| D1 INT→MAG 4:1 | `INT_MAG_DIV=4` | ❌ `--stat-rework` |
| D2 END→DEF 6:1 | `END_DEF_DIV=6` | ❌ idem |
| D3 résist. DoT | `END_DOT_RES_DIV=12` | ❌ idem |
| D4 pénétration STR | `STR_PEN_CAP/HALF` | ❌ idem |
| croissance +1/niv | `_grantLevelStats` | ❌ `--fair-baseline` |
| 3 pts/niveau | `STAT_POINTS_PER_LEVEL=3` | ❌ `--stat-points=0` |
| D5 Célérité | `CELERITE_MAX/HALF` | ❌ `--celerite-max=0` |
| D5 Fortune | `FORTUNE_*` | ❌ **absente** |

Parité vérifiée : quand on l'invoque fidèlement
(`--stat-rework --stat-points=3 --celerite-max=0.30 --celerite-half=45`), les
knobs du sim **correspondent exactement** aux constantes runtime. Seuls les
interrupteurs maîtres sont éteints.

## 1. Décisions (validées via AskUserQuestion, 2026-06-01)

3 chantiers retenus :
1. **Aligner le défaut du sim** sur le runtime + preset `--legacy`.
2. **Régénérer `DIFFICULTY_REPORT.md`** depuis le modèle fidèle.
3. **Modéliser Fortune** dans le(s) sim(s).

## 2. Étapes & vérifications

1. [x] **sim-difficulty — défauts alignés** : `statRework=true`,
   `fairBaseline=true`, `statPoints=3`, `celeriteMax=0.30`, `celeriteHalf=45`.
   Ajouter `--legacy` (restaure le modèle historique : tout OFF + statPoints=0).
   MAJ help + ligne « Paramètres » du rapport (afficher modèle rework/legacy).
   → vérif : `node tools/sim-difficulty.js 50` exit 0 ; `--legacy` reproduit
   les chiffres pré-rework ; défaut = chiffres « fidèles » de la revue.
2. [x] **Fortune** :
   - sim-difficulty : helper `fortuneCurve` + stat dérivée `c.fortune` (parité
     runtime) + note « win-rate-neutre ici (pas de fuite/butin simulés) → effet
     éco dans sim-economy ».
   - sim-economy : `--lck=N` (def = max LCK party = 15) → `fortune` →
     or ×(1+F×0.5) sur drops/coffres/fouille (miroir runtime). `--no-fortune`
     pour comparer. Header reporte F + bonus.
   → vérif : les deux sims exit 0 ; `--no-fortune` < défaut en or ; Fortune
     affichée cohérente avec la courbe (`0.31·x²/(x²+30²)`).
3. [x] **Régénérer `DIFFICULTY_REPORT.md`** depuis le défaut (désormais fidèle).
   Corriger la commande de l'en-tête. Conserver la structure, MAJ chiffres +
   verdict (mur, builds, dépendance systèmes endgame).
   → vérif : chiffres = sortie sim défaut ; commande de l'en-tête fonctionne.
4. [x] `node tests/smoke.js` vert (153 scénarios — aucun `js/` touché) +
   tous les sims exit 0 (défaut/legacy/compare/economy ±fortune).
5. [x] Commit + push sur la branche.

## 3. Hors-scope (assumé)

- Fortune n'altère pas le win-rate de sim-difficulty (pas de fuite/butin
  simulés) — modélisée pour parité/visibilité, vrai effet dans sim-economy.
- `--compare` reste un harnais legacy (baseline pré-balance) : construit ses
  propres configs, non concerné par le flip de défaut. Documenté, non retouché.
- Arbitrage d'équilibrage (mur solo, build offensif à la traîne) : signalé à
  l'utilisateur, pas d'action runtime dans cette revue.

## 4. Journal

- 2026-06-01 : revue + constat de dérive. Sim fidèle mesuré (drift défaut vs
  fidèle : +15 à +35 pts win-rate en mid-game). Plan créé, 3 chantiers validés.
- 2026-06-01 : implémentation des 3 chantiers.
  - sim-difficulty : défauts alignés runtime (statRework/fairBaseline/3 pts/
    Célérité 0.30) + `--legacy` + ligne « Paramètres » affichant le modèle.
    Fortune dérivée (`c.fortune`, parité, win-rate-neutre) + knobs
    `--fortune-asymptote/-half`.
  - sim-economy : Fortune sur l'or (drops/coffres/fouille ×(1+F×0.5)) via
    `--lck` (def 15) / `--no-fortune` ; reportée dans l'en-tête.
  - DIFFICULTY_REPORT.md régénéré (en-tête curé + 7 sections machine Normal
    n=800 + table d'impact rework−legacy : +20 à +27 pts dès l'étage 7).
  Smoke : 153 verts. Sims : exit 0 (défaut/legacy/compare/economy).
</content>
</invoke>
