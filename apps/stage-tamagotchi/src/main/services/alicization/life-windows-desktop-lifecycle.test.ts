import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'

import { afterEach, expect, it, vi } from 'vitest'

import { createLifeWindowsDesktopRuntime } from './life-windows-desktop-runtime'

const workers = vi.hoisted(() => [] as Array<{ child: EventEmitter, path: string, input?: Record<string, unknown> }>)
const holdReads = vi.hoisted(() => ({ value: false }))
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: (_file: string, args: string[], options: { signal?: AbortSignal }, callback: (error: Error | null, stdout: string) => void) => {
    const child = new EventEmitter()
    const record = { child, path: args[args.length - 1], input: undefined as Record<string, unknown> | undefined }
    workers.push(record)
    const abort = () => callback(new DOMException('Aborted before native close', 'AbortError'), '')
    options.signal?.addEventListener('abort', abort, { once: true })
    child.once('close', () => options.signal?.removeEventListener('abort', abort))
    return Object.assign(child, { stdin: { end: (raw: string) => {
      record.input = JSON.parse(raw)
      if (record.input!.operation === 'observe' && !holdReads.value) {
        callback(null, JSON.stringify({ ok: true, windowId: '10', processId: 11, processStartTicks: '638900000000000000', windowClass: 'OwnedNotes', desktop: 'QA', title: 'Owned notes', elements: [{ runtimeId: 'input', name: 'Note', role: 'input', automationId: 'note', enabled: true, value: '', password: false, readOnly: false }] }))
        child.emit('close', 0, null)
      }
    } } })
  },
}))

afterEach(() => {
  for (const worker of workers)
    worker.child.emit('close', null, 'SIGTERM')
  workers.length = 0
  holdReads.value = false
  vi.useRealTimers()
})

it('retains native ownership and its private worker after AbortError until actual close, refusing overlapping input', async () => {
  vi.useFakeTimers()
  const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
  await desktop.listDesktopInteractables({})
  expect(desktop.isActive()).toBe(false)
  expect(desktop.isWriting()).toBe(false)
  const controller = new AbortController()
  const mutation = desktop.typeDesktopText({ targetText: 'Note', text: 'owned synthetic input', clearExisting: true, abortSignal: controller.signal }).catch(error => error)
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  const held = workers[1]
  expect(held.input?.operation).toBe('type')
  controller.abort(new DOMException('Host cancelled', 'AbortError'))
  await vi.advanceTimersByTimeAsync(6000)
  expect(await mutation).toBeInstanceOf(Error)
  expect(desktop.isActive()).toBe(true)
  expect(desktop.isWriting()).toBe(true)
  expect(await desktop.listDesktopInteractables({})).toMatchObject({ errorCode: 'WINDOWS_UIA_BUSY' })
  expect(workers).toHaveLength(2)
  expect(existsSync(held.path)).toBe(true)
  held.child.emit('close', null, 'SIGTERM')
  await vi.waitFor(() => expect(existsSync(held.path)).toBe(false))
  expect(desktop.isActive()).toBe(false)
  expect(desktop.isWriting()).toBe(false)
  expect(await desktop.listDesktopInteractables({})).toMatchObject({ status: 'completed' })
}, 30000)

it('retains an interrupted native read without misclassifying it as a live writer', async () => {
  vi.useFakeTimers()
  holdReads.value = true
  const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'alice' })
  const controller = new AbortController()
  const reading = desktop.listDesktopInteractables({ abortSignal: controller.signal }).catch(error => error)
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  expect(desktop.isActive()).toBe(true)
  expect(desktop.isWriting()).toBe(false)
  controller.abort(new DOMException('Stop this read', 'AbortError'))
  await vi.advanceTimersByTimeAsync(6000)
  expect(await reading).toBeInstanceOf(Error)
  expect(desktop.isActive()).toBe(true)
  expect(desktop.isWriting()).toBe(false)
  workers[0].child.emit('close', null, 'SIGTERM')
  await vi.waitFor(() => expect(desktop.isActive()).toBe(false))
})
