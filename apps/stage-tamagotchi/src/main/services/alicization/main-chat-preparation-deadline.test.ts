import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  armAlicizationMainChatPreparationDeadline,
  raceAlicizationMainChatPreparation,
} from './main-chat-preparation-deadline'

describe('main chat preparation deadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aborts only the preparation scope when preparation exceeds its deadline', () => {
    vi.useFakeTimers()
    const parentController = new AbortController()
    const onTimeout = vi.fn()

    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal: parentController.signal,
      timeoutMs: 100,
      onTimeout,
    })

    vi.advanceTimersByTime(99)
    expect(deadline.signal.aborted).toBe(false)
    expect(parentController.signal.aborted).toBe(false)

    vi.advanceTimersByTime(1)
    expect(deadline.signal.aborted).toBe(true)
    expect(String(deadline.signal.reason)).toContain('chat-preparation-timeout')
    expect(parentController.signal.aborted).toBe(false)
    expect(onTimeout).toHaveBeenCalledOnce()

    deadline.clear()
  })

  it('clears the deadline without aborting a completed preparation', () => {
    vi.useFakeTimers()
    const parentController = new AbortController()
    const onTimeout = vi.fn()

    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal: parentController.signal,
      timeoutMs: 100,
      onTimeout,
    })
    deadline.clear()

    vi.advanceTimersByTime(1000)
    expect(deadline.signal.aborted).toBe(false)
    expect(parentController.signal.aborted).toBe(false)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('propagates a real user cancellation into the preparation scope', () => {
    const parentController = new AbortController()
    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal: parentController.signal,
      timeoutMs: 100,
    })
    const cancellation = new DOMException('user cancelled', 'AbortError')

    parentController.abort(cancellation)

    expect(deadline.signal.aborted).toBe(true)
    expect(deadline.signal.reason).toBe(cancellation)
    deadline.clear()
  })

  it('rejects immediately when the shared turn aborts even if preparation never settles', async () => {
    const controller = new AbortController()
    const neverSettles = new Promise<string>(() => {})
    const raced = raceAlicizationMainChatPreparation({
      preparationPromise: neverSettles,
      signal: controller.signal,
    })

    controller.abort(new DOMException('chat-preparation-timeout', 'AbortError'))

    await expect(raced).rejects.toMatchObject({
      name: 'AbortError',
      message: 'chat-preparation-timeout',
    })
  })

  it('does not reinterpret a reasonless cancellation as a preparation timeout', async () => {
    const controller = new AbortController()
    const raced = raceAlicizationMainChatPreparation({
      preparationPromise: new Promise<string>(() => {}),
      signal: controller.signal,
    })

    controller.abort()

    await expect(raced).rejects.toMatchObject({
      name: 'AbortError',
    })
    await expect(raced).rejects.not.toMatchObject({
      message: expect.stringContaining('chat-preparation-timeout'),
    })
  })

  it('ignores a late preparation result after the deadline has already won', async () => {
    const controller = new AbortController()
    let resolvePreparation!: (value: string) => void
    const preparationPromise = new Promise<string>((resolve) => {
      resolvePreparation = resolve
    })
    const raced = raceAlicizationMainChatPreparation({
      preparationPromise,
      signal: controller.signal,
    })

    controller.abort(new DOMException('chat-preparation-timeout', 'AbortError'))
    resolvePreparation('late prepared result')

    await expect(raced).rejects.toMatchObject({
      name: 'AbortError',
      message: 'chat-preparation-timeout',
    })
  })

  it('does not miss an abort that happens while registering the preparation race listener', async () => {
    const reason = new DOMException('chat-preparation-timeout', 'AbortError')
    let aborted = false
    const signal = {
      get aborted() {
        return aborted
      },
      get reason() {
        return reason
      },
      addEventListener: () => {
        aborted = true
      },
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal

    const raced = raceAlicizationMainChatPreparation({
      preparationPromise: new Promise<string>(() => {}),
      signal,
    })

    await expect(raced).rejects.toBe(reason)
  })

  it('does not miss a parent abort that happens while arming the preparation deadline', () => {
    const reason = new DOMException('user cancelled', 'AbortError')
    let aborted = false
    const parentSignal = {
      get aborted() {
        return aborted
      },
      get reason() {
        return reason
      },
      addEventListener: () => {
        aborted = true
      },
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal

    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal,
      timeoutMs: 100,
    })

    expect(deadline.signal.aborted).toBe(true)
    expect(deadline.signal.reason).toBe(reason)
    deadline.clear()
  })

  it('keeps timeout authoritative when user cancellation follows at the same deadline', async () => {
    vi.useFakeTimers()
    const parentController = new AbortController()
    const onTimeout = vi.fn()
    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal: parentController.signal,
      timeoutMs: 100,
      onTimeout,
    })
    const raced = raceAlicizationMainChatPreparation({
      preparationPromise: new Promise<string>(() => {}),
      signal: deadline.signal,
    })

    vi.advanceTimersByTime(100)
    parentController.abort(new DOMException('user cancelled after timeout', 'AbortError'))

    await expect(raced).rejects.toMatchObject({
      name: 'AbortError',
      errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
      timeoutReason: 'chat-preparation-timeout',
    })
    expect(onTimeout).toHaveBeenCalledOnce()
    expect(deadline.signal.reason).toMatchObject({
      errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
      timeoutReason: 'chat-preparation-timeout',
    })
    deadline.clear()
  })

  it('keeps user cancellation authoritative when it wins before the same deadline', async () => {
    vi.useFakeTimers()
    const parentController = new AbortController()
    const onTimeout = vi.fn()
    const deadline = armAlicizationMainChatPreparationDeadline({
      parentSignal: parentController.signal,
      timeoutMs: 100,
      onTimeout,
    })
    const cancellation = new DOMException('user cancelled before timeout', 'AbortError')
    const raced = raceAlicizationMainChatPreparation({
      preparationPromise: new Promise<string>(() => {}),
      signal: deadline.signal,
    })

    parentController.abort(cancellation)
    vi.advanceTimersByTime(100)

    await expect(raced).rejects.toBe(cancellation)
    expect(onTimeout).not.toHaveBeenCalled()
    expect(deadline.signal.reason).toBe(cancellation)
    deadline.clear()
  })
})
