# Plan de remédiation — Équilibrage des artefacts

> **Date** : 2026-06-14 · **Branche** : `claude/artifact-remediation-plan-3611fs`
> **Statut** : 📋 **Plan vivant (guidelines §5) — aucune implémentation engagée.**
> **Source** : [`docs/artifact-balance-study.md`](../../docs/artifact-balance-study.md)
> (étude mergée, PR #552). Ce plan transforme ses findings en lots livrables,
> ordonnés par priorité, chacun avec critères de vérification et porte de décision.

---

## 0. Principes & garde-fous (valent pour tous les lots)

- **Règle d'or** : les artefacts sont un axe **additif**. **Ne jamais** toucher
  au scaling des monstres (`dungeon-scaling.js`, `monsters.js`).
- **Économie endgame** : **aucune baisse de prix** sur l'endgame (déjà tendue,
  `game-economy-gold-audit.md`). Les repricings ne font que **monter**.
- **`js/data.js` est servi au navigateur** → tout lot qui le modifie déclenche
  le skill **`cache-bump`** (bump `?v` dans `index.html` + `PRECACHE_URLS` de
  `sw.js` + `CACHE_VERSION`) puis `node tools/check_cache_versions.js
  --base origin/master` et `node tests/pwa-smoke.js`. (Guidelines §8.)
- **Validation** par lot : `node tests/units.js` (helpers purs) +
  `node tests/smoke.js` (scénarios). Tout changement de **stat** doit en plus
  passer `tools/sim-difficulty.js` (`--stat-rework`/`--endgame`) **avant** d'être
  figé — critère Ch.13 : un kit complet d'artefacts ne dépasse pas Forge 5 + 25
  niveaux.
- **Surgical** (guidelines §3) : ne réécrire que les lignes tracées à un finding.
- Chaque lot = sa propre PR (guidelines §6) ; pas de PR sans demande explicite.

### Porte de décision globale (arbitrages §7 de l'étude)

Avant de coder, **trancher** ces points (sinon le lot reste bloqué) :

| # | Question (étude §7) | Recommandation par défaut | Bloque |
|---|---------------------|----------------------------|--------|
| Q1 | `amulette` (epic ét.3, ratio 0,63×) : relever ou laisser ? | **Laisser** (bonne rampe early) | Lot D |
| Q2 | Premium Gryffondor : rebaser sur quelle epic ? | `gantelets_aurors` (fantasme offensif) | Lot B |
| Q3 | Doublon `codex_rowena` : renommer l'epic, ou supprimer l'epic et pointer la signature sur autre chose ? | **Renommer + nom d'affichage distinct** (voir Lot A) | Lot A |
| Q4 | Adopter la formule corrigée §2.1 dans `artifacts-reliquary-system.md` ? | **Oui** (descriptif, zéro runtime) | Lot F |
| Q5 | Palier uncommon : contenu neuf ou rétrograder des rares ? | **Contenu neuf** | Lot E |

---

## Lot A — 🔴 Bug : ID dupliqué `codex_rowena` (P1, priorité haute)

### Constat précis
Deux entrées `ITEMS` portent `id:"codex_rowena"` :

| Ligne | Rareté | Stats | Rôle voulu | Référencé par |
|-------|--------|-------|------------|---------------|
| `data.js:654` | **legendary** | MAG+10 INT+3 | Récompense **Tier-5 « Légende »** | `state.js:362` (`item:'codex_rowena'`) |
| `data.js:875` | **epic** | INT+4 MAG+2 | Récompense **Quête Signature Serdaigle** | `quests-templates.js:789` (`houseSetReward`), `npc-dialog.js:147` (map claimable) |

`ITEMS.find(i=>i.id==='codex_rowena')` renvoie **toujours le legendary** (premier
trouvé). Conséquences réelles :
1. La **Quête Signature** Serdaigle remet le **legendary Tier-5** (MAG+10 INT+3)
   au lieu de l'epic prévu (INT+4 MAG+2) → récompense **surpuissante** + second
   chemin gratuit vers l'item Tier-5.
2. L'entrée epic (`data.js:875`) est **morte** (jamais résolue par id).
3. Les 3 entrées d'icône `item-icons.js` (`codex_rowena` : NEW + 2 legacy) sont
   partagées → l'epic n'a de toute façon pas d'icône propre.

### Décision (Q3)
**Renommer l'entrée epic signature** en `codex_rowena_eclat` (id neuf) **et**
lui donner un **nom d'affichage distinct** (« Codex de l'Aigle » ou « Feuillets
de Rowena ») pour éviter deux items au même `name`. Le legendary garde son id et
toutes ses références (intactes).
> Alternative écartée : supprimer l'epic + pointer la signature sur le legendary
> = officialiser un doublon de récompense Tier-5 (trop fort, casse la
> progression). À ne retenir que si le design **veut** que la signature donne le
> Tier-5.

