import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnContract } from './mind-turn-contract'
import { resolveAlicizationPreparedVisibleReplyExecution } from './visible-reply/facade'

describe('mind-turn-contract invariants', () => {
  it('keeps Provider authority when other execution surfaces disagree', () => {
    const contract = buildAlicizationMindTurnContract({
      expectedVisibleReplyAuthority: 'llm-mind',
      now: 120,
    })

    const resolved = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: contract,
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy',
        },
        runtimeSurface: {
          replyAuthority: {
            replyRealizationMode: 'provider-mind-required',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            whyProviderMindRequired: null,
          },
          replyExecutionPlan: {
            preferredMode: 'provider-one-shot',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            reason: 'legacy-runtime',
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
    })

    expect(contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(contract.replyRealizationMode).toBe('provider-mind-required')
    expect(resolved.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(resolved.mode).toBe('provider-stream')
  })
})
