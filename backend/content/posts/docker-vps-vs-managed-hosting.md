---
slug: docker-vps-vs-managed-hosting
title: Your own VPS with Docker, or managed hosting? Costs and trade-offs
excerpt: Where an application runs affects cost, control and who gets woken up at night. A plain comparison.
cover: /blog/docker-vps-vs-managed-hosting.svg
cover_alt: Managed hosting compared with your own VPS running Docker
---
> **In short:** Managed hosting is easy. A VPS with Docker gives control and fixed cost, but someone must maintain it.

## Managed platforms
Services such as Vercel for a Next.js front end take care of servers for you.

**Pros:** quick to set up, automatic HTTPS, little to maintain, good for front ends.
**Cons:** cost can grow with usage, less control, and a backend with a database and background workers often needs separate services anyway.

## Your own VPS with Docker
You rent a server. The application, database, cache and worker run as containers, described in files that can be recreated on another server. I use Docker Compose and Dokploy for this.

**Pros:** a predictable monthly cost, full control, the whole system in one place, and the setup is written down in files, not in someone's memory.
**Cons:** **you or I must look after it.** That means updates, backups, monitoring and security. A server left alone slowly becomes a risk.

## What I usually suggest
- Public front end on a managed host, backend and database on a VPS. The pieces each get what they need.
- Backups tested at least once. A backup that has never been restored is a hope, not a backup.
- Secrets kept in environment variables, never in the code.

## Questions to ask any developer
1. Who updates the server, and how often?
2. Where are backups, and has a restore been tried?
3. If you disappear, can someone else run this from the files?

Deployment setup is a service I offer, agreed per project.
