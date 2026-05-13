# ENDGAME_PLAN — Écran de victoire + Soft NG+

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure, noter les écarts.

## 1. Objectif

Donner une vraie sensation de fin à *Poudlard & Magie* **sans bloquer la partie**.
Le joueur doit pouvoir continuer à explorer après la victoire, avec un contenu
légèrement enrichi qui justifie de descendre encore plus bas.

## 2. Contraintes dures

| # | Contrainte | Conséquence sur le design |
|---|-----------|---------------------------|
| C1 | **Continuer au-delà** | Aucun écran modal qui retire le contrôle. Pas de game-over. Pas de reset. |
| C2 | Aucune régression save legacy | Le flag `victoryAchieved` doit s'initialiser à `false` pour les saves existantes. |
| C3 | Aucune dépendance à la quête `dumbledore_revelation` | Le trigger est purement mécanique (kill Voldemort Ressuscité). Si la quête est complétée en parallèle, tant mieux — mais ce n'est pas obligatoire. |
| C4 | L'écran n'apparaît qu'**une seule fois par save** | Re-tuer Voldemort en NG+ ne re-trigger pas la cinématique. |
| C5 | Smoke test vert avant push | `node tests/smoke.js`, voir §10. |

## 3. Trigger de victoire

**Évènement déclencheur** : monstre `voldemort_revenu` (étage 10+) passe à `hp ≤ 0`
dans `endBattle(true)` (`js/battle.js:339`).

Hook actuel utile : ligne `battle.js:386` —
```js
enemyGroup.forEach(e => safeCall('checkKillQuests', e.id));
```
On ajoute juste après :
```js
enemyGroup.forEach(e => safeCall('checkVictoryTrigger', e.id));
```

