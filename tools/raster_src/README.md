# tools/raster_src/ — sources raster d'icônes (Gemini / Nano Banana)

Dépose ici les icônes générées par LLM image, nommées **`<id>.png`** (l'`id`
exact de l'item dans `js/data.js`), puis encadre-les avec le pipeline commun :

```bash
python3 tools/icon_factory.py --raster <id1> <id2> ...   # ids précis
python3 tools/icon_factory.py --raster                   # tous ceux présents ici
```

Le mode `--raster` **saute** les passes painterly (le sujet est déjà peint) et
n'applique que le **halo de rareté** (lu depuis la recette `RECIPES[id]`) + le
**cartouche doré** + les **mipmaps** 16-64 → cohérence garantie avec les autres
icônes. Sortie : `img/icons_new/<id>_{16,24,32,48,64}.png` (mêmes chemins que
`ITEM_ICON_NEW_REGISTRY` → aucune modif JS).

## Format d'entrée attendu
- **512×512**, sujet centré, marge ≥ 8 % (le loader recadre/centre au besoin).
- **PNG RGBA transparent** idéalement ; un PNG RGB sur **damier de transparence
  aplati** (cas Gemini fréquent) est détouré automatiquement via
  `dechecker_png.py`.
- **Pas de cadre, pas de halo, pas de texte, pas d'ombre portée** dans l'image :
  ce sont les passes `pass_halo` + `pass_cartouche` qui les ajoutent.

## Après intégration
- `node tests/smoke.js ItemIcons` (couverture + chargement).
- Les PNG sous `img/` sont servis en *stale-while-revalidate* (pas de `?v`) →
  **aucun cache-bump** requis pour un simple échange d'icône (contrairement aux
  JS/CSS). Cf. CLAUDE.md « PWA & cache offline ».

> ⚠️ Si tu ne fournis pas de source pour un id, l'icône **painterly** existante
> (recette `RECIPES`) reste la version livrée — c'est le repli.

Prompts prêts à l'emploi : `.claude/plans/artifacts-p1-gemini-prompts.md`.
