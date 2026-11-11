-- Acquisti effettuati tramite Stripe (offerta di lancio e piani futuri).
-- Scritta solo lato server con la service-role key (webhook Stripe / pagina di benvenuto).
create table if not exists public.purchases (
  id                       uuid primary key default gen_random_uuid(),
  stripe_session_id        text unique not null,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  email                    text not null,            -- sempre in minuscolo
  customer_name            text,
  product_label            text not null default 'Offerta di lancio RegulaeOS',
  amount_total             integer,                  -- in centesimi
  currency                 text,
  status                   text not null default 'active', -- active | past_due | canceled | withdrawn | ...
  invoice_url              text,
  invoice_pdf              text,
  withdrawal_deadline      timestamptz,
  withdrawal_requested_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists purchases_email_idx        on public.purchases (email);
create index if not exists purchases_subscription_idx on public.purchases (stripe_subscription_id);

-- Nessuna policy: accesso consentito solo alla service role.
alter table public.purchases enable row level security;
