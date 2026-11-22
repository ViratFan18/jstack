# JStack Independent Release Review

**Review date:** 2026-11-22
**Project:** `C:\Users\dev.DESKTOP-RV88KA4\Downloads\VK\jstack`
**Detected hosting:** Cloudflare Pages (`https://jstack.pages.dev`)
**Recommendation:** **NO-GO for the currently deployed release until the current local build is pushed and redeployed.** The updated local build passes; the last live-site probe was before these changes and found an older/incomplete release.

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
- **Publisher setup:** the standard AdSense loader is generated on each indexable public page and is absent from the dedicated `/app/*` workspace shell. Tests confirm `ads.txt` matches the publisher ID provided for this project and the Search Console verification file is served. These checks do not confirm AdSense approval or ad serving.
- **Live response headers:** Cloudflare returns the configured CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`. This confirms those headers are present on the sampled live responses, not that the whole application is secure.
- **Live browser diagnostics:** 34 current page/tool URLs loaded without browser console errors, failed requests, or failed responses. This did not imply the correct page was served; see Failed.

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
- The AdSense script and CSP host allowlist are present in the local build, but actual Google request behavior, account settings, consent signaling, and live CSP compatibility must be checked after deployment. No ads are manually placed in the tool workspace.
- The local code confirms feedback uses an email-draft handoff rather than a backend submission. Actual mail delivery, phone reachability, and ownership of the published contact methods were not tested.
- The repository's `README.md` mentions a previous `npm audit` result. A dependency audit was not run during this review; that historical statement is not a current dependency assessment.

## Failed

### Live Cloudflare Pages route/content check — HIGH

The configured live origin was checked before the current local updates. It was reachable and served by Cloudflare, but its responses did not match the then-reviewed local build:

- The live `sitemap.xml` returned **17 URLs**. The current local build generates 25; the live sitemap was missing `/base128-converter`, `/changelog`, `/disclaimer`, `/learning`, `/blog`, and the three new articles.
- Live `/feedback`, `/changelog`, `/base128-converter`, `/learning`, `/disclaimer`, and `/404.html` return the homepage document with the homepage title and canonical, rather than their current page content.
- Live `/app/json-formatter` returns HTTP 200 but renders **JWT Workbench**; there is no `JSON INPUT` control. `/app/base128-converter` also renders JWT Workbench.
- Live `/not-a-real-jstack-page` and `/app/not-a-real-tool` return HTTP 200 with the homepage document, not a 404.
- Live `/app/*` responses had no `X-Robots-Tag` header in the sampled responses and the HTML had no robots meta tag.

The local Cloudflare deployment files and production preview have the intended route behavior, including the 404. No deployment was performed during this update, so the live mismatch remains unresolved. Do not treat successful local tests as verification of the deployed release.

### Initial expanded browser run — corrected

One intermediate run failed because the new cross-tab test asserted against a multi-element locator. The test selector was corrected; the final full browser run passed 47/47. This was a test assertion issue, not a remaining application failure.

## Unresolved

- **HIGH — Live release mismatch:** the deployed Pages site is serving stale or incomplete routes/content. The interactive tool routes and unknown-route status fail the release criteria above.
- **HIGH — Uncommitted release snapshot:** `git status` shows numerous modified tracked files and untracked implementation/test files on `main`; the changes are not represented by a commit in `origin/main`. Cloudflare cannot deploy this exact reviewed working tree until it is committed and pushed.
- **MEDIUM — Live indexability of workspace paths:** the sampled deployed `/app/*` responses had no `X-Robots-Tag` or robots meta. Confirm the current `_headers` rules apply after Cloudflare route rewrites.
- **MEDIUM — AdSense runtime and consent:** the new loader and CSP are local-only until deployment. Verify Google requests are not blocked, review consent requirements for the audience, and do not enable personalized ads until required consent is configured.
- **MEDIUM — Cross-browser coverage:** only the configured Playwright browser was tested.
- **LOW — Lint warning:** `src/App.tsx:548:7` reports `react(set-state-in-effect)` in the recent-preference persistence effect. Lint exits 0, but the warning remains.
- **LOW — Performance evidence:** bundle sizes were recorded, but there are no measured Core Web Vitals or performance budgets.
- **LOW — Offline boundary:** tools work offline after their code is loaded; first-time lazy chunks and page navigation require network access. No service worker/offline cache is present.

## Requires manual configuration

1. Commit and push the reviewed source, static pages, tests, and deployment files; confirm the Cloudflare Pages deployment is built from that commit.
2. In Cloudflare Pages, verify root directory `/`, build command `npm run build`, output directory `dist`, and Node.js `22.14.0` (from `.nvmrc`).
3. The build defaults to `https://jstack.pages.dev`, the current Pages origin. Set `VITE_SITE_URL` in Cloudflare Pages if deploying to a different custom domain.
4. Confirm the deployed artifact contains the current `dist/_redirects`, `dist/_headers`, 25-URL `sitemap.xml`, generated `robots.txt`, AdSense loader, and `ads.txt`; inspect actual responses after deployment.
5. Verify the publisher record in `public/ads.txt` in the operator's AdSense account. The application loads the standard AdSense library on public indexable pages but contains no manually placed ad units.
6. Have the site operator verify contact details and review Privacy Policy and Terms for their actual jurisdiction and hosting practices.

## Requires Google review

- Verify the live property in Search Console, submit the deployed sitemap, and inspect canonical/indexing reports after deployment. This review does not establish Google indexing or ranking.
- Google independently decides AdSense eligibility and policy compliance. The presence of `ads.txt` is not AdSense configuration or approval; no approval is claimed.

## Cloudflare Pages deployment checklist

- [ ] Commit and push the exact reviewed source to the deployment branch.
- [ ] Confirm the production origin is `https://jstack.pages.dev`; otherwise set `VITE_SITE_URL` to the exact custom-domain origin and confirm the Pages build log uses it.
- [ ] Deploy with `npm run build` and `dist`; verify the successful build generated 25 sitemap locations.
- [ ] Check live `/`, all 12 tool routes, `/about`, `/contact`, `/feedback`, `/learning`, `/blog`, all three `/blog/*` articles, `/changelog`, `/disclaimer`, `/privacy`, `/terms`, and `/guide` for their own expected content and canonical URLs.
- [ ] Check each `/app/<tool>` route directly and after refresh; verify it opens the selected tool and sends `X-Robots-Tag: noindex, follow`.
- [ ] Request `/not-a-real-jstack-page` and `/app/not-a-real-tool`; both must return the branded 404 with HTTP 404, not the homepage with HTTP 200.
- [ ] Verify `/robots.txt` references the live sitemap and `/sitemap.xml` contains exactly the current indexable canonical URLs (25 for this build; feedback, workspace, and 404 are excluded).
- [ ] Verify `/ads.txt`, the Google verification file, and the AdSense script; check console/CSP failures and account consent/Auto ads settings before enabling serving.
- [ ] Verify legacy `.html` aliases redirect to the clean canonical paths and the Google verification file returns its required content.
- [ ] Inspect live CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`, and cache headers on both HTML and hashed assets.
- [ ] Re-run direct-route, tool-operation, keyboard, desktop/mobile, console, network, and overflow checks against the deployed URL.
- [ ] Complete operator/legal and Google Search Console/AdSense steps separately; do not infer approval from a successful deployment.
