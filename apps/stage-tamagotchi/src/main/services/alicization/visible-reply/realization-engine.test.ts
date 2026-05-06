import { describe, expect, it } from 'vitest'

import {
  buildAlicizationResolvedVisibleReply,
  buildAlicizationVisibleReplyRealizationArtifact,
  resolveAlicizationPreparedVisibleReplyExecution,
} from './realization-engine'

describe('visible-reply-realization-engine', () => {
  it('marks local fallback visible text as non-human-authored', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'local-deterministic-fallback',
        },
      } as any,
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'timeout-recovered-local-fallback',
    })

    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: '{"reply":"这轮先别继续伪装成正常心智回复。"}',
      visibleReplyExecution: execution,
    })

    expect(realization.actualAuthority).toBe('local-deterministic-fallback')
    expect(realization.nonHumanAuthoredStatus).toBe('timeout-recovered-local-fallback')
    expect(realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('resolves visible text from structured payloads while preserving realization metadata', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"先回答你真正关心的点。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
    })

    expect(resolved.visibleText).toBe('先回答你真正关心的点。')
    expect(resolved.realization.providerMindExecuted).toBe(true)
    expect(resolved.realization.nonHumanAuthoredStatus).toBeNull()
  })
})
