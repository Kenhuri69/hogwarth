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
| `SAVE_AND_START_PLAN.md` | Sauvegarde multi-slots (`_serializeState`/`_applyState`, 3 manuels + auto, migration legacy) + auto-save sur hooks + Hub démarrage + refonte title screen | PR #21 |
| `ENDGAME_PLAN.md` | Écran de victoire (trigger Voldemort) + Boucle Ténébreuse (étages 11+, variant `darkness`, escalier scellé, textures runiques) + Forge + Bibliothèque interdite + Maison Tier 5 + Set Ténèbres | `claude/launch-endgame-plan-Nf9s4` / `claude/endgame-tranche-2` |
| `difficulty-progression.md` | Étude difficulté Normal (`DIFFICULTY_REPORT.md` + `tools/sim-difficulty.js`) + Phase 3 : respawn 20 %, chaîne de quêtes Dumbledore, 6 équipements mid-game. Compléments §3.6 → `difficulty-polish-v3.md` | `claude/analyze-difficulty-progression-vyItb` |
| `difficulty-lever-b.md` | Levier B — plancher de dégâts (`DAMAGE_MIN_FRACTION`, `mitigatedDamage`) supprimant la falaise « coup à 1 dégât » | — |
| `intro-ux-rework.md` | Refonte intro : musique de menu (sample + procédural), 5 voix narratives `narrator_*`, sélection en 3 étapes guidées, révélation Dumbledore, fil d'Ariane, regroupements de héros | `claude/improve-intro-ux-0E995` |
| `code-review-high-bugs.md` | Correction des bugs HIGH/MED/LOW de la revue de mai 2026 (teleport solo, ré-octroi récompenses Maison, sort sur cadavre, fuite Balai, etc.) | `claude/code-review-bugs-7zdJf` |
| `rationalisation.md` | 12 points de rationalisation des sources (P1-P12 : MANIFEST, code mort `drawCellMarker`, helpers partagés forge/library/audio/sorts, `_changeFloor`, `_drawSideWall`…). P2 écarté (faux positif) | — |
| `crit-rework.md` | Refonte du critique : 2 canaux (physique/sort), `critMultiplier`/`spellCritMultiplier`, `bonusCritDamage`, crit d'équipement > 40 % | — |
| `agi-spell-crit.md` | AGI = crit magique (`spellCritChance`, roll dans les 3 handlers de sorts, ligne fiche perso) | — |
| `elemental-system.md` | Système élémentaire : champ `spell.element` (6 éléments) découplé d'`effect`, re-tag des 17 sorts + 50 monstres, emoji bestiaire | — |
| `element-spells.md` | 3 sorts élémentaires (Glacius/Fulgari/Lumos Solem) + statut `gel` (DoT) + 3 spellbooks + icônes PNG | — |
| `int-stat-role.md` | Rôle réel de l'INT (« maîtrise ») : soins + fiabilité/durée des DoT (combinés END/LCK) | — |
| `equipment-bonuses-v2.md` | Équipement V2 — bonus passifs : `bonusCritChance/DodgeChance` sur items, `bonusHpMax/SpMax` + `_baseHpMax`, cap `critMultiplier` 2.5. Vagues D/E reportées V3 | — |
| `new-monsters-stun.md` | Mécanique de statut `stun` (saut de tour, bidirectionnel) + 4 monstres étourdissants (Lutin Cornouailles, Strangulot, Pitiponk, Gargouille) + PNG | `claude/plan-new-monsters-XfZRY` |
| `enemy-dot-sim.md` | Modélisation des DoT ennemis (burn/poison/bleed/gel) dans `tools/sim-difficulty.js` | `claude/implement-enemy-dot-8AVb4` |
| `delayed-search-reactivation.md` | Fouille renouvelable : recharge en pas de marche selon difficulté + anti-farm dégressif | — |
| `farming-potion-system.md` | Système herboristerie : besace `player.herbs`, 6 herbes, `POTION_RECIPES`, PNJ Slughorn, modale chaudron `#brewing-modal`, jet INT, quête de déverrouillage | `claude/farming-potion-system-SXjie` |
| `fix-slider-herb-bugs.md` | Correctifs post-herbes : swipe canvas débloqué, cache-bust `?v=`, onglet Besace dans l'inventaire | `claude/fix-slider-herb-bugs-opKOP` |
| `shop-purchase-limits.md` | Anti-farm boutique : stock fini aléatoire (8 objets), achat unique, réassort 40 pas/étage, livres de sorts achetables une fois | — |
| `spell-ux-improvements.md` | UX sorts : apprentissage de livre sur un seul perso, filtre par élément, aperçu d'effet chiffré | — |
| `repeatable-quest-spawn.md` | Découvrabilité des quêtes répétables : double tirage PNJ par étage (70 % donneur de quête + 50 % ambiant) | — |
| `npc-anecdote-variations.md` | Pools `idleRandom` enrichis (anecdotes rigolo→sombre) pour PNJ lore, vendeurs et PNJ à quête | — |
| `help-tour.md` | Tour guidé interactif pour novices (`help-tour.js`, 15 étapes) + narration vocale McGonagall (15 OGG edge-tts) | — |
| `pixel-map-mobile.md` | Mini-carte « pixel » dans le coin de la vue 3D (mobile uniquement, informative) | — |
| `ironman-hall-of-fame.md` | Mode Ironman (vie unique + score chiffré) + Hall of Fame en ligne (Supabase + repli localStorage) | — |
| `ironman-icons-name-flow.md` | Icônes Ironman (crâne/coupe/médailles) + pseudonyme persistant + UID de run (anti double-classement) | `claude/ironman-icons-name-flow` |
| `draco-malfoy-character.md` | Personnages jouables film : Drago Malefoy, Cho Chang, Cedric Diggory (portraits détourés + entrées `CHARACTERS`) | — |
| `Manon.md` | PNJ original Manon (fille cachée de Lupin) : chaîne de quêtes `manon_secret`/`manon_pardon`, dialogues, portrait, coda Poufsouffle | — |
| `voice-dumbledore-chain.md` | Voix in-game de Dumbledore sur la chaîne de 5 quêtes d'épreuves : 15 OGG `dumbledore_<qid>_<offer\|active\|ready>_1` + câblage `_voiceKeyForPage`/`_playPageVoice` | `claude/dumbledore-voice-chain` |
| `combat-extensions-v2.md` | Extensions combat V2 : Garde counter-attack (`_tryGuardCounter`, `counterChance`), Double-Garde (empilement `guardTurns` cap 3), Ferula Maxima (régén AOE), ennemis dispel, spellbook `livre_ferula` | `claude/list-open-plans-eDYxT` |
| `voice-extensions-v2.md` | Voix in-game V2 : 28 OGG chefs de Maison (Vague A), 13 OGG incantations + `SPELL_VOICE_MAP` (Vague B), karaoké généralisé intro + dialogues PNJ (Vague C). Vague D (localisation) annulée | `claude/extend-house-quest-paths-Bh7MD` / `claude/list-open-plans-eDYxT` |
| `hof-projection-from-character.md` | Bouton « Mon rang » sur la fiche perso (Ironman) : projette le score du run courant dans le Hall of Fame (`openHofProjection`, `_hofBuildProjection`, `_hofRankForScore`) | PR #176 |
| `difficulty-polish-v3.md` | Compléments difficulté V3 : Vague A — 6 sprites painterly des équipements mid-game (`icon_factory.py` + `ITEM_ICON_NEW_REGISTRY`) ; Vague B déjà couverte par `voice-dumbledore-chain` ; Vague C — smoke `scenarioRespawn20Percent` | `claude/difficulty-polish-v3-sprites` |

> Pour un plan encore actif, voir le dossier parent `.claude/plans/`.
