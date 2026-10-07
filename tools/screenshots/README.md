# Screenshot tool

Takes portfolio screenshots of live sites at fixed sizes, with a privacy check, so the same shots can be repeated whenever a site changes.

## Setup (once)

Needs Node 20+.

```bash
cd tools/screenshots
npm install
npx playwright install chromium
# On Linux or WSL also run:  npx playwright install-deps chromium
```

## Run

```bash
npm run list                      # what is configured
npm run shoot -- --only store-home
npm run shoot                     # everything that does not need a login
npm run shoot -- --webp           # also write smaller .webp files
```

Pictures go to `output/` (ignored by git). `output/manifest.json` lists sizes.

### Pages that need a login (admin, meter)

```bash
npm run login -- admin            # a browser opens: log in, return here, press Enter
npm run shoot -- --site admin
npm run clean-auth                # delete saved logins when you are done
```

`.auth/` holds a live session. It is ignored by git. Never share it.

## The privacy check

Before saving, the tool reads the visible text. If it finds a phone number or email that is not allow-listed, it **does not save the shot** and tells you why. Fix it one of three ways, in `shots.config.json`:

- `"blur": [".customer-phone", "table td:nth-child(3)"]` blurs those elements (and excludes them from the check)
- `"hide": ["#cookie-banner"]` hides them
- `"allowText": ["support@yourstore.com"]` (in `settings`, or on one shot) for your own public contact details

Use a test customer and test orders. Blur is a safety net, not a plan: real customer data should not be on the page at all.

## Safety

- Order-placing clicks ("Place order", "Pay now"...) are refused unless you pass `--allow-submit`. Do not add steps that submit orders on a live site.
- Analytics and ad pixels are blocked (`settings.blockHosts`) so these visits do not count as real traffic.
- Adding to the cart on the live store creates a normal guest cart.

## Editing shots

Each shot has a `name` (becomes the file name), a `site`, a `viewport` (`desktop` 1440x900 or `mobile` 390x844 at 2x), optional `fullPage`, and `steps`:

| step | example |
|---|---|
| open a page | `{ "goto": "/checkout" }` |
| click first match | `{ "click": "a[href^=\"/product/\"]" }` |
| type | `{ "fill": "input[name=q]", "value": "shirt" }` |
| wait for element / time | `{ "waitFor": "h1" }`, `{ "wait": 1000 }` |
| scroll | `{ "scroll": 800 }` or `{ "scroll": "#reviews" }` |
| key | `{ "press": "Escape" }` |

If a selector does not match your site, run with `--headed` to watch the browser, and adjust.

## Meter system (`meter-*` shots)

Steps were written from the app's source code (routes, table columns, page titles), not run against the live site. If a shot fails, run it with `--headed` and fix the selector.

- Before the first run, create a **test customer named exactly `Demo Customer`** with the fake phone `01700000000` and a test invoice. The ledger shot searches for that name.
- The app shows the **shop name** in the sidebar, on the login page and on the public invoice page. The shots blur the sidebar; check the others yourself.
- The products shot blurs **Supplier** and **Buy Price**.
- `meter-report-profit-loss` and `meter-public-invoice` are **off** on purpose (real income figures; needs an invoice token). Read the `_note` on each before turning them on.
- The free-tier server can take a minute to wake up, so the first waits are long (90 s).
