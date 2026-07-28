# Lot 1 — Quick wins de la revue du 2026-07-28

> **Plan vivant** (guidelines §5). Exécute le premier lot priorisé au §5 de
> [`revue-sources-contenu-2026-07-28.md`](./revue-sources-contenu-2026-07-28.md).
> Périmètre demandé : **C1 · C3 · A2 · C4** — **livré : A2 · C3 · C4**, C1
> ayant été annulé en cours d'exécution (constat erroné, voir ci-dessous).
>
> **Statut** : 🏁 livré (2026-07-28).
> **Branche** : `claude/revue-projet-sources-contenu-1fl6nm` (PR #739).

---

## ⚠️ Correction de périmètre : C1 et C2 sont annulés

**Les deux constats « icônes de sorts » de la revue étaient faux.** Vérifié en
Node avant d'écrire la moindre ligne de correctif :

| | Annoncé (C1/C2) | **Réel** |
|---|---|---|
| Entrées de `SPELL_ICON_REGISTRY` | 32 / 82 | **82 / 82** |
| Sorts retombant en emoji | 50 | **0** |
| Sorts sans aucune icône | 12 | **0** |
| Entrées pointant un fichier absent | — | **0** |
| PNG de sorts orphelins | — | **0** |
| Items sans icône | 39 | **0** |

**La couverture d'icônes du jeu est complète : il n'y avait rien à corriger.**

### Trois faux positifs, une seule cause

Le diagnostic initial reposait sur des comptages `grep`/`sed` jetables. Trois
variantes du même piège se sont enchaînées — la 2ᵉ et la 3ᵉ pendant la
correction elle-même, ce qui est le plus instructif :

1. **Espaces supprimés.** `tr -d "'\": "` retirait aussi les espaces des clés :
   `'Lumos Solem'` → `LumosSolem`, sans correspondance. Les « 50 sorts
   manquants » étaient exactement les 50 noms multi-mots.
2. **Apostrophe interne.** La regex `["']([^"']+)["']` tronque
   `"Morsure d'Émeraude"` à `Morsure d` — deux sorts déclarés absents alors
   qu'ils sont bien enregistrés (lignes 554 et 580 de `item-icons.js`).
3. **Registre oublié.** `getItemIconHtml` résout SVG inline → PNG painterly →
   PNG legacy → emoji. En ne lisant que les deux registres PNG, 36 items
   illustrés en **SVG inline** (herbes, potions) passaient pour dépourvus.

> Chaque erreur allait dans le sens du constat recherché, et aucune ne
> produisait de signal d'échec. C'est l'argument central de **A2** : un
> garde-fou versionné, relu et testé, dit la vérité là où une commande jetable
> se trompe en silence. Les trois pièges sont documentés en commentaire dans
> `tools/check_content_refs.js` pour ne pas être reproduits.

## Périmètre exécuté

| # | Objet | Fichiers |
|---|---|---|
| **A2** | Garde-fou d'intégrité du contenu + couverture d'icônes, en CI | `tools/check_content_refs.js`, `.github/workflows/test.yml` |
| **C3** | Exclure `audio/voice/_raw/` du bundle GitHub Pages | `.github/workflows/deploy.yml` |
| **C4** | Recaler les 6 chiffres dérivés de `CLAUDE.md` | `CLAUDE.md` |
| — | Retirer C1/C2 de la revue + remettre à jour sa priorisation | `.claude/plans/revue-sources-contenu-2026-07-28.md` |

**Aucun `js/` ni `css/` modifié** → bump de cache PWA (guidelines §8) **non
applicable** ; `check_cache_versions.js` le confirme.

**Hors périmètre** (volontairement) : unification des deux résolveurs d'icône
de sort. Le registre étant complet (82/82) **et** A2 verrouillant sa
complétude, le fallback slug de `_renderSpellBadge` n'est plus qu'un filet de
sécurité inoffensif. Toucher les ~28 call-sites de `getSpellIconHtml` pour
**zéro** effet observable irait franchement contre guidelines §3.

---

## Étapes & vérification

1. [x] **A2 — `tools/check_content_refs.js`**
       → vérifie : drops→items · quêtes→monstres/items/sorts/recettes ·
       PNJ→quêtes · items→sorts · livres→sorts · sprites monstres ·
       registres d'icônes (sorts : complétude + fichiers + orphelins ;
       items : fichiers existants) · recettes→items.
       **verify** : exit 0 sur l'arbre courant ; exit 1 sur une référence
       cassée injectée volontairement (testé sur 3 cas).
2. [x] **A2 — étape CI** ajoutée dans `test.yml`, avant les suites de tests.
       **verify** : l'étape figure avant « Tests unitaires ».
3. [x] **C1-bis — abandonné** : `Morsure d'Émeraude` est déjà enregistré
       (`item-icons.js:580`), son PNG n'est pas orphelin. Rien à câbler.
       **verify** : `check_content_refs.js` ne signale aucun sort sans icône
       ni aucun PNG orphelin.
4. [x] **C3 — `deploy.yml`** : suppression de `_raw/` après la copie d'`audio/`.
       **verify** : l'étape « Contenu publié » liste `audio/` sans `_raw`.
5. [x] **C4 — `CLAUDE.md`** : 6 chiffres recalés — modules 85→**98**,
       scénarios 159→**297**, monstres 78→**83**, items 43→**218**
       (+39 recettes), équipables 29→**121**, MANIFEST « ~55 »→**365**.
       **verify** : `node tools/check_doc_modules.js` vert ; chiffres = mesure.
6. [x] **Revue corrigée** : §1 C1/C2 réécrits, tableau de priorisation et
       verdict mis à jour.
7. [x] **Tests** : `units.js` ✅ · `check_content_refs.js` ✅ ·
       `check_doc_modules.js` ✅ · `check_cache_versions.js` ✅ ·
       `pwa-smoke.js` ✅ · smoke ciblé (spells/inventory/visuals).
8. [x] **Cache PWA** : sans objet — aucun fichier servi au navigateur
       (`js/`, `css/`, `index.html`, `sw.js`) n'a été modifié.
       **verify** : `node tools/check_cache_versions.js --base origin/master`
       vert sans bump.

---

## Écarts constatés

- **C1 et C2 annulés en totalité** : le lot n'apporte donc **aucun gain visible
  au joueur**. Son apport réel est de production (−9,2 Mo publiés à chaque
  déploiement), d'outillage (un garde-fou qui n'existait pas) et de fiabilité
  documentaire. Dit sans détour parce que la revue promettait autre chose.
- **A2 a pris de la valeur en route** : conçu comme une assurance sur un état
  déjà sain, il s'est révélé être aussi l'instrument qui a **démenti la revue
  qui l'avait demandé**. C'est le meilleur argument possible pour le garder
  bloquant en CI.
- **Couverture d'icônes réelle : 100 %** (82/82 sorts, 218/218 items). Le
  garde-fou conserve malgré tout ses avertissements de couverture — non pas
  parce qu'il manque quelque chose aujourd'hui, mais pour signaler le jour où
  un contenu neuf arrivera sans son visuel.
- **Angle mort assumé du garde-fou** : les ids sont validés sur le motif
  `[a-z0-9_]+`. Un id contenant une majuscule ne serait pas *capturé*, donc pas
  *vérifié* — silencieux plutôt que faux. Aucun id du jeu n'est dans ce cas ;
  la convention snake_case minuscule est de fait la précondition du contrôle.
