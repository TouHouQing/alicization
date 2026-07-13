import type {
  AlicizationSecondPassRetryInput,
  AlicizationSecondPassRewriteResult,
} from './second-pass-rewrite'

import { describe, expect, it, vi } from 'vitest'

import {
  AlicizationVisibleReplyClosureBlockedError,
  closeAlicizationVisibleReply,
} from './closure-orchestrator'

function createPrepared() {
  return {
    memoryContext: {
      version: 'alicization-main-chat-memory-context-v1',
      workingMemory: {
        version: 'working-memory-owner-context-v1',
      },
      longTermRecall: null,
      availableLongTermEvidenceIds: [],
      providerSystemBlock: '{}',
    },
    freshExecutionReplyCallback: {
      status: 'completed',
      toolName: 'read_file',
    },
    executionReplyObligation: null,
    executionPayoffStructuredReply: null,
    runtimeSurface: {
      digitalLifeRuntimeSurface: null,
    },
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

function createValidRetryResult(): AlicizationSecondPassRewriteResult {
  return {
    fullText: JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'answer directly',
      emotion: 'neutral',
      reply: '答案在这里。',
      performance: {
        baseEmotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: [],
      },
    }),
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

describe('visible reply closure orchestrator', () => {
  it('maps critic and settlement reasons to the finite second-pass reason code contract', async () => {
    const prepared = createPrepared()
    const rewriteSecondPass = vi.fn(async (_input: AlicizationSecondPassRetryInput): Promise<AlicizationSecondPassRewriteResult> => {
      return createValidRetryResult()
    })

    await closeAlicizationVisibleReply({
      draft: {
        fullText: '{"reply":""}',
        visibleReplyExecution: createExecution(),
      },
      prepared,
      forceRewrite: true,
      forceReasonCodes: [
        'provider-payload-json-invalid',
        'provider-memory-usage-invalid',
        'execution-follow-up-status-not-surfaced:completed',
        'semantic-judge:fixed-template-residue',
      ],
      rewriteSecondPass,
    })

    expect(rewriteSecondPass).toHaveBeenCalledOnce()
    expect(rewriteSecondPass.mock.calls[0]?.[0]).toEqual({
      candidate: '{"reply":""}',
      reasonCodes: [
        'schema_parse_failed',
        'memory_usage_claim_invalid',
        'tool_result_not_settled',
        'legacy_template_contamination',
        'required_field_missing',
      ],
      prepared,
      toolFacts: [
        {
          status: 'completed',
          toolName: 'read_file',
        },
      ],
    })
  })

  it('exposes only the structured-contract failure surface when the retry remains invalid', async () => {
    const rewriteSecondPass = vi.fn(async (_input: AlicizationSecondPassRetryInput): Promise<AlicizationSecondPassRewriteResult | null> => null)

    let thrown: unknown
    try {
      await closeAlicizationVisibleReply({
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

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplyClosureBlockedError)
    expect((thrown as AlicizationVisibleReplyClosureBlockedError).failureSurface).toMatchObject({
      kind: 'structured-contract',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })
})
