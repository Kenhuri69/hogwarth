# Plan d'amélioration des SVG / Visuels — ARCHIVÉ

> 🏁 **Statut final (2026-05-13) : finalisé et archivé.**
>
> Tous les items actionnables ont été livrés. Restent uniquement :
> - **Bloc B (B01-B31)** — **abandonné** : les 31 monstres concernés ont
>   désormais un `imgSrc` PNG. `getMonsterIconHtml` court-circuite leur
>   SVG inline → tout raffinage SVG y serait invisible en production.
>   Décision documentée dans `.claude/plans/_archive/svg-blocB-monsters.md`.
> - **Bloc C.3 (C32-C37)** — **deferred (optionnel)** : re-générations
>   de 6 PNG existants et fonctionnels. À reprendre si re-direction
>   artistique souhaitée.
> - **Z1** — **obsolète** : la branche `claude/improve-game-svgs-0a3cf`
>   référencée n'existe plus. Le travail a été mergé par lots successifs.
>
> 14 monstres ajoutés en Bloc B pivoté (workflow Nano Banana + rembg)
> pendant la session #37 — voir `.claude/plans/_archive/svg-blocB-monsters.md`
> pour le détail.

---

> **Branche dédiée actuelle** : `claude/svg-c1-monsters-png`
> (anciennes branches : `claude/improve-game-images-7OVCy`, `claude/resume-svg-work-rgOvm`, `claude/continue-svg-work-v6BEc`, `claude/improve-svg-HWGDY`, `claude/improve-game-svgs-0a3cf` — historique conservé)
> **Statut global** : 47 / 86 tâches terminées (C25 n/a ; C44 fontaine livrée ; C.1 PNG monstres clos sauf re-gens C32-C37 optionnels ; C.2 Bellatrix livrée ; C.4 portraits PNJ livrés via plan npc-integration ; C.5 scènes grand format livrées) — dénominateur recalibré (l'ancien "36/76" sous-estimait le compte réel des sous-blocs C, cf. `tools/count_plan.py`)
> **Convention** : `[ ]` pending · `[~]` in progress · `[x]` done
>
> Ce document est la **source de vérité** entre sessions Claude.
> À chaque tâche traitée, mettre à jour la case et le statut global ci-dessus.

---

## Contexte technique

- `js/icons.js` : 36 SVG inline de monstres + 5 SVG fallback par catégorie.
- `js/movement.js` : 4 SVG inline d'objets de scène (coffre, échoppe, escaliers).
- `js/monsters.js` : registre des monstres ; champ `imgSrc` prioritaire sur le SVG inline.
- `getMonsterIconHtml()` (icons.js) gère l'ordre de priorité : `imgSrc` PNG → SVG dédié → SVG catégorie → emoji.
- 6 monstres ont déjà un PNG dans `img/monsters/` :
  `basilic`, `nagini`, `detraqueur_gardien` (fichier `dementor_garde.png`),
  `sorciere_tenebres`, `voldemort_affaibli`, `voldemort_revenu`.

## Workflow PNG via LLM image

> **Style guide obligatoire** : [`IMG_STYLE.md`](./IMG_STYLE.md) — palette,
> cadrage, prompts-types par catégorie, critères d'acceptation. À lire
> avant de générer un nouveau PNG.

Pour chaque entrée du bloc C ci-dessous :
1. Claude reprend le prompt-type adapté (cf. `IMG_STYLE.md` §8) et le complète
   pour la créature visée.
2. L'utilisateur colle l'image générée dans la conversation.
3. Claude vérifie les critères d'acceptation (`IMG_STYLE.md` §9), place le
   fichier dans `img/monsters/<id>.png`, ajoute `imgSrc: "img/monsters/<id>.png"`
   dans la fiche du monstre dans `monsters.js`, puis coche la case.

---

## Bloc A — Code pur (Claude seul)

- [x] **A1** Refondre les 5 SVG fallback de catégorie (`bête`, `humain`, `fantôme`, `créature`, `être magique`) avec gradients et détails.
- [x] **A2** Améliorer `MONSTER_BASE_COLORS` et `VARIANT_COLORS` pour mieux différencier `normal` / `fierce` / `ancient` / `shiny`.
- [x] **A3** Ajouter un bloc `<defs>` partagé en tête de `icons.js` : gradients radiaux d'ombrage, filtres de halo magique, brume.
- [x] **A4** Refondre les 4 SVG d'objets de scène dans `movement.js` (`CHEST`, `SHOP`, `STAIRS_D`, `STAIRS_U`).
- [x] **A5** Ajouter animations SMIL/CSS subtiles (flottement fantômes, scintillement coffre, palpitation aura magique, clignement des yeux).
- [x] **A6** Améliorer les ornements UI dans `img/svg/ornaments.html`.

---

## Bloc B — Affinage SVG inline monstre par monstre (Claude seul)

Améliorations : meilleures proportions, gradients via les `<defs>` du A3, détails anatomiques (crocs, écailles, plumes, articulations), poses plus dynamiques. **Tous les monstres** sont concernés, y compris ceux qui auront un PNG (le SVG reste le fallback).

- [ ] **B01** `chat_norris` — Chat de Mme Norris
- [ ] **B02** `luciole_marais` — Luciole des Marais
- [ ] **B03** `cornichon` — Cornichon de Cornouailles
- [ ] **B04** `chouette_envoutee` — Chouette Ensorcelée
- [ ] **B05** `araignee` — Araignée Géante
- [ ] **B06** `mandragore_sauvage` — Mandragore Sauvage
- [ ] **B07** `kappa_douves` — Kappa des Douves
- [ ] **B08** `hippogriffe_courroux` — Hippogriffe en Furie
- [ ] **B09** `acromantula_jeune` — Jeune Acromantule
- [ ] **B10** `peeves` — Peeve
- [ ] **B11** `myrtle` — Mimi Geignarde
- [ ] **B12** `serpent_cachot` — Serpent des Cachots
- [ ] **B13** `gobelin` — Gobelin Rebelle
- [ ] **B14** `troll` — Troll des Toilettes
- [ ] **B15** `troll_grotte` — Troll des Cavernes
- [ ] **B16** `bundimun` — Bundimun Venimeux
- [ ] **B17** `meduse_noire` — Méduse Noire
- [ ] **B18** `homme_araignee` — Homme-Araignée
- [ ] **B19** `portrait_hostile` — Portrait Hostile
- [ ] **B20** `centaure` — Centaure Hostile
- [ ] **B21** `detraqueur` — Détraqueur
- [ ] **B22** `loup_garou` — Loup-Garou Enragé
- [ ] **B23** `inferius` — Inférius
- [ ] **B24** `mangemort` — Mangemort
- [ ] **B25** `mangemort_masque` — Mangemort Masqué
- [ ] **B26** `mangemort_elite` — Mangemort d'Élite
- [ ] **B27** `sorcier_renegat` — Sorcier Renégat
- [ ] **B28** `boggart` — Épouvantard
- [ ] **B29** `chimere` — Chimère de Poudlard
- [ ] **B30** `ombre_quirrell` — Ombre de Quirrell
- [ ] **B31** `bellatrix` — Bellatrix Lestrange

> Les SVG `basilic`, `nagini`, `detraqueur_gardien`, `sorciere_tenebres`,
> `voldemort_affaibli`, `voldemort_revenu` peuvent aussi être affinés ;
> ajouter une entrée B32-B37 si l'utilisateur le demande.

---

## Bloc C — PNG via LLM image (workflow à deux)

### C.1 Monstres sans PNG (30)

- [x] **C01** `chat_norris`
- [x] **C02** `luciole_marais`
- [x] **C03** `cornichon`
- [x] **C04** `chouette_envoutee`
- [x] **C05** `araignee`
- [x] **C06** `mandragore_sauvage`
- [x] **C07** `kappa_douves`
- [x] **C08** `hippogriffe_courroux`
- [x] **C09** `acromantula_jeune`
- [x] **C10** `peeves`
- [x] **C11** `myrtle`
- [x] **C12** `serpent_cachot`
- [x] **C13** `gobelin`
- [x] **C14** `troll`
- [x] **C15** `troll_grotte`
- [x] **C16** `bundimun`
- [x] **C17** `meduse_noire`
- [x] **C18** `homme_araignee`
- [x] **C19** `portrait_hostile`
- [x] **C20** `centaure`
- [x] **C21** `detraqueur`
- [x] **C22** `loup_garou`
- [x] **C23** `inferius`
- [x] **C24** `mangemort` *(le monstre `id:"mangemort"` porte déjà `name:"Mangemort Masqué"` — C25 ci-dessous est n/a)*
- [~] **C25** `mangemort_masque` *(n/a — fusionné avec C24, pas d'entrée séparée dans `monsters.js`)*
- [x] **C26** `mangemort_elite`
- [x] **C27** `sorcier_renegat`
- [x] **C28** `boggart`
- [x] **C29** `chimere`
- [x] **C30** `ombre_quirrell`

### C.2 Boss sans PNG (1)

- [x] **C31** `bellatrix`

### C.3 Re-génération optionnelle des 6 PNG existants

- [ ] **C32** `basilic` (re-gen)
- [ ] **C33** `nagini` (re-gen)
- [ ] **C34** `detraqueur_gardien` (re-gen)
- [ ] **C35** `sorciere_tenebres` (re-gen)
- [ ] **C36** `voldemort_affaibli` (re-gen)
- [ ] **C37** `voldemort_revenu` (re-gen)

### C.4 Portraits PNJ donneurs de quête (optionnel)

- [x] **C38** Portrait Madame Pomfresh (quête mandragore_pomfresh) — livré via plan `npc-integration.md` itération 2, refondu en itération 3 (caducée d'argent)
- [x] **C39** Portrait Gilderoy Lockhart (quête livre_interdit) — livré via plan `npc-integration.md` itération 2
- [x] **C40** Portrait Mimi Geignarde — version PNJ (quête troll_toilettes) — livré via plan `npc-integration.md` itération 2
- [x] **C41** Portrait Hagrid (quête chouette_perdue) — livré via plan `npc-integration.md` itération 2

### C.5 Scènes grand format (optionnel)

- [x] **C42** Illustration écran-titre
- [x] **C43** Illustration écran de mort

### C.6 Salles spéciales

- [x] **C44** Fontaine de pierre (SVG inline overlay — `movement.js`)
      *Réalisée en bonus le 2026-05-09 lors de l'ajout de la salle
      fontaine. PNG dédié à générer plus tard si remplacement
      souhaité.*

---

## Bloc D — Blasons des 4 maisons (PNG via LLM image)

> Les SVG inline actuels des blasons se trouvent dans `index.html:91-189`
> (écran de sélection) et sont réinjectés dans le HUD via `js/ui.js:54-68`
> (`#house-crest`). Le passage en PNG :
> 1. génère 4 fichiers `img/houses/<id>.png` (512×512 RGBA, fond transparent) ;
> 2. remplace les `<svg id="..._logo">` par `<img src="img/houses/<id>.png">`
>    dans `index.html` ;
> 3. adapte `js/ui.js` (`#house-crest`) pour cloner l'`<img>` correspondant.

- [x] **D1** Blason Gryffondor (lion, rouge & or)
- [x] **D2** Blason Serpentard (serpent, vert & argent)
- [x] **D3** Blason Serdaigle (aigle, bleu nuit & bronze)
- [x] **D4** Blason Poufsouffle (blaireau, jaune & noir)

> Version V1 (médaillons héraldiques ornés) installée par défaut dans
> `img/houses/`. Version V2 (style coaster film officiel) conservée dans
> `img/houses/v2/` pour comparaison en jeu — switch via le `src` des
> `<img id="..._logo">` dans `index.html`.

---

## Sprites items refondus (méthode 64×64 → 32×32)

> Méthode documentée dans `.claude/plans/icon-quality.md` §"Méthode 64×64 → 32×32".
> Dessin source haute-résolution puis downscale Box + alpha binarisé +
> palette quantize, compatible avec `image-rendering: pixelated`.

| Sprite | PR | Script générateur | Notes |
|--------|----|-------------------|-------|
| `bottes_apprenti` | #51 | `tools/gen_boot_sprite.py` | Silhouette en L, lacets dorés en X, talon distinct |

---

## Finalisation

- [ ] **Z1** Commit final groupé sur `claude/improve-game-svgs-0a3cf` + push.

---

## Journal des sessions

| Date | Session | Tâches traitées | Notes |
|------|---------|-----------------|-------|
| 2026-05-09 | #1 | Plan initial rédigé | — |
| 2026-05-09 | #2 | C01 chat_norris intégré (PNG via rembg) | Pipeline rembg+alpha-matting validé |
| 2026-05-09 | #3 | C02 luciole_marais intégré | Script `/tmp/svg_work/integrate.py` réutilisable |
| 2026-05-09 | #4 | Reprise sur branche `claude/improve-svg-HWGDY`, cible C03 cornichon | Prompt fourni, en attente d'image |
| 2026-05-09 | #5 | C03 cornichon intégré (PNG via rembg) + témoin SVG du smoke test rendu auto-adaptatif | Ailes translucides perdues par rembg, corps lisible |
| 2026-05-09 | #6 | C03 cornichon ré-intégré avec birefnet-general (ailes préservées) | Pipeline étendu : modèle birefnet-general garde les zones translucides ; à privilégier pour les créatures à ailes/voiles |
| 2026-05-09 | #7 | C04 chouette_envoutee intégrée (birefnet-general) | Plumes fines + fumée violette de corruption + serres préservées |
| 2026-05-09 | #8 | C05 araignee intégrée (birefnet-general) | 8 pattes, crocs avec venin et fil de toile conservés |
| 2026-05-09 | #9 | C06 mandragore_sauvage intégrée (birefnet-general) | Couronne de feuillage + radicelles fines préservées |
| 2026-05-09 | #10 | C07 kappa_douves intégré (birefnet-general) | Bol d'eau sur le crâne + algues filaments + griffes acérées préservés |
| 2026-05-09 | #11 | C08 hippogriffe_courroux intégré (birefnet-general) | Ailes déployées + cicatrices de combat + regard menaçant préservés |
| 2026-05-09 | #12 | C09 acromantula_jeune intégrée (birefnet-general) | 8 yeux, crocs avec venin + fils de toile préservés ; visuellement plus poilue/menaçante que C05 araignee |
| 2026-05-09 | #13 | Ajout du bloc D (4 blasons de maison en PNG) au plan | Statut 9/75 ; prompts D1-D4 préparés, intégration `index.html` + `ui.js` à prévoir lors de la première intégration |
| 2026-05-09 | #14 | D1-D4 intégrés (V1 médaillons héraldiques) + V2 coasters mis de côté pour comparaison | `<svg>` inline remplacés par `<img>` ; `ui.js` inchangé (cloneNode() compat IMG) ; nouveau scénario 8 dans smoke.js (chargement PNG + clone HUD) |
| 2026-05-09 | #15 | C10 peeves intégré (birefnet-general) sur branche `claude/continue-svg-work-v6BEc` | Costume bouffon + ricanement + geste obscène préservés ; débris/aura magiques retirés (rendus à part en jeu) |
| 2026-05-09 | #16 | C11 myrtle intégré (birefnet-general) | Mimi Geignarde fantôme bleu argenté, lunettes rondes, couettes, robe Poudlard ; brume spectrale et ondulations préservées dans l'alpha |
| 2026-05-09 | #17 | C12 serpent_cachot intégré (birefnet-general) | Serpent vert émeraude/noir en S-pose, gueule ouverte, langue bifide, brume verte ; détourage propre y compris la queue fine |
| 2026-05-09 | #18 | Bloc A complet (A1-A6) terminé | Plan dédié `.claude/plans/bloc-A.md` ; ordre A3→A1→A2→A4→A5→A6 ; `<defs>` partagés (`shadeRadial`, `halo`, `mist`, `glow`) injectés une fois via `_ensureMonsterDefs()` ; 5 fallback de catégorie redessinés ; couleurs base/variantes plus contrastées ; 4 SVG d'objets enrichis (gradients, rivets, lumière chaude) ; animations CSS `monsterFloat`/`monsterPulseAura` (data-cat) + SMIL scintillement coffre + media `prefers-reduced-motion` ; 4 nouveaux ornements (séparateur fin, cadre parchemin, bouton-volute, badge-rune) |
| 2026-05-09 | #19 | Salle fontaine (feature connexe) | `CELL.FOUNTAIN=7` ; génération forcée aux étages 2/5/8/… ; SVG fontaine de pierre Poudlard (statue chouette, jet animé SMIL, cabochons or) ; `useFountain()` 100% PV+PM groupe, 1×/visite, ré-active à la rentrée ; persistance via `usedFountains` (Set) dans save ; marqueur canvas + tuile minimap bleue ; `.claude/plans/fountain.md` ; smoke test mis à jour |
| 2026-05-09 | #20 | Reprise sur branche `claude/resume-svg-work-rgOvm` ; C13 gobelin intégré (birefnet-general) | Sabre courbe gravé runique + manteau bourgogne déchiré + gauntlets en cuir préservés ; alpha propre y compris la lame translucide verte et les longs doigts griffus |
| 2026-05-09 | #21 | C14 troll intégré (birefnet-general) | Troll des Toilettes hunchback, club en bois cerclé de fer levé, peau grise verruqueuse, pagne en peaux ; alpha conserve le club, la corde de peau et les bouts de loincloth |
| 2026-05-09 | #22 | C15 troll_grotte intégré (birefnet-general) | Troll des Cavernes massif, marteau de pierre brandi à deux mains, peau gris-bleu calcifiée, kilt de fourrure orné d'un crâne et de trophées d'os ; prompt ramené sous 2000 caractères à la demande |
| 2026-05-09 | #23 | C16 bundimun intégré (birefnet-general, source webp) | Masse fongique avec tiges oculaires multiples, mâchoire baveuse, pattes araignée et coulures de sécrétion verte luminescente ; pipeline étendu pour accepter les sources webp via PIL convert("RGBA") |
| 2026-05-09 | #24 | C17 meduse_noire intégrée (birefnet-general, source jpg sur fond forêt) | Sorcière à chapeau pointu, peau craquelée, serpents enroulés autour du chapeau et de la main, collier de crânes ; détourage propre malgré le fond non-noir |
| 2026-05-10 | #25 | C18 homme_araignee intégré (birefnet-general) | Hybride humain-araignée gaunt, 8 pattes, robe sorcier déchirée, fils de toile préservés ; visuellement plus humain que C09 acromantula_jeune |
| 2026-05-10 | #26 | C19 portrait_hostile intégré (birefnet-general) | Cadre baroque doré incliné, noble en perruque hurlant, main jaillissant de la toile avec aura magique verte ; alpha conserve les arêtes du cadre et les éclairs énergétiques |
| 2026-05-10 | #27 | C20 centaure intégré (birefnet-general) | Centaure guerrier robe bai pommelé, arc bandé, flèche prête, marques tribales charcoal ; queue, crinière et carquois préservés |
| 2026-05-10 | #28 | C21 detraqueur intégré (birefnet-general) | Détraqueur lambda flottant, capuche, mains squelettiques, lambeaux de tissu fins préservés ; visuellement distinct du C34 detraqueur_gardien (futur re-gen) |
| 2026-05-10 | #29 | C22 loup_garou intégré (birefnet-general) | Hybride homme-loup hunché en course, mâchoire ouverte avec crocs et salive, restes de pantalon humain déchiré ; pelage hérissé et griffes courbes préservés |
| 2026-05-10 | #30 | C23 inferius intégré (birefnet-general) | Cadavre noyé réanimé, peau gris-bleu translucide, yeux laiteux, linceul effiloché trempé ; coulures d'eau et lambeaux préservés |
| 2026-05-10 | #31 | C28 boggart intégré (birefnet-general, source fond blanc) | Épouvantard en transformation araignée hairy, volutes de fumée et visages fantomatiques émergeants ; prompt "transformation incomplete" pour figer une silhouette lisible ; PNG nommé `boggart.png` (id du monstre, pas son nom français) ; saute en avant dans la liste — C24-C27 mangemorts/sorcier_renegat à faire ensuite |
| 2026-05-10 | #32 | Chantier outillage (sur branche `claude/improve-game-images-7OVCy`, post-rebase sur master) | `IMG_STYLE.md` (guide visuel : palette/cadrage/prompts-types §8/critères §9, dérivé des PNG validés) ; `tools/process_monster_png.py` (pipeline reproductible rembg/birefnet + trim + recentrage + resize + auto-QA) ; `tools/count_plan.py` (compte tous blocs A+B+C+D+Z et signale les dérives vs `Statut global`) ; smoke scénario 5 data-driven sur tous les `imgSrc` (19 monstres) + check color-type RGBA via lecture binaire (canvas tainted en `file://`). Pas de rétro-traitement des PNG master |
| 2026-05-11 | #33 | C24 mangemort intégré (sur branche `claude/monster-png-C24-mangemort`) | Source 1024×1024 RGBA livrée avec alpha déjà détouré (43,8% pixels α=0) → skip rembg, pipeline inline (trim bbox + recentrage 8% + resize 512 + optimize). Squelette masqué hood noir, baguette à étincelles violettes, robe noire en lambeaux. QA §9 : alpha=0 57%, alpha=255 22%, occupation 85×83%, 294 KB ✓. Constat : C25 `mangemort_masque` n'a jamais existé dans `monsters.js` (id "mangemort" porte déjà `name:"Mangemort Masqué"`) → marqué `[~]` n/a |
| 2026-05-12 | #34 | C26 + C27 + C29 + C30 intégrés (sur branche `claude/svg-c1-monsters-png`) | 4 PNG livrés par Nano Banana en lot. 3 sources 1024×1024 RGBA déjà détourées (mangemort_elite α0=59%, sorcier_renegat α0=65%, chimere α0=48%) → pipeline inline trim+recentrage 8%+resize 512+optimize (cf. `.claude/plans/svg-c1-monsters.md`). 4ᵉ source ombre_quirrell 784×1168 JPG fond sombre dégradé → `process_monster_png.py --id ombre_quirrell` (rembg birefnet-general, modèle téléchargé 973 MB). Résultats : mangemort_elite 296 KB (77×84%), sorcier_renegat 240 KB (79×84%), chimere 396 KB (82×84%), ombre_quirrell 117 KB (60×84%, α255=8.6% acceptable car fantôme translucide). Smoke 34/34. Bloc C.1 désormais clos (C26-C30 ✓, C25 n/a) hors re-gens optionnels C32-C37. C.4 portraits PNJ cochés rétroactivement (déjà livrés via plan `npc-integration.md` it. 2/3). Statut global 36 → 44 (C26,C27,C29,C30 + C38,C39,C40,C41). |
| 2026-05-12 | #35 | C31 bellatrix intégré (suite sur même branche `claude/svg-c1-monsters-png`) | Source 1024×1024 RGB avec décor gothique complet (donjon, arches, lueurs vert/violet) — cas difficile mais Bellatrix a un contour net (cheveux volants, robe en lambeaux, bottes lacées). Pipeline complet `process_monster_png.py --id bellatrix` (rembg birefnet-general). Dry-run validé visuellement avant run final : détourage impeccable, rim light cyan préservé subtilement, aucune bavure du fond. QA §9 tous critères verts : 139 KB, 512×512 RGBA, α0=78%, α255=17%, occupation 53×84%. Smoke 34/34. Bloc C.2 clos. Statut global 44 → 45/86. Mini-plan dédié `.claude/plans/svg-c2-bellatrix.md`. |
| 2026-05-12 | #36 | C42 + C43 intégrés (suite sur même branche) — clôture bloc C.5 | Choix utilisateur tranché : illustration centrale qui remplace les SVG (vs background d'ambiance ou hybride). C42 château nocturne (tours gothiques, lac réfléchissant, lune, brume violette) généré du premier coup. C43 v1 « collapsed body in corridor » bloqué par filtres Gemini → v2 « petrified statue » (canon HP : pétrification ≠ mort, victimes du Basilic ramenées par mandragore) → v3 plan B « still life sans figure » accepté (baguette, lunettes rondes brisées, écharpe Gryffondor, livre, œil du Basilic dans la flaque). 2 PNG 1024×1024 RGB → conversion JPEG q88 progressive optimize → `img/scenes/title.jpg` 182 KB + `img/scenes/death.jpg` 205 KB. `index.html` : SVG inline château (150 lignes, ~8.7 KB de markup) remplacé par `<img>` 1 ligne dans `.castle-art` ; SVG `death-seal` remplacé par `<img class="death-art">`. CSS : règle `.castle-art svg` étendue à `img`, anims orphelines supprimées (`.title-win-warm/.title-win-cold/.title-moon/.title-twinkle` + keyframes `titleFlickerWarm/titleFlickerCold/moonGlow/titleSvgTwinkle`) — vérifié `grep -rE` zéro référence orpheline. Nouvelle règle `.death-art` (width min(72vw, 320px), border-radius 12px, glow box-shadow rouge). Smoke 34/34. Statut global 45 → 47/86. Mini-plan dédié `.claude/plans/svg-c42-c43-scenes.md`. |
