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

Set `VITE_SITE_URL` in Cloudflare Pages to the exact production HTTPS origin (`https://jstack.pages.dev` for the current Pages site, or your custom domain). The build uses it to generate canonical links, Open Graph metadata, `robots.txt`, and `sitemap.xml`; when the variable is omitted outside Cloudflare, it defaults to the current Pages origin. The tool guides (including `/json-to-java`) and the About, Guide, Contact, Privacy, and Terms pages are generated or copied as static HTML. Cloudflare Pages serves these files directly, including their clean URLs (for example, `/jwt-decoder`); the interactive workspace remains at `/` and its tool launch links use query parameters. Unknown paths should return 404.

You can deploy from the Cloudflare dashboard by connecting the Git repository; no backend, database, Wrangler CLI, or server function is required.

## Deploy to Netlify

Connect the repository in Netlify. Set `VITE_SITE_URL` to the production HTTPS origin in the site's build environment. The included `netlify.toml` sets the build command to `npm run build`, publishes `dist`, and routes app navigation to the frontend.

## Deploy to Vercel

Import the repository in Vercel. Set `VITE_SITE_URL` to the production HTTPS origin. The Vite framework preset uses `npm run build` and `dist`; `vercel.json` supplies the SPA rewrite.

Both hosts can also deploy the same static build with their CLI. Use the `dist` folder as the publish/output directory.

## Strict Publisher Review

Current status: the app reserves a responsive ad placement below the tools, but does not load AdSense or serve ads. Configure a valid publisher ID, ad unit, and required consent signaling before enabling ads; `public/ads.txt` contains the publisher seller record and must be verified by the operator. No analytics or consent-management platform is configured. This is not an AdSense approval check; approval and revenue are not guaranteed.

Before enabling ads or applying, complete these operator-owned steps:

- Confirm Cloudflare Pages has `VITE_SITE_URL` set to the real production HTTPS origin (`https://jstack.pages.dev` for the current site) and redeploy. Verify canonical links, `/robots.txt`, and `/sitemap.xml` on the deployed domain.
- Add the operator's legal identity, location/jurisdiction, and any required business/contact disclosures. The supplied email and phone are present, but a phone and email alone do not complete every legal disclosure.
- Have the Privacy Policy and Terms reviewed for the operator's jurisdiction and actual Cloudflare/account practices; the included pages accurately describe this app's intended code behavior but are not legal advice.
- Add substantial original material that genuinely helps developers: detailed explanations, supported algorithm/key formats, safe examples, and limitations. A set of utilities alone may not satisfy Google's site-value review.
- Before enabling advertising, configure a Google-certified consent-management platform and consent signaling where required for your audience, and verify ad requests honor those choices.
- If analytics or other third-party scripts are added, update the privacy disclosures and CSP in `public/_headers`; verify no sensitive tool input can reach those services.
- Keep ad units clearly labeled and separated from tool controls; never encourage clicks or style ads as navigation or tool controls. The current `ads.txt` record is based on the publisher ID supplied for this project; verify it in the AdSense account before launch.
- Check the current official AdSense policies and decisions directly. The publisher review is manual and Google controls approval.
- Full `npm audit` currently reports a high-severity ReDoS advisory in `picomatch@4.0.7`, pulled into development/build tools by Vite and Vitest. No patched picomatch release is available in the current registry metadata; npm's suggested forced change downgrades the toolchain. The vulnerable package is not shipped in `dist`, and `npm audit --omit=dev` reports zero findings, but re-check before updating dependencies and keep builds limited to trusted source.

## Prelaunch Checks

- Run `npm test`, `npm run lint`, and `npm run build`.
- Verify JWT/JWE operations, JSON format/minify/validation, JSON-to-Java output, and Base64 and JStack Base128 text round-trips after deployment.
- Check policy links, contact links, keyboard access, mobile layout, and Cloudflare's response headers on the live domain.
- Keep production JWTs, private keys, and secrets out of screenshots, support emails, and issue reports.

## Security notes

Tokens, keys, JSON, and text are processed in the browser and are not written to local storage. Do not treat decoding as signature verification. JSON validation reports syntax validity only; the JSON-to-Java generator infers types from one sample and does not validate an application schema. Never use this tool alone as a security review.
