# Plan — Multijoueur PvP en ligne (arène de duels)

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Ouvert le 2026-05-22. **Phase de réflexion** — aucune ligne de code écrite.
> Branche de travail : `claude/multiplayer-mode-discussion-Ur1Q1`.

## 1. Contexte

Le jeu est un RPG tour par tour solo. Le mode **duo** instancie déjà
réellement deux personnages (`party[0]`/`party[1]`), mais les deux sont
pilotés par un seul joueur en local. On veut un vrai mode **multijoueur
en ligne joueur-contre-joueur**.

Atouts de l'existant :
- Combat **tour par tour** → netcode trivial : on échange des actions
  discrètes, pas des frames.
- `enemyGroup` (1-3 ennemis) et l'overlay `#encounter-overlay` sont déjà
  un emplacement « groupe adverse » réutilisable.
- Supabase est **déjà** une dépendance (`HOF_CONFIG`, Hall of Fame) →
  ses **canaux Realtime** servent de relais sans nouvelle infra.

## 2. Décisions actées (validées avec l'utilisateur)

| Axe | Décision |
|-----|----------|
| Type | Compétitif **PvP** — pas de coopératif |
| Périmètre | **Arène** : duel de groupes isolé. **Pas** d'invasion de donjon (sync de donjon hors-scope). |
| Connectivité | **En ligne** via Supabase Realtime (relais de messages, pas de logique serveur) |
| Formats | **1v1** (solo) **et 2v2** (duo) |
| Lancement | **Salon par code** + lien partageable. Pas de matchmaking public en V1. |

## 3. Contrainte structurante : aucune autorité serveur

Le client est statique (GitHub Pages) et Supabase Realtime n'est qu'un
**relais de messages** — il n'exécute aucune logique de jeu. Il n'existe
donc **aucun arbitre autoritaire**. Tout le moteur de combat tourne dans
un client JS librement inspectable/modifiable.

Spectre des modèles d'autorité :

