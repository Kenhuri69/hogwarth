# Prompts de lancement — sessions parallèles

> ✅ **CLOS le 2026-06-08 — tous les chantiers livrés & mergés.** Les cinq lots
> (B3, B4, C3b, D4, LOT F) sont terminés ; leurs plans sont archivés dans
> `.claude/plans/_archive/`. Ce fichier est conservé pour mémoire ; aucun
> prompt n'est plus à lancer. Seul reliquat non bloquant : le test live manuel
> 2 clients de LOT F (`tests/parallel-live-checklist.md`), qui exige deux
> clients humains contre le backend Supabase.

> **But** : démarrer chaque chantier restant de la revue
> [`game-features-review.md`](./game-features-review.md) dans **sa propre session**
> (branche/PR dédiée). Chaque bloc ci-dessous est **auto-suffisant** : copie-le tel
> quel comme premier message d'une nouvelle session Claude Code.
>
> **Source** : `game-features-review.md` §3 (lots A–F) + §4 (ordre d'exécution).
> Établi le 2026-05-30 après vérification de l'état réel du dépôt (A, B1/B2,
> C1/C2/C4/C5, D1/D2/D3 livrés & mergés ; reste ci-dessous).
>
> **Règles communes à toutes les sessions** (déjà rappelées dans chaque prompt) :
> - Vanilla JS, **zéro build / zéro dépendance**, scope global séquentiel (`<script>`).
> - `node tests/smoke.js` **vert** avant tout commit ; ajouter un scénario si le
>   comportement est testable (guidelines §7).
> - Tout nouveau global critique → l'ajouter au `MANIFEST` de `js/loader.js`.
> - Saves rétro-compatibles : défaut sûr dans `_applyState` (save.js), migration
>   idempotente, jamais de réassignation `player`/`party` (règle d'or).
> - Plan écrit obligatoire et vivant (guidelines §5) ; vérifier l'état de la PR
>   avant push (guidelines §6). **Ne pas ouvrir de PR sans demande explicite.**

---

## 1. LOT B3 — Nouveaux archétypes de capacités ennemies (boss & élites)

> Statut : ✅ **livré & mergé** (2026-06-08). Plan archivé :
> [`_archive/enemy-ability-archetypes.md`](./_archive/enemy-ability-archetypes.md).
> Handlers `summon`/`enrage_self`/`aura` en place, boss porteurs (Fenrir,
> Aragog, Héraut des Ténèbres), scénario smoke `scenarioEnemyAbilityArchetypes`.

```
Contexte : RPG tour par tour vanilla JS (dépôt hogwarth). La revue
.claude/plans/game-features-review.md §3 LOT B3 demande d'enrichir la
profondeur de combat des boss/élites avec 2-3 archétypes de capacités
ennemies réellement distincts (aujourd'hui les 68 monstres clonent ~6
effets : damage/heal/weaken/drain/status/dispel).

Tâche : implémenter le LOT B3.
1. Crée d'abord un plan écrit .claude/plans/enemy-ability-archetypes.md
   (guidelines §5), vivant.
2. Ajoute 2-3 nouveaux effets de capacité dans le routeur tryEnemyAbility
   (js/battle.js) + leur déclaration data sur les monstres (js/monsters.js) :
   - `summon`     : invoque un add si un slot ennemi est libre (max 3 ennemis,
     cf. enemyGroup) ;
   - `enrage_self`: l'ennemi gagne de l'ATK quand il passe sous un seuil de PV ;
   - `taunt`/`aura` : applique un debuff de groupe persistant aux héros
     (réutilise le système applyStatus/STATUS_DEFS de js/battle.js).
3. N'applique ces capacités QU'aux boss/élites (epic / étages 8+), pas aux 68
   monstres. Garde-fou : capacité absente → comportement actuel inchangé.
4. Chaque nouvel effet a un handler dédié ET un scénario smoke dédié
   (tests/smoke.js) qui asserte l'effet (add invoqué / ATK augmentée / debuff
   de groupe posé).

Contraintes : zéro build/dépendance, scope global séquentiel. node
tests/smoke.js doit rester vert. Nouveau global critique → MANIFEST de
js/loader.js. Saves rétro-compatibles. Développe sur une branche dédiée
claude/enemy-ability-archetypes-b3. Ne pas ouvrir de PR sans qu'on te le
demande. Lis .claude/plans/game-features-review.md §3 LOT B + le « TEMPLATE »
en bas de js/monsters.js avant de commencer.
```

---

## 2. LOT B4 — Rééquilibrage de Legilimens (optionnel — décision d'abord)

> Statut : ✅ **livré & mergé** (2026-06-08). Levier retenu : **(b) coût en PM
> croissant à chaque lancer** (`legilimensCastsThisFight`, `LEGILIMENS_COST_STEP`).
> Plan archivé : [`_archive/legilimens-rebalance.md`](./_archive/legilimens-rebalance.md).
> Scénario smoke `scenarioLegilimensEscalation`.

```
Contexte : dépôt hogwarth, RPG tour par tour vanilla JS. La revue
.claude/plans/game-features-review.md §3 LOT B4 signale que le sort Legilimens
est spammable tant qu'il reste du PM (js/battle-spells.js:22-26, 516-523 ;
legilimensCancelCharges remis à 0 en début de combat, js/battle.js:349).

Tâche : décider PUIS, si retenu, rééquilibrer.
1. Commence par poser la question à l'utilisateur (AskUserQuestion) : faut-il
   le rééquilibrer, et selon quel levier — (a) cap de charges par combat,
   (b) coût en PM croissant à chaque lancer, (c) ne rien faire ?
2. Si un levier est retenu : rédige un mini-plan
   .claude/plans/legilimens-rebalance.md, implémente le levier choisi dans
   js/battle-spells.js, ajoute un scénario smoke qui vérifie la limite (ex.
   2e lancer refusé, ou coût accru).

Contraintes : zéro build/dépendance. node tests/smoke.js vert avant commit.
Saves rétro-compatibles. Branche dédiée claude/legilimens-rebalance-b4. Pas de
PR sans demande explicite.
```

---

## 3. LOT C3b — Bibliothèque Interdite à deux voies (axe alternatif par sort)

> Statut : ✅ **livré & mergé** (2026-06-08). Plan archivé (7/7 cases) :
> [`_archive/library-spell-axis-c3b.md`](./_archive/library-spell-axis-c3b.md).

```
Contexte : dépôt hogwarth, RPG vanilla JS. Le plan
.claude/plans/library-spell-axis-c3b.md (LOT C.3b de game-features-review.md)
scinde l'upgrade de la Bibliothèque Interdite en 2 voies verrouillées au 1er
upgrade (modèle de la Forge C3a, cf. .claude/plans/forge-library-choice.md),
au lieu d'appliquer simultanément power+2 / cost-1 / chance+0.05.

Tâche : reprendre ce plan et le mener à terme.
1. Lis .claude/plans/library-spell-axis-c3b.md en entier ; vérifie l'état réel
   du code (js/library.js, modale #library-modal, tests/smoke.js
   scenarioLibraryUpgrade) — une partie est peut-être déjà faite.
2. Implémente ce qui manque : champ spellPaths sur l'upgrade, choix de voie
   verrouillé, migration idempotente des sorts déjà upgradés (saves), UI de
   sélection de voie dans la modale Bibliothèque.
3. Mets le plan à jour au fil de l'eau (cocher, noter les écarts).
4. node tests/smoke.js vert + scénario qui asserte que chaque voie applique le
   bon bonus.

Contraintes : zéro build/dépendance, scope global. Nouveau global critique →
MANIFEST js/loader.js. Saves rétro-compatibles (items/sorts déjà upgradés
gardent leur bonus). Branche claude/library-spell-axis-c3b. Pas de PR sans
demande explicite.
```

---

## 4. LOT D4 — Aide reprenable par section (help-tour)

> Statut : ✅ **livré & mergé** (2026-06-08). Plan archivé (7/7 cases) :
> [`_archive/help-tour-sections-d4.md`](./_archive/help-tour-sections-d4.md).

```
Contexte : dépôt hogwarth, RPG vanilla JS. Le plan
.claude/plans/help-tour-sections-d4.md (LOT D4 de game-features-review.md)
veut permettre de relancer l'aide PAR SECTION (menu « Quelle aide ? ») plutôt
que de rejouer le help-tour depuis l'étape 1 (js/help-tour.js).

Tâche : reprendre ce plan et le mener à terme.
1. Lis .claude/plans/help-tour-sections-d4.md en entier ; vérifie l'état réel
   (js/help-tour.js : openHelpMenu/closeHelpMenu/helpMenuStart, DOM associé,
   tests/smoke.js scenarioHelpTour) — une partie est peut-être déjà faite.
2. Implémente/finalise le menu de sélection de sujet + le démarrage ciblé par
   section. Mets le plan à jour (cocher, écarts).
3. node tests/smoke.js vert + scénario qui asserte que relancer l'aide propose
   un choix de sujet et démarre à la bonne section.

Contraintes : zéro build/dépendance. Nouveau global critique → MANIFEST
js/loader.js. Branche claude/help-tour-sections-d4. Pas de PR sans demande
explicite.
```

---

## 5. LOT F — Stabilisation « Mondes Parallèles » (session dédiée)

> Statut : ✅ **stabilisé & mergé** (2026-06-08). Plan archivé :
> [`_archive/parallel-worlds-stabilization.md`](./_archive/parallel-worlds-stabilization.md)
> (migrations appliquées, chemins d'erreur durcis, disjoncteurs 404, ~16
> scénarios mp/visit verts). **Seul reliquat non bloquant** : test live manuel
> 2 clients (`tests/parallel-live-checklist.md`) + test optionnel hors-scope.

```
Contexte : dépôt hogwarth, RPG vanilla JS avec un système social « Mondes
Parallèles / Cheminette Inter-Mondes » (multijoueur asynchrone via Supabase
REST). Le plan .claude/plans/parallel-worlds-stabilization.md est
auto-suffisant et décrit l'intégralité du chantier (LOT F de
game-features-review.md). Décision actée : STABILISER (Option 1), pas geler.

Tâche : exécuter ce plan, étape par étape, dans cette session dédiée.
1. Lis .claude/plans/parallel-worlds-stabilization.md en entier (il ne suppose
   aucun contexte d'une autre session).
2. Avant tout travail Supabase : vérifie la config réelle (tables existantes,
   RLS, clés) via le serveur MCP Supabase. NE COMMIT JAMAIS de secret. Le DDL
   des tables mp_visit_* est décrit dans .claude/plans/parallel-worlds.md §12.
3. Applique les migrations manquantes, durcis les chemins d'erreur réseau
   (timeouts, retries, dégradation propre offline), valide une visite
   end-to-end, mets le plan à jour au fil de l'eau.
4. node tests/smoke.js vert ; les ~16 scénarios mp/visit existants restent
   verts ; ajoute un scénario pour tout nouveau garde-fou.

Contraintes : zéro build/dépendance côté jeu. Saves rétro-compatibles. Nouveau
global critique → MANIFEST js/loader.js. Branche
claude/parallel-worlds-stabilization. Pas de PR sans demande explicite.
```

---

## Suivi

| Chantier | Prompt | État au 2026-06-08 |
|----------|--------|--------------------|
| B3 — archétypes capacités ennemies | §1 | ✅ livré & mergé |
| B4 — rééquilibrage Legilimens       | §2 | ✅ livré & mergé (levier b) |
| C3b — Bibliothèque 2 voies          | §3 | ✅ livré & mergé |
| D4 — aide par section               | §4 | ✅ livré & mergé |
| LOT F — Mondes Parallèles           | §5 | ✅ stabilisé & mergé (test live manuel restant, non bloquant) |

> Les lots A, B1, B2, C1, C2, C4, C5, D1, D2, D3 sont **livrés & mergés**
> (cf. `game-features-review.md` §6 + plans associés) — aucun prompt requis.
