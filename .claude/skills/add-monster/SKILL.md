---
name: add-monster
description: Ajouter ou modifier un monstre/ennemi/boss du jeu Poudlard & Magie — stats, capacités, résistances/faiblesses élémentaires, lore bestiaire, sprite de combat. Utiliser dès qu'on veut une créature affrontable, même si l'utilisateur nomme juste une créature de l'univers HP sans dire « monstre » (« ajoute un Strangulot à l'étage 3 », « un boss pour l'étage 12 », « un ennemi qui inflige la peur »). Touche surtout js/monsters.js. Ne PAS utiliser pour un PNJ non combattant (npcs.js), un personnage jouable (skill add-playable-character) ni une icône d'objet d'inventaire (skill add-item-icon).
---

# Ajouter un monstre

Le registre `MONSTERS` est découpé (Lot B P3.3) en **4 fichiers chargés en
séquence** ; le moteur (scaling, combat, drops, spawn, bestiaire) s'adapte
automatiquement :
- `js/monsters.js` (socle) : header de doc + `const MONSTERS = []` + `TEMPLATE`
  commenté. **Aucune entrée ici.**
- `js/monsters-low.js` : `MONSTERS.push(…)` — étages 1-7.
- `js/monsters-mid.js` : `MONSTERS.push(…)` — étages 4-10.
- `js/monsters-high.js` : `MONSTERS.push(…)` — étage 10+, boss, Boucle, Gardiens.

**Éditer le fichier de tranche qui correspond au `minFloor` du monstre.**

## Étapes

### 1. Définir l'entrée dans le bon `js/monsters-{low,mid,high}.js`
Copier le `TEMPLATE` (en bas de `js/monsters.js`) et l'insérer dans le
`MONSTERS.push( … )` du fichier de tranche correspondant au `minFloor`
(low = 1-7, mid = 4-10, high = 10+/boss/Boucle). Champs :

```js
{
  id:       "mon_monstre",        // unique, snake_case
  name:     "Nom du Monstre",
  icon:     "🐾",                 // emoji fallback
  imgSrc:   "img/monsters/mon_monstre.png", // sprite combat (voir §3)
  category: "bête",               // bête | humain | fantôme | créature | être magique
  desc:     "Phrase d'apparition en combat.",
  lore:     "Texte bestiaire.",
  habitat:  "Lieu de vie.",       // optionnel (bestiaire)
  anecdote: "Anecdote canon HP.", // optionnel (bestiaire)
  danger:   5,                    // optionnel 1-11 (couleur bestiaire)
  minFloor: 1, maxFloor: 5,       // maxFloor:null = sans limite
  weight:   8,                    // 10=commun, 5=rare, 2=très rare, 1=boss
  hp: 20, atk: 5, def: 2, mag: 0, agi: 10, lck: 8,
  scale:    0.25,                 // progression/étage : 0.15 lent → 0.40 rapide
  abilities: [
    { name: "Cri", icon: "💥", desc: "…",
      effect: "damage", power: 8, chance: 0.30 }
    // effect: damage | heal | weaken | drain | status | dispel | maxhpdamage
    // status → ajouter statusId:"burn"|"poison"|"bleed"|"gel"|"stun"|"fear" + turns:2
  ],
  ai:     "aggressive",           // aggressive | cautious | random
  resist: ["physique"],           // feu|glace|foudre|lumière|ténèbres|physique|disarm
  weak:   ["feu"],
  xp: 15, gold: { min: 5, max: 15 },
  drops: [ { itemId: "potion_s", chance: 0.08 } ]
}
```

Rappels moteur (voir `CLAUDE.md`) :
- **Brutes** (`atk ≥ 1.5×mag` & `atk ≥ 12`) reçoivent automatiquement Broyer
  (`maxhpdamage`) via `scaleMonster` — ne pas le déclarer à la main.
- Un **boss** porte `weight: 1` et, si musique épique voulue, `epic: true`.
- `resist`/`weak` matchent sur `spell.element`, pas `effect`. `disarm` est une
  résistance mécanique (bloque Expelliarmus).

### 2. Choisir l'étage / la fréquence
`minFloor`/`maxFloor`/`weight` suffisent : le spawn naturel et le scaling
sont gérés par `dungeon-scaling.js` + `battle.js`. Aucun câblage de spawn
manuel sauf cible de quête (voir `dungeon-spawning.js`).

### 3. Sprite de combat (`imgSrc`)
Le sprite est rendu par `_getMonsterImg(enemy.imgSrc)`
(`renderer-entities.js`). Deux options :

- **PNG (recommandé pour les monstres majeurs)** : générer l'image (ex. Nano
  Banana, prompts cadrés dans `.claude/plans/nano-banana-prompts-*.md` et
  `IMG_STYLE.md`), puis la traiter :
  ```bash
  # Prérequis À LA DEMANDE : rembg + son modèle (LOURD, plusieurs centaines de
  # Mo téléchargés au 1er run) — n'installer que pour ce chemin PNG :
  python3 -c "import rembg" 2>/dev/null || python3 -m pip install rembg
  python3 tools/process_monster_png.py --src /chemin/image.png --id mon_monstre --dry-run
  # vérifier /tmp/mon_monstre_check.png puis relancer sans --dry-run
  ```
  Produit `img/monsters/mon_monstre.png` (détourage rembg, 512², specs IMG_STYLE).
  Si l'install échoue (politique réseau de l'environnement web bloquant PyPI ou
  le téléchargement du modèle), le signaler — préférer alors le fallback SVG.
- **Fallback SVG / catégorie** : si pas de PNG dédié, le monstre hérite du
  SVG de sa `category`. Pour un SVG propre, ajouter une entrée dans
  `js/icons.js` (`getMonsterIconHtml()`).

### 4. Bestiaire
Aucune action requise : `openBestiary()` lit automatiquement le monstre. Les
champs `lore`/`habitat`/`anecdote`/`danger` enrichissent la fiche s'ils sont
présents. Le monstre apparaît une fois rencontré (`seenMonsters`).

### 5. Vérifier — non-régression obligatoire (guidelines §7)
```bash
node tests/smoke.js
```
Si tu ajoutes un comportement combat nouveau non couvert, ajoute un scénario
dans `tests/smoke.js` **dans le même commit**.

## Pièges
- Insérer l'entrée DANS le `MONSTERS.push( … )` du bon fichier de tranche
  (pas dans le socle `monsters.js`). Séparer les entrées par une virgule ;
  une virgule traînante avant le `)` final est tolérée.
- `id` doit être unique — sinon collision de spawn/quête/bestiaire.
- Un nouveau global critique exporté ailleurs devrait être ajouté au MANIFEST
  de `loader.js` ; pour un simple monstre, rien à faire (donnée dans MONSTERS).
