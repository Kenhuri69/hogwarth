# Prompt Nano Banana — Portrait NPC `slughorn`

> Single-asset prompt pour **Horace Slughorn** (Maître des Potions,
> donneur du chaudron + 3 quêtes Slughorn + Slug Club / lien Maison —
> LOT P6.b2). PNJ central de toute la boucle de brassage.
>
> Format identique au sprint étages 8-10 et au Marchand d'Ombre (cf.
> [`nano-banana-prompt-marchand-ombre.md`](./nano-banana-prompt-marchand-ombre.md)) :
> portrait **256×256 RGB**, cadrage buste, fond opaque accepté.
> Style ancré dans [`IMG_STYLE.md`](../../IMG_STYLE.md) (template §8.2 sorcier,
> adapté portrait buste comme §8.3).
>
> **Statut** : ✅ **LIVRÉ** (2026-05-31). `img/npc/slughorn.png` généré
> (256×256 RGB) et câblé dans `js/npcs.js` (`portraitImg`).

---

## ⚠️ Règles de cadrage portrait (rappel)

Les portraits NPC tiennent nativement dans 256×256 (cadrage buste,
pas affecté par le zoom agressif des monstres). Garder :

- `bust shot, 3/4 face turn`
- `character occupies 75% vertically`
- `soft dark contextual background` (le runtime affiche dans une modale sombre)

---

## `slughorn` — Horace Slughorn

**Fichier cible** : `img/npc/slughorn.png`
**Format** : 256×256 RGB (fond opaque accepté)
**Template** : §8.2 sorcier (portrait buste)
**Personnage** :

> Maître des Potions de Poudlard, ancien directeur de Serpentard.
> Sorcier âgé, **corpulent et jovial**, à l'allure de bon vivant
> mondain. Collectionneur de talents (« le Club de Slug ») : il flatte,
> jauge et adore s'entourer de promesses. Sous la bonhomie, un fin
> stratège prudent. Tonalité : chaleureux, gourmand, un brin vaniteux,
> profondément attaché au confort. Confie son chaudron aux élèves
> sérieux et enseigne les recettes avancées.

**À distinguer de** `rogue` (Severus Rogue, l'autre maître des Potions) :
- `rogue` = sombre, sec, cheveux noirs gras, robe noire austère, sévérité.
- `slughorn` = lumineux, rond, moustache argentée, velours et confort,
  jovialité mondaine. L'opposé visuel exact.

### ⚠️ Deux règles non-négociables (apprises à la dure)

1. **Style = photo cinématique réaliste**, PAS du concept art peint. Tous
   les portraits NPC existants (`rogue.png`, `mcgonagall.png`,
   `marchand_clandestin.png`…) sont des **film stills photoréalistes**
   (plan serré tête-épaules, profondeur de champ, fond contextuel flou,
   éclairage de cinéma). Bannir « painterly / MTG illustration / concept
   art » — utiliser « photorealistic cinematic film still, 85mm lens ».
2. **Zéro IP nommée.** Gemini / Nano Banana **refuse** de générer un
   personnage canon nommé sous droits. NE PAS écrire « Horace Slughorn »
   ni « Harry Potter ». Décrire l'**archétype générique** (vieux
   professeur de potions jovial et corpulent) — la moustache argentée +
   le velours vert + la fiole le rendent reconnaissable sans le nommer.

### Prompt (validé, livré)

```
Photorealistic cinematic portrait of an elderly portly jovial wizard,
an old-fashioned potions professor, tight head-and-shoulders bust, square crop,
facing slightly 3/4 toward camera,
a man in his sixties with a large rotund build, ruddy good-natured face,
full cheeks and a double chin, a prominent bushy silver walrus moustache,
balding head with thin wisps of silvery-grey hair,
small twinkling pale-blue eyes with a shrewd flattering gleam,
a warm self-satisfied half-smile, realistic detailed aged skin texture with fine wrinkles,
wearing a plush bottle-green velvet waistcoat over a cream silk cravat,
a golden watch-chain glinting across his belly, an ornate emerald cravat pin,
shallow depth of field, blurred background of a cluttered candle-lit alchemy study
with shelves of glinting glass bottles and faint cauldron steam,
warm amber firelight from the lower left catching his moustache, soft green rim light,
cinematic film still, photorealistic, highly detailed, 85mm lens, moody warm lighting,
fantasy wizard character, 256x256 square portrait, no text, no watermark, no border
```

---

## Critères d'acceptation

- [ ] Format **256×256 exact**, RGB (alpha optionnel).
- [ ] Visage net, **jovial et corpulent** — pas un sorcier sec ou sévère.
- [ ] **Moustache argentée proéminente** (signature visuelle de Slughorn).
- [ ] Accents **vert/émeraude** (héritage Serpentard) sans tomber dans le
      sombre/austère de Rogue.
- [ ] Une **fiole/cristal** visible (rappelle son métier de potionniste).
- [ ] **Pas de fond transparent** (le runtime affiche en modale sombre).
- [ ] Ne ressemble PAS à Rogue (cheveux noirs gras, robe noire) — c'est
      l'opposé : lumineux, rond, velours.
- [ ] Poids < **150 KB** après `oxipng -o 4`.

## Si Nano Banana rate sur le 1er essai

Suffix de secours à ajouter en fin de prompt si la composition ne tient
pas :

```
jovial portly elderly wizard, large silver walrus moustache,
NOT thin, NOT severe, NOT dark-haired, NOT Severus Snape,
warm ruddy smiling face, bottle-green velvet waistcoat,
comfortable bon vivant collector of students, holding a potion phial
```

Variantes utiles :
- Trop maigre → ajouter `rotund heavy build, double chin, ample belly`
- Trop jeune → ajouter `elderly, balding, deep laugh lines, silver hair`
- Trop austère → ajouter `warm convivial smile, twinkling eyes, plush luxurious fabrics`

## Intégration post-livraison

1. Sauvegarder le PNG livré en `img/npc/slughorn.png` (256×256 RGB).
2. Optimiser : `oxipng -o 4 img/npc/slughorn.png`.
3. Mettre à jour `js/npcs.js` — entrée `slughorn` :

   ```diff
   -    portraitImg: "img/npc/_npc_prof_h.png",
   +    portraitImg: "img/npc/slughorn.png",
   ```

4. Smoke test : `node tests/smoke.js`.
5. Vérifier le rendu en jeu : rencontrer Slughorn (étage 2), ouvrir le
   dialogue → le portrait dédié remplace le placeholder.

## Notes d'intention narrative

- Slughorn est le **mentor potionniste** : chaleureux mais intéressé, il
  « collectionne » les élèves prometteurs (Slug Club). Le portrait doit
  respirer la bonhomie mondaine, pas l'autorité froide.
- Il partage le **sprite 3D au sol** générique `prof_h` (PNG
  `_npc_prof_h.png`) avec les autres professeurs — pas de sprite dédié
  prévu avant validation du portrait (cohérent avec marchand_ombre).
