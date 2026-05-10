# Plan d'exécution — Bloc A (code pur)

Branche : `claude/continue-svg-work-v6BEc`
Référence : `SVG_PLAN.md` (statut global 16/75 au lancement)

## Ordre choisi

A3 d'abord (les `<defs>` partagés alimentent A1/A4/A5), puis A1, A2,
A4, A5, A6.

## Conventions communes

- Aucun changement de nom d'export public (les fonctions / constantes
  ré-exposées via `window` restent inchangées).
- Conserver `viewBox="0 0 100 100"` pour les monstres et les `viewBox`
  existants pour les objets de scène (sinon les `cloneNode()` du HUD
  cassent).
- Ne pas augmenter le poids du bundle de plus de ~6 Ko gzippé global.
- Smoke test (`node tests/smoke.js`) doit rester vert après chaque
  étape ; commit séparé par étape.

---

## Étape A3 — `<defs>` partagés en tête de `icons.js`

**Objectif** : centraliser gradients radiaux d'ombrage, halo magique
et brume pour qu'A1 et B0x puissent les réutiliser via `url(#…)`.

**Approche** :
1. Ajouter un export `MONSTER_DEFS` (string) en début de fichier.
2. Le re-injecter dans chaque rendu via `getMonsterIconHtml()` :
   préfixer le SVG retourné par un bloc `<svg style="position:absolute;
   width:0;height:0">${MONSTER_DEFS}</svg>` une seule fois (drapeau
   global `_MONSTER_DEFS_INJECTED`) — évite la duplication par
   monstre.
3. Définitions : 4 IDs au total (`shadeRadial`, `halo`, `mist`,
   `glow`).

**Vérif** :
- Les SVG existants doivent continuer à s'afficher (pas d'usage
  immédiat des `url(#…)`, juste mise à disposition).
- `tests/smoke.js` reste vert.

---

## Étape A1 — Refonte des 5 SVG fallback de catégorie

**Objectif** : `bête`, `humain`, `fantôme`, `créature`, `être magique`
deviennent des silhouettes plus expressives, utilisant `MONSTER_DEFS`.

**Approche** : remplacer chaque SVG par une version avec :
- gradient radial d'ombrage (`url(#shadeRadial)`) en couche additive ;
- détails anatomiques modestes (mâchoires/crocs/cornes/etc.) ;
- aura `url(#halo)` discret pour `être magique` et `fantôme`.

**Vérif** :
- Choisir un monstre sans SVG dédié (ex : ajouter temporairement un
  `id` inconnu dans une page test) → pas testable proprement, donc
  vérifier visuellement via une capture du bestiaire après commit.
- `tests/smoke.js` reste vert.

---

## Étape A2 — Couleurs variantes monstres

**Objectif** : différencier nettement `normal` / `fierce` / `ancient`
/ `shiny` sans casser les visuels existants.

**Approche** :
- Garder `normal: null` (utilise la couleur de catégorie / monstre).
- Pousser `fierce` vers un rouge plus saturé (`#d8541a`).
- Pousser `ancient` vers violet profond avec teinte plus froide
  (`#5a2a8a`).
- Pousser `shiny` vers or clair lumineux (`#e6c248`).
- Vérifier dans `js/dungeon.js scaleMonster()` que ces variantes
  existent réellement et sont assignées (sinon noter dans le plan).

**Vérif** :
- Lancer le smoke test — couleur uniquement, pas de risque structurel.

---

## Étape A4 — Refonte des 4 SVG d'objets de scène

**Objectif** : moderniser visuellement `CHEST`, `SHOP`, `STAIRS_D`,
`STAIRS_U` dans `js/movement.js`.

**Approche** : repasser sur chaque SVG :
- `CHEST` : ajouter rivets + grain de bois + lueur dorée sortante.
- `SHOP` : auvent rayé deux tons + fioles colorées sur l'étal +
  cristal facetté.
- `STAIRS_D` : profondeur accentuée par un dégradé vertical sombre.
- `STAIRS_U` : lumière chaude au sommet + détails de pierre apparente.

**Vérif** :
- `tests/smoke.js` reste vert (les overlays sont chargés dans le
  smoke test scénario d'exploration).
- Vérification manuelle laissée à l'utilisateur via captures.

---

## Étape A5 — Animations SMIL/CSS subtiles

**Objectif** : ambiance vivante sans surcoût CPU/GPU notable.

**Approche** : préférer **CSS** (plus léger que SMIL côté GPU mobile)
en ajoutant ces classes utilitaires dans `css/style.css` :
- `.anim-float` (translateY ±2 % ; 4 s ease-in-out infinite)
- `.anim-twinkle` (opacity 0.6→1, 1.6 s)
- `.anim-pulse-aura` (scale 1→1.06, 2.4 s)
Application minimale :
- `.monster-icon[data-cat="fantôme"]` → `anim-float`
- Étincelles SVG du coffre → `<animate>` SMIL léger
- Aura `être magique` → `anim-pulse-aura`
Le HUD (`cloneNode()`) doit hériter sans casse.

**Vérif** :
- `tests/smoke.js` vert.
- `prefers-reduced-motion: reduce` désactive ces animations
  (media query dédiée).

---

## Étape A6 — Améliorer ornements UI

**Objectif** : compléter `img/svg/ornaments.html` (planche de
référence) avec des variantes plus utilisables (séparateurs minces,
sceau de session, cadre titre).

**Approche** :
- Ajouter 3-4 nouveaux ornements (séparateur fin doré, cadre de
  modale type parchemin, bouton-volute, badge-rune).
- Ne pas toucher aux 26 existants (planche d'archive).

**Vérif** :
- Ouvrir manuellement la page → utilisateur valide visuellement.
- `tests/smoke.js` n'inspecte pas cette page.

---

## Journal interne (à amender à chaque étape)

| Étape | Date       | Statut | Notes |
|-------|-----------|--------|-------|
| A3    | 2026-05-09 | ✅     | `MONSTER_DEFS_SVG` + `_ensureMonsterDefs()` ; 4 IDs (`shadeRadial`, `halo`, `mist`, `glow`) ; injection unique en tête de body |
| A1    | 2026-05-09 | ✅     | 5 fallback redessinés en utilisant `url(#shadeRadial)`, `url(#mist)`, `url(#halo)` ; détails (yeux multiples créature, capuche humain, marque runique être magique) |
| A2    | 2026-05-09 | ✅     | Saturation/contraste accrus ; `fierce` `#d8541a` ; `ancient` `#5a2a8a` ; `shiny` `#e6c248` ; `bête`/`créature`/`être magique` rééquilibrés |
| A4    | 2026-05-09 | ✅     | CHEST (gradients bois, halo, rivets), SHOP (auvent bicolore, fioles colorées, cristal facetté), STAIRS_D (vignette sombre, joints pierre), STAIRS_U (lumière chaude au sommet, briques) |
| A5    | 2026-05-09 | ✅     | `monsterFloat` 4 s sur `[data-cat="fantôme"]`, `monsterPulseAura` 2,6 s sur `[data-cat="être magique"]`, scintillement SMIL sur étincelles coffre, désactivés en `prefers-reduced-motion: reduce` |
| A6    | 2026-05-09 | ✅     | 4 nouveaux ornements à la fin de `ornaments.html` : séparateur fin, cadre parchemin avec sceau, bouton-volute "ENGAGER", badge-rune Algiz |
