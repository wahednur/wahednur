# wahednur

Personal portfolio and services platform of **Abdul Wahed Nur**, Full-Stack Developer (Django + Next.js).

> Status: rebuild in progress. The previous site lives untouched in [`legacy/`](legacy/).

## Layout

| Folder | What | Stack | State |
|---|---|---|---|
| `frontend/` | Public site (later: client panel) | Next.js, Tailwind CSS | Home page done |
| `backend/` | API (contact/leads, content, client panel) | Django, DRF, PostgreSQL, Redis, Celery | Not started |
| `admin/` | Owner dashboard | React + Vite + TypeScript | Not started |
| `legacy/` | Previous Next.js + MongoDB site | | Frozen, not deployed from here |
| `docs/` | Plan and decisions | | |

See [`docs/PLAN.md`](docs/PLAN.md) for the roadmap and [`PROGRESS.md`](PROGRESS.md) for current status.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```
