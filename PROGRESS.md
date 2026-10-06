# PROGRESS

**Last updated:** 2026-10-06

## Done
- Previous site moved to `legacy/` (history preserved).
- `frontend/` Next.js scaffold (Next 16, Tailwind 4), design tokens, header, footer.
- Home page: hero, selected work (3 labelled projects), services, process, about, roadmap (planned), contact. Résumé PDF at `/Abdul_Wahed_Nur_Resume.pdf`.
- Verified: `npm run build`, `npm run lint`, no horizontal scroll at 390 px and 1366 px.

## In progress
Nothing.

## Next
1. Case-study pages for ekhaneikini and the service system (needs screenshots from the owner).
2. Dedicated Services, About, Contact pages; sitemap, robots, OpenGraph image.
3. Backend foundation (separate session).

## Known issues
- Footer year is hardcoded (cache-components blocks `new Date()`); update yearly or move to a client component.
- Contact is a `mailto:` link until the backend exists.
- Project and résumé links were provided by the owner but not opened from this environment (blocked); open each once on a phone before launch.
- Résumé PDF contains the owner's public phone and email; replace the file when the résumé changes.
