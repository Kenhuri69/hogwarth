# Plan — Réconciliation doc ↔ code (Roadmap Phase 1)

> Issu de `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` (Phase 1). Objectif :
> aligner la documentation (CLAUDE.md + docs narratives les plus dérivées)
> sur l'état réel du code. **Aucun changement de code runtime** → pas de
> bump cache PWA, pas de smoke test requis (guidelines §7/§8).

## Constat de départ
- `index.html` charge **84 modules** ; CLAUDE.md en documente ~33 (annonce « 33 modules »).
- **20 modules absents** de CLAUDE.md (vérifiés) : break-cycle, cinematics,
  codex, combat-fx, dungeon-fx, endgame, floor-ambiance, floor-events, forge,
  haptics, help-tour, html-escape, karaoke, library, potions, pvp-duel,
  room-flavor, teleport, textures, ui-codex.
- Ch. 12 (Codex) et Ch. 14 (fins) contiennent des « plans d'implémentation »
  périmés (Codex et Briser le Cycle sont **livrés**). Ch. 11 présente Briser
  le Cycle comme « proposition ».

## Étapes & vérifications

1. ✅ **Inventaire autoritatif** (20 modules + descriptions).
2. ✅ **CLAUDE.md — bloc arborescence** : 20 modules ajoutés (1 ligne chacun).
   - vérif ✅ : `comm -23 loaded inclaude` renvoie **vide** (tous documentés).
3. ✅ **CLAUDE.md — ligne « ordre de chargement »** : corrigée (33 → **84**,
   chaîne réelle issue d'`index.html`).
4. ✅ **Docs — bandeaux « Statut réel »** sur 11, 12, 14 + tableau de statut
   global de `docs/README.md` corrigé + lien vers la revue.
5. ✅ **Commit + push** sur `claude/hogwarth-narrative-review-1kga03`.

## Hors-scope Phase 1 (→ Phase 2/3, certains nécessitant un arbitrage)
- Création des PNJ de signature (Chevalier Fantôme, Écho de Salazar).
- Code `slythPactChoice 'defiance'`, barks scénarisés héros (touchent du JS →
  cache-bump + smoke). À traiter dans un lot code dédié.
- Mise à niveau complète de `docs/gameplay/` G1-G9 (Phase 4).
