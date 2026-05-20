# Plan — HUD compact + Party-bar V3 + Maison interactive

Référence visuelle : `.claude/mockups/hud-duo-v3.png`.

## Périmètre

1. **Header compact** — ligne unique : `⌂ ÉT.X · {location} · ⦿ {gold} · {blason A.1}`.
2. **Blason vivant (A.1)** — anneau doré radial (= XP du palier en cours)
   + ruban tier `OR`/`ARG`/`BRZ`/`PLT`. Tap → popup A.3.
3. **Party-bar V3** — `.party-card` refondue : portrait en demi-fond gauche
   (V3), contenu droit minimal : nom · Niv · HP · MP · XP.
4. **Modale `#house-detail-modal` (A.3)** — popup détaillée : blason grand
   + barre progression + liste paliers (✓ atteints / ► courant / à venir)
   + section « récompenses en attente » alimentée par `pendingHouseRewards`.
5. **Suppression** : `#xp-container` séparé, panneau tier-card en bandeau
   gauche (rapatrié dans header + popup).

Données : tout existe déjà (`housePoints`, `houseTier`, `HOUSE_BONUSES`,
`pendingHouseRewards`, `player.xp` / `player.xpNext`). Aucun nouvel état.

## Fichiers touchés

| Fichier | Modif |
|---------|-------|
| `index.html` | restructure `.game-header`, refactor `.left-panel` → `.party-bar`, ajoute `#house-detail-modal` |
| `css/style.css` | nouvelles classes (`crest-*`, `pcard-bg/-veil/-content`, `bar`, `bar-fill.xp`…), refactor `.party-card`, supprime `#xp-container` |
| `js/ui.js` | `_updateHouseBadge()` recalcule l'anneau, nouveau `_renderPartyCard()`, nouveau `openHouseDetail()` |
| `js/loader.js` | ajoute `openHouseDetail` au MANIFEST |
| `index.html` (cache-bust) | `style.css?v=8` → `?v=9` |
| `tests/smoke.js` | 3 assertions (blason existe, XP-bar dans `.party-card`, popup maison s'ouvre) |

## Étapes

### P1 — Header compact + blason vivant
1. `index.html` : restructure `.game-header` (ajoute étage, déplace blason du `.left-panel`).
2. CSS : `.ghd-floor`, `.ghd-loc` (ellipsis), `.ghd-gold`, `.crest-wrap`, `.crest-ring` (conic-gradient pilotée par var CSS), `.crest-ring-inner`, `.crest-tier`.
3. `_updateHouseBadge()` : calcule % XP courant du palier → `--crest-ratio` (custom property) appliquée sur `.crest-ring` ; choisit le ruban (`OR`/`ARG`/`BRZ`/`PLT`).
4. **Vérif** : changer `housePoints` en console → l'anneau bouge ; le ruban suit le `houseTier`.

### P2 — Party-bar V3 (portrait BG)
1. `index.html` : `.left-panel` → `.party-bar` (HTML simplifié, 2 `.party-card` ou 1 selon `partySize`).
2. CSS : `.party-card` refactorisée — `.pcard-bg` (background-image:url) + `.pcard-veil` (gradient noir 0→44 %→100 %) + `.pcard-content` (padding-left 46 %).
3. `_renderPartyCard(charIdx)` (nouveau) : produit le HTML d'une carte. Appelée depuis `updateUI()` pour i=0..partySize-1.
4. Mobile (`≤700px`) : 2 cartes en row 50/50. Desktop : cartes empilées en sidebar 200 px (même style portrait BG).
5. **Vérif** : capture Playwright à 375 px et 1280 px, comparée au mockup.

### P3 — XP rapatriée
1. Supprime `#xp-container` du HTML + sa CSS.
2. Ajoute `<div class="bar xp-row">` en bas du `.pcard-content` (sous PV/PM).
3. JS : utilise `player.xp` / `player.xpNext` (partagé → même valeur sur les 2 cartes).
4. **Vérif** : la barre XP avance à l'XP gain ; identique sur les 2 cartes en duo.

### P4 — Popup Maison (A.3)
1. `index.html` : nouveau `#house-detail-modal` avec `.modal-box` standard.
2. `openHouseDetail()` (`ui.js`) : peuple contenu — blason grand, tier courant, barre progression, liste `HOUSE_BONUSES[chosenHouse].tiers[]` avec icône `✓`/`►`/`·`, section récompenses en attente (`pendingHouseRewards` filtré par Maison).
3. `closeModal('house-detail-modal')` réutilisé (helper existant).
4. Câblage : `onclick="openHouseDetail()"` sur `.crest-wrap`.
5. `loader.js` : ajoute `openHouseDetail` au MANIFEST.
6. **Vérif** : tap blason → modale apparaît, 4 paliers listés (Bronze/Argent/Or/Légendaire), tier courant marqué ►.

### P5 — Tests smoke
1. `getComputedStyle('.crest-ring').background` contient `conic-gradient`.
2. `.party-card .bar.xp-row` existe et `.bar-fill.xp` a une `width > 0`.
3. `openHouseDetail()` → `#house-detail-modal` display:flex, contient ≥ 4 lignes paliers.

### P6 — Cache-bust
1. `style.css?v=8` → `?v=9`.

## Hors-scope

- Génération de `harry-original.png` / `hermione-original.png` (sans médaillon). Le mockup utilise les médaillons existants — acceptable pour shipper. Amélioration possible plus tard.
- Tap-sur-carte-party pour switcher `currentBattleChar` en combat.
- Animation de transition de l'anneau XP au level-up.
- Migration des autres usages de `#xp-container` (devraient être nuls, à vérifier au passage).

## Risques

| Risque | Mitigation |
|--------|------------|
| Régression du re-render fréquent en combat | `_renderPartyCard()` ne recrée le DOM que si le perso a changé ; sinon update des barres seulement |
| Sidebar 200 px trop étroit pour V3 | Vérif : portrait 50 % = 100 px, content 50 % = 100 px. OK pour Niv/HP/MP/XP en petite police |
| Solo : carte 2 cachée | `.party-bar .pcard:nth-child(2) { display: none }` quand `partySize===1` (déjà piloté via `.party-card.hidden` ou via JS) |
| Anneau conic-gradient mal supporté | Fallback : `background: linear-gradient(...)` linéaire si conic indispo (rare en 2026) |

## Vérification finale

- `node tests/smoke.js` vert.
- Capture Playwright mobile 375×800 comparée à `hud-duo-v3.png`.
- Capture desktop 1280×800 — pas de régression de la sidebar.
- Test manuel sur la branche en navigation privée.

## Suivi

- [x] P1 — header compact + blason vivant ✓
- [x] P2 — party-bar V3 portrait BG ✓ (`.pcard-bg` + `.pcard-veil` + `.pcard-content`)
- [ ] P3 — XP rapatriée
- [ ] P4 — popup maison
- [x] P5 — smoke tests (P1+P2 couverts dans scénario 8)
- [x] P6 — cache-bust (`?v=9 → ?v=10` pour P2)
