import type { execFile } from 'node:child_process'

import { describe, expect, it, vi } from 'vitest'

import { readWindowsKeyboardForeground } from './windows-keyboard-program'

const target = { windowId: '101', processId: 202, processStartTicks: '639284841667866765', windowClass: 'OwnedEditor', desktop: 'QA', inputDesktop: 'QA', focusWindowId: '303', integrityLevel: 8192 }

function launcher(stdout: string, stderr = '', error: unknown = null) {
  return vi.fn((_file, _args, _options, callback) => callback(error, stdout, stderr))
}

describe('bounded native foreground observation', () => {
  it('uses only the verified native executable and fixed read-only role', async () => {
    const launch = launcher(JSON.stringify(target))
    expect(await readWindowsKeyboardForeground('C:/owned/keyboard.exe', launch as unknown as typeof execFile)).toEqual(target)
    expect(launch).toHaveBeenCalledWith('C:/owned/keyboard.exe', ['--observe'], { windowsHide: true, shell: false, timeout: 5000, maxBuffer: 32768, encoding: 'utf8' }, expect.any(Function))
  })

  it.each([
    ['stderr', JSON.stringify(target), 'unconfirmed observer output', null],
    ['failed process', JSON.stringify(target), '', new Error('timeout')],
    ['missing focus', JSON.stringify({ ...target, focusWindowId: null }), '', null],
    ['extra action', JSON.stringify({ ...target, shortcut: 'Ctrl+S' }), '', null],
    ['trailing result', `${JSON.stringify(target)}\n${JSON.stringify(target)}`, '', null],
  ])('rejects %s without creating a target or input authority', async (_name, stdout, stderr, error) => {
    await expect(readWindowsKeyboardForeground('C:/owned/keyboard.exe', launcher(stdout as string, stderr as string, error) as unknown as typeof execFile)).rejects.toThrow()
  })
})
