# Plan — Deux nouveaux héros de la Garde de l'Aube

Ajouter 2 héros jouables originaux (faction « Garde de l'Aube ») :
- **Nathalie Finch** (`nathalie`) — Poufsouffle, *Gardienne-Herboriste* (tank/soutien).
- **Olivier de Châtillon** (`chatillon`) — Serpentard, *Ombremancien* (glass-cannon contrôle).

> Renommés depuis la conception initiale (Aubin Tournesol → Nathalie Finch ♀ ;
> Séraphine Nocturne → Olivier de Châtillon ♂) sur fourniture de l'art par
> l'utilisateur. Médaillons fabriqués depuis les photos (crop visage + anneau
> transplanté : iris ♀ / maxence ♂). Sprites plein corps = stand-ins genrés
> (iris / maxence) à remplacer par de vrais plein-corps transparents.

Suit la skill `add-playable-character` + règle normative `docs/histoire/05-personnages-jouables.md §5.5`.

## Décisions actées (avec l'utilisateur)
- Identité conçue par l'assistant (noms/stats/arc).
- Art fourni par l'utilisateur : on référence `img/<key>.png` / `img/players/<key>.png`.
  Stand-ins temporaires (copies d'assets existants) déposés aux bons chemins pour
  garder les tests verts + UI non cassée ; à écraser par le vrai art (zéro code à changer).

## Stats (enveloppe du roster, faiblesse réelle obligatoire)
| Héros | PV | PM | STR INT AGI END LCK MAG | ATK DEF | Spé | Fragilité |
|-------|----|----|--------------------------|---------|-----|-----------|
| Aubin | 36 | 24 | 9 12 9 13 12 11 | 5 4 | Tank front-line + soin de champ | AGI 9 / MAG 11 |
| Séraphine | 27 | 34 | 5 16 13 7 12 16 | 3 2 | Contrôle (disarm+stun) glass-cannon | PV 27 / END 7 |

## Étapes
1. [x] `js/data.js` — entrées `aubin` + `seraphine` dans `CHARACTERS` (section Aube)
2. [x] `index.html` — 2 cartes dans le groupe `data-group="aube"` (badges 3, 4)
3. [x] `js/renderer-entities.js` — clés dans `PLAYER_SPRITE_SRC`
4. [x] `js/hero-barks.js` — `HERO_BARKS.aubin` + `.seraphine` (events base + darkLoop + houseTension)
5. [x] Stand-ins images : copies aux chemins `img/{aubin,seraphine}{,-original}.png` + `img/players/{aubin,seraphine}.png`
6. [x] `tests/scenarios/multiplayer.js` — compte héros 13 → 15 (2 assertions)
7. [x] `docs/histoire/05-personnages-jouables.md` — table §5.0, §5.0.1, profils §5.2, recap (13→15)
8. [x] Cache PWA — bump `?v` data.js/renderer-entities.js/hero-barks.js/audio-sfx.js + `CACHE_VERSION` 126→127
9. [x] `node tests/units.js` (555 ✅), `node tests/smoke.js` (212 ✅), `node tests/pwa-smoke.js` ✅, check_cache_versions ✅
10. [ ] Commit + push branche `claude/new-players-serpentard-guard-rts955`

## Écarts / notes
- **Compteurs héros 13→15 disséminés** : au-delà de la skill, 4 assertions de tests
  référençaient « 13 héros » (`tests/units.js` ×2, `tests/scenarios/misc.js`,
  `tests/scenarios/multiplayer.js`) + le `HERO_VOICE` (`js/audio-sfx.js`) qui doit
  couvrir chaque héros de `HERO_BARKS` → ajout des profils voix `aubin`/`seraphine`
  (→ bump `audio-sfx.js` en plus).
- **`js/audio-sfx.js`** ajouté au lot front bumpé (non prévu initialement).
- **Stand-ins art** : `aubin` = copies de `louis` (Poufsouffle), `seraphine` = copies
  de `maxence` (Serpentard). À écraser par le vrai art aux mêmes chemins — zéro code.
