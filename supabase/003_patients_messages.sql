-- Run this after 001_profiles.sql and 002_admin_policies.sql, in the SQL
-- Editor.
--
-- Core rule this enforces: a doctor's Postgres session has NO select/update
-- grant on public.patients at all. Doctors only ever read
-- patient_doctor_view (which simply does not have phone/email/instagram
-- columns to leak) and write through update_patient_notes(), which accepts
-- only a note string. There is no query a doctor's browser can send that
-- returns a patient's contact details.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  phone text,
  email text,
  instagram_handle text,
  notes text not null default '',
  photo_url text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'assigned', 'booked', 'closed')),
  assigned_doctor_id uuid references public.profiles (id),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients enable row level security;

-- Only admins have any policy on the base table, so doctors get zero rows
-- (and zero write access) no matter what they query.
create policy "Admins can view all patients"
  on public.patients for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert patients"
  on public.patients for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update patients"
  on public.patients for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete patients"
  on public.patients for delete
  to authenticated
  using (public.is_admin());

-- Doctor-safe helper: does the current user own this patient? Runs as
-- SECURITY DEFINER so it can read patients (bypassing RLS) even though the
-- calling doctor has no direct grant on the table.
create function public.is_assigned_doctor(p_patient_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.patients
    where id = p_patient_id and assigned_doctor_id = auth.uid()
  );
$$;

-- The only patient data a doctor's browser can ever fetch. Created without
-- security_invoker, so it runs as its owner (the migration role), which is
-- exempt from the RLS on patients that would otherwise block doctors
-- entirely -- the row filter below does the restricting instead, and the
-- column list simply never includes phone/email/instagram_handle.
create view public.patient_doctor_view as
select
  id,
  first_name,
  notes,
  photo_url,
  status,
  assigned_doctor_id,
  created_at,
  updated_at
from public.patients
where assigned_doctor_id = auth.uid();

grant select on public.patient_doctor_view to authenticated;

-- Lets a doctor edit notes on their own patient without any select/update
-- grant on the base table -- the function signature makes it impossible to
-- touch any other column, contact fields included.
create function public.update_patient_notes(p_patient_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_assigned_doctor(p_patient_id) or public.is_admin()) then
    raise exception 'not authorized';
  end if;

  update public.patients
  set notes = p_notes, updated_at = now()
  where id = p_patient_id;
end;
$$;

grant execute on function public.update_patient_notes(uuid, text) to authenticated;

-- Message thread. A "send" today just logs the message -- wiring this up to
-- WhatsApp/SMS/Instagram/email is a later phase, and when it lands, the
-- dispatch will happen server-side (reading patients.phone/email with the
-- service role), never in the browser.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  sender_id uuid references public.profiles (id),
  direction text not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  channel text not null
    check (channel in ('whatsapp', 'sms', 'instagram', 'email', 'call_note')),
  body text not null,
  status text not null default 'sent'
    check (status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Admins can view all messages"
  on public.messages for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert messages"
  on public.messages for insert
  to authenticated
  with check (public.is_admin());

create policy "Doctors can view messages for their patients"
  on public.messages for select
  to authenticated
  using (public.is_assigned_doctor(patient_id));

create policy "Doctors can send messages for their patients"
  on public.messages for insert
  to authenticated
  with check (
    public.is_assigned_doctor(patient_id)
    and sender_id = auth.uid()
    and direction = 'outbound'
  );
