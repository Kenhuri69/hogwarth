# Étude de la progression de difficulté (mode Normal)

> Branche : `claude/analyze-difficulty-progression-vyItb`
> Périmètre validé : **analyse + propositions** (aucun patch dans cette PR).
> Modes couverts : **solo (Harry seul)** et **duo (Harry + Hermione)**.
> Méthode : **mixte** — tableaux théoriques sur les formules réelles + simulation Monte Carlo ciblée sur les paliers suspects.

---

## 1. Objectif

Identifier les **étages charnières** où la difficulté du mode Normal devient excessive (ou trop molle), c'est-à-dire :

- l'étage X à partir duquel un joueur jouant *normalement* (sans farming, équipement standard du shop, sorts du level-up) commence à perdre des combats ;
- la nature du décrochage (HP joueur insuffisants ? DPS sortant trop faible ? sorts ennemis qui one-shot ? groupes trop nombreux ?) ;
- les écarts solo vs duo.

Livrable final : un rapport `DIFFICULTY_REPORT.md` à la racine avec tableaux, graphiques ASCII, et une section **Recommandations**.

---

## 2. Faits établis (lecture code)

### 2.1 Scaling ennemi (`dungeon.js:16`)
```
mult = (1 + (floor - 1) * base.scale) * diffMult     // diffMult Normal = 1.0
hp/atk/def/xp/gold scalés par mult
```
- `scale` ∈ `[0.15 … 0.40]` selon le monstre (médiane ≈ 0.22).
- Variantes nommées : **Féroce** dès l'étage 3, **Ancien** dès l'étage 5. *Effet visuel seul* — pas de bonus de stats supplémentaire.
- **Shiny** (4 % par tirage) : ×1.5 XP, ×2 gold, ×2 chances de drop. Pas de boost de stats.

### 2.2 Tailles de groupe (`battle.js:122`)
| Étage | Solo (max 2) | Duo (max 3) |
|-------|--------------|-------------|
| 1–2   | 1            | 65 % / 35 % (1/2) |
| 3–4   | 70 % / 30 %  | 30 % / 45 % / 25 % |
| 5+    | 50 % / 50 %  | 20 % / 35 % / 45 % |

### 2.3 Dégâts joueur (`battle.js:182`)
```
dmg = max(1, atk + rand(0..3) - enemy.def)
crit% = 5 + lck * 0.5 (cap 40)   ×1.5 dégâts
```

### 2.4 Progression joueur (`battle.js:376-413`)
- `xpNext` démarre à 50, ×1.6 par niveau : 50, 80, 128, 204, 326, 521, 833, 1332, 2131, 3409…
- Level-up : **+8 HP, +5 SP, +1 ATK, +1 DEF, +1 MAG** (sur `_base*`).
- Sorts appris : niv 2 / 3 / 4 / 5 / 7 / 9 (voir CLAUDE.md).
- Stats de départ : Harry HP 35 ATK 5 DEF 2 MAG 10 / Hermione HP 28 ATK 3 DEF 2 MAG 16.

### 2.5 Récompenses (`battle.js:316+`)
- XP & or partagés (sur `player`).
- Drops indépendants par entrée de `drops[]`.
- Maisons : +10 pts/kill Normal → palier 100 = +1 stat (≈ niveau ~5).

### 2.6 Bornes étage (`monsters.js`)
- Étages 1-3 : 7 monstres légers (scale 0.15–0.25, HP base 8–20).
- Étages 4-6 : montée des Trolls, Détraqueurs, Loups-Garous, Hippogriffes (scale 0.22–0.30, HP base 25–45).
- Étages 7+ : Mangemorts élite, Nagini, Voldemort affaibli (scale 0.30+, abilities damage/drain).

---

## 3. Étapes du travail (avec critères de vérification)

