# Security policy

Excitel Dashboard is intended for local or private use. The local Compose default keeps API authentication disabled because ports are bound to loopback. Before exposing the dashboard beyond the trusted host, set `API_AUTH_REQUIRED=true` with server-only Basic Auth credentials, use TLS at the deployment boundary, and restrict network access. Never treat CORS as authentication.

Please do not open a public issue containing:

- Excitel usernames or passwords
- `SELFCARE_COOKIE` values
- Database connection strings containing passwords
- Usage exports, database dumps, logs, or screenshots with account data or IP addresses

If you find a security issue, use GitHub's private vulnerability reporting feature after the repository is created, or contact the maintainer privately. Include reproduction steps without sharing real credentials or personal data.
