# Audit Forge des Ténèbres & Bibliothèque Interdite

**Date** : 2026-05-25
**Branche** : `claude/plans-b-c-endgame-sinks`
**Statut** : ⏳ Diagnostic + propositions chiffrées — **aucune modification de code à ce stade**.
**Origine** : Plan C de l'audit or (`game-economy-gold-audit.md`).
Pivot après découverte des systèmes existants (forge.js + library.js).

> ⚠️ Plan vivant (§5 guidelines). Implémentation conditionnée à une
> validation explicite des fixes par l'utilisateur. Tant que pas validé :
> aucune modification de `js/forge.js`, `js/library.js`, `js/dungeon.js`,
> `js/battle.js`.

---

## 0. Méthodologie

- Sources de vérité utilisées : `js/forge.js`, `js/library.js`,
  `js/dungeon.js`, `js/battle.js` (drops matériaux), `js/data.js`
  (items `essence_tenebres` / `page_grimoire`), `js/inventory.js`
  (`recalculateStats` ligne 88-117), `js/npcs.js` (vendeurs de
  matériaux : `apothicaire_tenebreux`, `forgeron_tenebreux`).
- Pas de mesure runtime — analyse statique.
- Cible : joueur en boucle ténébreuse 1-3, post-victoire, tier
  Apothéose ou proche.

---

## 1. Constantes des deux systèmes

### 1.1 Forge des Ténèbres (`forge.js`)

```js
const FORGE_MAX_LEVEL = 5;
const FORGE_COSTS = {
  1: { gold:   80, essence: 1 },
  2: { gold:  160, essence: 2 },
  3: { gold:  320, essence: 3 },
  4: { gold:  640, essence: 5 },
  5: { gold: 1280, essence: 8 },
};
```

- Cellule `CELL.FORGE` aux **étages 11, 14, 17, 20** (post-victoire).
- Cumul pour maxer **1 item** : `2 480 G` + `19 Essences`.
- Effet : +N au bonus principal de l'item (le plus élevé parmi
  `bonusAtk/Def/Mag/Lck`). Si l'item n'a aucun primaire, le secondaire
  (crit / esquive / HpMax / SpMax) est ciblé. Items pure-`grantsSpell`
  / `regen` sont non-forgeable.

### 1.2 Bibliothèque Interdite (`library.js`)

```js
const LIBRARY_MAX_LEVEL = 3;
const LIBRARY_COSTS = {
  1: { gold: 120, pages: 1 },
  2: { gold: 240, pages: 2 },
  3: { gold: 480, pages: 3 },
};
```

- Cellule `CELL.LIBRARY` aux **étages 12, 15, 18** (post-victoire).
- Cumul pour maxer **1 sort** : `840 G` + `6 Pages`.
- Effet par niveau : `power +2`, `cost −1` (plancher 1), `chance +0.05`
  (cap 0.50). Sorts à `power=0` (utilitaires : Portus, Revelio,
  Legilimens…) **non amplifiables**.

### 1.3 Sources de matériaux

#### Drops de combat (`battle.js:840-852`)
- **Essence des Ténèbres** : `3 %` par combat **darkness uniquement**
  (étages 11+, monstres `variant === 'darkness'`).
- **Page de Grimoire** : `2 %` par combat darkness uniquement.

#### Vendeurs
- **Apothicaire Ténébreux** (étage 9, PNJ fixe) : essence 380 G,
  page 460 G.
- **Forgeron Ténébreux** (étage 10, PNJ fixe) : essence 520 G,
  page 620 G (prix premium).

---

## 2. Métriques calculées

### 2.1 Coût total pour maxer un personnage

Hypothèse : un perso porte **11 slots équipés** (en pratique 7-9 le
plus souvent — chaussures, ceinture, casque, robe, gants, cape,
amulette, 2 anneaux, baguette, trinket).

Cas réaliste **9 items équipés forgeables** au max (+5 chacun) :
- Or : `9 × 2 480 = 22 320 G`
- Essences : `9 × 19 = 171 Essences`

Pour le **groupe duo** (2 persos) : `44 640 G` + `342 Essences`.

