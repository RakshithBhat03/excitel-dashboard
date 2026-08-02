# Security Best Practices Review

Review date: 2026-08-01

## Executive summary

This repository is intentionally designed for local/private use and has a solid baseline in several areas: SQL queries are parameterized, Express uses Helmet and custom error/404 handlers, JSON parsing is bounded, the Compose database/API ports bind to loopback, Nginx supplies browser security headers, and the React code does not use raw HTML injection, eval, unsafe navigation, or sensitive Web Storage.

The main security boundary is not enforced in application code. All API routes are unauthenticated, including an endpoint that triggers outbound Excitel requests and database writes. If the stack is exposed beyond a trusted local machine, this enables unauthorized access to broadband session/IP data and unauthorized sync activity. Even with loopback-only ports, browser-originated requests and local processes remain part of the threat model. The report found no confirmed Critical issue in the reviewed tree, but the first two High findings should be addressed before any non-local deployment.

This is an evidence-based static review of the repository and the running local stack; controls that may exist outside the repository were not assumed.

## Scope and guidance used

- JavaScript/JSX, React 19, and Vite 7 frontend.
- Express 4, Bun/Node runtime, PostgreSQL client, and the sync worker.
- Docker Compose and Nginx deployment configuration.
- Relevant security guidance: Express web server, generic browser JavaScript, and React frontend references from the security-best-practices skill.

## High severity findings

### H-01 — API has no application authentication or authorization

- Rule IDs: `EXPRESS-AUTH-001`, `REACT-AUTHZ-001`
- Location: `backend/src/index.js:45-46`; `backend/src/routes/api.js:29-152`
- Evidence:

  ```js
  app.use('/api', apiRoutes);
  ```

  The mounted router exposes session records, IP addresses, sync metadata, and the manual sync action without an authentication or authorization middleware. The `cors` allowlist at `backend/src/index.js:21-32` controls browser response access; it is not an access-control mechanism and does not prevent direct requests or simple cross-origin form submissions.
- Impact: If port 3000, the Nginx frontend, or another reverse proxy is reachable by an untrusted user, that user can read account usage history and IP metadata and can invoke `POST /api/sync/:monthId`, which uses the configured Excitel credentials/cookie and writes to PostgreSQL. This is an account-data disclosure and unauthorized privileged action path.
- Fix: Require authentication for every `/api` route and enforce authorization for sync operations. Keep the service bound to loopback/private networks as a defense-in-depth measure, but do not treat CORS as authentication. If browser cookies are used for auth, add CSRF protection and explicit Origin/Referer validation for the sync action.
- Mitigation: Do not publish ports 3000 or 3080 directly to the Internet; keep the reverse proxy and database on private networks and restrict access with host/network firewall rules until auth is implemented.
- False positive notes: `SECURITY.md` and `README.md` explicitly document local/private-only use and warn not to expose the API. That reduces the intended deployment scope but does not remove the application-level finding if the deployment boundary changes.

### H-02 — Manual sync is an unauthenticated, unthrottled resource-exhaustion path

- Rule IDs: `EXPRESS-AUTH-001`, `EXPRESS-DOS-001`, `EXPRESS-BODY-001`
- Location: `backend/src/routes/api.js:115-152`; `backend/src/services/syncService.js:28-31,70-93`; `backend/src/services/excitelApi.js:56-93`
- Evidence:

  ```js
  const result = await syncMonth(monthId);
  ```

  There is no rate limit, per-month lock, queue, or concurrent-sync guard around the action. A sync accepts the upstream session array and performs one database write per session, while the upstream JSON response has no explicit byte/session-count cap.
- Impact: Repeated or concurrent requests can cause duplicate outbound logins/fetches, consume the PostgreSQL pool, consume CPU/disk while importing sessions, and trigger upstream account/API throttling. The risk is High when the API is network-reachable and Medium for the documented local-only deployment.
- Fix: Protect the route with auth, rate-limit by authenticated principal and source, serialize one sync per month/account, and bound upstream response size and record count. Add query/transaction timeouts and reject month values outside an explicit supported range rather than accepting any four-digit year.
- Mitigation: Remove the manual endpoint from public exposure and rely on the scheduled worker until these controls exist.
- False positive notes: The upstream provider may enforce its own limits, but no such control is visible in this repository and it would not protect the local database from repeated writes.

