const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')

const digest = text => createHash('sha256').update(text).digest('hex')

/** Only this exact synthetic upload snapshot and loopback destination may be approved. */
exports.approveOwnedUpload = async function (pages, destination, files) {
  const preview = files.map(file => `${file.path}\n${file.bytes} bytes\nSHA-256 ${file.sha256}`).join('\n\n')
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const result = await dialog.evaluate((element, expected) => {
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
        return { stale: true }
      if (request.toolName !== 'browser_upload_files')
        return { unrelated: true }
      const matches = request.cardId === 'default' && request.serverName === 'local-interface'
        && request.resourcePath === expected.destination && request.actionCategory === 'network'
        && request.riskLevel === 'danger' && request.supportsRememberSession === false
        && request.interfacePreview?.text === expected.preview
        && request.interfacePreview.sha256 === expected.sha256 && request.interfacePreview.byteLength === expected.bytes
        && element.querySelector('[data-interface-input-preview]')?.textContent === expected.preview
      if (!matches)
        return { mismatch: true, operation: request.toolName }
      const buttons = [...element.querySelectorAll('button')].filter(button => button.textContent.trim() === '允许' && !button.disabled && button.getClientRects().length)
      if (buttons.length !== 1 || buttons[0].dataset.permissionRequestId !== request.requestId || buttons[0].dataset.permissionToken !== request.token)
        return { stale: true }
      buttons[0].click()
      return { approved: true }
    }, { destination, preview, bytes: new TextEncoder().encode(preview).length, sha256: digest(preview) })
    if (result.stale || result.unrelated)
      continue
    assert.equal(result.approved, true, 'Upload approval must match the exact visible frozen file preview and destination')
    return true
  }
  return false
}

/** Simulate closing the exact owned upload window after delivery, preserving every other app window. */
exports.closeOwnedUploadWindow = async function (app, url) {
  const result = await app.evaluate(async ({ BrowserWindow, screen }, url) => {
    const targets = BrowserWindow.getAllWindows().filter(window => window.webContents.getURL() === `${url}/submit`)
    if (targets.length !== 1)
      throw new Error('Expected one exact owned upload receipt window')
    const window = targets[0]
    const bounds = window.getBounds()
    if (window.isFocused() || window.isFocusable() || screen.getAllDisplays().some(({ bounds: display }) => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y))
      throw new Error('Owned upload window must remain outside every display without focus')
    const id = window.id
    await new Promise((resolve, reject) => {
      let timeout
      const closed = () => {
        clearTimeout(timeout)
        window.removeListener('closed', closed)
        resolve()
      }
      timeout = setTimeout(() => {
        window.removeListener('closed', closed)
        reject(new Error('The exact owned upload window did not close within its deadline'))
      }, 5000)
      window.once('closed', closed)
      try {
        window.close()
        if (window.isDestroyed())
          closed()
      }
      catch (error) {
        clearTimeout(timeout)
        window.removeListener('closed', closed)
        reject(error)
      }
    })
    return { id, closed: window.isDestroyed(), exactUrl: `${url}/submit` }
  }, url)
  assert.equal(result.closed, true)
  return result
}
