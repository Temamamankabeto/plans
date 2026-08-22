# plans.osdavc.com — GitHub Actions + SSH deployment

This project is configured so **GitHub Actions performs the expensive Next.js build**. The cPanel server only receives the already-built standalone app, runs safe SQL migrations, and restarts the Node application.

## Production architecture

`git push` → GitHub Actions → `npm ci` → `npm run build` → SSH/rsync → cPanel → `db:migrate` → restart.

The workflow deliberately does **not** run `npm run build` on cPanel.

## GitHub repository secrets

Create these under **GitHub → repository → Settings → Secrets and variables → Actions**:

- `SSH_HOST` — real cPanel SSH hostname, not Cloudflare/proxied web hostname
- `SSH_PORT` — SSH port, usually `22`
- `SSH_USER` — cPanel SSH username
- `SSH_PRIVATE_KEY` — private deployment key used by GitHub Actions
- `DEPLOY_PATH` — absolute application path, e.g. `/home/USERNAME/plans.osdavc.com`

Do not place the production database password or JWT secret in the workflow. Keep them in the server-side `.env` file.

## Production .env on cPanel

Create `$DEPLOY_PATH/.env` manually and keep it on the server. Example:

```env
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_API_TIMEOUT=15000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=CPANEL_DB_NAME
MYSQL_USER=CPANEL_DB_USER
MYSQL_PASSWORD=CHANGE_ME
MYSQL_CONNECTION_LIMIT=10

JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
```

The deployment excludes `.env`, so future deployments do not overwrite it.

## cPanel Node.js App

Use cPanel **Setup Node.js App**:

- Mode: Production
- Node.js: 20.x or another version supported by Next.js 15
- Application root: the same directory as `DEPLOY_PATH`
- Application URL: `https://plans.osdavc.com`
- Startup file: `server.js`

The standalone Next.js build contains its own production server file.

## Existing files on the domain

The workflow uses `rsync --delete`. Files in `DEPLOY_PATH` that are not part of the new release are removed, except `.env` and `.git` which are explicitly excluded. Back up the existing directory before the first deployment if it contains anything you need.

## Database policy

Deployment runs only:

```bash
node scripts/db/migrate.js
```

It does **not** run `db:fresh`, `db:reset`, or seeders. This preserves production data.

Run production seeders manually only when you intentionally need them.
