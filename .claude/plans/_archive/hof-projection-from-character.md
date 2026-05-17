# Plan — Simulation de rang Hall of Fame depuis la fiche perso

## Objectif
Ajouter un bouton sur la fiche de personnage qui ouvre le Hall of Fame
en y insérant une ligne de **simulation** : le score du run Ironman en
cours, positionné à son rang projeté dans le classement.

## Décisions
- Bouton visible **uniquement en mode Ironman** (`ironmanMode`). Hors
  Ironman, le run ne peut jamais entrer au HoF → projection trompeuse.
- Rang exact via une lecture du classement (`select=score` trié, top 200),
  comptage client-side. Repli `localStorage` si hors-ligne.
- Retour : nouvel état `_hofReturnTo = 'game'` → fermer le HoF laisse la
  fiche perso visible dessous (HoF z-index 960 > modale 500).

## Étapes
1. `hall-of-fame.js` — `_hofBuildProjection()` (entrée virtuelle du run
   courant via `computeIronmanScore()`). → vérif : objet `{score, heroes…}`.
2. `hall-of-fame.js` — `_hofRankForScore(score)` (rang projeté, online +
   repli local). → vérif : retourne ≥ 1.
3. `hall-of-fame.js` — `_renderHallOfFame(projection)` accepte une
   projection, insère/épingle la ligne. → vérif : `.hof-row-projection`
   présente dans `#hof-list`.
4. `hall-of-fame.js` — `openHofProjection()` + branche `'game'` de
   `closeHallOfFame()`. → vérif : ouvre/ferme sans casser la fiche.
5. `ui.js` — bouton `🏆 Mon rang` dans `openCharacter()` (Ironman only).
6. `css/style.css` — styles `.hof-row-projection`, `.hof-proj-tag`,
   `.hof-proj-note`.
7. `loader.js` — `openHofProjection` ajouté au MANIFEST.
8. `index.html` — bump versions ui.js / hall-of-fame.js / style.css.
9. `tests/smoke.js` — cas T6b : build projection + rang + rendu.
   → vérif : `node tests/smoke.js` vert.

## Suivi
- [x] Étapes 1-9 implémentées, smoke test vert.
