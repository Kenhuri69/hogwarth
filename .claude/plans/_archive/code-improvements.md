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

## Hors-scope (renvoyé à Vague B/C — voir détail plus bas)

Le rapport initial mentionnait plusieurs items qui se sont révélés être des
**faux positifs** après vérification du code réel :

| Item rejeté | Raison |
|------------|--------|
| Centraliser `applyPartyMode()` | Déjà centralisée dans `ui.js:8`, appelée depuis `main.js:226`, `save-ui.js:279`, `ui.js:44` |
| Granulariser `updateUI()` | Déjà décomposée en `_updateCharBar()`, `_updateHouseBadge()`, `updateQuestTracker()`, `updateRoomStatus()` |
| Escape ferme modales | Déjà câblé dans `main.js:311-313` (4 modales) et `npc-dialog.js:312` |
| Tests insuffisants | `tests/smoke.js` = 3387 l, 26 scénarios couvrant saves/NPC/équipement étendu/fontaine/etc. |
| `changeDifficulty` trop longue | 34 lignes, parfaitement acceptable |

Les items renvoyés ont été remplacés par des cibles vérifiées (voir Vagues B/C).

---

# Vague B — Qualité (refactor ciblé)

> Niveau de risque : **modéré** — refactor de fonctions longues, migration de
> patterns. Tests smoke à chaque étape.

## Contexte

L'audit a révélé 4 zones où un refactor mesuré améliorerait la maintenabilité
sans toucher au comportement :

1. **26 occurrences de `if (window.UX)`** dans `battle.js` et `battle-spells.js`
   — pattern défensif répétitif, candidat naturel à `safeCall`/helper dédié.
2. **`castSpellInBattle` = 118 lignes** (`battle-spells.js:59`) — gros `if/else`
   par effet de sort, extensible mais lourd à lire.
3. **`renderQuestList` = 121 lignes** (`quests.js:258`) — template-builder
   monolithique mêlant calcul d'état et HTML.
4. **`checkLevelUp` = 77 lignes** (`battle.js:391`) — gain XP + level-up +
   apprentissage de sorts par niveau + recalc stats. Logique gagnante en
   testabilité si éclatée.

## Items

### B1 — Helper `safeUX` + migration des 26 `if (window.UX)`

**Problème vérifié.** `grep -c "window\.UX" js/*.js` retourne 26 (hors loader.js
et ux-improvements.js qui le définissent). Pattern type :

```js
if (window.UX) { UX.floatDmg('ally', dmg, 'dmg'); UX.logCombat(`…`, 'bad'); }
```

Si `UX` est absent (ordre de chargement cassé, plantage de
`ux-improvements.js`), tout l'appel est silencieusement ignoré — pas de log,
pas d'avertissement. Le loader (A1) détectera l'absence du module mais le
runtime continuera quand même de muter.

**Fix proposé.** Ajouter dans `loader.js` un helper namespacé :

```js
window.UX_safe = new Proxy({}, {
  get(_, method) {
    return function (...args) {
      if (!window.UX || typeof window.UX[method] !== 'function') return undefined;
      return window.UX[method](...args);
    };
  }
});
```

Migration : remplacer les 26 occurrences par `UX_safe.floatDmg(...)` /
`UX_safe.logCombat(...)`. Pas d'`if (window.UX)`. Le résultat est null/undefined
si UX absent, exactement comme aujourd'hui mais sans `if`.

**Critère de vérification :**
- ✅ `grep -c "if (window.UX)" js/*.js` retourne 0 (hors loader.js).
- ✅ `node tests/smoke.js` passe.
- ✅ Test ad-hoc : retirer temporairement la ligne `window.UX = {...}` →
  combat fonctionne (sans logs UX) sans crash.

**Effort estimé :** M (1 helper + 26 remplacements sed-friendly).
**Risque :** faible — sémantiquement équivalent.

---

### B2 — Refactor `castSpellInBattle` en table de handlers

**Problème vérifié.** `battle-spells.js:59-176` = 118 lignes. Un `if/else if`
géant sur `spell.effect` (heal / disarm / shield / damage / drain_gold / …).
Ajouter un sort = éditer cette fonction → conflits de merge, regressions
potentielles.

**Fix proposé.** Extraire en table associative :

