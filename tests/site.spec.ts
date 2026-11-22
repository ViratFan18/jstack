import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const publicRoutes = [
  { path: '/', heading: 'Java & Backend Developer Workbench' },
  { path: '/jwt-decoder', heading: 'Free online JWT decoder' },
  { path: '/jwt-encoder', heading: 'Free online JWT encoder and signer' },
  { path: '/jwt-verifier', heading: 'Free online JWT signature verifier' },
  { path: '/jwe-encryptor', heading: 'Free online JWE encryptor' },
  { path: '/jwe-decryptor', heading: 'Free online JWE decryptor' },
  { path: '/jwt-key-generator', heading: 'JWT key generator' },
  { path: '/json-formatter', heading: 'Free online JSON formatter' },
  { path: '/json-minifier', heading: 'Free online JSON minifier' },
  { path: '/json-validator', heading: 'Free online JSON syntax validator' },
  { path: '/json-to-java', heading: 'Generate Java records and POJOs from JSON' },
  { path: '/base64-converter', heading: 'Free online Base64 text encoder and decoder' },
  { path: '/base128-converter', heading: 'JStack Base128 encoder and decoder' },
  { path: '/about', heading: 'Java developer tools for JWT, JSON and Java models.' },
  { path: '/contact', heading: 'Contact' },
  { path: '/feedback', heading: 'Feedback' },
  { path: '/learning', heading: 'Learn by working through backend examples.' },
  { path: '/changelog', heading: 'Changelog and project notes' },
  { path: '/disclaimer', heading: 'Developer Tool Disclaimer' },
  { path: '/privacy', heading: 'Privacy Policy' },
  { path: '/terms', heading: 'Terms of Use' },
  { path: '/guide', heading: 'JWT and Java backend security: practical guide' },
  { path: '/blog', heading: 'Practical notes for Java and backend work' },
  { path: '/blog/jwt-signature-verification', heading: 'JWT decoding is not signature verification' },
  { path: '/blog/json-to-java-records', heading: 'From a JSON example to a Java model' },
  { path: '/blog/base64-vs-base128', heading: 'Base64, Base64URL, and JStack Base128' },
  { path: '/404.html', heading: 'Page not found' },
]

test('public routes render their own page and fit the viewport', async ({ page }) => {
  for (const route of publicRoutes) {
    await page.goto(route.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow, route.path).toBe(false)
  }
})

test('public tool pages feature mobile-friendly buttons to open their interactive tools', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const toolPages = [
    { slug: 'jwt-decoder', name: 'JWT decoder' },
    { slug: 'jwt-encoder', name: 'JWT encoder and signer' },
    { slug: 'jwt-verifier', name: 'JWT signature verifier' },
    { slug: 'jwe-encryptor', name: 'JWE encryptor' },
    { slug: 'jwe-decryptor', name: 'JWE decryptor' },
    { slug: 'jwt-key-generator', name: 'JWT key generator' },
    { slug: 'json-formatter', name: 'JSON formatter' },
    { slug: 'json-minifier', name: 'JSON minifier' },
    { slug: 'json-validator', name: 'JSON syntax validator' },
    { slug: 'json-to-java', name: 'JSON to Java model generator' },
    { slug: 'base64-converter', name: 'Base64 text converter' },
    { slug: 'base128-converter', name: 'JStack Base128 converter' },
  ]

  for (const { slug, name } of toolPages) {
    await page.goto(`/${slug}`)
    const action = page.getByRole('link', { name: `Open ${name}` })
    await expect(action).toBeVisible()
    await expect(action).toHaveAttribute('href', `/app/${slug}`)
    await expect(action).toHaveCSS('display', 'flex')
    await expect(action).toHaveCSS('min-height', '48px')
    const fitsViewport = await action.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth
    })
    expect(fitsViewport, `CTA for /${slug} fits a 320px viewport`).toBe(true)

    if (slug === 'jwt-decoder') {
      await action.click()
      await expect(page).toHaveURL(/\/app\/jwt-decoder$/)
      await expect(page.getByRole('heading', { name: 'JWT Decoder' })).toBeVisible()
    }
  }
})

