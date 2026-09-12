# Railway deployment guide for NOW / IRL

This guide reflects the migrated Vite + React and Express architecture. The
old Next.js-only staging commands are no longer valid.

## One Railway service

Deploy the repository root as one Railway service. `railway.json` is committed
at the root and configures:

- Build: `pnpm run railway:build`
- Start: `pnpm run railway:start`
- Health check: `/api/healthz`

The build creates `artifacts/now-irl/dist/public` and the bundled API in
`artifacts/api-server/dist`. The Express server then serves the API under
`/api/*` and the Vite SPA for all browser routes from Railway's injected
`PORT`.

### Required Railway settings

1. Root directory: `/`
2. Package manager: pnpm (the repository pins `pnpm@10.26.1`)
3. Node.js: 20 or newer
4. Do not override the commands with `npm run build`, `next start`, or a
   frontend-only command.
5. Do not set `PORT` manually. Railway supplies it at runtime.

## Environment variables

The current migrated demo deployment needs no database variable:

| Variable | Required | Description |
|---|---:|---|
| `NODE_ENV` | recommended | Set to `production` |
| `SESSION_SECRET` | optional for current demo | Keep available for the future persistent auth implementation |
| `DATABASE_URL` | no | Only add after the PostgreSQL persistence follow-up is implemented |

The API currently uses in-memory demo data. Meetups, joins, chat messages, and
profile edits reset when the Railway service restarts. Do not use this mode as
the final production data layer.

## Verification after deploy

1. Open `https://<railway-domain>/api/healthz` and confirm `{"status":"ok"}`.
2. Open `/` and confirm the NOW discovery screen loads.
3. Open `/welcome`, `/profile`, and a meetup route directly to verify SPA
   fallback routing.
4. Create or join a meetup and confirm the browser remains on the same origin.
5. Check Railway logs for `Server listening` and the assigned `PORT`.

## Before production launch

- Move meetup, participant, chat, and profile state into PostgreSQL.
- Replace demo identity with persistent authentication and server-owned user
  identity.
- Add API and browser smoke tests for create, join/leave, check-in, chat, and
  profile flows.
- Configure Railway PostgreSQL only after the persistence migration is merged.