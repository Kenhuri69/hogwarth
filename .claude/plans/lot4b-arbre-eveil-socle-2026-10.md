# Lot 4 (b) — Arbre « Éveil du Sorcier » : socle, tronc commun, branches de Maison

Revue `revue-design-progression-2026-07.md` §6.1/§6.3/§6.4, étapes 4.3 + 4.4
(+ une UI minimale de 4.6 pour pouvoir dépenser les points). Les branches de
classe (4.5, avec actifs de combat), l'onglet « Passifs actifs », l'achat de
points en Marques (4.7) et la passe sim (4.8) suivront.

## Conception (écarts ⚠️)

- **Module** `js/awaken-tree.js` (données + logique + UI), chargé après
  `library.js`. Défensif : `recalculateStats` l'appelle via `typeof`.
- **État** : `c.awakenNodes` (tableau d'ids) sur chaque héros, donc sérialisé
  avec le personnage. Aucun état global neuf.
- **Points d'Éveil** : `awakenPointsEarned(level) = floor(level / 2)` (PUR) —
  rétroactif sans migration puisque dérivé du niveau (partagé `player.level`).
  `c.awakenBought` réservé au 4.7 (lu, jamais écrit ici).
  Disponibles = gagnés + achetés − coût des nœuds pris.
- ⚠️ **Portée** : tout est **par héros**, branche de Maison comprise (le design
  la voulait partagée). Raison : un seul pool de points par héros, pas de
  double comptabilité ; la Maison est de toute façon commune (`chosenHouse`).
- **Structure** :
  - Tronc commun : 8 nœuds à 1 point, sans prérequis.
  - Branche de Maison (`chosenHouse`) : 10 nœuds en 4 rangs — R1 3×1 pt
    (aucun prérequis), R2 3×1 pt (2 pts déjà investis dans la branche),
    R3 3×2 pts (4 pts), capital 1×3 pts (8 pts). Branche complète = 15 pts.
  - Tronc + Maison = 23 pts ; ~12 pts à la victoire (niv. ~24) → choix réels.
- **Effets** : clés additives reprises du pipeline sets/équipement
  (`bonusAtk`… `bonusCritChance`, `bonusHpMax`, `bonusFortune`,
  `bonusCelerite`, `bonusCounterChance`…), sommées par `awakenBonuses(c)`
  (PUR) et injectées dans `recalculateStats`. Quatre clés spéciales, une par
  axe de Maison, branchées sur un point existant chacune :
  - 🦁 `lowHpDmg` : +X % de dégâts sous 50 % PV (à côté de `_houseVigorMult`) ;
  - 🐍 `spellLifesteal` : vol de vie de sort (`_applySerpentLifesteal`) ;
  - 🦅 `spellCostReduc` : −X % de coût de sort (`_spellSpCost`) ;
  - 🦡 `stepRegen` : +X PV par pas hors combat (`_step`, à côté du Souffle).
  ⚠️ Écartés en v1 (pas de point d'accroche unique ou hors axe combat) :
  anti-`fear`, or +5 %, révélation resist/weak, joker d'énigme, palier de
  Garde 4, partage de potion, besace +1, « Second souffle », rider
  d'Apothéose du nœud capital. Le capital est un gros nœud de l'axe.
- **Équité** (garde-fou 13 §13.1.2) : `AWAKEN_WEIGHTS` donne un poids par
  clé ; les 4 branches de Maison pèsent exactement 30 (R1/R2 = 2 par nœud,
  R3 = 4, capital = 6), le tronc 2 par nœud. Vérifié par units.
- **UI** : modale dédiée `#skill-tree-modal` (comme `#codex-modal`), onglets
  par héros en Duo, compteur de points, nœuds pris / disponibles / verrouillés.
  Choix permanent → `confirmModal`. Bouton « 🌟 Éveil » dans la fiche.
  ModalA11y : id ajouté au registre.
- **Sim** : reportée à 4.8 comme prévu par l'ordonnancement (budget plein
  ≤ ~+12 % de win-rate) ; les effets v1 sont des bonus additifs modestes.

## Étapes

1. [x] Plan (ce fichier).
2. [x] Données `AWAKEN_TREE` + `AWAKEN_WEIGHTS` + helpers purs.
3. [x] `recalculateStats` + 4 points d'accroche spéciaux.
4. [x] `awakenTakeNode` + modale + bouton fiche + ModalA11y + CSS.
5. [x] Tests : units §32 (budget, équité, prérequis, bonus) ; smoke
   `scenarioSkillTree` (dépense, effet stats, persistance save).
6. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-10-01 — Plan créé (PR #759 en CI).
- 2026-10-01 — PR #759 fusionnée ; travail reporté sur master. Implémenté tel
  que conçu. ⚠️ Écart de test : `critChance` est indéfini avant le premier
  `recalculateStats` d'une partie neuve (préexistant) — le scénario le
  rappelle avant de mesurer. Tests : units §32 (1538 ✅), smoke
  `scenarioSkillTree` (dépense, accroches des 4 Maisons, save, UI ✅), suite
  complète 297 ✅, pwa-smoke ✅. Captures desktop + mobile de la modale vérifiées.
  Loader 425 ; 100 modules ; cache 9 JS bumpés + `awaken-tree.js?v=1` +
  `awaken-tree.css?v=1`, `CACHE_VERSION` 286.
  Suite : 4.5 (branches de classe + actifs), onglet Passifs, 4.7, 4.8.
