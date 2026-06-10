# Forge — palier T5 (forge au-delà de +5)

Reliquat **§1.2** de `reliquats-backlog.md` (P2), volet **Forge**. Source :
`_archive/forge-library-stabilization.md`.

## Décisions de design
- **Plafond** : `FORGE_MAX_LEVEL` +5 → **+8** (3 paliers). Conservateur.
- **Matériau T5** : `essence_primordiale` (🔮), requis EN PLUS de l'Essence
  des Ténèbres pour les niveaux 6-8 (1 / 2 / 3 par palier).
- **Source** : Apothicaire des Ténèbres (Boucle), 1200 G — gold-sink pur.
- **Courbe 6-8** : gold 2200/3400/5000 · essence 10/13/16 · primordiale 1/2/3.

## Implémentation
- `data.js` : matériau `essence_primordiale` (price 1200).
- `forge.js` : `FORGE_MAX_LEVEL=8` ; FORGE_COSTS 6-8 (champ `primordiale`) ;
  helpers `_countPrimordiale`/`_consumePrimordiale` ; check + consommation
  dans `upgradeItemAtForge` ; compteur + coût + dispo dans `openForge`.
- `npcs.js` : `apothicaire_tenebreux.wares` += `essence_primordiale`.

## Vérification
- Smoke `scenarioForgeUpgrade` T5 : plafond +8, 5→6 refusé sans Primordiale,
  6-7-8 réussis, +9 refusé, consommation 1+2+3.
- Full smoke + units + pwa. Cache PWA bumpé (data/forge/npcs + CACHE + SW_URL).

## Journal
- ✅ Implémenté sur branche dédiée `claude/forge-t5-upgrade` (commit anticipé
  après instabilité d'environnement répétée).
