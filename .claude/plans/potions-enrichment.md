# Plan — Revue & enrichissement du système de Potions / Brassage

> Plan vivant (cf. `.claude/guidelines.md` §5). Ouvert le 2026-05-30.
> Étend le design d'origine archivé :
> [`.claude/plans/_archive/farming-potion-system.md`](./_archive/farming-potion-system.md).
> Fait suite à C.5 (« Brassage maison », PR #302) et à la demande utilisateur
> de faire **monter le bonus de brassage avec la maîtrise**.
> Fichiers cœur : `js/potions.js`, `js/data.js` (`POTION_RECIPES`, herbes,
> potions), `js/inventory.js` (`_applyConsumableEffect`), `js/inventory-core.js`
> (`tryAddItem`), `js/quests-templates.js` (déblocage Slughorn).

---

## 1. État actuel (audit 2026-05-30)

### 1.1 Données

**Herbes** (`data.js`, `type:"herb"`, routées vers `player.herbs`) :
| Palier | Herbes | Prix |
|--------|--------|------|
| 1 | Armoise, Ortie séchée | 6 |
| 2 | Asphodèle, Branchiflore | 12 |
| 3 | Aconit, Dictame | 20 |
+ `mandragore` (matériau de quête) utilisé comme ingrédient.

**Recettes** (`POTION_RECIPES`, 6) — **toutes soin/mana** :
| Recette | Produit | Effet | Diff. | Déblocage |
|---------|---------|-------|-------|-----------|
| brew_potion_s | potion_s | +15 PV | 8 | Quête Slughorn 1 |
| brew_potion_m | potion_m | +12 PM | 8 | Quête Slughorn 1 |
| brew_potion_l | potion_l | +40 PV | 12 | Quête Slughorn 2 |
| brew_potion_l_sp | potion_l_sp | +30 PM | 12 | Quête Slughorn 2 |
| brew_potion_force | potion_force | « +8 ATK 3 t » (⚠️ bug) | 14 | Expérimentation |
| brew_potion_xl | potion_xl | 100 % PV | 18 | Expérimentation |

**Mécanique de jet** (`potions.js`) : `margin = meilleurINT_groupe + d20(1..20) − difficulty`.
`margin < 0` → échec (0 potion) ; `0 ≤ margin < 12` → réussite (1) ; `margin ≥ 12`
→ **critique (2 potions)**. Herbes **toujours consommées**.

**Bonus C.5 actuel** : une potion brassée porte `brewed:true` → `+25 %` **fixe**
sur les effets chiffrés (`heal`/`restore_sp`/`both`), appliqué dans
`_applyConsumableEffect`.

### 1.2 Constats — bugs & incohérences

1. **`potion_force` cassée** : `effect:"heal", power:8` alors que la description
   annonce « +8 ATK pendant 3 tours ». Il n'existe **aucun** effet de buff de
   stat temporaire dans `_applyConsumableEffect` → la potion soigne juste 8 PV.
   Nom + lore promettent un buff inexistant.
2. **`potion_xl_sp` orpheline** : l'item « Élixir d'Esprit Suprême »
   (`restore_sp_full`, 100 % PM) existe mais **aucune recette** ne le produit
   (asymétrie avec `potion_xl`).
3. **3 potions utilitaires sans recette** : `elixir_antidote` (`cure`),
   `elixir_regen` (`regen_buff`), `potion_bouclier` (`shield_buff`) existent en
   items **et** sont gérées par `_applyConsumableEffect`, mais **rien ne les
   brasse**. Gisement d'enrichissement à coût quasi nul.
4. **Brassage critique = quantité seulement** : un crit donne 2 potions
   identiques, sans différence de **qualité** — peu gratifiant pour un grand jet.
5. **Catalogue mono-thématique** : 100 % soin/mana. Le moteur supporte déjà
   `cure`/`regen_buff`/`shield_buff` (jamais brassés) et pourrait porter des
   buffs de combat (jamais implémentés).

### 1.3 Ce que le moteur sait DÉJÀ faire (à exploiter)

`_applyConsumableEffect` gère : `heal`, `restore_sp`, `heal_full`,
`restore_sp_full`, `both`, `cure`, `regen_buff`, `shield_buff`, `perma_*`,
`stat_boost`, `auto_revive`. Le système de **statuts de combat** (`applyStatus`,
`regen`, `shield`/`shieldTurns`) est réutilisable pour des buffs temporaires.

---

## 2. Objectifs d'enrichissement

1. **Corriger** les incohérences (potion_force, recettes manquantes).
2. **Récompenser la maîtrise** : le bonus de brassage monte avec la **qualité
   du jet** (réussite vs critique) et/ou l'**INT** du brasseur — l'idée validée
   par l'utilisateur.
3. **Élargir le catalogue** vers l'utilitaire et le buff de combat, en
   réutilisant au maximum l'existant.
4. **Lisibilité** : rendre la progression des recettes et la découverte plus
   gratifiantes.

Le tout **incrémental et livrable par lot**, chaque lot vert au smoke avant le
suivant.

---

## 3. Lots d'enrichissement

### LOT P0 — Correctifs & cohérence (quick wins) · ~0,5 j · risque faible

- **P0.1** Ajouter les **recettes des 3 potions utilitaires existantes** :
  `brew_elixir_antidote` (cure), `brew_elixir_regen` (regen_buff),
  `brew_potion_bouclier` (shield_buff). Items + effets déjà en place → **uniquement
  des entrées `POTION_RECIPES`** + un ingrédient cohérent (ex. dictame pour
  l'antidote). Découvrables par expérimentation ou via une 3ᵉ quête Slughorn.
- **P0.2** Ajouter `brew_potion_xl_sp` (symétrie avec `potion_xl`).
- **P0.3** Résoudre `potion_force` (⚠️ **décision** §6) : soit corriger la desc
  en « +8 PV » (trivial), soit — préférable — l'inclure dans LOT P2 comme vraie
  potion de buff ATK temporaire.
- *Vérif* : smoke — chaque nouvelle recette brassée produit l'item attendu ;
  l'antidote brassé purge un statut DoT ; le bouclier brassé pose `shieldTurns`.

### LOT P1 — Brassage à maîtrise (idée validée) · ~1 j · risque faible

Remplacer le `+25 %` fixe par une **potency variable bakée dans la potion** au
moment du brassage.

- **Design** : au lieu de `props:{ brewed:true }`, stocker
  `props:{ brewed:true, brewPotency:<float> }` calculé par `attemptBrew()` :
  - **réussite normale** → potency de base (ex. `+20 %`) ;
  - **brassage critique** → potency haute (ex. `+40 %`) — le crit devient
    qualitatif, pas seulement ×2 quantité ;
  - **bonus de maîtrise** optionnel indexé sur l'INT du brasseur
    (ex. `+1 %` par point d'INT au-dessus d'un seuil, plafonné).
- `_applyConsumableEffect` lit `item.brewPotency` (fallback : `brewed` legacy →
  potency de base actuelle `0.25`). **Compat totale** : potions d'anciens saves
  sans `brewPotency` = `+25 %`.
- UI : le tooltip et le résultat de brassage affichent la potency réelle de la
  fiole (« ✨ Concentrée +40 % » pour une critique).
- *Vérif* : smoke — un brassage critique forcé produit `brewPotency` haute ; le
  soin appliqué reflète la potency ; legacy `brewed:true` → `0.25`.

> Barème exact (base/crit/coeff INT/plafond) à figer en §6 avant impl.

### LOT P2 — Potions de buff de combat (catalogue + moteur) · ~2 j · risque moyen

Introduire une **famille d'effet « buff temporaire »** (la pièce manquante).

- **Moteur** : nouvel effet `temp_buff` dans `_applyConsumableEffect` posant un
  statut de buff sur la cible pour `turns` tours (ATK/DEF/AGI/MAG selon
  `buffStat`), via une extension du système de statuts (`battle.js`). Décrémenté
  comme les autres statuts ; affiché dans la timeline/HUD de combat.
- **Items + recettes** : « Potion de Force » (ATK, **répare P0.3**), « Potion de
  Défense » (DEF), « Élixir de Célérité » (AGI/esquive), etc.
- **Décision** §6 : ampleur du buff, durée, cumul avec Garde/Protego.
- *Vérif* : smoke — boire une potion de Force pose le statut, ATK augmenté N
  tours puis restauré ; pas de stacking abusif.

### LOT P3 — Codex des recettes & découverte · ~1 j · risque faible

- Onglet/section « Recettes » dans la modale chaudron : **découvertes** (lisibles)
  vs **à découvrir** (silhouette + indice de palier/herbe, sans tout révéler).
- Feedback de découverte enrichi (déjà amorcé : `_brewResult.discover`).
- *Vérif* : smoke — le codex liste N découvertes et M masquées ; une découverte
  bascule de masquée à révélée.

### LOT P4 — Économie, ancrage & idées longues (backlog) · effort variable

- Équilibrage des **sources d'herbes** (cueillette `searchRoom` / drops / boutique)
  par palier d'étage.
- Ancrage narratif : herbe **rare endgame**, lien Maison/Slughorn, jardin
  d'herbes (récolte passive).
- **Potions offensives jetables** en combat (flacon de feu/poison lancé) —
  **gros scope** (touche la boucle de combat), à flag et à cadrer séparément.
- *Hors première vague.*

---

## 4. Ordonnancement proposé

```
P0 (correctifs) ─→ P1 (maîtrise, idée validée) ─→ P2 (buffs de combat)
                                                    ↘ P3 (codex)  ↘ P4 (backlog)
```
**Première vague** = **P0 + P1** (faible risque, répare + livre l'idée
demandée). **Deuxième vague** = P2 (plus de moteur). P3/P4 = backlog.

| Lot | Effort | Risque | Dépend de |
|-----|--------|--------|-----------|
| P0 correctifs | ~0,5 j | faible | — |
| P1 maîtrise | ~1 j | faible | C.5 (livré) |
| P2 buffs combat | ~2 j | moyen | P0.3 |
| P3 codex | ~1 j | faible | — |
| P4 backlog | variable | moyen/élevé | — |

---

## 5. Contraintes transverses

- **Compat saves** : tout nouveau champ (`brewPotency`, statut de buff) voyage
  avec l'item/le combattant ; jamais de migration destructive — fallback
  systématique pour les anciens saves.
- **Tests** : chaque lot ajoute/étend `scenarioBrewing` (ou un scénario dédié) ;
  suite complète + `pwa-smoke` verts avant merge.
- **PWA** : bump des fichiers touchés (`potions.js`, `data.js`, `inventory.js`,
  `inventory-core.js`, `style.css` le cas échéant) + `CACHE_VERSION`.
- **Équilibrage** : la potency brassée ne doit pas trivialiser le combat —
  garder le brassage *gratifiant* sans rendre l'achat inutile (les potions de
  boutique restent une option d'appoint sans setup).

---

## 6. Décisions à confirmer avant implémentation

1. **`potion_force`** : (a) corriger la desc en « +8 PV » (trivial, P0) **ou**
   (b) en faire une vraie potion de buff ATK (P2, recommandé). → *défaut
   proposé : (b)*.
2. **Barème P1 (maîtrise)** : réussite normale `+20 %` / critique `+40 %` ;
   bonus INT `+1 %`/pt au-delà de INT 15, plafond `+50 %` ? → *à valider*.
3. **P2 buffs** : quelles stats (ATK/DEF/AGI/MAG ?), quelle ampleur (+X), quelle
   durée (3 tours ?), cumul avec Garde/Protego autorisé ou non ?
4. **Déblocage** des nouvelles recettes utilitaires : 3ᵉ quête Slughorn **ou**
   découverte par expérimentation **ou** mixte ?
5. **Périmètre première vague** : confirme-t-on **P0 + P1** comme premier PR,
   P2 ensuite ?

---

## 7. Hors-scope (cette revue)

- Refonte de la besace/UI d'inventaire au-delà du chaudron.
- Potions offensives jetables (déplacé en P4 backlog, scope combat).
- Lien avec les Mondes Parallèles / économie outremonde (système séparé).
- Génération d'icônes painterly dédiées pour les nouvelles potions (réutiliser
  les emojis/icônes existants en V1 ; pipeline `icon_factory.py` en option
  ultérieure).

---

## 8. Journal

| Date | Note |
|------|------|
| 2026-05-30 | Plan rédigé après audit. Constats : potion_force buggée, potion_xl_sp & 3 potions utilitaires sans recette, crit purement quantitatif. Lots P0→P4 cadrés ; première vague P0+P1 (dont l'idée « brassage à maîtrise » validée). Décisions §6 en attente. |
