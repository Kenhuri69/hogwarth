# Plan d'améliorations — Vague A (Fondations)

> Branche : `claude/code-analysis-improvements-32AvX`
> Niveau de risque : **modéré** — refactor ciblé, tests smoke à chaque étape.
> Format : un commit par item, plan mis à jour au fil de l'eau.

## Contexte

L'analyse code a identifié 4 vrais axes de fondations (les items #6 "tests insuffisants"
et #9 "edge cases ring/fontaine" du rapport initial étaient des faux positifs — la
couverture smoke est en réalité de 30+ scénarios et les guards existent déjà).

Cette vague A se concentre sur la **résilience du scope global** et l'**hygiène
des références d'état**, qui sont les vraies fragilités structurelles du projet.

## Items

### A1 — Loader / validation des globals au démarrage

**Problème vérifié.** Le projet charge ~30 fichiers JS via `<script>` séquentiels.
Chaque fichier ajoute ses fonctions/objets au scope global. Si l'un d'entre eux
plante au parse (typo, erreur runtime au top-level), les suivants chargent quand
même et le bug devient invisible : les `if (window.UX)` ou `typeof X === 'function'`
silencieusement court-circuitent l'appel.

**Comptage actuel** (recensé par grep) :
- `window.UX` : 11 occurrences dans `battle.js` et `battle-spells.js`
- `if (window.X)` ou `typeof X === 'function'` patterns : ~20 occurrences

**Fix proposé.** Créer `js/loader.js` chargé en **dernier** dans `index.html` qui :
1. Vérifie la présence des globals attendus (fonctions critiques + objets de données).
2. Log un `console.warn` clair listant ce qui manque.
3. Affiche un bandeau d'erreur visible dans le DOM si un module critique est absent
   (au lieu d'un jeu silencieusement cassé).

**Liste minimum à valider** (déduite des imports inter-fichiers) :
- Fonctions : `updateUI`, `startBattle`, `endBattle`, `castSpellInBattle`,
  `move`, `recalculateStats`, `equipItem`, `useItem`, `saveGame`, `loadGame`,
  `drawDungeon`, `openCharacter`, `openInventory`, `openShop`, `openBestiary`,
  `checkKillQuests`, `checkHouseLevelUp`.
- Objets : `AudioSystem`, `MONSTERS`, `SPELLS`, `ITEMS`, `CHARACTERS`,
  `LOCATIONS`, `TEXTURES`, `UX` (optionnel mais préviendrait les `window.UX`
  silencieux), `HOUSE_BONUSES`, `DIFFICULTY_SETTINGS`.

**Critère de vérification :**
- ✅ Chargement normal → aucun warning loader.
- ✅ Test : renommer temporairement `updateUI` dans `ui.js` → loader affiche
  l'erreur dans la console au démarrage.
- ✅ `node tests/smoke.js` passe.

**Effort estimé :** S (1 fichier ~80 lignes + ajout dans index.html).
**Risque :** faible — additif, n'altère aucun code existant.

---

### A2 — Protection player/player2 contre la réassignation

**Problème vérifié.** Dans `js/state.js:150,171` : `let player = {...}`. Une
réassignation `player = newObj` casserait l'invariant `party[0] === player`
documenté en `CLAUDE.md`. Le seul endroit qui touche correctement à player est
`save.js` via `Object.assign(player, ...)`.

**Options évaluées :**

| Option | Pour | Contre |
|--------|------|--------|
| `const player` au lieu de `let` | Simple, native, throw à la réassign | `let` est utilisé par tradition, casse rien d'autre |
| `Object.defineProperty(window, 'player', {set: throw})` | Verrou strict | Complexifie, `player` n'est pas explicitement sur `window` (déclaré `let` au scope du script global) |
| Lint-only (commentaire) | Zéro runtime | Pas de garantie |

**Choix proposé : `const player` / `const player2` / `const party`.**

C'est minimal, idiomatique, et catch l'erreur au plus tôt. Vérifier d'abord que
le code ne réassigne réellement *jamais* ces variables.

**Audit à faire :**
```bash
grep -n "^[[:space:]]*player[[:space:]]*=" js/*.js
grep -n "^[[:space:]]*player2[[:space:]]*=" js/*.js
grep -n "^[[:space:]]*party[[:space:]]*=" js/*.js
```
S'il n'y a que les déclarations dans `state.js`, le passage à `const` est sûr.

**Critère de vérification :**
- ✅ Audit grep : aucune réassignation trouvée hors `state.js`.
- ✅ `node tests/smoke.js` passe sans erreur.
- ✅ Test save/load (scénario existant `scenarioSaveSlots`) ok.

**Effort estimé :** S (3 mots à changer + audit).
**Risque :** faible si l'audit confirme l'absence de réassignation.

---

### A3 — Helpers `safeGet` / `safeCall` (pattern centralisé)

**Problème vérifié.**
- 180 occurrences de `getElementById` sans null check systématique.
- 11+ `if (window.UX)` répétés.
- Le `try/catch` n'apparaît que 7 fois dans tout le code (save, textures, renderer).

**Fix proposé.** Ajouter 2 helpers minimalistes dans `js/loader.js` (ou dans un
nouveau `js/utils.js`) :

```js
function safeEl(id) {
  const el = document.getElementById(id);
  if (!el && safeEl._warned !== id) {
    console.warn(`[DOM] Element manquant: #${id}`);
    safeEl._warned = id;
  }
  return el;
}

