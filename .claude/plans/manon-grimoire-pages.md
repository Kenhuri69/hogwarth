# Plan — Manon Acte II : le grimoire de givre éparpillé

> Statut : **conception finalisée** — prémisse validée, derniers points
> ouverts tranchés. Prêt pour le découpage en phases (§8).

## 1. Prémisse narrative (à valider)

Suite directe de l'arc de Manon Aubin (PNJ étage 3, fille cachée de
Lupin). L'Acte I (`manon_secret` → `manon_pardon`) refermait la quête du
**père**. L'Acte II ouvre celle de la **mère**, Sandrine.

Proposition de prémisse :

> Dans la doublure de la malle de Sandrine, Manon n'a pas trouvé que la
> photographie : il y avait aussi un **grimoire déchiré**, pages
> arrachées et manquantes. C'était l'œuvre de sa mère — Sandrine était
> une sorcière douée pour la magie de givre. Mais Manon ne sait pas si
> ce grimoire est un vrai héritage ou une dernière mise en scène : sa
> mère a menti seize ans, alors **le vrai du faux**, elle ne sait plus.
> Lupin lui a appris **Revelio**, le charme qui dévoile ce qui est
> caché ; elle l'enseigne au héros pour l'aider à retrouver les pages.
> Sandrine, avant de mourir, les a dispersées et dissimulées par
> sortilège dans le château — comme elle avait cousu la photo dans la
> malle : *une vérité qu'il faut mériter de trouver.* Reconstituer le
> grimoire, c'est rendre à Manon la mère qu'elle n'a jamais connue —
> non la menteuse, mais la sorcière.

