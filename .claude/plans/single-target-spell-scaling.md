# Plan — Scaling des sorts mono-cible vs multi-cible (évolutions)

## Problème (retour joueur)

Le moteur d'évolution de sorts (`resolveSpellForm`, `evolvesTo`/`evolveCondition`
dans `data.js`) transforme **Lumos Solem** (sort de dégâts **mono-cible**, lumière)
en **Lux Aeterna** (sort de **zone / multi-cible**, `aoe_wave`) une fois l'étage 9
atteint.

Le joueur juge que **la forme évoluée d'un sort mono-cible doit rester mono-cible**
(juste plus puissante), et **non** se transformer en sort de zone. Symétriquement,
**les sorts de zone (AoE) doivent eux aussi disposer d'une forme évoluée plus
puissante** (qui reste AoE).

> Règle de design retenue : **une évolution préserve la catégorie de ciblage**
> (mono → mono plus fort ; zone → zone plus forte). Jamais mono → zone.

## État des lieux (évolutions existantes — `data.js`)

| Base (mono-cible) | Évolution | Ciblage évolution | Verdict |
|---|---|---|---|
| Incendio | Incendio Majeur | burn + `splash` | OK (splash = éclaboussure, reste centré) |
| Glacius | Glacius Profond | mono (stun) | OK |
| Sanguini | Sanguini Vorace | mono (lifesteal) | OK |
| Protego | Protego Diabolica | self (shield) | OK |
| **Lumos Solem** | **Lux Aeterna** | **`aoe_wave` (zone)** | ❌ À corriger |

Les 6 sorts de zone (`Glacius Tempête`, `Fulgur Catena`, `Lux Aeterna`,
`Nox Vorax`, `Diffindo Maxima`, `Vulnera Sanentur`) n'ont **aucune** évolution.

## Changements

### Partie 1 — Lumos Solem reste mono-cible

- Nouveau sort **« Lumos Solem Ardent »** : mono-cible, `effect:"burn"`,
  `element:"lumière"`, `power:26`, `cost:12`, `bonusVsUndead:1.5`.
- `Lumos Solem.evolvesTo` : `"Lux Aeterna"` → **`"Lumos Solem Ardent"`**
  (condition `floor 9` inchangée).
- **Lux Aeterna conservé tel quel** : reste un sort de zone autonome,
  appris via le livre de quête `livre_lux_aeterna` (quête Dumbledore). Aucun
  autre code ne câble en dur Lumos Solem→Lux Aeterna (vérifié par grep).

### Partie 2 — Évolutions AoE → AoE plus fort

Pour chacun des 6 sorts de zone : ajout `evolvesTo` + `evolveCondition` de type
`floor`, débloqué **PROGRESSIVEMENT, un sort par étage à partir de 14** (tranche D
« Ruines Anciennes », endgame/Boucle). Chaque forme évoluée garde **strictement
le même** `effect`/`element`/`stat2`/`magDiv`/`stat2Div` (donc même comportement
de zone) avec `power` ↑ ~+50 % et `cost` ↑.

| Base AoE (power/cost) | Évolution (power/cost) | Étage de déblocage |
|---|---|---|
| Glacius Tempête (12/16) | Glacius Cataclysme (18/20) | 14 |
| Fulgur Catena (18/15) | Fulgur Imperium (27/19) | 15 |
| Lux Aeterna (15/17) | Lux Suprema (23/21) | 16 |
| Nox Vorax (14/18) | Nox Devorans (21/22) | 17 |
| Diffindo Maxima (18/14) | Diffindo Ultima (27/18) | 18 |
| Vulnera Sanentur (22/16) | Vulnera Maxima (33/20) | 19 |

### Câblage transverse

- `SPELL_META` : étiqueter les 7 nouveaux sorts (catégorie/tier/rareté).
- `SPELL_ICON_REGISTRY` (`item-icons.js`) : alias temporaires sur les PNG des
  bases (précédent Lot P2/P4) — fallback emoji garanti sinon. Pas d'art dédié
  dans ce lot.

## Vérifications

1. `node tests/units.js` → helpers purs OK (dont `resolveSpellForm` indirect).
2. `node tests/smoke.js spell` → scénarios sorts verts (Lux Aeterna AoE
   toujours fonctionnel, évolution Lumos Solem ne casse rien).
3. Cache PWA : `data.js`/`item-icons.js` modifiés → skill `cache-bump`
   (`?v` + `CACHE_VERSION`) + `node tools/check_cache_versions.js`.

## Étapes

1. [x] Partie 1 — data.js : nouveau sort mono (Lumos Solem Ardent) + repointage Lumos Solem
2. [x] Partie 2 — data.js : 6 formes AoE évoluées + evolvesTo sur les bases
3. [x] SPELL_META + SPELL_ICON_REGISTRY (7 sorts)
4. [x] Suivi retour joueur : déblocage AoE PROGRESSIF (1/étage, 14→19) au lieu de floor 14 uniforme
5. [x] Tests units (test évolution = staggering verrouillé) + smoke
6. [x] cache-bump (data.js, CACHE_VERSION) + check + pwa-smoke
7. [ ] commit + push (suivi)

## Notes d'exécution

- Lux Aeterna reste un sort autonome (livre de quête `livre_lux_aeterna`) :
  détaché de Lumos Solem sans casse, et reçoit lui-même une évolution AoE
  (Lux Suprema, floor 14).
- Test unitaire `évol étage` réécrit pour verrouiller la règle de design
  (mono reste mono, AoE reste AoE + power ↑).
- Art dédié des 7 formes reporté (alias temporaires sur l'art des bases,
  précédent Lot P2/P4 ; fallback emoji garanti).
