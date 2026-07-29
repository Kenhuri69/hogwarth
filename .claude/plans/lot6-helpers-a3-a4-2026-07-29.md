# Lot 6 — A3 / A4 : helpers `activeParty` & transport REST multijoueur

**Branche :** `claude/premier-plan-finaliser-ocbn0z` (repartie de `master` après
le merge de la PR #744)
**Statut :** ✅ clos — **PR #745 mergée** (CI verte, job en 4 min 23 s)
**Source :** `revue-sources-contenu-2026-07-28.md` §2 A3 et A4 (rang 11).
Lot 6 après les lots 1 (A2·C3·C4), 2 (A1·P1), 3 (E1), 4 (E4) et 5 (P2).

---

## 1. Constat, re-mesuré

**A3** — `party.slice(...)` apparaît **84 fois** dans `js/`, dont **70 fois**
sous la forme littérale exacte `party.slice(0, partySize)`, répartie sur 23
modules (`battle.js` 17, `battle-spells.js` 15, `movement-interactions.js` 8,
`inventory.js` 6, `movement.js` 6…). Sept de ces sites enchaînent
`.filter(c => c.hp > 0)`. Aucun helper n'existe.

**A4** — le bloc « fetch → 404 → `!res.ok` → `json()` → `_mpNoteSuccess` →
`catch _mpNoteFailure` » est recopié **10 fois** (SELECT) et le bloc POST/PATCH
avec `Content-Type` + `Prefer` **9 fois**, sur `multiplayer.js` /
`-social.js` / `-visits.js`.

Vérification décisive pour A4 : dans **tous** les sites, la valeur retournée en
cas de 404 est **la même** qu'en cas d'erreur réseau (`[]` pour les Verrous,
`null` partout ailleurs). Un helper qui renvoie `null` en cas d'échec — quelle
qu'en soit la cause — suffit donc, chaque appelant mappant `null` vers sa propre
valeur d'échec. Sans cette vérification, il aurait fallu un canal de retour plus
riche : c'est la mesure qui rend le helper simple, pas l'inverse.

## 2. Décision de conception

### A3 — migration complète, pas « opportuniste »

La revue recommandait une **migration progressive** au fil des passages, au
motif que « le risque d'un sed sur 70 sites dépasse le bénéfice » (§2 A3).
**Ce motif ne tient plus** : il supposait qu'on ne pouvait pas vérifier le
résultat, or le lot 5 vient de rendre la suite complète exécutable en 22 min.
Une migration partielle laisserait deux idiomes cohabiter — le pire des deux
mondes, un helper qui n'est pas la source de vérité.

Décision : **migrer les 70 sites littéraux**, et seulement eux. Les 14 autres
`party.slice(0, n)` / `(0, size)` gardent leur variable locale — les toucher
demanderait de raisonner sur chaque contexte, c'est un autre travail.

Le remplacement est **sémantiquement neutre** : `activeParty()` retourne
`party.slice(0, partySize)`, un nouveau tableau, comme aujourd'hui. Le repli
défensif (`partySize` absent → `party.length`) reproduit le comportement
existant : `slice(0, undefined)` renvoie déjà le tableau entier.

### A4 — deux helpers, sites migrés seulement s'ils entrent exactement

`_mpSelectRows(url, onMissing)` et `_mpWrite(url, method, body, opts)` dans
`multiplayer.js` (socle commun). Un site dont la forme diffère (post-traitement
inséré au milieu du bloc, politique 404 ≠ politique erreur) **n'est pas migré**
de force : mieux vaut deux sites hors helper qu'un helper à cinq options.

## 3. Étapes

1. [x] Plan écrit (ce fichier).
2. [x] `activeParty()` / `livingParty()` dans `inventory-core.js` + MANIFEST
   loader → **vérifier** : `units.js` couvre les deux (dont le repli
   `partySize` absent).
3. [x] Migration des 70 sites littéraux + 7 sites `.filter(hp > 0)` →
   **vérifier** : `grep -c 'party\.slice(0, partySize)'` = 0, ESLint 0 erreur.
4. [x] `_mpSelectRows` / `_mpWrite` dans `multiplayer.js` + migration des sites
   qui entrent exactement → **vérifier** : les scénarios `multiplayer` (stubs
   REST offline) restent verts.
5. [x] Suite smoke **complète** → **285/285 verts en 22 min 16 s**. Réserve de
   méthode : le CSS du lot 7 a été édité pendant cette exécution, donc les
   derniers scénarios ont chargé un `index.html` déjà modifié. Elle ne remplace
   pas la CI de la PR, qui a tourné sur un arbre figé.
6. [x] Doc : `CLAUDE.md` (helpers) + revue §2 A3/A4 marquée traitée.
7. [x] Cache-bump : 23 assets JS + `CACHE_VERSION` v271, `check_cache_versions.js` ✅.
8. [x] Commit → push → **PR #745**, CI verte, **mergée** (nouvelle PR : la #744 était mergée, §6).

## 4. Garde-fous

- **Neutralité sémantique** : aucun comportement de jeu ne change. Un helper
  qui change un retour, même « en mieux », sort du périmètre de ce lot.
- **Pas d'abstraction spéculative** (guidelines §2) : les helpers créés sont
  tous consommés dans le même commit. Un helper sans call-site n'est pas livré.
- **Cache PWA (§8)** : des `js/**` servis changent → bump obligatoire.

## 5. Écarts constatés en cours de route

- **8 sites de plus que prévu pour A3.** Au-delà des 70 littéraux, huit sites
  réécrivaient la variante *défensive* (`const n = (typeof partySize ===
  'number') ? partySize : party.length; party.slice(0, n)`) — c'est-à-dire
  exactement le corps de `activeParty()`, ligne de repli comprise. Les laisser
  aurait gardé la duplication la plus verbeuse des deux. Migrés.
- **Deux sites `party.slice(0, n)` NON migrés** (`balance-log.js`,
  `multiplayer.js` §snapshot de duel) : leur repli vaut `1`, pas `party.length`.
  Le helper y changerait le comportement quand `partySize` est absent. Laissés
  tels quels — un helper qui ne colle pas au site n'est pas un helper.
- **A4 : 2 écritures laissées hors helper.** L'upsert de présence et la gravure
  de message utilisent `Prefer: resolution=merge-duplicates,return=minimal`
  (upsert PostgREST), un 3ᵉ mode. L'ajouter au helper aurait demandé un
  paramètre `prefer` libre — soit exactement l'« abstraction à cinq options »
  que le §2 refuse. Idem pour le PATCH de réclamation de cadeau, dont la
  politique d'erreur est *silence + retry plus tard* : le helper appellerait
  `_mpNoteFailure` et ferait avancer le disjoncteur, ce qui serait un
  changement de comportement.
- **Un site migré change un octet sur le fil** : `mpClaimSeal` n'envoyait aucun
  en-tête `Prefer` ; le helper en pose un (`return=minimal`), qui est le défaut
  de PostgREST pour un PATCH. Signalé en commentaire au site plutôt que passé
  sous silence.

## 6. Mesures

### 6.1 A3 — `activeParty()` / `livingParty()`

| | avant | après |
|---|---|---|
| `party.slice(0, partySize)` littéral | 70 | **0** (verrou dans `units.js`) |
| variante défensive (3 lignes) | 8 | **0** |
| appels de helper | 0 | 70 `activeParty()` + 11 `livingParty()` |

17 assertions neuves dans `units.js`, dont les cas dégradés (`partySize`
absent → groupe entier, `party` absent/null → `[]`, membre `null` toléré) et un
**verrou anti-retour** : le test échoue si un futur commit réintroduit
l'idiome à la main.

### 6.2 A4 — transport REST

| module | lignes ajoutées / retirées |
|---|---|
| `multiplayer.js` (socle : les 2 helpers) | +56 / −5 |
| `multiplayer-visits.js` | +35 / −120 |
| `multiplayer-social.js` | +7 / −22 |

**−49 lignes nettes**, et surtout : 9 recopies du bloc « fetch → 404 → ok →
json → note » remplacées par 2 définitions.
