-- ============================================================
-- Migration : Mondes Parallèles / Cheminette Inter-Mondes (LOT F)
-- Date      : 2026-05-30
-- Plan      : .claude/plans/parallel-worlds-stabilization.md (S1)
-- Source    : .claude/plans/parallel-worlds.md §12 (source de vérité du DDL)
-- ------------------------------------------------------------
-- Provisionne les 3 tables manquantes du système de visites inter-mondes
-- + la colonne `accepts_threats` sur mp_presence (opt-out host V1c).
--
-- Tables PRÉ-EXISTANTES dans le projet (NE PAS recréer ici) :
--   mp_presence, mp_messages, mp_gifts, leaderboard.
--
-- Audit REST live 2026-05-30 (clé publishable anon) :
--   mp_visit_requests  -> 404 (absente)   ← créée ici
--   mp_visit_messages  -> 404 (absente)   ← créée ici
--   mp_threats         -> 404 (absente)   ← créée ici
--   mp_presence.accepts_threats -> 400 (colonne absente) ← ajoutée ici
--
-- Idempotent : `create table if not exists`, `add column if not exists`,
-- `drop policy if exists` avant chaque `create policy` (CREATE POLICY
-- ne supporte pas IF NOT EXISTS). Ré-exécutable sans casser l'existant.
--
-- Colonnes croisées une à une avec les payloads POST/PATCH/SELECT de
-- js/multiplayer-visits.js (cf. plan §5, risque n°1) — concordance totale.
-- ============================================================

-- ------------------------------------------------------------
-- 12.1 — Table d'invitation de visite (V1a Phase B)
-- ------------------------------------------------------------
create table if not exists public.mp_visit_requests (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    text not null,
  visitor_name  text not null,
  visitor_house text,
  visitor_level int not null default 1,
  host_id       text not null,
  status        text not null default 'pending', -- pending|accepted|refused|expired
  channel_id    text,                            -- rempli à l'acceptation
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  expires_at    timestamptz not null default (now() + interval '60 seconds')
);
alter table public.mp_visit_requests enable row level security;
drop policy if exists "mp_visit_requests_read"   on public.mp_visit_requests;
drop policy if exists "mp_visit_requests_insert" on public.mp_visit_requests;
drop policy if exists "mp_visit_requests_update" on public.mp_visit_requests;
create policy "mp_visit_requests_read"   on public.mp_visit_requests for select using (true);
create policy "mp_visit_requests_insert" on public.mp_visit_requests for insert with check (true);
create policy "mp_visit_requests_update" on public.mp_visit_requests for update using (true) with check (true);
create index if not exists mp_visit_requests_host_idx
  on public.mp_visit_requests (host_id, status, expires_at);

-- ------------------------------------------------------------
-- 12.3 — Table canal de visite (V1a Phase C.2)
-- ------------------------------------------------------------
create table if not exists public.mp_visit_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  text not null,                     -- UUID partagé via mp_visit_requests.channel_id
  sender      text not null,                     -- 'host' | 'visitor'
  type        text not null,                     -- 'snapshot' | 'hostPosition' | 'position' | 'bye' | …
  payload     jsonb,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '15 minutes')
);
alter table public.mp_visit_messages enable row level security;
drop policy if exists "mp_visit_messages_read"   on public.mp_visit_messages;
drop policy if exists "mp_visit_messages_insert" on public.mp_visit_messages;
create policy "mp_visit_messages_read"   on public.mp_visit_messages for select using (true);
create policy "mp_visit_messages_insert" on public.mp_visit_messages for insert with check (true);
create index if not exists mp_visit_messages_channel_idx
  on public.mp_visit_messages (channel_id, created_at);

-- ------------------------------------------------------------
-- 12.2 — Table Verrou de Sang (V1c Phase H)
-- ------------------------------------------------------------
create table if not exists public.mp_threats (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    text not null,
  visitor_name  text not null,
  host_id       text not null,
  floor         int  not null,
  x             int  not null,
  y             int  not null,
  monster_id    text not null,                   -- clé de monsters.js
  status        text not null default 'pending', -- pending|resolved|fled|expired
  posted_at     timestamptz not null default now(),
  resolved_at   timestamptz,
  claimed_at    timestamptz,                     -- côté visiteur, marque comme réclamé
  expires_at    timestamptz not null default (now() + interval '30 days')
);
alter table public.mp_threats enable row level security;
drop policy if exists "mp_threats_read"   on public.mp_threats;
drop policy if exists "mp_threats_insert" on public.mp_threats;
drop policy if exists "mp_threats_update" on public.mp_threats;
create policy "mp_threats_read"   on public.mp_threats for select using (true);
create policy "mp_threats_insert" on public.mp_threats for insert with check (true);
create policy "mp_threats_update" on public.mp_threats for update using (true) with check (true);
create index if not exists mp_threats_host_pending_idx
  on public.mp_threats (host_id, status, floor) where status = 'pending';
create index if not exists mp_threats_visitor_unclaimed_idx
  on public.mp_threats (visitor_id, status) where claimed_at is null and status in ('resolved','fled');

-- ------------------------------------------------------------
-- Colonne opt-out host (V1c) sur la table présence pré-existante
-- ------------------------------------------------------------
alter table public.mp_presence add column if not exists accepts_threats boolean not null default true;
