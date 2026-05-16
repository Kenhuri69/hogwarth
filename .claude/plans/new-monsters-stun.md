# Plan — Nouveaux monstres + mécanique de stun

> Branche : `claude/plan-new-monsters-XfZRY`
> Origine : revue du 2026-05-16. Le « vrai mécanisme de stun » était
> tracé en *Hors scope (P2)* dans `int-stat-role.md:57` — jamais codé,
> et **non perdu par l'archivage** (le plan le mentionnant est actif).
> Ce plan le sort de P2 et le livre, avec 4 nouveaux monstres porteurs.

## Constat

- `STATUS_DEFS` (`js/battle.js:28`) contient `burn / poison / bleed / gel /
  weaken / regen`. **Aucun `stun`.**
- `tickStatuses()` ne sait faire que des DoT + regen + restauration DEF.
  **Aucune logique de saut de tour.**
- Les sorts taggés `effect:"stun"` (Stupefix, Wingardium Leviosa…) sont
  routés vers `_spellElementalDamage` → ils infligent des dégâts ordinaires,
  le tour n'est jamais sauté.
- Les capacités ennemies (`tryEnemyAbility`, `js/battle-spells.js`) gèrent
  `damage / heal / weaken / status / drain`. Le `case 'status'` applique
  déjà un `statusId` arbitraire via `applyStatus` → **le vecteur d'injection
  existe**, il manque seulement le statut `stun` et sa logique de skip.

## Objectif

1. Ajouter un statut **`stun`** (saut du prochain tour) qui s'applique aussi
   bien aux héros qu'aux ennemis.
2. Le rendre injectable par les capacités ennemies (`effect:"status",
   statusId:"stun"`).
3. Ajouter **4 nouveaux monstres** thématiquement porteurs de stun, répartis
   sur les paliers d'étages.
4. Intégrer la **règle d'ajout d'image PNG** pour ces monstres (voir §5).

### Hors scope

- Rendre les **sorts des héros** réellement étourdissants (re-tag de
  Stupefix/Wingardium/Lumos Maxima en vrai stun) — lot séparé. Le moteur
  livré ici le supportera sans modification (le statut est bidirectionnel),
  mais le câblage des sorts joueurs n'est pas fait dans ce plan.
- Arbre de compétences, allocation MAG (déjà hors scope ailleurs).

---

## 1. Mécanique de stun — moteur

### 1.1 Modèle retenu

- `stun` est un statut **non-DoT** : il n'inflige aucun dégât au tick.
- Sa durée (`turns`) = **nombre de tours sautés**.
- Sa durée est décrémentée **au moment où le combattant étourdi devrait
  agir** (point de saut), **pas** dans `tickStatuses`. Sinon le tick
  d'expiration de fin de round annulerait l'effet avant qu'il ne serve
  (un `stun` posé pendant le tour ennemi expirerait avant le tour du héros).
- `tickStatuses` doit donc **porter `stun` tel quel** dans `remaining`,
  sans `s.turns--`, sans tick de dégâts.

### 1.2 `js/battle.js` — `STATUS_DEFS`

Ajouter l'entrée :
```js
stun: { icon: '💫', label: 'Étourdi', color: '#d9a521' }
```
→ **Vérif** : `STATUS_DEFS.stun` défini. Le badge de statut
(`battle-ui.js:66`, `renderStatusBadges`) lit `STATUS_DEFS` → badge 💫
gratuit, aucune modif de `battle-ui.js` nécessaire.

### 1.3 `js/battle.js` — `tickStatuses()`

Dans le `forEach`, **avant** la chaîne DoT, court-circuiter `stun` :
```js
if (s.id === 'stun') { remaining.push(s); return; }
```
→ **Vérif** : un combattant avec `stun` conserve son statut intact après
un appel `tickStatuses` (turns inchangé, hp inchangé).

### 1.4 `js/battle.js` — helpers de skip

Deux helpers purs, près de `applyStatus` :
```js
function isStunned(actor) {
  return !!(actor && actor.statusEffects &&
            actor.statusEffects.some(s => s.id === 'stun' && s.turns > 0));
}
// Consomme 1 tour de stun. Retourne true si le tour doit être sauté.
function consumeStun(actor) {
  if (!actor || !actor.statusEffects) return false;
  const s = actor.statusEffects.find(st => st.id === 'stun' && st.turns > 0);
  if (!s) return false;
  s.turns--;
  if (s.turns <= 0) actor.statusEffects = actor.statusEffects.filter(st => st !== s);
  return true;
}
```
→ **Vérif** : `consumeStun` sur un acteur `turns:2` → retourne `true`,
`turns` passe à `1`, statut conservé. Re-appel → `true`, `turns:0`, statut
retiré. 3ᵉ appel → `false`.

