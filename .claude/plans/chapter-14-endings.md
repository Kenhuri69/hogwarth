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

---

## 4. Phase P2 — Lignes de dialogue PNJ post-victoire (✅ implémentée)

Branche `claude/hogwarth-ch14-p2-npc-postvictory`. Périmètre **strict** :
cosmétique, **non-gating**, **additif**. Aucun écran ajouté, rien de gaté, ni la
structure de l'arc ni la Boucle touchées. On ajoute uniquement des **lignes de
dialogue conditionnelles** gardées par `victoryAchieved`, sur le modèle des
suffixes muets existants de `npc-dialog.js` (`_eclatSuffixPages`,
`_darkLoopSuffixPages`, `_reputationSuffixPages`).

### Étapes & vérif

1. ✅ Champ `postVictoryLines` (2 répliques) ajouté à **Kingsley** (8/18),
   **Bill** (9/19), **Sirius** (10/20) dans `js/npcs.js` — ton moins martial,
   plus grave (registre §14.3.2 : ouverture « Tu es redescendu. Pourquoi ? »).
   - vérif : scénario smoke `scenarioNpcPostVictory` T `hasFields` → **vert**.
2. ✅ Helper **pur** `pickPostVictoryLine(lines, ctx)` (testable) extrait dans
   `npc-dialog.js` : choisit la réplique selon `{ victoryAchieved }` + `rng`
   injectable, aucune lecture de global. Wrapper `_postVictorySuffixPages(npc)`
   lit `victoryAchieved` + `currentFloor` et appende un suffixe muet via le
   patron de `_darkLoopSuffixPages`.
   - vérif : `tests/units.js` section 6ter (gate victoire / rng / string /
     tableau vide) → **vert** ; `scenarioNpcPostVictory` (pur + intégration) → **vert**.
3. ✅ **Complémentarité darkLoop** (décision de qualité, non-régression) : le
   suffixe « après » ne s'appende **pas** en Boucle profonde
   (`currentFloor >= _DARK_LOOP_FLOOR` = 18), où `darkLoopLines` prend déjà le
   relais — les deux variantes restent mutuellement exclusives (pas de double
   beat). Le gate de fin reste `victoryAchieved` (fidèle à la tâche), la garde
   d'étage est une mesure additive de non-redondance au call-site.
   - vérif : `scenarioNpcPostVictory` `deepLoop === 0` (étage 18) → **vert**.
4. ✅ **Gardien de la Boucle** (`gardien_boucle`) : aucune modif. Son `greeting`
   (« Tu reviens. Tous reviennent — c'est le sens de la Boucle. ») **incarne
   déjà** la première voix de l'après ; il n'apparaît que post-victoire (étage
   11+). Pas de `postVictoryLines` (conditionnel inutile : toujours post-victoire).
   Ses quêtes de purge sont intactes.
5. ✅ Garde-fou guidelines : `npcs.js`/`npc-dialog.js` servis au navigateur →
   bump cache PWA (skill `cache-bump`) ; `node tests/units.js` + `node tests/smoke.js`
   verts ; skill `commit-guard`.

### Point tranché — beat « Grande Salle » (§14.3.2, Point à trancher 2)

> **Laissé hors-scope** (conforme à la consigne « NE PAS l'implémenter sans
> validation »). Le jeu ne « remonte » pas réellement en haut du château après
> la victoire — il n'existe pas d'écran ni d'étage-scène « Grande Salle » où
> épingler un mot de Dumbledore depuis son cadre. Aucun angle propre et
> strictement cosmétique n'a été identifié sans ajouter un écran (hors périmètre
> P2). Le Gardien de la Boucle reste la seule voix de transition.

> **Hors-scope P2** (laissé pour P3+) : `endingType` + entrée Codex `epilogue`
> (P3), assets de fin (P4), NG+ (P5).

---

## 5. Phase P3 — `endingType` + entrée Codex `epilogue` (✅ implémentée)

Branche `claude/hogwarth-ch14-p3-ending-epilogue`. Périmètre **strict** : additif,
défensif, **non-gating**. `endingType` est un **label dérivé** (jamais un gate) ;
l'épilogue est une **entrée Codex** (pas un écran neuf). Décision (Point à trancher
5) : `endingType` est **persisté** (forward-looking pour un futur profil NG+) et
**réconcilié** au chargement depuis les flags.

### Étapes & vérif

1. ✅ Helper **pur** `computeEndingType(ctx)` (`endgame.js`, top-level, testable) :
   priorité `cycle_broken` > `victory_pact` > `victory` > `null`. Helper d'écriture
   `refreshEndingType()` (lit les globals, assigne `endingType`).
   - vérif : `tests/units.js` §11bis (matrice null/victory/victory_pact/cycle_broken
     + priorité) → **vert**.
2. ✅ Champ `endingType` (`state.js`, `let endingType = null;`) sérialisé/restauré
   (`save.js` : ajout au payload + restauration + **back-fill** via
   `refreshEndingType()` pour les saves antérieures au champ).
   - vérif : `scenarioEndingEpilogue` round-trip `cycle_broken` + back-fill
     legacy `victory_pact` → **vert**.
3. ✅ Posé/réconcilié aux deux hooks de fin : `checkVictoryTrigger` (`endgame.js`)
   après la victoire, et `confirmBreakCycle` (`break-cycle.js`) après `cycleBroken`.
   - vérif : `scenarioEndingEpilogue` (victoire→`victory`, pacte→`victory_pact`,
     Briser→`cycle_broken`) → **vert**.
