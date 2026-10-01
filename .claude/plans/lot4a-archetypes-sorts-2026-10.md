# Lot 4 (a) — Archétypes de classe & tables de sorts (4.1 + 4.2)

Revue `revue-design-progression-2026-07.md` §6.2, résout B1 (table de sorts de
level-up hardcodée Harry/Hermione) et la moitié de B2 (`role` orphelin). Le
Lot 4 (≈ 4-5 sessions) est découpé : cette PR couvre 4.1 + 4.2 ; l'arbre
lui-même (4.3-4.8) suivra.

## Conception

- **4.1** `classArchetype` sur les 16 entrées `CHARACTERS`
  (`data-characters.js`), mapping §6.2 (Cedric = Gardien, tranché ❓4) :
  - Duelliste ⚔️ : harry, draco, cho
  - Érudit 📘 : hermione, celeste, margaux, anastasia, olivier
  - Occultiste 🌑 : maxence, chatillon
  - Gardien 🛡️ : cedric, nathalie, louis
  - Enchanteur ✨ : iris, jeanne, agathe
  `CLASS_ARCHETYPES` (libellé + icône) et `heroArchetype(c)` (PUR) : lit
  `CHARACTERS[c.heroKey].classArchetype` ; repli pour un perso sans `heroKey`
  (save ancienne) = l'emplacement (0 → duelliste, 1 → erudit), c.-à-d.
  exactement le comportement historique.
- **4.2** `SPELL_LEARN_TABLES[archétype] = { niveau: [sorts] }`.
  `_grantLevelSpells` (battle-rewards.js) enseigne à chaque membre du groupe
  la table de SON archétype ; niv. 8 (Cheminette) et niv. 9 (Avada, déverrouillé)
  restent communs à tous.
  - Duelliste = table Harry actuelle à l'identique ;
    Érudit = table Hermione actuelle à l'identique → zéro régression pour le
    duo historique (et pour le sim, qui ne modélise que harry/hermione).
  - Occultiste : 2 Incendio · 3 Sanguini · 4 Ferula · 5 Maledictus ·
    6 Diffindo · 7 Reparo.
  - Gardien : 2 Ferula · 3 Wingardium Leviosa · 4 Reparo · 5 Stupefix ·
    6 Diffindo · 7 Ferula Maxima.
  - Enchanteur : 2 Riddikulus · 3 Ferula · 4 Tarantallegra · 5 Reparo ·
    6 Stupefix · 7 Diffindo + Ferula Maxima.
  Que des sorts basiques/avancés déjà présents au départ chez d'autres héros
  ou vendus en livre (Sanguini, Maledictus, Tarantallegra) : pas de sort rare
  donné gratuitement. 5 à 7 sorts par table (Duelliste 5, Érudit 7 inchangés).
  - Effet de bord voulu : un héros non canon en emplacement 0 n'apprend plus
  la table de Harry mais celle de sa classe (c'est le fix B1).
- **UI** : la fiche affiche l'archétype (ligne sous la Maison). L'écran de
  sélection reste inchangé (hors périmètre).
- **Aucune simulation** : le sim ne modélise que harry/hermione, dont les
  tables sont inchangées.

## Étapes

1. [x] Plan (ce fichier).
2. [x] 4.1 `classArchetype` + `CLASS_ARCHETYPES` + `heroArchetype`.
3. [x] 4.2 `SPELL_LEARN_TABLES` + réécriture `_grantLevelSpells`.
4. [x] Fiche : ligne d'archétype.
5. [x] Tests : units §31 (mapping exhaustif, tables Harry/Hermione identiques
   à l'historique, sorts existants) ; smoke `scenarioClassSpellTables`.
6. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-10-01 — Plan créé (PR #758 fusionnée ; branche remise à zéro).
- 2026-10-01 — Implémenté tel que conçu. Tests : units §31 (1519 ✅), smoke
  `scenarioClassSpellTables` (Maxence/Iris + duo historique inchangé ✅), suite
  complète 296 ✅, pwa-smoke ✅. Loader 419 ; cache 4 JS, `CACHE_VERSION` 285.
  Suite : 4.3 (socle de l'arbre, points d'Éveil).
