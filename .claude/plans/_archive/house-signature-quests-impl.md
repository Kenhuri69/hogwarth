# Quêtes Signature de Maison — IMPLÉMENTATION (code)

**Statut :** 🟧 en cours — passage du design (`house-signature-quests.md`,
mergé PR #402) au **code**.

> Objectif : câbler les 4 Quêtes Signature décrites en `docs/histoire/`
> (07 §7.8, 08 §8.5, 03 §3.8) en **réutilisant l'existant** (objectifs de
> quête, `dialoguesByHouse`, `pendingHouseRewards`, flags sérialisés), sans
> fragmenter la trame. Variation **légère** : 1 quête active par partie
> (gatée `chosenHouse` + étage), 1 récompense exclusive, 1 levier one-shot
> avant Voldemort par flag.

## Périmètre retenu (vertical slice cohérent)

On implémente le **noyau réutilisable**, on laisse en `❓` (doc) les mécaniques
neuves lourdes (raccourcis movement/dungeon Serpentard, escorte/vague/refuge-repos
Poufsouffle) — remplacées par des **proxys d'objectifs existants** (kill/item/
herb/riddle/pages) conformes au conseil 08 §8.5.2.

| # | Lot | Fichiers | Vérif |
|---|-----|----------|-------|
| 1 | **Flags d'état** : `gryffSignatureDone`/`slythSignatureDone`/`ravenSignatureDone`/`poufSignatureDone` + `slythPactChoice` | `js/state.js`, `js/save.js` | sérialisés/restaurés ; reset au new game |
| 2 | **Récompenses exclusives** (items) : Bannière de Godric (trinket anti-`fear`), Langue-de-plomb (acc lifesteal/MAG), Codex de Rowena (trinket révèle resist/weak), Cœur du Refuge (trinket regen) | `js/data.js` | items équipables, schéma respecté |
| 3 | **Templates de quête** `quest_signature_<gryff\|slyth\|raven\|pouf>` (`houseSignatureQuest:true`, `house`, objectifs = types existants) | `js/quests-templates.js` | 4 entrées valides |
| 4 | **Unlock gaté `chosenHouse` + étage** : `unlockHouseSignatureQuest()` appelé au changement d'étage | `js/quests.js`, hook floor-entry | quête apparaît au bon étage pour la bonne Maison |
| 5 | **Donneurs + dialogues** : assigner la quête au PNJ donneur par Maison ; `dialoguesByHouse` Dumbledore (réplique pré-Voldemort lue sur le flag) ; choix Pacte/Défiance Serpentard | `js/npcs.js`, `js/npc-dialog.js` | quête disponible→acceptable→remettable ; flag posé à la remise |
| 6 | **Leviers finale Voldemort** (one-shot, gardés par flag) : 🦁 neutralise phase terreur ; 🦅 révèle resist/weak ; 🐍 lifesteal (pacte) / debuff (défiance) ; 🦡 buff départ « Espoir partagé » | `js/battle.js`, `js/battle-spells.js` | hook actif seulement si flag, sinon no-op |
| 7 | **Tests smoke** 1/Maison `scenarioHouseSignature<House>` | `tests/scenarios/houses.js` | verts |
| 8 | **Cache PWA** : bump `?v` des js touchés + `CACHE_VERSION` | `index.html`, `sw.js` | `check_cache_versions.js` exit 0 |
| 9 | **Commit + push** branche `claude/house-signature-quests-CWEGq` | — | working tree clean |

## Décisions

- **Source de vérité** : `chosenHouse` (string 'Gryffondor'/'Serpentard'/
  'Serdaigle'/'Poufsouffle') + `houseTier`. On n'ajoute QUE les 5 flags ci-dessus.
- **1 quête active/partie** (modèle de tout le contenu de Maison). Duo = barks doc-only.
- **Optionnel** : ne gate jamais l'escalier.
- **Leviers Voldemort = légers** : quelques lignes gardées par flag, jamais une branche.

## Journal

- **Recensement** : 3 sous-agents Sonnet ont cartographié quest/NPC/state-save-battle.
  Constats clés : `chevalier_fantome` est un **monstre** (pas un PNJ) ; aucun PNJ
  écho de Salazar → on réutilise les **4 Chefs de Maison** comme donneurs (la
  bible les liste comme alternatives), avec `dialoguesByQuest` + cérémonie
  `claim_house_reward`. `_houseClaimableItems` dérive les items réclamables des
  paliers + set → étendu avec une map signature.
