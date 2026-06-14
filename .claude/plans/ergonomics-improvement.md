# Plan — Amélioration de l'ergonomie (clavier, modales, accessibilité)

> Statut : **Phases 1-5 livrées** (plan complet). Phase 1 → PR #520,
> Phase 2 → PR #521, Phase 3 → PR #524, Phase 4 → `claude/ergonomics-phase4-a11y`,
> Phase 5 (isolation de modale) → `claude/ergonomics-modal-isolation`.
> Créé le 2026-06-14. La passe dédiée « isolation de modale » (focus-trap
> générique + `inert`/`aria-describedby` sur le fond), reportée des Phases 3 & 4
> pour risque/bénéfice, est désormais livrée (Phase 5 ci-dessous).
> Aucun plan d'ergonomie transversal n'existait : il y avait des fixes UX
> ponctuels (`room-presentation-startup-ux.md`, `codex-mobile-list-layout.md`,
> `hit-targets-44px.md` archivé) mais pas de passe d'ergonomie d'interaction.

## Constat (audit code 2026-06-14)

Diagnostic ancré dans le code. Deux problèmes **structurels** font reposer un
jeu **tour par tour** entièrement sur la souris :

| # | Axe | État actuel (preuve) | Gravité |
|---|-----|----------------------|---------|
| 1 | **Clavier en combat** | `main.js:683-704` ne gère AUCUNE touche d'action de combat (uniquement déplacement + modales I/P/C/F/R). Boutons `index.html:693-697` sans raccourci. | 🔴 Critique |
| 2 | **Échap ferme les modales** | `main.js:701-703` ne ferme que 4 modales (`inventory/spell/shop/character`). Manquantes : `bestiary-modal`, `codex-modal`, `house-detail-modal`, `house-donation-modal`, `wizard-codex-modal`, `slot-modal`, `monster-info-overlay`. | 🔴 Critique |
| 3 | **Découvrabilité combat** | Boutons exploration ont `title="… (I)"` (`index.html:786-793`) mais les 5 boutons de combat n'ont ni `title` ni `aria-label`. | 🟠 Haute |
| 4 | **Sélection de cible** | `battle-ui.js:9-25` (`_showTargets`) : boutons `onclick` seuls, pas de numérotation clavier, pas de bouton « Annuler ». | 🟠 Moyenne-haute |
| 5 | **Confirmations** | Mix `confirm()` natif bloquant — `house-donation.js:181`, `save-ui.js:22-28` (suppression définitive !), `teleport.js:277` — vs modale custom thématisée (Ironman, `main.js:200-215`). | 🟡 Moyenne |
| 6 | **Gestion du focus** | Aucune modale ne pose de focus initial, ne piège le focus, ni ne le restitue à la fermeture (`ui.js closeModal`, `ui-bestiary.js`, `ui-codex.js` silencieux). | 🟡 Moyenne |
| 7 | **Tooltips stats / aria divers** | Stats `index.html:626-632` sans `title` ; `.cfx-danger` (PV bas) sans `aria-label` ; pas de `role="alertdialog"` sur confirmations. | 🟢 Basse |

## Direction retenue

Passe d'ergonomie **non destructive et défensive** : on enrichit les canaux
d'entrée (clavier en plus de la souris), on uniformise les confirmations, on
fiabilise les modales. **Aucune régression du flux souris/tactile existant** —
tout ajout clavier est additionnel (cf. philosophie D-pad + swipe coexistants).

Découpage en 4 phases priorisées. Chaque phase est commitable indépendamment.

---

## Phase 1 — Critiques (clavier combat + Échap universel) ✅ LIVRÉE

> Livré le 2026-06-14. `main.js` (handler clavier restructuré + table
> `ESC_CLOSEABLE_MODALS`), `battle-ui.js` (cibles numérotées + `_cancelTargetSelection`
> + bouton Annuler). Test : `tests/scenarios/controls.js — scenarioCombatKeyboard`.
> Cache bumpé (main v24, battle-ui v7, CACHE_VERSION v134).

### 1A. Échap ferme TOUTES les modales (table unique)

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/main.js` | Remplacer la liste en dur de `main.js:701-703` par une liste centralisée couvrant les 7 modales manquantes ; fermer aussi `monster-info-overlay`. Garder les handlers Échap déjà locaux (npc-dialog, help-tour) — ne pas doubler. Ne rien fermer si une saisie texte est focus (laisser l'input gérer). | Ouvrir chaque modale → Échap ferme. NPC/help-tour inchangés. |

> Garde-fou : ne pas fermer pendant `inBattle` une modale de combat de façon
> à laisser le joueur bloqué — vérifier le comportement de chaque overlay.

### 1B. Raccourcis clavier en combat

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/main.js` | Dans le keydown global, brancher (quand `inBattle` et que le segment héros est actif) : `A`→`battleAction('attack')`, `S`→`'spell'`, `G`→`'guard'`, `O`→`'item'`, `F`→`'flee'`. Garde-fou : ignorer si une saisie texte est focus, si la sélection de cible est ouverte (déléguer à 1C), si overlay modale combat ouvert. | Combat clavier complet sans souris. Pas de conflit avec déplacement (neutralisé en combat). |

