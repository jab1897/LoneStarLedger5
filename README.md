# LoneStarLedger5

Vite + React SPA deployed to Vercel, using an existing Render backend.

## Quick start
1. `cp .env.example .env` and set `VITE_API_URL` to your Render base URL.
2. `npm install`
3. `npm run dev` (local)
4. On Vercel: set env var `VITE_API_URL`, build = `npm run build`, output = `dist`.

## Notes
- All API calls read `import.meta.env.VITE_API_URL`.
- `vercel.json` includes SPA rewrite to fix deep links.
