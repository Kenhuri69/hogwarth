# Prompt Nano Banana — Portrait NPC `sir_patrick`

> Single-asset prompt pour **Sir Patrick Delaney-Podmore**, Maître de la
> Chasse Sans Tête (PNJ déterministe étage 6, ghost) livré par l'easter egg
> « La Chasse Sans Tête » (PR #363).
>
> Format identique au précédent `marchand_ombre` (cf.
> [`nano-banana-prompt-marchand-ombre.md`](./nano-banana-prompt-marchand-ombre.md)) :
> portrait **256×256 RGB**, cadrage buste, fond opaque accepté.
> Style ancré dans [`IMG_STYLE.md`](../../IMG_STYLE.md) (template §8.3 portraits NPC).
>
> **Statut V1** : `npcs.js` pointe sur le générique `img/npc/_npc_fantome.png`
> en attendant ce PNG dédié. Une fois le portrait livré, swap la valeur de
> `portraitImg` sur `img/npc/sir_patrick.png` (cf. § Intégration).
>
> ⚠️ **L'image se génère hors de l'environnement** (modèle Nano Banana) —
> ce fichier ne produit pas le PNG, il fournit le prompt prêt à l'emploi,
> comme pour tous les portraits du jeu.

---

## ⚠️ Règles de cadrage portrait (rappel)

Les portraits NPC tiennent nativement dans 256×256 (cadrage buste,
pas affecté par le zoom agressif des monstres). Garder :

- `bust shot, 3/4 face turn`
- `character occupies 75% vertically`
- `soft dark contextual background` (le runtime affiche dans une modale sombre)

**Spécificité fantôme décapité** : le « visage » du personnage est porté
par la **tête détachée** (tenue en main / sous le bras). Le cadrage buste
doit donc montrer **à la fois** le moignon du cou (col fraisé tranché net)
**et** la tête tenue à hauteur de poitrine, son visage tourné vers le
spectateur — c'est lui qui porte l'expression.

---

## `sir_patrick` — Sir Patrick Delaney-Podmore

**Fichier cible** : `img/npc/sir_patrick.png`
**Format** : 256×256 RGB (fond opaque accepté ; alpha optionnel)
**Template** : §8.3 portraits NPC + accents fantôme nacré
**Personnage** :

> Fantôme **Tudor** d'un noble joyeux et fanfaron, fondateur et Maître de
> la **Chasse Sans Tête**. Contrairement à Sir Nicolas (tête pendant par
> un lambeau de peau, mélancolique), Sir Patrick est **parfaitement et
> proprement décapité** : sa tête est entièrement séparée du corps, et il
> la porte fièrement sous le bras ou la brandit à bout de bras comme un
> trophée. Registre **comique / macabre bon enfant** : œil pétillant,
> sourire goguenard, prestance de sportif mondain qui n'a rien perdu de
> sa superbe en perdant sa tête. Translucide, nacré, lumineux.

**À distinguer de** `sir_nicolas` (déjà en jeu) :
- `sir_nicolas` = tête **encore attachée** par un lambeau, dodeline,
  expression douce-amère, fraise élisabéthaine simple.
- `sir_patrick` = tête **totalement détachée et tenue en main**,
  expression triomphante et joviale, tenue de noble Tudor plus apprêtée
  (pourpoint à crevés, fraise large, médaille de la confrérie).

---

### Prompt

```
Portrait of a jovial decapitated Tudor nobleman ghost in Harry Potter universe,
Sir Patrick Delaney-Podmore, founder of the Headless Hunt,
bust shot, 3/4 turn of the body, translucent pearly-white spectral figure glowing softly,
fully and cleanly severed neck with a smooth ghostly stump above an ornate slashed Tudor doublet,
the detached head held up proudly in one gloved hand at chest height beside the neck stump,
the carried head turned to face the viewer with a roguish triumphant grin,
twinkling mischievous eyes, neat pointed Tudor beard and curled moustache,
wavy shoulder-length hair, broad starched lace ruff collar around the severed head,
luxurious slashed velvet doublet with puffed shoulders, a chivalric medallion of the Headless Hunt on the chest,
one hand on hip in a dashing sportsman pose, faint wisp of spectral mist trailing from the shoulders,
semi-transparent see-through body letting the dark background glow through,
cool moonlit silver-blue rim light, faint warm candle glow on the grinning face,
soft dark contextual background of an ancient torch-lit stone hall with distant gothic arches,
palette: pearly translucent white and silver-blue spectral tones, ghostly teal shadows,
pale gold medallion accent, deep charcoal background,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
comic macabre good-natured mood, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

## Critères d'acceptation

- [ ] Format **256×256 exact**, RGB (alpha optionnel).
- [ ] Tête **entièrement détachée et tenue en main** (PAS pendante au cou) —
      c'est le trait distinctif vs Sir Nicolas.
- [ ] Moignon de cou **visible et net** au-dessus du col tranché.
- [ ] Expression **joviale / goguenarde** (œil pétillant, sourire) — registre
      comique, jamais effrayant ni gore.
- [ ] Figure **translucide / nacrée** (fantôme), pas un humain opaque.
- [ ] Médaille / insigne de la Chasse Sans Tête visible sur le pourpoint.
- [ ] Tenue **Tudor de cour** apprêtée (fraise large, pourpoint à crevés) —
      plus riche que le costume sobre de Sir Nicolas.
- [ ] Poids < **150 KB** après `oxipng -o 4`.

## Si Nano Banana rate sur le 1er essai

Suffix de secours à ajouter en fin de prompt si la composition ne tient
pas (tête raccrochée au cou, ou figure opaque) :

```
the head is COMPLETELY DETACHED from the body and carried in the hand,
clear empty gap between the severed neck stump and the held head,
NOT attached, NOT dangling, fully separated head held aloft like a trophy,
clearly translucent see-through ghost body, glowing spectral edges,
cheerful proud grin on the carried head, good-natured comic tone, not horror, not gore
```

Variantes utiles :
- Tête trop attachée → renforcer `wide visible gap between neck and head, head held at arm's length away from the body`.
- Trop effrayant / gore → ajouter `whimsical friendly expression, clean bloodless ghostly stump, lighthearted Casper-like tone`.
- Confondu avec Sir Nicolas → ajouter `proud dashing sportsman, richly dressed Tudor courtier, large ornate ruff, NOT a melancholy ghost`.

## Intégration post-livraison

1. Sauvegarder le PNG livré en `img/npc/sir_patrick.png` (256×256 RGB).
2. Optimiser : `oxipng -o 4 img/npc/sir_patrick.png`.
3. Mettre à jour `js/npcs.js` — entrée `sir_patrick` :

   ```diff
   -    portraitImg: "img/npc/_npc_fantome.png",
   +    portraitImg: "img/npc/sir_patrick.png",
   ```

4. Smoke test : `node tests/smoke.js` (scénario `MonsterImages` / portraits NPC
   + `HeadlessHunt`).
5. Vérifier le rendu en jeu : descendre à l'étage 6, trouver Sir Patrick,
   ouvrir le dialogue → portrait affiché dans `#npc-dialog`.

## Notes d'intention

- Le **sprite 3D** au sol (couloir) reste le générique `fantome`
  (`NPC_SPRITE_SRC`, partagé par tous les fantômes) — pas de PNG sprite
  dédié en V1, cohérent avec la convention `marchand_ombre`.
- Le portrait est un **nice-to-have cosmétique** : tant qu'il n'est pas
  livré, le générique `_npc_fantome.png` reste affiché sans dégradation
  fonctionnelle (le rendu `#npc-dialog` n'a pas de fallback `onerror` —
  d'où l'interdiction de pointer `portraitImg` vers un fichier absent
  avant livraison).
