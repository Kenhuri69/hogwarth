# Plan — Clarifier l'Almanach de la Salle sur Demande (hub démarrage)

> Statut : **en cours** (branche `claude/room-presentation-startup-ux-jc8b6p`).
> Suite directe de `room-of-requirement-v3.md` §5 (Axe B — Almanach hub).

## Constat (feedback utilisateur)

Le panneau Almanach apparaît sur le hub de démarrage dès la 1ʳᵉ Salle
découverte, mais son **but est illisible** :

1. **Bug d'affichage** : l'`<img>` du médaillon « obtenu » (`save-ui.js`
   `renderRequirementAlmanac`) n'a **aucune contrainte de taille** ; il se rend
   à sa taille native (~64 px) dans une pastille `.alm-pill` de 28 px → déborde
   en énorme médaillon (cas vu : `eclat_training.png`, épées croisées rouges qui
   ressemblent à une croix d'erreur ❌). Casse la rangée.
2. **Intention absente** : titre = nom de l'easter-egg, sans dire ce que c'est
   ni pourquoi des pastilles pointillées attendent le joueur, ni que les thèmes
   découverts donnent un **bonus de départ** (`_applyRequirementMetaBonus`,
   main.js : +15×n Gallions cap 75 + n potions, complétion → +1 potion_m).

Direction retenue (arbitrée avec l'utilisateur) : **clarifier en place** —
le panneau reste sur le hub mais devient lisible, explicite et discret.

## Changements

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `css/save-ui.css` | `.alm-pill img { width/height:100%; object-fit:contain; border-radius:50% }` (corrige le débordement) ; styles `summary`/`.alm-sub` ; pastille « obtenue » sans bord doublon | médaillon obtenu rentre dans 28 px, rangée propre |
| `js/save-ui.js` | `renderRequirementAlmanac` : passer le contenu dans un `<details>` natif (collapsible, **fermé par défaut** = discret) ; `<summary>` = titre + compteur `got/total` ; ligne `.alm-sub` explicative (« souvenirs gardés entre parties + bonus de départ ») ; `title` des pastilles verrouillées suffixé « — à découvrir » | masqué si vierge (inchangé) ; déplié à la demande ; aucune throw |
| `index.html` + `sw.js` PRECACHE + `pwa.js` SW_URL + `CACHE_VERSION` | cache-bump des 2 assets touchés (save-ui.js, save-ui.css) | `node tools/check_cache_versions.js --base origin/master` exit 0 |

> Zéro nouveau module, zéro nouvelle dépendance. `<details>`/`<summary>` natif
> = collapsible **sans JS** (pas de nouvel état, pas de handler).

## Verify

1. `node tests/smoke.js` (scénario `RoomOfRequirement` + hub) vert.
2. `node tools/check_cache_versions.js --base origin/master` exit 0.
3. Visuel : lancer le jeu avec un codex peuplé → médaillon obtenu à la bonne
   taille, panneau replié avec compteur, sous-titre explicite au déploiement.

## Suivi
- [x] CSS : sizing img (`.alm-pill img` 100%/contain) + styles details/summary/sub + marqueur ▸ rotatif.
- [x] save-ui.js : `<details>` replié par défaut, `<summary>` titre+compteur, sous-titre explicatif, tooltips verrouillés (« — à découvrir »).
- [x] cache-bump : save-ui.js v4→v5, save-ui.css v2→v3, `CACHE_VERSION` v112→v113 (index.html + sw.js).
- [x] `node tests/smoke.js` vert (197 scénarios) + `check_cache_versions.js --base origin/master` exit 0.
- [x] Vérif visuelle screenshot : replié discret (compteur visible) + déplié lisible, médaillon obtenu à la bonne taille.
