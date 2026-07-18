# Thème B — Profondeur tactique · B3 : différenciation des DoT (phase 1)

> Revue systèmes Axe 3 : « burn/poison/bleed/gel sont mécaniquement identiques
> (même tick), seul l'élément diffère ». B3 leur donne une identité. **Phase 1**
> = les 2 riders entièrement contenus dans le bloc de tick (`tickStatuses`),
> **purement OFFENSIFS** (cible ennemie) → aucun impact sur le DoT subi par le
> joueur, donc **zéro impact difficulté / sim** (pas de mise à jour du sim).

## Constat
`tickStatuses` (battle.js) : les 4 DoT partagent `dmg = s.power` + resist/weak
+ mitigation END (héros). Rien ne les distingue hors icône/couleur.

## Livré (phase 1)
- 🩸 **bleed** (cible ennemie) : rider « hémorragie » — le tick croît de
  `BLEED_RAMP=2` par tour écoulé (6 → 8 → 10…). Récompense la pression soutenue.
  `_ticks` combat-scopé. Le bleed **subi par un héros reste plat** (isEnemy-gated).
- 🔥 **burn** (cible ennemie) : rider « feu inévitable » — ignore la
  **résistance** de l'ennemi (garde la faiblesse). La brûlure ne se résiste pas.

Les deux sont gated `isEnemy` → outils de build offensifs, baseline du DoT subi
par le joueur **inchangée** → le modèle de difficulté (sim, DoT ennemis) reste
valide sans retouche.

## Vérif
- `node --check` ; scénario smoke combat (T3bis : escalade 6/8/10, burn ignore
  resist vs poison atténué). Full smoke + units.
- Cache : `battle.js` ?v + `CACHE_VERSION`.

## Phase 2 (follow-up)
- ☠️ **poison** : −50 % aux soins de la cible (anti-heal) — touche les sites de
  soin (battle-spells heal/drain, phase heal, regen tick).
- ❄️ **gel** : −20 % ATK du combattant gelé (contrôle) — touche executeAttack +
  attaques ennemies. Ces deux-là ont une surface plus large → lot séparé.

## Journal
- **2026-07-16** — B3 phase 1 livrée (bleed escalade + burn inévitable,
  offensifs). B2-items écarté (build physique déjà bien doté). poison/gel = phase 2.