### 2.2 Coût total pour maxer la Bibliothèque

Sorts amplifiables = sorts avec `power > 0`. Comptés dans `SPELLS` :
~30 sorts offensifs/soins (exclus : Portus, Revelio, Legilimens,
Accio, Expelliarmus si effet pur, Alohomora…).

Estimation : un perso **utilise activement ~8-12 sorts** dans sa
rotation. Maxer tous les sorts actifs :
- Or : `10 × 840 = 8 400 G` par perso.
- Pages : `10 × 6 = 60 Pages` par perso.

Pour le duo : `16 800 G` + `120 Pages`.

### 2.3 Bottleneck — matériaux vs or

À **3 % Essence** par combat darkness, obtenir 171 Essences (1 perso
maxé en équipement) demande **5 700 combats darkness** au minimum.
Sur boucle ténébreuse 1 (étages 11-20), à ~150-200 G/combat, c'est
~1 000 000 G de revenu cumulé pour 22 320 G dépensés en forge.
**Ratio : ~50× plus d'or que de matériau.**

À **2 % Pages** par combat, 60 Pages = `3 000 combats darkness`. Idem :
or surabondant vs matériau rare.

**Conclusion factuelle** : l'or n'est **pas** le goulet d'étranglement
de ces systèmes. C'est le **drop des matériaux**.

### 2.4 Coût d'achat des matériaux chez les vendeurs

Substituer les drops par l'achat 100 % :
- 1 Essence chez Forgeron = 520 G (premium) ou 380 G (Apothicaire).
- 1 Page chez Forgeron = 620 G ou 460 G (Apothicaire).

**171 Essences via Apothicaire** = `64 980 G`.
**60 Pages via Apothicaire** = `27 600 G`.

Total **maxer la forge groupe duo + bibliothèque duo + tous matériaux
achetés** : `≈ 22k forge + 17k bib + 130k essences + 55k pages =
~225k G`. Atteignable en boucle ténébreuse 2-3.

---

## 3. Anomalies factuelles identifiées

### 3.A Drops gated « darkness » uniquement

**Constat** : `battle.js:842,848` — les drops Essence et Page ne
tombent **que** sur monstres `variant === 'darkness'`. Une boucle
post-victoire mélange ~40 % de monstres darkness et ~60 % de monstres
normaux (cf. ENDGAME_PLAN.md). Donc le taux effectif moyen :
- Essence : `0.03 × 0.40 = 0.012` (1.2 % par combat tout-confondu).
- Page : `0.02 × 0.40 = 0.008` (0.8 %).

→ Encore plus rare en pratique que sur le papier. Reflet du sentiment
de farming long.

### 3.B Bibliothèque cappée à +3 vs Forge cappée à +5

**Asymétrie** : la Forge va jusqu'à +5 (cumul 1280 G + 8 ess. au
dernier saut), la Bibliothèque s'arrête à +3 (480 G + 3 pages). Le
joueur qui investit dans son équipement va beaucoup plus loin que
celui qui investit dans ses sorts.

Effet : la Bibliothèque devient « finie » trop vite. Un joueur qui
maxe ses 10 sorts utilise 60 Pages et 8400 G — atteint en quelques
boucles. La Forge reste un sink plus durable.

### 3.C Sorts utilitaires (`power === 0`) non amplifiables

**Constat** (`library.js:62-65`) : tout sort à `power: 0` (Portus,
Revelio, Legilimens, Accio sans power…) est exclu du système.

Logique : on amplifie quoi ? `cost −1` aurait du sens pour Portus
(coût 52 SP) — un joueur Serdaigle Apothéose (-20 % coût sorts)
combiné à Library +3 (`-3 SP`) abaisserait Portus à `52 × 0.8 − 3 =
38.6 SP` — pas dérisoire. Possible d'étendre.

### 3.D Cellules limitées dans les étages

**Constat** : `forge.js` cellules **11/14/17/20** ; `library.js`
**12/15/18**. Si le joueur ne passe pas par ces étages spécifiques,
pas d'accès. Mitigations existantes : Forgeron / Apothicaire vendent
les matériaux. Mais pas d'**accès direct à la forge / bibliothèque**
hors de ces cellules → flux interrompu si on saute un étage.

