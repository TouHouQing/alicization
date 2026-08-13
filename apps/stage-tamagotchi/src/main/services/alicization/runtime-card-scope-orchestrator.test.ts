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

  it('lets a foreground task enter after a background switch is ready without waiting for the background task', async () => {
    let activeCardId = 'default'
    const steps: string[] = []
    let releaseSwitch: (() => void) | undefined
    let releaseBackground: (() => void) | undefined
    const switchGate = new Promise<void>((resolve) => {
      releaseSwitch = resolve
    })
    const backgroundGate = new Promise<void>((resolve) => {
      releaseBackground = resolve
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
      switchCardScopeInner: async (nextCardIdRaw) => {
        const next = String(nextCardIdRaw)
        steps.push(`switch-start:${next}`)
        await switchGate
        activeCardId = next
        steps.push(`switch-complete:${next}`)
      },
    })

    const backgroundPromise = orchestrator.withCardScope('card-a', async () => {
      steps.push('background-start')
      await backgroundGate
      steps.push('background-finish')
    }, {
      lane: 'background',
    })

    await vi.waitFor(() => {
      expect(steps).toContain('switch-start:card-a')
    })

    const foregroundPromise = orchestrator.withCardScope('card-a', async () => {
      steps.push('foreground')
    }, {
      lane: 'foreground',
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(steps).toEqual(['switch-start:card-a'])

    releaseSwitch?.()
    await foregroundPromise

    expect(steps).toContain('switch-complete:card-a')
    expect(steps).toContain('background-start')
    expect(steps).toContain('foreground')
    expect(steps).not.toContain('background-finish')

    releaseBackground?.()
    await backgroundPromise
    expect(steps).toContain('background-finish')
  })

  it('keeps a cancelled background lease pending until foreground chat startup hands it back', async () => {
    let activeCardId = 'default'
    let foregroundEntered = false
    let releaseForeground: (() => void) | undefined
    const foregroundGate = new Promise<void>((resolve) => {
      releaseForeground = resolve
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
      switchCardScopeInner: async (nextCardIdRaw) => {
        activeCardId = String(nextCardIdRaw)
      },
    })

    const backgroundPromise = orchestrator.withCardScope('default', async () => {
      while (!foregroundEntered)
        await new Promise(resolve => setTimeout(resolve, 0))
    }, {
      lane: 'background',
      label: 'dream:test',
    })

    await vi.waitFor(() => {
      expect(foregroundEntered).toBe(false)
    })

    let backgroundSettled = false
    void backgroundPromise.then(() => {
      backgroundSettled = true
    })

    const foregroundPromise = orchestrator.withCardScope('default', async () => {
      foregroundEntered = true
      await foregroundGate
    }, {
      lane: 'foreground',
      label: 'chat-start:default',
    })

    await vi.waitFor(() => {
      expect(foregroundEntered).toBe(true)
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(backgroundSettled).toBe(false)

    releaseForeground?.()
    await foregroundPromise
    await backgroundPromise
    expect(backgroundSettled).toBe(true)
  })
})