test('homepage launches tools directly and workspace pages omit visible breadcrumbs', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-tool-card')).toHaveCount(12)
  await expect(page.getByRole('heading', { name: 'Java & Backend Developer Workbench' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Smart Paste' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Paste from Clipboard' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open JSON formatter' }).click()
  await expect(page).toHaveURL(/\/app\/json-formatter$/)
  await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)
})

test('public SEO metadata, sitemap, robots, and internal links are consistent', async ({ request }) => {
  const indexableRoutes = publicRoutes.filter(({ path }) => path !== '/feedback' && path !== '/404.html')
  const titles = new Set<string>()
  const descriptions = new Set<string>()
  const canonicalOrigins = new Set<string>()
  const pages = new Map<string, string>()
  const indexablePaths = new Set(indexableRoutes.map(({ path }) => path))

  for (const route of indexableRoutes) {
    const response = await request.get(route.path)
    expect(response.status(), route.path).toBe(200)
    const html = await response.text()
    pages.set(route.path, html)
    expect(html, `${route.path} AdSense loader`).toContain('adsbygoogle.js?client=ca-pub-6808102016344239')

    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim()
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim()
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]
    const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1]
    expect(title, `${route.path} title`).toBeTruthy()
    expect(description, `${route.path} description`).toBeTruthy()
    expect(canonical, `${route.path} canonical`).toBeTruthy()
    expect(robots, `${route.path} robots`).toBe('index, follow')
    expect((html.match(/<h1\b/gi) || []).length, `${route.path} H1 count`).toBe(1)
    expect(titles.has(title!), `${route.path} title is unique`).toBe(false)
    expect(descriptions.has(description!), `${route.path} description is unique`).toBe(false)
    titles.add(title!)
    descriptions.add(description!)

    const canonicalUrl = new URL(canonical!)
    expect(canonicalUrl.pathname, `${route.path} canonical path`).toBe(route.path)
    canonicalOrigins.add(canonicalUrl.origin)
    expect(html).toContain(`<meta property="og:url" content="${canonicalUrl.href}"`)

    const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
      .flatMap(([, value]) => {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [parsed]
      })
    if (route.path === '/') {
      expect(structuredData.some(({ '@type': type }) => type === 'WebSite')).toBe(true)
      expect(html).toContain('href="/blog/jwt-signature-verification"')
      expect(html).toContain('href="/blog/json-to-java-records"')
      expect(html).toContain('href="/blog/base64-vs-base128"')
    } else {
      expect(structuredData.filter(({ '@type': type }) => type === 'BreadcrumbList')).toHaveLength(1)
    }
  }
  expect(canonicalOrigins.size).toBe(1)

  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.status()).toBe(200)
  const sitemap = await sitemapResponse.text()
  const sitemapLocations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, location]) => new URL(location))
  expect(sitemapLocations.map(({ pathname }) => pathname).sort())
    .toEqual(indexableRoutes.map(({ path }) => path).sort())
  for (const location of sitemapLocations) {
    expect(pages.has(location.pathname), `${location.pathname} is represented in the sitemap`).toBe(true)
    expect(pages.get(location.pathname)).toContain(`<link rel="canonical" href="${location.href}"`)
    expect(location.pathname).not.toContain('.html')
    expect(location.pathname).not.toMatch(/^\/app\//)
  }

  const robotsResponse = await request.get('/robots.txt')
  expect(robotsResponse.status()).toBe(200)
  const robots = await robotsResponse.text()
  expect(robots).toContain('User-agent: *')
  expect(robots).toContain('Allow: /')
  expect(robots).toContain(`Sitemap: ${sitemapLocations[0].origin}/sitemap.xml`)
  expect(robots).not.toMatch(/^Disallow:\s*\/(?:assets|fonts)/im)

  const feedbackResponse = await request.get('/feedback')
  expect(await feedbackResponse.text()).toMatch(/<meta\s+name="robots"\s+content="noindex, follow"/i)
  const appResponse = await request.get('/app/jwt-decoder')
  expect(appResponse.status()).toBe(200)
  expect(appResponse.headers()['x-robots-tag']).toBe('noindex, follow')
  expect(await appResponse.text()).not.toContain('pagead2.googlesyndication.com')

  for (const articlePath of [
    '/blog/jwt-signature-verification',
    '/blog/json-to-java-records',
    '/blog/base64-vs-base128',
  ]) {
    const article = pages.get(articlePath)
    expect(article).toContain('<meta property="og:type" content="article"')
    const data = [...article!.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
      .map(([, value]) => JSON.parse(value))
      .flat()
    expect(data.some(({ '@type': type }) => type === 'Article'), `${articlePath} Article data`).toBe(true)
  }

  const internalPaths = new Set<string>()
  const linkedFromAnotherPage = new Set<string>()
  for (const [sourcePath, html] of pages) {
    const sourceCanonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]
    for (const [, , href] of html.matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1/gi)) {
      if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(href)) continue
      const target = new URL(href, sourceCanonical!)
      if (target.origin === new URL(sourceCanonical!).origin) {
        internalPaths.add(`${target.pathname}${target.search}`)
        if (sourcePath !== target.pathname && indexablePaths.has(target.pathname)) {
          linkedFromAnotherPage.add(target.pathname)
        }
      }
    }
  }
  for (const path of indexablePaths) {
    expect(linkedFromAnotherPage.has(path), `${path} is linked from another indexable page`).toBe(true)
  }
  for (const path of internalPaths) {
    const response = await request.get(path)
    expect(response.status(), `Internal link ${path}`).toBe(200)
  }
})

test('legacy .html page URLs permanently redirect to their canonical paths', async ({ request }) => {
  const aliases = [
    { oldPath: '/index.html', target: '/' },
    ...publicRoutes
      .filter(({ path }) => path !== '/' && path !== '/404.html')
      .map(({ path }) => ({
        oldPath: path.startsWith('/blog/')
          ? `/blog-${path.slice('/blog/'.length).replaceAll('/', '-')}.html`
          : `${path}.html`,
        target: path,
      })),
  ]

  for (const { oldPath, target } of aliases) {
    const response = await request.get(oldPath, { maxRedirects: 0 })
    expect(response.status(), oldPath).toBe(301)
    expect(response.headers().location, oldPath).toBe(target)
  }
})

test('production deployment artifacts revalidate documents and retain hashed assets', async () => {
  const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8')
  const redirects = await readFile(new URL('../dist/_redirects', import.meta.url), 'utf8')
  expect(headers).toMatch(/\*\s+[\s\S]*?Cache-Control: no-cache/)
  expect(headers).toMatch(/\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/)
  expect(headers).toContain('pagead2.googlesyndication.com')
  expect(redirects).toContain('/* /404.html 404')
  expect(redirects).not.toMatch(/^\/(?:blog(?:\/.*)?|app\/.*)\s+\S+\s+200$/m)

  for (const slug of [
    'jwt-decoder', 'jwt-encoder', 'jwt-verifier', 'jwe-encryptor', 'jwe-decryptor',
    'jwt-key-generator', 'json-formatter', 'json-minifier', 'json-validator',
    'json-to-java', 'base64-converter', 'base128-converter',
  ]) {
    const routeHtml = await readFile(new URL(`../dist/app/${slug}.html`, import.meta.url), 'utf8')
    expect(routeHtml, `/app/${slug} has a generated route document`).toContain('<div id="root"></div>')
    expect(routeHtml, `/app/${slug} is excluded from indexing`).toContain('<meta name="robots" content="noindex, follow"')
    expect(routeHtml, `/app/${slug} does not load ads`).not.toContain('adsbygoogle.js')
  }

  for (const [slug, heading] of [
    ['jwt-signature-verification', 'JWT decoding is not signature verification'],
    ['json-to-java-records', 'From a JSON example to a Java model'],
    ['base64-vs-base128', 'Base64, Base64URL, and JStack Base128'],
  ]) {
    const routeHtml = await readFile(new URL(`../dist/blog/${slug}.html`, import.meta.url), 'utf8')
    expect(routeHtml, `/blog/${slug} has a generated route document`).toContain(`<h1>${heading}</h1>`)
    expect(routeHtml, `/blog/${slug} has its canonical URL`).toContain(`href="https://jstack.pages.dev/blog/${slug}"`)
  }
})

