# Plan — Réconcilier CLAUDE.md avec le code livré (dernier volet de ⚠️1)

> Contexte : `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` constat n°1 (dérive
> doc↔code). Ch.12 (Codex) et Ch.14 (fins) déjà réconciliés (PR #511, #514).
> Reste : `CLAUDE.md`. Doc-only → pas de cache bump, smoke non requis ;
> garde-fou = `node tools/check_doc_modules.js`.

## Audit (avant écriture)

- `node tools/check_doc_modules.js` → **déjà vert** (85 modules alignés,
  même ordre). L'index des modules de CLAUDE.md a déjà été régénéré par un
  effort antérieur : tous les modules récents (codex.js, ui-codex.js,
  profile.js, forge.js, library.js, potions.js, endgame.js, break-cycle.js,
  floor-events.js, room-flavor.js, help-tour.js, teleport.js, pvp-duel.js,
  haptics.js, karaoke.js, MP…) sont présents et décrits.
- Aucune occurrence de « à construire / à créer / proposé / proposition /
  🔧 » dans CLAUDE.md. La section MP existe (## Mondes Parallèles).
- profile.js : entrée d'index exacte (getPlayerProfile, recordEndingToProfile,
  ngPlusAvailable, openWizardCodex). `endingType`/`seenEchoes` = globals
  sérialisés (state.js/save.js) — l'entrée state.js est un résumé non
  exhaustif (pas de réécriture nécessaire).

## Dérives RÉELLES repérées (corrections chirurgicales)

1. [x] **Compte de modules** : prose « (84 modules) » (ligne 20) → **85**
   (l'index liste bien 85, le check confirme 85).
2. [x] **Section MP** : titre « ### Modules (à compléter dans l'arborescence
   en tête de fichier) » est périmé — tous ces modules sont DÉJÀ listés dans
   « Structure des fichiers ». Reformuler en récapitulatif.
3. [x] **Audio — ambiance** : « `_ZONE_SAMPLES` conserve 5 entrées
   (`tension`/`abyss` en réserve V2) » est faux : `abyss` = ambiance tranche D
   (étages 14+, `floor-themes.js`), `tension` = couche de combat « danger
   critique » (`_combatSampleKey` → `_partyInCriticalDanger`). Plus en réserve.
4. [x] **Audio — combat** : la liste de priorité du sample de combat omet le
   tier de tête `tension` (danger critique). Ajouter avant `epic`.

## Roadmap

5. [x] `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` : ⚠️1/🔧1 → ✅ Résolu
   (Ch.12 + Ch.14 + CLAUDE.md), ajuster la tâche Phase 1 « Mettre à jour
   CLAUDE.md ».

## Vérification

- [x] `node tools/check_doc_modules.js` reste vert.
- Doc-only (CLAUDE.md / *.md non servis au navigateur) → pas de cache bump,
  smoke non requis (guidelines §7/§8).

## Branche

Développé sur `claude/reconcile-claude-md-docs-i4x0xp` (branche fraîche
désignée par le harness, alignée sur master). La branche
`claude/hogwarth-narrative-review-1kga03` évoquée dans la consigne a été
squash-mergée (#514) → guidelines §6 : ne pas la réutiliser.
