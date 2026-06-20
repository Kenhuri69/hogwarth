# Items invendables/non-supprimables — Dissolution à la Forge + anti-doublon

## Problème (rapporté)
En endgame, un joueur se retrouve avec des items **invendables ET non jetables**
qui saturent le sac (ex. deux « Bâton Ancestral de Rowena »). Impasse
irréductible.

## Cause racine (diagnostic confirmé)
1. **Invendable** : les récompenses de Maison / premiums ont `price:0` dans
   `data.js`. L'onglet Vendre filtre `item.price > 0` (`shop.js:472`) → exclus.
   Ce n'est PAS la rareté `legendary` qui bloque, c'est `price === 0`.
2. **Non-jetable** : aucune action « jeter/détruire » exposée à l'UI
   (`inventory.js` ne câble que `useItem`).
3. **Doublon** : la remise `claim_house_reward` (`npc-dialog.js:654`) et le push
   du premium de quête signature (`quests.js:721`) n'appellent jamais
   `_ownsItemId`. `tryAddItem` ne déduplique pas les équipables. Un item
   re-tombé dans `pendingHouseRewards` (migration de save, quête re-validée…)
   est re-remis → doublon coincé.

## Solution retenue (choix utilisateur : recycler en Essence à la Forge)

### Volet 1 — Tarir la source (le vrai bug, anti-doublon)
- **`npc-dialog.js` (claim_house_reward)** : avant `tryAddItem`, si l'item est
  non-empilable et déjà possédé (`_ownsItemId`), le retirer de
  `pendingHouseRewards` sans le re-remettre (garde catch-all robuste).
  → verify : un unique déjà possédé n'est jamais doublé à la remise.
- **`quests.js` (push premium signature)** : ne pousser dans
  `pendingHouseRewards` que si non déjà possédé (`!_ownsItemId(premId)`) →
  évite la file + le message « met de côté » trompeur.
  → verify : re-compléter une quête signature ne re-queue pas un premium possédé.

### Volet 2 — Porte de sortie : Dissolution à la Forge
La Forge des Ténèbres (endgame, là où les items se cumulent) reçoit une
section « ♻️ Dissoudre une relique du sac → Essence ». Transforme l'impasse
en ressource de forge (boucle endgame cohérente).

- **`forge.js`** :
  - `DISSOLVE_YIELD` (par rareté) : common/uncommon → 1🌑 ; rare → 2🌑 ;
    epic → 3🌑 +1🔮 ; legendary → 4🌑 +2🔮.
  - `_isDissolvable(item)` : équipement non-empilable du sac
    (type wand/armor/acc/trinket ou possédant un `slot`). Exclut
    consommables/matériaux/herbes/quête. Les livres de sort sont vendables →
    hors scope.
  - `dissolveItemAtForge(idx)` : confirm() → `_removeInvItem` → octroi
    matériau(x) via `tryAddItem` → addMsg + son + re-render `openForge`.
  - `openForge()` : append une section dissolution (lignes du sac
    dissolvables) après la liste des équipements.
- **`loader.js`** : ajouter `dissolveItemAtForge` au MANIFEST.
- **`index.html`** : mention dans `#forge-hint` (optionnel) + bumps `?v`.

### Vérifications
- `node tests/smoke.js` (+ scénario dédié dissolution : item price:0 au sac →
  dissous → Essence gagnée, item retiré).
- Cache PWA bumpé (forge.js, npc-dialog.js, quests.js, loader.js) via skill
  `cache-bump` + `node tools/check_cache_versions.js --base origin/master`.

## Hors-scope
- Action « jeter » générique (footgun) — écartée.
- Rendre les légendaires vendables — écartée (thématiquement étrange).
- Migration rétroactive auto des saves — non requise : la dissolution suffit
  à nettoyer les doublons existants, et le volet 1 stoppe les nouveaux.

## Suivi
- [x] Volet 1 npc-dialog.js — garde `_ownsItemId` catch-all à la remise
- [x] Volet 1 quests.js — pas de re-queue si premium déjà possédé
- [x] Volet 2 forge.js — `DISSOLVE_YIELD`, `_isDissolvable`, `dissolveItemAtForge`, rendu
- [x] loader.js MANIFEST — `dissolveItemAtForge`
- [x] css/style.css — `.forge-dissolve-section`
- [x] index.html hint + bumps ?v
- [x] scénario smoke `scenarioForgeDissolve` (tests/scenarios/inventory.js)
- [x] units 686 ✓ · smoke 228 ✓ · cache-bump ✓ (CACHE_VERSION v165) · pwa-smoke ✓

## Résultat
Implémenté. Forge endgame : section « ♻️ Dissoudre une relique du sac →
Essence » (epic→3🌑+1🔮, legendary→4🌑+2🔮). Volet 1 empêche tout nouveau
doublon de récompense de Maison. Le doublon de Bâton de Rowena existant se
dissout en 1 Essence Primordiale.
