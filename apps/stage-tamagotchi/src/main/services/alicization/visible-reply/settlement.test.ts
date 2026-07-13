import type {
  AlicizationSecondPassRetryInput,
  AlicizationSecondPassRewriteResult,
} from './second-pass-rewrite'

import { describe, expect, it, vi } from 'vitest'

import {
  AlicizationVisibleReplySettlementBlockedError,
  settleAlicizationVisibleReply,
  validateAlicizationProviderMemoryUsage,
} from './settlement'

function createPrepared() {
  return {
    hasVisualGrounding: false,
    memoryContext: {
      version: 'alicization-main-chat-memory-context-v1',
      workingMemory: {
        version: 'working-memory-owner-context-v1',
      },
      longTermRecall: null,
      availableLongTermEvidenceIds: ['memory-1'],
      providerSystemBlock: '{}',
    },
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
      digitalLifeRuntimeSurface: null,
      replyAuthority: null,
      replyExecutionPlan: null,
    },
    governance: {
      visibleReplyAuthority: 'llm-mind',
    },
    freshExecutionReplyCallback: null,
    executionReplyObligation: null,
    executionPayoffStructuredReply: null,
  } as any
}

function createExecution() {
  return {
    mode: 'provider-stream' as const,
    expectedVisibleReplyAuthority: 'llm-mind' as const,
    actualVisibleReplyAuthority: 'llm-mind' as const,
    providerMindExecuted: true,
    reason: 'provider-stream',
  }
}

function createProviderPayload(input?: {
  reply?: string
  workingMemoryVersion?: string
  longTermEvidenceIds?: string[]
}) {
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'answer directly',
    emotion: 'neutral',
    reply: input?.reply ?? '答案在这里。',
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: input?.workingMemoryVersion ?? 'working-memory-owner-context-v1',
      longTermEvidenceIds: input?.longTermEvidenceIds ?? [],
    },
  })
}

function createRewriteResult(fullText: string): AlicizationSecondPassRewriteResult {
  return {
    fullText,
    visibleReplyExecution: {
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    },
    rewritten: true,
    reason: 'visible-reply-second-pass-rewrite',
    audit: null,
  }
}

describe('visible-reply settlement', () => {
  it('validates Provider memory claims against the prepared owner context', () => {
    const prepared = createPrepared()

    expect(validateAlicizationProviderMemoryUsage({
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-1'],
      },
      prepared,
    })).toEqual({
      valid: true,
      workingMemoryVersionMatches: true,
      unknownEvidenceIds: [],
    })

    expect(validateAlicizationProviderMemoryUsage({
      memoryUsage: {
        workingMemoryVersion: 'stale-version',
        longTermEvidenceIds: ['unknown-memory'],
      },
      prepared,
    })).toEqual({
      valid: false,
      workingMemoryVersionMatches: false,
      unknownEvidenceIds: ['unknown-memory'],
    })
  })

  it('uses one typed data-only retry to repair an invalid memory claim', async () => {
    const prepared = createPrepared()
    const invalidCandidate = createProviderPayload({
      workingMemoryVersion: 'stale-version',
      longTermEvidenceIds: ['unknown-memory'],
    })
    const repaired = createProviderPayload({
      reply: '修复后的答案。',
      longTermEvidenceIds: ['memory-1'],
    })
    const rewriteSecondPass = vi.fn(async (
      _input: AlicizationSecondPassRetryInput,
    ): Promise<AlicizationSecondPassRewriteResult> => createRewriteResult(repaired))

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText: invalidCandidate,
        visibleReplyExecution: createExecution(),
      },
      prepared,
      requireProviderMemoryUsage: true,
      rewriteSecondPass,
    })

    expect(result.visibleText).toBe('修复后的答案。')
    expect(rewriteSecondPass).toHaveBeenCalledOnce()
    expect(rewriteSecondPass.mock.calls[0]?.[0]).toEqual({
      candidate: invalidCandidate,
      reasonCodes: ['memory_usage_claim_invalid'],
      prepared,
      toolFacts: [],
    })
  })

  it('keeps a valid Provider reply unchanged and does not invoke retry', async () => {
    const fullText = createProviderPayload({
      reply: 'Provider 原样回答。',
      longTermEvidenceIds: ['memory-1'],
    })
    const rewriteSecondPass = vi.fn(async (
      _input: AlicizationSecondPassRetryInput,
    ): Promise<AlicizationSecondPassRewriteResult | null> => null)

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText,
        visibleReplyExecution: createExecution(),
      },
      prepared: createPrepared(),
      requireProviderMemoryUsage: true,
      rewriteSecondPass,
    })

    expect(result.fullText).toBe(fullText)
    expect(result.visibleText).toBe('Provider 原样回答。')
    expect(rewriteSecondPass).not.toHaveBeenCalled()
  })

  it('returns the structured-contract failure surface when retry cannot settle', async () => {
    const rewriteSecondPass = vi.fn(async (
      _input: AlicizationSecondPassRetryInput,
    ): Promise<AlicizationSecondPassRewriteResult | null> => null)

    let thrown: unknown
    try {
      await settleAlicizationVisibleReply({
        draft: {
          fullText: '{"reply":""}',
          visibleReplyExecution: createExecution(),
        },
        prepared: createPrepared(),
        forceRewrite: true,
        forceReasonCodes: ['provider-payload-json-invalid'],
        rewriteSecondPass,
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplySettlementBlockedError)
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).failureSurface).toMatchObject({
      kind: 'structured-contract',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })
})
