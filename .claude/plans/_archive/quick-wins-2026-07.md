# Lot Quick Wins — 2026-07-09

> Issu de la revue `game-evolution-review-2026-07.md`. Lot de gains rapides,
> effort S, risque faible. **Sans le nerf boss 8-11** (écarté par l'utilisateur).
> Règle « renforcer, pas reconstruire » : audit du code réel d'abord.

## Périmètre — audit préalable (2026-07-09)

| Item revue | État réel vérifié | Décision |
|---|---|---|
| B1 · items Fortune/Célérité | 0 item `bonusFortune`, 1 seul `bonusCelerite` (`cape_funambule`) | ✅ **À FAIRE** |
| C4a · `descentStake` 10 héros | 6/16 seulement (harry, hermione, celeste, iris, maxence, anastasia) | ✅ **À FAIRE** |
| Tracker complétion Codex | Codex a **déjà** `#codex-progress` (`ui-codex.js:147`) ; **bestiaire n'en a pas** | ✅ **À FAIRE (bestiaire seul)** |
| C3 · théories du Sceau marchands Boucle | **Déjà livré en P6b** (commentaires « P6b — théorie du Sceau » dans `npcs-b.js`) | ❌ **RETIRÉ** (déjà fait) |
| Nerf boss 8-11 | — | ❌ **EXCLU** (choix utilisateur) |
| `git gc` | — | ❌ Hors PR (opération locale, env éphémère) |

## Étapes → vérification

1. **B1 — 5 items Fortune/Célérité** (`js/data-items.js`) → répartis sur des
   slots distincts pour ne pas monopoliser un slot ; icône emoji (pas de PNG) ;
   entrent automatiquement dans le pool de coffres (`pickChestEquipment` inclut
   tout item `slot`+`rarity` non-légendaire). Les 2 communs ajoutés à
   `SHOP_CATALOG` (`js/shop.js`) pour la découvrabilité mid-game.
   - Fortune (LCK) : `anneau_trefle` (ring, common), `patte_niffleur` (trinket,
     rare), `medaillon_chance` (amulet, rare).
   - Célérité (AGI) : `bottes_lievre` (feet, common), `bracelet_tempo` (hands, rare).
   - Vérif : `recalculateStats` lit déjà `bonusFortune`/`bonusCelerite` ; smoke
     inventory + units (courbes Fortune/Célérité inchangées).
2. **C4a — `descentStake` 10 héros** (`js/hero-barks.js`) : draco, cho, cedric,
   louis, jeanne, margaux, agathe, olivier, nathalie, chatillon. Une réplique en
   voix, ancrée à l'identité (tagline/rôle/Maison). Surcouche cosmétique
   défensive → zéro régression. Vérif : smoke npc/audio.
3. **Compteur bestiaire** (`index.html` + `js/ui-bestiary.js`) : span
   `#bestiary-progress` dans `.bestiary-header` (miroir de `#codex-progress`),
   peuplé dans `filterBestiary` → « 🐾 X / N découverts » (global, non filtré).
   Vérif : smoke bestiary.
4. **Cache PWA** (guidelines §8) : bump `?v` de hero-barks/data-items/shop/
   ui-bestiary dans `index.html` + `PRECACHE_URLS` de `sw.js` + `CACHE_VERSION`.
   Vérif : `node tools/check_cache_versions.js --base origin/master` + `pwa-smoke`.
5. **Tests** : `node tests/units.js` + `node tests/smoke.js` verts.

## Journal
- **2026-07-09** — Plan créé après audit. C3 retiré (déjà P6b), nerf boss exclu.
- **2026-07-09 — LOT LIVRÉ** ✅ :
  - B1 : 5 items ajoutés (`data-items.js`) — Fortune : `anneau_trefle`
    (ring/common), `patte_niffleur` (trinket/rare), `medaillon_chance`
    (amulet/rare) ; Célérité : `bottes_lievre` (feet/common), `bracelet_tempo`
    (hands/rare). 2 communs ajoutés à `SHOP_CATALOG` (`shop.js`, minFloor 2) ;
    les 5 entrent au pool de coffres via rareté (aucun câblage). Icône emoji
    (pas de PNG). `recalculateStats` lit déjà `bonusFortune`/`bonusCelerite`.
  - C4a : `descentStake` ajouté aux 10 héros manquants (`hero-barks.js`,
    16/16 désormais), une réplique en voix ancrée à l'identité de chacun.
  - Compteur bestiaire : span `#bestiary-progress` (`index.html`) peuplé par
    `filterBestiary` (`ui-bestiary.js`) → « 🐾 X / N découverts » (global).
  - Cache : `?v` bumpés (data-items 5, hero-barks 14, ui-bestiary 9, shop 20)
    + `CACHE_VERSION` v253→v254. `check_cache_versions` ✅, `pwa-smoke` ✅ (v254).
  - Tests : `units` 1089 ✅ ; `smoke` inventory/shop/bestiary/npc/audio (14) +
    houses/save/visuals/crit (18) ✅.
- **2026-07-09 — FIX CI** ✅ : `scenarioItemIcons` (non couvert par mon filtre
  local) exige une entrée `ITEM_ICON_REGISTRY`/SVG chargeable par item — les 5
  neufs n'avaient qu'un emoji. Mappés sur PNG génériques existants
  (`item-icons.js`), patron déjà utilisé par ~30 items. `item-icons.js` v49→50,
  `CACHE_VERSION` v254→v255. `scenarioItemIcons` re-vert (215/215 mappés).
  Leçon : lancer `ItemIcons` (ou le smoke complet) lors de tout ajout d'item.
