import { describe, expect, it, vi } from 'vitest'

import { createLifeWindowsDesktopRuntime } from './life-windows-desktop-runtime'

const commands = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: (_file: string, _args: string[], _options: unknown, callback: (error: null, stdout: string) => void) => ({ stdin: { end: (json: string) => {
    const input = JSON.parse(json)
    commands(input)
    callback(null, JSON.stringify({ ok: true, windowId: '10', processId: 11, desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: 'Note', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] }))
  } } }),
}))

describe('native mutation target title', () => {
  it('requires the requested title to match the current actual observation before dispatch', async () => {
    commands.mockClear()
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.typeDesktopText({ windowTitle: 'Other window', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ status: 'failed', errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', sideEffectState: 'none' })
    expect(commands).toHaveBeenCalledTimes(1)
    expect(await desktop.typeDesktopText({ windowTitle: 'Owned notes', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    await desktop.listDesktopInteractables({ windowTitle: 'Owned notes' })
    expect(await desktop.typeDesktopText({ windowTitle: 'Owned notes', targetText: 'Note', text: 'safe text', clearExisting: true })).toMatchObject({ status: 'completed' })
    expect(commands.mock.lastCall?.[0]).toMatchObject({ operation: 'type', expectedWindowTitle: 'Owned notes', windowId: '10', processId: 11 })
  })
})
