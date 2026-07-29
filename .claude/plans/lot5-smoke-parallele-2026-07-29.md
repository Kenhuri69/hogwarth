# Lot 5 — P2 : parallélisation de la suite smoke

**Branche :** `claude/premier-plan-finaliser-ocbn0z` (repartie de `master` après
le merge de la PR #743 — le lot 4 est livré)
**Statut :** ✅ clos — **PR #744 mergée** (CI verte, job en 3 min 17 s)
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
5. [x] Suite **complète** en parallèle → **285/285 verts en 22 min 23 s**
   (le runner en compte 285, pas 281 comme l'annonçait la revue). Cible
   « < 5 min » **non atteinte** et hors de portée de ce levier — cf. §6.2.
6. [x] CI (`.github/workflows/test.yml`) : **aucun changement** — `ubuntu-latest`
   a 4 cœurs, le défaut s'y applique tel quel. Figer un nombre en dur dans le
   workflow le désynchroniserait du runner le jour où la machine change.
7. [x] Doc : `CLAUDE.md` (section tests) + revue §4 P2 marquée traitée.
8. [x] Garde-fous : `units.js`, `pwa-smoke.js`, `check_doc_modules.js`.
   Pas de bump PWA (`tests/**` n'est pas servi au navigateur — §8 N/A).
9. [x] Commit → push → **PR #744**, CI verte, **mergée** — la #743 étant mergée, branche repartie de `master` (§6).

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
- **La CI a trouvé une course que la machine locale cachait.** `scenarioCombatKeyboard`
  a échoué en CI (« la cible 1 doit subir des dégâts (avant 40, après 40) ») alors
  qu'il passe 3/3 en local. Cause réelle, trouvée en lisant le code plutôt qu'en
  relançant : `startBattle` arme `maybeShowCombatTutorial` à **+350 ms**
  (`js/battle.js`), dont l'overlay écoute `keydown` en **capture** et appelle
  `stopPropagation` (`js/help-tour.js:328`) — il avale donc tous les raccourcis
  de jeu. Le scénario envoie ses touches dans cette fenêtre : il gagne la course
  sur une machine au repos, il la perd dès que la machine est chargée.
  **Ce n'est pas une régression de la parallélisation** : c'est une course
  préexistante que n'importe quelle machine lente déclenche — la CI l'a
  simplement rendue visible. Le harnais opt-out déjà le tour guidé
  (`hh_help_tour_optout`) mais ce chemin-là n'était pas couvert.
  Correctif : `startNewGame` désarme le tuto de combat par défaut
  (`combatTutorialSeen = true`), option `combatTutorial: true` pour le seul
  scénario qui le teste (`scenarioOnboarding`). **2 fichiers de test touchés,
  aucun assert affaibli, aucun timeout gonflé.**
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

### 6.2 Suite complète (285 scénarios, 4 cœurs, machine au repos)

| | temps | résultat |
|---|---|---|
| avant (séquentiel, mesuré par la revue) | ~90 min | — |
| après (défaut = 4 jobs) | **22 min 23 s** | **285/285 verts** |

Soit **×4,0**, cohérent avec le nombre de cœurs.

**La cible de la revue (« < 5 min en local ») n'est pas atteinte, et ne peut pas
l'être par ce levier seul.** Sur 4 cœurs, ×4 est le plafond : 22 min est le
résultat attendu, pas une contre-performance. Descendre sous 5 min demanderait
soit ~16 workers (machine plus grosse — le gain suivrait, les scénarios passant
l'essentiel de leur temps à attendre le navigateur), soit de réduire le coût
unitaire d'un scénario (~19 s), ce qui est un autre chantier : chacun relance un
Chromium et rejoue l'intro complète. Ce lot rend la règle §7 **applicable**
(22 min, on peut lancer la suite avant un commit) sans la rendre confortable.

> Note de mesure : une première tentative a donné 109 scénarios en ~19 min — je
> lançais d'autres tests en parallèle pendant la mesure. Chiffre jeté, mesure
> refaite machine au repos. Un banc qu'on pollue soi-même ne mesure rien.

### 6.3 CI

Job « Smoke + PWA » **vert** sur le head de la PR #744 : **3 min 17 s** de bout
en bout (05:04:49 → 05:08:06), contre ~4,5 min relevés par la revue avant ce
lot. Le chiffre couvre tout le job (checkout, npm install, installation de
Chromium, garde-fous, units, smoke, pwa-smoke) — le gain porte sur la seule
étape smoke, il est donc dilué ici. Aucun changement de workflow.

### 6.4 Garde-fous

`units.js` (1 130 assertions) · `pwa-smoke.js` · `check_doc_modules.js` ·
ESLint (0 erreur ; 2 avertissements `no-unused-vars` préexistants, hors lot).
