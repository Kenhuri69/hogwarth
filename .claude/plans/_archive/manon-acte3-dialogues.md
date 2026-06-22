# Plan — Finaliser les dialogues de Manon (Acte III) — reliquat 2.1

> Reliquat **2.1** du backlog (`reliquats-backlog.md`). Le cœur de l'arc Manon
> (Actes I-II-III, fusion, quêtes, rumeurs) est livré ; restaient des **textes
> marqués « provisoires »** dans 3 fichiers. Tâche **purement éditoriale**,
> aucune logique touchée.

## État constaté (audit code)
- `js/npcs.js:473-479` — bloc `manon_acte3` : `questActive` + `questReady`
  **trop courts** (1 ligne chacun) vs les payoffs multi-lignes des Actes I-II.
  Commentaire `// (Textes provisoires — relecture co-écrite avant merge.)`.
- `js/data.js:414` — `ACT3_PAGES` : lore **déjà abouti** ; seul le commentaire
  « provisoire » à retirer.
- `js/npcs-helpers.js:142,162` — `_MANON_ACT3_RUMORS` (3) + `_OTHER_NPC_ACT3_RUMORS`
  (4) : textes **aboutis** ; seuls les commentaires « provisoire » à retirer.

## Décisions éditoriales
- **Voix** : conserver le registre établi (littéraire, tirets cadratins,
  didascalies entre parenthèses, signature « — É. », motifs givre/lune/Poufsouffle).
- **Canon à respecter** : Manon = Poufsouffle (révélé `manon_pardon`), père =
  Lupin (étage 4), mère = Élara (givre, morte il y a 2 mois, 16 ans de mensonge).
  Acte III = les **3 feuillets clairs joyeux** ; thème = « la joie, pas la plaie ».
- **Enrichir uniquement `questReady`** (le climax : Manon réconciliée avec sa
  mère MORTE, miroir du père aux Actes I-II). Léger lissage de `questActive`.
  Ne PAS réécrire les pages/rumeurs (déjà bonnes — guidelines §3, chirurgical).

## Étapes → vérification
1. [x] Enrichir `manon_acte3.questReady` en payoff multi-lignes (npcs.js) +
   lisser `questActive` → vérif : poids narratif comparable aux Actes I-II.
2. [x] Retirer les 3 commentaires « (Textes provisoires…) » (npcs.js, data.js,
   npcs-helpers.js) → vérif : `grep -ri "provisoire" js/` ne renvoie plus rien
   pour Manon.
3. [x] `node tests/smoke.js` (filtre npc/manon) vert → non-régression.
4. [x] Bump cache PWA (npcs.js, data.js, npcs-helpers.js servis) via skill `cache-bump`.
5. [x] Marquer 2.1 clos dans `reliquats-backlog.md`.