`checkVictoryTrigger(monsterId)` vit dans un nouveau module **`js/endgame.js`**
(cf. §9 pour l'arborescence). Si `monsterId === 'voldemort_revenu'` et
`!victoryAchieved`, il mute le flag, persiste, **invalide le cache de
textures** (pour la bascule §7.1bis), et lance la cinématique.

**Double rôle du trigger** : il déverrouille aussi l'escalier descendant
de l'étage 10 (cf. §7.1ter). Sans victoire, **le jeu est plafonné à
l'étage 10**.

## 4. Cinématique de victoire (non bloquante)

Modale dédiée `#victory-modal` dans `index.html`. Style aligné sur les autres
modales (thème parchemin/or). Contenu :

1. **Titre** — "L'Ombre s'efface" + sous-titre "Vous avez vaincu Lord Voldemort"
2. **Récap** (4-5 lignes texte) :
   - Étage atteint, temps de jeu approximatif (`Date.now() − meta.startedAt`),
     nombre de monstres vaincus (somme de `floorKillCount`), niveau d'arrivée,
     Maison + points.
3. **Mot de Dumbledore** (3-4 lignes narratives, en italique) — ferme l'arc.
4. **2 boutons** :
   - `Continuer l'aventure` → close + addMsg narratif "Le château recèle encore des mystères…"
   - `Retour au menu` → revient au hub de saves (sauvegarde auto en amont)

> ⚠️ Pas de bouton "Recommencer" : on respecte C1. Le slot reste utilisable.

Critère de vérification : ouverture par appel programmatique
`window.showVictoryScreen()` ; close ne crashe pas si appelée 2×.

## 5. Persistance

**Nouveaux champs dans `state.js`** (top-level `let`) :
```js
let victoryAchieved = false;   // toggle une fois Voldemort tombé
let victoryAt       = null;    // ISO string, null si pas encore vaincu
```

**Ajouts à `_serializeState`** (`js/save.js:163`) :
```js
victoryAchieved,
victoryAt,
```

**Ajouts à `_applyState`** (`js/save.js:253`) :
```js
victoryAchieved = !!gs.victoryAchieved;
victoryAt       = gs.victoryAt || null;
```

**Migration save legacy** : aucune. Champs absents → `false`/`null` par
défaut (cf. coercition `!!` et `|| null`).

**Métadonnées de slot** (`_buildSlotMeta`, `js/save.js:43`) : ajouter
`victory: !!victoryAchieved` pour afficher un badge dans la modale de slots.

## 6. UI badge "Vainqueur"

Dans `js/save-ui.js`, lors du rendu d'un slot, si `slot.meta.victory === true`,
ajouter un petit pictogramme `🏆` à côté du nom de la save (CSS `.slot-victory`
discret, doré sur fond parchemin).

Aussi dans le HUD principal (`ui.js — updateUI`) : afficher discrètement
`🏆` à côté du nom de la Maison sur le badge, **uniquement si**
`victoryAchieved === true`. Ne pas remplacer le crest.

## 7. Soft NG+ — Étages des Ténèbres (11+)

### 7.1 Principe

Après victoire, les étages 11+ basculent en **mode "Ténèbres"** :
- multiplicateur global appliqué dans `dungeon.js — scaleMonster()` :
  `if (victoryAchieved && currentFloor >= 11) hp *= 1.25, atk *= 1.15, mag *= 1.15`
- proba de groupe de 3 ennemis +10% sur le baseline étage 7+ (`battle.js — rollGroupSize`)
- toast narratif à la première entrée en étage 11+ post-victoire :
  *"L'air devient glacial. Les murs eux-mêmes semblent te haïr."*
  (one-shot par session, déclenché dans `movement.js — goDeeper`)

### 7.1bis Démarcation visuelle — Textures des Ténèbres

**Constat existant** (`js/textures.js:21-23`, `js/renderer.js:109-129`) :
- 6 jeux de murs chargés : `stone1`, `stone2`, `wood`, `tapestry`,
  `cavern_wall`, `rune_wall`.
- Sol + plafond : `stone`, `carpet`, `cavern_floor/ceiling`,
  `rune_floor/ceiling`.
- Mapping actuel `getWallTextureType()` :

| Étage | Mur | Sol | Plafond |
|------|-----|-----|---------|
| 1-2  | stone1 | stone | beams |
| 3-4  | stone2 | carpet | beams |
| 5-6  | wood | carpet | stone |
| 7-8  | tapestry | carpet | stone |
| **9-14** | **cavern_wall** | cavern_floor | cavern_ceiling |
| 15+  | rune_wall | rune_floor | rune_ceiling |

**Décision V1** : aucun nouvel asset à créer. On **avance la bascule
`rune_*` à l'étage 11** uniquement si `victoryAchieved === true`. Les
runes ont été pensées pour le endgame ; les rendre disponibles plus tôt
post-victoire matérialise l'entrée dans les Ténèbres sans coût graphique.

| Étage | Pré-victoire | Post-victoire |
|------|--------------|--------------|
| 9-10 | cavern | cavern |
| **11-14** | **cavern** | **rune (avance)** |
| 15+ | rune | rune |

**Patch attendu** dans `renderer.js — getWallTextureType()` :
```js
if      (f <= 2)  key = 'stone1';
else if (f <= 4)  key = 'stone2';
else if (f <= 6)  key = 'wood';
else if (f <= 8)  key = 'tapestry';
else if (f <= 10) key = 'cavern_wall';
else if (typeof victoryAchieved !== 'undefined' && victoryAchieved) {
  key = 'rune_wall';                  // Ténèbres avancées (étage 11+)
}
else if (f <= 14) key = 'cavern_wall';
else              key = 'rune_wall';
```
Idem pour le `floor_key`/`ceil_key` dans `renderer.js:288/321` :
ajouter la condition `(victoryAchieved && f >= 11)` pour basculer
respectivement sur `rune_floor` / `rune_ceiling`.

**Optionnel (V1+)** : appliquer un overlay teinté pourpre froid
(`rgba(40, 20, 70, 0.12)`) en fin de pipeline `drawDungeon` quand
`victoryAchieved && currentFloor >= 11`. ~3 lignes, zéro asset,
renforce visuellement le shift. À garder en réserve si rune_wall seul
manque d'impact.

### 7.1ter Escalier de l'étage 10 — scellé tant que Voldemort vit

**Décision** : la descente vers l'étage 11 doit être **gated** par la
victoire. Pas de raccourci pour grinder le NG+ avant d'avoir affronté
le boss.

**Génération** : on garde la génération actuelle intacte (`dungeon.js:116`
place toujours un `STAIRS_D` dans la dernière room de l'étage 10). On
ne modifie pas la map — on bloque uniquement l'interaction.

**Patch attendu** dans `js/movement.js — _showExploreOverlay()`, cas
`CELL.STAIRS_D` :
```js
[CELL.STAIRS_D]: (() => {
  const sealed = currentFloor === 10 && !victoryAchieved;
  return {
    icon:  SCENE_ICONS.stairs_d,
    title: sealed ? 'Passage scellé' : 'Escalier descendant',
    desc:  sealed
      ? "Une magie ancienne et noire scelle cet escalier. Une présence maléfique veille — tant qu'elle n'aura pas été abattue, le passage restera fermé."
      : 'Un escalier en colimaçon disparaît dans les profondeurs…',
    btns:  sealed
      ? `<button class="explore-btn" onclick="_hideExploreOverlay()">S'éloigner</button>`
      : `<button class="explore-btn" onclick="_hideExploreOverlay();goDeeper()">Descendre</button>`
  };
})(),
```

**Effet** :
- Avant victoire : entrer sur l'escalier de l'étage 10 affiche
  "Passage scellé" → joueur doit chasser Voldemort.
- Après victoire : interaction normale, descente déverrouillée.
- Étages 1-9 : aucun changement (le check `currentFloor === 10` les ignore).
- Étages 11+ : le joueur y arrive après victoire par construction, donc
  les stairs y sont toujours libres.

**Sécurité supplémentaire** : verrouiller aussi `goDeeper()` lui-même
(`js/movement.js:288`) en garde-fou — au cas où quelqu'un appellerait
la fonction depuis la console.
```js
function goDeeper() {
  if (currentFloor === 10 && !victoryAchieved) {
    addMsg("L'escalier reste scellé — une ombre veille encore.", 'bad');
    return;
  }
  currentFloor++;
  // … reste inchangé
}
```

**Sauvegardes existantes** : aucune migration spéciale. Si un joueur a
une vieille save à `currentFloor >= 11` (impossible avec la
génération actuelle, mais théoriquement), il est libre de continuer ;
les seuls étages plafonnés sont ceux dont on essaie de **sortir par le
bas**.

**Texte de la modale de victoire** doit le mentionner :
> *"L'escalier le plus profond, scellé par la peur, s'ouvre enfin."*

### 7.2 Roster monstres étages 11+ — Boucle originale Ténébreuse

**Principe** : à partir du floor 11 post-victoire, le jeu **rejoue
intégralement la progression de bestiaire** des floors 1-10, mais en
version **Ténébreuse**. Chaque monstre original a une version Ténébreuse
qui apparaît à `minFloor + 10` :

| Monstre original | minFloor | Apparaît en Ténébreux à |
|------------------|---------:|-------------------------|
| Chat de Mme Norris, Cornichon, Peeves… | 1 | floor **11** |
| Mandragore Sauvage, Chouette… | 2 | floor **12** |
| Bundimun, Centaure, Détraqueur… | 3-4 | floor **13-14** |
| Mangemort, Détraqueur Gardien… | 5 | floor **15** |
| Basilic Mineur, Chimère… | 6 | floor **16** |
| Mangemort d'Élite, Hécate… | 7 | floor **17** |
| Bellatrix Lestrange | 8 | floor **18** |
| Voldemort Ressuscité | 10 | floor **20** |

C'est exactement la **même progression** que les floors 1-10, décalée
de +10. La courbe de découverte est donc identique : à chaque
nouveau floor Ténèbres, le joueur croise un nouvel ennemi corrompu,
exactement comme dans le jeu d'origine.

**Floor relatif** : on définit `relFloor = floor - 10` quand
`victoryAchieved && floor >= 11`. Tout le système (pool eligibility,
scaling) tourne sur `relFloor`. À floor 11 → relFloor 1 (Ténèbres
floor 1). À floor 20 → relFloor 10 (Ténèbres floor 10, full set).

**Implémentation centralisée** — ajouter dans `dungeon.js` :
```js
// Retourne le floor à utiliser pour le pool eligibility + scaling.
// En post-victoire à floor 11+, on rejoue la progression 1-10 décalée.
function effectiveFloor(floor) {
  if (typeof victoryAchieved !== 'undefined'
      && victoryAchieved
      && floor >= 11) {
    return floor - 10;     // 11 → 1, 12 → 2, …, 20 → 10, 21 → 11, …
  }
  return floor;
}
```

**Appliquer aux 3 sites de filtrage** (`dungeon.js:198`, `dungeon.js:259`,
`battle.js:170`) :
```js
const ef = effectiveFloor(floor);
const pool = MONSTERS.filter(m =>
  m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor)
);
```

Et **dans `scaleMonster()`** :
```js
function scaleMonster(base, floor) {
  const ef       = effectiveFloor(floor);
  const isDark   = (ef !== floor);           // post-victoire & floor 11+
  const diffMult = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).scalingMultiplier;
  const mult     = (1 + (ef - 1) * (base.scale || 0.25)) * diffMult;
  // ... reste inchangé, mais utilise mult sur ef et non floor
}
```

> **Conséquence importante** : un monstre dont la version originale est
> bornée par `maxFloor` (ex. Chat de Mme Norris `maxFloor: 2`) **ne
> reviendra QUE sur floors 11-12** en Ténébreux. Pas de Chat de Mme
> Norris à floor 13. C'est cohérent : on rejoue la progression d'origine
> à l'identique.

> **Floors 21+ (au-delà du second loop)** : `relFloor = floor - 10 ≥ 11`.
> Le pool reste celui de "Ténèbres floor 10" (tous les monstres avec
> maxFloor null) et le scaling continue de monter linéairement (Voldemort
> ne plafonne pas). Pas de logique spéciale V1. Si l'utilisateur veut
> un cap à floor 20, ajouter `Math.min(ef, 10)` dans `effectiveFloor`.

---

**Système de variants** (`js/dungeon.js:31-51`) : le système **existe
déjà**. `scaleMonster()` applique l'un de ces 4 variants à **tout
monstre généré**, par-dessus son entrée de base :

| Variant | Préfixe nom | Conditions | Badge `battle-ui.js:60-65` | Multipliers |
|--------|-----------|------------|---------------------------|-------------|
| `shiny` | `✨ ` | 4% aléatoire, partout | ✨ | xp×1.5, gold×2, drops×2 |
| `ancient` | `Ancien ` | étage ≥ 5 | 💜 | aucun (cosmétique) |
| `fierce` | `Féroce ` | étage ≥ 3 | 🔴 | aucun (cosmétique) |
| `normal` | (aucun) | défaut | (aucun) | aucun |

**Décision V1** : **étendre** ce système avec un nouveau variant
`darkness` qui s'applique automatiquement à **TOUS les monstres**
quand `victoryAchieved === true && currentFloor >= 11`. Zéro entrée
monstre à créer, zéro PNG à dessiner, pool entier du bestiaire mis à
niveau d'un coup.

**Convention de nom** : préfixe `Ténébreux ` (au choix utilisateur).
Genre incorrect sur quelques entrées féminines (« Ténébreux Mimi
Geignarde ») mais lisible et homogène. V1+ pourra introduire une
table de genre si nécessaire.

**Patch attendu** dans `js/dungeon.js — scaleMonster()`, **avant** le
test `floor >= 5` (l'ordre de priorité compte) :

```js
const shinyRoll = Math.random();
if (shinyRoll < 0.04) {
  // ✨ shiny — inchangé, peut se cumuler avec darkness en théorie
  // mais comme on entre par if/else, shiny l'emporte (rare)
  ...
}
else if (typeof victoryAchieved !== 'undefined'
         && victoryAchieved
         && floor >= 11) {
  // À ce stade, hp/atk/def/xp/gold ont déjà été scalés avec
  // relFloor = floor − 10 (via effectiveFloor() en début de fonction).
  // Donc un Mangemort (minFloor 5) à floor 15 a été scalé comme un
  // Mangemort normal à floor 5. Les multiplicateurs ci-dessous
  // ajoutent juste la couche "corrupted" — cf. §7.2bis.
  monster.variant = 'darkness';
  monster.name    = 'Ténébreux ' + base.name;
  monster.hp      = Math.floor(monster.hp  * 1.25);
  monster.atk     = Math.floor(monster.atk * 1.15);
  monster.def     = Math.floor(monster.def * 1.10);
  if (monster.mag) monster.mag = Math.floor(monster.mag * 1.20);
  monster.xp      = Math.floor(monster.xp   * 1.75);
  monster.gold    = Math.floor(monster.gold * 1.75);
  // Drops gated : voir §7.3 (filtre côté endBattle sur enemy.variant)
}
else if (floor >= 5) { … } // ancient
else if (floor >= 3) { … } // fierce
else                  { monster.variant = 'normal'; }
```

**Badge visuel** dans `js/battle-ui.js:60-65`, étendre l'expression :
```js
const badge = !dead && variant !== 'normal'
  ? `<div class="variant-badge variant-badge-${variant}">${
      variant === 'shiny'    ? '✨' :
      variant === 'ancient'  ? '💜' :
      variant === 'darkness' ? '🌑' :
      '🔴'  /* fierce */
    }</div>`
  : '';