test('AdSense publisher setup is on public pages without loading in the tool workspace', async ({ request }) => {
  const loader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6808102016344239'
  const homeResponse = await request.get('/')
  expect(await homeResponse.text()).toContain(loader)

  const articleResponse = await request.get('/blog/jwt-signature-verification')
  expect(await articleResponse.text()).toContain(loader)

  const appResponse = await request.get('/app/json-formatter')
  const workspaceHtml = await appResponse.text()
  expect(workspaceHtml).not.toContain(loader)
  expect(workspaceHtml).toContain('<meta name="robots" content="noindex, follow"')
  expect(workspaceHtml).not.toContain('rel="canonical"')
  expect(appResponse.headers()['x-robots-tag']).toBe('noindex, follow')

  const adsTxtResponse = await request.get('/ads.txt')
  expect(adsTxtResponse.status()).toBe(200)
  expect(await adsTxtResponse.text()).toContain('google.com, pub-6808102016344239, DIRECT, f08c47fec0942fa0')

  const verificationResponse = await request.get('/google06bc19c9d9d58551.html')
  expect(verificationResponse.status()).toBe(200)
  expect((await verificationResponse.text()).trim()).toBe('google-site-verification: google06bc19c9d9d58551.html')

  for (const imagePath of [
    '/images/jwt-verification-flow.svg',
    '/images/json-to-java-flow.svg',
    '/images/text-encoding-comparison.svg',
  ]) {
    const imageResponse = await request.get(imagePath)
    expect(imageResponse.status(), imagePath).toBe(200)
    expect(imageResponse.headers()['content-type']).toContain('image/svg+xml')
  }
})

test('unknown paths return the branded 404 document with a 404 status', async ({ request }) => {
  const response = await request.get('/not-a-real-jstack-page')
  expect(response.status()).toBe(404)
  expect(await response.text()).toContain('<title>Page Not Found · JStack</title>')

  const unknownTool = await request.get('/app/not-a-real-tool')
  expect(unknownTool.status()).toBe(404)
  expect(await unknownTool.text()).toContain('<title>Page Not Found · JStack</title>')
})

test('static pages load the bundled Inter font', async ({ page }) => {
  const fontResponse = page.waitForResponse((response) => response.url().endsWith('/fonts/inter-latin-wght-normal.woff2'))
  await page.goto('/terms')
  expect((await fontResponse).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Terms of Use' })).toBeVisible()
})

test('static code samples load the bundled JetBrains Mono font', async ({ page }) => {
  const fontResponse = page.waitForResponse((response) => response.url().endsWith('/fonts/jetbrains-mono-latin-wght-normal.woff2'))
  await page.goto('/guide')
  expect((await fontResponse).status()).toBe(200)
  await expect(page.locator('pre code').first()).toHaveCSS('font-family', /JetBrains Mono/)
})

test('JSON formatter produces formatted content', async ({ page }) => {
  await page.goto('/app/json-formatter')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"displayName": "Ada Lovelace"')
})

test('JWT decoding stays explicitly unverified and retains malformed input', async ({ page }) => {
  await page.goto('/app/jwt-decoder')
  await page.locator('.heading-actions .sample-button').click()
  await page.getByRole('button', { name: 'Decode token' }).click()
  await expect(page.locator('.notice')).toContainText('Decoded, not verified')
  await expect(page.locator('.decoded-panels')).toContainText('java-dev')

  const tokenInput = page.getByLabel('Encoded token')
  await tokenInput.fill('not.a.jwt')
  await page.getByRole('button', { name: 'Decode token' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(tokenInput).toHaveValue('not.a.jwt')
})

test('direct JWE encrypt and decrypt round-trip in the UI', async ({ page }) => {
  await page.goto('/app/jwe-encryptor')
  await expect(page.locator('#jwt-algorithm')).toHaveValue('dir/A256GCM')
  await page.locator('.heading-actions .sample-button').click()
  await page.getByRole('button', { name: 'Encrypt payload' }).click()
  const compactJwe = await page.locator('.output-box pre').textContent()
  expect(compactJwe?.split('.')).toHaveLength(5)

  await page.getByRole('tab', { name: 'Decrypt' }).click()
  await page.getByLabel('JWE token').fill(compactJwe || '')
  await page.getByRole('button', { name: 'Decrypt token' }).click()
  await expect(page.locator('.output-box pre')).toContainText('"sub": "java-dev"')
})

test('JSON minifier preserves large numbers and syntax errors keep the input', async ({ page }) => {
  await page.goto('/app/json-minifier')
  const input = page.getByLabel('JSON INPUT')
  const source = '{ "n": 9007199254740993, "huge": 1e400 }'
  await input.fill(source)
  await page.getByRole('button', { name: 'Run JSON minify' }).click()
  await expect(page.locator('.converter-output')).toHaveText('{"n":9007199254740993,"huge":1e400}')

  await input.fill('{ broken')
  await page.getByRole('button', { name: 'Run JSON minify' }).click()
  await expect(page.getByRole('alert')).toContainText('JSON')
  await expect(input).toHaveValue('{ broken')
})

test('JSON syntax validation, Java POJO generation, and output download work', async ({ page }) => {
  await page.goto('/app/json-validator')
  await page.getByLabel('JSON INPUT').fill('null')
  await page.getByRole('button', { name: 'Run JSON validate' }).click()
  await expect(page.locator('.converter-output')).toHaveText('Valid JSON · null')
  await expect(page.getByText('Validation checks JSON syntax only.')).toBeVisible()

  await page.goto('/app/json-to-java')
  await page.getByLabel('JSON INPUT').fill('{"a":1,"A":2}')
  await page.getByRole('tab', { name: 'POJO' }).click()
  await page.getByRole('button', { name: 'Generate Java model' }).click()
  await expect(page.locator('.java-output')).toContainText('getA2()')

  await page.goto('/app/json-formatter')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('formatted.json')
})

test('Base64 and JStack Base128 handle empty text and Unicode round trips', async ({ page }) => {
  await page.goto('/app/base64-converter')
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'Run base64 encode' }).click()
  await expect(page.getByText('The operation completed and returned an empty string.')).toBeVisible()
  await page.getByRole('tab', { name: 'decode' }).click()
  await page.getByRole('button', { name: 'Run base64 decode' }).click()
  await expect(page.getByText('The operation completed and returned an empty string.')).toBeVisible()
  await page.getByLabel('BASE64 INPUT').fill('%%%')
  await page.getByRole('button', { name: 'Run base64 decode' }).click()
  await expect(page.getByRole('alert')).toContainText('standard Base64')
  await expect(page.getByLabel('BASE64 INPUT')).toHaveValue('%%%')

  await page.goto('/app/base128-converter')
  const textInput = page.getByLabel('PLAIN TEXT')
  await textInput.fill('café 🚀')
  await page.getByRole('button', { name: 'Run base128 encode' }).click()
  const encoded = await page.locator('.converter-output').textContent()
  expect(encoded).toMatch(/^[\u2801-\u2880]+$/)
  await page.getByRole('tab', { name: 'decode' }).click()
  await page.getByLabel('BASE128 INPUT').fill(encoded || '')
  await page.getByRole('button', { name: 'Run base128 decode' }).click()
  await expect(page.locator('.converter-output')).toHaveText('café 🚀')
  await page.getByLabel('BASE128 INPUT').fill('invalid')
  await page.getByRole('button', { name: 'Run base128 decode' }).click()
  await expect(page.getByRole('alert')).toContainText('Braille symbols')
  await expect(page.getByLabel('BASE128 INPUT')).toHaveValue('invalid')
})

test('tool input limits report errors without discarding large input', async ({ page }) => {
  const json = ' '.repeat(500_001)
  await page.goto('/app/json-formatter')
  const jsonInput = page.getByLabel('JSON INPUT')
  await jsonInput.fill(json)
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.getByRole('alert')).toContainText('500,000 characters')
  expect((await jsonInput.inputValue()).length).toBe(json.length)

  const javaJson = ' '.repeat(200_001)
  await page.goto('/app/json-to-java')
  const javaInput = page.getByLabel('JSON INPUT')
  await javaInput.fill(javaJson)
  await page.getByRole('button', { name: 'Generate Java model' }).click()
  await expect(page.getByRole('alert')).toContainText('200,000 characters')
  expect((await javaInput.inputValue()).length).toBe(javaJson.length)

  const text = 'x'.repeat(500_001)
  await page.goto('/app/base64-converter')
  const textInput = page.getByLabel('PLAIN TEXT')
  await textInput.fill(text)
  await page.getByRole('button', { name: 'Run base64 encode' }).click()
  await expect(page.getByRole('alert')).toContainText('500,000 characters')
  expect((await textInput.inputValue()).length).toBe(text.length)

  await page.goto('/app/jwt-decoder')
  const tokenInput = page.getByLabel('Encoded token')
  await tokenInput.fill(text)
  await page.getByRole('button', { name: 'Decode token' }).click()
  await expect(page.getByRole('alert')).toContainText('500,000 characters')
  expect((await tokenInput.inputValue()).length).toBe(text.length)
})

