---
slug: choosing-a-technology-stack
title: Choosing a technology stack: a plain guide for business owners
excerpt: You do not need to know the tools. You need to know what to ask. Here is how I choose, and the reasons I give you.
cover: /blog/choosing-a-technology-stack.svg
cover_alt: Which tool fits which need: Django, PostgreSQL, Celery with Redis, Next.js, React with TypeScript
---
> **In short:** Start from the work, not the tool. Each choice should come with a reason and a downside.

A technology stack is the set of tools a system is built with. Good choices are boring and well matched to the job.

## Start from the work, not the tool
1. **What must never go wrong?** Money, stock, permissions. These need a strict database and server-side checks.
2. **Who uses it and how often?** Staff all day need fast, clear screens. Visitors need fast pages that search engines can read.
3. **What happens when you grow?** A pile of workarounds is expensive later.

## My usual choices and why
| Need | Tool | Reason |
|---|---|---|
| Business rules and API | Django REST Framework | Clear structure for permissions and data |
| Data | PostgreSQL | Strict, reliable, good for money |
| Background work | Celery with Redis | Email, scheduled jobs, retries |
| Public site | Next.js | Pages search engines can read, fast |
| Staff screens | React with TypeScript | Tables, filters, early error catching |
| Mobile (own store only) | Flutter | Offline-first order app |
| Hosting | Docker on a VPS, or a managed host for the front end | Control and predictable cost |

## When I would choose differently
- Only a simple website: a ready-made platform.
- A team that only knows JavaScript: a Node backend may suit them better.
- A tiny internal tool: a spreadsheet plus a small script may be enough.

## What a good developer will do
Explain the choice in your language, name the downsides, and tell you when a cheaper option fits. If you only hear praise for a tool, ask about its weaknesses.
