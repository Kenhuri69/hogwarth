# Plan — P3.3 : découpage propre de `data.js` / `monsters.js` / `npcs.js`

> RC polish 2026-06 · suite de [`rc-polish-remaining.md`](./rc-polish-remaining.md) §P3.3.
> **Statut : Lot A LIVRÉ (2026-06-21)** — `data.js` découpé. Lots B/C différés.
> Plan vivant (guidelines §5).
> Date : 2026-06-21.

---

## ✅ Journal d'exécution — Lot A (`data.js`)

Exécuté le 2026-06-21 sur branche `claude/p33-data-split-lot-a-zhz1f4` (depuis
`origin/master`). **Pur couper-coller**, zéro réécriture de logique, zéro
call-site métier touché.

Bornes réelles reconfirmées dans le code (les n° du §3 avaient légèrement
bougé) :

| Fichier | Lignes source coupées | Globals |
|---------|-----------------------|---------|
| `data.js` (socle, conservé) | 1–177 | `MAP_W/H`, `CELL`, `DIRECTIONS`, `RUNE_LABELS`, XP/stats, D1–D5 (Fortune/Célérité), `REQUIREMENT_*`, `SEARCH_*`/`REST_*`, `RESIST/WEAK_MULTIPLIER` |
| `data-characters.js` | 178–315 | `CHARACTERS` |
| `data-spells.js` | 316–1029 | `SPELLS`, `SPELL_META`, helpers sorts, `GRIMOIRE_PAGES`/`PAGE_FLOORS`/`ACT3_PAGES`/`ACT3_FLOORS`, `RIDDLES_LUMIERE`, `ARTIFACT_FORMS`, helpers corruption |
| `data-items.js` | 1030–1739 | `PREMIUM_MULT`, `premiumStat`, `ITEMS`, `POTION_RECIPES`, `SHOP_ITEMS`, `TENEBRES_SET`, `CHEST_RARITY_*`, `pickChestEquipment` |
| `data-world.js` | 1740–1828 | `LOCATIONS`, `NARRATIVES`, `OUTREMONDE_SOUVENIRS/COSMETICS` |

> Note vs §3 : `ARTIFACT_FORMS` (forward-ref des formes de sorts) reste **dans
> `data-spells.js`** ; le bloc Premium (`PREMIUM_MULT`/`premiumStat`) ouvre
> `data-items.js` juste avant `ITEMS` (forward-ref §2.3 respectée : helper
> `pickChestEquipment` **après** `ITEMS` + `CHEST_RARITY_*`).

Étapes (toutes cochées) :
- [x] 4 sous-fichiers créés par couper-coller ; `grep -c` = 1 par identifiant.
- [x] `index.html` : 4 `<script defer ?v=1>` insérés au bon rang, `data.js?v=63→64`.
- [x] `sw.js` : 4 URLs ajoutées à `PRECACHE_URLS`, `data.js?v=64`, `CACHE_VERSION` v209→v210.
- [x] `loader.js` MANIFEST : `source` corrigé (SPELLS/ITEMS/CHARACTERS/LOCATIONS/
      GRIMOIRE_PAGES/ACT3_PAGES/_activePageSet/RIDDLES_LUMIERE/POTION_RECIPES/
      TENEBRES_SET/OUTREMONDE_*).
- [x] `CLAUDE.md` « Structure des fichiers » : 4 entrées `data-*.js` ajoutées.
- [x] `tests/units.js` : chemins de chargement des fixtures recalés sur les
      nouveaux fichiers (assertions inchangées).

Vérif (les 6 étapes de `test.yml`, localement) — **toutes vertes** :
- `node tests/units.js` → 946 assertions ✅
- `node tests/smoke.js` → 263 scénarios ✅ (1ʳᵉ passe, aucun flaky)
- `node tests/pwa-smoke.js` → cache v210, 102 entrées, loader OK offline ✅
- `node tools/check_cache_versions.js --base origin/master` ✅
- `node tools/check_doc_modules.js` → 92 modules alignés ✅

**Lots B/C (`monsters.js`/`npcs.js`) : non lancés** (différés comme recommandé).

---

## 0. Décision / recommandation honnête

L'audit RC qualifie P3.3 de **risque > bénéfice « à froid »**. Cette analyse le
confirme **avec une nuance** :

