# Revue du jeu & axes d'évolution — 2026-07-09

> Revue stratégique **multi-dimensions** menée après clôture du plan
> `final-polish-2026-07.md` (intégralement livré et mergé). Cinq audits
> parallèles ancrés dans le code réel : systèmes & équilibrage, contenu &
> rejouabilité, narration & immersion, UX/onboarding/rétention, santé
> technique. Ce document **ne modifie rien** — il propose et priorise le
> **prochain cycle** de développement. À convertir en plans dédiés au
> fil des arbitrages utilisateur.

## Verdict d'ensemble

Le jeu est un **produit fini, poli et rigoureux** (équilibrage piloté par
simulation, garde-fous CI, XSS maîtrisé, ~194 voix, PWA offline). Les cinq
revues convergent sur un même diagnostic :

> **Les SYSTÈMES sont excellents ; le manque est le VOLUME de contenu qui
> les alimente et la PROFONDEUR DE CHOIX qui les rend *choisis* — surtout
> passé l'étage 10, où l'endgame recycle numériquement au lieu d'offrir du
> contenu frais.**

Corrections de statuts périmés relevées pendant la revue (déjà livrés,
malgré des bandeaux de plans anciens qui disent le contraire) :
- Compression `img/` : **faite** (44 → ~20 Mo, P8a).
- Voix Manon / Sirius / Gardien de la Boucle : **committées et câblées**.

---

## Les 5 grands axes (thèmes transverses)

### THÈME A — Rafraîchir l'endgame (Boucle Ténébreuse) 🔴 signal le plus fort
*3 revues indépendantes convergent ici (systèmes, contenu, narration).*
La Boucle 11+ est le contenu endgame principal mais tourne sur le recyclage
`effectiveFloor` + variantes cosmétiques ; le scaling monte, le contenu non.
Contenu réellement frais estimé ~8-15 h, puis grind numérique.

| Sous-item | Constat | Impact/Effort |
|---|---|---|
| A1 · Falaise de bestiaire 11-20 | 1 monstre à 11, 1 à 12, 0 à 13-16, 4 à 17, puis rien de neuf. Ruines (Zone D) sans faune native. | Fort / M-L |
| A2 · Variance de rencontre & mini-boss de palier | Boucle = escalade de stats, pas de jalons ; 1 mini-boss / 10 étages absent | Fort / L |
| A3 · Payoff des fins (`endgame.js`) | 5 axes de variantes = **texte sur la même cinématique** ; choix (Maison/Pacte/Briser) ne paient qu'en paragraphes | Moyen-fort / M (assets) |
| A4 · Sinks terminaux (Éclats, Essence/Pages) | Matériaux maxés → plus d'usage ; Éclats = compteur one-shot après Briser le Cycle | Moyen / M |
| A5 · Le Dormeur des Fondations | Lore le plus puissant (Codex + barks 16 héros) mais **jamais rencontré ni résolu** | Moyen / M |

### THÈME B — Profondeur de choix : builds & tactique
Rendre les systèmes existants *choisis*, pas subis.

| Sous-item | Constat | Impact/Effort |
|---|---|---|
| B1 · Items Fortune/Célérité | 0 item `bonusFortune`, 1 seul `bonusCelerite` — ces stats dérivées ne sont jamais un choix de build soutenu par le loot | Moyen / **S** ✅ quick win |
| B2 · Archétype physique viable | 18 héros quasi tous casters MAG ; STR décroche en Boucle (PV scalés) ; convergence vers le caster | Moyen-fort / M (sim requise) |
| B3 · Différencier les 4 DoT + phases de boss | burn/poison/bleed/gel mécaniquement identiques ; phases de boss sur une poignée de créatures seulement | Moyen-fort / M |
| B4 · Catalogue de sorts déséquilibré | 15 ténèbres / 10 lumière vs 5-7 pour feu/glace/foudre/physique → peu de choix élémentaire early/mid alors que résist/faible le demande | Moyen / M |

### THÈME C — Contenu & texture (quêtes, PNJ, salles, héros)

