-- Nurture and reactivation campaigns. Run after 009_messaging.sql.

-- Marketing opt-out lives on the patient, so it applies to every campaign
-- and every channel at once -- someone who texts STOP isn't emailed next
-- quarter.
alter table public.patients
  add column if not exists marketing_opt_out boolean not null default false,
  add column if not exists marketing_opted_out_at timestamptz;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('nurture', 'reactivation')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  -- Used by {practice} and {sender} in message text.
  practice_name text not null default '',
  sender_name text not null default '',
  -- { stages: [], sources: [], tags: [], min_inactive_days: n, max_inactive_days: n }
  audience jsonb not null default '{}'::jsonb,
  -- Nurture only: enrol new matching patients automatically as they arrive
  -- (never anyone who existed before the campaign was switched on).
  auto_enroll boolean not null default false,
  -- A whole list should never go out on day one.
  daily_limit integer not null default 60 check (daily_limit > 0),
  activated_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  position integer not null check (position > 0),
  -- Wait after the previous step (or after enrolment, for step 1).
  delay_hours integer not null default 24 check (delay_hours >= 0),
  -- 'auto' picks the patient's live channel (one they messaged on within
  -- 24h), otherwise email.
  channel text not null default 'auto'
    check (channel in ('auto', 'email', 'whatsapp', 'instagram')),
  subject text not null default '',
  body text not null,
  unique (campaign_id, position)
);

create table public.campaign_enrollments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'stopped')),
  next_step integer not null default 1,
  next_run_at timestamptz not null default now(),
  stop_reason text,
  enrolled_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (campaign_id, patient_id)
);

create index campaign_enrollments_due_idx
  on public.campaign_enrollments (status, next_run_at);

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  enrollment_id uuid references public.campaign_enrollments (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  step_position integer,
  channel text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index campaign_events_campaign_idx
  on public.campaign_events (campaign_id, created_at desc);

-- Lets a thread show which messages came from a campaign.
alter table public.messages
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

-- Admin only. Doctors never see or touch campaigns.
alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;
alter table public.campaign_enrollments enable row level security;
alter table public.campaign_events enable row level security;

create policy "Admins manage campaigns" on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage campaign steps" on public.campaign_steps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage campaign enrollments" on public.campaign_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins view campaign events" on public.campaign_events
  for select to authenticated using (public.is_admin());
