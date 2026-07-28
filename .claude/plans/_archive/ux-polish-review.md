# Polish UX / Interface & Feedback Visuel — Revue & Plan

> 🏁 **Chantier CLOS le 2026-06-27.** Les **12 lots** (Critique C1-C3, Haute
> H1-H4, Moyenne M1-M5) sont **implémentés, testés et mergés sur `master`**
> (PR #664 → #682). Voir le « Journal d'implémentation » en bas pour le détail
> par lot. Ce document est conservé comme archive de la revue et du plan.
>
> Statut historique : **Étape 1 (revue) + Étape 2 (plan)** rédigées le 2026-06-21.
> Branche d'origine : `claude/hogwarth-ux-polish-y92oau`.
> Objectif : passer d'un jeu « fonctionnel » à « agréable, clair, immersif »
> **sans régression** et en respectant l'architecture vanilla zéro-build.

Ce document est une **spécification + plan priorisé**. Aucune ligne de jeu
n'est modifiée par sa rédaction. L'implémentation se fait par lots (voir
Étape 2), chacun avec son propre passage `cache-bump` + `tests/smoke.js`.

---

## Méthode

Revue grounded sur le code réel (pas d'hypothèses) :
- `css/style.css` (5044 l.) + 12 CSS satellites, `index.html` (1418 l.).
- Couche feedback : `ux-improvements.js`, `combat-fx.js`, `dungeon-fx.js`,
  `cinematics.js`, `haptics.js`, `battle-ui.js`.
- Structure UI : `ui.js`, `save-ui.js`, `inventory.js`, `ui-character-sheet.js`,
  `keybindings.js`, `help-tour.js`, `modal-a11y.js`.

**Constat transversal majeur** : la fondation est déjà solide (16 variables
CSS, 4 polices thématiques, 30+ keyframes toutes gardées par
`prefers-reduced-motion`, focus-trap + `inert` sur 16 modales, haptics, FX
défensifs via proxies `*_safe`). Le travail de polish est donc surtout de
**combler des trous de cohérence** et **d'étendre l'existant**, pas de bâtir
un système neuf. C'est une bonne nouvelle : ROI élevé, risque faible.

---

# ÉTAPE 1 — Revue & Spécifications UX

Légende : ✅ point fort · ⚠️ faiblesse/friction · 💡 proposition.

## Axe A — Menus & Interfaces principales

✅ **Forces**
- 16 modales avec focus-trap + `inert` du fond (`modal-a11y.js`), via
  `MutationObserver` sur `display` — aucun call-site à toucher.
- Hub de démarrage structuré (`#start-hub-screen`) : slots illustrés
  (portraits, niveau, étage, Maison, difficulté, horodatage), import,
  Codex du Sorcier, Hall of Fame.
- Catalogue boutique progressif par étage avec garde-fous anti-blank.
- Raccourcis clavier configurables (`I`/`P`/`C`/`F`/`R`) + remap persistant.

⚠️ **Frictions**
- **Navigation inter-modales en cul-de-sac** : chaque modale est isolée.
  Aller inventaire → fiche → codex = fermer + rouvrir (≥ 2 actions par saut).
  Aucune barre d'onglets ni « modale suivante ».
- **Inventaire 16 slots fixes, sans tri ni pagination** : en endgame, « sac
  plein » récurrent, drop manuel. Pas de tri (rareté/type), pas de compare.
- **Settings fourre-tout** : son + save/load + difficulté + keybindings dans
  une seule modale longue → scroll pénible sur mobile.
- **Pas de compare d'équipement** : la paper-doll n'offre pas de diff
  côte-à-côte avec une alternative du sac (hover-tooltip manuel uniquement).

💡 **Propositions**
1. **Barre d'onglets « Grimoire »** : un conteneur unique
   `#hero-codex-tabs` regroupant Fiche / Sac / Sorts / Bestiaire / Codex /
   Quêtes en onglets latéraux. Réutilise les `open*()` existants (chacun
   peuple déjà son innerHTML) ; on ajoute juste un ruban d'onglets cliquables
   en tête de `#character-modal` / conteneurs partagés. **Zéro refonte de
   logique**, surcouche de navigation.
2. **Tri + filtre du sac** : boutons chips (Tout / Équipable / Consommable /
   Rareté) au-dessus de la grille `inventory.js`. Tri pur côté affichage,
   l'ordre de stockage ne bouge pas.
3. **Compare au survol** : étendre `_renderItemTooltip()` pour, sur un item
   du sac équipable, afficher un mini-diff `+X/−Y` vs l'item actuellement
   équipé dans le slot cible (les deltas sont déjà calculables via
   `recalculateStats` mental — afficher `bonusX(candidat) − bonusX(équipé)`).
4. **Sectionner Settings** : accordéon (déjà la mécanique `.section-toggle`
   existe pour la fiche perso) — réutiliser pour grouper Son / Jeu /
   Touches / Données.

## Axe B — Feedback Combat & Actions

✅ **Forces (déjà excellent)**
- `window.UX` : dégâts flottants typés (`dmg/heal/mana/crit/miss/shield`),
  log de combat scrollable, **timeline d'initiative**, tooltips riches,
  réactions de carte (`flash-heal`, `card-react-crit`), bannières
  (`synergy/artifact/tenaille/rune`), tick animé des compteurs.
- `window.CombatFX` : 15 effets (spellBurst élémentaire 6 couleurs,
  **premiumCast house-keyed**, deathDissolve, healBurst, buffAura, lootPop,
  spellSplash PNG, shake, bossIntro souls-like, hurtFlash, statusFlash,
  telegraph ennemi, petrify). Tous gardés `prefers-reduced-motion`.
- Trinité **audio + visuel + haptique** complète sur Attaque et Sort.
- Indicateur de **corruption** déjà présent (classe `corruption-N` sur
  `enemy-card`, teinte froide ≥ 2).

⚠️ **Trous de cohérence identifiés** (le feedback est inégal selon l'action)
- **Boire une potion** : pas de son dédié, pas d'haptique, visuel variable
  (seul le premium flashe). Contraste avec l'attaque ultra-feedbackée.
- **Équiper (non-premium)** : silencieux. Seul le premium a un stinger.
- **Lancer une potion (`throwItemAtEnemy`)** : pas de burst visuel — un
  flacon d'Incendio jeté n'a aucun feu, alors que le sort Incendio oui.
- **Refus de sort** (PM insuffisant / verrouillé / risque corruption) :
  texte seul, aucun son « denied » ni shake de bouton.
- **Corruption** : indicateur statique, pas de fanfare/son à la montée de
  palier ; le joueur peut ne pas remarquer qu'il bascule.
- **Initiative** : la timeline existe mais reste discrète ; pas de surbrillance
  marquée du combattant actif au-delà du portrait.

💡 **Propositions** (toutes = extension des modules existants, surface minime)
1. `AudioSystem.playPotionDrink()` (gorgée + pétillement) appelé dans
   `_applyConsumableEffect`. Variante optionnelle par type (heal/mana/buff).
2. **Parité potion lancée ↔ sort** : appeler `CFX_safe.spellBurst(target,
   element)` dans `throwItemAtEnemy` selon l'élément du flacon.
3. **Son + micro-shake de refus** : `AudioSystem.playDenied()` + classe
   `cmd-btn--denied` (shake CSS 200 ms) quand `castSpellInBattle` refuse.
4. **Feedback de corruption** : `CFX_safe.statusFlash` ténébreux + bark/son
   sourd au franchissement d'un palier de corruption (hook existant côté
   données). Renforcer la classe `corruption-N` avec un liseré pulsé.
5. **Stinger d'équipement léger** pour tous (réutiliser un son court
   existant) — cohérence tier premium/normal.
6. **Haptique consommable** : `HAPTICS_safe.cast()` (micro-tap) sur potion.

## Axe C — Lisibilité & Immersion

✅ **Forces**
- 4 polices thématiques (UnifrakturMaguntia titres, Cinzel UI, Crimson Text
  narratif) — hiérarchie typographique claire.
- House-skin sur cartes ennemies (overlays radiaux par Maison).
- Variantes premium **house-keyed** (FX dorés/verts/glace/ambre).
- Tranches d'étages thématisées (textures + ambiance + couleur).
- Bestiaire enrichi (lore, habitat, anecdote, danger 1-11 coloré).

⚠️ **Frictions**
- **Le thème de Maison n'irrigue PAS l'UI persistante** : les couleurs de
  Maison existent en `:root` (`--gryffindor-red`, etc.) mais ne colorent que
  les cartes ennemies en combat. Le HUD, les cadres de modales, les accents
  d'or restent identiques quelle que soit la Maison du joueur. **Opportunité
  d'immersion la plus forte du projet, et la moins coûteuse.**
- **Corruption peu lisible hors combat** : pas de jauge persistante claire
  dans le HUD d'exploration (seulement en combat sur les ennemis).
- Densité de texte : certaines descriptions (artefacts, sorts) manquent de
  hiérarchie (effet chiffré noyé dans la prose).

💡 **Propositions**
1. **Système de thème de Maison (flag `currentHouseTheme`)** — *la mesure
   phare*. Au choix de Maison, poser `data-house="gryffondor"` sur `<html>`
   ou `#game-container`. Définir des **variables de thème** dérivées :
   ```css
   :root[data-house="gryffondor"] { --house-primary:#740001; --house-accent:#D3A625; }
   :root[data-house="serpentard"] { --house-primary:#1A472A; --house-accent:#AAAAAA; }
   :root[data-house="serdaigle"]  { --house-primary:#0E1A40; --house-accent:#946B2D; }
   :root[data-house="poufsouffle"]{ --house-primary:#3a2a00; --house-accent:#F0C75E; }
   ```
   Puis repeindre **avec parcimonie** : liseré supérieur des modales, glow du
   blason HUD, surbrillance des onglets, bordure de la barre d'action. L'or
   `--gold` reste la couleur « monde » ; `--house-accent` devient la couleur
   « toi ». Réversible (retrait de l'attribut = thème actuel inchangé).
2. **Mini-jauge de corruption persistante** dans le HUD quand corruption > 0
   (réutilise `#corruption-meter` déjà présent en `role="status"`).
3. **Hiérarchie des descriptions** : helper d'affichage qui isole l'effet
   chiffré (gras + couleur élément) de la prose lore, dans tooltips et fiches.

## Axe D — Accessibilité & Responsive

✅ **Forces (déjà au-dessus de la moyenne)**
- `:focus-visible` doré sur tous les interactifs (clavier only).
- `prefers-reduced-motion` respecté partout (cosmétique coupé, transitions
  réduites au fondu).
- Cibles tactiles ≥ 44 px (boutons, close, accordéon), `100dvh`,
  `env(safe-area-inset-*)` iOS, `touch-action:none` sur le canvas.
- `.sr-only`, `role="dialog"`/`aria-modal`, `aria-live` sur log & corruption.
- 7+ breakpoints, minimap coin mobile, accordéon fiche perso ≤ 700px.

⚠️ **Frictions**
- **Pas de réglage de taille de texte** ni de mode contraste élevé — le
  texte Crimson Text en taille narrative peut être petit sur mobile.
- **Bulles du help-tour** peuvent masquer la cible sur petit écran.
- Tooltips riches au **survol** : inaccessibles au tactile (pas de tap-hold).
- Pas de `prefers-contrast` exploité.

💡 **Propositions**
1. **Échelle de texte** : variable `--ui-font-scale` (3 crans : Petit/Normal/
   Grand) dans Settings, appliquée sur `:root` via `font-size`. `clamp()`
   existant compose proprement.
2. **Tooltips tactiles** : sur `pointer:coarse`, déclencher le tooltip riche
   au tap (premier tap = info, second = action), ou bouton ⓘ.
3. **Mode contraste élevé** opt-in (`data-contrast="high"`) renforçant
   bordures et `--label-muted`.
4. Garde-fou positionnement bulles help-tour ≤ 480px (flip auto).

## Axe E — Améliorations globales d'UX (friction)

✅ **Forces**
- Autosave throttlé (2 s) sur étage/combat/level-up/quête.
- Tour guidé 15 étapes + 4 sections + tutos contextuels (Forge/Biblio/Atelier).
- Keybindings remappables.

⚠️ **Frictions**
- **Autosave invisible** : aucun toast/indicateur. Le joueur ne sait jamais
  si sa progression est sûre après un boss → anxiété. (friction #1 réelle)
- **Sorts de combat sans hotkey numérique** : sélection souris/tap obligatoire.
- **Pas de confirmation de déséquipement** ni d'undo.
- Tooltips quasi absents hors fiche perso (~10 % de couverture).

💡 **Propositions**
1. **Indicateur d'autosave discret** : petite icône 💾 qui pulse 1 s en coin
   de HUD à chaque `autoSave()` réussi (`aria-live="polite"` « Progression
   sauvegardée »). Zéro modale, zéro interruption.
2. **Hotkeys 1-4 en combat** pour sorts/cibles (via `keybindings.js`,
   catalogue combat déjà présent).
3. **Étendre les tooltips riches** aux slots d'équipement du HUD gauche, aux
   boutons d'action combat, aux effets de potion du sac.

---

# ÉTAPE 2 — Plan de Mise en Œuvre

## Principes techniques

- **Surcouche, pas refonte.** On étend les modules `*_safe` (UX/CFX/DFX/
  Haptics) et les variables CSS `:root`. Tout call-site reste gardé.
- **Thème par attribut data** (`data-house`, `data-contrast`,
  `--ui-font-scale`) — aucune duplication de feuille de style, réversible.
- **Chaque lot = un commit autonome** : plan à jour → `node tests/smoke.js`
  → `cache-bump` (tout JS/CSS servi bumpé : `?v` dans `index.html` +
  `PRECACHE_URLS` de `sw.js` + `CACHE_VERSION`) → vérif PR avant push.
- **Pas de dépendance, pas de build.** Particules = CSS/canvas léger réutilisant
  les patterns existants.

## Flags & variables proposés (centralisés)

| Flag / var | Emplacement | Rôle | Défaut |
|------------|-------------|------|--------|
| `currentHouseTheme` (via `data-house`) | `<html>` / `state.js` | thème UI de Maison | Maison choisie |
| `uiFontScale` (`--ui-font-scale`) | Settings + localStorage | échelle texte | `1` |
| `uiHighContrast` (`data-contrast`) | Settings + localStorage | contraste élevé | off |
| `uiFeedbackLevel` | Settings + localStorage | intensité FX (Plein/Sobre/Minimal) | Plein |
| `premiumVisuals` | déjà implicite (`item.premiumFx`) | FX premium house-keyed | on |
| `autosaveToastEnabled` | Settings | indicateur autosave | on |

> `uiFeedbackLevel` se compose **au-dessus** de `prefers-reduced-motion`
> (l'accessibilité reste prioritaire) : « Minimal » force le comportement
> reduced-motion même sans préférence système.

## Lots priorisés

### 🔴 CRITIQUE (qualité perçue immédiate, risque faible)

| # | Tâche | Fichiers | Diff. | Est. |
|---|-------|----------|-------|------|
| C1 | **Thème de Maison UI** (`data-house` + vars `--house-*`, repeinte parcimonieuse modales/HUD/blason/onglets) | `css/style.css`, `state.js`, `main.js`, `ui.js` | M | 0.5-1 j |
| C2 | **Indicateur autosave** (toast 💾 pulse + `aria-live`) | `save-slots.js`, `ui.js`, `css/style.css` | S | 2-3 h |
| C3 | **Parité feedback consommables** : son potion + haptique + burst potion lancée + son/shake refus de sort | `audio-sfx.js`, `inventory.js`, `battle.js`, `battle-spells.js`, `css` | M | 0.5 j |

### 🟠 HAUTE (immersion + lisibilité)

| # | Tâche | Fichiers | Diff. | Est. |
|---|-------|----------|-------|------|
| H1 | **Échelle de texte + contraste élevé** (Settings) | `css/style.css`, `ui-settings.js`, `index.html` | M | 0.5 j |
| H2 | **Tooltips tactiles + extension de couverture** (slots HUD, boutons combat, effets potion) | `ux-improvements.js`, `inventory.js`, `css` | M | 0.5 j |
| H3 | **Feedback de corruption** (jauge HUD persistante + flash/son montée de palier) | `ui.js`, `battle-ui.js`, `combat-fx.js`, `css` | M | 0.5 j |
| H4 | **Réglage `uiFeedbackLevel`** (Plein/Sobre/Minimal) | `ui-settings.js`, modules FX | S | 3-4 h |

### 🟡 MOYENNE (navigation & confort)

| # | Tâche | Fichiers | Diff. | Est. |
|---|-------|----------|-------|------|
| M1 | **Barre d'onglets Grimoire** (Fiche/Sac/Sorts/Bestiaire/Codex/Quêtes sans cul-de-sac) | `ui.js`, `index.html`, `css` | L | 1 j |
| M2 | **Tri + filtre du sac** (chips rareté/type) | `inventory.js`, `css` | M | 0.5 j |
| M3 | **Compare d'équipement au survol** (mini-diff vs slot équipé) | `ui-character-sheet.js` | M | 0.5 j |
| M4 | **Hotkeys 1-4 sorts/cibles en combat** | `keybindings.js`, `battle-ui.js` | S | 3 h |
| M5 | **Sectionner Settings** (accordéon réutilisé) | `ui-settings.js`, `css` | S | 3 h |

## Structure CSS recommandée

- **Pas de SCSS** (zéro build). Rester en CSS natif + variables.
- Introduire un bloc **« thème »** en tête de `style.css` : les
  `:root[data-house="…"]` et `:root[data-contrast="high"]`, plus
  `--ui-font-scale`. Tout le reste consomme `var(--house-accent)` /
  `var(--house-primary)` là où on veut l'identité de Maison, en **laissant
  `--gold` comme couleur du monde**.
- Réutiliser les `@keyframes` existants (déjà 30+) ; n'ajouter que :
  `autosavePulse`, `denyShake`, `corruptionRise`.
- Particules : réutiliser le moteur canvas de `cinematics.js`/`dungeon-fx.js`
  (déjà DPR-aware + reduced-motion). Aucune lib.

## Suggestions d'assets

- **Sons** (procéduraux WebAudio comme l'existant, pas de fichiers lourds) :
  `playPotionDrink`, `playDenied`, `playEquip`, `playCorruptionRise`.
- **Icônes** : 💾 autosave (réutiliser glyphe), ⓘ info tactile (CSS).
- **CSS only** : liserés de Maison, shake de refus, pulse autosave/corruption.
- Aucun PNG nouveau requis pour le cœur du polish (les FX premium house-keyed
  existent déjà).

## Checklist de tests UX (playtest)

- [ ] **Desktop** : thème de Maison cohérent sur HUD/modales/onglets pour les 4 Maisons.
- [ ] **Mobile ≤ 700px** : tooltips déclenchables au tap ; bulles help-tour ne masquent pas la cible ; échelle de texte « Grand » ne casse aucun layout.
- [ ] **Combat** : potion (son+haptique), potion lancée (burst), refus de sort (son+shake), montée de corruption (flash+son) — chaque action a un retour clair.
- [ ] **Autosave** : toast visible après boss/level-up/étage ; `aria-live` annoncé.
- [ ] **Navigation** : Grimoire permet Fiche→Sac→Codex sans fermer/rouvrir.
- [ ] **Accessibilité** : `prefers-reduced-motion` + `uiFeedbackLevel=Minimal` coupent bien les FX ; focus-trap intact ; contraste élevé lisible.
- [ ] **Non-régression** : `node tests/smoke.js` vert ; `node tests/units.js` vert.
- [ ] **PWA** : `node tools/check_cache_versions.js --base origin/master` exit 0 ; `node tests/pwa-smoke.js` vert.

## Estimation globale

| Phase | Lots | Estimation |
|-------|------|-----------|
| Critique | C1-C3 | ~1.5-2 j |
| Haute | H1-H4 | ~2 j |
| Moyenne | M1-M5 | ~2.5-3 j |
| **Total** | 12 lots | **~6-7 j** (incrémental, déployable lot par lot) |

Chaque lot est **livrable indépendamment** : la qualité perçue monte dès C1
(thème de Maison) sans attendre le reste.

---

## Journal d'implémentation

- **2026-06-21 — C1 (Thème de Maison UI) : ✅ livré.**
  - `css/style.css` : variables `--house-accent` / `--house-glow` neutres au
    `:root`, surchargées par `:root[data-house="<maison>"]` (4 Maisons).
    Repeinte parcimonieuse des surfaces partagées : `.modal-box` (liseré
    supérieur 3 px + halo teinté) et `.modal-title` (soulignement). L'or
    `--gold` reste la couleur du monde (bordures, focus, action primaire).
  - `js/ui.js` : `_updateHouseBadge()` pose/retire `data-house` sur `<html>`
    (hook déjà appelé par chaque `updateUI()` → couvre choix de Maison, load
    de save, reset). Réversible : sans Maison, attribut retiré = thème or.
  - Vérif : `node tests/smoke.js` vert + cache-bump (CSS/JS bumpés). Aucune
    régression ; effet nul tant qu'aucune Maison n'est choisie.

- **2026-06-21 — C2 (Indicateur d'autosave) : ✅ livré.**
  - `js/ui.js` : `_showAutosaveToast()` crée/réutilise un micro-toast
    `#autosave-toast` (`role=status`, `aria-live=polite`), pulse ~1,7 s puis
    s'efface. `js/save-slots.js` l'appelle (garde `typeof`) au succès de
    `autoSave()`.
  - `css/style.css` : style du toast (bas-droite, liseré teinté Maison réutilisant
    `--house-accent`/`--house-glow`, `pointer-events:none` → ne masque jamais
    une commande), variante `prefers-reduced-motion`.
  - Test : scénario `AutoSave` étendu (T6 : toast affiché, aria-live, non
    cliquable). `node tests/smoke.js` 263 verts + cache-bump (v218).

- **2026-06-21 — C3 (Parité feedback consommables) : ✅ livré.**
  - `js/audio-sfx.js` : 2 SFX procéduraux — `playPotionDrink()` (glouglou +
    étincelle) et `playDenied()` (bip sourd descendant).
  - `js/inventory.js` : `_applyConsumableEffect()` (point unique des 3 sites
    d'usage) joue son + haptique `HAPTICS_safe.cast()` à chaque potion bue.
  - `js/battle.js` : `throwItemAtEnemy()` déclenche `CFX_safe.spellBurst` à
    l'élément du flacon → parité visuelle potion lancée ↔ sort.
  - `js/battle-spells.js` + `css/style.css` : refus de sort (PM insuffisant)
    → `playDenied()` + micro-secousse `.battle-actions.deny-shake`
    (gardée `prefers-reduced-motion`).
  - Tous les call-sites défensifs. `node tests/smoke.js` 263 verts +
    cache-bump (v219). **Phase Critique (C1-C3) terminée.**

- **2026-06-22 — H1 (Échelle de texte + contraste élevé) : ✅ livré.**
  - `css/style.css` : variable `--ui-font-scale` (défaut 1) au `:root`. Le CSS
    du jeu étant massivement en px (308 `font-size:px`, 0 rem/em), l'échelle
    est appliquée via `zoom: var(--ui-font-scale)` sur les **surfaces de
    lecture dense** (`.modal-box`, `.bestiary-modal-box`,
    `#npc-dialog-overlay .npc-dialog-panel`) — centrées, auto-contraintes
    (`max-height` + scroll), **sans toucher** au cadre de jeu fixe ni au
    canvas 3D (`resizeCanvas` lit `clientWidth` → rendu pixel-stable, zéro
    régression). Bloc `:root[data-contrast="high"]` : `--label-muted` éclairci
    + bordures renforcées (`.modal-box`, `.cmd-btn`, `.shop-tab`,
    `.party-card`, `.panel-title`).
  - `index.html` : section « Affichage » dans `#settings-modal` — 3 boutons
    d'échelle (Petit/Normal/Grand) + 1 bouton Contraste.
  - `js/ui-settings.js` : `setUiFontScale(step)` (small=0.9/normal=1/large=1.12),
    `toggleHighContrast()`, `_updateUiAccessibilityBtns()` (surbrillance
    `active-toggle` + `aria-pressed`, appelé par `openSettingsModal`),
    `_loadUiAccessibilityPrefs()` (DOMContentLoaded). Préférences **device**
    persistées en localStorage (`hogwarts_rpg_ui_font_scale`/`_ui_contrast`),
    hors save — comme les barks ; appliquées dès le démarrage.
  - Flags : `uiFontScale` + `uiHighContrast` (cf. tableau « Flags & variables »).
  - Test : scénario `scenarioUiAccessibilityPrefs` (controls.js) — variable CSS,
    `data-contrast`, persistance, état des boutons. `node tests/smoke.js` 265
    verts + `node tests/units.js` vert + cache-bump (style.css v54,
    ui-settings.js v5, `CACHE_VERSION` v220). Effet neutre tant qu'aucun
    réglage n'est touché (échelle 1, pas d'attribut contraste).

- **2026-06-22 — H2 (Tooltips tactiles + extension de couverture) : ✅ livré.**
  - `js/ux-improvements.js` : résolution unique `tooltipHtmlForTarget(el)`
    partagée par le survol souris ET le tactile (refactor sans changement de
    comportement desktop). **Nouvelle couverture** : boutons d'action de combat
    (`.battle-actions .cmd-btn`) → `actionButtonTooltip()` (descriptions
    statiques + rappel de la touche clavier, clé d'action lue dans `onclick`).
    Les slots d'équipement du HUD gauche (`.party-equip-slot`) et les effets de
    potion du sac (`.inv-slot.has-item` via `itemTooltip`) étaient déjà résolus
    — désormais accessibles au **tactile**.
  - **Appui long tactile** (~450 ms, aligné sur le pattern info-monstre de
    `battle-ui.js`) : montre le tooltip riche, auto-masqué après 4 s, et
    **supprime le clic synthétique** qui suit (capture click →
    `stopImmediatePropagation` + `preventDefault`) pour ne pas déclencher
    l'action de l'élément. Un **tap court** laisse passer le clic (action
    normale préservée). Garde-fous multi-touch / `touchmove` annulent le timer.
  - Aucun changement HTML/CSS : `#ux-tooltip` est déjà `pointer-events:none`.
  - Test : scénario `scenarioRichTooltipCoverage` (inventory.js) — survol bouton
    d'action, appui long (tooltip affiché + action NON déclenchée), tap court
    (action déclenchée). `node tests/smoke.js` 265 verts + cache-bump
    (ux-improvements.js v8, `CACHE_VERSION` v221).

- **2026-06-22 — H3 (Feedback de corruption) : ✅ livré.**
  - La **mini-jauge persistante** (`#corruption-meter`) existait déjà (P2.1) ;
    H3 ajoute le **feedback de franchissement de palier**. `js/floor-ambiance.js` :
    `_updateCorruptionMeter` mémorise le dernier palier (`_lastCorruptionTier`)
    et, sur une **montée** de palier, appelle `_onCorruptionTierRise(tier)` :
    pulse CSS `.corruption-rise` du thermomètre + pic de givre
    (`pulseFrostOverlay`, réutilisé) + `AudioSystem.playCorruptionRise()` (SFX
    procédural grave) + `HAPTICS_safe.cast()` + ligne de journal discrète.
    Ne se déclenche **pas** au premier affichage, ni en remontant, ni sur un
    re-rendu au même étage.
  - `js/save.js` : `_resetCorruptionTierTracking()` appelé dans `_applyState`
    (avant `updateUI`) — un chargement de save profonde n'est pas un
    franchissement naturel, donc pas de faux déclenchement.
  - `js/audio-sfx.js` : `playCorruptionRise()` (grondement sourd descendant,
    discret, gardé par `isMuted`).
  - `css/frost.css` : keyframes `corruptionRise` (halo + gonflement) +
    variante `prefers-reduced-motion` (flash d'opacité seul).
  - Test : `scenarioCorruptionMeter` (fx.js) étendu — premier affichage muet,
    montée multi-paliers = 1 seul son + classe, re-rendu stable, remontée muette,
    chargement profond muet (reset). `node tests/smoke.js` 265 verts + cache-bump
    (frost.css v3, audio-sfx.js v19, floor-ambiance.js v18, save.js v47,
    `CACHE_VERSION` v222).

- **2026-06-22 — H4 (Réglage `uiFeedbackLevel`) : ✅ livré.**
  - `js/ui-settings.js` : source de vérité `window.UIFeedback` (niveau
    `full|sober|minimal` + helpers purs `reduced()` = pref système OU Minimal,
    `particlesOff()` = `reduced()` OU Sobre). `setUiFeedbackLevel()` /
    `_loadUiAccessibilityPrefs()` étendus, préférence device persistée
    (`hogwarts_rpg_ui_feedback`), `data-feedback` posé sur `<html>`.
  - **Composition au-dessus de prefers-reduced-motion** : chaque module FX
    délègue son gate à `UIFeedback` (repli `matchMedia` si absent) —
    `combat-fx`/`dungeon-fx`/`cinematics` → `particlesOff()` (Sobre coupe
    particules + boucle ambiante, garde les flashes/CSS) ; `haptics` +
    `ux-improvements._tickReduced` → `reduced()` (Minimal seul les coupe).
    La boucle ambiante `dungeon-fx` s'auto-inhibe si on bascule en cours de
    partie. **Minimal** pose en plus une règle CSS
    `:root[data-feedback="minimal"] *` qui réduit animations/transitions à
    l'instant → vrai comportement reduced-motion forcé.
  - `index.html` : 3 boutons (Plein/Sobre/Minimal) dans la section « Affichage ».
  - Test : `scenarioUiFeedbackLevel` (controls.js) — Plein (rien coupé), Sobre
    (particules off, motion gardée), Minimal (reduced forcé), persistance au
    rechargement. `node tests/smoke.js` 266 verts + `node tests/pwa-smoke.js`
    vert + cache-bump (style.css v55, ui-settings.js v6, combat-fx.js v13,
    haptics.js v3, dungeon-fx.js v9, cinematics.js v3, ux-improvements.js v9,
    `CACHE_VERSION` v223). **Phase Haute (H1-H4) terminée.**

- **2026-06-22 — M1 (Barre d'onglets Grimoire) : ✅ livré.**
  - `js/ui.js` : `_GRIMOIRE_TABS` (Fiche/Sac/Sorts/Bestiaire/Codex/Quêtes) +
    `grimoireTabsHtml(active)` + `_mountGrimoireTabs(active)` (remplit tous les
    points de montage `[data-grimoire-tabs]`) + `grimoireGoto(key)` (ferme les
    autres modales Grimoire puis ouvre la cible via l'open*() existant — une
    seule modale visible, plus de cul-de-sac). Surcouche de navigation PURE.
  - `index.html` : `<div class="grimoire-tabs" data-grimoire-tabs>` injecté en
    tête de 5 modales (character / inventory / spell / bestiary / codex).
  - 6 hooks `_mountGrimoireTabs('<key>')` (défensifs) en fin des open*() :
    `openCharacter` (fiche), `openQuestLog` (quetes — partage character-modal),
    `openInventory` (sac), `openSpells` (sorts), `openBestiary` (bestiaire),
    `openCodex` (codex).
  - `css/style.css` : `.grimoire-tabs` / `.grimoire-tab` (ruban compact, onglet
    actif teinté Maison `--house-accent`/`--house-glow`, labels masqués ≤ 600px,
    `transform` neutralisé sous reduced-motion).
  - Test : `scenarioGrimoireTabs` (misc.js) — montage 6 onglets + actif/aria,
    bascule 1 clic, une seule modale visible, Quêtes réutilise character-modal.
    Vérif visuelle desktop + mobile (aucun débordement). `node tests/smoke.js`
    267 verts + cache-bump (style.css v56, ui.js v24, ui-character-sheet v15,
    ui-bestiary v7, ui-codex v11, inventory v28, inventory-spells v12, quests
    v21, `CACHE_VERSION` v224).

- **2026-06-22 — M2 (Tri + filtre du sac) : ✅ livré.**
  - `js/inventory.js` : barre de chips **Tout / Équipement / Consommables** +
    bascule **Rareté** (tri). `setInvFilter()` / `toggleInvSort()` +
    `_applyInvFilterSort(entries)` + extraction `_renderInvSlotEl(item, idx,
    battleMode)`. **Filtre/tri PUREMENT d'affichage** : `renderInventory`
    construit `entries = inventory.map((item, idx) => …)` et conserve l'**index
    réel** pour `useItem(idx)` — l'ordre de stockage de `player.inventory` ne
    bouge jamais. Barre **masquée en combat** (`battleMode`), où l'ordre brut
    et le comportement historique sont conservés (zéro régression).
  - `index.html` : `#inv-filter-bar` (chips) dans `#inv-pane-sac`.
  - `css/style.css` : `.inv-filter-bar` / `.inv-chip` (chip actif teinté Maison).
  - Test : `scenarioInventoryFilterSort` (inventory.js) — filtres Équipement/
    Consommables, tri rareté (légendaire en tête), **ordre de stockage
    inchangé**, **clic sur item trié → index RÉEL** (2), barre masquée + ordre
    brut en combat. `node tests/smoke.js` 268 verts + cache-bump (style.css v57,
    inventory.js v29, `CACHE_VERSION` v225).

- **2026-06-22 — M3 (Compare d'équipement au survol) : ✅ livré.**
  - `js/ui-character-sheet.js` : helper pur `_equipCompareLines(item,
    compareChar)` + 4ᵉ param optionnel `compareChar` sur `_renderItemTooltip`.
    Pour un item ÉQUIPABLE du sac, calcule le delta de chaque bonus (ATK/DEF/
    MAG/LCK/FOR/INT/AGI/END) vs l'item équipé dans le slot cible (`_resolveSlotForItem`,
    gère ring1/ring2), affiché `+vert` / `−rouge` ; « slot libre » si vide,
    « aucun gain de stat » si équivalent. `_renderInvSlot` passe `party[charIdx]`
    → le diff n'apparaît que dans le sac de la **fiche** (par perso). Les autres
    appelants (sac modale, paper-doll, boutique) n'envoient pas `compareChar` →
    inchangés. Consommables/livres exclus.
  - `css/style.css` : `.tt-compare` / `.tt-cmp-up|down|same|head`.
  - Test : `scenarioEquipCompareTooltip` (inventory.js) — ATK +3 / MAG −1 vs
    baguette équipée (couleurs hausse+baisse), DEF +3 sur slot libre,
    consommable sans diff. `node tests/smoke.js` 269 verts + cache-bump
    (style.css v58, ui-character-sheet.js v16, `CACHE_VERSION` v226).

- **2026-06-22 — M4 (Hotkeys 1-4 sorts/cibles en combat) : ✅ livré.**
  - **Cibles déjà couvertes** : la sélection de cible affiche `« N. … »` et les
    touches 1-9 cliquent la cible (main.js, préexistant). M4 ajoute le volet
    **sorts**.
  - `js/inventory-spells.js` : `openBattleSpells` numérote les sorts **lançables**
    (compteur `_hotkeyN`) → `data-hotkey` + pastille `.spell-hotkey` (1-9).
  - `js/main.js` : dans le handler keydown en combat, quand `#spell-modal` est
    ouvert, 1-9 clique le Nème `.spell-item[data-hotkey]` (les sorts non
    lançables sont sautés → la numérotation suit l'actionnable). Le bloc est
    placé avant le `return` des sous-modales ; hors combat (`openSpells`),
    aucun badge n'est posé et les chiffres ne déclenchent rien.
  - `css/style.css` : `.spell-hotkey` (pastille coin haut-droit, bord teinté
    Maison).
  - Test : `scenarioCombatKeyboard` (controls.js) étendu — badges sur les sorts
    lançables, badge « 1 » sur le 1ᵉ, touche 1 referme la modale et active le
    sort (lancement direct OU sélection de cible selon le nombre d'ennemis).
    `node tests/smoke.js` 269 verts + cache-bump (style.css v59,
    inventory-spells.js v13, main.js v36, `CACHE_VERSION` v227).

- **2026-06-22 — M5 (Sectionner Settings) : ✅ livré.**
  - `index.html` : les 5 groupes de `#settings-modal` (Son / Voyageur / Partie /
    Affichage / Touches) sont enveloppés dans des `.settings-section`, le label
    devenant un en-tête `role=button` (clavier Entrée/Espace + `aria-expanded`).
  - `js/ui-settings.js` : `_toggleSettingsSection(label)` bascule `.collapsed`
    sur la section + met à jour `aria-expanded` (réutilise la mécanique
    `.collapsed` de la fiche).
  - `css/style.css` : règle de masquage + caret **scopée ≤700px**
    (`#settings-modal .settings-section.collapsed > *:not(.settings-section-label)`)
    → **desktop inchangé** (tout visible), mobile repliable (cible ≥44px,
    label toujours visible). Marge inter-sections ajustée (labels désormais
    nichés).
  - Test : `scenarioSettingsAccordion` (controls.js) — 5 sections + libellés,
    keybind-list dans une section, boutons existants préservés, toggle =
    `.collapsed`+aria, contenu visible en desktop, re-toggle redéplie. Vérif
    manuelle mobile (contenu masqué, label conservé). `node tests/smoke.js`
    270 verts + cache-bump (style.css v60, ui-settings.js v7, `CACHE_VERSION`
    v228). **Phase Moyenne (M1-M5) terminée — les 12 lots du chantier sont
    livrés.**

- **2026-06-27 — Chantier CLOS.** Les 3 phases (Critique / Haute / Moyenne)
  sont mergées sur `master`. Aucun lot restant ; aucune régression connue.
  Plan figé en archive.

---

## Recommandation de démarrage

Commencer par **C1 (thème de Maison)** : c'est l'amélioration au plus fort
ratio immersion/effort, elle s'appuie sur des variables déjà définies, et elle
est entièrement réversible (retrait de `data-house`). Enchaîner C2 (autosave)
et C3 (parité feedback) qui suppriment les deux frustrations les plus
concrètes. Valider chaque lot en playtest desktop + mobile avant le suivant.
