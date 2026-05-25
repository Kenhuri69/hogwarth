# PR #2 — Stabilisation Forge & Bibliothèque (T6, T7)

> Sous-plan de [`content-audit-stabilization.md`](./content-audit-stabilization.md). Vise à corriger les entrées grisées ou inutiles dans la Forge et la Bibliothèque avant d'ajouter de nouveaux items/sorts (PRs #3-#5).

## Constat audit data

**Forge** — 3 items équipables sans `bonusAtk/Def/Mag/Lck` primaire :
| Item | Bonus présents | Verdict |
|------|----------------|---------|
| `broom` (Balai Nimbus 2000) | aucun (effet narratif : fuite garantie) | **non-forgeable** par design |
| `oeil_basilic` | `bonusCritChance:10`, `bonusDodgeChance:5` | **forgeable** sur crit chance |
| `cor_pegasse` | `bonusHpMax:8` | **forgeable** sur HpMax |

**Biblio** — 6 sorts sans `power` (utilitaires) qui affichent un faux upgrade `power 0 → 2` :
`Accio`, `Portus`, `Revelio`, `Patronus Maxima`, `Legilimens`, `Récolte Magique`.

## Changements

### `js/forge.js`

1. **Étendre `_primaryBonus()`** pour considérer aussi `bonusCritChance`, `bonusDodgeChance`, `bonusCritDamage`, `bonusSpellCritChance`, `bonusSpellCritDamage`, `bonusHpMax`, `bonusSpMax`. Garde la priorité aux 4 bonus primaires `Atk/Def/Mag/Lck` (compatibilité descendante) ; ne tombe sur les secondaires que si aucun primaire n'est positif.
2. **Label différencié** dans `openForge()` :
   - item maxed → « Niveau MAX » (inchangé)
   - item sans bonus *du tout* (broom) → « Effet spécial — non forgeable »
   - item upgradable (cas normal + nouveaux cas via §1) → preview `stat N → N+1`

### `js/library.js`

1. **Détecter les sorts utilitaires** : `power == null || power === 0`.
2. **Afficher avec label « Effet utilitaire — non amplifiable »**, bouton désactivé.
   - Choix pédagogique vs filtrage : laisser le joueur voir l'intégralité de son grimoire mais comprendre pourquoi certains ne s'amplifient pas.

## Tests

- `node tests/smoke.js` doit passer (les scénarios existants ne testent pas explicitement Forge/Biblio, on vérifie surtout l'absence de régression).
- Vérification manuelle (couverte par lecture du code) : ouvrir la Forge avec un perso équipé de `oeil_basilic` ou `cor_pegasse` → bouton Améliorer actif, preview `crit chance 10 → 11` / `HpMax 8 → 9`.
- Ouvrir la Bibliothèque avec un perso connaissant `Accio` → entrée présente, label « non amplifiable », bouton grisé.

## Critères de succès

- ✅ Aucune entrée grisée dans la Forge sans label explicite.
- ✅ Aucun sort utilitaire avec preview de power numérique dans la Biblio.
- ✅ Smoke test vert.
- ✅ Pas de changement de stat effectif pour le joueur (l'extension de `_primaryBonus` ne modifie que ce qui s'affiche/se forge, pas le `recalculateStats`).

## Hors-scope

- Ajouter une nouvelle source de matériaux (T5) — sera traité dans PRs #3-#5.
- Refondre la formule d'upgrade (power +2 etc.).
- Nouveaux items / sorts.
