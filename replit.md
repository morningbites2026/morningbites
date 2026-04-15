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
- 9-tab navigation: Dashboard, Billing, Bill Reports, Sub Dashboard, Walk-ins, Subscribed, Sub Reports, Packages, Menu
- Direct Supabase integration (no backend needed)
- WhatsApp notifications for subscriptions, skips, meal updates
- UPI/QR code payment support with change calculator
- Subscription tracking: meal usage, preferred days, skips, renewals
- Mobile-first, responsive design
- Green brand theme (#1a5c2a)

**Supabase Tables:** customers, walkins, menu_items, bills, meal_skips, meal_logs, packages

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
