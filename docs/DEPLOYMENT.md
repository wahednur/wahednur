# Deployment (Dokploy, optional)

> **Primary path is now a plain VPS with Docker and Caddy: see `VPS.md`.** This page covers Dokploy only. With Dokploy, leave `COMPOSE_PROFILES` empty (no Caddy) and add `frontend` to it only if you host the site there too.

One Docker Compose stack runs everything: `frontend` (Next.js), `api` (Django + gunicorn), `worker` (Celery), `db` (PostgreSQL 18), `redis` (Redis 8). The files: `docker-compose.yml` (repo root), `backend/Dockerfile`, `frontend/Dockerfile`, `.env.example`.

## What is verified, and what is not

Verified in a real Docker environment (images built from these Dockerfiles, full stack started, PostgreSQL 18.6, Redis 8.10, Node 24.21):
- both images build; containers run as non-root; all five services become healthy
- migrations run on `api` start; data survives `down`/`up`
- `/api/health/` works behind proxy headers, plain HTTP is redirected to HTTPS, a wrong Host is rejected (400), the Django admin only answers at `ADMIN_URL`, admin CSS is served
- CORS allows only the configured origin
- a submitted lead is saved, the worker picks it up and retries with backoff when email fails, and the lead is kept
- frontend serves pages, the image optimizer, the résumé PDF and the sitemap; the API URL is baked into the browser JavaScript
- the 31 backend tests pass on PostgreSQL 18.6

Not verified (cannot be done from the development sandbox): Dokploy itself (the UI steps below are written from how Dokploy works; confirm labels against its current screens), real TLS/Traefik, Cloudflare, and email delivery through the real Resend.

## 1. Before you deploy

- A VPS with Dokploy installed.
- DNS: `A` records for `api.wahednur.tech`, `www.wahednur.tech` (and `wahednur.tech`) pointing at the VPS.
- Resend: add and verify your domain, create an API key. Until the domain is verified, Resend only delivers to the account owner's own address.
- Generate secrets (hex keeps database URLs safe):
  ```bash
  openssl rand -hex 32   # SECRET_KEY
  openssl rand -hex 24   # POSTGRES_PASSWORD
  openssl rand -hex 24   # REDIS_PASSWORD
  ```

## 2. Create the app in Dokploy

