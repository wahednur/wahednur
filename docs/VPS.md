# Backend on a plain VPS (Docker + Caddy)

Primary path. The site (frontend) stays on Vercel; this VPS runs only the API: `db` (PostgreSQL 18), `redis`, `api`, `worker` and `caddy` (automatic HTTPS). Dokploy is optional; see `DEPLOYMENT.md`.

Checked in a real Docker environment: the compose profiles, the Caddy configuration, and backup, restore and pruning on PostgreSQL 18.6. Not checked here (needs your server): real HTTPS certificates, DNS, Resend delivery.

## 1. Prepare the server (Ubuntu 22.04/24.04)

```bash
# as root, once
adduser deploy && usermod -aG sudo deploy
apt update && apt install -y ufw fail2ban curl git
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw allow 443/udp && ufw enable
curl -fsSL https://get.docker.com | sh && usermod -aG docker deploy
```
Then log in as `deploy` (use an SSH key; disable password login in `/etc/ssh/sshd_config`). Only 22, 80 and 443 are open. PostgreSQL and Redis are never published.

## 2. DNS

Add an `A` record: `api.wahednur.tech` to the VPS IP. If you turn on Cloudflare's orange cloud, set SSL mode to **Full (strict)** and use `NUM_PROXIES=2`; with DNS only, use `1`.

## 3. Resend

Verify your domain in Resend, create an API key. Until the domain is verified, Resend only delivers to your own account address.

## 4. Deploy

```bash
git clone -b main https://github.com/wahednur/wahednur.git && cd wahednur   # use `portfolio` until you merge
cp .env.example .env && chmod 600 .env && nano .env
```
Fill in `.env` (generate secrets with `openssl rand -hex 32`):

| Variable | Value |
|---|---|
| `COMPOSE_PROFILES` | `proxy` (leave as is) |
| `API_DOMAIN` | `api.wahednur.tech` |
| `ALLOWED_HOSTS` | `api.wahednur.tech` |
| `CORS_ALLOWED_ORIGINS` | `https://www.wahednur.tech,https://wahednur.tech` |
| `CSRF_TRUSTED_ORIGINS` | `https://api.wahednur.tech` |
| `SECRET_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | random, hex |
| `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_NOTIFY_TO` | from Resend / your address |
| `NUM_PROXIES` | `1` (or `2` behind Cloudflare) |
| `FRONTEND_URL` | `https://www.wahednur.tech` (the address people sign in on) |
| `COOKIE_DOMAIN` | `.wahednur.tech` (leading dot, so www and api share the sign-in cookie) |
| `REQUIRE_STAFF_MFA` | `true` |
| `R2_PRIVATE_ACCOUNT_ID`, `R2_PRIVATE_ACCESS_KEY_ID`, `R2_PRIVATE_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET` | **required in production**: without them uploaded documents go to the container's disk and are lost on the next deploy |
| `REVALIDATE_SECRET` | random hex, the same value as on Vercel |
| `INVOICE_PAYMENT_NOTE`, `BUSINESS_NAME`, `BUSINESS_ADDRESS` | printed on invoices and shown to shop buyers |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional; redirect URI `https://api.wahednur.tech/accounts/google/login/callback/` |
| `AI_PROVIDERS` and its key | optional; empty = free rule-based SEO text |

```bash
docker compose up -d --build
docker compose ps                        # all healthy
docker compose exec api python manage.py bootstrap_owner --email you@example.com   # asks for a password; email is marked verified
curl https://api.wahednur.tech/api/health/    # {"status":"ok",...}
```
Caddy gets the HTTPS certificate on first request (DNS must already point here and ports 80/443 must be reachable).

### One-time: moving an existing database to the email login model

Staff now sign in with their **email address** (custom user model `accounts.User`). A database that already ran the old migrations cannot switch models in place: the next deploy would crash with `InconsistentMigrationHistory`, which looks like a 502. Do this once, before deploying the version that has `accounts`. Nothing is lost except staff users (create them again).

