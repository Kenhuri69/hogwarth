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

### A. Articulation 16 paliers (Bronze/Argent/Or × 5 phases + Légende)

Décision finale (cf. itération utilisateur du 15 mai 2026) : on n'arrête
pas à 6 paliers. La grille passe à **16 paliers actifs**, chacun avec
un bonus tangible, conçue pour scaler jusqu'aux étages 25+.

Schéma générique par phase :
- **Bronze** → +1 LCK
- **Argent** → +1 stat principale (ATK Gry / MAG Slyth&Raven / DEF Pouf)
- **Or** → récompense narrative (item via head-of-house ou quête)

| # | Nom              | Seuil  | Stat bonus           | Récompense narrative                                      |
|---|------------------|--------|----------------------|----------------------------------------------------------|
| 1 | Apprenti Bronze  | 50     | +1 LCK               | —                                                        |
| 2 | Apprenti Argent  | 150    | +1 stat              | —                                                        |
| 3 | Apprenti Or      | 300    | —                    | **Set piece #1** = `brassard_lion`/`anneau_serpent`/`plume_aigle`/`ceinture_blaireau` (head-of-house, existant) |
| 4 | Confirmé Bronze  | 500    | +1 LCK               | —                                                        |
| 5 | Confirmé Argent  | 800    | +1 stat              | —                                                        |
| 6 | Confirmé Or      | 1200   | +1 stat +1 LCK       | jalon Or (pas d'artefact, le set part du tier 3)         |
| 7 | Expert Bronze    | 1700   | +1 LCK               | —                                                        |
| 8 | Expert Argent    | 2500   | +1 stat              | —                                                        |
| 9 | Expert Or        | 3500   | —                    | **Set piece #2** = `sword_gryff`/`locket_slytherin`/`diademe_serdaigle`/`coupe_poufsouffle` (head-of-house, existant) |
| 10| Maître Bronze    | 4500   | +1 LCK               | —                                                        |
| 11| Maître Argent    | 6000   | +1 stat              | —                                                        |
| 12| Maître Or        | 8000   | +1 stat              | **Quête de Maison débloquée** (Étape 3)                  |
| 13| Virtuose Bronze  | 10000  | +1 LCK               | —                                                        |
| 14| Virtuose Argent  | 13000  | +1 stat              | —                                                        |
| 15| Virtuose Or      | 16000  | —                    | **Set piece #3** = `lame_godric`/`bague_salazar`/`codex_rowena`/`bouclier_helga` (récompense de la quête de Maison, recyclé) |
| 16| **Légende**      | 25000  | +2 stat + 1 LCK      | **Maîtrise Légendaire** (gated `victoryAchieved`)        |

Total bonus stats à Légende = +7 stat principale + +5 LCK répartis sur
14 paliers à bonus. Les Or de Confirmé/Expert/Virtuose n'apportent que
l'item (no-op stat) car l'item lui-même portera ses propres bonus.

Notes :
- **Les 3 pièces du set sont des items existants** (correction
  utilisateur du 15 mai 2026) : `brassard_lion`+ frères au tier 3,
  `sword_gryff`+ frères au tier 9, `lame_godric`+ frères au tier 15.
  Étape 2 se simplifie : pas de création d'artefacts, juste annoter
  les 12 items existants avec `setKey`/`setPiece`.
- L'endgame gate (`victoryAchieved`) s'applique désormais au tier 16.
- Confirmé Or (tier 6) ne porte pas d'artefact : on lui donne +1 stat
  +1 LCK pour qu'il se sente comme un jalon Or quand même.

Vision long-terme : on pourra ajouter une 7ᵉ phase ("Mythe", 40000 pts ?)
pour les étages 40+, ou ajouter des sous-paliers Diamant/Platine entre
Or et le palier suivant si on veut plus de granularité.

### B. Modèle des Sets (4 pièces : 1 existant + 3 nouveaux)

Décision finale : chaque Maison a un set de **4 pièces** dont **1 seul
existant** (le brassard distribué historiquement) et **3 nouveaux** à
créer en Étape 2.

Champs ajoutés sur les items du set (dans `js/data.js`) :

```js
setKey: "gryff_set"     // identifie l'appartenance au set
setPiece: 1 | 2 | 3 | 4 // numéro de pièce dans le set
```

Composition cible (Étape 2 livrera les NEW items) :

| Set         | Pièce 1 (Apprenti Or, existant) | Pièce 2 (Confirmé Or, NEW) | Pièce 3 (Maître Or, NEW)     | Pièce 4 (Virtuose Or via quête, NEW) |
|-------------|----------------------------------|----------------------------|------------------------------|----------------------------------------|
| Gryffondor  | `brassard_lion` (hands)          | `heaume_vaillant` (head)   | `cape_godric` (cloak)        | `coeur_lion` (amulet)                  |
| Serpentard  | `anneau_serpent` (ring)          | `pendentif_mamba` (amulet) | `cape_sibylline` (cloak)     | `couronne_basilic` (head)              |
| Serdaigle   | `plume_aigle` (trinket)          | `manteau_encre` (cloak)    | `oeil_aigle` (amulet)        | `anneau_savoir` (ring)                 |
| Poufsouffle | `ceinture_blaireau` (belt)       | `cape_loyaute` (cloak)     | `coiffe_blaireau` (head)     | `medaillon_helga` (amulet)             |

Items existants conservés en récompense **NON-set** (pas de `setKey`) :
- `sword_gryff`/`locket_slytherin`/`diademe_serdaigle`/`coupe_poufsouffle`
  → toujours livrés à Expert Or (tier 9), via head-of-house, comme avant.
- `lame_godric`/`bague_salazar`/`codex_rowena`/`bouclier_helga`
  → restitués à Légende (tier 16, gated victoire) via head-of-house
  (anciennement distribués directement, désormais cohérents avec le
  reste du flow).

Bonus de set : 2 pièces équipées → mineur, 3 pièces → moyen, 4 pièces
→ majeur. Détaillé dans `HOUSE_SETS` (`js/state.js`).

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

### Étape 2 — Création des 12 NEW artefacts ✅

**Livré.** Fichiers touchés :
- `js/data.js` : annotation des 4 brassards existants
  (`brassard_lion`/`anneau_serpent`/`plume_aigle`/`ceinture_blaireau`)
  avec `setKey` + `setPiece: 1`. Création des 12 NEW items (3 par
  Maison) avec slots distincts pour permettre l'équipement simultané
  des 4 pièces du set.
- `js/state.js — HOUSE_BONUSES` : items câblés à Confirmé Or (tier 6,
  pièce #2 via head-of-house) et Maître Or (tier 12, pièce #3 +
  `unlockSetQuest`). Pièce #4 (Virtuose Or, tier 15) sera distribuée
  par la quête de Maison à l'Étape 3.
- `js/state.js — HOUSE_SETS.pieceIds` : remplis avec les 4 IDs par set.
- `js/item-icons.js` : 12 entrées `ITEM_ICON_REGISTRY` ajoutées
  (alias vers PNG existants — sprites dédiés à générer plus tard via
  `tools/gen_icons.py` si direction artistique souhaitée).

Composition finale :

| Set        | #1 (Apprenti Or, hands/ring/trinket/belt) | #2 (Confirmé Or) | #3 (Maître Or)  | #4 (Virtuose Or via quête) |
|------------|-------------------------------------------|------------------|-----------------|----------------------------|
| Gryffondor | brassard_lion (hands)                     | heaume_vaillant (head) | cape_godric (cloak) | coeur_lion (amulet)  |
| Serpentard | anneau_serpent (ring)                     | pendentif_mamba (amulet) | cape_sibylline (cloak) | couronne_basilic (head) |
| Serdaigle  | plume_aigle (trinket)                     | manteau_encre (cloak) | oeil_aigle (amulet) | anneau_savoir (ring) |
| Poufsouffle| ceinture_blaireau (belt)                  | cape_loyaute (cloak) | coiffe_blaireau (head) | medaillon_helga (amulet) |

Stat totale par set 4/4 (avant bonus de set) : ~10-11 points en stat
principale + 4-5 LCK/INT/END secondaires + 1 régen. Calibration epic
pour #2/#3, legendary pour #4.

Vérif : `node tests/smoke.js` vert (toutes ITEM_ICON_REGISTRY mappés,
HOUSE_SETS.pieceIds renvoient des items existants).

⚠️ PNG dédiés à générer ultérieurement (alias actuels = PNG existants
réutilisés). Optionnel si on veut des sprites custom.

**Commit** : `feat(houses): add 12 set artifacts (3 NEW × 4 houses) wired to tiers 6/12`

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
