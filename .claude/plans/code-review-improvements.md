# Revue de code complète — Plan d'amélioration priorisé

> Date : 2026-06-12 · Branche : `claude/code-review-improvements-1rz8rn`
> Périmètre : structuration du code, bugs latents (pro-action), ergonomie/UX,
> couverture de tests, et propositions de contenu pour les évolutions futures.
> Méthode : 4 audits parallèles (bugs, architecture, UX, tests/CI) sur les
> ~83 modules JS (40 300 lignes) + contre-vérification manuelle des constats
> structurants. Les items marqués ✅ ont été vérifiés ligne à ligne ; les
> autres proviennent des audits et sont à re-confirmer au moment de les traiter.

## Synthèse

La base de code est **fonctionnellement solide et remarquablement défensive**
(fallbacks systématiques, gardes `typeof`, sérialisation Set/Map cohérente) :
l'audit bugs n'a trouvé **aucun bug critique immédiatement exploitable**.
La dette principale est une **dette de clarté** (doc/code qui divergent,
duplication d'helpers sensibles, conventions irrégulières) et des **frictions
UX silencieuses** (actions refusées sans feedback, confirmations destructives
faibles). Le plan ci-dessous est ordonné par criticité décroissante : chaque
étape est livrable indépendamment (1 PR par étape, voire par item).

Légende effort : **S** < 1 h · **M** 1-4 h · **L** > 4 h.

---

## Étape 0 — CRITIQUE : risques de perte de données / sécurité / confiance joueur

*Critère de passage : aucun flux ne peut faire perdre une partie ou ignorer
silencieusement une action du joueur ; surface XSS unifiée.*

- [x] **0.1 — Unifier l'échappement HTML `_esc`** ✅ (S) — FAIT 2026-06-12
  3 implémentations divergentes : `js/visit-hud.js:43`, `js/atelier-voyageur.js:25`,
  `js/portal-matchmaking.js:46` (`s == null` vs `s || ''`, jeux de caractères
  différents). Ces helpers échappent des données **venant du réseau**
  (pseudos/messages Mondes Parallèles) → toute divergence est une surface XSS.
  → Extraire un `window.htmlEscape(s)` unique (petit module chargé tôt, ajouté
  au MANIFEST du loader), faire pointer les 3 `_esc` dessus, étendre le test
  anti-XSS de `tests/units.js` pour verrouiller l'implémentation unique.
  *Vérif : `node tests/units.js` + grep `function _esc(` → 0 implémentation locale.*
  → Nouveau module `js/html-escape.js` (jeu de 5 caractères `& < > " '`, repli
  null/undefined → `''`). Les 3 `_esc` deviennent `const _esc = window.htmlEscape`.
  Ajouté au MANIFEST loader + PRECACHE_URLS. Test anti-XSS réécrit : charge
  l'helper unique + verrouille la délégation des 3 fichiers (0 impl. locale).
  Vérifié : units (435), smoke (189), pwa-smoke verts ; grep = 0.

- [x] **0.2 — Feedback sur achat refusé (or insuffisant)** ✅ (S) — FAIT 2026-06-12
  `js/shop.js:384 — _purchase()` : `if (player.gold < price) return;` —
  **silencieux** (le cas « Sac plein ! » a un message, pas le cas or).
  Le joueur clique, rien ne se passe → perçu comme un bug.
  → `addMsg("❌ Pas assez de Gallions (il te faut X, tu as Y).", 'bad')`.
  Au même passage, balayer les autres refus silencieux signalés par l'audit UX :
  sort sans PM en combat, soin à PV max, objet inutilisable.
  *Vérif : scénario smoke « achat sans or → message visible ».*
  → `_purchase` annonce désormais le manque d'or. **Cause racine** : `_renderBuyGrid`
  n'attachait pas de `onclick` aux items non abordables (clic = rien) → corrigé,
  l'item reste grisé (cue visuel) **et** cliquable pour délivrer le message.
  Soin/recharge à la stat max : nouveau garde pur `_isWastedRestore` (inventory.js)
  appliqué dans `useItem` ET `useItemFromChar` → refus visible, objet conservé.
  Sort sans PM en combat (battle-spells.js:976) et soin OOC « déjà au mieux »
  (inventory-spells.js:203) : déjà couverts (vérifiés). Objets non utilisables
  (quête/clé/matériau/passif) : déjà messagés. Nouveau scénario smoke
  `scenarioRefusalFeedback` (achat sans or + soin à PV max). 190 scénarios verts.

- [x] **0.3 — Confirmations destructives : Ironman + suppression de slot manuel** (M) — FAIT 2026-06-12
  Audit UX P1.1/P3.11 : le toggle Ironman (`#ironman-toggle`) n'explique pas la
  permadeath (suppression de TOUS les slots Ironman à la mort, cf.
  `deleteIronmanSlots`) ; la suppression d'un slot manuel et celle de l'auto-save
  partagent le même `confirm()` natif peu visible (`js/save-ui.js`).
  → Modale stylisée de confirmation à l'activation d'Ironman (« Une seule vie.
  La mort efface la partie. ») + différencier la confirmation auto-save
  (bénin) vs slot manuel (définitif).
  *Vérif : scénario smoke Ironman + revue manuelle mobile.*
  → Nouvelle modale `#ironman-confirm-modal` (markup + CSS), wirée par
  `onIronmanToggle`/`confirmIronman`/`cancelIronman` (main.js) sur le `onchange`
  du toggle : cocher ouvre la modale, Annuler décoche, Confirmer retient.
  Suppression de slot : helper partagé `_confirmSlotDeletion(id)` (save-ui.js) —
  message bénin pour l'auto-save (recréée seule), avertissement irréversible
  pour un slot manuel. Nouveau scénario smoke `scenarioIronmanConfirm`. 191 verts.

- [ ] **0.4 — Robustesse de `_applyState` sur save partielle/corrompue** (M)
  Audit bugs #4 : `js/save.js` restaure `party` par `Object.assign` puis appelle
  `recalculateStats()` sans valider les champs critiques (`hp`, `level`, `spells`).
  Une save tronquée (quota localStorage, import manuel) produit des **NaN en
  cascade** dans les stats → jeu injouable sans crash.
  → Garde post-hydratation : si `player.hpMax`/`level` invalides, refuser le
  chargement avec message clair (et conserver le slot intact) plutôt que
  d'appliquer un état corrompu.
  *Vérif : test unitaire round-trip `_serializeState`/`_applyState` + cas save
  tronquée (nouveau dans `tests/units.js`).*

---

## Étape 1 — MAJEUR : bugs latents & garde-fous (pro-action)

*Critère de passage : doc = code sur les invariants, et les régressions les
plus probables sont couvertes par un test.*

- [ ] **1.1 — Résorber la dérive doc/code de CLAUDE.md** ✅ (M)
  Vérifié : **83 balises `<script>`** dans `index.html` vs **33 documentées** ;
  ~26 modules absents de la section « Structure des fichiers » (`combat-fx`,
  `codex`, `floor-events`, `potions`, `forge`, `library`, `endgame`,
  `multiplayer*`, `teleport`, `haptics`, `help-tour`, `pwa`…) ; l'alias
  **`ENEMIES = MONSTERS` documenté mais inexistant dans `js/data.js`** (grep
  vide). CLAUDE.md est la mémoire projet : sa dérive provoque de mauvaises
  décisions (humaines et IA).
  → Mettre à jour la liste des fichiers + l'ordre de chargement (généré depuis
  `index.html`, pas énuméré à la main) ; pour `ENEMIES`, **corriger la doc**
  (l'alias n'est utilisé nulle part — ne pas ajouter de code mort).
  *Vérif : script ponctuel comparant `<script src>` ↔ section doc.*

