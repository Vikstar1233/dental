-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'doctor' check (role in ('admin', 'doctor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user can read only their own profile row. The broader
-- "admins can read all profiles" policy needed for the Users admin page
-- lives in 002_admin_policies.sql.
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Automatically create a profile row whenever a new auth user is created.
-- New users default to 'doctor'; promote the clinic owner to 'admin'
-- manually (see the UPDATE statement at the bottom of this file).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- After creating your own (owner) user below, promote it to admin:
-- update public.profiles set role = 'admin' where email = 'owner@yourclinic.co.uk';
