import type { AlicizationExecutionEventInput } from '@proj-alicization/stage-shared'

import type { ProviderUsage } from './provider-usage'
import type { ProviderAccounting, ProviderRequestStarted } from './provider-usage-ledger'

/** A CLI invocation is an aggregate, never an invented number of provider calls. */
export async function withExternalAgentUsage<T extends { thread: { status: string } }>(options: {
  accounting: ProviderAccounting
  request: ProviderRequestStarted
  signal?: AbortSignal
  task: (observe: (events: AlicizationExecutionEventInput[]) => void) => Promise<T>
}) {
  const records = new Map<string, ProviderUsage>()
  const observe = (events: AlicizationExecutionEventInput[]) => {
    for (const event of events) {
      const payload = event.payload
      if (event.channel !== 'codex' || payload?.codexEventType !== 'turn.completed' || typeof payload.executionRunId !== 'string' || !payload.providerUsage || typeof payload.providerUsage !== 'object')
        continue
      const value = payload.providerUsage as ProviderUsage
      // The adapter emits one terminal usage report per owned native run.
      if (!records.has(payload.executionRunId))
        records.set(payload.executionRunId, value)
    }
  }
  let settlement: 'completed' | 'failed' | 'aborted' = 'failed'
  await options.accounting.started(options.request)
  try {
    const result = await options.task(observe)
    settlement = result.thread.status === 'completed' ? 'completed' : result.thread.status === 'cancelled' ? 'aborted' : 'failed'
    return result
  }
  finally {
    const fields = ['inputTokens', 'outputTokens', 'totalTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens'] as const
    const usage = records.size ? Object.fromEntries(fields.map(field => [field, [...records.values()].every(value => value[field] !== null) ? [...records.values()].reduce((total, value) => total + value[field]!, 0) : null])) as unknown as ProviderUsage : null
    await options.accounting.settled({ ...options.request, finishedAt: Date.now(), settlement: options.signal?.aborted ? 'aborted' : settlement, usage })
  }
}
