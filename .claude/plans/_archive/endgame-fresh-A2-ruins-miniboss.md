# Thème A — Endgame frais · A2 : mini-boss natif des Ruines

> Suite d'A1 (faune native 13-16). A2 ancre la tranche des Ruines par un
> **boss épique natif** — comme `basilic_ancestral`/`magyar_ancestral` sont des
> bosses weight-1 du pool (spawn naturel rare, pas de placement dur). Faible
> risque (même chemin `add-monster`), forte valeur (menace mémorable de Boucle).

## Concept — « L'Antécesseur »

Entité d'**avant l'écriture** (donc avant les runes, avant les Fondateurs) que
les Quatre durent lier **en premier** pour bâtir le Sceau. Distincte :
- du **Dormeur des Fondations** (qu'on n'affronte jamais — lore) ;
- des **Gardiens des Chambres** (17+, défendent les Fondateurs) ;
- des bêtes ancestrales recyclées (basilic/magyar).

Caster-hybride qui « défait » le réel (cohérent avec les Sutures d'A1) :
`être magique`, élément ténèbres (magie brute pré-runique), phases, epic.

| Champ | Valeur |
|---|---|
| id | `antecesseur` |
| minFloor | 15 · weight 1 · epic |
| stats | hp 175, atk 22, def 15, mag 22, agi 9, lck 8, scale 0.36 (atk<1,5×mag → **pas** brute, c'est un caster) |
| abilities | Verbe d'Avant l'Écriture (damage fort) · Défaire (dispel) · Regard du Vide (fear) · Résorption (heal) |
| phases | 50 % (+atk) · 25 % (+atk) |
| resist / weak | ténèbres·physique / **lumière** |
| xp/gold | ~300 / 150-240 · drops endgame (essence/page/larme/éclat) |

Sans `imgSrc` → fallback SVG catégorie (PNG painterly = suivi, prompts nano-banana).

## Étapes → vérification
1. Entrée dans `js/monsters-high.js` (après la faune A1). → `node --check`.
2. `sim-difficulty.js --endgame` avant/après (boss weight 1 = impact marginal
   sur le win-rate agrégé ; vérifier absence de trivialisation/pic).
3. `node tests/smoke.js` monstres/bestiaire/combat + MonsterImages (verts).
4. Cache : bump `monsters-high.js` + `CACHE_VERSION`.

## Journal
- **2026-07-16** — Plan créé. Boss caster « L'Antécesseur » conçu.
- **2026-07-16 — A2 LIVRÉ** ✅ : `antecesseur` (mf15, epic, weight 1) dans
  `monsters-high.js` — caster-hybride ténèbres, 4 capacités (nuke/dispel/fear/
  heal) + 2 phases, faible lumière, resist ténèbres·physique. Sans imgSrc
  (fallback SVG). Équilibrage (sim avant/après, suréquipé) : ét.30 Solo 63→55 %,
  sinon marginal — sain, pas de trivialisation. Cache : monsters-high v4→5,
  CACHE_VERSION v259→260. Tests : units 1103 ✅ ; smoke MonsterImages/bestiary/
  MonsterCombatInfo/combat (11) ✅. PNG painterly = suivi.
