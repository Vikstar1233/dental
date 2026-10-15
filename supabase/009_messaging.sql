-- WhatsApp + Instagram messaging, and a fix for Meta lead capture.
-- Run after 008_vault_secrets.sql.

-- FIX: the lead de-duplication index from 005 was a *partial* index
-- (WHERE external_lead_id IS NOT NULL). The API's upsert can't target a
-- partial index, so every Meta lead webhook failed with "no unique or
-- exclusion constraint matching the ON CONFLICT specification" and the
-- lead was dropped. A plain unique index works (NULLs never collide).
drop index if exists public.patients_external_lead_id_key;
create unique index if not exists patients_external_lead_id_key
  on public.patients (external_lead_id);

-- Instagram only lets you message someone who messaged you first, and
-- identifies them by an Instagram-scoped ID (not their @handle). It arrives
-- with their first message; we keep it to reply.
alter table public.patients add column if not exists instagram_scoped_id text;
create unique index if not exists patients_instagram_scoped_id_key
  on public.patients (instagram_scoped_id);

-- Providers redeliver webhooks; one row per provider message id.
create unique index if not exists messages_external_id_key
  on public.messages (external_id);
