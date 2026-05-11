# Ajout du personnage joueur — Anastasia Moonveil

## Contexte
Nouveau personnage jouable, magicienne, à intégrer à l'écran de sélection
des héros à côté de Harry, Hermione, Céleste, Iris, Maxence.

Portrait fourni par l'utilisateur : jeune sorcière brune à lunettes bleues,
robe et écharpe de Gryffondor, baguette étincelante, livre ouvert sur
« Wingardium Leviosa ». Thématique « Moonveil » = voile de lune (magie
protectrice / lumineuse).

## Décisions
- **Maison** : Gryffondor (confirmé visuellement par le blason et l'écharpe).
- **Rôle** : Mage de la Lune — équilibrée INT/MAG, polyvalente.
- **Sorts de départ** : Episkey, Protego, Wingardium Leviosa, Lumos Maxima
  (clin d'œil au livre ouvert sur la page Wingardium Leviosa).
- **Stats** (entre Hermione pure-mage et Iris polyvalente) :
  hp:30, sp:32, str:7, int:16, agi:11, end:8, lck:13, mag:15, atk:4, def:2.
- **Portrait** : `img/anastasia.png`, recadré + redimensionné à 128×128
  comme les autres portraits.

## Étapes
1. Générer `img/anastasia.png` (128×128) à partir de l'upload utilisateur
   → verify: `file img/anastasia.png` retourne `128 x 128`.
2. Ajouter l'entrée `anastasia` dans `CHARACTERS` (`js/data.js`)
   → verify: `node -e "require('./js/data.js')"` (n/a — pas de modules),
     vérifier visuellement que la structure suit les autres entrées.
3. Ajouter la `hero-card` correspondante dans `index.html`
   → verify: le bouton apparaît dans l'écran de sélection après chargement.
4. Lancer `node tests/smoke.js` → verify: tous les tests passent.
5. Commit + push sur `claude/add-anastasia-character-mcGAK`.

## Notes
- Aucune logique de combat ni de save à modifier : tout passe par
  `_hydrateCharacter()` dans `main.js` qui lit `CHARACTERS[key]`.
- Pas besoin d'icône SVG dédiée (les héros utilisent leur portrait PNG).
- Pas de portrait SVG NPC nécessaire (Anastasia est une héroïne, pas un PNJ).
