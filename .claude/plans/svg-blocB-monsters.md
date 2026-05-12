# Plan — Bloc B pivoté : PNG dédiés pour les 14 monstres SANS PNG

## Contexte (décisions utilisateur du 2026-05-12)

1. Le Bloc B d'origine (raffiner les 31 SVG inline) est **abandonné** :
   audit `js/icons.js:1163-1193` + `js/monsters.js` confirme que les 31
   monstres ont déjà un `imgSrc` PNG ; `getMonsterIconHtml` court-circuite
   leur SVG en production → tout raffinage y serait invisible.
2. **Premier pivot** : créer des SVG dédiés pour les 14 monstres récents
   sans PNG. Pilote `niffleur` livré (commit `2e574b5`).
3. **Second pivot (final)** : la méthode SVG est trop limitée visuellement.
   On passe à **PNG via Nano Banana** (workflow Bloc C éprouvé).
   Le SVG niffleur est **conservé comme fallback graceful** au cas où le
   PNG ne charge pas.

## Cibles (14 PNG à générer)

| Catégorie | Monstres |
|-----------|----------|
| **Bête** | `chauve_souris_vampire`, `manticore_jeune` |
| **Créature** | `niffleur`, `bowtruckle`, `gremlin_magique` |
| **Fantôme** | `chevalier_fantome`, `fantome_sang_noir`, `spectre_maudit` |
| **Humain** | `hecate_sorciere` |
| **Être magique** | `elfe_rebelle`, `gardien_portail`, `vampire_mineur`, `strigoi`, `poupee_maudite` |

## Workflow (identique au Bloc C — éprouvé)

Pour chaque PNG livré par Nano Banana :
1. Vérifier alpha avec PIL (`Image.split()[-1].getextrema()`).
2. Si pré-détouré (α0 > 10%) → pipeline ad-hoc trim+recentrage+resize.
   Sinon → `python3 tools/process_monster_png.py --src … --id …` (rembg
   birefnet par défaut pour préserver translucides).
3. Sortie : `img/monsters/<id>.png` (512×512 RGBA, < 350 KB cible).
4. Ajouter `imgSrc: "img/monsters/<id>.png"` après `icon:` dans
   `monsters.js`.
5. `node tests/smoke.js` doit rester vert (scénario 5 valide RGBA + alpha).

## Cadence (validée utilisateur)

Batchs de **3-4 prompts**. Utilisateur valide le style sur chaque batch
avant que je livre le suivant.

- **Batch 1** : 4 prompts diversifiés en catégorie (1 bête, 1 créature,
  1 fantôme, 1 humain) pour caler le style.
  → `manticore_jeune`, `niffleur`, `chevalier_fantome`, `hecate_sorciere`.
- **Batch 2** : 4 prompts (poursuite des fantômes + créatures restantes).
  → `bowtruckle`, `gremlin_magique`, `chauve_souris_vampire`, `fantome_sang_noir`.
- **Batch 3** : 3 prompts (êtres magiques 1/2).
  → `elfe_rebelle`, `poupee_maudite`, `spectre_maudit`.
- **Batch 4** : 3 prompts (êtres magiques 2/2).
  → `gardien_portail`, `vampire_mineur`, `strigoi`.

## Idée parking — vue 3D billboarding

Question posée par l'utilisateur : "ne pourrait-on pas utiliser les icônes
monstre dans la vue 3D ?". Réponse honnête → faisable mais chantier
séparé (200-400 lignes de renderer, choix game design : encounter pré-
spawné vs. random, fuite possible, monstre mobile). À traiter **après**
les 14 PNG, qui sont prérequis pour avoir des billboards nets.
Ne pas mélanger les deux chantiers.

## Suivi

- [x] **Décision pivot SVG→PNG**
- [x] **SVG niffleur conservé comme fallback**
- [ ] **Batch 1** — prompts rédigés
- [ ] **Batch 1** — PNG reçus + pipeline + smoke + commit
- [ ] **Batch 2** — prompts + PNG + commit
- [ ] **Batch 3** — prompts + PNG + commit
- [ ] **Batch 4** — prompts + PNG + commit
- [ ] **SVG_PLAN.md** mis à jour avec un nouveau bloc (ex: C.6 "PNG monstres récents")
- [ ] **Idée 3D billboarding** → ouvrir un nouveau plan dédié si validée

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Plan v1 SVG | 14 monstres ciblés. Pilote niffleur SVG livré (commit `2e574b5`). |
| 2026-05-12 | Pivot v2 PNG | Utilisateur préfère méthode PNG (Bloc C). SVG niffleur conservé comme fallback. Re-rédaction du plan pour 14 PNG en 4 batchs. |
