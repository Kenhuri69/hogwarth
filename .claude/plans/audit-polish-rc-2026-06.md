# Revue globale de cohérence & Plan de polish multi-axes (Release Candidate)

> **But** : passer Poudlard & Magie en phase finale de qualité avant une mise à
> jour publique majeure. Audit transversal **6 axes** + plan de polish priorisé.
>
> Date : 2026-06-21 · Méthode : lecture croisée du code réel (`js/`,
> `index.html`, `css/`), des 14 chapitres `docs/histoire/`, du
> `DIFFICULTY_REPORT.md`, de la suite de tests et des assets, **complétée par
> des relevés chiffrés** (tailles, comptes de scripts/scénarios, recherche de
> motifs a11y/perf).
>
> **Périmètre** : ce document est **complémentaire** de
> [`docs/REVUE-TRANSVERSALE-ET-ROADMAP.md`](../../docs/REVUE-TRANSVERSALE-ET-ROADMAP.md)
> (revue *narration*, déclarée close au sign-off release 2026-06-19/20). Il ne
> ré-audite pas la narration en profondeur ; il **ouvre les axes non couverts**
> par cette revue (UX, performance/technique, immersion-feedback, rejouabilité)
> et fournit une **checklist Release Candidate** actionnable.
>
> Légende : ✅ point fort · ⚠️ faiblesse / risque · 💡 suggestion concrète.

---

## Constat d'entrée : un projet déjà très mûr

Avant l'audit, il faut poser le décor honnêtement, sinon le plan sonne faux :

- **Systèmes structurants tous livrés** (combat, statuts, éléments, artefacts,
  potions/craft, quêtes signature, Boucle Ténébreuse, Codex, profil/NG+,
  Mondes Parallèles, PvP, sauvegardes multi-slots, PWA offline).
- **Équilibrage récemment re-validé** : `DIFFICULTY_REPORT.md` régénéré à
  N=4000, garde-fou CI `check_difficulty.js` « 0 dérive sur 6 runs ».
- **Filet de sécurité solide** : **259 scénarios** smoke + **684 assertions**
  units + `pwa-smoke` + `check_cache_versions` + `check_doc_modules`, tous en CI.
- **Accessibilité déjà entamée** : `prefers-reduced-motion` honoré dans 12
  modules CSS/JS, **73** attributs `aria-*` dans `index.html`, `lang="fr"`,
  `theme-color`, focus-trap des modales (`modal-a11y.js`).

> 🟢 **Conséquence pour le plan** : il ne reste **pas** de gros système à
> construire. Le delta vers une release « pro » est fait de **finitions
> transversales** — packaging du dépôt, première impression (load + onboarding),
> feedback de combat, lisibilité endgame, et hygiène du repo. C'est exactement
> ce que cible ce document.

---

# ÉTAPE 1 — Audit multi-axes

## Axe 1 — Cohérence narrative & gameplay

**✅ Points forts**
- Colonne vertébrale claire et non-bloquante (un seul verrou dur `victoryAchieved`
  à l'ét. 10) ; tout l'optionnel est greffé proprement. Déjà audité et clos
  côté narration.
- Source unique de vérité A/B/C/D (`floor-themes.js`) → tileset + musique + ton
  cohérents ; aucune dérive entre couches.
- Lore *incarné mécaniquement* : Peur = statut `fear` ↔ Patronus Maxima ; Mythe
  > Revers = paliers Apothéose gatés par la victoire ; Éclats = fil rouge
  filé de l'acte I à « Briser le Cycle ».
- Dérive doc↔code **résolue** : `CLAUDE.md` aligné sur 86 modules
  (`check_doc_modules` en CI), bandeaux « Statut réel » sur les 14 chapitres.

**⚠️ Points faibles**
- ⚠️ **Découverte du contenu signature par le joueur** : les 4 quêtes signature
  shippent avec des **proxys `kill`/`item`** (objectifs neufs hors-scope assumé).
  Risque : un joueur peut traverser l'endgame sans *percevoir* que ces quêtes
  portent une charge narrative distincte (elles ressemblent à des kill-quests).
- ⚠️ **Le contenu (texte) versé dans les systèmes** reste le vrai chantier
  ouvert reconnu par la revue narration : « remplir des coquilles », pas
  « coder des coquilles ». Le Codex est plein (36 entrées, 0 coquille) mais le
  ratio *lore lu / lore disponible* en run réel n'est pas mesuré.

**💡 Suggestions**
- 💡 Marquer visuellement les quêtes signature dans le journal (icône/coloris
  « signature » distinct du `❗` générique) pour signaler leur poids narratif.
- 💡 Ajouter un compteur de complétion Codex visible (« 24/36 entrées
  révélées ») dans la modale Codex pour donner un objectif de collection.

## Axe 2 — Équilibrage & progression

**✅ Points forts**
- Méthodologie Monte-Carlo réelle (`sim-difficulty.js` miroir du runtime),
  baseline N=4000, **garde-fou CI** qui bloque toute dérive > seuil.
- Bandes-cible saines et documentées : solo plancher 52 %, duo plancher 72 %,
  aucun mur < 40 % jusqu'à l'ét. 12.
- Rework des stats secondaires (D1–D5) donne un débouché réel à chaque stat
  (INT→MAG, END→DEF/PV/DoT, STR→pénétration, AGI→Célérité, LCK→Fortune) —
  calibré par simulation.
- Anti-farm pensé : plafond kills Ironman (`étageMax×12`), `Broyer` anti-tank,
  scaling de Boucle « R1 marqué » re-calibré (constat « trop facile pour
  suréquipé »).

**⚠️ Points faibles**
- ⚠️ **Simulation ≠ ressenti humain** : les sims modélisent une IA de jeu
  « optimale-raisonnable » sans erreurs, sans gestion d'inventaire sous-optimale,
  sans panique. Le win-rate réel d'un joueur débutant est inconnu (aucune
  télémétrie agrégée — `BalanceLog` est opt-in local, jamais collecté).
