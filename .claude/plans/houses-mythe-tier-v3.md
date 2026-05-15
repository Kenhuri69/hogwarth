# Plan — Maisons V3 : palier « Mythe » + sprites set dédiés

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items hors-scope d'`houses-2.0.md` (archivé PR #123).
> Pré-requis : `houses-2.0` joué et stabilisé sur master.

## 1. Contexte

`houses-2.0.md` (archivé) a livré 16 paliers (Bronze/Argent/Or × 5 phases
+ Légende), sets 4 pièces par Maison (1 existant + 3 nouveaux), bonus
2/3/4 + passifs, UI fiche perso, audio set-complete, quête de Maison
unlock palier 5.

Trois axes restent **explicitement hors scope** dans le plan archivé :

| Axe | Statut | Raison |
|-----|--------|--------|
| 7e palier « Mythe » (post-Légende) | Hors scope | Pas encore d'endgame contenu pour le justifier |
| Sous-paliers Diamant / Platine | Hors scope | Inflation paliers, ROI faible |
| Sprites dédiés des 12 NEW set items | Placeholder (alias d'icônes existantes) | Pipeline `tools/icon_factory.py` 4627 lignes, 12 entrées à recetter |

Ce plan adresse les 3 axes en priorisant **le visuel** (axe 3) car
c'est celui qui a la plus haute valeur perçue par le joueur.

## 2. Vagues

### Vague A — Sprites dédiés des 12 NEW set items (priorité haute)

**Pourquoi en premier** : les items du Set Maison sont équipés en
endgame, le manque de sprite dédié casse l'immersion. Le pipeline est
déjà en place (`tools/icon_factory.py`), il faut juste 12 recettes.

**Items concernés** (extraits de `js/state.js — HOUSE_SETS`) :

| Maison | Items NEW (3 par Maison) |
|--------|--------------------------|
| Gryffondor | `heaume_vaillant` (head), `cape_godric` (cloak), `coeur_lion` (amulet) |
| Serpentard | `circlet_serpent` (head), `cape_basilic` (cloak), `crochet_basilic` (amulet) |
| Serdaigle | `casque_aigle` (head), `cape_savant` (cloak), `plume_aigle` (amulet) |
| Poufsouffle | `casque_blaireau` (head), `cape_terre` (cloak), `coupe_juste` (amulet) |

**Approche** :
- Réutiliser les palettes Maison standardisées (cf. `CLAUDE.md §Pipeline d'icônes`).
- Pour chaque item, identifier le `part SVG` pertinent (`hood.svg`,
  `gem-pendant.svg`, `tiara.svg`, `hat-pointy.svg`) ou créer le part
  manquant.
- Recette dans `RECIPES` de `tools/icon_factory.py` avec accent
  `{kind:"symbol", shape:"lion|snake|eagle|badger", color, size}`.
- Générer 5 PNG par item (16/24/32/48/64) → `img/icons_new/<id>_<size>.png`.
- Référencer dans `js/item-icons.js — ITEM_ICON_NEW_REGISTRY`.

**Vérification** : ouvrir le jeu, équiper Set Lion 4/4 sur Harry,
vérifier visuellement que les 4 cellules du panneau Set affichent bien
les sprites dédiés (pas le placeholder).

### Vague B — Palier 7 « Mythe » (priorité basse, attendre endgame mature)

**Pré-requis** : avoir joué jusqu'au palier 16 « Légende » au moins
2 fois et confirmé que le contenu endgame justifie un palier supplémentaire.

**Spec proposée** :
- Palier 7 (Mythe) débloqué à `housePoints >= 5000` (vs 3000 Légende).
- Récompense : item unique non-set (artefact « hors set »), enseigné
  un sort exclusif :
  - Gryffondor → Sort `Patronus Maxima` (AOE shield + retire fear).
  - Serpentard → Sort `Sectumsempra Imperius` (DoT + force ennemi à
    attaquer ses alliés 2 tours).
  - Serdaigle → Sort `Legilimens` (révèle abilities ennemies + nullifie
    1 ability/combat).
  - Poufsouffle → Sort `Récolte Magique` (regen full party + +50 % gold
    drop combat suivant).
- Quête associée : « Faire don de 3000 gold à la Maison » (sink endgame).

**Reporter ce chantier tant que** :
- Aucun joueur n'a atteint le palier 16.
- Ou aucun retour user demandant explicitement plus d'endgame Maison.

### Vague C — Sous-paliers Diamant / Platine (probablement à abandonner)

**Pourquoi à abandonner** : 16 paliers est déjà beaucoup. L'ajout de
Diamant/Platine entre Or et Légende crée 4 paliers supplémentaires (3
phases × 4 maisons), peu différenciés, ROI faible.

**Décision recommandée** : NE PAS implémenter sauf demande utilisateur
explicite. Si un sous-palier est ajouté, le faire **par Maison** (ex:
Diamant Gryffondor uniquement) plutôt qu'horizontalement.

## 3. Étapes (Vague A uniquement, A et B selon roadmap)

### Vague A — Sprites NEW set items

- [ ] Audit visuel : capturer screenshots des 12 cellules placeholder dans le panneau Set.
- [ ] Identifier les 4 parts SVG manquants éventuels (cape, casque dédié Maison) → créer si besoin.
- [ ] Recette `heaume_vaillant` (Gryffondor) dans `RECIPES` (palette `(116,0,1)` + emblème `lion`).
- [ ] Recette `cape_godric` (Gryffondor cloak).
- [ ] Recette `coeur_lion` (Gryffondor amulet, gem rouge centrée).
- [ ] Idem Serpentard ×3 (palette `(26,71,42)` + `snake`).
- [ ] Idem Serdaigle ×3 (palette `(14,26,64)` + `eagle`).
- [ ] Idem Poufsouffle ×3 (palette `(55,46,41)` + `badger`).
- [ ] `python3 tools/icon_factory.py heaume_vaillant cape_godric ...` (12 IDs).
- [ ] Référencer 12 entrées dans `ITEM_ICON_NEW_REGISTRY` de `js/item-icons.js`.
- [ ] Lancer le jeu, équiper Set Lion 4/4, capture comparée avant/après.
- [ ] Smoke `scenarioHouseSetSpritesAvailable` : `getItemIconHtml('coeur_lion', 64)` doit contenir `img/icons_new/coeur_lion_64.png`.
- [ ] Commit + push.

### Vague B — Palier Mythe (différé, à activer après décision)

- [ ] Décision GO/NO-GO basée sur retours utilisateurs.
- [ ] Si GO : sous-plan dédié `houses-mythe-spells.md` détaillant les 4 sorts exclusifs.

## 4. Risques

- Vague A : pipeline lourd, 12 recettes × 30 min ≈ 6h de travail. Mitigation :
  factoriser par Maison (palette + emblème → variantes par slot).
- Vague B : créer du contenu endgame que personne ne voit → différer
  tant que le ROI est incertain.
