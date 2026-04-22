-- Run this in Supabase SQL editor.
-- Creates the `preorders` table used by the Morning Bites app.

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

-- If you use Supabase Row Level Security, enable + add policies as needed:
-- alter table public.preorders enable row level security;
-- create policy "read all" on public.preorders for select using (true);
-- create policy "insert all" on public.preorders for insert with check (true);
-- create policy "update all" on public.preorders for update using (true);

