-- v2 schema rewrite to match the full build spec (stage pipeline, notes and
-- photos as their own tables, patient_safe view, sent_by/external_id on
-- messages). This DROPS the old patients/messages objects from
-- 003_patients_messages.sql -- fine, since everything in there is fake
-- test data ("Test Patient", "Dr Test Doctor"). Run this whole file at
-- once in the SQL Editor.

-- ── profiles: add the two new columns the spec's doctors page needs ──────
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists aircall_user_id text;

-- ── drop the old patient-related objects (RLS policies, table, view, fns) ─
drop policy if exists "Doctors can send messages for their patients" on public.messages;
drop policy if exists "Doctors can view messages for their patients" on public.messages;
drop policy if exists "Admins can insert messages" on public.messages;
drop policy if exists "Admins can view all messages" on public.messages;
drop table if exists public.messages;

drop function if exists public.update_patient_notes(uuid, text);
drop view if exists public.patient_doctor_view;

drop policy if exists "Admins can delete patients" on public.patients;
drop policy if exists "Admins can update patients" on public.patients;
drop policy if exists "Admins can insert patients" on public.patients;
drop policy if exists "Admins can view all patients" on public.patients;
drop table if exists public.patients cascade;

drop function if exists public.is_assigned_doctor(uuid);

-- ── patients ───────────────────────────────────────────────────────────
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  phone text,
  email text,
  instagram_id text,
  source text not null default 'manual'
    check (source in ('manual', 'walk_in', 'referral', 'meta', 'instagram', 'google', 'other')),
  stage text not null default 'new_lead'
    check (stage in (
      'new_lead', 'contacted', 'consultation_booked',
      'consultation_attended', 'treatment_booked', 'closed_lost'
    )),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  last_contact_at timestamptz
);

alter table public.patients enable row level security;

-- Doctors get NO policy on this table at all -- that's the whole point.
create policy "Admins can view all patients"
  on public.patients for select to authenticated
  using (public.is_admin());

create policy "Admins can insert patients"
  on public.patients for insert to authenticated
  with check (public.is_admin());

create policy "Admins can update patients"
  on public.patients for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete patients"
  on public.patients for delete to authenticated
  using (public.is_admin());

-- Doctor-safe helper, SECURITY DEFINER so it can read patients despite the
-- doctor role having no grant on the table.
create function public.is_assigned_doctor(p_patient_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.patients
    where id = p_patient_id and assigned_to = auth.uid()
  );
$$;

-- The only patient data a doctor's browser can ever fetch: no phone,
-- email or instagram_id column exists here to leak. Owned by the
-- migration role (not security_invoker), so it bypasses patients' RLS
-- and the WHERE clause below does the restricting instead.
-- created_at is included beyond the spec's column list because the doctor
-- patient view needs "days since first contact" -- it's just a timestamp,
-- not contact info, so it doesn't compromise the rule.
create view public.patient_safe as
select id, first_name, stage, assigned_to, created_at, last_contact_at
from public.patients
where assigned_to = auth.uid();

grant select on public.patient_safe to authenticated;

-- ── messages ───────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  direction text not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  channel text not null
    check (channel in ('whatsapp', 'sms', 'instagram', 'email', 'call_note')),
  body text not null,
  sent_by uuid references public.profiles (id),
  external_id text,
  status text not null default 'sent'
    check (status in ('queued', 'sent', 'delivered', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Admins can view all messages"
  on public.messages for select to authenticated
  using (public.is_admin());

create policy "Admins can insert messages"
  on public.messages for insert to authenticated
  with check (public.is_admin());

create policy "Doctors can view messages for their patients"
  on public.messages for select to authenticated
  using (public.is_assigned_doctor(patient_id));

create policy "Doctors can send messages for their patients"
  on public.messages for insert to authenticated
  with check (
    public.is_assigned_doctor(patient_id)
    and sent_by = auth.uid()
    and direction = 'outbound'
  );

-- ── notes ──────────────────────────────────────────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Admins can view all notes"
  on public.notes for select to authenticated
  using (public.is_admin());

create policy "Admins can insert notes"
  on public.notes for insert to authenticated
  with check (public.is_admin());

create policy "Doctors can view notes for their patients"
  on public.notes for select to authenticated
  using (public.is_assigned_doctor(patient_id));

create policy "Doctors can add notes for their patients"
  on public.notes for insert to authenticated
  with check (public.is_assigned_doctor(patient_id) and author_id = auth.uid());

-- ── photos ─────────────────────────────────────────────────────────────
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Admins can view all photos"
  on public.photos for select to authenticated
  using (public.is_admin());

create policy "Admins can insert photos"
  on public.photos for insert to authenticated
  with check (public.is_admin());

create policy "Doctors can view photos for their patients"
  on public.photos for select to authenticated
  using (public.is_assigned_doctor(patient_id));

create policy "Doctors can add photos for their patients"
  on public.photos for insert to authenticated
  with check (public.is_assigned_doctor(patient_id) and uploaded_by = auth.uid());

-- ── storage bucket for patient photos ─────────────────────────────────
-- Private bucket. Files are stored at "<patient_id>/<filename>", so the
-- policies below can recover the patient id straight from the path.
insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', false)
on conflict (id) do nothing;

create policy "Admins can manage all patient photos in storage"
  on storage.objects for all to authenticated
  using (bucket_id = 'patient-photos' and public.is_admin())
  with check (bucket_id = 'patient-photos' and public.is_admin());

create policy "Doctors can upload photos for their patients"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patient-photos'
    and public.is_assigned_doctor(((storage.foldername(name))[1])::uuid)
  );

create policy "Doctors can view photos for their patients"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patient-photos'
    and public.is_assigned_doctor(((storage.foldername(name))[1])::uuid)
  );
