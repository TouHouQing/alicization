const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash } = require('node:crypto')

const { decideDelegatedOperation } = require('./delegated-work-product-checks.cjs')

const hash = value => createHash('sha256').update(value).digest('hex')

function review(element, expected) {
  const seen = new Set()
  function find(node) {
    if (!node || typeof node !== 'object' || seen.has(node))
      return null
    seen.add(node)
    const instance = node.component || node
    if (instance.props && Object.hasOwn(instance.props, 'request') && Object.hasOwn(instance.props, 'resolving'))
      return instance
    for (const child of [node.component, node.subTree, node.suspense?.activeBranch, node.ssContent, ...(Array.isArray(node.children) ? node.children : [])]) {
      const found = find(child)
      if (found)
        return found
    }
    return null
  }
  const app = document.querySelector('#app').__vue_app__
  const modal = find(app._instance ?? app._container._vnode.component)
  const request = modal?.props.request
  if (!request || modal.props.resolving || request.requestId !== element.dataset.permissionRequestId)
    return null
  if (expected.inspect)
    return { operation: request.toolName }
  const preview = request.interfacePreview
  const valid = request.cardId === 'default' && request.serverName === 'local-interface' && request.actionCategory === 'network'
    && request.resourcePath === expected.destination && request.supportsRememberSession === false
    && (request.toolName === 'browser_type_text'
      ? request.resourceLabel.includes(expected.label) && preview?.text === expected.text
      : request.toolName === 'browser_upload_files'
        ? request.resourceLabel.includes(expected.attachmentPath) && preview?.text === expected.text
        : request.toolName === 'browser_click_element' && expected.formMatches && request.resourceLabel.includes('提交业务表单') && preview?.text.includes(`QA 浏览器留言: ${expected.marker}`))
  if (!valid || typeof preview?.text !== 'string' || preview.sha256 !== expected.previewHash || preview.byteLength !== expected.previewBytes || element.querySelector('[data-interface-input-preview]')?.textContent !== preview.text)
    return { refused: true, operation: request.toolName }
  const button = [...element.querySelectorAll('button')].find(button => button.textContent.trim() === '允许' && !button.disabled && button.getClientRects().length)
  if (!button || button.dataset.permissionRequestId !== request.requestId || button.dataset.permissionToken !== request.token)
    return null
  button.click()
  return { approved: true, operation: request.toolName, requestId: request.requestId, inputSha256: preview.sha256 }
}

exports.approveBusinessOperation = async function (pages, original, expected) {
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const current = await dialog.evaluate(review, { inspect: true })
    if (!current)
      continue
    if (current.operation === 'coding_agent.cli') {
      const decision = await decideDelegatedOperation(pages, expected.cliInput, true)
      return decision ? { ...decision, operation: 'coding_agent.cli' } : null
    }
    // The preview itself is read first; exact permitted values and live form
    // fields are independently compared before its current token is consumed.
    const preview = await dialog.locator('[data-interface-input-preview]').textContent()
    const frame = original.frames().find(frame => new URL(frame.url()).pathname === `/details/${expected.round}`)
    assert.ok(frame)
    const fields = await frame.evaluate(() => ({ category: document.querySelector('select').value, files: [...document.querySelector('input[type=file]').files].map(file => ({ name: file.name, size: file.size })) }))
    const marker = await original.getByLabel('QA 浏览器留言', { exact: true }).inputValue()
    const typingSelection = current.operation === 'browser_type_text' && preview === '绘画'
    const text = current.operation === 'browser_upload_files'
      ? `${expected.attachmentPath}\n${expected.attachmentBytes} bytes\nSHA-256 ${expected.attachmentSha256}`
      : typingSelection ? '绘画' : expected.marker
    const decided = await dialog.evaluate(review, { ...expected, label: typingSelection ? 'QA 交付分类' : 'QA 浏览器留言', text, formMatches: marker === expected.marker && fields.category === 'illustration' && fields.files.length === 1 && fields.files[0].name === expected.attachmentName && fields.files[0].size === expected.attachmentBytes, previewHash: hash(preview), previewBytes: Buffer.byteLength(preview) })
    assert.ok(!decided?.refused, `Owned business operation preview mismatch: ${current.operation}`)
    if (decided)
      return decided
  }
  return null
}
