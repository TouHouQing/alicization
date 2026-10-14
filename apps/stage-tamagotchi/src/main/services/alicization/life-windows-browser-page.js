/** These functions run in a sandboxed web page; they contain no host capability. */
function fieldState(element) {
  const field = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
  const password = element instanceof HTMLInputElement && element.type === 'password'
  const value = field && !password ? element.value : null
  const form = 'form' in element && element.form instanceof HTMLFormElement ? element.form : null
  // The rendered label is separate from an accessibility alias.
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  const visibleText = element instanceof HTMLElement ? element.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
  return { value: value?.slice(0, 2048) ?? null, valueLength: value?.length ?? 0, password, readOnly: field && 'readOnly' in element && element.readOnly, visibleText, formAction: form?.action ?? null, formMethod: form?.method ?? null, submitControl: Boolean(form && ((element instanceof HTMLButtonElement && element.type === 'submit') || (element instanceof HTMLInputElement && ['submit', 'image'].includes(element.type)))), checked: element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type) ? element.checked : null }
}
export function observePage(maxChars, html) {
  const visible = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }
  const selectorFor = (element) => {
    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1)
      return `#${CSS.escape(element.id)}`
    const parts = []
    let current = element
    while (current && current !== document.documentElement) {
      const parent = current.parentElement
      const position = parent ? Array.from(parent.children).indexOf(current) + 1 : 1
      parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${position})`)
      current = parent
    }
    return `html > ${parts.join(' > ')}`
  }
  const elements = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable="true"]')).filter(visible).slice(0, 120).map(element => ({ selector: selectorFor(element), text: (element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200), tag: element.tagName.toLowerCase(), type: element.getAttribute('type') || '', href: element instanceof HTMLAnchorElement ? element.href : null, disabled: element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true', ...fieldState(element) }))
  // Rendered text excludes hidden fields and executable script contents.

  const safeHtml = html ? document.documentElement.cloneNode(true) : null
  for (const field of safeHtml?.querySelectorAll('input[type="password"],input[type="hidden"]') ?? [])
    field.removeAttribute('value')
  for (const script of safeHtml?.querySelectorAll('script') ?? [])
    script.remove()
  // Hidden instructions and script bodies are not a visible result.
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  return { url: location.href, title: document.title, readyState: document.readyState, text: (document.body?.innerText || '').slice(0, maxChars), ...(html ? { html: safeHtml.outerHTML.slice(0, maxChars) } : {}), elements }
}
export function mutatePage(input) {
  const matches = document.querySelectorAll(input.selector)
  if (matches.length !== 1)
    return { ok: false, errorCode: 'LOCAL_BROWSER_AMBIGUOUS_TARGET' }
  const element = matches[0]
  const text = (element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
  const href = element instanceof HTMLAnchorElement ? element.href : null
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  if (element.tagName.toLowerCase() !== input.expected.tag || (element.getAttribute('type') || '') !== input.expected.type || text !== input.expected.text || href !== input.expected.href || !element.isConnected || rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true')
    return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
  const field = fieldState(element)
  if (['value', 'valueLength', 'password', 'readOnly', 'checked', 'visibleText', 'formAction', 'formMethod', 'submitControl'].some(key => field[key] !== input.expected[key]))
    return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
  if (!(element instanceof HTMLElement) || element.closest('[inert]'))
    return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
  const viewport = element.getBoundingClientRect()
  const x = (Math.max(0, viewport.left) + Math.min(innerWidth, viewport.right)) / 2
  const y = (Math.max(0, viewport.top) + Math.min(innerHeight, viewport.bottom)) / 2
  const hit = document.elementFromPoint(x, y)
  if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || !hit || (hit !== element && !element.contains(hit)))
    return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
  if (input.operation === 'click') {
    if (!(element instanceof HTMLElement))
      return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_TARGET' }
    element.click()
  }
  else {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value')?.set
      if (!setter || element.readOnly || ['file', 'hidden'].includes(input.expected.type) || field.valueLength > 2048 || (field.password && !input.clear))
        return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_INPUT' }
      setter.call(element, `${input.clear ? '' : element.value}${input.text ?? ''}`)
    }
    else if (element instanceof HTMLElement && element.isContentEditable) {
      element.textContent = `${input.clear ? '' : element.textContent ?? ''}${input.text ?? ''}`
    }
    else {
      return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_INPUT' }
    }
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    if (input.submit && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement))
      element.form?.requestSubmit()
  }
  return { ok: true, url: location.href, title: document.title, target: input.selector }
}
export function scrollPage(action, pixels) {
  if (action === 'top')
    scrollTo(0, 0)
  else if (action === 'bottom')
    scrollTo(0, document.body.scrollHeight)
  else
    scrollBy(0, action === 'up' ? -pixels : pixels)
}
