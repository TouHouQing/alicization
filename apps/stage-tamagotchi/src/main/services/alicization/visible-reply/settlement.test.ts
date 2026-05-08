import { describe, expect, it, vi } from 'vitest'

import { settleAlicizationVisibleReply } from './settlement'

describe('visible-reply settlement', () => {
  it('settles provider-authored visible replies with critic and realization in one artifact', async () => {
    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText: '{"reply":"我会先把这件事讲清楚。"}',
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: vi.fn(async () => null),
    })

    expect(result.visibleText).toBe('我会先把这件事讲清楚。')
    expect(result.realization.actualAuthority).toBe('llm-mind')
    expect(result.realization.critic?.status).toBe('pass')
    expect(result.realization.closure?.status).toBe('approved')
    expect(result.closureResult.closure.status).toBe('approved')
  })
})