```js
const SPELL_HANDLERS = {
  heal:        _castHeal,
  disarm:      _castDisarm,
  shield:      _castShield,
  damage:      _castDamage,
  drain_gold:  _castDrainGold,
  burn:        _castBurn,
  // … un handler par effet
};

function castSpellInBattle(spellName, charIdx, targetIdx) {
  const spell = SPELLS.find(s => s.name === spellName);
  if (!spell || spell.locked) return;
  const char  = party[charIdx];
  if (!char || char.sp < spell.cost) return;
  char.sp -= spell.cost;

  const handler = SPELL_HANDLERS[spell.effect];
  if (!handler) {
    console.warn('[spell] effet inconnu:', spell.effect);
    return;
  }
  handler(spell, char, targetIdx);
  advanceBattleChar();
}
```

Chaque `_castXxx` reste petit (~10-15 lignes) et testable isolément. Pas de
changement de comportement — uniquement structurel.

**Critère de vérification :**
- ✅ `castSpellInBattle` ramenée à < 25 lignes.
- ✅ Smoke scenarios qui touchent les sorts (Episkey, Protego, Expelliarmus,
  Reparo, Diffindo) passent identiquement.
- ✅ Test ad-hoc : lancer chaque sort en console et vérifier l'effet.

**Effort estimé :** M (refactor mécanique, ~150 lignes touchées).
**Risque :** moyen — toucher au combat. Smoke `scenarioStatusEffects` et
`scenarioCritDodge` couvrent l'essentiel.

---

### B3 — Refactor `renderQuestList` en sous-vues

**Problème vérifié.** `quests.js:258-378` = 121 lignes. Mélange :
1. calcul des quêtes filtrées (active / available / completed),
2. construction de l'HTML pour chaque catégorie,
3. génération des boutons (accepter / remettre / abandonner).

**Fix proposé.** Découper en :

```js
function renderQuestList() {
  const root = safeEl('quest-list');
  if (!root) return;
  root.innerHTML = [
    _renderActiveQuests(),
    _renderAvailableQuests(),
    _renderCompletedQuests()
  ].join('');
}

function _renderActiveQuests() { … }    // ~30 lignes
function _renderAvailableQuests() { … } // ~30 lignes
function _renderCompletedQuests() { … } // ~30 lignes
function _renderQuestCard(q, mode) { … } // template partagé
```

**Critère de vérification :**
- ✅ `renderQuestList` < 15 lignes (orchestrateur).
- ✅ Modale de quêtes ouvre identique visuellement.
- ✅ Smoke `scenarioChainedQuest` + `scenarioChainAndRepeatable` passent.

**Effort estimé :** M (refactor template-heavy).
**Risque :** moyen — UI visible, vérifier rendu mobile aussi.

---

### B4 — Refactor `checkLevelUp` en étapes pures

**Problème vérifié.** `battle.js:391-467` = 77 lignes. Fait 4 choses :
1. Boucle while sur le seuil XP (multi-levels en un seul gain).
2. Incrémente `_baseAtk` / `_baseDef` / `_baseMag` selon le personnage.
3. Recalcule HP/SP max et restaure.
4. Apprend les sorts selon la table niveau→sort par personnage.

**Fix proposé.** Extraire :

```js
function checkLevelUp() {
  while (player.xp >= player.xpNext) {
    party.forEach(c => {
      if (c.level >= player.level) return; // sync sur player
      _grantLevelStats(c);
      _grantLevelHpSp(c);
      _grantLevelSpells(c);
    });
    player.xp -= player.xpNext;
    player.xpNext = Math.floor(player.xpNext * 1.5);
    party.forEach(c => c.level = player.level + 1);
    player.level++;
    AudioSystem.playLevelUp();
    addMsg(`Niveau ${player.level} atteint !`, 'good');
  }
  recalculateStats();
}

function _grantLevelStats(c) { … }    // +1/+2 stats primaires
function _grantLevelHpSp(c)   { … }    // hpMax += 4, spMax += 3, full heal
function _grantLevelSpells(c) { … }    // table par perso/niveau
```

**Critère de vérification :**
- ✅ Smoke (scénarios qui passent par level-up) inchangé.
- ✅ Test ad-hoc : forcer `player.xp = 999999`, vérifier multi-level-up et
  apprentissage des sorts d'Avada (niv 9).

