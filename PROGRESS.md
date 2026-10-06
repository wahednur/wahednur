# PROGRESS

**Last updated:** 2026-10-06 (session 2)

## Done
- Previous site moved to `legacy/` (history preserved).
- `frontend/` Next.js scaffold (Next 16, Tailwind 4), design tokens, header, footer.
- Home page: hero, selected work (3 labelled projects), services, process, about, roadmap (planned), contact. Résumé PDF at `/Abdul_Wahed_Nur_Resume.pdf`.
- Pages: `/work` (index), `/work/[slug]` (3 case studies: ekhaneikini, service-parts-management, education-management-demo), `/services`, `/about`, `/contact`, `sitemap.xml`, `robots.txt`. Content lives in `frontend/src/lib/` (`caseStudies.ts`, `services.ts`, `site.ts`).
- Contact form (name, email, need, details, optional budget/timeline) builds a `mailto:` message; no backend yet.
- Verified: `npm run build`, `npm run lint`, no horizontal scroll at 390 px and 1366 px on every page, contact form builds the mailto.

## In progress
Nothing.

## Next
1. Add real screenshots: put files in `frontend/public/work/<slug>/` and fill `screenshots` in `caseStudies.ts` (the gallery only renders when non-empty).
2. OpenGraph image, favicon/brand mark, per-page social previews.
3. Owner to review all page copy (see Known issues).
4. Backend foundation (separate session): leads API to replace `mailto:`.

## Known issues
- Copy to confirm with the owner: "source code and handover" (process step), "Deployment setup" as a service, the About line that the 2020-21 eCommerce system code was written by others, the EMIS case study (no stack listed because it is unconfirmed), and the "Budget" ranges on the contact form (suggestions, not prices).
- An unknown `/work/<slug>` returns 200 with `noindex` on the first request (documented Next.js behavior with Cache Components); `dynamicParams` is not allowed with `cacheComponents`.
- Footer year is hardcoded (cache-components blocks `new Date()`); update yearly or move to a client component.
- Contact is a `mailto:` link until the backend exists.
- Project and résumé links were provided by the owner but not opened from this environment (blocked); open each once on a phone before launch.
- Résumé PDF contains the owner's public phone and email; replace the file when the résumé changes.
