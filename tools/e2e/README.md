# Browser checks for the admin dashboard

Each file in `admin/` is a small Playwright script that drives the real admin against the real API and prints PASS or FAIL per check. They were run before each admin feature was committed.

## Run them
1. A **throwaway** database and the API with MFA off (never the live database):
   ```
   cd backend && source .venv/bin/activate
   export DATABASE_URL=postgres://USER:PASS@localhost:5432/wn_test REQUIRE_STAFF_MFA=false
   python manage.py migrate
   python manage.py shell < ../tools/e2e/seed.py
   python manage.py runserver 8000
   ```
2. The admin: `cd admin && VITE_API_URL=http://localhost:8000 bun run dev` (port 5173; the API's `CORS_ALLOWED_ORIGINS` must list it).
3. Playwright and a Chromium: `export PLAYWRIGHT_PATH=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium E2E_TMP=/tmp`. Put a tiny valid PDF at `$E2E_TMP/contract.pdf` and a PNG at `$E2E_TMP/photo.png` for the documents and products checks.
4. `node tools/e2e/admin/03-clients-and-payment-gates.cjs`, and so on.

Some files expect a fresh database (they create the same client or post), so reseed between files.
