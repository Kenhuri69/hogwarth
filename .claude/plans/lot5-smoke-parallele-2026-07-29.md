# Lot 5 — P2 : parallélisation de la suite smoke

**Branche :** `claude/premier-plan-finaliser-ocbn0z` (repartie de `master` après
le merge de la PR #743 — le lot 4 est livré)
**Statut :** 🟩 en cours
**Source :** `revue-sources-contenu-2026-07-28.md` §4 P2 (rang 10). Lot 5 après
les lots 1 (A2·C3·C4), 2 (A1·P1), 3 (E1) et 4 (E4).

---

## 1. Constat

281 scénarios exécutés **séquentiellement**, chacun relançant son propre
Chromium. La CI tient (~4,5 min, `timeout-minutes: 25`) mais **en local le coût
est prohibitif** (~90 min dans ce bac à sable) — ce qui pousse au contournement
de la règle §7 des guidelines (« test headless obligatoire avant commit »).
C'est le vrai coût : une règle qu'on n'a pas les moyens d'appliquer est une
règle qu'on n'applique pas.

Le runner (`tests/smoke.js`) est une boucle `for` de 6 lignes :

```js
for (const s of selected) { await s(); }
```

Les scénarios sont **déjà indépendants** : chacun lance son navigateur, aucun
n'écrit sur le disque ni n'ouvre de port (vérifié : aucun `createServer` /
`listen(` / `writeFileSync` / `mkdtemp` dans `tests/scenarios/`). Aucune refonte
des tests n'est nécessaire — seul le runner change.

## 2. Décision de conception

**Pool de promesses in-process**, pas de processus enfants.

- Playwright gère sans problème N navigateurs dans un même process Node ; les
  processus enfants ajouteraient un protocole d'agrégation pour rien.
- Le vrai obstacle n'est pas l'exécution mais **la sortie** : 281 scénarios qui
  écrivent en `console.log` en parallèle produisent un log illisible.
  → **`AsyncLocalStorage`** : chaque scénario s'exécute dans un contexte
  asynchrone portant son propre tampon ; `console.log` est routé vers le tampon
  du scénario courant. **Zéro modification des 281 scénarios.**
- **Sortie déterministe** : les tampons sont vidés dans l'ordre de la liste
  (pointeur d'écriture), pas dans l'ordre d'achèvement. Deux exécutions
  successives donnent le même log, ce qui préserve la lisibilité des diffs de CI.
- **Sémantique d'échec préservée** : à la première erreur on cesse d'ordonnancer,
  on laisse finir les scénarios en vol, on vide les tampons dans l'ordre, puis
  on affiche `❌ Échec : …` et `exit 1` — comme aujourd'hui.
- **`--jobs=1` reste possible** : mode debug strictement équivalent à l'existant.

## 3. Étapes

1. [x] Plan écrit (ce fichier).
2. [x] Mesure d'avant : chronométrer une sélection fixe en séquentiel →
   **vérifier** : temps de référence + tous verts.
3. [x] Runner parallèle (`tests/smoke.js`) : pool `--jobs=N` (défaut =
   parallélisme disponible, borné), tampons `AsyncLocalStorage`, vidage ordonné,
   arrêt à la première erreur → **vérifier** : même sélection, **mêmes lignes de
   log** qu'en séquentiel (diff vide hors chronos), temps divisé.
4. [x] Calibrer `--jobs` : mesurer 1 / 2 / 4 / 6 / 8 sur la même sélection →
   **vérifier** : choisir le défaut sur la mesure, pas sur l'intuition.
   *(Résultat : l'échantillon de 6 est trop petit pour calibrer au-delà de 4 —
   voir §5. Défaut retenu = parallélisme disponible, borné à 8.)*
5. [ ] Suite **complète** en parallèle → **vérifier** : 281/281 verts et temps
   total mesuré (cible §4 de la revue : < 5 min ; à confirmer sur 4 cœurs).
6. [ ] CI (`.github/workflows/test.yml`) : expliciter le nombre de jobs si la
   mesure le justifie.
7. [ ] Doc : `CLAUDE.md` (section tests) + revue §4 P2 marquée traitée.
8. [ ] Garde-fous : `units.js`, `pwa-smoke.js`, `check_doc_modules.js`.
   Pas de bump PWA (`tests/**` n'est pas servi au navigateur — §8 N/A).
9. [ ] Commit → push → PR draft (nouvelle PR : la #743 est mergée, §6).

## 4. Garde-fous

- **Aucun scénario modifié.** Si un scénario doit être touché pour passer en
  parallèle, c'est qu'il n'était pas indépendant : le noter ici plutôt que de le
  corriger en douce.
- **Pas de flakiness introduite** : la parallélisation ne doit pas transformer un
  test déterministe en test à horloge. Les timeouts (`TIMEOUTS` du harnais)
  restent inchangés ; si un scénario devient instable sous charge, c'est une
  donnée à consigner, pas à masquer par un timeout gonflé.
- **Surgical (§3)** : `tests/smoke.js` seul. `tests/select.js` consomme le
  runner par `spawnSync` + code de sortie — non impacté.

## 5. Écarts constatés en cours de route

- Le filtre `audio save` retenu comme échantillon ne sélectionne que **6**
  scénarios (le matching porte sur le nom de fonction, pas sur le domaine) —
  échantillon suffisant pour l'accélération, mais ce n'est pas 11 comme espéré.
- `--jobs=1` n'est pas qu'un mode debug théorique : il a servi à **prouver** que
  le nouveau runner reproduit l'ancien à l'octet près (diff vide).
- **La calibration par échantillon a échoué, et c'est instructif.** Sur 6
  scénarios, `--jobs=6` et `--jobs=8` ont la même concurrence effective (tout
  part en même temps) — ils auraient dû donner le même temps. Mesure : 26,1 s
  et 17,3 s. Cet écart de 40 % entre deux runs équivalents dit que la variance
  de la machine domine le signal à cette échelle. Conclusion tirée : les
  chiffres 4/6/8 de §6.1 ne prouvent **rien** sur le rendement marginal, seuls
  1→2→4 (où la concurrence change vraiment) sont exploitables. Le défaut est
  donc fixé sur un raisonnement vérifiable — un scénario passe son temps à
  *attendre* le navigateur, donc on peut en lancer autant que de cœurs sans
  saturer le process Node — et validé par la suite complète (§6.2), pas par
  l'échantillon.

## 6. Mesures

### 6.1 Accélération (6 scénarios, machine à 4 cœurs)

| `--jobs` | temps | accélération | sortie |
|---|---|---|---|
| référence (ancien runner) | 1 min 31,6 s | — | — |
| 1 | 1 min 21,8 s | ×1,00 | **identique** à la référence (diff vide) |
| 2 | 42,3 s | ×1,94 | **identique** (hors bandeau de parallélisme) |
| 4 | 28,2 s | ×2,90 | **identique** |

L'écart entre la référence (91,6 s) et `--jobs=1` (81,8 s) est du bruit de
machine, pas un gain : les deux exécutent la même boucle séquentielle.

**La sortie est vérifiée identique par `diff`, pas supposée.** C'est la
propriété qui rend la parallélisation acceptable : un log qui change d'un run
à l'autre ferait perdre en lisibilité ce qu'on gagne en temps.
