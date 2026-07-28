# Système de Combat Tour par Tour — Synthèse & Plan d'implémentation

> Plan vivant (guidelines §5), mis à jour à chaque étape franchie.
> **Vocation** : faire la **synthèse** du cœur tactique du jeu en y branchant
> proprement les deux chantiers récemment enrichis — **Artefacts & Reliquaires
> 2.0** (`artifacts-reliquary-system.md`, P0→P3 livrés) et **Sorts & Magie
> Avancée 2.0** (`_archive/spells-magic-system.md`, P0→P1 livrés) — et en cadrant les
> **manques** (initiative/vitesse fluide, jauge de Corruption, positionnement
> Duo, interaction environnementale en combat) comme des **ajouts additifs**,
> jamais comme une refonte.
>
> **Statut : ÉTAPE 1 (spécifications) + ÉTAPE 2 (plan d'implémentation) rédigées.
> Aucun code modifié — document de design.**
>
> **Canon de référence** : chapitres [09](../../docs/histoire/09-bestiaire-et-lore.md)
> (gradients de corruption), [10](../../docs/histoire/10-lieux-et-geographie.md)
> (lieux & interactions environnementales), [11](../../docs/histoire/11-mondes-paralleles.md)
> (Boucle Ténébreuse), [13](../../docs/histoire/13-equilibre-difficulte-progression.md)
> (équilibre & difficulté), [14](../../docs/histoire/14-scenarios-de-fin.md) (fins).
> **Design existant** : [G2-combat](../../docs/gameplay/G2-combat.md),
> [G3](../../docs/gameplay/G3-progression.md), [G4](../../docs/gameplay/G4-maisons.md),
> [G5](../../docs/gameplay/G5-equipement-objets.md), [G6](../../docs/gameplay/G6-sorts.md),
> [G8](../../docs/gameplay/G8-difficulte-scaling.md).

**Légende** : ✅ déjà dans le jeu (code) · 💡 proposition additive (à implémenter) ·
❓ point à arbitrer avant code.

---

## 0. Contexte & règles d'or

Le moteur est **vanilla JS / `<script>` séquentiels** (zéro build, zéro
dépendance), servi en `file://` / GitHub Pages. Le combat est **déjà
fonctionnel et mature** (`battle.js`, `battle-spells.js`, `battle-ui.js`,
`battle-rewards.js`, `battle-death.js`) : tout y converge — stats dérivées
(G3), Maisons (G4), équipement/artefacts (G5), sorts (G6), scaling (G8).

> ✅ **Règle d'or équilibre** (Ch.13 §13.6) — *axe de progression ADDITIF* :
> un artefact / un sort / une synergie rend **le joueur plus fort**, il ne
> rend **jamais l'ennemi plus faible**, et **n'altère pas** le scaling des
> monstres (`dungeon-scaling.js`).

> ✅ **Règle d'or architecture** : pas de nouveau slot, pas de 2ᵉ jauge
> omniprésente, pas de refonte du tour. Les nouveautés réutilisent les
> structures existantes (`c.equipped`, `recalculateStats()`, `statusEffects[]`,
> l'ATB de Célérité) ou s'ajoutent en **surcouche défensive** (call-sites gardés
> `if (window.X)`), comme `UX`, `CombatFX`, `Haptics`.

> ✅ **Règle d'or doc** : `CLAUDE.md` et `G2-combat.md` restent la source de
> vérité **du code livré** ; ce plan décrit la **cible** et la route pour y aller.

---

# ÉTAPE 1 — Spécifications & production de contenu

## 1.1 Structure générale du combat

### Boucle de round — phases claires

✅ (dans le jeu, `battle.js`) Le combat est au **tour par tour**, 1-2 héros vs
1-5 ennemis (cap `MAX_ENEMY_GROUP = 5`, plafond contextuel `currentMaxGroupSize()`).
La cible de synthèse formalise **4 phases** lisibles (déjà présentes, à nommer
explicitement dans le journal de combat) :

```
┌─ PHASE 1 · CHOIX  ── chaque héros vivant choisit une action (Harry → Hermione)
│                       Célérité (ATB) peut re-prompter le même héros (✅)
├─ PHASE 2 · RÉSOLUTION ── application des actions héros (dégâts, sorts, soins),
│                          ouverture des fenêtres de synergie & de corruption (💡)
├─ PHASE 3 · ENNEMIS ── chaque ennemi vivant agit (tryEnemyAbility / attaque),
│                        capacités selon `chance`, IA `aggressive/cautious/random`
└─ PHASE 4 · EFFETS D'ÉTAT ── tick des statuts (DoT, regen), regen d'équipement,
                              décrément des cooldowns (Garde, Célérité), expiry
```

> 💡 **Apport synthèse** : exposer ces 4 phases dans le **journal de combat
> enrichi** (`UX.logCombatTurn`) et la **timeline d'initiative**
> (`UX.renderTimeline`) — le joueur lit *où il en est* dans le round. Pur UX,
> aucun changement de règle.

### Solo & Duo — positionnement et synergies

✅ État actuel : `partySize` (1/2). En Solo, seul Harry agit (indicateur masqué).
En Duo, Harry puis Hermione, or/XP/inventaire partagés (`party[0] === player`).

💡 **Positionnement Duo (`duoPositioning`)** — *léger, pas de grille tactique* :
deux postures déclaratives, choisies hors combat (fiche perso) ou via une action
gratuite 1×/combat :

| Posture | Héros « Avant » | Héros « Arrière » |
|---------|-----------------|-------------------|
| **Phalange** (défensif) | encaisse en priorité (cible préférentielle ennemie +20 %), +10 % mitigation Garde | protégé : −20 % d'être ciblé |
| **Tenaille** (offensif) | bonus combo : si l'Arrière a déjà agi ce round sur la **même cible**, l'Avant gagne +15 % dégâts | met en place le combo (marque la cible) |

> ❓ **À arbitrer** : posture **persistante** (set-and-forget, lisible) vs
> **action de combat** (tactique, coûte un tempo). Reco : *persistante par
> défaut*, bascule gratuite 1×/combat — colle à la philosophie « lisible et
> tactique plutôt que nerveux » de G2.

---

## 1.2 Mécaniques centrales

### Initiative / Vitesse

✅ **Socle existant** : l'ordre est fixe (héros → ennemis) **mais** l'AGI
n'est pas morte : **Célérité** (`c.celerite`, courbe de Hill, demi-sat AGI 45,
cap 0.30) alimente un **accumulateur ATB** (`celeriteGauge[idx]`) qui octroie
des **actions supplémentaires fluides** (`advanceBattleChar` re-prompte le même
héros). C'est déjà un système de vitesse *par fréquence d'action*.

💡 **Initiative explicite (`turnOrder`)** — surcouche **cosmétique d'abord** :
calculer en début de round un `turnOrder` trié par AGI effective (héros + ennemis)
et l'afficher dans `UX.renderTimeline`. **V1 = lecture seule** (les héros agissent
toujours avant, les ennemis après — zéro régression). ❓ **À arbitrer** : passer
plus tard à un **ordre réellement entrelacé** (un ennemi très rapide agit avant un
héros lent) — gros impact sur l'équilibre, **à valider en sim avant d'engager**.

