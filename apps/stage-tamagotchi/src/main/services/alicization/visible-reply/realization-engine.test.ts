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
    expect(realization.visibleText).toBeNull()
    expect(realization.nonHumanAuthoredStatus).toBe('timeout-recovered-local-fallback')
    expect(realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('does not expose local fallback fullText as visible speech', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这轮先别继续伪装成正常心智回复。"}',
      visibleReplyExecution: {
        mode: 'local-fallback',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
        reason: 'timeout-recovered-local-fallback',
      },
    })

    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.visibleText).toBeNull()
    expect(resolved.realization.blockedReasons).toContain('non-human-authored-visible-fallback')
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
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'pass',
        providerMindRequired: true,
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
        },
        reasonCodes: [],
        repairReasonCodes: [],
        mustDrop: [],
        mustPreserve: [],
      },
    })

    expect(resolved.visibleText).toBe('先回答你真正关心的点。')
    expect(resolved.realization.providerMindExecuted).toBe(true)
    expect(resolved.realization.nonHumanAuthoredStatus).toBeNull()
    expect(resolved.realization.critic?.status).toBe('pass')
  })

  it('downgrades provider-mode replies to infra fallback when provider mind did not execute', () => {
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
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      mode: 'provider-stream',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: false,
      reason: 'provider-stream-no-mind-output',
    })

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这句不能作为正常可见回复。"}',
      visibleReplyExecution: execution,
    })

    expect(execution.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(execution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('normalizes requested local authority to provider second-pass when provider mind executed', () => {
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
      mode: 'provider-stream',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: true,
      reason: 'legacy-authority-normalization',
    })

    expect(execution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(execution.actualVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })
})