test('tool routes use clean URLs and restore browser history', async ({ page }) => {
  await page.goto('/app/json-formatter')
  await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
  await page.getByRole('tab', { name: 'minify' }).click()
  await expect(page).toHaveURL(/\/app\/json-minifier$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/json-formatter$/)
  await expect(page.getByRole('tab', { name: 'format' })).toHaveAttribute('aria-selected', 'true')
  await page.goForward()
  await expect(page).toHaveURL(/\/app\/json-minifier$/)
  await expect(page.getByRole('tab', { name: 'minify' })).toHaveAttribute('aria-selected', 'true')
  await page.reload()
  await expect(page.getByRole('tab', { name: 'minify' })).toHaveAttribute('aria-selected', 'true')
})

test('quick launch updates clean route history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open JSON to Java generator' }).click()
  await expect(page).toHaveURL(/\/app\/json-to-java$/)
  await expect(page.getByRole('heading', { name: 'JSON To Java Models' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

test('favorites reopen the interactive tool and can be cleared', async ({ page }) => {
  await page.goto('/app/json-formatter')
  await page.getByRole('button', { name: 'Favorite this tool' }).click()
  await expect(page.getByText('FAVORITES', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Search tools and pages' }).click()
  const commandDialog = page.getByRole('dialog', { name: 'Search JStack tools' })
  await expect(commandDialog.locator('.command-results button').first().locator('.command-enter')).toHaveText('Favorites')
  await page.keyboard.press('Escape')
  await page.locator('.sidebar .nav-item').filter({ hasText: 'JSON formatter' }).first().click()
  await expect(page).toHaveURL(/\/app\/json-formatter$/)
  await page.getByRole('button', { name: 'Clear favorites' }).click()
  await expect(page.getByText('FAVORITES', { exact: true })).toHaveCount(0)
})

test('sidebar tool search shows matching tools and opens the selected result', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  const search = page.getByRole('textbox', { name: 'Filter tools' })
  await search.fill('decoder JWT')
  const decoder = page.getByRole('button', { name: 'JWT decoder', exact: true })
  await expect(decoder).toBeVisible()
  await expect(page.getByRole('button', { name: 'JWT encoder and signer', exact: true })).toHaveCount(0)
  await decoder.click()
  await expect(page).toHaveURL(/\/app\/jwt-decoder$/)
  await expect(page.getByRole('heading', { name: 'JWT Decoder' })).toBeVisible()
  await expect(search).toHaveValue('')
})

test('stored tool lists ignore unknown and inherited property names', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jstack-favorites', JSON.stringify(['toString', '__proto__', 'json-formatter']))
    localStorage.setItem('jstack-recent', JSON.stringify(['constructor', 'jwt-decoder']))
  })
  await page.goto('/app/json-formatter')
  await expect(page.getByRole('button', { name: 'ToString' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Constructor' })).toHaveCount(0)
  await expect(page.getByText('FAVORITES', { exact: true })).toBeVisible()
})

test('corrupt and oversized stored preferences are ignored safely', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jstack-theme-v2', 'invalid-theme')
    localStorage.setItem('jstack-favorites', 'x'.repeat(5000))
    localStorage.setItem('jstack-recent', '{malformed')
  })
  await page.goto('/app/json-formatter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByText('FAVORITES', { exact: true })).toHaveCount(0)
  await expect(page.getByText('RECENT', { exact: true })).toBeVisible()
  await expect(page.locator('.recent-nav-item')).toHaveText(/JSON formatter/)
  await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
})

test('tool favorites remain usable when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage is blocked', 'SecurityError') },
    })
  })
  await page.goto('/app/json-formatter')
  await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
  await page.getByRole('button', { name: 'Favorite this tool' }).click()
  await expect(page.getByText('FAVORITES', { exact: true })).toBeVisible()
  await page.locator('.sidebar .nav-item').filter({ hasText: 'JSON formatter' }).first().click()
  await expect(page).toHaveURL(/\/app\/json-formatter$/)
  await expect(page.locator('.tool-action-status')).toContainText('may not persist')
})

