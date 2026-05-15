-- =====================================================
-- Storage bucket for client uploads (logos, briefs, etc.)
-- Run once in Supabase SQL Editor.
-- =====================================================

insert into storage.buckets (id, name, public)
values ('quote-attachments', 'quote-attachments', false)
on conflict (id) do nothing;

-- Anyone with the service_role key can read/write (server-side admin client).
-- We do NOT expose this bucket to anon — uploads go through our /api/quotes/submit
-- endpoint which uses the service role.
