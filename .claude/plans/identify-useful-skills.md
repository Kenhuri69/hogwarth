# Plan — Identifier et créer les skills utiles au projet

## Contexte
Le dépôt n'avait aucune skill ni command personnalisée (`.claude/skills/`
et `.claude/commands/` absents) alors que `CLAUDE.md` + `guidelines.md`
décrivent plusieurs workflows récurrents, multi-étapes et faciles à rater.

## Décision (validée par l'utilisateur)
Créer 4 skills spécifiques au projet :
1. `add-monster` — ajouter un monstre
2. `add-item-icon` — ajouter une icône d'item (pipeline `icon_factory.py`)
3. `add-playable-character` — ajouter un héros sélectionnable
4. `commit-guard` — garde-fou commit (plan §5 → smoke §7 → état PR §6)
5. `ui-design-iterate` — itération UX/UI pilotée par captures desktop+mobile
   (ajoutée après relance utilisateur : axe UX design initialement manqué)

### Skills officielles Anthropic vendorisées (relance utilisateur — axe design)
Copiées verbatim depuis `anthropics/skills` @ da20c92, Apache 2.0
(LICENSE.txt conservé dans chaque dossier, fichiers non modifiés) :
- [x] `frontend-design` — qualité design des interfaces
- [x] `webapp-testing` — harnais Playwright (vérif UI / screenshots / logs)
- [x] `theme-factory` — thèmes (palettes/fonts), 10 préréglages
- [x] `skill-creator` — méta-skill création/amélioration/éval de skills
- [x] `.claude/skills/README.md` — provenance + reco maison/vendorisé
- [ ] commit + push

Les skills built-in (`verify`, `run`, `code-review`, `security-review`,
`init`…) couvrent déjà les besoins génériques — non recréées.

## Étapes
- [x] Explorer le repo (tools/, tests/, plans/, monsters.js, item-icons.js)
      → vérif : structure et workflows compris
- [x] Demander à l'utilisateur quelles skills créer → vérif : 4 retenues
- [x] Créer `.claude/skills/add-monster/SKILL.md`
      → vérif : reflète template `monsters.js`, `imgSrc`, bestiaire, smoke
- [x] Créer `.claude/skills/add-item-icon/SKILL.md`
      → vérif : reflète `tools/README.md` + recettes + registre
- [x] Créer `.claude/skills/add-playable-character/SKILL.md`
      → vérif : reflète procédure portrait/médaillon + CHARACTERS + hero-grid
- [x] Créer `.claude/skills/commit-guard/SKILL.md`
      → vérif : enchaîne §5/§7/§6 des guidelines
- [ ] Commit + push sur `claude/identify-useful-skills-RRbHO`
      → vérif : `git push -u origin` OK

## Notes / écarts
- Les skills sont purement documentaires (markdown) → pas de régression de
  code, `node tests/smoke.js` non requis pour ce changement (cf. §7 :
  changement documentaire). À mentionner à l'utilisateur.
- Faits constatés utiles encodés dans les skills :
  - Monstres : sprite PNG via champ `imgSrc:"img/monsters/<id>.png"` +
    pipeline `tools/process_monster_png.py` (rembg) ; fallback SVG `icons.js`.
  - Icônes items : parts SVG dans `tools/parts/` (19 dispo), recettes
    `RECIPES` dans `icon_factory.py`, sortie `img/icons_new/<id>_<size>.png`,
    registre `ITEM_ICON_NEW_REGISTRY` (`js/item-icons.js`).
  - Bestiaire lit `lore`/`habitat`/`anecdote`/`danger` (optionnels).
