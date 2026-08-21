import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationMemoryWorkbenchCancelQualityTrial,
  electronAlicizationMemoryWorkbenchManageSemanticScaleJobs,
  electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue,
  electronAlicizationMemoryWorkbenchRunQualityTrial,
} from '../../../shared/eventa'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'

describe('alicization memory invoke handlers', () => {
  it('propagates quality trial cancellation to the active card controller', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    let resolveStarted: (() => void) | undefined
    let observedSignal: AbortSignal | undefined
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve
    })
    const runMemoryWorkbenchProductionTrial = vi.fn(async (input: {
      signal?: AbortSignal
    }) => {
      observedSignal = input.signal
      resolveStarted?.()
      await new Promise<void>((resolve) => {
        input.signal?.addEventListener('abort', () => resolve(), { once: true })
      })
      return { id: 'cancelled-quality-trial' }
    })

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        runMemoryWorkbenchProductionTrial,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const runPromise = handlers.get(electronAlicizationMemoryWorkbenchRunQualityTrial)?.({
      cardId: 'card-a',
      mode: 'live-provider',
      sessionId: 'session-a',
    })
    await started

    const cancelResult = await handlers.get(electronAlicizationMemoryWorkbenchCancelQualityTrial)?.({
      cardId: 'card-a',
      reason: 'user cancelled quality trial',
    })

    expect(cancelResult).toEqual({
      cardId: 'card-a',
      cancelled: true,
      reason: 'user cancelled quality trial',
    })
    expect(observedSignal?.aborted).toBe(true)
    await expect(runPromise).resolves.toEqual({ id: 'cancelled-quality-trial' })
  })

  it('routes semantic scale job controls through the active card DB facade', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    const manageMemoryWorkbenchSemanticScaleJobs = vi.fn(async (payload: {
      cardId: string
      jobId?: string
      tier?: string
    }) => ({
      job: {
        jobId: payload.jobId ?? 'semantic-job-1',
        cardId: payload.cardId,
        tier: payload.tier ?? '10k',
        status: 'queued',
      },
      jobs: [],
    }))

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        manageMemoryWorkbenchSemanticScaleJobs,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const handler = handlers.get(electronAlicizationMemoryWorkbenchManageSemanticScaleJobs)
    expect(handler).toBeDefined()

    await handler?.({
      cardId: 'card-a',
      action: 'start',
      tier: '100k',
      reason: 'run production scale',
      limit: 30,
    })

    expect(manageMemoryWorkbenchSemanticScaleJobs).toHaveBeenCalledWith({
      cardId: 'card-a',
      action: 'start',
      jobId: undefined,
      tier: '100k',
      reason: 'run production scale',
      limit: 30,
    })
  })

  it('sanitizes and routes WorkingMemory cleaning failure listing and retry actions', async () => {
    const handlers = new Map<unknown, (payload: Record<string, any>) => Promise<unknown>>()
    const manageMemoryWorkbenchWorkingMemoryCleaningQueue = vi.fn(async () => ({
      items: [],
      nextCursor: null,
      retried: [],
    }))

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        manageMemoryWorkbenchWorkingMemoryCleaningQueue,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const handler = handlers.get(electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue)
    expect(handler).toBeDefined()

    await handler?.({
      cardId: 'card-a',
      action: 'retry-dead-letter',
      itemIds: [' wm-lt-clean:one ', '', 'wm-lt-clean:two'],
      cursor: ' 3000:wm-lt-clean:cursor ',
      limit: 24,
    })

    expect(manageMemoryWorkbenchWorkingMemoryCleaningQueue).toHaveBeenCalledWith({
      cardId: 'card-a',
      action: 'retry-dead-letter',
      itemIds: ['wm-lt-clean:one', 'wm-lt-clean:two'],
      cursor: '3000:wm-lt-clean:cursor',
      limit: 24,
    })
  })
})
