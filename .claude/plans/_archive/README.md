# Plans archivés

Plans 100 % terminés et livrés sur master. Conservés pour archéologie / décisions historiques.

| Plan | Livré | Branche/PR de référence |
|------|-------|-------------------------|
| `audit-sprints.md` | S1 (softlock + cache + résilience save), S2 (code mort + DRY), S3 (extraction `scene-icons.js`) | `claude/continue-svg-work-v6BEc` |
| `bloc-A.md` | A1-A6 — `MONSTER_DEFS_SVG`, fallback redessinés, palette saturée, scene-icons enrichis, animations CSS, ornaments étoffés | `claude/continue-svg-work-v6BEc` |
| `fountain.md` | `CELL.FOUNTAIN`, `usedFountains`, génération étages 2/5/8…, soin total + état tarie + persistance save, scénario smoke 14 | `claude/continue-svg-work-v6BEc` |
| `icon-generation-engine.md` | 77 PNG générés (chrome, HUD, équipement, status, sorts, items, char-icons), `gen_icons.py` complet | — |
| `icon-quality.md` | Refonte 6 sprites (amulette, anneau_argent, felix, ceinture_alchimiste…) + POC tint CSS épée (`sword_blade_base.png` + `sword_hilt_gryff.png`) + scénario smoke 24 | `claude/improve-game-images-7OVCy` |
| `img-tooling.md` | `tools/process_monster_png.py`, `tools/count_plan.py`, scénario smoke 5 data-driven sur tous les `imgSrc` | `claude/improve-game-images-7OVCy` |
| `repeatable-quest-hagrid.md` | `spawnQuestMonsters` + `repeatableReward` + hook `acceptQuest`, scénario smoke `scenarioRepeatableQuestSpawn` | PR #52 |

> Pour un plan encore actif, voir le dossier parent `.claude/plans/`.
