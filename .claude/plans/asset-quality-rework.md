# Plan — Audit qualité & reprise des assets raster (monstres / sprites 3D / portraits)

> Suite de `icon-quality-rework-frameless.md` (items). Hypothèse utilisateur :
> des images d'origine **Copilot (qualité JPG)** se sont glissées parmi les
> sprites, à reprendre via le pipeline PNG (Nano Banana → détourage 512²).
> Ce plan = **audit factuel** + **méthode d'identification** + **pipeline de
> reprise** par classe d'asset.

## 1. Audit (2026-06-27) — outil `tools/asset_quality_scan.py`

Scan de `img/monsters` (78), `img/players` (16), `img/npc` (44). Métriques :
dims, mode, alpha %, netteté (var. Laplacien), **signature de grille JPEG 8 px**,
luminance du liseré (halo de détourage).

### Résultats par classe

| Classe | Fichiers | Format | Verdict |
|--------|----------|--------|---------|
| **Monstres** (`img/monsters`) | 78 | **512² RGBA transparent** | ✅ **Sains** — nets, aucune signature JPEG (grid max 1,24 < 1,25), aucun halo. |
| **Joueurs** (`img/players`) | 16 | **512² RGBA transparent** | ✅ **Sains** — idem. |
| **Sprites 3D PNJ** (`_npc_*`, `gardien_boucle`) | 10 | **512² RGBA** | ✅ **Sains**. |
| **Portraits PNJ nommés** | 34 | **256² RGB opaque** (×32) + `mundungus` 928×1148, `rosmerta` 1408×768 RGB | ⚠️ **GAP** — demi-résolution (256 vs standard 512), **opaques** (RGB), style **photoréaliste** divergeant de l'art painterly. |
| **Icônes de sorts — base** (`img/icons/spells`, 48²) | 24 | **48² RGBA** | ⚠️ **Style + résolution** : emblèmes plats (disque + glyphe), nets mais **basse réso** et **facture ancienne** ≠ painterly. Pas d'artefact JPEG. |
| **Icônes de sorts — premium** (`img/icons/spells`, 128²) | 46 | **128² RGBA** | ✅ **Sains** — orbes painterly nets (incendio_royal, glacius_cataclysme vérifiés 100 % : pas de mush JPEG). |
| **FX de sorts** (`img/fx/spells`) | 25 | **256² RGBA transparent** | ✅ **Sains** — éclats de particules nets. |
| **Scènes** (`img/scenes`) | 7 | **JPG** (896–1536 px) | ◻️ Par conception (grands fonds). Revue qualité optionnelle. |

### Conclusion centrale (contre-intuitive)

**Les sprites « monstre iso 3D » ne sont PAS le problème** : monstres + joueurs
+ sprites 3D PNJ sont tous 512² RGBA, propres, sans artefact JPEG détectable ni
halo. Inspection plein-écran (peeves, voldemort_affaibli, gardien_lion, aragog)
+ crops 100 % : painterly net, pas de « mush » JPEG.

**Le vrai écart qualité/cohérence est sur les portraits PNJ de dialogue** : 32
à **256²** (moitié du standard 512), opaques, et de facture **photo** plutôt que
painterly. Ce sont les candidats les plus probables d'origine Copilot.

**Sorts (corrigé 2026-06-27)** — ⚠️ ma 1ʳᵉ passe avait conclu « 25 FX tous
sains » : **FAUX**. Vérification ciblée des **7 sorts évolués** (dernier lot
d'art, commit #649 — icône 128² + splash 256² chacun : diffindo_ultima,
fulgur_imperium, glacius_cataclysme, lumos_solem_ardent, lux_suprema,
nox_devorans, vulnera_maxima) :

- **`diffindo_ultima` (splash) — DÉFECTUEUX** : luminance moyenne du sujet **76**
  (vs 177–206 pour les autres), effet **gris charbon sombre** alors que le sort
  est élément **`physique`** (fauchage → devrait être des lames argentées
  brillantes). Sur le **fond de combat sombre, il est quasi invisible**. C'est
  le raté du lot.
- `nox_devorans` (splash) : luminance 83 — sombre aussi, mais élément
  **`ténèbres`** + veines roses lumineuses → lisible. Limite, à surveiller.
