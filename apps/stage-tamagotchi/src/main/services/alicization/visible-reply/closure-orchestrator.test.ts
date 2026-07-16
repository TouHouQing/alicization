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

describe('visible reply closure orchestrator', () => {
  it('blocks an invalid first Provider reply without requiring second-pass reauthoring', async () => {
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
      kind: 'structured-contract',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })

  it('never invokes a legacy second-pass callback after validation blocks the first reply', async () => {
    const rewriteSecondPass = vi.fn()

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
    expect(rewriteSecondPass).not.toHaveBeenCalled()
    expect((thrown as AlicizationVisibleReplyClosureBlockedError).closure.reasonCodes)
      .toContain('provider-payload-json-invalid')
  })
})
