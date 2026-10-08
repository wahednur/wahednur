# Admin dashboard (React + Vite)

A separate app in `admin/` for the owner and staff. It is a single-page app with no search-engine pages, so it uses React and Vite instead of Next.js. It talks to the same API as the website and uses the same sign-in (email, password and the two-step code). It never holds a secret: the session cookie is HttpOnly and set by the API.

## Screens
Overview (what needs you), Projects (create, move status), Billing (create and edit draft quotations and invoices with a live total and a payment plan; send, mark accepted or rejected, turn an accepted quotation into an invoice; invoice detail with payments, issue, cancel, PDF), Services & packages (add, edit, hide or delete services and their packages: price, currency, billing cycle, delivery days, revisions, what is included), Package requests (accept or decline), Shop orders (confirm payment, ship, deliver), Subscriptions (pause, resume, cancel), Clients, Content (publish or hide; writing and the SEO panel stay in the website's editor), Accounting (owner only).

Still on the website for now: writing and editing posts, products and stock, delivery areas, milestones and project notes, documents. They will move here one at a time.

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