### 1.5 Saut de tour — ennemis (`js/battle.js` — `enemyTurn`)

Dans `livingEnemies().forEach(enemy => { … })`, **première instruction** :
```js
if (consumeStun(enemy)) {
  log += `💫 ${enemy.name} est étourdi et perd son tour ! `;
  UX_safe.logCombat(`💫 ${enemy.name} est étourdi`, 'good');
  return;
}
```
Placé **avant** `tryEnemyAbility`. Le `tickStatuses(e, true)` de début de
`enemyTurn` (ligne ~353) ne touche plus `stun` (cf. §1.3) → pas de
double-décompte.
→ **Vérif** : un ennemi `stun turns:1` saute son action ; au round
suivant il agit normalement.

### 1.6 Saut de tour — héros (`js/battle.js`)

Le héros agit sur clic UI (`battleAction`) — on ne peut pas attendre le
clic. Le saut se fait **à l'instant où le tour devient celui du héros** :

- **`advanceBattleChar()`** : après `currentBattleChar = next`, si
  `isStunned(party[next])` → log + `consumeStun` + ré-appel `advanceBattleChar`
  (en miroir exact du saut KO déjà présent ligne ~336).
- **Fin de `enemyTurn`** : après le calcul de `currentBattleChar`
  (`= (partySize===1 || party[0].hp>0) ? 0 : 1`), si le perso actif est
  étourdi → consommer + enchaîner sur `enemyTurn` via `advanceBattleChar`
  (le segment héros est intégralement sauté si le seul perso actif est
  étourdi).
- **`startBattle()`** : cas marginal (stun ne peut pas précéder le combat) —
  pas de garde nécessaire, le combat démarre toujours statut vide
  (`clearAllStatuses` / init `statusEffects:[]`).

Factoriser dans un helper `_skipActiveCharIfStunned()` appelé aux 2 points,
retournant `true` si un saut a eu lieu (l'appelant enchaîne alors).
→ **Vérif** : en solo, Harry `stun turns:1` → son tour est sauté, les
ennemis agissent, puis Harry rejoue. En duo, Harry étourdi mais Hermione
non → seul Harry est sauté, Hermione agit.

### 1.7 Garde-fou anti-blocage

Si **tout** le groupe jouable est étourdi simultanément, le segment héros
est entièrement sauté et l'on enchaîne sur `enemyTurn` — jamais d'état
figé. Vérifié par le helper §1.6 qui retombe toujours sur `enemyTurn`.
→ **Vérif** : duo, Harry + Hermione `stun turns:1` → un cycle ennemi
complet s'intercale, puis les deux rejouent.

---

## 2. Injection du stun par les capacités ennemies

Aucune modification de `battle-spells.js` n'est nécessaire : le
`case 'status'` de `tryEnemyAbility` (`js/battle-spells.js:53`) applique
déjà `applyStatus(target, ability.statusId, ability.power, ability.turns)`.
Avec `STATUS_DEFS.stun` défini (§1.2), `statusId:"stun"` fonctionne
immédiatement.

Forme d'une capacité étourdissante dans `monsters.js` :
```js
{ name:"Choc Étourdissant", icon:"💫", desc:"…",
  effect:"status", statusId:"stun", power:0, chance:0.30, turns:1 }
```
> `power` est ignoré pour `stun` (pas de DoT) — mettre `0` par convention.
> `turns` = nombre de tours sautés (1, ou 1-2 pour un mini-élite).

→ **Vérif** : en combat scripté, l'ability pose bien un statut `stun` sur
la cible avec le bon `turns`.

---

## 3. Nouveaux monstres (4)

Insérés dans `js/monsters.js`, dans la section catégorielle adéquate.
Tous canon-compatibles HP. Stats indicatives — à équilibrer au test.

| id | Nom | Cat. | Étages | weight | Capacité stun |
|----|-----|------|--------|--------|---------------|
| `lutin_cornouailles` | Lutin de Cornouailles | être magique | 1–4 | 9 | « Bourrasque Désorientante » `chance:0.25 turns:1` |
| `strangulot` | Strangulot | créature | 3–7 | 6 | « Étreinte Gluante » `chance:0.25 turns:1` |
| `pitiponk` | Pitiponk | être magique | 4–8 | 6 | « Lanterne Trompeuse » `chance:0.30 turns:1` |
| `gargouille` | Gargouille Éveillée | créature | 5–10 | 4 | « Regard Pétrifiant » `chance:0.30 turns:1–2` |

- Chaque entrée : champs complets du schéma `monsters.js` (`id, name, icon,
  category, desc, lore, habitat, anecdote, danger, minFloor, maxFloor,
  weight, hp/atk/def/mag/agi/lck, scale, abilities, ai, resist, weak, xp,
  gold, drops, imgSrc`).
- `gargouille` (mini-élite) : `resist:["physique"]`, danger ~7, `weight` bas.
- Le moteur d'apparition (`dungeon.js — weightedPick` filtré par
  `minFloor/maxFloor`) intègre les nouveaux monstres **sans autre câblage**
  (cf. CLAUDE.md « Système de monstres »).

