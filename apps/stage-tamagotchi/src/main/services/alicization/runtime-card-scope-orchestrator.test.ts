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

  it('keeps a foreground scope context when skipping the queue for an already active card', async () => {
    const activeCardId = 'default'
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({
      scopeLifecycleQueueState: {
        queue: Promise.resolve(),
      },
      now: () => 1_000,
      getActiveCardId: () => activeCardId,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      sanitizeText: raw => typeof raw === 'string' ? raw : '',
      appendRuntimeDebugLine: async () => {},
      switchCardScopeInner: async () => {
        throw new Error('should not switch')
      },
    })

    await orchestrator.withCardScope('default', async () => {
      const release = orchestrator.retainCurrentForegroundScope()
      release()
    }, {
      lane: 'foreground',
      skipQueueWhenScopeAlreadyActive: true,
      label: 'chat-start:default',
    })
  })

  it('does not execute an already-aborted active-card fast-path task', async () => {
    const activeCardId = 'default'
    const controller = new AbortController()
    controller.abort(new DOMException('cancelled before start', 'AbortError'))
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({
      scopeLifecycleQueueState: {
        queue: Promise.resolve(),
      },
      now: () => 1_000,
      getActiveCardId: () => activeCardId,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      sanitizeText: raw => typeof raw === 'string' ? raw : '',
      appendRuntimeDebugLine: async () => {},
      switchCardScopeInner: async () => {
        throw new Error('should not switch')
      },
    })

    let ran = false
    await expect(orchestrator.withCardScope('default', async () => {
      ran = true
    }, {
      lane: 'foreground',
      skipQueueWhenScopeAlreadyActive: true,
      signal: controller.signal,
    })).rejects.toThrow('cancelled before start')
    expect(ran).toBe(false)
  })

  it('does not execute a task cancelled while switching cards', async () => {
    let activeCardId = 'default'
    let releaseSwitch: (() => void) | undefined
    const switchGate = new Promise<void>((resolve) => {
      releaseSwitch = resolve
    })
    const controller = new AbortController()
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
        await switchGate
        activeCardId = String(nextCardIdRaw)
      },
    })

    let ran = false
    const task = orchestrator.withCardScope('card-a', async () => {
      ran = true
    }, {
      lane: 'background',
      signal: controller.signal,
    })

    await vi.waitFor(() => {
      expect(activeCardId).toBe('default')
    })
    controller.abort(new DOMException('cancelled during switch', 'AbortError'))
    releaseSwitch?.()

    await expect(task).rejects.toThrow('cancelled during switch')
    expect(ran).toBe(false)
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
    let resolveForegroundEntered: (() => void) | undefined
    let releaseForeground: (() => void) | undefined
    const foregroundEnteredGate = new Promise<void>((resolve) => {
      resolveForegroundEntered = resolve
    })
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
      await foregroundEnteredGate
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
      resolveForegroundEntered?.()
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

  it('runs a queued foreground scope request before later background card work', async () => {
    let activeCardId = 'default'
    const steps: string[] = []
    let releaseBackgroundA: (() => void) | undefined
    let releaseBackgroundB: (() => void) | undefined
    const backgroundGateA = new Promise<void>((resolve) => {
      releaseBackgroundA = resolve
    })
    const backgroundGateB = new Promise<void>((resolve) => {
      releaseBackgroundB = resolve
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

    const backgroundA = orchestrator.withCardScope('card-a', async () => {
      steps.push('background-a-start')
      await backgroundGateA
      steps.push('background-a-finish')
    }, {
      lane: 'background',
      label: 'subconscious:card-a',
    })

    await vi.waitFor(() => {
      expect(steps).toContain('background-a-start')
    })

    const backgroundB = orchestrator.withCardScope('card-b', async () => {
      steps.push('background-b-start')
      await backgroundGateB
      steps.push('background-b-finish')
    }, {
      lane: 'background',
      label: 'autonomy:card-b',
    })
    const foreground = orchestrator.withCardScope('default', async () => {
      steps.push('foreground-dialogue')
    }, {
      lane: 'foreground',
      label: 'dialogue-list-turns:default',
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(steps).toEqual(['background-a-start'])

    releaseBackgroundA?.()
    await vi.waitFor(() => {
      expect(steps).toContain('foreground-dialogue')
    })

    releaseBackgroundB?.()
    await Promise.all([backgroundA, backgroundB, foreground])

    expect(steps.indexOf('foreground-dialogue')).toBeLessThan(steps.indexOf('background-b-start'))
  })

  it('preempts a long-running background lease before switching to a different foreground card', async () => {
    let activeCardId = 'default'
    let backgroundStarted = false
    let backgroundCancelled = false
    let releaseBackground: (() => void) | undefined
    let foregroundStarted = false
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

    const background = orchestrator.withCardScope('card-a', async (context?: {
      signal?: AbortSignal
    }) => {
      backgroundStarted = true
      await new Promise<void>((resolve) => {
        releaseBackground = resolve
        context?.signal?.addEventListener('abort', () => {
          backgroundCancelled = true
          resolve()
        }, { once: true })
      })
    }, {
      lane: 'background',
      label: 'subconscious:card-a',
    })

    try {
      await vi.waitFor(() => {
        expect(backgroundStarted).toBe(true)
      })

      const foreground = orchestrator.withCardScope('card-b', async () => {
        foregroundStarted = true
      }, {
        lane: 'foreground',
        label: 'chat-start:card-b',
      })

      const foregroundCompleted = await Promise.race([
        foreground.then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500)),
      ])

      expect(foregroundCompleted).toBe(true)
      expect(backgroundCancelled).toBe(true)
      expect(foregroundStarted).toBe(true)
      expect(activeCardId).toBe('card-b')
      await foreground
    }
    finally {
      releaseBackground?.()
      await background
    }
  })

  it('releases a cancelled background lease before admitting the next foreground scope without polluting active card state', async () => {
    let activeCardId = 'default'
    let backgroundStarted = false
    let backgroundCancelled = false
    let releaseBackground: (() => void) | undefined
    const cancellationController = new AbortController()
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

    const background = orchestrator.withCardScope('card-a', async (context?: {
      signal?: AbortSignal
    }) => {
      backgroundStarted = true
      await new Promise<void>((resolve) => {
        releaseBackground = resolve
        context?.signal?.addEventListener('abort', () => {
          backgroundCancelled = true
          resolve()
        }, { once: true })
      })
    }, {
      lane: 'background',
      label: 'subconscious:card-a',
      signal: cancellationController.signal,
    })

    try {
      await vi.waitFor(() => {
        expect(backgroundStarted).toBe(true)
      })
      cancellationController.abort(new DOMException('background cancelled', 'AbortError'))

      const foreground = orchestrator.withCardScope('default', async () => {
        expect(activeCardId).toBe('default')
      }, {
        lane: 'foreground',
        label: 'chat-start:default',
      })

      const foregroundCompleted = await Promise.race([
        foreground.then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500)),
      ])

      expect(foregroundCompleted).toBe(true)
      expect(backgroundCancelled).toBe(true)
      expect(activeCardId).toBe('default')
      await foreground
    }
    finally {
      releaseBackground?.()
      await background
    }
  })

  it('keeps a detached foreground child in the same card scope after the outer task returns', async () => {
    let activeCardId = 'default'
    const steps: string[] = []
    let releaseDetachedScope: (() => void) | undefined
    let detachedTask: Promise<void> | undefined
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
        steps.push(`switch:${activeCardId}`)
      },
    })

    const outer = orchestrator.withCardScope('card-a', async () => {
      releaseDetachedScope = orchestrator.retainCurrentForegroundScope()
      detachedTask = Promise.resolve().then(async () => {
        await orchestrator.withCardScope('card-a', async () => {
          steps.push('detached-foreground-child')
        }, {
          label: 'chat-preparation:nested',
        })
      })
      steps.push('outer-returned')
    }, {
      lane: 'foreground',
      label: 'chat-start:card-a',
    })

    await outer
    await detachedTask

    expect(steps).toEqual([
      'switch:card-a',
      'outer-returned',
      'detached-foreground-child',
    ])
    expect(activeCardId).toBe('card-a')

    let backgroundStarted = false
    const background = orchestrator.withCardScope('card-b', async () => {
      backgroundStarted = true
    }, {
      lane: 'background',
      label: 'subconscious:card-b',
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(backgroundStarted).toBe(false)

    releaseDetachedScope?.()
    await background
    expect(backgroundStarted).toBe(true)
    expect(activeCardId).toBe('card-b')
  })

  it('fails fast instead of deadlocking when an active scope awaits a different card', async () => {
    let activeCardId = 'default'
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

    let nested!: Promise<void>
    const outer = orchestrator.withCardScope('card-a', async () => {
      nested = orchestrator.withCardScope('card-b', async () => {}, {
        lane: 'background',
        label: 'nested-cross-card',
      })
      const outcome = await Promise.race([
        nested.then(
          () => ({ status: 'completed' as const }),
          error => ({ status: 'rejected' as const, error }),
        ),
        new Promise<{ status: 'timed-out' }>(resolve => setTimeout(() => resolve({ status: 'timed-out' }), 50)),
      ])
      expect(outcome.status).toBe('rejected')
      if (outcome.status === 'rejected')
        expect(outcome.error).toMatchObject({ code: 'card-scope-cross-card-reentrancy' })
      expect(activeCardId).toBe('card-a')
    }, {
      lane: 'foreground',
      label: 'outer-card-a',
    })

    await outer
    await expect(nested).rejects.toMatchObject({
      code: 'card-scope-cross-card-reentrancy',
    })
  })

  it('gives queued background work a turn after a bounded foreground burst', async () => {
    let activeCardId = 'default'
    const steps: string[] = []
    let releaseFirstForeground: (() => void) | undefined
    const firstForegroundGate = new Promise<void>((resolve) => {
      releaseFirstForeground = resolve
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

    const firstForeground = orchestrator.withCardScope('card-a', async () => {
      steps.push('foreground-1')
      await firstForegroundGate
    }, {
      lane: 'foreground',
      label: 'foreground-1',
    })

    await vi.waitFor(() => {
      expect(steps).toEqual(['foreground-1'])
    })

    const queuedForeground = Array.from({ length: 5 }, (_, index) => orchestrator.withCardScope('card-a', async () => {
      steps.push(`foreground-${index + 2}`)
    }, {
      lane: 'foreground',
      label: `foreground-${index + 2}`,
    }))
    const queuedBackground = orchestrator.withCardScope('card-a', async () => {
      steps.push('background')
    }, {
      lane: 'background',
      label: 'background',
    })

    releaseFirstForeground?.()
    await Promise.all([firstForeground, ...queuedForeground, queuedBackground])

    expect(steps.indexOf('background')).toBeGreaterThan(steps.indexOf('foreground-4'))
    expect(steps.indexOf('background')).toBeLessThan(steps.indexOf('foreground-6'))
  })
})
