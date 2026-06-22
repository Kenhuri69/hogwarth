# Plan d'optimisation performance & stabilisation — 2026-06-22

> Branche : `claude/hogwarth-perf-optimization-60fpzq`
> Objectif : fluidité, temps de chargement < 5-6 s, stabilité fin de partie /
> Boucle, bonne expérience mobile sur GitHub Pages — **sans rien retirer de la
> richesse visuelle/narrative**.
> Contrainte : vanilla JS/HTML/CSS, zéro build step, zéro dépendance runtime
> (les outils d'optimisation d'assets sont des scripts de **pré-traitement**,
> pas du code embarqué).

Ce plan est **complémentaire** des audits d'assets existants
(`_archive/image-assets-audit-2026-06.md`, `_archive/asset-png-review.md`) qui
ne traitaient que la **couverture** (aucun asset manquant). Ici on traite le
**poids** et le **coût runtime**.

---

## 0. État mesuré (baseline 2026-06-22)

Mesures réelles `du`/`find` sur le repo :

| Poste | Mesure | Détail |
|-------|--------|--------|
| Repo total | **256 Mo** | dont `.git` |
| `img/` | **45 Mo** | **1144 PNG**, 7 JPG |
| `audio/` | **17 Mo** | **193 OGG** (5 plus gros ~270-285 Ko) |
| `js/` | **2,5 Mo** | **97 modules** (`index.html` = 98 `<script>`) |
| `css/` | **300 Ko** | 12 feuilles |

**Points chauds images** (échantillon) :

| Fichier | Poids | Dimensions | Problème |
|---------|-------|------------|----------|
| `img/npc/rosmerta.png` | **1,57 Mo** | 1408×768 RGB | Surdimensionné (affiché ~128 px) |
| `img/npc/mundungus.png` | **1,55 Mo** | — | idem |
| `img/icons/_ingame.png` | 578 Ko | — | Planche montage (référencée ? cf. §1.5) |
| `img/icons/_mobile_bar.png` | 423 Ko | — | idem |
| `img/icons/_phase1_ingame.png` | 375 Ko | — | idem |
| `img/houses/*.png` ×4 | ~360-400 Ko | 512×512 RGBA | + **doublon `img/houses/v2/*`** |
| `img/monsters/*.png` | **moy. 217 Ko** ×78 = **17 Mo** | 512×512 RGBA | PNG truecolor non quantifiés |
| `img/icons_new/` | 3,5 Mo | 685 fichiers | mipmaps painterly (5 tailles/item) |

> Tous les PNG inspectés sont en **8-bit truecolor non quantifié**. Un passage
> `pngquant` (palette ≤256) + `oxipng` réduit typiquement de **40-60 %** sans
> perte visible sur ce type d'art painterly. **C'est le plus gros levier.**

**Points chauds runtime** (lecture code) :

- `index.html` charge **97 `<script defer>`** → 97 requêtes au 1ᵉʳ chargement
  (atténué HTTP/2 + cache SW ensuite). ~2,5 Mo non compressé, **~600 Ko gzippé**
  sur le fil (GitHub Pages gzippe automatiquement).
- `sw.js` (`CACHE_VERSION = hogwarth-v223`) **précache tout le JS+CSS** (~2,5 Mo)
  à l'install du Service Worker — en arrière-plan, ne bloque pas le 1ᵉʳ paint,
  mais lourd en data mobile.
