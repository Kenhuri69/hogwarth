# Plan — Enrichissement Codex : couches `revealed` du lore majeur

> Suite de l'audit de complétude du Codex (Phase 2 de la roadmap).
> Branche : `claude/codex-reveal-layers-followup`.

## Constat (audit, branche précédente mergée #496)

Le Codex (`js/codex.js`, 36 entrées) est **structurellement sain** : 0 coquille
vide, 0 condition morte, 0 texte inatteignable, 0 lien pendouillant. Le critère
de sortie Phase 2 « pas de coquille vide » est déjà atteint.

Sur les 12 entrées mono-couche (`veiled` seul), 6 sont des termes courts
légitimement mono-couche (§12.3) ; **6 sont du lore majeur** qui mérite la
récompense narrative « question → réponse » d'une couche `revealed` :
`voix_godric`, `voix_salazar`, `voix_rowena`, `voix_helga`, `dumbledore`,
`manon`.

## Changement

Ajouter à ces 6 entrées un `revealedBy` (déclencheur **réel et atteignable**,
vérifié dans le code) + un texte `revealed` au registre parchemin (§12.3 :
le `veiled` pose une question, le `revealed` y répond ; lore cohérent —
peur-sceau, part de soi dans le verrou, mensonge tendre).

| Entrée | `revealedBy` retenu | Atteignabilité (vérifiée) |
|--------|---------------------|----------------------------|
| voix_godric/salazar/rowena/helga | `echo: echo_scene_sceau` | `TEMPORAL_ECHOES.echo_scene_sceau` émis (floor-ambiance.js:290), `seenEchoes.add` (movement.js:701) |
| dumbledore | `victory` | `victoryAchieved` câblé dans le ctx (ui-codex.js:74) |
| manon | `quest: manon_grimoire` | quête réelle (quests-templates.js:444), `completedQuests` câblé (ui-codex.js:70) |

## Étapes & vérifications

1. Éditer `js/codex.js` : +`revealedBy` +`textVersions.revealed` sur les 6 entrées.
   → vérif : `node /tmp/codex_audit.js` rejoue (0 condition morte, 0 inatteignable),
     `revealed` passe de 24 à **30**.
2. Mettre à jour la ligne « Audit Codex » de `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md`
   (audit fait : 0 coquille ; 6 enrichies).
3. Bump cache PWA (`js/codex.js` servi) — skill `cache-bump` :
   `?v=8 → 9` dans `index.html` + `sw.js`, `CACHE_VERSION v122 → v123`.
   → vérif : `node tools/check_cache_versions.js --base origin/master` (exit 0).
4. Tests : `node tests/units.js` (helpers Codex purs), `node tests/smoke.js`
   (non-régression), `node tests/pwa-smoke.js`.

## Suivi

- [x] Étape 1 — édition codex.js (revealed 24→30, audit 0 bug)
- [x] Étape 2 — roadmap (ligne audit cochée)
- [x] Étape 3 — cache bump (codex.js v8→v9, CACHE_VERSION v122→v123 ; check exit 0)
- [x] Étape 4 — tests verts (units 549, pwa-smoke, smoke 211 scénarios)
