export interface OperationCapability {
  operation: string
  status: 'ready' | 'degraded' | 'blocked' | 'unsupported'
  mode: 'semantic' | 'visual' | 'foreground' | 'unavailable'
  reason: string | null
}

/** A channel being installed never implies that every operation is implemented. */
export function probeOperationCapability(operation: string, input: { platform: string, windowsKeyboardReady?: boolean, windowsVisualReady?: boolean, foregroundAuthorized?: boolean }): OperationCapability {
  if (['desktop_locate_window', 'desktop_pointer_action'].includes(operation)) {
    if (input.platform !== 'win32')
      return { operation, status: 'unsupported', mode: 'unavailable', reason: 'platform-operation-not-implemented' }
    if (!input.windowsVisualReady)
      return { operation, status: 'degraded', mode: 'unavailable', reason: 'windows-visual-native-helper-unavailable' }
    if (operation === 'desktop_pointer_action' && !input.foregroundAuthorized)
      return { operation, status: 'blocked', mode: 'foreground', reason: 'authorized-foreground-lease-required' }
    return { operation, status: 'ready', mode: operation === 'desktop_pointer_action' ? 'foreground' : 'visual', reason: null }
  }
  const browser = new Set(['browser_open_url', 'browser_search_web', 'browser_read_page', 'browser_navigate', 'browser_scroll', 'browser_wait', 'browser_click_element', 'browser_type_text', 'browser_upload_files'])
  const desktop = new Set(['desktop_inspect_scene', 'desktop_list_interactables', 'desktop_click_element', 'desktop_type_text', 'desktop_open_application', 'desktop_wait', 'desktop_press_keys', 'desktop_scroll'])
  if (!browser.has(operation) && !desktop.has(operation))
    return { operation, status: 'unsupported', mode: 'unavailable', reason: 'unknown-operation' }
  if (!['darwin', 'win32'].includes(input.platform) || (['browser_upload_files', 'desktop_scroll'].includes(operation) && input.platform !== 'win32'))
    return { operation, status: 'unsupported', mode: 'unavailable', reason: 'platform-operation-not-implemented' }
  if (operation !== 'desktop_press_keys')
    return { operation, status: 'ready', mode: 'semantic', reason: null }
  if (input.platform === 'darwin')
    return { operation, status: 'ready', mode: 'foreground', reason: null }
  if (input.platform !== 'win32')
    return { operation, status: 'unsupported', mode: 'unavailable', reason: 'platform-operation-not-implemented' }
  if (!input.windowsKeyboardReady)
    return { operation, status: 'unsupported', mode: 'unavailable', reason: 'windows-keyboard-helper-unavailable' }
  if (!input.foregroundAuthorized)
    return { operation, status: 'blocked', mode: 'foreground', reason: 'authorized-foreground-lease-required' }
  return { operation, status: 'ready', mode: 'foreground', reason: null }
}
