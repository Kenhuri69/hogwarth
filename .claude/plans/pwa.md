# Plan PWA — Hogwarth

> **Périmètre** : transformer le jeu en Progressive Web App installable et
> jouable hors-ligne, **sans build step ni dépendance npm** (cf. CLAUDE.md
> ligne 6 : *Vanilla JS / HTML5 Canvas, zéro dépendance, zéro build step*).
>
> **Hors périmètre explicite** : refactoring ES6 modules, Vite, Workbox,
> ESLint/Prettier, lazy loading des scripts, restructuration `js/`. Si une
> de ces idées revient en cours de plan, elle sort dans un plan séparé.

---

## 1. État des lieux

| Élément | Valeur | Implication PWA |
|---------|--------|-----------------|
| Architecture | 41 fichiers JS chargés en `<script>` séquentiels | Aucun changement requis : le SW intercepte des `GET` HTTP, l'ordre de chargement reste inchangé. |
| Cache-busting | `?v=N` sur chaque CSS/JS dans `index.html` | À conserver. Le SW utilise la `Request.url` complète comme clé, donc bumper `?v=N` invalide naturellement l'entrée de cache. |
| Sauvegarde | `localStorage` (clés `hogwarts_rpg_saves`, `hogwarts_rpg_save`) | Aucune migration. localStorage fonctionne hors-ligne nativement. |
| Assets statiques | `img/` 30 Mo · `audio/` 12 Mo · `js/css` ~1 Mo | **Ne PAS précacher les 42 Mo**. Stratégie hybride (cf. §3). |
| Déploiement | GitHub Pages depuis `master`, sous-chemin `/hogwarth/` | Chemins **relatifs** obligatoires dans manifest et SW. |
| Smoke test | `node tests/smoke.js`, charge `file://…/index.html` | Les SW sont désactivés en `file://`. La validation PWA aura son propre script qui démarre un serveur HTTP éphémère. |

---

## 2. Étapes

### Étape 1 — Manifest + métadonnées HTML
**Livrable :** `manifest.json` à la racine, `<link>`/`<meta>` PWA dans `index.html`.

- Créer `manifest.json` avec :
  - `name`, `short_name`, `description`
  - `start_url: "./"` (relatif, fonctionne sur GitHub Pages sous-chemin)
  - `scope: "./"`
  - `display: "standalone"`
  - `orientation: "any"` (le jeu supporte portrait et paysage — vérifié dans `css/style.css`)
  - `background_color: "#1a0f06"` (couleur parchemin sombre du thème)
  - `theme_color: "#c9a84c"` (or du thème)
  - `lang: "fr"`
  - `icons: [192, 512, 192-maskable, 512-maskable]`
- Ajouter dans `<head>` de `index.html` :
  - `<link rel="manifest" href="manifest.json?v=1">`
  - `<meta name="theme-color" content="#c9a84c">`
  - `<link rel="apple-touch-icon" href="img/icons/pwa/apple-touch-icon.png">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`

**Vérification :**
- `python3 -m http.server 8000` puis Chrome DevTools → Application → Manifest : aucun warning, icônes visibles.
- Lighthouse (mode Mobile) → catégorie PWA-Installable : ✅.

### Étape 2 — Icônes PWA
**Livrable :** 4 PNG dans `img/icons/pwa/`.

