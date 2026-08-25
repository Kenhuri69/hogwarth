# Thème D — Rétention · Hauts Faits (succès)

> Revue UX Axe 3 : « 0 système d'achievement ; aucun objectif long-terme ».
> Premier lot : un système de **succès cosmétiques cross-run**, dérivés du
> profil persistant (précédent : titres, Bibliothèque des Maîtrises). Zéro
> héritage — aucun calcul de gameplay ne lit les succès.

## Livré
- **Registre PUR** `PROFILE_ACHIEVEMENTS` (`profile.js`) — 12 succès `{id, icon,
  title, desc, test(profile)}`, dérivés des champs profil EXISTANTS (victoires,
  pactVictories, cyclesBroken, sealedDeaths, masteredElements, eclatsConsecrated)
  + un champ neuf `deepestFloor`.
- **`computeAchievements(profile)`** PUR (testé units) → ids débloqués.
- **`deepestFloor`** : nouveau champ profil (max cross-run), hook unique dans
  `goDeeper().onArrive` (`recordDeepestFloor`, écrit seulement si record battu).
- **Affichage** : section « 🏆 Hauts Faits · N/12 » au Codex du Sorcier
  (`renderProfileCodex`), patron visuel des fins (`prof-ending seen/locked`,
  zéro CSS neuf) + stat « étage max ».

Succès : Vainqueur, Vétéran (3 vict.), Diplomate, Fouilleur des Ruines (ét.14),
Marcheur de l'Abîme (ét.21), Briseur de Cycle, Maître du Cycle (×3),
Élémentaliste (3 maîtrises), Archimage (6), Offrant (15 Éclats), Pilier (200),
Scellé (mort en Poche).

## Vérif
- `node tests/units.js` → 1117 ✅ (9 assertions computeAchievements, PURES).
- `node tests/smoke.js` save (round-trip profil `deepestFloor`).
- Cache : `profile.js` + `movement-floors.js` + `CACHE_VERSION`.

## Suivi possible
- Toast à l'unlock (nécessite stockage `achievements[]` + diff — reporté).
- Défi Quotidien seedé (autre gros levier D, lot séparé).

## Journal
- **2026-07-16** — Hauts Faits livrés (12 succès dérivés + deepestFloor).
  Approche PURE (pas de stockage/toast) → zéro risque. Toast + Défi Quotidien
  = suites.
