# Remappage configurable des touches

> Dernier item ergonomie « hors-scope (à acter) » de
> [`ergonomics-improvement.md §164`](./ergonomics-improvement.md). Donne à
> l'utilisateur la possibilité de **rebinder** les touches de déplacement,
> de raccourci d'exploration et d'action de combat, persistées hors-save.
> Branche : `claude/configurable-keybindings`.

## Problème

Les touches sont **codées en dur** dans l'unique handler `keydown` de
`main.js` (`fwd/back/left/right`, `i/p/c/f/r`, combat `a/s/g/o/f`). Aucune
personnalisation possible — un joueur dont le clavier/handicap impose un autre
mapping est bloqué. (AZERTY est déjà couvert via `z/q`, arrows déjà doublées,
donc le besoin résiduel porte surtout sur les raccourcis lettres.)

## Décisions de conception

1. **Deux contextes séparés** (`explore` / `combat`) — exactement comme
   aujourd'hui, où une même touche physique (`a`, `s`, `f`) a un sens
   différent en combat et en exploration. Le résolveur ne regarde que le
   contexte actif.
2. **Multi-touches par action** : chaque action garde une **liste** de touches
   (on préserve les défauts arrows + AZERTY). Le joueur ajoute / retire des
   touches ; pas de remplacement destructif imposé.
3. **Défauts = comportement actuel au bit près** → zéro régression « out of the
   box ». La perso n'existe que si le joueur la crée.
4. **Module auto-contenu `js/keybindings.js`** : données + résolveur +
   rendu de la section UI (la modale Réglages ne fait qu'exposer un conteneur).
   Persistance `localStorage` `hogwarts_rpg_keybindings` (hors-save, comme les
   prefs audio / `barksEnabled` / nom de joueur). DÉFENSIF.
5. **Refactor minimal de `main.js`** : remplacer les littéraux par
   `kbResolveExplore(k)` / `kbResolveCombat(k)`. On conserve le `preventDefault`
   sur les seules actions de déplacement (parité stricte).
6. **Détection de conflit** non bloquante : une touche liée à 2 actions du même
   contexte est signalée ⚠ ; le déplacement gagne (ordre du catalogue) — c'est
   au joueur de résoudre.

## Hors-scope (assumé)

- Rebind de `Échap`, `Entrée/Espace`, des flèches **en navigation de grille**,
  et des chiffres de ciblage (1-9) : touches **structurelles / a11y**, non
  remappables (cohérent avec les conventions OS).
- Presets de layout (QWERTY/AZERTY) : inutile, les deux marchent déjà.
- Rebind par souris/manette.

## Étapes

| # | Étape | Fichier | Vérif |
|---|-------|---------|-------|
| 1 | Module `keybindings.js` : `KB_ACTIONS` (catalogue), load/save localStorage, `kbKeysFor`/`kbMatch`/`kbResolveExplore`/`kbResolveCombat`, `kbAddKey`/`kbRemoveKey`/`kbReset`, `kbRenderSettings()` + capture de touche. | `js/keybindings.js` (nouveau) | Module chargé, globals au loader. |
| 2 | Brancher le module : `<script>` dans `index.html` (après `ui-settings.js`), section `<div class="settings-section-label">Touches</div><div id="keybind-list">` dans `#settings-modal`, appel `kbRenderSettings()` dans `openSettingsModal()`. | `index.html`, `js/ui-settings.js` | Section visible en ouvrant Réglages. |
| 3 | Refactor handler : exploration → `kbResolveExplore(k)` (switch) ; combat → `kbResolveCombat(k)`. Défauts inchangés. | `js/main.js` | `RelativeControls` + `CombatKeyboard` verts. |
| 4 | Loader MANIFEST : `kbResolveExplore`/`kbResolveCombat` (fn). | `js/loader.js` | Pas de bandeau rouge. |
| 5 | Test E2E `scenarioKeybindings` : rebind « Sac » de `i`→`b`, presser `b` ouvre le sac, `i` ne l'ouvre plus ; reset restaure. | `tests/scenarios/controls.js` | `node tests/smoke.js Keybindings` vert. |
| 6 | Cache-bump (`main.js`, `loader.js`, `ui-settings.js`, `index.html`, nouveau `keybindings.js`) + `CACHE_VERSION`. | `index.html`, `sw.js` | `check_cache_versions.js` exit 0. |

**Verify global** : `node tests/smoke.js` (Keybindings + RelativeControls +
CombatKeyboard + GridArrowNav + ModalIsolation) vert ; check cache exit 0 ;
test manuel : rebind une touche, recharger la page → binding persiste.

## Avancement

- ✅ **Livré le 2026-06-20.** Les 6 étapes faites :
  module `js/keybindings.js` (catalogue + résolveurs + persistance + UI de
  capture), section « Touches » dans `#settings-modal` + appel dans
  `openSettingsModal()`, refactor du handler `main.js` (résolveurs + fallback
  défensif), MANIFEST loader, `scenarioKeybindings` (controls.js), cache-bump
  (main v30, ui-settings v4, loader v52, keybindings v1, CACHE_VERSION v176).
- Tests verts : `Keybindings` + non-régression `RelativeControls`,
  `CombatKeyboard`, `GridArrowNav`/`GridKeyboardNav`, `ModalIsolation`,
  `ConfirmModal`, `A11yFinish` ; `check_cache_versions` exit 0 ; `pwa-smoke` OK ;
  `check_doc_modules` aligné (87 modules).
- Écart au plan : aucun. Périmètre tenu (hors-scope respecté).
