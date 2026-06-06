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

- (à compléter à chaque lot)
