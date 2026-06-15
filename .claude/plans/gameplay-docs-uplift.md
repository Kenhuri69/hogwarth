# Plan — Mise à niveau docs/gameplay G1-G9 (Phase 4)

> Roadmap Phase 4 « Mettre à niveau docs/gameplay G1-G9 (systèmes récents) ».
> **Doc-only.** Date : 2026-06-14.

## Audit (AVANT écriture) — chapitres déjà substantiels

Les 9 chapitres font 279-501 lignes, « valeurs sourcées du code », avec des
**sections dédiées** aux systèmes récents (vérifié par grep + headers) :
- Forge / Bibliothèque : G5, G6, G7 (§404) · Potions/Concoction : G3, G5, G6, G7
- Portus/Téléport : G5, G6, G9 · PvP/duel : G3, G5, G6, G8, G9
- Événements d'étage : G7 (§316) · Codex : G4, G5 · Atelier : G5, G6, G9 (§199)
- Mondes Parallèles/Cheminette : G3, G5, G6, G9 (§72, §176) · Ironman/HoF : G9

→ La claim roadmap « ne couvrent pas les systèmes récents » est **stale**.
C'est une **réconciliation** + passe de cohérence, pas une réécriture.

## Changement

1. [x] Bandeau « 📊 Statut réel (code) » en tête des 9 chapitres (modules `js/`
   + renvoi `CLAUDE.md`), comme les chapitres histoire (#545). Statut
   🟧 ébauche → 🟩 (couvre les systèmes récents ; relecture design en continu).
2. [x] docs/gameplay/README.md : table statut 🟧→🟩 + retirer la note stale.
3. [x] docs/README.md (ligne statut global Gameplay) : refléter la couverture.
4. [x] Roadmap Phase 4 : ligne « Mettre à niveau docs/gameplay » → ✅ Fait.
5. [x] `node tools/check_doc_modules.js` exit 0.
6. [ ] Commit → push → PR → CI verte → squash-merge.

## Mapping chapitre → modules

- G1 movement*/battle/dungeon/shop · G2 battle*/battle-spells/battle-ui
- G3 inventory-core/battle-rewards/data/profile · G4 state(HOUSE_BONUSES)/main/house-donation
- G5 inventory*/item-icons/potions/data/forge/library · G6 data(SPELLS)/battle-spells/inventory-spells/teleport/library
- G7 dungeon*/movement*/floor-themes/floor-events/floor-ambiance/renderer*
- G8 dungeon-scaling/data/battle/tools/sim-difficulty
- G9 ironman/hall-of-fame/multiplayer*/visit-*/atelier-voyageur/profile/save*

## Garde-fous

- Doc-only → pas de cache bump, smoke non requis (§7/§8).
- Additif (bandeau) + flip de statut justifié par l'audit ; pas de réécriture
  du corps des chapitres ; on n'invente pas de valeurs.
- Les sections « ❓ À détailler / 💡 pistes » restantes → statut 🟩 « couvre les
  systèmes récents » (PAS « stable/figé »), honnête sur la relecture en cours.