- **Deux boucles de redraw permanentes** appelant `drawDungeon()` complet :
  - `startDungeonFxLoop` (`dungeon-fx.js`) : `setInterval 90 ms` (~11 FPS),
    vacillement de torche.
  - `startNpcAnimLoop` (`renderer-effects.js`) : `setInterval 200 ms` (~5 FPS),
    pulse halo PNJ/ennemis.
  → Bien gardées (`reduced-motion`, `_overlayCovering`, présence d'entité),
  mais quand actives elles **redessinent toute la scène pseudo-3D** en continu
  = coût CPU/batterie mobile constant hors combat.
- **154 `innerHTML`** dans `js/` → churn DOM (log combat, inventaire, modales).
- **19 `setInterval`** (la plupart réseau MP, actifs seulement si MP engagé).

**Bonnes pratiques déjà en place** (à préserver) :
`<script defer>`, rendu **événementiel** (pas de rAF global permanent),
chargement **paresseux** des sprites monstres (`_getMonsterImg`), garde
`reduced-motion` sur les FX, cache SW indexé `?v=N`.

---

# ÉTAPE 1 — Diagnostic & spécifications

## 1.1 Temps de chargement & initialisation

**⚠️ Problèmes probables**
- 1ᵉʳ chargement = `index.html` + ~600 Ko JS gzippé + `title.jpg` (353 Ko) +
  `title_icon.jpg` (269 Ko) avant interaction. Sur 3G/mobile lente, > 6 s.
- 97 requêtes JS : overhead de connexion même en HTTP/2.
- `loadTextures()` est `await`é dans `startGame` (`main.js:506`) — bloque l'entrée
  en jeu si les textures murales tardent.
- Le SW `addAll(PRECACHE_URLS)` est **atomique** : si une URL 404 (asset oublié
  au bump), **toute** l'install échoue → pas de mode offline.

**💡 Solutions priorisées**
1. **Compresser title.jpg / title_icon.jpg** (mozjpeg q78, ~150 Ko chacun) —
   ce sont les premiers octets visibles. *(P1, trivial)*
2. **Précharger explicitement** l'asson critique du 1ᵉʳ écran via
   `<link rel="preload" as="image" href="img/scenes/title.jpg">`. *(P1)*
3. **Rendre `addAll` tolérant** : `Promise.allSettled` par URL (ou
   `cache.add` individuel try/caché) → une URL morte ne casse plus l'offline.
   *(P1, stabilité)*
4. **Concaténer les modules JS** en quelques bundles logiques **au déploiement**
   (script Node de concat, pas de bundler runtime) : passer de 97 à ~6-8
   requêtes. Garder les fichiers sources tels quels ; la concat se fait en CI
   avant publication GitHub Pages. *(P2, gain réseau net mais touche le pipeline
   de déploiement — à valider)*
5. **Différer l'audio** : `AudioSystem.init()` n'est appelé qu'au 1ᵉʳ geste —
   déjà le cas ; vérifier qu'aucun OGG n'est `fetch` avant interaction.

**Impact attendu** : 1ᵉʳ paint plus rapide, entrée en jeu < 5-6 s sur mobile
médian, offline robuste.

## 1.2 Génération procédurale & performance par étage

**⚠️ Problèmes probables**
- `generateDungeon()` + spawn (monstres, PNJ, quêtes) à chaque descente. En
  Boucle profonde (`effectiveFloor`), le scaling récursif (`ENDGAME_SCALING`)
  s'applique `n` fois — coût CPU au changement d'étage (pic, pas continu).
- **Cache d'étages** (`floorDungeons` / `_saveFloorToCache`) : croît avec
  l'exploration → empreinte mémoire qui monte sur longue session (fuite douce
  si jamais purgé).
- Re-seed déterministe des PNJ aléatoires à chaque `getNpcsForFloor` (recalcul
  vs mémoïsation).

**💡 Solutions priorisées**
1. **Plafonner le cache d'étages** (LRU, ex. 5 derniers étages visités) :
   purger les plus anciens, l'étage se régénère au retour. Borne la mémoire sur
   session longue. *(P2)*
