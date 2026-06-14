# Plan — Réconciliation doc↔code Ch.12 (Codex) — ⚠️1 (constat n°1)

> Branche : `claude/hogwarth-narrative-review-1kga03` (repartie de master après merge #509).
> Tâche Phase 1 🔴 Haute : « Réécrire Ch.12 : plan d'impl. → état livré ».

## Constat (vérifié contre le code)

`docs/histoire/12-glossaire-et-codex.md` contient une grosse section
**« ÉTAPE 2 — Plan d'implémentation »** (l. 698-863) qui décrit le Codex comme
**🔧 à créer** — alors que **tout est livré**. Vérification symbole par symbole :

| Brique planifiée (doc) | Réalité code | État |
|---|---|---|
| `CODEX_ENTRIES`, `getCodexEntry`, `codexEntryState`, `unlockedCodexFor`, `codexVariantNote` | `js/codex.js` (+ MANIFEST loader) | ✅ livré |
| `checkCodexUnlocks`, `unlockedCodexEntries` | `js/ui-codex.js` + hooks (battle-rewards, quests, movement…) + `state.js`/`save.js` | ✅ livré |
| `openCodex`, `#codex-modal`, bouton 📖 | `js/ui-codex.js`, `index.html` | ✅ livré |
| `playCodexWrite` / `playCodexReveal` | `js/audio-sfx.js` | ✅ livré |
| `floorReached` | `state.js` (sérialisé) | ✅ livré |
| `temporalEchoSeen` (échos zone D) | **livré renommé `seenEchoes`** (state.js:523, 18 conditions `echo` dans codex.js) | ✅ livré |

→ **Zéro brique restante.** La section entière est obsolète (le bandeau l.9 le
disait déjà mais le corps n'avait pas été réconcilié).

## Étapes & vérifications

1. [x] Remplacer « ÉTAPE 2 — Plan d'implémentation » (l. 698-863) par
   **« ÉTAPE 2 — État livré (réconcilié) »** : bandeau ✅, table brique→module,
   note du renommage `temporalEchoSeen`→`seenEchoes`, renvoi à l'archive
   `.claude/plans/_archive/ch12-codex-impl.md` pour le détail historique.
   → verify : plus aucun `🔧 à créer` dans la section.
2. [x] « Points à trancher » : marquer #2 (conteneur `#codex-modal`) ✅ résolu ;
   garder les vraies questions de design ouvertes (#1/#3/#4/#5).
   → verify : relecture.
3. [x] Mettre à jour la roadmap (⚠️1) : Ch.12 réconcilié.
   → verify : ligne ⚠️1 amendée.
4. [x] Doc-only (markdown) → pas de cache bump, pas de smoke (guidelines §7).
   commit-guard (plan ✅, PR-state) → commit → push → PR → merge.

## Notes
- Hors-scope : Ch.14 ÉTAPE 2 (a déjà reçu beaucoup de réconciliation P4/P5/P6 ;
  à traiter séparément si drift résiduel). Ce PR cible **Ch.12** uniquement.
- Le détail opérationnel original reste archivé (référencé dans le nouveau texte).
