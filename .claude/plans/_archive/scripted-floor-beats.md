# Plan — Étages-scènes scénarisés (P5)

**Branche :** `claude/scripted-floor-beats-fsmcj5`
**Origine :** piste P5 (❓ optionnel) du plan
[`chapters-04-10-lieux-ambiance.md`](./chapters-04-10-lieux-ambiance.md) §C, points ❓
de [`docs/histoire/04-structure-actes-et-etages.md`](../../docs/histoire/04-structure-actes-et-etages.md) §4.4
et [`docs/histoire/10-lieux-et-geographie.md`](../../docs/histoire/10-lieux-et-geographie.md) §10.7.
**Nature :** changement **JS servi au navigateur** → bump cache PWA obligatoire (guidelines §8).

---

## Objectif

Épingler un **beat narratif écrit garanti** à la **première entrée** de certains
étages-clés, **sans casser la génération procédurale** autour. Le procédural
reste intact ; on pose un **point fixe textuel** par-dessus (aucune altération de
la carte, des cellules, du spawn).

## Arbitrages produit (tranchés le 2026-06-08)

| Question | Décision |
|----------|----------|
| (a) Quels étages reçoivent un beat fixe ? | **1, 4, 8** — Seuil familier (pédagogie), entrée des Cachots (1ʳᵉ transition), Seuil du Veilleur (graine des Ruines). On **n'ajoute pas** l'étage 10 (Voldemort, déjà scénarisé de fait) ni 11 (Gardien de la Boucle, dialogue dédié existant). |
| (b) Forme d'affichage | **Toast + narrative** — réutilise `setNarrative()` + `addMsg(..., 'narrative')` existants. **Pas de nouvelle modale.** |
| (c) Portée du one-shot | **Par partie / save** — Set `seenScriptedBeat` sérialisé. Le beat se joue une seule fois pour une partie, persiste après reload/chargement. |

---

## Conception technique

### Structure de données — `FLOOR_SCRIPTED_BEATS` (`js/floor-ambiance.js`)

Module d'accueil : `floor-ambiance.js` (déjà la maison de l'ambiance par étage,
chargé après `floor-themes.js`, déjà au MANIFEST). On y ajoute un dict + résolveur
**pur** et un orchestrateur **défensif**.

```js
const FLOOR_SCRIPTED_BEATS = {
  1: { id: 'seuil_familier', narrative: "…", toast: "…" },
  4: { id: 'entree_cachots', narrative: "…", toast: "…" },
  8: { id: 'seuil_veilleur', narrative: "…", toast: "…" },
};
```

- `narrative` : texte long affiché dans la boîte de narration (`setNarrative`).
- `toast` : ligne courte ajoutée au journal (`addMsg(..., 'narrative')`).
- Textes alignés sur les fiches `docs/histoire/10` §10.2 (étages 1/4/8) et §10.5
  (Seuil du Veilleur).

### Résolveur pur — `getScriptedFloorBeat(floor)`

```js
function getScriptedFloorBeat(floor) {
  return FLOOR_SCRIPTED_BEATS[floor] || null;
}
```

Pur, sans état → testable dans `tests/units.js`.

### Orchestrateur défensif — `maybeScriptedFloorBeat(floor)`

```js
function maybeScriptedFloorBeat(floor) {
  const beat = getScriptedFloorBeat(floor);
  if (!beat) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  if (seenScriptedBeat.has(floor)) return false;   // one-shot
  seenScriptedBeat.add(floor);
  if (typeof setNarrative === 'function') setNarrative(beat.narrative);
  if (typeof addMsg === 'function') addMsg('📜 ' + beat.toast, 'narrative');
  return true;
}
```

- **One-shot** : garde via `seenScriptedBeat.has(floor)` ; idempotent (2ᵉ appel → false).
- **Défensif** : no-op si l'état/les helpers manquent (file:// smoke, DOM absent).
- Référence `seenScriptedBeat`, `setNarrative`, `addMsg` via `typeof` → injectable
  en `vm` pour les tests unitaires.

### État — `seenScriptedBeat` (`js/state.js`)

```js
let seenScriptedBeat = new Set();   // étages dont le beat a déjà été joué (cette partie)
```

Réinitialisé dans `startGame()` (comme `visitedFloors`), sérialisé dans `save.js`.

### Points d'injection (chirurgicaux)

1. **`js/movement-floors.js` — `_changeFloor()` callback `onArrive`** : un appel
   `if (typeof maybeScriptedFloorBeat === 'function') maybeScriptedFloorBeat(currentFloor);`
   placé **après** `_announceFloorEvent()` (le beat scénarisé, plus important et
   one-shot, gagne la narration sur les floors concernés). Couvre l'entrée des
   étages 4 et 8 (et un éventuel re-passage par 1 en remontant — déjà vu → no-op).
2. **`js/main.js` — `startGame()`** : l'étage 1 n'est **pas** atteint via
   `_changeFloor` (généré direct au démarrage). Un appel `maybeScriptedFloorBeat(1)`
   en **fin** de `startGame()` (après `setNarrative(intro)`) joue le beat du Seuil
   familier. Reset de `seenScriptedBeat = new Set()` ajouté au bloc de reset.

