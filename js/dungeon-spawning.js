// ============================================================
// DONJON — Spawn de quête & garde-fous de maintenance
// ============================================================
// spawnQuestMonsters / spawnFarmingMonsters (cibles de quête à
// l'acceptation), _ensureActiveKillQuestTargets / _ensureStairsExist /
// _migrateMissingNpcsForFloor / _findFreeNpcCell (réparations de save & de
// génération). Dépend de scaleMonster/weightedPick/effectiveFloor
// (dungeon-scaling.js) et de generateDungeon (dungeon.js). Chargé APRÈS.
// ============================================================
// Spawn ciblé pour quête à l'acceptation. Place 1 monstre cible (par id) +
// `extraRandomCount` monstres aléatoires éligibles à l'étage courant, sur
// des cellules FLOOR libres de `enemyMap`. Tolérant : place ce qui rentre
// si pas assez de cases libres. Retourne le nombre de mobs placés.
function spawnQuestMonsters(targetMonsterId, extraRandomCount) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let placed = 0;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (target && free.length) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }

  const efFloor = effectiveFloor(floor);
  const pool = MONSTERS.filter(m =>
    m.minFloor <= efFloor && (m.maxFloor === null || efFloor <= m.maxFloor)
  );
  for (let i = 0; i < extraRandomCount && free.length && pool.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(weightedPick(pool), floor);
    placed++;
  }

  return placed;
}

// Variante farming : place `count` copies du monstre `targetMonsterId` sur
// des cases FLOOR libres, sans extra random. Utilisée à l'acceptation d'une
// quête farming kill. Tolérant : retourne le nombre effectivement placé.
function spawnFarmingMonsters(targetMonsterId, count) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (!target) return 0;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  let placed = 0;
  for (let i = 0; i < count && free.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }
  return placed;
}

// Garantit que les cibles des quêtes "kill" actives avec `spawnOnAccept`
// sont présentes sur l'étage courant. Comble le manque entre `step.amount`
// et (progress + instances déjà dans `enemyMap`). Idempotente : no-op si
// toutes les cibles sont déjà là.
//
// Couvre :
//  - les vieilles saves où la quête a été acceptée avant l'ajout du hook
//    `spawnOnAccept` (cas du joueur sans Chouette Ensorcelée à l'étage 4
//    pour `chouette_perdue`),
//  - le respawn d'une cible multi-amount tuée par un kill non-quête
//    (ex. attaque collatérale, AoE).
//
// Appelée depuis `generateDungeon` (génération initiale) et
// `_restoreFloorFromCache` (retour sur un étage déjà visité). Retourne
// le nombre de cibles ajoutées.
function _ensureActiveKillQuestTargets(floor) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  if (typeof activeQuests === 'undefined' || !activeQuests.length) return 0;
  if (typeof QUEST_TEMPLATES === 'undefined' || typeof MONSTERS === 'undefined') return 0;

  let added = 0;
  for (const q of activeQuests) {
    const tpl = QUEST_TEMPLATES.find(t => t.id === q.id);
    if (!tpl || !tpl.spawnOnAccept) continue;
    const targetId = tpl.spawnOnAccept.targetMonsterId;
    if (!targetId) continue;
    const step = (q.objectives || []).find(o =>
      o.type === 'kill' && o.monsterId === targetId && !o.completed
    );
    if (!step) continue;

    let present = 0;
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) {
        if (enemyMap[y][x] && enemyMap[y][x].id === targetId) present++;
      }
    }
    const need = Math.max(0, step.amount - (step.progress | 0) - present);
    for (let i = 0; i < need; i++) {
      const placed = spawnQuestMonsters(targetId, 0);
      if (!placed) break; // plus de cases FLOOR libres
      added += placed;
    }
  }
  return added;
}