### Ressources : Mana, Endurance, Corruption

| Ressource | État | Rôle |
|-----------|------|------|
| **PM (Mana)** ✅ | en jeu | coût des sorts (`cost`), regen via Garde / `regenSp` / Récolte Magique |
| **Endurance (`staminaCost`)** 💡 | champ **réservé** (spells-magic §1.2, ❓2) | coût d'appoint de **2-3 rituels lourds** uniquement — **pas** de 2ᵉ jauge omniprésente. Puisé sur une réserve dérivée de l'END ; plancher : ne descend jamais le perso sous le minimum d'action |
| **Corruption (`corruptionLevel`)** 💡 | **design only** (non codé) | compteur de **risque progressif** en profondeur — voir ci-dessous |

#### Jauge de Corruption — le risque progressif

💡 **Nouveau levier endgame** (cohérent avec les *gradients de corruption* du
Ch.09 et la Boucle Ch.11). `corruptionLevel` (int, sérialisé) **monte** quand un
**sort corrompu** déclenche son contrecoup, et module un cercle vicieux
risque/récompense :

- **Effet positif** : `+puissance` des sorts `tier:"corrompu"` proportionnel au
  niveau (le joueur frappe plus fort à mesure qu'il s'enfonce).
- **Effet négatif** : `+corruptionRisk` (probabilité de contrecoup) → plus on
  abuse, plus ça mord.
- **Contrecoup configurable par sort** (`corruptionBacklash`, ❓5 déjà arbitré
  côté spells) : `auto-dégât` (% PV max), `statut` (burn/bleed/poison sur le
  lanceur), ou `incrément du compteur`.
- **Garde-fou Ch.13** : **jamais bloquant**, **jamais létal** par lui-même,
  **n'altère pas** le scaling ennemi. C'est un *style de jeu de prestige*, pas une
  punition. Gate de visibilité : `victoryAchieved || effectiveFloor >= 11`.
- **Lecture joueur** : teinte HUD + barks dédiés (héros qui s'inquiètent de la
  magie noire), entrée Codex.

> ❓ **À arbitrer** : la Corruption **redescend-elle** ? Pistes : (a) statique
> (ne baisse jamais — engagement fort), (b) décroît lentement hors-combat
> (1/étage « propre »), (c) purgeable par un rituel/PNJ. Reco : **(b)** —
> tension qui respire sans annuler l'engagement.

### Actions de combat — catalogue cible

✅ 5 actions existantes + 1 ajout proposé :

| Action | Coût | État | Effet |
|--------|------|------|-------|
| 🗡️ **Attaquer** | — | ✅ | physique `atk + 0-3 vs DEF_eff`, crit LCK, plancher 25 % |
| ✨ **Sortilège** | PM (+ `staminaCost` rituels 💡) | ✅ | catalogue du perso, éléments, crit AGI, statuts |
| 🏺 **Artefact** | — / charge 💡 | 💡 | **active** un artefact à effet déclenché (voir 1.3) — distinct de l'équipement passif |
| 🧪 **Objet** | — | ✅ | consommables uniquement |
| 🛡️ **Garde** | — | ✅ | mitigation 50 %, empile (cap 3), regen PM, riposte 30→40 % |
| 💨 **Fuir** | — | ✅ | AGI vs ATK, +Fortune, garanti au Balai |
| 🌿 **Interaction env.** | — | 💡 | activer un élément de salle en combat (voir 1.4) |

> 💡 **Action « Artefact »** : aujourd'hui les artefacts sont **100 % passifs**
> (stats, regen, `grantsSpell`). On ajoute une **sous-classe d'artefacts
> *actifs*** (`activeEffect`) déclenchables 1×/combat ou à charge — sans toucher
> les passifs existants. Ex. : *Orbe Runique* → décharge élémentaire de zone ;
> *Talisman des Fondateurs* → dissipe un statut du groupe. **Réutilise** le
> routage de ciblage (`pendingAction`).

---

## 1.3 Synergies & personnalisation — Artefacts × Sorts × Maisons

C'est le **cœur de la synthèse** : faire que l'investissement en Artefacts 2.0
*et* en Sorts 2.0 se **multiplie** au lieu de s'additionner.

### Leviers déjà livrés (✅ — réutilisés, pas réinventés)

| Levier | Champ | Mécanique | Source |
|--------|-------|-----------|--------|
| Bonus élémentaire | `bonusElemDmg{element\|tous}` | dégâts de sort `× (1 + Σbonus)`, **après** résist/faiblesse/crit | `battle-spells.js:521-543` |
| Réduction coût sort | `spCostReduction` | `cost − Σ`, plancher 1 ; **empile** avec l'Apothéose Serdaigle (`×0.8`) | `battle-spells.js:543-550` |
| Vol de vie de sort | `spellLifesteal` (set Serpent 4/4) + Apothéose Serpentard | `heal = floor(dmg × frac)` | `battle-spells.js:641,951` |
| Riposte | `counterChance` | s'ajoute au socle Garde (30→40 %) | `inventory-core.js:513` |
| Célérité / Fortune | `bonusCelerite` / `bonusFortune` | poussent les courbes dérivées (AGI/LCK) | `inventory-core.js` |
| Crit double canal | `bonusCritChance`/`bonusSpellCrit*`/`bonusCritDamage` | sets de Maison + Ténèbres | G3/G5 |
| Premium (artefact) | `PREMIUM_MULT` rare 1.20 / epic **1.35** / legendary **1.50** | stats **pré-cuites** (jamais au runtime) | `data.js:767` |
| Premium (sort) | `SPELL_PREMIUM_MULT` rare 1.20 / epic **1.30** / legendary **1.40** | puissance **pré-cuite** | `data.js:434` |

