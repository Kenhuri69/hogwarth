# Nano Banana — Portrait PNJ : Gardien de la Boucle

> Régénération du portrait de dialogue de `gardien_boucle` (Boucle Ténébreuse).
> **Cause** : le fichier actuel `img/npc/gardien_boucle.png` est un **plein corps
> painterly 512×512** (style Règle A — sprite 3D), affiché minuscule et sans
> visage lisible dans la boîte de dialogue 128×128 (`object-fit: cover`). C'est
> « l'erreur classique » documentée en `IMG_STYLE.md` §12.
> **Cible** : **buste photoréaliste 256×256 RGB** conforme à la **Règle B** (§12).
> L'art plein corps reste récupérable dans l'historique git (commit `d5c7e63`)
> si on veut plus tard un sprite 3D dédié.

## Personnage

Esprit-veilleur de la Boucle Ténébreuse — un fantôme nacré, homme d'âge mûr,
distingué, vêtu à la mode d'une autre époque (fraise/col à godrons élisabéthain,
pourpoint et cape). Expression sereine mais lasse de celui qui a vu d'innombrables
cycles se répéter ; il a **perdu son nom propre à force de récurrences**. Veille à
l'entrée des Ruines Anciennes runiques.

## Prompt (Règle B §12.3)

```
Photorealistic cinematic film still portrait of an ancient spectral guardian ghost
in the Harry Potter universe, bust shot, 3/4 face turn,
translucent pearlescent ethereal ghost rendered as a film VFX (not painted),
distinguished middle-aged man with weary serene wise expression,
faintly glowing spectral blue-white tones, Elizabethan ruffled collar and period
doublet with a draped cloak, faint runic light reflecting on his form,
realistic skin and fabric detail seen through translucency, atmospheric lighting,
warm key light with cool ghostly rim light,
soft out-of-focus dark contextual background of ancient runic stone ruins,
shot on ARRI Alexa, 85mm lens, shallow depth of field, fine film grain, cinematic color grading,
256x256 portrait frame, character occupies 75% vertically, solemn and timeless mood,
no text, no watermark, no signature, no border frame
```

## Intégration (quand le PNG est généré) — `IMG_STYLE.md` §12.4

1. Déposer le PNG **256×256 RGB** en `img/npc/gardien_boucle.png` (écrase l'actuel).
   - Si l'image arrive sur fond damier aplati (Gemini/Nano Banana) :
     `python3 tools/dechecker_png.py <src.png> img/npc/gardien_boucle.png`
     (puis vérifier qu'on a bien un fond opaque sombre, pas transparent).
   - Redimensionner à 256×256 exact si la sortie est plus grande.
2. `oxipng -o 4 img/npc/gardien_boucle.png` (cible < 150 KB).
3. `js/npcs-b.js` — l'entrée porte déjà `portraitImg: "img/npc/gardien_boucle.png"`
   (aucune modif de câblage nécessaire).
4. Les assets `img/**` ne sont **pas** soumis au bump cache `?v=` (servis en
   stale-while-revalidate) — pas de skill `cache-bump`. Bumper le cache **uniquement**
   si on touche un `js`/`css`.
5. `node tests/smoke.js`.

## Critères d'acceptation (§12.5)

- [ ] **256×256 exact**, RGB.
- [ ] **Photoréaliste** (cohérent avec `dumbledore.png`, `sir_nicolas.png`), pas painterly.
- [ ] Buste 3/4, fantôme translucide nacré, fond runique sombre flou.
- [ ] Poids < **150 KB**.
- [ ] En jeu : visage du Gardien clairement lisible dans la modale `#npc-dialog`.
