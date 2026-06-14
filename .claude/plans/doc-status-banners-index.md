# Plan — Bandeaux « Statut réel » + index doc↔module (Phase 1)

> Roadmap §1.4 💡1 (bandeau statut réel par chapitre) + 💡2 (index doc↔module)
> et table Phase 1 « Bandeaux Statut réel + index doc↔module ». **Doc-only.**
> Date : 2026-06-14.

## Audit (AVANT écriture)

- Convention existante (docs/README.md §Conventions) : ligne `**Statut :**`
  (🟥/🟧/🟩) en tête de chaque chapitre.
- **Déjà fait** : 11, 12, 14 portent déjà un blockquote `✅ **Statut réel
  (code, …)**` (réconciliés Phase 1). → modèle à généraliser.
- **À faire** : ajouter le bandeau « 📊 Statut réel (code) » aux 11 chapitres
  restants (01-10, 13) + créer l'index doc↔module dans docs/README.md.

Mapping chapitre → modules (grounded CLAUDE.md + roadmap §1.2) :
- 01 transversal (récit jouable) · 02 floor-themes/floor-ambiance/data
- 03 monsters/quests*/endgame/break-cycle · 04 floor-themes/dungeon/movement-floors/floor-events
- 05 data(CHARACTERS)/main/hero-barks · 06 npcs/npcs-helpers/npc-dialog
- 07 state(HOUSE_BONUSES)/main/house-donation · 08 quests-templates/quests/quests-riddles/potions
- 09 monsters/ui-bestiary/dungeon-scaling · 10 floor-themes/floor-ambiance/room-flavor/renderer*
- 13 dungeon-scaling/data/battle*/tools/sim-difficulty

## Étapes

1. [x] Ajouter le bandeau `> 📊 **Statut réel (code)** : … — modules : …`
   après la ligne `**Statut :**` des chapitres 01-10 et 13 (11 fichiers).
   → verify : chaque chapitre a un bandeau ; renvoi vers l'index README.
2. [x] docs/README.md : nouvelle section « Index doc ↔ module ↔ statut réel »
   (table 14 lignes : chapitre · statut réel · modules js/).
   → verify : table présente, liens corrects.
3. [x] `node tools/check_doc_modules.js` reste vert (exit 0).
4. [ ] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only (`docs/**/*.md`) → pas de cache bump, smoke non requis (§7/§8).
- Surgical : insertion additive d'un bandeau, on ne réécrit pas les chapitres.
- 11/12/14 déjà conformes → on n'y touche pas (sauf cohérence index README).
