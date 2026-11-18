import { readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim()

let siteUrl = ''
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
  siteUrl = parsedUrl.origin
}

if (!configuredSiteUrl && process.env.CF_PAGES === '1') {
  throw new Error('Set the VITE_SITE_URL Cloudflare Pages build variable to your production HTTPS origin.')
}

const files = await readdir(outputDirectory)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
for (const file of htmlFiles) {
  const filePath = join(outputDirectory, file)
  let html = await readFile(filePath, 'utf8')
  html = html.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/gi, '')
  if (siteUrl) {
    const pagePath = file === 'index.html' ? '/' : `/${file}`
    const canonical = `<link rel="canonical" href="${siteUrl}${pagePath}" />`
    html = html.replace('</head>', `  ${canonical}\n  </head>`)
    if (file === 'index.html') {
      html = html.replace('content="/og-card.svg"', `content="${siteUrl}/og-card.svg"`)
    }
  }
  await writeFile(filePath, html)
}

const robotsPath = join(outputDirectory, 'robots.txt')
const sitemapPath = join(outputDirectory, 'sitemap.xml')
if (siteUrl) {
  const pages = ['/', '/guide.html', '/about.html', '/contact.html', '/privacy.html', '/terms.html']
  const urls = pages.map((page) => `  <url><loc>${siteUrl}${page}</loc></url>`).join('\n')
  await writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  await writeFile(robotsPath, `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
  console.log(`Generated canonical URLs, sitemap, and robots.txt for ${siteUrl}`)
} else {
  await rm(sitemapPath, { force: true })
  await writeFile(robotsPath, 'User-agent: *\nAllow: /\n')
  console.warn('VITE_SITE_URL is not set: production canonical URLs and sitemap were omitted. Set it in Cloudflare Pages build variables.')
}