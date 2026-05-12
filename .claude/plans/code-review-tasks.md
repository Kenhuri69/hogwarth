# Passe code — restes à faire & améliorations

> Branche : `claude/code-review-tasks-voWQi`
> Date de la passe : 2026-05-12
> Méthode : lecture des plans existants + grep ciblé + heuristiques (longueur des fonctions, patterns défensifs, a11y, code mort).
>
> Ce document **n'implémente rien** : il consolide ce qui reste à faire à
> travers les plans actifs + ajoute les points découverts pendant la passe.
> À chaque chantier lancé : créer une branche dédiée + cocher la case ici.

---

## 1. Bilan des plans existants

| Plan                                  | Statut                                    | Reste à faire                                                                                                           |
|---------------------------------------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `SVG_PLAN.md`                         | 36 / 76 (47 %)                            | Bloc B (31 SVG inline à affiner) + Bloc C (5 PNG monstres + 6 re-gen + 4 portraits PNJ + 2 scènes) + Z1 commit final.    |
| `code-improvements.md` — **Vague A**  | ✅ livrée (4/4)                           | —                                                                                                                       |
| `code-improvements.md` — **Vague B**  | ⏳ 0/5                                    | B1 `safeUX` + migration ; B2 refactor `castSpellInBattle` ; B3 refactor `renderQuestList` ; B4 refactor `checkLevelUp` ; B5 audit code mort. |
| `code-improvements.md` — **Vague C**  | ⏳ 0/4                                    | C1 doc CLAUDE.md ; C2 a11y ; C3 smoke loader ; C4 hygiène plans.                                                         |
| `equipment-extended.md`               | 28 / 53 — Phase 6 restante                | 6.1 update SVG_PLAN si atlas items ajoutés ; 6.2 commit groupé ; 6.3 PR (sur demande). Phase 4 (atlas PNG items) reportée. |
| `npc-integration.md`                  | Livré pour l'essentiel                    | (a) Corriger portrait Pomfresh (broche → caducée + mandragore + plume de phénix) ; (b) PNG 4 PNJ lore (Sir Nicolas, Moine Gras, Rusard, Trelawney). |
| `character-ux-v2.md`                  | Étape 0 (mockup) livrée                   | Validation utilisateur 0.U pour débloquer 1.1 → 6.6 (refonte modale Personnage 3 colonnes + tooltip riche).               |
| `character-ux-refonte.md`             | Iter A + B livrées                        | Plan obsolète → **à archiver** dans `_archive/` (PR #57 mergée).                                                          |
| `audio-intro-sample.md`               | Implémenté (commits récents)              | Plan obsolète (samples livrés dans commits `481c384`, `924b48c`, etc.) → **à archiver**.                                 |
| `voice-intro-dumbledore.md`           | Implémenté (commit `a0962fa`)             | Plan obsolète → **à archiver**.                                                                                          |
| `anastasia-character.md`              | Livré (commit `c6765e7`)                  | Plan obsolète → **à archiver**.                                                                                          |

**Constat** : 4 plans terminés traînent à la racine de `.claude/plans/` alors
que `_archive/` existe. Premier nettoyage à faire (cf. C4).

---

## 2. Nouveaux items découverts pendant la passe

### N1 — Migration des `if (window.UX)` non faite (recoupe B1)

Compte actuel par grep :

| Fichier              | Occurrences |
|----------------------|-------------|
| `js/battle.js`       | 10          |
| `js/battle-spells.js`| 14          |

Le plan code-improvements prévoit `UX_safe = new Proxy({...})` dans `loader.js`.
Le proxy n'existe pas encore (`grep UX_safe` → 0). `safeCall` est dispo mais
inutilisé pour UX. **Tractable, faible risque.**

### N2 — `safeEl` / `safeCall` sous-utilisés

Helpers livrés en A3 mais utilisés uniquement dans `movement.js`
(`_showExploreOverlay`/`_hideExploreOverlay`, 6 occurrences) sur **180+
`getElementById`** existants. Pas de refactor de masse à faire, mais les
fonctions à risque (manipulations DOM en cascade dans une même fonction)
mériteraient la migration ciblée.

Zones candidates (fonctions touchant ≥ 5 IDs sans check) :
- `js/inventory.js — showEquipMenu()` (8 `getElementById` dans `inventory.js`)
- `js/save-ui.js — _renderSlotCard()` + `openSaveDialog/openLoadDialog` (16 IDs)
- `js/ui-bestiary.js — showMonsterDetail()` (13 IDs)
- `js/main.js — startGame()` + démarrage (18 IDs)
- `js/ux-improvements.js` (15 IDs — timeline/log/floatDmg)

### N3 — `localStorage.getItem` lui-même peut throw (cas marginal)

Recoupé avec l'audit indépendant : `_readStore` et `_writeStore` ont déjà
des try/catch corrects sur `JSON.parse` et `localStorage.setItem`. **Faux
positif partiel.**

Reste un point : `save.js:15` `localStorage.getItem(SAVE_STORE_KEY)` est
**hors** du `try/catch` (qui commence ligne 17). En Safari mode privé, un
simple `getItem` peut jeter `SecurityError`. Idem `save.js:127, 344`.

**Impact** : rare mais possible — démarrage planté en Safari privé.
**Fix** : étendre le try/catch d'une ligne (englober le `getItem`) dans
les 3 endroits.

### N4 — `console.log` de debug oubliés en prod

3 logs informatifs qui devraient être derrière un flag dev :
- `js/main.js:213` — `console.log("✅ Textures chargées - redraw forcé")`
- `js/textures.js:53` — `console.log('[Textures] ✅ Chargées :', …)`
- `js/renderer.js:92` — `console.log('[Renderer] Patterns prêts — murs:', …)`

**Choix** : soit les garder préfixés `[Textures]`/`[Renderer]` (acceptable),
soit ajouter un `DEBUG` flag global dans `state.js` consommé par les 3.

### N5 — Accessibilité ARIA quasi inexistante (recoupe C2)

`grep aria- index.html` → **0 occurrence**. Aucun attribut accessible :
- Modales (`#character-modal`, `#inventory-modal`, `#bestiary-modal`,
  `#shop-modal`, `#slot-modal`, `#spell-modal`, `#npc-dialog`) → aucune
  n'a `role="dialog"` / `aria-modal="true"` / `aria-labelledby`.
- Logs combat (`#battle-log`, `#msg-log`) → pas d'`aria-live` ; un lecteur
  d'écran ne lit pas les events.
- Bandeau loader (`#loader-error-banner`, créé en JS) → pas de `role="alert"`.
- D-pad mobile `.mobile-dir`, boutons `.cmd-btn` en mode emoji-only → pas
  d'`aria-label`.

C'est l'item C2 du plan code-improvements, à confirmer/promouvoir.

### N6 — CLAUDE.md ne reflète plus la liste réelle des modules

`<script src="js/...">` dans `index.html` charge **31 modules** :
`ux-improvements, audio, audio-music, audio-sfx, icons, scene-icons, monsters,
npcs, data, item-icons, state, ui, ui-bestiary, dungeon, textures, renderer,
renderer-effects, renderer-minimap, movement, battle, battle-spells, battle-ui,
inventory, quests, npc-dialog, intro, shop, save, save-ui, main, loader`.

CLAUDE.md liste seulement 25 modules — manquent **npcs, npc-dialog, intro,
item-icons, scene-icons, loader**. Ces modules sont par ailleurs absents de la
section « Structure des fichiers » détaillée.

C'est l'item C1 du plan code-improvements.

### N7 — Fonctions longues confirmées (recoupe B2/B3/B4 + nouvelles)

Heuristique : `function` jusqu'à la suivante. Top 12 :

| Fichier:ligne                           | Fonction                  | Lignes |
|------------------------------------------|---------------------------|--------|
| `js/renderer.js:212`                     | `drawCorridor`            | 316    |
| `js/renderer-effects.js:359`             | `drawStairsSprite`        | 206    |
| `js/renderer-effects.js:168`             | `drawCellMarker`          | 164    |
| `js/dungeon.js:85`                       | `generateDungeon`         | 138    |
| `js/quests.js:258`                       | `renderQuestList`         | 124    |
| `js/battle-spells.js:59`                 | `castSpellInBattle`       | 118    |
| `js/ui-bestiary.js:84`                   | `showMonsterDetail`       | 101    |
| `js/quests.js:409`                       | `completeQuest`           | 98     |
| `js/ui.js:369`                           | `openCharacter`           | 92     |
| `js/save.js:223`                         | `_applyState`             | 91     |
| `js/battle.js:391`                       | `checkLevelUp`            | 79     |
| `js/main.js:208`                         | `startGame`               | 77     |

**Lecture** :
- `drawCorridor`, `drawStairsSprite`, `drawCellMarker` : code rendu canvas
  procédural avec beaucoup de constantes inline. Découpage par couche
  faisable mais le bénéfice est faible — **laisser tel quel sauf demande
  utilisateur**.
- `castSpellInBattle` 118 l → **B2** déjà planifié (table de handlers).
- `renderQuestList` 124 l → **B3** déjà planifié (sous-vues).
- `completeQuest` 98 l → candidat naturel à découper en parallèle de B3
  (`_grantRewards`, `_chainNext`, `_logCompletion`).
- `showMonsterDetail` 101 l → template-builder, factorisable en helpers
  `_renderLoreBox`, `_renderAbilities`, `_renderDrops`.
- `_applyState` 91 l → critique pour saves. **À laisser tel quel** : tests
  smoke `scenarioSaveSlots` + `scenarioCorruptSave` couvrent.
- `generateDungeon` 138 l → mêlange room layout + placement spécial
  (chest/shop/stairs/fountain). Découpage faisable mais touche au cœur de
  la génération — **risque modéré**, attendre vraie justification.

### N8 — Smoke test ne couvre pas le rapport loader (recoupe C3)

`tests/smoke.js` a 33 scénarios mais aucun ne lit `window.__loaderReport`.
Si quelqu'un casse `loader.js` (typo dans le manifest, etc.), aucun signal.

### N9 — Doublon HTML mineur

- `js/inventory.js:169` : `div.innerHTML = '<div style="font-size:10px;color:#2a1a08">—</div>'`
- `js/ui.js:155` : `el.innerHTML = '<div style="color:#3a2a10;font-style:italic;font-size:9px;text-align:center;padding-top:4px;">Aucune quête active</div>'`

Petit, mais le pattern « string HTML inline avec style attribute » se répète
dans plusieurs fichiers. Pas critique, mais à factoriser si une refonte UI
arrive (cf. character-ux-v2).

### N10 — `eval('typeof ' + entry.name)` dans loader.js (acceptable)

`js/loader.js:149` utilise `eval` volontairement pour tester l'existence d'un
identifiant déclaré en `let`/`const` au scope global (non exposé sur `window`).
**Mentionné comme acceptable dans le plan A1** (typeof avec un identifiant nu
ne throw pas). Aucune action requise — juste documenter ce choix dans CLAUDE.md
(C1) pour éviter qu'une future passe « anti-eval » ne le supprime.

### N11 — Magic numbers récurrents à factoriser

L'audit code a relevé plusieurs constantes hardcodées qui mériteraient des
noms :

| Source                            | Valeur     | Constante suggérée            |
|-----------------------------------|------------|-------------------------------|
| `battle.js:396` xp courbe         | `× 1.6`    | `LEVEL_UP_XP_MULTIPLIER`      |
| `battle.js:374` gains maison      | `{Facile:8, Normal:10, Difficile:14, Expert:18}` | `HOUSE_POINTS_PER_KILL` |
| `battle-spells.js` résist         | `× 0.5`    | `RESIST_MULTIPLIER`           |
| `battle-spells.js` faiblesse      | `× 1.5`    | `WEAK_MULTIPLIER`             |
| `movement.js:331,337` fouille     | `0.2` / `0.35` | `SEARCH_GOLD_CHANCE`, `SEARCH_ITEM_CHANCE` |
| `movement.js:378` rest encounter  | `0.3`      | `REST_ENCOUNTER_CHANCE`       |

**Pas un blocker** — mais une refactorisation low-effort qui aide la
lisibilité et autorise des bonus d'équipement futurs (ex. « -10% rest
encounter » via item).

