---
slug: nextjs-for-business-websites
title: Next.js for business websites and stores: what it does well and where it costs you
excerpt: Fast pages that search engines can read, and the trade-offs that come with a modern React framework.
---
Next.js is a framework built on React. It renders pages on the server, so a visitor, and a search engine, receives real content instead of an empty page that fills in later.

## What it is good at
- **Search-friendly pages.** Product pages, blog posts and service pages arrive as finished HTML, with titles, descriptions and structured data in place.
- **Speed.** Pages can be prepared ahead and cached, then refreshed when content changes. This site refreshes a blog or product page after an edit instead of rebuilding everything.
- **One codebase for public pages and signed-in areas.** The public site and the client area can live together.
- **React.** A huge ecosystem of components and developers.

## Where it costs you
- **It changes quickly.** New versions bring new conventions. Upgrades take care, and old tutorials can mislead.
- **More moving parts than a plain site.** A brochure site with five pages does not need it.
- **Hosting.** It works best on hosts that understand it. Running it on your own server is possible, but it is one more thing to look after.
- **Cache mistakes.** Pages that are cached can show old content if refresh is not set up carefully. I test this explicitly.

## When I recommend it
- Stores and content sites where search traffic matters.
- Products that need a public side and a private area under one roof.

## When I do not
- A small, rarely changed site: a simple builder or static pages may serve you better and cost less.
