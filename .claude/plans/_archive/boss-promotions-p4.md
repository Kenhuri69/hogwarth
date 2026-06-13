# Plan — P4 (volet A) : Promotions de boss en personnages (ch.06 §6.6)

Suite du chantier « PNJ réactifs » (ch.06 §6.12.F). P0–P3 mergés.
Ce volet de P4 **promeut deux boss originaux en personnages scénarisés** —
reco explicite du doc §6.6 :

- **Maître des Détraqueurs** (`maitre_detraqueur`, ét. 9+) — incarne la
  **peur-sceau** (faction sans-repos, §6.5 B).
- **Héraut des Ténèbres** (`heraut_tenebres`, ét. 10+) — **charnière** vers la
  Boucle Ténébreuse (annonciateur de la résurrection).

Les deux autres gardiens (Veilleur du Seuil, Hécate) restent des gardiens de
lore — **hors scope** (reco §6.6).

## Approche (réutilisation, modèle existant)

« Promotion en personnage » = leur donner **une voix** (monologue scénarisé à
la première rencontre) **et** une **entrée de Codex** dans la catégorie
👤 Personnages. Deux mécanismes déjà en place :

1. **Monologue de boss one-shot** — modèle `_applySignatureVoldemortLever`
   (battle.js, addMsg pur) + one-shot via `seenScriptedBeat` (déjà sérialisé,
   sentinelles string comme `'voix_des_ruines'`). Greffé dans `startBattle`,
   après `CFX_safe.bossIntro` et AVANT le bark `bossAppear` du héros (le boss
   parle, le héros répond).
2. **Entrée Codex `personnages`** — modèle des entrées existantes (Dumbledore,
   écho de Salazar…). Robinet `monster` déjà câblé (`reflet_mythe` l'utilise) :
   `unlockConditions monster` (vu en combat → veiled) +
   `revealedBy monster kills:1` (vaincu → revealed). `checkCodexUnlocks` est
   appelé par `endBattle`.

Aucun flag neuf, aucun système neuf.

## Étapes

### Étape 1 — Monologue de boss (battle.js)
- [x] `BOSS_PROMO_BEATS = { maitre_detraqueur:{lines, kind}, heraut_tenebres:{...} }`
      (registre pur) + `_maybeBossPromoBeat()` (one-shot, lit `enemyGroup[0].id`,
      sentinelle `'boss_promo:'+id` dans `seenScriptedBeat`). Thèmes : Maître =
      peur/Baiser ; Héraut = annonce/Boucle.
- [x] Appel dans `startBattle` (entre bossIntro et le bark bossAppear).
      → vérif : smoke

### Étape 2 — Entrées Codex (codex.js)
- [x] `maitre_detraqueur` + `heraut_tenebres`, `category:'personnages'`,
      veiled (vu) + revealed (tué). → vérif : units (codexEntryState) + smoke

### Étape 3 — Tests
- [x] `tests/units.js` : résolveur pur `BOSS_PROMO_BEATS` (2 boss) + état codex
      des 2 entrées (locked → veiled → revealed selon seen/kill).
- [x] `tests/scenarios/*.js` : `scenarioBossPromo` — monologue one-shot au 1ᵉʳ
      combat contre le Maître, pas de rejeu ; entrée Codex ouverte.

### Étape 4 — Cache & finalisation
- [x] skill `cache-bump` : battle.js + codex.js bumpés (index.html + sw.js) +
      CACHE_VERSION. `check_cache_versions --base origin/master` vert.
- [x] skill `commit-guard` (plan→smoke→cache→état PR), commit, push, PR, squash.

## Écarts / décisions
- Hors scope : Veilleur du Seuil & Hécate (gardiens de lore, reco §6.6).
- Pas de variante house-aware pour ces monologues (le doc ne la requiert pas) —
  on garde le périmètre tendu.
</content>