Question ouverte : faut-il une 2ᵉ cellule par tranche, ou un accès via
le head-of-house ? Probablement non — c'est intentionnel comme
« rituel d'arrêt » au bon étage. À noter.

### 3.E Stat secondaire upgradable mais 1 seule par item

**Constat** (`forge.js:41-58`) : `_primaryBonus` retourne **la plus
élevée parmi `atk/def/mag/lck`** ; si rien, retombe sur les bonus
dérivés (crit, esquive, HpMax, SpMax). Un item avec `bonusAtk:5 +
bonusMag:3` ne voit que son atk amplifié — la magie reste fixe.

Pour Hermione (qui équipe parfois 2 statlines : MAG primary +
secondaires AGI/LCK), c'est une restriction. Mais c'est aussi un
choix de design : la Forge renforce **l'identité** d'un item, pas
toutes ses lignes.

### 3.F Pas d'Apothicaire / Forgeron sur d'autres étages

**Constat** : 1 seul de chaque, étages 9 et 10. Quand le joueur est
en boucle ténébreuse 3 (étages 31+), il doit revenir à 9-10 pour
acheter des matériaux. Frottement inutile.

### 3.G Aucun rapport de progression UI

**Constat** : la modale `#forge-modal` montre l'item courant + bouton
upgrade, mais **pas de vue d'ensemble** « X items × niveau Y maxés ».
La Bibliothèque idem. Un joueur en boucle longue perd la mémoire de
où il en est.

---

## 4. Propositions chiffrées de rééquilibrage

Toutes les propositions sont **indépendantes** — on peut en retenir
une partie. Chacune affiche `avant → après` + impact estimé.

### 4.1 (Reco moyenne) Bibliothèque à +5 (cap aligné avec la Forge)

**Cible** : §3.B.

```diff
- const LIBRARY_MAX_LEVEL = 3;
+ const LIBRARY_MAX_LEVEL = 5;
  const LIBRARY_COSTS = {
    1: { gold: 120, pages: 1 },
    2: { gold: 240, pages: 2 },
    3: { gold: 480, pages: 3 },
+   4: { gold: 960, pages: 5 },
+   5: { gold: 1920, pages: 8 },
  };
```

Symétrise les deux systèmes (×2 par niveau, même mat. progression que
Forge). Cumul max par sort : `840 → 3 720 G` + `6 → 19 Pages`.

Effet attendu : un joueur peut investir significativement dans ses
sorts favoris, pas seulement étaler. Pages restent rares → choix
forcé entre sorts.

### 4.2 (Reco moyenne) Drops matériaux étendus aux monstres « normaux »

**Cible** : §3.A.

```diff
  // battle.js:842
- if (Math.random() < 0.03) {
+ if (Math.random() < (e.variant === 'darkness' ? 0.03 : 0.015)) {
    const item = ITEMS.find(i => i.id === 'essence_tenebres');
```

Effets : étages 11+ (zones darkness possibles), les monstres normaux
ont aussi une petite chance (0.5 % global après mix). Drop effectif
moyen passe de **1.2 % → 1.8 %** par combat.

Pages : `0.02 / 0.01` (1.6 %) sur même principe.

Rappel : ces matériaux ne **drop pas** avant la boucle ténébreuse —
le gate reste à étage 11+. La proposition assouplit juste à
l'intérieur de la zone autorisée.

### 4.3 (Reco faible) Sorts utilitaires : amplifier le coût uniquement

**Cible** : §3.C.

Plutôt que d'ignorer les sorts `power === 0`, leur permettre une
amplification du **coût seul** (`cost −1 × level`, cap 1) :

```diff
  if (spell && !(spell.power | 0)) {
-   addMsg(`${spellName} : effet utilitaire, non amplifiable.`, '');
-   return false;
+   // Sorts utilitaires : seul le coût bénéficie (pas le power, qui est 0).
+   // OK à upgrader — bénéfice limité mais réel pour Portus / Revelio.
  }
```

