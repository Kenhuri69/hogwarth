# Plan — Refonte UX Personnage v2 (cible RPG mobile fidèle)

> Ce plan **succède** à `.claude/plans/character-ux-refonte.md` (qui livrait
> Iter A + B en PR #57, mergée). Le retour utilisateur sur la version
> intégrée révèle des écarts importants par rapport à la capture cible.
> v2 reprend la refonte avec un cadrage strict de la cible.

Branche dédiée : à créer (`claude/character-ux-v2`).

**Statut global** : Étape 0 livrée (mockup) — en attente validation utilisateur avant intégration.

---

## 0. Spec gelée (briefings utilisateur, 2026-05-10)

Précisions formelles fournies par l'utilisateur après audit visuel de la
PR #57, à ne PAS dévier sans nouvelle décision explicite :

1. **Layout 3 colonnes desktop** — tailles ajustées pour que tout s'affiche
   dans la modale (max-width 720 px), pas de débordement.
2. **Mobile en accordéon** — chacune des 3 zones (Stats / Paper doll /
   Sorts) est pliable / dépliable via un chevron. Tous dépliés au départ.
   Pas de stack vertical à 1 colonne fragmenté.
3. **Slots équipement uniformes** — fond noir comme `.inv-slot`
   (`#0a0705`). La rareté change la **bordure**, pas le fond. Plus de
   mélange marron/noir incohérent.
4. **Personnage placé plus bas** — superposé sur le slot belt en bas du
   paper doll. Effet visuel : le perso domine la scène, ses bras / hanches
   chevauchent le slot belt.
5. **Inventaire intégré** dans la même modale (grille 8×4 sous les 3
   colonnes). Fusion à terme de `#inventory-modal`.
6. **Cadres or ornementés** sur les bords de la modale (cohérence avec la
   capture cible).
7. **Header sticky** — titre + onglets Harry/Hermione + bouton ✕ toujours
   visibles, même en scroll. Critique en mobile.
8. **Tooltip détail au survol** — slot équipé doit révéler le détail de
   l'item (nom, rareté, bonus, lore). Cliquable pour déséquiper (V2.1).
9. **Stats base + bonus séparés** — afficher la valeur de base ET le bonus
   apporté par l'équipement (ex: « Attaque 8 **+4** » avec le bonus en
   couleur or-light). Permet à l'utilisateur de comprendre l'apport net
   de chaque pièce.

## 1. Mockup HTML autonome — Étape 0

### 1.1 Livrable
- [x] **0.1** `tools/mockup_character_v2.html` créé : reproduction fidèle
  des 9 points de la spec ci-dessus, avec données fictives (Harry niveau
  8, équipement varié des 3 raretés, sorts représentatifs).
- [x] **0.2** Utilise les vrais assets du jeu (`img/harry.png`,
  `img/icons/items/*.png`) — fallback `onerror` sur les icônes génériques
  pour les items absents en PNG.
- [x] **0.3** CSS et JS inline, autonome, ouvrable directement dans un
  navigateur sans serveur.

### 1.2 Validation
- [ ] **0.V** Capture screenshot desktop + mobile via Playwright headless.
- [ ] **0.U** Validation utilisateur : « OK go » ou ajustements demandés.
  → **Bloque** l'étape 1.

## 2. Intégration au jeu — Étapes 1 à 6

> Ces étapes ne démarrent qu'après validation explicite de l'étape 0.

### Étape 1 — CSS de la modale
- [ ] **1.1** Refondre `#character-modal` + `.modal-box` pour adopter le
  style v2 : header sticky, cadres or ornementés (4 coins), 3 colonnes
  ajustées, max-width 720 px.
- [ ] **1.2** Nouvelles classes `.equip-slot` (uniforme noir, point 3),
  `.section-toggle` (chevron accordéon mobile), `.tooltip`,
  `.gold-banner` repositionné, `.inv-section` intégrée.
- [ ] **1.3** Repli mobile (≤ 720 px) : les 3 sections deviennent des
  accordéons via `.section-toggle`.

### Étape 2 — JS `openCharacter()` v2
- [ ] **2.1** HTML rendu en 3 colonnes + zone inventaire intégrée.
- [ ] **2.2** Helper `_renderStatLine(label, base, bonus)` pour la
  séparation base/bonus (point 9). Calcul : `bonus = c.atk - c._baseAtk`,
  etc.
- [ ] **2.3** Helper `_renderEquipSlotV2(slot, c)` — fond noir uniforme
  + bordure rareté + tooltip riche (nom + rareté + bonus + desc).
- [ ] **2.4** Header sticky avec titre + onglets + ✕ permanent.
- [ ] **2.5** Toggle accordéon JS sur `.section-toggle`.

### Étape 3 — Fusion inventaire
- [ ] **3.1** Bouton 🎒 Sac → ouvre `#character-modal` et scroll jusqu'à
  la section inventaire.
- [ ] **3.2** Modifier `openInventory()` pour rediriger vers
  `openCharacter()` ou bien garder un mode standalone (à décider).
