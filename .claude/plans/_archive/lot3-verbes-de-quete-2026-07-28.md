# Lot 3 — Diversifier les verbes de quête (E1)

> **Plan vivant** (guidelines §5). Rang 6 du §5 de
> [`revue-sources-contenu-2026-07-28.md`](../revue-sources-contenu-2026-07-28.md) —
> le premier axe à **réel impact joueur** après les lots 1 et 2 (outillage).
>
> **Statut** : 🏁 livré (2026-07-28).
> **Branche** : `claude/revue-projet-sources-contenu-1fl6nm` (repartie de
> `master` après merge du lot 2).

---

## Le constat, corrigé après lecture du code

La revue disait : « 66 % des quêtes sont de type `kill`, ajouter les verbes
`deliver` / `discover` / `choice` ». L'audit préalable dément **les deux
moitiés** de cette phrase : le chiffre est faux (58,0 %, voir plus bas) et
**un des trois verbes existe déjà** :

| Verbe | État réel du moteur | Nature du manque |
|---|---|---|
| **`deliver`** | ✅ **existe** — `questsTurnedIn` ≠ `questsGiven` permet à un PNJ de clore une quête donnée par un autre, et `grantOnAccept` remet l'objet à porter. Le flux est câblé de bout en bout dans `npc-dialog.js`. | **Contenu** : utilisé **1 fois sur 88** (`lettre_jamais_envoyee`, Manon → Lupin) |
| **`discover`** | ⚠️ **partiel** — seul `discover_garden` existe, câblé en dur sur le flag `gardenDiscovered` | **Moteur** : pas de forme générique |
| **`talk`** | ❌ absent | **Moteur** |
| **`choice`** | ⚠️ précédent non générique (`turnInSlythSignature` : Pacte / Défiance) | **Design** — hors lot, voir plus bas |

> **Conséquence sur le périmètre** : la moindre part du travail est du moteur.
> L'essentiel est d'**utiliser** ce qui existe déjà. Un « ajout de verbe
> `deliver` » aurait dupliqué une mécanique en place — exactement le piège que
> la revue elle-même dénonce ailleurs.

## Répartition mesurée (avant, sur `master`)

100 objectifs répartis sur 89 quêtes :

| Type | Nombre | Part des objectifs |
|---|---|---|
| `kill` | 58 | **58,0 %** |
| `item` | 16 | 16,0 % |
| `floor` | 9 | 9,0 % |
| `search` · `herb` · `donate` | 4 · 4 · 4 | 4,0 % ch. |
| `pages` | 2 | 2,0 % |
| `riddle` · `escape` · `discover_garden` | 1 · 1 · 1 | 1,0 % ch. |

---

## Périmètre

### Moteur — 2 verbes réellement manquants

1. **`discover`** — atteindre un type de lieu.
   `{ type:'discover', cell:'FORGE', amount:1 }` — progresse à l'entrée dans une
   cellule du type visé. Hook : `handleCellEntry` (`movement.js`), qui voit
   déjà passer chaque case. Couvre fontaines, autels, stèles, forge,
   bibliothèque, jardins, refuges — sans une ligne par cas.
2. **`talk`** — consulter des PNJ nommés.
   `{ type:'talk', npcIds:['hagrid','lupin'], amount:2 }` — progresse à
   l'ouverture du dialogue. Hook : `openNpcDialog` (`npc-dialog.js`).

