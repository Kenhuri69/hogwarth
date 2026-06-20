# Revue transversale de la narration & Roadmap

> **Document de pilotage** — revue croisée des 14 chapitres `docs/histoire/`
> (+ support `docs/gameplay/`) et feuille de route pour passer en phase
> **« polish & implémentation lourde »**.
>
> Date : 2026-06-13 · Méthode : lecture intégrale des 14 chapitres + audit
> croisé avec le code réel (`js/`, `index.html`). Légende : ✅ acquis /
> solide · ⚠️ point de friction / risque · ❓ décision ou écriture en attente.

---

# ÉTAPE 1 — Revue transversale & spécifications

## 1.1 Synthèse globale de la narration

### Forces majeures ✅

| # | Force | Preuve transversale |
|---|-------|---------------------|
| ✅ 1 | **Colonne vertébrale claire et non-bloquante** | « La descente EST la quête » ; un seul verrou dur (`victoryAchieved` à l'ét. 10). Tout le reste est optionnel et greffé. Cohérent de 03 → 04 → 08 → 14. |
| ✅ 2 | **Architecture A/B/C/D = source unique de vérité** | Les 4 tranches (`floor-themes.js`) pilotent tileset + musique + ton ; reprises à l'identique par 02, 04, 09, 10, 13. Zéro dérive entre couches. |
| ✅ 3 | **Fil rouge des Éclats parfaitement filé** | 3 `eclat_voute` (Peeves / Loup-Garou / Mangemort d'Élite), 1 par acte ; révélation « double trame » en 3 temps. Suivi sans contradiction de 03 → 04 → 08 → 09 → 12 → 14. |
| ✅ 4 | **Trois thèmes porteurs, incarnés mécaniquement** | Peur = sceau (statut `fear` ↔ Patronus Maxima), Choix > Don (Pacte gris), Mythe > Revers (paliers Apothéose gatés par la victoire). Le lore et le gameplay disent la même chose. |
| ✅ 5 | **Immersion sensorielle & gradient de ton** | Familier → austère → abyssal → runique ; Codex qui se dégrade par acte ; froid surnaturel ; voix des Fondateurs qui mûrissent (murmure → silhouette → scène rejouée). |
| ✅ 6 | **Identité de Maison déclinée sans rompre l'équité** | 4 Maisons = même grille de paliers/scaling (garde-fou cardinal du Ch. 13) ; la différence passe par build + quête signature + cosmétique, jamais par la difficulté. |
| ✅ 7 | **Endgame déjà pensé jusqu'à sa « vraie fin »** | Boucle Ténébreuse (prestige ★ N infini) + « Briser le Cycle » (4 jalons, choix 🕊️/🌑) — et **tout est déjà codé** (voir §1.5). |

### Points faibles / frictions restantes ⚠️

| # | Faiblesse | Localisation | Gravité |
|---|-----------|--------------|---------|
| ✅ 1 | ~~**Dérive documentation ↔ code** (le point n°1)~~ **Résolu** (2026-06-14) : Ch.12 (Codex) + Ch.14 (fins) réconciliés (PR #511, #514) ; `CLAUDE.md` réconcilié (index des 85 modules déjà aligné — vérifié `check_doc_modules`) + dérives résiduelles corrigées (compte de modules, titre récap MP, `abyss`/`tension` plus « en réserve », priorité combat `tension`). | `CLAUDE.md` | ✅ Résolu |
| ⚠️ 2 | **`💡 proposé` vs `✅ acté` mal séparés** dans plusieurs chapitres | 09, 10, 11 | 🟠 Moyenne |
| ✅ 3 | ~~Enjeu intime par héros toujours absent~~ **Livré** (2026-06-14) : couche de beats scénarisés cosmétiques `descentStake` (6 héros jouables, seuil 3↔4) via `heroBarkScripted` ; gaps 01 §1.3 & 03 #2 tranchés, canon en 05 §5.4.2. | 01 §1.3, 03 #2, 05 §5.4.2, `hero-barks.js` | ✅ Résolu |
| ✅ 4 | ~~PNJ-clés de signature non implémentés~~ **Livré** (2026-06-13) : Chevalier Fantôme (`chevalier_godric`) 🦁 + Écho de Salazar (`echo_salazar`) 🐍 — PNJ donneurs dédiés (art `img/npc/`, dialogues, placement), signatures retirées de McGonagall/Rogue. Serdaigle/Poufsouffle restent sur Flitwick/Chourave (chefs existants). | 06, 08, `npcs.js` | ✅ Résolu |
| ✅ 5 | ~~Variante de choix asymétrique : `'defiance'` seulement proposé~~ **Résolu** (2026-06-13) : les deux branches sont câblées de bout en bout — choix joueur (`npc-dialog.js` : « Sceller le Pacte » / « Défier l'écho » → `turnInSlythSignature`), levier Voldemort (`battle.js` : buff lifesteal `pact` vs debuff −15 % `defiance`), variantes de fin (`endgame.js` : `victory_pact` vs miroir de reconnaissance), réputation dérivée. | 08, 14, `endgame.js` | ✅ Résolu |
| ✅ 6 | ~~**Localisations/statuts de boss flous**~~ **Résolu** (2026-06-14) : code source de vérité (`monsters.js`) — **Bellatrix = ét. 8** (`minFloor:8`) ; **Voldemort = 2 entrées distinctes** : `voldemort_affaibli` (ét. **9**) puis `voldemort_revenu` (ét. 10, climax à phases). Unique dérive corrigée partout : « Affaibli ét. 8 » → **ét. 9** (01, 02, 03, 04, 06, 09, 12 + `CLAUDE.md`). | 01, 03, 06 | ✅ Résolu |
| ✅ 7 | ~~**Trois checklists d'ajout parallèles non coordonnées**~~ **Résolu (2026-06-14)** : bandeau « 🔗 Checklists d'extension de contenu » avec renvoi mutuel en tête de 09 §9.11 / 10 §10.9 / 11 §11.11 (+ 05 §5.5 héros). Fusion en page unique = optionnelle (§1.4 💡7). | 09, 10, 11 | ✅ Résolu |

---

## 1.2 ⚠️ Le constat n°1 : la doc est en retard sur le code

C'est de loin l'observation la plus structurante de cette revue, et elle
**réoriente toute la roadmap**. Plusieurs systèmes documentés comme
« 🔧 à construire », « 💡 proposition » ou « ❓ à arbitrer » sont **déjà
livrés, câblés dans `index.html` et versionnés `?v=N`** :

| Élément (statut affiché dans la doc) | Module réel (vérifié) | Réalité code |
|--------------------------------------|------------------------|--------------|
| **Codex** « 🔧 à créer » + gros « plan d'implémentation » (Ch. 12 ÉTAPE 2) | `js/codex.js` (35+ entrées), `js/ui-codex.js`, `#codex-modal`, bouton `openCodex()` | ✅ **Livré** — ids identiques à la doc (`cle_de_voute`, `voix_godric`, `briser_cycle`, `cycle_brise`…) |
| **Briser le Cycle** « proposition § 11.10 » | `js/break-cycle.js` (boss `reflet_mythe`, flag `cycleBroken`) | ✅ **Livré** (reconnu ✅ par Ch. 14 **et Ch. 11** depuis 2026-06-14 : §11.10 réécrit descriptif du livré) |
| **Tutoriel / onboarding** (gap supposé) | `js/help-tour.js` (tour guidé auto pour novices) | ✅ **Livré** (+ `intro_tutoriel` + `intro.js`) |
| **Corruption cosmétique / 4ᵉ levier d'escalade** (Ch. 04/10/13 💡) | `js/floor-ambiance.js` (ambiance zonée + corruption) | ✅ **Livré** |
| **Phrases d'ambiance à l'entrée de salle** (Ch. 10 §10.7 💡) | `js/room-flavor.js` | ✅ **Livré** |
| **Étages-scènes / événements scénarisés** (Ch. 04 §4.4 ❓) | `js/floor-events.js` (`FLOOR_EVENT_CHANCE` pondéré) | ✅ **Livré** (au moins partiellement) |
| **Forge / Bibliothèque = boucle de farm matériaux** (Ch. 13) | `js/forge.js`, `js/library.js` (cellules `CELL.FORGE`/`CELL.LIBRARY` post-victoire) | ✅ **Livré** (réf. `ENDGAME_PLAN.md`) |
| **Cinématiques intro/victoire** (Ch. 14 P4 « assets ») | `js/cinematics.js`, `js/endgame.js` | ✅ **Partiel** (surcouche visuelle pure en place) |
| **Concoction de potions / besace d'herbes** (Ch. 08) | `js/potions.js` | ✅ **Livré** |
| **Téléportation Portus, Duel PvP live** | `js/teleport.js`, `js/pvp-duel.js` | ✅ **Livré** (non documentés côté histoire) |

**Conséquences :**

- ✅ ~~**`CLAUDE.md` est obsolète** : son index liste ~33 modules~~ **Résolu
  (2026-06-14)** : l'index de `CLAUDE.md` liste désormais les **85 modules** de
  `index.html` (alignement verrouillé par `node tools/check_doc_modules.js`, CI).
  `codex.js`, `ui-codex.js`, `break-cycle.js`, `endgame.js`, `cinematics.js`,
  `forge.js`, `library.js`, `floor-ambiance.js`, `floor-events.js`,
  `room-flavor.js`, `help-tour.js`, `potions.js`, `teleport.js`, `pvp-duel.js`,
  `haptics.js`, `karaoke.js`, `profile.js`… sont tous décrits.
- ⚠️ **Le Ch. 12 contient un « plan d'implémentation » du Codex déjà périmé** :
  il faut le transformer en **doc descriptive du Codex livré** + liste des
  entrées restant à rédiger.
- ⚠️ **Risque réel** : planifier en lisant ces docs ferait **ré-implémenter
  des systèmes existants** et **manquer le vrai travail** (rédiger le contenu
  des coquilles déjà en place, finir les variantes, polir).

> 🟢 **À retenir** : le projet n'a pas un déficit de *systèmes*, mais un
> déficit de **réconciliation doc↔code** et de **contenu à verser dans des
> systèmes déjà construits**. La roadmap part de là.

---

## 1.3 Vérification des liens entre chapitres

### Matrice de cohérence croisée

| Question d'analyse croisée | Réponse | Statut |
|----------------------------|---------|--------|
| Le Codex réagit-il aux **fins du Ch. 14** ? | Oui : robinets `victory` → `boucle_tenebreuse`/`tenebreux`/`porteur_eclats`/`echo_signature` ; `cycleBroken` → `cycle_brise`. Câblé dans `codex.js`. | ✅ Cohérent **et codé** |
| Les **PNJ (06)** interagissent-ils avec la **Boucle (11)** ? | Oui : recyclage `effectiveFloor` (Kingsley/Bill/Sirius reviennent ét. 18-20) ; **Gardien de la Boucle** hérite du fil rouge de Dumbledore ; marchands ténébreux = farm. | ✅ Cohérent |
| Les **quêtes signature (08)** pèsent-elles sur le **climax (03)** et la **fin (14)** ? | Oui : flag `<house>SignatureDone` → réplique pré-Voldemort + modificateur one-shot + paragraphe « héritage » dans la fin A. | ✅ Cohérent **et codé** (PNJ donneurs livrés — ✅4) |
| L'**équilibrage (13)** respecte-t-il l'**identité de Maison (07)** ? | Oui : équité stricte (même grille), identité = build + signature + cosmétique. `houseDifficultyModifier` explicitement **déconseillé**. | ✅ Cohérent |
| Les **Éclats** relient-ils trame, bestiaire, codex et fin ? | Oui, bout-à-bout : 03 (sens) → 04 (jalons) → 08 (collecte) → 09 (drops) → 12 (révélation Codex) → 14 (jalon « Briser » à 15 Éclats). | ✅ Excellent fil |
| Le **bestiaire (09)** s'aligne-t-il avec les **lieux (10)** par zone ? | Oui : familles F1-F5 par tranche A/B/C/D, signatures de corruption partagées. | ✅ Cohérent |

### Liens manquants ou faibles à renforcer ⚠️/❓

| Lien | Problème | Action suggérée |
|------|----------|-----------------|
| **11 ↔ 14** (Briser le Cycle) | ✅ Résolu (2026-06-14) : §11.10 réécrit **descriptif du livré** (`break-cycle.js`) — statut du chapitre, jalons (`echo_scene_sceau`/`accumulatedEclats ≥ 15`/`reflet_mythe`), choix final et ❓ tranchés. | — |
| **11 ↔ 06** (nature de la Boucle) | ✅ Résolu (2026-06-14) : le § canonique existait déjà ([11 §11.6.1 « Pourquoi la Boucle existe »](histoire/11-mondes-paralleles.md) : spirale qui s'enfonce, conséquence de la fêlure menée à son terme, pas un recommencement mécanique). Renvois croisés ajoutés depuis 06 §6.7.2 (Gardien) et forward 03 §3.6 → 11 §11.6.1 (la chaîne « en l'air » est close). Aucune ratification de lore (marqueurs 💡 de §11.6.1 inchangés). | — |
| **08 ↔ 06** (PNJ donneurs) | ✅ Résolu (2026-06-13) : décision = **créer les 2 PNJ dédiés**. `chevalier_godric` + `echo_salazar` livrés (npcs.js, art, dialogues, smoke par Maison). | — |
| **Boucle ↔ Mondes Parallèles** | ✅ Résolu (2026-06-14) : règle canon ratifiée = **axes isolés**, aucune interaction spéciale. Audit code : la visite n'est pas gatée (`mpListAvailableHosts`), donc le **crossover incident** est assumé — visiter un hôte en Boucle est une fenêtre **lecture seule** (snapshot read-only, pas de permadeath, rien de la Boucle ne se propage). Canon en [11 §11.5.1](histoire/11-mondes-paralleles.md) ; cross-links depuis 06 §6.7.2 (Gardien) + note symétrique 11 §11.13. | — |
| **9 / 10 / 11 checklists** | ✅ Résolu (2026-06-14) : renvoi croisé « 🔗 Checklists d'extension de contenu » ajouté en tête des trois (09 §9.11 / 10 §10.9 / 11 §11.11, + 05 §5.5). | — |
| **Codex ↔ Mondes Parallèles** | ✅ Résolu (2026-06-14) : **pas de 8ᵉ onglet « Voyageur »** — décision **déjà livrée dans le code** (`js/codex.js` : entrées `cheminette_inter_mondes`/`voyageur`/`mondes_paralleles` en `category:'glossaire'` + commentaire explicite). Doc 12 §12.2 réconciliée (❓→✅) ; Codex à 7 onglets, MP en Glossaire/Objets. | — |

---

## 1.4 Améliorations transversales proposées 💡

| # | Amélioration | But | Effort | Recommandation |
|---|--------------|-----|--------|----------------|
| ✅ 1 | ~~**Bandeau « Statut réel » en tête de chaque chapitre**~~ **Livré (2026-06-14)** : bandeau « 📊 Statut réel (code) » (✅/🔧 + modules `js/`) sur les 14 chapitres (01-10,13 ajoutés ; 11/12/14 déjà conformes). | Tuer la dérive doc↔code à la racine. | Faible | **Forte** |
| ✅ 2 | ~~**Index « doc ↔ module »** unique~~ **Livré (2026-06-14)** : table « Index doc ↔ module ↔ statut réel » dans [`docs/README.md`](README.md#index-doc--module--statut-réel) (14 chapitres). | Savoir d'un coup d'œil ce qui est codé. | Faible | **Forte** |
| 💡 3 | **« Thermomètre de corruption » global unifié** déjà amorcé (`floor-ambiance.js` + ❄→❄❄❄❄+ du Ch. 10) : en faire **un indicateur HUD lisible** + clé Codex. | Rendre la descente *ressentie*, pas seulement subie. | Moyen | Moyenne |
| ✅ 4 | ~~**Système de mémoire/héritage cosmétique** (profil hors-partie : titres, Codex de profil, bordure si `cycleBroken`)~~ **Livré (vérifié 2026-06-18)** : `js/profile.js` — profil persistant `hogwarts_rpg_profile`, titres dérivés, Codex du Sorcier (`openWizardCodex`), opt-in NG+. **Zéro stat** (cf. Ch.14 §14.6.3). | Récompenser la complétion sans casser l'équité (13). | Moyen | Forte |
| ✅ 5 | ~~**Enjeu intime par héros**~~ **Livré** (2026-06-14) : beat `descentStake` par héros jouable (seuil 3↔4) via `heroBarkScripted`. | Gap ⚠️3 comblé à coût quasi nul. | Faible | Forte |
| ✅ 6 | ~~**Unifier le ton des « fins conditionnelles »**~~ **Livré (vérifié 2026-06-14)** : les 5 axes (a-e) + symétrie `pact`/`defiance` sont **codés & testés** (`_victorySpeechVariants`, `js/endgame.js` ; `tests/units.js` §11). Doc 14 §14.0/§14.1.1/§14.2.2 réconciliée (💡→✅). | Cohérence narrative de la fin. | Faible | Forte |
| 💡 7 | **Fusionner les 3 checklists d'ajout** (créature/lieu/variante) en une page « Règles d'extension de contenu ». | Éviter le creep mécanique. | Faible | Moyenne |

---

## 1.5 Derniers chapitres / sections manquants

### Côté narration (`docs/histoire/`)

| Manque | Statut | Priorité |
|--------|--------|----------|
| ❓ **Réconciliation Ch. 12 & 14** avec le code livré (Codex, Briser le Cycle) | À réécrire (sections « plan d'impl. » périmées) | 🔴 Haute |
| ✅ **Définition canonique de « la Boucle »** (1 §) | Résolu (2026-06-14) : foyer canon = [11 §11.6.1](histoire/11-mondes-paralleles.md) (déjà rédigé) ; renvois croisés ajoutés depuis 06 §6.7.2 + 03 §3.6 | ✅ Résolu |
| ✅ **Règle Boucle ↔ Mondes Parallèles** (interaction / isolation) | Résolu (2026-06-14) : **axes isolés**, crossover incident d'une visite = lecture seule (conforme au code). Canon en [11 §11.5.1](histoire/11-mondes-paralleles.md), cross-links 06 §6.7.2 + 11 §11.13 | ✅ Résolu |
| ❓ **Fiches de contenu Codex restantes** (entrées rédigées vs coquilles) | Audit + écriture | 🟠 Moyenne |
| ✅ **Enjeu intime par personnage** (beats `descentStake`, 6 héros jouables) | Livré (2026-06-14) — cf. 05 §5.4.2 | ✅ Résolu |
| ✅ **Localisation des boss** (Bellatrix ét. 8 ; Voldemort = 2 entrées, Affaibli ét. 9 / Ressuscité ét. 10) | Résolu (2026-06-14) — doc alignée sur `monsters.js` | ✅ Résolu |
| ✅ **Décisions `❓` endgame** (« ce qui dort », barks Ténébreux, biais Maison V2) | Tranché (2026-06-19, AskUserQuestion) : (1) personnifié = **le Dormeur** (10 §10.3, 11 §11.7.3, 03 §3.6) ; (2) barks `loopEcho` livrés (09 §VII.5) ; (3) biais Maison **V2 ouvert** power-neutral, impl. = chantier suivant (Phase 3) | ✅ Résolu |

### Côté gameplay (`docs/gameplay/`)

- ✅ **Résolu (2026-06-14)** : les **9 chapitres G1-G9** sont à jour (`🟩`) et
  **couvrent** les systèmes récents (Forge, Bibliothèque, Potions,
  Téléportation, PvP, Événements d'étage, Codex, Mondes Parallèles / Atelier) —
  audit : sections dédiées + valeurs sourcées du code. Chaque chapitre porte un
  bandeau « 📊 Statut réel (code) » + modules `js/`. Quelques `❓` design ouverts
  par chapitre (relecture en continu).

### Ce qui n'est **pas** manquant (contrairement à ce que les docs laissent croire)

✅ Tutoriel · ✅ Codex · ✅ Cinématiques de fin · ✅ Vraie fin · ✅ Forge/Biblio ·
✅ Corruption cosmétique · ✅ Événements d'étage · ✅ Craft de potions.

---

# ÉTAPE 2 — Roadmap & plan d'action

> Principe directeur : **réconcilier avant de construire**. La première phase
> n'ajoute presque aucun système — elle aligne la doc sur le code et verse du
> *contenu* dans des coquilles déjà livrées. On ne « code le Codex » pas : on
> le **remplit** et on le **documente**.

## Phase 1 — Réconciliation & polish narratif (court terme, ~2-3 semaines)

| Tâche | Priorité | Chapitres / systèmes | Complexité | Dépendances |
|-------|----------|----------------------|------------|-------------|
| **Audit doc↔code complet** : tableau « chapitre ↔ module(s) ↔ statut réel » | 🔴 Haute | Tous + `CLAUDE.md` | Faible (lecture) | — |
| ~~**Mettre à jour `CLAUDE.md`** (index des 85 modules, sections Codex/Forge/Biblio/Endgame/Potions/Events)~~ ✅ **Fait (2026-06-14)** : index des 85 modules aligné (`check_doc_modules` vert), modules récents tous décrits ; dérives résiduelles corrigées. | 🔴 Haute | `CLAUDE.md` | Faible | Audit |
| ~~**Réécrire Ch. 12 & 14** : « plan d'impl. » → « état livré »~~ ✅ **Fait (2026-06-14)** (Ch.12 + Ch.14). | 🔴 Haute | ~~12, 14~~ | Faible | Audit |
| ~~**Aligner Ch. 11**~~ ✅ **Fait (2026-06-14)** : ~~Briser le Cycle = ✅~~ (§11.10 descriptif du livré) · ~~définir « la Boucle »~~ canon = §11.6.1 (déjà rédigé), renvois croisés ajoutés depuis 06 §6.7.2 + forward 03 §3.6 → 11 §11.6.1 (chaîne « en l'air » close) · ~~**règle Boucle ↔ Mondes Parallèles**~~ ratifiée **axes isolés** (§11.5.1, crossover incident lecture seule conforme au code ; cross-links 06 §6.7.2 + 11 §11.13). | 🟠 Moyenne | 11 | Faible | Audit |
| ~~**Bandeaux « Statut réel » + index doc↔module**~~ ✅ **Fait (2026-06-14)** : bandeau « 📊 Statut réel (code) » sur les 14 chapitres + table « Index doc ↔ module ↔ statut réel » dans `docs/README.md`. | 🟠 Moyenne | Tous | Faible | Audit |
| ~~**Compléter symétrie `pact`/`defiance`** + variantes texte fin (5 axes)~~ ✅ **Fait (2026-06-14)** : déjà livré dans le code (`_victorySpeechVariants` — 5 axes + pact/defiance, testés `units.js` §11) ; doc 14 réconciliée (💡→✅). Reste Phase 2 🟡 : porter les variantes dans la **cinématique** multi-pages (`cinematics.js`). | 🟠 Moyenne | 14, `endgame.js` | Faible | — |
| ~~**Enjeu intime héros**~~ ✅ **Livré** (beat `descentStake`) | — | 05, `hero-barks.js` | Faible | — |
| ~~**Clarifier localisation boss** (Bellatrix, Voldemort ×1/×2)~~ ✅ **Fait (2026-06-14)** : Bellatrix ét. 8 ; Voldemort = 2 entrées (Affaibli ét. 9 / Ressuscité ét. 10) ; dérive « Affaibli ét. 8 » → 9 corrigée dans 01-04/06/09/12 + `CLAUDE.md`. | 🟡 Basse | 03, 06, `monsters.js` | Faible | — |

**Critère de sortie Phase 1** : un·e lecteur·rice de la doc peut, pour chaque
système, savoir s'il est livré et où — et `node tests/smoke.js` reste vert.

## Phase 2 — Implémentation technique prioritaire (moyen terme, ~3-5 semaines)

| Tâche | Priorité | Chapitres / systèmes | Complexité | Dépendances |
|-------|----------|----------------------|------------|-------------|
| ✅ **Audit de complétude du Codex** *(fait, 2026-06-13)* : 36 entrées, **0 coquille vide**, 0 condition morte / texte inatteignable / lien pendouillant. 6 entrées de lore majeur (4 Voix, Dumbledore, Manon) enrichies d'une couche `revealed` (revealed 24→30). Les 6 mono-couche restantes sont des termes courts légitimes (§12.3). | 🔴 Haute | 12, `codex.js` | Moyenne | Phase 1 |
| ~~**PNJ de signature manquants**~~ ✅ **Livré (2026-06-13)** : `chevalier_godric` 🦁 + `echo_salazar` 🐍 PNJ dédiés (art, dialogues, placement) ; 4 signatures opérationnelles + 5 smoke. | ✅ | 06, 08, `npcs.js` | — | Fait |
| **Objectifs de quête neufs** des signatures (« combat sans fuite », escorte/vague défensive, raccourcis Salazar) — restent **hors-scope** : les signatures shippent avec des **proxys `kill`/`item`** (08 §8.5.2). Mécaniques neuves = chantier optionnel. | 🟡 Basse | 08, `quests*.js`, `movement.js` | Élevée | Optionnel |
| ~~**Échos temporels → Codex** : Set `temporalEchoSeen` + robinet `corruptedBy` zone D~~ ✅ **Fait (2026-06-14)** : le Set (`seenEchoes`) + robinet `echo` + surfaçage (`movement.js`) + vue « Mémoire des Ruines » (`renderEchoCodex`) étaient **déjà livrés** ; dernier gap fermé — l'entrée `echos_temporels` gagne une couche `corruptedBy` zone D (floor 14 **+** `echo_scene_sceau`, via `seenEchoes`) + texte `corrupted` (testé `units.js` §8, `scenarioCodexCorrupted`). | 🟠 Moyenne | 10, 12, `codex.js`, `floor-ambiance.js` | Moyenne | Codex audit |
| ~~**Variantes texte de fin (B) complètes** dans la cinématique~~ ✅ **Fait (2026-06-14)** : les 5 axes sont déjà rendus **dans la cinématique de victoire** (= modale `#victory-modal` / `#victory-speech` + flourish `victoryFlourish`). `cinematics.js` est une surcouche **visuelle pure** (sans page de texte) → rien à « porter ». Précisé en 14 §14.2.2. | 🟡 Basse | 14, `endgame.js`, `cinematics.js` | Faible | Phase 1 |

**Critère de sortie Phase 2** : le Codex est *plein* (pas de coquille vide
visible) ; les 4 signatures sont jouables de bout en bout.

## Phase 3 — Contenu endgame & rejouabilité (long terme, ~4-6 semaines)

| Tâche | Priorité | Chapitres / systèmes | Complexité | Dépendances |
|-------|----------|----------------------|------------|-------------|
| **Boss-gardiens des Chambres des Fondateurs** (ét. 17-20) + illumination selon `chosenHouse` — **DÉCOUPÉ en 3 lots, code ✅ Fait (2026-06-15)**. Lot 1 = 4 boss-gardiens epic (`gardien_{lion,serpent,aigle,blaireau}`, thématisés, drop = légende de Maison, `minFloor:17`, `units.js` §18). Lot 2 = placement en chambre : `_ensureChamberGuardiansPresent` (`dungeon-spawning.js`) place à l'étage 17 en Boucle les gardiens des **3 Maisons ≠ `chosenHouse`** (celle du héros l'accueille — règle §10.5), déterministe/idempotent/gaté victoire (`scenarioChamberGuardians`). Lot 3 = polish code : promo beat (`BOSS_PROMO_BEATS`) + écho de Chambre révélé à la défaite (`battle-rewards.js`, `scenarioChamberGuardianPolish`). **Reste : art PNG dédié** (fallback SVG en attendant). NB : illumination §10.5 + `FOUNDER_CHAMBERS` **déjà livrés**. | 🟠 Moyenne | 10, 11, `monsters.js`, `dungeon.js` | Élevée | Phase 2 |
| ~~**Variantes Ténébreuses** (barks one-shot « Tu m'as déjà tué une fois »)~~ ✅ **Fait (2026-06-15)** : événement `darkBoss` (16 héros, `hero-barks.js`) déclenché à la place de `bossAppear` quand le boss epic est en `variant === 'darkness'` (`battle.js`), one-shot/session. Testé `units.js` §1bis. Doc 11 §11.9.2 marquée ✅. | 🟡 Basse | 09, 11, `hero-barks.js`, `monsters.js` | Moyenne | — |
| ~~**Héritage / NG+ cosmétique opt-in** (profil hors-partie, zéro stat)~~ ✅ **Fait (2026-06-18)** : **déjà livré** — `js/profile.js` (profil persistant `hogwarts_rpg_profile` : titres `computeProfileTitles`/`profileTopTitle`, fins vues, Codex du Sorcier `openWizardCodex`, opt-in `ngPlusAvailable`/`ngPlusMaxLevel`) + NG+ « vrai » (challenge empilable, `ngPlusScaling` + `NGPLUS_*` dans `dungeon-scaling.js`, cran = victoires plafonné `NGPLUS_CAP`). **Zéro stat/objet/or hérité au joueur** (garde-fou équilibrage 13). Câblé `index.html?v=3`, MANIFEST loader, testé `units.js §11quater`. Doc Ch.14 §14.6.3 / §E déjà réconciliée. | ✅ | 14, `js/profile.js`, `dungeon-scaling.js` | — | Fait |
| ~~**Suites de signature en Boucle** (écho déchiré par Maison)~~ ✅ **Fait (2026-06-16)** : **déjà livré** — `SIGNATURE_ECHOES` + `getSignatureEchoBeat` + `maybeSignatureEchoBeat` (`floor-ambiance.js`) jouent à l'entrée des Ruines (ét. 14) un beat house-aware (signature accomplie « la braise tient » vs laissée « jamais rallumée », Serpentard `pact`/`defiance`), débloquent `echo_signature` (Codex). Câblé `movement-floors.js`, testé `units.js`. Doc 11 §11.8.1 réconciliée (💡→✅). | 🟡 Basse | 08, 11 | Moyenne | Signatures (P2) |
| ~~**Décisions `❓` endgame** : « ce qui dort » personnifié ? barks Ténébreux ? biais génération par Maison (V2) ?~~ ✅ **Tranché (2026-06-19, AskUserQuestion)** : **(1)** « ce qui dort » **personnifié = *le Dormeur*** (présence primordiale, jamais atteinte ; plafond ★ N = approche sans réveil) — doc 10 §10.2/§10.3, 11 §11.7.3, 03 §3.6. **(2)** barks Ténébreux **étendus** : nouvel événement `loopEcho` (16 héros, `hero-barks.js`), câblé à l'affleurement d'un écho temporel (`movement.js`/`seenEchoes`), testé `units.js §1bis` — doc 09 §VII.5, 11 §11.7.3. **(3)** biais génération par Maison **V2 OUVERT** (direction ratifiée) mais **power-neutral strict** ; **impl. = chantier suivant** (ligne ci-dessous). | ✅ | 09, 10, 11, `hero-barks.js`, `movement.js` | Variable | Fait |
| **Biais de génération par Maison — V2 (implémentation)** : pondération cosmétique de salles + skins de monstres thématiques selon `chosenHouse`, **power-neutral strict** (même grille Ch.13). Gate de release : **sim d'équilibrage neutre** (`tools/sim-difficulty.js` par Maison) confirmant 0 écart de win-rate ; flag de repli V1. Spec : 10 §10.6. | 🟡 Basse | 10, `dungeon.js`, `dungeon-spawning.js`, 13 | Élevée | Arbitrage ✅ (2026-06-19) ; sim figé |

**Critère de sortie Phase 3** : la Boucle a une **destination narrative
ressentie** (Chambres, échos, variantes) au-delà du seul ★ N.

## Phase 4 — Démo / Release (jouable de bout en bout)

| Tâche | Priorité | Chapitres / systèmes | Complexité | Dépendances |
|-------|----------|----------------------|------------|-------------|
| ~~**Mettre à niveau `docs/gameplay/` G1-G9** (systèmes récents)~~ ✅ **Fait (2026-06-14)** : audit → les 9 chapitres couvraient déjà les systèmes récents (sections dédiées, valeurs sourcées du code) ; passe de cohérence = bandeau « 📊 Statut réel (code) » + modules par chapitre, statut 🟧→🟩, READMEs alignés. | 🟠 Moyenne | G1-G9 | Faible | Phase 1 |
| **Pass d'assets de fin** (illustrations victoire, SFX, fonds parchemin Codex par acte) | 🟠 Moyenne | 12, 14, `cinematics.js`, pipelines `tools/` | Moyenne | P2/P3 |
| ~~**Pass d'équilibrage de release** (`tools/sim-difficulty.js`, `check_difficulty.js` en CI)~~ ✅ **Fait (2026-06-19)** : `check_difficulty.js` était **déjà branché en CI** mais **flaky** — baseline §3 de `DIFFICULTY_REPORT.md` périmée (code actuel ~+6-9 pts aux ét. 9-12 Duo ; l'ét. 9-Duo franchissait ±10 pts à N=800, cf. flake PR #576). Baseline régénérée à **N=4000** (reflète le code, bandes saines : solo plancher 52 %, duo 72 %, aucun mur < 40 % ≤ ét. 12), §4 + exec-summary réalignés, **gate vérifié 0 dérive sur 6 runs**. Pas une régression (la doc avait pris du retard). Plan : `.claude/plans/release-balance-pass.md`. | ✅ | 13, `DIFFICULTY_REPORT.md` | Moyenne | Fait |
| ~~**QA parcours complet** : intro → tutoriel → Acte I-III → victoire → Boucle → Briser le Cycle, solo & duo, 4 Maisons~~ ✅ **Fait (2026-06-19)** : audit de couverture smoke → chaque beat du parcours était **déjà couvert** (intro `scenarioCleVouteIntro`/`scenarioHelpTour`, victoire `scenarioVictoryTrigger`/`scenarioVictorySpeechVariants` ×4 Maisons, Boucle `scenarioDarkLoopV1-4`/`scenarioCh13EndgamePivot`, Briser le Cycle `scenarioDarkLoopV3`, Maisons `scenarioHouseSignature*` ×4) **mais tout en solo et morcelé**. Lacune comblée : **`scenarioFullJourneyDuo`** (`tests/scenarios/misc.js`) — chaîne **contiguë en DUO** dans une seule instance (intro → groupe duo → entrée Boucle → discours de victoire des 4 Maisons → Briser le Cycle → persistance save/load), garde-fou anti-fuite d'état entre phases. Plan : `.claude/plans/qa-parcours-complet.md`. | ✅ | Tous, `tests/scenarios/misc.js` | Élevée | Fait |
| **Garde-fous release** : `cache-bump`, `smoke.js`, `units.js`, `pwa-smoke.js` verts | 🔴 Haute | PWA, tests | Faible | Tout |

**Critère de sortie Phase 4** : un parcours démo complet, cohérent
narration↔gameplay, tests verts, doc fidèle au code.

---

## Vision d'ensemble (motivation)

Le projet n'est **pas** à mi-chemin d'un océan de features à coder : la
plupart des systèmes structurants **existent déjà**. Le vrai travail qui
sépare l'état actuel d'une **démo jouable et cohérente** est :

1. **Réconcilier** la doc et `CLAUDE.md` avec un code en avance (Phase 1).
2. **Remplir** des coquilles déjà livrées — surtout le Codex (Phase 2).
3. **Donner une destination** à la Boucle (quêtes signature ✅ livrées 2026-06-13).
4. **Polir, équilibrer, tester** pour la release (Phase 4).

Autrement dit : on passe de *« construire le jeu »* à *« finir d'y écrire
l'histoire et la vérifier »* — une phase plus courte et plus gratifiante
qu'elle n'en a l'air à la seule lecture des docs.

---

> **Note d'audit** : les statuts « ✅ livré » ci-dessus ont été vérifiés par
> présence du module dans `js/`, câblage dans `index.html` (`?v=N`) et
> repérage des symboles attendus. La **complétude fonctionnelle** de chaque
> module (ex. nombre d'entrées Codex réellement rédigées) reste à confirmer
> par les audits de Phase 1/2 — d'où leur place en tête de roadmap.
