export interface WindowsKeyboardEvent {
  virtualKey: number
  keyUp: boolean
  extended: boolean
}

const modifiers = {
  Control: { virtualKey: 0xA2, extended: false },
  Alt: { virtualKey: 0xA4, extended: false },
  Shift: { virtualKey: 0xA0, extended: false },
  Meta: { virtualKey: 0x5B, extended: true },
} as const
type Modifier = keyof typeof modifiers
const modifierAliases = new Map<string, Modifier>([
  ['ctrl', 'Control'],
  ['control', 'Control'],
  ['alt', 'Alt'],
  ['shift', 'Shift'],
  ['win', 'Meta'],
  ['windows', 'Meta'],
  ['meta', 'Meta'],
])
const keys: Record<string, { name: string, virtualKey: number, extended: boolean }> = {
  backspace: { name: 'Backspace', virtualKey: 0x08, extended: false },
  tab: { name: 'Tab', virtualKey: 0x09, extended: false },
  enter: { name: 'Enter', virtualKey: 0x0D, extended: false },
  escape: { name: 'Escape', virtualKey: 0x1B, extended: false },
  esc: { name: 'Escape', virtualKey: 0x1B, extended: false },
  space: { name: 'Space', virtualKey: 0x20, extended: false },
  pageup: { name: 'PageUp', virtualKey: 0x21, extended: true },
  pagedown: { name: 'PageDown', virtualKey: 0x22, extended: true },
  end: { name: 'End', virtualKey: 0x23, extended: true },
  home: { name: 'Home', virtualKey: 0x24, extended: true },
  left: { name: 'ArrowLeft', virtualKey: 0x25, extended: true },
  arrowleft: { name: 'ArrowLeft', virtualKey: 0x25, extended: true },
  up: { name: 'ArrowUp', virtualKey: 0x26, extended: true },
  arrowup: { name: 'ArrowUp', virtualKey: 0x26, extended: true },
  right: { name: 'ArrowRight', virtualKey: 0x27, extended: true },
  arrowright: { name: 'ArrowRight', virtualKey: 0x27, extended: true },
  down: { name: 'ArrowDown', virtualKey: 0x28, extended: true },
  arrowdown: { name: 'ArrowDown', virtualKey: 0x28, extended: true },
  insert: { name: 'Insert', virtualKey: 0x2D, extended: true },
  delete: { name: 'Delete', virtualKey: 0x2E, extended: true },
  add: { name: 'Add', virtualKey: 0x6B, extended: false },
  subtract: { name: 'Subtract', virtualKey: 0x6D, extended: false },
  multiply: { name: 'Multiply', virtualKey: 0x6A, extended: false },
  divide: { name: 'Divide', virtualKey: 0x6F, extended: true },
}

/**
 * One chord, not a macro or Unicode text. A native writer must recheck its
 * observed foreground/authority before each balanced batch, including repeats.
 * VK codes/extended flags follow Winuser.h, not the active text keyboard layout.
 */
export function compileWindowsKeyboardShortcut(shortcut: unknown, repeat: unknown = 1) {
  if (typeof shortcut !== 'string' || shortcut.length < 1 || shortcut.length > 96 || /[\r\n\0]/u.test(shortcut)
    || typeof repeat !== 'number' || !Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
    throw new Error('WINDOWS_KEYBOARD_SHORTCUT_BUDGET')
  }
  const tokens = shortcut.split('+').map(token => token.trim().toLowerCase())
  if (tokens.some(token => !token) || tokens.length > 5)
    throw new Error('WINDOWS_KEYBOARD_SHORTCUT_REQUIRED')
  const selected = new Set<Modifier>()
  let key: typeof keys[string] | undefined
  for (const token of tokens) {
    const modifier = modifierAliases.get(token)
    if (modifier) {
      if (selected.has(modifier) || key)
        throw new Error('WINDOWS_KEYBOARD_MODIFIER_ORDER')
      selected.add(modifier)
      continue
    }
    if (key)
      throw new Error('WINDOWS_KEYBOARD_ONE_KEY_REQUIRED')
    if (/^[a-z0-9]$/u.test(token))
      key = { name: token.toUpperCase(), virtualKey: token.toUpperCase().charCodeAt(0), extended: false }
    else if (/^f(?:[1-9]|1\d|2[0-4])$/u.test(token))
      key = { name: token.toUpperCase(), virtualKey: 0x6F + Number(token.slice(1)), extended: false }
    else
      key = Object.hasOwn(keys, token) ? keys[token] : undefined
    if (!key)
      throw new Error('WINDOWS_KEYBOARD_KEY_UNSUPPORTED')
  }
  if (!key)
    throw new Error('WINDOWS_KEYBOARD_ONE_KEY_REQUIRED')
  if (selected.has('Control') && selected.has('Alt') && key.name === 'Delete')
    throw new Error('WINDOWS_KEYBOARD_SECURE_ATTENTION_UNSUPPORTED')
  const order = (Object.keys(modifiers) as Modifier[]).filter(modifier => selected.has(modifier))
  const chord = [...order.map(modifier => modifiers[modifier]), key]
  const down: WindowsKeyboardEvent[] = chord.map(({ virtualKey, extended }) => ({ virtualKey, extended, keyUp: false }))
  const up: WindowsKeyboardEvent[] = [...chord].reverse().map(({ virtualKey, extended }) => ({ virtualKey, extended, keyUp: true }))
  return { shortcut: [...order, key.name].join('+'), repeat, keys: chord.map(item => item.virtualKey), events: [...down, ...up] }
}
