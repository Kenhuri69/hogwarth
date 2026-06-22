# Defringe halo blanc — gardien_lion / gardien_blaireau

## Problème
2 sprites monstres présentent un halo blanc dur : alpha quasi-binaire
(semi-transp. ~1.8 %, aucun lissage) + frange claire massive au bord
(≥30 % des pixels de bord à luminance ≥200). Reste du fond clair d'origine
collé sur la silhouette lors d'un détourage à bord dur sans matting.

Audit (78 sprites) : seuls `gardien_lion` et `gardien_blaireau` sont touchés.
Faux positifs écartés (sujets lumineux, bord déjà plumé) : gardien_aigle,
heraut_aube, peeves.

## Approche : defringe post-process (pas de re-détourage)
Source brute Nano Banana absente du repo → on nettoie les PNG existants.

> CONSTAT après visualisation : le « halo » n'est pas une fine frange mais des
> **morceaux de DAMIER de transparence** (carrés gris neutres) restés autour de
> la silhouette. L'érosion 1 px naïve ne suffit pas. Algo final (`tools/defringe_png.py`) :
1. mask = alpha ≥ 128
2. ouverture morpho (k=2) + plus grand composant connexe → drope les blobs de
   damier DÉTACHÉS ; dilatation géodésique (∩ mask) restaure le bord du corps
3. anneau externe (band=10 px) : retire le damier ATTACHÉ reconnu neutre-clair
   (sat ≤ 28 & 150 ≤ lum ≤ 250) — restreint au bord pour protéger l'intérieur
4. décontamination couleur (nearest pixel intérieur) + replumage 1 px (α=140)
5. sauvegarde 512² RGBA

> ⚠️ RÉVISION (revue utilisateur sur fond noir GitHub) : le 1er passage ne
> retirait QUE les blobs détachés. Restaient des carrés de damier ATTACHÉS à la
> silhouette + un liseré clair cuit dans le RGB (~5500 px lion, ~3900 blaireau).
> Algo v3 : ajoute la SUPPRESSION (alpha→0) du damier neutre-clair
> (lum≥150 & sat≤42) dans l'anneau de bord `band=16`, avant la décontamination.
> Résidu blanc 5463→0 (lion), 3911→0 (blaireau). Validé visuellement sur noir.

## Critères de vérification
- [x] avant/après : frange claire (bord ≥200) chute de ~30-39 % à < 8 %
- [x] semi-transp. remonte (lissage présent, plus binaire)
- [x] dimensions 512×512 RGBA conservées, occupation ~stable (érosion 1 px nette)
- [x] crops zoom du bord montrés à l'utilisateur
- [x] `node tests/smoke.js` (scénarios visuels/npc) vert — 11 scénarios OK
- [x] cache-bump — N/A (PNG `img/`, servis en stale-while-revalidate, pas de ?v)

## Décisions
- Originaux conservés en git (réversible).
- 3 « frange? » non touchés (glow intentionnel).