**Effort estimé :** M.
**Risque :** moyen — la progression est centrale, bien couverte par smoke
indirectement mais à valider.

---

### B5 — Audit code mort & imports inutilisés (low-priority)

**Problème suspect.** Lors des refactors successifs (équipement étendu, NPC,
UX improvements), du code mort a pu s'accumuler : fonctions privées non
appelées, variables `_baseX` initialisées et jamais lues, branches `if (false)`.

**Méthode.** Pour chaque fichier `js/*.js` :

```bash
grep -nE "^function _[a-zA-Z]" js/<file>.js  # liste les helpers privés
# Pour chaque _helper : vérifier qu'il est appelé au moins 1 fois
```

Items à supprimer si confirmés non utilisés (à valider AVANT delete).

**Critère de vérification :**
- ✅ Rapport écrit : "X fonctions auditées, Y supprimées, Z conservées".
- ✅ Smoke passe.

**Effort estimé :** L (lecture exhaustive).
**Risque :** faible (delete uniquement après preuve).
**Note :** peut être déprioritisé si le ROI est faible.

---

## Suivi Vague B

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| B1   | ⏳     | -      | -     |
| B2   | ⏳     | -      | -     |
| B3   | ⏳     | -      | -     |
| B4   | ⏳     | -      | -     |
| B5   | ⏳     | -      | -     |

---

# Vague C — Polish & maintenabilité

> Niveau de risque : **faible** — additif ou documentaire uniquement.

## Contexte

Items légers qui réduisent la dette documentaire et la friction d'onboarding.
Aucun ne change le comportement du jeu.

## Items

### C1 — Mise à jour CLAUDE.md (priorité haute)

**Problème vérifié.** Le CLAUDE.md ne mentionne pas les modules récents :

- `js/ux-improvements.js` (timeline, floatDmg, logCombat) — système entier non
  documenté.
