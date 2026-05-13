# ENDGAME_PLAN — Écran de victoire + Boucle Ténébreuse

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure, noter les écarts.

## Table des matières

1. [Objectif](#1-objectif)
2. [Contraintes dures](#2-contraintes-dures)
3. [Trigger de victoire](#3-trigger-de-victoire)
4. [Cinématique de victoire (non bloquante)](#4-cinématique-de-victoire-non-bloquante)
5. [Persistance](#5-persistance)
6. [UI badge "Vainqueur"](#6-ui-badge-vainqueur)
7. **Soft NG+ — Étages des Ténèbres (11+)**
   - 7.1 [Principe](#71-principe)
   - 7.1bis [Démarcation visuelle — Textures](#71bis-démarcation-visuelle--textures-des-ténèbres)
   - 7.1ter [Escalier scellé](#71ter-escalier-de-létage-10--scellé-tant-que-voldemort-vit)
   - 7.2 [Roster — Boucle originale Ténébreuse](#72-roster-monstres-étages-11--boucle-originale-ténébreuse)
   - 7.2bis [Calibrage scaling — Boucle Ténébreuse](#72bis-calibrage-du-scaling--boucle-ténébreuse)
   - 7.3 [Drops uniques](#73-drops-uniques-post-victoire)
   - 7.4 [Bestiaire enrichi (V2)](#74-bestiaire-enrichi-optionnel-v2)
   - 7.5 [**Forge des Ténèbres** (Tranche 2)](#75-forge-des-ténèbres-item-upgrade--tranche-2)
   - 7.6 [**Bibliothèque interdite** (Tranche 2)](#76-bibliothèque-interdite-spell-upgrade--tranche-2)
   - 7.7 [**Maison Tier 5** (Tranche 2)](#77-maison-tier-5-post-victoire--tranche-2)
   - 7.8 [**Set bonus Ténèbres** (Tranche 2)](#78-set-bonus-ténèbres--tranche-2)
   - 7.9 [Récompenses scalées](#79-récompenses-scalées--tranche-1-intégré-au-variant)
   - 7.10 [Consommables Ténèbres](#710-consommables-ténèbres--tranche-2-drop--tranche-1-essencepage)
8. [Ce qui ne change pas (sanity)](#8-ce-qui-ne-change-pas-sanity)
9. [Découpage en étapes (2 tranches → 2 PRs)](#9-découpage-en-étapes-2-tranches--2-prs)
10. [Tests à ajouter (`tests/smoke.js`)](#10-tests-à-ajouter-testssmokejs)
11. [Commit & PR](#11-commit--pr)
12. [Hors-scope (V2+)](#12-hors-scope-pour-mémoire--v2-ou-plus-tard)

---

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
  monster.hp      = Math.floor(monster.hp  * 1.50);
  monster.atk     = Math.floor(monster.atk * 1.12);
  monster.def     = Math.floor(monster.def * 1.15);
  if (monster.mag) monster.mag = Math.floor(monster.mag * 1.15);
  monster.xp      = Math.floor(monster.xp   * 2.00);
  monster.gold    = Math.floor(monster.gold * 2.00);
  // Drops gated : voir §7.3 + §7.9 (filtre côté endBattle sur enemy.variant)
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
hp  = base.hp  × mult × 1.50      ← combat plus long, plus de marge tactique
atk = base.atk × mult × 1.12      ← faible boost — à haut niveau, +ATK ennemi
                                    a un impact disproportionné (dmg = atk - def
                                    avec DEF qui sature). On évite les one-shots.
def = base.def × mult × 1.15
mag = base.mag × 1.15             ← réduit (vs ×1.30 initial). La formule
                                    abilities = power + mag/2 amplifie déjà la
                                    magie. Sur-bumper rendait Avada/Cruciatus
                                    létaux dès floor 14-15.
xp  = base.xp  × mult × 2.00
gold = base.gold × mult × 2.00
```

> **Profil retenu** : monstres significativement **plus tanky** (HP ×1.50)
> et **un peu plus dangereux** physiquement (ATK ×1.12) / magiquement
> (MAG ×1.15). Le combat dure plus longtemps sans devenir létal — laisse
> au joueur le temps d'utiliser ses sorts upgradés, ses consommables,
> et son set Ténèbres. Récompenses très généreuses (xp/gold ×2) pour
> compenser la longueur des fights et financer la Forge / Bibliothèque.

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

#### Stats des monstres clés en version Ténébreuse (multiplicateurs retenus)

`mult(relF) = 1 + (relF − 1) × scale` (Normal, diffMult = 1.0). Le
floor d'apparition est `minFloor + 10`. Stats finales avec darkness
**×1.50 / ×1.12 / ×1.15 / ×1.15** (hp / atk / def / mag).

| Monstre | minFloor | scale | apparait à floor… | relF | mult | **HP** | **ATK** | **DEF** | **MAG** |
|---------|---------:|------:|-------------------|-----:|-----:|-------:|--------:|--------:|--------:|
| Chat de Mme Norris   | 1  | 0.15 | floor 11 | 1  | 1.00 | **15**  | **2**   | **1**  | 0  |
| Cornichon            | 1  | 0.15 | floor 11 | 1  | 1.00 | **18**  | **3**   | **2**  | 0  |
| Peeves               | 1  | 0.18 | floor 11 | 1  | 1.00 | **21**  | **4**   | **2**  | 0  |
| Mandragore Sauvage   | 2  | 0.20 | floor 12 | 2  | 1.20 | **43**  | **8**   | **4**  | 8  |
| Inférius             | 4  | 0.28 | floor 14 | 4  | 1.84 | **104** | **26**  | **15** | 0  |
| Mangemort            | 5  | 0.30 | floor 15 | 5  | 2.20 | **132** | **29**  | **15** | 11 |
| Basilic Mineur       | 6  | 0.32 | floor 16 | 6  | 2.60 | **273** | **44**  | **24** | 16 |
| Mangemort d'Élite    | 7  | 0.32 | floor 17 | 7  | 2.92 | **241** | **52**  | **27** | 18 |
| Bellatrix            | 8  | 0.35 | floor 18 | 8  | 3.45 | **362** | **77**  | **32** | 23 |
| Voldemort Ressuscité | 10 | 0.40 | floor 20 | 10 | 4.60 | **690** | **144** | **74** | 28 |

> ✨ Voldemort Ténébreux à floor 20 = **+50 % HP / +12 % ATK** vs
> Voldemort original à floor 10 (HP 460/ATK 128). Profil très tanky
> mais frappant à peine plus fort — les ressources du joueur (PM,
> potions) sont vraiment mises à l'épreuve sur la durée du fight.

#### Combat-feel attendu (joueur sans boost §7.5+)

Référentiel "joueur nu" sans Forge/Bibliothèque/Tier 5/Set bonus —
pour mesurer ce que les mécaniques de boost doivent combler.

| Combat | Joueur niv. réf. | Dmg joueur/coup | Dmg ennemi/coup | Hits pour tuer | Hits pour mourir |
|--------|------------------|-----------------|-----------------|----------------|------------------|
| Chat Ténébreux (floor 11)   | L11 ATK 22 | 22−1 = 21       | 2−15 = 0    | **1**   | invulnérable  |
| Mandragore Ténébreuse (12)  | L11 ATK 22 | 22−4 = 18       | 8−15 = 0    | 3       | invulnérable  |
| Inférius Ténébreux (14)     | L13 ATK 25 | 25−15 = 10      | 26−18 = 8   | 11      | 23            |
| Mangemort Ténébreux (15)    | L14 ATK 28 | 28−15 = 13      | 29−20 = 9   | 11      | 18            |
| Bellatrix Ténébreuse (18)   | L17 ATK 32 | 32−32 = 1       | 77−24 = 53  | ~360    | 4             |
| Voldemort Ténébreux (20)    | L20 ATK 38 | 38−74 = 1       | 144−28 = 116| ~690    | 2             |

→ Vs version précédente du plan (atk ×1.22, mag ×1.30) :
- Bellatrix dmg/coup 60 → **53** (gain de marge survie joueur ~+13 %)
- Voldemort dmg/coup 129 → **116** (gain ~+10 %)
- HP des bosses ~+10-15 % (combat plus long)
- Le joueur a clairement plus de "fenêtre" pour caster ses sorts.

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
| `hp`   | **× 1.50** | **Tanky** — combat ~+50 % plus long, donne tout le temps tactique nécessaire. Le joueur doit gérer ses ressources (PM, potions) sur la durée du combat plutôt que survivre à un burst. |
| `atk`  | **× 1.12** | **Volontairement bas** — la formule `dmg = atk - def` saturée à haut niveau fait qu'un +1 ATK = +1 dmg sec ; bumper ATK trop fort multiplie les one-shots. ×1.12 garde la pression sans rendre les coups létaux. |
| `def`  | **× 1.15** | Léger ralentissement de l'offensive physique, pousse vers les sorts upgradés (Bibliothèque) |
| `mag`  | **× 1.15** | **Réduit vs version précédente** (était ×1.30). La formule abilities = `power + mag/2` amplifie déjà la magie ; sur-bumper rendait Avada/Cruciatus quasi-létaux dès floor 14-15. ×1.15 maintient une menace magique sans la rendre dictatoriale. |
| `xp`   | **× 2.00** | Reward × 2 — incite à descendre malgré la difficulté, finance les coûts Forge/Bibliothèque |
| `gold` | **× 2.00** | Idem — l'or devient une vraie ressource d'upgrade |

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
| 20    | 10   | 4.60 | 690 | 144 | 74 |
| 22    | 12   | 5.40 | 810 | 169 | 87 |
| 25    | 15   | 6.60 | 990 | 207 | 106|
| 30    | 20   | 8.60 | 1290| 270 | 138|

Au-delà de floor 25, le joueur est typiquement L25+ avec items
forge level 5 et tier 5 Maison — c'est un grind asymptotique attendu
pour les sessions post-endgame "longues". OK pour V1.

#### Sanity check : difficulté Expert (sans boost joueur)

Bellatrix Ténébreuse floor 18, Expert (`diffMult = 1.45`) :
- HP  = 70 × 3.45 × 1.45 × 1.50 = **525**
- ATK = 20 × 3.45 × 1.45 × 1.12 = **112**

Voldemort Ténébreux floor 20, Expert :
- HP  = 100 × 4.60 × 1.45 × 1.50 = **1000**
- ATK = 28 × 4.60 × 1.45 × 1.12 = **209**

**Tendu mais affrontable** : le joueur Expert post-Voldemort a accès
aux mécaniques §7.5+ (Forge, Bibliothèque, Tier 5, set Ténèbres,
larme du phénix pure). Voldemort 1000 HP demande ~50 casts d'Avada
level 3 (power 56) — finançable par les drops de PM et le set bonus
regen. Le `diffMult` existant gère le ratio ; pas d'ajustement spécial.

#### À retoucher si le ressenti diffère

- **Premier loop trop facile (floors 11-13)** → laisser tel quel. C'est
  le victory lap voulu. Si trop ennuyeux, augmenter le `weight` des
  drops Ténèbres pour rendre le loot fréquent.
- **Mur à Bellatrix/Voldemort Ténébreux (floors 18-20)** → réduire
  d'abord `hp` (×1.35 ou ×1.25) plutôt que `atk` (qui touche directement
  la survie joueur).
- **Joueur clean trop facilement à coups physiques** → augmenter
  doucement `def` darkness (×1.20). Évite de toucher `atk` qui crée
  des spikes de létalité.
- **Sorts ennemis trop faibles (abilities ne mordent pas)** → bumper
  `mag` darkness (×1.20-×1.25) pour que les Avada/Cruciatus aient
  plus de portée.
- **Drops trop rares** → bump la chance de drop §7.3 de 8 % à 10-12 %,
  ou bump le `dropChanceMultiplier` Ténèbres §7.9 de ×1.5 à ×1.75.

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

---

### 7.5 Forge des Ténèbres (item upgrade) — Tranche 2

**Pourquoi** : compense le scaling Ténèbres bumpé en permettant au
joueur d'investir gold + matériaux dans ses items équipés.

**Cellule spéciale** : nouvelle constante `CELL.FORGE = 8` dans
`js/data.js`. Génération dans `dungeon.js` :
- 1 Forge garantie par floor 11, 14, 17, 20 (cadence 1 / 3 floors).
- Placement : une room intermédiaire au choix (cf. logique existante
  pour `CELL.FOUNTAIN`).
- Icône scène : nouvelle entrée `SCENE_ICONS.forge` (SVG inline,
  enclume rougeoyante).

**Interaction** : `handleCellEntry` détecte `CELL.FORGE` → ouvre une
modale dédiée `#forge-modal`.

**Modèle d'upgrade** : chaque item équipable acquiert un champ
`upgradeLevel` (entier 0 à 5). Persisté naturellement par
`Object.assign` dans le slot d'équipement.

**Coûts d'amélioration** (par niveau cible) :

| Level cible | Gold | Essence des Ténèbres |
|------------:|-----:|---------------------:|
| 1 | 80   | 1 |
| 2 | 160  | 2 |
| 3 | 320  | 3 |
| 4 | 640  | 5 |
| 5 | 1280 | 8 |
| **Cumul** | **2480** | **19** |

L'essence des Ténèbres est un nouveau consommable (cf. §7.10), drop
~3 % sur tout Ténébreux.

**Effet par level** : `recalculateStats()` lit `upgradeLevel` et
ajoute `+upgradeLevel` au bonus principal de l'item (= le plus
élevé parmi `bonusAtk/bonusDef/bonusMag/bonusLck`). Si plusieurs
bonus sont à égalité, +`upgradeLevel` à chacun (cas rare).

Exemples (cap level 5) :

| Item | Bonus base | Bonus level 5 |
|------|-----------|---------------|
| wand1 (Saule, common) | ATK+2 | ATK+7 |
| wand2 (Sureau, rare) | ATK+4 MAG+2 | ATK+9 MAG+2 |
| sword_gryff (legendary) | ATK+8 LCK+2 | ATK+13 LCK+2 |
| amulette (epic) | MAG+3 | MAG+8 |
| robe1 (common) | DEF+3 | DEF+8 |

**Cas spécial : items grant-spell / regen** — `upgradeLevel` ne touche
pas les `grantsSpell` / `regenHp` / `regenSp`. Ces effets sont
binaires et restent identiques.

**Migration** : items existants → `upgradeLevel = 0` par défaut (lazy
init dans `recalculateStats`). Pas de coercition explicite à appliquer.

**UI** :
- Modale `#forge-modal` liste tous les items équipés des 2 personnages.
- Chaque ligne : icône item, nom (level), bonus actuel → bonus après
  upgrade, coût, bouton « Améliorer ».
- Bouton grisé si gold insuffisant ou essences insuffisantes ou
  level cap atteint.

**Vérif** :
- Wand1 acheté en boutique floor 1 → reste ATK+2 jusqu'à atteinte
  d'une Forge. À la forge floor 11, upgrade level 1 → ATK+3 (coût
  80 gold + 1 essence). `recalculateStats` reflète le bonus dès la
  sortie de modale.

---

### 7.6 Bibliothèque interdite (spell upgrade) — Tranche 2

**Pourquoi** : les sorts du joueur sont actuellement plats (puissance
fixe dès qu'on les apprend). À haut niveau, ils sont trop faibles
face aux Ténébreux. La Bibliothèque amplifie les sorts existants.

**Cellule spéciale** : `CELL.LIBRARY = 9` dans `data.js`.
Génération dans `dungeon.js` :
- 1 Bibliothèque garantie par floor 12, 15, 18 (offset par rapport
  aux Forges pour ne pas overlap).

**Interaction** : `handleCellEntry` → ouvre `#library-modal`.

**Modèle d'upgrade** : nouveau champ par perso
`c.spellUpgrades = { 'Incendio': 2, 'Reparo': 0, ... }`. Map nom-sort
→ level (0-3). Persisté via `_serializeState` (ajouter le champ).

**Coûts d'amélioration** :

| Level cible | Gold | Page de Grimoire |
|------------:|-----:|------------------:|
| 1 | 120 | 1 |
| 2 | 240 | 2 |
| 3 | 480 | 3 |
| **Cumul** | **840** | **6** |

Page de Grimoire = nouveau consommable §7.10, drop ~2 % sur tout
Ténébreux.

**Effet par level** dans `battle-spells.js — castSpellInBattle()` :
- `+2 × level` à la `power` du sort (dégâts ou heal)
- `−1 × level` au `cost` SP (plancher à 1 SP)
- `+5 % × level` à la `chance` d'appliquer le statut (burn, stun,
  bleed) — capé à 50 % avant éventuels bonus de stat

Exemples (cap level 3) :

| Sort | Stats base | Stats level 3 |
|------|-----------|---------------|
| Incendio (burn) | power 14, cost 6 | power 20, cost 3, chance status +15 pp |
| Reparo (heal)   | power 20, cost 7 | power 26, cost 4 |
| Avada (instant) | power 50, cost 20| power 56, cost 17 |

**UI** :
- Modale `#library-modal` : sélecteur de perso (radio Harry/Hermione
  si duo), puis liste des sorts appris du perso sélectionné.
- Chaque ligne : icône sort, nom (level), preview des stats actuels
  → preview après upgrade, coût, bouton « Amplifier ».

**Migration** : si un perso n'a pas `spellUpgrades` (vieille save) →
init `{}` dans `_applyState` post-`Object.assign`.

**Vérif** :
- Hermione apprend Incendio (niv 1, power 14). À la Bibliothèque
  floor 12, upgrade Incendio level 1 → power 16 cost 5. En combat,
  Incendio fait `16 + mag/2` dégâts au lieu de `14 + mag/2`.

---

### 7.7 Maison Tier 5 post-victoire — Tranche 2

**Pourquoi** : tier 4 atteint vers ~1000 points = floor 10. Sans
nouveau palier, l'incitation à grinder s'effondre en NG+. Tier 5
offre une carotte continue pendant tout le second loop.

**Seuil** : 2000 points cumulés. **Uniquement** trigger si
`victoryAchieved` (gated dans `checkHouseLevelUp` de `main.js`).

**Bonus par Maison** (`HOUSE_BONUSES` étendu, `state.js`) :

| Maison      | Tier 5 stats             | Item légendaire+ |
|-------------|--------------------------|------------------|
| Gryffondor  | ATK+3, STR+1, HP+5       | `lame_godric` — épée (ATK+12, LCK+3, slot wand) |
| Serpentard  | MAG+3, LCK+1, regenSp +2 | `bague_salazar` — anneau (MAG+8, LCK+5) |
| Poufsouffle | DEF+3, END+1, HP+10      | `bouclier_helga` — body (DEF+10, HP+15) |
| Serdaigle   | MAG+2, INT+2, crit+5 %   | `codex_rowena` — trinket (MAG+10, INT+3) |

Les bonus stat sont appliqués en `_baseX` (croissent au level-up
exactement comme tiers existants). Les items sont **distincts** des
items tier 4 et peuvent être équipés en même temps (slots différents
sauf Gryff : Lame de Godric peut écraser l'Épée si même slot wand,
choix joueur).

**UI** :
- Le badge Maison HUD (`#house-crest`) affiche tier 5 quand atteint
  (réutilise `_updateHouseBadge`).
- Modale level-up Maison déclenchée comme aux autres tiers.

**Migration** : aucune. Champ `houseTier` peut passer à 5, ce qui
ne casse pas la logique existante (clamp à `Object.keys(tiers).length`).

**Vérif** :
- En partie post-victoire, accumuler 2000 pts (forcer via console
  pour le smoke test : `housePoints = 2000; checkHouseLevelUp()`) →
  tier passe à 5, bonus stats appliqués, item correspondant ajouté
  à l'inventaire.
- En partie **pré**-victoire, atteindre 2000 pts → reste tier 4
  (gated par `victoryAchieved`).

---

### 7.8 Set bonus Ténèbres — Tranche 2

**Pourquoi** : les 3 drops Ténèbres (cape_voldemort, cendres_phenix,
oeil_basilic) ont chacun un effet propre, mais aucune synergie. Ajouter
un set bonus encourage le joueur à compléter le set complet.

**Set défini** :
```js
const TENEBRES_SET = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];
```

**Bonus** (appliqués dans `recalculateStats()` après les bonus
d'équipement classiques) :

| # équipés | Bonus |
|----------:|-------|
| 2 | bonusCritChance +10, bonusDodgeChance +5 |
| 3 | bonusCritChance +15, bonusDodgeChance +10, regenHp +2 |

**Calcul** : compter les items équipés du set par perso (boucle sur
`c.equipped`). Ajout à `c.critChance` et `c.dodgeChance` via les
champs existants `bonusCritChance/bonusDodgeChance`. RegenHp s'ajoute
dans `applyEquipmentRegen` (battle.js) — extension du même mécanisme
qui lit déjà `item.regenHp`, on injecte une source virtuelle.

**UI** :
- Aucune nouvelle modale. Tooltip enrichi sur chaque item du set :
  ligne supplémentaire « Set Ténèbres (2/3) — crit +10 % » avec
  compteur actuel.
- Carte perso (fiche) : badge « Set Ténèbres complet » si 3/3.

**Vérif** :
- Équiper 2 items du set → recalculateStats donne crit chance +10.
- Équiper 3 → crit chance +15, dodge +10, regenHp +2 par tour
  (visible en combat).

---

### 7.9 Récompenses scalées — Tranche 1 (intégré au variant)

Le bump des multiplicateurs `xp×2.00` et `gold×2.00` (§7.2bis) couvre
déjà 80 % du besoin. On complète avec **3 ajouts** côté drops :

**A. Drop chance des drops standards × 1.5** sur Ténébreux.
Implémentation dans `endBattle()` :
```js
const dropMult = (enemy.variant === 'darkness') ? 1.5 : 1.0;
for (const d of enemy.drops) {
  if (Math.random() < d.chance * dropMult) { … }
}
```

**B. Maison points × 1.5** sur kill Ténébreux. Dans `endBattle` :
```js
const points = BASE_POINTS_BY_DIFFICULTY[difficulty]
             * (enemy.variant === 'darkness' ? 1.5 : 1.0);
housePoints += Math.floor(points);
```
Effet : avec Normal (10 pts/kill base), Ténébreux donne 15 pts → tier 5
(2000 pts) atteignable en ~140 kills Ténèbres = grosso modo une session
floor 11→20 complète. Bon ratio.

**C. Drops Ténèbres-only via variant gating** — déjà spec en §7.3
(8 % cape/cendres/oeil) + nouveaux drops §7.10 :
- 5 % drop `potion_xl` ou `potion_xl_sp` (rand entre les deux)
- 3 % drop `essence_tenebres` (matière Forge)
- 2 % drop `page_grimoire` (matière Bibliothèque)
- 30 % drop `larme_phenix_pure` **uniquement** sur Voldemort Ténébreux

**Vérif** : combattre 100 Ténébreux par script (forcer `victoryAchieved=true`,
floor=15) → environ 8 cape/cendres/oeil, 5 potions XL, 3 essences,
2 pages de grimoire. Tester sur Voldemort spécifiquement pour la
larme pure.

---

### 7.10 Consommables Ténèbres — Tranche 2 (drop) + Tranche 1 (essence/page)

**Distinction tranche** : `essence_tenebres` et `page_grimoire` sont
nécessaires aux Forge/Bibliothèque (tranche 2). Pour la tranche 1,
seuls les nouveaux consommables jouables sont introduits.

**Nouveaux items dans `js/data.js — ITEMS[]`** :

| ID | Nom | Type | Effet | Source primaire |
|----|-----|------|-------|-----------------|
| `potion_xl` | Élixir Suprême | consumable | restore 100 % HP du perso ciblé | drop Ténèbres 5 %, boutique floor 15+ (200 g) |
| `potion_xl_sp` | Élixir d'Esprit Suprême | consumable | restore 100 % SP du perso ciblé | drop Ténèbres 5 %, boutique floor 15+ (200 g) |
| `larme_phenix_pure` | Larme du Phénix Pure | consumable | auto-revive 1 fois si KO ce combat (effet passif au pickup) | drop Voldemort Ténébreux 30 % |
| `essence_tenebres` | Essence des Ténèbres | material | matériau Forge §7.5 | drop Ténèbres 3 % |
| `page_grimoire` | Page de Grimoire | material | matériau Bibliothèque §7.6 | drop Ténèbres 2 % |

**Implémentation matériaux** :
- Type `material` : non utilisable directement, juste stocké en
  inventaire. Affichage avec icône grisée + tag « Matériau ».
- Consommé lors d'un upgrade Forge/Bibliothèque.

**Implémentation larme du phénix pure** :
- Effet « passif au pickup » = au moment où le perso passe `hp <= 0`
  en combat, si l'inventaire contient une `larme_phenix_pure`,
  consommer 1, restaurer `hpMax`, retirer le statut KO. Log dédié.
- Implémenté dans `battle.js — triggerDeath()` (early return + heal +
  pop de l'item).

**Catalogue boutique** (Tranche 1) : étendre `shop.js — SHOP_CATALOG`
avec `potion_xl` et `potion_xl_sp` à `minFloor: 15`.

**Vérif** :
- `potion_xl` utilisé sur Harry à 30/120 HP → Harry passe à 120/120 HP.
- Harry KO en combat avec 1 `larme_phenix_pure` en inventaire →
  ressuscite avec full HP, l'item disparaît.

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

## 9. Découpage en étapes (2 tranches → 2 PRs)

> Convention : `[ ]` à faire, `[x]` fait, `[~]` partiel/écart noté.
>
> **Tranche 1 — Endgame core (PR 1)** : étapes 1-11.
> Trigger, modale, persistance, badge, gate stairs floor 10, bascule
> textures, variant Ténébreuse + scaling, drops uniques §7.3,
> récompenses scalées §7.9, consommables jouables §7.10 (potion_xl,
> potion_xl_sp, larme_phenix_pure), smoke tests, push.
>
> Critère de "shippable" : le joueur peut tuer Voldemort, voir la
> modale, descendre à floor 11+, fight des Ténébreux avec leur halo,
> récupérer les 3 drops Ténèbres et les nouveaux consommables.
>
> **Tranche 2 — Mécaniques de progression endgame (PR 2)** : étapes 12-17.
> Forge, Bibliothèque, Maison Tier 5, Set bonus, matériaux
> (essence_tenebres, page_grimoire), smoke tests étendus, push.
>
> Critère de "shippable" : le joueur peut investir gold + matériaux
> pour upgrader items et sorts, atteindre tier 5 Maison, recevoir
> le set bonus.

---

### 🟢 TRANCHE 1 — ENDGAME CORE

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
- [ ] Ajouter la branche `darkness` dans `scaleMonster()` (priorité après shiny, avant ancient) — applique les ×1.50/×1.12/×1.15/×1.15/×2.00/×2.00 par-dessus le scaling déjà fait avec `ef`
- [ ] Étendre `battle-ui.js:60-65` : ajout du badge 🌑 et de la classe CSS `variant-${variant}` sur la card
- [ ] Ajouter règles CSS `.variant-darkness` + keyframes `dark-pulse` + `.variant-badge-darkness` dans `css/style.css`
- **Vérif 1** (pool) : forcer `victoryAchieved=true`, floor=11 → `MONSTERS.filter(...)` ne renvoie que les monstres avec `minFloor ≤ 1` (Chat, Cornichon, Peeves, etc.). Forcer floor=20 → pool = bestiaire complet incluant Voldemort.
- **Vérif 2** (scaling) : Chat de Mme Norris @ floor 11 darkness → HP ≈ 15. Mangemort @ floor 15 darkness → HP ≈ 132. Voldemort @ floor 20 darkness → HP ≈ 690. Mêmes valeurs que les tables §7.2bis.
- **Vérif 3** (UI) : combat à floor 11 → ennemi préfixé "Ténébreux ", badge 🌑, halo violet animé.

### Étape 8 — Drops uniques + récompenses scalées (§7.3 + §7.9)
- [ ] 3 items dans `data.js` (cape_voldemort, cendres_phenix, oeil_basilic)
- [ ] Patch `battle.js — endBattle()` : pour chaque enemy `variant === 'darkness'`, appliquer `dropMult = 1.5` sur la loop de drops standards, puis rouler les drops Ténèbres (8 % pour l'un des 3 items)
- [ ] Patch `battle.js — endBattle()` : Maison points × 1.5 pour les kills Ténébreux
- **Vérif** : combattre 50 Ténébreux par script → environ 3-5 drops Ténèbres, +50 % de potions vs un combat normal. Combattre 50 ennemis pré-victoire → 0 drop bonus.

### Étape 9 — Consommables jouables (§7.10 — partie Tranche 1)
- [ ] Items `potion_xl`, `potion_xl_sp`, `larme_phenix_pure` dans `data.js`
- [ ] Comportement Élixirs Suprêmes : `useItem()` restore 100 % HP/SP du perso ciblé
- [ ] Comportement larme du Phénix Pure : hook dans `battle.js — triggerDeath()` → si inventory contient l'item, consommer, full heal, ressuscitation
- [ ] Ajouter `potion_xl` et `potion_xl_sp` au `SHOP_CATALOG` (`shop.js`) avec `minFloor: 15`
- [ ] Drops :
  - 5 % `potion_xl` ou `potion_xl_sp` (random) sur tout Ténébreux
  - 30 % `larme_phenix_pure` sur Voldemort Ténébreux uniquement
- **Vérif** : `potion_xl` ramène un perso à 30/120 HP au max (120/120). Harry KO en combat avec une larme pure en inventaire → ressuscite avec full HP, l'item disparaît.

### Étape 10 — Soft NG+ feel (toast + groupe)
- [ ] Bump de proba groupe 3 dans `battle.js — rollGroupSize` (+10% étage 11+ post-victoire)
- [ ] Toast one-shot dans `movement.js — goDeeper` à la 1re entrée étage 11+ post-victoire (flag mémoire session)
- **Vérif** : toast s'affiche une seule fois ; revisiter étage 11 → pas de toast à nouveau.

### Étape 11 — Smoke tests + commit/push (Tranche 1)
- [ ] `scenarioVictoryTrigger` : kill Voldemort → flag + modale (cf. §10)
- [ ] `scenarioStairsGated` : sur étage 10 avant kill → STAIRS_D overlay = "Passage scellé" ; après kill → "Descendre" dispo
- [ ] `scenarioDarkVariant` : forcer victoryAchieved+floor=11 + scaleMonster d'un monstre simple → assert `variant === 'darkness'` et name commence par "Ténébreux "
- [ ] `scenarioDarkRewards` : forcer 10 Ténébreux scaleMonster → assert xp/gold ≈ 2× la version normale
- [ ] `node tests/smoke.js` vert
- [ ] Commit + push sur `claude/game-review-improvements-QsPrU` — ouvrir **PR 1** « Endgame core »

---

### 🟣 TRANCHE 2 — MÉCANIQUES DE PROGRESSION ENDGAME

> Critère d'entrée : PR 1 mergée, branche à jour avec master.

### Étape 12 — Matériaux + drops Forge/Bibliothèque (§7.10 — partie Tranche 2)
- [ ] Items `essence_tenebres`, `page_grimoire` dans `data.js` (type `material`)
- [ ] Affichage inventaire : matériaux non utilisables, icône grisée + tag « Matériau »
- [ ] Drops dans `battle.js — endBattle()` sur Ténébreux : 3 % essence, 2 % page (pondérations indépendantes)
- **Vérif** : matériaux apparaissent dans l'inventaire mais ne sont pas cliquables comme un consommable.

### Étape 13 — Forge des Ténèbres (§7.5)
- [ ] Nouvelle constante `CELL.FORGE = 8` dans `data.js`
- [ ] Génération : 1 Forge garantie sur floors 11, 14, 17, 20 (extension de `dungeon.js`)
- [ ] Icône scène `SCENE_ICONS.forge` (SVG inline)
- [ ] Modale `#forge-modal` dans `index.html` + CSS dédié
- [ ] Logique `openForge()` : liste items équipés des 2 persos avec preview level → +1
- [ ] Champ `c.equipped[slot].upgradeLevel` lazy-init dans `recalculateStats()` et utilisé pour le bonus
- [ ] Couts en gold + `essence_tenebres` selon la table §7.5
- **Vérif** : wand1 (ATK+2) upgrade level 1 → ATK+3 ; level 5 → ATK+7. Coût correct. Bouton grisé si gold ou essence insuffisante.

### Étape 14 — Bibliothèque interdite (§7.6)
- [ ] Nouvelle constante `CELL.LIBRARY = 9` dans `data.js`
- [ ] Génération : 1 Bibliothèque garantie sur floors 12, 15, 18
- [ ] Icône scène `SCENE_ICONS.library`
- [ ] Champ `c.spellUpgrades` (Map ou plain object) initialisé sur chaque perso ; persisté via `_serializeState` + `_applyState`
- [ ] Modale `#library-modal` (sélecteur perso, liste sorts, preview upgrade, bouton)
- [ ] Patch `battle-spells.js — castSpellInBattle()` : lookup level, applique +2×level power, −1×level cost (min 1), +5%×level status chance
- [ ] Coûts en gold + `page_grimoire` selon la table §7.6
- **Vérif** : Incendio (power 14, cost 6) upgrade level 1 → power 16, cost 5. Cast en combat consomme 5 PM au lieu de 6 et fait `16 + mag/2` dmg.

### Étape 15 — Maison Tier 5 (§7.7)
- [ ] Étendre `HOUSE_BONUSES` dans `state.js` avec entrée tier 5 par Maison (stats + item légendaire+ associé)
- [ ] Patch `checkHouseLevelUp()` (`main.js`) : gérer le passage 4 → 5, **gated** par `victoryAchieved`
- [ ] 4 nouveaux items dans `data.js` : `lame_godric`, `bague_salazar`, `bouclier_helga`, `codex_rowena`
- [ ] Patch `_updateHouseBadge` (`ui.js`) pour afficher tier 5
- **Vérif** : pré-victoire, atteindre 2000 pts → reste tier 4. Post-victoire, atteindre 2000 pts → tier 5 déclenché, item correspondant ajouté à l'inventaire, badge mis à jour.

### Étape 16 — Set bonus Ténèbres (§7.8)
- [ ] Constante `TENEBRES_SET` exportée depuis `data.js` (ids des 3 items)
- [ ] Patch `recalculateStats()` : compter items du set équipés par perso, ajouter `bonusCritChance/bonusDodgeChance` + flag `_tenebresSet3 = true` si full set
- [ ] Patch `applyEquipmentRegen()` (`battle.js`) : si `_tenebresSet3`, ajouter +2 regen HP par tour
- [ ] Enrichir le tooltip d'item dans `inventory.js` avec la ligne « Set Ténèbres (n/3) — bonus actuels »
- **Vérif** : équiper 2 items → crit +10, dodge +5. Équiper 3 → crit +15, dodge +10, +2 regen HP par tour visible en combat.

### Étape 17 — Smoke tests + commit/push (Tranche 2)
- [ ] `scenarioForgeUpgrade` : forcer Forge → upgrade wand1 level 1 → wand1.upgradeLevel === 1 et recalculateStats donne bonus ATK+3
- [ ] `scenarioLibraryUpgrade` : forcer Bibliothèque → upgrade Incendio level 1 → c.spellUpgrades['Incendio'] === 1 ; cast vérifie le bonus
- [ ] `scenarioHouseTier5` : forcer victoryAchieved + 2000 points → tier passe à 5, item ajouté
- [ ] `scenarioTenebresSet` : équiper 3 items du set → crit/dodge bonus + regen
- [ ] `node tests/smoke.js` vert
- [ ] Commit + push sur une **nouvelle branche dérivée de master post-PR 1** (`claude/endgame-progression-mechanics`)
- [ ] Ouvrir **PR 2** « Endgame progression mechanics » — cf. guidelines §6 pour vérifier l'état PR 1 avant.

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

### PR 1 — Endgame core (Tranche 1)

- Branche : `claude/game-review-improvements-QsPrU` (déjà créée, propre).
- Commits idéalement scopés : 1 commit par étape (1-11) ou 1 commit
  par thématique cohérente (état+save, modale+UI, gate+textures,
  variant+roster, drops+récompenses, consommables, smoke tests).
- Titre PR suggéré : `feat(endgame): écran de victoire + boucle Ténébreuse + drops`
- Body : résumer §3 (trigger), §7.2 (boucle relFloor), §7.2bis (multiplicateurs),
  §7.3 (drops gated), §7.9 (récompenses scalées), §7.10 (consommables V1).

### PR 2 — Mécaniques de progression endgame (Tranche 2)

- **Avant de commencer** : vérifier l'état de PR 1 via `mcp__github__pull_request_read`.
  Si mergée → repartir de master à jour, créer une nouvelle branche
  `claude/endgame-progression-mechanics`. Si encore ouverte → continuer
  sur la même branche post-merge, ou attendre.
- Étapes 12-17.
- Titre PR suggéré : `feat(endgame): Forge + Bibliothèque + Maison Tier 5 + Set bonus`
- Body : résumer §7.5 / §7.6 / §7.7 / §7.8, et matériaux §7.10 (Tranche 2).

### Règles communes

- Avant chaque push, vérifier que la PR n'est pas mergée/closed
  (guidelines §6) — ne JAMAIS pousser sur branche post-merge.
- Pas d'ouverture de PR automatique sans demande explicite de l'utilisateur.

## 12. Hors-scope (pour mémoire — V2 ou plus tard)

- Crédits déroulants après victoire
- Achievements / trophées système global
- NG+ dur (respec stats, nouveau cap niveau)
- Cinématique audio dédiée (TTS Dumbledore long format)
- Nouveau boss étage 21+ (Mort en personne, Reliques)
- Marquage 🌑 dans le bestiaire pour les variants vus
- Tier 6 Maison (loop de prestige)
- Upgrade Forge level 6+ (super-upgrade avec matériau ultra-rare)
- Skill tree complet par perso
- Sorts uniques exclusifs au second loop (à apprendre par grimoire dropable)

> Toute extension passera par un plan séparé.