## Medium severity findings

### M-01 — A GET endpoint performs database writes

- Rule IDs: `EXPRESS-CSRF-001`, `EXPRESS-INPUT-001`
- Location: `backend/src/routes/api.js:29-55`
- Evidence:

  ```js
  router.get('/sessions/:monthId', async (req, res) => {
    // ...
    await pool.query(`INSERT INTO months ...`, [monthId, monthTitle]);
  });
  ```

- Impact: A read request for any structurally valid month can create a new row, including arbitrary years accepted by `MONTH_ID_PATTERN`. GET requests can be triggered by cross-site navigation or embedded requests without relying on CORS, allowing database pollution and misleading archive data.
- Fix: Make GET strictly read-only. Move month creation to the sync/import path or a protected POST endpoint, and validate against a supported date range or the set of months returned by the upstream service.
- Mitigation: Keep the API private and monitor unexpected growth in `months`.
- False positive notes: The inserted month is bounded by the regex and parameterized SQL, so this is not SQL injection; the issue is the state-changing GET semantics and weak business validation.

### M-02 — Worker container has no explicit non-root runtime user

- Rule ID: `DEPLOY-CONTAINER-001`
- Location: `docker/worker/Dockerfile:1-14`
- Evidence: The worker Dockerfile installs `postgresql-client`, copies application code, and starts Bun, but contains no `USER` instruction. The backend image explicitly uses `USER bun` at `docker/backend/Dockerfile:10-14`, so the worker lacks the equivalent hardening.
- Impact: A dependency or parsing compromise in the worker receives the base image's default privileges and can modify the application and backup volume more broadly than necessary. This is container-level impact, not host-root access by itself.
- Fix: Run the worker as a dedicated unprivileged user, make only `/app/backups` writable, and drop unnecessary Linux capabilities. Consider a read-only root filesystem and separate backup credentials where the deployment permits.
- Mitigation: Restrict the worker's network access to PostgreSQL and the required Excitel host, and protect the backup volume.
- False positive notes: Verify the default user of the exact `oven/bun:1` image in the deployment registry; the Dockerfile currently does not make the security posture explicit.

### M-03 — Database connection URL is passed to backup tools as a command-line argument

- Rule ID: `SECRET-HANDLING-001`
- Location: `worker/src/services/backupService.js:26-46,82-101`; `docker-compose.yml:71-76`
- Evidence:

  ```js
  await $`pg_dump -Fc -f ${filepath} ${process.env.DATABASE_URL}`.quiet();
  await $`pg_restore --clean --if-exists -d ${process.env.DATABASE_URL} ${filepath}`.quiet();
  ```

- Impact: `DATABASE_URL` contains the database password in the Compose configuration and is also supplied as a process argument to `pg_dump`/`pg_restore`. Process inspection, diagnostics, or accidental command-line capture inside the worker/container can expose the credential.
- Fix: Use a protected PostgreSQL password file or `PGPASSWORD`/secret-file mechanism and pass host, port, user, and database separately without putting the password in argv. Avoid logging full command lines, and rotate credentials if they are ever exposed.
- Mitigation: Keep the worker isolated and unprivileged, and restrict access to Docker process inspection and the backup volume.
- False positive notes: The argument is not printed by this code and Docker normally isolates container processes; this remains avoidable secret exposure in the process table.

## Low severity and defense-in-depth findings

### L-01 — CSP permits inline styles

- Rule IDs: `REACT-CSP-001`, `JS-CSP-001`
- Location: `docker/frontend/nginx.conf:8-15`
- Evidence:

  ```nginx
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  ```

