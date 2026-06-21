# Icônes de sorts P4 (+ slot splash + variantes P3)

Chantier : produire/intégrer les **icônes dédiées** des sorts encore sur alias
temporaire dans `SPELL_ICON_REGISTRY` (`js/item-icons.js`), créer un **slot de
rendu splash** pour les arts d'EFFET en combat, et étendre l'art aux **variantes
Premium/évoluées P3**.

Branche : `claude/spell-icons-p4-hu8g56`.

## Décisions (validées avec l'utilisateur)
- **A — Arts FX/splash** : *Nouveau slot splash*. Les key-art d'effet sont
  composités en combat via un nouveau registre + hook CombatFX (défensif).
- **B — Variantes P3** : *inclure maintenant* (mêmes lots que P4).

## Périmètre — sorts à doter d'un art dédié

### P4 (10)
| Sort | Élément/thème | Maison | Slug |
|------|---------------|--------|------|
| Venin du Cachot | ténèbres, venin drainant | Serpentard | `venin_du_cachot` |
| Savoir Interdit | ténèbres, malédiction/savoir | Serdaigle | `savoir_interdit` |
| Fardeau Partagé | soin/redistribution PV ambré | Poufsouffle | `fardeau_partage` |
| Tempus Echo | temporel, sablier/rune (rituel) | — | `tempus_echo` |
| Reliquae Temporis | temporel, retourneur (corrompu) | — | `reliquae_temporis` |
| Écho Fantôme | ténèbres, double spectral (corrompu) | — | `echo_fantome` |
| Cœur de Lion | feu/or, ralliement (légendaire) | Gryffondor | `coeur_de_lion` |
| Pacte du Serpent | sang/ténèbres, pacte (légendaire) | Serpentard | `pacte_du_serpent` |
| Verbe de Rowena | lumière bleue, chœur runique (légendaire) | Serdaigle | `verbe_de_rowena` |
| Serment du Blaireau | ambre/lumière, relève allié (légendaire) | Poufsouffle | `serment_du_blaireau` |

### Variantes P3 (8)
Incendio Royal, Morsure d'Émeraude, Givre de Rowena, Soin du Blaireau,
Incendio Majeur, Glacius Profond, Sanguini Vorace, Protego Diabolica.

## Étapes & vérifs

1. **Prompts** (symbole + effet) fournis par lots de 2-3, priorité légendaires.
   → vérif : format conforme aux sheets du repo.
2. **Slot splash** (nouveau, fait une fois) :
   - `SPELL_SPLASH_REGISTRY` dans `js/item-icons.js` : nom de sort → `img/fx/spells/<slug>.png`.
   - Hook combat : à la résolution d'un sort (`castSpellInBattle`/`battle-spells.js`),
     appel défensif `if (window.CombatFX?.spellSplash) CombatFX.spellSplash(targetKey, src)`.
   - `CombatFX.spellSplash(targetKey, src)` (`js/combat-fx.js`) : overlay image
     ~600 ms, fade-in/out, au-dessus du sprite cible. Surcouche PURE, no-op si absent.
   - cache-bump (`item-icons.js` + `combat-fx.js` + `battle-spells.js` servis).
   - scénario smoke dédié (registre splash chargé, no-op sans image).
   → vérif : `node tests/smoke.js` vert, splash visible en combat.
3. **Intégration icône** (par sort, au fil des images) :
   - `dechecker_png.py <upload> /tmp/x_512.png 512` → vérif visuelle
   - 128px LANCZOS → `img/icons/spells/<slug>.png`
   - `SPELL_ICON_REGISTRY['<Nom>']` → chemin dédié
   - cache-bump `item-icons.js` → `check_cache_versions --base origin/master`
   - `node tests/smoke.js SpellIcons`
4. **Push & PR** : CI « Smoke + PWA » verte → squash-merge.
   ⚠️ Flake connu DungeonTraps (« hors 1-4:1 ») ~1/20 — re-kicker, ne pas corriger.

## Vérif finale (avant chaque push)
`node tests/units.js` ; `node tests/smoke.js` (complète) ; `node tests/pwa-smoke.js`.

## Journal
- 2026-06-21 : plan créé. Prompts légendaires Cœur de Lion / Pacte du Serpent /
  Verbe de Rowena fournis. Décisions A (slot splash) + B (P3 inclus) validées.
- 2026-06-21 : **Lot 1 livré** — 3 légendaires (symbole + splash).
  - Slot splash construit (fait une fois) : `SPELL_SPLASH_REGISTRY` +
    `spellSplashSrc()` (item-icons.js), `CombatFX.spellSplash()` (combat-fx.js)
    + CSS `.cfx-spell-splash` (combat-fx.css, scale-in/fade + reduced-motion),
    hook défensif dans `castSpellInBattle` (battle-spells.js). Assets dans
    `img/fx/spells/` (256² RGBA).
  - Icônes dédiées : `SPELL_ICON_REGISTRY` → coeur_de_lion / pacte_du_serpent /
    verbe_de_rowena (128² dans img/icons/spells/).
  - Smoke `SpellIcons` étendu (T5 : registre splash + helper + FX + PNG + noms).
  - cache-bump : combat-fx.css v12, combat-fx.js v11, item-icons.js v39,
    battle-spells.js v22, CACHE_VERSION v190.
  - Vérifs : units 897 ✓, smoke 249 ✓, pwa-smoke ✓.
  - Reste P4 : Serment du Blaireau (légendaire) + 6 non-légendaires + 8 variantes P3.
- 2026-06-21 : **Lot 2 livré** (même PR #624) — 3 icônes + 3 splashes dédiés :
  Serment du Blaireau (Pouf, légendaire, boucle le quatuor), Venin du Cachot
  (Slyth), Savoir Interdit (Serd). `SPELL_ICON_REGISTRY` + `SPELL_SPLASH_REGISTRY`
  mis à jour (slot déjà en place). cache-bump : item-icons.js v40, CACHE_VERSION
  v191. Vérifs : units 897 ✓, smoke 249 ✓ (T5 = 6 splashes), pwa-smoke ✓.
  - Reste P4 : Fardeau Partagé + Tempus Echo + Reliquae Temporis + Écho Fantôme
    (4) + 8 variantes P3.
