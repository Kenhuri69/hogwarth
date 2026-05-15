# Plan — Maisons 2.0 : Paliers Avancés & Artefacts de Set

> Branche : `claude/house-system-expansion-OYuhx`
> Statut : 🟢 Étape 1 livrée · 🟡 Étape 2 à faire

## Contexte & écart avec le brief initial

Le brief utilisateur indiquait « système actuel = palier 2 maximum » mais
l'audit du code (`js/state.js:74-128`) révèle **5 paliers déjà implémentés** :

| Palier actuel | Seuil   | Nom (Gry.)  | Récompense actuelle (Gry.)              |
|---------------|---------|-------------|-----------------------------------------|
| 1             | 100     | Aspirant    | +1 ATK                                  |
| 2             | 300     | Élève       | +1 ATK +1 LCK + `brassard_lion`         |
| 3             | 600     | Vaillant    | +2 ATK                                  |
| 4             | 1000    | Champion    | `sword_gryff` (remis par head-of-house) |
| 5 (endgame)   | 2000    | Légende     | +3 ATK + `lame_godric` (gated victoire) |

Le système distribue les items via **`pendingHouseRewards`** : le palier
est franchi → l'item est ajouté au Set ; le joueur doit **visiter le
Chef de Maison** (specialAction `claim_house_reward` dans `js/npcs.js`)
pour le récupérer. Tier 5 est l'exception (distribué directement,
cinématique endgame).

## Décisions & assumptions (à valider en marche)

### A. Articulation des 6 paliers (extension, pas réécriture)

On **conserve** les 5 paliers actuels + on **ajoute un 6e palier**. La
nomenclature évolue conformément à la demande utilisateur :

| # | Nouveau nom (FR) | Seuil (pts) | Bonus stat   | Récompense item                                  | Cinématique |
|---|------------------|-------------|--------------|--------------------------------------------------|-------------|
| 1 | Apprenti         | 100         | +1 stat principale | —                                          | inline |
| 2 | Confirmé         | 300         | +1 stat +1 LCK     | `brassard_lion`/`anneau_serpent`/`plume_aigle`/`ceinture_blaireau` (existant) | head-of-house |
| 3 | Expert           | 600         | +1 stat +1 LCK     | **Set artifact #1** (NOUVEAU) — direct           | head-of-house |
| 4 | Maître           | 1000        | +2 stat            | **Set artifact #2** (NOUVEAU, remplace `sword_gryff`/etc.) | head-of-house |
| 5 | Virtuose         | 2000        | +1 stat +1 LCK     | **Quête débloquée** → récompense = **Set artifact #3** | quête |
| 6 | Légende          | 3500        | +2 stat + titre    | Bonus passif "Maîtrise Légendaire" (cf. §C)      | inline, gated `victoryAchieved` |

Notes :
- Les items existants au palier 4 (`sword_gryff`, `locket_slytherin`,
  `diademe_serdaigle`, `coupe_poufsouffle`) **deviennent** les Set
  artifacts #2 — refonte cosmétique + ajout du champ `setKey` pour la
  détection (cf. §B). Pas de suppression de l'ID, donc les saves
  existantes restent compatibles.
- Les items palier 5 actuels (`lame_godric`/`bague_salazar`/
  `codex_rowena`/`bouclier_helga`) **deviennent** les Set artifacts #3.
  Leur acquisition passe de « directe à l'atteinte du palier endgame »
  à « via quête débloquée au palier 5 ». L'endgame gating
  (`victoryAchieved`) **glisse** sur le palier 6 (Légende).

### B. Modèle des Sets (3 pièces)

Champs ajoutés sur les items du set (dans `js/data.js`) :

```js
setKey: "gryff_set"   // identifie l'appartenance au set
setPiece: 1 | 2 | 3   // numéro de pièce dans le set
```

Chaque Maison a **un seul set de 3 pièces**, avec slots variés pour
qu'elles soient cumulables (ex : Gry = ring + body + wand).

Bonus de set (calculés à `recalculateStats()` après agrégation des
bonus pièce-par-pièce) :

- **2/3 pièces équipées sur le même personnage** → bonus mineur
  (ex : Gry = `+1 ATK +5% crit`)
- **3/3 pièces équipées** → bonus majeur (ex : Gry = `+3 ATK +10% crit
  + immunité désarmement`)

⚠️ Les bonus s'appliquent **par personnage** (le set doit être équipé
sur Harry XOR Hermione, pas réparti). Détection : itérer
`c.equipped` à `recalculateStats`, compter les pièces avec un
`setKey` identique.

### C. Palier 6 — « Maîtrise Légendaire »

