-- Patient fields (preferred channel, tags, custom fields), CSV import
-- history, and internal staff chat. Run after 005_integrations.sql.

alter table public.patients
  add column if not exists preferred_channel text
    check (preferred_channel in ('whatsapp', 'sms', 'instagram', 'email')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  -- Drives the pipeline board's "days in this stage" amber/red flag --
  -- bumped whenever stage changes, separately from created_at.
  add column if not exists stage_changed_at timestamptz not null default now();

-- Admin-defined extra fields (e.g. "Insurance provider"). Rendered
-- generically wherever patient fields show; values live in
-- patients.custom_fields keyed by `key`.
create table public.patient_field_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.patient_field_definitions enable row level security;

create policy "Admins can manage field definitions"
  on public.patient_field_definitions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Doctors need to READ field labels/keys (to render custom fields on
-- their own patient view), just not create/edit definitions.
create policy "Doctors can view field definitions"
  on public.patient_field_definitions for select to authenticated
  using (true);

-- CSV/Excel import history, so a bad import can be identified.
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  uploaded_by uuid references public.profiles (id),
  rows_added integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.imports enable row level security;

create policy "Admins can view imports"
  on public.imports for select to authenticated
  using (public.is_admin());

create policy "Admins can log imports"
  on public.imports for insert to authenticated
  with check (public.is_admin());

-- Internal staff chat -- separate from patient messages. Any active,
-- signed-in staff member (admin or doctor) can read and post; there's no
-- patient data in here at all, so this doesn't need the same lockdown.
create table public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.staff_messages enable row level security;

create policy "Staff can view team chat"
  on public.staff_messages for select to authenticated
  using (true);

create policy "Staff can post to team chat"
  on public.staff_messages for insert to authenticated
  with check (author_id = auth.uid());
