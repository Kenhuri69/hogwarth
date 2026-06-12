# Ergonomie combat — badges de buff/résistance en PNG (reliquat UX)

> Reliquat issu de `reliquats-backlog.md` §3 (continuation de
> `_archive/emoji-png-gaps.md` / `_archive/combat-emoji-badges.md`).
> But : éliminer les derniers **emoji** de la rangée de badges de statut
> en combat. Les statuts DoT/CC (burn/poison/gel/stun/fear/imperius/
> weaken/protego/regen) s'affichent déjà en **PNG** via
> `STATUS_ICON_REGISTRY`/`getStatusIconHtml`. Les **buffs de stat**
> (`buff_atk/def/agi/lck/mag`) et la **Résistance** (`resist_buff`)
> n'avaient pas d'entrée dans le registre → ils retombaient sur l'emoji
> (`s.icon`) dans `renderStatusBadgeItems` (battle-ui.js:73-75). Seule
> incohérence de lisibilité restante dans le HUD de combat.

## Décision
Mapper les 6 statuts buff/résistance vers des **PNG déjà présents** dans
`img/icons/` (aucun asset à générer) :

| Statut | PNG | Justification |
|--------|-----|---------------|
| `buff_atk` | `atk.png` | `BUFF_STAT_BY_ID.buff_atk = 'atk'` |
| `buff_def` | `def.png` | idem |
| `buff_agi` | `agi.png` | idem (fiche perso utilise déjà agi.png) |
| `buff_mag` | `mag.png` | idem |
| `buff_lck` | `xp.png` | convention luck du jeu (la fiche perso utilise déjà `xp.png` pour « Chance » et « Fortune ») |
| `resist_buff` | `resist.png` | bouclier bleu de déflexion (créé au Lot 3 de `combat-emoji-badges`), distinct de def/protego |

Portée chirurgicale : **un seul fichier de runtime** (`js/item-icons.js`,
ajout de 6 lignes au registre). `STATUS_DEFS` (battle.js) garde ses emoji
comme **fallback** (`getStatusIconHtml(...) || s.icon`) — pas touché.

## Étapes
- [x] 1. `js/item-icons.js` — 6 entrées dans `STATUS_ICON_REGISTRY`.
      → vérif : `getStatusIconHtml('buff_atk')` retourne un `<img src=atk.png>`.
- [x] 2. `tests/scenarios/combat.js` — `scenarioBuffBadgesPng` : applique
      `buff_atk` / `buff_lck` / `resist_buff`, assert que la `.status-pill`
      contient `<img>` (PNG) et **plus** l'emoji. Export ajouté.
      → vérif : scénario vert.
- [x] 3. Cache PWA : bump `js/item-icons.js?v=` (index.html + `PRECACHE_URLS`
      de sw.js) + `CACHE_VERSION`.
      → vérif : `node tools/check_cache_versions.js --base origin/master` OK.
- [x] 4. `node tests/smoke.js` (scénarios badges) vert + `node tests/pwa-smoke.js`.
- [x] 5. Commit + push branche `claude/ergonomics-improvement-plan-0lf7zq`.

> ✅ **Livré** — suite complète verte : 188 scénarios smoke
> (dont `scenarioBuffBadgesPng`) + 427 assertions units + pwa-smoke
> (cache `hogwarth-v103`, 93 entrées, offline OK).

## Hors-scope
- Génération d'un vrai `lck.png` (clover) : le jeu n'en a pas et utilise
  `xp.png` partout pour la chance — créer un asset serait un chantier
  distinct (« icônes de stat dédiées »), pas ce reliquat.
- Emoji du **texte** du Journal déjà couverts par `iconizeCombatLog`
  (Lots 2/3 de `combat-emoji-badges`, livrés).
