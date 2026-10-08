---
slug: why-money-numbers-are-exact
title: Why money in software must be exact, not approximate
excerpt: A bill that is off by a cent destroys trust. How the amounts in my billing system are kept exact.
---
Computers store many decimal numbers approximately. In most places that is fine. In billing it is not.

## The problem

Add 0.10 and 0.20 as ordinary floating-point numbers and the result can be 0.30000000000000004. Show that on an invoice, or let it grow across many lines and installments, and the totals stop matching.

## What I do instead

- Amounts are stored and calculated as **exact decimals**, with two places.
- Totals are **calculated on the server** from the lines. The browser's arithmetic is never trusted.
- Amounts travel to the screen as exact text, so no rounding is introduced on the way.
- Installments must add up to the invoice total **exactly**, or the invoice cannot be issued.
- A payment cannot be larger than the amount still due.

## Why it matters to you

You can add the lines of any invoice by hand and get the same total. If you cannot, that is a bug I want to hear about.