### N12 — `pendingAction` / `pendingSpell` : couplage fragile

`battle.js:94-95` initialise `pendingAction` et `pendingSpell` à `null` en
début de combat, mais ces variables sont **lues uniquement** depuis
`battle-ui.js` (`showTargetSelection`). Si le flow change, easy à casser
sans rouge au compile.

**Fix possible** : encapsuler dans un objet `pendingTargetSelection` exposé
en API, ou — minimaliste — ajouter un commentaire bloc dans `state.js`
explicitant le contrat.

### N13 — `typeof autoSave === 'function'` : 8 occurrences

Pattern défensif autour de `autoSave` (au cas où `save.js` ne se charge
pas). `safeCall('autoSave', reason)` est dispo dans loader.js mais
inutilisé. Migration mécanique sed-friendly.

Fichiers : `js/battle.js:387, 467`, `js/movement.js:368`, `js/quests.js`
(à vérifier), etc.

### N14 — `if (window.checkKillQuests)` / `if (window.checkHouseLevelUp)` non factorisés

`battle.js:366, 376` — mêmes guards défensifs que UX. Candidats à
`safeCall('checkKillQuests', enemyId)` / `safeCall('checkHouseLevelUp')`.

### N15 — `showEquipMenu()` solo/duo dupliqué

