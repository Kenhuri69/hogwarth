# LOT A — Pack Accessibilité & Mobile

> Branche : `claude/a11y-mobile-pack` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT A.
> Document vivant — coché au fil de l'implémentation.

## Cadrage fondé sur l'état réel du code (pas les estimations d'audit)

Vérifications faites avant implémentation (corrige plusieurs surestimations de l'audit) :

- **Contrastes re-mesurés** (script WCAG). Échecs réels (AA texte = 4.5:1) :
  | Classe | Couleur | Fond | Ratio | Verdict |
  |--------|---------|------|-------|---------|
  | `.stat-item .skey` (324) | `#6a5030` | `#0a0705` | **2.68** | FAIL |
  | `.char-stats-panel .stat-label` (1853) | `#8a7050` | `#1a0f05` | **4.05** | FAIL (limite) |
  | `.hd-tier-threshold` (3585) | `#8a7050` | `#1a0f05` | **4.05** | FAIL (limite) |
  | bestiary tags/labels (817,818,839) | `#6a5030` | dark | **2.68** | FAIL |
  | `gold-light` sur dark-wood | `#f0d080` | `#2a1a0a` | 11.23 | OK (audit FAUX) |
  | `parchment-dark` sur dark-wood | `#e8d5a0` | `#2a1a0a` | 11.56 | OK (audit FAUX) |
  - `#6a5030` sert AUSSI aux états **désactivés** (`.cmd-btn.searched`, `.forge-noupgrade`…) → **laissés tels quels** (WCAG exempte le désactivé).
- **`:focus-visible`** : présent seulement sur `.xp-wrap`/`.crest-wrap` ; **absent** sur `.cmd-btn`/`.dpad-btn` → à ajouter.
- **Canvas** (`#dungeon-canvas`, index.html:481) : aucun `role`/`aria-label` → à ajouter.
- **D-pad** (index.html:678-684) : boutons emoji sans `aria-label` → à ajouter.
- **`safe-area-inset`** : **totalement absent** des CSS → à ajouter (header/footer).
- **PV/PM mobile** : le panneau gauche **EST conservé** en mobile (style.css:3760-3799), compacté. L'audit (« panneau disparaît ») est **FAUX** → rien à faire.
- **Minimap mobile** : disponible via `#minimap-corner` overlay (style.css:675+). OK.
- **reduced-motion** : 4 blocs existants, mais **rien** dans `ux-improvements.css`
  (float-dmg/shake-hit/flash-heal non gardés) → à ajouter.
- **Tooltips tactiles** : hover-only (ux-improvements.js). **Reporté hors LOT A**
  (risque d'interférer avec les clics d'items, plus value/risque incertain) — noté.

## Tâches

- [x] **A1** Recoloré les labels informatifs en échec WCAG (var `--label-muted: #b09464`)
      : `.stat-item .skey`, `.char-stats-panel .stat-label`, `.hd-tier-threshold`,
      labels bestiaire (cat/floor/stat/chance/empty). États désactivés `#6a5030`
      laissés intacts. **Contraste mesuré 6.5–7.0:1 sur tous les fonds.** ✓
- [x] **A2** `:focus-visible` doré sur boutons interactifs (style.css après reset) +
      `role="application"` & `aria-label` sur `#dungeon-canvas` + `aria-label` sur
      les 4 boutons D-pad + `role="group"` sur le pavé. ✓
- [x] **A3** `env(safe-area-inset-*)` via `max()` sur `.game-header` & `.commands-bar`
      (desktop inchangé car env()=0 → max() conserve les valeurs de base). ✓
- [x] **A4** Bloc `prefers-reduced-motion` dans `ux-improvements.css` neutralisant
      `.float-dmg`/`.shake-hit`/`.flash-heal`/`.clp-entry`. ✓
- [x] **Tests** `node tests/smoke.js` → **121/121 verts**. ✓

## Hors scope (noté, pas oublié)
- Tooltips tactiles mobile (JS, risque/valeur incertains).
- Landscape mobile (`100vh`) — chantier layout plus lourd.
- Refonte onboarding → LOT D.

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | Cadrage + vérifs terrain. Implémentation en cours. |
