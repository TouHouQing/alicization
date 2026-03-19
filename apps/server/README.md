# `@proj-alicization/server`

Node.js API service for Alicization web/desktop clients.

## What it does

- Serves auth endpoints (`/api/auth/*`) via better-auth.
- Serves core API endpoints (`/api/characters`, `/api/providers`, `/api/chats`).
- Persists data in PostgreSQL and auto-runs schema migration at startup.

## When to use it

- Use in production when `stage-web` needs first-party API routes on `/api/*`.
- Use in local development when testing browser-side API flows.

## When not to use it

- Do not use for static-site-only deployments.
- Do not run unauthenticated internet-facing DB ports; place API behind reverse proxy.

## Local development

```bash
cd apps/server
pnpm db:up
pnpm dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Production (same-domain with `alz.tohoqing.com`)

1. Deploy frontend static files to `/www/wwwroot/alizication` (existing workflow).
2. Deploy API + DB using workflow:
   - `.github/workflows/deploy-stage-server-api.yml`
3. Configure Nginx reverse proxy:
   - `apps/server/production/nginx/alz.tohoqing.com.conf.example`
4. Ensure Nginx forwards `/api/*` to `127.0.0.1:6112`.

### Required GitHub Secrets for API deploy workflow

- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_USER`
- `DEPLOY_PORT` (optional, defaults to `22`)
- `SERVER_REPO_DIR` (optional, defaults to `/opt/alicization`)
- `API_SERVER_URL` (optional, defaults to `https://alz.tohoqing.com`)
- `SERVER_AUTH_GOOGLE_CLIENT_ID` (or `AUTH_GOOGLE_CLIENT_ID`)
- `SERVER_AUTH_GOOGLE_CLIENT_SECRET` (or `AUTH_GOOGLE_CLIENT_SECRET`)
- `SERVER_AUTH_GITHUB_CLIENT_ID` (or `AUTH_GITHUB_CLIENT_ID`)
- `SERVER_AUTH_GITHUB_CLIENT_SECRET` (or `AUTH_GITHUB_CLIENT_SECRET`)