- Impact: `unsafe-inline` weakens CSP's defense-in-depth value for style injection. The reviewed React code does not use raw HTML or dynamic script sinks, so this is not a confirmed XSS path.
- Fix: If practical, replace inline style attributes with classes/CSS custom properties and remove `unsafe-inline`; otherwise document the tradeoff and keep `script-src 'self'` strict.
- Mitigation: Preserve the existing `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and `X-Frame-Options: DENY` controls.
- False positive notes: The inline styles appear data-driven and intentional; removing the directive without refactoring would break the UI.

### L-02 — Base images use mutable tags and there is no visible dependency scanning workflow

- Rule IDs: `EXPRESS-DEPS-001`, `REACT-SUPPLY-001`
- Location: `docker/backend/Dockerfile:1`; `docker/worker/Dockerfile:1`; `docker/frontend/Dockerfile:2,17`; `docker-compose.yml:3`
- Evidence: Images use `oven/bun:1`, `nginx:alpine`, and `postgres:16-alpine`. The repository has Bun lockfiles and frozen-lockfile Docker installs, but no CI configuration or dependency audit step is present in the reviewed files.
- Impact: Rebuilds can pick up changing base-image contents, and dependency advisories may not be detected automatically.
- Fix: Pin production base images by digest, maintain an update process, and add CI SCA/dependency scanning with review of runtime-critical packages. Keep the existing frozen lockfile installs.
- Mitigation: Rebuild regularly from trusted registries and review lockfile changes.
- False positive notes: This finding does not assert a currently exploitable CVE; it concerns reproducibility and detection coverage.

## Positive controls verified

- SQL statements use PostgreSQL parameters rather than interpolating request values (`backend/src/routes/api.js` and `backend/src/services/syncService.js`).
- Express disables `x-powered-by`, uses Helmet, bounds JSON bodies to 100 KB, and has generic 404/error responses (`backend/src/index.js:18-57`).
- Compose binds PostgreSQL, backend, and frontend host ports to `127.0.0.1` by default (`docker-compose.yml:13-14,38-39,62-63`).
- Nginx sets CSP, `nosniff`, clickjacking protection, referrer policy, and a permissions policy (`docker/frontend/nginx.conf:8-15`).
- No React raw HTML sinks, eval-like APIs, unsafe navigation, `postMessage`, or auth-token use in Web Storage were found in the reviewed frontend.
- `.env` is ignored by Git and excluded from the Docker build context; no tracked environment/credential artifact was found.
- Dependency lockfiles are present for the root, backend, and worker packages.

## Verification performed

- `bun run lint` — passed.
- `bun test` — 8 passed, 0 failed.
- `bun run build` — passed.
- `docker compose ps` — database and backend healthy; frontend and worker running during review.

## Recommended remediation order

1. Address H-01 by defining the intended authentication boundary and protecting all API routes, especially manual sync.
2. Address H-02 with rate limiting, sync serialization, and upstream/database resource caps.
3. Remove the state-changing behavior from GET in M-01.
4. Harden the worker runtime and backup credential handling (M-02 and M-03).

## Remediation status

Follow-up actions applied on 2026-08-02 against the current TypeScript tree:

- H-02: added API and manual-sync rate limits, a single in-process sync lock, bounded upstream response/session/month counts, bounded JSON reading, retry limits, input normalization, and PostgreSQL query/statement timeouts.
- M-01: made `GET /api/sessions/:monthId` read-only, removed the hard-coded month insert, and added explicit month-year bounds. A missing requested month is returned as an in-memory option instead of being persisted.
- M-02: runs the worker as the unprivileged `bun` user with dropped capabilities, `no-new-privileges`, a read-only root filesystem, and a writable backup volume/tmpfs only.
- M-03: changed `pg_dump` and `pg_restore` to use a short-lived mode-0600 `.pgpass` file and separate connection arguments; the database URL is no longer passed as a command-line argument.
- H-01: added an opt-in server-side Basic Auth gate for every `/api` route, explicit trusted-origin checks for sync, and documentation/configuration for enabling it. It remains disabled by default for the documented loopback-only setup; set `API_AUTH_REQUIRED=true` with server-only credentials before any non-local exposure.

L-01 remains a deliberate trade-off because the UI currently uses data-driven inline styles. L-02 remains an operational follow-up: production base images should be pinned by digest and CI dependency/image scanning should be added.

The repository checks passed after remediation (`bun run typecheck:all`, `bun run lint`, `bun test`, `bun run build`, and `docker compose config --quiet`). The required Docker rebuild was attempted twice, but Docker Desktop timed out resolving the uncached public `oven/bun:1` manifest; no container health result could be obtained from the rebuilt stack.