- `js/npcs.js` (NPCS[], 502 lignes) — non listé dans la structure de fichiers.
- `js/npc-dialog.js` (dialogues + actions spéciales Fumseck) — absent.
- `js/intro.js` (écran d'intro) — absent.
- `js/loader.js` (ajouté en A1) — à documenter.
- `safeEl` / `safeCall` / `UX_safe` (ajoutés en A3/B1) — helpers utiles non
  référencés.
- Section "Système de Maisons" (state.js:62-113, `HOUSE_BONUSES`) — non
  documentée.

**Fix proposé.** Ajouter 5 sections à CLAUDE.md :
1. **Loader & helpers** (A1/A3) — quand utiliser `safeEl`, `safeCall`,
   `UX_safe`.
2. **Système UX** (`ux-improvements.js`) — UX.floatDmg, UX.logCombat,
   UX.renderTimeline.
3. **Système NPC** (`npcs.js`, `npc-dialog.js`) — modèle de PNJ, dialogues,
   actions spéciales, intégration avec quêtes.
4. **Système de Maisons** — points, paliers, bonus stat, récompense item.
5. **Mise à jour de l'ordre de chargement** dans la section "Structure des
   fichiers" pour refléter `loader.js` chargé en dernier.

**Critère de vérification :**
- ✅ Diff CLAUDE.md couvre les 5 zones identifiées.
- ✅ Une nouvelle session Claude peut s'orienter sans lire le code.
- ✅ `node tests/smoke.js` passe (doc-only, mais sanity check).

**Effort estimé :** M (~150-200 lignes de doc).
**Risque :** nul.

---

### C2 — Audit a11y léger

**Problème vérifié.** Le jeu utilise beaucoup d'éléments dynamiques (combat
log, modales, overlay d'exploration) sans annonces accessibles :

- `#battle-log` : pas de `aria-live="polite"`. Un lecteur d'écran ne lit pas
  les events de combat.
- `#msg-log` (panneau bas) : idem.
- Bandeau loader (A1) : pas de `role="alert"`.
- Modales (`#character-modal`, `#inventory-modal`, etc.) : pas de focus trap,
  pas d'`aria-modal="true"`, pas de focus restoration à la fermeture.
- Boutons `.cmd-btn` à emoji seul (mode mobile) : pas d'`aria-label`.

**Fix proposé.** Pour chaque élément :

| Élément | Attribut à ajouter |
|---------|-------------------|
| `#battle-log`, `#msg-log` | `aria-live="polite" aria-atomic="false"` |
| `#loader-error-banner` | `role="alert" aria-live="assertive"` |
| Modales | `aria-modal="true" role="dialog" aria-labelledby="…-title"` |
| `.cmd-btn` mobile | `aria-label="<action>"` dynamique |
| Bouton d'overlay close | `aria-label="Fermer"` |

Bonus : à la fermeture d'une modale, restaurer le focus sur l'élément
déclencheur (stocké en `data-trigger` ou `lastFocused` global).

**Critère de vérification :**
- ✅ Audit Lighthouse a11y > 90 (à mesurer avant/après).
- ✅ Tester avec VoiceOver / NVDA un cycle : ouvrir inventaire → naviguer →
  fermer.
- ✅ Smoke passe.

**Effort estimé :** M.
**Risque :** faible — attributs additifs.

---

### C3 — Scénario smoke pour le loader

**Problème.** `tests/smoke.js` ne valide pas le rapport du loader (A1).
Si quelqu'un casse `js/loader.js` ou supprime un check du manifeste,
aucune alerte.

**Fix proposé.** Ajouter dans `tests/smoke.js` :

```js
async function scenarioLoader() {
  const { browser, page } = await launchGame();
  await page.waitForFunction(() => typeof window.__loaderReport === 'object');

  const report = await page.evaluate(() => window.__loaderReport);
  assert(report.ok, 'loader.ok doit être true');
  assert(report.missingCritical.length === 0, 'aucun module critique manquant');
  assert(report.totalChecked >= 55, 'au moins 55 modules vérifiés');

  const hasBanner = await page.evaluate(() => !!document.getElementById('loader-error-banner'));
  assert(!hasBanner, 'pas de bandeau d\'erreur sur démarrage sain');

  // Test fail-path : injecter un manifeste cassé via un override
  // (ou simuler en supprimant temporairement window.X)
  // → bandeau visible
  …
  console.log('  ✅ Loader OK');
  await browser.close();
}
```

**Critère de vérification :**
- ✅ Smoke inclut `scenarioLoader`.
- ✅ Test fail-path déclenche bien le bandeau.

**Effort estimé :** S.
**Risque :** nul.

---

### C4 — Hygiène `.claude/plans/`

**Problème.** Plusieurs plans terminés (équipement étendu, character UX v2,
NPC integration) traînent à la racine de `.claude/plans/` alors qu'un dossier
`_archive/` existe.

**Fix proposé.**
- Déplacer les plans terminés (status ✅ à toutes les étapes) dans
  `_archive/<date>-<feature>.md`.
- Ne garder à la racine que les plans actifs (en cours ou à venir).
- Ajouter en haut de chaque plan archivé une note "Implémenté en commit X,
  archivé le YYYY-MM-DD".

**Critère de vérification :**
- ✅ `ls .claude/plans/` ne contient que les plans actifs + le dossier
  `_archive/`.
- ✅ Chaque plan archivé pointe vers son commit/PR.

**Effort estimé :** S (déplacement + 1 ligne en tête de chaque fichier).
**Risque :** nul.

---

## Suivi Vague C

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| C1   | ⏳     | -      | -     |
| C2   | ⏳     | -      | -     |
| C3   | ⏳     | -      | -     |
| C4   | ⏳     | -      | -     |

---

# Synthèse globale

| Vague | Items | Effort total | Risque | Bénéfice principal |
|-------|-------|--------------|--------|---------------------|
| A — Fondations (✅) | 4 | ~1 session | faible | Résilience + invariants |
| B — Qualité       | 5 | 2-3 sessions | modéré | Maintenabilité refactor-friendly |
| C — Polish        | 4 | 1-2 sessions | faible | Doc à jour, a11y, hygiène |

**Recommandation d'ordre :**
1. **C1** d'abord (doc à jour aide les vagues suivantes).
2. **B1** ensuite (helper `UX_safe` simplifie le code que B2/B3/B4 vont
   toucher).
3. **B2 → B3 → B4** (refactors structurels les plus utiles).
4. **C2 + C3** en parallèle (a11y + smoke loader).
5. **C4 + B5** en dernier (hygiène, low-impact).
