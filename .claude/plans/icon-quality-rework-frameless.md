# Plan — Refonte qualité + cadre des icônes d'items « brutes »

> Déclencheur : capture utilisateur montrant le « Cor de la Chasse Sans Tête »
> en basse qualité **et sans cartouche doré**, divergeant des items voisins
> (Bottes du Silence, Œil de l'Aigle…). Audit → 11 items concernés.

## Diagnostic

`getItemIconHtml` résout `ITEM_ICON_NEW_REGISTRY[id]` → `img/icons_new/<id>_*.png`.
Deux familles d'art cohabitent dans `icons_new/` :

- **Painterly factory** (`tools/icon_factory.py` → recette `RECIPES`) : passes
  AO/shading/rim/specular/grain **+ halo de rareté + cartouche doré**. → cadre
  cohérent, haute qualité.
- **Raster brut** (art LLM déposé directement) : aucun passage par le pipeline
  → **pas de cartouche**, qualité variable.

Le chemin `--raster` d'`icon_factory.py` existe déjà : il encadre un sujet déjà
peint (`tools/raster_src/<id>.png`) avec **uniquement** le halo de rareté + le
cartouche doré (mêmes passes que les recettes). C'est l'outil de
réconciliation. `tools/sheet_extract.py` découpe une planche LLM en sujets
transparents centrés, prêts pour `--raster`.

## Audit — 11 items sans cadre (fichier basename sans recette)

| id | nom | rareté | type/slot |
|----|-----|--------|-----------|
| `baguette_if_boucle` | Baguette d'If des Profondeurs | epic | wand |
| `cape_soie_acromantule` | Cape de Soie d'Acromantule | epic | cloak |
| `ceinture_aurors` | Ceinturon des Aurors | epic | belt |
| `perle_mimi` | Perle de Larmes de Mimi | epic | amulet |
| `cor_chasse` | Cor de la Chasse Sans Tête | epic | trinket |
| `plume_lockhart` | Plume à Papote Dédicacée | rare | trinket |
| `bottes_lestes` | Bottes Lestes | uncommon | feet |
| `cape_doublee` | Cape Doublée | uncommon | cloak |
| `ceinture_etudiant` | Ceinture d'Étudiant | uncommon | belt |
| `plastron_renforce` | Plastron Renforcé | uncommon | body |
| `serre_tete_etude` | Serre-tête d'Étude | uncommon | head |

> `codex_rowena_eclat` est un **faux positif** (clé registre ≠ nom de fichier :
> pointe sur `codex_rowena_64.png`, qui EST encadré). Non concerné.

## Décision : régénérer via une seule planche (pas de simple re-cadrage)

Les sources brutes n'existent qu'en **≤ 64 px** (aucun 512 px conservé). Les
ré-encadrer upscalerait un sujet 64 px → flou. Pour corriger **qualité ET
cadre**, on régénère l'art en haute résolution via **une planche LLM unique**
(Nano Banana / Copilot), puis on découpe + encadre.

Le `cor_chasse` factory généré (épée… cor de laiton générique) **ne respecte
pas l'identité d'origine** (cor orné fantomatique, gemme verte, drapé
cramoisi). Il est donc inclus dans la planche pour régénération fidèle ; sa
recette painterly est rétrogradée en **stub** (rareté seule) pour que `--raster`
fournisse le bon halo et qu'un futur `--all` ne réécrase pas l'art dédié
(même convention que Lot E / reliques vocales).

## Étapes

1. **Stubs de recette** (rareté seule) pour les 11 ids dans `RECIPES`
   (`icon_factory.py`) → `--raster` lit la bonne rareté ; `--all` n'écrase pas.
   `cor_chasse` : recette painterly → stub. → vérifier : `python3
   tools/icon_factory.py --list` affiche les 11 avec la bonne rareté.
2. **Prompt planche** rédigé dans
   `.claude/plans/nano-banana-prompts-frameless-rework.md` (1 prompt, grille
   4×3, fond plat, sujets propres sans cadre/halo). → fourni à l'utilisateur.
3. **(externe)** L'utilisateur génère la planche → `planche.png`.
4. **Découpe** : `python3 tools/sheet_extract.py planche.png --cols 4 --rows 3
   --ids <ordre row-major> --out tools/raster_src --qc /tmp/qc.png`
   → vérifier : QC 11/11 PASS, vignettes correctes.
5. **Encadrement** : `python3 tools/icon_factory.py --raster <ids>`
   → écrit `img/icons_new/<id>_{16,24,32,48,64}.png`. → vérifier : ouvrir 2-3
   PNG, cartouche doré présent, sujet net, identité respectée.
6. **Registre** : déjà correct (pointe sur les bons fichiers) → aucun change JS.
7. **Cache PWA** : `img/` est servi en stale-while-revalidate (pas indexé par
   `?v=`) → **pas de bump** requis. Aucun `js/`/`css/` touché.
8. **Non-régression** : `node tests/smoke.js inventory visual icon` (couverture
   202/202, tous PNG chargés).

## État

- [x] Audit (11 items + faux positif identifié)
- [x] Étape 1 — stubs de recette (11 ids, cor_chasse rétrogradé)
- [x] Étape 2 — prompt planche rédigé
- [ ] Étape 3 — planche générée (externe, utilisateur)
- [ ] Étapes 4-5 — découpe + encadrement
- [ ] Étape 8 — smoke test après intégration

> Note : `cor_chasse` ships actuellement en version factory intérimaire
> (encadrée, rareté epic) — sera remplacée par l'art fidèle de la planche.