- [ ] **1.2 — Audit du MANIFEST du loader** (S)
  Croiser les globals critiques des modules récents (`house-donation.js`,
  `atelier-voyageur.js`, `floor-ambiance.js`, `potions.js`, `endgame.js`…)
  avec le `MANIFEST` de `js/loader.js` : tout export critique absent rend une
  régression de chargement invisible (raison d'être du loader).
  *Vérif : `window.__loaderReport.totalChecked` en hausse, smoke vert.*

- [ ] **1.3 — Tests manquants à plus haut risque** (M-L, découpables)
  1. **Génération de donjon** : 50 générations étages 1-10 → chaque étage a un
     escalier **atteignable** (filet de sécurité `_ensureStairsExist`). (S)
  2. **Mort Ironman** : `triggerDeath` en `ironmanMode` → écran de score, pas de
     pétrification, slots Ironman purgés. (S)
  3. **Interactions de statuts** : stun + fear + weaken combinés sur héros et
     ennemis — ordre des tours, `consumeStun`, jamais de segment figé. (M)
  4. **Migrations de save** : round-trip d'un save « ancien format » (sans
     slots étendus, sans champs récents) → état jouable. (M)
  5. **Célérité × Protego / double-garde** : comptage des coups bloqués. (M)
  *Vérif : nouveaux scénarios dans `tests/scenarios/` + `node tests/smoke.js`.*

