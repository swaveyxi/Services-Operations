# Service & Operations — Dragnet ERP module

Fullstack rewrite of the Service & Operations Power Pages app: React (Vite) + Node/Express + MySQL,
run as an authenticated module inside the Dragnet ERP. Manages the lifecycle of client business
cases (campaigns) — creation, workplan configuration, ops review, profitability approval, active
execution — plus QuickBooks-synced billing catalogs and a support-form/handoff system for routing
operational work to teams.

See `docs/project_architecture.md` for the full architecture reference (schema, API routes,
business logic, roles). See `docs/MONOLITH_ARCHITECTURE.md` for the build/layering ruleset this
codebase follows, `docs/Dragnet_ERP_Authentication.md` for the auth contract with the ERP shell,
and `docs/deployment.md` for production deployment.

## Layout

- `client/` — Vite + React + TS frontend
- `server/` — Express + TS backend (`routes → controllers → services → models`, plus
  `middlewares/` and `jobs/`)
- `shared/` — types + constants shared across tiers (`constants.ts` holds roles, statuses, and the
  workplan/form → ops team routing maps — the single source of truth for that mapping)
- `migrations/` — DB migrations (Drizzle)

## Develop

```bash
npm install
cp .env.example .env        # VITE_DEV_BYPASS=true + DEV_BYPASS=true to skip ERP auth in dev
npm run dev             # client :3000, server :4000 (proxied via Vite)
npm run check                 # tsc --noEmit
```

Other scripts: `npm run dev` (client only), `npm run dev:client` / `npm run dev:server` (either
side alone), `npm run build` (produces `dist/client/` + `dist/server/index.js`), `npm start` (runs
the built server).

Database (Drizzle, config at root `drizzle.config.ts`, migrations in `./migrations`):

```bash
npm run db:generate   # generate a migration from schema changes
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly (dev convenience, skips migration files)
npm run db:studio      # Drizzle Studio
```

Migrations are never run automatically (not on server boot, not in CI/CD) — always run
`npm run db:migrate` explicitly after pulling schema changes.

## Authentication in dev

The app has no login page — it authenticates via a shared `.dragnet.ng` cookie that the Dragnet
ERP backend sets after login (`docs/ERP_Module-Tier_1.md`); this module only ever reads it. To
develop without running the ERP shell locally, set
`VITE_DEV_BYPASS=true` and `DEV_BYPASS=true` in `.env` (plus `DEV_BYPASS_EMAIL` for which seeded
user to mount as) — this is env-only and the server refuses to start with `DEV_BYPASS=true` while
`NODE_ENV=production`.

## Data

Dev data is loaded directly into MySQL (no JS seed pipeline). Reference catalogs
(`client_contacts`, `service_incomes`, `service_costs`, `parent_accounts`) are kept current by a
QuickBooks webhook + daily reconciliation job (`server/src/jobs/qbSync.ts`) — see
`docs/project_architecture.md` §8 for the sync design.
