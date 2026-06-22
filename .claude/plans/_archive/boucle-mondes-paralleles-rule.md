# Plan — Règle canon « Boucle Ténébreuse ↔ Mondes Parallèles »

> Item Phase 1 de `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` (§1.3 ligne
> « Boucle ↔ Mondes Parallèles » + §1.5). Réconciliation doc↔code, **doc-only**.
> Date : 2026-06-14.

## Contexte

Les deux systèmes de rejouabilité sont présentés comme « deux axes opposés »
(Boucle = vertical/introspectif ; Mondes Parallèles = latéral/social) MAIS
aucune interaction n'était définie. Le `❓ À arbitrer` de
[11 §11.5](../../docs/histoire/11-mondes-paralleles.md) (lignes 201-205) restait
ouvert : « un Voyageur peut-il visiter un château en Boucle ? ».

## Audit doc↔code (AVANT écriture)

- `js/multiplayer-visits.js` `mpListAvailableHosts` : **aucun filtre** sur
  `floor` ni `victoryAchieved` → un hôte en Boucle (ét. 11+) est listé.
- `js/portal-matchmaking.js` : affiche `Étage ${floor}` sans gate.
- `js/visit-channel.js engageAstralCombat` (l.561) : tire le pool de monstres
  par `currentFloor` (du donjon distant appliqué), sans restriction Boucle.
- `js/save-visit-snapshot.js` : snapshot **lecture seule** ; la save du
  visiteur n'est jamais mutée ; mort astrale = éjection (`battle-death.js`
  `_finishAstralCombat`).

**Conclusion** : mécaniquement, le crossover incident est **déjà permis** —
on peut visiter un hôte en Boucle, on voit son donjon plus profond, et **rien
de la Boucle ne se propage** au visiteur. Aucune interaction *spéciale* conçue.

## Décision utilisateur (AskUserQuestion, 2026-06-14)

- **Règle canon** : « Isolés, crossover incident OK » — axes conceptuellement
  indépendants, aucune interaction spéciale conçue ; on assume le crossover
  incident déjà permis par le code (visite d'un hôte en Boucle → donjon plus
  profond, zéro propagation). **Fidèle au code, zéro changement js/.**
- **Ancrage** : §11.5 (foyer canon, résout le ❓) + cross-links depuis
  06 §6.7.2 (Gardien / PNJ de la Boucle) et note symétrique §11.10.

⚠️ Ratification de canon (💡→✅) actée par l'utilisateur. Pas d'autre lore touché.

## Étapes

1. [x] Audit doc↔code (ci-dessus) → vérifier l'absence de gate. **Vérifié.**
2. [x] Demander la décision via AskUserQuestion. **Fait.**
3. [x] 11 §11.5 : remplacer le `❓ À arbitrer` (l.201-205) par la **règle canon
   ratifiée** (✅), avec mention explicite du crossover incident permis.
   → verify : plus de `❓` sur ce point en §11.5 ; renvoi vers 06 §6.7.2.
4. [x] 11 §11.10 : ajuster la note symétrique (l.653-669) — marquer la règle
   ✅ ratifiée + renvoi vers §11.5 (sans toucher au ❓ Ironman distinct).
   → verify : cohérence des deux mentions.
5. [x] 06 §6.7.2 (Gardien de la Boucle) : cross-link vers 11 §11.5 (règle
   d'isolation Boucle ↔ Voyageur).
   → verify : lien présent.
6. [x] Roadmap : marquer ✅ Fait (date) dans §1.3, §1.5 et table Phase 1.
   → verify : statut ✅ + date.
7. [x] `node tools/check_doc_modules.js` reste vert (exit 0).
8. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only (`docs/**/*.md`) → **pas** de cache bump, smoke non requis (§7/§8).
- `node tools/check_doc_modules.js` doit rester exit 0.
