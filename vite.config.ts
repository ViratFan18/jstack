import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'

const publicPageNames = new Set(['about', 'blog', 'contact', 'feedback', 'guide', 'learning', 'changelog', 'disclaimer', 'privacy', 'terms'])
const articlePageNames = new Map([
  ['blog/jwt-signature-verification', 'blog-jwt-signature-verification'],
  ['blog/json-to-java-records', 'blog-json-to-java-records'],
  ['blog/base64-vs-base128', 'blog-base64-vs-base128'],
])
const toolPageNames = new Set([
  'jwt-decoder', 'jwt-encoder', 'jwt-verifier', 'jwe-encryptor', 'jwe-decryptor',
  'jwt-key-generator', 'json-formatter', 'json-minifier', 'json-validator',
  'json-to-java', 'base64-converter', 'base128-converter',
])

const cleanPageRoutes: Plugin = {
  name: 'jstack-clean-page-routes',
  configureServer: addWorkspaceRouteFallback,
  configurePreviewServer: addBuiltWorkspaceRouteFallback,
}

function addWorkspaceRouteFallback(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((request, response, next) => {
    if (!request.url) return next()

    const [pathname, ...queryParts] = request.url.split('?')
    const pageName = pathname.replace(/\/+$/, '').slice(1)
    const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''

    const workspaceRoute = pageName.match(/^app\/([^/]+)$/)
    if (workspaceRoute && toolPageNames.has(workspaceRoute[1])) {
      response.setHeader('X-Robots-Tag', 'noindex, follow')
      request.url = `/workspace.html${query}`
      return next()
    }

    next()
  })
}

function addBuiltWorkspaceRouteFallback(server: PreviewServer) {
  server.middlewares.use((request, response, next) => {
    if (!request.url) return next()

    const pathname = request.url.split('?')[0].replace(/\/+$/, '')
    const workspaceRoute = pathname.match(/^\/app\/([^/]+)$/)
    if (!workspaceRoute || !toolPageNames.has(workspaceRoute[1])) return next()

    const routeHtml = resolve(process.cwd(), 'dist', 'app', `${workspaceRoute[1]}.html`)
    if (!existsSync(routeHtml)) return next()

    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('X-Robots-Tag', 'noindex, follow')
    response.end(readFileSync(routeHtml))
  })
}

const staticCleanPageRoutes: Plugin = {
  name: 'jstack-static-clean-page-routes',
  configureServer: addStaticPageRoutes,
  configurePreviewServer(server) {
    addStaticPageRoutes(server, true)
    server.middlewares.use((request, response, next) => {
      if (!request.url) return next()
      const pathname = request.url.split('?')[0]
      if (pathname === '/' || /\.[^/]+$/.test(pathname)) return next()

      response.statusCode = 404
      response.setHeader('Content-Type', 'text/html; charset=utf-8')
      response.end(readFileSync(resolve(process.cwd(), 'dist', '404.html')))
    })
  },
}

function addStaticPageRoutes(server: ViteDevServer | PreviewServer, useBuiltRoutes = false) {
  server.middlewares.use((request, response, next) => {
    if (!request.url) return next()

    const [pathname, ...queryParts] = request.url.split('?')
    const pageName = pathname.replace(/\/+$/, '').slice(1)
    const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''
    const legacyName = pageName.replace(/\.html$/i, '')
    const hasHtmlExtension = /\.html$/i.test(pageName)
    const articleAlias = [...articlePageNames.entries()].find(([, fileName]) => fileName === legacyName)

    if (hasHtmlExtension && (legacyName === 'index' || publicPageNames.has(legacyName) || toolPageNames.has(legacyName) || articleAlias)) {
      response.statusCode = 301
      const target = articleAlias ? `/${articleAlias[0]}` : legacyName === 'index' ? '/' : `/${legacyName}`
      response.setHeader('Location', `${target}${query}`)
      response.end()
      return
    }

    if (publicPageNames.has(pageName)) {
      request.url = `/${pageName}.html${query}`
      return next()
    }

    const articleFileName = articlePageNames.get(pageName)
    if (articleFileName) {
      if (useBuiltRoutes) {
        const generatedPage = resolve(process.cwd(), 'dist', `${pageName}.html`)
        if (existsSync(generatedPage)) {
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(readFileSync(generatedPage))
          return
        }
      }

      request.url = `/${articleFileName}.html${query}`
      return next()
    }

    if (toolPageNames.has(pageName)) {
      const generatedPage = resolve(process.cwd(), 'dist', `${pageName}.html`)
      if (existsSync(generatedPage)) {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(readFileSync(generatedPage))
        return
      }

      request.url = `/?tool=${pageName}`
    }

    next()
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [cleanPageRoutes, staticCleanPageRoutes, react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        workspace: resolve(process.cwd(), 'workspace.html'),
      },
    },
  },
})
