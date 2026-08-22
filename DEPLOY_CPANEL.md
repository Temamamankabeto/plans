# Deploying to cPanel — plan.osdavc.com

This project is deployed as a single folder on cPanel using **Setup Node.js App**
(Phusion Passenger) + a **MySQL** database, with the built-in migration/seed
scripts in `scripts/db/` and `database/migrations/`.

## What changed for cPanel deployment

- **`server.js`** (new) — Passenger needs a plain `.js` entry file it can run
  directly with `node`. It cannot execute `npm start` or `next start`. This
  file boots Next.js in production mode and listens on `process.env.PORT`
  (the port Passenger assigns automatically).
- **`next.config.ts`** — removed `output: "standalone"`. We serve directly
  from the full install instead, so the app root stays a single folder that
  also contains `scripts/db/` and `database/migrations/` — no copying static
  assets between folders.
- **`package.json`** — added `"postinstall": "next build"` and an `engines`
  field. This means cPanel's **"Run NPM Install"** button also triggers the
  production build automatically, even if you don't have terminal/SSH access.

## 1. Create the subdomain

cPanel → **Domains** → create `plan` as a subdomain of `osdavc.com`.
Note the document root it creates, e.g. `/home/USERNAME/plan.osdavc.com`.

## 2. Create the MySQL database

cPanel → **MySQL Databases**:
- Create database, e.g. `osdavc_plan` (cPanel prefixes with your username)
- Create a user, e.g. `osdavc_planuser`, with a strong password
- Add user to database with **All Privileges**

## 3. Upload this project

Upload the contents of this zip into the subdomain's folder
(`/home/USERNAME/plan.osdavc.com`), **excluding** `node_modules` and `.next`
(they aren't included in this zip — cPanel will generate them).

## 4. Set up the Node.js App

cPanel → **Setup Node.js App** → **Create Application**:
- **Node.js version:** 18.18+ or 20.x (must support Next.js 15 / React 19)
- **Application mode:** Production
- **Application root:** `plan.osdavc.com`
- **Application URL:** `plan.osdavc.com`
- **Application startup file:** `server.js`

Click **Create**.

## 5. Set environment variables

In the same Node.js App screen, add these under **Environment Variables**
(these match what `lib/server/db.ts` and `scripts/db/config.js` already read):

```
NODE_ENV=production
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=osdavc_plan
MYSQL_USER=osdavc_planuser
MYSQL_PASSWORD=your-real-password
MYSQL_CONNECTION_LIMIT=10
JWT_SECRET=generate-a-long-random-value-here
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_API_TIMEOUT=15000
```

Do **not** upload your local `.env` file with dev values (e.g. port `3307`) —
use the environment variables screen above instead, which is what Passenger
actually injects into the running process.

## 6. Install dependencies + build

Click **Run NPM Install** in the Setup Node.js App screen.
This runs `npm install`, which triggers `postinstall` → `next build` automatically.

If you have SSH/Terminal access instead, you can run this manually in the
app's virtual environment (cPanel shows the exact `source .../bin/activate`
command to enter it first):

```bash
npm install
npm run build
```

## 7. Run database migrations and seeders

Using cPanel **Terminal** (or SSH), inside the app's Node virtual environment:

```bash
npm run db:create     # creates the database if it doesn't exist yet
npm run db:migrate    # runs everything in database/migrations/, tracked in _migrations table
npm run db:seed       # runs everything in database/seeders/
```

Or all at once:

```bash
npm run db:setup
```

For a full wipe + rebuild (drops all tables first):

```bash
npm run db:fresh
```

These scripts already read your `.env` file (via `scripts/db/config.js`), so
make sure a `.env` file with the **production** values exists in the app root
when you run them (the environment variables you set in step 5 are only
injected into the Passenger-managed app process, not into a plain `node`
shell command — so for these CLI scripts, create a real `.env` file on the
server with the same production values).

## 8. Restart the app

Back in **Setup Node.js App**, click **Restart**.

## 9. SSL

cPanel → **SSL/TLS Status** → make sure `plan.osdavc.com` has a certificate
(AutoSSL usually issues one automatically once the subdomain exists and DNS
resolves).

## 10. Test

Visit `https://plan.osdavc.com/login`. If it doesn't load, check the app's
log viewer in Setup Node.js App (stderr.log) for errors.

## Notes

- `middleware.ts` only checks for a `token`/`user` cookie — no DB calls — so
  it works fine as-is regardless of runtime.
- No API routes use the Edge runtime, so a normal Node server (via `server.js`)
  handles everything correctly, including the `mysql2` calls in `lib/server/db.ts`.
- Whenever you add a new file to `database/migrations/`, just re-run
  `npm run db:migrate` — already-applied migrations are tracked in the
  `_migrations` table and are skipped automatically.
