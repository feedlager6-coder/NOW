# NOW / IRL

Real-time discovery of spontaneous, nearby public activities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on `PORT`
- `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/now-irl run build` — build the web app
- `pnpm run railway:build` — build the single-service Railway deployment
- `pnpm run railway:start` — serve the built web app and API on Railway's `PORT`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Railway health check: `GET /api/healthz`
- The current Railway demo deployment uses in-memory data; `DATABASE_URL` is not required until persistent storage is enabled.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/now-irl` — Vite + React web app
- `artifacts/api-server` — Express API and Railway static-file server
- `artifacts/now-design-system` — shared NOW tokens and primitives
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `railway.json` — Railway build, start, and health-check configuration

## Architecture decisions

- Railway runs one public service: Express serves `/api/*` and the compiled Vite SPA from the same `PORT`.
- The web build uses `BASE_PATH=/` for Railway; Replit's artifact workflow supplies its own path.
- API hooks are generated from the OpenAPI contract instead of being handwritten in the frontend.
- Demo state remains in memory for this migration; PostgreSQL persistence is a follow-up.

## Product

NOW / IRL helps adults find and join nearby public activities such as walks, coffee, sports, games, and study sessions. The experience is anonymous-first, safety-focused, and designed for plans that start within minutes.

## User preferences

- Native mobile work is out of scope for this iOS Replit context; keep this project web-only.

## Gotchas

- Use pnpm, not npm or yarn; the root preinstall guard rejects other package managers.
- `now-irl`'s Vite config requires `PORT` and `BASE_PATH` when building directly.
- Railway must use the root `railway.json` commands rather than the default Next.js commands from the imported backup.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
