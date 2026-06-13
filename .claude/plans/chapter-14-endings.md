# Plan — Chapitre 14 : Scénarios de fin & post-game

**Statut :** 🟩 en cours · branche `claude/hogwarth-chapter-14-endings-hg6y4l`
(ÉTAPE 1/2 doc) → P1 implémentée sur `claude/hogwarth-ch14-p1-victory-variants`.

> Tâche : créer & finaliser le **Chapitre 14** comme pilier **conclusion &
> rejouabilité**. ÉTAPE 1 = contenu narratif (→ `docs/histoire/14-scenarios-de-fin.md`).
> ÉTAPE 2 = plan d'implémentation (→ **dans le même fichier**, section « ÉTAPE 2 »,
> modèle du chapitre 12).
>
> **Nature du livrable (doc) : documentation pure.** Aucun fichier servi au navigateur
> (`js/**`, `css/**`, `sw.js`, `index.html`) n'est touché → **pas de bump de
> cache** (guidelines §8), **pas de smoke test** (guidelines §7, exception doc).
>
> **⚠️ Les phases d'implémentation (P1+) touchent `js/**` / `css/**`** → bump de
> cache PWA + `node tests/smoke.js` obligatoires (guidelines §7/§8).

---

## 0. Contrainte cardinale — respecter le canon existant

Le **jeu** implémente déjà la fin de l'Acte III et le post-game. À NE PAS
contredire (vérifié dans le code) :

- ✅ **Cinématique de victoire** : `checkVictoryTrigger('voldemort_revenu')`
  (`js/endgame.js`) → `victoryAchieved=true`, `victoryAt`, modale `#victory-modal`
  (titre « L'Ombre s'efface », discours de Dumbledore, recap, boutons Continuer /
  Retour au menu). **Une seule variante conditionnelle existe** : ton froid si
  `slythPactChoice === 'pact'`.
- ✅ **Boucle Ténébreuse** = descente continue **infinie** (`effectiveFloor`,
  recyclage, Mythe 17 → Apothéose 18 → série ★ N génératrice, gold-sink).
- ✅ **`accumulatedEclats`** (+1 par nouvel étage de Boucle le plus profond),
  **`loopNumber`** dérivé (`ceil((deepest-10)/10)`), HUD « 🌀 Boucle N — 🔹 X Éclats ».
- ✅ **Briser le Cycle** (V3, `js/break-cycle.js`) : quête secrète **non-gating** à
  4 jalons (Entendre/Porter/Affronter/Choisir), seuil `BRISER_ECLAT_SEUIL = 15`,
  boss-miroir `reflet_mythe`, flag persistant **`cycleBroken`**, modale
  `#break-cycle-overlay`, cinématique 3 pages. La Boucle **reste ouverte** après.
- ✅ **Codex** (`js/codex.js`) entrées de fin : `cle_de_voute`, `porteur_eclats`,
  `echo_signature`, `boucle_tenebreuse`, `briser_cycle`, `cycle_brise`, `tenebreux`,
  `voix_{godric,salazar,rowena,helga}`, `ruines_anciennes`. Types de condition
  `victory` / `eclatLoop` / `cycleBroken`.
- ✅ **Ironman** : permadeath stricte → `showIronmanResult()` + Hall of Fame.
- ✅ **Garde-fou de trame** (03 §3.6, 04 §4.7) : « Il n'y a pas de fin
  scénarisée » ; aucune quête/signature ne gate l'escalier ; Briser le Cycle est
  **cosmétique**.

**Décision (identique au ch.11).** On **n'invalide pas** le modèle « fin
ouverte ». On le **garde comme vérité ✅** et on **superpose** la taxonomie de
fins demandée par la tâche (fin normale / conditionnelles / vraie fin) en la
posant explicitement comme **couches de texte/cosmétique** marquées 💡, qui ne
branchent JAMAIS l'arc et ne gatent rien. `endingType` est proposé comme un
**label dérivé** (Codex/épilogue), pas un flag de gating ; le flag de vraie fin
**existe déjà** et s'appelle `cycleBroken` (la tâche dit « brokenCycle » → on
note le nom réel).

---

## 1. Étapes & vérification

1. ✅ Explorer le code (endgame.js, break-cycle.js, codex.js, state.js) et les
   chapitres 01/03/04/11/12/13 → fact-sheet établie.
   - vérif : identifiants exacts cités (flags, IDs DOM, strings).
