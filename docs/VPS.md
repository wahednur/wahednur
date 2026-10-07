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

```bash
docker compose up -d --build
docker compose ps                        # all healthy
docker compose exec api python manage.py createsuperuser
curl https://api.wahednur.tech/api/health/    # {"status":"ok",...}
```
Caddy gets the HTTPS certificate on first request (DNS must already point here and ports 80/443 must be reachable).

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
