# Checklist de release — « Le Sceau des Fondateurs »

> P10 du plan [`final-polish-2026-07.md`](../.claude/plans/final-polish-2026-07.md)
> (§4.2). Consolide en UNE checklist les protocoles existants :
> [`qa-parcours-complet.md`](../.claude/plans/qa-parcours-complet.md),
> [`playtest-3-boucles.md`](./playtest-3-boucles.md),
> [`perf-optimization.md`](../.claude/plans/perf-optimization.md) (§Checklist),
> [`perf-lighthouse.md`](./perf-lighthouse.md).
>
> **À dérouler sur la build candidate** (master au moment du tag). Sortie :
> **verdict GO** consigné en bas de ce fichier, ou liste d'ajustements —
> chacun re-priorisé dans le plan de polish.

---

## 0. Pré-vol (automatique, ~15 min)

Tout doit être vert sur la branche release :

- [ ] `node tests/units.js` (~1080 assertions, Node pur)
- [ ] `node tests/smoke.js` (277 scénarios, Chromium headless)
- [ ] `node tests/pwa-smoke.js` (manifest, SW, précache, chargement offline)
- [ ] Garde-fous CI :
  ```bash
  node tools/check_cache_versions.js --base origin/master
  node tools/check_doc_modules.js
  node tools/check_difficulty.js --base origin/master
  ```
- [ ] `CACHE_VERSION` (sw.js) strictement supérieur à la dernière release
      déployée (le SW des joueurs doit purger ses caches).

## 1. Parcours complet — étages 1→10 + victoire (humain, ~2-3 h)

Protocole : re-run de [`qa-parcours-complet.md`](../.claude/plans/qa-parcours-complet.md)
sur la build candidate (la couverture automatisée existe — `scenarioFullJourneyDuo`
et les scénarios morcelés — ce volet vérifie le **ressenti** réel).

- [ ] Nouvelle partie **Duo**, difficulté Normal, Maison au choix : intro →
      tutoriel → Actes I-III → boss final → victoire, sans blocage ni softlock.
- [ ] Arc Manon complet (6 quêtes + capstone « Clair de Lune » + les 2
      side-quests : la lettre chez Lupin, l'aconit) — **voix de Manon
      audibles** sur les 4 pages du greeting (arc repli→élan perceptible).
- [ ] Économie saine : or ni famélique ni trivial aux étages 5/8/10 ;
      boutiques/Forge/Bibliothèque utiles.
- [ ] Un slot manuel + l'autosave survivent à un reload en cours de partie.

## 2. Endgame & lassitude — 3 Boucles (humain, session dédiée)

Protocole : [`playtest-3-boucles.md`](./playtest-3-boucles.md) (inchangé),
**plus** le volet Poches du Sceau ci-dessous (V1/V3 du plan).

### 2bis. Poches du Sceau — validation terrain (V1)

Préparation : dans la console, **avant** la session —

```js
localStorage.hogwarts_balance_debug = '1'   // arme BalanceLog (opt-in, local)
```

Dérouler la Boucle des étages 11 → 17+ en déclenchant les pièges rencontrés
(ne pas les éviter). En fin de session :

```js
BalanceLog.summary()   // → escapeCount, escapeClearRate, escapeCorruptionMean
```

Cibles (plan Lot 2, V1) :

- [ ] **Fréquence ressentie** ≈ 1 Poche / 2-3 étages (constantes :
      `ESCAPE_POCKET_CHANCE = 0.25`/piège, cap 1/étage, cooldown 1 étage).
- [ ] **`escapeClearRate` entre 60 et 75 %** hors House-match (un
      House-match réussi au-dessus est attendu : indice + budget +20 %).
- [ ] `escapeCorruptionMean` : les réussites se jouent majoritairement
      dans les 50-90 % de jauge (tension réelle, pas de promenade).
- [ ] Les 3 types (A énigmes / B miroir / C brasiers) sont tombés au moins
      une fois chacun sur la session (sinon prolonger).
- [ ] Immersion : transition violet-givre, voix du Fondateur, tileset
      `seal_*`, HUD de corruption — tous présents à chaque entrée.

**Si écart (V2)** : leviers en tête d'`escape-pocket.js` —
`ESCAPE_POCKET_CHANCE` (fréquence), `ESCAPE_BUDGET_BASE/FLOOR` (générosité
du budget de pas), `ESCAPE_WARDEN_BUDGET_MULT` (sévérité du type C).
**1 PR de tuning maximum**, puis re-mesure du volet 2bis.

## 3. Performance (mi-humain, ~45 min)

Reprise de la checklist de [`perf-optimization.md`](../.claude/plans/perf-optimization.md)
+ mesures post-compression P8 ([`perf-lighthouse.md`](./perf-lighthouse.md)) :

- [ ] **Chargement froid < 5-6 s** sur profil mobile médian (Lighthouse,
      cache vide). ⚠️ Mesurer sur une machine comparable au pass de juin
      (le score lab n'est PAS comparable entre machines — cf.
      `perf-lighthouse.md` §Re-pass P8b) ; à défaut, mesurer sur appareil réel.
- [ ] **Rechargement SW chaud** quasi instantané ; offline OK.
- [ ] **10 étages d'affilée** : pas de montée mémoire continue.
- [ ] **Combat long** (5 ennemis, ~20 tours, statuts + artefacts) : FPS
      stable, log borné.
- [ ] **Boucle profonde** (étage 25-30) : scaling récursif sans gel.
- [ ] **Onglet en arrière-plan** : 0 redraw.
- [ ] Poids first-visit : `img/` ≈ 20 Mo au total, dialogue PNJ le plus
      lourd ≤ ~100 Ko (post-P8a).

## 4. Mobile réel (humain, ~15 min sur Android médian)

- [ ] Session 15 min : D-pad + **swipe canvas** (4 directions), combat,
      inventaire, fiche perso (accordéons), boutique.
- [ ] Installation PWA (bannière ou menu → « Installer ») puis **lancement
      en avion** : le jeu charge et la partie continue.
- [ ] Touch targets ≥ 44 px partout (pas de bouton raté en combat).
- [ ] Voix/musique : pas de démarrage audio avant le premier geste
      (autoplay policy), toggles ♪/🗣️ fonctionnels.

## 5. Contenu neuf de la release (spot-checks, ~30 min)

- [ ] Poches du Sceau : une réussite ET un échec volontaire (le malus
      Corruption −15 % s'affiche sur la fiche et expire après 20 pas).
- [ ] Bibliothèque des Maîtrises : lire un Livre → la puce se colore dans
      le Codex du Sorcier ; toujours 0 bonus hérité en nouvelle partie.
- [ ] Livraison de la lettre : refus sac plein à l'accept, remise
      impossible chez Manon, épilogue chez Lupin.
- [ ] Voix Sirius (étage 10) et Gardien de la Boucle (étage 11) audibles ;
      timbres distincts des Fondateurs.
- [ ] README GitHub : les 4 screenshots s'affichent, liens CHANGELOG OK.

## Verdict

| Date | Volets déroulés | Verdict | Ajustements (→ re-priorisés au plan) |
|------|-----------------|---------|--------------------------------------|
| —    | —               | ☐ GO / ☐ NO-GO | — |
