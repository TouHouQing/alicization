/** These functions run in a sandboxed web page; they contain no host capability. */
function observedRoots() {
  const roots = [document]
  let visited = 0
  for (let index = 0; index < roots.length && index < 64; index++) {
    const walker = document.createTreeWalker(roots[index], NodeFilter.SHOW_ELEMENT)
    let element
    while ((element = walker.nextNode()) && visited++ < 4096) {
      if (element.shadowRoot && roots.length < 64)
        roots.push(element.shadowRoot)
    }
  }
  return roots
}
function observedMatches(selector) {
  const parts = selector.split(' >>> ')
  if (parts.length > 16)
    return []
  let root = document
  for (let index = 0; index < parts.length; index++) {
    const matches = root.querySelectorAll(parts[index])
    if (index === parts.length - 1)
      return matches
    if (matches.length !== 1 || !matches[0].shadowRoot)
      return []
    root = matches[0].shadowRoot
  }
  return []
}
function observedName(element) {
  const root = element.getRootNode()
  const references = (element.getAttribute('aria-labelledby') || '').trim().split(/\s+/u).slice(0, 8)
  const referenced = references.map(id => root.getElementById?.(id)?.textContent || '').join(' ').trim()
  const labels = Array.from(element.labels || []).slice(0, 4).map(label => label.textContent || '').join(' ').trim()
  return (element.getAttribute('aria-label') || referenced || labels || element.getAttribute('placeholder') || element.textContent || '').replace(/\s+/gu, ' ').trim().slice(0, 200)
}
function fieldState(element) {
  const field = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
  const password = element instanceof HTMLInputElement && element.type === 'password'
  const value = field && !password ? element.value : null
  const form = 'form' in element && element.form instanceof HTMLFormElement ? element.form : null
  const fields = form ? Array.from(form.elements).slice(0, 64) : []
  // Private comparison material is stripped by the main-process adapter before
  // observation reaches dialogue, persistence, or an approval description.
  const rawFormState = form ? JSON.stringify(fields.map(field => ({ name: field.name, type: field.type, value: field.type === 'password' ? null : String(field.value ?? '').slice(0, 4096), checked: field.checked ?? null, disabled: field.disabled }))) : null
  const formStateComplete = !form || (form.elements.length <= 64 && fields.every(field => String(field.value ?? '').length <= 4096) && rawFormState.length <= 32768)
  const formState = formStateComplete ? rawFormState : null
  const preview = fields.filter(field => (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) && field.type !== 'hidden' && field.type !== 'password' && field.type !== 'file' && !field.disabled && field.getClientRects().length && getComputedStyle(field).visibility !== 'hidden').map((field) => {
    const value = ['checkbox', 'radio'].includes(field.type) ? `${field.checked}: ${field.value}` : String(field.value ?? '')
    return `${observedName(field) || field.name || field.type}: ${value}`
  }).join('\n')
  const formPreview = form && formStateComplete && preview.length <= 16000 ? preview : null
  const sensitiveForm = fields.some(field => field.type === 'password' || (field instanceof HTMLInputElement && field.type === 'file' && field.files?.length))
  const options = element instanceof HTMLSelectElement ? Array.from(element.options).slice(0, 128).map(option => ({ value: option.value, label: option.label, disabled: option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled), selected: option.selected })) : null
  // The rendered label is separate from an accessibility alias.
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  const visibleText = element instanceof HTMLElement ? element.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
  return { formState, formPreview, formStateComplete, sensitiveForm, options, multiple: 'multiple' in element && element.multiple, value: value?.slice(0, 2048) ?? null, valueLength: value?.length ?? 0, password, readOnly: field && 'readOnly' in element && element.readOnly, visibleText, formAction: form?.action ?? null, formMethod: form?.method ?? null, submitControl: Boolean(form && ((element instanceof HTMLButtonElement && element.type === 'submit') || (element instanceof HTMLInputElement && ['submit', 'image'].includes(element.type)))), checked: element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type) ? element.checked : null }
}
export function observePage(maxChars, html) {
  const visible = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }
  const selectorFor = (element) => {
    const root = element.getRootNode()
    const prefix = root instanceof ShadowRoot ? `${selectorFor(root.host)} >>> ` : ''
    if (element.id && root.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1)
      return `${prefix}#${CSS.escape(element.id)}`
    const parts = []
    let current = element
    while (current && current !== document.documentElement) {
      const parent = current.parentNode
      const position = parent ? Array.from(parent.children).indexOf(current) + 1 : 1
      parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${position})`)
      current = current.parentElement
    }
    return `${prefix}${root instanceof ShadowRoot ? '' : 'html > '}${parts.join(' > ')}`
  }
  const elements = observedRoots().flatMap(root => Array.from(root.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable="true"]')).filter(visible)).slice(0, 120).map(element => ({ selector: selectorFor(element), text: observedName(element), tag: element.tagName.toLowerCase(), type: element.getAttribute('type') || '', href: element instanceof HTMLAnchorElement ? element.href : null, disabled: element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true', ...fieldState(element) }))
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
export function preparePageMutation(input) {
  const matches = observedMatches(input.selector)
  if (matches.length !== 1)
    return { ok: false, errorCode: 'LOCAL_BROWSER_AMBIGUOUS_TARGET' }
  const element = matches[0]
  const text = observedName(element)
  const href = element instanceof HTMLAnchorElement ? element.href : null
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  if (element.tagName.toLowerCase() !== input.expected.tag || (element.getAttribute('type') || '') !== input.expected.type || text !== input.expected.text || href !== input.expected.href || !element.isConnected || rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true')
    return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
  const field = fieldState(element)
  if (JSON.stringify(field.options) !== JSON.stringify(input.expected.options))
    return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
  if (['formState', 'formPreview', 'formStateComplete', 'sensitiveForm', 'multiple', 'value', 'valueLength', 'password', 'readOnly', 'checked', 'visibleText', 'formAction', 'formMethod', 'submitControl'].some(key => field[key] !== input.expected[key]))
    return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
  if ((field.submitControl || input.submit) && !field.formStateComplete)
    return { ok: false, errorCode: 'LOCAL_BROWSER_FORM_VERIFICATION_BUDGET' }
  if (!(element instanceof HTMLElement) || element.closest('[inert]'))
    return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
  let containingRoot = element.getRootNode()
  while (containingRoot instanceof ShadowRoot) {
    if (containingRoot.host.closest('[inert]'))
      return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
    containingRoot = containingRoot.host.getRootNode()
  }
  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
  const viewport = element.getBoundingClientRect()
  const x = (Math.max(0, viewport.left) + Math.min(innerWidth, viewport.right)) / 2
  const y = (Math.max(0, viewport.top) + Math.min(innerHeight, viewport.bottom)) / 2
  let hit = document.elementFromPoint(x, y)
  for (let depth = 0; hit?.shadowRoot && depth < 16; depth++) {
    const nested = hit.shadowRoot.elementFromPoint(x, y)
    if (!nested || nested === hit)
      break
    hit = nested
  }
  if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || !hit || (hit !== element && !element.contains(hit)))
    return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
  if (input.operation === 'type') {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element instanceof HTMLInputElement && /[\r\n]/u.test(input.text ?? ''))
        return { ok: false, errorCode: 'LOCAL_BROWSER_MULTILINE_TARGET_REQUIRED' }
      if (element.readOnly || !['', 'text', 'search', 'email', 'url', 'tel', 'password'].includes(input.expected.type) || field.valueLength > 2048 || (field.password && !input.clear) || (input.submit && element instanceof HTMLTextAreaElement))
        return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_INPUT' }
    }
    else if (element instanceof HTMLSelectElement) {
      if (element.multiple || element.options.length > 128)
        return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_INPUT' }
      const choices = Array.from(element.options)
      const byValue = choices.filter(option => option.value === input.text)
      const selected = byValue.length ? byValue : choices.filter(option => option.label === input.text)
      if (selected.length !== 1 || selected[0].disabled || (selected[0].parentElement instanceof HTMLOptGroupElement && selected[0].parentElement.disabled))
        return { ok: false, errorCode: 'LOCAL_BROWSER_AMBIGUOUS_OPTION' }
      const enabled = choices.filter(option => !option.disabled && (!(option.parentElement instanceof HTMLOptGroupElement) || !option.parentElement.disabled))
      return { ok: true, x, y, kind: 'select', optionSteps: enabled.indexOf(selected[0]) }
    }
    else if (element instanceof HTMLElement && element.isContentEditable) {
      if (input.submit)
        return { ok: false, errorCode: 'LOCAL_BROWSER_EXPLICIT_SUBMIT_REQUIRED' }
    }
    else {
      return { ok: false, errorCode: 'LOCAL_BROWSER_UNSUPPORTED_INPUT' }
    }
  }
  return { ok: true, x, y, kind: 'text' }
}
export function scrollPage(action, pixels) {
  if (action === 'top')
    scrollTo(0, 0)
  else if (action === 'bottom')
    scrollTo(0, document.body.scrollHeight)
  else
    scrollBy(0, action === 'up' ? -pixels : pixels)
}
