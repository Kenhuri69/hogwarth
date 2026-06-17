# Finalisation narrative — Chapitres 05 & 08

**Statut :** ✅ **TERMINÉ & CLOS** (2026-06-17) — ÉTAPE 1 mergée (master) ;
ÉTAPE 2 **superséée** : tout son contenu a été livré au fil de l'eau par les
PRs #520 → #573 (voir « ÉTAPE 2 — Réconciliation » ci-dessous). Plan archivé.
**Branche d'origine :** `claude/hogwarth-ch05-ch08-narrative-KEglC`

> Mission : finaliser/enrichir `docs/histoire/05-personnages-jouables.md` et
> `docs/histoire/08-quetes-et-sous-intrigues.md` en intégrant tout le canon déjà
> établi (Clé de Voûte, Éclats, voix des Fondateurs, quêtes Signature, escaliers
> inversés, froid surnaturel). Deux étapes : **ÉTAPE 1** (contenu), puis — après
> validation — **ÉTAPE 2** (plan d'implémentation).

## Principe directeur
- **Enrichir, ne pas réécrire** (guideline §3). Préserver tout le contenu `✅`
  (acté code) et `💡` existant. Ne jamais contredire `data.js` (CHARACTERS),
  ch03 (trame/actes), ch04 (étages), ch07 (Maisons/§7.8 signatures).
- Marquer `✅` (acté code) / `💡` (proposition) / `❓` (à arbitrer), tables de synthèse.
- Changement **documentaire** : pas de bump cache PWA (§8 N/A) ; smoke test N/A.

## ÉTAPE 1 — Contenu

### Chapitre 05 — Personnages jouables
- [x] §5.0.1 : table « Profil de combat en un coup d'œil » (✅ stats réelles).
- [x] §5.1 / §5.2 : enrichi CHAQUE héros (13) — **Année scolaire** 💡, **Apparence**
      💡 (baguette/robe/acc/icône), **Forces/Faiblesses** ✅ (stats), **Rôle en
      combat / spécialités** 💡, **Interaction Signature & trame** 💡 ; contenu
      existant conservé.
- [x] §5.3 **Choix des personnages** (solo/duo, customisation légère par
      allocation/équipement/sorts ; pas d'éditeur).
- [x] §5.4 **Dialogues marquants** : barks par archétype + répliques de trame +
      barks de tension en duo (remplace le cadrage ❓).
- [x] §5.5 **Règle d'ajout d'un nouveau personnage jouable** (normative) :
      conditions minimales + contraintes gameplay + contraintes narratives +
      processus d'intégration + checklist. Relie skill `add-playable-character` + CLAUDE.md.

### Chapitre 08 — Quêtes & sous-intrigues
- [x] §8.0 **Quête principale — refermer la Clé de Voûte** (colonne vertébrale +
      escorte Dumbledore).
- [x] §8.6 **Fil rouge narratif** : Éclats, **voix des Fondateurs** (stèle / écho
      Salazar / Codex Rowena / Dumbledore), courbe de révélation progressive.
- [x] §8.7 **Structure par acte** (synthèse quêtes ↔ étages/tranches/fil rouge).
- [x] §8.8 **Dialogues & choix impactants** (Dumbledore, choix gris du Pacte,
      Refuge, Chevalier, Codex/Manon).
- [x] §8.1–8.5 conservés ; récap renuméroté 8.9 (numérotation monotone).

**Vérification ÉTAPE 1 :** relecture cohérence croisée (aucune contradiction avec
data.js / ch03 / ch04 / ch07) ; tous les champs réclamés présents ; markers ✅/💡/❓.

## ÉTAPE 2 — Réconciliation doc ↔ code (superséée par livraison au fil de l'eau)

> ÉTAPE 2 devait *rédiger* un plan d'implémentation à coder ensuite. À la reprise
> (2026-06-17), l'audit du code montre que **chacun de ses items a déjà été livré**
> par les PRs intermédiaires (#520 → #573). Plutôt qu'un plan prospectif obsolète,
> on consigne ici la **traçabilité** de chaque élément narratif des ch.05/08 vers
> son module d'implémentation. Changement **documentaire** (pas de bump cache,
> smoke N/A).

### Items planifiés → état réel

| Item ÉTAPE 2 | État | Implémentation (module · symbole) |
|--------------|------|-----------------------------------|
| Variables / flags de trame | ✅ | `state.js` : `slythPactChoice`, `gryff/slyth/raven/poufSignatureDone`, `eclats_clef_voute`/`eclat_voute` (item `monsters.js` drop) |
| Dialogues conditionnels (Maison + perso) | ✅ | `hero-barks.js` : `houseTension{}` + `tierTransition` ; réputation PNJ `npc-dialog.js` (`_eclatSuffixPages`, suffixe muet par rep) |
| Quête principale — Clé de Voûte | ✅ | `quests.js` (compteur `eclat_voute`, remise `eclats_clef_voute`) ; `npc-dialog.js` (porteur de quête) |
| Escorte Dumbledore (chaîne) | ✅ | `quests-templates.js` : `dumbledore_eveil → _courage → _resistance → _revelation` (prereq chaînés) |
| 4 Quêtes Signature de Maison | ✅ | `quests-templates.js` : `quest_signature_{gryff,slyth,raven,pouf}` (Actes I-III) ; gate `unlockHouseSignatureQuest` + `_markSignatureDone` (`quests.js`) ; récompenses `houseSetReward` (`banniere_godric`, `langue_de_plomb`, `codex_rowena_eclat`, `coeur_refuge`) |
| Choix gris du Pacte (Serpentard) | ✅ | `quests.js` : `turnInSlythSignature(choice)` pose `slythPactChoice` ('pact'/'defiance') → levier Voldemort `battle.js:218` ; échos `floor-ambiance.js getSignatureEchoBeat` (variantes donePact/doneDefiance) — PR #572 |
| Voix des Fondateurs (révélation distribuée) | ✅ | `floor-ambiance.js` : `FOUNDER_VOICES{}` (Godric/Salazar/Rowena/Helga) ; `codex_rowena` epic signature Serdaigle (#556, dédup #556) |
| Gardiens des Chambres des Fondateurs | ✅ | `monsters.js` (Lot 1 #560) · placement `dungeon*` (Lot 2 #563) · barks/codex (Lot 3 #567) |
| Gestion duo vs solo | ✅ | inchangée (système `party`/`partySize` préexistant) |
| Règle d'ajout d'un héros (workflow dev) | ✅ | doc §5.5 (normative) + skill `add-playable-character` + CLAUDE.md ; **16 héros codés** dans `CHARACTERS` (`data.js`) |
| Assets (sprites / icônes) | ✅ | prompts Nano Banana + icônes raster (PRs récentes, ex. #571/#573) |

### Reliquats
Aucun reliquat fonctionnel. Les docs ch.05/08 décrivent l'état **acté en code** ;
les marqueurs `💡`/`❓` restants y sont des propositions/atmosphère assumées, pas
des manques d'implémentation.

**Décision de clôture (2026-06-17) :** plan marqué TERMINÉ et déplacé vers
`.claude/plans/_archive/`. Toute évolution future des héros/quêtes passe par les
docs ch.05/08 + skills dédiés, pas par ce plan.
