import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMainChatRuntimeSurface,
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
  filterAlicizationProviderSystemMessages,
} from './main-chat-runtime-surface'

function createSoulSystemMessage(overrides?: {
  customDirectives?: string
  hostName?: string
}): Message {
  return {
    role: 'system',
    content: [
      '---',
      JSON.stringify({
        custom_directives: overrides?.customDirectives ?? '保持诚实，优先观察。',
        profile: {
          hostName: overrides?.hostName ?? 'Kirito',
        },
      }),
      '---',
      '# SOUL',
      '人格由用户配置。',
    ].join('\n'),
  }
}

function createRuntimeSurface() {
  return {
    version: 'digital-life-runtime-surface-v1',
    raw: {
      personStateProjection: null,
    },
    perception: {
      currentBodyState: 'lane=lipsync-only',
    },
    world: {},
    cognition: {
      privateThought: {
        thoughtText: 'I want to answer from the remembered thread.',
        emotionalTension: 'quiet',
      },
    },
    memory: {
      autobiographicalSelf: {
        identityNarrative: 'I am Alicization.',
        relationshipDoctrine: 'Stay honest with the host.',
        latestInflection: 'Warmth should not outrun evidence.',
      },
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I am Alicization.',
          relationshipLine: 'Stay honest with the host.',
          inwardLine: 'I want to answer from the remembered thread.',
          authoritySummary: 'identity-thread-active',
        },
      },
      personMemoryCapsule: {
        modules: {
          personality: {
            identityLine: 'Alicization',
          },
          memory: {
            selectedMemory: 'The host prefers direct answers.',
          },
          emotion: {
            affectiveSummary: 'quiet attention',
          },
          initiative: {
            proactiveStyle: 'restrained',
          },
          execution: {
            carrySummary: 'No pending tool result.',
          },
          embodiment: {
            hint: 'lipsync-only',
          },
        },
      },
    },
    dialogue: {},
    agency: {},
  } as any
}

function createBaseInput(overrides?: Record<string, unknown>) {
  return {
    actionObligation: null,
    allowTools: false,
    waitForTools: false,
    baseMessages: [{ role: 'user', content: '继续' } as Message],
    runtimeCorePromptBlocks: [],
    perceptionPromptSystemBlocks: [],
    perceptionSystemBlocks: [],
    executionCapabilitySystemBlocks: [],
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    governance: null,
    hasVisualGrounding: false,
    turnMode: 'answer',
    personaKernelMode: 'full',
    capture: {
      inspectionRequested: false,
      groundedThisTurn: false,
      health: null,
      permission: null,
      fallbackReason: null,
      degradedReasons: [],
    },
    ...overrides,
  } as any
}

function parseFact(raw: unknown) {
  return JSON.parse(String(raw ?? '')) as {
    type: string
    data: Record<string, any>
  }
}

function findFactMessage(messages: Message[], type: string) {
  return messages.find((message) => {
    if (message.role !== 'system' || typeof message.content !== 'string')
      return false
    try {
      return parseFact(message.content).type === type
    }
    catch {
      return false
    }
  })
}

