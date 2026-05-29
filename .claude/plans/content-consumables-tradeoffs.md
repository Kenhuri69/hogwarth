# LOT C (tranche 1) — Consommables à effet & items à compromis

> Branche : `claude/content-consumables-tradeoffs` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT C (C1 + C2).
> C3 (choix d'upgrade Forge/Biblio), C4 (combos de sorts), C5 (grimoire) → lots ultérieurs.

## Constat de départ (vérifié)
- Consommables = uniquement +PV/PM (`heal`/`restore_sp`/`both`/`*_full`/`perma_*`).
- Aucun item à compromis : on équipe toujours « le meilleur ».
- `recalculateStats` (inventory-core.js:67) somme les bonus avec `+=` → **les
  malus négatifs fonctionnent déjà** (aucun changement moteur requis).
- `applyStatus`/`regen`/`shieldTurns` réutilisables tels quels.
- **Invariant testé** : 100 % des `ITEMS` doivent avoir une icône (`ITEM_ICON_REGISTRY`
  ou SVG) — l'emoji seul fait échouer `scenarioItemIcons`. Précédent : réutiliser
  un PNG existant (`lame_godric → sword_gryff.png`).

## Réalisé
- [x] **C1 — 3 consommables à effet** (data.js) + handlers (`_applyConsumableEffect`,
  inventory.js) :
  - `elixir_antidote` (`cure`) — purge burn/poison/bleed/gel (pas weaken, dont la
    DEF est restaurée à l'expiry par tickStatuses).
  - `elixir_regen` (`regen_buff`, 6 PV/tour × 4) — pose le statut `regen` existant.
  - `potion_bouclier` (`shield_buff`, 3 paliers) — érige un Protego sur le porteur.
- [x] **C2 — 3 items à compromis** (data.js), bonus positif + malus négatif :
  - `lame_sanguinaire` (wand) ATK+7 / DEF−2.
  - `armure_lourde` (body) DEF+6 / AGI−3.
  - `anneau_furie` (ring) Crit +12 % / Esquive −6 %.
- [x] Obtenables en **boutique** (shop.js : étages 2-5).
- [x] **Icônes** : mappées sur PNG existants (item-icons.js) — invariant 100 % respecté.
- [x] **Test** : `scenarioContentConsumablesTradeoffs` (cure, regen, shield, ATK/DEF
  trade-off, crit/dodge trade-off). Suite complète **123/123 verte**.

## Notes / limites honnêtes
- `regen_buff`/`shield_buff` sont surtout utiles **en combat** : hors combat,
  `startBattle` réinitialise `statusEffects` et `shieldTurns` n'est pas actif.
  C'est cohérent (ce sont des consommables de combat) — documenté, pas un bug.
- Malus volontairement modestes pour éviter qu'une stat passe sous 0 en pratique.
- Icônes réutilisées (pas de visuel dédié) — pipeline `icon_factory.py` reporté
  si on veut des PNG propres.

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | C1+C2 implémentés et testés. C3/C4/C5 reportés. |
