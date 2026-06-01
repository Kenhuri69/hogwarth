# Plan — Manon Acte III : les feuillets clairs d'Élara

> Statut : **proposition** (non implémenté). Suite de
> [`manon-grimoire-pages.md`](./manon-grimoire-pages.md) (Acte II) et du
> correctif de bug ci-dessous. Remplace l'ancienne ébauche « easter egg
> de pages oubliées » (§9 de l'Acte II) — direction retenue avec
> l'utilisateur : **un vrai Acte III lumineux, mais déclenché à la
> manière d'un easter egg** (rumeurs, pas de quête imposée d'emblée).

## 0. Contexte & correctif préalable (livré)

Après la fusion de l'Acte II (`fuseGrimoire`), `pagePlacements` /
`revealedPages` n'étaient pas purgés : la besace `player.grimoirePages`
vidée ne protégeait plus `_tryCollectPage`, si bien que les **5 mêmes
pages** redevenaient fouillables. `fuseGrimoire` purge désormais les deux
structures (`.clear()`) + `renderMinimap()`. Couvert par
`scenarioGrimoirePages` T8 (`placementsCleared`, `recollect`).

> Ces structures purgées sont **réutilisables** pour l'Acte III (§4) :
> au moment où l'Acte III démarre, l'Acte II les a déjà libérées.

## 1. Principe : easter egg → quête (le cœur du design)

Trois temps, du plus diffus au plus explicite :

```
(a) RUMEURS         (b) DÉCOUVERTE             (c) QUÊTE ACTE III
PNJ lore + Manon  →  trouver 1 feuillet     →  Manon ouvre la quête
évoquent des         (Revelio + fouille,       formelle : réunir les
feuillets clairs     gate post-Acte II)        autres + établi + remise
PAS de quête         convertit l'egg en        vision LUMINEUSE
au journal           quête (acceptQuest)        + récompense
```

- **(a) Rumeurs (couche egg).** Aucune entrée au journal. Des PNJ lore
  aléatoires (`sprite:'fantome'`, `marker:'lore'`) et **Manon en
  `idleRandom`** lâchent des indices doux : « le grimoire respire encore,
  comme s'il lui manquait un souffle clair… ». Réemploi strict du
  mécanisme d'indices de l'Acte II (`_pageHintLine` / greffe dans
  `_resolveDialogSource`, cf. Acte II §7b).
- **(b) Découverte.** Les feuillets sont posés dans le donjon (invisibles,
  révélés par Revelio, ramassés en fouillant — exactement comme l'Acte
  II). **Trouver le premier** déclenche `acceptQuest('manon_acte3')` et
  bascule l'expérience en quête suivie. C'est le « clic » de l'easter
  egg : le joueur curieux qui suit les rumeurs est récompensé par
  l'ouverture d'un véritable acte.
- **(c) Quête Acte III.** Dès lors, déroulé classique : objectif
  `type:"pages"` (réunir les feuillets restants), remise à Manon via un
  **établi** (réemploi de `open_fusion`), résolution narrative et
  récompense.

> Pourquoi c'est mieux que l'egg « invisible » initial : la couche
> rumeurs **résout le problème de découvrabilité** (le joueur sait qu'il
> y a quelque chose à chercher) tout en gardant l'esprit egg (rien n'est
> imposé, rien dans le journal tant qu'on n'a pas mordu).

## 2. Prémisse narrative — vision lumineuse

L'Acte II refermait la plaie (« je ne lui en veux plus »). L'Acte III ne
la rouvre pas : il **prolonge l'apaisement**.

> En recopiant le grimoire reconstitué, Manon réalise qu'il manque des
> renvois : non des pages *cachées par peur*, mais des feuillets qu'Élara
> avait **gardés à part — pour elle**. Pas de la magie de survie : des
> sorts de givre **heureux**, ceux qu'on lance pour le plaisir (dessiner
> des fougères sur une vitre, figer une goutte en perle, faire neiger
> dans une pièce un soir de fête). Élara les avait semés dans le château
> « pour que sa fille tombe un jour sur sa joie, pas seulement sur son
> mensonge ». Les réunir, c'est rencontrer la mère **heureuse** — le
> dernier visage qui manquait.

Ton : tendre, lumineux, un brin espiègle (le givre comme jeu). Aucune
menace, aucun « pages plus noires ». Cohérent avec la clôture de l'Acte
II et avec l'`idleRandom` post-Acte II (« le givre, elle l'aimait pour de
vrai »).

## 3. Décisions à acter (⚠️ avant implémentation)

| Sujet | Décision |
|-------|----------|
| **Récompense** | ✅ **(B) passif « Hiver Clair »** (lumineux, léger) — voir §7 |
| Gate de départ | ✅ **`manon_grimoire` complété seul** (pas de `victoryAchieved`) |
| Nb de feuillets | ✅ **3** |
| Étages porteurs | ✅ **2, 6, 9** (lieux « chers » à Élara) |
| Conversion | ✅ trouver **le 1ᵉʳ** feuillet → `acceptQuest('manon_acte3')` |
| Rumeurs | ✅ Manon `idleRandom` + 2-3 PNJ lore (réemploi `_pageHintLine`) |
| Remise | ✅ établi Manon (réemploi `open_fusion`, 2ᵉ recette) |
| Architecture pages | ✅ **réutiliser** les structures Acte II via un sélecteur de set (§4) |

