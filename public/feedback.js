const form = document.querySelector('#feedback-form')
const status = document.querySelector('#feedback-status')
const draftLink = document.querySelector('#feedback-draft-link')

form?.addEventListener('submit', (event) => {
  event.preventDefault()
  status.textContent = ''
  for (const control of form.querySelectorAll('input, select, textarea')) {
    control.removeAttribute('aria-invalid')
  }
  if (!form.reportValidity()) {
    for (const control of form.querySelectorAll(':invalid')) control.setAttribute('aria-invalid', 'true')
    status.textContent = 'Please complete the required fields and correct any highlighted values.'
    return
  }

  const data = new FormData(form)
  const type = String(data.get('type') || 'Feedback')
  const email = String(data.get('email') || '').trim()
  const message = String(data.get('message') || '').trim()
  if (message.length < 20) {
    document.querySelector('#feedback-message')?.setAttribute('aria-invalid', 'true')
    status.textContent = 'Please add at least 20 characters so the report is useful.'
    document.querySelector('#feedback-message')?.focus()
    return
  }

  const subject = encodeURIComponent(`JStack ${type}`)
  const body = encodeURIComponent(`Feedback type: ${type}\nReply email: ${email || 'Not provided'}\n\n${message}`)
  draftLink.href = `mailto:shaikmukhuran@gmail.com?subject=${subject}&body=${body}`
  draftLink.hidden = false
  status.textContent = 'Draft prepared on this device. Nothing has been sent. Open the draft link, review the message, and send it from your email application.'
})
