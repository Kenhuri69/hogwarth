# Plan — Rationalisation des sources (12 points)

Issu de la revue de code de mai 2026. Chaque point est **proposé**, l'utilisateur
**valide**, puis l'implémentation est faite (1 commit / point, smoke test entre
chaque). Les points sont ordonnés par risque croissant.

> Aucun de ces points n'est un bug : ce sont des refactorings (déduplication,
> code mort, constantes). Objectif : zéro changement de comportement observable.

---

## P1 — loader.js : compléter le MANIFEST

- **Constat** : le `MANIFEST` ne vérifie pas plusieurs globals critiques :
  `writeSlot`/`readSlot`/`deleteSlot`/`migrateLegacyKey` (save.js),
  `openLoadDialog`/`loadSlotAndStart`/`enterStartHub`/`startHubNewGame`
  (save-ui.js), `chooseHouse`/`confirmHeroSelection`/`checkHouseLevelUp`
  (main.js). Une régression de chargement de ces modules passerait inaperçue.
- **Proposition** : ajouter les entrées manquantes au `MANIFEST` (`kind:'fn'`).
- **Risque** : nul (additif, sert au diagnostic).
- **Vérification** : `node tests/smoke.js` scénario 27 (loader) reste vert,
  `__loaderReport.missingCritical === 0`.
- **Statut** : [x] proposé · [x] validé · [x] implémenté (108 globals vérifiés)

## P2 — item-icons.js : purger les entrées legacy mortes — ÉCARTÉ

- **Constat initial** : `ITEM_ICON_REGISTRY` contient ~30 entrées masquées en
  runtime par `ITEM_ICON_NEW_REGISTRY` (priorité 1), supposées « mortes ».
- **Analyse (2026-05-16)** : faux positif. Ces entrées ne sont pas mortes :
  1. **Contrat de test** — `scenarioItemIcons` (tests/smoke.js:2633) exige que
     *chaque* item de `ITEMS[]` ait une entrée dans `ITEM_ICON_REGISTRY`
     (`t1.missing.length === 0`, `t1.mapped === t1.total`) et que tous les PNG
     du registre se chargent. Les purger casserait le smoke test.
  2. **Fallback runtime réel** — elles servent si un PNG painterly `_64.png`
     échoue à charger (cf. commentaire item-icons.js:111-116).
- **Décision** : point écarté. Le gain est nul (simples mappings de chaînes) et
  le risque (casse de la suite de tests) réel.
- **Statut** : [x] proposé · [x] analysé · ❌ écarté (faux positif)

## P3 — renderer-effects.js : supprimer le code mort de drawCellMarker

- **Constat** : `drawCellMarker` n'est appelée que depuis `renderer.js:276`,
  gardée par `fwdCell === CELL.DOOR`. Les branches `SHOP`/`CHEST`/`FOUNTAIN`
  (et tout cas non-DOOR) sont mortes — ces cellules sont rendues en sprites
  ailleurs.
- **Proposition** : retirer les branches non atteignables, ne garder que le
  rendu `DOOR`. Confirmer d'abord par grep qu'aucun autre appelant n'existe.
- **Risque** : faible (suppression de code mort vérifié).
- **Vérification** : portes toujours visibles en vue 3D ; coffres/boutiques/
  fontaines/escaliers toujours rendus (sprites) ; smoke test vert.
- **Statut** : [x] proposé · [x] validé · [x] implémenté
- **Note implémentation** : confirmé que `FOUNTAIN` n'est pas dans la liste
  `pendingSprite` (renderer.js:216) — les fontaines n'ont aucun rendu 3D, la
  branche `FOUNTAIN` de `drawCellMarker` était donc déjà inatteignable. Deux
  lignes de `CLAUDE.md` corrigées (descriptif `drawCellMarker` + ligne « Visuel
  canvas » du tableau Fontaine, qui décrivait ce code mort).

## P4 — forge.js / library.js : helper de matériau partagé

- **Constat** : `_consumeEssence`/`_countEssence` (forge.js) sont identiques
  byte-à-byte à `_consumePages`/`_countPages` (library.js), seul l'ID d'item
  diffère.
- **Proposition** : créer `_consumeMaterial(itemId, n)` et `_countMaterial(itemId)`
  dans un fichier déjà chargé tôt (ex. inventory.js), et faire pointer forge.js
  et library.js dessus.
- **Risque** : faible-moyen — vérifier l'ordre de chargement (inventory.js avant
  forge.js et library.js : oui d'après l'ordre des `<script>`).
