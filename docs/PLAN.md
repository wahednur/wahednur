# Plan

## Goal
Win freelance work (marketplaces, direct clients) and remote jobs. A visitor should understand in seconds what I build and who it is for, and trust it because every claim is checkable.

## Content rules
- No fake statistics, skill-percentage bars, invented testimonials or client logos.
- Every project is labelled: own product, client project, or demo.
- Planned work (SaaS roadmap, AI assistants) appears only under a "Roadmap · planned" label.
- No numbers (growth, uptime, users) unless real data exists.
- Do not publish personal details the owner has asked to keep private (the meter-repair business is shown only as a built system).
- Client organisations are named only where the owner has permission.

## Design direction
Dark navy surface, teal accent carried over from the previous site, thin borders, mono labels, restrained motion. Technical and trustworthy, readable first. Contrast stays at accessible levels and layouts work at phone width.

## Architecture
Monorepo. Backend and frontends are separate apps and never share dependencies.

- `backend/` Django 5.2 LTS + DRF, PostgreSQL, Redis, Celery. Business logic in `services.py`.
- `frontend/` Next.js: public site now, client panel later.
- `admin/` React + Vite + TypeScript: owner dashboard (leads, projects, content).

## Phases (one module at a time)
1. **Public site (frontend only)** - Home, case studies, Services, About, Contact, sitemap/robots done. Next: real screenshots, OpenGraph image, copy review.
2. **Backend foundation** - Django project, split settings, health endpoint, tests; leads/contact API (replaces `mailto`); project content API.
3. **Contact form + lead capture** wired to the API, spam protection, email notification.
4. **Admin dashboard** - leads inbox, project and content editing.
5. **Client panel** - only if there is a real need (project status and files for active clients).
6. **Deploy** - Docker on VPS (Dokploy), domain switch from `legacy/` to the new site.

## Decisions
- Old app moved to `legacy/` (history kept with `git mv`) so the new apps can use the repo root layout. Deployment must be re-pointed to `frontend/` only when the new site is ready to replace the old one.
- Phase 1 ships without a backend so the site can be live early; the contact link is `mailto:` until Phase 3.

## Open questions for the owner
- Case studies: screenshots and real workflow details for ekhaneikini and the service system.
- Bangla version: needed now or later?
- Domain: `wahednur.tech` now, `wahednur.com` when bought. Redirect plan.
- Booking/calendar link for discovery calls?