test('theme, favorites, and recent tools synchronize across tabs', async ({ page }) => {
  const secondTab = await page.context().newPage()
  await page.goto('/app/json-formatter')
  await secondTab.goto('/app/json-minifier')

  await page.getByRole('button', { name: 'Favorite this tool' }).click()
  await expect(secondTab.locator('.sidebar')).toContainText('JSON formatter')
  await page.goto('/app/base64-converter')
  await expect(secondTab.locator('.recent-nav-item').first()).toHaveText('Base64 text converter')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: 'Clear favorites' }).click()
  await expect(secondTab.getByText('FAVORITES', { exact: true })).toHaveCount(0)
  await secondTab.close()
})

test('recent tools use descriptive labels for every supported operation', async ({ page }) => {
  const tools = [
    ['jwt-decoder', 'JWT decoder'],
    ['jwt-encoder', 'JWT encoder and signer'],
    ['jwt-verifier', 'JWT signature verifier'],
    ['jwe-encryptor', 'JWE encryptor'],
    ['jwe-decryptor', 'JWE decryptor'],
    ['jwt-key-generator', 'JWT key generator'],
    ['json-formatter', 'JSON formatter'],
    ['json-minifier', 'JSON minifier'],
    ['json-validator', 'JSON syntax validator'],
    ['json-to-java', 'JSON to Java models'],
    ['base64-converter', 'Base64 text converter'],
    ['base128-converter', 'JStack Base128 converter'],
  ]
  for (const [slug, label] of tools) {
    await page.goto(`/app/${slug}`)
    await expect(page.locator('.recent-nav-item').first()).toHaveText(label)
  }
})

test('full browser storage reports preference persistence failure without breaking tools', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('jstack-')) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      originalSetItem.call(this, key, value)
    }
  })
  await page.goto('/app/json-formatter')
  await page.getByRole('button', { name: 'Favorite this tool' }).click()
  await expect(page.getByRole('button', { name: 'Favorite this tool' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.tool-action-status')).toContainText('storage is blocked or full')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"displayName": "Ada Lovelace"')
})

test('a failed lazy chunk preserves input and can be retried; loaded tools work offline', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url())
  })
  await page.goto('/app/json-formatter')
  const input = page.getByLabel('JSON INPUT')
  await input.fill('{"retry":"works"}')
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-error')).toContainText('local tool code could not be loaded')
  await expect(input).toHaveValue('{"retry":"works"}')

  await page.unroute('**/assets/*.js')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"retry": "works"')

  await page.context().setOffline(true)
  await expect(page.locator('.connection-notice')).toContainText('first-time tool loads')
  await input.fill('{"offline":"works"}')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"offline": "works"')
  expect(externalRequests).toEqual([])
  await page.context().setOffline(false)
})

test('a stale lazy-module response cannot replace results after the input changes', async ({ page }) => {
  await page.goto('/app/json-formatter')
  const input = page.getByLabel('JSON INPUT')
  await input.fill('{"version":"old"}')
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue()
  })
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await input.fill('{"version":"new"}')
  await page.unroute('**/assets/*.js')
  await expect(page.locator('.converter-output')).toHaveCount(0)
  await expect(page.locator('.converter-error')).toHaveCount(0)
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"version": "new"')
})

test('a missing startup script exposes a non-destructive recovery action', async ({ page }) => {
  await page.route('**/assets/main-*.js', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'JStack encountered an application or resource error.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible()
  await expect(page.locator('.seo-fallback h1')).toBeVisible()
})

test('local font failures fall back without blocking page content', async ({ page }) => {
  await page.route('**/*.woff2', (route) => route.abort())
  await page.goto('/app/json-formatter')
  await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
  await page.getByLabel('JSON INPUT').fill('{"font":"fallback"}')
  await page.getByRole('button', { name: 'Run JSON format' }).click()
  await expect(page.locator('.converter-output')).toContainText('"font": "fallback"')
})

test('Base64 converter produces the expected output', async ({ page }) => {
  await page.goto('/app/base64-converter')
  await page.getByRole('button', { name: 'Run base64 encode' }).click()
  await expect(page.locator('.converter-output')).toContainText('SmF2YSBkZXZlbG9wZXJzLCB3ZWxjb21lIQ==')
})

test('key generator creates correctly sized HS512 material', async ({ page }) => {
  await page.goto('/app/jwt-key-generator')
  await page.getByLabel('Key type and algorithm').selectOption('HS512')
  await page.getByRole('button', { name: 'Generate key material' }).click()
  await expect(page.locator('.key-status')).toHaveText('Key material added to the output panel.')
  await expect(page.locator('.output-box pre')).toHaveText(/^[A-Za-z0-9_-]{86}$/)
})

test('failed key generation does not report success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'getRandomValues', {
      configurable: true,
      value() {
        throw new Error('Random source unavailable.')
      },
    })
  })
  await page.goto('/app/jwt-key-generator')
  await page.getByRole('button', { name: 'Generate key material' }).click()
  await expect(page.locator('.key-status')).toContainText('Key generation failed')
  await expect(page.locator('.key-status')).not.toContainText('Key material added')
  await expect(page.locator('.notice')).toContainText('Random source unavailable')
})