- **Vérification** : smoke test forge + bibliothèque ; consommation correcte.
- **Statut** : [x] proposé · [x] validé · [x] implémenté
- **Note implémentation** : `_countMaterial`/`_consumeMaterial` ajoutés dans
  inventory.js (après `tryAddItem`). `_countEssence`/`_consumeEssence` (forge.js)
  et `_countPages`/`_consumePages` (library.js) deviennent des wrappers d'une
  ligne — call-sites inchangés. Pas d'ajout MANIFEST (helpers internes).

## P5 — audio-sfx.js : helper `_playArpeggio`

- **Constat** : `playLevelUp`/`playVictory`/`playSetComplete`/`playDeath`/
  `playChestOpen`/`playNpcGreet` répètent la même boucle oscillateur
  (création osc+gain, ramp, connect, start/stop).
- **Proposition** : extraire `_playArpeggio(notes, opts)` paramétrable
  (waveform, durée, gain, espacement) et réécrire les 6 fonctions par-dessus.
- **Risque** : faible-moyen — risque de léger changement sonore ; à valider à
  l'oreille en plus du smoke test.
- **Vérification** : smoke test vert ; écoute manuelle des 6 sons.
- **Statut** : [x] proposé · [x] validé · [x] implémenté
- **Note implémentation** : `_playArpeggio` monolithique écarté (enveloppes trop
  variées : attaque présente/absente, décroissance relative/absolue). Helper
  mono-note `_playTone({freq,type,start,peak,attack,decayAt,stop})` ajouté en
  tête de `audio-sfx.js`. Les 6 fonctions gardent leur boucle ; tous les
  paramètres reportés à l'identique → son strictement inchangé.

## P6 — battle-spells.js : helper `_computeSpellDamage`

- **Constat** : `_spellElementalDamage`/`_spellLifesteal`/`_spellCurse` répètent
  le même bloc resist/weak + `dmg = power + mag/2`.
- **Proposition** : extraire `_computeSpellDamage(spell, char, enemy)` retournant
  `{ dmg, multiplierTag }` (🔰/💥), et l'appeler dans les 3 handlers.
- **Risque** : moyen — code de combat ; le calcul doit rester strictement
  identique (mêmes arrondis).
- **Vérification** : smoke test combats (dégâts, resist/weak) ; comparer les
  valeurs avant/après sur un combat scripté.
- **Statut** : [x] proposé · [x] validé · [x] implémenté
- **Note implémentation** : `SPELL_HANDLERS` est indexé par `spell.effect`
  (ligne 339) — les littéraux `'lifesteal'`/`'curse'` valaient déjà
  `spell.effect`. `_computeSpellDamage(spell, char, enemy)` retourne
  `{ dmg, suffix }` ; appelé dans les 3 handlers (curse ignore `suffix`).
  Calcul inchangé.

## P7 — battle-ui.js : fusionner les sélecteurs de cible

- **Constat** : `showTargetSelection` et `showAllyTargetSelection` sont
  quasi-identiques (même construction DOM, même style de boutons).
- **Proposition** : une fonction paramétrée `_showTargets({ list, label,
  onPick })` ; les deux fonctions publiques deviennent des façades fines.
- **Risque** : moyen — UI de combat ; conserver les IDs `#target-selection` /
  `#target-buttons` et le câblage `pendingAction`/`pendingSpell`.
- **Vérification** : smoke test sélection de cible ennemie ET alliée (duo).
- **Statut** : [x] proposé · [x] validé · [x] implémenté
- **Note implémentation** : `_showTargets(entries, onPick)` ajouté ; les deux
  fonctions publiques construisent leurs `entries` ([{label, idx}]) puis
  délèguent. IDs `#target-selection`/`#target-buttons` et câblage `pending*`
  inchangés ; labels identiques au caractère près.
- **Limite de couverture** : le smoke test ne déclenche pas le flux de clic
  de `showTargetSelection`/`showAllyTargetSelection` (scénario Ferula = solo
  auto-ciblé ; scénario Portus = overlay A/B distinct). Le test vert ne
  garantit ici que le parsing du module + le chargement des globals, pas la
  sélection de cible interactive.

## P8 — save-ui.js : factoriser l'import de sauvegarde

- **Constat** : `importSaveFromFile` et `importSaveFromFileToHub` sont ~90 %
  copier-coller (même flux FileReader, même map `reasonLabel`).