- [ ] **1.4 — Hygiène CI/harness** ✅ partiel (S)
  Vérifié : `test.yml:53` annonce « 159 scénarios » alors que la suite en
  compte **189** (comptage réel des `module.exports.scenarios`).
  → Corriger le label (ou le rendre dynamique) ; centraliser les timeouts en
  dur du harness (`tests/lib/harness.js`) dans une constante `TIMEOUTS` ;
  resserrer `isIgnorableError` (ne pas avaler TypeError/ReferenceError).
  *Vérif : CI verte, log de suite cohérent.*

- [ ] **1.5 — Cohérence des gardes `typeof` dans `_applyState`** (S)
  L'audit a signalé des gardes hétérogènes ; contre-vérification : le pattern
  `if (typeof <global> !== 'undefined')` est **volontaire** (protège contre un
  réordonnancement de scripts) — ne pas « corriger ». En revanche, documenter
  ce pattern en tête de `_applyState` pour éviter qu'une future PR le
  « nettoie », et noter l'invariant `searchedCells` (`{at, count}` uniquement,
  sérialisation shallow).
  *Vérif : commentaire en place, aucun changement de comportement.*

---

## Étape 2 — UX : frictions récurrentes (impact joueur direct)

*Critère de passage : chaque action a un feedback ; les infos de décision sont
visibles au moment de décider ; mobile conforme 44 px.*

- [ ] **2.1 — États indisponibles visibles en combat** (M)
  Cooldown de Garde (`guardRegenCooldown`), stun/fear du perso actif : griser
  les boutons concernés + tooltip (« Garde disponible dans 1 tour »), au lieu
  d'un refus silencieux compris seulement via le log.
  *Vérif : scénario smoke + revue manuelle.*

- [ ] **2.2 — Résistances/faiblesses dans la sélection de cible** (M)
  `showTargetSelection()` n'affiche pas les 🔰/💥 connus (monstre déjà vu au
  bestiaire) — le joueur lance des sorts résistés sans le savoir, l'info
  n'est accessible qu'en fermant tout et en ouvrant le bestiaire.
  → Mini-badges d'éléments sous chaque bouton cible (uniquement si le monstre
  est dans `seenMonsters` : la découverte reste un gameplay).
  *Vérif : scénario combat avec monstre résistant vu/non-vu.*

- [ ] **2.3 — Journal de combat mobile : déplié au 1er combat** (S)
  Le panneau démarre replié avec un hint one-shot facile à manquer →
  premier combat confus. Déplier par défaut au tout premier combat
  (flag persisté), puis mémoriser le choix du joueur.

