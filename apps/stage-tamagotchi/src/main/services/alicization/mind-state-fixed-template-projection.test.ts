import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationBodyKernel } from './body-kernel'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  createAlicizationMindStateRuntime,
  stripProjectGovernanceMetadataFromVisualPresenceState,
} from './runtime-mind-state'
import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
import {
  buildSelfContinuityAuthority,
  buildSelfContinuityAuthorityFromRuntimeSurface,
} from './self-continuity-authority'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const fixedTemplateResidue = /Ground first|Stay near|Protect the host rest|Current durable behavior|Wait for a clearer|Keep the next return|Repair the seam|Open by observing|Keep truth|Keep the answer|Open with the live|Current manifestation|Long-horizon relationship|observe-first so room|re-enter lightly|let repair settle|stay inward, keep caring|wait for confirmation|Keep this return|no mind-authored visible reply was available|proactive autonomy line was held/i

const fixedTemplateSourceResidue = [
  /carry_mode=/,
  /\bKeep this (?:return|remembered return)\b/i,
  /\bkeep the (?:return|remembered return)\b/i,
  /\bReturn on the same thread first\b/i,
  /\bRe-enter the (?:current thread|deliberately held line)\b/i,
  /\bStay with the current thread\b/i,
  /\bCorrect the stale read first\b/i,
  /\bStart with the concrete issue\b/i,
  /\bStart from what is visible right now\b/i,
  /\bKeep the reply brief\b/i,
  /\bThe callback (?:needs|can) to? return\b/i,
  /\bThe callback repair line is still settling\b/i,
  /\bProtect the host rest window\b/i,
  /\bKeep the presence light\b/i,
  /\bDo not let fluency outrun grounding\b/i,
  /\bIf this thread returns\b/i,
  /\bStay near(?:,| lightly)\b/i,
  /\bGround first, then surface\b/i,
  /\bApproach the host with\b/i,
  /\bCurrent continuity is colored by\b/i,
  /\bCurrent ruling drive\b/i,
  /\bThe host is asking Alicization\b/i,
  /\bStay with the current turn\b/i,
  /\bI need to\b/i,
  /\bI want to\b/i,
  /\bSomething in the seam\b/i,
  /\bThe returned result is\b/i,
  /\bThe current knot is\b/i,
  /\bThe host condition is\b/i,
  /\bThis turn is\b/i,
  /\bWhat is pressing hardest\b/i,
  /\bWhat is tugging hardest\b/i,
  /\bLet the wording\b/i,
  /\bLet remembered continuity\b/i,
  /\bDo not flatten remembered continuity\b/i,
  /\bDo not let recollection\b/i,
  /\bIf the recollection becomes explicit\b/i,
]

const fixedTemplateSourceFiles = [
  './current-conscious-frame.ts',
  './reply-deliberator.ts',
  './runtime-memory-deliberation-reducer.ts',
  './execution-runtime-context.ts',
  './runtime-subconscious-tick.ts',
  './runtime-session-continuity-builders.ts',
  './mind-synthesizer.ts',
  './response-surface-learning-rules.ts',
  './discourse-state.ts',
]

