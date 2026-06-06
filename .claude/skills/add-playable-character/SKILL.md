---
name: add-playable-character
description: Ajouter un héros jouable sélectionnable au démarrage du jeu Poudlard & Magie (modèle Harry/Hermione/Céleste/Iris/Maxence/Anastasia). Utiliser dès qu'on veut rendre un personnage choisissable dans l'équipe, même si l'utilisateur nomme juste un personnage de l'univers HP à jouer (« ajoute Drago comme perso jouable », « un 7e héros Serpentard sélectionnable »). Couvre les 2 portraits PNG (transplant du médaillon doré par genre), l'entrée CHARACTERS, la carte #hero-grid et le smoke test. Ne PAS utiliser pour un PNJ non jouable (npcs.js) ni un ennemi humain (skill add-monster).
---

# Ajouter un personnage jouable

Tout repose sur les références `party[0]/party[1]`/`player` hydratées
dynamiquement depuis `CHARACTERS[key]` — combats, sauvegardes, équipement,
quêtes fonctionnent sans câblage supplémentaire.

## Étapes

### 1. Portraits — deux PNG 128×128 dans `img/`
- `img/<key>-original.png` : crop centré du visuel source, sans décoration
  (center-crop puis Lanczos → 128×128).
- `img/<key>.png` : variante encadrée d'un **médaillon doré** — c'est le
  fichier affiché partout dans le jeu.

**Ne pas générer l'anneau de zéro** (profil radial subtil, échoue à l'œil).
Transplanter l'anneau d'un médaillon existant de **même genre** :
1. masque rond la photo source au radius 50 (centre 63.5, 63.5) ;
2. copie pixel-par-pixel tous les pixels à `r ≥ 50` depuis le médaillon de
   référence sur un canevas vide ;
3. compose : `Image.alpha_composite(photo, ring)`.

Référence selon le genre :
- **Filles** (Céleste, Iris, Anastasia…) : `celeste.png` ou `iris.png`.
  Anneau = gradient 5 px, pic blanc-or `#ecd692` au centre (r=56→60 :
  `#846314`→`#e2c260`→`#ecd692`→`#cda52d`→`#886514`), pinstripe or r=53-54,
  gap noir r=55, fade noir externe r=61+, gemmes N/S, accents or E/O.
  Pour différencier deux héroïnes, recolorer **uniquement les pixels bleus de
  gemme** par luminance (Céleste = bleu sourd ; Iris = violet ; Anastasia =
  bleu glacé argenté).
- **Garçons** (Maxence…) : `maxence.png`. Anneau plus fin, gold uni
  `#f0d782`, pas de gemme colorée.

### 2. Données — entrée dans `CHARACTERS` (`js/data.js`)
Lue par `_hydrateCharacter()`. Champs :
```js
<key>: {
  name, icon, class,
  imgSrc: "img/<key>.png",
  role,
  hp, sp, str, int, agi, end, lck, mag, atk, def,
  wand, armor, acc,
  spells: ["Episkey", "Protego", ...],
  tagline
}
```

### 3. Carte de sélection — `index.html`
Ajouter dans `#hero-grid` :
```html
<button class="hero-card" data-key="<key>" onclick="toggleHero('<key>')">
  …<span class="hero-badge">N</span>…
</button>
```
Numéroter `hero-badge` à la suite des cartes existantes.

### 4. Vérifier (guidelines §7)
```bash
node tests/smoke.js
```
Aucune assertion n'utilise une nouvelle clé directement → tous les scénarios
doivent rester verts sans modification. Si tu touches au flow de sélection
(`showPlayerSelect`/`toggleHero`/`confirmHeroSelection`), ajoute un cas dédié
dans le même commit.

## Notes
- `player` et `party[0]` pointent vers le même objet — ne jamais réassigner
  ces variables (utiliser `Object.assign`). Or/inventaire/XP partagés.
- Aucun autre câblage requis (combat, save, équipement, quêtes héritent des
  références de groupe).
