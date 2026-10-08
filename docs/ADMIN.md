# Admin dashboard (React + Vite)

A separate app in `admin/` for the owner and staff. It is a single-page app with no search-engine pages, so it uses React and Vite instead of Next.js. It talks to the same API as the website and uses the same sign-in (email, password and the two-step code). It never holds a secret: the session cookie is HttpOnly and set by the API.

## Screens
Overview (what needs you), Projects (create, a detail page with milestones, progress, public and internal updates, edit details, move status, delete, and the project's invoices), Billing (one professional form for a quote / proposal / estimate, an invoice and a recurring invoice: pick or create the customer in a window, the address, prefix and number, dates, proposal text, items, one sales tax from the managed Tax rates list, discount as an amount or percent, a live Subtotal / Discount / Tax / Total, terms and notes, and the 40/30/30 payment plan; quote statuses Draft, Delivered, Accepted, Lost, Dead; recurring schedules with pause, resume and end; PDF), Services & packages (add, edit, hide or delete services and their packages: price, currency, billing cycle, delivery days, revisions, what is included), Package requests (accept or decline), Shop orders (confirm payment, ship, deliver), Products & delivery (add and edit products with a photo upload, stock movements for physical products, files from the vault for download products, delivery areas and fees), Subscriptions (pause, resume, cancel), Documents (upload, download, share with a client or stop sharing, delete), Clients, Content (list, and a full editor: title, address, summary, cover picture, Markdown with live preview, publish or unpublish, delete, and the search-engine text panel), Accounting (owner only).

Everything the website's `/app` could manage now lives here, so `/app` is only needed for a client's own view.

## Security
- Only staff and the owner get past the sign-in; the API checks every call again, the screens only mirror it. Staff actions need two-step sign-in (the API refuses without it).
- A client who signs in here is told the account is not staff and sees nothing.
- `X-Robots-Tag: noindex`, `robots.txt` Disallow, frame denial and HSTS are set in `admin/vercel.json`.

## Run it locally
```
cd admin
cp .env.example .env     # VITE_API_URL=http://localhost:8000
bun install
bun run dev              # http://localhost:5173
```
The API must allow the origin: `CORS_ALLOWED_ORIGINS` already lists `http://localhost:5173` in `.env.example`.

## Deploy (Vercel, a second project)
1. New Vercel project from this repo, **Root Directory `admin`**, framework Vite.
2. Environment variables: `VITE_API_URL=https://api.wahednur.tech`, `VITE_SITE_URL=https://www.wahednur.tech`. They are baked in at build time; change them and redeploy.
3. Domain `admin.wahednur.tech` on that project (DNS CNAME as Vercel shows).
4. On the API (Dokploy): add `https://admin.wahednur.tech` to `CORS_ALLOWED_ORIGINS` (comma separated, with the website) and keep `COOKIE_DOMAIN=.wahednur.tech` so the session and CSRF cookies are shared. Redeploy the API.
5. Open `https://admin.wahednur.tech` and sign in with the owner account.

If sign-in says "CSRF" or loops back to the login page, the cookie domain or the CORS list is wrong.

## Deploy with Docker (VPS or Dokploy), instead of Vercel
The admin has its own `admin/Dockerfile` (bun builds the static files, nginx serves them as a non-root user on port 8080) and a compose service `admin` behind the `admin` profile.
- Tested: the image builds, single-page routes such as `/projects/abc` open the app, `/healthz` answers, hashed files are cached for a year, `index.html` is never cached, and every response carries `noindex`, frame denial and HSTS.
- Build arguments `VITE_API_URL` and `VITE_SITE_URL` are baked in; change them and rebuild.
- **Dokploy:** add `admin` to `COMPOSE_PROFILES` (with `frontend` if you host the site there too), set `VITE_API_URL` and `VITE_SITE_URL`, deploy, then add the domain `admin.wahednur.tech` to service `admin`, port `8080`, with HTTPS on.
- **Plain VPS with Caddy:** add `ADMIN_DOMAIN=admin.wahednur.tech` to `.env`; the Caddyfile proxies it to the service when the `admin` profile is on.
- Either way the API still needs `https://admin.wahednur.tech` in `CORS_ALLOWED_ORIGINS` and `COOKIE_DOMAIN=.wahednur.tech`.
