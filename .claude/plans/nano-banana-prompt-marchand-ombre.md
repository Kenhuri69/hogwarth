# Prompt Nano Banana — Portrait NPC `marchand_ombre`

> Single-asset prompt pour le **Marchand d'Ombre** (PNJ vendeur itinérant
> rare, étage 11+) livré par PR #249 (sinks endgame combo A+E).
>
> Portrait **256×256 RGB**, cadrage buste serré, fond opaque accepté.
>
> **Statut** : ✅ **LIVRÉ** (2026-05-31). `img/npc/marchand_ombre.png`
> généré (256×256 RGB) et câblé dans `js/npcs.js` (`portraitImg`).
>
> ### ⚠️ Deux règles non-négociables
>
> 1. **Style = photo cinématique réaliste**, PAS du concept art peint.
>    Les portraits NPC du jeu (`rogue.png`, `mcgonagall.png`,
>    `marchand_clandestin.png`…) sont des **film stills photoréalistes**
>    (plan serré tête-épaules, profondeur de champ, fond flou, lumière
>    de cinéma). Bannir « painterly / MTG / concept art ».
> 2. **Zéro IP nommée / zéro franchise.** Gemini refuse les personnages
>    canon sous droits. Décrire un **archétype générique** (« fantasy
>    wizard character ») — jamais « Harry Potter universe ».

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
**Template** : §8.3 portraits NPC + accents alchimiques
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

### Prompt (validé, livré)

```
Photorealistic cinematic portrait of a mysterious itinerant alchemist merchant,
tight head-and-shoulders bust, square crop, 3/4 face turn,
an ageless hooded figure of indeterminate age, dignified and composed — NOT a back-alley thug,
deep travel-worn charcoal-grey hood pulled forward casting soft shadow over the upper face,
one visible pale weathered eye glowing faint amber-gold, the other lost in hood shadow,
high cheekbones, a faint alchemical burn-scar tracing the jawline, strands of silver-grey hair escaping the hood,
a slight knowing closed-mouth half-smile, realistic detailed weathered skin texture,
heavy charcoal travel robe with a frayed hem and road-dust on the shoulders,
an ornate brass phial-shaped clasp at the throat, a leather bandolier across the chest
holding three small glass vials catching cold light (one ruby-red, one sapphire-blue, one amethyst-purple),
shallow depth of field, blurred background of a vast ancient stone chamber with distant
phosphorescent runes and curling incense smoke,
warm amber candlelight from below lighting the vials and the visible eye, cold cyan rim light from behind,
cinematic film still, photorealistic, highly detailed, 85mm lens, mysterious mystical mood,
fantasy wizard character, 256x256 square portrait, no text, no watermark, no border
```

---

## Critères d'acceptation

- [ ] Format **256×256 exact**, RGB (alpha optionnel).
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