```

**Halo violet** dans `css/style.css` — nouvelle règle dédiée. Pas
besoin de retoucher les PNG, juste un filter/box-shadow sur la card
ennemie quand le variant est `darkness`.

```css
.enemy-card.variant-darkness,
.enemy-card[data-variant="darkness"] {
  filter: drop-shadow(0 0 8px #a040ff) drop-shadow(0 0 16px #6020c0);
  animation: dark-pulse 1.6s ease-in-out infinite alternate;
}
@keyframes dark-pulse {
  from { filter: drop-shadow(0 0 6px #a040ff) drop-shadow(0 0 12px #6020c0); }
  to   { filter: drop-shadow(0 0 12px #c060ff) drop-shadow(0 0 24px #8040e0); }
}
.variant-badge-darkness {
  background: linear-gradient(135deg, #4a1a6a 0%, #1a0a2a 100%);
  border: 1px solid #c060ff;
  color: #e0c0ff;
  box-shadow: 0 0 6px #a040ff;
}
```

Pour que la card porte la classe : amender `battle-ui.js:68` :
```js
card.className = `enemy-card variant-${variant}${dead ? ' enemy-dead' : ''}`;
```
(remplace l'ancien — toutes les autres variants en bénéficient aussi,
mais sans styles définis ils n'ont aucun effet visible. Régression
zéro.)

**Avantages de cette approche** :
- **0 nouvel asset PNG**, **0 nouvelle entrée monstre**.
- Couvre les 50 monstres existants d'un coup.
- Boss Voldemort/Bellatrix deviennent automatiquement "Ténébreux
  Voldemort Ressuscité" / "Ténébreuse Bellatrix" au respawn post-victoire :
  re-affrontement narrativement cohérent.
- Les futures additions monstres bénéficient gratuitement de leur
  version Ténèbres.
- Compatibilité totale avec saves existantes : `victoryAchieved=false`
  par défaut → comportement actuel inchangé.

**Choix de couleur halo** : violet/pourpre (`#a040ff`). On évite le
rouge qui appartient déjà à `fierce` (🔴) et le bleu trop "magique
gentil". Le violet matche l'ambiance dark/Voldemort et complète le
badge ancient (💜) sans confusion grâce à l'animation pulse.

> ⚠️ **Variant `darkness` vs `ancient`** : à étage 11+ post-victoire,
> `darkness` prend la priorité (cf. ordre des `else if`). Donc plus de
> "Ancien Mangemort" au-delà de 10 — uniquement des "Ténébreux X". Ça
> simplifie la lecture du badge pour le joueur.

### 7.2bis Calibrage du scaling — Boucle Ténébreuse

**Formule actuelle** (`dungeon.js:16-29`) :
```
mult = (1 + (floor - 1) × base.scale) × diffMult
hp, atk, def, xp = base × mult
mag, agi, lck    = base (non scalés)
gold             = base × mult
```

**Formule revue pour la Boucle Ténébreuse** : on substitue `floor` par
`relFloor = floor − 10` quand `victoryAchieved && floor >= 11`. Puis on
applique les multiplicateurs darkness par-dessus :
```
relFloor = floor − 10                                (post-victoire, floor≥11)
mult     = (1 + (relFloor − 1) × base.scale) × diffMult
hp  = base.hp  × mult × 1.25
atk = base.atk × mult × 1.15
def = base.def × mult × 1.10
mag = base.mag × 1.20                                (mag toujours non scalé par mult)
xp  = base.xp  × mult × 1.75
gold = base.gold × mult × 1.75
```

#### Référentiel joueur (Normal, Gryffondor, équipement mid)

Pour la calibration, on estime la puissance du joueur **à chaque pilier
du second loop** (floor 11, 15, 18, 20). Les level-ups apportent
+8 HP, +5 SP, +1 ATK/DEF/MAG, +3 points à répartir, et +XP cumulé sur
~1.6× /palier.

| Floor | Niveau approx. | HP eff. | ATK eff. | DEF eff. | MAG eff. | LCK eff. |
|------:|---------------:|--------:|---------:|---------:|---------:|---------:|
| 11    | L11-12         | ~125    | ~22      | ~15      | ~24      | ~17      |
| 15    | L14-15         | ~165    | ~28      | ~20      | ~30      | ~19      |
| 18    | L17-18         | ~200    | ~32      | ~24      | ~34      | ~21      |
| 20    | L19-21         | ~225    | ~38 (épée Gryff t4) | ~28 | ~38 (diadème) | ~23 |

Drops Ténèbres en cours d'acquisition (cape_voldemort +DEF/MAG,
cendres_phenix +MAG/regenHp, oeil_basilic +crit/dodge) — non comptés
dans le tableau, marge de sécurité.

#### Stats des monstres clés en version Ténébreuse

`mult(relF) = 1 + (relF − 1) × scale` (Normal, diffMult = 1.0). Le
floor d'apparition est `minFloor + 10`. Stats finales avec darkness.

| Monstre | minFloor | scale | apparait à floor… | relF | mult | **HP** | **ATK** | **DEF** | **MAG** |
|---------|---------:|------:|-------------------|-----:|-----:|-------:|--------:|--------:|--------:|
| Chat de Mme Norris   | 1  | 0.15 | floor 11 | 1  | 1.00 | **13**  | **2**   | **1**  | 0  |
| Cornichon            | 1  | 0.15 | floor 11 | 1  | 1.00 | **15**  | **3**   | **2**  | 0  |
| Peeves               | 1  | 0.18 | floor 11 | 1  | 1.00 | **18**  | **4**   | **2**  | 0  |
| Mandragore Sauvage   | 2  | 0.20 | floor 12 | 2  | 1.20 | **36**  | **8**   | **4**  | 7  |
| Inférius             | 4  | 0.28 | floor 14 | 4  | 1.84 | **87**  | **27**  | **14** | 0  |
| Mangemort            | 5  | 0.30 | floor 15 | 5  | 2.20 | **110** | **30**  | **14** | 12 |
| Basilic Mineur       | 6  | 0.32 | floor 16 | 6  | 2.60 | **227** | **45**  | **23** | 14 |
| Mangemort d'Élite    | 7  | 0.32 | floor 17 | 7  | 2.92 | **201** | **53**  | **25** | 19 |
| Bellatrix            | 8  | 0.35 | floor 18 | 8  | 3.45 | **302** | **79**  | **30** | 24 |
| Voldemort Ressuscité | 10 | 0.40 | floor 20 | 10 | 4.60 | **575** | **148** | **70** | 30 |

> ✨ Voldemort Ténébreux à floor 20 = **+25 % HP / +16 % ATK** vs
> Voldemort original à floor 10 (HP 460/ATK 128). Final boss revisité,
> pas re-stomp d'un boss usé.

#### Combat-feel attendu

| Combat | Joueur niv. réf. | Dmg joueur/coup | Dmg ennemi/coup | Hits pour tuer | Hits pour mourir |
|--------|------------------|-----------------|-----------------|----------------|------------------|
| Chat Ténébreux (floor 11)   | L11 ATK 22 | 22−1 = 21       | 2−15 = 0    | **1**   | invulnérable  |
| Mandragore Ténébreuse (12)  | L11 ATK 22 | 22−4 = 18       | 8−15 = 0    | 2       | invulnérable  |
| Inférius Ténébreux (14)     | L13 ATK 25 | 25−14 = 11      | 27−18 = 9   | 8       | 22            |
| Mangemort Ténébreux (15)    | L14 ATK 28 | 28−14 = 14      | 30−20 = 10  | 8       | 16            |
| Bellatrix Ténébreuse (18)   | L17 ATK 32 | 32−30 = 2       | 79−24 = 55  | ~150    | 4             |
| Voldemort Ténébreux (20)    | L20 ATK 38 | 38−70 = 1       | 148−28 = 120| ~575    | 2             |

→ Lecture :
- **Floors 11-13** : easy lap — le joueur surclasse les Ténébreux des
  premiers floors d'origine. Loot facile, montée en puissance, drops
  Ténèbres commencent à tomber. C'est le "victory lap" attendu.
- **Floors 14-17** : palier d'équilibre. Le joueur fight des combats
  serrés mais lisibles. Idéal pour grinder les drops Ténèbres.
- **Floors 18-20** : retour de la difficulté → Bellatrix puis Voldemort
  Ténébreux sont des **murs réels**. Le joueur DOIT s'appuyer sur
  les drops Ténèbres + sorts magiques (qui ignorent DEF).

#### Multiplicateurs retenus

| Stat | Multiplier | Justification |
|------|-----------:|----------------|
| `hp`   | **× 1.25** | Marque visiblement la corruption, n'allonge pas le combat de plus de ~25 % |
| `atk`  | **× 1.15** | Boost subtil mais ressenti, le Ténébreux frappe ~15 % plus fort que son original |
| `def`  | **× 1.10** | DEF en seconde priorité — déjà saturée à haut niveau, +10 % suffit |
| `mag`  | **× 1.20** | `mag` n'est pas scalé par défaut → le ×1.20 est la seule croissance qu'aura ce stat ! Crucial pour les abilities magiques |
| `xp`   | **× 1.75** | Récompense claire pour un fight ~+25 % plus long |
| `gold` | **× 1.75** | Idem |

> **Note sur `mag`** : dans le moteur courant, `mag` reste constant
> à toute floor (cf. `scaleMonster()` ne touche pas `monster.mag`).
> Le ×1.20 darkness est donc la **seule** augmentation que reçoit
> cette stat. Pour Hécate (mag 22 → 26), Voldemort (25 → 30), c'est
> un boost notable des abilities sans toucher au framework.

#### Pourquoi pas plus fort ?

Tentation : booster davantage HP/ATK pour que le second loop soit
"vraiment dur" dès floor 11. Mauvaise idée parce que :

1. Le pool de floor 11 = **mobs d'origine du floor 1**. Si on les
   blinde, on perd l'effet "victory lap" qui rend le NG+ satisfaisant.
2. La courbe se construit toute seule via le scaling : Bellatrix
   Ténébreuse à floor 18 (HP 302, ATK 79) est déjà bien plus tough
   qu'une Bellatrix originale à floor 8 (HP 290, ATK 83 — équivalent),
   parce que le joueur n'a pas autant d'équipement à floor 18 que
   prévu pour floor 8.
3. Si trop dur dès floor 11, le joueur n'atteint jamais Voldemort
   Ténébreux à floor 20. Or c'est le climax voulu.

#### Projection des stats Voldemort Ténébreux au-delà floor 20

`relFloor > 10` n'est pas spécialement géré → la formule continue.

| Floor | relF | mult | HP | ATK | DEF |
|------:|-----:|-----:|---:|----:|----:|
| 20    | 10   | 4.60 | 575 | 148 | 70 |
| 22    | 12   | 5.40 | 675 | 174 | 84 |
| 25    | 15   | 6.60 | 825 | 213 | 99 |
| 30    | 20   | 8.60 | 1075| 277 | 132|

Au-delà de floor 25, le joueur est typiquement L25+ avec stats au
plafond — c'est un grind asymptotique attendu pour les sessions
post-endgame "longues". OK pour V1.

#### Sanity check : difficulté Expert

Bellatrix Ténébreuse floor 18, Expert (`diffMult = 1.45`) :
- HP  = 70 × 3.45 × 1.45 × 1.25 = **438**
- ATK = 20 × 3.45 × 1.45 × 1.15 = **115**

Voldemort Ténébreux floor 20, Expert :
- HP  = 100 × 4.60 × 1.45 × 1.25 = **834**
- ATK = 28 × 4.60 × 1.45 × 1.15 = **214**

Affrontable par un joueur Expert post-Voldemort (build optimisé,
sorts magiques avec mag ~38, drops Ténèbres) mais clairement tendu.
Pas d'ajustement spécial — `diffMult` existant gère le ratio
correctement.

#### À retoucher si le ressenti diffère

- **Premier loop trop facile (floors 11-13)** → laisser tel quel. C'est
  le victory lap voulu. Si trop ennuyeux, augmenter le `weight` des
  drops Ténèbres pour rendre le loot fréquent.
- **Mur à Bellatrix/Voldemort Ténébreux (floors 18-20)** → réduire
  d'abord `hp` (×1.20) avant `atk` (qui touche la survie joueur).
- **Sorts magiques surpuissants** → augmenter `mag` darkness à ×1.30
  pour que les abilities ennemies mordent plus.
- **Drops trop rares** → bump la chance de drop §7.3 de 8 % à 10-12 %.

### 7.3 Drops uniques post-victoire

3 nouveaux items dans `js/data.js — ITEMS[]` (rarity `legendary`).
Suggestions :

| id | name | slot | bonus |
|----|------|------|-------|
| `cape_voldemort` | Cape de l'Ombre | `cloak` | DEF+4, MAG+3, regenSp +1 |
| `cendres_phenix` | Cendres du Phénix | `amulet` | MAG+4, LCK+2, regenHp +4 |
| `oeil_basilic` | Œil de Basilic | `trinket` | bonusCritChance +10, bonusDodgeChance +5 |

**Gating** : maintenant que tous les monstres étage 11+ passent par le
variant `darkness`, on a deux stratégies possibles :

- **A — Drop sur variant** (recommandé) : ajout dans `endBattle()` —
  si `enemy.variant === 'darkness'`, roll un drop bonus 8% sur l'un
  des 3 nouveaux items (pondéré aléatoirement). Aucun champ à toucher
  dans `monsters.js`.
- **B — Drop par entrée** : ajouter manuellement le champ
  `requiresVictory: true` à des entrées de drop dans `monsters.js`
  pour `voldemort_revenu`, `bellatrix`, `mangemort_elite`. Plus
  granulaire mais demande maintenance par monstre.

**Décision V1 : stratégie A**. Elle profite automatiquement de tout
nouveau monstre. Code minimal dans `endBattle` :
```js
// après la loop de drops standard
if (enemy.variant === 'darkness' && Math.random() < 0.08) {
  const darkDrops = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];
  const pick = darkDrops[Math.floor(Math.random() * darkDrops.length)];
  if (player.inventory.length < 16) {
    player.inventory.push({...ITEMS.find(i => i.id === pick)});
    addMsg(`💎 Butin des Ténèbres : ${pick} !`, 'good');
  }
}
```

Pas de champ `requiresVictory` à ajouter dans `monsters.js` : le
gating est implicite via le variant.

### 7.4 Bestiaire enrichi (optionnel, V2)

Marquer dans le bestiaire les entrées ayant été rencontrées en variant
`darkness` avec un picto 🌑 à côté du portrait. La logique existante
`seenMonsters` couvre déjà la révélation ; il suffit d'ajouter un Set
parallèle `seenDarknessVariants` (sérialisé via `Array.from`).
Hors scope V1 si effort > 45 min.

## 8. Ce qui ne change pas (sanity)

- Aucun monstre supprimé ni dupliqué. Aucun étage retiré.
- Aucune quête bloquée ou auto-validée. La chaîne Dumbledore reste
  indépendante du trigger de victoire (elle peut être en cours, finie
  ou jamais commencée).
- Le HUD reste identique sauf le picto 🏆 sur le badge Maison.
- Les anciennes saves se chargent sans migration explicite (cf. §5).
  `victoryAchieved` défaut `false` → comportement courant inchangé.
- Le smoke test existant reste vert sans modification ; les nouveaux
  scénarios sont ajoutés, pas substitués.
- **Pré-victoire** : aucun visuel ni texte ne change. Voldemort se
  comporte exactement comme avant le plan. Seul l'escalier de l'étage
  10 prend un message dédié quand on tente d'y descendre.

## 9. Découpage en étapes

> Convention : `[ ]` à faire, `[x]` fait, `[~]` partiel/écart noté.

### Étape 1 — Squelette d'état & persistance
- [ ] Ajouter `victoryAchieved` + `victoryAt` à `js/state.js`
- [ ] Étendre `_serializeState` / `_applyState` dans `js/save.js`
- [ ] Étendre `_buildSlotMeta` avec `victory`
- **Vérif** : save → reload → `victoryAchieved` survit ; ancienne save migre à `false`.

### Étape 2 — Hook de trigger
- [ ] Créer `js/endgame.js` exposant `checkVictoryTrigger(id)` et `showVictoryScreen()`
- [ ] Référencer `endgame.js` dans `index.html` (avant `loader.js`)
- [ ] Ajouter l'entrée correspondante au MANIFEST de `loader.js`
- [ ] Brancher l'appel dans `battle.js — endBattle` après les kill-quests
- **Vérif** : en console, `checkVictoryTrigger('voldemort_revenu')` ouvre la modale ; `victoryAchieved` passe à `true` ; second appel = no-op (C4).

### Étape 3 — Modale victoire
- [ ] Ajouter `#victory-modal` dans `index.html`
- [ ] CSS dans `css/style.css` (réutiliser tokens parchemin/or existants)
- [ ] Câbler les deux boutons (Continuer / Retour au menu)
- **Vérif** : ouverture sans crash, close sans crash, double-click sur Continuer = idempotent.

### Étape 4 — Badge UI
- [ ] Picto 🏆 dans `save-ui.js` (rendu slot)
- [ ] Picto 🏆 dans `ui.js — updateUI` (badge Maison, sous condition)
- **Vérif** : visible uniquement quand `victoryAchieved === true`.

### Étape 5 — Gate de l'escalier étage 10
- [ ] Patch `movement.js — _showExploreOverlay()` cas `CELL.STAIRS_D` : afficher overlay scellé si `currentFloor === 10 && !victoryAchieved`
- [ ] Garde-fou dans `movement.js — goDeeper()` (early return + addMsg)
- **Vérif** : à l'étage 10 sans avoir tué Voldemort → "Passage scellé" + pas de bouton Descendre. Après kill → bouton Descendre dispo, descente fonctionne.

### Étape 6 — Bascule visuelle "Ténèbres" (textures)
- [ ] Patch `renderer.js — getWallTextureType()` pour basculer `rune_wall` à étage 11+ si `victoryAchieved`
- [ ] Idem pour `_floorKey` (`renderer.js:288`) → `rune_floor` et `_ceilKey` (`renderer.js:321`) → `rune_ceiling`
- [ ] Appeler `_invalidatePatternCache()` à l'instant du trigger pour forcer le re-render avec les bonnes textures
- **Vérif** : pré-victoire étage 11 (forcé via console) → cavern visible. Post-victoire étage 11 → runes visibles sans reload.

### Étape 7 — Boucle Ténébreuse : `effectiveFloor` + variant `darkness`
- [ ] Créer la fonction utilitaire `effectiveFloor(floor)` dans `dungeon.js` (cf. §7.2)
- [ ] Câbler aux **3 sites de filtrage du pool** : `dungeon.js:198`, `dungeon.js:259`, `battle.js:170` — remplacer `floor` par `effectiveFloor(floor)` dans la condition `m.minFloor <= … && (m.maxFloor === null || … <= m.maxFloor)`
- [ ] Modifier `dungeon.js — scaleMonster()` : utiliser `ef = effectiveFloor(floor)` pour le calcul de `mult`
- [ ] Ajouter la branche `darkness` dans `scaleMonster()` (priorité après shiny, avant ancient) — applique les ×1.25/×1.15/×1.10/×1.20/×1.75/×1.75 par-dessus le scaling déjà fait avec `ef`
- [ ] Étendre `battle-ui.js:60-65` : ajout du badge 🌑 et de la classe CSS `variant-${variant}` sur la card
- [ ] Ajouter règles CSS `.variant-darkness` + keyframes `dark-pulse` + `.variant-badge-darkness` dans `css/style.css`
- **Vérif 1** (pool) : forcer `victoryAchieved=true`, floor=11 → `MONSTERS.filter(...)` ne renvoie que les monstres avec `minFloor ≤ 1` (Chat, Cornichon, Peeves, etc.). Forcer floor=20 → pool = bestiaire complet incluant Voldemort.
- **Vérif 2** (scaling) : Chat de Mme Norris @ floor 11 darkness → HP ≈ 13. Mangemort @ floor 15 darkness → HP ≈ 110. Voldemort @ floor 20 darkness → HP ≈ 575. Mêmes valeurs que les tables §7.2bis.
- **Vérif 3** (UI) : combat à floor 11 → ennemi préfixé "Ténébreux ", badge 🌑, halo violet animé.

### Étape 8 — Drops uniques (stratégie A — variant-gated)
- [ ] 3 items dans `data.js` (cape_voldemort, cendres_phenix, oeil_basilic)
- [ ] Patch `battle.js — endBattle()` : roll bonus 8% si `enemy.variant === 'darkness'`
- **Vérif** : combattre 50 Ténébreux par script → environ 3-5 drops bonus. Combattre 50 ennemis pré-victoire → 0 drop bonus.

### Étape 9 — Soft NG+ feel (multiplicateurs + toast)
- [ ] Bump de proba groupe 3 dans `battle.js — rollGroupSize` (+10% étage 11+ post-victoire)
- [ ] Toast one-shot dans `movement.js — goDeeper` à la 1re entrée étage 11+ post-victoire (flag mémoire session)
- **Vérif** : toast s'affiche une seule fois ; revisiter étage 11 → pas de toast à nouveau.

> Note : le boost de stats (+30% HP / +20% ATK) est déjà couvert par
> l'étape 7 via le variant darkness — pas besoin d'une étape multiplicateur séparée.

### Étape 10 — Smoke tests
- [ ] `scenarioVictoryTrigger` : kill Voldemort → flag + modale (cf. §10)
- [ ] `scenarioStairsGated` : sur étage 10 avant kill → STAIRS_D overlay = "Passage scellé" ; après kill → "Descendre" dispo
- [ ] `scenarioDarkVariant` : forcer victoryAchieved+floor=11 + scaleMonster d'un monstre simple → assert `variant === 'darkness'` et name commence par "Ténébreux "
- **Vérif** : `node tests/smoke.js` passe vert.

### Étape 11 — Commit & push
- [ ] Commit message clair (cf. §11)
- [ ] Push sur `claude/game-review-improvements-QsPrU`
- [ ] Vérifier état PR avant push (`mcp__github__pull_request_read`) — cf. guidelines §6

## 10. Tests à ajouter (`tests/smoke.js`)

```js
// scénario : trigger de victoire one-shot + persistance
async function scenarioVictoryTrigger(page) {
  // 1. Forcer un état proche endgame
  await page.evaluate(() => {
    currentFloor = 10;
    party[0].level = 10; party[0].hp = 999; party[0].atk = 999;
    enemyGroup = [{ id: 'voldemort_revenu', name: 'Voldemort Ressuscité',
                    hp: 1, currentHp: 1, atk: 1, def: 0, mag: 1, agi: 1, lck: 1,
                    drops: [], xp: 100, gold: { min: 1, max: 1 } }];
    inBattle = true;
  });

  // 2. Lui mettre un coup
  await page.evaluate(() => battleAction('attack'));

  // 3. Vérifier le flag + l'ouverture de la modale
  const after = await page.evaluate(() => ({
    flag: victoryAchieved,
    modalOpen: document.getElementById('victory-modal')?.style.display !== 'none'
  }));
  assert(after.flag === true, 'victoryAchieved doit être à true');
  assert(after.modalOpen === true, '#victory-modal doit être affichée');

  // 4. Second trigger : idempotent (cinematic ne se re-joue pas)
  await page.evaluate(() => { document.getElementById('victory-modal').style.display = 'none'; });
  await page.evaluate(() => checkVictoryTrigger('voldemort_revenu'));
  const reopened = await page.evaluate(() =>
    document.getElementById('victory-modal').style.display !== 'none');
  assert(reopened === false, 'la modale ne doit pas se rouvrir au 2e kill');
}
```

## 11. Commit & PR

- Branche : `claude/game-review-improvements-QsPrU` (déjà créée, propre).
- Commit unique recommandé : `feat(endgame): écran de victoire + soft NG+ étages 11+`
- Avant push, vérifier que la PR liée n'existe pas déjà ou est ouverte
  (cf. guidelines §6).
- Pas d'ouverture de PR automatique sans demande explicite de l'utilisateur.

## 12. Hors-scope V1 (pour mémoire)

- Crédits déroulants
- Achievements / trophées
- NG+ dur (avec respec)
- Cinématique audio dédiée (TTS Dumbledore long format)
- Nouveau boss étage 15+ (Mort en personne, etc.)
- Marquage 🏆 dans le bestiaire

> Toute extension passera par un plan séparé.
