-- Encrypted storage for integration API keys (Aircall token, Dentally
-- header, SMTP password, Meta app secret, page tokens...) using Supabase
-- Vault, so no key lives in code, .env files, or plaintext in a table.
-- Run after 005_integrations.sql.

create extension if not exists supabase_vault cascade;

-- Create-or-update a named secret. SECURITY DEFINER because the vault
-- schema isn't reachable by the API roles directly.
create or replace function public.set_integration_secret(p_name text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then
    perform vault.create_secret(p_secret, p_name, 'Patient portal integration secret');
  else
    perform vault.update_secret(v_id, p_secret, p_name);
  end if;
end;
$$;

create or replace function public.get_integration_secret(p_name text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name;
$$;

create or replace function public.delete_integration_secret(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where name = p_name;
$$;

-- Functions in the public schema are callable through the API by default,
-- which would let anyone read secrets. Lock them to the server-side
-- service role only.
revoke all on function public.set_integration_secret(text, text) from public, anon, authenticated;
revoke all on function public.get_integration_secret(text) from public, anon, authenticated;
revoke all on function public.delete_integration_secret(text) from public, anon, authenticated;

grant execute on function public.set_integration_secret(text, text) to service_role;
grant execute on function public.get_integration_secret(text) to service_role;
grant execute on function public.delete_integration_secret(text) to service_role;
