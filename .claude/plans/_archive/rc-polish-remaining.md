# Plan d'implémentation — éléments RC non traités

> Suite directe de [`audit-polish-rc-2026-06.md`](./audit-polish-rc-2026-06.md).
> **Déjà livré** : Priorité 1 close (P1.1/P1.4 PR #634, P1.5/P1.6 PR #637) +
> P2.5 (PR #639, marquage signature + compteur Codex).
> Ce document planifie le **reste** : P2.1, P2.2, P2.3, P2.4, P2.6 + la
> Priorité 3. Chaque item = 1 PR indépendante (lot cohérent), branche fraîche
> depuis `origin/master` (guidelines §6).
>
> Date : 2026-06-21 · **Plan vivant** (guidelines §5) : cocher/amender au fil de
> l'eau. Légende statut : ⬜ à faire · 🔄 en cours · ✅ fait · ❌ abandonné.
>
> ✅ **CLOS (2026-06-21)** : tous les items (P2.1→P2.6, P3.1→P3.4) sont livrés &
> mergés ; P3.5 = amorce livrée + playtest humain en attente (hors-code). Plan
> archivé.
>
> **Règle transverse** : tout changement `js/`/`css/`/`index.html` ⇒ skill
> `cache-bump` + `node tests/units.js` + `node tests/smoke.js` +
> `node tests/pwa-smoke.js` verts (et `check_cache_versions`, `check_doc_modules`,
> `check_difficulty` si touchés). Vérifier l'**état réel du code** avant
> d'implémenter — l'audit initial a déjà cité 3 points périmés.

---

## ⚠️ Corrections d'état constatées (lecture du code, 2026-06-21)

Avant de planifier, deux items du plan d'origine sont **déjà résolus** — à
clore, pas à refaire :

- **P3.1 (art boss-gardiens)** : **DÉJÀ LIVRÉ**. Les 4 PNG existent
  (`img/monsters/gardien_{lion,serpent,aigle,blaireau}.png`) et `CLAUDE.md`
  note « Art : PNG dédiés livrés ». La mention « fallback SVG » de l'audit est
  **périmée**. → **Action : vérifier le mapping renderer + clore P3.1.**
- **P2.3 (grille d'actions combat)** : la **robustesse de la grille** vient
  d'être traitée par **PR #640** (« fix(combat): grille d'actions robuste +
  icône Rune dédiée »). Le reliquat P2.3 se réduit donc à la **hiérarchie
  visuelle** (mettre Attaquer en avant), pas à la structure de la grille.

---

## P2.1 — Thermomètre de corruption HUD (+ clé Codex)  ✅ Fait (2026-06-21)

> **Livré** : helpers purs `corruptionTier()` / `corruptionThermometerHtml()` +
> `_updateCorruptionMeter()` (`floor-ambiance.js`), HUD `#corruption-meter`
> (`index.html`, sous `#house-crest`), styles (`css/frost.css`), hook
> `updateUI()` + `_applyCorruptionAmbiance()`, clé Codex `corruption_gradient`
> (`codex.js`, total 51→52). Tests : 12 assertions units (paliers/bornes/
> monotonie) + scénario smoke `scenarioCorruptionMeter`. cache-bump
> floor-ambiance v16 / ui v19 / codex v18 / frost.css v2 / CACHE_VERSION v205.
> Étages 1-2 = caché (palier 0) ; saturé à 5 flocons dès l'étage 14 / en Boucle.

**Impact : Élevé** (rend la descente *ressentie*) · **Difficulté : Moyenne**

### Infra existante (vérifiée)
- `corruptionLevel(floor, victoryAchieved)` — pur, **0.0 → 1.0** (étage 14+),
  **+0.3 (cap 1.3)** en Boucle (`floor-ambiance.js:180`). Aucune sérialisation.
- Overlay givre déjà piloté : `_applyCorruptionAmbiance(floor)`
  (`floor-ambiance.js:746`), appelé à chaque changement d'étage
  (`movement-floors.js:320`).
- HUD : ancre naturelle près de `#house-crest` / `#ngplus-hud-title`
  (`index.html:561` / `:497`) ; `updateUI()` (`ui.js:23`) rafraîchit le HUD à
  chaque tick ; `updateCompass()` (`ui.js:468`) est appelé aux transitions.

### Étapes
1. **Helper pur de paliers** dans `floor-ambiance.js` :
   `corruptionTier(level)` → 0–5 (ex. seuils 0/0.2/0.45/0.7/0.9/1.15) +
   `corruptionThermometerHtml(level)` → chaîne `❄`×tier (gris→cyan→blanc),
   label accessible (« Corruption : élevée »). Pur, testable en `units.js`.
   → vérif : `node tests/units.js` (ajouter cas de paliers/bornes).
2. **Élément HUD** `#corruption-meter` dans `index.html` (sous `#house-crest`),
   `aria-live="polite"`, masqué à corruption 0 (étage 1-2). Style discret
   (inline ou `css/frost.css` — si CSS, bumper son `?v`).
   → vérif : présent dans le DOM, caché à l'étage 1.
3. **Mise à jour** : appel depuis `_applyCorruptionAmbiance` (déjà au bon point
   de cycle) **et** un refresh défensif dans `updateUI()`.
   → vérif : smoke — descendre d'étage augmente les ❄.
4. **Clé Codex** : 1 entrée `category:'glossaire'` (ou `lieux`) « La Corruption »
   dans `codex.js`, `unlockConditions` = atteindre un étage seuil (ex. floor≥4),
   texte voilé→révélé dans la voix du projet (cf. `docs/histoire`). Le compteur
   P2.5 passera mécaniquement de 51 → 52.
   → vérif : `scenarioCodexUnlockOnFloor` couvre le pattern ; étendre si besoin.
5. **cache-bump** (floor-ambiance.js, ui.js, codex.js, index.html, +CSS si
   touché) + suite complète.

### Risques / garde-fous
- Ne **pas** sérialiser (dérivé de `currentFloor`+`victoryAchieved`).
- Discrétion : ne pas concurrencer la boussole/quest-tracker ; masqué tôt.
- Le texte Codex est du **contenu** : respecter la normativité narrative.

---

## P2.2 — Boussole d'endgame (panneau post-victoire)  ✅ Fait (2026-06-21)

> **Livré** : helper PUR `endgameDestinations(ctx)` (4 destinations dérivées —
> Gardien de la Boucle ét.11, Chambres ét.17+, Apothéose/★ tier 17+, Briser le
> Cycle 15 Éclats), modale `#endgame-compass-modal` + bouton `🧭 Boussole`
> (`#btn-endgame-compass`, visible post-victoire seulement via
> `_refreshEndgameCompassBtn` dans `updateUI`). Backdrop inline ; focus-trap
> (`modal-a11y` MODAL_IDS) + Échap (`main.js` ESC_CLOSEABLE_MODALS). **Zéro flag
> nouveau** (tout dérivé). Tests : 13 assertions units + scénario smoke
> `scenarioEndgameCompass`. cache-bump endgame v10 / ui v20 / main v34 /
> modal-a11y v2 / CACHE_VERSION v206.

**Impact : Élevé** (rejouabilité lisible) · **Difficulté : Moyenne**

### Infra existante (vérifiée)
- `victoryAchieved` (state) gate l'endgame.
- Déclencheurs réels à recenser dans le panneau :
  - **Gardien de la Boucle** : étage **11** (escalier scellé sans victoire).
  - **Chambres des Fondateurs** : étage **17+** (`FOUNDER_CHAMBERS`,
    `floor-ambiance.js`), boss-gardien selon `chosenHouse`.
  - **Briser le Cycle** : jalons I (scène vue) + II (`accumulatedEclats >=
    BRISER_ECLAT_SEUIL`, ~15 vers l'étage 25) — `break-cycle.js:21,40,68`.
  - Série Apothéose ★ N (Don à la Maison, `houseTier>=17`).
- Helpers purs déjà présents pour les états (`canOfferBreakCycle`, etc.).

### Étapes
1. **Helper pur** `endgameDestinations(ctx)` (nouveau, p.ex. `endgame.js`)
   → liste `[{ id, label, trigger, unlocked, hint }]` calculée depuis
   `victoryAchieved`, `currentFloor`, `accumulatedEclats`, `houseTier`,
   `chosenHouse`. **Aucun état nouveau.** Testable en `units.js`.
2. **Modale/panneau** `#endgame-compass` (réutiliser le style des modales ;
   focus-trap auto via `modal-a11y.js`). Bouton d'accès **visible seulement
   post-victoire** (à côté du Codex hub, ou dans la barre de commandes).
3. **Rendu** : chaque destination avec ✅/🔒 + déclencheur lisible
   (« Chambres — étage 17 », « Briser le Cycle — 15 Éclats portés »).
4. **cache-bump** + 1 scénario smoke (`scenarioEndgameCompass`) : post-victoire
   → panneau listant N destinations avec états corrects.

### Risques
- Ne dépend d'**aucun** nouveau flag : tout est dérivé → zéro risque de save.
- Pré-victoire : bouton masqué (ne pas divulgâcher).

---

## P2.3 — Hiérarchie d'action en combat (reliquat)  ✅ Fait (2026-06-21)

> **Livré** : classe `.cmd-btn--primary` sur « Attaquer » (teinte or, font-weight
> 600 ; en ≤700px : `order:-1` + pleine largeur → action primaire en tête, les
> secondaires/conditionnelles se compactent dessous). CSS-only + 1 classe dans
> `index.html`. cache-bump style.css v49 / CACHE_VERSION v207. Fonction inchangée
> (couverte par les scénarios combat existants ; vérif computed-style OK).
> *Note : 2 scénarios flaky pré-existants observés sur le run complet
> (`scenarioFloorEvents` « marché ambulant », `scenarioHouseApotheoseTier` régén
> Poufsouffle) — tous deux passent en isolation sur ma branche ET sur master
> propre ; aléa de pas/spawn, sans rapport avec ce changement CSS.*

**Impact : Moyen** · **Difficulté : Faible** (la grille est déjà robuste, #640)

### État
- La **structure** de `.battle-actions` + `_refreshBattleActionButtons`
  (`battle-ui.js:259`, boutons conditionnels `#btn-artifact/posture/env`) a été
  fiabilisée par **PR #640**. Reste la **hiérarchie visuelle**.

### Étapes
1. **CSS** : classe `.cmd-btn--primary` pour `🗡️ Attaquer` (taille/teinte
   accrue), conditionnelles légèrement compactées — **surtout en ≤700px**
   (média mobile déjà en place). Pas de changement de logique JS.
2. Vérifier l'ordre de tab / lisibilité (44px touch targets conservés).
3. **cache-bump** (CSS combat + index.html si classe ajoutée au markup) +
   smoke (les scénarios combat existants couvrent le rendu des boutons).

### Risques
- Purement cosmétique ; ne pas toucher au routage `battleAction()`.
- Re-tester la grille en mobile (régression #640 = non).

---

## P2.4 — Mini-tours contextuels endgame  ✅ Fait (2026-06-21)

> **Livré** : 3 jeux d'étapes (`FORGE/LIBRARY/ATELIER_TOUR_STEPS`) + helper
> `_maybeContextTour(flagKey, steps)` (one-shot localStorage, respecte l'opt-out
> global, ne double pas un tour actif) dans `help-tour.js` ; `maybeForgeTour` /
> `maybeLibraryTour` / `maybeAtelierTour` exposés et appelés à la 1ʳᵉ ouverture
> (hook défensif dans `openForge`/`openLibrary`/`openAtelierVoyageur`). Réutilise
> l'infra `startHelpTour`. Tests : scénario smoke `scenarioEndgameMiniTours`
> (déclenche 1×, one-shot ensuite). cache-bump help-tour v4 / forge v7 /
> library v5 / atelier-voyageur v5 / CACHE_VERSION v208.

**Impact : Moyen** (découvrabilité) · **Difficulté : Moyenne**

### Infra existante (vérifiée)
- `startHelpTour(stepsOverride, opts)` accepte un **jeu d'étapes custom**
  (`help-tour.js:344`) → réutilisable tel quel.
- Opt-out persistant via `localStorage` (`HELP_TOUR_OPTOUT_KEY`,
  `help-tour.js:16`) — même pattern pour les flags « déjà vu ».
- Points d'entrée : `openForge()` (`forge.js:330`), `openLibrary()`
  (`library.js:176`), `openAtelierVoyageur()` (`atelier-voyageur.js:179`).

### Étapes
1. Définir 3 mini-jeux d'étapes (2-3 bulles chacun) : Forge / Bibliothèque /
   Atelier — cibles = vrais sélecteurs de chaque modale.
2. Flag one-shot par système : `localStorage 'hh_tour_forge_seen'` etc.
   Au **1er** `openForge/Library/Atelier`, si non vu et non opt-out global →
   `startHelpTour(forgeSteps, {...})` puis poser le flag.
3. Garde-fous : ne pas déclencher si `help-tour` déjà actif ; respecter l'opt-out
   global.
4. **cache-bump** (help-tour.js + forge/library/atelier.js) + 1 scénario smoke
   (1ʳᵉ ouverture Forge déclenche le tour, 2ᵉ non).

### Risques
- Réutiliser l'infra existante → faible risque ; rester **défensif**.

---

## P2.6 — Inventaire audio (samples livrés vs synthétisés)  ✅ Fait (2026-06-21)

> **Livré** : `tools/audio_inventory.js` (Node pur, `--write`/`--strict`) croise
> les samples `audio/….ogg` référencés par `js/` avec les fichiers présents, et
> écrit `docs/audio-inventory.md`. **Résultat** : ambient 5/5, combat 5/5,
> menu 1/1, voice 181/181 — **1 seul gap musical** : `audio/ending_break.ogg`
> (référencé mais absent → repli procédural ; **cible n°1 de P3.2**). 172
> orphelins = surtout `audio/voice/_raw/*.mp3` (sources d'enregistrement). SFX
> 100 % procéduraux (design), barks en synthèse par défaut. Tooling/doc seuls —
> pas de cache-bump.

**Impact : Faible→Moyen** · **Difficulté : Faible** (audit, pas de runtime)

### État (vérifié)
- 11 samples musique (`audio/ambient_*.ogg`, `combat_*.ogg`, `menu_theme.ogg`)
  + dossier `audio/voice/` (≈364 fichiers audio au total). SFX = **synthèse
  procédurale** (`audio-sfx.js`), pas de samples dédiés.

### Étapes
1. **Script d'inventaire** `tools/audio_inventory.js` (Node pur, hors runtime) :
   croise les clés demandées par le code (`_ZONE_SAMPLES`, `_combatSampleKey`,
   `playVoice('...')`, barks OGG) avec les fichiers présents sous `audio/` →
   table « clé attendue · présent ? · repli ».
2. **Livrable doc** : `docs/audio-inventory.md` (liste de gaps priorisés).
   *Aucune* modif runtime → **pas de cache-bump**.

### Risques
- Pur outillage/doc. Alimente P3.2.

---

## Priorité 3 — polish de luxe

| # | Tâche | Statut | Note |
|---|-------|--------|------|
| P3.1 | Art PNG des 4 boss-gardiens | ✅ **clos (2026-06-21)** | Vérifié : 4 PNG (200-280 Ko) wirés via `imgSrc` dans `monsters.js`, résolus par `_getMonsterImg`. Rien à faire. |
| P3.2 | Combler les gaps audio (OGG) | ✅ **fait (2026-06-21)** | Blocage levé : `pip install soundfile` → libsndfile 1.2.2 (encodeur Vorbis). Asset **généré** `audio/ending_break.ogg` (OGG/Vorbis stéréo 44,1 kHz, 48 s, 264 Ko, RMS −20 dBFS) via [`tools/gen_ending_break.py`](./p32-ending-break-audio.md) (synthèse procédurale reproductible, seed fixe). Inventaire 1→0 manquant. Zéro code runtime touché (activation auto) → **pas de cache-bump**. Remplaçable par un sample DAW au même chemin. Spec close : [`docs/audio-ending-break-spec.md`](../../docs/audio-ending-break-spec.md). |
| P3.3 | Refactor `monsters.js`/`data.js`/`npcs.js` en sous-fichiers | ✅ **3 lots faits (2026-06-21)** | Plan : [`p33-data-split.md`](./_archive/p33-data-split.md). **Lot A** (PR #654) : `data.js` → socle + `data-characters/spells/items/world.js`. **Lot B** (PR #656) : `monsters.js` → socle + `monsters-low/mid/high.js` (push). **Lot C** : `npcs.js` → socle + `npcs-a/b.js` (push). Registres reconstitués **deep-égaux** à master, zéro call-site métier touché, 946 units + 263 smoke + pwa verts, cache v212. B/C lancés sur demande explicite (reco initiale = différer). |
| P3.4 | Pass Lighthouse (LCP/TTI 1ʳᵉ visite) | ✅ **fait (2026-06-21)** | Mesuré (LH 13.4.0 + Chromium PW, cache vide) puis lazy-load des images hors-viewport. **LCP 29,7 s → 6,1 s**, score 59→69, SI 8,2→3,9 s, TTI 30,3→21,2 s. TTI résiduel = JS non-minifié → minif = build step, **exclu** (zéro build). Détail : [`docs/perf-lighthouse.md`](../../docs/perf-lighthouse.md). |
| P3.5 | Variété de boucle (playtest « 3 boucles ») | 📝 **protocole livré + amorce variété (2026-06-21)** | Protocole humain : [`docs/playtest-3-boucles.md`](../../docs/playtest-3-boucles.md) (toujours en attente d'exécution). **Amorce sûre livrée** ([`p35-darkloop-variants.md`](./p35-darkloop-variants.md)) : le beat `darkLoop` (1×/palier → 3× sur 3 Boucles, tirage aléatoire) n'avait **qu'1 réplique/héros** → répétition mot-pour-mot. Porté à **3 variantes/héros** (×16, 48 lignes) — levier « enrichir les variantes » explicitement préféré du §5, **zéro changement de cadence/équilibrage**. cache-bump hero-barks v13 / CACHE_VERSION v214. Le playtest reste requis pour décider d'un éventuel réglage de fréquence. |

---

## Ordre d'exécution recommandé

1. **P3.1 (clôture)** — vérif rapide du mapping renderer, fermer l'item (≈0 code).
2. **P2.1** — plus fort impact immersion, infra déjà amorcée.
3. **P2.2** — fort impact rejouabilité, 100 % dérivé (zéro risque save).
4. **P2.3** — faible effort (grille déjà robuste post-#640).
5. **P2.4** — réutilise `help-tour`.
6. **P2.6** → **P3.2** — audit audio puis comblement.
7. **P3.4 / P3.3 / P3.5** — au besoin, en fin de cycle RC.

> Critère de sortie RC (rappel audit) : un joueur **perçoit la corruption**,
> **sait où aller en endgame**, et n'est **pas noyé** par l'UI de combat —
> couvert par P2.1 + P2.2 + P2.3.
