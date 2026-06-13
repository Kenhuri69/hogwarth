# Salle sur Demande — fix badge boutique + étal premium

## Contexte (bug signalé)

Sur le thème « Marchand » (et « Forge ») de la Salle sur Demande :
1. Le badge/trophée est attribué *silencieusement* (derrière la modale boutique) → le joueur croit ne rien recevoir.
2. La salle n'est **jamais consommée** (`usedRequirementRooms` non marqué) → l'overlay continue de proposer tous les choix.
3. **Exploit** confirmé (`tests/_repro_req.js`) : après la boutique on peut encore choisir Refuge/Loot/Entraînement et cumuler soin + buff + un 2ᵉ trophée dans la même visite.
4. L'étal = boutique normale de l'étage (« options pas folles »).

## Décisions utilisateur

- **Étal premium + remise** : catalogue curé d'objets de meilleure rareté + grimoires + consommables haut de gamme, à **-25 %**.
- **Se fermer (1 choix/visite)** : boutique/forge consomment la salle comme refuge/loot/entraînement.

## Étapes

1. **shop.js — étal premium dédié** → vérif : `openRequirementShop()` ouvre la modale avec un stock curé rare+ à -25 %, ≥2 soins garantis.
   - Nouveau contexte `_shopContext.kind === 'requirement'`, stock `_requirementStock` (éphémère, non sérialisé).
   - `_rollRequirementStock()` : pool premium (rareté rare/epic/legendary, spellbooks, consommables prix ≥40), tri rareté/prix, cap 10 + 2 soins, prix × `REQUIREMENT_SHOP_DISCOUNT` (0.75).
   - `_renderShopHeader` : titre dédié + mention remise. `_renderBuyGrid` : branche `requirement`. `_purchase` : splice générique selon le stock actif.
2. **movement-interactions.js — consommer + badge visible** → vérif : `useRequirementRoom()` boutique/forge marque `usedRequirementRooms`, attribue le trophée AVANT l'ouverture, appelle `openRequirementShop()` pour la boutique.
3. **loader.js** → ajouter `openRequirementShop` au MANIFEST.
4. **tests/scenarios/dungeon.js** → T11 : commerce désormais **consommable** (assertion inversée) + ouverture via `openRequirementShop` sans throw + stock premium remisé + exploit fermé (refuge refusé après boutique).
5. **Cache PWA (§8)** : bump `?v` de `shop.js` et `movement-interactions.js` (index.html + sw.js PRECACHE_URLS) + `CACHE_VERSION`.
6. **Vérif** : `node tests/units.js`, `node tests/smoke.js room`, `node tools/check_cache_versions.js --base origin/master`, `node tools/check_doc_modules.js`.

## Suivi

- [x] Étape 1 — `shop.js` : `openRequirementShop()`, `_rollRequirementStock()` (premium rare+/spellbooks/conso ≥40 G, cap 10 + 2 soins, -25 %), header dédié, branche `requirement` dans `_renderBuyGrid`, splice générique dans `_purchase`.
- [x] Étape 2 — `movement-interactions.js` : boutique/forge consomment `usedRequirementRooms`, trophée attribué AVANT ouverture, boutique → `openRequirementShop()`.
- [x] Étape 3 — `loader.js` : `openRequirementShop` ajouté au MANIFEST.
- [x] Étape 4 — T11 : commerce consommable (assert inversé), `_shopContext.kind==='requirement'`, trophée, stock premium remisé (12 items), exploit refuge fermé. Repro jetable supprimé.
- [x] Étape 5 — bump `shop.js` 12→13, `movement-interactions.js` 15→16, `loader.js` 41→42 (index.html + sw.js), `CACHE_VERSION` v122→v123.
- [x] Étape 6 — `units.js` (549 ✓), `smoke.js` complet (212 ✓), `check_cache_versions.js` ✓, `check_doc_modules.js` ✓, `pwa-smoke.js` ✓.

## Résultat

Bug corrigé : le thème Marchand attribue désormais le badge (visiblement, avant
l'ouverture), ferme la salle pour la visite (plus de cumul de récompenses) et
ouvre un Étal premium curé à -25 % au lieu de la boutique standard.
