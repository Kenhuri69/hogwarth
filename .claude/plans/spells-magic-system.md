# Système de Sorts & Magie Avancée 2.0

> Plan vivant (guidelines §5). Mis à jour à chaque étape franchie.
> Pendant du chantier Artefacts (`artifacts-reliquary-system.md`) : même
> philosophie, mêmes garde-fous, même structure documentaire.
>
> **Statut : ÉTAPE 1 + ÉTAPE 2 rédigées · Lots P0 (socle data inerte),
> P1 (étiquetage + liseré de rang), P2 (sorts par Maison & arbre),
> P3 (Premium & évolutifs) et P4 (Corrompus & Boucle) LIVRÉS.
> P5 (équilibrage final & Codex sorts) à venir.**
>
> ### Journal — Lot P4 (livré)
> Corrompus, corruption, contrecoup, légendaires de quête, sorts temporels +
> réintégration des reports P3 (branche `claude/sorts-p4-corruption`). Réutilise
> le moteur existant — règle d'or §0 (ZÉRO scaling monstre touché).
> - **`corruptionLevel`** (int, `state.js`, **SÉRIALISÉ** `_serializeState`/
>   `_applyState` comme `floorKillCount`) : compteur de groupe, monotone
>   croissant. Monte UNIQUEMENT via le contrecoup `counter` (jamais auto au cast).
> - **Helpers PURS** (`data.js`, testés `units.js`, façon `_fortuneCurve`) :
>   - `corruptionSpellModifier(level)` : fraction saturante (0.12/niveau, cap
>     0.40) qui **majore le power** des sorts corrompus ET **augmente le
>     corruptionRisk** → boucle risque/récompense.
>   - `resolveCorruptionBacklash(backlash, char)` : ❓5 — résout SANS muter le
>     contrecoup configurable par sort (`{type:"selfdmg"|"status"|"counter"}`) →
>     auto-dégât (% PV max), statut (burn/bleed), ou `corruptionLevel++`.
>   - `corruptSpellGateOpen(floor, victory, effFloor)` : gate Boucle.
> - **Combat-scoped (NON sérialisés, reset `startBattle`)** : `echoSpellUsedThisFight`
>   (Écho Fantôme), `timeRewindUsedThisFight` (Tempus Echo + Reliquae Temporis,
>   budget « manipulation temporelle » partagé), `_lastCastSpellByChar`,
>   `_timeSnapshot`, `serpentPactDoubleNext`, `_shieldReflect`.
> - **Gate corrompu** (`castSpellInBattle`, AVANT débit PM, modèle requiresEclats) :
>   un sort `tier:"corrompu"` PORTANT un `corruptionRisk>0` est refusé hors Boucle.
>   ÉCART : ne gate QUE les corrompus à `corruptionRisk` (les nouveaux dangereux),
>   pas Avada.../Fiendfyre/Sectumsempra Imperius legacy (corruptionRisk 0) — sinon
>   régression (Avada appris niv. 9, Fiendfyre acheté).
> - **Contrecoup** (`castSpellInBattle` APRÈS l'effet) : `if random < risk`
>   → `_applyCorruptionBacklash` (impur, mute) qui consomme `resolveCorruptionBacklash`
>   (pur). Réversible / non-bloquant : selfdmg planché à 1 PV (jamais de game-over).
> - **4 sorts de corruption contrôlée** (§1.4.C) : Flamme Dévorante (Gryff, `burn`+
>   STATUS_BY_SPELL, risk 0.15), Venin du Cachot (Slyth, `venom_drain` neuf =
>   lifesteal+poison, risk 0.15), Savoir Interdit (Serd, `curse`, risk 0.20),
>   Fardeau Partagé (Pouf, `share_burden` neuf, risk 0.10).
> - **Sorts temporels / échos** (§1.4.B) : Tempus Echo (`tempus_echo` — rejoue le
>   dernier sort offensif du lanceur), Reliquae Temporis (`time_rewind` — restaure
>   PV/PM au snapshot de début de round, `staminaCost`), Écho Fantôme (`echo_self`
>   — familier-écho du lanceur via `combatFamiliars`). Garde-fous 1×/combat.
>   ÉCART buildEcho : `buildEcho` produit un **ennemi** (monstre scalé), pas un
>   allié — réemploi inadapté pour un familier joueur ; on réutilise le mécanisme
>   `combatFamiliars`/`tickFamiliars` (P2), qui EST l'abstraction « entité alliée
>   qui frappe N tours ». Faithful à l'effet décrit, surgical.
> - **5 sorts légendaires** (§1.7) : Cœur de Lion (`lion_heart`), Pacte du Serpent
>   (`serpent_pact`), Verbe de Rowena (`rowena_verb`), Serment du Blaireau
>   (`badger_oath`), Le Mot du Dormeur (`aoe_wave` réutilisé, risk 0.5,
>   `staminaCost`). Octroi : `reward.spell` (vecteur existant) sur les 4 quêtes
>   Signature (légendaires de Maison) + sur les 4 quêtes répétables du Gardien de
>   la Boucle (corrompus contrôlés) ; **stèle Ruines ét.21+** (progressif) pour les
>   4 sorts profonds (Le Mot du Dormeur + 3 temporels). Aucun nouveau vecteur.
> - **Reports P3 réintégrés** : Sanguini → **Sanguini Vorace** (`evolveCondition`
>   `corruption` value 2 — désormais active) ; Protego → **Protego Diabolica**
>   (Apothéose, `reflectFrac:0.2`, hook dans `_enemyPhysicalHit`).
> - **`staminaCost`** (❓2) : champ réel, réservé à Reliquae Temporis (12) et Le Mot
>   du Dormeur (15). Interprété en **toll de PV** (pas de 2ᵉ jauge), planché à 1 PV.
> - **Étiquetage** : 14 sorts neufs dans SPELL_META ; house-affine total = **16**
>   (4 Mythe + 4 Premium + 4 corruption + 4 légendaires de Maison).
> - **Vérif** : `units.js` (corruptionSpellModifier, backlash, gate, evolveCondition
>   corruption, compteurs) ; `scenarioSpellsP4` (gate Boucle / contrecoup /
>   écho+tempus 1×/combat / légendaires / Protego Diabolica / Sanguini Vorace) ;
>   `node tests/smoke.js` vert ; `tools/sim-difficulty.js` ladder INCHANGÉ (sorts
>   additifs, non modélisés ; zéro scaling monstre) ; cache PWA bumpé.
>
> ### Journal — Lot P3 (livré)
> Premium & évolutifs (branche `claude/sorts-p3-premium`). Réutilise le moteur
> existant — règle d'or §0 (zéro scaling monstre).
> - **`resolveSpellForm(spellName, char)` RÉEL** (`data.js`, §1.6) : renvoie la
>   forme évoluée si `base.evolvesTo` + `base.evolveCondition` est satisfaite,
>   sinon la base. **Réversible / non destructif** (recalculé à chaque appel,
>   ne mute jamais `char.spells`). Helper `_spellEvolveConditionMet(cond, char)` :
>   `artifact` (lit `char.equipped`, PUR), `floor`/`quest`/`apotheose`/`corruption`
>   (globals lus défensivement via `typeof` → testable hors navigateur en
>   injectant les globals). `corruption` (Sanguini Vorace) reste **inerte → P4**.
> - **Wiring** : `castSpellInBattle` résout la forme avant lancement (idempotent
>   si déjà évoluée) ; `openSpells`/`openBattleSpells` affichent la forme évoluée.
> - **Évolutions livrées** : Incendio → **Incendio Majeur** (artefact
>   `baton_ancestral`, `synergyArtifacts`), Lumos Solem → **Lux Aeterna**
>   (étage ≥ 9, réemploi du sort existant), Glacius → **Glacius Profond** (quête
>   `manon_grimoire`). Protego Diabolica (renvoi de dégâts) et Sanguini Vorace
>   (corruption) **reportés** (hooks combat / P4).
> - **4 variantes Premium signature** (§1.5, ❓1) : **Incendio Royal** (Gryff),
>   **Morsure d'Émeraude** (Slyth), **Givre de Rowena** (Serd), **Soin du
>   Blaireau** (Pouf). `premium`/`premiumOf`/`premiumFx`/`tint`/`houseAffinity`
>   = miroir EXACT des artefacts Premium. Power = base ×1,20 (pré-cuit).
>   **Octroi** au palier **Apothéose** (tier 18) via `grantsSpell` ajouté au
>   bonus de chaque Maison (`state.js`, réutilise `checkHouseLevelUp`). Profitent
>   du `houseSpellBoost` (coût réduit pour leur Maison).
> - **FX Premium** : fioriture `CFX_safe.buffAura` + halo teinté côté lanceur
>   (défensif) dans `castSpellInBattle`.
> - **Vérif** : `tests/units.js` (**803 assertions** : Premium, resolveSpellForm
>   artefact/étage/quête/apothéose, corruption inerte) ; `scenarioSpellsP3`
>   (3 sous-tests : évolution réversible+cast, octroi+houseSpellBoost Premium,
>   cast Premium lifesteal) ; `node tests/smoke.js` **239 scénarios** verts ;
>   `tools/sim-difficulty.js` baseline inchangé (formes évoluées/Premium
>   endgame-gated, hors kit sim) ; cache PWA bumpé.
>
> **Écarts P3 :**
> - **Protego Diabolica (Apothéose, renvoi 20 % dégâts) reporté** : le renvoi
>   exige un hook dans `_enemyPhysicalHit` ; hors-scope chirurgical de ce lot.
>   L'evolveCondition `apotheose` est néanmoins câblée et testée.
> - **Sanguini Vorace (corruption ≥ palier 2) reporté au P4** : dépend de
>   `corruptionLevel` (non encore introduit). La branche `corruption` existe,
>   inerte.
> - **Icônes Premium/évoluées** : alias temporaires sur le PNG de la base
>   (`item-icons.js`). Le `tint` par Maison est porté en donnée mais le rendu
>   teinté dédié (art) reste un lot ultérieur (§2.8).
> - **Synergies artefacts** : matérialisées via l'évolution (`evolveCondition`
>   type `artifact` + `synergyArtifacts` sur Incendio). Les bonus passifs
>   d'artefact (`bonusElemDmg`) restent gérés par le moteur existant
>   (`_artifactElemBonus`) — pas de double mécanique (§2.5 respecté).
>
> ### Arbitrages des points ❓ (validés par le commanditaire avant P0)
> - ❓1 → **4 variantes Premium signature** (une par Maison), extensible.
> - ❓2 → `staminaCost` **réel mais réservé** à 2-3 rituels lourds (pas de 2ᵉ jauge omniprésente).
> - ❓3 → **nouvelle catégorie Codex `'sorts'`** (onglet dédié).
> - ❓5 → contrecoup de corruption **configurable par sort** (auto-dégât / statut / compteur).
> - ❓6 → **livrer P0→P3 d'abord**, garder P4 (corruption/Boucle) pour une 2ᵉ passe après validation sim.
>
> ### Journal — Lot P0 (livré)
> Implémenté dans `js/data.js` (après `spellCategory`), miroir EXACT du socle
> Artefacts (`ARTIFACT_FORMS`/`PREMIUM_MULT`/`premiumStat`) :
> - **Registres** : `SPELL_PREMIUM_MULT` (rare 1.20 / epic 1.30 / legendary 1.40),
>   `SPELL_TIERS` (4 rangs `mult`+`tint`+`rank`), `SPELL_RARITY_COST_MULT`
>   (ajout §1.8 pour la formule de coût), `HOUSE_SPELL_FX` (4 Maisons),
>   `HERO_PATRONUS` (16 héros, cosmétique).
> - **Helpers PURS** : `getSpellById`, `getSpellByName`, `spellTierTint`,
>   `resolveSpellForm` (P0 : renvoie la forme de base — point d'extension P3),
>   `spellPmCostEstimate` (sim §1.8). Plus internes : `_slugifySpell`,
>   `_defaultSpellCategory`, `_normalizeSpells`.
> - **Champs ajoutés aux 47 entrées `SPELLS`** via le passe idempotent
>   `_normalizeSpells(SPELLS)` (appelé une fois au chargement, pure data-prep) :
>   `id` (slug stable du nom), `category` (taxonomie 2.0 dérivée de l'effet),
>   `tier:'basique'`, `rarity:'common'`, `houseAffinity:null`.
> - **Vérif** : `tests/units.js` (+50 assertions, section « socle data P0 ») vert ;
>   `node tests/smoke.js` vert (229 scénarios, aucun changement de jeu) ; cache PWA
>   bumpé (`js/data.js?v=46`, `CACHE_VERSION hogwarth-v170`), `pwa-smoke` vert.
>
> ### Journal — Lot P1 (livré)
> Étiquetage + liseré de rang dans la modale Sorts (branche `claude/sorts-p1-etiquetage`).
> - **Étiquetage** (`js/data.js`) : table curée `SPELL_META` (clé = nom) →
>   `[category, tier, rarity, houseAffinity]` pour les **47 sorts**, appliquée par
>   `_normalizeSpells` avec précédence **littéral > `SPELL_META` > défaut dérivé**.
>   Distribution : 14 basiques / 11 avancés / 19 maîtres / 3 corrompus ; 4 sorts
>   `signature` Mythe portent l'affinité de Maison canon (Patronus Maxima→Gryff,
>   Sectumsempra Imperius→Slyth, Legilimens→Serd, Récolte Magique→Pouf), eux seuls.
> - **Liseré** (`js/inventory-spells.js`) : `_spellTierBadgeHtml` + bordure gauche
>   teintée (`_spellTierTintSafe` → `spellTierTint`) sur chaque `.spell-item`, dans
>   `openSpells` ET `openBattleSpells`. Défensif (socle P0 absent → neutre).
> - **Vérif** : `tests/units.js` (assertions P1 `SPELL_META`/affinités/rangs) ;
>   `node tests/smoke.js` vert (231 scénarios, T2bis liseré) ; cache PWA bumpé
>   (`data.js?v=48`, `inventory-spells.js?v=4`, `CACHE_VERSION hogwarth-v173`).
>
> ### Journal — Lot P2 (livré)
> Sorts par Maison & arbre (branche `claude/sorts-p2-maison`). Réutilise le
> moteur existant (castSpellInBattle, _spellElementalDamage, _spellSpCost,
> SPELL_OOC_HANDLERS, _teachSpellToParty, eclatProgress) — règle d'or §0
> respectée (ZÉRO scaling monstre touché).
> - **`houseSpellBoost(spell, house, tier)`** (`data.js`, PUR façon `_fortuneCurve`,
>   testable hors navigateur) : réduction de **coût PM** [0..0.25] pour un sort dont
>   `houseAffinity == chosenHouse` (15 % base, +5 % au palier Mythe 17, +5 %
>   Apothéose 18). **Power-NEUTRE** (cf. biais Maison V2 récent) : seul le coût
>   baisse, jamais les dégâts. Greffé dans `_spellSpCost` (`battle-spells.js`),
>   composé multiplicativement avec le −20 % Serdaigle. N'affecte que les 4 sorts
>   Mythe (les seuls house-affine) → reste 4 sorts affines.
> - **8 sorts neufs** (`SPELLS` + `SPELL_META`, §1.4) : **Resonare** (rituel OOC
>   `reveal_floor`, coût ↓ par Éclat), **Éclat de Voûte** (combat `eclat_bolt`,
>   dégâts ×(1+0,25·Éclats), gate `requiresEclats:2`), **Sceau des Quatre**
>   (defense `seal_shield`, bouclier groupe + anti-peur, `requiresEclats:3`),
>   **Avis Praesidium** (combat `summon_ally`, familier 3 tours), **Patronus
>   Corporel** (defense `patronus_corporel`, garde de groupe + anti-peur),
>   **Fontis** (OOC `recharge_fountain`), **Purgo** (OOC `purge_room`),
>   **Aedificium** (OOC `stabilize_rune`).
> - **Éclats** : RÉUTILISE `eclatProgress()` (quests.js) — ❓4 tranché, AUCUN
>   `eclatsCollected` neuf. Gate `requiresEclats` posée dans `castSpellInBattle`
>   AVANT débit PM / consommation de tour.
> - **Familiers** : `combatFamiliars` (state.js, combat-scoped NON sérialisé,
>   reset par `startBattle`) + `tickFamiliars()` (battle.js, hook dans `enemyTurn`).
> - **Effects neufs routés défensivement** : 4 handlers combat dans
>   `SPELL_HANDLERS`, 4 handlers OOC dans `SPELL_OOC_HANDLERS` + `isOutOfCombatSpell`.
>   Chaque call-site gardé (`if handler` / `typeof`).
> - **Apprentissage** : action PNJ générique **`teach_spell`** (`triggerNpcSpecial
>   Action`, npc-dialog.js, one-shot via `usedSpecialNpcs`) — câblée sur **Scamander**
>   (magizoologiste → Avis Praesidium). **Codex enseignant** : champ `teachesSpell`
>   sur une entrée → `_teachSpellToParty` à la **révélation** (`checkCodexUnlocks`,
>   ui-codex.js) ; posé sur `eclat_voute_codex` (3 Éclats → Éclat de Voûte).
> - **Vérif** : `tests/units.js` (+~20 assertions P2 : `houseSpellBoost`, gates,
>   effects, catégorie rituel) — **785 assertions** vertes ; nouveau scénario
>   `scenarioSpellsP2` (`tests/scenarios/spells.js`, 6 sous-tests : houseSpellBoost,
>   Éclat gate+dégâts, familier+tick, Sceau gate+effet, OOC Purgo/Fontis,
>   apprentissage PNJ+Codex) ; `node tests/smoke.js` vert (**234 scénarios**) ;
>   `tools/sim-difficulty.js` : ladder de difficulté **inchangé** (les sorts P2
>   sont additifs, non auto-appris, aucun scaling monstre — baseline confirmée) ;
>   cache PWA bumpé (10 JS → `data.js?v=49`, `battle-spells.js?v=16`,
>   `battle.js?v=34`, `state.js?v=36`, `inventory-spells.js?v=6`,
>   `npc-dialog.js?v=22`, `npcs.js?v=37`, `ui-codex.js?v=7`, `codex.js?v=15`,
>   `item-icons.js?v=32`, `CACHE_VERSION hogwarth-v176`), `pwa-smoke` vert.
>
> **Écarts / décisions P2 :**
> - **« ignore 30 % DEF » d'Éclat de Voûte abandonné** : `_computeSpellDamage`
>   n'utilise PAS la DEF de l'ennemi (les sorts ignorent déjà la DEF). Le rider
>   est donc sans objet — la signature du sort reste la mise à l'échelle ×Éclats.
>   Desc ajustée en conséquence.
> - **Icônes de sorts** : alias temporaires sur des PNG existants thématiquement
>   proches (même approche que les sorts cross-plan, `item-icons.js`). Art dédié
>   reporté (plan §2.8, lot ultérieur). Le test strict d'icônes reste vert.
> - **Nouvelle catégorie Codex `'sorts'` (❓3) NON livrée en P2** : le Codex
>   enseignant réutilise une entrée existante (`eclat_voute_codex`, catégorie
>   `eclats`) via `teachesSpell`. L'onglet Codex dédié `'sorts'` + les entrées de
>   sorts relèvent du « Codex sorts complet » (P5) ; laissé à un lot ultérieur.
> - **Sorts temporels/échos (§1.4.B) et corruption contrôlée (§1.4.C)** : hors
>   P2 — relèvent de P4 (corrompus/Boucle), conformément à ❓6.
> - **Power du houseSpellBoost omis volontairement** (power-neutre) : le plan
>   évoquait « −coût + léger power » ; le volet power est écarté pour éviter le
>   power creep (biais Maison V2). Réintroductible en P3/P5 si la sim le justifie.
>
> **Écarts P1 :**
> - **« filtre `category` enrichi » reporté.** Le commanditaire a défini P1 =
>   « étiquetage + liseré de tier ». Le filtre actuel de la modale (axe élémentaire
>   `feu/glace/…` + `soutien/utilitaire` via `spellCategory()`) est **conservé tel
>   quel** — il reste découplé du nouveau champ `category` (aucun call-site ne lit
>   `spell.category`). Basculer le filtre sur la taxonomie 2.0 (combat/exploration/
>   defense/rituel/signature) est un arbitrage UX à trancher ; laissé à un lot ultérieur.
> - **Étiquetage centralisé dans `SPELL_META`** plutôt qu'éparpillé sur 47 littéraux
>   (diff lisible, idempotent). Un futur sort neuf déclarant ses champs sur son
>   littéral garde la priorité (précédence littéral > méta).
>
> **Écarts / décisions P0 :**
> - Conformément au **modèle Artefacts** (dont le socle P0 n'avait PAS touché les
>   littéraux `ITEMS`), l'étiquetage des 47 sorts est posé par `_normalizeSpells`
>   en valeurs **par défaut** (tier `basique`, rarity `common`, `houseAffinity`
>   null) — donc **inerte**. Le curating fin des tiers/raretés/catégories
>   `rituel`/`signature` du §1.3 est explicitement **reporté au P1** (« étiquetage »),
>   pour éviter un diff massif des littéraux et garder P0 sans changement de jeu.
> - Ajout d'un registre non listé en §2.1 : `SPELL_RARITY_COST_MULT` — requis par
>   la formule de coût §1.8 que `spellPmCostEstimate` matérialise. Distinct de
>   `SPELL_PREMIUM_MULT` (qui sert la génération Premium).
> - Aucune entrée au `MANIFEST` du loader (socle inerte, comme le socle Artefacts).

---

## §0 — Contexte & règle d'or

Les **Artefacts** viennent d'être enrichis (nouvelles formes `formType`,
variantes **Premium** coloriées par Maison, rééquilibrage des coûts,
récompenses cérémonielles de quêtes signature). Les **Sorts** doivent
atteindre la même profondeur : aujourd'hui ~50 entrées `SPELLS` (`data.js:312`)
sans `id`, sans `rarity`, sans `houseAffinity`, catégorisées seulement à la
volée par `spellCategory()`. C'est riche mécaniquement (6 éléments, AoE,
lifesteal, statuts, sorts OOC) mais **plat en identité et en progression** :
aucun arbre, aucune coloration Maison, aucune évolution, aucun risque de
corruption.

