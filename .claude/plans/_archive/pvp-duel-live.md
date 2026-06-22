# Plan — Duel PvP en direct (tours relayés) — reliquat 4.1

> Reliquat **4.1** du backlog. Le duel PvP **asynchrone** (défier le snapshot/
> fantôme d'un autre joueur, IA) est **déjà livré et testé** (`mpStartDuel`,
> `_mpHeroToEnemy`, `scenarioMultiplayerDuel`). Ce plan livre la variante
> **live/temps réel** demandée : deux joueurs EN LIGNE s'affrontent en **tours
> alternés relayés** via le canal REST existant. Choix validé avec l'utilisateur
> (vs lockstep+RNG déterministe, écarté : inadapté au polling 2,5 s).

## Principe — résolution « attaquant autoritaire » (pas de lockstep)
Chaque joueur résout **sa propre action** localement (son RNG, son crit, ses
dégâts) et **relaye le RÉSULTAT chiffré** à l'autre client, qui l'applique tel
quel. Aucune RNG partagée, aucune réconciliation : les deux écrans restent
synchronisés **par construction** (l'attaquant envoie le nombre final ; le
défenseur n'applique aucune mitigation de son côté).

## Réutilisation (zéro nouvelle dépendance, zéro migration DB)
- **Transport** : `mpPostVisitMessage(channelId, sender, type, payload)` +
  `mpPollVisitMessages(channelId, since, excludeSender)` (`multiplayer-visits.js`).
- **Canal & rôle** : le duel se lance **depuis une visite inter-mondes active**
  (visiteur↔host partagent déjà un `channel_id`). Lu via `_visitGetState()`
  (`visit-channel.js`) → `{role:'visitor'|'host', channelId}`. `sender` du duel
  = rôle de visite.
- **Snapshot combattant** : `mpBuildSnapshot()` (multiplayer.js) — on prend le
  **héros de tête** (`heroes[0]`) pour un duel **1v1**.
- **Maths pures** : `mitigatedDamage` (battle.js:18), `spellDamage`/`healAmount`/
  `rollSpellCrit` (battle-spells.js). Aucune entrée dans la boucle `battle.js`.

## Architecture — module autonome `js/pvp-duel.js`
Surface de combat **dédiée** (overlay `#pvp-duel-overlay`), pas d'intrication
avec la boucle IA de `battle.js` (zéro risque de régression PvE). Machine à
états : `idle → inviting/invited → fighting (turn me|opp) → ended`.

### Types de messages (sur le canal de visite)
| type | sens | payload |
|------|------|---------|
| `duelInvite` | A→B | `{name, combatant}` (combattant de A) |
| `duelAccept` | B→A | `{name, combatant}` (combattant de B) → démarre |
| `duelDecline`| B→A | `{}` |
| `duelAction` | tour | `{kind:'attack'|'spell'|'heal', dmgToOpp, healSelf, crit, spell, casterSpAfter, note}` puis fin de tour |
| `duelEnd` | perdant→ | `{loser:<role>}` (le client à 0 PV le déclare) |
| `duelQuit` | abandon | `{}` |

### Règles MVP (volontairement borné — cf. « Hors-scope »)
- **1v1** héros de tête vs héros de tête.
- Actions : **Attaquer**, **Sortilège offensif** (coût PM), **Sortilège de soin**.
  Pas de Garde/bouclier (poserait un problème de mitigation côté défenseur),
  pas d'objets, pas de statuts complexes — **différés V2**.
- Ordre des tours : **l'invitant joue en premier**.
- **Enjeu cosmétique** (amical) : message/narratif de victoire. Pas d'or/XP/
  permadeath/anti-triche (cohérent avec « pas de classement PvP » du design).
- **Timeout** : pas de message adverse > 30 s → forfait, retour à la visite.
- Derrière `parallelWorldsEnabled()` ; disponible **uniquement** en visite active.

## Étapes → vérification
1. [x] `js/pvp-duel.js` : état + machine + helpers purs de combat (résolution
   d'action, build combattant depuis snapshot). → vérif : chargé, globals au
   MANIFEST loader. ✅
2. [x] Transport duel : poll dédié (curseur propre `_duelLastIso`, sans
   consommer le poll de visite), dispatch par type, post des actions. → vérif :
   smoke transport stubbé. ✅
3. [x] Résolution d'action attaquant-autoritaire + application des messages
   reçus + condition de victoire (PV ≤ 0). → vérif : invariant de synchro
   (HP miroir) dans le smoke. ✅
4. [x] UI : overlay `#pvp-duel-overlay` (2 cartes combattants + barres + log +
   boutons de tour), `css/pvp-duel.css`. Bouton « ⚔️ Provoquer en duel » dans
   le HUD de visite. → vérif : invite→accept→tours→fin jouable. ✅
5. [x] Câblage : `index.html` (script+css+overlay, `?v=1`), MANIFEST loader,
   masquage si flag off / hors visite. ✅
6. [x] `scenarioPvpDuel` (modèle `scenarioVisitChannelTransport`, stubs REST) :
   invite → accept → 2 tours → KO → fin. → vérif : `node tests/smoke.js pvp`. ✅
7. [x] Bump cache PWA (skill `cache-bump`) + `node tests/smoke.js` complet.
   ✅ loader v37→38, visit-channel v8→9, pvp-duel(.js/.css) v1, CACHE_VERSION
   v108→109 ; units 442 ✓, smoke 195 ✓, pwa-smoke ✓ (cache hogwarth-v109).
8. [x] Marquer 4.1 clos (variante live livrée) dans `reliquats-backlog.md`. ✅

## Hors-scope (différé V2, documenté)
Garde/bouclier & statuts en duel, objets consommables, duel multi-héros (2v2),
matchmaking de duel **hors visite** (défi direct depuis le fantôme en ligne),
persistance d'un score/compteur de victoires, classement/ELO.
