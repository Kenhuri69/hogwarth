# Plan — Correction des bugs HIGH (revue de code mai 2026)

Revue complète des sources → 4 bugs classés HIGH. Vérification approfondie :
le bug #3 est un **faux positif** (cf. ci-dessous). 3 corrections réelles.

## Étapes

### 1. teleport.js — mort non déclenchée en solo (`_portusTriggerTrap`)
- **Problème** : le piège Portus blesse `party.slice(0, partySize)` mais teste
  la mort avec `party.every(c => c.hp <= 0)`. En solo, `party[1]` (Hermione)
  est un objet plein jamais blessé → la condition est toujours fausse → un
  joueur solo tué par le piège ne meurt jamais.
- **Fix** : remplacer `party.every(...)` par
  `party.slice(0, partySize).every(...)`.
- **Vérif** : grep confirme un seul site ; cohérent avec les 2 autres usages
  de `slice(0, partySize)` dans la même fonction.

### 2. save.js — ré-octroi des récompenses de Maison à chaque chargement
- **Problème** : `_migrateHouseRewards()` (save.js:436) s'exécute
  inconditionnellement dans `_applyState`. Il ré-ajoute les items de palier
  dans `pendingHouseRewards` si l'item n'est ni en sac ni équipé → un
  légendaire consommé/vendu est re-gagnable à chaque `loadGame`.
- **Fix** : n'exécuter la migration que pour les saves *legacy* qui ne
  possèdent pas le champ `pendingHouseRewards` :
  `if (!('pendingHouseRewards' in gs)) _migrateHouseRewards();`
- **Vérif** : `_serializeState` (save.js:205) sérialise toujours
  `pendingHouseRewards` → tout save moderne a le champ ; seuls les saves
  antérieurs à la PR houses-2.0 en sont dépourvus.

### 3. (FAUX POSITIF) battle.js — `guardTurns` non réinitialisé
- **Analyse** : le retour anticipé de `enemyTurn` (battle.js:341) saute bien
  `guardTurns = [0,0]` (ligne 402), MAIS `startBattle` (battle.js:146)
  réinitialise `guardTurns = [0,0]` au début de chaque combat. `guardTurns`
  n'est lu que dans `enemyTurn`, jamais hors combat → aucune Garde fantôme
  ne se reporte. **Pas de correction nécessaire.**

### 4. battle-spells.js — sort gaspillé sur un ennemi mort
- **Problème** : `castSpellInBattle` fait
  `enemyGroup[targetIdx >= 0 ? targetIdx : 0]`. Avec `targetIdx` indéfini
  (un seul ennemi vivant, pas de sélection de cible) et l'ennemi d'index 0
  déjà mort, le sort de dégâts tape un cadavre — PM déjà déduits.
- **Fix** : si l'ennemi résolu est absent ou mort, retomber sur le premier
  ennemi vivant via `livingEnemies()[0]`.
- **Vérif** : `livingEnemies()` est défini dans battle.js et déjà utilisé
  dans `enemyTurn`. Inoffensif pour les sorts à cible alliée (`enemy` non
  utilisé par `support_regen`).

## Vérification finale
- `node tests/smoke.js` doit rester vert.
- Commit + push sur `claude/code-review-bugs-7zdJf`.

## Suivi
- [x] Étape 1 — teleport.js
- [x] Étape 2 — save.js
- [x] Étape 3 — faux positif, aucune action
- [x] Étape 4 — battle-spells.js
- [x] Smoke test