### Synergie signature — Artefact Premium ↔ Sort signature de Maison

💡 **La synergie phare demandée.** Mécanique d'**évolution de sort par artefact**
(`resolveSpellForm`, socle P0 déjà présent mais renvoie la forme de base) :
équiper un **artefact Premium de Maison** *fait évoluer / surcharge* le **sort
signature Mythe** de la même Maison.

| Maison | Artefact Premium | Sort signature (Mythe) | Effet de la synergie (💡) |
|--------|------------------|------------------------|---------------------------|
| 🦁 Gryffondor | Orbe Runique de Godric | **Patronus Maxima** | bouclier de groupe +1 tour & dissipe aussi `weaken` |
| 🐍 Serpentard | Masque Rituel de Salazar | **Sectumsempra Imperius** | `bleed` +1 palier & `spellLifesteal` du coup ×1,5 |
| 🦅 Serdaigle | Bâton Ancestral de Rowena | **Legilimens** | annule **2** capacités au lieu d'1, sans surcoût d'incrément |
| 🦡 Poufsouffle | Talisman de Helga | **Récolte Magique** | regen PV/PM +50 % & soigne aussi les statuts DoT |

> Implémentation **non destructive** : `resolveSpellForm(spellName, char)` au point
> de cast/affichage renvoie la **forme surchargée** si l'artefact affine est
> équipé, sinon la **forme de base** (déséquiper = retour immédiat, aucune mutation
> de `char.spells`). Mirroir exact de l'évolution `Incendio → Incendio Majeur`
> (spells-magic §1.6).

### Variantes par Maison & par héros

✅ `houseAffinity` (sorts & artefacts), `HOUSE_SPELL_FX` (FX/teinte par Maison),
`HERO_PATRONUS` (16 héros, cosmétique), passifs Apothéose (Élan/lifesteal/coût/Vigueur).
💡 **Synthèse** : exposer dans la fiche perso un encart **« Synergies actives »**
listant les couples Artefact↔Sort↔Maison effectivement débloqués (lecture du build).

### Effets de corruption — sorts corrompus

💡 Sorts `tier:"corrompu"` (mult **2.8**, teinte `#7a2f8a`) : **plus puissants,
mais risqués**. Catalogue cible (spells-magic §1.4.C) : *Flamme Dévorante* (Gryff,
`corruptionRisk 0.15`), *Venin du Cachot* (Slyth, 0.15), *Savoir Interdit* (Serd,
0.20), *Fardeau Partagé* (Pouf, 0.10), *Fiendfyre*, *Écho Fantôme*. Chaque jet de
contrecoup réussi applique `corruptionBacklash` **et** peut incrémenter
`corruptionLevel`. Débloqués **uniquement** en Boucle (`effectiveFloor >= 11`),
quand l'ennemi porte le scaling endgame — pas de trivialisation du early game.

---

## 1.4 Types d'ennemis & dynamisme

### Bestiaire — gradients de corruption (Ch.09)

✅ Le moteur applique déjà `effectiveFloor` (recyclage Boucle) et les **variantes
Ténébreuses** (boss 8-10 reviennent en *Ténébreux* aux étages 18-20, barks
`darkBoss`/`darkBossDown`). La **synthèse** branche le *triple gradient* narratif
(Ch.09 §9.1.2) sur des **leviers de combat lisibles** :

| Profondeur | État corruption | Traduction combat (lisible au bestiaire 🔰/💥) |
|-----------|-----------------|-----------------------------------------------|
| 1-3 (A) | Suintement | familiers, faible danger, peu de capacités |
| 4-6 (B) | Infiltration | premiers `weaken`/statuts, brutes (Broyer auto) |
| 7-10 (C) | Imprégnation | boss epic, `fear`/`drain`/`dispel`, attrition |
| 11-13 (C+) | Débordement | variantes **Ténébreuses**, capacités empilées |
| 14+ (D) | Source | gardiens runiques, `stun`/`gel`, résistances multiples |

Les **3 signatures** (froid `glace`, peur `fear`, voix des Fondateurs) cartographient
sur des **réponses tactiques** : *lumière/Patronus* contre la peur et les
morts-vivants (`Lumos Solem ×1.5`, `Patronus Maxima` dissipe `fear`), *feu* contre
le givre. ✅ tous ces vecteurs existent — la synthèse les **met en scène**.

### Combats environnementaux (Ch.10)

✅ Existant : pièges (`CELL.TRAP`) → embuscade (combat **déclenché**), fontaine/
refuge/autel **hors combat**. ❌ Aucune interaction d'élément de salle **pendant**
le combat aujourd'hui.

💡 **Modificateurs d'environnement (`environmentalModifiers`)** — légers, dérivés
du **thème d'étage** (`getFloorTheme`) et de la cellule d'engagement, **sans
nouvelle géométrie** :

| Contexte | Modificateur de combat (💡) | Action env. dédiée (💡) |
|----------|-----------------------------|-------------------------|
| Tranche D « Ruines », case proche d'une **rune** | `feu`/`foudre` +10 % (charge runique ambiante) | 🌿 *Activer la rune* : 1×/combat, étourdit (`stun`) l'ennemi le plus proche |
| **Givre** (Cachots, Spectre de Givre présent) | sol glissant : fuite −10 %, `gel` +1 tour | — |
| Près d'une **fontaine non tarie** | — | 🌿 *Asperger* : soin léger de groupe, **tarit** la fontaine |
| **Forêt/Égouts** (lisière B/C) | embuscade : 1ᵉʳ round l'ennemi peut agir avant (init) | — |