test('JWT claim shortcuts explain and insert editable sample values', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  const payload = page.getByLabel('JWT payload')
  await expect(page.getByText('Add an example to your payload, then edit it for your service. JWT time values use seconds since Jan 1, 1970.')).toBeVisible()

  await page.getByRole('button', { name: /Add expiration claim \(exp\)/ }).click()
  let claims = JSON.parse(await payload.inputValue())
  expect(typeof claims.exp).toBe('number')
  expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))

  await page.getByRole('button', { name: /Add valid from claim \(nbf\)/ }).click()
  claims = JSON.parse(await payload.inputValue())
  expect(typeof claims.nbf).toBe('number')

  await page.getByRole('button', { name: /Add issuer claim \(iss\)/ }).click()
  claims = JSON.parse(await payload.inputValue())
  expect(claims.iss).toBe('https://issuer.example')

  await page.getByRole('button', { name: /Add audience claim \(aud\)/ }).click()
  claims = JSON.parse(await payload.inputValue())
  expect(claims.aud).toBe('java-api')
})

test('JWT claim shortcuts explain when the payload is not an object', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  const payload = page.getByLabel('JWT payload')
  await payload.fill('[]')
  await page.getByRole('button', { name: /Add expiration claim \(exp\)/ }).click()
  await expect(page.locator('.notice')).toContainText('JWT claims can only be added to a JSON object')
  await expect(payload).toHaveValue('[]')
})

test('JWT examples prepare valid input for the selected operation', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  await page.locator('.heading-actions .sample-button').click()
  await page.getByRole('button', { name: 'Sign JWT' }).click()
  await expect(page.locator('.output-box pre')).toHaveText(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)

  await page.goto('/app/jwt-verifier')
  await page.locator('.heading-actions .sample-button').click()
  await expect(page.getByText('Example ready')).toBeVisible()
  await page.getByRole('button', { name: 'Verify token' }).click()
  await expect(page.getByText('Signature and registered claims verified')).toBeVisible()

  await page.goto('/app/jwe-decryptor')
  await page.locator('.heading-actions .sample-button').click()
  await expect(page.getByText('Example ready')).toBeVisible()
  await page.getByRole('button', { name: 'Decrypt token' }).click()
  await expect(page.locator('.output-box pre')).toContainText('"sub": "java-dev"')
})

test('JSON panel clipboard fallback selects the intended output', async ({ page }) => {
  await page.goto('/app/jwt-decoder')
  await page.locator('.heading-actions .sample-button').click()
  await page.getByRole('button', { name: 'Decode token' }).click()
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('Clipboard denied.') } },
    })
  })
  await page.getByRole('button', { name: 'Copy payload' }).click()
  await expect(page.getByRole('status')).toContainText('JSON selected')
})

test('feedback form shows accessible validation errors', async ({ page }) => {
  await page.goto('/feedback')
  await page.getByRole('button', { name: 'Prepare feedback email' }).click()
  await expect(page.locator('#feedback-status')).toContainText('Please complete the required fields')
  await expect(page.locator('#feedback-message')).toHaveAttribute('aria-invalid', 'true')
})

test('feedback prepares a real email draft without claiming it was sent', async ({ page }) => {
  await page.goto('/feedback')
  await page.getByLabel('Feedback type').selectOption({ label: 'Bug report' })
  await page.getByLabel('Email address (optional)').fill('dev@example.test')
  await page.getByLabel('Message').fill('The formatter example did not match my expected output.')
  await page.getByRole('button', { name: 'Prepare feedback email' }).click()
  await expect(page.locator('#feedback-status')).toContainText('Nothing has been sent')
  const draft = page.getByRole('link', { name: 'Open the prepared email draft' })
  await expect(draft).toBeVisible()
  await expect(draft).toHaveAttribute('href', /^mailto:shaikmukhuran@gmail\.com\?subject=JStack%20Bug%20report&body=/)
})

test('homepage provides detailed tool cards, a stable ad slot, and technical guides', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Java & Backend Developer Workbench' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'jwt & jwe tools' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'json tools' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'java tools' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'encoding tools' })).toBeVisible()
  await expect(page.locator('.home-tool-card')).toHaveCount(12)
  await expect(page.getByText('Inspect token header, payload and signature.')).toBeVisible()
  await expect(page.locator('.home-ad-slot')).toHaveCSS('height', '100px')
  await expect(page.getByRole('heading', { name: 'Developer Guides & Security' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JWT decoding is not signature verification/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open JStack Base128 converter' })).toBeVisible()
})

test('homepage and static pages avoid repeated footer links and section labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-page-links')).toHaveCount(0)
  await expect(page.getByText('JSTACK / DEVELOPER WORKSPACE', { exact: true })).toHaveCount(0)

  await page.goto('/about')
  await expect(page.locator('.eyebrow')).toHaveCount(0)
  const footer = page.locator('footer')
  await expect(footer.locator('.site-footer-links')).toHaveCount(1)
  const footerHrefs = await footer.locator('.site-footer-links a').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).getAttribute('href')))
  expect(new Set(footerHrefs).size).toBe(footerHrefs.length)
  await expect(footer.getByRole('link', { name: 'Changelog' })).toHaveCount(1)
})

test('global command palette searches tools and informational pages with keyboard', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools' })
  await expect(dialog).toBeVisible()
  const search = dialog.getByRole('combobox', { name: 'Search JStack tools and pages' })
  await search.fill('JSON to Java models')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/app\/json-to-java$/)
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search JStack tools and pages' }).fill('Privacy Policy')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search JStack tools and pages' }).fill('Text encoding article')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/blog\/base64-vs-base128$/)
  await expect(page.getByRole('heading', { name: 'Base64, Base64URL, and JStack Base128' })).toBeVisible()
})

