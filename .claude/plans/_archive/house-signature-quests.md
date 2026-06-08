# Quêtes Signature de Maison — plan narratif

**Statut :** 🟩 en cours — livraison documentaire (bible `docs/histoire/`)

> Objectif : doter chaque Maison d'une **quête signature** qui infuse
> légèrement la trame principale (Actes I→III + finale Voldemort + Boucle
> Ténébreuse), renforce l'identité de Maison et la rejouabilité — sans
> fragmenter la trame (objectif : ~80-90 % commune).

## Périmètre

Tâche **documentaire** : on rédige le design narratif dans la bible, on ne
touche pas (encore) au code. Le code éventuel est cadré en `❓ à valider`.

- Guidelines §7 (test headless) : changement **purement markdown** → test omis,
  justifié ici (aucun `.js`/`.css` servi au navigateur n'est modifié, donc §8
  cache PWA sans objet non plus).

## Étapes

1. ✅ Recensement de l'existant — chapitres 03/05/07/08 + code des quêtes de
   Maison (`quests-templates.js`, `quests.js`, `npcs.js`). Acquis : `chosenHouse`
   est **unique par partie** (pas par héros) ; set@12 et don@Mythe existent déjà ;
   objectifs `riddle`/`pages`/`kill`/`herb`/`donate` supportés ; couche
   `dialoguesByHouse` + `pendingHouseRewards` disponibles.
   → vérif : grep confirmé.
2. ✅ Conception des 4 quêtes signature (1 par Maison) — nom, déclencheur,
   objectifs, influence trame, récompenses, hooks, conserver/❓.
   → vérif : chaque fiche couvre les 6 exigences de la mission.
3. ✅ Chapitre 07 (Maisons) — nouvelle §7.9 « Quêtes Signature de Maison »
   (identité narrative par Maison).
   → vérif : section ajoutée, convention 💡/✅/❓ respectée, renvois croisés.
4. ✅ Chapitre 08 (Quêtes) — nouvelle §8.5 « Quêtes Signature par Maison »
   (fiches détaillées + intégration technique), recap renuméroté 8.6.
   → vérif : 4 fiches + table de synthèse + conseils flags/dialogues/duo.
5. ✅ Chapitre 03 (Trame) — §3.8 « Variations par Maison » + pointeurs Actes.
   → vérif : influence légère documentée, trame commune préservée.
6. ✅ Chapitre 05 — note de cohérence duo (barks cross-Maison) en rejouabilité.
   → vérif : pointeur ajouté sans réécrire les fiches héros.
7. ✅ Commit + push sur `claude/hogwarth-house-quests-ORedN`.

## Décisions de design

- **Distinct du set/don** : la signature se joue **pendant** la descente
  (Actes I-III), gatée par `chosenHouse` + étage, là où set@12 et don@Mythe
  sont gatés par le prestige. Elle est **optionnelle** (ne gate pas l'escalier),
  comme tout le contenu annexe (03 §3.6 / 08 §8.1).
- **Influence finale Voldemort = LÉGÈRE et flaggée** : une réplique conditionnelle
  de Dumbledore (pur dialogue, peu coûteux) + un modificateur de combat one-shot
  lu sur le flag `<house>SignatureDone`. Branches profondes = `❓`.
- **Source de vérité** : réutiliser `chosenHouse` + `houseTier` (cf. CLAUDE.md :
  pas de flag redondant) ; n'ajouter que `<house>SignatureDone` (+ `slythPactChoice`
  pour la branche grise Serpentard), sérialisés.
- **Duo** : `chosenHouse` est unique → une seule signature active par partie ;
  le 2ᵉ héros (Maison canon différente) ne porte que des **barks de saveur**.
  Le vrai « deux Maisons » serait un refactor (`chosenHouse` par perso) → `❓`.

## 4 quêtes (résumé)

| Maison | Quête | Déclencheur | Cœur de gameplay |
|--------|-------|-------------|------------------|
| 🦁 Gryffondor | L'Étendard de Godric | Acte I, ét. 2-3 (Chevalier Fantôme / McGonagall) | combats frontaux, ralliement, sacrifice |
| 🐍 Serpentard | Le Pacte des Cachots | Acte II, ét. 4 (écho de Salazar / Rogue) | choix gris, raccourcis dangereux, secrets Fondateurs |
| 🦅 Serdaigle | Le Codex de Rowena | Acte I/II (stèles d'énigme / Flitwick) | énigmes, exploration, savoir → faille de Voldemort |
| 🦡 Poufsouffle | Ceux qu'on ne laisse pas derrière | Acte I, ét. 2 (Chourave) | escorte, protection, résilience, refuge |