> Implémentation : un objet `environmentalModifiers` calculé **à
> `startBattle`** (pur, depuis `currentFloor` + cellule + groupe), consommé par
> les calculs de dégâts/fuite via des helpers gardés. **Zéro** placement de
> cellule nouveau ; on lit l'existant. ❓ **À arbitrer** : périmètre V1 = **1 seul
> modificateur** (la rune en zone D) pour valider la plomberie avant d'en ajouter.

### Boss — phases narratives

✅ Boss `epic:true` (musique dédiée, barks). 💡 **Phases scénarisées** pour les
boss de quête signature & gardiens de Fondateurs : seuils de PV (`hpMax`)
déclenchant un **beat narratif** (bark scénarisé `heroBarkScripted`) + un
**changement de pattern** (nouvelle capacité débloquée < 50 % PV). Réutilise
`abilities[]` (capacité gardée par un flag `phase:2`) — **aucune** nouvelle
boucle, juste un gate de probabilité. Ex. : le *Gardien de la Chambre du Lion*
passe en « rage de feu » (`burn` garanti) sous 40 % PV.

---

## 1.5 Équilibrage & progression

✅ **Scaling existant** (à **ne pas toucher**, Ch.13) :
`stat = base × intraMult(scale 0.15-0.40) × diffMult` ; difficulté ×0.75/1.0/1.22/1.45 ;
Boucle `ENDGAME_SCALING` (×~1.5 / palier de 10 étages). Tout nouvel apport joueur
est **additif** au-dessus.

| Axe | État | Synthèse |
|-----|------|----------|
| **Acte / étage** | ✅ tranches A/B/C/D, courbe lisse (sim) | gradients corruption = habillage des paliers |
| **Niveau de Boucle** | ✅ `endgameTierIndex`, ★ N | Corruption + sorts corrompus = nouveau levier de prestige |
| **Choix du joueur** | ✅ difficulté verrouillée Ironman, NG+ empilable | Corruption assumée = difficulté *volontaire* |
| **Feedback** | ✅ `UX` (log/floatDmg/timeline), `CombatFX`, audio par event | + bandeaux Synergie/Corruption/Célérité, teinte HUD |
| **Mort / Game Over** | ✅ standard *doux* (`resurrect`) / Ironman *permadeath* | héritage Boucle = ❓ **hors-scope V1** (Ch.13 §13.4.4) |

### Mort & héritage

✅ Standard : pétrification → `resurrect()`, pas de game-over dur. Ironman :
`showIronmanResult` + suppression de tous les slots Ironman, soumission Hall of Fame.
💡/❓ **Héritage en Boucle** (Ch.13 §13.4.4) : conserver une fraction (or/2, paliers
de Maison gardés, niveaux du palier de Boucle courant perdus) — **mécanique
entièrement neuve**, façon roguelite. **Recommandation : hors-scope V1**, la
dualité doux/permadeath couvre déjà les deux publics.

---

## 1.6 Tables de synthèse

### Actions × Coût × Synergies × Variantes de Maison

| Type d'action | Coût | Synergies clés | Exemples | Variantes Maison |
|---------------|------|----------------|----------|------------------|
| 🗡️ Attaquer | — | STR→pénétration DEF (D4), crit LCK, `counterChance` | coup critique ×`critMultiplier` | Gryffondor : Élan (crit empilable) |
| ✨ Sortilège | PM (+`staminaCost` rituels 💡) | `bonusElemDmg`, `spCostReduction`, `spellLifesteal`, crit AGI, évolution par artefact | Incendio → Incendio Majeur (Bâton) | sort signature Mythe par Maison |
| 🏺 Artefact (actif 💡) | charge / 1×combat | dissipe statut, décharge élémentaire | Orbe Runique : nova ; Talisman : purge | Premium recoloré + FX par Maison |
| 🛡️ Garde | — | `counterChance`, mitigation, Double-Garde | riposte `atk/2` sans consommer le tour | Poufsouffle : Vigueur (>60 % PV) |
| 🧪 Objet | — | Fortune (drops), Félix (chance) | potions, Félix Felicis | — |
| 💨 Fuir | — | Fortune (+chance), AGI vs ATK | garanti au Balai | — |
| 🌿 Interaction env. 💡 | — | `environmentalModifiers` du thème d'étage | activer rune → `stun` | — |

### Ressources de combat

| Ressource | Variable | Plage | Regen | État |
|-----------|----------|-------|-------|------|
| PV | `c.hp` / `c.hpMax` | 0..max | Garde-non, `regenHp`, soins, fontaine | ✅ |
| PM | `c.sp` / `c.spMax` | 0..max | Garde (`3+mag/5`, 1t/2), `regenSp`, Récolte Magique | ✅ |
| Endurance | `staminaCost` (puise réserve END) | rituels lourds | hors-combat | 💡 réservé |
| Corruption | `corruptionLevel` | 0..N | (b) −1/étage propre ❓ | 💡 design |
| Célérité (ATB) | `celeriteGauge[idx]` | 0..1 (déborde→action) | +`celerite`/segment | ✅ |
| Garde | `guardTurns[idx]` | 0..3 | pose/tour | ✅ |

---

# ÉTAPE 2 — Plan d'implémentation

## 2.1 Structures de données

> Tout en **scope global**, dans les fichiers existants. Les registres « pré-cuits »
> (Premium) ne sont **jamais** recalculés au runtime.

### Sorts (extension `SPELLS`, `data.js`) — socle ✅ P0/P1, suite 💡

```js
// ✅ DÉJÀ : id, category, tier, rarity, houseAffinity, element, cost, power
// 💡 À AJOUTER (P3+/P4) :
{
  // Premium (P3) — entrée distincte, puissance pré-cuite × SPELL_PREMIUM_MULT[rarity]
  premium: true, premiumOf: "incendio", premiumFx: "gryff", tint: "#d3a625",
  // Évolution (P3) — résolu par resolveSpellForm, non destructif
  evolvesTo: "incendio_majeur",
  evolveCondition: { type: "artifact", value: "baton_ancestral" },
  synergyArtifacts: ["baton_ancestral"],
  // Corruption (P4)
  corruptionRisk: 0.15,                              // 0..1
  corruptionBacklash: { type: "status", value: "burn" }, // | {type:"dmg_pct",value:0.15} | {type:"meter_inc",value:1}
  staminaCost: 0                                     // >0 pour 2-3 rituels lourds
}
```

