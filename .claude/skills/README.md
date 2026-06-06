# Skills du projet Poudlard & Magie

Deux familles de skills cohabitent dans ce dossier.

## Skills maison (spécifiques au projet)

Rédigées pour ce dépôt, elles encapsulent les workflows récurrents documentés
dans `CLAUDE.md` / `.claude/guidelines.md`.

| Skill | Rôle |
|-------|------|
| `add-monster` | Ajouter un monstre (`monsters.js`, sprite, bestiaire, smoke) |
| `add-item-icon` | Générer une icône d'item (pipeline `tools/icon_factory.py`) |
| `add-playable-character` | Ajouter un héros sélectionnable (portrait médaillon, `CHARACTERS`) |
| `ui-design-iterate` | Itération UX/UI pilotée par captures desktop+mobile (Playwright) |
| `commit-guard` | Garde-fou commit : plan §5 → smoke §7 → état PR §6 |

## Skills officielles Anthropic (vendorisées)

Copiées **verbatim** depuis le dépôt public
[`anthropics/skills`](https://github.com/anthropics/skills)
(commit `da20c92503b2e8ff1cf28ca81a0df4673debdbf7`), licence **Apache 2.0**
(voir le `LICENSE.txt` dans chaque dossier). Non modifiées.

| Skill | Rôle | Complément projet |
|-------|------|-------------------|
| `frontend-design` | Interfaces frontend de qualité production, anti « AI slop » | Le *quoi viser* esthétique ; `ui-design-iterate` fait le *comment capturer* |
| `webapp-testing` | Harnais Playwright (vérif UI, screenshots, logs navigateur) | S'aligne avec `tests/smoke.js` et `tests/screenshot-*.js` |
| `theme-factory` | Thèmes (palettes/fonts) pour artefacts ; 10 préréglages | Dériver/formaliser le thème parchemin/or |
| `skill-creator` | Méta-skill : créer/améliorer/évaluer des skills | Pour rédiger proprement les prochaines skills maison |

## Dépendances & hook d'install paresseuse

Les skills qui lancent des tests/génèrent des assets ont besoin de
dépendances absentes d'un environnement web vierge :
- **Python** (`pillow/cairosvg/numpy/scipy` ; `rembg` à la demande) →
  `tools/requirements.txt`. Chaque skill concernée a une section
  « Prérequis » auto-réparante (check-then-install).
- **Playwright + Chromium** (tests `smoke.js`/`pwa-smoke.js`/`select.js`).

Un hook **`PreToolUse(Bash)`** (`.claude/settings.json` →
`.claude/hooks/ensure-test-deps.sh`) installe Playwright **paresseusement, au
premier appel d'un test** de la session (pas au démarrage), puis laisse la
commande s'exécuter. No-op pour toute autre commande ; ne bloque jamais.
> ⚠️ Un nouveau `.claude/settings.json` n'est pris en compte qu'à la session
> suivante (ou après ouverture de `/hooks`). Caveat réseau : si l'install
> échoue, le hook prévient sans bloquer.

### Mise à jour des skills vendorisées
Pour resynchroniser depuis l'amont :
```bash
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/anthropic-skills
for s in frontend-design webapp-testing theme-factory skill-creator; do
  rm -rf .claude/skills/$s && cp -r /tmp/anthropic-skills/skills/$s .claude/skills/$s
done
```
Mettre à jour le commit de provenance ci-dessus.
