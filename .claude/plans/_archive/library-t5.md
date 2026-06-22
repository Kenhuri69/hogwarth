# Plan — Bibliothèque interdite : palier T5 (niveaux 6-8) — reliquat 1.2

> Reliquat **1.2** du backlog. Le volet **Forge T5** est livré
> ([`_archive/forge-t5.md`](./_archive/forge-t5.md), `FORGE_MAX_LEVEL=8` +
> `essence_primordiale` pour 6-8). Ce plan livre le **volet symétrique côté
> Bibliothèque** : l'amplification des sorts passe de +5 à +8, les niveaux 6-8
> exigeant en plus de l'**Essence Primordiale** — exactement comme la Forge.

## Décision de design — source du matériau T5
Le plan backlog laissait le choix ouvert (drop boss / don Gardien / réutiliser
`essence_primordiale`). **Décision : réutiliser `essence_primordiale`** — le
matériau premium déjà introduit par la Forge T5 et déjà vendu par l'Apothicaire
Ténébreux (`npcs.js`, 1200 g).

Justification :
- **Surface minimale** : zéro nouveau matériau, icône, entrée vendeur ou table
  de drop à créer/équilibrer.
- **Tension endgame** : Forge ET Bibliothèque puisent dans le **même stock**
  de Primordiale → le joueur arbitre entre renforcer son équipement ou ses
  sorts. C'est un gold-sink profond partagé, cohérent avec l'intention « secours,
  pas alternative confortable au farm ».
- **Cohérence thématique** : une « essence primordiale » sert aussi bien à
  forger qu'à amplifier un sort au-delà du plafond normal.

## Règle de calibrage (révélée par les tables existantes + sim-economy)
Les coûts T1-5 suivent déjà une relation **exacte** Forge↔Bibliothèque :
- **gold Bibliothèque = 1,5 × gold Forge** (80/160/320/640/1280 → 120/240/480/960/1920) ;
- **pages Bibliothèque = essence Forge** (1/2/3/5/8 des deux côtés) ;
- même nombre de Primordiale aux niveaux T5.

→ On **prolonge la même règle** pour 6-8 (Forge : 2200/3400/5000 g, essence
10/13/16, prim 1/2/3) :

| Niveau cible | gold | pages | primordiale |
|--------------|------|-------|-------------|
| 6 | 3300 | 10 | 1 |
| 7 | 5100 | 13 | 2 |
| 8 | 7500 | 16 | 3 |

Contexte `node tools/sim-economy.js --max-floor=20` : une boucle ténébreuse
complète (ét. 11→20) rapporte ~15 900 G à un duo. Maxer **un** sort de +5→+8
coûte ~15 900 G + 39 pages + 6 Primordiale (≈ +7 200 G si la Primordiale est
achetée) → l'équivalent d'une boucle entière par sort. Sink profond et lent,
non trivial mais atteignable — aligné sur la Forge.

## Effet en combat — INCHANGÉ (déjà compatible 6-8)
`_spellForCaster` (battle-spells.js) applique déjà des formules linéaires sûres
pour tout niveau :
- voie **Puissance** : `power +2 × lvl` (lvl 8 → +16, pas de cap) ;
- voie **Maîtrise** : `cost −lvl` plancher 1, `chance +0.05 × lvl` **capé à 0,5**
  (atteint seulement au niv 10 → jamais franchi à 8).

Aucune retouche de `battle-spells.js` nécessaire.

## Hors-scope (volontaire, documenté)
- **Nouveaux sorts/recettes débloquables** : la Bibliothèque **amplifie** les
  sorts connus, elle n'en **enseigne pas** (l'apprentissage passe par level-up,
  grimoires et `grantsSpell`). Ajouter un canal d'apprentissage de sorts à la
  Bibliothèque est une feature distincte (design de nouveaux sorts) — non
  couverte ici, à rouvrir séparément si désiré. Ce PR livre le **palier T5**,
  pendant exact de `forge-t5.md`.

## Étapes → vérification
1. [x] `js/library.js` : `LIBRARY_MAX_LEVEL` 5→8 ; `LIBRARY_COSTS` + niveaux
   6-8 (champ `primordiale`) ; check/consommation Primordiale dans
   `upgradeSpellAtLibrary` ; affichage compteur + coût + affordabilité dans
   `openLibrary`. ✅
2. [x] `tests/scenarios/dungeon.js` : `scenarioForgeLibraryAudit` T1
   `LIBRARY_MAX_LEVEL` 5→8 ; `scenarioLibraryUpgrade` + bloc T6 (gating
   Primordiale 6-8, plafond +8). ✅ `node tests/smoke.js library forge` → 3/3.
3. [x] Bump cache PWA (`cache-bump`) : `library.js` v3→4 + `CACHE_VERSION`
   v113→114. ✅ `check_cache_versions.js` OK, pwa-smoke OK (cache v114).
4. [x] `node tests/units.js` (478 ✓) + `node tests/smoke.js` complet (198 ✓).
5. [x] Marquer 1.2 clos (volet Bibliothèque T5 livré) dans `reliquats-backlog.md`. ✅