> Conflit potentiel : `F` = « Fouiller » en exploration. Comme les touches sont
> gardées par `inBattle`, pas de collision (Fouiller n'est jamais dispo en combat).

### 1C. Sélection de cible au clavier + Annuler

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/battle-ui.js` | `_showTargets` : préfixer chaque bouton cible d'un numéro `1/2/3…` (label + `data-index`) ; ajouter un bouton « Annuler » (Échap). Brancher dans le keydown : `1`-`5` choisissent la cible, `Échap` annule. | 2-3 ennemis → choix au clavier + annulation. Souris inchangée. |

**Verify Phase 1** : `node tests/smoke.js` (scénarios combat) vert + test manuel
clavier. Cache-bump (`main.js`, `battle-ui.js`).

---

## Phase 2 — Découvrabilité (haute) ✅ LIVRÉE

> Livré le 2026-06-14. `index.html` : `title`/`aria-label` « (A/S/G/O/F) » sur
> les 5 boutons de combat ; `title="Fermer (Échap)"` sur toutes les croix de
> modale. `main.js` : Échap étendu aux 6 dernières modales (settings, forge,
> bibliothèque, chaudron, fusion, énigme) → hint universellement véridique.
> Test : `scenarioCombatKeyboard` (assertions titres + Échap forge). Cache
> bumpé (main v25, CACHE_VERSION v135).

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `index.html` | Ajouter `title`/`aria-label` aux 5 boutons de combat avec leur raccourci (« Attaquer (A) », etc.). | Survol affiche le raccourci ; lecteurs d'écran l'annoncent. |
| `index.html` / CSS | Hint discret « Échap pour fermer » dans l'en-tête des modales (ou via `aria` + petite mention). À arbitrer : visuel léger pour ne pas alourdir. | Indice présent, non intrusif. |

**Verify Phase 2** : visuel + `node tests/smoke.js`. Cache-bump si CSS touché.

---

## Phase 3 — Confirmations unifiées + focus (moyenne) ✅ LIVRÉE

> Livré le 2026-06-14. `confirmModal()` (ui.js, Promise<bool>, `role="alertdialog"`,
> focus initial sur OK + restitution du focus, repli défensif `confirm()`,
> au MANIFEST loader). Modale `#confirm-modal` (index.html) + CSS (style.css,
> variante `.confirm-danger`). Échap → résout `false` (main.js, priorité avant
> sélection de cible). **TOUS** les `confirm()` natifs du jeu convertis :
> suppression de slot (auto bénin / manuel `danger`), écrasement de slot, don
> de Maison ≥5000 G, téléportation. Test : `scenarioConfirmModal`. Cache bumpé
> (style v42, ui v16, save-ui v9, house-donation v2, teleport v2, main v26,
> loader v47, CACHE_VERSION v136).
>
> **Note 3B — focus** : la gestion du focus (initial + restitution) est livrée
> **dans `confirmModal`** (le cas concret le plus à risque : suppression de
> save). Le focus-trap **générique sur les ~16 autres modales** (hook de
> chaque fonction d'ouverture) est volontairement **reporté** : large surface,
> risque de fragilité des tests pour un bénéfice diffus. À traiter en passe
> dédiée si souhaité (guidelines §2/§3 — simplicité, changements chirurgicaux).

### 3A. Modale de confirmation custom réutilisable

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/ui.js` (ou nouveau helper) | Helper `confirmModal({title, body, confirmLabel, danger?})` → Promise, thématisé parchemin, `role="alertdialog"`. Réutiliser le style de la modale Ironman (`main.js:200-215`). | Remplace les 3 `confirm()` natifs. |
| `js/house-donation.js`, `js/save-ui.js`, `js/teleport.js` | Remplacer `confirm()` par le helper. Pour la **suppression définitive** de save : double-confirmation (variante `danger`). | Suppression/don/TP passent par la modale custom. |

### 3B. Gestion du focus des modales

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/ui.js` (ouverture/fermeture génériques) | À l'ouverture : mémoriser `document.activeElement`, poser le focus initial (1er bouton ou champ de recherche). À la fermeture : restituer le focus. Optionnel : focus-trap simple (Tab cyclique). | Tab reste dans la modale ; Échap rend le focus au point d'origine. |

**Verify Phase 3** : `node tests/smoke.js` + test manuel clavier. Cache-bump.

---

## Phase 4 — Accessibilité de finition (basse) ✅ LIVRÉE

> Livré le 2026-06-14. `index.html` : `title` explicatif sur les 6 cases de
> stats (rôle réel D1-D5). `ui.js` + `index.html` : région live `#a11y-live`
> (`role=status`, `aria-live=assertive`) annonçant « Points de vie critiques »
> sur front montant / effacée sur front descendant ; classe utilitaire
> `.sr-only` (style.css). Test : `scenarioA11yFinish`. Cache bumpé (style v43,
> ui v17, CACHE_VERSION v137).
>
> **Reporté avec le focus-trap (Phase 3)** : `inert`/`aria-describedby`
> génériques sur le fond quand une modale est ouverte — même surface
> « isolation de modale » que le focus-trap, à traiter dans la passe dédiée.

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `index.html` | `title` sur les abréviations de stats (`index.html:626-632`) — ex. « FORCE (STR) — dégâts physiques + pénétration DEF ». | Survol explique chaque stat. |
| `js/ui.js` | `aria-label`/`role="status"` sur l'indicateur PV bas (`.cfx-danger`). | Annoncé aux lecteurs d'écran. |
| `index.html` | Compléter `aria-describedby` / envisager `inert` sur le fond quand une modale est ouverte. | Sémantique modale complète. |

**Verify Phase 4** : `node tests/smoke.js`. Cache-bump si HTML/CSS/JS servis.

---

## Phase 5 — Isolation de modale (focus-trap + `inert`) ✅ LIVRÉE

> Livrée le 2026-06-14. Nouveau module `js/modal-isolation.js` (chargé avant
> `loader.js`). Mécanisme **central par `MutationObserver`** — aucun des ~16
> call-sites d'ouverture n'est touché. Test : `scenarioModalIsolation`
> (`tests/scenarios/controls.js`). Cache bumpé (nouveau module + index.html).

### Approche retenue (justification)

Il n'existe pas de fonction d'ouverture unique : chaque modale toggle son
propre `el.style.display` (flux `closeModal`/`open*`). Plutôt que de hooker
16 fonctions distinctes (fragile, churn, oublis à chaque nouvelle modale),
on observe la **bascule `display:none↔flex`** de chaque modale enregistrée
via un `MutationObserver` (filtre attributs `style`/`class`). Propriété clé :
le callback de l'observer s'exécute en microtâche **après** que la fonction
d'ouverture a fini son travail synchrone (display posé **et** contenu rendu),
donc la liste des éléments focusables est complète au moment de poser le
focus initial. Zéro modification des call-sites = robuste aux ajouts futurs.

`#confirm-modal` est **exclue** : elle gère déjà son focus (Phase 3,
`confirmModal`/`_closeConfirmModal`).

### Détail

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/modal-isolation.js` (nouveau) | Observer central : pile des modales ouvertes. À l'ouverture → mémoriser `document.activeElement`, fond (`game-container` + écrans de démarrage) en `inert`, focus initial (1er champ/contrôle non-✕). `Tab`/`Shift+Tab` (capture) cyclent dans la modale du sommet. À la fermeture → retrait de `inert` (pile vide) + restitution du focus au déclencheur. Défensif (try/catch, garde-fous DOM). | `scenarioModalIsolation`. |
| `index.html` | Inclure `modal-isolation.js` avant `loader.js`. `aria-describedby` sur les modales à texte instructionnel stable (inventaire). | Sémantique modale complète. |
| `js/loader.js` | Entrée MANIFEST optionnelle `__modalIsolation`. | Bandeau si régression de chargement. |

**Verify Phase 5** : `node tests/smoke.js` vert (focus piégé, restitution,
`inert` sur le fond) + aucune régression souris/tactile. Cache-bump.

## Vérification transverse (toutes phases)

1. `node tests/smoke.js` vert après chaque phase ; ajouter un scénario clavier
   combat (`tests/scenarios/combat.js` ou `controls.js`) dans le commit qui
   livre la Phase 1.
2. `node tools/check_cache_versions.js --base origin/master` exit 0 (skill
   `cache-bump`) — `main.js`, `battle-ui.js`, `ui.js`, etc. sont servis.
3. Test manuel clavier (combat complet sans souris, Échap sur chaque modale).
4. Aucune régression souris/tactile (D-pad, swipe, clics).

## Hors-scope (à acter)

- Refonte visuelle des modales (≠ ergonomie d'interaction).
- Navigation clavier complète de l'inventaire/équipement (grille) — gros, à
  isoler dans un plan dédié si souhaité.
- Remappage configurable des touches.
