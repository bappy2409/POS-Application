# Clothing Store POS

Multi-branch clothing-store POS system. Phase 1 provides a React POS shell, an Express API, and local Microsoft SQL Server infrastructure.

## Prerequisites

- Node.js 20 or later and pnpm 10 or later
- Docker Desktop (for local SQL Server)

## Start locally

1. Copy `server/.env.example` to `server/.env` and set a strong database password that matches `docker-compose.yml`.
2. Run `docker compose up -d sqlserver`.
3. Run `pnpm install` at the repository root.
4. Run `pnpm dev`.
5. Open `http://localhost:5173`. The page calls `GET http://localhost:3000/api/v1/health` and displays its result.

## Useful commands

- `pnpm dev:server` — API with file watching
- `pnpm dev:pos` — Vite frontend
- `pnpm build` — production builds
- `pnpm --filter server prisma:generate` — generate Prisma client
- `pnpm --filter server exec prisma migrate deploy` — apply committed migrations to the configured database

The Phase 1 health endpoint does not require SQL Server. Copy `server/.env.example` to `server/.env` before applying the Phase 2 database migration.

## Initial owner

After applying the migration, create the single initial owner from the server directory. This bootstrap command only succeeds when no owner exists; subsequent staff accounts must be created by an authenticated owner through `POST /api/v1/auth/register`.

```powershell
$env:OWNER_PASSWORD = "use-a-unique-password-of-at-least-12-characters"
pnpm --filter server create:owner owner@example.com Ada Owner
```
