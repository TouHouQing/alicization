import { describe, expect, it } from 'vitest'

import {
  createAlicizationMainGatewayWorkCoordinator,
  isMainGatewayForegroundPreemption,
} from './main-gateway-work-coordinator'

describe('main gateway work coordinator', () => {
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
