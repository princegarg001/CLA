CLA v2 Backend

This is a lightweight Node.js/Express backend scaffold for the CLA v2 Flutter app. It provides a single place to configure external API keys and exposes simple proxy-style endpoints and stubs you can fill in.

Where to put API keys
- Copy `backend/.env.example` to `backend/.env` and fill in the secrets.

Quick start (requires Node.js 18+)

```powershell
cd backend
npm install
npm run dev    # or `npm start` in production
```

Base URL
- Default: `http://localhost:8080`
- Update Flutter app to point API calls to this base URL.

What I created
- `src/index.js` — server bootstrap
- `src/config.js` — loads env variables
- `src/db.js` — simple local JSON DB for leads (fallback to Supabase if configured)
- `src/routes/api.js` — all API routes (leads, apollo, umami, sentry, twitter, gumroad, solidgigs, contra, trustmrr, agentscope, verdent, gro, headai, webrobots, startupsRip, betalist, email inbound)
- `src/services/*` — service stubs that proxy to real APIs when keys are present, otherwise return sample data

Next steps
1. Fill `backend/.env` with your API keys/URLs.
2. Run `npm install` and `npm run dev`.
3. Update the Flutter app to call e.g. `${BASE_URL}/api/...`.

Notes
- Some integrations (SolidGigs/Contra) rely on inbound email parsing — see the `POST /api/email/inbound` endpoint to forward incoming emails (or use a mail-forwarding service).
- Webhooks: `POST /api/gro/webhook` is present to receive Gro.app webhook events; protect it with `GRO_WEBHOOK_SECRET`.
- If you want Supabase instead of local storage, set `SUPABASE_URL` and `SUPABASE_KEY` in `.env` and the server will attempt to use Supabase for leads.

If you want, I can now: wire the Flutter app to call these endpoints, or expand any service to fully match a provider's API (requires provider docs/keys)."}