### Étape 1 — Modéliser la progression joueur attendue
**Plan :** construire une table "niveau attendu en fonction de l'étage" sur la base d'un parcours moyen (X combats par étage, XP moyen par combat).
- Estimer le nombre moyen de combats par étage (rooms × densité monstres, taille de groupe moyenne).
- Calculer XP cumulée → niveau atteint à l'entrée de chaque étage.
- Produire `player.atk/def/mag/hpMax/spMax` théoriques aux étages 1 à 12.

**Vérification :** la table couvre les étages 1–12 et donne un niveau cohérent (≤ niveau 9 attendu autour de l'étage 6–8, où Avada se débloque).

### Étape 2 — Modéliser les ennemis "moyens" par étage
**Plan :** pour chaque étage f de 1 à 12, lister le pool éligible (`minFloor ≤ f ≤ maxFloor || null`), pondéré par `weight`. Calculer HP/ATK/DEF moyen et p75 sur le pool scalé.

**Vérification :** table 12 lignes × {HP_med, HP_p75, ATK_med, DEF_med, danger_med}.

### Étape 3 — Calculs analytiques de combat
**Plan :** pour chaque étage, calculer en supposant le joueur au niveau attendu (étape 1) face à l'ennemi médian / p75 (étape 2) :
- `dmg_player_par_attaque = max(1, atk_player + 1.5 - def_enemy)` (espérance de rand(0..3) ≈ 1.5)
- `TTK_phys = hp_enemy / (dmg × (1 + 0.005 × lck × 0.5))` (intègre crit)
- `dmg_enemy_par_attaque = max(1, atk_enemy - def_player)`
- `TTD = hpMax_player / dmg_enemy` (solo) ou `TTD_party = (hpMax_h + hpMax_he) / dmg_enemy` (duo)
- Ratio de survie = TTD / TTK_groupe (où TTK_groupe = TTK × group_size_moyen / nb_personnages_actifs)

**Vérification :** ratio > 1.3 = confortable, 0.8–1.3 = tendu, < 0.8 = défavorable. Tracer les étages où Solo et Duo basculent.

### Étape 4 — Simulation Monte Carlo ciblée
**Plan :** écrire un script Node `tools/sim-difficulty.js` (autonome, copie les formules clés) qui :
- charge `MONSTERS`, `CHARACTERS`, `SPELLS` ;
- simule 500 combats par étage (1 → 12) en solo et duo ;
- IA joueur basique : attaque physique sinon meilleur sort selon SP ;
- IA ennemi : reproduit `tryEnemyAbility` simplifié ;
- mesure win rate, tours moyens, PV restants moyens, sorts utilisés.

**Vérification :** le script tourne en < 60 s, sortie CSV/console exploitable. On valide en comparant aux ratios analytiques (étape 3) : tendance identique attendue.

### Étape 5 — Identifier les paliers difficiles
**Plan :** croiser étapes 3 et 4 :
- repérer l'étage où win rate solo passe sous 70 % puis 50 % ;
- même chose duo ;
- repérer les *spikes* (ex: étage où un nouveau monstre à `scale 0.4` débarque et tue le ratio).

**Vérification :** identifier au moins 1 palier "doux" (transition graduelle) et tout *spike* (transition brutale > 25 pts de win rate en 1 étage).

### Étape 6 — Recommandations
**Plan :** pour chaque palier identifié, proposer **2-3 leviers** ordonnés du moins au plus invasif :
- Ajuster `weight` d'un monstre trop fréquent ;
- Baisser `scale` d'un monstre spécifique (ex: passer 0.40 → 0.30) ;
- Ajuster les seuils de `rollGroupSize` ;
- Ajouter des items de heal au shop d'un étage donné ;
- Modifier le `xpMultiplier` ou la pente `LEVEL_UP_XP_MULTIPLIER` en mode Normal.

**Critère :** chaque recommandation a (1) un diagnostic chiffré, (2) une cible numérique précise, (3) une estimation de l'impact (delta de win rate attendu).

### Étape 7 — Rapport final
**Plan :** rédiger `DIFFICULTY_REPORT.md` à la racine avec :
- Résumé exécutif (3-4 lignes).
- Tableaux des étapes 1, 2, 3.
- Verdict par étage solo + duo.
- Liste hiérarchisée des recommandations.
- Annexes (script de simu, commande de relance).

**Vérification finale :** présenter le rapport à l'utilisateur, attendre validation avant tout patch.

---

## 4. Hors-scope explicite

- **Pas de modification de gameplay dans cette PR.** Les recommandations seront validées avant tout commit qui touche `monsters.js` / `state.js` / `battle.js`.
- Pas d'étude des autres difficultés (Facile/Difficile/Expert) — elles se déduisent par les multiplicateurs déjà visibles. Une note succincte dans le rapport mentionnera l'extrapolation.
- Pas d'étude UX / lisibilité du combat — uniquement l'équilibrage chiffré.
- La simulation ignore : drops aléatoires, fontaines, repos, achats, points de Maison. Premier rapport pessimiste → reflète le pire cas du joueur "honnête sans optimisation".

---

## 5. Suivi

| Étape | Statut | Notes |
|-------|--------|-------|
| 1. Progression joueur     | ☑ | Niveau attendu calculé pour étages 1-12, solo + duo. Solo plafonne lvl 10. |
| 2. Pool ennemi par étage  | ☑ | Moyenne pondérée par `weight` sur le pool éligible. |
| 3. Calculs analytiques    | ☑ | Intégrés dans la simulation (formules battle.js reproduites). |
| 4. Simulation Monte Carlo | ☑ | `tools/sim-difficulty.js` — 800 sims/étage/mode, stable. |
| 5. Identification paliers | ☑ | **Solo : mur étage 5 (−31 pts). Duo : mur étage 8 (−15 pts).** |
| 6. Recommandations        | ☑ | 6 leviers R1-R6 hiérarchisés. Combo recommandé : R1+R2+R3. |
| 7. Rapport final          | ☑ | `DIFFICULTY_REPORT.md` à la racine. |

À chaque étape franchie : cocher, ajouter une ligne "écarts constatés / décisions" si pertinent.

---

## 6. Smoke test

Le test `node tests/smoke.js` reste applicable. Il sera relancé :
- après création du script de simu (étape 4) pour vérifier qu'il n'a rien cassé ;
- avant le commit final du rapport.

Aucun changement runtime n'est attendu dans cette PR, donc le smoke devrait rester vert sans effort.

---

## Phase 2 — Proposition validée par l'utilisateur

Direction validée pour itération sur la balance Normal :

### 2.1 Monstres
- **HP base ×1.5** (toutes entrées de `MONSTERS`).
- **XP base ×1.3** (toutes entrées de `MONSTERS`).
- Aucun changement de `scale`, `atk`, `def` à ce stade — on observe l'effet HP+XP d'abord.

### 2.2 Joueur — stats allouables au level-up
- Baseline level-up **conservée** : +8 HP, +5 SP, +1 ATK/DEF/MAG.
- **+3 points libres** par niveau, à distribuer parmi 5 stats secondaires :

| Stat | Effet par point |
|------|-----------------|
| STR  | +1 ATK |
| INT  | +1 MAG |
| AGI  | +0.4 % esquive |
| END  | +5 HP max |
| LCK  | +0.5 % crit |

Pour la simulation : on modélise 3 builds (Tank / Équilibré / Offensif) pour mesurer la fourchette.

### 2.3 Hors-scope simulation, à suivre séparément
- **Quête de départ avec Dumbledore repérable** : onboarding UX, marker minimap pointant vers Dumbledore au tout début de la partie. Sera une PR dédiée — pas de lien direct avec la balance.

### 2.4 Critère de succès
- Étage 1-3 : win rate **inchangé** (~95-100%) mais **combat 2-3× plus long en tours** (moins de one-shot par Incendio).
- Étage 5 solo : 34% → **≥ 55%** (build équilibré).
- Étage 8 duo : 26% → **≥ 50%** (build équilibré).

---

## Phase 3 — Direction validée : contenu plutôt que mults

Après simulation Phase 2 (cf. ci-dessus), l'utilisateur a choisi de **ne pas modifier HP/XP/stat-mults** mais d'attaquer la difficulté via du **contenu** :

### 3.1 Respawn ennemis
- **20 % de probabilité** par cellule-monstre déjà vidée de re-spawner un ennemi quand le joueur **revient à un étage déjà visité** (via escalier montant/descendant).
- En plus : accepter une quête de type `kill` **déclenche un respawn ciblé** du monstre désigné (au moins 1 instance garantie sur l'étage indiqué de la quête).
- Permet le **farming d'XP et de drops**, et garantit que les quêtes kill restent réalisables.

### 3.2 Chaîne de quêtes Dumbledore (5 étapes)
| Étape | Étage | Type d'objectif | Récompense (cumulative permanente) |
|-------|-------|------------------|------------------------------------|
| 1 | 1 | Onboarding (visite N rooms ou bats 3 mobs) | +5 HP max + +1 ATK/MAG/DEF, débloque Dumbledore comme PNJ marqué ❗ |
| 2 | 3 | Kill cible (élite étage 2-3) | +1 LCK + sort `Wingardium Leviosa` aux deux |
| 3 | 5 | Récupérer artefact (item drop élite étage 4-5) | +2 stat secondaire au choix (rendu en item de potion-stat) |
| 4 | 7 | Kill élite étage 6-7 | item équipable rare (slot mid-game à définir) |
| 5 | 10 | Affronter ombre/figure (élite étage 9-10) | item légendaire ou sort rare (à choisir lors du build) |

- Dumbledore est repérable dès le départ sur la **minimap** (marqueur ❗) — c'est aussi l'**onboarding** demandé initialement.
- Chaque étape ne se déclenche que si la précédente est complétée (chainage via `questPrereq` ou ordre dans `activeQuests`).

### 3.3 Équipements mid-game (5-8 items)
Combler les slots faiblement fournis pour les étages 3-7 :
- 1-2 `head` rare/epic (ex : Heaume du Phénix, +DEF +MAG)
- 1 `hands` rare (ex : Gants du Stratège, +ATK +AGI)
- 1 `feet` epic (ex : Bottes du Vif d'or, +AGI esquive)
- 1-2 `belt` rare (ex : Ceinture de Force, +STR)
- 1 `ring` rare/epic (ex : Anneau du Mentor, +LCK)
- 1 `trinket` (ex : Bibelot tactique)

Drops : monstres élite étage 3-7 + boutique progressive + récompense quête Dumbledore.

### 3.4 Étapes d'implémentation

| # | Étape | Statut | Verification |
|---|-------|--------|--------------|
| 1 | Plan écrit (ce doc) | ☑ | rédigé |
| 2 | Explorer architecture spawn/dungeon | ☐ | repérer où se câble le respawn |
| 3 | Commit travail sim (Phase 2) | ☐ | `git log` montre extension |
| 4 | Implémenter respawn 20 % par étage | ☐ | sim manuelle : aller-retour étage → ennemis re-peuplés |
| 5 | Quête Dumbledore chaîne 5 étapes | ☐ | `activeQuests` + dialogues + récompenses applicables |
| 6 | Trigger respawn par acceptation quête kill | ☐ | accept quête kill → monstre cible re-spawné |
| 7 | 5-8 équipements mid-game | ☐ | items dans `data.js`, drops/boutique |
| 8 | Smoke test `node tests/smoke.js` | ☐ | vert |
| 9 | Commit + push | ☐ | sur `claude/analyze-difficulty-progression-vyItb` |

### 3.5 Note hors-scope
- L'extension de la simulation (`tools/sim-difficulty.js`) reste utile comme outil de balance pour les futures itérations. Les 2 scénarios testés (3 / 5 pts libres) sont documentés ci-dessus comme référence si l'on veut un jour passer aux mults bruts.
