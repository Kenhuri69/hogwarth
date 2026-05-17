# Ajout de personnages de film : Drago Malefoy & Cho Chang

Personnages jouables issus des films, ajoutés au groupe « Les Héros du Film ».

## Cho Chang (ajout ultérieur)

- Portrait : fond sombre quasi identique au noir de la robe → clé de
  couleur impossible. Détourage via **GrabCut OpenCV** (rect prior +
  plus grande composante connexe + feather). ✅ `img/cho.png` 128×128.
- Données : entrée `cho` dans `CHARACTERS` (Serdaigle, Attrapeuse).
- Carte de sélection : 4ᵉ carte de la section `data-group="film"`.
- Le hibou tenu par Cho est retiré au détourage (portrait buste épuré).

---


## Étapes

1. **Portrait** — détourer l'image fournie (fond brun retiré), produire
   `img/draco.png` 128×128 en cutout transparent (style Harry/Hermione,
   pas de médaillon car héros de film).
   → vérif : PNG RGBA 128×128, fond transparent, visage intact. ✅ FAIT
   (flood-fill par clé chaude `r-b>17 & max<95`, crop buste, LANCZOS).

2. **Données** — ajouter l'entrée `draco` dans `CHARACTERS` (`js/data.js`)
   après `hermione`.
   → vérif : champs name/icon/class/imgSrc/role/stats/wand/armor/acc/spells/tagline.

3. **Carte de sélection** — ajouter un `<button class="hero-card">` dans
   la section `data-group="film"` de `index.html`.
   → vérif : carte visible, `data-key="draco"`, `onclick="toggleHero('draco')"`.

4. **Test** — `node tests/smoke.js` doit rester vert (aucune assertion
   n'utilise la clé `draco`).
   → vérif : tous scénarios verts.

## Décisions

- Héros de film → cutout transparent comme Harry (un seul `img/draco.png`,
  pas de `-original.png` ni de médaillon).
- Nom : « Drago Malefoy » (localisation française canonique).
- Maison : Serpentard. Stats de duelliste équilibré.