### Règle d'or (héritée du chantier Artefacts, Ch.13 §13.6)

> **Un sort renforce une TACTIQUE, jamais ne trivialise l'ennemi.**
> Le scaling des monstres n'est JAMAIS touché par le système de sorts.
> Comme les artefacts, les sorts sont un **axe additif** côté joueur.

Cinq principes directeurs :

1. **Chaque sort répond à un fantasme.** « Que veut vivre le joueur en le
   lançant ? » Pas de stat-stick magique générique.
2. **Identité de Maison forte mais jamais bloquante.** Un sort de Maison est
   *favorisé* (coût réduit, variante Premium offerte) pour la Maison affine,
   *accessible* pour les autres (anti-frustration, principe artefacts §1.2).
3. **La rareté raconte la puissance ET l'obtention.** `common` s'achète,
   `legendary` se mérite (quête signature, Ruines, Boucle). Jamais de sort
   légendaire achetable à l'or seul.
4. **Le ton suit la descente.** Magie joyeuse/scolaire en Acte I → magie
   puissante, dangereuse, corrompue en profondeur (Ch.10 zones A→D).
5. **Chirurgical (guidelines §3).** On réutilise le moteur existant
   (`castSpellInBattle`, `_spellElementalDamage`, `rollSpellCrit`,
   `_spellSpCost`, `STATUS_BY_SPELL`, `SPELL_OOC_HANDLERS`, `char.spells`,
   `grantsSpell`, le système de Codex). On n'ajoute un champ que si l'effet
   ne s'exprime pas avec l'existant.

