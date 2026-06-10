# Plan — Implémentation Étape 2 du Chapitre 12 (Glossaire & Codex)

**Branche :** `claude/hogwarth-chapter-12-codex-lduabc`
**Source :** `docs/histoire/12-glossaire-et-codex.md` § ÉTAPE 2
**Statut :** 📋 plan d'implémentation — **non démarré** (le chapitre est finalisé
côté narratif ; ce plan cadre le futur dev, à découper en lots et à arbitrer avec
l'utilisateur avant de coder).

> ⚠️ Décisions utilisateur **requises** avant codage : voir « Points à trancher »
> du chapitre (§12 fin). Notamment : conteneur UI (`#codex-modal` dédié vs
> `#char-detail`), 8ᵉ onglet Voyageur, profondeur des états corrompus.

## Principe directeur

Le Codex **unifie l'existant** plutôt que de le réécrire. Le Bestiaire
(`ui-bestiary.js`, codex 2 paliers déjà codé) est **hébergé** comme un onglet ;
on ajoute **un seul** registre de données pour les entrées non-créature et **un
seul** global sérialisé (`unlockedCodexEntries`). Zéro dépendance, zéro build.

## Périmètre — lots (priorisation §VII du chapitre)

### Lot 1 — Squelette data + évaluateur pur (zéro risque, zéro UI)
- [ ] Créer `js/codex.js` : registre `CODEX_ENTRIES[]` (format §12.3) + helpers
      **purs** :
  - `getCodexEntry(id)`
  - `codexEntryState(entry, ctx)` → `'locked'|'veiled'|'revealed'|'corrupted'`
  - `unlockedCodexFor(ctx)` (liste filtrée)
  - `codexVariantNote(entry, chosenHouse, heroKeys)` (note marginale, défensif)
- [ ] Charger `codex.js` **avant** son UI dans `index.html` (après `riddles.js`,
      avant `ui-*`). Ordre : pur registre comme `quests-templates.js`.
- [ ] Ajouter `CODEX_ENTRIES` + helpers au **MANIFEST `loader.js`**.
- [ ] Tests `tests/units.js` : matrice d'états (locked/veiled/revealed/corrupted)
      sur quelques entrées-types et tous les `type` de condition (§12.5.3).
- **Vérif** : `node tests/units.js` vert ; aucun global muté ; jeu inchangé.

### Lot 2 — Entrées trame principale (Histoire & Éclats & Voix)
- [ ] Rédiger dans `CODEX_ENTRIES` les entrées §12.4 prioritaires :
      `cle_de_voute`, `eclat_voute_codex`, `echo_scellement`, `boucle_tenebreuse`,
      `ruines_anciennes`, `froid_surnaturel` (+ voix par Fondateur).
- [ ] Mapper le robinet Éclat : `revealedBy:[{type:"eclat",value:1|2|3}]` calé sur
      le **compte de `eclat_voute`** en inventaire (`eclatProgress`).
- **Vérif** : `codexEntryState` renvoie la bonne version selon le nb d'Éclats
      simulé (unit test).

### Lot 3 — Menu Codex + onglet Bestiaire embarqué + déverrouillage live
- [ ] `state.js` : `unlockedCodexEntries = new Set()` (sérialisé `_serializeState`
      / `_applyState`, migration = Set vide si absent) + `floorReached` (max
      d'étage atteint, sérialisé) + `temporalEchoSeen = new Set()`.
      → ajouter au **MANIFEST loader**.
- [ ] `js/ui-codex.js` (nouveau, après `ui-bestiary.js`) : `openCodex()`,
      `filterCodex()`, `showCodexEntry(id)`. **Réutilise** l'archi
      `ui-bestiary.js` (grille + fiche). Onglet Bestiaire = `openBestiary()`
      existant embarqué (pas de réécriture).
- [ ] `#codex-modal` dans `index.html` (modale dédiée — **pas** `#char-detail`,
      garde-fou CLAUDE.md), bouton 📖 dans la barre de commandes.
- [ ] `checkCodexUnlocks(reason)` : réévalue, diffe vs `unlockedCodexEntries`,
      notifie les nouveautés. Branché aux **points `autoSave`** (fin combat,
      level-up, changement d'étage, quête complétée, Éclat ramassé, stèle résolue).
      Défensif (`typeof` garde).
- [ ] Notifications : toast « 📖 Codex — nouvelle entrée » / « ✨ Codex révélé »
      (file d'attente, jamais en plein combat — modèle level-up).
- [ ] CSS `css/codex.css` : parchemin (4 fonds par Acte, placeholder dégradé +
      filtre), états (grisé/voilé/révélé/corrompu), responsive (96vw, accordéon
      par section comme la fiche perso).
- **Vérif** : scénario `tests/smoke.js` dédié (`scenarioCodexOpen`,
      `scenarioCodexUnlockOnFloor`) ; le Codex s'ouvre, une entrée se déverrouille
      en descendant.

### Lot 4 — Lieux & Glossaire (robinet étage/Acte)
- [ ] Entrées `lieux` depuis les fiches sensorielles [10 §10.2] ; entrées
      `glossaire` depuis §12.7. Robinet `floor`.
- [ ] Le « Codex de lieu » [10 §10.9] = cette section (aucune couche neuve).
- **Vérif** : déverrouillage à l'entrée de chaque zone (A/B/C/D).

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

- (aucun — implémentation non démarrée)
