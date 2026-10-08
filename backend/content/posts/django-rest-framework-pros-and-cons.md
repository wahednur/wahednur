---
slug: django-rest-framework-pros-and-cons
title: Django REST Framework for business backends: features, strengths and weaknesses
excerpt: Why I use Django REST Framework for orders, payments and permissions, and the situations where I would pick something else.
cover: /blog/django-rest-framework-pros-and-cons.svg
cover_alt: Django REST Framework strengths and costs side by side
---
> **In short:** Great structure and permissions for business rules. Not the fastest runtime, and real-time features need extras.

Django is a Python web framework. Django REST Framework (DRF) adds the tools to build an API on top of it. A backend is where a business's rules live: who may see what, how stock changes, when an order counts as paid.

## What it gives you
- **Structure.** There is a conventional place for models, permissions and views, so a project stays readable as it grows.
- **A built-in admin.** Useful for early data entry and checking records, without building a separate screen first.
- **Authentication and permissions.** Mature, widely reviewed tools for sign-in, sessions or tokens, and per-user access rules.
- **Migrations.** Database changes are tracked in files, so a server can be upgraded safely and repeatedly.
- **A large ecosystem.** Libraries for payments, background jobs, caching and testing.

## Why I choose it for money and stock
These are the parts where mistakes hurt. Django makes it natural to keep business rules in one layer, check them on the server and test them. I keep rules for stock, payments and permissions in service functions with automated tests.

## Weak points
- **Python speed.** It is not the fastest runtime. For most business systems the database is the limit long before Python is. For extreme real-time loads, other tools fit better.
- **Real-time features.** Live chat or live dashboards need extra pieces (channels, websockets).
- **Two languages.** If the front end is JavaScript, the team works in two languages. That is a real cost for a team that only knows JavaScript.
- **Heavier than a small script.** For a tiny one-page tool it is more than needed.

## When I would suggest something else
- A very small project that only needs a form and an email: a simpler tool or hosted service may be cheaper.
- A team that is entirely JavaScript and wants a single language: a Node backend can be a reasonable choice.
