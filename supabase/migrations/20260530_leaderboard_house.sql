-- ============================================================
-- Migration : colonne `house` du Hall of Fame
-- Date      : 2026-05-30
-- Plan      : .claude/plans/parallel-worlds-stabilization.md (S1.5)
-- Réf       : CLAUDE.md §Hall of Fame ("ALTER TABLE leaderboard ADD COLUMN house TEXT;")
-- ------------------------------------------------------------
-- Dette adjacente versionnée pour reproductibilité.
-- Audit REST live 2026-05-30 : la colonne `leaderboard.house` EXISTE déjà
-- (HTTP 200 sur ?select=house). Ce fichier la rend idempotente/reproductible
-- pour tout nouveau projet. Sûr à ré-exécuter.
-- ============================================================

alter table public.leaderboard add column if not exists house text;
