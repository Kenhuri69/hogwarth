# Revue des fonctionnalités & axes d'amélioration

> Statut : **revue + plan d'amélioration** livré le 2026-05-29.
> Branche : `claude/game-features-review-MaSWH`.
> Nature : document vivant (cf. guidelines §5). Aucune implémentation n'est
> faite ici — ce plan détaille **quoi** traiter, **pourquoi**, **où** (fichiers),
> et **comment vérifier**. Les chantiers sont à activer un par un.

---

## 0. Méthode & périmètre

Revue fondée sur l'**état réel du dépôt** (pas seulement CLAUDE.md), via lecture
ciblée des modules de combat, contenu, UX/UI et réseau, plus trois explorations
parallèles (combat/RPG, UX/mobile/a11y, multijoueur/portails) et vérifications
manuelles des affirmations contestables.

Cette revue est **complémentaire** de `.claude/plans/game-review-modularization.md`
(2026-05-28) qui couvrait la **dette technique / modularisation / tests**. Ici on
traite l'angle **joueur** : profondeur de jeu, contenu, UX, accessibilité, social.

### Photo chiffrée du contenu (2026-05-29)

| Mesure | Valeur |
|--------|--------|
| Modules JS | 52 fichiers, ~31 000 lignes (19 non documentés dans CLAUDE.md) |
| Monstres (`MONSTERS`) | 68 |
| Sorts (`SPELLS`) | 63 entrées (~47 « gameplay », le reste utilitaire/portail) |
| Items (`ITEMS`) | 76 (~29 équipables) |
| PNJ (`NPCS`) | 75 |
| Templates de quêtes (`QUEST_TEMPLATES`) | 46 |
| Énigmes (`RIDDLES`) | 8 |
| Difficultés | 4 + Ironman |
| Tests | `smoke.js` ~121 scénarios, ~1980 assertions |

### Vérifications de fait (corrections d'affirmations d'audit)

- ✅ **Audio de combat présent** : `playHit()` (battle.js:294, 550),
  `playSpellCast()` (battle.js:491 ; battle-spells.js:766, 802). L'affirmation
  « aucun son en combat » est **fausse**. Manque réel : un SFX dédié au **crit /
  faiblesse élémentaire** et au *float damage*.
- ✅ **Champ `ai` jamais consulté** : `grep` de `.ai` dans `battle.js` /
  `battle-spells.js` / `battle-ui.js` → **0 occurrence**. L'IA est déclarative-morte.
- ⚠️ **Legilimens** : coûte des PM par lancer et `legilimensCancelCharges` est
  remis à 0 en début de combat (battle.js:349) — donc **pas** « gratuit illimité »,
  mais spammable tant qu'il reste du PM (battle-spells.js:22-26, 516-523).

### Synthèse exécutive

