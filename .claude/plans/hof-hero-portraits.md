# Plan — Portraits des sorciers dans le Hall of Fame

## Objectif
Afficher dans chaque ligne du classement Hall of Fame le ou les
portraits des sorciers utilisés, sur un fond sombre.

## Approche
- Les entrées du classement portent `heroes` (noms complets séparés
  par « & »), pas d'icônes. → résoudre les noms vers `CHARACTERS.imgSrc`.
- Helper `_hofHeroAvatars(heroesStr)` → bloc d'`<img>` rond sur fond
  sombre, inséré entre le rang et la zone principale de la ligne.
- Fallback emoji 🧙 si un nom n'a pas de portrait connu.

## Étapes
1. `hall-of-fame.js` — `_hofHeroAvatars()` + insertion dans la ligne.
2. `css/style.css` — `.hof-heroes`, `.hof-hero-av` (cercle, fond sombre).
3. `index.html` — bump hall-of-fame.js / style.css.
4. `tests/smoke.js` — T6 vérifie `.hof-hero-av img` (src = img/harry.png).
   → vérif : `node tests/smoke.js` vert.

## Suivi
- [x] Étapes 1-4 implémentées.
