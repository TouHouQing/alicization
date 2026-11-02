import { describe, expect, it } from 'vitest'

import { compileWindowsKeyboardShortcut } from './windows-keyboard-shortcut'

describe('bounded Windows keyboard chord compilation', () => {
  it('emits a balanced Ctrl+S batch with side-specific modifier ownership', () => {
    expect(compileWindowsKeyboardShortcut(' ctrl + s ', 2)).toEqual({
      shortcut: 'Control+S',
      repeat: 2,
      keys: [0xA2, 0x53],
      events: [
        { virtualKey: 0xA2, extended: false, keyUp: false },
        { virtualKey: 0x53, extended: false, keyUp: false },
        { virtualKey: 0x53, extended: false, keyUp: true },
        { virtualKey: 0xA2, extended: false, keyUp: true },
      ],
    })
  })

  it.each(['Tab', 'Escape', 'Shift+Tab', 'Ctrl+Shift+S', 'Ctrl+Alt+F12', 'Alt+F4', 'Meta+ArrowLeft', 'PageDown', 'F24', 'Ctrl+9', 'Add'])('balances %s without expanding repeat into a single unchecked macro', (shortcut) => {
    const plan = compileWindowsKeyboardShortcut(shortcut, 5)
    expect(plan.events.length).toBe(plan.keys.length * 2)
    expect(plan.repeat).toBe(5)
    expect(plan.keys.length).toBeLessThanOrEqual(5)
    const held = new Set<number>()
    for (const event of plan.events) {
      if (event.keyUp) {
        expect(held.has(event.virtualKey)).toBe(true)
        held.delete(event.virtualKey)
      }
      else {
        expect(held.has(event.virtualKey)).toBe(false)
        held.add(event.virtualKey)
      }
    }
    expect(held.size).toBe(0)
  })

  it.each(['Ctrl+S+Delete', 'Ctrl+Ctrl+S', 'Ctrl+Control+S', 'S+Ctrl', 'Ctrl', 'Ctrl++S', '+S', 'Ctrl+', 'Ctrl+S\nDelete', 'Ctrl+S\0', 'Ctrl+中文', 'Ctrl+🙂', 'Cmd+S', 'F25', '0x53', 'Ctrl+Alt+Delete', '__proto__', 'constructor', ' Ctrl S ', '', 'A'.repeat(97)])('rejects ambiguous, unsupported or multi-action input %j', (shortcut) => {
    expect(() => compileWindowsKeyboardShortcut(shortcut)).toThrow()
  })

  it.each([0, -1, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '2', null, {}])('rejects a repeat outside the native action budget: %j', (repeat) => {
    expect(() => compileWindowsKeyboardShortcut('Ctrl+S', repeat)).toThrow('WINDOWS_KEYBOARD_SHORTCUT_BUDGET')
  })

  it('does not share mutable event arrays between commands', () => {
    const first = compileWindowsKeyboardShortcut('Ctrl+S')
    first.events[0].virtualKey = 0x5B
    first.keys.splice(0)
    expect(compileWindowsKeyboardShortcut('Ctrl+S').keys).toEqual([0xA2, 0x53])
    expect(compileWindowsKeyboardShortcut('Ctrl+S').events[0].virtualKey).toBe(0xA2)
  })
})
