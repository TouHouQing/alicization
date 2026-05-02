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
        resumePendingThreadId: 'thread-proposal-1',
        resumePendingThreadChannel: 'codex',
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
      resumePendingThreadId: 'thread-proposal-1',
      resumePendingThreadChannel: 'codex',
    }))
    expect(result.tooling.enforcedToolNames).toEqual(['executor_run_codex', 'executor_run_openclaw'])
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

    expect(result.messages.some(message =>
      typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_LIVING_SELF]'),
    )).toBe(true)
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
