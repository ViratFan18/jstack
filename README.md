# JStack

Browser-only JWT/JWE workbench, JSON formatter/minifier/validator, JSON-to-Java record/POJO generator, and Base64 and custom JStack Base128 text converters built with React, TypeScript, Vite, `jose`, and Web Crypto.

JStack Base128 packs UTF-8 bytes into seven-bit groups and maps each group to a Braille symbol from U+2801–U+2880. This is a custom format, not a standard; only decoders using the same mapping can read it.

The JSON-to-Java generator infers nested models from an example object. Empty, null-only, or incompatible mixed values use `Object`; renamed JSON keys use Jackson `@JsonProperty` annotations. Record output requires Java 16 or newer. Generated code is a starting point, not a schema or deserializer.

## Run locally

```bash
npm install
npm run dev
```

## Validate and build

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run preview
```

The production bundle is written to `dist/`. No application backend, database, account system, or server-side conversion endpoint is required.

The workspace includes a task-oriented homepage, a Ctrl+K palette for tools and site pages, accessible favorites/recent shortcuts, and responsive tool pages. Static About, Contact, Feedback, Privacy, Terms, Disclaimer, Learning Center, Changelog, developer-guide, Blog, and article pages share the theme, breadcrumbs, page search, and mobile layouts. The Blog contains original JWT validation, JSON-to-Java, and encoding tutorials with original diagrams. Feedback prepares an email draft on the visitor's device; it is not submitted to a JStack backend.

## Deploy to Cloudflare Pages

Connect the repository in Cloudflare Pages and use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js: `22.14.0` (pinned in `.nvmrc`; this project was verified with this version)
- Optional build environment variable for a custom domain: `VITE_SITE_URL=https://your-real-domain.example`

The build defaults `VITE_SITE_URL` to `https://jstack.pages.dev`, the current Pages origin. If deploying to a custom domain, set the variable in Cloudflare Pages to that exact production HTTPS origin. It generates canonical links, Open Graph metadata, `robots.txt`, and `sitemap.xml`. The tool guides, About, Guide, Contact, Privacy, Terms, Learning, Blog, and article pages are emitted as static HTML. The sitemap includes the current indexable pages; Feedback and not-found pages are excluded. Cloudflare Pages serves these pages at clean URLs. The interactive workspace uses `/app/<tool>` clean URLs, with browser back/forward support; older `/?tool=<tool>` links remain supported. Cloudflare Pages rewrites the known `/app/` tool routes to the workspace entry point. Unknown paths should return 404.

Favorites, recent tools, and the theme preference are stored in browser local storage. Tool input and generated results remain in page memory and are not persisted. Browser restrictions can disable local storage without preventing the workspace from running.

You can deploy from the Cloudflare dashboard by connecting the Git repository; no backend, database, Wrangler CLI, or server function is required.

## AdSense setup and publisher review

The indexable public pages include Google's documented AdSense loader pattern with the publisher ID supplied for this project ([Google code placement guide](https://support.google.com/adsense/answer/9274516)). Compare it with the account-generated code in AdSense before launch. The project includes `public/ads.txt` and the Google Search Console verification file. No manually placed ad units are included; Google can serve ads only according to the publisher account's settings, eligibility, and review. A loader or `ads.txt` record is not an approval, consent implementation, or revenue guarantee.

Before enabling Auto ads or other advertising features, complete these operator-owned steps:

- Confirm Cloudflare Pages has `VITE_SITE_URL` set to the real production HTTPS origin (`https://jstack.pages.dev` for the current site) and redeploy. Verify canonical links, `/robots.txt`, `/sitemap.xml`, `/ads.txt`, and the verification file on the deployed domain.
- Add the operator's legal identity, location/jurisdiction, and any required business/contact disclosures. The supplied email and phone are present, but a phone and email alone do not complete every legal disclosure.
- Have the Privacy Policy and Terms reviewed for the operator's jurisdiction and actual Cloudflare/account practices; the included pages accurately describe this app's intended code behavior but are not legal advice.
- Review the Learning Center and Blog tutorials against current framework/library versions before publishing changes. The pages contain original examples and diagrams but are not a guarantee of Google approval.
- Before enabling advertising, configure a Google-certified consent-management platform and consent signaling where required for your audience, and verify ad requests honor those choices.
- `public/_headers` allows Google's AdSense-related hosts in the Content Security Policy. Verify the deployed browser console and AdSense diagnostics for blocked requests; strict dynamic CSP and changing Google hosts may require a hosting architecture or policy adjustment.
- Keep ad units clearly labeled and separated from tool controls; never encourage clicks or style ads as navigation or tool controls. Verify the publisher record in the AdSense account.
- Check the current official AdSense policies and decisions directly. The publisher review is manual and Google controls approval.
- The latest local `npm audit` reported zero vulnerabilities. Re-run the audit before deployment because dependency advisories change over time, and build only from trusted source.

## Prelaunch Checks

- Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e`.
- Verify JWT/JWE operations, JSON format/minify/validation, JSON-to-Java output, and Base64 and JStack Base128 text round-trips after deployment.
- Check policy links, contact links, keyboard access, mobile layout, and Cloudflare's response headers on the live domain.
- After deploying, request a random nonexistent path and confirm it returns HTTP 404 with the branded not-found page; a successful SPA fallback is not a valid 404.
- Keep production JWTs, private keys, and secrets out of screenshots, support emails, and issue reports.

## Security notes

Tokens, keys, JSON, and text are processed in the browser and are not written to local storage. HMAC key text is interpreted as UTF-8; generated Base64URL HMAC material is used exactly as displayed, not Base64URL-decoded. Do not treat decoding as signature verification. JSON validation reports syntax validity only; formatting and minifying preserve numeric lexemes to avoid precision loss, while JSON-to-Java infers types from one sample and does not validate an application schema. Never use this tool alone as a security review.
