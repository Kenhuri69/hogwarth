# Plan — Tileset & musique par tranche d'étages

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : non implémenté.
>
> **Source** : top-10 d'audit, point #4 — *« Tileset/musique par tranche d'étages (1-3 / 4-6 / 7+) »*.
> Choix utilisateur arbitrés (voir §1.3).

## 1. Contexte

### 1.1 État actuel — non aligné

| Système | Granularité actuelle | Paliers | Aligné ? |
|---------|----------------------|---------|----------|
| Murs (`renderer.js — getWallTextureType`) | 6 paliers fins | ≤2 / ≤4 / ≤6 / ≤8 / ≤14 / + | — |
| Sol (`renderer.js:288`) | 2 paliers | ≤2 / ≥3 (`stone` / `carpet`) | ❌ ignore les autres |
| Plafond (`renderer.js:321`) | 2 paliers | ≤4 / ≥5 (`beams` / `stone`) | ❌ ignore les autres |
| Musique ambiante (`audio-music.js — _zoneKeyForFloor`) | 5 paliers | ≤2 / ≤4 / ≤6 / ≤8 / ≥9 | — |
| Musique combat (`startCombatMusic`) | 1 seul sample | `combat_normal.ogg` | — |

**Conséquence concrète** : étage 5, le joueur voit `wood + carpet + stone` avec `ambient_dungeon` — composition non concertée, change d'un étage à l'autre sans logique narrative.

### 1.2 Assets latents (jamais référencés)

Présents dans le repo, jamais utilisés par le code :
- `img/textures/floor/cavern_floor.png`
- `img/textures/floor/rune_floor.png`
- `img/textures/ceiling/cavern_ceiling.png`
- `img/textures/ceiling/rune_ceiling.png`

(Les `rune_*` resteront en réserve pour 14+ — cf. décision §1.3.)

### 1.3 Décisions utilisateur

| Question | Réponse |
|----------|---------|
| Tier B (4-6) visuel | **Transition cachot** — `stone2 + carpet + stone` |
| `rune_*` assets | Gardés pour un futur palier 14+ (zone secrète/endgame) — pas câblés en V1 |
| Transition visuelle 3→4 et 6→7 | **V1** : fondu noir court (~600 ms) + toast narratif |
| Musique combat | **V1** : `combat_normal.ogg` < 10, `combat_late.ogg` ≥ 10, `combat_epic.ogg` override pour boss/créatures épiques |

## 2. Conception

### 2.1 Mapping des tranches (source unique de vérité)

Nouveau module `js/floor-themes.js` :

```js
const FLOOR_THEMES = {
  hogwarts:  { range: [1, 3],   wall: 'stone1',      floor: 'stone',        ceiling: 'beams',          ambient: 'intro',   label: "Couloirs de Poudlard" },
  dungeons:  { range: [4, 6],   wall: 'stone2',      floor: 'carpet',       ceiling: 'stone',          ambient: 'dungeon', label: "Cachots de Poudlard" },
  depths:    { range: [7, 13],  wall: 'cavern_wall', floor: 'cavern_floor', ceiling: 'cavern_ceiling', ambient: 'depths',  label: "Profondeurs Oubliées" }
  // V2 préparé (14+) :
  // ancient: { range: [14, null], wall: 'rune_wall', floor: 'rune_floor', ceiling: 'rune_ceiling', ambient: 'abyss', label: "Ruines Anciennes" }
};

function getFloorTheme(floor) {
  const f = (typeof floor === 'number' && floor > 0) ? floor : 1;
  for (const t of Object.values(FLOOR_THEMES)) {
    const [lo, hi] = t.range;
    if (f >= lo && (hi === null || f <= hi)) return t;
  }
  return FLOOR_THEMES.hogwarts;   // fallback safe (étages 14+ avant V2)
}
```

**Conséquence** : `renderer.js` et `audio-music.js` consomment la même source. Aucune dérive possible.

