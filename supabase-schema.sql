-- Run this file in Supabase SQL Editor.
-- Before using admin features, create the admin account in Supabase Auth and
-- replace the email below with that exact account email.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(12, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  barcode text,
  image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  email text not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text not null default '',
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  currency text not null default 'EGP',
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'سوبر ماركت النجمة',
  logo text not null default 'https://img.icons8.com/fluency/96/shopping-cart.png',
  phone text not null default '01008074308',
  whatsapp text not null default '01008074308',
  address text not null default 'شارع النجمة، القاهرة، مصر',
  currency text not null default 'ج.م',
  products_seeded boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.store_settings
  add column if not exists products_seeded boolean not null default false;

insert into public.store_settings (id)
values (1)
on conflict (id) do nothing;

update public.store_settings
set phone = '01008074308',
    whatsapp = '01008074308',
    updated_at = now()
where id = 1
  and phone = '01008074308'
  and whatsapp = '01008074308';

-- Used by RLS policies. Browser clients cannot edit admin_users directly.
create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;
revoke all on table public.admin_users from anon, authenticated;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

insert into public.profiles (id, email, first_name, last_name)
select
  users.id,
  lower(users.email),
  coalesce(users.raw_user_meta_data ->> 'first_name', ''),
  coalesce(users.raw_user_meta_data ->> 'last_name', '')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.admin_list_emails()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(users.email)
  from auth.users as users
  join public.admin_users as admins on admins.user_id = users.id
  where public.is_store_admin()
  order by lower(users.email);
$$;

create or replace function public.admin_manage_user(target_email text, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if not public.is_store_admin() then
    raise exception 'Only store admins can manage admins';
  end if;

  select users.id into target_id
  from auth.users as users
  where lower(users.email) = lower(target_email);

  if target_id is null then
    raise exception 'Create this user in Supabase Auth first';
  end if;

  if make_admin then
    insert into public.admin_users (user_id)
    values (target_id)
    on conflict (user_id) do nothing;
  else
    if target_id = auth.uid() then
      raise exception 'You cannot remove your own admin access';
    end if;
    delete from public.admin_users where user_id = target_id;
  end if;
end;
$$;

revoke all on function public.create_profile_for_auth_user() from public;
revoke all on function public.admin_list_emails() from public;
revoke all on function public.admin_manage_user(text, boolean) from public;
grant execute on function public.admin_list_emails() to authenticated;
grant execute on function public.admin_manage_user(text, boolean) to authenticated;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Users read own profile and admins read all" on public.profiles;
create policy "Users read own profile and admins read all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_store_admin());

drop policy if exists "Users update own profile and admins update all" on public.profiles;
create policy "Users update own profile and admins update all"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_store_admin())
  with check (id = auth.uid() or public.is_store_admin());

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Products are visible in the public storefront; only admins can change them.
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all
  to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- Customers can create and read only their own orders; admins can manage all orders.
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Customers create own orders" on public.orders;
create policy "Customers create own orders"
  on public.orders for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
  on public.orders for all
  to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- Store settings are public to read; only admins can change them.
grant select on public.store_settings to anon, authenticated;
grant insert, update, delete on public.store_settings to authenticated;

drop policy if exists "Store settings are publicly readable" on public.store_settings;
create policy "Store settings are publicly readable"
  on public.store_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage store settings" on public.store_settings;
create policy "Admins manage store settings"
  on public.store_settings for all
  to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- Run this after creating the account in Supabase Auth.
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('aemade2026@gmail.com')
on conflict (user_id) do nothing;
