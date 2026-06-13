# Plan — Chapitre 14 : Scénarios de fin & post-game

**Statut :** 🟩 en cours · branche `claude/hogwarth-chapter-14-endings-hg6y4l`

> Tâche : créer & finaliser le **Chapitre 14** comme pilier **conclusion &
> rejouabilité**. ÉTAPE 1 = contenu narratif (→ `docs/histoire/14-scenarios-de-fin.md`).
> ÉTAPE 2 = plan d'implémentation (→ **dans le même fichier**, section « ÉTAPE 2 »,
> modèle du chapitre 12).
>
> **Nature du livrable : documentation pure.** Aucun fichier servi au navigateur
> (`js/**`, `css/**`, `sw.js`, `index.html`) n'est touché → **pas de bump de
> cache** (guidelines §8), **pas de smoke test** (guidelines §7, exception doc).

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
