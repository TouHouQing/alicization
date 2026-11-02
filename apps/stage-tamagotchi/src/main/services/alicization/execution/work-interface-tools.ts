import type { createAlicizationLocalBrowserAutomationService } from '../local-browser-automation'
import type { WindowsVisualActInput, WindowsVisualLocateInput } from './windows-visual-tool-contracts'

type InterfaceTools = ReturnType<typeof createAlicizationLocalBrowserAutomationService>
type WorkTool = (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>

export function createWorkInterfaceTools(local: InterfaceTools) {
  // The registry validates work inputs before these ports run. Keep their JSON
  // identity exact: defaults/coercions here would change the admitted action.
  return {
    'tool.browser_open_url': (input, signal) => local.openUrl({ ...input, abortSignal: signal }),
    'tool.browser_search_web': (input, signal) => local.searchWeb({ ...input, query: input.query as string, abortSignal: signal }),
    'tool.browser_read_page': (input, signal) => local.readPage({ ...input, abortSignal: signal }),
    'tool.browser_navigate': (input, signal) => local.navigateBrowser({ ...input, action: input.action as string, abortSignal: signal }),
    'tool.browser_scroll': (input, signal) => local.scrollBrowser({ ...input, action: input.action as string, abortSignal: signal }),
    'tool.browser_wait': (input, signal) => local.waitForBrowser({ ...input, abortSignal: signal }),
    'tool.browser_click_element': (input, signal) => local.clickElement({ ...input, abortSignal: signal }),
    'tool.browser_type_text': (input, signal) => local.typeBrowserText({ ...input, text: input.text as string, abortSignal: signal }),
    'tool.browser_upload_files': (input, signal) => local.uploadBrowserFiles({ ...input, selector: input.selector as string, files: input.files as string[], abortSignal: signal }),
    'tool.desktop_list_interactables': (input, signal) => local.listDesktopInteractables({ ...input, abortSignal: signal }),
    'tool.desktop_open_application': (input, signal) => local.openApplication({ ...input, abortSignal: signal }),
    'tool.desktop_wait': (input, signal) => local.waitForDesktop({ ...input, abortSignal: signal }),
    'tool.desktop_click_element': (input, signal) => local.clickDesktopElement({ ...input, abortSignal: signal }),
    'tool.desktop_type_text': (input, signal) => local.typeDesktopText({ ...input, text: input.text as string, abortSignal: signal }),
    'tool.desktop_scroll': (input, signal) => local.scrollDesktop({ ...input, runtimeId: input.runtimeId as string, action: input.action as 'up' | 'down' | 'top' | 'bottom', abortSignal: signal }),
    'tool.desktop_press_keys': (input, signal) => local.pressDesktopKeys({ ...input, shortcut: input.shortcut as string, abortSignal: signal }),
    'tool.desktop_locate_window': (input, signal) => local.locateDesktopWindow({ ...input, abortSignal: signal } as WindowsVisualLocateInput),
    'tool.desktop_pointer_action': (input, signal) => local.actDesktopPointer({ ...input, abortSignal: signal } as WindowsVisualActInput),
  } satisfies Record<string, WorkTool>
}