- [ ] **3.3** Garde-fou : en combat (`battleMode=true`),
  `openInventory()` reste sur l'ancienne modale `#inventory-modal`
  (le contexte combat ne doit pas afficher la fiche perso complète).

### Étape 4 — Tooltip détail
- [ ] **4.1** Tooltip riche : nom, rareté (label + couleur), liste de
  bonus formatés (`+4 Attaque`, `+5 Défense`), description / lore item.
- [ ] **4.2** Position calculée pour ne pas déborder du paper doll
  (right/left selon le slot).
- [ ] **4.3** Mobile : tap sur slot équipé = ouverture du tooltip
  cliquable (pas de hover natif).

### Étape 5 — Stats base + bonus
- [ ] **5.1** `recalculateStats()` expose déjà `c._baseAtk` etc. Le
  rendu calcule `bonus = c.atk - c._baseAtk` à l'affichage.
- [ ] **5.2** Format : `<base> <span class="stat-bonus">+<bonus></span>`
  si bonus > 0. Sinon afficher seulement `<base>`.
- [ ] **5.3** Couleur bonus : `var(--gold-light)` pour signaler
  l'apport de l'équipement.

### Étape 6 — Vérifications
- [ ] **6.1** `node tests/smoke.js` — 32+ scénarios verts.
- [ ] **6.2** Adapter scénario 22 T6 si la structure DOM change.
- [ ] **6.3** Captures Playwright desktop + tablette + mobile dans
  `tests/character-v2-{desktop,tablet,mobile}.png`.
- [ ] **6.4** Validation visuelle utilisateur (ou itération).
- [ ] **6.5** Cache-bust : `style.css`, `ui.js`, `inventory.js`.
- [ ] **6.6** Doc `CLAUDE.md` : section « Modale Personnage »
  mise à jour (3 colonnes, accordéon mobile, inventaire intégré,
  tooltip).

## 3. Hors-scope V2

- Click-to-unequip depuis le paper doll (V2.1).
- Click-to-equip depuis l'inventaire intégré directement vers le slot
  cible (drag-and-drop ou tap-tap).
- Bonus crit/dodge sur l'équipement (préparé V2 mais aucun item ne les
  porte).
- Animation accordéon (transition height) — fonctionnel mais pas animé
  en V2.

## 4. Critères de réussite globaux

1. La modale ressemble à la capture cible (3 colonnes, perso central
   superposé sur slot belt, cadres or, inventaire intégré).
2. Mobile : 3 accordéons utilisables au tap, ✕ toujours accessible.
3. Slots tous fond noir uniforme avec bordure d'état.
4. Tooltip révèle le détail au survol (desktop) ou tap (mobile).
5. Stats base + bonus séparés visuellement.
6. Smoke vert.

## 5. Journal

| Date | Étape | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-10 | Spec gelée | ✅ | Briefings utilisateur capturés (9 points). |
| 2026-05-10 | Étape 0 — mockup HTML v1 | ✅ | `tools/mockup_character_v2.html` créé, autonome, basé sur les vrais assets. Validation utilisateur attendue avant étape 1. |
| 2026-05-10 | Auto-review mockup v1 | ⚠️ | 12 écarts identifiés vs cible (A1–A12). A1 décidé : garder buste, adapter layout. Refonte mockup en v2.1 nécessaire. |
| 2026-05-10 | Étape 0.1 — corrections A2–A12 | 🔄 | En cours. |

---

## Annexe — Auto-review mockup v1 (écarts)

| Code | Écart | Action v2.1 |
|------|-------|------------|
| A1 | Personnage en buste (asset `harry.png`) au lieu de pied | **Décision utilisateur** : garder buste, élargir paper doll en hauteur, slots plus serrés |
| A2 | Stats utilisent emojis natifs (❤️ 🔵 ⚔️) au lieu des PNG `img/icons/*.png` | Remplacer par `<img src="../img/icons/hp.png">` etc. |
| A3 | Slots vides répètent `accessory.png` partout | Utiliser une icône distinctive par slot type (emoji visible si pas d'asset PNG dédié) |
| A4 | Cadres or = 4 simples équerres CSS | Cadres ornementés via SVG inline (rinceaux, motifs) ou unicode décoratifs |
| A5 | Inventaire 32 slots (16 + 12 verrouillés) | Réduire à `MAX_INVENTORY=16` conforme au jeu |
| A6 | Panneau Sorts à droite (absent de la cible) | Repenser : 2 colonnes (Stats + Paper doll élargi) + zone Sortilèges en bas |
| A7 | Bandeau Or en débordement sous le paper doll | Intégrer dans le paper doll (encart ovale centre-bas) |
| A8 | Titre "FICHE" plat | Typographie Cinzel ornée centrée avec séparateurs latéraux |
| A9 | Fond modale uniforme noir-brun | Subtile texture parchemin sur le panneau central |
| A10 | Mobile : perso superposé efface visuellement le slot belt | Réduire l'overlap mobile, perso légèrement remonté |
| A11 | Tooltip risque de déborder de la modale | Position JS calculée selon le slot + bord modale |
| A12 | Bonus "+4" couleur or-light trop discrète | Vert vif ou gras + plus gros |
