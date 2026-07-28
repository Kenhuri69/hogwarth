# Prompts Nano Banana / Gemini — Assets de fin (Chapitre 14, P4)

> Assets **de fin de partie** câblés par la Phase P4 (`.claude/plans/chapter-14-endings.md` §6).
> Le jeu fonctionne **sans eux** (chargement défensif : `onerror` → image masquée,
> sample audio absent → repli synthèse). Générer puis déposer les fichiers aux
> chemins indiqués **active** automatiquement le rendu — **aucun changement de code**
> requis (sauf l'icône Codex, voir §3, qui demande une ligne + un bump de cache).
>
> Ces illustrations sont des **SCÈNES grand format** (pas des sprites §Règle A ni
> des portraits §Règle B d'`IMG_STYLE.md`). On suit donc le style **painterly /
> concept-art Harry Potter / Magic: the Gathering** (cf. §2 d'`IMG_STYLE.md`),
> mais en **cadrage paysage cinématique**, à l'image des scènes existantes
> (`img/scenes/title.jpg`, `classroom.jpg`, `death.jpg`, `film_heroes.jpg`).
>
> **Charte émotionnelle** (§14.6.1) : la victoire est **dorée et chaude** (on a
> *gagné*) ; briser le Cycle est **bleu-froid qui se réchauffe d'un degré** (on a
> *compris*) ; perpétuer/vertige est **noir profond** (on a *choisi le gouffre*).

---

## Spécifications communes (scènes)

| Champ | Valeur |
|-------|--------|
| Format | **JPG** (fond opaque), cohérent avec les scènes existantes |
| Cadrage | **paysage cinématique**, ~**1280 × 640** (≈ 2:1) — affiché en bannière `width:100%`, `max-height:200px`, `object-fit:cover` |
| Style | **digital painting concept-art HP / MTG** (coups de pinceau visibles, pas de photoréalisme pur, pas de cartoon) |
| Sujet | occupe le cadre ; **aucun texte / watermark / signature / cadre** dans l'image |
| Poids cible | < **250 KB** (recompresser si besoin) |

> ⚠️ **Pas de texte dans l'image** : tous les titres/discours sont rendus en
> HTML par-dessus. Une scène avec du faux-texte gravé lisible jurerait.

---

## 1. `ending_victory.jpg` — Victoire (registre A/B)

**Fichier cible** : `img/scenes/ending_victory.jpg`
**Câblé dans** : `#victory-modal` (haut de la modale, `js/endgame.js — showVictoryScreen`)
**Registre** : épique, soulagé, **ouvert** — doré et chaud.

> Le matin se lève sur Poudlard après la chute de Voldemort. Le château
> « respire » à nouveau ; mais l'escalier le plus profond, scellé par la peur,
> s'ouvre enfin — une promesse d'au-delà, pas une fermeture.

### Prompt

```
Epic painterly concept-art landscape, Harry Potter / Magic the Gathering style,
warm golden dawn breaking over Hogwarts castle after a great victory,
the silhouette of the ancient castle against a sky of amber, rose-gold and soft cream light,
warm sunbeams piercing dissipating storm clouds, a sense of relief and breath returning to the world,
in the foreground a grand worn stone staircase descending into a faint warm-gold glow far below,
the deepest stair unsealing, motes of golden light and gentle embers rising like fireflies,
subtle phoenix-feather warmth in the air, the shadow lifting,
brushstroke texture visible, cinematic warm color grading, painterly not photoreal,
palette: amber gold, rose-gold, warm cream, deep warm browns, soft ember orange,
hopeful triumphant yet open-ended mood, dawn after the longest night,
wide cinematic landscape composition, no characters in close-up, no text, no watermark, no border
```

### Variante si la composition rate
- Trop « fin fermée » / coucher de soleil triste → ajouter `sunrise not sunset, ascending hopeful light, the door opens not closes`.
- Trop chargé → ajouter `simple uncluttered composition, single focal glow, generous sky`.

---

## 2. `ending_break_cycle.jpg` — Briser le Cycle (registre C)

**Fichier cible** : `img/scenes/ending_break_cycle.jpg`
**Câblé dans** : cinématique `#break-cycle-overlay` (`js/break-cycle.js — confirmBreakCycle`)
**Registre** : tragique, mythique, **apaisé** — bleu-froid qui se réchauffe d'un degré.

> Au fond de l'Avant-Monde, la faille est rescellée **par le bas**. Le froid
> recule d'un pas, la spirale s'apaise le temps d'un souffle. Une colombe 🕊️ —
> la paix qu'on emporte en redescendant.

### Prompt

```
Solemn mythic painterly concept-art landscape, Harry Potter / Magic the Gathering style,
the bottom of an ancient pre-historic underground chamber of towering runic megaliths,
a great vertical fissure of cold light in the rock being resealed from below,
faint glowing runes along the stone slowly settling and dimming into calm,
a single pale dove of soft light rising from the sealed fissure toward the viewer,
the oppressive cold cyan-blue glow warming by one gentle degree toward a faint amber at the dove,
mist and ancient dust settling, a held breath of peace after great effort,
the spiral of the loop quieting rather than closing, vast silent stillness,
brushstroke texture visible, painterly not photoreal, cinematic color grading,
palette: deep cold cyan-blue, slate grey megaliths, soft violet shadow,
a single warming amber-gold accent at the dove and the sealed seam,
tragic mythic yet peaceful and accomplished mood,
wide cinematic landscape composition, no text, no watermark, no border
```

### Variante si la composition rate
- Trop froide / sans espoir → renforcer `one single warm amber glow growing at the centre, peace not despair`.
- Colombe absente ou kitsch → `a subtle abstract dove-shaped wisp of light, not a literal bird`.

---

## 3. `epilogue.png` — Icône Codex de l'entrée `epilogue`

**Fichier cible** : `img/codex/epilogue.png`
**Statut** : **optionnel** — l'entrée Codex `epilogue` (P3) utilise déjà l'emoji
📜 par défaut. Cette icône PNG l'enrichit visuellement.
**Format** : **256 × 256 PNG** (fond transparent ou parchemin sombre), painterly,
lisible à 64 px.

> Un parchemin gravé dont une plume achève la **dernière ligne** ; un sceau de
> cire dorée. La « mémoire écrite » de comment l'histoire s'est conclue.

### Prompt

```
Painterly concept-art icon on transparent background, Harry Potter / Magic the Gathering style,
an aged curling parchment scroll seen at a slight 3/4 angle,
a fine quill pen finishing the very last line of writing (no readable text, just elegant ink strokes),
a small golden wax seal pressed at the corner glowing faintly,
warm candlelight from the side, soft embers, a sense of a story coming to rest,
brushstroke texture visible, rich warm parchment tones with deep gold seal accent,
readable as a small icon at 64px, centred subject, ~80% of frame,
palette: aged cream parchment, warm sepia ink, deep gold wax seal, soft amber glow,
solemn reflective mood, no border frame, no watermark, no signature, no legible text
```

### Intégration post-livraison (icône Codex)
1. Déposer `img/codex/epilogue.png` (256×256), optimiser : `oxipng -o 4 img/codex/epilogue.png`.
2. `js/codex.js` — entrée `epilogue` : ajouter `iconImg: 'img/codex/epilogue.png',`
   (à côté de `icon: '📜'`).
3. **Bump cache PWA** (skill `cache-bump`) : `codex.js` `?v` + `CACHE_VERSION`.
4. `node tests/smoke.js` (scénario `EndingEpilogue`).

> ⚠️ Tant que le PNG n'existe pas, **ne pas** poser `iconButton` : le rendu
> Codex (`ui-codex.js`) n'a pas de repli `onerror` pour `iconImg` → un chemin
> mort afficherait une image cassée. L'emoji 📜 par défaut reste le choix sûr.

---

## 4. `ending_spiral.jpg` — Vertige / Perpétuer (⏸️ différé)

**Fichier cible (réservé)** : `img/scenes/ending_spiral.jpg`
**Statut** : **différé / non câblé** — il n'existe **pas d'écran** dédié à la
posture « Perpétuer / vertige ★ N » (le refus `declineBreakCycle` n'affiche
qu'un toast). À générer **seulement si** un futur écran l'utilise (ex. P5/NG+
ou un beat de vertige en série ★ N). Prompt fourni pour référence.

### Prompt (pour mémoire)

```
Vertiginous painterly concept-art landscape, Harry Potter / Magic the Gathering style,
an endless dark descending spiral of ancient stone stairs plunging into black depths,
cold faint glints of runic light spiralling down into nothing, no bottom visible,
a lone tiny figure silhouette continuing downward, dwarfed by the abyss,
oppressive sense of a descent without end, the myth devouring the wanderer,
brushstroke texture, near-monochrome deep blacks and charcoals with faint cold blue glints,
no warmth, no exit, vertiginous mood,
wide cinematic landscape composition, no text, no watermark, no border
```

---

## 5. `ending_break.ogg` — Sample audio (hors Gemini)

**Fichier cible** : `audio/ending_break.ogg`
**Câblé dans** : `AudioSystem.playEndingTheme()` (`js/audio-music.js`), appelé par
`confirmBreakCycle`. **Défensif** : absent (404) → repli sur le sting procédural
`playVictory()` (comportement actuel inchangé).

> ⚠️ **Asset audio — hors périmètre Gemini/Nano Banana** (générateur d'images).
> À produire/sourcer séparément (banque libre de droits ou synthèse).

**Brief sonore** : nappe douce et apaisée, one-shot ~15–30 s, registre « *abyss*
qui se tait » — pad de cordes/chœur grave très doux, une note chaude qui émerge
puis s'éteint, pas de percussion, pas de montée épique. Encoder en **OGG Vorbis**
(`audio/ending_break.ogg`). Pas de cache-busting `?v` requis (les `audio/` sont
servis en *stale-while-revalidate*, pas précachés).

---

## Récapitulatif des cibles

| Asset | Chemin | Câblage | Statut |
|-------|--------|---------|--------|
| Victoire | `img/scenes/ending_victory.jpg` | `#victory-modal` (endgame.js) | ✅ câblé (défensif) |
| Briser le Cycle | `img/scenes/ending_break_cycle.jpg` | cinématique (break-cycle.js) | ✅ câblé (défensif) |
| Icône épilogue | `img/codex/epilogue.png` | entrée Codex `epilogue` | ⚙️ 1 ligne post-livraison |
| Spirale / vertige | `img/scenes/ending_spiral.jpg` | — | ⏸️ différé (pas d'écran) |
| Sting de fin | `audio/ending_break.ogg` | `playEndingTheme()` (audio-music.js) | ✅ câblé (repli synthèse) |
