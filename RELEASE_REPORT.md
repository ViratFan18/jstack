# JStack Independent Release Review

**Review date:** 2026-11-22
**Project:** `C:\Users\dev.DESKTOP-RV88KA4\Downloads\VK\jstack`
**Detected hosting:** Cloudflare Pages (`https://jstack.pages.dev`)
**Recommendation:** **The previously reported route failures are fixed and verified on the live site.** This is a targeted route follow-up, not a complete release sign-off.

## Verified

- **Production build and type checks:** `npm run build` passed. The build ran `tsc -b`, Vite production bundling, and `scripts/prepare-static.mjs`; it generated 25 sitemap URLs and `robots.txt`.
- **Unit tests:** `npm test` passed: 6 test files, 45 tests.
- **Browser tests:** final `npm run test:e2e` passed: 48/48 tests against Vite's production preview.
- **Lint:** `npm run lint` exited successfully, with one warning noted under Unresolved.
- **Whitespace and merge markers:** `git diff --check` passed.
- **Local production routes:** browser route checks cover the public pages, the three new articles, the tool workspace, and branded 404. All 48 browser tests passed; the unknown tool route returns branded HTTP 404.
- **Tool operations:** the browser suite covers JWT decode/sign/verify examples, direct JWE encryption/decryption, key generation, JSON format/minify/validate, Java POJO generation, Base64 and JStack Base128 Unicode/empty/malformed inputs, and downloads. Unit tests cover additional algorithms and utility edge cases.
- **Product behavior:** tests cover direct tool routes, reload and browser history, command-palette keyboard use, favorites/recent items, blocked/corrupt/full storage, cross-tab synchronization, offline use after a tool chunk is loaded, stale lazy responses, failed chunk recovery, clipboard denial fallback, startup asset recovery, mobile layouts, both themes, and sampled contrast/focus indicators.
- **Local SEO output:** tests verify unique titles/descriptions, canonicals, robots directives, structured data, internal links, `robots.txt`, and sitemap consistency. The local build produces 25 canonical, indexable sitemap URLs, including `/blog` and three tutorial articles.
- **Live route follow-up (2026-11-22):** GitHub `main` is at `c03a5140e84c75c3304299b8b005cb25c56c1834`. Live `/app/json-formatter` returns HTTP 200, renders the JSON workspace, keeps the slashless URL, and still renders after refresh; its response includes `X-Robots-Tag: noindex, follow`. `/blog` and all three article routes return HTTP 200 at their slashless URLs, and each article's canonical matches its URL.
- **Publisher setup:** the standard AdSense loader is generated on each indexable public page and is absent from the dedicated `/app/*` workspace shell. Tests confirm `ads.txt` matches the publisher ID provided for this project and the Search Console verification file is served. These checks do not confirm AdSense approval or ad serving.
- **Live response headers:** Cloudflare returns the configured CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`. This confirms those headers are present on the sampled live responses, not that the whole application is secure.
- **Live browser diagnostics:** route checks succeeded, but the live browser still reports a CSP violation blocking an embedded data font; see Failed.

### Commands and environment

| Check | Result |
|---|---|
| `node --version` | `v22.14.0` |
| `npm --version` | `10.9.2` |
| `npm run build` | Pass |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | Exit 0; one warning |
| `npm test` | 45 passed |
| `npm run test:e2e` | 48 passed |
| Cloudflare-mode build (`CF_PAGES=1`, no `VITE_SITE_URL`) | Pass; defaults to `https://jstack.pages.dev` with a warning |
| `git diff --check` | Pass |

The final production build reported a 319.22 KB JavaScript entry bundle (95.83 KB gzip) and 152.48 KB CSS (26.79 KB gzip). These are bundle measurements only; Core Web Vitals were not measured.

## Implemented but not independently verified

- `src/ErrorBoundary.tsx` provides a render-failure fallback, but this review did not deliberately crash a React component to exercise that boundary. Startup-script and lazy-chunk recovery paths were exercised separately.
- Lazy-load, cryptographic-operation, and clipboard timeout branches are implemented, but the full 15-second, 30-second, and 5-second expiry paths were not forced in the browser. `Promise.race` timeouts do not cancel the underlying operation; stale operation guards are present and a stale lazy response is covered by a test.
- Browser verification used the configured Playwright browser only. Firefox, WebKit, assistive-technology testing, and a complete WCAG 2.2 AA audit were not run.
- No Lighthouse, field Core Web Vitals, or other performance lab measurements were taken.
- The AdSense script and CSP host allowlist are present in the build. Actual Google request behavior, account settings, and consent signaling were not independently verified; no ads are manually placed in the tool workspace.
- The local code confirms feedback uses an email-draft handoff rather than a backend submission. Actual mail delivery, phone reachability, and ownership of the published contact methods were not tested.
- The repository's `README.md` mentions a previous `npm audit` result. A dependency audit was not run during this review; that historical statement is not a current dependency assessment.

