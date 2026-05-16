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

## Suivi HIGH
- [x] Étape 1 — teleport.js
- [x] Étape 2 — save.js
- [x] Étape 3 — faux positif, aucune action
- [x] Étape 4 — battle-spells.js
- [x] Smoke test

---

# Correction des bugs MED

8 bugs MED identifiés. Vérification : 2 faux positifs écartés.

- [x] **M1 — battle.js `doFlee`** : la fuite garantie testait `c.equipped.acc`,
  clé supprimée par la migration ; le Balai est `slot:"trinket"`. Fix :
  balayer tous les slots via `Object.values(c.equipped)`.
- [x] **M2 — FAUX POSITIF** : `endBattle` `e.gold` ne peut pas être un objet,
  `scaleMonster` (dungeon.js:96) normalise déjà `{min,max}` en nombre.
- [x] **M3 — movement.js `rest()`** : `restCooldown` non posé quand le repos
  déclenche une rencontre → spam possible. Fix : `restCooldown = 5` avant
  `startBattle`.
- [x] **M4 — shop.js `_purchase`** : `player.gold < price` laissait passer un
  `gold` non-numérique. Fix : garde `Number.isFinite` (cohérent avec les
  gardes `(player.gold||0)` déjà présentes dans le fichier).
- [x] **M5 — save.js `_applyState`** : ne masquait que `encounter-overlay` et
  `explore-overlay`. Fix : masquer aussi `npc-dialog-overlay`
  (`style.display`) et `floor-transition` (`classList.remove('active')`).
- [x] **M6 — ui-bestiary.js `_renderDangerHtml`** : label `/10` alors que
  l'échelle danger est 1–11. Fix : `/11`.
- [x] **M7 — swipe-canvas.js `_swipeBlocked`** : testait `style.display`
  inline ; `floor-transition` est piloté par `classList`. Fix :
  `getComputedStyle(el).display`.
- [x] **M8 — NON-BUG** : `sel.querySelector('div')` (teleport.js) renvoie bien
  le div titre (premier descendant en ordre document). Fragile mais correct ;
  aucune correction.
- [x] Smoke test final
