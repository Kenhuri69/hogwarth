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
| `character-ux-refonte.md` | Iter A (paper doll) + Iter B (crit/esquive) — Iter C reportée vers `character-ux-v2.md` | PR #57 |
| `audio-intro-sample.md` | Sample d'ambiance intro + samples zones 1-2/3-4/5-6/7-8/9+ avec fallback procédural | PR #73, #74 |
| `voice-intro-dumbledore.md` | Voix narrative Dumbledore sur l'intro (2 pages OGG Vorbis) | PR #76 |
| `anastasia-character.md` | Personnage jouable Anastasia Moonveil — portrait médaillon + intégration `CHARACTERS` | commit `c6765e7` |
| `code-improvements.md` | Vague A (4/4) livrée, vagues B et C absorbées par `code-review-tasks.md` | `claude/code-analysis-improvements-32AvX` |
| `combat-guard-support.md` | Action Garde (mitigation 50 % + regen PM) + Ferula (sort de soutien duo) | PR #119 (`claude/new-skills-guards-6MyeW`) |
| `equipment-extended.md` | 11 slots équipement + rings duaux + spellbooks + `regenHp/Sp` + `grantsSpell` + migration save legacy | PR antérieure |
| `farming-quests.md` | 2 quêtes répétables (Scamander Niffleur, Hagrid Bowtruckle) + marqueur minimap rouge | PR #117 |
| `house-intermediate-tier.md` | Succédé et complété par `houses-2.0.md` (architecture 16 paliers Bronze/Argent/Or × 5 phases + Légende) | — |
| `houses-2.0.md` | 16 paliers + 12 NEW set artifacts + détection sets 2/3/4 + bonus passifs + UI fiche perso + tag SET menu équipement + audio set-complete | PR #123 (`claude/house-system-step-three-Ual5V`) |
| `hud-statuses-equipment.md` | Tranche A (statuts réels weaken/burn/poison/bleed + badge Protego allié) + Tranche B (mini-équipement party-card 3 slots) | PR #101 (commit `1949029`) |
| `louis-dragonflamme.md` | Personnage jouable Louis Dragonflamme (Poufsouffle, Dompteur de Dragons) | PR #112 / #113 / #114 |
| `mobile-3d-swipe.md` | Gestes swipe sur `#dungeon-canvas` (avancer/reculer + pivoter) avec garde-fous overlay/combat | PR #111 |
| `mobile-display-rooms.md` | Allègement carte joueur mobile + sprites Forge/Bibliothèque (3D + minimap) | commit `537eca2` |
| `movement-relative.md` | Contrôles relatifs ↑↓←→ (avancer/reculer/pivoter) + boussole + flèche minimap + scénario smoke dédié | PR #80 |
| `npc-3d-sprite.md` | Sprite PNJ visible en vue pseudo-3D (`drawNpcSprite` + aura + signe ❗/❓ animé + boucle 5 FPS) | commit `007cd1b` |
| `npc-integration.md` | Système PNJ complet : registre `NPCS[]`, `getNpcsForFloor`, dialogues `openNpcDialog`, marqueurs minimap, intégration quêtes | — |
| `npc-portraits-iter3.md` | Portraits PNG des PNJ lore + correction Pomfresh + assets dans `img/npc/` | PR #79 |
| `quest-target-respawn.md` | Respawn des cibles kill manquantes pour les vieilles saves (`_ensureActiveKillQuestTargets`) | commit `c4af6b1` |
| `svg-c1-monsters.md` | 4 PNG monstres bloc C.1 (mangemort_elite, sorcier_renegat, chimere, ombre_quirrell) Nano Banana | PR #81 |
| `svg-c2-bellatrix.md` | PNG Bellatrix Lestrange (C31) Nano Banana | commit `1051b5e` |
| `svg-c42-c43-scenes.md` | Illustrations grand format écran-titre (C42) + écran de mort (C43) | commit `c3dde25` |
| `teleportation-spell.md` | Sort Portus (téléportation combat + hors combat) + Episkey/Reparo OOC avec cooldown | PR #121 |
| `floor-tier-theming.md` | SoT `FLOOR_THEMES`/`getFloorTheme` (tileset + ambiant, 3 tranches) consommée par renderer/audio/movement + musique combat à axes combinés (epic/étage/difficulté) + transition de tranche | PR #168 |

> Pour un plan encore actif, voir le dossier parent `.claude/plans/`.