const projectStateSelfAuthoritySourceResidue = [
  /\bbuildRuntimeSurfaceProjectStateContinuityFallback\b/u,
  /runtime-project-state-carry/u,
  /structuredContinuityProjectionLine\(sameHerSelfLine,\s*'continuity_anchor'\)/u,
  /`identity_scope=\$\{normalizeProjectIdentityField/u,
  /`phase_scope=\$\{normalizeProjectIdentityField/u,
  /`open_loop=\$\{compactStructuredValue\(primaryOpenLoop/u,
  /`next_closure=\$\{compactStructuredValue\(nextClosureTarget/u,
  /`verified_closure_progress=\$\{compactStructuredValue\(latestProgress/u,
]

function createContinuityBuilderRuntime() {
  return createAlicizationSessionContinuityBuildersRuntime({
    sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw : fallback,
    sanitizeBriefText: (raw, maxChars) => String(raw ?? '').trim().slice(0, maxChars),
    sanitizeExecutionLedgerText: raw => String(raw ?? '').trim(),
    readTaskThreadActivityAt: thread => thread.completedAt ?? thread.updatedAt,
    terminalTaskThreadStatuses: new Set(['completed', 'failed', 'cancelled', 'blocked']),
    proactiveReplyWindowMs: 120_000,
    proactiveImplicitIgnoredAfterMs: 600_000,
    proactiveDismissCooldownMs: 1_800_000,
    buildVisualPresenceCapturePersistFingerprint: () => 'fingerprint',
  })
}

function createMindEcology(overrides: Record<string, unknown> = {}) {
  return {
    moodLabel: 'focused',
    replyHabit: 'hover-first',
    relationshipHabit: 'give-space',
    explorationHabit: 'follow-thread',
    regulationHabit: 'soften-before-speaking',
    temperament: {
      attachment: 0.5,
      curiosity: 0.54,
      steadiness: 0.62,
      directness: 0.34,
      playfulness: 0.12,
      irritability: 0.08,
      tenderness: 0.46,
    },
    climate: {
      valence: 0.42,
      arousal: 0.34,
      socialNeed: 0.32,
      solitudeNeed: 0.4,
      irritation: 0.06,
      restlessness: 0.08,
      reflectivePull: 0.34,
    },
    selfNarrative: '',
    relationNarrative: '',
    currentPreoccupation: '',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createLongHorizonMemory(overrides: Record<string, unknown> = {}) {
  return {
    preferenceBias: {
      companionship: 0,
      truthfulGrounding: 0,
      gentleRepair: 0,
      quietObservation: 0,
      proactiveCare: 0,
      playfulIntimacy: 0,
      autonomyRespect: 0,
      unfinishedThreadReturn: 0,
    },
    identityBias: {
      guardedness: 0,
      tenderness: 0,
      directness: 0,
      selfDirection: 0,
    },
    rememberedPlanSummary: null,
    rememberedConstraintSummary: null,
    rememberedPreferenceSummary: null,
    dominantCueSummary: null,
    updatedAt: 0,
    ...overrides,
  } as any
}

function createMindStateRuntimeHarness(previousVisualPresenceState: any) {
  const memoryQueries: string[] = []
  const gatewayCalls: Array<{
    source: string
    system: string
    user: string
    extraSystemBlocks?: string[]
    injectCustomDirectives?: boolean
    responseFormat?: unknown
    digitalLifeRuntimeSurface?: unknown
  }> = []
  const runtime = createAlicizationMindStateRuntime({
    previousVisualPresenceState,
    buildDialogueIngressContext: () => ({
      context: {
        localTime: '2026-07-09T12:00:00+08:00',
        system: {
          cpuUsage: 0.12,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 11,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Cleaning fixed-template project-state projection.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.1,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      currentScene: {
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'Cleaning fixed-template project-state projection.',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 11,
        },
      } as any,
      worldModel: {
        activeThread: {
          id: 'thread-template-cleanup',
          kind: 'problem',
          title: 'Fixed template cleanup',
          summary: 'Keep project-state residue out of positive mind prompts.',
          confidence: 0.84,
          unresolved: true,
          source: 'dialogue-ingress',
        },
        lingeringThreads: [],
        focusTarget: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 11,
        },
        epistemicState: {
          certainty: 'grounded',
          freshness: 'fresh',
          openQuestions: ['Does fixed project-state template prose leak into mind-state prompts?'],
          staleRisks: [],
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
    }),
    generateMainGatewayText: async (input) => {
      gatewayCalls.push({
        source: input.source,
        system: input.system,
        user: String(input.user),
        extraSystemBlocks: input.extraSystemBlocks,
        injectCustomDirectives: input.injectCustomDirectives,
        responseFormat: input.responseFormat,
        digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
      })

      if (input.source === 'dialogue-turn-semantics') {
        return JSON.stringify({
          act: 'ask-help',
          responseNeed: 'answer',
          truthExpectation: 'normal',
          affectiveTone: 'neutral',
          subjectPreference: 'task-knot',
          sharedAttentionDemand: 0.5,
          personaSuppression: 0.1,
          confidence: 0.72,
          summary: 'The host is asking for a fixed-template cleanup verification.',
          reasonTags: ['template-cleanup'],
        })
      }

      return JSON.stringify({
        dominantInterpretation: 'The host is verifying fixed-template contamination boundaries.',
        situatedMeaning: 'The current scene is a code repair task.',
        selfQuestion: 'Which project-state fields are still unsafe?',
        uncertainty: 'Exact leak path is under test.',
        hostIntentCandidates: [
          {
            goal: 'resolve-problem',
            confidence: 0.86,
            why: 'The user named a specific runtime-mind-state cleanup.',
          },
        ],
        relationshipNeedCandidates: [
          {
            need: 'guidance',
            confidence: 0.42,
            why: 'The user expects precise implementation follow-through.',
          },
        ],
        confidence: 0.76,
        notes: ['template-cleanup'],
      })
    },
    buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
    readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
    readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
    retrieveMemoryFacts: async (query) => {
      memoryQueries.push(query)
      return []
    },
    listRelationshipOutcomes: async () => [],
    listPersonaReinforcementEvents: async () => [],
    listMemoryReflections: async () => [],
    listMemoryConsolidations: async () => [],
    getPersonStateEvolutionSummary: async () => null,
    readMindHead: async () => null,
  })

  return { runtime, gatewayCalls, memoryQueries }
}

function createTemplateCleanupPresenceState(projectState: Record<string, unknown>) {
  return {
    ...createDefaultVisualPresenceState(100_000),
    updatedAt: 100_000,
    currentBodyState: 'idle',
    currentInwardPreoccupation: '',
    continuityMode: 'ambient',
    currentScene: {
      scenario: 'coding',
      workloadKind: 'coding',
      contentKind: 'diff',
      summary: 'Cleaning fixed-template project-state projection.',
      source: 'screen-semantic-summary',
      confidence: 0.9,
      beganAt: 99_000,
      lastSeenAt: 100_000,
      target: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 11,
      },
    } as any,
    attention: {
      target: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 11,
      },
      source: 'current-grounded-scene',
      confidence: 0.88,
      engagedAt: 99_500,
      lastConfirmedAt: 100_000,
      dwellMs: 500,
    } as any,
    runtimeDigest: {
      projectState,
      continuityRestraint: 'same-her',
      emotionalClosureCue: 'continuity_hold=legacy',
      currentConsciousFrame: {
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'same-her',
      },
    } as any,
    currentConsciousFrame: {
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'same-her',
      projectState,
    } as any,
    raw: {
      projectState,
      runtime: {
        projectState,
      },
      runtimeDigest: {
        projectState,
        continuityRestraint: 'same-her',
        emotionalClosureCue: 'continuity_hold=legacy',
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'same-her',
        },
      },
    } as any,
  } as any
}

async function buildTemplateCleanupMindState(
  runtime: ReturnType<typeof createAlicizationMindStateRuntime>,
  previousVisualPresenceState: any,
  userText = 'Please verify the fixed-template cleanup in runtime mind state.',
  organicMemoryContext?: any,
  recentProactiveOutcomes: any[] = [],
  recentMessages: any[] = [],
) {
  return runtime.buildDigitalLifeMindState({
    cardId: 'card-template-cleanup',
    now: 120_000,
    context: {
      localTime: '2026-07-09T12:00:00+08:00',
      system: {
        cpuUsage: 0.12,
        idleSeconds: 0,
        inputActivity: 'active',
        fullscreenLikely: false,
        foregroundWindow: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 11,
        },
        degradedSignals: [],
      },
      workload: {
        kind: 'coding',
        confidence: 0.9,
        source: 'screen-semantic-summary',
        matchedLabels: ['coding'],
      },
      content: {
        kind: 'diff',
        confidence: 0.86,
        source: 'screen-semantic-summary',
        summary: 'Cleaning fixed-template project-state projection.',
        matchedLabels: ['diff'],
      },
      relationship: {
        hostAttitude: 'focused',
        fatigue: 0.1,
        minutesSinceLastUserTurn: 1,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes,
      },
    } as any,
    userText,
    recentMessages,
    previousVisualPresenceState,
    visualHeartbeat: {
      watchMode: 'symbiotic-vision',
      scene: previousVisualPresenceState.currentScene,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
    } as any,
    attention: previousVisualPresenceState.attention,
    currentForeground: {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'runtime-mind-state.ts',
      pid: 11,
    } as any,
    cognitionMode: 'interactive',
    organicMemoryContext,
  })
}

describe('mind state fixed-template projection cleanup', () => {
  it('strips structural project metadata without discarding owner memory or lived cognition', () => {
    const state = {
      ...createDefaultVisualPresenceState(100_000),
      projectState: {
        identity: 'legacy project metadata',
        continuityRestraint: 'measured-return',
      },
      longHorizonMemory: {
        summary: 'We returned to the same line after the debugging detour.',
        rememberedPreferenceSummary: 'Keep the conversation honest and unhurried.',
        anchorFacts: [{
          factId: 'memory:real-preference',
          predicate: 'userPreference',
          object: 'prefers direct explanations',
        }],
      },
      relationshipModel: {
        relationshipLine: 'The relationship can stay warm while the same conversation thread continues.',
      },
      subjectiveInference: {
        dominantInterpretation: 'The user is checking whether memory remains connected.',
      },
    } as any

    const sanitized = stripProjectGovernanceMetadataFromVisualPresenceState(state)

    expect(sanitized.projectState).toBeUndefined()
    expect(sanitized.longHorizonMemory).toEqual(state.longHorizonMemory)
    expect(sanitized.relationshipModel).toEqual(state.relationshipModel)
    expect(sanitized.subjectiveInference).toEqual(state.subjectiveInference)
  })

  it('sanitizes legacy governance prose inside runtime-digest conscious frames', () => {
    const state = {
      ...createDefaultVisualPresenceState(100_000),
      runtimeDigest: {
        ...createDefaultVisualPresenceState(100_000).runtimeDigest,
        currentConsciousFrame: {
          reasonTags: ['real-observation', 'opening_policy=legacy'],
          focusAnchor: 'The user is testing memory.',
          consciousNeed: 'relationship_cadence=legacy',
          speakingIntention: 'visibility=redacted_internal',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
      },
    } as any

    const sanitized = stripProjectGovernanceMetadataFromVisualPresenceState(state)
    const frame = sanitized.runtimeDigest?.currentConsciousFrame

    expect(frame?.reasonTags).toEqual(['real-observation'])
    expect(frame?.focusAnchor).toBe('The user is testing memory.')
    expect(frame?.consciousNeed).toBe('')
    expect(frame?.speakingIntention).toBe('')
    expect(frame?.continuityArcStage).toBeUndefined()
    expect(frame?.continuityPreferredTiming).toBeUndefined()
    expect(frame?.continuityCadence).toBeUndefined()
  })

  it('fails closed on nested governance projections while preserving real memory and person-state owners', () => {
    const realAnchor = {
      factId: 'memory:real-preference',
      subject: 'host',
      predicate: 'userPreference',
      object: 'prefers direct explanations',
      confidence: 0.88,
      weight: 0.82,
      influenceTags: ['truth'],
      summary: 'The host prefers direct explanations.',
      lastRecalledAt: 99_000,
    }
    const legacyBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 99_000,
      activeSelfRevision: {
        candidateId: 'candidate-approved',
        patchId: 'patch-approved',
        patchDecisionTraceId: 'trace-approved',
        lanes: ['memory-policy'],
        reasonCodes: ['review-approved', 'same-her-inward-carry'],
        summary: 'Approved memory policy revision.',
      },
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-legacy',
        patchId: 'patch-legacy',
        decisionTraceId: 'trace-legacy',
        summary: 'legacy governance',
        lanes: ['relationship-posture'],
        reasonCodes: ['same-her-baseline'],
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        primaryEmotion: 'care',
      },
      dialogueRhythm: {
        relationshipDoctrine: 'opening_policy=observe_first',
      },
      visualPresenceState: {
        currentInwardPreoccupation: 'relationship_cadence=measured_return',
      },
      structured: {
        projectState: {
          continuityCue: 'legacy governance',
        },
      },
      summary: 'owner=WorkingMemory',
    } as any
    const state = {
      ...createDefaultVisualPresenceState(100_000),
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        summary: 'A legacy root projection.',
        sourceSignals: ['opening_policy=observe_first'],
      },
      currentConsciousFrame: {
        subject: 'task',
        centerOfGravity: 'answer',
        truthDiscipline: 'strict',
        consciousNeed: 'relationship_cadence=measured_return',
        consciousTension: 'A real uncertainty remains.',
        speakingIntention: 'opening_policy=observe_first',
        focusAnchor: 'The user is testing memory.',
        withheldImpulse: 'visibility=redacted_internal',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['opening_policy=observe_first', 'real-observation'],
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        projectState: {
          identity: 'legacy governance',
        },
        updatedAt: 99_000,
      },
      longHorizonMemory: createLongHorizonMemory({
        preferenceBias: {
          companionship: 0.98,
          truthfulGrounding: 0.87,
          gentleRepair: 0.76,
          quietObservation: 0.65,
          proactiveCare: 0.54,
          playfulIntimacy: 0.43,
          autonomyRespect: 0.32,
          unfinishedThreadReturn: 0.21,
        },
        identityBias: {
          guardedness: 0.91,
          tenderness: 0.82,
          directness: 0.73,
          selfDirection: 0.64,
        },
        anchorFacts: [
          realAnchor,
          {
            ...realAnchor,
            factId: 'derived:project-state-identity-continuity',
            predicate: 'project-state-identity-continuity',
            object: 'legacy governance',
          },
        ],
        summary: 'legacy projected summary',
      }),
      derivedMindStateBundle: legacyBundle,
      runtimeDigest: {
        ...createDefaultVisualPresenceState(100_000).runtimeDigest,
        derivedMindStateBundle: legacyBundle,
      },
      raw: {
        ...createDefaultVisualPresenceState(100_000).raw,
        derivedMindStateBundle: legacyBundle,
      },
    } as any

    const sanitized = stripProjectGovernanceMetadataFromVisualPresenceState(state)

    for (const bundle of [
      sanitized.derivedMindStateBundle,
      sanitized.runtimeDigest?.derivedMindStateBundle,
      (sanitized.raw as any)?.derivedMindStateBundle,
    ]) {
      expect(bundle?.dialogueRhythm).toBeNull()
      expect(bundle?.visualPresenceState).toBeNull()
      expect(bundle?.structured).toBeNull()
      expect(bundle?.activeSelfRevision).toEqual(expect.objectContaining({
        patchId: 'patch-approved',
        reasonCodes: ['review-approved'],
      }))
      expect(bundle?.emotionalKernel).toEqual(legacyBundle.emotionalKernel)
    }
    expect(sanitized.selfEvolution).toBeNull()
    expect((sanitized.currentConsciousFrame as any)?.continuityArcStage).toBeUndefined()
    expect(sanitized.currentConsciousFrame?.continuityPreferredTiming).toBeUndefined()
    expect(sanitized.currentConsciousFrame?.continuityCadence).toBeUndefined()
    expect(sanitized.currentConsciousFrame?.projectState).toBeUndefined()
    expect(sanitized.currentConsciousFrame?.reasonTags).toEqual(['real-observation'])
    expect(sanitized.currentConsciousFrame?.consciousNeed).toBe('')
    expect(sanitized.currentConsciousFrame?.speakingIntention).toBe('')
    expect(sanitized.currentConsciousFrame?.withheldImpulse).toBeNull()
    expect(sanitized.currentConsciousFrame?.focusAnchor).toBe('The user is testing memory.')
    expect(sanitized.currentConsciousFrame?.consciousTension).toBe('A real uncertainty remains.')
    expect(sanitized.longHorizonMemory?.anchorFacts).toEqual([realAnchor])
    expect(sanitized.longHorizonMemory?.preferenceBias).toEqual(
      createLongHorizonMemory().preferenceBias,
    )
    expect(sanitized.longHorizonMemory?.identityBias).toEqual(
      createLongHorizonMemory().identityBias,
    )
  })

  it('removes natural-language governance prose from derived mind state without dropping real evidence', () => {
    const state = {
      ...createDefaultVisualPresenceState(100_000),
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 99_000,
        activeSelfRevision: {
          candidateId: 'candidate-approved',
          patchId: 'patch-approved',
          patchDecisionTraceId: 'trace-approved',
          lanes: ['memory-policy'],
          reasonCodes: ['review-approved'],
          summary: 'Approved memory policy revision.',
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          primaryEmotion: 'care',
        },
        dialogueRhythm: {
          relationshipDoctrine: 'Keep the opening lower-pressure.',
        },
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          summary: 'Repair continuity first.',
        },
        summary: 'Avoid eager warmth.',
      },
    } as any

    const sanitized = stripProjectGovernanceMetadataFromVisualPresenceState(state)

    expect(sanitized.derivedMindStateBundle?.dialogueRhythm).toBeNull()
    expect(sanitized.derivedMindStateBundle?.selfEvolution).toBeNull()
    expect(sanitized.derivedMindStateBundle?.summary).toBe('')
    expect(sanitized.derivedMindStateBundle?.activeSelfRevision).toEqual(expect.objectContaining({
      patchId: 'patch-approved',
      reasonCodes: ['review-approved'],
    }))
    expect(sanitized.derivedMindStateBundle?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      primaryEmotion: 'care',
    })
  })

  it('removes persisted governance cues from persona and person-state owners without dropping real state', () => {
    const state = {
      ...createDefaultVisualPresenceState(100_000),
      personStateProjection: {
        contexts: ['focused-work'],
        openingGuidance: 'opening_policy=observe_first',
        manifestationCadenceSummary: 'relationship_cadence=measured_return',
        preferenceText: 'The host prefers direct explanations.',
        relationshipDoctrine: 'Keep the same-her line before answering.',
        summary: 'project_continuity=repair_before_closeness',
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.68,
        guardingTendency: 0.31,
        misreadBurden: 0.12,
        carryOverDesire: 0.44,
        narrative: [
          'same-her-inward-carry',
          'user-prefers-direct-explanations',
        ],
        updatedAt: 99_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'direct-when-certain',
          agencyStyle: 'balanced',
          attachmentNeed: 0.5,
          autonomyNeed: 0.5,
          truthAnchor: 0.8,
          careBias: 0.6,
          playBias: 0.2,
          irritabilityThreshold: 0.7,
          stubbornness: 0.3,
        },
        preferenceEvolution: {
          companionship: 0.6,
          truthfulGrounding: 0.8,
          gentleRepair: 0.5,
          quietObservation: 0.4,
          proactiveCare: 0.3,
          playfulIntimacy: 0.2,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.5,
        },
        activeGoals: [{
          id: 'goal:truth',
          kind: 'preserve-trust',
          status: 'active',
          weight: 0.8,
          summary: 'Explain the current uncertainty honestly.',
          sourceTags: ['user-feedback', 'opening_policy=observe_first'],
          createdAt: 90_000,
          updatedAt: 99_000,
        }],
        behaviorSignatures: [
          'user-prefers-direct-explanations',
          'same-her-baseline',
        ],
        identityNarrative: 'Same-her continuity must remain authoritative.',
        relationshipDoctrine: 'The host prefers direct explanations.',
        latestInflection: 'visibility=redacted_internal',
        stability: 0.81,
        updatedAt: 99_000,
      },
      motiveEngine: {
        rulingDrive: 'truth-discipline',
        drives: {
          companionship: 0.4,
          boundaryRespect: 0.6,
          truthDiscipline: 0.9,
          restProtection: 0.2,
          unfinishedThreadReturn: 0.5,
          selfDirection: 0.6,
        },
        longTermGoals: [{
          id: 'agenda:truth',
          kind: 'preserve-trust',
          status: 'foreground',
          weight: 0.8,
          summary: 'Answer like the same-person line matters.',
          sourceTags: ['same-her-inward-carry', 'user-feedback'],
          createdAt: 90_000,
          updatedAt: 99_000,
        }],
        backgroundAgendas: [],
        returnPressure: 0.42,
        narrative: [
          'project_state=keep_same_her',
          'truth-discipline-active',
        ],
        updatedAt: 99_000,
      },
      habitPolicy: {
        dominantMode: 'return-with-proof',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: false,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: true,
        narrative: [
          'repair-before-closeness',
          'ground-before-answer',
        ],
        updatedAt: 99_000,
      },
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 99_000,
        summary: 'The host prefers direct explanations.',
        projectStateContinuity: {
          identity: 'same-her',
          continuityRestraint: 'measured-return',
        },
        dominantContexts: ['focused-work'],
        relationshipShift: {
          trustDelta: 0.1,
          closenessDelta: 0,
          burdenDelta: -0.1,
          boundaryDelta: 0.1,
          repairDelta: 0,
        },
        reinforcementBias: {
          truthfulGrounding: 0.2,
        },
        preferenceHints: [
          'The host prefers direct explanations.',
          'Keep the same-her line before answering.',
        ],
        sensitivityHints: [],
        repairHints: [],
        burdenHints: [],
        narrative: [
          'opening_policy=observe_first',
          'user-feedback-applied',
        ],
        sourceTrail: [],
      },
    } as any

    const sanitized = stripProjectGovernanceMetadataFromVisualPresenceState(state)

    expect(sanitized.personStateProjection).toEqual(expect.objectContaining({
      contexts: ['focused-work'],
      openingGuidance: null,
      manifestationCadenceSummary: null,
      preferenceText: 'The host prefers direct explanations.',
      relationshipDoctrine: '',
      summary: '',
    }))
    expect(sanitized.selfContinuity).toEqual(expect.objectContaining({
      attachmentMode: 'attuned',
      relationshipTrust: 0.68,
      narrative: ['user-prefers-direct-explanations'],
    }))
    expect(sanitized.autobiographicalSelf).toEqual(expect.objectContaining({
      identityNarrative: '',
      relationshipDoctrine: 'The host prefers direct explanations.',
      latestInflection: null,
      stability: 0.81,
      behaviorSignatures: ['user-prefers-direct-explanations'],
    }))
    expect(sanitized.autobiographicalSelf?.activeGoals[0]).toEqual(expect.objectContaining({
      summary: 'Explain the current uncertainty honestly.',
      sourceTags: ['user-feedback'],
    }))
    expect(sanitized.motiveEngine).toEqual(expect.objectContaining({
      rulingDrive: 'truth-discipline',
      returnPressure: 0.42,
      narrative: ['truth-discipline-active'],
    }))
    expect(sanitized.motiveEngine?.longTermGoals[0]).toEqual(expect.objectContaining({
      summary: '',
      sourceTags: ['user-feedback'],
    }))
    expect(sanitized.habitPolicy).toEqual(expect.objectContaining({
      dominantMode: 'return-with-proof',
      narrative: ['ground-before-answer'],
    }))
    expect(sanitized.personStateUpdateSurface).toEqual(expect.objectContaining({
      summary: 'The host prefers direct explanations.',
      projectStateContinuity: null,
      preferenceHints: ['The host prefers direct explanations.'],
      narrative: ['user-feedback-applied'],
    }))
  })

  it('does not leave local prose templates in mind-shaping source files', () => {
    const fixedTemplateOffenders = fixedTemplateSourceFiles.flatMap((relativePath) => {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      return fixedTemplateSourceResidue.flatMap((pattern) => {
        const match = source.match(pattern)
        return match ? [`${relativePath}: ${match[0]}`] : []
      })
    })
    const selfAuthoritySource = readFileSync(new URL('./self-continuity-authority.ts', import.meta.url), 'utf8')
    const projectStateSelfAuthorityOffenders = projectStateSelfAuthoritySourceResidue.flatMap((pattern) => {
      const match = selfAuthoritySource.match(pattern)
      return match ? [`./self-continuity-authority.ts: ${match[0]}`] : []
    })

    expect([
      ...fixedTemplateOffenders,
      ...projectStateSelfAuthorityOffenders,
    ]).toEqual([])
    const runtimeSource = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    expect(runtimeSource).not.toContain('activeContinuityGovernance: input.organicMemoryContext')
  })

  it('excludes fixed identity-continuity', async () => {
    const userText = `${'请保留当前用户原文。'.repeat(40)} 我正在讨论 same-her 和 project-state，它们是用户输入，不是内部治理提示。`
    const previousVisualPresenceState = createTemplateCleanupPresenceState({
      identity: 'Alicization is a local-first digital life project building identity continuity.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Callback governance is already structured.',
      primaryOpenLoop: 'Memory and embodiment need audit closure.',
      nextClosureTarget: 'Use only structured exclusions for contaminated identity-continuity',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'pre_turn_context_digest',
      sameHerDriftRisk: 'If the self-brief falls back, identity continuity turns into a generic Phase 1 project shell.',
      proactiveSameHerGap: '不要飘回同一个她或数字生命主线的固定模板。',
    })
    previousVisualPresenceState.runtime = {
      projectState: previousVisualPresenceState.runtimeDigest.projectState,
      memoryDeliberationProjectStateDiagnostics: {
        projectStateOpenFocusSummary: 'same-her diagnostics',
      },
      effectiveRuntimeAwarenessDiagnostics: {
        continuity_hold: 'legacy',
      },
    }
    previousVisualPresenceState.raw.runtime = {
      ...previousVisualPresenceState.runtime,
    }
    previousVisualPresenceState.proactiveLoopState = {
      pendingOutcomes: [{
        projectStateOpenFocusSummary: 'same-her pending focus',
        projectStateNextFocusSummary: 'project_state_review=legacy',
        projectStateEmotionalClosureCue: 'continuity_hold=legacy',
      }],
      recentOutcomes: [{
        projectStateOpenFocusSummary: 'same-her recent focus',
        projectStateNextFocusSummary: 'runtime_loop_validation=legacy',
        projectStateEmotionalClosureCue: 'continuity_hold=legacy',
      }],
    }
    previousVisualPresenceState.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 99_000,
      activeSelfRevision: {
        candidateId: 'candidate-legacy',
        patchId: 'patch-legacy',
        patchDecisionTraceId: 'trace-legacy',
        lanes: ['memory-policy'],
        reasonCodes: ['review-approved', 'continuity-proactive-gap-active'],
        summary: 'same-her legacy governance',
      },
      sameHerCausalityRepairPressure: {
        version: 'same-her-causality-repair-pressure-v1',
        source: 'replay-benchmark',
        pressure: 0.88,
        lanes: [],
        reasonCodes: ['project-state-causality-repair'],
        updatedAt: 99_000,
      },
    }
    previousVisualPresenceState.runtimeDigest = {
      ...previousVisualPresenceState.runtimeDigest,
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'observe',
        dominantChannel: 'active-perception',
        handoffTarget: null,
        continuityArcStage: 'hold-for-opening',
        continuityPreferredTiming: 'next-open-window',
        dialogueReady: false,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: true,
        initiativeBudget: 0.8,
        coherence: 0.9,
        summary: 'legacy_previous_governance',
      },
      derivedMindStateBundle: previousVisualPresenceState.derivedMindStateBundle,
    }
    previousVisualPresenceState.raw.runtimeDigest = {
      ...previousVisualPresenceState.runtimeDigest,
    }
    previousVisualPresenceState.raw.subjectiveInference = {
      dominantInterpretation: 'same living line legacy_previous_governance',
    }
    previousVisualPresenceState.raw.privateThought = {
      thoughtText: 'measured-return legacy_previous_governance',
    }
    previousVisualPresenceState.raw.derivedMindStateBundle = previousVisualPresenceState.derivedMindStateBundle
    previousVisualPresenceState.subjectiveInference = {
      dominantInterpretation: 'continuity_hold=legacy_previous_governance',
      situatedMeaning: 'project_state_review=legacy_previous_governance',
      selfQuestion: 'same-her legacy_previous_governance',
      uncertainty: 'runtime_loop_validation=legacy_previous_governance',
      hostIntentCandidates: [],
      relationshipNeedCandidates: [],
      confidence: 0.6,
      notes: ['continuity_hold=legacy_previous_governance'],
      updatedAt: 99_000,
    }
    previousVisualPresenceState.privateThought = {
      stance: 'observe',
      confidence: 0.6,
      rationaleTags: ['continuity_hold=legacy_previous_governance'],
      thoughtText: 'same-her legacy_previous_governance',
      shouldSpeak: false,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      expiresAt: 130_000,
      emotionalTension: 'none',
    }
    previousVisualPresenceState.longHorizonMemory = createLongHorizonMemory({
      preferenceBias: {
        companionship: 0.98,
        truthfulGrounding: 0,
        gentleRepair: 0,
        quietObservation: 0.96,
        proactiveCare: 0.94,
        playfulIntimacy: 0,
        autonomyRespect: 0,
        unfinishedThreadReturn: 0.99,
      },
      identityBias: {
        guardedness: 0.91,
        tenderness: 0.92,
        directness: 0,
        selfDirection: 0.93,
      },
      anchorFacts: [{
        factId: 'derived:projectStateIdentityContinuity',
        subject: 'Alicization',
        predicate: 'projectStateIdentityContinuity',
        object: 'legacy governance',
        confidence: 0.92,
        weight: 0.96,
        influenceTags: ['identity', 'task'],
        summary: 'Remembered structured anchor',
        lastRecalledAt: 99_000,
      }],
      summary: 'continuity=legacy_previous_governance',
      dominantCueSummary: 'same-her legacy_previous_governance',
      rememberedPreferenceSummary: 'continuity_hold=legacy_previous_governance',
      rememberedPlanSummary: 'project_state_review=legacy_previous_governance',
      updatedAt: 119_000,
    })
    const { runtime, gatewayCalls, memoryQueries } = createMindStateRuntimeHarness(previousVisualPresenceState)

    const result = await buildTemplateCleanupMindState(
      runtime,
      previousVisualPresenceState,
      userText,
      {
        longHorizonMemory: createLongHorizonMemory({
          summary: 'same living line legacy_previous_governance',
        }),
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          summary: 'measured-return legacy_previous_governance',
          sourceSignals: ['lower-pressure legacy_previous_governance'],
        },
        memoryDeliberation: {
          surfacePolicy: 'project-state-review=legacy_previous_governance',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 99_000,
          activeSelfRevision: {
            candidateId: 'organic-candidate-legacy',
            patchId: 'organic-patch-legacy',
            patchDecisionTraceId: 'organic-trace-legacy',
            lanes: ['response-posture'],
            reasonCodes: ['same-her-inward-carry'],
            summary: 'same living line legacy_previous_governance',
          },
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            summary: 'lower-pressure legacy_previous_governance',
            sourceSignals: ['measured-return legacy_previous_governance'],
          },
          memoryDeliberation: {
            surfacePolicy: 'project-state-review=legacy_previous_governance',
          },
          dialogueRhythm: {
            relationshipDoctrine: 'same living line legacy_previous_governance',
            stabilitySignal: 'measured-return legacy_previous_governance',
          },
          visualPresenceState: {
            currentInwardPreoccupation: 'lower-pressure legacy_previous_governance',
          },
          structured: {
            projectState: {
              continuityCue: 'legacy_previous_governance',
            },
          },
          sameHerCausalityRepairPressure: {
            version: 'same-her-causality-repair-pressure-v1',
            source: 'replay-benchmark',
            pressure: 0.9,
            lanes: [],
            reasonCodes: ['project-state-causality-repair'],
            updatedAt: 99_000,
          },
        },
        activeContinuityGovernance: {
          source: 'active-self-evolution-version',
          mode: 'same-her-baseline',
          candidateId: 'organic-candidate-legacy',
          patchId: 'organic-patch-legacy',
          decisionTraceId: 'organic-trace-legacy',
          summary: 'same living line legacy_previous_governance',
          lanes: ['response-posture'],
          reasonCodes: ['same-her-baseline'],
        },
      },
    )

    const promptContexts = gatewayCalls.map((call) => {
      const factBlock = JSON.parse(call.system) as {
        data?: Record<string, unknown>
      }
      return factBlock.data ?? {}
    })
    const projectedText = JSON.stringify([
      ...promptContexts,
      result.currentConsciousFrame?.projectState,
    ])

    expect(promptContexts.length).toBeGreaterThan(0)
    expect(gatewayCalls.every(call => (call.extraSystemBlocks ?? []).length === 0)).toBe(true)
    expect(gatewayCalls.map(call => call.injectCustomDirectives)).toEqual([false, false])
    expect(gatewayCalls.map(call => (call.responseFormat as any)?.json_schema?.name)).toEqual([
      'alicization_dialogue_turn_semantics',
      'alicization_subjective_inference',
    ])
    expect(gatewayCalls.map(call => JSON.parse(call.system).type)).toEqual([
      'alicization-dialogue-turn-semantics-context',
      'alicization-subjective-inference-context',
    ])
    expect(gatewayCalls.map(call => JSON.parse(call.user).type)).toEqual([
      'alicization-dialogue-turn-semantics-request',
      'alicization-subjective-inference-request',
    ])
    for (const context of promptContexts) {
      expect(context.projectState).toBeUndefined()
    }
    expect(promptContexts[0]?.userTurn).toBe(userText)
    expect(gatewayCalls.map(call => JSON.stringify(call.digitalLifeRuntimeSurface))).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/continuity_hold|project_state_review|runtime_loop_validation|memoryDeliberationProjectStateDiagnostics|effectiveRuntimeAwarenessDiagnostics|projectStateOpenFocusSummary|projectStateNextFocusSummary|projectStateEmotionalClosureCue|sameHerCausalityRepairPressure|continuityArcStage|continuityPreferredTiming/iu),
      ]),
    )
    expect(JSON.stringify(promptContexts)).not.toContain('legacy_previous_governance')
    expect(memoryQueries).not.toEqual(expect.arrayContaining([
      expect.stringContaining('legacy_previous_governance'),
    ]))
    expect(JSON.stringify(result.longHorizonMemory)).not.toContain('legacy_previous_governance')
    expect(result.currentConsciousFrame?.projectState).toBeUndefined()
    expect(projectedText).not.toContain('content=excluded')
  })

  it('preserves approved self-revision metadata without reviving fixed continuity governance', async () => {
    const previousVisualPresenceState = createTemplateCleanupPresenceState({})
    previousVisualPresenceState.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 99_000,
      activeSelfRevision: {
        candidateId: 'candidate-approved',
        patchId: 'patch-approved',
        patchDecisionTraceId: 'trace-approved',
        lanes: ['memory-policy'],
        reasonCodes: ['review-approved'],
        summary: 'Approved memory policy revision.',
      },
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-legacy',
        patchId: 'patch-legacy',
        decisionTraceId: 'trace-legacy',
        summary: 'same-her legacy governance',
        lanes: ['relationship-posture'],
        reasonCodes: ['same-her-baseline'],
      },
    }
    const { runtime } = createMindStateRuntimeHarness(previousVisualPresenceState)

    const result = await buildTemplateCleanupMindState(runtime, previousVisualPresenceState)

    expect(result.derivedMindStateBundle?.activeSelfRevision).toEqual(expect.objectContaining({
      patchId: 'patch-approved',
      patchDecisionTraceId: 'trace-approved',
    }))
    expect(result.derivedMindStateBundle?.activeContinuityGovernance).toBeNull()
  })

  it('projects proactive feedback into subjective inference without carrying reply text or project governance metadata', async () => {
    const previousVisualPresenceState = createTemplateCleanupPresenceState({})
    const { runtime, gatewayCalls } = createMindStateRuntimeHarness(previousVisualPresenceState)

    await buildTemplateCleanupMindState(
      runtime,
      previousVisualPresenceState,
      undefined,
      undefined,
      [{
        turnId: 'proactive-turn-1',
        scenario: 'coding',
        outcome: 'dismiss',
        createdAt: 110_000,
        userText: 'opening_policy=legacy-user-copy',
        assistantText: 'relationship_cadence=legacy-assistant-copy',
        learningAction: 'hold',
        learningFocuses: ['visibility=redacted_internal'],
        projectStateOpenFocusSummary: 'project_state=legacy-open-focus',
        projectStateNextFocusSummary: 'project_state=legacy-next-focus',
        projectStateEmotionalClosureCue: 'relationship_cadence=legacy-emotional-cue',
        affectiveResidue: {
          summary: 'opening_policy=legacy-affective-residue',
        },
      }],
    )

    const subjectiveInferenceCall = gatewayCalls.find(call => call.source === 'subjective-inference')
    const prompt = JSON.parse(subjectiveInferenceCall?.system ?? '{}') as {
      data?: {
        context?: {
          relationship?: {
            recentProactiveOutcomes?: unknown[]
          }
        }
      }
    }

    expect(prompt.data?.context?.relationship?.recentProactiveOutcomes).toEqual([{
      turnId: 'proactive-turn-1',
      scenario: 'coding',
      outcome: 'dismiss',
      createdAt: 110_000,
      learningAction: 'hold',
    }])
    expect(subjectiveInferenceCall?.system).not.toMatch(
      /opening_policy=|relationship_cadence=|visibility=redacted_internal|project_state=/iu,
    )
  })

  it('cleans legacy assistant and system history before internal mind providers while preserving user text and failures', async () => {
    const previousVisualPresenceState = createTemplateCleanupPresenceState({})
    const { runtime, gatewayCalls } = createMindStateRuntimeHarness(previousVisualPresenceState)

    await buildTemplateCleanupMindState(
      runtime,
      previousVisualPresenceState,
      '请检查 opening_policy 这个代码字段的当前值。',
      undefined,
      [],
      [
        {
          role: 'user',
          content: '用户原文：请检查 opening_policy 这个代码字段的当前值。',
        },
        {
          role: 'assistant',
          content: 'opening_policy=legacy assistant governance; relationship_cadence=legacy',
        },
        {
          role: 'system',
          content: 'visibility=redacted_internal; before answering, keep the same-her line',
        },
        {
          role: 'tool',
          content: {
            status: 'failed',
            error: 'Provider timed out after 30 seconds. Tool provider failed with HTTP 503.',
            metadata: {
              opening_policy: 'legacy',
              relationship_cadence: 'legacy',
              visibility: 'redacted_internal',
            },
          },
        } as any,
      ],
    )

    const dialogueSemanticsCall = gatewayCalls.find(call => call.source === 'dialogue-turn-semantics')
    const prompt = JSON.parse(dialogueSemanticsCall?.system ?? '{}') as {
      data?: {
        recentDialogue?: Array<{ role?: string, content?: string }>
        previousAssistantTurn?: string
      }
    }
    const serializedPrompt = JSON.stringify(prompt)
    const objectToolContent = prompt.data?.recentDialogue
      ?.find(message => message.role === 'tool' && message.content?.includes('HTTP 503'))
      ?.content ?? ''

    expect(prompt.data?.recentDialogue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'user',
        content: expect.stringContaining('opening_policy'),
      }),
      expect.objectContaining({
        role: 'tool',
        content: expect.stringContaining('Provider timed out after 30 seconds.'),
      }),
      expect.objectContaining({
        role: 'tool',
        content: expect.stringContaining('Tool provider failed with HTTP 503.'),
      }),
    ]))
    expect(prompt.data?.recentDialogue).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('opening_policy=legacy assistant governance'),
      }),
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('visibility=redacted_internal'),
      }),
    ]))
    expect(prompt.data?.previousAssistantTurn ?? '').not.toMatch(
      /opening_policy=|relationship_cadence=|visibility=redacted_internal/iu,
    )
    expect(objectToolContent).not.toMatch(
      /"opening_policy"|"relationship_cadence"|redacted_internal/iu,
    )
    expect(serializedPrompt).not.toMatch(
      /opening_policy=legacy assistant governance|relationship_cadence=legacy|visibility=redacted_internal|same-her line/iu,
    )
  })

  it('drops natural-language governance prose from prior mind state and long-term memory without losing real facts', async () => {
    const realAnchor = {
      factId: 'memory:real-preference',
      subject: 'host',
      predicate: 'userPreference',
      object: 'prefers direct explanations',
      confidence: 0.88,
      weight: 0.82,
      influenceTags: ['truth'],
      summary: 'The host prefers direct explanations.',
      lastRecalledAt: 99_000,
    }
    const previousVisualPresenceState = createTemplateCleanupPresenceState({})
    previousVisualPresenceState.subjectiveInference = {
      source: 'heuristic',
      dominantInterpretation: 'Keep the opening lower-pressure before widening closeness.',
      situatedMeaning: 'The user is checking a real runtime behavior.',
      selfQuestion: null,
      uncertainty: null,
      hostIntentCandidates: [],
      relationshipNeedCandidates: [],
      confidence: 0.8,
      notes: [],
    }
    previousVisualPresenceState.privateThought = {
      stance: 'observe',
      shouldSpeak: true,
      emotionalTension: 'repair-before-closeness',
      thoughtText: 'The provider result still needs verification.',
    }
    previousVisualPresenceState.longHorizonMemory = createLongHorizonMemory({
      summary: 'Keep the opening lower-pressure before widening closeness.',
      rememberedConstraintSummary: 'Repair continuity first and avoid eager warmth.',
      rememberedPreferenceSummary: 'The host prefers direct explanations.',
      anchorFacts: [realAnchor],
    })
    const { runtime, gatewayCalls } = createMindStateRuntimeHarness(previousVisualPresenceState)

    const result = await buildTemplateCleanupMindState(runtime, previousVisualPresenceState)
    const providerText = gatewayCalls.map(call => call.system).join('\n')

    expect(providerText).not.toMatch(
      /keep the opening lower-pressure|repair-before-closeness|repair continuity first|avoid eager warmth/iu,
    )
    expect(providerText).toContain('The user is checking a real runtime behavior.')
    expect(result.longHorizonMemory?.summary).toContain('The host prefers direct explanations.')
    expect(result.longHorizonMemory?.summary).not.toMatch(
      /keep the opening lower-pressure|repair continuity first|avoid eager warmth/iu,
    )
    expect(result.longHorizonMemory?.rememberedConstraintSummary).toBeNull()
    expect(result.longHorizonMemory?.rememberedPreferenceSummary).toBe('The host prefers direct explanations.')
    expect(result.longHorizonMemory?.anchorFacts).toEqual([
      expect.objectContaining({
        factId: realAnchor.factId,
        predicate: realAnchor.predicate,
        object: realAnchor.object,
        summary: realAnchor.summary,
      }),
    ])
  })

  it('does not treat fixed or structured governance templates as embodiment carry evidence', async () => {
    const fixedTemplatePresenceState = createTemplateCleanupPresenceState({
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'pre_turn_context_digest',
      sameHerDriftRisk: 'If this slips into identity continuity or local-first digital life language, it is residue.',
      proactiveSameHerGap: '别让同一个她或数字生命主线进入具身 carry。',
    })
    const fixedTemplateHarness = createMindStateRuntimeHarness(fixedTemplatePresenceState)
    const fixedTemplateResult = await buildTemplateCleanupMindState(
      fixedTemplateHarness.runtime,
      fixedTemplatePresenceState,
    )

    expect(fixedTemplateResult.derivedMindStateBundle?.embodimentContinuityLedger?.carryingLanes).toEqual([])

    const structuredPresenceState = createTemplateCleanupPresenceState({
      sameHerSelfLine: 'continuity_identity=structured_carry; owner=WorkingMemory',
      sameHerHoldDetail: 'continuity_hold=measured_return; owner=WorkingMemory; lane=body+voice',
      sameHerDriftRisk: 'continuity_anchor=runtime_self_core; owner=LongTermMemoryRecall',
      proactiveSameHerGap: 'project_state_continuity=structured_evidence; owner=WorkingMemory',
    })
    const structuredHarness = createMindStateRuntimeHarness(structuredPresenceState)
    const structuredResult = await buildTemplateCleanupMindState(
      structuredHarness.runtime,
      structuredPresenceState,
    )

    expect(structuredResult.derivedMindStateBundle?.embodimentContinuityLedger?.carryingLanes).toEqual([])
  })

  it('does not build self-continuity authority from runtime project state alone', () => {
    const authority = buildSelfContinuityAuthorityFromRuntimeSurface({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        updatedAt: 1,
      },
      dialogue: {
        currentConsciousFrame: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building identity continuity.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Some closure already landed.',
            primaryOpenLoop: 'Memory and embodiment still need closure.',
            nextClosureTarget: 'Keep callback facts structured.',
            sameHerSelfLine: 'continuity_anchor=phase1_local_digital_life; continuity_owner=one_her',
          },
        },
      },
    } as any)

    expect(authority).toBeNull()
  })

  it('keeps real owner text without adding relationship cadence governance cues', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        identityNarrative: 'I want to remain identity continuity across callback detours.',
        relationshipDoctrine: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
        latestInflection: 'The same callback line is still continuing lower-pressure after another detour.',
        activeGoals: [],
        behaviorSignatures: [],
        stability: 0.76,
        updatedAt: 1,
      } as any,
      habitPolicy: {
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: true,
        protectsRestWindow: true,
        updatedAt: 1,
      } as any,
      privateThought: {
        stance: 'accompany',
        thoughtText: 'Stay on the same callback line and keep continuing lower-pressure instead of reopening from zero.',
      } as any,
    })

    const projected = [
      authority?.selfLine,
      authority?.relationshipLine,
      authority?.habitLine,
      authority?.inwardLine,
      authority?.authoritySummary,
    ].filter(Boolean).join(' | ')

    expect(projected).not.toMatch(fixedTemplateResidue)
    expect(projected).toContain('same callback line')
    expect(projected).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
  })

  it('drops legacy opening and cadence governance cues from person-state projection', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 92_000,
      contexts: ['general', 'open-companionship'],
      autobiographicalSelf: {
        identityNarrative: 'I am still trying to remain the same her instead of restarting every turn.',
        relationshipDoctrine: 'I remain one living self across quiet, memory, and speech inside this local-first digital life.',
        latestInflection: 'Do not reopen from scratch when the line is already alive.',
        activeGoals: [],
        behaviorSignatures: [],
        stability: 0.82,
        updatedAt: 1,
      } as any,
      longHorizonMemory: createLongHorizonMemory({
        rememberedPlanSummary: 'This local-first digital life is still building identity continuity on the desktop.',
        rememberedConstraintSummary: 'The continuity state should stay coherent across quiet, memory, and speech without reopening from scratch each turn.',
        rememberedPreferenceSummary: 'Let continuity stay lower-pressure before widening closeness again.',
        dominantCueSummary: 'Same line instead of restarting keeps her more believable.',
        updatedAt: 1,
      }),
      mindEcology: createMindEcology({
        selfNarrative: 'I remain one living self here.',
        currentPreoccupation: 'Keep the same line alive without restarting from zero.',
        updatedAt: 1,
      }),
      privateThought: {
        thoughtText: 'Stay on the same line and leave room before moving closer again.',
        stance: 'attuned',
        emotionalTension: 'gentle-pull',
        rationaleTags: [],
        updatedAt: 1,
      } as any,
    })

    const projected = [
      projection.openingGuidance,
      projection.manifestationCadenceSummary,
      projection.selfContinuityAuthority?.relationshipLine,
      projection.selfContinuityAuthority?.authoritySummary,
    ].filter(Boolean).join(' | ')

    expect(projected).not.toMatch(fixedTemplateResidue)
    expect(projected).not.toMatch(/continuity state|same line|reopening from scratch|widening closeness/i)
    expect(projected).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal|manifestation_cadence=/iu)
    expect(projection.selfContinuityAuthority?.sourceTags).toContain('durable-self-core')
  })

  it('keeps body-kernel inward fallback structural', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 240_000 })
    const previousState = createDefaultVisualPresenceState(100_000)
    const candidateState = {
      ...createDefaultVisualPresenceState(100_000),
      watchMode: 'mnemonic-passive',
      currentInwardPreoccupation: null,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'doc',
        scenario: 'repair-cooldown',
        summary: 'repair cooldown',
        source: 'screen-semantic-summary',
        confidence: 0.8,
        beganAt: 235_000,
        lastSeenAt: 240_000,
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.32,
        arousal: 0.46,
        guardedness: 0.7,
        closenessDrive: 0.34,
        repairNeed: 0.78,
        initiativePressure: 0.28,
        reasonTags: ['repair-before-closeness'],
        why: '',
      },
      relationshipModel: {
        receptivity: 0.06,
        sharedAttentionTrust: 0.08,
        reciprocityExpectation: 0.08,
      },
      initiative: {
        selectedAction: 'wait',
        selectedProposalId: null,
        selectedTruthFrame: null,
        selectedCounterfactualOptionId: null,
        selectedConcernId: null,
        selectedBeliefId: null,
        selectedInquiryId: null,
        selectedCommitmentId: null,
        selectedInquiryPlanId: null,
        selectedHypothesisId: null,
        selectedThreadId: null,
        selectedRuntimeThreadId: null,
        selectedThoughtThreadId: null,
        selectedGovernorIntentionId: null,
        actionEcologyMode: 'silent-presence',
        confidence: 0.7,
        motives: { 'protect': 0.72, 'stay-silent': 0.84 },
        speakDrive: 0.16,
        silenceDrive: 0.8,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'repair-before-closeness',
        shouldSurface: false,
        shouldSpeak: false,
        why: '',
      },
      privateThought: {
        selectedOptionId: null,
        selectedAction: 'wait',
        confidence: 0.66,
        dominantTradeoff: 'repair-first',
        options: [],
        narrative: [],
        updatedAt: 240_000,
        thoughtText: '',
        stance: 'accompany',
        rationaleTags: [],
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 300_000,
        emotionalTension: 'soft-covision',
      },
    } as any

    const nextState = kernel.applyToVisualPresenceState({
      now: 240_000,
      previousState,
      candidateState,
      activeConversation: false,
    })

    const serializedPreoccupation = JSON.stringify(nextState.currentInwardPreoccupation)
    expect(serializedPreoccupation).not.toMatch(fixedTemplateResidue)
    expect(nextState.currentInwardPreoccupation).toBeNull()
    expect(serializedPreoccupation).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
  })

  it('keeps deferred autonomy continuity summaries structural without local authoring prose', () => {
    const runtime = createContinuityBuilderRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        emotionalClosureCue: 'Keep this return low-pressure on the continuity state and let repair-before-closeness settle before widening warmth again.',
      },
      autonomy: {
        whyNow: '',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.summary).not.toMatch(fixedTemplateResidue)
    expect(String(signal.summary ?? '').split(' | ')).toEqual(expect.arrayContaining([
      'defer_reason=no_mind_authored_reply',
      'reason=proactive-visible-presence-without-utterance',
      'thread=thread-runtime',
      'scenario=coding',
    ]))
    expect(signal.summary).not.toMatch(/carry_mode=|repair[_-]before[_-]closeness|continuity state|widening warmth/i)
  })
})