4. ✅ **Robinet Codex `ending`** (`codex.js — _codexCondMet`) : `ctx.endingType ===
   value`. Une ligne, cohérente avec `victory`/`cycleBroken`. `endingType` exposé
   dans le `ctx` Codex (`ui-codex.js`). Fait d'`endingType` la **source unique** de
   l'épilogue (sinon le champ serait orphelin jusqu'à P5).
   - vérif : `tests/units.js` §11ter (épilogue locked→veiled→revealed selon
     `endingType`) → **vert**.
5. ✅ Entrée Codex **`epilogue`** (`codex.js`, 🔥 Histoire, icône 📜) : ouverte à la
   1ʳᵉ victoire (`victory`), révélée quand `ending = cycle_broken`. Texte
   veiled (base) / revealed (fin accomplie) + **note marginale `variants.house`**
   par Maison (réutilise le format Codex existant). Présent, 2ᵉ personne (§14.7).
   Aucun asset PNG requis (icône emoji, comme la plupart des entrées).
6. ✅ Garde-fou guidelines : 6 JS servis modifiés (`state.js`, `endgame.js`,
   `break-cycle.js`, `save.js`, `codex.js`, `ui-codex.js`) → bump cache PWA
   (skill `cache-bump`) ; `node tests/units.js` + `node tests/smoke.js` +
   `node tests/pwa-smoke.js` verts ; skill `commit-guard`.

> **Décision de conception** : l'épilogue se révèle via le robinet `ending`
> (= `endingType`) plutôt que directement `cycleBroken`, pour que le label dérivé
> soit la **source unique** de la fin (cohérent §A.2). La nuance `victory_pact`
> reste portée par `endingType` (persistée) et déjà reflétée dans le discours de
> victoire (P1) ; l'épilogue Codex la traite en texte `veiled` (comme `victory`),
> la Maison colorant via la note marginale.

> **Hors-scope P3** (laissé pour P4+) : assets de fin (illustrations + sample
> audio C, P4), NG+ opt-in (profil + titres + Codex de profil, P5).

---

## 6. Phase P4 — Assets de fin (câblage défensif + prompts) (✅ implémentée)

Branche `claude/hogwarth-ch14-p4-ending-assets`. Périmètre : **câbler** les
emplacements d'assets de fin de façon **défensive** (le jeu marche sans eux ;
ils s'activent dès qu'on les dépose) + **sample audio** de la cinématique C avec
repli synthèse + **prompts Gemini/Nano Banana**. **Aucune image générée par
l'agent** (hors capacité) : les visuels sont à produire via les prompts livrés.

### Étapes & vérif

1. ✅ **Illustration de victoire** — `<img id="victory-art">` (masqué) dans
   `#victory-modal` (`index.html`) ; `showVictoryScreen` (`endgame.js`) pose
   `src = img/scenes/ending_victory.jpg` avec `onload`→affiche / `onerror`→masque.
   Asset absent → modale identique à aujourd'hui.
2. ✅ **Illustration « Briser le Cycle »** — `<img id="break-cycle-art">` (masqué)
   dans `#break-cycle-overlay` ; helper `_setBreakCycleArt(src)` (`break-cycle.js`)
   l'affiche à la cinématique (`confirmBreakCycle` → `ending_break_cycle.jpg`),
   la masque à l'écran de choix et à la fermeture. Défensif (`onerror`).
3. ✅ **Sting audio de fin** — `AudioSystem.playEndingTheme()` (`audio-music.js`,
   réutilise `_loadSample`) joue `audio/ending_break.ogg` si présent, **repli
   sur `playVictory()`** sinon. `confirmBreakCycle` le préfère à `playVictory`.
   `audio/` non précaché (SWR) → pas de `?v`.
4. ✅ **Prompts Gemini** — `.claude/plans/nano-banana-prompts-endings.md` :
   `ending_victory.jpg`, `ending_break_cycle.jpg`, `epilogue.png` (icône Codex,
   + suivi 1 ligne), `ending_spiral.jpg` (⏸️ différé, pas d'écran),
   `ending_break.ogg` (brief audio, hors Gemini).
5. ✅ Tests : `scenarioEndingAssets` (`tests/scenarios/codex.js`) — éléments
   présents + masqués, `src` câblés (victoire / cinématique), réinit à la
   fermeture, `playEndingTheme` exposé/sans exception, `_ENDING_SAMPLE` correct.
6. ✅ Garde-fou guidelines : 4 fichiers servis modifiés (`index.html`,
   `endgame.js`, `break-cycle.js`, `audio-music.js`) → bump cache PWA
   (skill `cache-bump`) ; `node tests/units.js` + `node tests/smoke.js` +
   `node tests/pwa-smoke.js` verts ; skill `commit-guard`.

### Décisions / écarts

- **Icône Codex `epilogue`** : NON câblée tout de suite (`ui-codex.js` n'a pas de
  repli `onerror` sur `iconImg` → un chemin mort afficherait une image cassée).
  L'entrée garde l'emoji 📜 ; le PNG s'active par une **ligne** (`iconImg`) une
  fois généré (documenté §3 du doc de prompts). Choix surgical (ne pas toucher
  le rendu partagé du Codex).
- **`ending_spiral.jpg`** : différé — aucun écran ne porte la posture
  « Perpétuer / vertige » (`declineBreakCycle` n'affiche qu'un toast). Prompt
  fourni pour mémoire, non câblé (pas d'asset orphelin).

> **Hors-scope P4** (laissé pour P5) : NG+ opt-in — profil `localStorage`
> hors-save (titres, compteur de victoires, Codex de profil), cosmétique de
> départ. **Zéro stat héritée** (équilibrage 13). Décision produit requise.
