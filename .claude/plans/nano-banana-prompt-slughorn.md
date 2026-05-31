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
> **Statut V1** : `npcs.js` pointe sur `img/npc/_npc_prof_h.png` (placeholder
> générique « professeur homme » partagé) en attendant ce PNG dédié. Une
> fois le portrait livré, swap la valeur de `portraitImg` sur
> `img/npc/slughorn.png`.

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

### Prompt

```
Portrait of Horace Slughorn, Potions Master in Harry Potter universe,
bust shot, 3/4 face turn, elderly portly jovial wizard,
large rotund build with a comfortable belly, ruddy good-natured face,
prominent silver walrus moustache, balding head with wisps of silvery hair,
small twinkling pale-blue eyes with a shrewd flattering gleam,
warm self-satisfied half-smile of a bon vivant and collector of talents,
plush bottle-green velvet waistcoat over a cream silk shirt,
golden watch-chain across the belly, ornate brass-and-emerald cravat pin,
one plump hand raised holding a small crystal potion phial up to the light
admiringly, soft warm amber candlelight from a hearth catching the
moustache and the phial, faint emerald rim light suggesting Slytherin
heritage, soft dark contextual background of a cluttered potions study
with shelves of glinting bottles and a faint cauldron-steam haze,
palette: bottle-green velvet, warm ruddy skin, silver moustache,
brass and amber highlights, emerald accents,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
warm convivial shrewd mood, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
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
