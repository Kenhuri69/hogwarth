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
