# Audit & Stabilisation du contenu — Sprint endgame étages 8+

> **Objectif** : auditer le contenu existant pour identifier précisément ce qui manque sur les étages 8 et au-delà (zone post-mid-game et Boucle Ténébreuse), puis combler avec boss + PNJ + quêtes + items sans ajouter de nouvelle mécanique.
>
> **Décisions cadres** (validées) :
> - Style des boss : **mix canon HP + créations originales**
> - Art : **PNG via Nano Banana** (cohérent avec le Bloc B récent)
> - Drops : **variables selon le boss** (case-by-case design)
> - Pas de New Game+ (la Boucle Ténébreuse suffit)
> - Pas de Multiplayer V2 ni de refonte difficulté (sains)

---

## 1. Méthode

Audit data-driven : extraction par grep + python des champs `minFloor`/`maxFloor`/`floor` dans `monsters.js`, `npcs.js`, `quests.js`, `shop.js`. Simulation Monte Carlo (200 combats/cellule) via `tools/sim-difficulty.js` pour mesurer la balance.

Pas de spéculation : chaque trou listé en §5 est une absence vérifiée dans le code, pas une intuition.

---

## 2. État du contenu — vue tableau par étage

### 2.1 Synthèse globale

| Étage | Monstres éligibles | PNJ déterministes | PNJ aléatoires éligibles | Quêtes (giver) | Items boutique nouveaux | Winrate solo (sim) | Winrate duo (sim) |
|------:|-------------------:|------------------:|-------------------------:|---------------:|------------------------:|-------------------:|------------------:|
| 1 | 10 | 2 | 2 | 5 | 6 | 100 % | 100 % |
| 2 | 19 | 4 | 5 | 3 | 6 | 100 % | 100 % |
| 3 | 28 | 4 | 8 | 4 | 6 | 100 % | 100 % |
| 4 | 31 | 3 | 9 | 2 (+3 « 4+ ») | 5 | 100 % | 100 % |
| 5 | 35 | 2 | 9 | 3 (+2 « 5+ ») | 8 | 99 % | 100 % |
| 6 | 37 | 2 | 9 | 4 | 7 | 88 % | 100 % |
| 7 | 34 | 1 | 9 | 1 (+1 « 7+ ») | 4 | 78 % | 100 % |
| **8** | **27** | **0** | **9** | **0** | **0** | **65 %** | **99 %** |
| **9** | **22** | **0** | **9** | **0** | **1** | **43 %** | **93 %** |
| **10** | **18** | **0** | **9** | **1** (Dumbledore palier final) | **0** | **38 %** | **87 %** |

> **Lecture** : la transition vers la zone « post-victoire » est brutale en contenu narratif. Les étages 8-10 sont peuplés en monstres (27→18) mais désertés en PNJ/quêtes/items. La Boucle Ténébreuse (étages 11-21 puis 21-30…) recycle ces pools via `effectiveFloor()` (dungeon.js:52), donc tout contenu ajouté ici sert aussi tous les paliers suivants.

### 2.2 Détail monstres « late-game » (étages 8+)

| Étage | Monstres uniques à cet étage et au-delà | epic | weight |
|------:|:-----------------------------------------|:----:|-------:|
| 7+ | `mangemort_elite`, `hecate_sorciere`, `gargouille` (5-10) | non | 4 |
| 8+ | `bellatrix` | **oui** | 2 |
| 9+ | `voldemort_affaibli` | **oui** | 2 |
| 10+ | `voldemort_revenu` | **oui** | 1 |

Aux étages 6+, 8 monstres `epic: true` existent déjà : `basilic`, `chimere`, `ombre_quirrell`, `bibliothecaire_ombre`, `nagini`, `bellatrix`, `voldemort_affaibli`, `voldemort_revenu`. Bonne base, mais **pool d'élites uniques aux étages 8-10 = 3 seulement** (Bellatrix, Voldemort×2).

### 2.3 PNJ et quêtes — la rupture étage 8

