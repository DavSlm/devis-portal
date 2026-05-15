-- =====================================================
-- Schéma : devis-portal — Phase 1 (sans Odoo)
-- À coller dans Supabase SQL Editor → New query → Run
-- =====================================================

-- =====================================================
-- Table : quote_requests
-- Demandes brutes soumises par le wizard public, avant validation manuelle.
-- =====================================================
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identification client
  email text not null,
  full_name text,
  company_name text,
  vat_number text,
  siret text,
  phone text,

  -- Adresses (livraison + facturation)
  shipping_address jsonb,
  billing_address jsonb,

  -- Configuration produit
  product_type text not null,           -- 'Oshibori' | 'Plateaux'
  category text,                         -- ex. 'Oshibori - Hôtellerie & restauration'
  perso_level text,                      -- 'Neutre' | 'Semi perso' | 'Full perso'
  grammage text,                         -- '6g' | '10g' | '15g'
  matiere text,                          -- 'coton' | 'bambou'
  packaging text,                        -- ex. 'blanc', 'noir-tv'

  -- Quantité et brief
  quantity int,
  brief text,
  file_url text,                         -- URL Supabase Storage du logo/charte

  -- Estimation prix au moment de la soumission (info, non engageant)
  estimated_unit_price numeric(10, 4),
  estimated_total numeric(12, 2),

  -- État interne
  status text not null default 'pending_review',  -- pending_review | reviewed | converted | archived
  internal_notes text
);

create index quote_requests_email_idx on public.quote_requests(email);
create index quote_requests_status_idx on public.quote_requests(status);
create index quote_requests_created_at_idx on public.quote_requests(created_at desc);

-- =====================================================
-- Table : quotes
-- Devis finaux générés après validation manuelle (par David).
-- Snapshot complet pour qu'une modif ultérieure de quote_requests n'affecte pas le devis émis.
-- =====================================================
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,     -- ex. 'DV-2026-0001'
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  expires_at timestamptz,

  -- Lien vers la demande d'origine (peut être null si devis créé manuellement)
  quote_request_id uuid references public.quote_requests(id) on delete set null,

  -- Snapshot client
  email text not null,
  full_name text,
  company_name text,

  -- Snapshot configuration produit
  product_type text not null,
  config jsonb not null,                  -- snapshot complet perso/grammage/matière/packaging

  -- Prix final (validé)
  unit_price numeric(10, 4) not null,
  quantity int not null,
  subtotal_ht numeric(12, 2) not null,
  vat_rate numeric(5, 2),
  vat_amount numeric(12, 2),
  total_ttc numeric(12, 2),

  -- Conditions commerciales
  conditions text,
  delivery_delay_days int,

  -- PDF généré
  pdf_url text,

  -- État
  status text not null default 'draft'    -- draft | sent | accepted | rejected | expired | converted
);

create index quotes_email_idx on public.quotes(email);
create index quotes_status_idx on public.quotes(status);
create index quotes_quote_number_idx on public.quotes(quote_number);

-- =====================================================
-- Table : quote_actions
-- Log des interactions client : visualisation, téléchargement, acceptation, refus.
-- =====================================================
create table public.quote_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  action text not null,                   -- viewed | downloaded | accepted | rejected | revision_requested
  reason text,                            -- raison de refus / demande de révision
  ip_address inet,
  user_agent text
);

create index quote_actions_quote_id_idx on public.quote_actions(quote_id);

-- =====================================================
-- Row Level Security
-- David (côté serveur) utilise la service_role key qui bypass RLS.
-- Le public et les clients authentifiés sont restreints par ces policies.
-- =====================================================

alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_actions enable row level security;

-- Anonymes : peuvent INSÉRER une demande (formulaire public)
create policy "Anonymous can submit quote requests"
  on public.quote_requests
  for insert
  to anon
  with check (true);

-- Authentifiés (clients via magic link) : peuvent voir leurs propres devis
create policy "Users see own quotes"
  on public.quotes
  for select
  to authenticated
  using (email = auth.jwt() ->> 'email');

-- Authentifiés : peuvent voir les actions liées à leurs devis
create policy "Users see own quote actions"
  on public.quote_actions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_actions.quote_id
        and quotes.email = auth.jwt() ->> 'email'
    )
  );

-- Authentifiés : peuvent enregistrer une action sur leurs propres devis (accept/reject)
create policy "Users can act on own quotes"
  on public.quote_actions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_actions.quote_id
        and quotes.email = auth.jwt() ->> 'email'
    )
  );