- ⚠️ **Endgame Boucle ★ N** : la progression infinie repose sur des seuils
  polynomiaux ; le ressenti de « plateau » au-delà de ★ 10-20 n'est pas
  playtest-validé (seul le scaling monstre l'est).
- ⚠️ Les sims couvrent le **mode Normal** principalement ; Facile/Difficile/
  Expert reposent sur des multiplicateurs constants non re-simulés à N=4000.

**💡 Suggestions**
- 💡 **Campagne de playtest humain ciblée** (cf. checklist) sur 3 profils :
  débutant solo Facile, intermédiaire duo Normal, expert Boucle — pour
  confronter les sims au vécu.
- 💡 Re-générer une passe N=4000 par difficulté (pas seulement Normal) et
  archiver la table dans `DIFFICULTY_REPORT.md` pour figer la baseline RC.

## Axe 3 — UX / Interface utilisateur

**✅ Points forts**
- A11y de base solide : focus-trap générique (`modal-a11y.js` via
  MutationObserver, zéro call-site touché), `inert` sur le fond, restitution du
  focus ; `prefers-reduced-motion` respecté largement.
- Helpers défensifs (`safeEl`/`safeCall`) + loader avec bandeau d'erreur si un
  global critique manque → dégradation gracieuse plutôt qu'écran blanc.
- Combat enrichi : tooltips riches, log de combat, dégâts flottants, timeline
  d'initiative (`UX.*`), tous **défensifs** (call-sites gardés).
- Mobile pensé : D-pad tactile + swipe-canvas, touch targets 44 px, modales
  96vw, `100dvh`, accordéon de la fiche perso.
- Keybindings remappables persistés.

**⚠️ Points faibles**
- ⚠️ **Densité d'information en combat** : 8 actions (5 base + 3 conditionnelles)
  + statuts + timeline + log. Sur petit écran, le risque de surcharge cognitive
  est réel pour un nouveau joueur (pas de hiérarchie visuelle « action primaire »).
- ⚠️ **Pas de `<meta name="description">`** → aperçu social/SEO pauvre quand
  l'URL est partagée.
- ⚠️ **Découvrabilité des systèmes profonds** : Forge, Bibliothèque, Atelier du
  Voyageur, Don à la Maison n'apparaissent qu'en endgame/contexte — un joueur
  peut ignorer leur existence. Le `help-tour` couvre l'early game, pas l'endgame.
- ⚠️ **Fiche perso très dense** (paper-doll 11 slots + set Maison + sorts + sac +
  stats dérivées) : excellente en desktop, lourde à scroller en mobile malgré
  l'accordéon.

**💡 Suggestions**
- 💡 Ajouter `<meta name="description">` + balises Open Graph (`og:title`,
  `og:image` pointant `img/scenes/title.jpg`) — gain « pro » immédiat à coût nul.
- 💡 Hiérarchiser visuellement le bouton 🗡️ Attaquer (action primaire) vs les
  actions secondaires en combat (taille/teinte), surtout en mobile.
- 💡 Mini-tour contextuel « one-shot » à la **première** entrée Forge /
  Bibliothèque / Atelier (réutiliser l'infra `help-tour`).

## Axe 4 — Immersion & ambiance

**✅ Points forts**
- Gradient de ton porté par les tranches (familier→austère→abyssal→runique),
  ambiance zonée + corruption progressive (`floor-ambiance.js`), phrases
  d'atmosphère à l'entrée de salle (`room-flavor.js`), micro-événements d'étage.
- Audio par zone (ambiant) **et** par axes de combat (danger critique > epic >
  late > difficulté), repli synthèse procédurale si sample 404.
- Barks héros contextuels (combat/explo, variantes houseTension, beats
  scénarisés `descentStake`, `darkBoss`/`loopEcho`) — voix optionnelle.
- VFX purs et défensifs (`combat-fx`, `dungeon-fx`, `cinematics`, haptics).
- SFX « froid surnaturel » (`playColdBreath`) déclenché sur ennemi corrompu.

**⚠️ Points faibles**
- ⚠️ **Corruption ressentie mais non lisible** : la revue narration elle-même
  liste (💡3, ouvert) un « thermomètre de corruption » HUD non implémenté. La
  descente est *subie* plus que *visualisée*.
- ⚠️ **Couverture audio inégale** : musique/SFX reposent sur des samples OGG ;
  les manques retombent sur la synthèse (correct mais moins immersif). Aucun
  inventaire « sample manquant vs synthétisé » consolidé.
- ⚠️ **Art endgame partiel** : 4 boss-gardiens des Chambres en **fallback SVG**
  (PNG non livrés, prompts Nano Banana prêts) — visible en Boucle profonde.

**💡 Suggestions**
- 💡 Implémenter le **thermomètre de corruption** HUD (indicateur discret
  ❄→❄❄❄❄+ déjà amorcé dans `floor-ambiance.js`) + clé Codex — rend la descente
  *ressentie*. Effort moyen, fort impact immersion.
- 💡 Finaliser les **4 PNG de boss-gardiens** (art séparé, prompts prêts) pour
  éliminer le dernier fallback vectoriel visible.

## Axe 5 — Performance & technique

**✅ Points forts**
- Zéro dépendance, zéro build → maintenance simple, pas de chaîne d'outils
  fragile.
- PWA offline robuste : network-first shell, cache-first JS/CSS indexé `?v=N`,
  stale-while-revalidate assets ; garde-fou cache en CI (`check_cache_versions`).
- Rendu canvas avec cache de patterns (`_TEX_PATTERNS`, invalidé au resize),
  fog par profondeur, sprites paresseux (lazy `HTMLImageElement` caché).

**⚠️ Points faibles**
- ⚠️ **88 `<script src>` synchrones, render-blocking, zéro `defer`/`async`**
  (relevé : 0 occurrence de defer/async). Total **~2,6 Mo de JS**. Sur première
  visite (cache vide) c'est 88 requêtes bloquantes avant interactivité. Le SW
  masque le problème aux visites suivantes, **pas à la première impression**.
- ⚠️ **~60 Mo d'assets** (43 Mo `img/` + 17 Mo `audio/`). Stale-while-revalidate
  amortit, mais le poids cumulé pèse sur le stockage device et la 1ʳᵉ session.
- ⚠️ **Hygiène du dépôt** : artefacts de dev à la **racine servie** par GitHub
  Pages — `Audit Icones.html`, `Compare Icones.html`, `robot.html`
  (**3 031 lignes** cumulées). Accessibles publiquement, peu professionnels.
- ⚠️ **Pas de `.nojekyll`** : GitHub Pages passe par Jekyll, qui ignore les
  fichiers/dossiers `_`-préfixés. Inoffensif aujourd'hui (aucun asset servi
  n'est `_`-préfixé) mais fragile (un futur `img/_foo` disparaîtrait
  silencieusement).
- ⚠️ Fichiers volumineux : `monsters.js` 2 484 l, `data.js` 1 728 l,
  `npcs.js` 1 855 l — maintenabilité (pas un bug, une dette).

**💡 Suggestions**
- 💡 **Ajouter `defer`** à tous les `<script>` (l'ordre est préservé avec
  `defer`, le scope global reste intact). ⚠️ **Révisé (2026-06-21)** : les
  scripts sont **en fin de `<body>`** → le DOM est déjà parsé avant eux, donc
  le gain réel est **marginal** (parallélisation des téléchargements + 1ᵉʳ paint
  légèrement plus tôt), pas le « TTI » initialement annoncé. À valider en smoke
  complet ; reporté en session dédiée.
- ❌ ~~Sortir les 3 HTML de dev de la racine~~ **Inexact (2026-06-21)** : la
  lecture de `.github/workflows/deploy.yml` montre un **bundle `_site` curaté**
  qui n'y copie que le runtime (`index.html`, `robot.html`, `manifest.json`,
  `sw.js`, `css`/`js`/`img`/`audio`). `Audit Icones.html` / `Compare Icones.html`
  ne sont **pas servis** sur Pages (seulement présents dans le dépôt), et
  `robot.html` est **déployé exprès** (robot de playtest). Aucune action requise.
