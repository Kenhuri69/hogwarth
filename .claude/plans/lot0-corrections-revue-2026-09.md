# Lot 0 — Corrections issues de la revue expérience joueur (2026-09)

**Branche :** `ccr-4b80ea69-2nys9o` (PR #750)
**Source :** [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md) §Lot 0
**Statut :** ✅ livré (en attente de merge, PR #750)
**Arbitrages utilisateur (2026-09-29) :** « Go correction » ; factions laissées
à mon choix ; murmures de Voldemort acceptés (Q2, lot ultérieur) ; arbre
« Éveil du Sorcier » retenu (Q4 : pas de traits légers de l'axe 7).

## Décisions prises

- **0.1 — Source des 8 objets orphelins** : on suit l'intention **documentée**
  (`docs/gameplay/G5-equipement-objets.md` §livres, étude
  `_archive/game-economy-gold-audit.md` §5.6), sans inventer d'économie :
  - « Boutique » / « Boutique avancée » → `SHOP_CATALOG` : `livre_taranta`
    (ét. 3, 130 G, 8 dégâts), `livre_sanguini` (ét. 4), `livre_maledictus`
    (ét. 5), `livre_vampyrus` (ét. 7) ;
  - « Rare » → butin de coffre (`booksAvailable`), aligné sur `livre_prince`
    (Sectumsempra 24 dégâts, ét. ≥ 6) : `livre_crucio` (22 dégâts, ét. ≥ 7),
    `livre_morsmordre` (26 dégâts, ét. ≥ 8) ;
  - « Endgame sink » → `grimoire_interdit` et `reliquaire_lunaire` dans les
    `wares` du **Marchand d'Ombre** (Boucle, ét. 11+, prix ×1,4), vendeur des
    gold-sinks de fin de jeu. `pendentif_ombre` n'est **pas** orphelin
    (épique, donc déjà éligible aux coffres).
  - Recensement systématique (script sandbox) : 13 candidats, dont 5
    consommables en réalité **brassables** (`POTION_RECIPES`) → 8 vrais orphelins.
- **0.2 — Libellé de lieu** : `LOCATIONS` passe à **une entrée par étage**
  (1 → 21+), avec les noms des fiches d'étage de
  `docs/histoire/10-lieux-et-geographie.md` §10.2. Les 4 consommateurs
  (`ui.js`, `movement-floors.js`, `teleport.js` ×3) indexent déjà par
  `min(floor-1, len-1)` : ils ne changent pas.
- **0.3 — Factions** : on **garde les deux factions déjà en jeu** (blasons
  et illustrations livrés) et c'est la bible qui s'aligne :
  - **Cercle des Astres** (7) : Céleste, Iris, Maxence, Anastasia, Louis,
    Jeanne, Margaux. Ceux qui ont *lu* les signes de la fêlure avant qu'elle
    s'ouvre.
  - **Garde de l'Aube** (4) : Agathe, Olivier de Clairval, Nathalie,
    Châtillon. Ceux qui *tenaient les couloirs* quand les escaliers ont
    basculé : protéger, abriter, faire pousser.

  Les deux répondent à l'appel du portrait. Au passage, les sous-titres des
  cartes de groupe, périmés, sont corrigés (« Harry & Hermione — d'autres
  bientôt » → 5 héros ; « 6 héros » → 7 ; « 2 jeunes sorciers » → 4).
- **0.4 — Docs périmées** : CLAUDE.md (« 6 entrées actuelles »), 05 (bandeau
  et §5.4.2 : 10 `descentStake` manquants, en réalité 16 livrés), 06 §6.8.5 et
  §6.8.6 (Chevalier Fantôme et Écho de Salazar dits non implémentés), 11
  §11.8.2 (« 13 jouables »).
- **0.5 — Commentaires obsolètes** : `monsters.js` (IA « évolutions futures »)
  et `forge.js` (`upgradeLevel` 0-5).
- **0.6 — Rogue** : `dialoguesByHouse` pour Gryffondor, Serdaigle et
  Poufsouffle (le greeting par défaut, Serpentard, reste celui qui est
  enregistré). Garde-fou voix : `_voiceKeyForPage` ne joue pas l'OGG de
  greeting si le texte affiché diffère du texte par défaut ; les pages
  identiques gardent leur voix.

## Étapes

- [x] 0.1 `shop.js` (+4) · `movement-interactions.js` (+2) · `npcs-b.js`
      Marchand d'Ombre (+2) → vérif : relancer le script de recensement = 0
      orphelin ; `node tools/check_content_refs.js` vert.
- [x] 0.2 `data-world.js` `LOCATIONS` → vérif : smoke (HUD, transition
      d'étage, Portus).
- [x] 0.3 `index.html` (3 sous-titres) + bible 05 / 06 → vérif : relecture.
- [x] 0.4 docs → vérif : `node tools/check_doc_modules.js`.
- [x] 0.5 commentaires.
- [x] 0.6 `npcs-a.js` + `npc-dialog.js` → vérif : scénario smoke dédié
      (greeting de Rogue par Maison + clé de voix nulle / conservée).
- [x] Tests : `node tests/units.js`, `node tests/smoke.js` (ciblé puis
      complet), `node tools/check_cache_versions.js --base origin/master`,
      `node tests/pwa-smoke.js`.
- [x] Bump du cache PWA (skill `cache-bump`) : `shop.js`,
      `movement-interactions.js`, `npcs-a.js`, `npcs-b.js`, `npc-dialog.js`,
      `data-world.js`, `monsters.js`, `forge.js`, `index.html`.
- [ ] Commit, puis vérification de l'état de la PR #750, puis push.

## Journal

- **2026-09-29** — Plan créé ; décisions 0.1 à 0.6 prises.
- **2026-09-29** — 0.1 à 0.6 implémentés. Écarts et ajouts :
  - 0.4 : CLAUDE.md §« Ajouter un personnage » corrigé aussi sur `#hero-grid`
    (n'existe plus : une `.hero-grid` par groupe `data-group`) ; glossaire 12
    et doc 13 alignés sur les deux factions ; lien d'ancre §5.2 mis à jour ;
    06 §6.8.5/6.8.6 passés en ✅ (raccourcis du Pacte notés comme reste).
  - 0.2 : le libellé statique de `#loc-display` dans `index.html` est aligné.
  - Tests ajoutés : `units.js` §19 (libellés d'étage) et §20 (tout objet a
    une source d'obtention, garde-fou générique contre de futurs orphelins) ;
    contre-épreuve faite (sans le correctif : 6 échecs, dont les 8 orphelins
    nommés). Smoke : T7 dans `scenarioHeadOfHouseVoice` (greeting de Rogue
    × 4 Maisons + clés de voix).
  - Bump : 8 assets `?v` + `CACHE_VERSION` 273 → 274.
  - Vérifs : `units` 1156 ✅, `check_content_refs` ✅, `check_doc_modules` ✅,
    `pwa-smoke` ✅, eslint ✅, smoke complet ✅ (285 scénarios).