- **`data.js` (1828 l.)** = **multi-concern réel** (constantes monde + équilibrage
  + CHARACTERS + SPELLS + ITEMS + lieux + souvenirs). Le découpage a une **vraie
  valeur** de lisibilité/navigation. **Cible recommandée n°1.**
- **`monsters.js` (2484 l.)** et **`npcs.js` (1859 l.)** = **mono-concern** : un
  unique registre `const ARRAY = [...]` append-only. Les découper **n'améliore
  pas la cohésion** (un seul sujet) et **coûte** : il faut passer d'un littéral à
  un `push()` réparti, ce qui **casse le modèle mental** des skills `add-monster`
  / `add-playable-character` et de `monsters.js` comme « seul fichier à modifier
  pour ajouter un ennemi » (cf. CLAUDE.md). **Valeur faible, recommandation :
  ne pas découper, sauf demande explicite.**

> **Reco de séquençage** : si on lance P3.3, faire **`data.js` d'abord et seul**
> (Lot A), évaluer le bénéfice ressenti, et **ne traiter `monsters.js`/`npcs.js`
> (Lots B/C) que si la gêne persiste**. Chaque lot = 1 PR indépendante.

---

## 1. Contraintes d'architecture (non négociables)

Ces invariants pilotent **tout** le découpage :