### Artefacts actifs (extension `ITEMS`, `data.js`) — 💡

```js
// ✅ DÉJÀ : formType, slot, rarity, houseAffinity, premium/premiumOf/premiumFx/tint,
//          bonus* (atk/def/mag/lck/str/int/agi/end, crit*, dodge, celerite, fortune,
//          hpMax/spMax), regenHp/Sp, bonusElemDmg{el|tous}, spCostReduction, grantsSpell,
//          setKey/setPiece, fearImmune, immuneDisarm(set), spellLifesteal(set)
// 💡 À AJOUTER : sous-classe ACTIVE (passifs inchangés)
{
  activeEffect: {
    id: "nova_runique",
    label: "Décharge runique",
    charges: 1,                    // par combat (reset startBattle)
    target: "enemyAll" | "ally" | "self" | "allyAll",
    resolve: "elemBurst" | "purgeStatus" | "shieldGroup",
    power: 12, element: "foudre"
  }
}
```

### État de combat (`state.js`) — variables & flags

| Variable | Type | Portée | État |
|----------|------|--------|------|
| `enemyGroup` | array | combat | ✅ |
| `currentBattleChar`, `pendingAction`, `pendingSpell` | — | combat | ✅ |
| `shieldTurns[]`, `guardTurns[]`, `guardRegenCooldown[]` | array | combat | ✅ |
| `celeriteGauge[]`, `celeriteExtra[]` | array | combat | ✅ |
| `turnOrder` | array trié AGI | combat (lecture seule V1) | 💡 |
| `corruptionLevel` | int | **sérialisé** | 💡 |
| `duoPosture` | `'phalange'\|'tenaille'` | sérialisé | 💡 |
| `environmentalModifiers` | objet pur | combat (calc `startBattle`) | 💡 |
| `synergyBonuses` | objet dérivé (recalc) | combat | 💡 |
| `artifactCharges[idx]` | map | combat (reset `startBattle`) | 💡 |

### Synergies (objet dérivé, `inventory-core.js`) — 💡

```js
// Calculé dans recalculateStats() après stats+sets, par perso :
c._synergies = {
  spellOverride: { "Patronus Maxima": "patronus_maxima_godric" }, // artefact Premium affine équipé
  activeArtifacts: [ /* refs vers item.activeEffect équipés */ ]
};
```

## 2.2 Système de résolution des tours

Ordre de priorité **défensif** (✅ existant, à préserver) :
**Protego → Esquive → Garde → coup normal**. Pipeline de dégâts physique
(`executeAttack` ✅) et de sort (`_spellElementalDamage` ✅) inchangés ; on **insère**
des hooks gardés :

```
castSpellInBattle(spell, ...) :
  cost = _spellSpCost(spell, char)            // ✅ inclut spCostReduction + Apothéose
  if (spell.staminaCost) consumeStamina(...)  // 💡 rituels lourds
  spell = resolveSpellForm(spell.name, char)  // 💡 surcharge Premium/évolution
  dmg = _spellElementalDamage(spell,char,...) // ✅ inclut bonusElemDmg
  applySynergy(spell, char)                   // 💡 effet signature surchargé
  if (spell.corruptionRisk && roll<risk)      // 💡 contrecoup
      applyCorruptionBacklash(spell, char)
```

Calcul de l'`environmentalModifiers` à `startBattle` (pur) ; appliqué dans
`spellDamage`/`doFlee` via helpers `if (window.envMod) …`. `turnOrder` recalculé
en tête de round pour la timeline.

## 2.3 Intégration génération procédurale & ambiances

- ✅ `getFloorTheme(floor)` = source unique tileset/ambiance → **réutilisé** pour
  `environmentalModifiers` (zone D = charge runique, B+givre = sol glissant).
- ✅ `effectiveFloor` / variantes Ténébreuses → la corruption d'**ennemi** est
  déjà gérée ; `corruptionLevel` du **joueur** est orthogonal.
- ✅ Pièges/cellules (`dungeon.js`) inchangés ; l'interaction env. **lit** la
  cellule d'engagement, n'en crée aucune.
- Musique : `startCombatMusic(enemyGroup)` ✅ ; ajouter une couche « corruption
  critique » (réutilise le sample `tension` réservé) quand `corruptionLevel` haut. 💡

## 2.4 UI / UX du combat

| Élément | État | Apport |
|---------|------|--------|
| Journal enrichi (`#combat-timeline-log`) | ✅ `UX.logCombat*` | nommer les 4 phases, lignes Synergie/Corruption 💡 |
| Timeline d'initiative | ✅ `UX.renderTimeline` | afficher `turnOrder` AGI 💡 |
| Dégâts flottants | ✅ `UX.floatDmg` | type `corrupt` (teinte `#7a2f8a`) 💡 |
| Barre d'actions | ✅ `#battle-actions` | boutons 🏺 Artefact / 🌿 Env. conditionnels 💡 |
| HUD ressources | ✅ PV/PM | jauge Corruption discrète (apparaît en Boucle) 💡 |
| Tooltips riches | ✅ `UX.showTooltip` | aperçu synergie/contrecoup au survol du sort 💡 |
| FX | ✅ `CombatFX`, `Haptics` | FX Premium par `premiumFx`/`HOUSE_SPELL_FX` 💡 |

Tous **défensifs** (`if (window.UX) …`) — absence de module = jeu nominal.

## 2.5 Duo, boss & combats spéciaux

- **Duo** : `duoPosture` lue dans `executeAttack` (ciblage préférentiel Phalange)
  et `spellDamage` (combo Tenaille, marque la cible ce round). Solo : posture ignorée. 💡
- **Boss à phases** : flag `ability.phase` + seuil `hpFrac` dans `tryEnemyAbility` ;
  beat `heroBarkScripted` au franchissement. 💡 Réutilise quêtes signature (Ch.08).
- **Gardiens de Fondateurs** : synergie *résistance de Maison* — un gardien résiste
  à l'élément de sa Maison, faible à son opposé (déjà data-driven `resist`/`weak` ✅).
- **Combat astral** (Mondes Parallèles) ✅ inchangé ; les échos passent
  `{ngPlusLevel:0, corruptionLevel:0}` (neutres).

