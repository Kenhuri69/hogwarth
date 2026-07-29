# Lot 4 — E4 : répartition des slots d'équipement (armes & armures)

**Branche :** `claude/premier-plan-finaliser-ocbn0z`
**Statut :** 🟦 livré — PR #743 (draft), en attente de CI
**Source :** `revue-sources-contenu-2026-07-28.md` §3.5 (axe **E4**, rang 9 de la
priorisation §5). Suite des lots 1 (A2·C3·C4), 2 (A1·P1 partiel) et 3 (E1).
**Arbitrage utilisateur (2026-07-28) :** E4 retenu comme lot 4.

---

## 1. Constat (re-mesuré sur cette branche, pas repris de la revue)

Comptage runtime des 121 équipables de `ITEMS` par slot :

| slot | trinket | amulet | head | ring | cloak | **wand** | body | belt | feet | hands |
|---|---|---|---|---|---|---|---|---|---|---|
| items | 25 | 20 | 16 | 12 | 12 | **9** | 7 | 7 | 7 | **6** |

Les slots « bijou » sont 3 à 4× mieux fournis que les slots « armure », et
`wand` — le slot d'arme, le plus structurant d'un build — n'a que 9 options
pour ~30 étages.

**Mesure complémentaire, absente de la revue** : le *best-in-slot achetable*
par étage (miroir de `equipmentBuffForFloor` du simulateur) montre que le
problème n'est pas que quantitatif, il est **temporel** — certains slots
n'offrent aucune progression pendant 5 à 7 étages :

| slot | étage 2 | étage 4 | étage 6 | étage 8 | étage 10 |
|---|---|---|---|---|---|
| `body` | robe1 (3) | robe1 (3) | robe1 (3) | robe1 (3) | pectoral_auror (8) |
| `wand` | wand1 (2) | lame_sanguinaire (5) | lame_sanguinaire (5) | lame_sanguinaire (5) | baton_ancestral (14) |
| `hands` | gants_apprenti (2) | gants_duelliste (3) | gantelets_combat (5) | gantelets_combat (5) | gantelets_aurors (14) |

`body` est **figé de l'étage 2 à l'étage 8** sur une robe commune à 150 G.

**Deux corrections au libellé de la revue**, vérifiées dans le code :

1. Le champ de riposte s'appelle **`bonusCounterChance`** (sommé dans
   `recalculateStats`, `js/inventory-core.js:348`), pas `counterChance` —
   ce dernier est la stat dérivée exposée sur le personnage.
2. **Aucun item du jeu ne déclare `bonusCounterChance`** : le levier est
   implémenté (`_tryGuardCounter`, `js/battle.js:551`, base 30 % plafond 40 %)
   mais **jamais alimenté par du loot**. C'est un levier gratuit, déjà testé,
   pour donner une identité aux slots d'armure.

## 2. Objectif

Porter `wand` à **12** et `body`/`hands`/`feet` à **10** chacun (**13 items
neufs**), orientés `bonusStr` / `bonusEnd` / `bonusCounterChance`, en
**comblant les paliers morts** plutôt qu'en relevant les plafonds.

### Contrainte anti-power-creep (règle de conception de ce lot)

Le simulateur choisit son best-in-slot sur une **somme brute de bonus**
(`tools/sim-difficulty.js:249`), indifférente au build. Un item neuf dont la
somme dépasse l'existant déplace donc la référence **de tous les builds**, y
compris caster — ce serait un buff global déguisé en enrichissement.

> **Règle** : un item **epic** de fin de courbe doit rester **sous** la somme
> du meilleur item existant de son slot au même étage. Il gagne sa place par
> son **profil** (ATK/STR/riposte au lieu de MAG), pas par son total.
> Les paliers `uncommon`/`rare` intermédiaires peuvent dépasser un plafond
> *local* quand ce plafond est précisément le palier mort à combler.

## 3. Contenu livré

### 3.1 Armes (`wand` 9 → 12)

| id | rareté | boutique | bonus | somme |
|---|---|---|---|---|
| `baguette_aubepine` | uncommon | ét. 5 | ATK+3 STR+2 | 5 |
| `fauchon_gobelin` | rare | ét. 7 | ATK+6 STR+3 | 9 |
| `epee_gobeline` | epic | ét. 10 | ATK+8 STR+3 | 11 (< `baton_ancestral` 14) |

### 3.2 Torse (`body` 7 → 10)

| id | rareté | boutique | bonus | somme |
|---|---|---|---|---|
| `cuirasse_cloutee` | uncommon | ét. 3 | DEF+3 END+1 | 4 |
| `haubert_mailles` | rare | ét. 6 | DEF+4 END+2 · Riposte +4 % | 6 |
| `armure_gardien` | epic | ét. 9 | DEF+5 END+2 · Riposte +5 % | 7 (< `pectoral_auror` 8) |

