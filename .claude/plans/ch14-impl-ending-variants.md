# Chapitre 14 — Variantes conditionnelles de fin (B), axe (b) héros/solo-duo

> Réf : Ch.14 §14.2.2(b) + Points à trancher #1. Branche :
> `claude/ch14-impl-ending-variants-vhoroc`. **Décision utilisateur** : adopter
> les variantes conditionnelles (#1).

## Constat
`_victorySpeechVariants(ctx)` (endgame.js, pur/testé) implémentait déjà 4 des 5
axes : (a) Maison, (c) Signatures, (d) Éclats, (e) Pacte `pact`/`defiance`.
**Seul l'axe (b)** (héros choisis & solo/duo) manquait. Lot = combler (b) +
acter #1 (les 5 axes adoptés).

## Implémentation (surgical, même patron pur/défensif/texte)
- endgame.js : bloc (b) dans `_victorySpeechVariants` —
  - solo (1 héros) → ligne intime ;
  - duo (≥2) → échange à deux voix entre les héros ;
  - clin d'œil si Maison canon d'un héros (`_heroCanonHouse`) ≠ `chosenHouse`.
  Caller : `ctx.heroes = party.slice(0,partySize) → {name, canonHouse}`.
- css/style.css : `.victory-speech-heroes` / `.victory-speech-wink` (mêmes codes
  que les variantes existantes).
- Pas de nouveau canal de barks (réutilise seulement `_heroCanonHouse`).

## Étapes
1. [x] endgame.js : bloc (b) + ctx.heroes + maj commentaire d'en-tête.
2. [x] css/style.css : 2 classes (filet discret, ton chaleureux).
3. [x] units.js : 6 assertions (solo / duo / wink / no-wink / vide).
4. [x] smoke : `scenarioEndingAssets` (solo Harry/Gryff) assert beat rendu + pas de wink.
5. [x] docs : §14.2.2(b) 💡→✅, note barks corrigée, table maîtresse alignée,
   intro statut, Points à trancher #1 (tranché).
6. [ ] Cache-bump (endgame.js, css/style.css) + CACHE_VERSION.
7. [ ] Commit + push + PR + merge.

## Suivi / écarts
- Choix d'implémenter (b) dans `_victorySpeechVariants` (centralisé, pur, testable)
  plutôt que via un nouvel événement de bark `victory` proposé par le doc :
  cohérent avec les 4 autres axes déjà là, et testable en units. Doc corrigé.
- Table maîtresse §14.8.1 : rows (a)(c)(d)(e) étaient stale 💡 alors que codées —
  réalignées ✅ en même temps (cohérence avec #1 « 5 axes adoptés »).