→ **Vérif** : les 4 ids apparaissent dans le pool de leur étage ;
`scaleMonster` les scale sans erreur ; le bestiaire affiche leur fiche.

---

## 4. Toujours-équilibrage

- Le `stun` est puissant : plafonner les `chance` à ≤ 0.30 et `turns` à 1
  (sauf `gargouille` mini-élite, 1–2). Pas de monstre commun étage 1–2
  avec stun > 1 tour.
- `lutin_cornouailles` reste **faible en stats** : son danger vient de la
  gêne, pas des dégâts.
→ **Vérif** : `tools/sim-difficulty.js` (si pertinent) ne montre pas de
pic de difficulté anormal sur les étages concernés.

---

## 5. Règle d'ajout d'image PNG (intégrée)

### 5.1 Comment le moteur résout le visuel d'un monstre

`getMonsterIconHtml(monster, sizePx)` (`js/icons.js:1197`) — ordre de
priorité :
1. `monster.imgSrc` → balise `<img src="img/monsters/<id>.png">` (PNG) ;
2. `MONSTER_ICONS[monster.id]` → SVG inline dédié ;
3. `MONSTER_ICONS[monster.category]` → SVG générique de catégorie ;
4. fallback emoji `monster.icon`.

Le sprite de couloir 3D (`drawEnemySprite`, `js/renderer-effects.js:527`)
utilise le **même** `imgSrc` via `_getMonsterImg()` (cache + re-render
auto au `onload`), avec fallback emoji si l'image n'est pas prête.

→ **Conséquence** : un nouveau monstre est **jouable immédiatement** avec
le seul fallback emoji/SVG ; le PNG peut être ajouté ensuite sans toucher
au gameplay.

### 5.2 Convention de nommage (obligatoire)

- Fichier : `img/monsters/<id>.png` — le nom **est** l'`id` du monstre
  (snake_case), jamais le nom français.
- Champ dans `monsters.js` : `imgSrc: "img/monsters/<id>.png"`.
- Format cible : **512×512, RGBA, fond transparent** (specs `IMG_STYLE.md`
  §1).

### 5.3 Pipeline de génération du PNG

Outil dédié : **`tools/process_monster_png.py`** (déjà présent).
```bash
python3 tools/process_monster_png.py --src <image_source> --id <monster_id>
# prévisualiser d'abord :
python3 tools/process_monster_png.py --src <image_source> --id <id> --dry-run
```
Le script : détourage `rembg` (birefnet) → trim bbox alpha → centrage
carré marge 8 % → resize LANCZOS 512 → `optimize`. Il imprime les
7 critères d'acceptation `IMG_STYLE.md §9` et sort en erreur si un
critère bloquant échoue (fond non détouré, poids > 700 KB).

### 5.4 Décision visuelle pour CE plan

La génération de l'**image source** (fond uni, sujet peint) requiert un
outil d'IA générative externe (ex. Nano Banana) — non disponible côté
agent. Trois voies, par ordre de préférence :

- **Voie A (recommandée)** — *SVG dédié* : créer une entrée
  `MONSTER_ICONS[<id>]` dans `js/icons.js` (viewBox `0 0 100 100`, corps en
  `fill="currentColor"` pour le tintage variant). Précédent : « Bloc B
  pivoté » (`svg-blocB-monsters.md`). Entièrement réalisable par l'agent,
  zéro dépendance externe. Visuel propre et tinté par variant.
- **Voie B** — *PNG fourni* : l'utilisateur génère 4 images sources et les
  partage ; l'agent les passe dans `process_monster_png.py` et renseigne
  `imgSrc`.
- **Voie C** — *fallback catégorie* : livrer sans visuel propre (SVG de
  catégorie / emoji). Acceptable temporairement, mais 2 êtres magiques se
  ressembleraient.

