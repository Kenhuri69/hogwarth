# Système élémentaire — faiblesses pertinentes

## Constat

`spell.effect` fait double emploi : routage moteur (`heal`/`shield`/
`burn`…) **et** clé resist/weak. Résultat : seuls `burn` et `stun`
servent de « couleurs » → le système faiblesse n'a aucune profondeur.

## Objectif

Découpler. Nouveau champ `spell.element` (6 valeurs) dédié au
resist/weak. `effect` reste pour le routage. Re-tag des 17 sorts de
dégâts et des 50 monstres.

Roster : `feu` 🔥 · `glace` ❄️ · `foudre` ⚡ · `lumière` ✨ · `ténèbres` 🌑 · `physique` ⚔️

`disarm` reste une clé resist **mécanique** (blocage d'Expelliarmus),
orthogonale aux éléments — conservée telle quelle.

## Étapes

1. `data.js` — ajouter `element` aux 17 sorts de dégâts.
2. `battle-spells.js` — resist/weak matchent `spell.element`
   (`_spellElementalDamage`, `_spellLifesteal`, `_spellCurse`).
3. `monsters.js` — re-tag `resist`/`weak` des 50 monstres (table ci-dessous).
4. `ui-bestiary.js` — `_renderResistWeakHtml` : emoji par élément.
5. `tests/smoke.js` — scénario multiplicateur élémentaire.
6. `CLAUDE.md` — doc monstres + section faiblesse.

## Tag des sorts (étape 1)

| Sort | effect | element |
|------|--------|---------|
| Incendio, Bombarda, Crucio | burn | feu |
| Aguamenti | burn | glace |
| Diffindo, Sectumsempra | burn | physique |
| Wingardium Leviosa | stun | physique |
| Patronum | burn | lumière |
| Lumos Maxima, Riddikulus | stun | lumière |
| Stupefix, Tarantallegra | stun | foudre |
| Morsmordre | burn | ténèbres |
| Avada... | instant | ténèbres |
| Sanguini, Vampyrus | lifesteal | ténèbres |
| Maledictus | curse | ténèbres |

Expelliarmus (disarm), Accio/Alohomora (steal), heal/shield/teleport :
pas d'`element`.

## Re-tag des 50 monstres (étape 3)

| Monstre | resist | weak |
|---------|--------|------|
| chat_norris | — | feu |
| luciole_marais | feu | glace |
| cornichon | — | physique |
| portrait_hostile | foudre, disarm | feu |
| peeves | physique, disarm | lumière |
| myrtle | physique, feu, disarm | lumière |
| serpent_cachot | — | glace |
| chouette_envoutee | — | foudre |
| mandragore_sauvage | — | feu |
| kappa_douves | glace | foudre |
| boggart | ténèbres, disarm | lumière |
| gobelin | — | physique |
| araignee | — | feu |
| bundimun | ténèbres | feu |
| homme_araignee | — | feu |
| meduse_noire | ténèbres | lumière |
| troll | physique | feu |
| centaure | — | foudre |
| detraqueur | ténèbres, glace, disarm | lumière |
| hippogriffe_courroux | — | foudre |
| inferius | ténèbres, glace, disarm | feu |
| loup_garou | — | feu |
| sorciere_tenebres | ténèbres | lumière |
| mangemort | ténèbres | lumière |
| acromantula_jeune | — | feu |
| dementor_garde | ténèbres, glace, disarm | lumière |
| troll_grotte | physique, ténèbres | feu |
| sorcier_renegat | ténèbres | lumière |
| basilic | feu, physique, disarm | glace |
| chimere | feu | glace |
| ombre_quirrell | ténèbres, disarm | lumière |
| nagini | ténèbres, disarm | feu |
| mangemort_elite | ténèbres | lumière |
| bellatrix | ténèbres, disarm | lumière |
| voldemort_affaibli | ténèbres, feu, disarm | lumière |
| voldemort_revenu | ténèbres, feu, glace, disarm | lumière |
| niffleur | — | physique |
| elfe_rebelle | disarm | feu |
| bowtruckle | — | feu |
| chevalier_fantome | physique, ténèbres | lumière |
| gremlin_magique | feu | foudre |
| manticore_jeune | ténèbres, disarm | glace |
| gardien_portail | physique, feu | foudre |
| fantome_sang_noir | physique, disarm | lumière |
| chauve_souris_vampire | — | lumière, feu |
| vampire_mineur | ténèbres | lumière, feu |
| strigoi | ténèbres, disarm | lumière, feu |
| poupee_maudite | ténèbres | feu |
| spectre_maudit | ténèbres, disarm | lumière |
| hecate_sorciere | ténèbres, disarm | lumière |

Principes : morts-vivants/fantômes → resist ténèbres, weak lumière ;
créatures de feu → resist feu, weak glace ; plantes/objets/bois →
weak feu ; constructs → resist physique, weak foudre.

## Suite — nouveaux sorts à rédiger (hors périmètre actuel)

`glace` (1 sort) et `foudre` (2) sont sous-représentés. Candidats à
spécifier plus tard :

- **Glacius** (glace) — sort canon HP. Dégâts + nouveau statut DoT/contrôle
  `gel` (saute le tour ou −AGI). Palier intermédiaire (~niv. 5).
- **Fulgari** (foudre, nom inventé) — éclair, dégâts + chance de stun.
  Endgame ou intermédiaire.
- **Statut `gel`** — pendant glace de `burn`/`bleed`, à ajouter dans
  `STATUS_DEFS` + `STATUS_BY_SPELL`.
- Optionnel : un sort `lumière` anti-mort-vivant dédié (bonus vs `weak`).

Décision : ne PAS les implémenter dans ce lot — re-tag seulement.

## Suivi

- [x] Étape 1 — `element` sur les 17 sorts
- [x] Étape 2 — matching moteur sur `element`
- [x] Étape 3 — re-tag des 50 monstres (script jetable `tools/_retag.js`)
- [x] Étape 4 — emoji bestiaire (`ELEMENT_EMOJI`, `_elementLabel`)
- [x] Étape 5 — smoke `scenarioElementalSystem` (T1 multiplicateurs, T2
      sorts taggés, T3 zéro clé legacy)
- [x] Étape 6 — doc CLAUDE.md
- [x] `node tests/smoke.js` vert
