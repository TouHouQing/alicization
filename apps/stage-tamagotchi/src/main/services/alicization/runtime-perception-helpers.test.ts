import { describe, expect, it } from 'vitest'

import {
  resolveForegroundDecisionTarget,
  shouldInjectInteractivePerceptionForUserText,
} from './runtime-perception-helpers'

function expectJsonSafe(value: unknown) {
  const visit = (current: unknown, path = '$'): void => {
    if (current === undefined)
      throw new Error(`undefined at ${path}`)
    if (typeof current !== 'object' || current === null)
      return
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`))
      return
    }
    Object.entries(current).forEach(([key, item]) => visit(item, `${path}.${key}`))
  }

  visit(value)
}

describe('runtime perception helpers', () => {
  it('does not authorize perception injection for an answer-only dialogue request', () => {
    expect(shouldInjectInteractivePerceptionForUserText('如果你不确定某件事，不要猜，直接说不确定。')).toBe(false)
    expect(shouldInjectInteractivePerceptionForUserText('不调用工具，只用对话回答。')).toBe(false)
  })

  it('authorizes perception injection for an explicit screen-view request', () => {
    expect(shouldInjectInteractivePerceptionForUserText('请查看当前屏幕内容，告诉我你看到了什么。')).toBe(true)
  })

  it('omits unavailable foreground fields instead of returning explicit undefined values', () => {
    const target = resolveForegroundDecisionTarget({
      snapshotForeground: {
        appName: 'Terminal',
        processName: undefined,
        title: undefined,
        pid: null,
      },
    })

    expect(target).toEqual({
      appName: 'Terminal',
      pid: null,
    })
    expectJsonSafe(target)
  })

  it('keeps merged foreground targets JSON-safe when both probes lack optional fields', () => {
    const target = resolveForegroundDecisionTarget({
      snapshotForeground: {
        appName: 'Cursor',
        pid: null,
      },
      probedForeground: {
        appName: 'Cursor',
        pid: null,
      },
    })

    expect(target).toEqual({
      appName: 'Cursor',
      pid: null,
    })
    expectJsonSafe({
      foregroundWindow: target,
    })
  })
})
