-- Run this in Supabase SQL editor (new project).
-- This creates ALL tables that the Morning Bites app reads/writes.

-- =========================
-- MENU
-- =========================
create table if not exists public.menu_items (
  id bigserial primary key,
  name text not null,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  category text not null default 'daily' check (category in ('daily', 'week_special')),
  week_days int[] not null default '{}'::int[],
  created_at timestamptz not null default now()
);

create index if not exists menu_items_sort_order_idx on public.menu_items (sort_order);
create index if not exists menu_items_category_idx on public.menu_items (category);
create index if not exists menu_items_is_active_idx on public.menu_items (is_active);

-- =========================
-- BILLING
-- =========================
create table if not exists public.bills (
  id bigserial primary key,
  customer_name text null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  payment_mode text not null check (payment_mode in ('cash', 'upi', 'scanpay')),
  notes text null,
  bill_date text not null,
  created_at timestamptz not null default now()
);

create index if not exists bills_created_at_idx on public.bills (created_at desc);
create index if not exists bills_bill_date_idx on public.bills (bill_date);
create index if not exists bills_payment_mode_idx on public.bills (payment_mode);

-- =========================
-- PREORDERS
-- =========================
create table if not exists public.preorders (
  id bigserial primary key,
  customer_name text null,
  phone text null,
  pickup_date date not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  payment_mode text null check (payment_mode in ('cash', 'upi', 'scanpay')),
  notes text null,
  is_fulfilled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists preorders_pickup_date_idx on public.preorders (pickup_date);
create index if not exists preorders_is_fulfilled_idx on public.preorders (is_fulfilled);

-- =========================
-- OPTIONAL TABLES (already used by app UI/navigation)
-- If you only want Menu/Billing/Preorder/Dashboard you can still create these
-- as empty tables so the app loads without errors.
-- =========================

create table if not exists public.customers (
  id bigserial primary key,
  name text not null,
  phone text not null,
  type text not null default 'regular',
  total integer not null default 0,
  used integer not null default 0,
  join_date date not null default current_date,
  renew_count integer not null default 0,
  last_renewed timestamptz null,
  pack_start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  is_deleted boolean not null default false,
  preferred_days int[] not null default '{}'::int[],
  package_id bigint null,
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'upi', 'scanpay')),
  created_at timestamptz not null default now()
);

create index if not exists customers_is_deleted_idx on public.customers (is_deleted);
create index if not exists customers_status_idx on public.customers (status);

create table if not exists public.walkins (
  id bigserial primary key,
  name text not null,
  phone text not null,
  visit_date date not null default current_date,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists walkins_is_deleted_idx on public.walkins (is_deleted);
create index if not exists walkins_visit_date_idx on public.walkins (visit_date);

create table if not exists public.meal_skips (
  id bigserial primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  skip_date date not null,
  notified boolean not null default false,
  unskipped boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meal_skips_customer_id_idx on public.meal_skips (customer_id);
create index if not exists meal_skips_skip_date_idx on public.meal_skips (skip_date);

create table if not exists public.packages (
  id bigserial primary key,
  name text not null,
  description text null,
  price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists packages_is_active_idx on public.packages (is_active);

create table if not exists public.promotions (
  id bigserial primary key,
  title text not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists promotions_is_active_idx on public.promotions (is_active);

create table if not exists public.activity_logs (
  id bigserial primary key,
  customer_id bigint null references public.customers(id) on delete set null,
  action text not null,
  description text not null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_customer_id_idx on public.activity_logs (customer_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

-- =========================
-- Row Level Security (RLS)
-- =========================
-- If you enable RLS, add policies. For quick internal use, you can leave RLS OFF.
-- Example (for each table):
--   alter table public.menu_items enable row level security;
--   create policy "read all" on public.menu_items for select using (true);
--   create policy "write all" on public.menu_items for insert with check (true);
--   create policy "update all" on public.menu_items for update using (true);
--   create policy "delete all" on public.menu_items for delete using (true);