### 3.3 Mains (`hands` 6 → 10)

| id | rareté | boutique | bonus | somme |
|---|---|---|---|---|
| `mitaines_cuir` | common | ét. 2 | ATK+1 END+1 | 2 |
| `gantelets_gardien` | rare | ét. 5 | DEF+2 END+2 · Riposte +3 % | 4 (< `gantelets_combat` 5) |
| `poings_ferres` | rare | ét. 7 | ATK+4 STR+2 | 6 |
| `gantelets_dragonniers` | epic | ét. 10 | ATK+4 STR+4 END+2 | 10 (< `gantelets_aurors` 14) |

### 3.4 Pieds (`feet` 7 → 10)

| id | rareté | boutique | bonus | somme |
|---|---|---|---|---|
| `bottes_cloutees` | common | ét. 3 | DEF+2 END+1 | 3 |
| `greves_acier` | rare | ét. 6 | DEF+4 END+2 AGI−1 | 5 |
| `bottes_marche_forcee` | epic | ét. 9 | DEF+4 END+3 · Riposte +3 % | 7 (< `bottes_dragon` 8) |

### 3.5 Riposte — budget global

4 pièces portent `bonusCounterChance` (5+4+3+3 = 15). Le plafond dur de
`_tryGuardCounter` est **40 %** pour une base de 30 % → **+10 utiles**.
Deux à trois pièces suffisent à atteindre le plafond : c'est un objectif de
build lisible, pas une stat à empiler indéfiniment.

### 3.6 Diffusion

- **Boutique** : une entrée `SHOP_CATALOG` par item (`minFloor` ci-dessus).
- **Coffres** : automatique — `pickChestEquipment` prend *tout* item avec un
  `slot` non légendaire, pondéré par rareté (`CHEST_RARITY_MIN_FLOOR`).
  Aucun code à toucher.

## 4. Étapes

1. [x] Plan écrit (ce fichier) — §5 des guidelines.
2. [x] Mesure d'avant : best-in-slot par étage + comptage par slot (§1).
3. [x] 13 items dans `js/data-items.js` → **vérifier** : comptage par slot =
   wand 12 · body 10 · hands 10 · feet 10.
4. [x] 13 entrées `SHOP_CATALOG` (`js/shop.js`) → **vérifier** : chaque item
   apparaît dans le best-in-slot à son étage d'entrée.
5. [x] 13 recettes `tools/icon_factory.py` + 65 PNG (5 mipmaps) + 13 entrées
   `ITEM_ICON_NEW_REGISTRY` → **vérifier** : `check_content_refs.js` ne
   signale ni référence pendante ni icône manquante (couverture 134/134).
6. [x] Mesure d'après : best-in-slot rejoué → **vérifier** que les 4 epics
   n'ont pas déplacé le best-in-slot (règle §2), et que `body` progresse
   désormais aux étages 3/6/9.
7. [x] Sim d'équilibrage `sim-difficulty.js --build=offensive` avant/après →
   **vérifier** : pas de dérive au-delà du bruit sur les étages 1-12.
8. [x] `CLAUDE.md` : compteurs d'items (218 → 231, 121 → 134 équipables).
9. [x] `node tools/check_content_refs.js` (231 items · 1 240 réf.) ·
   `node tests/units.js` (1 130 assertions) · ESLint · `check_doc_modules` ·
   `node tests/smoke.js inventory shop equip item` → **11 scénarios verts**,
   dont « Phase 4 : 231 items mappés + inventaire + boutique 100 % PNG ».
10. [x] Cache-bump (`data-items.js`, `shop.js`, `item-icons.js`) + `CACHE_VERSION`
    → `node tools/check_cache_versions.js --base origin/master` + `pwa-smoke`
    (cache `hogwarth-v270`, 109 entrées, chargement offline OK).
11. [x] Commit → push → **PR draft #743** (aucune PR pré-existante sur la branche, vérifié avant push — §6).

## 5. Garde-fous

- **Surgical (§3)** : on ajoute des entrées de données ; aucun moteur touché
  (ni `battle.js`, ni `inventory-core.js`, ni `pickChestEquipment`).
- **Pas de nouveau champ** : `bonusStr`/`bonusEnd`/`bonusCounterChance`
  existent tous et sont déjà consommés par `recalculateStats`.
- **Icônes** : le projet est à 121/121 de couverture PNG sur les équipables —
  ce lot ne doit pas l'entamer.
- **Cache PWA (§8)** : 3 fichiers servis modifiés → bump obligatoire.

## 6. Écarts constatés en cours de route

