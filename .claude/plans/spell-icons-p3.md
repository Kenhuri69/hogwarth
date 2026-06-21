# Icônes de sorts P3 — variantes Premium & formes évoluées

Chantier : doter d'un **art dédié** (icône 128² + splash de combat 256²) les
8 variantes Premium / formes évoluées P3 encore sur alias temporaire dans
`SPELL_ICON_REGISTRY` / sans entrée `SPELL_SPLASH_REGISTRY` (`js/item-icons.js`).

Suite du chantier P4 (PR #624, mergée) qui a construit le **slot splash**
(`SPELL_SPLASH_REGISTRY` + `spellSplashSrc()` + `CombatFX.spellSplash()` + hook
`castSpellInBattle`). Ici : **données uniquement** (registres + PNG), aucune
nouvelle mécanique.

Branche : `claude/spell-icons-p3` (basée sur origin/master à jour).

## Périmètre (8)
| Sort | Thème | Slug |
|------|-------|------|
| Incendio Royal | Premium feu, or royal | `incendio_royal` |
| Morsure d'Émeraude | Premium venin, Serpentard | `morsure_emeraude` |
| Givre de Rowena | Premium glace, Serdaigle | `givre_rowena` |
| Soin du Blaireau | Premium soin, Poufsouffle | `soin_blaireau` |
| Incendio Majeur | forme évoluée feu | `incendio_majeur` |
| Glacius Profond | forme évoluée glace | `glacius_profond` |
| Sanguini Vorace | forme évoluée drain | `sanguini_vorace` |
| Protego Diabolica | forme évoluée feu noir | `protego_diabolica` |

## Étapes & vérifs
1. Prompts symbole+effet fournis (déjà faits). ✓
2. Intégration (par sort) : dechecker → icône 128² (img/icons/spells/) +
   splash 256² (img/fx/spells/) → `SPELL_ICON_REGISTRY` + `SPELL_SPLASH_REGISTRY`.
   → vérif visuelle de chaque dechecké.
3. cache-bump : item-icons.js + CACHE_VERSION.
   → `node tools/check_cache_versions.js --base origin/master` vert.
4. Tests : `node tests/smoke.js SpellIcons` (T1 charge toutes les icônes,
   T5 = registre splash, noms valides) ; units ; smoke complète ; pwa-smoke.
5. PR → CI verte → squash-merge. ⚠️ Flake DungeonTraps connu : re-kicker.

## Journal
- 2026-06-21 : plan créé. 16 images reçues (symbole + splash × 8). Branche
  basée sur origin/master (item-icons.js v42, CACHE_VERSION v195).