> Note : `_ZONE_SAMPLES` existant dans `audio-music.js` mappe déjà `intro/tension/dungeon/depths/abyss` → fichiers OGG. On garde le registre tel quel (5 entrées), `getFloorTheme().ambient` ne référence que 3 d'entre eux pour V1. `tension` et `abyss` restent disponibles pour V2 (variantes ou palier 14+) sans suppression d'asset.

### 2.2 Combat music — dispatch par contexte

```js
// audio-music.js — startCombatMusic(enemyGroup)
function _selectCombatSample(enemyGroup) {
  const isEpic = enemyGroup?.some(e => e.epic === true);
  if (isEpic)                  return 'audio/combat_epic.ogg';
  if (currentFloor >= 10)      return 'audio/combat_late.ogg';
  return 'audio/combat_normal.ogg';
}
```

**Flag `epic`** sur les monstres canon (`monsters.js`) — curation manuelle, pas de seuil `danger`. Liste V1 : `voldemort_revenu`, `voldemort_affaibli`, `bellatrix`, `quirrell_ombre`, `basilic_mineur`, `chimere_poudlard`, `nagini`, `detraqueur_gardien`. À valider/compléter à l'implémentation.

**Fallback procédural** : `combat_late.ogg` et `combat_epic.ogg` sont des **assets à produire** (hors-scope de l'implémentation code). Le code doit :
- Tenter le chargement de l'asset.
- Si l'asset est absent (404 ou erreur), retomber sur `combat_normal.ogg` (pas de silence, pas de crash).
- Pattern identique à `_loadZoneSample` existant (cf. `catch` ligne 49 de `audio-music.js`).

### 2.3 Transition de tranche (visuel + narratif)

Déclenchée sur changement de tranche uniquement, pas à chaque étage :

```js
// movement.js — après goDeeper() / goUp(), avant drawDungeon()
function _maybePlayTierTransition(prevFloor, nextFloor) {
  const prev = getFloorTheme(prevFloor);
  const next = getFloorTheme(nextFloor);
  if (prev === next) return;

  const overlay = safeEl('tier-transition-overlay');
  if (!overlay) return;
  overlay.textContent = next.label;
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 600);

  addMsg(`✨ ${next.label}`, 'narrative');
}
```

HTML (à ajouter à `index.html`, à côté de `#encounter-overlay`) :

```html
<div id="tier-transition-overlay" aria-hidden="true"></div>
```

CSS (`css/style.css`) :

```css
#tier-transition-overlay {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: #000;
  color: var(--gold);
  font-family: var(--font-narrative);
  font-size: 28px;
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  transition: opacity 300ms ease;
}
#tier-transition-overlay.active { opacity: 1; }
```

**Pattern** : fade-in 300 ms → hold visible (200 ms) → fade-out 300 ms. Total ~600 ms. Le `setTimeout` à 600 ms suffit (le `transition: 300ms` côté CSS gère in et out).

### 2.4 Différence entre tranches (récap visuel)

| Tranche | Étages | Murs | Sol | Plafond | Ambiance | Ton narratif |
|---------|--------|------|-----|---------|----------|--------------|
| **A** Couloirs de Poudlard | 1-3 | stone1 (clair, mortier visible) | stone (dalle froide) | beams (poutres bois) | `ambient_intro` | Familier, école |
| **B** Cachots de Poudlard | 4-6 | stone2 (sombre, érodé) | carpet (tapis rouge râpé) | stone (voûte de pierre) | `ambient_dungeon` | Descente, austère |
| **C** Profondeurs Oubliées | 7-13 | cavern_wall (roche brute) | cavern_floor (sol caverneux) | cavern_ceiling (plafond rocheux) | `ambient_depths` | Inconnu, abyssal |

## 3. Contraintes

| # | Contrainte |
|---|-----------|
| C1 | `node tests/smoke.js` vert avant push. |
| C2 | Cohérence : si on touche le mapping d'une tranche, **toutes les couches changent** simultanément (mur + sol + plafond + ambiant). Pas de dérive possible vu la SoT. |
| C3 | Fallback procédural préservé pour la musique (le code retombe sur les samples manquants → `combat_normal` / synthèse). Aucun nouvel asset ne doit être un prérequis bloquant. |
| C4 | `getFloorTheme` doit traiter `floor` invalide (NaN, undefined, 0, négatif) en retournant `hogwarts` (jamais throw). |
| C5 | Transition de tranche ne **double-déclenche pas** si on remonte/redescend sur la frontière (3↔4 ou 6↔7) : le `prev === next` check via référence d'objet sur `FLOOR_THEMES` rend le compare trivial. |
| C6 | Loader manifest : ajouter `FLOOR_THEMES` (kind `obj`) et `getFloorTheme` (kind `fn`). |
| C7 | Migration save legacy : `floor-themes.js` est pur (pas d'état). Aucun champ à migrer. |
| C8 | Performance : pas de scan de `FLOOR_THEMES` par frame — `getFloorTheme(currentFloor)` est appelé à chaque `drawDungeon` (60 Hz) ; coût = boucle de 3 éléments → négligeable. Si on veut grappiller : cacher le résultat dans une variable module-level invalidée par `goDeeper/goUp`. **Hors-scope V1**. |

## 4. Découpage en étapes

### Étape 1 — Module SoT
- [ ] Créer `js/floor-themes.js` avec `FLOOR_THEMES` + `getFloorTheme`.
- [ ] L'ajouter dans `index.html` **avant** `renderer.js` et `audio-music.js` (juste après `data.js`).
- [ ] `loader.js` : ajouter `{name:'FLOOR_THEMES', source:'floor-themes.js', kind:'obj'}` et `{name:'getFloorTheme', source:'floor-themes.js', kind:'fn'}` au MANIFEST.
- [ ] Mettre à jour la liste des 31 → 32 modules dans `CLAUDE.md` (section « Structure des fichiers » et « Ordre de chargement »).
- **Vérif** : `node tests/smoke.js` → `__loaderReport.ok === true`, pas de bandeau rouge.

### Étape 2 — Rendu : consommer la SoT
- [ ] `renderer.js — getWallTextureType` :
  ```js
  function getWallTextureType(x, y, depth) {
    const VALID = ['stone1', 'stone2', 'cavern_wall', 'rune_wall', 'wood', 'tapestry'];
    const theme = getFloorTheme(currentFloor);
    let key = theme.wall;
    // (garde-fou de chargement existant inchangé)
    if (window.TEXTURES?.walls) {
      const img = window.TEXTURES.walls[key];
      if (!img || !img.complete || !img.naturalWidth) {
        key = VALID.find(k => {
          const i = window.TEXTURES.walls[k];
          return i && i.complete && i.naturalWidth > 0;
        }) || key;
      }
    }
    return key;
  }
  ```
- [ ] `renderer.js:288` (sol trapèze) — remplacer `const _floorKey = (currentFloor >= 3) ? 'carpet' : 'stone';` par `const _floorKey = getFloorTheme(currentFloor).floor;`.
- [ ] `renderer.js:321` (plafond trapèze) — remplacer la condition par `const _ceilKey = getFloorTheme(currentFloor).ceiling;`.
- **Vérif** : ouvrir le jeu, naviguer étage 1 → 2 → 3 (Tier A), 4 → 5 → 6 (Tier B), 7 → 8 (Tier C) ; les 3 couches doivent changer ensemble aux frontières.

### Étape 3 — Audio ambiant : consommer la SoT
- [ ] `audio-music.js — _zoneKeyForFloor(f)` : remplacer le `if/else` par `return getFloorTheme(f).ambient;`.
- [ ] Vérifier que `_ZONE_SAMPLES` contient toujours `intro / dungeon / depths` (ce sont les 3 utilisés par V1). `tension` et `abyss` restent dans le registre mais ne sont plus tirés par V1 — c'est OK, pas de nettoyage requis (réserve V2).
- **Vérif** : entrer étage 1 (intro), 4 (dungeon), 7 (depths) → le sample correct est chargé via `_loadZoneSample`. Le crossfade est géré par le code existant.

### Étape 4 — Musique combat : variantes
- [ ] `audio-music.js` : ajouter `_selectCombatSample(enemyGroup)` (cf. §2.2).
- [ ] `startCombatMusic` : utiliser `_selectCombatSample(enemyGroup)` au lieu de la constante `combat_normal.ogg` hardcodée.
- [ ] Le fallback en cas de 404 doit pointer vers `combat_normal.ogg` (sample garanti présent). Réutiliser le pattern `_loadZoneSample` (catch + fallback).
- [ ] `monsters.js` : ajouter `epic: true` sur les entrées canon-boss :
  - `voldemort_revenu` (étage 10+)
  - `voldemort_affaibli` (étage 8+)
  - `bellatrix` (étage 8+)
  - `quirrell_ombre` (étage 6+)
  - `basilic_mineur` (étage 6+)
  - `chimere_poudlard` (étage 6+)
  - `nagini` (étage 6+)
  - `detraqueur_gardien` (étage 5+)
  - (à vérifier à l'implémentation contre la liste réelle des IDs)
- **Vérif** : combat étage 3 → `combat_normal.ogg`. Combat étage 11 contre monstre non-épique → `combat_late.ogg`. Combat contre Voldemort à n'importe quel étage → `combat_epic.ogg`.

### Étape 5 — Transition visuelle entre tranches
- [ ] `index.html` : ajouter `<div id="tier-transition-overlay" aria-hidden="true"></div>` au niveau body (en frère de `#encounter-overlay`).
- [ ] `css/style.css` : ajouter les styles §2.3.
- [ ] `movement.js — goDeeper / goUp` : à la fin (après `currentFloor` mis à jour, avant `drawDungeon`), appeler `_maybePlayTierTransition(prevFloor, currentFloor)`.
- [ ] Implémenter `_maybePlayTierTransition` dans `movement.js` (cf. §2.3).
- **Vérif** : descendre étage 3 → 4 doit afficher « ✨ Cachots de Poudlard » dans le log et un fondu noir 600 ms. Descendre 4 → 5 ne doit RIEN faire visuellement (même tranche).

### Étape 6 — Smoke test
- [ ] Nouveau scénario `scenarioFloorTheming` dans `tests/smoke.js` :
  ```js
  async function scenarioFloorTheming() {
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

    // T1 : 3 thèmes corrects par étage
    const themes = await page.evaluate(() => {
      return [1, 3, 4, 6, 7, 13, 14].map(f => {
        const t = getFloorTheme(f);
        return { f, label: t.label, wall: t.wall, floor: t.floor, ceiling: t.ceiling, ambient: t.ambient };
      });
    });
    assert(themes[0].label.includes('Couloirs'), `Étage 1 = ${themes[0].label}`);
    assert(themes[1].label.includes('Couloirs'), `Étage 3 = ${themes[1].label}`);
    assert(themes[2].label.includes('Cachots'),  `Étage 4 = ${themes[2].label}`);
    assert(themes[3].label.includes('Cachots'),  `Étage 6 = ${themes[3].label}`);
    assert(themes[4].label.includes('Profondeurs'), `Étage 7 = ${themes[4].label}`);
    assert(themes[5].label.includes('Profondeurs'), `Étage 13 = ${themes[5].label}`);
    // Étage 14 : fallback hogwarts (V1, avant ajout ancient)
    assert(themes[6].label.includes('Couloirs'), `Étage 14 fallback = ${themes[6].label}`);

    // T2 : combat sample selection
    const combatSamples = await page.evaluate(() => {
      const r = (group, floor) => {
        currentFloor = floor;
        return AudioSystem._selectCombatSample(group);
      };
      return {
        early:  r([{ id: 'cornichon_cornouailles', epic: false }], 3),
        late:   r([{ id: 'mangemort_elite',        epic: false }], 11),
        epic:   r([{ id: 'voldemort_revenu',       epic: true  }], 10)
      };
    });
    assert(combatSamples.early.endsWith('combat_normal.ogg'), `Combat early = ${combatSamples.early}`);
    assert(combatSamples.late.endsWith('combat_late.ogg'),   `Combat late  = ${combatSamples.late}`);
    assert(combatSamples.epic.endsWith('combat_epic.ogg'),   `Combat epic  = ${combatSamples.epic}`);

    // T3 : transition triggers across boundaries
    const transitions = await page.evaluate(() => {
      const before = document.getElementById('tier-transition-overlay').classList.contains('active');
      _maybePlayTierTransition(3, 4);
      const after = document.getElementById('tier-transition-overlay').classList.contains('active');
      _maybePlayTierTransition(4, 5);   // pas de changement de tranche
      const stillSame = document.getElementById('tier-transition-overlay').classList.contains('active');
      return { before, after, stillSame };
    });
    assert(transitions.before === false, 'Overlay initial actif ?');
    assert(transitions.after  === true,  'Transition 3→4 pas déclenchée');
    // stillSame reste true parce que le 1er setTimeout n'a pas encore expiré dans ce sync — c'est OK.

    if (errors.length) throw new Error(`${errors.length} erreurs JS`);
    console.log('  ✅ Floor theming conforme');
    await browser.close();
  }
  ```
- Ajouter à `scenarios = [..., scenarioFloorTheming]`.
- **Vérif** : `node tests/smoke.js` vert.

### Étape 7 — Documentation
- [ ] `CLAUDE.md` :
  - Section « Structure des fichiers » : ajouter `floor-themes.js` à la liste.
  - Section « Rendu 3D » : remplacer le tableau des textures par un renvoi à `FLOOR_THEMES`.
  - Section « Système audio » : pareil pour la musique ambiante.
  - Nouvelle section « Thèmes par tranche » avec le tableau §2.4.

### Étape 8 — Commit & push
- [ ] Commit : `feat(theming): tileset + musique par tranche d'étages`.
- [ ] Push sur la branche actuelle, vérifier état PR.

## 5. Ce qui ne change pas

- `floor-themes.js` est **pur** (lookup, pas d'état). Pas de sérialisation, pas de migration save.
- `_ZONE_SAMPLES` reste intact (5 entrées) — V1 n'utilise que 3, V2 utilisera les 2 restants.
- Les samples manquants (`combat_late.ogg`, `combat_epic.ogg`) déclenchent le fallback `combat_normal.ogg` — pas de régression si les assets ne sont pas produits le jour de l'implémentation.
- Le cycle de combat, l'IA ennemie, l'équipement, la sauvegarde : aucun impact.

## 6. Hors-scope (V2 potentielles)

- Tier D (14+) « Ruines Anciennes » avec les assets `rune_*` déjà présents.
- Crossfade audio plus sophistiqué entre tranches (actuellement : stop + start).
- Transition visuelle plus riche : texture défilante, particules.
- Production effective des samples `combat_late.ogg` et `combat_epic.ogg` (production audio, pas code).
- Variation de palette de torche / fog selon la tranche (cavernes plus froides, profondeurs plus rouges).
- Markers de cellules spéciales (coffres / boutiques) avec un style adapté à la tranche.

## 7. Estimation

| Étape | Durée |
|------:|-------|
| 1. Module SoT + loader | 20 min |
| 2. Rendu (3 layers) | 15 min |
| 3. Audio ambiant | 10 min |
| 4. Combat music + flag `epic` | 25 min |
| 5. Transition visuelle (HTML + CSS + hooks) | 30 min |
| 6. Smoke test | 30 min |
| 7. Doc CLAUDE.md | 15 min |
| 8. Commit/push | 5 min |
| **Total** | **~2h30** |

Pas de blocage attendu — la majorité du code existe et il suffit de remplacer 3 branchements `if/else` par un appel à `getFloorTheme()`. La complexité réelle est dans la **transition visuelle** (qui demande coordonner HTML + CSS + hook movement) et la **production des 2 samples audio** (hors scope du code, livrable parallèle).
