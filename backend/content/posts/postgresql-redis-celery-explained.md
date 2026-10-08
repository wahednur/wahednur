---
slug: postgresql-redis-celery-explained
title: PostgreSQL, Redis and Celery: what each one does in a business system
excerpt: Three names that sound technical. Here is what they do for your orders, emails and reports, and what they cost to run.
---
## PostgreSQL: the memory of the business
It stores orders, customers, stock and payments. It is strict: if two people try to buy the last unit at the same time, it can make sure only one succeeds. For money and stock, strictness is the point.

**Strengths:** reliable, handles relationships well (an order has lines, payments, a customer), good with exact decimals for money.
**Costs:** needs backups and monitoring. A managed database costs money, and a self-hosted one costs attention.

## Redis: fast short-term memory
It keeps data that is needed quickly and can be rebuilt, such as cached results, and acts as the waiting room for background jobs.

**Strengths:** very fast, simple.
**Costs:** it is not the place for records that must never be lost. I keep the real records in PostgreSQL.

## Celery: work done in the background
Some tasks should not make a customer wait: sending email, creating a courier consignment, regenerating SEO text, billing a subscription each day. Celery runs them in a separate worker.

**Strengths:** the website stays quick, failed jobs can be retried, scheduled jobs run daily without anyone remembering.
**Costs:** it is one more process to keep running. If the worker is stopped, those jobs wait. I design important flows, such as sign-in emails, to try sending directly first so a stopped worker does not block a customer.

## Do you need all three?
- A small site with a contact form: probably not.
- A store with orders, stock, emails and scheduled work: yes, and they pay for themselves in reliability.
