# Procédure — icônes d'items depuis une planche LLM (qualité garantie)

> Source de vérité pour transformer une **planche d'icônes** générée par LLM
> image (Gemini / Copilot / Nano Banana) en PNG de jeu **propres, centrés, sans
> bave de voisin**. S'applique à l'identique aux contenus **épiques / Premium**.
>
> Règle d'or : **rien n'est livré qui ne passe la porte QC** (`sheet_extract.py`
> sort en code 1 si un id échoue). On ne « bricole » plus le découpage à la main.

---

## 0. Outils

| Outil | Rôle |
|-------|------|
| `tools/sheet_extract.py` | Découpe FIABLE planche → PNG transparents centrés + **porte QC** + planche de contrôle. |
| `tools/icon_factory.py --raster` | Encadre les PNG détourés (halo de rareté + cartouche doré + mipmaps du moteur). |
| `tools/dechecker_png.py` | Détourage d'un damier de transparence aplati (fallback). |
| `rembg` (optionnel) | Segmentation U²-Net pour une source à **fond chargé** (artefact unique rendu avec décor). Modèle ~176 Mo téléchargé au 1er run. `pip install "rembg[cpu]"`. |

---

## 1. Générer la planche (prompt)

Contraintes **non négociables** (sinon le découpage souffre) :
- **Fond plat et CLAIR** — `Flat uniform LIGHT GREY background (#c8c8c8)`, identique
  partout. ⚠️ Un fond **sombre** rend les objets sombres (cuir, bois) *iso-couleur*
  au fond → **indétourables**. C'est l'erreur à ne jamais refaire.
- Grille régulière (ex. 4 colonnes), **un objet centré par cellule**, **espaces
  nets entre cellules** (les objets ne se chevauchent pas, ne touchent pas les bords).
- **Aucun cadre / halo / texte / ombre portée** dans l'image (ajoutés par le moteur).
- 512 px utiles minimum par objet (planche ≥ 1024², idéalement ≥ 1254²).

Prompts prêts : `.claude/plans/_archive/artifacts-p1-gemini-prompts.md`.

## 2. Extraire (avec QC)

```bash
python3 tools/sheet_extract.py <planche.png> \
  --cols 4 --rows 4 \
  --ids id1,id2,id3,...            # ordre row-major = position des cellules \
  --out tools/raster_src --qc /tmp/qc.png
# fond chargé (rare) : ajouter  --method rembg
```

Ce que la passe garantit (cf. en-tête du script) :
1. **Anti-bave** : tout composant connexe **touchant le bord de la cellule** est
   supprimé (= morceau du voisin entré par la couture). Les sujets multi-parties
   *internes* (paire de gantelets) sont conservés.
2. **Centrage** : recentrage sur la bbox du **sujet nettoyé** (jamais sur la bave).
3. **Specks** : micro-composants < `--min-area` retirés.
4. **Liseré** : érosion 1 px de l'alpha (`--erode`).
5. **Porte QC** (échec = non écrit + exit 1) : sujet non vide, **marge ≥ `--margin`**,
   couverture opaque ∈ [3 %, 85 %]. Rapport texte + **planche QC sur damier**.

**Vérifier `--qc` à l'œil** : chaque vignette a un cadre **vert (PASS)** / **rouge
(FAIL)** ; le damier révèle toute bave/halo résiduel. Un id rouge → corriger
(meilleure planche, ou `--tol`/`--inset`/`--min-area`) et relancer. **Ne jamais
committer un FAIL.**

## 3. Encadrer (moteur)

```bash
python3 tools/icon_factory.py --raster        # tous les ids présents dans tools/raster_src/
```
→ `img/icons_new/<id>_{16,24,32,48,64}.png`. `_load_raster_subject` ré-applique en
défense le filtre anti-bave (centrage garanti même sur une source douteuse).

Enregistrer chaque nouvel id dans `js/item-icons.js` :
`ITEM_ICON_NEW_REGISTRY` (priorité 1) **et** `ITEM_ICON_REGISTRY` (repli legacy,
exigé par le test de couverture).

## 4. Contrôle final

```bash
node tests/smoke.js ItemIcons     # couverture 100 % + chargement
```
- Inspecter un rendu in-game (ou un montage) : objet **centré**, **aucun fragment
  étranger**, lisible à 16 px.
- **Cache** : un simple échange de PNG `img/` ne nécessite **pas** de cache-bump
  (servi en *stale-while-revalidate*). Un changement de `js/item-icons.js`, si.

## 5. Réutilisation Premium / épique

Identique : générer la planche Premium (palettes Maison + emblème + halo de
prestige) **sur fond gris clair**, `sheet_extract` (QC vert obligatoire), puis
`--raster`. Les sources détourées restent versionnées dans `tools/raster_src/`.
