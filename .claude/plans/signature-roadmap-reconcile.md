# Plan — Réconciliation roadmap : quêtes signature ⚠️4 (stale → ✅)

> Branche : `claude/hogwarth-narrative-review-1kga03`.

## Constat

L'utilisateur a demandé « créer les 2 PNJ de signature + implémenter les 4 quêtes
signature » (⚠️4 du roadmap). **Audit du code : tout est déjà livré et mergé** :

- `quest_signature_{gryff,slyth,raven,pouf}` dans `quests-templates.js` (`houseSignatureQuest:true`).
- Flags `gryffSignatureDone`/`slythSignatureDone`/`ravenSignatureDone`/`poufSignatureDone`
  + `slythPactChoice`, sérialisés (`save.js`), leviers Voldemort (`battle.js`),
  échos Boucle (`floor-ambiance.js`), `unlockHouseSignatureQuest` (`quests.js`).
- **PNJ dédiés** : `chevalier_godric` (Chevalier Fantôme non-hostile) +
  `echo_salazar`, art `img/npc/chevalier_godric.png` / `echo_salazar.png`,
  dialogues + placement (étages 2-3 / 4), signatures retirées de McGonagall/Rogue.
  Serdaigle/Poufsouffle restent sur Flitwick/Chourave (chefs existants — conforme spec).
- 5 scénarios smoke (`scenarioHouseSignature{Gryffondor,Serpentard,Serdaigle,
  Poufsouffle}` + `scenarioHouseSignatureQuests`) → **verts** (`node tests/smoke.js HouseSignature`).

→ Rien à implémenter. La ligne ⚠️4 du roadmap (+ 3 références croisées) est **stale**.

## Changement (doc-only)

Réconcilier `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` : marquer ⚠️4 ✅ Résolu et
mettre à jour les 4 références croisées (matrice de cohérence, table 08↔06,
backlog, plan d'action Phase 3).

## Étapes & vérifications

1. [x] Audit code + preuve smoke (`HouseSignature` → 5/5 verts).
2. [x] Roadmap : ⚠️4 → ✅4 ; ligne « 08 ↔ 06 » ; caveat matrice ; backlog ;
   Phase 3. Objectifs « neufs » (raccourcis/escorte) reclassés hors-scope (proxys
   kill, conforme §8.5.2).
3. [x] Pas de cache bump (doc `.md` non servi au navigateur — guidelines §8).

## Notes

- ⚠️5 (`slythPactChoice 'defiance'`) semble **aussi stale** : `quests.js`
  (`setSlythPactChoice`/défaut `defiance`) + `battle.js` gèrent les deux branches.
  Hors-scope de cette réconciliation — signalé à l'utilisateur.
