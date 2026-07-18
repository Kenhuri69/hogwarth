# Thème A — Endgame frais · A3 : payoff des fins (Codex par variante)

> Revue narration Axe 2 : « les choix ne paient qu'en texte sur un écran
> unique ». Volet **code-only, cosmétique, zéro-héritage**. Les illustrations
> par fin (assets) restent hors-scope.

## Constat (audit code)
- `computeEndingType` (endgame.js) : 3 labels, précédence `cycle_broken >
  victory_pact > victory`.
- Profil : `endingsSeen {victory, victory_pact, cycle_broken}` + titres
  distincts (`computeProfileTitles` : Vainqueur / Diplomate / Briseur). ✅
- Codex : **une seule** entrée `epilogue` (révélée par `ending: cycle_broken`).
  Les fins `victory` et `victory_pact` n'avaient **aucun payoff écrit**.

## Livré
2 entrées Codex (`js/codex.js`), miroir de `endingsSeen`, révélées par le
robinet `ending` existant (case déjà gérée) :
- `epilogue_victoire` (🌀, `ending: victory`) — la veille sans fin (Boucle
  perpétuée par choix).
- `epilogue_pacte` (⚖️, `ending: victory_pact`) — la main serrée dans le noir
  (victoire via Pacte de Salazar).

Le Codex étant **persistant** (`unlockedCodexEntries`), le joueur collectionne
les 3 épilogues au fil de ses parties (parité avec `endingsSeen`). `links`
vérifiés (ids existants). Cosmétique pur — aucun gate ne les lit.

## Vérif
- `node --check` ; pas de test d'intégrité de liens Codex (orphan test =
  quêtes). Compteur Codex dynamique (59→61, assertion `> 0` seulement).
- `node tests/units.js` + `node tests/smoke.js` codex.
- Cache : `codex.js` ?v + `CACHE_VERSION`.

## Journal
- **2026-07-16** — A3 livré (2 épilogues Codex). A4 (sinks Éclats) laissé en
  attente d'arbitrage design (dépenser accumulatedEclats casserait les seuils
  Briser-le-Cycle / Codex — décision utilisateur requise).
