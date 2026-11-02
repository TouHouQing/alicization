import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'

describe('windows keyboard catalogue is separate from an action permission', () => {
  it('requires a verified integrated adapter rather than helper presence alone', () => {
    expect(createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardReady: true }).resolveActive('tool.desktop_press_keys')).toBeUndefined()
    expect(createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true }).resolveActive('tool.desktop_press_keys')).toBeUndefined()
    const registry = createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true, windowsKeyboardReady: true })
    expect(registry.resolveActive('tool.desktop_press_keys')?.description).toContain('current action authority')
    expect(registry.validateInput('tool.desktop_press_keys', { shortcut: 'Ctrl+S', repeat: 5 }).valid).toBe(true)
  })

  it.each([
    {},
    { shortcut: 'Tab', repeat: 0 },
    { shortcut: 'Tab', repeat: 6 },
    { shortcut: 'Tab', repeat: 1.5 },
    { shortcut: 'x'.repeat(97) },
    { shortcut: 'Tab', windowId: 'model-provided-window' },
  ])('does not advertise invalid or model-authored foreground authority %j', (input) => {
    const registry = createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true, windowsKeyboardReady: true })
    expect(registry.validateInput('tool.desktop_press_keys', input).valid).toBe(false)
  })
})