// Garantit la présence de STAIRS_D (toujours) et STAIRS_U (si floor>1)
// sur l'étage courant. Couvre deux cas :
//  - bug de génération : si rooms[0].center === rooms[last].center, alors
//    STAIRS_U (ligne 125) écrasait STAIRS_D (ligne 116) → softlock,
//  - vieilles saves dont le cache contient un étage softlocké.
//
// Place les escaliers manquants sur une case FLOOR libre (jamais sur
// SHOP/CHEST/NPC/FOUNTAIN ni sur la case du joueur). Idempotent.
// Appelée depuis `generateDungeon`, `_restoreFloorFromCache` et `_applyState`.
function _ensureStairsExist(floor) {
  if (typeof dungeon === 'undefined' || !dungeon || !dungeon.length) return 0;
  let hasDown = false, hasUp = false;
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] === CELL.STAIRS_D) hasDown = true;
      if (dungeon[y][x] === CELL.STAIRS_U) hasUp   = true;
    }
  }
  const needDown = !hasDown;
  const needUp   = !hasUp && (floor || 1) > 1;
  if (!needDown && !needUp) return 0;

  // Pool de cases FLOOR éligibles (hors joueur)
  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX === 'number' && x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  // Shuffle Fisher-Yates pour des placements non corrélés
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let added = 0;
  if (needDown && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_D;
    added++;
  }
  if (needUp && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_U;
    added++;
  }
  return added;
}

// Repère les PNJ qui devraient être placés à l'étage courant (selon
// `getNpcsForFloor`) mais absents de `npcPlacements`. Les place sur
// une cellule FLOOR libre. Permet aux saves antérieures à un ajout
// de PNJ (ex : Dumbledore, chaîne d'épreuves Phase 3) de "voir
// apparaître" le PNJ manquant au prochain passage sur l'étage.
//
// Appelée depuis `_applyState` (étage courant à la restauration de
// la save) et `_restoreFloorFromCache` (à chaque retour sur un étage
// déjà visité). Idempotente : si tous les PNJ attendus sont déjà
// présents, no-op. Retourne le nombre de PNJ ajoutés.
function _migrateMissingNpcsForFloor(floor) {
  if (typeof dungeon === 'undefined' || typeof npcPlacements === 'undefined') return 0;
  if (typeof getNpcsForFloor !== 'function') return 0;

  const present = new Set();
  for (const npcId of npcPlacements.values()) present.add(npcId);

  const expected = getNpcsForFloor(floor) || [];
  let added = 0;
  for (const npc of expected) {
    if (!npc || !npc.id) continue;
    if (present.has(npc.id)) continue;
    // Anchor 'first-room' : on cherche en priorité dans le quart haut-gauche
    // du donjon (proxy raisonnable de la première salle). Sinon n'importe
    // quelle case FLOOR libre.
    const isFirstRoom = (npc.placement && npc.placement.anchor) === 'first-room';
    const cell = _findFreeNpcCell(isFirstRoom);
    if (!cell) continue;
    dungeon[cell.y][cell.x] = CELL.NPC;
    npcPlacements.set(`${cell.x},${cell.y}`, npc.id);
    if (typeof visited !== 'undefined' && visited[cell.y]) {
      visited[cell.y][cell.x] = true;
    }
    present.add(npc.id);
    added++;
  }
  return added;
}

// Cherche une cellule FLOOR libre pour y placer un PNJ. Évite la case
// joueur, les cellules avec ennemi/item/PNJ déjà posé. Si `preferEarly`
// est vrai (anchor 'first-room'), parcourt en spirale depuis le coin
// haut-gauche pour rester proche du spawn.
function _findFreeNpcCell(preferEarly) {
  if (typeof dungeon === 'undefined' || !dungeon.length) return null;
  const H = dungeon.length, W = dungeon[0].length;
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX !== 'undefined' && x === playerX && y === playerY) continue;
      if (npcPlacements && npcPlacements.has(`${x},${y}`)) continue;
      if (typeof enemyMap !== 'undefined' && enemyMap[y] && enemyMap[y][x]) continue;
      if (typeof itemMap !== 'undefined'  && itemMap[y]  && itemMap[y][x])  continue;
      candidates.push({ x, y });
    }
  }
  if (!candidates.length) return null;
  if (preferEarly) {
    // Tri par distance au coin (0,0) → favorise la première salle
    candidates.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y));
    return candidates[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
