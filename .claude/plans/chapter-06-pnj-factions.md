# Plan — Finalisation du Chapitre 06 « PNJ & Factions »

**Statut :** 🟩 en cours — 2026-06-12

## Constat de départ

Le chapitre `docs/histoire/06-pnj-et-factions.md` (254 l.) est le **seul** des 12
chapitres narratifs à ne **pas** référencer la canon révisée :
- 0 occurrence de « Clé de Voûte » (tous les autres chapitres l'ont : 03=11,
  08=6, 09=14, 12=11…).
- Pas d'« Éclats » ni de « voix des Fondateurs » (présents dans 03/04/08/09/12).
- Cadre obsolète : Voldemort présenté comme **la** source de la corruption, alors
  que la canon actuelle ([03 §3.3], [08 §8.6], [12]) établit que la Clé scellait
  **deux** maux (corruption pré-Poudlard **et** résidu de Voldemort).
- Manquent : distinction PNJ de surface vs profondeurs ; évolution de
  l'influence des Maisons ; PNJ des quêtes signature (Chevalier Fantôme, écho de
  Salazar, etc.) ; système de réactions/réputation ; règles d'ajout de PNJ ;
  variantes par héros ; plan d'implémentation.

C'est bien « le chaînon manquant le plus important pour relier les autres
éléments narratifs » (énoncé de la tâche).

## Critères de vérification

1. ✅ Chapitre aligné canon → `grep -c "Clé de Voûte" 06` > 0 et cohérence avec
   03/04/07/08/12 (double trame, Éclats, 4 voix des Fondateurs).
2. ✅ Roster PNJ reste exact vs `js/npcs.js` (aucun id inventé ; `dialoguesByHouse`
   et `specialAction` correctement attribués).
3. ✅ Toutes les sous-sections de l'ÉTAPE 1 de la tâche présentes (intro,
   factions, fiches détaillées, système de relations, règles d'ajout, tables).
4. ✅ ÉTAPE 2 : plan d'implémentation concret (structures de données, flags,
   dialogues dynamiques, intégration quêtes/Codex/lieux, surface/profondeurs/
   Boucle, priorisation, assets).
5. ✅ Conventions de doc respectées (marqueurs ✅/💡/❓, tables de synthèse,
   « Récapitulatif express », « Points à trancher », liens relatifs).

## Étapes

1. [x] Audit canon : lire 03, 04, 07, 08, 12 + `js/npcs.js` (ids, byHouse, actions).
2. [x] Vérifier que 06 est le seul chapitre non aligné. → confirmé.
3. [x] Rédiger le plan (ce fichier).
4. [x] Réécrire `06-pnj-et-factions.md` : re-cadrage canon + roster conservé +
   nouvelles sections (surface/profondeurs, factions×Maison, fiches signature,
   système de réactions, règles d'ajout, variantes héros, tables) + plan d'implé.
5. [x] Relecture de cohérence des liens croisés + marqueurs.
6. [~] Commit + push sur `claude/hogwarth-chapter-06-npcs-jctxlk`.

## Notes / décisions

- **Pas de bump cache PWA / pas de smoke test** : changement purement documentaire
  (markdown, non servi au navigateur) — exempté par guidelines §7 et §8.
- Le **plan d'implémentation** demandé en ÉTAPE 2 est intégré **dans** le chapitre
  (§6.12) — cohérent avec la convention du projet (08 §8.5.2 « Conseils
  d'intégration technique » embarqués dans le chapitre narratif).
- Roster ✅ vérifié dans `js/npcs.js` : dumbledore, pomfresh, mimi, scamander,
  slughorn (seul porteur de `dialoguesByHouse`), lockhart, lupin, manon
  (specialAction `manon_fusion_grimoire`), sir_patrick, hagrid, mcgonagall, rogue,
  flitwick, sprout, ollivander, guipure, portrait_dumbledore (specialAction
  `dumbledore_epreuve`), fumseck, kingsley, marchand_clandestin, bill_weasley,
  apothicaire_tenebreux, sirius_esprit, forgeron_tenebreux, gardien_boucle +
  aléatoires (rosmerta, mundungus, sir_nicolas, moine_gras, rusard,
  scamander_random, hagrid_random, trelawney, marchand_ombre).
- PNJ des signatures (Chevalier Fantôme non-hostile, écho de Salazar) : **non
  encore implémentés** comme PNJ → marqués 💡/❓, gardés cohérents avec 07/08.