test('main search icon and Ctrl+K support flexible search and scrollable results', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Search tools and pages' }).click()
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools' })
  const search = dialog.getByRole('combobox', { name: 'Search JStack tools and pages' })
  await search.fill('decoder JWT')
  await expect(dialog.getByRole('option', { name: /JWT decoder/ })).toBeVisible()
  await search.press('Enter')
  await expect(page).toHaveURL(/\/app\/jwt-decoder$/)

  await page.keyboard.press('Control+k')
  await expect(dialog).toBeVisible()
  const results = dialog.locator('.command-results')
  const scrollMetrics = await results.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY,
  }))
  expect(scrollMetrics.overflowY).toBe('auto')
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)

  for (let index = 0; index < 20; index += 1) await page.keyboard.press('ArrowDown')
  const activeResult = dialog.locator('#command-result-20')
  const activeResultVisible = await activeResult.evaluate((node) => {
    const result = node.getBoundingClientRect()
    const list = node.parentElement!.getBoundingClientRect()
    return result.top >= list.top - 1 && result.bottom <= list.bottom + 1
  })
  expect(activeResultVisible).toBe(true)
})

test('mobile search finds JWE tools by JWT terms without overlapping or clipping results', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/app/jwt-encoder')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const sidebarSearch = page.getByRole('textbox', { name: 'Filter tools' })
  await sidebarSearch.fill('JWT encrypt')
  await expect(page.locator('.sidebar').getByRole('button', { name: 'JWE encryptor', exact: true })).toBeVisible()
  await sidebarSearch.fill('JWT decrypt')
  await expect(page.locator('.sidebar').getByRole('button', { name: 'JWE decryptor', exact: true })).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Search tools and pages' }).click()
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools' })
  const search = dialog.getByRole('combobox', { name: 'Search JStack tools and pages' })
  await search.fill('JWT encrypt')
  await expect(dialog.getByRole('option', { name: /JWE encryptor/ })).toBeVisible()
  await search.fill('JWT decrypt')
  await expect(dialog.getByRole('option', { name: /JWE decryptor/ })).toBeVisible()
  await search.fill('')

  const results = dialog.locator('.command-results')
  const metrics = await results.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY,
    resultsFit: [...node.querySelectorAll('button')].every((button) => button.scrollWidth <= button.clientWidth),
  }))
  expect(metrics.overflowY).toBe('auto')
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
  expect(metrics.resultsFit).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})

test('static pages share keyboard search and complete footer navigation without breadcrumbs', async ({ page }) => {
  await page.goto('/learning')
  await page.getByRole('button', { name: 'Search JStack tools and pages' }).click()
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools and pages' })
  await dialog.getByRole('combobox', { name: 'Search JStack tools and pages' }).fill('Changelog')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/changelog$/)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'All JStack pages' }).getByRole('link', { name: 'Disclaimer' })).toBeVisible()
  await page.goto('/learning')
  await page.getByRole('button', { name: 'Search JStack tools and pages' }).click()
  await page.getByRole('combobox', { name: 'Search JStack tools and pages' }).fill('JWT verification article')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/blog\/jwt-signature-verification$/)
})

test('public pages omit breadcrumbs and links to themselves', async ({ page }) => {
  for (const { path } of publicRoutes) {
    await page.goto(path)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)
    const selfLinks = await page.locator('a[href]').evaluateAll((anchors) => anchors
      .filter((anchor) => {
        const href = anchor.getAttribute('href') || ''
        if (href.startsWith('#')) return false
        const target = new URL(href, window.location.href)
        const normalize = (path: string) => path.replace(/\.html$/i, '').replace(/\/+$/, '') || '/'
        return target.origin === window.location.origin
          && normalize(target.pathname) === normalize(window.location.pathname)
      })
      .map((anchor) => (anchor as HTMLAnchorElement).outerHTML))
    expect(selfLinks, `${path} has no self-links`).toEqual([])
  }
})

test('static command palette remains available when local storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage is blocked', 'SecurityError') },
    })
  })
  await page.goto('/guide')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools and pages' })
  await dialog.getByRole('combobox', { name: 'Search JStack tools and pages' }).fill('JWT decoder')
  await expect(dialog.getByRole('option', { name: /JWT decoder/ })).toBeVisible()
})

test('mobile navigation opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/)
  await expect(page.getByRole('navigation', { name: 'Site pages' }).getByRole('link', { name: 'About' })).toBeVisible()
  await page.getByRole('button', { name: 'Close navigation' }).first().click()
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/)
})

test('workspace adapts across desktop, tablet and mobile widths', async ({ page }) => {
  await page.goto('/app/json-formatter')

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('heading', { name: 'JSON Tools' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)

    if (width <= 800) {
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Site navigation' })).toBeHidden()
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await expect(page.getByRole('navigation', { name: 'Site pages' })).toBeVisible()
      await page.getByRole('button', { name: 'Close navigation' }).first().click()
    } else {
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    }

    if (width <= 390) {
      const logoRight = await page.locator('.brand-logo .jstack-logo').evaluate((logo) => logo.getBoundingClientRect().right)
      expect(logoRight).toBeLessThan(390)
    }
  }

  for (const path of ['/app/jwt-encoder', '/app/json-to-java', '/app/base128-converter']) {
    await page.goto(path)
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow on ${path} at ${width}px`).toBe(false)
    }
  }
})

test('static content pages fit narrow mobile widths in both themes', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })

    for (const path of ['/', '/about', '/contact', '/feedback', '/guide', '/learning', '/changelog', '/disclaimer', '/privacy', '/terms', '/404.html']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow on ${path} at ${width}px`).toBe(false)
    }
  }

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 248, 250)')
})

