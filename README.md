# wahednur

Personal portfolio and services platform of **Abdul Wahed Nur**, Full-Stack Developer (Django + Next.js).

> Status: built from scratch. The earlier test portfolio is kept as a backup in the branch `backup/old-site` (tag `old-site`, commit `9cdfa2b`). It is no longer deployed or maintained.

## Layout

| Folder | What | Stack | State |
|---|---|---|---|
| `frontend/` | Public site (later: client panel) | Next.js, Tailwind CSS | Home page done |
| `backend/` | API (contact/leads, content, client panel) | Django, DRF, PostgreSQL, Redis, Celery | Foundation done (see `backend/README.md`) |
| `admin/` | Owner dashboard | React + Vite + TypeScript | Not started |
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
