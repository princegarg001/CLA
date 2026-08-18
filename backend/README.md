# CLA v2 Backend

The full Node.js/Express backend for AlphoTech CLA v2 — the acquisition OS behind the
9-screen Flutter app. Every route works out of the box with realistic sample data;
wiring in real API keys switches each integration to live calls one at a time.

## Quick start (Node.js 18+)

```powershell
cd backend
npm install
copy .env.example .env    # then fill in whatever keys you have
npm run dev                # nodemon, reloads on change
```

Server listens on `http://localhost:8080` by default (`PORT` in `.env`).

## Database

Uses Supabase when `SUPABASE_URL` + `SUPABASE_KEY` are set — run `supabase_schema.sql`
in your project's SQL editor first (Database → SQL Editor → New query). Without those
keys, everything falls back to a local JSON store at `data/db.json` — no setup required.

## Structure

- `src/index.js` — server bootstrap, middleware, route mounting, graceful shutdown
- `src/config.js` — every env var + `isConfigured('name')` / `integrationStatus()`
- `src/db.js` — Supabase client or JSON-file driver behind one shared interface
- `src/middleware/` — error handling, rate limiting, `X-API-Key` auth
- `src/routes/` — one file per screen/domain (leads, apollo, umami, sentry, twitter,
  gumroad, freelance, revenue, agents, outreach, settings, warRoom, webhooks, intelligence)
- `src/services/` — one file per external platform; each degrades to sample data when
  its key is unset
- `src/cron/` — scheduled automation (War Room brief, job/RSS fetch, lead re-scoring,
  weekly report) — set `CRON_ENABLED=true` to turn it on

## Auth

If `CLA_API_KEY` is set, every `/api/*` route (except `/api/webhooks/*`, which use their
own per-provider secrets) requires header `X-API-Key: <value>`. Leave it blank while
developing locally to skip the check.

## Verifying it's alive

```powershell
curl http://localhost:8080/health
curl http://localhost:8080/api/warroom/missions
curl http://localhost:8080/api/settings/integrations
```

Every route returns valid JSON with sample data until you add the matching key in `.env`.