- **Lot 1 (flags)** ✅ — `state.js` (5 flags + `slythPactBuff` combat-scoped),
  `save.js` (serialize + restore `!!`/`||null`), `main.js` (reset startGame).
- **Lot 2 (items)** ✅ — `data.js` : `banniere_godric` (trinket `fearImmune`),
  `langue_de_plomb` (amulet MAG/regen), `codex_rowena` (trinket INT/MAG),
  `coeur_refuge` (trinket regen). Emoji fallback (pas d'icône PNG — hors scope).
- **Lot 3 (templates)** ✅ — 4 `quest_signature_*` (`houseSignatureQuest`,
  `house`, objectif `kill`, `houseSetReward`). Exclus du startup via
  `!t.houseSignatureQuest` (main.js).
- **Lot 4 (unlock)** ✅ — `unlockHouseSignatureQuest` + `HOUSE_SIGNATURE_FLOORS`
  {Gryff 2, Slyth 4, Raven 2, Pouf 2} ; `_maybeUnlockSignature(floor)` branché
  dans `checkFloorQuests`.
- **Lot 5 (PNJ + dialogues)** ✅ — 4 Chefs : `questsGiven`/`questsTurnedIn` +
  `dialoguesByQuest[signature]`. `_houseClaimableItems` étendu. Choix gris
  Serpentard : 2 boutons de remise → `turnInSlythSignature(pact|defiance)`.
  Flag posé dans `completeQuest` via `_markSignatureDone`.
- **Lot 6 (leviers Voldemort)** ✅ — `_applySignatureVoldemortLever()` (startBattle) :
  🦁 neutralise la phase terreur · 🦅 weak `lumière` · 🐍 pacte→`slythPactBuff`
  (lifesteal de sort, hook dans `_applySerpentLifesteal`) / défiance→−15 % atk/mag
  boss · 🦡 +15 PV max départ. + garde anti-peur de groupe `fearImmune`
  (`rollFearSkip`/`_partyFearWardActive`). Réplique Dumbledore = addMsg (pur dialogue).
- **Lot 7 (tests)** ✅ — `scenarioHouseSignatureQuests` (cycle 4 Maisons + choix
  Pacte + 5 leviers + garde anti-peur). `node tests/smoke.js signature` ✅,
  `node tests/units.js` ✅ (67 assertions).
- **Lot 8 (cache PWA)** ✅ — 11 js bumpés (index.html + sw.js) + `CACHE_VERSION`
  v67→v68. `check_cache_versions.js` ✅, `tests/pwa-smoke.js` ✅ (cache v68, 85
  entrées, offline OK). Item-icons : 4 entrées SVG inline ajoutées (couverture
  100 % du test `scenarioItemIcons`, pas de PNG requis).
- **Suite complète** ✅ — `node tests/smoke.js` : **163 scénarios, 0 échec**.
- **Lot 9 (commit/push)** ✅ — branche `claude/house-signature-quests-CWEGq`.
- **Lot 10 (icônes painterly)** ✅ — 4 recettes dans `tools/icon_factory.py`
  (palettes Maison + emblèmes lion/snake/eagle/badger) + nouveau part
  `tools/parts/banner.svg` (étendard pole/cloth/trim) pour la Bannière. 20 PNG
  générés (`img/icons_new/<id>_{16..64}.png`). Câblés dans `ITEM_ICON_NEW_REGISTRY`
  (rendu) + alias legacy dans `ITEM_ICON_REGISTRY` (fallback/couverture test) ;
  retrait des SVG inline (qui shadowaient le PNG). `scenarioItemIcons` ✅
  (146 items mappés).

## Hors-scope assumé (cadré `❓` dans la bible, non implémenté)

- Raccourcis Serpentard (transitions d'étage alternatives — refonte movement/dungeon).
- Escorte / vague défensive / refuge-repos Poufsouffle comme mécaniques neuves
  → remplacés par des **proxys kill** (conforme 08 §8.5.2 « types existants »).
- Objectifs `riddle`/`pages` Serdaigle → proxy kill (turn-in PNJ robuste ; les
  riddle/pages se remettent via établi, pas via le bouton PNJ).
- Icônes painterly PNG des 4 reliques (fallback SVG inline suffisant) ; PNJ
  dédié écho de Salazar / Chevalier non-hostile (réutilisation des Chefs).
- Vrai « deux Maisons simultanées » en duo (refacto `chosenHouse` par perso).
