import { describe, expect, it } from 'vitest'

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

describe('visible reply closure orchestrator', () => {
  it('blocks an invalid Provider reply without requesting a second authored reply', async () => {
    const prepared = createPrepared()
    let thrown: unknown
    try {
      await closeAlicizationVisibleReply({
        draft: {
          fullText: '{"reply":""}',
          visibleReplyExecution: createExecution(),
        },
        prepared,
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplyClosureBlockedError)
    expect((thrown as AlicizationVisibleReplyClosureBlockedError).closure).toMatchObject({
      status: 'blocked',
    })
    expect(
      (thrown as AlicizationVisibleReplyClosureBlockedError).closure,
    ).not.toHaveProperty('rewriteAttempted')
    expect(
      (thrown as AlicizationVisibleReplyClosureBlockedError).closure,
    ).not.toHaveProperty('rewriteSucceeded')
    expect((thrown as AlicizationVisibleReplyClosureBlockedError).closure.reasonCodes)
      .toContain('structured-payload-visible-reply')
  })

  it('exposes only the provider output failure surface when validation fails', async () => {
    let thrown: unknown
    try {
      await closeAlicizationVisibleReply({
        draft: {
          fullText: '{"reply":""}',
          visibleReplyExecution: createExecution(),
        },
        prepared: createPrepared(),
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplyClosureBlockedError)
    expect((thrown as AlicizationVisibleReplyClosureBlockedError).failureSurface).toMatchObject({
      kind: 'provider-output-invalid',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })

  it('marks the first Provider reply approved without repair telemetry', async () => {
    const result = await closeAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'Obligation: answer. Truth: grounded. Focus: current turn. Move: answer. Tone: warm.',
          emotion: 'neutral',
          reply: '首个 Provider 回复直接通过。',
        }),
        visibleReplyExecution: createExecution(),
      },
      prepared: createPrepared(),
    })

    expect(result?.closure.status).toBe('approved')
    expect(result?.closure).not.toHaveProperty('rewriteAttempted')
    expect(result?.closure).not.toHaveProperty('rewriteSucceeded')
  })
})
