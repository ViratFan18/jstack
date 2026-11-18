# JStack

Browser-only JWT/JWE workbench and JSON formatter, minifier, and validator built with React, TypeScript, Vite, `jose`, and Web Crypto.

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
npm run preview
```

The production bundle is written to `dist/`. No application backend, database, account system, or server-side conversion endpoint is required.

## Deploy to Cloudflare Pages

Connect the repository in Cloudflare Pages and use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js: `22.14.0` (pinned in `.nvmrc`; this project was verified with this version)
- Build environment variable: `VITE_SITE_URL=https://your-real-domain.example` (replace with the exact HTTPS origin assigned to your Pages project or custom domain)

The build requires `VITE_SITE_URL` in Cloudflare Pages and uses it to generate canonical links, `robots.txt`, and `sitemap.xml`. The checked-in `public/_redirects` and `public/_headers` configure the SPA fallback and response security headers. After the first deployment, add your custom domain in Cloudflare, set `VITE_SITE_URL` to that domain, and redeploy.

You can deploy from the Cloudflare dashboard by connecting the Git repository; no backend, database, Wrangler CLI, or server function is required.

## Deploy to Netlify

Connect the repository in Netlify. Set `VITE_SITE_URL` to the production HTTPS origin in the site's build environment. The included `netlify.toml` sets the build command to `npm run build`, publishes `dist`, and routes app navigation to the frontend.

## Deploy to Vercel

Import the repository in Vercel. Set `VITE_SITE_URL` to the production HTTPS origin. The Vite framework preset uses `npm run build` and `dist`; `vercel.json` supplies the SPA rewrite.

Both hosts can also deploy the same static build with their CLI. Use the `dist` folder as the publish/output directory.

## Strict Publisher Review

Current status: the app does not load AdSense, analytics, or advertising scripts, and there are no ad placements. This is not an AdSense approval check. Do not apply based on this code review alone and do not expect a guarantee of approval or revenue.

Before enabling ads or applying, complete these operator-owned steps:

- Set `VITE_SITE_URL` to the real production HTTPS origin and redeploy. Verify canonical links, `/robots.txt`, and `/sitemap.xml` on the deployed domain.
- Add the operator's legal identity, location/jurisdiction, and any required business/contact disclosures. The supplied email and phone are present, but a phone and email alone do not complete every legal disclosure.
- Have the Privacy Policy and Terms reviewed for the operator's jurisdiction and actual Cloudflare/account practices; the included pages accurately describe this app's intended code behavior but are not legal advice.
- Add substantial original material that genuinely helps developers: detailed explanations, supported algorithm/key formats, safe examples, and limitations. A set of utilities alone may not satisfy Google's site-value review.
- If advertising, analytics, cookies, or consent-management scripts are added, update the privacy disclosures, consent flow where required, CSP in `public/_headers`, and verify no sensitive tool input can reach third parties.
- Only use clearly labeled, non-obstructive ad placements; never encourage clicks or style ads as tool controls. Add the real AdSense publisher configuration and `ads.txt` only after Google issues the required values.
- Check the current official AdSense policies and decisions directly. The publisher review is manual and Google controls approval.
- Full `npm audit` currently reports a high-severity ReDoS advisory in `picomatch@4.0.7`, pulled into development/build tools by Vite and Vitest. No patched picomatch release is available in the current registry metadata; npm's suggested forced change downgrades the toolchain. The vulnerable package is not shipped in `dist`, and `npm audit --omit=dev` reports zero findings, but re-check before updating dependencies and keep builds limited to trusted source.

## Prelaunch Checks

- Run `npm test`, `npm run lint`, and `npm run build`.
- Verify JWT/JWE operations, JSON format/minify/validation, and Base64 text round-trips after deployment.
- Check policy links, contact links, keyboard access, mobile layout, and Cloudflare's response headers on the live domain.
- Keep production JWTs, private keys, and secrets out of screenshots, support emails, and issue reports.

## Security notes

Tokens, keys, JSON, and Base64 text are processed in the browser and are not written to local storage. Do not treat decoding as signature verification. JSON validation reports syntax validity only; it does not validate an application-specific schema. Never use this tool alone as a security review.