### Légende des marqueurs

💡 idée bonus · ✅ déjà en place dans le code · ❓ point à valider ·
⚠️ contrainte critique · 🔴 bloquant · 🟠 priorité moyenne · 🟢 faible risque

---

# ÉTAPE 1 — Spécifications & production du contenu

## 1.1 Structure globale du système de magie

Deux **axes orthogonaux** structurent tout sort :

### A. Origine (qui peut le maîtriser ?)

| Origine | `houseAffinity` | Description |
|---------|-----------------|-------------|
| **Universel** | `null` | Tronc commun appris par tous (level-up, livres). Les classiques HP + utilitaires. |
| **Affinité Maison** | `"Gryffondor"` etc. | Fortement identitaire. Coût réduit + variante Premium pour la Maison affine ; apprenable par les autres via quête/Ruines. |

### B. Arbre de progression (quel palier de maîtrise ?)

Quatre **rangs** (`tier`), reflet du ton qui s'assombrit avec la descente :

| Rang (`tier`) | Ton | Acte / Étages | Obtention typique |
|---------------|-----|---------------|-------------------|
| 🌱 **basique** | Joyeux, scolaire | Acte I (1-3) | Départ, level-up, boutique |
| 🔆 **avancé** | Maîtrise, confiance | Acte II (4-6) | Level-up, livres, PNJ |
| 🌟 **maître** | Puissant, grave | Acte III (7-10) | Quête, Bibliothèque, palier Maison |
| 🌑 **corrompu** | Dangereux, transgressif | Boucle (11+) | Ruines, Boucle, palier Mythe/Apothéose |

