# Supabase — schéma backend (source de vérité versionnée)

Ce dossier versionne le DDL des tables Supabase consommées par le jeu via
l'API REST (`/rest/v1/<table>`) avec la clé **publishable** (anon, normale
côté client). Aucune `service_role` key ne doit figurer ici.

Projet : `hvdthitluhgevtuqhxpm` (org « Kenhuri69's Org »).

## Migrations

| Fichier | Contenu |
|---------|---------|
| `migrations/20260530_parallel_worlds.sql` | 3 tables visites (`mp_visit_requests`, `mp_visit_messages`, `mp_threats`) + colonne `mp_presence.accepts_threats`. |
| `migrations/20260530_leaderboard_house.sql` | Colonne `leaderboard.house` (Hall of Fame). |

Toutes les migrations sont **idempotentes** (`create … if not exists`,
`add column if not exists`, `drop policy if exists` avant `create policy`)
— ré-exécutables sans casser l'existant.

## Tables (état au 2026-05-30 — migration appliquée)

`20260530_parallel_worlds.sql` a été **appliquée** le 2026-05-30 (via MCP
`apply_migration`). Les 7 tables répondent 200 en REST anon ; `list_tables`
les confirme toutes RLS activée.

| Table | État | Provisionnée par |
|-------|------|------------------|
| `mp_presence` | ✅ existe | (livrée — système présence) |
| `mp_messages` | ✅ existe | (livrée — multiplayer-social) |
| `mp_gifts` | ✅ existe | (livrée — multiplayer-social) |
| `leaderboard` | ✅ existe | (livrée — Hall of Fame) |
| `leaderboard.house` | ✅ existe | `20260530_leaderboard_house.sql` |
| `mp_visit_requests` | ✅ créée | `20260530_parallel_worlds.sql` |
| `mp_visit_messages` | ✅ créée | `20260530_parallel_worlds.sql` |
| `mp_threats` | ✅ créée | `20260530_parallel_worlds.sql` |
| `mp_presence.accepts_threats` | ✅ ajoutée | `20260530_parallel_worlds.sql` |

## Comment (ré)appliquer

Les migrations sont idempotentes — sûres à ré-exécuter. Deux voies :

- **MCP** (droits requis sur le projet) : `apply_migration` avec le contenu
  du fichier `.sql`.
- **Dashboard Supabase** (repli) :
  1. Dashboard → projet `hvdthitluhgevtuqhxpm` → **SQL Editor**.
  2. Coller `migrations/20260530_parallel_worlds.sql`, exécuter.
  3. Idem `migrations/20260530_leaderboard_house.sql` (no-op si déjà là).
  4. **Table Editor** doit lister les 3 tables visite + `mp_presence.accepts_threats`.

### Vérification rapide (REST, depuis un shell)

```bash
URL=https://hvdthitluhgevtuqhxpm.supabase.co
KEY=sb_publishable_zz2fPlpthCU0cee7VrVl5w_fwV0wrOb   # publishable, OK en clair
for t in mp_visit_requests mp_visit_messages mp_threats; do
  curl -s -o /dev/null -w "$t -> %{http_code}\n" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/$t?select=*&limit=1"
done
# Attendu : 200 partout (404 = table absente)
curl -s -o /dev/null -w "accepts_threats -> %{http_code}\n" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$URL/rest/v1/mp_presence?select=accepts_threats&limit=1"
# Attendu : 200 (400 = colonne absente)
```

## RLS

Policies permissives `using (true) / with check (true)` — cohérent avec le
modèle anon-key déjà utilisé par le Hall of Fame. `get_advisors` peut
signaler une RLS « trop ouverte » : c'est un choix assumé pour ce jeu sans
comptes utilisateurs (cf. plan §5).

### Posture de sécurité (à garder en tête)

La clé `sb_publishable_*` est **publique par conception** : elle est
embarquée en clair dans `js/multiplayer.js` (et reproduite ici pour les
checks REST). Elle n'est donc PAS un secret — la chercher dans le dépôt
n'apporte aucun privilège. **La seule frontière de sécurité est la RLS
côté serveur.** Conséquences à respecter :

- **N'écrire aucune donnée sensible** dans ces tables (pas d'e-mail, pas
  de token, pas d'identifiant durable). Le contenu est lisible et
  inscriptible par n'importe quel client anonyme — c'est intentionnel.
- Tout champ reçu d'une de ces tables est **non fiable** : le client
  l'échappe (`_esc`) avant injection HTML. Couvert par
  `tests/units.js §4` (verrou anti-XSS sur les `_esc` de visite).
- Si une table devait un jour porter une donnée à protéger, il faudrait
  d'abord introduire un vrai modèle d'auth (hors scope actuel) — ne pas
  se reposer sur l'obscurité de la clé.

### Disjoncteur côté client (404)

Le client traite un **404** sur une table comme « fonctionnalité
indisponible » et la désactive **pour le reste de la session** (flags
`_mp*TableMissing` dans `multiplayer-visits.js`, helper
`parallelWorldsEnabled()`). Ces flags ne sont **pas ré-armés à chaud** :
une table qui revient en ligne n'est reprise qu'au prochain rechargement
de page. C'est volontaire (échec franc plutôt que retries en boucle) — si
une reprise à chaud devient nécessaire, la prévoir explicitement.

## Purge (pas de TTL automatique en free tier)

Job cron mensuel recommandé (cf. `parallel-worlds.md §12.3`) :

```sql
delete from public.mp_visit_messages where expires_at < now();
delete from public.mp_visit_requests where expires_at < now();
```