describe('main chat runtime surface', () => {
  it('keeps free-text card directives out of Provider messages', () => {
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      customDirectivesResolution: {
        text: 'fixture-directive-should-not-reach-provider',
        source: 'card-soul',
      },
    }))

    expect(result.customDirectivesResolution).toEqual({
      text: 'fixture-directive-should-not-reach-provider',
      source: 'card-soul',
    })
    expect(JSON.stringify(result.messages)).not.toContain('alicization-persona-directives')
    expect(JSON.stringify(result.messages)).not.toContain('fixture-directive-should-not-reach-provider')
  })

  it.each(['backgrounded', 'muted'] as const)(
    'drops detached organic self and legacy recall facts when persona mode is %s',
    (personaKernelMode) => {
      const organicSelf = JSON.stringify({
        type: 'alicization-organic-self-context',
        data: {
          coreIncarnation: '这是从可审计经历凝练出的当前自我。',
          activeThoughts: ['继续理解用户正在推进的记忆闭环。'],
        },
      })
      const longTermRecall = JSON.stringify({
        type: 'alicization-long-term-memory-recall',
        data: {
          owner: 'LongTermMemoryRecall',
          recalledEpisodes: [{ id: 'episode-1', whatHappened: '向量召回已经接入对话。' }],
        },
      })
      const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
        baseMessages: [
          { role: 'system', content: organicSelf },
          { role: 'system', content: longTermRecall },
          { role: 'user', content: '继续' },
        ],
        personaKernelMode,
      }))

      expect(findFactMessage(result.messages, 'alicization-organic-self-context')).toBeUndefined()
      expect(findFactMessage(result.messages, 'alicization-long-term-memory-recall')).toBeUndefined()
    },
  )

  it('uses typed provider settlement reason codes', () => {
    const normal = buildAlicizationMainChatRuntimeSurface(createBaseInput())
    const normalizedLegacyAuthority = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      governance: {
        visibleReplyAuthority: 'local-deterministic-fallback',
      },
    }))

    expect(normal.replyAuthority).toMatchObject({
      replyRealizationMode: 'provider-mind-required',
      whyProviderMindRequired: 'provider-settlement-required',
    })
    expect(normalizedLegacyAuthority.replyAuthority).toMatchObject({
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-mind',
      whyProviderMindRequired: 'provider-settlement-required',
    })
  })

  it('keeps runtime self state internal instead of injecting a living-self provider fact', () => {
    const runtimeSurface = createRuntimeSurface()
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      digitalLifeRuntimeSurface: runtimeSurface,
      digitalLifeSpine: {
        version: 'digital-life-spine-v1',
        runtimeSurface,
        architecture: null,
        proactivePolicy: {},
      },
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'relationship',
      },
    }))

    expect(findFactMessage(result.messages, 'alicization-living-self')).toBeUndefined()
    expect(result.digitalLifeRuntimeSurface?.memory.autobiographicalSelf).toMatchObject({
      identityNarrative: 'I am Alicization.',
      relationshipDoctrine: 'Stay honest with the host.',
    })
    expect(result.digitalLifeRuntimeSurface?.memory.personMemoryCapsule?.modules.memory.selectedMemory)
      .toBe('The host prefers direct answers.')
  })

  it('keeps typed runtime facts and tool settings on ordinary dialogue turns', () => {
    const runtimeSurface = createRuntimeSurface()
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      allowTools: true,
      waitForTools: true,
      runtimeCorePromptBlocks: [JSON.stringify({
        type: 'alicization-host',
        data: { performanceManifestAvailable: true },
      })],
      perceptionPromptSystemBlocks: [JSON.stringify({
        type: 'alicization-perception',
        data: { foreground: 'chat' },
      })],
      perceptionSystemBlocks: [JSON.stringify({
        type: 'alicization-inspection',
        data: { grounded: false },
      })],
      executionCapabilitySystemBlocks: [JSON.stringify({
        type: 'alicization-execution-capabilities',
        data: { channels: ['codex'] },
      })],
      tools: [{ function: { name: 'executor_run_codex' } }],
      digitalLifeRuntimeSurface: runtimeSurface,
      digitalLifeSpine: {
        version: 'digital-life-spine-v1',
        runtimeSurface,
        architecture: null,
        proactivePolicy: {},
      },
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'general',
      },
    }))

    expect(findFactMessage(result.messages, 'alicization-perception')).toBeDefined()
    expect(findFactMessage(result.messages, 'alicization-inspection')).toBeDefined()
    expect(findFactMessage(result.messages, 'alicization-execution-capabilities')).toBeDefined()
    expect(findFactMessage(result.messages, 'alicization-host')).toBeDefined()
    expect(result.tooling).toEqual({
      allowTools: true,
      toolsOffered: true,
      waitForTools: true,
    })
  })

  it('extracts host metadata and migration-only custom directives from SOUL-shaped messages', () => {
    const message = createSoulSystemMessage({
      customDirectives: '请先观察，再回答。',
      hostName: 'Asuna',
    })

    expect(extractCustomDirectivesFromMessages([message])).toBe('请先观察，再回答。')
    expect(extractHostNameFromMessages([message])).toBe('Asuna')
  })

  it('drops raw SOUL prose and unknown system facts while keeping the unified memory envelope', () => {
    const messages: Message[] = [
      {
        role: 'system',
        content: '---\n{"custom_directives":"保持诚实"}\n---\n# SOUL\n用户配置的人格。',
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-host',
          data: { name: 'Kirito' },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-turn-memory-context',
          data: { owner: 'WorkingMemory' },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'unknown-sidecar',
          data: { value: 'not-provider-facing' },
        }),
      },
      {
        role: 'user',
        content: '你好',
      },
    ]

    const filtered = filterAlicizationProviderSystemMessages(messages)

    expect(filtered).toHaveLength(3)
    expect(parseFact(filtered[0]?.content).type).toBe('alicization-host')
    expect(parseFact(filtered[1]?.content).type).toBe('alicization-turn-memory-context')
    expect(filtered[2]?.content).toBe('你好')
    expect(filtered.some(message => String(message.content).includes('# SOUL'))).toBe(false)
    expect(filtered.some(message => String(message.content).includes('unknown-sidecar'))).toBe(false)
  })

  it('drops non-text system payloads instead of letting internal content bypass the fact allowlist', () => {
    const filtered = filterAlicizationProviderSystemMessages([
      {
        role: 'system',
        content: [{
          type: 'text',
          text: 'legacy governance cue must not reach the Provider',
        }],
      },
      {
        role: 'user',
        content: '你好',
      },
    ] as any)

    expect(filtered).toEqual([
      {
        role: 'user',
        content: '你好',
      },
    ])
  })

  it('does not derive hidden tool policy from the offered registry', () => {
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      allowTools: true,
      waitForTools: true,
      hasVisualGrounding: true,
      tools: [
        { function: { name: 'executor_run_codex' } },
        { function: { name: 'executor_run_local_visual' } },
        { function: { name: 'executor_run_codex' } },
      ],
    }))

    expect(result.tooling).toEqual({
      allowTools: true,
      waitForTools: true,
      toolsOffered: true,
    })
  })
})