- [ ] **2.4 — Échap ferme la modale du dessus, pas tout** (M)
  `js/main.js` : Échap ferme toutes les modales d'un coup ; le flux
  inventaire → équiper → fiche perd le contexte. Introduire une petite pile
  de modales (ordre d'ouverture) ; Échap dépile.
  *Vérif : scénario navigation modales.*

- [ ] **2.5 — Wayfinding : tracker de quête + minimap** (M)
  Tracker de quête peu lisible (font 10px) et minimap sans légende des cases
  spéciales (escalier/boutique/fontaine). → Légende compacte sous la minimap
  (desktop), tracker renforcé, et indication d'étage cible sur les quêtes
  (« Cible : étage 4 ») pour limiter le backtracking à l'aveugle.

- [ ] **2.6 — Conformité tactile & iOS** (M)
  Zones < 44 px signalées (D-pad 40 px, slots timeline 22 px, boutons du log) ;
  modales sans `env(safe-area-inset-*)` (bouton ✕ sous le notch iPhone).
  → Passe CSS ciblée ≤700px + safe-area sur `.modal-box`.
  *Vérif : skill `ui-design-iterate` (screenshots 375×667 avant/après).*

- [ ] **2.7 — Indicateur de chargement initial** (S)
  Premier lancement (assets lourds, 4G) : écran figé plusieurs secondes sans
  spinner → refresh anxieux. Spinner/texte de chargement sur l'écran titre
  jusqu'à `loadTextures()` résolu.

- [ ] **2.8 — Accessibilité de base** (M, fil rouge)
  Contraste des boutons `.disabled` (opacity 0.4 sur fond sombre < AA),
  `aria-label` sur les badges de statut emoji-seuls, focus initial dans les
  modales. À traiter par retouches successives, pas de refonte.

---

## Étape 3 — Structuration & maintenabilité (dette de clarté)

*Philosophie respectée : zéro build, zéro dépendance, pas de migration ESM.
Critère de passage : moins de duplication, conventions explicites.*

- [ ] **3.1 — Helpers partagés** (M)
  - `window.htmlEscape` (fait en 0.1) ;
  - `renderStatBar()` commun HUD/fiche perso (2 implémentations aujourd'hui) ;
  - client REST Supabase léger partagé (`hall-of-fame.js` + `multiplayer*.js`
    redéfinissent chacun headers/fetch/fallback) — un `supabase-client.js`
    chargé tôt, les 4 fichiers délèguent.

- [ ] **3.2 — Conventions explicites dans les gros modules** (M, progressif)
  `battle.js`/`movement.js` : marquer PUBLIC vs interne (`_`) en commentaire
  d'en-tête de fonction au fil des PRs qui les touchent (pas de renommage de
  masse). Dans `state.js` (126 globals), annoter chaque variable
  `// PERSISTÉ (save)` ou `// TRANSIENT` — c'est la cause racine des oublis
  de sérialisation.

- [ ] **3.3 — Découpage de `css/style.css` (~4 800 lignes)** (L, opportuniste)
  Extraire par thème (layout / cartes / modales / HUD) **au moment où on
  retouche une zone**, pas en big-bang — chaque fichier extrait suit le
  protocole cache-bump (§8). Bénéfice secondaire : invalidation de cache PWA
  plus fine.

- [ ] **3.4 — Nettoyage de la racine** (S — décision utilisateur requise)
  `Audit Icones.html` (186 Ko), `Compare Icones.html` (176 Ko), `robot.html`,
  `gen_icons.py`, `gen_textures.py` (doublons de `tools/` ?), `uploads/`
  (6,5 Mo de fichiers temporaires) : non référencés par le jeu mais **servis
  par GitHub Pages**. → Proposer : déplacer les outils dans `tools/`,
  supprimer/ignorer `uploads/`. *Ne rien supprimer sans validation.*

- [ ] **3.5 — Modales : factory légère pour les futures** (S)
  24 modales quasi identiques dans `index.html`. Ne pas migrer l'existant
  (risque > bénéfice) ; fournir un helper `createModal(id, title)` pour que
  les **nouvelles** modales arrêtent le copier-coller et soient a11y-correctes
  par construction.

---

## Étape 4 — Contenu : propositions d'évolutions futures

*Idées classées par rapport effort/impact, cohérentes avec les systèmes
existants. À discuter avant tout chantier.*

**Quick wins (réutilisent l'existant)**
1. **Défi quotidien seedé** : un donjon du jour (seed partagée dérivée de la
   date), score soumis au Hall of Fame existant (colonne `mode`). Forte
   rejouabilité pour un coût faible — la génération est déjà seedable par étage.
2. **Sorts combinés duo** : en duo, si Harry et Hermione lancent des sorts
   compatibles dans le même round (feu + vent…), effet bonus — valorise le
   mode 2 joueurs et la timeline d'initiative existante.
3. **Tableau de chasse du bestiaire** : paliers « 5/15/30 espèces vues » →
   petites récompenses ; le `seenMonsters` et l'UI bestiaire existent déjà.

**Chantiers moyens**
4. **Familiers** : un compagnon passif (chouette, crapaud, chat) avec 1 effet
   léger (fortune, célérité, regen) — s'appuie sur le slot `trinket` et le
   pipeline d'icônes ; pas de nouveau système de combat.
5. **Tranche E (étages 21+) thématisée** : la Boucle Ténébreuse recycle déjà
   les étages ; une 5ᵉ ambiance (`tension` est en réserve dans
   `_ZONE_SAMPLES`) + tileset dédié donnerait un vrai palier visuel endgame.
6. **Événements d'étage scriptés** : 3-4 micro-événements rares à l'entrée
   d'étage (marchand ambulant, fantôme quêteur, salle piégée bonus) via le
   système `floor-events` existant.

**Visions long terme (cadrage nécessaire)**
7. **Arbre de talents par héros** : 2 mini-branches par personnage (3 nœuds),
   alimentées par les points d'allocation existants — différencie les 13 héros
   au-delà des stats.
8. **New Game+** : relancer avec `houseTier` conservé et monstres re-scalés —
   le scaling (`effectiveFloor`, variantes Ténébreuses) fournit déjà la base.
9. **Mode coop asynchrone étendu** : sur la base des Mondes Parallèles,
   « contrats » laissés par d'autres joueurs (tuer l'écho d'un boss qui les a
   vaincus) — réutilise `mp_threats`/échos astraux.

---

## Suivi

| Étape | Items | Statut |
|-------|-------|--------|
| 0 — Critique | 4 | ☐ à faire |
| 1 — Majeur | 5 | ☐ à faire |
| 2 — UX | 8 | ☐ à faire |
| 3 — Structure | 5 | ☐ à faire |
| 4 — Contenu | propositions | ☐ à arbitrer |

Chaque item traité : cocher ici, noter les écarts, et respecter le
commit-guard (§5 plan, §7 smoke, §8 cache-bump si JS/CSS servi, §6 état PR).
