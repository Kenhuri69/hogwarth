# Plan — Étendre le nombre d'adversaires (jusqu'à 5)

> Branche : `claude/extend-opponent-count-yoIoJ`
> Statut : 🟡 plan en cours d'amendement — implémentation pas démarrée.

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

## Temps 1 — Implémentation

### Étape 1.1 — Constante de cap partagée
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

## Temps 2 — Simulation & calibrage

### Étape 2.1 — Miroir sim de `rollGroupSize` (tools/sim-difficulty.js:702)
- Répliquer fidèlement la logique étendue (p1..p5, gating endgame/duo).
- La fonction sim ne reçoit pas `victoryAchieved` : ajouter un paramètre
  (ex. `cfg.endgame`/`cfg.victory`) pour modéliser le contexte endgame.
- Étendre les compteurs `groupSizes = {1,2,3}` → `{1,2,3,4,5}` (lignes ~1458-1483).
- Composition de groupe (`Array.from({length:size}, …)`, lignes 1466/1593) :
  déjà générique, pioche variée — OK.
- **Vérif** : `node tools/sim-difficulty.js` tourne sans erreur, rapporte les
  parts de 4 et 5 ennemis en contexte endgame duo.

### Étape 2.2 — Lancer la sim & analyser
- Exécuter la sim sur les scénarios endgame (duo, étages 11+, n croissant,
  difficultés Normal/Difficile/Expert).
- Mesurer : taux de win d'étage, durée de combat (tours), létalité. Vérifier
  que 4-5 ennemis donnent un pic de difficulté **assumé mais franchissable**.
- **Vérif** : tableau de résultats consigné dans ce plan (taux de clear par
  taille de groupe et difficulté).

### Étape 2.3 — Ajuster les probabilités
- Régler `quadBonus`/`quintBonus` (et seuils `n`) selon la sim — répercuter
  **à l'identique** dans `battle.js` ET `sim-difficulty.js` (pas de dérive).
- **Vérif** : re-run sim ; courbe de difficulté validée ; `node tests/smoke.js` vert.

---

## Critères de succès globaux
- [ ] Combats de 4 et 5 ennemis possibles, gatés endgame + duo.
- [ ] Rendu propre desktop **et** mobile (≤700px) sans débordement.
- [ ] Invocations (`summon`) respectent le cap 5.
- [ ] `node tests/smoke.js` vert (avec nouveau scénario ≥4 ennemis).
- [ ] Sim étendue + probabilités calibrées (parité battle.js ↔ sim).
- [ ] `CLAUDE.md` à jour.

## Écarts / décisions (journal vivant)
- 2026-05-31 : plan créé. Cap=5, gating endgame+duo, pic de difficulté assumé.
  Constantes quad/quint = placeholders à calibrer au Temps 2.
