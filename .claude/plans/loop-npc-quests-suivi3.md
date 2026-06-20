# Boucle Ténébreuse — PNJ, suivi 3 (toutes les propositions)

Suite de #587 (PNJ combat/vendeurs) et #591 (Pomfresh/Ollivander/Manon×Lockhart).
Objectif : rallumer les **derniers PNJ muets** de la Boucle, **garder vivants**
les arcs one-shot, et **enrichir les récompenses** des chasses.

> Statut : **PLAN** (non implémenté). Code à faire après validation.
> Toutes les quêtes gatées `minFloor: 11` (Boucle uniquement), sauf mention.

---

## A. Récompenses matériaux sur les chasses (Kingsley / Bill / Sirius)

Aujourd'hui les chasses farming ne rendent que XP/or (la passe farming
`_rollFarmingTarget` écrase `reward` en `{xp, gold}`). On veut un drop de
matériau (Essence / Page) en endgame.

- **Moteur** : ajouter un champ `keepRewardItem` au template farming. Dans
  `_rollFarmingTarget` (quests.js), si `quest.keepRewardItem` et que le template
  porte `reward.item`, **conserver** cet item dans le `reward` recalculé
  (au lieu de le dropper).
- **Données** : les 3 chasses (`chasse_kingsley_boucle` / `_bill_` / `_sirius_`)
  reçoivent `keepRewardItem: true` + `reward.item` (essence_tenebres ou
  page_grimoire), `repeatableReward.item` idem.
- verify (smoke) : accepter une chasse en Boucle → la récompense contient
  l'item matériau (assert sur `activeQuests[].reward.item`).

## B. Scamander — chasse magizoologiste en Boucle

`chasse_magizoologiste` est capée `maxFloor: 8` → échoue en Boucle (étage 12).

- Ajouter un template **loop** `chasse_magizoologiste_boucle` (giver Scamander,
  `farming`, `rollOnAccept {kind:kill, minFloor:11, maxFloor:99, …}`,
  `repeatable everyLevels:1`, `keepRewardItem` + reward matériau). Câbler dans
  `scamander` + `scamander_random` (`questsGiven`).
- verify (smoke) : offerable étage 12, acceptable, cible spawn.

## C. Mimi Geignarde — apaiser les esprits

Mimi (fantôme, étage 2 → 12). Quête répétable : chasser les esprits qui
hantent ses canalisations (kill de monstres catégorie `fantôme`).

- Template `mimi_esprits` : objectif `kill` (cible fantôme, ex. `spectre_renforce`)
  ×2, `repeatable everyLevels:1`, `spawnOnAccept` pour garantir la cible.
- Récompense : or + **nouvel item `perle_mimi`** (amulette épique, regenSp + MAG)
  à la 1ʳᵉ remise, or ensuite. → **ASSET 1**.
- Câbler `questsGiven`/`questsTurnedIn` + `dialoguesByQuest` sur `mimi`.

## D. Sir Patrick — chevaucher la Chasse Sans Tête

Sir Patrick (fantôme, étage 6 → 16). Quête répétable : rejoindre la Chasse,
abattre des morts-vivants.

- Template `chasse_sans_tete_boucle` : objectif `kill` mort-vivant ×3
  (catégorie fantôme / `UNDEAD_IDS`), `repeatable everyLevels:1`,
  `spawnOnAccept`.
- Récompense : or + **nouvel item `cor_chasse`** (trinket épique, bonus crit /
  anti-peur) 1ʳᵉ fois, or ensuite. → **ASSET 2**.
- Câbler sur `sir_patrick` (actuellement easter-egg only).

## E. Guipure — confection de soie d'Acromantule

Guipure (couturière, étage 5 → 15). Quête de collecte : apporter de la soie
(réutilise `fil_acromantule` ou un drop), elle confectionne une cape.

- Template `confection_guipure` : objectif `item` (`fil_acromantule` ×3 ou herbe/
  drop) `repeatable everyLevels:2`.
- Récompense : **nouvel item `cape_soie_acromantule`** (cloak épique, AGI +
  esquive) 1ʳᵉ fois, or ensuite. → **ASSET 3**.
- Câbler sur `guipure`.

## F. Lockhart×Manon — garder l'arc vivant après la rédemption

Le one-shot `manon_confier → memoire_lockhart` (#591) retombe en `done`. On
ajoute une boucle légère répétable :

- **Lockhart** `chroniques_lockhart` : objectif `search` ×4 (récolter des
  anecdotes), `repeatable everyLevels:1`. Récompense or + occasionnellement
  **nouvel item `plume_lockhart`** (trinket, LCK / gain XP) 1ʳᵉ fois. → **ASSET 4**.
- **Manon** `manon_compagnie` : objectif `floor` (revenir la voir en Boucle) ou
  `kill` léger ; récompense or/XP (réutilise items existants, pas d'asset).
  *(One-shot OU répétable — au choix ; défaut répétable everyLevels:2.)*

---

## Nouveaux assets (4 icônes d'items)

Icônes painterly à générer (prompts dans
`.claude/plans/nano-banana-prompts-loop-reward-items.md`). Pipeline d'intégration
par item : générer PNG 512² transparent → `tools/dechecker_png.py` si fond damier
→ mipmaps 64/48/32/24/16 (`img/icons_new/<id>_<size>.png`) → entrée
`ITEM_ICON_NEW_REGISTRY` (item-icons.js) → bump cache.

| Item | Slot/rareté | Source |
|------|-------------|--------|
| `perle_mimi` | amulet / epic | Mimi |
| `cor_chasse` | trinket / epic | Sir Patrick |
| `cape_soie_acromantule` | cloak / epic | Guipure |
| `plume_lockhart` | trinket / rare | Lockhart |

> Alternative sans image-gen : recettes `tools/icon_factory.py` (skill
> `add-item-icon`). Les prompts couvrent la voie Nano Banana demandée.

---

## Étapes & vérification

1. [ ] Moteur : `keepRewardItem` dans `_rollFarmingTarget` (+ test).
2. [ ] data.js : 4 nouveaux items équipables + stats.
3. [ ] quests-templates.js : 7 quêtes (A×0 données / B / C / D / E / F×2).
4. [ ] npcs.js : câblage `questsGiven` + `dialoguesByQuest` (Scamander, Mimi,
       Sir Patrick, Guipure, Lockhart, Manon).
5. [ ] item-icons.js : `ITEM_ICON_NEW_REGISTRY` pour les 4 items (après assets).
6. [ ] Assets : générer les 4 icônes (prompts dédiés) + mipmaps.
7. [ ] Tests : `scenarioLoopNpcQuests3` (templates, gate, keepRewardItem, drops).
8. [ ] smoke + units + cache bump + PR.

> Tant que les PNG ne sont pas générés, les items s'affichent en **fallback
> emoji** (le test de couverture d'icônes accepte ITEM_ICON_REGISTRY/SVG : on
> ajoutera une entrée SVG ou un fallback PNG existant pour passer le CI avant
> l'art final, comme fait en #591 pour `recit_manon`).