Bonus passif appliqué à **tout le groupe** dès franchissement,
indépendant de l'équipement du set :
- Gryffondor : +1 ATK + chance de regagner 1 PM sur kill
- Serpentard : +1 MAG + 5% drain HP sur sort offensif
- Serdaigle : +1 MAG + cost SP réduit de 10%
- Poufsouffle : +1 DEF + régén 1 HP/tour hors combat

Titre exposé via `_updateHouseBadge()` (déjà gère « palier max »).

### D. Quête débloquée au palier 5

Une seule quête par Maison, ajoutée dans `activeQuests` (ou via
`availableQuests` selon le système de quêtes courant) lors du
franchissement du palier 5. PNJ donneur = Chef de Maison
(mcgonagall/rogue/flitwick/sprout). Type d'objectif :
- Phase 1 : tuer N monstres ciblés (ex : 3 Mangemorts pour Gry, 3
  Hippogriffes pour Pouf, etc.)
- Phase 2 : récupérer un item lore unique (drop garanti après le kill
  final).

Récompense = Set artifact #3 (`lame_godric` etc., renommés/refondus).

---

## Étapes

### Étape 1 — Préparation & extension des données (NO-OP runtime) ✅

**Livré.** Fichiers touchés :
- `js/state.js` — palier 6 (Légende, 3500 pts) ajouté aux 4 Maisons.
  Tier 5 renommé « Virtuose » et porte désormais `unlockSetQuest:
  true` (placeholder, câblage Étape 3). Tier 6 porte `legendaryPassive:
  true` (effet implémenté Étape 4). Constante `HOUSE_SETS` créée avec
  `setKey`/`pieceIds: []`/`setBonus2`/`setBonus3` placeholder pour les 4
  Maisons.
- `js/main.js` — `checkHouseLevelUp` : gate `victoryAchieved` déplacé
  du tier 5 vers le tier 6 (`tierNum >= 6`). Le tier 5 (Virtuose) est
  désormais accessible sans victoire.
- `tests/smoke.js` — `scenarioHouseTier5` réécrit (renommé en interne
  « Maison Tier 6 ») : T1 vérifie tier 5 atteint à 2000 pts pré-victoire,
  T2 vérifie que tier 6 reste verrouillé sans victoire malgré 3500 pts,
  T3 vérifie tier 6 franchi post-victoire.

Vérif : `node tests/smoke.js` vert (94 globals OK, tous scénarios passent).

⚠️ Régression à anticiper Étape 3 : les 4 items legendary actuels au
tier 5 (`lame_godric`/`bague_salazar`/`codex_rowena`/`bouclier_helga`)
ne sont **plus distribués** — ils deviennent orphelins. Ils seront
recyclés comme set piece #3 livré via la quête de Maison débloquée au
palier 5.