PNJ déterministes (étage où ils vivent) :
- Étage 1 : Dumbledore (intro), Manon
- Étage 2 : Pomfresh, Mimi, Scamander, Slughorn
- Étage 3 : Lockhart, Lupin, Hagrid, Ollivander
- Étage 4 : McGonagall, Rogue, Flitwick
- Étage 5 : Chourave, Guipure
- Étage 6 : Portrait Dumbledore, Fumseck
- Étage 7 : *(1 PNJ)*
- **Étage 8+ : aucun**

PNJ aléatoires (apparition par seed d'étage) : `rosmerta`, `mundungus`, `sir_nicolas`, `moine_gras`, `rusard`, `scamander_random`, `hagrid_random`, `trelawney`. Ils tournent partout dès `minFloor 1-4`, donc présents en étages 8-10 mais sans content scénarisé pour cette tranche.

Quêtes par giver :
- 5 chez Dumbledore (chaîne narrative principale, dont la palier 10+)
- 4 sets de Maison (givers : McGonagall/Rogue/Flitwick/Chourave, cibles étages 4-6)
- 4 quêtes de don endgame (palier Mythe, mêmes givers, donate 3000 g)
- 18 quêtes secondaires variées (étages 1-7)
- **0 quête native étages 8-9**, 1 quête « cible étage 10+ » (Dumbledore révélation)

### 2.4 Boutique — gap critique étages 8-14

45 entrées `SHOP_CATALOG` (shop.js) avec `minFloor` étalé :
- 1=6, 2=6, 3=6, 4=5, 5=8, 6=7, 7=4 (38 entrées)
- **8=0, 9=1** (`livre_glacius` step plus), 10-14=0, 15=2, 16+=0 (7 entrées)

L'offre s'effondre dès l'étage 7. Un joueur qui atteint l'étage 8+ n'a plus aucun nouvel équipement à acheter — la progression matérielle dépend entièrement des drops.

---

## 3. Détail Forge / Bibliothèque

### 3.1 Forge des Ténèbres (`js/forge.js`, 169 lignes)

| Aspect | État |
|---|---|
| Mécanique | Upgrade item équipé `+0`→`+5`, bonus principal +N |
| Matériau | `essence_tenebres` (data.js:342) |
| Source d'Essence | 3 % drop sur tout monstre tué (battle.js:822) — **aucune autre source** |
| Cellules d'accès | floors 11/14/17/20 post-victoire |
| Coût palier 5 | 1280 g + 8 Essences |

**Compatibilité items** : `_primaryBonus()` (forge.js:37) cherche la plus haute valeur parmi `bonusAtk/Def/Mag/Lck`. Items équipables sans aucun de ces 4 bonus → label « Aucune stat à forger », bouton désactivé.

À vérifier en Phase 2 : combien d'items équipables n'ont aucun `bonus*` primaire ? Cas particuliers attendus : items à `grantsSpell` pur, items à `regenHp` pur (ex : `larmes_phenix`). Décision design à formaliser.

### 3.2 Bibliothèque Interdite (`js/library.js`, 173 lignes)

| Aspect | État |
|---|---|
| Mécanique | Upgrade sort connu `+0`→`+3` : power +2/lvl, cost −1/lvl, chance +0.05/lvl |
| Matériau | `page_grimoire` (data.js:344) |
| Source de Pages | 2 % drop sur tout monstre tué (battle.js:828) |
| Cellules d'accès | floors 12/15/18 post-victoire |
| Coût palier 3 | 480 g + 3 Pages |

**Compatibilité sorts** : tous les sorts du perso sont listés (library.js:134). Sorts sans `power` (ex : Protego pur, Wingardium Leviosa, Avada Kedavra binaire) → affichent un upgrade `power 0 → 2` qui n'a aucun effet utile. Faux positif visuel à corriger en Phase 2.

### 3.3 Sources de matériaux — l'autre trou

Essence (3 %) et Pages (2 %) ne droppent **que** sur les kills. Aucune source alternative :
- Pas de drop boutique
- Pas de quête qui en récompense
- Pas de drop boss dédié

Sur une run typique de 40 kills entre les étages 11 et 21, l'espérance est ~1.2 Essence + 0.8 Page. Insuffisant pour faire monter ne serait-ce qu'un item au palier 2 (160 g + 2 Essences) sans ponçage prolongé.

---

## 4. Trous identifiés (numérotés, ordonnés par priorité)

| # | Trou | Étages concernés | Sévérité |
|---|------|-------------------|----------|
| T1 | Aucun PNJ déterministe étages 8-10 | 8, 9, 10 + Boucle 18-20, 28-30… | 🔴 critique |
| T2 | 0 quête native étages 8-9, 1 seule à 10+ | 8, 9, 10+ | 🔴 critique |
| T3 | Catalogue boutique vide à partir de l'étage 8 (sauf 1 livre étage 9) | 8-14 (puis 15+ presque vide) | 🔴 critique |
| T4 | Pool d'élites uniques aux étages 8-10 très mince (3 monstres) | 8, 9, 10 | 🟠 important |
| T5 | Matériaux Forge/Biblio uniquement par drop aléatoire faible | 11+ post-victoire | 🟠 important |
| T6 | Items équipables sans `bonus*` primaire → grisés en Forge | transversal | 🟡 polish |
| T7 | Sorts sans `power` (utilitaires) → upgrade Biblio sans effet visuel utile | transversal | 🟡 polish |
| T8 | Spike difficulté solo étage 8→9 (65 % → 43 %, −22 pts) | 8, 9 | 🟡 design |

T1-T5 sont les trous **structurels** que Phase 3 doit combler. T6-T7 sont des bugs de présentation à fixer en Phase 2. T8 est un effet de bord à surveiller si Phase 3 ajoute beaucoup d'ennemis nouveaux étages 8-9.

---

## 5. Esquisse Phase 3 — boss & contenu par tranche

Principe : on conçoit pour les étages 8, 9, 10 (pool de base). La Boucle Ténébreuse les recycle automatiquement avec scaling endgame.

### 5.1 Tranche étage 8 — « Le Seuil »

**Thème narratif** : on bascule de l'école vers le monde sorcier hostile.

| Bloc | Proposition (à valider en PR dédiée) |
|------|---------------------------------------|
| Boss canon | **Fenrir Greyback** — loup-garou monstrueux, `epic: true`, `weight: 1`, capacités morsure + frénésie |
| Boss original | **Le Veilleur du Seuil** — gardien magique du passage vers les Profondeurs |
| PNJ donneur | **Kingsley Shacklebolt** — Auror posté en avant-garde, donne 2 quêtes |
| PNJ secondaire | Vendeur clandestin (équipement Auror) |
| Quêtes | (a) Kill Greyback (chaîne Kingsley) → drop griffes + Essence ×3 ; (b) Kill Veilleur → drop clé runique ; (c) Fetch 5 herbes anti-loups |
| Items boutique | Casque d'Auror, Bottes renforcées, Cape de combat, Potion Loups, Anneau Anti-Magie |
| Monstres d'appoint | Loup-Garou Adulte (variante du `loup_garou` existant), Auror Corrompu |

### 5.2 Tranche étage 9 — « Les Profondeurs »

**Thème** : on entre dans les territoires des grandes créatures.

| Bloc | Proposition |
|------|---------------------------------------|
| Boss canon | **Aragog** — chef des Acromantules, `epic: true`, drop venin (matériau craft potion ?) |
| Boss original | **Maître des Détraqueurs** — figure tutélaire, drop fragment d'âme |
| PNJ donneur | **Bill Weasley** — briseur de sortilèges, expert en lieux maudits |
| PNJ secondaire | Apothicaire ténébreux (vente potions endgame) |
| Quêtes | (a) Kill Aragog → drop venin pur ; (b) Kill Maître Détraqueur → libère un PNJ piégé ; (c) Collect 3 plumes Acromantule |
| Items boutique | Grande Potion de Soin (étage 9), Diadème antique, Bague de Protection, Robe de Combat |
| Monstres d'appoint | Acromantule Adulte (vs jeune existant), Détraqueur d'Élite |

### 5.3 Tranche étage 10 — « Le Précipice »

**Thème** : antichambre de Voldemort. Plus dense, prélude au boss final.

| Bloc | Proposition |
|------|---------------------------------------|
| Boss canon | **Antonin Dolohov** — Mangemort lieutenant, sorts coupants signature |
| Boss original | **Héraut des Ténèbres** — annonce la résurrection, lance des malédictions de zone |
| PNJ donneur | **Sirius Black** (esprit/fantôme) — guide vers le combat final |
| PNJ secondaire | Forgeron ténébreux (vente Essences × prix élevé !) |
| Quêtes | (a) Kill Dolohov → drop baguette brisée ; (b) Kill Héraut → matériau légendaire ; (c) Don de matériaux (don 5 Essences → palier honorifique) |
| Items boutique | Pectoral des Aurors, Larme du Phénix Mineure, Grimoire Avancé, **3 Essences/5 Pages à prix prohibitif (T5 mitigation)** |
| Monstres d'appoint | Mangemort Vétéran, Spectre Renforcé |

### 5.4 Bilan ajouts par tranche

| Tranche | Boss | PNJ | Quêtes | Items boutique | Monstres normaux |
|---------|-----:|----:|-------:|---------------:|-----------------:|
| Étage 8 | 2 | 2 | 3 | 5 | 2 |
| Étage 9 | 2 | 2 | 3 | 4 | 2 |
| Étage 10 | 2 | 2 | 3 | 4 (+ matériaux) | 2 |
| **Total** | **6** | **6** | **9** | **13** (+ matériaux) | **6** |

Soit **18 nouvelles entités monstres** (6 boss + 6 appoint + 6 vendeurs/passifs), **6 nouveaux PNJ**, **9 quêtes**, **13 items boutique**. Tout data-driven, pas de nouveau code.

---

## 6. Découpage en PRs

| PR | Contenu | Effort estimé | Critère de mise en service |
|----|---------|---------------|----------------------------|
| **#1** | Ce doc d'audit (Phase 1) | 0 (déjà fait) | Lisible et chiffré |
| **#2** | Stabilisation Forge/Biblio (T6, T7) : marquage explicite items non-forgables, filtrage sorts utilitaires en Biblio | 1 session | Aucune entrée grisée sans raison documentée ; smoke test passe |
| **#3** | Tranche étage 8 — Greyback + Veilleur + Kingsley + 3 quêtes + 5 items + 2 monstres + art Nano Banana | 2 sessions | Quêtes jouables end-to-end ; combats équilibrés selon `sim-difficulty.js` |
| **#4** | Tranche étage 9 — Aragog + Maître Détraqueurs + Bill + … | 2 sessions | Idem |
| **#5** | Tranche étage 10 — Dolohov + Héraut + Sirius + matériaux vendus + … | 2 sessions | Idem + winrate solo étage 10 entre 35-50 % (vérifie pas de régression) |

PRs #3-#5 indépendantes, peuvent être faites dans n'importe quel ordre. PR #2 doit précéder #3 si on veut que les nouveaux items des boss soient correctement forgés.

---

## 7. Critères de succès globaux

- ✅ Tableau §2.1 sans cases « 0 » aux étages 8-10 (colonnes PNJ déterministes / quêtes / items).
- ✅ Pool d'élites uniques étages 8-10 passe de 3 → 9 (T4).
- ✅ Source de matériaux Forge/Biblio diversifiée (drop boss + vente vétérinaire endgame) (T5).
- ✅ Forge n'affiche plus d'entrée grisée non documentée ; Biblio n'affiche plus de sort utilitaire avec faux upgrade (T6, T7).
- ✅ `node tests/smoke.js` passe à chaque PR.
- ✅ Winrate solo étages 8-10 n'empire pas (cible : reste dans la fourchette actuelle 38-65 %, idéalement +5-10 pts grâce aux nouveaux équipements achetables).

## 8. Hors-scope explicite

- New Game+ / prestige system
- Multiplayer V2 Realtime
- Refonte de la difficulté solo endgame
- Nouveaux étages au-delà du floor cap actuel
- Nouveaux sorts hors-quête (sauf si un boss drop un grimoire en récompense)
- Refonte du système de Maisons / paliers
- Nouvelles mécaniques de combat (status, capacités…)

---

## 9. Prochaine étape

Validation de ce doc → lancement PR #2 (Stabilisation Forge/Biblio) **ou** PR #3 (Tranche étage 8 directement, en parallèle de PR #2).

Si PR #3 démarre avant #2, prévoir que les nouveaux items boss soient conçus dès le départ avec un `bonus*` primaire pour éviter le grisage Forge.
