# Plan — Easter egg : les pages oubliées de Sandrine

> Statut : **proposition** (non implémenté). Suite directe de
> [`manon-grimoire-pages.md`](./manon-grimoire-pages.md) §9 (« 2ᵉ quête
> épique, à concevoir séparément ») et du correctif de bug ci-dessous.

## 0. Contexte & correctif préalable (livré)

Bug corrigé en amont de ce plan : après la fusion du grimoire
(`fuseGrimoire`), `pagePlacements` / `revealedPages` n'étaient pas
purgés ; la besace `player.grimoirePages` vidée ne protégeait plus
`_tryCollectPage`, si bien que les **5 mêmes pages** redevenaient
fouillables à leur ancien emplacement. `fuseGrimoire` purge désormais
les deux structures (`.clear()`) + `renderMinimap()`. Couvert par
`scenarioGrimoirePages` T8 (`placementsCleared`, `recollect`).

> Constat utilisateur à l'origine de cet egg : *« re-trouver les mêmes
> pages n'a pas de sens ; en revanche, que ce soient d'**autres** pages
> qui débloquent un nouveau sort ou un bonus passif, l'idée est
> intéressante comme easter egg. »*

## 1. Prémisse narrative

Le grimoire reconstitué n'était pas tout à fait complet. En l'ouvrant
« les soirs de gel » (cf. `idleRandom` post-Acte II), Manon découvre des
**renvois en marge** vers des feuillets qu'elle ne possède pas : des
pages que Sandrine avait jugées trop dangereuses pour les laisser avec
les autres, dispersées **plus profond** dans le château (la Boucle
Ténébreuse, étages 11+). Pas une quête au journal : un **secret** qu'on
ne trouve qu'en cherchant — l'esprit d'un easter egg.

> Ton : aucune flèche, aucune quête imposée. Au mieux un **murmure** :
> une réplique `idleRandom` de Manon et/ou un fantôme lore qui évoque
> « des pages plus noires, écrites les nuits où le froid faisait mal ».

## 2. Décisions à acter (⚠️ à valider avant implémentation)

| Sujet | Options | Reco |
|-------|---------|------|
| **Récompense** | (A) **nouveau sort** exclusif ; (B) **bonus passif** permanent | **(B)** — voir §4 |
| Nb de pages | 3 (resserré, post-game) ou 5 (symétrie Acte II) | **3** |
| Étages porteurs | Boucle Ténébreuse : 11, 13, 15 (post-`victoryAchieved`) | 11/13/15 |
| Gate d'activation | `completedQuests.has('manon_grimoire')` **et** `victoryAchieved` | les deux |
| Révélation | Revelio (déjà appris en Acte II) — réemploi strict | oui |
| Remise | Second passage à l'établi de Manon (`open_fusion` étendu) ou auto à la 3ᵉ page | **établi** |
| Indice | 1 réplique `idleRandom` Manon + variante fantôme | oui, discret |

### Option A — nouveau sort exclusif
Ajouter un sort `SPELLS` (ex. **« Requiem de Givre »** : AoE glace
supérieure à Glacius Tempête, ou mono-cible à fort burst + `gel`
renforcé). Enseigné aux deux héros à la remise (comme `grantsSpell` de
groupe). Logo PNG dédié (`tools/`).
- ➕ Récompense tangible, lisible.
- ➖ Risque d'**équilibrage** (le jeu a déjà Glacius Tempête en tête du
  classement AoE, cf. `tools/sim-aoe.js`) ; nécessite un passage sim.

### Option B — bonus passif permanent (**recommandé**)
**« Héritage de givre »** : affinité froide héritée de Sandrine.
- Implémentation : flag sérialisé `frostHeritage` (state.js), lu par
  `_spellElementalDamage` / `_spellLifesteal` / `_spellCurse`
  (battle-spells.js) → sorts d'élément `"glace"` ×(1 + `FROST_HERITAGE_MULT`)
  **et** statut `gel` +1 tour. Constante `FROST_HERITAGE_MULT` (data.js).
- Affichage : ligne dans `char-stats-panel` (ui-character-sheet.js) +
  badge à la remise.
