---
slug: security-basics-on-this-site
title: How accounts are protected on this site
excerpt: Email sign-in, two-step verification, rate limits and private areas. What is actually in place, stated plainly.
cover: /blog/security-basics-on-this-site.svg
cover_alt: Checklist of account protections: email verification, two-step sign-in, private pages, server-side checks, request limits, audit trail
---
> **In short:** Email verification, two-step sign-in, private pages, server-side checks and request limits. No claim of being unhackable.

This site has a client area, so it holds real information. These are the protections that exist today.

## Sign-in

- Accounts use email and password, with email verification before use.
- **Two-step verification** with an authenticator app is available to everyone and **required** for staff and the owner account. Recovery codes are provided.
- Password reset works by emailed link.

## Private areas

- Pages under the client area are private. Without a valid session you are sent to sign in.
- The server decides what you may see on every request. Hiding a button in the page is not treated as security.
- If a record is not yours, the server answers as if it does not exist.

## Abuse limits

Sign-in, ordering, payment reports and uploads have request limits, and oversized requests are refused early. This slows down automated guessing and spam.

## What I do not claim

I do not claim the site is "unhackable" or certified. No system is. If you find a problem, please tell me through the contact page and I will look at it.
