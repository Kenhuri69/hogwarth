# Prompt Nano Banana — Portrait NPC `marchand_ombre`

> Single-asset prompt pour le **Marchand d'Ombre** (PNJ vendeur itinérant
> rare, étage 11+) livré par PR #249 (sinks endgame combo A+E).
>
> Portrait PNJ d'interaction : **256×256 RGB**, cadrage buste, fond opaque
> accepté. **Style PHOTORÉALISTE / cinématique**, conforme à la **Règle B —
> Portraits PNJ** de [`IMG_STYLE.md`](../../IMG_STYLE.md) **§12** (voir aussi
> le précédent livré [`nano-banana-prompt-sir-patrick.md`](./nano-banana-prompt-sir-patrick.md)).
>
> ⚠️ Ne PAS appliquer le template fantôme §8.3 (Règle A — sprites 512²
> painterly transparents) : un portrait PNJ n'est pas un sprite de combat.
>
> **Statut** : ✅ **Livré** — portrait dédié `img/npc/marchand_ombre.png`
> (256×256 RGB) intégré ; `npcs.js` pointe désormais dessus (plus sur
> `_wizard_generic.png`).

---

## ⚠️ Règles de cadrage portrait (rappel)

Les portraits NPC tiennent nativement dans 256×256 (cadrage buste,
pas affecté par le zoom agressif des monstres). Garder :

- `bust shot, 3/4 face turn`
- `character occupies 75% vertically`
- `soft dark contextual background` (le runtime affiche dans une modale sombre)

---

## `marchand_ombre` — Marchand d'Ombre

**Fichier cible** : `img/npc/marchand_ombre.png`
**Format** : 256×256 RGB (fond opaque accepté)
**Style** : **photoréaliste / cinématique** (Règle B — `IMG_STYLE.md` §12) +
accents alchimiques
**Personnage** :

> Vendeur **itinérant rare** apparaissant uniquement dans la Boucle
> Ténébreuse (étages 11+). Vit hors-temps, parcourt les profondeurs
> sans étage fixe. Trafique des élixirs permanents introuvables
> ailleurs — Élixir +PV, Élixir +PM, Pierre d'Âme, Philtre
> d'Endurance (exclusivité). Prix élevés (×1.4) et ferme : « Mon
> prix est ferme. Mon temps aussi : j'aurai disparu avant ton
> prochain étage. » Tonalité : mystique-pragmatique, presque
> intemporel. Ne raconte rien de lui-même.

**À distinguer de** `marchand_clandestin` (étage 8) :
- `marchand_clandestin` = receleur d'équipement Auror, ruelle sombre.
- `marchand_ombre` = colporteur d'alchimie ancestrale, mystique
  itinérant. Plus âgé, plus mystique, moins louche.

---

### Prompt

```
Photorealistic cinematic film still portrait of a mysterious itinerant alchemist merchant in Harry Potter universe,
bust shot, 3/4 face turn, hooded ageless figure of indeterminate gender,
deep travel-worn dark grey hood pulled forward casting shadow over upper face,
one visible pale weathered eye glowing faint amber-gold with arcane knowledge,
the other eye lost in deep hood shadow, dignified composed expression,
silvery-grey hair strands escaping the hood,
high cheekbones, faint alchemical burn-scar tracing the jawline,
slight knowing half-smile, mouth closed,
heavy charcoal-grey travel robe with frayed hem, dust of many roads on shoulders,
ornate brass alchemy clasp at the throat shaped as a stylized phial,
leather bandolier across chest holding three small glass vials catching cold light
(one ruby-red, one sapphire-blue, one amethyst-purple),
gloved hand visible at lower frame edge holding up a tiny luminescent flask for inspection,
warm candle-amber lighting from below illuminating the vials and the visible eye,
cold cyan rim light from behind suggesting cavern depth,
soft dark contextual background of vast ancient stone chamber with distant
phosphorescent runes, hint of incense smoke curling at frame edges,
palette: charcoal grey robe, weathered parchment skin, brass and ruby/sapphire/amethyst vial highlights,
faint cyan otherworldly rim,
shot on ARRI Alexa, 85mm lens, shallow depth of field, fine film grain, cinematic color grading,
photorealistic skin and fabric detail, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
timeless mystical pragmatic mood,
no text, no watermark, no signature, no border frame
```

---

## Critères d'acceptation

- [ ] Format **256×256 exact**, RGB (alpha optionnel).
- [ ] Rendu **photoréaliste / cinématique** (Règle B §12) — PAS painterly,
      PAS concept-art.
- [ ] Visage net, **un seul œil visible** (l'autre dans l'ombre de la capuche).
- [ ] Trois vials visibles sur la bandoulière (rouge / bleu / violet) —
      référencent les Élixirs +PV, +PM et la Pierre d'Âme.
- [ ] Vibe **intemporel** (ni jeune ni vieux clairement) — pas une
      vieille sorcière, pas un jeune voleur. Voyageur mystique.
- [ ] **Pas de fond transparent** (le runtime affiche en modale sombre).
- [ ] Pas un look de « back alley dealer » (le clandestin existant a
      déjà ce créneau) — préférer la noblesse usée du voyageur ancien.
- [ ] Poids < **150 KB** après `oxipng -o 4`.

## Si Nano Banana rate sur le 1er essai

Suffix de secours à ajouter en fin de prompt si la composition ne tient
pas :

```
mysterious enigmatic mood, NOT a back alley criminal, NOT a young rogue,
ancient itinerant wisdom, hood shadowing one half of face,
three visible alchemy vials on chest bandolier,
single glowing amber eye under hood, professional alchemist not a thug
```

Variantes utiles si la figure paraît trop jeune ou trop vieille :
- Trop jeune → ajouter `weathered face with subtle wrinkles, ageless gravitas`
- Trop vieille → ajouter `not elderly, indeterminate middle-age, smooth skin under the scar`

## Intégration post-livraison

1. Sauvegarder le PNG livré en `img/npc/marchand_ombre.png` (256×256 RGB).
2. Optimiser : `oxipng -o 4 img/npc/marchand_ombre.png`.
3. Mettre à jour `js/npcs.js` — entrée `marchand_ombre` :

   ```diff
   -    portraitImg: "img/npc/_wizard_generic.png",
   +    portraitImg: "img/npc/marchand_ombre.png",
   ```

4. Smoke test : `node tests/smoke.js` (scénario portraits NPC).
5. Vérifier le rendu en jeu : descendre à l'étage 11+, attendre le
   spawn (10 % par génération), ouvrir le dialogue.

## Notes d'intention narrative

- Le marchand est **sans foi ni étage** : il n'a pas d'allégeance, n'est
  ni hostile ni amical. Ses prix sont sa seule loi.
- Son inventaire est volontairement **rare et permanent** — pas de
  consommables de combat banals. Il vend ce qui change le perso pour
  toujours.
- Son sprite (au sol, en vue 3D du couloir) reste le générique sorcier
  V1 — pas de PNG dédié sprite avant que le portrait soit validé.
  Voir `.claude/plans/game-economy-gold-audit.md` §6.2 Option B pour
  l'évolution V2.
