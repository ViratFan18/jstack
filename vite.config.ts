import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const publicPageNames = new Set(['about', 'contact', 'guide', 'privacy', 'terms'])
const toolPageNames = new Set([
  'jwt-decoder', 'jwt-encoder', 'jwt-verifier', 'jwe-encryptor', 'jwe-decryptor',
  'jwt-key-generator', 'json-formatter', 'json-minifier', 'json-validator',
  'json-to-java', 'base64-converter', 'base128-converter',
])

const cleanPageRoutes: Plugin = {
  name: 'jstack-clean-page-routes',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (!request.url) return next()

      const [pathname, ...queryParts] = request.url.split('?')
      const pageName = pathname.replace(/\/+$/, '').slice(1)
      const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''

      if (publicPageNames.has(pageName)) {
        request.url = `/${pageName}.html${query}`
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
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [cleanPageRoutes, react()],
})
