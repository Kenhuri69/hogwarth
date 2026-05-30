# Checklist de validation live — Mondes Parallèles (S3.10)

> Protocole manuel **2 clients** contre le site déployé + la vraie base
> Supabase (PAS `file://`, PAS la suite smoke offline). Plan :
> `.claude/plans/parallel-worlds-stabilization.md` §3 S3.10.

## Pré-requis

- [ ] Backend provisionné (S1) : `mp_visit_requests`, `mp_visit_messages`,
      `mp_threats` → REST 200 ; `mp_presence.accepts_threats` → 200.
      (Vérif : snippet curl de `supabase/README.md`.)
- [ ] Site déployé accessible : https://kenhuri69.github.io/hogwarth/
- [ ] `MP_CONFIG.parallelWorldsEnabled === true` (défaut).
- [ ] 2 clients indépendants : 2 navigateurs **ou** 2 fenêtres incognito
      **ou** 2 machines. Nommer un client **HOST**, l'autre **VISITEUR**.
- [ ] Aucun des deux en **Ironman** (la feature est exclue en Ironman).
- [ ] Les deux ont choisi une Maison et explorent (status `exploring`).

## Phase B — Matchmaking

- [ ] VISITEUR lance le sort **Cheminette Inter-Mondes** (niv. 8, 25 PM) →
      animation portail → modale de destinations.
- [ ] HOST apparaît dans la liste (mode normal, exploring, récent).
- [ ] VISITEUR envoie une demande → HOST reçoit la **modale d'acceptation**
      (≤ 30 s).
- [ ] HOST **accepte** → un `channel_id` est généré.
- [ ] Cas refus : HOST refuse → VISITEUR voit le refus, sort proprement.
- [ ] Cas opt-out : HOST a coupé l'accueil (`#btn-visits` / `visitsClosed`)
      → la demande est auto-refusée, pas de modale côté HOST.

## Phase C — Snapshot & atterrissage

- [ ] VISITEUR atterrit dans le **donjon du HOST** (étage, layout, fog du
      snapshot reçu via `mp_visit_messages` type `snapshot`).
- [ ] Bandeau **#visit-hud** affiché côté VISITEUR.
- [ ] Si le snapshot n'arrive jamais (table absente) : VISITEUR **sort au
      timeout** avec message, retour au donjon local (pas de blocage).

## Phase D — Position, emotes, fog

- [ ] Sprites synchronisés : HOST voit le sprite visiteur, VISITEUR voit le
      sprite host (throttle ~1,2 s).
- [ ] Emotes émises d'un côté reçues de l'autre.
- [ ] Le **fog** bloque le VISITEUR hors des zones débloquées par le HOST.

## Phase E — Dialogue PNJ « voyageur »

- [ ] VISITEUR parle à un PNJ → banque de dialogues « voyageur »
      (ou fallback) s'affiche correctement.

## Phase F — Qualité réseau / reconnect / timeout

- [ ] Couper le réseau d'un côté → l'autre voit la **dégradation**
      (good → degraded → lost).
- [ ] Au-delà du seuil : message **« lien astral rompu »**, restauration
      propre du donjon local (pas de figeage, pas de boucle).
- [ ] Rétablir le réseau avant le seuil → reconnexion silencieuse.

## Phase G — Combat astral (échos)

- [ ] VISITEUR engage un **combat astral** (écho) → limite **≤ 3 / étage**
      respectée.
- [ ] Récompenses (essences) créditées côté VISITEUR.

## Phase H — Verrous de Sang + Atelier

- [ ] VISITEUR pose un **Verrou de Sang** (`mp_threats` status `pending`).
- [ ] HOST, à l'entrée de l'étage concerné, **déclenche** le verrou
      (combat) ; le status passe `resolved`/`fled`.
- [ ] VISITEUR, au redémarrage, **claim** la récompense (modale) ; le
      verrou passe `claimed_at`.
- [ ] **#btn-atelier** : les 4 onglets de l'Atelier du Voyageur s'ouvrent
      et reflètent les metrics/souvenirs/cosmétiques/sorts cross-plan.

## Chemins d'erreur (rappel — disjoncteurs déjà codés)

- [ ] Forcer une table absente (renommer côté base en staging) → message
      contextuel, poll stoppé, sortie propre. (cf. disjoncteurs
      `_mpVisitTableMissing` / `_mpVisitMsgTableMissing` /
      `_mpThreatsTableMissing` dans `multiplayer-visits.js`.)

## Consignation

> Noter ici tout 404 inattendu, desync, fuite de timer, ou message manquant,
> avec client/phase/horodatage.

| Phase | Client | Constat | Sévérité |
|-------|--------|---------|----------|
|       |        |         |          |
