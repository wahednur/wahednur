<h1 align="center">Abdul Wahed Nur</h1>
<p align="center"><b>Full-stack developer (Django + Next.js) · Bangladesh</b><br>
Online stores, business management systems and the APIs behind them.</p>

<p align="center">
  <a href="https://www.wahednur.tech">Website</a> ·
  <a href="https://www.linkedin.com/in/wahednur">LinkedIn</a> ·
  <a href="mailto:wahednur@gmail.com">Email</a> ·
  <a href="https://www.wahednur.tech/Abdul_Wahed_Nur_Resume.pdf">Resume</a>
</p>

---

## About me

I am a full-stack developer based in Sherpur, Bangladesh. I build web applications around how a business really works: the storefront, the admin side, the backend rules for money, stock and permissions, and the deployment.

I came to software through visual work. From 2010 to 2019 I worked in VFX, animation and graphics, including as assistant director on 5 or 6 TV commercials. That time taught me to present an idea clearly, and it still shapes how I design interfaces.

I learned the web step by step:

| When | What |
|---|---|
| 2010 – 2019 | Visual effects, animation, print and graphics production |
| 2014 – 2016 | First web work: websites for NGO and development-sector clients in Dhaka, with WordPress and Joomla |
| 2020 – 2021 | Defined the business logic and features of an eCommerce core system for a company in Saudi Arabia and directed its development (I did not write that code myself) |
| 2024 – 2025 | Formal MERN training (Programming Hero), then my first full applications |
| Now | Django REST Framework and PostgreSQL on the backend, Next.js and React on the front, running my own products |

The periods overlap because I worked on freelance and own projects next to other roles. The table shows kinds of work, not continuous employment.

I prefer Django because it gives a clear structure for business rules, permissions and data. Most of what I know came from building real systems for real use and keeping them running, so I design from the owner's side as well as the developer's.

## What I work with

| Layer | Tools |
|---|---|
| Backend | Python, Django, Django REST Framework, Celery, Redis |
| Data | PostgreSQL, ledger-style records for stock and money |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | Flutter |
| Delivery | Docker, VPS deployment |
| AI features | Assistants that answer only from your own database |

## What I build

- **Custom eCommerce**: storefront, admin panel and backend built around how you sell.
- **Business management applications**: inventory, invoicing, partial payments, due tracking and ledgers.
- **Admin dashboards** with permission-based access.
- **Backend APIs and integrations**: authentication, background jobs, payment gateways, couriers.
- **Improving an existing application** without a rewrite when one is not needed.
- **Deployment setup** on your own VPS.

## Systems I built and run

| Project | What it is | Status |
|---|---|---|
| [ekhaneikini.com](https://ekhaneikini.com) | My own online store: storefront, admin, API and a mobile order app. Variations, guest checkout, Cash on Delivery and SSLCommerz, courier consignments, returns, stock ledger, reports. Online since 2016. | Live |
| [Service & Parts Management System](https://nurain.vercel.app) | One open invoice collects many jobs and parts over time; customers pay in parts; customer and supplier ledgers, inventory, expenses, cashbook, profit and loss. | Live |
| [Education Management System](https://lms.wahednur.tech) | A prototype with sample data so a school can evaluate the idea. Not a production system. | Demo |

## How I work

1. **Understand** the business and the problem first, not the technology.
2. **Agree the scope in writing**: milestones, time, risk and cost before any code.
3. **Build in visible steps** you can test, with written updates.
4. **Deliver** working software, source code and handover, with deployment help if agreed.
5. **Support** afterwards if you want it, as a clearly priced monthly arrangement.

I am one developer. I say what I do not offer, I label demos as demos, and I will tell you if a ready-made tool fits you better than custom work. I work in English and Bangla.

## Get in touch

Tell me what the business needs: [wahednur.tech/contact](https://www.wahednur.tech/contact) or [wahednur@gmail.com](mailto:wahednur@gmail.com).

---

# This repository

The source of [wahednur.tech](https://www.wahednur.tech): my portfolio and services platform, including a client area (projects, quotations, invoices, documents, messages and notifications), an owner dashboard, and the API behind them.

> The earlier test portfolio is kept as a backup in the branch `backup/old-site` (tag `old-site`, commit `9cdfa2b`). It is no longer deployed or maintained.

## Layout

| Folder | What | Stack | State |
|---|---|---|---|
| `frontend/` | Public site and client area | Next.js, Tailwind CSS | Live |
| `backend/` | API (contact/leads, content, client panel) | Django, DRF, PostgreSQL, Redis, Celery | Live (see `backend/README.md`) |
| `admin/` | Owner dashboard | React + Vite + TypeScript | Live |
| `docs/` | Plan and decisions | | |

See [`docs/PLAN.md`](docs/PLAN.md) for the roadmap and [`PROGRESS.md`](PROGRESS.md) for current status.

## Target versions

| Part | Version | Notes |
|---|---|---|
| Next.js | 16.4 | pinned in `frontend/package.json` |
| React | 19.3 | latest stable (React has no LTS line) |
| Django | 5.2 LTS | latest LTS; security support to April 2028 |
| PostgreSQL | 18.6 | target for dev and production |
| Redis | 8.x | |
| Python | 3.14 locally (3.13 also works) | |

See `docs/ARCHITECTURE.md` (version policy) for how upgrades are handled. Deployment: `docs/DEPLOYMENT.md`.

## Run the frontend

```bash
cd frontend
bun install
bun run dev
```