2. ✅ Écrire `docs/histoire/14-scenarios-de-fin.md` (ÉTAPE 1 + ÉTAPE 2).
   - vérif : marquage ✅/💡/❓ rigoureux ; tables de synthèse présentes ;
     aucune contradiction avec le code ; renvois croisés cohérents.
3. ✅ Mettre à jour `docs/README.md` (index → ligne 14, statut global).
   - vérif : lien valide, table cohérente.
4. ✅ Relecture cohérence (noms de flags réels, non-gating réaffirmé).
5. ⬜ Commit + push sur la branche.
   - vérif : `git status` propre, push OK.

## 2. Écarts / décisions notées

- La tâche présuppose des « fins multiples » structurelles (branches par Maison,
  héros, quêtes, choix moraux) + NG+. Le jeu est **délibérément** à fin ouverte.
  → Résolu par la couche 💡 (variantes de **texte** de la même cinématique) +
  réaffirmation du garde-fou. NG+ traité en ❓/💡 (non implémenté ; design opt-in
  minimal proposé, respectant la descente continue).
- `endingType` : **nouveau** champ proposé (💡), dérivé des flags existants pour
  l'épilogue/Codex — n'est pas un gate. `cycleBroken` = vraie fin (✅ existe).
- Pas de NG+ « reset » dans le jeu : la Boucle EST un soft-NG+ continu. Un vrai
  NG+ avec héritage est une proposition.

---

## 3. Phase P1 — Variantes conditionnelles du discours de victoire (✅ implémentée)

Branche `claude/hogwarth-ch14-p1-victory-variants`. Périmètre **strict** : on
enrichit uniquement le **texte** de `#victory-modal` (aucune structure d'arc
touchée, aucun gate). Modèle du bloc `pactCold` déjà présent.

### Étapes & vérif

1. ✅ Helper pur `_victorySpeechVariants(ctx)` extrait au top-level de
   `js/endgame.js` (testable). Retourne les blocs HTML à concaténer au discours
   de base, dans l'ordre : Éclats → héritage Signatures → choix moral (Pacte) →
   dernier mot de Dumbledore par Maison. Tout défensif (champ absent → bloc omis).
   - vérif : `tests/units.js` section 11 (matrice base / Maison ×4 / pact /
     defiance / éclats / 4 signatures / cumul) → **vert**.
2. ✅ `showVictoryScreen()` construit `ctx` depuis les flags existants
   (`chosenHouse`, `slythPactChoice`, `<house>SignatureDone`,
   `completedQuests.has('eclats_clef_voute')`) et délègue au helper. L'ancien
   ternaire `pactCold` est absorbé par le helper (variante `pact` conservée à
   l'identique).
   - vérif : scénario smoke `scenarioVictorySpeechVariants` (`tests/scenarios/houses.js`)
     force `victoryAchieved` + chaque Maison et assert le contenu de
     `#victory-speech` → **vert** ; régression `scenarioHouseSignatureQuests` T6
     (pact/defiance) → **vert**.
3. ✅ Variantes livrées :
   - **(a) Maison** : 4 répliques de clôture (§14.2.2(a)).
   - **(c) Signatures** : paragraphe « héritage » nommant Bannière de Godric /
     Pacte des Cachots / Codex de Rowena / Médaillon de Helga.
   - **(d) Éclats** : révélation « le verrou retenait deux choses, pas une » si
     `eclats_clef_voute` terminée.
   - **(e) Choix moral** : `pact` (froid, existant) + `defiance` (reconnaissance,
     **ajouté**, en miroir).
4. ✅ CSS additif (`css/style.css`) : classes `.victory-speech-{house,warm,eclats,legacy}`
   (filet de séparation discret, mêmes codes que `.victory-speech-cold`).
5. ✅ Garde-fou guidelines : bump cache PWA (`endgame.js` 4→5, `style.css` 36→37,
   `CACHE_VERSION` v117→v118) ; `node tests/units.js` + `node tests/smoke.js` +
   `node tests/pwa-smoke.js` verts ; skill `commit-guard`.
   - vérif : `check_cache_versions.js` OK.

> **Hors-scope P1** (laissé pour P2+) : lignes PNJ post-victoire (P2), `endingType`
> + entrée Codex `epilogue` (P3), variantes par héros solo/duo §14.2.2(b) (réutilise
> les barks — non demandé ici), assets de fin (P4), NG+ (P5).
