# Étude d'équilibrage — Coûts & bonus des artefacts (plan vivant)

> Branche : `claude/artifact-balance-analysis-3611fs`
> Statut : ⏳ Étude **documentaire** (aucune modif de `js/data.js`).
> Livrable : ce rapport `.md` (modèle + table comparée + incohérences + recommandations).

## Objectif

Dériver un modèle coût↔puissance explicite, l'appliquer à **tous** les items
équipables de `data.js`, repérer les incohérences, proposer une table corrigée
argumentée — sans rien implémenter.

## Étapes & vérifications

1. [x] Extraire le catalogue réel (`tools/analyze_artifact_balance.js`, parse
   `data.js`+`shop.js`) → vérif : N items équipables listés avec bonus/prix/dispo.
2. [x] Formaliser le `powerBudget` (poids par bonus) + formule §1.6 → vérif :
   reproduit les prix « sains » communs à ±15 %.
3. [x] Calculer prix_théorique + écart % par item, trier par écart → vérif :
   anomalies ressortent en tête.
4. [x] Cohérence transverse (acte / slot / Maison / dominance / sinks /
   palier uncommon) → vérif : chaque axe a un constat chiffré.
5. [x] Recommandations chiffrées (marquées « à confirmer par sim ») → vérif :
   chaque reco a une raison + ne baisse pas l'éco endgame.

## Notes & écarts

- **Livrable** : `docs/artifact-balance-study.md` (rapport complet).
- **Outil reproductible** : `tools/analyze_artifact_balance.js` (parse data.js +
  shop.js, calcule powerBudget/prix théorique/écart). Node pur, lecture seule,
  non servi au navigateur → **pas** de cache-bump requis (guidelines §8).
- Aucun test smoke requis (étude documentaire, zéro code runtime touché).
- **Découvertes clés** : (1) la formule §1.6 littérale surévalue les epic
  (double comptage rareté×budget) → formule corrigée proposée ; (2) **bug ID
  dupliqué `codex_rowena`** ; (3) palier uncommon quasi vide ; (4) Premium
  Gryffondor 2-3× plus faible que les 3 autres. Détails + recos chiffrées dans
  le rapport.
- **Aucune modif de `js/data.js`** (étude documentaire, conforme à la consigne).
