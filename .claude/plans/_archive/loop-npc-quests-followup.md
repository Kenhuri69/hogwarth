# Quêtes Boucle — suivi 2 (Pomfresh, Ollivander, Lockhart×Manon)

Suite de `.claude/plans/_archive/level-11-npc-quests.md` (PR #587 mergée). Rallume 3 PNJ
lore recyclés en Boucle (Pomfresh f12, Ollivander f13, Lockhart f13, Manon f13).

## Décisions (AskUserQuestion)
- Ollivander : **nouvelle baguette épique** en récompense (réutilise le système
  de tint `ebony` → zéro nouvel asset image).
- Lockhart×Manon : **rédemption de Lockhart** (il écrit la VRAIE histoire de
  Manon). Chaîne Manon → Lockhart.

## Quêtes (toutes minFloor:11)

1. **Pomfresh — fabrication** (`fabrique_pomfresh`, répétable everyLevels:1)
   - objectif : `item` potion_soin_mineure ×3 (craft-only → force la concoction).
   - reward : or + eclat_vitalite ; repeatableReward or.

2. **Ollivander — fouille du bois** (`bois_ollivander_boucle`, répétable everyLevels:2)
   - objectif : `search` ×4 (retrouver un bois rare en fouillant).
   - reward : `baguette_if_boucle` (nouvelle, 1ʳᵉ fois) + or ; repeatableReward or.

3. **Manon — confier son histoire** (`manon_confier`, one-shot)
   - objectif : `search` ×3 (retrouver les souvenirs épars d'Élara).
   - reward : `recit_manon` (item quête) + xp/or.

4. **Lockhart — mémoire véridique** (`memoire_lockhart`, prereq manon_confier, one-shot)
   - objectif : `item` recit_manon ×1 (consommé).
   - reward : spellbook livre_lumos_solem + or + stats lck.

## Nouveaux items (data.js)
- `baguette_if_boucle` : wand epic (ATK+6 MAG+6, spellCrit+3, critDmg+0.25),
  tinted ebony (réutilise wand_shaft_base / wand_tip_runic). price 0.
- `recit_manon` : item quête (type material, emoji 📜), price 0.

## Étapes
1. [x] data.js — 2 items (baguette_if_boucle, recit_manon)
2. [x] quests-templates.js — 4 quêtes
3. [x] npcs.js — wiring 4 PNJ (questsGiven + dialoguesByQuest)
4. [x] item-icons.js — couverture registre (baguette → PNG wand2, récit → SVG inline)
5. [x] tests — scenarioLoopNpcQuests2 (smoke 230 ✅, units 703 ✅)
6. [x] cache bump v170 (data/quests-templates/npcs/item-icons) + pwa-smoke ✅

## Écart
- Test de couverture d'icônes (visuals.js) exige une entrée registre par item :
  baguette → réutilise le PNG de wand2 (rendu réel via tint ebony) ; récit →
  SVG inline parchemin dans ITEM_ICON_SVG_REGISTRY (zéro fichier).