## 4. Architecture — un seul mécanisme, paramétré par « set actif »

Plutôt que dupliquer (`lost*`), on **généralise** le mécanisme de pages
de l'Acte II autour d'un *descripteur de set actif*. Les structures
d'état (`pagePlacements`, `revealedPages`, `player.grimoirePages`) sont
**réutilisées** : l'Acte II les a purgées à sa fusion, l'Acte III les
reprend. À tout instant **un seul** set est vivant (les actes sont
exclusifs dans le temps).

```js
// data.js — 2ᵉ jeu de pages (feuillets clairs)
const ACT3_PAGES = [ {id,name,icon,floor,lore}, … ];   // 3 feuillets

// nouveau sélecteur pur (dungeon.js ou data.js)
function _activePageSet() {
  if (activeQuests.some(q => q.id === 'manon_grimoire'))      return ACT2_SET;   // GRIMOIRE_PAGES
  if (completedQuests.has('manon_grimoire')
      && !completedQuests.has('manon_acte3'))                 return ACT3_SET;   // ACT3_PAGES
  return null;
}
```

Les fonctions existantes deviennent *set-aware* (changement minimal,
défaut = comportement Acte II, couvert par `scenarioGrimoirePages`) :

| Fonction | Adaptation |
|----------|------------|
| `_ensurePagePlacement(floor)` | lit `_activePageSet()` (floors + lookup page) au lieu de `PAGE_FLOORS`/`getGrimoirePageForFloor` en dur |
| `_tryCollectPage()` | idem ; **+** si set Acte III et 1ᵉʳ feuillet ramassé et `manon_acte3` pas encore acceptée → `acceptQuest('manon_acte3')` (conversion egg→quête) |
| bloc `reveal` (inventory-spells.js) | révèle la page du set actif |
| `checkPageQuest()` | recompte sur l'objectif de la quête active du moment |

> Avantage : **zéro duplication d'état**, une seule source de vérité du
> « quelles pages sont en jeu maintenant ». Risque maîtrisé par la suite
> smoke (Acte II reste vert + nouveau scénario Acte III).
> Réserve assumée : on touche des fonctions testées de l'Acte II — d'où
> la règle « défaut inchangé » + non-régression `scenarioGrimoirePages`.

## 5. Couche rumeurs (découverte sans journal)

- **Gate** : `completedQuests.has('manon_grimoire')` **et**
  `!completedQuests.has('manon_acte3')` **et** `manon_acte3` pas encore
  acceptée. Identique à la garde du set Acte III.
