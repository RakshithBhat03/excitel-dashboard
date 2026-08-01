# Excitel Dashboard

Excitel Dashboard is a self-hosted broadband usage dashboard for Excitel accounts. It combines a React frontend, an Express API, PostgreSQL, and a scheduled worker that imports usage history from the Excitel self-care API.

This is an independent, unofficial project. It is designed for local or private use and stores account usage history, including session metadata and IP addresses, in your local database.

## Features

- Usage summaries and trends by billing month
- Daily usage and session-duration charts
- Session search and termination-cause breakdowns
- IP address insights
- Scheduled synchronization from the Excitel API
- PostgreSQL-backed history with rotating local backups
- Docker Compose deployment behind Nginx

## Stack

- Frontend: React 19, Vite 7, Tailwind CSS 4, Recharts
- Backend: Express, Helmet, PostgreSQL client
- Worker: Bun, node-cron, PostgreSQL client
- Infrastructure: Docker Compose, Nginx, PostgreSQL 16

## Repository layout

```text
src/                  React UI, hooks, utilities, and API client
backend/src/          Express routes, database access, and sync service
worker/src/            Scheduled sync and database backup worker
database/init.sql     PostgreSQL schema bootstrap
docker/                Frontend, backend, worker, and Nginx configuration
docker-compose.yml     Local full-stack orchestration
```

## Prerequisites

For the recommended workflow:

- Docker Desktop or a compatible Docker Engine with Compose

For running individual services directly:

- Bun 1.x
- PostgreSQL 16, or the PostgreSQL container started from Compose

## Quick start with Docker

Docker is the easiest way to run the complete stack.

1. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set a local PostgreSQL password plus either your Excitel username/password or a current `SELFCARE_COOKIE`.

3. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Open the dashboard at [http://localhost:3080](http://localhost:3080).

The worker syncs on startup when `RUN_ON_STARTUP=true` and then follows `SYNC_CRON_SCHEDULE`. It also creates database backups according to `BACKUP_CRON_SCHEDULE`.

The Compose ports are bound to loopback by default, so the database and API are not exposed to your local network:

- Frontend: [http://localhost:3080](http://localhost:3080)
- Backend health check: [http://localhost:3000/health](http://localhost:3000/health)
- PostgreSQL: `127.0.0.1:5432`

Useful commands:

```bash
docker compose ps
docker compose logs --tail=50
docker compose logs -f worker
docker compose down
```

`docker compose down -v` removes the local PostgreSQL and backup volumes. Use it only when you intentionally want to delete local data and recreate the schema from `database/init.sql`.

## Environment variables

`.env.example` is safe to commit. `.env` is ignored by Git and must stay local.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Database name; defaults to `excitel` |
| `POSTGRES_USER` | Database user; defaults to `excitel` |
| `POSTGRES_PASSWORD` | Required local database password |
| `EXCITEL_USERNAME` | Excitel login username; not needed when using `SELFCARE_COOKIE` |
| `EXCITEL_PASSWORD` | Excitel login password; not needed when using `SELFCARE_COOKIE` |
| `SELFCARE_COOKIE` | Optional current self-care cookie; treat it like a password |
| `CORS_ORIGIN` | Comma-separated origins allowed for direct frontend development |
| `SYNC_CRON_SCHEDULE` | Worker sync schedule; default is every two hours |
| `BACKUP_CRON_SCHEDULE` | Backup schedule; default is 2:00 AM UTC daily |
| `BACKUP_RETENTION_DAYS` | Number of days to retain backups; default is 30 |
| `RUN_ON_STARTUP` | Set to `false` to skip the initial sync |

Docker builds the frontend with `VITE_API_BASE_URL=/api`. Values prefixed with `VITE_` are public build-time configuration and must never contain credentials.

## Running services directly

The Docker workflow above is the canonical local setup. Direct service commands are useful when developing a single package.

### Frontend

```bash
bun install
bun run dev
```

The Vite development proxy intentionally targets the live Excitel API by default; see `vite.config.js`. To point the browser at a locally running backend instead, start the backend and run:

```bash
VITE_API_BASE_URL=http://localhost:3000/api bun run dev
```

The backend allows the default Vite origins (`localhost:5173` and `127.0.0.1:5173`). Set `CORS_ORIGIN` if you use a different development origin.

### Backend

Start PostgreSQL first:

```bash
docker compose up -d postgres
```

Then run the backend with the root environment file. Replace the password placeholder with the value in your local `.env`:

```bash
cd backend
bun install
DATABASE_URL='postgres://excitel:your_secure_password_here@127.0.0.1:5432/excitel' bun --env-file=../.env run dev
```

The backend listens on port `3000` by default.

### Worker

The worker needs the same credentials and `DATABASE_URL` as the backend:

```bash
cd worker
bun install
DATABASE_URL='postgres://excitel:your_secure_password_here@127.0.0.1:5432/excitel' bun --env-file=../.env run start
```

## API

The API is available through the frontend at `/api` or directly at `http://localhost:3000/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Database-backed health check |
| `GET` | `/api/months` | List imported billing months |
| `GET` | `/api/sessions/:monthId` | Return sessions for `M-YYYY`, `MM-YYYY`, or `all` |
| `GET` | `/api/sync-status` | Return sync metadata |
| `POST` | `/api/sync/:monthId` | Trigger a sync for one month |

Example read-only request:

```bash
curl http://localhost:3000/api/months
curl http://localhost:3000/api/sessions/all
```

The manual sync endpoint has no authentication because this stack is intended for local/private use. Do not expose port `3000` or the sync endpoint directly to the internet without adding authentication, authorization, rate limiting, and an appropriate deployment boundary.

## Data, backups, and schema changes

- PostgreSQL data is stored in the `postgres_data` Docker volume.
- Worker backups are stored in the `backups` Docker volume and are rotated by age.
- The schema is applied by PostgreSQL only when the data volume is first created.
- After changing `database/init.sql`, either apply the DDL manually or recreate the local database with `docker compose down -v`.

## Quality checks

Run these from the repository root:

```bash
bun install
bun run lint
bun test
bun run build
```

The backend and worker each have their own `package.json` and `bun.lock`; run `bun install` in those directories when working on them directly. There is no package workspace that hoists dependencies.

## Privacy and public-repository safety

- Never commit `.env`, real Excitel credentials, `SELFCARE_COOKIE`, database URLs containing passwords, database dumps, logs, or screenshots containing account data or IP addresses.
- Treat all `VITE_*` values as public because they are embedded into the browser bundle.
- The Excitel service URLs in the source are integration endpoints, not secrets.
- Keep the local API and database bound to loopback unless you have deliberately secured the deployment.
- Before publishing, review both the current files and Git history. If a real credential was ever committed, rotate it and remove it from history before making the repository public.

## License

This project is released under the [MIT License](LICENSE).

## Publishing checklist

Before creating or pushing to a public GitHub repository:

1. Confirm `.env` is not tracked: `git status --short` and `git ls-files .env`.
2. Review tracked files for credentials, dumps, logs, captures, and personal data.
3. Review Git history for credentials, not just the current checkout.
4. Confirm the included MIT License reflects your preferred copyright attribution.
5. Run the quality checks above and verify the Docker stack locally.

This repository does not publish anything automatically. Creating or pushing a GitHub repository is a separate, explicit step.
