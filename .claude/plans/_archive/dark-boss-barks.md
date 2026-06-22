# Plan — Variantes Ténébreuses : bark one-shot « déjà tué » (Phase 3)

> Roadmap Phase 3 « Variantes Ténébreuses (barks one-shot « Tu m'as déjà tué
> une fois ») ». **Touche du code** (hero-barks.js + battle.js) → cache-bump +
> smoke. Date : 2026-06-15.

## Audit (AVANT écriture)

- Variante Ténébreuse détectée par `monster.variant === 'darkness'`
  (`dungeon-scaling.js`, post-victoire en Boucle).
- `hero-barks.js` : événements `bossAppear`/`darkLoop`… `darkLoop` = voix au
  **franchissement de Boucle** (≠ rencontre d'un boss). **Aucun** bark dédié à
  un **boss revenu en Ténébreux**.
- `battle.js:639` : sur boss epic, `heroBark(..., 'bossAppear', {once})`.
- Piste doc explicite : 11 §11.9.2 (« Tu m'as déjà tué une fois ») + 09 §9.10.

→ Gap réel : pas de bark « déjà tué » face au boss Ténébreux. À implémenter.

## Changement

1. [x] `hero-barks.js` : événement `darkBoss` (1 réplique « déjà tué » par
   héros, 16/16) + commentaire d'en-tête (renvoi §11.9.2).
2. [x] `battle.js` (`startBattle`) : si boss epic `variant==='darkness'` →
   `heroBark('darkBoss', {once:'darkboss:'+id})` au lieu de `bossAppear`.
3. [x] `units.js` §1bis : 16 héros couverts + darkBoss ≠ bossAppear. 658 vertes.
4. [x] cache-bump : hero-barks v8→v9, battle v31→v32, CACHE_VERSION v153→v154.
5. [x] check_cache_versions + pwa-smoke + check_doc_modules verts.
6. [x] smoke `bark boss combat` (13 scénarios) vert.
7. [x] Doc : 11 §11.9.2 ✅ + roadmap Phase 3 row ✅.
8. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Code servi → cache-bump obligatoire (§8). Fait.
- Défensif : héros sans `darkBoss` → silence (pas de repli bossAppear). Le
  chemin standard (boss non-Ténébreux) garde `bossAppear` inchangé.
- Cosmétique pur : aucun impact gameplay/balance.
