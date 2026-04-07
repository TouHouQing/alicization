import { describe, expect, it } from 'vitest'

import {
  AlicizationRuntimeCallChainTooDeepError,
  AlicizationRuntimeCircularCallError,
  createAlicizationRuntimeCallChain,
} from './runtime-call-chain'

describe('runtime call chain', () => {
  it('tracks nested runtime calls and preserves phase order', async () => {
    let now = 1_000
    const chain = createAlicizationRuntimeCallChain({
      getNow: () => now++,
    })

    const result = await chain.track('prepare-execution', async () => {
      return await chain.track('runtime-surface', async () => 'ok', {
        routed: true,
      })
    }, {
      turnId: 'turn-1',
    })

    expect(result).toBe('ok')
    expect(chain.snapshot()).toEqual({
      currentChain: [],
      currentDepth: 0,
      maxDepth: 12,
      phaseOrder: ['prepare-execution', 'runtime-surface'],
      history: [
        {
          callId: 'runtime-surface',
          depth: 1,
          startedAt: 1_001,
          finishedAt: 1_002,
          durationMs: 1,
          status: 'completed',
          metadata: {
            routed: true,
          },
          errorMessage: null,
        },
        {
          callId: 'prepare-execution',
          depth: 0,
          startedAt: 1_000,
          finishedAt: 1_003,
          durationMs: 3,
          status: 'completed',
          metadata: {
            turnId: 'turn-1',
          },
          errorMessage: null,
        },
      ],
    })
  })

  it('rejects circular runtime calls', async () => {
    const chain = createAlicizationRuntimeCallChain()

    await expect(chain.track('prepare-execution', async () => {
      await chain.track('prepare-execution', async () => {})
    })).rejects.toBeInstanceOf(AlicizationRuntimeCircularCallError)
  })

  it('rejects runtime chains beyond max depth', async () => {
    const chain = createAlicizationRuntimeCallChain({
      maxDepth: 1,
    })

    await expect(chain.track('outer', async () => {
      await chain.track('inner', async () => {})
    })).rejects.toBeInstanceOf(AlicizationRuntimeCallChainTooDeepError)
  })
})
