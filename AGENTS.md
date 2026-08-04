# Repository Guidelines

## Architecture

Full-stack Excitel broadband usage dashboard. Three packages, each with its own `package.json` and `bun.lock`:
- **Root** — React 19 + Vite 7 frontend (Tailwind CSS 4, Recharts)
- **`backend/`** — Express API backed by PostgreSQL 16 (`src/index.ts` entry)
- **`worker/`** — node-cron sync worker that pulls data from the Excitel API into Postgres (`src/index.ts` entry)

Docker Compose adds Nginx as a reverse proxy (port 3080 → frontend, `/api/` → backend:3000). Database schema lives in `database/init.sql` (no migration system — applied on first Postgres container create only).

## Commands

```bash
# Frontend (run from repo root)
bun install && bun run dev        # Vite dev server, port 5173
bun run build                     # Production bundle → dist/
bun run lint                      # ESLint across all three packages

# Backend
cd backend && bun install && bun run dev   # Express with --watch, port 3000

# Worker (no watch mode available)
cd worker && bun install && bun run start

# Full stack (Docker)
docker compose up -d --build               # Build & start everything
docker compose down && docker compose up -d --build   # Full rebuild after code changes
```

No test runner is configured. Add `bun test` when introducing tests.

## Critical Quirks

- **Vite dev proxy targets the live Excitel API** (`https://my.excitel.com`), not the local backend. In dev mode the frontend talks directly to Excitel; in Docker, Nginx proxies `/api/` to the backend which has its own Excitel integration. See `vite.config.ts`.
- **`VITE_API_BASE_URL` is a build-time variable**, set via Docker build arg. It is baked into the JS bundle, not read at runtime. Default: `/api`.
- **Each package requires its own `bun install`** — there is no workspace root that hoists dependencies.
- **`package-lock.json` is gitignored** — only `bun.lock` files are the source of truth.
- **Database schema changes require rebuilding the Postgres volume** (`docker compose down -v`) or running DDL manually. `init.sql` only runs on first container init.
- **Worker has no watch/dev mode** — only `bun run start`.

## Code Style

- ES modules everywhere (`"type": "module"` in all package.json files).
- 2-space indent, semicolons, single quotes.
- `PascalCase` components, `camelCase` hooks/utilities, `SCREAMING_SNAKE_CASE` constants.
- API responses: `{ success: true, result }` or `{ success: false, error }`.
- ESLint `no-unused-vars` rule: variables starting with uppercase or underscore are exempt (`^[A-Z_]`).

## Key Paths

| Concern | Path |
|---|---|
| Frontend API client | `src/services/api.ts` |
| Data hook | `src/hooks/useExcitelData.ts` |
| Shared utils (cn helper) | `src/lib/utils.ts` |
| Theme context | `src/context/ThemeContext.tsx` |
| Backend routes | `backend/src/routes/api.ts` |
| Backend sync service | `backend/src/services/syncService.ts` |
| Worker sync service | `worker/src/services/syncService.ts` |
| DB schema | `database/init.sql` |
| Dockerfiles | `docker/{frontend,backend,worker}/Dockerfile` |

## Environment

Copy `.env.example` to `.env`. Required: `POSTGRES_PASSWORD`, `EXCITEL_USERNAME`, `EXCITEL_PASSWORD`. Defaults exist for everything else (`SYNC_CRON_SCHEDULE=0 */2 * * *`, `RUN_ON_STARTUP=true`).

## Post-Change Workflow (MANDATORY)

**After ANY file change in this repository (frontend, backend, worker, Dockerfiles, docker-compose.yml, .env, or any source/config file), you MUST rebuild and restart the Docker containers so that the changes are visible in the browser at `http://localhost:3080`.**

Always run these two commands in sequence after making code changes:

```bash
# Stop and remove containers, then rebuild and start in detached mode
docker compose down && docker compose up -d --build
```

To verify containers are healthy after restart:
```bash
docker compose ps
docker compose logs --tail=50
```

**This is a hard requirement — never skip this step.** If the user asks to see changes in the browser after your edits, you must rebuild. If the rebuild fails, report the error and fix it.

## Commit Conventions

Format: `type(scope): summary` (e.g., `feat(api): add sync-status endpoint`). Keep commits atomic.

## Contribution Workflow

- Start from an up-to-date `main` branch and use a descriptive topic branch for every change. Do not commit directly to `main`.
- Inspect `git status`, the recent commit history, and the complete diff before staging anything.
- Keep commits atomic. Split unrelated logical changes into separate commits, and follow the repository's `type(scope): summary` format.
- Stage explicit paths, then review `git diff --cached` before committing. Never stage `.env` files, credentials, tokens, private account data, local captures, build output, dependency directories, or other generated local artifacts. Use `.env.example` as the shareable configuration template.
- Run the relevant checks before opening a pull request. At minimum, use `bun run lint` and `bun run build` for frontend or shared changes; run package-specific checks for backend and worker changes.
- After any file change, rebuild and restart the Docker stack using the mandatory commands above, then verify `docker compose ps` and `docker compose logs --tail=50`.
- Push the topic branch with `git push -u origin <branch>` and open a pull request against `main` with a conventional title, a concise summary, the validation performed, and any operational notes.
- Review the pull request diff and checks before merging. Preserve separate logical commits when using the repository's merge-commit workflow; do not squash unrelated work together.
- After merging, update the local branch with `git switch main` followed by `git pull --ff-only`, then confirm the worktree is clean and the merged commit is present.
- Keep commit messages and pull-request descriptions focused on the repository change. Do not include unrelated internal tooling references.
