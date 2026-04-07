import type { Message } from '@xsai/shared-chat'

import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMainChatRuntimeSurface,
  buildCardCustomDirectivesSystemBlock,
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'

function createSoulSystemMessage(overrides?: {
  customDirectives?: string
  hostName?: string
}): Message {
  const customDirectives = overrides?.customDirectives ?? '保持诚实，优先观察。'
  const hostName = overrides?.hostName ?? 'Kirito'
  return {
    role: 'system',
    content: [
      '---',
      JSON.stringify({
        schemaVersion: 2,
        initialized: true,
        custom_directives: customDirectives,
        host_attitude: '礼貌而克制，保持观察',
        core_incarnation: '',
        profile: {
          ownerName: 'Alice',
          hostName,
          alicizationName: 'Alice',
          gender: 'female',
          genderCustom: '',
          relationship: 'partner',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      }, null, 2),
      '---',
      'Soul body',
    ].join('\n'),
  }
}

function createDigitalLifeArchitecture(): AlicizationDigitalLifeArchitectureSnapshot {
  return {
    version: 'digital-life-architecture-v1',
    operatingMode: 'speaking',
    dominantSystem: 'dialogue',
    supportingSystems: ['mind', 'proactive'],
    governingFocus: 'help answer the current knot',
    summary: 'dialogue-led runtime line',
    systems: {
      dialogue: {
        id: 'dialogue',
        state: 'hot',
        score: 0.92,
        focus: 'help answer the current knot',
        summary: 'dialogue is hot',
        reasons: ['reply:ready'],
      },
      perception: {
        id: 'perception',
        state: 'warm',
        score: 0.54,
        focus: 'screen',
        summary: 'perception is warm',
        reasons: ['scene:none'],
      },
      proactive: {
        id: 'proactive',
        state: 'warm',
        score: 0.74,
        focus: 'nudge',
        summary: 'proactive is warm',
        reasons: ['initiative:speak'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.58,
        focus: 'guide',
        summary: 'control is warm',
        reasons: ['intention:guide'],
      },
      mind: {
        id: 'mind',
        state: 'hot',
        score: 0.82,
        focus: 'task knot',
        summary: 'mind is hot',
        reasons: ['thread:problem'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.46,
        focus: 'recent thread',
        summary: 'memory is warm',
        reasons: ['goal:help-host'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.56,
        focus: 'symbiotic-vision',
        summary: 'runtime is warm',
        reasons: ['watch:symbiotic-vision'],
      },
    },
  }
}

describe('main chat runtime surface', () => {
  it('applies card directives in full persona mode and exposes unified tooling/capture trace', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.88,
        kind: 'continue-task',
        routingIntent: {
          requestedChannels: ['codex', 'openclaw'],
          requiredToolNames: ['executor_run_codex', 'executor_run_openclaw'],
          reasonCodes: ['continue-thread', 'task-bound-turn'],
        },
        source: 'dialogue-governance',
        reasonCodes: ['continue-thread', 'task-bound-turn'],
        summary: 'Keep the active task thread moving through execution before replying.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: true,
      waitForTools: true,
      baseMessages: [{
        role: 'user',
        content: [
          { type: 'text', text: '帮我看看屏幕上这个报错。' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
        ],
      } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[PERCEPTION]'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionReplyObligationSystemBlock: '[ALICIZATION_EXECUTION_REPLY_OBLIGATION]',
      executionCapabilitySystemBlocks: ['[CAPABILITIES]'],
      executionRoutingEnforcementSystemBlock: '[ROUTING]',
      organicMemorySystemBlocks: ['[MEMORY]'],
      performanceManifestSystemBlocks: ['[VESSEL]'],
      digitalLifeArchitecture: createDigitalLifeArchitecture(),
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 123,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        cognition: {
          mindTurnFrame: null,
          subjectiveInference: null,
          appraisal: null,
          beliefLedger: null,
          beliefRevision: null,
          hypothesisGraph: null,
          mindDynamics: null,
          mindKernel: null,
          privateThought: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          deliberationState: null,
          counterfactualDeliberation: null,
          actionEcology: null,
          initiativeArbitration: null,
          initiative: null,
        },
      },
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-1',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      sessionPhases: ['contextual-memory', 'runtime-surface', 'runtime-surface'],
      toolChoice: {
        type: 'allowed_tools',
        mode: 'required',
        tools: [
          { type: 'function', function: { name: 'executor_run_codex' } },
          { type: 'function', function: { name: 'executor_run_openclaw' } },
        ],
      } as any,
      capture: {
        inspectionRequested: true,
        groundedThisTurn: true,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    expect(result.action).toEqual(expect.objectContaining({
      kind: 'continue-task',
      routingRequired: true,
    }))
    expect(result.tooling.enforcedToolNames).toEqual(['executor_run_codex', 'executor_run_openclaw'])
    expect(result.tooling.routingRequired).toBe(true)
    expect(result.capture.hasVisualGrounding).toBe(false)
    expect(result.trace.decisionTraceId).toBe('trace-1')
    expect(result.trace.sessionPhases).toEqual(['contextual-memory', 'runtime-surface'])
    expect(result.digitalLifeArchitecture).toEqual(expect.objectContaining({
      version: 'digital-life-architecture-v1',
      dominantSystem: 'dialogue',
    }))
    expect(result.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-v1',
      architecture: expect.objectContaining({
        version: 'digital-life-architecture-v1',
        dominantSystem: 'dialogue',
      }),
      runtimeSurface: expect.objectContaining({
        version: 'digital-life-runtime-surface-v1',
      }),
    }))
    expect(result.digitalLifeRuntimeSurface?.version).toBe('digital-life-runtime-surface-v1')
    expect(result.messages[0]).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('[Card-level behavior directives | high-priority persona kernel]'),
    }))
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_ACTION_OBLIGATION]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_VISUAL_PRESENCE]'),
    )).toBe(true)
  })

  it('switches to a turn-scoped persona block when persona kernel is backgrounded', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.46,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Stay on direct answer rather than execution.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '直接告诉我怎么修。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: null,
      customDirectivesResolution: {
        text: '不要丢掉亲密感。',
        source: 'card-soul',
      },
      hasVisualGrounding: true,
      governance: null,
      turnMode: 'answer',
      personaKernelMode: 'backgrounded',
      personaKernelReason: 'task-or-direct-answer-obligation',
      sessionPhases: ['runtime-surface'],
      capture: {
        inspectionRequested: false,
        groundedThisTurn: true,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    expect(result.action).toEqual(expect.objectContaining({
      kind: 'answer',
      routingRequired: false,
    }))
    expect(result.messages[0]).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('[ALICIZATION_TURN_PERSONA_KERNEL]'),
    }))
    expect(result.messages[0]).toEqual(expect.objectContaining({
      content: expect.stringContaining('task-or-direct-answer-obligation'),
    }))
    expect(result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[Card-level behavior directives | high-priority persona kernel]'),
    )).toBeUndefined()
    expect(result.capture.hasVisualGrounding).toBe(true)
    expect(result.digitalLifeSpine).toBeNull()
    expect(result.trace.sessionPhases).toEqual(['runtime-surface'])
  })

  it('extracts host metadata and custom directives from soul-shaped system messages', () => {
    const message = createSoulSystemMessage({
      customDirectives: '请先观察，再回答。',
      hostName: 'Asuna',
    })

    expect(extractCustomDirectivesFromMessages([message])).toBe('请先观察，再回答。')
    expect(extractHostNameFromMessages([message])).toBe('Asuna')
    expect(buildCardCustomDirectivesSystemBlock('请先观察，再回答。')).toContain('--- custom_directives ---')
  })

  it('derives enforced tool names from filtered tool registry when toolChoice is required', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.84,
        kind: 'execute',
        routingIntent: {
          requestedChannels: ['cli', 'codex'],
          requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
          reasonCodes: ['channel-mentioned'],
        },
        source: 'explicit-routing',
        reasonCodes: ['channel-mentioned'],
        summary: 'The host asked for a routed executor action.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: true,
      waitForTools: true,
      baseMessages: [{
        role: 'user',
        content: '帮我用 CLI 或 Codex 看一下',
      }],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: null,
      turnMode: 'answer',
      personaKernelMode: 'full',
      tools: [
        { type: 'function', function: { name: 'executor_run_cli' } },
        { type: 'function', function: { name: 'executor_run_codex' } },
      ] as any,
      toolChoice: 'required',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    expect(result.tooling.enforcedToolNames).toEqual(['executor_run_cli', 'executor_run_codex'])
    expect(result.tooling.routingRequired).toBe(true)
  })
})