- ❌ ~~Ajouter `.nojekyll`~~ **Sans objet (2026-06-21)** : Pages déploie via
  **GitHub Actions** (`actions/deploy-pages`), pas via le build Jekyll legacy
  → aucun fichier `_`-préfixé n'est filtré.
- 💡 (long terme) Audit Lighthouse de la page publique pour chiffrer LCP/TTI
  réels et prioriser.

## Axe 6 — Rejouabilité & endgame

**✅ Points forts**
- Boucle Ténébreuse complète : recyclage PNJ + monstres (`effectiveFloor`),
  quêtes répétables du Gardien, variants Ténébreux, scaling récursif calibré.
- Prestige infini ★ N (gold-sink Don à la Maison), Chambres des Fondateurs
  (4 boss-gardiens placés selon `chosenHouse`), échos de signature house-aware.
- « Briser le Cycle » = vraie fin optionnelle (boss `reflet_mythe`, choix
  🕊️/🌑) ; NG+ « vrai » empilable (challenge, zéro héritage de stats).
- Profil persistant hors-save (titres, Codex du Sorcier, fins vues) +
  Hall of Fame Ironman classé.
- 4 Maisons = variantes de build/signature/cosmétique **sans rompre l'équité**.

**⚠️ Points faibles**
- ⚠️ **Profondeur de boucle réellement jouée ?** Le design supporte ★ N infini,
  mais le ressenti au-delà de quelques boucles (répétition de PNJ/monstres
  recyclés) n'est pas playtest-validé. Risque de lassitude avant la
  « destination » (Chambres ét. 17+).
