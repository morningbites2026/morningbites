# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (backend), Supabase (frontend direct)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Morning Bites Tracker (`artifacts/morning-bites`)
A full-featured subscription management web app for a sprouts food stall. Built with React + Vite, connects directly to Supabase.

**Key Features:**
- 10-tab navigation: Dashboard, Billing, Bill Reports, Schedule, Walk-ins, Subscribed, Sub Reports, Packages, Menu, Promotions
- Direct Supabase integration (no backend needed)
- WhatsApp notifications for subscriptions, skips, meal updates, promotions
- UPI/QR code payment support with change calculator
- Subscription tracking: meal usage, preferred days, skips, renewals, history logs (IST timestamps)
- Walk-ins: subscribe, promote, history, edit, soft-delete (syncs to subscribed screen)
- Billing: Daily + Week Special menu categories; week specials filtered by day
- Bill Reports: date-wise filter, IST timestamps, full item editing, QR for scanpay
- Schedule: Today/Tomorrow tabs, dates in weekly grid, skipped meal alerts
- Promotions: create, toggle active/inactive, send to walk-in customers via WhatsApp
- Menu: Daily / Week Special tabs with per-day availability selection
- Activity logs: all key actions tracked with IST timestamps
- Mobile-first, responsive design, max-width 500px
- Green brand theme (#1a5c2a / #2d8a45), amber secondary (#f5c542)

**Supabase Tables:** customers, walkins, menu_items, bills, meal_skips, packages, activity_logs, promotions
**Required SQL migrations (run once in Supabase dashboard):**
```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id bigserial primary key,
  customer_id bigint references customers(id),
  action text not null,
  description text default '',
  meta jsonb,
  created_at timestamptz default now()
);
CREATE TABLE IF NOT EXISTS promotions (
  id bigserial primary key,
  title text not null,
  description text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category text DEFAULT 'daily';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS week_days integer[] DEFAULT '{}';
```

**Environment Variables (shared):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_KEY` — Supabase anon key (public)
- `VITE_UPI_ID` — UPI ID for QR payment generation

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/morning-bites run dev` — run Morning Bites app locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
