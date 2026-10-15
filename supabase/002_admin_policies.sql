-- Run this after 001_profiles.sql, once you're ready to add the in-portal
-- "Users" admin page. Also in the SQL editor.

-- A plain "role = 'admin'" check inside a profiles policy would recurse
-- (reading profiles to decide access to profiles). SECURITY DEFINER lets
-- this function read profiles bypassing RLS, breaking the recursion.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());