test('skip-to-content link is a mobile-friendly focus button on static and tool pages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 320, height: 844 })

  for (const path of ['/about', '/app/json-formatter']) {
    await page.goto(path)
    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toHaveAttribute('href', '#main-content')
    await expect(page.locator('#main-content')).toHaveCount(1)
    await expect(skipLink).toHaveCSS('position', 'fixed')
    await expect(skipLink).toHaveCSS('min-height', '44px')
    await expect(skipLink).toHaveCSS('border-radius', '8px')

    const hiddenBox = await skipLink.boundingBox()
    expect(hiddenBox).not.toBeNull()
    expect(hiddenBox!.y + hiddenBox!.height).toBeLessThanOrEqual(0)

    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeInViewport()
    const focusedBox = await skipLink.boundingBox()
    expect(focusedBox).not.toBeNull()
    expect(focusedBox!.x).toBeGreaterThanOrEqual(0)
    expect(focusedBox!.x + focusedBox!.width).toBeLessThanOrEqual(320)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main-content$/)
  }
})

test('command dialog traps keyboard focus and closes with Escape', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  await page.getByRole('button', { name: 'Search tools and pages' }).click()
  const dialog = page.getByRole('dialog', { name: 'Search JStack tools' })
  await expect(dialog).toBeVisible()
  const search = dialog.getByRole('combobox', { name: 'Search JStack tools and pages' })
  const lastResult = dialog.locator('.command-results button').last()
  await search.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(lastResult).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(search).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('both themes retain readable headings and the blue Example action', async ({ page }) => {
  await page.goto('/app/jwt-encoder')
  const heading = page.locator('.page-heading h1')
  const example = page.getByRole('button', { name: 'Example', exact: true })
  const panel = page.locator('.field-block').first()
  const editor = page.locator('.code-editor').first()
  const shell = page.locator('.app-shell')
  const sidebar = page.locator('.sidebar')
  const themeColor = page.locator('meta[name="theme-color"]')
  const claimButton = page.getByRole('button', { name: /Add expiration claim \(exp\)/ })
  await expect(heading).toHaveCSS('color', 'rgb(241, 245, 243)')
  await expect(shell).toHaveCSS('background-color', 'rgb(11, 16, 21)')
  await expect(themeColor).toHaveAttribute('content', '#0B1015')
  await expect(claimButton).toHaveCSS('background-color', 'rgb(21, 30, 38)')
  await expect(claimButton).toHaveCSS('border-top-color', 'rgb(38, 52, 61)')
  await expect(example).toHaveCSS('background-color', 'rgb(23, 111, 191)')
  await expect(panel).toHaveCSS('border-top-width', '1px')
  await expect(panel).toHaveCSS('border-top-color', 'rgb(38, 52, 61)')
  await expect(editor).toHaveCSS('border-top-color', 'rgb(38, 52, 61)')
  await expect(editor).toHaveCSS('font-family', /JetBrains Mono/)
  const darkContrasts = await page.evaluate(() => {
    const luminance = (value: string) => {
      const channels = value.match(/\d+/g)?.slice(0, 3).map(Number) || [0, 0, 0]
      const linear = channels.map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }
    const ratio = (foreground: string, background: string) => {
      const first = luminance(foreground)
      const second = luminance(background)
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    }
    const sampleStyle = getComputedStyle(document.querySelector('.sample-button')!)
    const runStyle = getComputedStyle(document.querySelector('.run-button')!)
    return {
      sample: ratio(sampleStyle.color, sampleStyle.backgroundColor),
      run: ratio(runStyle.color, runStyle.backgroundColor),
    }
  })
  expect(darkContrasts.sample).toBeGreaterThanOrEqual(4.5)
  expect(darkContrasts.run).toBeGreaterThanOrEqual(4.5)
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(heading).toHaveCSS('color', 'rgb(23, 56, 43)')
  await expect(shell).toHaveCSS('background-color', 'rgb(244, 248, 250)')
  await expect(themeColor).toHaveAttribute('content', '#F4F8FA')
  await expect(claimButton).toHaveCSS('background-color', 'rgb(247, 250, 249)')
  await expect(claimButton).toHaveCSS('border-top-color', 'rgb(185, 220, 203)')
  await expect(example).toHaveCSS('background-color', 'rgb(23, 111, 191)')
  await expect(panel).toHaveCSS('border-top-color', 'rgb(185, 220, 203)')
  await expect(editor).toHaveCSS('border-top-color', 'rgb(220, 231, 226)')
  await expect(sidebar).toHaveCSS('background-color', 'rgb(240, 246, 244)')
  const lightContrasts = await page.evaluate(() => {
    const luminance = (value: string) => {
      const channels = value.match(/\d+/g)?.slice(0, 3).map(Number) || [0, 0, 0]
      const linear = channels.map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }
    const ratio = (foreground: string, background: string) => {
      const first = luminance(foreground)
      const second = luminance(background)
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    }
    const sampleStyle = getComputedStyle(document.querySelector('.sample-button')!)
    const runStyle = getComputedStyle(document.querySelector('.run-button')!)
    const activeTab = getComputedStyle(document.querySelector('.jwt-tabs button.active')!)
    return {
      sample: ratio(sampleStyle.color, sampleStyle.backgroundColor),
      run: ratio(runStyle.color, runStyle.backgroundColor),
      tab: ratio(activeTab.color, activeTab.backgroundColor),
    }
  })
  expect(lightContrasts.sample).toBeGreaterThanOrEqual(4.5)
  expect(lightContrasts.run).toBeGreaterThanOrEqual(4.5)
  expect(lightContrasts.tab).toBeGreaterThanOrEqual(4.5)
})

test('keyboard focus has a solid high-contrast indicator on controls and code editors', async ({ page }) => {
  await page.goto('/app/json-formatter')
  const brand = page.locator('.brand-logo')
  await brand.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(brand).toBeFocused()
  const brandFocus = await brand.evaluate((element) => {
    const style = getComputedStyle(element)
    return { visible: element.matches(':focus-visible'), outline: style.outlineStyle, width: style.outlineWidth }
  })
  expect(brandFocus).toEqual({ visible: true, outline: 'solid', width: '2px' })

  const editor = page.getByLabel('JSON INPUT')
  await editor.focus()
  await expect(editor).toHaveCSS('outline-style', 'solid')
  await expect(editor).toHaveCSS('outline-width', '2px')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await editor.focus()
  await expect(editor).toHaveCSS('outline-color', 'rgb(17, 107, 73)')
})