2. **Mémoïser `getNpcsForFloor(floor)`** par étage courant (invalidé au
   changement d'étage). *(P3)*
3. **Profiler `generateDungeon` au changement d'étage** (DevTools Performance) :
   confirmer que le pic < 1 frame budget perçu ; sinon découper la génération
   (cellules → spawns) sur 2 ticks. *(P3, seulement si mesuré coûteux)*

**Impact attendu** : pas de montée mémoire en partie longue / Boucle, descente
fluide.

## 1.3 Combat & calculs lourds

**⚠️ Problèmes probables**
- `recalculateStats()` consommé par ~13 modules, rappelé à chaque équipement /
  level-up : itère slots × stats × set Maison × rework D1-D5. Pas chaud par
  appel, mais à ne pas rappeler en boucle inutilement.
- `renderEnemyGroup()` / log combat reconstruisent du DOM via `innerHTML` à
  chaque tour (jusqu'à 5 ennemis + timeline + log).
- Particules `combat-fx` + dégâts flottants `UX.floatDmg` : création/destruction
  d'éléments DOM par coup.

**💡 Solutions priorisées**
1. **Append au lieu de réécrire le log** : `UX.logCombat` doit `appendChild`
   une ligne, pas réassigner `#combat-timeline-log.innerHTML +=` (qui re-parse
   tout). *(P2 — vérifier l'implémentation actuelle)*
2. **Réutiliser les cartes ennemies** : ne reconstruire `#enemy-group` qu'au
   changement de composition du groupe ; sinon muter texte/barres en place.
   *(P2)*
3. **Pool d'éléments flottants** (object pooling) pour `floatDmg`/particules :
   recycler N nœuds plutôt que create/remove. *(P3)*
4. **Borne de garde-fou** : ne pas rappeler `recalculateStats()` plus d'une fois
   par transaction d'équipement (audit des call-sites). *(P3)*

**Impact attendu** : combats longs (Boucle, groupes 4-5) sans saccade, GC mobile
réduit.

## 1.4 UI / DOM & rendu

**⚠️ Problèmes probables**
- **154 `innerHTML`** : reconstructions complètes de modales (inventaire 16
  slots, fiche perso paper-doll, Codex, bestiaire) à chaque ouverture.
- **Deux boucles `setInterval` redessinant `drawDungeon()` complet** (§0) — le
  coût dominant hors combat sur mobile.
- Reflows : tooltips riches, accordéon mobile, barres HP/PM mises à jour
  fréquemment.

**💡 Solutions priorisées**
1. **Fusionner / espacer les boucles de redraw ambiant** *(P1, fort impact
   batterie)* :
   - Une **seule** boucle de tick à `requestAnimationFrame` + throttle (cap ~12
     FPS) au lieu de 2 `setInterval` indépendants qui peuvent empiler des
     `drawDungeon()`.
   - **Pause sur `document.hidden`** (Page Visibility) : stopper le tick quand
     l'onglet est en arrière-plan (gros gain batterie mobile).
   - Optionnel : dessiner les FX torche/halo sur un **canvas overlay** léger
     plutôt que redessiner toute la scène pseudo-3D.
2. **`requestAnimationFrame` pour les updates HUD** groupés (batcher
   `updateUI`). *(P3)*
3. **Cibler les `innerHTML` chauds** (log combat, barres) vers du DOM muté en
   place ; laisser les modales rares (Codex, bestiaire) telles quelles. *(P2)*

**Impact attendu** : -50 à -80 % de redraws hors combat, batterie mobile
préservée, UI réactive.

## 1.5 Mobile & contraintes GitHub Pages

**⚠️ Problèmes probables**
- **45 Mo d'images** : SWR (stale-while-revalidate) télécharge à l'usage, mais
  un joueur qui explore beaucoup tire ~17 Mo de monstres + portraits sur data
  mobile.
- **rosmerta/mundungus à 1,5 Mo** : un seul dialogue = +3 Mo data.
- **Doublon `img/houses/` vs `img/houses/v2/`** : ~3 Mo potentiellement morts si
  v1 n'est plus référencé (à vérifier).
- Planches `_ingame.png` / `_mobile_bar.png` / `_phase1_ingame.png` (~1,4 Mo) :
  référencées **seulement** dans `hall-of-fame.js` d'après le grep — confirmer
  si ce sont des assets de doc/montage non nécessaires en prod.
- GitHub Pages : limite **souple 1 Go** de repo, **100 Go/mois** de bande
  passante, fichiers ≤ 100 Mo. À 256 Mo on est loin du mur, mais le `.git`
  gonfle avec les regen d'assets binaires (chaque version d'un PNG reste dans
  l'historique).

**💡 Solutions priorisées**
1. **Quantifier/compresser tout `img/`** (`pngquant --quality 65-85` + `oxipng -o4`)
   *(P1, le plus gros levier global)* : ~45 Mo → estimé **~20-25 Mo**. Script
   `tools/optimize_images.py` idempotent, vérif visuelle sur échantillon.
2. **Redimensionner les portraits surdimensionnés** *(P1, trivial)* :
   rosmerta/mundungus → 512×512 max (cohérent avec les autres portraits) →
   ~1,5 Mo → ~80 Ko chacun.
3. **Purger les planches de montage** `_ingame*/_mobile_bar` si non requises en
   runtime *(P1, après confirmation)* — ~1,4 Mo.
4. **Supprimer le doublon `houses/v2`** ou `houses/` selon le registre réellement
   consommé *(P1, après confirmation grep)*.
5. **Variante WebP** des gros assets avec fallback PNG (`<picture>` ou détection)
   *(P3, gain ~25-35 % supplémentaire mais touche les call-sites)*.
6. **`<img loading="lazy">`** sur les portraits de dialogue / bestiaire hors
   viewport *(P2)*.

**Impact attendu** : data mobile divisée par ~2, repo allégé, marges GitHub
Pages confortables, dialogues PNJ instantanés.

---

# ÉTAPE 2 — Plan d'implémentation & stabilisation

## Priorité 1 — Critique (jouabilité / chargement / batterie)

| # | Tâche | Technique | Difficulté | Mesure |
|---|-------|-----------|------------|--------|
| P1-1 | **Compression globale `img/`** | `pngquant` + `oxipng` via `tools/optimize_images.py` | Moyenne | `du -sh img` avant/après ; diff visuel échantillon ; smoke vert |
| P1-2 | **Redimensionner rosmerta/mundungus** (+ scan > 600 Ko) | Lanczos → 512² | Triviale | Poids fichier ; portrait net en jeu |
| P1-3 | **Purger planches montage `_ingame*`/`_mobile_bar`** (après confirmation non-runtime) | `git rm` | Triviale | grep 0 référence ; smoke vert |
| P1-4 | **Dédoublonner `houses/` vs `houses/v2/`** | grep registre → supprimer l'inutilisé | Triviale | grep ; blasons OK en jeu |
| P1-5 | **Fusionner les 2 boucles redraw → 1 tick rAF + pause `document.hidden`** | Page Visibility API, throttle 12 FPS | Moyenne | DevTools Performance : FPS/CPU hors combat, onglet caché = 0 redraw |
| P1-6 | **SW : `addAll` tolérant aux 404** | `Promise.allSettled` / `cache.add` individuel | Faible | `pwa-smoke.js` ; install OK avec 1 URL morte simulée |
| P1-7 | **Compresser title.jpg/title_icon.jpg + `rel=preload`** | mozjpeg q78 | Triviale | Lighthouse LCP |

> **Ordre P1** : P1-2 → P1-3 → P1-4 (gains rapides, peu risqués) → P1-1
> (gros lot, vérif visuelle) → P1-7 → P1-5 (code runtime, smoke) → P1-6.
> Chaque lot d'assets = **bump cache PWA** uniquement si un **CSS/JS** change
> (les images ne sont pas dans `PRECACHE_URLS`, servies en SWR — pas de bump
> requis pour P1-1..P1-4/P1-7, mais P1-5/P1-6 touchent du JS → `cache-bump`).

## Priorité 2 — Importante (confort)

| # | Tâche | Technique | Difficulté | Mesure |
|---|-------|-----------|------------|--------|
| P2-1 | **Log combat en append** (pas de réécriture innerHTML) | `appendChild` + cap N lignes | Faible | Profiler tour de combat long |
| P2-2 | **Réutiliser les cartes ennemies** (mutation en place) | diff de composition de groupe | Moyenne | Combat 5 ennemis fluide |
| P2-3 | **Cache d'étages LRU (cap ~5)** | éviction `floorDungeons` | Moyenne | `performance.memory` après 15 descentes |
| P2-4 | **`loading="lazy"` portraits/bestiaire hors-écran** | attribut HTML | Triviale | Requêtes réseau réduites |
| P2-5 | **Concat JS au déploiement (97 → ~8 bundles)** | script Node concat en CI, sources intacts | Élevée | Nb requêtes ; temps de chargement froid |

> P2-5 est le plus structurant (touche `index.html` + pipeline `deploy.yml`) :
> à **valider explicitement** avant exécution — risque de régression d'ordre de
> chargement. Alternative moins risquée : conserver 97 fichiers (HTTP/2 les
> multiplexe) et ne faire P2-5 que si Lighthouse montre un gain net.

## Priorité 3 — Amélioration (polish)

| # | Tâche | Technique | Difficulté |
|---|-------|-----------|------------|
| P3-1 | Object pooling `floatDmg`/particules | recyclage de nœuds | Moyenne |
| P3-2 | Variantes WebP gros assets + fallback PNG | `<picture>` / détection | Moyenne |
| P3-3 | Mémoïsation `getNpcsForFloor` | cache invalidé au changement d'étage | Faible |
| P3-4 | Batch `updateUI` via rAF | coalescing | Faible |
| P3-5 | Audit double-appels `recalculateStats` | revue call-sites | Faible |

---

## Checklist de tests de performance

Scénarios à mesurer **avant/après** (Chrome DevTools + Lighthouse mobile,
throttling « Slow 4G » + CPU 4× slowdown) :

- [ ] **Premier chargement froid** (cache vidé) : LCP, Time-to-Interactive,
      poids transféré. Cible **< 5-6 s** sur profil mobile médian.
- [ ] **Rechargement (SW chaud)** : doit être quasi instantané (offline OK).
- [ ] **10 étages d'affilée** : pas de montée mémoire continue
      (`performance.memory.usedJSHeapSize` stable après GC), pic de génération
      < budget de frame perçu.
- [ ] **Combat long** (5 ennemis, ~20 tours, sorts + artefacts + statuts) :
      FPS stable, pas de jank croissant, log borné.
- [ ] **Boucle Ténébreuse profonde** (étage 25-30) : scaling récursif sans gel.
- [ ] **Hors combat / exploration** : CPU au repos faible (boucle redraw
      throttlée), **0 redraw onglet en arrière-plan**.
- [ ] **Mobile réel** (Android médian) : pas de surchauffe/drain sur 15 min,
      dialogues PNJ instantanés (portraits compressés).
- [ ] **Régression fonctionnelle** : `node tests/units.js` + `node tests/smoke.js`
      + `node tests/pwa-smoke.js` verts à chaque lot.

## Monitoring futur (logs de perf in-game)

S'appuyer sur l'infra **`BalanceLog`** existante (opt-in, local, anonyme — `js/balance-log.js`),
en réutilisant le même modèle (no-op tant que `localStorage` flag absent,
aucune collecte réseau) :

- Hook léger `perfMark(label)` autour de `generateDungeon`, `startBattle`,
  `recalculateStats`, changement d'étage → `performance.now()` deltas accumulés.
- Compteur de redraws/seconde (sanity check des boucles FX).
- Échantillon `performance.memory` (Chromium only) au changement d'étage pour
  détecter une fuite.
- Export presse-papiers JSON (comme `BalanceLog.export()`), **jamais** d'envoi
  automatique.

## Réduire la taille du build

- **Compression `img/`** (P1-1..P1-4) : ~45 Mo → ~20-25 Mo (levier principal).
- **Audio** : 193 OGG / 17 Mo — vérifier le bitrate (ré-encoder en ~96 kbps
  mono pour les boucles d'ambiance si > nécessaire). *(hors P1, gain ~30-40 %)*
- **`.git` gonflé par les regen binaires** : envisager `git gc --aggressive` ;
  un `git filter-repo` pour purger les anciennes versions d'assets est **lourd
  et réécrit l'historique** → uniquement si la taille `.git` devient bloquante,
  et avec accord explicite (réécriture = force-push, casse les clones).
- Pas de minification JS requise (gzip GitHub Pages fait l'essentiel ; la
  concat P2-5 est le vrai levier réseau).

---

## Objectifs de sortie (definition of done)

- [ ] Chargement initial froid mobile **< 5-6 s** (Lighthouse).
- [ ] FPS stable hors combat et en combat long / Boucle profonde.
- [ ] Aucune montée mémoire sur session de 10+ étages.
- [ ] `img/` réduit d'au moins **40 %** sans perte visuelle perceptible.
- [ ] Offline robuste (install SW tolérante).
- [ ] Suites `units` + `smoke` + `pwa-smoke` vertes.
- [ ] Cache PWA bumpé pour tout lot touchant CSS/JS (skill `cache-bump`).

---

## Journal d'avancement

- **2026-06-22** — Plan créé. Diagnostic mesuré (baseline §0). Aucune
  implémentation encore : ce document est livré seul pour validation des
  priorités avant exécution.
- _(à compléter à chaque lot : mesure avant/après, écarts, décisions)_
