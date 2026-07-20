import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationBodyKernel } from './body-kernel'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
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
    userText,
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
    organicMemoryContext,
  })
}

describe('mind state fixed-template projection cleanup', () => {
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
        expect.stringMatching(/same-her|continuity_hold|project_state_review|runtime_loop_validation|legacy_previous_governance|memoryDeliberationProjectStateDiagnostics|effectiveRuntimeAwarenessDiagnostics|projectStateOpenFocusSummary|projectStateNextFocusSummary|projectStateEmotionalClosureCue|sameHerCausalityRepairPressure|continuityArcStage|continuityPreferredTiming/iu),
      ]),
    )
    expect(JSON.stringify(promptContexts)).not.toContain('legacy_previous_governance')
    expect(memoryQueries).not.toEqual(expect.arrayContaining([
      expect.stringContaining('legacy_previous_governance'),
    ]))
    expect(JSON.stringify(result.longHorizonMemory)).not.toContain('legacy_previous_governance')
    expect(result.currentConsciousFrame?.projectState).toBeNull()
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

    expect(nextState.currentInwardPreoccupation).not.toMatch(fixedTemplateResidue)
    expect(nextState.currentInwardPreoccupation).toBeTruthy()
    expect(nextState.currentInwardPreoccupation).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
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
