# Plan — Clarifier localisation boss (réconciliation doc↔code)

> Roadmap : §1.1 ⚠️6 / §1.5 / Phase 1 « Clarifier localisation boss ».
> CODE = source de vérité (`js/monsters.js`). Date : 2026-06-14.

## Ground truth (audité dans `js/monsters.js`)

| Boss (id) | Nom affiché | `minFloor` | `maxFloor` | epic | Note |
|-----------|-------------|-----------|-----------|------|------|
| `nagini` | Nagini | 7 | null | — | — |
| `fenrir_greyback` | Fenrir Greyback | 8 | null | ✅ | — |
| `veilleur_seuil` | Veilleur du Seuil | 8 | null | ✅ | — |
| `bellatrix` | Bellatrix Lestrange | **8** | null | ✅ | weight 2 |
| `aragog` | Aragog | 9 | null | ✅ | — |
| `voldemort_affaibli` | Voldemort Affaibli | **9** | null | ✅ | **2 entrées Voldemort** |
| `antonin_dolohov` | Antonin Dolohov | 10 | null | ✅ | — |
| `heraut_tenebres` | Héraut des Ténèbres | 10 | null | ✅ | — |
| `voldemort_revenu` | Voldemort Ressuscité | 10 | null | ✅ | phases `_checkBossPhases` |

### Réponses aux 2 questions de la roadmap
1. **Bellatrix** : étage **8+** (`minFloor: 8`). Déjà correct là où un étage est
   donné (06 §6.6 « 8+ »).
2. **Voldemort = DEUX entrées distinctes** : `voldemort_affaibli` (**9+**) puis
   `voldemort_revenu` (**10+**, climax à phases). Pas une seule entrée à 2 états.

## Seule dérive factuelle constatée
**« Voldemort Affaibli ét. 8 »** dans la doc → le code dit **étage 9**
(`minFloor: 9`). Tous les autres étages de boss cités sont déjà exacts.

### Occurrences à corriger (8 → 9)
- [x] `docs/histoire/01-synopsis-et-pitch.md:83`
- [x] `docs/histoire/02-univers-ton-et-canon.md:26`
- [x] `docs/histoire/03-trame-principale.md:138`
- [x] `docs/histoire/04-structure-actes-et-etages.md:137`
- [x] `docs/histoire/06-pnj-et-factions.md` (table §6.5 l.202 + prose l.298)
- [x] `docs/histoire/09-bestiaire-et-lore.md` (l.126, 459, 709)
- [x] `docs/histoire/12-glossaire-et-codex.md:624`
- [x] `CLAUDE.md` « Monstres définis » : déplacer Voldemort Affaibli du palier
      « 8+ » vers « 9+ »

### Scope decision
Le roadmap nomme « 01, 03, 06 » mais la même dérive est dans 02/04/09/12 +
CLAUDE.md. Le but Phase 1 est « tuer la dérive à la racine » → corriger TOUTES
les occurrences de cette unique erreur factuelle (chaque edit = « 8 » → « 9 »,
chirurgical). Bellatrix : aucun changement (déjà 8+).

## Étapes
1. [x] Audit doc↔code (`monsters.js`) → table ci-dessus. ✅
2. [x] Corriger les 8 fichiers doc + CLAUDE.md. ✅
3. [x] Marquer ⚠️6 / §1.5 / Phase 1 ✅ Résolu (2026-06-14) dans la roadmap. ✅
4. [x] `node tools/check_doc_modules.js` reste vert → exit 0. ✅
5. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous
- Doc-only (CLAUDE.md + docs/**/*.md) → PAS de cache bump, smoke non requis.
- `node tools/check_doc_modules.js` doit rester exit 0.