> 💡 L'arbre n'est pas un graphe d'arbre rigide (pas de prérequis bloquant) :
> c'est un **rang de puissance + un ton**, lisible dans la modale Sorts via
> un liseré coloré (vert→bleu→or→violet sombre), exactement comme la bordure
> de rareté d'un item d'inventaire. Cohérence visuelle totale avec les artefacts.

### C. Catégories (`category`) — pour le filtre de la modale

On **promeut `spellCategory()` (dérivé) en champ de donnée explicite**, enrichi :

| `category` | Rôle | Exemples actuels |
|------------|------|------------------|
| ⚔️ **combat** | Dégâts directs / DoT / AoE | Incendio, Bombarda, Glacius Tempête |
| 🧭 **exploration** | Utilitaire hors/in combat | Revelio, Alohomora, Accio, Portus |
| 🛡️ **defense** | Bouclier, soin, régen, dissipation | Protego, Episkey, Ferula, Patronus Maxima |
| 📜 **rituel** | Lore/Codex/environnemental, souvent hors combat | (nouveau — voir 1.4) |
| ✨ **signature** | Lié aux quêtes Maison, fortement identitaire | Sectumsempra Imperius, Legilimens, Récolte Magique |

✅ La fonction `spellCategory()` existe déjà ; on la garde comme **fallback**
quand un sort legacy n'a pas de champ `category` (rétro-compatibilité).

---

## 1.2 Champs de données enrichis

Tous **optionnels et rétro-compatibles** (un sort legacy sans ces champs
fonctionne à l'identique). On ajoute sur chaque entrée de `SPELLS` :

```js
{
  // ── existant (inchangé) ──
  name, icon, desc, cost, effect, element, power,
  splash?, bonusVsUndead?, locked?, outOfCombatCost?,
  stat2?, magDiv?, stat2Div?, _cross?,

  // ── NOUVEAU — identité & progression ──
  id:            "incendio",          // clé stable kebab-case (name reste l'affichage)
  category:      "combat",            // combat|exploration|defense|rituel|signature
  tier:          "basique",           // basique|avancé|maître|corrompu (rang+ton)
  rarity:        "common",            // common|uncommon|rare|epic|legendary
  houseAffinity: null,                // null | "Gryffondor"|"Serpentard"|"Serdaigle"|"Poufsouffle"

  // ── NOUVEAU — obtention ──
  learnVia:      { type:"level", value:3 },   // level|book|npc|quest|codex|ruins|tier
                                              // (descriptif ; sert l'UI Codex/aperçu)
  unlockFloorMin: null,               // gate d'étage pour drops/boutique de livres

  // ── NOUVEAU — coûts avancés (au-delà du PM) ──
  staminaCost:    0,                  // 💡 endurance (END) — sorts lourds (voir 1.8)
  corruptionRisk: 0,                  // 0..1 — proba d'auto-dégât/contrecoup (voir 2.6)

  // ── NOUVEAU — synergies & évolution ──
  synergyArtifacts: ["baton_ancestral","orbe_flamme"],  // ids d'artefacts qui amplifient
  premiumVariant:   "incendio_premium_gryff",           // id de la variante Premium (si existe)
  evolvesTo:        "incendio_majeur",                   // sort de base → forme évoluée (voir 1.6)
  evolveCondition:  { type:"artifact", value:"baton_ancestral" }, // artifact|corruption|quest|floor
}
```

> ⚠️ **`name` reste la clé runtime.** `char.spells` est un tableau de **noms**
> (`battle-rewards.js:350`, `inventory.js:423`), `STATUS_BY_SPELL` et tous les
> handlers indexent par `name`. On **n'arrache pas** cette mécanique : `id`
> est ajouté pour le Codex/les variantes/les synergies, mais la résolution de
> combat continue de passer par `name`. (Comme les items gardent `id` ET un
> `name` distinct.) Helper pur `getSpellById(id)` / `getSpellByName(name)`.

### Multiplicateur Premium (miroir de `PREMIUM_MULT`)

```js
const SPELL_PREMIUM_MULT = { rare: 1.20, epic: 1.30, legendary: 1.40 };
```

Appliqué à la **génération** des entrées Premium (power pré-cuit dans `SPELLS`),
**jamais au runtime** — aucun chemin chaud (`castSpellInBattle`) touché. Exactement
le pattern artefacts (`premiumStat()`).

---

## 1.3 Catalogue universel — rééquilibrage & étiquetage de l'existant

✅ **Aucun sort existant n'est supprimé.** On les étiquette (`id`/`category`/
`tier`/`rarity`) et on harmonise quelques coûts pour faire de la place aux
nouvelles formes. Extrait (catalogue complet en annexe code) :

