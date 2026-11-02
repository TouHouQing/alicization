import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationMainGatewayWorkCoordinator,
  isMainGatewayForegroundPreemption,
} from './main-gateway-work-coordinator'

describe('main gateway work coordinator', () => {
  it.each(['personal-activity', 'dream', 'reply-grounding'] as const)('does not lend a released foreground owner to detached %s work', async (source) => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const original = coordinator.openForeground({ turnId: 'finished-dialogue' })
    const resume = Promise.withResolvers<void>()
    const detached = original.run(async () => {
      await resume.promise
      return coordinator.acquireOneShot({ source })
    })
    original.release()
    const current = coordinator.openForeground({ turnId: 'new-human-dialogue' })
    resume.resolve()
    const lease = await detached
    if (lease.accepted)
      lease.release({ status: 'cancelled' })
    current.release()
    expect(lease).toEqual({ accepted: false, lane: 'background', reason: 'foreground-active' })
  })

  it('makes detached personal creation preemptible after its original dialogue has ended', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const original = coordinator.openForeground({ turnId: 'creative-choice' })
    await original.run(async () => {
      original.release()
      const creation = coordinator.acquireOneShot({ source: 'personal-activity' })
      if (!creation.accepted)
        throw new Error('The quiet background activity should be admitted')
      const next = coordinator.openForeground({ turnId: 'host-returned' })
      const observed = { lane: creation.lane, aborted: creation.controller.signal.aborted, preempted: isMainGatewayForegroundPreemption(creation.controller.signal.reason), source: coordinator.snapshot().activeBackgroundSource }
      creation.release({ status: 'cancelled' })
      next.release()
      expect(observed).toEqual({ lane: 'background', aborted: true, preempted: true, source: 'personal-activity' })
    })
  })

  it('keeps a currently invited personal activity on its live foreground owner', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const current = coordinator.openForeground({ turnId: 'current-invitation' })
    await current.run(async () => {
      const creation = coordinator.acquireOneShot({ source: 'personal-activity' })
      expect(creation).toMatchObject({ accepted: true, lane: 'foreground' })
      if (creation.accepted)
        creation.release({ status: 'success' })
    })
    current.release()
    expect(coordinator.snapshot()).toEqual({ activeBackgroundSource: null, activeForegroundCount: 0 })
  })

  it('does not reopen a released foreground handle over another conversation', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const original = coordinator.openForeground({ turnId: 'finished' })
    original.release()
    const current = coordinator.openForeground({ turnId: 'current' })
    const late = await original.run(async () => coordinator.acquireOneShot({ source: 'personal-activity' }))
    if (late.accepted)
      late.release({ status: 'cancelled' })
    current.release()
    expect(late).toEqual({ accepted: false, lane: 'background', reason: 'foreground-active' })
  })

  it('cancels an admitted background owner on close, retains its unsettled lease and admits no new work', () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const notify = vi.fn()
    coordinator.onAvailability(notify)
    const lease = coordinator.acquireOneShot({ source: 'execution-planning' })
    if (!lease.accepted)
      throw new Error('Expected an admitted provider owner')
    const reason = new DOMException('app-before-quit', 'AbortError')
    coordinator.close(reason)
    expect(lease.controller.signal.reason).toBe(reason)
    expect(coordinator.snapshot().activeBackgroundSource).toBe('execution-planning')
    expect(() => coordinator.acquireOneShot({ source: 'dream' })).toThrow('coordinator is closed')
    expect(() => coordinator.openForeground({ turnId: 'late' })).toThrow('coordinator is closed')
    coordinator.close()
    lease.release({ status: 'cancelled' })
    expect(coordinator.snapshot().activeBackgroundSource).toBeNull()
    expect(notify).not.toHaveBeenCalled()
  })

  it('aborts foreground one-shot owners and rejects queued work in an old foreground scope', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const foreground = coordinator.openForeground({ turnId: 'current' })
    await foreground.run(async () => {
      const lease = coordinator.acquireOneShot({ source: 'reply-grounding' })
      if (!lease.accepted)
        throw new Error('Expected a foreground provider owner')
      expect(lease.lane).toBe('foreground')
      coordinator.close()
      expect(lease.controller.signal.aborted).toBe(true)
      expect(lease.controller.signal.reason.name).toBe('AbortError')
      lease.release({ status: 'cancelled' })
    })
    await expect(foreground.run(async () => {})).rejects.toThrow('coordinator is closed')
    foreground.release()
    expect(coordinator.snapshot().activeForegroundCount).toBe(0)
  })

  it('clears its actual backoff timer and observers permanently on close', async () => {
    vi.useFakeTimers()
    try {
      const coordinator = createAlicizationMainGatewayWorkCoordinator()
      const notify = vi.fn()
      coordinator.onAvailability(notify)
      const lease = coordinator.acquireOneShot({ source: 'dream' })
      if (!lease.accepted)
        throw new Error('Expected a background owner')
      lease.release({ status: 'failure' })
      expect(vi.getTimerCount()).toBe(1)
      coordinator.close()
      coordinator.onAvailability(notify)()
      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(notify).not.toHaveBeenCalled()
    }
    finally { vi.useRealTimers() }
  })

  it('notifies waiting work only after all foreground and background owners release, and unsubscribes cleanly', () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const notify = vi.fn()
    const unsubscribe = coordinator.onAvailability(notify)
    const background = coordinator.acquireOneShot({ source: 'dream' })
    const foreground = coordinator.openForeground({ turnId: 'host' })
    if (!background.accepted)
      throw new Error('Expected the original background owner')
    background.release({ status: 'cancelled' })
    expect(notify).not.toHaveBeenCalled()
    foreground.release()
    expect(notify).toHaveBeenCalledOnce()
    foreground.release()
    expect(notify).toHaveBeenCalledOnce()
    unsubscribe()
    const next = coordinator.acquireOneShot({ source: 'execution-planning' })
    if (next.accepted)
      next.release({ status: 'success' })
    expect(notify).toHaveBeenCalledOnce()
  })

  it('wakes waiting work at the actual backoff deadline and drains the owned timer on unsubscribe', async () => {
    vi.useFakeTimers()
    try {
      const coordinator = createAlicizationMainGatewayWorkCoordinator()
      const notify = vi.fn()
      const unsubscribe = coordinator.onAvailability(notify)
      const lease = coordinator.acquireOneShot({ source: 'dream' })
      if (!lease.accepted)
        throw new Error('Expected a background owner')
      lease.release({ status: 'failure' })
      expect(notify).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(59999)
      expect(notify).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(notify).toHaveBeenCalledOnce()
      const second = coordinator.acquireOneShot({ source: 'execution-planning' })
      if (second.accepted)
        second.release({ status: 'failure' })
      unsubscribe()
      expect(vi.getTimerCount()).toBe(0)
    }
    finally { vi.useRealTimers() }
  })

  it('keeps detached execution planning preemptible even when it inherits a foreground async scope', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const original = coordinator.openForeground({ turnId: 'original-admission' })
    await original.run(async () => {
      expect(coordinator.acquireOneShot({ source: 'execution-planning' })).toEqual({ accepted: false, lane: 'background', reason: 'foreground-active' })
      original.release()
      const planning = coordinator.acquireOneShot({ source: 'execution-planning' })
      expect(planning).toMatchObject({ accepted: true, lane: 'background' })
      if (!planning.accepted)
        throw new Error('The background planning lease was unavailable')
      const next = coordinator.openForeground({ turnId: 'new-user-message' })
      expect(planning.controller.signal.aborted).toBe(true)
      expect(isMainGatewayForegroundPreemption(planning.controller.signal.reason)).toBe(true)
      planning.release({ status: 'cancelled' })
      next.release()
    })
  })

  it('preempts background work and keeps nested foreground one-shots on the foreground lane', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const background = coordinator.acquireOneShot({
      source: 'proactive',
    })
    expect(background.accepted).toBe(true)
    if (!background.accepted)
      throw new Error('expected background lease')

    const foreground = coordinator.openForeground({
      turnId: 'turn-foreground',
    })

    expect(background.controller.signal.aborted).toBe(true)
    expect(isMainGatewayForegroundPreemption(background.controller.signal.reason)).toBe(true)
    expect(coordinator.acquireOneShot({
      source: 'dream',
    })).toEqual({
      accepted: false,
      lane: 'background',
      reason: 'foreground-active',
    })

    const nested = await foreground.run(async () => coordinator.acquireOneShot({
      source: 'counterfactual-deliberation',
    }))
    expect(nested).toEqual(expect.objectContaining({
      accepted: true,
      lane: 'foreground',
    }))
    if (nested.accepted)
      nested.release()

    background.release()
    foreground.release()
    expect(coordinator.snapshot()).toEqual({
      activeBackgroundSource: null,
      activeForegroundCount: 0,
    })
  })

  it('allows only one background provider request at a time without building a backlog', () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const first = coordinator.acquireOneShot({
      source: 'dream',
    })
    expect(first.accepted).toBe(true)

    expect(coordinator.acquireOneShot({
      source: 'proactive',
    })).toEqual({
      accepted: false,
      lane: 'background',
      reason: 'background-busy',
    })

    if (first.accepted)
      first.release()
    expect(coordinator.acquireOneShot({
      source: 'proactive',
    })).toEqual(expect.objectContaining({
      accepted: true,
      lane: 'background',
    }))
  })

  it('backs off background provider work after repeated failures without blocking foreground work', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const first = coordinator.acquireOneShot({
      source: 'counterfactual-deliberation',
    })
    expect(first.accepted).toBe(true)
    if (!first.accepted) {
      throw new Error('expected background lease')
    }(first.release as (outcome?: { status: string }) => void)({
      status: 'failure',
    })

    expect(coordinator.acquireOneShot({
      source: 'counterfactual-deliberation',
    })).toEqual(expect.objectContaining({
      accepted: false,
      lane: 'background',
      reason: 'background-backoff',
      retryAfterMs: expect.any(Number),
    }))

    const foreground = coordinator.openForeground({
      turnId: 'turn-during-background-backoff',
    })
    const nested = await foreground.run(async () => coordinator.acquireOneShot({
      source: 'counterfactual-deliberation',
    }))
    expect(nested).toEqual(expect.objectContaining({
      accepted: true,
      lane: 'foreground',
    }))
    if (nested.accepted)
      nested.release()
    foreground.release()
  })
})