- **Proposition** : extraire `_pickAndImportSave(inputId, { onError, onSuccess })` ;
  les deux fonctions deviennent des façades qui ne diffèrent plus que par
  l'ID d'input, le retour visuel (`addMsg` vs `alert`) et la cible de
  rafraîchissement. `onError(reasonLabel)` reçoit le libellé d'échec
  d'import, ou `null` pour une erreur de lecture du fichier.
- **Risque** : faible-moyen.
- **Vérification** : smoke test (parsing du module + globals chargés). Le
  flux FileReader/`<input type=file>` n'est pas exercé par le smoke —
  non-régression UI non garantie ; test manuel d'import recommandé dans
  les deux contextes (modale slots + hub).
- **Écart constaté** : la diff de point final entre les deux messages
  « Import refusé » (point présent côté modale `addMsg`, absent côté hub
  `alert`) est **préservée** telle quelle — chaque façade formate son
  propre message.
- **Statut** : [x] proposé · [x] validé · [x] implémenté

## P9 — npc-dialog.js : factoriser la cascade d'état

- **Constat** : `_npcDialogPages` et `_npcDialogSource` réimplémentent la même
  cascade de priorité (greeting → offer → active → ready → done → idle). Le
  commentaire de `_npcDialogSource` admet la redondance.
- **Proposition** : une fonction `_resolveDialogSource(npc, state)` retournant
  `{ source, raw }` ; les deux consommateurs s'appuient dessus.
- **Risque** : moyen — machine à états des dialogues PNJ.
- **Vérification** : smoke test PNJ (greeting, accept quête, remise, done) ;
  voix de page correcte.
- **Statut** : [ ] proposé · [ ] validé · [ ] implémenté

## P10 — inventory.js : dédup `useItem`/`useItemFromChar` + nettoyages

- **Constat** : (a) `useItem` et `useItemFromChar` dupliquent le bloc d'effet
  consommable et le bloc d'apprentissage de sort ; (b) `rarity-${item.rarity}`
  ajouté 2× dans `renderInventory` ; (c) nombre magique `16` au lieu de
  `INVENTORY_MAX` dans `equipItem`.
- **Proposition** : extraire `_applyConsumableEffect(item, target)` et
  `_teachSpellbook(item)` partagés ; supprimer la ligne `rarity-` redondante ;
  remplacer `16` par `INVENTORY_MAX`.
- **Risque** : moyen — gros fichier, chemins solo/duo.
- **Vérification** : smoke test inventaire (consommable, livre de sort, équip
  solo + duo, sac plein).
- **Statut** : [ ] proposé · [ ] validé · [ ] implémenté

## P11 — movement.js : `_changeFloor(delta)`

- **Constat** : `goDeeper` et `goUp` sont ~95 % identiques (diffèrent par le
  delta d'étage, le test de scellé et le toast de ténèbres).
- **Proposition** : `_changeFloor(delta)` central ; `goDeeper`/`goUp`
  deviennent des appels `_changeFloor(+1)` / `_changeFloor(-1)` avec les
  spécificités passées en options.
- **Risque** : moyen — transitions d'étage, cache de donjon, auto-save.
- **Vérification** : smoke test descente/montée d'étage, fontaine reset,
  auto-save `floor-down`/`floor-up`.
- **Statut** : [ ] proposé · [ ] validé · [ ] implémenté

## P12 — renderer.js : `DIRECTIONS` + fusion murs latéraux

- **Constat** : (a) le littéral `dirs2 = {n:[0,-1]…}` est redéfini 3× au lieu
  d'utiliser `DIRECTIONS` de data.js ; (b) les blocs mur-gauche / mur-droit
  (~55 lignes chacun) sont du copier-coller miroir.
- **Proposition** : (a) réutiliser `DIRECTIONS` ; (b) extraire
  `_drawSideWall(side, …)` paramétré par le côté.
- **Risque** : **élevé** — rendu 3D, le plus sensible visuellement. À traiter
  en dernier, avec capture d'écran avant/après.
- **Vérification** : `node tests/screenshot-*.js` + comparaison visuelle ;
  smoke test vert.
- **Statut** : [ ] proposé · [ ] validé · [ ] implémenté

---

## Journal
- Plan créé. En attente de validation point par point.
- P1 implémenté (commit `c2dc00c`) — 11 globals ajoutés au MANIFEST.
- P2 écarté après analyse : faux positif (fallback volontaire + contrat smoke).
