# Plan — Chips de filtre de sorts accessibles au clavier (clôture a11y)

> Statut : **en cours** (branche `claude/spell-filter-chips-keyboard`).
> Clôt le dernier Hors-scope de la chaîne d'accessibilité clavier
> (`inventory-keyboard-nav.md` + `keyboard-nav-shop-bestiary-codex.md`) :
> « Filtres/chips `div` non focusables ». Créé le 2026-06-20.

## Constat (audit 2026-06-20)

Inventaire complet des contrôles de filtre du jeu :

| Surface | Contrôle | Élément | Clavier ? |
|---------|----------|---------|-----------|
| Bestiaire | recherche + 3 filtres | `<input>` / `<select>` | ✅ natif |
| Codex | onglets de section | `<button>` | ✅ natif |
| Codex | recherche + état | `<input>` / `<select>` | ✅ natif |
| **Sorts (OOC + combat)** | chips de catégorie | **`<div onclick>`** | ❌ |

→ Le **seul** contrôle de filtre non atteignable au clavier est la barre de
chips de catégorie de sorts (`_spellFilterBarHtml`, `js/inventory-spells.js`),
partagée par `openSpells` (hors combat) **et** `openBattleSpells` (combat).

## Direction retenue

Convertir le chip `<div onclick>` en **`<button type="button">`** — l'élément
sémantiquement correct pour une bascule de filtre :
- focusable + activation **Entrée/Espace natives** (zéro handler ajouté) ;
- repère de focus doré via `[tabindex]:focus-visible` (on ajoute `tabindex="0"`) ;
- `aria-pressed` = état actif (sémantique toggle pour lecteurs d'écran) ;
- conteneur `role="group"` + `aria-label` ;
- `appearance:none` + styles inline conservés → **rendu visuel identique**.

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/inventory-spells.js` | `_spellFilterBarHtml` : chip `<div>` → `<button type="button" tabindex="0" aria-pressed>` ; wrapper `role="group"`. | Chip Tab-atteignable, Entrée bascule le filtre, visuel inchangé. |
| `index.html` + `sw.js` + `CACHE_VERSION` | cache-bump `inventory-spells.js`. | `check_cache_versions --base origin/master` exit 0. |

> Zéro changement `main.js` (le `<button>` s'active nativement, pas via
> `GRID_CELL_SEL`). Zéro CSS. Zéro dépendance.

## Verify

1. Scénario `scenarioSpellFilterKeyboard` (`tests/scenarios/controls.js`) :
   injecter des sorts de ≥ 2 catégories → barre affichée ; `#spell-list
   button[aria-pressed]` présents et focusables ; focus + Entrée sur un chip
   inactif → `_spellFilter` change + `aria-pressed="true"`.
2. `node tests/smoke.js SpellFilterKeyboard` vert + non-régression
   `GridKeyboardNavExtended` / `CombatKeyboard`.
3. `check_cache_versions --base origin/master` exit 0 ; `pwa-smoke` OK.

## Suivi
- [ ] inventory-spells.js : chip → button (tabindex/aria-pressed/role group).
- [ ] scénario `SpellFilterKeyboard` + smoke vert.
- [ ] cache-bump (inventory-spells.js + CACHE_VERSION) + check exit 0.

## Hors-scope
- Refonte visuelle des chips (hors a11y).
