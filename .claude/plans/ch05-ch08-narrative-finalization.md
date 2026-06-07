# Finalisation narrative — Chapitres 05 & 08

**Statut :** 🟩 ÉTAPE 1 livrée — en attente de validation avant ÉTAPE 2
**Branche :** `claude/hogwarth-ch05-ch08-narrative-KEglC`

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

## ÉTAPE 2 — Plan d'implémentation (après validation)
- [ ] Variables/flags, dialogues conditionnels (Maison+perso), intégration gameplay
      (étages/événements/boss), gestion duo vs solo, MAJ règle d'ajout dans le
      workflow dev, priorisation + assets. (Rédigé seulement après feu vert.)
