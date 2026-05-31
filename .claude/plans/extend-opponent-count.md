# Plan — Étendre le nombre d'adversaires (jusqu'à 5)

> Branches : Temps 1 → `claude/extend-opponent-count-yoIoJ` (mergé PR #339).
> Temps 2 → `claude/extend-opponent-count-sim`.
> Statut : 🟢 Temps 1 & Temps 2 implémentés et testés (146/146 smoke,
> distribution sim validée — quad ≥ quint, solo jamais > 3).

## Objectif

Étendre la taille maximale d'un groupe ennemi de **3 → 5**, en deux temps :

1. **Temps 1 — implémentation** : débloquer les groupes de **4 et 5**
   ennemis, ciblés **endgame + mode duo**, avec une composition de niveaux
   variés (déjà assurée par `pickSimilarEnemy`, qui pioche dans tout le pool
   éligible pondéré). Layout adaptatif pour 4-5 cartes (desktop + mobile).
2. **Temps 2 — simulation & calibrage** : étendre `tools/sim-difficulty.js`
   pour modéliser 4-5 ennemis, lancer la sim, puis ajuster finement les
   probabilités de tirage.

**Décisions de design validées avec l'utilisateur :**
- Cap max = **5**.
- Apparition : **endgame + duo** d'abord (groupes de niveaux variés), puis
  calibrage par simulation.
- Équilibrage : **pic de difficulté assumé** (4-5 ennemis = combat dur et
  gratifiant) ; on touche seulement aux plafonds anti-farm si nécessaire.

## État des lieux (audit code)

Bonne nouvelle : l'architecture est **déjà majoritairement dynamique**.
Seuls 2 endroits codent en dur la limite de 3 :

| # | Fichier | Ligne(s) | Nature | Action |
|---|---------|----------|--------|--------|
| A | `js/battle.js` `rollGroupSize()` | 471-514 | Ne tire que 1/2/3 (`p1,p2,p3`, `return 3`) | **À étendre** |
| B | `js/battle-spells.js` capacité `summon` | ~184 | `enemyGroup.length >= 3` (cap d'invocation) | **À étendre** |

Déjà dynamique (aucune modif fonctionnelle requise) :
- `startBattle()` construit `enemyGroup` via une boucle `for i < size` (battle.js:424-431).
- `renderEnemyGroup()` (battle-ui.js:131) : itère, IDs `enemy-card-${i}`.
- `showTargetSelection()` (battle-ui.js:27) : un bouton par ennemi vivant.
- `UX.floatDmg('enemy:'+i)` : index dynamique, pas de cap `enemy-2`.
- `_combatSampleKey()` : ne dépend pas de la taille du groupe.
- CSS `.enemy-group-container` : `display:flex; gap:10px` (pas de grille fixe).
- `tests/smoke.js` : assert `enemyGroup.length > 0` seulement.

Point d'attention layout : le flex **n'a pas `flex-wrap`** et les cartes en
mode multi font 56px d'icône + 120px de barres. 5 cartes ≈ 640px → déborde
en mobile (~360px). → taille adaptative + wrap nécessaires.

---

## Temps 1 — Implémentation ✅

> Décision A retenue : gating strict **duo + post-victoire + étage ≥ 11**
> (pas d'élargissement aux étages 7-10 hors post-victoire).
> Toutes les étapes ci-dessous sont faites et validées par
> `node tests/smoke.js` (146/146, dont `scenarioLargeEnemyGroup`).

### Étape 1.1 — Constante de cap partagée ✅ (`data.js` — `MAX_ENEMY_GROUP = 5`)
- Ajouter `const MAX_ENEMY_GROUP = 5;` dans `js/data.js` (section constantes,
  près de `MAP_W/H`, `CELL`…).
- **Vérif** : `grep MAX_ENEMY_GROUP js/data.js` ; chargé avant battle.js/battle-spells.js (ordre OK).

### Étape 1.2 — Étendre `rollGroupSize()` (js/battle.js)
- Généraliser le schéma `p1,p2,p3` → ajouter `p4`, `p5`.
- Conserver **intacte** la politique baseline existante (1/2/3) pour ne pas
  régresser le cœur du jeu.
- Ajouter un transfert `p3→p4→p5` **gaté** :
  ```
  endgameQuad = (partySize === 2) && victoryAchieved && currentFloor >= 11
  ```
  (valeurs de départ = placeholders, calibrées au Temps 2) :
  - `quadBonus  = endgameQuad ? min(0.30, 0.06·max(0, n-6)) : 0`  (n = floor(kills/4))
  - `quintBonus = endgameQuad && n >= 10 ? min(0.20, 0.05·(n-9)) : 0`
  - `p3 -= quadShift; p4 += quadShift;` puis `p4 -= quintShift; p5 += quintShift;`
- Retour : `if (r < p1) 1; … ; if (r < p1+p2+p3+p4) 4; return 5;`
- Mettre à jour le commentaire d'en-tête (« Renvoie 1 à 5 »).
- **Vérif** : sanity check unitaire (node) — sommes de proba = 1 ; à floor ≤ 10
  ou solo, ne retourne jamais > 3 ; en duo post-victoire 11+ avec n élevé,
  retourne parfois 4-5.

### Étape 1.3 — Étendre le cap d'invocation (js/battle-spells.js)
- `if (enemyGroup.length >= 3)` → `if (enemyGroup.length >= MAX_ENEMY_GROUP)`.
- Mettre à jour le commentaire « cap 3 » → « cap MAX_ENEMY_GROUP ».
- **Vérif** : `grep -n "MAX_ENEMY_GROUP" js/battle-spells.js`.

### Étape 1.4 — Layout adaptatif des cartes (js/battle-ui.js + css/style.css)
- `renderEnemyGroup()` : remplacer `sizePx = count === 1 ? 80 : 56` par des
  paliers : `count === 1 → 80`, `count <= 3 → 56`, `count >= 4 → 44`.
  Idem largeurs de barres (`120px` → `96px` en mode 4-5) et tailles de police.
- CSS `.enemy-group-container` : ajouter `flex-wrap: wrap;` (wrap sur 2 lignes
  quand ça déborde, notamment mobile). Vérifier l'alignement (`align-items`).
- **Vérif** : ouvrir le jeu, forcer un combat à 4 puis 5 ennemis (console :
  hack temporaire ou save endgame), contrôler desktop + viewport ≤700px : pas
  de débordement horizontal, barres/cibles cliquables.

### Étape 1.5 — Plafonds anti-farm (revue, pic assumé)
- Vérifier `ironman.js` : `killsCrédités = min(totalKills, étageMax×12)` — le
  plafond existant absorbe déjà l'inflation de kills des gros groupes. Pas de
  changement attendu, **à confirmer** (gros groupes endgame ne doivent pas
  faire exploser le score au-delà du plafond).
- Points de Maison : gain par kill inchangé (pic assumé). Noter le risque
  d'accélération du gold-sink/tiers en endgame ; acceptable.
- **Vérif** : relecture ciblée, pas de régression de formule.

### Étape 1.6 — Smoke test + doc
- Ajouter/étendre un scénario `tests/smoke.js` validant qu'un combat à ≥ 4
  ennemis se rend et se résout sans erreur (sélection de cible, dégâts
  flottants, victoire). Forcer le groupe via stub plutôt que via RNG.
- Mettre à jour `CLAUDE.md` : sections « Taille des groupes ennemis »,
  « Difficulté progressive », « Système de combat » (enemyGroup 1 à 5),
  commentaire `summon`.
- **Vérif** : `node tests/smoke.js` vert.

---

## Temps 2 — Simulation & calibrage ✅

### Étape 2.1 — Miroir sim de `rollGroupSize` ✅
- `simMaxGroupSize(floor, partySize, cfg)` ajouté (miroir de
  `currentMaxGroupSize`, gate `cfg.endgame && partySize===2 && floor>=11`).
- `rollGroupSize` (sim) étendu : p4/p5 + bump trio endgame +0.10 (parité runtime).
- Compteurs `groupSizes` → `{1,2,3,4,5}`. Composition `Array.from` inchangée
  (pioche variée OK).
- Section de rapport **3bis** (distribution des tailles, affichée en `--endgame`).
- Drive par `--endgame kills=N` (n = floor(kills/4)).

### Étape 2.2 — Sim lancée & analysée ✅
Distribution (Duo endgame, n=400-800 sims) — **APRÈS recalibrage** :

| n (kills) | 2 | 3 | 4 | 5 | moy. |
|-----------|---|---|---|---|------|
| 7 (28)    | 13% | 81% | 6%  | 0%  | 2.93 |
| 10 (40)   | 5%  | 75% | 19% | 1%  | 3.16 |
| 20 (80)   | 5%  | 70% | 14% | 10% | 3.30 |

Solo : **0 % de 4-5 à tous les étages** (gating vérifié). Quad ≥ quint partout.

Win-rate Duo (kills=80, farm max), étages 11-20 : 100/100/100/100/96/85/73/49/20/10 %.
→ Pic de difficulté **assumé** en profondeur (étages 18-20), franchissable
avant cela. Le sim ne modélise pas le sur-équipement/sur-niveau réellement
gagné par le farming → difficulté réelle plus douce que ces chiffres.

### Étape 2.3 — Probabilités ajustées ✅
Défaut corrigé : la formule initiale (transfert chaîné absolu) produisait
**quint > quad** à farm max (5 plus fréquent que 4, contre-intuitif).
Nouvelle formule (parité `battle.js` ↔ `sim-difficulty.js`) :
```
quadBonus  = min(0.25, 0.05·max(0, n-6))      // p3 → p4, démarre n>6
quintFrac  = (n>=10) ? min(0.40, 0.05·(n-9)) : 0
quintShift = p4 · quintFrac                    // p4 → p5, FRACTION ⇒ quad ≥ quint
```
- **Vérif** : re-run sim (distribution propre, quad ≥ quint) ;
  `node tests/smoke.js` **146/146**.

---

## Critères de succès globaux
- [x] Combats de 4 et 5 ennemis possibles, gatés endgame + duo.
- [x] Rendu propre desktop **et** mobile (≤700px) sans débordement.
- [x] Invocations (`summon`) respectent le cap 5.
- [x] `node tests/smoke.js` vert (avec nouveau scénario ≥4 ennemis).
- [x] Sim étendue + probabilités calibrées (parité battle.js ↔ sim).
- [x] `CLAUDE.md` à jour.

## Écarts / décisions (journal vivant)
- 2026-05-31 : plan créé. Cap=5, gating endgame+duo, pic de difficulté assumé.
  Constantes quad/quint = placeholders à calibrer au Temps 2.
- 2026-05-31 : **Temps 1 implémenté** (décision A — gating strict duo +
  post-victoire + étage 11+). Fichiers touchés : `js/data.js` (constante),
  `js/battle.js` (rollGroupSize p4/p5), `js/battle-spells.js` (cap summon),
  `js/battle-ui.js` + `css/style.css` (layout adaptatif + flex-wrap),
  `tests/smoke.js` (scénario `scenarioLargeEnemyGroup` + maj test summon),
  `CLAUDE.md`. Placeholders quad/quint : `quadBonus=min(0.30, 0.06·max(0,n-6))`,
  `quintBonus=(n≥10)?min(0.20, 0.05·(n-9)):0`. Smoke 146/146.
- 2026-05-31 : **Correctif gating invocations** (remarque utilisateur : monter
  `MAX_ENEMY_GROUP` relevait le cap summon partout). Extraction d'un helper
  unique `currentMaxGroupSize()` (`battle.js`) = `MAX_ENEMY_GROUP` en
  endgame+duo, **3 sinon**. Utilisé par `rollGroupSize` ET le cap `summon`.
  Conséquence : solo/duo-early restent à 3 ennemis y compris via invocation.
  Smoke 146/146 (assertions `capSolo/capDuoEarly === 3`, `capDuoEnd === 5`).
- 2026-05-31 : **Temps 2 implémenté** (branche `claude/extend-opponent-count-sim`).
  Miroir sim (`tools/sim-difficulty.js`) : helper `simMaxGroupSize`, p4/p5 +
  bump trio endgame +0.10, compteurs `groupSizes` 1-5, section de rapport
  3bis. Recalibrage `battle.js` : quint passe d'un bonus absolu à une
  **fraction** de la bande quad (`quintShift = p4 · quintFrac`), garantissant
  quad ≥ quint (auparavant 5 plus fréquent que 4 à farm max). Sim vérifiée :
  solo 0 % de 4-5 à tous les étages, duo endgame ~14-18 % quad / ~7-13 % quint.
  Smoke 146/146.