| Modèle | Triche | Coût |
|--------|--------|------|
| Hôte autoritaire (un client fait foi) | L'hôte triche librement | Faible |
| **Lockstep déterministe** (on échange les *actions*, pas les résultats ; chaque client simule ; hash d'état comparé chaque tour) | Triche unilatérale → désync **détectée** ; collusion encore possible | Moyen |
| Edge Function Supabase arbitre | Vraie autorité | Élevé (porter le combat en Deno) |

**Choix V1 : lockstep déterministe.** Honnêteté assumée : ce modèle
convient pour **jouer entre amis**. Un **classement compétitif crédible**
exigerait l'Edge Function (Phase 3) — on ne promettra pas de ladder
« propre » sans elle.

## 4. Architecture réseau

### 4.1 Lockstep déterministe

- Au lancement, les deux clients échangent un **snapshot de groupe**
  (persos sérialisés : stats, équipement, sorts) et une **seed RNG**.
- Pendant le combat, on ne relaie **que les actions** choisies :
  `{ side, charIdx, action, targetIdx, spell }`. Chaque client rejoue
  l'action dans son propre moteur → les deux arrivent au même état.
- Fin de chaque tour : chaque client calcule un **hash d'état** (PV/PM/
  statuts/guardTurns/shieldTurns des deux groupes) et le diffuse. Hash
  divergent → **désync détectée** → match annulé proprement (message
  d'erreur, pas de résultat enregistré).

### 4.2 RNG déterministe (refactor préalable)

Le lockstep impose que tout aléa de **résolution de combat** soit
reproductible. Aujourd'hui `battle.js` / `battle-spells.js` appellent
`Math.random()` directement (crit, variance dégâts 0-3, esquive, riposte
de garde, crit de sort, chance d'application de statut).

Solution **non invasive pour le PvE** : introduire une abstraction
`combatRng()`.
- Mode PvE → délègue à `Math.random()` (comportement inchangé).
- Mode PvP → PRNG seedé (ex. mulberry32) initialisé sur la seed partagée.

Surface réduite : en PvP l'IA ennemie (`tryEnemyAbility`, AI de
`enemyTurn`) n'est **pas** utilisée — le « camp adverse » est humain.
Seul l'aléa des actions joueur doit être seedé.

### 4.3 Transport — Supabase Realtime

- Canal `pvp:<code>` par match. `broadcast` pour les messages,
  `presence` pour détecter connexion/déconnexion.
- L'**hôte** (créateur du salon) est le côté A : il génère la seed et
  tranche les égalités (ordre d'initiative déterministe via seed).
- Messages : `hello` (snapshot groupe), `ready`, `match_start` (seed),
  `action`, `state_hash`, `turn_timeout`, `forfeit`.
- PvP **exige** Supabase Realtime configuré et activé — pas de repli
  localStorage possible (contrairement au Hall of Fame). Si
  `HOF_CONFIG`/Realtime absent → bouton PvP désactivé avec message
  explicite.

## 5. Lancement d'un match (« comment lancer »)

Point ouvert tranché ici. **Salon par code**, robuste et sans compte :

```
Hub démarrage  →  bouton « Duel en ligne »
        ↓
#pvp-lobby-screen
  ├─ « Créer un salon »  → génère un code (6 car.), s'abonne à pvp:<code>,
  │                        affiche code + bouton Copier + lien partageable
  │                        (?pvp=<code>), état « en attente d'un adversaire »
  └─ « Rejoindre »       → saisie du code → s'abonne au canal
        ↓  (presence : 2 joueurs connectés)
Salle d'attente
  ├─ l'hôte choisit le format (1v1 / 2v2) ; l'invité s'aligne
  ├─ chaque joueur choisit ses héros (réutilise l'écran de sélection)
  ├─ échange des snapshots de groupe (message `hello`)
  └─ les deux pressent « Prêt » → l'hôte diffuse `match_start` + seed
        ↓
Combat PvP (overlay #encounter-overlay en mode pvp)
```

- **Lien partageable** : ouvrir `index.html?pvp=<code>` pré-remplit le
  code et bascule direct sur « Rejoindre ».
- Matchmaking public (file d'attente) → **Phase 4**, hors V1.

## 6. Intégration au moteur de combat

`battle.js` doit distinguer `battleMode ∈ {'pve','pvp'}` :

- **`startBattle`** PvP : `enemyGroup` ← snapshot du groupe adverse au
  lieu d'un tirage de monstres.
- **Ordre des tours** : alternance par camp. Camp A joue tous ses héros
  vivants → camp B joue les siens → boucle. Chaque joueur ne saisit que
  pour son camp ; les actions du camp distant arrivent par le réseau et
  sont rejouées via le **même chemin `battleAction`**.
- **`enemyTurn`** PvP : ne lance pas l'IA — attend/rejoue les actions
  réseau de l'adversaire.
- **`endBattle`** PvP : **pas** de XP / or / loot / points de Maison /
  progression de quête. Résolution = victoire/défaite seulement.
  Branche de sortie séparée (`endBattlePvp`).
- **Cycle de connexion** : turn timer (~60 s) → action par défaut /
  forfait ; déconnexion (`presence` leave) → victoire par forfait de
  l'adversaire ; fenêtre de reconnexion courte.

## 7. Équilibrage PvP (Phase 0)

Le combat PvE n'est pas équilibré pour du joueur-contre-joueur :
- `broom` (trinket) = fuite garantie → fuir un duel n'a pas de sens.
- Stun / fear en boucle → potentiel stun-lock oppressant en 1v1.
- `Avada` (sort de fin de partie), fontaines, scaling Ironman → hors
  cadre d'un duel équitable.

V1 a besoin d'un cadre : **niveau normalisé** (ex. tous les persos à un
palier fixe pour le duel) et/ou **liste d'objets/sorts bannis**. À
préciser avant la Phase 1.

## 8. Découpage en phases

### Phase 0 — Cadre d'équilibrage PvP
- Décider : niveaux normalisés ? items/sorts bannis ? format des groupes.
- verify : règles écrites et validées dans ce plan.

### Phase 1 — Refactor RNG déterministe
1. Helper `combatRng()` + PRNG seedé (mulberry32) → nouveau `js/rng.js`
   ou intégré à `battle.js`. verify : PvE inchangé (`node tests/smoke.js`).
2. Router les `Math.random()` de résolution de combat via `combatRng`.
   verify : un même seed → séquence identique (test unitaire ciblé).

### Phase 2 — Duel amical (lockstep, sans classement)
3. Module `js/pvp.js` : lobby (canal Supabase, presence, codes),
   handshake snapshots + seed.
4. Écran `#pvp-lobby-screen` dans `index.html` + entrée dans le hub.
5. `battleMode:'pvp'` dans `battle.js` : `startBattle`/`enemyTurn`/
   `endBattle` branchés réseau, alternance de camps.
6. Hash d'état + détection de désync ; turn timer + forfait.
7. Ajout au `MANIFEST` de `loader.js` des nouveaux globals.
8. verify : duel complet jouable entre deux onglets ; `node tests/smoke.js`
   vert ; scénario PvP ajouté au smoke test (même commit).

### Phase 3 — Ladder classé (optionnel, plus tard)
- Edge Function Supabase qui arbitre (rejoue la séquence d'actions avec
  la seed et valide le résultat) + table ELO. Précédent direct : le
  Hall of Fame Supabase.

### Phase 4 — Matchmaking public (optionnel)
- File d'attente publique au lieu du seul code de salon.

## 9. Fichiers concernés (prévisionnel)

| Fichier | Nature |
|---------|--------|
| `js/rng.js` (nouveau) | PRNG seedé + `combatRng()` |
| `js/pvp.js` (nouveau) | Lobby, canal Supabase, netcode lockstep, hash |
| `js/battle.js` | `battleMode`, alternance de camps, `endBattlePvp` |
| `js/battle-spells.js` | `Math.random()` → `combatRng` (résolution) |
| `index.html` | `#pvp-lobby-screen`, bouton hub, ordre de scripts |
| `js/save-ui.js` | Entrée « Duel en ligne » dans le hub démarrage |
| `js/loader.js` | `MANIFEST` : nouveaux globals |
| `tests/smoke.js` | Scénario PvP |
| `CLAUDE.md` | Section « Mode PvP » une fois livré |

## 10. Risques & questions ouvertes

- **Triche** : assumée en V1 (lockstep entre amis). Pas de classement
  crédible sans Phase 3.
- **Configuration Supabase** : Realtime doit être activé côté projet
  (distinct du REST du Hall of Fame) — à vérifier avec l'utilisateur.
- **Équilibrage** (Phase 0) : niveaux normalisés vs groupes « tels
  quels » — à trancher.
- **Désync** : un bug de non-déterminisme résiduel annule des matchs ;
  le hash par tour le rend visible mais il faudra du soin.

## 11. Hors-scope

- Coopératif, invasion de donjon, spectateur, chat, comptes joueurs.
- Matchmaking public (repoussé Phase 4).
- Classement ELO (repoussé Phase 3).

## 12. Suivi

- [x] Réflexion initiale — type (PvP), connectivité (Supabase Realtime),
      formats (1v1 + 2v2), lancement (salon par code).
- [ ] Phase 0 — cadre d'équilibrage PvP.
- [ ] Phase 1 — refactor RNG déterministe.
- [ ] Phase 2 — duel amical lockstep.
- [ ] Phase 3 — ladder classé (optionnel).
- [ ] Phase 4 — matchmaking public (optionnel).
