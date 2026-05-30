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

## Tables (état audit REST live 2026-05-30)

| Table | État | Provisionnée par |
|-------|------|------------------|
| `mp_presence` | ✅ existe | (livrée — système présence) |
| `mp_messages` | ✅ existe | (livrée — multiplayer-social) |
| `mp_gifts` | ✅ existe | (livrée — multiplayer-social) |
| `leaderboard` | ✅ existe | (livrée — Hall of Fame) |
| `leaderboard.house` | ✅ existe | `20260530_leaderboard_house.sql` |
| `mp_visit_requests` | ⛔ à créer (404) | `20260530_parallel_worlds.sql` |
| `mp_visit_messages` | ⛔ à créer (404) | `20260530_parallel_worlds.sql` |
| `mp_threats` | ⛔ à créer (404) | `20260530_parallel_worlds.sql` |
| `mp_presence.accepts_threats` | ⛔ à créer (400) | `20260530_parallel_worlds.sql` |

## Comment appliquer

Le serveur MCP de cette session n'a pas les droits d'écriture sur ce projet.
Appliquer manuellement via le **dashboard Supabase** :

1. Dashboard → projet `hvdthitluhgevtuqhxpm` → **SQL Editor**.
2. Coller le contenu de `migrations/20260530_parallel_worlds.sql`, exécuter.
3. Idem pour `migrations/20260530_leaderboard_house.sql` (no-op si déjà là).
4. Vérifier : **Table Editor** doit lister les 3 nouvelles tables, et
   `mp_presence` doit porter la colonne `accepts_threats`.

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

## Purge (pas de TTL automatique en free tier)

Job cron mensuel recommandé (cf. `parallel-worlds.md §12.3`) :

```sql
delete from public.mp_visit_messages where expires_at < now();
delete from public.mp_visit_requests where expires_at < now();
```
