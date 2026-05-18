-- =====================================================
-- Migration : capture des brouillons de wizard
-- À coller dans Supabase SQL Editor → New query → Run
--
-- Le wizard (côté navigateur) auto-sauvegarde la demande à chaque
-- étape via /api/quotes/draft avec un draftId stable (localStorage).
-- Cette migration ajoute les colonnes nécessaires sur quote_requests :
--   - draft_id           : identifiant stable du brouillon (UUID v4)
--   - last_saved_at      : timestamp de la dernière sauvegarde auto
--   - draft_notified_at  : timestamp de l'email de notif envoyé à David
-- =====================================================

alter table public.quote_requests
  add column if not exists draft_id text,
  add column if not exists last_saved_at timestamptz,
  add column if not exists draft_notified_at timestamptz;

-- Unique partial : un draftId ne peut viser qu'une seule ligne, mais
-- les anciennes demandes (sans draft_id) ne sont pas concernées.
create unique index if not exists quote_requests_draft_id_idx
  on public.quote_requests(draft_id)
  where draft_id is not null;

-- Index admin tab Brouillons (status='draft' trié par dernière sauvegarde).
create index if not exists quote_requests_drafts_idx
  on public.quote_requests(last_saved_at desc)
  where status = 'draft';
