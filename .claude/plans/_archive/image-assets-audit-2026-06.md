# Audit des assets image — 2026-06-20 (Item 2 « polish »)

> Branche : `claude/image-assets-audit-lot`. Audit doc↔fichiers réel.
> **Conclusion : couverture raster COMPLÈTE — aucun manque, aucun prompt
> Nano Banana requis.**

## Méthode

```bash
# Toute référence littérale d'image dans le code, vs le contenu réel de img/
grep -rhoE "img/[a-zA-Z0-9_/-]+\.(png|jpg|jpeg|webp)" js/ css/ | sort -u
# Registres dynamiques résolus en sandbox vm (ITEMS, SPELLS, *_REGISTRY)
```

> ⚠️ **Leçon d'audit** : une 1ʳᵉ passe n'avait vérifié que `ITEM_ICON_NEW_REGISTRY`
> + `ITEM_ICON_REGISTRY` (PNG) et conclu à tort à « 15 objets sans icône ». En
> réalité ces 15 objets ont une **icône SVG inline dédiée** dans
> **`ITEM_ICON_SVG_REGISTRY`**, qui a **priorité absolue** dans `getItemIconHtml`
> (`js/item-icons.js:649`). Le test `scenarioItemIcons` (visuals.js) verrouille
> d'ailleurs **100 % de couverture** (PNG **ou** SVG inline). Toujours inclure
> les TROIS registres (NEW / legacy PNG / SVG inline) dans un audit d'icônes.

## Résultat : couverture raster **complète**

### ✅ Aucun raster RÉFÉRENCÉ-mais-ABSENT (sprites / portraits / scènes)

Tous les fichiers cités littéralement dans `js/`+`css/` existent (448 chemins
littéraux, 0 manquant). Registre par registre :

| Domaine | Registre / champ | Couverture |
|---------|------------------|------------|
| Monstres (sprites combat) | `monsters.js` `imgSrc` | **78 / 78** présents — y c. les 4 boss-gardiens des Fondateurs |
| PNJ (portraits dialogue) | `npcs.js` → `img/npc/<id>.png` | tous présents (dont ajouts récents Scamander, Sir Patrick, Guipure, Slughorn, Marchand d'Ombre) |
| PNJ (sprites 3D donjon) | `NPC_SPRITE_SRC` (typé) | 8 entrées présentes (6 corps typés + 2 signature `chevalier`/`echo`) |
| Héros (sprites plein corps) | `PLAYER_SPRITE_SRC` | **16 / 16** présents |
| Héros (portraits-médaillon) | `CHARACTERS.imgSrc` | 16 / 16 présents |
| Sorts (icônes) | `SPELL_ICON_REGISTRY` | **55 / 55** sorts (y c. lot « Sorts & Magie 2.0 P2 ») |
| Objets (icônes) | `ITEM_ICON_NEW_REGISTRY` (136 PNG) + `ITEM_ICON_REGISTRY` (167 PNG) + **`ITEM_ICON_SVG_REGISTRY` (SVG inline)** | **183 / 183** objets couverts |
| Maisons / Codex / scènes | `img/houses/`, `img/codex/`, `img/scenes/` | complets (blasons, parchemins, fins, titre) |

> Les 15 objets initialement suspectés « emoji » (5 flacons, 7 herbes,
> `eclat_lumiere`, `cle_donjon`, `recit_manon`) ont une **icône SVG inline
> bespoke et botaniquement distincte** (ex. `herbe_dictame` = trois bulbes
> floraux ; `herbe_aconit` = fleurs casquées violettes ; flacons = fioles
> teintées par élément via `_potionSvg`). C'est un **choix de design délibéré**
> (SVG net + scalable) — à NE PAS remplacer par du PNG painterly générique.

### 🟡 Surface de « fallback » connue (par design, pas un manque)

- **Sprites 3D des PNJ nommés** : en vue donjon, un PNJ nommé rend l'un des
  **6 corps typés génériques** (`mage`/`prof_h`/…), pas un sprite individuel.
  L'identité passe par le **portrait** de dialogue. Un sprite 3D dédié par PNJ
  serait un **lot Nano Banana de ~40 sprites**, hors scope polish (faible ROI :
  corps 3D petit et fugace). **Non recommandé.**
- `img/npc/_wizard_generic.png` : ultime repli, **plus le défaut** (les 6 types
  ont leur PNG dédié). Note CLAUDE.md corrigée dans cette passe (était périmée,
  et citait à tort `renderer-effects.js` au lieu de `renderer-entities.js`).

## Conclusion / décision

- **Aucune image manquante. Aucun prompt Nano Banana à rédiger.** Le pipeline
  visuel (sprites, portraits, scènes, icônes d'objet/sort) est **complet**.
- **Aucune génération d'icône** : les 15 objets visés ont déjà une icône SVG
  inline prioritaire ; produire des PNG serait du **code mort** (le SVG gagne)
  et un **downgrade** visuel. Travail de génération exploratoire **annulé**.
- **Seule modification de code livrée** : correction de la note périmée
  CLAUDE.md sur les sprites PNJ (`_wizard_generic` / fichier source).

## Suivi

- [x] Audit doc↔fichiers des 3 registres d'icônes + sprites/portraits/scènes
- [x] Correction du constat erroné « 15 manquantes » (→ SVG inline prioritaire)
- [x] Fix doc CLAUDE.md (sprites PNJ)
- [x] Décision : pas de génération (couverture complète) — PR doc-only