Avec niveau 3 : Portus 52 → 49 SP. Combo Serdaigle Apothéose × Library 3
sur Portus : `52 × 0.8 − 3 = 38.6 SP`. Acceptable.

### 4.4 (Reco optionnelle) Vendeurs additionnels matériaux dans la boucle

**Cible** : §3.F.

Ajouter un PNJ vendeur de matériaux à un étage post-boucle (e.g.
étage 13 ou 15) avec un inventaire essence/page tournant et un
buyback minimal — accessible quand le joueur fait sa 2ᵉ boucle.
Variante : permettre à `marchand_ombre` (sinks A+E, PR #249) de
proposer aussi essence/page si le joueur le croise.

**Plus simple** : étendre `marchand_ombre.wares` :
```diff
  wares: [
    { id: "elixir_perma_hp"   },
    { id: "elixir_perma_mp"   },
    { id: "pierre_ame"        },
-   { id: "philtre_endurance" }
+   { id: "philtre_endurance" },
+   { id: "essence_tenebres"  },
+   { id: "page_grimoire"     }
  ],
```

Le `priceMultiplier: 1.4` rend les matériaux du marchand 30-40 % plus
chers que l'Apothicaire (380 → 532 G l'Essence) — premium acceptable
pour un croisement aléatoire.

### 4.5 (Reco faible) Rapport de progression dans les modales Forge/Bib

**Cible** : §3.G.

Ajouter en tête de la modale `#forge-modal` un petit récap :

```
🔨 Forge — Tous les forges du groupe
   Harry  : 6/9 items maxés (+5), 3 partiels — total 287 G d'écart
   Hermione : 4/9 items maxés (+5), 5 partiels — total 482 G d'écart
```

