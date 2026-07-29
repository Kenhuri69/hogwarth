# Lot 7 — C5 / A6 : CSS morte & poids du dépôt

**Branche :** `claude/premier-plan-finaliser-ocbn0z` (repartie de `master` après
le merge de la PR #745)
**Statut :** ✅ clos — **PR #746 mergée** (CI verte, job en 5 min 36 s)
**Source :** `revue-sources-contenu-2026-07-28.md` §1 C5 et §2 A6 (rang 12,
dernier de la priorisation). Lot 7 après les lots 1 à 6.

---

## 1. C5 — CSS morte

### Méthode (celle de la revue ne suffisait pas)

Un détecteur naïf « classe déclarée dans `css/` mais absente de `js/` +
`index.html` » sort **102 candidates** sur 1 048 classes. La quasi-totalité est
du faux positif : le projet compose beaucoup de classes dynamiquement
(`fd-${type}`, `variant-${v}`, `map-player-dir-${dir}`…).

À l'inverse, un critère strictement conservateur — morte seulement si **ni le
nom complet ni aucun préfixe segmenté** (`a-b-c` → `a-b-`, `a-`) n'apparaît hors
CSS — n'en sort que **2**, et rate les vraies mortes dont le préfixe est
partagé (`equip-grid` est exclue parce que `equip-row-` existe ailleurs).

Aucun des deux seuils n'est utilisable seul. La vérification retenue est donc,
pour chaque classe suspecte, **deux preuves indépendantes** :

1. `grep -F` du nom complet dans `js/` + `index.html` → **0** occurrence ;
2. lecture du code qui compose des classes avec le préfixe concerné, pour
   établir qu'aucune valeur possible ne produit ce nom.

### Résultat : 9 classes confirmées mortes

`equip-grid` (+ ses 6 descendants exclusifs `.equip-grid .equip-*`) ·
`enemy-display` · `enemy-art` (+ `@keyframes float`, qui n'animait qu'elle) ·
`char-portrait` · `map-door` · `house-btn-icon` · `muted-toggle` ·
`death-seal` · `has-tooltip`.

Deux cas ont demandé une décision plutôt qu'une suppression mécanique :

- **`.equip-grid .equip-row`** : `equip-row-0/1` existe bien dans le DOM… mais
  comme **id**, la classe étant `party-equip-row`. Le sélecteur de classe ne
  matchait donc rien.
- **`.death-seal`** : la règle voisine `#death-screen > *:not(.death-seal)`
  s'applique, elle, réellement. Supprimer le bloc entier aurait changé le rendu.
  L'exception `:not()` est retirée avec la classe ; la règle de z-index reste.

## 2. A6 — poids du dépôt : la prémisse de la revue est fausse

La revue écrit : « Le problème est le **clone**, pas le déploiement », et
propose de « purger le suivi (les fichiers restent dans l'historique — pas de
réécriture d'historique proposée ici) ».

**Ces deux phrases sont incompatibles.** `git clone` transfère l'historique
complet : le pack fait **138,7 Mo** pour 4 491 objets, et il les contient que
les fichiers soient encore suivis ou non. Retirer `uploads/` du suivi
aujourd'hui ne retire **pas un octet** du clone — seulement du répertoire de
travail. Le gain annoncé (~65 Mo au clone) n'existe pas sans réécriture
d'historique, qui casserait tous les clones et toutes les PR ouvertes.

Par ailleurs, les deux candidats à la purge ont chacun une raison documentée
d'exister :

- **`uploads/`** (6,5 Mo) — `code-review-improvements.md` §261 le signale déjà
  et conclut : « *Ne rien supprimer sans validation.* » C'est une décision
  utilisateur, pas une décision d'implémentation.
- **`tools/_shots/`** (5,7 Mo) — ce sont les planches avant/après citées
  nommément comme **preuves visuelles** par `final-polish-2026-07.md` §513 et
  §523. Les supprimer viderait ces références de leur contenu.
- **`.claude/mockups/`** (37 Mo) — la trace visuelle des décisions de design.

**Décision : ne rien supprimer dans ce lot.** L'axe A6 est requalifié : ce
n'est pas un nettoyage à faire, c'est un constat à corriger dans la revue. La
seule action utile — empêcher la *croissance* future — est déjà partiellement
en place (`.gitignore` couvre `tools/_smoke/`, `tools/_shot_*.js`).

## 3. Étapes

1. [x] Plan écrit (ce fichier).
2. [x] C5 — détection à deux critères + vérification manuelle des 9 classes.
3. [x] C5 — suppression (3 fichiers CSS) → **vérifier** : le détecteur ne les
   voit plus, aucune autre classe touchée.
4. [x] C5 — smoke ciblé (visuels, fiche perso, mort, mobile, équipement) :
   **11 scénarios verts**. Suite complète lancée en parallèle de la CI.
5. [x] A6 — mesure du pack git + rédaction du constat (§2) ; **aucune
   suppression**.
6. [x] Doc : revue §1 C5 traité / §2 A6 requalifié.
7. [x] Cache-bump (3 CSS servis) + `check_cache_versions.js`.
8. [x] Commit → push → **PR #746**, CI verte, **mergée** (nouvelle PR : la #745 était mergée, §6).

## 4. Garde-fous

- **Suppression CSS = risque visuel silencieux** : aucun test n'échoue si une
  règle utile disparaît. D'où l'exigence de deux preuves par classe, et le
  refus de supprimer les 93 autres candidates.
- **Rien d'irréversible sans validation** (A6) : la seule action destructrice
  possible ici a déjà été marquée « ne rien supprimer sans validation » par un
  plan antérieur.

## 5. Écarts constatés en cours de route

- **Le lot livre un axe et en refuse un.** A6 n'est pas « reporté » : il est
  requalifié, mesure à l'appui. Un axe de revue peut être faux ; le traiter
  quand même par conformité aurait produit une suppression de 12 Mo pour un
  gain nul et deux références de plans cassées.
- **Le chiffrage de C5 par la revue ne se reproduit pas** : elle annonçait
  807 classes déclarées et 59 candidates ; je mesure 1 048 et 102. Les deux
  extractions comptent différemment (commentaires, `url()`, sélecteurs
  composés). Peu importe : ce qui compte est le nombre de classes **prouvées**
  mortes, pas la taille du tas de suspects.
- **`@keyframes float` est parti avec `.enemy-art`** : c'était son unique
  consommateur (vérifié). Une animation orpheline aurait survécu à un
  nettoyage centré sur les seules classes.

## 6. Mesures

### 6.1 C5 — suppression

| fichier | +/− |
|---|---|
| `css/style.css` | −52 |
| `css/ornaments.css` | +5 / −12 |
| `css/ux-improvements.css` | −2 |

**−66 lignes**, 9 classes + 6 descendants exclusifs + 1 `@keyframes`.
Le détecteur ne les voit plus ; les 93 autres candidates sont inchangées.

Vérification : 11 scénarios smoke ciblés (visuels, fiche perso, écran de mort,
mobile, équipement) verts, puis suite **complète sur arbre stable** :
**285/285 en 22 min 5 s**.

### 6.2 A6 — ce que pèse vraiment le dépôt

| mesure | valeur |
|---|---|
| pack git (`size-pack`) | **138,7 Mo** |
| objets dans l'historique | 4 491 |
| répertoire de travail non-runtime | `.claude/` 42 Mo · `tools/` 19 Mo · `uploads/` 6,5 Mo |

Le pack est ce que transfère un `git clone`. Il ne bouge pas quand on cesse de
suivre un fichier. **Aucune suppression** : le gain visé n'existe pas à ce prix.
