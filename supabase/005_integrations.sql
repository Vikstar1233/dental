-- Integrations: Meta lead forms, WhatsApp, Instagram, email, Aircall.
-- Run in the SQL Editor after 004_v2_schema.sql.

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique
    check (provider in ('meta', 'whatsapp', 'instagram', 'email', 'aircall')),
  status text not null default 'not_connected'
    check (status in ('not_connected', 'pending', 'connected', 'error')),
  -- Everything here, secrets included: access tokens, page ids, selected
  -- form ids. Nothing in this table is ever meant to reach a browser.
  config jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS is on and NO policies are defined for it -- not even for admins.
-- The 'authenticated' role therefore gets zero rows, full stop, the same
-- way doctors get zero rows on patients. The only way in is the service
-- role client (createAdminClient()), used exclusively by server code that
-- redacts secrets before anything reaches a page.
alter table public.integrations enable row level security;

insert into public.integrations (provider, status)
values
  ('meta', 'not_connected'),
  ('whatsapp', 'not_connected'),
  ('instagram', 'not_connected'),
  ('email', 'not_connected'),
  ('aircall', 'not_connected')
on conflict (provider) do nothing;

-- Prevents the same Meta lead being inserted twice if the webhook ever
-- redelivers (Meta retries on anything but a fast 200).
alter table public.patients add column if not exists external_lead_id text;
create unique index if not exists patients_external_lead_id_key
  on public.patients (external_lead_id)
  where external_lead_id is not null;
