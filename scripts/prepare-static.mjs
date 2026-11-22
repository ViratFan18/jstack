import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim()
const defaultSiteUrl = 'https://jstack.pages.dev'

let siteUrl = defaultSiteUrl
if (configuredSiteUrl) {
  let parsedUrl
  try {
    parsedUrl = new URL(configuredSiteUrl)
  } catch {
    throw new Error('VITE_SITE_URL must be a valid HTTPS URL, for example https://example.com')
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    throw new Error('VITE_SITE_URL must be the HTTPS origin only, without a path, query, or fragment.')
  }
  if (parsedUrl.hostname.endsWith('.workers.dev')) {
    console.warn(`Ignoring the legacy Cloudflare Workers origin ${parsedUrl.origin}; using ${defaultSiteUrl}. Set VITE_SITE_URL to the Pages or custom-domain origin.`)
  } else {
    siteUrl = parsedUrl.origin
  }
}

if (!configuredSiteUrl && process.env.CF_PAGES === '1') {
  console.warn(`VITE_SITE_URL is not set; generating canonical URLs for ${defaultSiteUrl}. Set it if the production site uses a different origin.`)
}

const toolPages = [
  {
    slug: 'jwt-decoder',
    name: 'JWT decoder',
    title: 'JWT Decoder Online – Inspect Token Header and Claims | JStack',
    description: 'Decode a compact JWT in your browser to inspect its header, payload, and signature. Decoding does not verify a token.',
    heading: 'Free online JWT decoder',
    action: 'Decode a JWT',
    sections: [
      ['What a JWT contains', 'A compact signed JWT (JWS) has a Base64URL-encoded header, a claims payload, and a signature separated by periods. The header and payload are readable by anyone who has the token.'],
      ['Decoding is not verification', 'Reading a token does not establish who issued it, whether its signature is valid, or whether its claims should be trusted. Verify signatures and check application-specific authorization separately.'],
      ['Inspect locally', 'Paste a compact token into the JStack decoder to view its header, payload, and signature in this browser. The decoder does not upload the token.'],
    ],
  },
  {
    slug: 'jwt-encoder',
    name: 'JWT encoder and signer',
    title: 'JWT Encoder Online – Create and Sign JWS Tokens | JStack',
    description: 'Create and sign a JSON Web Token in your browser with supported JWS algorithms. Your payload and signing key stay local.',
    heading: 'Free online JWT encoder and signer',
    action: 'Encode and sign a JWT',
    sections: [
      ['Create a signed token', 'Enter a JOSE header and JSON claims payload, select a supported JWS algorithm, and provide its matching key to create a compact signed JWT.'],
      ['Choose keys carefully', 'HMAC algorithms use a shared secret that can both sign and verify. RSA, RSA-PSS, and ECDSA algorithms use private signing keys. Keep private key material secure and use the key type expected by your application.'],
      ['Signing does not encrypt', 'A JWS signature can help detect changes but does not hide the header or payload. Do not put confidential data in a signed-only JWT.'],
    ],
  },
  {
    slug: 'jwt-verifier',
    name: 'JWT signature verifier',
    title: 'JWT Signature Verifier Online – Verify JWS Locally | JStack',
    description: 'Verify a JWT signature and registered claims in your browser using a selected algorithm and key. Verification is not authorization.',
    heading: 'Free online JWT signature verifier',
    action: 'Verify a JWT',
    sections: [
      ['Verify with an expected algorithm', 'Provide a compact JWS, select the algorithm your application expects, and use the corresponding verification key. Do not let an untrusted token choose verification policy.'],
      ['Check claims and context', 'A valid signature alone does not establish that a token is appropriate for a request. Check expected issuer, audience, expiration, and other claims required by your application.'],
      ['Verification is not authorization', 'A successful cryptographic check is only one part of authentication. Your service must still apply its own access-control rules.'],
    ],
  },
  {
    slug: 'jwe-encryptor',
    name: 'JWE encryptor',
    title: 'JWE Encryptor Online – Encrypt a JSON Payload | JStack',
    description: 'Encrypt a JSON payload as a JWE in your browser with supported RSA-OAEP-256 or direct A256GCM key management.',
    heading: 'Free online JWE encryptor',
    action: 'Encrypt a JWE payload',
    sections: [
      ['Encrypt a payload as JWE', 'Enter a JSON plaintext payload and select one of the supported JWE algorithms: RSA-OAEP-256 with A256GCM, or direct key management with A256GCM.'],
      ['Use the matching key', 'Direct A256GCM uses a 256-bit shared key. RSA-OAEP-256 encryption uses the recipient public key; the matching private key is needed to decrypt. Protect keys and plaintext.'],
      ['Keep security boundaries clear', 'JWE encrypts content for confidentiality but does not replace authorization, secure key distribution, or careful handling of decrypted data.'],
    ],
  },
  {
    slug: 'jwe-decryptor',
    name: 'JWE decryptor',
    title: 'JWE Decryptor Online – Decrypt a Compact JWE | JStack',
    description: 'Decrypt a compact JWE locally in your browser with a matching key. Your encrypted token and key are not uploaded.',
    heading: 'Free online JWE decryptor',
    action: 'Decrypt a JWE',
    sections: [
      ['Decrypt a compact JWE', 'A compact JWE has five dot-separated parts. Select the key-management and content-encryption combination used to create it, then provide the matching decryption key.'],
      ['Supported JStack algorithms', 'The workbench supports RSA-OAEP-256 with A256GCM and direct key management with A256GCM. The key must match the selected algorithm and encryption operation.'],
      ['Handle plaintext with care', 'Decrypted content may contain sensitive information. JStack performs the operation in the browser; do not copy plaintext into public logs, URLs, or support requests.'],
    ],
  },
  {
    slug: 'jwt-key-generator',
    name: 'JWT key generator',
    title: 'JWT Key Generator Online – Generate Key Material Locally | JStack',
    description: 'Generate supported HMAC, RSA, ECDSA, or AES-GCM JWT key material with Web Crypto in your browser.',
    heading: 'JWT key generator',
    action: 'Generate JWT key material',
    sections: [
      ['Generate supported key material', 'The JStack workbench can generate HMAC secrets, RSA keys for RS256, PS256, and RSA-OAEP-256, ECDSA P-256 keys for ES256, and a direct A256GCM key using browser cryptography.'],
      ['Private keys stay private', 'Key material is generated in the current browser and is not uploaded by the tool. Store private keys and shared secrets using your application’s secure key-management process.'],
      ['Match the format to your workflow', 'Symmetric HMAC and direct encryption keys are shared secrets. Asymmetric signing uses a private key to sign and the corresponding public key to verify.'],
    ],
  },
  {
    slug: 'json-formatter',
    name: 'JSON formatter',
    title: 'JSON Formatter Online – Format JSON in Your Browser | JStack',
    description: 'Format and indent JSON locally in your browser. The JStack JSON tool also supports minifying and checking JSON syntax.',
    heading: 'Free online JSON formatter',
    action: 'Format JSON',
    sections: [
      ['Format valid JSON', 'Paste a JSON value to parse it and produce an indented representation that is easier to read. Objects, arrays, strings, numbers, booleans, and null follow the JSON syntax rules.'],
      ['Formatting does not validate a schema', 'A successful parse only means the input is syntactically valid JSON. It does not check required fields, data types for your API, or business rules.'],
      ['Other JSON operations', 'The same browser-based workspace can minify JSON by removing unnecessary whitespace or report whether input is syntactically valid.'],
    ],
  },
  {
    slug: 'json-minifier',
    name: 'JSON minifier',
    title: 'JSON Minifier Online – Minify JSON Locally | JStack',
    description: 'Remove unnecessary whitespace from valid JSON in your browser while preserving its data. No JSON is uploaded.',
    heading: 'Free online JSON minifier',
    action: 'Minify JSON',
    sections: [
      ['Reduce JSON whitespace', 'The minifier parses valid JSON and serializes it compactly, removing indentation and other whitespace that is not needed between JSON tokens.'],
      ['Data values are retained', 'Minifying changes presentation, not the parsed JSON values. If the input is malformed, the tool reports an error instead of returning a successful conversion.'],
      ['Use the companion JSON tools', 'JStack also formats JSON into an indented view and checks JSON syntax. These checks do not validate an application schema.'],
    ],
  },
  {
    slug: 'json-validator',
    name: 'JSON syntax validator',
    title: 'JSON Validator Online – Check JSON Syntax | JStack',
    description: 'Check whether text is syntactically valid JSON in your browser. This tool does not validate schemas or application rules.',
    heading: 'Free online JSON syntax validator',
    action: 'Validate JSON',
    sections: [
      ['Check JSON syntax', 'The validator attempts to parse the input as JSON and reports whether it is valid JSON, along with its top-level value kind when valid.'],
      ['Syntax is not schema validation', 'Valid JSON can still have missing fields, unexpected values, or the wrong shape for an API. Use a schema or application-specific checks for those requirements.'],
      ['Format or minify JSON', 'After checking syntax, use the same local workspace to format JSON for readability or minify it for compact output.'],
    ],
  },
  {
    slug: 'json-to-java',
    name: 'JSON to Java model generator',
    title: 'JSON to Java Records and POJOs – Local Generator | JStack',
    description: 'Generate Java records or POJOs from a JSON object in your browser. Infer nested objects, arrays, and nullable reference types without uploading input.',
    heading: 'Generate Java records and POJOs from JSON',
    action: 'Generate Java models',
    sections: [
      ['Infer a model from a JSON example', 'Paste a representative JSON object and choose a root class name. The generator infers Java field types from the sample; it does not replace an API schema or guarantee that future responses have the same shape.'],
      ['Nested objects, arrays, and nulls', 'Nested objects become nested Java types, and arrays of objects merge the fields present in their examples. Nullable scalar fields use Java reference types. Empty arrays, null-only values, and incompatible mixed values use Object because the sample does not provide enough information to choose a narrower type.'],
      ['Records or JavaBeans', 'Record output uses Java records, which require Java 16 or newer. POJO output uses nested static classes with no-argument constructors, getters, and setters. Both styles use wrapper types rather than primitives so fields can be null.'],
      ['Names and serialization', 'Invalid or reserved Java field names are normalized and made unique. When a Java name differs from its JSON key, the output adds Jackson @JsonProperty; include jackson-annotations in your project to compile those annotations. The generator does not create a package declaration, deserializer, validation rules, or application-specific constructors.'],
    ],
  },
  {
    slug: 'base64-converter',
    name: 'Base64 text converter',
    title: 'Base64 Encoder and Decoder Online – UTF-8 Text | JStack',
    description: 'Encode UTF-8 text as standard Base64 or decode Base64 back to text locally in your browser. Base64 is not encryption.',
    heading: 'Free online Base64 text encoder and decoder',
    action: 'Convert text and Base64',
    sections: [
      ['Encode and decode UTF-8 text', 'Convert plain text to standard Base64 or decode standard Base64 text back to UTF-8. The converter processes text in the current browser.'],
      ['Base64 is not encryption', 'Base64 changes representation; it does not hide information or provide integrity protection. Do not use it to protect passwords, tokens, or other secrets.'],
      ['Standard Base64 and Base64URL differ', 'This converter handles standard Base64 text. Base64URL uses a different alphabet and conventions and is not the JWT-specific decoder.'],
    ],
  },
  {
    slug: 'base128-converter',
    name: 'JStack Base128 converter',
    title: 'JStack Base128 Converter – Custom Printable UTF-8 Encoding',
    description: 'Encode and decode UTF-8 text with JStack’s custom printable Base128 format in your browser. It is not a universal Base128 standard.',
    heading: 'JStack Base128 encoder and decoder',
    action: 'Convert text with JStack Base128',
    sections: [
      ['Encode text with the JStack mapping', 'The JStack Base128 converter packs UTF-8 bytes into seven-bit groups and maps each group to a Braille symbol.'],
      ['Base128 is not a universal standard', 'This format uses JStack’s custom U+2801–U+2880 mapping. Use the matching JStack decoder for round-trips; another Base128 implementation may use a different mapping.'],
      ['Process text locally', 'Encoding and decoding run in the current browser. JStack does not upload input or save your text.'],
    ],
  },
]