- ⚠️ **Visibilité des objectifs endgame** : un joueur post-victoire ne sait pas
  forcément que les Chambres, « Briser le Cycle », les échos de signature
  existent et où ils se déclenchent (pas de « journal endgame » récapitulatif).
- ⚠️ **NG+ découvrabilité** : opt-in au player-select visible seulement si
  ≥ 1 victoire ; l'effet (×scaling) est expliqué dans le libellé mais pas
  « vendu » comme un mode de challenge.

**💡 Suggestions**
- 💡 Ajouter un **panneau « Boussole d'endgame »** (post-victoire) listant les
  destinations débloquées et leur déclencheur (Chambres ét. 17, Gardien de la
  Boucle ét. 11, Briser le Cycle à 15 Éclats) — convertit la profondeur latente
  en objectifs lisibles.
- 💡 Playtest dédié « 3 boucles consécutives » pour mesurer le point de
  lassitude et ajuster la cadence des beats house-aware.

---

# ÉTAPE 2 — Plan de polish priorisé

> Principe : maximiser le **ratio impact/effort** vers une release « pro » sans
> toucher aux systèmes ni à l'équilibre validé. Priorité 1 = ce qui change la
> **première impression** et l'hygiène ; P2 = ce qui réduit la **frustration**
> et renforce le feedback ; P3 = polish de luxe.
>
> Chaque tâche front (`js/`/`css/`/`index.html`) impose le **bump cache PWA**
> (skill `cache-bump`) + `node tests/smoke.js` vert (guidelines §7-8).

## Priorité 1 — Court terme (1-2 semaines) : packaging & première impression

