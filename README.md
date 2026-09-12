# NOW / IRL

NOW / IRL is a dark, mobile-first web app for discovering spontaneous nearby activities in public places.

## Local development

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/now-irl run dev
```

The Replit workflows already provide the correct `PORT` and artifact `BASE_PATH` values. For a direct production-style web build:

```bash
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/now-irl run build
```

## Railway deployment

Railway should deploy the repository root as one service. The checked-in `railway.json` configures:

- Build: `pnpm run railway:build`
- Start: `pnpm run railway:start`
- Health check: `/api/healthz`

The build compiles the Express API and Vite frontend. The start command serves both from Railway's injected `PORT`, so the frontend calls the API through the same origin.

### Railway settings

1. Connect the GitHub repository and deploy the `main` branch, or select the migration PR branch while testing.
2. Keep the root directory as `/`.
3. Do not use the old Next.js commands `npm run build` or `next start`.
4. Do not hardcode `PORT`; Railway provides it automatically.
5. The current demo mode keeps data in memory. Add PostgreSQL and persistence before treating the deployment as production data storage.

The current API is intentionally demo-safe and does not require `DATABASE_URL`. `SESSION_SECRET` can be supplied as a Railway variable when persistent authentication is introduced.

## Verification

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/now-irl run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/now-irl run build
```

Open `/` for discovery, `/welcome` for the safety introduction, and `/api/healthz` for the Railway health check.