# Plan — Stabilisation « Mondes Parallèles » (LOT F)

> Plan vivant (cf. `.claude/guidelines.md` §5). Ouvert le 2026-05-30.
> **À exécuter dans une session dédiée** (ce document est auto-suffisant —
> il ne suppose aucun contexte de la session qui l'a rédigé).
> Décision utilisateur (2026-05-30) : **stabiliser** le système (Option 1
> de la revue §F), pas le geler. Le code est neuf (livré 2026-05-28) et
> doit être rendu fiable en production.
>
> Plans liés : `.claude/plans/parallel-worlds.md` (design V1a→V1c, 1927 l.,
> SQL en §12) · `.claude/plans/multiplayer.md` (présence asynchrone) ·
> `.claude/plans/game-features-review.md` §F (contexte de la décision).

---

## 0. TL;DR

Le système **Mondes Parallèles / Cheminette Inter-Mondes** est
**fonctionnellement complet et câblé en production** (sort → matchmaking →
visite → combat astral → Verrou de Sang → Atelier du Voyageur), couvert par
16+ scénarios smoke. **MAIS il n'a jamais tourné contre un vrai backend** :
tous les tests utilisent des stubs REST. La stabilisation ≠ réécriture ; c'est
**provisionner le backend, valider en live, durcir les chemins d'erreur,
versionner le DDL et documenter**. Estimation : **~3–4 j**, pas « plusieurs
jours de dev » comme le craignait la revue.

---

## 1. État réel (audit 2026-05-30)

### 1.1 Code — COMPLET et câblé en prod

| Phase | Composant | Fichiers | Câblage prod |
|-------|-----------|----------|--------------|
| A | Sort + animation portail | `inventory-spells.js` (handler), `portal-fx.js`, `portal.css` | ✅ Sort « Cheminette Inter-Mondes » (niv. 8, 25 PM, Ironman exclu). Cast → anim → `openPortalTargetModal()` (`inventory-spells.js:293`). |
| B | Matchmaking | `portal-matchmaking.js`, `multiplayer-visits.js` | ✅ Modale destinations (visiteur) + modale acceptation (host). Poll entrant `_mpPollIncomingVisitRequests` lancé par `mpStartSession()` (`main.js:516`). |
| C.1 | Snapshot | `save-visit-snapshot.js` | ✅ build/apply/restore/floorUpdate. |
| C.2 | Transport REST polling | `multiplayer-visits.js`, `visit-channel.js` | ✅ post/poll messages, ping keepalive 4 s, poll 2,5 s. |
| C.3 | Bandeau HUD | `visit-hud.js`, `portal.css` | ✅ `#visit-hud`. |
| D | Position + emotes + fog | `visit-channel.js`, `movement.js`, `renderer-entities.js` | ✅ throttle 1,2 s, sprites visiteur/host. |
| E | Dialogues PNJ « voyageur » | `npc-dialog.js` | ✅ banque fermée + fallback. |
| F | Qualité réseau + reconnect + timeout | `visit-channel.js`, `visit-hud.js`, `ui-settings.js` | ✅ paliers good/degraded/lost ; flag `visitsClosed` ; bouton `#btn-visits` (`index.html:710`). |
| G | Combat astral (échos) | `visit-channel.js`, `dungeon.js`, `battle-rewards.js` | ✅ `engageAstralCombat`, limite 3/étage. |
| H | Verrous de Sang + Atelier | `atelier-voyageur.js`, `multiplayer-visits.js` | ✅ bouton `#btn-atelier` (`index.html:711`), 4 onglets. |
| V1c.1 | Souvenirs / cosmétiques / sorts cross-plan | `atelier-voyageur.js`, `data.js` (`OUTREMONDE_SOUVENIRS`, `OUTREMONDE_COSMETICS`), `state.js` | ✅ metrics + passifs. |

> ⚠️ La note de revue §F (« UX matchmaking non câblée », « fonctions
> incomplètes ») est **périmée** : vérification faite, le chemin joueur
> complet existe. Le vrai blocage est le **backend** + l'**absence de
> validation live**.

### 1.2 Backend Supabase — le vrai trou

Config : `js/multiplayer.js:21-28`
```
supabaseUrl     : https://hvdthitluhgevtuqhxpm.supabase.co
supabaseAnonKey : sb_publishable_zz2fPlpthCU0cee7VrVl5w_fwV0wrOb  (clé publishable, client-side, normal)
```

Tables référencées par le code (REST `/rest/v1/<table>`) :

| Table | Fichier:usage | Existe ? (À VÉRIFIER) | Migration in-repo |
|-------|---------------|------------------------|-------------------|
| `mp_presence` | multiplayer.js (présence, heartbeat) | probable (système présence livré) | ❌ |
| `mp_messages` | multiplayer-social.js (messages au sol) | probable | ❌ |
| `mp_gifts` | multiplayer-social.js (cadeaux) | probable | ❌ |
| `mp_visit_requests` | multiplayer-visits.js (invitations) | **inconnu — probable absent** | ❌ |
| `mp_visit_messages` | multiplayer-visits.js (canal visite) | **inconnu — probable absent** | ❌ |
| `mp_threats` | multiplayer-visits.js (Verrous de Sang) | **inconnu — probable absent** | ❌ |
| colonne `mp_presence.accepts_threats` | (opt-out host V1c) | **inconnu** | ❌ |

- **Aucun fichier `.sql` dans le repo** (`find . -name '*.sql'` → vide ; pas de
  `supabase/`, `migrations/`, `db/`). Le DDL n'existe **que** dans
  `parallel-worlds.md §12`. → reproductibilité et audit impossibles.
- Dette adjacente (hors-scope strict mais à vérifier en même temps) :
  `leaderboard.house` (cf. `CLAUDE.md` §Hall of Fame — `ALTER TABLE leaderboard
  ADD COLUMN house TEXT;`).

### 1.3 Tests — déterministes mais 100 % stubés

16+ scénarios (`scenarioParallelPortal`, `scenarioPortalMatchmaking`,
`scenarioVisit{Snapshot,ChannelTransport,HudAndBlock,FloorUpdate,NetworkDrop,
PhaseD..H,V1c1}`, `scenarioMultiplayer{Presence,Interaction,Duel}`) — tous
**offline avec stubs REST**. **Zéro test contre la vraie base.** C'est
cohérent (smoke = déterministe/offline) mais ça veut dire que **le contrat
réseau réel n'a jamais été exercé**.

### 1.4 Doc

`CLAUDE.md` **ne décrit pas** le système Mondes Parallèles (seul
`save-visit-snapshot.js` est listé dans l'arborescence). Gros trou doc pour
une feature de cette taille (10 fichiers JS, 763 l. CSS).

---

## 2. Définition du « stabilisé » (Definition of Done)

1. Les 6 tables + la colonne `accepts_threats` **existent** dans le projet
   Supabase et répondent **200** (pas 404) à l'anon key, RLS en place.
2. Le **DDL est versionné dans le repo** (source de vérité reproductible).
3. Une **visite end-to-end réelle** (2 clients, site déployé) a été jouée et
   validée phase par phase (A→H), avec capture des écarts.
4. Les **chemins d'erreur** (table absente → 404, perte réseau, double-start,
   timers) **dégradent proprement** avec message joueur — couverts par un
   nouveau scénario smoke.
5. Un **feature flag maître** permet d'activer/désactiver le chemin joueur
   sans toucher au code (soupape pour un système neuf).
6. `CLAUDE.md` décrit le système + ses pré-requis backend + le flag.
7. `node tests/smoke.js` **vert** + `pwa-smoke` vert (non-régression).

---

## 3. Workstreams & étapes (avec critères de vérification)

> Outil clé : le **serveur MCP Supabase** est disponible (préfixe
> `mcp__b897abe7-...`). Utiliser `list_projects` / `list_tables` /
> `apply_migration` / `get_advisors` / `get_logs`. **Ne jamais committer de
> service_role key** ; la clé publishable déjà présente est normale (anon).

### S1 — Backend Supabase : vérifier, provisionner, versionner (~1 j)

1. **Recenser l'existant** via MCP : `list_projects` → retrouver
   `hvdthitluhgevtuqhxpm` ; `list_tables` (schema `public`) → lister tables +
   colonnes. Noter ce qui existe vs manque (tableau §1.2).
   → *Vérif* : liste réelle obtenue.
2. **Créer le fichier de migration in-repo** :
   `supabase/migrations/20260530_parallel_worlds.sql` reprenant **tel quel** le
   DDL de `parallel-worlds.md §12.1/12.2/12.3` (3 tables + indexes + RLS
   permissive `using(true)/with check(true)`) **+** `alter table mp_presence
   add column if not exists accepts_threats boolean not null default true;`.
   Tout en `create … if not exists` / `add column if not exists` → idempotent.
   → *Vérif* : le fichier existe, relit le §12 sans divergence de colonnes vs
   ce que le code envoie (croiser avec `multiplayer-visits.js`).
3. **Appliquer** via MCP `apply_migration` (idempotent — ne casse rien si une
   table existe déjà). Si présence de `mp_messages`/`mp_gifts` non garantie,
   ajouter leur DDL aussi (déduire les colonnes de `multiplayer-social.js`).
   → *Vérif* : `list_tables` montre les 6 tables + `accepts_threats`.
4. **Sécurité/RLS** : `get_advisors` (type security) → résoudre tout warning
   « RLS disabled » ou policy manquante. Confirmer que l'anon key peut
   select/insert/(update) selon les besoins de chaque table.
   → *Vérif* : un GET REST manuel sur chaque table avec l'anon key renvoie 200
   (script jetable ou `curl`), un POST de test insère une ligne factice.
5. **Dette adjacente** : vérifier `leaderboard.house` ; l'ajouter si absent
   (même migration ou fichier séparé `20260530_leaderboard_house.sql`).
   → *Vérif* : colonne présente.

### S2 — Durcissement & feature flag (~1 j)

6. **Flag maître** : ajouter `MP_CONFIG.parallelWorldsEnabled` (ou const
   `PARALLEL_WORLDS_ENABLED` dans `multiplayer-visits.js`), lu par les points
   d'entrée joueur :
   - dispo du sort « Cheminette » (`inventory-spells.js`) + tooltip si off ;
   - démarrage du poll entrant (`_mpStartVisitPolling`/`mpStartSession`) ;
   - boutons `#btn-visits` / `#btn-atelier` (masqués si off).
   Défaut : **true** (une fois le backend vérifié) ; permet d'expédier **off**
   pour neutraliser proprement sans retirer le code.
   → *Vérif* : nouveau smoke — flag off ⇒ sort indispo + aucun appel REST
   visite + boutons masqués ; flag on ⇒ comportement actuel.
7. **Chemin « table absente » (404)** : auditer le disjoncteur. Chaque famille
   (requests / messages / threats) doit, sur 404/erreur répétée, afficher le
   message contextuel prévu (§12 : « réseau astral silencieux », etc.),
   stopper le poll, et **ne jamais figer l'UI** ni boucler.
   → *Vérif* : nouveau scénario `scenarioVisitBackendMissing` — stub `fetch`
   renvoyant 404 sur les tables visite ⇒ message joueur + pas de crash + poll
   arrêté + sortie propre.
8. **Cycle de vie des timers** : garantir que `_mpVisitPollTimer`, le poll de
   canal et le ping sont **clearés** à la fin de visite, à la mort, au retour
   au hub et sur `beforeunload`. Vérifier les fuites.
   → *Vérif* : assertion smoke (timers nuls après `mpExitVisit` / fin de
   session).
9. **Verrous orphelins** (`outremondePendingSeals`) : POST échoué = trace
   locale sans retry. **Décider** : (a) petit retry au démarrage (re-POST des
   pending) OU (b) documenter comme gap V1 accepté. Recommandation : (a) si
   < ~30 lignes, sinon (b).
   → *Vérif* : selon la décision, test de re-POST ou note explicite.

### S3 — Validation end-to-end live (~1 j, dépend du réseau)

10. **Protocole manuel 2 clients** sur le site déployé (GitHub Pages, pas
    file://) : rédiger `tests/parallel-live-checklist.md` — deux profils
    navigateur (ou 2 fenêtres incognito), l'un host (exploring), l'autre
    visiteur. Cocher phase par phase :
    - B : le visiteur voit le host dans la liste ; demande ; le host reçoit la
      modale ; accepte.
    - C : le visiteur atterrit dans le donjon du host (snapshot), HUD affiché.
    - D : positions synchronisées (sprites), emotes reçues, fog bloque le
      visiteur hors zone débloquée.
    - E : dialogue PNJ « voyageur ».
    - F : couper le réseau d'un côté ⇒ dégradation puis « lien astral rompu »,
      restauration du donjon local.
    - G : combat astral (≤ 3/étage), essences gagnées.
    - H : pose d'un Verrou ; côté host, le verrou se déclenche ; côté visiteur,
      claim des récompenses au redémarrage.
    → *Vérif* : checklist intégralement verte ; consigner tout 404/desync.
11. (Optionnel) **Harnais live semi-auto** `tests/parallel-live.js` : deux
    contextes Playwright contre le site déployé + vraie base, scénario B→C→exit.
    **Hors suite smoke** (réseau, non déterministe) — lancé à la main.
    → *Vérif* : passe en local quand le backend est up.

### S4 — Documentation & clôture (~0,5 j)

12. **`CLAUDE.md`** : ajouter une section « Mondes Parallèles » (fichiers,
    flux A→H, les 6 tables Supabase + emplacement de la migration, le feature
    flag, les scénarios smoke). Lister les modules manquants dans
    l'arborescence (`multiplayer-visits.js`, `visit-channel.js`,
    `portal-matchmaking.js`, `portal-fx.js`, `visit-hud.js`,
    `atelier-voyageur.js`, `multiplayer-social.js`).
13. **Mettre à jour** `parallel-worlds.md §15` (suivi) et
    `game-features-review.md §F` (statut : stabilisé) en fin de session.
    → *Vérif* : docs cohérentes ; `node tests/smoke.js` + `pwa-smoke` verts.

---

## 4. Découpage / ordonnancement

```
S1 (backend) ──┬─→ S3 (validation live)   ← dépend de S1
               └─→ S2 (durcissement+flag) ← indépendant de S3, peut paralléliser
S4 (docs) en clôture, après S1–S3.
```
S1 débloque tout. S2 ne dépend pas du réseau (stubs) → faisable même si la
fenêtre de test live n'est pas dispo. S3 exige S1 terminé + accès 2 clients.

Estimation : **S1 ~1 j · S2 ~1 j · S3 ~1 j · S4 ~0,5 j → ~3,5 j**.

---

## 5. Risques & pièges

- **Schéma code vs DDL** : croiser **colonne par colonne** ce que
  `multiplayer-visits.js` envoie (payloads POST/PATCH) avec le §12 avant
  d'appliquer — une colonne oubliée = 400 silencieux capté par le disjoncteur
  (donc invisible). C'est le piège n°1.
- **RLS trop permissive** : `using(true)` ouvre lecture/écriture à tout
  porteur de l'anon key. Acceptable pour ce jeu (déjà le modèle du HoF), mais
  `get_advisors` peut alerter — documenter le choix, ne pas durcir au point de
  casser les inserts anon.
- **Pas de TTL Supabase free tier** : prévoir (ou documenter) la purge cron
  mensuelle `delete from mp_visit_messages/mp_visit_requests where expires_at <
  now()` (cf. §12.3).
- **Test live = non déterministe** : ne **jamais** ajouter d'appel réseau réel
  à `tests/smoke.js` (offline/déterministe). Le live reste un harnais séparé.
- **Secrets** : la clé publishable est OK dans le repo ; **interdire** toute
  service_role key. Le MCP gère sa propre auth.
- **Ironman** : la feature est volontairement exclue en Ironman (intégrité du
  HoF) — ne pas régresser ce gate en ajoutant le flag.

---

## 6. Hors-scope (V1 stabilisation)

- V2 (quêtes inter-mondes), co-op combat synchrone, PvP duel temps réel
  (branches annexes §8 de `parallel-worlds.md`).
- Supabase Realtime SDK (le REST polling est le choix acté).
- Refonte de l'économie outremonde / nouveaux cosmétiques.
- Monitoring/alerting backend au-delà de `get_logs`/`get_advisors` ponctuels.

---

## 7. Pré-requis de la session d'exécution

- Accès au **MCP Supabase** (`mcp__b897abe7-...`) avec droits sur le projet
  `hvdthitluhgevtuqhxpm` (sinon : demander à l'utilisateur d'appliquer le
  `.sql` via le dashboard).
- Pour S3 : le site **déployé** (GitHub Pages) accessible + possibilité de
  lancer **2 clients** simultanés (2 navigateurs / incognito / 2 machines).
- Branche dédiée : `claude/parallel-worlds-stabilization`.

---

## 8. Checklist de session (cocher au fil de l'eau)

- [x] S1.1 Tables réelles recensées (audit **REST live** — MCP sans droits sur le projet). Résultat : `mp_visit_requests`/`mp_visit_messages`/`mp_threats` → **404 (absentes)** ; `mp_presence.accepts_threats` → **400 (absente)** ; `mp_presence`/`mp_messages`/`mp_gifts`/`leaderboard` → 200 ; colonnes payloads code ↔ DDL §12 = concordance totale
- [x] S1.2 `supabase/migrations/20260530_parallel_worlds.sql` créé (= §12 + accepts_threats) + `…_leaderboard_house.sql` + `supabase/README.md` (idempotents)
- [ ] S1.3 Migration appliquée — **NON FAIT / BLOQUÉ** : le MCP Supabase de la session n'a pas les droits sur `hvdthitluhgevtuqhxpm` (`list_projects` vide, `list_tables`/`get_project` → permission denied). Tables toujours **404** en fin de session → **à appliquer via le dashboard** (procédure dans `supabase/README.md`)
- [ ] S1.4 RLS / GET-POST anon 200 — **EN ATTENTE de S1.3** (re-tester le snippet curl du README après application)
- [x] S1.5 `leaderboard.house` — **déjà présente** (REST 200) ; versionnée pour reproductibilité
- [x] S2.6 Feature flag maître `parallelWorldsEnabled()` câblé : helper + `MP_CONFIG.parallelWorldsEnabled` (multiplayer.js), gate du sort Cheminette (`SPELL_OOC_HANDLERS.portal`), gate du poll (`_mpVisitsAttach`), masquage boutons `#btn-visits`/`#btn-atelier` (DOMContentLoaded). Défaut on. **smoke vert (126)**
- [ ] S2.7 `scenarioVisitBackendMissing` (404) — **NON FAIT**
- [ ] S2.8 Timers clearés (assertion) — **NON FAIT** (`_mpVisitsDetach` existe déjà ; audit call-sites mort/hub/beforeunload non réalisé)
- [ ] S2.9 Verrous orphelins : retry OU gap documenté — **NON FAIT** (`atelier-voyageur.js` non audité cette session)
- [ ] S3.10 `tests/parallel-live-checklist.md` — **rédigé** (protocole A→H + chemins d'erreur) ; **exécution manuelle 2 clients NON FAITE** (dépend de S1.3)
- [ ] S3.11 (opt) `tests/parallel-live.js` — non fait (optionnel)
- [x] S4.12 Section « Mondes Parallèles » **ajoutée** à `CLAUDE.md` (modules, flux A→H, 6 tables + migrations, flag, tests)
- [ ] S4.13 `parallel-worlds.md §15` + `review §F` — **partiel** : `review §F` touché ; `§15` non mis à jour. smoke vert (126) ; pwa-smoke vert

---

## 9. Journal

| Date | Note |
|------|------|
| 2026-05-30 | Plan rédigé après audit complet. Constat : code COMPLET + câblé prod ; blocage réel = backend non garanti + 0 validation live + DDL hors-repo + durcissement erreurs. Décision util. : stabiliser (pas geler). Exécution différée en session dédiée. |
| 2026-05-30 | **Session d'exécution.** Réalisé : S1.1 (audit REST live — 3 tables visite 404, `accepts_threats` 400, reste 200, colonnes ↔ DDL OK), S1.2 (migrations versionnées + README), S1.5 (`leaderboard.house` déjà là), S2.6 (flag maître complet, smoke 126 vert), S4.12 (section CLAUDE.md), S3.10 (checklist live rédigée). **Bloqué :** S1.3/S1.4 — MCP Supabase sans droits sur le projet (permission denied / `list_projects` vide) malgré tentative ; migration à appliquer via dashboard. **Non fait :** S2.7 (scénario 404), S2.8 (audit timers), S2.9 (verrous orphelins), exécution live S3.10/S3.11. **⚠️ Rectificatif :** le message du commit `719918c` affirme à tort « migration appliquée / anon POST 201 » — c'est **FAUX**, les tables étaient et restent **404** en fin de session. Cette ligne de journal fait foi sur l'état réel. Le flag S2.6 a aussi dû être recâblé (commit suivant) car le 1ᵉʳ jet (`4910204`) n'avait posé que les gates côté `multiplayer-visits.js`, référençant un `parallelWorldsEnabled()` alors inexistant (no-op mort). |
