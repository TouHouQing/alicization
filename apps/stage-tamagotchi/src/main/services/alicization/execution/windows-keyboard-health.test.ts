import type { execFile, ExecFileException } from 'node:child_process'

import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { probeWindowsKeyboardStartup } from './windows-keyboard-program'

const receipt = { kind: 'windows-keyboard-program-health-v1', pid: 44, layout: 40, bitness: 64, hooksInstalled: false, inputObserved: false, inputEvents: 0 }

function worker() {
  const child = Object.assign(new EventEmitter(), { pid: 44 })
  let complete!: (error: ExecFileException | null, stdout: string, stderr: string) => void
  const launch = vi.fn((_file, _args, _options, callback) => {
    complete = callback
    return child
  })
  const run = () => probeWindowsKeyboardStartup('C:/owned/keyboard.exe', launch as unknown as typeof execFile)
  return { child, launch, run, complete: (stdout: string, stderr = '', error: ExecFileException | null = null) => complete(error, stdout, stderr) }
}

describe('input-free native startup health', () => {
  it('preserves a synchronous Windows launch refusal as a bounded diagnostic', async () => {
    const launch = vi.fn(() => {
      throw Object.assign(new Error('private local path'), { code: 'EPERM' })
    })
    await expect(probeWindowsKeyboardStartup('C:/owned/keyboard.exe', launch as unknown as typeof execFile)).rejects.toMatchObject({ message: 'WINDOWS_KEYBOARD_PROGRAM_LOAD_FAILED', diagnostic: { code: 'EPERM' } })
  })
  it('uses a fixed non-input role and resolves only after that exact child closes', async () => {
    const test = worker()
    let settled = false
    const pending = test.run().then((value) => {
      settled = true
      return value
    })
    expect(test.launch).toHaveBeenCalledWith('C:/owned/keyboard.exe', ['--health'], { windowsHide: true, shell: false, timeout: 5000, maxBuffer: 4096, encoding: 'utf8' }, expect.any(Function))
    test.complete(JSON.stringify(receipt))
    await Promise.resolve()
    expect(settled).toBe(false)
    test.child.emit('close', 0, null)
    expect(await pending).toEqual({ ...receipt, checkedAt: expect.any(Number) })
  })

  it.each([
    ['wrong process', JSON.stringify({ ...receipt, pid: 45 }), '', null, 0],
    ['hooks', JSON.stringify({ ...receipt, hooksInstalled: true }), '', null, 0],
    ['observed input', JSON.stringify({ ...receipt, inputObserved: true }), '', null, 0],
    ['sent input', JSON.stringify({ ...receipt, inputEvents: 1 }), '', null, 0],
    ['extra field', JSON.stringify({ ...receipt, shortcut: 'Ctrl+S' }), '', null, 0],
    ['two frames', `${JSON.stringify(receipt)}\n${JSON.stringify(receipt)}`, '', null, 0],
    ['malformed', '{', '', null, 0],
    ['stderr', JSON.stringify(receipt), 'startup warning', null, 0],
    ['exit failure', JSON.stringify(receipt), '', null, 1],
    ['OS refusal', '', '', Object.assign(new Error('refused'), { code: 'EACCES' }), -1],
    ['timeout', JSON.stringify(receipt), '', Object.assign(new Error('timeout'), { killed: true, signal: 'SIGTERM' as const }), null],
  ])('rejects %s without announcing readiness', async (_name, stdout, stderr, error, exitCode) => {
    const test = worker()
    const pending = expect(test.run()).rejects.toThrow()
    test.complete(stdout, stderr, error)
    test.child.emit('close', exitCode, null)
    await pending
  })
})