`inventory.js:203-275` rend les boutons d'équipement avec **3 variantes
inline** (solo non-ring / solo ring / duo). Logique onclick répétée. À
factoriser via `_renderEquipButton(charIdx, slotHint)` lors de la prochaine
passe inventaire — ou laisser tel quel jusqu'à character-ux-v2 qui va
refondre cette UI.

### N16 — Boucle d'attente `setInterval` à vérifier

`grep setTimeout/setInterval` retourne 19 occurrences dans 9 fichiers. À
auditer rapidement si un setInterval n'est jamais cleared, ou si des
setTimeout s'accumulent en cas de combat répété. **Pas un blocker, juste un
sanity check.** Cibles prioritaires :
- `js/audio-music.js` (5 occurrences) — boucle musicale, vérifier que la
  refonte multi-zone (commit `b445beb`) clear bien le précédent.
- `js/ux-improvements.js` (3) — timeline, vérifier que `floatDmg` cleanup
  bien ses nœuds.

---

## 3. Recommandation d'ordre

> Aucun item n'est urgent. Cet ordre minimise les conflits et maximise le
> ROI documentaire.

1. **C1** (doc CLAUDE.md) + **C4** (archivage des 4 plans terminés) — 1 PR
   doc-only.
2. **N3** (try/catch saves) + **N4** (logs debug) — 1 PR hygiène.
3. **B1** (`UX_safe` + migration des 24 `if (window.UX)`) — 1 PR mécanique.
4. **B2** (refactor `castSpellInBattle`) — 1 PR ciblée.
5. **B3** (refactor `renderQuestList`) — 1 PR ciblée.
6. **B4** (refactor `checkLevelUp`) — 1 PR ciblée.
7. **C2** (a11y ARIA) — 1 PR additive.
8. **C3** + **N8** (smoke loader) — 1 PR test.
9. **B5** + **N7** dead-code/longueurs résiduelles — bas ROI, à faire si
   temps.

