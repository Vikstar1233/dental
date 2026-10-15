-- Fields Dentally requires to create a patient there, plus the id linking
-- our record to theirs once sent. Run after 006_fields_import_chat.sql.

alter table public.patients
  add column if not exists title text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists ethnicity text,
  add column if not exists address_line_1 text,
  add column if not exists postcode text,
  add column if not exists dentally_patient_id text;

-- Add 'dentally' to the allowed providers on the integrations table.
alter table public.integrations drop constraint integrations_provider_check;
alter table public.integrations add constraint integrations_provider_check
  check (provider in ('meta', 'whatsapp', 'instagram', 'email', 'aircall', 'dentally'));

insert into public.integrations (provider, status)
values ('dentally', 'not_connected')
on conflict (provider) do nothing;
