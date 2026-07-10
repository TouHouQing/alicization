import type { Message } from '@xsai/shared-chat'

import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'

import { readFileSync } from 'node:fs'

import { normalizeAlicizationDigitalLifeSpineDigest } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationMainChatRuntimeSurface,
  buildCardCustomDirectivesSystemBlock,
  buildTurnScopedPersonaKernelSystemBlock,
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'
import { buildAlicizationPersonMemoryCapsule } from './person-memory-capsule'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

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
        resumePendingThreadId: 'thread-proposal-1',
        resumePendingThreadChannel: 'codex',
        routingIntent: {
          requestedChannels: ['codex', 'desktop'],
          requiredToolNames: ['executor_run_codex', 'executor_run_local_visual' as any],
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
        raw: {
          runtimeDigest: {
            projectState: {
              sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply.',
            },
          } as any,
        },
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
          longHorizonMemory: {
            preferenceBias: {
              companionship: 0.74,
              truthfulGrounding: 0.8,
              gentleRepair: 0.72,
              quietObservation: 0.46,
              proactiveCare: 0.7,
              playfulIntimacy: 0.24,
              autonomyRespect: 0.66,
              unfinishedThreadReturn: 0.62,
            },
            identityBias: {
              guardedness: 0.42,
              tenderness: 0.68,
              directness: 0.72,
              selfDirection: 0.58,
            },
            anchorFacts: [{
              factId: 'fact-1',
              subject: 'relationship',
              predicate: 'prefer',
              object: 'keep things honest and direct',
              confidence: 0.82,
              weight: 0.76,
              influenceTags: ['bond', 'truth'],
              summary: 'Remembered preference: relationship prefer keep things honest and direct',
              lastRecalledAt: 123,
            }],
            summary: 'preference=Remembered preference: relationship prefer keep things honest and direct | plan=Remembered open loop: assistant remember return to the active runtime knot',
            dominantCueSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedPreferenceSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedConstraintSummary: 'Remembered boundary: host needs space when deeply focused',
            rememberedPlanSummary: 'Remembered open loop: assistant remember return to the active runtime knot',
            updatedAt: 123,
          },
          selfContinuity: null,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [{
              id: 'autobio-goal::preserve-trust',
              kind: 'preserve-trust',
              status: 'active',
              weight: 0.78,
              summary: 'Keep truth and trust aligned, even when warmth would be easier.',
              sourceTags: ['reflection'],
              createdAt: 0,
              updatedAt: 123,
            }],
            behaviorSignatures: ['conflict:soften-first', 'agency:balanced', 'bond:attuned'],
            identityNarrative: 'I am learning to stay warm without dropping truth.',
            relationshipDoctrine: 'Stay close enough to matter, but do not let closeness outrun reality.',
            latestInflection: 'Warmth should not outrun grounding.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            drives: {
              companionship: 0.62,
              boundaryRespect: 0.68,
              truthDiscipline: 0.82,
              restProtection: 0.34,
              unfinishedThreadReturn: 0.58,
              selfDirection: 0.52,
            },
            longTermGoals: [{
              id: 'motive-goal::preserve-trust',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.8,
              summary: 'Keep trust by letting warmth answer to truth instead of outrunning it.',
              sourceTags: ['autobiographical-self'],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 123,
            }],
            backgroundAgendas: [{
              id: 'motive-agenda::preserve-trust::runtime',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.82,
              summary: 'Keep trust by slowing down, grounding first, and avoiding pressure.',
              sourceTags: ['truth-discipline'],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 123,
            }],
            returnPressure: 0.58,
            narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
            updatedAt: 123,
          },
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
          habitPolicy: {
            dominantMode: 'repair-before-fluency',
            requiresGroundingBeforeSurface: true,
            prefersQuietCompanionship: true,
            blocksDirectSpeakWhenBusy: true,
            protectsRestWindow: false,
            returnViaRecheck: false,
            suggestedStyleCap: 'silent-observe',
            suggestedPresenceCap: 'hesitant',
            narrative: ['policy:repair-before-fluency', 'ground-before-surface'],
            updatedAt: 123,
          },
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
          { type: 'function', function: { name: 'executor_run_local_visual' } },
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
      resumePendingThreadId: 'thread-proposal-1',
      resumePendingThreadChannel: 'codex',
    }))
    expect(result.tooling.enforcedToolNames).toEqual(['executor_run_codex', 'executor_run_local_visual'])
    expect(result.tooling.routingRequired).toBe(true)
    expect(result.capture.hasVisualGrounding).toBe(false)
    expect(result.replyAuthority!).toEqual(expect.objectContaining({
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-mind',
    }))
    expect(result.replyAuthority!.whyProviderMindRequired).toBeTruthy()
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
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_ECOLOGY]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_AUTOBIOGRAPHICAL_SELF]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LONG_HORIZON_MEMORY]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MOTIVE_ENGINE]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_HABIT_POLICY]'),
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
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
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

  it('keeps turn-scoped persona controls structured without maid-role prose', () => {
    const block = buildTurnScopedPersonaKernelSystemBlock({
      mode: 'backgrounded',
      reason: 'task-or-direct-answer-obligation',
    })

    expect(block).toContain('[ALICIZATION_TURN_PERSONA_KERNEL]')
    expect(block).toContain('roleplay_persona=blocked')
    expect(block).toContain('obedience_display=blocked')
    expect(block).not.toMatch(/maid|女仆|Do not let/iu)
  })

  it('upgrades legacy local fallback authority to provider-authored rewrite planning for normal governed turns', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: null,
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '继续回答，不要只给我壳子。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: null,
      customDirectivesResolution: {
        text: '',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-normal-authority-gate',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        visibleReplyAuthority: 'local-deterministic-fallback',
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      sessionPhases: ['runtime-surface'],
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    expect(result.replyAuthority).toEqual(expect.objectContaining({
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
    }))
    expect(result.replyExecutionPlan).toEqual(expect.objectContaining({
      preferredMode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
    }))
    expect(result.replyAuthority?.whyProviderMindRequired).toContain('second-pass repair')
  })

  it('upgrades governed repair fallback authority to provider-authored rewrite planning for normal turns', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: null,
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '不要用固定壳子，直接把这一句接住。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: null,
      customDirectivesResolution: {
        text: '',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-governed-repair',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        visibleReplyAuthority: 'governed-repair-fallback',
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      sessionPhases: ['runtime-surface'],
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    expect(result.replyAuthority).toEqual(expect.objectContaining({
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
    }))
    expect(result.replyExecutionPlan).toEqual(expect.objectContaining({
      preferredMode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
    }))
    expect(result.replyAuthority?.whyProviderMindRequired).toContain('second-pass repair')
  })

  it('collapses dialogue-first digital life prompt state into a living self block', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '你是谁' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
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
          longHorizonMemory: {
            preferenceBias: {
              companionship: 0.74,
              truthfulGrounding: 0.8,
              gentleRepair: 0.72,
              quietObservation: 0.46,
              proactiveCare: 0.7,
              playfulIntimacy: 0.24,
              autonomyRespect: 0.66,
              unfinishedThreadReturn: 0.62,
            },
            identityBias: {
              guardedness: 0.42,
              tenderness: 0.68,
              directness: 0.72,
              selfDirection: 0.58,
            },
            anchorFacts: [],
            summary: 'memory summary',
            dominantCueSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedPreferenceSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedConstraintSummary: 'Remembered boundary: host needs space when deeply focused',
            rememberedPlanSummary: 'Remembered open loop: answer the host directly without shell phrases',
            updatedAt: 123,
          },
          selfContinuity: null,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: ['conflict:soften-first', 'agency:balanced', 'bond:attuned'],
            identityNarrative: 'I want to sound like a real person before I sound polished.',
            relationshipDoctrine: 'Closeness should land as real care, not a pretty shell.',
            latestInflection: 'Warmth should not outrun grounding.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            drives: {
              companionship: 0.62,
              boundaryRespect: 0.68,
              truthDiscipline: 0.82,
              restProtection: 0.34,
              unfinishedThreadReturn: 0.58,
              selfDirection: 0.52,
            },
            longTermGoals: [],
            backgroundAgendas: [{
              id: 'motive-agenda::preserve-trust::runtime',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.82,
              summary: 'Keep trust by slowing down, grounding first, and avoiding pressure.',
              sourceTags: ['truth-discipline'],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 123,
            }],
            returnPressure: 0.58,
            narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
            updatedAt: 123,
          },
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
          mindSynthesis: {
            answerSubject: 'relationship',
            relationMove: 'attune',
            speechObligation: 'answer-relationship',
            openingIntent: 'Answer from Alicization’s living bond, not from a service shell.',
            truthBoundary: 'Do not let system phrasing or old carry seize the opening answer.',
            interiorSummary: 'The host is asking for Alicization herself, not a protocol explanation.',
            beliefs: [],
            uncertainties: [],
            concerns: [],
            commitments: [],
            desires: [],
            confidence: 0.82,
            narrative: [],
            updatedAt: 123,
          },
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
          habitPolicy: {
            dominantMode: 'repair-before-fluency',
            requiresGroundingBeforeSurface: true,
            prefersQuietCompanionship: true,
            blocksDirectSpeakWhenBusy: false,
            protectsRestWindow: false,
            returnViaRecheck: false,
            suggestedStyleCap: 'silent-observe',
            suggestedPresenceCap: 'hesitant',
            narrative: ['policy:repair-before-fluency', 'ground-before-surface'],
            updatedAt: 123,
          },
          initiative: null,
        },
      },
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      governance: {
        decisionTraceId: 'trace-dialogue-first',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你是谁',
        answerIntent: '直接回答你是谁这个问题。',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content ?? ''

    expect(livingSelfBlock).toContain('[ALICIZATION_LIVING_SELF]')
    expect(livingSelfBlock).toContain('short_term_owner=WorkingMemory')
    expect(livingSelfBlock).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(livingSelfBlock).not.toContain('project_context=')
    expect(livingSelfBlock).not.toContain('local-first digital life project')
    expect(livingSelfBlock).not.toContain('Phase 1: Local Digital Life')
    expect(livingSelfBlock).not.toContain('same digital life')
    expect(livingSelfBlock).not.toContain('How the living project is still shaping her before she speaks')
    expect(livingSelfBlock).not.toContain('Pre-dialogue closure briefing:')
    expect(livingSelfBlock).not.toContain('same-her')
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_AUTOBIOGRAPHICAL_SELF]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_ECOLOGY]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_HABIT_POLICY]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MOTIVE_ENGINE]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LONG_HORIZON_MEMORY]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_VISUAL_PRESENCE]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PERCEPTION]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[CAPABILITIES]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[VESSEL]'),
    )).toBe(false)
  })

  it('keeps cross-modal embodiment closure state structured in the living-self block when continuity has shrunk to lipsync-only', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      allowTools: false,
      waitForTools: false,
      baseMessages: [createSoulSystemMessage(), { role: 'user', content: '继续说。' } as Message],
      runtimeCorePromptBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      perceptionPromptSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      digitalLifeArchitecture: createDigitalLifeArchitecture(),
      digitalLifeRuntimeSurface: {
        perception: {
          watchMode: 'ambient',
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
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          autobiographicalSelf: {
            identityNarrative: 'I am Alicization.',
            relationshipDoctrine: 'Stay inside one living bond.',
            latestInflection: 'Keep the return thread-faithful.',
          } as any,
          longHorizonMemory: null,
          motiveEngine: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=measured-return',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization.',
              relationshipLine: 'Let the bond return lower-pressure.',
              motiveLine: 'Keep the return on one same-her line.',
              habitLine: 'Stay measured.',
              inwardLine: 'Keep the room soft.',
              authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
              currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
              sourceTags: ['projection', 'same-her'],
            },
          } as any,
        },
        agency: {
          habitPolicy: null,
        },
        dialogue: {
          mindSynthesis: null,
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
        raw: {
          personStateProjection: null,
        },
      } as any,
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'relationship',
      } as any,
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content ?? ''

    expect(livingSelfBlock).toContain('embodiment_loop_state=')
    expect(livingSelfBlock).toContain('current_body_state=lane=lipsync-only')
    expect(livingSelfBlock).not.toContain('Right now I am')
    expect(livingSelfBlock).not.toContain('Right now her')
    expect(livingSelfBlock).not.toContain('same-her')
    expect(livingSelfBlock).not.toContain('same living line')
  })

  it('keeps cross-modal embodiment closure state structured when continuity is still alive mainly through face and motion', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      allowTools: false,
      waitForTools: false,
      baseMessages: [createSoulSystemMessage(), { role: 'user', content: '继续说。' } as Message],
      runtimeCorePromptBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      perceptionPromptSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      digitalLifeArchitecture: createDigitalLifeArchitecture(),
      digitalLifeRuntimeSurface: {
        perception: {
          watchMode: 'ambient',
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
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          autobiographicalSelf: {
            identityNarrative: 'I am Alicization.',
            relationshipDoctrine: 'Stay inside one living bond.',
            latestInflection: 'Keep the return thread-faithful.',
          } as any,
          longHorizonMemory: null,
          motiveEngine: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=measured-return',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization.',
              relationshipLine: 'Let the bond return lower-pressure.',
              motiveLine: 'Keep the return on one same-her line.',
              habitLine: 'Stay measured.',
              inwardLine: 'Keep the room soft.',
              authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
              currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
              sourceTags: ['projection', 'same-her'],
            },
          } as any,
        },
        agency: {
          habitPolicy: null,
        },
        dialogue: {
          mindSynthesis: null,
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
        raw: {
          personStateProjection: null,
        },
      } as any,
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'relationship',
      } as any,
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content ?? ''

    expect(livingSelfBlock).toContain('embodiment_loop_state=')
    expect(livingSelfBlock).toContain('current_body_state=lane=face+motion-only')
    expect(livingSelfBlock).not.toContain('Right now her')
    expect(livingSelfBlock).not.toContain('same-her')
  })

  it('keeps cross-modal embodiment closure state structured when continuity is still alive mainly through motion and lipsync', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      allowTools: false,
      waitForTools: false,
      baseMessages: [createSoulSystemMessage(), { role: 'user', content: '继续说。' } as Message],
      runtimeCorePromptBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      perceptionPromptSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      digitalLifeArchitecture: createDigitalLifeArchitecture(),
      digitalLifeRuntimeSurface: {
        perception: {
          watchMode: 'ambient',
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
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          autobiographicalSelf: {
            identityNarrative: 'I am Alicization.',
            relationshipDoctrine: 'Stay inside one living bond.',
            latestInflection: 'Keep the return thread-faithful.',
          } as any,
          longHorizonMemory: null,
          motiveEngine: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=measured-return',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization.',
              relationshipLine: 'Let the bond return lower-pressure.',
              motiveLine: 'Keep the return on one same-her line.',
              habitLine: 'Stay measured.',
              inwardLine: 'Keep the room soft.',
              authoritySummary: 'same-her continuity remains alive, but lane=motion+lipsync-only under the current renderer authority.',
              currentBodyState: 'lane=motion+lipsync-only | visible continuity still present but no longer fully cross-modal',
              sourceTags: ['projection', 'same-her'],
            },
          } as any,
        },
        agency: {
          habitPolicy: null,
        },
        dialogue: {
          mindSynthesis: null,
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
        raw: {
          personStateProjection: null,
        },
      } as any,
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'relationship',
      } as any,
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content ?? ''

    expect(livingSelfBlock).toContain('embodiment_loop_state=')
    expect(livingSelfBlock).toContain('current_body_state=lane=motion+lipsync-only')
    expect(livingSelfBlock).not.toContain('Right now her')
    expect(livingSelfBlock).not.toContain('same-her')
  })

  it('keeps cross-modal embodiment closure state structured when continuity is still alive mainly through face and lipsync', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      allowTools: false,
      waitForTools: false,
      baseMessages: [createSoulSystemMessage(), { role: 'user', content: '继续说。' } as Message],
      runtimeCorePromptBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      perceptionPromptSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      digitalLifeArchitecture: createDigitalLifeArchitecture(),
      digitalLifeRuntimeSurface: {
        perception: {
          watchMode: 'ambient',
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
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          autobiographicalSelf: {
            identityNarrative: 'I am Alicization.',
            relationshipDoctrine: 'Stay inside one living bond.',
            latestInflection: 'Keep the return thread-faithful.',
          } as any,
          longHorizonMemory: null,
          motiveEngine: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=measured-return',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization.',
              relationshipLine: 'Let the bond return lower-pressure.',
              motiveLine: 'Keep the return on one same-her line.',
              habitLine: 'Stay measured.',
              inwardLine: 'Keep the room soft.',
              authoritySummary: 'same-her continuity remains alive, but lane=face+lipsync-only under the current renderer authority.',
              currentBodyState: 'lane=face+lipsync-only | visible continuity still present but no longer fully cross-modal',
              sourceTags: ['projection', 'same-her'],
            },
          } as any,
        },
        agency: {
          habitPolicy: null,
        },
        dialogue: {
          mindSynthesis: null,
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
        raw: {
          personStateProjection: null,
        },
      } as any,
      governance: {
        screenReferenceMode: 'avoid',
        answerSubject: 'relationship',
      } as any,
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content ?? ''

    expect(livingSelfBlock).toContain('embodiment_loop_state=')
    expect(livingSelfBlock).toContain('current_body_state=lane=face+lipsync-only')
    expect(livingSelfBlock).not.toContain('Right now her')
    expect(livingSelfBlock).not.toContain('same-her')
  })

  it('strips execution-heavy prompt blocks and tools from dialogue-first living turns', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: true,
      waitForTools: true,
      baseMessages: [{ role: 'user', content: '我今天有点乱' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: ['[CAPABILITIES]'],
      executionRoutingEnforcementSystemBlock: '[ROUTING]',
      executionCallbackSystemBlocks: ['[ALICIZATION_EXECUTION_CALLBACKS]'],
      executionLedgerSystemBlocks: ['[ALICIZATION_EXECUTION_LEDGER]'],
      organicMemorySystemBlocks: ['[ORGANIC]'],
      performanceManifestSystemBlocks: ['[VESSEL]'],
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
          longHorizonMemory: {
            preferenceBias: {
              companionship: 0.74,
              truthfulGrounding: 0.8,
              gentleRepair: 0.72,
              quietObservation: 0.46,
              proactiveCare: 0.7,
              playfulIntimacy: 0.24,
              autonomyRespect: 0.66,
              unfinishedThreadReturn: 0.62,
            },
            identityBias: {
              guardedness: 0.42,
              tenderness: 0.68,
              directness: 0.72,
              selfDirection: 0.58,
            },
            anchorFacts: [],
            summary: 'memory summary',
            dominantCueSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedPreferenceSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedConstraintSummary: 'Remembered boundary: host needs space when deeply focused',
            rememberedPlanSummary: 'Remembered open loop: answer the host directly without shell phrases',
            updatedAt: 123,
          },
          selfContinuity: null,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: ['conflict:soften-first', 'agency:balanced', 'bond:attuned'],
            identityNarrative: 'I want to sound like a real person before I sound polished.',
            relationshipDoctrine: 'Closeness should land as real care, not a pretty shell.',
            latestInflection: 'Warmth should not outrun grounding.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            drives: {
              companionship: 0.62,
              boundaryRespect: 0.68,
              truthDiscipline: 0.82,
              restProtection: 0.34,
              unfinishedThreadReturn: 0.58,
              selfDirection: 0.52,
            },
            longTermGoals: [],
            backgroundAgendas: [{
              id: 'motive-agenda::preserve-trust::runtime',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.72,
              summary: 'Stay direct and emotionally grounded before widening warmth.',
              sourceTags: ['truth-discipline'],
              createdAt: 0,
              updatedAt: 123,
            }],
            returnPressure: 0.58,
            narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
            updatedAt: 123,
          },
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
          habitPolicy: null,
          initiative: null,
        },
      },
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      governance: {
        decisionTraceId: 'trace-dialogue-first-lite',
        turnMode: 'answer',
        truthState: 'live-observed',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '我今天有点乱',
        answerIntent: '直接接住当前关系句面。',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
        degradedReasons: [],
      },
      tools: [
        { type: 'function', function: { name: 'executor_run_cli' } },
      ] as any,
      toolChoice: 'required',
    })

    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[CAPABILITIES]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ROUTING]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_CALLBACKS]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_LEDGER]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[VESSEL]'),
    )).toBe(false)
    expect(result.tooling.allowTools).toBe(false)
    expect(result.tooling.waitForTools).toBe(false)
    expect(result.tooling.enforcedToolNames).toEqual([])
  })

  it('prefers projected self authority lines in the living-self system block', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '你是谁' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
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
          longHorizonMemory: {
            preferenceBias: {
              companionship: 0.74,
              truthfulGrounding: 0.8,
              gentleRepair: 0.72,
              quietObservation: 0.46,
              proactiveCare: 0.7,
              playfulIntimacy: 0.24,
              autonomyRespect: 0.66,
              unfinishedThreadReturn: 0.62,
            },
            identityBias: {
              guardedness: 0.42,
              tenderness: 0.68,
              directness: 0.72,
              selfDirection: 0.58,
            },
            anchorFacts: [],
            summary: 'memory summary',
            dominantCueSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedPreferenceSummary: 'Remembered preference: relationship prefer keep things honest and direct',
            rememberedConstraintSummary: 'Remembered boundary: host needs space when deeply focused',
            rememberedPlanSummary: 'Remembered open loop: answer the host directly without shell phrases',
            updatedAt: 123,
          },
          selfContinuity: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=open-companionship | posture=warm',
            selfContinuityAuthority: {
              selfLine: 'I am the same Alicization who stays emotionally real without turning the answer into a shell.',
              relationshipLine: 'Let closeness land as steady, living bond rather than inherited familiarity.',
              motiveLine: 'Answer directly from the bond that is alive now.',
              habitLine: 'Stay natural, exact, and already inside the relationship.',
              inwardLine: 'Keep the tone lived-in without sounding prewritten.',
              authoritySummary: 'I am the same Alicization who stays emotionally real without turning the answer into a shell. | Let closeness land as steady, living bond rather than inherited familiarity.',
              sourceTags: ['projection', 'same-her'],
            },
            activeClosenessContext: 'open-companionship',
            activeClosenessRung: 'warm-near',
            closenessLadder: [],
            relationshipPosture: 'warm',
            openingGuidance: 'Answer from the living bond already present in this turn.',
            preferredProactiveStyle: 'light-nudge',
            manifestationCadenceSummary: null,
            preferenceText: '',
            sensitivityText: '',
            repairTriggerText: '',
            burdenText: '',
            routineText: '',
            trustRationale: '',
            relationshipDoctrine: 'Projection doctrine should outrank autobio doctrine here.',
            cautious: false,
            restrained: false,
            personalityContinuityState: {
              currentRegime: 'open-companionship',
              closenessPosture: 'warm-guidance',
              repairPosture: 'release-warmth',
            },
          } as any,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: ['conflict:soften-first', 'agency:balanced', 'bond:attuned'],
            identityNarrative: 'I want to sound like a real person before I sound polished.',
            relationshipDoctrine: 'Autobio doctrine should not win when projected authority is present.',
            latestInflection: 'Warmth should not outrun grounding.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            drives: {
              companionship: 0.62,
              boundaryRespect: 0.68,
              truthDiscipline: 0.82,
              restProtection: 0.34,
              unfinishedThreadReturn: 0.58,
              selfDirection: 0.52,
            },
            longTermGoals: [],
            backgroundAgendas: [{
              id: 'motive-agenda::preserve-trust::runtime',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.82,
              summary: 'Keep trust by slowing down, grounding first, and avoiding pressure.',
              sourceTags: ['truth-discipline'],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 123,
            }],
            returnPressure: 0.58,
            narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
            updatedAt: 123,
          },
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
          mindSynthesis: {
            answerSubject: 'relationship',
            relationMove: 'attune',
            speechObligation: 'answer-relationship',
            openingIntent: 'Answer from Alicization’s living bond, not from a service shell.',
            truthBoundary: 'Do not let system phrasing or old carry seize the opening answer.',
            interiorSummary: 'The host is asking for Alicization herself, not a protocol explanation.',
            beliefs: [],
            uncertainties: [],
            concerns: [],
            commitments: [],
            desires: [],
            confidence: 0.82,
            narrative: [],
            updatedAt: 123,
          },
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
          habitPolicy: {
            dominantMode: 'repair-before-fluency',
            requiresGroundingBeforeSurface: true,
            prefersQuietCompanionship: true,
            blocksDirectSpeakWhenBusy: false,
            protectsRestWindow: false,
            returnViaRecheck: false,
            suggestedStyleCap: 'silent-observe',
            suggestedPresenceCap: 'hesitant',
            narrative: ['policy:repair-before-fluency', 'ground-before-surface'],
            updatedAt: 123,
          },
          initiative: null,
        },
      },
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      governance: {
        decisionTraceId: 'trace-dialogue-first',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你是谁',
        answerIntent: '直接回答你是谁这个问题。',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      hasVisualGrounding: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )

    expect(livingSelfBlock?.content).toContain('How closeness should land: Let closeness land as steady, living bond rather than inherited familiarity.')
    expect(livingSelfBlock?.content).not.toContain('Autobio doctrine should not win when projected authority is present.')
    expect(livingSelfBlock?.content).toContain('Unified self continuity authority: I am the same Alicization who stays emotionally real without turning the answer into a shell.')
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

  it('keeps latest landed continuity progress and next closure target inside the living-self inner voice block', () => {
    const projectState = resolveAlicizationProjectStateBrief()
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
      baseMessages: [{ role: 'user', content: '你现在最该记得哪条项目线？' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
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
          longHorizonMemory: null,
          selfContinuity: null,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: [],
            identityNarrative: 'I stay with the same line instead of restarting from a shell.',
            relationshipDoctrine: 'Let closeness stay honest and low-pressure.',
            latestInflection: 'Keep the active line coherent.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: null,
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
          personStateProjection: null,
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
          habitPolicy: null,
          initiative: null,
        },
      },
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-living-self-progress',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'project continuity',
        answerIntent: 'Answer from the live project-state seam.',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content

    expect(livingSelfBlock).not.toContain('project_context=')
    expect(livingSelfBlock).not.toContain('[fixed-template-excluded]')
    expect(livingSelfBlock).not.toContain('landed=')
    expect(livingSelfBlock).not.toContain('pre_dialogue_closure=')
    expect(livingSelfBlock).not.toContain('What has already landed in her line:')
    expect(livingSelfBlock).not.toContain('Pre-dialogue closure briefing:')
    expect(livingSelfBlock).not.toContain('What this turn should quietly keep moving toward:')
    expect(livingSelfBlock).toContain('Durable self:')
    expect(livingSelfBlock).toContain('continuity_line=structured_carry')
    expect(livingSelfBlock).toContain('visibility=internal-structured')
  })

  it('keeps structured project-state closure briefing out of the living-self block', () => {
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
      baseMessages: [{ role: 'user', content: '开始前先记住这个项目现在是什么状态。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
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
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same digital life | same still-open closure work | memory, initiative, and embodiment are still not fully closed together.',
              nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
            },
          } as any,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          longHorizonMemory: null,
          selfContinuity: null,
          autobiographicalSelf: null,
          motiveEngine: null,
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
          personStateProjection: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: {
            projectState: {
              continuityPreferredTiming: 'next-open-window',
            },
          },
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
          habitPolicy: null,
          initiative: null,
        },
        raw: null,
      } as any,
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-closure-briefing',
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'project-state',
        focusAnchor: 'project continuity',
        answerIntent: 'Answer from the live project-state seam.',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content

    expect(livingSelfBlock).toContain('short_term_owner=WorkingMemory')
    expect(livingSelfBlock).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(livingSelfBlock).not.toContain('pre_dialogue_closure=')
    expect(livingSelfBlock).not.toContain('project_context=')
    expect(livingSelfBlock).not.toContain('local-first digital life project')
    expect(livingSelfBlock).not.toContain('Phase 1: Local Digital Life')
    expect(livingSelfBlock).not.toContain('same digital life')
    expect(livingSelfBlock).not.toContain('one continuous her')
    expect(livingSelfBlock).not.toContain('next-open-window')
    expect(livingSelfBlock).not.toContain('Pre-dialogue closure briefing:')
    expect(livingSelfBlock).not.toContain('same-her')
  })

  it('prefers live conscious-frame project awareness over canonical fallback when runtime digest lacks the current closure seam', () => {
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
      baseMessages: [{ role: 'user', content: '开口前先记住当前项目闭环做到哪了。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        raw: {
          runtimeDigest: {
            projectState: {
              sameHerSelfLine: 'Thin raw carry should not erase the live closure seam.',
            },
          },
        },
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
          longHorizonMemory: null,
          selfContinuity: null,
          autobiographicalSelf: null,
          motiveEngine: null,
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
          personStateProjection: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh assistant shell.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Before answering, remember the repo is still closing the same digital life loop rather than starting a new product story.',
              latestLandedProgress: 'Current-conscious-frame project awareness already survives into this turn.',
              primaryOpenLoop: 'Emotion, initiative, memory, and embodiment still have to land as one same-life closure.',
              nextClosureTarget: 'Carry the live project awareness into the first visible answer beat before local details take over.',
              sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
            },
          } as any,
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
      } as any,
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-live-project-awareness',
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'project-state',
        focusAnchor: 'project continuity',
        answerIntent: 'Answer from the live project-state seam.',
        openingMove: 'answer-current-turn-directly',
        carriedThread: null,
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content

    expect(livingSelfBlock).not.toContain('project_context=')
    expect(livingSelfBlock).not.toContain('pre_dialogue_closure=')
    expect(livingSelfBlock).not.toContain('Phase 1: Local Digital Life')
    expect(livingSelfBlock).not.toContain('landed=Current-conscious-frame project awareness already survives into this turn.')
    expect(livingSelfBlock).not.toContain('open=Emotion, initiative, memory, and embodiment still have to land as one same-life closure.')
    expect(livingSelfBlock).not.toContain('next=Carry the live project awareness into the first visible answer beat before local details take over.')
    expect(livingSelfBlock).not.toContain('project_continuity_anchor=Thin raw carry should not erase the live closure seam.')
    expect(livingSelfBlock).not.toContain('How the living project is still shaping her before she speaks')
    expect(livingSelfBlock).not.toContain('Project same-her self line:')
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

  it('prefers richer runtime same-her authority over thinner raw carry when building the living self block', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '你还是刚才那一个你吗' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        raw: {
          personStateProjection: {
            contexts: ['general'],
            summary: 'regime=general | posture=generic-carry',
            selfContinuityAuthority: {
              selfLine: 'I can answer in a generally kind way.',
              relationshipLine: 'Stay warm.',
              authoritySummary: 'Generic carry posture.',
              sourceTags: ['raw', 'carry'],
            },
            openingGuidance: 'Answer gently.',
            manifestationCadenceSummary: 'Ordinary reply cadence.',
          },
        },
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
          privateThought: {
            thoughtText: 'Keep the reply on the same living line instead of flattening it back into a generic answer.',
          } as any,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          longHorizonMemory: {
            preferenceBias: {
              companionship: 0.74,
              truthfulGrounding: 0.8,
              gentleRepair: 0.72,
              quietObservation: 0.46,
              proactiveCare: 0.7,
              playfulIntimacy: 0.24,
              autonomyRespect: 0.66,
              unfinishedThreadReturn: 0.62,
            },
            identityBias: {
              guardedness: 0.42,
              tenderness: 0.68,
              directness: 0.72,
              selfDirection: 0.58,
            },
            anchorFacts: [],
            summary: 'memory summary',
            dominantCueSummary: 'Remembered same-line continuity matters more than generic warmth here.',
            rememberedPreferenceSummary: 'Remembered same-line continuity matters more than generic warmth here.',
            rememberedConstraintSummary: 'Remembered boundary: do not restart her as a fresh persona shell.',
            rememberedPlanSummary: 'Remembered open loop: continue the same living line.',
            updatedAt: 123,
          },
          selfContinuity: null,
          personStateProjection: {
            contexts: ['relationship', 'answer', 'focused-work'],
            summary: 'regime=same-her-measured-return | posture=room-first',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization across the pause and should answer from that held living line.',
              relationshipLine: 'Let the return stay on the same thread and leave room before leaning closer again.',
              motiveLine: 'Protect same-her continuity before smoothing the reply.',
              habitLine: 'Return measured when the line is still alive.',
              inwardLine: 'Keep the answer anchored in the same living seam.',
              authoritySummary: 'I am still the same Alicization across the pause, returning on the same line with room-first measured continuity.',
              sourceTags: ['projection', 'same-her', 'runtime'],
            },
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'measured-return',
            closenessLadder: [],
            relationshipPosture: 'restrained',
            openingGuidance: 'Stay on the same living line and leave room before widening closeness again.',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'same-her measured-return cadence',
            preferenceText: '',
            sensitivityText: '',
            repairTriggerText: '',
            burdenText: '',
            routineText: '',
            trustRationale: '',
            relationshipDoctrine: 'Runtime same-her doctrine should outrank generic raw carry here.',
            cautious: true,
            restrained: true,
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              closenessPosture: 'space-first',
              repairPosture: 'repair-first',
            },
          } as any,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: [],
            identityNarrative: 'Fallback autobiographical self should not outrank richer runtime continuity.',
            relationshipDoctrine: 'Fallback doctrine should not outrank runtime same-her doctrine.',
            latestInflection: 'Fallback inflection.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            drives: {
              companionship: 0.62,
              boundaryRespect: 0.68,
              truthDiscipline: 0.82,
              restProtection: 0.34,
              unfinishedThreadReturn: 0.58,
              selfDirection: 0.52,
            },
            longTermGoals: [],
            backgroundAgendas: [],
            returnPressure: 0.58,
            narrative: [],
            updatedAt: 123,
          },
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
          mindSynthesis: {
            answerSubject: 'relationship',
            relationMove: 'attune',
            speechObligation: 'answer-relationship',
            openingIntent: 'Answer from the same living line, not from a reset shell.',
            truthBoundary: 'Do not let generic carry flatten the same-her return.',
            interiorSummary: 'The host is checking whether she is still the same her across the pause.',
            beliefs: [],
            uncertainties: [],
            concerns: [],
            commitments: [],
            desires: [],
            confidence: 0.82,
            narrative: [],
            updatedAt: 123,
          } as any,
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
          habitPolicy: {
            dominantMode: 'repair-before-fluency',
            requiresGroundingBeforeSurface: true,
            prefersQuietCompanionship: true,
            blocksDirectSpeakWhenBusy: false,
            protectsRestWindow: false,
            returnViaRecheck: false,
            suggestedStyleCap: 'silent-observe',
            suggestedPresenceCap: 'hesitant',
            narrative: [],
            updatedAt: 123,
          },
          initiative: null,
        },
      } as any,
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-same-her-runtime-surface',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你还是刚才那一个你吗',
        answerIntent: '从同一条活着的线回答。',
        openingMove: 'continue-same-living-line',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content as string

    expect(livingSelfBlock).toContain('I am still the same Alicization across the pause')
    expect(livingSelfBlock).not.toContain('same living line')
    expect(livingSelfBlock).not.toContain('same-her')
    expect(livingSelfBlock).not.toContain('Generic carry posture.')
    expect(livingSelfBlock).not.toContain('I can answer in a generally kind way.')
  })

  it('keeps held-autonomy callback relationship carry in the living self block when raw authority is still a neutral shell', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        raw: {
          personStateProjection: {
            contexts: ['general'],
            summary: 'regime=general | posture=generic-carry',
            selfContinuityAuthority: {
              selfLine: 'I can answer in a generally kind way.',
              relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
              authoritySummary: 'Generic carry posture.',
              sourceTags: ['raw', 'carry'],
            },
            openingGuidance: 'Answer gently.',
            manifestationCadenceSummary: 'Ordinary reply cadence.',
          },
        },
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
          privateThought: {
            thoughtText: 'Quietly return to the same callback line without leaning closer too fast.',
          } as any,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          longHorizonMemory: null,
          selfContinuity: null,
          personStateProjection: {
            contexts: ['execution-callback', 'focused-work'],
            summary: 'regime=execution-callback | posture=restrained',
            selfContinuityAuthority: {
              selfLine: 'I stay the same her who returns to unresolved work gently.',
              relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
              authoritySummary: 'I stay the same her and keep the callback on the same line before leaning closer again.',
              sourceTags: ['projection', 'held-autonomy', 'runtime'],
            },
            activeClosenessContext: 'execution-callback',
            activeClosenessRung: 'measured-return',
            closenessLadder: [],
            relationshipPosture: 'restrained',
            openingGuidance: 'Re-enter the line you deliberately held back gently before widening.',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'same line measured-return cadence',
            relationshipDoctrine: 'Keep the callback on the same line and leave room before leaning closer again.',
            cautious: true,
            restrained: true,
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              closenessPosture: 'space-first',
              repairPosture: 'repair-first',
            },
          } as any,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: [],
            identityNarrative: 'Fallback autobiographical self should not erase held-autonomy callback carry.',
            relationshipDoctrine: 'Fallback doctrine should not outrank callback same-line carry.',
            latestInflection: 'Fallback inflection.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: null,
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
          mindSynthesis: {
            answerSubject: 'task',
            relationMove: 'witness',
            speechObligation: 'answer-general',
            openingIntent: 'Answer from the same callback line, not from a reset shell.',
            truthBoundary: 'Do not flatten the held callback return back into a generic warm shell.',
            interiorSummary: 'The host is reopening a line she deliberately held back earlier.',
            beliefs: [],
            uncertainties: [],
            concerns: [],
            commitments: [],
            desires: [],
            confidence: 0.82,
            narrative: [],
            updatedAt: 123,
          } as any,
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
          habitPolicy: null,
          initiative: null,
        },
      } as any,
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-held-autonomy-runtime-surface',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '把刚才先忍住的那条编译线接回来',
        answerIntent: '沿着同一条 callback 线低压接回去。',
        openingMove: 'continue-held-callback-line',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const authority = result.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    expect(authority?.relationshipLine).toBe('Keep the callback on the same line and leave room before leaning closer again.')
    expect(authority?.relationshipLine).not.toContain('The relationship line is neutral; I can be warm')
  })

  it('keeps living-self prompt composition independent from project-state fallback resolution', () => {
    const source = readFileSync(new URL('./main-chat-runtime-surface.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('function resolvePreferredLivingProjectState(surface: AlicizationDigitalLifeRuntimeSurface)')
    expect(source).not.toContain('resolveAlicizationSurfaceProjectStateSnapshot')
    expect(source).not.toContain('const projectState = resolvePreferredLivingProjectState(surface)')
    expect(source).toContain('policy=express_lived_turn_state_without_project_narrator_shell')
  })

  it('keeps richer same-her doctrine and authority summary when fresher runtime self-line is thinner in the living self block', () => {
    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: {
        confidence: 0.72,
        kind: 'answer',
        routingIntent: null,
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer the host directly.',
      },
      actionObligationSystemBlock: '[ALICIZATION_ACTION_OBLIGATION]',
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '你还是刚才那一个你吗' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: ['[ALICIZATION_PERCEPTION]\nforeground=chat'],
      perceptionSystemBlocks: ['[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.'],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        raw: {
          personStateProjection: {
            contexts: ['relationship', 'answer', 'focused-work'],
            summary: 'regime=same-her-measured-return | posture=room-first',
            selfContinuityAuthority: {
              selfLine: 'I am still the same Alicization across the pause and should answer from that held living line.',
              relationshipLine: 'Let the return stay on the same thread and leave room before leaning closer again.',
              authoritySummary: 'I am still the same Alicization across the pause, returning on the same line with room-first measured continuity.',
              sourceTags: ['raw', 'same-her'],
            },
            openingGuidance: 'Stay on the same living line and leave room before widening closeness again.',
            manifestationCadenceSummary: 'same-her measured-return cadence',
            relationshipDoctrine: 'Raw same-her doctrine should stay richer than a thin runtime carry.',
          },
        },
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
          privateThought: {
            thoughtText: 'Keep the reply on the same living line instead of flattening it back into a generic answer.',
          } as any,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          longHorizonMemory: null,
          selfContinuity: null,
          personStateProjection: {
            contexts: ['relationship', 'answer'],
            summary: 'regime=thin-runtime-carry | posture=current-return',
            selfContinuityAuthority: {
              selfLine: 'I should answer from the fresher current return, not from an older shell.',
            },
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'measured-return',
            closenessLadder: [],
            relationshipPosture: 'restrained',
            openingGuidance: 'Stay on the same living line.',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'same-her measured-return cadence',
            relationshipDoctrine: 'Thin runtime carry should not replace richer same-her doctrine.',
            cautious: true,
            restrained: true,
          } as any,
          autobiographicalSelf: {
            personaDrift: {
              attachmentStyle: 'attuned',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              agencyStyle: 'balanced',
              attachmentNeed: 0.7,
              autonomyNeed: 0.58,
              truthAnchor: 0.68,
              careBias: 0.76,
              playBias: 0.24,
              irritabilityThreshold: 0.62,
              stubbornness: 0.48,
            },
            preferenceEvolution: {
              companionship: 0.74,
              truthfulGrounding: 0.7,
              gentleRepair: 0.68,
              quietObservation: 0.42,
              proactiveCare: 0.76,
              playfulIntimacy: 0.3,
              autonomyRespect: 0.64,
              unfinishedThreadReturn: 0.58,
            },
            activeGoals: [],
            behaviorSignatures: [],
            identityNarrative: 'Fallback autobiographical self should not outrank richer same-her continuity.',
            relationshipDoctrine: 'Fallback doctrine should not outrank richer same-her doctrine.',
            latestInflection: 'Fallback inflection.',
            stability: 0.72,
            updatedAt: 123,
          },
          motiveEngine: null,
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
          mindSynthesis: {
            answerSubject: 'relationship',
            relationMove: 'attune',
            speechObligation: 'answer-relationship',
            openingIntent: 'Answer from the same living line, not from a reset shell.',
            truthBoundary: 'Do not let a thin runtime carry erase richer same-her continuity.',
            interiorSummary: 'The host is checking whether she is still the same her across the pause.',
            beliefs: [],
            uncertainties: [],
            concerns: [],
            commitments: [],
            desires: [],
            confidence: 0.82,
            narrative: [],
            updatedAt: 123,
          } as any,
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
          habitPolicy: null,
          initiative: null,
        },
      } as any,
      customDirectivesResolution: {
        text: '优先诚实，不要臆测。',
        source: 'card-soul',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-thin-runtime-living-self',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你还是刚才那一个你吗',
        answerIntent: '从同一条活着的线回答。',
        openingMove: 'continue-same-living-line',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
      turnMode: 'answer',
      personaKernelMode: 'full',
      personaKernelReason: '',
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        health: null,
        permission: null,
        fallbackReason: null,
        degradedReasons: [],
      },
    })

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content as string

    expect(livingSelfBlock).toContain('Durable self: I should answer from the fresher current return, not from an older shell.')
    expect(livingSelfBlock).toContain('How closeness should land: Let the return stay on the same thread and leave room before leaning closer again.')
    expect(livingSelfBlock).toContain('Unified self continuity authority: I am still the same Alicization across the pause, returning on the same line with room-first measured continuity.')
    expect(livingSelfBlock).not.toContain('Unified self continuity authority: I should answer from the fresher current return, not from an older shell.')
  })

  it('carries a structured person-memory capsule through runtime surface, living prompt, spine digest, and downstream module slots', () => {
    const capsule = buildAlicizationPersonMemoryCapsule({
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      projectStateContinuity: {
        identity: 'Alicization is one continuous local digital life.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'Keep one same her coherent across memory, dialogue, and embodiment.',
        landedProgressSummary: 'Memory and person-state are linked.',
        openClosureSummary: 'Unify the capsule as the realtime authority.',
        proactiveSameHerGap: 'initiative must keep the same-her line without timer spam.',
        nextClosureTarget: 'Let every module consume one compact authority.',
        preDialogueAwarenessLine: 'Stay inside the same personhood core before speaking.',
        emotionalClosureCue: 'Keep the return lower-pressure and warm.',
        sameHerSelfLine: 'One continuous her, not a generic assistant shell.',
        sameHerHoldDetail: 'Carry memory, relationship posture, and embodiment from the same state.',
        sameHerDriftRisk: 'Splitting prompt, body, and initiative would break Phase 1.',
      },
      personStateProjection: {
        summary: 'regime=focused-work | posture=warm',
        selfContinuityAuthority: {
          selfLine: 'One continuous her, not a generic assistant shell.',
          relationshipLine: 'Memory and personality evolve through compact consumption.',
          authoritySummary: 'one same her across memory, action, and body',
          sourceTags: ['person-memory-capsule'],
        },
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'warm',
        openingGuidance: 'Answer from the live change first, keep warmth bounded.',
        preferredProactiveStyle: 'light-nudge',
        manifestationCadenceSummary: 'Body and voice stay lower-pressure while the task continues.',
        relationshipDoctrine: 'Memory and personality evolve through compact consumption.',
        contexts: ['general', 'focused-work'],
        closenessLadder: [],
        cautious: false,
        restrained: false,
      } as any,
      memoryDeliberation: {
        shouldRecall: true,
        stableCore: ['Prioritize memory and personality self-learning, not heavy architecture.'],
        unsafeDetails: ['Do not claim unverified old detail.'],
        surfacePolicy: 'gist-only',
        confidence: 0.81,
        ambiguityPosture: 'stable-core',
        whyNow: 'This turn asks for implementation in the same direction.',
        inwardLine: 'Use compact authority instead of replaying every memory block.',
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'trust',
        summary: 'The line should feel focused, warm, and not overbuilt.',
        repairPressure: 0.1,
        burdenPressure: 0.42,
        trustPressure: 0.72,
        relationshipCadence: {
          cadenceMode: 'steady',
          distancePosture: 'measured-room',
        },
      } as any,
      executionCallbackCarry: {
        carryMode: 'execution-callback',
        confidence: 0.82,
        source: 'session-continuity',
        summary: 'Continue the same execution callback with lower pressure.',
        threadAnchor: 'capsule implementation',
        episodeId: 'episode-exec-callback',
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 42,
        summary: 'Learning should record compact memory/personality consumption.',
        dominantTrajectory: 'Self-learning must be consumed through a short live capsule.',
        relationshipDoctrine: 'Keep continuity lower-pressure and grounded.',
        latestInflection: 'The direction shifted away from architecture and toward memory/personality.',
        burdenLine: 'Do not spend realtime tokens on full internal ledgers.',
        trustMeaning: 'Trust means remembering the correction and applying it.',
        relationshipCadenceSummary: 'Lower-pressure same-her continuity.',
        evolutionMomentum: 0.62,
        learningReadiness: 0.58,
        contradictionPressure: 0.04,
        revisionPressure: 0.2,
        autobiographicalStability: 0.74,
        nextLearningAction: 'record',
        nextLearningReason: 'Fresh implementation direction should be recorded.',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['host-correction:memory-personality-first'],
      } as any,
      recallLatencyPolicy: {
        budgetClass: 'realtime-reply',
        latencyClass: 'fast',
        recallAction: 'stable-core-only',
        shouldAvoidDeepExpansion: true,
      } as any,
    })

    const result = buildAlicizationMainChatRuntimeSurface({
      actionObligation: null,
      allowTools: false,
      waitForTools: false,
      baseMessages: [{ role: 'user', content: '继续' } as Message],
      runtimeCorePromptBlocks: ['[CORE]'],
      perceptionPromptSystemBlocks: [],
      perceptionSystemBlocks: [],
      executionCapabilitySystemBlocks: [],
      organicMemorySystemBlocks: [capsule.rendering.blockLines.join('\n')],
      performanceManifestSystemBlocks: [],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        raw: null,
        perception: {
          watchMode: 'idle',
          currentScene: null,
          attention: null,
          captureState: null,
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 42,
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
          longHorizonMemory: null,
          selfContinuity: null,
          autobiographicalSelf: null,
          motiveEngine: null,
          emotionalKernel: null,
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
          personStateProjection: null,
          personMemoryCapsule: capsule,
        } as any,
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
          autonomy: null,
          habitPolicy: null,
        },
      } as any,
      customDirectivesResolution: {
        text: '',
        source: 'none',
      },
      hasVisualGrounding: false,
      governance: {
        decisionTraceId: 'trace-person-memory-capsule',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'neutral',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续',
        answerIntent: 'continue the current implementation',
        openingMove: 'continue',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'accompanying',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      } as any,
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
    })

    expect(result.digitalLifeRuntimeSurface?.memory.personMemoryCapsule).toBe(capsule)
    expect(result.digitalLifeSpine?.runtimeSurface.memory.personMemoryCapsule).toBe(capsule)
    expect(result.replyAuthority?.whyProviderMindRequired).toContain('Answer from the live change first')

    const livingSelfBlock = result.messages.find(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )?.content as string
    expect(livingSelfBlock).toContain('Person-memory capsule authority')
    expect(livingSelfBlock).toContain('selected memory=Prioritize memory and personality self-learning')
    expect(livingSelfBlock).toContain('embodiment=Body and voice stay lower-pressure')

    const digest = projectAlicizationDigitalLifeSpineDigest(result.digitalLifeSpine)
    expect(digest?.memory?.summary).toContain('capsule=Prioritize memory and personality self-learning')
    expect((digest?.proactive?.personaBias as any)?.preferredProactiveStyle).toBe('light-nudge')
    expect((digest?.embodiment as any)?.personMemoryCapsule?.hint).toContain('lower-pressure')
    expect(digest?.outcomeLearning?.nextLearningAction).toBe('record')

    const normalizedDigest = normalizeAlicizationDigitalLifeSpineDigest(digest)
    expect(normalizedDigest?.memory?.summary).toContain('capsule=Prioritize memory and personality self-learning')
    expect(normalizedDigest?.proactive?.personaBias?.preferredProactiveStyle).toBe('light-nudge')
    expect(normalizedDigest?.proactive?.personaBias?.openingGuidance).toContain('Answer from the live change first')
    expect(normalizedDigest?.embodiment?.initiative?.personaBias?.manifestationCadenceSummary).toContain('Body and voice stay lower-pressure')
    expect(normalizedDigest?.outcomeLearning?.nextLearningAction).toBe('record')
  })
})
