let savedTheme = null
try {
  savedTheme = window.localStorage.getItem('jstack-theme-v2')
} catch {
  savedTheme = null
}
const initialTheme = savedTheme === 'light' ? 'light' : 'dark'
const themeColor = document.querySelector('meta[name="theme-color"]')
const setTheme = (theme) => {
  const safeTheme = theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = safeTheme
  for (const logo of document.querySelectorAll('header .brand img')) {
    logo.src = safeTheme === 'dark' ? '/jstack-logo-dark.svg' : '/jstack-logo.svg'
  }
  if (themeColor) themeColor.content = safeTheme === 'dark' ? '#0B1015' : '#F4F8FA'
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    const nextTheme = safeTheme === 'dark' ? 'light' : 'dark'
    button.setAttribute('aria-label', `Switch to ${nextTheme} theme`)
    button.setAttribute('aria-pressed', String(safeTheme === 'light'))
    const label = button.querySelector('.theme-toggle-label')
    if (label) label.textContent = `${nextTheme} theme`
  }
}
const headerNavigation = document.querySelector('header nav')
if (headerNavigation && !headerNavigation.querySelector('[data-theme-toggle]')) {
  const button = document.createElement('button')
  button.className = 'theme-toggle'
  button.type = 'button'
  button.setAttribute('data-theme-toggle', '')
  button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true">◐</span><span class="theme-toggle-label">Light theme</span>'
  headerNavigation.append(button)
}

setTheme(initialTheme)

for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    setTheme(theme)
    try {
      window.localStorage.setItem('jstack-theme-v2', theme)
    } catch {
      // Theme changes still apply to this page when storage is unavailable.
    }
  })
}

window.addEventListener('storage', (event) => {
  if (event.key === null) setTheme('dark')
  else if (event.key === 'jstack-theme-v2') setTheme(event.newValue)
})

