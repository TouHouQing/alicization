import type { Message } from '@xsai/shared-chat'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  AlicizationSecondPassStructuredContractError,
  rewriteAlicizationVisibleReplySecondPass,
} from './second-pass-rewrite'

function createPrepared() {
  const memoryContext = {
    version: 'alicization-main-chat-memory-context-v1',
    workingMemory: {
      version: 'working-memory-owner-context-v1',
      owner: 'working-memory',
      scope: {
        sessionId: 'session-1',
        turnId: 'turn-1',
      },
      current: {
        userText: '继续刚才的话题',
      },
      obligations: [],
      queryHints: [],
      audit: {},
    },
    longTermRecall: {
      owner: 'long-term-memory-recall',
      evidence: [
        {
          candidate: {
            id: 'memory-1',
          },
        },
      ],
    },
    availableLongTermEvidenceIds: ['memory-1'],
    providerSystemBlock: '{"type":"alicization-turn-memory-context"}',
  }

  return {
    chatConfig: {
      model: 'gpt-test',
    },
    memoryContext,
    personaKernel: {
      profile: {
        ownerName: 'TouHouQing',
        hostName: 'TouHouQing',
        alicizationName: 'Alice',
        gender: 'female',
        genderCustom: '',
        relationship: 'companion',
        mindAge: 20,
      },
      personality: {
        obedience: 0.5,
        liveliness: 0.5,
        sensibility: 0.5,
        identityKernel: null,
        expressionProfile: null,
        initiativeBaseline: null,
        evolutionSeed: null,
        identityAnchors: ['Alice'],
        antiPersonaConstraints: [],
      },
      personaWorkshop: null,
      hostReference: 'TouHouQing',
      temperamentSummary: 'steady',
      hostAttitudeSeed: '',
      coreIncarnationSeed: '',
      hostAttitude: '',
      coreIncarnation: '',
    },
    runtimeSurface: {
      digitalLifeSpine: null,
      digitalLifeRuntimeSurface: {
        world: {
          relationshipModel: {
            trust: 0.8,
          },
        },
        memory: {
          hostPersonModel: {
            name: 'TouHouQing',
          },
          emotionalKernel: {
            primary: 'calm',
          },
          affectiveResidue: {
            valence: 0.2,
          },
        },
      },
    },
    performanceManifest: null,
  } as any
}

function createProviderResponse(reply = '我记得刚才的话题，我们从这里继续。') {
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'continue from recalled context',
    emotion: 'neutral',
    reply,
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: 'working-memory-owner-context-v1',
      longTermEvidenceIds: ['memory-1'],
    },
  })
}

describe('visible reply second-pass retry', () => {
  it('sends only typed dynamic context and the original candidate with the shared response format', async () => {
    const prepared = createPrepared()
    const candidate = '{"format":"mind-turn-v1","reply":""}'
    const toolFacts = [
      {
        toolName: 'read_file',
        status: 'completed',
      },
    ]
    const providerResponse = createProviderResponse()
    const provider = vi.fn(async (_input: {
      chatConfig: Record<string, unknown>
      messages: Message[]
      responseFormat: unknown
      timeoutMs: number
    }) => ({
      finishReason: 'stop',
      fullText: providerResponse,
    }))

    const result = await (rewriteAlicizationVisibleReplySecondPass as any)({
      candidate,
      reasonCodes: ['schema_parse_failed'],
      prepared,
      toolFacts,
      provider,
    })

    expect(provider).toHaveBeenCalledOnce()
    const secondPassRequest = provider.mock.calls[0]?.[0]
    expect(secondPassRequest).toMatchObject({
      responseFormat: alicizationProviderResponseFormat,
    })
    expect(secondPassRequest?.messages).toHaveLength(2)
    expect(secondPassRequest?.messages[0]).toEqual(expect.objectContaining({
      role: 'system',
    }))
    expect(secondPassRequest?.messages[1]).toEqual({
      role: 'user',
      content: candidate,
    })

    const context = JSON.parse(String(secondPassRequest?.messages[0]?.content ?? '')) as Record<string, unknown>
    expect(context).toEqual(expect.objectContaining({
      type: 'alicization-second-pass-context',
      reasonCodes: ['schema_parse_failed'],
      memoryContext: prepared.memoryContext,
      toolFacts,
    }))
    expect(context).toHaveProperty('identityFacts')
    expect(context).toHaveProperty('relationshipFacts')
    expect(context).toHaveProperty('emotionFacts')
    expect(JSON.stringify(secondPassRequest?.messages)).not.toMatch(
      /rewrite|must preserve|same-her|project-state|reply posture|开场|结尾/iu,
    )
    expect(result.fullText).toBe(providerResponse)
    expect(result.rewritten).toBe(true)
  })

  it('calls the Provider at most once and never locally rewrites its reply', async () => {
    const providerResponse = createProviderResponse('这是 Provider 原样生成的回复。')
    const provider = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: providerResponse,
    }))

    const result = await (rewriteAlicizationVisibleReplySecondPass as any)({
      candidate: 'first candidate',
      reasonCodes: ['required_field_missing'],
      prepared: createPrepared(),
      toolFacts: [],
      provider,
    })

    expect(provider).toHaveBeenCalledOnce()
    expect(result.fullText).toBe(providerResponse)
    expect(JSON.parse(result.fullText)).toEqual(JSON.parse(providerResponse))
  })

  it('rejects an invalid retry result with a structured-contract failure surface', async () => {
    const provider = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '{"reply":""}',
    }))

    let thrown: unknown
    try {
      await (rewriteAlicizationVisibleReplySecondPass as any)({
        candidate: 'first candidate',
        reasonCodes: ['schema_parse_failed'],
        prepared: createPrepared(),
        toolFacts: [],
        provider,
      })
    }
    catch (error) {
      thrown = error
    }

    expect(provider).toHaveBeenCalledOnce()
    expect(thrown).toBeInstanceOf(AlicizationSecondPassStructuredContractError)
    expect((thrown as AlicizationSecondPassStructuredContractError).failureSurface).toMatchObject({
      kind: 'structured-contract',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })
})