Cohérent avec le motif établi (« sa dernière ruse », « cousu la vérité
pour qu'elle bute dessus »). Le grimoire reconstitué = **Glacius
Tempête** (l'AoE la plus puissante du jeu, cf. `tools/sim-aoe.js` :
total ×3 de 78/93/129, en tête du classement).

**Décisions prises :**
- Sandrine reçoit la **spécialité givre** (invention assumée — elle
  n'avait aucune spécialité magique décrite jusqu'ici). L'épithète
  givre/froid double le motif de la mère distante.

## 2. Décisions déjà actées (échanges précédents)

| Sujet | Décision |
|-------|----------|
| Grimoire cible | Glacius Tempête (le plus puissant — sim-aoe.js) |
| Mécanisme pages | Reliques fixes **invisibles** ; sort hors-combat révèle la case (point vert) ; `fouiller` ramasse |
| Sort de révélation | **Revelio**, enseigné par une quête préambule de Manon |
| Nombre de pages | **5**, une par étage : **2, 3, 5, 7, 9** (arbitré) |
| Indices fantômes | Les PNJ lore aléatoires lâchent une réplique-blague pointant l'étage d'une page non collectée (voir §7b) |
| Fusion | **Hébergée par Manon** (PNJ donneur), UI inspirée de la besace |
| Revelio — coût | 1-2 PM (bon marché) |
| Revelio — hors combat | Révèle le brouillard sur ~2 cases ; une page dans la zone éclaircie apparaît en point vert sur la minimap |
| Revelio — en combat | Révèle d'un coup le panneau d'info du monstre ciblé ; consomme le tour + le PM (voir §4b) |
| Sandrine — magie | Spécialité **givre** (acté) |
| Logo du sort | PNG dédié `img/icons/spells/revelio.png` à générer |

> **Rebase effectué (2026-05-18).** La branche a été rebasée sur `master` :
> elle intègre désormais le PR #190 « panneau d'info monstre en combat ».
> Le système de connaissance que le volet combat de Revelio doit
> contourner **existe déjà** — rien à construire, juste un bypass.

## 3. Structure des quêtes (Manon — Acte II)

Deux volets chaînés, après `manon_pardon` (`prereq`).

### 3a. Préambule — `manon_revelio` « Le vrai du faux »
- `prereq: "manon_pardon"`.
- Manon montre le grimoire déchiré, explique. Pour « accorder » le
  charme Revelio il lui faut un catalyseur de froid.
- Objectif : `kill` d'un monstre de givre proche de l'étage 3
  (candidat : `strangulot` ou `kappa_douves`) ×1.
- Récompense : `spell: "Revelio"` + `xp`/`gold`. Débloque `manon_grimoire`.
- Revelio est donc disponible **dès la fin du préambule**, avant le
  volet de collecte — c'est voulu.

### 3b. Collecte — `manon_grimoire` « Les pages de Sandrine »
- `prereq: "manon_revelio"`.
- Objectif : réunir les **5 pages** (suivi via `collectedPages`, cf.
  §5 — pas d'items qui encombrent le sac).
- `desc` indique les **étages porteurs** : 2, 3, 5, 7, 9.
- Remise : parler à Manon avec les 5 pages → ouvre l'**établi de
  fusion** (§6) → grimoire `livre_glacius_tempete` recréé.
- Récompense : `item: "livre_glacius_tempete"` + `xp`/`gold` (+ stats ?).

## 4. Sort Revelio

Sort acquis par la quête `manon_revelio` (§3a). Coût **1-2 PM**.
Double usage selon le contexte. Logo PNG dédié à générer
(`tools/gen_*` → `img/icons/spells/revelio.png` + `SPELL_ICON_REGISTRY`).

### 4a. Hors combat — révélation du donjon
- `data.js — SPELLS` : entrée
  `{ name:"Revelio", effect:"reveal", cost:2, element:"lumière",
     icon:"🔎", desc:"Dissipe le brouillard alentour et dévoile les
     pages dissimulées." }`.
- `inventory.js` :
  - `isOutOfCombatSpell` → ajouter `effect === 'reveal'`.
  - `SPELL_OOC_HANDLERS.reveal` → débite le PM, **dissipe le brouillard
    sur ~2 cases** autour du joueur ; si une page non collectée tombe
    dans la zone éclaircie → l'ajoute à `revealedPages` (point vert
    minimap). Message selon le résultat.
- La page ne se montre que via la minimap (pas de cue 3D — décidé V1).

### 4b. En combat — révélation du monstre
- Master fournit déjà `showMonsterCombatInfo(idx)` avec gating
  `MONSTER_INFO_TIERS = { stats:1, weakness:3, deep:5 }` sur
  `monsterKills[id]` (PR #190).
- Revelio lancé en combat sur un ennemi → **ouvre son panneau d'info
  avec les 3 paliers déverrouillés**, quel que soit `monsterKills`.
  Implémentation : `showMonsterCombatInfo(idx, { revealed:true })` — le
  flag force `kills` au-delà de `deep` pour ce rendu (aucun monstre
  n'est modifié, juste l'affichage).
- `castSpellInBattle` route `effect:"reveal"` vers ce panneau au lieu
  d'un calcul de dégâts. **Acté : consomme le tour + le PM**, comme un
  sort utilitaire.

## 5. Pages dans le donjon

Approche **sans nouveau type de cellule** (plus chirurgical que
`CELL.PAGE` ; précédent : `npcPlacements`) :

| Élément | Détail |
|---------|--------|
| `pagePlacements` | `Map<floor, {x,y}>` — position déterministe (seed par étage), sur les 5 étages porteurs |
| `revealedPages` | `Set` de clés `"floor:x,y"` — pages rendues visibles par Revelio |
| `collectedPages` | `Set` des étages dont la page est ramassée (taille = progression quête) |
| Révélation | Revelio (§4a) dissipe le brouillard sur ~2 cases ; toute page de la zone éclaircie passe dans `revealedPages` |
| Visuel | Point **vert** sur la minimap à la case révélée. **Pas de cue 3D** (décidé V1) |
| Ramassage | `movement.js — searchRoom()` : si la case courante == page révélée non collectée → ajoute à `collectedPages`, son `playChestOpen`, message, `checkPageQuest()` |
| Garde | Pages actives uniquement si `manon_revelio` rendu et `manon_grimoire` non terminé |
| Persistance | `pagePlacements` / `revealedPages` / `collectedPages` sérialisés dans `_serializeState`/`_applyState` |

`quests.js` : `checkPageQuest()` (analogue à `checkKillQuests`) met à
jour la progression de `manon_grimoire` sur `collectedPages.size`.
Nouvel objectif `type:"pages"` dans le moteur de quêtes (petit ajout).

## 6. Établi de fusion (hébergé par Manon)

- `npcs.js` : Manon reçoit une `specialAction`
  `{ id:"manon_fusion_grimoire", label:"Reconstituer le grimoire" }`,
  proposée quand `collectedPages.size === 5`.
- `triggerNpcSpecialAction` → ouvre un overlay **établi** : 5 emplacements
  de page qui se remplissent, bouton « Fusionner ». UI légère calquée
  sur la besace/concoction (pas de modale lourde).
- Fusion : vide `collectedPages`, ajoute `livre_glacius_tempete` au sac,
  complète `manon_grimoire`, animation + `playLevelUp`.

## 7. Dialogues Manon Acte II (`npcs.js`)

- `questsGiven` / `questsTurnedIn` : ajouter `manon_revelio`,
  `manon_grimoire`.
- `dialoguesByQuest` : blocs `questOffer` / `questActive` / `questReady`
  pour les deux quêtes, dans la voix établie de Manon.
- `idleRandom` post-Acte II : 1-2 répliques sur le grimoire reconstitué.

## 7b. Indices des fantômes (PNJ lore aléatoires)

Les PNJ lore aléatoires (`getRandomLoreForFloor` dans `npcs.js`,
`marker:'lore'`, sprite `fantome`) servent d'**indices doux** : ils
ont vu une page traîner et le mentionnent — sur le ton de la blague,
jamais la position exacte, juste l'étage.

| Élément | Détail |
|---------|--------|
| Déclencheur | Dialogue actif **seulement** si `manon_revelio` rendu et `manon_grimoire` en cours (même garde que les pages, §5) |
| Contenu | Une ligne `idleRandom` qui nomme l'étage d'**une page encore non collectée** + une petite blague de fantôme |
| Ciblage de l'étage | Au moment d'ouvrir le dialogue : prendre un étage de `pagePlacements` absent de `collectedPages` ; piocher la réplique correspondante. Si tout est collecté → la ligne d'indice ne s'affiche pas (repli sur le lore normal) |
| Implémentation | Helper `_pageHintLine(floor)` (npcs.js) qui renvoie un texte paramétré ; injecté dans le pool `idleRandom` du PNJ lore par `getRandomLoreForFloor` quand la garde est vraie |
| Ton | Voix de fantôme : désinvolte, légèrement moqueur. Ex. : *« J'ai vu un bout de parchemin gribouillé de givre traîner au {étage}ᵉ. Je l'aurais bien ramassé… mais, tu sais, les mains. »* |

- Pas de garantie d'apparition : c'est un coup de pouce ambiant, pas un
  marqueur de quête. Revelio reste le moyen fiable de localiser la case.
- Prévoir **3-4 variantes de blague** réparties pour éviter la
  répétition (sélection seedée par étage, cohérente avec le reste des
  PNJ aléatoires).

## 8. Découpage en phases (verify)

1. **Narratif & données** — prémisse validée ; SPELLS Revelio ;
   2 quêtes dans `quests.js`/`state.js` ; dialogues Manon.
   verify : `node tests/smoke.js` vert (chargement).
2. **Revelio — sort + logo** — entrée SPELLS, `isOutOfCombatSpell` +
   handler `reveal` (dissipe le brouillard ~2 cases), bypass combat
   via `showMonsterCombatInfo`, PNG du logo + `SPELL_ICON_REGISTRY`.
   verify : Revelio hors combat dissipe le fog ; en combat ouvre le
   panneau monstre complet à 0 kill.
3. **Pages donjon** — `pagePlacements`/`revealedPages`/`collectedPages`,
   seed, hook `searchRoom`, marqueur minimap, persistance save.
   verify : révéler + fouiller une page → `collectedPages` grandit,
   survit à une sauvegarde/chargement.
4. **Quête pages** — objectif `type:"pages"`, `checkPageQuest`.
   verify : 5 pages → `manon_grimoire` passe `completable`.
5. **Indices fantômes** — `_pageHintLine` + injection conditionnelle
   dans `idleRandom` des PNJ lore (§7b).
   verify : avec `manon_grimoire` en cours, un fantôme lore peut citer
   l'étage d'une page non collectée ; aucune ligne d'indice une fois
   les 5 pages prises.
6. **Établi de fusion** — `specialAction` Manon + overlay + recette.
   verify : fusion → grimoire au sac, quête complétée.
7. **Smoke test** — scénario dédié `scenarioManonGrimoire` (préambule →
   Revelio → 5 pages → fusion). Suite complète verte.

## 9. Hors-scope V1

- La **2ᵉ quête « épique »** d'obtention d'un autre grimoire — à
  concevoir séparément (déjà annoncée « à discuter plus tard »).
- Cue 3D de la page révélée (au-delà de la minimap) — décidé : non.
- Revelio comme sort d'utilité générale (révéler coffres/passages) —
  reste cantonné aux pages pour cette V1.

## Suivi
- [x] Phase 0 — prémisse narrative (§1) validée par l'utilisateur.
- [x] Rebase de la branche sur `master` (intègre le PR #190).
- [x] Étages porteurs des 5 pages arbitrés : 2, 3, 5, 7, 9.
- [x] Indices fantômes ajoutés au design (§7b).
