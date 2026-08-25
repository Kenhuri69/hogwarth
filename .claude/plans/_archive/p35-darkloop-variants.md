# Plan — P3.5 (amorce sûre) : enrichir les variantes de beat `darkLoop`

> Suite de [`rc-polish-remaining.md`](./rc-polish-remaining.md) §P3.5 et du
> protocole [`docs/playtest-3-boucles.md`](../../../docs/playtest-3-boucles.md).
> Le playtest humain reste à mener, mais son §5 nomme **le levier le moins
> risqué et préféré** : *« enrichir les variantes (plus de répliques par beat,
> tirage anti-répétition déjà en place) plutôt que changer la fréquence »*.
>
> Date : 2026-06-21 · **Plan vivant** (guidelines §5). ⬜ à faire · 🔄 · ✅.

## Constat (vérifié dans le code)
- `darkLoop` se déclenche **1× par palier de Boucle** (`movement-floors.js:261`,
  `once: 'darkloop:'+ln`) → **3× sur 3 Boucles**, chaque fois via
  `pickHeroBark` qui tire **uniformément au hasard** dans le pool du héros
  (`hero-barks.js:295-297`).
- Chaque héros n'a **qu'UNE** ligne `darkLoop` → le tirage aléatoire renvoie
  toujours la même phrase → répétition mot-pour-mot sur les Boucles 2-3
  (exactement l'hypothèse de lassitude du playtest).
- 16 héros : harry, hermione, draco, cho, cedric, celeste, iris, maxence,
  anastasia, louis, jeanne, margaux, agathe, olivier, nathalie, chatillon.

## Décision de périmètre (surgical, §2/§3)
- **Seulement `darkLoop`** (le beat structurel garanti répété 3× dans le
  scénario du playtest). On porte chaque pool de **1 → 3 variantes**.
- `loopEcho` / `darkBoss` / `darkBossDown` **non touchés** : événementiels /
  one-shot par variante, moins métronomiques → hors-scope (éviter la largeur
  spéculative). Réévaluables si le playtest les pointe.
- **Aucune** modif de cadence (`_BARK_COOLDOWN_MS` inchangé), **aucune** valeur
  d'équilibrage, **aucun** helper pur touché (logique de tirage intacte).

## Étapes
1. ✅ Vérifié : aucun test ne fige le contenu/longueur des pools `darkLoop`
   héros (`misc.js` teste `Object.keys(HERO_BARKS).length===16` = nb héros ;
   les `darkLoopLines` de `npc.js` concernent les **PNJ**, pas les héros).
2. ✅ Ajouté 2 variantes `darkLoop` par héros (×16 → **48 lignes**, 3/héros),
   en voix (ton calqué + identité §05). `node --check` OK.
3. ✅ **cache-bump** : `hero-barks.js?v=12→13` (index.html + sw.js),
   `CACHE_VERSION hogwarth-v213→v214`. pwa-smoke confirme cache « v214 ».
4. ✅ Critères de sortie **tous verts** : units (946) · smoke (**263/263**) ·
   pwa-smoke (cache v214) · check_doc_modules (97) · check_difficulty (stable) ·
   check_cache_versions (✅ post-commit, bump hero-barks v13 détecté).
5. ✅ Reporté dans `rc-polish-remaining.md` (P3.5 → amorce variété) +
   `docs/playtest-3-boucles.md` (encart §6).

## Risques / garde-fous
- **Pré-empte légèrement** le playtest : assumé et borné — c'est le levier
  explicitement préféré du §5, purement additif, et il rend l'infra de variété
  (tirage aléatoire) réellement fonctionnelle (un pool de 1 la neutralisait).
- Cosmétique/défensif : un héros sans variante resterait silencieux ; ici tous
  gardent ≥ 1 ligne. Zéro régression de logique.