**Hors-scope code** (mais sur l'arriéré global) :
- SVG_PLAN reste : 40 tâches visuelles à 2 mains (PNG génération utilisateur).
- npc-integration : 4 portraits PNG manquants + correction Pomfresh.
- equipment-extended Phase 4 : atlas PNG items (reporté, hors V1).
- character-ux-v2 : 6 phases en attente de validation utilisateur sur le
  mockup `tools/mockup_character_v2.html`.

---

## 4. Suivi

| Item | Statut | Branche | Notes |
|------|--------|---------|-------|
| C1   | ✅     | `claude/code-review-tasks-voWQi` | Liste fichiers à jour (6 modules ajoutés : scene-icons, npcs, item-icons, npc-dialog, intro, loader) ; ordre de chargement à 31 modules ; 4 nouvelles sections (Loader & helpers, Système UX, Système PNJ, Système des Maisons). |
| C4   | ✅     | `claude/code-review-tasks-voWQi` | 4 plans archivés (`character-ux-refonte`, `audio-intro-sample`, `voice-intro-dumbledore`, `anastasia-character`). README mis à jour. |
| N3   | ✅     | `claude/code-review-tasks-voWQi` | 3 `localStorage.getItem` enveloppés (`_readStore`, `migrateLegacyKey`, `loadGame`). `loadGame` log un message lisible sur SecurityError. Autres accès déjà protégés. |
| N4   | ✅     | `claude/code-review-tasks-voWQi` | Supprimé le `console.log` redondant de `main.js:213`. Conservé `textures.js:53` et `renderer.js:92` (déjà one-shot, préfixés, informatifs). |
| B1/N1| ✅     | `claude/code-review-tasks-voWQi` | Proxy `UX_safe` ajouté dans `loader.js`. 24 sites `if (window.UX) { ... }` migrés vers appels directs `UX_safe.foo(...)` (44 appels au total dans battle.js + battle-spells.js). Test ad-hoc validé : `delete window.UX` → toutes les méthodes retournent `undefined` sans throw. |
| N13  | ✅     | `claude/code-review-tasks-voWQi` | 6 `typeof autoSave === 'function'` (battle.js, movement.js, npc-dialog.js) migrés vers `safeCall('autoSave', reason)`. |
| N14  | ✅     | `claude/code-review-tasks-voWQi` | `checkKillQuests` (battle.js, 1 site) et `checkHouseLevelUp` (battle.js + quests.js, 2 sites) migrés vers `safeCall(...)`. |
| B2   | ✅     | `claude/code-review-tasks-voWQi` | `castSpellInBattle` passée de 118 → **26 lignes**. 7 handlers privés (`_spellHeal`, `_spellDisarm`, `_spellShield`, `_spellElementalDamage`, `_spellLifesteal`, `_spellCurse`, `_spellSteal`) + table `SPELL_HANDLERS` (`stun`/`burn`/`instant` partagent le handler élémentaire). Test ad-hoc : couverture handlers/effets = 9/9, 0 manquant, 0 inutilisé. |
| B3   | ✅     | `claude/code-review-tasks-voWQi` | `renderQuestList` passée de 124 → **34 lignes**. 5 helpers privés extraits : `_renderActiveQuestCard`, `_renderQuestStep`, `_renderRewardParts`, `_appendCompletedSection`, `_prependAllDoneBanner`. Comportement strictement préservé (createElement+appendChild conservé, pas de migration vers innerHTML unique). Smoke test 33/33 — scénarios chained/repeatable validés. |
| B4   | ✅     | `claude/code-review-tasks-voWQi` | `checkLevelUp` passée de 79 → **24 lignes**. 3 helpers : `_grantLevelHpSp(c)` (hpMax/spMax/level/xpNext), `_grantLevelStats(c)` (`_baseX += 1` + lazy-init str/int/agi), `_grantLevelSpells(level)` (switch table + Avada unlock niv 9). Test ad-hoc : progression Lv1→9 confirme tous les apprentissages attendus + `avadaLocked` false au niveau 9. |
| C2/N5| ✅     | `claude/code-review-tasks-voWQi` | 8 modales (`role="dialog" aria-modal="true" aria-labelledby`), 2 logs (`role="log" aria-live="polite"`), 6 boutons close (`aria-label="Fermer" role="button" tabindex="0"`), loader banner (`role="alert" aria-live="assertive"`). cmd-btn de combat/déplacement déjà accessibles (texte visible) ; cmd-btn d'aventure déjà couverts par `title=""` en mobile. Test ad-hoc Playwright : 8/8 modales + 2/2 logs + 6/6 close = couverture complète. |
| C3/N8| ✅     | `claude/code-review-tasks-voWQi` | `scenarioLoader` ajouté à `tests/smoke.js` (35 lignes, 4 vérifications) : 1) `__loaderReport.ok === true` + 0 missing critical + ≥50 modules ; 2) absence du bandeau d'erreur sur démarrage sain ; 3) helpers `safeEl`/`safeCall`/`UX_safe` exposés sur `window` ; 4) régression B1 — `UX_safe` retourne `undefined` après `delete window.UX`. Smoke passe 34/34 (rapport `total: 55, missingCritical: 0`). |
| B5   | ✅     | `claude/code-review-tasks-voWQi` | Audit 75 helpers `_xxx` : 5 morts confirmés et supprimés. `renderer.js` : `_getWallPattern`, `_getWallTex`, `_getFloorPattern`, `_getCeilPattern` (~40 l) — remplacés par `_patternForKey(bucket, key)` mais jamais nettoyés. `renderer-effects.js` : `stopNpcAnimLoop` (3 l) — jamais appelé. Aucune trace résiduelle. Smoke 34/34. |
| N7   | ✅     | `claude/code-review-tasks-voWQi` | 2 fonctions longues découpées. `completeQuest` 65 → **34 l** (`_consumeQuestItems`, `_resolveQuestReward`, `_grantQuestReward`). `showMonsterDetail` 101 → **42 l** (`_renderDangerHtml`, `_renderLoreBox`, `_renderAbilitiesHtml`, `_renderDropsHtml`, `_renderResistWeakHtml`, `_renderStatGrid`). Comportement strictement préservé. Smoke 34/34. |
| N9   | ✅     | `claude/code-review-tasks-voWQi` | 3 styles inline migrés vers classes CSS dédiées (pendant du pattern existant `.bestiary-empty` / `.slot-empty-state`) : `.inv-empty-slot` (slot inventaire vide), `.quest-tracker-empty` (HUD quête vide), `.quest-list-empty` (modale quête vide). 3 sites JS allégés (inventory.js, ui.js, quests.js). Smoke 34/34. |
| N11  | ✅     | `claude/code-review-tasks-voWQi` | 7 constantes ajoutées dans `data.js` (bloc CONSTANTES DE GAMEPLAY) : `LEVEL_UP_XP_MULTIPLIER`, `HOUSE_POINTS_PER_KILL`, `RESIST_MULTIPLIER`, `WEAK_MULTIPLIER`, `SEARCH_GOLD_THRESHOLD`, `SEARCH_ITEM_THRESHOLD`, `REST_ENCOUNTER_CHANCE`. 10 sites migrés (battle.js xp + maison + 2 resist/weak, battle-spells.js 3 paires resist/weak, movement.js fouille + repos). Smoke 34/34. |
| N12  | ✅     | `claude/code-review-tasks-voWQi` | Commentaire bloc ajouté dans `state.js` documentant le contrat producteur/consommateur de `pendingAction`/`pendingSpell` (4 sites : `showTargetSelection`, `openBattleSpells`, target button onclick, `startBattle` reset). |
| N15  | ⏳     | -       | (Optionnel) factoriser `showEquipMenu` solo/duo (à coupler avec character-ux-v2) |
| N16  | ✅     | `claude/code-review-tasks-voWQi` | Audit timers : **0 fuite**. 1 `setInterval` (`_npcAnimTimer`, idempotent). 17 `setTimeout` répartis : tous les longs (audio-music `_noteTimer`/`_combatTimer`/`_sampleLoopTimer`, inventory `_invTapTimer`) sont assignés à des variables et `clearTimeout()`és proprement. Les one-shot courts (animations UI 350–4000 ms) sont sûrs. Le cas marginal `setTimeout(enemyTurn, 700)` (battle.js:223) est sécurisé par le verrouillage UI. |
