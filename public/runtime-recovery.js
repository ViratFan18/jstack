(() => {
  const showRecovery = () => {
    if (document.getElementById('jstack-asset-recovery')) return

    const notice = document.createElement('section')
    notice.id = 'jstack-asset-recovery'
    notice.setAttribute('role', 'alert')
    notice.style.cssText = 'position:fixed;z-index:10000;inset:12px 12px auto;padding:16px;border:2px solid #AD3F48;border-radius:8px;background:#fff;color:#17382B;font:16px/1.5 system-ui,sans-serif;box-shadow:0 4px 20px #0004'

    const heading = document.createElement('h1')
    heading.textContent = 'JStack encountered an application or resource error.'
    heading.style.cssText = 'margin:0 0 8px;font-size:18px'
    const message = document.createElement('p')
    message.textContent = 'Check your connection and retry the action. If this page was open during a deployment, copy any input you need before reloading.'
    message.style.margin = '0 0 12px'
    const reload = document.createElement('button')
    reload.type = 'button'
    reload.textContent = 'Reload page'
    reload.style.cssText = 'min-height:40px;padding:8px 14px;border:2px solid #147A54;border-radius:6px;background:#147A54;color:#fff;font:inherit;font-weight:600;cursor:pointer'
    reload.addEventListener('click', () => window.location.reload())

    notice.append(heading, message, reload)
    document.body.prepend(notice)
  }

  window.addEventListener('vite:preloadError', showRecovery)

  window.addEventListener('error', (event) => {
    const target = event.target
    if (target === window || target instanceof HTMLScriptElement || target instanceof HTMLLinkElement && target.rel === 'stylesheet') {
      showRecovery()
    }
  }, true)

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason instanceof Error ? event.reason.message : ''
    if (/dynamically imported module|importing a module script failed|loading chunk/i.test(message)) showRecovery()
  })
})()
