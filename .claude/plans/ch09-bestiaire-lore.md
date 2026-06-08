# Plan — Chapitre 09 : Bestiaire & lore des créatures (finalisation)

**Branche :** `claude/hogwarth-ch09-bestiary-lore-0dtnbl`
**Statut :** ✅ terminé — chapitre réécrit, refs croisées vérifiées, push fait

## Objectif
Réécrire/enrichir `docs/histoire/09-bestiaire-et-lore.md` pour en faire une
version **complète et finalisée** : origine narrative des créatures, lien à la
**Clé de Voûte des Quatre**, aux **Éclats**, aux **voix des Fondateurs**, au
**froid surnaturel** et à la **peur comme sceau**, plus un **plan
d'implémentation** concret (Étape 2).

## Contraintes de cohérence (déjà vérifiées)
- ✅ Déclencheur = Clé de Voûte fêlée en cours d'Histoire de la Magie ([03 §3.1]).
- ✅ Éclats existants en jeu : `eclat_voute` (fil rouge ×3), `eclat_lumiere`
  (drop mort-vivant, ✅ Détraqueur 35 %), `eclat_vitalite` (craft),
  `eclat_refuge/loot/...` (jetons de salle). → ne pas inventer de doublon.
- ✅ Voix des Fondateurs = stèles d'énigme (`riddles.js`, `r_clef_voute`).
- ✅ Ruines Anciennes pré-Poudlard ([02 §2.2]), Boucle Ténébreuse 11+ → Ténébreux.
- ✅ Stats/capacités réelles relues dans `js/monsters.js` (Détraqueur, Basilic,
  Greyback, Veilleur, Héraut…) pour fiches combat exactes.
- Préserver les renvois croisés [01][02][03][06][08][10] et la convention 💡/✅/❓.

## Étapes
1. Rédiger Étape 1 (contenu narratif) → vérif : structure demandée couverte
   (intro, catégorisation type + étage/acte, ≥12-15 fiches dont 4-5 boss, lore
   global, règles d'ajout, table de synthèse). → fait
2. Rédiger Étape 2 (plan d'implémentation) → vérif : fichiers de données, flags
   (`creatureCorruptionLevel`, `eclatDropRate`…), génération procédurale, codex,
   boss/événements, quêtes/Éclats/dialogues, priorisation, assets. → fait
3. Doc-only : pas de bump cache PWA (§8 N/A), smoke test non requis (§7 — aucun
   JS/CSS touché). Mentionner explicitement.
4. Commit + push sur la branche désignée.

## Notes
- Changement purement documentaire (markdown sous `docs/`). Aucun fichier servi
  au navigateur n'est modifié → pas de `?v` ni `CACHE_VERSION` à bumper.
