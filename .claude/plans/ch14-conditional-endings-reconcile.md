# Plan — Réconcilier Ch.14 « fins conditionnelles » (5 axes + pact/defiance)

> Item Phase 1 roadmap (§1.4 💡6 + table « Compléter symétrie pact/defiance +
> variantes texte fin (5 axes) »). **Doc-only.** Date : 2026-06-14.

## Audit doc↔code (AVANT écriture) — déjà LIVRÉ

`js/endgame.js` `_victorySpeechVariants(ctx)` implémente **les 5 axes** :
- (a) Maison → `HOUSE_LAST_WORD` (l.113-122) ✅
- (b) héros solo/duo + clin d'œil Maison canon (l.39-62) ✅ (déjà doc ✅)
- (c) signatures gryff/slyth/raven/pouf (l.78-97) ✅
- (d) Éclats `eclatsComplete` (l.67-73) ✅
- (e) **pact ET defiance** (l.101-110) ✅ — symétrie complète

`tests/units.js` §11 (l.1257-1316) teste les 5 axes, dont defiance (l.1286-1291).
→ `node tests/units.js` vert (646 assertions).

**Conclusion** : pas de code à écrire. La dérive est dans Ch.14 qui marquait
encore (a)(c)(d) et defiance en `💡`. Réconciliation doc-only.

## Étapes

1. [x] Ch.14 §14.0 (l.53) : « une seule variante » → 5 axes codés.
2. [x] Ch.14 §14.1.1 (l.79, 84-86) : B `💡` → `✅` (texte livré).
3. [x] Ch.14 §14.2.2 : header + (a)(c)(d) `💡`→`✅` ; (e) defiance `💡`→`✅`.
4. [x] Roadmap §1.4 💡6 + table Phase 1 → ✅ Fait (date).
5. [x] `node tools/check_doc_modules.js` exit 0 ; `node tests/units.js` vert.
6. [ ] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only (`docs/**/*.md`) → **pas** de cache bump (aucun js/css touché),
  smoke non requis (§7/§8). units.js déjà vert (preuve du livré).
- Surgical : on flippe des marqueurs de statut, on ne réécrit pas le contenu.
- Reste hors-scope (Phase 2, 🟡) : porter les variantes dans la **cinématique**
  multi-pages (`cinematics.js`) — non concerné ici.