UX : 4-5 lignes. Le joueur voit ce qui reste à faire. Sans coût de
runtime (calculé à l'open). Idem pour la Bibliothèque.

### 4.6 (Reco optionnelle) Forge / Bib accessibles via head-of-house

**Cible** : §3.D.

Au tier 17 (palier Mythe), le head-of-house gagne un bouton « Visiter
la Forge / Bibliothèque » qui ouvre la modale sans nécessiter d'être
sur la cellule. Justifié narrativement (le Chef de Maison a accès aux
salles secrètes).

**Risque** : retire la mécanique « rituel » des cellules dédiées.
À débattre. Recommandation : **NE PAS implémenter par défaut** —
laisser les cellules comme gating volontaire. Mentionner pour
arbitrage.

---

## 5. Synthèse — impact combiné des recos retenues

Recos prioritaires : **§4.1** (Library +5) + **§4.2** (drops étendus)
+ **§4.4** (marchand_ombre vend matériaux) + **§4.5** (UI récap).

| Métrique | Avant | Après |
|----------|-------|-------|
| Cumul Bibliothèque 1 sort | 840 G + 6 Pages | 3 720 G + 19 Pages |
| Drop Essence (combat normal post-victoire) | 1.2 % | 1.8 % |
| Drop Page (combat normal post-victoire) | 0.8 % | 1.6 % |
| Combats pour 1 perso forge max (Essences) | 14 250 | 9 500 |
| Combats pour 1 perso library max (Pages) | 7 500 | 3 750 |
| Sources alternatives matériaux endgame | Apothicaire, Forgeron (étages 9-10 seulement) | + marchand_ombre étage 11+ |

→ Diminution mesurable du **temps de farming** sans réduire la
satisfaction. La progression Bibliothèque devient comparable à la
Forge (×2). Marchand d'Ombre devient un point d'accès matériel quand
on est loin des étages 9-10.

---

## 6. Phasage proposé (si validé)

> ⛔ Aucune étape ci-dessous ne doit être exécutée sans validation
> explicite de l'utilisateur sur les fixes retenus.

### Étape 1 — Bibliothèque +5
- [ ] Bump `LIBRARY_MAX_LEVEL` à 5 dans `library.js`.
- [ ] Ajouter les coûts niveaux 4-5 à `LIBRARY_COSTS`.
- [ ] Vérifier la modale UI : badge `+5` rendu correctement.
- [ ] Smoke test (le test couvre `LIBRARY_COSTS[3]` actuellement).

### Étape 2 — Drops matériaux assouplis
- [ ] Modifier `battle.js:842,848` pour étendre aux variants normaux
      avec taux réduit (0.015 / 0.01).
- [ ] Garder le gate `floor >= 11` (boucle ténébreuse uniquement).

### Étape 3 — marchand_ombre vend matériaux
- [ ] Ajouter `essence_tenebres` + `page_grimoire` à `wares` dans
      `npcs.js`.
- [ ] Le `priceMultiplier: 1.4` s'applique automatiquement.

### Étape 4 (optionnelle) — Sorts utilitaires amplifiables
- [ ] Relaxer le filtre `library.js:62-65` (autoriser power=0 sur
      cost only).
- [ ] Vérifier `_spellForCaster` (battle-spells.js) : cost = max(1, cost − lvl).

### Étape 5 (optionnelle) — Rapports UI
- [ ] Préfixer `openForge()` et `openLibrary()` avec un récap
      progression dans la modale.

### Étape 6 — Commit + push + PR
- [ ] 1 commit par étape (révisable).
- [ ] Smoke test final.

---

## 7. Risques & vigilances

### 7.1 Power-creep Ironman (Library +5)

Library à +5 sur tous les sorts → +10 power sur chaque sort
offensif. Au final ~+20-30 % dégâts max sur les sorts. Combo avec
Forge +5 → un perso très optimisé devient 30-40 % plus puissant
qu'aujourd'hui. Mitigation : le coût en Pages double (60 → 120 pour
maxer 10 sorts), donc atteignable seulement en boucle 3+. Le mode
Ironman cape déjà les kills (score plafonné), donc l'avantage stat
ne se traduit pas en runaway score.

### 7.2 Drops étendus = inflation matériau ?

Passer de 1.2 % à 1.8 % effectif n'est pas un game-changer. Le coût
en or des upgrades reste un plafond mou (200k G pour maxer tout).
Pas de risque d'avalanche.

### 7.3 Sauvegardes

- `upgradeLevel` est déjà sérialisé sur les items équipés (existe).
- `spellUpgrades` est déjà sérialisé sur les persos (existe).
- Niveaux 4-5 de Bibliothèque : le `c.spellUpgrades['Foo'] = 5` est
  déjà autorisé par le code (cap silencieux à 3 actuellement).
  Migration transparente.

### 7.4 Tests existants

- `tests/smoke.js` couvre déjà les écrans Forge et Bibliothèque
  (scenarii présents). Les changements de constantes doivent passer
  sans toucher les tests si les bornes ne sont pas hard-codées
  ailleurs — à vérifier (voir `LIBRARY_MAX_LEVEL` dans tests).

---

## 8. Hors-scope V1 (à plan séparé si validé plus tard)

- §4.6 : accès via head-of-house. À débattre — laissé optionnel.
- **Stat secondaire upgradable** (§3.E) — pas de mécanique simple
  proposée (multi-bonus à choisir au moment de l'upgrade ?). Plan
  dédié.
- **Achievements forge / library** — bonus cosmétiques type « 100
  items maxés » ; pas demandé.
- **Pages de Grimoire spécialisées par sort** (rendre Pages liées à
  un sort spécifique pour différencier) — alourdirait sans bénéfice
  clair.

---

## 9. Journal du plan

- **2026-05-25** : création du plan après découverte que Forge +
  Bibliothèque existent déjà (pivot du Plan C original — forge from
  scratch — vers un audit/extension des systèmes en place).
  Validation utilisateur attendue avant implémentation.
- **2026-05-25 (validation V1, branche `claude/gold-audit-quick-wins`)** :
  utilisateur valide le **set prioritaire §4.1 + §4.2 + §4.4 + §4.5**
  (synthèse §5). §4.3 + §4.6 reportés. Phasage en 6 étapes ci-dessous,
  critères de vérification par étape (§4 guidelines). Implémentation
  immédiate.

## 10. Plan d'implémentation (V1)

### Étape A — Bibliothèque +5 (§4.1)
- [ ] Bump `LIBRARY_MAX_LEVEL` 3 → 5 dans `library.js`.
- [ ] Ajouter `LIBRARY_COSTS[4] = {gold:960, pages:5}` et
      `LIBRARY_COSTS[5] = {gold:1920, pages:8}`.
- [ ] Vérification : `node tests/smoke.js` vert.

### Étape B — Drops matériaux étendus (§4.2)
- [ ] `battle.js` : sortir les 2 drops matériaux (essence_tenebres,
      page_grimoire) du bloc `if (e.variant === 'darkness')`.
- [ ] Gate explicite `currentFloor >= 11` pour conserver l'intention
      « boucle ténébreuse uniquement ».
- [ ] Seuils conditionnels : essence `0.03` (darkness) / `0.015`
      (normal), page `0.02` / `0.01`.
- [ ] Vérification : smoke vert.

### Étape C — marchand_ombre vend matériaux (§4.4)
- [ ] Ajouter `essence_tenebres` + `page_grimoire` à
      `npcs.js — marchand_ombre.wares`. `priceMultiplier: 1.4` reste
      automatique.
- [ ] Vérification : smoke vert.

### Étape D — Rapport UI Forge / Bibliothèque (§4.5)
- [ ] Helper pur `_forgeProgressSummary()` dans `forge.js` —
      retourne `[{ heroName, maxed, partial, total }, ...]`.
- [ ] Helper pur `_libraryProgressSummary()` dans `library.js` — idem.
- [ ] `openForge()` : préfixer la liste avec un bloc « 🔨 Forge —
      Progression du groupe » listant maxed / partiels par héros.
- [ ] `openLibrary()` : symétrique avec « 📚 Bibliothèque ».
- [ ] CSS : reprendre les styles `.forge-empty` existants pour
      l'encart récap (pas de nouveau fichier CSS).

### Étape E — Smoke test
- [ ] Ajouter cas `scenarioForgeLibraryAudit` : vérifie
      `LIBRARY_MAX_LEVEL === 5`, `LIBRARY_COSTS[5]` défini, drops
      matériaux possibles hors variant darkness mais avec floor 11+,
      marchand_ombre.wares contient essence/page, helpers de récap
      renvoient une structure exploitable.
- [ ] Vérification : `node tests/smoke.js` vert avec ce scénario.

### Étape F — Commit + push
- [ ] Plusieurs commits structurés (1 par étape), 1 push final
      `claude/gold-audit-quick-wins` (branche déjà créée pour le
      doc-update, on l'enrichit avec l'audit).

## 11. Livraison (2026-05-25)

Toutes les étapes A-F **livrées** sur `claude/gold-audit-quick-wins` :

- ✅ Étape A — `js/library.js` : `LIBRARY_MAX_LEVEL = 5`,
  `LIBRARY_COSTS[4] = {gold:960, pages:5}`, `[5] = {gold:1920, pages:8}`.
- ✅ Étape B — `js/battle.js` : drops matériaux sortis du bloc
  `if (e.variant === 'darkness')`, gate explicite `currentFloor >= 11`,
  seuils conditionnels (essence 0.03/0.015, page 0.02/0.01).
- ✅ Étape C — `js/npcs.js` : `marchand_ombre.wares` étendu avec
  `essence_tenebres` + `page_grimoire`. `priceMultiplier: 1.4` automatique.
- ✅ Étape D — `js/forge.js` + `js/library.js` : nouveaux helpers
  `_forgeProgressSummary()` + `_libraryProgressSummary()` (purs) +
  bloc récap injecté en tête des modales `#forge-modal` /
  `#library-modal`. CSS `.forge-progress-summary` ajouté à `css/style.css`.
- ✅ Étape E — `tests/smoke.js` : scénario `scenarioForgeLibraryAudit`
  (4 sous-tests). Smoke entièrement vert.
- ✅ Étape F — commit + push sur `claude/gold-audit-quick-wins`,
  cache-bust `forge.js?v=2` / `library.js?v=2` dans `index.html`.

**Plan archivable** — set prioritaire intégralement livré. Recos
restantes (§4.3 utilitaires amplifiables, §4.6 accès head-of-house)
explicitement non retenues.
