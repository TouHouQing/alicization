import type { Message } from '@xsai/shared-chat'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMainChatRuntimeSurface,
  buildCardCustomDirectivesSystemBlock,
  buildTurnScopedPersonaKernelSystemBlock,
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
          dialogue: {
            openingGuidance: 'legacy cue must not be forwarded',
          },
          learning: {
            nextAction: 'legacy cue must not be forwarded',
          },
          governance: {
            guard: 'legacy cue must not be forwarded',
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
    organicMemorySystemBlocks: [],
    performanceManifestSystemBlocks: [],
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
  it('keeps user-authored card directives verbatim in full persona mode', () => {
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
    }))

    const directiveMessage = result.messages.find(message => message.role === 'system')
    expect(parseFact(directiveMessage?.content)).toEqual({
      type: 'alicization-persona-directives',
      data: {
        text: '优先诚实，不要臆测。',
      },
    })
    expect(String(result.messages[0]?.content)).not.toContain('high-priority persona kernel')
    expect(String(result.messages[0]?.content)).not.toContain('Apply these directives')
  })

  it('does not inject a persona pause fact when governance marks the persona backgrounded', () => {
    const block = buildTurnScopedPersonaKernelSystemBlock({
      mode: 'backgrounded',
      reason: 'task-or-direct-answer-obligation',
    })

    expect(block).toBe('')
  })

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

  it('collapses self state into one JSON fact with explicit memory owners', () => {
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

    const message = findFactMessage(result.messages, 'alicization-living-self')
    const fact = parseFact(message?.content)
    expect(fact.data.owners).toEqual({
      shortTermMemory: 'WorkingMemory',
      longTermRecall: 'LongTermMemoryRecall',
    })
    expect(fact.data.self).toMatchObject({
      durable: 'I am Alicization.',
      relationship: 'Stay honest with the host.',
      currentPreoccupation: 'I want to answer from the remembered thread.',
    })
    expect(fact.data.embodiment).toMatchObject({
      currentBodyState: 'lane=lipsync-only',
      continuityAuthority: 'identity-thread-active',
    })
    expect(fact.data.personMemoryCapsule).toEqual({
      identity: 'Alicization',
      selectedMemory: 'The host prefers direct answers.',
      emotion: 'quiet attention',
      execution: 'No pending tool result.',
      embodiment: 'lipsync-only',
    })
    expect(String(message?.content)).not.toContain('legacy cue must not be forwarded')
  })

  it('removes execution and perception prompt blocks from dialogue-first turns', () => {
    const runtimeSurface = createRuntimeSurface()
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      allowTools: true,
      waitForTools: true,
      runtimeCorePromptBlocks: ['{"type":"runtime-core","data":{}}'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]'],
      executionCapabilitySystemBlocks: ['[CAPABILITIES]'],
      performanceManifestSystemBlocks: ['[VESSEL]'],
      tools: [{ function: { name: 'executor_run_codex' } }],
      toolChoice: 'required',
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

    const promptText = result.messages.map(message => String(message.content ?? '')).join('\n')
    expect(promptText).not.toContain('[ALICIZATION_PERCEPTION]')
    expect(promptText).not.toContain('[ALICIZATION_VISUAL_PRESENCE]')
    expect(promptText).not.toContain('[CAPABILITIES]')
    expect(promptText).not.toContain('[VESSEL]')
    expect(result.tooling).toEqual({
      allowTools: false,
      waitForTools: false,
      enforcedToolNames: [],
      routingRequired: false,
    })
  })

  it('extracts host metadata and custom directives from SOUL-shaped messages', () => {
    const message = createSoulSystemMessage({
      customDirectives: '请先观察，再回答。',
      hostName: 'Asuna',
    })

    expect(extractCustomDirectivesFromMessages([message])).toBe('请先观察，再回答。')
    expect(extractHostNameFromMessages([message])).toBe('Asuna')
    expect(parseFact(buildCardCustomDirectivesSystemBlock('请先观察，再回答。'))).toEqual({
      type: 'alicization-persona-directives',
      data: {
        text: '请先观察，再回答。',
      },
    })
  })

  it('keeps only user SOUL and allowlisted JSON facts at the provider boundary', () => {
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
          type: 'alicization-long-term-memory-recall',
          data: { owner: 'LongTermMemoryRecall', evidence: [] },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-dialogue-session-mirror',
          data: { instruction: 'keep the same line' },
        }),
      },
      {
        role: 'system',
        content: '[ALICIZATION_PROJECT_STATE]\nKeep the project identity explicit.',
      },
      {
        role: 'user',
        content: '你好',
      },
    ]

    const filtered = filterAlicizationProviderSystemMessages(messages)

    expect(filtered).toHaveLength(5)
    expect(filtered[0]?.content).toContain('# SOUL')
    expect(parseFact(filtered[1]?.content).type).toBe('alicization-host')
    expect(parseFact(filtered[2]?.content).type).toBe('alicization-turn-memory-context')
    expect(parseFact(filtered[3]?.content).type).toBe('alicization-long-term-memory-recall')
    expect(filtered[4]?.content).toBe('你好')
    expect(filtered.some(message => String(message.content).includes('dialogue-session-mirror'))).toBe(false)
    expect(filtered.some(message => String(message.content).includes('PROJECT_STATE'))).toBe(false)
  })

  it('drops legacy typed project-state facts at the provider boundary', () => {
    const messages: Message[] = [
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-project-state-facts',
          data: {
            fields: {
              landed: 'Legacy canonical progress.',
              open: 'Legacy canonical open loop.',
              next: 'Legacy canonical next target.',
            },
          },
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
        role: 'user',
        content: '现在记忆链路怎么样？',
      },
    ]

    const filtered = filterAlicizationProviderSystemMessages(messages)

    expect(filtered).toHaveLength(2)
    expect(parseFact(filtered[0]?.content).type).toBe('alicization-turn-memory-context')
    expect(filtered[1]?.content).toBe('现在记忆链路怎么样？')
  })

  it('derives enforced tool names from a required filtered tool registry', () => {
    const result = buildAlicizationMainChatRuntimeSurface(createBaseInput({
      allowTools: true,
      waitForTools: true,
      hasVisualGrounding: true,
      tools: [
        { function: { name: 'executor_run_codex' } },
        { function: { name: 'executor_run_local_visual' } },
        { function: { name: 'executor_run_codex' } },
      ],
      toolChoice: 'required',
    }))

    expect(result.tooling.enforcedToolNames).toEqual([
      'executor_run_codex',
      'executor_run_local_visual',
    ])
    expect(result.tooling.routingRequired).toBe(true)
  })

  it('does not aggregate legacy life-subsystem prompt builders', () => {
    const source = readFileSync(new URL('./main-chat-runtime-surface.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /build(?:AutobiographicalSelf|HabitPolicy|LongHorizonMemory|MindEcology|MotiveEngine)SystemBlock/iu,
    )
    expect(source).not.toContain('describeAlicizationMainChatProviderMindRequirement')
    expect(source).toContain('buildAlicizationProviderFactBlock')
  })
})
