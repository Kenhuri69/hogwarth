# LOT B3 — Archétypes de capacités ennemies (boss/élites)

> Plan vivant (guidelines §5). Branche : `claude/enemy-ability-archetypes-b3`.
> Source : `.claude/plans/game-features-review.md` §3 LOT B / item B3.
> Objectif : sortir les boss/élites du moule « 6 effets clonés »
> (damage/heal/weaken/drain/status/dispel) en ajoutant 2-3 archétypes
> d'effet réellement distincts, branchés dans le routeur `tryEnemyAbility`.

---

## 0. Constat

Les 68 monstres partagent ~6 effets de capacité. Les boss = gros minions :
aucune mécanique de meute, de montée en puissance, ou de pression de groupe.
LOT B1 (champ `ai`) + B2 (`phases`) sont déjà livrés (#280). B3 ajoute des
**verbes de capacité** nouveaux, réservés aux boss/élites.

## 1. Périmètre & garde-fous

- **Trois nouveaux effets** dans le `switch` de `tryEnemyAbility`
  (`js/battle-spells.js`) :
  - `summon` — invoque un add si un slot ennemi est libre (cap 3, `enemyGroup`).
  - `enrage_self` — l'ennemi gagne de l'ATK une fois passé sous un seuil de PV.
  - `aura` (taunt/aura) — applique un debuff de groupe persistant à tous les
    héros vivants, via `applyStatus` / `STATUS_DEFS` (réutilisation, pas de
    nouveau statut).
- **Réservé aux boss/élites** : on ne déclare ces capacités QUE sur des
  monstres `epic` / étages 8+. Aucun des 68 monstres standards n'est modifié.
- **Garde-fou de compatibilité** : effet inconnu / capacité absente →
  comportement actuel inchangé (le `switch` tombe en `default` implicite et
  `tryEnemyAbility` retourne `true` sans rien faire, OU `return false` quand
  l'effet ne peut pas s'appliquer → attaque physique normale).
- **Saves** : aucun nouveau champ d'état runtime persistant requis.
  `enemy._enraged` / `enemy._summoned` sont des marqueurs de combat (non
  sérialisés, comme `enemy._phaseIdx` déjà existant). Pas de migration.
- **Loader** : `_buildSummonedAdd` est un nouveau global → ajouté au MANIFEST
  (`js/loader.js`).
- **Zéro dépendance / zéro build** : scope global séquentiel conservé.

## 2. Conception des handlers (`tryEnemyAbility`)

### 2.1 `summon`
- Data : `{ effect:'summon', summonId:'<monsterId>', name, icon, chance,
  summonName? }`.
- Si `enemyGroup.length >= 3` → **slot plein**, `return false` (l'ennemi ne
  gaspille pas son tour → attaque physique normale).
- Sinon `_buildSummonedAdd(ability, enemy)` :
  - cherche `MONSTERS[summonId]` → `scaleMonster(template, currentFloor)` ;
  - fallback (template absent) : sbire dérivé du summoner (40 % PV, 60 % ATK) ;
  - dépouille l'add de toute capacité `summon` (anti-cascade) ;
  - `currentHp = hp`, `statusEffects = []`, `_summoned = true`.
- Pousse l'add dans `enemyGroup`, `seenMonsters.add`, `renderEnemyGroup()`.

### 2.2 `enrage_self`
- Data : `{ effect:'enrage_self', hpPct:0.4, atkBonus:N, name, icon, chance }`.
- Si déjà enragé (`enemy._enraged`) **ou** au-dessus du seuil
  (`currentHp > maxHp*hpPct`) → `return false` (rien, attaque normale).
- Sinon : `enemy.atk += atkBonus`, `enemy._enraged = true`, log + render.
- Priorité de sélection : un `enrage_self` prêt à se déclencher passe avant
  le pick IA normal (sinon un boss `aggressive` choisirait toujours `damage`).

### 2.3 `aura`
- Data : `{ effect:'aura', statusId:'weaken'|'fear'|..., power, turns, name,
  icon, chance }`.
- Applique `statusId` à **tous les héros vivants** (`party.slice(0,partySize)`).
- Cas `weaken` : réplique la comptabilité DEF de l'effet `weaken` existant
  (soustraction au cast, restauration à l'expiry par `tickStatuses`).
- Autres statuts (`fear`…) : simple `applyStatus`, durée décomptée nativement.

## 3. Déclaration data (`js/monsters.js`) — boss porteurs

| Boss | Étage | Archétype ajouté |
|------|-------|------------------|
| Aragog (`aragog`) | 9 | `summon` → `acromantula_jeune` (« Couvée Vorace ») |
| Fenrir Greyback (`fenrir_greyback`) | 8 | `enrage_self` (« Rage Lunaire », <40 % PV, +ATK) |
| Héraut des Ténèbres (`heraut_tenebres`) | 10 | `aura` weaken de groupe (« Litanie d'Effroi ») |

(commentaires du TEMPLATE en bas de `monsters.js` étendus pour documenter les
trois nouveaux `effect`.)

## 4. Tests smoke (`tests/smoke.js`)

Nouveau scénario `scenarioEnemyAbilityArchetypes` (ajouté à la liste du
runner) :
- **T1 summon** : ennemi avec `summon` + slot libre → `enemyGroup` grandit ;
  slot plein (3) → `tryEnemyAbility` retourne `false`, taille inchangée.
- **T2 enrage_self** : au-dessus du seuil → pas d'enrage (`return false`,
  ATK inchangée) ; sous le seuil → ATK augmentée du bonus, `_enraged` posé,
  pas de re-déclenchement.
- **T3 aura** : ennemi avec `aura` weaken → tous les héros vivants reçoivent
  le statut `weaken` et perdent de la DEF.

## 5. Critères de vérification

- [x] `node tests/smoke.js` vert (suite complète — 128 scénarios).
- [x] Les 68 monstres standards inchangés (diff limité aux 3 boss + template).
- [x] Capacité absente → comportement identique à avant (garde-fou : effet
  inconnu/inapplicable → `return false` → attaque physique normale).
- [x] MANIFEST à jour (`_buildSummonedAdd`).
- [x] Saves rétro-compatibles (aucun champ persistant ajouté ; `_enraged` /
  `_summoned` sont des marqueurs de combat non sérialisés, comme `_phaseIdx`).

## 6. Journal

| Date | Étape | Statut |
|------|-------|--------|
| 2026-05-30 | Plan rédigé, lecture B + TEMPLATE faite | ✅ |
| 2026-05-30 | Handlers `summon`/`enrage_self`/`aura` + helper `_buildSummonedAdd` (battle-spells.js) | ✅ |
| 2026-05-30 | Data boss : Aragog (summon), Fenrir (enrage_self), Héraut des Ténèbres (aura) + TEMPLATE | ✅ |
| 2026-05-30 | Scénario smoke `scenarioEnemyAbilityArchetypes` (T1/T2/T3) + MANIFEST | ✅ |
| 2026-05-30 | `node tests/smoke.js` complet vert (128/128) | ✅ |

## 7. Écarts / décisions

- `aura` est resté **générique et data-driven** (`statusId` paramétrable) plutôt
  qu'un statut dédié : réutilise pleinement `STATUS_DEFS`/`applyStatus`. Le cas
  `weaken` réplique la comptabilité DEF de l'effet `weaken` mono-cible existant.
- `enrage_self` est **priorisé** dans la sélection IA (`enrageReady`) pour qu'un
  boss `aggressive` n'ignore jamais sa montée en rage au profit de `damage`.
- `summon` plafonne sur `enemyGroup.length >= 3` (cohérent `rollGroupSize`),
  dépouille l'add de toute capacité `summon` (anti-cascade), et tombe sur un
  fallback « sbire du summoner » si `summonId` est introuvable.
