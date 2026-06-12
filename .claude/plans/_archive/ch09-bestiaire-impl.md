# Plan — Implémentation Étape 2 du Chapitre 09 (Bestiaire & lore)

**Branche :** `claude/ch09-bestiaire-lore-xwjzzj`
**Source :** `docs/histoire/09-bestiaire-et-lore.md` § ÉTAPE 2
**Décisions utilisateur (2026-06-08) :** Lots **1-3** · codex **paliers 1-2** ·
visuel **placeholder CSS/canvas** · **pas** de barks boss Ténébreux.

## Périmètre retenu (Lots 1-3 de la priorisation §VII)

### Lot 1 — Data-only (zéro risque)
- [~] `loreFamily: "F1".."F5"` sur **les 67 monstres** (mapping figé) — délégué à
  un sous-agent Sonnet (en cours sur `monsters.js`).
- [~] Remplir `danger`/`habitat`/`anecdote` manquants — même sous-agent.
- [x] Filtre **famille narrative** (`#bestiary-family` + `filterBestiary()`) +
  chip famille sur carte/fiche (`ui-bestiary.js`, `index.html`, `style.css`).

### Lot 2 — Codex progressif (paliers 1-2)
- [x] **Pas de nouveau global sérialisé** : palier dérivé de `seenMonsters` +
  `monsterKills` (déjà sérialisé). `loreCodexUnlocked` jugé inutile pour P1-2.
- [x] `FAMILY_LORE` (5 entrées) + `_codexTier`/`CODEX_DEEP_KILLS` (`ui-bestiary.js`).
- [x] Encart « 🔎 Lore profond » dans `showMonsterDetail` (`_renderCodexDeep` +
  `_corruptionNote`) : famille + blurb + note de gradient ; verrouillé sinon.

### Lot 3 — Surcouche corruption cosmétique
- [x] `creatureCorruptionLevel(base, floor)` pur (`dungeon-scaling.js`) → 0-3.
  Ajouté au MANIFEST loader.
- [x] `scaleMonster` expose `monster.corruption`.
- [x] Visuel : classe `corruption-N` sur `.enemy-card` (`battle-ui.js`) + CSS
  teinte froide/givre pulsé pour `corruption >= 2` (placeholder, zéro asset).
  Décision : appliqué à la carte de combat (HTML, le plus visible) ; sprite
  canvas d'exploration non touché (hors-scope, bref).
- [x] SFX : `AudioSystem.playColdBreath()` (`audio-sfx.js`), déclenché dans
  `startBattle` (+ fallback défensif de `corruption` pour groupes pré-construits).
- [x] Test unitaire `creatureCorruptionLevel` — `node tests/units.js` ✅ 92 assertions.

## Garde-fous (transverses)
- [x] Bump cache PWA (skill `cache-bump`) : 8 assets bumpés (monsters v8,
  ui-bestiary v2, dungeon-scaling v2, battle-ui v6, battle v26, audio-sfx v9,
  loader v29, style.css v32) dans index.html + sw.js ; `CACHE_VERSION` v76→v77.
  `check_cache_versions.js` exit 0 ; `pwa-smoke.js` ✅.
- [x] `node tests/units.js` (92 assertions) + `node tests/smoke.js` (167 scénarios)
  + `node tests/pwa-smoke.js` — tous verts.
- [ ] Vérif état PR avant push (§6) → commit + push branche désignée.

## Mapping loreFamily figé (67 monstres)
F1 (école qui se retourne) : chat_norris, luciole_marais, cornichon,
  portrait_hostile, peeves, myrtle, serpent_cachot, elfe_rebelle, bowtruckle,
  lutin_cornouailles
F2 (bêtes territoriales/blessées) : chouette_envoutee, mandragore_sauvage,
  kappa_douves, araignee, bundimun, homme_araignee, meduse_noire, troll,
  centaure, hippogriffe_courroux, loup_garou, acromantula_jeune, troll_grotte,
  niffleur, gremlin_magique, manticore_jeune, chauve_souris_vampire, strangulot,
  pitiponk, gargouille, loup_garou_adulte
F3 (morts-vivants/peur) : boggart, detraqueur, inferius, dementor_garde,
  chevalier_fantome, fantome_sang_noir, vampire_mineur, strigoi, poupee_maudite,
  spectre_maudit, maitre_detraqueur, detraqueur_elite, spectre_renforce
F4 (forces de Voldemort) : gobelin, sorciere_tenebres, mangemort, sorcier_renegat,
  nagini, mangemort_elite, bellatrix, voldemort_affaibli, voldemort_revenu,
  hecate_sorciere, fenrir_greyback, auror_corrompu, antonin_dolohov,
  mangemort_veteran
F5 (mythiques/gardiens anciens) : basilic, chimere, ombre_quirrell,
  bibliothecaire_ombre, gardien_portail, veilleur_seuil, aragog,
  acromantule_adulte, heraut_tenebres

## Journal
- 2026-06-08 : plan créé, décisions actées, mapping figé. Début implémentation.