1. Optional, only if the database holds real leads you want to keep (the file contains personal data, delete it afterwards):
   ```bash
   docker compose exec -T api python manage.py dumpdata leads --indent 2 > leads.json
   ```
   (On Dokploy: run the same command in the `api` container's terminal and copy the output out.)
2. Empty the database (psql in the db container or Dokploy's database terminal):
   ```sql
   DROP SCHEMA public CASCADE; CREATE SCHEMA public;
   ```
3. Deploy the new version. With `RUN_MIGRATIONS=1` the tables are created.
4. If you kept leads: `docker compose exec -T api python manage.py loaddata /dev/stdin < leads.json`, then delete `leads.json`.
5. `python manage.py createsuperuser` and sign in at `/manage-site/` with the email.

A brand-new database needs none of this.

## 5. Connect Vercel

In Vercel, project settings:
- **Root Directory**: `frontend` (`frontend/vercel.json` already sets the Next.js framework and bun commands; Vercel does not use the Dockerfile)
- **Environment variable** `NEXT_PUBLIC_API_URL` = `https://api.wahednur.tech` (Production; add Preview if you want preview deployments to submit the form)
- Redeploy after changing it: the value is baked in at build time.

Preview deployments live on `*.vercel.app`, which is not in `CORS_ALLOWED_ORIGINS`, so the form will be refused there unless you add that exact preview origin.

## 6. Backups (do this before real leads arrive)

```bash
chmod +x deploy/backup.sh
crontab -e
# every night at 02:30; keeps 14 days locally
30 2 * * * cd /home/deploy/wahednur && ./deploy/backup.sh >> /var/log/wahednur-backup.log 2>&1
```
`BACKUP_DIR` (default `/var/backups/wahednur`, create it and give `deploy` write access) and `KEEP_DAYS` can be set in the crontab line. For an off-server copy install `rclone`, configure a remote (for example Cloudflare R2) and add `RCLONE_REMOTE=r2:your-bucket` to the line.

**Test a restore once**, into a scratch database:
```bash
docker compose exec -T db psql -U wahednur -c "create database restore_test;"
gzip -dc /var/backups/wahednur/<file>.sql.gz | docker compose exec -T db psql -U wahednur -d restore_test -q
docker compose exec -T db psql -U wahednur -d restore_test -c "select count(*) from leads_lead;"
docker compose exec -T db psql -U wahednur -c "drop database restore_test;"
```

## 7. Updating

```bash
cd ~/wahednur && git pull && docker compose up -d --build
```
Migrations run when `api` starts. Run `./deploy/backup.sh` first for any release with migrations. Roll back with `git checkout <previous-commit> && docker compose up -d --build` (migrations are not undone).

## 8. Checks and troubleshooting

How the API reports health: `/api/health/live/` only says the process is up (the container health check uses it, so a database or Redis hiccup never restarts the app). `/api/health/` also checks the database and cache and returns 503 when degraded (use it for uptime monitoring).

What the container log says when something is wrong (all reproduced with the real image):

| Log line | Meaning |
|---|---|
| `ImproperlyConfigured: Set the SECRET_KEY environment variable` | a required value is missing (`SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`) |
| `OperationalError: connection failed ... refused` right after start, container `Exited (1)` | `RUN_MIGRATIONS=1` and the database host/port/password is wrong or unreachable: the app exits and the platform restarts it in a loop, which shows as **502** |
| `/api/health/` returns `"cache":"down"` | `REDIS_CACHE_URL` is wrong (one URL only, no spaces or commas) |
| 400 on `api.wahednur.tech` only | the API host is missing from `ALLOWED_HOSTS` |

**502 Bad Gateway from `https://api...`** means the proxy is up but the API behind it is not answering. Run, on the VPS:
```bash
cd ~/wahednur
docker compose ps                         # api should say "healthy"; if it is restarting or exited, that is the cause
docker compose logs --tail=60 api         # the real error (missing env value, migration, database)
docker compose logs --tail=30 caddy       # certificate or upstream errors
curl -s -H "Host: api.wahednur.tech" -H "X-Forwarded-Proto: https" http://127.0.0.1:8000/api/health/   # only works if you temporarily publish 8000; otherwise: docker compose exec api python healthcheck.py && echo healthy
```

| Symptom | Look at |
|---|---|
| 502 with a Cloudflare-branded page | Cloudflare cannot reach the server: SSL mode must be Full (strict), ports 80/443 open, and the Caddy certificate issued |
| No HTTPS certificate | `docker compose logs caddy`: DNS not pointing here yet, or port 80/443 blocked |
| 502, `api` exited or restarting | `docker compose logs api`: usually a missing `.env` value |
| 400 "Host" error from the API | `ALLOWED_HOSTS` must hold bare host names (`api.wahednur.tech`), never `https://...`, and must include the API hostname |
| CORS error in the browser | the site origin is missing from `CORS_ALLOWED_ORIGINS` (exact, with `https://`) |
| Form falls back to the email app | `NEXT_PUBLIC_API_URL` was empty at Vercel build time |
| Leads saved but no email | the lead's `notify_error` in the Django admin, then `docker compose logs worker`; verify the Resend domain |
| Everyone is "rate limited" | `NUM_PROXIES` too low behind Cloudflare |

Routine care: `docker system prune -f` now and then, `apt upgrade` monthly, watch disk space (`df -h`).

## 9. After the first deploy (checklist)

1. `docker compose ps`: db, redis, api, worker, caddy all up; `curl https://api.wahednur.tech/api/health/` says ok.
2. `docker compose exec api python manage.py bootstrap_owner --email you@example.com`, then sign in at `https://www.wahednur.tech/login`, open `/app/security` and turn on two-factor authentication. Until you do, owner features (accounting, staff writes) answer 403 on purpose.
3. Vercel: `NEXT_PUBLIC_API_URL`, `REVALIDATE_SECRET` (same as the VPS), and later `NEXT_PUBLIC_SHOW_BLOG`, `NEXT_PUBLIC_SHOW_PACKAGES`, `NEXT_PUBLIC_SHOW_SHOP`. Redeploy.
4. Upload a test PDF in `/app/documents`, then check the object appears in the private R2 bucket (and that the bucket has no public access).
5. Django admin (`/manage-site/`): add your services, packages, products, delivery zones and stock.
6. Place one small test shop order and one test invoice payment end to end, then cancel or refund them.
7. Set up the nightly backup (section 6) and test a restore once.


## 10. Where the `.env` goes, and which variables you actually need

- `docker compose` reads **`.env` in the same folder as `docker-compose.yml`** (the repository root, on the VPS). It does **not** read `backend/.env`; that file is only for running `python manage.py` on your own computer. If compose says a variable "is missing a value" although you wrote it, you edited the wrong file or are in the wrong folder (`ls -la .env` next to `docker-compose.yml`).
- This compose file starts its **own** PostgreSQL and Redis. So it needs `POSTGRES_PASSWORD` and `REDIS_PASSWORD` and builds `DATABASE_URL`, `REDIS_CACHE_URL` and `CELERY_BROKER_URL` itself. Do not put those three in the root `.env`.
- Do not run `docker compose up` on your Windows computer for development. Use `python manage.py runserver` and `bun run dev` there.
- Never point your computer's `backend/.env` at the live database: `migrate`, `bootstrap_owner` and tests would then change live data. Keep a separate local database.
- On the live site `FRONTEND_URL` must be `https://www.wahednur.tech` (not `http://localhost:3000`): it decides which site may sign in and where email links point.
- `SECRET_KEY` must be a long random value (`openssl rand -hex 32`), never a word.

Minimal root `.env` for the VPS (replace every value; never paste real ones in chat):
```
COMPOSE_PROFILES=proxy
API_DOMAIN=api.wahednur.tech
SECRET_KEY=<openssl rand -hex 32>
POSTGRES_PASSWORD=<openssl rand -hex 24>
REDIS_PASSWORD=<openssl rand -hex 24>
ALLOWED_HOSTS=api.wahednur.tech
CORS_ALLOWED_ORIGINS=https://www.wahednur.tech,https://wahednur.tech
CSRF_TRUSTED_ORIGINS=https://api.wahednur.tech
FRONTEND_URL=https://www.wahednur.tech
COOKIE_DOMAIN=.wahednur.tech
REQUIRE_STAFF_MFA=true
NUM_PROXIES=1
LEADS_NOTIFY_TO=wahednur@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_HOST_USER=wahednur@gmail.com
EMAIL_HOST_PASSWORD=<gmail app password>
EMAIL_FROM=wahednur@gmail.com
R2_PRIVATE_ACCOUNT_ID=...  R2_PRIVATE_ACCESS_KEY_ID=...  R2_PRIVATE_SECRET_ACCESS_KEY=...  R2_PRIVATE_BUCKET=wahednur-private
```
Check it before starting: `docker compose config > /dev/null && echo OK` prints nothing but OK when every required value is present.

### Dokploy instead of a plain VPS
If the API runs on Dokploy, there is no `.env` file: paste the same variables into the service's **Environment** tab, leave `COMPOSE_PROFILES` empty, and use Dokploy's own domain/HTTPS. Database and Redis then come from this same compose file unless you remove them and give `DATABASE_URL`, `REDIS_CACHE_URL`, `CELERY_BROKER_URL` yourself.