| Sort | Cat. | Tier | Rareté | Coût PM | Effet | Élément |
|------|------|------|--------|---------|-------|---------|
| Expelliarmus | exploration | basique | common | 4 | disarm | — |
| Incendio | combat | basique | common | 8 | burn | 🔥 feu |
| Episkey | defense | basique | common | 5 | heal | — |
| Protego | defense | basique | common | 5 | shield | — |
| Revelio | exploration | basique | common | 2 | reveal | ✨ |
| Diffindo | combat | avancé | uncommon | 9 | bleed | ⚔️ |
| Glacius | combat | avancé | uncommon | 8 | gel | ❄️ |
| Bombarda | combat | avancé | rare | 15 | burn+splash | 🔥 |
| Sanguini | combat | avancé | uncommon | 8 | lifesteal | 🌑 |
| Patronum | combat | maître | rare | 12 | burn | ✨ |
| Glacius Tempête | combat | maître | rare | 16 | aoe_field | ❄️ |
| Sectumsempra | combat | maître | epic | 14 | bleed | ⚔️ |
| Fiendfyre | combat | corrompu | legendary | 32 | burn | 🔥 |
| Avada… | signature | corrompu | legendary | 20 | instant | 🌑 |
| Patronus Maxima | signature | maître | epic | 22 | patronus_maxima | ✨ (Gryffondor) |
| Sectumsempra Imperius | signature | corrompu | epic | 24 | imperius | 🌑 (Serpentard) |
| Legilimens | signature | maître | epic | 18 | legilimens | — (Serdaigle) |
| Récolte Magique | signature | maître | epic | 26 | recolte | — (Poufsouffle) |

> ❓ **À valider** : les 4 sorts de Maison « Mythe » existants (Patronus Maxima,
> Sectumsempra Imperius, Legilimens, Récolte Magique) reçoivent `houseAffinity`
> = leur Maison canon. Ils restent débloqués par le palier 17 (`grantsSpell`),
> mais deviennent aussi la **racine de l'arbre Maison** (voir 1.4).

---

## 1.4 Diversification — nouvelles formes de sorts

Quatre familles neuves, alignées sur le canon (Éclats, Échos, corruption, lieux Ch.10).

### A. Sorts liés aux Éclats de la Clé de Voûte (catégorie `rituel`)

Les 3 **Éclats** (Acte I/II/III) sont déjà collectables et alimentent le Codex.
On en fait une **source de magie** : un sort par Éclat possédé, montant en
puissance avec le nombre d'Éclats (`eclatsCollected`).

| Sort | Cat. | Tier | Effet | Condition |
|------|------|------|-------|-----------|
| **Resonare** 🔹 | rituel | avancé | Révèle d'un coup tout l'étage (minimap) + dévoile les pages cachées. Coût ↓ par Éclat. | ≥ 1 Éclat |
| **Éclat de Voûte** 💠 | combat | maître | Projectile de pur scellement : dégâts `ténèbres`, ×(1 + 0,25·nbÉclats). Ignore 30 % DEF. | ≥ 2 Éclats |
| **Sceau des Quatre** 🛡️ | defense | maître | Bouclier de groupe 2 tours + immunise `peur` 1 tour (le scellement protège). | 3 Éclats (quête `eclats_clef_voute`) |

> 💡 Thématiquement, le Porteur d'Éclats canalise le sceau brisé — magie
> grave, pas joyeuse : tier `maître`/`corrompu`, coloration froide.

### B. Sorts temporels / échos (catégorie `rituel`, Boucle/Ruines)

Branchés sur les **Échos Temporels** (Zone D, `temporalEchoSeen`).

| Sort | Cat. | Tier | Effet |
|------|------|------|-------|
| **Tempus Echo** ⏳ | rituel | maître | Rejoue le **dernier tour du lanceur** (re-déclenche le dernier sort/attaque gratuitement, 1×/combat). |
| **Reliquae Temporis** 🕰️ | defense | corrompu | « Retourneur tactique » : restaure PV/PM du groupe à leur valeur du **début du tour précédent** (snapshot 1 tour). 1×/combat, gros coût. |
| **Écho Fantôme** 👻 | combat | corrompu | Invoque un **écho astral** du lanceur (réutilise `buildEcho`) qui frappe 2 tours puis se dissipe. |

> ✅ `buildEcho` existe déjà (`dungeon-scaling.js`) pour les échos astraux des
> Mondes Parallèles → réemploi direct, zéro nouvelle mécanique de spawn.

### C. Sorts de corruption contrôlée (catégorie `combat`/`signature`, tier `corrompu`)

Le cœur du ton « dangereux en profondeur ». Ces sorts portent `corruptionRisk > 0` :
puissance supérieure, mais **contrecoup** (auto-dégât, statut, ou montée d'un
compteur de corruption — voir 1.8 & 2.6).