→ **Étape de décision** : choisir A, B ou C avec l'utilisateur avant
d'implémenter la partie visuelle. Par défaut, ce plan retient **Voie A**.

→ **Vérif visuelle** : chaque nouveau monstre est reconnaissable à sa
silhouette en combat **et** en sprite de couloir 3D ; tintage variant
(`fierce`/`ancient`/`shiny`) fonctionnel.

---

## 6. Tests & non-régression (guideline §7)

- `tests/smoke.js` — nouveau scénario **« Stun »** :
  - T1 — `STATUS_DEFS.stun` défini.
  - T2 — `applyStatus(actor,'stun',0,2)` puis `tickStatuses` → `turns`
    inchangé (2), hp inchangé.
  - T3 — `consumeStun` : `true/true/false`, statut retiré à `turns:0`.
  - T4 — ennemi étourdi saute son action dans `enemyTurn`.
  - T5 — héros étourdi : son tour est sauté, le combat ne se fige pas
    (cas tout-le-groupe-étourdi inclus).
  - T6 — les 4 nouveaux monstres : présents dans `MONSTERS`, ids dans le
    pool de leur étage, capacité stun bien formée.
- `node tests/smoke.js` doit rester **vert** après chaque étape.
- Smoke ajouté **dans le même commit** que le code couvert.

---

## 7. Documentation & finitions

- `CLAUDE.md` :
  - section « Système de combat » → ajouter `stun` à la liste des statuts,
    décrire le saut de tour.
  - section « Système de monstres » → compteur `50` → `54`, ajouter les
    4 monstres au tableau par étages.
- Cache-bust `index.html` : bump `?v=` de `battle.js`, `monsters.js`,
  (`icons.js` si Voie A), `tests/smoke.js`.
- `loader.js` MANIFEST : aucun nouveau global → pas de modif.
- `int-stat-role.md` : retirer « Vrai mécanisme de `stun` » de la section
  *Hors scope* (livré ici), pointer vers ce plan.

---

## 8. Découpage en étapes vérifiables

```
1. Moteur stun (§1)        → smoke T1-T3 + T5 verts
2. Câblage ennemi (§2)     → smoke T4 vert
3. 4 monstres (§3-4)       → smoke T6 vert ; bestiaire OK
4. Visuels (§5, voie A/B/C) → vérif silhouette combat + couloir 3D
5. Doc + cache-bust (§7)   → CLAUDE.md à jour, smoke complet vert
6. Commit(s) scopés + push sur claude/plan-new-monsters-XfZRY
   → vérifier l'état de la PR liée avant push (guideline §6)
```

---

## Suivi

- [x] Plan rédigé (2026-05-16).
- [x] Étape 1 — moteur stun (`STATUS_DEFS.stun`, `isStunned`, `consumeStun`,
      garde `tickStatuses`, skip ennemi + héros).
- [x] Étape 2 — câblage capacités ennemies (aucun code : `case 'status'`
      existant suffit avec `statusId:"stun"`).
- [x] Étape 3 — 4 nouveaux monstres (`lutin_cornouailles`, `strangulot`,
      `pitiponk`, `gargouille`).
- [ ] Étape 4 — **visuels : Voie B retenue** — PNG fournis par l'utilisateur,
      à traiter via `process_monster_png.py`. **Différé** (passe ultérieure).
      En attendant : fallback emoji / SVG de catégorie.
- [x] Étape 5 — doc (`CLAUDE.md`) + cache-bust (`battle.js?v=4`,
      `monsters.js?v=3`).
- [ ] Étape 6 — commit + push.

## Journal

| Date | Étape | Note |
|------|-------|------|
| 2026-05-16 | Plan | Rédigé. Décision utilisateur : voie visuelle **B** (PNG fournis), périmètre = moteur + monstres d'abord, visuels différés. Stun des sorts joueurs hors scope. |
| 2026-05-16 | Étapes 1-3, 5 | Moteur stun livré dans `battle.js` : statut `stun` non-DoT, helpers `isStunned`/`consumeStun`, `tickStatuses` porte stun sans le décompter, skip ennemi (`enemyTurn` forEach) + skip héros (ouverture segment dans `enemyTurn` fin + `advanceBattleChar`). 4 monstres ajoutés à `monsters.js` (sans `imgSrc` — fallback emoji/SVG). Aucune modif de `battle-spells.js` (case `status` réutilisé). Smoke : nouveau `scenarioStun` (T1-T5), suite complète verte. `CLAUDE.md` : section « Statut stun » + compteur 50→54. Reste : visuels (Voie B, en attente des PNG) + commit/push. |