- Les 5 autres splashes + les 7 icônes : lisibles/nets.

> Le défaut n'est pas une « grille JPEG » (indétectable ici) mais un problème de
> **valeur/contraste** (effet trop sombre pour le fond de combat). Les méthodes
> statiques (grille 8px, taille fichier, métadonnées) ne le voyaient pas — seule
> la **mise en situation sur fond sombre** le révèle (cf. `last7_fx_proper`).

Par ailleurs, écart **non-bloquant** de style/réso : les **24 sorts de base**
restent en emblèmes plats 48² vs orbes painterly 128² (modernisation optionnelle,
Lot D).

> ⚠️ **Limite de détection automatique** : un JPG rééchantillonné (Lanczos) vers
> 512² **perd l'alignement de sa grille 8 px** → le score `grid` ne peut PAS
> prouver une origine JPG sur les sprites détourés. L'identification fine
> **dépend du visuel + de la provenance** (l'utilisateur sait quels fichiers ont
> été faits sous Copilot). Le scanner fiabilise le **structurel** (résolution,
> opacité), pas l'historique de compression.

## 2. Méthode d'identification (collaborative)

1. **Structurel** (automatique) : `python3 tools/asset_quality_scan.py`
   → drapeaux `SMALL` (<512), `OPAQUE` (RGB là où l'alpha est attendu),
   `BLOCKY` (grid ≥ 1,25). Tri par netteté pour faire remonter les flous.
2. **Visuel** : `python3 tools/asset_quality_scan.py --contact /tmp/qc`
   → planches par classe (monsters_1..3, players_1, npc_1..2) à inspecter.
3. **Provenance** (utilisateur) : marquer les fichiers connus comme exports
   Copilot/JPG. Toute entrée pointée est traitée même si le scan la juge « OK ».

> Livrable d'identification = une **liste d'ids validée** par classe avant toute
> régénération. On ne régénère pas « au jugé ».

## 3. Pipeline de reprise (par classe — réutilise l'existant)

Tous partent d'une **image source Nano Banana** sur **fond gris plat uni**
(jamais JPG ; PNG ou damier détourable), puis :

| Classe | Outil | Sortie | Registre / cache |
|--------|-------|--------|------------------|
| Monstre | `tools/process_monster_png.py --src <gen.png> --id <id> --model birefnet` (faire `--dry-run` d'abord) | `img/monsters/<id>.png` 512² RGBA | `imgSrc` déjà set dans `monsters*.js` → **si chemin inchangé, pas de bump** (img en SWR). Bump `monsters*.js`+`CACHE_VERSION` **seulement** si on touche le JS. |
| Joueur | idem `process_monster_png.py` → `img/players/<id>.png` | 512² RGBA | `PLAYER_SPRITE_SRC` (`renderer-entities.js`) déjà set → idem (bump JS uniquement si édité). |
| Portrait PNJ | même détourage **à `--side 512`** (ou garder opaque si portrait de dialogue, mais **512²**) | `img/npc/<id>.png` 512² | `portraitImg` (`npcs*.js`) chemin inchangé → pas de bump si seul le PNG change. |
| Lot groupé | **planche LLM** → `tools/sheet_extract.py --cols C --rows R --ids …` → puis `process_monster_png.py`/`icon_factory --raster` selon la classe | — | comme items (cf. plan frameless). |

> **Règle cache** (guidelines §8) confirmée pour ce travail : `img/**` est servi
> en **stale-while-revalidate** (pas indexé par `?v=`). **Écraser un PNG au même
> chemin ne nécessite PAS de bump.** Le bump (`?v` + `CACHE_VERSION`) n'est requis
> que si un **`.js`/`.css`** change (ex. nouveau chemin d'`imgSrc`).

## 4. Lots de travail proposés (par priorité)

- **Lot A — Portraits PNJ 256²→512²** (34 fichiers) : le gap réel. Sous-lots de
  ~8–12 via planches. Décision de style à trancher : **(i)** upscale/redo
  photoréaliste cohérent 512², ou **(ii)** repasse painterly pour aligner sur
  l'art du jeu. → *question ouverte pour l'utilisateur.*
- **Lot B — Sprites signalés par provenance** (monstres/joueurs) : a priori
  **0** d'après l'audit ; ne traiter que ce que l'utilisateur pointe.
  - **Vérification ciblée « derniers monstres ajoutés » (2026-06-27)** : revue
    plein-écran + crops 100 % du **cohort récent** (30 sprites : 4 Gardiens des
    Fondateurs, 8 boss originaux endgame — Hérauts/Spectre de Givre/Basilic &
    Magyar Ancestral/Moremplis/reflet_mythe, 4 monstres étourdissants, 14 du
    sprint étages 8-10). **Tous nets, 512² RGBA, aucun artefact JPEG ni halo.**
    → **RAS** : aucun monstre récent à reprendre. (NB : l'historique git est
    aplati — un seul commit d'ajout #636 + un fix halo Gardiens #655 — donc le
    cohort « récent » vient des vagues documentées dans CLAUDE.md, pas de la
    date git.)
- **Lot C — Scènes JPG** (7) : optionnel. Garder JPG (poids) est raisonnable ;
  re-export haute qualité seulement si artefacts visibles signalés.
- **Lot D — Sorts de base 48²→128² painterly** (24) : optionnel (cohérence
  visuelle, pas qualité). Régénérer les 24 emblèmes plats en orbes painterly
  128² pour s'aligner sur les 46 sorts premium. Planche LLM (fond gris) →
  `sheet_extract` → mipmaps ; registre `SPELL_ICON_REGISTRY` chemins inchangés
  → pas de bump (img SWR). À ne lancer que si l'utilisateur veut homogénéiser.
- **Lot E — Reprise des FX de sorts trop sombres** (≥1 : `diffindo_ultima`,
  éventuellement `nox_devorans`) : régénérer le splash en **valeur lumineuse**
  lisible sur fond de combat sombre (diffindo = lames argentées brillantes).
  Source Nano Banana fond gris → détourage 256² (`process_monster_png.py
  --side 256` ou `sheet_extract`) → `img/fx/spells/<id>.png`, chemin inchangé →
  pas de bump. **Périmètre exact à confirmer par l'utilisateur.**

## 5. Critères d'acceptation (par fichier repris)

- Sprite 3D : **512² RGBA**, fond 100 % transparent, pas de halo (liseré non
  blanc sur sujet sombre), `asset_quality_scan` sans `SMALL/OPAQUE/BLOCKY`.
- Portrait : **≥ 512²**, net ; opacité tolérée (boîte de dialogue).
- `node tests/smoke.js` scénarios `MonsterImages` / sprites PNJ / players verts.
- Bump cache **uniquement** si un `.js` a été édité (sinon SWR suffit).

## 6. État

- [x] Audit factuel (3 classes scannées) + outil `asset_quality_scan.py`
- [x] Conclusion : monstres/joueurs sains ; gap = portraits PNJ 256²
- [x] Identification validée (utilisateur 2026-06-27 : portraits PNJ « on est
      bon » → **hors scope** ; scènes JPG **laissées** ; périmètre = vérifier
      les **derniers monstres ajoutés**)
- [x] Lot B — vérification du cohort récent (30 sprites) : **RAS, tous propres**
- [x] Sorts re-vérifiés (1ʳᵉ passe erronée) : `diffindo_ultima` splash
      **défectueux** (trop sombre), `nox_devorans` limite ; base 48² = écart
      style/réso (Lot D)
- [x] Lot E — périmètre confirmé (utilisateur) : **les 7 splash FX du lot
      évolué**, via planche Nano Banana → prompt rédigé
      (`nano-banana-prompts-spell-fx-rework.md`) ; en attente de la planche.
- [~] Lot A — portraits PNJ : **abandonné** (décision utilisateur : OK en l'état)
- [~] Lot C — scènes : **abandonné** (laissées en JPG)
- [ ] Lot D — modernisation sorts de base 48²→128² (optionnel, en attente)

> **Décisions utilisateur (2026-06-27)** : PNJ et scènes laissés tels quels ;
> seuls les derniers monstres étaient à vérifier → vérifiés, aucun défaut.
> **Plan clos** sauf si l'utilisateur pointe un sprite précis : dans ce cas,
> reprise unitaire via `process_monster_png.py` (cf. §3).
