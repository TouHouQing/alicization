import type { AlicizationRuntimeReplyArtifact } from './reply-artifact'

import { describe, expect, it } from 'vitest'

import {
  createAlicizationRuntimeReplyArtifact,
  createAlicizationRuntimeReplyDeliveryIntent,
  parseAlicizationRuntimeReplyArtifact,
  parseAlicizationRuntimeReplyDeliveryIdentity,
} from './reply-artifact'

const scope = {
  turnId: 'turn-reply-artifact',
  cardId: 'card-1',
  userId: 'user-1',
  conversationId: 'conversation-1',
}

function replyArtifactInput(
  overrides: Partial<AlicizationRuntimeReplyArtifact> = {},
): AlicizationRuntimeReplyArtifact {
  return {
    artifactVersion: 1,
    visibleText: '可见回复',
    fullText: '  {"reply":"可见回复","thought":"保留原始字节"}  ',
    finishReason: 'stop',
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'turn-event-loop',
    },
    realization: {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: '可见回复',
      visibleReplyValidationStatus: 'approved',
      nonHumanAuthoredStatus: null,
      blockedReasons: [],
      reason: 'turn-event-loop',
      critic: {
        version: 'visible-reply-critic-public-summary-v1',
        status: 'pass',
        providerMindRequired: true,
        reasonCodes: [],
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'approved',
        reasonCodes: [],
        initialCriticStatus: 'pass',
        finalCriticStatus: 'pass',
      },
    },
    ...overrides,
  }
}

describe('runtime reply artifact', () => {
  it('preserves Provider fullText while hashing the complete committed artifact', () => {
    const artifact = createAlicizationRuntimeReplyArtifact(replyArtifactInput())
    const intent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      artifact,
    )

    expect(artifact.fullText).toBe('  {"reply":"可见回复","thought":"保留原始字节"}  ')
    expect(intent).toMatchObject({
      replyId: 'turn-reply-artifact:reply',
      deliveryId: 'turn-reply-artifact:delivery:inline',
      artifact,
      contentHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      artifactHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
    })

    const drifted = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      createAlicizationRuntimeReplyArtifact(replyArtifactInput({
        fullText: '{"reply":"可见回复","thought":"不同的原始输出"}',
      })),
    )
    expect(drifted.contentHash).toBe(intent.contentHash)
    expect(drifted.artifactHash).not.toBe(intent.artifactHash)
  })

  it('rejects realization text that differs from the published visible text', () => {
    const input = replyArtifactInput()
    const realization = input.realization as unknown as Record<string, unknown>

    expect(() => parseAlicizationRuntimeReplyArtifact({
      ...input,
      realization: {
        ...realization,
        visibleText: '另一条回复',
      },
    })).toThrow(/visibleText/i)
  })

  it('rejects execution and realization authority drift', () => {
    const input = replyArtifactInput()
    const realization = input.realization as unknown as Record<string, unknown>

    expect(() => parseAlicizationRuntimeReplyArtifact({
      ...input,
      realization: {
        ...realization,
        providerMindExecuted: false,
      },
    })).toThrow(/providerMindExecuted|execution/i)
    expect(() => parseAlicizationRuntimeReplyArtifact({
      ...input,
      visibleReplyExecution: {
        ...input.visibleReplyExecution,
        expectedVisibleReplyAuthority: null,
      },
    })).toThrow(/authority|execution/i)
  })

  it('keeps committed delivery payloads identity-only', () => {
    const artifact = createAlicizationRuntimeReplyArtifact(replyArtifactInput())
    const intent = createAlicizationRuntimeReplyDeliveryIntent(
      scope,
      'inline',
      artifact,
    )

    expect(() => parseAlicizationRuntimeReplyDeliveryIdentity(intent))
      .toThrow(/unknown field|artifact/i)
  })

  it('rejects incomplete or unapproved reply artifacts', () => {
    const input = replyArtifactInput()
    const realization = input.realization as Record<string, any>

    expect(() => parseAlicizationRuntimeReplyArtifact({
      ...input,
      finishReason: '',
    })).toThrow(/finishReason/i)
    expect(() => parseAlicizationRuntimeReplyArtifact({
      ...input,
      realization: {
        ...realization,
        closure: {
          ...realization.closure,
          status: 'blocked',
        },
      },
    })).toThrow(/closure|approved/i)
  })

  it.each([
    {
      label: 'local fallback execution mode',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        visibleReplyExecution: {
          ...input.visibleReplyExecution,
          mode: 'local-fallback',
        },
        realization: {
          ...input.realization,
          mode: 'local-fallback',
        },
      }),
    },
    {
      label: 'non-Provider authority',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        visibleReplyExecution: {
          ...input.visibleReplyExecution,
          actualVisibleReplyAuthority: 'non-human-authored-blocked',
        },
        realization: {
          ...input.realization,
          actualAuthority: 'non-human-authored-blocked',
        },
      }),
    },
    {
      label: 'Provider mind not executed',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        visibleReplyExecution: {
          ...input.visibleReplyExecution,
          providerMindExecuted: false,
        },
        realization: {
          ...input.realization,
          providerMindExecuted: false,
        },
      }),
    },
    {
      label: 'missing critic',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        realization: {
          ...input.realization,
          critic: null,
        },
      }),
    },
    {
      label: 'blocked critic',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        realization: {
          ...input.realization,
          critic: {
            version: 'visible-reply-critic-public-summary-v1',
            status: 'blocked',
            providerMindRequired: true,
            reasonCodes: ['blocked'],
          },
        },
      }),
    },
    {
      label: 'closure without a passing final critic',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        realization: {
          ...input.realization,
          closure: {
            ...input.realization.closure!,
            finalCriticStatus: 'blocked',
          },
        },
      }),
    },
    {
      label: 'blocked reasons',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        realization: {
          ...input.realization,
          blockedReasons: ['provider-authority-blocked'],
        },
      }),
    },
    {
      label: 'non-human authored status',
      mutate: (input: AlicizationRuntimeReplyArtifact) => ({
        ...input,
        realization: {
          ...input.realization,
          nonHumanAuthoredStatus: 'blocked',
        },
      }),
    },
  ])('rejects $label as a successful reply artifact', ({ mutate }) => {
    expect(() => parseAlicizationRuntimeReplyArtifact(
      mutate(replyArtifactInput()) as unknown,
    )).toThrow(/provider|critic|blocked|non-human|mode|authority/i)
  })
})
