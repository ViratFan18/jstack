const savedTheme = window.localStorage.getItem('jstack-theme-v2')
const initialTheme = savedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = initialTheme
const themeColor = document.querySelector('meta[name="theme-color"]')
if (themeColor) themeColor.content = initialTheme === 'dark' ? '#131816' : '#F7F9F7'

for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  const updateButton = (theme) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    button.setAttribute('aria-label', `Switch to ${nextTheme} theme`)
    button.setAttribute('aria-pressed', String(theme === 'light'))
    button.querySelector('.theme-toggle-label').textContent = `${nextTheme} theme`
  }

  updateButton(initialTheme)
  button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('jstack-theme-v2', theme)
    if (themeColor) themeColor.content = theme === 'dark' ? '#131816' : '#F7F9F7'
    updateButton(theme)
  })
}
