# Plan — P3 : Beats scriptés par étage (ch.06 §6.9.4 / §6.12.D-E)

Suite du chantier « PNJ réactifs » (ch.06). P0/P1/P2 déjà mergés. Cette
priorité P3 livre les **deux** beats restants (la réplique pré-Voldemort §6.9.4
étant déjà actée par `_applySignatureVoldemortLever`/dialogue L4 — NE PAS refaire).

## Périmètre

1. **Voix des Ruines** — beat solennel au franchissement de la frontière de
   tranche **13↔14** (§6.9.4 + §4.5 + §6.12.D). Distinct de l'écho de
   *signature* (`getSignatureEchoBeat`, floor 14, house-aware) : universel,
   registre soutenu, one-shot.
2. **Suffixes « Ténébreux » en Boucle** (§6.12.E) — les PNJ recyclés
   (Kingsley 8/18, Bill 9/19, Sirius 10/20, marchands) portent une variante de
   dialogue lue sur `currentFloor >= 18`. Généralise le mécanisme de suffixe de
   P2 (`_eclatSuffixPages`).

## Contraintes (guidelines)

- Réutiliser l'existant (§2) : pas de système neuf. Le beat 13↔14 se greffe sur
  `_maybePlayTierTransition` ; le suffixe Ténébreux clone le patron P2.
- Aucun PNJ/beat ne gate jamais l'escalier (`goDeeper`).
- One-shot via une **clé sérialisée existante** : `seenScriptedBeat`
  (state.js, déjà sérialisé) — sentinelle `'voix_des_ruines'`. Pas de flag neuf.
- Cache PWA : bump `?v=N` (index.html + sw.js PRECACHE_URLS) + `CACHE_VERSION`.
- Test headless : `node tests/smoke.js` + `node tests/units.js` verts.

## État courant constaté (origin/master)

- `movement-floors.js:157-162` contient déjà un toast inline « P4 » pour 13↔14
  (`addMsg`, **fire à chaque franchissement**, pas one-shot). → à remplacer par
  un vrai beat one-shot dans `floor-ambiance.js` (cohérent avec
  `maybeSignatureEchoBeat`/`maybeFounderChamberBeat`).
- Au floor 14, `maybeSignatureEchoBeat` (movement-floors.js:276) appelle déjà
  `setNarrative`. La Voix des Ruines reste donc **un toast** (registre soutenu,
  §4.5 « toast solennel dédié ») et ne prend PAS le panneau de narration — pas
  de collision, les deux toasts coexistent dans le log.

## Étapes

### Étape 1 — Voix des Ruines (P3.1)
- [x] `floor-ambiance.js` : `VOIX_DES_RUINES_KEY`, `VOIX_DES_RUINES` (toast),
      `isVoixDesRuinesCrossing(prev,next)` (pur), `maybeVoixDesRuinesBeat(prev,next)`
      (one-shot via `seenScriptedBeat`). → vérif : units.js
- [x] `movement-floors.js` : remplacer le toast inline 157-162 par un appel
      `maybeVoixDesRuinesBeat(prevFloor, nextFloor)`. → vérif : smoke
- [x] `loader.js` MANIFEST : ajouter `isVoixDesRuinesCrossing` +
      `maybeVoixDesRuinesBeat` (les beats pairs `maybe{Scripted,FounderChamber,
      Signature}*` Y SONT déjà → alignement). loader.js bumpé aussi.

### Étape 2 — Suffixe Ténébreux en Boucle (P3.2)
- [x] `npc-dialog.js` : `_DARK_LOOP_FLOOR = 18`, `_darkLoopSuffixPages(npc)`
      (clone de `_eclatSuffixPages`, lit `npc.darkLoopLines`, gate
      `currentFloor >= 18`). Appendu dans `openNpcDialog` après le suffixe Éclat.
      → vérif : smoke
- [x] `npcs.js` : champ `darkLoopLines` sur Kingsley, Bill, Sirius,
      marchand_clandestin, apothicaire_tenebreux, forgeron_tenebreux. → vérif : smoke

### Étape 3 — Tests
- [x] `tests/units.js` : bloc `maybeVoixDesRuinesBeat` (pur + orchestrateur
      one-shot, modèle bloc 6bis signature).
- [x] `tests/scenarios/dungeon.js` : `scenarioVoixDesRuines` (franchissement
      13→14 → toast présent une seule fois ; ré-entrée → absent).
- [x] `tests/scenarios/npc.js` : `scenarioLoopDarkSuffix` (Kingsley : pas de
      suffixe à floor 8, suffixe présent à floor 18).

### Étape 4 — Cache & finalisation
- [x] skill `cache-bump` : floor-ambiance.js, movement-floors.js, npc-dialog.js,
      npcs.js bumpés (index.html + sw.js) + CACHE_VERSION.
- [x] `node tools/check_cache_versions.js --base origin/master` vert.
- [x] skill `commit-guard` : plan→smoke→cache→état PR.
- [x] commit, push, PR, squash-merge (modèle #474/#476).

## Écarts / décisions

- **Voix des Ruines = toast, pas narrative** : §4.5 la cadre explicitement comme
  « toast solennel dédié » ; le floor 14 a déjà un `setNarrative` (signature
  echo). Toast-only évite la collision et respecte le doc.
- **One-shot** : `seenScriptedBeat` réutilisé (pas de flag neuf), sentinelle
  string `'voix_des_ruines'` (comme `'signature_echo'`/`'founder_chamber'`).
- **Seuil Ténébreux** : `currentFloor >= 18` (doc §6.12.E littéral). Les PNJ
  8/9/10 ne recyclent qu'à 18/19/20 → le seuil leur donne naturellement leur
  suffixe uniquement en Boucle.
</content>
</invoke>
