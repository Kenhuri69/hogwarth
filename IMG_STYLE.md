# IMG_STYLE.md — Guide visuel des images générées

> Source de vérité pour la génération de **PNG monstres / PNJ / scènes** via LLM image
> (workflow décrit dans `SVG_PLAN.md` Bloc C). Style dérivé des PNG validés
> (`chat_norris`, `serpent_cachot`, `myrtle`, `sorciere_tenebres`, `cornichon`).
>
> **Objectif** : éliminer les re-runs en fixant un cadre unique avant génération.

---

## 1. Spécifications techniques

| Champ | Valeur |
|-------|--------|
| Dimensions natives | **512 × 512 px** (carré) |
| Format final | PNG-32 RGBA, non-interlacé |
| Fond | **Transparent total** (alpha 0 strict) |
| Marge intérieure | ≥ 8% sur les 4 côtés (sujet ne touche jamais les bords) |
| Surface occupée | 75-85% du cadre |
| Compression cible | < 350 KB (sinon `oxipng -o 4` après intégration) |

---

## 2. Style pictural

- **Digital painting** type concept-art Harry Potter / Magic: the Gathering.
  Pas de photoréalisme pur, pas de cartoon, pas de pixel art.
- Coups de pinceau visibles, matière (poils, écailles, tissu) lisible.
- Niveau de détail : **silhouette reconnaissable à 80×80 px** (taille
  d'affichage en combat). Pas de micro-détails noyés.
- Contour : pas de cerne noir explicite. La séparation se fait par la valeur
  et la couleur, pas par un trait.

---

## 3. Composition

- **Cadrage** : 3/4 buste à plein corps selon la créature.
  - Bipèdes / humains → plein corps (sorcière, mangemort, peeves).
  - Quadrupèdes / serpents → 3/4 dynamique avec tête en proue.
  - Petites créatures volantes → en vol, ailes/membres déployés.
- **Posture** : **en action, jamais statique**. Chat en arrêt, serpent en
  S-pose gueule ouverte, sorcière bras tendu, etc.
- **Regard** : vers le viewer ou en 3/4. Donne l'intention.
- **Centre optique** légèrement au-dessus du milieu du cadre (tête en haut).

---

## 4. Lumière

- **Source principale** : haut-gauche, douce, à 45°.
- **Lumière de remplissage** : froide (cyan léger) côté opposé pour décoller
  la silhouette du fond transparent.
- **Ombres** : portées au sol **bannies** (créerait une bavure dans l'alpha).
  Ombre interne uniquement (sous le ventre, sous le menton).
- **Contre-jour magique** : autorisé pour boss / créatures à aura — voir §6.

---

## 5. Palette par catégorie

Reprend `MONSTER_BASE_COLORS` (`js/icons.js`) en mode peint.

| Catégorie | Dominante | Accent | Référence |
|-----------|-----------|--------|-----------|
| `bête`         | Terre, ambré, gris-brun | Or des yeux | `chat_norris` |
| `humain`       | Noir profond + tissu Poudlard | Argent ou or selon allégeance | `mangemort_*` |
| `fantôme`      | Bleu argenté translucide | Cyan pâle, blanc | `myrtle` |
| `créature`     | Vert émeraude / brun écailleux | Œil jaune ou vert acide | `serpent_cachot`, `kappa_douves` |
| `être magique` | Une couleur signature saturée + or | Lueur dans les yeux | `cornichon` (bleu vif) |

Pour les **variantes** (`fierce` / `ancient` / `shiny`) : ne pas changer la
palette de base. La teinte sera appliquée au runtime via CSS filter
(cf. `css/style.css` classes `.variant-*`).

---

## 6. Effets magiques (aura, brume, particules)

**Critique pour la conservation alpha.**

- Toute brume / fumée / aura doit être **translucide** (alpha 30-70%),
  jamais opaque sur fond noir.
- Préférer des panaches courts collés au sujet plutôt que de grandes
  émanations qui dépassent le cadre.
- Particules : 3-8 max, pas une nuée. Le moteur ajoute sa propre
  ambiance par dessus (`drawTorch`, etc.).
- Runes lumineuses : OK si intégrées au volume du personnage
  (paume, sceptre, broche), pas en flottement libre.

---

## 7. Pipeline post-traitement (alpha)

Décision basée sur le contenu :

| Cas | Modèle alpha |
|-----|--------------|
| Sujet opaque, contours nets (chat, serpent, sorcier en robe) | `rembg` (u2net) |
| Sujet avec **ailes translucides, voile, fumée, fantôme** | **`birefnet-general`** (obligatoire) |
| Doute | `birefnet-general` par défaut (plus lent mais préserve mieux) |

**Script de référence** : `tools/process_monster_png.py`
(détourage + trim + recentrage 8 % + resize 512 + optimize PNG, avec
auto-vérification des critères §9).

```
python3 tools/process_monster_png.py \
    --src /chemin/image_generee.png \
    --id  <monster_id>            \
    [--model birefnet|u2net]      \
    [--dry-run]                   # sort dans /tmp/<id>_check.png
```

---

## 8. Prompts-types

Trois templates réutilisables. Remplir les champs `[…]` avant envoi.

### 8.1 Bête / créature animale

```
Concept art digital painting of [créature], Harry Potter universe style,
[posture: arrêt menaçant / bondissant / dressée],
3/4 view, [détail signature: crocs visibles / yeux ambre brillants / fourrure hérissée],
soft directional light from upper-left,
warm earth palette ([couleur dominante]),
fully transparent background, no ground shadow, no border,
centered subject filling 80% of square frame,
512x512, painterly brush strokes, MTG illustration quality
```

### 8.2 Humain / sorcier / mangemort

```
Concept art digital painting of [personnage] in Harry Potter universe,
full body, dynamic pose, [action: lançant un sortilège / en marche menaçante],
[tenue: robe Poudlard / cape de mangemort / habit déchiré],
dramatic upper-left lighting with cool cyan rim light,
[palette: noir profond + violet / rouge sang + or / gris cendre],
fully transparent background, no shadow on ground,
subject occupies 80% of 512x512 square frame,
painterly style, no outline, MTG concept art quality
```

### 8.3 Fantôme / être magique éthéré

```
Concept art digital painting of [créature éthérée], Harry Potter ghost,
[posture flottante: bras tendus / recroquevillé / en attaque],
translucent body fading to mist at the edges,
silvery blue palette with cyan glow,
soft volumetric light, no harsh shadows,
fully transparent background — preserve translucent areas in alpha,
floating subject centered in 512x512 frame,
ethereal painterly style, MTG-quality illustration
```

> **Suffix universel à coller à tous les prompts :**
> `no text, no watermark, no signature, no border frame, no ground line`

---

## 9. Critères d'acceptation

Avant de cocher la case dans `SVG_PLAN.md`, vérifier :

- [ ] **Alpha** : pas de halo blanc / gris autour du sujet (zoom 400%, fond noir).
- [ ] **Cadrage** : sujet occupe 75-85%, marge ≥ 8% partout.
- [ ] **Silhouette** : reconnaissable à 80×80 px (test rapide via inspecteur).
- [ ] **Palette** : conforme à la catégorie (§5).
- [ ] **Posture** : non-statique, regard intentionnel.
- [ ] **Poids** : < 350 KB après optimisation.
- [ ] **Pas d'ombre au sol**, pas de bordure, pas de signature.

Les critères automatisables (dimensions, mode RGBA, %alpha 0/255, occupation,
poids) sont validés à l'intégration par `tools/process_monster_png.py`.
Le smoke test (`node tests/smoke.js` scénario 5) re-vérifie en CI le
color-type RGBA sur tous les PNG embarqués.

Si un seul critère échoue → re-run plutôt qu'intégration "à peu près".

---

## 10. Anti-patterns observés

À ne pas refaire :

- **Cornichon C03 v1** : ailes translucides écrasées par `rembg`
  (pipeline corrigé en passant à `birefnet-general` — cf. journal #6).
- **Aura externe trop large** qui dépasse le cadre → coupée à l'intégration,
  rend le sujet décentré.
- **Pose frontale parfaitement symétrique** → manque de vie, refusée par défaut.
- **Fond gris clair** au lieu de transparent → bavure visible une fois en jeu
  par-dessus le combat overlay sombre.

---

## 11. Liens

- Plan global : [`SVG_PLAN.md`](./SVG_PLAN.md)
- Catégories monstres : `js/monsters.js` (champ `category`)
- Couleurs runtime : `js/icons.js` → `MONSTER_BASE_COLORS`, `VARIANT_COLORS`
- Intégration : `getMonsterIconHtml()` dans `js/icons.js:1163`
