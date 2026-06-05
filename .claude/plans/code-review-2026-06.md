# Revue de code complète — juin 2026

> Branche : `claude/code-review-improvements-rt65X`
> Méthode : exploration parallèle (5 axes) puis **vérification manuelle**
> de chaque finding critique/moyen avant inscription. Les findings
> infirmés à la lecture du code sont listés en §0 pour mémoire.

## 0. Faux positifs écartés après vérification

Le balayage automatique a produit beaucoup de bruit. Vérifiés et **infirmés** :

| Finding annoncé | Réalité (fichier:ligne) |
|-----------------|--------------------------|
| `searchedCells` perd `{at,count}` à la sérialisation | `searchedCells` est une `Map` ; `Array.from(map)` rend déjà les paires `[clé, {at,count}]`. Symétrique avec `_searchedCellsFromArray`. **OK** (`save.js:42`) |
| `seenMonsters` non restauré si vide | `[]` est *truthy* en JS → `if (gs.seenMonsters)` passe toujours. **OK** (`save.js:196`) |
| `advanceBattleChar` accède `party[1]` en solo (OOB) | court-circuit `next === -1 \|\| partySize === 1 \|\| …` évalue avant `party[next].hp`. **OK** (`battle.js:823`) |
| Récompense de quête duplique un sort | `if (!c.spells.includes(reward.spell))` déjà présent. **OK** (`quests.js:684`) |
| Fuite `legilimens`/`recolteGoldBonus` entre combats | réinitialisés dans `startBattle` (`battle.js:436-438`). **OK** |
| Équipement perdu si sac plein | refus explicite `if (old && inventory.length >= INVENTORY_MAX) return` (`inventory.js:323`). **OK** |
| Boucle d'anim PNJ gaspille du CPU | early-return si aucun PNJ/fantôme/msg/ennemi → quasi no-op (`renderer-effects.js:27`). **Négligeable** |

**Conclusion** : la base est saine et défensive (helpers `safeEl`/`safeCall`,
gardes `typeof`, court-circuits). Les actions ci-dessous sont du **durcissement**
et de la **couverture de test**, pas des corrections de bugs bloquants.

## 1. Findings réels (faibles à moyens)

### F1 — `executeAttack(targetIdx)` sans garde (faible)
`battle.js:687-689` : `enemyGroup[targetIdx]` n'est pas validé (ni
`< length`, ni `currentHp > 0`). En pratique l'UI ne câble que des index
vivants, donc latent. **Action** : garde précoce
`const enemy = enemyGroup[targetIdx]; if (!enemy || enemy.currentHp <= 0) return;`

### F2 — `grantsSpell` / `_teachSpellToParty` peut enseigner un sort `locked` (latent)
`inventory-spells.js` : rien ne filtre `SPELLS[x].locked`. Aucun item ne
l'exploite aujourd'hui (Avada reste verrouillé jusqu'au niv. 9), mais c'est
un piège pour un futur item. **Action** : ignorer un sort `locked` à
l'apprentissage par équipement/livre.

### F3 — Clé Supabase en dur (note, pas une faille)
`multiplayer.js:21-25` : `supabaseAnonKey: 'sb_publishable_…'`. C'est une clé
**publishable** (publique par conception, comme pour le Hall of Fame). Le
vrai garde-fou est la **RLS** côté Supabase. **Action** : documenter dans
`supabase/README.md` que la sécurité repose entièrement sur la RLS (déjà
`using(true)/with check(true)` = écriture anonyme assumée), et confirmer
qu'aucune table ne contient de donnée sensible. Aucun changement de code.

### F4 — Disjoncteurs 404 jamais ré-armés (note de conception)
`multiplayer-visits.js` : `_mpVisitTableMissing` reste `true` jusqu'au reload.
C'est le comportement voulu (échec franc → fonctionnalité off pour la
session). **Action** : aucune, sauf si on veut une reprise à chaud — hors
scope.

### F5 — Données externes (host/visiteur) affichées (défense en profondeur)
`portal-matchmaking.js`, `atelier-voyageur.js` : les champs reçus du backend
(`visitor_name`, `hostName`…) sont passés par `_esc()` avant injection HTML.
Correct. **Action** : ajouter un test ciblé qui injecte `<img onerror>` dans
un nom et vérifie l'échappement (verrou anti-régression).

## 2. Améliorations structurelles (factuelles)

### S1 — `tests/smoke.js` est un monolithe de ~890 Ko
Signal de test difficile à maintenir et lent à diagnostiquer. **Action
proposée** : extraire les scénarios par domaine (`tests/scenarios/*.js`)
chargés par un runner mince, à coût constant (pas de framework ajouté,
philosophie zéro-dépendance respectée). Chantier opt-in, non bloquant.

### S2 — Aucune couverture unitaire des helpers purs
Des fonctions pures critiques pour l'équilibrage n'ont pas de test direct :
`_fortuneCurve`, `_celeriteCurve`, `_strPenFrac` (`inventory-core.js`,
`battle.js`), `scaleMonster`/`weightedPick` (`dungeon-scaling.js`),
`getFloorTheme` (`floor-themes.js`). L'outillage de simulation existe déjà
(`tools/sim-*.js`). **Action** : un `tests/units.js` (Node pur, sans
navigateur) qui require les modules purs et assert les bornes (monotonie,
saturation, plafonds). Très bon ratio valeur/effort.

### S3 — Helper de retrait d'inventaire (cosmétique)
De nombreux `player.inventory.splice(idx, 1)` (inventory/shop/potions/quests).
Tous vérifiés sûrs aujourd'hui (index issus de listes rendues), mais un
`_removeInvItem(idx)` centralisé (garde `idx>=0 && <length`) réduirait le
risque sur futurs call-sites. **Action** : optionnelle, faible priorité.

## 3. Plan d'exécution proposé (par lots, vérifiable)

1. **Lot A — durcissement combat/sorts** (F1, F2)
   → vérif : `node tests/smoke.js` vert + cas ajouté (attaque sur index
   invalide ignorée ; sort `locked` non enseigné).
2. **Lot B — tests unitaires purs** (S2)
   → vérif : `node tests/units.js` vert, bornes des courbes assertées.
3. **Lot C — verrou XSS visites** (F5)
   → vérif : test d'échappement d'un nom malveillant.
4. **Lot D — doc RLS** (F3) + note disjoncteurs (F4)
   → vérif : `supabase/README.md` mis à jour, relu.
5. **Lot E (opt.)** — découpage `smoke.js` (S1), helper inventaire (S3).

> Chaque lot est indépendant et peut être livré/PR séparément. Aucun n'est
> urgent : aucun bug bloquant n'a été confirmé. Priorité conseillée :
> A puis B (meilleur ratio sécurité/effort), le reste à la demande.

## Suivi

- [ ] Lot A
- [ ] Lot B
- [ ] Lot C
- [ ] Lot D
- [ ] Lot E (opt.)
