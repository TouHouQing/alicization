import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  armAlicizationMainChatPreparationDeadline,
  raceAlicizationMainChatPreparation,
} from './main-chat-preparation-deadline'

describe('main chat preparation deadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aborts the shared turn when preparation exceeds its deadline', () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const onTimeout = vi.fn()

    const clearDeadline = armAlicizationMainChatPreparationDeadline({
      controller,
      timeoutMs: 100,
      onTimeout,
    })

    vi.advanceTimersByTime(99)
    expect(controller.signal.aborted).toBe(false)

    vi.advanceTimersByTime(1)
    expect(controller.signal.aborted).toBe(true)
    expect(String(controller.signal.reason)).toContain('chat-preparation-timeout')
    expect(onTimeout).toHaveBeenCalledOnce()

    clearDeadline()
  })

  it('clears the deadline without aborting a completed preparation', () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const onTimeout = vi.fn()

    const clearDeadline = armAlicizationMainChatPreparationDeadline({
      controller,
      timeoutMs: 100,
      onTimeout,
    })
    clearDeadline()

    vi.advanceTimersByTime(1000)
    expect(controller.signal.aborted).toBe(false)
    expect(onTimeout).not.toHaveBeenCalled()
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
})
