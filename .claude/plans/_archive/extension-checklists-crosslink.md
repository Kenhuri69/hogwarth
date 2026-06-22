# Plan — Renvoi croisé entre les 3 checklists d'extension (Phase 1)

> Item Phase 1 roadmap (⚠️7 + §1.3 « 9/10/11 checklists »). Action proposée :
> **ajouter un renvoi croisé en tête de chacune**. **Doc-only.** 2026-06-14.

## Audit (AVANT écriture)

Trois checklists d'ajout parallèles, sans renvoi mutuel :
- créatures : 09 §9.11 (l.641) « Règles d'ajout de nouvelles créatures »
- lieux : 10 §10.9 (l.944) « Règles d'ajout / modification de lieux »
- variantes/boucles : 11 §11.11 (l.611) « Règles d'ajout de nouvelles variantes / boucles »

(09 référence déjà 05 §5.5 héros + skill `add-monster`/CLAUDE.md pour le
câblage technique — on garde ces pointeurs.)

## Décision de scope

Version **légère** (§1.3) = bandeau de renvoi croisé en tête de chacune.
La **fusion** en une page unique « Règles d'extension de contenu » (§1.4 💡7,
Moyenne) reste **optionnelle/hors-scope** — chirurgical d'abord.

## Étapes

1. [x] 09 §9.11 : bandeau « 🔗 Checklists d'extension liées » → 10/11 (+05).
2. [x] 10 §10.9 : même bandeau → 09/11 (+05).
3. [x] 11 §11.11 : même bandeau → 09/10 (+05).
4. [x] Roadmap : ⚠️7 + §1.3 ligne « 9/10/11 checklists » → ✅ Fait (date).
5. [x] `node tools/check_doc_modules.js` exit 0.
6. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only → pas de cache bump, smoke non requis (§7/§8).
- Additif (un bandeau), aucun contenu de checklist réécrit.