### Changements (exhaustif)
1. `js/data.js:875` : `id:"codex_rowena"` → `id:"codex_rowena_eclat"`,
   `name:"Codex de Rowena"` → nom distinct ; `family` peut rester ou se
   spécialiser.
2. `js/quests-templates.js:789` : `houseSetReward:"codex_rowena"` →
   `"codex_rowena_eclat"`.
3. `js/npc-dialog.js:147` : map `Serdaigle:'codex_rowena'` →
   `'codex_rowena_eclat'`.
4. `js/item-icons.js` : ajouter les 3 entrées `codex_rowena_eclat` (NEW +
   2 legacy) — réutiliser l'icône existante (`img/icons_new/codex_rowena_64.png`)
   en repli, ou générer une icône dédiée (skill `add-item-icon`).
5. **Codex narratif** : vérifier si une entrée Codex `{type:'item',
   value:'codex_rowena'}` visait l'epic signature → la repointer sur le nouvel id
   (grep `codex_rowena` dans `js/codex.js`).
6. **Save legacy** : un save existant peut contenir `codex_rowena` (le legendary)
   dans un inventaire/équipement → **aucune migration nécessaire** (le legendary
   garde son id). Pas de joueur ne possède l'epic (il était inatteignable).

### Vérification
- `node tests/units.js` (unicité des ids ITEMS : **ajouter une assertion** « pas
  d'`id` dupliqué dans `ITEMS` » — garde-fou anti-régression).
- `node tests/smoke.js` : `scenarioPremiumReward` / scénario signature Serdaigle
  (vérifier que la remise donne bien l'epic neuf, pas le legendary).
- **cache-bump** (data.js, quests-templates.js, npc-dialog.js, item-icons.js,
  éventuellement codex.js touchés).

### Risque
Faible — rename localisé, le legendary inchangé. Le seul piège est d'oublier un
call-site → la nouvelle assertion d'unicité + grep `codex_rowena` couvrent.

---

## Lot B — 🟠 Équité des 4 Premium de Maison (P3)

### Constat
Budgets de stat des 4 Premium (récompense signature identique) :
Serd 685 · Pouf 510 · Slyth 492 · **Gryff 252**. Gryffondor pèse < ½ des autres.

### Décision (Q2)
Cibler une **bande commune ~480–560** de budget. Rebaser la Premium Gryffondor
sur une epic offensive forte. Deux options :
- **B1 (reco)** : `orbe_runique_premium_gryff` reste un orbe mais ses stats sont
  rehaussées à la main (pré-cuit, décision §2.1 n°2) vers ~500 de budget
  (ex. MAG+6, `bonusElemDmg{tous:0.18}`, + `bonusCritChance` léger).
- **B2** : changer la base Gryffondor pour `gantelets_aurors` (epic, bud 307 →
  ×1,35 ≈ 415) → `gantelets_premium_gryff`. Plus proche du fantasme Gryffondor
  mais touche `HOUSE_PREMIUM` + Codex + icône.
- Éventuellement **plafonner Serd 685** (le plus fort) vers ~580 pour resserrer.

### Changements
- `js/data.js` : entrée(s) Premium (stats pré-cuites). Si changement de base
  (B2) : `HOUSE_PREMIUM` (data.js:547), entrée Codex Premium, icône.
- Aucune des Premium n'est vendable (prix 0) → **aucun impact sur l'éco or**.

### Vérification
- `node tests/units.js` (bloc artefacts §12).
- `node tests/smoke.js` : `scenarioPremiumReward` (stats pré-cuites + remise).
- **`tools/sim-difficulty.js`** — rehausser un Premium augmente le pic de
  puissance endgame : valider le seuil « kit complet ».
- **cache-bump** (data.js + Codex/icônes si touchés).

### Risque
Moyen — c'est un **buff de puissance**. Gating sim obligatoire.

---

## Lot C — 🟢 Parité de la relique vocale de Rowena (§5.3)

### Constat
Budgets reliques vocales : Helga 220 · Godric 210 · Salazar 200 · **Rowena 140**.
Rowena (`voix_rowena_relique`, INT+4 + `spCostReduction:1`) est sous-dotée (INT
est secondaire ; via D1, INT+4 ≈ MAG+1).

### Changement
`js/data.js` (`voix_rowena_relique`) : ajouter `bonusMag:2` (budget 140→210,
aligné). Non vendable → zéro impact éco.

### Vérification
- `node tests/smoke.js` : `scenarioVoiceRelics` (octroi + Chœur + icône).
- `tools/sim-difficulty.js` (léger buff endgame).
- **cache-bump** (data.js).

### Risque
Faible (buff modeste, item de Boucle non vendable).

---

## Lot D — 🟢 Repricing de sous-évaluées (hausses seules)

### Constat & cibles (étude §6.5)
| Item | Prix actuel | Proposition | Raison |
|------|-------------|-------------|--------|
| `chapeau_pointu` | 200 | **300** | rare acte II, ratio 1,1× vs bande ~2,5× |
| `bottes_dragon` | 340 | **600** | rare acte III (ét.7), ratio 1,9× vs ~4,5× |
| `amulette` | 250 | (Q1) **400** ou **laisser** | epic ét.3 à 0,63× — voir Q1 |

### Changement
`js/data.js` : champ `price` des items ciblés (uniquement à la hausse).

### Vérification
- `node tests/smoke.js` : `scenarioShopLimits` / achat (prix lisibles, pas de
  softlock soin).
- Pas de sim nécessaire (prix ≠ puissance) ; vérifier juste l'accessibilité
  éco (l'audit gold montre que ces prix restent atteignables à leur étage).
- **cache-bump** (data.js).

### Risque
Faible. Respecte « aucune baisse ». Q1 gate la ligne `amulette`.

---

## Lot E — 🔵 Étoffer le palier `uncommon` (P2 / §6.6) + belt epic (§6.7)

### Constat
3 uncommons seulement (trinket ×2, wand) ; 8 slots sur 10 sans uncommon. Slot
`belt` sans aucun epic.

### Décision (Q5)
**Contenu neuf** (ne pas dévaluer l'existant). ~5 uncommons ét.3-5, 150–280 G,
budget ~80–130, sur head/body/feet/cloak/belt + 1 belt epic acte III.

### Changements
- `js/data.js` : ~6 entrées neuves (uncommons + 1 belt epic). Réutiliser slots &
  champs `bonus*` existants (aucun nouveau levier).
- `js/shop.js` : entrées `SHOP_CATALOG` (`minFloor` 3-5 pour uncommons ; belt
  epic en Hogsmeade corrompu ét.9-10). `houseAffinity` optionnelle (rééquilibrer
  Pouf, sous-doté en slots-faveur).
- `js/item-icons.js` : icônes (skill `add-item-icon`, parts SVG existants).
- **MANIFEST / doc** : pas de module neuf → rien à ajouter au loader.

### Vérification
- `node tests/units.js` (assertion unicité ids — réutilise Lot A).
- `node tests/smoke.js` : `scenarioShopLimits`, `scenarioItemIcons` (chaque id a
  une icône), `scenarioHouseFavorShop` si `houseAffinity` ajoutée.
- `tools/sim-difficulty.js` (nouveau contenu de puissance mid-game).
- **cache-bump** (data.js, shop.js, item-icons.js).

### Risque
Moyen (contenu neuf + sim). Le plus gros lot — peut se découper (E1 uncommons,
E2 belt epic).

---

## Lot F — 📘 Formule de référence corrigée (P-doc, §6.1)

### Changement (documentaire pur)
`/.claude/plans/artifacts-reliquary-system.md §1.6` : remplacer
`prix ≈ budget × rarityMult × actMult` par la formule corrigée §2.1 de l'étude
(`budget × actMult'(1,2/2,0/4,0/6,0) × rarityPremium'(1,0/1,1/1,25/1,4)`), avec
renvoi à `docs/artifact-balance-study.md`.

### Vérification
Relecture ; **aucun** test/cache (markdown, non servi au navigateur).

### Risque
Nul.

---

## Ordre d'exécution recommandé

```
1. Lot A (bug)        → débloque la cohérence des récompenses Serdaigle. PRIORITÉ.
2. Lot F (doc)        → trivial, cadre les lots suivants.
3. Lot C (Rowena voix)→ petit, faible risque, échauffement sim.
4. Lot B (Premium)    → équité, gating sim sérieux.
5. Lot D (repricing)  → indépendant, rapide.
6. Lot E (uncommon)   → plus gros, en dernier ; découpable E1/E2.
```

Chaque lot : **plan amendé** (cocher ici), **units+smoke verts** (§7),
**cache-bump** si JS/CSS touché (§8), **sim** si stat touchée, **PR dédiée**
non créée sans demande (§6).

---

## Suivi (à cocher à l'implémentation)

- [ ] Lot A — rename `codex_rowena_eclat` + assertion unicité ids + cache-bump
- [ ] Lot F — formule §1.6 corrigée
- [ ] Lot C — `voix_rowena_relique` +MAG+2
- [ ] Lot B — Premium Gryffondor rebasé (+ sim)
- [ ] Lot D — `chapeau_pointu`/`bottes_dragon`(/`amulette`) repricés
- [ ] Lot E — palier uncommon étoffé + belt epic (+ sim)

## Questions ouvertes restantes (arbitrage humain)

Reprises de l'étude §7 — **Q1→Q5 ci-dessus** (porte de décision globale). Aucun
lot touchant une stat n'est figé sans passage `tools/sim-difficulty.js`.