- ➕ Narrativement juste (« un geste que je tiens d'elle »), pas de
  nouveau sort à équilibrer, surface de code réduite.
- ➖ Moins « spectaculaire » qu'un sort ; passif diffus.

> Choix par défaut de ce plan : **Option B**. Bascule possible vers A
> sur décision utilisateur (le squelette §3 est commun).

## 3. Architecture — réemploi maximal de l'Acte II

Pour éviter toute collision avec les données purgées de l'Acte II,
**structures parallèles dédiées** (mêmes patterns, préfixe `lost`) :

| Élément | Acte II (existant) | Easter egg (nouveau) |
|---------|--------------------|----------------------|
| Données pages | `GRIMOIRE_PAGES` (data.js) | `LOST_GRIMOIRE_PAGES` (data.js), floors 11/13/15 |
| Étages dérivés | `PAGE_FLOORS` | `LOST_PAGE_FLOORS` |
| Placement | `pagePlacements` Map | `lostPagePlacements` Map |
| Révélation | `revealedPages` Set | `revealedLostPages` Set |
| Besace | `player.grimoirePages` | `player.lostGrimoirePages` |
| Pose | `_ensurePagePlacement` | `_ensureLostPagePlacement` (même seed, gate §2) |
| Ramassage | `_tryCollectPage` | `_tryCollectLostPage` (appelé dans `searchRoom`) |
| Reveal hook | bloc `reveal` (inventory-spells.js) | même bloc, ajoute `revealedLostPages` |
| Minimap | `.map-page` | `.map-page` réutilisé (ou `.map-page-lost`) |
| Remise | `openFusionModal`/`fuseGrimoire` | `openLostFusionModal`/`fuseLostGrimoire` |
| Persistance | `_serializeState`/`_applyState` | idem (3 nouvelles clés) |
| Reset partie | `startGame` | idem |
| **Purge à la remise** | `.clear()` (correctif) | **idem dès le départ** (leçon retenue) |

> Alternative envisagée : **généraliser** le mécanisme existant pour
> porter plusieurs jeux de pages (clé composite `set:floor`). Écartée
> pour la V1 : plus invasif sur du code stabilisé/testé. Les structures
> parallèles sont du copier-adapter à bas risque.

## 4. Gate d'activation (cœur de l'« easter egg »)

`_ensureLostPagePlacement(floor)` ne pose une page que si **toutes** ces
conditions sont vraies :
1. `LOST_PAGE_FLOORS.includes(floor)` ;
2. `typeof completedQuests !== 'undefined' && completedQuests.has('manon_grimoire')` ;
3. `victoryAchieved` (Boucle Ténébreuse atteinte) ;
4. page non déjà collectée (`!player.lostGrimoirePages.includes(id)`).

Aucune entrée au journal de quêtes — la découverte passe par Revelio +
curiosité. Hook de pose : `generateDungeon` **et**
`_restoreFloorFromCache` (comme l'Acte II), sinon les pages
n'apparaissent pas sur les étages déjà en cache.

## 5. Découpage en phases (verify)

1. **Données & gate** — `LOST_GRIMOIRE_PAGES` + `LOST_PAGE_FLOORS`
   (data.js) ; `lostPagePlacements`/`revealedLostPages`/
   `player.lostGrimoirePages` (state.js) ; `_ensureLostPagePlacement`
   (dungeon.js + hook cache) gardé par §4.
   → verify : test placement posé **seulement** si `manon_grimoire`
   complété **et** `victoryAchieved`, sinon absent.
2. **Révélation & ramassage** — extension du bloc `reveal`
   (inventory-spells.js) ; `_tryCollectLostPage` dans `searchRoom` ;
   marqueur minimap.
   → verify : Revelio révèle, fouille ramasse, pas de doublon.
3. **Récompense** — (B) `frostHeritage` + `FROST_HERITAGE_MULT`, lu par
   battle-spells.js, ligne fiche perso ; **ou** (A) sort + logo + sim.
   → verify : sort glace amplifié (B) / sort appris (A) après la 3ᵉ page.
4. **Remise & purge** — `openLostFusionModal`/`fuseLostGrimoire`
   (établi Manon étendu) : applique la récompense **et** purge
   `lostPagePlacements`/`revealedLostPages` (`.clear()`) +
   `player.lostGrimoirePages = []`.
   → verify : récompense une seule fois, pages non re-ramassables
   (régression jumelle du bug corrigé).
5. **Indices discrets** — 1 `idleRandom` Manon + 1 variante fantôme
   (`_pageHintLine` style) gardées par la gate §4.
   → verify : indice présent post-game seulement, absent avant.
6. **Persistance & reset** — 3 clés dans `_serializeState`/`_applyState`
   (avec `frostHeritage` si B) ; reset dans `startGame`.
   → verify : round-trip save conserve placements/révélations/besace/
   récompense ; nouvelle partie repart à zéro.
7. **Smoke** — nouveau `scenarioLostGrimoirePages` (calqué sur
   `scenarioGrimoirePages`) couvrant gate, ramassage, récompense,
   purge, save.
   → verify : `node tests/smoke.js` vert.

## 6. Hors-scope

- Cue 3D des pages (cohérent avec V1 Acte II : minimap seule).
- Indices ailleurs que Manon / fantômes lore.
- Option A **et** B simultanées — on tranche une seule récompense.

## Suivi
- [x] Bug « pages re-fouillables après fusion » corrigé (clear + T8).
- [ ] §2 — décisions à valider (récompense A/B, nb pages, étages).
- [ ] Phases 1-7 — à implémenter après arbitrage §2.