### Sérialisation (`js/save.js`)

- `_serializeState` : `seenScriptedBeat: Array.from(seenScriptedBeat),`
- `_applyState` : `seenScriptedBeat = new Set(gs.seenScriptedBeat || []);`
  (fallback `[]` pour les saves antérieures → les beats des étages déjà passés
  ne se rejoueront pas si le joueur n'y retourne pas ; un re-passage rejouerait
  une fois le beat — comportement acceptable et borné à 1×).

### Garde-fous

- **N'altère jamais la carte** : aucune écriture sur `dungeon`/`enemyMap`/`itemMap`/
  cellules. Pur affichage textuel.
- **Défensif partout** : tous les call-sites sont `typeof … === 'function'`.
- **Procédural intact** : le beat est une surcouche ; la génération seedée reste
  la source de vérité de la carte.

---

## Enregistrements obligatoires

- **MANIFEST loader** (`js/loader.js`) : `FLOOR_SCRIPTED_BEATS` (obj),
  `getScriptedFloorBeat` (fn), `maybeScriptedFloorBeat` (fn) — source
  `floor-ambiance.js` ; `seenScriptedBeat` (obj) — source `state.js`.
- **Cache PWA** (skill `cache-bump`) : `floor-ambiance.js` modifié →
  bump `?v` dans `index.html` + `PRECACHE_URLS` de `sw.js` + `CACHE_VERSION`.
  Idem `movement-floors.js`, `main.js`, `state.js`, `save.js` modifiés.

---

## Étapes & vérifications

1. [x] Plan écrit (ce fichier). → vérif : arbitrages tranchés consignés.
2. [x] `floor-ambiance.js` : `FLOOR_SCRIPTED_BEATS` + `getScriptedFloorBeat` +
   `maybeScriptedFloorBeat`. → vérif : résolveur pur, orchestrateur défensif.
3. [x] `state.js` : `seenScriptedBeat`. `main.js` : reset + appel(1).
   `movement-floors.js` : appel dans `onArrive`. → vérif : étage 1 au démarrage,
   4/8 à l'entrée.
4. [x] `save.js` : sérialisation. → vérif : round-trip Set.
5. [x] `loader.js` MANIFEST : 4 entrées. → vérif : pas de bandeau rouge.
6. [x] Cache PWA bumpé (`cache-bump`). → vérif : `check_cache_versions.js` exit 0.
7. [x] `tests/units.js` : résolution pure (1/4/8 truthy, autres null) + idempotence
   one-shot (vm avec `seenScriptedBeat` injecté). → vérif : assertions vertes.
8. [x] `tests/smoke.js` : scénario `scenarioScriptedFloorBeats` (étage 1 au
   démarrage, idempotence, sérialisation). → vérif : scénario vert.
9. [x] Définition de terminé : `node tests/units.js`, `node tests/smoke.js`,
   `node tools/check_cache_versions.js --base origin/master`, `node tests/pwa-smoke.js`
   tous verts ; commit + push (retry backoff).

---

## Journal des écarts

### Implémentation (2026-06-08, branche claude/scripted-floor-beats-fsmcj5)

Livré conforme au plan, aucun écart de conception.

- **`floor-ambiance.js`** : `FLOOR_SCRIPTED_BEATS` (1/4/8) + `getScriptedFloorBeat`
  (pur) + `maybeScriptedFloorBeat` (one-shot défensif, préfixe toast `📜`).
- **`state.js`** : `let seenScriptedBeat = new Set();`.
- **`main.js`** : reset `seenScriptedBeat = new Set()` dans `startGame()` +
  appel `maybeScriptedFloorBeat(1)` après `setNarrative(intro)`.
- **`movement-floors.js`** : appel `maybeScriptedFloorBeat(currentFloor)` dans le
  callback `onArrive` de `_changeFloor`, après `_announceFloorEvent()`.
- **`save.js`** : `seenScriptedBeat` sérialisé (`Array.from`) + restauré
  (`new Set(gs.seenScriptedBeat || [])`).
- **`loader.js`** : 4 entrées MANIFEST (`FLOOR_SCRIPTED_BEATS`,
  `getScriptedFloorBeat`, `maybeScriptedFloorBeat`, `seenScriptedBeat`).
- **Cache PWA** : `CACHE_VERSION` → `hogwarth-v79` ; 6 assets bumpés
  (floor-ambiance 1→2, loader 29→30, main 16→17, movement-floors 6→7,
  save 26→27, state 22→23).
- **Tests** : `tests/units.js` section 6 (résolution pure + one-shot via vm) ;
  `tests/smoke.js` `scenarioScriptedFloorBeats` (démarrage, idempotence,
  round-trip sérialisation).

Décision de placement : les fonctions vivent dans `floor-ambiance.js` (déjà
maison de l'ambiance par étage, déjà au MANIFEST, et déjà porteur d'un helper
impur `_applyCorruptionAmbiance`). Le résolveur reste pur ; l'orchestrateur est
défensif via `typeof`, ce qui le rend testable en `vm` (Node).
