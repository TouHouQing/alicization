import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMainGatewayWorkCoordinator } from '../main-gateway-work-coordinator'
import { createAlicizationRuntimeCardScopeOrchestrator } from '../runtime-card-scope-orchestrator'
import { createExecutionUserCommandScope } from './user-command-scope'

describe('actual host controls during background work', () => {
  it('releases foreground admission if preemption itself fails', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const scope = vi.fn()
    const settled = vi.fn()
    const command = createExecutionUserCommandScope({ coordinator, scope, entered: () => { throw new Error('preemption-failed') }, settled })
    await expect(command('alice', async () => true)).rejects.toThrow('preemption-failed')
    expect(scope).not.toHaveBeenCalled()
    expect(coordinator.snapshot().activeForegroundCount).toBe(0)
    expect(settled).toHaveBeenCalledOnce()
  })

  it('can stop or review a responsibility while the same card still holds its foreground dialogue scope', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({ scopeLifecycleQueueState: { queue: Promise.resolve() }, now: Date.now, getActiveCardId: () => 'alice', normalizeCardId: String, sanitizeText: value => String(value ?? ''), appendRuntimeDebugLine: async () => {}, switchCardScopeInner: async () => {} })
    let ready!: () => void
    let finish!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    const held = new Promise<void>((resolve) => { finish = resolve })
    const conversation = orchestrator.withCardScope('alice', async () => { ready(); await held }, { lane: 'foreground', label: 'long-dialogue' })
    await started
    const command = createExecutionUserCommandScope({ coordinator, scope: orchestrator.withCardScope, settled: () => {} })
    try { await expect(command('alice', async () => 'stop-request-recorded')).resolves.toBe('stop-request-recorded') }
    finally { finish(); await conversation }
    expect(coordinator.snapshot().activeForegroundCount).toBe(0)
  })

  it('preempts the background provider before acquiring its scope and always releases foreground admission', async () => {
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({ scopeLifecycleQueueState: { queue: Promise.resolve() }, now: Date.now, getActiveCardId: () => 'alice', normalizeCardId: String, sanitizeText: value => String(value ?? ''), appendRuntimeDebugLine: async () => {}, switchCardScopeInner: async () => {} })
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    const background = orchestrator.withCardScope('alice', async () => {
      const lease = coordinator.acquireOneShot({ source: 'counterfactual-deliberation' })
      if (!lease.accepted)
        throw new Error('Expected background admission')
      ready()
      try {
        await new Promise<void>((resolve) => { lease.controller.signal.addEventListener('abort', () => resolve(), { once: true }) })
      }
      finally { lease.release({ status: 'cancelled' }) }
    }, { lane: 'background', label: 'background-reflection' })
    await started
    const settled = vi.fn()
    const command = createExecutionUserCommandScope({ coordinator, scope: orchestrator.withCardScope, settled })
    await expect(command('alice', async () => {
      expect(coordinator.snapshot().activeForegroundCount).toBe(1)
      return 'review-recorded'
    })).resolves.toBe('review-recorded')
    await background
    expect(settled).toHaveBeenCalledOnce()
    await expect(command('alice', async () => { throw new Error('stale-artifact') })).rejects.toThrow('stale-artifact')
    expect(coordinator.snapshot().activeForegroundCount).toBe(0)
    expect(settled).toHaveBeenCalledTimes(2)
  })
})
