# Plan — Outillage images (chantier outillage)

> Branche : `claude/improve-game-images-7OVCy`
> Décidé après validation du guide `IMG_STYLE.md` sur C13 gobelin
> (commit `36010e1`). **Hors périmètre** : rétro-traitement des PNG
> déjà sur master.

## Objectif

Formaliser et reproduire à la commande le pipeline ad-hoc utilisé pour
le gobelin (rembg → trim → center → resize 512 → optimize), faciliter
la maintenance du `SVG_PLAN.md`, et muscler la couverture du smoke test.

## Livrables

### L1 — `tools/process_monster_png.py`

CLI Python reproductible. Pipeline aligné sur `IMG_STYLE.md` §1, §3, §7, §9.

- Args :
  - `--src <path>` (obligatoire) — image générée par le LLM (fond noir/uni)
  - `--id <monster_id>` (obligatoire) — destination `img/monsters/<id>.png`
  - `--model {birefnet,u2net}` (default `birefnet`) — heuristique §7
  - `--margin 0.08` (default) — marge intérieure
  - `--side 512` (default) — taille finale
  - `--dry-run` — sort dans `/tmp/<id>_check.png` au lieu d'`img/monsters/`
- Pipeline :
  1. Load src en RGBA, refus si déjà transparent (≥ 5% alpha 0).
  2. `rembg` avec session choisie + alpha matting (foreground 240, background 10, erode 8) — paramètres tirés du run gobelin.
  3. `getbbox()` sur canal alpha → trim aux limites du sujet.
  4. Centrage dans canvas carré transparent avec marge 8% (formule : `canvas = max(W,H) / (1 - 2*marge)`).
  5. Resize LANCZOS vers `--side`.
  6. Save PIL `optimize=True`.
- Vérifications §9 imprimées en sortie (✓ / ✗ / ⚠) :
  - Dimensions exactement `side × side`
  - Mode RGBA
  - % alpha 0 (fond) ≥ 30%
  - % alpha 255 (sujet plein) ≥ 15%
  - Occupation bbox H et W (alerte si < 50% ou > 95%)
  - Poids final < 350 KB (sinon refait avec `optimize=True` + PNG palette si possible)
- Exit-code : 0 si tout ✓, 1 si un critère bloquant échoue (alpha 0% ou poids > 700 KB).
- Bandeau d'aide qui pointe vers `IMG_STYLE.md`.

### L2 — `tools/count_plan.py`

Petit script Python (cohérent avec `gen_*.py`). Lit `SVG_PLAN.md`, compte les `[x]` et `[ ]` par bloc (A, B, C, D, Z), imprime un récap, compare au texte « Statut global : N / M ». Exit non-zero si dérive.

### L3 — Extension `tests/smoke.js` scénario 5

Sans casser l'existant :
- Liste data-driven de **tous les monstres** ayant `imgSrc` (au lieu des 6 hardcodés).
- Pour chaque : assert load OK, `naturalWidth >= 512`, `naturalHeight >= 512`.
- Une assertion supplémentaire **alpha non-trivial** sur 1 monstre (canvas `getImageData`, compte pixels `a==0` > 5% et `a==255` > 10%) — preuve que la transparence est réelle, pas un alpha layer plein de 255.

Pas de screenshot diff : flaky, exige baselines, redondant avec les assertions précises.

## Étapes

1. [x] `tools/process_monster_png.py` créé — `--dry-run` sur source gobelin → 6/6 critères ✓, 202 KB, occupation 62% × 84% (identique à la passe manuelle).
2. [x] `tools/count_plan.py` créé — a détecté la dérive `76 → 86` (oubli du bloc D et de C44 dans le compteur historique). Corrigé.
3. [x] Scénario 5 smoke étendu : data-driven sur tous les `imgSrc` (19 monstres), check color-type RGBA via lecture binaire (canvas tainted en `file://`).
4. [x] `IMG_STYLE.md` §7 et §9 pointent vers le script et le smoke.
5. [x] Journal `SVG_PLAN.md` mis à jour (entrée #22).
6. [x] Smoke test final + commit + push.

## Hors périmètre (explicite)

- **Pas** de réécriture des PNG déjà sur master (gobelin inclus).
- **Pas** de screenshot diff Playwright (décision §L3).
- **Pas** de packaging du script (pip install, virtualenv) — `python3 tools/...` direct, doc dans le header du fichier.
- **Pas** de hook pre-commit qui valide automatiquement les nouveaux PNG (à voir plus tard si besoin).

## Critères de succès

- `python3 tools/process_monster_png.py --src /tmp/gobelin_work/a99bb8d6-1000025229.png --id gobelin_check --dry-run` produit un PNG ressemblant au gobelin actuel et imprime 7/7 ✓.
- `python3 tools/count_plan.py` sort `24 / 76 (cohérent)`.
- `node tests/smoke.js` passe (scénario 5 boucle sur tous les imgSrc, alpha-check sur 1 monstre).