| # | Axe | Tâche | Difficulté | Impact | Statut |
|---|-----|-------|-----------|--------|--------|
| P1.1 | Technique | **`README.md` racine** (le dépôt n'en avait aucun) : pitch, lien jouable, stack, tests, statut RC. | Faible | **Élevé** (vitrine) | ✅ **Fait (2026-06-21)** |
| P1.2 | Technique | ~~Nettoyer la racine servie (dev HTML).~~ | Faible | — | ❌ **Abandonné** : bundle `_site` curaté (`deploy.yml`) → non servis ; `robot.html` déployé exprès. Audit initial inexact. |
| P1.3 | Technique | ~~Ajouter `.nojekyll`.~~ | Faible | — | ❌ **Abandonné** : Pages via GitHub Actions, pas Jekyll → sans objet. |
| P1.4 | UX | **Métadonnées sociales** : `<meta description>` + Open Graph + Twitter card (image `title.jpg`). | Faible | Moyen (partage) | ✅ **Fait (2026-06-21)** (cache-bump) |
| P1.5 | Performance | **`defer` sur les `<script>`**. | Moyenne | **Révisé : Faible** | ⏸️ **Reporté** : scripts en fin de `<body>` → gain marginal ; risque 88 balises à valider en smoke complet. |
| P1.6 | Équilibrage | **Sim N=4000 par difficulté** → figer `DIFFICULTY_REPORT.md`. | Moyenne | Moyen | ⏸️ **Reporté** : Monte-Carlo lourd, session dédiée. |

**Critère de sortie P1** : vitrine (README + métadonnées de partage), tests
verts. ✅ **Atteint (2026-06-21)** pour le périmètre retenu (P1.1 + P1.4).
P1.5/P1.6 portés à la session suivante ; P1.2/P1.3 abandonnés après lecture
de `deploy.yml`.

## Priorité 2 — Moyen terme : frustration & feedback

| # | Axe | Tâche | Difficulté | Impact | Dépendances |
|---|-----|-------|-----------|--------|-------------|
| P2.1 | Immersion | **Thermomètre de corruption HUD** (indicateur ❄→❄❄❄❄+ déjà amorcé `floor-ambiance.js`) + clé Codex. | Moyenne | **Élevé** (descente ressentie) | cache-bump |
| P2.2 | Endgame | **Panneau « Boussole d'endgame »** post-victoire (destinations + déclencheurs). | Moyenne | Élevé (rejouabilité lisible) | — |
| P2.3 | UX | **Hiérarchie d'action en combat** : mise en avant de l'action primaire (Attaquer), compactage des conditionnelles, surtout mobile. | Moyenne | Moyen (charge cognitive) | cache-bump |
| P2.4 | UX | **Mini-tours contextuels endgame** (1ʳᵉ Forge/Biblio/Atelier) via infra `help-tour`. | Moyenne | Moyen (découvrabilité) | help-tour |
| P2.5 | Narratif | **Marquer les quêtes signature** dans le journal + **compteur Codex** (« X/36 révélées »). | Faible | Moyen | — |
| P2.6 | Immersion | **Inventaire audio** (samples livrés vs synthétisés) → liste de gaps prioritaires à enregistrer. | Faible | Faible→Moyen | — |

**Critère de sortie P2** : un joueur perçoit la corruption, sait où aller en
endgame, et n'est pas noyé par l'UI de combat.

## Priorité 3 — Long terme : polish de luxe

| # | Axe | Tâche | Difficulté | Impact | Dépendances |
|---|-----|-------|-----------|--------|-------------|
| P3.1 | Immersion | **Art PNG des 4 boss-gardiens** des Chambres (remplace fallback SVG ; prompts Nano Banana prêts). | Moyenne | Moyen | cache-bump |
| P3.2 | Immersion | **Combler les gaps audio** identifiés en P2.6 (enregistrement/intégration OGG). | Haute | Moyen | P2.6 |
| P3.3 | Technique | **Refactor de confort** des gros fichiers (`monsters.js`/`data.js`/`npcs.js`) en sous-fichiers de données — uniquement si la dette gêne. | Moyenne | Faible (dette) | check_doc_modules |
| P3.4 | UX | **Pass Lighthouse** + micro-optimisations ciblées (lazy-load d'images de scène hors viewport, audio à la demande). | Haute | Moyen | P1.5 |
| P3.5 | Endgame | **Variété de boucle** : playtest « 3 boucles » → ajuster cadence des beats house-aware si lassitude mesurée. | Haute | Moyen | playtest |

---

## Checklist de playtesting recommandée

**Parcours fonctionnel (déjà couvert smoke, à refaire en main humaine)**
- [ ] Intro Dumbledore → tutoriel `help-tour` → choix Maison (les 4).
- [ ] Acte I→III jusqu'à victoire ét. 10, **solo** puis **duo**.
- [ ] Première visite de chaque système : boutique, coffre, fontaine, forge,
      bibliothèque, atelier, don à la Maison, concoction de potion.
- [ ] Boucle Ténébreuse : 1 boucle complète + amorce ★ N + Chambre ét. 17.
- [ ] « Briser le Cycle » (15 Éclats) → fin 🕊️ et fin 🌑.
- [ ] Ironman : mort → score → Hall of Fame (online + repli offline).
- [ ] Mondes Parallèles : 2 clients (protocole `parallel-live-checklist.md`).

**Ressenti & frustration (nouveau, à observer)**
- [ ] Débutant solo Facile : où décroche-t-il ? comprend-il le combat relatif ?
- [ ] Intermédiaire duo Normal : le « mur » duo ét. 7 est-il juste ?
- [ ] Expert Boucle : à quelle ★ N apparaît la lassitude ?
- [ ] Mobile (≤700px) : combat dense lisible ? fiche perso scrollable sans gêne ?
      swipe-canvas fiable ?
- [ ] Première visite cache vide : temps avant interactivité acceptable ?

**Régression technique**
- [ ] `node tests/units.js` · `node tests/smoke.js` · `node tests/pwa-smoke.js`
      verts.
- [ ] `node tools/check_cache_versions.js --base origin/master` (0 dérive).
- [ ] `node tools/check_difficulty.js --base origin/master` (0 dérive).
- [ ] `node tools/check_doc_modules.js` (arbo ↔ index.html).

## Mise à jour README & GitHub Page

- **README.md racine (P1.1)** — sections recommandées : bandeau titre +
  screenshot, *pitch* (1 paragraphe), **lien jouable** (`https://kenhuri69.github.io/hogwarth/`),
  fonctionnalités clés (puces), captures (combat / donjon 3D / Codex),
  stack (« Vanilla JS / Canvas, zéro dépendance, zéro build »), installation
  locale (`python3 -m http.server`), lancement des tests, statut **Release
  Candidate**, crédits/licence, lien vers `docs/`.
- **GitHub Page (Pages)** — `<meta description>` + Open Graph (P1.4) pour un bel
  aperçu au partage ; vérifier `theme-color` (déjà présent) et l'icône PWA ;
  bannière « installable / jouable hors-ligne ».
- **Topics GitHub** : ajouter des *topics* (`game`, `rpg`, `harry-potter`,
  `vanilla-js`, `canvas`, `pwa`) pour la découvrabilité.

## Métriques à suivre après mise à jour

> Le projet n'a **pas** de télémétrie réseau (choix assumé, RGPD-friendly).
> Les métriques ci-dessous sont soit **locales/opt-in**, soit **observables**
> hors-jeu — ne pas instaurer de collecte silencieuse.

- **Technique / perf** : LCP & Time-to-Interactive (Lighthouse, 1ʳᵉ visite
  cache vide), poids transféré, score PWA. *Cible : TTI < 3 s sur 4G simulée.*
- **Rétention proxy** (sans backend) : nombre de slots de save remplis / runs
  Ironman soumis au Hall of Fame (déjà persistés) comme indicateur d'engagement.
- **Satisfaction combat** : via playtest qualitatif (échelle 1-5 « lisibilité »,
  « tension », « équité ») — pas de mesure auto.
- **Équilibrage** : win-rate par étage/difficulté issu de `BalanceLog` **si** un
  testeur active l'opt-in local et exporte (jamais imposé).
- **Complétion contenu** : ratio entrées Codex révélées / 36 en fin de run
  (observable en playtest) — proxy d'exposition au lore.

---

## Objectifs finaux & synthèse

Le jeu est **fonctionnellement complet et équilibré** ; il ne lui manque pas de
systèmes mais des **finitions de présentation et de confort** :

1. **Vitrine & première impression** (README, page propre, `defer`, métadonnées)
   — P1, fort impact / faible effort.
2. **Réduction de frustration & feedback** (thermomètre de corruption, boussole
   endgame, hiérarchie de combat, découvrabilité) — P2.
3. **Polish de luxe** (art boss-gardiens, audio, Lighthouse) — P3.

Le tout **sans toucher** à l'équilibre validé ni à la personnalité du jeu : on
**emballe, clarifie et polit** un produit déjà solide pour en faire une
**Release Candidate** présentable.

---

> **Statut de ce plan** : audit livré 2026-06-21. Aucune implémentation engagée —
> ce document est la **proposition** soumise à arbitrage. Les tâches P1 sont
> prêtes à démarrer (chacune indépendante, faible risque). À cocher au fil de
> l'implémentation conformément aux guidelines §5 (plan vivant).