- **Manon** (`idleRandom`) : 1-2 répliques ajoutées, du registre « il
  manque un souffle clair au grimoire ». Affichées seulement sous la gate
  (greffe conditionnelle, comme l'Acte II).
- **PNJ lore** (`_pageHintLine` étendu) : 2-3 variantes de rumeur qui
  citent l'**étage** d'un feuillet non collecté (jamais la case). Ton
  espiègle/lumineux pour coller à la prémisse.
- Revelio reste le moyen **fiable** de localiser la case (les rumeurs ne
  donnent que l'étage).

## 6. Conversion egg → quête (`manon_acte3`)

- `quests-templates.js` : nouvelle quête `manon_acte3`
  (`prereq:"manon_grimoire"`), objectif `type:"pages"` ×N, récompense §7,
  `location` = « Étage 3 — auprès de Manon ».
- **Acceptation implicite** : pas de `questOffer` au PNJ d'abord ; c'est
  `_tryCollectPage` (1ᵉʳ feuillet) qui appelle `acceptQuest('manon_acte3')`
  + narratif « Ce feuillet n'a rien d'un secret honteux… Manon doit voir
  ça. » Le feuillet trouvé compte comme 1ʳᵉ progression.
- À partir de là, `dialoguesByQuest.manon_acte3` (`questActive` /
  `questReady`) prend le relais ; l'établi (`open_fusion`, gating étendu)
  sert la remise.

## 7. Établi, remise & récompense

- **Remise** : réemploi de l'établi (`specialAction open_fusion`) — la
  modale `#fusion-modal` affiche les feuillets clairs ; bouton actif
  quand tous réunis. `fuseAct3()` (jumeau de `fuseGrimoire`) :
  `turnInQuestById('manon_acte3')`, applique la récompense, **purge**
  `pagePlacements`/`revealedPages` + `player.grimoirePages = []`
  (leçon du correctif §0), narratif lumineux, `renderMinimap()`.
- **Récompense — ✅ (B) passif « Hiver Clair »** (lumineux, léger ; la
  vraie récompense reste narrative — rencontrer la mère heureuse) :
  - Flag sérialisé `hiverClair` (bool, state.js), posé par `fuseAct3()`.
  - Effet : **hors combat, +1 PM par pas d'exploration** (plafonné
    `spMax`) — le calme de l'hiver clair qui « refait » la magie. Hook :
    `movement.js — _step` (même point que le pas Poufsouffle, mais effet
    distinct : PM seul, +1, non gated). Défensif : `if (hiverClair) …`.
  - Affichage : ligne « ❄️ Hiver Clair » dans `char-stats-panel`
    (ui-character-sheet.js) + badge à la remise.
  - Persistance : `hiverClair` dans `_serializeState`/`_applyState` ;
    reset `false` dans `startGame`.
  > Volontairement **non-méta** : un confort d'exploration lumineux, pas
  > un levier de combat. Pas de passage sim requis.

## 8. Découpage en phases (verify)

1. **Données & sélecteur** — `ACT3_PAGES` (data.js) ; `_activePageSet()` ;
   `_ensurePagePlacement`/`_tryCollectPage`/reveal rendus *set-aware*
   (défaut Acte II inchangé).
   → verify : `scenarioGrimoirePages` **reste vert** ; un test pose une
   page Acte III seulement sous la gate (Acte II fini, Acte III non).
2. **Quête & conversion** — `manon_acte3` (quests-templates) ;
   acceptation implicite dans `_tryCollectPage` ; objectif `type:"pages"`.
   → verify : ramasser le 1ᵉʳ feuillet crée la quête active à progress 1.
3. **Rumeurs** — `idleRandom` Manon + `_pageHintLine` étendu, sous gate.
   → verify : rumeur présente entre Acte II fini et Acte III remis ;
   absente avant/après.
4. **Établi & récompense** — `fuseAct3` + gating établi + récompense (A/B)
   + purge.
   → verify : récompense une seule fois, pages non re-ramassables après
   remise (régression jumelle du bug §0).
5. **Persistance & reset** — réutilise les clés existantes (pas de
   nouvelle structure d'état sauf le flag récompense si B) ; reset
   `startGame`.
   → verify : round-trip save conserve l'état Acte III en cours.
6. **Smoke dédié** — `scenarioGrimoireActe3` (calqué sur l'Acte II) :
   gate, découverte→conversion, collecte, remise, purge, save.
   → verify : `node tests/smoke.js` vert.

## 9. Hors-scope

- Cue 3D des feuillets (minimap seule, cohérent Acte II).
- Récompense « grosse » / méta (volontairement écarté : Acte III =
  charge narrative, pas power-spike).
- Rumeurs hors Manon / PNJ lore (vendeurs, etc.) — possible V2.
- Duplication de structures `lost*` — écartée au profit du sélecteur §4.

## Suivi
- [x] Bug « pages re-fouillables après fusion » corrigé (clear + T8).
- [x] Direction arbitrée : **Acte III lumineux déclenché en mode egg**
      (rumeurs → trouver 1 feuillet → quête Manon).
- [x] §3 — décisions verrouillées : récompense **(B) passif Hiver
      Clair**, gate **dès Acte II fini**, **3** feuillets, étages
      **2/6/9**, sélecteur de set (réemploi structures Acte II).
- [x] **Phase 1** — `ACT3_PAGES`/`ACT3_FLOORS` + `_activePageSet()`
      (data.js) ; `_ensurePagePlacement` (dungeon.js), `_tryCollectPage`
      (movement-interactions.js), bloc reveal (inventory-spells.js) et
      `checkPageQuest` (quests.js) rendus *set-aware* (défaut Acte II
      inchangé — `scenarioGrimoirePages` reste vert).
- [x] **Phase 2** — quête `manon_acte3` (`implicitAccept:true`,
      quests-templates.js) exclue de l'amorce `availableQuests`
      (main.js) ; conversion egg→quête dans `_tryCollectPage`
      (acceptQuest au 1ᵉʳ feuillet).
- [x] **Phase 3** — rumeurs : `_manonAct3Rumor` (idleRandom Manon, sous
      gate egg) + `_pageHintLine`/`_pendingPageHintFloor` set-aware
      (fantômes lore) ; greffe dans `_resolveDialogSource`.
- [x] **Phase 4** — établi : `_grimoireFusionReady`/`openFusionModal`
      set-aware + `fuseAct3()` (turn-in + passif + purge `_purgePageData`) ;
      suppression du bouton générique de remise pour `manon_acte3`.
- [x] **Phase 5** — passif : flag `hiverClair` (state.js), hook `_step`
      (+1 PM/pas, movement.js), ligne « ❄️ Hiver Clair » (char-stats-panel),
      sérialisation (save.js) + reset `startGame` (main.js) ;
      MANIFEST loader mis à jour.
- [x] **Phase 6** — `scenarioGrimoireActe3` (7 cas) ; `node tests/smoke.js`
      **vert** (150 scénarios, Acte II non régressé).
- [ ] **Réserve** — rédaction des dialogues de Manon (rumeurs idleRandom,
      questActive/questReady, scène de remise lumineuse), des feuillets
      (noms/lore) et des indices fantômes Acte III : **provisoires en
      l'état**, à relire/co-écrire avant merge (marqués `Textes
      provisoires` dans le code).