const articlePages = [
  {
    file: 'blog-jwt-signature-verification.html',
    path: '/blog/jwt-signature-verification',
    image: '/images/jwt-verification-flow.svg',
  },
  {
    file: 'blog-json-to-java-records.html',
    path: '/blog/json-to-java-records',
    image: '/images/json-to-java-flow.svg',
  },
  {
    file: 'blog-base64-vs-base128.html',
    path: '/blog/base64-vs-base128',
    image: '/images/text-encoding-comparison.svg',
  },
]

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

const relatedToolSlugs = {
  'jwt-decoder': ['jwt-verifier', 'jwt-encoder', 'jwt-key-generator'],
  'jwt-encoder': ['jwt-verifier', 'jwt-key-generator', 'jwe-encryptor'],
  'jwt-verifier': ['jwt-decoder', 'jwt-encoder', 'jwt-key-generator'],
  'jwe-encryptor': ['jwe-decryptor', 'jwt-key-generator', 'jwt-verifier'],
  'jwe-decryptor': ['jwe-encryptor', 'jwt-key-generator', 'jwt-verifier'],
  'jwt-key-generator': ['jwt-encoder', 'jwt-verifier', 'jwe-encryptor'],
  'json-formatter': ['json-minifier', 'json-validator', 'json-to-java'],
  'json-minifier': ['json-formatter', 'json-validator', 'json-to-java'],
  'json-validator': ['json-formatter', 'json-to-java', 'json-minifier'],
  'json-to-java': ['json-validator', 'json-formatter'],
  'base64-converter': ['base128-converter', 'json-formatter'],
  'base128-converter': ['base64-converter', 'json-formatter'],
}
const toolsBySlug = new Map(toolPages.map((tool) => [tool.slug, tool]))
for (const tool of toolPages) {
  const canonicalUrl = `${siteUrl}/${tool.slug}`
  const structuredData = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      url: canonicalUrl,
      description: tool.description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'JStack', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: tool.name, item: canonicalUrl },
      ],
    },
  ]).replace(/</g, '\\u003c')
  const sections = tool.sections.map(([heading, content]) => `    <article><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(content)}</p></article>`).join('\n')
  const relatedLinks = relatedToolSlugs[tool.slug]
    .map((slug) => toolsBySlug.get(slug))
    .filter(Boolean)
    .map(({ slug, name }) => `      <a href="/${slug}">${escapeHtml(name)}</a>`)
    .join('\n')
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(tool.description)}">
  <meta name="theme-color" content="#090B10">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/policy.css">
  <script src="/theme.js" defer></script>
  <title>${escapeHtml(tool.title)}</title>
  <script type="application/ld+json">${structuredData}</script>
