create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.prevent_client_role_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and new.role is distinct from old.role then
    raise exception 'User role changes must be performed by an administrator';
  end if;

  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  company_name text,
  role text not null default 'dispatcher' check (role in ('admin', 'dispatcher', 'carrier', 'support', 'user')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users add column if not exists phone text;
alter table public.users add column if not exists company_name text;
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'dispatcher', 'carrier', 'support', 'user'));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider_subscription_id text unique,
  plan_name text not null,
  status text not null default 'trialing' check (status in ('active', 'trialing', 'canceled', 'past_due')),
  started_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.loads (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  external_id text,
  source text not null default 'collector',
  origin jsonb not null,
  destination jsonb not null,
  distance integer,
  rate numeric(10, 2),
  pickup_date date,
  pickup_time text,
  trailer_type text,
  weight integer,
  dimensions text,
  broker text,
  contact jsonb not null default '{}'::jsonb,
  notes text,
  tags text[] not null default '{}',
  status text not null default 'available' check (status in ('available', 'booked', 'expired')),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_loads_received_at on public.loads (received_at desc);
create index if not exists idx_loads_status on public.loads (status);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
alter table public.loads alter column source set default 'collector';
alter table public.loads add column if not exists detail_status text default 'list_only';
alter table public.loads add column if not exists detail_fetched_at timestamptz;
alter table public.loads add column if not exists detail_error text;
alter table public.loads add column if not exists broker_name text;
alter table public.loads add column if not exists broker_phone text;
alter table public.loads add column if not exists broker_email text;
alter table public.loads add column if not exists comments text;
alter table public.loads add column if not exists commodity text;
alter table public.loads add column if not exists length text;
alter table public.loads add column if not exists stops jsonb;
alter table public.loads add column if not exists appointment_required boolean default false;
alter table public.loads add column if not exists pickup_details text;
alter table public.loads add column if not exists delivery_details text;
alter table public.loads add column if not exists raw_detail jsonb;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists users_prevent_client_role_change on public.users;
create trigger users_prevent_client_role_change
before update on public.users
for each row
execute function public.prevent_client_role_change();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists loads_set_updated_at on public.loads;
create trigger loads_set_updated_at
before update on public.loads
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, phone, company_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'company',
    'dispatcher'
  )
  on conflict (email) do update
  set
    full_name = coalesce(public.users.full_name, excluded.full_name),
    phone = coalesce(public.users.phone, excluded.phone),
    company_name = coalesce(public.users.company_name, excluded.company_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.loads enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (id = auth.uid() or email = auth.email());

drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile"
on public.users
for insert
to authenticated
with check (id = auth.uid() or email = auth.email());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using (id = auth.uid() or email = auth.email())
with check (id = auth.uid() or email = auth.email());

drop policy if exists "Authenticated users can read loads" on public.loads;
create policy "Authenticated users can read loads"
on public.loads
for select
to authenticated
using (true);

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());
