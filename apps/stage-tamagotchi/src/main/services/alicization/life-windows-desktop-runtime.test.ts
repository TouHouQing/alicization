import type { LifeInterfaceRiskRequest } from './life-interface-risk'

import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { withActionDispatch } from './execution/action-dispatch-context'
import { createLifeWindowsDesktopRuntime } from './life-windows-desktop-runtime'

const commands = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: (_file: string, _args: string[], _options: unknown, callback: (error: null, stdout: string) => void) => {
    const child = new EventEmitter()
    return Object.assign(child, { stdin: { end: (json: string) => {
      const input = JSON.parse(json)
      const outcome = commands(input)
      callback(null, JSON.stringify(outcome ?? { ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: 'Note', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] }))
      child.emit('close', 0, null)
    } } })
  },
}))

describe('native mutation target title', () => {
  it('binds the selected recipient to risk review and revalidates it before sending', async () => {
    commands.mockReset()
    const authorize = vi.fn(async (_request: LifeInterfaceRiskRequest) => ({ allow: true, reason: 'host-approved' }))
    for (const value of ['本人', '其他人']) {
      const recipient = { runtimeId: 'recipient', name: '收件人', role: 'select', automationId: 'recipient', enabled: true, value, password: false, readOnly: false }
      commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [recipient, { runtimeId: 'send', name: '发送', role: 'button', automationId: 'send', enabled: true, value: null, password: false, readOnly: false }] })
      commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_STALE_WINDOW_STATE', effectMayHaveOccurred: false })
      const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice', authorize })
      await desktop.listDesktopInteractables({})
      expect(await desktop.clickDesktopElement({ text: '发送', role: 'button', exactText: true })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_STALE_WINDOW_STATE', sideEffectState: 'none' })
      expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'click', expectedInputs: [recipient] })
      expect(await desktop.clickDesktopElement({ text: '发送', role: 'button' })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    }
    expect(authorize).toHaveBeenCalledTimes(2)
    expect(authorize.mock.calls[0][0].effectDigest).not.toBe(authorize.mock.calls[1][0].effectDigest)
  })

  it('binds risk review to the popup owner even when every control and window identifier stays the same', async () => {
    commands.mockReset()
    const authorize = vi.fn(async (_request: LifeInterfaceRiskRequest) => ({ allow: true, reason: 'host-approved' }))
    for (const ownerWindowId of ['9', '8']) {
      commands.mockReturnValueOnce({ ok: true, windowId: '10', ownerWindowId, processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: '发送留言', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] })
      const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice', authorize })
      await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
      expect(await desktop.typeDesktopText({ targetText: '发送留言', text: 'same reviewed text', clearExisting: true })).toMatchObject({ status: 'completed' })
    }
    expect(authorize).toHaveBeenCalledTimes(2)
    const [first, second] = authorize.mock.calls.map(([request]) => request)
    expect(JSON.parse(first.targetId)).toMatchObject({ windowId: '10', ownerWindowId: '9' })
    expect(JSON.parse(second.targetId)).toMatchObject({ windowId: '10', ownerWindowId: '8' })
    expect(first.targetFingerprint).not.toBe(second.targetFingerprint)
  })

  it.each(['9', null])('pins the observed popup owner %s into the native mutation', async (ownerWindowId) => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, windowId: '10', ownerWindowId, processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: 'Note', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.typeDesktopText({ targetText: 'Note', text: 'local owned note', clearExisting: true })).toMatchObject({ status: 'completed' })
    expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'type', expectedOwnerWindowId: ownerWindowId })
  })

  it('scrolls only an exact observed container, carries its old viewport and invalidates the observation', async () => {
    commands.mockReset()
    const container = { runtimeId: 'scroll', name: '阅读区域', role: 'pane', automationId: 'reader', enabled: true, value: null, password: false, readOnly: false, scroll: { verticalPercent: 0, horizontalPercent: -1, verticalViewSize: 20, horizontalViewSize: 100, verticalScrollable: true, horizontalScrollable: false } }
    commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [container] })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.scrollDesktop({ runtimeId: 'unobserved', action: 'down' })).toMatchObject({ status: 'failed', sideEffectState: 'none' })
    expect(commands).toHaveBeenCalledTimes(1)
    expect(await desktop.scrollDesktop({ runtimeId: 'scroll', windowTitle: 'Owned notes', action: 'down', amount: 'large' })).toMatchObject({ status: 'completed', operation: 'desktop_scroll' })
    expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'scroll', expected: container, action: 'down', amount: 'large', expectedWindowClass: 'OwnedNotes', expectedProcessStartTicks: '638900000000000000', expectedDesktop: 'QA', expectedWindowTitle: 'Owned notes' })
    expect(await desktop.scrollDesktop({ runtimeId: 'scroll', action: 'down' })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    expect(commands).toHaveBeenCalledTimes(2)
  })

  it('preserves ambiguous window identities and invalidates the previous input target', async () => {
    commands.mockReset()
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    const matchedWindows = [{ windowId: '10', processId: 11, windowClass: 'OwnedNotes' }, { windowId: '20', processId: 21, windowClass: 'OwnedNotes' }]
    commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_AMBIGUOUS_WINDOW', matchedWindows, effectMayHaveOccurred: false })
    expect(await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })).toMatchObject({ status: 'failed', sideEffectState: 'none', matchedWindows })
    expect(await desktop.typeDesktopText({ targetText: 'Note', text: 'must not dispatch' })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    expect(commands.mock.calls.map(([request]) => request.operation)).toEqual(['observe', 'observe'])
  })

  it('preserves a native foreground requirement as an unstarted menu action and invalidates its observation', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'menu-header', name: '文件菜单', role: 'menu-item', automationId: 'file-menu', enabled: true, value: null, password: false, readOnly: false }] })
    commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', errorMessage: 'FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: false, sideEffectState: 'none' })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({})
    expect(await desktop.clickDesktopElement({ text: '文件菜单', role: 'menu-item' })).toMatchObject({ status: 'failed', sideEffectState: 'none', effectMayHaveOccurred: false, requiresForeground: true, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED' })
    expect(await desktop.clickDesktopElement({ text: '文件菜单', role: 'menu-item' })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    expect(commands.mock.calls.map(([request]) => request.operation)).toEqual(['observe', 'click'])
  })

  it('retains an unobserved menu expansion as an uncertain effect and requires a fresh observation before any further input', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'menu-header', name: '文件菜单', role: 'menu-item', automationId: 'file-menu', enabled: true, value: null, password: false, readOnly: false }] })
    commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_EXPANSION_NOT_OBSERVED', errorMessage: 'EXPANSION_NOT_OBSERVED', effectMayHaveOccurred: true, sideEffectState: 'unknown' })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({})
    expect(await desktop.clickDesktopElement({ text: '文件菜单', role: 'menu-item' })).toMatchObject({ status: 'failed', sideEffectState: 'unknown', effectMayHaveOccurred: true, errorCode: 'WINDOWS_UIA_EXPANSION_NOT_OBSERVED' })
    expect(await desktop.clickDesktopElement({ text: '文件菜单', role: 'menu-item' })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    expect(commands.mock.calls.map(([request]) => request.operation)).toEqual(['observe', 'click'])
  })

  it('does not start a mutation worker when action authority ends while awaiting approval', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: '发送留言', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] })
    let current = true
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice', authorize: async () => {
      current = false
      return { allow: true, reason: 'host-approved' }
    } })
    await desktop.listDesktopInteractables({})
    const result = await withActionDispatch(async () => {
      if (!current)
        throw new Error('host-withdrew-original-action')
      return { expiresAt: Date.now() + 60000 }
    }, () => desktop.typeDesktopText({ targetText: '发送留言', text: 'must not send', clearExisting: true }))
    expect(result).toMatchObject({ status: 'failed', effectMayHaveOccurred: false, requiresVerification: false, errorMessage: 'host-withdrew-original-action' })
    expect(commands).toHaveBeenCalledTimes(1)
    expect(commands.mock.calls[0][0].operation).toBe('observe')
  })
  it('keeps an approved text snapshot exact if its caller changes input during confirmation', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: '发送留言', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] })
    const input = { targetText: '发送留言', text: 'exact approved content 中文🙂', clearExisting: true }
    const authorize = vi.fn(async (_request: LifeInterfaceRiskRequest) => {
      input.text = 'mutated after review'
      return { allow: true, reason: 'host-approved' }
    })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice', authorize })
    await desktop.listDesktopInteractables({})
    expect(await desktop.typeDesktopText(input)).toMatchObject({ status: 'completed' })
    expect(authorize.mock.calls[0]?.[0]).toMatchObject({ previewText: 'exact approved content 中文🙂' })
    expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'type', text: 'exact approved content 中文🙂' })
    expect(input.text).toBe('mutated after review')
  })

  it('probes the actual worker without reading a window or authorizing controls', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: true, health: 'uia-ready', keyboardReady: false })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    expect(await desktop.getHealth()).toMatchObject({ available: true, ready: true, reason: null })
    expect(await desktop.getHealth()).toMatchObject({ ready: true })
    expect(commands.mock.calls.map(([input]) => input)).toEqual([{ operation: 'health' }])
    expect(await desktop.typeDesktopText({ text: 'do not inject', targetText: 'unobserved' })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    expect(commands).toHaveBeenCalledTimes(1)
    commands.mockReturnValueOnce({ ok: false, errorCode: 'UIA_ASSEMBLY_FAILED' })
    expect(await createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' }).getHealth()).toMatchObject({ available: true, ready: false, reason: 'windows-uia-probe-failed' })
  })

  it('waits for an explicitly named window without issuing input and preserves native identity', async () => {
    commands.mockReset()
    commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_WINDOW_NOT_FOUND' })
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    expect(await desktop.waitForDesktop({ appName: '记事本', titleIncludes: 'Owned notes', timeoutMs: 5000 })).toMatchObject({ status: 'completed', proofScope: 'matching-window-observed-only', foregroundChanged: false, processStartTicks: '638900000000000000' })
    expect(commands).toHaveBeenCalledTimes(2)
    expect(commands.mock.calls.every(([input]) => input.operation === 'observe' && input.processName === 'notepad' && input.windowTitleIncludes === 'Owned notes')).toBe(true)
    commands.mockReturnValueOnce({ ok: false, errorCode: 'WINDOWS_UIA_AMBIGUOUS_WINDOW' })
    expect(await desktop.waitForDesktop({ titleIncludes: 'Owned', timeoutMs: 5000 })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_AMBIGUOUS_WINDOW' })
    const abort = new AbortController()
    abort.abort()
    await expect(desktop.waitForDesktop({ titleIncludes: 'Owned', abortSignal: abort.signal })).rejects.toThrow()
    expect(commands).toHaveBeenCalledTimes(3)
  })

  it('requires the requested title to match the current actual observation before dispatch', async () => {
    commands.mockClear()
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.typeDesktopText({ windowTitle: 'Other window', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', sideEffectState: 'none' })
    expect(commands).toHaveBeenCalledTimes(1)
    expect(await desktop.typeDesktopText({ windowTitle: 'Owned notes', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.typeDesktopText({ windowTitle: 'Owned notes', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ status: 'completed' })
    expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'type', expectedWindowTitle: 'Owned notes', windowId: '10', processId: 11, expectedProcessStartTicks: '638900000000000000', expectedWindowClass: 'OwnedNotes', expectedDesktop: 'QA' })
  })
})