| Sort | Cat. | Maison affine | Effet | Risque |
|------|------|---------------|-------|--------|
| **Flamme Dévorante** 🔥🌑 | combat | Gryffondor | Brûlure massive ; chaque kill prolonge le buff. | 0,15 (peut s'auto-brûler) |
| **Venin du Cachot** 🐍🌑 | combat | Serpentard | Poison empilable + spell-lifesteal renforcé. | 0,15 |
| **Savoir Interdit** 🦅🌑 | signature | Serdaigle | Copie la dernière capacité ennemie subie et la renvoie. | 0,20 |
| **Fardeau Partagé** 🦡🌑 | defense | Poufsouffle | Transfère les PV d'un allié mourant vers les autres (redistribution). | 0,10 |

> ⚠️ La corruption est un **contrecoup choisi**, pas une punition aléatoire
> gratuite : le joueur sait qu'il joue avec le feu. Gate strict Boucle/Ruines
> (`victoryAchieved` ou `effectiveFloor >= 11`).

### D. Sorts de familier renforcés (catégorie `combat`, invocation)

Étend `effect:"summon"` (déjà côté ennemi) au joueur.

| Sort | Cat. | Tier | Effet |
|------|------|------|-------|
| **Avis Praesidium** 🦉 | combat | avancé | Invoque un familier (chouette/renard) qui attaque 3 tours. |
| **Patronus Corporel** 🦌 | defense | maître | Familier-Patronus : intercepte 50 % des dégâts subis 2 tours + chasse `peur`. Variante par héros (forme du Patronus). |

### E. Sorts environnementaux (catégorie `exploration`/`rituel`, Ch.10)

Interagissent avec les **cellules spéciales** et la **corruption des lieux**.

| Sort | Cat. | Effet (hors combat) |
|------|------|---------------------|
| **Fontis** 💧 | exploration | Recharge une Fontaine **tarie** (1×, gros PM) — survie en profondeur. |
| **Purgo** ✨ | rituel | Dissipe la corruption d'une salle (retire un `floor-event` hostile, révèle un coffre caché). |
| **Aedificium** 🏛️ | rituel | Dans les Ruines : stabilise une dalle-rune pour ouvrir un passage scellé. |

---

## 1.5 Variantes Premium par Maison (coloration visuelle forte)

Miroir exact du système Premium des artefacts. Une **variante Premium** est un
sort de base **recoloré + boosté** (`SPELL_PREMIUM_MULT`), offert **en plus**
(pas à la place) lors d'un accomplissement de Maison. Jamais une 5ᵉ rareté.

| Maison | `premiumFx` | Coloration | Sons | Exemple |
|--------|-------------|-----------|------|---------|
| 🦁 Gryffondor | `gryff` | **Flammes dorées** `#d3a625` | clairon, rugissement | Incendio → *Incendio Royal* (flammes d'or) |
| 🐍 Serpentard | `slyth` | **Venin vert** `#1a472a` | sifflement, goutte | Sanguini → *Morsure d'Émeraude* (venin vert) |
| 🦅 Serdaigle | `serd` | **Givre bleu runique** `#0e1a40` | carillon cristallin | Glacius → *Givre de Rowena* (runes bleues) |
| 🦡 Poufsouffle | `pouf` | **Ambre doré** `#f0c75e` | bourdon chaleureux | Reparo → *Soin du Blaireau* (lueur ambrée) |

- **Mécanique** : `premiumOf:"incendio"`, `premium:true`, `premiumFx:"gryff"`,
  `tint:"#d3a625"`. Power = base × `SPELL_PREMIUM_MULT[rarity]`, pré-cuit.
- **Obtention** : récompense **cérémonielle** de la quête signature de la
  Maison (réutilise `pendingHouseRewards` du chantier artefacts) OU palier
  Apothéose. Le Chef de Maison la remet (cohérent avec `house-donation.js`).
- **FX** : surcouche `CombatFX` (particules teintées) + `AudioSystem.playSpellCast`
  avec variante de timbre par `premiumFx`.

> ❓ **À valider** : une seule variante Premium **signature** par Maison au
> lancement (4 sorts), ou une variante Premium par sort de Maison (plus de
> contenu mais plus d'art/son) ? Proposition par défaut : **4 signature** au
> Lot Premium, extensible ensuite.

---

## 1.6 Sorts évolutifs

Un sort de base se **transforme** quand une condition est remplie
(`evolvesTo` + `evolveCondition`). L'évolution remplace l'entrée dans
`char.spells` (ou ajoute une variante débloquée), avec FX renforcés.

| Sort de base | Évolue en | Condition (`evolveCondition`) |
|--------------|-----------|-------------------------------|
| Incendio | **Incendio Majeur** (power ↑, splash) | artefact `baton_ancestral` équipé |
| Glacius | **Glacius Profond** (gel + DEF↓) | quête `manon_grimoire` complétée |
| Sanguini | **Sanguini Vorace** (lifesteal ↑) | corruption ≥ palier 2 (Boucle) |
| Protego | **Protego Diabolica** (renvoie 20 % dégâts) | palier Maison Apothéose |
| Lumos Solem | **Lux Aeterna** (déjà AoE — devient l'évolution naturelle) | étage ≥ 9 |

- **Réversibilité** : l'évolution est **conditionnelle au runtime** (recalcul,
  comme `recalculateStats`) plutôt qu'une mutation destructive de `char.spells`.
  → si l'artefact est déséquipé, le sort retourne à sa forme de base. Helper
  pur `resolveSpellForm(spellName, char)` consulté à l'ouverture de la modale
  Sorts et au lancement.

> 💡 C'est la synergie artefacts↔sorts la plus forte : équiper le Bâton
> ancestral *change visiblement* le sort affiché. Mirroir du « build intention »
> des artefacts.

---

## 1.7 Sorts légendaires (quêtes signature / exploration profonde)

| Sort | Maison/Origine | Obtention | Effet signature |
|------|----------------|-----------|-----------------|
| **Cœur de Lion** 🦁 | Gryffondor | Quête signature *L'Étendard de Godric* | Buff de groupe : +ATK + immunise `peur`, dégâts ↑ tant qu'aucun allié KO. |
| **Pacte du Serpent** 🐍 | Serpentard | Quête *Le Pacte des Cachots* | Sacrifie 15 % PV max → double le prochain sort offensif. |
| **Verbe de Rowena** 🦅 | Serdaigle | Quête *Le Codex de Rowena* | Lance gratuitement le dernier sort de chaque allié (chœur de savoir). |
| **Serment du Blaireau** 🦡 | Poufsouffle | Quête *Ceux qu'on ne laisse pas derrière* | Réssuscite un allié KO à 30 % PV (1×/combat). |
| **Le Mot du Dormeur** 🗿 | Universel (Ruines) | Découverte profonde — voir 3 Échos + stèle Ruines (ét. 21+) | Sort ultime corrompu : dégâts colossaux à tous, mais `corruptionRisk` 0,5. |

> ✅ Réutilise `grantsSpell` (équipement/quête) + `_teachSpellToParty`
> (`inventory.js:423`) — aucun nouveau vecteur d'apprentissage requis.

---

## 1.8 Coûts & équilibrage

Trois ressources, cohérentes avec l'économie existante (PM rare, soins précieux,
Fontaines rares — Ch.13) :

| Ressource | Champ | Quand l'utiliser |
|-----------|-------|------------------|
| **Mana (PM)** | `cost` (existant) | Coût primaire de tout sort. |
| **Endurance (END)** | `staminaCost` 💡 | Sorts physiques lourds / rituels longs. Plancher : ne descend jamais le perso sous 1 si END dérivé. |
| **Risque de corruption** | `corruptionRisk` | Sorts `corrompu` uniquement. Contrecoup (voir 2.6). |

### Formule de coût (miroir artefacts `budget × actMult × rarityPremium`)

```
PM ≈ budgetSort(power, riders) × tierMult × rarityMult

tierMult   : basique 1.0 · avancé 1.4 · maître 2.0 · corrompu 2.8
rarityMult : common 1.0 · uncommon 1.1 · rare 1.25 · epic 1.4 · legendary 1.6
budgetSort = power×0,5 + (AoE? ×1,5) + (statut? +2) + (lifesteal? +3) + (heal? power×0,4)
```

### Scaling selon étage / Acte / Boucle

- ✅ **Les sorts ne scalent PAS avec l'étage** (contrairement aux monstres) :
  leur puissance vient de **MAG/stats** du lanceur + équipement, déjà via
  `spellDamage()`/`_spellElementalDamage`. C'est l'équilibre voulu (le joueur
  monte, le sort suit la stat).
- **Affinité Serdaigle** : `_spellSpCost` applique déjà −20 % (Esprit de
  l'Aigle, Apothéose). On y greffe `houseSpellBoost` (voir 2.2).
- **Boucle** : les sorts `corrompu` ne se débloquent qu'en Boucle
  (`victoryAchieved`/`effectiveFloor >= 11`) — la puissance brute arrive quand
  l'ennemi a déjà le scaling endgame, pas avant. Anti-trivialisation.

> ⚠️ **Validation obligatoire** par `tools/sim-difficulty.js` avant de figer
> tout coût/power (comme pour le rework de stats). Critère Ch.13 : un kit
> sorts maîtres + Premium ne doit pas dépasser le plafond de progression
> naturelle.

---

## 1.9 Intégration avec le reste du jeu

### Apprentissage (3 vecteurs existants + 3 neufs)

| Vecteur | État | Détail |
|---------|------|--------|
| Level-up | ✅ | `_grantLevelSpells` (table par niveau). |
| Livre de sort | ✅ | `type:"spellbook"` → `learnSpellbook`. |
| Équipement `grantsSpell` | ✅ | groupe entier. |
| **PNJ (Ch.06)** | 💡 | `triggerNpcSpecialAction` → nouvelle action `teach_spell` (enseignant : prof de sortilèges, Chef de Maison). |
| **Codex (Ch.12)** | 💡 | Une entrée Codex `category:'objets'` par sort majeur, débloquée par `unlockConditions`. La révélation **enseigne** le sort (rituel/légendaire). |
| **Ruines Anciennes** | 💡 | Stèles/dalles-runes des Ruines enseignent les sorts `corrompu`/temporels (`learnVia:{type:"ruins"}`). |

### Impact combat / exploration / narration

- **Combat** : tout passe par `castSpellInBattle` + le dispatch `effect` de
  `battle-spells.js`. Nouveaux `effect` à router : `summon_ally`, `echo_self`,
  `time_rewind`, `recharge_fountain` (OOC), etc.
- **Exploration** : `SPELL_OOC_HANDLERS` (déjà extensible) reçoit les sorts
  environnementaux (Fontis, Purgo, Aedificium).
- **Narration** : les sorts `rituel`/légendaires déclenchent des `addMsg`
  lore + débloquent des entrées Codex (cohérence trame).

### Variantes par héros & solo/duo

- **Par héros** : le **Patronus** prend la forme canon du héros (texte/FX) —
  cosmétique, via une table `HERO_PATRONUS[heroKey]`. Aucun impact mécanique.
- **Solo/Duo** : les sorts de groupe (AoE soin, Sceau des Quatre, chœurs)
  scalent naturellement avec `partySize` (déjà le cas pour les AoE). Les sorts
  « chœur » (Verbe de Rowena) sont plus forts en duo — équilibrage assumé,
  contrebalancé par le bonus solo ×1,3 du scoring Ironman.

---

## 1.10 Tables de synthèse

### Synthèse par Maison

| Maison | Sort signature (Mythe) | Premium (couleur) | Légendaire (quête) | Sort corrompu |
|--------|------------------------|-------------------|--------------------|---------------|
| 🦁 Gryffondor | Patronus Maxima | Incendio Royal (or) | Cœur de Lion | Flamme Dévorante |
| 🐍 Serpentard | Sectumsempra Imperius | Morsure d'Émeraude (venin) | Pacte du Serpent | Venin du Cachot |
| 🦅 Serdaigle | Legilimens | Givre de Rowena (runes bleues) | Verbe de Rowena | Savoir Interdit |
| 🦡 Poufsouffle | Récolte Magique | Soin du Blaireau (ambre) | Serment du Blaireau | Fardeau Partagé |

### Synthèse par nouvelle forme

| Sort | Maison | Catégorie | Coût | Variante Premium | Effet | Condition d'obtention |
|------|--------|-----------|------|------------------|-------|-----------------------|
| Resonare | — | rituel | 6−Éclats | — | Révèle l'étage + pages | ≥ 1 Éclat |
| Éclat de Voûte | — | combat | 14 | — | Dégâts ténèbres ×Éclats, ignore 30 % DEF | ≥ 2 Éclats |
| Sceau des Quatre | — | defense | 18 | — | Bouclier groupe + anti-peur | 3 Éclats (quête) |
| Tempus Echo | — | rituel | 16 | — | Rejoue dernier tour | Écho Temporel vu |
| Écho Fantôme | — | combat | 18 | — | Invoque écho astral 2 tours | Boucle |
| Flamme Dévorante | Gryffondor | combat | 24 | (Premium gryff) | Brûlure massive cumulative | Boucle |
| Avis Praesidium | — | combat | 12 | — | Familier 3 tours | Level/livre |
| Patronus Corporel | — | defense | 16 | — | Familier-bouclier + anti-peur | Quête/palier |
| Fontis | — | exploration | 30 PM | — | Recharge une Fontaine tarie | Livre Ruines |
| Purgo | — | rituel | 14 PM | — | Dissipe corruption de salle | Codex/Ruines |

---

# ÉTAPE 2 — Plan d'implémentation

## 2.1 Structure des données

- **Fichier** : tout dans `js/data.js` (registre `SPELLS`) — un seul point de
  vérité, comme `ITEMS`/`ARTIFACT_FORMS`. Pas de nouveau fichier de données.
- **Registres ajoutés** (inertes, façon socle artefacts P0) :
  ```js
  const SPELL_PREMIUM_MULT = { rare:1.20, epic:1.30, legendary:1.40 };
  const SPELL_TIERS = { basique:{mult:1.0,tint:"#5fa85f"}, avancé:{mult:1.4,tint:"#4a7bc0"},
                        maître:{mult:2.0,tint:"#c9a227"}, corrompu:{mult:2.8,tint:"#7a2f8a"} };
  const HOUSE_SPELL_FX = { Gryffondor:{fx:"gryff",tint:"#d3a625"}, /* … */ };
  const HERO_PATRONUS  = { harry:"Cerf", hermione:"Loutre", /* … cosmétique */ };
  ```
- **Helpers purs** (testables dans `tests/units.js`, façon `_fortuneCurve`) :
  `getSpellById(id)`, `getSpellByName(name)`, `spellTierTint(spell)`,
  `resolveSpellForm(spellName, char)`, `spellPmCostEstimate(spell)` (sim).
- **Rétro-compat** : `spellCategory()` reste le fallback ; les entrées legacy
  sans `id`/`tier` reçoivent des valeurs par défaut au chargement (un passe
  `_normalizeSpells()` idempotent, comme `_migrateEquippedSlots`).

## 2.2 Variables & flags (`state.js`)

| Var | Rôle | Sérialisé |
|-----|------|-----------|
| `unlockedSpells` (Set) | sorts débloqués mais pas forcément appris (Codex/Ruines), pour l'UI « disponible à apprendre » | ✅ save |
| `eclatsCollected` (int) | nb d'Éclats (✅ existe peut-être déjà côté quête — à réutiliser) | ✅ |
| `corruptionLevel` (int 0..N) | compteur de corruption du groupe (monte avec sorts `corrompu`) | ✅ |
| `corruptionLevelSpellModifier` | dérivé (pas stocké) : bonus power / risque selon `corruptionLevel` | — |
| `houseSpellBoost` | dérivé de `chosenHouse`/`houseTier` : −coût + power pour les sorts de la Maison affine | — |
| `spellEvolutionsSeen` (Set) | ids des évolutions déjà découvertes (1ʳᵉ fois → toast lore) | ✅ |
| `echoSpellUsedThisFight`, `timeRewindUsedThisFight` | garde-fous 1×/combat | ❌ (combat-scoped) |

## 2.3 Système d'apprentissage & évolution

1. **PNJ enseignants** : étendre `triggerNpcSpecialAction` (`npc-dialog.js`)
   avec une action générique `{ id:"teach_spell", spell:"…", oneShot:true }`.
2. **Codex enseignant** : dans `openCodex`/évaluateur (`codex.js`), un champ
   `teachesSpell` sur l'entrée → à la révélation, `_teachSpellToParty`.
3. **Évolution runtime** : `resolveSpellForm(name, char)` appelé par
   `openSpells`/`openBattleSpells` (affichage) et par `castSpellInBattle`
   (résolution) → renvoie la forme évoluée si `evolveCondition` satisfaite.
   **Non destructif** (déséquiper l'artefact ré-affiche la base).

## 2.4 Intégration combat & exploration

- **Nouveaux `effect` combat** à ajouter au dispatch `battle-spells.js`
  (le `switch`/table `SPELL_EFFECT_HANDLERS` ligne ~948) :
  `summon_ally`, `echo_self`, `time_rewind`, `eclat_bolt`, `seal_shield`,
  `corrupt_dmg` (+ contrecoup). Chacun **gardé défensivement**.
- **Nouveaux `effect` OOC** dans `SPELL_OOC_HANDLERS` (`inventory-spells.js`) :
  `recharge_fountain`, `purge_room`, `stabilize_rune`, `reveal_floor`.
- **Crit de sort** : les nouveaux sorts offensifs passent par `rollSpellCrit`
  (déjà branché sur `spellCritChance`/AGI).

## 2.5 Synergies avec les Artefacts & le Codex

- **Synergie artefact** : `synergyArtifacts[]` sur le sort + check à la
  résolution (`resolveSpellForm` lit `char.equipped`). Bonus exprimé via les
  champs artefacts **existants** (`bonusElemDmg`, `grantsSpell`) → pas de
  double mécanique. Le Bâton ancestral = pivot évolution Incendio.
- **Codex** : nouvelle sous-catégorie d'entrées « Sorts & Sortilèges »
  (`category:'objets'` ou nouvelle `'sorts'`). Chaque sort majeur a son entrée
  `veiled`/`revealed`/`corrupted`, débloquée par `unlockConditions`
  (étage/quête/Éclat/écho). Miroir exact des entrées artefacts.

## 2.6 Sorts corrompus / risques en Boucle Ténébreuse

- **Gate** : un sort `tier:"corrompu"` n'apparaît dans la modale que si
  `victoryAchieved || effectiveFloor(currentFloor) >= 11`.
- **Contrecoup** (`corruptionRisk`) au lancement, dans `castSpellInBattle`
  après l'effet : `if (Math.random() < spell.corruptionRisk) { backlash() }`.
  `backlash()` = auto-dégât (% PV), statut (`burn`/`bleed`), ou `corruptionLevel++`.
- **`corruptionLevel`** : monte la puissance des sorts corrompus
  (`corruptionLevelSpellModifier`) MAIS augmente aussi `corruptionRisk` →
  boucle risque/récompense. Effet narratif visible (teinte HUD, barks héros).
- ⚠️ **Réversible / non-bloquant** : la corruption n'altère jamais la
  progression de la partie ; c'est un levier de style endgame, pas un game-over.

## 2.7 Priorisation (LOTs)

| Lot | Contenu | Vérification |
|-----|---------|--------------|
| ✅ **P0 — Socle data** | Champs `id/category/tier/rarity/houseAffinity`, registres (`SPELL_TIERS`, `SPELL_PREMIUM_MULT`), helpers purs, `_normalizeSpells`. **Inerte.** | `tests/units.js` (helpers) + smoke vert (rien ne change en jeu). |
| ✅ **P1 — Sorts de base & étiquetage** | Étiqueter les 47 sorts existants (table `SPELL_META`), liseré de tier dans la modale Sorts. Filtre `category` enrichi **reporté** (voir écart). | smoke `spells` (T2bis liseré) ; visuel modale. |
| ✅ **P2 — Sorts par Maison & arbre** | `houseSpellBoost` (cost-only, PUR), 8 sorts d'Éclats/familier/environnementaux, apprentissage PNJ (`teach_spell`)/Codex (`teachesSpell`). | `scenarioSpellsP2` (6 sous-tests) + units (houseSpellBoost/gates) ; smoke 234 vert ; sim baseline inchangé. |
| ✅ **P3 — Premium & évolutifs** | 4 variantes Premium signature (octroi Apothéose), `resolveSpellForm` évolutif réel (artefact/étage/quête), synergie Bâton ancestral, FX Premium. | `scenarioSpellsP3` (3 sous-tests) + units (803) ; smoke 239 vert ; sim baseline inchangé. |
| ✅ **P4 — Corrompus & Boucle** | Sorts `corrompu`, `corruptionLevel` (sérialisé), contrecoup configurable (❓5), légendaires de quête, sorts temporels, reports P3 (Sanguini Vorace / Protego Diabolica), `staminaCost` (❓2). | `scenarioSpellsP4` + units (corruptionSpellModifier/backlash/gate/evolveCondition) ; smoke vert ; **sim-difficulty : ladder inchangé**. |
| **P5 — Équilibrage final** | Passe `tools/sim-difficulty.js`, ajustement coûts/power, Codex sorts complet. | sim + units + smoke complet. |

## 2.8 Suggestions d'assets

| Asset | Quoi | Outil |
|-------|------|-------|
| **Icônes de sorts** | PNG painterly par sort majeur (registre `SPELL_ICON_REGISTRY` existe déjà `item-icons.js`). | pipeline `tools/icon_factory.py` (recette type) ou script `gen_*_icons.py`. |
| **FX particules** | Variantes teintées par Maison (`premiumFx`) + tier (liseré). | `js/combat-fx.js` (`CombatFX`, surcouche pure défensive). |
| **Sons de sorts** | Timbre par élément + variante Premium par Maison ; voix d'incantation. | `js/audio-sfx.js` (`playSpellCast`, `speakSpell`). |
| **Animations corrompues** | Filtre désaturé/violet pour les sorts `corrompu` + secousse au contrecoup. | `CombatFX` + `Haptics`. |

⚠️ **Tout changement JS/CSS → skill `cache-bump`** (guidelines §8) :
`?v=N` dans `index.html` + `PRECACHE_URLS` de `sw.js` + `CACHE_VERSION`,
vérifié par `node tools/check_cache_versions.js --base origin/master`.

---

## §3 — Récapitulatif décisionnel & points ❓ à valider

### Décisions structurantes prises

1. 💡 **`id` ajouté, `name` reste la clé runtime** (rétro-compat totale du moteur).
2. 💡 **`tier` (rang+ton) + `rarity` (puissance/obtention) sont 2 axes distincts**
   (un sort `basique` peut être `rare` par drop ; cohérent artefacts).
3. 💡 **Premium = variante coloriée/boostée, jamais une 5ᵉ rareté** (miroir artefacts).
4. 💡 **Évolution non destructive** (`resolveSpellForm` au runtime, réversible).
5. 💡 **Corruption = levier de style endgame réversible**, gate Boucle/Ruines.
6. 💡 **Scaling par stats du lanceur, pas par étage** (anti-trivialisation, Ch.13).

### Points ❓ à arbitrer (avec proposition par défaut)

| # | Question | Proposition par défaut |
|---|----------|------------------------|
| ❓1 | 4 variantes Premium signature OU une par sort de Maison ? | **4 signature** au P3, extensible. |
| ❓2 | `staminaCost` (END) : nouvelle ressource réelle ou cosmétique ? | **Réelle mais réservée** à 2-3 rituels lourds (éviter une 2ᵉ jauge omniprésente). |
| ❓3 | Codex : nouvelle catégorie `'sorts'` ou réutiliser `'objets'` ? | **Nouvelle catégorie `'sorts'`** (onglet propre, plus lisible). |
| ❓4 | `eclatsCollected` existe-t-il déjà côté quête `eclats_clef_voute` ? | À **vérifier au P2** ; réutiliser si oui, sinon ajouter. |
| ❓5 | Contrecoup de corruption : auto-dégât, statut, ou montée de compteur ? | **Les trois pondérés** par sort (`backlash` configurable). |
| ❓6 | Implémenter tout, ou livrer P0-P3 d'abord et garder P4 (corruption) pour une 2ᵉ passe ? | **P0→P3 d'abord** (système attractif sans risque d'équilibrage), P4 après validation sim. |

---

> **Prochaine étape** : sur validation de ce plan (notamment les ❓), démarrer
> le **Lot P0** (socle data inerte) — exactement le modèle du socle artefacts
> `ARTIFACT_FORMS`/`PREMIUM_MULT` déjà en place dans `data.js:506+`.