function safeCall(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn !== 'function') return undefined;
  return fn(...args);
}
```

**Périmètre d'usage.** Ne PAS refactoriser massivement les 180 `getElementById`
existants — risque trop élevé pour un gain marginal. Faire à la place :
- Documenter les helpers dans `CLAUDE.md`.
- Les utiliser **uniquement** dans le nouveau code et lors des futurs refactors.
- Optionnellement, migrer 1-2 zones les plus fragiles (par ex. l'overlay
  d'exploration `_showExploreOverlay` qui touche 5 IDs sans check).

**Critère de vérification :**
- ✅ Helpers ajoutés et exportés via `window`.
- ✅ Démo : un usage dans `_showExploreOverlay` (movement.js:96-100).
- ✅ `node tests/smoke.js` passe.

**Effort estimé :** S (helpers + 1 usage démo).
**Risque :** faible — additif.

---

### A4 — Audit des edge cases réels

**Problème.** Le rapport initial citait `usedFountains` non-initialisé et
`inventory.js:169` problématique : tous deux sont déjà gérés. Il faut donc faire
un vrai audit ciblé pour trouver les zones non couvertes.

**Zones à examiner :**

1. **`battle.js — endBattle()` après KO du groupe** : confirmer que
   `triggerDeath()` synchrone vs async ne crée pas de race avec `autoSave`.
2. **`save.js — _applyState()` avec save corrompue partielle** : déjà testé via
   `scenarioCorruptSave`, mais y a-t-il des champs récents (npc, house) sans
   migration ?
3. **`movement.js — goDeeper()` avec `floorDungeons[currentFloor+1]` vide** :
   doit régénérer.
4. **`inventory.js — equipItem` avec slot inconnu** : `_resolveSlotForItem`
   renvoie quoi ?
5. **`shop.js — buyItem` avec catalogue vide** : déjà testé (fallback étage 1) ?

**Méthode.** Lire chaque fonction citée, identifier les chemins non couverts,
ajouter des guards minimaux **uniquement** si une vraie fragilité est trouvée.
Pas de refactor de confort.

**Critère de vérification :**
- ✅ Rapport écrit dans ce plan : "X cas examinés, Y corrigés, Z déjà gérés".
- ✅ Pour chaque correction : test smoke ad-hoc ajouté si scénario non couvert.
- ✅ `node tests/smoke.js` passe.

**Effort estimé :** M (lecture + petites corrections ciblées).
**Risque :** faible — corrections chirurgicales uniquement.

**Résultat de l'audit A4 :**

| # | Zone examinée | Verdict |
|---|---------------|---------|
| 1 | `endBattle`/`triggerDeath` race avec `autoSave` | ✅ Déjà sain : `triggerDeath` via early return évite double appel (`battle.js:298`) |
| 2 | Save corrompue partielle | ✅ Déjà couvert par `scenarioCorruptSave` dans smoke + migrations dans `_applyState` |
| 3 | `goDeeper` sans cache d'étage | ✅ Déjà géré : `if (!_restoreFloorFromCache(...))` régénère (`movement.js:197`) |
| 4 | `equipItem(idx, charIdx)` avec `charIdx` invalide | ⚠️ Corrigé : `if (!c) return;` ajouté après `const c = party[charIdx]` (`inventory.js:241`) |
| 5 | `buyItem` avec catalogue vide | ✅ Déjà couvert : fallback étage 1 + UI message "Plus rien à acheter" (`shop.js:136,162`) |

**Bonus :** warn dev ajouté dans `_resolveSlotForItem` si `item.slot` n'existe pas
dans `c.equipped` — facilite le diagnostic des typos dans data.js sans changer
le comportement runtime.

---

## Suivi d'exécution

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| A1   | ✅     | 0f1bc1a| 55 modules vérifiés au chargement. Détection via `typeof` (safe pour let/const). Bandeau DOM rouge si critique manquant. |
| A2   | ✅     | 3d2eb59| Audit grep clean (zéro réassignation). `let → const` sur player/player2/party. Object.assign() dans save.js intact. |
| A3   | ✅     | 782b099| `safeEl(id)` (warn dédupé) + `safeCall(name, ...args)` ajoutés dans loader.js. Démo dans `_showExploreOverlay` / `_hideExploreOverlay`. |
| A4   | ✅     | TBD    | 5 zones examinées, 4 déjà saines (confirmation des faux positifs du rapport initial). 1 trou : `equipItem` sans guard sur `c` → fix + warn dev sur slot inconnu dans `_resolveSlotForItem`. |

## Hors-scope (renvoyé à Vague B/C)

- Refactor `completeQuest` / `changeDifficulty` (fonctions longues) → Vague B
- Centralisation de `applyPartyMode()` → Vague B
- Granularisation de `updateUI()` → Vague C
- Mise à jour CLAUDE.md (NPC, Maisons, ux-improvements) → Vague C
- Accessibilité (Escape ferme modales, aria-live) → Vague C
