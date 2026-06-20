# Prompts Nano Banana — Assets image de fin (Pass d'assets de fin, Phase 4)

> Prompts prêts à coller pour les **illustrations de fin** manquantes. Les deux
> images sont déjà **référencées dans le code** avec repli silencieux (`onerror`
> → masquée) : il suffit de déposer le `.jpg` au bon chemin, **aucun changement
> de code ni cache-bump** (les assets `img/` ne sont pas cache-bustés par `?v`).
>
> Style : **photoréaliste / cinématique** (film still HP), cohérent avec les
> scènes existantes (`img/scenes/title.jpg`, `death.jpg`). Cf.
> [`IMG_STYLE.md §12.2`](../../IMG_STYLE.md).

---

## ⚠️ Contraintes de cadrage (lire avant de générer)

Les deux images sont affichées en **bandeau large recadré** :
`width:100%; max-height:200px; object-fit:cover` (≈ ratio **16:6** visible,
recentré). Donc :

- **Format source** : paysage **1280×720** (16:9). Le runtime recadre la bande
  centrale → garder le **sujet/lumière clé dans le tiers vertical central**.
- **Valeurs sombres dominantes** (la modale de fin est sombre) avec **un seul
  foyer lumineux** chaud — l'image doit « respirer » derrière du texte clair.
- **Pas de texte, pas de personnage en gros plan reconnaissable** (éviter les
  visages d'acteurs) : silhouettes, ambiance, lieu.

Suffix universel à coller à TOUS les prompts de scène :
```
cinematic film still, Harry Potter universe, photorealistic, dramatic atmospheric lighting,
shot on ARRI Alexa, anamorphic lens, shallow depth of field, fine film grain, cinematic color grading,
1280x720 landscape, dark moody palette with a single warm light source, key subject in central horizontal band,
no text, no watermark, no signature, no people in sharp close-up, no border frame
```

---

### `ending_victory.jpg` — Victoire sur Voldemort (Ch.14 §14.6.1)
**Fichier cible** : `img/scenes/ending_victory.jpg`
**Beat** : Voldemort Ressuscité vaincu (ét. 10). La **dernière serrure** cède —
la lumière revient sur Poudlard, mais l'escalier le plus profond s'ouvre enfin
(triomphe **doux-amer** : la victoire révèle qu'il restait quelque chose en
dessous). Ton : aube, soulagement, mystère qui pointe.

```
cinematic film still of dawn breaking over the ruined Great Hall of Hogwarts after a final battle,
the dark seal shattered, warm golden sunrise piercing through a broken stained-glass window and settling smoke,
two small heroic silhouettes standing far away in the light, seen from behind, tiny against the vast hall,
shafts of warm light cutting through cold blue shadow, faint floating embers and dust motes,
on the stone floor a faint spiral crack glows faintly downward in the foreground shadow (a hint the depths still open),
triumphant but bittersweet mood, hope tinged with mystery,
Harry Potter universe, photorealistic, cinematic film still, dramatic atmospheric lighting,
shot on ARRI Alexa, anamorphic lens, shallow depth of field, fine film grain, cinematic color grading,
1280x720 landscape, dark moody palette with a single warm sunrise light source, subject in central horizontal band,
no text, no watermark, no signature, no people in sharp close-up, no border frame
```

---

### `ending_break_cycle.jpg` — Briser le Cycle (Ch.14, fin 🕊️)
**Fichier cible** : `img/scenes/ending_break_cycle.jpg`
**Beat** : au cœur de l'Avant-Monde runique, le héros **dépose les Éclats sur la
faille** — non pour la fuir mais la regarder jusqu'au fond. *« Le battement
organique de l'Avant-Monde ralentit, ralentit… puis se tait. Le froid recule
d'un pas. »* Ton : apaisement solennel, froid qui reflue, lumière calme.

```
cinematic film still inside a vast ancient runic cavern, the Avant-Monde, primordial and silent,
glowing fragments of light (the Eclats) laid down in a circle on the edge of a deep luminous fault in the rock,
a lone small silhouette kneeling at the edge of the chasm seen from behind, tiny against monolithic rune-carved walls,
the faint pulsing glow of a sleeping heartbeat deep in the fault fading to stillness, cold blue frost receding from the stones,
a single soft warm-white light rising gently from the placed fragments, calm and solemn,
ancient glowing runes on the walls dimming to a peaceful rest, drifting frost particles settling,
serene melancholic mood of acceptance and quiet, the cold retreating,
Harry Potter universe, photorealistic, cinematic film still, dramatic atmospheric lighting,
shot on ARRI Alexa, anamorphic lens, shallow depth of field, fine film grain, cinematic color grading,
1280x720 landscape, dark cold palette with a single soft warm light source, subject in central horizontal band,
no text, no watermark, no signature, no people in sharp close-up, no border frame
```

---

## Câblage APRÈS génération (ultra-léger — aucun code)

1. Déposer les 2 fichiers : `img/scenes/ending_victory.jpg` et
   `img/scenes/ending_break_cycle.jpg` (les `src` sont **déjà** câblés dans
   `js/endgame.js` et `js/break-cycle.js`, repli `onerror` si absent).
2. **Compresser** (cohérent avec les scènes existantes ~150-210 KB) :
   ```bash
   # redimensionner si besoin + recompresser JPEG qualité ~82
   python3 - <<'PY'
   from PIL import Image
   for f in ['ending_victory','ending_break_cycle']:
       im = Image.open(f'img/scenes/{f}.jpg').convert('RGB')
       im.thumbnail((1280,1280))
       im.save(f'img/scenes/{f}.jpg', quality=82, optimize=True)
   PY
   ```
3. **Pas de cache-bump** : `img/` n'est pas cache-busté par `?v` (servi en
   stale-while-revalidate). **Pas de changement JS/CSS** → smoke non requis ;
   un coup d'œil en jeu (écran de victoire + Briser le Cycle) suffit à valider.

---

## Note : fonds parchemin Codex — DÉJÀ LIVRÉS ✅

Le roadmap listait « fonds parchemin Codex par acte » dans le pass d'assets de
fin, **mais ils existent déjà** : `img/codex/parchment_{a,b,c,d}.png` sont
présents et câblés (`css/codex.css` : `.codex-act-1..4` → vélin propre / taché &
gelé / recousu / runique). **Aucun prompt nécessaire** — rien à régénérer sauf
volonté d'amélioration esthétique.

> Génération raster hors de portée de l'agent — ce fichier fournit les
> **prompts** prêts à coller (Nano Banana / Gemini) et le câblage trivial.