`discover_garden` est **conservé tel quel** (back-compat des saves en cours ;
guidelines §3 — on n'ajoute pas, on ne réécrit pas).

### Contenu

Nouvelles quêtes exploitant les verbes sous-utilisés — **`deliver` en
priorité**, puisque le coût moteur y est nul.

### Hors périmètre — `choice`, et pourquoi

Une résolution à deux issues suppose : une UI de choix, des conséquences
persistées, une réécriture des dialogues selon la branche, et un arbitrage
narratif sur ce qui se joue. Le précédent (`turnInSlythSignature`) est
spécifique à une quête de signature et n'est pas généralisable en l'état.
**C'est une décision de design, pas une tâche d'implémentation** : elle
revient à l'auteur du jeu, pas à moi. Je la laisse explicitement ouverte.

---

## Objectif chiffré — et son honnêteté

La revue visait « part de `kill` sous 50 % ». Y arriver depuis 58 % demande
**une vingtaine de quêtes non-`kill`** : c'est une campagne d'écriture
narrative, pas un lot technique. Ce lot livre le moteur et un premier jeu de
quêtes ; **il ne prétend pas atteindre 50 %**, et le chiffre atteint est
rapporté tel quel en fin de plan.

---

## Étapes & vérification

1. [x] Moteur `discover` + `talk` (`quests.js`) : hooks, libellés, MANIFEST.
       **verify** : `check_content_refs` ✅, lint ✅.
2. [x] Branchement des hooks (`movement.js`, `npc-dialog.js`), défensif.
       **verify** : aucun appel non gardé.
3. [x] Contenu : nouvelles quêtes (`deliver` / `discover` / `talk`).
       **verify** : `check_content_refs` ✅ (0 référence pendante).
4. [x] Scénarios smoke par verbe.
       **verify** : suite ciblée verte.
5. [x] Bump du cache PWA (JS servi modifié) — skill `cache-bump`.
       **verify** : `check_cache_versions --base origin/master` ✅.
6. [x] Ratio final mesuré et rapporté sans arrondi flatteur.

---

## ⚠️ Le « 66 % » de la revue était faux

En mesurant proprement pour ce lot, le chiffre de départ ne tient pas :
la revue divisait **58 objectifs `kill` par 88 quêtes** — deux grandeurs
différentes. C'est le même vice de dénominateur que les erreurs des lots 1 et 2.

| Mesure | Avant (`master`) | Après ce lot |
|---|---|---|
| Quêtes | 89 | **96** |
| Objectifs | 100 | **107** |
| Objectifs `kill` | 58 = **58,0 %** | 58 = **54,2 %** |
| Quêtes avec ≥ 1 `kill` | 55 = **61,8 %** | 55 = **57,3 %** |

Le vrai point de départ était donc **58,0 %**, pas 66 %. La cible « sous 50 % »
reste **non atteinte** : y arriver depuis 54,2 % demande encore une vingtaine
de quêtes non combattantes, c'est-à-dire de l'écriture narrative, pas du
moteur. Le lot ne le prétend pas.

---

## Résultat livré

### Moteur — 2 verbes

| Verbe | Forme | Hook | Garde-fou |
|---|---|---|---|
| `discover` | `{ type:'discover', cell:'FOUNTAIN', amount:3 }` | `handleCellEntry` (`movement.js`) | `_seen` par coordonnées — repasser sur la même case ne recompte pas |
| `talk` | `{ type:'talk', npcIds:[…], amount:N }` | `openNpcDialog` (`npc-dialog.js`) | `_seen` par PNJ — un PNJ hors liste ou déjà vu ne compte pas |

Les deux suivent la convention des étapes `kill`/`search` : **jamais
d'auto-remise**, l'objectif devient remettable et le joueur retourne voir le
donneur. `discover` ne compte pas en visite inter-mondes (le donjon observé
n'est pas le sien). `discover_garden` est conservé intact (back-compat des
saves, guidelines §3).

### Contenu — 7 quêtes

- **3 livraisons** (mécanique préexistante, portée de **1 → 4** usages) :
  `tue_loup_lupin` (Pomfresh → Lupin), `braise_hagrid` (Slughorn → Hagrid),
  `givre_guipure` (Ollivander → Guipure).
- **2 découvertes** : `sources_pomfresh` (3 fontaines, répétable),
  `steles_flitwick` (2 stèles).
- **2 consultations** : `enquete_mimi` (2 fantômes),
  `conseil_mcgonagall` (3 directeurs de Maison).

Aucun item neuf : les livraisons réutilisent `potion_tue_loup`,
`essence_chaleur` et `cristal_givre` — pas de dette d'icône créée.

### Tests

3 scénarios smoke ajoutés (`tests/scenarios/quests.js`) couvrant le typage,
l'anti-farm (même case / même PNJ / PNJ hors liste), le branchement réel du
hook de dialogue, et l'asymétrie donneur ≠ destinataire des livraisons.

---

## Reste ouvert

- **`choice`** (résolution à deux issues) — décision de design, pas
  d'implémentation : UI de choix, conséquences persistées, dialogues par
  branche. Revient à l'auteur du jeu.
- **Passer sous 50 %** — ~20 quêtes non combattantes supplémentaires.
