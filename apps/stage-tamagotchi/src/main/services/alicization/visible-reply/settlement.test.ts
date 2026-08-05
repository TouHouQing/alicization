import { describe, expect, it } from 'vitest'

import {
  AlicizationVisibleReplySettlementBlockedError,
  settleAlicizationVisibleReply,
  validateAlicizationProviderMemoryUsage,
  validateAlicizationProviderSettlementPayload,
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
    executionPayoffStructuredReply: null,
  } as any
}

function createExecution(overrides?: Partial<any>) {
  return {
    mode: 'provider-stream' as const,
    expectedVisibleReplyAuthority: 'llm-mind' as const,
    actualVisibleReplyAuthority: 'llm-mind' as const,
    providerMindExecuted: true,
    reason: 'provider-stream',
    ...overrides,
  }
}

function createProviderPayload(input?: {
  reply?: string
  workingMemoryVersion?: string
  longTermEvidenceIds?: string[]
  extra?: Record<string, unknown>
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
    ...input?.extra,
  })
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

  it('fails closed on an invalid memory claim without asking another Provider response to rewrite it', async () => {
    const prepared = createPrepared()
    const invalidCandidate = createProviderPayload({
      workingMemoryVersion: 'stale-version',
      longTermEvidenceIds: ['unknown-memory'],
    })

    let thrown: unknown
    try {
      await settleAlicizationVisibleReply({
        draft: {
          fullText: invalidCandidate,
          visibleReplyExecution: createExecution(),
        },
        prepared,
        requireProviderMemoryUsage: true,
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplySettlementBlockedError)
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).message).toContain(
      'provider-memory-usage-invalid',
    )
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).failureSurface).toMatchObject({
      kind: 'provider-output-invalid',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })

  it.each([
    {
      label: 'provider mind was not executed',
      execution: createExecution({
        providerMindExecuted: false,
      }),
    },
    {
      label: 'local fallback authority produced the reply',
      execution: createExecution({
        mode: 'local-fallback',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
      }),
    },
  ])('fails closed when $label', async ({ execution }) => {
    let thrown: unknown
    try {
      await settleAlicizationVisibleReply({
        draft: {
          fullText: createProviderPayload({
            longTermEvidenceIds: ['memory-1'],
          }),
          visibleReplyExecution: execution,
        },
        prepared: createPrepared(),
        requireProviderMemoryUsage: true,
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplySettlementBlockedError)
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).message).toContain(
      'provider-visible-reply-authority-invalid',
    )
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).failureSurface).toMatchObject({
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })

  it('does not synthesize performance or memory claims when the prepared owner context is missing', () => {
    const prepared = {
      ...createPrepared(),
      memoryContext: null,
    }
    const validation = validateAlicizationProviderSettlementPayload({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'answer directly',
        emotion: 'neutral',
        reply: 'Provider 原样回答。',
      }),
      prepared,
    })

    expect(validation.valid).toBe(false)
    expect(validation.payload).toBeNull()
    expect(validation.issues).toEqual(expect.arrayContaining([
      'provider-payload-performance-invalid',
      'provider-memory-usage-invalid',
    ]))
  })

  it('accepts Provider-authored wording without applying a legacy template blacklist', async () => {
    const fullText = createProviderPayload({
      reply: '我记得上次你让我先说明失败原因。',
      longTermEvidenceIds: ['memory-1'],
    })

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText,
        visibleReplyExecution: createExecution(),
      },
      prepared: createPrepared(),
      requireProviderMemoryUsage: true,
    })

    expect(result.fullText).toBe(fullText)
    expect(result.visibleText).toBe('我记得上次你让我先说明失败原因。')
  })

  it('accepts Provider-authored plain text without inventing long-term evidence claims', async () => {
    const fullText = '我可以先直接回答你，不需要模型支持原生 JSON schema。'

    const validation = validateAlicizationProviderSettlementPayload({
      fullText,
      prepared: createPrepared(),
      allowPlainTextProviderReply: true,
    })
    expect(validation.valid).toBe(true)
    expect(validation.payload).toMatchObject({
      reply: fullText,
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: [],
      },
    })

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText,
        visibleReplyExecution: createExecution(),
      },
      prepared: createPrepared(),
      requireProviderMemoryUsage: true,
      allowPlainTextProviderReply: true,
    })

    expect(result.fullText).toBe(fullText)
    expect(result.visibleText).toBe(fullText)
    expect(result.realization.visibleText).toBe(fullText)
  })

  it.each([
    'parsePath',
    'contractFailed',
    'visibleReplyAuthority',
    'unknownSidecar',
    'runtimeDigest',
    'visibleReplyRealization',
    'visibleReplyRewriteRequest',
  ])('rejects the extra top-level Provider field %s', (field) => {
    const validation = validateAlicizationProviderSettlementPayload({
      fullText: createProviderPayload({
        longTermEvidenceIds: ['memory-1'],
        extra: {
          [field]: field === 'contractFailed' ? false : {},
        },
      }),
      prepared: createPrepared(),
    })

    expect(validation.valid).toBe(false)
    expect(validation.payload).toBeNull()
    expect(validation.issues).toContain('provider-payload-fields-invalid')
  })

  it('keeps the Provider JSON byte-for-byte and exposes only an observational realization sidecar', async () => {
    const fullText = `{
  "memoryUsage": {
    "longTermEvidenceIds": ["memory-1"],
    "workingMemoryVersion": "working-memory-owner-context-v1"
  },
  "performance": {
    "emphasis": 1,
    "delivery": "firm",
    "actionCue": null,
    "facialCue": null,
    "baseEmotion": "thinking"
  },
  "reply": "  Provider 原样回答。  ",
  "emotion": "thinking",
  "thought": "keep the Provider thought exactly",
  "format": "mind-turn-v1"
}`
    const prepared = createPrepared()
    prepared.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      updatedAt: 1,
    }

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText,
        visibleReplyExecution: createExecution(),
      },
      prepared,
      requireProviderMemoryUsage: true,
    })

    expect(result.fullText).toBe(fullText)
    expect(JSON.parse(result.fullText)).toEqual(JSON.parse(fullText))
    expect(result.visibleText).toBe('  Provider 原样回答。  ')
    expect(result.realization).toMatchObject({
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: '  Provider 原样回答。  ',
      nonHumanAuthoredStatus: null,
      blockedReasons: [],
      reason: 'provider-stream',
    })
    expect(result.realization.critic?.status).toBe('pass')
    expect(result.realization.closure?.status).toBe('approved')
  })

  it('returns the provider output failure surface when validation cannot settle', async () => {
    let thrown: unknown
    try {
      await settleAlicizationVisibleReply({
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

    expect(thrown).toBeInstanceOf(AlicizationVisibleReplySettlementBlockedError)
    expect((thrown as AlicizationVisibleReplySettlementBlockedError).failureSurface).toMatchObject({
      kind: 'provider-output-invalid',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })
})
