# Excitel Dashboard

Excitel Dashboard is a full-stack usage analytics app for Excitel broadband accounts. It combines a React frontend, an Express API, a PostgreSQL database, and a cron-driven worker that syncs usage history from the Excitel API.

## Stack

- Frontend: React 19, Vite 7, Tailwind CSS 4, Recharts
- Backend: Express, PostgreSQL
- Worker: Bun, node-cron
- Infrastructure: Docker Compose, Nginx, Postgres 16

## Repository Layout

- `src/`: React application UI, hooks, utilities, and API client
- `backend/src/`: Express API routes, database access, and sync services
- `worker/src/`: scheduled sync worker and Excitel API integration
- `database/init.sql`: PostgreSQL schema bootstrap
- `docker/`: frontend, backend, and worker container definitions
- `docker-compose.yml`: full local stack

## Prerequisites

- Bun 1.x
- Docker Desktop or a compatible Docker Engine

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill in your database password and Excitel credentials.

Required variables:

```bash
POSTGRES_DB=excitel
POSTGRES_USER=excitel
POSTGRES_PASSWORD=your_secure_password_here
EXCITEL_USERNAME=your_excitel_username
EXCITEL_PASSWORD=your_excitel_password
SYNC_CRON_SCHEDULE=0 */2 * * *
RUN_ON_STARTUP=true
```

## Local Development

Frontend:

```bash
bun install
bun run dev
```

Backend:

```bash
cd backend
bun install
bun run dev
```

Worker:

```bash
cd worker
bun install
bun run start
```

## Docker Workflow

Bring up the full stack:

```bash
docker compose up -d --build
```

Stop the stack:

```bash
docker compose down
```

Default endpoints:

- Frontend: `http://localhost:3080`
- Backend health check: `http://localhost:3000/health`

## API Summary

- `GET /api/months`: available months
- `GET /api/sessions/:monthId`: sessions for a specific month or `all`
- `GET /api/sync-status`: sync metadata for imported months
- `POST /api/sync/:monthId`: trigger a manual month sync

## Data Model

The database stores:

- `months`: available billing months
- `sessions`: individual usage sessions with timing and volume
- `sync_metadata`: last sync timestamp, session count, and sync status

## Notes

- The worker can sync on startup and on the configured cron schedule.
- The frontend expects `/api` to be proxied to the backend in Docker.
- The repository intentionally ignores local agent instruction files and captured API payloads.
