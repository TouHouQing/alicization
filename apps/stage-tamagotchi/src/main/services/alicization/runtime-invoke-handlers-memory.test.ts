import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationMemoryWorkbenchManageSemanticScaleJobs,
} from '../../../shared/eventa'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'

describe('alicization memory invoke handlers', () => {
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
})
