# Plan — Implémentation Étape 2 du Chapitre 12 (Glossaire & Codex)

**Branche :** `claude/codex-impl-ch12-il06a4`
**Source :** `docs/histoire/12-glossaire-et-codex.md` § ÉTAPE 2
**Statut :** 🚧 en cours — Lots 1-3 (fondation + trame principale + menu jouable).

> ✅ Décisions utilisateur **arbitrées** (ne plus redemander) :
> 1. Conteneur UI : modale **dédiée `#codex-modal`** (jamais `#char-detail`).
> 2. Pas de 8ᵉ onglet « Voyageur » : les entrées Mondes Parallèles vivent dans
>    Glossaire/Objets.
> 3. États `corrupted` : **réservés aux entrées-phares** (Clé de Voûte,
>    Détraqueur, Ruines, Boucle), pas généralisés.

## Principe directeur

Le Codex **unifie l'existant** plutôt que de le réécrire. Le Bestiaire
(`ui-bestiary.js`, codex 2 paliers déjà codé) est **hébergé** comme un onglet ;
on ajoute **un seul** registre de données pour les entrées non-créature et **un
seul** global sérialisé (`unlockedCodexEntries`). Zéro dépendance, zéro build.

## Périmètre — lots (priorisation §VII du chapitre)

### Lot 1 — Squelette data + évaluateur pur (zéro risque, zéro UI)
- [x] Créer `js/codex.js` : registre `CODEX_ENTRIES[]` (format §12.3) + helpers
      **purs** :
  - `getCodexEntry(id)`
  - `codexEntryState(entry, ctx)` → `'locked'|'veiled'|'revealed'|'corrupted'`
  - `unlockedCodexFor(ctx)` (liste filtrée)
  - `codexVariantNote(entry, chosenHouse, heroKeys)` (note marginale, défensif)
- [x] Charger `codex.js` **avant** son UI dans `index.html` (après `riddles.js`,
      avant `ui-*`). Ordre : pur registre comme `quests-templates.js`.
- [x] Ajouter `CODEX_ENTRIES` + helpers au **MANIFEST `loader.js`**.
- [x] Tests `tests/units.js` : matrice d'états (locked/veiled/revealed/corrupted)
      sur quelques entrées-types et tous les `type` de condition (§12.5.3).
- **Vérif** : `node tests/units.js` vert ; aucun global muté ; jeu inchangé.

### Lot 2 — Entrées trame principale (Histoire & Éclats & Voix)
- [x] Rédiger dans `CODEX_ENTRIES` les entrées §12.4 prioritaires :
      `cle_de_voute`, `eclat_voute_codex`, `echo_scellement`, `boucle_tenebreuse`,
      `ruines_anciennes`, `froid_surnaturel` (+ voix par Fondateur).
- [x] Mapper le robinet Éclat : `revealedBy:[{type:"eclat",value:1|2|3}]` calé sur
      le **compte de `eclat_voute`** en inventaire (`eclatProgress`).
- **Vérif** : `codexEntryState` renvoie la bonne version selon le nb d'Éclats
      simulé (unit test).

