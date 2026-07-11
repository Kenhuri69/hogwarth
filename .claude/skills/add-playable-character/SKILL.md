---
name: add-playable-character
description: Ajouter un héros jouable sélectionnable au démarrage du jeu Poudlard & Magie (modèle Harry/Hermione/Céleste/Iris/Maxence/Anastasia). Utiliser dès qu'on veut rendre un personnage choisissable dans l'équipe, même si l'utilisateur nomme juste un personnage de l'univers HP à jouer (« ajoute Drago comme perso jouable », « un 7e héros Serpentard sélectionnable »). Couvre les DEUX images distinctes (portrait-médaillon visage + sprite plein corps img/players/), l'entrée CHARACTERS, la carte #hero-grid et le smoke test. Ne PAS utiliser pour un PNJ non jouable (npcs.js) ni un ennemi humain (skill add-monster).
---

# Ajouter un personnage jouable

Tout repose sur les références `party[0]/party[1]`/`player` hydratées
dynamiquement depuis `CHARACTERS[key]` — combats, sauvegardes, équipement,
quêtes fonctionnent sans câblage supplémentaire.

## Étapes

### 1. Images — DEUX visuels distincts à NE PAS confondre

Un héros a **deux images de sources différentes**. Ce sont **deux visuels
séparés** (un cadrage VISAGE ≠ un cadrage PLEIN CORPS) — ne jamais réutiliser
l'un pour l'autre, sinon le médaillon affiche un visage qui ne colle pas.

#### 1a. Portrait-médaillon (VISAGE) — `img/<key>.png` (+ `img/<key>-original.png`)
Affiché dans le HUD, la carte de sélection, la fiche perso, les dialogues.
**Source = un crop VISAGE/buste**, deux PNG 128×128 dans `img/` :
- `img/<key>-original.png` : crop centré du visage, sans décoration
  (center-crop puis Lanczos → 128×128).
- `img/<key>.png` : même crop encadré d'un **médaillon doré** — c'est le
  fichier référencé par `CHARACTERS[<key>].imgSrc`.

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

#### 1b. Sprite plein corps (FIGURE ENTIÈRE) — `img/players/<key>.png`
Figure debout tête-aux-pieds, **512×512 RGBA fond transparent** (même format
que les sprites existants). Enregistré dans `PLAYER_SPRITE_SRC`
(`js/renderer-entities.js`) et rendu par `drawGhostSprite` (identité du
joueur, Mondes Parallèles) — repli silhouette vectorielle si le PNG manque.

> ⚠️ **Tu ne peux PAS générer cette image toi-même** (pas de génération
> raster painterly). La source vient de **Gemini / Nano Banana**. Le portrait
> fourni par l'utilisateur est presque toujours un **buste/visage** (cadrage 1a)
> — il ne convient PAS pour le plein corps. Donc, par défaut :
>
> **TU DOIS FOURNIR À L'UTILISATEUR, DANS TA RÉPONSE, UN PROMPT GEMINI
> PRÊT-À-COLLER** pour générer le sprite plein corps. Ne te contente jamais
> de dire « source manquante » : génère le prompt et donne-le. C'est un
> **livrable obligatoire** de la skill quand aucune image plein corps n'est
> fournie.

**Construire le prompt** (modèle ci-dessous, à remplir d'après le profil du
héros — Maison, baguette, élément, tenue, âge). Règles de cadrage anti-zoom +
suffixe universel : voir
[`.claude/plans/_archive/nano-banana-prompts-heroes-olivier-agathe.md`](../../plans/_archive/nano-banana-prompts-heroes-olivier-agathe.md)
(palettes Maison : Gryffondor crimson/gold·lion, Serpentard green/silver·snake,
Serdaigle midnight-blue/bronze·eagle, Poufsouffle black-yellow/gold·badger).

```
Concept art digital painting of <NOM>, a young heroic <wizard|witch> in the Harry Potter universe,
wide shot, distant framing, head to toe in frame, feet fully visible standing on invisible ground,
complete standing figure in a confident noble pose, determined gaze toward the viewer,
<ÂGE>-year-old <description physique : cheveux, expression>,
wearing <MAISON> school robes in <couleurs maison> with the <emblème> house crest,
raising a <BAGUETTE> from which <ÉLÉMENT/effet magique> swirls (translucent, alpha 30-70%),
<accessoire signature tenu dans l'autre main>,
shoes fully visible at the bottom of frame,
dramatic upper-left lighting, warm key light + cool cyan rim light separating the figure from the background,
palette: <couleurs maison + accents>, 
fully transparent background, no ground shadow,
subject occupies 70% of 512x512 square frame with 15% empty margin above head and below feet,
centered full standing pose, painterly brush strokes, no outline, MTG concept art quality,
complete silhouette visible, no cropping of limbs,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow
```

> Archive le prompt rempli dans `.claude/plans/_archive/nano-banana-prompt-<key>.md`
> et **donne-le tel quel à l'utilisateur** (bloc copiable).

**Une fois l'image reçue de l'utilisateur** (souvent un PNG 1024² RGB sur
**fond damier aplati**) :
- détourer via `python3 tools/dechecker_png.py <src.png> img/players/<key>.png` ;
- **ajouter la clé** `<key>: 'img/players/<key>.png'` à `PLAYER_SPRITE_SRC`,
  **bumper le cache PWA** (`renderer-entities.js`, skill `cache-bump`), et
  **mettre à jour le compte de héros** dans l'assertion de
  `tests/scenarios/multiplayer.js` (scénario sprite plein corps).

Tant que l'image n'est pas livrée, le héros reste pleinement jouable via le
**repli vectoriel** — mais le prompt doit avoir été fourni.

### 2. Données — entrée dans `CHARACTERS` (`js/data-characters.js`)
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

### 4. Barks — voix du héros (optionnel, recommandé)
Donner une voix au héros dans `js/hero-barks.js` : ajouter une entrée
`HERO_BARKS[<key>]` avec 4-6 événements parmi `bossAppear` / `crit` /
`allyDown` / `levelUp` / `houseTier` / `tierTransition`, plus une carte
`houseTension[<Maison>]` si la Maison canon du héros peut différer de
`chosenHouse` (rejouabilité, cf. `docs/histoire/05-personnages-jouables.md §5.4`).
Système purement cosmétique et **défensif** : un héros sans entrée reste
silencieux (aucun crash). Garder le ton aventure → sombre du registre.

> **Cache PWA** : `hero-barks.js` est servi au navigateur. Toute
> modification (ou tout autre JS/CSS/`index.html` touché à l'étape 3)
> impose un bump — dérouler la skill **`cache-bump`** (guideline §8).

> **Doc + normativité** : compléter le profil narratif (§5.0/§5.0.1 +
> profil §5.1/§5.2) et cocher la checklist `§5.5.5`. La règle narrative
> **normative** vit dans `docs/histoire/05-personnages-jouables.md §5.5` —
> cette skill et `CLAUDE.md` (« Ajouter un nouveau personnage jouable »)
> doivent rester cohérents avec elle.

### 5. Vérifier (guidelines §7)
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
