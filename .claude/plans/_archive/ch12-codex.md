# Plan — Finalisation du Chapitre 12 (Glossaire & Codex)

**Branche :** `claude/hogwarth-chapter-12-codex-lduabc`
**Cible :** `docs/histoire/12-glossaire-et-codex.md`
**Nature :** tâche **documentaire** (markdown narratif + plan d'implémentation).
→ guidelines §7 (smoke test) et §8 (cache PWA) **non applicables** : aucun fichier
servi au navigateur n'est touché (docs/ + .claude/ uniquement). Mentionné
explicitement plutôt qu'éludé.

## Objectif

Transformer le Chapitre 12, aujourd'hui simple **référentiel** (glossaire,
artefacts, chronologie, index), en spécification du **Codex** : le **journal
vivant et déverrouillable** du joueur, compagnon de la descente, qui évolue de
« carnet d'élève » à « archive des Ruines Anciennes ».

Le chapitre doit rester cohérent avec les chapitres finalisés 04 (actes/étages),
05 (personnages), 07 (Maisons), 08 (quêtes signature + fil rouge Éclats), 09
(bestiaire : familles F1–F5, gradient de corruption, codex bestiaire 2 paliers
déjà codé), 10 (lieux : fiches sensorielles, échos temporels, « Codex de lieu »
déjà évoqué en §10.8/§10.9).

## Faits techniques vérifiés (état du jeu)

- ✅ Codex bestiaire **déjà partiellement implémenté** (`ui-bestiary.js`) :
  `FAMILY_LORE`, `_codexTier` (palier 0/1/2), `CODEX_DEEP_KILLS=2`,
  `_renderCodexDeep`. Gating dérivé de `seenMonsters` (Set sérialisé) +
  `monsterKills` (objet sérialisé). **Aucun global codex sérialisé neuf.**
- ✅ Items fil rouge : `eclat_voute` (×3), `eclat_lumiere`, `eclat_vitalite`
  (`data.js`).
- ✅ Voix des Fondateurs : stèle `r_clef_voute` (`riddles.js`).
- ✅ Quêtes liées : `eclats_clef_voute`, chaîne `dumbledore_*`, quêtes signature
  (`quests-templates.js` + `state.js`).
- ❌ Pas de global `unlockedCodexEntries`, pas de menu Codex unifié, pas de
  registre de données `codex` (entrées non-créature).

## Étapes

1. [x] Lire 04/08/09/10 + l'existant 12 → caler ton, conventions, ancres. → vérif : conventions `✅/💡/❓`, fiches sensorielles, format ÉTAPE 1/ÉTAPE 2 compris.
2. [x] Vérifier renvois entrants (11, README) et état code codex. → vérif : aucune ancre interne à préserver hors lien fichier.
3. [x] Rédiger Chapitre 12 finalisé (ÉTAPE 1 + ÉTAPE 2 in-doc), préserver le contenu de référence existant. → vérif : 7 sections de Codex, 12 entrées exemples avec évolution normale→révélée/corrompue, règles d'ajout, ≥3 tables de synthèse.
4. [x] Rédiger le plan d'implémentation détaillé `.claude/plans/ch12-codex-impl.md` (miroir ch09). → vérif : structure données JSON, flags, déverrouillage, UI, variantes, priorisation, assets.
5. [x] Mettre à jour la description du ch.12 dans `docs/README.md`. → vérif : ligne reflète le Codex vivant.
6. [x] Relecture cohérence (liens inter-chapitres valides, pas de contradiction canon). → vérif : grep liens, cohérence Clé de Voûte / Éclats / Ruines.
7. [x] Commit + push sur la branche dédiée.

## Décisions prises

- On **conserve** le contenu de référence existant (glossaire lore/systèmes,
  artefacts, chronologie, index perso) : il est utile et lié depuis le ch.11. Il
  devient le **socle documentaire** dont le Codex in-game est la projection
  jouable. Réorganisé en sous-sections sous la bannière Codex.
- Le Codex **ne gate rien** (cohérent §8.0/§4.7) : pur enrichissement narratif +
  rejouabilité (collection). Garde-fou repris du fil rouge.
- Réutiliser au maximum l'existant (bestiaire `ui-bestiary.js`, items Éclats,
  stèles) plutôt qu'inventer un moteur neuf — principe zéro-dépendance.
- Un **seul** nouveau global sérialisé proposé (`unlockedCodexEntries`, Set
  d'ids) pour les entrées **non-créature** ; les entrées créature restent
  dérivées de `seenMonsters`/`monsterKills` (pas de double source de vérité).

## Écarts constatés

- (aucun à ce stade)