Le jeu est **complet et jouable de bout en bout** (intro → 10 étages → boss →
boucle endgame 11-20) avec une quantité de contenu remarquable pour du vanilla JS
zéro-build. Le problème dominant n'est **pas** le manque de contenu mais un
**déséquilibre breadth/depth** : beaucoup de systèmes, profondeur ou finition
inégale. Le dev récent a poussé fort sur le **social/multijoueur** (jusqu'au stub)
pendant que des fondamentaux (IA de combat, onboarding, accessibilité) restent en
retrait.

**Priorité éditoriale recommandée : finir/polir l'existant avant d'ajouter du neuf.**

---

## 1. Forces à préserver (ne pas casser)

- Moteur de combat sain : mitigation DEF avec plancher 25 % (battle.js:15),
  9 statuts empilables/DoT, double-canal de crit (LCK physique / AGI sort),
  Garde + riposte (battle.js:288).
- Système élémentaire cohérent : 6 éléments, résist/faiblesse sur `spell.element`.
- Identité de Maison forte : passifs Apothéose réellement différenciés
  (Élan / lifesteal / -coût / Vigueur). **Meilleure mécanique du jeu.**
- Atmosphère : lore par monstre, dialogues, intro narrée + karaoké, rendu 3D.
- Hygiène technique : loader/manifeste (0 global manquant), ~1980 assertions smoke.

> Tout chantier ci-dessous doit **passer `node tests/smoke.js` au vert** (guidelines §7)
> et **ajouter un scénario** quand il introduit un comportement testable.

---

## 2. Faiblesses identifiées (récapitulatif priorisé)

| # | Axe | Sévérité | Constat | Référence |
|---|-----|----------|---------|-----------|
| F1 | Combat | 🔴 | Champ `ai` jamais lu → ennemis = random pondéré, aucun ciblage | battle-spells.js:7-18 |
| F2 | Combat | 🔴 | Boss = gros minions (pas de phase, taunt, adds, enrage) | monsters.js / battle.js |
| F3 | Combat | 🟠 | 68 monstres pour ~6 types d'effets → capacités clonées | monsters.js |
| F4 | Contenu | 🟠 | Consommables plats (+X PV/PM), aucun buff/trade-off | data.js (ITEMS) |
| F5 | Contenu | 🟠 | Loot intermédiaire rare ; pas de choix de build | data.js |
| F6 | Contenu | 🟠 | Forge/Bibliothèque monotones (un seul chemin d'upgrade) | forge.js:15-152, library.js:17-210 |
| F7 | Contenu | 🟡 | Pages de Grimoire / brassage = flavour inerte, hors boucle | potions.js, data.js |
| F8 | UX | 🟠 | ~5 écrans avant de jouer, pas de Quick Start | intro.js, main.js, save-ui.js |
| F9 | UX | 🟠 | Zéro tutoriel *en jeu* ; help-tour rejoué depuis l'étape 1 | help-tour.js |
| F10 | A11y | 🔴 | Contrastes WCAG en échec (labels stats, seuils, or-clair) | css/style.css (:root, .stat-item) |
| F11 | A11y | 🟠 | Pas de `:focus-visible`, canvas/D-pad sans ARIA, tooltips hover-only | css/style.css, index.html, ux-improvements.js |
| F12 | Mobile | 🟠 | Pas de `safe-area-inset`, pas de landscape, panneaux PV/minimap cachés | css/style.css @media |
| F13 | Social | 🟠 | Cheminette Inter-Mondes ~20-40 % (tables Supabase absentes) | visit-channel.js, portal-matchmaking.js, atelier-voyageur.js |
| F14 | Social | 🟡 | Verrou de Sang / Atelier = 0 % jouable (économie Essence absente) | atelier-voyageur.js |

---

## 3. Plan d'amélioration par lot

> Chaque lot est **indépendant et activable seul**. Format : objectif → tâches →
> fichiers → critères de vérification. Effort = ordre de grandeur (½j / 1j / 2j+).

---

### LOT A — Pack Accessibilité & Mobile (🔴 fort impact, faible effort, ~1-2j)

**Pourquoi en premier** : touche 100 % des joueurs (surtout mobile), risque de
régression faible, indépendant du gameplay.

**A1. Contraste WCAG AA (cible 4.5:1 texte courant, 3:1 gros texte)**
- Audit chiffré des paires problématiques signalées : labels de stats
  (`.stat-item .skey`), seuils de Maison (`.hd-tier-threshold`), texte or-clair
  sur bois foncé. **Re-mesurer** chaque ratio avant de recolorer (ne pas se fier
  aux estimations de l'audit).
- Ajuster les variables `:root` ou les classes ciblées dans `css/style.css`
  (zones ~1-30, ~320-330, ~3550+). Conserver le thème parchemin/or (assombrir le
  fond ou éclaircir le texte au cas par cas, pas de refonte de palette).
- **Vérif** : passer les paires recolorées dans un calcul de contraste (script
  ponctuel ou table manuelle) ≥ 4.5:1 ; screenshot desktop + mobile inchangé
  visuellement hormis lisibilité.

**A2. Navigation clavier & ARIA**
- Ajouter une règle globale `:focus-visible` dorée sur `.cmd-btn`, `.dpad-btn`,
  `.explorable-btn`, boutons de modale (`css/style.css`).
- `role="application"` + `aria-label` sur `#dungeon-canvas` (index.html).
- `aria-label` explicites + `tabindex` cohérent sur le D-pad.
- `role="tooltip"` / `aria-live` sur la bulle help-tour.
- **Vérif** : navigation Tab visible sur tous les boutons ; lecteur d'écran
  annonce le canvas. Smoke test reste vert.

**A3. Mobile robustesse**
- `env(safe-area-inset-*)` sur header/footer (notch iOS).
- Résumé compact PV/PM **toujours visible** en mobile (mini-cartes groupe en
  haut) plutôt que panneau gauche masqué.
- Vérifier le bouton minimap (`.mobile-map-btn`) : le rendre évident dans
  l'action-group, pas caché.
- Tooltips : fournir un équivalent **tap** (long-press ou tap dédié) pour les
  infos actuellement en `mouseover` (ux-improvements.js:180-246).
- (Optionnel, plus lourd) gestion landscape : éviter le `100vh` cassant.
- **Vérif** : tester en émulation 360×640 portrait + landscape ; PV/PM visibles
  en combat ; tooltips accessibles au doigt.

**A4. `prefers-reduced-motion` complet**
- Étendre la règle (actuellement quasi limitée au help-tour, css/style.css:~668)
  aux dégâts flottants / shake / flash de combat.
- **Vérif** : avec reduced-motion activé, plus d'animations de secousse.

---

### LOT B — Profondeur de combat : IA & boss (🔴 fort impact, effort moyen, ~2-3j)

**Pourquoi** : meilleur ratio impact/ressenti du projet. L'infrastructure
(`ai`, `abilities`, statuts) existe déjà — il s'agit surtout de **brancher** et
d'**enrichir**, pas de réécrire le moteur.

**B1. Activer le champ `ai` (existant, inexploité)**
- Dans `tryEnemyAbility` / `enemyTurn` (battle-spells.js:7-18, battle.js), lire
  `enemy.ai` pour moduler le **choix de capacité** et la **cible** :
  - `aggressive` → privilégie `damage` ; cible le héros le plus faible en PV.
  - `cautious` → si l'ennemi (ou un allié ennemi) est sous ~30 % PV et a un
    `heal`/`drain`, le jouer en priorité ; sinon `weaken`/`damage`.
  - `random` → comportement actuel (fallback).
- Garder l'heuristique anti-stalling existante (weaken ×1,5 vs Double-Garde).
- **Garde-fou** : `enemy.ai` peut être absent → défaut `random`. Ne pas casser
  les monstres sans le champ.
- **Vérif** : nouveau scénario `smoke.js` — un ennemi `cautious` à bas PV avec
  capacité `heal` se soigne plutôt que d'attaquer ; un `aggressive` cible le
  héros le plus bas. Asserter le log/état.

**B2. Phases de boss (au moins les boss canon majeurs)**
- Cibles : Voldemort Ressuscité (étage 10), Basilic, Nagini, Aragog (+ variantes
  Ténébreuses étages 18-20).
- Mécanisme minimal et data-driven : champ optionnel sur le monstre, ex.
  `phases: [{ hpPct: 0.5, onEnter: 'enrage'|'summon'|'swapAbilities', ... }]`,
  évalué en fin de tour ennemi quand `currentHp` franchit un seuil.
- 1ère itération : 1 transition à 50 % PV → change le pool de capacités ou
  applique un buff (enrage = +ATK / nouvelle capacité). Adds optionnels en V2.
- **Garde-fou** : `phases` absent → comportement actuel inchangé.
- **Vérif** : scénario smoke — un boss avec `phases` change d'état au seuil
  (asserter qu'une capacité de phase 2 ou un buff apparaît).

**B3. Réduire la redondance des capacités (chantier de contenu, itératif)**
- Auditer les `abilities` clonées (drain/weaken/damage répétés avec stats
  différentes) et introduire **2-3 nouveaux archétypes d'effet** réellement
  distincts, p.ex. :
  - `summon` (invoque un add si slot ennemi libre),
  - `enrage_self` (gagne ATK quand bas PV),
  - `taunt`/`aura` (debuff de groupe persistant).
- Appliquer d'abord aux boss/élites (là où ça compte), pas aux 68 monstres.
- **Vérif** : chaque nouvel effet a un handler dans `tryEnemyAbility` + un
  scénario smoke dédié.

**B4. Rééquilibrer Legilimens (optionnel, à discuter)**
- Aujourd'hui spammable tant qu'il y a du PM (battle-spells.js:516-523).
- Option : cap de charges par combat, ou coût croissant. **À trancher avec
  l'utilisateur** — ce n'est peut-être pas un problème ressenti.

---

### LOT C — Profondeur de contenu : items, builds, upgrades (🟠 effort moyen, ~2-3j)

**C1. Consommables à effet (au-delà du +PV/PM)**
- Ajouter 3-5 consommables tactiques : buff temporaire (haste/initiative,
  +crit N tours), immunité à un statut, antidote (purge poison/burn/gel),
  potion de hâte de fuite. Réutiliser le système de statuts/buffs existant.
- **Vérif** : item appliqué en combat pose le statut attendu (scénario smoke).

**C2. Items à trade-off / choix de build**
- Introduire 3-4 items « maudits » ou à compromis (ex. +ATK mais -AGI,
  +MAG mais -DEF) via les champs `bonus*` négatifs déjà supportés par
  `recalculateStats()`.
- **Vérif** : équiper l'item applique correctement le malus (smoke).

**C3. Choix d'upgrade Forge & Bibliothèque**
- Forge (forge.js:15-152) : proposer **2 chemins** au lieu d'un (ex. « +ATK »
  vs « +CritChance ») par palier, stocké sur l'item.
- Bibliothèque (library.js:17-210) : permettre un axe alternatif par sort
  (ex. « -coût » plutôt que « +power ») pour certains sorts.
- **Garde-fou** : compatibilité saves existantes (items déjà forgés gardent leur
  bonus ; migration idempotente si nouveau champ).
- **Vérif** : upgrade applique le bon bonus selon le chemin choisi (smoke).

**C4. Combos de sorts (synergie tactique)**
- Récompenser des enchaînements via les statuts existants : ex. dégât physique
  ou de sort sur cible `gel` → +X % dégâts / +crit ; cible `bleed` →
  bonus d'un sort tranchant. Implémenter dans `_spellElementalDamage` /
  `executeAttack` (lecture du statut de la cible).
- **Vérif** : scénario smoke — frapper une cible gelée inflige le bonus attendu.

**C5. Reconnecter le contenu narratif inerte (plus léger)**
- Pages de Grimoire / brassage : leur donner un **petit** crochet mécanique
  (ex. collecter les 5 pages → recette/bonus passif) pour les sortir du pur
  flavour. À cadrer petit pour ne pas exploser le scope.

---

### LOT D — Onboarding & première session (🟠 effort moyen, ~1-2j)

**D1. Quick Start**
- Ajouter un chemin « Nouvelle partie rapide » (depuis le hub / titre) qui
  présélectionne mode Solo + héros recommandé + difficulté Normal et saute
  directement au jeu, avec possibilité de personnaliser ensuite.
- **Vérif** : depuis le titre, atteindre le donjon en ≤ 2 clics.

**D2. Tutoriel contextuel du premier combat**
- Au tout premier combat, afficher une bulle légère et skippable expliquant
  Attaque / Sort / Garde / Fuir (réutiliser l'infra help-tour, mais **ciblée**,
  pas les 13 étapes). Flag « tuto combat vu » persisté.
- **Vérif** : flag persisté dans le save ; bulle n'apparaît qu'une fois.

**D3. Contexte au choix de Maison / héros**
- Afficher les bonus de Maison **chiffrés** à l'écran de choix (paliers/bonus),
  et une recommandation héros par difficulté (« débutant : Harry »).
- **Vérif** : valeurs affichées cohérentes avec `HOUSE_BONUSES`.

**D4. Help-tour reprenable**
- Permettre de relancer l'aide **par section** plutôt que depuis l'étape 1
  (help-tour.js), ou un menu « Quelle aide ? ».
- **Vérif** : relancer l'aide propose un choix de sujet.

---

### LOT E — Polish feedback de combat (🟡 faible effort, ~½-1j)

- **SFX crit / faiblesse élémentaire** : le combat a déjà du son ; ajouter un
  *splat*/accent sur crit et sur hit en faiblesse (audio-sfx.js + appel dans
  executeAttack / _spellElementalDamage).
- **Timeline live** : recalculer/masquer un combattant KO dans la frise
  d'initiative (ux-improvements.js:328-382) pour ne pas induire en erreur.
- **Journal mobile** : ne pas replier le log par défaut au **premier** combat
  (ou afficher un hint « journal ici »).
- **Vérif** : visuel ; smoke reste vert.

---

### LOT F — Décision stratégique : Mondes Parallèles / Cheminette (🟠 à trancher)

**Contexte** : le multijoueur async (présence fantôme, duels, cadeaux, messages)
est **réellement jouable** (~80 %, multiplayer.js). En revanche la **Cheminette
Inter-Mondes** (visiter le monde d'un autre) est **~20-40 % seulement** :
- Fonctions de transport appelées mais incomplètes/fragmentées
  (`mpPostVisitRequest`, `mpPollOutgoingVisitStatus`, `mpRespondVisitRequest`,
  `mpPostVisitMessage`, `_visitPollOnce`) — visit-channel.js, portal-matchmaking.js.
- **Tables Supabase requises non créées** par une migration (`mp_visit_messages`,
  `mp_visit_channels`, `mp_threats`…). Schémas décrits dans
  `.claude/plans/parallel-worlds.md` mais **aucun `.sql` exécuté**.
- Verrou de Sang / Atelier du Voyageur : **0 %** (économie « Essence d'Outremonde »
  et UI de craft absentes — atelier-voyageur.js).

**Le statut « moitié branché » est le pire des deux mondes** (code mort + CSS
de 763 lignes + risque de confusion). **Décision à prendre par l'utilisateur** :

- **Option 1 — Finir** : créer les migrations Supabase (via le MCP Supabase
  disponible), compléter `visit-channel.js` (transport + sync snapshot), tester
  la visite end-to-end. **Effort élevé (plusieurs jours)** + dépendance réseau.
- **Option 2 — Geler proprement** : masquer la Cheminette derrière un flag
  désactivé par défaut, documenter le statut, garder le code mais hors chemin
  joueur. **Effort faible**, réduit la dette et la confusion.
- **Option 3 — Statu quo** : ne rien faire (déconseillé).

> ⚠️ Avant tout travail Supabase : vérifier la configuration (RLS, clés,
> tables existantes) via le serveur MCP Supabase. Ne pas committer de secrets.

**Recommandation** : Option 2 maintenant (faible coût, assainit), Option 1 plus
tard si la feature redevient prioritaire.

---

## 4. Ordre d'exécution recommandé

1. **LOT A** (accessibilité/mobile) — rapide, universel, sans risque gameplay.
2. **LOT B** (IA + phases de boss) — le plus fort gain de ressenti.
3. **LOT F** (décision Mondes Parallèles) — assainir la dette pendant qu'on y pense.
4. **LOT C** (profondeur contenu) puis **LOT D** (onboarding), **LOT E** (polish).

Chaque lot = une branche/PR dédiée, smoke vert, scénario ajouté si comportement
testable. Ce fichier est mis à jour au fil de l'eau (cocher, noter les écarts).

---

## 5. Risques transverses & garde-fous

- **Saves rétro-compatibles** : tout nouveau champ (items forgés, flags tuto,
  phases) doit avoir un défaut sûr dans `_applyState` (save.js) — migration
  idempotente, jamais de réassignation `player`/`party` (cf. règle d'or).
- **Loader MANIFEST** : tout nouveau global critique → ajouter au MANIFEST
  (loader.js), sinon une régression de chargement passe inaperçue.
- **Zéro dépendance / zéro build** : conserver le scope global séquentiel, pas
  d'ES modules, pas de bundler.
- **Tests** : `node tests/smoke.js` vert avant tout commit (guidelines §7) ;
  vérifier l'état de la PR avant push (guidelines §6).
- **CLAUDE.md à jour** : 19 modules ne sont pas documentés — documenter ceux
  qu'on touche au passage (sans refonte de masse).

---

## 6. Journal des décisions

| Date | Décision | Par |
|------|----------|-----|
| 2026-05-29 | Revue livrée. Plan d'amélioration rédigé (lots A-F). Aucune implémentation engagée — en attente du choix de lot par l'utilisateur. | revue |