| Sous-item | Constat | Impact/Effort |
|---|---|---|
| C1 · Objectifs de quête | 67 % des 85 templates = `kill` ; ajouter `deliver`/`discover`/`choice` | Fort / M |
| C2 · Archétypes de salles | Donjon structurellement identique à chaque étage (épine + 3 branches) ; salle-type (embuscade/sanctuaire/galerie) data-driven | Fort / M |
| C3 · Passe rédactionnelle PNJ | Moteur de dialogue surdimensionné (eclatLines/darkLoopLines/contextualReaction) sous-alimenté hors PNJ nommés ; 4 marchands de Boucle interchangeables | Moyen / **S** ✅ quick win (0 JS) |
| C4 · Micro-arcs de héros jouables | 16 héros, **un seul vrai arc** (Manon, un PNJ) ; `descentStake` absent pour 10 héros ; arcs riches en doc mais livrés comme un bark | Fort / S (barks) → L (mini-quêtes) |

### THÈME D — Rétention & découvrabilité (méta)

| Sous-item | Constat | Impact/Effort |
|---|---|---|
| D1 · Succès + Défi Quotidien seedé | 0 système d'achievement ; HoF non comparable (seeds ≠). Défi à seed du jour = levier social/rétention n°1 | Fort / L |
| D2 · Découvrabilité multijoueur | Système social riche mais quasi invisible (sort niv. 8, boutons cryptiques, PvP enfoui, aucun compteur de présence) | Fort / M |
| D3 · Enseignement des systèmes | Onboarding n'apprend que « où sont les boutons » ; rien sur Fortune/Célérité/postures/paliers/éléments/corruption. Glossaire Codex + tips contextuels one-shot | Fort / M |
| D4 · Onboarding endgame | Post-victoire = méta-système opaque (Boucle, monnaies, Forge/Biblio, tiers 17-19+) sans explication | Moyen / S-M |

### THÈME E — Santé technique (fondations)

| Sous-item | Constat | Impact/Effort |
|---|---|---|
| E1 · Étoffer `units.js` + sharder smoke | 23 assertions unitaires pour 51k lignes ; smoke sériel (~159 Chromium) contre timeout CI 25 min | Moyen / M |
| E2 · Dérive des god-files | 6 → **13** fichiers > 950 l. ; `battle-spells.js` 1085→1655. Garde-fou CI soft + extraction par responsabilité | Moyen / L |
| E3 · Trancher le bundling | Plafond Lighthouse mobile structurel (éval JS ~23 s) ; concat optionnelle au déploiement OU acter le plafond — l'indécision est le pire des deux mondes | Moyen / M |
| E4 · ESLint (no-undef/no-redeclare) | Aucun filet statique sur le scope global (358 `window.*`) | Moyen / M |
| E5 · `git gc` + audio re-encode | `.git` 138 Mo ; `audio/` 19 Mo non ré-encodé (~96 kbps mono = −30-40 %) | Faible / S |

---

## Lot de « quick wins » (effort S, risque faible/nul, ROI élevé)

À grouper en 1-2 PR autonomes pour un gain immédiat sans arbitrage lourd :
- **B1** items Fortune/Célérité (plomberie stat déjà testée)
- **C3** passe rédactionnelle PNJ de Boucle (données, 0 JS)
- **C4a** `descentStake` pour les 10 héros manquants (barks défensifs)
- **Nerf boss 8-11** déjà chiffré et simulé (`balance-proposals-2026-05.md §1`, mur solo 38-44 % à l'ét. 9-10) — 6 valeurs de `scale`, zéro impact early
- **Codex completion tracker** (X/78 monstres, X/59 entrées) + titre honorifique
- **E5** `git gc --aggressive`

---

## Recommandation de séquencement

1. **Quick wins** (ci-dessus) — 1 cycle court, gains immédiats, dérisque le reste.
2. **THÈME A (endgame frais)** — le chantier structurant : commencer par **A1
   (monstres natifs 11-20)**, le levier de rejouabilité le plus rentable
   (le lore « Dormeur/Ruines » est déjà écrit ; skill `add-monster`).
3. **THÈME C1+C2 (quêtes & salles)** — casser la monotonie de texture à chaque pas.
4. **THÈME D1/D3 (défi quotidien + enseignement)** — rétention long terme.
5. **THÈME E1** en parallèle (filet de tests) — dérisque tous les chantiers de contenu.

Chaque thème/sous-item retenu → **plan dédié** (guidelines §5) avant code,
puis `commit-guard` (plan → smoke → cache-bump → état PR).

## Journal
- **2026-07-09** — Revue créée à partir de 5 audits parallèles. Aucun code
  touché. En attente d'arbitrage utilisateur sur le(s) chantier(s) à ouvrir.
