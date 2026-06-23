import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'

describe('runtime card scope orchestrator', () => {
  it('serializes card-scope switches through the shared queue', async () => {
    let activeCardId = 'default'
    const steps: string[] = []
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({
      scopeLifecycleQueueState: {
        queue: Promise.resolve(),
      },
      now: (() => {
        let value = 0
        return () => ++value * 100
      })(),
      getActiveCardId: () => activeCardId,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      sanitizeText: raw => typeof raw === 'string' ? raw : '',
      appendRuntimeDebugLine: async () => {},
      switchCardScopeInner: async (nextCardIdRaw) => {
        const next = String(nextCardIdRaw)
        steps.push(`switch:${next}`)
        activeCardId = next
      },
    })

    await Promise.all([
      orchestrator.withCardScope('card-a', async () => {
        steps.push('task:a')
      }),
      orchestrator.withCardScope('card-b', async () => {
        steps.push('task:b')
      }),
    ])

    expect(steps).toEqual([
      'switch:card-a',
      'task:a',
      'switch:card-b',
      'task:b',
    ])
  })

  it('skips queueing when the requested card is already active and the option allows it', async () => {
    const activeCardId = 'default'
    const switchCardScopeInner = vi.fn(async () => {
      throw new Error('should not switch')
    })
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({
      scopeLifecycleQueueState: {
        queue: Promise.resolve(),
      },
      now: () => 1_000,
      getActiveCardId: () => activeCardId,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      sanitizeText: raw => typeof raw === 'string' ? raw : '',
      appendRuntimeDebugLine: async () => {},
      switchCardScopeInner,
    })

    let ran = false
    await orchestrator.withCardScope('default', async () => {
      ran = true
    }, {
      skipQueueWhenScopeAlreadyActive: true,
    })

    expect(ran).toBe(true)
    expect(switchCardScopeInner).not.toHaveBeenCalled()
    expect(activeCardId).toBe('default')
  })
})