1. **Pas de modules ES, pas de bundler.** Tous les fichiers partagent le scope
   global via `<script defer>` **séquentiels** (`index.html`). Un fichier ne peut
   référencer (à l'évaluation) que des globals déclarés **avant** lui.
2. **`const`/`let` top-level = scope déclaratif global**, *pas* `window.X`. Donc :
   - déplacer une déclaration vers un autre `<script>` la garde visible des
     fichiers chargés après — **mais une double déclaration du même identifiant
     = erreur fatale**. Chaque global ne doit vivre que dans **un** sous-fichier.
   - un `const ARRAY = [...]` **ne peut pas** être « continué » dans un autre
     fichier. Pour répartir un registre, il faut soit `const ARRAY = []` puis
     `ARRAY.push(...)` dans les sous-fichiers, soit concaténer
     (`const ARRAY = [].concat(PART_A, PART_B)`).
3. **`<script defer>`** : l'ordre d'exécution = l'ordre du DOM (defer préserve
   l'ordre). Ajouter des sous-fichiers = insérer des `<script defer>` **au bon
   rang** (avant `data-icon-recipes.js`, qui « mirror » data.js).
4. **`loader.js` MANIFEST** vérifie ~55 globals par `typeof name`. Tout global
   qui **change de fichier source** doit voir son champ `source` mis à jour
   (sinon le rapport de chargement ment ; pas d'échec dur, mais dette de doc).
5. **`tools/check_doc_modules.js`** verrouille **CLAUDE.md « Structure des
   fichiers » ↔ ordre des `<script src>` d'`index.html`** (exit 1 sur dérive).
   Tout ajout/retrait de module = mise à jour de cette section **dans le même
   commit**.
6. **Cache PWA (guidelines §8)** : tout `js/*.js` nouveau/modifié ⇒ `?v=N` dans
   `index.html` **ET** `PRECACHE_URLS` de `sw.js` + `CACHE_VERSION` incrémenté.
   Un découpage = **bump massif** (plusieurs nouveaux fichiers + le fichier
   d'origine modifié/supprimé).

---

## 2. Relations vérifiées (état du code, 2026-06-21)

### 2.1 Ordre de chargement actuel
```
… icons.js → scene-icons.js → monsters.js → npcs.js → npcs-helpers.js
   → riddles.js → codex.js → data.js → data-icon-recipes.js → floor-themes.js …
```
**Constat majeur** : `monsters.js` et `npcs.js` chargent **AVANT** `data.js`.
Ils sont donc **autonomes** : aucune référence *code* à `CELL`/`SPELLS`/`ITEMS`
(seulement des mentions en **commentaires**). → leur découpage n'introduit aucune
contrainte d'ordre **externe** ; seulement la mécanique `push`/`concat` interne.

### 2.2 Surface de consommation
- Globals de `data.js` (`SPELLS`/`ITEMS`/`CHARACTERS`/`CELL`/`MAP_W`/…) consommés
  par **~42 fichiers** `js/`. **Aucun call-site ne change** si les globals gardent
  le **même nom** et restent **déclarés avant leurs consommateurs** (le bloc
  `data-*.js` doit rester groupé au même rang qu'actuellement `data.js`).
- MANIFEST loader concerné : `MONSTERS` (monsters.js), `NPCS` (npcs.js),
  `SPELLS`/`ITEMS`/`CHARACTERS`/`LOCATIONS`/`GRIMOIRE_PAGES`/`POTION_RECIPES`
  (data.js) → champ `source` à corriger selon le sous-fichier d'accueil.

### 2.3 Forward-refs internes de `data.js` (imposent l'ordre des sous-fichiers)
| Dérivé / consommateur | Dépend de | Implication d'ordre |
|------------------------|-----------|----------------------|
| `PAGE_FLOORS` = `GRIMOIRE_PAGES.map()` | `GRIMOIRE_PAGES` | même sous-fichier (spells/quêtes) |
| `ACT3_FLOORS` = `ACT3_PAGES.map()` | `ACT3_PAGES` | idem |
| `_normalizeSpells` / `SPELL_META` | `SPELLS` | spells groupés ensemble |
| `pickChestEquipment` | `ITEMS` + `CHEST_RARITY_*` | helper **après** ITEMS (sous-fichier items) |
| `REQUIREMENT_TROPHY_BY_THEME` | `REQUIREMENT_TROPHIES` | même sous-fichier (constantes) |

---

## 3. Schéma de découpage proposé

### Lot A — `data.js` → 5 sous-fichiers (recommandé)
Conserver le **nom `data.js`** pour le socle (minimise le diff MANIFEST/doc), et
extraire 4 blocs cohésifs **chargés juste après** :

| Nouveau fichier | Contenu (lignes actuelles) | Globals clés |
|-----------------|----------------------------|--------------|
| `data.js` (socle, **conservé**) | 1–180 | `MAP_W/H`, `CELL`, `DIRECTIONS`, `RUNE_LABELS`, constantes XP/stats/D1–D5/Fortune/Célérité, `REQUIREMENT_*`, `SEARCH_*`/`REST_*`, `RESIST/WEAK_MULTIPLIER` |
| `data-characters.js` | 181–315 | `CHARACTERS` |
| `data-spells.js` | 316–1014 | `SPELLS`, `SPELL_META`, helpers sorts (`spellCategory`, `getSpellById`, `resolveSpellForm`, …), `GRIMOIRE_PAGES`/`ACT3_PAGES`, `RIDDLES_LUMIERE`, `ARTIFACT_FORMS`, helpers corruption |
| `data-items.js` | 1015–1739 | premium helpers, `ITEMS`, `POTION_RECIPES`, `SHOP_ITEMS`, `TENEBRES_SET`, `CHEST_RARITY_*`, `pickChestEquipment` |
| `data-world.js` | 1740–1828 | `LOCATIONS`, `NARRATIVES`, `OUTREMONDE_SOUVENIRS/COSMETICS` |

**Ordre `index.html`** (remplace la ligne `data.js` unique, **avant**
`data-icon-recipes.js`) :
```
data.js → data-characters.js → data-spells.js → data-items.js → data-world.js
```
> Raison : le socle (constantes) en tête ; aucun consommateur externe ne se
> trouve entre ces 5 fichiers, donc l'ordre interne ne casse rien tant que les
> forward-refs §2.3 sont respectées (helpers chest **après** ITEMS, etc.).

### Lot B — `monsters.js` (optionnel, déconseillé)
Si demandé, **pattern `push`** pour préserver un registre unique `MONSTERS` :
- `monsters.js` (socle) : `const MONSTERS = [];` + TEMPLATE commenté + helpers.
- `monsters-floors-1-6.js` / `monsters-floors-7-10.js` / `monsters-bosses.js` :
  `MONSTERS.push( …entrées… );`
- **Impact skills** : `add-monster` et CLAUDE.md (« seul fichier à modifier »)
  doivent être réécrits pour pointer le bon sous-fichier par tranche.

### Lot C — `npcs.js` (optionnel, déconseillé)
Même pattern `push` (ex. `npcs-deterministic.js` / `npcs-random.js`), même
impact sur `add-playable-character`? non (héros = `data.js`/CHARACTERS) mais sur
toute doc citant `npcs.js`.

---

## 4. Matrice d'impact (par lot)

| Surface | Lot A (data) | Lot B (monsters) | Lot C (npcs) |
|---------|--------------|------------------|--------------|
| Nouveaux `<script defer>` dans `index.html` | +4 | +3 | +1/+2 |
| `sw.js` PRECACHE_URLS (`?v`) | +4 entrées, bump data.js | +3, bump | +1/2, bump |
| `CACHE_VERSION` | +1 (v210) | +1 | +1 |
| `loader.js` MANIFEST `source` | MAJ ~6 entrées | MAJ `MONSTERS` | MAJ `NPCS` |
| CLAUDE.md « Structure des fichiers » | réécrire bloc data | bloc monsters | bloc npcs |
| `check_doc_modules.js` | doit rester vert | idem | idem |
| Skills (`add-monster`/…) | — | **réécriture** | doc à vérifier |
| Call-sites métier (~42 fichiers) | **0** (noms inchangés) | 0 | 0 |
| `git blame`/historique | dilué sur ces gros fichiers (acceptable) | idem | idem |

---

## 5. Procédure d'exécution (Lot A, si lancé) + critères de vérif (§4)

1. Créer les 4 sous-fichiers, **couper-coller** les blocs depuis `data.js` (zéro
   réécriture logique) → vérif : `data.js` ne contient plus que 1–180.
2. Insérer les `<script defer src=…?v=1>` dans `index.html` au bon rang +
   bumper `data.js?v`. → vérif visuelle de l'ordre.
3. `sw.js` : ajouter les 4 URLs à `PRECACHE_URLS`, bumper `data.js?v`, bumper
   `CACHE_VERSION` → `hogwarts-v210`. → vérif : `node tools/check_cache_versions.js --base origin/master`.
4. `loader.js` : corriger `source` des globals déplacés. → vérif : `window.__loaderReport.missingCritical === 0` au smoke.
5. CLAUDE.md : mettre à jour « Structure des fichiers » (5 entrées data-*).
   → vérif : `node tools/check_doc_modules.js` (exit 0).
6. Suite complète : `node tests/units.js` + `node tests/smoke.js` (263) +
   `node tests/pwa-smoke.js`. → **critère de sortie : tout vert, zéro régression**
   (aucun call-site touché ⇒ comportement identique).

> **Test de non-régression fort** : le découpage est un **pur déplacement de
> déclarations**. Succès = les 263 scénarios passent **sans** modifier une seule
> assertion. Si un test casse, c'est un problème d'**ordre de chargement** (un
> global référencé avant sa déclaration) → corriger le rang du `<script>`.

---

## 6. Risques & mitigations

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Double déclaration d'un `const` (copié sans retirer de l'original) | Moyenne | Couper (pas copier) ; `grep -c 'const SPELLS'` global = 1 par identifiant. |
| Forward-ref cassée (helper avant ses données) | Moyenne | Respecter §2.3 ; un global référencé avant déclaration → `ReferenceError` visible au smoke. |
| Cache-bump incomplet → MAJ invisible joueur | Moyenne | Skill `cache-bump` + `check_cache_versions` (CI). |
| Dérive doc CLAUDE.md ↔ index.html | Moyenne | `check_doc_modules` (CI) bloque. |
| Skills `add-monster` périmées (Lot B) | Élevée si Lot B | Réécrire les skills **dans la même PR** que le découpage monsters. |
| Conflits de merge sur ces gros fichiers pendant le chantier | Faible | Lots courts, 1 PR chacun, mergés vite. |

---

## 7. Recommandation finale

- **Faire** : Lot A (`data.js`) — bénéfice réel, call-sites intacts, risque
  maîtrisé (pur déplacement, filet des 263 scénarios).
- **Différer/éviter** : Lots B/C (`monsters.js`/`npcs.js`) — mono-concern,
  bénéfice marginal, coût doc/skills réel. À ne lancer que si la navigation dans
  ces registres devient une gêne **mesurée**.
- **Ne rien faire reste défendable** : c'est la position de l'audit (« risque >
  bénéfice à froid »). Ce plan rend l'exécution **sûre et chiffrée** le jour où
  la décision est prise.
</content>
