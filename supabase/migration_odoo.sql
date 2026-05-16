-- =====================================================
-- Migration : link quotes to Odoo sale orders
-- À coller dans Supabase SQL Editor → New query → Run
-- =====================================================

alter table public.quotes
  add column if not exists odoo_sale_order_id int,
  add column if not exists odoo_order_name text,
  add column if not exists odoo_access_token text,
  add column if not exists odoo_snapshot jsonb,
  add column if not exists odoo_synced_at timestamptz;

-- Lookup by Odoo order name (S06736) — also enforces uniqueness so an order
-- is linked to at most one quote in our DB.
create unique index if not exists quotes_odoo_order_name_idx
  on public.quotes(odoo_order_name)
  where odoo_order_name is not null;

create index if not exists quotes_odoo_sale_order_id_idx
  on public.quotes(odoo_sale_order_id);