const pageLinks = [
  ['Home', '/'],
  ['Learning Center', '/learning'],
  ['Developer articles', '/blog'],
  ['JWT verification article', '/blog/jwt-signature-verification'],
  ['JSON to Java article', '/blog/json-to-java-records'],
  ['Text encoding article', '/blog/base64-vs-base128'],
  ['Developer guide', '/guide'],
  ['Changelog', '/changelog'],
  ['About', '/about'],
  ['Contact', '/contact'],
  ['Feedback', '/feedback'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Disclaimer', '/disclaimer'],
]
const toolLinks = [
  ['JWT decoder', 'jwt-decoder', 'Inspect a JWT header and claims'],
  ['JWT encoder and signer', 'jwt-encoder', 'Create a signed JWS'],
  ['JWT signature verifier', 'jwt-verifier', 'Verify a signature and selected claims'],
  ['JWE encryptor', 'jwe-encryptor', 'Encrypt content as compact JWE'],
  ['JWE decryptor', 'jwe-decryptor', 'Decrypt a compact JWE'],
  ['JWT key generator', 'jwt-key-generator', 'Generate supported key material'],
  ['JSON formatter', 'json-formatter', 'Format JSON locally'],
  ['JSON minifier', 'json-minifier', 'Minify JSON locally'],
  ['JSON syntax validator', 'json-validator', 'Check JSON syntax'],
  ['JSON to Java models', 'json-to-java', 'Generate records or POJOs'],
  ['Base64 text converter', 'base64-converter', 'Encode or decode UTF-8 text'],
  ['JStack Base128 converter', 'base128-converter', 'Use the custom Braille mapping'],
]
const toolSlugs = new Set(toolLinks.map(([, slug]) => slug))
const readStoredTools = (key) => {
  try {
    const serialized = window.localStorage.getItem(key)
    if (!serialized || serialized.length > 4096) return []
    const saved = JSON.parse(serialized)
    return Array.isArray(saved)
      ? [...new Set(saved.filter((item) => typeof item === 'string' && toolSlugs.has(item)))].slice(0, 6)
      : []
  } catch {
    return []
  }
}

const main = document.querySelector('main')
if (main && !main.id) main.id = 'main-content'
if (!document.querySelector('.site-skip-link')) {
  const skipLink = document.createElement('a')
  skipLink.className = 'site-skip-link'
  skipLink.href = '#main-content'
  skipLink.textContent = 'Skip to content'
  document.body.prepend(skipLink)
}

const heading = main?.querySelector('h1')
if (heading && location.pathname !== '/' && !main.querySelector('.site-breadcrumbs')) {
  const breadcrumbs = document.createElement('nav')
  breadcrumbs.className = 'site-breadcrumbs'
  breadcrumbs.setAttribute('aria-label', 'Breadcrumb')
  const home = document.createElement('a')
  home.href = '/'
  home.textContent = 'Home'
  const separator = document.createElement('span')
  separator.setAttribute('aria-hidden', 'true')
  separator.textContent = '/'
  const current = document.createElement('span')
  current.setAttribute('aria-current', 'page')
  current.textContent = heading.textContent.trim()
  breadcrumbs.append(home, separator, current)
  main.insertBefore(breadcrumbs, heading)
}

const footer = document.querySelector('footer')
if (footer && !footer.querySelector('.site-footer-links')) {
  for (const child of [...footer.children]) {
    if (child.querySelector('a')) child.remove()
  }
  const links = document.createElement('nav')
  links.className = 'site-footer-links'
  links.setAttribute('aria-label', 'All JStack pages')
  for (const [label, href] of pageLinks) {
    const link = document.createElement('a')
    link.href = href
    link.textContent = label
    links.append(link)
  }
  footer.append(links)
}

const nav = document.querySelector('header nav')
if (nav) {
  if (!nav.querySelector('a[href="/blog"]')) {
    const blogLink = document.createElement('a')
    blogLink.href = '/blog'
    blogLink.textContent = 'Blog'
    nav.append(blogLink)
  }

  const trigger = document.createElement('button')
  trigger.className = 'site-command-trigger'
  trigger.type = 'button'
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('aria-label', 'Search JStack tools and pages')
  trigger.innerHTML = 'Search <kbd>Ctrl K</kbd>'
  nav.append(trigger)

  const layer = document.createElement('div')
  layer.className = 'site-command-layer'
  layer.hidden = true
  layer.innerHTML = '<section class="site-command-dialog" role="dialog" aria-modal="true" aria-label="Search JStack tools and pages"><div class="site-command-search"><label class="sr-only" for="site-command-input">Search JStack tools and pages</label><input id="site-command-input" type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="site-command-results" autocomplete="off" placeholder="Search every tool and page"><button type="button" aria-label="Close search">×</button></div><div class="site-command-results" id="site-command-results" role="listbox" aria-label="Search results" aria-live="polite"></div><p class="site-command-help"><kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></section>'
  document.body.append(layer)

  const input = layer.querySelector('#site-command-input')
  const results = layer.querySelector('.site-command-results')
  const closeButton = layer.querySelector('button[aria-label="Close search"]')
  let selectedIndex = 0
  let currentItems = []
  let returnFocus = null

  const renderResults = () => {
    const favorites = readStoredTools('jstack-favorites')
    const recent = readStoredTools('jstack-recent')
    const prioritized = [
      ...favorites.map((slug) => ({ slug, group: 'Favorite' })),
      ...recent.map((slug) => ({ slug, group: 'Recent' })),
    ]
    const seen = new Set()
    const entries = [
      ...prioritized.map(({ slug, group }) => {
        const [title, , description] = toolLinks.find((item) => item[1] === slug)
        return { title, description, href: `/app/${slug}`, group, id: `tool-${slug}` }
      }),
      ...toolLinks.map(([title, slug, description]) => ({ title, description, href: `/app/${slug}`, group: 'Tools', id: `tool-${slug}` })),
      ...pageLinks.map(([title, href]) => ({ title, description: `Open ${title}`, href, group: 'Pages', id: `page-${href}` })),
    ].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    const query = input.value.trim().toLowerCase()
    currentItems = entries.filter((item) => `${item.title} ${item.description} ${item.group}`.toLowerCase().includes(query))
    selectedIndex = Math.min(selectedIndex, Math.max(currentItems.length - 1, 0))
    results.replaceChildren()

    if (!currentItems.length) {
      input.removeAttribute('aria-activedescendant')
      const empty = document.createElement('p')
      empty.className = 'site-command-empty'
      empty.textContent = 'No matching tools or pages. Try a different search.'
      results.append(empty)
      return
    }

    currentItems.forEach((item, index) => {
      const link = document.createElement('a')
      link.id = `site-command-result-${index}`
      link.href = item.href
      link.className = 'site-command-result'
      link.setAttribute('role', 'option')
      link.setAttribute('aria-selected', String(index === selectedIndex))
      link.addEventListener('mouseenter', () => {
        selectedIndex = index
        updateSelection()
      })
      const copy = document.createElement('span')
      const title = document.createElement('b')
      title.textContent = item.title
      const description = document.createElement('small')
      description.textContent = item.description
      copy.append(title, description)
      const group = document.createElement('span')
      group.className = 'site-command-group'
      group.textContent = item.group
      link.append(copy, group)
      results.append(link)
    })
  }

  const updateSelection = () => {
    for (const [index, item] of [...results.querySelectorAll('.site-command-result')].entries()) {
      item.setAttribute('aria-selected', String(index === selectedIndex))
    }
    if (currentItems[selectedIndex]) input.setAttribute('aria-activedescendant', `site-command-result-${selectedIndex}`)
    else input.removeAttribute('aria-activedescendant')
  }

  const closePalette = () => {
    layer.hidden = true
    returnFocus?.focus()
  }

  const openPalette = () => {
    returnFocus = document.activeElement
    input.value = ''
    selectedIndex = 0
    renderResults()
    layer.hidden = false
    input.focus()
  }

  trigger.addEventListener('click', openPalette)
  closeButton.addEventListener('click', closePalette)
  layer.addEventListener('mousedown', (event) => {
    if (event.target === layer) closePalette()
  })
  input.addEventListener('input', () => {
    selectedIndex = 0
    renderResults()
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (currentItems.length) {
        selectedIndex = (selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + currentItems.length) % currentItems.length
        updateSelection()
      }
    } else if (event.key === 'Enter' && currentItems[selectedIndex]) {
      event.preventDefault()
      location.href = currentItems[selectedIndex].href
    }
  })
  layer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePalette()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [input, closeButton, ...layer.querySelectorAll('.site-command-result')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (layer.hidden) openPalette()
      else closePalette()
    }
    if (event.key === 'Escape' && !layer.hidden) closePalette()
  })
}