### Lot 3 — Menu Codex + onglet Bestiaire embarqué + déverrouillage live
- [x] `state.js` : `unlockedCodexEntries = new Set()` (sérialisé `_serializeState`
      / `_applyState`, migration = Set vide si absent) + `floorReached` (max
      d'étage atteint, sérialisé). **`temporalEchoSeen` → réutilise `seenEchoes`**
      existant (voir « Écarts »). → ajouté au **MANIFEST loader**.
- [x] `js/ui-codex.js` (nouveau, après `ui-bestiary.js`) : `openCodex()`,
      `filterCodex()`, `showCodexEntry(id)`. **Réutilise** l'archi
      `ui-bestiary.js` (grille + fiche). Onglet Bestiaire = `openBestiary()`
      existant embarqué (pas de réécriture).
- [x] `#codex-modal` dans `index.html` (modale dédiée — **pas** `#char-detail`,
      garde-fou CLAUDE.md), bouton 📖 dans la barre de commandes.
- [x] `checkCodexUnlocks(reason)` : réévalue, diffe vs `unlockedCodexEntries`,
      notifie les nouveautés. Branché aux **points `autoSave`** (fin combat,
      level-up, changement d'étage, quête complétée, Éclat ramassé, stèle résolue).
      Défensif (`typeof` garde).
- [x] Notifications : toast « 📖 Codex — nouvelle entrée » / « ✨ Codex révélé »
      (file d'attente, jamais en plein combat — modèle level-up).
- [x] CSS `css/codex.css` : parchemin (4 fonds par Acte, placeholder dégradé +
      filtre), états (grisé/voilé/révélé/corrompu), responsive (96vw, accordéon
      par section comme la fiche perso).
- **Vérif** : scénario `tests/smoke.js` dédié (`scenarioCodexOpen`,
      `scenarioCodexUnlockOnFloor`) ; le Codex s'ouvre, une entrée se déverrouille
      en descendant.

### Lot 4 — Lieux & Glossaire (robinet étage/Acte) ✅
- [x] Entrées `lieux` depuis les fiches sensorielles [10 §10.2] : `grande_salle`,
      `couloirs_poudlard` (A), `cachots_poudlard` (B), `profondeurs_oubliees` (C)
      — `ruines_anciennes` (D) déjà livrée en Lot 2. Robinet `floor`.
- [x] Entrées `glossaire` depuis §12.7 : `echos_temporels`, `tenebreux`
      (robinet `victory`), + MP dans Glossaire (décision : pas de 8ᵉ onglet) :
      `cheminette_inter_mondes`, `voyageur`, `mondes_paralleles`.
- [x] Le « Codex de lieu » [10 §10.9] = cette section (aucune couche neuve,
      pur ajout de données à `CODEX_ENTRIES`).
- [x] Bump `codex.js?v=2` + `CACHE_VERSION` v96. Couvert par `tests/units.js`
      (déverrouillage par zone A/B/C/D + victoire).
- **Vérif** : `node tests/units.js` + `node tests/smoke.js` verts. ✅
- **Écart** : MP (Cheminette niv. 8) gaté par `floor:8` (proxy de la
      disponibilité du sort) — pas de type de condition `spell` ajouté
      (hors-scope Lot 4).

### Lot 5 — Personnages & Objets + variantes Maison
- [ ] Entrées `personnages` (Fondateurs, PNJ-lore) + `objets` (légendaires,
      Grimoire d'Élara, Larmes de Fumseck). Robinet `quest`/`monster`/palier.
- [ ] `variants.house` (notes marginales) lues par `codexVariantNote`.
- **Vérif** : note marginale visible seulement pour la bonne `chosenHouse`.

### Lot 6 — Échos temporels (zone D) + états corrompus
- [ ] `temporalEchoSeen` alimenté en zone D (dépend de
      [`ambiance-zone-d-fx.md`](ambiance-zone-d-fx.md)). Robinet `echo`.
- [ ] États `corrupted` (givre dans l'encre) sur les entrées-phares.
- **Vérif** : entrée bascule en `corrupted` à l'étage 14+ (unit + smoke).

## Variables & globals (récap)

| Global | Nouveau ? | Sérialisé | MANIFEST |
|--------|-----------|-----------|----------|
| `unlockedCodexEntries` (Set) | 🔧 oui | oui | oui |
| `floorReached` (int max) | 🔧 oui | oui | oui |
| `temporalEchoSeen` (Set) | 🔧 oui (Lot 6) | oui | oui |
| `seenMonsters` / `monsterKills` | ✅ existe | oui | ✅ |
| `CODEX_ENTRIES` + helpers | 🔧 oui | n/a (pur) | oui |

> Entrées **créature** = **dérivées** de `seenMonsters`/`monsterKills` (pas
> stockées dans `unlockedCodexEntries`) → pas de double source de vérité.

## Garde-fous (transverses, guidelines)

- [ ] **§5** : ce plan tenu à jour à chaque lot (cocher / noter écarts).
- [ ] **§7** : `node tests/units.js` (helpers purs) + `node tests/smoke.js`
      (scénarios Codex) verts avant commit de chaque lot.
- [ ] **§8** : tout `js/*.js` ou `css/*.css` ajouté/modifié → **bump cache PWA**
      (skill `cache-bump`) : `?v=N` dans `index.html` + `PRECACHE_URLS` de `sw.js`,
      `CACHE_VERSION`++. Vérifier `node tools/check_cache_versions.js --base
      origin/master` + `node tests/pwa-smoke.js`.
- [ ] **§6** : vérifier l'état de la PR avant push.
- [ ] **Loader** : tout nouveau global critique au MANIFEST (`codex.js`,
      `ui-codex.js`, `unlockedCodexEntries`, `floorReached`).

## Risques / points d'attention

- **Collision `#char-detail`** : créer `#codex-modal` dédié (ne jamais écraser
  `#char-detail`, partagé fiche/quêtes — CLAUDE.md).
- **Notifications en combat** : file d'attente obligatoire (modèle level-up) —
  ne jamais interrompre un tour.
- **Migration save** : `unlockedCodexEntries` absent d'un vieux save → `new Set()`
  (idempotent, comme `monsterKills`).
- **Perf** : `checkCodexUnlocks` ne ré-évalue que sur événement (pas par frame).

## Décisions à arbitrer (bloquantes avant Lot 3)

1. ❓ Conteneur : `#codex-modal` dédié (recommandé) vs `#char-detail`.
2. ❓ 8ᵉ onglet « Voyageur » (MP) ou Glossaire/Objets (proposition : ce dernier).
3. ❓ États `corrupted` : généralisés ou réservés aux entrées-phares.
4. ❓ Notification « nouvelle créature » branchée sur le hook unifié ?

## Écarts constatés

- **`temporalEchoSeen` → réutilise `seenEchoes` (existant).** Depuis la
  rédaction du plan, le système d'échos temporels zone D a été livré
  (`floor-ambiance.js — TEMPORAL_ECHOES`, `state.js — seenEchoes` Set sérialisé,
  onglet « Mémoire des Ruines » dans `ui-bestiary.js`). Créer un nouveau global
  `temporalEchoSeen` ferait **double source de vérité** (interdit CLAUDE.md). Le
  robinet `echo` du Codex lit donc `seenEchoes` (ctx.echoSeen) — **aucun nouveau
  global échos**. Seuls `unlockedCodexEntries` (Set) et `floorReached` (int) sont
  ajoutés.
- **`riddle` (robinet stèle) : pas de global dédié.** Pas de `riddlesSolved`
  persistant dans l'existant. `codexEntryState` lit `ctx.riddlesSolved` (Set,
  testé purement) ; `buildCodexContext` le dérive au mieux de `runeStele.solved`
  (best-effort, défensif). Aucune entrée Lot 1-3 ne dépend strictement de
  `riddle`, donc pas de nouveau global requis ici.

## Journal d'implémentation

- **Lot 1** (fondation pure) : `js/codex.js` créé (registre + 4 helpers purs),
  chargé après `riddles.js`, ajouté au MANIFEST, couvert par `tests/units.js`
  (matrice d'états sur tous les types de condition). ✅
- **Lot 2** (trame principale) : entrées §12.4 prioritaires rédigées dans
  `CODEX_ENTRIES` + robinet Éclat (`eclatProgress`). ✅
- **Lot 3** (menu jouable) : globals `state.js` + `ui-codex.js` + `#codex-modal`
  + bouton 📖 + `css/codex.css` + `checkCodexUnlocks` branché aux hooks autoSave
  + scénarios smoke. ✅