⚠️ `_baseAtk: 3` du Gryffondor tier 5 actuel a été redistribué : tier 5
porte désormais `+1 ATK +1 LCK`, tier 6 porte `+2 ATK`. Net = +3 ATK
total pour qui atteint le tier 6 (équivalent à l'ancien tier 5), mais
l'attribution est étalée sur 2 paliers. À documenter pour les saves
existants en endgame.

**Commit** : `feat(houses): extend tier structure to 6 paliers, add HOUSE_SETS placeholder`

### Étape 2 — Création des 12 artefacts + visuels

**Objectif** : créer les 12 items de set dans `js/data.js` et leurs
images PNG avec le blason de Maison intégré.

Fichiers touchés :
- `js/data.js` — 12 nouveaux items (ou refonte des 4 existants palier 4
  + 4 existants palier 5 + 4 nouveaux pour pièce #1). Chacun avec
  `setKey`, `setPiece`, slot dédié, rarity legendary, stats équilibrées.
- `img/artifacts/<maison>_<piece>.png` — 12 fichiers PNG, chacun avec
  variation visuelle subtile mais blason clairement intégré.
- `js/icons.js` ou `js/item-icons.js` — wiring optionnel si on veut
  des icônes inline plutôt que des PNG.

Critères :
- Chaque Maison a 3 pièces sur 3 slots distincts.
- Total stats par set ≈ équivalent set rare endgame (target : +6 stats
  primaires cumulées sur 3 pièces, pas plus).
- Les images intègrent visuellement le blason (subtilité OK, mais
  reconnaissable).

**Commit** : `feat(houses): add 12 set artifacts with house-emblem visuals`

### Étape 3 — Liaison paliers ↔ récompenses + quête palier 5

**Objectif** : câbler la livraison des artefacts.

Fichiers touchés :
- `js/state.js — HOUSE_BONUSES.*.tiers[2]` (palier 3) : ajouter
  `bonus.item = <set_piece_1_id>`.
- `HOUSE_BONUSES.*.tiers[3]` (palier 4) : changer `bonus.item` pour
  pointer vers le nouveau ID du set piece 2 (l'ancien ID
  `sword_gryff`/etc. devient l'ID du set piece 2 ou alias).
- `js/main.js — checkHouseLevelUp` : ajouter au passage du palier 5 un
  appel `unlockHouseQuest(chosenHouse)` (nouvelle fn dans `quests.js`).
- `js/quests.js` (ou `state.js` selon où sont les quêtes) : 4 nouvelles
  définitions de quête (`quest_set_gryff`, etc.) avec objectif + reward.
- `js/npc-dialog.js` ou `quests.js` : flow « quête active → kill cible
  → remise PNJ → reçoit Set artifact #3 ».

Critères :
- Atteindre 600 pts → badge clignote, visiter McGonagall → recevoir
  artefact #1 dans l'inventaire.
- Atteindre 2000 pts → log « nouvelle quête disponible » + ajout
  dans le journal.

**Commit** : `feat(houses): wire tier 3/4 to deliver set artifacts, unlock set quest at tier 5`

### Étape 4 — Bonus de set + effet passif palier 6

**Objectif** : implémenter la logique de bonus 2/3 pièces ET le bonus
passif palier 6.

Fichiers touchés :
- `js/inventory.js — recalculateStats` : après la boucle d'agrégation
  par pièce, ajouter une passe « set detection » : compter les pièces
  partageant un `setKey` (par perso), appliquer `setBonus2`/`setBonus3`
  depuis `HOUSE_SETS`.
- `js/battle.js` : si bonus passif palier 6 nécessite hook combat
  (ex : drain HP, regen PM on kill), insérer aux endroits déjà existants
  (`applyEquipmentRegen`, `executeAttack`, `endBattle`).

Critères :
- Équiper 2 pièces du set Gryffondor sur Harry → stats ATK affichées
  augmentent du bonus 2-set.
- Équiper 3 pièces → bonus 3-set actif (cumulé OU remplaçant le 2-set,
  à décider : par défaut, **remplaçant** pour éviter double-stack).
- Au palier 6, le bonus passif s'applique (vérifier via combat).

**Commit** : `feat(houses): activate 2/3-piece set bonuses and tier 6 legendary passive`

### Étape 5 — UI/UX écran Maisons + journal d'équipement

**Objectif** : améliorer la lisibilité.

Fichiers touchés :
- `js/ui.js` / `index.html` / `css/style.css` : nouvel encart « Set
  Maison » dans la modale Personnage (`openCharacter`) affichant 3
  cases (remplie/vide), bonus actuel, bonus suivant.
- `js/inventory.js — showEquipMenu` : tag visuel `[SET]` sur les pièces
  appartenant à un set.

Critères :
- L'écran Personnage montre 3 médaillons (vides ou remplis) côte à côte.
- Hover/tap → tooltip décrivant le bonus de set.

**Commit** : `feat(houses): UI pass — set artifact tracker on character sheet`

### Étape 6 — Équilibrage, tests, feedback

**Objectif** : passe finale.

- Ajuster les valeurs de bonus si elles déséquilibrent les combats
  (mesure : tour-1-kill rate sur étages 5-8).
- Ajouter feedback sonore (`AudioSystem.playLevelUp` ou son dédié)
  lors de la complétion du set.
- Vérifier que le save sérialise/restaure correctement les nouveaux
  états (palier 6, pendingHouseRewards des nouveaux IDs).
- Compléter `tests/smoke.js` avec un scénario « équiper 3 pièces du
  set Gryffondor → vérifier ATK final ».

**Commit** : `polish(houses): balance pass, set-complete feedback, smoke coverage`

---

## Risques & points de vigilance

1. **Saves existants** : les joueurs avec `housePoints >= 2000` ont
   actuellement le palier 5 « Légende endgame » (gated). Après l'Étape 1,
   ce palier sera renommé « Virtuose » mais leur `houseTier` reste à 5
   → ils ne « regagnent » pas le palier (idempotent). Au prochain
   franchissement (3500 pts), ils débloqueront le nouveau palier 6.
   ⚠️ Si le palier 5 actuel est franchi mais que l'artefact #3 n'a pas
   été remis (impossible aujourd'hui puisque distribué directement),
   il faudra une migration → **safe : aucun cas réel**.
2. **`pendingHouseRewards`** : les nouveaux IDs doivent être whitelistés
   dans la logique de `claim_house_reward` (déjà generic via
   `pendingHouseRewards.has`).
3. **`endBattle` gain de points** : pas de modification nécessaire,
   tout passe par `checkHouseLevelUp` qui itère sur `tiers`.
4. **Tests smoke** : `tests/smoke.js` ne couvre probablement pas le flow
   complet maisons → tier-up → claim. À vérifier en Étape 1.