</head>
<body>
  <header><a class="brand" href="/" aria-label="JStack home"><img src="/jstack-logo.svg" alt="JStack" /></a><nav aria-label="Main navigation"><a href="/">Tools</a><a href="/learning">Learning</a><a href="/blog">Blog</a><a href="/guide">Guide</a><a href="/about">About</a><button class="theme-toggle" type="button" data-theme-toggle><span class="theme-toggle-icon" aria-hidden="true">◐</span><span class="theme-toggle-label">Light theme</span></button></nav></header>
  <main>
    <h1>${escapeHtml(tool.heading)}</h1>
    <p class="lead">${escapeHtml(tool.description)}</p>
    <p><a class="notice" href="/app/${tool.slug}">${escapeHtml(tool.action)} in the JStack browser tool</a></p>
${sections}
    <article><h2>Related JStack tools</h2><nav class="tool-links" aria-label="Related developer tools">
${relatedLinks}
    </nav></article>
    <article><h2>Continue learning</h2><p>Explore practical examples in the <a href="/learning">Java and backend Learning Center</a>, read the <a href="/blog">developer articles</a>, or open the <a href="/guide">JWT and Java backend security guide</a>.</p></article>
    <p class="notice">The tool runs in your browser. Review security-sensitive results independently and do not enter production secrets into a website you have not reviewed.</p>
  </main>
  <footer><span>JStack · developer tools</span><span><a href="/">Tools</a><a href="/guide">Guide</a><a href="/about">About</a><a href="/privacy">Privacy</a></span></footer>
