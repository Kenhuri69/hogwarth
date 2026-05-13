# Plan — Bloc B pivoté : SVG dédiés pour les 14 monstres SANS PNG

## Contexte (décision utilisateur du 2026-05-12)

Le Bloc B d'origine (raffiner les 31 SVG inline des monstres B01–B31) est
**abandonné** : audit `js/icons.js:1163-1193` + `js/monsters.js` montre que
**tous les 31 monstres concernés ont un `imgSrc` PNG**, et que
`getMonsterIconHtml` retourne le PNG dès que `imgSrc` est défini. Le SVG
correspondant est donc strictement du code mort en production — toute
amélioration serait invisible en jeu.

**Pivot** : créer un SVG dédié pour les **14 monstres récents** qui n'ont
**ni PNG ni SVG dédié** et héritent actuellement du SVG générique de leur
catégorie (ou du fallback emoji). Forte valeur visible : ces monstres
s'affichent aujourd'hui de manière identique entre eux quand ils partagent
la même catégorie.

## Cibles (14 monstres)

| Catégorie | Monstres |
|-----------|----------|
| **Bête** | `chauve_souris_vampire`, `manticore_jeune` |
| **Fantôme** | `chevalier_fantome`, `fantome_sang_noir`, `spectre_maudit` |
| **Créature** | `niffleur`, `bowtruckle`, `gremlin_magique` |
| **Humain** | `hecate_sorciere` |
| **Être magique** | `elfe_rebelle`, `gardien_portail`, `vampire_mineur`, `strigoi`, `poupee_maudite` |

> `mon_monstre` est le template commenté — exclu.

## Style cible (vérifié sur peeves/myrtle/serpent_cachot/gobelin)

- `viewBox="0 0 100 100"`, ~25-30 lignes par entrée
- Corps principal : `fill="currentColor"` (teinté via VARIANT_COLORS)
- Détails sombres : `#0d0705` (yeux, crocs, contours)
- Accents colorés ponctuels autorisés (sang `#c0392b`, vert oeil `#2a6a20`…)
- Commentaires français courts par groupe d'éléments
- `<defs>` disponibles : `url(#shadeRadial)`, `url(#halo)`, `url(#mist)`, `url(#glow)`
- 6-12 éléments visuels distincts par monstre

## Cadence (validée utilisateur)

1. **Pilote** = `niffleur` (créature, silhouette iconique : long museau + pelage noir + trésor doré dans le bec)
2. **Pause** pour validation du style/niveau de détail
3. **Batchs ~5/6** de 3 commits :
   - B+1 : `niffleur` (pilote)
   - B+2 : 5 créatures/bêtes (`bowtruckle`, `gremlin_magique`, `manticore_jeune`, `chauve_souris_vampire`)
   - B+3 : 4 fantômes/êtres magiques (`chevalier_fantome`, `fantome_sang_noir`, `spectre_maudit`, `poupee_maudite`)
   - B+4 : 4 êtres magiques + humain (`elfe_rebelle`, `gardien_portail`, `vampire_mineur`, `strigoi`, `hecate_sorciere`)

## Vérification (§4 + §7 des guidelines)

- Après chaque batch : `node tests/smoke.js` doit rester vert (34/34).
- L'ajout est strictement additif : on insère de nouvelles clés dans
  `MONSTER_ICONS`, jamais on n'écrase une clé existante.
- L'insertion respecte la section catégorielle (`// ── CRÉATURES ──`).
- Critère visuel de validation (vérifié manuellement par l'utilisateur après merge) :
  - Le monstre doit être reconnaissable par sa silhouette seule.
  - Couleur tintée par variant `fierce`/`ancient`/`shiny` (donc corps en `currentColor`).

## Suivi

- [x] Plan rédigé et validé
- [x] Batch 1 — 4 PNG (PR #85, mergée) : `niffleur`, `manticore_jeune`, `chevalier_fantome`, `hecate_sorciere`
  - Bonus inclus : fix renderer 3D `drawEnemySprite` (cache `_MONSTER_IMG_CACHE`, PNG via `ctx.drawImage`)
- [x] Batch 2 — 4 PNG (PR #90, mergée) : `bowtruckle`, `chauve_souris_vampire`, `fantome_sang_noir`, `vampire_mineur`
- [x] Batch 3 — 3 PNG (PR #91, mergée) : `gremlin_magique`, `spectre_maudit`, `gardien_portail`
- [x] Batch 4 final — 3 PNG : `strigoi`, `poupee_maudite`, `elfe_rebelle`
- [x] **Bloc B clôturé — 14/14 monstres livrés en PNG 512×512 RGBA**

> Tous les critères §9 IMG_STYLE.md verts sur chaque PNG.
> Workflow validé : prompt Nano Banana (template §8) → `tools/process_monster_png.py`
> (rembg birefnet-general + trim alpha + recentrage 8% + resize 512) → câblage `imgSrc`
> dans `monsters.js` → smoke 34/34 → commit + PR.
