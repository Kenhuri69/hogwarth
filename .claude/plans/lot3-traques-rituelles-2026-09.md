# Lot 3 — Traques Rituelles (`revue-design-progression-2026-07.md` Partie IV)

Suite de la revue de progression (Lots 0-2 livrés en juillet). Le Lot 3 crée la
ressource **Marques de Traque** 🏹, dont le Lot 4 (arbre « Éveil du Sorcier »,
retenu en Q4) a besoin. L'Éveil d'artefact (2.5b, reporté au Lot 3) fera
l'objet d'une PR séparée : ce lot-ci pose la ressource et ses deux premiers
débouchés.

## Conception (écarts au design §4.1 signalés ⚠️)

- **Module** `js/traque.js` (chargé après `quests-riddles.js`). État
  (`state.js`, sérialisé) : `hunterMarks` (entier), `traqueUnlocked` (bool),
  `traqueContract` (`{ floor, category, amount, progress, honored }` ou `null`).
- **Donneurs** : les 4 chefs de Maison (étages 3-6) et le Gardien de la Boucle
  (étage 11). Un bouton « 🏹 Recevoir le Sceau de Traque » active le système
  (une fois par partie). ⚠️ Le design prévoyait un contrat pris chez le donneur ;
  or les donneurs n'existent que sur 5 étages alors que « chaque étage propose
  une Traque ». Le donneur délivre donc la **licence**, puis chaque étage
  affiche son contrat tout seul.
- **Contrat** : à chaque entrée d'étage (licence acquise, hors Poche et hors
  visite), tirage PUR `traqueDrawContract(pool, rng)` : ⚠️ une **catégorie** de
  créature (bête / humain / fantôme / créature / être magique), pondérée par
  le poids du pool de l'étage, et non une espèce. Les escortes sont tirées au
  hasard dans tout le pool : une espèce précise rendrait le contrat aléatoire.
  N = 3 si la catégorie pèse < 25 % du pool, 4 si < 45 %, 5 sinon.
- **Récompense** : `traqueMarksFor(kills)`, PUR : 1 Marque, ×2 si l'étage est
  « hostile » (n = kills/4 ∈ [4, 5]), ×3 s'il est « redouté » (n ≥ 6).
  ⚠️ Les seuils suivent les libellés `floorVisitLabel` affichés au joueur
  (design : ×2 à n = 5 seulement).
- **Anti-dégénérescence** : 2 contrats honorés au plus par visite d'étage (un
  2ᵉ est tiré après le 1ᵉʳ) ; aucune XP ni or ; les Marques ne viennent que
  des contrats.
- **Débouchés** :
  1. Reforger la voie (Forge et Bibliothèque) : payable en or **ou** en
     5 Marques (bascule dans le panneau de respec). Il n'y a pas de coût
     obligatoire en Marques : les joueurs sans licence ne sont pas bloqués.
  2. Échange chez le Gardien de la Boucle : 4 Marques → 1 Essence des Ténèbres
     ou 1 Page de grimoire.
  3. (Lot 4) points d'Éveil — hors lot.
- **UI** : ligne 🏹 en tête du suivi de quêtes (contrat en cours) ; compteur
  🏹 à côté de l'or dans la fiche.
- **Télémétrie** : `BalanceLog.record('traque', { marks, mult })` à chaque
  contrat honoré (NO-OP hors debug) ; `traqueCount` / `traqueMarks` dans
  `summary`.

## Étapes

1. [x] Plan (ce fichier).
2. [x] 3.1 état + save round-trip + compteur fiche.
3. [x] 3.2 module traque.js (tirage, progression, cap, licence, tracker).
4. [x] 3.3 débouchés : respec en Marques, échange au Gardien.
5. [x] 3.4 télémétrie.
6. [x] Tests : units §29, smoke `scenarioTraque`.
7. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé (PR #756 fusionnée ; branche remise à zéro).
- 2026-09-30 — Implémenté tel que conçu. Aucune simulation : pas d'effet de
  combat (les Marques n'achètent que du respec et des matériaux déjà
  disponibles par ailleurs). Calibration des débits (§4.2) laissée à la
  télémétrie `traque`. Tests : units §29 (1496 ✅), smoke `scenarioTraque`
  (5 étapes ✅), suite complète 294 ✅, pwa-smoke ✅. Loader 414 ; 99 modules ;
  cache 12 JS bumpés + `traque.js?v=1`, `CACHE_VERSION` 283.
- Reste pour la suite : 2.5b Éveil d'artefact (coût Marques + Primordiale),
  puis Lot 4 (achat de points d'Éveil en Marques, 4.7).
