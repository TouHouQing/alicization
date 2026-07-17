import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationBodyKernel } from './body-kernel'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
import {
  buildRuntimeSurfaceProjectStateContinuityFallback,
  buildSelfContinuityAuthority,
} from './self-continuity-authority'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const fixedTemplateResidue = /Ground first|Stay near|Protect the host rest|Current durable behavior|Wait for a clearer|Keep the next return|Repair the seam|Open by observing|Keep truth|Keep the answer|Open with the live|Current manifestation|Long-horizon relationship|observe-first so room|re-enter lightly|let repair settle|stay inward, keep caring|wait for confirmation|Keep this return|no mind-authored visible reply was available|proactive autonomy line was held/i

const fixedTemplateSourceResidue = [
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
  './mind-synthesizer.ts',
  './response-surface-learning-rules.ts',
  './discourse-state.ts',
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
  const gatewayCalls: Array<{
    source: string
    system: string
    user: string
    extraSystemBlocks?: string[]
    injectCustomDirectives?: boolean
    responseFormat?: unknown
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
    retrieveMemoryFacts: async () => [],
    listRelationshipOutcomes: async () => [],
    listPersonaReinforcementEvents: async () => [],
    listMemoryReflections: async () => [],
    listMemoryConsolidations: async () => [],
    getPersonStateEvolutionSummary: async () => null,
    readMindHead: async () => null,
  })

  return { runtime, gatewayCalls }
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
    } as any,
  } as any
}

async function buildTemplateCleanupMindState(
  runtime: ReturnType<typeof createAlicizationMindStateRuntime>,
  previousVisualPresenceState: any,
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
        recentProactiveOutcomes: [],
      },
    } as any,
    userText: 'Please verify the fixed-template cleanup in runtime mind state.',
    recentMessages: [],
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
  })
}

describe('mind state fixed-template projection cleanup', () => {
  it('does not leave local prose templates in mind-shaping source files', () => {
    const offenders = fixedTemplateSourceFiles.flatMap((relativePath) => {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      return fixedTemplateSourceResidue.flatMap((pattern) => {
        const match = source.match(pattern)
        return match ? [`${relativePath}: ${match[0]}`] : []
      })
    })

    expect(offenders).toEqual([])
  })

  it('excludes fixed identity-continuity', async () => {
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
    const { runtime, gatewayCalls } = createMindStateRuntimeHarness(previousVisualPresenceState)

    const result = await buildTemplateCleanupMindState(runtime, previousVisualPresenceState)

    const promptProjectStates = gatewayCalls.map((call) => {
      const factBlock = JSON.parse(call.system) as {
        data?: { projectState?: Record<string, unknown> }
      }
      return factBlock.data?.projectState ?? {}
    })
    const projectedText = JSON.stringify([
      ...promptProjectStates,
      result.currentConsciousFrame?.projectState,
    ])

    expect(promptProjectStates.length).toBeGreaterThan(0)
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
    for (const projectState of promptProjectStates) {
      expect(projectState.sameHerSelfLine).toBeUndefined()
      expect(projectState.sameHerHoldDetail).toBeUndefined()
      expect(projectState.sameHerDriftRisk).toBeUndefined()
      expect(projectState.proactiveSameHerGap).toBeUndefined()
    }
    expect(projectedText).not.toContain('content=excluded')
  })

  it('does not treat fixed same-her templates as embodiment sameHerCarry unless structured continuity evidence exists', async () => {
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

    expect(structuredResult.derivedMindStateBundle?.embodimentContinuityLedger?.carryingLanes).toEqual(['body', 'voice'])
  })

  it('keeps self-continuity fallback authority structural instead of authoring relationship prose', () => {
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: 'Alicization is a local-first digital life project building identity continuity.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestProgress: 'Some closure already landed.',
      primaryOpenLoop: 'memory and embodiment still need closure',
      nextClosureTarget: 'keep callback facts structured',
      sameHerSelfLine: 'structured continuity digest.',
    })

    const projected = [
      authority?.selfLine,
      authority?.relationshipLine,
      authority?.inwardLine,
      authority?.habitLine,
      authority?.authoritySummary,
    ].filter(Boolean).join(' | ')

    expect(projected).not.toMatch(fixedTemplateResidue)
    expect(projected).not.toMatch(/legacy phase-one template|continuity state|identity continuity|local-first digital life project/i)
    expect(projected).toContain('continuity_anchor=structured_carry')
    expect(projected).toMatch(/continuity_identity=|phase_scope=|open_loop=|next_closure=/)
  })

  it('projects habit and relationship cadence as structured policy rather than canned opening guidance', () => {
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
    expect(projected).not.toMatch(/same callback line|identity continuity|reopening from zero/i)
    expect(projected).toContain('habit_policy=ground_first')
    expect(projected).toContain('visibility=redacted_internal')
  })

  it('keeps person-state opening and manifestation cadence structural', () => {
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
    expect(projection.openingGuidance).toMatch(/opening_policy=|relationship_cadence=/)
    if (projection.manifestationCadenceSummary)
      expect(projection.manifestationCadenceSummary).toMatch(/manifestation_cadence=/)
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

    expect(nextState.currentInwardPreoccupation).not.toMatch(fixedTemplateResidue)
    expect(nextState.currentInwardPreoccupation).toMatch(/body_preoccupation=|visibility=redacted_internal/)
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
    expect(signal.summary).not.toMatch(/continuity state|widening warmth/i)
    expect(signal.summary).toContain('defer_reason=no_mind_authored_reply')
    expect(signal.summary).toMatch(/carry_mode=repair_before_closeness|proactive_state=deferred/)
  })
})