## 2.6 Priorisation

```
P0 · Socle (✅ déjà livré)            — moteur, statuts, éléments, crit, Garde, Célérité,
                                        Artefacts P0-P3, Sorts P0-P1
P1 · Synergie Artefact↔Sort (✅ LIVRÉ) — resolveSpellForm actif (évolution + override
     (le plus fort ROI)                 signature Premium), encart « Synergies » fiche
P2 · Variantes avancées (✅ LIVRÉ)    — artefacts ACTIFS (action 🏺), duoPosture,
                                        boss à phases
P3 · Corruption                       — corruptionLevel + sorts corrompus + contrecoup,
     (gate Boucle, sim obligatoire)     HUD/teinte/barks, gate effectiveFloor>=11
P4 · Environnement en combat          — environmentalModifiers (1 modif. V1 : rune zone D),
                                        action 🌿
P5 · Équilibrage & polish (✅ LIVRÉ)  — Codex sorts/synergies (amorce), bandeaux de
                                        combat, FX Premium par Maison, sons procéduraux
```

> Chaque palier est **livrable seul** (additif). On ne touche **jamais** à
> P0 ni au scaling. Validation `node tools/sim-difficulty.js` **obligatoire**
> avant P3 (corruption) et P2 (postures, qui touchent l'équilibre Duo).

## 2.7 Suggestions d'assets

- **Animations de sorts** : 1 variante FX par `premiumFx` (gryff/slyth/serd/pouf) —
  particules teintées (`HOUSE_SPELL_FX`), réutilisables sur signature + Premium.
- **Sorts corrompus** : surcouche visuelle pourpre `#7a2f8a` (fissures, fumée noire),
  flash de contrecoup distinct.
- **Sons** : timbre Premium par Maison (déjà cadré : fanfare/sifflement/carillon/cor),
  impact « contrecoup » grave, couche musicale corruption (sample `tension`).
- **UI réactive** : jauge Corruption (apparition en Boucle), badge de synergie active
  sur le sort, bandeau « ⚡ Célérité / 🔗 Synergie / 🩸 Contrecoup » (réutilise le style
  des bandeaux existants).
- **Icônes** : artefacts actifs (pipeline `icon_factory.py`, accent `orb_glow`/`runes`),
  glyphes de Maison déjà disponibles (`lion/snake/eagle/badger`).

---

## 3. Objectifs finaux & critères de vérification

| Objectif | Critère vérifiable |
|----------|--------------------|
| Combat stratégique valorisant tous les systèmes | un build « Artefact Premium + Sort signature » montre une **différence chiffrée** mesurable en sim |
| Forte progression & personnalisation | encart « Synergies actives » non vide dès un couple débloqué ; Corruption visible en Boucle |
| Cohérence Ch.13 | `node tools/sim-difficulty.js` : win-rates par étage **inchangés hors apports joueur** ; aucun spike |
| Prêt pour démo jouable | `node tests/smoke.js` vert à chaque palier ; nouveaux scénarios (synergie, posture, corruption, env.) ajoutés **dans le même commit** que leur code |
| Zéro régression | call-sites défensifs ; cache PWA bumpé (skill `cache-bump`) à chaque palier touchant un `js/`/`css/` |

---

## Journal du plan

- **2026-06-21** — **P5 (feedback/UI) LIVRÉ — clôture du palier.** Suite des
  volets §2.4 « UI/UX du combat » et §2.7 « Suggestions d'assets », 100 %
  additif/défensif, `dungeon-scaling.js` jamais touché, aucune logique de combat
  P0-P4 modifiée (surcouche pure UX/FX/son).
  - **Bandeaux de combat** (`js/ux-improvements.js` + `css/ux-improvements.css`) :
    nouvelle fonction `UX.combatBanner(label, kind)` — callout transitoire centré
    en haut de l'arène (couche `#combat-banner-layer`, esprit « ⚡ Célérité ! »),
    teinté par `kind` ∈ `synergy|artifact|tenaille|rune|backlash`. Câblé aux
    call-sites EXISTANTS (1 ligne chacun, rien re-câblé) : 🔗 Synergie
    (`castSpellInBattle` quand `spell._synergy`), 🏺 Artefact (`useActiveArtifact`),
    🤝 Tenaille (`executeAttack` + `_computeSpellDamage` quand le focus-fire
    s'applique), 🌿 Rune (`triggerRuneEnv`), 🩸 Contrecoup (`_applyCorruptionBacklash`).
  - **FX Premium par Maison** (`js/combat-fx.js` + `css/combat-fx.css`) :
    `CombatFX.premiumCast(casterKey, fxKey)` — anneau teinté + glyphe de Maison +
    particules colorées émanant du lanceur, palette auto-suffisante par `premiumFx`
    (gryff/slyth/serd/pouf, miroir de `HOUSE_SPELL_FX`). Câblage central dans
    `castSpellInBattle` (`if (spell.premium && spell.premiumFx) CFX_safe.premiumCast(…)`).
    Respecte `prefers-reduced-motion`.
  - **Sons procéduraux** (`js/audio-sfx.js`, défensifs/repli silencieux) :
    `playPremiumCast(fxKey)` (timbre par Maison : fanfare/sifflement/carillon/cor) +
    `playBacklash()` (impact grave descendant + sub) — câblés aux mêmes points.
  - **Vérif** : `node tests/units.js` (inchangé, vert) ✅ ; `node tests/smoke.js`
    (250/250, dont nouveau `scenarioP5Feedback` : APIs présentes, 5 bandeaux rendus,
    4 FX Premium, câblage cast Premium + synergie) ✅ ; `node tests/pwa-smoke.js`
    (CACHE_VERSION v190) ✅. Cache PWA bumpé (7 assets : ux-improvements.js/css,
    combat-fx.js/css, audio-sfx.js, battle.js, battle-spells.js). Aucun nouveau
    global (méthodes ajoutées à UX/CombatFX/AudioSystem) → MANIFEST loader inchangé.
  - **Reste cadré hors-scope P5** (volets nécessitant une passe de calibration ou
    des assets non procéduraux) : passe `sim-difficulty` de réglage fin
    (coûts/corruptionRisk/postures) — non requise ici car ce volet est 100 %
    cosmétique. Le palier P5 du plan est désormais **clos**.

- **2026-06-20** — **P5 (amorce, volet Codex) LIVRÉ.** Premier volet du palier
  polish (§2.6/§2.7 « Codex sorts/synergies ») : **3 entrées Codex** documentant
  les systèmes de combat P2/P4, déverrouillables via les robinets existants
  (aucun nouveau type de condition, aucune nouvelle section/onglet → surgical).
  - `js/codex.js` (catégorie `glossaire`) : `artefacts_actifs` (robinet `item` —
    posséder un artefact à `activeEffect` ; révélée étage 8), `postures_duo`
    (robinet `floor` 2→6), `environnement_runique` (robinet `floor` 14 / `victory`
    — révélée à la victoire). Voix in-world (veiled + revealed), liens vers les
    entrées Objets/Lieux existantes.
  - **Vérif** : `node tests/units.js` (897, +11 sur les 3 entrées) ✅ ;
    `node tests/smoke.js` (249/249, dont `scenarioCodexCombatSystems`) ✅ ;
    `pwa-smoke` (CACHE_VERSION v189) ✅. Aucune logique de combat touchée
    (data-only + tests). Reste P5 : FX Premium par Maison, sons de contrecoup,
    bandeaux UI, passe `sim-difficulty` de calibration (volets art/audio à cadrer).

- **2026-06-20** — **P4 LIVRÉ (Environnement en combat).** Vérif : `node
  tests/units.js` (886, dont `computeEnvModifiers`) ✅ ; `node tests/smoke.js`
  (248/248, dont `scenarioCombatEnv`) ✅ ; `node tests/pwa-smoke.js`
  (CACHE_VERSION v187) ✅ ; `check_doc_modules` ✅. Apport 100 % additif, gaté
  endgame (zone D / post-victoire), `dungeon-scaling.js` intouché → win-rates
  baseline définitionnellement inchangés (la sim ne modélise pas les modificateurs
  d'environnement, qui sont des buffs joueur gatés). Reste **P5** (polish/équilibrage)
  comme dernier palier du plan. Détail ci-dessous.

- **2026-06-20** — **P4 (Environnement en combat) — détail.** P3 (Corruption)
  est **déjà livré** par le chantier *Sorts & Magie 2.0* (PR #610 « corrompus,
  corruption, contrecoup & Boucle » : `corruptionSpellModifier`,
  `resolveCorruptionBacklash`, `corruptSpellGateOpen`, `spellCorruption` sérialisé)
  → le palier combat-synthesis P3 est couvert ; on enchaîne sur **P4**. Périmètre
  **V1 = 1 seul modificateur** (la rune en zone D), additif, scaling intouché.

  - `js/floor-ambiance.js` : helper **PUR** `computeEnvModifiers(floor,
    victoryAchieved)` → `{ runic, spellElemBonus:{feu:0.10,foudre:0.10} }`. `runic`
    vrai en **zone D** (étage 14+, `getFloorTheme().wall === 'rune_wall'`) **ou**
    override rune post-victoire (étage 11+ `victoryAchieved`). Cohérent avec le
    look runique du renderer.
  - `js/state.js` : `envModifiers` (objet pur) + `envRuneCharge` (1×/combat),
    combat-scoped, **non sérialisés** (comme `celeriteGauge`).
  - `js/battle.js` : calc à `startBattle` ; `_envElemBonus(element)` (feu/foudre
    +10 % en zone runique, défensif) ; `triggerRuneEnv()` (action 🌿, 1×/combat :
    étourdit `stun` l'ennemi le plus proche, consomme le tour).
  - `js/battle-spells.js` : `_envElemBonus` appliqué dans `_spellElementalDamage`
    (après `_artifactElemBonus`, même pipeline additif).
  - `js/battle-ui.js` + `index.html` : bouton **🌿 Rune** conditionnel
    (`_refreshBattleActionButtons`), visible en zone runique tant que la charge
    n'est pas dépensée.
  - **Vérif** : `node tests/units.js` (`computeEnvModifiers`) + `node tests/smoke.js`
    (`scenarioCombatEnv`) ; cache PWA bumpé. Non touché : `dungeon-scaling.js`,
    P0/P1/P2/P3. Le modificateur « givre/sol glissant » (doFlee) et l'« asperger
    fontaine » restent **hors-scope V1** (plan §1.4 : valider la plomberie d'abord).

- **2026-06-20** — **P2 LIVRÉ (Variantes avancées).** Trois briques additives,
  scaling monstres (`dungeon-scaling.js`) **jamais touché**. Apport 100 % additif,
  call-sites défensifs.

  **Vérif finale** : `node tests/units.js` (838 assertions, dont `_abilityPhaseReady`
  + `_duoComboMult`) ✅ ; `node tests/smoke.js` (245/245, dont les 3 scénarios
  dédiés `scenarioActiveArtifact` / `scenarioDuoPosture` / `scenarioBossPhase`) ✅ ;
  `node tools/sim-difficulty.js` → win-rates baseline inchangés (les apports P2 sont
  des buffs joueur opt-in / une capacité boss gatée, hors modèle de sim ; scaling
  intouché) ✅ ; `node tests/pwa-smoke.js` (CACHE_VERSION v184) ✅ ; cache PWA bumpé
  (9 assets : data/state/save/battle/battle-spells/battle-ui/monsters/hero-barks/
  ui-character-sheet).

  **Écart assumé** : le rider « +10 % mitigation Garde » de Phalange (plan §1.1)
  est **abandonné** — la baseline Garde 50 % est verrouillée par un test existant
  (`scenarioGuardAndFerula`) et la changer par défaut = régression silencieuse.
  Phalange conserve son identité défensive via le **biais de ciblage** (l'avant
  encaisse +20 %, l'arrière plus fragile est protégé). Deux tests existants
  ajustés sans changer leur intention : `scenarioGuardAndFerula` (inchangé,
  re-validé) et `scenarioCombatMobile` (compte désormais les boutons *visibles* —
  les 2 boutons conditionnels 🏺/🔄 sont masqués hors contexte).

  Détail des briques :

  **Brique A — Artefacts actifs (`activeEffect`)** :
  - `state.js` : `artifactCharges` (map idx→charges restantes, combat-scoped,
    reset `startBattle`).
  - `data.js` : `activeEffect` ajouté à `orbe_runique` (+`orbe_runique_premium_gryff`)
    → `elemBurst` (foudre, 1 ennemi) ; `talisman_fondateurs`
    (+`talisman_fondateurs_premium_pouf`) → `purgeStatus` (groupe) ; `larmes_phenix`
    → `shieldGroup` (groupe). Passifs existants **intouchés**.
  - `battle.js` : `_activeArtifactFor(char)`, `battleAction('artifact')`,
    `useActiveArtifact(charIdx, targetIdx)` + résolveurs `elemBurst`/`purgeStatus`/
    `shieldGroup`. Ciblage 1-ennemi via `showTargetSelection('artifact')` (réutilise
    `pendingAction`). Charge consommée 1×/combat.
  - `battle-ui.js` : branche `pendingAction==='artifact'` ;
    `_refreshBattleActionButtons()` (montre 🏺 si charge dispo).
  - `index.html` : bouton 🏺 conditionnel (caché par défaut).

  **Brique B — Positionnement Duo (`duoPosture`)** :
  - `state.js` : `duoPosture` ('phalange'|'tenaille', **sérialisé**, défaut
    'phalange'), `duoPostureSwitched` (combat-scoped, bascule gratuite 1×/combat),
    `duoComboMarks` (combat-scoped, marque Tenaille par index ennemi).
  - `save.js` : sérialise/applique `duoPosture` (défaut 'phalange').
  - `battle.js` : Phalange → `_chooseEnemyTarget` biais cible avant (+20 %, l'avant
    encaisse pour protéger l'arrière plus fragile — **le rider « +10 % mitigation
    Garde » du plan §1.1 est écarté pour préserver la baseline Garde 50 % bien
    testée → zéro régression**) ; Tenaille → `_duoComboMult(enemyIdx, heroIdx)`
    (+15 % si l'autre héros a déjà frappé cette cible ce round) appliqué dans
    `executeAttack` + marque. `battleAction('posture')` = action gratuite.
  - `battle-spells.js` : Tenaille appliqué dans `_computeSpellDamage` (hub dégâts
    de sort) + marque. **Solo : posture ignorée** (`partySize===1`).
  - `ui-character-sheet.js` : encart « Posture du Duo » (hors combat, duo only).

  **Brique C — Boss à phases (`ability.phase`)** :
  - `battle-spells.js` : `_abilityPhaseReady(a, enemy)` (pur) garde une capacité
    `phase` sous `phaseHpFrac` dans le filtre `fired` de `tryEnemyAbility` ; beat
    `heroBarkScripted` au franchissement (one-shot `enemy._phaseBeatDone`).
  - `monsters.js` : capacité `phase` sur le Gardien de la Chambre du Lion (démo).
  - `hero-barks.js` : lignes `bossPhase` (harry/hermione).

  **Vérif** : `node tests/units.js` + `node tests/smoke.js` (scénarios artefact
  actif / posture / boss-phase dans `tests/scenarios/combat.js`) ;
  `node tools/sim-difficulty.js` (win-rates inchangés hors apports joueur) ; cache
  PWA bumpé. Non touché : P0, P1, P3-P5, `dungeon-scaling.js`.

- **2026-06-20** — **P1 livré (Synergie Artefact ↔ Sort).** Apport 100 %
  additif, zéro régression, scaling monstres intouché.
  - `js/data.js` : `resolveSpellForm(spellName, char)` **activé** (helper PUR
    `_charHasArtifactForm` matchant `item.id` OU `item.premiumOf`) — résout
    l'évolution (`evolvesTo`/`evolveCondition`) puis la surcharge signature
    (`synergyArtifact`/`synergyForm`). Renvoie l'objet base **par identité** si
    aucune synergie → déséquiper = retour immédiat, jamais de mutation de
    `char.spells`. Nouveau sort **Incendio Majeur** (power 22, atteint
    uniquement via évolution) + `SPELL_META`. Champs branchés : `Incendio`
    (pivot `baton_ancestral`) et les 4 sorts Mythe (artefacts Premium du
    tableau §1.3). Helper PUR `spellSynergiesFor(char)` (lecture du build).
  - `js/battle-spells.js` : `castSpellInBattle` insère `resolveSpellForm` avant
    `_spellForCaster` ; les 4 handlers signature lisent défensivement leurs
    riders (Patronus +1 tour & dissipe `weaken` ; Imperius `bleed` +1 palier &
    vol de vie 22,5 % ; Legilimens annule 2 capacités sans surcoût ; Récolte
    purge les DoT).
  - `js/inventory-spells.js` : `openSpells`/`openBattleSpells` résolvent la
    forme à l'affichage (nom/desc/preview/coût + badge `🔗 SYNERGIE`).
  - `js/ui-character-sheet.js` : encart **« Synergies actives »**
    (`_renderSynergyPanel`, masqué si vide).
  - `js/item-icons.js` : `Incendio Majeur` → icône feu (réutilisée).
  - **Vérif** : `tests/units.js` (33 assertions P1 ajoutées) vert ;
    `tests/scenarios/spells.js` → `scenarioSpellArtifactSynergy` (T1 résolution
    non destructive, T2 Patronus surchargé, T3 Legilimens, T4 encart fiche)
    vert ; `pwa-smoke` vert ; cache PWA bumpé (CACHE_VERSION v181, 5 assets).
  - Non touché : P0 (moteur), P2-P5 (corruption, postures, env., artefacts
    actifs), `dungeon-scaling.js`.

- **2026-06-20** — Rédaction ÉTAPE 1 + ÉTAPE 2. Synthèse des chantiers Artefacts 2.0
  (P0-P3 livrés) et Sorts 2.0 (P0-P1 livrés) vérifiée sur le code (`data.js`,
  `battle-spells.js`, `inventory-core.js`). Constat clé : le **moteur de combat est
  mature** ; les apports demandés (initiative explicite, jauge Corruption,
  positionnement Duo, interaction environnementale, artefacts actifs) sont des
  **ajouts additifs non codés**, cadrés ici en P1-P5 derrière des gates et des
  call-sites défensifs. Aucun code modifié à ce stade (document de design).
