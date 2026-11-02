import type { createLifeWindowsDesktopRuntime } from '../life-windows-desktop-runtime'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createAlicizationLocalBrowserAutomationService } from '../local-browser-automation'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkInterfaceTools } from './work-interface-tools'

const cases = [
  { method: 'openUrl', operation: 'browser_open_url', parameters: { url: 'https://example.com/accepted' }, changed: { url: 'https://example.com/other' } },
  { method: 'openUrl', operation: 'browser_open_url', parameters: { browser: 'default' }, changed: { browser: 'safari' } },
  { method: 'openUrl', operation: 'browser_open_url', parameters: { site: 'weibo' }, changed: { site: 'bilibili' } },
  { method: 'searchWeb', operation: 'browser_search_web', parameters: { query: 'accepted query' }, changed: { query: 'private other query' } },
  { method: 'readPage', operation: 'browser_read_page', parameters: { format: 'text' }, changed: { format: 'html' } },
  { method: 'clickElement', operation: 'browser_click_element', parameters: { selector: 'element:accepted' }, changed: { selector: 'element:other' } },
  { method: 'typeBrowserText', operation: 'browser_type_text', parameters: { selector: 'element:accepted', text: 'approved 中文🙂', submit: false }, changed: { selector: 'element:accepted', text: 'other', submit: true } },
  { method: 'uploadBrowserFiles', operation: 'browser_upload_files', parameters: { selector: 'element:accepted', files: ['C:/owned.txt'] }, changed: { selector: 'element:accepted', files: ['C:/other.txt'] } },
  { method: 'navigateBrowser', operation: 'browser_navigate', parameters: { action: 'back' }, changed: { action: 'reload' } },
  { method: 'scrollBrowser', operation: 'browser_scroll', parameters: { action: 'down', amount: 100 }, changed: { action: 'down', amount: 300 } },
  { method: 'waitForBrowser', operation: 'browser_wait', parameters: { text: 'accepted' }, changed: { text: 'other' } },
  { method: 'listDesktopInteractables', operation: 'desktop_list_interactables', parameters: { windowTitle: 'Owned notes' }, changed: { windowTitle: 'Other application' } },
  { method: 'clickDesktopElement', operation: 'desktop_click_element', parameters: { text: 'Save' }, changed: { text: 'Delete' } },
  { method: 'typeDesktopText', operation: 'desktop_type_text', parameters: { targetText: 'Note', text: 'approved' }, changed: { targetText: 'Note', text: 'other' } },
  { method: 'scrollDesktop', operation: 'desktop_scroll', parameters: { runtimeId: 'owned-scroll', action: 'down', amount: 'large' }, changed: { runtimeId: 'other-scroll', action: 'up', amount: 'small' } },
  { method: 'pressDesktopKeys', operation: 'desktop_press_keys', parameters: { shortcut: 'Ctrl+S' }, changed: { shortcut: 'Alt+F4' } },
  { method: 'openApplication', operation: 'desktop_open_application', parameters: { appName: 'notepad' }, changed: { appName: 'calculator' } },
  { method: 'waitForDesktop', operation: 'desktop_wait', parameters: { titleIncludes: 'Owned' }, changed: { titleIncludes: 'Other' } },
] as const

it.each(cases)('refuses changed $operation parameters before the actual platform port receives input', async ({ method, operation, parameters, changed }) => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-interface-binding-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: broker, now: Date.now })
  const signal = new AbortController().signal
  const dispatch = vi.fn(async () => ({ status: 'completed' }))
  const browser = { openUrl: dispatch, readPage: dispatch, clickElement: dispatch, typeBrowserText: dispatch, uploadBrowserFiles: dispatch, navigateBrowser: dispatch, scrollBrowser: dispatch, waitForBrowser: dispatch, getHealth: async () => ({ available: true, ready: true, reason: null, observedAt: Date.now() }) }
  const desktop = Object.fromEntries(cases.filter(item => item.operation.startsWith('desktop_')).map(item => [item.method, dispatch])) as unknown as ReturnType<typeof createLifeWindowsDesktopRuntime>
  const local = createAlicizationLocalBrowserAutomationService({ selectWindowsBrowser: () => browser, windowsDesktop: desktop, errorMessageFrom: String })
  try {
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'qa', messages: [{ role: 'user', content: 'Perform exactly this approved operation' }] }, signal)
    const capabilityId = `tool.${operation}`
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'owned', capabilityId, parameters, effectContract: createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardGoverned: true, windowsKeyboardReady: true }).resolveActive(capabilityId)!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const invoke = local[method] as (input: unknown) => Promise<unknown>
    await expect(withActionDispatch(action.assertDispatchCurrent, () => invoke({ ...changed, abortSignal: signal }))).rejects.toThrow(/input|dispatch/iu)
    expect(dispatch).not.toHaveBeenCalled()
    const otherOperation = operation === 'browser_read_page' ? local.clickElement : operation.startsWith('browser_') ? local.readPage : operation === 'desktop_list_interactables' ? local.clickDesktopElement : local.listDesktopInteractables
    await expect(withActionDispatch(action.assertDispatchCurrent, () => (otherOperation as (input: unknown) => Promise<unknown>)(parameters))).rejects.toThrow(/input|capability|dispatch/iu)
    expect(dispatch).not.toHaveBeenCalled()
    const workTools = createWorkInterfaceTools(local)
    await withActionDispatch(action.assertDispatchCurrent, () => workTools[capabilityId as keyof typeof workTools](parameters, signal))
    expect(dispatch).toHaveBeenCalledOnce()
    expect((await database.getLifeEffect(action.id))?.status).toBe('dispatched')
  }
  finally { await database.close(); await rm(root, { recursive: true, force: true }) }
})