</body>
</html>
`
  await writeFile(join(outputDirectory, `${tool.slug}.html`), html)
}

const setMeta = (html, attribute, key, content) => {
  const escapedContent = escapeHtml(content)
  const expression = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, 'i')
  const tag = `<meta ${attribute}="${key}" content="${escapedContent}" />`
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace('</head>', `  ${tag}\n</head>`)
}

const decodeHtml = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")

const getMetaContent = (html, attribute, key) => {
  const expression = new RegExp(`<meta\\s+${attribute}=(["'])${key}\\1\\s+content=(["'])(.*?)\\2[^>]*>`, 'i')
  return html.match(expression)?.[3] ?? ''
}

const files = await readdir(outputDirectory)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const sitemapPages = [
  { file: 'index.html', path: '/' },
  ...toolPages.map(({ slug }) => ({ file: `${slug}.html`, path: `/${slug}` })),
  ...[
    'about', 'contact', 'changelog', 'disclaimer', 'guide', 'learning', 'privacy', 'terms', 'blog',
  ].map((slug) => ({ file: `${slug}.html`, path: `/${slug}` })),
  ...articlePages,
]
const sitemapPageByFile = new Map(sitemapPages.map((page) => [page.file, page]))
const sitemapFileSet = new Set(sitemapPageByFile.keys())
const missingSitemapFiles = [...sitemapFileSet].filter((file) => !htmlFiles.includes(file))
if (missingSitemapFiles.length) {
  throw new Error(`Missing indexable pages required by the sitemap: ${missingSitemapFiles.join(', ')}`)
}

const adsenseLoader = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6808102016344239" crossorigin="anonymous"></script>'

for (const file of htmlFiles) {
  const filePath = join(outputDirectory, file)
  let html = await readFile(filePath, 'utf8')
  if (html.trim() === `google-site-verification: ${file}`) continue
  if (file === '404.html') continue
  html = html.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/gi, '')
  const pagePath = sitemapPageByFile.get(file)?.path ?? (file === 'index.html' ? '/' : `/${file.replace(/\.html$/i, '')}`)
  const canonical = `${siteUrl}${pagePath}`
  const socialImage = sitemapPageByFile.get(file)?.image
    ? `${siteUrl}${sitemapPageByFile.get(file).image}`
    : `${siteUrl}/og-card.svg`
  const title = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? 'JStack developer tools')
  const description = decodeHtml(getMetaContent(html, 'name', 'description') || 'Browser-based developer tools from JStack.')
  if (sitemapFileSet.has(file) && !html.includes('ca-pub-6808102016344239')) {
    html = html.replace('</head>', `  ${adsenseLoader}\n</head>`)
  }
  if (file !== 'workspace.html') {
    html = html.replace(/<head>/i, `<head>\n  <link rel="canonical" href="${canonical}" />`)
  }
  html = setMeta(html, 'name', 'robots', sitemapFileSet.has(file) ? 'index, follow' : 'noindex, follow')
  html = setMeta(html, 'property', 'og:type', articlePages.some((article) => article.file === file) ? 'article' : 'website')
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'property', 'og:url', canonical)
  html = setMeta(html, 'property', 'og:image', socialImage)
  html = setMeta(html, 'property', 'og:image:alt', sitemapPageByFile.get(file)?.image ? `Diagram for ${title}` : 'JStack Java and backend developer tools')
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image')
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', description)
  html = setMeta(html, 'name', 'twitter:image', socialImage)
  html = setMeta(html, 'name', 'twitter:image:alt', sitemapPageByFile.get(file)?.image ? `Diagram for ${title}` : 'JStack Java and backend developer tools')
  if (file === 'index.html') {
    const websiteData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'JStack',
      url: siteUrl,
      description,
    }
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(websiteData).replace(/</g, '\\u003c')}</script>\n</head>`)
  } else if (articlePages.some((article) => article.file === file)) {
    const heading = decodeHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? '')
    const articleData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: heading,
      description,
      image: socialImage,
      mainEntityOfPage: canonical,
    }
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(articleData).replace(/</g, '\\u003c')}</script>\n</head>`)
  }
  if (file !== 'index.html' && file !== 'workspace.html' && !/"@type"\s*:\s*"BreadcrumbList"/.test(html)) {
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    const breadcrumbName = decodeHtml(heading?.replace(/<[^>]*>/g, '').trim() ?? '')
    if (!breadcrumbName) {
      throw new Error(`Cannot create a breadcrumb for ${file}: the page needs a non-empty H1.`)
    }
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'JStack', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: breadcrumbName, item: canonical },
      ],
    }
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(breadcrumbData).replace(/</g, '\\u003c')}</script>\n</head>`)
  }
  await writeFile(filePath, html.replace(/\r\n?/g, '\n'))
}

const workspaceHtml = await readFile(join(outputDirectory, 'workspace.html'), 'utf8')
for (const { slug } of toolPages) {
  const routeFile = join(outputDirectory, 'app', `${slug}.html`)
  await mkdir(dirname(routeFile), { recursive: true })
  await writeFile(routeFile, workspaceHtml)
}

for (const { file, path } of articlePages) {
  const routeFile = join(outputDirectory, `${path.slice(1)}.html`)
  await mkdir(dirname(routeFile), { recursive: true })
  await writeFile(routeFile, await readFile(join(outputDirectory, file), 'utf8'))
}

const robotsPath = join(outputDirectory, 'robots.txt')
const sitemapPath = join(outputDirectory, 'sitemap.xml')
const urls = sitemapPages.map(({ path }) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')
await writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
await writeFile(robotsPath, `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
console.log(`Generated canonical URLs, metadata, ${sitemapPages.length} sitemap URLs, and robots.txt for ${siteUrl}`)