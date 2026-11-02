import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { withActionDispatch } from './action-dispatch-context'
import { createBrowserCdp } from './browser-cdp'

function fixture(revokeAt: 'hover-readback' | 'focus-readback' | 'key-down' | 'never', afterCommand?: (method: string, parameters: Record<string, unknown>) => void) {
  let valid = true
  let preparations = 0
  const sendCommand = vi.fn(async (method: string, parameters: Record<string, unknown>) => {
    afterCommand?.(method, parameters)
    if (method === 'Runtime.evaluate') {
      const expression = String(parameters.expression)
      if (parameters.returnByValue === false)
        return { result: { objectId: expression.endsWith('return document })()') ? 'document' : 'control' } }
      if (expression.includes('preparePageMutation')) {
        preparations++
        if (preparations === 2 && revokeAt === 'hover-readback')
          valid = false
        return { result: { value: { ok: true, x: 10, y: 10, kind: 'input' } } }
      }
      if (revokeAt === 'focus-readback')
        valid = false
      return { result: { value: true } }
    }
    if (method === 'DOM.describeNode')
      return { node: { backendNodeId: parameters.objectId === 'document' ? 1 : 2 } }
    if (method === 'DOM.getContentQuads')
      return { quads: [[0, 0, 20, 0, 20, 20, 0, 20]] }
    if (method === 'DOM.getNodeForLocation')
      return { backendNodeId: 2, frameId: 'root' }
    if (method === 'Input.dispatchKeyEvent' && parameters.type === 'keyDown' && revokeAt === 'key-down')
      valid = false
    return {}
  })
  const debuggerPort = Object.assign(new EventEmitter(), { sendCommand, attach: vi.fn(), detach: vi.fn(), isAttached: () => false })
  const cdp = createBrowserCdp(debuggerPort as unknown as Parameters<typeof createBrowserCdp>[0], '')
  return { sendCommand, mutate: (operation: 'click' | 'type') => cdp.mutate({ frameId: 'root', contextId: 1, documentId: 1, backendNodeId: 2, selector: '#owned' }, { operation, text: 'must not type', clear: true }, () => {
    if (!valid)
      throw new Error('source-revoked')
  }) }
}

describe('browser input at the last asynchronous observation boundary', () => {
  it('does not emit a release for a key that failed authority checking before dispatch', async () => {
    let current = true
    const port = fixture('never', (method) => {
      if (method === 'DOM.focus')
        current = false
    })
    await expect(withActionDispatch(async () => {
      if (!current)
        throw new Error('action-authority-revoked')
      return { expiresAt: null }
    }, () => port.mutate('type'))).rejects.toThrow('action-authority-revoked')
    expect(port.sendCommand.mock.calls.filter(([method]) => method === 'Input.dispatchKeyEvent')).toEqual([])
  })
  it('releases its key after the main action is revoked even while the page grant remains valid', async () => {
    let current = true
    const port = fixture('never', (method, input) => {
      if (method === 'Input.dispatchKeyEvent' && input.type === 'keyDown')
        current = false
    })
    await expect(withActionDispatch(async () => {
      if (!current)
        throw new Error('action-authority-revoked')
      return { expiresAt: null }
    }, () => port.mutate('type'))).rejects.toThrow('action-authority-revoked')
    expect(port.sendCommand.mock.calls.filter(([method]) => method === 'Input.dispatchKeyEvent').map(([, input]) => input.type)).toEqual(['keyDown', 'keyUp'])
    expect(port.sendCommand.mock.calls.some(([method]) => method === 'Input.insertText')).toBe(false)
  })
  it('does not press after revocation while the hover response is in flight', async () => {
    const port = fixture('hover-readback')
    await expect(port.mutate('click')).rejects.toThrow('source-revoked')
    expect(port.sendCommand.mock.calls.filter(([method, input]) => method === 'Input.dispatchMouseEvent' && input.type === 'mousePressed')).toEqual([])
  })
  it('does not press a key after revocation during focus readback', async () => {
    const port = fixture('focus-readback')
    await expect(port.mutate('type')).rejects.toThrow('source-revoked')
    expect(port.sendCommand.mock.calls.filter(([method]) => method === 'Input.dispatchKeyEvent')).toEqual([])
  })
  it('releases its own pressed key after revocation and prevents subsequent text insertion', async () => {
    const port = fixture('key-down')
    await expect(port.mutate('type')).rejects.toThrow('source-revoked')
    expect(port.sendCommand.mock.calls.filter(([method]) => method === 'Input.dispatchKeyEvent').map(([, input]) => input.type)).toEqual(['keyDown', 'keyUp'])
    expect(port.sendCommand.mock.calls.some(([method]) => method === 'Input.insertText')).toBe(false)
  })
})