- Le nom de champ de la revue (`counterChance`) était faux → `bonusCounterChance` (§1).
- La revue annonçait « ~10 par slot d'armure » sans dire lesquels : `belt` (7)
  est laissé de côté — il vient de recevoir 2 epics (`ceinture_aurors`,
  `poincon_gobelin`) et n'a pas de palier mort. Le lot se concentre sur les
  trois slots réellement figés : `body`, `hands`, `feet`.
- `pip install pillow cairosvg numpy scipy` était nécessaire dans ce bac à
  sable (dépendances du pipeline d'icônes absentes de l'image).
- **`masse_gobeline` renommé `fauchon_gobelin`** : le seul part d'arme de mêlée
  disponible est `sword.svg` — une « masse » rendue en épée est un mensonge
  visuel. Le nom suit l'art, pas l'inverse.
- **Un part SVG neuf a été nécessaire** (`tools/parts/cuirass.svg`, 3 régions
  plate/trim/strap) : `hood.svg`, le seul part torse existant, rend une
  **capuche**. Les trois premiers rendus de torse lisaient comme des capes.
- La couverture d'icônes exigée par le smoke porte sur le registre **legacy**
  (`ITEM_ICON_REGISTRY`), pas sur le painterly : 13 entrées de repli de famille
  ont dû être ajoutées en plus des 13 entrées `ITEM_ICON_NEW_REGISTRY`.
- Deux retouches de palette après lecture des rendus : `cuirasse_cloutee`
  (cuir trop sombre, illisible à 64 px) et `greves_acier` (`material="metal"`
  saturait en blanc sur la silhouette de botte → `leather` + palette acier).

## 7. Mesures

### 7.1 Comptage par slot

| | wand | body | hands | feet |
|---|---|---|---|---|
| avant | 9 | 7 | 6 | 7 |
| après | **12** | **10** | **10** | **10** |

Total items 218 → **231**, équipables 121 → **134**, couverture d'icônes PNG
**134/134** (aucune régression : le projet était à 121/121).

### 7.2 Best-in-slot achetable (somme brute des bonus) — avant → après

| étage | wand | body | hands | feet | total 10 slots |
|---|---|---|---|---|---|
| 2 | 2 → 2 | 3 → 3 | 2 → 2 | 2 → 2 | 15 → 15 |
| 4 | 5 → 5 | 3 → **4** | 3 → 3 | 3 → 3 | 37 → 38 |
| 6 | 5 → 5 | 3 → **6** | 5 → 5 | 4 → **5** | 51 → 55 |
| 8 | 5 → **9** | 3 → **6** | 5 → **6** | 8 → 8 | 67 → 75 |
| 10 | 14 → 14 | 8 → 8 | 14 → 14 | 8 → 8 | **97 → 97** |

**L'étage 10 est strictement inchangé** : la règle anti-power-creep du §2 tient,
les 4 epics neufs ne déplacent aucune référence endgame. Les hausses tombent
exactement sur les paliers morts du §1.

### 7.3 Simulation (`--build=offensive`, 300 sims, « run d'étage complet »)

Étage réussi %, avant → après :

| étage | Solo | Duo |
|---|---|---|
| 1-4 | inchangé (100/98 %) | inchangé (100 %) |
| 5 | 68 % → 69 % | 100 % → 100 % |
| 6 | 28 % → **47 %** | 91 % → **99 %** |
| 7 | 27 % → 29 % | 70 % → **81 %** |
| 8 | 3 % → **10 %** | 37 % → **57 %** |
| 9 | 3 % → 6 % | 15 % → **25 %** |
| 10 | 1 % → 2 % | 11 % → 17 % |
| 11-12 | 2 % → 2 % / 1 % → 0 % | 4 % → 6 % / 6 % → 6 % |

**Lecture honnête : ce lot n'est pas neutre en puissance.** Le gain se
concentre sur les étages 6-9 — ceux dont le palier d'équipement était mort —
et culmine à **+19 points** de réussite solo à l'étage 6 et **+20** en duo à
l'étage 8. Les étages 1-5 et 11-12 ne bougent pas : rien n'est donné en early
game, rien n'est donné en Boucle.

Deux réserves à garder en tête :

1. Le simulateur **équipe gratuitement** le best-in-slot de chaque étage. En
   jeu, ces pièces coûtent 90 à 1 400 G — le gain réel sera plus faible et
   étalé, mais son **sens** (rattrapage mid-game) est celui visé par E4.
2. Si une neutralité stricte était souhaitée, le levier n'est pas les stats
   mais le **prix** et le `minFloor` : c'est réglable sans retoucher un item.

L'ampleur reste à confirmer sur un échantillon plus large que 300 sims.