1. **Create Project**, then **Create Service → Compose**.
2. **Provider**: GitHub, repository `wahednur/wahednur`, the branch to deploy. **Compose Type**: Docker Compose. **Compose Path**: `./docker-compose.yml`.
3. **Environment** tab: paste the contents of `.env.example` and fill in real values.
4. **Domains** tab (HTTPS on, certificate Let's Encrypt):
   - `api.wahednur.tech` → service `api`, port `8000`
   - `www.wahednur.tech` → service `frontend`, port `3000`
   - `wahednur.tech` → service `frontend`, port `3000` (or redirect the bare domain to `www` in Cloudflare)
5. **Deploy**. The first build takes several minutes.

`docker-compose.yml` publishes no host ports on purpose; Dokploy's Traefik reaches the services over the Docker network.

## 3. After the first deploy

1. Open `https://api.wahednur.tech/api/health/` → `{"status":"ok",...}`.
2. Create the Django admin user (Dokploy: the `api` container's **Terminal**, or SSH):
   ```bash
   python manage.py createsuperuser
   ```
   Sign in at `https://api.wahednur.tech/<ADMIN_URL>` (default `/manage-site/`, not `/admin/`).
3. Open the site, submit the contact form, and confirm: the email arrives, and the lead shows `notified_at` filled in the admin. If `notified_at` is empty, read the lead's `notify_error` and the `worker` logs.

## 4. Updating

Push to the deployed branch. With **Auto Deploy** on (webhook) Dokploy rebuilds and restarts. Migrations run automatically when `api` starts. To roll back code, redeploy an earlier deployment from the **Deployments** tab. Database migrations are not rolled back automatically.

## 5. Backups (set this up before real leads arrive)

Docker volumes are not backups. Run a nightly dump and copy it off the server (for example to Cloudflare R2):

```bash
# on the VPS, from cron
docker exec "$(docker ps -qf name=db)" pg_dump -U wahednur wahednur | gzip > /backups/wahednur-$(date +%F).sql.gz
```

Check the container name filter matches (`docker ps`). Test a restore into a scratch database once; an untested backup is not a backup.

## 6. Environment reference

| Variable | Purpose |
|---|---|
| `SECRET_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | secrets; the stack refuses to start without them |
| `ALLOWED_HOSTS` | exact API hostname(s). The container health check uses the first one |
| `CORS_ALLOWED_ORIGINS` | the site origins that may call the API (with `https://`) |
| `CSRF_TRUSTED_ORIGINS` | the API origin, for the Django admin login |
| `NEXT_PUBLIC_API_URL` | API base URL baked into the site **at build time** |
| `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_NOTIFY_TO` | contact-form email |
| `NUM_PROXIES` | proxies in front of the API: `1` = Traefik only, `2` = Cloudflare orange cloud + Traefik |
| `ADMIN_URL` | path of the Django admin (keep it non-default) |

## 7. Troubleshooting

| Symptom | Cause |
|---|---|
| API returns 400 for every request | `ALLOWED_HOSTS` does not contain the hostname |
| Browser console shows a CORS error | site origin missing from `CORS_ALLOWED_ORIGINS` (check `https://` and `www`) |
| Form opens the email app instead of sending | `NEXT_PUBLIC_API_URL` was empty at build time; set it and redeploy (rebuild) |
| Everyone gets "too many messages" | `NUM_PROXIES` is too low behind Cloudflare, so all visitors share one address; set `2` |
| Leads saved but no email | check `notify_error` in the admin, `RESEND_API_KEY`, and that the sending domain is verified |
| `api` unhealthy | `docker logs` for the `api` container; usually a missing variable or the database not ready |
| Redirect loop on the API | the proxy is not sending `X-Forwarded-Proto: https` (Traefik does by default) |

## 8. Notes

- Scale only `frontend` and `worker`. `api` runs migrations at start, so running several copies at once can race.
- Pin `postgres:18` to an exact version (e.g. `postgres:18.6`) once you want upgrades to be deliberate. A major version change needs a dump and restore, not just a new image.
- Images use `python:3.13-slim` (tested) and `node:24-slim` (Active LTS). Change them with the `PYTHON_IMAGE` / `NODE_IMAGE` build args.
- HSTS preload is off; decide before launch.

## Website settings for content and packages
Set these in Vercel (Environment Variables), then redeploy:
- `REVALIDATE_SECRET`: the same long random value as on the API. Without it the instant page refresh is switched off (pages still refresh within an hour).
- `NEXT_PUBLIC_SHOW_BLOG=true` and `NEXT_PUBLIC_SHOW_PACKAGES=true`: show the Blog and Packages links in the header once there is real content.

API (VPS `.env`): `REVALIDATE_SECRET` (same value), optionally `AI_PROVIDERS=anthropic` with `ANTHROPIC_API_KEY` (or gemini / groq). Leave `AI_PROVIDERS` empty to use the free rule-based SEO text. The worker container must run (it also bills subscriptions and writes SEO text).

## Shop setup (after deploy)
1. Vault: upload each downloadable file (staff, `/app/documents`). Do not tick "share with client".
2. Django admin (`/manage-site/`): add Shipping zones (name and fee), Products (set Published last), attach the vault file under "Product files" for digital products, then add stock with *Stock movements* (reason Restock). Stock is never typed into a product: it is the sum of movements.
3. Set `INVOICE_PAYMENT_NOTE` on the API (your bKash/Nagad/bank details, shown to buyers and printed on invoices) and, on Vercel, `NEXT_PUBLIC_SHOW_SHOP=true`.
4. Unpaid orders return their stock after `SHOP_PAYMENT_HOURS` (default 48). Orders where the customer reported a payment wait for you.

## Product photos
Photos go to the **public** R2 bucket (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) and are shown from `R2_PUBLIC_URL`. In Cloudflare: open that bucket, Settings, connect a custom domain such as `cdn.wahednur.tech` (or switch on the r2.dev address), then put it in `R2_PUBLIC_URL` on the VPS and redeploy. In the Django admin, edit a product and use *Photo* to upload (PNG, JPG or WEBP, up to 5 MB; SVG is refused on purpose).
Keep this bucket separate from the private vault bucket: everything in it is public.

## If sign-in codes do not arrive
Run these on the VPS, in this order:
1. `docker compose exec api python manage.py send_test_email you@example.com` sends one email immediately and prints what Resend answered (missing key, unverified domain, wrong sender).
2. `docker compose logs --tail=50 worker`: the worker sends sign-in emails in the background. If it is not running, or cannot reach Redis, nothing leaves the server.
3. Resend dashboard, Emails: shows delivered, bounced or blocked.
Common causes: the domain in `LEADS_FROM_EMAIL` is not verified in Resend (Resend then only delivers to your own account address), a wrong or revoked `RESEND_API_KEY`, or the worker container is stopped.


## Commands on Dokploy (there is no `git pull` and no `.env` file on the server)
- **Code**: Dokploy pulls from GitHub itself. In the service's **General → Provider**, the branch must be **`main`** (an old branch such as `portfolio` deploys old code). Then press **Deploy** (or turn on Auto Deploy).
- **Settings**: only the service's **Environment** tab counts. Paste `KEY=value` lines, one per line, no quotes, no `<placeholders>`; leave `COMPOSE_PROFILES` empty. Press **Save**, then **Deploy** (a changed value needs a redeploy).
- **Run a command** (for example `python manage.py send_test_email you@example.com` or `python manage.py bootstrap_owner you@example.com`): service → **Advanced → Terminal**, choose the container `api`, run the command without `docker compose exec`. Over SSH instead: `docker ps` to find the name, then `docker exec -it <api-container-name> python manage.py ...`.
- **Logs**: service → **Logs**, choose `api` or `worker`.
