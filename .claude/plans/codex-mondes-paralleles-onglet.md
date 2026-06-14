# Plan — Réconciliation « Codex ↔ Mondes Parallèles » (8ᵉ onglet ?)

> Item connexe Phase 1 de `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` (§1.3 ligne
> « Codex ↔ Mondes Parallèles »). **Doc-only.** Date : 2026-06-14.

## Contexte

Ch.12 portait un `❓ À arbitrer` : faut-il un **8ᵉ onglet « Voyageur »** dédié
aux Mondes Parallèles, ou ces entrées vivent-elles dans Glossaire/Objets ?

## Audit doc↔code (AVANT écriture) — la décision est DÉJÀ livrée

- `js/codex.js:317` : commentaire explicite *« Mondes Parallèles → Glossaire
  (décision : pas de 8ᵉ onglet « Voyageur ») »*.
- Les 3 entrées MP sont en `category: 'glossaire'` :
  `cheminette_inter_mondes` (l.320), `voyageur` (l.331), `mondes_paralleles`
  (l.340).
- `js/codex.js:16` liste les 7 catégories (glossaire|bestiaire|lieux|
  personnages|histoire|eclats|objets) — **pas de 8ᵉ**.
- Doc 12 §12.2 dit déjà « **sept onglets** » (l.136) — cohérent.

**Conclusion** : ce n'est PAS une ratification de lore, c'est une
**réconciliation doc↔code** (constat n°1). Le code a tranché : intégré au
Glossaire (+ Objets pour le Set Voyageur), pas de 8ᵉ onglet. → pas d'AskUser.

## Étapes

1. [x] Audit doc↔code → décision déjà shippée. **Vérifié.**
2. [x] 12 §12.2 : remplacer le `❓ À arbitrer` (l.156-160) par ✅ acté, grounding
   code (`codex.js` commentaire + `category:'glossaire'`), renvoi 11 §11.5.1.
3. [x] 12 « Points à trancher » (l.759-760) : item 1 `❓`→`✅`.
4. [x] Roadmap §1.3 : ligne « Codex ↔ Mondes Parallèles » → ✅ Résolu (date).
5. [x] `node tools/check_doc_modules.js` reste vert (exit 0). **OK.**
6. [ ] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only (`docs/**/*.md`) → pas de cache bump, smoke non requis (§7/§8).
- Surgical : on ne reword PAS les `💡` des termes MP du Glossaire (§12.7) —
  hors-scope (concerne le *texte* de lore, pas la décision d'onglet).