- `icon-192.png` (192×192, padding interne ~10 % pour Android)
- `icon-512.png` (512×512, idem)
- `icon-192-maskable.png` (192×192, **safe zone 80 %** centrale — purpose `maskable` exige du contenu jusqu'aux bords mais lisible dans un cercle/squircle)
- `apple-touch-icon.png` (180×180, fond opaque obligatoire iOS)

**Production :** ajouter une recette dans `tools/icon_factory.py` (ou script ad-hoc `tools/gen_pwa_icons.py` si le pipeline painterly est inadapté à un logo plein écran). Source visuelle : blason composite ou logo « Poudlard & Magie ». Décision sur la source visuelle = première question à trancher en cours de Step 2 — par défaut, reprendre le visuel `img/scenes/title.jpg` centré + cartouche or.

**Vérification :**
- DevTools → Application → Manifest affiche les 4 icônes sans erreur.
- Test maskable via https://maskable.app/editor (en local : ouvrir le PNG, ajuster crop circulaire → rien d'important coupé).

### Étape 3 — Service Worker
**Livrable :** `sw.js` à la racine.

Stratégie :

| Type de ressource | Stratégie | Justification |
|-------------------|-----------|---------------|
| `index.html` | **Network-First** (timeout 3 s → fallback cache) | L'HTML porte les `?v=N` qui invalident le reste — toujours préférer la version fraîche en ligne. |
| `js/`, `css/` (URL contient `?v=`) | **Cache-First** | Cache-busted côté URL : si `?v=N` change, c'est une nouvelle entrée de cache. Pas de risque de servir un fichier périmé. |
| `img/`, `audio/`, fonts | **Stale-While-Revalidate** + cache à la demande | 42 Mo : on ne précache pas tout. Premier accès = réseau + mise en cache ; ensuite cache servi instantanément, refresh en arrière-plan. |
| Réponses opaques (CDN fonts) | passthrough sans cache | Évite de polluer le cache. |

Précache **minimal** au `install` (~1 Mo) :
- `./`, `./index.html`, `./manifest.json`
- Tous les CSS référencés dans `<head>`
- Tous les JS référencés via `<script src="js/...">`
- Les 4 icônes PWA
- `img/scenes/title.jpg` (premier écran)

Tout le reste est mis en cache **on-demand** au premier accès.

Gestion de version :
- `const CACHE_VERSION = 'hogwarth-v1';` (incrémenter à chaque release)
- `activate` : supprimer les anciennes caches dont le nom ne match pas `CACHE_VERSION`.
- `self.skipWaiting()` + `clients.claim()` après confirmation utilisateur (cf. Étape 4).

**Vérification :**
- DevTools → Application → Service Workers : SW « activated and running ».
- Onglet Network → cocher « Offline » → reload : le jeu démarre, l'écran titre s'affiche, on peut entrer dans une partie sauvegardée.
- Cache Storage contient `hogwarth-v1` avec les ~30 entrées précachées.

### Étape 4 — Enregistrement + UX de mise à jour
**Livrable :** modifs dans `index.html` (bloc `<script>` inline existant lignes ~921+) ou nouveau `js/pwa.js`.

- Enregistrer le SW au `load` (pas au `DOMContentLoaded` — éviter de retarder le first paint) :
  ```js
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=1')
        .then(reg => { /* hook update */ })
        .catch(() => { /* silencieux : la PWA est dégradable */ });
    });
  }
  ```
- Détecter `reg.waiting` → afficher un bandeau discret en bas d'écran :
  *« Nouvelle version disponible — [Rafraîchir] »*. Click → `reg.waiting.postMessage({type:'SKIP_WAITING'})` puis `location.reload()`.
- Bandeau réutilise le style du jeu (or sur parchemin) — utiliser une classe `.pwa-update-banner` ajoutée à `css/style.css`.

**Vérification :**
- Modifier `CACHE_VERSION` dans `sw.js`, recharger (offline ou online), vérifier que le bandeau apparaît, click → recharge propre, plus de bandeau.

### Étape 5 — Pipeline de déploiement
**Livrable :** `.github/workflows/deploy.yml` mis à jour.

Le workflow actuel copie sélectivement `index.html`, CSS, JS, IMG, AUDIO. **Ajouter** au step « Préparer le bundle Pages » :

```yaml
cp manifest.json _site/
cp sw.js _site/
# Les icônes PWA sont dans img/icons/pwa/ donc déjà couvertes par `cp -r img`.
```

**Vérification :**
- Pousser sur la branche, lire les logs du workflow : la ligne `du -sh _site _site/*` doit lister `manifest.json` et `sw.js`.
- Une fois déployé : https://kenhuri69.github.io/hogwarth/sw.js accessible (200), https://kenhuri69.github.io/hogwarth/manifest.json idem.

### Étape 6 — Test headless PWA (nouveau scénario)
**Livrable :** `tests/pwa-smoke.js` (nouveau, indépendant de `smoke.js`).

Pourquoi un fichier séparé : `smoke.js` utilise `file://`, les SW y sont inaccessibles. `pwa-smoke.js` démarre un mini serveur HTTP, fait charger la page deux fois, et teste l'offline.

```
1. Démarrer un serveur HTTP local sur la racine du repo (port 0 = aléatoire).
2. Lancer Chromium headless, naviguer vers http://localhost:<port>/.
3. Attendre que SW soit « activated ». Vérifier que les ~30 entrées précachées sont bien dans Cache Storage.
4. Recharger en mode offline (`page.context().setOffline(true)`).
5. Vérifier que la page se charge, que `window.startGame` est défini, que `#title-screen` est visible.
6. Cleanup serveur + browser.
```

Ajouter une ligne dans `tests/README.md` ou en commentaire en tête de `pwa-smoke.js` : *« À lancer en plus de `smoke.js`. Nécessite que les SW soient activés (donc HTTP, pas `file://`). »*

**Vérification :** `node tests/pwa-smoke.js` retourne code 0.

### Étape 7 — Doc & loader
**Livrable :** entrée dans CLAUDE.md (section dédiée PWA).

- Ajouter une section « ## PWA & cache offline » dans `CLAUDE.md` qui décrit :
  - les 3 fichiers clés (`manifest.json`, `sw.js`, bloc d'enregistrement)
  - la stratégie de cache résumée en tableau
  - comment bump la version (`CACHE_VERSION` dans `sw.js`)
  - la commande de test (`node tests/pwa-smoke.js`)
- **Aucune entrée à ajouter dans `loader.js`** : le SW n'expose pas de globals attendus par le runtime du jeu (failure-safe par design).

---

## 3. Décisions à trancher avant Step 2

| # | Question | Default proposé |
|---|----------|-----------------|
| D1 | Source visuelle des icônes PWA | Centre de `img/scenes/title.jpg` + cartouche or autour |
| D2 | Logo « Poudlard & Magie » vectoriel disponible ? | Non — on génère depuis le raster |
| D3 | Bandeau de mise à jour : auto-reload après X secondes ? | Non — manuel uniquement. Auto-reload = perte de progression en plein combat. |
| D4 | `orientation` dans manifest | `"any"` (jeu jouable portrait + paysage) |
| D5 | Périmètre offline : tout sauf Hall of Fame Supabase ? | Oui — `hall-of-fame.js` a déjà un repli `localStorage` (cf. CLAUDE.md). Aucun changement code requis. |

**À questionner à l'utilisateur en début de Step 2** (avant de générer les icônes) si D1/D2 sont incertaines.

---

## 4. Risques identifiés

| Risque | Mitigation |
|--------|------------|
| Cache empoisonné par un `sw.js` bugué | Toujours bump `CACHE_VERSION` ET `sw.js?v=N`. Garder une route d'évasion : ouvrir DevTools → Application → « Unregister » résout tout. |
| 42 Mo d'assets cachés sur mobile cellulaire | Précache minimal (~1 Mo), reste en cache-on-demand. L'utilisateur télécharge ce qu'il utilise. |
| iOS Safari quirks (purpose maskable ignoré, `start_url` strict) | Tester sur Safari iOS réel après déploiement. `apple-touch-icon` fallback déjà prévu. |
| Bandeau « nouvelle version » en plein combat | Bandeau discret en bas, dismissible. Pas d'auto-reload. |
| Smoke test `file://` cassé par les ajouts | `pwa-smoke.js` séparé. `smoke.js` reste inchangé — la PWA est progressive, le jeu fonctionne sans SW. |

---

## 5. Critères d'acceptation finaux

- [ ] Lighthouse Mobile → PWA Installable : ✅
- [ ] Lighthouse Mobile → catégorie Performance non dégradée (±5 % du baseline)
- [ ] Chrome DevTools → Application → Manifest : aucun warning
- [ ] Chrome DevTools → Application → Service Workers : « activated and running »
- [ ] Offline reload : le jeu charge, un slot sauvegardé est chargeable, on peut combattre
- [ ] `node tests/smoke.js` : toujours vert (zéro régression)
- [ ] `node tests/pwa-smoke.js` : vert
- [ ] Installation sur Android (Chrome) : icône home, ouverture en `standalone`, pas de barre URL
- [ ] Installation sur iOS (Safari → Partager → Sur l'écran d'accueil) : icône correcte, ouverture sans Safari chrome
- [ ] Bandeau de mise à jour testé manuellement (bump `CACHE_VERSION`)
- [ ] Doc PWA ajoutée dans CLAUDE.md

---

## 6. Planning estimé

| Étape | Effort | Bloqueur |
|-------|--------|----------|
| 1. Manifest + meta | 1 h | — |
| 2. Icônes (4 PNG) | 2-3 h | D1/D2 à trancher |
| 3. Service Worker | 3-4 h | — |
| 4. Enregistrement + bandeau | 1-2 h | Étape 3 |
| 5. Workflow deploy | 30 min | Étape 1+3 |
| 6. Test pwa-smoke | 2 h | Étape 3+4 |
| 7. Doc CLAUDE.md | 30 min | Tout |
| **Total** | **~2 jours** | |

Pas d'effort de 4-6 jours comme dans le plan initial — pas de Workbox, pas de build, pas de migration.

---

## 7. Suivi

- [x] Étape 1 — Manifest + meta (`manifest.json` + `<head>` enrichi)
- [x] Étape 2 — Icônes (5 PNG dans `img/icons/pwa/`, générées par `tools/gen_pwa_icons.py`)
- [x] Étape 3 — Service Worker (`sw.js`, 58 entrées précachées)
- [x] Étape 4 — Enregistrement + bandeau (`js/pwa.js` + `css/pwa.css`)
- [x] Étape 5 — Pipeline deploy (`.github/workflows/deploy.yml` copie manifest + sw)
- [x] Étape 6 — Test pwa-smoke.js (3 scénarios verts : manifest / SW install / offline reload)
- [x] Étape 7 — Doc CLAUDE.md (section « PWA & cache offline » ajoutée)

### Écarts vs plan initial

- **5 icônes au lieu de 4** : ajout de `icon-512-maskable.png`
  (certaines plateformes préfèrent la haute résolution pour maskable).
  Coût marginal (~227 ko).
- **Étape 6 – polling explicite** : le `waitForFunction` async de
  Playwright n'attend pas correctement la résolution de la promesse
  retournée (toute Promise est truthy). Helper `waitForActivatedSw`
  remplace par un polling 250 ms.
- **Critères §5 non encore validés** : Lighthouse, install Android/iOS
  réelle, bump `CACHE_VERSION` manuel. À vérifier après merge + déploiement.

### Critères restant à valider hors-CI

Ces points ne sont pas couverts par le smoke test headless — à vérifier
manuellement après déploiement de la branche sur Pages :

- [ ] Lighthouse Mobile → PWA Installable : ✅
- [ ] Lighthouse Mobile → Performance ±5 % du baseline
- [ ] Installation Android (Chrome) : icône home, ouverture standalone
- [ ] Installation iOS (Safari → Sur l'écran d'accueil) : icône, ouverture sans Safari chrome
- [ ] Bandeau de mise à jour manuel : bump `CACHE_VERSION`, recharger, vérifier l'apparition + reload propre