## Failed

- **MEDIUM — Live font CSP violation:** the browser reports an embedded `data:font/woff2` resource blocked by the current `font-src` directive. Route content remains visible, but the intended font may not load. This issue is separate from the route fix and remains unresolved.

## Unresolved

- **MEDIUM — AdSense runtime and consent:** verify account settings and consent requirements for the audience; no AdSense approval or successful ad serving is claimed.
- **MEDIUM — Cross-browser coverage:** only the configured Playwright browser was tested.
- **LOW — Lint warning:** `src/App.tsx:548:7` reports `react(set-state-in-effect)` in the recent-preference persistence effect. Lint exits 0, but the warning remains.
- **LOW — Performance evidence:** bundle sizes were recorded, but there are no measured Core Web Vitals or performance budgets.
- **LOW — Offline boundary:** tools work offline after their code is loaded; first-time lazy chunks and page navigation require network access. No service worker/offline cache is present.

## Requires manual configuration

1. Confirm Cloudflare Pages is deploying the pushed `main` commit `c03a5140e84c75c3304299b8b005cb25c56c1834`; the GitHub remote matches this commit.
2. In Cloudflare Pages, verify root directory `/`, build command `npm run build`, output directory `dist`, and Node.js `22.14.0` (from `.nvmrc`).
3. The build defaults to `https://jstack.pages.dev`, the current Pages origin. Set `VITE_SITE_URL` in Cloudflare Pages if deploying to a different custom domain.
4. Confirm the deployed artifact contains the current `dist/_redirects`, `dist/_headers`, 25-URL `sitemap.xml`, generated `robots.txt`, AdSense loader, and `ads.txt`; inspect actual responses after deployment.
5. Verify the publisher record in `public/ads.txt` in the operator's AdSense account. The application loads the standard AdSense library on public indexable pages but contains no manually placed ad units.
6. Have the site operator verify contact details and review Privacy Policy and Terms for their actual jurisdiction and hosting practices.

## Requires Google review

- Verify the live property in Search Console, submit the deployed sitemap, and inspect canonical/indexing reports after deployment. This review does not establish Google indexing or ranking.
- Google independently decides AdSense eligibility and policy compliance. The presence of `ads.txt` is not AdSense configuration or approval; no approval is claimed.

## Cloudflare Pages deployment checklist

- [x] Commit and push the route fix to `main` (`c03a5140e84c75c3304299b8b005cb25c56c1834`); the GitHub remote matches and live route checks passed.
- [ ] Confirm the production origin is `https://jstack.pages.dev`; otherwise set `VITE_SITE_URL` to the exact custom-domain origin and confirm the Pages build log uses it.
- [ ] Deploy with `npm run build` and `dist`; verify the successful build generated 25 sitemap locations.
- [ ] Check live `/`, all 12 tool routes, `/about`, `/contact`, `/feedback`, `/learning`, `/blog`, all three `/blog/*` articles, `/changelog`, `/disclaimer`, `/privacy`, `/terms`, and `/guide` for their own expected content and canonical URLs.
- [ ] Check each `/app/<tool>` route directly and after refresh; `/app/json-formatter` was verified, but the other tool routes were not independently rechecked after the final deployment.
- [ ] Request `/not-a-real-jstack-page` and `/app/not-a-real-tool`; both must return the branded 404 with HTTP 404, not the homepage with HTTP 200.
- [ ] Verify `/robots.txt` references the live sitemap and `/sitemap.xml` contains exactly the current indexable canonical URLs (25 for this build; feedback, workspace, and 404 are excluded).
- [ ] Verify `/ads.txt`, the Google verification file, and the AdSense script; check console/CSP failures and account consent/Auto ads settings before enabling serving.
- [ ] Verify legacy `.html` aliases redirect to the clean canonical paths and the Google verification file returns its required content.
- [ ] Inspect live CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`, and cache headers on both HTML and hashed assets.
- [ ] Re-run direct-route, tool-operation, keyboard, desktop/mobile, console, network, and overflow checks against the deployed URL.
- [ ] Complete operator/legal and Google Search Console/AdSense steps separately; do not infer approval from a successful deployment.
